// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-15

"use strict";

/* global FileManager, webix */

/**
 * Web user interface
 *
 * @module client
 * @submodule SAGE2_UI
 * @class SAGE2_UI
 */

window.URL = (window.URL || window.webkitURL || window.msURL || window.oURL);
navigator.getUserMedia   = (navigator.getUserMedia  || navigator.webkitGetUserMedia ||
							navigator.mozGetUserMedia || navigator.msGetUserMedia);
document.exitPointerLock = document.exitPointerLock ||
							document.mozExitPointerLock  ||
							document.webkitExitPointerLock;

//
// Polyfill for 'bind' - needed for older version of iOS Safari mobile ;-(
//
/* eslint-disable */
if (!Function.prototype.bind) {
	Function.prototype.bind = function(oThis) {
		if (typeof this !== 'function') {
			// closest thing possible to the ECMAScript 5
			// internal IsCallable function
			throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
		}
		var aArgs = Array.prototype.slice.call(arguments, 1);
		var _this = this;
		var FNOP    = function() {};
		var fBound  = function() {
			return _this.apply(this instanceof FNOP && oThis ? this : oThis,
						aArgs.concat(Array.prototype.slice.call(arguments)));
		};
		FNOP.prototype = this.prototype;
		fBound.prototype = new FNOP();
		return fBound;
	};
}


//
// Polyfill for 'startsWith'
//
if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position) {
		position = position || 0;
		return this.indexOf(searchString, position) === position;
	};
}
/* eslint-enable */
//

var wsio;
var displayUI;
var interactor;
var fileManager;
var keyEvents;
var touchMode;
var touchDist;
var touchTime;
var touchTap;
var touchTapTime;
var touchHold;
var touchStartX;
var touchStartY;

var openDialog;
var selectedAppEntry;
var selectedFileEntry;
var type2App;

var hasMouse;

var pointerDown;
var pointerX, pointerY;

var sage2Version;


/**
 * Reload the page if a application cache update is available
 *
 */
if (window.applicationCache) {
	applicationCache.addEventListener('updateready', function() {
		window.location.reload();
	});
}

/**
 * Ask before closing the browser if desktop sharing in progress
 *
 */
window.addEventListener('beforeunload', function(event) {
	if (interactor && interactor.broadcasting) {
		var confirmationMessage = "SAGE2 Desktop sharing in progress";

		event.returnValue = confirmationMessage;  // Gecko, Trident, Chrome 34+
		return confirmationMessage;               // Gecko, WebKit, Chrome <34
	}
});

/**
 * Closing desktop sharing before the browser closes
 *
 */
window.addEventListener('unload', function(event) {
	if (interactor && interactor.broadcasting) {
		interactor.streamEnded();
	}
});


