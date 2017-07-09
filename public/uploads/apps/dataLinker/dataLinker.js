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

var dataLinker = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "onfinish";
		this.moveEvents = "onfinish";
		this.passSAGE2PointerAsMouseEvents = true;
		this.maxFPS = 10;

		this.element.id = "div" + data.id;
		this.element.style.fontSize = ui.titleTextSize + "px";
		// this.element.style.color = "green"; // font color

		// modify values not created as part of init()
		this.debug = true;
		this.appSpecificSetup();
	},

	dbprint: function(string) {
		if (this.debug){
			console.log("Debug>" + string);
		}
	},

	/**
	 * On app start, these do not generally interact with already existing app variables.
	 *
	 * @method	appSpecificSetup
	 */
	appSpecificSetup: function() {
		// tracking variables
		this.varsKnown = []; // array of app objects
		this.clientEditors = []; // array of string ids
		this.lineContainer = {};
		this.removeDataLinkButtonList = [];

		this.appThisIsOver = null;
		this.appThisIsOverSourceList = []; // appThisIsOverSourceList and appThisIsOverDestinationList used for
		this.appThisIsOverDestinationList = []; // context menu updates
		this.hasLoadedHtml = false;
		this.selectedSourceLinkLine = null;

		this.attemptToDataLinkOnServer = true;

		// used for quick checking bounds
		this.rectangleHelper = {
			x: 0,
			y: 0,
			w: 0,
			h: 0,
			setValues: function(nx, ny, nw, nh) {
				this.x = nx;
				this.y = ny;
				this.w = nw;
				this.h = nh;
			},
			contains: function (px, py) {
				return (this.x    <= px
						&& px     <= this.x + this.w
						&& this.y <= py
						&& py     <= this.y + this.h);
			}
		}

		var _this = this;
		// inject html code    file to grab from,    element.innerHTML to override
		// declaration towards end of file
		this.loadHtmlFromFile(this.resrcPath + "appDesign.html", this.element, function() {
			_this.postHtmlFillActions();
		});

		this.dataHandlingSetup();
	},

	// ---------------------------------------------------------------------------------------------------------------- Initial page setup

	/**
	 * After body is filled, want to associate event listeners and clear out some of the placeholder items.
	 *
	 * @method     postHtmlFillActions
	 */
	postHtmlFillActions: function() {
		this.dbprint("Prepping loaded html");
		var _this = this;
		var currentTag;
		currentTag = document.getElementById(this.id + "selectedSourceName");
		currentTag.innerHTML = "";
		currentTag = document.getElementById(this.id + "selectedSourceRemoveButton");
		currentTag.style.fontSize = ui.titleTextSize + "px";
		currentTag = document.getElementById(this.id + "currentAppOver");
		currentTag.innerHTML = "";
		currentTag = document.getElementById(this.id + "listOfConnections");
		currentTag.innerHTML = "";
		currentTag = document.getElementById(this.id + "selectedSourceRemoveButton");
		currentTag.addEventListener("mousedown", function() {
			_this.removeSelectedSource();
		});
		

		this.hasLoadedHtml = true;
	},

	// ---------------------------------------------------------------------------------------------------------------- Data setup
	/*
	This section is about getting variables from the server to know what is available and whether or not to show them.
	Currently asks the server for the future purpose to being able to handle Webview.
	*/

	/**
	 * Setup data handlers.
	 *
	 * @method     dataHandlingSetup
	 */
	dataHandlingSetup: function() {
		// this function has internal check if master.
		this.serverDataSubscribeToNewValueNotification("handleNewServerVariableNotifications", false);

		// get current vars after subscription. better to get dupes than miss one.
		this.serverDataGetAllTrackedDescriptions("handleCurrentServerVariables");
	},

	/**
	 * Activated when server responds to getAllTrackedDescriptions.
	 *
	 * @method handleCurrentServerVariables
	 * @param {Object} serverResponse - An array of object with properties: nameOfValue, description
	 */
	handleCurrentServerVariables: function(serverResponse) {
		this.varsKnown = this.varsKnown.concat(serverResponse);
		for (let i = 0; i < this.varsKnown.length; i++) {
			this.varsKnown[i].links = []; // add links array which is used for later
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
	},

	// ---------------------------------------------------------------------------------------------------------------- Data link creation

	/**
	 * Will activate through button click or context menu click. Creates a source -> destination flow.
	 * Check if sourceName exists and not already linked to destinationName.
	 * If no link exists, will call function to create subscription association and link line.
	 *
	 * @method	dataLink
	 * @param	responseObject	{Object}	Data from control page should have: sourceName, destinationName, pointerColor
	 */
	dataLink: function(responseObject) {
		if(isMaster) {
			for (let i = 0; i < this.varsKnown.length; i++) {
				// if the name of the var matches and it doesn't already have the link
				if (this.varsKnown[i].nameOfValue === responseObject.sourceName
				&& this.varsKnown[i].links.indexOf(responseObject.destinationName) === -1) {
					this.varsKnown[i].links.push(responseObject.destinationName);
					this.createLinkSubscriptionAndFunction(responseObject.sourceName, responseObject.destinationName);
					break;
				}
			}
		}
		// lines should show on all displays
		this.createLinkLine(responseObject.sourceName, responseObject.destinationName, responseObject.pointerColor);
	},

	/**
	 * Make the function to receive data (if it doesn't exist) and subscribe.
	 * The function is added to this app. This app subscribes to source, then passes to destination.
	 * This would be the place to modify if value changes need to occur.
	 *
	 * @method	createLinkSubscriptionAndFunction
	 * @param	sourceName	{String}	Name of the source variable
	 * @param	destinationName	{String}	Name of the destination variable
	 */
	createLinkSubscriptionAndFunction: function(sourceName, destinationName) {
		if(isMaster) {
			// if the function doesn't exist, create it
			if (!this["dataTo" + destinationName]) {
				this["dataTo" + destinationName] = function(responseObject) {
					// console.dir(responseObject);
					this.serverDataSetValue(destinationName, responseObject); // sets the value of destination variable
				}
			}
			// after function creation check, create this app's subscription and give it this name.
			this.serverDataSubscribeToValue(sourceName, ("dataTo" + destinationName), false);
			// perform initial grab
			this.serverDataGetValue(sourceName, ("dataTo" + destinationName));
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
			// store the id's for later
			svgLine.appSourceId = a1;
			svgLine.appDestinationId = a2;
			// draw the line
			svgLine.attr({
				x1: (a1.sage2_x + a1.sage2_width),
				y1: (a1.sage2_y + a1.sage2_height / 2),
				x2: (a2.sage2_x),
				y2: (a2.sage2_y + a2.sage2_height / 2)
			});
			svgLine.showTheLine = 5;
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
			for (let i = 0; i < this.varsKnown.length; i++) {
				// if the name of the var matches and it has the link
				if (this.varsKnown[i].nameOfValue === responseObject.sourceName
				&& this.varsKnown[i].links.indexOf(responseObject.destinationName) !== -1) {
					this.varsKnown[i].links.splice(this.varsKnown[i].links.indexOf(responseObject.destinationName), 1);
					this.serverDataSubscribeToValue(responseObject.sourceName, ("dataTo" + responseObject.destinationName), true);
					break;
				}
			}
		}
		this.removeLinkLine(responseObject.sourceName, responseObject.destinationName);
	},

	/**
	 * Removes a link line
	 *
	 * @method removeLinkLine
	 * @param {String} sourceName - Name of the source variable
	 * @param {String} destinationName - Name of the destination variable
	 */
	removeLinkLine: function(sourceName, destinationName) {
		this.lineContainer["lineFrom" + sourceName + "To" + destinationName].remove();
		this.lineContainer["lineFrom" + sourceName + "To" + destinationName] = undefined;
		delete this.lineContainer["lineFrom" + sourceName + "To" + destinationName];
	},

	// ---------------------------------------------------------------------------------------------------------------- Update logic

	load: function(date) {
	},

	/**
	 * Used as update function
	 * @method	draw
	 */
	draw: function(date) {
		if (!this.hasLoadedHtml) {
			return;
		}
		var foundApp = false;
		// go through each application
		var keys = Object.keys(applications);
		for (let i = keys.length - 1; i >= 0; i--) {
			if (this.id != keys[i] && this.isAppTouching(applications[keys[i]])){
				foundApp = true;
				// if it is a different app, prevents continuous writing
				if (this.appThisIsOver != applications[keys[i]].id) {
					this.appThisIsOver = keys[i];
					this.appThisIsOverSourceList = []; // clear out, its a different app
					this.appThisIsOverDestinationList = []; // these will be filled in showButtons
					document.getElementById(this.id + "currentAppOver").textContent =
						document.getElementById(applications[keys[i]].id + "_text").textContent
						+ " (" +  keys[i] + ")";
					this.showButtonsForSourceDestinationAssociation(applications[keys[i]]);
					this.getFullContextMenuAndUpdate();
				}
				break;
			}
		}
		if (!foundApp && this.appThisIsOver) { // prevents continuous removal
			this.appThisIsOver = null;
			this.appThisIsOverSourceList = []; // clear out, there is no app
			this.appThisIsOverDestinationList = [];
			document.getElementById(this.id + "currentAppOver").textContent = "";
			this.removeSourceDestinationButtons();
			this.getFullContextMenuAndUpdate();
		}
		this.updateLinkLines();
	},

	/**
	 * Checks if given app is touching this using the four corners and center
	 * @method	isAppTouching
	 * @param {Object} otherApp - potential app this is over
	 */
	isAppTouching: function(otherApp) {
		// this app position and size values
		var rx = this.sage2_x, // top left corner for x and y
			ry = this.sage2_y,
			rw = this.sage2_width,
			rh = this.sage2_height;
		// set the rectangle help to match the application
		this.rectangleHelper.setValues(
			otherApp.sage2_x,
			otherApp.sage2_y,
			otherApp.sage2_width,
			otherApp.sage2_height);
		// if the application contains any of the four corners / center of this
		if (this.rectangleHelper.contains(rx, ry)
			|| this.rectangleHelper.contains(rx + rw, ry)
			|| this.rectangleHelper.contains(rx, ry + rh)
			|| this.rectangleHelper.contains(rx + rw, ry + rh)
			|| this.rectangleHelper.contains(rx + rw / 2, ry + rh / 2)) {
			return true;
		}
		return false;
	},

	/**
	 * Updates selected source line and those associated with data transfer.
	 * @method	updateLinkLines
	 */
	updateLinkLines: function() {
		// if there is no line for selected source, make one
		if (!this.selectedSourceLinkLine) {
			var svgLine = svgForegroundForWidgetConnectors.line(0, 0, 0, 0);
			svgLine.attr({
				id: this.id + "showingSelectedSource",
				strokeWidth: ui.widgetControlSize * 0.18,
				stroke:  "rgba(250,250,250,1.0)"
			});
			this.selectedSourceLinkLine = svgLine;
		}
		var a1 = applications[this.id];
		var a2 = document.getElementById(this.id + "selectedSourceName").textContent.trim();
		// if there is a selected source get the app name and update the line
		if (a2.length > 0) {
			// if the application is still active (someone might have closed it)
			a2 = applications[a2.substring(0, a2.indexOf(":"))];
			if (a2) {
				var removeButton = document.getElementById(this.id + "selectedSourceRemoveButton");
				this.selectedSourceLinkLine.attr({
					x1: (a1.sage2_x),
					y1: (a1.sage2_y + removeButton.offsetTop),
					x2: (a2.sage2_x),
					y2: (a2.sage2_y)
				});
			} else {
				this.removeSelectedSource();
			}
		} else {
			this.selectedSourceLinkLine.attr({
				x1: 0,
				y1: 0,
				x2: 0,
				y2: 0
			});
		}
		// update all other link lines
		var keys = Object.keys(this.lineContainer);
		var currentLine, a1, a2;
		for (let i = 0; i < keys.length; i++) {
			// grab references for line, and the apps
			currentLine = this.lineContainer[keys[i]];
			a1 = currentLine.appSourceId;
			a2 = currentLine.appDestinationId;
			// if the line should be showing and both source and destination exist
			if (currentLine.showTheLine && a1 && a2) {
				currentLine.attr({
					x1: a1.sage2_x + a1.sage2_width,
					y1: a1.sage2_y + a1.sage2_height / 2,
					x2: a2.sage2_x,
					y2: a2.sage2_y + a2.sage2_height / 2
				});
				currentLine.showTheLine -= this.dt;
				if (currentLine.showTheLine < 0) {
					currentLine.showTheLine = false;
				}
			} else {
				currentLine.attr({
					x1: 0,
					y1: 0,
					x2: 0,
					y2: 0
				});
			}
		}
	},

	// ---------------------------------------------------------------------------------------------------------------- Button generation

	/**
	 * Removes selected source, which is just erase the textContent.
	 * @method	removeSelectedSource
	 */
	removeSelectedSource: function() {
		var currentTag = document.getElementById(this.id + "selectedSourceName");
		currentTag.textContent = "";
		// update context menu
		this.getFullContextMenuAndUpdate();
	},

	/**
	 * Looks through known broadcasted variables to add association buttons.
	 * @method	showButtonsForSourceDestinationAssociation
	 * @param {Object} otherApp - app this is over
	 */
	showButtonsForSourceDestinationAssociation: function(otherApp) {
		this.removeSourceDestinationButtons();
		var appSourceList = [];
		var appDestinationList = [];
		// for each of the variables, check if it is from app. varsknown is [] of {nameOfValue, description}
		for (let i = 0; i < this.varsKnown.length; i++) {
			// done by the prefix of the var name
			if (this.varsKnown[i].nameOfValue.indexOf(otherApp.id + ":") !== -1) {
				if (this.varsKnown[i].nameOfValue.indexOf(":source:") !== -1) {
					appSourceList.push(this.varsKnown[i]);
				} else if (this.varsKnown[i].nameOfValue.indexOf(":destination:") !== -1) {
					appDestinationList.push(this.varsKnown[i]);
				}
			}
		}
		// appSourceList and appDestinationList should be populated
		for (let i = 0; i < appSourceList.length; i++) {
			this.createSourceButton(appSourceList[i]);
		}
		// only allow linking to destination is a source name has been selected.
		var sourceNameTag = document.getElementById(this.id + "selectedSourceName");
		if (sourceNameTag && sourceNameTag.textContent.trim().length > 0) {
			for (let i = 0; i < appDestinationList.length; i++) {
				this.createDestinationButton(appDestinationList[i]);
			}
		}
	},

	/**
	 * Removes source and destination association button.
	 * @method	removeSourceDestinationButtons
	 */
	removeSourceDestinationButtons: function() {
		var container = document.getElementById(this.id + "SourceButtonsList");
		container.innerHTML = "";
		container = document.getElementById(this.id + "DestinationButtonsList");
		container.innerHTML = "";
	},

	/**
	 * Creates a source association button.
	 * @method	createSourceButton
	 * @param {Object} dataSource - {nameOfValue, description}
	 */
	createSourceButton: function(dataSource) {
		var container = document.getElementById(this.id + "SourceButtonsList");
		var button = document.createElement("button");
		button.id = this.id + ">>SourceSelect>>" + dataSource.nameOfValue;
		button.style.fontSize = ui.titleTextSize + "px";
		button.textContent = dataSource.nameOfValue;
		container.appendChild(button);
		container.appendChild(document.createElement("br"));
		var _this = this; // this app
		button.addEventListener("mousedown", function() {
			_this.buttonEffectSelectSource(this.id); // send the id of the button, not app
		});

		// add button id to enable context menu rebuild
		this.appThisIsOverSourceList.push(button.id);
	},

	/**
	 * Activates when source button is clicked.
	 * @method	buttonEffectSelectSource
	 * @param {String} buttonId - should have format [this app's id]>>SourceSelect>>[name of data source]
	 */
	buttonEffectSelectSource: function(buttonId) {
		var container = document.getElementById(this.id + "selectedSourceName");
		var sourceName = buttonId;
		while (sourceName.indexOf(">>") !== -1) {
			sourceName = sourceName.substring(sourceName.indexOf(">>") + 2);
		}
		container.textContent = sourceName;
		// update context menu
		this.getFullContextMenuAndUpdate();
	},

	/**
	 * Creates a destination association button.
	 * @method	createDestinationButton
	 * @param {Object} dataDestination - {nameOfValue, description}
	 */
	createDestinationButton: function(dataDestination) {
		var container = document.getElementById(this.id + "DestinationButtonsList");

		// prevent duplicate links as much as possible.
		var sourceName = document.getElementById(this.id + "selectedSourceName").textContent;
		var destinationName = dataDestination.nameOfValue;
		for (let i = 0; i < this.removeDataLinkButtonList.length; i++) {
			let bId = this.removeDataLinkButtonList[i].id;
			if (bId === (this.id + ">>removeLink>>" + sourceName + ">>" + destinationName)) {
				return; // return if button already exists.
			}
		}

		var button = document.createElement("button");
		button.id = this.id + ">>DestinationSelect>>" + dataDestination.nameOfValue;
		button.style.fontSize = ui.titleTextSize + "px";
		button.textContent = dataDestination.nameOfValue;
		container.appendChild(button);
		container.appendChild(document.createElement("br"));
		var _this = this; // this app
		button.addEventListener("mousedown", function() {
			_this.buttonEffectSelectDestination(this.id); // send the id of the button, not app
		});

		// add button id to enable context menu rebuild
		this.appThisIsOverDestinationList.push(button.id);
	},

	/**
	 * Activates when destination button is clicked.
	 * @method	buttonEffectSelectDestination
	 * @param {String} buttonId - should have format [this app's id]>>SourceSelect>>[name of data source]
	 */
	buttonEffectSelectDestination: function(buttonId) {
		var sourceName = document.getElementById(this.id + "selectedSourceName").textContent;
		var destinationName = buttonId;

		while (destinationName.indexOf(">>") !== -1) {
			destinationName = destinationName.substring(destinationName.indexOf(">>") + 2);
		}
		this.dbprint("Attempting to associate " + sourceName + "(source) to " + destinationName + "(destination)");



		if (this.attemptToDataLinkOnServer) {
			SAGE2SharedServerData.createDataLinkOnServer(sourceName, destinationName);
			// lines should show on all displays
			this.createLinkLine(sourceName, destinationName);
		} else {
			// this might also contain link information
			// link creation
			this.dataLink({sourceName: sourceName, destinationName: destinationName});
		}




		// create button to remove the link
		this.createRemoveDataLinkButton(sourceName, destinationName);

		// hide this button to prevent multiple link associations
		document.getElementById(buttonId).style.visibility = "hidden";
		// update context menu
		this.appThisIsOverDestinationList.splice(this.appThisIsOverDestinationList.indexOf(buttonId), 1);
		this.getFullContextMenuAndUpdate();
	},

	/**
	 * Activates when destination association is created.
	 * @method	createRemoveDataLinkButton
	 * @param {String} buttonId - should have format [this app's id]>>SourceSelect>>[name of data source]
	 */
	createRemoveDataLinkButton: function(sourceName, destinationName) {
		var button = document.createElement("button");
		button.style.fontSize = ui.titleTextSize + "px";
		button.id = this.id + ">>removeLink>>" + sourceName + ">>" + destinationName; 
		button.textContent = sourceName + " -> " + destinationName;

		// attach button to the container
		var container = document.getElementById(this.id + "listOfConnections");
		container.appendChild(button);
		container.appendChild(document.createElement("br")); // add a line
		container.appendChild(document.createElement("br"));

		this.removeDataLinkButtonList.push(button);
		// associate the click effect
		var _this = this;
		button.addEventListener("mousedown", function() {
			_this.buttonEffectRemoveDataLink(this.id); // button id
		});
		button.addEventListener("mouseover", function() {
			_this.buttonEffectShowDataLinkLine(this.id); // button id
		});
		button.addEventListener("mouseout", function() {
			_this.buttonEffectHideDataLinkLine(this.id); // button id
		});
	},

	/**
	 * Activates when removeLink button is pushed.
	 * @method	buttonEffectRemoveDataLink
	 * @param {String} buttonId - should have format [this app's id]>>removeLink>>[sourceName]>>[destinationName]
	 */
	buttonEffectRemoveDataLink: function(buttonId) {
		this.dbprint("remove link pressed for " + buttonId);
		// get names, format is      this.id + ">>removeLink>>" + sourceName + ">>" + destinationName; 
		var sourceName = buttonId.split(">>")[2];
		var destinationName = buttonId.split(">>")[3];

		// remove button from list, updates visuals at the same time
		document.getElementById(this.id + "listOfConnections").innerHTML = ""; // clear and rebuild
		for (let i = 0; i < this.removeDataLinkButtonList.length; i++) {
			if (this.removeDataLinkButtonList[i].id === buttonId) {
				this.removeDataLinkButtonList.splice(i, 1); // removal
			} else {
				this.createRemoveDataLinkButton(sourceName, destinationName);
			}
		}

		if (this.attemptToDataLinkOnServer) {
			SAGE2SharedServerData.createDataLinkOnServer(sourceName, destinationName, true); // true to kill link
			// lines should show on all displays
		} else {
			// remove data link
			this.dbprint("TODO REMOVE DATA LINK");
			this.dataUnLink({sourceName: sourceName, destinationName: destinationName});
		}

		// update context menu
		this.getFullContextMenuAndUpdate();
	},

	/**
	 * Activates when removeLink button gets mouseover event.
	 * @method	buttonEffectShowDataLinkLine
	 * @param {String} buttonId - should have format [this app's id]>>removeLink>>[sourceName]>>[destinationName]
	 */
	buttonEffectShowDataLinkLine: function(buttonId) {
		this.dbprint("SHOW the data link line for  " + buttonId);
		var sourceName = buttonId.split(">>")[2];
		var destinationName = buttonId.split(">>")[3];
		var currentLine = this.lineContainer["lineFrom" + sourceName + "To" + destinationName];
		currentLine.showTheLine = 10000;
	},

	/**
	 * Activates when removeLink button gets mouseout event.
	 * @method	buttonEffectHideDataLinkLine
	 * @param {String} buttonId - should have format [this app's id]>>removeLink>>[sourceName]>>[destinationName]
	 */
	buttonEffectHideDataLinkLine: function(buttonId) {
		this.dbprint("HIDE the data link line for  " + buttonId);
		var sourceName = buttonId.split(">>")[2];
		var destinationName = buttonId.split(">>")[3];
		var currentLine = this.lineContainer["lineFrom" + sourceName + "To" + destinationName];
		currentLine.showTheLine = false;
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

		// if there is a currently selected source, it will be shown
		var sourceNameTag = document.getElementById(this.id + "selectedSourceName");
		if (sourceNameTag && sourceNameTag.textContent.trim().length > 0) {
			// so enable removal from context menu
			entry = {};
			entry.description = "Remove selected source:" + sourceNameTag.textContent;
			entry.callback    = "removeSelectedSource";
			entry.parameters  = {};
			entry.entryColor  = "lightsalmon";
			entries.push(entry);
		}

		entries.push({description: "separator"});

		var entryDescription;
		for (let i = 0; i < this.appThisIsOverSourceList.length; i++) {
			entryDescription = this.appThisIsOverSourceList[i];
			while (entryDescription.indexOf(">>") !== -1) { // this was part of the button formatting
				entryDescription = entryDescription.substring(entryDescription.indexOf(">>") + 2);
			}
			entry = {};
			entry.description = "Select source:" + entryDescription;
			entry.callback    = "contextSourceDestinationSelection";
			entry.parameters  = { type: "source", buttonId: this.appThisIsOverSourceList[i] };
			// entry.entryColor  = "lightgreen"; // color for selection
			entries.push(entry);
		}

		entries.push({description: "separator"});

		// only allow linking to destination is a source name has been selected.
		if (sourceNameTag && sourceNameTag.textContent.trim().length > 0) {
			// for each destination in this app, createa  link button.
			for (let i = 0; i < this.appThisIsOverDestinationList.length; i++) {
				entryDescription = this.appThisIsOverDestinationList[i];
				while (entryDescription.indexOf(">>") !== -1) { // this was part of the button formatting
					entryDescription = entryDescription.substring(entryDescription.indexOf(">>") + 2);
				}
				entry = {};
				entry.description = "Link source to " + entryDescription;
				entry.callback    = "contextSourceDestinationSelection";
				entry.parameters  = { type: "destination", buttonId: this.appThisIsOverDestinationList[i] };
				entry.entryColor  = "lightgreen"; // color for selection
				entries.push(entry);
			}
		}

		if (this.removeDataLinkButtonList.length > 0) {
			entries.push({description: "separator"});
		}
		var sourceName, destinationName;
		for (let i = 0; i < this.removeDataLinkButtonList.length; i++) {
			// get names, format is      this.id + ">>removeLink>>" + sourceName + ">>" + destinationName; 
			sourceName = this.removeDataLinkButtonList[i].id.split(">>")[2];
			destinationName = this.removeDataLinkButtonList[i].id.split(">>")[3];
			entry = {};
			entry.description = "Remove link " + sourceName + " to " + destinationName;
			entry.callback    = "contextSourceDestinationSelection";
			entry.parameters  = { type: "removeLink", buttonId: this.removeDataLinkButtonList[i].id}; 
			entry.entryColor  = "lightsalmon"; // color for selection
			entries.push(entry);
		}

		entries.push({description: "separator"});

		if (this.attemptToDataLinkOnServer) {
			entry = {};
			entry.description = "Stop trying to link on server";
			entry.callback    = "toggleDataLinkOnServer";
			entry.parameters  = { status: false }; 
			entry.entryColor  = "lightsalmon"; // color for selection
			entries.push(entry);
		} else {
			entry = {};
			entry.description = "Try to link on server";
			entry.callback    = "toggleDataLinkOnServer";
			entry.parameters  = { status: true }; 
			entry.entryColor  = "lightgreen"; // color for selection
			entries.push(entry);
		}

		return entries;
	},

	contextSourceDestinationSelection: function(msgParams) {
		if (msgParams.type === "source") {
			this.buttonEffectSelectSource(msgParams.buttonId);
		} else if (msgParams.type === "destination") {
			this.buttonEffectSelectDestination(msgParams.buttonId);
		} else if (msgParams.type === "removeLink") {
			this.buttonEffectRemoveDataLink(msgParams.buttonId);
		} else {
			console.log("ERROR: unknown type given to data linker");
		}
	},

	toggleDataLinkOnServer: function(msgParams) {
		this.attemptToDataLinkOnServer = msgParams.status;
		this.getFullContextMenuAndUpdate();
	},



	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
	},

	quit: function() {
		// no additional calls needed.
		this.selectedSourceLinkLine.remove();
		var keys = Object.keys(this.lineContainer);
		for (let i = 0; i < keys.length; i++) {
			this.lineContainer[keys[i]].remove();
		}
	},

	// ---------------------------------------------------------------------------------------------------------------- Html loading and id allocation

	/**
	 * This will load the visual layout from html file included in the folder
	 * Done so one doesn't have to programatically generate layout.
	 *
	 * @method loadHtmlFromFile
	 * @param {String} relativePathFromAppFolder - From the containing app folder, path to file
	 * @param {String} whereToAppend - Node who's innerHTML will be set to content
	 * @param {String} callback - What function to call after getting the file
	 */
	loadHtmlFromFile: function(relativePathFromAppFolder, whereToAppend, callback) {
		var _this = this;
		readFile(relativePathFromAppFolder, function(err, data) {
			_this.loadIntoAppendLocation(whereToAppend, data);
			callback();
		}, 'TEXT');
	},

	/**
	 * Called after xhr gets html content
	 * Main thing to note is that id fields are altered to be prefixed with SAGE2 assigned id
	 *
	 * @method loadIntoAppendLocation
	 * @param {String} whereToAppend - Node who's innerHTML will be set to content
	 * @param {String} responseText - Content of the file
	 */
	loadIntoAppendLocation: function(whereToAppend, responseText) {
		var content = "";
		// id and spaces because people aren't always consistent
		var idIndex;

		// find location of first id div. Because there will potentially be multiple apps.
		idIndex = this.findNextIdInHtml(responseText);

		// for each id, prefix it with this.id
		while (idIndex !== -1) {
			// based on id location move it over
			content += responseText.substring(0, idIndex);
			responseText = responseText.substring(idIndex);
			// collect up to the first double quote. design.html has double quotes, but HTML doesn't require.
			content += responseText.substring(0, responseText.indexOf('"') + 1);
			responseText = responseText.substring(responseText.indexOf('"') + 1);
			// apply id prefix
			content += this.id;
			// collect rest of id
			content += responseText.substring(0, responseText.indexOf('"') + 1);
			responseText = responseText.substring(responseText.indexOf('"') + 1);

			// find location of first id div. Because there will potentially be multiple apps.
			idIndex = this.findNextIdInHtml(responseText);
		}
		content += responseText;
		whereToAppend.innerHTML = content;
	},

	/**
	 * This returns the index of the first location of id
	 * Accounts for 0 to 3 spaces between id and =
	 *
	 * @method     findNextIdInHtml
	 * @param {String} responseText - Content of the file
	 */
	findNextIdInHtml: function(responseText) {
		// find location of first id div. Because there will potentially be multiple apps.
		// the multiple checks are incase writers are not consistent
		var idIndex = responseText.indexOf("id=");
		var ids1 = responseText.indexOf("id =");
		var ids2 = responseText.indexOf("id  =");
		var ids3 = responseText.indexOf("id   =");
		// if (idIndex isn't found) or (is found but ids1 also found and smaller than idIndex)
		if ((idIndex === -1) || (ids1 > -1 && ids1 < idIndex)) {
			idIndex = ids1;
		}
		if ((idIndex === -1) || (ids2 > -1 && ids2 < idIndex)) {
			idIndex = ids2;
		}
		if ((idIndex === -1) || (ids3 > -1 && ids3 < idIndex)) {
			idIndex = ids3;
		}
		return idIndex;
	},

	blankString: "" //  place holder

});
