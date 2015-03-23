// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-2015

/**
 * @module server
 */


// node mode
/* jshint node: true */

// how to deal with spaces and tabs
/* jshint smarttabs: false */

// Don't make functions within a loop
/* jshint -W083 */


// require variables to be declared
"use strict";

// node: built-in
var fs            = require('fs');                  // filesystem access
var http          = require('http');                // http server
var https         = require('https');               // https server
var os            = require('os');                  // operating system access
var path          = require('path');                // file path extraction and creation
var readline      = require('readline');            // to build an evaluation loop
var url           = require('url');                 // parses urls
var util          = require('util');                // node util

// npm registry: defined in package.json
var formidable    = require('formidable');       // upload processor
var gm            = require('gm');               // graphicsmagick
var json5         = require('json5');            // JSON format that allows comments
var program       = require('commander');        // parsing command-line arguments
var qrimage       = require('qr-image');         // qr-code generation
var request       = require('request');          // external http requests
var sprint        = require('sprint');           // pretty formating (sprintf)
var Twit          = require('twit');             // twitter api

// custom node modules
var assets        = require('./src/node-assets');         // manages the list of files
var exiftool      = require('./src/node-exiftool');       // gets exif tags for images
var pixelblock    = require('./src/node-pixelblock');     // chops pixels buffers into square chunks
var sageutils     = require('./src/node-utils');          // provides the current version number

var Interaction   = require('./src/node-interaction');    // handles sage interaction (move, resize, etc.)
var Omicron       = require('./src/node-omicron');        // handles Omicron input events
var Radialmenu    = require('./src/node-radialmenu');     // radial menu
var Sagepointer   = require('./src/node-sagepointer');    // handles sage pointers (creation, location, etc.)
var WebsocketIO   = require('./src/node-websocket.io');   // creates WebSocket server and clients
var Loader        = require('./src/node-itemloader');     // handles sage item creation
var HttpServer    = require('./src/node-httpserver');     // creates web server
var StickyItems   = require('./src/node-stickyitems');


// GLOBALS
global.__SESSION_ID = null; // changed via command line, config param, etc.



// Version calculation
var SAGE2_version = sageutils.getShortVersion();

// Command line arguments
program
  .version(SAGE2_version)
  .option('-i, --no-interactive',       'Non interactive prompt')
  .option('-f, --configuration <file>', 'Specify a configuration file')
  .option('-l, --logfile [file]',       'Specify a log file')
  .option('-q, --no-output',            'Quiet, no output')
  .option('-s, --session [name]',       'Load a session file (last session if omitted)')
  .option('-t, --track-users [file]',   'enable user interaction tracking (specified file indicates users to track)')
  .parse(process.argv);

// Logging mechanism
if (program.logfile) {
	var logname    = (program.logfile === true) ? 'sage2.log' : program.logfile;
	var log_file   = fs.createWriteStream(path.resolve(logname), {flags: 'w+'});
	var log_stdout = process.stdout;
	var aLine, args;

	// Redirect console.log to a file and still produces an output or not
	if (program.output === false) {
		console.log = function(d) {
			aLine = util.format(d) + '\n';
			log_file.write(aLine);
			broadcast_opt('console', aLine, 'receivesConsoleMessages');
			program.interactive = undefined;
		};
	} else {
		console.log = function() {
			args = Array.prototype.slice.call(arguments);
			if ( args.length === 1 && typeof args[0] === 'string') {
				aLine = args.toString() + '\n';
				log_stdout.write(aLine);
				broadcast_opt('console', aLine, 'receivesConsoleMessages');
			}
			else {
				var i = 0;
				var s = "";
				args = [util.format.apply(util.format, Array.prototype.slice.call(arguments))];
				while (i < args.length) {
					if (i === 0)
						s = args[i];
					else
						s += " " + args[i];
					i++;
				}
				aLine = s + '\n';
				log_stdout.write(aLine);
				log_file.write(aLine);
				broadcast_opt('console', aLine, 'receivesConsoleMessages');
			}
		};
	}
}
else if (program.output === false) {
	program.interactive = undefined;
	console.log = function() {
		// disable print
	};
}

// Platform detection
var platform = os.platform() === "win32" ? "Windows" : os.platform() === "darwin" ? "MacOSX" : "Linux";

console.log("Detected Server OS as:", platform);
console.log("SAGE2 Short Version:", SAGE2_version);


// load config file - looks for user defined file, then file that matches hostname, then uses default
var config = loadConfiguration();

var twitter = null;
if(config.apis !== undefined && config.apis.twitter !== undefined){
	twitter = new Twit({
		consumer_key:         config.apis.twitter.consumerKey,
		consumer_secret:      config.apis.twitter.consumerSecret,
		access_token:         config.apis.twitter.accessToken,
		access_token_secret:  config.apis.twitter.accessSecret
	});
}

// remove API keys from being investigated further
//if(config.apis !== undefined) delete config.apis;

console.log(config);

// register with EVL's server
if (config.register_site) {
	request({
		"rejectUnauthorized": false,
		"url": 'https://sage.evl.uic.edu/register',
		"form": config,
		"method": "POST"},
		function(err, response, body) {
			console.log('SAGE2> Registration with EVL site:', (err === null) ? "success" : err.code);
		}
	);
}

// Check for missing packages (pass parameter true for devel packages also)
sageutils.checkPackages();

// Setup up ImageMagick (load path from configuration file)
var imConstraints = {imageMagick: true};
var ffmpegOptions = {};
if(config.dependencies !== undefined){
	if(config.dependencies.ImageMagick !== undefined) imConstraints.appPath = config.dependencies.ImageMagick;
	if(config.dependencies.FFMpeg !== undefined)      ffmpegOptions.appPath = config.dependencies.FFMpeg;
}
var imageMagick = gm.subClass(imConstraints);
assets.setupBinaries(imConstraints, ffmpegOptions);


// global variables for various paths
var public_dir = "public"; // directory where HTTPS content is stored
var hostOrigin = ""; // base URL for this server
if (config.rproxy_port === undefined) {
	hostOrigin = "http://" + config.host + (config.index_port === 80 ? "" : ":" + config.index_port) + "/";
}
var uploadsFolder = path.join(public_dir, "uploads"); // directory where files are uploaded

// global variables to manage items
var itemCount = 0;
var userCount = 0;

// global variables to manage clients
var clients = [];
var masterDisplay = null;
var webBrowserClient = null;
var sagePointers = {};
var remoteInteraction = {};
var mediaStreams = {};
var mediaBlockStreams = {};
var radialMenus = {};
var shell = null;
var remoteSharingRequestDialog = null;
var remoteSharingWaitDialog = null;
var remoteSharingSessions = [];

var users = null;
if(program.trackUsers) {
	if(typeof program.trackUsers === "string" && sageutils.fileExists(program.trackUsers))
		users = json5.parse(fs.readFileSync(program.trackUsers));
	else
		users = {};
	users.session = {};
	users.session.start = Date.now();
}
if(!sageutils.fileExists("logs")) fs.mkdirSync("logs");


// find git commit version and date
sageutils.getFullVersion(function(version) {
	// fields: base commit branch date
	console.log("SAGE2> Full Version:", json5.stringify(version));
	SAGE2_version = version;
	broadcast('setupSAGE2Version', SAGE2_version, 'receivesDisplayConfiguration');

	if(users !== null) users.session.verison = SAGE2_version;
});


// Sticky items and window position for new clones
var stickyAppHandler   = new StickyItems();
var newWindowPosition  = null;
var seedWindowPosition = null;

// Generating QR-code of URL for UI page
var qr_png = qrimage.image(hostOrigin, { ec_level:'M', size: 15, margin:3, type: 'png' });
var qr_out = path.join(uploadsFolder, "images", "QR.png");
qr_png.on('end', function() { console.log('QR> image generated', qr_out); });
qr_png.pipe(fs.createWriteStream(qr_out));


// Make sure tmp directory is local
process.env.TMPDIR = path.join(__dirname, "tmp");
console.log("SAGE2> Temp folder: ", process.env.TMPDIR);
if(!sageutils.fileExists(process.env.TMPDIR)){
     fs.mkdirSync(process.env.TMPDIR);
}

// Make sure session folder exists
var sessionFolder = path.join(__dirname, "sessions");
if (!sageutils.fileExists(sessionFolder)) {
     fs.mkdirSync(sessionFolder);
}

// Build the list of existing assets
assets.initialize(uploadsFolder, 'uploads');

var appLoader = new Loader(public_dir, hostOrigin, config, imConstraints, ffmpegOptions);
var applications = [];
var controls = []; // Each element represents a control widget bar
var appAnimations = {};
var videoHandles = {};


// sets up the background for the display clients (image or color)
setupDisplayBackground();


// create HTTP server for insecure content
var httpServerIndex = new HttpServer(public_dir);
httpServerIndex.httpGET('/config', sendConfig); // send config object to client using http request


// create HTTPS server for secure content
var httpsServerApp = new HttpServer(public_dir);
httpsServerApp.httpPOST('/upload', uploadForm); // receive newly uploaded files from SAGE Pointer / SAGE UI
httpsServerApp.httpGET('/config',  sendConfig); // send config object to client using http request


// create HTTPS options - sets up security keys
var options = setupHttpsOptions();


// initializes HTTP and HTTPS servers
var sage2Index  = http.createServer(httpServerIndex.onrequest);
var sage2Server = https.createServer(options, httpsServerApp.onrequest);

var startTime = new Date();


// creates a WebSocket server - 2 way communication between server and all browser clients
var wsioServer  = new WebsocketIO.Server({server: sage2Index});
var wsioServerS = new WebsocketIO.Server({server: sage2Server});

wsioServer.onconnection(function(wsio) {
	wsio.onclose(closeWebSocketClient);
	wsio.on('addClient', wsAddClient);
});

wsioServerS.onconnection(function(wsio) {
	wsio.onclose(closeWebSocketClient);
	wsio.on('addClient', wsAddClient);
});

function closeWebSocketClient(wsio) {
    var i;
    var key;
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	console.log("Closed Connection: " + uniqueID + " (" + wsio.clientType + ")");

	addEventToUserLog(uniqueID, {type: "disconnect", data: null, time: Date.now()});

	var remote = findRemoteSiteByConnection(wsio);
	if (remote !== null) {
		console.log("Remote site \"" + remote.name + "\" now offline");
		remote.connected = false;
		var site = {name: remote.name, connected: remote.connected};
		broadcast('connectedToRemoteSite', site, 'receivesRemoteServerInfo');
	}
	if (wsio.messages.sendsPointerData) {
		hidePointer(uniqueID);
		removeControlsForUser(uniqueID);
		delete sagePointers[uniqueID];
		delete remoteInteraction[uniqueID];
	}
	if (wsio.messages.requiresFullApps) {
		for (key in mediaBlockStreams) {
			for (i=0; i<clients.length; i++) {
                var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
                    if(uniqueID === clientAddress) {
                        delete mediaBlockStreams[key].clients[uniqueID];
                    }
			}
		}
		for (key in mediaStreams) {
			if (mediaStreams.hasOwnProperty(key)) {
				delete mediaStreams[key].clients[uniqueID];
			}
		}
        for (key in appAnimations) {
			if (appAnimations.hasOwnProperty(key)) {
				delete appAnimations[key].clients[uniqueID];
			}
		}
	}
	if (wsio.messages.receivesMediaStreamFrames) {
		for (key in videoHandles) {
			delete videoHandles[key].clients[uniqueID];
		}
	}

	if (wsio.clientType === "webBrowser") webBrowserClient = null;

	if (wsio === masterDisplay) {
		masterDisplay = null;
		for (i=0; i<clients.length; i++){
			if (clients[i].clientType === "display" && clients[i] !== wsio) {
				masterDisplay = clients[i];
				clients[i].emit('setAsMasterDisplay');
				break;
			}
		}
	}

	removeElement(clients, wsio);
}

function wsAddClient(wsio, data) {
	// overwrite host and port if defined
	if(data.host !== undefined) {
		wsio.remoteAddress.address = data.host;
	}
	if(data.port !== undefined) {
		wsio.remoteAddress.port = data.port;
	}

	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	wsio.clientType = data.clientType;
	wsio.messages = {};

	// Remember the display ID
	if (wsio.clientType === "display" || wsio.clientType === 'radialMenu' ) {
		wsio.clientID = data.clientID;
	} else {
		wsio.clientID = -1;
	}

	// types of data sent/received to server from client through WebSockets
	wsio.messages.sendsPointerData                  = data.sendsPointerData                 || false;
	wsio.messages.sendsMediaStreamFrames            = data.sendsMediaStreamFrames           || false;
	wsio.messages.uploadsContent                    = data.uploadsContent                   || false;
	wsio.messages.requestsServerFiles               = data.requestsServerFiles              || false;
	wsio.messages.sendsWebContentToLoad             = data.sendsWebContentToLoad            || false;
	wsio.messages.launchesWebBrowser                = data.launchesWebBrowser               || false;
	wsio.messages.sendsVideoSynchonization          = data.sendsVideoSynchonization         || false;
	wsio.messages.sharesContentWithRemoteServer     = data.sharesContentWithRemoteServer    || false;
	wsio.messages.receivesDisplayConfiguration      = data.receivesDisplayConfiguration     || false;
	wsio.messages.receivesClockTime                 = data.receivesClockTime                || false;
	wsio.messages.requiresFullApps                  = data.requiresFullApps                 || false;
	wsio.messages.requiresAppPositionSizeTypeOnly   = data.requiresAppPositionSizeTypeOnly  || false;
    wsio.messages.receivesMediaStreamFrames         = data.receivesMediaStreamFrames        || false;
	wsio.messages.receivesWindowModification        = data.receivesWindowModification       || false;
	wsio.messages.receivesPointerData               = data.receivesPointerData              || false;
	wsio.messages.receivesInputEvents               = data.receivesInputEvents              || false;
	wsio.messages.receivesRemoteServerInfo          = data.receivesRemoteServerInfo         || false;
	wsio.messages.requestsWidgetControl             = data.requestsWidgetControl            || false;
	wsio.messages.receivesWidgetEvents              = data.receivesWidgetEvents             || false;
	wsio.messages.requestsAppClone					= data.requestsAppClone					|| false;
	wsio.messages.requestsFileHandling				= data.requestsFileHandling				|| false;
	wsio.messages.receivesConsoleMessages			= data.receivesConsoleMessages			|| false;
	wsio.messages.sendsCommands						= data.sendsCommands					|| false;

	if (wsio.clientType==="display") {
		if(masterDisplay === null) masterDisplay = wsio;
		console.log("New Connection: " + uniqueID + " (" + wsio.clientType + " " + wsio.clientID+ ")");

		if( wsio.clientID === 0 ) // Display clients were reset
			clearRadialMenus();
	}
	else {
		console.log("New Connection: " + uniqueID + " (" + wsio.clientType + ")");
	}

	clients.push(wsio);
	initializeWSClient(wsio);
}

function initializeWSClient(wsio) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	wsio.emit('initialize', {UID: uniqueID, time: new Date(), start: startTime});

	if(wsio === masterDisplay) wsio.emit('setAsMasterDisplay');


	// set up listeners based on what the client sends
	if(wsio.messages.sendsPointerData){
		wsio.on('registerInteractionClient', wsRegisterInteractionClient);
		wsio.on('startSagePointer',          wsStartSagePointer);
		wsio.on('stopSagePointer',           wsStopSagePointer);
		wsio.on('pointerPress',              wsPointerPress);
		wsio.on('pointerRelease',            wsPointerRelease);
		wsio.on('pointerDblClick',           wsPointerDblClick);
		wsio.on('pointerPosition',           wsPointerPosition);
		//wsio.on('pointerMove',               wsPointerMove);
		wsio.on('ptm',                       wsPointerMove);
		wsio.on('pointerScrollStart',        wsPointerScrollStart);
		wsio.on('pointerScroll',             wsPointerScroll);
		wsio.on('pointerDraw',               wsPointerDraw);
		wsio.on('keyDown',                   wsKeyDown);
		wsio.on('keyUp',                     wsKeyUp);
		wsio.on('keyPress',                  wsKeyPress);
	}
	if(wsio.messages.uploadsContent){
		wsio.on('uploadedFile', wsUploadedFile);
	}
	if(wsio.messages.sendsMediaStreamFrames){
		wsio.on('startNewMediaStream',       wsStartNewMediaStream);
		wsio.on('updateMediaStreamFrame',    wsUpdateMediaStreamFrame);
		wsio.on('updateMediaStreamChunk',    wsUpdateMediaStreamChunk);
		wsio.on('stopMediaStream',           wsStopMediaStream);
		wsio.on('startNewMediaBlockStream',       wsStartNewMediaBlockStream);
		wsio.on('updateMediaBlockStreamFrame',    wsUpdateMediaBlockStreamFrame);
		wsio.on('stopMediaBlockStream',           wsStopMediaBlockStream);
	}
	if(wsio.messages.receivesMediaStreamFrames){
		wsio.on('requestVideoFrame',                    wsRequestVideoFrame);
		wsio.on('receivedMediaStreamFrame',             wsReceivedMediaStreamFrame);
		wsio.on('receivedRemoteMediaStreamFrame',       wsReceivedRemoteMediaStreamFrame);
        wsio.on('requestVideoFrame',                    wsRequestVideoFrame);
		wsio.on('receivedMediaBlockStreamFrame',        wsReceivedMediaBlockStreamFrame);
		wsio.on('receivedRemoteMediaBlockStreamFrame',  wsReceivedRemoteMediaBlockStreamFrame);
    }
	if(wsio.messages.requiresFullApps){
		wsio.on('finishedRenderingAppFrame', wsFinishedRenderingAppFrame);
		wsio.on('updateAppState', wsUpdateAppState);
		wsio.on('appResize',      wsAppResize);
		wsio.on('broadcast',      wsBroadcast);
		wsio.on('searchTweets',   wsSearchTweets);
	}
	if(wsio.messages.requestsServerFiles){
		wsio.on('requestAvailableApplications', wsRequestAvailableApplications);
		wsio.on('requestStoredFiles', wsRequestStoredFiles);
		//wsio.on('addNewElementFromStoredFiles', wsAddNewElementFromStoredFiles);
		wsio.on('loadApplication',    wsLoadApplication);
		wsio.on('loadFileFromServer', wsLoadFileFromServer);
		wsio.on('deleteElementFromStoredFiles', wsDeleteElementFromStoredFiles);
		wsio.on('saveSesion',       wsSaveSesion);
		wsio.on('clearDisplay',     wsClearDisplay);
		wsio.on('tileApplications', wsTileApplications);

		// Radial menu should have its own message section? Just appended here for now.
		wsio.on('radialMenuClick',                  wsRadialMenuClick);
	}
	if(wsio.messages.sendsWebContentToLoad){
		wsio.on('addNewWebElement', wsAddNewWebElement);
	}
	if(wsio.messages.launchesWebBrowser){
		wsio.on('openNewWebpage', wsOpenNewWebpage);
	}
	if(wsio.messages.sendsVideoSynchonization){
		wsio.on('playVideo',       wsPlayVideo);
		wsio.on('pauseVideo',      wsPauseVideo);
		wsio.on('stopVideo',       wsStopVideo);
		wsio.on('updateVideoTime', wsUpdateVideoTime);
		wsio.on('muteVideo',       wsMuteVideo);
		wsio.on('unmuteVideo',     wsUnmuteVideo);
		wsio.on('loopVideo',       wsLoopVideo);
	}
	if(wsio.messages.sharesContentWithRemoteServer){
		wsio.on('addNewElementFromRemoteServer', wsAddNewElementFromRemoteServer);
		wsio.on('requestNextRemoteFrame', wsRequestNextRemoteFrame);
		wsio.on('updateRemoteMediaStreamFrame', wsUpdateRemoteMediaStreamFrame);
		wsio.on('stopMediaStream', wsStopMediaStream);
        wsio.on('updateRemoteMediaBlockStreamFrame', wsUpdateRemoteMediaBlockStreamFrame);
		wsio.on('stopMediaBlockStream', wsStopMediaBlockStream);
		wsio.on('requestDataSharingSession', wsRequestDataSharingSession);
		wsio.on('cancelDataSharingSession', wsCancelDataSharingSession);
		wsio.on('acceptDataSharingSession', wsAcceptDataSharingSession);
		wsio.on('rejectDataSharingSession', wsRejectDataSharingSession);
	}
	if(wsio.messages.requestsWidgetControl){
		wsio.on('addNewControl', wsAddNewControl);
		wsio.on('selectedControlId', wsSelectedControlId);
		wsio.on('releasedControlId', wsReleasedControlId);
		wsio.on('closeAppFromControl', wsCloseAppFromControl);
		wsio.on('hideWidgetFromControl', wsHideWidgetFromControl);
		wsio.on('openRadialMenuFromControl', wsOpenRadialMenuFromControl);
	}
	if(wsio.messages.receivesDisplayConfiguration){
		wsio.emit('setupDisplayConfiguration', config);
		wsio.emit('setupSAGE2Version', SAGE2_version);
	}
	if (wsio.messages.requestsAppClone){
		wsio.on('createAppClone', wsCreateAppClone);
	}
	if (wsio.messages.sendsCommands) {
		wsio.emitString(JSON.stringify({f: 'console', d: JSON.stringify(config, null, " ")+'\n'}));
		wsio.on('command', wsCommand);
	}

	/*if (wsio.messages.requestsFileHandling){
		wsio.on('writeToFile', wsWriteToFile);
		wsio.on('readFromFile', wsReadFromFile);
	}*/

	if(wsio.messages.sendsPointerData)                createSagePointer(uniqueID);
	if(wsio.messages.receivesClockTime)               wsio.emit('setSystemTime', {date: new Date()});
	if(wsio.messages.receivesPointerData)             initializeExistingSagePointers(wsio);
	if(wsio.messages.requiresFullApps)                initializeExistingApps(wsio);
	if(wsio.messages.requiresAppPositionSizeTypeOnly) initializeExistingAppsPositionSizeTypeOnly(wsio);
	if(wsio.messages.receivesRemoteServerInfo)        initializeRemoteServerInfo(wsio);
	if(wsio.messages.receivesMediaStreamFrames)       initializeMediaStreams(uniqueID);

	if(wsio.messages.requestsWidgetControl){
		setTimeout(function (){
			initializeExistingControls(wsio);
		}, 6000);
	}

	if(wsio.messages.receivesMediaStreamFrames){
		var key;
		var appInstance;
		var blocksize = 128;
		for(key in videoHandles) {
			videoHandles[key].clients[uniqueID] = {wsio: wsio, readyForNextFrame: false, blockList: []};
			appInstance = findAppById(key);
			calculateValidBlocks(appInstance, blocksize, videoHandles);
		}
	}


	var remote = findRemoteSiteByConnection(wsio);
	if(remote !== null){
		remote.wsio = wsio;
		remote.connected = true;
		var site = {name: remote.name, connected: remote.connected};
		broadcast('connectedToRemoteSite', site, 'receivesRemoteServerInfo');
	}

	if (wsio.clientType === "webBrowser") webBrowserClient = wsio;

	if ( wsio.clientType === "display" )
	{
		wsio.on('radialMenuMoved', wsRadialMenuMoved);
		wsio.on('removeRadialMenu', wsRemoveRadialMenu);
		wsio.on('radialMenuWindowToggle', wsRadialMenuThumbnailWindow);
	}

	// Debug messages from applications
	wsio.on('sage2Log', wsPrintDebugInfo);
}

