// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

// npm registry: built-in or defined in package.json
var fs          = require('fs');                  // filesystem access
var http        = require('http');                // http server
var https       = require('https');               // https server
var os          = require('os');                  // operating system access
var path        = require('path');                // file path extraction and creation
var crypto      = require('crypto');

// custom node modules
var websocketIO = require('../../src/node-websocket.io');   // creates WebSocket server and clients

var updateRate = 20;  // ~ fps
var timeout    = 1000 / updateRate;

// Bound random number
function randomNumber(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// random RGB color, return in hex format
function randomColor() {
    var r = randomNumber(0, 255);
    var g = randomNumber(0, 255);
    var b = randomNumber(0, 255);
    var acolor = { r: r, g: g, b: b};
    console.log('A random color', acolor);
	var value = ((1 << 24) + (acolor.r << 16) + (acolor.g << 8) + acolor.b).toString(16).slice(1);
	console.log(' in hex', '#'+value);
    return '#'+value;
}

// create the websocket connection and start the timer
function createRemoteConnection(wsURL) {
	var remote = new websocketIO(wsURL, false, function() {
		console.log("connected to ", wsURL);

		var clientDescription = {
			clientType: "sageUI",
			sendsPointerData: true,
			sendsMediaStreamFrames: true,
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
		remote.emit('addClient', clientDescription);
	});

	remote.onclose(function() {
		console.log("Remote site now offline");
	});

	remote.on('initialize', function(wsio, data) {
		console.log('initialize', data.UID);
	});

	remote.on('setupDisplayConfiguration', function(wsio, data) {
		console.log('setupDisplayConfiguration', data.totalWidth, data.totalHeight);

		// generate a random pointer name
		var random_name = 'pointer-' + crypto.randomBytes(3).toString('hex');
		// send the message to the server with a random color
		wsio.emit('startSagePointer', {label: random_name, color: randomColor() });

		var px   = randomNumber(0,data.totalWidth);
		var py   = randomNumber(0,data.totalHeight);
		var incx = 1;
		var incy = 1;

		wsio.emit('pointerPosition', {pointerX:px, pointerY:py});

		// approximation
		var sensitivity = Math.min(data.totalWidth,data.totalHeight) / 1080;

		// create timer
		setInterval( function () {
			// step between 0 and 10 pixels
			var movementX = randomNumber(0,10);
			var movementY = randomNumber(0,10);
			// scaled up for wall size
			var dx = Math.round(movementX*sensitivity);
			var dy = Math.round(movementY*sensitivity);
			// detect wall size limits and reverse course
			if (px > data.totalWidth) incx *= -1;
			if (px < 0) incx *= -1;
			if (py > data.totalHeight) incy *= -1;
			if (py < 0) incy *= -1;
			// update global position
			px = px + incx * dx;
			py = py + incy * dy;
			// send the message
			wsio.emit('ptm', {dx: incx * dx, dy: incy * dy});
		}, timeout);
	});
	return remote;
}

// default URL
var url = "wss://localhost:443";

// If there's an argument, use it as a url
//     wss://hostname:portnumber
if (process.argv.length === 3) {
	url = process.argv[2];
}
console.log('Connecting to server', url);

// Create and go !
var ptr = createRemoteConnection(url);

