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
 * SAGE2 Web editor
 *
 * @module client
 * @submodule SAGE2_Editor
 * @class SAGE2_Editor
 */

/* global SAGE2_init, ace */

"use strict";

var SAGE2_editor;

/**
 * Entry point of the editor
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	// Connect to the server
	var wsio = new WebsocketIO();

	console.log("Connected to server: ", window.location.origin);

	// Reset the zoom from CSS
	document.body.style.zoom = 1.0;

	var elt = document.getElementById('editor');
	elt.style.width    = '100%';
	elt.style.height   = '700px';
	elt.style.fontSize = '18px';

	SAGE2_editor = ace.edit(elt);
	SAGE2_editor.setTheme("ace/theme/monokai");
	SAGE2_editor.getSession().setMode("ace/mode/javascript");
	SAGE2_editor.getSession().setTabSize(4);
	SAGE2_editor.setHighlightActiveLine(false);
	SAGE2_editor.setShowPrintMargin(false);
	// remove line numbers
	// SAGE2_editor.renderer.setShowGutter(false);
	// scroll warning
	SAGE2_editor.$blockScrolling = Infinity;
	// set the text
	SAGE2_editor.setValue("");
	SAGE2_editor.gotoLine(0);
	SAGE2_editor.resize();

	SAGE2_editor.getSession().on("change", function() {
		console.log('Change', SAGE2_editor.session.getLength());
	});

	SAGE2_editor.commands.addCommand({
		name: 'save',
		bindKey: {win: 'Ctrl-S',  mac: 'Command-S'},
		exec: function() {
			sage2SaveFile();
		}
	});

	// Callback when socket opens
	wsio.open(function() {
		console.log("open websocket");

		// Setup message callbacks
		setupListeners(wsio);

		// Register to the server as a console
		var clientDescription = {
			clientType: "editor",
			requests: {
				config:  true,
				version: true,
				time:    false,
				console: false
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
 * Function to save content of the editor back to the server
 *
 * @method sage2SaveFile
 */
function sage2SaveFile() {
	// Create a PUT request to the SAGE2 server
	var xhr = new XMLHttpRequest();
	// Specify the destination filename
	xhr.open("PUT", "/default-cfg.json", true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4 && xhr.status === 200) {
			// All done
			console.log("File sent");
		}
	};
	// Send the content of the editor
	xhr.send(SAGE2_editor.getValue());
}

/**
 * Place callbacks on various messages from the server
 *
 * @method setupListeners
 * @param wsio {Object} websocket
 */
function setupListeners(wsio) {

	// Got a reply from the server
	wsio.on('initialize', function() {
		console.log('initialize');

		readFile("/config/default-cfg.json", function(error, data) {
			if (!error) {
				SAGE2_editor.getSession().setMode("ace/mode/json");
				SAGE2_editor.setValue(data, -1);
				SAGE2_editor.gotoLine(0);
			}
		});

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
