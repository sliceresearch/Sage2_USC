// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-15

/* global ignoreFields, hostAlias, SAGE2WidgetControlInstance */
/* global makeSvgBackgroundForWidgetConnectors, addStyleElementForTitleColor */
/* global removeStyleElementForTitleColor */
/* global clearConnectorColor, moveWidgetToAppConnector */
/* global showWidgetToAppConnectors, getWidgetControlInstanceById */
/* global mapMoveToSlider, getPropertyHandle */
/* global insertTextIntoTextInputWidget, removeWidgetToAppConnector */
/* global hideWidgetToAppConnectors */
/* global createWidgetToAppConnector, getTextFromTextInputWidget */
/* global SAGE2_Partition, require */

/* global require */

"use strict";

/**
 * SAGE2 Display, client side rendering
 *
 * @module client
 * @submodule SAGE2_Display
 * @class SAGE2_Display
 */

window.URL = (window.URL || window.webkitURL || window.msURL || window.oURL);

var clientID;
var wsio;

var isMaster;
var hostAlias = {};

var itemCount = 20;
var controlItems   = {};
var controlObjects = {};
var lockedControlElements = {};
var widgetConnectorRequestList = {};

var applications = {};
var partitions = {};
var dependencies = {};
var dataSharingPortals = {};

// Maintain the file list available on the server
var storedFileList = null;
var storedFileListEventHandlers = [];

// UI object to build the element on the wall
var ui;
var uiTimer = null;
var uiTimerDelay;

// Global variables for screenshot functionality
var makingScreenshotDialog = null;

// Explicitely close web socket when web browser is closed
window.onbeforeunload = function() {
	if (wsio !== undefined) {
		wsio.close();
	}
};

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

/**
 * setupFocusHandlers
 *
 * @method setupFocusHandlers
 */
function setupFocusHandlers() {
	window.addEventListener("focus", function(evt) {
		if (window.__SAGE2__ && __SAGE2__.browser.isMobile) {
			location.reload();
		}
	}, false);
	window.addEventListener("blur", function(evt) {
		if (window.__SAGE2__ && __SAGE2__.browser.isMobile) {
			if (wsio !== undefined) {
				setTimeout(function() {
					wsio.close();
				}, 200);
				document.getElementById('background').style.display = 'none';
			}
		}
	}, false);

	// Get Browser Prefix
	var prefix   = getBrowserPrefix();
	var hidden   = hiddenProperty(prefix);
	// var visState = visibilityState(prefix);
	var visEvent = visibilityEvent(prefix);

	document.addEventListener(visEvent, function(event) {
		if (window.__SAGE2__ && __SAGE2__.browser.isMobile) {
			if (document[hidden]) {
				setTimeout(function() {
					wsio.close();
				}, 200);
				document.getElementById('background').style.display = 'none';
			} else {
				location.reload();
			}
		}
	});

	if (__SAGE2__.browser.isElectron) {
		// Display warning messages from the 'Main' Electron process
		require('electron').ipcRenderer.on('warning', function(event, message) {
			var problemDialog = ui.buildMessageBox('problemDialog', message);
			ui.main.appendChild(problemDialog);
			document.getElementById('problemDialog').style.display = "block";
			// close the warning after 2.5 second
			setTimeout(function() {
				deleteElement('problemDialog');
			}, 2500);
		});
	}
}

/**
 * Add a stored file list event handler
 *
 * @method addStoredFileListEventHandler
 */
function addStoredFileListEventHandler(callback) {
	// Register the event handler and call it if we already have a stored file list available
	storedFileListEventHandlers.push(callback);
	if (storedFileList) {
		callback(storedFileList);
	}
}

/**
 * Remove a stored file list event handler
 *
 * @method removeStoredFileListEventHandler
 */
function removeStoredFileListEventHandler(callback) {
	var index = storedFileListEventHandlers.indexOf(callback);
	if (index > -1) {
		storedFileListEventHandlers.splice(index, 1);
	}
}


/**
 * Idle function, show and hide the UI, triggered at uiTimerDelay sec delay
 *
 * @method resetIdle
 */
function resetIdle() {
	if (uiTimer) {
		clearTimeout(uiTimer);
		ui.showInterface();
		uiTimer = setTimeout(function() {
			ui.hideInterface();
		}, uiTimerDelay * 1000);
	}
}

