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
	2. Function definitions for those actions
	3. Functions that the app expects to call

SAGE2Connection has properties that are of main interest:
	SAGE2Connection.wsio
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
*/

/* ------------------------------------------------------------------------------------------------------------------
// 1
// ------------------------------------------------------------------------------------------------------------------
The following will activate as soon as the script is loaded.
Note that connection will be automatic as part of SAGE2Connection file.
*/

var temp;


/* -------------------------------------------------------------------
// 1B
// -------------------------------------------------------------------
The following will activate as soon as the connection is made
*/

// this will be activated after a connection to Server is established
SAGE2Connection.afterSAGE2Connection = function() {
	addLineToOutput(">>appId:" + SAGE2Connection.appId);
	addLineToOutput(">>hostname:" + SAGE2Connection.hostname);
	addLineToOutput(">>isMaster:" + SAGE2Connection.isMaster);
	addLineToOutput(">>pointerColor:" + SAGE2Connection.pointerColor);
	addLineToOutput(">>pointerName:" + SAGE2Connection.pointerName);
	addLineToOutput(">>Unique ID:" + SAGE2Connection.uniqueID);
	addLineToOutput("Connected to server at " + SAGE2Connection.hostname);


	var data = {};
	data.app = SAGE2Connection.appId;
	data.func = "addClientToEditors";
	data.parameters = {
		clientName: SAGE2Connection.pointerName
	};
	SAGE2Connection.wsio.emit('utdCallFunctionOnApp', data);
}


/* ------------------------------------------------------------------------------------------------------------------
// 2
// ------------------------------------------------------------------------------------------------------------------
These functions are part of the page functionality.
*/


function addLineToOutput(string) {
	outputArea.innerHTML = string + "\n<br>\n" + outputArea.innerHTML;
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

		SAGE2Connection.wsio.emit('csdMessage', dataForClient);

Note: function will get the entire dataForClient object. 
*/




/**
 * Activated when app sends an update of the listing
 * The important piece of the param is responseObject.params.varsKnown. An [] of {} containing: nameOfValue, description, links
 *
 * @method	currentListing
 * @param	responseObject	{Object}	Will contain: clientDest, params, func, appId, type
 */
function currentListing(responseObject) {
	temp = responseObject; // for debug

	addLineToOutput("-----------");

	// rebuild the visuals
	var allSources = [];
	var allDestinations = [];
	tmpSourcesDiv.innerHTML = "";
	tmpDestinationsDiv.innerHTML = "";

	// for each param, check if it is a source or destination, put into their arrays
	var varsKnown = responseObject.params.varsKnown;
	for (let i = 0; i < varsKnown.length; i++) {
		if (varsKnown[i].nameOfValue.indexOf(":source:") !== -1) {
			tmpSourcesDiv.innerHTML += "\n<br>" + varsKnown[i].nameOfValue + "(" + varsKnown[i].description + ")";
			allSources.push(varsKnown[i]);
		} else if (varsKnown[i].nameOfValue.indexOf(":destination:") !== -1) {
			tmpDestinationsDiv.innerHTML += "\n<br>" + varsKnown[i].nameOfValue + "(" + varsKnown[i].description + ")";
			allDestinations.push(varsKnown[i]);
		} else {
			addLineToOutput("* Unusual variable:" + varsKnown[i].nameOfValue);
		}
	}

	// table building
	var vTable, currentTr, currentTh, currentButton;
	vTable = document.getElementById("tableOfVariables");
	vTable.innerHTML = ""; // basically rebuild the table. can optimize later

	// border the control div an make it horzontally scrollable
	tableControlDiv.style.border = "1px solid black";
	tableControlDiv.style.width = (window.innerWidth * 0.9) + "px";
	tableControlDiv.style.overflowX = "scroll";

	// create the header of destinations
	currentTr = document.createElement("tr");
	currentTh = document.createElement("th");
	currentTr.appendChild(currentTh); // blank to offset for sources / dest, top left corner
	for (let dest = 0; dest < allDestinations.length; dest++) {
		currentTh = document.createElement("th");
		currentTh.textContent = allDestinations[dest].nameOfValue.split(":").join(" ");
		currentTh.style.fontWeight = "bold";
		currentTr.appendChild(currentTh);
	}
	// now create each of the rows, first is source name, then a button for each destination it could go to.
	vTable.appendChild(currentTr);
	for (let i = 0; i < allSources.length; i++) {
		currentTr = document.createElement("tr");
		currentTh = document.createElement("th");
		currentTh.textContent = allSources[i].nameOfValue.split(":").join(" ");
		currentTr.appendChild(currentTh); // name of source
		// for each destination make a button
		for (let dest = 0; dest < allDestinations.length; dest++) {
			currentTh = document.createElement("th");
			currentTh.style.border = "1px solid black";
			currentButton = document.createElement("button");
			// buttons will Link or UnLink
			if (shouldShowLink(allSources[i], allDestinations[dest])) {
				makeLinkButton(currentButton, allSources[i].nameOfValue, allDestinations[dest].nameOfValue);
			} else {
				makeUnLinkButton(currentButton, allSources[i].nameOfValue, allDestinations[dest].nameOfValue);
			}
			currentTh.appendChild(currentButton);
			currentTr.appendChild(currentTh);
		}
		vTable.appendChild(currentTr);
	}

	addLineToOutput("Received update");
	addLineToOutput("-----------");
}

// function that checks if the current source has a link specifying the destination, helps determ if button should be Link or UnLink
function shouldShowLink(currentSource, currentDestination) {
	for (let i = 0; i < currentSource.links.length; i++) {
		// if the source is going to this destination, then it should show UnLink
		if (currentSource.links[i] === currentDestination.nameOfValue) {
			return false;
		}
	}
	return true;
}

// Creation of the Link button
function makeLinkButton(btn, sourceName, destinationName) {
	btn.textContent = "Link";
	btn.style.background = "lightGreen";
	btn.addEventListener("click", function() {
		console.log("send link command from,to: " + sourceName  + "," + destinationName);
		var data = {};
		data.app = SAGE2Connection.appId;
		data.func = "dataLink";
		data.parameters = {
			sourceName: sourceName,
			destinationName: destinationName,
			pointerColor: SAGE2Connection.pointerColor
		};
		data.parameters.clientName = SAGE2Connection.pointerName;
		SAGE2Connection.wsio.emit('utdCallFunctionOnApp', data);
	});
}

// Creation of the UnLink button
function makeUnLinkButton(btn, sourceName, destinationName) {
	btn.textContent = "UnLink";
	btn.style.background = "salmon";
	btn.addEventListener("click", function() {
		console.log("send UnLink command from,to: " + sourceName  + "," + destinationName);
		var data = {};
		data.app = SAGE2Connection.appId;
		data.func = "dataUnLink";
		data.parameters = {
			sourceName: sourceName,
			destinationName: destinationName
		};
		data.parameters.clientName = SAGE2Connection.pointerName;
		SAGE2Connection.wsio.emit('utdCallFunctionOnApp', data);
	});
}


