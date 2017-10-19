//
// SAGE2 application: JupyterLab
// by: Andrew Burks <andrewtburks@gmail.com>
//
// Copyright (c) 2015
//

"use strict";

/* global  */

var JupyterLab = SAGE2_App.extend({
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);
		// Set the DOM id
		this.element.id = "div_" + data.id;
		// Set the background to black
		this.element.style.backgroundColor = 'black';

		// add image holder
		this.img = document.createElement("img");
		this.img.style.width = this.width + "px";
		this.img.style.height = this.height + "px";
		// this.img.style.width = "100%";
		// this.img.style.height = "100%";
		this.img.style.backgroundColor = "white";

		this.element.appendChild(this.img);

		// move and resize callbacks
		this.resizeEvents = "continuous"; // onfinish
		// this.moveEvents   = "continuous";
		// this.resize = "fixed";

		// SAGE2 Application Settings
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;
	},

	load: function(date) {
		console.log('JupyterLab> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
		console.log('JupyterLab> Draw with state value', this.state.value);
	},

	updateContent: function (data, date) {
		// update title with nb/cell name
		this.updateTitle("JupyterLab Cell - " + data.title);

		// calculate new size
		let newAspect = data.width / data.height;

		console.log(this.sage2_width, this.sage2_height);
		console.log(data.width, data.height);

		if (newAspect > this.imgAspect) { // wider
			this.sendResize(this.sage2_height * newAspect, this.sage2_height);
		} else { // taller
			this.sendResize(this.sage2_width, this.sage2_width / newAspect);
		}

		console.log(this, this.sage2_width, this.sage2_height);

		this.img.src = data.src; // update image contents
		this.img.style.width = this.sage2_width;
		this.img.style.height = this.sage2_height;

		// this.sendResize(data.width, data.height);
		this.imgAspect = newAspect;
	},

	resize: function(date) {
		// Called when window is resized
		this.img.style.width = this.sage2_width + "px";
		this.img.style.height = this.sage2_height + "px";

		// this.refresh(date);
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
		} else if (eventType === "dataUpdate") {
			console.log("JupyterLab Data Update", data);

			this.updateContent(data, date);
			// this.refresh(date);
		}
	}
});
