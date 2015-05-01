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

// npm: defined in package.json
var formidable    = require('formidable');       // upload processor
var gm            = require('gm');               // graphicsmagick
var imageMagick;                                 // derived from graphicsmagick
var json5         = require('json5');            // JSON format that allows comments
var qrimage       = require('qr-image');         // qr-code generation
var sprint        = require('sprint');           // pretty formating (sprintf)

var Twit          = require('twit');             // twitter api

// custom node modules
var assets              = require('./src/node-assets');           // manages the list of files
var commandline         = require('./src/node-sage2commandline'); // handles command line parameters for SAGE2
var exiftool            = require('./src/node-exiftool');         // gets exif tags for images
var pixelblock          = require('./src/node-pixelblock');       // chops pixels buffers into square chunks
var sageutils           = require('./src/node-utils');            // provides the current version number

var HttpServer          = require('./src/node-httpserver');       // creates web server
var InteractableManager = require('./src/node-interactable');     // handles geometry and determining which object a point is over
var Interaction         = require('./src/node-interaction');      // handles sage interaction (move, resize, etc.)
var Loader              = require('./src/node-itemloader');       // handles sage item creation
var Omicron             = require('./src/node-omicron');          // handles Omicron input events
var Radialmenu          = require('./src/node-radialmenu');       // radial menu
var Sage2ItemList       = require('./src/node-sage2itemlist');    // list of SAGE2 items
var Sagepointer         = require('./src/node-sagepointer');      // handles sage pointers (creation, location, etc.)
var StickyItems         = require('./src/node-stickyitems');
var WebsocketIO         = require('./src/node-websocket.io');     // creates WebSocket server and clients


// Globals
global.__SESSION_ID    = null;

var sage2Server        = null;
var sage2ServerS       = null;
var wsioServer         = null;
var wsioServerS        = null;
var SAGE2_version      = sageutils.getShortVersion();
var platform           = os.platform() === "win32" ? "Windows" : os.platform() === "darwin" ? "Mac OS X" : "Linux";
var program            = commandline.initializeCommandLineParameters(SAGE2_version, emitLog);
var apis               = {};
var config             = loadConfiguration();
var imageMagickOptions = {imageMagick: true};
var ffmpegOptions      = {};
var publicDirectory    = "public";
var hostOrigin         = "";
var uploadsDirectory   = path.join(publicDirectory, "uploads");
var SAGE2Items         = {};
var users              = null;
var sessionDirectory   = path.join(__dirname, "sessions");
var appLoader          = null;
var interactMgr        = new InteractableManager();
var mediaBlockSize     = 128;
var startTime          = Date.now();


console.log(sageutils.header("SAGE2") + "Node Version: " + sageutils.getNodeVersion());
console.log(sageutils.header("SAGE2") + "Detected Server OS as:\t" + platform);
console.log(sageutils.header("SAGE2") + "SAGE2 Short Version:\t" + SAGE2_version);

// Initialize Server
initializeSage2Server();



function initializeSage2Server() {
	// Remove API keys from being investigated further
	//if (config.apis) delete config.apis;

	// Register with evl's server
	if (config.register_site) sageutils.registerSAGE2(config);

	// Check for missing packages
	sageutils.checkPackages(); // pass parameter `true` for devel packages also

	// Setup binaries path
	if(config.dependencies !== undefined) {
		if(config.dependencies.ImageMagick !== undefined) imageMagickOptions.appPath = config.dependencies.ImageMagick;
		if(config.dependencies.FFMpeg !== undefined) ffmpegOptions.appPath = config.dependencies.FFMpeg;
	}
	imageMagick = gm.subClass(imageMagickOptions);
	assets.setupBinaries(imageMagickOptions, ffmpegOptions);

	// Set default host origin for this server
	if(config.rproxy_port === undefined) {
		hostOrigin = "http://" + config.host + (config.index_port === 80 ? "" : ":" + config.index_port) + "/";
	}

	// Initialize sage2 item lists
	SAGE2Items.applications = new Sage2ItemList();
	SAGE2Items.pointers     = new Sage2ItemList();
	SAGE2Items.radialMenus  = new Sage2ItemList();
	SAGE2Items.widgets      = new Sage2ItemList();
	SAGE2Items.renderSync   = {};

	// Initialize user interaction tracking
	if (program.trackUsers) {
		if (typeof program.trackUsers === "string" && sageutils.fileExists(program.trackUsers))
			users = json5.parse(fs.readFileSync(program.trackUsers));
		else
			users = {};
		users.session = {};
		users.session.start = Date.now();

		if (!sageutils.fileExists("logs")) fs.mkdirSync("logs");
	}

	// Get full version of SAGE2 - git branch, commit, date
	sageutils.getFullVersion(function(version) {
		// fields: base commit branch date
		SAGE2_version = version;
		console.log(sageutils.header("SAGE2") + "Full Version:" + json5.stringify(SAGE2_version));
		broadcast('setupSAGE2Version', SAGE2_version);

		if (users !== null) users.session.verison = SAGE2_version;
	});

	// Generate a qr image that points to sage2 server
	var qr_png = qrimage.image(hostOrigin, { ec_level:'M', size: 15, margin:3, type: 'png' });
	var qr_out = path.join(uploadsDirectory, "images", "QR.png");
	qr_png.on('end', function() {
		console.log(sageutils.header("QR") + "image generated", qr_out);
	});
	qr_png.pipe(fs.createWriteStream(qr_out));

	// Setup tmp directory for SAGE2 server
	process.env.TMPDIR = path.join(__dirname, "tmp");
	console.log(sageutils.header("SAGE2") + "Temp folder: " + process.env.TMPDIR);
	if (!sageutils.fileExists(process.env.TMPDIR)) {
		fs.mkdirSync(process.env.TMPDIR);
	}
	// Setup tmp directory in uploads
	var uploadTemp = path.join(__dirname, "public", "uploads", "tmp");
	console.log(sageutils.header("SAGE2") + "Upload temp folder: " + uploadTemp);
	if (!sageutils.fileExists(uploadTemp)) {
		fs.mkdirSync(uploadTemp);
	}

	// Make sure sessions directory exists
	if (!sageutils.fileExists(sessionDirectory)) {
		fs.mkdirSync(sessionDirectory);
	}

	// Initialize assets
	assets.initialize(uploadsDirectory, 'uploads');

	// Initialize app loader
	appLoader = new Loader(publicDirectory, hostOrigin, config, imageMagickOptions, ffmpegOptions);

	// Initialize interactable manager and layers
	interactMgr.addLayer("staticUI",     3);
	interactMgr.addLayer("radialMenus",  2);
	interactMgr.addLayer("widgets",      1);
	interactMgr.addLayer("applications", 0);

	// Initialize the background for the display clients (image or color)
	setupDisplayBackground();

	// Set up http and https servers
	var httpServerApp = new HttpServer(publicDirectory);
	httpServerApp.httpPOST('/upload', uploadForm); // receive newly uploaded files from SAGE Pointer / SAGE UI
	httpServerApp.httpGET('/config',  sendConfig); // send config object to client using http request
	var options  = setupHttpsOptions();            // create HTTPS options - sets up security keys
	sage2Server  = http.createServer(httpServerApp.onrequest);
	sage2ServerS = https.createServer(options, httpServerApp.onrequest);

	// Set up websocket servers - 2 way communication between server and all browser clients
	wsioServer  = new WebsocketIO.Server({server: sage2Server});
	wsioServerS = new WebsocketIO.Server({server: sage2ServerS});
	wsioServer.onconnection(openWebSocketClient);
	wsioServerS.onconnection(openWebSocketClient);
}

function broadcast(name, data) {
	wsioServer.broadcast(name, data);
	wsioServerS.broadcast(name, data);
}

function emitLog(data) {
	if (wsioServer === null || wsioServerS === null) return;
	broadcast('console', data);
}


// global variables to manage clients
var clients = [];
var masterDisplay = null;
var webBrowserClient = null;
var sagePointers = {};
var remoteInteraction = {};
//var mediaStreams = {};
var mediaBlockStreams = {};
//var applications = []; // app windows

//var controls = [];     // app widget bars
//var radialMenus = {};  // radial menus


// Sticky items and window position for new clones
var stickyAppHandler   = new StickyItems();
var newWindowPosition  = null;
var seedWindowPosition = null;


function openWebSocketClient(wsio) {
	wsio.onclose(closeWebSocketClient);
	wsio.on('addClient', wsAddClient);
}

function closeWebSocketClient(wsio) {
	var i;
    var key;
    if (wsio.clientType === "display") {
		console.log(sageutils.header("Disconnect") + wsio.id + " (" + wsio.clientType + " " + wsio.clientID+ ")");
    }
    else {
		console.log(sageutils.header("Disconnect") + wsio.id + " (" + wsio.clientType + ")");
	}

	addEventToUserLog(wsio.id, {type: "disconnect", data: null, time: Date.now()});

	// if client is a remote site, send disconnect message
	var remote = findRemoteSiteByConnection(wsio);
	if (remote !== null) {
		console.log("Remote site \"" + remote.name + "\" now offline");
		remote.connected = false;
		var site = {name: remote.name, connected: remote.connected};
		broadcast('connectedToRemoteSite', site);
	}

	if (wsio.clientType === "sageUI") {
		hidePointer(wsio.id);
		removeControlsForUser(wsio.id);
		delete sagePointers[wsio.id];
		delete remoteInteraction[wsio.id];
	}
	else if (wsio.clientType === "display") {
		for (key in SAGE2Items.renderSync) {
			if (SAGE2Items.renderSync.hasOwnProperty(key)) {
				delete SAGE2Items.renderSync[key].clients[wsio.id];
			}
		}
		/*
		for (key in mediaBlockStreams) {
			if (mediaBlockStreams.hasOwnProperty(key)) {
				delete mediaBlockStreams[key].clients[wsio.id];
			}
		}
		for (key in mediaStreams) {
			if (mediaStreams.hasOwnProperty(key)) {
				delete mediaStreams[key].clients[wsio.id];
			}
		}
		for (key in videoHandles) {
			if (videoHandles.hasOwnProperty(key)) {
				delete videoHandles[key].clients[wsio.id];
			}
		}
        for (key in appAnimations) {
			if (appAnimations.hasOwnProperty(key)) {
				delete appAnimations[key].clients[wsio.id];
			}
		}
		*/
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

	// Just making sure the data is valid JSON (one gets strings from C++)
	if (sageutils.isTrue(data.requests.config)) data.requests.config = true;
	else data.requests.config = false;
	if (sageutils.isTrue(data.requests.version)) data.requests.version = true;
	else data.requests.version = false;
	if (sageutils.isTrue(data.requests.time)) data.requests.time = true;
	else data.requests.time = false;
	if (sageutils.isTrue(data.requests.console)) data.requests.console = true;
	else data.requests.console = false;

	wsio.updateRemoteAddress(data.host, data.port); // overwrite host and port if defined
	wsio.clientType = data.clientType;

	if (wsio.clientType === "display") {
		wsio.clientID = data.clientID;
		if (masterDisplay === null) {
			masterDisplay = wsio;
		}
		console.log(sageutils.header("Connect") + wsio.id + " (" + wsio.clientType + " " + wsio.clientID+ ")");
	}
	else {
		wsio.clientID = -1;
		console.log(sageutils.header("Connect") + wsio.id + " (" + wsio.clientType + ")");
	}

	clients.push(wsio);
	initializeWSClient(wsio, data.requests.config, data.requests.version, data.requests.time, data.requests.console);
}

function initializeWSClient(wsio, reqConfig, reqVersion, reqTime, reqConsole) {
	setupListeners(wsio);

	wsio.emit('initialize', {UID: wsio.id, time: Date.now(), start: startTime});
	if (wsio === masterDisplay) {
		wsio.emit('setAsMasterDisplay');
	}

	if (reqConfig)  wsio.emit('setupDisplayConfiguration', config);
	if (reqVersion) wsio.emit('setupSAGE2Version',         SAGE2_version);
	if (reqTime)    wsio.emit('setSystemTime',             {date: Date.now()});
	if (reqConsole) wsio.emit('console',                   json5.stringify(config, null, 4));

	if(wsio.clientType === "display") {
		initializeExistingSagePointers(wsio);
		initializeExistingApps(wsio);
		initializeRemoteServerInfo(wsio);
		//initializeMediaStreams(wsio.id);
		setTimeout(initializeExistingControls, 6000, wsio); // why can't this be done immediately with the rest?
	}
	else if (wsio.clientType === "sageUI") {
		createSagePointer(wsio.id);
		initializeExistingAppsPositionSizeTypeOnly(wsio);
	}

	var remote = findRemoteSiteByConnection(wsio);
	if(remote !== null){
		remote.wsio = wsio;
		remote.connected = true;
		var site = {name: remote.name, connected: remote.connected};
		broadcast('connectedToRemoteSite', site);
	}

	if (wsio.clientType === "webBrowser") webBrowserClient = wsio;
}

function setupListeners(wsio) {
	wsio.on('registerInteractionClient',            wsRegisterInteractionClient);

	wsio.on('startSagePointer',                     wsStartSagePointer);
	wsio.on('stopSagePointer',                      wsStopSagePointer);

	wsio.on('pointerPress',                         wsPointerPress);
	wsio.on('pointerRelease',                       wsPointerRelease);
	wsio.on('pointerDblClick',                      wsPointerDblClick);
	wsio.on('pointerPosition',                      wsPointerPosition);
	wsio.on('pointerMove',                          wsPointerMove);
	wsio.on('pointerScrollStart',                   wsPointerScrollStart);
	wsio.on('pointerScroll',                        wsPointerScroll);
	wsio.on('pointerScrollEnd',                     wsPointerScrollEnd);
	wsio.on('pointerDraw',                          wsPointerDraw);
	wsio.on('keyDown',                              wsKeyDown);
	wsio.on('keyUp',                                wsKeyUp);
	wsio.on('keyPress',                             wsKeyPress);

	wsio.on('uploadedFile',                         wsUploadedFile);

	wsio.on('startNewMediaStream',                  wsStartNewMediaStream);
	wsio.on('updateMediaStreamFrame',               wsUpdateMediaStreamFrame);
	wsio.on('updateMediaStreamChunk',               wsUpdateMediaStreamChunk);
	wsio.on('stopMediaStream',                      wsStopMediaStream);
	wsio.on('startNewMediaBlockStream',             wsStartNewMediaBlockStream);
	wsio.on('updateMediaBlockStreamFrame',          wsUpdateMediaBlockStreamFrame);
	wsio.on('stopMediaBlockStream',                 wsStopMediaBlockStream);

	wsio.on('requestVideoFrame',                    wsRequestVideoFrame);
	wsio.on('receivedMediaStreamFrame',             wsReceivedMediaStreamFrame);
	wsio.on('receivedRemoteMediaStreamFrame',       wsReceivedRemoteMediaStreamFrame);
	wsio.on('receivedMediaBlockStreamFrame',        wsReceivedMediaBlockStreamFrame);
	wsio.on('receivedRemoteMediaBlockStreamFrame',  wsReceivedRemoteMediaBlockStreamFrame);

	wsio.on('finishedRenderingAppFrame',            wsFinishedRenderingAppFrame);
	wsio.on('updateAppState',                       wsUpdateAppState);
	wsio.on('appResize',                            wsAppResize);
	wsio.on('broadcast',                            wsBroadcast);
	wsio.on('searchTweets',                         wsSearchTweets);

	wsio.on('requestAvailableApplications',         wsRequestAvailableApplications);
	wsio.on('requestStoredFiles',                   wsRequestStoredFiles);
	//wsio.on('addNewElementFromStoredFiles',         wsAddNewElementFromStoredFiles);
	wsio.on('loadApplication',                      wsLoadApplication);
	wsio.on('loadFileFromServer',                   wsLoadFileFromServer);
	wsio.on('deleteElementFromStoredFiles',         wsDeleteElementFromStoredFiles);
	wsio.on('saveSesion',                           wsSaveSesion);
	wsio.on('clearDisplay',                         wsClearDisplay);
	wsio.on('tileApplications',                     wsTileApplications);

	// Radial menu should have its own message section? Just appended here for now.
	wsio.on('radialMenuClick',                      wsRadialMenuClick);
	wsio.on('radialMenuMoved',                      wsRadialMenuMoved);
	wsio.on('removeRadialMenu',                     wsRemoveRadialMenu);
	wsio.on('radialMenuWindowToggle',               wsRadialMenuThumbnailWindow);

	wsio.on('addNewWebElement',                     wsAddNewWebElement);

	wsio.on('openNewWebpage',                       wsOpenNewWebpage);

	wsio.on('playVideo',                            wsPlayVideo);
	wsio.on('pauseVideo',                           wsPauseVideo);
	wsio.on('stopVideo',                            wsStopVideo);
	wsio.on('updateVideoTime',                      wsUpdateVideoTime);
	wsio.on('muteVideo',                            wsMuteVideo);
	wsio.on('unmuteVideo',                          wsUnmuteVideo);
	wsio.on('loopVideo',                            wsLoopVideo);

	wsio.on('addNewElementFromRemoteServer',        wsAddNewElementFromRemoteServer);
	wsio.on('requestNextRemoteFrame',               wsRequestNextRemoteFrame);
	wsio.on('updateRemoteMediaStreamFrame',         wsUpdateRemoteMediaStreamFrame);
	wsio.on('stopMediaStream',                      wsStopMediaStream);
    wsio.on('updateRemoteMediaBlockStreamFrame',    wsUpdateRemoteMediaBlockStreamFrame);
	wsio.on('stopMediaBlockStream',                 wsStopMediaBlockStream);

	wsio.on('addNewControl',                        wsAddNewControl);
	//wsio.on('selectedControlId',                    wsSelectedControlId);
	//wsio.on('releasedControlId',                    wsReleasedControlId);
	wsio.on('closeAppFromControl',                  wsCloseAppFromControl);
	wsio.on('hideWidgetFromControl',                wsHideWidgetFromControl);
	wsio.on('openRadialMenuFromControl',            wsOpenRadialMenuFromControl);
	wsio.on('recordInnerGeometryForWidget',			wsRecordInnerGeometryForWidget);

	wsio.on('createAppClone',                       wsCreateAppClone);

	wsio.on('sage2Log',                             wsPrintDebugInfo);
	wsio.on('command',                              wsCommand);
}

function initializeExistingControls(wsio){
	var i;
	var uniqueID;
	var app;
	var zIndex;
	var data;
	var controlList = SAGE2Items.widgets.list;
	for (i in controlList) {
		if (controlList.hasOwnProperty(i) && SAGE2Items.applications.list.hasOwnProperty(controlList[i].appId)) {
			data = controlList[i];
			wsio.emit('createControl', data);
			zIndex = SAGE2Items.widgets.numItems;
			interactMgr.addGeometry(data.id+"_radial", "widgets", "circle", {x: data.left+(data.height/2), y: data.top+(data.height/2), r: data.height/2}, true, zIndex, data);
			if (data.hasSideBar === true) {
				interactMgr.addGeometry(data.id+"_sidebar", "widgets", "rectangle", {x: data.left+data.height, y: data.top+(data.height/2)-(data.barHeight/2), w: data.width-data.height, h: data.barHeight}, true, zIndex, data);
			}
			SAGE2Items.widgets.addItem(data);
			uniqueID = data.id.substring(data.appId.length, data.id.lastIndexOf("_"));
			app = SAGE2Items.applications.list[data.appId];
			addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "open", application: {id: app.id, type: app.application}}, time: Date.now()});
		}
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
	var key;

	for (key in SAGE2Items.renderSync) {
		if (SAGE2Items.renderSync.hasOwnProperty(key)) {
			SAGE2Items.renderSync[key].clients[wsio.id] = {wsio: wsio, readyForNextFrame: false, blocklist: []};
			calculateValidBlocks(SAGE2Items.applications.list[key], mediaBlockSize, SAGE2Items.renderSync[key]);
		}
	}

	for (key in SAGE2Items.applications.list) {
		wsio.emit('createAppWindow', SAGE2Items.applications.list[key]);
	}

	var newOrder = interactMgr.getObjectZIndexList("applications");
	wsio.emit('updateItemOrder', newOrder);

	/*
	var i;
	for(i=0; i<applications.length; i++){
		wsio.emit('createAppWindow', applications[i]);
	}
	for(key in appAnimations){
		if (appAnimations.hasOwnProperty(key)) {
			appAnimations[key].clients[wsio.id] = false;
		}
	}
	*/
}