function initializeExistingControls(wsio){
	for (var i=controls.length-1; i>=0; i--){
		var ctrl = controls[i];
		wsio.emit('createControl', controls[i]);
		var uniqueID = ctrl.id.substring(ctrl.appId.length, ctrl.id.lastIndexOf("_"));
		var app = findAppById(ctrl.appId);
		addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "open", application: {id: app.id, type: app.application}}, time: Date.now()});
	}
}

function initializeExistingSagePointers(wsio) {
	for(var key in sagePointers){
		if (sagePointers.hasOwnProperty(key)) {
			wsio.emit('createSagePointer', sagePointers[key]);
		}
	}
}

function initializeExistingApps(wsio) {
	var i;
	var key;

	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	for(i=0; i<applications.length; i++){
		wsio.emit('createAppWindow', applications[i]);
	}
	for(key in appAnimations){
		if (appAnimations.hasOwnProperty(key)) {
			appAnimations[key].clients[uniqueID] = false;
		}
	}
}

function initializeExistingAppsPositionSizeTypeOnly(wsio) {
	var i;
	for(i=0; i<applications.length; i++){
		wsio.emit('createAppWindowPositionSizeOnly', getAppPositionSize(applications[i]));
	}
}

function initializeRemoteServerInfo(wsio) {
	for(var i=0; i<remoteSites.length; i++){
		var site = {name: remoteSites[i].name, connected: remoteSites[i].connected, width: remoteSites[i].width, height: remoteSites[i].height, pos: remoteSites[i].pos};
		wsio.emit('addRemoteSite', site);
	}
}

function initializeMediaStreams(uniqueID) {
	var key;

	for(key in mediaStreams){
		if (mediaStreams.hasOwnProperty(key)) {
			mediaStreams[key].clients[uniqueID] = false;
		}
	}
}

function initializeMediaBlockStreams(clientID) {
	for(var key in mediaBlockStreams) {
        for(var i=0; i<clients.length; i++){
            var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
            if(clients[i].messages.receivesMediaStreamFrames && mediaBlockStreams[key].clients[clientAddress] === undefined){
                    mediaBlockStreams[key].clients[clientAddress] = {wsio: clients[i], readyForNextFrame: true, blockList: []};
            }
        }
	}
}

// **************  Sage Pointer Functions *****************

function wsRegisterInteractionClient(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	var key;
	if(program.trackUsers === true) {
		var newUser = true;
		for(key in users) {
			if(users[key].name === data.name && users[key].color.toLowerCase() === data.color.toLowerCase()) {
				users[key].ip = uniqueID;
				if(users[key].actions === undefined) users[key].actions = [];
				users[key].actions.push({type: "connect", data: null, time: Date.now()});
				newUser = false;
			}
		}
		if(newUser === true) {
			var id = getNewUserId();
			users[id] = {};
			users[id].name = data.name;
			users[id].color = data.color;
			users[id].ip = uniqueID;
			if(users[id].actions === undefined) users[id].actions = [];
			users[id].actions.push({type: "connect", data: null, time: Date.now()});
		}
	}
	else {
		for(key in users) {
			if(users[key].name === data.name && users[key].color.toLowerCase() === data.color.toLowerCase()) {
				users[key].ip = uniqueID;
				if(users[key].actions === undefined) users[key].actions = [];
				users[key].actions.push({type: "connect", data: null, time: Date.now()});
			}
		}
	}
}

function wsStartSagePointer(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	showPointer(uniqueID, data);

	addEventToUserLog(uniqueID, {type: "SAGE2PointerStart", data: null, time: Date.now()});
}

function wsStopSagePointer(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	hidePointer(uniqueID);

	//return to window interaction mode after stopping pointer
	if(remoteInteraction[uniqueID].appInteractionMode()){
		remoteInteraction[uniqueID].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode }, 'receivesPointerData');
	}

	addEventToUserLog(uniqueID, {type: "SAGE2PointerEnd", data: null, time: Date.now()});
	//addEventToUserLog(uniqueID, {type: "SAGE2PointerMode", data: {mode: "windowManagement"}, time: Date.now()});
}

function wsPointerPress(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	pointerPress(uniqueID, pointerX, pointerY, data);
}

function wsPointerRelease(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	/*
	if (data.button === 'left')
		pointerRelease(uniqueID, pointerX, pointerY);
	else
		pointerReleaseRight(uniqueID, pointerX, pointerY);
	*/
	pointerRelease(uniqueID, pointerX, pointerY, data);
}

function wsPointerDblClick(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	pointerDblClick(uniqueID, pointerX, pointerY);
}

function wsPointerPosition(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	pointerPosition(uniqueID, data);
}

function wsPointerMove(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	pointerMove(uniqueID, pointerX, pointerY, data);
}

function wsPointerScrollStart(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	pointerScrollStart( uniqueID, pointerX, pointerY );
}

function wsPointerScroll(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	// Casting the parameters to correct type
	data.wheelDelta = parseInt(data.wheelDelta, 10);

	pointerScroll(uniqueID, data);
}

function wsPointerDraw(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	pointerDraw(uniqueID, data);
}

function wsKeyDown(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	if (data.code === 16) { // shift
		remoteInteraction[uniqueID].SHIFT = true;
	}
	else if (data.code === 17) { // ctrl
		remoteInteraction[uniqueID].CTRL = true;
	}
	else if (data.code === 18) { // alt
		remoteInteraction[uniqueID].ALT = true;
	}
	else if (data.code === 20) { // caps lock
		remoteInteraction[uniqueID].CAPS = true;
	}
	else if (data.code === 91 || data.code === 92 || data.code === 93){
		// command
		remoteInteraction[uniqueID].CMD = true;
	}

	//SEND SPECIAL KEY EVENT only will come here
	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	var control = findControlsUnderPointer(pointerX, pointerY);
	if (control!==null){
		return;
	}


	if(remoteInteraction[uniqueID].appInteractionMode()){
		keyDown(uniqueID, pointerX, pointerY, data);
	}
}

function wsKeyUp(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	if (data.code === 16) { // shift
		remoteInteraction[uniqueID].SHIFT = false;
	}
	else if (data.code === 17) { // ctrl
		remoteInteraction[uniqueID].CTRL = false;
	}
	else if (data.code === 18) { // alt
		remoteInteraction[uniqueID].ALT = false;
	}
	else if (data.code === 20) { // caps lock
		remoteInteraction[uniqueID].CAPS = false;
	}
	else if (data.code === 91 || data.code === 92 || data.code === 93) { // command
		remoteInteraction[uniqueID].CMD = false;
	}

	if (remoteInteraction[uniqueID].modeChange !== undefined && (data.code === 9 || data.code === 16)) return;

	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	var control = findControlsUnderPointer(pointerX, pointerY);

	var lockedControl = remoteInteraction[uniqueID].lockedControl();

	if (lockedControl !== null) {
		var event = {code: data.code, printable:false, state: "up", ctrlId:lockedControl.ctrlId, appId:lockedControl.appId, instanceID:lockedControl.instanceID};
		broadcast('keyInTextInputWidget', event, 'receivesWidgetEvents');
		if (data.code === 13) { //Enter key
			remoteInteraction[uniqueID].dropControl();
		}
		return;
	}
	else if (control!==null){
		return;
	}



	var elem = findAppUnderPointer(pointerX, pointerY);

	if(elem !== null){
		if(remoteInteraction[uniqueID].windowManagementMode()){
			if(data.code === 8 || data.code === 46){ // backspace or delete
				deleteApplication(elem);

				addEventToUserLog(uniqueID, {type: "delete", data: {application: {id: elem.id, type: elem.application}}, time: Date.now()});
			}
		}
		else if(remoteInteraction[uniqueID].appInteractionMode()) {	//only send special keys
			keyUp(uniqueID, pointerX, pointerY, data);
		}
	}
}

function wsKeyPress(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	var lockedControl = remoteInteraction[uniqueID].lockedControl();
	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;
	var control = findControlsUnderPointer(pointerX, pointerY);

	if (data.code === 9 && remoteInteraction[uniqueID].SHIFT && sagePointers[uniqueID].visible) {
		// shift + tab
		remoteInteraction[uniqueID].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode}, 'receivesPointerData');

		/*
		if(remoteInteraction[uniqueID].interactionMode === 0)
			addEventToUserLog(uniqueID, {type: "SAGE2PointerMode", data: {mode: "windowManagement"}, time: Date.now()});
		else
			addEventToUserLog(uniqueID, {type: "SAGE2PointerMode", data: {mode: "applicationInteraction"}, time: Date.now()});
		*/

		if (remoteInteraction[uniqueID].modeChange !== undefined) clearTimeout(remoteInteraction[uniqueID].modeChange);
		remoteInteraction[uniqueID].modeChange = setTimeout(function() {
			delete remoteInteraction[uniqueID].modeChange;
		}, 500);
	}
	else if (lockedControl !== null){
		var event = {code: data.code, printable:true, state: "down", ctrlId:lockedControl.ctrlId, appId:lockedControl.appId, instanceID:lockedControl.instanceID};
		broadcast('keyInTextInputWidget', event, 'receivesWidgetEvents');
		if (data.code === 13){ //Enter key
			addEventToUserLog(uniqueID, {type: "widgetAction", data: {application: lockedControl.appId, widget: lockedControl.ctrlId}, time: Date.now()});

			remoteInteraction[uniqueID].dropControl();
		}
	}
	else if(control!==null){
		return;
	}
	else if ( remoteInteraction[uniqueID].appInteractionMode() ) {
		keyPress(uniqueID, pointerX, pointerY, data);
	}

}

// **************  File Upload Functions *****************
function wsUploadedFile(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	addEventToUserLog(uniqueID, {type: "fileUpload", data: data, time: Date.now()});
}

function wsRadialMenuClick(wsio, data) {
	if(data.button === "closeButton") {
		addEventToUserLog(data.user, {type: "radialMenu", data: {action: "close"}, time: Date.now()});
	}
	else if(data.button === "settingsButton" || data.button.indexOf("Window") >= 0) {
		var action = data.data.state === "opened" ? "open" : "close";
		addEventToUserLog(data.user, {type: "radialMenuAction", data: {button: data.button, action: action}, time: Date.now()});
	}
	else {
		addEventToUserLog(data.user, {type: "radialMenuAction", data: {button: data.button}, time: Date.now()});
	}
}

// **************  Media Stream Functions *****************

function wsStartNewMediaStream(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	console.log("received new stream: ", data.id);

	mediaStreams[data.id] = {chunks: [], clients: {}, ready: true, timeout: null};
	for(var i=0; i<clients.length; i++){
		if(clients[i].messages.receivesMediaStreamFrames){
			var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
			mediaStreams[data.id].clients[clientAddress] = false;
		}
	}

	// Forcing 'int' type for width and height
	//     for some reasons, messages from websocket lib from Linux send strings for ints
	data.width  = parseInt(data.width,  10);
	data.height = parseInt(data.height, 10);

	appLoader.createMediaStream(data.src, data.type, data.encoding, data.title, data.color, data.width, data.height, function(appInstance) {
		appInstance.id = data.id;
		broadcast('createAppWindow', appInstance, 'requiresFullApps');
		broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(appInstance), 'requiresAppPositionSizeTypeOnly');

		applications.push(appInstance);

		addEventToUserLog(uniqueID, {type: "mediaStreamStart", data: {application: {id: appInstance.id, type: appInstance.application}}, time: Date.now()});
	});

	// Debug media stream freezing
	mediaStreams[data.id].timeout = setTimeout(function() {
		console.log("Start: 5 sec with no updates from: " + data.id);
		console.log(mediaStreams[data.id].clients);
		console.log("ready: " + mediaStreams[data.id].ready);
	}, 5000);
}

function wsUpdateMediaStreamFrame(wsio, data) {
	mediaStreams[data.id].ready = true;
	for(var key in mediaStreams[data.id].clients){
		mediaStreams[data.id].clients[key] = false;
	}

	var stream = findAppById(data.id);
	if(stream !== null) stream.data = data.state;

	broadcast('updateMediaStreamFrame', data, 'receivesMediaStreamFrames');

	// Debug media stream freezing
	clearTimeout(mediaStreams[data.id].timeout);
	mediaStreams[data.id].timeout = setTimeout(function() {
		console.log("Update: 5 sec with no updates from: " + data.id);
		console.log(mediaStreams[data.id].clients);
		console.log("ready: " + mediaStreams[data.id].ready);
		if(mediaStreams[data.id].chunks.length === 0)
			console.log("chunks received: " + allNonBlank(mediaStreams[data.id].chunks));
	}, 5000);
}

function wsUpdateMediaStreamChunk(wsio, data) {
	if(mediaStreams[data.id].chunks.length === 0) mediaStreams[data.id].chunks = initializeArray(data.total, "");
	mediaStreams[data.id].chunks[data.piece] = data.state.src;
	if(allNonBlank(mediaStreams[data.id].chunks)){
		wsUpdateMediaStreamFrame(wsio, {id: data.id, state: {src: mediaStreams[data.id].chunks.join(""), type: data.state.type, encoding: data.state.encoding}});
		mediaStreams[data.id].chunks = [];
	}
}

function wsStopMediaStream(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	var elem = findAppById(data.id);
	if(elem !== null) {
		deleteApplication( elem );

		addEventToUserLog(uniqueID, {type: "delete", data: {application: {id: elem.id, type: elem.application}}, time: Date.now()});
	}

	addEventToUserLog(uniqueID, {type: "mediaStreamEnd", data: {application: {id: data.id, type: "media_stream"}}, time: Date.now()});
}

function wsReceivedMediaStreamFrame(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	var i;
	var broadcastAddress, broadcastID;
	var serverAddress, clientAddress;

	mediaStreams[data.id].clients[uniqueID] = true;
	if (allTrueDict(mediaStreams[data.id].clients) && mediaStreams[data.id].ready){
		mediaStreams[data.id].ready = false;
		var broadcastWS = null;
		var mediaStreamData = data.id.split("|");
		if (mediaStreamData.length === 2) { // local stream --> client | stream_id
			broadcastAddress = mediaStreamData[0];
			broadcastID = parseInt(mediaStreamData[1]);
			for (i=0; i<clients.length; i++) {
				clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
				if (clientAddress === broadcastAddress) broadcastWS = clients[i];
			}
			if (broadcastWS !== null) broadcastWS.emit('requestNextFrame', {streamId: broadcastID});
		}
		else if (mediaStreamData.length === 3) { // remote stream --> remote_server | client | stream_id
			serverAddress    = mediaStreamData[0];
			broadcastAddress = mediaStreamData[1];
			broadcastID      = mediaStreamData[2];

			for (i=0; i<clients.length; i++) {
				clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
				if (clientAddress === serverAddress) { broadcastWS = clients[i]; break; }
			}

			if (broadcastWS !== null) broadcastWS.emit('requestNextRemoteFrame', {id: broadcastAddress + "|" + broadcastID});
		}
	}
}

// **************  Media Block Stream Functions *****************
function wsStartNewMediaBlockStream(wsio, data) {
    console.log("Starting media stream: ", data);
    // Forcing 'int' type for width and height
	//     for some reasons, messages from websocket lib from Linux send strings for ints
	data.width  = parseInt(data.width,  10);
	data.height = parseInt(data.height, 10);


	mediaBlockStreams[data.id] = {chunks: [], clients: {}, ready: true, timeout: null, width: data.width, height: data.height};
	for(var i=0; i<clients.length; i++){
		if(clients[i].messages.receivesMediaStreamFrames){
			var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
			mediaBlockStreams[data.id].clients[clientAddress] = {wsio: clients[i], readyForNextFrame: true, blockList: []};
		}
	}

    appLoader.createMediaBlockStream(data.src, data.type, data.encoding, data.title, data.color, data.width, data.height, function(appInstance) {
		appInstance.id     = data.id;
        appInstance.width  = data.width;
        appInstance.height = data.height;
        appInstance.data   = data;
		broadcast('createAppWindow', appInstance, 'requiresFullApps');
		broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(appInstance), 'requiresAppPositionSizeTypeOnly');

		applications.push(appInstance);
    });

    var app = findAppById(data.id);

    calculateValidBlocks(app, 128, mediaBlockStreams);

    // Debug media stream freezing
	mediaBlockStreams[data.id].timeout = setTimeout(function() {
		console.log("Start: 5 sec with no updates from: " + data.id);
		console.log(mediaBlockStreams[data.id].clients);
		console.log("ready: " + mediaBlockStreams[data.id].ready);
	}, 5000);

}

function wsUpdateMediaBlockStreamFrame(wsio, buffer) {
    var id = byteBufferToString(buffer);
    var blocksize = 128;

	mediaBlockStreams[id].ready = true;
	for(var key in mediaBlockStreams[id].clients){
		mediaBlockStreams[id].clients[key].readyForNextFrame = false;
	}

	var yuvBuffer = buffer.slice(id.length+1);

    var blockBuffers = pixelblock.yuv420ToPixelBlocks(yuvBuffer, mediaBlockStreams[id].width, mediaBlockStreams[id].height, blocksize);

    var pixelbuffer = [];
    var idBuffer = Buffer.concat([new Buffer(id), new Buffer([0])]);
    var dateBuffer = intToByteBuffer(Date.now(), 8);
    for(var i=0; i<blockBuffers.length; i++){
        var blockIdxBuffer = intToByteBuffer(i, 2);
        pixelbuffer[i] = Buffer.concat([idBuffer, blockIdxBuffer, dateBuffer, blockBuffers[i]]);
    }

    for(key in mediaBlockStreams[id].clients) {
		for(i=0; i<pixelbuffer.length; i++){
			if (mediaBlockStreams[id].clients[key].blockList.indexOf(i) >= 0) {
				mediaBlockStreams[id].clients[key].wsio.emit('updateMediaBlockStreamFrame', pixelbuffer[i]);
			} else {
                // this client has no blocks, so it is ready for next frame!
                mediaBlockStreams[id].clients[key].readyForNextFrame = true;
            }
		}
	}

    var data = {id: id, src: ""};
	// Debug media stream freezing
    // Media stream froze, clear everything and restart
	clearTimeout(mediaBlockStreams[id].timeout);
	mediaBlockStreams[id].timeout = setTimeout(function() {
		console.log("Update: 5 sec with no updates from: " + data.id);
		console.log(mediaBlockStreams[id].clients);
		console.log("ready: " + mediaBlockStreams[id].ready);
		if(mediaBlockStreams[id].chunks.length === 0)
			console.log("chunks received: " + allNonBlank(mediaBlockStreams[id].chunks));
	}, 5000);
}

function wsStopMediaBlockStream(wsio, data) {
	var elem = findAppById(data.id);

	if(elem !== null) deleteApplication( elem );
}

function wsReceivedMediaBlockStreamFrame(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	var i;
	var broadcastAddress, broadcastID;
	var serverAddress, clientAddress;

    var clientsReady = true;

    if(data.newClient !== null && data.newClient !== undefined) {
        if(data.newClient) {
            initializeMediaBlockStreams(uniqueID);
            var app = findAppById(data.id);
            calculateValidBlocks(app, 128, mediaBlockStreams);
        }
    }

	mediaBlockStreams[data.id].clients[uniqueID].readyForNextFrame = true;

    for (var key in mediaBlockStreams[data.id].clients) {
        if(!mediaBlockStreams[data.id].clients[key].readyForNextFrame) clientsReady = false;
    }

	if (clientsReady && mediaBlockStreams[data.id].ready) {
		mediaBlockStreams[data.id].ready = false;
		var broadcastWS = null;
		var mediaBlockStreamData = data.id.split("|");
		if (mediaBlockStreamData.length === 2) { // local stream --> client | stream_id
			broadcastAddress = mediaBlockStreamData[0];
			broadcastID = parseInt(mediaBlockStreamData[1]);
			for (i=0; i<clients.length; i++) {
				clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
				if (clientAddress === broadcastAddress) broadcastWS = clients[i];
			}
			if (broadcastWS !== null) broadcastWS.emit('requestNextFrame', {streamId: broadcastID});
		}
		else if (mediaBlockStreamData.length === 3) { // remote stream --> remote_server | client | stream_id
			serverAddress    = mediaBlockStreamData[0];
			broadcastAddress = mediaBlockStreamData[1];
			broadcastID      = mediaBlockStreamData[2];

			for (i=0; i<clients.length; i++) {
				clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
				if (clientAddress === serverAddress) { broadcastWS = clients[i]; break; }
			}

			if(broadcastWS !== null) broadcastWS.emit('requestNextRemoteFrame', {id: broadcastAddress + "|" + broadcastID});
		}
	}
}

// Print message from remote applications
function wsPrintDebugInfo(wsio, data) {
	// sprint for padding and pretty colors
	console.log(
			sprint("Node %2d> ", data.node) + sprint("[%s] ", data.app),
		data.message);
}

function wsRequestVideoFrame(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	videoHandles[data.id].clients[uniqueID].readyForNextFrame = true;
	handleNewClientReady(data.id);
}

