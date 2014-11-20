// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

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

// Importing modules (from node_modules directory)

// npm registry: built-in or defined in package.json
var colors      = require('colors');              // pretty colors in the terminal
var crypto      = require('crypto');              // https encryption
var exec        = require('child_process').exec;  // execute child process
var formidable  = require('formidable');          // upload processor
var fs          = require('fs');                  // filesystem access
var gm          = require('gm');                  // graphicsmagick
var http        = require('http');                // http server
var https       = require('https');               // https server
var json5       = require('json5');               // JSON format that allows comments
var os          = require('os');                  // operating system access
var path        = require('path');                // file path extraction and creation
var program     = require('commander');           // parsing command-line arguments
var qrimage     = require('qr-image');            // qr-code generation
var readline    = require('readline');            // to build an evaluation loop (builtin module)
var request     = require('request');             // external http requests
var sprint      = require('sprint');              // pretty formating (sprintf)
var twit        = require('twit');                // twitter api
var util        = require('util');                // node util

// custom node modules
var assets      = require('./src/node-assets');         // manages the list of files
var exiftool    = require('./src/node-exiftool');       // gets exif tags for images
var httpserver  = require('./src/node-httpserver');     // creates web server
var interaction = require('./src/node-interaction');    // handles sage interaction (move, resize, etc.)
var loader      = require('./src/node-itemloader');     // handles sage item creation
var omicron     = require('./src/node-omicron');        // handles Omicron input events
var radialmenu  = require('./src/node-radialmenu');     // radial menu
var sagepointer = require('./src/node-sagepointer');    // handles sage pointers (creation, location, etc.)
var sageutils   = require('./src/node-utils');          // provides the current version number
var websocketIO = require('./src/node-websocket.io');   // creates WebSocket server and clients

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
  .parse(process.argv);

// Logging mechanism
if (program.logfile) {
	var logname    = (program.logfile === true) ? 'sage2.log' : program.logfile;
	var log_file   = fs.createWriteStream(path.resolve(logname), {flags : 'w+'});
	var log_stdout = process.stdout;

	// Redirect console.log to a file and still produces an output or not
	if (program.output === false) {
		console.log = function(d) {
			log_file.write(util.format(d) + '\n');
			program.interactive = undefined;
		};
	} else {
		console.log = function() {
			if ((Array.prototype.slice.call(arguments)).length == 1 && 
				typeof Array.prototype.slice.call(arguments)[0] == 'string') {
				log_stdout.write( (Array.prototype.slice.call(arguments)).toString() + '\n' );
			}
			else {
				var i = 0;
				var s = "";
				var args = [util.format.apply(util.format, Array.prototype.slice.call(arguments))];
				while (i < args.length) {
					if (i===0)
						s = args[i];
					else
						s += " " + args[i];
					i++;
				}
				log_stdout.write(s + '\n');
				log_file.write(s + '\n');
			}

		};
	}
}
else if (program.output === false) {
	console.log = function(d) { //
		program.interactive = undefined;
	};
}

// Platform detection
var platform = os.platform() === "win32" ? "Windows" : os.platform() === "darwin" ? "Mac OS X" : "Linux";
console.log("Detected Server OS as:", platform);
console.log("SAGE2 Short Version:", SAGE2_version);


// load config file - looks for user defined file, then file that matches hostname, then uses default
var config = loadConfiguration();

var twitter = null;
if(config.apis !== undefined && config.apis.twitter !== undefined){
	twitter = new twit({
		consumer_key:         config.apis.twitter.consumerKey,
		consumer_secret:      config.apis.twitter.consumerSecret,
		access_token:         config.apis.twitter.accessToken,
		access_token_secret:  config.apis.twitter.accessSecret
	});
}

// remove API keys from being investigated further
if(config.apis !== undefined) delete config.apis;


console.log(config);

// find git commit version and date
sageutils.getFullVersion(function(version) {
	// fields: base commit branch date
	console.log("SAGE2 Full Version:", version);
	SAGE2_version = version;
	broadcast('setupSAGE2Version', SAGE2_version, 'receivesDisplayConfiguration');
});


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
var public_https = "public_HTTPS"; // directory where HTTPS content is stored
var hostOrigin = (typeof config.rproxy_port != "undefined") ? "" 
		: "https://"+config.host+":"+config.port.toString()+"/"; // base URL for this server
var uploadsFolder = path.join(public_https, "uploads"); // directory where files are uploaded

// global variables to manage items
var itemCount = 0;

// global variables to manage clients
var clients = [];
var masterDisplay = null;
var webBrowserClient = null;
var sagePointers = {};
var remoteInteraction = {};
var mediaStreams = {};
var radialMenus = {};

// Generating QR-code of URL for UI page
var qr_png = qrimage.image(hostOrigin, { ec_level:'M', size: 15, margin:3, type: 'png' });
var qr_out = path.join(uploadsFolder, "images", "QR.png");
// qr_png.on('readable', function() { process.stdout.write('.'); });
qr_png.on('end',      function() { console.log('QR> image generated', qr_out); });
qr_png.pipe(fs.createWriteStream(qr_out));


// Make sure tmp directory is local
process.env.TMPDIR = path.join(__dirname, "tmp");
console.log("Temp folder: ".green, process.env.TMPDIR);
if(!fs.existsSync(process.env.TMPDIR)){
     fs.mkdirSync(process.env.TMPDIR);
}

// Make sure session folder exists
var sessionFolder = path.join(__dirname, "sessions");
if (!fs.existsSync(sessionFolder)) {
     fs.mkdirSync(sessionFolder);
}

// Build the list of existing assets
assets.initialize(uploadsFolder, 'uploads');

var appLoader = new loader(public_https, hostOrigin, config.totalWidth, config.totalHeight,
						(config.ui.auto_hide_ui===true) ? 0 : config.ui.titleBarHeight,
						imConstraints);
var applications = [];
var controls = []; // Each element represents a control widget bar
var appAnimations = {};


// sets up the background for the display clients (image or color)
setupDisplayBackground();


// create HTTP server for index page (Table of Contents)
var httpServerIndex = new httpserver("public_HTTP");
httpServerIndex.httpGET('/config', sendConfig); // send config object to client using http request


// create HTTPS server for all SAGE content
var httpsServerApp = new httpserver("public_HTTPS");
httpsServerApp.httpPOST('/upload', uploadForm); // receive newly uploaded files from SAGE Pointer / SAGE UI
httpsServerApp.httpGET('/config',  sendConfig); // send config object to client using http request


// create HTTPS options - sets up security keys
var options = setupHttpsOptions();


// initializes HTTP and HTTPS servers
var index = http.createServer(httpServerIndex.onrequest);
var server = https.createServer(options, httpsServerApp.onrequest);

var startTime = new Date();


// creates a WebSocket server - 2 way communication between server and all browser clients
var wsioServer = new websocketIO.Server({server: server});

wsioServer.onconnection(function(wsio) {
	wsio.onclose(closeWebSocketClient);
	wsio.on('addClient', wsAddClient);
});