function initializeExistingAppsPositionSizeTypeOnly(wsio) {
	var key;
	for (key in SAGE2Items.applications.list) {
		wsio.emit('createAppWindowPositionSizeOnly', getAppPositionSize(SAGE2Items.applications.list[key]));
	}

	var newOrder = interactMgr.getObjectZIndexList("applications");
	wsio.emit('updateItemOrder', newOrder);

	/*
	var i;
	for(i=0; i<applications.length; i++){
		wsio.emit('createAppWindowPositionSizeOnly', getAppPositionSize(applications[i]));
	}
	*/
}

function initializeRemoteServerInfo(wsio) {
	for(var i=0; i<remoteSites.length; i++){
		var site = {name: remoteSites[i].name, connected: remoteSites[i].connected, geometry: remoteSites[i].geometry};
		wsio.emit('addRemoteSite', site);
	}
}

/*
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
        for(var i=0; i<clients.length; i++) {
            if(clients[i].clientType === "display" && mediaBlockStreams[key].clients[clients[i].id] === undefined){
                    mediaBlockStreams[key].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: true, blockList: []};
            }
        }
	}
}
*/

// **************  Sage Pointer Functions *****************

function wsRegisterInteractionClient(wsio, data) {
	var key;
	if(program.trackUsers === true) {
		var newUser = true;
		for(key in users) {
			if(users[key].name === data.name && users[key].color.toLowerCase() === data.color.toLowerCase()) {
				users[key].ip = wsio.id;
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
			users[id].ip = wsio.id;
			if(users[id].actions === undefined) users[id].actions = [];
			users[id].actions.push({type: "connect", data: null, time: Date.now()});
		}
	}
	else {
		for(key in users) {
			if(users[key].name === data.name && users[key].color.toLowerCase() === data.color.toLowerCase()) {
				users[key].ip = wsio.id;
				if(users[key].actions === undefined) users[key].actions = [];
				users[key].actions.push({type: "connect", data: null, time: Date.now()});
			}
		}
	}
}

function wsStartSagePointer(wsio, data) {
	showPointer(wsio.id, data);

	addEventToUserLog(wsio.id, {type: "SAGE2PointerStart", data: null, time: Date.now()});
}

function wsStopSagePointer(wsio, data) {
	hidePointer(wsio.id);

	//return to window interaction mode after stopping pointer
	if(remoteInteraction[wsio.id].appInteractionMode()){
		remoteInteraction[wsio.id].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[wsio.id].id, mode: remoteInteraction[wsio.id].interactionMode });
	}

	addEventToUserLog(wsio.id, {type: "SAGE2PointerEnd", data: null, time: Date.now()});
	//addEventToUserLog(uniqueID, {type: "SAGE2PointerMode", data: {mode: "windowManagement"}, time: Date.now()});
}

function wsPointerPress(wsio, data) {
	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;

	pointerPress(wsio.id, pointerX, pointerY, data);
}

function wsPointerRelease(wsio, data) {
	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;

	/*
	if (data.button === 'left')
		pointerRelease(wsio.id, pointerX, pointerY);
	else
		pointerReleaseRight(wsio.id, pointerX, pointerY);
	*/
	pointerRelease(wsio.id, pointerX, pointerY, data);
}

function wsPointerDblClick(wsio, data) {
	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;

	pointerDblClick(wsio.id, pointerX, pointerY);
}

function wsPointerPosition(wsio, data) {
	pointerPosition(wsio.id, data);
}

function wsPointerMove(wsio, data) {
	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;

	pointerMove(wsio.id, pointerX, pointerY, data);
}

function wsPointerScrollStart(wsio, data) {
	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;

	pointerScrollStart(wsio.id, pointerX, pointerY);
}

function wsPointerScroll(wsio, data) {
	// Casting the parameters to correct type
	data.wheelDelta = parseInt(data.wheelDelta, 10);

	pointerScroll(wsio.id, data);
}

function wsPointerScrollEnd(wsio, data) {
	pointerScrollEnd(wsio.id);
}

function wsPointerDraw(wsio, data) {
	pointerDraw(wsio.id, data);
}

function wsKeyDown(wsio, data) {
	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;

	keyDown(wsio.id, pointerX, pointerY, data);

	/*
	if (data.code === 16) { // shift
		remoteInteraction[wsio.id].SHIFT = true;
	}
	else if (data.code === 17) { // ctrl
		remoteInteraction[wsio.id].CTRL = true;
	}
	else if (data.code === 18) { // alt
		remoteInteraction[wsio.id].ALT = true;
	}
	else if (data.code === 20) { // caps lock
		remoteInteraction[wsio.id].CAPS = true;
	}
	else if (data.code === 91 || data.code === 92 || data.code === 93){
		// command
		remoteInteraction[wsio.id].CMD = true;
	}

	//SEND SPECIAL KEY EVENT only will come here
	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;

	var control = findControlsUnderPointer(pointerX, pointerY);
	if (control!==null){
		return;
	}


	if(remoteInteraction[wsio.id].appInteractionMode()){
		keyDown(wsio.id, pointerX, pointerY, data);
	}
	*/
}

function wsKeyUp(wsio, data) {
	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;

	keyUp(wsio.id, pointerX, pointerY, data);

	/*
	if (data.code === 16) { // shift
		remoteInteraction[wsio.id].SHIFT = false;
	}
	else if (data.code === 17) { // ctrl
		remoteInteraction[wsio.id].CTRL = false;
	}
	else if (data.code === 18) { // alt
		remoteInteraction[wsio.id].ALT = false;
	}
	else if (data.code === 20) { // caps lock
		remoteInteraction[wsio.id].CAPS = false;
	}
	else if (data.code === 91 || data.code === 92 || data.code === 93) { // command
		remoteInteraction[wsio.id].CMD = false;
	}

	if (remoteInteraction[wsio.id].modeChange !== undefined && (data.code === 9 || data.code === 16)) return;

	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;

	var control = findControlsUnderPointer(pointerX, pointerY);

	var lockedControl = remoteInteraction[wsio.id].lockedControl();

	if (lockedControl !== null) {
		var event = {code: data.code, printable:false, state: "up", ctrlId:lockedControl.ctrlId, appId:lockedControl.appId, instanceID:lockedControl.instanceID};
		broadcast('keyInTextInputWidget', event);
		if (data.code === 13) { //Enter key
			remoteInteraction[wsio.id].dropControl();
		}
		return;
	}
	else if (control!==null){
		return;
	}



	var elem = findAppUnderPointer(pointerX, pointerY);

	if(elem !== null){
		if(remoteInteraction[wsio.id].windowManagementMode()){
			if(data.code === 8 || data.code === 46){ // backspace or delete
				deleteApplication(elem);

				addEventToUserLog(wsio.id, {type: "delete", data: {application: {id: elem.id, type: elem.application}}, time: Date.now()});
			}
		}
		else if(remoteInteraction[wsio.id].appInteractionMode()) {	//only send special keys
			keyUp(wsio.id, pointerX, pointerY, data);
		}
	}
	*/
}

function wsKeyPress(wsio, data) {
	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;

	keyPress(wsio.id, pointerX, pointerY, data);
	/*
	var lockedControl = remoteInteraction[wsio.id].lockedControl();
	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;
	var control = findControlsUnderPointer(pointerX, pointerY);

	if (data.code === 9 && remoteInteraction[wsio.id].SHIFT && sagePointers[wsio.id].visible) {
		// shift + tab
		remoteInteraction[wsio.id].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[wsio.id].id, mode: remoteInteraction[wsio.id].interactionMode});

		//if(remoteInteraction[wsio.id].interactionMode === 0)
		//	addEventToUserLog(wsio.id, {type: "SAGE2PointerMode", data: {mode: "windowManagement"}, time: Date.now()});
		//else
		//	addEventToUserLog(wsio.id, {type: "SAGE2PointerMode", data: {mode: "applicationInteraction"}, time: Date.now()});

		if (remoteInteraction[wsio.id].modeChange !== undefined) {
			clearTimeout(remoteInteraction[wsio.id].modeChange);
		}
		remoteInteraction[wsio.id].modeChange = setTimeout(function() {
			delete remoteInteraction[wsio.id].modeChange;
		}, 500);
	}
	else if (lockedControl !== null){
		var event = {code: data.code, printable:true, state: "down", ctrlId:lockedControl.ctrlId, appId:lockedControl.appId, instanceID:lockedControl.instanceID};
		broadcast('keyInTextInputWidget', event);
		if (data.code === 13){ //Enter key
			addEventToUserLog(wsio.id, {type: "widgetAction", data: {application: lockedControl.appId, widget: lockedControl.ctrlId}, time: Date.now()});

			remoteInteraction[wsio.id].dropControl();
		}
	}
	else if(control!==null){
		return;
	}
	else if ( remoteInteraction[wsio.id].appInteractionMode() ) {
		keyPress(wsio.id, pointerX, pointerY, data);
	}
`	*/
}

// **************  File Upload Functions *****************
function wsUploadedFile(wsio, data) {
	addEventToUserLog(wsio.id, {type: "fileUpload", data: data, time: Date.now()});
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
	console.log("received new stream: ", data.id);

	var i;
	SAGE2Items.renderSync[data.id] = {clients: {}, chunks: []};
	for (i=0; i<clients.length; i++) {
		if(clients[i].clientType === "display") {
			SAGE2Items.renderSync[data.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: false, blocklist: []};
		}
	}

	// forcing 'int' type for width and height
	data.width  = parseInt(data.width,  10);
	data.height = parseInt(data.height, 10);

	appLoader.createMediaStream(data.src, data.type, data.encoding, data.title, data.color, data.width, data.height, function(appInstance) {
		appInstance.id = data.id;
		handleNewApplication(appInstance, null);

		var eLogData = {
			application: {
				id: appInstance.id,
				type: appInstance.application
			}
		};
		addEventToUserLog(wsio.id, {type: "mediaStreamStart", data: eLogData, time: Date.now()});
	});

	/*
	mediaStreams[data.id] = {chunks: [], clients: {}, ready: true, timeout: null};
	for(var i=0; i<clients.length; i++){
		if(clients[i].clientType === "display") {
			mediaStreams[data.id].clients[clients[i].id] = false;
		}
	}

	// Forcing 'int' type for width and height
	//     for some reasons, messages from websocket lib from Linux send strings for ints
	data.width  = parseInt(data.width,  10);
	data.height = parseInt(data.height, 10);

	appLoader.createMediaStream(data.src, data.type, data.encoding, data.title, data.color, data.width, data.height, function(appInstance) {
		appInstance.id = data.id;
		handleNewApplication(appInstance, null);

		addEventToUserLog(wsio.id, {type: "mediaStreamStart", data: {application: {id: appInstance.id, type: appInstance.application}}, time: Date.now()});
	});

	// Debug media stream freezing
	mediaStreams[data.id].timeout = setTimeout(function() {
		console.log("Start: 5 sec with no updates from: " + data.id);
		console.log(mediaStreams[data.id].clients);
		console.log("ready: " + mediaStreams[data.id].ready);
	}, 5000);
	*/
}

function wsUpdateMediaStreamFrame(wsio, data) {
	var key;
	for (key in SAGE2Items.renderSync[data.id].clients) {
		SAGE2Items.renderSync[data.id].clients[key].readyForNextFrame = false;
	}

	var stream = SAGE2Items.applications.list[data.id];
	if (stream !== undefined && stream !== null) {
		stream.data = data.state;
	}

	broadcast('updateMediaStreamFrame', data);

	/*
	mediaStreams[data.id].ready = true;
	for(var key in mediaStreams[data.id].clients){
		mediaStreams[data.id].clients[key] = false;
	}

	var stream = findAppById(data.id);
	if(stream !== null) stream.data = data.state;

	broadcast('updateMediaStreamFrame', data);

	// Debug media stream freezing
	clearTimeout(mediaStreams[data.id].timeout);
	mediaStreams[data.id].timeout = setTimeout(function() {
		console.log("Update: 5 sec with no updates from: " + data.id);
		console.log(mediaStreams[data.id].clients);
		console.log("ready: " + mediaStreams[data.id].ready);
		if(mediaStreams[data.id].chunks.length === 0)
			console.log("chunks received: " + allNonBlank(mediaStreams[data.id].chunks));
	}, 5000);
	*/
}

function wsUpdateMediaStreamChunk(wsio, data) {
	if (SAGE2Items.renderSync[data.id].chunks.length === 0) SAGE2Items.renderSync[data.id].chunks = initializeArray(data.total, "");
	SAGE2Items.renderSync[data.id].chunks[data.piece] = data.state.src;
	if (allNonBlank(SAGE2Items.renderSync[data.id].chunks)) {
		wsUpdateMediaStreamFrame(wsio, {id: data.id, state: {src: SAGE2Items.renderSync[data.id].chunks.join(""), type: data.state.type, encoding: data.state.encoding}});
		SAGE2Items.renderSync[data.id].chunks = [];
	}

	/*
	if(mediaStreams[data.id].chunks.length === 0) mediaStreams[data.id].chunks = initializeArray(data.total, "");
	mediaStreams[data.id].chunks[data.piece] = data.state.src;
	if(allNonBlank(mediaStreams[data.id].chunks)){
		wsUpdateMediaStreamFrame(wsio, {id: data.id, state: {src: mediaStreams[data.id].chunks.join(""), type: data.state.type, encoding: data.state.encoding}});
		mediaStreams[data.id].chunks = [];
	}
	*/
}

function wsStopMediaStream(wsio, data) {
	var stream = SAGE2Items.applications.list[data.id];
	if (stream !== undefined && stream !== null) {
		deleteApplication(stream.id);

		var eLogData = {
			application: {
				id: stream.id,
				type: stream.application
			}
		};
		addEventToUserLog(wsio.id, {type: "delete", data: eLogData, time: Date.now()});
	}

	/*
	var elem = findAppById(data.id);
	if(elem !== null) {
		deleteApplication( elem );

		addEventToUserLog(wsio.id, {type: "delete", data: {application: {id: elem.id, type: elem.application}}, time: Date.now()});
	}

	addEventToUserLog(wsio.id, {type: "mediaStreamEnd", data: {application: {id: data.id, type: "media_stream"}}, time: Date.now()});
	*/
}

function wsReceivedMediaStreamFrame(wsio, data) {
	SAGE2Items.renderSync[data.id].clients[wsio.id].readyForNextFrame = true;
	if (allTrueDict(SAGE2Items.renderSync[data.id].clients, "readyForNextFrame")) {
		var i;
		var sender = {wsio: null, serverId: null, clientId: null, streamId: null};
		var mediaStreamData = data.id.split("|");
		if (mediaStreamData.length === 2) { // local stream --> client | stream_id
			sender.clientId = mediaStreamData[0];
			sender.streamId = parseInt(mediaStreamData[1]);
			for (i=0; i<clients.length; i++) {
				if (clients[i].id === sender.clientId) {
					sender.wsio = clients[i];
					break;
				}
			}
			if (sender.wsio !== null) sender.wsio.emit('requestNextFrame', {streamId: sender.streamId});
		}
		else if (mediaStreamData.length === 3) { // remote stream --> remote_server | client | stream_id
			sender.serverId = mediaStreamData[0];
			sender.clientId = mediaStreamData[1];
			sender.streamId = mediaStreamData[2];
			for (i=0; i<clients.length; i++) {
				if (clients[i].id === sender.serverId) {
					sender.wsio = clients[i];
					break;
				}
			}
			if (sender.wsio !== null) sender.wsio.emit('requestNextRemoteFrame', {id: sender.clientId + "|" + sender.streamId});
		}
	}

	/*
	var i;
	var broadcastAddress, broadcastID;
	var serverAddress, clientAddress;

	mediaStreams[data.id].clients[wsio.id] = true;
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
	*/
}

// **************  Media Block Stream Functions *****************
function wsStartNewMediaBlockStream(wsio, data) {
    console.log("Starting media stream: ", data);
    // Forcing 'int' type for width and height
	//     for some reasons, messages from websocket lib from Linux send strings for ints
	data.width  = parseInt(data.width,  10);
	data.height = parseInt(data.height, 10);


	SAGE2Items.renderSync[data.id] = {chunks: [], clients: {}, width: data.width, height: data.height};
	for (var i=0; i<clients.length; i++) {
		if(clients[i].clientType === "display") {
			SAGE2Items.renderSync[data.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: true, blocklist: []};
		}
	}

    appLoader.createMediaBlockStream(data.src, data.type, data.encoding, data.title, data.color, data.width, data.height, function(appInstance) {
		appInstance.id     = data.id;
        appInstance.width  = data.width;
        appInstance.height = data.height;
        appInstance.data   = data;
        handleNewApplication(appInstance, null);
        calculateValidBlocks(appInstance, mediaBlockSize, SAGE2Items.renderSync[appInstance.id]);
    });
}

function wsUpdateMediaBlockStreamFrame(wsio, buffer) {
	var i;
	var key;
    var id = byteBufferToString(buffer);

	for (key in SAGE2Items.renderSync[id].clients) {
		SAGE2Items.renderSync[id].clients[key].readyForNextFrame = false;
	}

	var yuvBuffer = buffer.slice(id.length+1);

    var blockBuffers = pixelblock.yuv420ToPixelBlocks(yuvBuffer, SAGE2Items.renderSync[id].width, SAGE2Items.renderSync[id].height, mediaBlockSize);

    var pixelbuffer = [];
    var idBuffer = Buffer.concat([new Buffer(id), new Buffer([0])]);
    var dateBuffer = intToByteBuffer(Date.now(), 8);
    var blockIdxBuffer;
    for (i=0; i<blockBuffers.length; i++) {
        blockIdxBuffer = intToByteBuffer(i, 2);
        pixelbuffer[i] = Buffer.concat([idBuffer, blockIdxBuffer, dateBuffer, blockBuffers[i]]);
    }

    for (key in SAGE2Items.renderSync[id].clients) {
		for (i=0; i<pixelbuffer.length; i++){
			if (SAGE2Items.renderSync[id].clients[key].blocklist.indexOf(i) >= 0) {
				SAGE2Items.renderSync[id].clients[key].wsio.emit('updateMediaBlockStreamFrame', pixelbuffer[i]);
			} else {
                // this client has no blocks, so it is ready for next frame!
                SAGE2Items.renderSync[id].clients[key].readyForNextFrame = true;
            }
		}
	}
}

function wsStopMediaBlockStream(wsio, data) {
	deleteApplication(data.id);
}

function wsReceivedMediaBlockStreamFrame(wsio, data) {
	SAGE2Items.renderSync[data.id].clients[wsio.id].readyForNextFrame = true;

	if (allTrueDict(SAGE2Items.renderSync[data.id].clients, "readyForNextFrame")) {
		var i;
		var sender = {wsio: null, serverId: null, clientId: null, streamId: null};
		var mediaBlockStreamData = data.id.split("|");
		if (mediaBlockStreamData.length === 2) { // local stream --> client | stream_id
			sender.clientId = mediaBlockStreamData[0];
			sender.streamId = parseInt(mediaBlockStreamData[1]);
			for (i=0; i<clients.length; i++) {
				if (clients[i].id === sender.clientId) {
					sender.wsio = clients[i];
					break;
				}
			}
			if (sender.wsio !== null) sender.wsio.emit('requestNextFrame', {streamId: sender.streamId});
		}
		else if (mediaBlockStreamData.length === 3) { // remote stream --> remote_server | client | stream_id
			sender.serverId = mediaBlockStreamData[0];
			sender.clientId = mediaBlockStreamData[1];
			sender.streamId = mediaBlockStreamData[2];
			for (i=0; i<clients.length; i++) {
				if (clients[i].id === sender.serverId) {
					sender.wsio = clients[i];
					break;
				}
			}
			if (sender.wsio !== null) sender.wsio.emit('requestNextRemoteFrame', {id: sender.clientId + "|" + sender.streamId});
		}
	}

	/*
	var i;
	var broadcastAddress, broadcastID;
	var serverAddress;

    var clientsReady = true;

    if(data.newClient !== null && data.newClient !== undefined) {
        if(data.newClient) {
            initializeMediaBlockStreams(wsio.id);
            var app = findAppById(data.id);
            calculateValidBlocks(app, 128, mediaBlockStreams);
        }
    }

	mediaBlockStreams[data.id].clients[wsio.id].readyForNextFrame = true;

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
				if (clients[i].id === broadcastAddress) broadcastWS = clients[i];
			}
			if (broadcastWS !== null) broadcastWS.emit('requestNextFrame', {streamId: broadcastID});
		}
		else if (mediaBlockStreamData.length === 3) { // remote stream --> remote_server | client | stream_id
			serverAddress    = mediaBlockStreamData[0];
			broadcastAddress = mediaBlockStreamData[1];
			broadcastID      = mediaBlockStreamData[2];

			for (i=0; i<clients.length; i++) {
				if (clients[i].id === serverAddress) { broadcastWS = clients[i]; break; }
			}

			if(broadcastWS !== null) broadcastWS.emit('requestNextRemoteFrame', {id: broadcastAddress + "|" + broadcastID});
		}
	}
	*/
}

