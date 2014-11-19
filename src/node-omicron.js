// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/**
 @module omicron
 */


var net       = require('net');
var util      = require('util');
var dgram     = require('dgram');
var WebSocket = require('ws');

var websocketIO  = require('./node-websocket.io');  // creates WebSocket server and clients
var interaction  = require('./node-interaction');   // custom interaction module
var sagepointer  = require('./node-sagepointer');   // custom sagepointer module
var coordinateCalculator = require('./node-coordinateCalculator'); 

var dataPort     = 9123;

var eventDebug   = false;
var gestureDebug = false;
var coordCalculator;

var pointerOffscreen  = false;
var showPointerToggle = false;
var lastWandFlags     = 0;


var wandLabel = "wandTracker";
var wandColor = "rgba(250, 5, 5, 1.0)";
var wandScaleDelta = 0.1;

var lastPosX = 0;
var lastPosY = 0;

var touchZoomScale = 520;
var acceleratedDragScale  = 0;

var oinputserverSocket;

function omicronManager( sysConfig )
{
	config = sysConfig.experimental.omicron;
	
	coordCalculator = new coordinateCalculator( config );
	
	serverHost = sysConfig.host;
	
	if( config.host === undefined )
	{
		console.log('Omicron: Using web server hostname: ', sysConfig.host);
	}
	else
	{
		serverHost = config.host;
		console.log('Omicron: Using server hostname: ', serverHost);
	}
	
	if( config.dataPort === undefined )	
	{
		console.log('Omicron: dataPort undefined. Using default: ', dataPort);
	}
	else
	{
		dataPort =  config.dataPort;
		console.log('Omicron: Listening for input server on port: ', dataPort);
	}
	
	if( sysConfig.resolution )
	{
		var columns = 1;
		var rows = 1;
		
		if( sysConfig.layout )
		{
			columns = sysConfig.layout.columns;
			rows = sysConfig.layout.rows;
		}
		
		totalWidth = sysConfig.resolution.width * columns;
		totalHeight = sysConfig.resolution.height * rows;
		
		console.log("Omicron: Touch Display Resolution: " + totalWidth + " " + totalHeight);
	}
	else
	{
		totalWidth = 8160;
		totalHeight = 2304;
	}
	
	if( config.zoomGestureScale )
	{
		touchZoomScale = config.zoomGestureScale;
	}
	
	if( config.acceleratedDragScale )
	{
		acceleratedDragScale = config.acceleratedDragScale;
	}
	
	// For accepting input server connection
	var server = net.createServer(function (socket) {
		console.log('Omicron: Input server "' + socket.remoteAddress + '" connected on port ' + socket.remotePort);
		
		socket.on('error', function(e) {
			console.log('Omicron: Input server disconnected');
			socket.destroy(); // Clean up disconnected socket
		});

	});

	server.listen(dataPort, serverHost);
	
	if( config.useOinputserver === true )
	{

		var msgPort = 28000;
		if( config.msgPort )
			msgPort = config.msgPort;
			
		oinputserverSocket = net.connect(msgPort, config.inputServerIP,  function()
		{ //'connect' listener
			console.log('Connected to Omicron oinputserver at "'+config.inputServerIP+'" on msgPort: '+msgPort+'. Requesting data on port ', dataPort);

			var sendbuf = util.format("omicron_data_on,%d\n", dataPort);
			//console.log("Omicron> Sending handshake: ", sendbuf);
			oinputserverSocket.write(sendbuf);
		});
		
		oinputserverSocket.on('end', function(e) {
			console.log('Omicron: oinputserver disconnected');
		});
		oinputserverSocket.on('error', function(e) {
			console.log('Omicron: oinputserver connection error - code:', e.code);
		});
	}
}

omicronManager.prototype.disconnect = function() {
	if( oinputserverSocket )
	{
		var sendbuf = util.format("data_off");
		console.log("Omicron> Sending disconnect signal");
		oinputserverSocket.write(sendbuf);
	}
};