function closeWebSocketClient(wsio) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	console.log("Closed Connection: " + uniqueID + " (" + wsio.clientType + ")");
	
	var remote = findRemoteSiteByConnection(wsio);
	if(remote !== null){
		console.log("Remote site \"" + remote.name + "\" now offline");
		remote.connected = false;
		var site = {name: remote.name, connected: remote.connected};
		broadcast('connectedToRemoteSite', site, 'receivesRemoteServerInfo');
	}
	if(wsio.messages.sendsPointerData){
		hidePointer(uniqueID);
		delete sagePointers[uniqueID];
		delete remoteInteraction[uniqueID];
	}
	if(wsio.messages.requiresFullApps){
		var key;
		for(key in mediaStreams) {
			if (mediaStreams.hasOwnProperty(key)) {
				delete mediaStreams[key].clients[uniqueID];
			}
		}
		for(key in appAnimations) {
			if (appAnimations.hasOwnProperty(key)) {
				delete appAnimations[key].clients[uniqueID];
			}
		}
	}
	
	if(wsio.clientType == "webBrowser") webBrowserClient = null;
	
	if(wsio === masterDisplay){
		var i;
		masterDisplay = null;
		for(i=0; i<clients.length; i++){
			if(clients[i].clientType === "display" && clients[i] !== wsio){
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
	
	if (wsio.clientType==="display") {
		if(masterDisplay === null) masterDisplay = wsio;
		console.log("New Connection: " + uniqueID + " (" + wsio.clientType + " " + wsio.clientID+ ")");
	}
	else {
		console.log("New Connection: " + uniqueID + " (" + wsio.clientType + ")");
	}
	
	initializeWSClient(wsio);
	clients.push(wsio);
}

function initializeWSClient(wsio) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	
	wsio.emit('initialize', {UID: uniqueID, time: new Date(), start: startTime});
	
	if(wsio === masterDisplay) wsio.emit('setAsMasterDisplay');
	
	// set up listeners based on what the client sends
	if(wsio.messages.sendsPointerData){
		wsio.on('startSagePointer',          wsStartSagePointer);
		wsio.on('stopSagePointer',           wsStopSagePointer);
		wsio.on('pointerPress',              wsPointerPress);
		wsio.on('pointerRelease',            wsPointerRelease);
		wsio.on('pointerDblClick',           wsPointerDblClick);
		wsio.on('pointerPosition',           wsPointerPosition);
		wsio.on('pointerMove',               wsPointerMove);
		wsio.on('pointerScrollStart',        wsPointerScrollStart);
		wsio.on('pointerScroll',             wsPointerScroll);
		wsio.on('pointerDraw',               wsPointerDraw);
		wsio.on('keyDown',                   wsKeyDown);
		wsio.on('keyUp',                     wsKeyUp);
		wsio.on('keyPress',                  wsKeyPress);
	}
	if(wsio.messages.sendsMediaStreamFrames){
		wsio.on('startNewMediaStream',       wsStartNewMediaStream);
		wsio.on('updateMediaStreamFrame',    wsUpdateMediaStreamFrame);
		wsio.on('updateMediaStreamChunk',    wsUpdateMediaStreamChunk);
		wsio.on('stopMediaStream',           wsStopMediaStream);
	}
	if(wsio.messages.receivesMediaStreamFrames){
		wsio.on('receivedMediaStreamFrame',  wsReceivedMediaStreamFrame);
		wsio.on('receivedRemoteMediaStreamFrame',  wsReceivedRemoteMediaStreamFrame);
	}
	if(wsio.messages.requiresFullApps){
		wsio.on('finishedRenderingAppFrame', wsFinishedRenderingAppFrame);
		wsio.on('updateAppState', wsUpdateAppState);
		wsio.on('appResize', wsAppResize);
		wsio.on('broadcast', wsBroadcast);
		wsio.on('searchTweets', wsSearchTweets);
	}
	if(wsio.messages.requestsServerFiles){
		wsio.on('requestAvailableApplications', wsRequestAvailableApplications);
		wsio.on('requestStoredFiles', wsRequestStoredFiles);
		//wsio.on('addNewElementFromStoredFiles', wsAddNewElementFromStoredFiles);
		wsio.on('loadApplication', wsLoadApplication);
		wsio.on('loadFileFromServer', wsLoadFileFromServer);
		wsio.on('deleteElementFromStoredFiles', wsDeleteElementFromStoredFiles);
		wsio.on('saveSesion',       wsSaveSesion);
		wsio.on('clearDisplay',     wsClearDisplay);
		wsio.on('tileApplications', wsTileApplications);
	}
	if(wsio.messages.sendsWebContentToLoad){
		wsio.on('addNewWebElement', wsAddNewWebElement);
	}
	if(wsio.messages.launchesWebBrowser){
		wsio.on('openNewWebpage', wsOpenNewWebpage);
	}
	if(wsio.messages.sendsVideoSynchonization){
		wsio.on('updateVideoTime', wsUpdateVideoTime);
	}
	if(wsio.messages.sharesContentWithRemoteServer){
		wsio.on('addNewElementFromRemoteServer', wsAddNewElementFromRemoteServer);
		wsio.on('requestNextRemoteFrame', wsRequestNextRemoteFrame);
		wsio.on('updateRemoteMediaStreamFrame', wsUpdateRemoteMediaStreamFrame);
		wsio.on('stopMediaStream', wsStopMediaStream);
	}
	if(wsio.messages.requestsWidgetControl){
		wsio.on('addNewControl', wsAddNewControl);
		wsio.on('selectedControlId', wsSelectedControlId);
		wsio.on('releasedControlId', wsReleasedControlId);
	}
	if(wsio.messages.receivesDisplayConfiguration){
		wsio.emit('setupDisplayConfiguration', config);
		wsio.emit('setupSAGE2Version', SAGE2_version);
	}
	if (wsio.messages.requestsAppClone){
		wsio.on('createAppClone', wsCreateAppClone);
	}
	
	if(wsio.messages.sendsPointerData)                 createSagePointer(uniqueID);
	if(wsio.messages.receivesClockTime)                wsio.emit('setSystemTime', {date: new Date()});
	if(wsio.messages.receivesPointerData)              initializeExistingSagePointers(wsio);
	if(wsio.messages.requiresFullApps)                 initializeExistingApps(wsio);
	if(wsio.messages.requiresAppPositionSizeTypeOnly)  initializeExistingAppsPositionSizeTypeOnly(wsio);
	if(wsio.messages.receivesRemoteServerInfo)         initializeRemoteServerInfo(wsio);
	if(wsio.messages.receivesMediaStreamFrames)        initializeMediaStreams(uniqueID);
	
	var remote = findRemoteSiteByConnection(wsio);
	if(remote !== null){
		remote.wsio = wsio;
		remote.connected = true;
		var site = {name: remote.name, connected: remote.connected};
		broadcast('connectedToRemoteSite', site, 'receivesRemoteServerInfo');
	}
	
	if (wsio.clientType === "webBrowser") webBrowserClient = wsio;
	
	if ( wsio.clientType === "radialMenu" )
	{
		wsio.on('radialMenuMoved', wsRadialMenuMoved);
		wsio.on('removeRadialMenu', wsRemoveRadialMenu);
		wsio.on('radialMenuWindowToggle', wsRadialMenuThumbnailWindow);
		
		// Allows only one instance of each radial menu to send 'open file' command
		if ( radialMenus[wsio.clientID].wsio === undefined )
		{
			console.log("New Radial Menu Connection: " + uniqueID + " (" + wsio.clientType + " " + wsio.clientID+ ")");
			radialMenus[wsio.clientID].wsio = wsio;
		} else {
			//console.log("Existing Radial Menu Connection: " + uniqueID + " (" + wsio.clientType + " " + wsio.clientID + ")");
			wsio.emit("disableSendToServer", uniqueID);
		}
	}
	
	// Debug messages from applications
	wsio.on('sage2Log', wsPrintDebugInfo);
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

// **************  Sage Pointer Functions *****************

function wsStartSagePointer(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	
	showPointer(uniqueID, data);
}

function wsStopSagePointer(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	
	hidePointer(uniqueID);
	
	//return to window interaction mode after stopping pointer
	if(remoteInteraction[uniqueID].appInteractionMode()){
		remoteInteraction[uniqueID].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode } , 'receivesPointerData');
	}
}

function wsPointerPress(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;
	
	/*
	if (data.button === 'left')
		pointerPress(uniqueID, pointerX, pointerY); // combine right and left - add param for button
	else
		pointerPressRight(uniqueID,pointerX, pointerY);
	*/
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
	pointerRelease(uniqueID, pointerX, pointerY ,data);
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
	
	// Casting the parameters to correct type
	data.deltaX = parseInt(data.deltaX, 10);
	data.deltaY = parseInt(data.deltaY, 10);
	
	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;
	
	pointerMove(uniqueID, pointerX, pointerY, data);
}

