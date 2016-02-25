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

var uiNote = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.element.id = "div" + data.id;

		var workingDiv = document.getElementById( this.element.id );
			workingDiv.style.background = "lightyellow";
			workingDiv.width = this.element.clientWidth + "px";
			workingDiv.height = this.element.clientHeight + "px";

			workingDiv.style.fontSize = ui.titleTextSize + "px";

		this.setMessage(
			[ "default",
			"This is a test to see how the text will react when it probably extends beyond the width."
			]);

	},

	/**
	0: message
	1: clientId
	*/
	setMessage: function(msgParams) {
		var workingDiv = document.getElementById( this.element.id );

		workingDiv.innerHTML = msgParams[1];
		workingDiv.innerHTML += ":<br>";
		workingDiv.innerHTML += msgParams[0];
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
	},

	event: function(eventType, position, user_id, data, date) {

	},

	/**
	* To enable right click context menu support this function needs to be present with this format.
	*
	* Must return an array of entries. An entry is an object with three properties:
	*	description: what is to be displayed to the viewer.
	* 	func: name of the function to activate in the app. It must exist.
	* 	params: currently an array. This might change. The string "serverDate" will be auto converted by server.
	*/
	getContextEntries: function() {
		var entries = [];
		var entry;

		entry = {};
		entry.description = "Change Note:";
		entry.func = "setMessage";
		entry.params = [ "clientInput", "clientId" ];
		entry.inputField = true;
		entry.inputFieldSize = 20;
		entries.push(entry);

		return entries;
	},

	quit: function() {
		// no additional calls needed.
	}

});