// Print message from remote applications
function wsPrintDebugInfo(wsio, data) {
	// sprint for padding and pretty colors
	//console.log( sprint("Node %2d> ", data.node) + sprint("[%s] ", data.app), data.message);
	console.log(sageutils.header("Client") + "Node " + data.node + " [" + data.app + "] " + data.message);
}

function wsRequestVideoFrame(wsio, data) {
	SAGE2Items.renderSync[data.id].clients[wsio.id].readyForNextFrame = true;
	handleNewClientReady(data.id);
}

// **************  File Manipulation Functions for Apps ************
/*
function wsWriteToFile (wsio, data){
	var fullPath = path.join(uploadsDirectory, "textfiles", data.fileName);
	fs.writeFile(fullPath, data.buffer, function(err){
		if (err) {
			console.log("Error: Could not write to file - " + fullpath);
		}
	});
}

function wsReadFromFile (wsio, data){
	var fullPath = path.join(uploadsDirectory, "textfiles", data.fileName);
	fs.readFile(fullPath, {encoding:'utf8'}, function(err, fileContent){
		if (err) {
			console.log("Error: Could not read from file - " + fullpath);
		}
		else{
			var fileData = {id: data.id, fileName: data.fileName, buffer:fileContent};
			broadcast('receiveFileData', fileData)
		}

	});
}

*/
// **************  Application Animation Functions *****************

function wsFinishedRenderingAppFrame(wsio, data) {
	if (wsio === masterDisplay) {
		SAGE2Items.renderSync[data.id].fps = data.fps;
	}

	SAGE2Items.renderSync[data.id].clients[wsio.id].readyForNextFrame = true;
	if (allTrueDict(SAGE2Items.renderSync[data.id].clients, "readyForNextFrame")) {
		var key;
		for (key in SAGE2Items.renderSync[data.id].clients) {
			SAGE2Items.renderSync[data.id].clients[key].readyForNextFrame = false;
		}
		var now = Date.now();
		var elapsed = now - SAGE2Items.renderSync[data.id].date;
		var fps = SAGE2Items.renderSync[data.id].fps || 30;
		var ticks = 1000 / fps;
		if (elapsed > ticks) {
			SAGE2Items.renderSync[data.id].date = now;
			broadcast('animateCanvas', {id: data.id, date: now});
		}
		else {
			setTimeout(function() {
				now = Date.now();
				SAGE2Items.renderSync[data.id].date = now;
				broadcast('animateCanvas', {id: data.id, date: now});
			}, ticks - elapsed);
		}
	}

	/*
	if (wsio === masterDisplay) appAnimations[data.id].fps = data.fps;
	appAnimations[data.id].clients[wsio.id] = true;
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
			broadcast('animateCanvas', {id: data.id, date: new Date()});
		}
		else{
			setTimeout(function() {
				appAnimations[data.id].date = new Date();
				broadcast('animateCanvas', {id: data.id, date: new Date()});
			}, ticks-elapsed);
		}
	}
	*/
}

function wsUpdateAppState(wsio, data) {
	// Using updates only from master
	if (wsio === masterDisplay && SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		var app = SAGE2Items.applications.list[data.id];
		app.data = data.state;
	}
}

//
// Got a resize call for an application itself
//
function wsAppResize(wsio, data) {
	if (SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		var app = SAGE2Items.applications.list[data.id];
		// Update the width height and aspect ratio
		app.width  = data.width;
		app.height = data.height;
		app.aspect = app.width/app.height;
		app.native_width  = data.width;
		app.native_height = data.height;
		// build the object to be sent
		var updateItem = {
			elemId: app.id,
			elemLeft: app.left,
			elemTop: app.top,
			elemWidth: app.width,
			elemHeight: app.height,
			force: true,
			date: Date.now()
		};
		moveAndResizeApplicationWindow(updateItem);
	}
}

//
// Broadcast data to all clients who need apps
//
function wsBroadcast(wsio, data) {
	broadcast('broadcast', data);
}

//
// Search tweets using Twitter API
//
function wsSearchTweets(wsio, data) {
	if(apis.twitter === null) {
		if(data.broadcast === true)
			broadcast('broadcast', {app: data.app, func: data.func, data: {query: data.query, result: null, err: {message: "Twitter API not enabled in SAGE2 configuration"}}});
		else
			wsio.emit('broadcast', {app: data.app, func: data.func, data: {query: data.query, result: null, err: {message: "Twitter API not enabled in SAGE2 configuration"}}});
		return;
	}

	apis.twitter.get('search/tweets', data.query, function(err, info, response) {
		if(data.broadcast === true)
			broadcast('broadcast', {app: data.app, func: data.func, data: {query: data.query, result: info, err: err}});
		else
			wsio.emit('broadcast', {app: data.app, func: data.func, data: {query: data.query, result: info, err: err}});
	});
}


// **************  Session Functions *****************

function wsSaveSesion(wsio, data) {
	var sname = "";
	if (data) {
		// If a name is passed, use it
		sname = data;
	} else {
		// Otherwise use the date in the name
		var ad    = new Date();
		sname = sprint("session_%4d_%02d_%02d_%02d_%02d_%02s",
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
	var files = fs.readdirSync(sessionDirectory);
	for (var i = 0; i < files.length; i++) {
		var file = files[i];
		var filename = path.join(sessionDirectory, file);
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
		var fullpath = path.join(sessionDirectory, filename);
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

	var key;
	var fullpath = path.join(sessionDirectory, filename);
	// if it doesn't end in .json, add it
	if (fullpath.indexOf(".json", fullpath.length - 5) === -1) {
		fullpath += '.json';
	}

	var states     = {};
	states.apps    = [];
	states.numapps = 0;
	states.date    = Date.now();
	for (key in SAGE2Items.applications.list) {
		var a = SAGE2Items.applications.list[key];
		// Ignore media streaming applications for now (desktop sharing)
		if (a.application !== 'media_stream' && a.application !== 'media_block_stream') {
			states.apps.push(a);
			states.numapps++;
		}
	}

	try {
		fs.writeFileSync(fullpath, JSON.stringify(states, null, 4));
		console.log(sageutils.header("Session") + "saved session file to " + fullpath);
	}
	catch (err) {
		console.log(sageutils.header("Session") + "error saving", err);
	}
}

function loadSession (filename) {
	filename = filename || 'default.json';

	var fullpath = path.join(sessionDirectory, filename);
	// if it doesn't end in .json, add it
	if (fullpath.indexOf(".json", fullpath.length - 5) === -1) {
		fullpath += '.json';
	}
	fs.readFile(fullpath, function(err, data) {
		if (err) {
			console.log(sageutils.header("SAGE2") + "error reading session", err);
		} else {
			console.log(sageutils.header("SAGE2") + "reading sessions from " + fullpath);

			var session = JSON.parse(data);
			console.log(sageutils.header("Session") + "number of applications", session.numapps);

			session.apps.forEach(function(element, index, array) {
				var a = element;//session.apps[i];
				console.log(sageutils.header("Session") + "App", a.id);

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

						handleNewApplication(appInstance, videohandle);
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
						SAGE2Items.renderSync[a.id] = {clients: {}, date: Date.now()};
						for (j=0; j<clients.length; j++) {
							if (clients[j].clientType === "display") {
								SAGE2Items.renderSync[a.id].clients[clients[j].id] = {wsio: clients[j], readyForNextFrame: false, blocklist: []};
							}
						}
						/*
						appAnimations[a.id] = {clients: {}, date: new Date()};
						for(j=0; j<clients.length; j++){
							if(clients[j].clientType === "display") {
								appAnimations[a.id].clients[clients[j].id] = false;
							}
						}
						*/
					}

					handleNewApplication(a, null);
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
		if (clients[i].clientType === "display") {
			console.log(sprint("%2d: %s (%s %s)", i, clients[i].id, clients[i].clientType, clients[i].clientID));
		}
		else {
			console.log(sprint("%2d: %s (%s)", i, clients[i].id, clients[i].clientType));
		}
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
	var i = 0;
	var key;
	console.log("Applications\n------------");
	for(key in SAGE2Items.applications.list) {
		var app = SAGE2Items.applications.list[key];
		console.log(sprint("%2d: %s %s [%dx%d +%d+%d] %s (v%s) by %s",
			i, app.id, app.application,
			app.width, app.height,
			app.left,  app.top,
			app.title, app.metadata.version,
			app.metadata.author));
		i++;
	}
}


// **************  Tiling Functions *****************

//
//
// From Ratko's DIM in SAGE
//   adapted to use all the tiles
//   and center of gravity

function averageWindowAspectRatio() {
	var num = SAGE2Items.applications.numItems;

	if (num === 0) return 1.0;

	var totAr = 0.0;
	var key;
	for (key in SAGE2Items.applications.list) {
		totAr += (SAGE2Items.applications.list[key].width / SAGE2Items.applications.list[key].height);
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

// Calculate the euclidian distance between two objects with .x and .y fields
// function distance2D(p1, p2) {
// 	var dx = p2.x-p1.x;
// 	var dy = p2.y-p1.y;
// 	return Math.sqrt(dx*dx + dy*dy);
// }

// Calculate the square of euclidian distance between two objects with .x and .y fields
function distanceSquared2D(p1, p2) {
	var dx = p2.x-p1.x;
	var dy = p2.y-p1.y;
	return (dx*dx + dy*dy);
}

function findMinimum(arr) {
	var val = Number.MAX_VALUE;
	var idx = 0;
	for (var i=0; i<arr.length; i++) {
		if (arr[i] < val) {
			val = arr[i];
			idx = i;
		}
	}
	return idx;
}

function tileApplications() {
	var app;
	var i, c, r, key;
	var numCols, numRows, numCells;

	var displayAr  = config.totalWidth / config.totalHeight;
	var arDiff     = displayAr / averageWindowAspectRatio();
	var numWindows = SAGE2Items.applications.numItems;

	// 3 scenarios... windows are on average the same aspect ratio as the display
	if (arDiff >= 0.7 && arDiff <= 1.3) {
		numCols = Math.ceil(Math.sqrt( numWindows ));
		numRows = Math.ceil(numWindows / numCols);
	}
	// windows are much wider than display
    else if (arDiff < 0.7) {
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
	// windows are much taller than display
	else {
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
	if (numWindows === 1) padding = 0;

    var centroidsApps  = {};
    var centroidsTiles = [];

    // Caculate apps centers
    for (key in SAGE2Items.applications.list) {
		app = SAGE2Items.applications.list[key];
		centroidsApps[key] = {x: app.left+app.width/2.0, y: app.top+app.height/2.0};
    }
    // Caculate tiles centers
	for (i=0; i<numCells; i++) {
		c = i % numCols;
		r = Math.floor(i / numCols);
		centroidsTiles.push({x: (c*tileW+areaX)+tileW/2.0, y: (r*tileH+areaY)+tileH/2.0});
	}

	// Calculate distances
	var distances = {};
	for (key in centroidsApps) {
		distances[key] = [];
		for (i=0; i<numCells; i++) {
			var d = distanceSquared2D(centroidsApps[key], centroidsTiles[i]);
			distances[key].push(d);
		}
	}

	for (key in SAGE2Items.applications.list) {
		// get the application
		app = SAGE2Items.applications.list[key];
		// pick a cell
		var cellid = findMinimum(distances[key]);
		// put infinite value to disable the chosen cell
		for (i in SAGE2Items.applications.list) {
			distances[i][cellid] = Number.MAX_VALUE;
		}

		// calculate new dimensions
		c = cellid % numCols;
		r = Math.floor(cellid / numCols);
        var newdims = fitWithin(app, c*tileW+areaX, r*tileH+areaY, tileW, tileH, padding);

        // update the data structure
        app.left = newdims[0];
        app.top = newdims[1] - titleBar;
        app.width = newdims[2];
        app.height = newdims[3];
        var updateItem = {
			elemId: app.id,
			elemLeft: app.left,
			elemTop: app.top,
			elemWidth: app.width,
			elemHeight: app.height,
			force: true,
			date: Date.now()
		};

		broadcast('startMove', {id: updateItem.elemId, date: updateItem.date});
		broadcast('startResize', {id: updateItem.elemId, date: updateItem.date});

		moveAndResizeApplicationWindow(updateItem);

		broadcast('finishedMove', {id: updateItem.elemId, date: updateItem.date});
		broadcast('finishedResize', {id: updateItem.elemId, date: updateItem.date});
	}
}

// Remove all applications
function clearDisplay() {
	var i;
	var all = Object.keys(SAGE2Items.applications.list);
	for (i=0; i<all.length; i++) {
		deleteApplication(all[i]);
	}
}


// handlers for messages from UI
function wsClearDisplay(wsio, data) {
	clearDisplay();

	addEventToUserLog(wsio.id, {type: "clearDisplay", data: null, time: Date.now()});
}

function wsTileApplications(wsio, data) {
	tileApplications();

	addEventToUserLog(wsio.id, {type: "tileApplications", data: null, time: Date.now()});
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

		if (appInstance.animation) {
			var i;
			SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
			for (i=0; i<clients.length; i++) {
				if (clients[i].clientType === "display") {
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: false, blocklist: []};
				}
			}

			/*
			appAnimations[appInstance.id] = {clients: {}, date: new Date()};
			for(i=0; i<clients.length; i++){
				if(clients[i].clientType === "display") {
					appAnimations[appInstance.id].clients[clients[i].id] = false;
				}
			}
			*/
		}

		handleNewApplication(appInstance, null);

		addEventToUserLog(data.user, {type: "openApplication", data: {application: {id: appInstance.id, type: appInstance.application}}, time: Date.now()});
	});
}

function wsLoadFileFromServer(wsio, data) {
	if (data.application === "load_session") {
		// if it's a session, then load it
		loadSession(data.filename);

		addEventToUserLog(wsio.id, {type: "openFile", data: {name: data.filename, application: {id: null, type: "session"}}, time: Date.now()});
	}
	else {
		appLoader.loadFileFromLocalStorage(data, function(appInstance, videohandle) {
			appInstance.id = getUniqueAppId();
			handleNewApplication(appInstance, videohandle);

			addEventToUserLog(data.user, {type: "openFile", data: {name: data.filename, application: {id: appInstance.id, type: appInstance.application}}, time: Date.now()});
		});
	}
}

function initializeLoadedVideo(appInstance, videohandle) {
	if(appInstance.application !== "movie_player" || videohandle === null) return;

	var i;
	var horizontalBlocks = Math.ceil(appInstance.native_width / mediaBlockSize);
	var verticalBlocks = Math.ceil(appInstance.native_height / mediaBlockSize);
	var videoBuffer = new Array(horizontalBlocks*verticalBlocks);

	videohandle.on('error', function(err) {
		console.log("VIDEO ERROR: " + err);
	});
	videohandle.on('start', function() {
		broadcast('videoPlaying', {id: appInstance.id});
	});
	videohandle.on('end', function() {
		broadcast('videoEnded', {id: appInstance.id});
		if(SAGE2Items.renderSync[appInstance.id].loop === true) {
			SAGE2Items.renderSync[appInstance.id].decoder.seek(0.0, function() {
				SAGE2Items.renderSync[appInstance.id].decoder.play();
			});
			broadcast('updateVideoItemTime', {id: appInstance.id, timestamp: 0.0, play: false});
		}
	});
	videohandle.on('frame', function(frameIdx, buffer) {
		SAGE2Items.renderSync[appInstance.id].frameIdx = frameIdx;
		var blockBuffers = pixelblock.yuv420ToPixelBlocks(buffer, appInstance.data.width, appInstance.data.height, mediaBlockSize);

		var idBuffer = Buffer.concat([new Buffer(appInstance.id), new Buffer([0])]);
		var frameIdxBuffer = intToByteBuffer(frameIdx,   4);
		var dateBuffer = intToByteBuffer(Date.now(), 8);
		for(i=0; i<blockBuffers.length; i++){
			var blockIdxBuffer = intToByteBuffer(i, 2);
			SAGE2Items.renderSync[appInstance.id].pixelbuffer[i] = Buffer.concat([idBuffer, blockIdxBuffer, frameIdxBuffer, dateBuffer, blockBuffers[i]]);
		}

		handleNewVideoFrame(appInstance.id);
	});

	SAGE2Items.renderSync[appInstance.id] = {decoder: videohandle, frameIdx: null, loop: false, pixelbuffer: videoBuffer, newFrameGenerated: false, clients: {}};
	for(i=0; i<clients.length; i++){
		if(clients[i].clientType === "display") {
			SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: false, blocklist: []};
		}
	}

	calculateValidBlocks(appInstance, mediaBlockSize, SAGE2Items.renderSync[appInstance.id]);

	// initialize based on state
	SAGE2Items.renderSync[appInstance.id].loop = appInstance.data.looped;
	if(appInstance.data.frame !== 0) {
		var ts = appInstance.data.frame / appInstance.data.framerate;
		SAGE2Items.renderSync[appInstance.id].decoder.seek(ts, function() {
			if(appInstance.data.paused === false) {
				SAGE2Items.renderSync[appInstance.id].decoder.play();
			}
		});
		broadcast('updateVideoItemTime', {id: appInstance.id, timestamp: ts, play: false});
	}
	else {
		if(appInstance.data.paused === false) {
			SAGE2Items.renderSync[appInstance.id].decoder.play();
		}
	}
	if(appInstance.data.muted === true) {
		broadcast('videoMuted', {id: appInstance.id});
	}
	/*
	var i;
	var blocksize = 128;
	var horizontalBlocks = Math.ceil(appInstance.native_width /blocksize);
	var verticalBlocks   = Math.ceil(appInstance.native_height/blocksize);
	var videoBuffer = new Array(horizontalBlocks*verticalBlocks);

	videohandle.on('error', function(err) {
		console.log("VIDEO ERROR: " + err);
	});
	videohandle.on('start', function() {
		broadcast('videoPlaying', {id: appInstance.id});
	});
	videohandle.on('end', function() {
		broadcast('videoEnded', {id: appInstance.id});
		if(videoHandles[appInstance.id].loop === true) {
			videoHandles[appInstance.id].decoder.seek(0.0, function() {
				videoHandles[appInstance.id].decoder.play();
			});
			broadcast('updateVideoItemTime', {id: appInstance.id, timestamp: 0.0, play: false});
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
		if(clients[i].clientType === "display") {
			videoHandles[appInstance.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: false, blockList: []};
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
			broadcast('updateVideoItemTime', {id: appInstance.id, timestamp: ts, play: false});
		}
		else {
			if(appInstance.data.paused === false) {
				videoHandles[appInstance.id].decoder.play();
			}
		}
		if(appInstance.data.muted === true) {
			broadcast('videoMuted', {id: appInstance.id});
		}
    }, 250);
	*/
}

// move this function elsewhere
function handleNewVideoFrame(id) {
	var videohandle = SAGE2Items.renderSync[id];

	videohandle.newFrameGenerated = true;
	if (!allTrueDict(videohandle.clients, "readyForNextFrame")) {
		return false;
	}

	updateVideoFrame(id);
	return true;
}

// move this function elsewhere
function handleNewClientReady(id) {
	var videohandle = SAGE2Items.renderSync[id];

	// if no new frame is generate or not all display clients have finished rendering previous frame - return
	if (videohandle.newFrameGenerated !== true || !allTrueDict(videohandle.clients, "readyForNextFrame")) {
		return false;
	}

	updateVideoFrame(id);
	return true;
}

function updateVideoFrame(id) {
	var i;
	var key;
	var videohandle = SAGE2Items.renderSync[id];

	videohandle.newFrameGenerated = false;
	for (key in videohandle.clients) {
		videohandle.clients[key].wsio.emit('updateFrameIndex', {id: id, frameIdx: videohandle.frameIdx});
		var hasBlock = false;
		for (i=0; i<videohandle.pixelbuffer.length; i++) {
			if (videohandle.clients[key].blocklist.indexOf(i) >= 0) {
				hasBlock = true;
				videohandle.clients[key].wsio.emit('updateVideoFrame', videohandle.pixelbuffer[i]);
			}
		}
		if(hasBlock === true) {
			videohandle.clients[key].readyForNextFrame = false;
		}
	}
}

// move this function elsewhere
function calculateValidBlocks(app, blockSize, renderhandle) {
	if(app.application !== "movie_player" && app.application !== "media_block_stream") return;

	var i;
	var j;
	var key;

	var horizontalBlocks = Math.ceil(app.data.width /blockSize);
	var verticalBlocks   = Math.ceil(app.data.height/blockSize);

	var renderBlockWidth  = blockSize * app.width / app.data.width;
	var renderBlockHeight = blockSize * app.height / app.data.height;

	for (key in renderhandle.clients){
		renderhandle.clients[key].blocklist = [];
		for (i=0; i<verticalBlocks; i++) {
			for (j=0; j<horizontalBlocks; j++) {
				var blockIdx = i*horizontalBlocks+j;

				if (renderhandle.clients[key].wsio.clientID < 0) {
					renderhandle.clients[key].blocklist.push(blockIdx);
				}
				else {
					var display = config.displays[renderhandle.clients[key].wsio.clientID];
					var left = j*renderBlockWidth  + app.left;
					var top  = i*renderBlockHeight + app.top + config.ui.titleBarHeight;
					var offsetX = config.resolution.width  * display.column;
					var offsetY = config.resolution.height * display.row;

					if ((left+renderBlockWidth) >= offsetX && left <= (offsetX+config.resolution.width) &&
						(top +renderBlockHeight) >= offsetY && top  <= (offsetY+config.resolution.height)) {
						renderhandle.clients[key].blocklist.push(blockIdx);
					}
				}
			}
		}
		renderhandle.clients[key].wsio.emit('updateValidStreamBlocks', {id: app.id, blockList: renderhandle.clients[key].blocklist});
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
		handleNewApplication(appInstance, videohandle);

		if(appInstance.animation){
			var i;
			SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
			for (i=0; i<clients.length; i++) {
				if (clients[i].clientType === "display") {
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: false, blocklist: []};
				}
			}
			/*
			appAnimations[appInstance.id] = {clients: {}, date: new Date()};
			for(i=0; i<clients.length; i++){
				if(clients[i].clientType === "display") {
					appAnimations[appInstance.id].clients[clients[i].id] = false;
				}
			}
			*/
		}
	});
}

// **************  Command line          *****************

function wsCommand(wsio, data) {
	// send the command to the REPL interpreter
	processInputCommand(data);
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
	if(SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) return;

	SAGE2Items.renderSync[data.id].decoder.play();
}

function wsPauseVideo(wsio, data) {
	if(SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) return;

	SAGE2Items.renderSync[data.id].decoder.pause(function() {
		broadcast('videoPaused', {id: data.id});
	});
}

function wsStopVideo(wsio, data) {
	if(SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) return;

	SAGE2Items.renderSync[data.id].decoder.stop(function() {
		broadcast('videoPaused', {id: data.id});
		broadcast('updateVideoItemTime', {id: data.id, timestamp: 0.0, play: false});
		broadcast('updateFrameIndex', {id: data.id, frameIdx: 0});
	});
}

function wsUpdateVideoTime(wsio, data) {
	if(SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) return;

	SAGE2Items.renderSync[data.id].decoder.seek(data.timestamp, function() {
		if(data.play === true) SAGE2Items.renderSync[data.id].decoder.play();
	});
	broadcast('updateVideoItemTime', data);
}

function wsMuteVideo(wsio, data) {
	if(SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) return;

	broadcast('videoMuted', {id: data.id});
}

function wsUnmuteVideo(wsio, data) {
	if(SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) return;

	broadcast('videoUnmuted', {id: data.id});
}

function wsLoopVideo(wsio, data) {
	if(SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) return;

	SAGE2Items.renderSync[data.id].loop = data.loop;
}

// **************  Remote Server Content *****************

function wsAddNewElementFromRemoteServer(wsio, data) {
	console.log("add element from remote server");
	var i;

	appLoader.loadApplicationFromRemoteServer(data, function(appInstance, videohandle) {
		console.log("Remote App: " + appInstance.title + " (" + appInstance.application + ")");
		if(appInstance.application === "media_stream" || appInstance.application === "media_block_stream"){
			appInstance.id = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port + "|" + appInstance.id;
			SAGE2Items.renderSync[appInstance.id] = {chunks: [], clients: {}};
			for(i=0; i<clients.length; i++){
				if(clients[i].clientType === "dislpay") {
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: false, blocklist: []};
				}
			}
		}
		else {
			appInstance.id = getUniqueAppId();
		}

		mergeObjects(data.data, appInstance.data, ['video_url', 'video_type', 'audio_url', 'audio_type']);

		handleNewApplication(appInstance, videohandle);

		if(appInstance.animation){
			SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
			for (i=0; i<clients.length; i++) {
				if (clients[i].clientType === "display") {
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: false, blocklist: []};
				}
			}
		}
	});
}

function wsRequestNextRemoteFrame(wsio, data) {
	var remote_id = config.host + ":" + config.port + "|" + data.id;
	if(SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		var stream = SAGE2Items.applications.list[data.id];
		wsio.emit('updateRemoteMediaStreamFrame', {id: remote_id, state: stream.data});
	}
	else {
		wsio.emit('stopMediaStream', {id: remote_id});
	}
}

function wsUpdateRemoteMediaStreamFrame(wsio, data) {
	if (!SAGE2Items.applications.list.hasOwnProperty(data.id)) return;

	var key;
	for (key in SAGE2Items.renderSync[data.id].clients) {
		SAGE2Items.renderSync[data.id].clients[key].readyForNextFrame = false;
	}
	var stream = SAGE2Items.applications.list[data.id];
	stream.data = data.data;

	broadcast('updateMediaStreamFrame', data);
}

function wsReceivedRemoteMediaStreamFrame(wsio, data) {
	SAGE2Items.renderSync[data.id].clients[wsio.id].readyForNextFrame = true;
	if(allTrueDict(SAGE2Items.renderSync[data.id].clients, "readyForNextFrame")) {
		var i;
		var mediaStreamData = data.id.substring(6).split("|");
		var sender = {wsio: null, serverId: mediaStreamData[0], clientId: mediaStreamData[1], streamId: null};
		for (i=0; i<clients.length; i++) {
			if (clients[i].id === sender.serverId) {
				sender.wsio = clients[i];
				break;
			}
		}
		if (sender.wsio !== null) sender.wsio.emit('requestNextRemoteFrame', {id: sender.clientId});
	}
}

// XXX - Remote block streaming not tested
function wsRequestNextRemoteBlockFrame(wsio, data) {
	var remote_id = config.host + ":" + config.port + "|" + data.id;
	if(SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		var stream = SAGE2Items.applications.list[data.id];
		wsio.emit('updateRemoteMediaBlockStreamFrame', {id: remote_id, state: stream.data});
	}
	else {
		wsio.emit('stopMediaBlockStream', {id: remote_id});
	}
}

function wsUpdateRemoteMediaBlockStreamFrame(wsio, data) {
	if (!SAGE2Items.applications.list.hasOwnProperty(data.id)) return;

	var key;
	for (key in SAGE2Items.renderSync[data.id].clients) {
		SAGE2Items.renderSync[data.id].clients[key].readyForNextFrame = false;
	}
	var stream = SAGE2Items.applications.list[data.id];
	stream.data = data.data;

	broadcast('updateMediaBlockStreamFrame', data);
}

function wsReceivedRemoteMediaBlockStreamFrame(wsio, data) {
	SAGE2Items.renderSync[data.id].clients[wsio.id].readyForNextFrame = true;
	if(allTrueDict(SAGE2Items.renderSync[data.id].clients, "readyForNextFrame")) {
		var i;
		var mediaBlockStreamData = data.id.substring(6).split("|");
		var sender = {wsio: null, serverId: mediaBlockStreamData[0], clientId: mediaBlockStreamData[1], streamId: null};
		for (i=0; i<clients.length; i++) {
			if (clients[i].id === sender.serverId) {
				sender.wsio = clients[i];
				break;
			}
		}
		if (sender.wsio !== null) sender.wsio.emit('requestNextRemoteFrame', {id: sender.clientId});
	}
}

// **************  Widget Control Messages *****************

function wsAddNewControl(wsio, data){
	if (!SAGE2Items.applications.list.hasOwnProperty(data.appId)) return;
	if (SAGE2Items.widgets.list.hasOwnProperty(data.id)) return;

	broadcast('createControl', data);

	var zIndex = SAGE2Items.widgets.numItems;
	interactMgr.addGeometry(data.id+"_radial", "widgets", "circle", {x: data.left+(data.height/2), y: data.top+(data.height/2), r: data.height/2}, true, zIndex, data);
	if (data.hasSideBar === true) {
		interactMgr.addGeometry(data.id+"_sidebar", "widgets", "rectangle", {x: data.left+data.height, y: data.top+(data.height/2)-(data.barHeight/2), w: data.width-data.height, h: data.barHeight}, true, zIndex, data);
	}

	SAGE2Items.widgets.addItem(data);
	var uniqueID = data.id.substring(data.appId.length, data.id.lastIndexOf("_"));
	var app = SAGE2Items.applications.list[data.appId];
	addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "open", application: {id: app.id, type: app.application}}, time: Date.now()});
}

