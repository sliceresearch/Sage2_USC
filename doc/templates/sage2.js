//
// SAGE2 application: APPNAME
// by: FIRSTNAME LASTNAME <EMAIL>
//
// Copyright (c) 2015
//

"use strict";

/* global  */

var APPNAME = SAGE2_App.extend({
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);
		// Set the DOM id
		this.element.id = "div_" + data.id;
		// Set the background to black
		this.element.style.backgroundColor = 'black';

		// move and resize callbacks
		this.resizeEvents = "continuous"; // onfinish
		// this.moveEvents   = "continuous";

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;
	},

	load: function(date) {
		console.log('APPNAME> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
		console.log('APPNAME> Draw with state value', this.state.value);
	},

	resize: function(date) {
		// Called when window is resized
		this.refresh(date);
	},

	move: function(date) {
		// Called when window is moved (set moveEvents to continuous)
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			// click
		} else if (eventType === "pointerMove" && this.dragging) {
			// move
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			// click release
		} else if (eventType === "pointerScroll") {
			// Scroll events for zoom
		} else if (eventType === "widgetEvent") {
			// widget events
		} else if (eventType === "keyboard") {
			if (data.character === "m") {
				this.refresh(date);
			}
		} else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") {
				// left
				this.refresh(date);
			} else if (data.code === 38 && data.state === "down") {
				// up
				this.refresh(date);
			} else if (data.code === 39 && data.state === "down") {
				// right
				this.refresh(date);
			} else if (data.code === 40 && data.state === "down") {
				// down
				this.refresh(date);
			}
		}
	}
});
