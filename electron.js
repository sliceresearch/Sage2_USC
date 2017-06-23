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
 * Electron SAGE2 client
 *
 * @class electron
 * @module electron
 * @submodule electron
 * @requires electron commander
 */

'use strict';

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

// parsing command-line arguments
var commander  = require('commander');
var version    = require('./package.json').version;

// Enable geolocation API
// Set our own API key since Electron's own key is over used
// Key from SAGE2public Google project
process.env.GOOGLE_API_KEY = "AIzaSyANE6rJqcfc7jH-bDOwhXQZK_oYq9BWRDY";

/**
 * Setup the command line argument parsing (commander module)
 */
var args = process.argv;
if (args.length === 1) {
	// seems to make commander happy when using binary packager
	args = args[0];
}

// Generate the command line handler
commander
	.version(version)
	.option('-s, --server <s>',    'Server URL (string)', 'http://localhost:9292')
	.option('-d, --display <n>',   'Display client ID number (int)', parseInt, 0)
	.option('-u, --ui',            'Open the user interface (instead of display)', false)
	.option('-a, --audio',         'Open the audio manager (instead of display)', false)
	.option('-f, --fullscreen',    'Fullscreen (boolean)', false)
	.option('-p, --plugins',       'Enables plugins and flash (boolean)', false)
	.option('-n, --no_decoration', 'Remove window decoration (boolean)', false)
	.option('-x, --xorigin <n>',   'Window position x (int)', myParseInt, 0)
	.option('-y, --yorigin <n>',   'Window position y (int)', myParseInt, 0)
	.option('-m, --monitor <n>',   'Select a monitor (int)', myParseInt, null)
	.option('--width <n>',         'Window width (int)', myParseInt, 1280)
	.option('--height <n>',        'Window height (int)', myParseInt, 720)
	.option('--password <s>',      'Server password (string)', null)
	.option('--hash <s>',          'Server password hash (string)', null)
	.option('--cache',             'Clear the cache', false)
	.option('--console',           'Open the devtools console', false)
	.parse(args);

// Load the flash plugin if asked
if (commander.plugins) {
	// Flash loader
	const flashLoader = require('flash-player-loader');

	flashLoader.debug({enable: true});
	if (process.platform === 'darwin') {
		flashLoader.addSource('@chrome');
	}
	flashLoader.addSource('@system');
	flashLoader.load();
}

// Reset the desktop scaling
const os = require('os');
if (os.platform() === "win32") {
	app.commandLine.appendSwitch("force-device-scale-factor", "1");
}

/**
 * Keep a global reference of the window object, if you don't, the window will
 * be closed automatically when the JavaScript object is garbage collected.
 */
var mainWindow;

/**
 * Opens a window.
 *
 * @method     openWindow
 */
function openWindow() {
	if (!commander.fullscreen) {
		mainWindow.show();
	}

	if (commander.audio) {
		if (commander.width === 1280 && (commander.height === 720)) {
			// if default values specified, tweak them for the audio manager
			commander.width  = 800;
			commander.height = 400;
		}
	}

	// Setup initial position and size
	mainWindow.setBounds({
		x:      commander.xorigin,
		y:      commander.yorigin,
		width:  commander.width,
		height: commander.height
	});

	// Start to build a URL to load
	var location = commander.server;

	// Test if we want an audio client
	if (commander.audio) {
		location = location + "/audioManager.html";
		if (commander.hash) {
			// add the password hash to the URL
			location += '?hash=' + commander.hash;
		} else if (commander.password) {
			// add the password hash to the URL
			location += '?session=' + commander.password;
		}
	} else if (commander.ui) {
		// or an UI client
		location = location + "/index.html";
		if (commander.hash) {
			// add the password hash to the URL
			location += '?hash=' + commander.hash;
		} else if (commander.password) {
			// add the password hash to the URL
			location += '?session=' + commander.password;
		}
	} else {
		// and by default a display client
		location = location + "/display.html?clientID=" + commander.display;
		if (commander.hash) {
			// add the password hash to the URL
			location += '&hash=' + commander.hash;
		} else if (commander.password) {
			// add the password hash to the URL
			location += '?session=' + commander.password;
		}
	}
	mainWindow.loadURL(location);

	if (commander.monitor !== null) {
		mainWindow.on('show', function() {
			mainWindow.setFullScreen(true);
			// Once all done, prevent changing the fullscreen state
			mainWindow.setFullScreenable(false);
		});
	} else {
		// Once all done, prevent changing the fullscreen state
		mainWindow.setFullScreenable(false);
	}
}