function wsRecordInnerGeometryForWidget(wsio, data){
	//var center = data.innerGeometry.center;
	var buttons = data.innerGeometry.buttons;
	var textInput = data.innerGeometry.textInput;
	var slider = data.innerGeometry.slider;
	//SAGE2Items.widgets.addButtonToItem(data.instanceID, "center", "circle", {x:center.x, y: center.y, r:center.r}, 0);
	for (var i=0; i<buttons.length; i++){
		SAGE2Items.widgets.addButtonToItem(data.instanceID, buttons[i].id, "circle", {x:buttons[i].x, y: buttons[i].y, r:buttons[i].r}, 0);
	}
	if (textInput!==null) {
		SAGE2Items.widgets.addButtonToItem(data.instanceID, textInput.id, "rectangle", {x:textInput.x, y: textInput.y, w:textInput.w, h:textInput.h}, 0);
	}
	if (slider!==null) {
		SAGE2Items.widgets.addButtonToItem(data.instanceID, slider.id, "rectangle", {x:slider.x, y: slider.y, w:slider.w, h:slider.h}, 0);
	}
}

/*function wsSelectedControlId(wsio, data){ // Get the id of a ctrl widgetbar or ctrl element(button and so on)
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
		broadcast('dropTextInputControl', appdata);
		remoteInteraction[data.addr].dropControl();
	}
	if (regButton.test(data.ctrlId) || regTI.test(data.ctrlId) || regSl.test(data.ctrlId)) {
		var appData = {ctrlId:data.ctrlId, appId:data.appId, instanceID:data.instanceID};
		remoteInteraction[data.addr].lockControl(appData);
		if (regSl.test(appData.ctrlId) && /knob/.test(appData.ctrlId))
			broadcast('sliderKnobLockAction', appData);
	}
}

function wsReleasedControlId(wsio, data){
	var regSl = /slider/;
	var regButton = /button/;
	if (data.ctrlId !==null && remoteInteraction[data.addr].lockedControl() !== null &&(regSl.test(data.ctrlId) || regButton.test(data.ctrlId))) {
		remoteInteraction[data.addr].dropControl();
		broadcast('executeControlFunction', {ctrlId: data.ctrlId, appId: data.appId, instanceID: data.instanceID}, 'receivesWidgetEvents');

		var app = SAGE2Items.applications.list[data.appId];
		if (app){
			if(data.ctrlId.indexOf("buttonCloseApp") >= 0) {
				addEventToUserLog(data.addr, {type: "delete", data: {application: {id: app.id, type: app.application}}, time: Date.now()});
			}
			else if(data.ctrlId.indexOf("buttonCloseWidget") >= 0) {
				addEventToUserLog(data.addr, {type: "widgetMenu", data: {action: "close", application: {id: app.id, type: app.application}}, time: Date.now()});
			}
			else {
				addEventToUserLog(data.addr, {type: "widgetAction", data: {application: data.appId, widget: data.ctrlId}, time: Date.now()});
			}
		}
	}
}
*/

function wsCloseAppFromControl(wsio, data){
	deleteApplication(data.appId);
}

function wsHideWidgetFromControl(wsio, data){
	var ctrl = SAGE2Items.widgets.list[data.instanceID];
	hideControl(ctrl);
}

function wsOpenRadialMenuFromControl(wsio, data){
	console.log("radial menu");
	var ctrl = SAGE2Items.widgets.list[data.id];
	createRadialMenu(wsio.id, ctrl.left, ctrl.top);
}

/* ****************** Clone Request Methods ************************** */

function wsCreateAppClone(wsio, data){
	var app = SAGE2Items.applications.list[data.id];
	var appData = {application: "custom_app", filename: app.application};
	appLoader.loadFileFromLocalStorage(appData, function(clone, videohandle) {
		clone.id = getUniqueAppId();
		var pos = getNewWindowPosition({x: app.left, y: app.top});
		clone.left = pos.x;
		clone.top = pos.y;
		clone.width = app.width;
		clone.height = app.height;
		if(clone.animation){
			var i;
			SAGE2Items.renderSync[clone.id] = {clients: {}, date: Date.now()};
			for (i=0; i<clients.length; i++) {
				if (clients[i].clientType === "display") {
					SAGE2Items.renderSync[clone.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: false, blocklist: []};
				}
			}
			/*
			appAnimations[clone.id] = {clients: {}, date: new Date()};
			for(i=0; i<clients.length; i++){
				if(clients[i].clientType === "display") {
					appAnimations[clone.id].clients[clients[i].id] = false;
				}
			}
			*/
		}
		if (clone.data)
			clone.data.loadData = data.cloneData;
		else
			clone.data = {loadData: data.cloneData};

		handleNewApplication(clone, videohandle);
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
					console.log(sageutils.header("SAGE2") + "Found configuration file: " + configFile);
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
			console.log(sageutils.header("SAGE2") + "Found configuration file: " + configFile);
		}
		else{
			if(platform === "Windows")
				configFile = path.join("config", "defaultWin-cfg.json");
			else
				configFile = path.join("config", "default-cfg.json");
			console.log(sageutils.header("SAGE2") + "Using default configuration file: " + configFile);
		}
	}

	if (!sageutils.fileExists(configFile)) {
		console.log("\n----------");
		console.log(sageutils.header("SAGE2") + "Cannot find configuration file: " + configFile);
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


	if(userConfig.apis !== undefined && userConfig.apis.twitter !== undefined){
		apis.twitter = new Twit({
			consumer_key:         userConfig.apis.twitter.consumerKey,
			consumer_secret:      userConfig.apis.twitter.consumerSecret,
			access_token:         userConfig.apis.twitter.accessToken,
			access_token_secret:  userConfig.apis.twitter.accessSecret
		});
	}

	return userConfig;
}


var getUniqueAppId = (function() {
	var count = 0;
	return function() {
		var id = "app_" + count.toString();
		count++;
		return id;
	};
})();

var getNewUserId = (function() {
	var count = 0;
	return function() {
		var id = "usr_" + count.toString();
		count++;
		return id;
	};
})();

function getApplications() {
	var uploadedApps = assets.listApps();

	// Remove 'viewer' apps
	var i = uploadedApps.length;
	while (i--) {
		if (uploadedApps[i].exif.metadata.fileTypes &&
			uploadedApps[i].exif.metadata.fileTypes.length > 0) {
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
		var bg_file = path.join(publicDirectory, config.background.image.url);

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
					tmpImg = path.join(publicDirectory, "images", "background", "tmp_background.png");
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
			tmpImg = path.join(publicDirectory, "images", "background", "tmp_background" + imgExt);

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
	var server_ca  = [];

	// add the default cert from the hostname specified in the config file
	try {
		// first try the filename based on the hostname-server.key
		if (sageutils.fileExists(path.join("keys", config.host + "-server.key"))) {
			// Load the certificate files
			console.log(sageutils.header("Certificate") + "Loading certificate " + config.host + "-server.key");
			server_key = fs.readFileSync(path.join("keys", config.host + "-server.key"));
			server_crt = fs.readFileSync(path.join("keys", config.host + "-server.crt"));
			server_ca  = sageutils.loadCABundle(path.join("keys", config.host + "-ca.crt"));
			// Build the crypto
			certs[config.host] = sageutils.secureContext(server_key, server_crt, server_ca);
		} else {
			// remove the hostname from the FQDN and search for wildcard certificate
			//    syntax: _.rest.com.key or _.rest.bigger.com.key
			var domain = '_.' + config.host.split('.').slice(1).join('.');
			console.log(sageutils.header("Certificate") + "Loading domain certificate " + domain + ".key");
			server_key = fs.readFileSync( path.join("keys", domain + ".key") );
			server_crt = fs.readFileSync( path.join("keys", domain + ".crt") );
			server_ca  = sageutils.loadCABundle(path.join("keys", domain + "-ca.crt"));
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
				sageutils.loadCABundle(path.join("keys", alth + "-ca.crt"))
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
					console.log(sageutils.header("SNI") + "Unknown host, cannot find a certificate for ", servername);
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
					console.log(sageutils.header("SNI") + "Unknown host, cannot find a certificate for ", servername);
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
			if(appInstance.animation){
				var i;
				SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
				for (i=0; i<clients.length; i++) {
					if (clients[i].clientType === "display") {
						SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: false, blocklist: []};
					}
				}
				/*
				appAnimations[appInstance.id] = {clients: {}, date: new Date()};
				for(i=0; i<clients.length; i++){
					if(clients[i].clientType === "display") {
						appAnimations[appInstance.id].clients[clients[i].id] = false;
					}
				}
				*/
			}
			handleNewApplication(appInstance, videohandle);
		});
	});
}


// **************  Remote Site Collaboration *****************

var remoteSites = [];
if (config.remote_sites) {
	remoteSites = new Array(config.remote_sites.length);
	config.remote_sites.forEach(function(element, index, array) {
		var protocol = (element.secure === true) ? "wss" : "ws";
		var wsURL = protocol + "://" + element.host + ":" + element.port.toString();

		var remote = createRemoteConnection(wsURL, element, index);

		var rGeom = {};
		rGeom.w = Math.min((0.5*config.totalWidth)/remoteSites.length, config.ui.titleBarHeight*6) - (0.16*config.ui.titleBarHeight);
		rGeom.h = 0.84*config.ui.titleBarHeight;
		rGeom.x = (0.5*config.totalWidth) + ((rGeom.w+(0.16*config.ui.titleBarHeight))*(index-(remoteSites.length/2))) + (0.08*config.ui.titleBarHeight);
		rGeom.y = 0.08*config.ui.titleBarHeight;

		remoteSites[index] = {name: element.name, wsio: remote, connected: false, geometry: rGeom};
		interactMgr.addGeometry("remote_"+index, "staticUI", "rectangle", rGeom,  true, index, remoteSites[index]);

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
		console.log(sageutils.header("Remote") + "Connected to " + element.name);
		remote.remoteAddress.address = element.host;
		remote.remoteAddress.port = element.port;
		var clientDescription = {
			clientType: "remoteServer",
			host: config.host,
			port: config.port,
			requests: {
				config: false,
				version: false,
				time: false,
				console: false
			}
		};
		remote.clientType = "remoteServer";

		remote.onclose(function() {
			console.log("Remote site \"" + config.remote_sites[index].name + "\" now offline");
			remoteSites[index].connected = false;
			var delete_site = {name: remoteSites[index].name, connected: remoteSites[index].connected};
			broadcast('connectedToRemoteSite', delete_site);
			removeElement(clients, remote);
		});

		remote.on('addClient', wsAddClient);
		remote.on('addNewElementFromRemoteServer', wsAddNewElementFromRemoteServer);
		remote.on('requestNextRemoteFrame', wsRequestNextRemoteFrame);
		remote.on('updateRemoteMediaStreamFrame', wsUpdateRemoteMediaStreamFrame);
		remote.on('stopMediaStream', wsStopMediaStream);
		remote.on('requestNextRemoteBlockFrame', wsRequestNextRemoteBlockFrame);
		remote.on('updateRemoteMediaBlockStreamFrame', wsUpdateRemoteMediaBlockStreamFrame);
		remote.on('stopMediaBlockStream', wsStopMediaBlockStream);

		remote.emit('addClient', clientDescription);
		remoteSites[index].connected = true;
		var new_site = {name: remoteSites[index].name, connected: remoteSites[index].connected};
		broadcast('connectedToRemoteSite', new_site);
		clients.push(remote);
	});

	return remote;
}

// **************  System Time - Updated Every Minute *****************
var cDate = new Date();
setTimeout(function() {
	setInterval(function() {
		broadcast('setSystemTime', {date: Date.now()});
	}, 60000);

	broadcast('setSystemTime', {date: Date.now()});
}, (61-cDate.getSeconds())*1000);


// ***************************************************************************************

// Place callback for success in the 'listen' call for HTTPS

sage2ServerS.on('listening', function (e) {
	// Success
	console.log(sageutils.header("SAGE2") + "Serving secure clients at https://" + config.host + ":" + config.port);
	console.log(sageutils.header("SAGE2") + "Web console at https://" + config.host + ":" + config.port + "/admin/console.html");
});

