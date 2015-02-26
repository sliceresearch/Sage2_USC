
// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015


// <script type="text/javascript" src="src/websocket.io.js"></script>
// <script type="text/javascript" src="src/SAGE2_interaction.js"></script>
// <script type="text/javascript" src="src/SAGE2DisplayUI.js"></script>


window.URL = (window.URL || window.webkitURL || window.msURL || window.oURL);
navigator.getUserMedia   = (navigator.getUserMedia  || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock  || document.webkitExitPointerLock;

// Polyfill for 'bind' - needed for older version of iOS Safari mobile ;-(
/////////////////////////////////////////////////////////////////////////////
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
          return fToBind.apply(this instanceof fNOP && oThis
                 ? this
                 : oThis,
                 aArgs.concat(Array.prototype.slice.call(arguments)));
        };
    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();
    return fBound;
  };
}
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
var browser;

var pointerDown;
var pointerX, pointerY;

function SAGE2_init() {
	// Redirecto to HTTPS
	if(window.location.protocol === "http:") {
		var hostname = window.location.hostname;
		var port = window.location.port;
		if(port == "") port = "80";

		var xhr = new XMLHttpRequest();
		xhr.open("GET", "config", true);
		xhr.onreadystatechange = function() {
			if(xhr.readyState == 4 && xhr.status == 200){
				var json_cfg = JSON.parse(xhr.responseText);

				var https_port;
				if (json_cfg.rproxy_port !== undefined)
					https_port = ":" + json_cfg.rproxy_port.toString();
				else
					https_port = ":" + json_cfg.port.toString();
				if (https_port == ":443") https_port = "";

				window.location.replace( "https://" + window.location.hostname + https_port + window.location.pathname);
			}
		};
		xhr.send();
		
		return;
	}

	
	browser = {};
	var userAgent = window.navigator.userAgent.toLowerCase();
	console.log('agent', userAgent);
	browser.isOpera    = userAgent.indexOf("opera") >= 0;
	browser.isChrome   = userAgent.indexOf("chrome") >= 0;
	browser.isWebKit   = userAgent.indexOf("webkit") >= 0;
	browser.isSafari   = !browser.isChrome && userAgent.indexOf("safari") >= 0;
	browser.isIE       = !browser.isOpera && (userAgent.indexOf("msie") >= 0 || userAgent.indexOf("trident") >= 0);
	browser.isGecko    = !browser.isWebKit && userAgent.indexOf("gecko") >= 0;
	browser.isFirefox  = browser.isGecko && userAgent.indexOf("firefox") >= 0;
	browser.isWinPhone = userAgent.indexOf("windows phone") >= 0;
	browser.isIOS      = !browser.isWinPhone && (userAgent.indexOf("iphone") >= 0 || userAgent.indexOf("ipod") >= 0);
	browser.isAndroid  = userAgent.indexOf("android") >= 0;
	browser.isWindows  = userAgent.indexOf("windows") >= 0 || userAgent.indexOf("win32") >= 0;
	browser.isMac      = !browser.isIOS && (userAgent.indexOf("macintosh") >= 0 || userAgent.indexOf("mac os x") >= 0);
	browser.isLinux    = userAgent.indexOf("linux") >= 0;
	
	hostname = window.location.hostname;
	port = window.location.port;
	if(window.location.protocol == "http:" && port == "") port = "80";
	if(window.location.protocol == "https:" && port == "") port = "443";
	
	wsio = new websocketIO();
	wsio.open(function() {
		console.log("open websocket");
		
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
	
	wsio.on('initialize', function(data) {
		interactor.setInteractionId(data.UID);
		pointerDown = false;
		pointerX    = 0;
		pointerY    = 0;
		console.log('Pointer', pointerX, pointerY);
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
		displayUI.updateItemOrder(data.idList);
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
		while(i < data.length){
			var row = document.createElement('tr');
			var appsPerRow = Math.min(data.length - i, 6);
			for(var j=0; j<appsPerRow; j++){
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
				appIcon.src = data[i+j].exif.SAGE2thumbnail+"_256.png";
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
		if(interactor.mediaStream != null) interactor.mediaStream.stop();
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
	
	document.addEventListener('mousemove',  mouseCheck,      false);
	document.addEventListener('touchstart', touchStart,      false);
	document.addEventListener('touchend',   touchEnd,        false);
	document.addEventListener('touchmove',  touchMove,       false);
	document.addEventListener('keyup',      escapeDialog,    false);
	
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
		if(event.origin != window.location.origin) return;
		
		if(event.data.cmd === "SAGE2_desktop_capture-Loaded"){
			if(interactor !== undefined && interactor !== null)
				interactor.chromeDesktopCaptureEnabled = true;
		}
		if(event.data.cmd === "window_selected"){
			interactor.captureDesktop(event.data.mediaSourceId);
		}
	});
	
	resizeMenuUI();
	resizeDialogs();
}

function SAGE2_resize() {
	resizeMenuUI();
	resizeDialogs();
	
	if (displayUI) displayUI.resize();
}

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
	arrangement.width  = Math.floor(48 * menuScale);
	arrangement.height = Math.floor(48 * menuScale);
	var settings     = document.getElementById('settings');
	settings.width     = Math.floor(48 * menuScale);
	settings.height    = Math.floor(48 * menuScale);
	var info         = document.getElementById('info');
	info.width         = Math.floor(48 * menuScale);
	info.height        = Math.floor(48 * menuScale);
	//var webbrowser = document.getElementById('browser');
	//webbrowser.width  = Math.floor(48 * menuScale);
	//webbrowser.height = Math.floor(48 * menuScale);
	
	var uiButton = getCSSProperty("style_ui.css", ".uiButton");
	if(uiButton !== null){
		uiButton.style.width  = Math.floor(165 * menuScale) + "px";
		uiButton.style.height = Math.floor( 64 * menuScale) + "px";
	}
	var uiButtonImg = getCSSProperty("style_ui.css", ".uiButton img");
	if(uiButtonImg !== null){
		uiButtonImg.style.top  = Math.floor(8 * menuScale) + "px";
		uiButtonImg.style.left = Math.floor(8 * menuScale) + "px";
	}
	var uiButtonP = getCSSProperty("style_ui.css", ".uiButton p");
	if(uiButtonP !== null){
		uiButtonP.style.fontSize = Math.floor(12 * menuScale) + "px";
		uiButtonP.style.top  = Math.floor(20 * menuScale) + "px";
		uiButtonP.style.left = Math.floor(64 * menuScale) + "px";
	}
}

function getCSSProperty(cssFile, selector) {
	for(var i=0; i<document.styleSheets.length; i++){
		var sheet = document.styleSheets[i];
    	if(sheet.href && sheet.href.indexOf(cssFile) >= 0){
    		var rules = sheet.cssRules ? sheet.cssRules : sheet.rules;
    		if(!rules || rules.length === 0) return null;
    		for(var j=0; j<rules.length; j++){
            	if(rules[j].selectorText === selector) return rules[j];
    		}
    		break;
    	}
    }
    return null;
}

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
	if(sage2pointerHelpAspect <= windowAspect){
		sage2pointerHelp.height = window.innerHeight * 0.7;
		sage2pointerHelp.width  = sage2pointerHelp.height * sage2pointerHelpAspect;
	}
	else {
		sage2pointerHelp.width  = window.innerWidth * 0.7;
		sage2pointerHelp.height = sage2pointerHelp.width / sage2pointerHelpAspect;
	}
}

function createFileList(list, type, parent) {
	var textWidthTest = document.getElementById('textWidthTest');
	var longest = 0;
	for(var i=0; i<list[type].length; i++){
		var file = document.createElement('li');
		file.textContent = list[type][i].exif.FileName;
		file.id          = "file_" + list[type][i].exif.FileName;
		file.setAttribute("application", type2App[type]);
		file.setAttribute("file", list[type][i].exif.FileName);
		file.setAttribute("thumbnail", list[type][i].exif.SAGE2thumbnail);
		parent.appendChild(file);
		
		textWidthTest.textContent = file.textContent;
		var textWidth = (textWidthTest.clientWidth + 1);
		if(textWidth > longest) longest = textWidth;
	}
	textWidthTest.textContent = "";
	return longest;
}

function preventDefault(event) {
	event.preventDefault();
}

function fileDragEnter(event) {
	var sage2UI = document.getElementById('sage2UI');
	sage2UI.style.borderStyle = "dashed";
	displayUI.fileDrop = true;
	displayUI.draw();
}

function fileDragLeave(event) {
	var sage2UI = document.getElementById('sage2UI');
	sage2UI.style.borderStyle = "solid";
	displayUI.fileDrop = false;
	displayUI.draw();
}

function fileDrop(event) {
	event.preventDefault();
	
	var sage2UI = document.getElementById('sage2UI');
	sage2UI.style.borderStyle = "solid";
	displayUI.fileDrop = false;
	displayUI.draw();

	// trigger file upload
	console.log("drop location: " + event.layerX + ", " + event.layerY);
	var x = event.layerX / event.target.clientWidth;
	var y = event.layerY / event.target.clientHeight;
	if(event.dataTransfer.files.length > 0) {
		displayUI.fileUpload = true;
		displayUI.uploadPercent = 0;
		interactor.uploadFiles(event.dataTransfer.files, x, y);
	}
	else {
		interactor.uploadURL(event.dataTransfer.getData("Url"), x, y);
	}
}

function fileUploadProgress(percent) {
	displayUI.setUploadPercent(percent);
	displayUI.draw();
}

function fileUploadComplete() {
	setTimeout(function() {
		displayUI.fileUpload = false;
		displayUI.draw();
	}, 500);
}

// Upload a file from the UI (not drag-and-drop)
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
		console.log('Pointer', pointerX, pointerY);
		displayUI.pointerMove(mouseX, mouseY);

		// then send the click
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		displayUI.pointerPress(btn);
		event.preventDefault();
	}
}

