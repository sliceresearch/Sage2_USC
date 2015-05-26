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

var itemCount = 0;
var controlItems   = {};
var controlObjects = {};
var lockedControlElements = {};
var widgetConnectorRequestList = {};

var applications = {};
var dependencies = {};
var dataSharingPortals = {};


var annotationItems = {};
// UI object to build the element on the wall
var ui;
var uiTimer = null;
var uiTimerDelay;

// Explicitely close web socket when web browser is closed
window.onbeforeunload = function() {
	if(wsio !== undefined) wsio.close();
};

/**
 * Idle function, show and hide the UI, triggered at uiTimerDelay sec delay
 *
 * @method resetIdle
 */
function resetIdle() {
	if (uiTimer) {
		clearTimeout(uiTimer);
		ui.showInterface();
		uiTimer = setTimeout(function() { ui.hideInterface(); }, uiTimerDelay*1000);
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

	isMaster = false;

	wsio.open(function() {
		console.log("Websocket opened");

		setupListeners();

		/*
		var clientDescription = {
			clientType: "display",
			clientID: clientID,
			sendsPointerData: false,
			sendsMediaStreamFrames: false,
			requestsServerFiles: true,
			sendsWebContentToLoad: false,
			sendsVideoSynchonization: true,
			sharesContentWithRemoteServer: false,
			receivesDisplayConfiguration: true,
			receivesClockTime: true,
			requiresFullApps: true,
			requiresAppPositionSizeTypeOnly: false,
			receivesMediaStreamFrames: true,
			receivesWindowModification: true,
			receivesPointerData: true,
			receivesInputEvents: true,
			receivesRemoteServerInfo: true,
			requestsWidgetControl: true,
			receivesWidgetEvents: true,
			requestsAppClone: true,
			requestsFileHandling: true

		};
		*/
		var clientDescription = {
			clientType: "display",
			clientID: clientID,
			requests: {
				config: true,
				version: true,
				time: true,
				console: false
			}
		};
		wsio.emit('addClient', clientDescription);
	});

	// Socket close event (ie server crashed)
	wsio.on('close', function (evt) {
		var refresh = setInterval(function () {
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
		// var serverTime = new Date(data.time);
		// var clientTime = new Date();
		// var dt = clientTime - serverTime;

		// Global initialization
		SAGE2_initialize(startTime);
	});

	wsio.on('setAsMasterDisplay', function() {
		isMaster = true;
	});

	wsio.on('broadcast', function(data) {
		if(applications[data.app] === undefined){
			// should have better way to determine if app is loaded
			//   or already killed
			setTimeout(function() {
				if (applications[data.app] && applications[data.app][data.func])
					applications[data.app][data.func](data.data);
			}, 500);
		}
		else {
			applications[data.app][data.func](data.data);
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

		http_port = json_cfg.index_port === 80 ? "" : ":"+json_cfg.index_port;
		https_port = json_cfg.port === 443 ? "" : ":"+json_cfg.port;
		hostAlias["http://"  + json_cfg.host + http_port]  = window.location.origin;
		hostAlias["https://" + json_cfg.host + https_port] = window.location.origin;
		for(i=0; i<json_cfg.alternate_hosts.length; i++) {
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
			uiTimer      = setTimeout(function() { ui.hideInterface(); }, uiTimerDelay*1000);
		}
		makeSvgBackgroundForWidgetConnectors(ui.main.style.width, ui.main.style.height);
	});

	wsio.on('hideui', function(param) {
		if (param) {
			clearTimeout(uiTimer);
			ui.showInterface();
			uiTimerDelay = param.delay;
			uiTimer      = setTimeout(function() { ui.hideInterface(); }, uiTimerDelay*1000);
		} else
			if (ui.uiHidden===true) {
				clearTimeout(uiTimer);
				uiTimer = null;
				ui.showInterface();
			}
			else {
				ui.hideInterface();
			}
	});

	wsio.on('setupSAGE2Version', function(version) {
		ui.updateVersionText(version);
	});

	wsio.on('setSystemTime', function(data) {
		ui.setTime(new Date(data.date));
	});

	wsio.on('addRemoteSite', function(data) {
		ui.addRemoteSite(data);
	});

	wsio.on('connectedToRemoteSite', function(data) {
		if (window.ui) {
			ui.connectedToRemoteSite(data);
		}
		else {
			setTimeout(function() {
				ui.connectedToRemoteSite(data);
			}, 1000);
		}
	});

	wsio.on('createSagePointer', function(pointer_data){
		if (window.ui) {
			ui.createSagePointer(pointer_data);
		}
		else {
			setTimeout(function() {
				ui.createSagePointer(pointer_data);
			}, 1000);
		}
    });

    wsio.on('showSagePointer', function(pointer_data){
		ui.showSagePointer(pointer_data);
		resetIdle();
		var uniqueID = pointer_data.id.slice(0, pointer_data.id.lastIndexOf("_"));
		var re = /\.|\:/g;
		var stlyeCaption = uniqueID.split(re).join("");
		addStyleElementForTitleColor(stlyeCaption, pointer_data.color);
    });

    wsio.on('hideSagePointer', function(pointer_data){
		ui.hideSagePointer(pointer_data);
		var uniqueID = pointer_data.id.slice(0, pointer_data.id.lastIndexOf("_"));
		var re = /\.|\:/g;
		var stlyeCaption = uniqueID.split(re).join("");
		removeStyleElementForTitleColor(stlyeCaption, pointer_data.color);
    });

    wsio.on('updateSagePointerPosition', function(pointer_data){
		ui.updateSagePointerPosition(pointer_data);
		resetIdle();
    });

    wsio.on('changeSagePointerMode', function(pointer_data){
		ui.changeSagePointerMode(pointer_data);
		resetIdle();
    });

	wsio.on('createRadialMenu', function(menu_data){
		ui.createRadialMenu(menu_data);
    });

	wsio.on('updateRadialMenu', function(menu_data){
		ui.updateRadialMenu(menu_data);
    });

	wsio.on('radialMenuEvent', function(menu_data){
		ui.radialMenuEvent(menu_data);
		resetIdle();
    });

	wsio.on('updateRadialMenuDocs', function(menu_data){
		ui.updateRadialMenuDocs(menu_data);
		resetIdle();
    });

	wsio.on('updateRadialMenuApps', function(menu_data){
		ui.updateRadialMenuApps(menu_data);
		resetIdle();
    });

	wsio.on('loadApplicationState', function(data) {
		var app = applications[data.id];
		if (app !== undefined && app !== null){
			app.SAGE2Load(data.state, new Date(data.date));
		}
	});

	wsio.on('updateMediaStreamFrame', function(data) {
		wsio.emit('receivedMediaStreamFrame', {id: data.id});

		var app = applications[data.id];
		if (app !== undefined && app !== null){
			app.SAGE2Load(data.state, new Date(data.date));
		}

		// update clones in data-sharing portals
		var key;
		for (key in dataSharingPortals) {
			app = applications[data.id + "_" + key];
			if (app !== undefined && app !== null){
				app.SAGE2Load(data.state, new Date(data.date));
			}
		}
	});

	wsio.on('updateMediaBlockStreamFrame', function(data) {
        var appId     = byteBufferToString(data);
		var blockIdx  = byteBufferToInt(data.subarray(appId.length+1, appId.length+ 3));
		var date      = byteBufferToInt(data.subarray(appId.length+3, appId.length+11));
        var yuvBuffer = data.subarray(appId.length+11, data.length);

		if(applications[appId] !== undefined && applications[appId] !== null){
			applications[appId].textureData(blockIdx, yuvBuffer);
			if(applications[appId].receivedBlocks.every(isTrue) === true){
				applications[appId].refresh(new Date(date));
				applications[appId].setValidBlocksFalse();
                wsio.emit('receivedMediaBlockStreamFrame', {id: appId});
			}
		}
	});

	wsio.on('updateVideoFrame', function(data) {
		var appId     = byteBufferToString(data);
		var blockIdx  = byteBufferToInt(data.subarray(appId.length+1, appId.length+ 3));
		//var frameIdx  = byteBufferToInt(data.subarray(appId.length+3, appId.length+ 7));
		var date      = byteBufferToInt(data.subarray(appId.length+7, appId.length+15));
		var yuvBuffer = data.subarray(appId.length+15, data.length);

		if(applications[appId] !== undefined && applications[appId] !== null){
			applications[appId].textureData(blockIdx, yuvBuffer);
			if(applications[appId].receivedBlocks.every(isTrue) === true){
				applications[appId].refresh(new Date(date));
				applications[appId].setValidBlocksFalse();
				wsio.emit('requestVideoFrame', {id: appId});
			}
		}
	});

	wsio.on('updateFrameIndex', function(data) {
		var app = applications[data.id];
		if(app !== undefined && app !== null){
			app.setVideoFrame(data.frameIdx);
		}
	});

	wsio.on('videoEnded', function(data) {
		var app = applications[data.id];
		if(app !== undefined && app !== null){
			app.videoEnded();
		}
	});

	wsio.on('updateValidStreamBlocks', function(data) {
		if(applications[data.id] !== undefined && applications[data.id] !== null){
			applications[data.id].validBlocks = data.blockList;
			applications[data.id].setValidBlocksFalse();
		}
	});

	wsio.on('updateWebpageStreamFrame', function(data) {
		wsio.emit('receivedWebpageStreamFrame', {id: data.id, client: clientID});

		var webpage = document.getElementById(data.id + "_webpage");
		webpage.src = "data:image/jpeg;base64," + data.src;
	});


	////////////////////////////////////////////////
	wsio.on('createAppWindow', function(data) {
		createAppWindow(data, ui.main.id, ui.titleBarHeight, ui.titleTextSize, ui.offsetX, ui.offsetY);
	});

	wsio.on('createAppWindowInDataSharingPortal', function(data) {
		var portal = dataSharingPortals[data.portal];

		createAppWindow(data.application, portal.id, portal.titleBarHeight, portal.titleTextSize, 0, 0);
	});
	////////////////////////////////////////////////

	wsio.on('deleteElement', function(elem_data) {
		resetIdle();

		// Tell the application it is over
		var app = applications[elem_data.elemId];
		app.terminate();
		// Remove the app from the list
		delete applications[elem_data.elemId];

		// Clean up the DOM
		var deleteElemTitle = document.getElementById(elem_data.elemId + "_title");
		deleteElemTitle.parentNode.removeChild(deleteElemTitle);

		var deleteElem = document.getElementById(elem_data.elemId);
		deleteElem.parentNode.removeChild(deleteElem);

		// Clean up the UI DOM
		if (elem_data.elemId in controlObjects){
			for (var item in controlItems){
				if (item.indexOf(elem_data.elemId) > -1){
					controlItems[item].divHandle.parentNode.removeChild(controlItems[item].divHandle);
					removeWidgetToAppConnector(item);
					delete controlItems[item];
				}

			}
			delete controlObjects[elem_data.elemId];
		}
	});

	wsio.on('hideControl', function(ctrl_data) {
		if (ctrl_data.id in controlItems && controlItems[ctrl_data.id].show===true){
			controlItems[ctrl_data.id].divHandle.style.display = "none";
			controlItems[ctrl_data.id].show=false;
			clearConnectorColor(ctrl_data.id, ctrl_data.appId);
		}
	});

	wsio.on('showControl', function(ctrl_data) {
		if (ctrl_data.id in controlItems && controlItems[ctrl_data.id].show===false){
			controlItems[ctrl_data.id].divHandle.style.display = "block";
			controlItems[ctrl_data.id].show=true;
		}
	});

	wsio.on('updateItemOrder', function(order) {
		resetIdle();
		var key;
		for (key in order) {
			var selectedElemTitle = document.getElementById(key + "_title");
			var selectedElem = document.getElementById(key);
			var selectedElemOverlay = document.getElementById(key + "_overlay");

			if (selectedElemTitle) selectedElemTitle.style.zIndex = order[key].toString();
			if (selectedElem) selectedElem.style.zIndex = order[key].toString();
			if (selectedElemOverlay) selectedElemOverlay.style.zIndex = order[key].toString();
			if(annotationItems.hasOwnProperty(key)){
				var annotationWindow = annotationItems[key];
				annotationWindow.setOrder(order[key]);
			}
		}
	});

	wsio.on('hoverOverItemCorner', function(elem_data) {
		var selectedElem = document.getElementById(elem_data.elemId);
		var dragCorner   = selectedElem.getElementsByClassName("dragCorner");
		if (elem_data.flag) {
			dragCorner[0].style.backgroundColor = "rgba(255,255,255,0.7)";
			dragCorner[0].style.border = "2px solid #333333";
		}
		else {
			dragCorner[0].style.backgroundColor = "rgba(255,255,255,0.0)";
			dragCorner[0].style.border = "none";
		}
	});

	wsio.on('setItemPosition', function(position_data) {
		resetIdle();

		if (position_data.elemId.split("_")[0] === "portal") {
			dataSharingPortals[position_data.elemId].setPosition(position_data.elemLeft, position_data.elemTop);
			return;
		}

		var translate = "translate(" + position_data.elemLeft + "px," + position_data.elemTop + "px)";
		var selectedElemTitle = document.getElementById(position_data.elemId + "_title");
		selectedElemTitle.style.webkitTransform = translate;
		selectedElemTitle.style.mozTransform    = translate;
		selectedElemTitle.style.transform       = translate;

		var selectedElem = document.getElementById(position_data.elemId);
		selectedElem.style.webkitTransform = translate;
		selectedElem.style.mozTransform    = translate;
		selectedElem.style.transform       = translate;

		var app = applications[position_data.elemId];
		if(app !== undefined) {
			var parentTransform = getTransform(selectedElem.parentNode);
			var border = parseInt(selectedElem.parentNode.style.borderWidth || 0, 10);
			app.sage2_x = (position_data.elemLeft+border+1)*parentTransform.scale.x + parentTransform.translate.x;
			app.sage2_y = (position_data.elemTop+ui.titleBarHeight+border)*parentTransform.scale.y + parentTransform.translate.y;
			app.sage2_width  = parseInt(position_data.elemWidth, 10)*parentTransform.scale.x;
			app.sage2_height = parseInt(position_data.elemHeight, 10)*parentTransform.scale.y;

			var date  = new Date(position_data.date);
			if (position_data.force || app.moveEvents === "continuous") {
				app.move(date);
			}
		}
		if (position_data.elemId in controlObjects){
			var hOffset = (ui.titleBarHeight + position_data.elemHeight)/2;
			for (var item in controlItems){
				if (controlItems.hasOwnProperty(item) && item.indexOf(position_data.elemId) > -1 && controlItems[item].show){
					var control = controlItems[item].divHandle;
					var cLeft = parseInt(control.style.left);
					var cTop = parseInt(control.style.top);
					var cHeight = parseInt(control.style.height);
					moveWidgetToAppConnector(item, cLeft + cHeight/2.0, cTop + cHeight/2.0, position_data.elemLeft-ui.offsetX + position_data.elemWidth/2.0, position_data.elemTop-ui.offsetY+hOffset, cHeight/2.4);
				}
			}
		}

	});

	wsio.on('setControlPosition', function(position_data) {
		var eLeft = position_data.elemLeft - ui.offsetX;
		var eTop = position_data.elemTop - ui.offsetY;
		var selectedControl = document.getElementById(position_data.elemId);
		var appData = position_data.appData;
		if(selectedControl !== undefined && selectedControl !== null) {
			selectedControl.style.left = eLeft.toString() + "px";
			selectedControl.style.top = eTop.toString() + "px";
			var hOffset = (ui.titleBarHeight + appData.height)/2;
			moveWidgetToAppConnector(position_data.elemId, eLeft+position_data.elemHeight/2.0, eTop+position_data.elemHeight/2.0, appData.left-ui.offsetX + appData.width/2.0, appData.top-ui.offsetY + hOffset, position_data.elemHeight/2.4);
		}
		else {
			console.log("cannot find control: " + position_data.elemId);
		}
	});

	wsio.on('showWidgetToAppConnector', function(data){
		//console.log("show:",data);
		showWidgetToAppConnectors(data);
		if (data.user_color!==null){
			if (!(data.id in widgetConnectorRequestList)){
				widgetConnectorRequestList[data.id] = [];
			}
			widgetConnectorRequestList[data.id].push(data);
		}
	});


	wsio.on('hideWidgetToAppConnector', function(control_data){
		//console.log("hide:",control_data);
		if (control_data.id in widgetConnectorRequestList) {
			var lst = widgetConnectorRequestList[control_data.id];
			if (lst.length > 1) {
				var len = lst.length;
				for (var i=len-1; i>=0; i--) {
					if (control_data.user_id === lst[i].user_id) {
						lst.splice(i, 1);
						showWidgetToAppConnectors(lst[len-2]);
						break;
					}
				}
			}
			else if (lst.length === 1) {
				delete widgetConnectorRequestList[control_data.id];
				hideWidgetToAppConnectors(control_data.id);
			}
		}

	});

	wsio.on('setItemPositionAndSize', function(position_data) {
		resetIdle();

		if (position_data.elemId.split("_")[0] === "portal") {
			dataSharingPortals[position_data.elemId].setPositionAndSize(position_data.elemLeft, position_data.elemTop, position_data.elemWidth, position_data.elemHeight);
			return;
		}
		var selectedElem = document.getElementById(position_data.elemId);
		var child        = selectedElem.getElementsByClassName("sageItem");
		// If application not ready, return
		if (child.length < 1) return;

		var translate = "translate(" + position_data.elemLeft + "px," + position_data.elemTop + "px)";
		var selectedElemTitle = document.getElementById(position_data.elemId + "_title");
		selectedElemTitle.style.webkitTransform = translate;
		selectedElemTitle.style.mozTransform    = translate;
		selectedElemTitle.style.transform       = translate;
		selectedElemTitle.style.width = Math.round(position_data.elemWidth).toString() + "px";

		selectedElem.style.webkitTransform = translate;
		selectedElem.style.mozTransform    = translate;
		selectedElem.style.transform       = translate;

		var dragCorner = selectedElem.getElementsByClassName("dragCorner");
		var cornerSize = Math.min(position_data.elemWidth, position_data.elemHeight) / 5;
		dragCorner[0].style.width  = cornerSize.toString() + "px";
        dragCorner[0].style.height = cornerSize.toString() + "px";
        dragCorner[0].style.top    = (Math.round(position_data.elemHeight)-cornerSize).toString() + "px";
        dragCorner[0].style.left   = (Math.round(position_data.elemWidth)-cornerSize).toString()  + "px";

		// if the element is a div or iframe, resize should use the style object
		if (child[0].tagName.toLowerCase() === "div" || child[0].tagName.toLowerCase() === "iframe") {
			child[0].style.width  = Math.round(position_data.elemWidth)  + "px";
			child[0].style.height = Math.round(position_data.elemHeight) + "px";
		}
		else {
			// if it's a canvas or else, just use width and height
			child[0].width  = Math.round(position_data.elemWidth);
			child[0].height = Math.round(position_data.elemHeight);
		}

		var app = applications[position_data.elemId];
		if(app !== undefined) {
			var parentTransform = getTransform(selectedElem.parentNode);
			var border = parseInt(selectedElem.parentNode.style.borderWidth || 0, 10);
			app.sage2_x = (position_data.elemLeft+border+1)*parentTransform.scale.x + parentTransform.translate.x;
			app.sage2_y = (position_data.elemTop+ui.titleBarHeight+border)*parentTransform.scale.y + parentTransform.translate.y;
			app.sage2_width  = parseInt(position_data.elemWidth, 10)*parentTransform.scale.x;
			app.sage2_height = parseInt(position_data.elemHeight, 10)*parentTransform.scale.y;

			var date = new Date(position_data.date);
			if(position_data.force || app.resizeEvents === "continuous") {
				if (app.resize) app.resize(date);
			}
			if(position_data.force || app.moveEvents === "continuous") {
				if (app.move) app.move(date);
			}
		}
		if (position_data.elemId in controlObjects){
			var hOffset = (ui.titleBarHeight + position_data.elemHeight)/2;
			for (var item in controlItems){
				if (controlItems.hasOwnProperty(item) && item.indexOf(position_data.elemId) > -1 && controlItems[item].show){
					var control = controlItems[item].divHandle;
					var cLeft = parseInt(control.style.left);
					var cTop = parseInt(control.style.top);
					var cHeight = parseInt(control.style.height);
					moveWidgetToAppConnector(item, cLeft + cHeight/2.0, cTop + cHeight/2.0, position_data.elemLeft-ui.offsetX + position_data.elemWidth/2.0, position_data.elemTop-ui.offsetY+hOffset, cHeight/2.4);
				}
			}
		}
	});

	wsio.on('startMove', function(data) {
		resetIdle();

		var app = applications[data.id];
		if(app !== undefined && app.moveEvents === "onfinish") {
			var date = new Date(data.date);
			if (app.startMove) app.startMove(date);
		}
	});

	wsio.on('finishedMove', function(data) {
		resetIdle();

		var app = applications[data.id];
		if(app !== undefined && app.moveEvents === "onfinish") {
			var date = new Date(data.date);
			if (app.move) app.move(date);
		}
	});

	wsio.on('startResize', function(data) {
		resetIdle();

		var app = applications[data.id];
		if(app !== undefined && app.resizeEvents === "onfinish") {
			var date = new Date(data.date);
			if (app.startResize) app.startResize(date);
		}
	});

	wsio.on('finishedResize', function(data) {
		resetIdle();
		var app = applications[data.id];
		if(app !== undefined && app.resizeEvents === "onfinish") {
			var date = new Date(data.date);
			if (app.resize) app.resize(date);
		}
	});

	wsio.on('animateCanvas', function(data) {
		var app = applications[data.id];
		if(app !== undefined && app !== null){
			var date = new Date(data.date);
			app.refresh(date);
			wsio.emit('finishedRenderingAppFrame', {id: data.id, fps: app.maxFPS});
		}
	});

	wsio.on('eventInItem', function(event_data) {
		var date = new Date(event_data.date);
		var app  = applications[event_data.id];

		app.SAGE2Event(event_data.type, event_data.position, event_data.user, event_data.data, date);

		/*
		// adding pointer information to the event
        event_data.data.pname  = event_data.user_label;
        event_data.data.pcolor = event_data.user_color;
		app.event(event_data.eventType, event_data.user_id, event_data.itemRelativeX, event_data.itemRelativeY, event_data.data, date);
		*/
	});

	wsio.on('requestNewControl', function(data) {
		var dt = new Date(data.date);
		if (data.elemId !== undefined && data.elemId !== null){
			if(controlObjects[data.elemId] !== undefined){

				var spec = controlObjects[data.elemId].controls;
				if (spec.controlsReady()===true){
					var size = spec.computeSize();
					wsio.emit('addNewControl', {
						id:data.elemId+ data.user_id + "_controls",
						appId : data.elemId,
						left:data.x-size.height/2,
						top:data.y-size.height/2,
						width:size.width,
						height:size.height,
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
			ctrDiv.style.left = (data.left-ui.offsetX).toString() + "px";
			ctrDiv.style.top = (data.top-ui.offsetY).toString() + "px";
			ctrDiv.style.zIndex = "9990".toString();
			ctrDiv.style.display = data.show? "block":"none";
			if (ui.noDropShadow===true) ctrDiv.style.boxShadow = "none";

			var spec = controlObjects[data.appId].controls;
			if (spec.controlsReady() === true){
				var handle = new SAGE2WidgetControlInstance(data.id, spec);
				ctrDiv.appendChild(handle);
				ui.main.appendChild(ctrDiv);
				controlItems[data.id] = {show:data.show, divHandle:ctrDiv};
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

	wsio.on('executeControlFunction', function(data){
		var ctrl = getWidgetControlInstanceById(data.ctrl);
		if(ctrl){
			var ctrlId = ctrl.attr('id');
			var action = "buttonPress";
			var ctrlParent = ctrl.parent();
			if (/button/.test(ctrlId)){
				ctrl = ctrlParent.select("path") || ctrlParent.select("text") || ctrlParent.select("svg");
				var animationInfo = ctrlParent.data("animationInfo");
				if (animationInfo.textual === false && animationInfo.animation === true){
					var delay = animationInfo.delay;
					var state = animationInfo.state;
					var fromPath = animationInfo.from;
					var toPath = animationInfo.to;
					var fromFill = animationInfo.fill;
					var toFill = animationInfo.toFill;
					if (toFill === null || toFill === undefined) toFill = fromFill;
					if (state===null){
						ctrl.animate({"path":toPath, "fill":toFill}, delay, mina.bounce, function(){
							ctrl.animate({"path":fromPath, "fill":fromFill}, delay, mina.bounce);
						});

					}
					else{
						animationInfo.state = 1 - animationInfo.state;
						ctrl.data("animationInfo", animationInfo);
						//ctrl.animate({"path":path, "fill":fill}, delay, mina.bounce);
					}
				}
				ctrlId = ctrlParent.attr("id").replace("button", "");
			}

			else {
				ctrlId = ctrlParent.attr("id").replace("slider", "");
				action = "sliderRelease";
			}

			var appId = data.ctrl.appId;
			var app   = applications[appId];
			switch(ctrlId) {
				case "CloseApp":
					if (isMaster){
						wsio.emit('closeAppFromControl', {appId:appId});
					}
					break;
				case "CloseWidget":
					if (isMaster){
						wsio.emit('hideWidgetFromControl', {instanceID:data.ctrl.instanceID});
					}
					break;
				default:
					app.SAGE2Event("widgetEvent", null, data.user, {ctrlId: ctrlId, action:action}, new Date(data.date));
					break;
			}

			// Check whether a request for clone was made.
			if (app.cloneable === true && app.requestForClone === true) {
				app.requestForClone = false;
				console.log("cloning app:" + appId);
				if (isMaster)
					wsio.emit('createAppClone', {id : appId, state: app.state});
			}

		}

	});

	wsio.on('sliderKnobLockAction', function(data){
		var ctrl   = getWidgetControlInstanceById(data.ctrl);
		var slider = ctrl.parent();
		var appId = data.ctrl.appId;
		var app = applications[appId];
		var ctrlId = slider.attr("id").replace("slider", "");
		app.SAGE2Event("widgetEvent", null, data.user, {ctrlId: ctrlId, action:"sliderLock"}, new Date(data.date));
		var ctrHandle    = document.getElementById(slider.data("instanceID"));
		var widgetOffset = ctrHandle? parseInt(ctrHandle.style.left):0;
		var pos = data.x-ui.offsetX-widgetOffset;
		var sliderKnob = slider.select("rect");
		var knobWidthHalf = parseInt(sliderKnob.attr("width")) / 2;
		var knobCenterX   = parseInt(sliderKnob.attr("x")) + knobWidthHalf;
		if (Math.abs(pos - knobCenterX) > knobWidthHalf){
			var updatedSliderInfo = mapMoveToSlider(sliderKnob, pos);
			var appObj = getProperty(applications[slider.data("appId")], slider.data("appProperty"));
			appObj.handle[appObj.property] = updatedSliderInfo.sliderValue;
			app.SAGE2Event("widgetEvent", null, data.user, {ctrlId: ctrlId, action:"sliderUpdate"}, new Date(data.date));
		}
	});

	wsio.on('moveSliderKnob', function(data) {
		var ctrl = getWidgetControlInstanceById(data.ctrl);
		var slider = ctrl.parent();
		var ctrHandle = document.getElementById(slider.data("instanceID"));
		var widgetOffset = ctrHandle? parseInt(ctrHandle.style.left):0;
		var pos = data.x-ui.offsetX-widgetOffset;
		var sliderKnob = slider.select("rect");
		var updatedSliderInfo = mapMoveToSlider(sliderKnob, pos);
		var appObj = getProperty(applications[slider.data("appId")], slider.data("appProperty"));
		appObj.handle[appObj.property] = updatedSliderInfo.sliderValue;
		var appId  = data.ctrl.appId;
		var app    = applications[appId];
		var ctrlId = slider.attr("id").replace("slider", "");
		app.SAGE2Event("widgetEvent", null, data.user, {ctrlId: ctrlId, action:"sliderUpdate"}, new Date(data.date));
	});

	wsio.on('keyInTextInputWidget', function(data) {
		var ctrl = getWidgetControlInstanceById(data);
		if (ctrl){
			var textInput = ctrl.parent();
			if (data.code !== 13) {
				insertTextIntoTextInputWidget(textInput, data.code, data.printable);
			}
			else{
				var ctrlId = textInput.attr("id").replace("textInput", "");
				var blinkControlHandle = textInput.data("blinkControlHandle");
				clearInterval(blinkControlHandle);
				var app = applications[data.appId];
				app.SAGE2Event("widgetEvent", null, data.user, {ctrlId: ctrlId, action:"textEnter", text:getTextFromTextInputWidget(textInput)}, Date.now());
			}
		}
	});

	wsio.on('activateTextInputControl', function(data){
		var ctrl = null;
		console.log("in activateTextInputContControl->", data);
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

	wsio.on('deactivateTextInputControl', function(data){ //Called when the user clicks outside the widget control while a lock exists on text input
		console.log("in deactivateTextInputContControl->", data);
		var ctrl = getWidgetControlInstanceById(data);
		if (ctrl) {
			var textInput = ctrl.parent();
			var blinkControlHandle = textInput.data("blinkControlHandle");
			clearInterval(blinkControlHandle);
		}
	});

	wsio.on('setAnnotationWindowPosition', function(position_data) {
		if (position_data.appId in annotationItems)
			annotationItems[position_data.appId].setPosition(position_data);
	});

	wsio.on('setAnnotationWindowPositionAndSize', function(data) {
		if (data.appId in annotationItems){
			annotationItems[data.appId].setPositionAndSize(data);
			annotationItems[data.appId].setAllMarkerPositionsAfterResize();
		}

	});
	
	wsio.on('createAnnotationWindow',function(data){
		var appAnnotation = new SAGE2Annotations();
		appAnnotation.makeWindow(data);
		appAnnotation.setOrder(data.zIndex);
		annotationItems[data.appId] = appAnnotation;
		var app    = applications[data.appId];
		Object.observe(app.state, function (changes) {
			for (var key in changes){
				if (changes[key].name === "page"){
					appAnnotation.showMarkersForPage({appId:data.appId, page: app.state.page});	
				}
			}
		});
	});

	wsio.on('deleteAnnotationWindow',function(data){
		annotationItems[data.appId].deleteWindow();
		delete annotationItems[data.appId];
	});

	wsio.on('showAnnotationWindow', function(data){
		annotationItems[data.appId].showWindow(data);
		var app = applications[data.appId];
		if (app){
			var page = app.state? app.state.page : 1;
			annotationItems[data.appId].showMarkersForPage({appId:data.appId, page: page});	
		}
		
	});
	wsio.on('hideAnnotationWindow', function(data){
		annotationItems[data.appId].hideWindow(data);
		var app = applications[data.appId];
		if (app){
			var page = app.state? app.state.page : 1;
			annotationItems[data.appId].hideMarkersForPage({appId:data.appId, page: page});	
		}
	});
	wsio.on('addNewNoteToAnnotationWindow', function(data){
		var annotationWindow = annotationItems[data.appId];
		if (annotationWindow){
			annotationItems[data.appId].addNote(data);	
			if (data.marker !== null){
				annotationWindow.createMarker(data);
			}
			annotationWindow.makeNoteEditable(data);
		}
	});

	wsio.on('addMarkerToNote', function(data){
		var annotationWindow = annotationItems[data.appId];
		if (annotationWindow){
			annotationWindow.createMarker(data);
			annotationWindow.makeNoteEditable(data);
		}
	});

	wsio.on('removeMarkerFromNote', function(data){
		var annotationWindow = annotationItems[data.appId];
		if (annotationWindow){
			annotationWindow.removeMarker(data);
			annotationWindow.makeNoteEditable(data);
		}
	});

	wsio.on('setAnnotationMarker', function(data){
		var annotationWindow = annotationItems[data.appId];
		if (annotationWindow){
			annotationWindow.setMarkerPosition(data);
		}
	});

	wsio.on('eventInAnnotationWindow', function(event_data){
		var date = new Date(event_data.date);
		var annotationWindow = annotationItems[event_data.appId];
		if (annotationWindow){
			annotationWindow.event(event_data.type, event_data.position, event_data.user, event_data.data, date);
		}
	});

	/*wsio.on('showAnnotationMarkersForPage', function(data){
		var annotationWindow = annotationItems[data.appId];
		if (annotationWindow){
			annotationWindow.showMarkersForPage({appId:data.appId, page: data.page});	
		}
	});*/

	wsio.on('makeNoteEditable', function(data){
		var annotationWindow = annotationItems[data.appId];
		if (annotationWindow){
			annotationWindow.makeNoteEditable(data);	
			if (data.marker){
				var app = applications[data.appId];
				if (app.hasOwnProperty("state")){
					if (app.state.hasOwnProperty("page")){
						app.state.page = data.marker.page;
						app.redraw = true;
						app.refresh(new Date());
					}
				}
			}
			
		}
	});

	wsio.on('makeAllNotesNonEditable', function(data){
		var annotationWindow = annotationItems[data.appId];
		if (annotationWindow){
			annotationWindow.makeAllNotesNonEditable();	
		}
	});

	wsio.on('deleteNote',function(data){
		var annotationWindow = annotationItems[data.appId];
		if (annotationWindow){
			annotationWindow.deleteNote(data);	
		}
	});
	/*wsio.on('receiveFileData', function(data){
		var app = applications[data.id];
		app.fileDataBuffer = data.buffer;
		app.fileReceived = true;
		console.log("file Data:",app.fileDataBuffer);
	});*/
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
		console.log(data);
		dataSharingPortals[data.id] = new DataSharing(data);
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
	if (ui.noDropShadow===true) windowTitle.style.boxShadow = "none";

	var windowIcons = document.createElement("img");
	//windowIcons.src = "images/layout3.webp";
	windowIcons.src = "images/layout3.png";
	windowIcons.height = Math.round(titleBarHeight);
	windowIcons.style.position = "absolute";
	windowIcons.style.right    = "0px";
	windowTitle.appendChild(windowIcons);

	var titleText = document.createElement("p");
	titleText.style.lineHeight = Math.round(titleBarHeight) + "px";
	titleText.style.fontSize   = Math.round(titleTextSize) + "px";
	titleText.style.color      = "#FFFFFF";
	titleText.style.marginLeft = Math.round(titleBarHeight/4) + "px";
	titleText.textContent      = data.title;
	windowTitle.appendChild(titleText);

	var windowItem = document.createElement("div");
	windowItem.id  = data.id;
	windowItem.className      = "windowItem";
	windowItem.style.left     = (-offsetX).toString() + "px";
	windowItem.style.top      = (titleBarHeight-offsetY).toString() + "px";
	windowItem.style.webkitTransform = translate;
	windowItem.style.mozTransform    = translate;
	windowItem.style.transform       = translate;
	windowItem.style.overflow = "hidden";
	windowItem.style.zIndex   = itemCount.toString();
	if (ui.noDropShadow === true) windowItem.style.boxShadow = "none";

	var cornerSize = Math.min(data.width, data.height) / 5;
    var dragCorner = document.createElement("div");
    dragCorner.className      = "dragCorner";
    dragCorner.style.position = "absolute";
    dragCorner.style.width    = cornerSize.toString() + "px";
    dragCorner.style.height   = cornerSize.toString() + "px";
    dragCorner.style.top      = (data.height-cornerSize).toString() + "px";
    dragCorner.style.left     = (data.width-cornerSize).toString() + "px";
	dragCorner.style.backgroundColor = "rgba(255,255,255,0.0)";
    dragCorner.style.border   = "none";
    dragCorner.style.zIndex   = "1";
    windowItem.appendChild(dragCorner);

	parent.appendChild(windowTitle);
	parent.appendChild(windowItem);

	// App launched in window
	if(data.application === "media_stream") wsio.emit('receivedMediaStreamFrame', {id: data.id});
    if(data.application === "media_block_stream") wsio.emit('receivedMediaBlockStreamFrame', {id: data.id, newClient: true});

	// convert url if hostname is alias for current origin
	var url = cleanURL(data.url);

	function loadApplication() {
		var init = {
			id:     data.id,
			x:      data.left,
			y:      data.top+titleBarHeight,
			width:  data.width,
			height: data.height,
			resrc:  url,
			state:  data.data,
			date:   date
		};

		// load new app
		if(window[data.application] === undefined) {
			var js = document.createElement("script");
			js.addEventListener('error', function(event) {
				console.log("Error loading script: " + data.application + ".js");
			}, false);
			js.addEventListener('load', function(event) {
				var newapp = new window[data.application]();
				newapp.init(init);
				//newapp.SAGE2Init(init);

				//if (newapp.state !== undefined) {
				//	Object.observe(newapp.state, function (changes) {
				//		if(isMaster) wsio.emit('updateAppState', {id: data.id, state: newapp.state});
				//	}, ['update', 'add']);
				//}

				//newapp.load(data.data, date);
				newapp.refresh(date);

				applications[data.id]   = newapp;
				controlObjects[data.id] = newapp;

				if(data.animation === true) wsio.emit('finishedRenderingAppFrame', {id: data.id});
			}, false);
			js.type = "text/javascript";
			js.src = url + "/" + data.application + ".js";
			console.log(url + "/" + data.application + ".js");
			document.head.appendChild(js);
		}

		// load existing app
		else {
			var app = new window[data.application]();
			app.init(init);
			//app.SAGE2Init(init);

			//if(app.state !== undefined){
			// 	Object.observe(app.state, function(changes) {
			// 		if(isMaster) wsio.emit('updateAppState', {id: data.id, state: app.state});
			// 	}, ['update', 'add']);
			//}

			//app.load(data.data, date);
			app.refresh(date);

			applications[data.id] = app;
			controlObjects[data.id] = app;

			if (data.animation === true) wsio.emit('finishedRenderingAppFrame', {id: data.id});
			if (data.application === "movie_player") setTimeout(function() { wsio.emit('requestVideoFrame', {id: data.id}); }, 500);
		}
	}

	// load all dependencies
	if(data.resrc === undefined || data.resrc === null || data.resrc.length === 0){
		loadApplication();
	}
	else {
		var loadResource = function(idx) {
			if (dependencies[data.resrc[idx]] !== undefined) {
				if((idx+1) < data.resrc.length) {
					loadResource(idx+1);
				}
				else {
					console.log("all resources loaded");
					loadApplication();
				}

				return;
			}

			dependencies[data.resrc[idx]] = false;

			var js = document.createElement("script");
			js.addEventListener('error', function(event) {
				console.log("Error loading script: " + data.resrc[idx]);
			}, false);

			js.addEventListener('load', function(event) {
				dependencies[data.resrc[idx]] = true;

				if((idx+1) < data.resrc.length) {
					loadResource(idx+1);
				}
				else {
					console.log("all resources loaded");
					loadApplication();
				}
			});
			js.type = "text/javascript";
			if (data.resrc[idx].indexOf("http://") === 0 || data.resrc[idx].indexOf("https://") === 0 )
				js.src = data.resrc[idx];
			else
				js.src = url + "/" + data.resrc[idx];
			document.head.appendChild(js);
		};
		// Start loading the first resource
		loadResource(0);
	}

	itemCount += 2;
}

function getTransform(elem) {
	var transform = elem.style.transform;
	var translate = {x: 0, y: 0};
	var scale = {x: 1, y: 1};
	if (transform) {
		var tIdx = transform.indexOf("translate");
		if(tIdx >= 0) {
			var tStr = transform.substring(tIdx+10, transform.length);
			tStr = tStr.substring(0, tStr.indexOf(")"));
			var tValue = tStr.split(",");
			translate.x = parseFloat(tValue[0]);
			translate.y = parseFloat(tValue[1]);
		}
		var sIdx = transform.indexOf("scale");
		if(sIdx >= 0) {
			var sStr = transform.substring(sIdx+6, transform.length);
			sStr = sStr.substring(0, sStr.indexOf(")"));
			var sValue = sStr.split(",");
			scale.x = parseFloat(sValue[0]);
			scale.y = parseFloat(sValue[1]);
		}
	}
	return {translate: translate, scale: scale};
}