/**
 * Entry point of the user interface
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	// Redirection to HTTPS
	if (window.location.protocol === "http:") {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", "config", true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4 && xhr.status === 200) {
				var json_cfg = JSON.parse(xhr.responseText);

				var https_port;
				if (json_cfg.rproxy_secure_port !== undefined) {
					https_port = ":" + json_cfg.rproxy_secure_port.toString();
				} else {
					https_port = ":" + json_cfg.secure_port.toString();
				}
				if (https_port === ":443") {
					https_port = "";
				}

				window.location.replace("https://" + window.location.hostname + https_port + window.location.pathname);
			}
		};
		xhr.send();
		return;
	}

	// Detect which browser is being used
	SAGE2_browser();

	// Deal with the warning label in the UI if Chrome or not Chrome
	if (!__SAGE2__.browser.isMobile) {
		if (!__SAGE2__.browser.isChrome) {
			var chromeWarn = document.getElementById("usechrome");
			// Make it visible
			chromeWarn.style.display = "block";
		}
	}

	// Create a connection to the SAGE2 server
	wsio = new WebsocketIO();
	wsio.open(function() {
		console.log("Websocket opened");

		// Show and hide elements once connect to server
		document.getElementById('loadingUI').style.display     = "none";
		document.getElementById('displayUIDiv').style.display  = "block";
		document.getElementById('menuContainer').style.display = "block";

		// Start an initial resize of the UI once we get a connection
		SAGE2_resize();

		setupListeners();

		var clientDescription = {
			clientType: "sageUI",
			requests: {
				config: true,
				version: true,
				time: false,
				console: false
			},
			browser: __SAGE2__.browser
		};
		console.log("addClient "+JSON.stringify(clientDescription));
		wsio.emit('addClient', clientDescription);

		// Interaction object: file upload, desktop sharing, ...
		interactor = new SAGE2_interaction(wsio);
		interactor.setFileUploadStartCallback(fileUploadStart);
		interactor.setFileUploadProgressCallback(fileUploadProgress);
		interactor.setFileUploadCompleteCallback(fileUploadComplete);

		// Send message to desktop capture Chrome extension
		console.log("Enabling desktop capture...");
		window.postMessage('SAGE2_desktop_capture_enabled', "*");
	});

	// socket close event (i.e. server crashed)
	wsio.on('close', function(evt) {
		// show a popup for a long time
		showSAGE2Message("Server offline", 2147483);
		// try to reload every few seconds
		var refresh = setInterval(function() {
			reloadIfServerRunning(function() {
				clearInterval(refresh);
			});
		}, 2000);
	});

	var sage2UI = document.getElementById('sage2UICanvas');

	// window.addEventListener('dragover', preventDefault, false);
	// window.addEventListener('dragend',  preventDefault, false);
	// window.addEventListener('drop',     preventDefault, false);

	sage2UI.addEventListener('dragover',  preventDefault, false);
	sage2UI.addEventListener('dragenter', fileDragEnter,  false);
	sage2UI.addEventListener('dragleave', fileDragLeave,  false);
	sage2UI.addEventListener('drop',      fileDrop,       false);

	// Force click for Safari, events:
	//   webkitmouseforcewillbegin webkitmouseforcechanged
	//   webkitmouseforcedown webkitmouseforceup
	sage2UI.addEventListener("webkitmouseforceup", forceClick, false);

	if (webix) {
		// disabling the webix touch managment for now
		webix.Touch.disable();
	}

	document.addEventListener('mousemove',  mouseCheck,   false);
	document.addEventListener('touchstart', touchStart,   false);
	document.addEventListener('touchend',   touchEnd,     false);
	document.addEventListener('touchmove',  touchMove,    false);
	document.addEventListener('keyup',      escapeDialog, false);
	document.addEventListener('keydown',    noBackspace,  false);

	keyEvents = false;
	openDialog = null;
	selectedAppEntry = null;
	selectedFileEntry = null;
	touchTime = 0;
	touchTapTime = 0;
	touchHold = null;
	touchMode = "";

	type2App = {
		images: "image_viewer",
		videos: "movie_player",
		pdfs: "pdf_viewer",
		sessions: "load_session"
	};

	hasMouse = false;
	console.log("Assuming mobile device");

	// Event listener to the Chrome extension for desktop capture
	window.addEventListener('message', function(event) {
		if (event.origin !== window.location.origin) {
			return;
		}
		if (event.data.cmd === "SAGE2_desktop_capture-Loaded") {
			if (interactor !== undefined && interactor !== null) {
				// Chrome extension is loaded
				console.log('SAGE2 Chrome extension is loaded');
				interactor.chromeDesktopCaptureEnabled = true;
				console.log('Auto-start screen sharing');
				interactor.startScreenShare();
			}
		}
		if (event.data.cmd === "window_selected") {
			interactor.captureDesktop(event.data.mediaSourceId);
		}
	});
}

// Show error message for 2 seconds (or time given as parameter in seconds)
function showSAGE2Message(message, delay) {
	var aMessage = webix.alert({
		type:  "alert-error",
		title: "SAGE2 Error",
		ok:    "OK",
		width: "40%",
		text:  "<span style='font-weight:bold;'>" + message + "</span>"
	});
	setTimeout(function() {
		if (aMessage) {
			webix.modalbox.hide(aMessage);
		}
	}, delay ? delay * 1000 : 2000);
}

function setupListeners() {
	wsio.on('initialize', function(data) {
		interactor.setInteractionId(data.UID);
		pointerDown = false;
		pointerX    = 0;
		pointerY    = 0;

		var sage2UI = document.getElementById('sage2UICanvas');
	});

	// Open a popup on message sent from server
	wsio.on('errorMessage', showSAGE2Message);

	wsio.on('setupDisplayConfiguration', function(config) {
		displayUI = new SAGE2DisplayUI();
		displayUI.init(config, wsio);
		displayUI.resize();

		var sage2Min  = Math.min(config.totalWidth, config.totalHeight);
		var screenMin = Math.min(screen.width, screen.height);
		interactor.setPointerSensitivity(sage2Min / screenMin);

		// Update the file manager
		if (fileManager) {
			fileManager.serverConfiguration(config);
		}
	});

	wsio.on('createAppWindowPositionSizeOnly', function(data) {
		displayUI.addAppWindow(data);
	});

	wsio.on('deleteElement', function(data) {
		displayUI.deleteApp(data.elemId);
	});

	wsio.on('updateItemOrder', function(data) {
		displayUI.updateItemOrder(data);
	});

	wsio.on('setItemPosition', function(data) {
		displayUI.setItemPosition(data);
	});

	wsio.on('setItemPositionAndSize', function(data) {
		displayUI.setItemPositionAndSize(data);
	});

	// Server sends the SAGE2 version
	wsio.on('setupSAGE2Version', function(data) {
		sage2Version = data;
		console.log('SAGE2: version', data.base, data.branch, data.commit, data.date);
	});

	wsio.on('availableApplications', function(data) {
		var appList = document.getElementById('appList');
		var appListContainer = document.getElementById('appListContainer');
		var size = parseInt(appListContainer.style.width, 10) / 6;

		removeAllChildren(appList);

		var i = 0;
		var appname;
		var fullpath;
		while (i < data.length) {
			var row = document.createElement('tr');
			var appsPerRow = Math.min(data.length - i, 6);
			for (var j = 0; j < appsPerRow; j++) {
				appname  = data[i + j].exif.FileName;
				fullpath = data[i + j].id;
				var col = document.createElement('td');
				col.id  = "available_app_row_" + appname;
				col.setAttribute("application", appname);
				col.setAttribute("appfullpath", fullpath);
				col.style.verticalAlign = "top";
				col.style.textAlign = "center";
				col.style.width = size + "px";
				col.style.paddingTop = "12px";
				col.style.paddingBottom = "12px";
				var appIcon = document.createElement('img');
				appIcon.id = "available_app_icon_" + appname;
				appIcon.setAttribute("application", appname);
				appIcon.setAttribute("appfullpath", fullpath);
				appIcon.src = data[i + j].exif.SAGE2thumbnail + "_256.jpg";
				appIcon.width = parseInt(size * 0.8, 10);
				appIcon.height = parseInt(size * 0.8, 10);
				var appName = document.createElement('p');
				appName.id = "available_app_name_" + appname;
				appName.setAttribute("application", appname);
				appName.setAttribute("appfullpath", fullpath);
				appName.textContent = data[i + j].exif.metadata.title;
				col.appendChild(appIcon);
				col.appendChild(appName);
				row.appendChild(col);
			}
			appList.appendChild(row);
			i += appsPerRow;
		}

		showDialog('appLauncherDialog');
	});

	wsio.on('storedFileList', function(data) {
		document.getElementById('images-dir').checked   = false;
		document.getElementById('pdfs-dir').checked     = false;
		document.getElementById('videos-dir').checked   = false;
		document.getElementById('sessions-dir').checked = false;

		var images   = document.getElementById('images');
		var videos   = document.getElementById('videos');
		var pdfs     = document.getElementById('pdfs');
		var sessions = document.getElementById('sessions');

		removeAllChildren(images);
		removeAllChildren(videos);
		removeAllChildren(pdfs);
		removeAllChildren(sessions);

		var longestImageName   = createFileList(data, "images",   images);
		var longestVideoName   = createFileList(data, "videos",   videos);
		var longestPdfName     = createFileList(data, "pdfs",     pdfs);
		var longestSessionName = createFileList(data, "sessions", sessions);

		var longest = Math.max(longestImageName, longestVideoName, longestPdfName, longestSessionName);
		document.getElementById('fileListElems').style.width = (longest + 60).toString() + "px";

		// showDialog('mediaBrowserDialog');
		if (fileManager) {
			// Update the filemanager with the new list
			fileManager.updateFiles(data);
		}
	});

	wsio.on('requestNextFrame', function(data) {
		interactor.requestMediaStreamFrame();
	});

	wsio.on('stopMediaCapture', function() {
		if (interactor.mediaStream !== null) {
			// interactor.mediaStream.stop();
			var track = interactor.mediaStream.getTracks()[0];
			track.stop();
		}
	});
}


/**
 * Handler resizes
 *
 * @method SAGE2_resize
 * @param ratio {Number} scale factor
 */