// **************  File Manipulation Functions for Apps ************
/*
function wsWriteToFile (wsio, data){
	var fullPath = path.join(uploadsFolder, "textfiles", data.fileName);
	fs.writeFile(fullPath, data.buffer, function(err){
		if (err) {
			console.log("Error: Could not write to file - " + fullpath);
		}
	});
}

function wsReadFromFile (wsio, data){
	var fullPath = path.join(uploadsFolder, "textfiles", data.fileName);
	fs.readFile(fullPath, {encoding:'utf8'}, function(err, fileContent){
		if (err) {
			console.log("Error: Could not read from file - " + fullpath);
		}
		else{
			var fileData = {id: data.id, fileName: data.fileName, buffer:fileContent};
			broadcast('receiveFileData', fileData, 'requestsFileHandling')
		}

	});
}

*/
// **************  Application Animation Functions *****************

function wsFinishedRenderingAppFrame(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	if (wsio === masterDisplay) appAnimations[data.id].fps = data.fps;
	appAnimations[data.id].clients[uniqueID] = true;
	if(allTrueDict(appAnimations[data.id].clients)){
		var key;
		for(key in appAnimations[data.id].clients){
			appAnimations[data.id].clients[key] = false;
		}
		// animate max 60 fps
		var now = new Date();
		var elapsed = now.getTime() - appAnimations[data.id].date.getTime();
		var fps = appAnimations[data.id].fps || 30;
		var ticks = 1000/fps;
		if(elapsed > ticks){
			appAnimations[data.id].date = new Date();
			broadcast('animateCanvas', {id: data.id, date: new Date()}, 'requiresFullApps');
		}
		else{
			setTimeout(function() {
				appAnimations[data.id].date = new Date();
				broadcast('animateCanvas', {id: data.id, date: new Date()}, 'requiresFullApps');
			}, ticks-elapsed);
		}
	}
}

function wsUpdateAppState(wsio, data) {
	// Using updates only from display client 0
	if (wsio.clientID === 0) {
		var app = findAppById(data.id);
		if(app !== null) app.data = data.state;
	}
}

//
// Got a resize call for an application itself
//
function wsAppResize(wsio, data) {
	// Update the object with the new dimensions
	var app = findAppById(data.id);
	if (app) {
		// Update the width height and aspect ratio
		app.width  = data.width;
		app.height = data.height;
		app.aspect = app.width/app.height;
		app.native_width  = data.width;
		app.native_height = data.height;
		// build the object to be sent
		var updateItem = {elemId: app.id,
							elemLeft: app.left, elemTop: app.top,
							elemWidth: app.width, elemHeight: app.height,
							force: true, date: new Date()};
		// send the order
		broadcast('setItemPositionAndSize', updateItem, 'receivesWindowModification');
	}
}

//
// Broadcast data to all clients who need apps
//
function wsBroadcast(wsio, data) {
	broadcast('broadcast', data, 'requiresFullApps');
}

//
// Search tweets using Twitter API
//
function wsSearchTweets(wsio, data) {
	if(twitter === null) {
		if(data.broadcast === true)
			broadcast('broadcast', {app: data.app, func: data.func, data: {query: data.query, result: null, err: {message: "Twitter API not enabled in SAGE2 configuration"}}}, 'requiresFullApps');
		else
			wsio.emit('broadcast', {app: data.app, func: data.func, data: {query: data.query, result: null, err: {message: "Twitter API not enabled in SAGE2 configuration"}}});
		return;
	}

	twitter.get('search/tweets', data.query, function(err, info, response) {
		if(data.broadcast === true)
			broadcast('broadcast', {app: data.app, func: data.func, data: {query: data.query, result: info, err: err}}, 'requiresFullApps');
		else
			wsio.emit('broadcast', {app: data.app, func: data.func, data: {query: data.query, result: info, err: err}});
	});
}


// **************  Session Functions *****************

function wsSaveSesion(wsio, data) {
	var sname = "";
	if (data) {
		sname = data;
	} else {
		var ad    = new Date();
		sname = sprint("session-%4d_%02d_%02d-%02d:%02d:%02s",
							ad.getFullYear(), ad.getMonth()+1, ad.getDate(),
							ad.getHours(), ad.getMinutes(), ad.getSeconds() );
	}
	saveSession(sname);
}

function printListSessions() {
	var thelist = listSessions();
	console.log("Sessions\n---------");
	for (var i = 0; i < thelist.length; i++) {
		console.log(sprint("%2d: Name: %s\tSize: %.0fKB\tDate: %s",
			i, thelist[i].exif.FileName, thelist[i].exif.FileSize/1024.0, thelist[i].exif.FileDate
		));
	}
}

function listSessions() {
	var thelist = [];
	// Walk through the session files: sync I/Os to build the array
	var files = fs.readdirSync(sessionFolder);
	for (var i = 0; i < files.length; i++) {
		var file = files[i];
		var filename = path.join(sessionFolder, file);
		var stat = fs.statSync(filename);
		// is it a file
		if (stat.isFile()) {
			// doest it ends in .json
			if (filename.indexOf(".json", filename.length - 5) >= 0) {
				// use its change time (creation, update, ...)
				var ad = new Date(stat.ctime);
				var strdate = sprint("%4d/%02d/%02d %02d:%02d:%02s",
										ad.getFullYear(), ad.getMonth()+1, ad.getDate(),
										ad.getHours(), ad.getMinutes(), ad.getSeconds() );
				// Make it look like an exif data structure
				thelist.push( { exif: { FileName: file.slice(0, -5),  FileSize:stat.size, FileDate: strdate} } );
			}
		}
	}
	return thelist;
}

function deleteSession (filename) {
	if (filename) {
		var fullpath = path.join(sessionFolder, filename);
		// if it doesn't end in .json, add it
		if (fullpath.indexOf(".json", fullpath.length - 5) === -1) {
			fullpath += '.json';
		}
		fs.unlink(fullpath, function (err) {
			if (err) {
				console.log("Sessions> Could not delete session ", filename, err);
				return;
			}
			console.log("Sessions> Successfully deleted session", filename);
		});
	}
}

function saveSession (filename) {
	filename = filename || 'default.json';

	var fullpath = path.join(sessionFolder, filename);
	// if it doesn't end in .json, add it
	if (fullpath.indexOf(".json", fullpath.length - 5) === -1) {
		fullpath += '.json';
	}

	var states     = {};
	states.apps    = [];
	states.numapps = 0;
	states.date    = Date.now();
	for (var i=0; i<applications.length; i++) {
		var a = applications[i];
		// Ignore media streaming applications for now (desktop sharing)
		if (a.application !== 'media_stream' || a.application !== 'media_block_stream') {
			states.apps.push(a);
			states.numapps++;
		}
	}

	try {
		fs.writeFileSync(fullpath, JSON.stringify(states, null, 4));
		console.log("Session> saved to " + fullpath);
	}
	catch (err) {
		console.log("Session> error saving", err);
	}
}

function loadSession (filename) {
	filename = filename || 'default.json';

	var fullpath = path.join(sessionFolder, filename);
	// if it doesn't end in .json, add it
	if (fullpath.indexOf(".json", fullpath.length - 5) === -1) {
		fullpath += '.json';
	}
	fs.readFile(fullpath, function(err, data) {
		if (err) {
			console.log("Server> reading error", err);
		} else {
			console.log("Server> read sessions from " + fullpath);

			var session = JSON.parse(data);
			console.log("Session> number of applications", session.numapps);

			session.apps.forEach(function(element, index, array) {
				var a = element;//session.apps[i];
				console.log("Session> App",  a.id);

				if (a.application === "movie_player") {
					var vid;
					var vidURL = url.parse(a.url);

					var loadVideo = function(appInstance, videohandle) {
						appInstance.id              = getUniqueAppId();
						appInstance.left            = a.left;
						appInstance.top             = a.top;
						appInstance.width           = a.width;
						appInstance.height          = a.height;
						appInstance.previous_left   = a.previous_left;
						appInstance.previous_top    = a.previous_top;
						appInstance.previous_width  = a.previous_width;
						appInstance.previous_height = a.previous_height;
						appInstance.maximized       = a.maximized;
						mergeObjects(a.data, appInstance.data, ['video_url', 'video_type', 'audio_url', 'audio_type']);

						broadcast('createAppWindow', appInstance, 'requiresFullApps');
						broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(appInstance), 'requiresAppPositionSizeTypeOnly');

						applications.push(appInstance);

						initializeLoadedVideo(appInstance, videohandle);
					};

					if(vidURL.hostname === config.host) {
						vid = {application: a.application, filename: a.title};
						appLoader.loadFileFromLocalStorage(vid, loadVideo);
					}
					else {
						vid = {url: a.url, type: a.type};
						appLoader.loadFileFromWebURL(vid, loadVideo);
					}
				}
				else {
					// Get the application a new ID
					a.id = getUniqueAppId();
					// Reset the time
					a.date = new Date();
					if (a.animation) {
						var j;
						appAnimations[a.id] = {clients: {}, date: new Date()};
						for(j=0; j<clients.length; j++){
							if(clients[j].messages.requiresFullApps){
								var clientAddress = clients[j].remoteAddress.address + ":" + clients[j].remoteAddress.port;
								appAnimations[a.id].clients[clientAddress] = false;
							}
						}
					}

					broadcast('createAppWindow', a, 'requiresFullApps');
					broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(a), 'requiresAppPositionSizeTypeOnly');

					applications.push(a);
				}
			});
		}
	});
}

// **************  Information Functions *****************

function listClients() {
	var i;
	console.log("Clients (%d)\n------------", clients.length);
	for(i=0; i<clients.length; i++){
		var ws = clients[i];
		var uniqueID = ws.remoteAddress.address + ":" + ws.remoteAddress.port;
		if (ws.clientType === "display")
			console.log(sprint("%2d: %s (%s %s)", i, uniqueID, ws.clientType, ws.clientID));
		else
			console.log(sprint("%2d: %s (%s)", i, uniqueID, ws.clientType));
	}
}

function listMediaStreams() {
	var i, c, key;
	console.log("Streams (%d)\n------------", Object.keys(mediaBlockStreams).length);
	i = 0;
	for (key in mediaBlockStreams) {
		var numclients = Object.keys(mediaBlockStreams[key].clients).length;
		console.log(sprint("%2d: %s ready:%s clients:%d", i, key, mediaBlockStreams[key].ready, numclients));
		var cstr = " ";
		for (c in mediaBlockStreams[key].clients) {
			cstr += c + "(" + mediaBlockStreams[key].clients[c] + ") ";
		}
		console.log("\t", cstr);
		i++;
	}
}

function listMediaBlockStreams() {
    listMediaStreams();
}

function listApplications() {
	var i;
	console.log("Applications\n------------");
	for(i=0; i<applications.length; i++){
		console.log(sprint("%2d: %s %s [%dx%d +%d+%d] %s (v%s) by %s",
			i, applications[i].id,  applications[i].application,
			applications[i].width, applications[i].height,
			applications[i].left,  applications[i].top,
			applications[i].title, applications[i].metadata.version,
			applications[i].metadata.author));
	}
}


// **************  Tiling Functions *****************

//
//
// From Ratko's DIM in SAGE
//   adapted to use all the tiles
//   and center of gravity

function averageWindowAspectRatio() {
	var num = applications.length;

	if (num === 0) return 1.0;

	var totAr = 0.0;
	var i;
	for (i=0; i<num; i++) {
		var app =  applications[i];
		totAr += (app.width / app.height);
	}
	return (totAr / num);
}

function fitWithin(app, x, y, width, height, margin) {
	var titleBar = config.ui.titleBarHeight;
	if (config.ui.auto_hide_ui===true) titleBar = 0;

	// take buffer into account
	x += margin;
	y += margin;
	width  = width  - 2*margin;
	height = height - 2*margin;

	var widthRatio  = (width-titleBar)  / app.width;
	var heightRatio = (height-titleBar) / app.height;
	var maximizeRatio;
	if (widthRatio > heightRatio)
		maximizeRatio = heightRatio;
	else
		maximizeRatio = widthRatio;

    // figure out the maximized app size (w/o the widgets)
    var newAppWidth  = Math.round( maximizeRatio*app.width );
    var newAppHeight = Math.round( maximizeRatio*app.height );

    // figure out the maximized app position (with the widgets)
    var postMaxX = Math.round( width/2.0 - newAppWidth/2.0 );
    var postMaxY = Math.round( height/2.0 - newAppHeight/2.0 );

    // the new position of the app considering the maximized state and
    // all the widgets around it
    var newAppX = x + postMaxX;
    var newAppY = y + postMaxY;

	return [newAppX, newAppY, newAppWidth, newAppHeight];
}

// Create a 2D array
function Create2DArray(rows) {
  var arr = [];
  for (var i=0; i<rows; i++) {
     arr[i] = [];
  }
  return arr;
}
// Calculate the euclidian distance between two objects with .x and .y fields
function distance2D(p1, p2) {
	var d = 0.0;
	d = Math.sqrt( Math.pow((p1.x-p2.x), 2) + Math.pow((p1.y-p2.y), 2) );
	return d;
}
function findMinimum(arr) {
	var val = Number.MAX_VALUE;
	var idx = 0;
	for (var i=0; i<arr.length; i++) {
		if (arr[i]<val) {
			val = arr[i];
			idx = i;
		}
	}
	return idx;
}

function tileApplications() {
	var app;
	var i, j, c, r;
	var numCols, numRows, numCells;

	var displayAr  = config.totalWidth / config.totalHeight;
	var arDiff     = displayAr / averageWindowAspectRatio();
	var numWindows = applications.length;

	// 3 scenarios... windows are on average the same aspect ratio as the display
	if (arDiff >= 0.7 && arDiff <= 1.3) {
		numCols = Math.ceil(Math.sqrt( numWindows ));
		numRows = Math.ceil(numWindows / numCols);
	}
    else if (arDiff < 0.7) {
		// windows are much wider than display
		c = Math.round(1 / (arDiff/2.0));
		if (numWindows <= c) {
			numRows = numWindows;
			numCols = 1;
		}
		else {
			numCols = Math.max(2, Math.round(numWindows / c));
			numRows = Math.round(Math.ceil(numWindows / numCols));
		}
	}
	else {
		// windows are much taller than display
		c = Math.round(arDiff*2);
		if (numWindows <= c) {
			numCols = numWindows;
			numRows = 1;
		}
		else {
			numRows = Math.max(2, Math.round(numWindows / c));
			numCols = Math.round(Math.ceil(numWindows / numRows));
		}
	}
	numCells = numRows * numCols;

    // determine the bounds of the tiling area
	var titleBar = config.ui.titleBarHeight;
	if (config.ui.auto_hide_ui===true) titleBar = 0;
	var areaX = 0;
	var areaY = Math.round(1.5 * titleBar); // keep 0.5 height as margin
	if (config.ui.auto_hide_ui === true) areaY = -config.ui.titleBarHeight;

	var areaW = config.totalWidth;
	var areaH = config.totalHeight-(1.0*titleBar);

	var tileW = Math.floor(areaW / numCols);
	var tileH = Math.floor(areaH / numRows);

	var padding = 4;
	// if only one application, no padding, i.e maximize
	if (applications.length===1) padding = 0;

    var centroidsApps  = [];
    var centroidsTiles = [];

    // Caculate apps centers
    for (i=0; i<applications.length; i++) {
		app =  applications[i];
		centroidsApps[i] = {x: app.left+app.width/2.0, y: app.top+app.height/2.0};
	}
    // Caculate tiles centers
	for (i=0; i<numCells; i++) {
		c = i % numCols;
		r = Math.floor(i / numCols);
		centroidsTiles[i] = {x: (c*tileW+areaX)+tileW/2.0, y: (r*tileH+areaY)+tileH/2.0};
	}

	// Calculate distances
	var distances = new Create2DArray(applications.length);
	for (i=0; i<applications.length; i++) {
		for (j=0; j<numCells; j++) {
			var d = distance2D(centroidsApps[i], centroidsTiles[j]);
			distances[i][j] = d;
		}
	}

	for (i=0; i<applications.length; i++) {
		// get the application
		app =  applications[i];
		// pick a cell
		var cellid = findMinimum(distances[i]);
		// put infinite value to disable the chosen cell
		for (j=0; j<applications.length; j++) distances[j][cellid] = Number.MAX_VALUE;

		// calculate new dimensions
		c = cellid % numCols;
		r = Math.floor(cellid / numCols);
        var newdims = fitWithin(app, c*tileW+areaX, r*tileH+areaY, tileW, tileH, padding);

        // update the data structure
        app.left   = newdims[0];
        app.top    = newdims[1] - titleBar;
		app.width  = newdims[2];
		app.height = newdims[3];
		// build the object to be sent
		var updateItem = {elemId: app.id,
							elemLeft: app.left, elemTop: app.top,
							elemWidth: app.width, elemHeight: app.height,
							force: true, date: new Date()};
		var updateApp = findAppById(updateItem.elemId);
		// send the order
		broadcast('startMove', {id: updateItem.id, date: updateItem.date}, 'requiresFullApps');
		broadcast('startResize', {id: updateItem.id, date: updateItem.date}, 'requiresFullApps');
		broadcast('setItemPositionAndSize', updateItem, 'receivesWindowModification');
		broadcast('finishedMove', {id: updateItem.id, date: updateItem.date}, 'requiresFullApps');
		broadcast('finishedResize', {id: updateItem.id, date: updateItem.date}, 'requiresFullApps');
		if(updateApp !== null && updateApp.application === "movie_player") calculateValidBlocks(updateApp, 128, videoHandles);
        if(updateApp !== null && updateApp.application === "media_block_stream") calculateValidBlocks(updateApp, 128, mediaBlockStreams);
		if(videoHandles[updateItem.elemId] !== undefined && videoHandles[updateItem.elemId].newFrameGenerated === false)
			handleNewVideoFrame(updateItem.elemId);
    }
}

// Remove all applications
function clearDisplay() {
	var all = applications.length;
	while (all) {
		deleteApplication( applications[0] );
		// deleteApplication changes the array, so check again
		all = applications.length;
	}
}


// handlers for messages from UI

function wsClearDisplay(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	clearDisplay();

	addEventToUserLog(uniqueID, {type: "clearDisplay", data: null, time: Date.now()});
}

function wsTileApplications(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	tileApplications();

	addEventToUserLog(uniqueID, {type: "tileApplications", data: null, time: Date.now()});
}


// **************  Server File Functions *****************

function wsRequestAvailableApplications(wsio, data) {
	var apps = getApplications();
	wsio.emit('availableApplications', apps);
}

function wsRequestStoredFiles(wsio, data) {
	var savedFiles = getSavedFilesList();
	wsio.emit('storedFileList', savedFiles);
}

function wsLoadApplication(wsio, data) {
	var appData = {application: "custom_app", filename: data.application};
	appLoader.loadFileFromLocalStorage(appData, function(appInstance) {
		appInstance.id = getUniqueAppId();

		if(appInstance.animation){
			var i;
			appAnimations[appInstance.id] = {clients: {}, date: new Date()};
			for(i=0; i<clients.length; i++){
				if(clients[i].messages.requiresFullApps){
					var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
					appAnimations[appInstance.id].clients[clientAddress] = false;
				}
			}
		}

		broadcast('createAppWindow', appInstance, 'requiresFullApps');
		broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(appInstance), 'requiresAppPositionSizeTypeOnly');

		addEventToUserLog(data.user, {type: "openApplication", data: {application: {id: appInstance.id, type: appInstance.application}}, time: Date.now()});

		applications.push(appInstance);
	});
}

function wsLoadFileFromServer(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	if (data.application === "load_session") {
		// if it's a session, then load it
		loadSession(data.filename);

		addEventToUserLog(uniqueID, {type: "openFile", data: {name: data.filename, application: {id: null, type: "session"}}, time: Date.now()});
	}
	else {
		appLoader.loadFileFromLocalStorage(data, function(appInstance, videohandle) {
			appInstance.id = getUniqueAppId();

			broadcast('createAppWindow', appInstance, 'requiresFullApps');
			broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(appInstance), 'requiresAppPositionSizeTypeOnly');

			addEventToUserLog(data.user, {type: "openFile", data: {name: data.filename, application: {id: appInstance.id, type: appInstance.application}}, time: Date.now()});

			applications.push(appInstance);

			initializeLoadedVideo(appInstance, videohandle);
		});
	}
}

function initializeLoadedVideo(appInstance, videohandle) {
	if(appInstance.application !== "movie_player") return;

	var i;
	var blocksize = 128;
	var horizontalBlocks = Math.ceil(appInstance.native_width /blocksize);
	var verticalBlocks   = Math.ceil(appInstance.native_height/blocksize);
	var videoBuffer = new Array(horizontalBlocks*verticalBlocks);

	videohandle.on('error', function(err) {
		console.log("VIDEO ERROR: " + err);
	});
	videohandle.on('start', function() {
		broadcast('videoPlaying', {id: appInstance.id}, 'requiresFullApps');
	});
	videohandle.on('end', function() {
		broadcast('videoEnded', {id: appInstance.id}, 'requiresFullApps');
		if(videoHandles[appInstance.id].loop === true) {
			videoHandles[appInstance.id].decoder.seek(0.0, function() {
				videoHandles[appInstance.id].decoder.play();
			});
			broadcast('updateVideoItemTime', {id: appInstance.id, timestamp: 0.0, play: false}, 'requiresFullApps');
		}
	});
	videohandle.on('frame', function(frameIdx, buffer) {
		videoHandles[appInstance.id].frameIdx = frameIdx;
		var blockBuffers = pixelblock.yuv420ToPixelBlocks(buffer, appInstance.data.width, appInstance.data.height, blocksize);

		var idBuffer = Buffer.concat([new Buffer(appInstance.id), new Buffer([0])]);
		var frameIdxBuffer = intToByteBuffer(frameIdx,   4);
		var dateBuffer = intToByteBuffer(Date.now(), 8);
		for(i=0; i<blockBuffers.length; i++){
			var blockIdxBuffer = intToByteBuffer(i, 2);
			videoHandles[appInstance.id].pixelbuffer[i] = Buffer.concat([idBuffer, blockIdxBuffer, frameIdxBuffer, dateBuffer, blockBuffers[i]]);
		}

		handleNewVideoFrame(appInstance.id);
	});

	videoHandles[appInstance.id] = {decoder: videohandle, frameIdx: null, loop: false, pixelbuffer: videoBuffer, newFrameGenerated: false, clients: {}};

	for(i=0; i<clients.length; i++){
		if(clients[i].messages.receivesMediaStreamFrames){
			var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
			videoHandles[appInstance.id].clients[clientAddress] = {wsio: clients[i], readyForNextFrame: false, blockList: []};
		}
	}
	calculateValidBlocks(appInstance, blocksize, videoHandles);

	setTimeout(function() {
		videoHandles[appInstance.id].loop = appInstance.data.looped;
		if(appInstance.data.frame !== 0) {
			var ts = appInstance.data.frame / appInstance.data.framerate;
			videoHandles[appInstance.id].decoder.seek(ts, function() {
				if(appInstance.data.paused === false) {
					videoHandles[appInstance.id].decoder.play();
				}
			});
			broadcast('updateVideoItemTime', {id: appInstance.id, timestamp: ts, play: false}, 'requiresFullApps');
		}
		else {
			if(appInstance.data.paused === false) {
				videoHandles[appInstance.id].decoder.play();
			}
		}
		if(appInstance.data.muted === true) {
			broadcast('videoMuted', {id: appInstance.id}, 'requiresFullApps');
		}
    }, 250);
}

