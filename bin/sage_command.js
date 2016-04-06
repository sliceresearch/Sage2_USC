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
 * @class command
 * @module commands
 * @submodule command
 */

"use strict";

var json5     = require('json5');            // JSON5 parsing
var commander = require('commander');        // parsing command-line arguments

// custom node modules
var WebsocketIO = require('websocketio');    // creates WebSocket server and clients
var md5         = require('../src/md5');     // return standard md5 hash of given param

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
			clientType: "commandline",
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

commander
	.version("1.0.0")
	.option('-s, --server <url>', 'URL SAGE2 server', 'localhost:9090')
	.option('-p, --password <password>', 'Set the password to connect to SAGE2 server', '')
	.option('-a, --hash <hash>', 'Use a hash instead of password')
	.option('[command]', 'Command to send to SAGE2')
	.parse(process.argv);

// Extra help with examples
commander.on('--help', function() {
	console.log('  Examples:');
	console.log('');
	console.log('    $ sage_shell.js -s localhost:9090 -p tutu load demo');
	console.log('    $ sage_shell.js -s wss://localhost:9090 -a bd8cd8ae21342q991 clear');
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


if (commander.args.length > 0) {
	// take all the rest
	command = commander.args.join(' ');
} else {
	// default command if none specified
	command = "help";
}

console.log('Client> sending command:', command);

// Create and go !
connection = createRemoteConnection(wssURL);
console.log('Starting>', connection.ws.url);