function SAGE2_resize(ratio) {
	ratio = ratio || 1.0;

	var fm = document.getElementById('fileManager');
	if (fm.style.display === "block") {
		ratio = 0.5;
	}

	resizeMenuUI(ratio);
	resizeDialogs();

	if (displayUI) {
		displayUI.resize(ratio);

		var mainUI = document.getElementById('mainUI');
		var newHeight = window.innerHeight - mainUI.clientHeight;
		fileManager.main.config.height = newHeight - 10;
		fileManager.main.adjust();
	}
}

/**
 * Resize menus
 *
 * @method resizeMenuUI
 * @param ratio {Number} scale factor
 */
function resizeMenuUI(ratio) {
	var menuContainer = document.getElementById('menuContainer');
	var menuUI        = document.getElementById('menuUI');

	// Extra scaling factor
	ratio = ratio || 1.0;

	var menuScale = 1.0;
	var freeWidth = window.innerWidth * ratio;
	if (freeWidth < 856) {
		menuScale = freeWidth / 856;
	}

	menuUI.style.webkitTransform = "scale(" + menuScale + ")";
	menuUI.style.mozTransform = "scale(" + menuScale + ")";
	menuUI.style.transform = "scale(" + menuScale + ")";
	menuContainer.style.height = parseInt(86 * menuScale, 10) + "px";

	// Center the menu bar
	var mw = menuUI.getBoundingClientRect().width;
	menuContainer.style.marginLeft = Math.round((window.innerWidth - mw) / 2) + "px";
}

/**
 * Get a CSS value from a style sheet
 *
 * @method getCSSProperty
 * @param cssFile {String} CSSS sheet
 * @param selector {String} item to search
 */
function getCSSProperty(cssFile, selector) {
	for (var i = 0; i < document.styleSheets.length; i++) {
		var sheet = document.styleSheets[i];
		if (sheet.href && sheet.href.indexOf(cssFile) >= 0) {
			var rules = sheet.cssRules ? sheet.cssRules : sheet.rules;
			if (!rules || rules.length === 0) {
				return null;
			}
			for (var j = 0; j < rules.length; j++) {
				if (rules[j].selectorText === selector) {
					return rules[j];
				}
			}
			break;
		}
	}
	return null;
}

/**
 * Resize window handling
 *
 * @method resizeDialogs
 */
