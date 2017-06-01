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
document.getElementById("SAGE2_returnToUi").addEventListener("click", function() {
	var dataForApp = {};
	dataForApp.app = appId;
	dataForApp.func = "removeSaEditor";
	dataForApp.parameters = {
		uniqueID: uniqueID
	};
	wsio.emit('utdCallFunctionOnApp', dataForApp);
	window.close();
});

document.getElementById("sendCode").addEventListener("click", function() {
	var codeToExecute = document.getElementById("codeInput").value;
	var dataForApp = {};
	dataForApp.app = appId;
	dataForApp.func = "executeCode";
	dataForApp.parameters = {
		uniqueID: uniqueID,
		code: codeToExecute
	};
	wsio.emit('utdCallFunctionOnApp', dataForApp);
});

/* ------------------------------------------------------------------------------------------------------------------
// 2
// ------------------------------------------------------------------------------------------------------------------
These functions are part of the page functionality.
*/
function sendColor() {
	console.log("Button color value " + this.style.backgroundColor);

	var dataForApp = {};
	dataForApp.app = appId;
	dataForApp.func = "setColor";
	dataForApp.parameters = {
		clientName: pointerName,
		color: this.style.backgroundColor
	};

	wsio.emit('utdCallFunctionOnApp', dataForApp);
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

function currentQuickNoteContent(data) {
	uiNoteMakerInputField.style.background = data.color;
	uiNoteMakerInputField.value = data.content.replace(/<br>/gi, "\n");
}


