// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization
// and Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2017

// require variables to be declared
"use strict";

var remote   = require('electron').remote;
var Menu     = remote.Menu;
var MenuItem = remote.MenuItem;
var Tray     = remote.Tray;

// Tray
var appIcon = null;
appIcon = new Tray(__dirname + '/images/S2.png');
var trayMenu = Menu.buildFromTemplate([
	{ label: 'Screen sharing', type: 'checkbox', checked: false, click: sharing_func },
	{type: 'separator'},
	{ label: 'Quit', type: 'normal', role: 'quit' }
]);
appIcon.setHighlightMode(false);
appIcon.setToolTip('SAGE2');
appIcon.setContextMenu(trayMenu);


var template = [{
	label: 'Edit',
	submenu: [ {
		label: 'Recent servers',
		submenu: []
	}, {
		label: 'Share Screen',
		click: function() {
			// start/stop screen sharing
			sharescreen_func();
		}
	}, {
		label: 'Pointer Settings',
		click: function() {
			// call the pointer name and color dialog
			userDialog();
		}
	}, {
		label: 'Clear Settings',
		click: function() {
			// start/stop screen sharing
			clearSettings();
		}
	}, {
		type: 'separator'
	}, {
		label: 'Cut',
		accelerator: 'CmdOrCtrl+X',
		role: 'cut'
	}, {
		label: 'Copy',
		accelerator: 'CmdOrCtrl+C',
		role: 'copy'
	}, {
		label: 'Paste',
		accelerator: 'CmdOrCtrl+V',
		role: 'paste'
	}]
	}, {
		label: 'View',
		submenu: [
			{label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'forcereload'},
			{role: 'toggledevtools'},
			{type: 'separator'},
			{role: 'resetzoom'},
			{role: 'zoomin'},
			{role: 'zoomout'},
			{type: 'separator'}
		]
	}, {
		role: 'window',
		submenu: [
			{role: 'minimize'}
		]
	}, {
		role: 'help',
		submenu: [{
			label: 'Learn about SAGE2',
			click () { require('electron').shell.openExternal('http://sage2.sagecommons.org/') }
		}]
	}
];

if (process.platform == 'darwin') {
	var name = require('electron').remote.app.getName();
	template.unshift({
		label: name,
		submenu: [{
			label: 'About ' + name,
			role: 'about'
		}, {
			label: 'Hide ' + name,
			accelerator: 'Command+H',
			role: 'hide'
		}, {
			label: 'Hide Others',
			accelerator: 'Command+Alt+H',
			role: 'hideothers'
		}, {
			label: 'Show All',
			role: 'unhide'
		}, {
			type: 'separator'
		}, {
			label: 'Quit',
			accelerator: 'Command+Q',
			click: function() {
				stopsharing_func();
				require('electron').remote.app.quit();
			}
		}]
	});
}

// Add the recent servers
var newtemplate = [];
var recentServers = getRecentServers();
recentServers.map(function(elt) {
	newtemplate.push({label: elt.server, click: selectServer});
})
if (process.platform === 'darwin') {
	// Mac
	template[1].submenu[0].submenu = newtemplate;
} else {
	// Linux / Windows
	template[0].submenu[0].submenu = newtemplate;
}

// Build the menu
var menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu)

// SAGE2 code
var wsio;
var interactor;
var configuration;

navigator.getUserMedia = (navigator.getUserMedia  || navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia || navigator.msGetUserMedia);

var show_browser = true;
var save_width   = 1200;
var hasMouse     = true;

// Explicitely close web socket when web browser is closed
window.onbeforeunload = function() {
	if (appIcon) {
		appIcon.destroy();
	}
	// stop screen sharing
	stopsharing_func();
};

/**
 * When the page loads, everything starts
 *
 */
window.addEventListener('load', function(event) {
	webix.ready(function () {
		SAGE2_init();
	});
});

var msgOpen = false;
var uploadMessage, msgui;