function resizeDialogs() {
	var windowAspect = window.innerWidth / window.innerHeight;
	var appListContainer = document.getElementById('appListContainer');
	appListContainer.style.width  = (window.innerWidth * 0.7 - 24).toString() + "px";
	appListContainer.style.height = (window.innerHeight * 0.7 - 72).toString() + "px";
	var fileListContainer = document.getElementById('fileListContainer');
	fileListContainer.style.width  = (window.innerWidth / 2 * 0.6 - 24).toString() + "px";
	fileListContainer.style.height = (window.innerHeight / 2 - 72).toString() + "px";
	var metadata = document.getElementById('metadata');
	metadata.style.left   = (window.innerWidth / 2 * 0.6 - 13).toString() + "px";
	metadata.style.width  = (window.innerWidth / 2 * 0.4).toString() + "px";
	metadata.style.height = (window.innerHeight / 2 - 72).toString() + "px";
	var sage2pointerHelp  = document.getElementById('sage2pointerHelp');
	var sage2pointerHelpAspect  = 1264.25 / 982.255;
	if (sage2pointerHelpAspect <= windowAspect) {
		sage2pointerHelp.height = window.innerHeight * 0.7;
		sage2pointerHelp.width  = sage2pointerHelp.height * sage2pointerHelpAspect;
	} else {
		sage2pointerHelp.width  = window.innerWidth * 0.7;
		sage2pointerHelp.height = sage2pointerHelp.width / sage2pointerHelpAspect;
	}
}

/**
 * Create a list of element, returns the longest one
 *
 * @method createFileList
 * @param list {Event} list of files
 * @param type {Event} type of list
 * @param parent {Event} add elements to parent
 * @return {Number} return the longest elememt
 */
function createFileList(list, type, parent) {
	var textWidthTest = document.getElementById('textWidthTest');
	var longest = 0;
	for (var i = 0; i < list[type].length; i++) {
		var file = document.createElement('li');
		file.textContent = list[type][i].exif.FileName;
		file.id          = "file_" + list[type][i].exif.FileName;
		file.setAttribute("application", type2App[type]);

		// Use the file id that contains the complete path on the server
		file.setAttribute("file", list[type][i].id);

		file.setAttribute("thumbnail", list[type][i].exif.SAGE2thumbnail);
		parent.appendChild(file);

		textWidthTest.textContent = file.textContent;
		var textWidth = (textWidthTest.clientWidth + 1);
		if (textWidth > longest) {
			longest = textWidth;
		}
	}
	textWidthTest.textContent = "";
	return longest;
}

/**
 * Prevent default event processing on a event
 *
 * @method preventDefault
 * @param event {Event} event data
 */
function preventDefault(event) {
	if (event.preventDefault) {
		// required by FF + Safari
		event.preventDefault();
	}
	// tells the browser what drop effect is allowed here
	event.dataTransfer.dropEffect = 'copy';
	// required by IE
	return false;
}

/**
 * Start drag'n'drop
 *
 * @method fileDragEnter
 * @param event {Event} event data
 */
function fileDragEnter(event) {
	event.preventDefault();

	var sage2UI = document.getElementById('sage2UICanvas');
	sage2UI.style.borderStyle = "dashed";
	displayUI.fileDrop = true;
	displayUI.draw();
}

/**
 * Detect drag leave event
 *
 * @method fileDragLeave
 * @param event {Event} event data
 */
function fileDragLeave(event) {
	event.preventDefault();

	var sage2UI = document.getElementById('sage2UICanvas');
	sage2UI.style.borderStyle = "solid";
	displayUI.fileDrop = false;
	displayUI.draw();
}

/**
 * Handler for file drop
 *
 * @method fileDrop
 * @param event {Event} event data
 */
function fileDrop(event) {
	if (event.preventDefault) {
		event.preventDefault();
	}

	// Update the UI
	var sage2UI = document.getElementById('sage2UICanvas');
	sage2UI.style.borderStyle = "solid";
	displayUI.fileDrop = false;
	displayUI.draw();

	// trigger file upload
	var x = event.layerX / event.target.clientWidth;
	var y = event.layerY / event.target.clientHeight;
	if (event.dataTransfer.files.length > 0) {
		// upload a file
		// displayUI.fileUpload = true;
		displayUI.uploadPercent = 0;
		interactor.uploadFiles(event.dataTransfer.files, x, y);
	} else {
		// URLs and text and ...
		if (event.dataTransfer.types) {
			// types: text/uri-list  text/plain text/html ...
			var content;
			if (event.dataTransfer.types.indexOf('text/uri-list') >= 0) {
				// choose uri as first choice
				content = event.dataTransfer.getData('text/uri-list');
			} else {
				// default to text
				content = event.dataTransfer.getData('text/plain');
			}
			interactor.uploadURL(content, x, y);
			return false;
		}
		console.log("Your browser does not support the types property: drop aborted");
	}
	return false;
}

var msgOpen = false;
var uploadMessage, msgui;

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

	// displayUI.setUploadPercent(percent);
	// displayUI.draw();
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

/**
 * Upload a file from the UI (not drag-and-drop)
 *
 * @method fileUploadFromUI
 */
function fileUploadFromUI() {
	// Hide the dialog
	hideDialog('localfileDialog');

	// Setup the progress bar
	// var sage2UI = document.getElementById('sage2UICanvas');
	// sage2UI.style.borderStyle = "solid";
	// displayUI.fileDrop = false;
	// displayUI.draw();

	// trigger file upload
	var thefile = document.getElementById('filenameForUpload');
	displayUI.fileUpload = true;
	displayUI.uploadPercent = 0;
	interactor.uploadFiles(thefile.files, 0, 0);
}


/**
 * Handler for mouse press
 *
 * @method pointerPress
 * @param event {Event} event data
 */
