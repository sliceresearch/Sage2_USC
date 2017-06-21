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

/* global  SAGE2Connection*/

/*
File has parts:
	1. Any actions needed to run before connecting to server.
	2. Connect to server
	3. Function definitions for those actions
	4. Functions that the app expects to call

*/

/* ------------------------------------------------------------------------------------------------------------------
// 1
// ------------------------------------------------------------------------------------------------------------------
The following will activate as soon as the script is loaded.
*/

document.getElementById("SAGE2_returnToUi").addEventListener("click", function() {
	// function will autofill clientId
	SAGE2Connection.callFunctionOnApp("removeSaEditor", {});
	window.close();
});

var colorBtns = document.getElementsByClassName("colorButton");

for (var i = 0; i < colorBtns.length; i++) {
	colorBtns[i].addEventListener("click", sendColor);
}
uiNoteMakerInputField.addEventListener("keyup", function() {
	// func, params. clientName and clientId will automatically be added
	SAGE2Connection.callFunctionOnApp("setMessage", { clientInput: uiNoteMakerInputField.value });
});


/* ------------------------------------------------------------------------------------------------------------------
// 2
// ------------------------------------------------------------------------------------------------------------------
Connect to the server
*/

// first describe any reaction after connecting
SAGE2Connection.afterSAGE2Connection = requestCurrentContext;

// This this is part of app code, it will use the current window values to connect.
// But if the page was hosted elsewhere, parameters would be required.
SAGE2Connection.initS2Connection();


function requestCurrentContext() {
	// func, params. clientName and clientId will automatically be added
	SAGE2Connection.callFunctionOnApp("requestCurrentContent", { color: SAGE2Connection.pointerColor });
}

/* ------------------------------------------------------------------------------------------------------------------
// 3
// ------------------------------------------------------------------------------------------------------------------
These functions are part of the page functionality.
*/
function sendColor() {
	console.log("Button color value " + this.style.backgroundColor);
	// func, params. clientName and clientId will automatically be added
	SAGE2Connection.callFunctionOnApp("setColor", { color: this.style.backgroundColor });
}


/* ------------------------------------------------------------------------------------------------------------------
// 4
// ------------------------------------------------------------------------------------------------------------------
The following functions will be called by the app sending data to clients.
*/

function currentQuickNoteContent(data) {
	console.log("Color to set " + data.color);
	uiNoteMakerInputField.style.background = data.color;
	uiNoteMakerInputField.value = data.content.replace(/<br>/gi, "\n");
}


