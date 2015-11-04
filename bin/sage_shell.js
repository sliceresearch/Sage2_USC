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
 * Connect to a SAGE2 server
 *
 * ./sage_shell.js <url>
 *
 * @class shell
 * @module commands
 * @submodule shell
 */

"use strict";

var path        = require('path');                // file path extraction and creation
var json5       = require('json5');               // JSON5 parsing
var readline    = require('readline');            // to build an evaluation loop

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
			clientType: "shell",
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
			process.stdout.write(data);
		});

		remote.on('initialize', function(wsio, data) {
			console.log('Initialize> uniqueID', data.UID);

			remote.emit('command', command);

			// Create line reader for stdin and stdout
			var shell = readline.createInterface({
				input:  process.stdin, output: process.stdout
			});

			// Set the prompt
			shell.setPrompt("> ");

			// Callback for each line
			shell.on('line', function(line) {
				if (line==='exit'||line==='quit') process.exit(0);
				remote.emit('command', line);
				shell.prompt();
			}).on('close', function() {
				process.exit(0);
			});

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

// First command
command = "help";

if (process.argv.length === 2) {
	console.log('');
	console.log('Usage> sage_shell.js <url>');
	console.log('');
	console.log('Example>     ./sage_shell.js localhost:9090');
	console.log('');
	process.exit(0);
}

if (process.argv.length === 3 && ( (process.argv[2] === '-h') || (process.argv[2] === '--help') ) ) {
	console.log('');
	console.log('Usage> sage_shell.js <url>');
	console.log('');
	console.log('Example>     ./sage_shell.js localhost:9090');
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

// Create and go !
connection = createRemoteConnection(wssURL);
console.log('Starting>', connection.ws.url);
