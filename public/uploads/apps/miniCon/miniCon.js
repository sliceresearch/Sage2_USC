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
		this.element.style.fontSize = ui.titleTextSize + "px";
		this.element.style.color = "green";
		this.element.style.overflow = "scroll";

		// app specific
		this.listOfServerVariables = [];
		this.setupDataRequest();
		this.shouldPrintNewVariableNotification = true;
		// editors
		this.consoleWatchers = [];
	},

	load: function(date) {
	},

	draw: function(date) {
		// left intentionally blank
	},

	resize: function(date) {
	},

	/**
	* Will be given by single page interaction.
	*
	* @method executeCode
	* @param {Object} obj - Expected to contains the below properties.
	* @param {String} obj.code - String to attempt conversion to code.
	*/
	executeCode: function(obj) {
		var _this = this;
		if (console.logOriginal === undefined) {
			console.logOriginal = console.log;
		}
		console.log = function(s) {
			_this.addToLog(s);
		};
		try {
			eval(obj.code);
		} catch (e) {
			console.log(e);
		}
		console.log = console.logOriginal;
	},

	/**
	* Adds to the log. If there are log watches, will send to them too.
	*
	* @method addClientAsLogWatcher
	* @param {Object} client - contains information about sender.
	*/
	addClientAsLogWatcher: function(client) {
		this.consoleWatchers.push(client.clientId);
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
		entry.description = "Edit";
		entry.callback    = "SAGE2_openPage";
		entry.parameters  = {
			url: this.resrcPath + "saControls.html"
		};
		entries.push(entry);

		entry = {};
		entry.description = "separator";
		entries.push(entry);

		if (this.shouldPrintNewVariableNotification) {
			entry = {};
			entry.description = "Stop printing new var notifications";
			entry.callback    = "toggleNewVarNotification";
			entry.parameters  = { print: false };
			entries.push(entry);
		} else {
			entry = {};
			entry.description = "Print new var notifications";
			entry.callback    = "toggleNewVarNotification";
			entry.parameters  = { print: true };
			entries.push(entry);
		}

		entry = {};
		entry.description = "Print available server variables";
		entry.callback    = "printAvailableVariables";
		entry.parameters  = {};
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
	},

	setupDataRequest: function() {
		if (!isMaster) {
			return; // try to prevent spamming
		}
		this.serverDataGetAllTrackedDescriptions(this.handleTrackedDescriptions);
		this.serverDataSubscribeToNewValueNotification(this.handleNewVariableNotification);
	},

	handleTrackedDescriptions: function(serverVariables) {
		this.listOfServerVariables = this.listOfServerVariables.concat(serverVariables);
	},

	handleNewVariableNotification: function(addedVar) {
		if (!isMaster) {
			return; // prevent spam
		}
		if (addedVar.status === "add") {
			this.listOfServerVariables.push(addedVar);
			if (this.shouldPrintNewVariableNotification) {
				this.addToLog();
				this.addToLog("New variable named " + addedVar.nameOfValue);
				this.addToLog("--Description " + addedVar.description);
			}
		} else if (addedVar.status === "remove") {
			this.listOfServerVariables.splice(this.listOfServerVariables.indexOf(addedVar), 1);
			if (this.shouldPrintNewVariableNotification) {
				this.addToLog();
				this.addToLog("Variable deleted from server: " + addedVar.nameOfValue);
			}
		} 
	},

	toggleNewVarNotification: function(response) {
		this.shouldPrintNewVariableNotification = response.print;
		this.getFullContextMenuAndUpdate();
	},

	printAvailableVariables: function() {
		this.addToLog("");
		this.addToLog("---Variables on server: " + this.listOfServerVariables.length + "---");
		for (let i = 0; i < this.listOfServerVariables.length; i++) {
			this.addToLog("" + this.listOfServerVariables[i].nameOfValue);
			this.addToLog("&nbsp&nbsp" + this.listOfServerVariables[i].description);
		}
	}


});