function wsPointerScrollStart(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	
	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	var elem = findAppUnderPointer(pointerX, pointerY);

	if (elem !== null) {
		remoteInteraction[uniqueID].selectScrollItem(elem);
		var newOrder = moveAppToFront(elem.id);
		broadcast('updateItemOrder', {idList: newOrder}, 'receivesWindowModification');
	}
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
	
	if(data.code == 16){ // shift
		remoteInteraction[uniqueID].SHIFT = true;
	}
	else if(data.code == 17){ // ctrl
		remoteInteraction[uniqueID].CTRL = true;
	}
	else if(data.code == 18) { // alt
		remoteInteraction[uniqueID].ALT = true;
	}
	else if(data.code == 20) { // caps lock
		remoteInteraction[uniqueID].CAPS = true;
	}
	else if(data.code == 91 || data.code == 92 || data.code == 93){ // command
		remoteInteraction[uniqueID].CMD = true;
	}


	

	//SEND SPECIAL KEY EVENT only will come here
	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	var control = findControlsUnderPointer(pointerX,pointerY);
	if (control!==null){
		return;
	}

	
	if(remoteInteraction[uniqueID].appInteractionMode()){		
		keyDown(uniqueID, pointerX, pointerY, data);
	}
}

function wsKeyUp(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	
	if(data.code == 16){ // shift
		remoteInteraction[uniqueID].SHIFT = false;
	}
	else if(data.code == 17){ // ctrl
		remoteInteraction[uniqueID].CTRL = false;
	}
	else if(data.code == 18) { // alt
		remoteInteraction[uniqueID].ALT = false;
	}
	else if(data.code == 20) { // caps lock
		remoteInteraction[uniqueID].CAPS = false;
	}
	else if(data.code == 91 || data.code == 92 || data.code == 93){ // command
		remoteInteraction[uniqueID].CMD = false;
	}

	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;
	
	var control = findControlsUnderPointer(pointerX,pointerY);
	
	var lockedControl = remoteInteraction[uniqueID].lockedControl();

	if (lockedControl !== null) {
		var event = {code: data.code, printable:false, state: "up", ctrlId:lockedControl.ctrlId, appId:lockedControl.appId};
		broadcast('keyInTextInputWidget', event ,'receivesWidgetEvents');
		if (data.code == 13) { //Enter key
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
	var control = findControlsUnderPointer(pointerX,pointerY);

	if(data.code == 9 && remoteInteraction[uniqueID].SHIFT && sagePointers[uniqueID].visible){ // shift + tab
		remoteInteraction[uniqueID].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode}, 'receivesPointerData');
	}
	else if (lockedControl !== null){
		var event = {code: data.code, printable:true, state: "down", ctrlId:lockedControl.ctrlId, appId:lockedControl.appId};
		broadcast('keyInTextInputWidget', event ,'receivesWidgetEvents');
		if (data.code === 13){ //Enter key
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

// **************  Media Stream Functions *****************

function wsStartNewMediaStream(wsio, data) {
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
	var elem = findAppById(data.id);

	if(elem !== null) deleteApplication( elem );
}

// Print message from remote applications
function wsPrintDebugInfo(wsio, data) {
	// sprint for padding and pretty colors
	console.log(
		sprint("Node %2d> ", data.node).blue + sprint("[%s] ",data.app).green,
		data.message);
}

function wsReceivedMediaStreamFrame(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	var i;
	var broadcastAddress, broadcastID;
	var serverAddress, clientAddress;

	mediaStreams[data.id].clients[uniqueID] = true;
	if(allTrueDict(mediaStreams[data.id].clients) && mediaStreams[data.id].ready){
		mediaStreams[data.id].ready = false;
		var broadcastWS = null;
		var mediaStreamData = data.id.split("|");
		if(mediaStreamData.length === 2){ // local stream --> client | stream_id
			broadcastAddress = mediaStreamData[0];
			broadcastID = parseInt(mediaStreamData[1]);
			for(i=0; i<clients.length; i++){
				clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
				if(clientAddress == broadcastAddress) broadcastWS = clients[i];
			}
			if(broadcastWS !== null) broadcastWS.emit('requestNextFrame', {streamId: broadcastID});
		}
		else if(mediaStreamData.length === 3){ // remote stream --> remote_server | client | stream_id
			serverAddress = mediaStreamData[0];
			broadcastAddress = mediaStreamData[1];
			broadcastID = mediaStreamData[2];
		
			for(i=0; i<clients.length; i++){
				clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
				if(clientAddress == serverAddress) { broadcastWS = clients[i]; break; }
			}
		
			if(broadcastWS !== null) broadcastWS.emit('requestNextRemoteFrame', {id: broadcastAddress + "|" + broadcastID});
		}
	}
}

// **************  Application Animation Functions *****************

function wsFinishedRenderingAppFrame(wsio, data) {
	var uniqueID = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port;
	
	appAnimations[data.id].clients[uniqueID] = true;
	if(allTrueDict(appAnimations[data.id].clients)){
		var key;
		for(key in appAnimations[data.id].clients){
			appAnimations[data.id].clients[key] = false;
		}
		// animate max 60 fps
		var now = new Date();
		var elapsed = now.getTime() - appAnimations[data.id].date.getTime();
		if(elapsed > 16){
			appAnimations[data.id].date = new Date();
			broadcast('animateCanvas', {id: data.id, date: new Date()}, 'requiresFullApps');
		}
		else{
			setTimeout(function() {
				appAnimations[data.id].date = new Date();
				broadcast('animateCanvas', {id: data.id, date: new Date()}, 'requiresFullApps');
			}, 16-elapsed);
		}
	}
}

function wsUpdateAppState(wsio, data) {
	// Using updates only from display client 0
	if (wsio.clientID === 0) {
		var app = findAppById(data.id);
		app.data = data.state;
	}
}

//
// Got a resize call for an application itself
//
function wsAppResize(wsio, data) {
    if (wsio.clientID === 0) {
		// Update the object with the new dimensions
		var app    = findAppById(data.id);
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
			i, thelist[i].name, thelist[i].size/1024.0, thelist[i].date
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
				thelist.push( { exif: { FileName: file.slice(0,-5),  FileSize:stat.size, FileDate: strdate} } );
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
				console.log("Sessions> coudlnt delete session ", filename, err);
				return;
			}
			console.log("Sessions> successfully deleted session", filename);
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
	for (var i=0;i<applications.length;i++) {
		var a = applications[i];
		// Ignore media streaming applications for now (desktop sharing)
		if (a.application !== 'media_stream') {
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

			for (var i=0;i<session.apps.length;i++) {
				var a = session.apps[i];
				console.log("Session> App",  a.id);

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
	console.log("Streams (%d)\n------------", Object.keys(mediaStreams).length);
	i = 0;
	for (key in mediaStreams) {
		var numclients = Object.keys(mediaStreams[key].clients).length;
		console.log(sprint("%2d: %s ready:%s clients:%d", i, key, mediaStreams[key].ready, numclients));
		var cstr = " ";
		for (c in mediaStreams[key].clients) {
			cstr += c + "(" + mediaStreams[key].clients[c] + ") ";
		}
		console.log("\t", cstr);
		i++;
	}
}

function listApplications() {
	var i;
	console.log("Applications\n------------");
	for(i=0; i<applications.length; i++){
		console.log(sprint("%2d: %s %s [%dx%d +%d+%d] %s (v%s) by %s",
			i, applications[i].id, applications[i].application.red,
			 applications[i].width,  applications[i].height,
			 applications[i].left,  applications[i].top,
			 applications[i].title.green,
			 applications[i].metadata.version, applications[i].metadata.author.grey
		));
	}
}


// **************  Tiling Functions *****************

//
//
// From Ratko's DIM in SAGE
//

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
  for (var i=0;i<rows;i++) {
     arr[i] = [];
  }
  return arr;
}
// Calculate the euclidian distance between two objects with .x and .y fields
function distance2D(p1, p2) {
	var d = 0.0;
	d = Math.sqrt( Math.pow((p1.x-p2.x),2) + Math.pow((p1.y-p2.y),2) );
	return d;
}
function findMinimum(arr) {
	var val = Number.MAX_VALUE;
	var idx = 0;
	for (var i=0;i<arr.length;i++) {
		if (arr[i]<val) {
			val = arr[i];
			idx = i;
		}
	}
	return idx;
}
function printMatrix(dist) {
	var i, j;
	for (i=0; i<applications.length; i++) {
		process.stdout.write(i.toString());
		for (j=0; j<applications.length; j++) {
			process.stdout.write(" " + dist[i][j].toFixed(2));
		}
		process.stdout.write('\n');
	}
}

function tileApplications2() {
	var app;
	var i, j, c, r;
	var numCols, numRows;

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

    // determine the bounds of the tiling area
	var titleBar = config.ui.titleBarHeight;
	if (config.ui.auto_hide_ui===true) titleBar = 0;
	var areaX = 0;
	var areaY = Math.round(1.5 * titleBar); // keep 0.5 height as margin
	if (config.ui.auto_hide_ui===true) areaY = - config.ui.titleBarHeight;

	var areaW = config.totalWidth;
	var areaH = config.totalHeight-(1.0*titleBar);

	var tileW = Math.floor(areaW / numCols);
	var tileH = Math.floor(areaH / numRows);

	var padding = 4;
	// if only one application, no padding, i.e maximize
	if (applications.length===1) padding = 0;

    var centroidsApps  = [];
    var centroidsTiles = [];
    r = numRows-1;
    c = 0;
    // Caculate apps and tiles centers
    for (i=0; i<applications.length; i++) {
		app =  applications[i];
		centroidsApps[i] = {x: app.left+app.width/2.0, y: app.top+app.height/2.0};
		console.log('centroid appl:', i, app.title, centroidsApps[i]);

		centroidsTiles[i] = {x: (c*tileW+areaX)+tileW/2.0, y: (r*tileH+areaY)+tileH/2.0};
		console.log('centroid tile:', i, centroidsTiles[i]);

        c += 1;
        if (c === numCols) {
            c  = 0;
            r -= 1;
        }
	}
	// Calculate distances
	var distances = Create2DArray(applications.length);
	for (i=0; i<applications.length; i++) {
		for (j=0; j<applications.length; j++) {
			var d = distance2D(centroidsApps[i], centroidsTiles[j]);
			distances[i][j] = d;
		}
	}
	// dump the matrix
	printMatrix(distances);
	for (i=0; i<applications.length; i++) {
		var idx = findMinimum(distances[i]);
		console.log('Min:', i, idx, distances[i][idx].toFixed(2));
	}

    r = numRows-1;
    c = 0;
	for (i=0; i<applications.length; i++) {
		// pick an app
		var appid = findMinimum(distances[i]);
		// get the application
		app =  applications[ appid ];

		console.log('Round:', i, appid, distances[i][appid].toFixed(2), app.title);
		for (j=0; j<applications.length; j++) distances[j][appid] = Number.MAX_VALUE;

		// calculate new dimensions
		console.log('tiling:', i, c, r, app.title);
        var newdims = fitWithin(app, c*tileW+areaX, r*tileH+areaY, tileW, tileH, padding);

		printMatrix(distances);

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
		// send the order
		broadcast('setItemPositionAndSize', updateItem, 'receivesWindowModification');

        c += 1;
        if (c === numCols) {
            c  = 0;
            r -= 1;
        }
    }
}

function tileApplications() {
	var app;
	var i, c, r;
	var numCols, numRows;

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

    // determine the bounds of the tiling area
	var titleBar = config.ui.titleBarHeight;
	if (config.ui.auto_hide_ui===true) titleBar = 0;
	var areaX = 0;
	var areaY = Math.round(1.5 * titleBar); // keep 0.5 height as margin
	if (config.ui.auto_hide_ui===true) areaY = - config.ui.titleBarHeight;

	var areaW = config.totalWidth;
	var areaH = config.totalHeight-(1.0*titleBar);

	var tileW = Math.floor(areaW / numCols);
	var tileH = Math.floor(areaH / numRows);

	// go through them in sorted order
	// applications.sort()

	var padding = 4;
	// if only one application, no padding, i.e maximize
	if (applications.length===1) padding = 0;
    r = numRows-1;
    c = 0;
	for (i=0; i<applications.length; i++) {
		// get the application
		app =  applications[i];
		// calculate new dimensions
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
		// send the order
		broadcast('setItemPositionAndSize', updateItem, 'receivesWindowModification');

        c += 1;
        if (c === numCols) {
            c  = 0;
            r -= 1;
        }
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
	clearDisplay();
}

function wsTileApplications(wsio, data) {
	tileApplications();
}


// **************  Server File Functions *****************

function wsRequestAvailableApplications(wsio, data) {
	var applications = getApplications();
	wsio.emit('availableApplications', applications);
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

		applications.push(appInstance);
	});
}

function wsLoadFileFromServer(wsio, data) {
	if (data.application === "load_session") {
		// if it's a session, then load it
		loadSession(data.filename);
	}
	else {
		appLoader.loadFileFromLocalStorage(data, function(appInstance) {
			appInstance.id = getUniqueAppId();
			
			broadcast('createAppWindow', appInstance, 'requiresFullApps');
			broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(appInstance), 'requiresAppPositionSizeTypeOnly');

			applications.push(appInstance);
		});
	}
}

function wsDeleteElementFromStoredFiles(wsio, data) {
	if (data.application === "load_session") {
		// if it's a session
		deleteSession (data.filename);
	} else if (data.application === 'custom_app') {
		// an app
		// NYI
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
	}
}



// **************  Adding Web Content (URL) *****************

function wsAddNewWebElement(wsio, data) {
	appLoader.loadFileFromWebURL(data, function(appInstance) {

		// Get the drop position and convert it to wall coordinates
		var position = data.position || [0,0];
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

function wsUpdateVideoTime(wsio, data) {
	broadcast('updateVideoItemTime', data, 'requiresFullApps');
}

// **************  Remote Server Content *****************

function wsAddNewElementFromRemoteServer(wsio, data) {
	console.log("add element from remote server");
	var clientAddress, i;

	appLoader.loadApplicationFromRemoteServer(data, function(appInstance) {
		console.log("Remote App: " + appInstance.application);
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
		else {
			appInstance.id = getUniqueAppId();
		}
		
		broadcast('createAppWindow', appInstance, 'requiresFullApps');
		broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(appInstance), 'requiresAppPositionSizeTypeOnly');
	
		applications.push(appInstance);
	
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
		
		for(var i=0; i<clients.length; i++){
			var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
			if(clientAddress == serverAddress) { broadcastWS = clients[i]; break; }
		}
		
		if(broadcastWS !== null) broadcastWS.emit('requestNextRemoteFrame', {id: broadcastAddress});
	}
}

// **************  Widget Control Messages *****************

function wsAddNewControl(wsio, data){
	for (var i= controls.length-1;i>=0;i--){
		if (controls[i].id === data.id)
			return;
	}
	broadcast('createControl',data,'requestsWidgetControl');
	controls.push (data);
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
		broadcast('dropTextInputControl', appdata ,'receivesWidgetEvents');
		remoteInteraction[data.addr].dropControl();
	}
	if (regButton.test(data.ctrlId) || regTI.test(data.ctrlId) || regSl.test(data.ctrlId)) {
		remoteInteraction[data.addr].lockControl({ctrlId:data.ctrlId,appId:data.appId});
	}
}

function wsReleasedControlId(wsio, data){
	var regSl = /slider/;
	var regButton = /button/
	if (data.ctrlId !==null && remoteInteraction[data.addr].lockedControl() !== null &&(regSl.test(data.ctrlId) || regButton.test(data.ctrlId))) {
		remoteInteraction[data.addr].dropControl();
		broadcast('executeControlFunction', {ctrlId: data.ctrlId, appId: data.appId}, 'receivesWidgetEvents');
	}
}
/******************** Clone Request Methods ****************************/

function wsCreateAppClone(wsio, data){
	
	var app = findAppById(data.id);
	if (app !== null){
		var clone = {
			id:getUniqueAppId(),
			left: app.left + 5, // modify such that if the new position is off the screen, then reset the position to 0,0
			top: app.top + 5,
			width: app.width,
			height:app.height,
			data:app.data,
			resrc: app.resrc,
			animation: app.animation,
			date: new Date(),
			title: app.title,
			url: app.url,
			metadata: app.metadata,
			application: app.application
		};

		broadcast('createAppWindow', clone, 'requiresFullApps');
		broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(clone), 'requiresAppPositionSizeTypeOnly');
		applications.push(clone);	
	}
	
}

/******************** Clone Request Methods ****************************/


function loadConfiguration() {
	var configFile = null;
	
	if (program.configuration) {
		configFile = program.configuration;
	}
	else {
	// Read config.txt - if exists and specifies a user defined config, then use it
	if(fs.existsSync("config.txt")){
		var lines = fs.readFileSync("config.txt", 'utf8').split("\n");
		for(var i =0; i<lines.length; i++){
			var text = "";
			var comment = lines[i].indexOf("//");
			if(comment >= 0) text = lines[i].substring(0,comment).trim();
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
		if(fs.existsSync(configFile)){
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
	
	if (! fs.existsSync(configFile)) {
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
	if (userConfig.port === undefined) userConfig.port = 443;
	if (userConfig.index_port === undefined) userConfig.index_port = 80;

	return userConfig;
}

function getUniqueAppId() {
	var id = "application_"+itemCount.toString();
	itemCount++;
	
	return id;	
}

function getApplications() {
	var uploadedApps = assets.listApps();
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
	if(config.background.image !== undefined && config.background.image.url !== undefined){
		var bg_file = path.join(public_https, config.background.image.url);

		if (config.background.image.style === "tile") {
			// do nothing
		}
		else if (config.background.image.style === "fit") {
			var result = exiftool.file(bg_file, function(err, data) {
				if (err) {
					console.log("Error processing background image:", bg_file, err);
					console.log(" ");
					process.exit(1);
				}
				var bg_info = data;

				if (bg_info.ImageWidth == config.totalWidth && bg_info.ImageHeight == config.totalHeight) {
					sliceBackgroundImage(bg_file, bg_file);
				}
				else {
					tmpImg = path.join(public_https, "images", "background", "tmp_background.png");
					var out_res  = config.totalWidth.toString() + "x" + config.totalHeight.toString();
			
					imageMagick(bg_file).noProfile().command("convert").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", out_res).write(tmpImg, function(err) {
						if(err) throw err;
						sliceBackgroundImage(tmpImg, bg_file);
					});
				}
			} );
		}
		else {
			config.background.image.style === "stretch"
			imgExt = path.extname(bg_file);
			tmpImg = path.join(public_https, "images", "background", "tmp_background" + imgExt);
		
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
		var output_dir = path.dirname(outputBaseName);
		var input_ext = path.extname(outputBaseName);
		var output_ext = path.extname(fileName);
		var output_base = path.basename(outputBaseName, input_ext);
		var output = path.join(output_dir, output_base + "_"+i.toString() + output_ext);
		console.log(output);
		imageMagick(fileName).crop(config.resolution.width, config.resolution.height, x, y).write(output, function(err) {
			if(err) console.log("error slicing image", err); //throw err;
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
		if (fs.existsSync(path.join("keys", config.host + "-server.key"))) {
			// Load the certificate files
			server_key = fs.readFileSync(path.join("keys", config.host + "-server.key"));
			server_crt = fs.readFileSync(path.join("keys", config.host + "-server.crt"));
			if(fs.existsSync(path.join("keys", config.host + "-ca.crt")))
				server_ca  = fs.readFileSync(path.join("keys", config.host + "-ca.crt"));
			// Build the crypto
			certs[config.host] = crypto.createCredentials({
					key:  server_key,
					cert: server_crt,
					ca:   server_ca
			}).context;
		} else {
			// remove the hostname from the FQDN and search for wildcard certificate
			//    syntax: _.rest.com.key or _.rest.bigger.com.key
			var domain = '_.' + config.host.split('.').slice(1).join('.');
			console.log("Domain:", domain);
			server_key = fs.readFileSync( path.join("keys", domain + ".key") );
			server_crt = fs.readFileSync( path.join("keys", domain + ".crt") );
			certs[config.host] = crypto.createCredentials({
				key: server_key, cert: server_crt,
				// no need for CA
			}).context;
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
			certs[ alth ] = crypto.createCredentials({
				key:  fs.readFileSync(path.join("keys", alth + "-server.key")),
				cert: fs.readFileSync(path.join("keys", alth + "-server.crt")),
				// CA is only needed for self-signed certs
				ca:   fs.readFileSync(path.join("keys", alth + "-ca.crt"))
			}).context;
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

	console.log(certs);

	var httpsOptions = {
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
	var url, external_url, localPath, ext;

    var fileKeys = Object.keys(files);
	fileKeys.forEach(function(key) {
		var file = files[key];
		appLoader.manageAndLoadUploadedFile(file, function(appInstance) {

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
			if(!remoteSites[index].connected){
				var remote = createRemoteConnection(wsURL, element, index);
				remoteSites[index].wsio = remote;
			}
		}, 15000);
	});
}

function createRemoteConnection(wsURL, element, index) {
	var remote = new websocketIO(wsURL, false, function() {
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

server.on('listening', function (e) {
	// Success
	console.log('Now serving SAGE2 at https://' + config.host + ':' + config.port + '/sageUI.html');
});

// Place callback for errors in the 'listen' call for HTTP
index.on('error', function (e) {
	if (e.code == 'EACCES') {
		console.log("HTTP_server> You are not allowed to use the port: ", config.index_port);
		console.log("HTTP_server>   use a different port or get authorization (sudo, setcap, ...)");
		console.log(" ");
		process.exit(1);
	}
	else if (e.code == 'EADDRINUSE') {
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
index.on('listening', function (e) {
	// Success
	console.log('Now serving SAGE2 index at http://' + config.host + ':' + config.index_port);
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

// CTRL-C intercept
process.on('SIGINT', function() {
	saveSession();
	assets.saveAssets();
	if( omicronRunning )
		omicronManager.disconnect();
	console.log('');
	console.log('SAGE2 done');
	console.log('');
	process.exit(0);
});


// Start the HTTP server
index.listen(config.index_port);
// Start the HTTPS server
server.listen(config.port);


// ***************************************************************************************

// Load session file if specified on the command line (-s)
if (program.session) {
	// if -s specified without argument
	if (program.session === true) loadSession();
	// if argument specified
	else loadSession(program.session);
}

// Command loop: reading input commands
if (program.interactive)
{
	// Create line reader for stdin and stdout
	var shell = readline.createInterface({
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
				console.log('sessions\tlist the available sessions');
				console.log('exit\t\tstop SAGE2');
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

			case 'close':
			case 'delete':
			case 'kill':
				if (command[1] !== undefined) {
					var kid = parseInt(command[1], 10); // convert arg1 to base 10
					if (! isNaN(kid) && (kid >= 0) && (kid < applications.length) ) {
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

			case 'exit':
			case 'quit':
			case 'bye':
				saveSession();
				assets.saveAssets();
				if( omicronRunning )
					omicronManager.disconnect();
				console.log('');
				console.log('SAGE2 done');
				console.log('');
				process.exit(0);
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
		saveSession();
		assets.saveAssets();
		if( omicronRunning )
			omicronManager.disconnect();
		console.log('');
		console.log('SAGE2 done');
		console.log('');
		process.exit(0);
	});
}


// ***************************************************************************************

function broadcast(func, data, type) {
	for(var i=0; i<clients.length; i++){
		if(clients[i].messages[type]) clients[i].emit(func, data);
	}
}

function findRemoteSiteByConnection(wsio) {
	var remoteIdx = -1;
	for(var i=0; i<config.remote_sites.length; i++){
		if(wsio.remoteAddress.address == config.remote_sites[i].host && wsio.remoteAddress.port == config.remote_sites[i].port)
			remoteIdx = i;
	}
	if(remoteIdx >= 0) return remoteSites[remoteIdx];
	else               return null;
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

function findControlsUnderPointer(pointerX, pointerY) {
	for(var i=controls.length-1; i>=0; i--){
		if (controls[i]!== null && pointerX >= controls[i].left && pointerX <= (controls[i].left+controls[i].width) && pointerY >= controls[i].top && pointerY <= (controls[i].top+controls[i].height)){
			if (controls[i].show === true)
				return controls[i];
			else
				return null;
		}
	}
	return null;
}

function findControlByAppId(id) {
	for (var i=controls.length-1; i>=0; i--) {
		if (controls[i].id === id+'_controls') {
			return controls[i];
		}
	}
	return null;
}

function hideControl(ctrl){
	if (ctrl.show === true) {
		ctrl.show = false;
		broadcast('hideControl',{id:ctrl.id},'receivesWidgetEvents');	
	}
}

function showControl(ctrl, pointerX, pointerY){
	if (ctrl.show === false) {
		ctrl.show = true;
		var dt = new Date();
		var rightMargin = config.totalWidth - ctrl.width;
		var bottomMargin = config.totalHeight - ctrl.height;
		ctrl.left = (pointerX > rightMargin)? rightMargin: pointerX-ctrl.height/2;
		ctrl.top = (pointerY > bottomMargin)? bottomMargin: pointerY-ctrl.height/2 ;
		broadcast('setControlPosition',{date:dt, elemId: ctrl.id, elemLeft:ctrl.left, elemTop: ctrl.top},'receivesWidgetEvents');
		broadcast('showControl',{id:ctrl.id},'receivesWidgetEvents');	
	}
}

function moveControlToPointer(ctrl, pointerX, pointerY){
	var dt = new Date();
	var rightMargin = config.totalWidth - ctrl.width;
	var bottomMargin = config.totalHeight - ctrl.height;
	ctrl.left = (pointerX > rightMargin)? rightMargin: pointerX-ctrl.height/2;
	ctrl.top = (pointerY > bottomMargin)? bottomMargin: pointerY-ctrl.height/2 ;
	broadcast('setControlPosition',{date:dt, elemId: ctrl.id, elemLeft:ctrl.left, elemTop: ctrl.top},'receivesWidgetEvents');
}


function findAppById(id) {
	var i;
	for(i=0; i<applications.length; i++){
		if(applications[i].id === id) return applications[i];
	}
	return null;
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

function getItemPositionSizeType(item) {
	return {type: item.type, id: item.id, left: item.left, top: item.top,
			width: item.width, height: item.height, aspect: item.aspect};
}

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
	sagePointers[uniqueID] = new sagepointer(uniqueID+"_pointer");
	remoteInteraction[uniqueID] = new interaction(config);

	broadcast('createSagePointer', sagePointers[uniqueID], 'receivesPointerData');
}

function showPointer( uniqueID, data ) {
	if( sagePointers[uniqueID] === undefined )
		return;
	// From startSagePointer
	console.log("starting pointer: " + uniqueID);

	sagePointers[uniqueID].start(data.label, data.color);
	broadcast('showSagePointer', sagePointers[uniqueID], 'receivesPointerData');
}

function hidePointer( uniqueID ) {
	if( sagePointers[uniqueID] === undefined )
		return;

	// From stopSagePointer
	sagePointers[uniqueID].stop();
	broadcast('hideSagePointer', sagePointers[uniqueID], 'receivesPointerData');
}

// Copied from pointerPress. Eventually a touch gesture will use this to toggle modes
function togglePointerMode(uniqueID) {
	if( sagePointers[uniqueID] === undefined )
		return;

	remoteInteraction[uniqueID].toggleModes();
	broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode } , 'receivesPointerData' );
}


function pointerPress( uniqueID, pointerX, pointerY, data ) {
	if ( sagePointers[uniqueID] === undefined ) return;
	
	// widgets
	var ct = findControlsUnderPointer(pointerX, pointerY);
	if (ct !== null) {
		if(data.button === "left"){
			remoteInteraction[uniqueID].selectMoveControl(ct, pointerX, pointerY);
			broadcast('requestControlId', {addr:uniqueID, ptrId:sagePointers[uniqueID].id, x:pointerX, y:pointerY}, 'receivesWidgetEvents');
		}
		else if(data.button === "right"){
			if(ct.show === true) hideControl(ct);
		}
		return ;
	}else{
		var lockedControl = remoteInteraction[uniqueID].lockedControl(); //If a text input widget was locked, drop it
		if (lockedControl !== null) {
			var data = {ctrlId:lockedControl.ctrlId, appId:lockedControl.appId};
			broadcast('dropTextInputControl', data ,'receivesWidgetEvents');
			remoteInteraction[uniqueID].dropControl();
		}
	}
	
	
	
	// Middle click switches interaction mode too
	if (data.button === "middle") {
		togglePointerMode(uniqueID);
		return;
	}
	
	// Radial Menu
	if( radialMenuEvent( { type: "pointerPress", id: uniqueID, x: pointerX, y: pointerY, data: data }  ) === true )
		return; // Radial menu is using the event

	if(data.button === "right")
	{
		createRadialMenu( uniqueID, pointerX, pointerY );
	}
	
	// apps
	var elemCtrl;
	var elem = findAppUnderPointer(pointerX, pointerY);
	if(elem !== null){
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
				}
				// otherwise - select for move
				else{
					remoteInteraction[uniqueID].selectMoveItem(elem, pointerX, pointerY); //will only go through if window management mode
				}
			}
			else if(data.button === "right"){
				elemCtrl = findControlByAppId(elem.id);
				if (elemCtrl === null) {
					broadcast('requestNewControl',{elemId: elem.id, user_id: sagePointers[uniqueID].id, user_label: sagePointers[uniqueID].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
				}
				else if (elemCtrl.show === false) {
					showControl(elemCtrl, pointerX, pointerY) ;
				}
				else {
					moveControlToPointer(elemCtrl, pointerX, pointerY) ;
				}
			}
		}
		if ( remoteInteraction[uniqueID].appInteractionMode() || elem.application === 'thumbnailBrowser' ) {
			if (pointerY >=elem.top && pointerY <= elem.top+config.ui.titleBarHeight){
				if(data.button === "right"){
					elemCtrl = findControlByAppId(elem.id);
					if (elemCtrl === null) {
						broadcast('requestNewControl',{elemId: elem.id, user_id: sagePointers[uniqueID].id, user_label: sagePointers[uniqueID].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
					}
					else if (elemCtrl.show === false) {
						showControl(elemCtrl, pointerX, pointerY) ;
					}
					else {
						moveControlToPointer(elemCtrl, pointerX, pointerY) ;
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
			}
		}

		var newOrder = moveAppToFront(elem.id);
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
		var elemCtrl = findControlByAppId(elem.id);
		if ( remoteInteraction[address].windowManagementMode() ) {
			if (elemCtrl === null) {
				broadcast('requestNewControl',{elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
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
					broadcast('requestNewControl',{elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
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
		broadcast('requestNewControl',{elemId: null, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
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
			broadcast('pointerReleaseRight',{elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
		}
		else if ( remoteInteraction[address].appInteractionMode() ) {
			if (pointerY >=elem.top && pointerY <= elem.top+config.ui.titleBarHeight){
				broadcast('pointerReleaseRight',{elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
			}
			else{
				var itemRelX = pointerX - elem.left;
				var itemRelY = pointerY - elem.top - config.ui.titleBarHeight;
				broadcast( 'eventInItem', { eventType: "pointerRelease", elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, itemRelativeX: itemRelX, itemRelativeY: itemRelY, data: {button: "right", user_color: sagePointers[address].color}, date: now }, 'receivesPointerData');
			}
		}
	}
	else {
		broadcast('pointerReleaseRight',{elemId: null, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
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
	
	// From pointerRelease
	var elem = findAppUnderPointer(pointerX, pointerY);
	
	if( remoteInteraction[uniqueID].windowManagementMode() ){
		if(data.button === "left"){
			if(remoteInteraction[uniqueID].selectedResizeItem !== null){
				broadcast('finishedResize', {id: remoteInteraction[uniqueID].selectedResizeItem.id, elemWidth: remoteInteraction[uniqueID].selectedResizeItem.width, elemHeight: remoteInteraction[uniqueID].selectedResizeItem.height, date: new Date()}, 'receivesWindowModification');
				remoteInteraction[uniqueID].releaseItem(true);
			}
			if(remoteInteraction[uniqueID].selectedMoveItem !== null){
				var remoteIdx = -1;
				for(var i=0; i<remoteSites.length; i++){
					if(sagePointers[uniqueID].left >= remoteSites[i].pos && sagePointers[uniqueID].left <= remoteSites[i].pos+remoteSites[i].width &&
						sagePointers[uniqueID].top >= 2 && sagePointers[uniqueID].top <= remoteSites[i].height) {
						remoteIdx = i;
						break;
					}
				}
				if(remoteIdx < 0){
					remoteInteraction[uniqueID].releaseItem(true);
				}
				else{
					var app = findAppById(remoteInteraction[uniqueID].selectedMoveItem.id);
					remoteSites[remoteIdx].wsio.emit('addNewElementFromRemoteServer', app);
					var updatedItem = remoteInteraction[uniqueID].releaseItem(false);
					if(updatedItem !== null) broadcast('setItemPosition', updatedItem, 'receivesWindowModification');
				}
			}
		}
		else if(data.button === "right"){
			if( elem !== null ){
				// index.hmtl has no 'pointerReleaseRight' message.
				// I renamed 'pointerPressRight' to 'requestNewControl'
				// since this function could come from any device (not just a right mouse click)
				broadcast('pointerReleaseRight',{elemId: elem.id, user_id: sagePointers[uniqueID].id, user_label: sagePointers[uniqueID].label, x: pointerX, y: pointerY, date: new Date() }, 'receivesPointerData');
			}
		}
	}
	if ( remoteInteraction[uniqueID].appInteractionMode() || (elem !== null && elem.application === 'thumbnailBrowser') ) {
		if( elem !== null ){
			if (pointerY >=elem.top && pointerY <= elem.top+config.ui.titleBarHeight){
				if(data.button === "right"){
					// index.hmtl has no 'pointerReleaseRight' message.
					// I renamed 'pointerPressRight' to 'requestNewControl'
					// since this function could come from any device (not just a right mouse click)
					broadcast('pointerReleaseRight',{elemId: elem.id, user_id: sagePointers[uniqueID].id, user_label: sagePointers[uniqueID].label, x: pointerX, y: pointerY, date: new Date() }, 'receivesPointerData');
				}
			}
			else {
				var elemX = pointerX - elem.left;
				var elemY = pointerY - elem.top - config.ui.titleBarHeight;
		
				var ePosition = {x: elemX, y: elemY};
				var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
				var now = new Date();
		
				var event = {id: elem.id, type: "pointerRelease", position: ePosition, user: eUser, data: data, date: now};
		
				broadcast('eventInItem', event, 'receivesInputEvents');
			}
		}
	}

}

function pointerMove(uniqueID, pointerX, pointerY, data) {
	if( sagePointers[uniqueID] === undefined )
		return;
		
	sagePointers[uniqueID].left += data.deltaX;
	sagePointers[uniqueID].top += data.deltaY;
	if(sagePointers[uniqueID].left < 0)                 sagePointers[uniqueID].left = 0;
	if(sagePointers[uniqueID].left > config.totalWidth) sagePointers[uniqueID].left = config.totalWidth;
	if(sagePointers[uniqueID].top < 0)                  sagePointers[uniqueID].top = 0;
	if(sagePointers[uniqueID].top > config.totalHeight) sagePointers[uniqueID].top = config.totalHeight;

	broadcast('updateSagePointerPosition', sagePointers[uniqueID], 'receivesPointerData');
	
	// Radial Menu
	if( radialMenuEvent( { type: "pointerMove", id: uniqueID, x: pointerX, y: pointerY, data: data }  ) === true )
		return; // Radial menu is using the event
		
	var elem = findAppUnderPointer(pointerX, pointerY);
	
	// widgets
	var updatedControl = remoteInteraction[uniqueID].moveSelectedControl(sagePointers[uniqueID].left, sagePointers[uniqueID].top);
	if (updatedControl !== null) {
		broadcast('setControlPosition', updatedControl, 'receivesPointerData');
		return;
	}
	var lockedControl = remoteInteraction[uniqueID].lockedControl();
	if (lockedControl && /slider/.test(lockedControl.ctrlId)){
		broadcast('moveSliderKnob', {ctrl:lockedControl, x:sagePointers[uniqueID].left}, 'receivesPointerData');
		return;
	}
	
	// move / resize window
	if(remoteInteraction[uniqueID].windowManagementMode()){
		var updatedMoveItem = remoteInteraction[uniqueID].moveSelectedItem(pointerX, pointerY);
		var updatedResizeItem = remoteInteraction[uniqueID].resizeSelectedItem(pointerX, pointerY);
		if(updatedMoveItem !== null){
			broadcast('setItemPosition', updatedMoveItem, 'receivesWindowModification');
		}
		else if(updatedResizeItem !== null){
			broadcast('setItemPositionAndSize', updatedResizeItem, 'receivesWindowModification');
		}
		// update hover corner (for resize)
		else{
			if(elem !== null){
				var localX = pointerX - elem.left;
				var localY = pointerY - (elem.top+config.ui.titleBarHeight);
				var cornerSize = Math.min(elem.width, elem.height) / 5;
				// bottom right corner - select for drag resize
				if(localX >= elem.width-cornerSize && localY >= elem.height-cornerSize){
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
	sagePointers[uniqueID].top = data.pointerY;
	if(sagePointers[uniqueID].left < 0) sagePointers[uniqueID].left = 0;
	if(sagePointers[uniqueID].left > config.totalWidth) sagePointers[uniqueID].left = config.totalWidth;
	if(sagePointers[uniqueID].top < 0) sagePointers[uniqueID].top = 0;
	if(sagePointers[uniqueID].top > config.totalHeight) sagePointers[uniqueID].top = config.totalHeight;
	
	broadcast('updateSagePointerPosition', sagePointers[uniqueID], 'receivesPointerData');
	var updatedItem = remoteInteraction[uniqueID].moveSelectedItem(sagePointers[uniqueID].left, sagePointers[uniqueID].top);
	if(updatedItem !== null) broadcast('setItemPosition', updatedItem, 'receivesWindowModification');
}

function pointerScrollStart( uniqueID, pointerX, pointerY ) {
	if( sagePointers[uniqueID] === undefined )
		return;
	var control = findControlsUnderPointer(pointerX,pointerY);
	if (control!==null)
		return;
	// Radial Menu
	if( radialMenuEvent( { type: "pointerScrollStart", id: uniqueID, x: pointerX, y: pointerY }  ) === true )
		return; // Radial menu is using the event
		
	var elem = findAppUnderPointer(pointerX, pointerY);

	if(elem !== null){
		remoteInteraction[uniqueID].selectScrollItem(elem, pointerX, pointerY);
		var newOrder = moveAppToFront(elem.id);
		broadcast('updateItemOrder', newOrder, 'receivesWindowModification');
	}
}

function pointerScroll( uniqueID, data ) {
	if( sagePointers[uniqueID] === undefined )
		return;
		
	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;
	
	var control = findControlsUnderPointer(pointerX,pointerY);
	if (control!==null)
		return;

	// Radial Menu
	if( radialMenuEvent( { type: "pointerScroll", id: uniqueID, x: pointerX, y: pointerY, data: data }  ) === true )
		return; // Radial menu is using the event
		
	if( remoteInteraction[uniqueID].windowManagementMode() ){
		var scale = 1.0 + Math.abs(data.wheelDelta)/512;
		if(data.wheelDelta > 0) scale = 1.0 / scale;
	
		var updatedItem = remoteInteraction[uniqueID].scrollSelectedItem(scale);
		if(updatedItem !== null){
			broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');

			if(remoteInteraction[uniqueID].selectTimeId[updatedItem.elemId] !== undefined){
				clearTimeout(remoteInteraction[uniqueID].selectTimeId[updatedItem.elemId]);
			}

			remoteInteraction[uniqueID].selectTimeId[updatedItem.elemId] = setTimeout(function() {
				broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
				remoteInteraction[uniqueID].selectedScrollItem = null;
			}, 500);
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
		}
	}
}

function pointerDraw(uniqueID, data) {
	if( sagePointers[uniqueID] === undefined )
		return;

	var ePos  = {x: 0, y: 0};
	var eUser = {id: sagePointers[uniqueID].id, label: 'drawing', color: [220,10,10]};
	var now   = new Date();
	var appId = null;

	for (var i=0;i<applications.length;i++) {
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

	var control = findControlsUnderPointer(pointerX,pointerY);
	if (control!==null){
		return;
	}
		
	// Radial Menu
	if( radialMenuEvent( { type: "pointerScroll", id: uniqueID, x: pointerX, y: pointerY }  ) === true )
		return; // Radial menu is using the event
		
	var elem = findAppUnderPointer(pointerX, pointerY);
	if (elem !== null) {
		if( elem.application === 'thumbnailBrowser' )
			return;
			
		if( remoteInteraction[uniqueID].windowManagementMode() ){
			var updatedItem;
			if (elem.maximized !== true) {
				// need to maximize the item
				updatedItem = remoteInteraction[uniqueID].maximizeSelectedItem(elem);
				if (updatedItem !== null) {
					broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
					// the PDF files need an extra redraw
					broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
				}
			} else {
				// already maximized, need to restore the item size
				updatedItem = remoteInteraction[uniqueID].restoreSelectedItem(elem);
				if (updatedItem !== null) {
					broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
					// the PDF files need an extra redraw
					broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
				}
			}
		}
	}
}

function pointerLeftZone(uniqueID, pointerX, pointerY) {
	if( sagePointers[uniqueID] === undefined )
		return;

	var elem = findAppUnderPointer(pointerX, pointerY);
	if (elem !== null) {
		if( remoteInteraction[uniqueID].windowManagementMode() ){
			var updatedItem;
			if (elem.maximized !== true) {
				// need to maximize the item
				updatedItem = remoteInteraction[uniqueID].maximizeLeftSelectedItem(elem);
				if (updatedItem !== null) {
					broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
					// the PDF files need an extra redraw
					broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
				}
			} else {
				// already maximized, need to restore the item size
				updatedItem = remoteInteraction[uniqueID].restoreSelectedItem(elem);
				if (updatedItem !== null) {
					broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
					// the PDF files need an extra redraw
					broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
				}
			}
		}
	}
}

function pointerRightZone(uniqueID, pointerX, pointerY) {
	if( sagePointers[uniqueID] === undefined )
		return;

	var elem = findAppUnderPointer(pointerX, pointerY);
	if (elem !== null) {
		if( remoteInteraction[uniqueID].windowManagementMode() ){
			var updatedItem;
			if (elem.maximized !== true) {
				// need to maximize the item
				updatedItem = remoteInteraction[uniqueID].maximizeRightSelectedItem(elem);
				if (updatedItem !== null) {
					broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
					// the PDF files need an extra redraw
					broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
				}
			} else {
				// already maximized, need to restore the item size
				updatedItem = remoteInteraction[uniqueID].restoreSelectedItem(elem);
				if (updatedItem !== null) {
					broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
					// the PDF files need an extra redraw
					broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
				}
			}
		}
	}
}

function pointerTopZone(uniqueID, pointerX, pointerY) {
	if( sagePointers[uniqueID] === undefined )
		return;

	var elem = findAppUnderPointer(pointerX, pointerY);
	if (elem !== null) {
		if( remoteInteraction[uniqueID].windowManagementMode() ){
			var updatedItem;
			if (elem.maximized !== true) {
				// need to maximize the item
				updatedItem = remoteInteraction[uniqueID].maximizeTopSelectedItem(elem);
				if (updatedItem !== null) {
					broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
					// the PDF files need an extra redraw
					broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
				}
			} else {
				// already maximized, need to restore the item size
				updatedItem = remoteInteraction[uniqueID].restoreSelectedItem(elem);
				if (updatedItem !== null) {
					broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
					// the PDF files need an extra redraw
					broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
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
			if (elem.maximized !== true) {
				// need to maximize the item
				updatedItem = remoteInteraction[uniqueID].maximizeFullSelectedItem(elem);
				if (updatedItem !== null) {
					broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
					// the PDF files need an extra redraw
					broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
				}
			} else {
				// already maximized, need to restore the item size
				updatedItem = remoteInteraction[uniqueID].restoreSelectedItem(elem);
				if (updatedItem !== null) {
					broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
					// the PDF files need an extra redraw
					broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
				}
			}
		}
	}
}

function pointerBottomZone(uniqueID, pointerX, pointerY) {
	if( sagePointers[uniqueID] === undefined )
		return;

	var elem = findAppUnderPointer(pointerX, pointerY);
	if (elem !== null) {
		if( remoteInteraction[uniqueID].windowManagementMode() ){
			var updatedItem;
			if (elem.maximized !== true) {
				// need to maximize the item
				updatedItem = remoteInteraction[uniqueID].maximizeBottomSelectedItem(elem);
				if (updatedItem !== null) {
					broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
					// the PDF files need an extra redraw
					broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
				}
			} else {
				// already maximized, need to restore the item size
				updatedItem = remoteInteraction[uniqueID].restoreSelectedItem(elem);
				if (updatedItem !== null) {
					broadcast('setItemPositionAndSize', updatedItem, 'receivesWindowModification');
					// the PDF files need an extra redraw
					broadcast('finishedResize', {id: updatedItem.elemId, elemWidth: updatedItem.elemWidth, elemHeight: updatedItem.elemHeight, date: new Date()}, 'receivesWindowModification');
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
		}
	}
}

function deleteApplication( elem ) {
	broadcast('deleteElement', {elemId: elem.id}, 'requiresFullApps');
	broadcast('deleteElement', {elemId: elem.id}, 'requiresAppPositionSizeTypeOnly');
	if(elem.application === "media_stream"){
		var broadcastWS = null;
		var mediaStreamData = elem.id.split("|");
		var broadcastAddress = mediaStreamData[0];
		var broadcastID = parseInt(mediaStreamData[1]);
		for(var i=0; i<clients.length; i++){
			var clientAddress = clients[i].remoteAddress.address + ":" + clients[i].remoteAddress.port;
			if(clientAddress == broadcastAddress) broadcastWS = clients[i];
		}

		if(broadcastWS !== null) broadcastWS.emit('stopMediaCapture', {streamId: broadcastID});
	}
	removeElement(applications, elem);
}

// **************  Omicron section *****************
var omicronRunning = false;
if ( config.experimental && config.experimental.omicron && config.experimental.omicron.enable === true ) {
	var omicronManager = new omicron( config );
	
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

/******** Radial Menu section ****************************************************************/
//createMediabrowser();
function createRadialMenu( uniqueID, pointerX, pointerY ) {
		
	var ct = findControlsUnderPointer(pointerX, pointerY);
	var elem = findAppUnderPointer(pointerX, pointerY);
	var now  = new Date();
	
	if( ct === null ) // Do not open menu over widget
	{
		if( elem === null )
		{
			radialMenus[uniqueID+"_menu"] = new radialmenu(uniqueID+"_menu", uniqueID);
			radialMenus[uniqueID+"_menu"].top = pointerY;
			radialMenus[uniqueID+"_menu"].left = pointerX;
	
			// Open a 'media' radial menu
			broadcast('createRadialMenu', { id: uniqueID, x: pointerX, y: pointerY }, 'receivesPointerData');
		}
		else
		{
			// Open a 'app' radial menu (or in this case application widget)
			var elemCtrl = findControlByAppId(elem.id);
			if (elemCtrl === null) {
				broadcast('requestNewControl',{elemId: elem.id, user_id: uniqueID, user_label: "Touch"+uniqueID, x: pointerX, y: pointerY, date: now }, 'receivesPointerData');
			}
			else if (elemCtrl.show === false) {
				showControl(elemCtrl, pointerX, pointerY) ;
			}
			else {
				moveControlToPointer(elemCtrl, pointerX, pointerY) ;
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

function radialMenuEvent( data )
{
	broadcast('radialMenuEvent', data, 'receivesPointerData');
	
	//{ type: "pointerPress", id: uniqueID, x: pointerX, y: pointerY, data: data }
	
	var radialMenu = radialMenus[data.id+"_menu"];
	if( radialMenu !== undefined )
	{
		radialMenu.onEvent( data )
		
		if( radialMenu.hasEventID(data.id) )
		{
			return true;
		}
		else
			return false;
	}
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