/**
 * Entry point of the application
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	clientID = parseInt(getParameterByName("clientID")) || 0;
	console.log("clientID: " + clientID);

	wsio = new WebsocketIO();
	console.log("Connected to server: ", window.location.origin);

	// Detect the current browser
	SAGE2_browser();

	// Setup focus events
	setupFocusHandlers();

	isMaster = false;

	wsio.open(function() {
		console.log("Websocket opened");

		setupListeners();

		// Get the cookie for the session, if there's one
		var session = getCookie("session");

		var clientDescription = {
			clientType: "display",
			clientID: clientID,
			requests: {
				config: true,
				version: true,
				time: true,
				console: false
			},
			browser: __SAGE2__.browser,
			session: session
		};
		wsio.emit('addClient', clientDescription);
	});

	// Socket close event (ie server crashed)
	wsio.on('close', function(evt) {
		if (ui) {
			ui.showError();
		}
		var refresh = setInterval(function() {
			// make a dummy request to test the server every 2 sec
			var xhr = new XMLHttpRequest();
			xhr.open("GET", "/", true);
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4 && xhr.status === 200) {
					console.log("server ready");
					// when server ready, clear the interval callback
					clearInterval(refresh);
					// and reload the page
					window.location.reload();
				}
			};
			xhr.send();
		}, 2000);
	});
}

function setupListeners() {
	wsio.on('initialize', function(data) {
		var startTime  = new Date(data.start);

		// Global initialization
		SAGE2_initialize(startTime);

		// Request list of assets
		wsio.emit('requestStoredFiles');
	});

	wsio.on('setAsMasterDisplay', function() {
		isMaster = true;
	});

	wsio.on('broadcast', function(data) {
		var app = applications[data.app];
		if (app === undefined) {
			// should have better way to determine if app is loaded
			//   or already killed
			setTimeout(function() {
				if (app && app[data.func]) {
					// Send the call to the application
					app.callback(data.func, data.data);
				}
			}, 500);
		} else {
			// Send the call to the application
			app.callback(data.func, data.data);
		}
	});

	wsio.on('addScript', function(script_data) {
		var js = document.createElement('script');
		js.type = "text/javascript";
		js.src = script_data.source;
		document.head.appendChild(js);
	});



	wsio.on('setupDisplayConfiguration', function(json_cfg) {
		var i;
		var http_port;
		var https_port;

		http_port = json_cfg.port === 80 ? "" : ":" + json_cfg.port;
		https_port = json_cfg.secure_port === 443 ? "" : ":" + json_cfg.secure_port;
		hostAlias["http://"  + json_cfg.host + http_port]  = window.location.origin;
		hostAlias["https://" + json_cfg.host + https_port] = window.location.origin;
		for (i = 0; i < json_cfg.alternate_hosts.length; i++) {
			hostAlias["http://"  + json_cfg.alternate_hosts[i] + http_port]  = window.location.origin;
			hostAlias["https://" + json_cfg.alternate_hosts[i] + https_port] = window.location.origin;
		}

		// Build the elements visible on the wall
		ui = new UIBuilder(json_cfg, clientID);
		ui.build();
		ui.background();
		if (json_cfg.ui.auto_hide_ui) {
			// default delay is 30s if not specified
			uiTimerDelay = json_cfg.ui.auto_hide_delay ? parseInt(json_cfg.ui.auto_hide_delay, 10) : 30;
			uiTimer = setTimeout(function() {
				ui.hideInterface();
			}, uiTimerDelay * 1000);
		}
		makeSvgBackgroundForWidgetConnectors(ui.main.style.width, ui.main.style.height);
	});

	wsio.on('hideui', function(param) {
		if (param) {
			clearTimeout(uiTimer);
			ui.showInterface();
			uiTimerDelay = param.delay;
			uiTimer = setTimeout(function() {
				ui.hideInterface();
			}, uiTimerDelay * 1000);
		} else {
			if (ui.uiHidden === true) {
				clearTimeout(uiTimer);
				uiTimer = null;
				ui.showInterface();
			} else {
				ui.hideInterface();
			}
		}
	});

	wsio.on('setupSAGE2Version', function(version) {
		ui.updateVersionText(version);
	});

	wsio.on('setSystemTime', function(data) {
		var m = moment(data.date);
		var local = new Date();
		var offset = local.getTimezoneOffset() - data.offset;
		m.add(offset, 'minutes');
		ui.setTime(m);
	});

	wsio.on('addRemoteSite', function(data) {
		ui.addRemoteSite(data);
	});

	wsio.on('toggleHelp', function(data) {
		ui.toggleHelp();
	});

	wsio.on('connectedToRemoteSite', function(data) {
		if (window.ui) {
			ui.connectedToRemoteSite(data);
		} else {
			setTimeout(function() {
				ui.connectedToRemoteSite(data);
			}, 1000);
		}
	});

	wsio.on('drawingInit', function(data) {
		ui.drawingInit(data);
	});

	wsio.on('drawingUpdate', function(data) {
		ui.updateObject(data);
	});

	wsio.on('drawingRemove', function(data) {
		ui.removeObject(data);
	});

	wsio.on('createSagePointer', function(pointer_data) {
		if (window.ui) {
			ui.createSagePointer(pointer_data);
		} else {
			setTimeout(function() {
				ui.createSagePointer(pointer_data);
			}, 1000);
		}
	});

	wsio.on('showSagePointer', function(pointer_data) {
		ui.showSagePointer(pointer_data);
		resetIdle();
		var uniqueID = pointer_data.id.slice(0, pointer_data.id.lastIndexOf("_"));
		var re = /\.|:/g;
		var stlyeCaption = uniqueID.split(re).join("");
		addStyleElementForTitleColor(stlyeCaption, pointer_data.color);
	});

	wsio.on('hideSagePointer', function(pointer_data) {
		ui.hideSagePointer(pointer_data);
		var uniqueID = pointer_data.id.slice(0, pointer_data.id.lastIndexOf("_"));
		var re = /\.|:/g;
		var stlyeCaption = uniqueID.split(re).join("");
		removeStyleElementForTitleColor(stlyeCaption, pointer_data.color);
	});

	wsio.on('updateSagePointerPosition', function(pointer_data) {
		if (ui) {
			ui.updateSagePointerPosition(pointer_data);
		}
		resetIdle();
	});

	wsio.on('changeSagePointerMode', function(pointer_data) {
		ui.changeSagePointerMode(pointer_data);
		resetIdle();
	});

	wsio.on('createRadialMenu', function(menu_data) {
		ui.createRadialMenu(menu_data);
	});

	wsio.on('updateRadialMenu', function(menu_data) {
		ui.updateRadialMenu(menu_data);
	});

	wsio.on('updateRadialMenuPosition', function(menu_data) {
		ui.updateRadialMenuPosition(menu_data);
	});

	wsio.on('radialMenuEvent', function(menu_data) {
		ui.radialMenuEvent(menu_data);
		resetIdle();
	});

	wsio.on('updateRadialMenuDocs', function(menu_data) {
		ui.updateRadialMenuDocs(menu_data);
		resetIdle();
	});

	wsio.on('updateRadialMenuApps', function(menu_data) {
		ui.updateRadialMenuApps(menu_data);
		resetIdle();
	});

	wsio.on('loadApplicationState', function(data) {
		var app = applications[data.id];
		if (app !== undefined && app !== null) {
			app.SAGE2Load(data.state, new Date(data.date));
		}
	});

	wsio.on('loadApplicationOptions', function(data) {
		var fullSync = true;
		var windowTitle = document.getElementById(data.id + "_title");
		var windowIconSync = document.getElementById(data.id + "_iconSync");
		var windowIconUnSync = document.getElementById(data.id + "_iconUnSync");
		var app = applications[data.id];
		if (app !== undefined && app !== null) {
			app.SAGE2LoadOptions(data.options);

			if (fullSync === true) {
				if (data.options[Object.keys(data.options)[0]]._sync === true) {
					windowTitle.style.backgroundColor = "#39C4A6";
					windowIconSync.style.display = "block";
					windowIconUnSync.style.display = "none";
				} else {
					windowTitle.style.backgroundColor = "#666666";
					windowIconSync.style.display = "none";
					windowIconUnSync.style.display = "block";
				}
			}
		}
	});

	wsio.on('storedFileList', function(data) {
		// Save the cached stored file list and update all the listeners
		storedFileList = data;
		for (var i = 0; i < storedFileListEventHandlers.length; i++) {
			storedFileListEventHandlers[i](storedFileList);
		}
	});

	wsio.on('updateMediaStreamFrame', function(data) {
		wsio.emit('receivedMediaStreamFrame', {id: data.id});

		var app = applications[data.id];
		if (app !== undefined && app !== null) {
			app.SAGE2Load(data.state, new Date(data.date));
		}

		// update clones in data-sharing portals
		var key;
		for (key in dataSharingPortals) {
			app = applications[data.id + "_" + key];
			if (app !== undefined && app !== null) {
				app.SAGE2Load(data.state, new Date(data.date));
			}
		}
	});

	wsio.on('updateMediaBlockStreamFrame', function(data) {
		var appId     = byteBufferToString(data);
		var blockIdx  = byteBufferToInt(data.subarray(appId.length + 1, appId.length + 3));
		var date      = byteBufferToInt(data.subarray(appId.length + 3, appId.length + 11));
		var yuvBuffer = data.subarray(appId.length + 11, data.length);

		if (applications[appId] !== undefined && applications[appId] !== null) {
			applications[appId].textureData(blockIdx, yuvBuffer);
			if (applications[appId].receivedBlocks.every(isTrue) === true) {
				applications[appId].refresh(new Date(date));
				applications[appId].setValidBlocksFalse();
				wsio.emit('receivedMediaBlockStreamFrame', {id: appId});
			}
		}
	});

	wsio.on('updateVideoFrame', function(data) {
		var appId     = byteBufferToString(data);
		var blockIdx  = byteBufferToInt(data.subarray(appId.length + 1, appId.length + 3));
		var date      = byteBufferToInt(data.subarray(appId.length + 7, appId.length + 15));
		var yuvBuffer = data.subarray(appId.length + 15, data.length);

		if (applications[appId] !== undefined && applications[appId] !== null) {
			applications[appId].textureData(blockIdx, yuvBuffer);
			if (applications[appId].receivedBlocks.every(isTrue) === true) {
				applications[appId].refresh(new Date(date));
				applications[appId].setValidBlocksFalse();
				wsio.emit('requestVideoFrame', {id: appId});
			}
		}
	});

	wsio.on('updateFrameIndex', function(data) {
		var app = applications[data.id];
		if (app !== undefined && app !== null) {
			app.setVideoFrame(data.frameIdx);
		}
	});

	wsio.on('videoEnded', function(data) {
		var app = applications[data.id];
		if (app !== undefined && app !== null) {
			app.videoEnded();
		}
	});

	wsio.on('updateValidStreamBlocks', function(data) {
		if (applications[data.id] !== undefined && applications[data.id] !== null) {
			applications[data.id].validBlocks = data.blockList;
			applications[data.id].setValidBlocksFalse();
		}
	});

	wsio.on('updateWebpageStreamFrame', function(data) {
		wsio.emit('receivedWebpageStreamFrame', {id: data.id, client: clientID});

		var webpage = document.getElementById(data.id + "_webpage");
		webpage.src = "data:image/jpeg;base64," + data.src;
	});

	wsio.on('createAppWindow', function(data) {
		createAppWindow(data, ui.main.id, ui.titleBarHeight, ui.titleTextSize, ui.offsetX, ui.offsetY);
	});


	/* Partition wsio calls */
	wsio.on('createPartitionWindow', function(data) {
		partitions[data.id] = new SAGE2_Partition(data);
	});
	wsio.on('deletePartitionWindow', function(data) {
		partitions[data.id].deletePartition();
		delete partitions[data.id];
	});
	wsio.on('partitionMoveAndResizeFinished', function(data) {
		partitions[data.id].updatePositionAndSize(data);
	});
	wsio.on('partitionWindowTitleUpdate', function(data) {
		partitions[data.id].updateTitle(data.title);
	});
	wsio.on('updatePartitionBorders', function(data) {
		if (data && partitions.hasOwnProperty(data.id)) {
			partitions[data.id].updateSelected(data.highlight);
		} else {
			for (var p in partitions) {
				// console.log(p);
				partitions[p].updateSelected(false);
			}
		}
	});

	wsio.on('createAppWindowInDataSharingPortal', function(data) {
		var portal = dataSharingPortals[data.portal];

		createAppWindow(data.application, portal.id, portal.titleBarHeight, portal.titleTextSize, 0, 0);
	});

	wsio.on('deleteElement', function(elem_data) {
		resetIdle();

		// Tell the application it is over
		var app = applications[elem_data.elemId];
		app.terminate();

		// Remove the app from the list
		delete applications[elem_data.elemId];

		// Clean up the DOM
		var deleteElemTitle = document.getElementById(elem_data.elemId + "_title");
		var deleteElem = document.getElementById(elem_data.elemId);

		// Set the CSS for fading out
		deleteElem.classList.add('windowDisappear');

		// Delete the titlebar
		deleteElemTitle.parentNode.removeChild(deleteElemTitle);

		// When fade over, really delete the element
		setTimeout(function() {
			deleteElem.parentNode.removeChild(deleteElem);
		}, 400);

		// Clean up the UI DOM
		if (elem_data.elemId in controlObjects) {
			for (var item in controlItems) {
				if (item.indexOf(elem_data.elemId) > -1) {
					controlItems[item].divHandle.parentNode.removeChild(controlItems[item].divHandle);
					removeWidgetToAppConnector(item);
					delete controlItems[item];
				}

			}
			delete controlObjects[elem_data.elemId];
		}
	});

	wsio.on('hideControl', function(ctrl_data) {
		if (ctrl_data.id in controlItems && controlItems[ctrl_data.id].show === true) {
			controlItems[ctrl_data.id].divHandle.style.display = "none";
			controlItems[ctrl_data.id].show = false;
			clearConnectorColor(ctrl_data.id, ctrl_data.appId);
		}
	});

	wsio.on('showControl', function(ctrl_data) {
		if (ctrl_data.id in controlItems && controlItems[ctrl_data.id].show === false) {
			controlItems[ctrl_data.id].divHandle.style.display = "block";
			controlItems[ctrl_data.id].show = true;
		}
	});

	wsio.on('updateItemOrder', function(order) {
		resetIdle();
		var key;
		for (key in order) {
			var selectedElemTitle = document.getElementById(key + "_title");
			var selectedElem = document.getElementById(key);
			var selectedElemOverlay = document.getElementById(key + "_overlay");

			if (selectedElemTitle) {
				selectedElemTitle.style.zIndex = order[key].toString();
			}
			if (selectedElem) {
				selectedElem.style.zIndex = order[key].toString();
			}
			if (selectedElemOverlay) {
				selectedElemOverlay.style.zIndex = order[key].toString();
			}
		}
	});

	wsio.on('hoverOverItemCorner', function(elem_data) {
		var selectedElem = document.getElementById(elem_data.elemId);
		if (selectedElem) {
			var dragCorner   = selectedElem.getElementsByClassName("dragCorner");
			if (elem_data.flag) {
				dragCorner[0].style.backgroundColor = "rgba(255,255,255,0.7)";
				dragCorner[0].style.border = "2px solid #333333";
			} else {
				dragCorner[0].style.backgroundColor = "rgba(255,255,255,0.0)";
				dragCorner[0].style.border = "none";
			}
		}
	});

	wsio.on('setItemPosition', function(position_data) {
		resetIdle();

		if (position_data.elemId.split("_")[0] === "portal") {
			dataSharingPortals[position_data.elemId].setPosition(position_data.elemLeft, position_data.elemTop);
			return;
		}

		if (position_data.elemAnimate) {
			moveItemWithAnimation(position_data);
		} else {
			var translate = "translate(" + position_data.elemLeft + "px," + position_data.elemTop + "px)";
			var selectedElemTitle = document.getElementById(position_data.elemId + "_title");
			selectedElemTitle.style.webkitTransform = translate;
			selectedElemTitle.style.mozTransform    = translate;
			selectedElemTitle.style.transform       = translate;

			var selectedElem = document.getElementById(position_data.elemId);
			selectedElem.style.webkitTransform = translate;
			selectedElem.style.mozTransform    = translate;
			selectedElem.style.transform       = translate;
		}


		var app = applications[position_data.elemId];
		if (app !== undefined) {
			var parentTransform = getTransform(selectedElem.parentNode);
			var border = parseInt(selectedElem.parentNode.style.borderWidth || 0, 10);
			app.sage2_x = (position_data.elemLeft + border + 1) * parentTransform.scale.x + parentTransform.translate.x;
			app.sage2_x = Math.round(app.sage2_x);
			app.sage2_y = (position_data.elemTop + ui.titleBarHeight + border) * parentTransform.scale.y
				+ parentTransform.translate.y;
			app.sage2_y = Math.round(app.sage2_y);
			app.sage2_width  = parseInt(position_data.elemWidth, 10) * parentTransform.scale.x;
			app.sage2_height = parseInt(position_data.elemHeight, 10) * parentTransform.scale.y;

			var date  = new Date(position_data.date);
			if (position_data.force || app.moveEvents === "continuous") {
				app.move(date);
			}
		}
		if (position_data.elemId in controlObjects) {
			var hOffset = (ui.titleBarHeight + position_data.elemHeight) / 2;
			for (var item in controlItems) {
				if (controlItems.hasOwnProperty(item) && item.indexOf(position_data.elemId) > -1 && controlItems[item].show) {
					var control = controlItems[item].divHandle;
					var cLeft = parseInt(control.style.left);
					var cTop = parseInt(control.style.top);
					var cHeight = parseInt(control.style.height);
					moveWidgetToAppConnector(item, cLeft + cHeight / 2.0, cTop + cHeight / 2.0,
						position_data.elemLeft - ui.offsetX + position_data.elemWidth / 2.0,
						position_data.elemTop - ui.offsetY + hOffset, cHeight / 2.4);
				}
			}
		}

	});

	wsio.on('setControlPosition', function(position_data) {
		var eLeft = position_data.elemLeft - ui.offsetX;
		var eTop = position_data.elemTop - ui.offsetY;
		var selectedControl = document.getElementById(position_data.elemId);
		var appData = position_data.appData;
		if (selectedControl !== undefined && selectedControl !== null) {
			selectedControl.style.left = eLeft.toString() + "px";
			selectedControl.style.top = eTop.toString() + "px";
			var hOffset = (ui.titleBarHeight + appData.height) / 2;
			moveWidgetToAppConnector(position_data.elemId,
				eLeft + position_data.elemHeight / 2.0,
				eTop + position_data.elemHeight / 2.0,
				appData.left - ui.offsetX + appData.width / 2.0,
				appData.top - ui.offsetY + hOffset,
				position_data.elemHeight / 2.4);
		} else {
			console.log("cannot find control: " + position_data.elemId);
		}
	});

	wsio.on('showWidgetToAppConnector', function(data) {
		showWidgetToAppConnectors(data);
		if (data.user_color !== null) {
			if (!(data.id in widgetConnectorRequestList)) {
				widgetConnectorRequestList[data.id] = [];
			}
			widgetConnectorRequestList[data.id].push(data);
		}
	});


	wsio.on('hideWidgetToAppConnector', function(control_data) {
		if (control_data.id in widgetConnectorRequestList) {
			var lst = widgetConnectorRequestList[control_data.id];
			if (lst.length > 1) {
				var len = lst.length;
				for (var i = len - 1; i >= 0; i--) {
					if (control_data.user_id === lst[i].user_id) {
						lst.splice(i, 1);
						showWidgetToAppConnectors(lst[len - 2]);
						break;
					}
				}
			} else if (lst.length === 1) {
				delete widgetConnectorRequestList[control_data.id];
				hideWidgetToAppConnectors(control_data.id);
			}
		}

	});

	wsio.on('setItemPositionAndSize', function(position_data) {
		resetIdle();

		if (position_data.elemId.split("_")[0] === "portal") {
			dataSharingPortals[position_data.elemId].setPositionAndSize(position_data.elemLeft,
				position_data.elemTop, position_data.elemWidth, position_data.elemHeight);
			return;
		}
		var selectedElem = document.getElementById(position_data.elemId);
		var child        = selectedElem.getElementsByClassName("sageItem");
		// If application not ready, return
		if (child.length < 1) {
			return;
		}

		var translate = "translate(" + position_data.elemLeft + "px," + position_data.elemTop + "px)";
		var selectedElemTitle = document.getElementById(position_data.elemId + "_title");
		selectedElemTitle.style.width = Math.round(position_data.elemWidth).toString() + "px";

		if (position_data.elemId.split("_")[0] === "portal") {
			dataSharingPortals[position_data.elemId].setPosition(position_data.elemLeft, position_data.elemTop);
			return;
		}

		if (position_data.elemAnimate) {
			moveItemWithAnimation(position_data);
		} else {
			selectedElemTitle.style.webkitTransform = translate;
			selectedElemTitle.style.mozTransform    = translate;
			selectedElemTitle.style.transform       = translate;

			selectedElem.style.webkitTransform = translate;
			selectedElem.style.mozTransform    = translate;
			selectedElem.style.transform       = translate;

		}

		selectedElemTitle.style.width = Math.round(position_data.elemWidth).toString() + "px";

		var selectedElemState = document.getElementById(position_data.elemId + "_state");
		selectedElemState.style.width = Math.round(position_data.elemWidth).toString() + "px";
		selectedElemState.style.height = Math.round(position_data.elemHeight).toString() + "px";

		var dragCorner = selectedElem.getElementsByClassName("dragCorner");
		var cornerSize = Math.min(position_data.elemWidth, position_data.elemHeight) / 5;
		dragCorner[0].style.width  = cornerSize.toString() + "px";
		dragCorner[0].style.height = cornerSize.toString() + "px";
		dragCorner[0].style.top    = (Math.round(position_data.elemHeight) - cornerSize).toString() + "px";
		dragCorner[0].style.left   = (Math.round(position_data.elemWidth) - cornerSize).toString()  + "px";

		// if the element is a div or iframe, resize should use the style object
		if (child[0].tagName.toLowerCase() === "div" ||
			child[0].tagName.toLowerCase() === "iframe" ||
			child[0].tagName.toLowerCase() === "webview") {
			child[0].style.width  = Math.round(position_data.elemWidth)  + "px";
			child[0].style.height = Math.round(position_data.elemHeight) + "px";
		} else {
			// if it's a canvas or else, just use width and height
			child[0].width  = Math.round(position_data.elemWidth);
			child[0].height = Math.round(position_data.elemHeight);
		}

		var app = applications[position_data.elemId];
		if (app !== undefined) {
			var parentTransform = getTransform(selectedElem.parentNode);
			var border = parseInt(selectedElem.parentNode.style.borderWidth || 0, 10);
			app.sage2_x = (position_data.elemLeft + border + 1) * parentTransform.scale.x + parentTransform.translate.x;
			app.sage2_x = Math.round(app.sage2_x);
			app.sage2_y = (position_data.elemTop + ui.titleBarHeight + border) * parentTransform.scale.y
				+ parentTransform.translate.y;
			app.sage2_y = Math.round(app.sage2_y);
			app.sage2_width  = parseInt(position_data.elemWidth, 10) * parentTransform.scale.x;
			app.sage2_height = parseInt(position_data.elemHeight, 10) * parentTransform.scale.y;

			var date = new Date(position_data.date);
			if (position_data.force || app.resizeEvents === "continuous") {
				if (app.resize) {
					app.resize(date);
				}
			}
			if (position_data.force || app.moveEvents === "continuous") {
				if (app.move) {
					app.move(date);
				}
			}
		}
		if (position_data.elemId in controlObjects) {
			var hOffset = (ui.titleBarHeight + position_data.elemHeight) / 2;
			for (var item in controlItems) {
				if (controlItems.hasOwnProperty(item) && item.indexOf(position_data.elemId) > -1 && controlItems[item].show) {
					var control = controlItems[item].divHandle;
					var cLeft = parseInt(control.style.left);
					var cTop = parseInt(control.style.top);
					var cHeight = parseInt(control.style.height);
					moveWidgetToAppConnector(item, cLeft + cHeight / 2.0,
						cTop + cHeight / 2.0,
						position_data.elemLeft - ui.offsetX + position_data.elemWidth / 2.0,
						position_data.elemTop - ui.offsetY + hOffset,
						cHeight / 2.4);
				}
			}
		}
	});

	wsio.on('startMove', function(data) {
		resetIdle();

		var app = applications[data.id];
		if (app !== undefined && app.moveEvents === "onfinish") {
			var date = new Date(data.date);
			if (app.startMove) {
				app.startMove(date);
			}
		}
	});

	wsio.on('finishedMove', function(data) {
		resetIdle();

		var app = applications[data.id];
		if (app !== undefined && app.moveEvents === "onfinish") {
			var date = new Date(data.date);
			if (app.move) {
				app.move(date);
			}
		}
	});

	wsio.on('startResize', function(data) {
		resetIdle();

		var app = applications[data.id];
		if (app !== undefined && app.resizeEvents === "onfinish") {
			var date = new Date(data.date);
			if (app.startResize) {
				app.startResize(date);
			}
		}
	});

	wsio.on('finishedResize', function(data) {
		resetIdle();
		var app = applications[data.id];
		if (app !== undefined && app.resizeEvents === "onfinish") {
			var date = new Date(data.date);
			if (app.resize) {
				app.resize(date);
			}
		}
	});

	wsio.on('animateCanvas', function(data) {
		var app = applications[data.id];
		if (app !== undefined && app !== null) {
			var date = new Date(data.date);
			app.refresh(date);
			wsio.emit('finishedRenderingAppFrame', {id: data.id, fps: app.maxFPS});
		}
	});

	wsio.on('eventInItem', function(event_data) {
		var app = applications[event_data.id];
		if (app) {
			var date = new Date(event_data.date);
			app.SAGE2Event(event_data.type, event_data.position, event_data.user, event_data.data, date);
		}
	});

	wsio.on('requestNewControl', function(data) {
		var dt = new Date(data.date);
		if (data.elemId !== undefined && data.elemId !== null) {
			if (controlObjects[data.elemId] !== undefined) {

				var spec = controlObjects[data.elemId].controls;
				if (spec.controlsReady() === true) {
					var size = spec.computeSize();
					wsio.emit('addNewControl', {
						id: data.elemId + data.user_id + "_controls",
						appId: data.elemId,
						left: data.x - size.height / 2,
						top: data.y - size.height / 2,
						width: size.width,
						height: size.height,
						barHeight: size.barHeight,
						hasSideBar: size.hasSideBar,
						show: true,
						date: dt
					});
				}

			}
		}
	});

	wsio.on('createControl', function(data) {
		if (controlItems[data.id] === null || controlItems[data.id] === undefined) {
			var ctrDiv =  document.createElement("div");
			ctrDiv.id = data.id;
			ctrDiv.className = "windowControls";
			ctrDiv.style.width = data.width.toString() + "px";
			ctrDiv.style.fill = "rgba(0,0,0,0.0)";
			ctrDiv.style.height = data.height.toString() + "px";
			ctrDiv.style.left = (data.left - ui.offsetX).toString() + "px";
			ctrDiv.style.top = (data.top - ui.offsetY).toString() + "px";
			ctrDiv.style.zIndex = "9990".toString();
			ctrDiv.style.display = data.show ? "block" : "none";
			if (ui.noDropShadow === true) {
				ctrDiv.style.boxShadow = "none";
			}

			var spec = controlObjects[data.appId].controls;
			if (spec.controlsReady() === true) {
				var handle = new SAGE2WidgetControlInstance(data.id, spec);
				ctrDiv.appendChild(handle);
				ui.main.appendChild(ctrDiv);
				controlItems[data.id] = {show: data.show, divHandle: ctrDiv};
				createWidgetToAppConnector(data.id);
			}

		}
	});
	wsio.on('removeControlsForUser', function(data) {
		for (var idx in controlItems) {
			if (idx.indexOf(data.user_id) > -1) {
				controlItems[idx].divHandle.parentNode.removeChild(controlItems[idx].divHandle);
				removeWidgetToAppConnector(idx);
				delete controlItems[idx];
			}
		}
	});

	wsio.on('executeControlFunction', function(data) {
		var ctrl = getWidgetControlInstanceById(data.ctrl);
		if (ctrl) {
			var ctrlId = ctrl.attr('id');
			var action = "buttonPress";
			var ctrlParent = ctrl.parent();
			var radioButtonSelected = null;
			if (/button/.test(ctrlId) === true && /radio/.test(ctrlId) === false) {
				ctrl = ctrlParent.select("svg");
				var animationInfo = ctrlParent.data("animationInfo");
				var state = animationInfo.state;
				if (ctrl !== null && ctrl !== undefined) {
					if (state === null || state === undefined) {
						ctrl = ctrlParent.select("circle") || ctrlParent.select("polygon");
						if (ctrl !== null && ctrl !== undefined) {
							var fillVal = ctrl.attr("fill");
							ctrl.animate({fill: "rgba(230,230,230,1.0)"}, 400, mina.bounce, function() {
								ctrl.animate({fill: fillVal}, 400, mina.bounce);
							});
						}
					}
				} else {
					ctrl = ctrlParent.select("path") || ctrlParent.select("text");
					if (animationInfo.textual === false && animationInfo.animation === true) {
						var delay = animationInfo.delay;
						var fromPath = animationInfo.from;
						var toPath = animationInfo.to;
						var fromFill = animationInfo.fill;
						var toFill = animationInfo.toFill;
						if (toFill === null || toFill === undefined) {
							toFill = fromFill;
						}
						if (state === null) {
							ctrl.animate({path: toPath, fill: toFill}, delay, mina.bounce, function() {
								ctrl.animate({path: fromPath, fill: fromFill}, delay, mina.bounce);
							});

						} else {
							animationInfo.state = 1 - animationInfo.state;
							ctrl.data("animationInfo", animationInfo);
							// ctrl.animate({"path":path, "fill":fill}, delay, mina.bounce);
						}
					}
				}
				ctrlId = ctrlParent.attr("id").replace("button", "");
			} else if (/radio/.test(ctrlId) === true) {
				var radioButtonId =  ctrlParent.attr("id");
				var radioState = ctrlParent.data("radioState");
				radioButtonSelected = ctrlId.replace(radioButtonId, "");
				radioState.value = radioButtonSelected;
				ctrlParent.data("radioState", radioState);
				action = "radioButtonPress";
				ctrlId = radioButtonId.replace("button_radio", "");
			} else {
				ctrlId = ctrlParent.attr("id").replace("slider", "");
				action = "sliderRelease";
			}

			var appId = data.ctrl.appId;
			var app   = applications[appId];
			switch (ctrlId) {
				case "CloseApp":
					if (isMaster) {
						wsio.emit('closeAppFromControl', {appId: appId});
					}
					break;
				case "CloseWidget":
					if (isMaster) {
						wsio.emit('hideWidgetFromControl', {instanceID: data.ctrl.instanceID});
					}
					break;
				case "ShareApp":
					break;
				default:
					var widgetEventData = {identifier: ctrlId, action: action};
					if (radioButtonSelected !== null) {
						widgetEventData.value = radioButtonSelected;
					}
					app.SAGE2Event("widgetEvent", null, data.user, widgetEventData, new Date(data.date));
					break;
			}

			// Check whether a request for clone was made.
			if (app.cloneable === true && app.requestForClone === true) {
				app.requestForClone = false;
				if (isMaster) {
					wsio.emit('createAppClone', {id: appId, cloneData: app.state});
				}
			}

		}

	});

	wsio.on('sliderKnobLockAction', function(data) {
		var ctrl   = getWidgetControlInstanceById(data.ctrl);
		var slider = ctrl.parent();
		var appId = data.ctrl.appId;
		var app = applications[appId];
		var ctrlId = slider.attr("id").replace("slider", "");
		app.SAGE2Event("widgetEvent", null, data.user, {identifier: ctrlId, action: "sliderLock"}, new Date(data.date));
		var ctrHandle    = document.getElementById(slider.data("instanceID"));
		var widgetOffset = ctrHandle ? parseInt(ctrHandle.style.left) : 0;
		var pos = data.x - ui.offsetX - widgetOffset;
		var sliderKnob = slider.select("rect");
		var knobWidthHalf = parseInt(sliderKnob.attr("width")) / 2;
		var knobCenterX   = parseInt(sliderKnob.attr("x")) + knobWidthHalf;
		if (Math.abs(pos - knobCenterX) > knobWidthHalf) {
			var updatedSliderInfo = mapMoveToSlider(sliderKnob, pos);
			var appObj = getPropertyHandle(applications[slider.data("appId")], slider.data("appProperty"));
			appObj.handle[appObj.property] = updatedSliderInfo.sliderValue;
			app.SAGE2Event("widgetEvent", null, data.user, {identifier: ctrlId, action: "sliderUpdate"}, new Date(data.date));
		}
	});

	wsio.on('moveSliderKnob', function(data) {
		// TODO: add `date` to `data` object
		//       DON'T USE `new Date()` CLIENT SIDE (apps will get out of sync)
		var ctrl = getWidgetControlInstanceById(data.ctrl);
		var slider = ctrl.parent();
		var ctrHandle = document.getElementById(slider.data("instanceID"));
		var widgetOffset = ctrHandle ? parseInt(ctrHandle.style.left) : 0;
		var pos = data.x - ui.offsetX - widgetOffset;
		var sliderKnob = slider.select("rect");
		var updatedSliderInfo = mapMoveToSlider(sliderKnob, pos);
		var appObj = getPropertyHandle(applications[slider.data("appId")], slider.data("appProperty"));
		appObj.handle[appObj.property] = updatedSliderInfo.sliderValue;
		var appId  = data.ctrl.appId;
		var app    = applications[appId];
		var ctrlId = slider.attr("id").replace("slider", "");
		app.SAGE2Event("widgetEvent", null, data.user, {identifier: ctrlId, action: "sliderUpdate"}, new Date(data.date));
	});

	wsio.on('keyInTextInputWidget', function(data) {
		// TODO: add `date` to `data` object
		//       DON'T USE `new Date()` CLIENT SIDE (apps will get out of sync)

		var ctrl = getWidgetControlInstanceById(data);
		if (ctrl) {
			var textInput = ctrl.parent();
			if (data.code !== 13) {
				insertTextIntoTextInputWidget(textInput, data.code, data.printable);
			} else {
				var ctrlId = textInput.attr("id").replace("textInput", "");
				var blinkControlHandle = textInput.data("blinkControlHandle");
				clearInterval(blinkControlHandle);
				var app = applications[data.appId];
				app.SAGE2Event("widgetEvent", null, data.user,
					{identifier: ctrlId, action: "textEnter", text: getTextFromTextInputWidget(textInput)}, new Date(data.date));
			}
		}
	});

	wsio.on('activateTextInputControl', function(data) {
		var ctrl = null;
		if (data.prevTextInput) {
			ctrl = getWidgetControlInstanceById(data.prevTextInput);
		}
		var textInput, blinkControlHandle;
		if (ctrl) {
			textInput = ctrl.parent();
			blinkControlHandle = textInput.data("blinkControlHandle");
			clearInterval(blinkControlHandle);
		}
		ctrl = getWidgetControlInstanceById(data.curTextInput);
		if (ctrl) {
			textInput = ctrl.parent();
			blinkControlHandle = setInterval(textInput.data("blinkCallback"), 1000);
			textInput.data("blinkControlHandle", blinkControlHandle);
		}
	});

	// Called when the user clicks outside the widget control while a lock exists on text input
	wsio.on('deactivateTextInputControl', function(data) {
		var ctrl = getWidgetControlInstanceById(data);
		if (ctrl) {
			var textInput = ctrl.parent();
			var blinkControlHandle = textInput.data("blinkControlHandle");
			clearInterval(blinkControlHandle);
		}
	});

	wsio.on('requestedDataSharingSession', function(data) {
		ui.showDataSharingRequestDialog(data);
	});

	wsio.on('closeRequestDataSharingDialog', function(data) {
		ui.hideDataSharingRequestDialog();
	});

	wsio.on('dataSharingConnectionWait', function(data) {
		ui.showDataSharingWaitingDialog(data);
	});

	wsio.on('closeDataSharingWaitDialog', function(data) {
		ui.hideDataSharingWaitingDialog();
	});

	wsio.on('initializeDataSharingSession', function(data) {
		dataSharingPortals[data.id] = new DataSharing(data);
	});

	wsio.on('setTitle', function(data) {
		if (data.id !== null && data.id !== undefined) {
			var titleDiv = document.getElementById(data.id + "_title");
			var pElement = titleDiv.getElementsByTagName("p");
			pElement[0].textContent = data.title;
		}
	});

	wsio.on('setAppSharingFlag', function(data) {
		var windowTitle = document.getElementById(data.id + "_title");
		var windowIconSync = document.getElementById(data.id + "_iconSync");

		if (data.sharing === true) {
			windowTitle.style.backgroundColor = "#39C4A6";
			windowIconSync.style.display = "block";
		} else {
			windowTitle.style.backgroundColor = "#666666";
			windowIconSync.display = "none";
		}
	});

	wsio.on('toggleSyncOptions', function(data) {
		var fullSync = true;
		var key;
		var windowTitle = document.getElementById(data.id + "_title");
		var windowIconSync = document.getElementById(data.id + "_iconSync");
		var windowIconUnSync = document.getElementById(data.id + "_iconUnSync");
		var windowState = document.getElementById(data.id + "_state");
		if (fullSync === true) {
			if (windowIconSync.style.display === "block") {
				windowTitle.style.backgroundColor = "#666666";
				windowIconSync.style.display = "none";
				windowIconUnSync.style.display = "block";

				for (key in applications[data.id].SAGE2StateOptions) {
					applications[data.id].SAGE2StateSyncChildren(applications[data.id].SAGE2StateOptions[key]._name,
						applications[data.id].SAGE2StateOptions, false);
				}
			} else {
				windowTitle.style.backgroundColor = "#39C4A6";
				windowIconSync.style.display = "block";
				windowIconUnSync.style.display = "none";

				for (key in applications[data.id].SAGE2StateOptions) {
					applications[data.id].SAGE2StateSyncChildren(applications[data.id].SAGE2StateOptions[key]._name,
						applications[data.id].SAGE2StateOptions, true);
				}
			}

			if (isMaster) {
				var stateOp = ignoreFields(applications[data.id].SAGE2StateOptions, ["_name", "_value"]);
				wsio.emit('updateStateOptions', {id: data.id, options: stateOp});
			}
		} else {
			if (applications[data.id].SAGE2StateSyncOptions.visible === false) {
				applications[data.id].SAGE2StateSyncOptions.visible = true;
				windowTitle.style.backgroundColor = "#666666";
				windowState.style.display = "block";
			} else {
				applications[data.id].SAGE2StateSyncOptions.visible = false;
				windowTitle.style.backgroundColor = "#39C4A6";
				windowState.style.display = "none";
			}
		}
	});

	wsio.on('sendServerWallScreenshot', function(data) {
		// first tell user that screenshot is happening, because screen will freeze
		makingScreenshotDialog = ui.buildMessageBox('makingScreenshotDialog',
			'Please wait, wall is taking a screenshot');
		// Add to the DOM
		ui.main.appendChild(makingScreenshotDialog);
		// Make the dialog visible
		makingScreenshotDialog.style.display = "block";
		// now do check and perform capture if can
		if (!__SAGE2__.browser.isElectron) {
			wsio.emit("wallScreenshotFromDisplay", {capable: false});
		} else {
			// set a rectangle of the client size
			var captureRect = { x: 0, y: 0, width: ui.main.clientWidth, height: ui.main.clientHeight };
			require('electron').remote.getCurrentWindow().capturePage(captureRect, function(img) {
				var imageData, resized;
				// get the size of the screenshot image
				var shot = img.getSize();
				if (shot.width !== captureRect.width) {
					// in retina mode, need to downscale the image
					resized = img.resize({width: captureRect.width, quality: 'better'});
					// use JPEG with quality 90%
					imageData = resized.toJPEG(90);
				} else {
					imageData = img.toJPEG(90);
				}
				// Send the image back to the server as JPEG
				wsio.emit("wallScreenshotFromDisplay", {
					capable: true,
					imageData: imageData
				});
				// Close the dialog
				deleteElement('makingScreenshotDialog');
			});
		}
	});

	wsio.on('showStickyPin', function(data) {
		if (data.sticky !== true) {
			return;
		}
		var titleBarHeight = ui.titleBarHeight;
		var iconWidth = Math.round(titleBarHeight) * (300 / 235);
		var iconSpace = 0.1 * iconWidth;
		var titleText = document.getElementById(data.id + "_text");
		var windowIconPinned = document.getElementById(data.id + "_iconPinned");
		var windowIconPinout = document.getElementById(data.id + "_iconPinout");
		titleText.style.marginLeft = Math.round(iconWidth + 2 * iconSpace) + "px";
		if (data.pinned === true) {
			windowIconPinned.style.display = "block";
			windowIconPinout.style.display = "none";
		} else {
			windowIconPinned.style.display = "none";
			windowIconPinout.style.display = "block";
		}
	});

	wsio.on('hideStickyPin', function(data) {
		if (data.sticky !== true) {
			return;
		}
		var titleBarHeight = ui.titleBarHeight;
		var titleText = document.getElementById(data.id + "_text");
		var windowIconPinned = document.getElementById(data.id + "_iconPinned");
		var windowIconPinout = document.getElementById(data.id + "_iconPinout");
		titleText.style.marginLeft = Math.round(titleBarHeight / 4.0) + "px";
		windowIconPinned.style.display = "none";
		windowIconPinout.style.display = "none";
	});
}