function pointerPress(event) {
	if (event.target.id === "sage2UICanvas") {
		// pointerDown used to detect the drag event
		pointerDown = true;
		displayUI.pointerMove(pointerX, pointerY);

		// Dont send the middle click (only when pointer captured)
		if (event.button !== 1) {
			// then send the click
			var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
			displayUI.pointerPress(btn);
		}

		event.preventDefault();
	}
}

/**
 * Handler for mouse up
 *
 * @method pointerRelease
 * @param event {Event} event data
 */
function pointerRelease(event) {
	if (event.target.id === "sage2UICanvas") {
		// pointerDown used to detect the drag event
		pointerDown = false;
		displayUI.pointerMove(pointerX, pointerY);

		// Dont send the middle click (only when pointer captured)
		if (event.button !== 1) {
			// then send the pointer release
			var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
			displayUI.pointerRelease(btn);
		}

		event.preventDefault();
	}
}


/**
 * Handler for mouse move
 *
 * @method pointerMove
 * @param event {Event} event data
 */
function pointerMove(event) {
	// listen for keyboard events if mouse moved over sage2UI
	if (event.target.id === "sage2UICanvas" && keyEvents === false) {
		document.addEventListener('keydown',  keyDown,  false);
		document.addEventListener('keyup',    keyUp,    false);
		document.addEventListener('keypress', keyPress, false);
		keyEvents = true;
	} else if (event.target.id !== "sage2UICanvas" && keyEvents === true) {
		document.removeEventListener('keydown',  keyDown,  false);
		document.removeEventListener('keyup',    keyUp,    false);
		document.removeEventListener('keypress', keyPress, false);
		keyEvents = false;
	}

	if (event.target.id === "sage2UICanvas") {
		var rect   = event.target.getBoundingClientRect();
		var mouseX = event.clientX - rect.left;
		var mouseY = event.clientY - rect.top;
		pointerX   = mouseX;
		pointerY   = mouseY;

		if (pointerDown) {
			// Send pointer event only during drag events
			displayUI.pointerMove(pointerX, pointerY);
		} else {
			// Otherwise test for application hover
			displayUI.highlightApplication(pointerX, pointerY);
		}

	} else {
		// Loose focus
		pointerDown = false;
	}
}

/**
 * First handler for mouse event: fiding out if device has a mouse
 *
 * @method mouseCheck
 * @param event {Event} event data
 */
function mouseCheck(event) {
	var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
	var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
	if (!__SAGE2__.browser.isSafari && !__SAGE2__.browser.isIE && (movementX === 0 && movementY === 0 ||
			(Date.now() - touchTime) < 1000)) {
		return;
	}
	if (__SAGE2__.browser.isSafari && __SAGE2__.browser.isIOS) {
		return;
	}
	if (__SAGE2__.browser.isIE && __SAGE2__.browser.isWinPhone) {
		return;
	}
	hasMouse = true;
	document.title = "SAGE2 UI - Desktop";
	console.log("Detected as desktop device");

	//document.addEventListener('mousedown',  pointerPress,    false);
	//document.addEventListener('mouseup',    pointerRelease,  false);
	//document.addEventListener('mousemove',  pointerMove,     false);
	//document.addEventListener('wheel',      pointerScroll,   false);
	//document.addEventListener('click',      pointerClick,    false);
	//document.addEventListener('dblclick',   pointerDblClick, false);

	//document.removeEventListener('mousemove', mouseCheck, false);

	var uiButtonImg = getCSSProperty("style_ui.css", "#menuUI tr td:hover img");
	if (uiButtonImg !== null) {
		uiButtonImg.style.webkitTransform = "scale(1.2)";
		uiButtonImg.style.mozTransform    = "scale(1.2)";
		uiButtonImg.style.transform       = "scale(1.2)";
	}
	// Display/hide the labels under the UI buttons
	// var uiButtonP = getCSSProperty("style_ui.css", "#menuUI tr td p");
	// if (uiButtonP !== null) {
	// 	uiButtonP.style.opacity = "0.0";
	// }
}

/**
 * Handler for double click event
 *
 * @method pointerDblClick
 * @param event {Event} event data
 */
function pointerDblClick(event) {
	handleDblClick(event.target);
}

/**
 * Processing double click
 *
 * @method handleDblClick
 * @param element {Element} DOM element triggering the double click
 */
function handleDblClick(element) {
	if (element.id === "sage2UICanvas") {
		displayUI.pointerDblClick();
		if (event.preventDefault) {
			event.preventDefault();
		}
	} else if (element.id.length > 14 && element.id.substring(0, 14) === "available_app_") {
		loadSelectedApplication();
		hideDialog('appLauncherDialog');
	} else if (element.id.length > 5 && element.id.substring(0, 5) === "file_") {
		loadSelectedFile();
		document.getElementById('thumbnail').src = "images/blank.jpg";
		document.getElementById('metadata_text').textContent = "";
		hideDialog('mediaBrowserDialog');
	}
}

/**
 * Handler for pointer scroll event
 *
 * @method pointerScroll
 * @param event {Event} event data
 */
function pointerScroll(event) {
	if (event.target.id === "sage2UICanvas") {
		displayUI.pointerScroll(pointerX, pointerY, event.deltaY);
		event.preventDefault();
	}
}

/**
 * Handler for force click event (safari)
 *
 * @method forceClick
 * @param event {Event} event data
 */
