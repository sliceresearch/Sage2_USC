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

	/**
	 * On app start, these do not generally interact with already existing app variables.
	 * Need to subscribe to new variables, then get all existing variables.
	 *
	 * @method	appSpecificSetup
	 */
	appSpecificSetup: function() {
		// tracking variables
		this.varsKnown = []; // array of app objects
		this.clientEditors = []; // array of string ids
		this.lineContainer = {};

		// this function has internal check if master.
		this.csdSubscribeToNewValueNotification("handleNewServerVariableNotifications", false);

		// get current vars after subscription. better to get dupes than miss one.
		this.csdGetAllTrackedDescriptions("handleCurrentServerVariables");
	},

	/**
	 * Activated when server responds to getAllTrackedDescriptions.
	 *
	 * @method	handleCurrentServerVariables
	 * @param	serverResponse	{Object}	An array of object with properties: nameOfValue, description
	 */
	handleCurrentServerVariables: function(serverResponse) {
		this.varsKnown = this.varsKnown.concat(serverResponse);
		for (let i = 0; i < this.varsKnown.length; i++) {
			this.addLineToDisplay("--Desc: " + this.varsKnown[i].description);
			this.addLineToDisplay("New var " + this.varsKnown[i].nameOfValue);

			this.varsKnown[i].links = [];
		}
	},

	/**
	 * Activated when server gets a new variable.
	 *
	 * @method	handleNewServerVariableNotifications
	 * @param	serverResponse	{Object}	An object with properties: nameOfValue, description
	 */
	handleNewServerVariableNotifications: function(serverResponse) {
		this.varsKnown.push(serverResponse);
		serverResponse.links = []; // add an array for links. currently stored in sources.
		this.addLineToDisplay("--Desc: " + serverResponse.description);
		this.addLineToDisplay("New var " + serverResponse.nameOfValue);
		this.updateClients();
	},

	/**
	 * Activated after a new variable notification is received. Control pages need to be aware of new variable.
	 * Only master should sent updates to prevent spamming.
	 *
	 * @method	updateClients
	 */
	updateClients: function() {
		if(isMaster) {
			var dataForClient = {};
			dataForClient.clientDest = "null";
			dataForClient.params     = {
				varsKnown: this.varsKnown
			};
			dataForClient.func       = 'currentListing';
			dataForClient.appId      = this.id;
			dataForClient.type       = 'sendDataToClient';
			for (var i = 0; i < this.clientEditors.length; i++) {
				dataForClient.clientDest = this.clientEditors[i];
				wsio.emit('csdMessage', dataForClient);
			}
		}
	},

	/**
	 * Will activate through ui page. Should create a source > destination flow.
	 *
	 * @method	dataLink
	 * @param	responseObject	{Object}	Data from control page should have: sourceName, destinationName, pointerColor
	 */
	dataLink: function(responseObject) {
		if(isMaster) {
			console.log("erase me, dataLink");
			for (let i = 0; i < this.varsKnown.length; i++) {
				// if the name of the var matches and it doesn't already have the link
				if (this.varsKnown[i].nameOfValue === responseObject.sourceName
				&& this.varsKnown[i].links.indexOf(responseObject.destinationName) === -1) {
					console.log("erase me, match");
					this.varsKnown[i].links.push(responseObject.destinationName);
					this.createLinkSubscriptionAndFunction(responseObject.sourceName, responseObject.destinationName);
					break;
				}
			}
			this.updateClients();
		}
		// lines show show on all displays
		this.createLinkLine(responseObject.sourceName, responseObject.destinationName, responseObject.pointerColor);
	},

	/**
	 * Make the function to receive data (if it doesn't exist) and subscribe.
	 *
	 * @method	createLinkSubscriptionAndFunction
	 * @param	sourceName	{String}	Name of the source variable
	 * @param	destinationName	{String}	Name of the destination variable
	 */
	createLinkSubscriptionAndFunction: function(sourceName, destinationName) {
		if(isMaster) {
			if (!this["dataTo" + destinationName]) {
				console.log("erase me, making function:" + "dataTo" + destinationName);
				this["dataTo" + destinationName] = function(responseObject) {
					console.log("erase me, Routing");
					console.dir(responseObject);
					this.csdSetValue(destinationName, responseObject);
				}
			}
			console.log("erase me, subscribing");
			this.csdSubscribeToValue(sourceName, ("dataTo" + destinationName), false);
			// should the initial link also get the data?
			this.csdGetValue(sourceName, ("dataTo" + destinationName));
		}
	},

	/**
	 * Creates a line to show the link.
	 *
	 * @method	createLinkLine
	 * @param	sourceName	{String}	Name of the source variable
	 * @param	destinationName	{String}	Name of the destination variable
	 * @param	pointerColor	{String}	Color to make the line
	 */
	createLinkLine: function(sourceName, destinationName, pointerColor) {
		// only create line if there isn't one.
		if (!this.lineContainer["lineFrom" + sourceName + "To" + destinationName]) {
			var svgLine = svgForegroundForWidgetConnectors.line(0, 0, 0, 0);
			svgLine.attr({
				id: this.id + "lineFrom" + sourceName + "To" + destinationName,
				strokeWidth: ui.widgetControlSize * 0.18,
				stroke:  "rgba(250,250,250,1.0)"
			});
			this.lineContainer["lineFrom" + sourceName + "To" + destinationName] = svgLine;

			var a1, a2;
			a1 = sourceName.split(":")[0];
			a2 = destinationName.split(":")[0];
			a1 = applications[a1];
			a2 = applications[a2];
			svgLine.attr({
				x1: (a1.sage2_x + a1.sage2_width),
				y1: (a1.sage2_y + a1.sage2_height / 2),
				x2: (a2.sage2_x),
				y2: (a2.sage2_y + a2.sage2_height / 2)
			});
		}
	},

	/**
	 * Will activate through ui page. Should remove a source > destination flow.
	 *
	 * @method	dataUnLink
	 * @param	responseObject	{Object}	Data from control page should have: sourceName, destinationName, pointerColor
	 */
	dataUnLink: function(responseObject) {
		if(isMaster) {
			console.log("erase me, dataUnLink");
			for (let i = 0; i < this.varsKnown.length; i++) {
				// if the name of the var matches and it has the link
				if (this.varsKnown[i].nameOfValue === responseObject.sourceName
				&& this.varsKnown[i].links.indexOf(responseObject.destinationName) !== -1) {
					console.log("erase me, match");
					this.varsKnown[i].links.splice(this.varsKnown[i].links.indexOf(responseObject.destinationName), 1);
					this.csdSubscribeToValue(responseObject.sourceName, ("dataTo" + responseObject.destinationName), true);
					break;
				}
			}
			this.updateClients();
		}
		this.removeLinkLine(responseObject.sourceName, responseObject.destinationName);
	},

	/**
	 * Removes a link line
	 *
	 * @method	removeLinkLine
	 * @param	sourceName	{String}	Name of the source variable
	 * @param	destinationName	{String}	Name of the destination variable
	 */
	removeLinkLine: function(sourceName, destinationName) {
		this.lineContainer["lineFrom" + sourceName + "To" + destinationName].remove();
		this.lineContainer["lineFrom" + sourceName + "To" + destinationName] = undefined;
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


		entry = {};
		entry.description = "Edit";
		entry.callback    = "SAGE2_openPage";
		entry.parameters  = {
			url: this.resrcPath + "controls.html"
		};
		entries.push(entry);

		return entries;
	},

	/**
	 * Activated when client goes to watcher page.
	 *
	 * @method	addClientToEditors
	 * @param	serverResponse	{Object}	Handled like context menu object
	 */
	addClientToEditors: function(responseObject) {
		if (isMaster) {
			this.clientEditors.push(responseObject.clientId);
			this.updateClients(); // maybe could be a more specific update than everyone
		}
	},

	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
	},

	quit: function() {
		// no additional calls needed.
	}

});