// move this function elsewhere
function handleNewVideoFrame(id) {
	var video = videoHandles[id];

	var i;
	var key;

	video.newFrameGenerated = true;
	for(key in video.clients) {
		if(video.clients[key].readyForNextFrame !== true){
			return false;
		}
	}

	video.newFrameGenerated = false;
	for(key in video.clients) {
		video.clients[key].wsio.emit('updateFrameIndex', {id: id, frameIdx: video.frameIdx});
		for(i=0; i<video.pixelbuffer.length; i++){
			var hasBlock = false;
			if(video.clients[key].blockList.indexOf(i) >= 0){
				hasBlock = true;
				video.clients[key].wsio.emit('updateVideoFrame', video.pixelbuffer[i]);
			}
			if(hasBlock === true) video.clients[key].readyForNextFrame = false;
		}
	}
	return true;
}

// move this function elsewhere
function handleNewClientReady(id) {
	var video = videoHandles[id];
	if (video.newFrameGenerated !== true) return false;

	var i;
	var key;

	for (key in video.clients) {
		if (video.clients[key].readyForNextFrame !== true) {
			return false;
		}
	}

	video.newFrameGenerated = false;
	for (key in video.clients) {
		video.clients[key].wsio.emit('updateFrameIndex', {id: id, frameIdx: video.frameIdx});
		for(i=0; i<video.pixelbuffer.length; i++){
			var hasBlock = false;
			if(video.clients[key].blockList.indexOf(i) >= 0){
				hasBlock = true;
				video.clients[key].wsio.emit('updateVideoFrame', video.pixelbuffer[i]);
			}
			if (hasBlock === true) video.clients[key].readyForNextFrame = false;
		}
	}
	return true;
}

// move this function elsewhere
function calculateValidBlocks(app, blockSize, handles) {
	var i, j, key;

	var horizontalBlocks = Math.ceil(app.data.width /blockSize);
	var verticalBlocks   = Math.ceil(app.data.height/blockSize);

	var renderBlockWidth  = blockSize * app.width / app.data.width;
	var renderBlockHeight = blockSize * app.height / app.data.height;

	for(key in handles[app.id].clients){
		handles[app.id].clients[key].blockList = [];
		for(i=0; i<verticalBlocks; i++){
			for(j=0; j<horizontalBlocks; j++){
				var blockIdx = i*horizontalBlocks+j;

				if(handles[app.id].clients[key].wsio.clientID < 0){
					handles[app.id].clients[key].blockList.push(blockIdx);
				}
				else {
					var display = config.displays[handles[app.id].clients[key].wsio.clientID];
					var left = j*renderBlockWidth  + app.left;
					var top  = i*renderBlockHeight + app.top + config.ui.titleBarHeight;
					var offsetX = config.resolution.width  * display.column;
					var offsetY = config.resolution.height * display.row;

					if ((left+renderBlockWidth) >= offsetX && left <= (offsetX+config.resolution.width) &&
						(top +renderBlockHeight) >= offsetY && top  <= (offsetY+config.resolution.height)) {
						handles[app.id].clients[key].blockList.push(blockIdx);
					}
				}
			}
		}
		handles[app.id].clients[key].wsio.emit('updateValidStreamBlocks', {id: app.id, blockList: handles[app.id].clients[key].blockList});
	}
}

function wsDeleteElementFromStoredFiles(wsio, data) {
	if (data.application === "load_session") {
		// if it's a session
		deleteSession(data.filename);
	} else if (data.application === 'custom_app') {
		// an app
		// NYI
		return;
	} else if (data.application === 'image_viewer') {
		// an image
		assets.deleteImage(data.filename);
	} else if (data.application === 'movie_player') {
		// a movie
		assets.deleteVideo(data.filename);
	} else if (data.application === 'pdf_viewer') {
		// an pdf
		assets.deletePDF(data.filename);
	}
	else {
		// I dont know
		return;
	}
}



// **************  Adding Web Content (URL) *****************

function wsAddNewWebElement(wsio, data) {
	appLoader.loadFileFromWebURL(data, function(appInstance, videohandle) {

		// Get the drop position and convert it to wall coordinates
		var position = data.position || [0, 0];
		position[0] = parseInt(position[0] * config.totalWidth,  10);
		position[1] = parseInt(position[1] * config.totalHeight, 10);

		// Use the position from the drop location
		if (position[0] !== 0 || position[1] !== 0) {
			appInstance.left = position[0] - appInstance.width/2;
			if (appInstance.left < 0 ) appInstance.left = 0;
			appInstance.top  = position[1] - appInstance.height/2;
			if (appInstance.top < 0) appInstance.top = 0;
		}

		appInstance.id = getUniqueAppId();
		broadcast('createAppWindow', appInstance, 'requiresFullApps');
		broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(appInstance), 'requiresAppPositionSizeTypeOnly');

		applications.push(appInstance);

		initializeLoadedVideo(appInstance, videohandle);

		if(appInstance.animation){
			var i;
			appAnimations[appInstance.id] = {clients: {}, date: new Date()};
			for(i=0; i<clients.length; i++){
				if(clients[i].messages.requiresFullApps){
					var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
					appAnimations[appInstance.id].clients[clientAddress] = false;
				}
			}
		}
	});
}

// **************  Command line          *****************

function wsCommand(wsio, data) {
	// send the command to the REPL interpreter
	shell.write(data+'\n');
}

// **************  Launching Web Browser *****************

function wsOpenNewWebpage(wsio, data) {
	// Check if the web-browser is connected
	if (webBrowserClient !== null) {
		// then emit the command
		console.log("Browser> new page", data.url);
		webBrowserClient.emit('openWebBrowser', {url: data.url});
	}
}


// **************  Video / Audio Synchonization *****************

function wsPlayVideo(wsio, data) {
	if(videoHandles[data.id] === undefined || videoHandles[data.id] === null) return;

	videoHandles[data.id].decoder.play();
}

function wsPauseVideo(wsio, data) {
	if(videoHandles[data.id] === undefined || videoHandles[data.id] === null) return;

	videoHandles[data.id].decoder.pause(function() {
		broadcast('videoPaused', {id: data.id}, 'requiresFullApps');
	});
}

function wsStopVideo(wsio, data) {
	if(videoHandles[data.id] === undefined || videoHandles[data.id] === null) return;

	videoHandles[data.id].decoder.stop(function() {
		broadcast('videoPaused', {id: data.id}, 'requiresFullApps');
		broadcast('updateVideoItemTime', {id: data.id, timestamp: 0.0, play: false}, 'requiresFullApps');
		broadcast('updateFrameIndex', {id: data.id, frameIdx: 0}, 'requiresFullApps');
	});
}

function wsUpdateVideoTime(wsio, data) {
	if(videoHandles[data.id] === undefined || videoHandles[data.id] === null) return;

	videoHandles[data.id].decoder.seek(data.timestamp, function() {
		if(data.play === true) videoHandles[data.id].decoder.play();
	});
	broadcast('updateVideoItemTime', data, 'requiresFullApps');
}

function wsMuteVideo(wsio, data) {
	if(videoHandles[data.id] === undefined || videoHandles[data.id] === null) return;

	broadcast('videoMuted', {id: data.id}, 'requiresFullApps');
}

function wsUnmuteVideo(wsio, data) {
	if(videoHandles[data.id] === undefined || videoHandles[data.id] === null) return;

	broadcast('videoUnmuted', {id: data.id}, 'requiresFullApps');
}

function wsLoopVideo(wsio, data) {
	if(videoHandles[data.id] === undefined || videoHandles[data.id] === null) return;

	videoHandles[data.id].loop = data.loop;
}

// **************  Remote Server Content *****************

function wsAddNewElementFromRemoteServer(wsio, data) {
	console.log("add element from remote server");
	var clientAddress, i;

	appLoader.loadApplicationFromRemoteServer(data, function(appInstance, videohandle) {
		console.log("Remote App: " + appInstance.title + " (" + appInstance.application + ")");
		if(appInstance.application === "media_stream"){
			appInstance.id = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port + "|" + appInstance.id;
			mediaStreams[appInstance.id] = {ready: true, chunks: [], clients: {}};
			for(i=0; i<clients.length; i++){
				if(clients[i].messages.receivesMediaStreamFrames){
					clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
					mediaStreams[appInstance.id].clients[clientAddress] = false;
				}
			}
		}
        else if(appInstance.application === "media_block_stream"){
			appInstance.id = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port + "|" + appInstance.id;
			mediaBlockStreams[appInstance.id] = {ready: true, chunks: [], clients: {}};
			for(i=0; i<clients.length; i++){
				if(clients[i].messages.receivesMediaStreamFrames){
					clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
					mediaBlockStreams[appInstance.id].clients[clientAddress].readyForNextFrame = false;
				}
			}
		}
		else {
			appInstance.id = getUniqueAppId();
		}

		mergeObjects(data.data, appInstance.data, ['video_url', 'video_type', 'audio_url', 'audio_type']);

		broadcast('createAppWindow', appInstance, 'requiresFullApps');
		broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(appInstance), 'requiresAppPositionSizeTypeOnly');

		applications.push(appInstance);

		initializeLoadedVideo(appInstance, videohandle);

		if(appInstance.animation){
			appAnimations[appInstance.id] = {clients: {}, date: new Date()};
			for(i=0; i<clients.length; i++){
				if(clients[i].messages.requiresFullApps){
					clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
					appAnimations[appInstance.id].clients[clientAddress] = false;
				}
			}
		}
	});
}

function wsRequestNextRemoteFrame(wsio, data) {
	var stream = findAppById(data.id);
	var remote_id = config.host + ":" + config.port + "|" + data.id;

	if(stream !== null) wsio.emit('updateRemoteMediaStreamFrame', {id: remote_id, state: stream.data});
	else wsio.emit('stopMediaStream', {id: remote_id});
}

function wsUpdateRemoteMediaStreamFrame(wsio, data) {
	var key;
	mediaStreams[data.id].ready = true;
	for(key in mediaStreams[data.id].clients){
		mediaStreams[data.id].clients[key] = false;
	}
	var stream = findAppById(data.id);
	if(stream !== null) stream.data = data.data;

	//broadcast('updateRemoteMediaStreamFrame', data, 'receivesMediaStreamFrames');
	broadcast('updateMediaStreamFrame', data, 'receivesMediaStreamFrames');
}

function wsReceivedRemoteMediaStreamFrame(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

	mediaStreams[data.id].clients[uniqueID] = true;
	if(allTrueDict(mediaStreams[data.id].clients) && mediaStreams[data.id].ready){
		mediaStreams[data.id].ready = false;

		var broadcastWS = null;
		var serverAddress = data.id.substring(6).split("|")[0];
		var broadcastAddress = data.id.substring(6).split("|")[1];

		for (var i=0; i<clients.length; i++) {
			var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
			if (clientAddress === serverAddress) { broadcastWS = clients[i]; break; }
		}

		if (broadcastWS !== null) broadcastWS.emit('requestNextRemoteFrame', {id: broadcastAddress});
	}
}

// XXX - Remote block streaming not tested
function wsRequestNextRemoteBlockFrame(wsio, data) {
	var stream = findAppById(data.id);
	var remote_id = config.host + ":" + config.port + "|" + data.id;

	if(stream !== null) wsio.emit('updateRemoteMediaBlockStreamFrame', {id: remote_id, state: stream.data});
	else wsio.emit('stopMediaBlockStream', {id: remote_id});
}

function wsUpdateRemoteMediaBlockStreamFrame(wsio, data) {
	var key;
	mediaBlockStreams[data.id].ready = true;
	for(key in mediaBlockStreams[data.id].clients){
		mediaBlockStreams[data.id].clients[key].readyForNextFrame = false;
	}
	var stream = findAppById(data.id);
	if(stream !== null) stream.data = data.data;

	//broadcast('updateRemoteMediaBlockStreamFrame', data, 'receivesMediaStreamFrames');
	broadcast('updateMediaBlockStreamFrame', data, 'receivesMediaStreamFrames');
}

function wsReceivedRemoteMediaBlockStreamFrame(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;

    console.log("ReceivedRemoteMediaBlockStreamFrame");
	mediaBlockStreams[data.id].clients[uniqueID].readyForNextFrame = true;
	if (allTrueDict(mediaBlockStreams[data.id].clients) && mediaBlockStreams[data.id].ready) {
		mediaBlockStreams[data.id].ready = false;

		var broadcastWS = null;
		var serverAddress = data.id.substring(6).split("|")[0];
		var broadcastAddress = data.id.substring(6).split("|")[1];

		for (var i=0; i<clients.length; i++) {
			var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
			if (clientAddress === serverAddress) { broadcastWS = clients[i]; break; }
		}

		if (broadcastWS !== null) broadcastWS.emit('requestNextRemoteFrame', {id: broadcastAddress});
	}
}

function wsRequestDataSharingSession(wsio, data) {
	var known_site = findRemoteSiteByConnection(wsio);
	if(known_site !== null) data.config.name = known_site.name;
	if(data.config.name === undefined || data.config.name === null) data.config.name = "Unknown";
	
	console.log("Data-sharing request from " + data.config.name + " (" + data.config.host + ":" + data.config.port + ")");
	broadcast('requestDataSharingSession', {name: data.config.name, host: data.config.host, port: data.config.port}, 'requiresFullApps');
	remoteSharingRequestDialog = {wsio: wsio, config: data.config};
}

function wsCancelDataSharingSession(wsio, data) {
	console.log("Data-sharing request cancelled");
	broadcast('closeRequestDataSharingDialog', null, 'requiresFullApps');
	remoteSharingRequestDialog = null;
}

function wsAcceptDataSharingSession(wsio, data) {
	var myMin = Math.min(config.totalWidth, config.totalHeight-config.ui.titleBarHeight);
	var sharingScale = (0.9*myMin) / Math.min(data.width, data.height);
	console.log("Data-sharing request accepted: " + data.width + "x" + data.height + ", scale: " + sharingScale);
	broadcast('closeDataSharingWaitDialog', null, 'requiresFullApps');
	var dataSession = {
		name: remoteSharingWaitDialog.name,
		host: dataSession.session.wsio.remoteAddress.address,
		port, dataSession.session.wsio.remoteAddress.port,
		left: config.ui.titleBarHeight,
		top: 1.5*config.ui.titleBarHeight,
		width: data.width,
		height: data.height,
		scale: sharingScale
	};
	broadcast('initializeDataSharingSession', dataSession, 'requiresFullApps');
	remoteSharingSessions.push(dataSession);
	remoteSharingWaitDialog = null;
}

function wsRejectDataSharingSession(wsio, data) {
	console.log("Data-sharing request rejected");
	broadcast('closeDataSharingWaitDialog', null, 'requiresFullApps');
	remoteSharingWaitDialog = null;
}

// **************  Widget Control Messages *****************

function wsAddNewControl(wsio, data){
	for (var i=controls.length-1; i>=0; i--){
		if (controls[i].id === data.id)
			return;
	}

	controls.push(data);

	var uniqueID = data.id.substring(data.appId.length, data.id.lastIndexOf("_"));

	broadcast('createControl', data, 'requestsWidgetControl');

	var app = findAppById(data.appId);
	if(app !== null) {
		addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "open", application: {id: app.id, type: app.application}}, time: Date.now()});
	}
}

function wsSelectedControlId(wsio, data){ // Get the id of a ctrl widgetbar or ctrl element(button and so on)
	var regTI = /textInput/;
	var regSl = /slider/;
	var regButton = /button/;
	if (data.ctrlId !== null) { // If a button or a slider is pressed, release the widget itself so that it is not picked up for moving
		remoteInteraction[data.addr].releaseControl();
	}
	//console.log("lock:", remoteInteraction[data.addr].lockedControl() );
	var lockedControl = remoteInteraction[data.addr].lockedControl();
	if (lockedControl){
		//If a text input widget was locked, drop it
		var appdata = {ctrlId:lockedControl.ctrlId, appId:lockedControl.appId};
		broadcast('dropTextInputControl', appdata, 'receivesWidgetEvents');
		remoteInteraction[data.addr].dropControl();
	}
	if (regButton.test(data.ctrlId) || regTI.test(data.ctrlId) || regSl.test(data.ctrlId)) {
		var appData = {ctrlId:data.ctrlId, appId:data.appId, instanceID:data.instanceID};
		remoteInteraction[data.addr].lockControl(appData);
		if (regSl.test(appData.ctrlId) && /knob/.test(appData.ctrlId))
			broadcast('sliderKnobLockAction', appData, 'receivesWidgetEvents');
	}
}

function wsReleasedControlId(wsio, data){
	var regSl = /slider/;
	var regButton = /button/;
	if (data.ctrlId !==null && remoteInteraction[data.addr].lockedControl() !== null &&(regSl.test(data.ctrlId) || regButton.test(data.ctrlId))) {
		remoteInteraction[data.addr].dropControl();
		broadcast('executeControlFunction', {ctrlId: data.ctrlId, appId: data.appId, instanceID: data.instanceID}, 'receivesWidgetEvents');

		var app;
		if(data.ctrlId.indexOf("buttonCloseApp") >= 0) {
			app = findAppById(data.appId);
			if(app !== null) {
				addEventToUserLog(data.addr, {type: "delete", data: {application: {id: app.id, type: app.application}}, time: Date.now()});
			}
		}
		else if(data.ctrlId.indexOf("buttonCloseWidget") >= 0) {
			app = findAppById(data.appId);
			if(app !== null) {
				addEventToUserLog(data.addr, {type: "widgetMenu", data: {action: "close", application: {id: app.id, type: app.application}}, time: Date.now()});
			}
		}
		else {
			addEventToUserLog(data.addr, {type: "widgetAction", data: {application: data.appId, widget: data.ctrlId}, time: Date.now()});
		}
	}
}

function wsCloseAppFromControl(wsio, data){
	var app = findAppById(data.appId);
	if (app)
		deleteApplication(app);
}

function wsHideWidgetFromControl(wsio, data){
	var ctrl = findControlById(data.instanceID);
	hideControl(ctrl);
}

function wsOpenRadialMenuFromControl(wsio, data){
	console.log("radial menu");
	var ctrl = findControlById(data.id);
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	createRadialMenu( uniqueID, ctrl.left, ctrl.top);
}

/* ****************** Clone Request Methods ************************** */

function wsCreateAppClone(wsio, data){
	var app = findAppById(data.id);
	var appData = {application: "custom_app", filename: app.application};
	appLoader.loadFileFromLocalStorage(appData, function(clone) {
		clone.id = getUniqueAppId();
		var pos = getNewWindowPosition({x:app.left, y:app.top});
		clone.left = pos.x;
		clone.top = pos.y;
		clone.width = app.width;
		clone.height = app.height;
		if(clone.animation){
			var i;
			appAnimations[clone.id] = {clients: {}, date: new Date()};
			for(i=0; i<clients.length; i++){
				if(clients[i].messages.requiresFullApps){
					var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
					appAnimations[clone.id].clients[clientAddress] = false;
				}
			}
		}
		if (clone.data)
			clone.data.loadData = data.cloneData;
		else
			clone.data = {loadData:data.cloneData};

		broadcast('createAppWindow', clone, 'requiresFullApps');
		broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(clone), 'requiresAppPositionSizeTypeOnly');

		applications.push(clone);
	});
}


function getNewWindowPosition(seedPosition){

	if (!newWindowPosition){
		newWindowPosition  = {x:seedPosition.x+20, y:seedPosition.y+20};
		seedWindowPosition = {x:seedPosition.x,    y:seedPosition.y};
	}
	else if (seedWindowPosition.x === seedPosition.x && seedWindowPosition.y === seedPosition.y){
		newWindowPosition.x += 20;
		newWindowPosition.y += 20;
	}
	else{
		newWindowPosition  = {x:seedPosition.x+20, y:seedPosition.y+20};
		seedWindowPosition = {x:seedPosition.x,    y:seedPosition.y};
	}


	if ((newWindowPosition.x > config.totalWidth - 200) || (newWindowPosition.y > config.totalHeight - 200)){
		newWindowPosition.x = 20;
		newWindowPosition.y = 20;
	}
	return newWindowPosition;
}

/* ****************** Clone Request Methods ************************** */