/**
 * Creates an electron window.
 *
 * @method     createWindow
 */
function createWindow() {
	// If a monitor is specified
	if (commander.monitor !== null) {
		// get all the display data
		let displays = electron.screen.getAllDisplays();
		// get the bounds of the interesting one
		let bounds = displays[commander.monitor].bounds;
		// overwrite the values specified
		commander.width   = bounds.width;
		commander.height  = bounds.height;
		commander.xorigin = bounds.x;
		commander.yorigin = bounds.y;
		commander.no_decoration = true;
	}

	// Create option data structure
	var options = {
		width:  commander.width,
		height: commander.height,
		frame:  !commander.no_decoration,
		fullscreen: commander.fullscreen,
		show: !commander.fullscreen,
		fullscreenable: commander.fullscreen,
		alwaysOnTop: commander.fullscreen,
		kiosk: commander.fullscreen,
		// resizable: !commander.fullscreen,
		webPreferences: {
			nodeIntegration: true,
			webSecurity: true,
			backgroundThrottling: false,
			plugins: commander.plugins,
			// allow this for now, problem loading webview recently
			allowDisplayingInsecureContent: true,
			allowRunningInsecureContent: true
		}
	};

	if (process.platform === 'darwin') {
		// noting for now
	} else {
		options.titleBarStyle = "hidden";
	}

	// Create the browser window.
	mainWindow = new BrowserWindow(options);

	if (commander.cache) {
		// clear the caches, useful to remove password cookies
		const session = electron.session.defaultSession;
		session.clearStorageData({
			storages: ["appcache", "cookies", "local storage", "serviceworkers"]
		}, function() {
			console.log('Electron>	Caches cleared');
			openWindow();
		});
	} else {
		openWindow();
	}

	// When the webview tries to download something
	electron.session.defaultSession.on('will-download', (event, item, webContents) => {
		// do nothing
		event.preventDefault();
		// send message to the render process (browser)
		mainWindow.webContents.send('warning', 'File download not supported');
	});

	// Mute the audio (just in case)
	var playAudio = commander.audio || (commander.display === 0);
	mainWindow.webContents.setAudioMuted(!playAudio);

	// Open the DevTools.
	if (commander.console) {
		mainWindow.webContents.openDevTools();
	}

	// Emitted when the window is closed.
	mainWindow.on('closed', function() {
		// Dereference the window object
		mainWindow = null;
	});

	mainWindow.webContents.on('will-navigate', function(ev) {
		// ev.preventDefault();
	});
}

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create a browser window.
 */
app.on('ready', createWindow);

/**
 * Quit when all windows are closed.
 */
app.on('window-all-closed', function() {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

/**
 * activate callback
 * On OS X it's common to re-create a window in the app when the
 * dock icon is clicked and there are no other window open.
 */
app.on('activate', function() {
	if (mainWindow === null) {
		createWindow();
	}
});


/**
 * Utiltiy function to parse command line arguments as number
 *
 * @method     myParseInt
 * @param      {String}    str           the argument
 * @param      {Number}    defaultValue  The default value
 * @return     {Number}    return an numerical value
 */
function myParseInt(str, defaultValue) {
	var int = parseInt(str, 10);
	if (typeof int == 'number') {
		return int;
	}
	return defaultValue;
}
