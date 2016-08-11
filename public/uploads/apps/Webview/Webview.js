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
		this.resizeEvents = "continuous";

		// not sure
		this.element.style.display = "inline-flex";

		this.element.autosize  = "on";
		this.element.minwidth  = data.width;
		this.element.minheight = data.height;

		// Get the URL from parameter or session
		this.element.src = data.params || this.state.url;

		// State of Shift key
		this.isShift = false;
		// State of Alt key
		this.isAlt   = false;
		// Store the zoom level, when in desktop emulation
		this.zoomFactor = 1;

		var _this = this;

		// reset the zoom at when it starts loading
		this.element.addEventListener("did-start-loading", function() {
			_this.element.setZoomFactor(_this.zoomFactor);
		});

		// done loading
		this.element.addEventListener("did-finish-load", function() {
			// save the url
			_this.state.url = _this.element.src;
			_this.SAGE2Sync(true);
		});

		// done loading
		this.element.addEventListener("did-fail-load", function() {
			_this.element.src = 'data:text/html;charset=utf-8,<h1>Invalid URL</h1>'
			_this.updateTitle('Webview');
		});

		// When the page changes its title
		this.element.addEventListener("page-title-updated", function(event) {
			_this.updateTitle('Webview: ' + event.title);
		});

		// When the webview tries to open a new window
		this.element.addEventListener("new-window", function(event) {
			// only accept http protocols
			if (event.url.startsWith('http:') || event.url.startsWith('https:')) {
				_this.changeURL(event.url);
			}
		});

	},

	load: function(date) {
		this.refresh(date);
	},

	draw: function(date) {
	},

	changeURL: function(newlocation) {
		// trigger the change
		this.element.src = newlocation;
		// save the url
		this.state.url   = newlocation;
		this.SAGE2Sync(true);
	},

	resize: function(date) {
		// Called when window is resized
		this.element.style.width  = this.sage2_width  + "px";
		this.element.style.height = this.sage2_height + "px";
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	getContextEntries: function() {
		var entries = [];
		var entry;

		entry = {};
		entry.description = "Back";
		entry.callback = "navigation";
		entry.parameters = {};
		entry.parameters.action = "back";
		entries.push(entry);

		entry = {};
		entry.description = "Forward";
		entry.callback = "navigation";
		entry.parameters = {};
		entry.parameters.action = "forward";
		entries.push(entry);

		entry = {};
		entry.description = "Reload";
		entry.callback = "reloadPage";
		entry.parameters = {};
		entries.push(entry);

		entry = {};
		entry.description = "separator";
		entries.push(entry);

		entry = {};
		entry.description = "Mobile emulation";
		entry.callback = "changeMode";
		entry.parameters = {};
		entry.parameters.mode = "mobile";
		entries.push(entry);

		entry = {};
		entry.description = "Desktop emulation";
		entry.callback = "changeMode";
		entry.parameters = {};
		entry.parameters.mode = "desktop";
		entries.push(entry);

		entry = {};
		entry.description = "separator";
		entries.push(entry);

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
		entry.description = "separator";
		entries.push(entry);

		entry   = {};
		// label of them menu
		entry.description = "Type a URL:";
		// callback
		entry.callback = "navigation";
		// input setting
		entry.inputField     = true;
		entry.inputFieldSize = 20;
		// parameters of the callback function
		entry.parameters = {};
		entry.parameters.action = "address";
		entries.push(entry);

		entry   = {};
		// label of them menu
		entry.description = "Web search:";
		// callback
		entry.callback = "navigation";
		// input setting
		entry.inputField     = true;
		entry.inputFieldSize = 20;
		// parameters of the callback function
		entry.parameters = {};
		entry.parameters.action = "search";
		entries.push(entry);

		return entries;
	},

	reloadPage: function(responseObject) {
		this.element.reload();
		this.element.setZoomFactor(this.zoomFactor);
	},

	navigation: function(responseObject) {
		var action = responseObject.action;
		if (action === "back") {
			this.element.goBack();
		} else if (action === "forward") {
			this.element.goForward();
		} else if (action === "address") {
			this.changeURL(responseObject.clientInput);
		} else if (action === "search") {
			this.changeURL('https://www.google.com/#q=' + responseObject.clientInput);
		}
	},

	zoomPage: function(responseObject) {
		var dir = responseObject.dir;

		// zoomin
		if (dir === "zoomin") {
			this.zoomFactor *= 1.25;
			this.element.setZoomFactor(this.zoomFactor);
		}

		// zoomout
		if (dir === "zoomout") {
			this.zoomFactor /= 1.25;
			this.element.setZoomFactor(this.zoomFactor);
		}

		this.refresh(this.prevDate);
	},

	changeMode: function(responseObject) {
		var mode = responseObject.mode;

		if (mode === "mobile") {
			this.zoomFactor = 1;
			this.element.setZoomFactor(this.zoomFactor);
			var content = this.element.getWebContents();
			content.enableDeviceEmulation({
				screenPosition: "mobile",
				fitToView: true
			});
		}

		// zoomout
		if (mode === "desktop") {
			this.zoomFactor = 1;
			this.element.setZoomFactor(this.zoomFactor);
			var content = this.element.getWebContents();
			content.enableDeviceEmulation({
				screenPosition: "desktop",
				deviceScaleFactor: 0,
				fitToView: false
			});
		}

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
			// console.log('Sending mouseDown', x, y);
		} else if (eventType === "pointerMove") {
			// move
			this.element.sendInputEvent({
				type: "mouseMove", x: x, y: y
			});
			// console.log('Sending mouseMove', x, y);
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			// click release
			this.element.sendInputEvent({
				type: "mouseUp",
				x: x, y: y,
				button: "left",
				clickCount: 1
			});
			// console.log('Sending mouseUp', x, y);
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
			// SHIFT key
			if (data.code === 16) {
				this.isShift = (data.state === "down");
			}
			// ALT key
			if (data.code === 18) {
				this.isAlt = (data.state === "down");
			}

			if (data.code === 37 && data.state === "down") {
				// arrow left
				if (this.isAlt) {
					// navigate back
					this.element.goBack();
				}
				this.refresh(date);
			} else if (data.code === 38 && data.state === "down") {
				// arrow up
				if (this.isAlt) {
					// ALT-up_arrow zooms in
					this.zoomPage({dir: "zoomin"});
				} else {
					this.element.sendInputEvent({
						type: "mouseWheel",
						deltaX: 0, deltaY: 64,
						x: 0, y: 0,
						canScroll: true
					});
				}
				this.refresh(date);
			} else if (data.code === 39 && data.state === "down") {
				// arrow right
				if (this.isAlt) {
					// navigate forward
					this.element.goForward();
				}
				this.refresh(date);
			} else if (data.code === 40 && data.state === "down") {
				// arrow down
				if (this.isAlt) {
					// ALT-down_arrow zooms out
					this.zoomPage({dir: "zoomout"});
				} else {
					this.element.sendInputEvent({
						type: "mouseWheel",
						deltaX: 0, deltaY: -64,
						x: 0, y: 0,
						canScroll: true
					});
				}
				this.refresh(date);
			}
		}
	}
});
