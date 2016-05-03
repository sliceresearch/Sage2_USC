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

var aRemApp = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.element.id = "div" + data.id;
		this.appIdRef   = data.id;

		// force this div to have specified width and height
		var workingDiv = document.getElementById(this.element.id);
		workingDiv.width = this.element.clientWidth + "px";
		workingDiv.height = this.element.clientHeight + "px";

		this.state.numToShow = 0;
		workingDiv.innerHTML = "<div id='" + this.element.id + "infoDiv'>Starting</div>";
	},

	load: function(date) {
		// Does this do anything? Or ever get called?
	},

	draw: function(date) {
		var workingDiv = document.getElementById(this.element.id + "infoDiv");
		workingDiv.style.fontSize = "100px";
		workingDiv.style.background = "white";
		workingDiv.innerHTML = this.state.numToShow;
	},

	resize: function(date) {
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
		entry.description = "Increase Value";
		entry.callback = "valueInc";
		entry.parameters = {};
		entries.push(entry);

		entry = {};
		entry.description = "Decrease Value";
		entry.callback = "valueDec";
		entry.parameters = {};
		entries.push(entry);

		return entries;
	},

	valueInc : function(responseObject) {
		this.state.numToShow++;
		this.passStateToRemote(responseObject);
	},

	valueDec : function(responseObject) {
		this.state.numToShow--;
		this.passStateToRemote(responseObject);
	},

	passStateToRemote : function (responseObject) {
		this.SAGE2UserModification = true;
		this.refresh(new Date(responseObject.serverDate));
		this.SAGE2UserModification = false;
	},

	event: function(eventType, position, user_id, data, date) {

	},

	quit: function() {

	}

});
