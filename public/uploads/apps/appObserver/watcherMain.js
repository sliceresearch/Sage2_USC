// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-17

"use strict";

/* global  wsio appId pointerName pointerColor uniqueID*/

/*
File has parts:
	1. Any actions needed to run before connecting to server.
	2. Function definitions for those actions
	3. Functions that the app expects to call

The above globals are created and set in SAGE2_standAlone.js
	wsio
		websocket to use to send data
	appId
		id of app connected with.
		Note: it is entirely possible that the app closes while page is open.
	pointerName
		name used on main UI page
	pointerColor
		color used on main UI page
	uniqueID
		id given by the SAGE2 server. This is how the app can give back data.
		the app's function will need this if it is to respond back
Overwriting them will cause problems.
*/

/* ------------------------------------------------------------------------------------------------------------------
// 1
// ------------------------------------------------------------------------------------------------------------------
The following will activate as soon as the script is loaded.
*/

var allPdfTextContainer = {};

SAGE2Connection.initS2Connection("localhost:9292", null, true, null);

var wsioToExternal = new SAGE2Connection.WebsocketIO("168.105.4.130:3000/papers");

wsioToExternal.open(function() {
	addLineToOutput("Connecting to external server (not sage2)");
	wsioToExternal.ws.send(JSON.stringify({
		type: "document",
		message: "Initial connection"
	}));
});
// socket close event (i.e. server crashed)
wsioToExternal.on("close", function(evt) {
	console.log("Lost connection to external server");
});

/* -------------------------------------------------------------------
// 1B
// -------------------------------------------------------------------
The following will activate as soon as the connection is made
*/

// this will be activated after a connection to Server is established
SAGE2Connection.afterSAGE2Connection = function() {
	addLineToOutput(">>isMaster:" + SAGE2Connection.isMaster);
	addLineToOutput(">>Unique ID:" + SAGE2Connection.uniqueID);
	addLineToOutput("Connected to server at " + SAGE2Connection.hostname);

	// only master should communicate with server, only matters if this happens in webview
	if (!SAGE2Connection.isMaster) {
		return;
	}

	addLineToOutput("");
	addLineToOutput("Attempting to subscribe...");

	var dataForServer = {
		type: "subscribeToNewValueNotification",
		func: "handleNewVariableInformation"
	};
	SAGE2Connection.wsio.emit("csdMessage", dataForServer);

	dataForServer = {
		type: "getAllTrackedDescriptions",
		func: "handleValuesAlreadyOnServer"
	};
	SAGE2Connection.wsio.emit("csdMessage", dataForServer);
}


/* ------------------------------------------------------------------------------------------------------------------
// 2
// ------------------------------------------------------------------------------------------------------------------
These functions are part of the page functionality.
*/


function addLineToOutput(string) {
	outputArea.innerHTML = string + "\n<br>\n" + outputArea.innerHTML;
}

function handleValuesAlreadyOnServer(response) {
	for (let i = 0; i < response.length; i++) {
		handleNewVariableInformation(response[i]);
	}
	addLineToOutput("handling initial server variables:" + response.length);
	addLineToOutput("");
}

function handleNewVariableInformation(newVar) {
	addLineToOutput("&nbsp&nbspdesc: " + newVar.description.overview);
	addLineToOutput("&nbsp&nbspname: " + newVar.nameOfValue);
	addLineToOutput("notified of new variable");
	addLineToOutput("");

	if (newVar.nameOfValue.indexOf("pdfTexts") !== -1) {
		// subscribe, first(will not return value)
		var dataForServer = {
			type: "subscribeToValue",
			nameOfValue: newVar.nameOfValue,
			func: "handleAllPdfTextContainment"
		};
		//erase me
		console.log("subscribing to pdf text");
		SAGE2Connection.wsio.emit("csdMessage", dataForServer);

		// get now
		dataForServer = {
			type: "getValue",
			nameOfValue: newVar.nameOfValue,
			func: "handleAllPdfTextContainment"
		};
		//erase me
		addLineToOutput("askig for current pdf text");
		SAGE2Connection.wsio.emit("csdMessage", dataForServer);
	}
}

function handleAllPdfTextContainment(data) {
	addLineToOutput("GOT PDF TEXT, added to allPdfTextContainer");
	addLineToOutput("");
	allPdfTextContainer = data;

	
	addLineToOutput("Trying to send data to external site");
	addLineToOutput("");

	if (allPdfTextContainer[0] && allPdfTextContainer[0].fullText) {
		wsioToExternal.ws.send(JSON.stringify({
			type: "document",
			message: allPdfTextContainer[0].fullText
		}));
	}
}


/* ------------------------------------------------------------------------------------------------------------------
// 3
// ------------------------------------------------------------------------------------------------------------------
The following functions are expected to be available by the app.
App activates through: 
		var dataForClient = {};
		dataForClient.type       = 'sendDataToClient';
		dataForClient.appId      = this.id;
		dataForClient.clientDest = obj.uniqueID;
		dataForClient.func       = 'currentQuickNoteContent'; // <---- matches function name defined here
		dataForClient.content    = this.element.innerHTML;

		wsio.emit('csdMessage', dataForClient);

Note: function will get the entire dataForClient object. 
*/