// Place callback for errors in the 'listen' call for HTTP
sage2Server.on('error', function (e) {
	if (e.code === 'EACCES') {
		console.log(sageutils.header("HTTP_Server") + "You are not allowed to use the port: ", config.index_port);
		console.log(sageutils.header("HTTP_Server") + "  use a different port or get authorization (sudo, setcap, ...)");
		console.log(" ");
		process.exit(1);
	}
	else if (e.code === 'EADDRINUSE') {
		console.log(sageutils.header("HTTP_Server") + "The port is already in use by another process:", config.index_port);
		console.log(sageutils.header("HTTP_Server") + "  use a different port or stop the offending process");
		console.log(" ");
		process.exit(1);
	}
	else {
		console.log(sageutils.header("HTTP_Server") + "Error in the listen call: ", e.code);
		console.log(" ");
		process.exit(1);
	}
});

// Place callback for success in the 'listen' call for HTTP
sage2Server.on('listening', function (e) {
	// Success
	console.log(sageutils.header("SAGE2") + "Serving web UI at http://" + config.host + ":" + config.index_port);
	console.log(sageutils.header("SAGE2") + "Display 0 at http://" + config.host + ":" + config.index_port + "/display.html?clientID=0");
	console.log(sageutils.header("SAGE2") + "Audio manager at http://" + config.host + ":" + config.index_port + "/audioManager.html");
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


// Start the HTTP server (listen for IPv4 addresses 0.0.0.0)
sage2Server.listen(config.index_port, "0.0.0.0");
// Start the HTTPS server (listen for IPv4 addresses 0.0.0.0)
sage2ServerS.listen(config.port, "0.0.0.0");


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

function processInputCommand(line) {
	var command = line.trim().split(' ');
	switch(command[0]) {
		case '': // ignore
			break;
		case 'help':
			console.log('help\t\tlist commands');
			console.log('kill\t\tclose application: arg0: id - kill app_0');
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
			console.log(sageutils.header("Version") + 'base:', SAGE2_version.base, ' branch:', SAGE2_version.branch, ' commit:', SAGE2_version.commit, SAGE2_version.date);
			break;

		case 'update':
			if (SAGE2_version.branch.length>0) {
				sageutils.updateWithGIT(SAGE2_version.branch, function(error, success) {
					if (error)
						console.log(sageutils.header('GIT') + 'Update: error', error);
					else
						console.log(sageutils.header('GIT') + 'Update: success', success);
				});
			} else {
				console.log(sageutils.header("Update") + "failed: not linked to any repository");
			}
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
			if (command.length > 1 && typeof command[1] === "string") {
				deleteApplication(command[1]);
				/*
				var kid = parseInt(command[1], 10); // convert arg1 to base 10
				if (!isNaN(kid) && (kid >= 0) && (kid < applications.length) ) {
					console.log('deleting application', kid);
					deleteApplication( applications[kid] );
				}
				*/
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
}

// Command loop: reading input commands - SHOULD MOVE LATER: INSIDE CALLBACK AFTER SERVER IS LISTENING
if (program.interactive) {
	// Create line reader for stdin and stdout
	var shell = readline.createInterface({
		input:  process.stdin, output: process.stdout
	});

	// Set the prompt
	shell.setPrompt("> ");

	// Callback for each line
	shell.on('line', function(line) {
		processInputCommand(line);
		shell.prompt();
	}).on('close', function() {
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
		console.log(sageutils.header("LOG") + "saved log file to " + userLogName);
	}

	if (config.register_site) {
		// de-register with EVL's server
		sageutils.deregisterSAGE2(config, function() {
			saveSession();
			assets.saveAssets();
			if( omicronRunning )
				omicronManager.disconnect();
			process.exit(0);
		});
	}
	else {
		saveSession();
		assets.saveAssets();
		if( omicronRunning )
			omicronManager.disconnect();
		process.exit(0);
	}
}

/*
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
		for(var i=0; i<clients.length; i++) {
			if (clients[i].messages[type]) clients[i].emitString(message);
		}
	} catch (e) {
		// Not using console.log since it's overloaded to send messages
		process.stdout.write("Websocket>	Warning: wsio trouble emitting string to clients\n");
	}
}
*/

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

/*
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
*/


// function findControlsUnderPointer(pointerX, pointerY) {
// 	var last = controls.length-1;
// 	for(var i=last; i>=0; i--){
// 		if (controls[i]!== null && controls[i].show === true && pointerX >= controls[i].left && pointerX <= (controls[i].left+controls[i].width) && pointerY >= controls[i].top && pointerY <= (controls[i].top+controls[i].height)){
// 			var centerX = controls[i].left + controls[i].height/2.0;
// 			var centerY = controls[i].top + controls[i].height/2.0;
// 			var dist = Math.sqrt((pointerX - centerX)*(pointerX - centerX) + (pointerY - centerY)*(pointerY - centerY));
// 			var barMinX = controls[i].left + controls[i].height;
// 			var barMinY = controls[i].top + controls[i].height/2 - controls[i].barHeight/2;
// 			var barMaxX = controls[i].left + controls[i].width;
// 			var barMaxY = controls[i].top + controls[i].height/2 + controls[i].barHeight/2;
// 			if (dist<=controls[i].height/2.0 || (controls[i].hasSideBar && (pointerX >= barMinX && pointerX <= barMaxX) && (pointerY >= barMinY && pointerY <= barMaxY))) {
// 				if (i!==last){
// 					var temp = controls[i];
// 					controls[i] = controls[last];
// 					controls[last] = temp;
// 				}
// 				return controls[last];
// 			}
// 			else
// 				return null;
// 		}
// 	}
// 	return null;
// }

// function findControlById(id) {
// 	for (var i=controls.length-1; i>=0; i--) {
// 		if (controls[i].id === id) {
// 			return controls[i];
// 		}
// 	}
// 	return null;
// }

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
		broadcast('hideControl', {id:ctrl.id, appId:ctrl.appId});
		interactMgr.editVisibility(ctrl.id+"_radial", "widgets", false);
		if(ctrl.hasSideBar === true) {
			interactMgr.editVisibility(ctrl.id+"_sidebar", "widgets", false);
		}
	}
}

function removeControlsForUser(uniqueID){
	var widgets = SAGE2Items.widgets.list;
	for (var w in widgets){
		if (widgets.hasOwnProperty(w) && widgets[w].id.indexOf(uniqueID) > -1){
			interactMgr.removeGeometry(widgets[w].id + "_radial", "widgets");
			if (widgets[w].hasSideBar === true){
				interactMgr.removeGeometry(widgets[w].id + "_sidebar", "widgets");
			}
			SAGE2Items.widgets.removeItem(widgets[w].id);
		}
	}
	broadcast('removeControlsForUser', {user_id:uniqueID});
}

function showControl(ctrl, uniqueID, pointerX, pointerY){
	if (ctrl.show === false) {
		ctrl.show = true;
		interactMgr.editVisibility(ctrl.id+"_radial", "widgets", true);
		if(ctrl.hasSideBar === true) {
			interactMgr.editVisibility(ctrl.id+"_sidebar", "widgets", true);
		}
		moveControlToPointer(ctrl, uniqueID, pointerX, pointerY);
		broadcast('showControl', {id: ctrl.id, appId: ctrl.appId, user_color: sagePointers[uniqueID]? sagePointers[uniqueID].color: null});
	}
}

function moveControlToPointer(ctrl, uniqueID, pointerX, pointerY){
	var dt = new Date();
	var rightMargin = config.totalWidth - ctrl.width;
	var bottomMargin = config.totalHeight - ctrl.height;
	ctrl.left = (pointerX > rightMargin)? rightMargin: pointerX-ctrl.height/2;
	ctrl.top = (pointerY > bottomMargin)? bottomMargin: pointerY-ctrl.height/2;
	interactMgr.editGeometry(ctrl.id+"_radial", "widgets", "circle", {x: ctrl.left+(ctrl.height/2), y: ctrl.top+(ctrl.height/2), r: ctrl.height/2});
	if(ctrl.hasSideBar === true) {
		interactMgr.editGeometry(ctrl.id+"_sidebar", "widgets", "rectangle", {x: ctrl.left+ctrl.height, y: ctrl.top+(ctrl.height/2)-(ctrl.barHeight/2), w: ctrl.width-ctrl.height, h: ctrl.barHeight});
	}

	var app = SAGE2Items.applications.list[ctrl.appId];
	var appPos = (app===null)? null : getAppPositionSize(app);
	broadcast('setControlPosition', {date: dt, elemId: ctrl.id, elemLeft:ctrl.left, elemTop: ctrl.top, elemHeight: ctrl.height, user_color: sagePointers[uniqueID] ? sagePointers[uniqueID].color : null, appData: appPos});
}

// function moveAppToFront(id) {
// 	var selectedIndex;
// 	var selectedApp;
// 	var appIds = [];
// 	var i;

// 	for(i=0; i<applications.length; i++){
// 		if(applications[i].id === id){
// 			selectedIndex = i;
// 			selectedApp = applications[selectedIndex];
// 			break;
// 		}
// 		appIds.push(applications[i].id);
// 	}
// 	for(i=selectedIndex; i<applications.length-1; i++){
// 		applications[i] = applications[i+1];
// 		//interactMgr.editZIndex(applications[i].id, appIds.length);
// 		appIds.push(applications[i].id);
// 	}
// 	applications[applications.length-1] = selectedApp;
// 	//interactMgr.editZIndex(id, appIds.length);
// 	appIds.push(id);
// 	return appIds;
// }

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

function allTrueDict(dict, property) {
	var key;
	for (key in dict) {
		if (property === undefined && dict[key] !== true) return false;
		else if (property !== undefined && dict[key][property] !== true) return false;
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

function createSagePointer (uniqueID) {
	// From addClient type == sageUI
	sagePointers[uniqueID]      = new Sagepointer(uniqueID+"_pointer");
	remoteInteraction[uniqueID] = new Interaction(config);

	broadcast('createSagePointer', sagePointers[uniqueID]);
}

function showPointer(uniqueID, data) {
	if(sagePointers[uniqueID] === undefined) return;

	// From startSagePointer
	console.log(sageutils.header("Pointer") + "starting: " + uniqueID);

	if( data.sourceType === undefined )
		data.sourceType = "Pointer";

	sagePointers[uniqueID].start(data.label, data.color, data.sourceType);
	broadcast('showSagePointer', sagePointers[uniqueID]);
}

function hidePointer(uniqueID) {
	if(sagePointers[uniqueID] === undefined) return;

	// From stopSagePointer
	console.log(sageutils.header("Pointer") + "stopping: " + uniqueID);

	sagePointers[uniqueID].stop();
	if (remoteInteraction[uniqueID].hoverOverControl() !== null){
		broadcast('hideWidgetToAppConnector', remoteInteraction[uniqueID].hoverOverControl());
		remoteInteraction[uniqueID].leaveControlArea();
	}
	broadcast('hideSagePointer', sagePointers[uniqueID]);
}

// Copied from pointerPress. Eventually a touch gesture will use this to toggle modes
/*
function togglePointerMode(uniqueID) {
	if (sagePointers[uniqueID] === undefined) return;

	remoteInteraction[uniqueID].toggleModes();
	broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode});

	/*
	if(remoteInteraction[uniqueID].interactionMode === 0)
		addEventToUserLog(uniqueID, {type: "SAGE2PointerMode", data: {mode: "windowManagement"}, time: Date.now()});
	else
		addEventToUserLog(uniqueID, {type: "SAGE2PointerMode", data: {mode: "applicationInteraction"}, time: Date.now()});

}
*/

function globalToLocal(globalX, globalY, type, geometry) {
	var local = {};
	if(type === "circle") {
		local.x = globalX - (geometry.x - geometry.r);
		local.y = globalY - (geometry.y - geometry.r);
	}
	else {
		local.x = globalX - geometry.x;
		local.y = globalY - geometry.y;
	}

	return local;
}

function pointerPress(uniqueID, pointerX, pointerY, data) {
	if (sagePointers[uniqueID] === undefined) return;

	var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});

	if (obj === null) {
		pointerPressOnOpenSpace(uniqueID, pointerX, pointerY, data);
		return;
	}

	var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
	switch (obj.layerId) {
		case "staticUI":
			pointerPressOnStaticUI(uniqueID, pointerX, pointerY, data, obj, localPt);
			break;
		case "radialMenus":
			pointerPressOnRadialMenu(uniqueID, pointerX, pointerY, data, obj, localPt);
			break;
		case "widgets":
			pointerPressOrReleaseOnWidget(uniqueID, pointerX, pointerY, data, obj, localPt, "press");
			break;
		case "applications":
			pointerPressOnApplication(uniqueID, pointerX, pointerY, data, obj, localPt);
			break;
	}
}

function pointerPressOnOpenSpace(uniqueID, pointerX, pointerY, data) {
	//console.log("pointer press on open space");

	if (data.button === "right") {
		createRadialMenu(uniqueID, pointerX, pointerY);
	}
}

function pointerPressOnStaticUI(uniqueID, pointerX, pointerY, data, obj, localPt) {

}

function pointerPressOnRadialMenu(uniqueID, pointerX, pointerY, data, obj, localPt) {
	//console.log("pointer press on radial menu");

	// Drag Content Browser only from radial menu
	if (data.button === "left" && obj.type !== 'rectangle' ) {
		obj.data.onStartDrag(uniqueID, {x: pointerX, y: pointerY} );
	}

	radialMenuEvent({type: "pointerPress", id: uniqueID, x: pointerX, y: pointerY, data: data});
}

function pointerPressOrReleaseOnWidget(uniqueID, pointerX, pointerY, data, obj, localPt, pressRelease) {
	var id = obj.id.substr(0, obj.id.lastIndexOf("_"));
	if (data.button === "left") {
		var sidebarPoint ={x: obj.geometry.x - obj.data.left + localPt.x, y:obj.geometry.y - obj.data.top + localPt.y};
		var btn = SAGE2Items.widgets.findButtonByPoint(id, localPt) || SAGE2Items.widgets.findButtonByPoint(id, sidebarPoint);
		var ctrlData = {ctrlId:btn?btn.id:null, appId:obj.data.appId, instanceID:id};
		var regTI = /textInput/;
		var regSl = /slider/;
		var regButton = /button/;
		var lockedControl = null;
		var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};

		if (pressRelease === "press"){
			//var textInputOrSlider = SAGE2Items.widgets.findButtonByPoint(id, sidebarPoint);
			if (btn===null) {// && textInputOrSlider===null){
				remoteInteraction[uniqueID].selectMoveControl(obj.data, pointerX, pointerY);
			}
			else {
				remoteInteraction[uniqueID].releaseControl();
				lockedControl = remoteInteraction[uniqueID].lockedControl();
				if (lockedControl) {
					//If a text input widget was locked, drop it
					broadcast('deactivateTextInputControl', lockedControl);
					remoteInteraction[uniqueID].dropControl();
				}

				remoteInteraction[uniqueID].lockControl(ctrlData);
				if (regSl.test(btn.id)){
					broadcast('sliderKnobLockAction', {ctrl:ctrlData, x:pointerX, user: eUser});
				}
				else if (regTI.test(btn.id)) {
					broadcast('activateTextInputControl', {prevTextInput:lockedControl, curTextInput:ctrlData});
				}
			}
		}
		else {
			lockedControl = remoteInteraction[uniqueID].lockedControl();
			if (lockedControl !== null && btn!==null && regButton.test(btn.id) && lockedControl.ctrlId === btn.id) {
				remoteInteraction[uniqueID].dropControl();
				broadcast('executeControlFunction', {ctrl:ctrlData, user:eUser}, 'receivesWidgetEvents');

				var app = SAGE2Items.applications.list[ctrlData.appId];
				if (app) {
					if (btn.id.indexOf("buttonCloseApp") >= 0) {
						addEventToUserLog(data.addr, {type: "delete", data: {application: {id: app.id, type: app.application}}, time: Date.now()});
					}
					else if (btn.id.indexOf("buttonCloseWidget") >= 0) {
						addEventToUserLog(data.addr, {type: "widgetMenu", data: {action: "close", application: {id: app.id, type: app.application}}, time: Date.now()});
					}
					else {
						addEventToUserLog(data.addr, {type: "widgetAction", data: {application: data.appId, widget: data.ctrlId}, time: Date.now()});
					}
				}
			}
			remoteInteraction[uniqueID].releaseControl();
		}
	}
	else {
		if (obj.data.show === true && pressRelease === "press") {
			hideControl(obj.data);
			var app2 = SAGE2Items.applications.list[obj.data.appId];
			if (app2 !== null) {
				addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "close", application: {id: app2.id, type: app2.application}}, time: Date.now()});
			}
		}
	}
}

function releaseSlider(uniqueID){
	var ctrlData = remoteInteraction[uniqueID].lockedControl();
	if (/slider/.test(ctrlData.ctrlId) === true){
		remoteInteraction[uniqueID].dropControl();
		var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
		broadcast('executeControlFunction', {ctrl:ctrlData, user:eUser}, 'receivesWidgetEvents');
	}
}


function pointerPressOnApplication(uniqueID, pointerX, pointerY, data, obj, localPt) {
	var btn = SAGE2Items.applications.findButtonByPoint(obj.id, localPt);

	interactMgr.moveObjectToFront(obj.id, obj.layerId);
	var stickyList = stickyAppHandler.getStickingItems(obj.id);
	for (var idx in stickyList){
		interactMgr.moveObjectToFront(stickyList[idx].id, obj.layerId);
	}
	var newOrder = interactMgr.getObjectZIndexList(obj.layerId);
	broadcast('updateItemOrder', newOrder);

	// pointer press on app window
	if (btn === null) {
		if (remoteInteraction[uniqueID].windowManagementMode()) {
			if (data.button === "left") {
				selectApplicationForMove(uniqueID, obj.data, pointerX, pointerY);
			}
			else{
				var elemCtrl = SAGE2Items.widgets.list[obj.id+uniqueID+"_controls"];
				if (!elemCtrl) {
					broadcast('requestNewControl', {elemId: obj.id, user_id: uniqueID, user_label: sagePointers[uniqueID]? sagePointers[uniqueID].label : "", x: pointerX, y: pointerY, date: Date.now() });
				}
				else if (elemCtrl.show === false) {
					showControl(elemCtrl, uniqueID, pointerX, pointerY);
					addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "open", application: {id: obj.id, type: obj.data.application}}, time: Date.now()});
				}
				else {
					moveControlToPointer(elemCtrl, uniqueID, pointerX, pointerY);
				}
			}
		}
		else if (remoteInteraction[uniqueID].appInteractionMode()) {
			sendPointerPressToApplication(uniqueID, obj.data, pointerX, pointerY, data);
		}
		return;
	}

	switch (btn.id) {
		case "titleBar":
			selectApplicationForMove(uniqueID, obj.data, pointerX, pointerY);
			break;
		case "dragCorner":
			if (remoteInteraction[uniqueID].windowManagementMode()) {
				selectApplicationForResize(uniqueID, obj.data, pointerX, pointerY);
			}
			else if (remoteInteraction[uniqueID].appInteractionMode()) {
				sendPointerPressToApplication(uniqueID, obj.data, pointerX, pointerY, data);
			}
			break;
		case "fullscreenButton":
			toggleApplicationFullscreen(uniqueID, obj.data);
			break;
		case "closeButton":
			deleteApplication(obj.data.id);
			break;
	}
}

function selectApplicationForMove(uniqueID, app, pointerX, pointerY) {
	remoteInteraction[uniqueID].selectMoveItem(app, pointerX, pointerY);
	broadcast('startMove', {id: app.id, date: Date.now()});

	var eLogData = {
		type: "move",
		action: "start",
		application: {
			id: app.id,
			type: app.application
		},
		location: {
			x: parseInt(app.left, 10),
			y: parseInt(app.top, 10),
			width: parseInt(app.width, 10),
			height: parseInt(app.height, 10)
		}
	};
	addEventToUserLog(uniqueID, {type: "windowManagement", data: eLogData, time: Date.now()});
}

function selectApplicationForResize(uniqueID, app, pointerX, pointerY) {
	remoteInteraction[uniqueID].selectResizeItem(app, pointerX, pointerY);
	broadcast('startResize', {id: app.id, date: Date.now()});

	var eLogData = {
		type: "resize",
		action: "start",
		application: {
			id: app.id,
			type: app.application
		},
		location: {
			x: parseInt(app.left, 10),
			y: parseInt(app.top, 10),
			width: parseInt(app.width, 10),
			height: parseInt(app.height, 10)
		}
	};
	addEventToUserLog(uniqueID, {type: "windowManagement", data: eLogData, time: Date.now()});
}

