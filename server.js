// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization
// and Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-2015

/**
 * SAGE2 server
 *
 * @class server
 * @module server
 * @submodule server-core
 * @requires fs http https os path readline url formidable gm json5 qr-image sprint websocketio
 */


// node mode
/* jshint node: true */

// how to deal with spaces and tabs
/* jshint smarttabs: false */

// Don't make functions within a loop
/* jshint -W083 */

/*global mediaFolders */

// require variables to be declared
'use strict';

// node: built-in
var fs            = require('fs');               // filesystem access
var http          = require('http');             // http server
var https         = require('https');            // https server
var os            = require('os');               // operating system access
var path          = require('path');             // file path management
var readline      = require('readline');         // to build an evaluation loop
var url           = require('url');              // parses urls

// npm: defined in package.json
var formidable    = require('formidable');       // upload processor
var gm            = require('gm');               // graphicsmagick
var json5         = require('json5');            // Relaxed JSON format
var qrimage       = require('qr-image');         // qr-code generation
var sprint        = require('sprint');           // pretty formating (sprintf)
var imageMagick;                                 // derived from graphicsmagick

var WebsocketIO   = require('websocketio');      // creates WebSocket server and clients
var chalk         = require('chalk');            // used for colorizing the console output
var commander     = require('commander');        // parsing command-line arguments

// custom node modules
var sageutils           = require('./src/node-utils');            // provides the current version number
var assets              = require('./src/node-assets');           // manages the list of files
// var commandline         = require('./src/node-sage2commandline'); // handles command line parameters for SAGE2
var exiftool            = require('./src/node-exiftool');         // gets exif tags for images
var pixelblock          = require('./src/node-pixelblock');       // chops pixels buffers into square chunks
var md5                 = require('./src/md5');                   // return standard md5 hash of given param

var HttpServer          = require('./src/node-httpserver');       // creates web server
var InteractableManager = require('./src/node-interactable');     // handles geometry and determining which object a point is over
var Interaction         = require('./src/node-interaction');      // handles sage interaction (move, resize, etc.)
var Loader              = require('./src/node-itemloader');       // handles sage item creation
var Omicron             = require('./src/node-omicron');
var Drawing             = require('./src/node-drawing');          // handles Omicron input events
var Radialmenu          = require('./src/node-radialmenu');       // radial menu
var Sage2ItemList       = require('./src/node-sage2itemlist');    // list of SAGE2 items
var Sagepointer         = require('./src/node-sagepointer');      // handles sage pointers (creation, location, etc.)
var StickyItems         = require('./src/node-stickyitems');
var registry            = require('./src/node-registry');         // Registry Manager
var FileBufferManager	= require('./src/node-filebuffer');
var PartitionList       = require('./src/node-partitionlist');    // list of SAGE2 Partitions
var SharedDataManager	= require('./src/node-sharedserverdata'); // manager for shared data
var S2Logger            = require('./src/node-logger');           // SAGE2 logging module
var PerformanceManager	= require('./src/node-performancemanager'); // SAGE2 performance module
//
// Globals
//

// Global variable for all media folders
global.mediaFolders = {};
// System folder, defined within SAGE2 installation
mediaFolders.system =	{
	name: "system",
	path: "public/uploads/",
	url:  "/uploads",
	upload: false
};
// Home directory, defined as ~/Documents/SAGE2_Media or equivalent
mediaFolders.user =	{
	name: "user",
	path: path.join(sageutils.getHomeDirectory(), "Documents", "SAGE2_Media", "/"),
	url:  "/user",
	upload: true
};
// Default upload folder
var mainFolder = mediaFolders.user;

// Session hash for security
global.__SESSION_ID = null;
// SAGE2 logger object
global.logger = null;

var sage2Server        = null;
var sage2ServerS       = null;
var wsioServer         = null;
var wsioServerS        = null;
var platform           = os.platform() === "win32" ? "Windows" : os.platform() === "darwin" ? "Mac OS X" : "Linux";
var imageMagickOptions = {imageMagick: true};
var ffmpegOptions      = {};
var hostOrigin         = "";
var SAGE2Items         = {};
var sharedApps         = {};
var users              = null;
var appLoader          = null;
var mediaBlockSize     = 512;
var pressingCTRL       = true;

var fileBufferManager;
var startTime;
var program;
var config;
var SAGE2_version;
var interactMgr;
var drawingManager;
var performanceManager;

// Partition variables
var partitions;
var draggingPartition = {};
var cuttingPartition  = {};

// Array containing the remote sites informations (toolbar on top of wall)
var remoteSites = [];

// GO
startTime = Date.now();

// Get the version from package.json
SAGE2_version = sageutils.getShortVersion();

// Parse commond line arguments
program = commander
	.version(SAGE2_version)
	.option('-i, --no-interactive',       'Non interactive prompt')
	.option('-f, --configuration <file>', 'Specify a configuration file')
	.option('-l, --logfile [file]',       'Specify a log file')
	.option('-q, --no-output',            'Quiet, no output')
	.option('-s, --session [name]',       'Load a session file (last session if omitted)')
	.option('-t, --track-users [file]',   'enable user interaction tracking (specified file indicates users to track)')
	.option('-p, --password <password>',  'Sets the password to connect to SAGE2 session')
	.parse(process.argv);

// Logging or not
if (program.logfile) {
	// Use default name or one specified on command line
	var logname    = (program.logfile === true) ? 'sage2.log' : program.logfile;
	// Create the loggger object
	global.logger = new S2Logger({name: "server", path: logname});

	// Redirect console.log to a file and still produces an output or not
	if (program.output === false) {
		program.interactive = undefined;
	}
}
// Set global variable for the log function
global.quiet = !commander.output;

// Load the configuration file
config = loadConfiguration();
// Export the config variable
global.config = config;


// Create the 'rbush' data structure for interaction calculation
interactMgr = new InteractableManager();

// Setup the partition data structure
partitions = new PartitionList(config);

// FileBufferManager, I guess
fileBufferManager = new FileBufferManager();

// Create structure to handle automated placement of apps
var appLaunchPositioning = {
	xStart: 10,
	yStart: 50,
	xLast: -1,
	yLast: -1,
	widthLast: -1,
	heightLast: -1,
	tallestInRow: -1,
	padding: 20
};

// Add extra folders defined in the configuration file
if (config.folders) {
	config.folders.forEach(function(f) {
		// Add a new folder into the collection
		mediaFolders[f.name] = {};
		mediaFolders[f.name].name   = f.name;
		mediaFolders[f.name].path   = f.path;
		mediaFolders[f.name].url    = f.url;
		mediaFolders[f.name].upload = sageutils.isTrue(f.upload);
	});
}

var publicDirectory  = "public";
var uploadsDirectory = path.join(publicDirectory, "uploads");
var sessionDirectory = path.join(publicDirectory, "sessions");
var whiteboardDirectory = sessionDirectory;
// Validate all the media folders
for (var folder in mediaFolders) {
	var f = mediaFolders[folder];
	sageutils.log("Folders", f.name, f.path, f.url);
	if (!sageutils.folderExists(f.path)) {
		sageutils.mkdirParent(f.path);
	}
	if (mediaFolders[f.name].upload) {
		mediaFolders.system.upload = false;
		// Update the main upload folder
		uploadsDirectory = f.path;
		mainFolder = f;
		sessionDirectory = path.join(uploadsDirectory, "sessions");
		whiteboardDirectory = path.join(uploadsDirectory, "whiteboard");
		if (!sageutils.folderExists(sessionDirectory)) {
			sageutils.mkdirParent(sessionDirectory);
		}
		sageutils.log("Folders", 'upload to', chalk.yellow.bold(f.path));
	}
	var newdirs = ["apps", "assets", "images", "pdfs",
		"tmp", "videos", "config", "whiteboard", "web"];

	newdirs.forEach(function(d) {
		var newsubdir = path.join(mediaFolders[f.name].path, d);
		if (!sageutils.folderExists(newsubdir)) {
			sageutils.mkdirParent(newsubdir);
		}
	});
}

// Add back all the media folders to the configuration structure
config.folders = mediaFolders;

sageutils.log("SAGE2", chalk.cyan("Node Version:\t\t"),
	chalk.green.bold(sageutils.getNodeVersion()));
sageutils.log("SAGE2", chalk.cyan("Detected Server OS as:\t"),
	chalk.green.bold(platform));
sageutils.log("SAGE2", chalk.cyan("SAGE2 Short Version:\t"),
	chalk.green.bold(SAGE2_version));

// Initialize Server
initializeSage2Server();

/**
 * initialize the SAGE2 server
 *
 * @method     initializeSage2Server
 */
function initializeSage2Server() {
	// Remove API keys from being investigated further
	// if (config.apis) delete config.apis;

	// Register with evl's server
	if (config.register_site) {
		sageutils.registerSAGE2(config);
	}

	// Check for missing packages
	//     pass parameter `true` for devel packages also
	if (process.arch !== 'arm') {
		// seems very slow to do on ARM processor (Raspberry PI)
		sageutils.checkPackages();
	}

	// Setup binaries path
	if (config.dependencies !== undefined) {
		if (config.dependencies.ImageMagick !== undefined) {
			imageMagickOptions.appPath = config.dependencies.ImageMagick;
		}
		if (config.dependencies.FFMpeg !== undefined) {
			ffmpegOptions.appPath = config.dependencies.FFMpeg;
		}
	}

	// Create an object to gather performance statistics
	performanceManager = new PerformanceManager();

	imageMagick = gm.subClass(imageMagickOptions);
	assets.initializeConfiguration(config);
	assets.setupBinaries(imageMagickOptions, ffmpegOptions);

	// Set default host origin for this server
	if (config.rproxy_port === undefined) {
		hostOrigin = "http://" + config.host + (config.port === 80 ? "" : ":" + config.port) + "/";
	}

	// Initialize sage2 item lists
	SAGE2Items.applications = new Sage2ItemList();
	SAGE2Items.portals      = new Sage2ItemList();
	SAGE2Items.pointers     = new Sage2ItemList();
	SAGE2Items.radialMenus  = new Sage2ItemList();
	SAGE2Items.widgets      = new Sage2ItemList();
	SAGE2Items.renderSync   = {};

	SAGE2Items.portals.interactMgr = {};

	// Initialize user interaction tracking
	if (program.trackUsers) {
		if (typeof program.trackUsers === "string" && sageutils.fileExists(program.trackUsers)) {
			users = json5.parse(fs.readFileSync(program.trackUsers));
		} else {
			users = {};
		}
		users.session = {};
		users.session.start = Date.now();

		setInterval(saveUserLog, 300000); // every 5 minutes
		if (!sageutils.folderExists("logs")) {
			fs.mkdirSync("logs");
		}
	}

	// Generate a qr image that points to sage2 server
	var qr_png = qrimage.image(hostOrigin, { ec_level: 'M', size: 15, margin: 3, type: 'png' });
	var qr_out = path.join(uploadsDirectory, "images", "QR.png");
	qr_png.on('end', function() {
		sageutils.log("QR", "image generated", qr_out);
	});
	qr_png.pipe(fs.createWriteStream(qr_out));

	// Setup tmp directory for SAGE2 server
	process.env.TMPDIR = path.join(__dirname, "tmp");
	sageutils.log("SAGE2", "Temp folder:", chalk.yellow.bold(process.env.TMPDIR));
	if (!sageutils.folderExists(process.env.TMPDIR)) {
		fs.mkdirSync(process.env.TMPDIR);
	}

	// Setup tmp directory in uploads
	var uploadTemp = path.join(__dirname, "public", "uploads", "tmp");
	sageutils.log("SAGE2", "Upload temp folder:", chalk.yellow.bold(uploadTemp));
	if (!sageutils.folderExists(uploadTemp)) {
		fs.mkdirSync(uploadTemp);
	}

	// Make sure sessions directory exists
	if (!sageutils.folderExists(sessionDirectory)) {
		fs.mkdirSync(sessionDirectory);
	}

	// Add a flag into the configuration to denote password status (used on display side)
	//   not protected by default
	config.passwordProtected = false;
	// Check for the session password file
	var userDocPath = path.join(sageutils.getHomeDirectory(), "Documents", "SAGE2_Media", "/");
	var passwordFile = userDocPath + 'passwd.json';
	if (typeof program.password  === "string" && program.password.length > 0) {
		// Creating a new hash from the password
		global.__SESSION_ID = md5.getHash(program.password);
		sageutils.log("Secure", "Using", global.__SESSION_ID, "as the key for this session");
		// Saving the hash
		fs.writeFileSync(passwordFile, JSON.stringify({pwd: global.__SESSION_ID}));
		sageutils.log("Secure", "Saved to file name", passwordFile);
		// the session is protected
		config.passwordProtected = true;
	} else if (sageutils.fileExists(passwordFile)) {
		// If a password file exists, load it
		var passwordFileJsonString = fs.readFileSync(passwordFile, 'utf8');
		var passwordFileJson       = JSON.parse(passwordFileJsonString);
		if (passwordFileJson.pwd !== null) {
			global.__SESSION_ID = passwordFileJson.pwd;
			sageutils.log("Secure", "A sessionID was found:", passwordFileJson.pwd);
			// the session is protected
			config.passwordProtected = true;
		} else {
			sageutils.log("Secure", "Invalid hash file", passwordFile);
		}
	}

	/*
	Monitor OFF, cause issues with drag-drop files
	// Monitoring some folders
	var listOfFolders = [];
	for (var lf in mediaFolders) {
		listOfFolders.push(mediaFolders[lf].path);
	}
	// try to exclude some folders from the monitoring
	var excludesFiles   = ['.DS_Store', 'Thumbs.db', 'passwd.json'];
	var excludesFolders = ['assets', 'apps', 'config', 'savedFiles', 'sessions', 'tmp'];
	sageutils.monitorFolders(listOfFolders, excludesFiles, excludesFolders,
		function(change) {
			sageutils.log("Monitor", "Changes detected in", this.root);
			if (change.modifiedFiles.length > 0) {
				sageutils.log("Monitor",  "	Modified files: %j", change.modifiedFiles);
				// broadcast the new file list
				// assets.refresh(this.root, function(count) {
				// 	broadcast('storedFileList', getSavedFilesList());
				// });
			}
			if (change.addedFiles.length > 0) {
				// sageutils.log("Monitor", "	Added files:    %j",   change.addedFiles);
			}
			if (change.removedFiles.length > 0) {
				// sageutils.log("Monitor", "	Removed files:  %j",   change.removedFiles);
			}
			if (change.addedFolders.length > 0) {
				// sageutils.log("Monitor", "	Added folders:    %j", change.addedFolders);
			}
			if (change.modifiedFolders.length > 0) {
				// sageutils.log("Monitor", "	Modified folders: %j", change.modifiedFolders);
			}
			if (change.removedFolders.length > 0) {
				// sageutils.log("Monitor", "	Removed folders:  %j", change.removedFolders);
			}
		}
	);
	*/

	// Initialize app loader
	appLoader = new Loader(mainFolder.path, hostOrigin, config, imageMagickOptions, ffmpegOptions);

	// Initialize interactable manager and layers
	interactMgr.addLayer("staticUI",     3);
	interactMgr.addLayer("radialMenus",  2);
	interactMgr.addLayer("widgets",      1);
	interactMgr.addLayer("applications", 0);
	interactMgr.addLayer("portals",      0);
	interactMgr.addLayer("partitions",   0);

	// Initialize the background for the display clients (image or color)
	setupDisplayBackground();

	// initialize dialog boxes
	setUpDialogsAsInteractableObjects();

	// Setup the remote sites for collaboration
	initalizeRemoteSites();

	// Set up http and https servers
	var httpServerApp = new HttpServer(publicDirectory);
	httpServerApp.httpPOST('/upload', uploadForm); // receive newly uploaded files from SAGE Pointer / SAGE UI
	httpServerApp.httpGET('/config',  sendConfig); // send config object to client using http request
	var options  = setupHttpsOptions();            // create HTTPS options - sets up security keys
	sage2Server  = http.createServer(httpServerApp.onrequest);
	sage2ServerS = https.createServer(options, httpServerApp.onrequest);

	// In case the HTTPS client doesnt support tickets
	var tlsSessionStore = {};
	sage2ServerS.on('newSession', function(id, data, cb) {
		tlsSessionStore[id.toString('hex')] = data;
		cb();
	});
	sage2ServerS.on('resumeSession', function(id, cb) {
		cb(null, tlsSessionStore[id.toString('hex')] || null);
	});

	// Set up websocket servers - 2 way communication between server and all browser clients
	wsioServer  = new WebsocketIO.Server({server: sage2Server});
	wsioServerS = new WebsocketIO.Server({server: sage2ServerS});
	wsioServer.onconnection(openWebSocketClient);
	wsioServerS.onconnection(openWebSocketClient);

	// Get full version of SAGE2 - git branch, commit, date
	sageutils.getFullVersion(function(version) {
		// fields: base commit branch date
		SAGE2_version = version;
		sageutils.log("SAGE2", "Full Version:", json5.stringify(SAGE2_version));
		broadcast('setupSAGE2Version', SAGE2_version);

		if (users !== null) {
			users.session.version = SAGE2_version;
		}
	});

	// Initialize assets folders
	assets.initialize(mainFolder, mediaFolders, function() {
		// when processing assets done, send the file list
		broadcast('storedFileList', getSavedFilesList());
	});

	drawingManager = new Drawing(config);
	drawingManager.setCallbacks(
		drawingInit,
		drawingUpdate,
		drawingRemove,
		sendTouchToPalette,
		sendDragToPalette,
		sendStyleToPalette,
		sendChangeToPalette,
		movePaletteTo,
		saveDrawingSession,
		loadDrawingSession,
		sendSessionListToPalette
	);
	// Link the interactable manager to the drawing manager
	drawingManager.linkInteractableManager(interactMgr);
}


/************************Whiteboard Callbacks************************/

function drawingInit(clientWebSocket, drawState) {
	clientWebSocket.emit("drawingInit", drawState);
}

function drawingUpdate(clientWebSocket, drawingObject) {
	clientWebSocket.emit("drawingUpdate", drawingObject);
}

function drawingRemove(clientWebSocket, drawingObject) {
	clientWebSocket.emit("drawingRemove", drawingObject);
}

function sendTouchToPalette(paletteID, x, y) {
	var ePosition = {x: x, y: y};
	var eUser = {id: 1, label: "Touch", color: "none"};

	var event = {
		id: paletteID,
		type: "pointerPress",
		position: ePosition,
		user: eUser,
		data: {button: "left"},
		date: Date.now()
	};

	broadcast('eventInItem', event);
}
function sendDragToPalette(paletteID, x, y) {
	var ePosition = {x: x, y: y};
	var eUser = {id: 1, label: "Touch", color: "none"};

	var event = {
		id: paletteID,
		type: "pointerDrag",
		position: ePosition,
		user: eUser,
		data: {button: "left"},
		date: Date.now()
	};

	broadcast('eventInItem', event);
}

function sendStyleToPalette(paletteID, style) {
	var ePosition = {x: 0, y: 0};
	var eUser = {id: 1, label: "Touch", color: "none"};

	var event = {
		id: paletteID,
		type: "styleChange",
		position: ePosition,
		user: eUser,
		data: {style: style},
		date: Date.now()
	};

	broadcast('eventInItem', event);
}

function sendSessionListToPalette(paletteID, data) {
	var ePosition = {x: 0, y: 0};
	var eUser = {id: 1, label: "Touch", color: "none"};

	var event = {
		id: paletteID,
		type: "sessionsList",
		position: ePosition,
		user: eUser,
		data: data,
		date: Date.now()
	};

	broadcast('eventInItem', event);

}

function sendChangeToPalette(paletteID, data) {
	var ePosition = {x: 0, y: 0};
	var eUser = {id: 1, label: "Touch", color: "none"};

	var event = {
		id: paletteID,
		type: "modeChange",
		position: ePosition,
		user: eUser,
		data: data,
		date: Date.now()
	};

	broadcast('eventInItem', event);
}

function movePaletteTo(paletteID, x, y, w, h) {
	var paletteApp = SAGE2Items.applications.list[paletteID];
	if (paletteApp !== undefined) {
		paletteApp.left = x;
		paletteApp.top = y;
		var moveApp = {
			elemId: paletteID,
			elemLeft: x,
			elemTop: y,
			elemWidth: w,
			elemHeight: h,
			date: new Date()
		};

		moveApplicationWindow(null, moveApp, null);
	}
}


function setUpDialogsAsInteractableObjects() {
	var dialogGeometry = {
		x: config.totalWidth / 2 - 13 * config.ui.titleBarHeight,
		y: 2 * config.ui.titleBarHeight,
		w: 26 * config.ui.titleBarHeight,
		h: 8 * config.ui.titleBarHeight
	};

	var acceptGeometry = {
		x: dialogGeometry.x + 0.25 * config.ui.titleBarHeight,
		y: dialogGeometry.y + 4.75 * config.ui.titleBarHeight,
		w: 9 * config.ui.titleBarHeight,
		h: 3 * config.ui.titleBarHeight
	};

	var rejectCancelGeometry = {
		x: dialogGeometry.x + 16.75 * config.ui.titleBarHeight,
		y: dialogGeometry.y + 4.75 * config.ui.titleBarHeight,
		w: 9 * config.ui.titleBarHeight,
		h: 3 * config.ui.titleBarHeight
	};

	interactMgr.addGeometry("dataSharingWaitDialog",    "staticUI", "rectangle", dialogGeometry, false, 1, null);
	interactMgr.addGeometry("dataSharingRequestDialog", "staticUI", "rectangle", dialogGeometry, false, 1, null);
	interactMgr.addGeometry("acceptDataSharingRequest", "staticUI", "rectangle", acceptGeometry, false, 2, null);
	interactMgr.addGeometry("cancelDataSharingRequest", "staticUI", "rectangle", rejectCancelGeometry, false, 2, null);
	interactMgr.addGeometry("rejectDataSharingRequest", "staticUI", "rectangle", rejectCancelGeometry, false, 2, null);
}

/**
 * Send a message to all clients using websocket
 * @method broadcast
 * @param  name    {String}      name of the message
 * @param  data    {Object}      data of the message
 */
function broadcast(name, data) {
	wsioServer.broadcast(name, data);
	wsioServerS.broadcast(name, data);
}

/**
 * Print a message to all the web consoles
 *
 * @method     emitLog
 * @param      {Object}  data    object to print
 */
function emitLog(data) {
	if (wsioServer === null || wsioServerS === null) {
		return;
	}
	broadcast('console', data);
}
// Make the function global
global.emitLog = emitLog;

// Export variables to sub modules
// dirname: used by application plugins to load plugin source
// broadcast: used by plugins to send results back to apps
exports.dirname = path.join(__dirname, "node_modules");
exports.broadcast = broadcast;


// global variables to manage clients
var clients           = [];
var masterDisplay     = null;
var webBrowserClient  = null;
var sagePointers      = {};
var remoteInteraction = {};
var mediaBlockStreams = {};
var appUserColors     = {}; // a dict to keep track of app instance colors(for widget connectors)

// var remoteSharingRequestDialog = null;
var remoteSharingWaitDialog    = null;
var remoteSharingSessions      = {};

// Sticky items and window position for new clones
var stickyAppHandler     = new StickyItems();

// create manager for shared data
var sharedServerData = new SharedDataManager(clients, broadcast);


//
// Catch the uncaught errors that weren't wrapped in a domain or try catch statement
//
process.on('uncaughtException', function(err) {
	// handle the error safely
	console.trace("SAGE2>	", err);
});


/**
 * Callback when a client connects
 *
 * @method     openWebSocketClient
 * @param      {Websocket}  wsio    The websocket for this client
 */
function openWebSocketClient(wsio) {
	wsio.onclose(closeWebSocketClient);
	wsio.on('addClient', wsAddClient);
}

/**
 * Callback when a client closes
 *
 * @method     closeWebSocketClient
 * @param      {Websocket}  wsio    websocket of the client
 */
function closeWebSocketClient(wsio) {
	var i;
	var key;
	if (wsio.clientType === "display") {
		sageutils.log("Disconnect", chalk.bold.red(wsio.id) +
			" (" + wsio.clientType + " " + wsio.clientID + ")");
	} else {
		if (wsio.clientType) {
			sageutils.log("Disconnect", chalk.bold.red(wsio.id) + " (" + wsio.clientType + ")");
		} else {
			sageutils.log("Disconnect", chalk.bold.red(wsio.id) + " (unknown)");
		}
	}

	addEventToUserLog(wsio.id, {type: "disconnect", data: null, time: Date.now()});

	// if client is a remote site, send disconnect message
	var remote = findRemoteSiteByConnection(wsio);
	if (remote !== null) {
		sageutils.log("Remote", chalk.cyan(remote.name), "now offline");
		remote.connected = "off";
		var site = {name: remote.name, connected: remote.connected};
		broadcast('connectedToRemoteSite', site);
	}

	if (wsio.clientType === "sageUI") {
		hidePointer(wsio.id);
		removeControlsForUser(wsio.id);
		delete sagePointers[wsio.id];
		delete remoteInteraction[wsio.id];
		for (key in remoteSharingSessions) {
			remoteSharingSessions[key].wsio.emit('stopRemoteSagePointer', {id: wsio.id});
		}
	} else if (wsio.clientType === "display") {
		for (key in SAGE2Items.renderSync) {
			if (SAGE2Items.renderSync.hasOwnProperty(key)) {
				// If the application had an animation timer, clear it
				if (SAGE2Items.renderSync[key].clients[wsio.id] &&
					SAGE2Items.renderSync[key].clients[wsio.id].animateTimer) {
					clearTimeout(SAGE2Items.renderSync[key].clients[wsio.id].animateTimer);
				}
				// Remove the object from the list
				delete SAGE2Items.renderSync[key].clients[wsio.id];
			}
		}
	} else if (wsio.clientType === "webBrowser") {
		webBrowserClient = null;
	} else {
		// if it's an application, assume it's a stream and try
		deleteApplication(wsio.id + '|0');
	}

	if (wsio === masterDisplay) {
		masterDisplay = null;
		for (i = 0; i < clients.length; i++) {
			if (clients[i].clientType === "display" && clients[i] !== wsio) {
				masterDisplay = clients[i];
				clients[i].emit('setAsMasterDisplay');
				break;
			}
		}
	}

	removeElement(clients, wsio);

	// Unregistering the client from the drawingManager
	if (wsio.clientType === "display") {
		drawingManager.removeWebSocket(wsio);
	}

	try {
		updateInformationAboutConnections();
	} catch (e) {
		console.log("Error with retrieving client data");
		console.log(e);
	}
}

/**
 * Callback that configures a new client
 *
 * @method     wsAddClient
 * @param      {Websocket}  wsio    client's websocket
 * @param      {Object}  data    initialization data
 */
function wsAddClient(wsio, data) {
	// Check for password
	if (config.passwordProtected) {
		if (!data.session || data.session !== global.__SESSION_ID) {
			sageutils.log("WebsocketIO", "wrong session hash - closing");
			// Send a message back to server
			wsio.emit('remoteConnection', {status: "refused", reason: 'wrong session hash'});
			// If server protected and wrong hash, close the socket and byebye
			wsio.ws.close();
			updateInformationAboutConnectionsFailedRemoteSite(wsio);
			return;
		}
	}
	// Send a message back to server
	wsio.emit('remoteConnection', {status: "accepted"});

	// Just making sure the data is valid JSON (one gets strings from C++)
	if (sageutils.isTrue(data.requests.config)) {
		data.requests.config = true;
	} else {
		data.requests.config = false;
	}
	if (sageutils.isTrue(data.requests.version)) {
		data.requests.version = true;
	} else {
		data.requests.version = false;
	}
	if (sageutils.isTrue(data.requests.time)) {
		data.requests.time = true;
	} else {
		data.requests.time = false;
	}
	if (sageutils.isTrue(data.requests.console)) {
		data.requests.console = true;
	} else {
		data.requests.console = false;
	}

	wsio.updateRemoteAddress(data.host, data.port); // overwrite host and port if defined
	wsio.clientType = data.clientType;

	if (wsio.clientType === "display") {
		wsio.clientID = data.clientID;
		if (masterDisplay === null) {
			masterDisplay = wsio;
		}
		sageutils.log("Connect", chalk.bold.green(wsio.id) + " (" + wsio.clientType + " " + wsio.clientID + ")");
	} else {
		wsio.clientID = -1;
		sageutils.log("Connect", chalk.bold.green(wsio.id) + " (" + wsio.clientType + ")");
		if (wsio.clientType === "remoteServer") {
			// Remote info
			// var remoteaddr = wsio.ws.upgradeReq.connection.remoteAddress;
			// var remoteport = wsio.ws.upgradeReq.connection.remotePort;

			// Checking if it's a known server
			// bug: Seems to create a race condition and works without, so far
			// config.remote_sites.forEach(function(element, index, array) {
			// 	if (element.host === data.host &&
			// 		element.port === data.port &&
			// 		remoteSites[index].connected === "on") {
			// 		sageutils.log("Connect", 'known remote site', data.host, ':', data.port);
			// 		manageRemoteConnection(wsio, element, index);
			// 	}
			// });
		}
	}

	clients.push(wsio);
	initializeWSClient(wsio, data.requests.config, data.requests.version, data.requests.time, data.requests.console);
	if (wsio.clientType === "display") {
		drawingManager.init(wsio);
	}
	// Check if there's a new pointer for a mobile client
	if (data.browser && data.browser.isMobile && remoteInteraction[wsio.id]) {
		// for mobile clients, default to window interaction mode
		remoteInteraction[wsio.id].previousMode = 0;
	}

	// If it's a UI, send message to enable screenshot capability
	if (wsio.clientType === "sageUI") {
		reportIfCanWallScreenshot();
	}

	// If it's a display, check for Electron and send enable screenshot capability
	if (wsio.clientType === "display") {
		// See in browser data structure if it's Electron
		wsio.capableOfScreenshot = data.browser.isElectron;
		// Send message to UI clients
		reportIfCanWallScreenshot();
	}

	// update connection data
	try {
		updateInformationAboutConnections();
	} catch (e) {
		console.log("Error with retrieving client data");
		console.log(e);
	}
}

/**
 * Sends the firt messages when client built
 *
 * @method     initializeWSClient
 * @param      {Websocket}  wsio        client's websocket
 * @param      {bool}  reqConfig   client requests configuration
 * @param      {bool}  reqVersion  client requests version
 * @param      {bool}  reqTime     client requests time information
 * @param      {bool}  reqConsole  client requests console messages
 */
function initializeWSClient(wsio, reqConfig, reqVersion, reqTime, reqConsole) {
	setupListeners(wsio);

	wsio.emit('initialize', {UID: wsio.id, time: Date.now(), start: startTime});
	if (wsio === masterDisplay) {
		wsio.emit('setAsMasterDisplay');
	}

	if (reqConfig) {
		wsio.emit('setupDisplayConfiguration', config);
	}
	if (reqVersion) {
		wsio.emit('setupSAGE2Version', SAGE2_version);
	}
	if (reqTime) {
		var now = new Date();
		wsio.emit('setSystemTime', {date: now.toJSON(), offset: now.getTimezoneOffset()});
	}
	if (reqConsole) {
		wsio.emit('console', json5.stringify(config, null, 4));
	}

	if (wsio.clientType === "display") {
		initializeExistingSagePointers(wsio);
		initializeExistingPartitions(wsio);
		initializeExistingApps(wsio);
		initializeRemoteServerInfo(wsio);
		initializeExistingWallUI(wsio);
		setTimeout(initializeExistingControls, 6000, wsio); // why can't this be done immediately with the rest?
	} else if (wsio.clientType === "audioManager") {
		initializeExistingAppsAudio(wsio);
	} else if (wsio.clientType === "sageUI") {
		createSagePointer(wsio.id);
		var key;
		for (key in remoteSharingSessions) {
			remoteSharingSessions[key].wsio.emit('createRemoteSagePointer', {
				id: wsio.id, portal: {host: config.host, port: config.port}
			});
		}
		initializeExistingAppsPositionSizeTypeOnly(wsio);
		initializeExistingPartitionsUI(wsio);
	}

	var remote = findRemoteSiteByConnection(wsio);
	if (remote !== null) {
		remote.wsio = wsio;
		remote.connected = "on";
		var site = {name: remote.name, connected: remote.connected};
		broadcast('connectedToRemoteSite', site);
	}

	if (wsio.clientType === "webBrowser") {
		webBrowserClient = wsio;
	}

	if (wsio.clientType === "performance") {
		performanceManager.updateClient(wsio);
	}
}

/**
 * Installs all the message callbacks on a websocket
 *
 * @method     setupListeners
 * @param      {Websocket}  wsio    concerned websocket
 */
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
	wsio.on('updateStateOptions',                   wsUpdateStateOptions);
	wsio.on('appResize',                            wsAppResize);
	wsio.on('appFullscreen',                        wsFullscreen);
	wsio.on('broadcast',                            wsBroadcast);
	wsio.on('applicationRPC',                       wsApplicationRPC);

	wsio.on('requestAvailableApplications',         wsRequestAvailableApplications);
	wsio.on('requestStoredFiles',                   wsRequestStoredFiles);
	wsio.on('loadApplication',                      wsLoadApplication);
	wsio.on('loadFileFromServer',                   wsLoadFileFromServer);
	wsio.on('loadImageFromBuffer',                  wsLoadImageFromBuffer);
	wsio.on('deleteElementFromStoredFiles',         wsDeleteElementFromStoredFiles);
	wsio.on('moveElementFromStoredFiles',           wsMoveElementFromStoredFiles);
	wsio.on('saveSesion',                           wsSaveSesion);
	wsio.on('clearDisplay',                         wsClearDisplay);
	wsio.on('deleteAllApplications',								wsDeleteAllApplications);
	wsio.on('tileApplications',                     wsTileApplications);

	// Radial menu should have its own message section? Just appended here for now.
	wsio.on('radialMenuClick',                      wsRadialMenuClick);
	wsio.on('radialMenuMoved',                      wsRadialMenuMoved);
	wsio.on('removeRadialMenu',                     wsRemoveRadialMenu);
	wsio.on('radialMenuWindowToggle',               wsRadialMenuThumbnailWindow);

	// DrawingState messages, should they have their own section?
	wsio.on('updatePalettePosition',				wsUpdatePalettePosition);
	wsio.on('enableDrawingMode',					wsEnableDrawingMode);
	wsio.on('disableDrawingMode',					wsDisableDrawingMode);
	wsio.on('enableEraserMode',						wsEnableEraserMode);
	wsio.on('disableEraserMode',					wsDisableEraserMode);
	wsio.on('enablePointerColorMode',				wsEnablePointerColorMode);
	wsio.on('disablePointerColorMode',				wsDisablePointerColorMode);
	wsio.on('clearDrawingCanvas',					wsClearDrawingCanvas);
	wsio.on('changeStyle',							wsChangeStyle);
	wsio.on('undoLastDrawing',						wsUndoLastDrawing);
	wsio.on('redoDrawing',							wsRedoDrawing);
	wsio.on('loadDrawings',							wsLoadDrawings);
	wsio.on('getSessionsList',						wsGetSessionsList);
	wsio.on('saveDrawings',							wsSaveDrawings);
	wsio.on('enablePaintingMode',					wsEnablePaintingMode);
	wsio.on('disablePaintingMode',					wsDisablePaintingMode);
	wsio.on('saveScreenshot',						wsSaveScreenshot);
	wsio.on('selectionModeOnOff',					wsSelectionModeOnOff);

	wsio.on('addNewWebElement',                     wsAddNewWebElement);

	wsio.on('openNewWebpage',                       wsOpenNewWebpage);

	wsio.on('setVolume',                            wsSetVolume);

	wsio.on('playVideo',                            wsPlayVideo);
	wsio.on('pauseVideo',                           wsPauseVideo);
	wsio.on('stopVideo',                            wsStopVideo);
	wsio.on('updateVideoTime',                      wsUpdateVideoTime);
	wsio.on('muteVideo',                            wsMuteVideo);
	wsio.on('unmuteVideo',                          wsUnmuteVideo);
	wsio.on('loopVideo',                            wsLoopVideo);

	wsio.on('addNewElementFromRemoteServer',          wsAddNewElementFromRemoteServer);
	wsio.on('addNewSharedElementFromRemoteServer',    wsAddNewSharedElementFromRemoteServer);
	wsio.on('requestNextRemoteFrame',                 wsRequestNextRemoteFrame);
	wsio.on('updateRemoteMediaStreamFrame',           wsUpdateRemoteMediaStreamFrame);
	wsio.on('stopMediaStream',                        wsStopMediaStream);
	wsio.on('updateRemoteMediaBlockStreamFrame',      wsUpdateRemoteMediaBlockStreamFrame);
	wsio.on('stopMediaBlockStream',                   wsStopMediaBlockStream);
	wsio.on('requestDataSharingSession',              wsRequestDataSharingSession);
	wsio.on('cancelDataSharingSession',               wsCancelDataSharingSession);
	wsio.on('acceptDataSharingSession',               wsAcceptDataSharingSession);
	wsio.on('rejectDataSharingSession',               wsRejectDataSharingSession);
	wsio.on('createRemoteSagePointer',                wsCreateRemoteSagePointer);
	wsio.on('startRemoteSagePointer',                 wsStartRemoteSagePointer);
	wsio.on('stopRemoteSagePointer',                  wsStopRemoteSagePointer);
	wsio.on('remoteSagePointerPosition',              wsRemoteSagePointerPosition);
	wsio.on('remoteSagePointerToggleModes',           wsRemoteSagePointerToggleModes);
	wsio.on('remoteSagePointerHoverCorner',           wsRemoteSagePointerHoverCorner);
	wsio.on('addNewRemoteElementInDataSharingPortal', wsAddNewRemoteElementInDataSharingPortal);

	wsio.on('updateApplicationOrder',                 wsUpdateApplicationOrder);
	wsio.on('startApplicationMove',                   wsStartApplicationMove);
	wsio.on('startApplicationResize',                 wsStartApplicationResize);
	wsio.on('updateApplicationPosition',              wsUpdateApplicationPosition);
	wsio.on('updateApplicationPositionAndSize',       wsUpdateApplicationPositionAndSize);
	wsio.on('finishApplicationMove',                  wsFinishApplicationMove);
	wsio.on('finishApplicationResize',                wsFinishApplicationResize);
	wsio.on('deleteApplication',                      wsDeleteApplication);
	wsio.on('updateApplicationState',                 wsUpdateApplicationState);
	wsio.on('updateApplicationStateOptions',          wsUpdateApplicationStateOptions);

	wsio.on('addNewControl',                        wsAddNewControl);
	wsio.on('closeAppFromControl',                  wsCloseAppFromControl);
	wsio.on('hideWidgetFromControl',                wsHideWidgetFromControl);
	wsio.on('openRadialMenuFromControl',            wsOpenRadialMenuFromControl);
	wsio.on('recordInnerGeometryForWidget',			wsRecordInnerGeometryForWidget);

	wsio.on('requestNewTitle',						wsRequestNewTitle);
	wsio.on('requestFileBuffer',					wsRequestFileBuffer);
	wsio.on('closeFileBuffer',						wsCloseFileBuffer);
	wsio.on('updateFileBufferCursorPosition', 		wsUpdateFileBufferCursorPosition);

	wsio.on('createAppClone',                       wsCreateAppClone);

	wsio.on('sage2Log',                             wsPrintDebugInfo);
	wsio.on('command',                              wsCommand);

	wsio.on('createFolder',                         wsCreateFolder);

	// Jupyper messages
	wsio.on('startJupyterSharing',					wsStartJupyterSharing);
	wsio.on('updateJupyterSharing',					wsUpdateJupyterSharing);

	// message passing between clients
	wsio.on('requestAppContextMenu',				wsRequestAppContextMenu);
	wsio.on('appContextMenuContents',				wsAppContextMenuContents);
	wsio.on('callFunctionOnApp',					wsCallFunctionOnApp);
	// generic message passing for data requests or for specific communications.
	wsio.on('launchAppWithValues',					wsLaunchAppWithValues);
	wsio.on('sendDataToClient',						wsSendDataToClient);
	wsio.on('saveDataOnServer',						wsSaveDataOnServer);
	wsio.on('serverDataSetValue',					wsServerDataSetValue);
	wsio.on('serverDataGetValue',					wsServerDataGetValue);
	wsio.on('serverDataRemoveValue',				wsServerDataRemoveValue);
	wsio.on('serverDataSubscribeToValue',			wsServerDataSubscribeToValue);
	wsio.on('serverDataGetAllTrackedValues',		wsServerDataGetAllTrackedValues);
	wsio.on('serverDataGetAllTrackedDescriptions',	wsServerDataGetAllTrackedDescriptions);
	wsio.on('serverDataSubscribeToNewValueNotification',	wsServerDataSubscribeToNewValueNotification);

	// Screenshot messages
	wsio.on('startWallScreenshot',                  wsStartWallScreenshot);
	wsio.on('wallScreenshotFromDisplay',            wsWallScreenshotFromDisplay);

	// application file saving message
	wsio.on('appFileSaveRequest',                   appFileSaveRequest);

	// create partition
	wsio.on('createPartition',                      wsCreatePartition);
	wsio.on('partitionScreen',                      wsPartitionScreen);
	wsio.on('deleteAllPartitions',                  wsDeleteAllPartitions);
	wsio.on('partitionsGrabAllContent',             wsPartitionsGrabAllContent);

	// message from electron display client
	wsio.on('displayHardware',                      wsDisplayHardware);
}

/**
 * Ensures that new audioManager instances get metadata about all existing apps
 *
 * @method     initializeExistingAppsAudio
 * @param      {Websocket}  wsio    client's websocket
 */
function initializeExistingAppsAudio(wsio) {
	var key;
	for (key in SAGE2Items.applications.list) {
		wsio.emit('createAppWindow', SAGE2Items.applications.list[key]);
	}
}

/**
 * Rebuilds the application widgets for a given client
 *
 * @method     initializeExistingControls
 * @param      {Websocket}  wsio    client's websocket
 */
function initializeExistingControls(wsio) {
	var i;
	var uniqueID;
	var app;
	// var zIndex;
	var data;
	var controlList = SAGE2Items.widgets.list;
	for (i in controlList) {
		if (controlList.hasOwnProperty(i) && SAGE2Items.applications.list.hasOwnProperty(controlList[i].appId)) {
			data = controlList[i];
			wsio.emit('createControl', data);

			/*
			zIndex = SAGE2Items.widgets.numItems;
			var radialGeometry = {
				x: data.left + (data.height / 2),
				y: data.top + (data.height / 2),
				r: data.height / 2
			};
			if (data.hasSideBar === true) {
				var shapeData = {
					radial: {
						type: "circle",
						visible: true,
						geometry: radialGeometry
					},
					sidebar: {
						type: "rectangle",
						visible: true,
						geometry: {
							x: data.left + data.height,
							y: data.top + (data.height / 2) - (data.barHeight / 2),
							w: data.width - data.height, h: data.barHeight
						}
					}
				};
				interactMgr.addComplexGeometry(data.id, "widgets", shapeData, zIndex, data);
			} else {
				interactMgr.addGeometry(data.id, "widgets", "circle", radialGeometry, true, zIndex, data);
			}
			SAGE2Items.widgets.addItem(data);
			*/
			uniqueID = data.id.substring(data.appId.length, data.id.lastIndexOf("_"));
			app = SAGE2Items.applications.list[data.appId];
			addEventToUserLog(uniqueID, {type: "widgetMenu",
				data: {action: "open", application: {id: app.id, type: app.application}},
				time: Date.now()});
		}
	}
}

/**
 * Rebuilds the pointers for a given client
 *
 * @method     initializeExistingSagePointers
 * @param      {Websocket}  wsio    client's websocket
 */
function initializeExistingSagePointers(wsio) {
	for (var key in sagePointers) {
		if (sagePointers.hasOwnProperty(key)) {
			wsio.emit('createSagePointer', sagePointers[key]);
			wsio.emit('changeSagePointerMode', {id: sagePointers[key].id, mode: remoteInteraction[key].interactionMode});
		}
	}
}

/**
 * Rebuilds the wall radial menu for a given client
 *
 * @method     initializeExistingWallUI
 * @param      {Websocket}  wsio    client's websocket
 */
function initializeExistingWallUI(wsio) {
	var menuInfo;
	if (config.ui.reload_wallui_on_refresh === false) {
		// console.log("WallUI reload on display client refresh: Disabled");
		for (key in SAGE2Items.radialMenus.list) {
			menuInfo = SAGE2Items.radialMenus.list[key].getInfo();
			hideRadialMenu(menuInfo.id);
		}
		return;
	}
	// console.log("WallUI reload on display client refresh: Enabled (default)");
	var key;
	for (key in SAGE2Items.radialMenus.list) {
		menuInfo = SAGE2Items.radialMenus.list[key].getInfo();
		broadcast('createRadialMenu', menuInfo);
		broadcast('updateRadialMenu', menuInfo);
		updateWallUIMediaBrowser(menuInfo.id);
	}
}

function initializeExistingApps(wsio) {
	var key;
	for (key in SAGE2Items.applications.list) {
		// remove partition value from application while sending wsio message (circular structure)
		// does this cause issues?
		var appCopy = Object.assign({}, SAGE2Items.applications.list[key]);
		delete appCopy.partition;

		wsio.emit('createAppWindow', appCopy);
		if (SAGE2Items.renderSync.hasOwnProperty(key)) {
			SAGE2Items.renderSync[key].clients[wsio.id] = {wsio: wsio, readyForNextFrame: false, blocklist: []};
			calculateValidBlocks(SAGE2Items.applications.list[key], mediaBlockSize, SAGE2Items.renderSync[key]);

			// Need to reset the animation loop
			//   a new client could come while other clients were done rendering
			//   (especially true for slow update apps, like the clock)
			broadcast('animateCanvas', {id: SAGE2Items.applications.list[key].id, date: Date.now()});
		}
		handleStickyItem(key);
	}
	for (key in SAGE2Items.portals.list) {
		broadcast('initializeDataSharingSession', SAGE2Items.portals.list[key]);
	}

	var newOrder = interactMgr.getObjectZIndexList("applications", ["portals"]);
	wsio.emit('updateItemOrder', newOrder);
}

function initializeExistingPartitions(wsio) {
	var key;

	for (key in partitions.list) {
		wsio.emit('createPartitionWindow', partitions.list[key].getDisplayInfo());
		wsio.emit('partitionWindowTitleUpdate', partitions.list[key].getTitle());
	}
}

function initializeExistingAppsPositionSizeTypeOnly(wsio) {
	var key;
	for (key in SAGE2Items.applications.list) {
		wsio.emit('createAppWindowPositionSizeOnly', getAppPositionSize(SAGE2Items.applications.list[key]));

		// Send the appliation state to the UI
		broadcast('applicationState', {
			id: SAGE2Items.applications.list[key].id,
			state: SAGE2Items.applications.list[key].data,
			application: SAGE2Items.applications.list[key].application
		});
		handleStickyItem(key);
	}

	var newOrder = interactMgr.getObjectZIndexList("applications", ["portals"]);
	wsio.emit('updateItemOrder', newOrder);
}

function initializeExistingPartitionsUI(wsio) {
	var key;

	for (key in partitions.list) {
		wsio.emit('createPartitionBorder', partitions.list[key].getDisplayInfo());
	}
}

function initializeRemoteServerInfo(wsio) {
	for (var i = 0; i < remoteSites.length; i++) {
		var site = {name: remoteSites[i].name, connected: remoteSites[i].connected, geometry: remoteSites[i].geometry};
		wsio.emit('addRemoteSite', site);
	}
}

// **************  Drawing Functions *****************

// The functions just call their associated method in the drawing manager
function wsUpdatePalettePosition(wsio, data) {
	drawingManager.updatePalettePosition({
		startX: data.x,
		endX: data.x + data.w,
		startY: data.y,
		endY: data.y + data.h});
}

function wsEnableDrawingMode(wsio, data) {
	drawingManager.enableDrawingMode(data);
}
function wsDisableDrawingMode(wsio, data) {
	drawingManager.disableDrawingMode(data);
}

function wsEnableEraserMode(wsio, data) {
	drawingManager.enableEraserMode(data);
}
function wsDisableEraserMode(wsio, data) {
	drawingManager.disableEraserMode(data);
}

function wsEnablePointerColorMode(wsio, data) {
	drawingManager.enablePointerColorMode(data);
}
function wsDisablePointerColorMode(wsio, data) {
	drawingManager.disablePointerColorMode(data);
}


function wsClearDrawingCanvas(wsio, data) {
	drawingManager.clearDrawingCanvas();
}

function wsChangeStyle(wsio, data) {
	drawingManager.changeStyle(data);
}

function wsUndoLastDrawing(wsio, data) {
	drawingManager.undoLastDrawing();
}

function wsRedoDrawing(wsio, data) {
	drawingManager.redoDrawing();
}

function wsLoadDrawings(wsio, data) {
	drawingManager.loadDrawings(data);
}

function wsGetSessionsList(wsio, data) {
	var allDrawings = getAllDrawingsessions();
	drawingManager.gotSessionsList(allDrawings);
}

function wsSaveDrawings(wsio, data) {
	drawingManager.saveDrawings();
}

function wsEnablePaintingMode(wsio, data) {
	drawingManager.enablePaintingMode();
}

function wsDisablePaintingMode(wsio, data) {
	drawingManager.disablePaintingMode();
}
function wsSaveScreenshot(wsio, data) {
	saveScreenshot(data.screenshot);
}

function wsSelectionModeOnOff(wsio, data) {
	drawingManager.selectionModeOnOff();
}

// **************  Sage Pointer Functions *****************

function wsRegisterInteractionClient(wsio, data) {
	var key;

	// Update color and name of pointer when UI connects
	sagePointers[wsio.id].color = data.color;
	sagePointers[wsio.id].name  = data.name;

	if (program.trackUsers === true) {
		var newUser = true;
		for (key in users) {
			if (users[key].name === data.name && users[key].color.toLowerCase() === data.color.toLowerCase()) {
				users[key].ip = wsio.id;
				if (users[key].actions === undefined) {
					users[key].actions = [];
				}
				users[key].actions.push({type: "connect", data: null, time: Date.now()});
				newUser = false;
			}
		}
		if (newUser === true) {
			var id = getNewUserId();
			users[id] = {};
			users[id].name = data.name;
			users[id].color = data.color;
			users[id].ip = wsio.id;
			if (users[id].actions === undefined) {
				users[id].actions = [];
			}
			users[id].actions.push({type: "connect", data: null, time: Date.now()});
		}
	} else {
		for (key in users) {
			if (users[key].name === data.name && users[key].color.toLowerCase() === data.color.toLowerCase()) {
				users[key].ip = wsio.id;
				if (users[key].actions === undefined) {
					users[key].actions = [];
				}
				users[key].actions.push({type: "connect", data: null, time: Date.now()});
			}
		}
	}
}

function wsStartSagePointer(wsio, data) {
	// Switch interaction from window mode (on web) to app mode (wall)
	remoteInteraction[wsio.id].interactionMode = remoteInteraction[wsio.id].getPreviousMode();
	broadcast('changeSagePointerMode', {id: sagePointers[wsio.id].id, mode: remoteInteraction[wsio.id].getPreviousMode()});

	showPointer(wsio.id, data);

	addEventToUserLog(wsio.id, {type: "SAGE2PointerStart", data: null, time: Date.now()});
}

function wsStopSagePointer(wsio, data) {
	hidePointer(wsio.id);

	// return to window interaction mode after stopping pointer
	remoteInteraction[wsio.id].saveMode();
	if (remoteInteraction[wsio.id].appInteractionMode()) {
		remoteInteraction[wsio.id].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[wsio.id].id, mode: remoteInteraction[wsio.id].interactionMode});
	}

	var key;
	for (key in remoteSharingSessions) {
		remoteSharingSessions[key].wsio.emit('stopRemoteSagePointer', {id: wsio.id});
	}

	addEventToUserLog(wsio.id, {type: "SAGE2PointerEnd", data: null, time: Date.now()});
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
}

function wsKeyUp(wsio, data) {
	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;

	keyUp(wsio.id, pointerX, pointerY, data);
}

function wsKeyPress(wsio, data) {
	var pointerX = sagePointers[wsio.id].left;
	var pointerY = sagePointers[wsio.id].top;

	keyPress(wsio.id, pointerX, pointerY, data);
}

// **************  File Upload Functions *****************
function wsUploadedFile(wsio, data) {
	addEventToUserLog(wsio.id, {type: "fileUpload", data: data, time: Date.now()});
}

function wsRadialMenuClick(wsio, data) {
	if (data.button === "closeButton") {
		addEventToUserLog(data.user, {type: "radialMenu", data: {action: "close"}, time: Date.now()});
	} else if (data.button === "settingsButton" || data.button.indexOf("Window") >= 0) {
		var action = data.data.state === "opened" ? "open" : "close";
		addEventToUserLog(data.user, {type: "radialMenuAction", data: {button: data.button, action: action}, time: Date.now()});
	} else {
		addEventToUserLog(data.user, {type: "radialMenuAction", data: {button: data.button}, time: Date.now()});
	}
}

// **************  Media Stream Functions *****************

function wsStartNewMediaStream(wsio, data) {
	sageutils.log("Media stream", 'new stream:', data.id);

	var i;
	SAGE2Items.renderSync[data.id] = {clients: {}, chunks: []};
	for (i = 0; i < clients.length; i++) {
		if (clients[i].clientType === "display") {
			SAGE2Items.renderSync[data.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: false, blocklist: []};
		}
	}

	// forcing 'int' type for width and height
	data.width  = parseInt(data.width,  10);
	data.height = parseInt(data.height, 10);

	appLoader.createMediaStream(data.src, data.type, data.encoding, data.title, data.color, data.width, data.height,
		function(appInstance) {
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
}

/**
 * Test if two rectangles overlap (axis-aligned)
 *
 * @method doOverlap
 * @param x_1 {Integer} x coordinate first rectangle
 * @param y_1 {Integer} y coordinate first rectangle
 * @param width_1 {Integer} width first rectangle
 * @param height_1 {Integer} height first rectangle
 * @param x_2 {Integer} x coordinate second rectangle
 * @param y_2 {Integer} y coordinate second rectangle
 * @param width_2 {Integer} width second rectangle
 * @param height_2 {Integer} height second rectangle
 * @return {Boolean} true if rectangles overlap
 */
function doOverlap(x_1, y_1, width_1, height_1, x_2, y_2, width_2, height_2) {
	return !(x_1 > x_2 + width_2 || x_1 + width_1 < x_2 || y_1 > y_2 + height_2 || y_1 + height_1 < y_2);
}

function wsUpdateMediaStreamFrame(wsio, data) {
	var key;
	// Remote sites have a pass back issue that needs to be caught
	if (SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) {
		return;
	}

	// Reset the 'ready' flag for every display client
	for (key in SAGE2Items.renderSync[data.id].clients) {
		SAGE2Items.renderSync[data.id].clients[key].readyForNextFrame = false;
	}
	// Get the application from the message
	var stream = SAGE2Items.applications.list[data.id];
	if (stream !== undefined && stream !== null) {
		stream.data = data.state;
	} else {
		// if can't find the application, it's being destroyed...
		return;
	}

	// Send the image to all display nodes
	// broadcast('updateMediaStreamFrame', data);

	// Update the date
	data.date = new Date();

	// Create a copy of the frame object with dummy data (white 1x1 gif)
	var data_copy = {};
	data_copy.id             = data.id;
	data_copy.date           = data.date;
	data_copy.state          = {};
	data_copy.state.src      = "R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=";
	data_copy.state.type     = "image/gif";
	data_copy.state.encoding = "base64";

	// Iterate over all the clients of this app
	for (key in SAGE2Items.renderSync[data.id].clients) {
		var did = SAGE2Items.renderSync[data.id].clients[key].wsio.clientID;
		// Overview display
		if (did === -1) {
			// send the full frame to be displayed
			SAGE2Items.renderSync[data.id].clients[key].wsio.emit('updateMediaStreamFrame', data);
			continue;
		}
		var display = config.displays[did];
		// app coordinates
		var left    = stream.left;
		var top     = stream.top + config.ui.titleBarHeight;
		// tile coordinates
		var offsetX = config.resolution.width  * display.column;
		var offsetY = config.resolution.height * display.row;

		var checkWidth  = config.resolution.width;
		var checkHeight = config.resolution.height;
		// Check for irregular tiles
		checkWidth  *= config.displays[did].width;
		checkHeight *= config.displays[did].height;

		// If the app window and the display overlap
		if (doOverlap(left, top, stream.width, stream.height,
			offsetX, offsetY, checkWidth, checkHeight)) {
			// send the full frame to be displayed
			SAGE2Items.renderSync[data.id].clients[key].wsio.emit('updateMediaStreamFrame', data);
		} else {
			// otherwise send a dummy small image
			SAGE2Items.renderSync[data.id].clients[key].wsio.emit('updateMediaStreamFrame', data_copy);
		}
	}
}

function wsUpdateMediaStreamChunk(wsio, data) {
	if (SAGE2Items.renderSync[data.id].chunks.length === 0) {
		SAGE2Items.renderSync[data.id].chunks = initializeArray(data.total, "");
	}
	SAGE2Items.renderSync[data.id].chunks[data.piece] = data.state.src;
	if (allNonBlank(SAGE2Items.renderSync[data.id].chunks)) {
		wsUpdateMediaStreamFrame(wsio, {id: data.id, state: {
			src: SAGE2Items.renderSync[data.id].chunks.join(""),
			type: data.state.type,
			encoding: data.state.encoding}});
		SAGE2Items.renderSync[data.id].chunks = [];
	}
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

	// stop all clones in shared portals
	var key;
	for (key in SAGE2Items.portals.list) {
		stream = SAGE2Items.applications.list[data.id + "_" + key];
		if (stream !== undefined && stream !== null) {
			deleteApplication(stream.id);
		}
	}
}

function wsReceivedMediaStreamFrame(wsio, data) {
	SAGE2Items.renderSync[data.id].clients[wsio.id].readyForNextFrame = true;
	if (allTrueDict(SAGE2Items.renderSync[data.id].clients, "readyForNextFrame")) {
		var i;
		var key;
		for (key in SAGE2Items.renderSync[data.id].clients) {
			SAGE2Items.renderSync[data.id].clients[key].readyForNextFrame = false;
		}
		var sender = {wsio: null, serverId: null, clientId: null, streamId: null};
		var mediaStreamData = data.id.split("|");
		if (mediaStreamData.length === 2) { // local stream --> client | stream_id
			sender.clientId = mediaStreamData[0];
			sender.streamId = parseInt(mediaStreamData[1]);
			for (i = 0; i < clients.length; i++) {
				if (clients[i].id === sender.clientId) {
					sender.wsio = clients[i];
					break;
				}
			}
			if (sender.wsio !== null) {
				sender.wsio.emit('requestNextFrame', {streamId: sender.streamId});
			}
		} else if (mediaStreamData.length === 3) { // remote stream --> remote_server | client | stream_id
			sender.serverId = mediaStreamData[0];
			sender.clientId = mediaStreamData[1];
			sender.streamId = mediaStreamData[2];
			for (i = 0; i < clients.length; i++) {
				if (clients[i].id === sender.serverId) {
					sender.wsio = clients[i];
					break;
				}
			}
			if (sender.wsio !== null) {
				sender.wsio.emit('requestNextRemoteFrame', {id: sender.clientId + "|" + sender.streamId});
			}
		}
	}
}

// **************  Media Block Stream Functions *****************
function wsStartNewMediaBlockStream(wsio, data) {
	// Forcing 'int' type for width and height
	//     for some reasons, messages from websocket lib from Linux send strings for ints
	data.width  = parseInt(data.width,  10);
	data.height = parseInt(data.height, 10);

	sageutils.log("Block stream", data.width + 'x' + data.height, data.colorspace);

	SAGE2Items.renderSync[data.id] = {chunks: [], clients: {}, width: data.width, height: data.height};
	for (var i = 0; i < clients.length; i++) {
		if (clients[i].clientType === "display") {
			SAGE2Items.renderSync[data.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: true, blocklist: []};
		}
	}

	appLoader.createMediaBlockStream(data.title, data.color, data.colorspace, data.width, data.height, function(appInstance) {
		appInstance.id = data.id;
		handleNewApplication(appInstance, null);
		calculateValidBlocks(appInstance, mediaBlockSize, SAGE2Items.renderSync[appInstance.id]);
	});
}

function wsUpdateMediaBlockStreamFrame(wsio, buffer) {
	var i;
	var key;
	var id = byteBufferToString(buffer);

	if (!SAGE2Items.applications.list.hasOwnProperty(id)) {
		return;
	}

	for (key in SAGE2Items.renderSync[id].clients) {
		SAGE2Items.renderSync[id].clients[key].readyForNextFrame = false;
	}

	var imgBuffer = buffer.slice(id.length + 1);

	var colorspace = SAGE2Items.applications.list[id].data.colorspace;
	var blockBuffers;

	if (colorspace === "RGBA") {
		blockBuffers = pixelblock.rgbaToPixelBlocks(imgBuffer, SAGE2Items.renderSync[id].width,
			SAGE2Items.renderSync[id].height, mediaBlockSize);
	} else if (colorspace === "RGB" || colorspace === "BGR") {
		blockBuffers = pixelblock.rgbToPixelBlocks(imgBuffer, SAGE2Items.renderSync[id].width,
			SAGE2Items.renderSync[id].height, mediaBlockSize);
	} else if (colorspace === "YUV420p") {
		blockBuffers = pixelblock.yuv420ToPixelBlocks(imgBuffer, SAGE2Items.renderSync[id].width,
			SAGE2Items.renderSync[id].height, mediaBlockSize);
	}

	var pixelbuffer = [];
	var idBuffer = Buffer.concat([new Buffer(id), new Buffer([0])]);
	var dateBuffer = intToByteBuffer(Date.now(), 8);
	var blockIdxBuffer;
	for (i = 0; i < blockBuffers.length; i++) {
		blockIdxBuffer = intToByteBuffer(i, 2);
		pixelbuffer[i] = Buffer.concat([idBuffer, blockIdxBuffer, dateBuffer, blockBuffers[i]]);
	}

	for (key in SAGE2Items.renderSync[id].clients) {
		for (i = 0; i < pixelbuffer.length; i++) {
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
		var key;
		for (key in SAGE2Items.renderSync[data.id].clients) {
			SAGE2Items.renderSync[data.id].clients[key].readyForNextFrame = false;
		}
		var sender = {wsio: null, serverId: null, clientId: null, streamId: null};
		var mediaBlockStreamData = data.id.split("|");
		if (mediaBlockStreamData.length === 2) { // local stream --> client | stream_id
			sender.clientId = mediaBlockStreamData[0];
			sender.streamId = parseInt(mediaBlockStreamData[1]);
			for (i = 0; i < clients.length; i++) {
				if (clients[i].id === sender.clientId) {
					sender.wsio = clients[i];
					break;
				}
			}
			if (sender.wsio !== null) {
				sender.wsio.emit('requestNextFrame', {streamId: sender.streamId});
			}
		} else if (mediaBlockStreamData.length === 3) { // remote stream --> remote_server | client | stream_id
			sender.serverId = mediaBlockStreamData[0];
			sender.clientId = mediaBlockStreamData[1];
			sender.streamId = mediaBlockStreamData[2];
			for (i = 0; i < clients.length; i++) {
				if (clients[i].id === sender.serverId) {
					sender.wsio = clients[i];
					break;
				}
			}
			if (sender.wsio !== null) {
				sender.wsio.emit('requestNextRemoteFrame', {id: sender.clientId + "|" + sender.streamId});
			}
		}
	}
}

// Print message from remote applications
function wsPrintDebugInfo(wsio, data) {
	sageutils.log("Client", "Node " + data.node + " [" + data.app + "] " + data.message);
}

function wsRequestVideoFrame(wsio, data) {
	SAGE2Items.renderSync[data.id].clients[wsio.id].readyForNextFrame = true;
	handleNewClientReady(data.id);
}

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
		} else {
			var aTimer = setTimeout(function() {
				now = Date.now();
				SAGE2Items.renderSync[data.id].date = now;
				broadcast('animateCanvas', {id: data.id, date: now});
			}, ticks - elapsed);
			SAGE2Items.renderSync[data.id].clients[wsio.id].animateTimer = aTimer;
		}
	}
}

function wsUpdateAppState(wsio, data) {
	// Using updates only from master
	if (wsio === masterDisplay && SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		var app = SAGE2Items.applications.list[data.id];

		sageutils.mergeObjects(data.localState, app.data, ['doc_url', 'video_url', 'video_type', 'audio_url', 'audio_type']);

		if (data.updateRemote === true) {
			var ts;
			var portal = findApplicationPortal(app);
			if (portal !== undefined && portal !== null) {
				ts = Date.now() + remoteSharingSessions[portal.id].timeOffset;
				remoteSharingSessions[portal.id].wsio.emit('updateApplicationState', {
					id: data.id, state: data.remoteState, date: ts
				});
			} else if (sharedApps[data.id] !== undefined) {
				var i;
				for (i = 0; i < sharedApps[data.id].length; i++) {
					// var ts = Date.now() + remoteSharingSessions[portal.id].timeOffset;
					ts = Date.now();
					sharedApps[data.id][i].wsio.emit('updateApplicationState',
						{id: sharedApps[data.id][i].sharedId, state: data.remoteState, date: ts});
				}
			}
		}

		// Send the appliation state to the UI
		broadcast('applicationState', {
			id: data.id,
			state: app.data,
			application: app.application
		});
	}
}

function wsUpdateStateOptions(wsio, data) {
	if (wsio === masterDisplay && SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		if (sharedApps[data.id] !== undefined) {
			var i;
			for (i = 0; i < sharedApps[data.id].length; i++) {
				// var ts = Date.now() + remoteSharingSessions[portal.id].timeOffset;
				var ts = Date.now();
				sharedApps[data.id][i].wsio.emit('updateApplicationStateOptions',
					{id: sharedApps[data.id][i].sharedId, options: data.options, date: ts});
			}
		}
	}
}

//
// Got a resize call for an application itself
//
function wsAppResize(wsio, data) {
	if (SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		var app = SAGE2Items.applications.list[data.id];

		// Values in percent if smaller than 1
		if (data.width > 0 && data.width <= 1) {
			data.width = Math.round(data.width * config.totalWidth);
		}
		if (data.height > 0 && data.height <= 1) {
			data.height = Math.round(data.height * config.totalHeight);
		}

		// Update the width height and aspect ratio
		if (sageutils.isTrue(data.keepRatio)) {
			// we use the width as leading the calculation
			app.width  = data.width;
			app.height = data.width / app.aspect;
		} else {
			app.width  = data.width;
			app.height = data.height;
			app.aspect = app.width / app.height;
			app.native_width  = data.width;
			app.native_height = data.height;
		}
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
// Move the application relative to its position
//
function wsAppMoveBy(wsio, data) {
	if (SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		var app = SAGE2Items.applications.list[data.id];
		// Values in percent if smaller than 1
		if (data.dx > 0 && data.dx < 1) {
			data.dx = Math.round(data.dx * config.totalWidth);
		}
		if (data.dy > 0 && data.dy < 1) {
			data.dy = Math.round(data.dy * config.totalHeight);
		}
		app.left += data.dx;
		app.top  += data.dy;
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
// Move the application relative to its position
//
function wsAppMoveTo(wsio, data) {
	if (SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		var app = SAGE2Items.applications.list[data.id];
		// Values in percent if smaller than 1
		if (data.x > 0 && data.x <= 1) {
			data.x = Math.round(data.x * config.totalWidth);
		}
		if (data.y > 0 && data.y <= 1) {
			data.y = Math.round(data.y * config.totalHeight);
		}
		app.left = data.x;
		app.top  = data.y;
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
// Application request fullscreen
//
function wsFullscreen(wsio, data) {
	var id = data.id;
	if (SAGE2Items.applications.list.hasOwnProperty(id)) {
		var item = SAGE2Items.applications.list[id];

		var wallRatio = config.totalWidth  / config.totalHeight;
		var iCenterX  = config.totalWidth  / 2.0;
		var iCenterY  = config.totalHeight / 2.0;
		var iWidth    = 1;
		var iHeight   = 1;
		var titleBar = config.ui.titleBarHeight;
		if (config.ui.auto_hide_ui === true) {
			titleBar = 0;
		}

		if (item.aspect > wallRatio) {
			// Image wider than wall
			iWidth  = config.totalWidth;
			iHeight = iWidth / item.aspect;
		} else {
			// Wall wider than image
			iHeight = config.totalHeight - (2 * titleBar);
			iWidth  = iHeight * item.aspect;
		}
		// back up values for restore
		item.previous_left   = item.left;
		item.previous_top    = item.top;
		item.previous_width  = item.width;
		item.previous_height = item.width / item.aspect;

		// calculate new values
		item.left   = iCenterX - (iWidth / 2);
		item.top    = iCenterY - (iHeight / 2);
		item.width  = iWidth;
		item.height = iHeight;

		// Shift by 'titleBarHeight' if no auto-hide
		if (config.ui.auto_hide_ui === true) {
			item.top = item.top - config.ui.titleBarHeight;
		}

		item.maximized = true;

		// build the object to be sent
		var updateItem = {elemId: item.id, elemLeft: item.left, elemTop: item.top,
			elemWidth: item.width, elemHeight: item.height, force: true,
			date: new Date()};

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
// RPC call from apps
//
function wsApplicationRPC(wsio, data) {
	var app = SAGE2Items.applications.list[data.app];
	if (app && app.plugin) {
		// Find the path to the app plugin
		var pluginFile = path.resolve(app.file, app.plugin);

		try {
			// Loading the plugin using builtin require function
			var rpcFunction = require(pluginFile);
			// Start the function inside the plugin
			rpcFunction(wsio, data, config);
		} catch (e) {
			// If something fails
			console.log("----------------------------");
			sageutils.log('RPC', 'error in plugin', pluginFile);
			console.log(e);
			console.log("----------------------------");
		}
	} else {
		sageutils.log('RPC', 'error no plugin found for', app.file);
	}

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
			ad.getFullYear(), ad.getMonth() + 1, ad.getDate(),
			ad.getHours(), ad.getMinutes(), ad.getSeconds()
		);
	}
	saveSession(sname);
}

function printListSessions() {
	var thelist = listSessions();
	console.log("Sessions\n---------");
	for (var i = 0; i < thelist.length; i++) {
		console.log(sprint("%2d: Name: %s\tSize: %.0fKB\tDate: %s",
			i, thelist[i].exif.FileName, thelist[i].exif.FileSize / 1024.0, thelist[i].exif.FileDate
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
				var ad = new Date(stat.mtime);
				var strdate = sprint("%4d/%02d/%02d %02d:%02d:%02s",
					ad.getFullYear(), ad.getMonth() + 1, ad.getDate(),
					ad.getHours(), ad.getMinutes(), ad.getSeconds()
				);
				// create path to thumbnail
				var thumbPath = path.join(path.join(path.join("", "user"), "sessions"), ".previews");
				// replace .json with .svg in filename
				var thumbPathFull = "\\" + path.join(thumbPath, file.substring(".json", file.length - 5) + ".svg");
				// Make it look like an exif data structure
				thelist.push({id: filename,
					sage2URL: '/uploads/' + file,
					exif: { FileName: file.slice(0, -5),
						FileSize: stat.size,
						FileDate: strdate,
						MIMEType: 'sage2/session',
						SAGE2thumbnail: thumbPathFull
					}
				});
			}
		}
	}
	return thelist;
}

function deleteSession(filename, cb) {
	if (filename) {
		// var fullpath = path.join(sessionDirectory, filename);
		// // if it doesn't end in .json, add it
		// if (fullpath.indexOf(".json", fullpath.length - 5) === -1) {
		// 	fullpath += '.json';
		// }
		var fullpath = path.resolve(filename);
		fs.unlink(fullpath, function(err) {
			if (err) {
				sageutils.log("Session", "Could not delete session", filename, err);
				return;
			}
			sageutils.log("Session", "Successfully deleted session", filename);
			if (cb) {
				cb();
			}
		});
	}
}

function saveDrawingSession(data) {
	var now = new Date();
	var filename = "drawingSession" + now.getTime();

	var fullpath = path.join(sessionDirectory, filename);
	// if it doesn't end in .json, add it
	if (fullpath.indexOf(".json", fullpath.length - 5) === -1) {
		fullpath += '.json';
	}

	try {
		fs.writeFileSync(fullpath, JSON.stringify(data, null, 4));
		sageutils.log("Session", "saved drawing session file to", fullpath);
	} catch (err) {
		sageutils.log("Session", "error saving", err);
	}
}

function getAllDrawingsessions() {
	var allNames = fs.readdirSync(sessionDirectory);
	var res = [];
	for (var i in allNames) {
		if (allNames[i].indexOf("drawingSession") != -1) {
			res.push(allNames[i]);
		}
	}
	return res;
}

function loadDrawingSession(filename) {

	if (filename == null) {
		console.log("Filename does not exist");
		filename = "drawingSession";
	}

	var fullpath;
	if (sageutils.fileExists(path.resolve(filename))) {
		fullpath = filename;
	} else {
		fullpath = path.join(sessionDirectory, filename);
	}

	// if it doesn't end in .json, add it
	if (fullpath.indexOf(".json", fullpath.length - 5) === -1) {
		fullpath += '.json';
	}

	fs.readFile(fullpath, function(err, data) {
		if (err) {
			console.log("Error reading DrawingState: ", err);
		} else {
			console.log("Reading DrawingState from " + fullpath);
			var j = JSON.parse(data);
			drawingManager.loadOldState(j);
		}
	});

}

function saveScreenshot(data) {
	var now = new Date();
	// Assign a unique name
	var filename = "screenshot" + now.getTime() + '.png';
	var img = data.replace("data:image/png;base64,", "");
	var fullpath = path.join(whiteboardDirectory, filename);
	var buf = new Buffer(img, 'base64');
	try {
		fs.writeFile(fullpath, buf);
		sageutils.log("Session", "saved screenshot file to", fullpath);
	} catch (err) {
		sageutils.log("Session", "error saving", err);
	}
}

function saveSession(filename) {
	filename = filename || 'default.json';

	var key;

	var states     = {};
	states.apps    = [];
	states.numapps = 0;
	states.partitions = [];
	states.numpartitions = 0;
	states.date    = Date.now();
	for (key in SAGE2Items.applications.list) {
		var a = Object.assign({}, SAGE2Items.applications.list[key]);

		if (a.partition) {
			// remove reference to parent partition if it exists
			delete a.partition;
		}

		// Test if the application is shared (coming from another server)
		// appId contains a + character
		var isNotShared = (a.id.indexOf('+') === -1);

		// Ignore media streaming applications for now (desktop sharing) and shared applications
		if (a.application !== 'media_stream' && a.application !== 'media_block_stream' && isNotShared) {
			states.apps.push(a);
			states.numapps++;
		}
	}

	for (key in partitions.list) {
		var p = Object.assign({}, partitions.list[key]);

		if (p.partitionList) {
			delete p.partitionList;
		}

		for (var app in p.children) {
			p.children[app] = Object.assign({}, p.children[app]);

			if (p.children[app].partition) {
				delete p.children[app].partition;
			}
		}

		states.partitions.push(p);
		states.numpartitions++;
	}

	// session with only partitions considered a "LAYOUT"
	if (states.numapps === 0 && states.numpartitions > 0 && filename !== "default.json") {
		filename = "LAYOUT - " + filename;
	}

	var fullpath = path.join(sessionDirectory, filename);
	// if it doesn't end in .json, add it
	if (fullpath.indexOf(".json", fullpath.length - 5) === -1) {
		fullpath += '.json';
	}

	// save session preview image to sessions/.previews/

	var previewPath = path.join(sessionDirectory, ".previews");

	if (!sageutils.folderExists(previewPath)) {
		sageutils.mkdirParent(previewPath);
	}

	var previewFname;

	if (filename.indexOf(".json", filename.length - 5) === -1) {
		previewFname = filename + ".svg";
	} else {
		previewFname = filename.substr(0, filename.length - 5) + ".svg";
	}

	var fullPreviewPath = path.join(previewPath, previewFname);

	// create svg string as thumbnail for session preview

	var width = config.totalWidth,
		height = config.totalHeight,
		box = "0,0," + width + "," + height;

	var svg = "<svg width=\"" + 256 +
		"\" height=\"" + 256 +
		"\" viewBox=\"" + box +
		"\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" " +
		"xmlns:xlink=\"http://www.w3.org/1999/xlink\">";

	// add gray background
	svg += "<rect width=\"" + width +
		"\" height=\"" + height +
		"\" style=\"fill: #666666;\"" + "></rect>";

	for (var ptn of states.partitions) {
		// partition areas
		svg += "<rect width=\"" + (ptn.width - 8) +
			"\" height=\"" + (ptn.height - 8) +
			"\" x=\"" + (ptn.left + 4) +
			"\" y=\"" + (ptn.top + 4) +
			"\" style=\"fill: " + ptn.color +
			"; stroke: " + ptn.color +
			"; stroke-width: 8; fill-opacity: 0.3;\"" + "></rect>";

		// partition title bars
		svg += "<rect width=\"" + ptn.width +
			"\" height=\"" + config.ui.titleBarHeight +
			"\" x=\"" + ptn.left +
			"\" y=\"" + (ptn.top - config.ui.titleBarHeight) +
			"\" style=\"fill: " + ptn.color +
			"\"" + "></rect>";
	}

	for (var ap of states.apps) {
		// draw app rectangles
		svg += "<rect width=\"" + ap.width +
			"\" height=\"" + ap.height +
			"\" x=\"" + ap.left +
			"\" y=\"" + ap.top +
			"\" style=\"fill: " + "#AAAAAA; fill-opacity: 0.5; stroke: black; stroke-width: 5;\">" + "</rect>";

		var iconPath;
		if (ap.icon) {
			// the application has a icon defined
			iconPath = path.join(mainFolder.path, path.relative("/user", ap.icon)) + "_256.jpg";
		} else {
			// application does not have an icon (for instance, shared applciation)
			iconPath = path.join(mainFolder.path, "assets/apps/unknownapp") + "_256.jpg";
		}

		var iconImageData = "";
		try {
			iconImageData = new Buffer(fs.readFileSync(iconPath)).toString('base64');
		} catch (error) {
			// error reading/converting icon image
		}

		svg += "<image width=\"" + ap.width +
			"\" height=\"" + ap.height +
			"\" x=\"" + ap.left +
			"\" y=\"" + ap.top +
			"\" xlink:href=\"data:image/jpg;base64," + iconImageData + "\">" + "</image>";
	}

	svg += "</svg>";

	// svg file header
	var header = "<?xml version=\"1.0\" encoding=\"utf-8\"?>";
	header += "<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">";

	try {
		fs.writeFileSync(fullpath, JSON.stringify(states, null, 4));
		sageutils.log("Session", "saved session file to", chalk.yellow.bold(fullpath));
	} catch (err) {
		sageutils.log("Session", "error saving", err);
	}

	// write preview image
	try {
		fs.writeFileSync(fullPreviewPath, header + svg);
		sageutils.log("Session", "saved session preview image to", chalk.yellow.bold(fullPreviewPath));

		// Update the file manager in the UI clients
		broadcast('storedFileList', getSavedFilesList());
	} catch (err) {
		sageutils.log("Session", "error saving", err);
	}
}

function saveUserLog(filename) {
	if (users !== null) {
		filename = filename || "user-log_" + formatDateToYYYYMMDD_HHMMSS(new Date(startTime)) + ".json";

		users.session.end = Date.now();
		var userLogName = path.join("logs", filename);
		if (sageutils.fileExists(userLogName)) {
			fs.unlinkSync(userLogName);
		}
		var ignoreIP = function(key, value) {
			if (key === "ip") {
				return undefined;
			}
			return value;
		};

		fs.writeFileSync(userLogName, json5.stringify(users, ignoreIP, 4));
		sageutils.log("LOG", "saved log file to", userLogName);
	}
}

function createAppFromDescription(app, callback) {
	sageutils.log("Session", "App", app.id);

	if (app.application === "media_stream" || app.application === "media_block_stream") {
		callback(JSON.parse(JSON.stringify(app)), null);
		return;
	}

	var cloneApp = function(appInstance, videohandle) {
		appInstance.left            = app.left;
		appInstance.top             = app.top;
		appInstance.width           = app.width;
		appInstance.height          = app.height;
		appInstance.previous_left   = app.previous_left;
		appInstance.previous_top    = app.previous_top;
		appInstance.previous_width  = app.previous_width;
		appInstance.previous_height = app.previous_height;
		appInstance.maximized       = app.maximized;
		sageutils.mergeObjects(app.data, appInstance.data, ['doc_url', 'video_url', 'video_type', 'audio_url', 'audio_type']);

		callback(appInstance, videohandle);
	};

	var appURL = url.parse(app.url);

	if (appURL.hostname === config.host) {
		if (app.application === "image_viewer" || app.application === "pdf_viewer" || app.application === "movie_player") {
			appLoader.loadFileFromLocalStorage({application: app.application, filename: appURL.path}, cloneApp);
		} else {
			appLoader.loadFileFromLocalStorage({application: "custom_app", filename: appURL.path}, cloneApp);
		}
	} else {
		if (app.application === "image_viewer" || app.application === "pdf_viewer" || app.application === "movie_player") {
			appLoader.loadFileFromWebURL({url: app.url, type: app.type}, cloneApp);
		} else {
			appLoader.loadApplicationFromRemoteServer(app, cloneApp);
		}
	}

	return app.id;
}

function loadSession(filename) {
	filename = filename || 'default.json';

	var fullpath;
	if (sageutils.fileExists(path.resolve(filename))) {
		fullpath = filename;
	} else {
		fullpath = path.join(sessionDirectory, filename);
	}

	// if it doesn't end in .json, add it
	if (fullpath.indexOf(".json", fullpath.length - 5) === -1) {
		fullpath += '.json';
	}

	fs.readFile(fullpath, function(err, data) {
		if (err) {
			sageutils.log("SAGE2", "error reading session", err);
		} else {
			sageutils.log("SAGE2", "reading session from " + fullpath);

			var session = JSON.parse(data);
			sageutils.log("Session", "number of applications", session.numapps);

			// recreate partitions
			if (session.partitions) {

				// if there are any existing partitions
				if (partitions.count > 0) {
					// remove them and replace with partitions from sessions
					for (var id of Object.keys(partitions.list)) {
						deletePartition(id);
					}
				}

				session.partitions.forEach(function(element, index, array) {
					// remake partition
					var ptn = createPartition(
						{
							width: element.width,
							height: element.height,
							left: element.left,
							top: element.top,
							isSnapping: element.isSnapping
						},
						element.color
					);

					ptn.innerMaximization = element.innerMaximization;
					ptn.innerTiling = element.innerTiling;

					broadcast('partitionWindowTitleUpdate', ptn.getTitle());
				});
			}

			// Assign the windows to partitions
			// don't assign existing content to partitions from session

			// partitionsGrabAllContent();

			// recreate apps
			session.apps.forEach(function(element, index, array) {
				createAppFromDescription(element, function(appInstance, videohandle) {
					appInstance.id = getUniqueAppId();

					if (appInstance.animation) {
						var i;
						SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
						for (i = 0; i < clients.length; i++) {
							if (clients[i].clientType === "display") {
								SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {wsio: clients[i],
									readyForNextFrame: false, blocklist: []};
							}
						}
					}

					handleNewApplication(appInstance, videohandle);
				});
			});
		}
	});
}

// **************  Information Functions *****************

function listClients() {
	var i;
	console.log("Clients (%d)\n------------", clients.length);
	for (i = 0; i < clients.length; i++) {
		if (clients[i].clientType === "display") {
			if (clients[i] === masterDisplay) {
				console.log(sprint("%2d: %s (%s %s) master", i, clients[i].id, clients[i].clientType, clients[i].clientID));
			} else {
				console.log(sprint("%2d: %s (%s %s)", i, clients[i].id, clients[i].clientType, clients[i].clientID));
			}
		} else {
			console.log(sprint("%2d: %s (%s)", i, clients[i].id, clients[i].clientType));
		}
	}
}

function listMediaStreams() {
	var i, c, key;
	console.log("Block streams (%d)\n------------", Object.keys(mediaBlockStreams).length);
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

	console.log("Media streams\n------------");
	for (key in SAGE2Items.applications.list) {
		var app = SAGE2Items.applications.list[key];
		if (app.application === "media_stream") {
			console.log(sprint("%2d: %s %s %s",
				i, app.id, app.application, app.title));
			i++;
		}
	}
}

function listMediaBlockStreams() {
	listMediaStreams();
}

function listApplications() {
	var i = 0;
	var key;
	console.log("Applications\n------------");
	for (key in SAGE2Items.applications.list) {
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

	if (num === 0) {
		return 1.0;
	}

	var totAr = 0.0;
	var key;
	for (key in SAGE2Items.applications.list) {
		totAr += (SAGE2Items.applications.list[key].width / SAGE2Items.applications.list[key].height);
	}
	return (totAr / num);
}

function fitWithin(app, x, y, width, height, margin) {
	var titleBar = config.ui.titleBarHeight;
	if (config.ui.auto_hide_ui === true) {
		titleBar = 0;
	}

	// take buffer into account
	x += margin;
	y += margin;
	width  = width  - 2 * margin;
	height = height - 2 * margin;

	var widthRatio  = (width - titleBar)  / app.width;
	var heightRatio = (height - titleBar) / app.height;
	var maximizeRatio;
	if (widthRatio > heightRatio) {
		maximizeRatio = heightRatio;
	} else {
		maximizeRatio = widthRatio;
	}

	// figure out the maximized app size (w/o the widgets)
	var newAppWidth  = Math.round(maximizeRatio * app.width);
	var newAppHeight = Math.round(maximizeRatio * app.height);

	// figure out the maximized app position (with the widgets)
	var postMaxX = Math.round(width / 2.0 - newAppWidth / 2.0);
	var postMaxY = Math.round(height / 2.0 - newAppHeight / 2.0);

	// the new position of the app considering the maximized state and
	// all the widgets around it
	var newAppX = x + postMaxX;
	var newAppY = y + postMaxY;

	return [newAppX, newAppY, newAppWidth, newAppHeight];
}

// Calculate the square of euclidian distance between two objects with .x and .y fields
function distanceSquared2D(p1, p2) {
	var dx = p2.x - p1.x;
	var dy = p2.y - p1.y;
	return (dx * dx + dy * dy);
}

function findMinimum(arr) {
	var val = Number.MAX_VALUE;
	var idx = 0;
	for (var i = 0; i < arr.length; i++) {
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

	var backgroundAndForegroundItems = stickyAppHandler.getListOfBackgroundAndForegroundItems(SAGE2Items.applications.list);
	var appsWithoutBackground = backgroundAndForegroundItems.backgroundItems;
	var numAppsWithoutBackground = appsWithoutBackground.length;

	// Don't use sticking items to compute number of windows.
	var numWindows = numAppsWithoutBackground;
	//var numWindows = SAGE2Items.applications.numItems;

	// 3 scenarios... windows are on average the same aspect ratio as the display
	if (arDiff >= 0.7 && arDiff <= 1.3) {
		numCols = Math.ceil(Math.sqrt(numWindows));
		numRows = Math.ceil(numWindows / numCols);
	} else if (arDiff < 0.7) {
		// windows are much wider than display
		c = Math.round(1 / (arDiff / 2.0));
		if (numWindows <= c) {
			numRows = numWindows;
			numCols = 1;
		} else {
			numCols = Math.max(2, Math.round(numWindows / c));
			numRows = Math.round(Math.ceil(numWindows / numCols));
		}
	} else {
		// windows are much taller than display
		c = Math.round(arDiff * 2);
		if (numWindows <= c) {
			numCols = numWindows;
			numRows = 1;
		} else {
			numRows = Math.max(2, Math.round(numWindows / c));
			numCols = Math.round(Math.ceil(numWindows / numRows));
		}
	}
	numCells = numRows * numCols;

	// determine the bounds of the tiling area
	var titleBar = config.ui.titleBarHeight;
	if (config.ui.auto_hide_ui === true) {
		titleBar = 0;
	}
	var areaX = 0;
	var areaY = Math.round(1.5 * titleBar); // keep 0.5 height as margin
	if (config.ui.auto_hide_ui === true) {
		areaY = -config.ui.titleBarHeight;
	}

	var areaW = config.totalWidth;
	var areaH = config.totalHeight - (1.0 * titleBar);

	var tileW = Math.floor(areaW / numCols);
	var tileH = Math.floor(areaH / numRows);

	var padding = 4;
	// if only one application, no padding, i.e maximize
	if (numWindows === 1) {
		padding = 0;
	}

	var centroidsApps  = {};
	var centroidsTiles = [];

	// Caculate apps centers
	for (key in appsWithoutBackground) {
		app = appsWithoutBackground[key];
		centroidsApps[key] = {x: app.left + app.width / 2.0, y: app.top + app.height / 2.0};
	}
	// Caculate tiles centers
	for (i = 0; i < numCells; i++) {
		c = i % numCols;
		r = Math.floor(i / numCols);
		centroidsTiles.push({x: (c * tileW + areaX) + tileW / 2.0, y: (r * tileH + areaY) + tileH / 2.0});
	}

	// Calculate distances
	var distances = {};
	for (key in centroidsApps) {
		distances[key] = [];
		for (i = 0; i < numCells; i++) {
			var d = distanceSquared2D(centroidsApps[key], centroidsTiles[i]);
			distances[key].push(d);
		}
	}
	stickyAppHandler.enablePiling = true;
	for (key in appsWithoutBackground) {
		// get the application
		app = appsWithoutBackground[key];
		// pick a cell
		var cellid = findMinimum(distances[key]);
		// put infinite value to disable the chosen cell
		for (i in appsWithoutBackground) {
			distances[i][cellid] = Number.MAX_VALUE;
		}

		// calculate new dimensions
		c = cellid % numCols;
		r = Math.floor(cellid / numCols);
		var newdims = fitWithin(app, c * tileW + areaX, r * tileH + areaY, tileW, tileH, padding);

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

		stickyAppHandler.pileItemsStickingToUpdatedItem(app);

		broadcast('startMove', {id: updateItem.elemId, date: updateItem.date});
		broadcast('startResize', {id: updateItem.elemId, date: updateItem.date});

		moveAndResizeApplicationWindow(updateItem);

		broadcast('finishedMove', {id: updateItem.elemId, date: updateItem.date});
		broadcast('finishedResize', {id: updateItem.elemId, date: updateItem.date});
	}
	stickyAppHandler.enablePiling = false;
}

// Remove all apps and partitions
function clearDisplay() {
	deleteAllPartitions();
	deleteAllApplications();
}

// Remove all applications
function deleteAllApplications() {
	var i;
	var all = Object.keys(SAGE2Items.applications.list);
	for (i = 0; i < all.length; i++) {
		deleteApplication(all[i]);
	}

	// Reset the app_id counter to 0
	getUniqueAppId(-1);
}

// Remove all Partitions
function deleteAllPartitions() {
	// delete all partitions
	for (var key of Object.keys(partitions.list)) {
		deletePartition(key);
	}

	// reset partition counter to 0
	partitions.totalCreated = 0;
}

/**
	* Remove all applications
	*
	* @method wsDeleteAllApplications
	*/
function wsDeleteAllApplications(wsio) {
	deleteAllApplications();
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
	var apps = assets.listApps();
	wsio.emit('availableApplications', apps);
}

function wsRequestStoredFiles(wsio, data) {
	var savedFiles = getSavedFilesList();
	wsio.emit('storedFileList', savedFiles);
}

function wsLoadApplication(wsio, data) {
	var appData = {application: "custom_app", filename: data.application, data: data.data};
	appLoader.loadFileFromLocalStorage(appData, function(appInstance) {
		appInstance.id = getUniqueAppId();
		if (appInstance.animation) {
			var i;
			SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
			for (i = 0; i < clients.length; i++) {
				if (clients[i].clientType === "display") {
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {
						wsio: clients[i], readyForNextFrame: false, blocklist: []
					};
				}
			}
		}

		// Get the drop position and convert it to wall coordinates
		var position = data.position || [0, 0];

		if (position[0] > 1) {
			// value in pixels, used as origin
			appInstance.left = position[0];
		} else {
			// value in percent
			position[0] = Math.round(position[0] * config.totalWidth);
			// Use the position as center of drop location
			appInstance.left = position[0] - appInstance.width / 2;
			if (appInstance.left < 0) {
				appInstance.left = 0;
			}
		}
		if (position[1] > 1) {
			// value in pixels, used as origin
			appInstance.top = position[1];
		} else {
			// value in percent
			position[1] = Math.round(position[1] * config.totalHeight);
			// Use the position as center of drop location
			appInstance.top  = position[1] - appInstance.height / 2;
			if (appInstance.top < 0) {
				appInstance.top = 0;
			}
		}

		// Get the size if any specificed
		var initialSize = data.dimensions;
		if (initialSize) {
			appInstance.width  = initialSize[0];
			appInstance.height = initialSize[1];
			appInstance.aspect = initialSize[0] / initialSize[1];
		}

		/*
		If this app is launched from launchAppWithValues command and the position isn't specified, then need to calculate
		First check if it is the first app, they all start from the same place
		If not the first, then check if the position of (last x + last width + padding + this width < wall width)
			if fits, add to this row
			if not fit, then check if fits on next row (last y + last tallest + padding + this height < wall height)
				if fit, add to next row
				if no fit, then restart
		*/
		if (data.wasLaunchedThroughMessage && !data.wasPositionGivenInMessage) {
			let xApp, yApp;
			// if this is the first app.
			if (appLaunchPositioning.xLast === -1) {
				xApp = appLaunchPositioning.xStart;
				yApp = appLaunchPositioning.yStart;
			} else {
				// if not the first app, check that this app fits in the current row
				let fit = false;
				if (appLaunchPositioning.xLast + appLaunchPositioning.widthLast
				+ appLaunchPositioning.padding + appInstance.width < config.totalWidth) {
					if (appLaunchPositioning.yLast + appInstance.height < config.totalHeight) {
						fit = true;
					}
				}
				// if the app fits, then let use the modified position
				if (fit) {
					xApp = appLaunchPositioning.xLast + appLaunchPositioning.widthLast
					+ appLaunchPositioning.padding;
					yApp = appLaunchPositioning.yLast;
				} else { // need to see if fits on next row or restart.
					// either way changing row, set this app's height as tallest in row.
					appLaunchPositioning.tallestInRow = appInstance.height;
					// if fits on next row, put it there
					if (appLaunchPositioning.yLast + appLaunchPositioning.tallestInRow
					+ appLaunchPositioning.padding + appInstance.height < config.totalHeight) {
						xApp = appLaunchPositioning.xStart;
						yApp = appLaunchPositioning.yLast + appLaunchPositioning.tallestInRow
						+ appLaunchPositioning.padding;
					} else { // doesn't fit, restart
						xApp = appLaunchPositioning.xStart;
						yApp = appLaunchPositioning.yStart;
					}
				}
			}
			// set the app values
			appInstance.left = xApp;
			appInstance.top = yApp;
			// track the values to position adjust next app
			appLaunchPositioning.xLast = appInstance.left;
			appLaunchPositioning.yLast = appInstance.top;
			appLaunchPositioning.widthLast = appInstance.width;
			appLaunchPositioning.heightLast = appInstance.height;
			if (appInstance.height > appLaunchPositioning.tallestInRow) {
				appLaunchPositioning.tallestInRow = appInstance.height;
			}
		}
		// if supplied more values to init with
		if (data.wasLaunchedThroughMessage && data.customLaunchParams) {
			appInstance.customLaunchParams = data.customLaunchParams;
		}

		handleNewApplication(appInstance, null);

		// By not deleting it will be given whenever display client refreshes/connect
		// delete appInstance.customLaunchParams;

		addEventToUserLog(data.user, {type: "openApplication", data:
			{application: {id: appInstance.id, type: appInstance.application}}, time: Date.now()});
	});
}

function wsLoadImageFromBuffer(wsio, data) {
	appLoader.loadImageFromDataBuffer(data.src, data.width, data.height,
		data.mime, "", data.url, data.title, {},
		function(appInstance) {
			// Get the drop position and convert it to wall coordinates
			var position = data.position || [0, 0];
			if (position[0] > 1) {
				// value in pixels, used as origin
				appInstance.left = position[0];
			} else {
				// value in percent
				position[0] = Math.round(position[0] * config.totalWidth);
				// Use the position as center of drop location
				appInstance.left = position[0] - appInstance.width / 2;
				if (appInstance.left < 0) {
					appInstance.left = 0;
				}
			}
			if (position[1] > 1) {
				// value in pixels, used as origin
				appInstance.top = position[1];
			} else {
				// value in percent
				position[1] = Math.round(position[1] * config.totalHeight);
				// Use the position as center of drop location
				appInstance.top  = position[1] - appInstance.height / 2;
				if (appInstance.top < 0) {
					appInstance.top = 0;
				}
			}

			appInstance.id = getUniqueAppId();

			handleNewApplication(appInstance, null);

			addEventToUserLog(data.user, {type: "openFile", data:
				{name: data.filename, application: {id: appInstance.id, type: appInstance.application}}, time: Date.now()});
		});
}

function wsLoadFileFromServer(wsio, data) {
	if (data.application === "load_session") {
		// if it's a session, then load it
		loadSession(data.filename);

		addEventToUserLog(wsio.id, {type: "openFile", data: {name: data.filename,
			application: {id: null, type: "session"}}, time: Date.now()});
	} else {
		appLoader.loadFileFromLocalStorage(data, function(appInstance, videohandle) {
			// Get the drop position and convert it to wall coordinates
			var position = data.position || [0, 0];
			if (position[0] > 1) {
				// value in pixels, used as origin
				appInstance.left = position[0];
			} else {
				// value in percent
				position[0] = Math.round(position[0] * config.totalWidth);
				// Use the position as center of drop location
				appInstance.left = position[0] - appInstance.width / 2;
				if (appInstance.left < 0) {
					appInstance.left = 0;
				}
			}
			if (position[1] > 1) {
				// value in pixels, used as origin
				appInstance.top = position[1];
			} else {
				// value in percent
				position[1] = Math.round(position[1] * config.totalHeight);
				// Use the position as center of drop location
				appInstance.top  = position[1] - appInstance.height / 2;
				if (appInstance.top < 0) {
					appInstance.top = 0;
				}
			}

			appInstance.id = getUniqueAppId();

			// Add the application in the list of renderSync if needed
			if (appInstance.animation) {
				var i;
				SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
				for (i = 0; i < clients.length; i++) {
					if (clients[i].clientType === "display") {
						SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {
							wsio: clients[i], readyForNextFrame: false, blocklist: []
						};
					}
				}
			}

			handleNewApplication(appInstance, videohandle);

			addEventToUserLog(data.user, {type: "openFile", data:
				{name: data.filename, application: {id: appInstance.id, type: appInstance.application}}, time: Date.now()});
		});
	}
}

function initializeLoadedVideo(appInstance, videohandle) {
	if (appInstance.application !== "movie_player" || videohandle === null) {
		return;
	}

	var i;
	var horizontalBlocks = Math.ceil(appInstance.native_width / mediaBlockSize);
	var verticalBlocks = Math.ceil(appInstance.native_height / mediaBlockSize);
	var videoBuffer = new Array(horizontalBlocks * verticalBlocks);

	videohandle.on('error', function(err) {
		console.log("VIDEO ERROR: " + err);
	});
	videohandle.on('start', function() {
		broadcast('videoPlaying', {id: appInstance.id});
	});
	videohandle.on('end', function() {
		broadcast('videoEnded', {id: appInstance.id});
		if (SAGE2Items.renderSync[appInstance.id].loop === true) {
			SAGE2Items.renderSync[appInstance.id].decoder.seek(0.0, function() {
				SAGE2Items.renderSync[appInstance.id].decoder.play();
			});
			broadcast('updateVideoItemTime', {id: appInstance.id, timestamp: 0.0, play: false});
		}
	});
	videohandle.on('frame', function(frameIdx, buffer) {
		SAGE2Items.renderSync[appInstance.id].frameIdx = frameIdx;
		var blockBuffers = pixelblock.yuv420ToPixelBlocks(buffer,
			appInstance.data.width, appInstance.data.height, mediaBlockSize);

		var idBuffer = Buffer.concat([new Buffer(appInstance.id), new Buffer([0])]);
		var frameIdxBuffer = intToByteBuffer(frameIdx,   4);
		var dateBuffer = intToByteBuffer(Date.now(), 8);
		for (i = 0; i < blockBuffers.length; i++) {
			var blockIdxBuffer = intToByteBuffer(i, 2);
			SAGE2Items.renderSync[appInstance.id].pixelbuffer[i] = Buffer.concat([idBuffer, blockIdxBuffer,
				frameIdxBuffer, dateBuffer, blockBuffers[i]]);
		}

		handleNewVideoFrame(appInstance.id);
	});

	SAGE2Items.renderSync[appInstance.id] = {decoder: videohandle, frameIdx: null, loop: false,
		pixelbuffer: videoBuffer, newFrameGenerated: false, clients: {}};
	for (i = 0; i < clients.length; i++) {
		if (clients[i].clientType === "display") {
			SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {
				wsio: clients[i], readyForNextFrame: false, blocklist: []
			};
		}
	}

	calculateValidBlocks(appInstance, mediaBlockSize, SAGE2Items.renderSync[appInstance.id]);

	// initialize based on state
	SAGE2Items.renderSync[appInstance.id].loop = appInstance.data.looped;
	if (appInstance.data.frame !== 0) {
		var ts = appInstance.data.frame / appInstance.data.framerate;
		SAGE2Items.renderSync[appInstance.id].decoder.seek(ts, function() {
			if (appInstance.data.paused === false) {
				SAGE2Items.renderSync[appInstance.id].decoder.play();
			}
		});
		broadcast('updateVideoItemTime', {id: appInstance.id, timestamp: ts, play: false});
	} else {
		if (appInstance.data.paused === false) {
			SAGE2Items.renderSync[appInstance.id].decoder.play();
		}
	}
	if (appInstance.data.muted === true) {
		broadcast('videoMuted', {id: appInstance.id});
	}
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
		for (i = 0; i < videohandle.pixelbuffer.length; i++) {
			if (videohandle.clients[key].blocklist.indexOf(i) >= 0) {
				hasBlock = true;
				videohandle.clients[key].wsio.emit('updateVideoFrame', videohandle.pixelbuffer[i]);
			}
		}
		if (hasBlock === true) {
			videohandle.clients[key].readyForNextFrame = false;
		}
	}
}

// move this function elsewhere
function calculateValidBlocks(app, blockSize, renderhandle) {
	if (app.application !== "movie_player" && app.application !== "media_block_stream") {
		return;
	}

	var i;
	var j;
	var key;

	var portalX = 0;
	var portalY = 0;
	var portalScale = 1;
	var titleBarHeight = config.ui.titleBarHeight;
	var portal = findApplicationPortal(app);
	if (portal !== undefined && portal !== null) {
		portalX = portal.data.left;
		portalY = portal.data.top;
		portalScale = portal.data.scale;
		titleBarHeight = portal.data.titleBarHeight;
	}

	var horizontalBlocks = Math.ceil(app.data.width / blockSize);
	var verticalBlocks   = Math.ceil(app.data.height / blockSize);

	var renderBlockWidth  = (blockSize * app.width / app.data.width) * portalScale;
	var renderBlockHeight = (blockSize * app.height / app.data.height) * portalScale;

	for (key in renderhandle.clients) {
		renderhandle.clients[key].blocklist = [];
		for (i = 0; i < verticalBlocks; i++) {
			for (j = 0; j < horizontalBlocks; j++) {
				var blockIdx = i * horizontalBlocks + j;

				if (renderhandle.clients[key].wsio.clientID < 0) {
					renderhandle.clients[key].blocklist.push(blockIdx);
				} else {
					var display = config.displays[renderhandle.clients[key].wsio.clientID];
					var left = j * renderBlockWidth  + (app.left * portalScale + portalX);
					var top  = i * renderBlockHeight + ((app.top + titleBarHeight) * portalScale + portalY);
					var offsetX = config.resolution.width  * display.column;
					var offsetY = config.resolution.height * display.row;

					if ((left + renderBlockWidth) >= offsetX &&
						left <= (offsetX + config.resolution.width * display.width) &&
						(top + renderBlockHeight) >= offsetY &&
						top  <= (offsetY + config.resolution.height * display.height)) {
						renderhandle.clients[key].blocklist.push(blockIdx);
					}
				}
			}
		}
		renderhandle.clients[key].wsio.emit('updateValidStreamBlocks', {
			id: app.id, blockList: renderhandle.clients[key].blocklist
		});
	}
}

function wsDeleteElementFromStoredFiles(wsio, data) {
	if (data.application === "sage2/session") {
		// if it's a session
		deleteSession(data.filename, function() {
			// send the update file list
			broadcast('storedFileList', getSavedFilesList());
		});
	} else {
		assets.deleteAsset(data.filename, function(err) {
			if (!err) {
				// send the update file list
				broadcast('storedFileList', getSavedFilesList());
			}
		});
	}
}

function wsMoveElementFromStoredFiles(wsio, data) {
	var destinationURL = data.url;
	var destinationFile;

	// calculate the new destination filename
	for (var folder in mediaFolders) {
		var f = mediaFolders[folder];
		if (destinationURL.indexOf(f.url) === 0) {
			var splits = destinationURL.split(f.url);
			var subdir = splits[1];
			destinationFile = path.join(f.path, subdir, path.basename(data.filename));
		}
	}

	// Do the move and reprocess the asset
	if (destinationFile) {
		assets.moveAsset(data.filename, destinationFile, function(err) {
			if (err) {
				sageutils.log('Assets', 'Error moving', data.filename);
			} else {
				// if all good, send the new list of files
				// wsRequestStoredFiles(wsio);
				// send the update file list
				broadcast('storedFileList', getSavedFilesList());
			}
		});
	}
}


// **************  Adding Web Content (URL) *****************

function wsAddNewWebElement(wsio, data) {
	appLoader.loadFileFromWebURL(data, function(appInstance, videohandle) {
		// Update the file list for the UI clients
		broadcast('storedFileList', getSavedFilesList());

		// Get the drop position and convert it to wall coordinates
		var position = data.position || [0, 0];
		position[0] = Math.round(position[0] * config.totalWidth);
		position[1] = Math.round(position[1] * config.totalHeight);

		// Use the position from the drop location
		if (position[0] !== 0 || position[1] !== 0) {
			appInstance.left = position[0] - appInstance.width / 2;
			if (appInstance.left < 0) {
				appInstance.left = 0;
			}
			appInstance.top  = position[1] - appInstance.height / 2;
			if (appInstance.top < 0) {
				appInstance.top = 0;
			}
		}

		appInstance.id = getUniqueAppId();
		handleNewApplication(appInstance, videohandle);

		if (appInstance.animation) {
			var i;
			SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
			for (i = 0; i < clients.length; i++) {
				if (clients[i].clientType === "display") {
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {
						wsio: clients[i], readyForNextFrame: false, blocklist: []
					};
				}
			}
		}
	});
}

// **************  Folder management     *****************

function wsCreateFolder(wsio, data) {
	// Create a folder as needed
	for (var folder in mediaFolders) {
		var f = mediaFolders[folder];
		// if it starts with the sage root
		if (data.root.indexOf(f.url) === 0) {
			var subdir = data.root.split(f.url)[1];
			var toCreate = path.join(f.path, subdir, data.path);
			if (!sageutils.folderExists(toCreate)) {
				sageutils.mkdirParent(toCreate);
				sageutils.log("Folders", toCreate, 'created');
			}
		}
	}
}


// **************  Command line          *****************

function wsCommand(wsio, data) {
	// send the command to the REPL interpreter
	processInputCommand(data);
}

// **************  Launching Web Browser *****************

function wsOpenNewWebpage(wsio, data) {
	sageutils.log('Webview', "opening", data.url);

	wsLoadApplication(null, {
		application: "/uploads/apps/Webview",
		user: wsio.id,
		// pass the url in the data object
		data: data,
		position: [0, 0]
	});

	// Check if the web-browser is connected
	if (webBrowserClient !== null) {
		// then emit the command
		console.log("Browser> new page", data.url);
		webBrowserClient.emit('openWebBrowser', {url: data.url});
	}
}

// **************  Volume sync  ********************

function wsSetVolume(wsio, data) {
	if (SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) {
		return;
	}

	broadcast('setVolume', data);
}

// **************  Video / Audio Synchonization *****************

function wsPlayVideo(wsio, data) {
	if (SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) {
		return;
	}

	SAGE2Items.renderSync[data.id].decoder.play();
}

function wsPauseVideo(wsio, data) {
	if (SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) {
		return;
	}

	SAGE2Items.renderSync[data.id].decoder.pause(function() {
		broadcast('videoPaused', {id: data.id});
	});
}

function wsStopVideo(wsio, data) {
	if (SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) {
		return;
	}

	SAGE2Items.renderSync[data.id].decoder.stop(function() {
		broadcast('videoPaused', {id: data.id});
		broadcast('updateVideoItemTime', {id: data.id, timestamp: 0.0, play: false});
		broadcast('updateFrameIndex', {id: data.id, frameIdx: 0});
	});
}

function wsUpdateVideoTime(wsio, data) {
	if (SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) {
		return;
	}

	SAGE2Items.renderSync[data.id].decoder.seek(data.timestamp, function() {
		if (data.play === true) {
			SAGE2Items.renderSync[data.id].decoder.play();
		}
	});
	broadcast('updateVideoItemTime', data);
}

function wsMuteVideo(wsio, data) {
	if (SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) {
		return;
	}

	broadcast('videoMuted', {id: data.id});
}

function wsUnmuteVideo(wsio, data) {
	if (SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) {
		return;
	}

	broadcast('videoUnmuted', {id: data.id});
}

function wsLoopVideo(wsio, data) {
	if (SAGE2Items.renderSync[data.id] === undefined || SAGE2Items.renderSync[data.id] === null) {
		return;
	}

	SAGE2Items.renderSync[data.id].loop = data.loop;
}

// **************  Remote Server Content *****************

function wsAddNewElementFromRemoteServer(wsio, data) {
	console.log("add element from remote server");
	var i;

	appLoader.loadApplicationFromRemoteServer(data, function(appInstance, videohandle) {
		console.log("Remote App: " + appInstance.title + " (" + appInstance.application + ")");
		if (appInstance.application === "media_stream" || appInstance.application === "media_block_stream") {
			appInstance.id = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port + "|" + appInstance.id;
			SAGE2Items.renderSync[appInstance.id] = {chunks: [], clients: {}};
			for (i = 0; i < clients.length; i++) {
				if (clients[i].clientType === "display") {
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {
						wsio: clients[i], readyForNextFrame: false, blocklist: []
					};
				}
			}
		} else {
			appInstance.id = getUniqueAppId();
		}

		sageutils.mergeObjects(data.data, appInstance.data, ['video_url', 'video_type', 'audio_url', 'audio_type']);

		handleNewApplication(appInstance, videohandle);

		if (appInstance.animation) {
			SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
			for (i = 0; i < clients.length; i++) {
				if (clients[i].clientType === "display") {
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {
						wsio: clients[i], readyForNextFrame: false, blocklist: []
					};
				}
			}
		}
	});
}

function wsAddNewSharedElementFromRemoteServer(wsio, data) {
	var i;

	appLoader.loadApplicationFromRemoteServer(data.application, function(appInstance, videohandle) {
		sageutils.log("Remote App", appInstance.title + " (" + appInstance.application + ")");

		if (appInstance.application === "media_stream" || appInstance.application === "media_block_stream") {
			appInstance.id = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port + "|" + data.id;
			SAGE2Items.renderSync[appInstance.id] = {chunks: [], clients: {}};
			for (i = 0; i < clients.length; i++) {
				if (clients[i].clientType === "display") {
					sageutils.log("Remote App", "render client", clients[i].id);
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {
						wsio: clients[i], readyForNextFrame: false, blocklist: []
					};
				}
			}
		} else {
			appInstance.id = data.id;
		}

		sageutils.mergeObjects(data.application.data, appInstance.data, ['video_url', 'video_type', 'audio_url', 'audio_type']);

		handleNewApplication(appInstance, videohandle);

		if (appInstance.animation) {
			SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
			for (i = 0; i < clients.length; i++) {
				if (clients[i].clientType === "display") {
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {
						wsio: clients[i], readyForNextFrame: false, blocklist: []
					};
				}
			}
		}

		sharedApps[appInstance.id] = [{wsio: wsio, sharedId: data.remoteAppId}];

		SAGE2Items.applications.editButtonVisibilityOnItem(appInstance.id, "syncButton", true);
		broadcast('setAppSharingFlag', {id: appInstance.id, sharing: true});
	});
}

function wsRequestNextRemoteFrame(wsio, data) {
	var originId;
	var portalCloneIdx = data.id.indexOf("_");
	if (portalCloneIdx >= 0) {
		originId = data.id.substring(0, portalCloneIdx);
	} else {
		originId = data.id;
	}
	var remote_id = config.host + ":" + config.secure_port + "|" + data.id;

	if (SAGE2Items.applications.list.hasOwnProperty(originId)) {
		var stream = SAGE2Items.applications.list[originId];
		wsio.emit('updateRemoteMediaStreamFrame', {id: remote_id, state: stream.data});
	} else {
		wsio.emit('stopMediaStream', {id: remote_id});
	}
}

function wsUpdateRemoteMediaStreamFrame(wsio, data) {
	if (!SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		return;
	}

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
	if (allTrueDict(SAGE2Items.renderSync[data.id].clients, "readyForNextFrame")) {
		var i;
		var mediaStreamData = data.id.substring(6).split("|");
		var sender = {wsio: null, serverId: mediaStreamData[0], clientId: mediaStreamData[1], streamId: null};
		for (i = 0; i < clients.length; i++) {
			if (clients[i].id === sender.serverId) {
				sender.wsio = clients[i];
				break;
			}
		}
		if (sender.wsio !== null) {
			sender.wsio.emit('requestNextRemoteFrame', {id: sender.clientId});
		}
	}
}

// XXX - Remote block streaming not tested
function wsRequestNextRemoteBlockFrame(wsio, data) {
	var remote_id = config.host + ":" + config.secure_port + "|" + data.id;
	if (SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		var stream = SAGE2Items.applications.list[data.id];
		wsio.emit('updateRemoteMediaBlockStreamFrame', {id: remote_id, state: stream.data});
	} else {
		wsio.emit('stopMediaBlockStream', {id: remote_id});
	}
}

function wsUpdateRemoteMediaBlockStreamFrame(wsio, data) {
	if (!SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		return;
	}

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
	if (allTrueDict(SAGE2Items.renderSync[data.id].clients, "readyForNextFrame")) {
		var i;
		var mediaBlockStreamData = data.id.substring(6).split("|");
		var sender = {wsio: null, serverId: mediaBlockStreamData[0], clientId: mediaBlockStreamData[1], streamId: null};
		for (i = 0; i < clients.length; i++) {
			if (clients[i].id === sender.serverId) {
				sender.wsio = clients[i];
				break;
			}
		}
		if (sender.wsio !== null) {
			sender.wsio.emit('requestNextRemoteFrame', {id: sender.clientId});
		}
	}
}

function wsRequestDataSharingSession(wsio, data) {
	var known_site = findRemoteSiteByConnection(wsio);
	if (known_site !== null) {
		data.config.name = known_site.name;
	}
	if (data.config.name === undefined || data.config.name === null) {
		data.config.name = "Unknown";
	}

	console.log("Data-sharing request from " + data.config.name + " (" + data.config.host + ":" + data.config.secure_port + ")");
	broadcast('requestedDataSharingSession', {name: data.config.name, host: data.config.host, port: data.config.port});
	// remoteSharingRequestDialog = {wsio: wsio, config: data.config};
	showRequestDialog(true);
}

function wsCancelDataSharingSession(wsio, data) {
	console.log("Data-sharing request cancelled");
	broadcast('closeRequestDataSharingDialog', null, 'requiresFullApps');
	// remoteSharingRequestDialog = null;
	showRequestDialog(false);
}

function wsAcceptDataSharingSession(wsio, data) {
	var myMin = Math.min(config.totalWidth, config.totalHeight - config.ui.titleBarHeight);
	var sharingScale = (0.9 * myMin) / Math.min(data.width, data.height);
	console.log("Data-sharing request accepted: " + data.width + "x" + data.height + ", scale: " + sharingScale);
	broadcast('closeDataSharingWaitDialog', null);
	createNewDataSharingSession(remoteSharingWaitDialog.name, remoteSharingWaitDialog.wsio.remoteAddress.address,
		remoteSharingWaitDialog.wsio.remoteAddress.port, remoteSharingWaitDialog.wsio,
		new Date(data.date), data.width, data.height, sharingScale, data.titleBarHeight, true);
	remoteSharingWaitDialog = null;
	showWaitDialog(false);
}

function wsRejectDataSharingSession(wsio, data) {
	console.log("Data-sharing request rejected");
	broadcast('closeDataSharingWaitDialog', null, 'requiresFullApps');
	remoteSharingWaitDialog = null;
	showWaitDialog(false);
}

function wsCreateRemoteSagePointer(wsio, data) {
	var key;
	var portalId = null;
	for (key in remoteSharingSessions) {
		if (remoteSharingSessions[key].portal.host === data.portal.host &&
			remoteSharingSessions[key].portal.port === data.portal.port) {
			portalId = key;
		}
	}
	createSagePointer(data.id, portalId);
}

function wsStartRemoteSagePointer(wsio, data) {
	sagePointers[data.id].left = data.left;
	sagePointers[data.id].top  = data.top;

	showPointer(data.id, data);
}

function wsStopRemoteSagePointer(wsio, data) {
	hidePointer(data.id, data);

	// return to window interaction mode after stopping pointer
	if (remoteInteraction[data.id].appInteractionMode()) {
		remoteInteraction[data.id].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[data.id].id, mode: remoteInteraction[data.id].interactionMode });
	}
}

function wsRecordInnerGeometryForWidget(wsio, data) {
	// var center = data.innerGeometry.center;
	var buttons = data.innerGeometry.buttons;
	var textInputs = data.innerGeometry.textInputs;
	var sliders = data.innerGeometry.sliders;
	var radioButtons = data.innerGeometry.radioButtons;

	// SAGE2Items.widgets.addButtonToItem(data.instanceID, "center", "circle", {x:center.x, y: center.y, r:center.r}, 0);
	var i;
	for (i = 0; i < buttons.length; i++) {
		SAGE2Items.widgets.addButtonToItem(data.instanceID, buttons[i].id, "circle",
			{x: buttons[i].x, y: buttons[i].y, r: buttons[i].r}, 0);
	}
	for (i = 0; i < textInputs.length; i++) {
		SAGE2Items.widgets.addButtonToItem(data.instanceID, textInputs[i].id, "rectangle",
			{x: textInputs[i].x, y: textInputs[i].y, w: textInputs[i].w, h: textInputs[i].h}, 0);

	}
	for (i = 0; i < sliders.length; i++) {
		SAGE2Items.widgets.addButtonToItem(data.instanceID, sliders[i].id, "rectangle",
			{x: sliders[i].x, y: sliders[i].y, w: sliders[i].w, h: sliders[i].h}, 0);
	}
	for (i = 0; i < radioButtons.length; i++) {
		var radioOptions = radioButtons[i];
		for (var j = 0; j < radioOptions.length; j++) {
			SAGE2Items.widgets.addButtonToItem(data.instanceID, radioOptions[j].id, "circle",
				{x: radioOptions[j].x, y: radioOptions[j].y, r: radioOptions[j].r}, 0);
		}
	}
}

function wsCreateAppClone(wsio, data) {
	var app = SAGE2Items.applications.list[data.id];

	createAppFromDescription(app, function(appInstance, videohandle) {
		appInstance.id = getUniqueAppId();
		if (appInstance.animation) {
			var i;
			SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
			for (i = 0; i < clients.length; i++) {
				if (clients[i].clientType === "display") {
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {
						wsio: clients[i], readyForNextFrame: false, blocklist: []
					};
				}
			}
		}

		handleNewApplication(appInstance, videohandle);
	});
}

function wsRemoteSagePointerPosition(wsio, data) {
	if (sagePointers[data.id] === undefined) {
		return;
	}

	sagePointers[data.id].left = data.left;
	sagePointers[data.id].top = data.top;

	broadcast('updateSagePointerPosition', sagePointers[data.id]);
}

function wsRemoteSagePointerToggleModes(wsio, data) {
	// remoteInteraction[data.id].toggleModes();
	remoteInteraction[data.id].interactionMode = data.mode;
	broadcast('changeSagePointerMode', {id: sagePointers[data.id].id, mode: remoteInteraction[data.id].interactionMode});
}

function wsRemoteSagePointerHoverCorner(wsio, data) {
	var appId = data.appHoverCorner.elemId;
	var app = null;
	if (SAGE2Items.applications.list.hasOwnProperty(appId)) {
		app = SAGE2Items.applications.list[appId];
	} else if (SAGE2Items.applications.list.hasOwnProperty(wsio.id + "|" + appId)) {
		data.appHoverCorner.elemId = wsio.id + "|" + appId;
		appId = data.appHoverCorner.elemId;
		app = SAGE2Items.applications.list[appId];
	}
	if (app === undefined || app === null) {
		return;
	}

	broadcast('hoverOverItemCorner', data.appHoverCorner);
}

function wsAddNewRemoteElementInDataSharingPortal(wsio, data) {
	var key;
	var remote = null;
	for (key in remoteSharingSessions) {
		if (remoteSharingSessions[key].wsio.id === wsio.id) {
			remote = remoteSharingSessions[key];
			break;
		}
	}
	console.log("adding element from remote server:");
	if (remote !== null) {
		createAppFromDescription(data, function(appInstance, videohandle) {
			if (appInstance.application === "media_stream" || appInstance.application === "media_block_stream") {
				appInstance.id = wsio.remoteAddress.address + ":" + wsio.remoteAddress.port + "|" + data.id;
			} else {
				appInstance.id = data.id;
			}
			appInstance.left = data.left;
			appInstance.top = data.top;
			appInstance.width = data.width;
			appInstance.height = data.height;

			remoteSharingSessions[remote.portal.id].appCount++;

			var i;
			SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
			for (i = 0; i < clients.length; i++) {
				if (clients[i].clientType === "display") {
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {
						wsio: clients[i], readyForNextFrame: false, blocklist: []
					};
				}
			}
			handleNewApplicationInDataSharingPortal(appInstance, videohandle, remote.portal.id);
		});
	}
}

function wsUpdateApplicationOrder(wsio, data) {
	// should check timestamp first (data.date)
	broadcast('updateItemOrder', data.order);
}

function wsStartApplicationMove(wsio, data) {
	// should check timestamp first (data.date)
	var app = null;
	if (SAGE2Items.applications.list.hasOwnProperty(data.appId)) {
		app = SAGE2Items.applications.list[data.appId];
	} else if (SAGE2Items.applications.list.hasOwnProperty(wsio.id + "|" + data.appId)) {
		data.appId = wsio.id + "|" + data.appId;
		app = SAGE2Items.applications.list[data.appId];
	}
	if (app === undefined || app === null) {
		return;
	}

	broadcast('startMove', {id: data.appId, date: Date.now()});

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
	addEventToUserLog(data.id, {type: "windowManagement", data: eLogData, time: Date.now()});
}

function wsStartApplicationResize(wsio, data) {
	// should check timestamp first (data.date)
	var app = null;
	if (SAGE2Items.applications.list.hasOwnProperty(data.appId)) {
		app = SAGE2Items.applications.list[data.appId];
	} else if (SAGE2Items.applications.list.hasOwnProperty(wsio.id + "|" + data.appId)) {
		data.appId = wsio.id + "|" + data.appId;
		app = SAGE2Items.applications.list[data.appId];
	}
	if (app === undefined || app === null) {
		return;
	}

	broadcast('startResize', {id: data.appId, date: Date.now()});

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
	addEventToUserLog(data.id, {type: "windowManagement", data: eLogData, time: Date.now()});
}

function wsUpdateApplicationPosition(wsio, data) {
	// should check timestamp first (data.date)
	var appId = data.appPositionAndSize.elemId;
	var app = null;
	if (SAGE2Items.applications.list.hasOwnProperty(appId)) {
		app = SAGE2Items.applications.list[appId];
	} else if (SAGE2Items.applications.list.hasOwnProperty(wsio.id + "|" + appId)) {
		data.appPositionAndSize.elemId = wsio.id + "|" + appId;
		appId = data.appPositionAndSize.elemId;
		app = SAGE2Items.applications.list[appId];
	}
	if (app === undefined || app === null) {
		return;
	}

	var titleBarHeight = config.ui.titleBarHeight;
	if (data.portalId !== undefined && data.portalId !== null) {
		titleBarHeight = remoteSharingSessions[data.portalId].portal.titleBarHeight;
	}
	app.left = data.appPositionAndSize.elemLeft;
	app.top = data.appPositionAndSize.elemTop;
	app.width = data.appPositionAndSize.elemWidth;
	app.height = data.appPositionAndSize.elemHeight;
	var im = findInteractableManager(data.appPositionAndSize.elemId);
	im.editGeometry(app.id, "applications", "rectangle", {x: app.left, y: app.top, w: app.width, h: app.height + titleBarHeight});
	broadcast('setItemPosition', data.appPositionAndSize);
	if (SAGE2Items.renderSync.hasOwnProperty(app.id)) {
		calculateValidBlocks(app, mediaBlockSize, SAGE2Items.renderSync[app.id]);
		if (app.id in SAGE2Items.renderSync && SAGE2Items.renderSync[app.id].newFrameGenerated === false) {
			handleNewVideoFrame(app.id);
		}
	}
}

function wsUpdateApplicationPositionAndSize(wsio, data) {
	// should check timestamp first (data.date)
	var appId = data.appPositionAndSize.elemId;
	var app = null;
	if (SAGE2Items.applications.list.hasOwnProperty(appId)) {
		app = SAGE2Items.applications.list[appId];
	} else if (SAGE2Items.applications.list.hasOwnProperty(wsio.id + "|" + appId)) {
		data.appPositionAndSize.elemId = wsio.id + "|" + appId;
		appId = data.appPositionAndSize.elemId;
		app = SAGE2Items.applications.list[appId];
	}
	if (app === undefined || app === null) {
		return;
	}

	var titleBarHeight = config.ui.titleBarHeight;
	if (data.portalId !== undefined && data.portalId !== null) {
		titleBarHeight = remoteSharingSessions[data.portalId].portal.titleBarHeight;
	}
	app.left = data.appPositionAndSize.elemLeft;
	app.top = data.appPositionAndSize.elemTop;
	app.width = data.appPositionAndSize.elemWidth;
	app.height = data.appPositionAndSize.elemHeight;
	var im = findInteractableManager(data.appPositionAndSize.elemId);
	im.editGeometry(app.id, "applications", "rectangle", {x: app.left, y: app.top, w: app.width, h: app.height + titleBarHeight});
	handleApplicationResize(app.id);
	broadcast('setItemPositionAndSize', data.appPositionAndSize);
	if (SAGE2Items.renderSync.hasOwnProperty(app.id)) {
		calculateValidBlocks(app, mediaBlockSize, SAGE2Items.renderSync[app.id]);
		if (app.id in SAGE2Items.renderSync && SAGE2Items.renderSync[app.id].newFrameGenerated === false) {
			handleNewVideoFrame(app.id);
		}
	}
}

function wsFinishApplicationMove(wsio, data) {
	// should check timestamp first (data.date)
	var app = null;
	if (SAGE2Items.applications.list.hasOwnProperty(data.appId)) {
		app = SAGE2Items.applications.list[data.appId];
	} else if (SAGE2Items.applications.list.hasOwnProperty(wsio.id + "|" + data.appId)) {
		data.appId = wsio.id + "|" + data.appId;
		app = SAGE2Items.applications.list[data.appId];
	}
	if (app === undefined || app === null) {
		return;
	}

	broadcast('finishedMove', {id: data.appId, date: Date.now()});

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
	addEventToUserLog(data.id, {type: "windowManagement", data: eLogData, time: Date.now()});
}

function wsFinishApplicationResize(wsio, data) {
	// should check timestamp first (data.date)
	var app = null;
	if (SAGE2Items.applications.list.hasOwnProperty(data.appId)) {
		app = SAGE2Items.applications.list[data.appId];
	} else if (SAGE2Items.applications.list.hasOwnProperty(wsio.id + "|" + data.appId)) {
		data.appId = wsio.id + "|" + data.appId;
		app = SAGE2Items.applications.list[data.appId];
	}
	if (app === undefined || app === null) {
		return;
	}

	broadcast('finishedResize', {id: data.appId, date: Date.now()});

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
	addEventToUserLog(data.id, {type: "windowManagement", data: eLogData, time: Date.now()});
}

function wsDeleteApplication(wsio, data) {
	deleteApplication(data.appId);

	// Is that diffent ?
	// if (SAGE2Items.applications.list.hasOwnProperty(data.appId)) {
	// 	SAGE2Items.applications.removeItem(data.appId);
	// 	var im = findInteractableManager(data.appId);
	// 	im.removeGeometry(data.appId, "applications");
	// 	broadcast('deleteElement', {elemId: data.appId});
	// }
}

function wsUpdateApplicationState(wsio, data) {
	// should check timestamp first (data.date)
	if (SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		var app = SAGE2Items.applications.list[data.id];

		// hang on to old values if movie player
		var oldTs;
		var oldPaused;
		var oldMuted;
		if (app.application === "movie_player") {
			oldTs = app.data.frame / app.data.framerate;
			oldPaused = app.data.paused;
			oldMuted = app.data.muted;
		}

		var modified = sageutils.mergeObjects(data.state, app.data,
			['doc_url', 'video_url', 'video_type', 'audio_url', 'audio_type']);
		if (modified === true) {
			// update video demuxer based on state
			if (app.application === "movie_player") {
				console.log("received state from remote site:", data.state);

				SAGE2Items.renderSync[app.id].loop = app.data.looped;

				var ts = app.data.frame / app.data.framerate;
				if (app.data.paused === true && ts !== oldTs) {
					SAGE2Items.renderSync[app.id].decoder.seek(ts, function() {
						// do nothing
					});
					broadcast('updateVideoItemTime', {id: app.id, timestamp: ts, play: false});
				} else {
					if (app.data.paused === true && oldPaused === false) {
						SAGE2Items.renderSync[app.id].decoder.pause(function() {
							broadcast('videoPaused', {id: app.id});
						});
					}
					if (app.data.paused === false && oldPaused === true) {
						SAGE2Items.renderSync[app.id].decoder.play();
					}
				}
				if (app.data.muted === true && oldMuted === false) {
					broadcast('videoMuted', {id: app.id});
				}
				if (app.data.muted === false && oldMuted === true) {
					broadcast('videoUnmuted', {id: app.id});
				}
			}

			// for all apps - send new state to app
			broadcast('loadApplicationState', {id: app.id, state: app.data, date: Date.now()});
		}
	}
}

function wsUpdateApplicationStateOptions(wsio, data) {
	// should check timestamp first (data.date)
	if (SAGE2Items.applications.list.hasOwnProperty(data.id)) {
		broadcast('loadApplicationOptions', {id: data.id, options: data.options});
	}
}


// **************  Widget Control Messages *****************

function wsAddNewControl(wsio, data) {
	if (!SAGE2Items.applications.list.hasOwnProperty(data.appId)) {
		return;
	}
	if (SAGE2Items.widgets.list.hasOwnProperty(data.id)) {
		return;
	}

	broadcast('createControl', data);

	var zIndex = SAGE2Items.widgets.numItems;
	var radialGeometry = {
		x: data.left + (data.height / 2),
		y: data.top + (data.height / 2),
		r: data.height / 2
	};

	if (data.hasSideBar === true) {
		var shapeData = {
			radial: {
				type: "circle",
				visible: true,
				geometry: radialGeometry
			},
			sidebar: {
				type: "rectangle",
				visible: true,
				geometry: {
					x: data.left + data.height,
					y: data.top + (data.height / 2) - (data.barHeight / 2),
					w: data.width - data.height, h: data.barHeight
				}
			}
		};
		interactMgr.addComplexGeometry(data.id, "widgets", shapeData, zIndex, data);
	} else {
		interactMgr.addGeometry(data.id, "widgets", "circle", radialGeometry, true, zIndex, data);
	}
	SAGE2Items.widgets.addItem(data);
	var uniqueID = data.id.substring(data.appId.length, data.id.lastIndexOf("_"));
	var app = SAGE2Items.applications.list[data.appId];
	addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "open", application:
		{id: app.id, type: app.application}}, time: Date.now()});
}


function wsCloseAppFromControl(wsio, data) {
	deleteApplication(data.appId);
}

function wsHideWidgetFromControl(wsio, data) {
	var ctrl = SAGE2Items.widgets.list[data.instanceID];
	hideControl(ctrl);
}

function wsOpenRadialMenuFromControl(wsio, data) {
	console.log("radial menu");
	var ctrl = SAGE2Items.widgets.list[data.id];
	createRadialMenu(wsio.id, ctrl.left, ctrl.top);
}


function loadConfiguration() {
	var configFile = null;

	if (program.configuration) {
		configFile = program.configuration;
	} else {
		// Read config.txt - if exists and specifies a user defined config, then use it
		if (sageutils.fileExists("config.txt")) {
			var lines = fs.readFileSync("config.txt", 'utf8').split("\n");
			for (var i = 0; i < lines.length; i++) {
				var text = "";
				var comment = lines[i].indexOf("//");
				if (comment >= 0) {
					text = lines[i].substring(0, comment).trim();
				} else {
					text = lines[i].trim();
				}

				if (text !== "") {
					configFile = text;
					sageutils.log("SAGE2", "Found configuration file:", configFile);
					break;
				}
			}
		}
	}

	// If config.txt does not exist or does not specify any files, look for a config with the hostname
	if (configFile === null) {
		var hn  = os.hostname();
		var dot = hn.indexOf(".");
		if (dot >= 0) {
			hn = hn.substring(0, dot);
		}
		configFile = path.join("config", hn + "-cfg.json");
		if (sageutils.fileExists(configFile)) {
			sageutils.log("SAGE2", "Found configuration file:", configFile);
		} else {
			// Check in ~/Document/SAGE2_Media/config
			if (platform === "Windows") {
				configFile = path.join(mainFolder.path, "config", "defaultWin-cfg.json");
			} else {
				configFile = path.join(mainFolder.path, "config", "default-cfg.json");
			}
			// finally check in the internal folder
			if (!sageutils.fileExists(configFile)) {
				if (platform === "Windows") {
					configFile = path.join("config", "defaultWin-cfg.json");
				} else {
					configFile = path.join("config", "default-cfg.json");
				}
			}
			sageutils.log("SAGE2", "Using default configuration file:", configFile);
		}
	}

	if (!sageutils.fileExists(configFile)) {
		console.log("\n----------");
		console.log("Cannot find configuration file:", configFile);
		console.log("----------\n\n");
		process.exit(1);
	}

	// Read the specified configuration file
	var json_str   = fs.readFileSync(configFile, 'utf8');
	// Parse it using JSON5 syntax (more lax than strict JSON)
	var userConfig = json5.parse(json_str);

	// compute extra dependent parameters
	userConfig.totalWidth  = userConfig.resolution.width  * userConfig.layout.columns;
	userConfig.totalHeight = userConfig.resolution.height * userConfig.layout.rows;

	var minDim = Math.min(userConfig.totalWidth, userConfig.totalHeight);
	var maxDim = Math.max(userConfig.totalWidth, userConfig.totalHeight);

	if (userConfig.ui.titleBarHeight) {
		userConfig.ui.titleBarHeight = parseInt(userConfig.ui.titleBarHeight, 10);
	} else {
		userConfig.ui.titleBarHeight = Math.round(0.025 * minDim);
	}

	if (userConfig.ui.widgetControlSize) {
		userConfig.ui.widgetControlSize = parseInt(userConfig.ui.widgetControlSize, 10);
	} else {
		userConfig.ui.widgetControlSize = Math.round(0.020 * minDim);
	}

	if (userConfig.ui.titleTextSize) {
		userConfig.ui.titleTextSize = parseInt(userConfig.ui.titleTextSize, 10);
	} else {
		userConfig.ui.titleTextSize  = Math.round(0.015 * minDim);
	}

	if (userConfig.ui.pointerSize) {
		userConfig.ui.pointerSize = parseInt(userConfig.ui.pointerSize, 10);
	} else {
		userConfig.ui.pointerSize = Math.round(0.08 * minDim);
	}

	if (userConfig.ui.minWindowWidth) {
		userConfig.ui.minWindowWidth = parseInt(userConfig.ui.minWindowWidth, 10);
	} else {
		userConfig.ui.minWindowWidth  = Math.round(0.08 * minDim);  // 8%
	}
	if (userConfig.ui.minWindowHeight) {
		userConfig.ui.minWindowHeight = parseInt(userConfig.ui.minWindowHeight, 10);
	} else {
		userConfig.ui.minWindowHeight = Math.round(0.08 * minDim); // 8%
	}

	if (userConfig.ui.maxWindowWidth) {
		userConfig.ui.maxWindowWidth = parseInt(userConfig.ui.maxWindowWidth, 10);
	} else {
		userConfig.ui.maxWindowWidth  = Math.round(1.2 * maxDim);  // 120%
	}
	if (userConfig.ui.maxWindowHeight) {
		userConfig.ui.maxWindowHeight = parseInt(userConfig.ui.maxWindowHeight, 10);
	} else {
		userConfig.ui.maxWindowHeight = Math.round(1.2 * maxDim); // 120%
	}

	// Check the borders settings (for hidding the borders)
	if (userConfig.dimensions === undefined) {
		userConfig.dimensions = {};
	}

	// Overlapping tile dimension in pixels to allow edge blending
	// tile_overlap = { horizontal: 20, vertical: 20}
	// code provided by Larse Bilke
	// larsbilke83@gmail.com
	if (userConfig.dimensions.tile_overlap === undefined) {
		userConfig.dimensions.tile_overlap = {
			horizontal: 0,
			vertical:   0
		};
	} else {
		// Check the values
		var hoverlap = parseInt(userConfig.dimensions.tile_overlap.horizontal, 10);
		var voverlap = parseInt(userConfig.dimensions.tile_overlap.vertical,   10);
		// If negative values, converted to positives
		if (hoverlap < 0) {
			hoverlap *= -1;
		}
		if (voverlap < 0) {
			voverlap *= -1;
		}
		// Set the final values back into the configuration
		userConfig.dimensions.tile_overlap = {
			horizontal: hoverlap,
			vertical:   voverlap
		};
	}

	// Tile config Basic mode
	var aspectRatioConfig = userConfig.dimensions.aspect_ratio;
	var aspectRatio = 1.7778; // 16:9
	var userDefinedAspectRatio = false;
	if (aspectRatioConfig !== undefined) {
		var ratioParsed = aspectRatioConfig.split(":");
		aspectRatio = (parseFloat(ratioParsed[0]) / parseFloat(ratioParsed[1])) || aspectRatio;
		userDefinedAspectRatio = true;
		sageutils.log("UI", "User defined aspect ratio:", aspectRatio);
	}

	var tileHeight = 0.0;
	if (userConfig.dimensions.tile_diagonal_inches !== undefined) {
		var tile_diagonal_meters = userConfig.dimensions.tile_diagonal_inches * 0.0254;
		tileHeight = tile_diagonal_meters * aspectRatio;
	}

	if (userConfig.dimensions.tile_height) {
		tileHeight   = parseFloat(userConfig.dimensions.tile_height) || 0.0;
	}

	// calculate pixel density (ppm) based on width
	var pixelsPerMeter = userConfig.resolution.height / tileHeight;
	if (userDefinedAspectRatio == false) {
		aspectRatio = userConfig.resolution.width / userConfig.resolution.height;
		sageutils.log("UI", "Resolution defined aspect ratio:", aspectRatio.toFixed(2));
	}

	// Check the display border settings
	if (userConfig.dimensions.tile_borders === undefined) {
		// set default values to 0
		// first for pixel sizes
		userConfig.resolution.borders = { left: 0, right: 0, bottom: 0, top: 0};
		// then for dimensions
		userConfig.dimensions.tile_borders = { left: 0.0, right: 0.0, bottom: 0.0, top: 0.0};
	} else {
		var borderLeft, borderRight, borderBottom, borderTop;
		// make sure the values are valid floats
		borderLeft   = parseFloat(userConfig.dimensions.tile_borders.left)   || 0.0;
		borderRight  = parseFloat(userConfig.dimensions.tile_borders.right)  || 0.0;
		borderBottom = parseFloat(userConfig.dimensions.tile_borders.bottom) || 0.0;
		borderTop    = parseFloat(userConfig.dimensions.tile_borders.top)    || 0.0;

		// calculate values in pixel now
		userConfig.resolution.borders = {};
		userConfig.resolution.borders.left   = Math.round(pixelsPerMeter * borderLeft)   || 0;
		userConfig.resolution.borders.right  = Math.round(pixelsPerMeter * borderRight)  || 0;
		userConfig.resolution.borders.bottom = Math.round(pixelsPerMeter * borderBottom) || 0;
		userConfig.resolution.borders.top    = Math.round(pixelsPerMeter * borderTop)    || 0;
	}

	// calculate the widget control size based on dimensions and user distance
	if (userConfig.ui.auto_scale_ui && tileHeight !== undefined) {
		var objectHeightMeters = 27 / pixelsPerMeter;
		var minimumWidgetControlSize = 20; // Min button size for text readability (also for touch wall)
		var perceptualScalingFactor = 0.0213;
		var oldDefaultWidgetScale = Math.round(0.020 * minDim);
		var userDist = userConfig.dimensions.viewing_distance;
		var calcuatedWidgetControlSize = userDist * (perceptualScalingFactor * (userDist / objectHeightMeters));
		var targetVisualAcuity = 0.5; // degrees of arc

		calcuatedWidgetControlSize = Math.tan((targetVisualAcuity * Math.PI / 180.0) / 2) * 2 * userDist * pixelsPerMeter;

		if (calcuatedWidgetControlSize < minimumWidgetControlSize) {
			calcuatedWidgetControlSize = minimumWidgetControlSize;
			sageutils.log("UI", "widgetControlSize (min):", calcuatedWidgetControlSize);
		} else if (calcuatedWidgetControlSize > oldDefaultWidgetScale) {
			calcuatedWidgetControlSize = oldDefaultWidgetScale * 2;
			sageutils.log("UI", "widgetControlSize (max):", calcuatedWidgetControlSize);
		} else {
			sageutils.log("UI", "widgetControlSize:", calcuatedWidgetControlSize);
		}
		// sageutils.log("UI", "pixelsPerMeter:", pixelsPerMeter);
		userConfig.ui.widgetControlSize = calcuatedWidgetControlSize;
	}

	// Automatically populate the displays entry if undefined. Adds left to right, starting from the top.
	if (userConfig.displays === undefined || userConfig.displays.length == 0) {
		userConfig.displays = [];
		for (var r = 0; r < userConfig.layout.rows; r++) {
			for (var c = 0; c < userConfig.layout.columns; c++) {
				userConfig.displays.push({row: r, column: c});
			}
		}
	}

	// Check the width and height of each display (in tile count)
	// by default, a display covers one tile
	for (var d = 0; d < userConfig.displays.length; d++) {
		userConfig.displays[d].width  = parseInt(userConfig.displays[d].width)  || 1;
		userConfig.displays[d].height = parseInt(userConfig.displays[d].height) || 1;
	}

	// legacy support for config port names
	var http_port, https_port;
	if (userConfig.secure_port === undefined) {
		http_port = userConfig.index_port;
		https_port = userConfig.port;
		delete userConfig.index_port;
	} else {
		http_port = userConfig.port;
		https_port = userConfig.secure_port;
	}
	var rproxy_port, rproxys_port;
	if (userConfig.rproxy_secure_port === undefined) {
		rproxy_port = userConfig.rproxy_index_port;
		rproxys_port = userConfig.rproxy_port;
		delete userConfig.rproxy_index_port;
	} else {
		rproxy_port = userConfig.rproxy_port;
		rproxys_port = userConfig.rproxy_secure_port;
	}
	// Set default values if missing
	if (https_port === undefined) {
		userConfig.secure_port = 443;
	} else {
		userConfig.secure_port = parseInt(https_port, 10); // to make sure it's a number
	}
	if (http_port === undefined) {
		userConfig.port = 80;
	} else {
		userConfig.port = parseInt(http_port, 10);
	}
	userConfig.rproxy_port = parseInt(rproxy_port, 10) || undefined;
	userConfig.rproxy_secure_port = parseInt(rproxys_port, 10) || undefined;

	// Set the display clip value if missing (true by default)
	if (userConfig.background.clip !== undefined) {
		userConfig.background.clip = sageutils.isTrue(userConfig.background.clip);
	} else {
		userConfig.background.clip = true;
	}

	// Registration to EVL's server (sage.evl.uic.edu), true by default
	if (userConfig.register_site === undefined) {
		userConfig.register_site = true;
	} else {
		// test for a true value: true, on, yes, 1, ...
		if (sageutils.isTrue(userConfig.register_site)) {
			userConfig.register_site = true;
		} else {
			userConfig.register_site = false;
		}
	}

	return userConfig;
}

var getUniqueAppId = function(param) {
	// reset the counter
	if (param && param === -1) {
		getUniqueAppId.count = 0;
		return;
	}
	var id = "app_" + getUniqueAppId.count.toString();
	getUniqueAppId.count++;
	return id;
};
getUniqueAppId.count = 0;

var getNewUserId = (function() {
	var count = 0;
	return function() {
		var id = "usr_" + count.toString();
		count++;
		return id;
	};
}());

function getUniqueDataSharingId(remoteHost, remotePort, caller) {
	var id;
	if (caller === true) {
		id = config.host + ":" + config.secure_port + "+" + remoteHost + ":" + remotePort;
	} else {
		id = remoteHost + ":" + remotePort + "+" + config.host + ":" + config.secure_port;
	}
	return "portal_" + id;
}

function getUniqueSharedAppId(portalId) {
	return "app_" + remoteSharingSessions[portalId].appCount + "_" + portalId;
}

function getSavedFilesList() {
	// Get the sessions
	var savedSessions  = listSessions();
	savedSessions.sort(sageutils.compareFilename);

	// Get everything from the asset manager
	var list = assets.listAssets();
	// add the sessions
	list.sessions = savedSessions;

	return list;
}

function setupDisplayBackground() {
	var tmpImg, imgExt;

	// background image
	if (config.background.image !== undefined && config.background.image.url !== undefined) {
		var bg_file = path.join(publicDirectory, config.background.image.url);

		if (config.background.image.style === "fit") {
			exiftool.file(bg_file, function(err1, data) {
				if (err1) {
					console.log("Error processing background image:", bg_file, err1);
					console.log(" ");
					process.exit(1);
				}
				var bg_info = data;

				if (bg_info.ImageWidth === config.totalWidth && bg_info.ImageHeight === config.totalHeight) {
					sliceBackgroundImage(bg_file, bg_file);
				} else {
					tmpImg = path.join(publicDirectory, "images", "background", "tmp_background.png");
					var out_res  = config.totalWidth.toString() + "x" + config.totalHeight.toString();

					imageMagick(bg_file).noProfile().command("convert").in("-gravity", "center")
						.in("-background", "rgba(0,0,0,0)")
						.in("-extent", out_res).write(tmpImg, function(err2) {
							if (err2) {
								throw err2;
							}
							sliceBackgroundImage(tmpImg, bg_file);
						});
				}
			});
		} else if (config.background.image.style === "tile") {
			// do nothing
		} else {
			config.background.image.style = "stretch";
			imgExt = path.extname(bg_file);
			tmpImg = path.join(publicDirectory, "images", "background", "tmp_background" + imgExt);

			imageMagick(bg_file).resize(config.totalWidth, config.totalHeight, "!").write(tmpImg, function(err) {
				if (err) {
					throw err;
				}

				sliceBackgroundImage(tmpImg, bg_file);
			});
		}
	}
}

function sliceBackgroundImage(fileName, outputBaseName) {
	for (var i = 0; i < config.displays.length; i++) {
		var x = config.displays[i].column * config.resolution.width;
		var y = config.displays[i].row * config.resolution.height;
		var output_dir  = path.dirname(outputBaseName);
		var input_ext   = path.extname(outputBaseName);
		var output_ext  = path.extname(fileName);
		var output_base = path.basename(outputBaseName, input_ext);
		var output = path.join(output_dir, output_base + "_" + i.toString() + output_ext);
		imageMagick(fileName).crop(
			config.resolution.width * config.displays[i].width,
			config.resolution.height * config.displays[i].height, x, y
		).write(output, function(err) {
			if (err) {
				console.log("error slicing image", err); // throw err;
			}
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
			sageutils.log("Certificate", "Loading certificate", config.host + "-server.key");
			server_key = fs.readFileSync(path.join("keys", config.host + "-server.key"));
			server_crt = fs.readFileSync(path.join("keys", config.host + "-server.crt"));
			server_ca  = sageutils.loadCABundle(path.join("keys", config.host + "-ca.crt"));
			// Build the crypto
			certs[config.host] = sageutils.secureContext(server_key, server_crt, server_ca);
		} else {
			// remove the hostname from the FQDN and search for wildcard certificate
			//    syntax: _.rest.com.key or _.rest.bigger.com.key
			var domain = '_.' + config.host.split('.').slice(1).join('.');
			sageutils.log("Certificate", "Loading domain certificate", domain + ".key");
			server_key = fs.readFileSync(path.join("keys", domain + ".key"));
			server_crt = fs.readFileSync(path.join("keys", domain + ".crt"));
			server_ca  = sageutils.loadCABundle(path.join("keys", domain + "-ca.crt"));
			certs[config.host] = sageutils.secureContext(server_key, server_crt, server_ca);
		}
	} catch (e) {
		console.log("\n----------");
		console.log("Cannot open certificate for default host:");
		console.log(" \"" + config.host + "\" needs file: " + e.path);
		console.log(" --> Please generate the appropriate certificate in the 'keys' folder");
		console.log("----------\n\n");
		process.exit(1);
	}

	for (var h in config.alternate_hosts) {
		try {
			var alth = config.alternate_hosts[h];
			certs[ alth ] = sageutils.secureContext(
				fs.readFileSync(path.join("keys", alth + "-server.key")),
				fs.readFileSync(path.join("keys", alth + "-server.crt")),
				sageutils.loadCABundle(path.join("keys", alth + "-ca.crt"))
			);
		} catch (e) {
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
			// If true the server will request a certificate from clients that connect and attempt to verify that certificate
			requestCert: false,
			rejectUnauthorized: false,
			// callback to handle multi-homed machines
			SNICallback: function(servername) {
				if (!certs.hasOwnProperty(servername)) {
					sageutils.log("SNI", "Unknown host, cannot find a certificate for ", servername);
					return null;
				}
				return certs[servername];
			}
		};
	} else {
		httpsOptions = {
			// server default keys
			key:  server_key,
			cert: server_crt,
			ca:   server_ca,
			// If true the server will request a certificate from clients that connect and attempt to verify that certificate
			requestCert: false,
			rejectUnauthorized: false,
			honorCipherOrder: true,
			// callback to handle multi-homed machines
			SNICallback: function(servername, cb) {
				if (certs.hasOwnProperty(servername)) {
					cb(null, certs[servername]);
				} else {
					sageutils.log("SNI", "Unknown host, cannot find a certificate for ", servername);
					cb("SNI Unknown host", null);
				}
			}
		};

		// The SSL method to use, otherwise undefined
		if (config.security && config.security.secureProtocol) {
			// Possible values are defined in the constant SSL_METHODS of OpenSSL
			// Only enable TLS 1.2 for instance
			// SSLv3_method,
			// TLSv1_method, TLSv1_1_method, TLSv1_2_method
			// DTLS_method,  DTLSv1_method,  DTLSv1_2_method
			httpsOptions.secureProtocol = config.security.secureProtocol;
			sageutils.log("HTTPS", "securing with protocol:", httpsOptions.secureProtocol);
		}
	}

	return httpsOptions;
}

function sendConfig(req, res) {
	var header = HttpServer.prototype.buildHeader();
	// Set type
	header["Content-Type"] = "application/json";
	// Allow CORS on the /config route
	if (req.headers.origin !== undefined) {
		header['Access-Control-Allow-Origin' ] = req.headers.origin;
		header['Access-Control-Allow-Methods'] = "GET";
		header['Access-Control-Allow-Headers'] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
		header['Access-Control-Allow-Credentials'] = true;
	}
	res.writeHead(200, header);
	// Adding the calculated version into the data structure
	config.version = SAGE2_version;
	res.write(JSON.stringify(config));
	res.end();
}

function uploadForm(req, res) {
	var form     = new formidable.IncomingForm();
	// Drop position
	var position = [0, 0];
	// Open or not the file after upload
	var openAfter = true;
	// User information
	var ptrName  = "";
	var ptrColor = "";

	// Limits the amount of memory all fields together (except files) can allocate in bytes.
	//    set to 4MB.
	form.maxFieldsSize = 4 * 1024 * 1024;
	form.type          = 'multipart';
	form.multiples     = true;

	form.on('fileBegin', function(name, file) {
		sageutils.log("Upload", file.name, file.type);
	});

	form.on('error', function(err) {
		sageutils.log("Upload", 'Request aborted');
		try {
			// Removing the temporary file
			fs.unlinkSync(this.openedFiles[0].path);
		} catch (err) {
			sageutils.log("Upload", '   error removing the temporary file');
		}
	});

	form.on('field', function(field, value) {
		// Keep user information
		if (field === 'SAGE2_ptrName') {
			ptrName = value;
			sageutils.log("Upload", "by", ptrName);
		}
		if (field === 'SAGE2_ptrColor') {
			ptrColor = value;
			sageutils.log("Upload", "color", ptrColor);
		}
		// convert value [0 to 1] to wall coordinate from drop location
		if (field === 'dropX') {
			position[0] = parseInt(parseFloat(value) * config.totalWidth,  10);
		}
		if (field === 'dropY') {
			position[1] = parseInt(parseFloat(value) * config.totalHeight, 10);
		}
		// initial application window position
		if (field === 'width') {
			position[2] = parseInt(parseFloat(value) * config.totalWidth,  10);
		}
		if (field === 'height') {
			position[3] = parseInt(parseFloat(value) * config.totalHeight,  10);
		}
		// open or not the file after upload
		if (field === 'open') {
			openAfter = (value === "true");
		}
	});

	form.parse(req, function(err, fields, files) {
		var header = HttpServer.prototype.buildHeader();
		if (err) {
			header["Content-Type"] = "text/plain";
			res.writeHead(500, header);
			res.write(err + "\n\n");
			res.end();
			return;
		}
		// build the reply to the upload
		header["Content-Type"] = "application/json";
		res.writeHead(200, header);
		// For webix uploader: status: server
		fields.done = true;

		// Get the file (only one even if multiple drops, it comes one by one)
		var file = files[ Object.keys(files)[0] ];
		var app = registry.getDefaultApp(file.name);
		if (app === undefined || app === "") {
			fields.good = false;
		} else {
			fields.good = true;
		}
		// Send the reply
		res.end(JSON.stringify({status: 'server',
			fields: fields, files: files}));
	});

	form.on('end', function() {
		// saves files in appropriate directory and broadcasts the items to the displays
		manageUploadedFiles(this.openedFiles, position, ptrName, ptrColor, openAfter);
	});
}

function manageUploadedFiles(files, position, ptrName, ptrColor, openAfter) {
	var fileKeys = Object.keys(files);
	fileKeys.forEach(function(key) {
		var file = files[key];
		appLoader.manageAndLoadUploadedFile(file, function(appInstance, videohandle) {

			if (appInstance === null) {
				sageutils.log("Upload", 'unrecognized file type:', file.name, file.type);
				return;
			}

			// Add user information into exif data
			assets.addTag(appInstance.file, "SAGE2user",  ptrName);
			assets.addTag(appInstance.file, "SAGE2color", ptrColor);

			// contains a flag to open the file or not
			if (openAfter) {
				// Use the size from the drop information
				if (position[2] && position[2] !== 0) {
					appInstance.width = parseFloat(position[2]);
					// If no height provided, calculate it from the aspect ratio
					if (position[3] === undefined && appInstance.aspect) {
						appInstance.height = appInstance.width / appInstance.aspect;
					}
				}
				if (position[3] && position[3] !== 0) {
					appInstance.height = parseFloat(position[3]);
				}

				// Use the position from the drop information
				if (position[0] !== 0 || position[1] !== 0) {
					appInstance.left = position[0] - appInstance.width / 2;
					if (appInstance.left < 0) {
						appInstance.left = 0;
					}
					appInstance.top  = position[1] - appInstance.height / 2;
					if (appInstance.top < 0) {
						appInstance.top = 0;
					}
				}

				appInstance.id = getUniqueAppId();
				if (appInstance.animation) {
					var i;
					SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
					for (i = 0; i < clients.length; i++) {
						if (clients[i].clientType === "display") {
							SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {
								wsio: clients[i], readyForNextFrame: false, blocklist: []
							};
						}
					}
				}
				handleNewApplication(appInstance, videohandle);
			}

			// send the update file list
			broadcast('storedFileList', getSavedFilesList());
		});
	});
}


// **************  Remote Site Collaboration *****************

function initalizeRemoteSites() {
	if (config.remote_sites) {
		remoteSites = new Array(config.remote_sites.length);
		config.remote_sites.forEach(function(element, index, array) {
			// if we have a valid definition of a remote site (host, port and name)
			if (element.host && element.port && element.name) {
				var protocol = (element.secure === true) ? "wss" : "ws";
				var wsURL = protocol + "://" + element.host + ":" + element.port.toString();

				var rGeom = {};
				rGeom.w = Math.min((0.5 * config.totalWidth) / remoteSites.length, config.ui.titleBarHeight * 6)
					- (0.16 * config.ui.titleBarHeight);
				rGeom.h = 0.84 * config.ui.titleBarHeight;
				rGeom.x = (0.5 * config.totalWidth) + ((rGeom.w + (0.16 * config.ui.titleBarHeight))
					* (index - (remoteSites.length / 2))) + (0.08 * config.ui.titleBarHeight);
				rGeom.y = 0.08 * config.ui.titleBarHeight;

				// Build the object
				remoteSites[index] = {
					name: element.name,
					wsio: null,
					connected: "off",
					geometry: rGeom,
					index: index
				};
				// Create a websocket connection to the site
				remoteSites[index].wsio = createRemoteConnection(wsURL, element, index);

				// Add the gemeotry for the button
				interactMgr.addGeometry("remote_" + index, "staticUI", "rectangle", rGeom,  true, index, remoteSites[index]);

				// attempt to connect every 15 seconds, if connection failed
				setInterval(function() {
					if (remoteSites[index].connected !== "on") {
						var rem = createRemoteConnection(wsURL, element, index);
						remoteSites[index].wsio = rem;
					}
				}, 15000);
			} else {
				// not a valid site definition, we ignore it
				sageutils.log("Remote", chalk.bold.red('invalid host definition (ignored)'), element.name);
			}
		});
	}
}

function manageRemoteConnection(remote, site, index) {
	// Fix address
	remote.updateRemoteAddress(site.host, site.port);
	// Hope for the best
	remoteSites[index].connected = "on";
	// Check the password or session hash
	if (site.password) {
		// MD5 hash of the password
		site.session = md5.getHash(site.password);
	}

	var clientDescription = {
		clientType: "remoteServer",
		host: config.host,
		port: config.secure_port,
		session: site.session,
		// port: config.port,
		requests: {
			config: false,
			version: false,
			time: false,
			console: false
		}
	};
	remote.clientType = "remoteServer";

	remote.onclose(function() {
		sageutils.log("Remote", chalk.cyan(config.remote_sites[index].name), "offline");
		// it was locked, keep the state locked
		if (remoteSites[index].connected !== "locked") {
			remoteSites[index].connected = "off";
			var delete_site = {name: remoteSites[index].name, connected: remoteSites[index].connected};
			broadcast('connectedToRemoteSite', delete_site);
		}
		removeElement(clients, remote);

		try {
			updateInformationAboutConnections();
		} catch (e) {
			console.log("Error with retrieving client data");
			console.log(e);
		}
	});

	remote.on('addClient',                              wsAddClient);
	remote.on('addNewElementFromRemoteServer',          wsAddNewElementFromRemoteServer);
	remote.on('addNewSharedElementFromRemoteServer',    wsAddNewSharedElementFromRemoteServer);
	remote.on('requestNextRemoteFrame',                 wsRequestNextRemoteFrame);
	remote.on('updateRemoteMediaStreamFrame',           wsUpdateRemoteMediaStreamFrame);
	remote.on('stopMediaStream',                        wsStopMediaStream);
	remote.on('requestNextRemoteBlockFrame',            wsRequestNextRemoteBlockFrame);
	remote.on('updateRemoteMediaBlockStreamFrame',      wsUpdateRemoteMediaBlockStreamFrame);
	remote.on('stopMediaBlockStream',                   wsStopMediaBlockStream);
	remote.on('requestDataSharingSession',              wsRequestDataSharingSession);
	remote.on('cancelDataSharingSession',               wsCancelDataSharingSession);
	remote.on('acceptDataSharingSession',               wsAcceptDataSharingSession);
	remote.on('rejectDataSharingSession',               wsRejectDataSharingSession);
	remote.on('createRemoteSagePointer',                wsCreateRemoteSagePointer);
	remote.on('startRemoteSagePointer',                 wsStartRemoteSagePointer);
	remote.on('stopRemoteSagePointer',                  wsStopRemoteSagePointer);
	remote.on('remoteSagePointerPosition',              wsRemoteSagePointerPosition);
	remote.on('remoteSagePointerToggleModes',           wsRemoteSagePointerToggleModes);
	remote.on('remoteSagePointerHoverCorner',           wsRemoteSagePointerHoverCorner);
	remote.on('addNewRemoteElementInDataSharingPortal', wsAddNewRemoteElementInDataSharingPortal);

	remote.on('updateApplicationOrder',                 wsUpdateApplicationOrder);
	remote.on('startApplicationMove',                   wsStartApplicationMove);
	remote.on('startApplicationResize',                 wsStartApplicationResize);
	remote.on('updateApplicationPosition',              wsUpdateApplicationPosition);
	remote.on('updateApplicationPositionAndSize',       wsUpdateApplicationPositionAndSize);
	remote.on('finishApplicationMove',                  wsFinishApplicationMove);
	remote.on('finishApplicationResize',                wsFinishApplicationResize);
	remote.on('deleteApplication',                      wsDeleteApplication);
	remote.on('updateApplicationState',                 wsUpdateApplicationState);
	remote.on('updateApplicationStateOptions',          wsUpdateApplicationStateOptions);

	remote.emit('addClient', clientDescription);
	clients.push(remote);

	remote.on('remoteConnection', function(remotesocket, data) {
		if (data.status === "refused") {
			sageutils.log("Remote", "Connection refused to", chalk.cyan(site.name), ": " + data.reason);
			remoteSites[index].connected = "locked";
		} else {
			sageutils.log("Remote", "Connected to", chalk.cyan(site.name));
			remoteSites[index].connected = "on";
		}
		var update_site = {name: remoteSites[index].name, connected: remoteSites[index].connected};
		broadcast('connectedToRemoteSite', update_site);
	});
}


function createRemoteConnection(wsURL, element, index) {
	var remote = new WebsocketIO(wsURL, false, function() {
		manageRemoteConnection(remote, element, index);
	});

	return remote;
}

// **************  System Time - Updated Every Minute *****************
var cDate = new Date();
setTimeout(function() {
	var now;
	setInterval(function() {
		now = new Date();
		broadcast('setSystemTime', {date: now.toJSON(), offset: now.getTimezoneOffset()});
	}, 60000);

	now = new Date();
	broadcast('setSystemTime', {date: now.toJSON(), offset: now.getTimezoneOffset()});
}, (61 - cDate.getSeconds()) * 1000);


// ***************************************************************************************

// Place callback for success in the 'listen' call for HTTPS

sage2ServerS.on('listening', function(e) {
	// Success
	sageutils.log("SAGE2", chalk.bold("Serving Securely:"));
	sageutils.log("SAGE2", "- Web UI:\t " + chalk.cyan.bold.underline("https://" +
		config.host + ":" + config.secure_port));
	sageutils.log("SAGE2", "- Web console:\t " + chalk.cyan.bold.underline("https://" + config.host +
		":" + config.secure_port + "/admin/console.html"));
});

// Place callback for errors in the 'listen' call for HTTP
sage2Server.on('error', function(e) {
	if (e.code === 'EACCES') {
		sageutils.log("HTTP_Server", "You are not allowed to use the port: ", config.port);
		sageutils.log("HTTP_Server", "  use a different port or get authorization (sudo, setcap, ...)");
		process.exit(1);
	} else if (e.code === 'EADDRINUSE') {
		sageutils.log("HTTP_Server", "The port is already in use by another process:", config.port);
		sageutils.log("HTTP_Server", "  use a different port or stop the offending process");
		process.exit(1);
	} else {
		sageutils.log("HTTP_Server", "Error in the listen call: ", e.code);
		process.exit(1);
	}
});

// Place callback for success in the 'listen' call for HTTP
sage2Server.on('listening', function(e) {
	// Success
	var ui_url = chalk.cyan.bold.underline("http://" + config.host + ":" + config.port);
	var dp_url = chalk.cyan.bold.underline("http://" + config.host + ":" + config.port +
		"/display.html?clientID=0");
	var am_url = chalk.cyan.bold.underline("http://" + config.host + ":" + config.port +
		"/audioManager.html");
	if (global.__SESSION_ID) {
		ui_url = chalk.cyan.bold.underline("http://" + config.host + ":" + config.port +
			"/session.html?hash=" + global.__SESSION_ID);
		dp_url = chalk.cyan.bold.underline("http://" + config.host + ":" + config.port +
			"/session.html?page=display.html?clientID=0&hash=" + global.__SESSION_ID);
		am_url = chalk.cyan.bold.underline("http://" + config.host + ":" + config.port +
			"/session.html?page=audioManager.html&hash=" + global.__SESSION_ID);
	}

	sageutils.log("SAGE2", chalk.bold("Serving:"));
	sageutils.log("SAGE2", "- Web UI:\t"        + ui_url);
	sageutils.log("SAGE2", "- Display 0:\t"     + dp_url);
	sageutils.log("SAGE2", "- Audio mgr:\t" + am_url);
});

// KILL intercept
process.on('SIGTERM', quitSAGE2);
// CTRL-C intercept
process.on('SIGINT',  quitSAGE2);


// Start the HTTP server (listen for IPv4 addresses 0.0.0.0)
sage2Server.listen(config.port, "0.0.0.0");
// Start the HTTPS server (listen for IPv4 addresses 0.0.0.0)
sage2ServerS.listen(config.secure_port, "0.0.0.0");


// ***************************************************************************************

// Load session file if specified on the command line (-s)
if (program.session) {
	setTimeout(function() {
		// if -s specified without argument
		if (program.session === true) {
			loadSession();
		} else {
			// if argument specified
			loadSession(program.session);
		}
	}, 1000);
}

function getSAGE2Path(getName) {
	// pathname: result of the search
	var pathname = null;
	// walk through the list of folders
	for (var f in mediaFolders) {
		// Get the folder object
		var folder = mediaFolders[f];
		// Look for the folder url in the request
		var pubdir = getName.split(folder.url);
		if (pubdir.length === 2) {
			// convert the URL into a path
			var suburl = path.join('.', pubdir[1]);
			pathname   = url.resolve(folder.path, suburl);
			pathname   = decodeURIComponent(pathname);
			break;
		}
	}
	// if everything fails, look in the default public folder
	if (!pathname) {
		pathname = getName;
	}
	return pathname;
}


function processInputCommand(line) {
	// split the command line at whitespace(s)
	var command = line.trim().split(/[\s]+/);
	switch (command[0]) {
		case '': {
			// ignore
			break;
		}
		case 'help': {
			console.log('help\t\tlist commands');
			console.log('kill\t\tclose application: appid');
			console.log('apps\t\tlist running applications');
			console.log('clients\t\tlist connected clients');
			console.log('streams\t\tlist media streams');
			console.log('clear\t\tclose all running applications');
			console.log('tile\t\tlayout all running applications');
			console.log('fullscreen\tmaximize one application: appid');
			console.log('save\t\tsave state of running applications into a session');
			console.log('load\t\tload a session and restore applications');
			console.log('open\t\topen a file: open file_url [0.5, 0.5]');
			console.log('resize\t\tresize a window: appid width height');
			console.log('moveby\t\tshift a window: appid dx dy');
			console.log('moveto\t\tmove a window: appid x y');
			console.log('assets\t\tlist the assets in the file library');
			console.log('regenerate\tregenerates the assets');
			console.log('hideui\t\thide/show/delay the user interface');
			console.log('sessions\tlist the available sessions');
			console.log('screenshot\ttake a screenshot of the wall');
			console.log('update\t\trun a git update');
			console.log('performance\tshow performance information');
			console.log('perfsampling\tset performance metric sampling rate');
			console.log('hardware\tget an summary of the hardware running the server');
			console.log('update\t\trun a git update');
			console.log('version\t\tprint SAGE2 version');
			console.log('exit\t\tstop SAGE2');
			break;
		}
		case 'version': {
			sageutils.log("Version", 'base:', SAGE2_version.base, 'branch:', SAGE2_version.branch,
				'commit:', SAGE2_version.commit, SAGE2_version.date);
			break;
		}
		case 'update': {
			if (SAGE2_version.branch.length > 0) {
				sageutils.updateWithGIT(SAGE2_version.branch, function(error, success) {
					if (error) {
						sageutils.log('GIT', 'Update error -', error);
					} else {
						sageutils.log('Update success -', success);
					}
				});
			} else {
				sageutils.log("Update", "failed: not linked to any repository");
			}
			break;
		}
		case 'save': {
			if (command[1] !== undefined) {
				saveSession(command[1]);
			} else {
				saveSession();
			}
			break;
		}
		case 'load': {
			if (command[1] !== undefined) {
				loadSession(command[1]);
			} else {
				loadSession();
			}
			break;
		}
		case 'open': {
			if (command[1] !== undefined) {
				var pos  = [0.0, 0.0];
				var file = command[1];
				if (command.length === 4) {
					pos = [parseFloat(command[2]), parseFloat(command[3])];
				}
				var mt = assets.getMimeType(getSAGE2Path(file));
				if (mt === "application/custom") {
					wsLoadApplication(null, {
						application: file,
						user: "127.0.0.1:42",
						position: pos
					});
				} else {
					wsLoadFileFromServer(null, {
						application: "something",
						filename: file,
						user: "127.0.0.1:42",
						position: pos
					});
				}
			} else {
				sageutils.log("Command", "should be: open /user/file.pdf [0.5 0.5]");
			}
			break;
		}
		case 'sessions': {
			printListSessions();
			break;
		}
		case 'screenshot': {
			// send messages to take screenshot (dummy arguments)
			wsStartWallScreenshot();
			break;
		}
		case 'moveby': {
			// command: moveby appid dx dy (relative, in pixels)
			if (command.length === 4) {
				var dx = parseFloat(command[2]);
				var dy = parseFloat(command[3]);
				wsAppMoveBy(null, {id: command[1], dx: dx, dy: dy});
			} else {
				sageutils.log("Command", "should be: moveby app_0 10 10");
			}
			break;
		}
		case 'moveto': {
			// command: moveti appid x y (absolute, in pixels)
			if (command.length === 4) {
				var xx = parseFloat(command[2]);
				var yy = parseFloat(command[3]);
				wsAppMoveTo(null, {id: command[1], x: xx, y: yy});
			} else {
				sageutils.log("Command", "should be: moveto app_0 100 100");
			}
			break;
		}
		case 'resize': {
			var ww, hh;
			// command: resize appid width height (force exact resize)
			// command: resize appid width  (keep aspect ratio)
			if (command.length === 4) {
				ww = parseFloat(command[2]);
				hh = parseFloat(command[3]);
				wsAppResize(null, {id: command[1], width: ww, height: hh, keepRatio: false});
				sageutils.log("Command", "resizing exactly to", ww + "x" + hh);
			} else if (command.length === 3) {
				ww = parseFloat(command[2]);
				hh = 0;
				wsAppResize(null, {id: command[1], width: ww, height: hh, keepRatio: true});
			} else {
				sageutils.log("Command", "should be: resize app_0 800 600");
			}
			break;
		}
		case 'hideui': {
			// if argument provided, used as auto_hide delay in second
			//   otherwise, it flips a switch
			if (command[1] !== undefined) {
				broadcast('hideui', {delay: parseInt(command[1], 10)});
			} else {
				broadcast('hideui', null);
			}
			break;
		}
		case 'close':
		case 'delete':
		case 'kill': {
			if (command.length > 1 && typeof command[1] === "string") {
				deleteApplication(command[1]);
			}
			break;
		}
		case 'fullscreen': {
			if (command.length > 1 && typeof command[1] === "string") {
				wsFullscreen(null, {id: command[1]});
			} else {
				sageutils.log("Command", "should be: fullscreen app_0");
			}
			break;
		}
		case 'clear': {
			clearDisplay();
			break;
		}
		case 'assets': {
			assets.printAssets();
			break;
		}
		case 'regenerate': {
			assets.regenerateAssets();
			break;
		}
		case 'tile': {
			tileApplications();
			break;
		}
		case 'clients': {
			listClients();
			break;
		}
		case 'apps': {
			listApplications();
			break;
		}
		case 'streams': {
			listMediaStreams();
			break;
		}
		case 'blockStreams': {
			listMediaBlockStreams();
			break;
		}
		case 'perfsampling':
			if (command.length > 1) {
				performanceManager.setSamplingInterval(command[1]);
			} else {
				sageutils.log("Command", "should be: perfsampling [slow|normal|often]");
			}
			break;
		case 'performance':
			performanceManager.printMetrics();
			break;
		case 'hardware':
			performanceManager.printServerHardware();
			break;
		case 'exit':
		case 'quit':
		case 'bye': {
			quitSAGE2();
			break;
		}
		default: {
			console.log('Say what? I might have heard `' + line.trim() + '`');
			break;
		}
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
	month  = month >= 10 ? month.toString() : "0" + month.toString();
	day    = day >= 10 ? day.toString() : "0" + day.toString();
	hour   = hour >= 10 ? hour.toString() : "0" + hour.toString();
	minute = minute >= 10 ? minute.toString() : "0" + minute.toString();
	second = second >= 10 ? second.toString() : "0" + second.toString();

	return year + "-" + month + "-" + day + "_" + hour + "-" + minute + "-" + second;
}

function quitSAGE2() {
	if (config.register_site) {
		// de-register with EVL's server
		sageutils.deregisterSAGE2(config, function() {
			saveUserLog();
			saveSession();
			assets.saveAssets();
			if (omicronRunning) {
				omicronManager.disconnect();
			}
			process.exit(0);
		});
	} else {
		saveUserLog();
		saveSession();
		assets.saveAssets();
		if (omicronRunning) {
			omicronManager.disconnect();
		}
		process.exit(0);
	}
}

function findRemoteSiteByConnection(wsio) {
	var remoteIdx = -1;
	for (var i = 0; i < config.remote_sites.length; i++) {
		if (wsio.remoteAddress.address === config.remote_sites[i].host &&
			wsio.remoteAddress.port === config.remote_sites[i].port) {
			remoteIdx = i;
		}
	}
	if (remoteIdx >= 0) {
		return remoteSites[remoteIdx];
	}
	return null;
}

function hideControl(ctrl) {
	if (ctrl.show === true) {
		ctrl.show = false;
		broadcast('hideControl', {id: ctrl.id, appId: ctrl.appId});
		interactMgr.editVisibility(ctrl.id, "widgets", false);
	}
}

function removeControlsForUser(uniqueID) {
	var widgets = SAGE2Items.widgets.list;
	for (var w in widgets) {
		if (widgets.hasOwnProperty(w) && widgets[w].id.indexOf(uniqueID) > -1) {
			interactMgr.removeGeometry(widgets[w].id, "widgets");
			SAGE2Items.widgets.removeItem(widgets[w].id);
		}
	}
	broadcast('removeControlsForUser', {user_id: uniqueID});
}

function showControl(ctrl, uniqueID, pointerX, pointerY) {
	if (ctrl.show === false) {
		ctrl.show = true;
		interactMgr.editVisibility(ctrl.id, "widgets", true);
		moveControlToPointer(ctrl, uniqueID, pointerX, pointerY);
		broadcast('showControl', {
			id: ctrl.id, appId: ctrl.appId,
			user_color: sagePointers[uniqueID] ? sagePointers[uniqueID].color : null
		});
	}
}

function moveControlToPointer(ctrl, uniqueID, pointerX, pointerY) {
	var dt = new Date();
	var rightMargin = config.totalWidth - ctrl.width;
	var bottomMargin = config.totalHeight - ctrl.height;
	ctrl.left = (pointerX > rightMargin) ? rightMargin : pointerX - ctrl.height / 2;
	ctrl.top = (pointerY > bottomMargin) ? bottomMargin : pointerY - ctrl.height / 2;
	var radialGeometry = {
		x: ctrl.left + (ctrl.height / 2),
		y: ctrl.top + (ctrl.height / 2),
		r: ctrl.height / 2
	};
	if (ctrl.hasSideBar === true) {
		var shapeData = {
			radial: {
				type: "circle",
				visible: true,
				geometry: radialGeometry
			},
			sidebar: {
				type: "rectangle",
				visible: true,
				geometry: {
					x: ctrl.left + ctrl.height,
					y: ctrl.top + (ctrl.height / 2) - (ctrl.barHeight / 2),
					w: ctrl.width - ctrl.height, h: ctrl.barHeight
				}
			}
		};
		interactMgr.editComplexGeometry(ctrl.id, "widgets", shapeData);
	} else {
		interactMgr.editGeometry(ctrl.id, "widgets", "circle", radialGeometry);
	}

	var app = SAGE2Items.applications.list[ctrl.appId];
	var appPos = (app === null) ? null : getAppPositionSize(app);
	broadcast('setControlPosition', {date: dt, elemId: ctrl.id, elemLeft: ctrl.left, elemTop: ctrl.top,
		elemHeight: ctrl.height, appData: appPos});
}

function initializeArray(size, val) {
	var arr = new Array(size);
	for (var i = 0; i < size; i++) {
		arr[i] = val;
	}
	return arr;
}

function allNonBlank(arr) {
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] === "") {
			return false;
		}
	}
	return true;
}

function allTrueDict(dict, property) {
	var key;
	for (key in dict) {
		if (property === undefined && dict[key] !== true) {
			return false;
		}
		if (property !== undefined && dict[key][property] !== true) {
			return false;
		}
	}
	return true;
}

function removeElement(list, elem) {
	if (list.indexOf(elem) >= 0) {
		moveElementToEnd(list, elem);
		list.pop();
	}
}

function moveElementToEnd(list, elem) {
	var i;
	var pos = list.indexOf(elem);
	if (pos < 0) {
		return;
	}
	for (i = pos; i < list.length - 1; i++) {
		list[i] = list[i + 1];
	}
	list[list.length - 1] = elem;
}

function intToByteBuffer(aInt, bytes) {
	var buf = new Buffer(bytes);
	var byteVal;
	var num = aInt;
	for (var i = 0; i < bytes; i++) {
		byteVal = num & 0xff;
		buf[i] = byteVal;
		num = (num - byteVal) / 256;
	}

	return buf;
}

function byteBufferToString(buf) {
	var str = "";
	var i = 0;

	while (buf[i] !== 0 && i < buf.length) {
		str += String.fromCharCode(buf[i]);
		i++;
	}

	return str;
}

function addEventToUserLog(id, data) {
	var key;
	for (key in users) {
		if (users[key].ip && users[key].ip === id) {
			users[key].actions.push(data);
		}
	}
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
		color:       appInstance.color || null,
		sticky: 	 appInstance.sticky
	};
}

// **************  Pointer Functions *****************

function createSagePointer(uniqueID, portal) {
	// From addClient type == sageUI
	sagePointers[uniqueID] = new Sagepointer(uniqueID + "_pointer");
	sagePointers[uniqueID].portal = portal;
	remoteInteraction[uniqueID] = new Interaction(config);
	remoteInteraction[uniqueID].local = portal ? false : true;

	broadcast('createSagePointer', sagePointers[uniqueID]);
}

function showPointer(uniqueID, data) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	sageutils.log("Pointer", chalk.green.bold("starting:"), chalk.underline.bold(uniqueID));

	if (data.sourceType === undefined) {
		data.sourceType = "Pointer";
	}

	sagePointers[uniqueID].start(data.label, data.color, data.sourceType);
	broadcast('showSagePointer', sagePointers[uniqueID]);
}

function hidePointer(uniqueID) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	sageutils.log("Pointer", chalk.red.bold("stopping:"), chalk.underline.bold(uniqueID));

	sagePointers[uniqueID].stop();
	var prevInteractionItem = remoteInteraction[uniqueID].getPreviousInteractionItem();
	if (prevInteractionItem !== null) {
		showOrHideWidgetLinks({uniqueID: uniqueID, show: false, item: prevInteractionItem});
		remoteInteraction[uniqueID].setPreviousInteractionItem(null);
	}
	broadcast('hideSagePointer', sagePointers[uniqueID]);
}


function globalToLocal(globalX, globalY, type, geometry) {
	var local = {};
	if (type === "circle") {
		local.x = globalX - (geometry.x - geometry.r);
		local.y = globalY - (geometry.y - geometry.r);
	} else {
		local.x = globalX - geometry.x;
		local.y = globalY - geometry.y;
	}

	return local;
}

function pointerPress(uniqueID, pointerX, pointerY, data) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	// Middle click changes interaction mode
	if (data.button === "middle") {
		remoteInteraction[uniqueID].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode});
	}

	var color = sagePointers[uniqueID] ? sagePointers[uniqueID].color : null;

	// Whiteboard app
	// If the user touches on the palette with drawing disabled, enable it
	if ((!drawingManager.drawingMode) && drawingManager.touchInsidePalette(pointerX, pointerY)) {
		// drawingManager.reEnableDrawingMode();
	}
	if (drawingManager.drawingMode) {
		drawingManager.pointerEvent(
			omicronManager.sageToOmicronEvent(uniqueID, pointerX, pointerY, data, 5, color),
			uniqueID, pointerX, pointerY, 10, 10);
	}

	var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});

	if (obj === null) {
		pointerPressOnOpenSpace(uniqueID, pointerX, pointerY, data);
		return;
	}

	// while cutting partition, can right click to cancel action
	if (cuttingPartition[uniqueID] && data.button === "right") {

		if (cuttingPartition[uniqueID].newPtn1) {
			deletePartition(cuttingPartition[uniqueID].newPtn1.id);
		}

		if (cuttingPartition[uniqueID].newPtn2) {
			deletePartition(cuttingPartition[uniqueID].newPtn2.id);
		}

		delete cuttingPartition[uniqueID];
	}

	// while dragging to create partition, can right click to cancel action
	if (draggingPartition[uniqueID] && data.button === "right") {

		deletePartition(draggingPartition[uniqueID].ptn.id);

		delete draggingPartition[uniqueID];
	}

	var prevInteractionItem = remoteInteraction[uniqueID].getPreviousInteractionItem();
	var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);

	switch (obj.layerId) {
		case "staticUI": {
			pointerPressOnStaticUI(uniqueID, pointerX, pointerY, data, obj, localPt);
			break;
		}
		case "radialMenus": {
			pointerPressOnRadialMenu(uniqueID, pointerX, pointerY, data, obj, localPt, color);
			break;
		}
		case "widgets": {
			if (prevInteractionItem === null) {
				remoteInteraction[uniqueID].pressOnItem(obj);
				showOrHideWidgetLinks({uniqueID: uniqueID, item: obj, user_color: color, show: true});
			}
			pointerPressOrReleaseOnWidget(uniqueID, pointerX, pointerY, data, obj, localPt, "press");
			break;
		}
		case "applications": {
			if (prevInteractionItem === null) {
				remoteInteraction[uniqueID].pressOnItem(obj);
				showOrHideWidgetLinks({uniqueID: uniqueID, item: obj, user_color: color, show: true});
			}
			pointerPressOnApplication(uniqueID, pointerX, pointerY, data, obj, localPt, null);
			break;
		}
		case "partitions": {
			pointerPressOnPartition(uniqueID, pointerX, pointerY, data, obj, localPt, null);
			break;
		}
		case "portals": {
			pointerPressOnDataSharingPortal(uniqueID, pointerX, pointerY, data, obj, localPt);
			break;
		}
	}
}

function pointerPressOnOpenSpace(uniqueID, pointerX, pointerY, data) {
	if (data.button === "right") {
		// Right click opens the radial menu
		createRadialMenu(uniqueID, pointerX, pointerY);
	} else if (data.button === "left" && remoteInteraction[uniqueID].CTRL) {
		// start tracking size to create new partition
		draggingPartition[uniqueID] = {};
		draggingPartition[uniqueID].ptn = createPartition({left: pointerX, top: pointerY, width: 0, height: 0},
			sagePointers[uniqueID].color);

		draggingPartition[uniqueID].start = {x: pointerX, y: pointerY};
	}
}

function pointerPressOnStaticUI(uniqueID, pointerX, pointerY, data, obj, localPt) {
	// If the remote site is active (green button)
	// also disable action through the web ui (visible pointer)
	if (obj.data.connected === "on" && sagePointers[uniqueID].visible) {
		// Validate the remote address
		var remoteSite = findRemoteSiteByConnection(obj.data.wsio);

		// Build the UI URL
		var viewURL = 'https://' + remoteSite.wsio.remoteAddress.address + ':'
			+ remoteSite.wsio.remoteAddress.port;
		// pass the password or hash to the URL
		if (config.remote_sites[remoteSite.index].password) {
			viewURL += '/session.html?page=index.html?viewonly=true&session=' +
				config.remote_sites[remoteSite.index].password;
		} else if (config.remote_sites[remoteSite.index].hash) {
			viewURL += '/session.html?page=index.html?viewonly=true&hash=' +
				config.remote_sites[remoteSite.index].hash;
		} else {
			// no password
			viewURL += '/index.html?viewonly=true';
		}

		// Create the webview to the remote UI
		wsLoadApplication(obj.data.wsio, {
			application: "/uploads/apps/Webview",
			user: obj.data.wsio.id,
			// pass the url in the data object
			data: {
				id:  uniqueID,
				url: viewURL
			},
			position: [pointerX, config.ui.titleBarHeight + 10],
			dimensions: [400, 120]
		});
	}

	// don't allow data-pushing
	/*
	switch (obj.id) {
		case "dataSharingRequestDialog": {
			break;
		}
		case "dataSharingWaitDialog": {
			break;
		}
		case "acceptDataSharingRequest": {
			console.log("Accepting Data-Sharing Request");
			broadcast('closeRequestDataSharingDialog', null);
			var sharingMin = Math.min(remoteSharingRequestDialog.config.totalWidth,
					remoteSharingRequestDialog.config.totalHeight - remoteSharingRequestDialog.config.ui.titleBarHeight);
			var myMin = Math.min(config.totalWidth, config.totalHeight - config.ui.titleBarHeight);
			var sharingSize = parseInt(0.45 * (sharingMin + myMin), 10);
			var sharingScale = (0.9 * myMin) / sharingSize;
			var sharingTitleBarHeight = (remoteSharingRequestDialog.config.ui.titleBarHeight + config.ui.titleBarHeight) / 2;
			remoteSharingRequestDialog.wsio.emit('acceptDataSharingSession',
				{width: sharingSize, height: sharingSize, titleBarHeight: sharingTitleBarHeight, date: Date.now()});
			createNewDataSharingSession(remoteSharingRequestDialog.config.name,
				remoteSharingRequestDialog.config.host, remoteSharingRequestDialog.config.port,
				remoteSharingRequestDialog.wsio, null, sharingSize, sharingSize, sharingScale,
				sharingTitleBarHeight, false);
			remoteSharingRequestDialog = null;
			showRequestDialog(false);
			break;
		}
		case "rejectDataSharingRequest": {
			console.log("Rejecting Data-Sharing Request");
			broadcast('closeRequestDataSharingDialog', null);
			remoteSharingRequestDialog.wsio.emit('rejectDataSharingSession', null);
			remoteSharingRequestDialog = null;
			showRequestDialog(false);
			break;
		}
		case "cancelDataSharingRequest": {
			console.log("Canceling Data-Sharing Request");
			broadcast('closeDataSharingWaitDialog', null);
			remoteSharingWaitDialog.wsio.emit('cancelDataSharingSession', null);
			remoteSharingWaitDialog = null;
			showWaitDialog(false);
			break;
		}
		default: {
			// remote site icon
			requestNewDataSharingSession(obj.data);
		}
	}
	*/
}

function createNewDataSharingSession(remoteName, remoteHost, remotePort, remoteWSIO, remoteTime,
	sharingWidth, sharingHeight, sharingScale, sharingTitleBarHeight, caller) {
	var zIndex = SAGE2Items.applications.numItems + SAGE2Items.portals.numItems;
	var dataSession = {
		id: getUniqueDataSharingId(remoteHost, remotePort, caller),
		name: remoteName,
		host: remoteHost,
		port: remotePort,
		left: config.ui.titleBarHeight,
		top: 1.5 * config.ui.titleBarHeight,
		width: sharingWidth * sharingScale,
		height: sharingHeight * sharingScale,
		previous_left: config.ui.titleBarHeight,
		previous_top: 1.5 * config.ui.titleBarHeight,
		previous_width: sharingWidth * sharingScale,
		previous_height: sharingHeight * sharingScale,
		natural_width: sharingWidth,
		natural_height: sharingHeight,
		aspect: sharingWidth / sharingHeight,
		scale: sharingScale,
		titleBarHeight: sharingTitleBarHeight,
		zIndex: zIndex
	};

	console.log("New Data Sharing Session: " + dataSession.id);

	var geometry = {
		x: dataSession.left,
		y: dataSession.top,
		w: dataSession.width,
		h: dataSession.height + config.ui.titleBarHeight
	};

	var cornerSize   = 0.2 * Math.min(geometry.w, geometry.h);
	var oneButton    = Math.round(config.ui.titleBarHeight) * (300 / 235);
	var buttonsPad   = 0.1 * oneButton;
	var startButtons = geometry.w - Math.round(2 * oneButton + buttonsPad);

	/*
	var buttonsWidth = (config.ui.titleBarHeight-4) * (324.0/111.0);
	var buttonsPad   = (config.ui.titleBarHeight-4) * ( 10.0/111.0);
	var oneButton    = buttonsWidth / 2; // two buttons
	var startButtons = geometry.w - buttonsWidth;
	*/

	interactMgr.addGeometry(dataSession.id, "portals", "rectangle", geometry, true, zIndex, dataSession);

	SAGE2Items.portals.addItem(dataSession);
	SAGE2Items.portals.addButtonToItem(dataSession.id, "titleBar", "rectangle",
		{x: 0, y: 0, w: geometry.w, h: config.ui.titleBarHeight}, 0);
	SAGE2Items.portals.addButtonToItem(dataSession.id, "fullscreenButton", "rectangle",
		{x: startButtons + buttonsPad, y: 0, w: oneButton, h: config.ui.titleBarHeight}, 1);
	SAGE2Items.portals.addButtonToItem(dataSession.id, "closeButton", "rectangle",
		{x: startButtons + buttonsPad + oneButton, y: 0, w: oneButton, h: config.ui.titleBarHeight}, 1);
	SAGE2Items.portals.addButtonToItem(dataSession.id, "dragCorner", "rectangle",
		{x: geometry.w - cornerSize, y: geometry.h + config.ui.titleBarHeight - cornerSize, w: cornerSize, h: cornerSize}, 2);

	SAGE2Items.portals.interactMgr[dataSession.id] = new InteractableManager();
	SAGE2Items.portals.interactMgr[dataSession.id].addLayer("radialMenus",  2);
	SAGE2Items.portals.interactMgr[dataSession.id].addLayer("widgets",      1);
	SAGE2Items.portals.interactMgr[dataSession.id].addLayer("applications", 0);

	broadcast('initializeDataSharingSession', dataSession);
	var key;
	for (key in sagePointers) {
		remoteWSIO.emit('createRemoteSagePointer', {id: key, portal: {host: config.host, port: config.port}});
	}
	var to = caller ? remoteTime.getTime() - Date.now() : 0;
	remoteSharingSessions[dataSession.id] = {portal: dataSession, wsio: remoteWSIO, appCount: 0, timeOffset: to};

}

// Disabling data sharing portal for now
/*
function requestNewDataSharingSession(remote) {
	return;

	if (remote.connected) {
		console.log("Requesting data-sharing session with " + remote.name);

		remoteSharingWaitDialog = remote;
		broadcast('dataSharingConnectionWait', {name: remote.name, host: remote.wsio.remoteAddress.address,
			port: remote.wsio.remoteAddress.port});
		remote.wsio.emit('requestDataSharingSession', {config: config, secure: false});

		showWaitDialog(true);
	} else {
		console.log("Remote site " + remote.name + " is not currently connected");
	}
}
*/

function showWaitDialog(flag) {
	interactMgr.editVisibility("dataSharingWaitDialog", "staticUI", flag);
	interactMgr.editVisibility("cancelDataSharingRequest", "staticUI", flag);
}

function showRequestDialog(flag) {
	interactMgr.editVisibility("dataSharingRequestDialog", "staticUI", flag);
	interactMgr.editVisibility("acceptDataSharingRequest", "staticUI", flag);
	interactMgr.editVisibility("rejectDataSharingRequest", "staticUI", flag);
}

function pointerPressOnRadialMenu(uniqueID, pointerX, pointerY, data, obj, localPt, color) {
	var existingRadialMenu = obj.data;

	if (obj.id.indexOf("menu_radial_button") !== -1) {
		// Pressing on radial menu button
		var menuStateChange = existingRadialMenu.onButtonEvent(obj.id, uniqueID, "pointerPress", color);
		if (menuStateChange !== undefined) {
			radialMenuEvent({type: "stateChange", menuID: existingRadialMenu.id, menuState: menuStateChange });
		}
	} else if (obj.id.indexOf("menu_thumbnail") !== -1) {
		// Pressing on thumbnail window
		// console.log("Pointer press on thumbnail window");
		data = { button: data.button, color: sagePointers[uniqueID].color };
		radialMenuEvent({type: "pointerPress", id: uniqueID, x: pointerX, y: pointerY, data: data});
	} else {
		// Not on a button
		// Drag Content Browser only from radial menu
		if (data.button === "left" && obj.type !== 'rectangle') {
			obj.data.onStartDrag(uniqueID, {x: pointerX, y: pointerY});
		}
	}
}

function pointerPressOrReleaseOnWidget(uniqueID, pointerX, pointerY, data, obj, localPt, pressRelease) {
	var id = obj.data.id;
	if (data.button === "left") {
		var sidebarPoint = {x: obj.geometry.x - obj.data.left + localPt.x, y: obj.geometry.y - obj.data.top + localPt.y};
		var btn = SAGE2Items.widgets.findButtonByPoint(id, localPt) || SAGE2Items.widgets.findButtonByPoint(id, sidebarPoint);
		var ctrlData = {ctrlId: btn ? btn.id : null, appId: obj.data.appId, instanceID: id};
		var regTI = /textInput/;
		var regSl = /slider/;
		var regButton = /button/;
		var lockedControl = null;
		var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};

		if (pressRelease === "press") {
			// var textInputOrSlider = SAGE2Items.widgets.findButtonByPoint(id, sidebarPoint);
			if (btn === null) {// && textInputOrSlider===null) {
				remoteInteraction[uniqueID].selectMoveControl(obj.data, pointerX, pointerY);
			} else {
				remoteInteraction[uniqueID].releaseControl();
				lockedControl = remoteInteraction[uniqueID].lockedControl();
				if (lockedControl) {
					// If a text input widget was locked, drop it
					broadcast('deactivateTextInputControl', lockedControl);
					remoteInteraction[uniqueID].dropControl();
				}

				remoteInteraction[uniqueID].lockControl(ctrlData);
				if (regSl.test(btn.id)) {
					broadcast('sliderKnobLockAction', {ctrl: ctrlData, x: pointerX, user: eUser, date: Date.now()});
				} else if (regTI.test(btn.id)) {
					broadcast('activateTextInputControl', {
						prevTextInput: lockedControl,
						curTextInput: ctrlData, date: Date.now()
					});
				}
			}
		} else {
			lockedControl = remoteInteraction[uniqueID].lockedControl();
			if (lockedControl !== null && btn !== null && regButton.test(btn.id) && lockedControl.ctrlId === btn.id) {
				remoteInteraction[uniqueID].dropControl();
				broadcast('executeControlFunction', {ctrl: ctrlData, user: eUser, date: Date.now()}, 'receivesWidgetEvents');

				var app = SAGE2Items.applications.list[ctrlData.appId];
				if (app) {
					if (btn.id.indexOf("buttonCloseApp") >= 0) {
						addEventToUserLog(data.addr, {type: "delete", data: {application:
							{id: app.id, type: app.application}}, time: Date.now()});
					} else if (btn.id.indexOf("buttonCloseWidget") >= 0) {
						addEventToUserLog(data.addr, {type: "widgetMenu", data: {action: "close", application:
							{id: app.id, type: app.application}}, time: Date.now()});
					} else if (btn.id.indexOf("buttonShareApp") >= 0) {
						console.log("sharing app");
					} else {
						addEventToUserLog(data.addr, {type: "widgetAction", data: {application:
							data.appId, widget: data.ctrlId}, time: Date.now()});
					}
				}
			}
			remoteInteraction[uniqueID].releaseControl();
		}
	} else {
		if (obj.data.show === true && pressRelease === "press") {
			hideControl(obj.data);
			var app2 = SAGE2Items.applications.list[obj.data.appId];
			if (app2 !== null) {
				addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "close", application:
					{id: app2.id, type: app2.application}}, time: Date.now()});
			}
		}
	}
}

function releaseSlider(uniqueID) {
	var ctrlData = remoteInteraction[uniqueID].lockedControl();
	if (/slider/.test(ctrlData.ctrlId) === true) {
		remoteInteraction[uniqueID].dropControl();
		var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
		broadcast('executeControlFunction', {ctrl: ctrlData, user: eUser}, 'receivesWidgetEvents');
	}
}


function pointerPressOnApplication(uniqueID, pointerX, pointerY, data, obj, localPt, portalId) {
	var im = findInteractableManager(obj.data.id);
	im.moveObjectToFront(obj.id, "applications", ["portals"]);
	var app = SAGE2Items.applications.list[obj.id];
	var stickyList = stickyAppHandler.getStickingItems(app);
	for (var idx in stickyList) {
		im.moveObjectToFront(stickyList[idx].id, "applications", ["portals"]);
	}
	var newOrder = im.getObjectZIndexList("applications", ["portals"]);
	broadcast('updateItemOrder', newOrder);

	if (portalId !== undefined && portalId !== null) {
		var ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
		remoteSharingSessions[portalId].wsio.emit('updateApplicationOrder', {order: newOrder, date: ts});
	}

	var btn = SAGE2Items.applications.findButtonByPoint(obj.id, localPt);

	// pointer press on app window
	if (btn === null) {
		if (data.button === "right") {
			var elemCtrl = SAGE2Items.widgets.list[obj.id + uniqueID + "_controls"];
			if (!elemCtrl) {
				// if no UI element, send event to app if in interaction mode
				if (remoteInteraction[uniqueID].appInteractionMode()) {
					sendPointerPressToApplication(uniqueID, obj.data, pointerX, pointerY, data);
				}
				// Request a control (do not know in advance)
				broadcast('requestNewControl', {elemId: obj.id, user_id: uniqueID,
					user_label: sagePointers[uniqueID] ? sagePointers[uniqueID].label : "",
					x: pointerX, y: pointerY, date: Date.now() });
			} else if (elemCtrl.show === false) {
				showControl(elemCtrl, uniqueID, pointerX, pointerY);
				addEventToUserLog(uniqueID, {type: "widgetMenu", data: {action: "open", application:
					{id: obj.id, type: obj.data.application}}, time: Date.now()});
			} else {
				moveControlToPointer(elemCtrl, uniqueID, pointerX, pointerY);
			}
		} else {
			if (remoteInteraction[uniqueID].appInteractionMode()) {
				sendPointerPressToApplication(uniqueID, obj.data, pointerX, pointerY, data);
			} else {
				selectApplicationForMove(uniqueID, obj.data, pointerX, pointerY, portalId);
			}
		}
		return;
	}

	switch (btn.id) {
		case "titleBar":
			if (drawingManager.paletteID !== uniqueID) {
				selectApplicationForMove(uniqueID, obj.data, pointerX, pointerY, portalId);
			}
			break;
		case "dragCorner":
			if (obj.data.application === "Webview") {
				// resize with corner only in window mode
				if (!sagePointers[uniqueID].visible || remoteInteraction[uniqueID].windowManagementMode()) {
					selectApplicationForResize(uniqueID, obj.data, pointerX, pointerY, portalId);
				} else {
					// if corner click and webview, then send the click to app
					sendPointerPressToApplication(uniqueID, obj.data, pointerX, pointerY, data);
				}
			} else {
				selectApplicationForResize(uniqueID, obj.data, pointerX, pointerY, portalId);
			}
			break;
		case "syncButton":
			if (sagePointers[uniqueID].visible) {
				// only if pointer on the wall, not the web UI
				broadcast('toggleSyncOptions', {id: obj.data.id});
			}
			break;
		case "fullscreenButton":
			if (sagePointers[uniqueID].visible) {
				// only if pointer on the wall, not the web UI
				toggleApplicationFullscreen(uniqueID, obj.data, portalId);
			}
			break;
		case "pinButton":
			if (sagePointers[uniqueID].visible) {
				// only if pointer on the wall, not the web UI
				toggleStickyPin(obj.data.id);
			}
			break;
		case "closeButton":
			if (sagePointers[uniqueID].visible) {
				// only if pointer on the wall, not the web UI
				deleteApplication(obj.data.id, portalId);
			}
			break;
	}
}

function pointerPressOnPartition(uniqueID, pointerX, pointerY, data, obj, localPt, portalId) {
	var btn = partitions.findButtonByPoint(obj.id, localPt);

	// pointer press on ptn window
	if (btn === null) {
		if (data.button === "left") {
			if (remoteInteraction[uniqueID].CTRL) {
				// start tracking size to create new partition
				cuttingPartition[uniqueID] = {};
				cuttingPartition[uniqueID].start = {x: pointerX, y: pointerY};
				cuttingPartition[uniqueID].ptn = obj.data;
			} else {
				selectApplicationForMove(uniqueID, obj.data, pointerX, pointerY);
			}
		}
		return;
	}

	switch (btn.id) {
		case "titleBar":
			selectApplicationForMove(uniqueID, obj.data, pointerX, pointerY);
			break;
		case "dragCorner":
			selectApplicationForResize(uniqueID, obj.data, pointerX, pointerY, portalId);
			break;
		case "tileButton":
			if (sagePointers[uniqueID].visible) {
				var changedPartitions = partitions.list[obj.id].toggleInnerTiling();
				updatePartitionInnerLayout(partitions.list[obj.id], true);

				changedPartitions.forEach(el => {
					broadcast('partitionWindowTitleUpdate', partitions.list[el].getTitle());
				});
			}
			break;
		case "clearButton":
			if (sagePointers[uniqueID].visible) {
				// only if pointer on the wall, not the web UI

				// clear partition (close all windows inside)
				if (partitions.list.hasOwnProperty(obj.id)) {
					// passing method to delete applications for use within clearPartition method
					changedPartitions = partitions.list[obj.id].clearPartition(deleteApplication);
					changedPartitions.forEach(el => {
						broadcast('partitionWindowTitleUpdate', partitions.list[el].getTitle());
					});
				}
			}
			break;
		case "fullscreenButton":
			if (sagePointers[uniqueID].visible) {
				// only if pointer on the wall, not the web UI

				if (!obj.data.maximized) {
					remoteInteraction[uniqueID].maximizeSelectedItem(obj.data);
				} else {
					remoteInteraction[uniqueID].restoreSelectedItem(obj.data);
				}

				partitions.updatePartitionGeometries(obj.id, interactMgr);
				broadcast('partitionMoveAndResizeFinished', obj.data.getDisplayInfo());

				// update neighbors if it is snapped
				if (obj.data.isSnapping) {
					let updatedNeighbors = obj.data.updateNeighborPtnPositions();
					// update geometries/display/layout of any updated neighbors
					for (var neigh of updatedNeighbors) {
						partitions.updatePartitionGeometries(neigh, interactMgr);
						broadcast('partitionMoveAndResizeFinished', partitions.list[neigh].getDisplayInfo());

						updatePartitionInnerLayout(partitions.list[neigh], true);
					}
				}
				// update child positions within partiton
				updatePartitionInnerLayout(partitions.list[obj.id], false);
			}
			break;
		case "closeButton":
			if (sagePointers[uniqueID].visible) {
				// only if pointer on the wall, not the web UI

				deletePartition(obj.id);
			}
			break;
	}
}

function pointerPressOnDataSharingPortal(uniqueID, pointerX, pointerY, data, obj, localPt) {
	interactMgr.moveObjectToFront(obj.id, "portals", ["applications"]);
	var newOrder = interactMgr.getObjectZIndexList("portals", ["applications"]);
	broadcast('updateItemOrder', newOrder);

	var btn = SAGE2Items.portals.findButtonByPoint(obj.id, localPt);

	// pointer press inside portal window
	if (btn === null) {
		var scaledPt = {x: localPt.x / obj.data.scale, y: (localPt.y - config.ui.titleBarHeight) / obj.data.scale};
		pointerPressInDataSharingArea(uniqueID, obj.data.id, scaledPt, data);
		return;
	}

	switch (btn.id) {
		case "titleBar": {
			selectPortalForMove(uniqueID, obj.data, pointerX, pointerY);
			break;
		}
		case "dragCorner": {
			if (remoteInteraction[uniqueID].windowManagementMode()) {
				selectPortalForResize(uniqueID, obj.data, pointerX, pointerY);
			}
			break;
		}
		case "fullscreenButton": {
			// toggleApplicationFullscreen(uniqueID, obj.data);
			break;
		}
		case "pinButton": {
			// toggleStickyPin(obj.data.id);
			break;
		}
		case "closeButton": {
			// deleteApplication(obj.data.id);
			break;
		}
	}
}

function pointerPressInDataSharingArea(uniqueID, portalId, scaledPt, data) {
	var pObj = SAGE2Items.portals.interactMgr[portalId].searchGeometry(scaledPt);
	if (pObj === null) {
		// pointerPressOnOpenSpace(uniqueID, pointerX, pointerY, data);
		return;
	}

	var pLocalPt = globalToLocal(scaledPt.x, scaledPt.y, pObj.type, pObj.geometry);
	switch (pObj.layerId) {
		case "radialMenus": {
			// pointerPressOnRadialMenu(uniqueID, pointerX, pointerY, data, pObj, pLocalPt);
			break;
		}
		case "widgets": {
			// pointerPressOnWidget(uniqueID, pointerX, pointerY, data, pObj, pLocalPt);
			break;
		}
		case "applications": {
			pointerPressOnApplication(uniqueID, scaledPt.x, scaledPt.y, data, pObj, pLocalPt, portalId);
			break;
		}
	}
	return;
}

function selectApplicationForMove(uniqueID, app, pointerX, pointerY, portalId) {
	remoteInteraction[uniqueID].selectMoveItem(app, pointerX, pointerY);
	broadcast('startMove', {id: app.id, date: Date.now()});

	if (portalId !== undefined && portalId !== null) {
		var ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
		remoteSharingSessions[portalId].wsio.emit('startApplicationMove', {id: uniqueID, appId: app.id, date: ts});
	}

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

function selectApplicationForResize(uniqueID, app, pointerX, pointerY, portalId) {
	remoteInteraction[uniqueID].selectResizeItem(app, pointerX, pointerY);
	broadcast('startResize', {id: app.id, date: Date.now()});

	if (portalId !== undefined && portalId !== null) {
		var ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
		remoteSharingSessions[portalId].wsio.emit('startApplicationResize', {id: uniqueID, appId: app.id, date: ts});
	}

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
	handleStickyItem(app.id);

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

function sendPointerDblClickToApplication(uniqueID, app, pointerX, pointerY) {
	var ePosition = {x: pointerX - app.left, y: pointerY - (app.top + config.ui.titleBarHeight)};
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};

	var event = {
		id: app.id,
		type: "pointerDblClick",
		position: ePosition,
		user: eUser,
		date: Date.now()
	};

	broadcast('eventInItem', event);

	var eLogData = {
		type: "pointerDblClick",
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

function selectPortalForMove(uniqueID, portal, pointerX, pointerY) {
	remoteInteraction[uniqueID].selectMoveItem(portal, pointerX, pointerY);

	var eLogData = {
		type: "move",
		action: "start",
		portal: {
			id: portal.id,
			name: portal.name,
			host: portal.host,
			port: portal.port
		},
		location: {
			x: parseInt(portal.left, 10),
			y: parseInt(portal.top, 10),
			width: parseInt(portal.width, 10),
			height: parseInt(portal.height, 10)
		}
	};
	addEventToUserLog(uniqueID, {type: "windowManagement", data: eLogData, time: Date.now()});
}

function selectPortalForResize(uniqueID, portal, pointerX, pointerY) {
	remoteInteraction[uniqueID].selectResizeItem(portal, pointerX, pointerY);

	var eLogData = {
		type: "resize",
		action: "start",
		portal: {
			id: portal.id,
			name: portal.name,
			host: portal.host,
			port: portal.port
		},
		location: {
			x: parseInt(portal.left, 10),
			y: parseInt(portal.top, 10),
			width: parseInt(portal.width, 10),
			height: parseInt(portal.height, 10)
		}
	};
	addEventToUserLog(uniqueID, {type: "windowManagement", data: eLogData, time: Date.now()});
}

function pointerMove(uniqueID, pointerX, pointerY, data) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	// Whiteboard app
	if (drawingManager.drawingMode) {
		var color = sagePointers[uniqueID] ? sagePointers[uniqueID].color : null;
		drawingManager.pointerEvent(
			omicronManager.sageToOmicronEvent(uniqueID, pointerX, pointerY, data, 4, color),
			uniqueID, pointerX, pointerY, 10, 10);
	}

	// Trick: press CTRL key while moving switches interaction mode
	if (sagePointers[uniqueID] && remoteInteraction[uniqueID].CTRL && pressingCTRL) {
		remoteInteraction[uniqueID].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode});
		pressingCTRL = false;
	} else if (sagePointers[uniqueID] && !remoteInteraction[uniqueID].CTRL && !pressingCTRL) {
		remoteInteraction[uniqueID].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode});
		pressingCTRL = true;
	}

	sagePointers[uniqueID].updatePointerPosition(data, config.totalWidth, config.totalHeight);
	pointerX = sagePointers[uniqueID].left;
	pointerY = sagePointers[uniqueID].top;

	updatePointerPosition(uniqueID, pointerX, pointerY, data);
}

function pointerPosition(uniqueID, data) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	sagePointers[uniqueID].updatePointerPosition(data, config.totalWidth, config.totalHeight);
	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	updatePointerPosition(uniqueID, pointerX, pointerY, data);
}

function updatePointerPosition(uniqueID, pointerX, pointerY, data) {
	broadcast('updateSagePointerPosition', sagePointers[uniqueID]);

	var localPt;
	var scaledPt;
	var moveAppPortal = findApplicationPortal(remoteInteraction[uniqueID].selectedMoveItem);
	var resizeAppPortal = findApplicationPortal(remoteInteraction[uniqueID].selectedResizeItem);
	var updatedMoveItem;
	var updatedResizeItem;
	var updatedControl;

	if (draggingPartition[uniqueID]) {
		draggingPartition[uniqueID].ptn.left =
			pointerX < draggingPartition[uniqueID].start.x ?
				pointerX : draggingPartition[uniqueID].start.x;

		draggingPartition[uniqueID].ptn.top =
			pointerY < draggingPartition[uniqueID].start.y ?
				pointerY : draggingPartition[uniqueID].start.y;

		draggingPartition[uniqueID].ptn.width =
			pointerX < draggingPartition[uniqueID].start.x ?
				draggingPartition[uniqueID].start.x - pointerX : pointerX - draggingPartition[uniqueID].start.x;

		draggingPartition[uniqueID].ptn.height =
			pointerY < draggingPartition[uniqueID].start.y ?
				draggingPartition[uniqueID].start.y - pointerY : pointerY - draggingPartition[uniqueID].start.y;

		partitions.updatePartitionGeometries(draggingPartition[uniqueID].ptn.id, interactMgr);
		broadcast('partitionMoveAndResizeFinished', draggingPartition[uniqueID].ptn.getDisplayInfo());
	}

	// if the user is cutting a partition
	if (cuttingPartition[uniqueID]) {
		var cutDirection = Math.abs(pointerX - cuttingPartition[uniqueID].start.x) >
			Math.abs(pointerY - cuttingPartition[uniqueID].start.y) ?
			"horizontal" : "vertical";

		var cutPosition = cutDirection === "horizontal" ?
			(cuttingPartition[uniqueID].start.y + pointerY) / 2 :
			(cuttingPartition[uniqueID].start.x + pointerX) / 2;

		var cutDist = Math.sqrt(Math.pow(pointerY - cuttingPartition[uniqueID].start.y, 2) +
			Math.pow(pointerX - cuttingPartition[uniqueID].start.x, 2));

		var oldPtn = cuttingPartition[uniqueID].ptn;

		// calculate dimensions of new partitions
		var newDims1, newDims2 = null;

		if (cutDirection === "horizontal") {
			// make sure partition is tall enough to split
			if (oldPtn.height < 2 * partitions.minSize.height) {
				return;
			}

			// clamp cut position inside partition so it doesn't break
			if (cutPosition > (oldPtn.top + oldPtn.height - partitions.minSize.height)) {
				cutPosition = oldPtn.top + oldPtn.height - partitions.minSize.height;
			}

			if (cutPosition < (oldPtn.top + partitions.minSize.height)) {
				cutPosition = oldPtn.top + partitions.minSize.height;
			}

			newDims1 = {
				top: oldPtn.top,
				left: oldPtn.left,
				width: oldPtn.width,
				height: cutPosition - oldPtn.top  - config.ui.titleBarHeight
			};

			newDims2 = {
				top: cutPosition,
				left: oldPtn.left,
				width: oldPtn.width,
				height: (oldPtn.top + oldPtn.height) - cutPosition
			};

		} else if (cutDirection === "vertical") {
			// make sure partition is wide enough to split
			if (oldPtn.width < 2 * partitions.minSize.width) {
				return;
			}
			// clamp cut position inside partition so it doesn't break
			if (cutPosition > (oldPtn.left + oldPtn.width - partitions.minSize.width)) {
				cutPosition = oldPtn.left + oldPtn.width - partitions.minSize.width;
			}

			if (cutPosition < (oldPtn.left + partitions.minSize.width)) {
				cutPosition = oldPtn.left + partitions.minSize.width;
			}

			newDims1 = {
				top: oldPtn.top,
				left: oldPtn.left,
				width: cutPosition - oldPtn.left,
				height: oldPtn.height
			};

			newDims2 = {
				top: oldPtn.top,
				left: cutPosition,
				width: (oldPtn.left + oldPtn.width) - cutPosition,
				height: oldPtn.height
			};
		}

		if (cutDist > Math.min(oldPtn.width, oldPtn.height) / 3) {
			// if partitions are not created
			if (!cuttingPartition[uniqueID].newPtn1 && !cuttingPartition[uniqueID].newPtn2) {
				// if the gesture is long enough and the new partitions haven't been made, create them
				var ptnColor = oldPtn.color;

				// create the 2 new partitions
				cuttingPartition[uniqueID].newPtn1 = createPartition(newDims1, ptnColor);
				cuttingPartition[uniqueID].newPtn2 = createPartition(newDims2, ptnColor);


				broadcast('updatePartitionBorders', {id: cuttingPartition[uniqueID].newPtn1.id, highlight: true});
				broadcast('updatePartitionBorders', {id: cuttingPartition[uniqueID].newPtn2.id, highlight: true});
			} else {
				// if they are already created just update their size and position

				// resize partition 1
				cuttingPartition[uniqueID].newPtn1.left = newDims1.left;
				cuttingPartition[uniqueID].newPtn1.top = newDims1.top;
				cuttingPartition[uniqueID].newPtn1.width = newDims1.width;
				cuttingPartition[uniqueID].newPtn1.height = newDims1.height;

				// resize partition 2
				cuttingPartition[uniqueID].newPtn2.left = newDims2.left;
				cuttingPartition[uniqueID].newPtn2.top = newDims2.top;
				cuttingPartition[uniqueID].newPtn2.width = newDims2.width;
				cuttingPartition[uniqueID].newPtn2.height = newDims2.height;


				moveAndResizePartitionWindow(uniqueID, {elemId: cuttingPartition[uniqueID].newPtn1.id});
				moveAndResizePartitionWindow(uniqueID, {elemId: cuttingPartition[uniqueID].newPtn2.id});

			}
		}

	}

	if (moveAppPortal !== null) {
		localPt = globalToLocal(pointerX, pointerY, moveAppPortal.type, moveAppPortal.geometry);
		scaledPt = {x: localPt.x / moveAppPortal.data.scale,
			y: (localPt.y - config.ui.titleBarHeight) / moveAppPortal.data.scale};
		remoteSharingSessions[moveAppPortal.id].wsio.emit('remoteSagePointerPosition',
			{id: uniqueID, left: scaledPt.x, top: scaledPt.y});
		updatedMoveItem = remoteInteraction[uniqueID].moveSelectedItem(scaledPt.x, scaledPt.y);
		moveApplicationWindow(uniqueID, updatedMoveItem, moveAppPortal.id);
		return;
	}
	if (resizeAppPortal !== null) {
		localPt = globalToLocal(pointerX, pointerY, resizeAppPortal.type, resizeAppPortal.geometry);
		scaledPt = {x: localPt.x / resizeAppPortal.data.scale,
			y: (localPt.y - config.ui.titleBarHeight) / resizeAppPortal.data.scale};
		remoteSharingSessions[resizeAppPortal.id].wsio.emit('remoteSagePointerPosition',
			{id: uniqueID, left: scaledPt.x, top: scaledPt.y});
		updatedResizeItem = remoteInteraction[uniqueID].resizeSelectedItem(scaledPt.x, scaledPt.y);
		moveAndResizeApplicationWindow(updatedResizeItem, resizeAppPortal.id);
		return;
	}

	// update radial menu position if dragged outside radial menu
	updateRadialMenuPointerPosition(uniqueID, pointerX, pointerY);

	// update app position and size if currently modifying a window
	updatedMoveItem = remoteInteraction[uniqueID].moveSelectedItem(pointerX, pointerY);
	updatedResizeItem = remoteInteraction[uniqueID].resizeSelectedItem(pointerX, pointerY);
	updatedControl = remoteInteraction[uniqueID].moveSelectedControl(pointerX, pointerY);

	if (updatedMoveItem !== null) {
		if (SAGE2Items.portals.list.hasOwnProperty(updatedMoveItem.elemId)) {
			moveDataSharingPortalWindow(updatedMoveItem);
		} else if (partitions.list.hasOwnProperty(updatedMoveItem.elemId)) {
			moveAndResizePartitionWindow(uniqueID, updatedMoveItem, null);
		} else {
			moveApplicationWindow(uniqueID, updatedMoveItem, null);

			let currentMoveItem = SAGE2Items.applications.list[updatedMoveItem.elemId];

			if (currentMoveItem) {
				// Calculate partition which item is over
				let newPartitionHovered = partitions.calculateNewPartition(currentMoveItem, {x: pointerX, y: pointerY});


				if (currentMoveItem.ptnHovered != newPartitionHovered) {
					broadcast('updatePartitionBorders', {id: currentMoveItem.ptnHovered, highlight: false});

					// update ptnHovered with new partition
					currentMoveItem.ptnHovered = newPartitionHovered;

					broadcast('updatePartitionBorders', {id: currentMoveItem.ptnHovered, highlight: true});
				}
			}
		}
		return;
	}
	if (updatedResizeItem !== null) {
		if (SAGE2Items.portals.list.hasOwnProperty(updatedResizeItem.elemId)) {
			moveAndResizeDataSharingPortalWindow(updatedResizeItem);
		} else if (partitions.list.hasOwnProperty(updatedResizeItem.elemId)) {
			moveAndResizePartitionWindow(uniqueID, updatedResizeItem, null);
		} else {
			moveAndResizeApplicationWindow(updatedResizeItem, null);
		}
		return;
	}
	if (updatedControl !== null) {
		moveWidgetControls(uniqueID, updatedControl);
		return;
	}

	var prevInteractionItem = remoteInteraction[uniqueID].getPreviousInteractionItem();

	var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});
	if (obj === null) {
		removeExistingHoverCorner(uniqueID);
		if (remoteInteraction[uniqueID].portal !== null) {
			remoteSharingSessions[remoteInteraction[uniqueID].portal.id].wsio.emit('stopRemoteSagePointer', {id: uniqueID});
			remoteInteraction[uniqueID].portal = null;
		}
		if (prevInteractionItem !== null) {
			showOrHideWidgetLinks({uniqueID: uniqueID, item: prevInteractionItem, show: false});
		}
	} else {
		var color = sagePointers[uniqueID] ? sagePointers[uniqueID].color : null;
		if (prevInteractionItem !== obj) {
			if (prevInteractionItem !== null) {
				showOrHideWidgetLinks({uniqueID: uniqueID, item: prevInteractionItem, show: false});
			}
			showOrHideWidgetLinks({uniqueID: uniqueID, item: obj, user_color: color, show: true});
		} else {
			var appId = obj.id;
			if (obj.data !== undefined && obj.data !== null && obj.data.appId !== undefined) {
				appId = obj.data.appId;
			}
			if (appUserColors[appId] !== color) {
				showOrHideWidgetLinks({uniqueID: uniqueID, item: prevInteractionItem, show: false});
				showOrHideWidgetLinks({uniqueID: uniqueID, item: obj, user_color: color, show: true});
			}
		}
		localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
		switch (obj.layerId) {
			case "staticUI": {
				removeExistingHoverCorner(uniqueID);
				if (remoteInteraction[uniqueID].portal !== null) {
					remoteSharingSessions[remoteInteraction[uniqueID].portal.id].wsio.emit(
						'stopRemoteSagePointer', {id: uniqueID});
					remoteInteraction[uniqueID].portal = null;
				}
				break;
			}
			case "radialMenus": {
				pointerMoveOnRadialMenu(uniqueID, pointerX, pointerY, data, obj, localPt, color);
				removeExistingHoverCorner(uniqueID);
				if (remoteInteraction[uniqueID].portal !== null) {
					remoteSharingSessions[remoteInteraction[uniqueID].portal.id].wsio.emit(
						'stopRemoteSagePointer', {id: uniqueID});
					remoteInteraction[uniqueID].portal = null;
				}
				break;
			}
			case "widgets": {
				pointerMoveOnWidgets(uniqueID, pointerX, pointerY, data, obj, localPt);
				removeExistingHoverCorner(uniqueID);
				if (remoteInteraction[uniqueID].portal !== null) {
					remoteSharingSessions[remoteInteraction[uniqueID].portal.id].wsio.emit(
						'stopRemoteSagePointer', {id: uniqueID});
					remoteInteraction[uniqueID].portal = null;
				}
				break;
			}
			case "applications": {
				pointerMoveOnApplication(uniqueID, pointerX, pointerY, data, obj, localPt, null);
				if (remoteInteraction[uniqueID].portal !== null) {
					remoteSharingSessions[remoteInteraction[uniqueID].portal.id].wsio.emit(
						'stopRemoteSagePointer', {id: uniqueID});
					remoteInteraction[uniqueID].portal = null;
				}
				break;
			}
			case "partitions": {
				pointerMoveOnPartition(uniqueID, pointerX, pointerY, data, obj, localPt, null);
				break;
			}
			case "portals": {
				pointerMoveOnDataSharingPortal(uniqueID, pointerX, pointerY, data, obj, localPt);
				break;
			}
		}
	}

	remoteInteraction[uniqueID].setPreviousInteractionItem(obj);
}

function pointerMoveOnRadialMenu(uniqueID, pointerX, pointerY, data, obj, localPt, color) {
	var existingRadialMenu = obj.data;

	if (obj.id.indexOf("menu_radial_button") !== -1) {
		// Pressing on radial menu button
		// console.log("over radial button: " + obj.id);
		// data = { buttonID: obj.id, button: data.button, color: sagePointers[uniqueID].color };
		// radialMenuEvent({type: "pointerMove", id: uniqueID, x: pointerX, y: pointerY, data: data});
		var menuStateChange = existingRadialMenu.onButtonEvent(obj.id, uniqueID, "pointerMove", color);
		if (menuStateChange !== undefined) {
			radialMenuEvent({type: "stateChange", menuID: existingRadialMenu.id, menuState: menuStateChange });
		}
	} else if (obj.id.indexOf("menu_thumbnail") !== -1) {
		// PointerMove on thumbnail window
		// console.log("Pointer move on thumbnail window");
		data = { button: data.button, color: sagePointers[uniqueID].color };
		radialMenuEvent({type: "pointerMove", id: uniqueID, x: pointerX, y: pointerY, data: data});
	} else {
		// Not on a button
		var menuButtonState = existingRadialMenu.onMenuEvent(uniqueID);
		if (menuButtonState !== undefined) {
			radialMenuEvent({type: "stateChange", menuID: existingRadialMenu.id, menuState: menuButtonState });
		}
		// Drag Content Browser only from radial menu
		if (existingRadialMenu.dragState === true && obj.type !== 'rectangle') {
			var offset = existingRadialMenu.getDragOffset(uniqueID, {x: pointerX, y: pointerY});
			moveRadialMenu(existingRadialMenu.id, offset.x, offset.y);
			radialMenuEvent({type: "pointerMove", id: uniqueID, x: pointerX, y: pointerY, data: data});
		}
	}
}

function pointerMoveOnWidgets(uniqueID, pointerX, pointerY, data, obj, localPt) {
	// widgets
	var lockedControl = remoteInteraction[uniqueID].lockedControl();
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};

	if (lockedControl && /slider/.test(lockedControl.ctrlId)) {
		broadcast('moveSliderKnob', {ctrl: lockedControl, x: pointerX, user: eUser, date: Date.now()});
		return;
	}
	// showOrHideWidgetConnectors(uniqueID, obj.data, "move");
	// Widget connector show logic ends

}

function pointerMoveOnApplication(uniqueID, pointerX, pointerY, data, obj, localPt, portalId) {
	var btn = SAGE2Items.applications.findButtonByPoint(obj.id, localPt);

	// pointer move on app window
	if (btn === null) {
		removeExistingHoverCorner(uniqueID, portalId);
		if (remoteInteraction[uniqueID].appInteractionMode()) {
			sendPointerMoveToApplication(uniqueID, obj.data, pointerX, pointerY, data);
		}
		return;
	}

	var ts;
	switch (btn.id) {
		case "titleBar": {
			removeExistingHoverCorner(uniqueID, portalId);
			break;
		}
		case "dragCorner": {
			if (obj.data.application === "Webview") {
				// resize corner only in window mode
				if (!sagePointers[uniqueID].visible || remoteInteraction[uniqueID].windowManagementMode()) {
					if (remoteInteraction[uniqueID].hoverCornerItem === null) {
						remoteInteraction[uniqueID].setHoverCornerItem(obj.data);
						broadcast('hoverOverItemCorner', {elemId: obj.data.id, flag: true});
						if (portalId !== undefined && portalId !== null) {
							ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
							remoteSharingSessions[portalId].wsio.emit('remoteSagePointerHoverCorner',
								{appHoverCorner: {elemId: obj.data.id, flag: true}, date: ts});
						}
					} else if (remoteInteraction[uniqueID].hoverCornerItem.id !== obj.data.id) {
						broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false});
						if (portalId !== undefined && portalId !== null) {
							ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
							remoteSharingSessions[portalId].wsio.emit('remoteSagePointerHoverCorner',
								{appHoverCorner: {elemId: remoteInteraction[uniqueID].hoverCornerItem.id,
									flag: false}, date: ts});
						}
						remoteInteraction[uniqueID].setHoverCornerItem(obj.data);
						broadcast('hoverOverItemCorner', {elemId: obj.data.id, flag: true});
						if (portalId !== undefined && portalId !== null) {
							ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
							remoteSharingSessions[portalId].wsio.emit('remoteSagePointerHoverCorner',
								{appHoverCorner: {elemId: obj.data.id, flag: true}, date: ts});
						}
					}
				}
			} else {
				if (remoteInteraction[uniqueID].hoverCornerItem === null) {
					remoteInteraction[uniqueID].setHoverCornerItem(obj.data);
					broadcast('hoverOverItemCorner', {elemId: obj.data.id, flag: true});
					if (portalId !== undefined && portalId !== null) {
						ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
						remoteSharingSessions[portalId].wsio.emit('remoteSagePointerHoverCorner',
							{appHoverCorner: {elemId: obj.data.id, flag: true}, date: ts});
					}
				} else if (remoteInteraction[uniqueID].hoverCornerItem.id !== obj.data.id) {
					broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false});
					if (portalId !== undefined && portalId !== null) {
						ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
						remoteSharingSessions[portalId].wsio.emit('remoteSagePointerHoverCorner',
							{appHoverCorner: {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false}, date: ts});
					}
					remoteInteraction[uniqueID].setHoverCornerItem(obj.data);
					broadcast('hoverOverItemCorner', {elemId: obj.data.id, flag: true});
					if (portalId !== undefined && portalId !== null) {
						ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
						remoteSharingSessions[portalId].wsio.emit('remoteSagePointerHoverCorner',
							{appHoverCorner: {elemId: obj.data.id, flag: true}, date: ts});
					}
				}
			}
			break;
		}
		case "fullscreenButton": {
			removeExistingHoverCorner(uniqueID, portalId);
			break;
		}
		case "pinButton": {
			removeExistingHoverCorner(uniqueID, portalId);
			break;
		}
		case "closeButton": {
			removeExistingHoverCorner(uniqueID, portalId);
			break;
		}
	}
}

function pointerMoveOnPartition(uniqueID, pointerX, pointerY, data, obj, localPt, portalId) {
	var btn = partitions.findButtonByPoint(obj.id, localPt);

	// pointer press on app window
	if (btn === null || draggingPartition[uniqueID]) {
		return;
	}

	switch (btn.id) {
		case "titleBar":

			break;
		case "dragCorner":
			if (remoteInteraction[uniqueID].hoverCornerItem === null) {
				remoteInteraction[uniqueID].setHoverCornerItem(obj.data);
				broadcast('hoverOverItemCorner', {elemId: obj.data.id, flag: true});

			} else if (remoteInteraction[uniqueID].hoverCornerItem.id !== obj.data.id) {
				broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false});

				remoteInteraction[uniqueID].setHoverCornerItem(obj.data);
				broadcast('hoverOverItemCorner', {elemId: obj.data.id, flag: true});
			}
			break;
		case "tileButton":

			break;
		case "clearButton":

			break;
		case "fullscreenButton":

			break;
		case "closeButton":

			break;
	}
}

function pointerMoveOnDataSharingPortal(uniqueID, pointerX, pointerY, data, obj, localPt) {
	var scaledPt = {x: localPt.x / obj.data.scale, y: (localPt.y - config.ui.titleBarHeight) / obj.data.scale};

	if (remoteInteraction[uniqueID].portal === null || remoteInteraction[uniqueID].portal.id !== obj.data.id) {
		remoteInteraction[uniqueID].portal = obj.data;
		var rPointer = {
			id: uniqueID,
			left: scaledPt.x,
			top: scaledPt.y,
			label: sagePointers[uniqueID].label,
			color: sagePointers[uniqueID].color
		};
		remoteSharingSessions[remoteInteraction[uniqueID].portal.id].wsio.emit('startRemoteSagePointer', rPointer);
	}
	remoteSharingSessions[obj.data.id].wsio.emit('remoteSagePointerPosition', {id: uniqueID, left: scaledPt.x, top: scaledPt.y});

	var btn = SAGE2Items.portals.findButtonByPoint(obj.id, localPt);

	// pointer move on portal window
	if (btn === null) {
		var pObj = SAGE2Items.portals.interactMgr[obj.data.id].searchGeometry(scaledPt);
		if (pObj === null) {
			removeExistingHoverCorner(uniqueID, obj.data.id);
			return;
		}

		var pLocalPt = globalToLocal(scaledPt.x, scaledPt.y, pObj.type, pObj.geometry);
		switch (pObj.layerId) {
			case "radialMenus": {
				removeExistingHoverCorner(uniqueID, obj.data.id);
				break;
			}
			case "widgets": {
				removeExistingHoverCorner(uniqueID, obj.data.id);
				break;
			}
			case "applications": {
				pointerMoveOnApplication(uniqueID, scaledPt.x, scaledPt.y, data, pObj, pLocalPt, obj.data.id);
				break;
			}
		}
		return;
	}

	switch (btn.id) {
		case "titleBar": {
			removeExistingHoverCorner(uniqueID, obj.data.id);
			break;
		}
		case "dragCorner": {
			if (remoteInteraction[uniqueID].windowManagementMode()) {
				if (remoteInteraction[uniqueID].hoverCornerItem === null) {
					remoteInteraction[uniqueID].setHoverCornerItem(obj.data);
					broadcast('hoverOverItemCorner', {elemId: obj.data.id, flag: true});
				} else if (remoteInteraction[uniqueID].hoverCornerItem.id !== obj.data.id) {
					broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false});
					var ts = Date.now() + remoteSharingSessions[obj.data.id].timeOffset;
					remoteSharingSessions[obj.data.id].wsio.emit('remoteSagePointerHoverCorner',
						{appHoverCorner: {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false}, date: ts});
					remoteInteraction[uniqueID].setHoverCornerItem(obj.data);
					broadcast('hoverOverItemCorner', {elemId: obj.data.id, flag: true});
				}
			} else if (remoteInteraction[uniqueID].appInteractionMode()) {
				// sendPointerMoveToApplication(uniqueID, obj.data, pointerX, pointerY, data);
			}
			break;
		}
		case "fullscreenButton": {
			removeExistingHoverCorner(uniqueID, obj.data.id);
			break;
		}
		case "pinButton": {
			removeExistingHoverCorner(uniqueID, obj.data.id);
			break;
		}
		case "closeButton": {
			removeExistingHoverCorner(uniqueID, obj.data.id);
			break;
		}
	}
}

function removeExistingHoverCorner(uniqueID, portalId) {
	// remove hover corner if exists
	if (remoteInteraction[uniqueID].hoverCornerItem !== null) {
		broadcast('hoverOverItemCorner', {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false});
		if (portalId !== undefined && portalId !== null) {
			var ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
			remoteSharingSessions[portalId].wsio.emit('remoteSagePointerHoverCorner',
				{appHoverCorner: {elemId: remoteInteraction[uniqueID].hoverCornerItem.id, flag: false}, date: ts});
		}
		remoteInteraction[uniqueID].setHoverCornerItem(null);
	}
}

function moveApplicationWindow(uniqueID, moveApp, portalId) {
	var app = SAGE2Items.applications.list[moveApp.elemId];

	var titleBarHeight = config.ui.titleBarHeight;
	if (portalId !== undefined && portalId !== null) {
		titleBarHeight = remoteSharingSessions[portalId].portal.titleBarHeight;
	}
	var im = findInteractableManager(moveApp.elemId);
	if (im) {
		drawingManager.applicationMoved(moveApp.elemId, moveApp.elemLeft, moveApp.elemTop);
		im.editGeometry(moveApp.elemId, "applications", "rectangle",
			{x: moveApp.elemLeft, y: moveApp.elemTop, w: moveApp.elemWidth, h: moveApp.elemHeight + titleBarHeight});
		broadcast('setItemPosition', moveApp);
		if (SAGE2Items.renderSync.hasOwnProperty(moveApp.elemId)) {
			calculateValidBlocks(app, mediaBlockSize, SAGE2Items.renderSync[app.id]);
			if (app.id in SAGE2Items.renderSync && SAGE2Items.renderSync[app.id].newFrameGenerated === false) {
				handleNewVideoFrame(app.id);
			}
		}

		if (portalId !== undefined && portalId !== null) {
			var ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
			remoteSharingSessions[portalId].wsio.emit('updateApplicationPosition',
				{appPositionAndSize: moveApp, portalId: portalId, date: ts});
		}

		var updatedStickyItems = stickyAppHandler.moveItemsStickingToUpdatedItem(app);
		for (var idx = 0; idx < updatedStickyItems.length; idx++) {
			var stickyItem = updatedStickyItems[idx];
			im.editGeometry(stickyItem.elemId, "applications", "rectangle", {
				x: stickyItem.elemLeft, y: stickyItem.elemTop,
				w: stickyItem.elemWidth, h: stickyItem.elemHeight + config.ui.titleBarHeight
			});
			broadcast('setItemPosition', updatedStickyItems[idx]);
		}
	}
}

function moveAndResizeApplicationWindow(resizeApp, portalId) {
	// Shift position up and left by one pixel to take border into account
	//    visible in hide-ui mode
	resizeApp.elemLeft = resizeApp.elemLeft - 1;
	resizeApp.elemTop  = resizeApp.elemTop  - 1;

	var app = SAGE2Items.applications.list[resizeApp.elemId];

	var titleBarHeight = config.ui.titleBarHeight;
	if (portalId !== undefined && portalId !== null) {
		titleBarHeight = remoteSharingSessions[portalId].portal.titleBarHeight;
	}
	var im = findInteractableManager(resizeApp.elemId);
	drawingManager.applicationMoved(resizeApp.elemId, resizeApp.elemLeft, resizeApp.elemTop);
	drawingManager.applicationResized(resizeApp.elemId, resizeApp.elemWidth, resizeApp.elemHeight + titleBarHeight,
		{x: resizeApp.elemLeft, y: resizeApp.elemTop});
	im.editGeometry(resizeApp.elemId, "applications", "rectangle",
		{x: resizeApp.elemLeft, y: resizeApp.elemTop, w: resizeApp.elemWidth, h: resizeApp.elemHeight + titleBarHeight});
	handleApplicationResize(resizeApp.elemId);
	broadcast('setItemPositionAndSize', resizeApp);
	if (SAGE2Items.renderSync.hasOwnProperty(resizeApp.elemId)) {
		calculateValidBlocks(app, mediaBlockSize, SAGE2Items.renderSync[app.id]);
		if (app.id in SAGE2Items.renderSync && SAGE2Items.renderSync[app.id].newFrameGenerated === false) {
			handleNewVideoFrame(app.id);
		}
	}

	if (portalId !== undefined && portalId !== null) {
		var ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
		remoteSharingSessions[portalId].wsio.emit('updateApplicationPositionAndSize',
			{appPositionAndSize: resizeApp, portalId: portalId, date: ts});
	}

	var updatedStickyItems = stickyAppHandler.moveItemsStickingToUpdatedItem(app);
	for (var idx = 0; idx < updatedStickyItems.length; idx++) {
		var stickyItem = updatedStickyItems[idx];
		im.editGeometry(stickyItem.elemId, "applications", "rectangle", {
			x: stickyItem.elemLeft, y: stickyItem.elemTop,
			w: stickyItem.elemWidth, h: stickyItem.elemHeight + config.ui.titleBarHeight
		});
		broadcast('setItemPosition', updatedStickyItems[idx]);
	}
}

function moveAndResizePartitionWindow(uniqueID, movePartition) {
	if (partitions.list.hasOwnProperty(movePartition.elemId)) {
		var movedPtn = partitions.list[movePartition.elemId];


		// if it is a snapping partition, update all of the neighbors as well
		if (movedPtn.isSnapping) {

			// then update the neighboring partition positions
			var updatedNeighbors = movedPtn.updateNeighborPtnPositions();
			// update geometries/display/layout of any updated neighbors
			for (var neigh of updatedNeighbors) {
				partitions.updatePartitionGeometries(neigh, interactMgr);
				broadcast('partitionMoveAndResizeFinished', partitions.list[neigh].getDisplayInfo());

				updatePartitionInnerLayout(partitions.list[neigh], true);
			}

		}

		partitions.updatePartitionGeometries(movePartition.elemId, interactMgr);
		broadcast('partitionMoveAndResizeFinished', movedPtn.getDisplayInfo());
		updatePartitionInnerLayout(movedPtn, true);
	}
}

function updatePartitionInnerLayout(partition, animateAppMovement) {

	partition.updateInnerLayout();

	// update children of partition
	let updatedChildren = partition.updateChildrenPositions();

	for (let child of updatedChildren) {
		child.elemAnimate = animateAppMovement;
		moveAndResizeApplicationWindow(child);
	}

	for (let child of updatedChildren) {
		handleStickyItem(child.elemId);
	}
}

function moveDataSharingPortalWindow(movePortal) {
	interactMgr.editGeometry(movePortal.elemId, "portals", "rectangle", {
		x: movePortal.elemLeft, y: movePortal.elemTop,
		w: movePortal.elemWidth, h: movePortal.elemHeight + config.ui.titleBarHeight
	});
	broadcast('setItemPosition', movePortal);
}

function moveAndResizeDataSharingPortalWindow(resizePortal) {
	interactMgr.editGeometry(resizePortal.elemId, "portals", "rectangle",
		{x: resizePortal.elemLeft, y: resizePortal.elemTop,
			w: resizePortal.elemWidth, h: resizePortal.elemHeight + config.ui.titleBarHeight});
	handleDataSharingPortalResize(resizePortal.elemId);
	broadcast('setItemPositionAndSize', resizePortal);
}

function moveWidgetControls(uniqueID, moveControl) {
	var app = SAGE2Items.applications.list[moveControl.appId];
	if (app) {
		moveControl.appData = getAppPositionSize(app);
		broadcast('setControlPosition', moveControl);
		var radialGeometry =  {
			x: moveControl.elemLeft + (moveControl.elemHeight / 2),
			y: moveControl.elemTop + (moveControl.elemHeight / 2),
			r: moveControl.elemHeight / 2
		};
		var barGeometry = {
			x: moveControl.elemLeft + moveControl.elemHeight,
			y: moveControl.elemTop + (moveControl.elemHeight / 2) - (moveControl.elemBarHeight / 2),
			w: moveControl.elemWidth - moveControl.elemHeight, h: moveControl.elemBarHeight
		};

		if (moveControl.hasSideBar === true) {
			var shapeData = {
				radial: {
					type: "circle",
					visible: true,
					geometry: radialGeometry
				},
				sidebar: {
					type: "rectangle",
					visible: true,
					geometry: barGeometry
				}
			};
			interactMgr.editComplexGeometry(moveControl.elemId, "widgets", shapeData);
		} else {
			interactMgr.editGeometry(moveControl.elemId, "widgets", "circle", radialGeometry);
		}

		/*interactMgr.editGeometry(moveControl.elemId+"_radial", "widgets", "circle", circle);
		if(moveControl.hasSideBar === true) {
			interactMgr.editGeometry(moveControl.elemId+"_sidebar", "widgets", "rectangle", bar );
		}*/
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
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	removeExistingHoverCorner(uniqueID);

	// Whiteboard app
	if (drawingManager.drawingMode) {
		var color = sagePointers[uniqueID] ? sagePointers[uniqueID].color : null;
		drawingManager.pointerEvent(
			omicronManager.sageToOmicronEvent(uniqueID, pointerX, pointerY, data, 6, color),
			uniqueID, pointerX, pointerY, 10, 10);
	}

	// If obj is undefined (as in this case, will search for radial menu using uniqueID
	pointerReleaseOnRadialMenu(uniqueID, pointerX, pointerY, data);

	if (remoteInteraction[uniqueID].lockedControl() !== null) {
		releaseSlider(uniqueID);
	}

	var prevInteractionItem = remoteInteraction[uniqueID].releaseOnItem();
	if (prevInteractionItem) {
		showOrHideWidgetLinks({uniqueID: uniqueID, item: prevInteractionItem, show: false});
	}
	var obj;
	var selectedApp = remoteInteraction[uniqueID].selectedMoveItem || remoteInteraction[uniqueID].selectedResizeItem;
	var portal = {id: null};

	if (selectedApp !== undefined && selectedApp !== null) {
		obj = interactMgr.searchGeometry({x: pointerX, y: pointerY}, null, [selectedApp.id]);
		portal = findApplicationPortal(selectedApp) || {id: null};
	}	else {
		obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});
	}

	if (draggingPartition[uniqueID] && data.button === "left") {

		draggingPartition[uniqueID].ptn.left =
			pointerX < draggingPartition[uniqueID].start.x ?
				pointerX : draggingPartition[uniqueID].start.x;

		draggingPartition[uniqueID].ptn.top =
			pointerY < draggingPartition[uniqueID].start.y ?
				pointerY : draggingPartition[uniqueID].start.y;

		draggingPartition[uniqueID].ptn.width =
			pointerX < draggingPartition[uniqueID].start.x ?
				draggingPartition[uniqueID].start.x - pointerX : pointerX - draggingPartition[uniqueID].start.x;

		draggingPartition[uniqueID].ptn.height =
			pointerY < draggingPartition[uniqueID].start.y ?
				draggingPartition[uniqueID].start.y - pointerY : pointerY - draggingPartition[uniqueID].start.y;

		// if the partition is much too small (most likely created by mistake)
		if (draggingPartition[uniqueID].ptn.width < 25 || draggingPartition[uniqueID].ptn.height < 25) {

			// delete the partition
			// broadcast('deletePartitionWindow', partitions.list[draggingPartition[uniqueID].ptn.id].getDisplayInfo());
			// partitions.removePartition(draggingPartition[uniqueID].ptn.id);
			// interactMgr.removeGeometry(draggingPartition[uniqueID].ptn.id, "partitions");

			deletePartition(draggingPartition[uniqueID].ptn.id);
		} else {
			// increase partition width to minimum width if too thin
			if (draggingPartition[uniqueID].ptn.width < partitions.minSize.width) {
				draggingPartition[uniqueID].ptn.width = partitions.minSize.width;
			}

			// increase partition height to minimum height if too short
			if (draggingPartition[uniqueID].ptn.height < partitions.minSize.height) {
				draggingPartition[uniqueID].ptn.height = partitions.minSize.height;
			}

			draggingPartition[uniqueID].ptn.aspect =
				draggingPartition[uniqueID].ptn.width / draggingPartition[uniqueID].ptn.height;

			partitions.updatePartitionGeometries(draggingPartition[uniqueID].ptn.id, interactMgr);
			broadcast('partitionMoveAndResizeFinished', draggingPartition[uniqueID].ptn.getDisplayInfo());

			broadcast('partitionWindowTitleUpdate', draggingPartition[uniqueID].ptn.getTitle());

			// make dragged partition grab content which it is under
			partitionsGrabAllContent();
		}
		// stop creation of partition
		delete draggingPartition[uniqueID];

		return;
	}

	if (cuttingPartition[uniqueID] && data.button === "left") {
		cuttingPartition[uniqueID].end = {x: pointerX, y: pointerY};

		var cutDirection = +(pointerX - cuttingPartition[uniqueID].start.x) >
			+(pointerY - cuttingPartition[uniqueID].start.y) ?
			"horizontal" : "vertical";

		var oldPtn = cuttingPartition[uniqueID].ptn;

		var newPtn1 = cuttingPartition[uniqueID].newPtn1;
		var newPtn2 = cuttingPartition[uniqueID].newPtn2;

		// if mouse is dragged outside of old partition, consider that to be a cancelled split, delete the new partitions
		// also do nothing if partition is not large enough to be split
		if (pointerX < oldPtn.left || pointerX > oldPtn.left + oldPtn.width ||
			pointerY < oldPtn.top || pointerY > oldPtn.top + oldPtn.height ||
			(cutDirection === "horizontal" && oldPtn.height < partitions.minSize.height * 2) ||
			(cutDirection === "vertical" && oldPtn.width < partitions.minSize.width * 2)) {

			// cancel operation, delete new partitions
			if (newPtn1) {
				deletePartition(newPtn1.id);
			}
			if (newPtn2) {
				deletePartition(newPtn2.id);
			}

		} else {
			// otherwise, delete old partition, assign items to new partitions

			// make sure that the new partitions exist
			// it is possible that they wouldn't if the drag gesture was too small
			// if they don't exist, do nothing
			if (newPtn1 && newPtn2) {
				var cutPtnItems = Object.assign({}, oldPtn.children);
				// var ptnColor = oldPtn.color;
				var ptnTiled = oldPtn.innerTiling; // to preserve tiling of new partitions
				var ptnSnapping = oldPtn.isSnapping;

				// delete the old partition
				deletePartition(oldPtn.id);

				// reassign content from oldPtn to the 2 new partitions
				for (var key in cutPtnItems) {
					partitions.updateOnItemRelease(cutPtnItems[key]);
				}

				newPtn1.isSnapping = ptnSnapping;
				newPtn2.isSnapping = ptnSnapping;

				if (ptnSnapping) {
					partitions.updateNeighbors(newPtn1.id);
					partitions.updateNeighbors(newPtn2.id);

					// after calculating neighbors, update display
					broadcast('updatePartitionSnapping', newPtn1.getDisplayInfo());
					for (let p of Object.keys(newPtn1.neighbors)) {
						if (partitions.list[p]) {
							broadcast('updatePartitionSnapping', partitions.list[p].getDisplayInfo());
						}
					}

					// after calculating neighbors, update display
					broadcast('updatePartitionSnapping', newPtn2.getDisplayInfo());
					for (let p of Object.keys(newPtn2.neighbors)) {
						if (partitions.list[p]) {
							broadcast('updatePartitionSnapping', partitions.list[p].getDisplayInfo());
						}
					}
				}

				// if the old partition was tiled, set the new displays to be tiled
				if (ptnTiled) {
					newPtn1.toggleInnerTiling();
					updatePartitionInnerLayout(newPtn1, true);

					newPtn2.toggleInnerTiling();
					updatePartitionInnerLayout(newPtn2, true);
				}

				// update parititon titles
				broadcast('partitionWindowTitleUpdate', newPtn1.getTitle());
				broadcast('partitionWindowTitleUpdate', newPtn2.getTitle());

				// return borders to normal
				broadcast('updatePartitionBorders', {id: newPtn1.id, highlight: false});
				broadcast('updatePartitionBorders', {id: newPtn2.id, highlight: false});
			}
		}

		// stop division of partition
		delete cuttingPartition[uniqueID];

		return;
	}

	// update parent partition of item when the app is released
	if (selectedApp && selectedApp.id && SAGE2Items.applications.list.hasOwnProperty(selectedApp.id)) {
		var changedPartitions = partitions.updateOnItemRelease(selectedApp, {x: pointerX, y: pointerY});

		moveAndResizeApplicationWindow({
			elemId: selectedApp.id, elemLeft: selectedApp.left,
			elemTop: selectedApp.top, elemWidth: selectedApp.width,
			elemHeight: selectedApp.height, date: new Date()
		});

		changedPartitions.forEach(el => {
			broadcast('partitionWindowTitleUpdate', partitions.list[el].getTitle());

			updatePartitionInnerLayout(partitions.list[el], true);
		});

		// remove partition edge highlight
		broadcast('updatePartitionBorders', null);
	}

	if (obj === null) {
		dropSelectedItem(uniqueID, true, portal.id);
		return;
	}

	var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
	switch (obj.layerId) {
		case "staticUI": {
			if (portal.id !== null) {
				dropSelectedItem(uniqueID, true, portal.id);
			}
			pointerReleaseOnStaticUI(uniqueID, pointerX, pointerY, obj, portal.id);
			break;
		}
		case "radialMenus": {
			pointerReleaseOnRadialMenu(uniqueID, pointerX, pointerY, data, obj);
			dropSelectedItem(uniqueID, true, portal.id);
			break;
		}
		case "applications": {
			if (dropSelectedItem(uniqueID, true, portal.id) === null) {
				if (remoteInteraction[uniqueID].appInteractionMode()) {
					sendPointerReleaseToApplication(uniqueID, obj.data, pointerX, pointerY, data);
				}
			}
			break;
		}
		case "partitions": {
			// pointer release on partition (no functionality yet)
			dropSelectedItem(uniqueID, true, portal.id);
			break;
		}
		case "portals": {
			pointerReleaseOnPortal(uniqueID, obj.data.id, localPt, data);
			break;
		}
		case "widgets": {
			pointerPressOrReleaseOnWidget(uniqueID, pointerX, pointerY, data, obj, localPt, "release");
			dropSelectedItem(uniqueID, true, portal.id);
			break;
		}
		default: {
			dropSelectedItem(uniqueID, true, portal.id);
		}
	}
}

function pointerReleaseOnStaticUI(uniqueID, pointerX, pointerY, obj) {
	// don't allow data-pushing
	// dropSelectedItem(uniqueID, true);

	/*
	var remote = obj.data;
	var app = dropSelectedItem(uniqueID, false, null);
	if (app !== null && SAGE2Items.applications.list.hasOwnProperty(app.application.id) && remote.connected) {
		remote.wsio.emit('addNewElementFromRemoteServer', app.application);

		var eLogData = {
			host: remote.wsio.remoteAddress.address,
			port: remote.wsio.remoteAddress.port,
			application: {
				id: app.application.id,
				type: app.application.application
			}
		};
		addEventToUserLog(uniqueID, {type: "shareApplication", data: eLogData, time: Date.now()});
	}
	*/

	var remote = obj.data;
	var app = dropSelectedItem(uniqueID, false, null);
	if (app !== null && SAGE2Items.applications.list.hasOwnProperty(app.application.id) && remote.connected === "on") {
		var sharedId = app.application.id + "_" + config.host + ":" + config.secure_port + "+" + remote.wsio.id;
		if (sharedApps[app.application.id] === undefined) {
			sharedApps[app.application.id] = [{wsio: remote.wsio, sharedId: sharedId}];
		} else {
			sharedApps[app.application.id].push({wsio: remote.wsio, sharedId: sharedId});
		}

		SAGE2Items.applications.editButtonVisibilityOnItem(app.application.id, "syncButton", true);

		remote.wsio.emit('addNewSharedElementFromRemoteServer',
			{application: app.application, id: sharedId, remoteAppId: app.application.id});
		broadcast('setAppSharingFlag', {id: app.application.id, sharing: true});

		var eLogData = {
			host: remote.wsio.remoteAddress.address,
			port: remote.wsio.remoteAddress.port,
			application: {
				id: app.application.id,
				type: app.application.application
			}
		};
		addEventToUserLog(uniqueID, {type: "shareApplication", data: eLogData, time: Date.now()});
	}
}

function pointerReleaseOnPortal(uniqueID, portalId, localPt, data) {
	var obj = interactMgr.getObject(portalId, "portals");

	var selectedApp = remoteInteraction[uniqueID].selectedMoveItem || remoteInteraction[uniqueID].selectedResizeItem;
	if (selectedApp) {
		var portal = findApplicationPortal(selectedApp);
		if (portal !== undefined && portal !== null && portal.id === portalId) {
			dropSelectedItem(uniqueID, true, portalId);
			return;
		}

		var app = dropSelectedItem(uniqueID, false, null);
		localPt = globalToLocal(app.previousPosition.left, app.previousPosition.top, obj.type, obj.geometry);
		var remote = remoteSharingSessions[obj.id];
		createAppFromDescription(app.application, function(appInstance, videohandle) {
			if (appInstance.application === "media_stream" || appInstance.application === "media_block_stream") {
				appInstance.id = app.application.id + "_" + obj.data.id;
			} else {
				appInstance.id = getUniqueSharedAppId(obj.data.id);
			}

			appInstance.left = localPt.x / obj.data.scale;
			appInstance.top = (localPt.y - config.ui.titleBarHeight) / obj.data.scale;
			appInstance.width = app.previousPosition.width / obj.data.scale;
			appInstance.height = app.previousPosition.height / obj.data.scale;

			remoteSharingSessions[obj.data.id].appCount++;

			// if (SAGE2Items.renderSync.hasOwnProperty(app.id) {
			var i;
			SAGE2Items.renderSync[appInstance.id] = {clients: {}, date: Date.now()};
			for (i = 0; i < clients.length; i++) {
				if (clients[i].clientType === "display") {
					SAGE2Items.renderSync[appInstance.id].clients[clients[i].id] = {
						wsio: clients[i], readyForNextFrame: false, blocklist: []
					};
				}
			}
			handleNewApplicationInDataSharingPortal(appInstance, videohandle, obj.data.id);

			remote.wsio.emit('addNewRemoteElementInDataSharingPortal', appInstance);

			var eLogData = {
				host: remote.portal.host,
				port: remote.portal.port,
				application: {
					id: appInstance.id,
					type: appInstance.application
				}
			};
			addEventToUserLog(uniqueID, {type: "shareApplication", data: eLogData, time: Date.now()});
		});
	} else {
		if (remoteInteraction[uniqueID].appInteractionMode()) {
			var scaledPt = {x: localPt.x / obj.data.scale, y: (localPt.y - config.ui.titleBarHeight) / obj.data.scale};
			var pObj = SAGE2Items.portals.interactMgr[portalId].searchGeometry(scaledPt);
			if (pObj === null) {
				return;
			}

			// var pLocalPt = globalToLocal(scaledPt.x, scaledPt.y, pObj.type, pObj.geometry);
			switch (pObj.layerId) {
				case "radialMenus": {
					break;
				}
				case "widgets": {
					break;
				}
				case "applications": {
					sendPointerReleaseToApplication(uniqueID, pObj.data, scaledPt.x, scaledPt.y, data);
					break;
				}
			}
		}
	}
}

function pointerReleaseOnRadialMenu(uniqueID, pointerX, pointerY, data, obj) {
	if (obj === undefined) {
		for (var key in SAGE2Items.radialMenus.list) {
			radialMenu = SAGE2Items.radialMenus.list[key];
			// console.log(data.id+"_menu: " + radialMenu);
			if (radialMenu !== undefined) {
				radialMenu.onRelease(uniqueID);
			}
		}
		// If pointer release is outside window, use the pointerRelease type to end the
		// scroll event, but don't trigger any clicks because of a 'null' button (clicks expects a left/right)
		data = { button: "null", color: sagePointers[uniqueID].color };
		radialMenuEvent({type: "pointerRelease", id: uniqueID, x: pointerX, y: pointerY, data: data});
	} else {
		var radialMenu = obj.data;
		if (obj.id.indexOf("menu_radial_button") !== -1) {
			// Pressing on radial menu button
			// console.log("pointer release on radial button: " + obj.id);
			radialMenu.onRelease(uniqueID);
			var menuState = radialMenu.onButtonEvent(obj.id, uniqueID, "pointerRelease");
			if (menuState !== undefined) {
				radialMenuEvent({type: "stateChange", menuID: radialMenu.id, menuState: menuState });
			}
		}  else if (obj.id.indexOf("menu_thumbnail") !== -1) {
			// PointerRelease on thumbnail window
			// console.log("Pointer release on thumbnail window");
			data = { button: data.button, color: sagePointers[uniqueID].color };
			radialMenuEvent({type: "pointerRelease", id: uniqueID, x: pointerX, y: pointerY, data: data});
		} else {
			// Not on a button
			radialMenu = obj.data.onRelease(uniqueID);
		}
	}
}

function dropSelectedItem(uniqueID, valid, portalId) {
	var item;
	var position;
	if (remoteInteraction[uniqueID].selectedMoveItem !== null) {
		// check which list contains the move item selected
		if (SAGE2Items.portals.list.hasOwnProperty(remoteInteraction[uniqueID].selectedMoveItem.id)) {
			// if the item is a portal
			item = SAGE2Items.portals.list[remoteInteraction[uniqueID].selectedMoveItem.id];
		} else if (partitions.list.hasOwnProperty(remoteInteraction[uniqueID].selectedMoveItem.id)) {
			// if the item is a partition
			item = partitions.list[remoteInteraction[uniqueID].selectedMoveItem.id];
		} else {
			item = SAGE2Items.applications.list[remoteInteraction[uniqueID].selectedMoveItem.id];
		}

		if (item) {
			position = {left: item.left, top: item.top, width: item.width, height: item.height};
			dropMoveItem(uniqueID, item, valid, portalId);
			return {application: item, previousPosition: position};
		}
	} else if (remoteInteraction[uniqueID].selectedResizeItem !== null) {
		// check which list contains the item selected
		if (SAGE2Items.portals.list.hasOwnProperty(remoteInteraction[uniqueID].selectedResizeItem.id)) {
			// if the item is a portal
			item = SAGE2Items.portals.list[remoteInteraction[uniqueID].selectedResizeItem.id];
		} else if (partitions.list.hasOwnProperty(remoteInteraction[uniqueID].selectedResizeItem.id)) {
			// if the item is a partition
			item = partitions.list[remoteInteraction[uniqueID].selectedResizeItem.id];
		} else {
			item = SAGE2Items.applications.list[remoteInteraction[uniqueID].selectedResizeItem.id];
		}

		if (item) {
			position = {left: item.left, top: item.top, width: item.width, height: item.height};
			dropResizeItem(uniqueID, item, portalId);
			return {application: item, previousPosition: position};
		}
	}
	return null;
}

function dropMoveItem(uniqueID, app, valid, portalId) {
	if (valid !== false) {
		valid = true;
	}

	var updatedItem = remoteInteraction[uniqueID].releaseItem(valid);
	if (updatedItem !== null) {
		moveApplicationWindow(uniqueID, updatedItem, portalId);
	}
	handleStickyItem(app.id);
	broadcast('finishedMove', {id: app.id, date: Date.now()});

	if (portalId !== undefined && portalId !== null) {
		var ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
		remoteSharingSessions[portalId].wsio.emit('finishApplicationMove', {id: uniqueID, appId: app.id, date: ts});
	}

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

function dropResizeItem(uniqueID, app, portalId) {
	remoteInteraction[uniqueID].releaseItem(true);

	broadcast('finishedResize', {id: app.id, date: Date.now()});

	if (portalId !== undefined && portalId !== null) {
		var ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
		remoteSharingSessions[portalId].wsio.emit('finishApplicationResize', {id: uniqueID, appId: app.id, date: ts});
	}

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
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});
	if (obj === null) {
		return;
	}

	var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
	switch (obj.layerId) {
		case "applications": {
			pointerDblClickOnApplication(uniqueID, pointerX, pointerY, obj, localPt);
			break;
		}
		case "portals": {
			break;
		}
	}
}

function pointerDblClickOnApplication(uniqueID, pointerX, pointerY, obj, localPt) {
	var btn = SAGE2Items.applications.findButtonByPoint(obj.id, localPt);

	// pointer press on app window
	if (btn === null) {
		if (remoteInteraction[uniqueID].windowManagementMode()) {
			toggleApplicationFullscreen(uniqueID, obj.data, true);
		} else {
			sendPointerDblClickToApplication(uniqueID, obj.data, pointerX, pointerY);
		}
		return;
	}

	switch (btn.id) {
		case "titleBar": {
			toggleApplicationFullscreen(uniqueID, obj.data, true);
			break;
		}
		case "dragCorner": {
			break;
		}
		case "fullscreenButton": {
			break;
		}
		case "pinButton": {
			break;
		}
		case "closeButton": {
			break;
		}
	}
}

function pointerScrollStart(uniqueID, pointerX, pointerY) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});

	if (obj === null) {
		return;
	}

	var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
	switch (obj.layerId) {
		case "staticUI": {
			break;
		}
		case "radialMenus": {
			break;
		}
		case "widgets": {
			break;
		}
		case "applications": {
			pointerScrollStartOnApplication(uniqueID, pointerX, pointerY, obj, localPt);
			break;
		}
		case "portals": {
			break;
		}
	}
}

function pointerScrollStartOnApplication(uniqueID, pointerX, pointerY, obj, localPt) {
	var btn = SAGE2Items.applications.findButtonByPoint(obj.id, localPt);

	interactMgr.moveObjectToFront(obj.id, obj.layerId);
	var app = SAGE2Items.applications.list[obj.id];
	var stickyList = stickyAppHandler.getStickingItems(app);
	for (var idx in stickyList) {
		interactMgr.moveObjectToFront(stickyList[idx].id, "applications", ["portals"]);
	}
	var newOrder = interactMgr.getObjectZIndexList("applications", ["portals"]);
	broadcast('updateItemOrder', newOrder);

	// pointer scroll on app window
	if (btn === null) {
		if (remoteInteraction[uniqueID].windowManagementMode()) {
			selectApplicationForScrollResize(uniqueID, obj.data, pointerX, pointerY);
		} else if (remoteInteraction[uniqueID].appInteractionMode()) {
			remoteInteraction[uniqueID].selectWheelItem = obj.data;
			remoteInteraction[uniqueID].selectWheelDelta = 0;
		}
		return;
	}

	switch (btn.id) {
		case "titleBar": {
			selectApplicationForScrollResize(uniqueID, obj.data, pointerX, pointerY);
			break;
		}
		case "dragCorner": {
			if (remoteInteraction[uniqueID].windowManagementMode()) {
				selectApplicationForScrollResize(uniqueID, obj.data, pointerX, pointerY);
			} else if (remoteInteraction[uniqueID].appInteractionMode()) {
				remoteInteraction[uniqueID].selectWheelItem = obj.data;
				remoteInteraction[uniqueID].selectWheelDelta = 0;
			}
			break;
		}
		case "fullscreenButton": {
			selectApplicationForScrollResize(uniqueID, obj.data, pointerX, pointerY);
			break;
		}
		case "pinButton": {
			selectApplicationForScrollResize(uniqueID, obj.data, pointerX, pointerY);
			break;
		}
		case "closeButton": {
			selectApplicationForScrollResize(uniqueID, obj.data, pointerX, pointerY);
			break;
		}
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

	addEventToUserLog(uniqueID, {type: "windowManagement", data:
		{type: "move", action: "start", application: a, location: l}, time: Date.now()});
	addEventToUserLog(uniqueID, {type: "windowManagement", data:
		{type: "resize", action: "start", application: a, location: l}, time: Date.now()});
}

function pointerScroll(uniqueID, data) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	var pointerX = sagePointers[uniqueID].left;
	var pointerY = sagePointers[uniqueID].top;

	var scale = 1.0 + Math.abs(data.wheelDelta) / 512;
	if (data.wheelDelta > 0) {
		scale = 1.0 / scale;
	}

	var updatedResizeItem = remoteInteraction[uniqueID].scrollSelectedItem(scale);
	if (updatedResizeItem !== null) {
		moveAndResizeApplicationWindow(updatedResizeItem);
	} else {
		var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});

		if (obj === null) {
			return;
		}

		// var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
		switch (obj.layerId) {
			case "staticUI": {
				break;
			}
			case "radialMenus": {
				sendPointerScrollToRadialMenu(uniqueID, obj, pointerX, pointerY, data);
				break;
			}
			case "widgets": {
				break;
			}
			case "applications": {
				sendPointerScrollToApplication(uniqueID, obj.data, pointerX, pointerY, data);
				break;
			}
		}
	}
}

function sendPointerScrollToRadialMenu(uniqueID, obj, pointerX, pointerY, data) {
	if (obj.id.indexOf("menu_thumbnail") !== -1) {
		var event = { button: data.button, color: sagePointers[uniqueID].color, wheelDelta: data.wheelDelta };
		radialMenuEvent({type: "pointerScroll", id: uniqueID, x: pointerX, y: pointerY, data: event});
	}
	remoteInteraction[uniqueID].selectWheelDelta += data.wheelDelta;
}

function sendPointerScrollToApplication(uniqueID, app, pointerX, pointerY, data) {
	var ePosition = {x: pointerX - app.left, y: pointerY - (app.top + config.ui.titleBarHeight)};
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};

	var event = {id: app.id, type: "pointerScroll", position: ePosition, user: eUser, data: data, date: Date.now()};

	broadcast('eventInItem', event);

	remoteInteraction[uniqueID].selectWheelDelta += data.wheelDelta;
}

function pointerScrollEnd(uniqueID) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

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

		addEventToUserLog(uniqueID, {type: "windowManagement",
			data: {type: "move", action: "end", application: a, location: l}, time: Date.now()});
		addEventToUserLog(uniqueID, {type: "windowManagement",
			data: {type: "resize", action: "end", application: a, location: l}, time: Date.now()});

		remoteInteraction[uniqueID].selectedScrollItem = null;
	} else {
		if (remoteInteraction[uniqueID].appInteractionMode()) {
			var app = remoteInteraction[uniqueID].selectWheelItem;
			if (app !== undefined && app !== null) {
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

function checkForSpecialKeys(uniqueID, code, flag) {
	switch (code) {
		case 16: {
			remoteInteraction[uniqueID].SHIFT = flag;
			break;
		}
		case 17: {
			remoteInteraction[uniqueID].CTRL = flag;
			break;
		}
		case 18: {
			remoteInteraction[uniqueID].ALT = flag;
			break;
		}
		case 20: {
			remoteInteraction[uniqueID].CAPS = flag;
			break;
		}
		case 91:
		case 92:
		case 93: {
			remoteInteraction[uniqueID].CMD = flag;
			break;
		}
	}
}

function keyDown(uniqueID, pointerX, pointerY, data) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	checkForSpecialKeys(uniqueID, data.code, true);

	// if (remoteInteraction[uniqueID].appInteractionMode()) {
	// luc: send keys to app anyway
	var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});

	if (obj === null) {
		return;
	}

	var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
	switch (obj.layerId) {
		case "staticUI": {
			break;
		}
		case "radialMenus": {
			break;
		}
		case "widgets": {
			break;
		}
		case "applications": {
			sendKeyDownToApplication(uniqueID, obj.data, localPt, data);
			break;
		}
		case "portals": {
			keyDownOnPortal(uniqueID, obj.data.id, localPt, data);
			break;
		}
	}
	// }
}

function sendKeyDownToApplication(uniqueID, app, localPt, data) {
	var portal = findApplicationPortal(app);
	var titleBarHeight = config.ui.titleBarHeight;
	if (portal !== undefined && portal !== null) {
		titleBarHeight = portal.data.titleBarHeight;
	}

	var ePosition = {x: localPt.x, y: localPt.y - titleBarHeight};
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
	var eData =  {
		code: data.code,
		state: "down",
		// add also the state of the special keys
		status: {
			SHIFT: remoteInteraction[uniqueID].SHIFT,
			CTRL:  remoteInteraction[uniqueID].CTRL,
			ALT:   remoteInteraction[uniqueID].ALT,
			CAPS:  remoteInteraction[uniqueID].CAPS,
			CMD:   remoteInteraction[uniqueID].CMD
		}
	};

	if (fileBufferManager.hasFileBufferForApp(app.id)) {
		eData.bufferUpdate = fileBufferManager.insertChar({appId: app.id, code: data.code,
			printable: false, user_id: sagePointers[uniqueID].id});
	}

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

function keyDownOnPortal(uniqueID, portalId, localPt, data) {
	checkForSpecialKeys(uniqueID, data.code, true);

	var portal = SAGE2Items.portals.list[portalId];
	var scaledPt = {x: localPt.x / portal.scale, y: (localPt.y - config.ui.titleBarHeight) / portal.scale};
	if (remoteInteraction[uniqueID].local && remoteInteraction[uniqueID].portal !== null) {
		var rData = {
			id: uniqueID,
			left: scaledPt.x,
			top: scaledPt.y,
			code: data.code
		};
		remoteSharingSessions[portalId].wsio.emit('remoteSageKeyDown', rData);
	}

	var pObj = SAGE2Items.portals.interactMgr[portalId].searchGeometry(scaledPt);

	if (pObj === null) {
		return;
	}

	// var pLocalPt = globalToLocal(scaledPt.x, scaledPt.y, pObj.type, pObj.geometry);
	switch (pObj.layerId) {
		case "radialMenus": {
			break;
		}
		case "widgets": {
			break;
		}
		case "applications": {
			sendKeyDownToApplication(uniqueID, pObj.data, scaledPt, data);
			break;
		}
	}
}

function keyUp(uniqueID, pointerX, pointerY, data) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	checkForSpecialKeys(uniqueID, data.code, false);

	if (remoteInteraction[uniqueID].modeChange !== undefined && (data.code === 9 || data.code === 16)) {
		return;
	}

	var lockedControl = remoteInteraction[uniqueID].lockedControl();

	if (lockedControl !== null) {
		var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label,
			color: sagePointers[uniqueID].color};
		var event = {code: data.code, printable: false, state: "up", ctrlId: lockedControl.ctrlId,
			appId: lockedControl.appId, instanceID: lockedControl.instanceID, user: eUser,
			date: Date.now()};
		broadcast('keyInTextInputWidget', event);
		if (data.code === 13) {
			// Enter key
			remoteInteraction[uniqueID].dropControl();
		}
		return;
	}

	var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});

	if (obj === null) {
		return;
	}

	var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
	switch (obj.layerId) {
		case "staticUI": {
			break;
		}
		case "radialMenus": {
			break;
		}
		case "widgets": {
			break;
		}
		case "applications": {
			if (remoteInteraction[uniqueID].windowManagementMode() &&
				(data.code === 8 || data.code === 46)) {
				// backspace or delete
				deleteApplication(obj.data.id);

				var eLogData = {
					application: {
						id: obj.data.id,
						type: obj.data.application
					}
				};
				addEventToUserLog(uniqueID, {type: "delete", data: eLogData, time: Date.now()});
			// } else {
			// 	sendKeyUpToApplication(uniqueID, obj.data, localPt, data);
			// }
			}
			// luc: send keys to app anyway
			sendKeyUpToApplication(uniqueID, obj.data, localPt, data);
			break;
		}
		case "portals": {
			keyUpOnPortal(uniqueID, obj.data.id, localPt, data);
			break;
		}
	}
}

function sendKeyUpToApplication(uniqueID, app, localPt, data) {
	var portal = findApplicationPortal(app);
	var titleBarHeight = config.ui.titleBarHeight;
	if (portal !== undefined && portal !== null) {
		titleBarHeight = portal.data.titleBarHeight;
	}

	var ePosition = {x: localPt.x, y: localPt.y - titleBarHeight};
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

function keyUpOnPortal(uniqueID, portalId, localPt, data) {
	checkForSpecialKeys(uniqueID, data.code, false);

	var portal = SAGE2Items.portals.list[portalId];
	var scaledPt = {x: localPt.x / portal.scale, y: (localPt.y - config.ui.titleBarHeight) / portal.scale};
	if (remoteInteraction[uniqueID].local && remoteInteraction[uniqueID].portal !== null) {
		var rData = {
			id: uniqueID,
			left: scaledPt.x,
			top: scaledPt.y,
			code: data.code
		};
		remoteSharingSessions[portalId].wsio.emit('remoteSageKeyUp', rData);
	}

	var pObj = SAGE2Items.portals.interactMgr[portalId].searchGeometry(scaledPt);

	if (pObj === null) {
		return;
	}

	// var pLocalPt = globalToLocal(scaledPt.x, scaledPt.y, pObj.type, pObj.geometry);
	switch (pObj.layerId) {
		case "radialMenus": {
			break;
		}
		case "widgets": {
			break;
		}
		case "applications": {
			sendKeyUpToApplication(uniqueID, pObj.data, scaledPt, data);
			break;
		}
	}
}

function keyPress(uniqueID, pointerX, pointerY, data) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	var modeSwitch = false;
	if (data.code === 9 && remoteInteraction[uniqueID].SHIFT && sagePointers[uniqueID].visible) {
		// shift + tab
		remoteInteraction[uniqueID].toggleModes();
		broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode});

		if (remoteInteraction[uniqueID].modeChange !== undefined) {
			clearTimeout(remoteInteraction[uniqueID].modeChange);
		}
		remoteInteraction[uniqueID].modeChange = setTimeout(function() {
			delete remoteInteraction[uniqueID].modeChange;
		}, 500);

		modeSwitch = true;
	}

	var lockedControl = remoteInteraction[uniqueID].lockedControl();
	if (lockedControl !== null) {
		var eUser = {
			id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label,
			color: sagePointers[uniqueID].color
		};
		var event = {
			code: data.code, printable: true, state: "press", ctrlId: lockedControl.ctrlId,
			appId: lockedControl.appId, instanceID: lockedControl.instanceID, user: eUser,
			date: Date.now()
		};
		broadcast('keyInTextInputWidget', event);
		if (data.code === 13) {
			// Enter key
			remoteInteraction[uniqueID].dropControl();
		}
		return;
	}

	var obj = interactMgr.searchGeometry({x: pointerX, y: pointerY});
	if (obj === null) {
		// if in empty space:
		// Pressing ? for help (with shift)
		if (data.code === 63 && remoteInteraction[uniqueID].SHIFT) {
			// Load the cheet sheet on the wall
			wsLoadApplication(null, {
				application: "/uploads/pdfs/cheat-sheet.pdf",
				user: "127.0.0.1:42",
				// position in center and 100pix down
				position: [0.5, 100]
			});
			// show a popup
			// broadcast('toggleHelp', {});
		}
		return;
	}

	var localPt = globalToLocal(pointerX, pointerY, obj.type, obj.geometry);
	switch (obj.layerId) {
		case "staticUI": {
			break;
		}
		case "radialMenus": {
			break;
		}
		case "widgets": {
			break;
		}
		case "applications": {
			// if (modeSwitch === false && remoteInteraction[uniqueID].appInteractionMode()) {
			// luc: send keys to app anyway
			if (modeSwitch === false) {
				sendKeyPressToApplication(uniqueID, obj.data, localPt, data);
			}
			break;
		}
		case "portals": {
			if (modeSwitch === true) {
				remoteSharingSessions[obj.data.id].wsio.emit('remoteSagePointerToggleModes',
					{id: uniqueID, mode: remoteInteraction[uniqueID].interactionMode});
			} else if (remoteInteraction[uniqueID].appInteractionMode()) {
				keyPressOnPortal(uniqueID, obj.data.id, localPt, data);
			}
			break;
		}
	}
}

function sendKeyPressToApplication(uniqueID, app, localPt, data) {
	var portal = findApplicationPortal(app);
	var titleBarHeight = config.ui.titleBarHeight;
	if (portal !== undefined && portal !== null) {
		titleBarHeight = portal.data.titleBarHeight;
	}

	var ePosition = {x: localPt.x, y: localPt.y - titleBarHeight};
	var eUser = {id: sagePointers[uniqueID].id, label: sagePointers[uniqueID].label, color: sagePointers[uniqueID].color};
	if (fileBufferManager.hasFileBufferForApp(app.id)) {
		data.bufferUpdate = fileBufferManager.insertChar({appId: app.id, code: data.code,
			printable: true, user_id: sagePointers[uniqueID].id});
	}
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

function keyPressOnPortal(uniqueID, portalId, localPt, data) {
	var portal = SAGE2Items.portals.list[portalId];
	var scaledPt = {x: localPt.x / portal.scale, y: (localPt.y - config.ui.titleBarHeight) / portal.scale};
	if (remoteInteraction[uniqueID].local && remoteInteraction[uniqueID].portal !== null) {
		var rData = {
			id: uniqueID,
			left: scaledPt.x,
			top: scaledPt.y,
			code: data.code,
			character: data.character
		};
		remoteSharingSessions[portalId].wsio.emit('remoteSageKeyPress', rData);
	}

	var pObj = SAGE2Items.portals.interactMgr[portalId].searchGeometry(scaledPt);

	if (pObj === null) {
		return;
	}

	// var pLocalPt = globalToLocal(scaledPt.x, scaledPt.y, pObj.type, pObj.geometry);
	switch (pObj.layerId) {
		case "radialMenus": {
			break;
		}
		case "widgets": {
			break;
		}
		case "applications": {
			sendKeyPressToApplication(uniqueID, pObj.data, scaledPt, data);
			break;
		}
	}
}


function toggleApplicationFullscreen(uniqueID, app, dblClick) {
	var resizeApp;
	if (app.maximized !== true) { // maximize
		resizeApp = remoteInteraction[uniqueID].maximizeSelectedItem(app);
	} else { // restore to previous
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

		addEventToUserLog(uniqueID, {type: "windowManagement",
			data: {type: "move", action: "start", application: a, location: l}, time: Date.now()});
		addEventToUserLog(uniqueID, {type: "windowManagement",
			data: {type: "resize", action: "start", application: a, location: l}, time: Date.now()});

		moveAndResizeApplicationWindow(resizeApp);

		if (app.partition) {
			updatePartitionInnerLayout(app.partition, true);
			broadcast('partitionWindowTitleUpdate', app.partition.getTitle());
		}

		broadcast('finishedMove', {id: resizeApp.elemId, date: Date.now()});
		broadcast('finishedResize', {id: resizeApp.elemId, date: Date.now()});

		addEventToUserLog(uniqueID, {type: "windowManagement",
			data: {type: "move", action: "end", application: a, location: l}, time: Date.now()});
		addEventToUserLog(uniqueID, {type: "windowManagement",
			data: {type: "resize", action: "end", application: a, location: l}, time: Date.now()});
	}
}

function deleteApplication(appId, portalId) {
	if (!SAGE2Items.applications.list.hasOwnProperty(appId)) {
		return;
	}

	var app = SAGE2Items.applications.list[appId];

	// if the app being deleted was in a partition, update partition
	if (app.partition) {

		let ptnId = app.partition.releaseChild(app.id)[0]; // only 1 partition effected

		if (partitions.list.hasOwnProperty(ptnId)) {
			// make sure this id is a partition
			updatePartitionInnerLayout(partitions.list[ptnId], true);
			broadcast('partitionWindowTitleUpdate', partitions.list[ptnId].getTitle());
		}
	}

	var application = app.application;
	if (application === "media_stream" || application === "media_block_stream") {
		var i;
		var mediaStreamData = appId.split("|");
		var sender = {wsio: null, clientId: mediaStreamData[0], streamId: parseInt(mediaStreamData[1], 10)};
		for (i = 0; i < clients.length; i++) {
			if (clients[i].id === sender.clientId) {
				sender.wsio = clients[i];
			}
		}
		if (sender.wsio !== null) {
			sender.wsio.emit('stopMediaCapture', {streamId: sender.streamId});
		}
	}

	var stickingItems = stickyAppHandler.getFirstLevelStickingItems(app);
	stickyAppHandler.removeElement(app);

	SAGE2Items.applications.removeItem(appId);
	var im = findInteractableManager(appId);
	im.removeGeometry(appId, "applications");
	var widgets = SAGE2Items.widgets.list;
	for (var w in widgets) {
		if (widgets.hasOwnProperty(w) && widgets[w].appId === appId) {
			im.removeGeometry(widgets[w].id, "widgets");
			SAGE2Items.widgets.removeItem(widgets[w].id);
		}
	}

	if (stickingItems.length > 0) {
		for (var s in stickingItems) {
			// When background gets deleted, sticking items stop sticking
			toggleStickyPin(stickingItems[s].id);
		}
	} else {
		// Refresh the pins on all the unpinned apps
		handleStickyItem(null);
	}


	broadcast('deleteElement', {elemId: appId});

	if (portalId !== undefined && portalId !== null) {
		var ts = Date.now() + remoteSharingSessions[portalId].timeOffset;
		remoteSharingSessions[portalId].wsio.emit('deleteApplication', {appId: appId, date: ts});
	}
}


function pointerDraw(uniqueID, data) {
	var ePos  = {x: 0, y: 0};
	var eUser = {id: null, label: 'drawing', color: [220, 10, 10]};
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


function pointerCloseGesture(uniqueID, pointerX, pointerY, time, gesture) {
	if (sagePointers[uniqueID] === undefined) {
		return;
	}

	var elem = null;
	if (elem !== null) {
		if (elem.closeGestureID === undefined && gesture === 0) { // gesture: 0 = down, 1 = hold/move, 2 = up
			elem.closeGestureID = uniqueID;
			// elem.closeGestureTime = time + closeGestureDelay; // Delay in ms
		} else if (elem.closeGestureTime <= time && gesture === 1) { // Held long enough, remove
			deleteApplication(elem);
		} else if (gesture === 2) { // Released, reset timer
			elem.closeGestureID = undefined;
		}
	}
}

function handleNewApplication(appInstance, videohandle) {
	// Create tracking for all apps by default stacking another state load value.
	// It must be done here due to how mergeObjects() works as specified in src/node-utils.js
	if (appInstance.data === null || appInstance.data === undefined) {
		appInstance.data = {};
	}
	appInstance.data.pointersOverApp = [];
	broadcast('createAppWindow', appInstance);
	broadcast('createAppWindowPositionSizeOnly', getAppPositionSize(appInstance));

	// reserve 20 backmost layers for partitions
	var zIndex = SAGE2Items.applications.numItems + SAGE2Items.portals.numItems + 20;
	interactMgr.addGeometry(appInstance.id, "applications", "rectangle", {
		x: appInstance.left, y: appInstance.top,
		w: appInstance.width, h: appInstance.height + config.ui.titleBarHeight},
	true, zIndex, appInstance);

	var cornerSize   = 0.2 * Math.min(appInstance.width, appInstance.height);
	var oneButton    = Math.round(config.ui.titleBarHeight) * (300 / 235);
	var buttonsPad   = 0.1 * oneButton;
	var startButtons = appInstance.width - Math.round(3 * oneButton + 2 * buttonsPad);

	/*
	var buttonsWidth = config.ui.titleBarHeight * (324.0/111.0);
	var buttonsPad   = config.ui.titleBarHeight * ( 10.0/111.0);
	var oneButton    = buttonsWidth / 2; // two buttons
	var startButtons = appInstance.width - buttonsWidth;
	*/

	SAGE2Items.applications.addItem(appInstance);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "titleBar", "rectangle",
		{x: 0, y: 0, w: appInstance.width, h: config.ui.titleBarHeight}, 0);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "syncButton", "rectangle",
		{x: startButtons, y: 0, w: oneButton, h: config.ui.titleBarHeight}, 1);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "fullscreenButton", "rectangle",
		{x: startButtons + (1 * (buttonsPad + oneButton)), y: 0, w: oneButton, h: config.ui.titleBarHeight}, 1);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "closeButton", "rectangle",
		{x: startButtons + (2 * (buttonsPad + oneButton)), y: 0, w: oneButton, h: config.ui.titleBarHeight}, 1);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "dragCorner", "rectangle", {
		x: appInstance.width - cornerSize,
		y: appInstance.height + config.ui.titleBarHeight - cornerSize,
		w: cornerSize, h: cornerSize
	}, 2);
	if (appInstance.sticky === true) {
		appInstance.pinned = true;
		SAGE2Items.applications.addButtonToItem(appInstance.id, "pinButton", "rectangle",
			{x: buttonsPad, y: 0, w: oneButton, h: config.ui.titleBarHeight}, 1);
		SAGE2Items.applications.editButtonVisibilityOnItem(appInstance.id, "pinButton", false);
		handleStickyItem(appInstance.id);
	}
	SAGE2Items.applications.editButtonVisibilityOnItem(appInstance.id, "syncButton", false);

	initializeLoadedVideo(appInstance, videohandle);

	// assign content to a partition immediately when it is created
	var changedPartitions = partitions.updateOnItemRelease(appInstance);
	changedPartitions.forEach((id => {
		updatePartitionInnerLayout(partitions.list[id], true);

		broadcast('partitionWindowTitleUpdate', partitions.list[id].getTitle());
	}));
}

function handleNewApplicationInDataSharingPortal(appInstance, videohandle, portalId) {
	broadcast('createAppWindowInDataSharingPortal', {portal: portalId, application: appInstance});

	var zIndex = remoteSharingSessions[portalId].appCount;
	var titleBarHeight = SAGE2Items.portals.list[portalId].titleBarHeight;
	SAGE2Items.portals.interactMgr[portalId].addGeometry(appInstance.id, "applications", "rectangle", {
		x: appInstance.left, y: appInstance.top,
		w: appInstance.width, h: appInstance.height + titleBarHeight
	}, true, zIndex, appInstance);

	var cornerSize = 0.2 * Math.min(appInstance.width, appInstance.height);
	var oneButton    = Math.round(titleBarHeight) * (300 / 235);
	var buttonsPad   = 0.1 * oneButton;
	var startButtons = appInstance.width - Math.round(3 * oneButton + 2 * buttonsPad);

	/*
	var buttonsWidth = titleBarHeight * (324.0/111.0);
	var buttonsPad   = titleBarHeight * ( 10.0/111.0);
	var oneButton    = buttonsWidth / 2; // two buttons
	var startButtons = appInstance.width - buttonsWidth;
	*/

	SAGE2Items.applications.addItem(appInstance);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "titleBar", "rectangle",
		{x: 0, y: 0, w: appInstance.width, h: titleBarHeight}, 0);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "syncButton", "rectangle",
		{x: startButtons, y: 0, w: oneButton, h: titleBarHeight}, 1);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "fullscreenButton", "rectangle",
		{x: startButtons + (1 * (buttonsPad + oneButton)), y: 0, w: oneButton, h: titleBarHeight}, 1);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "closeButton", "rectangle",
		{x: startButtons + (2 * (buttonsPad + oneButton)), y: 0, w: oneButton, h: titleBarHeight}, 1);
	SAGE2Items.applications.addButtonToItem(appInstance.id, "dragCorner", "rectangle", {
		x: appInstance.width - cornerSize, y: appInstance.height + titleBarHeight - cornerSize,
		w: cornerSize, h: cornerSize
	}, 2);
	if (appInstance.sticky === true) {
		appInstance.pinned = true;
		SAGE2Items.applications.addButtonToItem(appInstance.id, "pinButton", "rectangle",
			{x: buttonsPad, y: 0, w: oneButton, h: titleBarHeight}, 1);
		SAGE2Items.applications.editButtonVisibilityOnItem(appInstance.id, "pinButton", false);
		handleStickyItem(appInstance.id);
	}
	SAGE2Items.applications.editButtonVisibilityOnItem(appInstance.id, "syncButton", false);

	initializeLoadedVideo(appInstance, videohandle);
}

function handleApplicationResize(appId) {
	if (SAGE2Items.applications.list[appId] === undefined) {
		return;
	}

	var app = SAGE2Items.applications.list[appId];
	var portal = findApplicationPortal(app);
	var titleBarHeight = config.ui.titleBarHeight;
	if (portal !== undefined && portal !== null) {
		titleBarHeight = portal.data.titleBarHeight;
	}

	var cornerSize = 0.2 * Math.min(app.width, app.height);
	var oneButton    = Math.round(titleBarHeight) * (300 / 235);
	var buttonsPad   = 0.1 * oneButton;
	var startButtons = app.width - Math.round(3 * oneButton + 2 * buttonsPad);

	/*
	var buttonsWidth = titleBarHeight * (324.0/111.0);
	var buttonsPad   = titleBarHeight * ( 10.0/111.0);
	var oneButton    = buttonsWidth / 2; // two buttons
	var startButtons = app.width - buttonsWidth;
	*/

	SAGE2Items.applications.editButtonOnItem(appId, "titleBar", "rectangle",
		{x: 0, y: 0, w: app.width, h: titleBarHeight});
	SAGE2Items.applications.editButtonOnItem(appId, "syncButton", "rectangle",
		{x: startButtons, y: 0, w: oneButton, h: titleBarHeight});
	SAGE2Items.applications.editButtonOnItem(appId, "fullscreenButton", "rectangle",
		{x: startButtons + (1 * (buttonsPad + oneButton)), y: 0, w: oneButton, h: titleBarHeight});
	SAGE2Items.applications.editButtonOnItem(appId, "closeButton", "rectangle",
		{x: startButtons + (2 * (buttonsPad + oneButton)), y: 0, w: oneButton, h: titleBarHeight});
	SAGE2Items.applications.editButtonOnItem(appId, "dragCorner", "rectangle",
		{x: app.width - cornerSize, y: app.height + titleBarHeight - cornerSize, w: cornerSize, h: cornerSize});
	if (app.sticky === true) {
		SAGE2Items.applications.editButtonOnItem(app.id, "pinButton", "rectangle",
			{x: buttonsPad, y: 0, w: oneButton, h: titleBarHeight});
		handleStickyItem(app.id);
	}
}

function handleDataSharingPortalResize(portalId) {
	if (SAGE2Items.portals.list[portalId] === undefined) {
		return;
	}

	SAGE2Items.portals.list[portalId].scale = SAGE2Items.portals.list[portalId].width /
											SAGE2Items.portals.list[portalId].natural_width;
	var portalWidth = SAGE2Items.portals.list[portalId].width;
	var portalHeight = SAGE2Items.portals.list[portalId].height;

	var cornerSize   = 0.2 * Math.min(portalWidth, portalHeight);
	var oneButton    = Math.round(config.ui.titleBarHeight) * (300 / 235);
	var buttonsPad   = 0.1 * oneButton;
	var startButtons = portalWidth - Math.round(2 * oneButton + buttonsPad);

	/*
	var buttonsWidth = (config.ui.titleBarHeight-4) * (324.0/111.0);
	var buttonsPad   = (config.ui.titleBarHeight-4) * ( 10.0/111.0);
	var oneButton    = buttonsWidth / 2; // two buttons
	var startButtons = portalWidth - buttonsWidth;
	*/

	SAGE2Items.portals.editButtonOnItem(portalId, "titleBar", "rectangle",
		{x: 0, y: 0, w: portalWidth, h: config.ui.titleBarHeight});
	SAGE2Items.portals.editButtonOnItem(portalId, "fullscreenButton", "rectangle",
		{x: startButtons, y: 0, w: oneButton, h: config.ui.titleBarHeight});
	SAGE2Items.portals.editButtonOnItem(portalId, "closeButton", "rectangle",
		{x: startButtons + buttonsPad + oneButton, y: 0, w: oneButton, h: config.ui.titleBarHeight});
	SAGE2Items.portals.editButtonOnItem(portalId, "dragCorner", "rectangle",
		{x: portalWidth - cornerSize, y: portalHeight + config.ui.titleBarHeight - cornerSize, w: cornerSize, h: cornerSize});

}

function findInteractableManager(appId) {
	if (interactMgr.hasObjectWithId(appId) === true) {
		return interactMgr;
	}

	var key;
	for (key in SAGE2Items.portals.interactMgr) {
		if (SAGE2Items.portals.interactMgr[key].hasObjectWithId(appId) === true) {
			return SAGE2Items.portals.interactMgr[key];
		}
	}

	return null;
}

function findApplicationPortal(app) {
	if (app === undefined || app === null) {
		return null;
	}

	var portalIdx = app.id.indexOf("_portal");
	if (portalIdx < 0) {
		return null;
	}

	var portalId = app.id.substring(portalIdx + 1, app.id.length);
	return interactMgr.getObject(portalId, "portals");
}


// **************  Omicron section *****************
var omicronRunning = false;
var omicronManager = new Omicron(config);

// Helper function for omicron to switch pointer mode
function omi_pointerChangeMode(uniqueID) {
	remoteInteraction[uniqueID].toggleModes();
	broadcast('changeSagePointerMode', {id: sagePointers[uniqueID].id, mode: remoteInteraction[uniqueID].interactionMode});
}

// Set callback functions so Omicron can generate SAGEPointer events
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
	pointerScrollEnd,
	pointerDblClick,
	pointerCloseGesture,
	keyDown,
	keyUp,
	keyPress,
	createRadialMenu,
	omi_pointerChangeMode,
	undefined, // sendKinectInput
	remoteInteraction);
omicronManager.linkDrawingManager(drawingManager);

/* ****** Radial Menu section ************************************************************** */
// createMediabrowser();

function createRadialMenu(uniqueID, pointerX, pointerY) {
	var validLocation = true;
	var newMenuPos = {x: pointerX, y: pointerY};
	var existingRadialMenu = null;
	// Make sure there's enough distance from other menus
	for (var key in SAGE2Items.radialMenus.list) {
		existingRadialMenu = SAGE2Items.radialMenus.list[key];
		var prevMenuPos = {x: existingRadialMenu.left, y: existingRadialMenu.top };
		var distance = Math.sqrt(Math.pow(Math.abs(newMenuPos.x - prevMenuPos.x), 2) +
						Math.pow(Math.abs(newMenuPos.y - prevMenuPos.y), 2));
		if (existingRadialMenu.visible && distance < existingRadialMenu.radialMenuSize.x) {
			// validLocation = false;
			// console.log("Menu is too close to existing menu");
		}
	}

	if (validLocation && SAGE2Items.radialMenus.list[uniqueID + "_menu"] === undefined) {
		// Create a new radial menu
		var newRadialMenu = new Radialmenu(uniqueID, uniqueID, config);
		newRadialMenu.generateGeometry(interactMgr, SAGE2Items.radialMenus);
		newRadialMenu.setPosition(newMenuPos);

		SAGE2Items.radialMenus.list[uniqueID + "_menu"] = newRadialMenu;

		// Open a 'media' radial menu
		broadcast('createRadialMenu', newRadialMenu.getInfo());
	} else if (validLocation && SAGE2Items.radialMenus.list[uniqueID + "_menu"] !== undefined) {
		// Radial menu already exists for this pointer, move to new location instead
		setRadialMenuPosition(uniqueID, pointerX, pointerY);
		broadcast('updateRadialMenu', existingRadialMenu.getInfo());
	}
	updateWallUIMediaBrowser(uniqueID);
}

/**
* Translates position of a radial menu by an offset
*
* @method moveRadialMenu
* @param uniqueID {Integer} radial menu ID
* @param pointerX {Float} offset x position
* @param pointerY {Float} offset y position
*/
function moveRadialMenu(uniqueID, pointerX, pointerY) {
	var existingRadialMenu = SAGE2Items.radialMenus.list[uniqueID + "_menu"];

	if (existingRadialMenu) {

		existingRadialMenu.setPosition({x: existingRadialMenu.left + pointerX, y: existingRadialMenu.top + pointerY});
		existingRadialMenu.visible = true;

		broadcast('updateRadialMenuPosition', existingRadialMenu.getInfo());
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
function setRadialMenuPosition(uniqueID, pointerX, pointerY) {
	var existingRadialMenu = SAGE2Items.radialMenus.list[uniqueID + "_menu"];

	// Sets the position and visibility
	existingRadialMenu.setPosition({x: pointerX, y: pointerY});

	// Update the interactable geometry
	interactMgr.editGeometry(uniqueID + "_menu_radial", "radialMenus", "circle",
		{x: existingRadialMenu.left, y: existingRadialMenu.top, r: existingRadialMenu.radialMenuSize.y / 2});
	showRadialMenu(uniqueID);
	// Send the updated radial menu state to the display clients (and set menu visible)
	broadcast('updateRadialMenuPosition', existingRadialMenu.getInfo());
}

/**
* Shows radial menu and enables interactivity
*
* @method showRadialMenu
* @param uniqueID {Integer} radial menu ID
*/
function showRadialMenu(uniqueID) {
	var radialMenu = SAGE2Items.radialMenus.list[uniqueID + "_menu"];

	if (radialMenu !== undefined) {
		radialMenu.visible = true;
		interactMgr.editVisibility(uniqueID + "_menu_radial", "radialMenus", true);
		interactMgr.editVisibility(uniqueID + "_menu_thumbnail", "radialMenus", radialMenu.isThumbnailWindowOpen());
	}
}

/**
* Hides radial menu and enables interactivity
*
* @method hideRadialMenu
* @param uniqueID {Integer} radial menu ID
*/
function hideRadialMenu(uniqueID) {
	var radialMenu = SAGE2Items.radialMenus.list[uniqueID + "_menu"];
	if (radialMenu !== undefined) {
		radialMenu.hide();
	}
	broadcast('updateRadialMenu', radialMenu.getInfo());
}

function updateWallUIMediaBrowser(uniqueID) {
	var list = getSavedFilesList();

	broadcast('updateRadialMenuDocs', {id: uniqueID, fileList: list});
}

// Sends button state update messages to display
function radialMenuEvent(data) {
	if (data.type === "stateChange") {
		broadcast('radialMenuEvent', data);

		if (data.menuState.action !== undefined && data.menuState.action.type === "saveSession") {
			var ad    = new Date();
			var sname = sprint("session_%4d_%02d_%02d_%02d_%02d_%02s",
				ad.getFullYear(), ad.getMonth() + 1, ad.getDate(),
				ad.getHours(), ad.getMinutes(), ad.getSeconds());
			saveSession(sname);
		} else if (data.menuState.action !== undefined && data.menuState.action.type === "tileContent") {
			tileApplications();
		} else if (data.menuState.action !== undefined && data.menuState.action.type === "clearAllContent") {
			clearDisplay();
		}
	} else {
		broadcast('radialMenuEvent', data);
	}
}

// Check for pointer move events that are dragging a radial menu (but outside the menu)
function updateRadialMenuPointerPosition(uniqueID, pointerX, pointerY) {
	for (var key in SAGE2Items.radialMenus.list) {
		var radialMenu = SAGE2Items.radialMenus.list[key];
		// console.log(data.id+"_menu: " + radialMenu);
		if (radialMenu !== undefined && radialMenu.dragState === true) {
			var offset = radialMenu.getDragOffset(uniqueID, {x: pointerX, y: pointerY});
			moveRadialMenu(radialMenu.id, offset.x, offset.y);
		}
	}
}

function wsRemoveRadialMenu(wsio, data) {
	hideRadialMenu(data.id);
}

function wsRadialMenuThumbnailWindow(wsio, data) {
	var radialMenu = SAGE2Items.radialMenus.list[data.id + "_menu"];

	if (radialMenu !== undefined) {
		radialMenu.openThumbnailWindow(data);

		var thumbnailWindowPos = radialMenu.getThumbnailWindowPosition();
		interactMgr.editGeometry(data.id + "_menu_thumbnail", "radialMenus", "rectangle", {
			x: thumbnailWindowPos.x,
			y: thumbnailWindowPos.y,
			w: radialMenu.thumbnailWindowSize.x,
			h: radialMenu.thumbnailWindowSize.y
		});
		interactMgr.editVisibility(data.id + "_menu_thumbnail", "radialMenus", data.thumbnailWindowOpen);
	}
}

function wsRadialMenuMoved(wsio, data) {
	var radialMenu = SAGE2Items.radialMenus.list[data.uniqueID + "_menu"];
	if (radialMenu !== undefined) {
		radialMenu.setPosition(data);
	}
}

/**
* Called when an item is dropped after a move, and when a sticky item pin is toggled. This method
* checks attaching of sticky items to background items and detaching previously attached
* sticky items from background items (when the are moved away). It also handles hiding of pins of
* items not pinned when their background is removed from underneath them
*/

function handleStickyItem(elemId) {
	var app = SAGE2Items.applications.list[elemId];
	var im;
	if (elemId !== null && app !== null && app !== undefined && app.sticky === true) {
		stickyAppHandler.detachStickyItem(app);
		im = findInteractableManager(elemId);
		var backgroundObj = im.getBackgroundObj(app, null);
		if (backgroundObj === null) {
			hideStickyPin(app);
		} else if (SAGE2Items.applications.list.hasOwnProperty(backgroundObj.data.id)) {
			var backgroundApp = SAGE2Items.applications.list[backgroundObj.data.id];
			if (app.pinned === true) {
				stickyAppHandler.attachStickyItem(backgroundApp, app);
			} else {
				stickyAppHandler.registerNotPinnedApp(app);
			}
			showStickyPin(app);
		}
	}
	var appsNotPinned = stickyAppHandler.getNotPinnedAppList();
	var appsNotPinnedWithBackground = [];
	for (var i in appsNotPinned) {
		var tmpAppVariable = SAGE2Items.applications.list[appsNotPinned[i].id];
		if (tmpAppVariable === null || tmpAppVariable === undefined) {
			//Apps on this list might have been deleted
			continue;
		}
		im = findInteractableManager(tmpAppVariable.id);
		if (im.getBackgroundObj(tmpAppVariable, null) === null) {
			//If there is no background hide the pin
			hideStickyPin(tmpAppVariable);
		} else {
			//If there is a background, continue to maintain the app on the not pinned list
			appsNotPinnedWithBackground.push(tmpAppVariable);
		}
	}
	stickyAppHandler.refreshNotPinnedAppList(appsNotPinnedWithBackground);
}


/**
* Called when user clicks on a sticky item pin. This method toggles the status of the pin.
*/

function toggleStickyPin(appId) {
	var app = SAGE2Items.applications.list[appId];
	if (app === null || app === undefined || app.sticky !== true) {
		return;
	}
	if (app.hasOwnProperty("pinned") === false || app.pinned !== true) {
		app.pinned = true;
	} else {
		app.pinned = false;
		stickyAppHandler.registerNotPinnedApp(app);
	}

	handleStickyItem(app.id);
}


function showStickyPin(app) {
	SAGE2Items.applications.editButtonVisibilityOnItem(app.id, "pinButton", true);

	// only send required fields (sending full app can throw error from circular JSON
	// if it is in a Partition -- I assume it could happen in other cases as well)
	broadcast('showStickyPin', {
		id: app.id,
		sticky: app.sticky,
		pinned: app.pinned
	});
}

function hideStickyPin(app) {
	SAGE2Items.applications.editButtonVisibilityOnItem(app.id, "pinButton", false);

	// only send required fields (sending full app can throw error from circular JSON
	// if it is in a Partition -- I assume it could happen in other cases as well)
	broadcast('hideStickyPin', {
		id: app.id,
		sticky: app.sticky
	});
}


function showOrHideWidgetLinks(data) {
	var obj = data.item;
	var appId = obj.id;
	if (obj.data !== undefined && obj.data !== null && obj.data.appId !== undefined) {
		appId = obj.data.appId;
	}
	var app = SAGE2Items.applications.list[appId];
	if (app !== null && app !== undefined) {
		app = getAppPositionSize(app);
		app.user_id = data.uniqueID;
		if (data.show === true) {
			app.user_color = data.user_color;
			if (app.user_color !== null) {
				appUserColors[appId] = app.user_color;
			}
			broadcast('showWidgetToAppConnector', app);
		} else {
			broadcast('hideWidgetToAppConnector', app);
		}
	}
}

/**
 * Asks server for the context menu of an app. Server will send the current known menu.
 * Menus must be sumitted by app, or the default "Not yet loaded" will be displayed.
 * To use context menu an app MUST have been loaded on a master display.
 *
 * @method wsRequestAppContextMenu
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object needed to get menu, properties described below.
 * @param  {Integer} data.x - Pointer x, corresponds to on entire wall.
 * @param  {Integer} data.y - Pointer y, corresponds to on entire wall.
 * @param  {Integer} data.xClick - Where client clicked on their screen, because this is async.
 * @param  {Integer} data.yClick - Where client clicked on their screen, because this is async.
 */
function wsRequestAppContextMenu(wsio, data) {
	// first find if there is an app at location, top most element.
	var obj = interactMgr.searchGeometry({x: data.x, y: data.y});
	if (obj !== null) {
		// check if it was an application
		if (SAGE2Items.applications.list.hasOwnProperty(obj.data.id)) {
			// if an app was under the right-click
			if (SAGE2Items.applications.list[obj.data.id].contextMenu) {
				// If we already have the menu info, send it
				wsio.emit('appContextMenuContents', {
					x: data.xClick,
					y: data.yClick,
					app: obj.data.id,
					entries: SAGE2Items.applications.list[obj.data.id].contextMenu
				});
			} else { // Else, app did not submit menu, give default (not loaded).
				wsio.emit('appContextMenuContents', {
					x: data.xClick,
					y: data.yClick,
					app: obj.data.id,
					entries: [{
						description: "App not yet loaded on display client yet."
					}]
				});
			} // otherwise if it was a partition
		} else if (partitions.list.hasOwnProperty(obj.data.id)) {
			// if a partition was under the right-click
			wsio.emit('appContextMenuContents', {
				x: data.xClick,
				y: data.yClick,
				app: obj.data.id,
				entries: partitions.list[obj.data.id].getContextMenu()
			});
		}

	}
}

/**
 * Received from a display client, apps will send their context menu after completing their initialization.
 *
 * @method wsAppContextMenuContents
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.app - App id that this menu is for.
 * @param  {Array} data.entries - Array of objects describing the entries.
 */
function wsAppContextMenuContents(wsio, data) {
	SAGE2Items.applications.list[data.app].contextMenu = data.entries;
}

/**
 * Will call a function on each display client's app that matches id. Expected usage with context menu.
 * But can be used in other cases.
 * There are some special functionality cases like:
 *   SAGE2DeleteElement, SAGE2SendToBack, SAGE2Maximize
 *   These do not send message to app.
 *
 * @method wsCallFunctionOnApp
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {Integer} data.x - Pointer x, corresponds to on entire wall.
 * @param  {Integer} data.y - Pointer y, corresponds to on entire wall.
 * @param  {String} data.app - App id, which function should be activated.
 * @param  {String} data.func - Name of function to activate
 * @param  {Object} data.parameters - Object to send to the app as parameter.
 */
function wsCallFunctionOnApp(wsio, data) {
	// check if the id is an applications or partition
	if (SAGE2Items.applications.list.hasOwnProperty(data.app)) {
		// check for special cases, no message sent to app.
		if (data.func === "SAGE2DeleteElement") {
			deleteApplication(data.app);
			return;
		} else if (data.func === "SAGE2SendToBack") {
			// data.app should contain the id.
			var im = findInteractableManager(data.app);
			im.moveObjectToBack(data.app, "applications");
			var newOrder = im.getObjectZIndexList("applications");
			broadcast('updateItemOrder', newOrder);
			return;
		} else if (data.func === "SAGE2Maximize") {
			if (data.parameters.clientId && SAGE2Items.applications.list[data.app]) {
				toggleApplicationFullscreen(data.parameters.clientId,
					SAGE2Items.applications.list[data.app],
					true);
			}
			return;
		}

		// Using broadcast means the parameter must be in data.data
		data.data = data.parameters;
		// add the serverDate property
		data.data.serverDate = Date.now();
		// add the clientId property
		data.data.clientId = wsio.id;
		// send to all display clients(since they all need to update)
		for (var i = 0; i < clients.length; i++) {
			if (clients[i].clientType === "display") {
				clients[i].emit('broadcast', data);
			}
		}
	}  else if (partitions.list.hasOwnProperty(data.app)) {
		// the context menu is on a partition
		let ptn = partitions.list[data.app];

		if (data.func === "SAGE2DeleteElement") {
			deletePartition(data.app);
			// closing of applications are handled by the called function.
			return;
		} else if (data.func === "SAGE2Maximize") {
			if (data.parameters.clientId) {
				if (!ptn.maximized) {
					remoteInteraction[data.parameters.clientId].maximizeSelectedItem(ptn);
				} else {
					remoteInteraction[data.parameters.clientId].restoreSelectedItem(ptn);
				}

				partitions.updatePartitionGeometries(data.app, interactMgr);
				broadcast('partitionMoveAndResizeFinished', ptn.getDisplayInfo());

				// update neighbors if it is snapped
				if (ptn.isSnapping) {
					let updatedNeighbors = ptn.updateNeighborPtnPositions();
					// update geometries/display/layout of any updated neighbors
					for (var neigh of updatedNeighbors) {
						partitions.updatePartitionGeometries(neigh, interactMgr);
						broadcast('partitionMoveAndResizeFinished', partitions.list[neigh].getDisplayInfo());

						updatePartitionInnerLayout(partitions.list[neigh], true);
					}
				}
				// update child positions within partiton
				updatePartitionInnerLayout(ptn, false);
			}
		} else if (data.func === "clearPartition") {
			// invoke clear with delete application method -- messy, should refactor
			partitions.list[data.app][data.func](deleteApplication);
		} else if (data.func === "toggleSnapping" || data.func === "updateNeighborPartitionList") {
			let updatedNeighbors = partitions.list[data.app][data.func]();

			broadcast('updatePartitionSnapping', partitions.list[data.app].getDisplayInfo());
			for (let p of updatedNeighbors) {
				if (partitions.list[p]) {
					broadcast('updatePartitionSnapping', partitions.list[p].getDisplayInfo());
				}
			}
		} else if (data.func === "setColor") {
			partitions.list[data.app][data.func](data.parameters.clientInput);
			broadcast('updatePartitionColor', partitions.list[data.app].getDisplayInfo());
		} else {
			// invoke the other callback
			partitions.list[data.app][data.func]();
		}
		updatePartitionInnerLayout(partitions.list[data.app], true);

		broadcast('partitionWindowTitleUpdate', partitions.list[data.app].getTitle());

	}

}

/**
 * Will launch app with specified name and call the given function after.
 * The function doesn't need to be called to give the parameters.
 *
 * @method wsLaunchAppWithValues
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.appName - Folder name to check for the app.
 * @param  {Object} data.params - Will be passed to the app. Function too, it is specified.
 * @param  {String}  data.func - Optional, if specified, will also call this funciton and pass parameters.
 */
function wsLaunchAppWithValues(wsio, data) {
	// first try see if the app is registered with apps exif.
	var fullpath = appLaunchHelperGetPathOfApp(data.appName);
	// null means not found, try check if folder path exists.
	if (fullpath === null) {
		fullpath = path.join(mediaFolders.system.path, "apps", data.appName);
		try {
			fs.accessSync(fullpath);
		} catch (err) {
			sageutils.log("wsLaunchAppWithValues", "Cannot launch", data.appName, ", doesn't exist.");
			return;
		}
	}
	// Prep the data needed to launch an application.
	var appLoadData = { };
	appLoadData.application = fullpath;
	appLoadData.user = wsio.id; // needed for the wsLoadApplication function
	appLoadData.wasPositionGivenInMessage = false;
	appLoadData.wasLaunchedThroughMessage = true;
	if (data.customLaunchParams) {
		appLoadData.customLaunchParams = data.customLaunchParams;
		appLoadData.customLaunchParams.serverDate = Date.now();
		appLoadData.customLaunchParams.clientId = wsio.id;
		appLoadData.customLaunchParams.parent = data.app;
		appLoadData.customLaunchParams.functionToCallAfterInit = data.func;
	} else {
		appLoadData.customLaunchParams = {parent: data.app};
	}
	// If the launch location is defined, use it, otherwise use the stagger position.
	if (data.xLaunch !== null && data.xLaunch !== undefined) {
		appLoadData.position = [data.xLaunch, data.yLaunch];
		appLoadData.wasPositionGivenInMessage = true;
	}
	// get this before the app is created. id start from 0. count is the next one
	var whatTheNewAppIdShouldBe = "app_" + getUniqueAppId.count;
	// call the previously made wsLoadApplication funciton and give it the required data.
	wsLoadApplication(wsio, appLoadData);
	// notify the creating app(if any) child's id, if undefined, then the display doesn't do anything with it
	broadcast('broadcast', {app: data.app, func: "addToAppsLaunchedList", data: whatTheNewAppIdShouldBe});
} // end wsLaunchAppWithValues

/**
 * Used to get the full path of an app starting with appName in the FileName.
 *
 * @method appLaunchHelperGetPathOfApp
 * @param  {Object} appName - Folder name to check for the app.
 * @return {String|null} Either it gets the full path or null to indicate not available.
 */
function appLaunchHelperGetPathOfApp(appName) {
	var apps = assets.listApps();
	// for each of the apps known to SAGE2, usually everything in public/uploads/apps
	for (var i = 0; i < apps.length; i++) {
		if (// if the name contains appName
			apps[i].exif.FileName.indexOf(appName) === 0
			|| apps[i].id.indexOf(appName) !== -1
		) {
			return apps[i].id; // this is the path.
		} // end if this app contains the specified name
	} // end for each application available.
	return null;
}

/**
 * Sends data to a specific client or set.
 *
 * @method wsSendDataToClient
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.clientDest - Unique identifier of client
 */
function wsSendDataToClient(wsio, data) {
	var i;
	if (data.clientDest === "allDisplays") {
		for (i = 0; i < clients.length; i++) {
			if (clients[i].clientType === "display") {
				clients[i].emit('broadcast', data);
			}
		}
	} else if (data.clientDest === "masterDisplay") {
		// only send if a master display is connected
		if (masterDisplay) {
			masterDisplay.emit('broadcast', data); // only send to one display to prevent multiple responses.
		}
	} else {
		for (i = 0; i < clients.length; i++) {
			// !!!! the clients[i].id  and clientDest need auto convert to evaluate as equivalent.
			// update: condition is because console.log auto converts in a specific way
			if (clients[i].id == data.clientDest) {
				clients[i].emit('sendDataToClient', data);
			}
		}
	}
}

/**
 * Used to write files into the media folders.
 * Writes to a joined location of mainFolder.path(~/Documents/SAGE2_media)
 *
 * @method wsSaveDataOnServer
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.fileName    - Name of the file.
 * @param  {String} data.fileType    - Extension of the file.
 * @param  {String} data.fileContent - To be written in the file.
 */
function wsSaveDataOnServer(wsio, data) {
	// First check if all necessary fields have been provided.
	if (data.fileType == null || data.fileType == undefined
		|| data.fileName == null || data.fileName == undefined
		|| data.fileContent == null || data.fileContent == undefined
	) {
		sageutils.log("wsSaveDataOnServer", "ERROR> not saving data, a required field is null or undefined");
	}
	// Remove any path changing by chopping off the / andor \ in the filename.
	while (data.fileName.indexOf("/") >= 0) {
		data.fileName = data.fileName.substring(data.fileName.indexOf("/") + 1);
	}
	while (data.fileName.indexOf("\\") >= 0) {
		data.fileName = data.fileName.substring(data.fileName.indexOf("\\") + 1);
	}

	// Create the notes folder as needed
	var notesFolder = path.join(mainFolder.path, "notes");
	if (!sageutils.folderExists(notesFolder)) {
		sageutils.mkdirParent(notesFolder);
	}

	var fullpath;
	// Specific checks for each file type (extension)
	if (data.fileType === "note") {
		// Just in case, save
		fullpath = path.join(notesFolder, "lastNote.note");
		fs.writeFileSync(fullpath, data.fileContent);
		fullpath = path.join(notesFolder, data.fileName);
		fs.writeFileSync(fullpath, data.fileContent);
	} else if (data.fileType === "doodle") {
		// Just in case, save
		fullpath = path.join(notesFolder, "lastDoodle.doodle");
		// Remove the header but keep uri
		var regex = /^data:.+\/(.+);base64,(.*)$/;
		var matches = data.fileContent.match(regex);
		// Convert to base64 encoding
		var buffer = new Buffer(matches[2], 'base64');
		fs.writeFileSync(fullpath, buffer);
		fullpath = path.join(notesFolder, data.fileName);
		fs.writeFileSync(fullpath, buffer);
	}  else if (data.fileType === "png") {
		fullpath = path.join(mainFolder.path, "images", data.fileName);
		var pngBuffer = new Buffer(data.fileContent, "base64");
		fs.writeFileSync(fullpath, pngBuffer);
	}  else if (data.fileType === "jpg") {
		fullpath = path.join(mainFolder.path, "images", data.fileName);
		var jpgBuffer = new Buffer(data.fileContent);
		fs.writeFileSync(fullpath, jpgBuffer);
	}  else if (data.fileType === "tmp") {
		fullpath = path.join(mainFolder.path, "tmp", data.fileName);
		var aBuffer = new Buffer(data.fileContent);
		fs.writeFileSync(fullpath, aBuffer);
	} else {
		sageutils.log("wsSaveDataOnServer", "ERROR> unable to save fileType", data.fileType);
	}
}

/**
 * Sets the value of specified server data. If it doesn't exist, will create it.
 *
 * @method wsServerDataSetValue
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 */
function wsServerDataSetValue(wsio, data) {
	sharedServerData.setValue(wsio, data);
}

/**
 * Checks if there is a value, and if so will send the value.
 * If the value doesn't exist, it will not return anything.
 *
 * @method wsServerDataGetValue
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 */
function wsServerDataGetValue(wsio, data) {
	sharedServerData.getValue(wsio, data);
}

/**
 * Removes variable from server. Expected usage is this is called when an app closes.
 * Made for the sake of cleanup as apps open and close.
 *
 * @method wsServerDataRemoveValue
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 */
function wsServerDataRemoveValue(wsio, data) {
	sharedServerData.removeValue(wsio, data);
}

/**
 * Add the app to the named values a subscriber.
 * If the value doesn't exist, it will create a "blank" value and subscribe to it.
 *
 * @method wsServerDataSubscribeToValue
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.nameOfValue - Name of value to subscribe to.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give value to.
 */
function wsServerDataSubscribeToValue(wsio, data) {
	sharedServerData.subscribeToValue(wsio, data);
}

/**
 * Will respond back once to the app giving the func an array of tracked values.
 * They will be in an array of objects with properties nameOfValue and value.
 * NOTE: the values in the array could be huge.
 *
 * @method wsServerDataGetAllTrackedValues
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give value to.
 */
function wsServerDataGetAllTrackedValues(wsio, data) {
	sharedServerData.getAllTrackedValues(wsio, data);
}

/**
 * Will respond back once to the app giving the func an array of tracked descriptions.
 * They will be in an array of objects with properties nameOfValue and description.
 *
 * @method wsServerDataGetAllTrackedDescriptions
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give value to.
 */
function wsServerDataGetAllTrackedDescriptions(wsio, data) {
	sharedServerData.getAllTrackedDescriptions(wsio, data);
}

/**
 * Will add the websocket to subscriber list of new value notifications.
 * The subscriber will get an object with nameOfValue and description.
 *
 * @method wsServerDataSubscribeToNewValueNotification
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give value to.
 */
function wsServerDataSubscribeToNewValueNotification(wsio, data) {
	sharedServerData.subscribeToNewValueNotification(wsio, data);
}

/**
 * Calculate if we have enough screenshot-capable display clients
 * and send message to UI clients to enable the screenshot menu
 *
 * @method     ReportIfCanWallScreenshot
 */
function reportIfCanWallScreenshot() {
	var numOfDisplayClients = config.displays.length;
	var canWallScreenshot = 0;
	// check if all display clients can take a screenshot
	for (let i = 0; i < clients.length; i++) {
		if (clients[i].clientType === "display" && clients[i].capableOfScreenshot === true) {
			canWallScreenshot++;
		}
	}
	// Send the news to the UI clients
	broadcast("reportIfCanWallScreenshot", {
		capableOfScreenshot: (canWallScreenshot === numOfDisplayClients)
	});
}

/**
 * Sent from UI, server gets it and tells displays to send back screenshots.
 * Only happens if a screenshot is not already in progress to prevent spam.
 * The masterDisplay check in array is reset (discarded) and rebuilt.
 *
 * @method     wsStartWallScreenshot
 * @param      {Object}  wsio    The websocket
 * @param      {Object}  data    The data
 */
function wsStartWallScreenshot(wsio, data) {
	// If not already taking a screen shot, then can emit, to prevent spamming
	if (masterDisplay.startedScreenshot === undefined || masterDisplay.startedScreenshot === false) {
		// Need and additional tracking variable to prevent multiple users
		// from spamming the screenshot command
		masterDisplay.startedScreenshot = true;
		// [x][y] the previous array is discarded
		masterDisplay.displayCheckIn = [];
		for (var x = 0; x < config.layout.columns; x++) {
			for (var y = 0; y < config.layout.rows; y++) {
				var idx = y * config.layout.columns + x;
				// Set to false
				masterDisplay.displayCheckIn[idx] = false;
			}
		}
		// then send the messages
		for (var i = 0; i < clients.length; i++) {
			if (clients[i].clientType === "display") {
				// Their submission status is reset
				clients[i].submittedScreenshot = false;
				// Necessary to ignore other displays
				if (clients[i].capableOfScreenshot === undefined) {
					// Capabilities are set on response
					clients[i].capableOfScreenshot = true;
				}
				clients[i].emit("sendServerWallScreenshot");
			}
		}
	}
}

/**
 * Called when displays are sending screenshots.
 * Displays that are not capable of screenshots will report back saying so.
 * Performs the following:
 * 	if not display, stop
 * 	if display is not capable, mark status, stop
 * 	get all displays in array
 * 	save the current display's screenshot
 * 	mark this display in the correct check in position
 * 		if display has width and height, mark those locations too
 * 	if all display tiles screenshots have been submitted
 * 		OR all displays have submitted a screenshot or are incapable
 * 	then make a screenshot
 * 		done with mosaic and offset tiles based on config information
 * 		stitching is done in tmp folder to avoid problems caused by the folder monitor
 * 	finally reset variable to allow another screenshot
 *
 *
 * @method     wsWallScreenshotFromDisplay
 * @param      {Object}  wsio    The websocket
 * @param      {Object}  data    The data
 */
function wsWallScreenshotFromDisplay(wsio, data) {
	if (wsio.clientType != "display") {
		// Something incorrect happened for a non-display to submit a screenshot
		return;
	}

	// Check if the responded display was capable in the first place
	if (!data.capable) {
		wsio.capableOfScreenshot = false;
		// Can't do anything if the display isn't capable
		return;
	}

	// Declaring reused variables here
	var xDisplay, yDisplay;
	var i, x, y, idx, id;

	// First get all connected display clients
	var allDisplaysFromClients = [];
	for (i = 0; i < clients.length; i++) {
		if (clients[i].clientType === "display") {
			allDisplaysFromClients.push(clients[i]);
		}
	}

	// First create information necessary to save the file
	var fileSaveObject = {};
	// client ID in this case refers to the display clientID url param. 0 by default
	// TODO: mirror overwrite is possible, is bad?
	fileSaveObject.fileName = "wallScreenshot_" + wsio.clientID + ".jpg";
	fileSaveObject.fileType = "tmp";
	fileSaveObject.fileContent = data.imageData;
	// Create the current tile piece and tile pieces individually saved
	wsSaveDataOnServer(wsio, fileSaveObject);

	// Set the tracking variables for the tile piece
	// Mark itself as having submitted a screenshot
	wsio.submittedScreenshot = true;

	//
	// This whole next section is about proper placement into the displayCheckIn[x][y]
	// Necessary because of systems that define a single display as having width and height
	//
	if (masterDisplay.displayCheckIn[wsio.clientID] != undefined) {
		idx = config.displays[wsio.clientID].row * config.layout.columns + config.displays[wsio.clientID].column;
		masterDisplay.displayCheckIn[idx] = wsio;
		// set this wsio for each of the spaces (client covering several tiles)
		for (x = 0; x < config.displays[wsio.clientID].width; x++) {
			for (y = 0; y < config.displays[wsio.clientID].height; y++) {
				xDisplay = config.displays[wsio.clientID].column + x;
				yDisplay = config.displays[wsio.clientID].row + y;
				idx = yDisplay * config.layout.columns + xDisplay;
				masterDisplay.displayCheckIn[idx] = wsio;
			}
		}
	} else {
		sageutils.log('Screenshot', "Unknown display", wsio.clientID, "checked in for screenshot");
	}

	//
	// Now check if everyone submitted.
	// NOTE: very possible to have timing issues.
	//   Counting on the fact that screenshot takes more time the non-capable response
	//
	// Display check in necessary for weird pieces
	//
	var allDisplaysSubmittedScreenshots = true;
	// First check if each of the tiles in the wall have been filled
	for (i = 0; i < masterDisplay.displayCheckIn.length; i++) {
		if (masterDisplay.displayCheckIn[i] === false) {
			allDisplaysSubmittedScreenshots = false;
			break;
		}
	}

	// If there is a missing piece from the tiles, possible that there is no active display for it.
	if (!allDisplaysSubmittedScreenshots) {
		// Reset to true, it will be false if there is a missing piece
		allDisplaysSubmittedScreenshots = true;
		for (i = 0; i < allDisplaysFromClients.length; i++) {
			// Check if the display is capable
			if (allDisplaysFromClients[i].capableOfScreenshot) {
				// Check it hasn't submitted a screenshot, don't have all tiles
				if (!allDisplaysFromClients[i].submittedScreenshot) {
					allDisplaysSubmittedScreenshots = false;
					break;
				}
			}
		}
	}

	// Stop if not all displays submitted.
	// Return here to prevent too many nested blocks
	if (!allDisplaysSubmittedScreenshots) {
		return;
	}

	// At this point ready to make a screen shot
	// First need the date to use as a unique name modifier
	var dateSuffix = formatDateToYYYYMMDD_HHMMSS(new Date());

	// More than 1 tile means that stitching needs to be applied
	if (allDisplaysFromClients.length > 1) {
		// Stitching needs to be done by rows
		// Tile pieces are still saved in images
		var basePath = path.join(mainFolder.path, "tmp");
		var currentPath;
		var xMosaicPosition = 0;
		var yMosaicPosition = 0;
		var mosaicImage = imageMagick().in("-background", "black");
		// var tilesUsed = [];
		// var needToSkip;

		//	For each element in the display checkin
		//		if it is false, then the display isn't connected
		//		but check if the wsio was already used
		//			because if it was used, that display has width / height greater than 1 tile
		//			so it needs to be skipped
		//		tiles that dont need to be skipped will have their temp file referenced with offet of tile position * resolution
		for (i = 0; i < masterDisplay.displayCheckIn.length; i++) {
			// Calculate the coordinates
			id  = masterDisplay.displayCheckIn[i].clientID;
			x   = config.displays[id].column;
			y   = config.displays[id].row;
			idx = y * config.layout.columns + x;

			xMosaicPosition = x * config.resolution.width;
			yMosaicPosition = y * config.resolution.height;
			currentPath = path.join(basePath, "wallScreenshot_" + id + ".jpg");
			mosaicImage = mosaicImage.in("-page", "+" + xMosaicPosition + "+" + yMosaicPosition);
			mosaicImage = mosaicImage.in(currentPath);
		}

		// Setting the output into the tmp folder
		var fname = "screenshot-" + dateSuffix + ".jpg";
		currentPath = path.join(mainFolder.path, "tmp", fname);

		// Ready for mosaic and write
		mosaicImage.mosaic().quality(90).write(currentPath, function(error) {
			if (error) {
				sageutils.log('Screenshot', error);
			} else {
				// Add the image into the asset management and open with a width 1/4 of the wall
				manageUploadedFiles([{
					// output folder
					path: currentPath,
					// filename
					name: fname}],
					// position and size
				[0, 0, config.totalWidth / 4],
				// username and color
				"screenshot", "#B4B4B4",
				// to be opened afterward
				true);
				// Delete the temporary files
				sageutils.deleteFiles(path.join(mainFolder.path, "tmp", "wallScreenshot_*"));
			}
		});
	} else {
		// Just change the name
		fileSaveObject.fileName = "screenshot-" + dateSuffix + ".jpg";
		wsSaveDataOnServer(wsio, fileSaveObject);
		// Add the image into the asset management and open with a width 1/4 of the wall
		manageUploadedFiles([{
			// output folder
			path: path.join(mainFolder.path, "tmp", fileSaveObject.fileName),
			// file name
			name: fileSaveObject.fileName}],
		// position and size
		[0, 0, config.totalWidth / 4],
		// username and color
		"screenshot", "#B4B4B4",
		// to be opened afterward
		true);
		// Delete the temporary files
		sageutils.deleteFiles(path.join(mainFolder.path, "tmp", "wallScreenshot_*"));
	}
	// Reset variable to allow another capture
	masterDisplay.startedScreenshot = false;
}

/**
 * Receive data from Electron display client about their hardware
 *
 * @method     wsDisplayHardware
 * @param      {<type>}  wsio    The wsio
 * @param      {<type>}  data    The data
 */
function wsDisplayHardware(wsio, data) {
	// store the hardware data for a given client
	performanceManager.addDisplayClient(wsio.clientID, data);
}

/**
 * Start a jupyter connection
 *
 * @method     wsStartJupyterSharing
 * @param      {Object}  wsio    The websocket
 * @param      {Object}  data    The data
 */
function wsStartJupyterSharing(wsio, data) {
	sageutils.log('Jupyter', "received new stream:", data.id);

	/*var i;
	SAGE2Items.renderSync[data.id] = {clients: {}, chunks: []};
	for (i = 0; i < clients.length; i++) {
		if (clients[i].clientType === "display") {
			SAGE2Items.renderSync[data.id].clients[clients[i].id] = {wsio: clients[i], readyForNextFrame: false, blocklist: []};
		}
	}
	*/

	// forcing 'int' type for width and height
	data.width  = parseInt(data.width,  10);
	data.height = parseInt(data.height, 10);

	appLoader.createJupyterApp(data.src, data.type, data.encoding, data.title, data.color, 800, 1200,
		function(appInstance) {
			appInstance.id = data.id;
			handleNewApplication(appInstance, null);
		}
	);
}

function wsUpdateJupyterSharing(wsio, data) {
	sageutils.log('Jupyter', "received update from:", data.id);
	sendJupyterUpdates(data);
}

function sendJupyterUpdates(data) {
	// var ePosition = {x: 0, y: 0};
	var eUser = {id: 1, label: "Touch", color: "none"};

	var event = {
		id: data.id,
		type: "imageUpload",
		position: 0,
		user: eUser,
		data: data,
		date: Date.now()
	};

	broadcast('eventInItem', event);
}

/**
 * Method handling a file save request from a SAGE2_App
 *
 * @method     appFileSaveRequest
 * @param      {Object}  wsio    The websocket
 * @param      {Object}  data    The data
 */
function appFileSaveRequest(wsio, data) {

	/* data includes
	data = {
		app: Name of application,
		id: id of application,
		asset: true,
		filePath: {
			subdir: subdirectory app wishes file to be saved in
			name: name of the file
			ext: file extension
		},
		saveData: file data
	}
	*/

	if (data.filePath) {
		var appFileSaveDirectory, appdir;

		// is it an asset or an application file
		if (data.asset) {
			// save in the user's folder (~/Documents/SAGE2_Media)
			appFileSaveDirectory = path.join(mediaFolders.user.path, "tmp");
			appdir = appFileSaveDirectory;
		} else {
			// save in protecteed application folder
			appFileSaveDirectory = path.join(mediaFolders.user.path, "savedFiles");
			appdir = path.join(appFileSaveDirectory, data.app);
		}

		// Take the filename
		var filename = data.filePath.name;
		if (filename.indexOf("." + data.filePath.ext) === -1) {
			// add extension if it is not present in name
			filename += "." + data.filePath.ext;
		}

		// save the file in the specific application folder
		var filedir = appdir;
		if (data.filePath.subdir) {
			// add a sub-directory if asked
			filedir = path.join(appdir, data.filePath.subdir);
		}

		// check and create the folder if needed
		if (!sageutils.folderExists(filedir)) {
			sageutils.mkdirParent(filedir);
		}

		// finally, build the full path
		var fullpath = path.join(filedir, filename);

		// and write the file
		try {
			fs.writeFileSync(fullpath, data.saveData);
			sageutils.log('File', "saved file to", fullpath);
			if (data.asset) {
				var fileObject = {};
				fileObject[0] = {
					name: filename,
					type: data.filePath.ext,
					path: fullpath};
				// Add the file to the asset library and open it
				manageUploadedFiles(fileObject, [0, 0], data.app, "#B4B4B4", true);
			}
		} catch (err) {
			sageutils.log('File', "error while saving to", fullpath + ":" + err);
		}

	} else {
		sageutils.log('File', "file directory not specified. File not saved.");
	}
}

function wsRequestFileBuffer(wsio, data) {
	if (data.createdOn === null || data.createdOn === undefined) {
		data.createdOn = Date.now();
	}
	var app = SAGE2Items.applications.list[data.id];
	if (fileBufferManager.hasFileBufferForApp(data.id) === true) {
		fileBufferManager.editCredentialsForBuffer({appId: data.id, owner: data.owner, createdOn: data.createdOn});
	} else {
		console.log("Creating file buffer for:", app.application);
		fileBufferManager.requestBuffer({appId: data.id, owner: data.owner, createdOn: data.createdOn,
			color: data.color, content: data.content});
	}

	if (data.fileName !== null && data.fileName !== undefined) {
		// Create the folder as needed
		var fileSaveDir = path.join(mainFolder.path, "notes");
		fileSaveDir = path.join(fileSaveDir, app.application);

		// Take the filename
		var filename = data.fileName;
		var ext = data.extension || "txt";
		if (filename.indexOf("." + ext) === -1) {
			// add extension if it is not present in name
			filename += "." + ext;
		}

		// save the file in the specific application folder
		if (data.subdir) {
			// add a sub-directory if asked
			fileSaveDir = path.join(fileSaveDir, data.subdir);
		}
		fileBufferManager.associateFile({appId: data.id, appName: app.application, fileDir: fileSaveDir, fileName: filename});
	}
}

function wsCloseFileBuffer(wsio, data) {
	console.log("Closing buffer for:", data.id);
	fileBufferManager.closeFileBuffer(data.id);
}

function wsUpdateFileBufferCursorPosition(wsio, data) {
	fileBufferManager.updateFileBufferCursorPosition(data);
}

function wsRequestNewTitle(wsio, data) {
	var app = SAGE2Items.applications.list[data.id];
	if (app !== null && app !== undefined) {
		app.title = data.title;
		broadcast('setTitle', data);
	}
}

/**
	* Create a new screen partition with dimensions specified in data
	*
	* @method wsCreatePartition
	* @param {object} data - The dimensions of the partition to be created
	*/
function wsCreatePartition(wsio, data) {
	// Create Test partition
	sageutils.log('Partition', "Creating a new partition");
	var newPtn = createPartition(data, "#ffffff");

	// update the title of the new partition
	broadcast('partitionWindowTitleUpdate', newPtn.getTitle());
}

/**
	* Create a new screen partition with dimensions specified in data
	*
	* @method wsPartitionScreen
	* @param {object} data - Contains the layout specificiation with which partitions will be created
	*/
function wsPartitionScreen(wsio, data) {
	sageutils.log('Partition', "Dividing SAGE2 into partitions");

	partitions.unusedColors = partitions.defaultColors.slice(0, partitions.defaultColors.length);

	divideAreaPartitions(
		data,
		0,
		config.ui.titleBarHeight,
		config.totalWidth,
		config.totalHeight - config.ui.titleBarHeight
	);

	delete partitions.unusedColors;
}

function divideAreaPartitions(data, x, y, width, height) {

	let currX = x,
		currY = y;

	// if we are out of unused colors, reset the list
	if (partitions.unusedColors.length === 0) {
		partitions.unusedColors = partitions.defaultColors.slice(0, partitions.defaultColors.length);
	}

	let randIndex = Math.floor(Math.random() * partitions.unusedColors.length);

	let randColor = partitions.unusedColors[randIndex];

	// delete the random color from the unused colors
	partitions.unusedColors.splice(randIndex, 1);

	if (data.ptn) {
		let newPtn = createPartition(
			{
				left: x,
				top: y,
				width: width,
				height: height - config.ui.titleBarHeight,
				isSnapping: true
			},
			randColor
		);

		broadcast('partitionWindowTitleUpdate', newPtn.getTitle());

	} else {
		if (data.type === "col") {
			for (let i = 0; i < data.children.length; i++) {
				divideAreaPartitions(
					data.children[i],
					currX,
					currY,
					width,
					height * data.children[i].size / 12
				);

				currY += height * data.children[i].size / 12;
			}
		} else if (data.type === "row") {
			for (let i = 0; i < data.children.length; i++) {
				divideAreaPartitions(
					data.children[i],
					currX,
					currY,
					width * data.children[i].size / 12,
					height
				);

				currX += width * data.children[i].size / 12;
			}
		}
	}

}

/**
	* Remove all partitions
	*
	* @method wsDeleteAllPartitions
	*/
function wsDeleteAllPartitions(wsio) {
	deleteAllPartitions();
}

/**
	* Cause all apps to be associated with a partition if it is above one
	* (WebSocket method)
	*
	* @method wsPartitionsGrabAllContent
	*/
function wsPartitionsGrabAllContent(wsio) {
	// associate any existing apps with partitions
	partitionsGrabAllContent();
}

/**
	* Cause all apps to be associated with a partition if it is above one
	*
	* @method partitionsGrabAllContent
	*/
function partitionsGrabAllContent() {
	// associate any existing apps with partitions
	for (var key in SAGE2Items.applications.list) {
		var changedPartitions = partitions.updateOnItemRelease(SAGE2Items.applications.list[key]);

		changedPartitions.forEach((id => {
			updatePartitionInnerLayout(partitions.list[id], true);

			broadcast('partitionWindowTitleUpdate', partitions.list[id].getTitle());
		}));
	}
}

/**
	* Create a new partition with a given set of dimensions and a color
	*
	* @method createPartition
	* @param {object} dims - The dimensions of a partition in top, left, width, height
	* @param {string} color - The color of the partition
	*/
function createPartition(dims, color) {
	var myPtn = partitions.newPartition(dims, interactMgr, color);
	broadcast('createPartitionWindow', myPtn.getDisplayInfo());
	broadcast('createPartitionBorder', myPtn.getDisplayInfo());

	// on creation, if it is snapping, update the neighbors
	if (myPtn.isSnapping) {
		partitions.updateNeighbors(myPtn.id);

		broadcast('updatePartitionSnapping', myPtn.getDisplayInfo());
		for (let p of Object.keys(myPtn.neighbors)) {
			if (partitions.list[p]) {
				broadcast('updatePartitionSnapping', partitions.list[p].getDisplayInfo());
			}
		}
	}

	return myPtn;
}

/**
	* Create a new partition with a given set of dimensions and a color
	*
	* @method createPartition
	* @param {string} id - The id of the partition to be deleted
	*/
function deletePartition(id) {
	var ptn = partitions.list[id];

	if (ptn.isSnapping) {
		// remove itself from neighbors' neighbor lists
		for (let neigh of Object.keys(ptn.neighbors)) {
			delete partitions.list[neigh].neighbors[id];
		}
	}

	broadcast('deletePartitionWindow', ptn.getDisplayInfo());
	partitions.removePartition(ptn.id);
	interactMgr.removeGeometry(ptn.id, "partitions");
}

/**
 * Updates the stored information about connections.
 * Currently updates three values: UI, displays, remote servers.
 * Users information from 
 *
 * @method updateInformationAboutConnections
 */
function updateInformationAboutConnections() {
	var currentUiList = [];
	var currentDisplayList = [];
	var currentRemoteSiteList = [];
	var currentItem;
	for (let i = 0; i < clients.length; i++) {
		if (clients[i].clientType === "sageUI") {
			currentItem = {};
			currentItem.name = sagePointers[clients[i].id].label;
			currentItem.color = sagePointers[clients[i].id].color;
			currentItem.uniqueID = clients[i].id;
			currentUiList.push(currentItem);
		} else if (clients[i].clientType === "display") {
			currentItem = {};
			currentItem.viewPort = clients[i].clientID;
			currentItem.uniqueID = clients[i].id;
			currentDisplayList.push(currentItem);
		} else if (clients[i].clientType === "remoteServer") {
			currentItem = {};
			currentItem.remoteAddress = clients[i].remoteAddress.address;
			currentItem.uniqueID = clients[i].id;
			currentRemoteSiteList.push(currentItem);
		}
	}
	var data = {};
	if (currentUiList.length > 0) {
		data.nameOfValue = "serverConnectionDataUiList";
		data.value = currentUiList;
		sharedServerData.setValue(null, data); //  wsio is not needed to set value
	}
	if (currentDisplayList.length > 0) {
		data.nameOfValue = "serverConnectionDataDisplayList";
		data.value = currentDisplayList;
		sharedServerData.setValue(null, data); //  wsio is not needed to set value
	}
	if (currentRemoteSiteList.length > 0) {
		data.nameOfValue = "serverConnectionDataRemoteSiteList";
		data.value = currentRemoteSiteList;
		sharedServerData.setValue(null, data); //  wsio is not needed to set value
	}
}


/**
 * Updates the stored information about failed remote site connections
 *
 * @method updateInformationAboutConnectionsFailedRemoteSite
 * @param  {Object} wsio - The websocket of sender.
 */
function updateInformationAboutConnectionsFailedRemoteSite(wsio) {
	var data = {};
	data.nameOfValue = "serverConnectionDataFailedRemoteSite";
	if (sharedServerData.dataStructure.allNamesOfValues.includes(data.nameOfValue)) {
		data.value = sharedServerData.dataStructure.allValues[data.nameOfValue].value;
	} else {
		data.value = {total: 0, sites: []};
	}
	data.value.total++;
	var sites = data.value.sites;
	var found = false;
	for (let i = 0; i < sites.length; i++) {
		if (sites[i].id === wsio.id) {
			sites[i].total++;
			found = true;
		}
	}
	if (!found) {
		sites.push({id: wsio.id, total: 1});
	}
	sharedServerData.setValue(null, data); //  wsio is not needed to set value
}