function pointerRelease(event) {
	if(event.target.id === "sage2UI"){
		// update the position of the pointer
		var rect = event.target.getBoundingClientRect();
		var mouseX = event.clientX - rect.left;
		var mouseY = event.clientY - rect.top;
		// pointerDown used to detect the drag event
		pointerDown = false;
		pointerX    = mouseX;
		pointerY    = mouseY;
		console.log('Pointer', pointerX, pointerY);
		displayUI.pointerMove(mouseX, mouseY);

		// then send the pointer release
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		displayUI.pointerRelease(btn);
		event.preventDefault();
	}
}

function pointerMove(event) {
	// listen for keyboard events if mouse moved over sage2UI
	if(event.target.id === "sage2UI" && keyEvents === false){
		document.addEventListener('keydown',  keyDown,  false);
		document.addEventListener('keyup',    keyUp,    false);
        document.addEventListener('keypress', keyPress, false);
		keyEvents = true;
	}
	else if(event.target.id !== "sage2UI" && keyEvents === true){
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
		console.log('Pointer', pointerX, pointerY);
		// Send pointer event only during drag events
		if (pointerDown) {
			displayUI.pointerMove(mouseX, mouseY);
		}
	} else {
		// Loose focus
		pointerDown = false;
	}
}

//////////////////////////////////////////////////////////