function getRecentServers() {
	var myservers = [];
	if (localStorage.servers) {
		myservers = JSON.parse(localStorage.servers);
	}
	return myservers;
}


/**
 * Function for the Tray icon, to start/stop screen sharing
 *
 * @method     sharing_func
 * @param      {<type>}  menuitem  The menuitem
 * @param      {<type>}  win       The window
 * @param      {<type>}  event     The event
 */
function sharing_func(menuitem, win, event) {
	if (menuitem.checked) {
		sharescreen_func();
	} else {
		stopsharing_func();
	}
}

/**
 * Clear all the cache and application storage
 *
 * @method     clearSettings
 */
function clearSettings() {
	var session = remote.session.defaultSession;
	session.clearStorageData({
		storages: ["appcache", "cookies", "localstorage", "serviceworkers"]
	}, function() {
		// Reload the Electron page
		remote.getCurrentWindow().reload();
	});
}



/**
* Open Dialog asking for pointer name and color
*
* @function userDialog
*/
function userDialog() {
	webix.ui({
		view: "window",
		id: "username_form",
		position: "center",
		modal: true,
		head: "Set your pointer name and color",
		body: {
			view: "form",
			width: 250,
			borderless: false,
			rows: [
				{
					view: "text", id: "user_name",
					label: "User name", name: "username",
					value: localStorage.SAGE2_ptrName
				},
				{
					view: "text", label: "User color",
					id: "text_color", value: localStorage.SAGE2_ptrColor
				},
				{
					view: "colorboard", id: "user_color",
					label: "Color", name: "usercolor",
					cols: 7, rows: 5,
					minLightness: 0.3, maxLightness: 1,
					width: 40, height: 100
				},
				{
					cols: [{
						view: "button", id: "user_button", value: "Ok",
						type: "form", disabled: true
					}]
				}
			]
		}
	}).show();
	// Attach event handlers
	$$("user_color").attachEvent("onSelect", function(val) {
		// When color selected and name not empty, enable OK button
		if ($$("user_name").getValue()) {
			$$("user_button").enable();
			$$("text_color").setValue(val);
		}
	});
	$$("user_name").attachEvent("onTimedKeyPress", function() {
		// When get a name and a color, enable OK button
		if (this.getValue() && $$("user_color").getValue()) {
			$$("user_button").enable();
		} else {
			$$("user_button").disable();
		}
	});
	$$("user_button").attachEvent("onItemClick", function(val) {
		// When OK button pressed

		var uname  = $$("user_name").getValue();
		var ucolor = $$("user_color").getValue();

		// Set the values into localStorage of browser
		localStorage.SAGE2_ptrName  = uname;
		localStorage.SAGE2_ptrColor = ucolor;

		// Close the UI
		this.getTopParentView().hide();
	});
	// Focus the text box
	$$('user_name').focus();
}

/**
 * File upload start callback
 *
 * @method fileUploadStart
 * @param files {Object} array-like that containing the file infos
 */
function fileUploadStart(files) {
	// Template for a prograss bar form
	var aTemplate = '<div style="padding:0; margin: 0;"class="webix_el_box">' +
		'<div style="width:#proc#%" class="webix_accordionitem_header">&nbsp;</div></div>';
	webix.protoUI({
		name: "ProgressBar",
		defaults: {
			template: aTemplate,
			data: {	proc: 0	},
			borderles: true,
			height: 25
		},
		setValue: function(val) {
			if ((val < 0) || (val > 100)) {
				throw "Invalid val: " + val + " need in range 0..100";
			}
			this.data.proc = val;
			this.refresh();
		}
	}, webix.ui.template);

	// Build the form with file names
	var form = [];
	var aTitle;
	var panelHeight = 80;
	if (files.length === 1) {
		aTitle = "Uploading a file";
		form.push({view: "label", align: "center", label: files[0].name});
	} else {
		aTitle = "Uploading " + files.length + " files";
		panelHeight = 140;

		for (var i = 0; i < Math.min(files.length, 3); i++) {
			var aLabel = (i + 1).toString() + " - " + files[i].name;
			form.push({view: "label", align: "left", label: aLabel});
		}
		if (files.length > 3) {
			form.push({view: "label", align: "left", label: "..."});
		}
	}
	// Add the progress bar element from template
	form.push({id: 'progressBar', view: 'ProgressBar'});

	// Create a modal window wit empty div
	uploadMessage = webix.modalbox({
		title: aTitle,
		buttons: ["Cancel"],
		margin: 25,
		text: "<div id='box_content' style='width:100%; height:100%'></div>",
		width: "80%",
		position: "center",
		callback: function(result) {
			interactor.cancelUploads();
			msgOpen = false;
			webix.modalbox.hide(this);
		}
	});
	// Add the form into the div
	msgui = webix.ui({
		container: "box_content",
		height: panelHeight,
		rows: form
	});
	// The dialog is now open
	msgOpen = true;
}