function sendPointerPressToApplication(uniqueID, app, pointerX, pointerY, data) {
	var ePosition = {x: pointerX - app.left, y: pointerY - (app.top + config.ui.titleBarHeight)};
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};

	var event = {
		id: app.id,
		type: "pointerPress",
		position: ePosition,
		user: eUser,
		data: data,
		date: Date.now()
	};

	broadcast('eventInItem', event);

	var eLogData = {
		type: "pointerPress",
		application: {
			id: app.id,
			type: app.application
		},
		position: {
			x: parseInt(ePosition.x, 10),
			y: parseInt(ePosition.y, 10)
		}
	};
	addEventToUserLog(uniqueID, {type: "applicationInteraction", data: eLogData, time: Date.now()});
}

function pointerMove(uniqueID, pointerX, pointerY, data) {
	if (sagePointers[uniqueID] === undefined) return;

	sagePointers[uniqueID].updatePointerPosition(data, config.totalWidth, config.totalHeight);
	pointerX = sagePointers[uniqueID].left;
	pointerY = sagePointers[uniqueID].top;

	updatePointerPosition(uniqueID, pointerX, pointerY, data);
}

function pointerPosition(uniqueID, data) {
	if (sagePointers[uniqueID] === undefined) return;

	sagePointers[uniqueID].updatePointerPosition(data, config.totalWidth, config.totalHeight);
	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	updatePointerPosition(uniqueID, pointerX, pointerY, data);
}

function updatePointerPosition(uniqueID, pointerX, pointerY, data) {
	broadcast('updateSagePointerPosition', sagePointers[uniqueID]);

	// update radial menu position if dragged outside radial menu
	updateRadialMenuPointerPosition(uniqueID, pointerX, pointerY);

	// update app position and size if currently modifying a window
	var updatedMoveItem = remoteInteraction[uniqueID].moveSelectedItem(pointerX, pointerY);
	var updatedResizeItem = remoteInteraction[uniqueID].resizeSelectedItem(pointerX, pointerY);
	var updatedControl = remoteInteraction[uniqueID].moveSelectedControl(pointerX, pointerY);

	if (updatedMoveItem !== null) {
		moveApplicationWindow(uniqueID, updatedMoveItem);
	}
	else if (updatedResizeItem !== null) {
		moveAndResizeApplicationWindow(updatedResizeItem);
    }
    else if (updatedControl !== null) {
		moveWidgetControls(uniqueID, updatedControl);
	}
	else {
		var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});
		if (obj === null) {
			removeExistingHoverCorner(uniqueID);
		}
		else {
			var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
			switch (obj.layerId) {
				case "staticUI":
					removeExistingHoverCorner(uniqueID);
					break;
				case "radialMenus":
					removeExistingHoverCorner(uniqueID);
					pointerMoveOnRadialMenu(uniqueID, pointerX, pointerY, data, obj, localPt);
					break;
				case "widgets":
					pointerMoveOnWidgets(uniqueID, pointerX, pointerY, data, obj, localPt);
					removeExistingHoverCorner(uniqueID);
					break;
				case "applications":
					pointerMoveOnApplication(uniqueID, pointerX, pointerY, data, obj, localPt);
					break;
			}
		}
		remoteInteraction[uniqueID].setPreviousInteractionItem(obj);
	}
}



function pointerMoveOnRadialMenu(uniqueID, pointerX, pointerY, data, obj, localPt) {
	// Check if on button
	radialMenuEvent( { type: "pointerMove", id: uniqueID, x: pointerX, y: pointerY, data: data } );

	var existingRadialMenu = obj.data;

	// Content Browser is only draggable on radial menu
	if (existingRadialMenu.dragState === true && obj.type !== 'rectangle' ) {
		var offset = existingRadialMenu.getDragOffset(uniqueID, {x: pointerX, y: pointerY});
		moveRadialMenu( existingRadialMenu.id, offset.x, offset.y );
	}
}

function pointerMoveOnWidgets(uniqueID, pointerX, pointerY, data, obj, localPt){
	// widgets
	var lockedControl = remoteInteraction[uniqueID].lockedControl();
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};

	if (lockedControl && /slider/.test(lockedControl.ctrlId)){
		broadcast('moveSliderKnob', {ctrl:lockedControl, x:pointerX, user: eUser});
		return;
	}
	//showOrHideWidgetConnectors(uniqueID, obj.data, "move");
	// Widget connector show logic ends

}

function pointerMoveOnApplication(uniqueID, pointerX, pointerY, data, obj, localPt) {
	var btn = SAGE2Items.applications.findButtonByPoint(obj.id, localPt);

	// pointer move on app window
	if (btn === null) {
		removeExistingHoverCorner(uniqueID);
		if (remoteInteraction[uniqueID].appInteractionMode()) {
			sendPointerMoveToApplication(uniqueID, obj.data, pointerX, pointerY, data);
		}
		return;
	}

	switch (btn.id) {
		case "titleBar":
			removeExistingHoverCorner(uniqueID);
			break;
		case "dragCorner":
			if (remoteInteraction[uniqueID].windowManagementMode()) {
				if(remoteInteraction[uniqueID].hoverCornerItem === null) {
					remoteInteraction[uniqueID].setHoverCornerItem(obj.data);
					broadcast('hoverOverItemCorner', {elemId: obj.data.id, flag: true});
				}
				else if (remoteInteraction[uniqueID].hoverCornerItem.id !== obj.data.id) {
					broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false});
					remoteInteraction[uniqueID].setHoverCornerItem(obj.data);
					broadcast('hoverOverItemCorner', {elemId: obj.data.id, flag: true});
				}
			}
			else if (remoteInteraction[uniqueID].appInteractionMode()) {
				sendPointerMoveToApplication(uniqueID, obj.data, pointerX, pointerY, data);
			}
			break;
		case "fullscreenButton":
			removeExistingHoverCorner(uniqueID);
			break;
		case "closeButton":
			removeExistingHoverCorner(uniqueID);
			break;
	}
}

function removeExistingHoverCorner(uniqueID) {
	// remove hover corner if exists
	if(remoteInteraction[uniqueID].hoverCornerItem !== null){
		broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false});
		remoteInteraction[uniqueID].setHoverCornerItem(null);
	}
}

function moveApplicationWindow(uniqueID, moveApp) {
	var backgroundObj = interactMgr.searchGeometry({x: moveApp.elemLeft-1, y: moveApp.elemTop-1});
	if (backgroundObj!==null){
		if (backgroundObj.layerId === "applications"){
			attachAppIfSticky(backgroundObj.data, moveApp.elemId);
		}
	}

	interactMgr.editGeometry(moveApp.elemId, "applications", "rectangle", {x: moveApp.elemLeft, y: moveApp.elemTop, w: moveApp.elemWidth, h: moveApp.elemHeight+config.ui.titleBarHeight});
	moveApp.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
	broadcast('setItemPosition', moveApp);
	if (SAGE2Items.renderSync.hasOwnProperty(moveApp.elemId)) {
		var app = SAGE2Items.applications.list[moveApp.elemId];
		calculateValidBlocks(app, mediaBlockSize, SAGE2Items.renderSync[app.id]);
		if(app.id in SAGE2Items.renderSync && SAGE2Items.renderSync[app.id].newFrameGenerated === false) {
			handleNewVideoFrame(app.id);
		}
	}

	var updatedStickyItems = stickyAppHandler.moveItemsStickingToUpdatedItem(moveApp);

	for (var idx=0; idx<updatedStickyItems.length; idx++) {
		var stickyItem = updatedStickyItems[idx];
		interactMgr.editGeometry(stickyItem.elemId, "applications", "rectangle", {x: stickyItem.elemLeft, y: stickyItem.elemTop, w: stickyItem.elemWidth, h: stickyItem.elemHeight+config.ui.titleBarHeight});
		updatedStickyItems[idx].user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
		broadcast('setItemPosition', updatedStickyItems[idx]);
	}
}

function moveAndResizeApplicationWindow(resizeApp) {
	interactMgr.editGeometry(resizeApp.elemId, "applications", "rectangle", {x: resizeApp.elemLeft, y: resizeApp.elemTop, w: resizeApp.elemWidth, h: resizeApp.elemHeight+config.ui.titleBarHeight});
	handleApplicationResize(resizeApp.elemId);
	broadcast('setItemPositionAndSize', resizeApp);
	if (SAGE2Items.renderSync.hasOwnProperty(resizeApp.elemId)) {
		var app = SAGE2Items.applications.list[resizeApp.elemId];
		calculateValidBlocks(app, mediaBlockSize, SAGE2Items.renderSync[app.id]);
		if(app.id in SAGE2Items.renderSync && SAGE2Items.renderSync[app.id].newFrameGenerated === false) {
			handleNewVideoFrame(app.id);
		}
	}
}

function moveWidgetControls (uniqueID, moveControl){
	var app = SAGE2Items.applications.list[moveControl.appId];
	if (app){
		moveControl.appData = getAppPositionSize(app);
		moveControl.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
		broadcast('setControlPosition', moveControl);
		var circle =  {x: moveControl.elemLeft+(moveControl.elemHeight/2), y: moveControl.elemTop+(moveControl.elemHeight/2), r: moveControl.elemHeight/2};
		var bar = {x: moveControl.elemLeft+moveControl.elemHeight, y: moveControl.elemTop+(moveControl.elemHeight/2)-(moveControl.elemBarHeight/2), w: moveControl.elemWidth-moveControl.elemHeight, h: moveControl.elemBarHeight};
		interactMgr.editGeometry(moveControl.elemId+"_radial", "widgets", "circle", circle);
		if(moveControl.hasSideBar === true) {
			interactMgr.editGeometry(moveControl.elemId+"_sidebar", "widgets", "rectangle", bar );
		}
	}
}

function sendPointerMoveToApplication(uniqueID, app, pointerX, pointerY, data) {
	var ePosition = {x: pointerX - app.left, y: pointerY - (app.top + config.ui.titleBarHeight)};
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};

	var event = {
		id: app.id,
		type: "pointerMove",
		position: ePosition,
		user: eUser,
		data: data,
		date: Date.now()
	};

	broadcast('eventInItem', event);
}

function pointerRelease(uniqueID, pointerX, pointerY, data) {
	if (sagePointers[uniqueID] === undefined) return;

	// If obj is undefined (as in this case, will search for radial menu using uniqueID
	pointerReleaseOnRadialMenu(uniqueID, pointerX, pointerY, data, obj);

	if (remoteInteraction[uniqueID].lockedControl()!==null) {
		releaseSlider(uniqueID);
	}
    var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});
    if (obj === null) {
		dropSelectedApp(uniqueID, true);
		return;
    }

	switch (obj.layerId) {
		case "staticUI":
			pointerReleaseOnStaticUI(uniqueID, pointerX, pointerY, obj);
			break;
		case "radialMenus":
			pointerReleaseOnRadialMenu(uniqueID, pointerX, pointerY, data, obj);
			dropSelectedApp(uniqueID, true);
			break;
		case "applications":
			if (dropSelectedApp(uniqueID, true) === null) {
				if (remoteInteraction[uniqueID].appInteractionMode()) {
					sendPointerReleaseToApplication(uniqueID, obj.data, pointerX, pointerY, data);
				}
			}
			break;
		case "widgets":
			var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
			pointerPressOrReleaseOnWidget(uniqueID, pointerX, pointerY, data, obj, localPt, "release");
			dropSelectedApp(uniqueID, true);
			break;
		default:
			dropSelectedApp(uniqueID, true);
	}
}

function pointerReleaseOnStaticUI(uniqueID, pointerX, pointerY, obj) {
	var remote = obj.data;
	var app    = dropSelectedApp(uniqueID, false);
	if (app !== null && remote.wsio.connected) {
		remote.wsio.emit('addNewElementFromRemoteServer', app);

		var eLogData = {
			host: remote.wsio.remoteAddress.address,
			port: remote.wsio.remoteAddress.port,
			application: {
				id: app.id,
				type: app.application
			}
		};
		addEventToUserLog(uniqueID, {type: "shareApplication", data: eLogData, time: Date.now()});
	}
}

function pointerReleaseOnRadialMenu(uniqueID, pointerX, pointerY, data, obj) {
	var radialMenu;
	if( obj === undefined )
	{
		for (var key in SAGE2Items.radialMenus.list)
		{
			radialMenu = SAGE2Items.radialMenus.list[key];
			//console.log(data.id+"_menu: " + radialMenu);
			if( radialMenu !== undefined )
			{
				radialMenu.onRelease(uniqueID);
			}
		}
	}
	else
	{
		radialMenu = obj.data.onRelease( uniqueID );
		radialMenuEvent( { type: "pointerRelease", id: uniqueID, x: pointerX, y: pointerY, data: data } );
	}
}

function dropSelectedApp(uniqueID, valid) {
	var app;
	if (remoteInteraction[uniqueID].selectedMoveItem !== null) {
		app = SAGE2Items.applications.list[remoteInteraction[uniqueID].selectedMoveItem.id];
		dropMoveApp(uniqueID, app, valid);
		return app;
	}
	else if(remoteInteraction[uniqueID].selectedResizeItem !== null) {
		app = SAGE2Items.applications.list[remoteInteraction[uniqueID].selectedResizeItem.id];
		dropResizeApp(uniqueID, app);
		return app;
    }
    return null;
}

function dropMoveApp(uniqueID, app, valid) {
	if (valid !== false) valid = true;
	var updatedItem = remoteInteraction[uniqueID].releaseItem(valid);
	if (updatedItem !== null) moveApplicationWindow(uniqueID, updatedItem);

	broadcast('finishedMove', {id: app.id, date: Date.now()});

	var eLogData = {
		type: "move",
		action: "end",
		application: {
			id: app.id,
			type: app.application
		},
		location: {
			x: parseInt(app.left, 10),
			y: parseInt(app.top, 10),
			width: parseInt(app.width, 10),
			height: parseInt(app.height, 10)
		}
	};
	addEventToUserLog(uniqueID, {type: "windowManagement", data: eLogData, time: Date.now()});
}

function dropResizeApp(uniqueID, app) {
	broadcast('finishedResize', {id: app.id, date: Date.now()});

	var eLogData = {
		type: "resize",
		action: "end",
		application: {
			id: app.id,
			type: app.application
		},
		location: {
			x: parseInt(app.left, 10),
			y: parseInt(app.top, 10),
			width: parseInt(app.width, 10),
			height: parseInt(app.height, 10)
		}
	};
	addEventToUserLog(uniqueID, {type: "windowManagement", data: eLogData, time: Date.now()});

	remoteInteraction[uniqueID].releaseItem(true);
}

function sendPointerReleaseToApplication(uniqueID, app, pointerX, pointerY, data) {
	var ePosition = {x: pointerX - app.left, y: pointerY - (app.top + config.ui.titleBarHeight)};
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};

	var event = {
		id: app.id,
		type: "pointerRelease",
		position: ePosition,
		user: eUser,
		data: data,
		date: Date.now()
	};

	broadcast('eventInItem', event);
}

function pointerDblClick(uniqueID, pointerX, pointerY) {
	if (sagePointers[uniqueID] === undefined) return;

	var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});
    if (obj === null) return;

    var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
	switch (obj.layerId) {
		case "applications":
			pointerDblClickOnApplication(uniqueID, pointerX, pointerY, obj, localPt);
		break;
	}
}

function pointerDblClickOnApplication(uniqueID, pointerX, pointerY, obj, localPt) {
	var btn = SAGE2Items.applications.findButtonByPoint(obj.id, localPt);

	// pointer press on app window
	if (btn === null) {
		if (remoteInteraction[uniqueID].windowManagementMode()) {
			toggleApplicationFullscreen(uniqueID, obj.data);
		}
		return;
	}

	switch (btn.id) {
		case "titleBar":
			toggleApplicationFullscreen(uniqueID, obj.data);
			break;
		case "dragCorner":
			break;
		case "fullscreenButton":
			break;
		case "closeButton":
			break;
	}
}

function pointerScrollStart(uniqueID, pointerX, pointerY) {
	if(sagePointers[uniqueID] === undefined) return;

	var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});

	if (obj === null) {
		return;
	}

	var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
	switch (obj.layerId) {
		case "staticUI":
			break;
		case "radialMenus":
			break;
		case "widgets":
			break;
		case "applications":
			pointerScrollStartOnApplication(uniqueID, pointerX, pointerY, obj, localPt);
			break;
	}
}

function pointerScrollStartOnApplication(uniqueID, pointerX, pointerY, obj, localPt) {
	var btn = SAGE2Items.applications.findButtonByPoint(obj.id, localPt);

	interactMgr.moveObjectToFront(obj.id, obj.layerId);
	var newOrder = interactMgr.getObjectZIndexList(obj.layerId);
	broadcast('updateItemOrder', newOrder);

	// pointer scroll on app window
	if (btn === null) {
		if (remoteInteraction[uniqueID].windowManagementMode()) {
			selectApplicationForScrollResize(uniqueID, obj.data, pointerX, pointerY);
		}
		else if (remoteInteraction[uniqueID].appInteractionMode()) {
			remoteInteraction[uniqueID].selectWheelItem = obj.data;
			remoteInteraction[uniqueID].selectWheelDelta = 0;
		}
		return;
	}

	switch (btn.id) {
		case "titleBar":
			selectApplicationForScrollResize(uniqueID, obj.data, pointerX, pointerY);
			break;
		case "dragCorner":
			if (remoteInteraction[uniqueID].windowManagementMode()) {
				selectApplicationForScrollResize(uniqueID, obj.data, pointerX, pointerY);
			}
			else if (remoteInteraction[uniqueID].appInteractionMode()) {
				remoteInteraction[uniqueID].selectWheelItem = obj.data;
				remoteInteraction[uniqueID].selectWheelDelta = 0;
			}
			break;
		case "fullscreenButton":
			selectApplicationForScrollResize(uniqueID, obj.data, pointerX, pointerY);
			break;
		case "closeButton":
			selectApplicationForScrollResize(uniqueID, obj.data, pointerX, pointerY);
			break;
	}
}

function selectApplicationForScrollResize(uniqueID, app, pointerX, pointerY) {
	remoteInteraction[uniqueID].selectScrollItem(app);

	broadcast('startMove', {id: app.id, date: Date.now()});
	broadcast('startResize', {id: app.id, date: Date.now()});

	var a = {
		id: app.id,
		type: app.application
	};
	var l = {
		x: parseInt(app.left, 10),
		y: parseInt(app.top, 10),
		width: parseInt(app.width, 10),
		height: parseInt(app.height, 10)
	};

	addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "start", application: a, location: l}, time: Date.now()});
	addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "start", application: a, location: l}, time: Date.now()});
}

function pointerScroll(uniqueID, data) {
	if (sagePointers[uniqueID] === undefined) return;

	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	var scale = 1.0 + Math.abs(data.wheelDelta)/512;
	if (data.wheelDelta > 0) {
		scale = 1.0 / scale;
	}

	var updatedResizeItem = remoteInteraction[uniqueID].scrollSelectedItem(scale);
	if (updatedResizeItem !== null) {
		moveAndResizeApplicationWindow(updatedResizeItem);
	}
	else {
		if (remoteInteraction[uniqueID].appInteractionMode()) {
			var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});

			if (obj === null) {
				return;
			}

			//var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
			switch (obj.layerId) {
				case "staticUI":
					break;
				case "radialMenus":
					break;
				case "widgets":
					break;
				case "applications":
					sendPointerScrollToApplication(uniqueID, obj.data, pointerX, pointerY, data);
					break;
			}
		}
	}
}

function sendPointerScrollToApplication(uniqueID, app, pointerX, pointerY, data) {
	var ePosition = {x: pointerX - app.left, y: pointerY - (app.top + config.ui.titleBarHeight)};
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};

	var event = {id: app.id, type: "pointerScroll", position: ePosition, user: eUser, data: data, date: Date.now()};

	broadcast('eventInItem', event);

	remoteInteraction[uniqueID].selectWheelDelta += data.wheelDelta;
}

function pointerScrollEnd(uniqueID) {
	if (sagePointers[uniqueID] === undefined) return;

	var updatedResizeItem = remoteInteraction[uniqueID].selectedScrollItem;
	if (updatedResizeItem !== null) {
		broadcast('finishedMove', {id: updatedResizeItem.id, date: Date()});
		broadcast('finishedResize', {id: updatedResizeItem.id, date: Date.now()});

		var a = {
			id: updatedResizeItem.id,
			type: updatedResizeItem.application
		};
		var l = {
			x: parseInt(updatedResizeItem.left, 10),
			y: parseInt(updatedResizeItem.top, 10),
			width: parseInt(updatedResizeItem.width, 10),
			height: parseInt(updatedResizeItem.height, 10)
		};

		addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "end", application: a, location: l}, time: Date.now()});
		addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "end", application: a, location: l}, time: Date.now()});

		remoteInteraction[uniqueID].selectedScrollItem = null;
	}
	else {
		if (remoteInteraction[uniqueID].appInteractionMode()) {
			var app = remoteInteraction[uniqueID].selectWheelItem;
			if( app !== undefined ) {
				var eLogData = {
					type: "pointerScroll",
					application: {
						id: app.id,
						type: app.application
					},
					wheelDelta: remoteInteraction[uniqueID].selectWheelDelta
				};
				addEventToUserLog(uniqueID, {type: "applicationInteraction", data: eLogData, time: Date.now()});
			}
		}
	}
}

