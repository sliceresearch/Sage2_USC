#!/usr/bin/env node

// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

/**
 * Upload a file to a SAGE2 server and open it
 *
 * @class upload
 * @module commands
 * @submodule upload
 */

"use strict";

var fs          = require('fs');             // filesystem access
var json5       = require('json5');          // JSON5 parsing
var request     = require('request');        // external http requests
var commander   = require('commander');      // parsing command-line arguments

// custom node modules
var WebsocketIO = require('websocketio');    // creates WebSocket server and clients
var md5         = require('../src/md5');     // return standard md5 hash of given param

var connection;
var imageFilename;
var wssURL;

// Position on the wall
var imageX = 0;
var imageY = 0;
var imageW = 0;
var imageH = 0;

function postForm(formData, callback) {
	var httpsURL = wssURL.replace('wss', 'https');
	// Post a request to the server (simulating the form upload)
	request.post({url: httpsURL + "/upload", formData: formData, strictSSL: false},
		function optionalCallback(err, httpResponse, body) {
			callback(err);
		}
	);
}


function uploadPictures() {
	// Filling up the form structure
	var formData = {
		file0: {
			value:  fs.createReadStream(imageFilename),
			options: {
				filename:    imageFilename,
				contentType: 'image/jpg'
			}
		},
		dropX:  imageX.toString(),
		dropY:  imageY.toString(),
		width:  imageW.toString(),
		height: imageH.toString()
	};

	postForm(formData, function(err) {
		if (err) {
			console.error('Upload> failed:', err);
			process.exit(0);
		}
		console.log('Upload> success');
		process.exit(0);
		// setTimeout(function() { connection.emit('tileApplications'); }, 100);
	});
}

// create the websocket connection and start the timer
function createRemoteConnection(wsURL) {
	var remote = new WebsocketIO(wsURL, false, function() {
		console.log("Client> connecting to ", wsURL);

		// Grab the password passed from the command line
		var session;
		if (commander.hash && commander.hash !== '') {
			session = commander.hash;
		} else {
			session = md5.getHash(commander.password);
		}

		var clientDescription = {
			clientType: "uploader",
			requests: {
				config:  true,
				version: false,
				time:    false,
				console: false
			},
			session: session
		};

		remote.onclose(function() {
			console.log("Connection closed");
		});

		remote.on('initialize', function(wsio, data) {
			console.log('Initialize> uniqueID', data.UID);
		});

		remote.on('setupSAGE2Version', function(wsio, data) {
			console.log('SAGE2> version', json5.stringify(data));
		});

		remote.on('setupDisplayConfiguration', function(wsio, data) {
			console.log('SAGE2> display configuration', data.totalWidth, data.totalHeight);

			// convert to percent value
			if (imageX > 1) {
				imageX = imageX / data.totalWidth;
			}
			if (imageY > 1) {
				imageY = imageY / data.totalHeight;
			}
			if (imageW > 1) {
				imageW = imageW / data.totalWidth;
			}
			if (imageH > 1) {
				imageH = imageH / data.totalHeight;
			}

			uploadPictures();
		});

		remote.emit('addClient', clientDescription);
	});

	remote.ws.on('error', function(err) {
		console.log('Client> error', err.errno);
		process.exit(0);
	});

	return remote;
}

// default URL
wssURL        = "wss://localhost:443";
imageFilename = "note.jpg";

commander
	.version("1.0.0")
	.option('-s, --server <url>', 'URL SAGE2 server', 'localhost:9090')
	.option('-p, --password <password>', 'Set the password to connect to SAGE2 server', '')
	.option('-a, --hash <hash>', 'Use a hash instead of password')
	.option('[filename and extra parameters]', 'File to upload')
	.parse(process.argv);

// Extra help with examples
commander.on('--help', function() {
	console.log('  Examples:');
	console.log('');
	console.log('    $ sage_shell.js -s localhost:9090 -p tutu image.jpg [x y] [width height]');
	console.log('    $ sage_shell.js -s wss://localhost:9090 -a bd8cd8ae21342q991 image.jpg [x y] [width height]');
	console.log('');
});

if (process.argv.length === 2) {
	commander.help();
	process.exit(0);
}


// If there's an argument, use it as a url
//     wss://hostname:portnumber
if (commander.server) {
	wssURL = commander.server;
	if (wssURL.indexOf('wss://') >= 0) {
		// all good
	} else if (wssURL.indexOf('ws://') >= 0) {
		console.log('Client> switching to wss:// protocol');
		wssURL = wssURL.replace('ws', 'wss');
	} else if (wssURL.indexOf('http://') >= 0) {
		console.log('Client> switching to wss:// protocol');
		wssURL = wssURL.replace('http', 'wss');
	} else if (wssURL.indexOf('https://') >= 0) {
		console.log('Client> switching to wss:// protocol');
		wssURL = wssURL.replace('https', 'wss');
	} else {
		wssURL = 'wss://' + wssURL;
	}
}

if (commander.args.length >= 1) {
	imageFilename = commander.args[0];
}

if (commander.args.length >= 3) {
	imageX = parseFloat(commander.args[1]);
	imageY = parseFloat(commander.args[2]);
}

if (commander.args.length >= 5) {
	imageW = parseFloat(commander.args[3]);
	imageH = parseFloat(commander.args[4]);
}

console.log('Client> uploading', imageFilename);

// Create and go !
connection = createRemoteConnection(wssURL);
console.log('Starting>', connection.ws.url);
