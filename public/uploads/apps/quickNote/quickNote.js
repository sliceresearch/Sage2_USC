// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

"use strict";

var quickNote = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.element.id = "div" + data.id;

		var workingDiv = document.getElementById( this.element.id );
		workingDiv.style.background = "lightyellow";
		workingDiv.width 			= this.element.clientWidth + "px";
		workingDiv.height 			= this.element.clientHeight + "px";

		workingDiv.style.fontSize 	= ui.titleTextSize + "px";

		this.startingFontSize 	= ui.titleTextSize;
		this.startingWidth 		= this.element.clientWidth;
		this.startingHeight 	= this.element.clientHeight;

		this.setMessage(
			{ 
				clientName: "Quick Note",
				clientInput: "Loading note from user..."
			});

	},

	/**
	0: message
	1: clientId
	*/
	setMessage: function(msgParams) {
		var workingDiv = document.getElementById( this.element.id );

		workingDiv.innerHTML = msgParams.clientName;
		workingDiv.innerHTML += ":<br>";
		workingDiv.innerHTML += msgParams.clientInput;
	},

	load: function(date) {
	},

	draw: function(date) {
	},

	resize: function(date) {
		var workingDiv = document.getElementById( this.element.id );
		workingDiv.style.background = "lightyellow";
		workingDiv.width = this.element.clientWidth + "px";
		workingDiv.height = this.element.clientHeight + "px";

		var percentChange = parseInt( this.element.clientWidth ) / this.startingWidth;
		workingDiv.style.fontSize = (this.startingFontSize * percentChange) + "px";
	},

	event: function(eventType, position, user_id, data, date) {

	},

	/**
	* To enable right click context menu support this function needs to be present.
	*
	* Must return an array of entries. An entry is an object with three properties:
	*	description: what is to be displayed to the viewer.
	*	callback: String containing the name of the function to activate in the app. It must exist.
	*	parameters: an object with specified datafields to be given to the function.
	*		The following attributes will be automatically added by server.
	*			serverDate, on the return back, server will fill this with time object.
	*			clientId, unique identifier (ip and port) for the client that selected entry.
	*			clientName, the name input for their pointer. Note: users are not required to do so.
	*			clientInput, if entry is marked as input, the value will be in this property. See pdf_viewer.js for example.
	*		Further parameters can be added. See pdf_view.js for example.
	*/
	getContextEntries: function() {
		var entries = [];
		var entry;

		entry = {};
		entry.description = "Change Note:";
		entry.callback = "setMessage";
		entry.parameters = {};
		entry.inputField = true;
		entry.inputFieldSize = 20;
		entries.push(entry);

		return entries;
	},

	quit: function() {
		// no additional calls needed.
	}

});
