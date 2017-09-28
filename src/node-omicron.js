// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-2015

/**
 * Omicron connection module for SAGE2
 * Provides external input device support
 * https://github.com/uic-evl/omicron
 *
 * @module server
 * @submodule omicron
 * @requires node-coordinateCalculator, node-1euro
 */

// require variables to be declared
"use strict";

var dgram     = require('dgram');
var net       = require('net');
var util      = require('util');
var sageutils           = require('./node-utils');            // provides the current version number

var CoordinateCalculator = require('./node-coordinateCalculator');
var OneEuroFilter        = require('./node-1euro');

/* eslint consistent-this: ["error", "omicronManager"] */
var omicronManager; // Handle to OmicronManager inside of udp blocks (instead of this)
var drawingManager; // Connect to the node-drawing
/**
 * Omicron setup and opens a listener socket for an Omicron input server to connect to
 *
 * @class OmicronManager
 * @constructor
 * @param sysConfig {Object} SAGE2 system configuration file. Primararly used to grab display dimensions and Omicron settings
 */
function OmicronManager(sysConfig) {
	omicronManager = this;

	this.coordCalculator = null;

	this.wandLabel = "wandTracker";
	this.wandColor = "rgba(250, 5, 5, 1.0)";

	this.touchOffset = [0, 0];
	this.wandScaleDelta = 250;
	this.acceleratedDragScale = 0;

	this.touchZoomScale = 520;

	this.wandXFilter = null;
	this.wandYFilter = null;

	this.oinputserverSocket = null;
	this.omicronDataPort = 9123;

	this.eventDebug   = false;
	this.gestureDebug = false;

	this.pointerOffscreen  = false;
	this.showPointerToggle = true;
	this.lastWandFlags     = 0;

	this.lastPosX = 0;
	this.lastPosY = 0;

	this.totalWidth  = 0;
	this.totalHeight = 0;

	// 1 euro filtering
	var freq = 120;
	var mincutoff = 1.25;
	var beta = 2;
	var dcutoff = 10;

	this.wandXFilter = new OneEuroFilter(freq, mincutoff, beta, dcutoff);
	this.wandYFilter = new OneEuroFilter(freq, mincutoff, beta, dcutoff);

	if (sysConfig.experimental !== undefined) {
		this.config = sysConfig.experimental.omicron;
	}

	this.coordCalculator = new CoordinateCalculator(this.config);

	var serverHost = sysConfig.host;

	// Used to determine the initial position of a zoom gesture
	// If the distance from the initial position exceeds threshold,
	// zoom becomes a drag
	this.initZoomPos = {};
	this.zoomToMoveGestureMinimumDistance = 100;

	// Used to track changes in the pointer state (like a zoom becoming a move)
	this.pointerGestureState = {};

	// Default Gestures
	this.enableDoubleClickMaximize = false;
	this.enableThreeFingerRightClick = true;
	this.enableTwoFingerWindowDrag = false;
	this.enableTwoFingerZoom = true;
	this.enableFiveFingerCloseApp = false;

	// Default config
	if (this.config === undefined) {
		this.config = {};
		this.config.enable = false;
		this.config.dataPort = 30005;
		this.config.eventDebug = false;

		this.config.zoomGestureScale = 2000;
		this.config.acceleratedDragScale = 3;
		this.config.gestureDebug = false;

		this.config.msgPort = 28000;
	}

	if (this.config.enable === false) {
		return;
	}

	if (this.config.enableDoubleClickMaximize !== undefined) {
		this.enableDoubleClickMaximize = this.config.enableDoubleClickMaximize;
	}
	if (this.config.enableThreeFingerRightClick !== undefined) {
		this.enableThreeFingerRightClick = this.config.enableThreeFingerRightClick;
	}
	if (this.config.enableTwoFingerWindowDrag !== undefined) {
		this.enableTwoFingerWindowDrag = this.config.enableTwoFingerWindowDrag;
	}
	if (this.config.enableTwoFingerZoom !== undefined) {
		this.enableTwoFingerZoom = this.config.enableTwoFingerZoom;
	}
	if (this.config.enableFiveFingerCloseApp !== undefined) {
		this.enableFiveFingerCloseApp = this.config.enableFiveFingerCloseApp;
	}

	if (this.config.host === undefined) {
		sageutils.log('Omicron', 'Using web server hostname:', sysConfig.host);
	} else {
		serverHost = this.config.host;
		sageutils.log('Omicron', 'Using server hostname:', serverHost);
	}

	if (this.config.dataPort === undefined) {
		sageutils.log('Omicron', 'dataPort undefined. Using default:', this.omicronDataPort);
	} else {
		this.omicronDataPort =  this.config.dataPort;
		sageutils.log('Omicron', 'Listening for input server on port:', this.omicronDataPort);
	}

	if (this.config.touchOffset) {
		this.touchOffset =  this.config.touchOffset;
		sageutils.log('Omicron', 'Touch points offset by:', this.touchOffset);
	}

	if (this.config.eventDebug) {
		this.eventDebug =  this.config.eventDebug;
		sageutils.log('Omicron', 'Event Debug Info:', this.eventDebug);
	}

	if (this.config.gestureDebug) {
		this.gestureDebug =  this.config.gestureDebug;
		sageutils.log('Omicron', 'Gesture Debug Info:', this.gestureDebug);
	}

	if (sysConfig.resolution) {
		var columns = 1;
		var rows    = 1;

		if (sysConfig.layout) {
			columns = sysConfig.layout.columns;
			rows    = sysConfig.layout.rows;
		}

		this.totalWidth  = sysConfig.resolution.width * columns;
		this.totalHeight = sysConfig.resolution.height * rows;

		sageutils.log('Omicron', 'Touch Display Resolution:', this.totalWidth, this.totalHeight);
	} else {
		this.totalWidth  = 8160;
		this.totalHeight = 2304;
	}

	if (this.config.zoomGestureScale) {
		this.touchZoomScale = this.config.zoomGestureScale;
	}

	if (this.config.acceleratedDragScale) {
		this.acceleratedDragScale = this.config.acceleratedDragScale;
	}

	// For accepting input server connection
	var server = net.createServer(function(socket) {
		sageutils.log('Omicron', 'Input server',
			socket.remoteAddress, 'connected on port', socket.remotePort);

		socket.on('error', function(e) {
			sageutils.log('Omicron', 'Input server disconnected');
			socket.destroy(); // Clean up disconnected socket
		});

	});

	server.listen(this.omicronDataPort, serverHost);

	if (this.config.inputServerIP !== undefined) {
		omicronManager.oinputserverConnected = false;
		var msgPort = 28000;
		if (this.config.msgPort) {
			msgPort = this.config.msgPort;
		}

		omicronManager.connect(msgPort);

		// attempt to connect every 15 seconds, if connection failed
		setInterval(function() {
			if (omicronManager.oinputserverConnected === false) {
				omicronManager.connect(msgPort);
			}
		}, 15000);

		omicronManager.runTracker();
	}
}

