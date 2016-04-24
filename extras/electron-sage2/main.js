'use strict';

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const Menu = electron.Menu;
const Tray = electron.Tray;
 var appIcon = null;

app.commandLine.appendSwitch('enable-usermedia-screen-capturing');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 600
	});

	// and load the index.html of the app.
	mainWindow.loadURL('file://' + __dirname + '/index.html');

	// Open the DevTools.
	// mainWindow.webContents.openDevTools();

	// Emitted when the window is closed.
	mainWindow.on('closed', function() {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});

	mainWindow.webContents.on('will-navigate', function(ev) {
		console.log('will-navigate')
		ev.preventDefault();
	})

  	appIcon = new Tray(__dirname + '/images/S2.png');
  	var contextMenu = Menu.buildFromTemplate([
  		{ label: 'Item1', type: 'radio' },
  		{ label: 'Item2', type: 'radio' },
  		{ label: 'Item3', type: 'radio', checked: true },
  		{ label: 'Item4', type: 'radio' }
  		]);
	appIcon.setHighlightMode(false);
  	appIcon.setToolTip('SAGE2');
  	appIcon.setContextMenu(contextMenu);

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


