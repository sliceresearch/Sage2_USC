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

/* global OpenSeadragon */

var zoom = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous";

		this.element.id = "div" + data.id;
		this.element.style.background = "black";

		this.lastZoom  = data.date;
		this.lastClick = data.date;
		this.dragging  = false;
		this.isShift   = false;
		this.position  = {x: 0, y: 0};
		this.title     = data.title;

		this.scrollAmount = 0;

		var dataset;
		// Is it loaded from an asset or as an application
		if (data.state.file && data.state.file.length > 0) {
			dataset = data.state.file;
		} else {
			dataset = this.resrcPath + "enceladus.dzi";
		}

		// create the image viewer with the right data and path
		this.viewer = OpenSeadragon({
			// suppporting div
			id: this.element.id,
			// icons for the library
			prefixUrl: this.resrcPath + "/images/",
			// show the little overview window (auto-hides)
			showNavigator: true,
			// remove the navigation button bar
			showNavigationControl: false,

			// change tileSources for your dataset
			tileSources: dataset
			// tileSources: this.resrcPath + "enceladus.dzi"
			// tileSources: this.resrcPath + "ratbrain.dzi"
			// tileSources: "http://sage2rtt.evl.uic.edu:3000/ratbrain.dzi"
		});

		// Handler when dataset is loaded
		var _this = this;
		this.viewer.addHandler('open', function(event) {
			var info = _this.viewer.source.width.toLocaleString() + " x "
				+ _this.viewer.source.height.toLocaleString() + " pixels";
			var parts = dataset.split('/');
			var newTitle  = _this.title + ": " + parts[parts.length - 1] + " " + info;
			_this.updateTitle(newTitle);
		});

		this.controls.addButton({type: "prev", position: 1, identifier: "Left"});
		this.controls.addButton({type: "next", position: 7, identifier: "Right"});
		this.controls.addButton({type: "up-arrow", position: 4, identifier: "Up"});
		this.controls.addButton({type: "down-arrow", position: 10, identifier: "Down"});
		this.controls.addButton({type: "zoom-in", position: 12, identifier: "ZoomIn"});
		this.controls.addButton({type: "zoom-out", position: 11, identifier: "ZoomOut"});
		this.controls.finishedAddingControls();
	},

	load: function(date) {
	},

	draw: function(date) {
	},

	resize: function(date) {
		this.refresh(date);
	},

	resetView: function(obj) {
		// reset the view to origin viewport
		this.viewer.viewport.fitBounds(this.viewer.viewport.getHomeBounds());
	},

	zoomAllIn: function(obj) {
		// Maximum zoom
		this.viewer.viewport.zoomTo(this.viewer.viewport.getMaxZoom());
	},

	getContextEntries: function() {
		var entries = [];
		var entry   = {};

		entry = {};
		entry.description = "Reset view";
		entry.callback = "resetView";
		entry.parameters = {};
		entries.push(entry);

		entry = {};
		entry.description = "Maximum zoom";
		entry.callback = "zoomAllIn";
		entry.parameters = {};
		entries.push(entry);

		entries.push({description: "separator"});

		return entries;
	},

	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			if ((date - this.lastClick) < 350) {
				// double click
				if (this.isShift) {
					this.viewer.viewport.zoomBy(0.6);
				} else {
					this.viewer.viewport.zoomBy(1.4);
				}
				this.viewer.viewport.applyConstraints();
				this.lastZoom = date;
			} else {
				// not a double clikc
				this.dragging = true;
			}
			// keep values up to date
			this.position.x = position.x;
			this.position.y = position.y;
			this.lastClick  = date;
		} else if (eventType === "pointerMove" && this.dragging) {
			var delta = new OpenSeadragon.Point(this.position.x - position.x, this.position.y - position.y);
			this.viewer.viewport.panBy(this.viewer.viewport.deltaPointsFromPixels(delta));
			this.position.x = position.x;
			this.position.y = position.y;
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			this.dragging = false;
			this.position.x = position.x;
			this.position.y = position.y;
		} else if (eventType === "pointerScroll") {
			// Scroll events for zoom
			this.scrollAmount += data.wheelDelta;

			if (this.scrollAmount >= 24) {
				// zoom out
				this.viewer.viewport.zoomBy(0.9);
				this.viewer.viewport.applyConstraints();
				this.scrollAmount = 0;
			} else if (this.scrollAmount <= -24) {
				// zoom in
				this.viewer.viewport.zoomBy(1.1);
				this.viewer.viewport.applyConstraints();
				this.scrollAmount = 0;
			}
		} else if (eventType === "specialKey") {
			if (data.status && data.status.SHIFT) {
				// Shift key
				this.isShift = true;
			} else {
				this.isShift = false;
			}
			if (data.code === 37 && data.state === "down") {
				// left
				this.viewer.viewport.panBy(new OpenSeadragon.Point(-0.01, 0));
				this.viewer.viewport.applyConstraints();
			} else if (data.code === 38 && data.state === "down") {
				// up
				this.viewer.viewport.panBy(new OpenSeadragon.Point(0, -0.01));
				this.viewer.viewport.applyConstraints();
			} else if (data.code === 39 && data.state === "down") {
				// right
				this.viewer.viewport.panBy(new OpenSeadragon.Point(0.01, 0));
				this.viewer.viewport.applyConstraints();
			} else if (data.code === 40 && data.state === "down") {
				// down
				this.viewer.viewport.panBy(new OpenSeadragon.Point(0, 0.01));
				this.viewer.viewport.applyConstraints();
			} else if (data.code === 189 && !this.isShift && data.state === "down") {
				// - minus
				this.viewer.viewport.zoomBy(0.9);
				this.lastZoom = date;
			} else if (data.code === 187 && this.isShift && data.state === "down") {
				// + plus
				this.viewer.viewport.zoomBy(1.1);
				this.lastZoom = date;
			}
		} else if (eventType === "widgetEvent") {
			switch (data.identifier) {
				case "Up":
					// up
					this.viewer.viewport.panBy(new OpenSeadragon.Point(0, -0.01));
					break;
				case "Down":
					// down
					this.viewer.viewport.panBy(new OpenSeadragon.Point(0, 0.01));
					break;
				case "Left":
					// left
					this.viewer.viewport.panBy(new OpenSeadragon.Point(-0.01, 0));
					break;
				case "Right":
					// right
					this.viewer.viewport.panBy(new OpenSeadragon.Point(0.01, 0));
					break;
				case "ZoomIn":
					// zoom in
					this.viewer.viewport.zoomBy(1.1);
					this.lastZoom = date;
					break;
				case "ZoomOut":
					// zoom out
					this.viewer.viewport.zoomBy(0.9);
					this.lastZoom = date;
					break;
				default:
					console.log("No handler for:", data.identifier);
					return;
			}
			this.viewer.viewport.applyConstraints();
		}
		this.refresh(date);
	}
});


