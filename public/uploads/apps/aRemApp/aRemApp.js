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
		this.state.araPointers = [];
		this.pointerUpdateTimer = Date.now();
		console.log("erase me, just started aRemApp the id is:" + this.element.id);
	},

	load: function(date) {
		// Does this do anything? Or ever get called?
	},

	draw: function(date) {
		var workingDiv = document.getElementById(this.element.id + "infoDiv");
		workingDiv.style.fontSize = "100px";
		workingDiv.style.background = "white";
		workingDiv.innerHTML = this.state.numToShow;

		for (var i = 0; i < this.state.araPointers.length; i++) {
			workingDiv = "app_" + this.element.id.substring(this.element.id.indexOf("_") + 1) + this.state.araPointers[i].id;
			// console.log("erase me, workingDiv id string:" + workingDiv);
			workingDiv = document.getElementById(workingDiv);
			// console.log("erase me, workingDiv after getElementById:" + workingDiv);
			if (workingDiv === undefined || workingDiv === null) {
				console.log("erase me, error with working div:" + workingDiv);
				console.dir(workingDiv);
				workingDiv = document.createElement("div");
				workingDiv.id = "app_" + this.element.id.substring(this.element.id.indexOf("_") + 1) + this.state.araPointers[i].id;
				workingDiv.style.position = "absolute";
				workingDiv.style.width = "20px";
				workingDiv.style.height = "20px";
				var appContainer = document.getElementById("app_" + this.element.id.substring(this.element.id.indexOf("_") + 1));
				appContainer.appendChild(workingDiv);
			}
			workingDiv.style.left = this.state.araPointers[i].x + "px";
			workingDiv.style.top = this.state.araPointers[i].y + "px";
			workingDiv.style.background = this.state.araPointers[i].color;
			workingDiv.innerHTML = this.state.araPointers[i].label;
		}
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
		if (eventType === "pointerMove") {
			this.trackPointer(user_id, position, date);
		}
	},

	trackPointer: function(userInfo, position, date) {
		var pIndex = -1;
		var pointerRef;
		var pointDiv;
		// Search if the pointer is being tracked.
		for (var i = 0; i < this.state.araPointers.length; i++) {
			// Two equals instead of three because there seems to be auto conversion with a pointer id.
			if (this.state.araPointers[i].id == (""+ userInfo.id)) {
				pIndex = i;
				break;
			}
		}
		// If not found make a new entry.
		if (pIndex === -1) {
			pointerRef = {};
			pointerRef.id = "" + userInfo.id;
			console.log("erase me, pointerRef.id:" + pointerRef.id);
			this.state.araPointers.push(pointerRef);
			// Also make visual value for it
			pointDiv = document.createElement("div");
			pointDiv.id = "app_" + this.element.id.substring(this.element.id.indexOf("_") + 1) + pointerRef.id;
			pointDiv.style.position = "absolute";
			pointDiv.style.width = "20px";
			pointDiv.style.height = "20px";
			var appContainer = document.getElementById("app_" + this.element.id.substring(this.element.id.indexOf("_") + 1));
			appContainer.appendChild(pointDiv);
		} else { // Otherwise use existing entry.
			pointerRef = this.state.araPointers[pIndex];
		}
		// Update values
		pointerRef.color = userInfo.color;
		pointerRef.label = userInfo.label;
		pointerRef.x = position.x;
		pointerRef.y = position.y;
		// Update div
		pointDiv = document.getElementById("app_" + this.element.id.substring(this.element.id.indexOf("_") + 1) + pointerRef.id);
		pointDiv.style.left = pointerRef.x + "px";
		pointDiv.style.top = pointerRef.y + "px";
		pointDiv.style.background = pointerRef.color;
		pointDiv.innerHTML = pointerRef.label;

		if (Date.now() - this.pointerUpdateTimer > 50) {
			this.SAGE2UserModification = true;
			this.refresh(date);
			this.SAGE2UserModification = false;
			this.pointerUpdateTimer = Date.now();
			// console.log("erase me, updating a pointer move now");
			// console.dir(this.state.araPointers);
		}
	},

	quit: function() {

	}

});