function loadConfiguration() {
	var configFile = null;

	if (program.configuration) {
		configFile = program.configuration;
	}
	else {
	// Read config.txt - if exists and specifies a user defined config, then use it
	if(sageutils.fileExists("config.txt")){
		var lines = fs.readFileSync("config.txt", 'utf8').split("\n");
		for(var i =0; i<lines.length; i++){
			var text = "";
			var comment = lines[i].indexOf("//");
			if(comment >= 0) text = lines[i].substring(0, comment).trim();
			else text = lines[i].trim();

			if(text !== ""){
				configFile = text;
				console.log("Found configuration file: " + configFile);
				break;
			}
		}
	}
	}

	// If config.txt does not exist or does not specify any files, look for a config with the hostname
	if(configFile === null){
		var hn = os.hostname();
		var dot = hn.indexOf(".");
		if(dot >= 0) hn = hn.substring(0, dot);
		configFile = path.join("config", hn + "-cfg.json");
		if(sageutils.fileExists(configFile)){
			console.log("Found configuration file: " + configFile);
		}
		else{
			if(platform === "Windows")
				configFile = path.join("config", "defaultWin-cfg.json");
			else
				configFile = path.join("config", "default-cfg.json");
			console.log("Using default configuration file: " + configFile);
		}
	}

	if (!sageutils.fileExists(configFile)) {
		console.log("\n----------");
		console.log("Cannot find configuration file:", configFile);
		console.log("----------\n\n");
		process.exit(1);
	}

	var json_str = fs.readFileSync(configFile, 'utf8');
	var userConfig = json5.parse(json_str);
	// compute extra dependent parameters
	userConfig.totalWidth     = userConfig.resolution.width  * userConfig.layout.columns;
	userConfig.totalHeight    = userConfig.resolution.height * userConfig.layout.rows;

	var minDim = Math.min(userConfig.totalWidth, userConfig.totalHeight);
	var maxDim = Math.max(userConfig.totalWidth, userConfig.totalHeight);

	if (userConfig.ui.titleBarHeight) userConfig.ui.titleBarHeight = parseInt(userConfig.ui.titleBarHeight, 10);
	else userConfig.ui.titleBarHeight = Math.round(0.025 * minDim);

	if (userConfig.ui.widgetControlSize) userConfig.ui.widgetControlSize = parseInt(userConfig.ui.widgetControlSize, 10);
	else userConfig.ui.widgetControlSize = Math.round(0.020 * minDim);

	if (userConfig.ui.titleTextSize) userConfig.ui.titleTextSize = parseInt(userConfig.ui.titleTextSize, 10);
	else userConfig.ui.titleTextSize  = Math.round(0.015 * minDim);

	if (userConfig.ui.pointerSize) userConfig.ui.pointerSize = parseInt(userConfig.ui.pointerSize, 10);
	else userConfig.ui.pointerSize = Math.round(0.08 * minDim);

	if (userConfig.ui.minWindowWidth) userConfig.ui.minWindowWidth = parseInt(userConfig.ui.minWindowWidth, 10);
	else userConfig.ui.minWindowWidth  = Math.round(0.08 * minDim);  // 8%
	if (userConfig.ui.minWindowHeight) userConfig.ui.minWindowHeight = parseInt(userConfig.ui.minWindowHeight, 10);
	else userConfig.ui.minWindowHeight = Math.round(0.08 * minDim); // 8%

	if (userConfig.ui.maxWindowWidth) userConfig.ui.maxWindowWidth = parseInt(userConfig.ui.maxWindowWidth, 10);
	else userConfig.ui.maxWindowWidth  = Math.round( 1.2 * maxDim);  // 120%
	if (userConfig.ui.maxWindowHeight) userConfig.ui.maxWindowHeight = parseInt(userConfig.ui.maxWindowHeight, 10);
	else userConfig.ui.maxWindowHeight = Math.round( 1.2 * maxDim); // 120%

	// Set default values if missing
	if (userConfig.port === undefined)
		userConfig.port = 443;
	else
		userConfig.port = parseInt(userConfig.port, 10); // to make sure it's a number
	if (userConfig.index_port === undefined)
		userConfig.index_port = 80;
	else
		userConfig.index_port = parseInt(userConfig.index_port, 10);

	// Set the display clip value if missing (true by default)
	if (userConfig.background.clip !== undefined)
		userConfig.background.clip = sageutils.isTrue(userConfig.background.clip);
	else
		userConfig.background.clip = true;


	// Registration to EVL's server (sage.evl.uic.edu), true by default
	if (userConfig.register_site === undefined)
		userConfig.register_site = true;
	else {
		// test for a true value: true, on, yes, 1, ...
		if (sageutils.isTrue(userConfig.register_site))
			userConfig.register_site = true;
		else
			userConfig.register_site = false;
	}

	return userConfig;
}

function getUniqueAppId() {
	var id = "application_"+itemCount.toString();
	itemCount++;

	return id;
}

function getNewUserId() {
	var id = sprint("user_%02d", userCount);
	userCount++;

	return id;
}

function getApplications() {
	var uploadedApps = assets.listApps();

	// Remove 'viewer' apps
	var i = uploadedApps.length;
	while (i--) {
		if (uploadedApps[i].exif.metadata.fileTypes && uploadedApps[i].exif.metadata.fileTypes.length > 0) {
			uploadedApps.splice(i, 1);
		}
	}
	// Sort the list of apps
	uploadedApps.sort(sageutils.compareTitle);

	return uploadedApps;
}

function getSavedFilesList() {
	// Build lists of assets
	var uploadedImages = assets.listImages();
	var uploadedVideos = assets.listVideos();
	var uploadedPdfs   = assets.listPDFs();
	var savedSessions  = listSessions();

	// Sort independently of case
	uploadedImages.sort( sageutils.compareFilename );
	uploadedVideos.sort( sageutils.compareFilename );
	uploadedPdfs.sort(   sageutils.compareFilename );
	savedSessions.sort(  sageutils.compareFilename );

	var list = {images: uploadedImages, videos: uploadedVideos, pdfs: uploadedPdfs, sessions: savedSessions};

	return list;
}

function setupDisplayBackground() {
	var tmpImg, imgExt;

	// background image
	if (config.background.image !== undefined && config.background.image.url !== undefined) {
		var bg_file = path.join(public_dir, config.background.image.url);

		if (config.background.image.style === "tile") {
			// do nothing
			return;
		}
		else if (config.background.image.style === "fit") {
			exiftool.file(bg_file, function(err1, data) {
				if (err1) {
					console.log("Error processing background image:", bg_file, err1);
					console.log(" ");
					process.exit(1);
				}
				var bg_info = data;

				if (bg_info.ImageWidth === config.totalWidth && bg_info.ImageHeight === config.totalHeight) {
					sliceBackgroundImage(bg_file, bg_file);
				}
				else {
					tmpImg = path.join(public_dir, "images", "background", "tmp_background.png");
					var out_res  = config.totalWidth.toString() + "x" + config.totalHeight.toString();

					imageMagick(bg_file).noProfile().command("convert").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", out_res).write(tmpImg, function(err2) {
						if (err2) throw err2;
						sliceBackgroundImage(tmpImg, bg_file);
					});
				}
			} );
		}
		else {
			config.background.image.style = "stretch";
			imgExt = path.extname(bg_file);
			tmpImg = path.join(public_dir, "images", "background", "tmp_background" + imgExt);

			imageMagick(bg_file).resize(config.totalWidth, config.totalHeight, "!").write(tmpImg, function(err) {
				if(err) throw err;

				sliceBackgroundImage(tmpImg, bg_file);
			});
		}
	}
}

function sliceBackgroundImage(fileName, outputBaseName) {
	for(var i=0; i<config.displays.length; i++){
		var x = config.displays[i].column * config.resolution.width;
		var y = config.displays[i].row * config.resolution.height;
		var output_dir  = path.dirname(outputBaseName);
		var input_ext   = path.extname(outputBaseName);
		var output_ext  = path.extname(fileName);
		var output_base = path.basename(outputBaseName, input_ext);
		var output = path.join(output_dir, output_base + "_"+i.toString() + output_ext);
		imageMagick(fileName).crop(config.resolution.width, config.resolution.height, x, y).write(output, function(err) {
			if (err) console.log("error slicing image", err); //throw err;
		});
	}
}

function setupHttpsOptions() {
	// build a list of certs to support multi-homed computers
	var certs = {};

	// file caching for the main key of the server
	var server_key = null;
	var server_crt = null;
	var server_ca  = null;

	// add the default cert from the hostname specified in the config file
	try {
		// first try the filename based on the hostname-server.key
		if (sageutils.fileExists(path.join("keys", config.host + "-server.key"))) {
			// Load the certificate files
			server_key = fs.readFileSync(path.join("keys", config.host + "-server.key"));
			server_crt = fs.readFileSync(path.join("keys", config.host + "-server.crt"));
			if(sageutils.fileExists(path.join("keys", config.host + "-ca.crt")))
				server_ca  = fs.readFileSync(path.join("keys", config.host + "-ca.crt"));
			// Build the crypto
			certs[config.host] = sageutils.secureContext(server_key, server_crt, server_ca);
		} else {
			// remove the hostname from the FQDN and search for wildcard certificate
			//    syntax: _.rest.com.key or _.rest.bigger.com.key
			var domain = '_.' + config.host.split('.').slice(1).join('.');
			console.log("Domain:", domain);
			server_key = fs.readFileSync( path.join("keys", domain + ".key") );
			server_crt = fs.readFileSync( path.join("keys", domain + ".crt") );
				// no need for CA
			certs[config.host] = sageutils.secureContext(server_key, server_crt, server_ca);
	}
	}
	catch (e) {
		console.log("\n----------");
		console.log("Cannot open certificate for default host:");
		console.log(" \"" + config.host + "\" needs file: " + e.path);
		console.log(" --> Please generate the appropriate certificate in the 'keys' folder");
		console.log("----------\n\n");
		process.exit(1);
	}

	for(var h in config.alternate_hosts){
		try {
			var alth = config.alternate_hosts[h];
			certs[ alth ] = sageutils.secureContext(
				fs.readFileSync(path.join("keys", alth + "-server.key")),
				fs.readFileSync(path.join("keys", alth + "-server.crt")),
				// CA is only needed for self-signed certs
				fs.readFileSync(path.join("keys", alth + "-ca.crt"))
			);
		}
		catch (e) {
			console.log("\n----------");
			console.log("Cannot open certificate for the alternate host: ", config.alternate_hosts[h]);
			console.log(" needs file: \"" + e.path + "\"");
			console.log(" --> Please generate the appropriate certificates in the 'keys' folder");
			console.log(" Ignoring alternate host: ", config.alternate_hosts[h]);
			console.log("----------\n");
		}
	}

	var httpsOptions;

	if (sageutils.nodeVersion === 10) {
		httpsOptions = {
			// server default keys
			key:  server_key,
			cert: server_crt,
			ca:   server_ca,
			requestCert: false, // If true the server will request a certificate from clients that connect and attempt to verify that certificate
			rejectUnauthorized: false,
			// callback to handle multi-homed machines
			SNICallback: function(servername){
				if(certs.hasOwnProperty(servername)){
					return certs[servername];
				}
				else{
					console.log("SNI> Unknown host, cannot find a certificate for ", servername);
					return null;
				}
			}
		};
	} else {
		httpsOptions = {
			// server default keys
			key:  server_key,
			cert: server_crt,
			ca:   server_ca,
			requestCert: false, // If true the server will request a certificate from clients that connect and attempt to verify that certificate
			rejectUnauthorized: false,
			// callback to handle multi-homed machines
			SNICallback: function(servername, cb) {
				if(certs.hasOwnProperty(servername)){
					cb(null, certs[servername]);
				}
				else{
					console.log("SNI> Unknown host, cannot find a certificate for ", servername);
					cb("SNI Unknown host", null);
				}
			}
		};
	}

	return httpsOptions;
}

function sendConfig(req, res) {
	res.writeHead(200, {"Content-Type": "text/plain"});
	// Adding the calculated version into the data structure
	config.version = SAGE2_version;
	res.write(JSON.stringify(config));
	res.end();
}

function uploadForm(req, res) {
	var form     = new formidable.IncomingForm();
	var position = [ 0, 0 ];
	// Limits the amount of memory all fields together (except files) can allocate in bytes.
	//    set to 4MB.
	form.maxFieldsSize = 4 * 1024 * 1024;
	form.type          = 'multipart';
	form.multiples     = true;

	// var lastper = -1;
	// form.on('progress', function(bytesReceived, bytesExpected) {
	// 	var per = parseInt(100.0 * bytesReceived/ bytesExpected);
	// 	if ((per % 10)===0 && lastper!==per) {
	// 		console.log('Form> %d%', per);
	// 		lastper = per;
	// 	}
	// });

	form.on('fileBegin', function(name, file) {
		console.log('Form> ', name, file.name, file.type);
	});

	form.on('field', function (field, value) {
		// convert value [0 to 1] to wall coordinate from drop location
		if (field === 'dropX') position[0] = parseInt(parseFloat(value) * config.totalWidth,  10);
		if (field === 'dropY') position[1] = parseInt(parseFloat(value) * config.totalHeight, 10);
	});

	form.parse(req, function(err, fields, files) {
		if(err){
			res.writeHead(500, {"Content-Type": "text/plain"});
			res.write(err + "\n\n");
			res.end();
		}
		res.writeHead(200, {'content-type': 'text/plain'});
		res.write('received upload:\n\n');
		res.end(util.inspect({fields: fields, files: files}));
	});

	form.on('end', function() {
		// saves files in appropriate directory and broadcasts the items to the displays
		manageUploadedFiles(this.openedFiles, position);
	});
}

function manageUploadedFiles(files, position) {
	var fileKeys = Object.keys(files);
	fileKeys.forEach(function(key) {
		var file = files[key];
		appLoader.manageAndLoadUploadedFile(file, function(appInstance, videohandle) {

			if(appInstance === null){
				console.log("Form> unrecognized file type: ", file.name, file.type);
				return;
			}

			// Use the position from the drop location
			if (position[0] !== 0 || position[1] !== 0) {
				appInstance.left = position[0] - appInstance.width/2;
				if (appInstance.left < 0 ) appInstance.left = 0;
				appInstance.top  = position[1] - appInstance.height/2;
				if (appInstance.top < 0) appInstance.top = 0;
			}

			appInstance.id = getUniqueAppId();
			broadcast('createAppWindow', appInstance, 'requiresFullApps');
			broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(appInstance), 'requiresAppPositionSizeTypeOnly');

			applications.push(appInstance);

			initializeLoadedVideo(appInstance, videohandle);

			if(appInstance.animation){
				var i;
				appAnimations[appInstance.id] = {clients: {}, date: new Date()};
				for(i=0; i<clients.length; i++){
					if(clients[i].messages.requiresFullApps){
						var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
						appAnimations[appInstance.id].clients[clientAddress] = false;
					}
				}
			}
		});
	});
}


// **************  Remote Site Collaboration *****************

var remoteSites = [];
if (config.remote_sites) {
	remoteSites = new Array(config.remote_sites.length);
	config.remote_sites.forEach(function(element, index, array) {
		var wsURL = "wss://" + element.host + ":" + element.port.toString();

		var remote = createRemoteConnection(wsURL, element, index);

		var rWidth = Math.min((0.5*config.totalWidth)/remoteSites.length, config.ui.titleBarHeight*6) - 2;
		var rHeight = config.ui.titleBarHeight - 4;
		var rPos = (0.5*config.totalWidth) + ((rWidth+2)*(index-(remoteSites.length/2))) + 1;
		remoteSites[index] = {name: element.name, wsio: remote, connected: false, width: rWidth, height: rHeight, pos: rPos};

		// attempt to connect every 15 seconds, if connection failed
		setInterval(function() {
			if (!remoteSites[index].connected) {
				var rem = createRemoteConnection(wsURL, element, index);
				remoteSites[index].wsio = rem;
			}
		}, 15000);
	});
}

function createRemoteConnection(wsURL, element, index) {
	var remote = new WebsocketIO(wsURL, false, function() {
		console.log("connected to " + element.name);
		remote.remoteAddress.address = element.host;
		remote.remoteAddress.port = element.port;
		var clientDescription = {
			clientType: "remoteServer",
			host: config.host,
			port: config.port,
			sendsPointerData: false,
			sendsMediaStreamFrames: false,
			requestsServerFiles: false,
			sendsWebContentToLoad: false,
			sendsVideoSynchonization: false,
			sharesContentWithRemoteServer: true,
			receivesDisplayConfiguration: false,
			receivesClockTime: false,
			requiresFullApps: false,
			requiresAppPositionSizeTypeOnly: false,
			receivesMediaStreamFrames: false,
			receivesWindowModification: false,
			receivesPointerData: false,
			receivesInputEvents: false,
			receivesRemoteServerInfo: false
		};
		remote.emit('addClient', clientDescription);
		remoteSites[index].connected = true;
		var site = {name: remoteSites[index].name, connected: remoteSites[index].connected};
		broadcast('connectedToRemoteSite', site, 'receivesRemoteServerInfo');
		clients.push(remote);
	});

	remote.clientType = "remoteServer";

	remote.onclose(function() {
		console.log("Remote site \"" + config.remote_sites[index].name + "\" now offline");
		remoteSites[index].connected = false;
		var site = {name: remoteSites[index].name, connected: remoteSites[index].connected};
		broadcast('connectedToRemoteSite', site, 'receivesRemoteServerInfo');
		removeElement(clients, remote);
	});

	remote.on('addNewElementFromRemoteServer', wsAddNewElementFromRemoteServer);
	remote.on('requestNextRemoteFrame', wsRequestNextRemoteFrame);
	remote.on('updateRemoteMediaStreamFrame', wsUpdateRemoteMediaStreamFrame);
	remote.on('stopMediaStream', wsStopMediaStream);
    remote.on('requestNextRemoteBlockFrame', wsRequestNextRemoteBlockFrame);
    remote.on('updateRemoteMediaBlockStreamFrame', wsUpdateRemoteMediaBlockStreamFrame);
	remote.on('stopMediaBlockStream', wsStopMediaBlockStream);
	remote.on('requestDataSharingSession', wsRequestDataSharingSession);
	remote.on('cancelDataSharingSession', wsCancelDataSharingSession);
	remote.on('acceptDataSharingSession', wsAcceptDataSharingSession);
	remote.on('rejectDataSharingSession', wsRejectDataSharingSession);

	return remote;
}

// **************  System Time - Updated Every Minute *****************
var cDate = new Date();
setTimeout(function() {
	setInterval(function() {
		broadcast('setSystemTime', {date: new Date()}, 'receivesClockTime');
	}, 60000);

	broadcast('setSystemTime', {date: new Date()}, 'receivesClockTime');
}, (61-cDate.getSeconds())*1000);


// ***************************************************************************************

// Place callback for success in the 'listen' call for HTTPS

sage2Server.on('listening', function (e) {
	// Success
	console.log('SAGE2> Now serving clients at https://' + config.host + ':' + config.port + '/sageUI.html');
});

// Place callback for errors in the 'listen' call for HTTP
sage2Index.on('error', function (e) {
	if (e.code === 'EACCES') {
		console.log("HTTP_server> You are not allowed to use the port: ", config.index_port);
		console.log("HTTP_server>   use a different port or get authorization (sudo, setcap, ...)");
		console.log(" ");
		process.exit(1);
	}
	else if (e.code === 'EADDRINUSE') {
		console.log('HTTP_server> The port is already in use by another process:', config.index_port);
		console.log("HTTP_server>   use a different port or stop the offending process");
		console.log(" ");
		process.exit(1);
	}
	else {
		console.log("HTTP_server> Error in the listen call: ", e.code);
		console.log(" ");
		process.exit(1);
	}
});

// Place callback for success in the 'listen' call for HTTP
sage2Index.on('listening', function (e) {
	// Success
	console.log('SAGE2> Now serving clients at http://' + config.host + ':' + config.index_port);
});


// Odly the HTTPS modules doesnt throw the same exceptions than HTTP
//  catching errors at the process level
/*process.on('uncaughtException', function (e) {
	if (e.code == 'EACCES') {
		console.log("HTTPS_server> You are not allowed to use the port: ", config.port);
		console.log("HTTPS_server>   use a different port or get authorization (sudo, setcap, ...)");
		console.log(" ")
		process.exit(1);
	}
	else if (e.code == 'EADDRINUSE') {
		console.log('HTTPS_server> The port is already in use by another process:', config.port);
		console.log("HTTPS_server>   use a different port or stop the offending process");
		console.log(" ")
		process.exit(1);
	}
	else {
		console.log("Process> uncaught exception: ", e);
		console.log(" ")
		console.trace();
		process.exit(1);
	}
});*/

// KILL intercept
process.on('SIGTERM', quitSAGE2);
// CTRL-C intercept
process.on('SIGINT',  quitSAGE2);


// Start the HTTP server
sage2Index.listen(config.index_port);
// Start the HTTPS server
sage2Server.listen(config.port);


// ***************************************************************************************

// Load session file if specified on the command line (-s)
if (program.session) {
	setTimeout(function() {
		// if -s specified without argument
		if (program.session === true) loadSession();
		// if argument specified
		else loadSession(program.session);
	}, 1000);
}

// Command loop: reading input commands
if (program.interactive)
{
	// Create line reader for stdin and stdout
	shell = readline.createInterface({
		input:  process.stdin, output: process.stdout
	});

	// Set the prompt
	shell.setPrompt('> ');

	// Start the loop
	shell.prompt();

	// Callback for each line
	shell.on('line', function(line) {
		var command = line.trim().split(' ');
		switch(command[0]) {
			case '': // ignore
				break;
			case 'help':
				console.log('help\t\tlist commands');
				console.log('kill\t\tclose application: arg0: index - kill 0');
				console.log('apps\t\tlist running applications');
				console.log('clients\t\tlist connected clients');
				console.log('streams\t\tlist media streams');
				console.log('clear\t\tclose all running applications');
				console.log('tile\t\tlayout all running applications');
				console.log('save\t\tsave state of running applications into a session');
				console.log('load\t\tload a session and restore applications');
				console.log('assets\t\tlist the assets in the file library');
				console.log('regenerate\tregenerates the assets');
				console.log('hideui\t\thide/show/delay the user interface');
				console.log('sessions\tlist the available sessions');
				console.log('update\t\trun a git update');
				console.log('version\t\tprint SAGE2 version');
				console.log('exit\t\tstop SAGE2');
				break;

			case 'version':
				console.log('Version', SAGE2_version.base, ' branch:', SAGE2_version.branch, ' commit:', SAGE2_version.commit, SAGE2_version.date);
				break;

			case 'update':
				sageutils.updateWithGIT( function(err) {
					if (err) console.log('GIT> Update error');
					else console.log('GIT> Update done');
				});
				break;

			case 'save':
				if (command[1] !== undefined)
					saveSession(command[1]);
				else
					saveSession();
				break;
			case 'load':
				if (command[1] !== undefined)
					loadSession(command[1]);
				else
					loadSession();
				break;
			case 'sessions':
				printListSessions();
				break;
			case 'hideui':
				// if argument provided, used as auto_hide delay in second
				//   otherwise, it flips a switch
				if (command[1] !== undefined)
					broadcast('hideui', {delay:parseInt(command[1], 10)}, 'requiresFullApps');
				else
					broadcast('hideui', null, 'requiresFullApps');
				break;

			case 'close':
			case 'delete':
			case 'kill':
				if (command[1] !== undefined) {
					var kid = parseInt(command[1], 10); // convert arg1 to base 10
					if (!isNaN(kid) && (kid >= 0) && (kid < applications.length) ) {
						console.log('deleting application', kid);
						deleteApplication( applications[kid] );
					}
				}
				break;

			case 'clear':
				clearDisplay();
				break;

			case 'assets':
				assets.listAssets();
				break;

			case 'regenerate':
				assets.regenerateAssets();
				break;

			case 'tile':
				tileApplications();
				break;

			case 'clients':
				listClients();
				break;
			case 'apps':
				listApplications();
				break;
			case 'streams':
				listMediaStreams();
				break;
            case 'blockStreams':
				listMediaBlockStreams();
				break;

			case 'exit':
			case 'quit':
			case 'bye':
				quitSAGE2();
				break;
			default:
				console.log('Say what? I might have heard `' + line.trim() + '`');
				break;
		}
		// loop through
		shell.prompt();
	}).on('close', function() {
		// Close with CTRL-D or CTRL-C
		// Only synchronous code!
		// Saving stuff
		quitSAGE2();
	});
}


