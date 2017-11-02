// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-17

"use strict";

/* global FileManager, SAGE2_interaction, SAGE2DisplayUI, SAGE2_speech */
/* global removeAllChildren, SAGE2_copyToClipboard, parseBool */

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

var note;

var viewOnlyMode;

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
		// In fact, the message is unused for most browser as security measure
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
		if (note) {
			note.close();
		}
	}
});

/**
 * When the page loads, SAGE2 starts
 *
 */
window.addEventListener('load', function(event) {
	SAGE2_init();
});

/**
 * When the page is resized
 *
 */
window.addEventListener('resize', function(event) {
	SAGE2_resize();
});



// Get Browser-Specifc Prefix
function getBrowserPrefix() {
	// Check for the unprefixed property.
	if ('hidden' in document) {
		return null;
	}
	// All the possible prefixes.
	var browserPrefixes = ['moz', 'ms', 'o', 'webkit'];

	for (var i = 0; i < browserPrefixes.length; i++) {
		var prefix = browserPrefixes[i] + 'Hidden';
		if (prefix in document) {
			return browserPrefixes[i];
		}
	}
	// The API is not supported in browser.
	return null;
}

// Get Browser Specific Hidden Property
function hiddenProperty(prefix) {
	if (prefix) {
		return prefix + 'Hidden';
	}
	return 'hidden';
}

// Get Browser Specific Visibility State
function visibilityState(prefix) {
	if (prefix) {
		return prefix + 'VisibilityState';
	}
	return 'visibilityState';
}

// Get Browser Specific Event
function visibilityEvent(prefix) {
	if (prefix) {
		return prefix + 'visibilitychange';
	}
	return 'visibilitychange';
}

function notifyMe(message) {
	// Let's check if the browser supports notifications
	if (!("Notification" in window)) {
		console.log("This browser does not support desktop notification");
		return null;
	} else if (Notification.permission === "granted") {
		// Let's check whether notification permissions have already been granted
		// If it's okay let's create a notification
		var notification = new Notification("SAGE2 Notification", {
			icon: "images/S2-logo.png",
			body: message
		});
		return notification;
	} else if (Notification.permission !== 'denied') {
		// Otherwise, we need to ask the user for permission
		Notification.requestPermission(function (permission) {
			// If the user accepts, let's create a notification
			if (permission === "granted") {
				var notification = new Notification("Hi there!");
				return notification;
			}
		});
	}
	return null;
}

/**
 * setupFocusHandlers
 *
 * @method setupFocusHandlers
 */
function setupFocusHandlers() {
	window.addEventListener("focus", function(evt) {
		// console.log('got focus');
	}, false);
	window.addEventListener("blur", function(evt) {
		// console.log('got blur');
	}, false);

	// Get Browser Prefix
	var prefix   = getBrowserPrefix();
	var hidden   = hiddenProperty(prefix);
	// var visState = visibilityState(prefix);
	var visEvent = visibilityEvent(prefix);

	document.addEventListener(visEvent, function(event) {
		if (document[hidden]) {
			if (interactor && interactor.broadcasting) {
				note = notifyMe("Keep browser tab with SAGE2 UI visible during screen sharing");
			}
		} else {
			if (note) {
				note.close();
			}
		}
	});
}


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

	// Check if the viewonly flag is passed in the URL
	viewOnlyMode = parseBool(getParameterByName("viewonly"));

	// Detect which browser is being used
	SAGE2_browser();

	// Setup focus events
	if ("Notification" in window && !viewOnlyMode) {
		Notification.requestPermission(function (permission) {
			console.log('Request', permission);
		});
	}
	setupFocusHandlers();

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
		if (viewOnlyMode) {
			// remove the button container
			document.getElementById('menuContainer').style.display = "none";
			// remove the top menu bar
			document.getElementById('mainMenuBar').style.display   = "none";
		} else {
			// show the button container
			document.getElementById('menuContainer').style.display = "block";
		}

		// Start an initial resize of the UI once we get a connection
		SAGE2_resize();

		setupListeners();

		// Get the cookie for the session, if there's one
		var session = getCookie("session");

		var clientDescription = {
			clientType: "sageUI",
			requests: {
				config:  true,
				version: true,
				time:    false,
				console: false
			},
			browser: __SAGE2__.browser,
			session: session
		};
		wsio.emit('addClient', clientDescription);

		// Interaction object: file upload, desktop sharing, ...
		interactor = new SAGE2_interaction(wsio);
		interactor.setFileUploadStartCallback(fileUploadStart);
		interactor.setFileUploadProgressCallback(fileUploadProgress);
		interactor.setFileUploadCompleteCallback(fileUploadComplete);

		// Send message to desktop capture Chrome extension
		window.postMessage('SAGE2_desktop_capture_enabled', "*");
	});

	// socket close event (i.e. server crashed)
	wsio.on('close', function(evt) {
		// show a popup
		showSAGE2Message("Server offline");
		// try to reload every few seconds
		var refresh = setInterval(function() {
			reloadIfServerRunning(function() {
				clearInterval(refresh);
			});
		}, 2000);
	});

	var sage2UI = document.getElementById('sage2UICanvas');

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
		// Fix webix layer system to be above SAGE2 UI
		webix.ui.zIndexBase = 2000;
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
		images:   "image_viewer",
		videos:   "movie_player",
		pdfs:     "pdf_viewer",
		sessions: "load_session"
	};

	hasMouse = false;
	console.log("Assuming mobile device");

	// Event listener to the Chrome EXTENSION for desktop capture
	window.addEventListener('message', function(event) {
		if (event.origin !== window.location.origin) {
			return;
		}
		if (event.data.cmd === "SAGE2_desktop_capture-Loaded") {
			if (interactor !== undefined && interactor !== null) {
				// Chrome extension is loaded
				console.log('SAGE2 Chrome extension is loaded');
				interactor.chromeDesktopCaptureEnabled = true;
			}
		}
		if (event.data.cmd === "window_selected") {
			interactor.captureDesktop(event.data.mediaSourceId);
		}
		// event coming from the extension icon ("send screenshot to..."")
		if (event.data.cmd === "screenshot") {
			// declare mime type to be "image/jpeg" for screenshots
			event.data.mime = "image/jpeg";
			wsio.emit('loadImageFromBuffer', event.data);
		}
		// event coming from the extension icon ("send webpage to..."")
		if (event.data.cmd === "openlink") {
			wsio.emit('openNewWebpage', {
				id: interactor.uniqueID,
				url: event.data.url
			});
		}
	});

	// This will startup the uiNote and uiDraw sections of the UI.
	setupAppContextMenuDiv();
	setupUiNoteMaker();
	setupUiDrawCanvas();
}

//
// Show error message
// if time given as parameter in seconds, close after delay
//
function showSAGE2Message(message, delay) {
	var aMessage = webix.alert({
		type:  "alert-warning",
		title: "SAGE2 Message",
		ok:    "OK",
		width: "40%",
		text:  "<span style='font-weight:bold;'>" + message + "</span>"
	});
	if (delay) {
		setTimeout(function() {
			if (aMessage) {
				webix.modalbox.hide(aMessage);
			}
		}, delay * 1000);
	}
}

