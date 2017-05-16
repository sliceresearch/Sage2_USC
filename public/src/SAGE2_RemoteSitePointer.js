// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015-2016

// Create a global that will act as a namespace

var SAGE2RemoteSitePointer = {
	allRemotePointers: [],
	allPointersOnThisSite: [],
	pointerUpdateInterval: 100, // ms
	allAppsWithRemotePointerTracking: {},


	/**
	* For local tracking as a separation from remote pointers.
	*
	* @method trackLocalPointer
	* @param pointer_data {Object} contains information about user: color, id, label
	*/
	trackLocalPointer: function(pointer_data) {
		var found = false;
		for (let i = 0; i < this.allPointersOnThisSite.length; i++) {
			if (this.allPointersOnThisSite[i].id === pointer_data.id) {
				this.allPointersOnThisSite[i] = pointer_data;
				found = true;
				break;
			}
		}
		if (!found) {
			this.allPointersOnThisSite.push(pointer_data);
		}
	},

	/**
	* Usually called after SAGE2Load, to see if this app needs to have pointers updated.
	* However also can be called after resize or move to make sure the pointers don't get left behind.
	*
	* @method checkIfAppNeedsUpdate
	* @param app {Object} app which called this function
	*/
	checkIfAppNeedsUpdate: function(app) {
		for (let i = 0; i < app.state.pointersOverApp.length; i++) {
			this.updateRemotePointer(app.state.pointersOverApp[i], app);
		}
	},

	/**
	* This will be called anytime an app has a data sync.
	* Show all remote pointers if they should be over this app.
	*
	* @method updateRemotePointer
	* @param pointer_data {Object} contains information about user: color, id, label, positionInPercent, lastUpdate
	* @param app {Object} app which called this function
	*/
	updateRemotePointer: function(pointer_data, app) {
		var localHostName = document.getElementById("machine").textContent;
		if (localHostName === pointer_data.server) {
			return;
		}
		var found = -1;
		// for each remote pointer, see if it already exists
		for (let i = 0; i < this.allRemotePointers.length; i++) {
			if (this.allRemotePointers[i].id === pointer_data.id) {
				found = i;
			}
		}
		var pointer;
		// if it doesn't exist, create it
		if (found === -1) {
			pointer = {
				// needed for creation: id, label, color, visible
				id: pointer_data.id,
				label: pointer_data.label + "@" + pointer_data.server, // name@server
				color: pointer_data.color,
				visible: true,
				// needed for showing: id, left, top, label, color, sourceType
				left: pointer_data.positionInPercent.x * app.sage2_width + app.sage2_x,
				top: pointer_data.positionInPercent.y * app.sage2_height + app.sage2_y,
				sourceType: "Remote", // only "Touch" should matter,
				lastUpdate: pointer_data.lastUpdate
			};
			ui.createSagePointer(pointer);
			ui.showSagePointer(pointer);
			this.allRemotePointers.push(pointer_data);
		} else { // if exists, use existing. Data overwritten in case user changes values, but not lastUpdate
			pointer = this.allRemotePointers[found];
			pointer.id = pointer_data.id;
			pointer.label = pointer_data.label + "@" + pointer_data.server;
			pointer.color = pointer_data.color;
			pointer.left = pointer_data.positionInPercent.x * app.sage2_width + app.sage2_x;
			pointer.top = pointer_data.positionInPercent.y * app.sage2_height + app.sage2_y;
			pointer.hidden = pointer_data.hidden;
		}

		/*
		If the remote pointer's last update was less than the given update time, then move it.
		This matters when pointers move across apps.
		*/
		if (pointer.lastUpdate <= pointer_data.lastUpdate) {
			if (pointer.hidden) {
				ui.hideSagePointer(pointer);
			} else {
				// update position
				ui.showSagePointer(pointer);
			}
			pointer.lastUpdate = pointer_data.lastUpdate;
		}
	},

	/**
	* This is used to track apps that use remote pointer data.
	* More specifically how to remove the pointer when a user leaves pointer mode.
	*
	* @method addAppToTracking
	* @param app {Object} the app which is using remote pointer data
	*/
	addAppToTracking: function(app) {
		if (this.allAppsWithRemotePointerTracking["" + app.id] === undefined) {
			this.allAppsWithRemotePointerTracking["" + app.id] = app;
		}
	},

	/**
	* When an app quits / terminates, hide the associated remote pointers so they aren't stuck on the screen.
	* Done by setting hidden to true and setting last update to now, then calling the update function, which will hide.
	*
	* @method appQuitingHidePointers
	* @param app {Object} the app which check for remote pointer removal
	*/
	appQuitHidePointers: function(app) {
		var currentPointer;
		for (let i = 0; i < app.state.pointersOverApp.length; i++) {
			currentPointer = app.state.pointersOverApp[i];
			currentPointer.lastUpdate = currentPointer.lastUpdate + 1;
			currentPointer.hidden = true;
			this.updateRemotePointer(currentPointer, app);
		}
	},

	/**
	* This is used to track apps that use remote pointer data.
	* More specifically how to remove the pointer when a user leaves pointer mode.
	*
	* @method notifyAppsPointerIsHidden
	* @param pointer_data {Object} contains information about user: color, id, label
	*/
	notifyAppsPointerIsHidden: function(pointer_data) {
		var currentApp;
		var currentPointer;
		for (let key in this.allAppsWithRemotePointerTracking) {
			currentApp = this.allAppsWithRemotePointerTracking[key];
			for (let i = 0; i < currentApp.state.pointersOverApp.length; i++) {
				currentPointer = currentApp.state.pointersOverApp[i];
				if (currentPointer.id === pointer_data.id) {
					currentPointer.hidden = true;
					currentPointer.lastUpdate = Date.now();
					currentApp.SAGE2Sync(true);
					break; // go to next app, id should be unique
				}
			}
		}
	}
};
