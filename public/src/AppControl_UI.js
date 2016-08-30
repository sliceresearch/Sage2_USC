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
var wsio;



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


/**
 * When the page loads, SAGE2 starts
 *
 */
window.addEventListener('load', function(event) {
	SAGE2_init();
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


	// Create a connection to the SAGE2 server
	wsio = new WebsocketIO();
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
			session: session
		};
		wsio.emit('addClient', clientDescription);
	});

	// socket close event (i.e. server crashed)
	wsio.on('close', function(evt) {
		// show a popup
		alert("Server offline");
	});
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
			var track = interactor.mediaStream.getTracks()[0];
			track.stop();
			// close notification
			if (note) {
				note.close();
			}
		}
	});

	wsio.on('utdConsoleMessage', function(data) {
		console.log("UTD message:" + data.message);
	});

	wsio.on('dtuRmbContextMenuContents', function(data) {
		setRmbContextMenuEntries(data);
	});

	wsio.on('csdSendDataToClient', function(data) {
		// depending on the specified func does different things.
		if (data.func === 'uiDrawSetCurrentStateAndShow') {
			uiDrawSetCurrentStateAndShow(data);
		} else if (data.func === 'uiDrawMakeLine') {
			uiDrawMakeLine(data);
		} else {
			console.log("Error, csd data packet for client contained invalid function:" + data.func);
		}
	});
}

