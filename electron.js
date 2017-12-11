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
electron.app.setAppPath(process.cwd());

//
// handle install/update for Windows
//
if (require('electron-squirrel-startup')) {
	return;
}
// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
	// squirrel event handled and app will exit in 1000ms, so don't do anything else
	return;
}

function handleSquirrelEvent() {
	if (process.argv.length === 1) {
		return false;
	}

	const ChildProcess = require('child_process');
	const path = require('path');

	const appFolder = path.resolve(process.execPath, '..');
	const rootAtomFolder = path.resolve(appFolder, '..');
	const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
	const exeName = path.basename(process.execPath);

	const spawn = function(command, args) {
		let spawnedProcess;

		try {
			spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
		} catch (error) {
			// pass
		}

		return spawnedProcess;
	};

	const spawnUpdate = function(args) {
		return spawn(updateDotExe, args);
	};

	const squirrelEvent = process.argv[1];
	switch (squirrelEvent) {
		case '--squirrel-install':
		case '--squirrel-updated':
			// Install desktop and start menu shortcuts
			spawnUpdate(['--createShortcut', exeName]);
			setTimeout(app.quit, 1000);
			return true;
		case '--squirrel-uninstall':
			// Remove desktop and start menu shortcuts
			spawnUpdate(['--removeShortcut', exeName]);
			setTimeout(app.quit, 1000);
			return true;
		case '--squirrel-obsolete':
			app.quit();
			return true;
	}
}


// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
// Module to handle ipc with Browser Window
const ipcMain = electron.ipcMain;

// parsing command-line arguments
var commander = require('commander');
// get hardware and performance data
var si = require('systeminformation');
// Get the version from the package file
var version = require('./package.json').version;

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
	.option('-a, --audio',               'Open the audio manager (instead of display)', false)
	.option('-d, --display <n>',         'Display client ID number (int)', parseInt, 0)
	.option('-f, --fullscreen',          'Fullscreen (boolean)', false)
	.option('-m, --monitor <n>',         'Select a monitor (int)', myParseInt, null)
	.option('-n, --no_decoration',       'Remove window decoration (boolean)', false)
	.option('-p, --plugins',             'Enables plugins and flash (boolean)', false)
	.option('-s, --server <s>',          'Server URL (string)', 'http://localhost:9292')
	.option('-u, --ui',                  'Open the user interface (instead of display)', false)
	.option('-x, --xorigin <n>',         'Window position x (int)', myParseInt, 0)
	.option('-y, --yorigin <n>',         'Window position y (int)', myParseInt, 0)
	.option('--allowDisplayingInsecure', 'Allow displaying of insecure content (http on https)', false)
	.option('--allowRunningInsecure',    'Allow running insecure content (scripts accessed on http vs https)', false)
	.option('--cache',                   'Clear the cache', false)
	.option('--console',                 'Open the devtools console', false)
	.option('--debug',                   'Open the port debug protocol (port number is 9222 + clientID)', false)
	.option('--experimentalFeatures',    'Enable experimental features', false)
	.option('--hash <s>',                'Server password hash (string)', null)
	.option('--height <n>',              'Window height (int)', myParseInt, 720)
	.option('--password <s>',            'Server password (string)', null)
	.option('--show-fps',                'Display the Chrome FPS counter', false)
	.option('--width <n>',               'Window width (int)', myParseInt, 1280)
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

// Remove the limit on the number of connections per domain
//  the usual value is around 6
const url = require('url');
var parsedURL = url.parse(commander.server);
// default domais are local
var domains   = "localhost,127.0.0.1";
if (parsedURL.hostname) {
	// add the hostname
	domains +=  "," + parsedURL.hostname;
}
app.commandLine.appendSwitch("ignore-connections-limit", domains);

// Enable the Chrome builtin FPS display for debug
if (commander.showFps) {
	app.commandLine.appendSwitch("show-fps-counter");
}

// Enable port for Chrome DevTools Protocol to control low-level
// features of the browser. See:
// https://chromedevtools.github.io/devtools-protocol/
if (commander.debug) {
	// Common port for this protocol
	let port = 9222;
	// Offset the port by the client number, so every client gets a different one
	port += commander.display;
	// Add the parameter to the list of options on the command line
	app.commandLine.appendSwitch("remote-debugging-port", port.toString());
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
		// a default color while loading
		backgroundColor: "#565656",
		// resizable: !commander.fullscreen,
		webPreferences: {
			nodeIntegration: true,
			webSecurity: false, // seems to be an issue on Windows
			backgroundThrottling: false,
			plugins: commander.plugins,
			allowDisplayingInsecureContent: false,
			allowRunningInsecureContent: false,
			// this enables things like the CSS grid. add a commander option up top for enable / disable on start.
			experimentalFeatures: (commander.experimentalFeatures) ? true : false
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

	// when the display client is loaded
	mainWindow.webContents.on('did-finish-load', function() {
		// Get the basic information of the system
		si.getStaticData(function(data) {
			// Send it to the page, since it has the connection
			// to the server
			data.hostname = os.hostname();
			// fix on some system with no memory layout
			if (data.memLayout.length === 0) {
				si.mem(function(mem) {
					data.memLayout[0] = {size: mem.total};
					// send data to the HTML page, ie SAGE2_Display.js
					mainWindow.webContents.send('hardwareData', data);
				});
			} else {
				// send data to the HTML page, ie SAGE2_Display.js
				mainWindow.webContents.send('hardwareData', data);
			}
		});
	});

	// If the window opens before the server is ready,
	// wait 2 sec. and try again
	mainWindow.webContents.on('did-fail-load', function(ev) {
		setTimeout(function() {
			mainWindow.reload();
		}, 2000);
	});

	mainWindow.webContents.on('will-navigate', function(ev) {
		// ev.preventDefault();
	});

	ipcMain.on('getPerformanceData', function() {
		var perfData = {};
		var displayLoad = {
			cpuPercent: 0,
			memPercent: 0,
			memVirtual: 0,
			memResidentSet: 0
		};
		// CPU Load
		var load = si.currentLoad();
		var mem = load.then(function(data) {
			perfData.cpuLoad = data;
			return si.mem();
		});
		mem.then(data => {
			perfData.mem = data;
			return si.processes();
		})
			.then(data => {
				var displayProcess = data.list.filter(function(d) {
					return parseInt(d.pid) === parseInt(process.pid)
						|| parseInt(d.pid) === mainWindow.webContents.getOSProcessId();
				});

				displayProcess.forEach(el => {
					displayLoad.cpuPercent += el.pcpu;
					displayLoad.memPercent += el.pmem;
					displayLoad.memVirtual += el.mem_vsz;
					displayLoad.memResidentSet += el.mem_rss;
				});

				perfData.processLoad = displayLoad;
				mainWindow.webContents.send('performanceData', perfData);
			})
			.catch(error => console.error(error));
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