function keyDown( uniqueID, pointerX, pointerY, data) {
	if (sagePointers[uniqueID] === undefined) return;

	switch (data.code) {
		case 16:
			remoteInteraction[uniqueID].SHIFT = true;
			break;
		case 17:
			remoteInteraction[uniqueID].CTRL = true;
			break;
		case 18:
			remoteInteraction[uniqueID].ALT = true;
			break;
		case 20:
			remoteInteraction[uniqueID].CAPS = true;
			break;
		case 91:
		case 92:
		case 93:
			remoteInteraction[uniqueID].CMD = true;
			break;
	}

	if (remoteInteraction[uniqueID].appInteractionMode()) {
		var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});

		if (obj === null) {
			return;
		}

		switch (obj.layerId) {
			case "staticUI":
				break;
			case "radialMenus":
				break;
			case "widgets":
				break;
			case "applications":
				sendKeyDownToApplication(uniqueID, obj.data, pointerX, pointerY, data);
				break;
		}
	}
}

function sendKeyDownToApplication(uniqueID, app, pointerX, pointerY, data) {
	var ePosition = {x: pointerX - app.left, y: pointerY - (app.top + config.ui.titleBarHeight)};
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
	var eData =  {code: data.code, state: "down"};

	var event = {id: app.id, type: "specialKey", position: ePosition, user: eUser, data: eData, date: Date.now()};
	broadcast('eventInItem', event);

	var eLogData = {
		type: "specialKey",
		application: {
			id: app.id,
			type: app.application
		},
		code: eData.code,
		state: eData.state
	};
	addEventToUserLog(uniqueID, {type: "applicationInteraction", data: eLogData, time: Date.now()});
}

function keyUp( uniqueID, pointerX, pointerY, data) {
	if (sagePointers[uniqueID] === undefined) return;

	switch (data.code) {
		case 16:
			remoteInteraction[uniqueID].SHIFT = false;
			break;
		case 17:
			remoteInteraction[uniqueID].CTRL = false;
			break;
		case 18:
			remoteInteraction[uniqueID].ALT = false;
			break;
		case 20:
			remoteInteraction[uniqueID].CAPS = false;
			break;
		case 91:
		case 92:
		case 93:
			remoteInteraction[uniqueID].CMD = false;
			break;
	}

	if (remoteInteraction[uniqueID].modeChange !== undefined && (data.code === 9 || data.code === 16)) return;

	var lockedControl = remoteInteraction[uniqueID].lockedControl();

	if (lockedControl !== null) {
		var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
		var event = {code: data.code, printable:false, state: "up", ctrlId:lockedControl.ctrlId, appId:lockedControl.appId, instanceID:lockedControl.instanceID, user: eUser};
		broadcast('keyInTextInputWidget', event);
		if (data.code === 13) { //Enter key
			remoteInteraction[uniqueID].dropControl();
		}
		return;
	}

	var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});

	if (obj === null) {
		return;
	}

	switch (obj.layerId) {
		case "staticUI":
			break;
		case "radialMenus":
			break;
		case "widgets":
			break;
		case "applications":
			if (remoteInteraction[uniqueID].windowManagementMode()) {
				if (data.code === 8 || data.code === 46) { // backspace or delete
					deleteApplication(obj.data.id);

					var eLogData = {
						application: {
							id: obj.data.id,
							type: obj.data.application
						}
					};
					addEventToUserLog(uniqueID, {type: "delete", data: eLogData, time: Date.now()});
				}
			}
			else if (remoteInteraction[uniqueID].appInteractionMode()) {
				sendKeyUpToApplication(uniqueID, obj.data, pointerX, pointerY, data);
			}
			break;
	}
}

function sendKeyUpToApplication(uniqueID, app, pointerX, pointerY, data) {
	var ePosition = {x: pointerX - app.left, y: pointerY - (app.top + config.ui.titleBarHeight)};
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
	var eData =  {code: data.code, state: "up"};

	var event = {id: app.id, type: "specialKey", position: ePosition, user: eUser, data: eData, date: Date.now()};
	broadcast('eventInItem', event);

	var eLogData = {
		type: "specialKey",
		application: {
			id: app.id,
			type: app.application
		},
		code: eData.code,
		state: eData.state
	};
	addEventToUserLog(uniqueID, {type: "applicationInteraction", data: eLogData, time: Date.now()});
}

function keyPress(uniqueID, pointerX, pointerY, data) {
	if (sagePointers[uniqueID] === undefined) return;


	if (data.code === 9 && remoteInteraction[uniqueID].SHIFT && sagePointers[uniqueID].visible) {
		// shift + tab
		remoteInteraction[uniqueID].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode});

		//if (remoteInteraction[uniqueID].interactionMode === 0)
		//	addEventToUserLog(uniqueID, {type: "SAGE2PointerMode", data: {mode: "windowManagement"}, time: Date.now()});
		//else
		//	addEventToUserLog(uniqueID, {type: "SAGE2PointerMode", data: {mode: "applicationInteraction"}, time: Date.now()});

		if (remoteInteraction[uniqueID].modeChange !== undefined) {
			clearTimeout(remoteInteraction[uniqueID].modeChange);
		}
		remoteInteraction[uniqueID].modeChange = setTimeout(function() {
			delete remoteInteraction[uniqueID].modeChange;
		}, 500);

		return;
	}
	var lockedControl = remoteInteraction[uniqueID].lockedControl();

	if (lockedControl !== null) {
		var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
		var event = {code: data.code, printable:true, state: "press", ctrlId:lockedControl.ctrlId, appId:lockedControl.appId, instanceID:lockedControl.instanceID, user: eUser};
		broadcast('keyInTextInputWidget', event);
		if (data.code === 13) { //Enter key
			remoteInteraction[uniqueID].dropControl();
		}
		return;
	}

	if (remoteInteraction[uniqueID].appInteractionMode()) {
		var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});

		if (obj === null) {
			return;
		}

		switch (obj.layerId) {
			case "staticUI":
				break;
			case "radialMenus":
				break;
			case "widgets":
				break;
			case "applications":
				sendKeyPressToApplication(uniqueID, obj.data, pointerX, pointerY, data);
				break;
		}
	}
}

function sendKeyPressToApplication(uniqueID, app, pointerX, pointerY, data) {
	var ePosition = {x: pointerX - app.left, y: pointerY - (app.top + config.ui.titleBarHeight)};
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};

	var event = {id: app.id, type: "keyboard", position: ePosition, user: eUser, data: data, date: Date.now()};
	broadcast('eventInItem', event);

	var eLogData = {
		type: "keyboard",
		application: {
			id: app.id,
			type: app.application
		},
		code: data.code,
		character: data.character
	};
	addEventToUserLog(uniqueID, {type: "applicationInteraction", data: eLogData, time: Date.now()});
}


function toggleApplicationFullscreen(uniqueID, app) {
	var resizeApp;
	if (app.maximized !== true) { // maximize
		resizeApp = remoteInteraction[uniqueID].maximizeSelectedItem(app);
	}
	else { // restore to previous
		resizeApp = remoteInteraction[uniqueID].restoreSelectedItem(app);
	}
	if (resizeApp !== null) {
		broadcast('startMove', {id: resizeApp.elemId, date: Date.now()});
		broadcast('startResize', {id: resizeApp.elemId, date: Date.now()});

		var a = {
			id: app.id,
			type: app.application
		};
		var l = {
			x: parseInt(app.left, 10),
			y: parseInt(app.top, 10),
			width: parseInt(app.width, 10),
			height: parseInt(app.height, 10)
		};

		addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "start", application: a, location: l}, time: Date.now()});
		addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "start", application: a, location: l}, time: Date.now()});

		moveAndResizeApplicationWindow(resizeApp);
		/*
		interactMgr.editGeometry(resizeApp.elemId, "applications", "rectangle", {x: resizeApp.elemLeft, y: resizeApp.elemTop, w: resizeApp.elemWidth, h: resizeApp.elemHeight+config.ui.titleBarHeight});
		handleApplicationResize(resizeApp.elemId);
		broadcast('setItemPositionAndSize', resizeApp);
		if (resizeApp.elemId in SAGE2Items.renderSync) {
			var app = SAGE2Items.applications.list[resizeApp.elemId];
			calculateValidBlocks(app, mediaBlockSize, SAGE2Items.renderSync[app.id]);
			if(app.id in SAGE2Items.renderSync && SAGE2Items.renderSync[app.id].newFrameGenerated === false) {
				handleNewVideoFrame(app.id);
			}
		}
		*/

		broadcast('finishedMove', {id: resizeApp.elemId, date: Date.now()});
		broadcast('finishedResize', {id: resizeApp.elemId, date: Date.now()});

		addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "end", application: a, location: l}, time: Date.now()});
		addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "end", application: a, location: l}, time: Date.now()});
	}
}

function deleteApplication(appId) {
	if (!SAGE2Items.applications.list.hasOwnProperty(appId)) return;
	var app = SAGE2Items.applications.list[appId];
	var application = app.application;
	if (application === "media_stream" || application === "media_block_stream") {
		var i;
		var mediaStreamData = appId.split("|");
		var sender = {wsio: null, clientId: mediaStreamData[0], streamId: parseInt(mediaStreamData[1], 10)};
		for (i=0; i<clients.length; i++) {
			if (clients[i].id === sender.clientId) sender.wsio = clients[i];
		}
		if (sender.wsio !== null) sender.wsio.emit('stopMediaCapture', {streamId: sender.streamId});
	}

	SAGE2Items.applications.removeItem(appId);
	interactMgr.removeGeometry(appId, "applications");
	var widgets = SAGE2Items.widgets.list;
	for (var w in widgets){
		if (widgets.hasOwnProperty(w) && widgets[w].appId === appId){
			interactMgr.removeGeometry(widgets[w].id + "_radial", "widgets");
			if (widgets[w].hasSideBar === true){
				interactMgr.removeGeometry(widgets[w].id + "_sidebar", "widgets");
			}
			SAGE2Items.widgets.removeItem(widgets[w].id);
		}
	}

	stickyAppHandler.removeElement(app);
	broadcast('deleteElement', {elemId: appId});
}

/*



	var app;
	var elem = findAppUnderPointer(pointerX, pointerY);

	// widgets
	var ct = findControlsUnderPointer(pointerX, pointerY);
	//var itemUnderPointer = ct || elem;

	//Draw widget connectors
	//showOrHideWidgetConnectors(uniqueID, itemUnderPointer, "press");
	if (ct !== null) {
		if (data.button === "left") {
			remoteInteraction[uniqueID].selectMoveControl(ct, pointerX, pointerY);
			broadcast('requestControlId', {addr:uniqueID, ptrId:sagePointers[uniqueID].id, x:pointerX, y:pointerY});
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
			broadcast('dropTextInputControl', msgdata);
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

	// apps
	var elemCtrl;

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
					broadcast('startResize', {id: elem.id, date: new Date()});

					addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "start", application: {id: elem.id, type: elem.application}, location: {x: parseInt(elem.left, 10), y: parseInt(elem.top, 10), width: parseInt(elem.width, 10), height: parseInt(elem.height, 10)}}, time: Date.now()});
				}
				// otherwise - select for move
				else{
					remoteInteraction[uniqueID].selectMoveItem(elem, pointerX, pointerY); //will only go through if window management mode
					broadcast('startMove', {id: elem.id, date: new Date()});

					addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "start", application: {id: elem.id, type: elem.application}, location: {x: parseInt(elem.left, 10), y: parseInt(elem.top, 10), width: parseInt(elem.width, 10), height: parseInt(elem.height, 10)}}, time: Date.now()});
				}
			}
			else if(data.button === "right"){
				elemCtrl = findControlById(elem.id+uniqueID+"_controls");
				if (elemCtrl === null) {
					broadcast('requestNewControl', {elemId: elem.id, user_id: uniqueID, user_label: sagePointers[uniqueID]? sagePointers[uniqueID].label : "", x: pointerX, y: pointerY, date: now });
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
			console.log("Should not get past this!!");
			if (pointerY >=elem.top && pointerY <= elem.top+config.ui.titleBarHeight){
				console.log("comming here!!!!");
				if(data.button === "right"){
					elemCtrl = findControlById(elem.id+uniqueID+"_controls");
					if (elemCtrl === null) {
						broadcast('requestNewControl', {elemId: elem.id, user_id: uniqueID, user_label: sagePointers[uniqueID]? sagePointers[uniqueID].label : "", x: pointerX, y: pointerY, date: now });
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

				broadcast('eventInItem', event);

				addEventToUserLog(uniqueID, {type: "applicationInteraction", data: {type: "pointerPress", application: {id: elem.id, type: elem.application}, position: {x: parseInt(ePosition.x, 10), y: parseInt(ePosition.y, 10)}}, time: Date.now()});
			}
		}
		var stickyList = stickyAppHandler.getStickingItems(elem.id);
		var newOrder = moveAppToFront(elem.id);
		for (var idx in stickyList){
			newOrder = moveAppToFront(stickyList[idx].id);
		}
		broadcast('updateItemOrder', {idList: newOrder});
	}

}
*/

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
				broadcast('requestNewControl', {elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now });
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
					broadcast('requestNewControl', {elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now });
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
				broadcast( 'eventInItem', { eventType: "pointerPress", elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, itemRelativeX: itemRelX, itemRelativeY: itemRelY, data: {button: "right", user_color: sagePointers[address].color}, date: now });
			}
		}

		var newOrder = moveAppToFront(elem.id);
		broadcast('updateItemOrder', {idList: newOrder});
	}
	else{
		broadcast('requestNewControl', {elemId: null, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now });
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
			broadcast('pointerReleaseRight', {elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now });
		}
		else if ( remoteInteraction[address].appInteractionMode() ) {
			if (pointerY >=elem.top && pointerY <= elem.top+config.ui.titleBarHeight){
				broadcast('pointerReleaseRight', {elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now });
			}
			else{
				var itemRelX = pointerX - elem.left;
				var itemRelY = pointerY - elem.top - config.ui.titleBarHeight;
				broadcast( 'eventInItem', { eventType: "pointerRelease", elemId: elem.id, user_id: sagePointers[address].id, user_label: sagePointers[address].label, itemRelativeX: itemRelX, itemRelativeY: itemRelY, data: {button: "right", user_color: sagePointers[address].color}, date: now });
			}
		}
	}
	else {
		broadcast('pointerReleaseRight', {elemId: null, user_id: sagePointers[address].id, user_label: sagePointers[address].label, x: pointerX, y: pointerY, date: now });
	}

}
*/
/*
function pointerRelease(uniqueID, pointerX, pointerY, data) {
	if( sagePointers[uniqueID] === undefined )
		return;

	var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});
	if (obj !== null) console.log("found " + obj.layerId + " " + obj.id);

	// Attempting to complete a click action on a button or a drag on a slider
	broadcast('releaseControlId', {addr:uniqueID, ptrId:sagePointers[uniqueID].id, x:pointerX, y:pointerY});
	remoteInteraction[uniqueID].releaseControl();

	// Radial Menu
	if( radialMenuEvent( { type: "pointerRelease", id: uniqueID, x: pointerX, y: pointerY, data: data }  ) === true )
		return; // Radial menu is using the event

	var app;
	var elem = findAppUnderPointer(pointerX, pointerY);

	//var controlUnderPointer = findControlsUnderPointer(pointerX, pointerY);
	//var itemUnderPointer = controlUnderPointer || elem;
	//Draw widget connectors
	//showOrHideWidgetConnectors(uniqueID, itemUnderPointer, "release");

	if( remoteInteraction[uniqueID].windowManagementMode() ){
		if(data.button === "left"){
			if(remoteInteraction[uniqueID].selectedResizeItem !== null){
				app = findAppById(remoteInteraction[uniqueID].selectedResizeItem.id);
				if(app !== null) {
					broadcast('finishedResize', {id: remoteInteraction[uniqueID].selectedResizeItem.id, date: new Date()});

					addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "end", application: {id: app.id, type: app.application}, location: {x: parseInt(app.left, 10), y: parseInt(app.top, 10), width: parseInt(app.width, 10), height: parseInt(app.height, 10)}}, time: Date.now()});

					if(videoHandles[app.id] !== undefined && videoHandles[app.id].newFrameGenerated === false)
						handleNewVideoFrame(app.id);
					remoteInteraction[uniqueID].releaseItem(true);
				}
			}
			if(remoteInteraction[uniqueID].selectedMoveItem !== null){
				app = findAppById(remoteInteraction[uniqueID].selectedMoveItem.id);
				if(app !== null) {
					var remoteIdx = -1;
					for(var i=0; i<remoteSites.length; i++){
						if(sagePointers[uniqueID].left >= remoteSites[i].geometry.x && sagePointers[uniqueID].left <= remoteSites[i].geometry.x+remoteSites[i].geometry.w &&
							sagePointers[uniqueID].top >= remoteSites[i].geometry.y && sagePointers[uniqueID].top  <= remoteSites[i].geometry.y+remoteSites[i].geometry.h) {
							remoteIdx = i;
							break;
						}
					}
					if(remoteIdx < 0){
						broadcast('finishedMove', {id: remoteInteraction[uniqueID].selectedMoveItem.id, date: new Date()});

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
							broadcast('setItemPosition', updatedItem);
							broadcast('finishedMove', {id: updatedItem.elemId, date: new Date()});

							addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "end", application: {id: elem.id, type: elem.application}, location: {x: parseInt(elem.left, 10), y: parseInt(elem.top, 10), width: parseInt(elem.width, 10), height: parseInt(elem.height, 10)}}, time: Date.now()});

							if(videoHandles[app.id] !== undefined && videoHandles[app.id].newFrameGenerated === false)
								handleNewVideoFrame(app.id);
						}
					}
				}
			}
		}
		//else if(data.button === "right"){
		//	if( elem !== null ){
		//		// index.hmtl has no 'pointerReleaseRight' message.
		//		// I renamed 'pointerPressRight' to 'requestNewControl'
		//		// since this function could come from any device (not just a right mouse click)
		//		broadcast('pointerReleaseRight', {elemId: elem.id, user_id: sagePointers[uniqueID].id, user_label: sagePointers[uniqueID].label, x: pointerX, y: pointerY, date: new Date() });
		//	}
		//}
	}
	if ( remoteInteraction[uniqueID].appInteractionMode() || (elem !== null && elem.application === 'thumbnailBrowser') ) {
		if( elem !== null ){
			var elemX = pointerX - elem.left;
			var elemY = pointerY - elem.top - config.ui.titleBarHeight;

			var ePosition = {x: elemX, y: elemY};
			var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
			var now = new Date();

			var event = {id: elem.id, type: "pointerRelease", position: ePosition, user: eUser, data: data, date: now};

			broadcast('eventInItem', event);

			addEventToUserLog(uniqueID, {type: "applicationInteraction", data: {type: "pointerRelease", application: {id: elem.id, type: elem.application}, position: {x: parseInt(ePosition.x, 10), y: parseInt(ePosition.y, 10)}}, time: Date.now()});
		}
	}

}
*/

