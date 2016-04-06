// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-15

/* global Kinetic, simplify */

"use strict";

/**
 * Client-side application for drawing, leverages Wacom plugin if present
 *
 * @module client
 * @submodule SAGE2_DrawingApp
 * @class SAGE2_DrawingApp
 */


var wsio_global;

var plugin;
var canvas;
var canvasPos    = {x: 0.0, y: 0.0};
var canvasSize   = {width: 1280, height: 720};
var capturing    = false;
var aSpline      = null;
var layer        = null;
var pressures    = null;
var pencolor     = null;
var eraseMode    = null;
var allLayers    = [];
var numLayers    = 0;
var uigrp        = null;
var currentLayer = null;
var drawingStage = null;

// Explicitely close web socket when web broswer is closed
window.onbeforeunload = function() {
	if (wsio_global !== undefined) {
		wsio_global.close();
	}
};


function findPos(obj) {
	var curleft = 0;
	var curtop  = 0;
	if (obj.offsetParent) {
		curleft = obj.offsetLeft;
		curtop  = obj.offsetTop;
		while (obj = obj.offsetParent) { // eslint-disable-line
			curleft += obj.offsetLeft;
			curtop  += obj.offsetTop;
		}
	}
	return {x: curleft, y: curtop};
}

function inCanvasBounds(posX, posY) {
	var left   = 0;
	var top    = 0;
	var right  = canvasSize.width;
	var bottom = canvasSize.height;

	return (posX >= left && posX <= right &&
			posY >= top && posY <= bottom);
}

/**
 * Entry point of the application. Uses Kinetic.js for drawing
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	// SAGE2 stuff
	wsio_global = new WebsocketIO();

	wsio_global.open(function() {
		console.log("Websocket opened");

		// Setup message callbacks
		setupListeners(wsio_global);

		// Get the cookie for the session, if there's one
		var session = getCookie("session");

		var clientDescription = {
			clientType: "sageDrawing",
			requests: {
				config: true,
				version: true,
				time: false,
				console: false
			},
			session: session
		};
		wsio_global.emit('addClient', clientDescription);
	});

	// Socket close event (ie server crashed)
	wsio_global.on('close', function(evt) {
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

/**
 * Place callbacks on various messages from the server
 *
 * @method setupListeners
 * @param wsio {Object} websocket
 */
function setupListeners(wsio) {

	// Got a reply from the server
	wsio.on('initialize', function(data) {
		console.log('My ID>', data.UID);

		// Plugin stuff
		plugin = document.getElementById('wtPlugin');

		// Show plugin version
		var pluginVersion = document.getElementById('pluginVersion');
		if (plugin.version) {
			pluginVersion.innerHTML = "Plugin Version: " + plugin.version;
		} else {
			pluginVersion.innerHTML = "Plugin Version: n/a";
		}

		var pluginInformation = document.getElementById('pluginInformation');

		var isWacom, version, tabletModel, info;
		if (plugin.penAPI) {
			isWacom      = plugin.penAPI.isWacom;
			version      = plugin.penAPI.version;
			tabletModel  = plugin.penAPI.tabletModel;
			info  = "Plugin information: isWacom:" + isWacom;
			info += " version:" + version;
			info += " tabletModel:" + tabletModel;
			pluginInformation.innerHTML = info;
		} else {
			isWacom      = false;
			version      = 0;
			tabletModel  = "n/a";
			info  = "Plugin information n/a";
			pluginInformation.innerHTML = info;
		}

		// Toolbar
		var uiStage = new Kinetic.Stage({
			container: 'toolbar',
			width: 1280,
			height: 50
		});
		var uilayer = new Kinetic.Layer();
		uiStage.add(uilayer);
		var uibg = new Kinetic.Rect({
			width: 1280,
			height: 720,
			fill: '#CCCCCC',
			stroke: 'black',
			strokeWidth: 2
		});
		uigrp = new Kinetic.Group();
		var xoffset = 15;
		var labels  = ["Brush", "Eraser", "Previous", "Next", "New", " ", " ", " ", " ", " ", " ", " ", " ", "1/1"];

		function onMouseUp(evt) {
			var id = evt.target.id();
			if (id === 0) {
				eraseMode = false;
			} else if (id === 1) {
				eraseMode = true;
			} else if (id === 2) {
				previousLayer();
			} else if (id === 3) {
				nextLayer();
			} else if (id === 4) {
				newLayer();
			}
		}

		for (var i = 0; i < 14; i++) {
			var bgrp = new Kinetic.Group({x: xoffset, y: 5});
			var button = new Kinetic.Rect({
				width: 80,
				height: 40,
				fill: '#DDDDDD',
				stroke: 'black',
				strokeWidth: 0,
				id: i
			});
			bgrp.add(button);

			var buttonLabel = new Kinetic.Label({
				x: 0, y: 0, opacity: 1, listening: false
			});
			buttonLabel.add(new Kinetic.Tag({listening: false}));
			buttonLabel.add(new Kinetic.Text({
				text: labels[i],
				fontFamily: 'Arial',
				fontSize: 18,
				padding: 5,
				id: 'text_' + i,
				fill: 'black', listening: false
			}));

			xoffset += 90;
			bgrp.add(buttonLabel);
			uigrp.add(bgrp);

			button.on('mouseup', onMouseUp);
		}
		uilayer.add(uibg);
		uilayer.add(uigrp);
		uilayer.draw();

		// Drawing
		drawingStage = new Kinetic.Stage({
			container: 'canvas',
			width: 1280,
			height: 720
		});
		var layerbg = new Kinetic.Layer();
		drawingStage.add(layerbg);

		var rectbg = new Kinetic.Rect({
			width: 1280,
			height: 720,
			fill: 'black',
			stroke: 'black',
			strokeWidth: 1
		});
		layerbg.add(rectbg);
		layerbg.draw();

		layer = new Kinetic.Layer();
		drawingStage.add(layer);
		allLayers[numLayers] = layer;
		numLayers++;
		currentLayer = 0;

		canvas    = document.getElementById('canvas');
		canvasPos = findPos(canvas);
		eraseMode = false;

		canvas.addEventListener("mouseup",   mouseup,   true);
		canvas.addEventListener("mousedown", mousedown, true);
	});

	// Server sends the SAGE2 version
	wsio.on('setupSAGE2Version', function(data) {
		console.log('SAGE2: version', data.base, data.branch, data.commit, data.date);
	});

	// Server sends the wall configuration
	wsio.on('setupDisplayConfiguration', function(json_cfg) {
		var ratio = json_cfg.totalWidth / json_cfg.totalHeight;
		console.log('Wall> ratio', ratio);
	});
}

