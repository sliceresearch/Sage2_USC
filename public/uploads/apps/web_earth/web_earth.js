// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

"use strict";

/* global WE */

var web_earth = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "onfinish";
		this.maxFPS = 20.0;

		this.element.id = "div" + data.id;

		this.map = null;
		this.ready = false;

		this.updateMapFromState();

		this.controls.finishedAddingControls();
	},

	initialize: function() {
	},

	updateMapFromState: function() {
		console.log('Map> updateMapFromState');
		this.map = new WE.map(this.element.id, {sky: true, atmosphere: true});
		this.map.setView([this.state.center.lat, this.state.center.lng], this.state.zoomLevel);
		WE.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors'
		}).addTo(this.map);
		this.ready = true;
		console.log(this.map);
	},

	load: function(date) {
		this.updateMapFromState();
		this.refresh(date);
	},

	draw: function(date) {
		if (this.ready) {
			// Make it rotate
			var c = this.map.getPosition();
			c[1] += 3.0 * this.dt;
			this.map.setCenter([c[0], c[1]]);
		}
	},

	resize: function(date) {
		// Update the size of the internal canvas
		this.map.canvas.width  = this.element.clientWidth;
		this.map.canvas.height = this.element.clientHeight;
		// redraw
		this.refresh(date);
	},

	updateCenter: function() {
		// var c = this.map.getCenter();
		// this.state.center = {lat:c.lat(), lng:c.lng()};
	},

	quit: function() {
		// Make sure to delete timers when quitting the app
	},

	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			// this.refresh(date);
		} else if (eventType === "pointerMove" && this.dragging) {
			// this.refresh(date);
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			// this.refresh(date);
		} else if (eventType === "pointerScroll") {
			// Scroll events for zoom
			this.scrollAmount += data.wheelDelta;

			if (this.scrollAmount >= 128) {
				// zoom out
			} else if (this.scrollAmount <= -128) {
				// zoom in
			}
			this.refresh(date);
		} else if (eventType === "keyboard") {
			if (data.character === "m") {
				// pressed m key
			}
			this.refresh(date);
		} else if (eventType === "specialKey") {
			if (data.code === 18 && data.state === "down") {      // alt
				// zoom in
			} else if (data.code === 17 && data.state === "down") { // control
				// zoom out
			} else if (data.code === 37 && data.state === "down") { // left
			} else if (data.code === 38 && data.state === "down") { // up
			} else if (data.code === 39 && data.state === "down") { // right
			} else if (data.code === 40 && data.state === "down") { // down
			}
			this.refresh(date);
		}
	}
});