// ***************************************************************************************

function formatDateToYYYYMMDD_HHMMSS(date) {
	var year   = date.getFullYear();
	var month  = date.getMonth() + 1;
	var day    = date.getDate();
	var hour   = date.getHours();
	var minute = date.getMinutes();
	var second = date.getSeconds();

	year   = year.toString();
	month  = month >= 10 ? month.toString() : "0"+month.toString();
	day    = day >= 10 ? day.toString() : "0"+day.toString();
	hour   = hour >= 10 ? hour.toString() : "0"+hour.toString();
	minute = minute >= 10 ? minute.toString() : "0"+minute.toString();
	second = second >= 10 ? second.toString() : "0"+second.toString();

	return year + "-" + month + "-" + day + "_" + hour + "-" + minute + "-" + second;
}

function quitSAGE2() {
	if(users !== null) {
		var key;
		for(key in users) {
			if(users[key].ip !== undefined) delete users[key].ip;
		}
		users.session.end = Date.now();
		var userLogName = path.join("logs", "user-log_"+formatDateToYYYYMMDD_HHMMSS(new Date())+".json");
		fs.writeFileSync(userLogName, json5.stringify(users, null, 4));
		console.log("LOG> saved to " + userLogName);
	}

	if (config.register_site) {
		// un-register with EVL's server
		request({
			"rejectUnauthorized": false,
			"url": 'https://sage.evl.uic.edu/unregister',
			"form": config,
			"method": "POST"},
			function (err, response, body) {
				console.log('SAGE2> Deregistration with EVL site:', (err === null) ? "success" : err.code);
				saveSession();
				assets.saveAssets();
				if( omicronRunning )
					omicronManager.disconnect();
				process.exit(0);
			}
		);
	} else {
		saveSession();
		assets.saveAssets();
		if( omicronRunning )
			omicronManager.disconnect();
		process.exit(0);
	}
}


// broadcast version with stringify and checks for every client
function broadcast(func, data, type) {
	for(var i=0; i<clients.length; i++){
		if(clients[i].messages[type]) clients[i].emit(func, data);
	}
}

// optimized version: one stringify and no checks (ohhh)
function broadcast_opt(func, data, type) {
	// Marshall the message only once
	var message = JSON.stringify({f: func, d: data});
	try {
		for(var i=0; i<clients.length; i++){
			if(clients[i].messages[type]) clients[i].emitString( message );
		}
	} catch (e) {
		// nothing
	}
}

function findRemoteSiteByConnection(wsio) {
	var remoteIdx = -1;
	for (var i=0; i<config.remote_sites.length; i++) {
		if (wsio.remoteAddress.address === config.remote_sites[i].host &&
			wsio.remoteAddress.port === config.remote_sites[i].port)
			remoteIdx = i;
	}
	if (remoteIdx >= 0) return remoteSites[remoteIdx];
	else                return null;
}

function findAppUnderPointer(pointerX, pointerY) {
	var i;
	for(i=applications.length-1; i>=0; i--) {
		if(pointerX >= applications[i].left && pointerX <= (applications[i].left+applications[i].width) && pointerY >= applications[i].top && pointerY <= (applications[i].top+applications[i].height+config.ui.titleBarHeight)){
			return applications[i];
		}
	}
	return null;
}

function findAppById(id) {
	var i;
	for(i=0; i<applications.length; i++){
		if(applications[i].id === id) return applications[i];
	}
	return null;
}


function findControlsUnderPointer(pointerX, pointerY) {
	var last = controls.length-1;
	for(var i=last; i>=0; i--){
		if (controls[i]!== null && controls[i].show === true && pointerX >= controls[i].left && pointerX <= (controls[i].left+controls[i].width) && pointerY >= controls[i].top && pointerY <= (controls[i].top+controls[i].height)){
			var centerX = controls[i].left + controls[i].height/2.0;
			var centerY = controls[i].top + controls[i].height/2.0;
			var dist = Math.sqrt((pointerX - centerX)*(pointerX - centerX) + (pointerY - centerY)*(pointerY - centerY));
			var barMinX = controls[i].left + controls[i].height;
			var barMinY = controls[i].top + controls[i].height/2 - controls[i].barHeight/2;
			var barMaxX = controls[i].left + controls[i].width;
			var barMaxY = controls[i].top + controls[i].height/2 + controls[i].barHeight/2;
			if (dist<=controls[i].height/2.0 || (controls[i].hasSideBar && (pointerX >= barMinX && pointerX <= barMaxX) && (pointerY >= barMinY && pointerY <= barMaxY))) {
				if (i!==last){
					var temp = controls[i];
					controls[i] = controls[last];
					controls[last] = temp;
				}
				return controls[last];
			}
			else
				return null;
		}
	}
	return null;
}

function findControlById(id) {
	for (var i=controls.length-1; i>=0; i--) {
		if (controls[i].id === id) {
			return controls[i];
		}
	}
	return null;
}

// Never called
// function findControlsByUserId(uid) {
// 	var idxList = [];
// 	for (var i=controls.length-1; i>=0; i--) {
// 		if (controls[i].id.indexOf(uid) > -1) {
// 			idxList.push(i);
// 		}
// 	}
// 	return idxList;
// }

function hideControl(ctrl){
	if (ctrl.show === true) {
		ctrl.show = false;
		broadcast('hideControl', {id:ctrl.id, appId:ctrl.appId}, 'receivesWidgetEvents');
	}
}

function removeControlsForUser(uniqueID){
	for (var i=controls.length-1; i>=0; i--) {
		if (controls[i].id.indexOf(uniqueID) > -1) {
			controls.splice(i, 1);
		}
	}
	broadcast('removeControlsForUser', {user_id:uniqueID}, 'receivesWidgetEvents');
}

function showControl(ctrl, uniqueID, pointerX, pointerY){
	if (ctrl.show === false) {
		ctrl.show = true;
		moveControlToPointer(ctrl, uniqueID, pointerX, pointerY);
		broadcast('showControl', {id: ctrl.id, appId: ctrl.appId, user_color: sagePointers[uniqueID]? sagePointers[uniqueID].color: null}, 'receivesWidgetEvents');
	}
}

function moveControlToPointer(ctrl, uniqueID, pointerX, pointerY){
	var dt = new Date();
	var rightMargin = config.totalWidth - ctrl.width;
	var bottomMargin = config.totalHeight - ctrl.height;
	ctrl.left = (pointerX > rightMargin)? rightMargin: pointerX-ctrl.height/2;
	ctrl.top = (pointerY > bottomMargin)? bottomMargin: pointerY-ctrl.height/2;
	var app = findAppById(ctrl.appId);
	var appPos = (app===null)? null : getAppPositionSize(app);
	broadcast('setControlPosition', {date: dt, elemId: ctrl.id, elemLeft:ctrl.left, elemTop: ctrl.top, elemHeight: ctrl.height, user_color: sagePointers[uniqueID] ? sagePointers[uniqueID].color : null, appData: appPos}, 'receivesWidgetEvents');
}


function moveAppToFront(id) {
	var selectedIndex;
	var selectedApp;
	var appIds = [];
	var i;

	for(i=0; i<applications.length; i++){
		if(applications[i].id === id){
			selectedIndex = i;
			selectedApp = applications[selectedIndex];
			break;
		}
		appIds.push(applications[i].id);
	}
	for(i=selectedIndex; i<applications.length-1; i++){
		applications[i] = applications[i+1];
		appIds.push(applications[i].id);
	}
	applications[applications.length-1] = selectedApp;
	appIds.push(id);

	return appIds;
}

function initializeArray(size, val) {
	var arr = new Array(size);
	for(var i=0; i<size; i++){
		arr[i] = val;
	}
	return arr;
}

function allNonBlank(arr) {
	for(var i=0; i<arr.length; i++){
		if(arr[i] === "") return false;
	}
	return true;
}

function allTrueDict(dict) {
	var key;
	for(key in dict){
		if(dict[key] !== true) return false;
	}
	return true;
}

function removeElement(list, elem) {
	if(list.indexOf(elem) >= 0){
		moveElementToEnd(list, elem);
		list.pop();
	}
}

function moveElementToEnd(list, elem) {
	var i;
	var pos = list.indexOf(elem);
	if(pos < 0) return;
	for(i=pos; i<list.length-1; i++){
		list[i] = list[i+1];
	}
	list[list.length-1] = elem;
}

function intToByteBuffer(aInt, bytes) {
	var buf = new Buffer(bytes);
	var byteVal;
	var num = aInt;
	for(var i=0; i<bytes; i++){
		byteVal = num & 0xff;
		buf[i] = byteVal;
		num = (num - byteVal) / 256;
	}

	return buf;
}

// Never used
// function byteBufferToInt(buf) {
// 	var value = 0;
// 	for(var i=buf.length-1; i>=0; i--){
// 		value = (value * 256) + buf[i];
// 	}
// 	return value;
// }

function byteBufferToString(buf) {
	var str = "";
	var i = 0;

	while(buf[i] !== 0 && i < buf.length) {
		str += String.fromCharCode(buf[i]);
		i++;
	}

	return str;
}

function mergeObjects(a, b, ignore) {
	var ig = ignore || [];
	for(var key in b) {
		if(a[key] !== undefined && ig.indexOf(key) < 0) {
			if(typeof b[key] === "object" && typeof a[key] === "object")
				mergeObjects(a[key], b[key]);
			else if(typeof b[key] !== "object" && typeof a[key] !== "object")
				b[key] = a[key];
		}
	}
}

function addEventToUserLog(id, data) {
	var key;
	for(key in users) {
		if(users[key].ip && users[key].ip === id) {
			users[key].actions.push(data);
		}
	}
}

// Never called
// function getItemPositionSizeType(item) {
// 	return {type: item.type, id: item.id, left: item.left, top: item.top,
// 			width: item.width, height: item.height, aspect: item.aspect};
// }

function getAppPositionSize(appInstance) {
	return {
		id:          appInstance.id,
		application: appInstance.application,
		left:        appInstance.left,
		top:         appInstance.top,
		width:       appInstance.width,
		height:      appInstance.height,
		icon:        appInstance.icon || null,
		title:       appInstance.title,
		color:       appInstance.color || null
	};
}

// **************  Pointer Functions *****************

function createSagePointer ( uniqueID ) {
	// From addClient type == sageUI
	sagePointers[uniqueID]      = new Sagepointer(uniqueID+"_pointer");
	remoteInteraction[uniqueID] = new Interaction(config);

	broadcast('createSagePointer', sagePointers[uniqueID], 'receivesPointerData');
}

function showPointer( uniqueID, data ) {
	if( sagePointers[uniqueID] === undefined )
		return;
	// From startSagePointer
	console.log("starting pointer: " + uniqueID);

	if( data.sourceType === undefined )
		data.sourceType = "Pointer";

	sagePointers[uniqueID].start(data.label, data.color, data.sourceType);
	broadcast('showSagePointer', sagePointers[uniqueID], 'receivesPointerData');
}

function hidePointer( uniqueID ) {
	if( sagePointers[uniqueID] === undefined )
		return;

	// From stopSagePointer
	sagePointers[uniqueID].stop();
	if (remoteInteraction[uniqueID].hoverOverControl() !== null){
		broadcast('hideWidgetToAppConnector', remoteInteraction[uniqueID].hoverOverControl(), 'receivesPointerData');
		remoteInteraction[uniqueID].leaveControlArea();
	}
	broadcast('hideSagePointer', sagePointers[uniqueID], 'receivesPointerData');
}

// Copied from pointerPress. Eventually a touch gesture will use this to toggle modes
function togglePointerMode(uniqueID) {
	if( sagePointers[uniqueID] === undefined )
		return;

	remoteInteraction[uniqueID].toggleModes();
	broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode }, 'receivesPointerData' );

	/*
	if(remoteInteraction[uniqueID].interactionMode === 0)
		addEventToUserLog(uniqueID, {type: "SAGE2PointerMode", data: {mode: "windowManagement"}, time: Date.now()});
	else
		addEventToUserLog(uniqueID, {type: "SAGE2PointerMode", data: {mode: "applicationInteraction"}, time: Date.now()});
	*/
}


function pointerPress( uniqueID, pointerX, pointerY, data ) {
	if ( sagePointers[uniqueID] === undefined ) return;
	var app;
	var elem = findAppUnderPointer(pointerX, pointerY);

	// widgets
	var ct = findControlsUnderPointer(pointerX, pointerY);
	var itemUnderPointer = ct || elem;

	//Draw widget connectors
	showOrHideWidgetConnectors(uniqueID, itemUnderPointer, "press");
	if (ct !== null) {
		if (data.button === "left") {
			remoteInteraction[uniqueID].selectMoveControl(ct, pointerX, pointerY);
			broadcast('requestControlId', {addr:uniqueID, ptrId:sagePointers[uniqueID].id, x:pointerX, y:pointerY}, 'receivesWidgetEvents');
		}
		else if(data.button === "right"){
			if(ct.show === true) {
				hideControl(ct);
				app = findAppById(ct.appId);

				if(app !== null) {

					addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "close", application: {id: app.id, type: app.application}}, time: Date.now()});
				}
			}
		}
		return;
	} else {
		var lockedControl = remoteInteraction[uniqueID].lockedControl(); //If a text input widget was locked, drop it
		if (lockedControl !== null) {
			var msgdata = {ctrlId:lockedControl.ctrlId, appId:lockedControl.appId};
			broadcast('dropTextInputControl', msgdata, 'receivesWidgetEvents');
			remoteInteraction[uniqueID].dropControl();
		}
	}

	// Middle click switches interaction mode too
	if (data.button === "middle") {
		togglePointerMode(uniqueID);
		return;
	}

	// Radial Menu
	if( radialMenuEvent( { type: "pointerPress", id: uniqueID, x: pointerX, y: pointerY, data: data }  ) === true ) {
		return; // Radial menu is using the event
	}

	if(data.button === "right") {
		createRadialMenu( uniqueID, pointerX, pointerY );

		addEventToUserLog(uniqueID, {type: "radialMenu", data: {action: "open"}, time: Date.now()});
	}
	
	var dialogX;
	var dialogY;
	// Remote Sharing Request Dialog
	if(remoteSharingRequestDialog !== null) {
		dialogX = pointerX - (config.totalWidth/2 - 13*config.ui.titleBarHeight);
		dialogY = pointerY - (2*config.ui.titleBarHeight);
		if(dialogX >= 0 && dialogX <= 26*config.ui.titleBarHeight && dialogY >= 0 && dialogY <= 8*config.ui.titleBarHeight) {
			// accept button
			if(dialogX >= 0.25*config.ui.titleBarHeight && dialogX <= 9.25*config.ui.titleBarHeight && dialogY >= 4.75*config.ui.titleBarHeight && dialogY <= 7.75*config.ui.titleBarHeight) {
				console.log("Accepting Data-Sharing Request");
				broadcast('closeRequestDataSharingDialog', null, 'requiresFullApps');
				var sharingMin = Math.min(remoteSharingRequestDialog.config.totalWidth, remoteSharingRequestDialog.config.totalHeight-remoteSharingRequestDialog.config.ui.titleBarHeight);
				var myMin = Math.min(config.totalWidth, config.totalHeight-config.ui.titleBarHeight);
				var sharingSize = parseInt(0.45 * (sharingMin + myMin), 10);
				var sharingScale = (0.9*myMin) / sharingSize;
				remoteSharingRequestDialog.wsio.emit('acceptDataSharingSession', {width: sharingSize, height: sharingSize});
				var dataSession = {
					name: remoteSharingRequestDialog.config.name,
					host: remoteSharingRequestDialog.config.host,
					port: remoteSharingRequestDialog.config.port,
					left: config.ui.titleBarHeight,
					top: 1.5*config.ui.titleBarHeight,
					width: sharingSize,
					height: sharingSize,
					scale: sharingScale
				};
				broadcast('initializeDataSharingSession', dataSession, 'requiresFullApps');
				remoteSharingSessions.push(dataSession);
				remoteSharingRequestDialog = null;
			}
			// reject button
			else if(dialogX >= 16.75*config.ui.titleBarHeight && dialogX <= 25.75*config.ui.titleBarHeight && dialogY >= 4.75*config.ui.titleBarHeight && dialogY <= 7.75*config.ui.titleBarHeight) {
				console.log("Rejecting Data-Sharing Request");
				broadcast('closeRequestDataSharingDialog', null, 'requiresFullApps');
				// TODO: send message back to remote server - Reject
				remoteSharingRequestDialog.wsio.emit('rejectDataSharingSession', null);
				remoteSharingRequestDialog = null;
			}
			return;
		}
	}
	
	// Remote Sharing Wait Dialog
	if(remoteSharingWaitDialog !== null) {
		dialogX = pointerX - (config.totalWidth/2 - 13*config.ui.titleBarHeight);
		dialogY = pointerY - (2*config.ui.titleBarHeight);
		if(dialogX >= 0 && dialogX <= 26*config.ui.titleBarHeight && dialogY >= 0 && dialogY <= 8*config.ui.titleBarHeight) {
			// cancel button
			if(dialogX >= 16.75*config.ui.titleBarHeight && dialogX <= 25.75*config.ui.titleBarHeight && dialogY >= 4.75*config.ui.titleBarHeight && dialogY <= 7.75*config.ui.titleBarHeight) {
				console.log("Canceling Data-Sharing Request");
				broadcast('closeDataSharingWaitDialog', null, 'requiresFullApps');
				remoteSharingWaitDialog.wsio.emit('cancelDataSharingSession', null);
				remoteSharingWaitDialog = null;
			}
			return;
		}
	}

	// apps
	var elemCtrl;
	if(elem === null) {
		var remoteIdx = -1;
		for(var i=0; i<remoteSites.length; i++){
			if(sagePointers[uniqueID].left >= remoteSites[i].pos && sagePointers[uniqueID].left <= remoteSites[i].pos+remoteSites[i].width &&
				sagePointers[uniqueID].top >= 2 && sagePointers[uniqueID].top <= remoteSites[i].height) {
				remoteIdx = i;
				break;
			}
		}
		if(remoteIdx >= 0) {
			if(remoteSites[remoteIdx].connected) {
				console.log("Requesting data-sharing session with " + remoteSites[remoteIdx].name);
				
				remoteSharingWaitDialog = remoteSites[remoteIdx];
				broadcast('dataSharingConnectionWait', {name: remoteSites[remoteIdx].name, host: remoteSites[remoteIdx].wsio.remoteAddress.address, port: remoteSites[remoteIdx].wsio.remoteAddress.port}, 'requiresFullApps');
				remoteSites[remoteIdx].wsio.emit('requestDataSharingSession', {config: config, secure: false});
			}
			else {
				console.log("Remote site " + remoteSites[remoteIdx].name + " is not currently connected");
			}
		}
	}
	else {
		if( remoteInteraction[uniqueID].windowManagementMode() ){
			if (data.button === "left") {
				var localX = pointerX - elem.left;
				var localY = pointerY - (elem.top+config.ui.titleBarHeight);
				var cornerSize = Math.min(elem.width, elem.height) / 5;

				// if localY in negative, inside titlebar
				if (localY < 0) {
					// titlebar image: 807x138  (10 pixels front paddding)
					var buttonsWidth = config.ui.titleBarHeight * (324.0/111.0);
					var buttonsPad   = config.ui.titleBarHeight * ( 10.0/111.0);
					var oneButton    = buttonsWidth / 2; // two buttons
					var startButtons = elem.width - buttonsWidth;
					if (localX > (startButtons+buttonsPad+oneButton)) {
						addEventToUserLog(uniqueID, {type: "delete", data: {application: {id: elem.id, type: elem.application}}, time: Date.now()});

						// last button: close app
						deleteApplication(elem);

						// need to quit the function and stop processing
						return;
					} else if (localX > (startButtons+buttonsPad)) {
						if (elem.resizeMode !== undefined && elem.resizeMode === "free")
							// full wall resize
							pointerFullZone(uniqueID, pointerX, pointerY);
						else
							// proportional resize
							pointerDblClick(uniqueID, pointerX, pointerY);
					}
				}

				// bottom right corner - select for drag resize
				if(localX >= elem.width-cornerSize && localY >= elem.height-cornerSize){
					remoteInteraction[uniqueID].selectResizeItem(elem, pointerX, pointerY);
					broadcast('startResize', {id: elem.id, date: new Date()}, 'requiresFullApps');

					addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "start", application: {id: elem.id, type: elem.application}, location: {x: parseInt(elem.left, 10), y: parseInt(elem.top, 10), width: parseInt(elem.width, 10), height: parseInt(elem.height, 10)}}, time: Date.now()});
				}
				// otherwise - select for move
				else{
					remoteInteraction[uniqueID].selectMoveItem(elem, pointerX, pointerY); //will only go through if window management mode
					broadcast('startMove', {id: elem.id, date: new Date()}, 'requiresFullApps');

					addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "start", application: {id: elem.id, type: elem.application}, location: {x: parseInt(elem.left, 10), y: parseInt(elem.top, 10), width: parseInt(elem.width, 10), height: parseInt(elem.height, 10)}}, time: Date.now()});
				}
			}
			else if(data.button === "right"){
				elemCtrl = findControlById(elem.id+uniqueID+"_controls");
				if (elemCtrl === null) {
					broadcast('requestNewControl', {elemId: elem.id, user_id: uniqueID, user_label: sagePointers[uniqueID]? sagePointers[uniqueID].label : "", x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
				}
				else if (elemCtrl.show === false) {

					showControl(elemCtrl, uniqueID, pointerX, pointerY);

					app = findAppById(elemCtrl.appId);

					if(app !== null) {
						addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "open", application: {id: app.id, type: app.application}}, time: Date.now()});
					}

				}
				else {
					moveControlToPointer(elemCtrl, uniqueID, pointerX, pointerY);
				}
			}
		}
		if ( remoteInteraction[uniqueID].appInteractionMode() || elem.application === 'thumbnailBrowser' ) {
			if (pointerY >=elem.top && pointerY <= elem.top+config.ui.titleBarHeight){
				if(data.button === "right"){
					elemCtrl = findControlById(elem.id+uniqueID+"_controls");
					if (elemCtrl === null) {
						broadcast('requestNewControl', {elemId: elem.id, user_id: uniqueID, user_label: sagePointers[uniqueID]? sagePointers[uniqueID].label : "", x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
					}
					else if (elemCtrl.show === false) {
						showControl(elemCtrl, uniqueID, pointerX, pointerY);

						app = findAppById(elemCtrl.appId);

						if(app !== null) {
							addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "open", application: {id: app.id, type: app.application}}, time: Date.now()});
						}
					}
					else {
						moveControlToPointer(elemCtrl, uniqueID, pointerX, pointerY);
					}
				}
			}
			else{
				var elemX = pointerX - elem.left;
				var elemY = pointerY - elem.top - config.ui.titleBarHeight;

				var ePosition = {x: elemX, y: elemY};
				var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
				var now = new Date();

				var event = {id: elem.id, type: "pointerPress", position: ePosition, user: eUser, data: data, date: now};

				broadcast('eventInItem', event, 'receivesInputEvents');

				addEventToUserLog(uniqueID, {type: "applicationInteraction", data: {type: "pointerPress", application: {id: elem.id, type: elem.application}, position: {x: parseInt(ePosition.x, 10), y: parseInt(ePosition.y, 10)}}, time: Date.now()});
			}
		}
		var stickyList = stickyAppHandler.getStickingItems(elem.id);
		var newOrder = moveAppToFront(elem.id);
		for (var idx in stickyList){
			newOrder = moveAppToFront(stickyList[idx].id);
		}
		broadcast('updateItemOrder', {idList: newOrder}, 'receivesWindowModification');
	}

}
/*
function pointerPressRight( address, pointerX, pointerY ) {
	if ( sagePointers[address] === undefined ) return;

	var elem = findAppUnderPointer(pointerX, pointerY);
	var ctrl = findControlsUnderPointer(pointerX, pointerY);
	var now  = new Date();
	if (ctrl !== null && ctrl.show === true) {
		hideControl(ctrl);
	}
	else if (elem !== null) {
		var elemCtrl = findControlById(elem.id);
		if ( remoteInteraction[address].windowManagementMode() ) {
			if (elemCtrl === null) {
				broadcast('requestNewControl', {elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
			}
			else if (elemCtrl.show === false) {
				showControl(elemCtrl, pointerX, pointerY) ;
			}
			else {
				moveControlToPointer(elemCtrl, pointerX, pointerY) ;
			}
		}
		else if ( remoteInteraction[address].appInteractionMode() ) {

			if (pointerY >=elem.top && pointerY <= elem.top+config.ui.titleBarHeight){
				if (elemCtrl === null) {
					broadcast('requestNewControl', {elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
				}
				else if (elemCtrl.show === false) {
					showControl(elemCtrl, pointerX, pointerY) ;
				}
				else {
					moveControlToPointer(elemCtrl, pointerX, pointerY) ;
				}
			}
			else{
				var itemRelX = pointerX - elem.left;
				var itemRelY = pointerY - elem.top - config.ui.titleBarHeight;
				broadcast( 'eventInItem', { eventType: "pointerPress", elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, itemRelativeX: itemRelX, itemRelativeY: itemRelY, data: {button: "right", user_color: sagePointers[address].color}, date: now }, 'receivesPointerData');
			}
		}

		var newOrder = moveAppToFront(elem.id);
		broadcast('updateItemOrder', {idList: newOrder}, 'receivesWindowModification');
	}
	else{
		broadcast('requestNewControl', {elemId: null, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
	}

}
*/
/*
function pointerReleaseRight( address, pointerX, pointerY ) {
	if( sagePointers[address] === undefined ) return;

	var now = new Date();
	var elem = findAppUnderPointer(pointerX, pointerY);

	if (elem !== null) {
		if( remoteInteraction[address].windowManagementMode() ){
			broadcast('pointerReleaseRight', {elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
		}
		else if ( remoteInteraction[address].appInteractionMode() ) {
			if (pointerY >=elem.top && pointerY <= elem.top+config.ui.titleBarHeight){
				broadcast('pointerReleaseRight', {elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
			}
			else{
				var itemRelX = pointerX - elem.left;
				var itemRelY = pointerY - elem.top - config.ui.titleBarHeight;
				broadcast( 'eventInItem', { eventType: "pointerRelease", elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, itemRelativeX: itemRelX, itemRelativeY: itemRelY, data: {button: "right", user_color: sagePointers[address].color}, date: now }, 'receivesPointerData');
			}
		}
	}
	else {
		broadcast('pointerReleaseRight', {elemId: null, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
	}

}
*/