/*
function pointerMove(uniqueID, pointerX, pointerY, data) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	sagePointers[uniqueID].left += data.dx;
	sagePointers[uniqueID].top  += data.dy;
	if(sagePointers[uniqueID].left < 0)                 sagePointers[uniqueID].left = 0;
	if(sagePointers[uniqueID].left > config.totalWidth) sagePointers[uniqueID].left = config.totalWidth;
	if(sagePointers[uniqueID].top < 0)                  sagePointers[uniqueID].top = 0;
	if(sagePointers[uniqueID].top > config.totalHeight) sagePointers[uniqueID].top = config.totalHeight;

	//broadcast('updateSagePointerPosition', sagePointers[uniqueID]);
	broadcast('upp', sagePointers[uniqueID]);

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
			broadcast('setControlPosition', updatedControl);
			return;
		}
	}
	var lockedControl = remoteInteraction[uniqueID].lockedControl();
	if (lockedControl && /slider/.test(lockedControl.ctrlId)){
		broadcast('moveSliderKnob', {ctrl:lockedControl, x:pointerX});
		return;
	}

	var elem = null;
	//var controlUnderPointer = findControlsUnderPointer(pointerX, pointerY);
	//if (controlUnderPointer===null){
	elem = findAppUnderPointer(pointerX, pointerY);
	//}

	//var itemUnderPointer = controlUnderPointer || elem;
	//Draw widget connectors
	//showOrHideWidgetConnectors(uniqueID, itemUnderPointer, "move");
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

			broadcast('setItemPosition', updatedMoveItem);
			if(updatedApp !== null && updatedApp.application === "movie_player") calculateValidBlocks(updatedApp, 128, videoHandles);
            if(updatedApp !== null && updatedApp.application === "media_block_stream") calculateValidBlocks(updatedApp, 128, mediaBlockStreams);

			var updatedStickyItems = stickyAppHandler.moveItemsStickingToUpdatedItem(updatedMoveItem, pointerX, pointerY);

			for (var idx=0; idx<updatedStickyItems.length; idx++) {
				updatedStickyItems[idx].user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
				broadcast('setItemPosition', updatedStickyItems[idx]);
			}
		}
		else if(updatedResizeItem !== null){
			updatedResizeItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
			broadcast('setItemPositionAndSize', updatedResizeItem);
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
						broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false});
					}
					remoteInteraction[uniqueID].setHoverCornerItem(elem);
					broadcast('hoverOverItemCorner', {elemId: elem.id, flag: true});
				}
				else if(remoteInteraction[uniqueID].hoverCornerItem !== null){
					broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false});
					remoteInteraction[uniqueID].setHoverCornerItem(null);
				}
			}
			else if(remoteInteraction[uniqueID].hoverCornerItem !== null){
				broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false});
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

			broadcast('eventInItem', event);
		}
	}
}
*/

/*
function pointerPosition( uniqueID, data ) {
	if( sagePointers[uniqueID] === undefined )
		return;

	sagePointers[uniqueID].left = data.pointerX;
	sagePointers[uniqueID].top  = data.pointerY;
	if(sagePointers[uniqueID].left < 0) sagePointers[uniqueID].left = 0;
	if(sagePointers[uniqueID].left > config.totalWidth) sagePointers[uniqueID].left = config.totalWidth;
	if(sagePointers[uniqueID].top  < 0) sagePointers[uniqueID].top = 0;
	if(sagePointers[uniqueID].top  > config.totalHeight) sagePointers[uniqueID].top = config.totalHeight;

	//broadcast('updateSagePointerPosition', sagePointers[uniqueID]);
	broadcast('upp', sagePointers[uniqueID]);
	var updatedItem = remoteInteraction[uniqueID].moveSelectedItem(sagePointers[uniqueID].left, sagePointers[uniqueID].top);
	if(updatedItem !== null){
		var updatedApp = findAppById(updatedItem.elemId);

		var backgroundItem = findAppUnderPointer(updatedItem.elemLeft-1, updatedItem.elemTop-1);
		attachAppIfSticky(backgroundItem, updatedItem.elemId);
		updatedItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;

		broadcast('setItemPosition', updatedItem);
		if(updatedApp !== null && updatedApp.application === "movie_player") calculateValidBlocks(updatedApp, 128, videoHandles);
		if(updatedApp !== null && updatedApp.application === "media_block_stream") calculateValidBlocks(updatedApp, 128, mediaBlockStreams);
        var updatedStickyItems = stickyAppHandler.moveItemsStickingToUpdatedItem(updatedItem, sagePointers[uniqueID].left, sagePointers[uniqueID].top);
		for (var idx=0; idx<updatedStickyItems.length; idx++) {
			updatedStickyItems[idx].user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
			broadcast('setItemPosition', updatedStickyItems[idx]);
		}
	}
	//if(updatedItem !== null) broadcast('setItemPosition', updatedItem);
}
*/

/*
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
			broadcast('updateItemOrder', {idList: newOrder});

			broadcast('startMove', {id: elem.id, date: new Date()});
			broadcast('startResize', {id: elem.id, date: new Date()});

			addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "start", application: {id: elem.id, type: elem.application}, location: {x: parseInt(elem.left, 10), y: parseInt(elem.top, 10), width: parseInt(elem.width, 10), height: parseInt(elem.height, 10)}}, time: Date.now()});
			addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "start", application: {id: elem.id, type: elem.application}, location: {x: parseInt(elem.left, 10), y: parseInt(elem.top, 10), width: parseInt(elem.width, 10), height: parseInt(elem.height, 10)}}, time: Date.now()});
		}
	}
}
*/
/*
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
				broadcast('setItemPositionAndSize', updatedItem);
				if(updatedApp !== null && updatedApp.application === "movie_player") calculateValidBlocks(updatedApp, 128, videoHandles);
				if(updatedApp !== null && updatedApp.application === "media_block_stream") calculateValidBlocks(updatedApp, 128, mediaBlockStreams);

				if(remoteInteraction[uniqueID].selectTimeId[updatedApp.id] !== undefined){
					clearTimeout(remoteInteraction[uniqueID].selectTimeId[updatedApp.id]);
				}

				remoteInteraction[uniqueID].selectTimeId[updatedApp.id] = setTimeout(function() {
					broadcast('finishedMove', {id: updatedApp.id, date: new Date()});
					broadcast('finishedResize', {id: updatedApp.id, date: new Date()});

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

			broadcast('eventInItem', event);

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
*/

function pointerDraw(uniqueID, data) {
	if(sagePointers[uniqueID] === undefined) return;

	var ePos  = {x: 0, y: 0};
	var eUser = {id: sagePointers[uniqueID].id, label: 'drawing', color: [220, 10, 10]};
	var now   = Date.now();

	var key;
	var app;
	var event;
	for (key in SAGE2Items.applications.list) {
		app = SAGE2Items.applications.list[key];
		// Send the drawing events only to whiteboard apps
		if (app.application === 'whiteboard') {
			event = {id: app.id, type: "pointerDraw", position: ePos, user: eUser, data: data, date: now};
			broadcast('eventInItem', event);
		}
	}
}

/*
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
						broadcast('startMove', {id: updatedItem.elemId, date: new Date()});
						broadcast('startResize', {id: updatedItem.elemId, date: new Date()});

						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "start", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});
						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "start", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});

						updatedItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
						broadcast('setItemPositionAndSize', updatedItem);
						// the PDF files need an extra redraw
						broadcast('finishedMove', {id: updatedItem.elemId, date: new Date()});
						broadcast('finishedResize', {id: updatedItem.elemId, date: new Date()});

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
						broadcast('startMove', {id: updatedItem.elemId, date: new Date()});
						broadcast('startResize', {id: updatedItem.elemId, date: new Date()});

						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "move", action: "start", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});
						addEventToUserLog(uniqueID, {type: "windowManagement", data: {type: "resize", action: "start", application: {id: updatedApp.id, type: updatedApp.application}, location: {x: parseInt(updatedApp.left, 10), y: parseInt(updatedApp.top, 10), width: parseInt(updatedApp.width, 10), height: parseInt(updatedApp.height, 10)}}, time: Date.now()});

						updatedItem.user_color = sagePointers[uniqueID]? sagePointers[uniqueID].color : null;
						broadcast('setItemPositionAndSize', updatedItem);
						// the PDF files need an extra redraw
						broadcast('finishedMove', {id: updatedItem.elemId, date: new Date()});
						broadcast('finishedResize', {id: updatedItem.elemId, date: new Date()});

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
*/


function pointerCloseGesture(uniqueID, pointerX, pointerY, time, gesture) {
	if( sagePointers[uniqueID] === undefined )
		return;

	//var pX   = sagePointers[uniqueID].left;
	//var pY   = sagePointers[uniqueID].top;
	//var elem = findAppUnderPointer(pX, pY);
	var elem = null;
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

/*
function keyDown( uniqueID, pointerX, pointerY, data) {
	if(sagePointers[uniqueID] === undefined) return;

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

			broadcast('eventInItem', event);

			addEventToUserLog(uniqueID, {type: "applicationInteraction", data: {type: "specialKey", application: {id: elem.id, type: elem.application}, code: eData.code, state: eData.state}, time: Date.now()});
		}
	}
}
*/
/*
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

			broadcast('eventInItem', event);

			addEventToUserLog(uniqueID, {type: "applicationInteraction", data: {type: "specialKey", application: {id: elem.id, type: elem.application}, code: eData.code, state: eData.state}, time: Date.now()});
		}
	}
}
*/
/*
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

			broadcast('eventInItem', event);

			addEventToUserLog(uniqueID, {type: "applicationInteraction", data: {type: "keyboard", application: {id: elem.id, type: elem.application}, code: data.code, character: data.character}, time: Date.now()});
		}
	}
}
*/

function handleNewApplication(appInstance, videohandle) {
	broadcast('createAppWindow', appInstance);
	broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(appInstance));

	var zIndex = SAGE2Items.applications.numItems;
	interactMgr.addGeometry(appInstance.id, "applications", "rectangle", {x: appInstance.left, y: appInstance.top, w: appInstance.width, h: appInstance.height+config.ui.titleBarHeight}, true, zIndex, appInstance);
	//applications.push(appInstance);

	var cornerSize = 0.2 * Math.min(appInstance.width, appInstance.height);
	var buttonsWidth = config.ui.titleBarHeight * (324.0/111.0);
	var buttonsPad   = config.ui.titleBarHeight * ( 10.0/111.0);
	var oneButton    = buttonsWidth / 2; // two buttons
	var startButtons = appInstance.width - buttonsWidth;

	SAGE2Items.applications.addItem(appInstance);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "titleBar", "rectangle", {x: 0, y: 0, w: appInstance.width, h: config.ui.titleBarHeight}, 0);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "fullscreenButton", "rectangle", {x: startButtons+buttonsPad, y: 0, w: oneButton, h: config.ui.titleBarHeight}, 1);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "closeButton", "rectangle", {x: startButtons+buttonsPad+oneButton, y: 0, w: oneButton, h: config.ui.titleBarHeight}, 1);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "dragCorner", "rectangle", {x: appInstance.width-cornerSize, y: appInstance.height+config.ui.titleBarHeight-cornerSize, w: cornerSize, h: cornerSize}, 2);

	initializeLoadedVideo(appInstance, videohandle);
}

function handleApplicationResize(appId) {
	if (SAGE2Items.applications.list[appId] === undefined) return;

	var appWidth = SAGE2Items.applications.list[appId].width;
	var appHeight = SAGE2Items.applications.list[appId].height;

	var cornerSize = 0.2 * Math.min(appWidth, appHeight);
	var buttonsWidth = config.ui.titleBarHeight * (324.0/111.0);
	var buttonsPad   = config.ui.titleBarHeight * ( 10.0/111.0);
	var oneButton    = buttonsWidth / 2; // two buttons
	var startButtons = appWidth - buttonsWidth;

	SAGE2Items.applications.editButtonOnItem(appId, "titleBar", "rectangle", {x: 0, y: 0, w: appWidth, h: config.ui.titleBarHeight});
	SAGE2Items.applications.editButtonOnItem(appId, "fullscreenButton", "rectangle", {x: startButtons+buttonsPad, y: 0, w: oneButton, h: config.ui.titleBarHeight});
	SAGE2Items.applications.editButtonOnItem(appId, "closeButton", "rectangle", {x: startButtons+buttonsPad+oneButton, y: 0, w: oneButton, h: config.ui.titleBarHeight});
	SAGE2Items.applications.editButtonOnItem(appId, "dragCorner", "rectangle", {x: appWidth-cornerSize, y: appHeight+config.ui.titleBarHeight-cornerSize, w: cornerSize, h: cornerSize});
}

/*
function deleteApplication( elem ) {
	// Tell the clients to remove the element
	broadcast('deleteElement', {elemId: elem.id});

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
*/

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

function createRadialMenu(uniqueID, pointerX, pointerY) {
	var validLocation = true;
	var newMenuPos = {x: pointerX, y: pointerY};
	var existingRadialMenu = null;
	// Make sure there's enough distance from other menus
	for (var key in SAGE2Items.radialMenus.list) {
		existingRadialMenu = SAGE2Items.radialMenus.list[key];
		var prevMenuPos = {x: existingRadialMenu.left, y: existingRadialMenu.top };
		var distance    = Math.sqrt( Math.pow( Math.abs(newMenuPos.x - prevMenuPos.x), 2 ) + Math.pow( Math.abs(newMenuPos.y - prevMenuPos.y), 2 ) );
		if (existingRadialMenu.visible && distance < existingRadialMenu.radialMenuSize.x) {
			//validLocation = false;
			//console.log("Menu is too close to existing menu");
		}
	}

	if (validLocation && SAGE2Items.radialMenus.list[uniqueID+"_menu"] === undefined) {
		var newRadialMenu = new Radialmenu(uniqueID, uniqueID, config.ui);
		newRadialMenu.setPosition(newMenuPos);
		interactMgr.addGeometry(uniqueID+"_menu_radial", "radialMenus", "circle", {x: newRadialMenu.left, y: newRadialMenu.top, r: newRadialMenu.radialMenuSize.y/2}, true, Object.keys(SAGE2Items.radialMenus).length, newRadialMenu);
		interactMgr.addGeometry(uniqueID+"_menu_thumbnail", "radialMenus", "rectangle", {x: newRadialMenu.left, y: newRadialMenu.top, w: newRadialMenu.thumbnailWindowSize.x, h: newRadialMenu.thumbnailWindowSize.y}, false, Object.keys(SAGE2Items.radialMenus).length, newRadialMenu);
		SAGE2Items.radialMenus.list[uniqueID+"_menu"] = newRadialMenu;

		//console.log("Create New Radial menu");
		//console.log(newRadialMenu);
		// Open a 'media' radial menu
		broadcast('createRadialMenu', newRadialMenu.getInfo());
	}
	else if (validLocation && SAGE2Items.radialMenus.list[uniqueID+"_menu"] !== undefined) {
		setRadialMenuPosition(uniqueID, pointerX, pointerY);
		broadcast('updateRadialMenu', existingRadialMenu.getInfo());
	}
	updateRadialMenu(uniqueID);
}

/**
* Translates position of a radial menu by an offset
*
* @method moveRadialMenu
* @param uniqueID {Integer} radial menu ID
* @param pointerX {Float} offset x position
* @param pointerY {Float} offset y position
*/
function moveRadialMenu(uniqueID, pointerX, pointerY ) {
	var existingRadialMenu = SAGE2Items.radialMenus.list[uniqueID+"_menu"];

	if( existingRadialMenu ) {
		existingRadialMenu.setPosition({x: existingRadialMenu.left + pointerX, y: existingRadialMenu.top + pointerY});
		existingRadialMenu.visible = true;

		interactMgr.editGeometry(uniqueID+"_menu_radial", "radialMenus", "circle", {x: existingRadialMenu.left, y: existingRadialMenu.top, r: existingRadialMenu.radialMenuSize.y/2});

		var thumbnailWindowPos = existingRadialMenu.getThumbnailWindowPosition();
		interactMgr.editGeometry(uniqueID+"_menu_thumbnail", "radialMenus", "rectangle", {x: thumbnailWindowPos.x, y: thumbnailWindowPos.y, w: existingRadialMenu.thumbnailWindowSize.x, h: existingRadialMenu.thumbnailWindowSize.y});

		broadcast('updateRadialMenu', existingRadialMenu.getInfo());
	}
}

/**
* Sets the absolute position of a radial menu
*
* @method setRadialMenuPosition
* @param uniqueID {Integer} radial menu ID
* @param pointerX {Float} x position
* @param pointerY {Float} y position
*/
function setRadialMenuPosition(uniqueID, pointerX, pointerY ) {
	var existingRadialMenu = SAGE2Items.radialMenus.list[uniqueID+"_menu"];

	// Sets the position and visibility
	existingRadialMenu.setPosition({x: pointerX, y: pointerY});

	// Update the interactable geometry
	interactMgr.editGeometry(uniqueID+"_menu_radial", "radialMenus", "circle", {x: existingRadialMenu.left, y: existingRadialMenu.top, r: existingRadialMenu.radialMenuSize.y/2});
	showRadialMenu(uniqueID);
	// Send the updated radial menu state to the display clients (and set menu visible)
	broadcast('updateRadialMenu', existingRadialMenu.getInfo());
}

/**
* Shows radial menu and enables interactivity
*
* @method showRadialMenu
* @param uniqueID {Integer} radial menu ID
*/
function showRadialMenu(uniqueID) {
	var radialMenu = SAGE2Items.radialMenus.list[uniqueID+"_menu"];

	if (radialMenu !== undefined) {
		radialMenu.visible = true;
		interactMgr.editVisibility(uniqueID+"_menu_radial", "radialMenus", true);
		interactMgr.editVisibility(uniqueID+"_menu_thumbnail", "radialMenus", false);
	}
}

/**
* Hides radial menu and enables interactivity
*
* @method hideRadialMenu
* @param uniqueID {Integer} radial menu ID
*/
function hideRadialMenu(uniqueID) {
var radialMenu = SAGE2Items.radialMenus.list[uniqueID+"_menu"];
	if (radialMenu !== undefined) {
		radialMenu.visible = false;
		interactMgr.editVisibility(uniqueID+"_menu_radial", "radialMenus", false);
		interactMgr.editVisibility(uniqueID+"_menu_thumbnail", "radialMenus", false);
	}
}

function updateRadialMenu(uniqueID) {
	// Build lists of assets
	var uploadedImages = assets.listImages();
	var uploadedVideos = assets.listVideos();
	var uploadedPdfs   = assets.listPDFs();
	var uploadedApps   = getApplications();
	var savedSessions  = listSessions();

	// Sort independently of case
	uploadedImages.sort( sageutils.compareFilename );
	uploadedVideos.sort( sageutils.compareFilename );
	uploadedPdfs.sort(   sageutils.compareFilename );
	savedSessions.sort(  sageutils.compareFilename );

	var list = {images: uploadedImages, videos: uploadedVideos, pdfs: uploadedPdfs, sessions: savedSessions, apps: uploadedApps};

	broadcast('updateRadialMenuDocs', {id: uniqueID, fileList: list});
}

// Standard case: Checks for event down and up events to determine menu ownership of event
function radialMenuEvent( data )
{
	broadcast('radialMenuEvent', data);
}

// Check for pointer move events that are dragging a radial menu (but outside the menu)
function updateRadialMenuPointerPosition(uniqueID, pointerX, pointerY) {
	for (var key in SAGE2Items.radialMenus.list)
	{
		var radialMenu = SAGE2Items.radialMenus.list[key];
		//console.log(data.id+"_menu: " + radialMenu);
		if( radialMenu !== undefined && radialMenu.dragState === true )
		{
			var offset = radialMenu.getDragOffset(uniqueID, {x: pointerX, y: pointerY});
			moveRadialMenu( radialMenu.id, offset.x, offset.y );
		}
	}
}

function wsRemoveRadialMenu( wsio, data ) {
	hideRadialMenu(data.id);
}

function wsRadialMenuThumbnailWindow( wsio, data ) {
	var radialMenu = SAGE2Items.radialMenus.list[data.id+"_menu"];

	if (radialMenu !== undefined) {
		radialMenu.openThumbnailWindow(data);

		interactMgr.editVisibility(data.id+"_menu_thumbnail", "radialMenus", data.thumbnailWindowOpen);
	}
}

function wsRadialMenuMoved( wsio, data ) {
	var radialMenu = SAGE2Items.radialMenus.list[data.uniqueID+"_menu"];
	if (radialMenu !== undefined) {
		radialMenu.setPosition(data);
	}
}


function attachAppIfSticky(backgroundItem, appId){
	var app = SAGE2Items.applications.list[appId];
	if (app === null || app.sticky !== true) return;
	stickyAppHandler.detachStickyItem(app);
	if (backgroundItem !== null)
		stickyAppHandler.attachStickyItem(backgroundItem, app);
}

/*
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
			broadcast('showWidgetToAppConnector', itemUnderPointer);
			remoteInteraction[uniqueID].pressOnItem(itemUnderPointer);
		}
	}
	else if (pressMoveRelease === "release"){
		item = remoteInteraction[uniqueID].releaseOnItem();
		if (item) {
			broadcast('hideWidgetToAppConnector', item);
		}
	}
	else {
		item = remoteInteraction[uniqueID].releaseOnItem();
		if (item) {
			broadcast('hideWidgetToAppConnector', item);
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

			broadcast('showWidgetToAppConnector', itemUnderPointer);
			remoteInteraction[uniqueID].enterControlArea(itemUnderPointer);
		}
		else if (itemUnderPointer === null && remoteInteraction[uniqueID].hoverOverControl() !== null) {
			item = remoteInteraction[uniqueID].hoverOverControl();
			broadcast('hideWidgetToAppConnector', item);
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

			broadcast('hideWidgetToAppConnector', item);
			remoteInteraction[uniqueID].leaveControlArea();

			broadcast('showWidgetToAppConnector', itemUnderPointer);
			remoteInteraction[uniqueID].enterControlArea(itemUnderPointer);
		}
	}
}
*/