/**
 * Create a new drawing layer
 *
 * @method newLayer
 */
function newLayer() {
	// create a new layer
	var nlayer = new Kinetic.Layer();
	// hide all the other layers
	for (var i = 0; i < numLayers; i++) {
		allLayers[i].hide();
	}
	// put the new layer on display
	drawingStage.add(nlayer);
	nlayer.show();
	// add it to the array of layers
	allLayers[numLayers] = nlayer;
	currentLayer = numLayers;
	numLayers++;
	// make it the active layer
	layer = nlayer;
	// Update the status window
	var status = uigrp.find('#text_13');
	status.text((currentLayer + 1) + '/' + numLayers);
	uigrp.draw();

	wsio_global.emit('pointerDraw', {command: 'newlayer'});
}

/**
 * Navigate to the next layer
 *
 * @method nextLayer
 */
function nextLayer() {
	var newidx = currentLayer + 1;
	if (newidx >= numLayers) {
		newidx = numLayers - 1;
	}
	if (newidx !== currentLayer) {
		// set the new index
		currentLayer = newidx;
		// show/hide the layers
		for (var i = 0; i < numLayers; i++) {
			if (i === currentLayer) {
				allLayers[i].show();
			} else {
				allLayers[i].hide();
			}
		}
		// make it the active layer
		layer = allLayers[currentLayer];
		// Update the status window
		var status = uigrp.find('#text_13');
		status.text((currentLayer + 1) + '/' + numLayers);
		uigrp.draw();

		wsio_global.emit('pointerDraw', {command: 'activelayer', value: currentLayer});
	}
}

/**
 * Navigate to the previous layer
 *
 * @method previousLayer
 */
function previousLayer() {
	var newidx = (currentLayer - 1) % numLayers;
	if (newidx >= 0 && newidx !== currentLayer) {
		// set the new index
		currentLayer = newidx;
		// show/hide the layers
		for (var i = 0; i < numLayers; i++) {
			if (i === currentLayer) {
				allLayers[i].show();
			} else {
				allLayers[i].hide();
			}
		}
		// make it the active layer
		layer = allLayers[currentLayer];
		// Update the status window
		var status = uigrp.find('#text_13');
		status.text((currentLayer + 1) + '/' + numLayers);
		uigrp.draw();

		wsio_global.emit('pointerDraw', {command: 'activelayer', value: currentLayer});
	}
}

/**
 * Mouse down handler
 *
 * @method mousedown
 * @param ev {Event} mouse event
 */
