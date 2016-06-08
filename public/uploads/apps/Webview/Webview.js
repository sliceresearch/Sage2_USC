//
// SAGE2 application: Webview
// by: Luc Renambot <renambot@gmail.com>
//
// Copyright (c) 2015
//

"use strict";

/* global  */

var Webview = SAGE2_App.extend({
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("webview", data);
		// Set the DOM id
		this.element.id = "div_" + data.id;
		// Set the background to black
		this.element.style.backgroundColor = 'white';

		// move and resize callbacks
		this.resizeEvents = "continuous"; // onfinish
		// this.moveEvents   = "continuous";

		// this.element.style.position = "absolute";
		// this.element.style.left   = 0;
		// this.element.style.top    = 0;
		// this.element.style.height    = data.height;
		console.log('WidthxHeight', this.element.style.width, this.element.style.height);
		console.log('Data', data);

		// not sure
		this.element.style.display = "inline-flex";

		this.element.autosize  = "on";
		this.element.minwidth  = data.width;
		this.element.minheight = data.height;

		// this.element.src = data.params || this.state.url;

		// this.element.src = "https://nytimes.com";
		// this.element.src = "http://bl.ocks.org/mbostock/4060366";
		// this.element.src = "https://docs.google.com/document/u/0/";
		// this.element.src = "http://www.asquare.net/javascript/tests/KeyCode.html";
		// this.element.src = "http://en.key-test.ru/";
		// this.element.src = "https://maps.google.com/";
		// this.element.src = "http://localhost:9292/emperor/index.html";
		// this.element.src = "https://www.evl.uic.edu/aej/TEMPS/megamap.html";
		this.element.src = "https://news.google.com";

		this.zoomFactor = 1;
		this.element.setZoomFactor(this.zoomFactor);

		var _this = this;
		this.element.addEventListener("did-start-loading", function() {
			console.log('Second loading...');
			_this.element.setZoomFactor(_this.zoomFactor);
			// var content = _this.element.getWebContents();
			// content.enableDeviceEmulation({
				// screenPosition: "mobile",
				// fitToView: true
			// });
		});


		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		// this.maxFPS = 2.0;
		// Not adding controls but making the default buttons available
		// this.controls.finishedAddingControls();
		// this.enableControls = true;
	},

	load: function(date) {
		console.log('Webview> Load');
		this.refresh(date);
	},

	draw: function(date) {
		console.log('Webview> Draw');
	},

	resize: function(date) {
		// Called when window is resized
		this.element.style.width  = this.sage2_width  + "px";
		this.element.style.height = this.sage2_height + "px";
		this.refresh(date);
	},

	move: function(date) {
		// Called when window is moved (set moveEvents to continuous)
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	getContextEntries: function() {
		var entries = [];
		var entry;

		entry = {};
		entry.description = "Zoom in";
		entry.callback = "zoomPage";
		entry.parameters = {};
		entry.parameters.dir = "zoomin";
		entries.push(entry);

		entry = {};
		entry.description = "Zoom out";
		entry.callback = "zoomPage";
		entry.parameters = {};
		entry.parameters.dir = "zoomout";
		entries.push(entry);

		entry = {};
		entry.description = "Reload";
		entry.callback = "reloadPage";
		entry.parameters = {};
		entries.push(entry);

		return entries;
	},

	reloadPage: function(responseObject) {
		this.element.reload();
		this.element.setZoomFactor(this.zoomFactor);
	},

	zoomPage: function(responseObject) {
		var dir = responseObject.dir;

		// zoomin
		if (dir === "zoomin") {
			this.zoomFactor *= 1.5;
			this.element.setZoomFactor(this.zoomFactor);
		}

		// zoomout
		if (dir === "zoomout") {
			this.zoomFactor /= 1.5;
			this.element.setZoomFactor(this.zoomFactor);
		}
		console.log('Zoom', this.zoomFactor);
		this.refresh(this.prevDate);
	},

	event: function(eventType, position, user_id, data, date) {
		// Making Integer values, seems to be required by sendInputEvent
		var x = Math.round(position.x);
		var y = Math.round(position.y);
		var _this = this;

		if (eventType === "pointerPress" && (data.button === "left")) {
			// click
			this.element.sendInputEvent({
				type: "mouseDown",
				x: x, y: y,
				button: "left",
				clickCount: 1
			});
			console.log('Sending mouseDown', x, y);
		} else if (eventType === "pointerMove") {
			// move
			this.element.sendInputEvent({
				type: "mouseMove",
				x: x, y: y
			});
			console.log('Sending mouseMove', x, y);
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			// click release
			this.element.sendInputEvent({
				type: "mouseUp",
				x: x, y: y,
				button: "left",
				clickCount: 1
			});
			console.log('Sending mouseUp', x, y);
		} else if (eventType === "pointerScroll") {
			// Scroll events: reverse the amount to get correct direction
			this.element.sendInputEvent({
				type: "mouseWheel",
				deltaX: 0, deltaY: -1 * data.wheelDelta,
				x: 0, y: 0,
				canScroll: true
			});
		} else if (eventType === "widgetEvent") {
			// widget events
		} else if (eventType === "keyboard") {
			console.log('key', data)
			this.element.sendInputEvent({
				type: "keyDown",
				keyCode: data.character
			});
			setTimeout(function() {
				_this.element.sendInputEvent({
					type: "keyUp",
					keyCode: data.character
				});
			}, 0);
		} else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") {
				// left
				this.refresh(date);
			} else if (data.code === 38 && data.state === "down") {
				// up
				// this.zoomFactor *= 1.1;
				// this.element.setZoomFactor(this.zoomFactor);
				this.refresh(date);
			} else if (data.code === 39 && data.state === "down") {
				// right
				this.refresh(date);
			} else if (data.code === 40 && data.state === "down") {
				// down
				// this.zoomFactor /= 1.1;
				// this.element.setZoomFactor(this.zoomFactor);
				this.refresh(date);
			}
		}
	}
});
