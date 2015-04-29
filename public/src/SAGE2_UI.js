// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-15

/**
 * Web user interface
 *
 * @module client
 * @submodule SAGE2_UI
 * @class SAGE2_UI
 */

window.URL = (window.URL || window.webkitURL || window.msURL || window.oURL);
navigator.getUserMedia   = (navigator.getUserMedia  || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock  || document.webkitExitPointerLock;

/////////////////////////////////////////////////////////////////////////////
// Polyfill for 'bind' - needed for older version of iOS Safari mobile ;-(
/////////////////////////////////////////////////////////////////////////////
/* eslint-disable */
if (!Function.prototype.bind) {
  Function.prototype.bind = function(oThis) {
    if (typeof this !== 'function') {
      // closest thing possible to the ECMAScript 5
      // internal IsCallable function
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }
    var aArgs   = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP    = function() {},
        fBound  = function() {
          return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
                 aArgs.concat(Array.prototype.slice.call(arguments)));
        };
    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();
    return fBound;
  };
}
/* eslint-enable */
/////////////////////////////////////////////////////////////////////////////

var wsio;
var displayUI;
var interactor;
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
				if (json_cfg.rproxy_port !== undefined)
					https_port = ":" + json_cfg.rproxy_port.toString();
				else
					https_port = ":" + json_cfg.port.toString();
				if (https_port === ":443") https_port = "";

				window.location.replace( "https://" + window.location.hostname + https_port + window.location.pathname);
			}
		};
		xhr.send();
		return;
	}

	// Detect which browser is being used
	SAGE2_browser();

	// Create a connection to the SAGE2 server
	wsio = new WebsocketIO();
	wsio.open(function() {
		console.log("Websocket opened");

		setupListeners();

		/*
		var clientDescription = {
			clientType: "sageUI",
			sendsPointerData: true,
			sendsMediaStreamFrames: true,
			uploadsContent: true,
			requestsServerFiles: true,
			sendsWebContentToLoad: true,
			launchesWebBrowser: true,
			sendsVideoSynchonization: false,
			sharesContentWithRemoteServer: false,
			receivesDisplayConfiguration: true,
			receivesClockTime: false,
			requiresFullApps: false,
			requiresAppPositionSizeTypeOnly: true,
			receivesMediaStreamFrames: false,
			receivesWindowModification: true,
			receivesPointerData: false,
			receivesInputEvents: false,
			receivesRemoteServerInfo: false
		};
		*/
		var clientDescription = {
			clientType: "sageUI",
			requests: {
				config: true,
				version: false,
				time: false,
				console: false
			}
		};
		wsio.emit('addClient', clientDescription);

		interactor = new SAGE2_interaction(wsio);
		interactor.setFileUploadProgressCallback(fileUploadProgress);
		interactor.setFileUploadCompleteCallback(fileUploadComplete);
		window.postMessage('SAGE2_desktop_capture_enabled', "*");
	});

	// socket close event (i.e. server crashed)
	wsio.on('close', function (evt) {
		var refresh = setInterval(function() {
			reloadIfServerRunning(function() {
				clearInterval(refresh);
			});
		}, 2000);
	});

	var sage2UI = document.getElementById('sage2UI');

	window.addEventListener('dragover', preventDefault, false);
	window.addEventListener('dragend',  preventDefault, false);
	window.addEventListener('drop',     preventDefault, false);

	sage2UI.addEventListener('dragover',  preventDefault, false);
	sage2UI.addEventListener('dragend',   preventDefault, false);
	sage2UI.addEventListener('dragenter', fileDragEnter,  false);
	sage2UI.addEventListener('dragleave', fileDragLeave,  false);
	sage2UI.addEventListener('drop',      fileDrop,       false);

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

	window.addEventListener('message', function (event) {
		if (event.origin !== window.location.origin) return;

		if (event.data.cmd === "SAGE2_desktop_capture-Loaded") {
			if (interactor !== undefined && interactor !== null)
				interactor.chromeDesktopCaptureEnabled = true;
		}
		if (event.data.cmd === "window_selected") {
			interactor.captureDesktop(event.data.mediaSourceId);
		}
	});

	resizeMenuUI();
	resizeDialogs();
}