function pointerRelease(uniqueID, pointerX, pointerY, data) {
	if( sagePointers[uniqueID] === undefined )
		return;

	// Attempting to complete a click action on a button or a drag on a slider
	broadcast('releaseControlId', {addr:uniqueID, ptrId:sagePointers[uniqueID].id, x:pointerX, y:pointerY}, 'receivesWidgetEvents');
	remoteInteraction[uniqueID].releaseControl();

	// Radial Menu
	if( radialMenuEvent( { type: "pointerRelease", id: uniqueID, x: pointerX, y: pointerY, data: data }  ) === true )
		return; // Radial menu is using the event

	var app;
	var elem = findAppUnderPointer(pointerX, pointerY);

	var controlUnderPointer = findControlsUnderPointer(pointerX, pointerY);
	var itemUnderPointer = controlUnderPointer || elem;
	//Draw widget connectors
	showOrHideWidgetConnectors(uniqueID, itemUnderPointer, "release");

	if( remoteInteraction[uniqueID].windowManagementMode() ){
		if(data.button === "left"){
			if(remoteInteraction[uniqueID].selectedResizeItem !== null){
				app = findAppById(remoteInteraction[uniqueID].selectedResizeItem.id);
				if(app !== null) {
					broadcast('finishedResize', {id: remoteInteraction[uniqueID].selectedResizeItem.id, date: new Date()}, 'requiresFullApps');

					addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "end", application: {id: app.id, type: app.application}, location: {x: parseInt(app.left, 10), y: parseInt(app.top, 10), width: parseInt(app.width, 10), height: parseInt(app.height, 10)}}, time: Date.now()});

					if(videoHandles[app.id] !== undefined && videoHandles[app.id].newFrameGenerated === false)
						handleNewVideoFrame(app.id);
					remoteInteraction[uniqueID].releaseItem(true);
				}
			}
			if(remoteInteraction[uniqueID].selectedMoveItem !== null){
				app = findAppById(remoteInteraction[uniqueID].selectedMoveItem.id);
				if(app !== null) {
					broadcast('finishedMove', {id: remoteInteraction[uniqueID].selectedMoveItem.id, date: new Date()}, 'requiresFullApps');

					addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "end", application: {id: app.id, type: app.application}, location: {x: parseInt(app.left, 10), y: parseInt(app.top, 10), width: parseInt(app.width, 10), height: parseInt(app.height, 10)}}, time: Date.now()});

					if(videoHandles[app.id] !== undefined && videoHandles[app.id].newFrameGenerated === false)
						handleNewVideoFrame(app.id);
					remoteInteraction[uniqueID].releaseItem(true);
					
					
					// Disabled for data-duplication only
					/*
					var remoteIdx = -1;
					for(var i=0; i<remoteSites.length; i++){
						if(sagePointers[uniqueID].left >= remoteSites[i].pos && sagePointers[uniqueID].left <= remoteSites[i].pos+remoteSites[i].width &&
							sagePointers[uniqueID].top >= 2 && sagePointers[uniqueID].top <= remoteSites[i].height) {
							remoteIdx = i;
							break;
						}
					}
					if(remoteIdx < 0){
						broadcast('finishedMove', {id: remoteInteraction[uniqueID].selectedMoveItem.id, date: new Date()}, 'requiresFullApps');

						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "end", application: {id: app.id, type: app.application}, location: {x: parseInt(app.left, 10), y: parseInt(app.top, 10), width: parseInt(app.width, 10), height: parseInt(app.height, 10)}}, time: Date.now()});

						if(videoHandles[app.id] !== undefined && videoHandles[app.id].newFrameGenerated === false)
							handleNewVideoFrame(app.id);
						remoteInteraction[uniqueID].releaseItem(true);
					}
					else{
						remoteSites[remoteIdx].wsio.emit('addNewElementFromRemoteServer', app);

						addEventToUserLog(uniqueID, {type: "shareApplication", data: {host: remoteSites[remoteIdx].wsio.remoteAddress.address, port: remoteSites[remoteIdx].wsio.remoteAddress.port, application: {id: app.id, type: app.application}}, time: Date.now()});

						var updatedItem = remoteInteraction[uniqueID].releaseItem(false);
						if(updatedItem !== null) {
							updatedItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
							broadcast('setItemPosition', updatedItem, 'receivesWindowModification');
							broadcast('finishedMove', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');

							addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "end", application: {id: elem.id, type: elem.application}, location: {x: parseInt(elem.left, 10), y: parseInt(elem.top, 10), width: parseInt(elem.width, 10), height: parseInt(elem.height, 10)}}, time: Date.now()});

							if(videoHandles[app.id] !== undefined && videoHandles[app.id].newFrameGenerated === false)
								handleNewVideoFrame(app.id);
						}
					}
					*/
				}
			}
		}
		/*else if(data.button === "right"){
			if( elem !== null ){
				// index.hmtl has no 'pointerReleaseRight' message.
				// I renamed 'pointerPressRight' to 'requestNewControl'
				// since this function could come from any device (not just a right mouse click)
				broadcast('pointerReleaseRight', {elemId: elem.id, user_id: sagePointers[uniqueID].id, user_label: sagePointers[uniqueID].label, x: pointerX, y: pointerY, date: new Date() }, 'receivesPointerData');
			}
		}*/
	}
	if ( remoteInteraction[uniqueID].appInteractionMode() || (elem !== null && elem.application === 'thumbnailBrowser') ) {
		if( elem !== null ){
			var elemX = pointerX - elem.left;
			var elemY = pointerY - elem.top - config.ui.titleBarHeight;

			var ePosition = {x: elemX, y: elemY};
			var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
			var now = new Date();

			var event = {id: elem.id, type: "pointerRelease", position: ePosition, user: eUser, data: data, date: now};

			broadcast('eventInItem', event, 'receivesInputEvents');

			addEventToUserLog(uniqueID, {type: "applicationInteraction", data: {type: "pointerRelease", application: {id: elem.id, type: elem.application}, position: {x: parseInt(ePosition.x, 10), y: parseInt(ePosition.y, 10)}}, time: Date.now()});
		}
	}

}

function pointerMove(uniqueID, pointerX, pointerY, data) {
	if( sagePointers[uniqueID] === undefined )
		return;

	sagePointers[uniqueID].left += data.dx;
	sagePointers[uniqueID].top  += data.dy;
	if(sagePointers[uniqueID].left < 0)                 sagePointers[uniqueID].left = 0;
	if(sagePointers[uniqueID].left > config.totalWidth) sagePointers[uniqueID].left = config.totalWidth;
	if(sagePointers[uniqueID].top < 0)                  sagePointers[uniqueID].top = 0;
	if(sagePointers[uniqueID].top > config.totalHeight) sagePointers[uniqueID].top = config.totalHeight;

	//broadcast('updateSagePointerPosition', sagePointers[uniqueID], 'receivesPointerData');
	broadcast_opt('upp', sagePointers[uniqueID], 'receivesPointerData');

	// Radial Menu
	if( radialMenuEvent( { type: "pointerMove", id: uniqueID, x: pointerX, y: pointerY, data: data }  ) === true )
		return; // Radial menu is using the event


	var app;

	// widgets
	var updatedControl = remoteInteraction[uniqueID].moveSelectedControl(pointerX, pointerY);

	if (updatedControl !== null) {
		app = findAppById(updatedControl.appId);
		if (app){
			updatedControl.appData = getAppPositionSize(app);
			updatedControl.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
			broadcast('setControlPosition', updatedControl, 'receivesPointerData');
			return;
		}
	}
	var lockedControl = remoteInteraction[uniqueID].lockedControl();
	if (lockedControl && /slider/.test(lockedControl.ctrlId)){
		broadcast('moveSliderKnob', {ctrl:lockedControl, x:pointerX}, 'receivesPointerData');
		return;
	}

	var elem = null;
	var controlUnderPointer = findControlsUnderPointer(pointerX, pointerY);
	if (controlUnderPointer===null){
		elem = findAppUnderPointer(pointerX, pointerY);
	}

	var itemUnderPointer = controlUnderPointer || elem;
	//Draw widget connectors
	showOrHideWidgetConnectors(uniqueID, itemUnderPointer, "move");
	// Widget connector show logic ends

	// move / resize window
	if (remoteInteraction[uniqueID].windowManagementMode()) {
		var updatedApp;
		var updatedMoveItem = remoteInteraction[uniqueID].moveSelectedItem(pointerX, pointerY);
		var updatedResizeItem = remoteInteraction[uniqueID].resizeSelectedItem(pointerX, pointerY);

		if (updatedMoveItem !== null) {
			updatedApp = findAppById(updatedMoveItem.elemId);
			//Attach the app to the background app if it is sticky

			var backgroundItem = findAppUnderPointer(updatedMoveItem.elemLeft-1, updatedMoveItem.elemTop-1);
			attachAppIfSticky(backgroundItem, updatedMoveItem.elemId);
			updatedMoveItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;

			broadcast('setItemPosition', updatedMoveItem, 'receivesWindowModification');
			if(updatedApp !== null && updatedApp.application === "movie_player") calculateValidBlocks(updatedApp, 128, videoHandles);
            if(updatedApp !== null && updatedApp.application === "media_block_stream") calculateValidBlocks(updatedApp, 128, mediaBlockStreams);

			var updatedStickyItems = stickyAppHandler.moveItemsStickingToUpdatedItem(updatedMoveItem, pointerX, pointerY);

			for (var idx=0; idx<updatedStickyItems.length; idx++) {
				updatedStickyItems[idx].user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
				broadcast('setItemPosition', updatedStickyItems[idx], 'receivesWindowModification');
			}
		}
		else if(updatedResizeItem !== null){
			updatedResizeItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
			broadcast('setItemPositionAndSize', updatedResizeItem, 'receivesWindowModification');
			updatedApp = findAppById(updatedResizeItem.elemId);
			if (updatedApp !== null && updatedApp.application === "movie_player") calculateValidBlocks(updatedApp, 128, videoHandles);
            if (updatedApp !== null && updatedApp.application === "media_block_stream") calculateValidBlocks(updatedApp, 128, mediaBlockStreams);
        }
		// update hover corner (for resize)
		else {
			if (elem !== null) {
				var localX = pointerX - elem.left;
				var localY = pointerY - (elem.top+config.ui.titleBarHeight);
				var cornerSize = Math.min(elem.width, elem.height) / 5;
				// bottom right corner - select for drag resize
				if (localX >= elem.width-cornerSize && localY >= elem.height-cornerSize) {
					if(remoteInteraction[uniqueID].hoverCornerItem !== null){
						broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false}, 'requiresFullApps');
					}
					remoteInteraction[uniqueID].setHoverCornerItem(elem);
					broadcast('hoverOverItemCorner', {elemId: elem.id, flag: true}, 'requiresFullApps');
				}
				else if(remoteInteraction[uniqueID].hoverCornerItem !== null){
					broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false}, 'requiresFullApps');
					remoteInteraction[uniqueID].setHoverCornerItem(null);
				}
			}
			else if(remoteInteraction[uniqueID].hoverCornerItem !== null){
				broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false}, 'requiresFullApps');
				remoteInteraction[uniqueID].setHoverCornerItem(null);
			}
		}
	}
	//
	if(remoteInteraction[uniqueID].appInteractionMode() || (elem !== null && elem.application === 'thumbnailBrowser') ) {
		if(elem !== null){
			var elemX = pointerX - elem.left;
			var elemY = pointerY - elem.top - config.ui.titleBarHeight;

			var ePosition = {x: elemX, y: elemY};
			var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
			var eData = {};
			var now = new Date();

			var event = {id: elem.id, type: "pointerMove", position: ePosition, user: eUser, data: eData, date: now};

			broadcast('eventInItem', event, 'receivesInputEvents');
		}
	}
}

function pointerPosition( uniqueID, data ) {
	if( sagePointers[uniqueID] === undefined )
		return;

	sagePointers[uniqueID].left = data.pointerX;
	sagePointers[uniqueID].top  = data.pointerY;
	if(sagePointers[uniqueID].left < 0) sagePointers[uniqueID].left = 0;
	if(sagePointers[uniqueID].left > config.totalWidth) sagePointers[uniqueID].left = config.totalWidth;
	if(sagePointers[uniqueID].top  < 0) sagePointers[uniqueID].top = 0;
	if(sagePointers[uniqueID].top  > config.totalHeight) sagePointers[uniqueID].top = config.totalHeight;

	//broadcast('updateSagePointerPosition', sagePointers[uniqueID], 'receivesPointerData');
	broadcast('upp', sagePointers[uniqueID], 'receivesPointerData');
	var updatedItem = remoteInteraction[uniqueID].moveSelectedItem(sagePointers[uniqueID].left, sagePointers[uniqueID].top);
	if(updatedItem !== null){
		var updatedApp = findAppById(updatedItem.elemId);

		var backgroundItem = findAppUnderPointer(updatedItem.elemLeft-1, updatedItem.elemTop-1);
		attachAppIfSticky(backgroundItem, updatedItem.elemId);
		updatedItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;

		broadcast('setItemPosition', updatedItem, 'receivesWindowModification');
		if(updatedApp !== null && updatedApp.application === "movie_player") calculateValidBlocks(updatedApp, 128, videoHandles);
		if(updatedApp !== null && updatedApp.application === "media_block_stream") calculateValidBlocks(updatedApp, 128, mediaBlockStreams);
        var updatedStickyItems = stickyAppHandler.moveItemsStickingToUpdatedItem(updatedItem, sagePointers[uniqueID].left, sagePointers[uniqueID].top);
		for (var idx=0; idx<updatedStickyItems.length; idx++) {
			updatedStickyItems[idx].user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
			broadcast('setItemPosition', updatedStickyItems[idx], 'receivesWindowModification');
		}
	}
	//if(updatedItem !== null) broadcast('setItemPosition', updatedItem, 'receivesWindowModification');
}

function pointerScrollStart( uniqueID, pointerX, pointerY ) {
	if( sagePointers[uniqueID] === undefined )
		return;
	var control = findControlsUnderPointer(pointerX, pointerY);
	if (control!==null)
		return;
	// Radial Menu
	if( isEventOnMenu( { type: "pointerSingleEvent", id: uniqueID, x: pointerX, y: pointerY }  ) === true )
		return; // Radial menu is using the event

	if( remoteInteraction[uniqueID].windowManagementMode() ) {
		var elem = findAppUnderPointer(pointerX, pointerY);

		if (elem !== null && remoteInteraction[uniqueID].selectTimeId[elem.id] === undefined) {
			remoteInteraction[uniqueID].selectScrollItem(elem);
			//Retain the order to items sticking on this element
			var stickyList = stickyAppHandler.getStickingItems(elem.id);
			var newOrder = moveAppToFront(elem.id);
			for (var idx in stickyList){
				newOrder = moveAppToFront(stickyList[idx].id);
			}
			broadcast('updateItemOrder', {idList: newOrder}, 'receivesWindowModification');

			broadcast('startMove', {id: elem.id, date: new Date()}, 'requiresFullApps');
			broadcast('startResize', {id: elem.id, date: new Date()}, 'requiresFullApps');

			addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "start", application: {id: elem.id, type: elem.application}, location: {x: parseInt(elem.left, 10), y: parseInt(elem.top, 10), width: parseInt(elem.width, 10), height: parseInt(elem.height, 10)}}, time: Date.now()});
			addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "start", application: {id: elem.id, type: elem.application}, location: {x: parseInt(elem.left, 10), y: parseInt(elem.top, 10), width: parseInt(elem.width, 10), height: parseInt(elem.height, 10)}}, time: Date.now()});
		}
	}
}

