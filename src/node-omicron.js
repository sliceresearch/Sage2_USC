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

var omicronManager; // Handle to OmicronManager inside of udp blocks (instead of this)

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

	this.touchOffset = [ 0, 0 ];
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

	this.config = sysConfig.experimental.omicron;

	this.coordCalculator = new CoordinateCalculator(this.config);

	var serverHost = sysConfig.host;

	if (this.config.host === undefined) {
		console.log(sageutils.header('Omicron') + 'Using web server hostname: ', sysConfig.host);
	} else {
		serverHost = this.config.host;
		console.log(sageutils.header('Omicron') + 'Using server hostname: ', serverHost);
	}

	if (this.config.dataPort === undefined) {
		console.log(sageutils.header('Omicron') + 'dataPort undefined. Using default: ', this.omicronDataPort);
	} else {
		this.omicronDataPort =  this.config.dataPort;
		console.log(sageutils.header('Omicron') + 'Listening for input server on port: ', this.omicronDataPort);
	}

	if (this.config.touchOffset) {
		this.touchOffset =  this.config.touchOffset;
		console.log(sageutils.header('Omicron') + 'Touch points offset by: ', this.touchOffset);
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

		console.log(sageutils.header('Omicron') + 'Touch Display Resolution: ' + this.totalWidth + " " + this.totalHeight);
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
		console.log(sageutils.header('Omicron') + 'Input server "' + socket.remoteAddress + '" connected on port ' + socket.remotePort);

		socket.on('error', function(e) {
			console.log(sageutils.header('Omicron') + 'Input server disconnected');
			socket.destroy(); // Clean up disconnected socket
		});

	});

	server.listen(this.omicronDataPort, serverHost);

	if (this.config.useOinputserver === true) {

		var msgPort = 28000;
		if (this.config.msgPort) {
			msgPort = this.config.msgPort;
		}

		console.log(sageutils.header('Omicron') + 'Connecting to Omicron oinputserver at "' + omicronManager.config.inputServerIP +
				'" on msgPort: ' + msgPort + '.');
		this.oinputserverSocket = net.connect(msgPort, this.config.inputServerIP,  function() {
			// 'connect' listener
			console.log(sageutils.header('Omicron') + 'Connection Successful. Requesting data on port ', omicronManager.omicronDataPort);

			var sendbuf = util.format("omicron_data_on,%d\n", omicronManager.omicronDataPort);
			omicronManager.oinputserverSocket.write(sendbuf);
		});

		this.oinputserverSocket.on('end', function(e) {
			console.log(sageutils.header('Omicron') + 'oinputserver disconnected');
		});
		this.oinputserverSocket.on('error', function(e) {
			console.log(sageutils.header('Omicron') + 'oinputserver connection error - code:', e.code);
		});
	}
}

 /**
 * Sends disconnect signal to input server
 *
 * @method disconnect
 */
OmicronManager.prototype.disconnect = function() {
	if (this.oinputserverSocket) {
		var sendbuf = util.format("data_off");
		console.log(sageutils.header('Omicron') + 'Sending disconnect signal');
		this.oinputserverSocket.write(sendbuf);
	}
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
	pointerDblClickCB,
	pointerCloseGestureCB,
	keyDownCB,
	keyUpCB,
	keyPressCB,
	createRadialMenuCB) {
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
	this.pointerDblClick     = pointerDblClickCB;
	this.pointerCloseGesture = pointerCloseGestureCB;
	this.keyDown             = keyDownCB;
	this.keyUp               = keyUpCB;
	this.keyPress            = keyPressCB;
	this.createRadialMenu    = createRadialMenuCB;

	this.createSagePointer(this.config.inputServerIP);
};

 /**
 * Manages incoming input server data
 *
 * @method runTracker
 */