/**
 * Initalizes connection with Omicron input servr
 *
 * @method connect
 */
OmicronManager.prototype.connect = function(msgPort) {
	sageutils.log('Omicron', 'Connecting to Omicron oinputserver at "' +
		omicronManager.config.inputServerIP + '" on msgPort: ' + msgPort + '.');

	omicronManager.oinputserverSocket = net.connect(msgPort, omicronManager.config.inputServerIP,  function() {
		// 'connect' listener
		sageutils.log('Omicron', 'Connection Successful. Requesting data on port',
			omicronManager.omicronDataPort);
		omicronManager.oinputserverConnected = true;

		var sendbuf = util.format("omicron_data_on,%d\n", omicronManager.omicronDataPort);
		omicronManager.oinputserverSocket.write(sendbuf);
	});
	omicronManager.oinputserverSocket.on('error', function(e) {
		sageutils.log('Omicron', 'oinputserver connection error - code:', e.code);
		omicronManager.oinputserverConnected = false;
	});
	omicronManager.oinputserverSocket.on('end', function(e) {
		sageutils.log('Omicron', 'oinputserver disconnected');
		omicronManager.oinputserverConnected = false;
	});
	omicronManager.oinputserverSocket.on('data', function(e) {
		// sageutils.log('Omicron', 'oinputserver receiving data:', e);
		// TCP stream
		// omicronManager.processIncomingEvent(e);
	});
};


/**
 * Sends disconnect signal to input server
 *
 * @method disconnect
 */
OmicronManager.prototype.disconnect = function() {
	if (this.oinputserverSocket) {
		var sendbuf = util.format("data_off");
		sageutils.log('Omicron', 'Sending disconnect signal');
		this.oinputserverSocket.write(sendbuf);
	}
};


/**
 * Links the drawing manager to the omicron server
 *
 * @method linkDrawingManager
 */
OmicronManager.prototype.linkDrawingManager = function(dManager) {
	drawingManager = dManager;
};


/**
 * Receives server pointer functions
 *
 * @method setCallbacks
 */
OmicronManager.prototype.setCallbacks = function(
	sagePointerList,
	createSagePointerCB,
	showPointerCB,
	pointerPressCB,
	pointerMoveCB,
	pointerPositionCB,
	hidePointerCB,
	pointerReleaseCB,
	pointerScrollStartCB,
	pointerScrollCB,
	pointerScrollEndCB,
	pointerDblClickCB,
	pointerCloseGestureCB,
	keyDownCB,
	keyUpCB,
	keyPressCB,
	createRadialMenuCB,
	omi_pointerChangeModeCB,
	kinectInputCB,
	remoteInteractionCB) {
	this.sagePointers        = sagePointerList;
	this.createSagePointer   = createSagePointerCB;
	this.showPointer         = showPointerCB;
	this.pointerPress        = pointerPressCB;
	this.pointerMove         = pointerMoveCB;
	this.pointerPosition     = pointerPositionCB;
	this.hidePointer         = hidePointerCB;
	this.pointerRelease      = pointerReleaseCB;
	this.pointerScrollStart  = pointerScrollStartCB;
	this.pointerScroll       = pointerScrollCB;
	this.pointerScrollEnd       = pointerScrollEndCB;
	this.pointerDblClick     = pointerDblClickCB;
	this.pointerCloseGesture = pointerCloseGestureCB;
	this.keyDown             = keyDownCB;
	this.keyUp               = keyUpCB;
	this.keyPress            = keyPressCB;
	this.createRadialMenu    = createRadialMenuCB;
	this.kinectInput 				 = kinectInputCB;
	this.pointerChangeMode = omi_pointerChangeModeCB;
	this.remoteInteraction = remoteInteractionCB;

	this.createSagePointer(this.config.inputServerIP);

	// sageutils.log('Omicron', "Server callbacks set");
};