function pointerScroll( uniqueID, data ) {
	if( sagePointers[uniqueID] === undefined )
		return;

	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	var control = findControlsUnderPointer(pointerX, pointerY);
	if (control!==null)
		return;

	// Radial Menu
	if( isEventOnMenu( { type: "pointerSingleEvent", id: uniqueID, x: pointerX, y: pointerY, data: data }  ) === true )
		return; // Radial menu is using the event

	if( remoteInteraction[uniqueID].windowManagementMode() ){
		var scale = 1.0 + Math.abs(data.wheelDelta)/512;
		if(data.wheelDelta > 0) scale = 1.0 / scale;

		var updatedItem = remoteInteraction[uniqueID].scrollSelectedItem(scale);
		if(updatedItem !== null){
			var updatedApp = findAppById(updatedItem.elemId);
			if(updatedApp !== null) {
				updatedItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
				broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
				if(updatedApp !== null && updatedApp.application === "movie_player") calculateValidBlocks(updatedApp, 128, videoHandles);
				if(updatedApp !== null && updatedApp.application === "media_block_stream") calculateValidBlocks(updatedApp, 128, mediaBlockStreams);

				if(remoteInteraction[uniqueID].selectTimeId[updatedApp.id] !== undefined){
					clearTimeout(remoteInteraction[uniqueID].selectTimeId[updatedApp.id]);
				}

				remoteInteraction[uniqueID].selectTimeId[updatedApp.id] = setTimeout(function() {
					broadcast('finishedMove', {id: updatedApp.id, date: new Date()}, 'requiresFullApps');
					broadcast('finishedResize', {id: updatedApp.id, date: new Date()}, 'requiresFullApps');

					addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "end", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});
					addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "end", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});

					if(videoHandles[updatedApp.id] !== undefined && videoHandles[updatedApp.id].newFrameGenerated === false)
						handleNewVideoFrame(updatedApp.id);
					remoteInteraction[uniqueID].selectedScrollItem = null;
					delete remoteInteraction[uniqueID].selectTimeId[updatedApp.id];
				}, 500);
			}
		}
	}
	else if ( remoteInteraction[uniqueID].appInteractionMode() ) {

		var elem = findAppUnderPointer(pointerX, pointerY);

		if( elem !== null ){
			var elemX = pointerX - elem.left;
			var elemY = pointerY - elem.top - config.ui.titleBarHeight;

			var ePosition = {x: elemX, y: elemY};
			var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
			var now = new Date();

			var event = {id: elem.id, type: "pointerScroll", position: ePosition, user: eUser, data: data, date: now};

			broadcast('eventInItem', event, 'receivesInputEvents');

			if( remoteInteraction[uniqueID].selectTimeId[elem.id] !== undefined) {
				clearTimeout(remoteInteraction[uniqueID].selectTimeId[elem.id]);
				remoteInteraction[uniqueID].selectWheelDelta += data.wheelDelta;
			}
			else {
				remoteInteraction[uniqueID].selectWheelDelta = data.wheelDelta;
			}

			remoteInteraction[uniqueID].selectTimeId[elem.id] = setTimeout(function() {

				addEventToUserLog(uniqueID, {type: "applicationInteraction", data: {type: "pointerScroll", application: {id: elem.id, type: elem.application}, wheelDelta: remoteInteraction[uniqueID].selectWheelDelta}, time: Date.now()});

				delete remoteInteraction[uniqueID].selectTimeId[elem.id];
				delete remoteInteraction[uniqueID].selectWheelDelta;
			}, 500);
		}
	}
}

function pointerDraw(uniqueID, data) {
	if( sagePointers[uniqueID] === undefined )
		return;

	var ePos  = {x: 0, y: 0};
	var eUser = {id: sagePointers[uniqueID].id, label: 'drawing', color: [220, 10, 10]};
	var now   = new Date();

	for (var i=0; i<applications.length; i++) {
		var a = applications[i];
		// Send the drawing events only to whiteboard apps
		if (a.application === 'whiteboard') {
			var event = {id: a.id, type: "pointerDraw", position: ePos, user: eUser, data: data, date: now};
			broadcast('eventInItem', event, 'receivesInputEvents');
		}
	}
}

function pointerDblClick(uniqueID, pointerX, pointerY) {
	if( sagePointers[uniqueID] === undefined )
		return;

	var control = findControlsUnderPointer(pointerX, pointerY);
	if (control!==null){
		return;
	}

	// Radial Menu
	if( isEventOnMenu( { type: "pointerSingleEvent", id: uniqueID, x: pointerX, y: pointerY }  ) === true )
		return; // Radial menu is using the event

	var elem = findAppUnderPointer(pointerX, pointerY);
	if (elem !== null) {
		if( elem.application === 'thumbnailBrowser' )
			return;

		if( remoteInteraction[uniqueID].windowManagementMode() ){
			var updatedItem;
			var updatedApp;

			if (elem.maximized !== true) {
				// need to maximize the item
				updatedItem = remoteInteraction[uniqueID].maximizeSelectedItem(elem);
				if (updatedItem !== null) {
					updatedApp = findAppById(updatedItem.elemId);
					if(updatedApp !== null) {
						broadcast('startMove', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');
						broadcast('startResize', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');

						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "start", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});
						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "start", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});

						updatedItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
						broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
						// the PDF files need an extra redraw
						broadcast('finishedMove', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');
						broadcast('finishedResize', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');

						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "end", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});
						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "end", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});

						if(updatedApp !== null && updatedApp.application === "movie_player") calculateValidBlocks(updatedApp, 128, videoHandles);
						if(updatedApp !== null && updatedApp.application === "media_block_stream") calculateValidBlocks(updatedApp, 128, mediaBlockStreams);
						if(videoHandles[updatedItem.elemId] !== undefined && videoHandles[updatedItem.elemId].newFrameGenerated === false)
							handleNewVideoFrame(updatedItem.elemId);
					}
				}
			} else {
				// already maximized, need to restore the item size
				updatedItem = remoteInteraction[uniqueID].restoreSelectedItem(elem);
				if (updatedItem !== null) {
					updatedApp = findAppById(updatedItem.elemId);
					if(updatedApp !== null) {
						broadcast('startMove', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');
						broadcast('startResize', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');

						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "start", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});
						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "start", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});

						updatedItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
						broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
						// the PDF files need an extra redraw
						broadcast('finishedMove', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');
						broadcast('finishedResize', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');

						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "end", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});
						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "end", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});

						if(updatedApp !== null && updatedApp.application === "movie_player") calculateValidBlocks(updatedApp, 128, videoHandles);
						if(updatedApp !== null && updatedApp.application === "media_block_stream") calculateValidBlocks(updatedApp, 128, mediaBlockStreams);
						if(videoHandles[updatedItem.elemId] !== undefined && videoHandles[updatedItem.elemId].newFrameGenerated === false)
							handleNewVideoFrame(updatedItem.elemId);
					}
				}
			}
		}
	}
}

// Fullscreen to wall ratio
function pointerFullZone(uniqueID, pointerX, pointerY) {
	if( sagePointers[uniqueID] === undefined )
		return;

	var elem = findAppUnderPointer(pointerX, pointerY);
	if (elem !== null) {
		if( remoteInteraction[uniqueID].windowManagementMode() ){
			var updatedItem;
			var updatedApp;

			if (elem.maximized !== true) {
				// need to maximize the item
				updatedItem = remoteInteraction[uniqueID].maximizeFullSelectedItem(elem);
				if (updatedItem !== null) {
					updatedApp = findAppById(updatedItem.elemId);
					if(updatedApp !== null) {
						broadcast('startMove', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');
						broadcast('startResize', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');

						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "start", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});
						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "start", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});

						updatedItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
						broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
						// the PDF files need an extra redraw
						broadcast('finishedMove', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');
						broadcast('finishedResize', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');

						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "end", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});
						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "end", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});

						if(updatedApp !== null && updatedApp.application === "movie_player") calculateValidBlocks(updatedApp, 128, videoHandles);
						if(updatedApp !== null && updatedApp.application === "media_block_stream") calculateValidBlocks(updatedApp, 128, mediaBlockStreams);
						if(videoHandles[updatedItem.elemId] !== undefined && videoHandles[updatedItem.elemId].newFrameGenerated === false)
							handleNewVideoFrame(updatedItem.elemId);
					}
				}
			} else {
				// already maximized, need to restore the item size
				updatedItem = remoteInteraction[uniqueID].restoreSelectedItem(elem);
				if (updatedItem !== null) {
					updatedApp = findAppById(updatedItem.elemId);
					if(updatedApp !== null) {
						broadcast('startMove', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');
						broadcast('startResize', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');

						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "start", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});
						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "start", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});

						updatedItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
						broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
						// the PDF files need an extra redraw
						broadcast('finishedMove', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');
						broadcast('finishedResize', {id: updatedItem.elemId, date: new Date()}, 'requiresFullApps');

						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "end", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});
						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "end", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});

						if(updatedApp !== null && updatedApp.application === "movie_player") calculateValidBlocks(updatedApp, 128, videoHandles);
						if(updatedApp !== null && updatedApp.application === "media_block_stream") calculateValidBlocks(updatedApp, 128, mediaBlockStreams);
						if(videoHandles[updatedItem.elemId] !== undefined && videoHandles[updatedItem.elemId].newFrameGenerated === false)
							handleNewVideoFrame(updatedItem.elemId);
					}
				}
			}
		}
	}
}


function pointerCloseGesture(uniqueID, pointerX, pointerY, time, gesture) {
	if( sagePointers[uniqueID] === undefined )
		return;

	var pX   = sagePointers[uniqueID].left;
	var pY   = sagePointers[uniqueID].top;
	var elem = findAppUnderPointer(pX, pY);

	if (elem !== null) {
		if( elem.closeGestureID === undefined && gesture === 0 ) { // gesture: 0 = down, 1 = hold/move, 2 = up
			elem.closeGestureID = uniqueID;
			elem.closeGestureTime = time + closeGestureDelay; // Delay in ms
		}
		else if( elem.closeGestureTime <= time && gesture === 1 ) { // Held long enough, remove
			deleteApplication(elem);
		}
		else if( gesture === 2 ) { // Released, reset timer
			elem.closeGestureID = undefined;
		}
	}
}

function keyDown( uniqueID, pointerX, pointerY, data) {
	if( sagePointers[uniqueID] === undefined )
		return;

	if ( remoteInteraction[uniqueID].appInteractionMode() ) {
		var elem = findAppUnderPointer(pointerX, pointerY);
		if(elem !== null){
			var elemX = pointerX - elem.left;
			var elemY = pointerY - elem.top - config.ui.titleBarHeight;

			var ePosition = {x: elemX, y: elemY};
			var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
			var eData =  {code: data.code, state: "down"};
			var now = new Date();

			var event = {id: elem.id, type: "specialKey", position: ePosition, user: eUser, data: eData, date: now};

			broadcast('eventInItem', event, 'receivesInputEvents');

			addEventToUserLog(uniqueID, {type: "applicationInteraction", data: {type: "specialKey", application: {id: elem.id, type: elem.application}, code: eData.code, state: eData.state}, time: Date.now()});
		}
	}
}

function keyUp( uniqueID, pointerX, pointerY, data) {
	if( sagePointers[uniqueID] === undefined )
		return;

	if ( remoteInteraction[uniqueID].appInteractionMode() ) {
		var elem = findAppUnderPointer(pointerX, pointerY);
		if( elem !== null ){
			var elemX = pointerX - elem.left;
			var elemY = pointerY - elem.top - config.ui.titleBarHeight;

			var ePosition = {x: elemX, y: elemY};
			var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
			var eData =  {code: data.code, state: "up"};
			var now = new Date();

			var event = {id: elem.id, type: "specialKey", position: ePosition, user: eUser, data: eData, date: now};

			broadcast('eventInItem', event, 'receivesInputEvents');

			addEventToUserLog(uniqueID, {type: "applicationInteraction", data: {type: "specialKey", application: {id: elem.id, type: elem.application}, code: eData.code, state: eData.state}, time: Date.now()});
		}
	}
}

function keyPress( uniqueID, pointerX, pointerY, data ) {
	if( sagePointers[uniqueID] === undefined )
		return;

	if ( remoteInteraction[uniqueID].appInteractionMode() ) {
		var elem = findAppUnderPointer(pointerX, pointerY);
		if( elem !== null ){
			var elemX = pointerX - elem.left;
			var elemY = pointerY - elem.top - config.ui.titleBarHeight;

			var ePosition = {x: elemX, y: elemY};
			var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
			var now = new Date();

			var event = {id: elem.id, type: "keyboard", position: ePosition, user: eUser, data: data, date: now};

			broadcast('eventInItem', event, 'receivesInputEvents');

			addEventToUserLog(uniqueID, {type: "applicationInteraction", data: {type: "keyboard", application: {id: elem.id, type: elem.application}, code: data.code, character: data.character}, time: Date.now()});
		}
	}
}

function deleteApplication( elem ) {
	broadcast('deleteElement', {elemId: elem.id}, 'requiresFullApps');
	broadcast('deleteElement', {elemId: elem.id}, 'requiresAppPositionSizeTypeOnly');
	var broadcastWS = null;
    var mediaStreamData = elem.id.split("|");
    var broadcastAddress = mediaStreamData[0];
    var broadcastID = parseInt(mediaStreamData[1]);
    var i, clientAddress;
    if (elem.application === "media_stream") {
		for (i=0; i<clients.length; i++) {
			clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
			if (clientAddress === broadcastAddress) broadcastWS = clients[i];
		}

		if (broadcastWS !== null) broadcastWS.emit('stopMediaCapture', {streamId: broadcastID});
	}
    else if (elem.application === "media_block_stream"){
		for (i=0; i<clients.length; i++){
			clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
			if (clientAddress === broadcastAddress) broadcastWS = clients[i];
		}

		if (broadcastWS !== null) broadcastWS.emit('stopMediaCapture', {streamId: broadcastID});
	}
	stickyAppHandler.removeElement(elem);
	removeElement(applications, elem);
}

// **************  Omicron section *****************
var omicronRunning = false;
if ( config.experimental && config.experimental.omicron && config.experimental.omicron.enable === true ) {
	var omicronManager = new Omicron( config );

	var closeGestureDelay = 1500;

	if( config.experimental.omicron.closeGestureDelay !== undefined )
	{
		closeGestureDelay = config.experimental.omicron.closeGestureDelay;
	}

	omicronManager.setCallbacks(
		sagePointers,
		createSagePointer,
		showPointer,
		pointerPress,
		pointerMove,
		pointerPosition,
		hidePointer,
		pointerRelease,
		pointerScrollStart,
		pointerScroll,
		pointerDblClick,
		pointerCloseGesture,
		keyDown,
		keyUp,
		keyPress,
		createRadialMenu
	);
	omicronManager.runTracker();
	omicronRunning = true;
}

/* ****** Radial Menu section ************************************************************** */

//createMediabrowser();
function createRadialMenu( uniqueID, pointerX, pointerY ) {

	var ct = findControlsUnderPointer(pointerX, pointerY);
	var elem = findAppUnderPointer(pointerX, pointerY);
	var now  = new Date();

	if( ct === null ) // Do not open menu over widget
	{
		if( elem === null )
		{
			var validLocation = true;
			var newMenuPos = {x: pointerX, y: pointerY};

			// Make sure there's enough distance from other menus
			for (var existingMenuID in radialMenus)
			{
				var existingRadialMenu = radialMenus[existingMenuID];
				var prevMenuPos = { x: existingRadialMenu.left, y: existingRadialMenu.top };

				var distance = Math.sqrt( Math.pow( Math.abs(newMenuPos.x - prevMenuPos.x), 2 ) + Math.pow( Math.abs(newMenuPos.y - prevMenuPos.y), 2 ) );

				if( existingRadialMenu.visible && distance < existingRadialMenu.radialMenuSize.x )
				{
					validLocation = false;
					console.log("Menu is too close to existing menu");
				}
			}

			if( validLocation && radialMenus[uniqueID+"_menu"] === undefined )
			{
				var newRadialMenu = new Radialmenu(uniqueID+"_menu", uniqueID, config.ui);
				radialMenus[uniqueID+"_menu"] = newRadialMenu;

				newRadialMenu.setPosition(newMenuPos);

				// Open a 'media' radial menu
				broadcast('createRadialMenu', newRadialMenu.getInfo(), 'receivesPointerData');
			}
			else if( validLocation && radialMenus[uniqueID+"_menu"] !== undefined )
			{
				radialMenus[uniqueID+"_menu"].setPosition(newMenuPos);

				radialMenus[uniqueID+"_menu"].visible = true;
				broadcast('showRadialMenu', radialMenus[uniqueID+"_menu"].getInfo(), 'receivesPointerData');
			}
		}
		else
		{
			// Open a 'app' radial menu (or in this case application widget)
			var elemCtrl = findControlById(elem.id+uniqueID+"_controls");
			if (elemCtrl === null) {
				broadcast('requestNewControl', {elemId: elem.id, user_id: uniqueID, user_label: "Touch", x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
			}
			else if (elemCtrl.show === false) {
				showControl(elemCtrl, uniqueID, pointerX, pointerY);

				var app = findAppById(elemCtrl.appId);
				if(app !== null) {
					addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "open", application: {id: app.id, type: app.application}}, time: Date.now()});
				}
			}
			else {
				moveControlToPointer(elemCtrl, uniqueID, pointerX, pointerY);
			}
		}
	}
	updateRadialMenu(uniqueID);
}

function updateRadialMenu( uniqueID )
{
	// Build lists of assets
	var uploadedImages = assets.listImages();
	var uploadedVideos = assets.listVideos();
	var uploadedPdfs   = assets.listPDFs();
	var uploadedApps = assets.listApps();
	var savedSessions  = listSessions();

	// Sort independently of case
	uploadedImages.sort( sageutils.compareFilename );
	uploadedVideos.sort( sageutils.compareFilename );
	uploadedPdfs.sort(   sageutils.compareFilename );
	uploadedApps.sort(   sageutils.compareFilename );
	savedSessions.sort(  sageutils.compareFilename );

	var list = {images: uploadedImages, videos: uploadedVideos, pdfs: uploadedPdfs, sessions: savedSessions, apps: uploadedApps};

	broadcast('updateRadialMenu', {id: uniqueID, fileList: list}, 'receivesPointerData');
}

// Standard case: Checks for event down and up events to determine menu ownership of event
function radialMenuEvent( data )
{
	//{ type: "pointerPress", id: uniqueID, x: pointerX, y: pointerY, data: data }
	for (var key in radialMenus)
	{
		var radialMenu = radialMenus[key];
		//console.log(data.id+"_menu: " + radialMenu);
		if( radialMenu !== undefined )
		{
			if( radialMenu.onEvent( data ) )
			{
				// Broadcast event if event is in radial menu bounding box
				broadcast('radialMenuEvent', data, 'receivesPointerData');
			}

			if( radialMenu.hasEventID(data.id) )
			{
				return true;
			}
		}
	}

	return false;
}

function clearRadialMenus()
{
	console.log("Clearing radial menus");
	radialMenus = [];
}

// Special case: just check if event is over menu (used for one-time events that don't use a start/end event)
function isEventOnMenu( data )
{
	var overMenu = false;
	for (var key in radialMenus)
	{
		var radialMenu = radialMenus[key];
		if( radialMenu !== undefined )
			overMenu =  radialMenu.isEventOnMenu( data );

		if( overMenu )
			return true;
	}
	return false;
}

function wsRemoveRadialMenu( wsio, data ) {
	var radialMenu = radialMenus[data.id];

	if( radialMenu !== undefined )
	{
		radialMenu.visible = false;
	}
}

function wsRadialMenuThumbnailWindow( wsio, data ) {
	var radialMenu = radialMenus[data.id];
	if( radialMenu !== undefined )
	{
		radialMenu.openThumbnailWindow( data );
	}
}

function wsRadialMenuMoved( wsio, data ) {
	var radialMenu = radialMenus[data.id];
	if( radialMenu !== undefined )
	{
		radialMenu.setPosition( data );
	}
}


function attachAppIfSticky(backgroundItem, appId){
	var app = findAppById(appId);

	if (app === null || app.sticky !== true) return;
	stickyAppHandler.detachStickyItem(app);
	if (backgroundItem !== null)
		stickyAppHandler.attachStickyItem(backgroundItem, app);
}

function showOrHideWidgetConnectors(uniqueID, itemUnderPointer, pressMoveRelease){
	var app;
	var item;
	if (pressMoveRelease === "press") {
		if (itemUnderPointer !== null) {
			if (itemUnderPointer.appId) {
				app = findAppById(itemUnderPointer.appId);
				if (app) {
					itemUnderPointer = getAppPositionSize(app);
				}
			}
			else {
				itemUnderPointer = getAppPositionSize(itemUnderPointer);
			}
			itemUnderPointer.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
			itemUnderPointer.user_id = uniqueID;
			broadcast('showWidgetToAppConnector', itemUnderPointer, 'receivesPointerData');
			remoteInteraction[uniqueID].pressOnItem(itemUnderPointer);
		}
	}
	else if (pressMoveRelease === "release"){
		item = remoteInteraction[uniqueID].releaseOnItem();
		if (item) {
			broadcast('hideWidgetToAppConnector', item, 'receivesPointerData');
		}
	}
	else {
		item = remoteInteraction[uniqueID].releaseOnItem();
		if (item) {
			broadcast('hideWidgetToAppConnector', item, 'receivesPointerData');
		}

		if (itemUnderPointer !== null && remoteInteraction[uniqueID].hoverOverControl() === null) {
			if (itemUnderPointer.appId) {
				app = findAppById(itemUnderPointer.appId);
				if (app) {
					itemUnderPointer = getAppPositionSize(app);
				}
			}
			else {
				itemUnderPointer = getAppPositionSize(itemUnderPointer);
			}
			itemUnderPointer.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
			itemUnderPointer.user_id = uniqueID;

			broadcast('showWidgetToAppConnector', itemUnderPointer, 'receivesPointerData');
			remoteInteraction[uniqueID].enterControlArea(itemUnderPointer);
		}
		else if (itemUnderPointer === null && remoteInteraction[uniqueID].hoverOverControl() !== null) {
			item = remoteInteraction[uniqueID].hoverOverControl();
			broadcast('hideWidgetToAppConnector', item, 'receivesPointerData');
			remoteInteraction[uniqueID].leaveControlArea();
		}
		else if (itemUnderPointer !== null && remoteInteraction[uniqueID].hoverOverControl() !== null) {
			var appId = itemUnderPointer.appId || itemUnderPointer.id;
			item = remoteInteraction[uniqueID].hoverOverControl();
			if (appId === item.id) return;

			if (itemUnderPointer.appId) {
				app = findAppById(itemUnderPointer.appId);
				if (app) {
					itemUnderPointer = getAppPositionSize(app);
				}
			}
			else {
				itemUnderPointer = getAppPositionSize(itemUnderPointer);
			}
			itemUnderPointer.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
			itemUnderPointer.user_id = uniqueID;

			broadcast('hideWidgetToAppConnector', item, 'receivesPointerData');
			remoteInteraction[uniqueID].leaveControlArea();

			broadcast('showWidgetToAppConnector', itemUnderPointer, 'receivesPointerData');
			remoteInteraction[uniqueID].enterControlArea(itemUnderPointer);
		}
	}
}