/**
 * File upload progress callback
 *
 * @method fileUploadProgress
 * @param percent {Number} process
 */
function fileUploadProgress(percent) {
	// upadte the progress bar element
	var pgbar = $$('progressBar');
	var val   = percent * 100;
	if (val > 100) {
		val = 0;
	}
	pgbar.setValue(val);
}

/**
 * Triggered on file upload complete: redraw UI
 *
 * @method fileUploadComplete
 */
function fileUploadComplete() {
	// close the modal window if still open
	if (msgOpen) {
		webix.modalbox.hide(uploadMessage);
	}

	// Seems useful, sometimes (at the end of upload)
	setTimeout(function() {
		displayUI.fileUpload = false;
		displayUI.draw();
	}, 500);
}

function isValidURL(str) {
	var pattern1 = new RegExp('^(https?:\\/\\/)');
	var pattern2 = new RegExp('^(http?:\\/\\/)');
	return pattern1.test(str) || pattern2.test(str);
}
function isValidWebsocket(str) {
	var pattern1 = new RegExp('^(wss?:\\/\\/)');
	var pattern2 = new RegExp('^(ws?:\\/\\/)');
	return pattern1.test(str) || pattern2.test(str);
}
function isValidSecureWebsocket(str) {
	var pattern1 = new RegExp('^(wss?:\\/\\/)');
	return pattern1.test(str);
}

/**
 * Get geolocation from thebrowser if possible (google API key put in the electron process)
 *
 * @method     geoLocation
 */
function geoLocation() {
	var location;
	if ("geolocation" in navigator) {
		console.log('Geo> Location services available')
		navigator.geolocation.getCurrentPosition(function(position) {
			location = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			}
			console.log('Geo> got location', location);
		}, function (err) {
			console.warn('Geo> user geolocation error:', err.message, err.code);
		}, {
			enableHighAccuracy: true, // high-precision
			timeout: 5000,  // 5 sec. maximum
			maximumAge: 0   // get a fresh value
		});
	} else {
		console.warn('Geo> geolocation services unvailable in this browser');		
	}
}



