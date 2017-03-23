// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2016

"use strict";

var miniCon = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.element.id = "div" + data.id;
		// Using SAGE2 default font
		this.element.style.fontFamily = "Arimo, Helvetica, sans-serif";
		// Default starting attributes
		this.element.style.background = "black";
		this.element.style.fontSize = ui.titleTextSize;
		this.element.style.color = "green";
	},

	load: function(date) {
	},

	draw: function(date) {
		// left intentionally blank
	},

	resize: function(date) {
	},

	executeCode: function(obj) {
		var _this = this;
		if (console.logOriginal === undefined) {
			console.logOriginal = console.log;
		}
		console.log = function(s) {
			_this.logOverride(s);
		};
		try {
			eval(obj.code);
		} catch (e) {
			console.log(e);
		}
		console.log = console.logOriginal;
	},

	logOverride: function(string) {
		this.element.innerHTML = string + "\n<br>\n" + this.element.innerHTML;
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
		entry.description = "Edit";
		entry.callback    = "SAGE2_openPage";
		entry.parameters  = {
			url: this.resrcPath + "saControls.html"
		};
		entries.push(entry);

		entry = {};
		entry.description = "separator";
		entries.push(entry);

		entry = {};
		entry.description = "Clear";
		entry.callback    = "clearConsole";
		entry.parameters  = {};
		entries.push(entry);

		return entries;
	},

	clearConsole: function() {
		this.element.innerHTML = "";
	},

	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
	},

	quit: function() {
		// no additional calls needed.
	}

});
