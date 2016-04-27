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
 * @class shell
 * @module commands
 * @submodule shell
 */

"use strict";

var json5     = require('json5');           // JSON5 parsing
var readline  = require('readline');        // to build an evaluation loop
var commander = require('commander');       // parsing command-line arguments

// custom node modules
var WebsocketIO = require('websocketio');   // creates WebSocket server and clients
var md5         = require('../src/md5');    // return standard md5 hash of given param
var connection;
var command;
var wssURL;


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
			clientType: "shell",
			requests: {
				config:  true,
				version: false,
				time:    false,
				console: true
			},
			session: session
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
				if (line === 'exit' || line === 'quit') {
					process.exit(0);
				}
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

commander
	.version("1.0.0")
	.option('-s, --server <url>', 'URL SAGE2 server', 'localhost:9090')
	.option('-p, --password <password>', 'Set the password to connect to SAGE2 server', '')
	.option('-a, --hash <hash>', 'Use a MD5 hash instead of password')
	.parse(process.argv);

// Extra help with examples
commander.on('--help', function() {
	console.log('  Examples:');
	console.log('');
	console.log('    $ sage_shell.js -s localhost:9090 -p tutu');
	console.log('    $ sage_shell.js -s wss://localhost:9090 -a bd8cd8ae21342q991');
	console.log('');
});

if (process.argv.length === 2) {
	commander.help();
	process.exit(0);
}

// Prepare the URL
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

// Create and go !
connection = createRemoteConnection(wssURL);
console.log('Starting>', connection.ws.url);
