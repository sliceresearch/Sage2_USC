// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

"use strict";

/**
 * SAGE2 Web console
 *
 * @module client
 * @submodule SAGE2_Console
 * @class SAGE2_Console
 */

/*global SAGE2_init: true */

/**
 * Entry point of the console application
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	// Connect to the server
	var wsio = new WebsocketIO();

	console.log("Connected to server: ", window.location.origin);

	// Callback when socket opens
	wsio.open(function() {
		console.log("open websocket");

		// Setup message callbacks
		setupListeners(wsio);

		// Register to the server as a console
		var clientDescription = {
			clientType: "consoleManager",
			requests: {
				config: true,
				version: true,
				time: false,
				console: true
			}
		};
		wsio.emit('addClient', clientDescription);
	});

	// Socket close event (ie server crashed)
	wsio.on('close', function() {
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
	// Get elements from the DOM
	var terminal    = document.getElementById('terminal');
	var commandline = document.getElementById('command');

	// Got a reply from the server
	wsio.on('initialize', function() {
		// Setup a callback from the textbox used as a prompt
		commandline.addEventListener('keyup', function(evt) {
			if (evt && evt.keyCode === 13) {
				// Send the command to the server after a 'return/enter' key
				wsio.emit('command', commandline.value);
				// Add the command to terminal
				terminal.textContent += commandline.value + '\n';
				terminal.scrollTop    = terminal.scrollHeight;
				// Reset the command
				commandline.value = '';
			}
		}, false);

	});

	// Server sends something to print into the console
	wsio.on('console', function(data) {
		// Added content
		terminal.textContent += data;
		// automatic scrolling to bottom
		terminal.scrollTop    = terminal.scrollHeight;
	});

	// Server sends the SAGE2 version
	wsio.on('setupSAGE2Version', function(data) {
		console.log('SAGE2: version', data.base, data.branch, data.commit, data.date);
	});

	// Server sends the wall configuration
	wsio.on('setupDisplayConfiguration', function() {
		console.log('wall configuration');
	});

	// Server sends the animate loop event
	wsio.on('animateCanvas', function() {
		console.log('animateCanvas');
	});

}