/**
 * Entry point of the user interface
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	console.log('SAGE2 Init');

	// First time a user connects
	if (!localStorage.SAGE2_ptrColor) {
		userDialog();
	}

	// Get location of the user
	geoLocation();

	var recents = getRecentServers();
	var lastServer, lastCode;
	if (recents.length > 0) {
		lastServer = recents[0].server;
		lastCode   = recents[0].code;
	}

	var mainUI = webix.ui({
		"id": "mainUI",
		"container": "wrapper",
		id: "column1",
		width: 300,
		rows : [
		{
			cols : [
				{
					label: "Server", view: "text",
					id: "sage2_id",
					placeholder: "hostname[:secure_port]",
					value: lastServer,
					css: "mylabel"
				}
			]
		},
		{
			cols : [
				{
					label: "Passcode", view: "text",
					type:'password',
					id: "passcode_id",
					placeholder: "Optional access code",
					value: lastCode,
					css: "mylabel"
				}
			]
		},
		{
			cols : [
				{
					value: "Connect", view: "button",
					id: "connect_id",
					click: connect_func,
				}
			]
		},
		{
			cols : [
				{
					value: "Share your screen", view: "button",
					id: "sharescreen_id",
					click: sharescreen_func,
				}
			]
		},
		{
			value: "Show pointer", view: "button",
			id: "pointer_id",
			click: startpointer_func,						
		},
		{
			template: '<img height=100% style="display:block;margin-left:auto;margin-right:auto"' + 
				'src="images/S2-logo.png"/>',
			height: 170,
			id: "logo_id"
		}
		]
	});

	// When all UI ready
	webix.promise.all([]).then(function() {
		// Attach handlers for keyboard
		$$("sage2_id").attachEvent("onKeyPress", function(code, e) {
			// ENTER activates
			if (code === 13) {
				connect_func();
			}
		});
		$$("passcode_id").attachEvent("onKeyPress", function(code, e) {
			// ENTER activates
			if (code === 13) {
				connect_func();
			}
		});
		// set the URL fox the default focus
		$$("sage2_id").focus();

		// Drag-and-drop
		webix.event(mainUI.$view, "dragover", function(e){
			e.preventDefault();
		});
		webix.event(mainUI.$view, "drop", function(e){
			if (interactor) {
				interactor.uploadFiles(e.dataTransfer.files, 0, 0);
			}
			e.preventDefault();
		});
	});
}

function showMessage(msg) {
	webix.alert({
		type: "alert-warning",
		title: "SAGE2™",
		ok: "OK",
		text: msg
	});
}

function selectServer(elt) {
	var value = elt.label;
	var myservers = getRecentServers();
	var got = myservers.find(function(elt) {
		return (elt.server === value);
	});

	// set the text fields
	$$('sage2_id').setValue(got.server);
	$$('passcode_id').setValue(got.code);
	// Connect automatically
	disconnect_func();
	connect_func();
}

function disconnect_func() {
	if (wsio) {
		wsio.close();
		if (interactor) {
			interactor.stopSAGE2Pointer();
			interactor.removeListeners();
			interactor = undefined;
		}
		wsio = undefined;
	}

	var pbutton = $$('connect_id').$view.querySelector('button');
	pbutton.style.backgroundColor = "#3498db";
	pbutton.innerText = "Connect";
}

function connect_func() {
	if (wsio) {
		// if socket exists, disconnect
		disconnect_func();

		return;
	}

	var aurl  = $$('sage2_id').getValue();
	var pcode = $$('passcode_id').getValue();
	$$('passcode_id').$setValue('');
	var surl;

	if (!aurl) {
		return;
	}

	var myservers = getRecentServers();
	// add the address to the top, if not already included
	var got = myservers.findIndex(function(elt) {
		return (elt.server === aurl);
	});
	if (got !== -1) {
		// if found, delete the element
		myservers.splice(got, 1);
	}
	// and add it on top
	var len = myservers.unshift({server: aurl, code: pcode});
	// if too big, reduce
	if (len >= 5) {
		// only keep the 5 most recent
		myservers = myservers.slice(0, 4);
	}
	// put it back into storage
	localStorage.servers = JSON.stringify(myservers);

	// Buid the new list for the menu
	var newtemplate = [];
	myservers.map(function(elt) {
		newtemplate.push({label: elt.server, click: selectServer});
	})
	if (process.platform === 'darwin') {
		// Mac
		template[1].submenu[0].submenu = newtemplate;
	} else {
		// Linux / Windows
		template[0].submenu[0].submenu = newtemplate;
	}

	// Rebuild the menu
	var menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu)


	if (isValidSecureWebsocket(aurl)) {
		surl = aurl;
	} else {
		if (!isValidURL(aurl)) {
			aurl = 'https://' + aurl;
		}
		var parsedURL = new URL(aurl);
		if (parsedURL.host) {
			aurl = parsedURL.host;
		} else {
			aurl = parsedURL.href;
		}
		surl = "wss://" + aurl;
		// update the UI
		$$('sage2_id').setValue(aurl);
	}

	console.log('Connecting to', surl, pcode);

	// Detect which browser is being used
	SAGE2_browser();

	// Create a connection to the SAGE2 server
	wsio = new WebsocketIO(surl);
	// socket close event (i.e. server crashed)
	wsio.on('close', function(evt) {
		showMessage("Connection closed");

		var pbutton = $$('connect_id').$view.querySelector('button');
		pbutton.style.backgroundColor = "#3498db";
		pbutton.innerText = "Connect";
	});
	wsio.open(function() {
		console.log("Websocket opened");

		setupListeners();

		var clientDescription = {
			clientType: "sageUI",
			requests: {
				config:  true,
				version: true,
				time:    false,
				console: false
			},
			browser: __SAGE2__.browser,
			session: pcode ? md5(pcode) : null
		};
		wsio.emit('addClient', clientDescription);

		// Interaction object: file upload, desktop sharing, ...
		interactor = new SAGE2_interaction(wsio);
		interactor.setFileUploadStartCallback(fileUploadStart);
		interactor.setFileUploadProgressCallback(fileUploadProgress);
		interactor.setFileUploadCompleteCallback(fileUploadComplete);
	});
}

function sharescreen_func() {
	if (interactor && interactor.broadcasting) {
		stopsharing_func();
	} else if (interactor && !interactor.broadcasting) {
			// start the sharing
			interactor.captureDesktop("screen");
			// update the button
			var pbutton = $$('sharescreen_id').$view.querySelector('button');
			pbutton.style.backgroundColor = "#00b359";
			pbutton.innerText = "Sharing...";
			// update tray item
			trayMenu.items[0].checked = true;
	} else {
		showMessage("Connect to server first");
		// update tray item
		trayMenu.items[0].checked = false;
	}
}

function stopsharing_func() {
	if (interactor && interactor.mediaStream !== null) {
		var track = interactor.mediaStream.getTracks()[0];
		track.stop();
		// update tray item
		trayMenu.items[0].checked = false;
		// update button
		// update the button
		var pbutton = $$('sharescreen_id').$view.querySelector('button');
		pbutton.style.backgroundColor = "#3498db";
		pbutton.innerText = "Share your screen";
	}
}

function startpointer_func() {
	if (interactor && !interactor.pointering) {
		interactor.startSAGE2Pointer($$('pointer_id').$view.querySelector('button'));
	}
}

function setupListeners() {
	wsio.on('initialize', function(data) {
		console.log('initialize', data);
		interactor.setInteractionId(data.UID);

		// Update button color and label
		var pbutton = $$('connect_id').$view.querySelector('button');
		pbutton.style.backgroundColor = "#00b359";
		pbutton.innerText = "Connected";
	});


	// Open a popup on message sent from server
	wsio.on('errorMessage', function(data) {
		console.log('message from server>', data);
	});

	wsio.on('setupDisplayConfiguration', function(config) {
		console.log('Display', config);
		// keep a copy of the server config
		configuration = config;

		var sage2Min  = Math.min(config.totalWidth, config.totalHeight);
		var screenMin = Math.min(screen.width, screen.height);
		interactor.setPointerSensitivity(sage2Min / screenMin);
	});

	// Server sends the SAGE2 version
	wsio.on('setupSAGE2Version', function(data) {
		console.log('SAGE2: version', data.base, data.branch, data.commit, data.date);
	});

	wsio.on('requestNextFrame', function(data) {
		interactor.requestMediaStreamFrame();
	});

	wsio.on('stopMediaCapture', function() {
		if (interactor.mediaStream !== null) {
			var track = interactor.mediaStream.getTracks()[0];
			track.stop();
		}
	});

	wsio.on('createAppWindowPositionSizeOnly', function() {
		// pass
	});
}