/**
 * Manages incoming input server data
 *
 * @method runTracker
 */
OmicronManager.prototype.runTracker = function() {
	if (this.config.enable === false) {
		return;
	}

	var udp = dgram.createSocket("udp4");

	udp.on("message", function(msg, rinfo) {
		omicronManager.processIncomingEvent(msg, rinfo);
	});

	udp.on("listening", function() {
		var address = udp.address();
		sageutils.log('Omicron', 'UDP listening on port', address.port);
	});

	udp.bind(this.omicronDataPort);
};

OmicronManager.prototype.sageToOmicronEvent = function(uniqueID, pointerX, pointerY, data, type, color) {
	var e = {};
	e.timestamp = Date.now();
	e.sourceId = uniqueID;
	e.serviceType = 0; // 0 = pointer
	e.type = type;
	e.flags = 0;
	e.posx = pointerX;
	e.posy = pointerY;
	e.posz = 0;
	e.orw = 0;
	e.orx = 0;
	e.ory = 0;
	e.orz = 0;
	e.extraDataType = 0;
	e.extraDataItems = 0;
	e.extraDataMask = 0;
	e.extraDataSize = 0;
	e.extraDataString = color;
	return e;
};

OmicronManager.prototype.processIncomingEvent = function(msg, rinfo) {
	var dstart = Date.now();
	var emit   = 0;
	this.nonCriticalEventDelay = -1;
	this.lastNonCritEventTime = dstart;

	/*
	if(rinfo == undefined) {
		sageutils.log('Omicron', "incoming TCP");
	} else {
		sageutils.log('Omicron', "incoming UDP");
	}
	*/
	var offset = 0;
	var e = {};
	if (offset < msg.length) {
		e.timestamp = msg.readUInt32LE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.sourceId = msg.readUInt32LE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.serviceId = msg.readInt32LE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.serviceType = msg.readUInt32LE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.type = msg.readUInt32LE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.flags = msg.readUInt32LE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.posx = msg.readFloatLE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.posy = msg.readFloatLE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.posz = msg.readFloatLE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.orw  = msg.readFloatLE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.orx  = msg.readFloatLE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.ory  = msg.readFloatLE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.orz  = msg.readFloatLE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.extraDataType  = msg.readUInt32LE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.extraDataItems = msg.readUInt32LE(offset); offset += 4;
	}
	if (offset < msg.length) {
		e.extraDataMask  = msg.readUInt32LE(offset); offset += 4;
	}
	// Extra data types:
	//    0 ExtraDataNull,
	//    1 ExtraDataFloatArray,
	//    2 ExtraDataIntArray,
	//    3 ExtraDataVector3Array,
	//    4 ExtraDataString,
	//    5 ExtraDataKinectSpeech
	if (e.extraDataType == 0) {
		e.extraDataSize = 0;
	} else if (e.extraDataType == 1 || e.extraDataType == 2) {
		e.extraDataSize = e.extraDataItems * 4;
	} else if (e.extraDataType == 3) {
		e.extraDataSize = e.extraDataItems * 4 * 3;
	} else if (e.extraDataType == 4) {
		e.extraDataSize = e.extraDataItems;
	} else if (e.extraDataType == 5) {
		e.extraDataSize = e.extraDataItems;
	}

	// var r_roll  = Math.asin(2.0*e.orx*e.ory + 2.0*e.orz*e.orw);
	// var r_yaw   = Math.atan2(2.0*e.ory*e.orw-2.0*e.orx*e.orz , 1.0 - 2.0*e.ory*e.ory - 2.0*e.orz*e.orz);
	// var r_pitch = Math.atan2(2.0*e.orx*e.orw-2.0*e.ory*e.orz , 1.0 - 2.0*e.orx*e.orx - 2.0*e.orz*e.orz);
	var posX = e.posx * omicronManager.totalWidth;
	var posY = e.posy * omicronManager.totalHeight;
	posX += omicronManager.touchOffset[0];
	posY += omicronManager.touchOffset[1];

	var sourceID = e.sourceId;

	// serviceType:
	// 0 = Pointer
	// 1 = Mocap
	// 2 = Keyboard
	// 3 = Controller
	// 4 = UI
	// 5 = Generic
	// 6 = Brain
	// 7 = Wand
	// 8 = Speech
	// 9 = Ipad Framework
	var serviceType = e.serviceType;
	// console.log("Event service type: " + serviceType);

	// console.log(e.sourceId, e.posx, e.posy, e.posz);
	// serviceID:
	// (Note: this depends on the order the services are specified on the server)
	// 0 = Touch
	// 1 = Classic SAGEPointer
	// var serviceID = e.serviceId;

	// Appending sourceID to pointer address ID
	var address = sourceID;
	if (rinfo !== undefined) {
		address = rinfo.address + ":" + sourceID;
	} else {
		address = omicronManager.config.inputServerIP + ":" + sourceID;
	}

	// ServiceTypePointer
	//
	if (serviceType === 0) {
		omicronManager.processPointerEvent(e, sourceID, posX, posY, msg, offset, address, emit, dstart);
	} else if (serviceType === 1) {

		// Kinect v2.0 data has 29 extra data fields
		if (this.kinectInput != undefined && e.extraDataItems == 29) {
			if (omicronManager.eventDebug) {
				sageutils.log('Omicron', "Kinect body " + sourceID +
					" head Pos: (" + e.posx + ", " + e.posy + "," + e.posz + ")");
			}

			var extraData = [];

			while (offset < msg.length) {
				extraData.push(msg.readFloatLE(offset));
				offset += 4;
			}

			var bodyParts = [
				"OMICRON_SKEL_HIP_CENTER",
				"OMICRON_SKEL_HEAD",
				"Junk",
				"Junk",
				"Junk",
				"Junk",
				"OMICRON_SKEL_LEFT_SHOULDER",
				"OMICRON_SKEL_LEFT_ELBOW",
				"OMICRON_SKEL_LEFT_WRIST",
				"OMICRON_SKEL_LEFT_HAND",
				"OMICRON_SKEL_LEFT_FINGERTIP",
				"OMICRON_SKEL_LEFT_HIP",
				"OMICRON_SKEL_LEFT_KNEE",
				"OMICRON_SKEL_LEFT_ANKLE",
				"OMICRON_SKEL_LEFT_FOOT",
				"Junk",
				"OMICRON_SKEL_RIGHT_SHOULDER",
				"OMICRON_SKEL_RIGHT_ELBOW",
				"OMICRON_SKEL_RIGHT_WRIST",
				"OMICRON_SKEL_RIGHT_HAND",
				"OMICRON_SKEL_RIGHT_FINGERTIP",
				"OMICRON_SKEL_RIGHT_HIP",
				"OMICRON_SKEL_RIGHT_KNEE",
				"OMICRON_SKEL_RIGHT_ANKLE",
				"OMICRON_SKEL_RIGHT_FOOT",
				"OMICRON_SKEL_SPINE",
				"OMICRON_SKEL_SHOULDER_CENTER",
				"OMICRON_SKEL_LEFT_THUMB",
				"OMICRON_SKEL_RIGHT_THUMB"
			];

			var bodyPartIndex = 0;
			var posIndex = 0;
			var skeletonData = {};
			while (bodyPartIndex < bodyParts.length) {
				const bodyPart = bodyParts[bodyPartIndex++];
				skeletonData[bodyPart] = {
					x: extraData[posIndex++],
					y: extraData[posIndex++],
					z: extraData[posIndex++]
				};
			}

			skeletonData.skeletonID = sourceID;
			skeletonData.type = "kinectInput";

			this.kinectInput(sourceID, skeletonData);
		} else {
			// Treat as single marker mocap
			if (omicronManager.eventDebug) {
				sageutils.log('Omicron', "MocapID " + sourceID +
					" (" + e.posx + ", " + e.posy + "," + e.posz + ")");
			}
		}
	} else if (serviceType === 7) {
		// ServiceTypeWand
		//
		// Wand Button Flags
		// var button1 = 1;
		var button2 = 2; // Circle
		var button3 = 4; // Cross
		// var specialButton1 = 8;
		// var specialButton2 = 16;
		// var specialButton3 = 32;
		// var button4 = 64;
		var button5 = 128; // L1
		// var button6 = 256; // L3
		var button7 = 512; // L2
		var buttonUp = 1024;
		var buttonDown = 2048;
		var buttonLeft = 4096;
		var buttonRight = 8192;
		// var button8 = 32768;
		// var button9 = 65536;

		// Wand SAGE2 command mapping
		var clickDragButton = button3;
		var menuButton      = button2;
		var showHideButton  = button7;
		var scaleUpButton   = buttonUp;
		var scaleDownButton = buttonDown;
		var maximizeButton  = button5;
		var previousButton  = buttonLeft;
		var nextButton      = buttonRight;
		var playButton      = button2;

		// console.log("Wand Position: ("+e.posx+", "+e.posy+","+e.posz+")" );
		// console.log("Wand Rotation: ("+e.orx+", "+e.ory+","+e.orz+","+e.orw+")" );
		var screenPos = omicronManager.coordCalculator.wandToScreenCoordinates(
			e.posx, e.posy, e.posz, e.orx, e.ory, e.orz, e.orw
		);
		// console.log("Screen pos: ("+screenPos.x+", "+screenPos.y+")" );

		address = omicronManager.config.inputServerIP;

		// if( omicronManager.showPointerToggle === false )
		// return;
		var timeSinceLastNonCritEvent = Date.now() - omicronManager.lastNonCritEventTime;

		if (omicronManager.showPointerToggle && screenPos.x !== -1 && screenPos.y !== -1) {
			var timestamp = e.timestamp / 1000;
			posX = screenPos.x;
			posY = screenPos.y;

			// 1euro filter
			posX = omicronManager.wandXFilter.filter(screenPos.x, timestamp);
			posY = omicronManager.wandYFilter.filter(screenPos.y, timestamp);

			posX *= omicronManager.totalWidth;
			posY *= omicronManager.totalHeight;

			omicronManager.lastPosX = posX;
			omicronManager.lastPosY = posY;

			if (omicronManager.pointerOffscreen && omicronManager.showPointerToggle) {
				omicronManager.showPointer(omicronManager.config.inputServerIP, {
					label: omicronManager.wandLabel + " " + sourceID, color: omicronManager.wandColor
				});
				omicronManager.pointerPosition(address, { pointerX: posX, pointerY: posY });
				omicronManager.pointerOffscreen = false;
			}
		} else {
			posX = omicronManager.lastPosX;
			posY = omicronManager.lastPosY;
			if (!omicronManager.pointerOffscreen && omicronManager.showPointerToggle) {
				omicronManager.hidePointer(omicronManager.config.inputServerIP);
				omicronManager.pointerOffscreen = true;
			}
		}

		if (timeSinceLastNonCritEvent >= omicronManager.nonCriticalEventDelay) {
			omicronManager.pointerPosition(address, { pointerX: posX, pointerY: posY });
			omicronManager.lastNonCritEventTime = Date.now();
		}

		if (e.flags !== 0) {
			// console.log("Wand flags: " + e.flags + " " + (omicronManager.lastWandFlags & playButton) );
			if ((e.flags & clickDragButton) === clickDragButton && omicronManager.showPointerToggle) {
				if (omicronManager.lastWandFlags === 0) {
					// Wand Click
					omicronManager.pointerPress(address, posX, posY, { button: "left" });
				} else {
					// Wand Drag
					if (timeSinceLastNonCritEvent >= omicronManager.nonCriticalEventDelay) {
						omicronManager.pointerPosition(address, { pointerX: posX, pointerY: posY });
						omicronManager.pointerMove(address, posX, posY, { deltaX: 0, deltaY: 0, button: "left" });

						// console.log((Date.now() - dstart) + "] Wand drag");
						omicronManager.lastNonCritEventTime = Date.now();
					}
				}
			} else if (omicronManager.lastWandFlags === 0 && (e.flags & menuButton) === menuButton &&
						omicronManager.showPointerToggle) {
				omicronManager.pointerPress(address, posX, posY, { button: "right" });
			} else if (omicronManager.lastWandFlags === 0 && (e.flags & showHideButton) === showHideButton) {
				if (!omicronManager.showPointerToggle) {
					omicronManager.showPointerToggle = true;
					omicronManager.showPointer(omicronManager.config.inputServerIP, {
						label:  omicronManager.wandLabel + " " + sourceID, color: omicronManager.wandColor
					});
					omicronManager.pointerPosition(address, { pointerX: posX, pointerY: posY });
				} else {
					omicronManager.showPointerToggle = false;
					// hidePointer( omicronManager.config.inputServerIP );
				}
			} else if (omicronManager.lastWandFlags === 0 &&
					(e.flags & scaleUpButton) === scaleUpButton &&
					omicronManager.showPointerToggle) {
				omicronManager.pointerScrollStart(address, posX, posY);

				// Casting the parameters to correct type
				omicronManager.pointerScroll(address, { wheelDelta: parseInt(-omicronManager.wandScaleDelta, 10) });
			} else if (omicronManager.lastWandFlags === 0 &&
						(e.flags & scaleDownButton) === scaleDownButton &&
						omicronManager.showPointerToggle) {
				omicronManager.pointerScrollStart(address, posX, posY);

				// Casting the parameters to correct type
				omicronManager.pointerScroll(address, { wheelDelta: parseInt(omicronManager.wandScaleDelta, 10) });
			} else if (omicronManager.lastWandFlags === 0 &&
					(e.flags & maximizeButton) === maximizeButton &&
					omicronManager.showPointerToggle) {
				omicronManager.pointerDblClick(address, posX, posY);
			} else if ((omicronManager.lastWandFlags & previousButton) === 0 &&
					(e.flags & previousButton) === previousButton) {
				omicronManager.keyDown(address, posX, posY, { code: 37 });
			} else if ((omicronManager.lastWandFlags & nextButton) === 0 &&
					(e.flags & nextButton) === nextButton) {
				omicronManager.keyDown(address, posX, posY, { code: 39 });
			} else if ((omicronManager.lastWandFlags & playButton) === 0  &&
					(e.flags & playButton) === playButton) {
				omicronManager.keyPress(address, posX, posY, { code: 32 });
			}

			omicronManager.lastWandFlags = e.flags;
		} else if (omicronManager.lastWandFlags !== 0) {
			// TODO: Add a smarter way of detecting press, drag, release from button flags
			if ((omicronManager.lastWandFlags & clickDragButton) === clickDragButton) {
				// console.log("wandPointer release");
				omicronManager.pointerRelease(address, posX, posY, { button: "left" });

				omicronManager.lastWandFlags = 0;
			} else if ((omicronManager.lastWandFlags & showHideButton) === showHideButton) {
				omicronManager.lastWandFlags = 0;
			} else if ((omicronManager.lastWandFlags & scaleUpButton) === scaleUpButton) {
				omicronManager.lastWandFlags = 0;
			} else if ((omicronManager.lastWandFlags & scaleDownButton) === scaleDownButton) {
				omicronManager.lastWandFlags = 0;
			} else if ((omicronManager.lastWandFlags & maximizeButton) === maximizeButton) {
				omicronManager.lastWandFlags = 0;
			} else if ((omicronManager.lastWandFlags & previousButton) === previousButton) {
				omicronManager.lastWandFlags = 0;
				omicronManager.keyUp(address, posX, posY, { code: 37 });
			} else if ((omicronManager.lastWandFlags & nextButton) === nextButton) {
				omicronManager.lastWandFlags = 0;
				omicronManager.keyUp(address, posX, posY, { code: 39 });
			} else if ((omicronManager.lastWandFlags & playButton) === playButton) {
				omicronManager.lastWandFlags = 0;
				omicronManager.keyUp(address, posX, posY, { code: 32 });
			}
		}
	} // ServiceTypeWand ends ///////////////////////////////////////////
};