function mousedown(ev) {
	if (plugin.penAPI) {
		// plugin.penAPI.pointerType: 0:out 1:pen 2:mouse/puck 3:eraser
		if (plugin.penAPI.pointerType === 3) {
			eraseMode = true;
		} else if (plugin.penAPI.pointerType === 1) {
			eraseMode = false;
		}
	}

	canvas.onmousemove = mousemove;
	pressures = [];

	var pX = ev.pageX - canvasPos.x;
	var pY = ev.pageY - canvasPos.y;

	capturing = inCanvasBounds(pX, pY);

	// Use the pointer color or red by default
	pencolor = localStorage.SAGE2_ptrColor || '#FF0000';

	if (eraseMode) {
		pencolor = 'black';
		aSpline = new Kinetic.Line({
			points: [pX, pY],
			stroke: pencolor,
			strokeWidth: 40,
			lineCap: 'round',
			tension: 0 // straight initially
		});
		aSpline.eraseMode = true;
	} else {
		aSpline = new Kinetic.Line({
			points: [pX, pY],
			stroke: pencolor,
			strokeWidth: 3,
			lineCap: 'round',
			tension: 0 // straight initially
		});
		aSpline.eraseMode = false;
	}
	layer.add(aSpline);

	// Register click immediately
	mousemove(ev);
}

/**
 * Mouse up handler
 *
 * @method mouseup
 * @param ev {Event} mouse event
 */
function mouseup(ev) {
	capturing = false;
	canvas.style.cursor = 'initial';
	canvas.onmousemove = null;
	if (aSpline) {
		var i;
		var arr = aSpline.points();
		var toprocess = [];
		for (i = 0; i < arr.length; i += 2) {
			toprocess.push({x: arr[2 * i], y: arr[2 * i + 1]});
		}
		// Adding the mouseup position
		var curX = ev.pageX - canvasPos.x;
		var curY = ev.pageY - canvasPos.y;
		toprocess.push({x: curX, y: curY});
		// starting process
		var processed;
		if (aSpline.eraseMode) {
			processed = simplify(toprocess, 0.2, true);
		} else {
			processed = simplify(toprocess, 2.0, true); // array, pixel size, high-quality: true
		}
		var newpoints = [];
		for (i = 0; i < processed.length; i++) {
			newpoints.push(processed[i].x, processed[i].y);
		}
		aSpline.points(newpoints);
		if (aSpline.eraseMode === false) {
			// more tension in the spline (smoother)
			aSpline.tension(0.5);
		}
		var avg = 0.0;
		for (i = 0; i < pressures.length; i++) {
			avg += pressures[i];
		}
		avg = avg / pressures.length;
		if (avg === 0) {
			aSpline.strokeWidth(3);
		} else {
			aSpline.strokeWidth(avg * 8.0);
		}

		layer.draw();

		wsio_global.emit('pointerDraw', {command: 'draw', points: newpoints, pressure: avg, color: pencolor});
	}
}

/**
 * Mouse move handler
 *
 * @method mousemove
 * @param ev {Event} mouse event
 */
function mousemove(ev) {
	var penAPI   = plugin.penAPI;
	var pressure = 0.0;

	if (penAPI) {
		pressure  = penAPI.pressure;

		// Get data values from Wacom plugin.
		// var isEraser     = penAPI.isEraser;
		// var pressure     = penAPI.pressure;
		// var posX         = penAPI.posX;
		// var posY         = penAPI.posY;
		// var pointerType  = penAPI.pointerType;
		// var sysX         = penAPI.sysX;
		// var sysY         = penAPI.sysY;
		// var tabX         = penAPI.tabX;
		// var tabY         = penAPI.tabY;
		// var rotationDeg  = penAPI.rotationDeg;
		// var rotationRad  = penAPI.rotationRad;
		// var tiltX        = penAPI.tiltX;
		// var tiltY        = penAPI.tiltY;
		// var tangPressure = penAPI.tangentialPressure;
	} else {
		pressure = 1.0;
	}

	if (eraseMode) {
		canvas.style.cursor = '-webkit-grab'; // grab doesn't work
		pressure = 2.5;
	} else {
		canvas.style.cursor = 'crosshair';
	}


	var curX = ev.pageX - canvasPos.x;
	var curY = ev.pageY - canvasPos.y;

	capturing = inCanvasBounds(curX, curY);

	if (capturing && (pressure >= 0.0)) {
		aSpline.points(aSpline.points().concat([curX, curY]));
		pressures.push(pressure);
		aSpline.draw();
	}
}
