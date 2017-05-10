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


	/**
	* For local tracking as a separation from remote pointers.
	*
	* @method trackLocalPointer
	* @param pointer_data {Object} contains information about user: color, id, label
	*/
	trackLocalPointer: function(pointer_data) {
		var found = false;
		for(let i = 0; i < this.allPointersOnThisSite.length; i++) {
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
	* This will be called anytime an app has a data sync.
	* Show all remote pointers if they should be over this app.
	*
	* @method showPointer
	* @param pointer_data {Object} contains information about user: color, id, label, positionInPercent, lastUpdate
	* @param app {Object} app which called this function
	*/
	showPointer: function(pointer_data, app) {
		var found = -1;
		var localHostName = document.getElementById("machine").textContent;
		// for each remote pointer, see if it already exists
		for(let i = 0; i < this.allRemotePointers.length; i++) {
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
		} else { // if it does exist, use the existing one
			pointer = this.allRemotePointers[found];
			pointer.id = pointer_data.id;
			pointer.label = pointer_data.label + "@" + pointer_data.server;
			pointer.color = pointer_data.color;
			pointer.left = pointer_data.positionInPercent.x * app.sage2_width + app.sage2_x;
			pointer.top = pointer_data.positionInPercent.y * app.sage2_height + app.sage2_y;
		}
		/*
		If the remote pointer's last update was less than the given update time, then move it.
		This matters when pointers move across apps.
		*/
		if (pointer.lastUpdate <= pointer_data.lastUpdate) {
			// update position
			ui.updateSagePointerPosition(pointer);
			pointer.lastUpdate = pointer_data.lastUpdate
		}
	},


	hidePointer: function() {

	}
};