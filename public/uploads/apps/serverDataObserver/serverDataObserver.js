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

var serverDataObserver = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "onfinish";

		this.element.id = "div" + data.id;
		// Using SAGE2 default font
		this.element.style.fontFamily = "Courier New, Consolas, Menlo, monospace";
		// Default starting attributes
		this.element.style.background = "black";
		this.element.style.fontSize = ui.titleTextSize + "px";
		this.element.style.color = "green";

		// updates per second
		this.appSpecificSetup();
	},

	appSpecificSetup: function() {
		// tracking variables
		this.varsKnown = []; // array of app objects
		this.clientEditors = []; // array of string ids

		if (isMaster) {
			// subscribe to variables
			wsio.emit("csdMessage", {
				type: "subscribeToNewValueNotification",
				app: this.id,
				func: handleNewVariableNotifications
			});

			// get current set of variables
			wsio.emit("csdMessage", {
				type: "getAllTrackedDescriptions",
				app: this.id,
				func: handleCurrentVars
			});
		}
	},

	/**
	 * Activated when server responds to getAllTrackedDescriptions.
	 *
	 * @method	handleCurrentServerVariables
	 * @param	serverResponse	{Object}	An array of object with properties: nameOfValue, description
	 */
	handleCurrentServerVariables: function(serverResponse) {
		this.varsKnown = this.varsKnown.concat(serverResponse);
	},

	/**
	 * Activated when server gets a new variable.
	 *
	 * @method	handleNewServerVariableNotifications
	 * @param	serverResponse	{Object}	An object with properties: nameOfValue, description
	 */
	handleNewServerVariableNotifications: function(serverResponse) {
		this.varsKnown.push(serverResponse);
		this.addLineToDisplay("New var " + serverResponse.nameOfValue + ":" + serverResponse.description);
		this.updateClients();
	},

	/**
	 * Activated when client goes to editor page.
	 *
	 * @method	addClientToEditors
	 * @param	serverResponse	{Object}	Handled like context menu object
	 */
	addClientToEditors: function(responseObject) {
		this.clientEditors.push(responseObject.clientId);
	},



	load: function(date) {
	},

	/**
	 * Used as update function.
	 */
	draw: function(date) {
	},

	resize: function(date) {
	},

	addLineToDisplay: function(string) {
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


		// entry = {};
		// entry.description = "Edit";
		// entry.callback    = "SAGE2_openPage";
		// entry.parameters  = {
		// 	url: this.resrcPath + "saControls.html"
		// };
		// entries.push(entry);

		return entries;
	},

	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
	},

	quit: function() {
		// no additional calls needed.
	}

});