function createAppWindow(data, parentId, titleBarHeight, titleTextSize, offsetX, offsetY) {
	resetIdle();

	var parent = document.getElementById(parentId);

	var date = new Date(data.date);
	var translate = "translate(" + data.left + "px," + data.top + "px)";

	var windowTitle = document.createElement("div");
	windowTitle.id  = data.id + "_title";
	windowTitle.className    = "windowTitle";
	windowTitle.style.width  = data.width.toString() + "px";
	windowTitle.style.height = titleBarHeight.toString() + "px";
	windowTitle.style.left   = (-offsetX).toString() + "px";
	windowTitle.style.top    = (-offsetY).toString() + "px";
	windowTitle.style.webkitTransform = translate;
	windowTitle.style.mozTransform    = translate;
	windowTitle.style.transform       = translate;
	windowTitle.style.zIndex = itemCount.toString();
	if (ui.noDropShadow === true) {
		windowTitle.style.boxShadow = "none";
	}
	if (ui.uiHidden === true) {
		windowTitle.style.display   = "none";
	}

	var iconWidth = Math.round(titleBarHeight) * (300 / 235);
	var iconSpace = 0.1 * iconWidth;
	var windowIconSync = document.createElement("img");
	windowIconSync.id  = data.id + "_iconSync";
	windowIconSync.src = "images/window-sync.svg";
	windowIconSync.height = Math.round(titleBarHeight);
	windowIconSync.style.position = "absolute";
	windowIconSync.style.right    = Math.round(2 * (iconWidth + iconSpace)) + "px";
	windowIconSync.style.display  = "none";
	windowTitle.appendChild(windowIconSync);

	var windowIconUnSync = document.createElement("img");
	windowIconUnSync.id  = data.id + "_iconUnSync";
	windowIconUnSync.src = "images/window-unsync.svg";
	windowIconUnSync.height = Math.round(titleBarHeight);
	windowIconUnSync.style.position = "absolute";
	windowIconUnSync.style.right    = Math.round(2 * (iconWidth + iconSpace)) + "px";
	windowIconUnSync.style.display  = "none";
	windowTitle.appendChild(windowIconUnSync);

	var windowIconFullscreen = document.createElement("img");
	windowIconFullscreen.id  = data.id + "_iconFullscreen";
	windowIconFullscreen.src = "images/window-fullscreen.svg";
	windowIconFullscreen.height = Math.round(titleBarHeight);
	windowIconFullscreen.style.position = "absolute";
	windowIconFullscreen.style.right    = Math.round(1 * (iconWidth + iconSpace)) + "px";
	windowTitle.appendChild(windowIconFullscreen);

	var windowIconClose = document.createElement("img");
	windowIconClose.id  = data.id + "_iconClose";
	windowIconClose.src = "images/window-close3.svg";
	windowIconClose.height = Math.round(titleBarHeight);
	windowIconClose.style.position = "absolute";
	windowIconClose.style.right    = "0px";
	windowTitle.appendChild(windowIconClose);

	if (data.sticky === true) {
		var windowIconPinned = document.createElement("img");
		windowIconPinned.id  = data.id + "_iconPinned";
		windowIconPinned.src = "images/window-pinned.svg";
		windowIconPinned.height = Math.round(titleBarHeight);
		windowIconPinned.style.position = "absolute";
		windowIconPinned.style.left    = Math.round(iconSpace) + "px";
		windowIconPinned.style.display  = "none";
		windowTitle.appendChild(windowIconPinned);

		var windowIconPinout = document.createElement("img");
		windowIconPinout.id  = data.id + "_iconPinout";
		windowIconPinout.src = "images/window-pinout.svg";
		windowIconPinout.height = Math.round(titleBarHeight);
		windowIconPinout.style.position = "absolute";
		windowIconPinout.style.left    = Math.round(iconSpace) + "px";
		windowIconPinout.style.display  = "none";
		windowTitle.appendChild(windowIconPinout);
	}
	var titleText = document.createElement("p");
	titleText.id  = data.id + "_text";
	titleText.style.lineHeight = Math.round(titleBarHeight) + "px";
	titleText.style.fontSize   = Math.round(titleTextSize) + "px";
	titleText.style.color      = "#FFFFFF";
	titleText.style.marginLeft = Math.round(titleBarHeight / 4.0) + "px";
	titleText.textContent      = data.title;
	windowTitle.appendChild(titleText);

	var windowItem = document.createElement("div");
	windowItem.id = data.id;
	windowItem.className      = "windowItem";
	windowItem.style.left     = (-offsetX).toString() + "px";
	windowItem.style.top      = (titleBarHeight - offsetY).toString() + "px";
	windowItem.style.webkitTransform = translate;
	windowItem.style.mozTransform    = translate;
	windowItem.style.transform       = translate;
	windowItem.style.overflow = "hidden";
	windowItem.style.zIndex   = (itemCount + 1).toString();
	if (ui.noDropShadow === true) {
		windowItem.style.boxShadow = "none";
	}
	if (ui.uiHidden === true) {
		windowItem.classList.toggle("windowItemNoBorder");
	}

	var windowState = document.createElement("div");
	windowState.id = data.id + "_state";
	windowState.style.position = "absolute";
	windowState.style.width  = data.width.toString() + "px";
	windowState.style.height = data.height.toString() + "px";
	windowState.style.backgroundColor = "rgba(0,0,0,0.8)";
	windowState.style.lineHeight = Math.round(1.5 * titleTextSize) + "px";
	windowState.style.zIndex = "100";
	windowState.style.display = "none";

	var windowStateContatiner = document.createElement("div");
	windowStateContatiner.id = data.id + "_statecontainer";
	windowStateContatiner.style.position = "absolute";
	windowStateContatiner.style.top = "0px";
	windowStateContatiner.style.left = "0px";
	windowStateContatiner.style.webkitTransform = "translate(0px,0px)";
	windowStateContatiner.style.mozTransform = "translate(0px,0px)";
	windowStateContatiner.style.transform = "translate(0px,0px)";
	windowState.appendChild(windowStateContatiner);
	windowItem.appendChild(windowState);

	var cornerSize = Math.min(data.width, data.height) / 5;
	var dragCorner = document.createElement("div");
	dragCorner.className      = "dragCorner";
	dragCorner.style.position = "absolute";
	dragCorner.style.width    = cornerSize.toString() + "px";
	dragCorner.style.height   = cornerSize.toString() + "px";
	dragCorner.style.top      = (data.height - cornerSize).toString() + "px";
	dragCorner.style.left     = (data.width - cornerSize).toString() + "px";
	dragCorner.style.backgroundColor = "rgba(255,255,255,0.0)";
	dragCorner.style.border   = "none";
	dragCorner.style.zIndex   = "1";
	windowItem.appendChild(dragCorner);

	parent.appendChild(windowTitle);
	parent.appendChild(windowItem);

	// App launched in window
	if (data.application === "media_stream") {
		wsio.emit('receivedMediaStreamFrame', {id: data.id});
	}
	if (data.application === "media_block_stream") {
		wsio.emit('receivedMediaBlockStreamFrame', {id: data.id, newClient: true});
	}

	// convert url if hostname is alias for current origin
	var url = cleanURL(data.url);

	function loadApplication() {
		var init = {
			id: data.id,
			x: data.left,
			y: data.top + titleBarHeight,
			width: data.width,
			height: data.height,
			resrc: url,
			state: data.data,
			date: date,
			title: data.title,
			application: data.application
		};
		// extra data that may be passed from launchAppWithValues
		if (data.customLaunchParams) {
			init.customLaunchParams = data.customLaunchParams;
		}

		// load new app
		if (window[data.application] === undefined) {
			var js = document.createElement("script");
			js.addEventListener('error', function(event) {
				console.log("Error loading script: " + data.application + ".js");
			}, false);
			js.addEventListener('load', function(event) {
				var newapp = new window[data.application]();
				newapp.init(init);
				newapp.refresh(date);

				// Sending the context menu info to the server
				if (isMaster) {
					newapp.getFullContextMenuAndUpdate();
				}

				applications[data.id]   = newapp;
				controlObjects[data.id] = newapp;

				if (data.animation === true) {
					wsio.emit('finishedRenderingAppFrame', {id: data.id});
				}
			}, false);
			js.type  = "text/javascript";
			js.async = false;
			js.src = url + "/" + data.application + ".js";
			console.log("Loading>", data.id, url + "/" + data.application + ".js");
			document.head.appendChild(js);
		} else {
			// load existing app
			var app = new window[data.application]();
			app.init(init);
			app.refresh(date);

			// Sending the context menu info to the server
			if (isMaster) {
				app.getFullContextMenuAndUpdate();
			}

			applications[data.id] = app;
			controlObjects[data.id] = app;

			if (data.animation === true) {
				wsio.emit('finishedRenderingAppFrame', {id: data.id});
			}
			if (data.application === "movie_player") {
				setTimeout(function() {
					wsio.emit('requestVideoFrame', {id: data.id});
				}, 500);
			}
		}
	}

	// load all dependencies
	if (data.resrc === undefined || data.resrc === null || data.resrc.length === 0) {
		loadApplication();
	} else {
		var loadResource = function(idx) {
			var resourceUrl = data.resrc[idx];

			if (dependencies[resourceUrl] !== undefined) {
				if ((idx + 1) < data.resrc.length) {
					loadResource(idx + 1);
				} else {
					console.log("all resources loaded", data.id);
					loadApplication();
				}

				return;
			}

			// Not loaded yet
			dependencies[resourceUrl] = false;

			// Check the type
			var loaderType;
			if (resourceUrl.endsWith(".js")) {
				loaderType = "script";
			} else if (resourceUrl.endsWith(".css")) {
				loaderType = "link";
			} else {
				console.log('Dependencies> unknown file extension, assuming script', resourceUrl);
				loaderType = "script";
			}

			if (loaderType) {
				// Create the DOM element to laod the resource
				var loader = document.createElement(loaderType);

				// Place an error handler
				loader.addEventListener('error', function(event) {
					console.log("Dependencies> Error loading", resourceUrl);
				}, false);

				// When done, try next dependency in the list
				loader.addEventListener('load', function(event) {
					// Success, mark as loaded
					dependencies[data.resrc[idx]] = true;
					if ((idx + 1) < data.resrc.length) {
						// load the next one
						loadResource(idx + 1);
					} else {
						// We are done
						console.log("Dependencies> all resources loaded", data.id);
						loadApplication();
					}
				});

				// if not a full URL, add the local one
				if (resourceUrl.indexOf("http://")  !== 0 &&
					resourceUrl.indexOf("https://") !== 0 &&
					resourceUrl.indexOf("/") !== 0) {
					resourceUrl = url + "/" + resourceUrl;
				}

				// is it a JS file
				if (loaderType === "script") {
					loader.type  = "text/javascript";
					loader.async = false;
					loader.src   = resourceUrl;
				} else if (loaderType === "link") {
					// is it a CSS file
					loader.setAttribute("type", "text/css");
					loader.setAttribute("rel",  "stylesheet");
					loader.setAttribute("href", resourceUrl);
				} else {
					console.log('Dependencies> unknown file type', resourceUrl);
				}

				// Finally, add it to the document to trigger the laod
				document.head.appendChild(loader);
			}
		};
		// Start loading the first resource
		loadResource(0);
	}

	itemCount += 2;
}

function moveItemWithAnimation(updatedApp) {
	var elemTitle = document.getElementById(updatedApp.elemId + "_title");
	var elem = document.getElementById(updatedApp.elemId);

	var translate = "translate(" + updatedApp.elemLeft + "px," + updatedApp.elemTop + "px)";

	// allow for transform transitions
	elemTitle.style.transition = "opacity 0.2s ease-in, transform 0.2s linear";
	elem.style.transition = "opacity 0.2s ease-in, transform 0.2s linear";

	// update transforms
	elemTitle.style.transform = translate;
	elem.style.transform = translate;

	// reset transition after transform transition time
	setTimeout(function() {
		elemTitle.style.transition = "opacity 0.2s ease-in";
		elem.style.transition = "opacity 0.2s ease-in";
	}, 200);
}
