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

/**
 * When the page loads, start communcation setup
 *
 */
window.addEventListener("load", function(event) {
	initS2Connection("localhost:9292");
});



setButton.addEventListener("click", function() {
	var dataToSend = {
		type: "setValue",
		nameOfValue: setName.value,
		value:       setValue.value,
		description: ""
	};
	wsio.emit("csdMessage", dataToSend);
	setValue.value = "";
});

snButton.addEventListener("click", function() {
	var dataToSend = {
		type: "setValue",
		nameOfValue: snName.value,
		value:       parseFloat(snValue.value),
		description: ""
	};
	wsio.emit("csdMessage", dataToSend);
	snValue.value = "";
});

soButton.addEventListener("click", function() {
	var dataToSend = {
		type: "setValue",
		nameOfValue: soName.value,
		value:       {value: soValue.value},
		description: ""
	};
	wsio.emit("csdMessage", dataToSend);
	soValue.value = "";
});


getButton.addEventListener("click", function() {
	var dataToSend = {
		type: "getValue",
		nameOfValue: getName.value,
		func:       "handleRetrieve",
		description: ""
	};
	wsio.emit("csdMessage", dataToSend);
});



/* ------------------------------------------------------------------------------------------------------------------
// 1
// ------------------------------------------------------------------------------------------------------------------
This will be activated as result of getting data back from the server
*/

function handleRetrieve(data) {
	var ccon = document.getElementById("status").innerHTML;
	document.getElementById("status").innerHTML = (typeof data.data) + ":" ;

	if ((typeof data.data) == "object") {
		document.getElementById("status").innerHTML += data.data.value;
	} else {
		document.getElementById("status").innerHTML += data.data;
	}
	document.getElementById("status").innerHTML += "<br>\n" + ccon;
}