function setupListeners() {
	wsio.on('initialize', function(data) {
		interactor.setInteractionId(data.UID);
		pointerDown = false;
		pointerX    = 0;
		pointerY    = 0;
	});

	wsio.on('setupDisplayConfiguration', function(config) {
		displayUI = new SAGE2DisplayUI();
		displayUI.init(config, wsio);

		var sage2Min  = Math.min(config.totalWidth, config.totalHeight);
		var screenMin = Math.min(screen.width, screen.height);
		interactor.setPointerSensitivity(sage2Min/screenMin);
	});

	wsio.on('createAppWindowPositionSizeOnly', function(data) {
		displayUI.addAppWindow(data);
	});

	wsio.on('deleteElement', function(data) {
		displayUI.deleteApp(data.elemId);
	});

	wsio.on('updateItemOrder', function(data) {
		//displayUI.updateItemOrder(data.idList);
		displayUI.updateItemOrder(data);
	});

	wsio.on('setItemPosition', function(data) {
		displayUI.setItemPosition(data);
	});

	wsio.on('setItemPositionAndSize', function(data) {
		displayUI.setItemPositionAndSize(data);
	});

	wsio.on('availableApplications', function(data) {
		var appList = document.getElementById('appList');
		var appListContainer = document.getElementById('appListContainer');
		var size = parseInt(appListContainer.style.width, 10) / 6;

		removeAllChildren(appList);

		var i = 0;
		while(i < data.length) {
			var row = document.createElement('tr');
			var appsPerRow = Math.min(data.length - i, 6);
			for(var j=0; j<appsPerRow; j++) {
				var col = document.createElement('td');
				col.id = "app_row_" + data[i+j].exif.FileName;
				col.setAttribute("application", data[i+j].exif.FileName);
				col.style.verticalAlign = "top";
				col.style.textAlign = "center";
				col.style.width = size + "px";
				col.style.paddingTop = "12px";
				col.style.paddingBottom = "12px";
				var appIcon = document.createElement('img');
				appIcon.id = "app_icon_" + data[i+j].exif.FileName;
				appIcon.setAttribute("application", data[i+j].exif.FileName);
				appIcon.src = data[i+j].exif.SAGE2thumbnail+"_128.jpg";
				appIcon.width = parseInt(size * 0.8, 10);
				appIcon.height = parseInt(size * 0.8, 10);
				var appName = document.createElement('p');
				appName.id = "app_name_" + data[i+j].exif.FileName;
				appName.setAttribute("application", data[i+j].exif.FileName);
				appName.textContent = data[i+j].exif.metadata.title;
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

		var images = document.getElementById('images');
		var videos = document.getElementById('videos');
		var pdfs = document.getElementById('pdfs');
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
		document.getElementById('fileListElems').style.width = (longest+60).toString() + "px";

		showDialog('mediaBrowserDialog');
	});

	wsio.on('requestNextFrame', function(data) {
		interactor.sendMediaStreamFrame();
	});

	wsio.on('stopMediaCapture', function() {
		if (interactor.mediaStream !== null) interactor.mediaStream.stop();
	});
}


/**
 * Handler resizes
 *
 * @method SAGE2_resize
 */
function SAGE2_resize() {
	resizeMenuUI();
	resizeDialogs();

	if (displayUI) displayUI.resize();
}

/**
 * Resize menus
 *
 * @method resizeMenuUI
 */
function resizeMenuUI() {
	//var menuScale = (window.innerWidth/window.devicePixelRatio) > 512 ? 1.0 : 0.65;
	var menuScale = window.innerWidth > 1024 ? 1.0 : 0.65;

	var sage2Pointer = document.getElementById('sage2pointer');
	sage2Pointer.width  = Math.floor(48 * menuScale);
	sage2Pointer.height = Math.floor(48 * menuScale);
	var sharescreen  = document.getElementById('sharescreen');
	sharescreen.width   = Math.floor(48 * menuScale);
	sharescreen.height  = Math.floor(48 * menuScale);
	var applauncher  = document.getElementById('applauncher');
	applauncher.width   = Math.floor(48 * menuScale);
	applauncher.height  = Math.floor(48 * menuScale);
	var mediabrowser = document.getElementById('mediabrowser');
	mediabrowser.width  = Math.floor(48 * menuScale);
	mediabrowser.height = Math.floor(48 * menuScale);
	var arrangement  = document.getElementById('arrangement');
	arrangement.width   = Math.floor(48 * menuScale);
	arrangement.height  = Math.floor(48 * menuScale);
	var settings     = document.getElementById('settings');
	settings.width      = Math.floor(48 * menuScale);
	settings.height     = Math.floor(48 * menuScale);
	var info         = document.getElementById('info');
	info.width          = Math.floor(48 * menuScale);
	info.height         = Math.floor(48 * menuScale);
	//var webbrowser = document.getElementById('browser');
	//webbrowser.width  = Math.floor(48 * menuScale);
	//webbrowser.height = Math.floor(48 * menuScale);

	var uiButton = getCSSProperty("style_ui.css", ".uiButton");
	if (uiButton !== null) {
		uiButton.style.width  = Math.floor(165 * menuScale) + "px";
		uiButton.style.height = Math.floor( 64 * menuScale) + "px";
	}
	var uiButtonImg = getCSSProperty("style_ui.css", ".uiButton img");
	if (uiButtonImg !== null) {
		uiButtonImg.style.top  = Math.floor(8 * menuScale) + "px";
		uiButtonImg.style.left = Math.floor(8 * menuScale) + "px";
	}
	var uiButtonP = getCSSProperty("style_ui.css", ".uiButton p");
	if (uiButtonP !== null) {
		uiButtonP.style.fontSize = Math.floor(12 * menuScale) + "px";
		uiButtonP.style.top  = Math.floor(20 * menuScale) + "px";
		uiButtonP.style.left = Math.floor(64 * menuScale) + "px";
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
	for (var i=0; i<document.styleSheets.length; i++) {
		var sheet = document.styleSheets[i];
		if (sheet.href && sheet.href.indexOf(cssFile) >= 0) {
			var rules = sheet.cssRules ? sheet.cssRules : sheet.rules;
			if (!rules || rules.length === 0) return null;
			for (var j=0; j<rules.length; j++) {
				if (rules[j].selectorText === selector) return rules[j];
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
	var windowAspect = window.innerWidth/window.innerHeight;
	var appListContainer = document.getElementById('appListContainer');
	appListContainer.style.width  = (window.innerWidth*0.7 - 24).toString() + "px";
	appListContainer.style.height = (window.innerHeight*0.7 - 72).toString() + "px";
	var fileListContainer = document.getElementById('fileListContainer');
	fileListContainer.style.width  = (window.innerWidth/2 *0.6 - 24).toString() + "px";
	fileListContainer.style.height = (window.innerHeight/2 - 72).toString() + "px";
	var metadata = document.getElementById('metadata');
	metadata.style.left   = (window.innerWidth/2 *0.6 - 13).toString() + "px";
	metadata.style.width  = (window.innerWidth/2 *0.4).toString() + "px";
	metadata.style.height = (window.innerHeight/2 - 72).toString() + "px";
	var sage2pointerHelp  = document.getElementById('sage2pointerHelp');
	var sage2pointerHelpAspect  = 1264.25/982.255;
	if (sage2pointerHelpAspect <= windowAspect) {
		sage2pointerHelp.height = window.innerHeight * 0.7;
		sage2pointerHelp.width  = sage2pointerHelp.height * sage2pointerHelpAspect;
	}
	else {
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
	for (var i=0; i<list[type].length; i++) {
		var file = document.createElement('li');
		file.textContent = list[type][i].exif.FileName;
		file.id          = "file_" + list[type][i].exif.FileName;
		file.setAttribute("application", type2App[type]);
		file.setAttribute("file", list[type][i].exif.FileName);
		file.setAttribute("thumbnail", list[type][i].exif.SAGE2thumbnail);
		parent.appendChild(file);

		textWidthTest.textContent = file.textContent;
		var textWidth = (textWidthTest.clientWidth + 1);
		if (textWidth > longest) longest = textWidth;
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
	event.preventDefault();
}

/**
 * Start drag'n'drop
 *
 * @method fileDragEnter
 * @param event {Event} event data
 */
function fileDragEnter(event) {
	var sage2UI = document.getElementById('sage2UI');
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
	var sage2UI = document.getElementById('sage2UI');
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
	event.preventDefault();

	var sage2UI = document.getElementById('sage2UI');
	sage2UI.style.borderStyle = "solid";
	displayUI.fileDrop = false;
	displayUI.draw();

	// trigger file upload
	var x = event.layerX / event.target.clientWidth;
	var y = event.layerY / event.target.clientHeight;
	if (event.dataTransfer.files.length > 0) {
		displayUI.fileUpload = true;
		displayUI.uploadPercent = 0;
		interactor.uploadFiles(event.dataTransfer.files, x, y);
	}
	else {
		interactor.uploadURL(event.dataTransfer.getData("Url"), x, y);
	}
}

/**
 * File upload progress callback
 *
 * @method fileUploadProgress
 * @param percent {Number} process
 */
function fileUploadProgress(percent) {
	displayUI.setUploadPercent(percent);
	displayUI.draw();
}

/**
 * Triggered on file upload complete: redraw UI
 *
 * @method fileUploadComplete
 */
function fileUploadComplete() {
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
	var sage2UI = document.getElementById('sage2UI');
	sage2UI.style.borderStyle = "solid";
	displayUI.fileDrop = false;
	displayUI.draw();

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
	if (event.target.id === "sage2UI") {
		// update the position of the pointer
		var rect = event.target.getBoundingClientRect();
		var mouseX = event.clientX - rect.left;
		var mouseY = event.clientY - rect.top;
		// pointerDown used to detect the drag event
		pointerDown = true;
		pointerX    = mouseX;
		pointerY    = mouseY;
		displayUI.pointerMove(mouseX, mouseY);

		// then send the click
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		displayUI.pointerPress(btn);
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
	if (event.target.id === "sage2UI") {
		// update the position of the pointer
		var rect = event.target.getBoundingClientRect();
		var mouseX = event.clientX - rect.left;
		var mouseY = event.clientY - rect.top;
		// pointerDown used to detect the drag event
		pointerDown = false;
		pointerX    = mouseX;
		pointerY    = mouseY;
		displayUI.pointerMove(mouseX, mouseY);

		// then send the pointer release
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		displayUI.pointerRelease(btn);
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
	if (event.target.id === "sage2UI" && keyEvents === false) {
		document.addEventListener('keydown',  keyDown,  false);
		document.addEventListener('keyup',    keyUp,    false);
        document.addEventListener('keypress', keyPress, false);
		keyEvents = true;
	}
	else if (event.target.id !== "sage2UI" && keyEvents === true) {
		document.removeEventListener('keydown',  keyDown,  false);
		document.removeEventListener('keyup',    keyUp,    false);
        document.removeEventListener('keypress', keyPress, false);
		keyEvents = false;
	}

	if (event.target.id === "sage2UI") {
		var rect   = event.target.getBoundingClientRect();
		var mouseX = event.clientX - rect.left;
		var mouseY = event.clientY - rect.top;
		pointerX   = mouseX;
		pointerY   = mouseY;
		// Send pointer event only during drag events
		if (pointerDown) {
			displayUI.pointerMove(mouseX, mouseY);
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
	if (!__SAGE2__.browser.isSafari && !__SAGE2__.browser.isIE && (movementX === 0 && movementY === 0 || (Date.now() - touchTime) < 1000)) return;
	if (__SAGE2__.browser.isSafari  && __SAGE2__.browser.isIOS) return;
	if (__SAGE2__.browser.isIE      && __SAGE2__.browser.isWinPhone) return;
	hasMouse = true;
	document.title = "SAGE2 UI - Desktop";
	console.log("Detected as desktop device");

	document.addEventListener('mousedown',  pointerPress,    false);
	document.addEventListener('mouseup',    pointerRelease,  false);
	document.addEventListener('mousemove',  pointerMove,     false);
	document.addEventListener('wheel',      pointerScroll,   false);
	document.addEventListener('click',      pointerClick,    false);
	document.addEventListener('dblclick',   pointerDblClick, false);

	document.removeEventListener('mousemove', mouseCheck, false);

	var uiButtonImg = getCSSProperty("style_ui.css", ".uiButton:hover img");
	if (uiButtonImg !== null) {
		uiButtonImg.style['-webkit-transform'] = "scale(1.2)";
		uiButtonImg.style['-moz-transform']    = "scale(1.2)";
		uiButtonImg.style.transform            = "scale(1.2)";
	}
	var uiButtonP = getCSSProperty("style_ui.css", ".uiButton p");
	if (uiButtonP !== null) {
		uiButtonP.style.opacity = "0.0";
	}
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
	if (element.id === "sage2pointer"      || element.id === "sage2pointerContainer" || element.id === "sage2pointerLabel") {
		interactor.startSAGE2Pointer(element.id);
	}
	else if (element.id === "sharescreen"  || element.id === "sharescreenContainer"  || element.id === "sharescreenLabel") {
		interactor.startScreenShare();
	}
	else if (element.id === "applauncher"  || element.id === "applauncherContainer"  || element.id === "applauncherLabel") {
		wsio.emit('requestAvailableApplications');
	}
	else if (element.id === "mediabrowser" || element.id === "mediabrowserContainer" || element.id === "mediabrowserLabel") {
		wsio.emit('requestStoredFiles');
	}
	else if (element.id === "arrangement"  || element.id === "arrangementContainer"  || element.id === "arrangementLabel") {
		showDialog('arrangementDialog');
	}
	else if (element.id === "settings"     || element.id === "settingsContainer"     || element.id === "settingsLabel") {
		showDialog('settingsDialog');
	}
	else if (element.id === "browser"      || element.id === "browserContainer"      || element.id === "browserLabel") {
		showDialog('browserDialog');
	}
	else if (element.id === "info"         || element.id === "infoContainer"         || element.id === "infoLabel") {
		showDialog('infoDialog');
	}

	// App Launcher Dialog
	else if (element.id === "appOpenBtn") {
		loadSelectedApplication();
		hideDialog('appLauncherDialog');
	}
	else if (element.id === "appCloseBtn") {
		selectedAppEntry = null;
		hideDialog('appLauncherDialog');
	}

	// Mobile SAGE2 Pointer
	else if (element.id === "closeMobileSAGE2Pointer") {
		interactor.stopSAGE2Pointer();
	}

	// Media Browser Dialog
	else if (element.id === "fileOpenBtn") {
		loadSelectedFile();
		document.getElementById('thumbnail').src = "images/blank.jpg";
		document.getElementById('metadata_text').textContent = "";
		hideDialog('mediaBrowserDialog');
	}
	else if (element.id === "fileCloseBtn") {
		selectedFileEntry = null;
		document.getElementById('thumbnail').src = "images/blank.jpg";
		document.getElementById('metadata_text').textContent = "";
		hideDialog('mediaBrowserDialog');
	}
	// Upload files to SAGE2
	else if (element.id === "fileUploadBtn") {
		// clear the preview panel
		selectedFileEntry = null;
		document.getElementById('thumbnail').src = "images/blank.jpg";
		document.getElementById('metadata_text').textContent = "";
		// close the media browswer
		hideDialog('mediaBrowserDialog');
		// open the file uploader panel
		showDialog('uploadDialog');
	}
	// upload files local to the user's device
	else if (element.id === "localFilesBtn") {
		// close the file uploader panel
		hideDialog('uploadDialog');
		// open the file library
		//    delay to remove bounce evennt on Chrome/iOS
		setTimeout(function() { showDialog('localfileDialog'); }, 200);
	}
	// upload from Dropbox
	else if (element.id === "dropboxFilesBtn") {
		// Not Yet Implemented
		//   ...
		// close the file uploader panel
		hideDialog('uploadDialog');
	}
	else if (element.id === "cancelFilesBtn") {
		// close the file uploader panel
		hideDialog('uploadDialog');
	}
	else if (element.id === "cancelFilesBtn2") {
		// close the pic uploader panel
		hideDialog('localfileDialog');
	}
	else if (element.id === "localfileUploadBtn") {
		// trigger the upload function
		fileUploadFromUI();
	}

	else if (element.id === "fileDeleteBtn") {
		if (selectedFileEntry !== null && confirm("Are you sure you want to delete this file?")) {
			var application = selectedFileEntry.getAttribute("application");
			var file = selectedFileEntry.getAttribute("file");
			wsio.emit('deleteElementFromStoredFiles', {application: application, filename: file});

			document.getElementById('thumbnail').src = "images/blank.jpg";
			document.getElementById('metadata_text').textContent = "";
			selectedFileEntry = null;
			hideDialog('mediaBrowserDialog');
		}
	}

	// Arrangement Dialog
	else if (element.id === "arrangementCloseBtn") {
		hideDialog('arrangementDialog');
	}

	// Info Dialog
	else if (element.id === "infoCloseBtn") {
		hideDialog('infoDialog');
	}
	else if (element.id === "helpcontent") {
		hideDialog('infoDialog');
		var awin1 = window.open("help/index.html", '_blank');
		awin1.focus();
	}
	else if (element.id === "admincontent") {
		hideDialog('infoDialog');
		var awin2 = window.open("admin/index.html", '_blank');
		awin2.focus();
	}
	else if (element.id === "infocontent") {
		hideDialog('infoDialog');
		var awin3 = window.open("help/info.html", '_blank');
		awin3.focus();
	}

	// Settings Dialog
	else if (element.id === "settingsCloseBtn") {
		hideDialog('settingsDialog');
	}

	// Browser Dialog
	else if (element.id === "browserOpenBtn") {
		var url = document.getElementById("openWebpageUrl");
		wsio.emit('openNewWebpage', {id: interactor.uniqueID, url: url.value});
		hideDialog('browserDialog');
	}
	else if (element.id === "browserCloseBtn") {
		hideDialog('browserDialog');
	}

	// Application Selected
	else if (element.id.length > 4 && element.id.substring(0, 4) === "app_") {
		var application_selected = element.getAttribute("application");

		if (selectedAppEntry !== null) selectedAppEntry.style.backgroundColor = "transparent";
		selectedAppEntry = document.getElementById('app_row_' + application_selected);
		selectedAppEntry.style.backgroundColor = "#6C6C6C";
	}

	// File Selected
	else if (element.id.length > 5 && element.id.substring(0, 5) === "file_") {
		// highlight selection
		if (selectedFileEntry !== null) selectedFileEntry.style.backgroundColor = "transparent";
		selectedFileEntry = element;
		selectedFileEntry.style.backgroundColor = "#6C6C6C";

		// show metadata
		var metadata = document.getElementById('metadata');
		var size = Math.min(parseInt(metadata.style.width, 10), parseInt(metadata.style.height, 10)) * 0.9 - 32;
		var thumbnail = document.getElementById('thumbnail');
		thumbnail.src = selectedFileEntry.getAttribute("thumbnail")+"_128.jpg";
		thumbnail.width = size;
		thumbnail.height = size;
		var metadata_text = document.getElementById('metadata_text');
		metadata_text.textContent = selectedFileEntry.textContent;
	}

	// Arrangement Button Chosen
	else if (element.id === "clearcontent") {
		wsio.emit('clearDisplay');
		hideDialog('arrangementDialog');
	}
	else if (element.id === "tilecontent") {
		wsio.emit('tileApplications');
		hideDialog('arrangementDialog');
	}
	else if (element.id === "savesession") {
		var template = "session_" + dateToYYYYMMDDHHMMSS(new Date());
		var filename = prompt("Please enter a session name\n(Leave blank for name based on server's time)", template);
		if (filename !== null) {
			wsio.emit('saveSesion', filename);
			hideDialog('arrangementDialog');
		}
	}

	// Firefox Share Screen Dialog
	else if (element.id === "ffShareScreenBtn") {
		interactor.captureDesktop("screen");
		hideDialog('ffShareScreenDialog');
	}
	else if (element.id === "ffShareWindowBtn") {
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
	if (element.id === "sage2UI") {
		displayUI.pointerDblClick();
		//event.preventDefault();
	}
	else if (element.id.length > 4 && element.id.substring(0, 4) === "app_") {
		loadSelectedApplication();
		hideDialog('appLauncherDialog');
	}
	else if (element.id.length > 5 && element.id.substring(0, 5) === "file_") {
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
	if (event.target.id === "sage2UI") {
		displayUI.pointerScroll(event.deltaY);
		event.preventDefault();
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

	if (event.target.id === "sage2UI") {
		if (event.touches.length === 1) {
			rect        = event.target.getBoundingClientRect();
			touchStartX = event.touches[0].clientX - rect.left;
			touchStartY = event.touches[0].clientY - rect.top;
			displayUI.pointerMove(touchStartX, touchStartY);
			displayUI.pointerPress("left");
			touchHold = setTimeout(function() {
				displayUI.keyDown(8);
				displayUI.keyUp(8);
			}, 1500);
			touchMode = "translate";
		}
		else if (event.touches.length === 2) {
			rect    = event.target.getBoundingClientRect();
			touch0X = event.touches[0].clientX - rect.left;
			touch0Y = event.touches[0].clientY - rect.top;
			touch1X = event.touches[1].clientX - rect.left;
			touch1Y = event.touches[1].clientY - rect.top;
			touchX  = parseInt((touch0X+touch1X)/2, 10);
			touchY  = parseInt((touch0Y+touch1Y)/2, 10);
			displayUI.pointerRelease("left");
			displayUI.pointerMove(touchX, touchY);
			touchDist = (touch1X-touch0X)*(touch1X-touch0X) + (touch1Y-touch0Y)*(touch1Y-touch0Y);
			if (touchHold !== null) {
				clearTimeout(touchHold);
				touchHold = null;
			}
			touchMode = "scale";
		}
		else {
			if (touchHold !== null) {
				clearTimeout(touchHold);
				touchHold = null;
			}
			touchMode = "";
		}
		event.preventDefault();
		event.stopPropagation();
	}
	else if (event.target.id === "sage2MobileTrackpad") {
		var trackpadTouches = [];
		for(var i=0; i<event.touches.length; i++) {
			if (event.touches[i].target.id === "sage2MobileTrackpad")
				trackpadTouches.push(event.touches[i]);
		}
		if (trackpadTouches.length === 1) {
			touchStartX = trackpadTouches[0].clientX;
			touchStartY = trackpadTouches[0].clientY;
		}
		else if (trackpadTouches.length === 2) {
			touch0X = trackpadTouches[0].clientX;
			touch0Y = trackpadTouches[0].clientY;
			touch1X = trackpadTouches[1].clientX;
			touch1Y = trackpadTouches[1].clientY;
			touchDist = (touch1X-touch0X)*(touch1X-touch0X) + (touch1Y-touch0Y)*(touch1Y-touch0Y);

			interactor.pointerReleaseMethod({button: 0});
			touchMode = "scale";
		}
	}
	else if (event.target.id === "sage2MobileLeftButton") {
		interactor.pointerPressMethod({button: 0});
		touchMode = "translate";
		touchHold = setTimeout(function() {
			interactor.pointerKeyDownMethod({keyCode: 8});
			interactor.pointerKeyUpMethod({keyCode: 8});
		}, 1500);

		event.preventDefault();
		event.stopPropagation();
	}
	else if (event.target.id === "sage2MobileRightButton") {
		interactor.pointerPressMethod({button: 2});

		event.preventDefault();
		event.stopPropagation();
	}
	else {
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
	if ((now-touchTapTime) > 500) { touchTap = 0;                     }
	if ((now-touchTime)    < 250) { touchTap++;   touchTapTime = now; }
	else                         { touchTap = 0; touchTapTime = 0;   }

	if (event.target.id === "sage2UI") {
		if (touchMode === "translate") {
			displayUI.pointerRelease("left");
			if (touchTap === 2) displayUI.pointerDblClick();
		}
		touchMode = "";
		event.preventDefault();
		event.stopPropagation();
	}
	else if (event.target.id === "sage2MobileTrackpad") {
		if (touchMode === "scale") touchMode = "";
		event.preventDefault();
		event.stopPropagation();
	}
	else if (event.target.id === "sage2MobileLeftButton") {
		if (touchMode === "translate") {
			interactor.pointerReleaseMethod({button: 0});
			if (touchTap === 2) interactor.pointerDblClickMethod({});
		}
		touchMode = "";
		event.preventDefault();
		event.stopPropagation();
	}
	else if (event.target.id === "sage2MobileRightButton") {
		interactor.pointerReleaseMethod({button: 2});

		event.preventDefault();
		event.stopPropagation();
	}
	else {
		if (touchTap === 1) {
			handleClick(event.changedTouches[0].target);
		}
		else if (touchTap === 2) {
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

	if (event.target.id === "sage2UI") {
		if (touchMode === "translate") {
			rect   = event.target.getBoundingClientRect();
			touchX = event.touches[0].clientX - rect.left;
			touchY = event.touches[0].clientY - rect.top;
			displayUI.pointerMove(touchX, touchY);

			var dist = (touchX-touchStartX)*(touchX-touchStartX) + (touchY-touchStartY)*(touchY-touchStartY);
			if (touchHold !== null && dist > 25) {
				clearTimeout(touchHold);
				touchHold = null;
			}
		}
		else if (touchMode === "scale") {
			rect    = event.target.getBoundingClientRect();
			touch0X = event.touches[0].clientX - rect.left;
			touch0Y = event.touches[0].clientY - rect.top;
			touch1X = event.touches[1].clientX - rect.left;
			touch1Y = event.touches[1].clientY - rect.top;
			newDist = (touch1X-touch0X)*(touch1X-touch0X) + (touch1Y-touch0Y)*(touch1Y-touch0Y);
			if (Math.abs(newDist - touchDist) > 25) {
				wheelDelta = parseInt((touchDist-newDist)/256, 10);
				displayUI.pointerScroll(wheelDelta);
				touchDist = newDist;
			}
		}
		event.preventDefault();
	}
	else if (event.target.id === "sage2MobileTrackpad") {
		var trackpadTouches = [];
		for (var i=0; i<event.touches.length; i++) {
			if (event.touches[i].target.id === "sage2MobileTrackpad")
				trackpadTouches.push(event.touches[i]);
		}
		if (touchMode === "translate" || touchMode === "") {
			touchX = trackpadTouches[0].clientX;
			touchY = trackpadTouches[0].clientY;

			interactor.pointerMoveMethod({movementX: touchX-touchStartX, movementY: touchY-touchStartY});

			touchStartX = touchX;
			touchStartY = touchY;

			if (touchHold !== null) {
				clearTimeout(touchHold);
				touchHold = null;
			}
		}
		else if (touchMode === "scale") {
			touch0X = trackpadTouches[0].clientX;
			touch0Y = trackpadTouches[0].clientY;
			touch1X = trackpadTouches[1].clientX;
			touch1Y = trackpadTouches[1].clientY;
			newDist = (touch1X-touch0X)*(touch1X-touch0X) + (touch1Y-touch0Y)*(touch1Y-touch0Y);
			if (Math.abs(newDist - touchDist) > 25) {
				wheelDelta = parseInt((touchDist-newDist)/256, 10);
				interactor.pointerScrollMethod({deltaY: wheelDelta});
				touchDist = newDist;
			}
		}

		event.preventDefault();
		event.stopPropagation();
	}
	else if (event.target.id === "sage2MobileLeftButton") {
		// nothing
		event.preventDefault();
		event.stopPropagation();
	}
	else if (event.target.id === "sage2MobileRightButton") {
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
	if (parseInt(event.keyCode, 10) === 8) {
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
	if (displayUI.keyDown(parseInt(event.keyCode, 10))) {
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
	if (displayUI.keyUp(parseInt(event.keyCode, 10))) {
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

	if (displayUI.keyPress(parseInt(event.charCode, 10))) {
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
		var application = selectedAppEntry.getAttribute("application");

		wsio.emit('loadApplication', {application: application, user: interactor.uniqueID});
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
	return date.getFullYear() + "_" + pad(date.getMonth()+1, 2) + "_" + pad(date.getDate(), 2) + "_" +
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
