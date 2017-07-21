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

var voiceReporter = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.element.id = "div" + data.id;
		// Using SAGE2 default font
		this.element.style.fontFamily = "Arimo, Helvetica, sans-serif";
		// Default starting attributes
		this.element.style.background = "black";
		this.element.style.fontSize = ui.titleTextSize + "px";
		this.element.style.color = "green";
		this.element.style.overflow = "scroll";

		this.appSpecific();
	},

	appSpecific: function() {
		// app specific
		this.listOfServerVariables = [];
		this.shouldPrintNewVariableNotification = true;
		// editors
		this.consoleWatchers = [];

		// data
		this.setupDataRequest();
	},

	setupDataRequest: function() {
		wsio.emit("serverDataSubscribeToValue", {
			nameOfValue: "voiceToActionLastEntry",
			app: this.id,
			func: "addToLog"
		});
		wsio.emit("serverDataSubscribeToValue", {
			nameOfValue: "voiceToActionInterimTranscript",
			app: this.id,
			func: "addToLog"
		});
	},

	load: function(date) {
	},

	draw: function(date) {
		// left intentionally blank
	},

	resize: function(date) {
	},

	/**
	* Adds to the log. If there are log watches, will send to them too.
	*
	* @method addToLog
	* @param {String} line - What to add to the log.
	*/
	addToLog: function(line) {
		if (!line) {
			line = "";
		}
		line = "\n<br>\n" + line;
		this.element.innerHTML += line;
		this.element.scrollTop = this.element.scrollHeight;
		var dataToSend = {};
		dataToSend.content = line;
		dataToSend.func = "consoleLine";
		for (let i = 0; i < this.consoleWatchers.length; i++) {
			dataToSend.clientDest = this.consoleWatchers[i];
			wsio.emit("sendDataToClient", dataToSend);
		}
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
		entry.description = "Clear";
		entry.callback    = "clearConsole";
		entry.parameters  = {};
		entries.push(entry);

		return entries;
	},

	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
	},






	quit: function() {
		// no additional calls needed.
	}


});