function forceClick(event) {
	// Check to see if the event has a force property
	if ("webkitForce" in event) {
		// Retrieve the force level
		var forceLevel = event.webkitForce;

		// Retrieve the force thresholds for click and force click
		var clickForce      = MouseEvent.WEBKIT_FORCE_AT_MOUSE_DOWN;
		var forceClickForce = MouseEvent.WEBKIT_FORCE_AT_FORCE_MOUSE_DOWN;

		// Check for force level within the range of a normal click
		if (forceLevel >= clickForce && forceLevel < forceClickForce) {
			// Perform operations in response to a normal click
			// Check for force level within the range of a force click
		} else if (forceLevel >= forceClickForce) {
			// Perform operations in response to a force click
			var rect        = event.target.getBoundingClientRect();
			var touchStartX = event.clientX - rect.left;
			var touchStartY = event.clientY - rect.top;
			// simulate backspace
			displayUI.keyDown(touchStartX, touchStartY, 8);
			displayUI.keyUp(touchStartX, touchStartY, 8);
		}
	}
}

/**
 * Handler for touch start event
 *
 * @method touchStart
 * @param event {Event} event data
 */
function touchStart(event) {
	var rect, touchX, touchY;
	var touch0X, touch0Y, touch1X, touch1Y;

	if (event.touches.length === 1) {
		touchTime = Date.now();
	}

	if (event.target.id === "sage2UICanvas") {
		if (event.touches.length === 1) {
			rect        = event.target.getBoundingClientRect();
			touchStartX = event.touches[0].clientX - rect.left;
			touchStartY = event.touches[0].clientY - rect.top;
			displayUI.pointerMove(touchStartX, touchStartY);
			displayUI.pointerPress("left");
			touchHold = setTimeout(function() {
				// simulate backspace
				displayUI.keyDown(touchStartX, touchStartY, 8);
				displayUI.keyUp(touchStartX, touchStartY, 8);
			}, 1500);
			touchMode = "translate";
		} else if (event.touches.length === 2) {
			rect    = event.target.getBoundingClientRect();
			touch0X = event.touches[0].clientX - rect.left;
			touch0Y = event.touches[0].clientY - rect.top;
			touch1X = event.touches[1].clientX - rect.left;
			touch1Y = event.touches[1].clientY - rect.top;
			touchX  = parseInt((touch0X + touch1X) / 2, 10);
			touchY  = parseInt((touch0Y + touch1Y) / 2, 10);
			displayUI.pointerRelease("left");
			displayUI.pointerMove(touchX, touchY);
			touchDist = (touch1X - touch0X) * (touch1X - touch0X) + (touch1Y - touch0Y) * (touch1Y - touch0Y);
			if (touchHold !== null) {
				clearTimeout(touchHold);
				touchHold = null;
			}
			touchMode = "scale";
		} else {
			if (touchHold !== null) {
				clearTimeout(touchHold);
				touchHold = null;
			}
			touchMode = "";
		}
		event.preventDefault();
		event.stopPropagation();
	} else if (event.target.id === "sage2MobileTrackpad") {
		var trackpadTouches = [];
		for (var i = 0; i < event.touches.length; i++) {
			if (event.touches[i].target.id === "sage2MobileTrackpad") {
				trackpadTouches.push(event.touches[i]);
			}
		}
		if (trackpadTouches.length === 1) {
			touchStartX = trackpadTouches[0].clientX;
			touchStartY = trackpadTouches[0].clientY;
		} else if (trackpadTouches.length === 2) {
			touch0X = trackpadTouches[0].clientX;
			touch0Y = trackpadTouches[0].clientY;
			touch1X = trackpadTouches[1].clientX;
			touch1Y = trackpadTouches[1].clientY;
			touchDist = (touch1X - touch0X) * (touch1X - touch0X) + (touch1Y - touch0Y) * (touch1Y - touch0Y);

			interactor.pointerReleaseMethod({button: 0});
			touchMode = "scale";
		}
	} else if (event.target.id === "sage2MobileLeftButton") {
		interactor.pointerPressMethod({button: 0});
		touchMode = "translate";
		touchHold = setTimeout(function() {
			interactor.pointerKeyDownMethod({keyCode: 8});
			interactor.pointerKeyUpMethod({keyCode: 8});
		}, 1500);

		event.preventDefault();
		event.stopPropagation();
	} else if (event.target.id === "sage2MobileRightButton") {
		interactor.pointerPressMethod({button: 2});

		event.preventDefault();
		event.stopPropagation();
	} else if (event.target.id === "sage2MobileMiddleButton") {
		// toggle the pointer between app and window mode
		interactor.togglePointerMode();
		event.preventDefault();
		event.stopPropagation();
	} else if (event.target.id === "sage2MobileMiddle2Button") {
		// Send play commad, spacebar for PDF and movies
		interactor.sendPlay();
		event.preventDefault();
		event.stopPropagation();
	} else {
		event.stopPropagation();
	}
}

/**
 * Handler for touch end event
 *
 * @method touchEnd
 * @param event {Event} event data
 */
