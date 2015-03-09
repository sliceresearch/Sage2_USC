// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-15


window.URL = (window.URL || window.webkitURL || window.msURL || window.oURL);

var clientID;
var wsio;
var hostname;
var port;
var dt;
var isMaster;
var dbugVar = 0;
var hostAlias    = {};

var itemCount = 0;
var pdfItems  = {};
var pointerItems   = {};
var controlItems   = {};
var controlObjects = {};
var lockedControlElements = {} ;

var canvasItems  = {};

var applications = {};
var dependencies = {};

// UI object to build the element on the wall
var ui;
var uiTimer = null;
var uiTimerDelay;

// Explicitely close web socket when web browser is closed
window.onbeforeunload = function() {
	if(wsio !== undefined) wsio.close();
};

function resetIdle() {
	if (uiTimer) {
		clearTimeout(uiTimer);
		ui.showInterface();
		uiTimer = setTimeout(function() { ui.hideInterface(); }, uiTimerDelay*1000);
	}
}

function SAGE2_init() {
	hostname = window.location.hostname;
	port     = window.location.port;
	if(window.location.protocol === "http:"  && port === "") port = "80";
	if(window.location.protocol === "https:" && port === "") port = "443";
	
	clientID = parseInt(getParameterByName("clientID")) || 0;
	console.log("clientID: " + clientID);
	
	wsio = new websocketIO();
	console.log("Connected to server: ", window.location.origin);
	
	isMaster = false;
	
	wsio.open(function() {
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
		wsio.emit('addClient', clientDescription);
		log("open websocket");
	});

	// Socket close event (ie server crashed)		
	wsio.on('close', function (evt) {
		var refresh = setInterval(function () {
			// make a dummy request to test the server every 2 sec
			xhr = new XMLHttpRequest();
			xhr.open("GET", "/", true);
			xhr.onreadystatechange = function() {
				if(xhr.readyState == 4 && xhr.status == 200){
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

	wsio.on('initialize', function(data) {
		var startTime  = new Date(data.start);
		var serverTime = new Date(data.time);
		var clientTime = new Date();
		
		dt = clientTime - serverTime;
		
		// Global initialization
		SAGE2_initialize(startTime);
	});
	
	wsio.on('setAsMasterDisplay', function() {
		isMaster = true;
	});
	
	wsio.on('broadcast', function(data) {
		if(applications[data.app] === undefined){
			// should have better way to determine if app is loaded
			setTimeout(function() {
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
		
		http_port = json_cfg.index_port === "80" ? "" : ":"+json_cfg.index_port;
		https_port = json_cfg.port === "443" ? "" : ":"+json_cfg.port;
		hostAlias["http://"  + json_cfg.host + http_port]  = window.location.origin;
		hostAlias["https://" + json_cfg.host + https_port] = window.location.origin;
		for(i=0; i<json_cfg.alternate_hosts.length; i++) {
			hostAlias["http://"  + json_cfg.alternate_hosts[i] + http_port]  = window.location.origin;
			hostAlias["https://" + json_cfg.alternate_hosts[i] + https_port] = window.location.origin;
		}

		// Build the elements visible on the wall
		ui = new uiBuilder(json_cfg, clientID);
		ui.build();
		ui.background();
		if (json_cfg.ui.auto_hide_ui) {
			// default delay is 30s if not specified
			uiTimerDelay = json_cfg.ui.auto_hide_delay ? parseInt(json_cfg.ui.auto_hide_delay,10) : 30;
			uiTimer      = setTimeout(function() { ui.hideInterface(); }, uiTimerDelay*1000);
		}
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
		ui.connectedToRemoteSite(data);
	});
	
	wsio.on('createSagePointer', function(pointer_data){
		ui.createSagePointer(pointer_data);
    });
    
    wsio.on('showSagePointer', function(pointer_data){
		ui.showSagePointer(pointer_data);
		resetIdle();
    });
    
    wsio.on('hideSagePointer', function(pointer_data){
		ui.hideSagePointer(pointer_data);
    });
    
    //wsio.on('updateSagePointerPosition', function(pointer_data){
    wsio.on('upp', function(pointer_data){
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
	
	wsio.on('showRadialMenu', function(menu_data){
		ui.showRadialMenu(menu_data);
    });
	wsio.on('radialMenuEvent', function(menu_data){
		ui.radialMenuEvent(menu_data);
		resetIdle();
    });
	
	wsio.on('updateRadialMenu', function(menu_data){
		ui.updateRadialMenu(menu_data);
		resetIdle();
    });
	
	wsio.on('updateMediaStreamFrame', function(data) {
		wsio.emit('receivedMediaStreamFrame', {id: data.id});
		
		var app = applications[data.id];
		if(app !== undefined && app !== null){
			app.load(data.state);
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
				applications[appId].draw(new Date(date));
				applications[appId].setValidBlocksFalse();
                wsio.emit('receivedMediaBlockStreamFrame', {id: appId});
			}
		}
	});
	
	wsio.on('updateVideoFrame', function(data) {
		var appId     = byteBufferToString(data);
		var blockIdx  = byteBufferToInt(data.subarray(appId.length+1, appId.length+ 3));
		var frameIdx  = byteBufferToInt(data.subarray(appId.length+3, appId.length+ 7));
		var date      = byteBufferToInt(data.subarray(appId.length+7, appId.length+15));
		var yuvBuffer = data.subarray(appId.length+15, data.length);
		
		if(applications[appId] !== undefined && applications[appId] !== null){
			applications[appId].textureData(blockIdx, yuvBuffer);
			if(applications[appId].receivedBlocks.every(isTrue) === true){
				applications[appId].draw(new Date(date));
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
		resetIdle();

		var date = new Date(data.date);

		var translate = "translate(" + data.left + "px," + data.top + "px)";
		
		var windowTitle = document.createElement("div");
		windowTitle.id  = data.id + "_title";
		windowTitle.className    = "windowTitle";
		windowTitle.style.width  = data.width.toString() + "px";
		windowTitle.style.height = ui.titleBarHeight.toString() + "px";
		windowTitle.style.left   = (-ui.offsetX).toString() + "px";
		windowTitle.style.top    = (-ui.offsetY).toString() + "px";
		windowTitle.style.webkitTransform = translate;
		windowTitle.style.mozTransform    = translate;
		windowTitle.style.transform       = translate;
		windowTitle.style.zIndex = itemCount.toString();
		if (ui.noDropShadow===true) windowTitle.style.boxShadow = "none";
		ui.main.appendChild(windowTitle);

		var windowIcons = document.createElement("img");
		windowIcons.src = "images/layout3.webp";
		windowIcons.height = Math.round(ui.titleBarHeight);
		windowIcons.style.position = "absolute";
		windowIcons.style.right    = "0px";
		windowTitle.appendChild(windowIcons);

		var titleText = document.createElement("p");
		titleText.style.lineHeight = Math.round(ui.titleBarHeight) + "px";
		titleText.style.fontSize   = Math.round(ui.titleTextSize) + "px";
		titleText.style.color      = "#FFFFFF";
		titleText.style.marginLeft = Math.round(ui.titleBarHeight/4) + "px";
		titleText.textContent      = data.title;
		windowTitle.appendChild(titleText);
		
		var windowItem = document.createElement("div");
		windowItem.id  = data.id;
		windowItem.className      = "windowItem";
		windowItem.style.left     = (-ui.offsetX).toString() + "px";
		windowItem.style.top      = (ui.titleBarHeight-ui.offsetY).toString() + "px";
		windowItem.style.webkitTransform = translate;
		windowItem.style.mozTransform    = translate;
		windowItem.style.transform       = translate;
		windowItem.style.overflow = "hidden";
		windowItem.style.zIndex   = (itemCount+1).toString();
		if (ui.noDropShadow === true) windowItem.style.boxShadow = "none";
		ui.main.appendChild(windowItem);
		
		// App launched in window 
		if(data.application === "media_stream") wsio.emit('receivedMediaStreamFrame', {id: data.id});
        if(data.application === "media_block_stream") wsio.emit('receivedMediaBlockStreamFrame', {id: data.id, newClient: true});
		
		// convert url if hostname is alias for current origin
		var url = cleanURL(data.url);
		
		// Not used yet: missing scope....
		function observer(changes) {
			if (change.type==='add' && !!change.object[change.name]) {
				if (isArray(change.object[change.name])) {
					// If adding an array, observe it too  (works natively, not available as polyfill)
					if (Array.observe)
						Array.observe(change.object[change.name], observer, ['add','update']);
				} else if (isObject(change.object[change.name])) {
					// If adding an object, observe it too
					Object.observe(change.object[change.name], observer, ['add','update']);
				} else {
					// added a value, all good
				}
			}
			if (change.object[change.name]===null) {
				// added a null value, all good
			}
		}

		function loadApplication() {
			var init = {
				id:     data.id,
				x:      data.left,
				y:      data.top+ui.titleBarHeight,
				width:  data.width,
				height: data.height, 
				resrc:  url,
				date:   date
			};
			
			// load new app
			if(window[data.application] === undefined) {
				var js = document.createElement("script");
				js.addEventListener('error', function(event) {
					console.log("Error loading script: " + data.application + ".js");
				}, false);
				js.addEventListener('load', function(event) {
					var app = new window[data.application]();
					app.init(init);

					if(app.state !== undefined && clientID===0){
						Object.observe(app.state, function (changes) {
							//observer(changes);
							wsio.emit('updateAppState', {id: data.id, state: app.state});
						}, ['update', 'add']);
					}
					
					app.load(data.data, date);
					app.refresh(date);
					
					applications[data.id] = app;
					controlObjects[data.id] = app; 

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

				if(app.state !== undefined && clientID===0){
					Object.observe(app.state, function(changes) {
						//observer(changes);
						wsio.emit('updateAppState', {id: data.id, state: app.state});
					}, ['update', 'add']);
				}
				
				app.load(data.data, date);
				app.refresh(date);
				
				applications[data.id] = app;
				controlObjects[data.id] = app; 
				 
				if(data.animation === true) wsio.emit('finishedRenderingAppFrame', {id: data.id});
				if(data.application === "movie_player") setTimeout(function() {wsio.emit('requestVideoFrame', {id: data.id});}, 500);
			}
		}
		
		// load all dependencies
		if(data.resrc === undefined || data.resrc === null || data.resrc.length === 0){
			loadApplication();
		}
		else {
			var loadResource = function(idx) {
				if (dependencies[data.resrc[idx]] === true) {
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
				js.src = url + "/" + data.resrc[idx];
				document.head.appendChild(js);
			};
			
			loadResource(0);
			
			/*
			var i;
			var resources = {};
			for(i=0; i<data.resrc.length; i++){
				// check dependency cache first
				if (dependencies[data.resrc[i]] !== true) {
					dependencies[data.resrc[i]] = false;
					resources[data.resrc[i]] = false;
				}
			}
			
			if(isEmpty(resources)){
				console.log("all resources loaded");
				loadApplication();
			}
			
			Object.keys(resources).forEach(function(key) {
				if(resources.hasOwnProperty(key)) {
					var js = document.createElement("script");
					js.addEventListener('error', function(event) {
						console.log("Error loading script: " + key);
					}, false);
	
					js.addEventListener('load', function(event) {
						dependencies[key] = true;
						resources[key] = true;
						if(allTrueDict(resources)){
							console.log("all resources loaded");
							loadApplication();
						}
					}, false);
					js.type = "text/javascript";
					js.src = url + "/" + key;
					document.head.appendChild(js);
				}
			});
			*/
		}
		
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
		
		itemCount += 2;
		
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
					delete controlItems[item];
				}

			}
			delete controlObjects[elem_data.elemId];
			//var deleteElemCtrl = document.getElementById(elem_data.elemId + "_controls");
			//if (deleteElemCtrl) deleteElemCtrl.parentNode.removeChild(deleteElemCtrl);
			//delete controlItems[elem_data.elemId + "_controls"];
		}
	});

	wsio.on ('hideControl', function(ctrl_data){
		if (ctrl_data.id in controlItems && controlItems[ctrl_data.id].show === true) {
			//var hideElemCtrl = document.getElementById(ctrl_data.id);
			//hideElemCtrl.style.display = 'none';
			controlItems[ctrl_data.id].divHandle.style.display = "none";
			controlItems[ctrl_data.id].show=false;
		}
	});

	wsio.on ('showControl', function(ctrl_data){
		if (ctrl_data.id in controlItems && controlItems[ctrl_data.id].show === false) {
			//var showElemCtrl = document.getElementById(ctrl_data.id);
			//showElemCtrl.style.display = 'block';
			controlItems[ctrl_data.id].divHandle.style.display = "block";
			controlItems[ctrl_data.id].show=true;
		}
	});
	
	wsio.on('updateItemOrder', function(order) {
		resetIdle();

		var i;
		var zval = 0;
		for(i=0; i<order.idList.length; i++){
			var selectedElemTitle = document.getElementById(order.idList[i] + "_title");
			var selectedElem = document.getElementById(order.idList[i]);
			//var selectedElemCtrl = document.getElementById(order.idList[i] + "_controls");

			selectedElemTitle.style.zIndex = zval.toString();
			selectedElem.style.zIndex = (zval+1).toString();
			//selectedElemCtrl.style.zIndex = (zval+2).toString();
			
			zval += 2; // 
		}
	});
	
	wsio.on('hoverOverItemCorner', function(elem_data) {
		var selectedElem = document.getElementById(elem_data.elemId);
		var dragCorner   = selectedElem.getElementsByClassName("dragCorner");
		if(elem_data.flag){
			dragCorner[0].style.backgroundColor = "rgba(255,255,255,0.7)";
        	dragCorner[0].style.border = "2px solid #333333";
        }
        else{
        	dragCorner[0].style.backgroundColor = "rgba(255,255,255,0.0)";
        	dragCorner[0].style.border = "none";
        }
	});

	wsio.on('setItemPosition', function(position_data) {
		resetIdle();
		
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
			app.sage2_x      = parseInt(position_data.elemLeft, 10);
			app.sage2_y      = parseInt(position_data.elemTop+ui.titleBarHeight, 10);
			
			var date  = new Date(position_data.date);
			if(position_data.force || app.moveEvents === "continuous") {
				app.move(date);
			}
		}

	});
	
	wsio.on('setControlPosition', function(position_data) {
		var date = new Date(position_data.date);
		
		var eLeft = position_data.elemLeft - ui.offsetX;
		var eTop = position_data.elemTop - ui.offsetY;
		var selectedControl = document.getElementById(position_data.elemId);
		
		if(selectedControl !== undefined && selectedControl !== null) {
			selectedControl.style.left = eLeft.toString() + "px";
			selectedControl.style.top = eTop.toString() + "px";
		}
		else {
			console.log("cannot find control: " + position_data.elemId);
		}
	});

	wsio.on('setItemPositionAndSize', function(position_data) {
		resetIdle();
		
		var translate = "translate(" + position_data.elemLeft + "px," + position_data.elemTop + "px)";
		var selectedElemTitle = document.getElementById(position_data.elemId + "_title");
		selectedElemTitle.style.webkitTransform = translate;
		selectedElemTitle.style.mozTransform    = translate;
		selectedElemTitle.style.transform       = translate;
		selectedElemTitle.style.width = Math.round(position_data.elemWidth).toString() + "px";
		
		var selectedElem = document.getElementById(position_data.elemId);
		selectedElem.style.webkitTransform = translate;
		selectedElem.style.mozTransform    = translate;
		selectedElem.style.transform       = translate;
		
		var dragCorner = selectedElem.getElementsByClassName("dragCorner");
		var cornerSize = Math.min(position_data.elemWidth, position_data.elemHeight) / 5;
		dragCorner[0].style.width  = cornerSize.toString() + "px";
        dragCorner[0].style.height = cornerSize.toString() + "px";
        dragCorner[0].style.top    = (Math.round(position_data.elemHeight)-cornerSize).toString() + "px";
        dragCorner[0].style.left   = (Math.round(position_data.elemWidth)-cornerSize).toString()  + "px";
		
		var child = selectedElem.getElementsByClassName("sageItem");

		// if the element is a div, resize should use the style object
		if(child[0].tagName.toLowerCase() == "div") {
			child[0].style.width  = Math.round(position_data.elemWidth)  + "px";
			child[0].style.height = Math.round(position_data.elemHeight) + "px";
		}
		else{
			// if it's a canvas, just use width and height
			child[0].width  = Math.round(position_data.elemWidth);
			child[0].height = Math.round(position_data.elemHeight);
		}

		var app = applications[position_data.elemId];
		if(app !== undefined) {
			app.sage2_x      = parseInt(position_data.elemLeft, 10);
			app.sage2_y      = parseInt(position_data.elemTop+ui.titleBarHeight, 10);
			app.sage2_width  = parseInt(position_data.elemWidth, 10);
			app.sage2_height = parseInt(position_data.elemHeight, 10);
			
			var date = new Date(position_data.date);
			if(position_data.force || app.resizeEvents === "continuous") {
				if (app.resize) app.resize(date);
			}
			if(position_data.force || app.moveEvents === "continuous") {
				if (app.move) app.move(date);
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
			wsio.emit('finishedRenderingAppFrame', {id: data.id, fps:app.maxFPS});
		}
	});
	
	wsio.on('eventInItem', function(event_data){
		var date = new Date(event_data.date);
		var app  = applications[event_data.id];
		
		app.event(event_data.type, event_data.position, event_data.user, event_data.data, date);
		
		/*
		// adding pointer information to the event
        event_data.data.pname  = event_data.user_label;
        event_data.data.pcolor = event_data.user_color;
		app.event(event_data.eventType, event_data.user_id, event_data.itemRelativeX, event_data.itemRelativeY, event_data.data, date);
		*/
	});

	wsio.on('requestNewControl', function(data){
		var dt = new Date(data.date);
		var selectedElem = data.elemId ? document.getElementById(data.elemId) : null;
		if (data.elemId !== undefined && data.elemId !== null){
			if(controlObjects[data.elemId] !== undefined){

				var spec = controlObjects[data.elemId].controls;
				if (spec.controlsReady()===true){
					var size = spec.computeSize();
					wsio.emit('addNewControl', {
						id:data.elemId+ data.user_id + "_controls", 
						objID : data.elemId,
						left:data.x,
						top:data.y,
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

	wsio.on('createControl', function(data){
		if (controlItems[data.id] === null || controlItems[data.id] === undefined) {
			var ctrDiv =  document.createElement("div");
			ctrDiv.id = data.id;
			ctrDiv.className = "windowControls";
			ctrDiv.style.width = data.width.toString() + "px";
			ctrDiv.style.fill = "rgba(0,0,0,0.0)";
			ctrDiv.style.height = data.height.toString() + "px";
			ctrDiv.style.left = (data.left-ui.offsetX).toString() + "px";
			ctrDiv.style.top = (data.top-ui.offsetY).toString() + "px";
			ctrDiv.style.zIndex = "9999".toString();
			if (ui.noDropShadow===true) ctrDiv.style.boxShadow = "none";

			var spec = controlObjects[data.objID].controls;
			if (spec.controlsReady() === true){
				var handle = new SAGE2WidgetControlInstance(data.id, spec);
				ctrDiv.appendChild (handle);	
				ui.main.appendChild(ctrDiv);
				controlItems[data.id] = {show:true,divHandle:ctrDiv};
			}
			
		}
	});
	wsio.on('removeControlsForUser', function(data){
		for (var idx in controlItems) {
			if (idx.indexOf(data.user_id) > -1) {
				controlItems[idx].divHandle.parentNode.removeChild(controlItems[idx].divHandle);
				delete controlItems[idx];
			}
		}
	});
	
	wsio.on('requestControlId', function(data) {
		var ctrl  = getWidgetControlUnderPointer(data, ui.offsetX, ui.offsetY);
		var ctrId = ctrl? ctrl.attr("id"):"";
		var regC  = /_controls/;
		var regB  = /button/;
		var regS  = /slider/;
		var regTI = /textInput/;
		if (lockedControlElements[data.ptrId]){
			var lckedCtrl = lockedControlElements[data.ptrId];
			var lckedCtrlId = lckedCtrl.attr("id");
			if (regTI.test(lckedCtrlId)){
				var textInput1 = lckedCtrl.parent();
				var blinkControlHandle1 = textInput1.data("blinkControlHandle");
				clearInterval(blinkControlHandle1);	
			}
			
		}

		if ( regC.test(ctrId)|| regB.test(ctrId) || regS.test(ctrId) || regTI.test(ctrId)){
			var temp = regC.test(ctrId)? null:ctrId;
			
			var aId = ctrl.data("appId");
			if(regTI.test(ctrId)===true){
				var textInput2 = ctrl.parent();
				var blinkControlHandle2 = setInterval(textInput2.data("blinkCallback"),1000);
				textInput.data("blinkControlHandle",blinkControlHandle2);
			}
			/*if (regS.test(ctrId)){ // Check whether the knob should be locked to this pointer
				if(/line/.test(ctrId) || /knob/.test(ctrId))
			}*/
			wsio.emit('selectedControlId', { 
				addr:data.addr,
				pointerX: data.x,
				pointerY: data.y,
				ctrlId: temp,
				instanceID: ctrl.parent().data("instanceID"),
				appId: aId
			});
			lockedControlElements[data.ptrId] = ctrl; 
		}
	});

	wsio.on('releaseControlId', function(data){
		var regexSlider = /slider/;
		var regexButton = /button/;
		var regexTextInput = /textInput/;
		var lockedControl = lockedControlElements[data.ptrId];
		
		if (lockedControl){
			if (regexTextInput.test(lockedControl.attr("id"))===false)
				lockedControlElements[data.ptrId] = null;
			var ctrl = getWidgetControlUnderPointer(data, ui.offsetX, ui.offsetY);
			var ctrlId = ctrl? ctrl.attr("id"): "";
			if (regexSlider.test(lockedControl.attr("id")) || (regexButton.test(ctrlId) && (lockedControl.attr("id") === ctrlId))){
				wsio.emit('releasedControlId', { 
					addr:data.addr,
					pointerX: data.x,
					pointerY: data.y,
					instanceID: lockedControl.parent().data("instanceID"),
					ctrlId: lockedControl.attr("id"),
					appId: lockedControl.data("appId")
				});

			}
		}
		

		
	});
	wsio.on('executeControlFunction', function(data){
		var ctrl = getWidgetControlById(data);
		if(ctrl){
			var ctrId = ctrl.attr('id');
			if (/button/.test(ctrId)){
				ctrl = ctrl.parent().select("path") || ctrl.parent().select("text");
				var animationInfo = ctrl.data("animationInfo") ;
				if (animationInfo.textual === false && animationInfo.animation === true){
					var delay = animationInfo.delay;
					var state = animationInfo.state;
					var fromPath = animationInfo.from;
					var toPath = animationInfo.to;
					var fromFill = animationInfo.fill;
					var toFill = animationInfo.toFill;
					if (toFill === null || toFill === undefined) toFill = fromFill;
					if (state===null){
						ctrl.animate({"path":toPath, "fill":toFill},delay,mina.bounce,function(){
							ctrl.animate({"path":fromPath, "fill":fromFill},delay,mina.bounce);	
						});
						
					}
					else{
						animationInfo.state = 1 - animationInfo.state;
						ctrl.data("animationInfo", animationInfo);
						//ctrl.animate({"path":path, "fill":fill},delay,mina.bounce);
					}
				}
				
			}
			var func = ctrl.parent().data("call");
			var appId = ctrl.parent().data("appId");
			var app = applications[appId];
			if (func !== undefined && func !== null)
				func(new Date());	
			//Check whether a request for clone was made.
			if(app.cloneable === true && app.requestForClone === true){
				app.requestForClone = false;
				console.log("cloning app:" + appId);
				if(isMaster)
					wsio.emit('createAppClone', {id : appId, cloneData: app.cloneData});
			}
			
		}
		
	});
	
	wsio.on('sliderKnobLockAction', function(data){
		var ctrl = getWidgetControlById(data);
		var slider = ctrl.parent();
		var func = slider.data("lockCall");
		if (func !== undefined && func !== null)
			func(new Date());	
	});
	wsio.on('moveSliderKnob', function(data){
		var ctrl = getWidgetControlById(data.ctrl);
		var slider = ctrl.parent();
		var ctrHandle = document.getElementById(slider.data("instanceID"));
		var widgetOffset = ctrHandle? parseInt(ctrHandle.style.left):0;
		var pos = data.x-ui.offsetX-widgetOffset;			
		var sliderKnob = slider.select("rect");
		var val = mapMoveToSlider(sliderKnob, pos);
		var app = getProperty(applications[slider.data("appId")],slider.data("appProperty"));
		app.handle[app.property] = val;
		var func = slider.data("updateCall");
			if (func !== undefined && func !== null)
				func(new Date());
	});

	wsio.on('keyInTextInputWidget', function(data){
		var ctrl = getWidgetControlById(data);
		if (ctrl){
			var textInput = ctrl.parent();

			if (data.code != 13){
				insertText(textInput, data.code, data.printable);
			}
			else{
				var func = textInput.data("call");
				var blinkControlHandle = textInput.data("blinkControlHandle");
				clearInterval(blinkControlHandle);
				if (func !== undefined && func !== null)
					func(getText(textInput));
			}		
		}
	});
	wsio.on('dropTextInputControl', function(data){ //Called when the user clicks outside the widget control while a lock exists on text input
		var ctrl = getWidgetControlById(data);
		if (ctrl){
			var textInput = ctrl.parent();
			var blinkControlHandle = textInput.data("blinkControlHandle");
			clearInterval(blinkControlHandle);		
		}
	});

	/*wsio.on('receiveFileData', function(data){
		var app = applications[data.id];
		app.fileDataBuffer = data.buffer;
		app.fileReceived = true;
		console.log("file Data:",app.fileDataBuffer);
	});*/
}
