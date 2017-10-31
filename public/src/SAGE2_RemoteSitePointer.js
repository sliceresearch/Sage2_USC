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
	shouldPassEvents: false, // currently disabled


	/**
	* Will be activated locally, but stores the data into state to share remotely.
	*
	* @method trackPointer
	* @param app {Object} app which called this function
	* @param user_id {Object} contains information about user: color, id, label
	* @param position {Object} contains location of cursor with app's top left corner as origin
	*/
	trackPointer: function(app, user_id, position) {
		// first check if this user's pointer is already being tracked.
		var found = -1;
		for (let i = 0; i < app.state.pointersOverApp.length; i++) {
			if (app.state.pointersOverApp[i].id === user_id.id) {
				found = i;
			}
		}
		// if not found, create entry
		var pointer;
		if (found === -1) {
			pointer = {
				id: user_id.id,
				server: document.getElementById("machine").textContent,
				eventQueue: []
			};
			app.state.pointersOverApp.push(pointer);
			SAGE2RemoteSitePointer.addAppToTracking(app); // pointer add means app should be added to tracking
			if (app.shouldPassRemotePointerEvents === undefined) {
				app.shouldPassRemotePointerEvents = false;
			}
		} else {
			pointer = app.state.pointersOverApp[found];
		}
		// update the pointer values
		pointer.color = user_id.color;
		pointer.label = user_id.label;
		pointer.position = position;
		pointer.positionInPercent = {
			x: (position.x / app.sage2_width),
			y: (position.y / app.sage2_height)
		};
		pointer.lastUpdate = Date.now();
		pointer.hidden = false;
		// sync across sites. maybe needs a delay or interval rather than spam when move happens?
		app.SAGE2Sync(true);
	},

	/**
	* Testing event passing for remote pointers
	*
	* @method trackEvent
	* @param app {Object} app which called this function
	* @param event {Object} contains information about event: eventType, position, user_id, data, date
	*/
	trackEvent: function(app, event) {
		// this can potentially cause problems with apps like google maps where infinite loops can be generated.
		if (!app.shouldPassRemotePointerEvents) {
			return;
		}

		// first check if this user's pointer is already being tracked.
		var found = -1;
		for (let i = 0; i < app.state.pointersOverApp.length; i++) {
			if (app.state.pointersOverApp[i].id === event.user_id.id) {
				found = i;
			}
		}
		// if not found, can't do anything
		if (found !== -1) {
			var pointer;
			pointer = app.state.pointersOverApp[found];
			pointer.lastUpdate = Date.now();
			pointer.hidden = false;
			pointer.eventQueue.push(event);
			event.s2rspTime = pointer.lastUpdate;
			// sync across sites. maybe needs a delay or interval rather than spam when move happens?
			app.SAGE2Sync(true);
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
				// left: pointer_data.positionInPercent.x * app.sage2_width + app.sage2_x,
				// top: pointer_data.positionInPercent.y * app.sage2_height + app.sage2_y,
				left: pointer_data.positionInPercent.x * app.sage2_width, // put it on the app based on percent
				top: pointer_data.positionInPercent.y * app.sage2_height,
				sourceType: "Remote", // only "Touch" should matter,
				lastUpdate: pointer_data.lastUpdate,
				mode: 1 // app interaction visual style.
			};
			ui.createSagePointer(pointer);
			ui.changeSagePointerMode(pointer);
			ui.showSagePointer(pointer);
			this.allRemotePointers.push(pointer_data);
		} else { // if exists, use existing. Data overwritten in case user changes values, but not lastUpdate
			pointer = this.allRemotePointers[found];
			pointer.id = pointer_data.id;
			pointer.label = pointer_data.label + "@" + pointer_data.server;
			pointer.color = pointer_data.color;
			pointer.left = pointer_data.positionInPercent.x * app.sage2_width; // put it on the app based on percent
			pointer.top = pointer_data.positionInPercent.y * app.sage2_height;
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
				// move the pointer to the application.
				document.getElementById(app.id).appendChild(document.getElementById(pointer.id));
			}
			pointer.lastUpdate = pointer_data.lastUpdate;

			// now update if events have been passed
			var pEvent;
			while (pointer_data.eventQueue.length > 0) {
				pEvent = pointer_data.eventQueue.shift();
				if (pEvent.s2rspTime === pointer_data.lastUpdate) {
					app.event(pEvent.eventType, pEvent.position, pEvent.user_id, pEvent.data, pEvent.date);
				}
			}
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
		let main = document.getElementById("main");
		for (let i = 0; i < app.state.pointersOverApp.length; i++) {
			currentPointer = app.state.pointersOverApp[i];
			currentPointer.lastUpdate = currentPointer.lastUpdate + 1;
			currentPointer.hidden = true;
			this.updateRemotePointer(currentPointer, app);
			// put the pointer back onto the main area
			if (main) {
				let ptr_id = document.getElementById(currentPointer.id);
				if (ptr_id) {
					// add the pointer element back into the DOM
					main.appendChild(ptr_id);
				}
			}
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