function touchEnd(event) {
	var now = Date.now();
	if ((now - touchTapTime) > 500) {
		touchTap = 0;
	}
	if ((now - touchTime) < 250) {
		touchTap++;
		touchTapTime = now;
	} else {
		touchTap = 0;
		touchTapTime = 0;
	}

	if (event.target.id === "sage2UICanvas") {
		if (touchMode === "translate") {
			displayUI.pointerRelease("left");
			if (touchTap === 2) {
				displayUI.pointerDblClick();
			}
		}
		touchMode = "";
		event.preventDefault();
		event.stopPropagation();
	} else if (event.target.id === "sage2MobileTrackpad") {
		if (touchMode === "scale") {
			touchMode = "";
		}
		event.preventDefault();
		event.stopPropagation();
	} else if (event.target.id === "sage2MobileLeftButton") {
		if (touchMode === "translate") {
			interactor.pointerReleaseMethod({button: 0});
			if (touchTap === 2) {
				interactor.pointerDblClickMethod({});
			}
		}
		touchMode = "";
		event.preventDefault();
		event.stopPropagation();
	} else if (event.target.id === "sage2MobileRightButton") {
		interactor.pointerReleaseMethod({button: 2});

		event.preventDefault();
		event.stopPropagation();
	} else {
		if (touchTap === 1) {
			handleClick(event.changedTouches[0].target);
		} else if (touchTap === 2) {
			handleDblClick(event.changedTouches[0].target);
		}
		event.stopPropagation();
	}
	if (touchHold !== null) {
		clearTimeout(touchHold);
		touchHold = null;
	}

}

/**
 * Handler for touch move event
 *
 * @method touchMove
 * @param event {Event} event data
 */
function touchMove(event) {
	var rect, touchX, touchY, newDist, wheelDelta;
	var touch0X, touch0Y, touch1X, touch1Y;

	if (event.target.id === "sage2UICanvas") {
		if (touchMode === "translate") {
			rect   = event.target.getBoundingClientRect();
			touchX = event.touches[0].clientX - rect.left;
			touchY = event.touches[0].clientY - rect.top;
			displayUI.pointerMove(touchX, touchY);

			var dist = (touchX - touchStartX) * (touchX - touchStartX) + (touchY - touchStartY) * (touchY - touchStartY);
			if (touchHold !== null && dist > 25) {
				clearTimeout(touchHold);
				touchHold = null;
			}
		} else if (touchMode === "scale") {
			rect    = event.target.getBoundingClientRect();
			touch0X = event.touches[0].clientX - rect.left;
			touch0Y = event.touches[0].clientY - rect.top;
			touch1X = event.touches[1].clientX - rect.left;
			touch1Y = event.touches[1].clientY - rect.top;
			touchX  = parseInt((touch0X + touch1X) / 2, 10);
			touchY  = parseInt((touch0Y + touch1Y) / 2, 10);
			newDist = (touch1X - touch0X) * (touch1X - touch0X) + (touch1Y - touch0Y) * (touch1Y - touch0Y);
			if (Math.abs(newDist - touchDist) > 25) {
				wheelDelta = parseInt((touchDist - newDist) / 256, 10);
				displayUI.pointerScroll(touchX, touchY, wheelDelta);
				touchDist = newDist;
			}
		}
		event.preventDefault();
	} else if (event.target.id === "sage2MobileTrackpad") {
		var trackpadTouches = [];
		for (var i = 0; i < event.touches.length; i++) {
			if (event.touches[i].target.id === "sage2MobileTrackpad") {
				trackpadTouches.push(event.touches[i]);
			}
		}
		if (touchMode === "translate" || touchMode === "") {
			touchX = trackpadTouches[0].clientX;
			touchY = trackpadTouches[0].clientY;

			interactor.pointerMoveMethod({movementX: touchX - touchStartX, movementY: touchY - touchStartY});

			touchStartX = touchX;
			touchStartY = touchY;

			if (touchHold !== null) {
				clearTimeout(touchHold);
				touchHold = null;
			}
		} else if (touchMode === "scale") {
			touch0X = trackpadTouches[0].clientX;
			touch0Y = trackpadTouches[0].clientY;
			touch1X = trackpadTouches[1].clientX;
			touch1Y = trackpadTouches[1].clientY;
			newDist = (touch1X - touch0X) * (touch1X - touch0X) + (touch1Y - touch0Y) * (touch1Y - touch0Y);
			if (Math.abs(newDist - touchDist) > 25) {
				wheelDelta = parseInt((touchDist - newDist) / 256, 10);
				interactor.pointerScrollMethod({deltaY: wheelDelta});
				touchDist = newDist;
			}
		}

		event.preventDefault();
		event.stopPropagation();
	} else if (event.target.id === "sage2MobileLeftButton") {
		// nothing
		event.preventDefault();
		event.stopPropagation();
	} else if (event.target.id === "sage2MobileMiddleButton") {
		// nothing
		event.preventDefault();
		event.stopPropagation();
	} else if (event.target.id === "sage2MobileMiddle2Button") {
		// nothing
		event.preventDefault();
		event.stopPropagation();
	} else if (event.target.id === "sage2MobileRightButton") {
		// nothing
		event.preventDefault();
		event.stopPropagation();
	}
}

/**
 * Handler for closing a dialog box with ESC key
 *
 * @method escapeDialog
 * @param event {Event} event data
 */
function escapeDialog(event) {
	if (parseInt(event.keyCode, 10) === 27 && openDialog !== null) {
		hideDialog(openDialog);
		event.preventDefault();
	}
}