OmicronManager.prototype.runTracker = function() {
	var udp = dgram.createSocket("udp4");
	var dstart = Date.now();
	var emit   = 0;
	this.nonCriticalEventDelay = 50;

	// array to hold all the button values (1 - down, 0 = up)
	// var buttons = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	// var mouse   = [0, 0, 0];
	// var mousexy = [0.0, 0.0];
	// var colorpt = [0.0, 0.0, 0.0];
	// var mousez  = 0;
	// var wandObjectList = []; // Mocap object list

	this.lastNonCritEventTime = dstart;

	udp.on("message", function(msg, rinfo) {
		// console.log("UDP> got: " + msg + " from " + rinfo.address + ":" + rinfo.port);
		// var out = util.format("UDP> msg from [%s:%d] %d bytes", rinfo.address,rinfo.port,msg.length);
		// console.log(out);

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
		var serviceType = e.serviceType;
		// console.log("Event service type: " + serviceType);

		// console.log(e.sourceId, e.posx, e.posy, e.posz);
		// serviceID:
		// (Note: this depends on the order the services are specified on the server)
		// 0 = Touch
		// 1 = Classic SAGEPointer
		// var serviceID = e.serviceId;

		// Appending sourceID to pointer address ID
		var address = rinfo.address + ":" + sourceID;

		// ServiceTypePointer
		//
		if (serviceType === 0) {
			omicronManager.processPointerEvent(e, sourceID, posX, posY, msg, offset, address, emit, dstart);
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
			var screenPos = omicronManager.coordCalculator.wandToScreenCoordinates(e.posx, e.posy, e.posz, e.orx, e.ory, e.orz, e.orw);
			// console.log("Screen pos: ("+screenPos.x+", "+screenPos.y+")" );

			address = omicronManager.config.inputServerIP;

			// if( omicronManager.showPointerToggle === false )
			// return;

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

			if (timeSinceLastNonCritEvent >= nonCriticalEventDelay) {
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
						if (timeSinceLastNonCritEvent >= nonCriticalEventDelay) {
							omicronManager.pointerPosition(address, { pointerX: posX, pointerY: posY });
							omicronManager.pointerMove(address, posX, posY, { deltaX: 0, deltaY: 0, button: "left" });

							// console.log((Date.now() - dstart) + "] Wand drag");
							omicronManager.lastNonCritEventTime = Date.now();
						}
					}
				} else if (omicronManager.lastWandFlags === 0 && (e.flags & menuButton) === menuButton && omicronManager.showPointerToggle) {
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
	});// end udp.on 'message'

	udp.on("listening", function() {
		var address = udp.address();
		console.log(sageutils.header('Omicron') + 'UDP listening ' + address.address + ":" + address.port);
	});

	udp.bind(this.omicronDataPort);
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

	if (omicronManager.eventDebug) {
		console.log(sageutils.header('Omicron') + "pointer ID " + sourceID + " event! type: " + e.type);
		console.log(sageutils.header('Omicron') + "pointer event! type: " + e.type);
		console.log(sageutils.header('Omicron') + "ServiceTypePointer> source ", e.sourceId);
		console.log(sageutils.header('Omicron') + "ServiceTypePointer> serviceID ", e.serviceId);
		console.log(sageutils.header('Omicron') + "pointer width/height ", touchWidth, touchHeight);
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
	// var FLAG_BIG_TOUCH = User << 3;
	var FLAG_FIVE_FINGER_HOLD = User << 4;
	// var FLAG_FIVE_FINGER_SWIPE = User << 5;
	var FLAG_THREE_FINGER_HOLD = User << 6;
	var FLAG_SINGLE_CLICK = User << 7;
	var FLAG_DOUBLE_CLICK = User << 8;
	var FLAG_MULTI_TOUCH = User << 9;

	var initX = 0;
	var initY = 0;

	// Type 15 = Zoom
	if (e.extraDataItems >= 4 && e.type !== 15) {
		initX = msg.readFloatLE(offset); offset += 4;
		initY = msg.readFloatLE(offset); offset += 4;

		initX *= omicronManager.totalWidth;
		initY *= omicronManager.totalHeight;
	}

	var timeSinceLastNonCritEvent = Date.now() - omicronManager.lastNonCritEventTime;

	if (e.type === 4) {
		if (timeSinceLastNonCritEvent > omicronManager.nonCriticalEventDelay) {
			// move
			if (e.flags === FLAG_SINGLE_TOUCH) {
				if (omicronManager.gestureDebug) {
					console.log("Touch move at - (" + posX + "," + posY + ") initPos: (" + initX + "," + initY + ")");
				}

				var distance = Math.sqrt(Math.pow(Math.abs(posX - initX), 2) + Math.pow(Math.abs(posY - initY), 2));
				var angle = Math.atan2(posY -  initY, posX - initX);

				var accelDistance = distance * omicronManager.acceleratedDragScale;
				var accelX = posX + accelDistance * Math.cos(angle);
				var accelY = posY + accelDistance * Math.sin(angle);

				omicronManager.pointerPosition(address, { pointerX: accelX, pointerY: accelY });
				omicronManager.pointerMove(address, accelX, accelY, { deltaX: 0, deltaY: 0, button: "left" });
				omicronManager.lastNonCritEventTime = Date.now();
			} else if (e.flags === FLAG_FIVE_FINGER_HOLD) {
				if (omicronManager.gestureDebug) {
					console.log("Touch move gesture: Five finger hold - " + Date.now());
				}
				omicronManager.pointerCloseGesture(address, posX, posY, Date.now(), 1);
			} else if (e.flags === FLAG_MULTI_TOUCH) {
				omicronManager.pointerPosition(address, { pointerX: posX, pointerY: posY });
			}
		}
	} else if (e.type === 15) {
		// zoom

		/*
		Omicron zoom event extra data:
		0 = touchWidth (parsed above)
		1 = touchHeight (parsed above)
		2  = zoom delta
		3 = event second type ( 1 = Down, 2 = Move, 3 = Up )
		*/
		// extraDataType 1 = float
		// console.log("Touch zoom " + e.extraDataType  + " " + e.extraDataItems );
		if (e.extraDataType === 1 && e.extraDataItems >= 4) {
			var zoomDelta = msg.readFloatLE(offset); offset += 4;
			var eventType = msg.readFloatLE(offset);  offset += 4;

			// Zoom start/down
			if (eventType === 1) {
				// console.log("Touch zoom start");
				omicronManager.pointerScrollStart(address, posX, posY);
			} else {
				// Zoom move
				if (omicronManager.gestureDebug) {
					console.log("Touch zoom");
				}
				omicronManager.pointerScroll(address, { wheelDelta: -zoomDelta * omicronManager.touchZoomScale });
			}
		}

	} else if (e.type === 5) { // button down
		if (omicronManager.gestureDebug) {
			console.log("Touch down at - (" + posX + "," + posY + ") initPos: (" + initX + "," + initY + ") flags:" + e.flags);
		}

		if (e.flags === FLAG_SINGLE_TOUCH || e.flags === FLAG_MULTI_TOUCH) {
			// Create pointer
			if (address in omicronManager.sagePointers) {
				omicronManager.showPointer(address, { label:  "Touch: " + sourceID, color: "rgba(242, 182, 15, 1.0)", sourceType: "Touch" });
			} else {
				omicronManager.createSagePointer(address);
				omicronManager.showPointer(address, { label:  "Touch: " + sourceID, color: "rgba(242, 182, 15, 1.0)", sourceType: "Touch" });
				omicronManager.pointerPress(address, posX, posY, { button: "left" });
			}
		} else if (e.flags === FLAG_FIVE_FINGER_HOLD) {
			if (omicronManager.gestureDebug) {
				console.log("Touch down gesture: Five finger hold - " + Date.now());
			}
			omicronManager.pointerCloseGesture(address, posX, posY, Date.now(), 0);
		} else if (e.flags === FLAG_THREE_FINGER_HOLD) {
			if (omicronManager.gestureDebug) {
				console.log("Touch gesture: Three finger hold");
			}
			// omicronManager.createRadialMenu( sourceID, posX, posY );
			omicronManager.pointerPress(address, posX, posY, { button: "right" });
		} else if (e.flags === FLAG_SINGLE_CLICK) {
			if (omicronManager.gestureDebug) {
				console.log("Touch gesture: Click");
			}

		} else if (e.flags === FLAG_DOUBLE_CLICK) {
			if (omicronManager.gestureDebug) {
				console.log("Touch gesture: Double Click");
			}
			omicronManager.pointerDblClick(address, posX, posY);
		}
	} else if (e.type === 6) { // button up
		if (e.flags === FLAG_SINGLE_TOUCH || e.flags === FLAG_MULTI_TOUCH) {
			// Hide pointer
			omicronManager.hidePointer(address);

			// Release event
			omicronManager.pointerRelease(address, posX, posY, { button: "left" });

			if (omicronManager.gestureDebug) {
				// console.log("Touch release");
				console.log("Touch up at - (" + posX + "," + posY + ") initPos: (" + initX + "," + initY + ") flags:" + e.flags);
			}
		} else if (e.flags === FLAG_FIVE_FINGER_HOLD) {
			if (omicronManager.gestureDebug) {
				console.log("Touch up gesture: Five finger hold - " + Date.now());
			}
			omicronManager.pointerCloseGesture(address, posX, posY, Date.now(), 2);
		}
	} else {
		console.log("\t UNKNOWN event type ", e.type);
	}

	if (emit > 2) { dstart = Date.now(); emit = 0; }
};

module.exports = OmicronManager;