/**
 * Manages pointer (serviceType = 0) type events
 *
 * @method processPointerEvent
 * @param e {Event} Omicron event
 * @param sourceID {Integer} Pointer ID
 * @param posX {Float} Pointer x position in screen coordinates
 * @param posY {Float} Pointer y position in screen coordinates
 * @param msg {Binary} Binary message. Used to get extraData values
 * @param offset {Integer} Current offset position of msg
 * @param emit {}
 * @param dstart {}
 */
OmicronManager.prototype.processPointerEvent = function(e, sourceID, posX, posY, msg, offset, address, emit, dstart) {
	var touchWidth  = 0;
	var touchHeight = 0;

	if (e.extraDataItems >= 2) {
		touchWidth  = msg.readFloatLE(offset); offset += 4;
		touchHeight = msg.readFloatLE(offset); offset += 4;
	}

	// the touch size is normalized
	touchWidth *=  omicronManager.totalWidth;
	touchHeight *= omicronManager.totalHeight;

	if (omicronManager.eventDebug) {
		var eventTypeSrt = "";
		if (e.type == 4) {
			eventTypeSrt = "Move";
		} else if (e.type == 5) {
			eventTypeSrt = "Down";
		} else if (e.type == 6) {
			eventTypeSrt = "Up";
		}
		sageutils.log('Omicron', "pointer ID", sourceID, " event! type:", eventTypeSrt);
		// sageutils.log('Omicron', "pointer event! type: " + e.type);
		// sageutils.log('Omicron', "ServiceTypePointer> source", e.sourceId);
		// sageutils.log('Omicron', "ServiceTypePointer> serviceID", e.serviceId);
		// sageutils.log('Omicron', "   pos: " + posX.toFixed(2) + ", " + posY.toFixed(2) + " size: " + touchWidth.toFixed(2) + ", " + touchHeight.toFixed(2));
		// sageutils.log('Omicron', "pointer address", address);
	}

	if (drawingManager.drawingMode && e.type !== 6) {
		// If the touch is coming from oinput send it to node-drawing and stop after that
		// If touch up, still send to SAGE to clear touch
		drawingManager.pointerEvent(e, sourceID, posX, posY, touchWidth, touchHeight);
		return;
	}

	// If the user touches on the palette with drawing disabled, enable it
	if ((!drawingManager.drawingMode) && drawingManager.touchInsidePalette(posX, posY)
		&& e.type === 5) {
		// drawingManager.reEnableDrawingMode();
	}

	// TouchGestureManager Flags:
	// 1 << 18 = User flag start (as of 8/3/14)
	// User << 1 = Unprocessed
	// User << 2 = Single touch
	// User << 3 = Big touch
	// User << 4 = 5-finger hold
	// User << 5 = 5-finger swipe
	// User << 6 = 3-finger hold
	var User = 1 << 18;

	var FLAG_SINGLE_TOUCH = User << 2;
	var FLAG_BIG_TOUCH = User << 3;
	var FLAG_FIVE_FINGER_HOLD = User << 4;
	var FLAG_FIVE_FINGER_SWIPE = User << 5;
	var FLAG_THREE_FINGER_HOLD = User << 6;
	var FLAG_SINGLE_CLICK = User << 7;
	var FLAG_DOUBLE_CLICK = User << 8;
	var FLAG_MULTI_TOUCH = User << 9;

	var initX = 0;
	var initY = 0;

	var distance = 0;
	var angle = 0;
	var accelDistance = 0;
	var accelX = 0;
	var accelY = 0;

	// As of 2015/11/13 all touch gesture events touch have an init value
	// (zoomDelta moved to extraData index 4 instead of 2)
	// ExtraDataFloats
	// [0] width
	// [1] height
	// [2] initX
	// [3] initY
	// [4] touch count in group
	// [c] id of touch n
	// [c+1] xPos of touch n
	// [c+2] yPos of touch n
	if (e.extraDataItems > 2) {
		initX = msg.readFloatLE(offset); offset += 4;
		initY = msg.readFloatLE(offset); offset += 4;

		initX *= omicronManager.totalWidth;
		initY *= omicronManager.totalHeight;
	} else {
		initX = posX;
		initY = posY;
	}

	// var timeSinceLastNonCritEvent = Date.now() - omicronManager.lastNonCritEventTime;

	var flagStrings = {};
	flagStrings[FLAG_SINGLE_TOUCH] = "FLAG_SINGLE_TOUCH";
	flagStrings[FLAG_BIG_TOUCH] = "FLAG_BIG_TOUCH";
	flagStrings[FLAG_FIVE_FINGER_HOLD] = "FLAG_FIVE_FINGER_HOLD";
	flagStrings[FLAG_FIVE_FINGER_SWIPE] = "FLAG_FIVE_FINGER_SWIPE";
	flagStrings[FLAG_THREE_FINGER_HOLD] = "FLAG_THREE_FINGER_HOLD";
	flagStrings[FLAG_SINGLE_CLICK] = "FLAG_SINGLE_CLICK";
	flagStrings[FLAG_DOUBLE_CLICK] = "FLAG_DOUBLE_CLICK";
	flagStrings[FLAG_MULTI_TOUCH] = "FLAG_MULTI_TOUCH";

	var typeStrings = {};
	typeStrings[0] = "Select";
	typeStrings[1] = "Toggle";
	typeStrings[2] = "ChangeValue";
	typeStrings[3] = "Update";
	typeStrings[4] = "Move";
	typeStrings[5] = "Down";
	typeStrings[6] = "Up";
	typeStrings[7] = "Trace/Connect";
	typeStrings[8] = "Untrace/Disconnect";
	typeStrings[9] = "Click";
	typeStrings[15] = "Zoom";
	typeStrings[18] = "Split";
	typeStrings[21] = "Rotate";

	if (e.type === 4) { // EventType: MOVE
		//if (omicronManager.sagePointers[address] === undefined) {
		//	return;
		//}

		if (omicronManager.gestureDebug) {
			//sageutils.log('Omicron', "Touch move at - (" + posX.toFixed(2) + "," + posY.toFixed(2) + ") initPos: ("
			//+ initX.toFixed(2) + "," + initY.toFixed(2) + ")");
		}

		// Update pointer position
		omicronManager.pointerPosition(address, { pointerX: posX, pointerY: posY });
		omicronManager.pointerMove(address, posX, posY, { deltaX: 0, deltaY: 0, button: "left" });

		/*
		if (timeSinceLastNonCritEvent > omicronManager.nonCriticalEventDelay) {
			if (e.flags == 0 || e.flags == FLAG_SINGLE_TOUCH) { // Basic touch event, non-gesture
				if (omicronManager.gestureDebug) {
					console.log("Touch move at - (" + posX.toFixed(2) + "," + posY.toFixed(2) + ") initPos: ("
					+ initX.toFixed(2) + "," + initY.toFixed(2) + ")");
				}

				distance = Math.sqrt(Math.pow(Math.abs(posX - initX), 2) + Math.pow(Math.abs(posY - initY), 2));
				angle = Math.atan2(posY -  initY, posX - initX);

				accelDistance = distance * omicronManager.acceleratedDragScale;
				accelX = posX + accelDistance * Math.cos(angle);
				accelY = posY + accelDistance * Math.sin(angle);

				omicronManager.pointerPosition(address, { pointerX: accelX, pointerY: accelY });
				omicronManager.pointerMove(address, accelX, accelY, { deltaX: 0, deltaY: 0, button: "left" });
				omicronManager.lastNonCritEventTime = Date.now();
			}
		}
		*/
	} else if (e.type === 5) { // EventType: DOWN
		//if (omicronManager.sagePointers[address] !== undefined) {
		//	return;
		//}

		if (omicronManager.gestureDebug) {
			sageutils.log('Omicron',
				"Touch down at - (" + posX.toFixed(2) + "," + posY.toFixed(2) + ") initPos: ("
				+ initX.toFixed(2) + "," + initY.toFixed(2) + ") flags:" + e.flags);
		}

		// Create the pointer
		omicronManager.createSagePointer(address);

		// Set the pointer style
		var pointerStyle = "Touch";
		if (omicronManager.config.style !== undefined) {
			pointerStyle = omicronManager.config.style;
		}
		omicronManager.showPointer(address, {
			label:  "Touch: " + sourceID,
			color: "rgba(242, 182, 15, 1.0)",
			sourceType: pointerStyle
		});

		// Set pointer mode
		var mode = "Window";
		if (omicronManager.config.interactionMode !== undefined) {
			mode = omicronManager.config.interactionMode;
		}

		if (mode === "App") {
			omicronManager.pointerChangeMode(address);
		}

		// Set the initial pointer position
		omicronManager.pointerPosition(address, { pointerX: posX, pointerY: posY });

		// Send 'click' event
		omicronManager.pointerPress(address, posX, posY, { button: "left" });

	} else if (e.type === 6) { // EventType: UP
		//if (omicronManager.sagePointers[address] === undefined) {
		//	return;
		//}

		if (omicronManager.gestureDebug) {
			// console.log("Touch release");
			sageutils.log('Omicron', "Touch up at - (" + posX.toFixed(2) + "," + posY.toFixed(2) + ") initPos: ("
				+ initX.toFixed(2) + "," + initY.toFixed(2) + ") flags:" + e.flags);
		}

		// Hide pointer
		omicronManager.hidePointer(address);

		// Release event
		omicronManager.pointerRelease(address, posX, posY, { button: "left" });

	} else if (e.type === 15 && omicronManager.enableTwoFingerZoom) {
		// zoom

		// Omicron zoom event extra data:
		// 0 = touchWidth (parsed above)
		// 1 = touchHeight (parsed above)
		// 2 = initX (parsed above)
		// 3 = initY (parsed above)
		// 4 = zoom delta
		// 5 = event second type ( 1 = Down, 2 = Move, 3 = Up )

		// extraDataType 1 = float
		// console.log("Touch zoom " + e.extraDataType  + " " + e.extraDataItems );
		if (e.extraDataType === 1 && e.extraDataItems >= 4) {
			var zoomDelta = msg.readFloatLE(offset); offset += 4;
			var eventType = msg.readFloatLE(offset);  offset += 4;

			// Zoom start/down
			if (eventType === 1) {
				// console.log("Touch zoom start");
				if (omicronManager.pointerGestureState[sourceID] !== "move") {
					omicronManager.pointerScrollStart(address, posX, posY);
					omicronManager.initZoomPos[sourceID] = {initX: posX, initY: posY};
					omicronManager.pointerGestureState[sourceID] = "zoom";
				}
			} else {
				// Zoom move
				omicronManager.pointerScroll(address, { wheelDelta: -zoomDelta * omicronManager.touchZoomScale });

				if (omicronManager.initZoomPos[sourceID] !== undefined &&
					omicronManager.pointerGestureState[sourceID] === "zoom") {
					initX = omicronManager.initZoomPos[sourceID].initX;
					initY = omicronManager.initZoomPos[sourceID].initY;
				}

				distance = Math.sqrt(Math.pow(Math.abs(posX - initX), 2) + Math.pow(Math.abs(posY - initY), 2));

				if (omicronManager.gestureDebug) {
					console.log("Touch zoom at - (" + posX.toFixed(2) + "," + posY.toFixed(2) + ") initPos: ("
					+ initX.toFixed(2) + "," + initY.toFixed(2) + ")");
					console.log("Touch zoom distance: " + distance);
					console.log("Touch zoom state: " + omicronManager.pointerGestureState[sourceID]);
				}

				if (omicronManager.enableTwoFingerWindowDrag && distance > omicronManager.zoomToMoveGestureMinimumDistance) {
					if (omicronManager.pointerGestureState[sourceID] === "zoom") {
						omicronManager.pointerScrollEnd(address, posX, posY);
						omicronManager.pointerRelease(address, posX, posY, { button: "left" });
						omicronManager.createSagePointer(address);
						omicronManager.pointerPress(address, posX, posY, { button: "left" });
						omicronManager.pointerGestureState[sourceID] = "move";
					}

				}
				angle = Math.atan2(posY -  initY, posX - initX);

				accelDistance = distance * omicronManager.acceleratedDragScale;
				accelX = posX + accelDistance * Math.cos(angle);
				accelY = posY + accelDistance * Math.sin(angle);

				omicronManager.pointerPosition(address, { pointerX: accelX, pointerY: accelY });
				omicronManager.pointerMove(address, accelX, accelY, { deltaX: 0, deltaY: 0, button: "left" });
				omicronManager.lastNonCritEventTime = Date.now();
			}
		}
	} else {
		console.log("\t UNKNOWN event type ", e.type, typeStrings[e.type]);
	}

	if (emit > 2) {
		dstart = Date.now();
		emit = 0;
	}
};

module.exports = OmicronManager;