function setupListeners() {
	wsio.on('initialize', function(data) {
		interactor.setInteractionId(data.UID);
		pointerDown = false;
		pointerX    = 0;
		pointerY    = 0;

		var sage2UI = document.getElementById('sage2UICanvas');

		// Build the file manager
		fileManager = new FileManager(wsio, "fileManager", interactor.uniqueID);
		webix.DragControl.addDrop("displayUIDiv", {
			$drop: function(source, target, event) {
				var dnd = webix.DragControl.getContext();
				// Calculate the position of the drop
				var x, y;
				if (hasMouse) {
					// Desktop
					x = event.layerX / event.target.clientWidth;
					y = event.layerY / event.target.clientHeight;
				} else {
					// Mobile: convert from touch screen coordinate to element
					var bbox = sage2UI.getBoundingClientRect();
					x = (fileManager.dragPosition.x - bbox.left) / sage2UI.clientWidth;
					y = (fileManager.dragPosition.y - bbox.top)  / sage2UI.clientHeight;
				}
				// Open the files
				for (var i = 0; i < dnd.source.length; i++) {
					fileManager.openItem(dnd.source[i], [x, y]);
				}
			}
		});

		// First request the files
		wsio.emit('requestStoredFiles');
	});

	// Open a popup on message sent from server
	wsio.on('errorMessage', function(data) {
		showSAGE2Message(data);
	});

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

		if (config.name && config.name !== "Windows" && config.name !== "localhost") {
			document.title = "SAGE2 - " + config.name;
		} else {
			document.title = "SAGE2 - " + config.host;
		}
	});

	wsio.on('createAppWindowPositionSizeOnly', function(data) {
		displayUI.addAppWindow(data);
	});

	wsio.on('showStickyPin', function(data) {
		displayUI.showStickyPin(data);
	});

	wsio.on('hideStickyPin', function(data) {
		displayUI.hideStickyPin(data);
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

	// webUI partition wsio messages
	wsio.on('createPartitionBorder', function(data) {
		displayUI.addPartitionBorder(data);
	});

	wsio.on('deletePartitionWindow', function(data) {
		displayUI.deletePartition(data.id);
	});

	wsio.on('partitionMoveAndResizeFinished', function(data) {
		displayUI.setPartitionPositionAndSize(data);
	});

	wsio.on('updatePartitionBorders', function(data) {
		displayUI.updateHighlightedPartition(data);
	});

	wsio.on('updatePartitionColor', function (data) {
		displayUI.setPartitionColor(data);
	});

	// Receive a message when an application state is upated
	wsio.on('applicationState', function(data) {
		if (data.application === "Webview") {
			var icon = document.getElementById(data.id + "_icon");
			if (icon && data.state.favicon) {
				// Update the icon of the app window with the favicon of the site
				icon.src = data.state.favicon;
			}
		}
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
			var track = interactor.mediaStream.getTracks()[0];
			track.stop();
			// close notification
			if (note) {
				note.close();
			}
		}
	});

	wsio.on('appContextMenuContents', function(data) {
		setAppContextMenuEntries(data);
	});

	wsio.on('sendDataToClient', function(data) {
		// Depending on the specified func does different things
		if (data.func === 'uiDrawSetCurrentStateAndShow') {
			uiDrawSetCurrentStateAndShow(data);
		} else if (data.func === 'uiDrawMakeLine') {
			uiDrawMakeLine(data);
		} else {
			console.log("Error, data for client contained invalid function:" + data.func);
		}
	});

	// Message from server reporting screenshot ability of display clients
	wsio.on('reportIfCanWallScreenshot', function(data) {
		if (data.capableOfScreenshot) {
			// Enable the menu item
			$$('topmenu').enableItem('wallScreenshot_menu');
		} else {
			// No luck (need to use Electron)
			console.log("Server> No screenshot capability");
		}
	});

	wsio.on('setVoiceNameMarker', function(data) {
		SAGE2_speech.setNameMarker(data.name);
	});
	wsio.on('playVoiceCommandSuccessSound', function(data) {
		// SAGE2_speech.successSound.play();
		SAGE2_speech.textToSpeech(data.message);
	});
	wsio.on('playVoiceCommandFailSound', function(data) {
		// SAGE2_speech.failSound.play();
		SAGE2_speech.textToSpeech(data.message);
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
	if (!viewOnlyMode) {
		var menuContainer = document.getElementById('menuContainer');
		var menuUI        = document.getElementById('menuUI');

		// Extra scaling factor
		ratio = ratio || 1.0;

		var menuScale = 1.0;
		var freeWidth = window.innerWidth * ratio;
		if (freeWidth < 840) {
			// 9 buttons, 120 pixels per button
			// menuScale = freeWidth / 1080;
			// 10 buttons, 120 pixels per button
			// menuScale = freeWidth / 1200;
			// 8 buttons, 120 pixels per button
			// menuScale = freeWidth / 960;
			// 7 buttons, 120 pixels per button
			menuScale = freeWidth / 840;
		}

		menuUI.style.webkitTransform = "scale(" + menuScale + ")";
		menuUI.style.mozTransform = "scale(" + menuScale + ")";
		menuUI.style.transform = "scale(" + menuScale + ")";
		menuContainer.style.height = parseInt(86 * menuScale, 10) + "px";

		// Center the menu bar
		var mw = menuUI.getBoundingClientRect().width;
		menuContainer.style.marginLeft = Math.round((window.innerWidth - mw) / 2) + "px";
	}
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
		hideAppContextMenuDiv();
		clearContextMenu();
		event.preventDefault();
	} else if (event.target.id === "mainUI") {
		hideAppContextMenuDiv();
		clearContextMenu();
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
	console.log("Detected as desktop device");

	document.addEventListener('mousedown',  pointerPress,    false);
	document.addEventListener('mouseup',    pointerRelease,  false);
	document.addEventListener('mousemove',  pointerMove,     false);
	document.addEventListener('wheel',      pointerScroll,   false);
	document.addEventListener('click',      pointerClick,    false);
	document.addEventListener('dblclick',   pointerDblClick, false);

	document.removeEventListener('mousemove', mouseCheck, false);

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
 * Handler for click event
 *
 * @method pointerClick
 * @param event {Event} event data
 */
function pointerClick(event) {
	handleClick(event.target);
}

/**
 * Processing click
 *
 * @method handleClick
 * @param element {Element} DOM element triggering the click
 */
function handleClick(element) {
	// Menu Buttons
	if (element.id === "sage2pointer"        || element.id === "sage2pointerContainer" || element.id === "sage2pointerLabel") {
		interactor.startSAGE2Pointer(element.id);
	} else if (element.id === "sharescreen"  || element.id === "sharescreenContainer"  || element.id === "sharescreenLabel") {
		interactor.startScreenShare();
	} else if (element.id === "applauncher"  || element.id === "applauncherContainer"  || element.id === "applauncherLabel") {
		wsio.emit('requestAvailableApplications');
	} else if (element.id === "mediabrowser" || element.id === "mediabrowserContainer" || element.id === "mediabrowserLabel") {
		if (!hasMouse) {
			//  && !__SAGE2__.browser.isIPad && !__SAGE2__.browser.isAndroidTablet) {
			// wsio.emit('requestStoredFiles');
			showDialog('mediaBrowserDialog');
		} else {
			// Open the new file manager
			var fm = document.getElementById('fileManager');
			if (fm.style.display === "none") {
				fm.style.display = "block";
				SAGE2_resize(0.6);
				fileManager.refresh();
			} else {
				fm.style.display = "none";
				SAGE2_resize(1.0);
			}
		}
	} else if (element.id === "arrangement" || element.id === "arrangementContainer" || element.id === "arrangementLabel") {
		showDialog('arrangementDialog');
	} else if (element.id === "settings"    || element.id === "settingsContainer"    || element.id === "settingsLabel") {
		showDialog('settingsDialog');
	} else if (element.id === "browser") {
		// Build a webix dialog
		webix.ui({
			view: "window",
			id: "browser_form",
			position: "center",
			modal: true,
			zIndex: "1999",
			head: "Open a browser window",
			width: 400,
			body: {
				view: "form",
				borderless: false,
				elements: [
					// URL box
					{view: "text", value: "", id: "browser_url", label: "Please enter a URL:", name: "browser_url"},
					// Shortcut for some sites
					{view: "combo", id: "field_t", label: "Commonly used", value: "1",
						options: { body: {
							data: [
								{id: 1, value: "Google Docs - documents"},
								{id: 2, value: "Office 365 - office online"},
								{id: 3, value: "Appear.in - videoconference"},
								{id: 4, value: "Youtube - videos"},
								{id: 5, value: "Slack - team collaboration"},
								{id: 6, value: "NbViewer - jupyter notebooks"},
								{id: 7, value: "PubMed - biomedical literature"}
							],
							on: {
								onItemClick: function(id) {
									var urls = [
										"https://docs.google.com/",
										"https://login.microsoftonline.com/",
										"https://appear.in/",
										"https://www.youtube.com/",
										"https://slack.com/signin",
										"https://nbviewer.jupyter.org/",
										"https://www.ncbi.nlm.nih.gov/pubmed/"
									];
									$$('browser_url').setValue(urls[id - 1]);
								}
							}
						}
						}
					},
					// Google search
					{view: "text", value: "", id: "browser_search",
						label: "or search terms (with Google):", name: "browser_search"},
					{margin: 5, cols: [
						{view: "button", value: "Cancel", click: function() {
							this.getTopParentView().hide();
						}},
						{view: "button", value: "Open", type: "form", click: function() {
							// get the values from the form
							var values = this.getFormView().getValues();
							var url = "";
							// if it was a URL entry
							if (values.browser_url) {
								// check if it looks like a URL
								if ((values.browser_url.indexOf("://") === -1) &&
									!values.browser_url.startsWith("/")) {
									url = 'http://' + values.browser_url;
								} else {
									url = values.browser_url;
								}
							} else {
								// a search entry
								url = 'https://www.google.com/#q=' + values.browser_search;
							}
							// if we have something valid, open a webview
							if (url) {
								wsio.emit('openNewWebpage', {
									id: interactor.uniqueID,
									url: url
								});
							}
							// close the form
							this.getTopParentView().hide();
						}}
					]}
				],
				elementsConfig: {
					labelPosition: "top"
				}
			}
		}).show();

		// Attach handlers for keyboard
		$$("browser_url").attachEvent("onKeyPress", function(code, e) {
			// ESC closes
			if (code === 27 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
				this.getTopParentView().hide();
				return false;
			}
			// ENTER activates
			if (code === 13 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
				var values = this.getFormView().getValues();
				var url = "";
				// if it was a URL entry
				if (values.browser_url) {
					// check if it looks like a URL
					if ((values.browser_url.indexOf("://") === -1) &&
						!values.browser_url.startsWith("/")) {
						url = 'http://' + values.browser_url;
					} else {
						url = values.browser_url;
					}
				}
				// if we have something valid, open a webview
				if (url) {
					// wsio.emit('openNewWebpage', {
					// 	id: interactor.uniqueID,
					// 	url: url
					// });
					wsio.emit('addNewWebElement', {
						type: "application/url",
						url: url, position: [0, 0],
						id: interactor.uniqueID,
						SAGE2_ptrName:  localStorage.SAGE2_ptrName,
						SAGE2_ptrColor: localStorage.SAGE2_ptrColor
					});
				}
				// close the form
				this.getTopParentView().hide();
				return false;
			}
		});
		// Attach handlers for keyboard
		$$("browser_search").attachEvent("onKeyPress", function(code, e) {
			// ESC closes
			if (code === 27 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
				this.getTopParentView().hide();
				return false;
			}
			// ENTER activates
			if (code === 13 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
				var values = this.getFormView().getValues();
				var url = "";
				if (values.browser_search) {
					// a search entry
					url = 'https://www.google.com/#q=' + values.browser_search;
					// if we have something valid, open a webview
					wsio.emit('openNewWebpage', {
						id: interactor.uniqueID,
						url: url
					});
				}
				// close the form
				this.getTopParentView().hide();
				return false;
			}
		});
		// Focus the URL box
		$$('browser_url').focus();

	} else if (element.id === "info" || element.id === "infoContainer" || element.id === "infoLabel") {
		// Fill up some information from the server
		var infoData = document.getElementById('infoData');
		// Clean up the existing values
		while (infoData.firstChild) {
			infoData.removeChild(infoData.firstChild);
		}
		// Add new information
		var info2 = document.createElement('p');
		info2.innerHTML = "<span style='font-weight:bold;'>Host</span>: " + displayUI.config.host;
		var info3 = document.createElement('p');
		info3.innerHTML = "<span style='font-weight:bold;'>Resolution</span>: " +
			displayUI.config.totalWidth + " x " +  displayUI.config.totalHeight + " pixels";
		info3.innerHTML += " (" + displayUI.config.layout.columns + " by " + displayUI.config.layout.rows + " tiles";
		info3.innerHTML += "  - " + displayUI.config.resolution.width + " x " + displayUI.config.resolution.height + ")";
		infoData.appendChild(info2);
		infoData.appendChild(info3);
		if (sage2Version) {
			var info5 = document.createElement('p');
			info5.innerHTML  = "<span style='font-weight:bold;'>Version</span>: " +
				sage2Version.base + "-" + sage2Version.branch + "-"
				+ sage2Version.commit + " - " + sage2Version.date;
			infoData.appendChild(info5);
		}
		// Show the type of web browser
		var info4 = document.createElement('p');
		info4.innerHTML = "<span style='font-weight:bold;'>Browser</span>: " + __SAGE2__.browser.browserType +
			" " + __SAGE2__.browser.version;
		infoData.appendChild(info4);
		// Finally show the dialog
		showDialog('infoDialog');
	} else if (element.id === "ezNote" || element.id === "ezNoteContainer" || element.id === "ezNoteLabel") {
		setNoteToMakeMode();
		showDialog('uiNoteMaker');
	} else if (element.id === "ezDraw" || element.id === "ezDrawContainer" || element.id === "ezDrawLabel") {
		// clear drawzone
		uiDrawCanvasBackgroundFlush('white');
		var data = {};
		data.appName = "doodle";
		data.func = "addClientIdAsEditor";
		data.customLaunchParams = {
			clientId: interactor.uniqueID,
			clientName: document.getElementById('sage2PointerLabel').value
		};
		wsio.emit('launchAppWithValues', data);

		/*
		Dialog will not be shown here.
		Rather than show the dialog, the client will respond back, then it will be shown.
		*/
	} else if (element.id === "appOpenBtn") {
		// App Launcher Dialog
		loadSelectedApplication();
		hideDialog('appLauncherDialog');
	} else if (element.id === "appStoreBtn") {
		hideDialog('appLauncherDialog');
		// Open the appstore page
		var awin4 = window.open("http://apps.sagecommons.org/", '_blank');
		awin4.focus();
	} else if (element.id === "appCloseBtn") {
		selectedAppEntry = null;
		hideDialog('appLauncherDialog');
	} else if (element.id === "closeMobileSAGE2Pointer") {
		// Mobile SAGE2 Pointer
		interactor.stopSAGE2Pointer();
	} else if (element.id === "fileOpenBtn") {
		// Media Browser Dialog
		loadSelectedFile();
		document.getElementById('thumbnail').src = "images/blank.jpg";
		document.getElementById('metadata_text').textContent = "";
		hideDialog('mediaBrowserDialog');
	} else if (element.id === "fileCloseBtn") {
		selectedFileEntry = null;
		document.getElementById('thumbnail').src = "images/blank.jpg";
		document.getElementById('metadata_text').textContent = "";
		hideDialog('mediaBrowserDialog');
	} else if (element.id === "fileUploadBtn") {
		// Upload files to SAGE2
		// clear the preview panel
		selectedFileEntry = null;
		document.getElementById('thumbnail').src = "images/blank.jpg";
		document.getElementById('metadata_text').textContent = "";
		// close the media browswer
		hideDialog('mediaBrowserDialog');
		// open the file uploader panel
		showDialog('uploadDialog');
	} else if (element.id === "localFilesBtn") {
		// upload files local to the user's device
		// close the file uploader panel
		hideDialog('uploadDialog');
		// open the file library
		//    delay to remove bounce evennt on Chrome/iOS
		setTimeout(function() {
			showDialog('localfileDialog');
		}, 200);
	} else if (element.id === "dropboxFilesBtn") {
		// upload from Dropbox
		// Not Yet Implemented
		//   ...
		// close the file uploader panel
		hideDialog('uploadDialog');
	} else if (element.id === "cancelFilesBtn") {
		// close the file uploader panel
		hideDialog('uploadDialog');
	} else if (element.id === "cancelFilesBtn2") {
		// close the pic uploader panel
		hideDialog('localfileDialog');
	} else if (element.id === "localfileUploadBtn") {
		// trigger the upload function
		fileUploadFromUI();
	} else if (element.id === "fileDeleteBtn") {
		if (selectedFileEntry !== null && confirm("Are you sure you want to delete this file?")) {
			var application = selectedFileEntry.getAttribute("application");
			var file = selectedFileEntry.getAttribute("file");
			wsio.emit('deleteElementFromStoredFiles', {application: application, filename: file});

			document.getElementById('thumbnail').src = "images/blank.jpg";
			document.getElementById('metadata_text').textContent = "";
			selectedFileEntry = null;
			hideDialog('mediaBrowserDialog');
		}
	} else if (element.id === "arrangementCloseBtn") {
		// Arrangement Dialog
		hideDialog('arrangementDialog');
	} else if (element.id === "infoCloseBtn") {
		// Info Dialog
		hideDialog('infoDialog');
	} else if (element.id === "helpcontent") {
		hideDialog('infoDialog');
		var awin1 = window.open("help/index.html", '_blank');
		awin1.focus();
	} else if (element.id === "admincontent") {
		hideDialog('infoDialog');
		var awin2 = window.open("admin/index.html", '_blank');
		awin2.focus();
	} else if (element.id === "infocontent") {
		hideDialog('infoDialog');
		var awin3 = window.open("help/info.html", '_blank');
		awin3.focus();
	} else if (element.id === "settingsCloseBtn") {
		// Settings Dialog
		hideDialog('settingsDialog');
	} else if (element.id === "settingsCloseBtn2") {
		// Init Settings Dialog
		hideDialog('settingsDialog2');
	} else if (element.id.length > 14 && element.id.substring(0, 14) === "available_app_") {
		// Application Selected
		var application_selected = element.getAttribute("application");
		if (selectedAppEntry !== null) {
			selectedAppEntry.style.backgroundColor = "transparent";
		}
		selectedAppEntry = document.getElementById('available_app_row_' + application_selected);
		selectedAppEntry.style.backgroundColor = "#6C6C6C";
	} else if (element.id.length > 5 && element.id.substring(0, 5) === "file_") {
		// File Selected
		// highlight selection
		if (selectedFileEntry !== null) {
			selectedFileEntry.style.backgroundColor = "transparent";
		}
		selectedFileEntry = element;
		selectedFileEntry.style.backgroundColor = "#6C6C6C";

		// show metadata
		var metadata = document.getElementById('metadata');
		var size = Math.min(parseInt(metadata.style.width, 10), parseInt(metadata.style.height, 10)) * 0.9 - 32;
		var thumbnail = document.getElementById('thumbnail');
		thumbnail.src = selectedFileEntry.getAttribute("thumbnail") + "_256.jpg";
		thumbnail.width = size;
		thumbnail.height = size;
		var metadata_text = document.getElementById('metadata_text');
		metadata_text.textContent = selectedFileEntry.textContent;
	} else if (element.id === "clearcontent") {
		// Remove all the running applications
		wsio.emit('clearDisplay');
		hideDialog('arrangementDialog');
	} else if (element.id === "tilecontent") {
		// Layout the applications
		wsio.emit('tileApplications');
		hideDialog('arrangementDialog');
	} else if (element.id === "savesession") {
		// generate a default name
		var template = "session_" + dateToYYYYMMDDHHMMSS(new Date());

		// Hide the parent dialog
		hideDialog('arrangementDialog');

		// Build a webix dialog
		webix.ui({
			view: "window",
			id: "session_form",
			position: "center",
			modal: true,
			zIndex: 1999,
			head: "Save session",
			width: 400,
			body: {
				view: "form",
				borderless: false,
				elements: [
					{view: "text", value: template, id: "session_name", label: "Please enter a session name:", name: "session"},
					{margin: 5, cols: [
						{view: "button", value: "Cancel", click: function() {
							this.getTopParentView().hide();
						}},
						{view: "button", value: "Save", type: "form", click: function() {
							var values = this.getFormView().getValues();
							wsio.emit('saveSession', values.session);
							this.getTopParentView().hide();
						}}
					]}
				],
				elementsConfig: {
					labelPosition: "top"
				}
			}
		}).show();

		// Attach handlers for keyboard
		$$("session_name").attachEvent("onKeyPress", function(code, e) {
			// ESC closes
			if (code === 27 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
				this.getTopParentView().hide();
				return false;
			}
			// ENTER activates
			if (code === 13 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
				var values = this.getFormView().getValues();
				wsio.emit('saveSession', values.session);
				this.getTopParentView().hide();
				return false;
			}
		});
		$$('session_name').focus();

	} else if (element.id === "createpartitions") {
		// Create a partition layout
		hideDialog('arrangementDialog');
		showDialog('createpartitionsDialog');
	} else if (element.id === "createpartitionsCloseBtn") {
		hideDialog('createpartitionsDialog');
	} else if (element.id === "createpartitionsCreateBtn") {
		var dropdown = document.getElementById('partitionLayout');
		var value = dropdown.options[dropdown.selectedIndex].value;

		// check selected value
		if (value === "0") {
			// create partition division of screen
			wsio.emit('partitionScreen',
				{
					type: "row",
					ptn: true,
					size: 12
				});
		} else if (value === "1") {
			// create partition division of screen
			wsio.emit('partitionScreen',
				{
					type: "row",
					size: 12,
					children: [
						{
							type: "col",
							ptn: true,
							size: 6
						},
						{
							type: "col",
							ptn: true,
							size: 6
						}
					]
				});
		} else if (value === "2") {
			// create partition division of screen
			wsio.emit('partitionScreen',
				{
					type: "row",
					size: 12,
					children: [
						{
							type: "col",
							ptn: true,
							size: 4
						},
						{
							type: "col",
							ptn: true,
							size: 4
						},
						{
							type: "col",
							ptn: true,
							size: 4
						}
					]
				});
		} else if (value === "3") {
			// create partition division of screen
			wsio.emit('partitionScreen',
				{
					type: "col",
					size: 12,
					children: [
						{
							type: "row",
							size: 6,
							children: [
								{
									type: "col",
									ptn: true,
									size: 6
								},
								{
									type: "col",
									ptn: true,
									size: 6
								}
							]
						},
						{
							type: "row",
							size: 6,
							children: [
								{
									type: "col",
									ptn: true,
									size: 6
								},
								{
									type: "col",
									ptn: true,
									size: 6
								}
							]
						}
					]
				});
		} else if (value === "4") {
			// create partition division of screen
			wsio.emit('partitionScreen',
				{
					type: "row",
					size: 12,
					children: [
						{
							type: "col",
							size: 3,
							children: [
								{
									type: "row",
									ptn: true,
									size: 8
								},
								{
									type: "row",
									ptn: true,
									size: 4
								}
							]
						},
						{
							type: "col",
							ptn: true,
							size: 6
						},
						{
							type: "col",
							size: 3,
							children: [
								{
									type: "row",
									ptn: true,
									size: 4
								},
								{
									type: "row",
									ptn: true,
									size: 8
								}
							]
						}
					]
				});
		} else if (value === "5") {
			// create partition division of screen
			wsio.emit('partitionScreen',
				{
					type: "col",
					size: 12,
					children: [
						{
							type: "row",
							size: 8,
							children: [
								{
									type: "col",
									ptn: true,
									size: 6
								},
								{
									type: "col",
									ptn: true,
									size: 6
								}
							]
						},
						{
							type: "row",
							size: 4,
							children: [
								{
									type: "col",
									ptn: true,
									size: 12
								}
							]
						}
					]
				});
		}
		hideDialog('createpartitionsDialog');
	} else if (element.id === "deletepartitions") {
		// Delete all partitions
		wsio.emit('deleteAllPartitions');
		hideDialog('arrangementDialog');
	} else if (element.id === "deleteapplications") {
		// Delete the applications and keep the partitions
		wsio.emit('deleteAllApplications');
		hideDialog('arrangementDialog');
	} else if (element.id === "ffShareScreenBtn") {
		// Firefox Share Screen Dialog
		interactor.captureDesktop("screen");
		hideDialog('ffShareScreenDialog');
	} else if (element.id === "ffShareWindowBtn") {
		interactor.captureDesktop("window");
		hideDialog('ffShareScreenDialog');
	}
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
			// just making sure there are two touches
			if (event.touches.length === 2) {
				// use the data as pinch movement
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
	// backspace keyCode is 8
	// allow backspace in text box: target.type is defined for input elements
	if (parseInt(event.keyCode, 10) === 8 && !event.target.type) {
		event.preventDefault();
	} else if (
		event.keyCode === 13
		&& event.target.id.indexOf("appContextMenuEntry") !== -1
		&& event.target.id.indexOf("Input") !== -1) {
		// if a user hits enter within an appContextMenuEntry, it will cause the effect to happen
		event.target.parentNode["buttonEffect" + event.target.id]();
	} else if (event.ctrlKey && event.keyCode === 13 && event.target.id === "uiNoteMakerInputField") {
		// ctrl + enter in note maker adds a line rather than send note
		event.target.value += "\n";
	} else if (event.shiftKey && event.keyCode === 13 && event.target.id === "uiNoteMakerInputField") {
		// shift + enter adds a line
	} else if (event.keyCode === 13 && event.target.id === "uiNoteMakerInputField") {
		// if a user hits enter within an appContextMenuEntry, it will cause the effect to happen
		sendMessageMakeNote();
		event.preventDefault(); // prevent new line on next note
	} else if (event.keyCode === 191 && event.shiftKey &&
		(event.target.id === "uiNoteMakerInputField" || event.target.id.includes("appContextMenuEntry"))) {
		// allow "?" within note creation and any of the right click menues
	} else if (event.keyCode === 191 && event.shiftKey && event.type === "keydown" && !keyEvents) {
		// if keystrokes not captured and pressing  down '?'
		//    then show help
		webix.modalbox({
			title: "Mouse and keyboard operations",
			buttons: ["Ok"],
			text: "<img src=/images/cheat-sheet.jpg width=100%>",
			width: "70%",
			height: "50%"
		});
	}
	return true;
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
	// space bar activates the pointer and stop there
	// or process the event
	if (event.keyCode === 32) {
		interactor.startSAGE2Pointer("sage2pointer");
		displayUI.pointerMove(pointerX, pointerY);
	} else if (displayUI.keyPress(pointerX, pointerY, parseInt(event.charCode, 10))) {
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
		wsio.emit('loadApplication', {application: app_path, user: interactor.uniqueID});
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
		wsio.emit('loadFileFromServer', {application: application, filename: file, user: interactor.uniqueID});
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
	document.getElementById('uiDrawZoneEraseReference').style.left = "-100px";
	document.getElementById('uiDrawZoneEraseReference').style.top  = "-100px";
	if (id == 'uiDrawZone') {
		uiDrawZoneRemoveSelfAsClient();
	}
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


/**
 * After loading page will perform additional setup for the context menu.
 * Mainly to do with javascript loading of variables for later use.
 *
 * @method setupAppContextMenuDiv
 */
function setupAppContextMenuDiv() {
	// override right click contextmenu calls
	document.addEventListener('contextmenu', function(e) {
		// if a right click is made on canvas
		if (e.target.id === "sage2UICanvas") {
			// get the location with respect to the display positioning.
			var rect = e.target.getBoundingClientRect();
			var pointerX = e.clientX - rect.left;
			var pointerY = e.clientY - rect.top;
			pointerX = pointerX / displayUI.scale;
			pointerY = pointerY / displayUI.scale;
			var data = {};
			data.x = pointerX;
			data.y = pointerY;
			data.xClick = e.clientX;
			data.yClick = e.clientY;
			// ask for the context menu for the topmost app at that spot.
			wsio.emit('requestAppContextMenu', data);
			clearContextMenu();
			hideAppContextMenuDiv();
			// The context menu will be filled and positioned after getting a response from server.

			// prevent the standard context menu, only for the canvas
			e.preventDefault();
		}
	}, false);
}

/**
 * Sets context menu to visible and moves to coordinates.
 * Called after setting the entries.
 *
 * @method showAppContextMenuDiv
 * @param {Integer} x - x position.
 * @param {Integer} y - y position.
 */
function showAppContextMenuDiv(x, y) {
	var workingDiv = document.getElementById('appContextMenu');
	workingDiv.style.visibility = "visible";
	workingDiv.style.left		= x + "px";
	workingDiv.style.top		= y + "px";
}

/**
 * Hides context menu from the document. It only makes visibility hidden.
 * So values are still there.
 *
 * @method hideAppContextMenuDiv
 */
function hideAppContextMenuDiv() {
	var workingDiv = document.getElementById('appContextMenu');
	workingDiv.style.visibility = "hidden";
}

/**
 * Removes all entries from context menu.
 *
 * @method clearContextMenu
 */
function clearContextMenu() {
	removeAllChildren('appContextMenu');
}

/**
 * Populates context menu.
 * Called on initial right click with empty array for entriesToAdd
 *  	Called again when appContextMenuContents packet is received.
 *  	The call is given data.entries, data.app
 *
 * Entries created will store their information within the div.
 *
 * @method hideAppContextMenuDiv
 * @param {Object} data - Object with properties described below.
 * @param {Integer} data.x - Location of original right click.
 * @param {Integer} data.y - Location of original right click.
 * @param {Array} data.entries - Array of objects describing each entry.
 * @param {Array} data.app - App id the menu is for.
 */
function setAppContextMenuEntries(data) {
	// data.entries, data.app, data.x, data.y
	var entriesToAdd = data.entries;
	var app = data.app;
	showAppContextMenuDiv(data.x, data.y);
	// full removal of current contents
	removeAllChildren('appContextMenu');
	// for each entry
	var i;
	for (i = 0; i < entriesToAdd.length; i++) {
		// if func is defined add buttonEffect
		if (entriesToAdd[i].callback !== undefined && entriesToAdd[i].callback !== null) {
			entriesToAdd[i].buttonEffect = function() {
				if (this.callback === "SAGE2_download") {
					// special case: want to download the file
					var url = this.parameters.url;
					console.log('Download>	content', url);
					if (url) {
						// Download the file
						var link = document.createElement('a');
						link.href = url;
						if (link.download !== undefined) {
							// Set HTML5 download attribute. This will prevent file from opening if supported.
							var fileName = url.substring(url.lastIndexOf('/') + 1, url.length);
							link.download = fileName;
						}
						// Dispatching click event
						if (document.createEvent) {
							var me = document.createEvent('MouseEvents');
							me.initEvent('click', true, true);
							link.dispatchEvent(me);
						}
					}
				} else if (this.callback === "SAGE2_editQuickNote") {
					// special case: reopen the QuickNote editor, but with a "save" button instead of "create"
					var sendButton = document.getElementById('uiNoteMakerSendButton');
					sendButton.textContent = "Save [Enter]";
					sendButton.inSaveMode = true;
					sendButton.app = this.app;
					sendButton.callback = "setMessage";
					sendButton.parameters = this.parameters;
					// put current text into note
					var inputForNote = document.getElementById('uiNoteMakerInputField');
					inputForNote.value = this.parameters.currentContent;
					// select current color
					switch (this.parameters.currentColorChoice) {
						case "lightyellow": setUiNoteColorSelect(1); break;
						case "lightblue":   setUiNoteColorSelect(2); break;
						case "lightpink":   setUiNoteColorSelect(3); break;
						case "lightgreen":  setUiNoteColorSelect(4); break;
						case "lightsalmon": setUiNoteColorSelect(5); break;
						case "white":       setUiNoteColorSelect(6); break;
						default: setUiNoteColorSelect(1); break; // default is yellow if unknown
					}
					showDialog('uiNoteMaker');
				} else if (this.callback === "SAGE2_copyURL") {
					// special case: want to copy the URL of the file to clipboard
					var dlurl = this.parameters.url;
					if (dlurl) {
						// defined in SAGE2_runtime
						SAGE2_copyToClipboard(dlurl);
					}
				} else {
					// if an input field, need to modify the params to pass back before sending.
					if (this.inputField === true) {
						var inputField = document.getElementById(this.inputFieldId);
						// dont do anything if there is nothing in the inputfield
						if (inputField.value.length <= 0) {
							return;
						}
						// add the field clientInput to the parameters
						this.parameters.clientInput = inputField.value;
					}
					// create data to send, then emit
					var data = {};
					data.app = this.app;
					data.func = this.callback;
					data.parameters = this.parameters;
					data.parameters.clientName = document.getElementById('sage2PointerLabel').value;
					data.parameters.clientId   = interactor.uniqueID;
					wsio.emit('callFunctionOnApp', data);
				}
				// hide after use
				hideAppContextMenuDiv();
			};
		} // end if the button should send something
	} // end adding a send function to each menu entry
	// always add the Close Menu entry.
	var closeEntry = {};
	closeEntry.description = "Close Menu";
	closeEntry.buttonEffect = function () {
		hideAppContextMenuDiv();
	};
	entriesToAdd.push(closeEntry);
	// for each entry to add, create the div, app the properties, and effects
	var workingDiv;
	for (i = 0; i < entriesToAdd.length; i++) {
		if (entriesToAdd[i].voiceEntryOverload) {
			continue;
		}
		workingDiv = document.createElement('div');
		// unique entry id
		workingDiv.id = 'appContextMenuEntry' + i;
		if (typeof entriesToAdd[i].entryColor === "string") {
			// use given color if specified
			workingDiv.startingBgColor = entriesToAdd[i].entryColor;
		} else {
			// start as off-white color
			workingDiv.startingBgColor = "#FFF8E1";
		}
		workingDiv.style.background = workingDiv.startingBgColor;
		// Add a little padding
		workingDiv.style.padding = "0 5px 0 5px";
		// Align main text to the left
		workingDiv.style.textAlign = "left";
		// special case for a separator (line) entry
		if (entriesToAdd[i].description === "separator") {
			workingDiv.innerHTML = "<hr>";
		} else {
			if (entriesToAdd[i].accelerator) {
				// Add description of the keyboard shortcut
				workingDiv.innerHTML = "<p style='float: left;'>" + entriesToAdd[i].description + "</p>";
				// workingDiv.innerHTML += "<p style='float: right; padding-left: 5px;'> [" + entriesToAdd[i].accelerator + "]</p>";
				workingDiv.innerHTML += "<p style='float: right; padding-left: 5px;'>" + entriesToAdd[i].accelerator + "</p>";
				workingDiv.innerHTML += "<div style='clear: both;'></div>";
			} else {
				// or just plain text
				workingDiv.innerHTML = entriesToAdd[i].description;
			}
		}
		// add input field if app says to.
		workingDiv.inputField = false;
		if (entriesToAdd[i].inputField === true) {
			workingDiv.inputField = true;
			var inputField = document.createElement('input');
			// unique input field
			inputField.id = workingDiv.id + "Input";
			// check if the data has a value field
			inputField.defaultValue = entriesToAdd[i].value || "";
			// special case to use color input type
			if (entriesToAdd[i].inputColor) {
				inputField.type = "color";

				if (entriesToAdd[i].colorChoices) {
					// inputField.list = entriesToAdd[i].colorChoices;
					inputField.setAttribute('list', workingDiv.id + "Colors");

					let colorList = document.createElement("datalist");
					colorList.id = workingDiv.id + "Colors";

					for (let color of entriesToAdd[i].colorChoices) {
						let opt = document.createElement("option");
						opt.value = color;

						colorList.appendChild(opt);
					}

					workingDiv.appendChild(colorList);
				}
			}
			if (entriesToAdd[i].inputFieldSize) {
				// if specified state input field size
				inputField.size = entriesToAdd[i].inputFieldSize;
			} else {
				inputField.size = 5;
			}
			// add the button effect to the input field to allow enter to send
			workingDiv["buttonEffect" + inputField.id] =  entriesToAdd[i].buttonEffect;
			workingDiv.appendChild(inputField);
			workingDiv.innerHTML += "&nbsp&nbsp&nbsp";
			workingDiv.inputFieldId = inputField.id;
			// create OK button to send
			var appEntryOkButton = document.createElement('span');
			appEntryOkButton.innerHTML = "&nbspOK&nbsp";
			appEntryOkButton.style.border = "1px solid black";
			appEntryOkButton.inputField = true;
			appEntryOkButton.inputFieldId = inputField.id;
			// click effect
			appEntryOkButton.callback = entriesToAdd[i].callback;
			appEntryOkButton.parameters = entriesToAdd[i].parameters;
			appEntryOkButton.app = app;
			appEntryOkButton.addEventListener('mousedown', entriesToAdd[i].buttonEffect);
			// highlighting effect on mouseover
			appEntryOkButton.addEventListener('mouseover', function() {
				this.style.background = "lightgray";
			});
			appEntryOkButton.addEventListener('mouseout', function() {
				this.style.background = this.startingBgColor;
			});
			workingDiv.appendChild(appEntryOkButton);
			// Add spacing
			var entrySpacer = document.createElement('span');
			entrySpacer.innerHTML = "&nbsp&nbsp&nbsp";
			workingDiv.appendChild(entrySpacer);
		} else {
			// if no input field attach button effect to entire div instead of just OK button.
			workingDiv.addEventListener('mousedown', entriesToAdd[i].buttonEffect);
			// highlighting effect on mouseover
			workingDiv.addEventListener('mouseover', function() {
				this.style.background = "lightgray";
			});
			workingDiv.addEventListener('mouseout', function() {
				this.style.background = this.startingBgColor;
			});
		}
		// click effect
		workingDiv.callback = entriesToAdd[i].callback;
		workingDiv.parameters = entriesToAdd[i].parameters;
		workingDiv.app = app;
		// add to menu
		var appContextMenuDiv = document.getElementById('appContextMenu');
		appContextMenuDiv.appendChild(workingDiv);
	} // end for each entry
} // end setAppContextMenuEntries

/**
Called automatically as part of page setup.
Fills out some of the field properties.
*/
function setupUiNoteMaker() {
	var workingDiv = document.getElementById('uiNoteMaker');
	var inputField = document.getElementById('uiNoteMakerInputField');
	inputField.id = "uiNoteMakerInputField";
	inputField.rows = 5;
	inputField.cols = 24;
	var sendButton = document.getElementById('uiNoteMakerSendButton');
	// click effect to make a note on the display (app launch)
	sendButton.addEventListener('click', function() {
		sendMessageMakeNote();
	});
	var closeButton = document.getElementById('uiNoteMakerCloseButton');
	// click effect to cancel making a note
	closeButton.addEventListener('click', function() {
		hideDialog(openDialog);
	});
	// Add Color fields.
	for (var i = 1; i <= 6; i++) {
		workingDiv = document.getElementById("uinmColorPick" + i);
		workingDiv.colorNumber = i;
		workingDiv.colorWasPicked = false;
		workingDiv.addEventListener("click", function () {
			setUiNoteColorSelect(this.colorNumber);
		});
		// This is necessary because for some strange reason, css values are not visible as properties.
		switch (i) {
			case 1: workingDiv.style.background = "lightyellow"; break;
			case 2: workingDiv.style.background = "lightblue"; break;
			case 3: workingDiv.style.background = "lightpink"; break;
			case 4: workingDiv.style.background = "lightgreen"; break;
			case 5: workingDiv.style.background = "lightsalmon"; break;
			case 6: workingDiv.style.background = "white"; break;
		}
	}
	setUiNoteColorSelect(1);
}

function setUiNoteColorSelect(colorNumber) {
	var workingDiv;
	// Adjust border size width
	for (var i = 1; i <= 6; i++) {
		workingDiv = document.getElementById("uinmColorPick" + i);
		workingDiv.style.border = "1px solid black";
		workingDiv.colorWasPicked = false;
		workingDiv.style.width = (parseInt(workingDiv.style.width) + 8) + "px";
		workingDiv.style.height = (parseInt(workingDiv.style.height) + 8) + "px";
	}
	workingDiv = document.getElementById("uinmColorPick" + colorNumber);
	workingDiv.style.border = "3px solid black";
	workingDiv.colorWasPicked = true;
	workingDiv.style.width = (parseInt(workingDiv.style.width) - 8) + "px";
	workingDiv.style.height = (parseInt(workingDiv.style.height) - 8) + "px";
}

/**
 * This sets the values of the note making button to make instead of save.
 *
 * @method setNoteToMakeMode
 */
function setNoteToMakeMode() {
	// get send button
	var sendButton = document.getElementById('uiNoteMakerSendButton');
	sendButton.inSaveMode = false;
	sendButton.textContent = "Make Note [Enter]";
	var workingDiv = document.getElementById('uiNoteMakerInputField');
	workingDiv.value = "";
}

/**
 * This function is activated in 2 ways.
 * 1) User click the send button.
 * 2) User hits enter when making a note. This check is done in the noBackspace funciton.
 * When activated will make the packet to launch app. Collects values from tags on page.
 *
 * @method sendMessageMakeNote
 */
function sendMessageMakeNote() {
	// get send button
	var sendButton = document.getElementById('uiNoteMakerSendButton');
	var workingDiv = document.getElementById('uiNoteMakerInputField');
	var data = {};
	// if in save mode, instead of make mode, then need to revert and save.
	if (sendButton.inSaveMode) {
		// send update of note
		data.app = sendButton.app;
		data.func = sendButton.callback;
		data.parameters = sendButton.parameters;
		data.parameters.clientInput = workingDiv.value;
		data.parameters.clientId   = interactor.uniqueID;
		data.parameters.clientName = document.getElementById('sage2PointerLabel').value;
		if (document.getElementById("uiNoteMakerCheckAnonymous").checked) {
			data.parameters.clientName = "Anonymous";
		}
		data.parameters.colorChoice = "lightyellow";
		for (let i = 1; i <= 6; i++) {
			if (document.getElementById("uinmColorPick" + i).colorWasPicked) {
				data.parameters.colorChoice = document.getElementById("uinmColorPick" + i).style.background;
			}
		}
		wsio.emit('callFunctionOnApp', data);
		// put back values
		setNoteToMakeMode();
		// hide the dialog, done editing
		hideDialog(openDialog);
		workingDiv.value = ""; // clear out the input field.
	} else {
		data.appName	= "quickNote";
		data.customLaunchParams		= {};
		data.customLaunchParams.clientName = document.getElementById('sage2PointerLabel').value;
		data.customLaunchParams.clientInput = workingDiv.value;
		if (document.getElementById("uiNoteMakerCheckAnonymous").checked) {
			data.customLaunchParams.clientName = "Anonymous";
		}
		data.customLaunchParams.colorChoice = "lightyellow";
		for (let i = 1; i <= 6; i++) {
			if (document.getElementById("uinmColorPick" + i).colorWasPicked) {
				data.customLaunchParams.colorChoice = document.getElementById("uinmColorPick" + i).style.background;
			}
		}
		wsio.emit('launchAppWithValues', data);
		workingDiv.value = ""; // clear out the input field.
	}
}

/**
Called automatically as part of the page setup.
Mostly fills out functionality and additional properties needed to operate.
*/
function setupUiDrawCanvas() {
	var uidzCanvas = document.getElementById('uiDrawZoneCanvas');
	// tracking variables when performing draw commands.
	uidzCanvas.pmx		= 0;
	uidzCanvas.pmy		= 0;
	uidzCanvas.doDraw	= false;
	uidzCanvas.imageToDraw = new Image();
	uidzCanvas.getContext('2d').fillStyle = "#FFFFFF"; //whitewash the canvas.
	uidzCanvas.getContext('2d').fillRect(0, 0, uidzCanvas.width, uidzCanvas.height);
	uidzCanvas.getContext('2d').fillStyle = "#000000";
	uidzCanvas.addEventListener('mousedown',
		function(event) {
			this.doDraw	= true;
			this.pmx	= event.offsetX;
			this.pmy	= event.offsetY;
		}
	);
	// event handlers to create the lines
	uidzCanvas.ongoingTouches = new Array();
	uidzCanvas.addEventListener('touchstart', uiDrawTouchStart);
	uidzCanvas.addEventListener('touchmove',  uiDrawTouchMove);
	uidzCanvas.addEventListener('touchend',   uiDrawTouchEnd);
	uidzCanvas.addEventListener('mouseup',    function(event) {
		this.doDraw = false;
	});
	uidzCanvas.addEventListener('mousemove',
		function(event) {
			if (this.doDraw) {
				// xDest, yDest, xPrev, yPrev
				uiDrawSendLineCommand(event.offsetX, event.offsetY, this.pmx, this.pmy);
				this.pmx = event.offsetX;
				this.pmy = event.offsetY;
			}
			var workingDiv = document.getElementById('uiDrawZoneEraseReference');
			workingDiv.style.left = (event.pageX - parseInt(workingDiv.style.width)  / 2) + "px";
			workingDiv.style.top  = (event.pageY - parseInt(workingDiv.style.height) / 2) + "px";
		}
	);
	// closes the draw area (but really hides it)
	var closeEditorButton = document.getElementById("uiDrawZoneCloseEditorButton");
	closeEditorButton.addEventListener('click',
		function() {
			hideDialog('uiDrawZone');
		}
	);
	// closes the draw area (but really hides it)
	var closeDoodleButton = document.getElementById("uiDrawZoneCloseDoodleButton");
	closeDoodleButton.addEventListener('click',
		function() {
			hideDialog('uiDrawZone');
			// Close the doodle on the wall.
			var workingDiv	= document.getElementById('uiDrawZoneCanvas');
			var data = {};
			data.app = workingDiv.appId;
			data.func = "SAGE2DeleteElement";
			data.parameters = {};
			data.parameters.clientName = document.getElementById('sage2PointerLabel').value;
			wsio.emit('callFunctionOnApp', data);
		}
	);
	// initiate a launch app for quick additions of doodles.
	var newButton = document.getElementById("uiDrawZoneNewButton");
	newButton.addEventListener('click',
		function() {
			uiDrawZoneRemoveSelfAsClient();
			var data = {};
			data.appName = "doodle";
			data.func = "addClientIdAsEditor"; // send this data to function after app starts
			data.customLaunchParams = {
				clientId: interactor.uniqueID,
				clientName: document.getElementById('sage2PointerLabel').value
			};
			wsio.emit('launchAppWithValues', data);
		}
	);
	// get the line adjustment working for the thickness buttons.
	var thicknessSelectBox;
	for (var i = 1; i <= 6; i++) {
		thicknessSelectBox = document.getElementById("uidztp" + i);
		thicknessSelectBox.lineWidth = (i - 1);
		thicknessSelectBox.addEventListener("mousedown", function() {
			var workingDiv = document.getElementById('uiDrawZoneCanvas');
			workingDiv.lineWidth = Math.pow(2, this.lineWidth);
			uiDrawSelectThickness('uidztp' + (this.lineWidth + 1));
		});
		// Start with thicknes 1
		if (i === 1) {
			thicknessSelectBox.style.border = "3px solid red";
		}
	}
	// var thicknessSelectBox = document.getElementById('uidztp1');
	// thicknessSelectBox.addEventListener('mousedown',
	// 	function() {
	// 		var workingDiv = document.getElementById('uiDrawZoneCanvas');
	// 		workingDiv.lineWidth = 1;
	// 		uiDrawSelectThickness('uidztp1');
	// 	});
	// // start the with 1px selected
	// uidzCanvas.lineWidth = 1;
	// thicknessSelectBox.style.border = "3px solid red";
	// // have to hard code each selection due to linewidth adjustment
	// // 2
	// thicknessSelectBox = document.getElementById('uidztp2');
	// thicknessSelectBox.addEventListener('mousedown',
	// 	function() {
	// 		var workingDiv = document.getElementById('uiDrawZoneCanvas');
	// 		workingDiv.lineWidth = 2;
	// 		uiDrawSelectThickness('uidztp2');
	// 	});
	// // next
	// thicknessSelectBox = document.getElementById('uidztp3');
	// thicknessSelectBox.addEventListener('mousedown',
	// 	function() {
	// 		var workingDiv = document.getElementById('uiDrawZoneCanvas');
	// 		workingDiv.lineWidth = 4;
	// 		uiDrawSelectThickness('uidztp3');
	// 	});
	// // next
	// thicknessSelectBox = document.getElementById('uidztp4');
	// thicknessSelectBox.addEventListener('mousedown',
	// 	function() {
	// 		var workingDiv = document.getElementById('uiDrawZoneCanvas');
	// 		workingDiv.lineWidth = 8;
	// 		uiDrawSelectThickness('uidztp4');
	// 	});
	// // next
	// thicknessSelectBox = document.getElementById('uidztp5');
	// thicknessSelectBox.addEventListener('mousedown',
	// 	function() {
	// 		var workingDiv = document.getElementById('uiDrawZoneCanvas');
	// 		workingDiv.lineWidth = 16;
	// 		uiDrawSelectThickness('uidztp5');
	// 	});
	// // next
	// thicknessSelectBox = document.getElementById('uidztp6');
	// thicknessSelectBox.addEventListener('mousedown',
	// 	function() {
	// 		var workingDiv = document.getElementById('uiDrawZoneCanvas');
	// 		workingDiv.lineWidth = 32;
	// 		uiDrawSelectThickness('uidztp6');
	// 	});
	// // next
	// thicknessSelectBox = document.getElementById('uidztp7');
	// thicknessSelectBox.addEventListener('mousedown',
	// 	function() {
	// 		var workingDiv = document.getElementById('uiDrawZoneCanvas');
	// 		workingDiv.lineWidth = 64;
	// 		uiDrawSelectThickness('uidztp7');
	// 	});
}

/**
Currently just whitewashes the draw canvas.
Trying to figure out how this could be transparent.
	But without knowing what is behind, seems pointless.
*/
function uiDrawCanvasBackgroundFlush(color) {
	var workingDiv	= document.getElementById('uiDrawZoneCanvas');
	var ctx			= workingDiv.getContext('2d');
	if (color !== 'transparent') {
		ctx.fillStyle = "#FFFFFF";
		ctx.fillRect(0, 0, workingDiv.width, workingDiv.height);
		ctx.fillStyle = "#000000";
	}
}

/**
Activated by clickong on a uidzBarBox div (line thickness selection).
Since the values double, need to know which option was selected, adjust the border (visual indicator)
	then finally double the thickness to get the correct value.
*/
function uiDrawSelectThickness(selectedDivId) {
	var workingDiv;
	var thickness = 1;
	for (var i = 1; i <= 7; i++) {
		if ('uidztp' + i == selectedDivId) {
			workingDiv = document.getElementById(selectedDivId);
			workingDiv.style.border = "3px solid red";
			// change the reference draw circle
			workingDiv = document.getElementById('uiDrawZoneEraseReference');
			workingDiv.style.width  = thickness + "px";
			workingDiv.style.height = thickness + "px";
		} else {
			workingDiv = document.getElementById('uidztp' + i);
			workingDiv.style.border = "1px solid black";
		}
		thickness *= 2;
	}
}

/**
Enables drawing with touch devices.
Start will record the initial points, it isn't until move where a canvas change occurs.
*/
function uiDrawTouchStart(event) {
	var workingDiv = document.getElementById('uiDrawZoneCanvas');
	var touches = event.changedTouches;
	for (var i = 0; i < touches.length; i++) {
		workingDiv.ongoingTouches.push(uiDrawMakeTouchData(touches[i]));
	}
}

/**
Support for touch devices.
This is when the new line is added.
*/
function uiDrawTouchMove(event) {
	var workingDiv = document.getElementById('uiDrawZoneCanvas');
	var touches = event.changedTouches;
	var touchId;
	var cbb = workingDiv.getBoundingClientRect(); // canvas bounding box: cbb
	for (var i = 0; i < touches.length; i++) {
		touchId = uiDrawGetTouchId(touches[i].identifier);
		// only if it is a known touch continuation
		if (touchId !== -1) {
			// xDest, yDest, xPrev, yPrev
			uiDrawSendLineCommand(
				touches[i].pageX - cbb.left,
				touches[i].pageY - cbb.top,
				workingDiv.ongoingTouches[touchId].x - cbb.left,
				workingDiv.ongoingTouches[touchId].y - cbb.top
			);
			workingDiv.ongoingTouches[touchId].x = touches[i].pageX;
			workingDiv.ongoingTouches[touchId].y = touches[i].pageY;
		}
	}
	workingDiv = document.getElementById('uiDrawZoneEraseReference');
	workingDiv.style.left = (touches[0].pageX - parseInt(workingDiv.style.width) / 2)  + "px";
	workingDiv.style.top  = (touches[0].pageY - parseInt(workingDiv.style.height) / 2) + "px";
}

/**
Support for touch devices.
When touch ends, need to clear out the tracking values to prevent weird auto connections.
*/
function uiDrawTouchEnd(event) {
	var workingDiv = document.getElementById('uiDrawZoneCanvas');
	var touches = event.changedTouches;
	var touchId;
	for (var i = 0; i < touches.length; i++) {
		touchId = uiDrawGetTouchId(touches[i].identifier);
		if (touchId !== -1) {
			workingDiv.ongoingTouches.splice(touchId, 1);
		}
	}
	workingDiv = document.getElementById('uiDrawZoneEraseReference');
	workingDiv.style.left = "-100px";
	workingDiv.style.top  = "-100px";
}

/**
Makes the data used to track touches.
*/
function uiDrawMakeTouchData(touch) {
	var nt = {};
	nt.id	= touch.identifier;
	nt.x	= touch.pageX;
	nt.y	= touch.pageY;
	return nt;
}

/**
Given a touch identifier(id) will return the index of the touch tracking object.
*/
function uiDrawGetTouchId(id) {
	var workingDiv  = document.getElementById('uiDrawZoneCanvas');
	for (var i = 0; i < workingDiv.ongoingTouches.length; i++) {
		if (workingDiv.ongoingTouches[i].id === id) {
			return i;
		}
	}
	return -1;
}

/**
 * When a user tries to draw on the doodle canavs, the events are converted to locations of where to place
 * the line data. Previous location to current location.
 * The client doesn't actually cause their canvas to update. The app sends a confirmation back which
 * causes the canvas to update.
 *
 * @method uiDrawSendLineCommand
 * @param {Number} xDest - location on canvas for next point.
 * @param {Number} yDest - location on canvas for next point.
 * @param {Number} xPrev - previous location on canvas.
 * @param {Number} yPrev - previous location on canvas.
 */
function uiDrawSendLineCommand(xDest, yDest, xPrev, yPrev) {
	var workingDiv	= document.getElementById('uiDrawZoneCanvas');
	var lineWidth	= parseInt(workingDiv.lineWidth);
	var fillStyle	= document.getElementById('uiDrawColorPicker').value;
	var strokeStyle	= document.getElementById('uiDrawColorPicker').value;
	// If resize is greater than 0, its a 2^resize value, otherwise 1.
	var modifier = (workingDiv.resizeCount > 0) ? (Math.pow(2, workingDiv.resizeCount)) : 1;
	var dataForApp  = {};
	dataForApp.app  = workingDiv.appId;
	dataForApp.func = "drawLine";
	dataForApp.data = [
		xDest * modifier, yDest * modifier,
		xPrev * modifier, yPrev * modifier,
		lineWidth,
		fillStyle, strokeStyle,
		workingDiv.clientDest
	];
	dataForApp.clientDest = "allDisplays";
	wsio.emit("sendDataToClient", dataForApp);
}

/**
This function actually causes the line to appear on the canvas.
Data packet sent by the doodle master app itself.

This funciton activated by receiving that corresponding packet.

Will need to be cleaned up later.
data.params will match the doodle.js drawLined lineData parameter.
	Currently lineData
	0: 	xDest
	1	yDest
	2	xPrev
	3	yPrev

	4 	lineWidth
	5 	fillStyle
	6 	strokeStyle

	7: 	uiClient
*/
function uiDrawMakeLine(data) {
	// mostly original code
	var workingDiv	= document.getElementById('uiDrawZoneCanvas');
	var ctx			= workingDiv.getContext('2d');
	var lineWidth	= data.params[4];
	ctx.fillStyle	= data.params[5];
	ctx.strokeStyle	= data.params[6];
	// if the line width is greater than 1. At 1 the fill + circle border will expand beyond the line causing bumps in the line.
	if (lineWidth > 2) {
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(data.params[2], data.params[3], lineWidth / 2, 0, Math.PI * 2, false);
		ctx.fill();
	}
	ctx.beginPath();
	ctx.lineWidth = lineWidth;
	ctx.moveTo(data.params[2], data.params[3]);
	ctx.lineTo(data.params[0], data.params[1]);
	ctx.stroke();
}

/**
 * This will be called from a wsio packet "sendDataToClient".
 * Must clear out canvas, set state, show dialog.
 * Should happen when a user chooses to edit an existing doodle. Their canvas needs to be set
 * to the current state of the doodle before edits should be made.
 * But, doodles can be made from images which have varying sizes. They must also be contained within view correctly.
 *
 * @method uiDrawSetCurrentStateAndShow
 * @param {Object} data - object with properties below.
 * @param {Object} data.imageWidth  - image resolution.
 * @param {Object} data.imageHeight - image resolution.
 * @param {Object} data.canvasImage - image as toDataURL().
 * @param {Object} data.clientDest  - should be this client.
 * @param {Object} data.appId       - app id this is for.
 */
function uiDrawSetCurrentStateAndShow(data) {
	// clear out canvas
	uiDrawCanvasBackgroundFlush("white");
	var imageResolutionToBe = { w: data.imageWidth, h: data.imageHeight };
	var imageLimit = {w: (window.innerWidth * 0.8), h: (window.innerHeight - 200)};
	var resizeCount = 0;
	while (imageResolutionToBe.w > imageLimit.w) {
		imageResolutionToBe.w /= 2;
		imageResolutionToBe.h /= 2;
		resizeCount++;
	}
	while (imageResolutionToBe.h > imageLimit.h) {
		imageResolutionToBe.w /= 2;
		imageResolutionToBe.h /= 2;
		resizeCount++;
	}

	// set the state
	var workingDiv = document.getElementById('uiDrawZoneCanvas');
	workingDiv.width           = data.imageWidth;
	workingDiv.height          = data.imageHeight;
	workingDiv.style.width     = imageResolutionToBe.w + "px";
	workingDiv.style.height    = imageResolutionToBe.h + "px";
	workingDiv.imageToDraw.src = data.canvasImage;
	// set variables to correctly send updates and allow removal as editor.
	workingDiv.clientDest  = data.clientDest;
	workingDiv.appId       = data.appId;
	workingDiv.resizeCount = resizeCount;
	// delayed drawing until after load completes
	workingDiv.imageToDraw.parentCtx = workingDiv.getContext('2d');
	workingDiv.imageToDraw.onload    = function() {
		this.parentCtx.drawImage(this, 0, 0);
		// show dialog
		showDialog('uiDrawZone');
	};
}

/**
 * Called when the user creates a new doodle, or closes the doodle dialog.
 * This is necessary because the doodle canvas space is a shared draw space,
 * if they do not remove themselves the app will continue to send updates
 * even if they are not currently editing the app.
 *
 * @method uiDrawZoneRemoveSelfAsClient
 * @param {Object} data - object with properties below.
 * @param {Object} data.imageWidth  - image resolution.
 * @param {Object} data.imageHeight - image resolution.
 * @param {Object} data.canvasImage - image as toDataURL().
 * @param {Object} data.clientDest  - should be this client.
 * @param {Object} data.appId       - app id this is for.
 */
function uiDrawZoneRemoveSelfAsClient() {
	var workingDiv  = document.getElementById('uiDrawZoneCanvas');
	var dataForApp  = {};
	dataForApp.app  = workingDiv.appId;
	dataForApp.func = "removeClientIdAsEditor";
	dataForApp.data = [workingDiv.clientDest];
	dataForApp.clientDest = "allDisplays";
	wsio.emit("sendDataToClient", dataForApp);
}
