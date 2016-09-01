'use strict';

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

// parsing command-line arguments
var commander  = require('commander');
var version    = require('./package.json').version;

commander
	.version(version)
	.option('-d, --display <n>',   'Display client ID number (int)', parseInt, 0)
	.option('-s, --server <s>',    'Server URL (string)', 'http://localhost:9292')
	.option('-a, --audio',         'Open the audio manager (instead of display)', false)
	.option('-f, --fullscreen',    'Fullscreen (boolean)', false)
	.option('-n, --no_decoration', 'Remove window decoration (boolean)', false)
	.option('-x, --xorigin <n>',   'Window position x (int)', myParseInt, 0)
	.option('-y, --yorigin <n>',   'Window position y (int)', myParseInt, 0)
	.option('--width <n>',         'Window width (int)', myParseInt, 1280)
	.option('--height <n>',        'Window height (int)', myParseInt, 720)
	.option('--password <s>',      'Server password (string)', null)
	.option('--hash <s>',          'Server password hash (string)', null)
	.option('--cache',             'Clear the cache', false)
	.option('--console',           'Open the devtools console', false)
	.parse(process.argv);


// app.commandLine.appendSwitch('enable-usermedia-screen-capturing');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function openWindow() {
	mainWindow.setBounds({
		x: commander.xorigin,
		y: commander.yorigin,
		width:  commander.width,
		height: commander.height
	});
	if (commander.fullscreen) {
		mainWindow.setFullScreen(true);
	}

	var location = commander.server;
	if (commander.audio) {
		location = location + "/audioManager.html";
		if (commander.hash) {
			// add the password hash to the URL
			location += '?hash=' + commander.hash;
		} else if (commander.password) {
			// add the password hash to the URL
			location += '?session=' + commander.password;
		}
	} else {
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
}

function createWindow() {

	var options = {
		width:  commander.width,
		height: commander.height,
		frame:  !commander.no_decoration,
		webPreferences: {
			nodeIntegration: true,
			webSecurity: true,
			// webaudio: commander.audio
		}
	};

	if (process.platform === 'darwin') {
		// nothing yet
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

	// Mute the audio (just in case)
	mainWindow.webContents.setAudioMuted(true);

	// Open the DevTools.
	if (commander.console) {
		mainWindow.webContents.openDevTools();
	}

	// Emitted when the window is closed.
	mainWindow.on('closed', function() {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});

	mainWindow.webContents.on('will-navigate', function(ev) {
		// ev.preventDefault();
	});
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function () {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow();
	}
});


function myParseInt(str, defaultValue) {
	var int = parseInt(str, 10);
	if (typeof int == 'number') {
		return int;
	} else {
		return defaultValue;
	}
}