omicronManager.prototype.setCallbacks = function( 
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
	createRadialMenuCB
)
{
	sagePointers = sagePointerList;
	createSagePointer = createSagePointerCB;
	showPointer = showPointerCB;
	pointerPress = pointerPressCB;
	pointerMove = pointerMoveCB;
	pointerPosition = pointerPositionCB;
	hidePointer = hidePointerCB;
	pointerRelease = pointerReleaseCB;
	pointerScrollStart = pointerScrollStartCB;
	pointerScroll = pointerScrollCB;
	pointerDblClick = pointerDblClickCB;
	pointerCloseGesture = pointerCloseGestureCB;
	keyDown = keyDownCB;
	keyUp = keyUpCB;
	keyPress = keyPressCB;
	createRadialMenu = createRadialMenuCB;
	
	createSagePointer(config.inputServerIP);
	
};

omicronManager.prototype.runTracker = function()
{
	udp = undefined;

	udp = dgram.createSocket("udp4");
	var dstart = Date.now();
	var emit = 0;

	// array to hold all the button values (1 - down, 0 = up)
	var buttons = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	var mouse   = [0, 0, 0];
	var mousexy = [0.0, 0.0];
	var colorpt = [0.0, 0.0, 0.0];
	var mousez  = 0;
	
	udp.on("message", function (msg, rinfo)
	{
		//console.log("UDP> got: " + msg + " from " + rinfo.address + ":" + rinfo.port);
		//var out = util.format("UDP> msg from [%s:%d] %d bytes", rinfo.address,rinfo.port,msg.length);
		//console.log(out);
	 
		if ((Date.now() - dstart) > 100)
		{
			var offset = 0;
			var e = {};
			if (offset < msg.length) e.timestamp = msg.readUInt32LE(offset); offset += 4;
			if (offset < msg.length) e.sourceId = msg.readUInt32LE(offset); offset += 4;
			if (offset < msg.length) e.serviceId = msg.readInt32LE(offset); offset += 4;
			if (offset < msg.length) e.serviceType = msg.readUInt32LE(offset); offset += 4;
			if (offset < msg.length) e.type = msg.readUInt32LE(offset); offset += 4;
			if (offset < msg.length) e.flags = msg.readUInt32LE(offset); offset += 4;

			if (offset < msg.length) e.posx = msg.readFloatLE(offset); offset += 4;
			if (offset < msg.length) e.posy = msg.readFloatLE(offset); offset += 4;
			if (offset < msg.length) e.posz = msg.readFloatLE(offset); offset += 4;
			if (offset < msg.length) e.orw = msg.readFloatLE(offset); offset += 4;
			if (offset < msg.length) e.orx = msg.readFloatLE(offset); offset += 4;
			if (offset < msg.length) e.ory = msg.readFloatLE(offset); offset += 4;
			if (offset < msg.length) e.orz = msg.readFloatLE(offset); offset += 4;
			if (offset < msg.length) e.extraDataType = msg.readUInt32LE(offset); offset += 4;
			if (offset < msg.length) e.extraDataItems = msg.readUInt32LE(offset); offset += 4;
			if (offset < msg.length) e.extraDataMask = msg.readUInt32LE(offset); offset += 4;

			// Extra data types:
			//    0 ExtraDataNull,
			//    1 ExtraDataFloatArray,
			//    2 ExtraDataIntArray,
			//    3 ExtraDataVector3Array,
			//    4 ExtraDataString,
			//    5 ExtraDataKinectSpeech

			var r_roll  = Math.asin(2.0*e.orx*e.ory + 2.0*e.orz*e.orw);
			var r_yaw   = Math.atan2(2.0*e.ory*e.orw-2.0*e.orx*e.orz , 1.0 - 2.0*e.ory*e.ory - 2.0*e.orz*e.orz);
			var r_pitch = Math.atan2(2.0*e.orx*e.orw-2.0*e.ory*e.orz , 1.0 - 2.0*e.orx*e.orx - 2.0*e.orz*e.orz);
					
			var posX = e.posx * totalWidth;
			var posY = e.posy* totalHeight;
			var sourceID = e.sourceId;

			// serviceType:
			//		0 = Pointer
			//		1 = Mocap
			//		2 = Keyboard
			//		3 = Controller
			//		4 = UI
			//		5 = Generic
			//		6 = Brain
			//		7 = Wand
			//		8 = Speech
			var serviceType = e.serviceType;
			//console.log("Event service type: " + serviceType);
			
			// serviceID:
			// (Note: this depends on the order the services are specified on the server)
			//		0 = Touch
			//		1 = Classic SAGEPointer
			var serviceID = e.serviceId;
					
			var touchWidth = 0;
			var touchHeight = 0;
			if( serviceID === 0 &&  e.extraDataItems >= 2 )
			{
				touchWidth = msg.readFloatLE(offset); offset += 4;
				touchHeight = msg.readFloatLE(offset); offset += 4;
				
				
				//console.log("Touch size: " + touchWidth + "," + touchHeight); 
			}
			
			// Appending sourceID to pointer address ID
			var address = rinfo.address+":"+sourceID;
			
			// ServiceTypePointer //////////////////////////////////////////////////
			if ( serviceType === 0 )
			{  
				if( eventDebug )
				{
					console.log("pointer ID "+ sourceID +" event! type: " + e.type  );
					console.log("pointer event! type: " + e.type  );
					console.log("ServiceTypePointer> source ", e.sourceId);
					console.log("ServiceTypePointer> serviceID ", e.serviceId);
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
				if( serviceID === 0  && e.extraDataItems >= 4 && e.type !== 15  ) // Type 15 = Zoom
				{
					initX = msg.readFloatLE(offset); offset += 4;
					initY = msg.readFloatLE(offset); offset += 4;
					
					initX *= totalWidth;
					initY *= totalHeight;
				}
				
				//console.log( e.flags );
				if (e.type === 3)
				{ // update (Used only by classic SAGE pointer)
					/* if( e.sourceId in ptrs )
						return;
					colorpt = [Math.floor(e.posx*255.0), Math.floor(e.posy*255.0), Math.floor(e.posz*255.0)];
					if (offset < msg.length)
					{
						if (e.extraDataType == 4 && e.extraDataItems > 0)
						{
							console.log("create touch pointer"); 
							e.extraString = msg.toString("utf-8", offset, offset+e.extraDataItems);
							ptrinfo = e.extraString.split(" ");
							offset += e.extraDataItems;
							ptrs[e.sourceId] = {id:e.sourceId, label:ptrinfo[0], ip:ptrinfo[1], mouse:[0,0,0], color:colorpt, zoom:0, position:[0,0], mode:0};
							sio.sockets.emit('createPointer', {type: 'ptr', id: e.sourceId, label: ptrinfo[0], color: colorpt, zoom:0, position:[0,0], src: "resources/mouse-pointer-hi.png" });
						}
					}*/
				}
				else if (e.type === 4)
				{ // move
					if( e.flags === FLAG_SINGLE_TOUCH )
					{
						if( gestureDebug )
						{
							console.log("Touch move at - ("+posX+","+posY+") initPos: ("+initX+","+initY+")" );
						}
						
						var distance = Math.sqrt( Math.pow( Math.abs(posX - initX), 2 ) + Math.pow( Math.abs(posY - initY), 2 ) );
						var angle = Math.atan2( posY -  initY, posX - initX );
						
						var accelDistance = distance * acceleratedDragScale;
						var accelX = posX + accelDistance * Math.cos(angle);
						var accelY = posY + accelDistance * Math.sin(angle);
						pointerPosition( address, { pointerX: accelX, pointerY: accelY } );
						pointerMove(address, accelX, accelY, { deltaX: 0, deltaY: 0, button: "left" } );
	
					}
					else if( e.flags === FLAG_FIVE_FINGER_HOLD )
					{
						if( gestureDebug )
						{
							console.log("Touch move gesture: Five finger hold - " + Date.now());
						}
						pointerCloseGesture( address, posX, posY, Date.now(), 1 );
					}
					else if( e.flags === FLAG_MULTI_TOUCH )
					{
						pointerPosition( address, { pointerX: posX, pointerY: posY } );
					}
				}
				else if (e.type == 15)
				{ // zoom
					
					/*
					Omicron zoom event extra data:
					0 = touchWidth (parsed above)
					1 = touchHeight (parsed above)
					2  = zoom delta
					3 = event second type ( 1 = Down, 2 = Move, 3 = Up )
					*/
					// extraDataType 1 = float
					//console.log("Touch zoom " + e.extraDataType  + " " + e.extraDataItems );
					if (e.extraDataType === 1 && e.extraDataItems >= 4)
					{
						var zoomDelta = msg.readFloatLE(offset); offset += 4;
						var eventType = msg.readFloatLE(offset);  offset += 4;
						
						//console.log("Touch zoom zoomDelta " + zoomDelta );
						//console.log("Touch zoom type " + eventType );
						
						if( eventType === 1 ) // Zoom start/down
						{
							//console.log("Touch zoom start");
							pointerScrollStart( address, posX, posY );
						}
						else // Zoom move
						{
							if( gestureDebug )
								console.log("Touch zoom");
							pointerScroll( address, { wheelDelta: -zoomDelta * touchZoomScale } );
						}
					}

				}
				else if (e.type === 5) { // button down
					if( gestureDebug )
					{
						console.log("Touch down at - ("+posX+","+posY+") initPos: ("+initX+","+initY+") flags:" + e.flags);
					}

					if( e.flags === FLAG_SINGLE_TOUCH || e.flags === FLAG_MULTI_TOUCH )
					{
						// Create pointer
						if(address in sagePointers){
							showPointer( address, { label:  "Touch: " + sourceID, color: "rgba(255, 255, 255, 1.0)" } );
						}else{
							createSagePointer(address);
							
							showPointer( address, { label:  "Touch: " + sourceID, color: "rgba(255, 255, 255, 1.0)" } );
							
							pointerPress( address, posX, posY, { button: "left" } );
						}
					}
					else if( e.flags === FLAG_FIVE_FINGER_HOLD )
					{
						if( gestureDebug )
						{
							console.log("Touch down gesture: Five finger hold - " + Date.now());
						}
						pointerCloseGesture( address, posX, posY, Date.now(), 0 );
					}
					else if( e.flags === FLAG_THREE_FINGER_HOLD )
					{
						if( gestureDebug )
						{
							console.log("Touch gesture: Three finger hold");
						}
						createRadialMenu( sourceID, posX, posY );
					}
					else if( e.flags === FLAG_SINGLE_CLICK )
					{
						if( gestureDebug )
						{
							console.log("Touch gesture: Click");
						}
						
					}
					else if( e.flags === FLAG_DOUBLE_CLICK )
					{
						if( gestureDebug )
						{
							console.log("Touch gesture: Double Click");
						}
						pointerDblClick( address, posX, posY );
					}
				}
				else if (e.type == 6)
				{ // button up
					if( e.flags === FLAG_SINGLE_TOUCH || e.flags === FLAG_MULTI_TOUCH )
					{
						// Hide pointer
						hidePointer(address);
						
						// Release event
						pointerRelease(address, posX, posY, { button: "left" } );
						
						if( gestureDebug )
						{
							//console.log("Touch release");
							console.log("Touch up at - ("+posX+","+posY+") initPos: ("+initX+","+initY+") flags:" + e.flags);
						}
					}
					else if( e.flags === FLAG_FIVE_FINGER_HOLD )
					{
						if( gestureDebug )
						{
							console.log("Touch up gesture: Five finger hold - " + Date.now());
						}
						pointerCloseGesture( address, posX, posY, Date.now(), 2 );
					}
				}
				else
				{
				console.log("\t UNKNOWN event type ", e.type);                                        
				}

				if (emit>2) { dstart = Date.now(); emit = 0; }
			}// ServiceTypePointer ends ///////////////////////////////////////////
			// ServiceTypeWand //////////////////////////////////////////////////
			else if (serviceType == 7)
			{  
				// Wand Button Flags
				button1 = 1;
				button2 = 2; // Circle
				button3 = 4; // Cross
				specialButton1 = 8;
				specialButton2 = 16;
				specialButton3 = 32;
				button4 = 64;
				button5 = 128; // L1
				button6 = 256; // L3
				button7 = 512; // L2
				buttonUp = 1024;
				buttonDown = 2048;
				buttonLeft = 4096;
				buttonRight = 8192;
				button8 = 32768;
				button9 = 65536;
				
				//console.log("Wand Position: ("+e.posx+", "+e.posy+","+e.posz+")" );
				//console.log("Wand Rotation: ("+e.orx+", "+e.ory+","+e.orz+","+e.orw+")" );
				var screenPos = coordCalculator.wandToScreenCoordinates( e.posx, e.posy, e.posz, e.orx, e.ory, e.orz, e.orw );
				//console.log("Screen pos: ("+screenPos.x+", "+screenPos.y+")" );
				
				address = config.inputServerIP;
				
				
				
				if( showPointerToggle && screenPos.x != -1 && screenPos.y != -1 )
				{
					posX = screenPos.x * totalWidth;
					posY = screenPos.y * totalHeight;
					
					lastPosX = posX;
					lastPosY = posY;
					
					if( pointerOffscreen && showPointerToggle )
					{
						showPointer( config.inputServerIP, { label: wandLabel, color: wandColor } );
						pointerPosition( address, { pointerX: posX, pointerY: posY } );
						pointerOffscreen = false;
					}
				}
				else
				{
					posX = lastPosX;
					posY = lastPosY;
					
					if( !pointerOffscreen && showPointerToggle )
					{
						hidePointer( config.inputServerIP );
						pointerOffscreen = true;
					}
				}

				pointerPosition( address, { pointerX: posX, pointerY: posY } );
				
				clickDragButton = button3;
				showHideButton = button7;
				
				scaleUpButton = buttonUp;
				scaleDownButton = buttonDown;
				
				maximizeButton = button5;
				
				previousButton = buttonLeft;
				nextButton = buttonRight;
				
				playButton = button2;
				
				if( e.flags !== 0 )
				{
					//console.log("Wand flags: " + e.flags + " " + (lastWandFlags & playButton) );
					if( (e.flags & clickDragButton) == clickDragButton )
					{
						//console.log("wandPointer press");
						pointerPress( address, posX, posY );
					}
					else if( lastWandFlags === 0 && (e.flags & showHideButton) == showHideButton )
					{
						if( !showPointerToggle )
						{
							showPointerToggle = true;
							showPointer( config.inputServerIP, { label:  wandLabel, color: wandColor } );
							pointerPosition( address, { pointerX: posX, pointerY: posY } );
						}
						else
						{
							showPointerToggle = false;
							//hidePointer( config.inputServerIP );
						}
					}
					else if( lastWandFlags === 0 && (e.flags & scaleUpButton) == scaleUpButton )
					{
						pointerScrollStart( address, posX, posY );
						pointerScroll( address, { wheelDelta: wandScaleDelta } );
						
					}
					else if( lastWandFlags === 0 && (e.flags & scaleDownButton) == scaleDownButton )
					{
						pointerScrollStart( address, posX, posY );
						pointerScroll( address, { wheelDelta: wandScaleDelta } );
					}
					else if( lastWandFlags === 0 && (e.flags & maximizeButton) == maximizeButton )
					{
						pointerDblClick( address, posX, posY );
					}
					else if( (lastWandFlags & previousButton) === 0 && (e.flags & previousButton) == previousButton )
					{
						keyDown( address, posX, posY, { code: 37 } );
					}
					else if( (lastWandFlags & nextButton) === 0 && (e.flags & nextButton) == nextButton )
					{
						keyDown( address, posX, posY, { code: 39 } );
					}
					else if( (lastWandFlags & playButton) === 0  && (e.flags & playButton) == playButton )
					{
						keyPress( address, posX, posY, { code: 32 } );
					}
					
					lastWandFlags = e.flags;
				}
				else if ( lastWandFlags !== 0 )
				{
					// TODO: Add a smarter way of detecting press, drag, release from button flags
					if( (lastWandFlags & clickDragButton) == clickDragButton )
					{
						//console.log("wandPointer release");
						pointerRelease( address, posX, posY );
						
						lastWandFlags = 0;
					}
					else if( (lastWandFlags & showHideButton) == showHideButton )
					{
						lastWandFlags = 0;
					}
					else if( (lastWandFlags & scaleUpButton) == scaleUpButton )
					{
						lastWandFlags = 0;
					}
					else if( (lastWandFlags & scaleDownButton) == scaleDownButton )
					{
						lastWandFlags = 0;
					}
					else if( (lastWandFlags & maximizeButton) == maximizeButton )
					{
						lastWandFlags = 0;
					}
					else if( (lastWandFlags & previousButton) == previousButton )
					{
						lastWandFlags = 0;
						keyUp( address, posX, posY, { code: 37 } );
					}
					else if( (lastWandFlags & nextButton) == nextButton )
					{
						lastWandFlags = 0;
						keyUp( address, posX, posY, { code: 39 } );
					}
					else if( (lastWandFlags & playButton) == playButton )
					{
						lastWandFlags = 0;
						keyUp( address, posX, posY, { code: 32 } );
					}
				}
				
			}// ServiceTypeWand ends ///////////////////////////////////////////
			
		}
	});

	udp.on("listening", function () {
		var address = udp.address();
		//console.log("UDP> listening " + address.address + ":" + address.port);
	});
							
	udp.bind(dataPort);
};

module.exports = omicronManager;