function mouseCheck(event) {
	var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
	var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
	if (!browser.isSafari && !browser.isIE && (movementX === 0 && movementY === 0 || (Date.now() - touchTime) < 1000)) return;
	if (browser.isSafari  && browser.isIOS) return;
	if (browser.isIE      && browser.isWinPhone) return;
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
	if(uiButtonImg !== null){
		uiButtonImg.style['-webkit-transform'] = "scale(1.2)";
		uiButtonImg.style['-moz-transform'] = "scale(1.2)";
		uiButtonImg.style['transform'] = "scale(1.2)";
	}
	var uiButtonP = getCSSProperty("style_ui.css", ".uiButton p");
	if(uiButtonP !== null){
		uiButtonP.style.opacity = "0.0";
	}
}

function pointerClick(event) {
	handleClick(event.target);
}

function handleClick(element) {
	// Menu Buttons
	if(element.id === "sage2pointer"      || element.id === "sage2pointerContainer" || element.id === "sage2pointerLabel") {
		interactor.startSAGE2Pointer(element.id);
	}
	else if(element.id === "sharescreen"  || element.id === "sharescreenContainer"  || element.id === "sharescreenLabel") {
		interactor.startScreenShare();
	}
	else if(element.id === "applauncher"  || element.id === "applauncherContainer"  || element.id === "applauncherLabel") {
		wsio.emit('requestAvailableApplications');
	}
	else if(element.id === "mediabrowser" || element.id === "mediabrowserContainer" || element.id === "mediabrowserLabel") {
		wsio.emit('requestStoredFiles');
	}
	else if(element.id === "arrangement"  || element.id === "arrangementContainer"  || element.id === "arrangementLabel") {
		showDialog('arrangementDialog');
	}
	else if(element.id === "settings"     || element.id === "settingsContainer"     || element.id === "settingsLabel") {
		showDialog('settingsDialog');
	}
	else if(element.id === "browser"      || element.id === "browserContainer"      || element.id === "browserLabel") {
		showDialog('browserDialog');
	}
	else if(element.id === "info"         || element.id === "infoContainer"         || element.id === "infoLabel") {
		showDialog('infoDialog');
	}
	
	// App Launcher Dialog
	else if (element.id === "appOpenBtn") {
		loadSelectedApplication()
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
		document.getElementById('thumbnail').src = "images/blank.png";
		document.getElementById('metadata_text').textContent = "";
		hideDialog('mediaBrowserDialog');
	}
	else if (element.id === "fileCloseBtn") {
		selectedFileEntry = null;
		document.getElementById('thumbnail').src = "images/blank.png";
		document.getElementById('metadata_text').textContent = "";
		hideDialog('mediaBrowserDialog');
	}
	// Upload files to SAGE2
	else if (element.id === "fileUploadBtn") {
		// clear the preview panel
		selectedFileEntry = null;
		document.getElementById('thumbnail').src = "images/blank.png";
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
		setTimeout(function() {showDialog('localfileDialog');}, 200);			
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
		if(selectedFileEntry !== null && confirm("Are you sure you want to delete this file?")){
			var application = selectedFileEntry.getAttribute("application");
			var file = selectedFileEntry.getAttribute("file");
			wsio.emit('deleteElementFromStoredFiles', {application: application, filename: file});
			
			document.getElementById('thumbnail').src = "images/blank.png";
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
		var awin2 = window.open("help/info.html", '_blank');
		awin2.focus();
	}

	// Settings Dialog
	else if (element.id === "settingsCloseBtn") {
		hideDialog('settingsDialog');
	}
	
	// Browser Dialog
	else if (element.id === "browserOpenBtn") {
    	var url = document.getElementById("openWebpageUrl");
    	wsio.emit('openNewWebpage', {id: interactor.uniqueID, url: openWebpageUrl.value});
		hideDialog('browserDialog');
	}
	else if (element.id === "browserCloseBtn") {
		hideDialog('browserDialog');
	}
	
	// Application Selected
	else if (element.id.length > 4 && element.id.substring(0, 4) === "app_") {
		var application = element.getAttribute("application");
		
		if(selectedAppEntry !== null) selectedAppEntry.style.backgroundColor = "transparent";
		selectedAppEntry = document.getElementById('app_row_' + application);
		selectedAppEntry.style.backgroundColor = "#6C6C6C";
	}
	
	// File Selected
	else if (element.id.length > 5 && element.id.substring(0, 5) === "file_") {
		// highlight selection
		if(selectedFileEntry !== null) selectedFileEntry.style.backgroundColor = "transparent";
		selectedFileEntry = element;
		selectedFileEntry.style.backgroundColor = "#6C6C6C";
		
		// show metadata
		var metadata = document.getElementById('metadata');
		var size = Math.min(parseInt(metadata.style.width, 10), parseInt(metadata.style.height, 10)) * 0.9 - 32;
		var thumbnail = document.getElementById('thumbnail');
		thumbnail.src = selectedFileEntry.getAttribute("thumbnail")+"_256.png";
		thumbnail.width = size;
		thumbnail.height = size;
		var metadata_text = document.getElementById('metadata_text');
		metadata_text.textContent = selectedFileEntry.textContent;
	}
	
	// Arrangement Button Chosen
	else if(element.id === "clearcontent") {
		wsio.emit('clearDisplay');
		hideDialog('arrangementDialog');
	}
	else if(element.id === "tilecontent") {
		wsio.emit('tileApplications');
		hideDialog('arrangementDialog');
	}
	else if(element.id === "savesession") {
		var template = "Session " + dateToYYYYMMDDHHMMSS(new Date());
		var filename = prompt("Please enter a session name\n(Leave blank for name based on server's time)", template);
		if(filename !== null) {
			wsio.emit('saveSesion', filename);
			hideDialog('arrangementDialog');
		}
	}
	
	// Firefox Share Screen Dialog
	else if(element.id === "ffShareScreenBtn"){
		interactor.captureDesktop("screen");
		hideDialog('ffShareScreenDialog');
	}
	else if(element.id === "ffShareWindowBtn"){
		interactor.captureDesktop("window");
		hideDialog('ffShareScreenDialog');
	}
	
	// Other
	else {
		//console.log("clicked on: ", element);
	}
}

function pointerDblClick(event) {
	handleDblClick(event.target);
}

function handleDblClick(element) {
	if(element.id === "sage2UI"){
		displayUI.pointerDblClick();
		//event.preventDefault();
	}
	else if (element.id.length > 4 && element.id.substring(0, 4) === "app_") {
		loadSelectedApplication();
		hideDialog('appLauncherDialog');
	}
	else if (element.id.length > 5 && element.id.substring(0, 5) === "file_") {
		loadSelectedFile();
		document.getElementById('thumbnail').src = "images/blank.png";
		document.getElementById('metadata_text').textContent = "";
		hideDialog('mediaBrowserDialog');
	}
}

function pointerScroll(event) {
	if(event.target.id === "sage2UI"){
		displayUI.pointerScroll(event.deltaY);
		event.preventDefault();
	}
}

function touchStart(event) {
	if(event.touches.length === 1){
		touchTime = Date.now();
	}

	if(event.target.id === "sage2UI") {
		if(event.touches.length === 1){
			var rect = event.target.getBoundingClientRect();
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
		else if(event.touches.length === 2) {
			var rect = event.target.getBoundingClientRect();
			var touch0X = event.touches[0].clientX - rect.left;
			var touch0Y = event.touches[0].clientY - rect.top;
			var touch1X = event.touches[1].clientX - rect.left;
			var touch1Y = event.touches[1].clientY - rect.top;
			var touchX = parseInt((touch0X+touch1X)/2, 10);
			var touchY = parseInt((touch0Y+touch1Y)/2, 10);
			displayUI.pointerRelease("left");
			displayUI.pointerMove(touchX, touchY);
			touchDist = (touch1X-touch0X)*(touch1X-touch0X) + (touch1Y-touch0Y)*(touch1Y-touch0Y);
			if(touchHold !== null) {
				clearTimeout(touchHold);
				touchHold = null;
			}
			touchMode = "scale";
		}
		else {
			if(touchHold !== null) {
				clearTimeout(touchHold);
				touchHold = null;
			}
			touchMode = "";
		}
		event.preventDefault();
		event.stopPropagation();
	}
	else if(event.target.id === "sage2MobileTrackpad") {
		var trackpadTouches = [];
		for(var i=0; i<event.touches.length; i++){
			if(event.touches[i].target.id === "sage2MobileTrackpad")
				trackpadTouches.push(event.touches[i]);
		}
		if(trackpadTouches.length === 1) {
			touchStartX = trackpadTouches[0].clientX;
			touchStartY = trackpadTouches[0].clientY;
		}
		else if(trackpadTouches.length === 2) {
			var touch0X = trackpadTouches[0].clientX;
			var touch0Y = trackpadTouches[0].clientY;
			var touch1X = trackpadTouches[1].clientX;
			var touch1Y = trackpadTouches[1].clientY;
			touchDist = (touch1X-touch0X)*(touch1X-touch0X) + (touch1Y-touch0Y)*(touch1Y-touch0Y);
			
			interactor.pointerReleaseMethod({button: 0});
			touchMode = "scale";
		}
	}
	else if(event.target.id === "sage2MobileLeftButton") {
		interactor.pointerPressMethod({button: 0});
		touchMode = "translate";
		touchHold = setTimeout(function() {
			interactor.pointerKeyDownMethod({keyCode: 8});
			interactor.pointerKeyUpMethod({keyCode: 8});
		}, 1500);
		
		event.preventDefault();
		event.stopPropagation();
	}
	else if(event.target.id === "sage2MobileRightButton") {
		interactor.pointerPressMethod({button: 2});
		
		event.preventDefault();
		event.stopPropagation();
	}
	else {
		event.stopPropagation();
	}
}

function touchEnd(event) {
	var now = Date.now();
	if((now-touchTapTime) > 500) { touchTap = 0;                     }
	if((now-touchTime)    < 250) { touchTap++;   touchTapTime = now; }
	else                         { touchTap = 0; touchTapTime = 0;   }

	if(event.target.id === "sage2UI"){
		if(touchMode === "translate") {
			displayUI.pointerRelease("left");
			if(touchTap === 2) displayUI.pointerDblClick();
		}
		touchMode = "";
		event.preventDefault();
		event.stopPropagation();
	}
	else if(event.target.id === "sage2MobileTrackpad") {
		if(touchMode === "scale") touchMode = "";
		event.preventDefault();
		event.stopPropagation();
	}
	else if(event.target.id === "sage2MobileLeftButton") {
		if(touchMode === "translate") {
			interactor.pointerReleaseMethod({button: 0});
			if(touchTap === 2) interactor.pointerDblClickMethod({});
		}
		touchMode = "";
		event.preventDefault();
		event.stopPropagation();
	}
	else if(event.target.id === "sage2MobileRightButton") {
		interactor.pointerReleaseMethod({button: 2});
		
		event.preventDefault();
		event.stopPropagation();
	}
	else {
		if(touchTap === 1) {
			handleClick(event.changedTouches[0].target);
		}
		else if(touchTap === 2) {
			handleDblClick(event.changedTouches[0].target);
		}
		event.stopPropagation();
	}
	if(touchHold !== null) {
		clearTimeout(touchHold);
		touchHold = null;
	}
	
}

function touchMove(event) {
	if(event.target.id === "sage2UI"){
		if(touchMode === "translate") {
			var rect = event.target.getBoundingClientRect();
			var touchX = event.touches[0].clientX - rect.left;
			var touchY = event.touches[0].clientY - rect.top;
			displayUI.pointerMove(touchX, touchY);
			
			var dist = (touchX-touchStartX)*(touchX-touchStartX) + (touchY-touchStartY)*(touchY-touchStartY);
			if(touchHold !== null && dist > 25) {
				clearTimeout(touchHold);
				touchHold = null;
			}
		}
		else if(touchMode === "scale") {
			var rect = event.target.getBoundingClientRect();
			var touch0X = event.touches[0].clientX - rect.left;
			var touch0Y = event.touches[0].clientY - rect.top;
			var touch1X = event.touches[1].clientX - rect.left;
			var touch1Y = event.touches[1].clientY - rect.top;
			var newDist = (touch1X-touch0X)*(touch1X-touch0X) + (touch1Y-touch0Y)*(touch1Y-touch0Y);
			if(Math.abs(newDist - touchDist) > 25){
				var wheelDelta = parseInt((touchDist-newDist)/256, 10);
				displayUI.pointerScroll(wheelDelta);
				touchDist = newDist;
			}
		}
		event.preventDefault();
	}
	else if(event.target.id === "sage2MobileTrackpad") {
		var trackpadTouches = [];
		for(var i=0; i<event.touches.length; i++){
			if(event.touches[i].target.id === "sage2MobileTrackpad")
				trackpadTouches.push(event.touches[i]);
		}
		if(touchMode === "translate" || touchMode === "") {
			var touchX = trackpadTouches[0].clientX;
			var touchY = trackpadTouches[0].clientY;
			
			interactor.pointerMoveMethod({movementX: touchX-touchStartX, movementY: touchY-touchStartY});
			
			touchStartX = touchX;
			touchStartY = touchY;
			
			if(touchHold !== null) {
				clearTimeout(touchHold);
				touchHold = null;
			}
		}
		else if(touchMode === "scale") {
			var touch0X = trackpadTouches[0].clientX;
			var touch0Y = trackpadTouches[0].clientY;
			var touch1X = trackpadTouches[1].clientX;
			var touch1Y = trackpadTouches[1].clientY;
			var newDist = (touch1X-touch0X)*(touch1X-touch0X) + (touch1Y-touch0Y)*(touch1Y-touch0Y);
			if(Math.abs(newDist - touchDist) > 25){
				var wheelDelta = parseInt((touchDist-newDist)/256, 10);
				interactor.pointerScrollMethod({deltaY: wheelDelta});
				touchDist = newDist;
			}
		}
		
		event.preventDefault();
		event.stopPropagation();
	}
	else if(event.target.id === "sage2MobileLeftButton") {
		// nothing
		event.preventDefault();
		event.stopPropagation();
	}
	else if(event.target.id === "sage2MobileRightButton") {
		// nothing
		event.preventDefault();
		event.stopPropagation();
	}
}

function escapeDialog(event) {
	if(parseInt(event.keyCode, 10) === 27 && openDialog !== null){
		hideDialog(openDialog);
		event.preventDefault();
	}
}

function keyDown(event) {
	if(displayUI.keyDown(parseInt(event.keyCode, 10))){
		event.preventDefault();
	}
}

function keyUp(event) {
	if(displayUI.keyUp(parseInt(event.keyCode, 10))){
		event.preventDefault();
	}
}

function keyPress(event) {
	// space bar activates the pointer
	if (event.keyCode === 32) {
		interactor.startSAGE2Pointer("sage2pointer");
		console.log('Sending Pointer', pointerX, pointerY);
		displayUI.pointerMove(pointerX, pointerY);
	}

	if(displayUI.keyPress(parseInt(event.charCode, 10))){
		event.preventDefault();
	}
}

function loadSelectedApplication() {
	if(selectedAppEntry !== null) {
		var application = selectedAppEntry.getAttribute("application");
		
		wsio.emit('loadApplication', {application: application, user: interactor.uniqueID});
	}
}

function loadSelectedFile() {
	if(selectedFileEntry !== null) {
		var application = selectedFileEntry.getAttribute("application");
		var file = selectedFileEntry.getAttribute("file");
		
		wsio.emit('loadFileFromServer', {application: application, filename: file, user: interactor.uniqueID});
	}
}

function showDialog(id) {
	openDialog = id;
	document.getElementById('blackoverlay').style.display = "block";
	document.getElementById(id).style.display = "block";
}

function hideDialog(id) {
	openDialog = null;
	document.getElementById('blackoverlay').style.display = "none";
	document.getElementById(id).style.display = "none";
}

function showSAGE2PointerOverlayNoMouse() {
	document.getElementById('sage2MobileContainer').style.display = "block";
}

function hideSAGE2PointerOverlayNoMouse() {
	document.getElementById('sage2MobileContainer').style.display = "none";
}

function sagePointerEnabled() {
	// show SAGE2 Pointer dialog
	showDialog('sage2pointerDialog');
}

function sagePointerDisabled() {
	// hide SAGE2 Pointer dialog
	hideDialog('sage2pointerDialog');
}

function removeAllChildren(node) {
	while (node.lastChild) {
		node.removeChild(node.lastChild);
	}
}

function pad(n, width, z) {
	z = z || '0';
	n = n.toString();
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function dateToYYYYMMDDHHMMSS(date) {
	return date.getFullYear() + "-" + pad(date.getMonth()+1, 2) + "-" + pad(date.getDate(), 2) + " " + 
			pad(date.getHours(),2) + ":" + pad(date.getMinutes(),2) + ":" + pad(date.getSeconds(),2);
}

function reloadIfServerRunning(callback) {
	xhr = new XMLHttpRequest();
	xhr.open("GET", "/", true);
	xhr.onreadystatechange = function() {
		if(xhr.readyState == 4 && xhr.status == 200){
			console.log("server ready");
			// when server ready, callback
			callback();
			// and reload the page
			window.location.reload();
		}
	};
	xhr.send();
}

