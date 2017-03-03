//
// SAGE2 application: Webview
// by: Luc Renambot <renambot@gmail.com>
//
// Copyright (c) 2015-16
//

"use strict";

/* global  */

var Webview = SAGE2_App.extend({
	init: function(data) {
		if (this.isElectron()) {
			// Create div into the DOM
			this.SAGE2Init("webview", data);
			// Create a layer for the console
			this.createLayer("rgba(0,0,0,0.85)");
			// clip the overflow
			this.layer.style.overflow = "hidden";
			// create a text box
			this.pre = document.createElement('pre');
			// allow text to wrap inside the box
			this.pre.style.whiteSpace = "pre-wrap";
			// Add it to the layer
			this.layer.appendChild(this.pre);
			this.console = false;
			// add the preload clause
			// this.element.preload = this.resrcPath + "SAGE2_script_supplement.js";
		} else {
			// Create div into the DOM
			this.SAGE2Init("div", data);
			this.element.innerHTML = "<h1>Webview only supported using Electron as a display client</h1>";
		}
		// Set the DOM id
		this.element.id = "div_" + data.id;
		// Set the background to black
		this.element.style.backgroundColor = 'white';

		// move and resize callbacks
		this.resizeEvents = "continuous";
		this.modifiers    = [];

		// not sure
		this.element.style.display = "inline-flex";

		// Webview settings
		this.element.autosize  = "on";
		this.element.plugins   = "on";
		this.element.allowpopups = false;
		this.element.allowfullscreen = false;
		this.element.nodeintegration = 1;
		// disable fullscreen
		this.element.fullscreenable = false;
		this.element.fullscreen = false;

		// this.element.disablewebsecurity = true;

		this.element.minwidth  = data.width;
		this.element.minheight = data.height;

		// Get the URL from parameter or session
		var view_url = data.params || this.state.url;
		var video_id, ampersandPosition;

		// A youtube URL with a 'watch' video
		if (view_url.startsWith('https://www.youtube.com') &&
				view_url.indexOf('embed') === -1 &&
				view_url.indexOf("watch?v=") >= 0) {
			// Search for the Youtube ID
			video_id = view_url.split('v=')[1];
			ampersandPosition = video_id.indexOf('&');
			if (ampersandPosition != -1) {
				video_id = video_id.substring(0, ampersandPosition);
			}
			view_url = 'https://www.youtube.com/embed/' + video_id + '?autoplay=0';
		} else if (view_url.startsWith('https://youtu.be')) {
			// youtube short URL (used in sharing)
			video_id = view_url.split('/').pop();
			view_url = 'https://www.youtube.com/embed/' + video_id + '?autoplay=0';
		} else if (view_url.indexOf('vimeo') >= 0 && view_url.indexOf('player') === -1) {
			// Search for the Vimeo ID
			var m = view_url.match(/^.+vimeo.com\/(.*\/)?([^#\?]*)/);
			var vimeo_id =  m ? m[2] || m[1] : null;
			if (vimeo_id) {
				view_url = 'https://player.vimeo.com/video/' + vimeo_id;
			}
		}
		this.element.src = view_url;

		// Store the zoom level, when in desktop emulation
		this.zoomFactor = 1;
		// Auto-refresh time
		this.autoRefresh = null;

		var _this = this;

		this.element.addEventListener("did-start-loading", function() {
			// Clear the console
			_this.pre.innerHTML = "";
			// update the emulation
			_this.updateMode();
		});

		// done loading
		this.element.addEventListener("did-finish-load", function() {
			// save the url
			_this.state.url = _this.element.src;
			// set the zoom value
			_this.element.setZoomFactor(_this.state.zoom);
			// sync the state object
			_this.SAGE2Sync(false);
			_this.getInjectCodeIfNecessaryThenInject();
			// update the context menu with the current URL
			_this.getFullContextMenuAndUpdate();
		});

		// done loading
		this.element.addEventListener("did-fail-load", function(event) {
			if (event.errorCode === -3 ||
				event.errorCode === -501 ||
				event.errorDescription === "OK") {
				// it's a redirect
				// _this.changeURL(event.validatedURL, false);
				// nope
			} else {
				// real error
				_this.element.src = 'data:text/html;charset=utf-8,<h1>Invalid URL</h1>';
				_this.updateTitle('Webview');
			}
		});

		// When the page changes its title
		this.element.addEventListener("page-title-updated", function(event) {
			_this.updateTitle('Webview: ' + event.title);
		});

		// When the page request fullscreen
		this.element.addEventListener("enter-html-full-screen", function(event) {
			console.log('Webview>	Enter fullscreen');
			// not sure if this works
			event.preventDefault();
		});
		this.element.addEventListener("leave-html-full-screen", function(event) {
			console.log('Webview>	Leave fullscreen');
			// not sure if this works
			event.preventDefault();
		});

		// Emitted when page receives favicon urls
		this.element.addEventListener("page-favicon-updated", function(event) {
			console.log('Webview>	page-favicon-updated', event.favicons, event.favicons[0]);
			if (event.favicons && event.favicons[0]) {
				_this.state.favicon = event.favicons[0];
				// sync the state object
				_this.SAGE2Sync(false);
			}
		});

		// Console message from the embedded page
		this.element.addEventListener('console-message', function(event) {
			console.log('Webview>	console:', event.message);
			// Add the message to the console layer
			_this.pre.innerHTML += 'Webview> ' + event.message + '\n';
		});

		// When the webview tries to open a new window
		this.element.addEventListener("new-window", function(event) {
			// only accept http protocols
			if (event.url.startsWith('http:') || event.url.startsWith('https:')) {
				_this.changeURL(event.url, false);
			} else {
				console.log('Webview>	Not http URL, not opening', event.url);
			}
		});

		// erase me, this is mainly for testing, but if it works out, maybe not necessary
		// testing data send back.
		this.element.addEventListener("ipc-message",function(event){
		    console.log(event);
		    if (typeof event === "object") {
		    	console.log("Detected an object");
		    	console.dir(event);
		    }
		});
	},

	/**
	 * Determines if electron is the renderer (instead of a browser)
	 *
	 * @method     isElectron
	 * @return     {Boolean}  True if electron, False otherwise.
	 */
	isElectron: function() {
		return (typeof window !== 'undefined' && window.process && window.process.type === "renderer");
	},

	load: function(date) {
		// sync the change
		this.element.src = this.state.url;
		this.updateMode();
		this.refresh(date);
	},

	draw: function(date) {
	},

	changeURL: function(newlocation, remoteSync) {
		// trigger the change
		this.element.src = newlocation;
		// save the url
		this.state.url   = newlocation;
		this.SAGE2Sync(remoteSync);
	},

	updateMode: function() {
		var content;
		if (this.isElectron()) {

			if (this.state.mode === "mobile") {
				content = this.element.getWebContents();
				content.enableDeviceEmulation({
					screenPosition: "mobile",
					fitToView: true
				});
			}

			if (this.state.mode === "desktop") {
				content = this.element.getWebContents();
				content.enableDeviceEmulation({
					screenPosition: "desktop",
					deviceScaleFactor: 0,
					fitToView: false
				});
			}
		}
	},

	resize: function(date) {
		// Called when window is resized
		this.element.style.width  = this.sage2_width  + "px";
		this.element.style.height = this.sage2_height + "px";

		// resize the console layer
		if (this.layer) {
			// make sure the layer exist first
			this.layer.style.width  = this.element.style.width;
			this.layer.style.height = this.element.style.height;
		}
		this.refresh(date);
	},

	quit: function() {
		if (this.autoRefresh) {
			// cancel the autoreload timer
			clearInterval(this.autoRefresh);
		}
	},

	sendAlertCode: function() {
		this.element.executeJavaScript(
			"alert('where is this and or does it work?')",
			false,
			function() {
				console.log("sendAlertCode callback initiated");
			}
		);
	},

	/*
		Checks if already collected data from file.
		If not,
			Uses xhr to access file
	*/
	getInjectCodeIfNecessaryThenInject: function() {
		if(this.codeToInject === undefined || this.codeToInject === null) {
			var _this = this;
			var xhr = new XMLHttpRequest();
			xhr.open("GET", this.resrcPath + "SAGE2_script_supplement.js", true);
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4 && xhr.status === 200) { // done and done
					_this.codeToInject = xhr.responseText;
					if (_this.codeToInject.indexOf("//") !== -1) {
						console.log("Webview> Warning, script supplement contains // comment which may break it");
					}
					_this.codeInject();
				}
			};
			xhr.send();
			return;
		} else {
			this.codeInject();
		}
	},

	/*
		This should be called from getInjectCodeIfNecessaryThenInject().
		It will be called in line if the code was already retrieved.
	*/
	codeInject: function() {
		this.element.executeJavaScript(this.codeToInject);
	},

	getContextEntries: function() {
		var entries = [];
		var entry;

		entry = {};
		entry.description = "Back";
		entry.accelerator = "Alt \u2190";     // ALT <-
		entry.callback = "navigation";
		entry.parameters = {};
		entry.parameters.action = "back";
		entries.push(entry);

		entry = {};
		entry.description = "Forward";
		entry.accelerator = "Alt \u2192";     // ALT ->
		entry.callback = "navigation";
		entry.parameters = {};
		entry.parameters.action = "forward";
		entries.push(entry);

		entry = {};
		entry.description = "Reload";
		entry.accelerator = "Alt R";         // ALT r
		entry.callback = "reloadPage";
		entry.parameters = {};
		entries.push(entry);

		entry = {};
		entry.description = "Auto refresh (5min)";
		entry.callback = "reloadPage";
		entry.parameters = {time: 5 * 60};
		entries.push(entry);

		entries.push({description: "separator"});

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
		entry.description = "Show/Hide the console";
		entry.callback = "showConsole";
		entry.parameters = {};
		entries.push(entry);

		entries.push({description: "separator"});

		entry = {};
		entry.description = "Zoom in";
		entry.accelerator = "Alt \u2191";     // ALT up-arrow
		entry.callback = "zoomPage";
		entry.parameters = {};
		entry.parameters.dir = "zoomin";
		entries.push(entry);

		entry = {};
		entry.description = "Zoom out";
		entry.accelerator = "Alt \u2193";     // ALT down-arrow
		entry.callback = "zoomPage";
		entry.parameters = {};
		entry.parameters.dir = "zoomout";
		entries.push(entry);

		entries.push({description: "separator"});

		entry   = {};
		// label of them menu
		entry.description = "Type a URL:";
		// callback
		entry.callback = "navigation";
		// input setting
		entry.inputField = true;
		// set the value to the current URL
		entry.value = this.element.src;
		entry.inputFieldSize = 20;
		entry.inputDefault   = this.state.url;
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

		entries.push({
			description: "Copy URL to clipboard",
			callback: "SAGE2_copyURL",
			parameters: {
				url: this.state.url
			}
		});


		// erase me, these are just for testing data pass back
		entries.push({
			description: "Webview talk back: count tags",
			callback: "testWebviewTalkBack",
			parameters: {
				type: "getDataFromWebview"
			}
		});
		// erase me, these are just for testing data pass back
		entries.push({
			description: "Webview talk back: what is location",
			callback: "testWebviewTalkBack",
			parameters: {
				type: "whereAmI"
			}
		});
		// erase me, these are just for testing data pass back
		entries.push({
			description: "Webview talk back: give back object",
			callback: "testWebviewTalkBack",
			parameters: {
				type: "objectRetrievalTest"
			}
		});

		// entries.push({description: "separator"});

		return entries;
	},

	// erase me, just for testing data passing
	testWebviewTalkBack: function(responseObject) {
		this.element.send(responseObject.type, "div");
	},


	/**
	 * Reload the content of the webview
	 *
	 * @method     reloadPage
	 * @param      {Object}  responseObject  if time parameter passed, used as a timer
	 */
	reloadPage: function(responseObject) {
		if (this.isElectron()) {
			if (responseObject.time) {
				// if an argument passed, use it for timer
				if (isMaster) {
					// Parse the value we got
					var interval = parseInt(responseObject.time, 10) * 1000;
					var _this = this;
					// build the timer
					this.autoRefresh = setInterval(function() {
						// send the message to the server to relay
						_this.broadcast("reloadPage", {});
					}, interval);
				}
			} else {
				// Just reload once
				this.element.reload();
				this.element.setZoomFactor(this.state.zoom);
			}
		}
	},

	showConsole: function(responseObject) {
		if (this.isElectron()) {
			if (this.console) {
				this.hideLayer();
				this.console = false;
			} else {
				this.showLayer();
				this.console = true;
			}
		}
	},

	navigation: function(responseObject) {
		if (this.isElectron) {
			var action = responseObject.action;
			if (action === "back") {
				this.element.goBack();
			} else if (action === "forward") {
				this.element.goForward();
			} else if (action === "address") {
				if ((responseObject.clientInput.indexOf("://") === -1) &&
					!responseObject.clientInput.startsWith("/")) {
					responseObject.clientInput = "http://" + responseObject.clientInput;
				}
				this.changeURL(responseObject.clientInput, true);
			} else if (action === "search") {
				this.changeURL('https://www.google.com/#q=' + responseObject.clientInput, true);
			}
		}
	},

	zoomPage: function(responseObject) {
		if (this.isElectron()) {
			var dir = responseObject.dir;

			// zoomin
			if (dir === "zoomin") {
				this.state.zoom *= 1.50;
				this.element.setZoomFactor(this.state.zoom);
			}

			// zoomout
			if (dir === "zoomout") {
				this.state.zoom /= 1.50;
				this.element.setZoomFactor(this.state.zoom);
			}

			this.refresh();
		}
	},

	changeMode: function(responseObject) {
		if (this.isElectron()) {
			this.state.mode = responseObject.mode;
			this.updateMode();
			this.refresh();
		}
	},

	event: function(eventType, position, user_id, data, date) {
		if (this.isElectron()) {
			// Making Integer values, seems to be required by sendInputEvent
			var x = Math.round(position.x);
			var y = Math.round(position.y);
			var _this = this;

			if (eventType === "pointerPress") {
				// click
				this.element.sendInputEvent({
					type: "mouseDown",
					x: x, y: y,
					button: data.button,
					modifiers: this.modifiers,
					clickCount: 1
				});
			} else if (eventType === "pointerMove") {
				// move
				this.element.sendInputEvent({
					type: "mouseMove",
					modifiers: this.modifiers,
					x: x, y: y
				});
			} else if (eventType === "pointerRelease") {
				// click release
				this.element.sendInputEvent({
					type: "mouseUp",
					x: x, y: y,
					button: data.button,
					modifiers: this.modifiers,
					clickCount: 1
				});
			} else if (eventType === "pointerScroll") {
				// Scroll events: reverse the amount to get correct direction
				this.element.sendInputEvent({
					type: "mouseWheel",
					deltaX: 0, deltaY: -1 * data.wheelDelta,
					x: 0, y: 0,
					modifiers: this.modifiers,
					canScroll: true
				});
			} else if (eventType === "widgetEvent") {
				// widget events
			} else if (eventType === "keyboard") {
				this.element.sendInputEvent({
					// type: "keyDown",
					// Not sure why we need 'char' but it works ! -- Luc
					type: "char",
					keyCode: data.character
				});
				setTimeout(function() {
					_this.element.sendInputEvent({
						type: "keyUp",
						keyCode: data.character
					});
				}, 0);
			} else if (eventType === "specialKey") {
				// clear the array
				this.modifiers = [];
				// store the modifiers values
				if (data.status && data.status.SHIFT) {
					this.modifiers.push("shift");
				}
				if (data.status && data.status.CTRL) {
					this.modifiers.push("control");
				}
				if (data.status && data.status.ALT) {
					this.modifiers.push("alt");
				}
				if (data.status && data.status.CMD) {
					this.modifiers.push("meta");
				}
				if (data.status && data.status.CAPS) {
					this.modifiers.push("capsLock");
				}

				// SHIFT key
				if (data.code === 16) {
					if (data.state === "down") {
						this.element.sendInputEvent({
							type: "keyDown",
							keyCode: "Shift"
						});
					} else {
						this.element.sendInputEvent({
							type: "keyUp",
							keyCode: "Shift"
						});
					}
				}
				// backspace key
				if (data.code === 8 || data.code === 46) {
					if (data.state === "down") {
						// The delete is too quick potentially.
						// Currently only allow on keyup have finer control
					} else {
						this.element.sendInputEvent({
							type: "keyUp",
							keyCode: "Backspace"
						});
					}
				}

				if (data.code === 37 && data.state === "down") {
					// arrow left
					if (data.status.ALT) {
						// navigate back
						this.element.goBack();
					}
					this.refresh(date);
				} else if (data.code === 38 && data.state === "down") {
					// arrow up
					if (data.status.ALT) {
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
				} else if (data.code === 82 && data.state === "down") {
					// r key
					if (data.status.ALT) {
						// ALT-r reloads
						this.reloadPage({});
					}
					this.refresh(date);
				} else if (data.code === 39 && data.state === "down") {
					// arrow right
					if (data.status.ALT) {
						// navigate forward
						this.element.goForward();
					}
					this.refresh(date);
				} else if (data.code === 40 && data.state === "down") {
					// arrow down
					if (data.status.ALT) {
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
	}
});
