// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-15

"use strict";

/**
 * Web user interface
 *
 * @module client
 * @submodule SAGE2_UI
 * @class SAGE2_UI
 */

window.URL = (window.URL || window.webkitURL || window.msURL || window.oURL);
navigator.getUserMedia   = (navigator.getUserMedia  || navigator.webkitGetUserMedia ||
							navigator.mozGetUserMedia || navigator.msGetUserMedia);
document.exitPointerLock = document.exitPointerLock ||
							document.mozExitPointerLock  ||
							document.webkitExitPointerLock;
var wsio;
var appId, pointerName, pointerColor;


//
// Polyfill for 'startsWith'
//
if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position) {
		position = position || 0;
		return this.indexOf(searchString, position) === position;
	};
}
/* eslint-enable */
//


/**
 * When the page loads, SAGE2 starts
 *
 */
window.addEventListener('load', function(event) {
	AppControl_init();
});



// Get Browser-Specifc Prefix
function getBrowserPrefix() {
	// Check for the unprefixed property.
	if ('hidden' in document) {
		return null;
	}
	// All the possible prefixes.
	var browserPrefixes = ['moz', 'ms', 'o', 'webkit'];

	for (var i = 0; i < browserPrefixes.length; i++) {
		var prefix = browserPrefixes[i] + 'Hidden';
		if (prefix in document) {
			return browserPrefixes[i];
		}
	}
	// The API is not supported in browser.
	return null;
}


/**
Starting point, note the on load was defined earlier which activates this.
*/
function AppControl_init() {
	getUrlParameters();

	// Create a connection to the SAGE2 server
	wsio = new WebsocketIO();
	wsio.open(function() {
		console.log("Websocket opened");

		setupListeners();

		var clientDescription = {
			clientType: "sageUI",
			requests: {
				config:  true,
				version: true,
				time:    false,
				console: false
			},
			browser: __SAGE2__.browser,
			session: session
		};
		wsio.emit('addClient', clientDescription);
	});

	// socket close event (i.e. server crashed)
	wsio.on('close', function(evt) {
		// show a popup
		alert("Server offline");
	});
}

function setupListeners() {
	wsio.on('utdConsoleMessage', function(data) {
		console.log("UTD message:" + data.message);
	});

	wsio.on('dtuRmbContextMenuContents', function(data) {
		setRmbContextMenuEntries(data);
	});

	wsio.on('csdSendDataToClient', function(data) {
		// depending on the specified func does different things.
		if (data.func === 'uiDrawSetCurrentStateAndShow') {
			uiDrawSetCurrentStateAndShow(data);
		} else if (data.func === 'uiDrawMakeLine') {
			uiDrawMakeLine(data);
		} else {
			console.log("Error, csd data packet for client contained invalid function:" + data.func);
		}
	});
}

function getUrlParameters() {
	var address = window.location.search;
	if (address.indexOf("?") == -1 ) {
		return;
	}
	address = address.substring(address.indexOf("?") + 1);
	var pairs = address.split("&");
	var onePair;

	for (var i = 0; i < pairs.length; i++) {

		onePair = pairs[i].split("=");
		if (onePair[0] == "appId") {
			appId = onePair[1];
		} else if (onePair[0] == "pointerName") {
			pointerName = onePair[1];
		} else if (onePair[0] == "pointerColor") {
			pointerColor = onePair[1];
		}
	}

	console.log(appId + " control for " + pointerName + "(" + pointerColor + ") starting");

	if (!appId || !pointerName || !pointerColor) {
		throw "Error url didn't contain necessary values";
	}
}