/**
 * Handler for detecting backspace outside the drawing area
 *
 * @method noBackspace
 * @param event {Event} event data
 */
function noBackspace(event) {
	// if keystrokes not captured and pressing  down '?'
	//    then show help
	if (event.keyCode === 191 && event.shiftKey  && event.type === "keydown" && !keyEvents) {
		webix.modalbox({
			title: "Mouse and keyboard operations and shortcuts",
			buttons: ["Ok"],
			text: "<img src=/images/cheat-sheet.jpg width=100%>",
			width: "90%"
		});
	}

	// backspace keyCode is 8
	// allow backspace in text box: target.type is defined for input elements
	if (parseInt(event.keyCode, 10) === 8 && !event.target.type) {
		event.preventDefault();
	} else {
		return true;
	}
}

/**
 * Handler for key down
 *
 * @method keyDown
 * @param event {Event} event data
 */
function keyDown(event) {
	if (displayUI.keyDown(pointerX, pointerY, parseInt(event.keyCode, 10))) {
		event.preventDefault();
	}
}

/**
 * Handler for key up
 *
 * @method keyUp
 * @param event {Event} event data
 */
function keyUp(event) {
	if (displayUI.keyUp(pointerX, pointerY, parseInt(event.keyCode, 10))) {
		event.preventDefault();
	}
}

/**
 * Handler for key press
 *
 * @method keyPress
 * @param event {Event} event data
 */
function keyPress(event) {
	// space bar activates the pointer
	if (event.keyCode === 32) {
		interactor.startSAGE2Pointer("sage2pointer");
		displayUI.pointerMove(pointerX, pointerY);
	}

	if (displayUI.keyPress(pointerX, pointerY, parseInt(event.charCode, 10))) {
		event.preventDefault();
	}
}

/**
 * Start the selected application
 *
 * @method loadSelectedApplication
 */
function loadSelectedApplication() {
	if (selectedAppEntry !== null) {
		var app_path = selectedAppEntry.getAttribute("appfullpath");
		//wsio.emit('loadApplication', {application: app_path, user: interactor.uniqueID});
	}
}

/**
 * Open a selected file
 *
 * @method loadSelectedFile
 */
function loadSelectedFile() {
	if (selectedFileEntry !== null) {
		var application = selectedFileEntry.getAttribute("application");
		var file = selectedFileEntry.getAttribute("file");
		//wsio.emit('loadFileFromServer', {application: application, filename: file, user: interactor.uniqueID});
	}
}

/**
 * Show a given dialog
 *
 * @method showDialog
 * @param id {String} element to show
 */
function showDialog(id) {
	openDialog = id;
	document.getElementById('blackoverlay').style.display = "block";
	document.getElementById(id).style.display = "block";
}

/**
 * Show a given dialog
 *
 * @method hideDialog
 * @param id {String} element to show
 */
function hideDialog(id) {
	openDialog = null;
	document.getElementById('blackoverlay').style.display = "none";
	document.getElementById(id).style.display = "none";
}

/**
 * Show the touch mouse overlay
 *
 * @method showSAGE2PointerOverlayNoMouse
 */
function showSAGE2PointerOverlayNoMouse() {
	document.getElementById('sage2MobileContainer').style.display = "block";
}

/**
 * Hide the touch mouse overlay
 *
 * @method hideSAGE2PointerOverlayNoMouse
 */
function hideSAGE2PointerOverlayNoMouse() {
	document.getElementById('sage2MobileContainer').style.display = "none";
}

/**
 * Enable the SAGE2 pointer dialog
 *
 * @method sagePointerEnabled
 */
function sagePointerEnabled() {
	// show SAGE2 Pointer dialog
	showDialog('sage2pointerDialog');
}

/**
 * Hides the SAGE2 pointer dialog
 *
 * @method sagePointerDisabled
 */
function sagePointerDisabled() {
	// hide SAGE2 Pointer dialog
	hideDialog('sage2pointerDialog');
}


/**
 * Remove of children of a DOM element
 *
 * @method removeAllChildren
 * @param node {Element} node to be processed
 */
function removeAllChildren(node) {
	while (node.lastChild) {
		node.removeChild(node.lastChild);
	}
}

/**
 * Pad a number to string
 *
 * @method pad
 * @param n {Number} input number
 * @param width {Number} maximum width
 * @param z {String} padding character, 0 by default
 * @return {String} formatted string
 */
function pad(n, width, z) {
	z = z || '0';
	n = n.toString();
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

/**
 * Format a date into a string
 *
 * @method dateToYYYYMMDDHHMMSS
 * @param date {Date} date
 * @return {String} formatted string
 */
function dateToYYYYMMDDHHMMSS(date) {
	return date.getFullYear() + "_" + pad(date.getMonth() + 1, 2) + "_" + pad(date.getDate(), 2) + "_" +
			pad(date.getHours(), 2) + "_" + pad(date.getMinutes(), 2) + "_" + pad(date.getSeconds(), 2);
}

/**
 * Reload the page if server reloads
 *
 * @method reloadIfServerRunning
 * @param callback {Function} function to call
 */
function reloadIfServerRunning(callback) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "/", true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4 && xhr.status === 200) {
			console.log("server ready");
			// when server ready, callback
			callback();
			// and reload the page
			window.location.reload();
		}
	};
	xhr.send();
}
