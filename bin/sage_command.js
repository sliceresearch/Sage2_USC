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
 * Send a command to a SAGE2 server
 *
 * ./sage_command.js <url> <command> [params]
 *
 * @class command
 * @module commands
 * @submodule command
 */

"use strict";

var path        = require('path');                // file path extraction and creation
var json5       = require('json5');               // JSON5 parsing

// custom node modules
var websocketIO = require('websocketio');   // creates WebSocket server and clients

var connection;
var command;
var wssURL;

// create the websocket connection and start the timer
function createRemoteConnection(wsURL) {
	var remote = new websocketIO(wsURL, false, function() {
		console.log("Client> connecting to ", wsURL);

		var clientDescription = {
			clientType: "commandline",
			requests: {
				config:  true,
				version: false,
				time:    false,
				console: true
			}
		};

		remote.onclose(function() {
			console.log("Connection closed");
		});

		remote.on('console', function(wsio, data) {
			// just to filter a bit the long outputs
			if (data.length < 256) {
				process.stdout.write(data);
			}
		});

		remote.on('initialize', function(wsio, data) {
			console.log('Initialize> uniqueID', data.UID);

			remote.emit('command', command);

			// Wait for 1sec to quit
			setTimeout(function() { process.exit(0); }, 1000);
		});

		remote.on('setupSAGE2Version', function(wsio, data) {
			console.log('SAGE2> version', json5.stringify(data));
		});

		remote.on('setupDisplayConfiguration', function(wsio, data) {
			console.log('SAGE2> display configuration', data.totalWidth, data.totalHeight);
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
wssURL = "wss://localhost:443";

if (process.argv.length === 2) {
	console.log('');
	console.log('Usage> sage_command.js <url> <command> [paramaters]');
	console.log('');
	console.log('Example>     ./sage_command.js localhost:9090 load demo');
	console.log('');
	process.exit(0);
}

if (process.argv.length === 3 && ( (process.argv[2] === '-h') || (process.argv[2] === '--help') ) ) {
	console.log('');
	console.log('Usage> sage_command.js <url> <command> [paramaters]');
	console.log('');
	console.log('Example>     ./sage_command.js localhost:9090 load demo');
	console.log('');
	process.exit(0);
}

// If there's an argument, use it as a url
//     wss://hostname:portnumber
if (process.argv.length >= 3) {
	wssURL = process.argv[2];
	if (wssURL.indexOf('wss://')>=0) {
		// all good
	} else if (wssURL.indexOf('ws://')>=0) {
		console.log('Client> switching to wss:// protocol');
		wssURL = wssURL.replace('ws', 'wss');
	} else if (wssURL.indexOf('http://')>=0) {
		console.log('Client> switching to wss:// protocol');
		wssURL = wssURL.replace('http', 'wss');
	} else if (wssURL.indexOf('https://')>=0) {
		console.log('Client> switching to wss:// protocol');
		wssURL = wssURL.replace('https', 'wss');
	} else {
		wssURL = 'wss://' + wssURL;
	}
}

if (process.argv.length >= 4) {
	// Remove the first paramaters
	process.argv.splice(0, 3);
	// take all the rest
	command = process.argv.join(' ');
} else {
	// default command if none specified
	command = "help";
}

console.log('Client> sending command:', command);

// Create and go !
connection = createRemoteConnection(wssURL);
console.log('Starting>', connection.ws.url);
