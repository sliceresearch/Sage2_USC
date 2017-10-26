//
// SAGE2 application: Webview
// by: Luc Renambot <renambot@gmail.com>
//
// Copyright (c) 2015-16
//

"use strict";

/* global  require */

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

		// Content type: web, youtube, ..
		this.contentType = "web";
		// Muted audio or not, only on isMaster node
		this.isMuted = false;
		// Is the page loading
		this.isLoading = false;

		// not sure
		this.element.style.display = "inline-flex";

		// Webview settings
		this.element.autosize  = "on";
		this.element.plugins   = "on";
		this.element.allowpopups = false;
		this.element.allowfullscreen = false;
		// turn off nodejs intergration for now
		this.element.nodeintegration = 0;
		// disable fullscreen
		this.element.fullscreenable = false;
		this.element.fullscreen = false;
		// add the preload clause
		this.addPreloadFile();
		// security or not: this seems to be an issue often on Windows
		this.element.disablewebsecurity = false;

		// Set a session per webview, so not zoom sharing per origin
		this.element.partition = data.id;

		// initial size
		this.element.minwidth  = data.width;
		this.element.minheight = data.height;

		// Default title
		this.title = "Webview";

		// Get the URL from parameter or session
		var view_url = data.params || this.state.file || this.state.url;
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
			this.contentType = "youtube";
		} else if (view_url.startsWith('https://youtu.be')) {
			// youtube short URL (used in sharing)
			video_id = view_url.split('/').pop();
			view_url = 'https://www.youtube.com/embed/' + video_id + '?autoplay=0';
			this.contentType = "youtube";
		} else if (view_url.indexOf('vimeo') >= 0) {
			// Search for the Vimeo ID
			var m = view_url.match(/^.+vimeo.com\/(.*\/)?([^#?]*)/);
			var vimeo_id =  m ? m[2] || m[1] : null;
			if (vimeo_id) {
				view_url = 'https://player.vimeo.com/video/' + vimeo_id;
			}
			this.contentType = "vimeo";
		} else if (view_url.endsWith('.ipynb')) {
			// ipython notebook file are link to nbviewer.jupyter.org online
			var host = this.config.host + ':' + this.config.port;
			view_url = "https://nbviewer.jupyter.org/url/" + host + view_url;
			this.contentType = "ipython";
		} else if (view_url.indexOf('twitch.tv') >= 0) {
			// Twitch video from:
			//    https://go.twitch.tv/videos/180266596
			// to embedded:
			//    https://player.twitch.tv/?!autoplay&video=v180266596

			// Search for the Twitch ID
			var tw = view_url.match(/^.+twitch.tv\/(.*\/)?([^#?]*)/);
			var twitch_id =  tw ? tw[2] || tw[1] : null;
			if (twitch_id) {
				view_url = 'https://player.twitch.tv/?!autoplay&video=v' + twitch_id;
			}
			this.contentType = "twitch";
		} else if (view_url.indexOf('docs.google.com/presentation') >= 0) {
			this.contentType = "google_slides";
		}

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
			_this.isLoading = true;
			_this.changeWebviewTitle();
		});

		// Intent to navigate: allows quick sync when the webview is shared
		this.element.addEventListener("will-navigate", function(evt) {
			// save the url
			_this.state.url = evt.url;
			// set the zoom value
			_this.element.setZoomFactor(_this.state.zoom);
			// sync the state object
			_this.SAGE2Sync(true);
		});

		// done loading
		this.element.addEventListener("did-finish-load", function() {
			// code injection to support key translation
			_this.codeInject();
			// update the context menu with the current URL
			_this.getFullContextMenuAndUpdate();
			_this.isLoading = false;
			_this.changeWebviewTitle();
		});

		// To handle navigation whithin the page (ie. anchors)
		this.element.addEventListener("did-navigate-in-page", function(evt) {
			// save the url
			_this.state.url = evt.url;
			// set the zoom value
			_this.element.setZoomFactor(_this.state.zoom);
			// sync the state object
			_this.SAGE2Sync(true);
		});

		// To handle navigation with history: back and forward
		this.element.addEventListener("did-navigate", function(evt) {
			// save the url
			_this.state.url = evt.url;
			// set the zoom value
			_this.element.setZoomFactor(_this.state.zoom);
			// sync the state object
			_this.SAGE2Sync(true);
		});

		// Error loading a page
		// Source: https://cs.chromium.org/chromium/src/net/base/net_error_list.h
		//
		// ABORTED -3
		// An operation was aborted (due to user action).
		// BLOCKED_BY_RESPONSE -27
		// The request failed because the response was delivered along with requirements
		// which are not met ('X-Frame-Options' and 'Content-Security-Policy' ancestor
		// checks, for instance).
		// INSECURE_RESPONSE -501
		// The server's response was insecure (e.g. there was a cert error).

		this.element.addEventListener("did-fail-load", function(event) {
			// not loading anymore
			_this.isLoading = false;
			// Check the return code
			if (event.errorCode ===   -3 ||
				event.errorCode ===  -27 ||
				event.errorCode === -501 ||
				event.errorDescription === "OK") {
				// it's a redirect (causes issues)
				// _this.changeURL(event.validatedURL, true);
			} else {
				// real error
				_this.element.src = 'data:text/html;charset=utf-8,<h1>Invalid URL</h1>';
				_this.changeWebviewTitle();
			}
		});

		// When the page changes its title
		this.element.addEventListener("page-title-updated", function(event) {
			_this.changeWebviewTitle(event.title);
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

		// When the webview tries to open a new window, for insance with ALT-click
		this.element.addEventListener("new-window", function(event) {
			// only accept http protocols
			if (event.url.startsWith('http:') || event.url.startsWith('https:')) {
				// Do not open a new view, just navigate to the new URL
				_this.changeURL(event.url, true);
				// Request a new webview application
				// wsio.emit('openNewWebpage', {
				// 	// should be uniqueID, but no interactor object here
				// 	id: this.id,
				// 	// send the new URL
				// 	url: event.url
				// });
			} else {
				console.log('Webview>	Not a HTTP URL, not opening [', event.url, ']', event);
			}
		});

		// Set the URL and starts loading
		this.element.src = view_url;
	},

	/**
	 * Change the title of the window
	 *
	 * @method     changeWebviewTitle
	 * @param newtitle {String} new title
	 */
	changeWebviewTitle: function(newtitle) {
		if (newtitle) {
			// if parameter passed, we update the title
			this.title = 'Webview: ' + newtitle;
		}
		var newtext = this.title;
		// if the page has a reload timer
		if (this.autoRefresh) {
			// add a timer using a FontAwsome character
			newtext += ' <i class="fa">\u{f017}</i>';
		}
		// if the page is loading
		if (this.isLoading && this.contentType === "web") {
			// add a spinner using a FontAwsome character
			newtext += ' <i class="fa fa-spinner fa-spin"></i>';
		}
		// call the base class method
		this.updateTitle(newtext);
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

	/**
	 * Loads the components to do a file preload on a webpage.
	 * Needs to be within an Electron browser to work.
	 *
	 * @method     addPreloadFile
	 */
	addPreloadFile: function() {
		if (!this.isElectron()) {
			return; // return if not electron.
		}
		// if it's not running inside Electron, do not bother
		if (!this.isElectron) {
			return;
		}
		// load the nodejs path module
		var path = require("path");
		// access the remote electron process
		var app = require("electron").remote.app;
		// get the application path
		var appPath = app.getAppPath();
		// split the path at node_modules
		var subPath = appPath.split("node_modules");
		// take the first element which contains the current folder of the application
		var rootPath = subPath[0];
		// add the relative path to the webview folder
		var preloadPath = path.join(rootPath, 'public/uploads/apps/Webview', 'SAGE2_script_supplement.js');
		// finally make it a local URL and pass it to the webview element
		this.element.preload = "file://" + preloadPath;
	},

	// Sync event when shared
	load: function(date) {
		// only update if page changed.
		if (this.element.src != this.state.url) {
			// sync the change
			this.element.src = this.state.url;
			this.updateMode();
			this.refresh(date);
		}
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
		Called after each page load, currentl prevents the lock from input focus.
	*/
	codeInject: function() {
		// Disabling text selection in page because it blocks the view sometimes
		// done by injecting some CSS code
		// Also disabling grab and drag events
		this.element.insertCSS(":not(input):not(textarea), " +
			":not(input):not(textarea)::after, " +
			":not(input):not(textarea)::before { " +
				"-webkit-user-select: none; " +
				"user-select: none; " +
				"cursor: default; " +
				"-webkit-user-drag: none;" +
				"-moz-user-drag: none;" +
				"user-drag: none;" +
			"} " +
			"input, button, textarea, :focus { " +
				"outline: none; " +
			"}");
	},


	playPause: function(act) {
		if (this.contentType === "youtube") {
			// Simulate a mouse click
			this.element.sendInputEvent({
				type: "mouseDown",
				x: 10, y: 10,
				button: "left",
				modifiers: null,
				clickCount: 1
			});
			this.element.sendInputEvent({
				type: "mouseUp",
				x: 10, y: 10,
				button: "left",
				modifiers: null,
				clickCount: 1
			});
		} else if (this.contentType === "vimeo" || this.contentType === "twitch") {
			// Simulate a spacebar
			this.element.sendInputEvent({
				type: "char",
				keyCode: ' '
			});
		}
	},

	startPresentation: function(act) {
		var _this = this;
		if (this.contentType === "google_slides") {
			// Simulate a start of presentation CMD-Enter on Mac,
			// Ctrl-F5 on Windows
			var os = require('os').platform();
			if (os === "darwin") {
				// Cmd-Enter
				this.element.sendInputEvent({
					type: "keyDown",
					keyCode: "Enter",
					modifiers: ["Command"]
				});
			} else {
				// Ctrl-F5
				this.element.sendInputEvent({
					type: "keyDown",
					keyCode: "F5",
					modifiers: ["Control"]
				});
			}
			setTimeout(function() {
				_this.element.sendInputEvent({
					type: "keyUp",
					keyCode: "Enter",
					modifiers: null
				});
			}, 100);
		}
	},

	sendESC: function(act) {
		var _this = this;
		if (this.contentType === "google_slides") {
			// Simulate a start of presentation CMD-Enter
			this.element.sendInputEvent({
				type: "keyDown",
				keyCode: "Escape",
				modifiers: null
			});
			setTimeout(function() {
				_this.element.sendInputEvent({
					type: "keyUp",
					keyCode: "Escape",
					modifiers: null
				});
			}, 100);
		}
	},

	muteUnmute: function(act) {
		if (isMaster) {
			var content = this.element.getWebContents();
			if (this.isMuted) {
				content.setAudioMuted(false);
				this.isMuted = false;
			} else {
				content.setAudioMuted(true);
				this.isMuted = true;
			}
		} else {
			// Always muted on non-master display client
			content.setAudioMuted(true);
		}
	},

	getContextEntries: function() {
		var entries = [];
		var entry;

		if (this.contentType === "youtube" ||
			this.contentType === "vimeo" ||
			this.contentType === "twitch") {
			entry = {};
			entry.description = "Play/Pause";
			entry.accelerator = "P";
			entry.callback = "playPause";
			entry.parameters = {};
			entries.push(entry);

			entry = {};
			entry.description = "Mute/Unmute";
			entry.accelerator = "M";
			entry.callback = "muteUnmute";
			entry.parameters = {};
			entries.push(entry);

		} else if (this.contentType === "google_slides") {
			entry = {};
			entry.description = "Start Presentation";
			entry.accelerator = "P";
			entry.callback = "startPresentation";
			entry.parameters = {};
			entries.push(entry);

			entry = {};
			entry.description = "Stop Presentation";
			entry.callback = "sendESC";
			entry.parameters = {};
			entries.push(entry);

			// right arrow
			entry = {};
			entry.description = "Next Slide";
			entry.accelerator = "\u2192";     // ->
			entry.callback = "navigation";
			entry.parameters = {};
			entry.parameters.action = "forward";
			entries.push(entry);

			// left arrow
			entry = {};
			entry.description = "Previous Slide";
			entry.accelerator = "\u2190";     // <-
			entry.callback = "navigation";
			entry.parameters = {};
			entry.parameters.action = "back";
			entries.push(entry);
		} else {
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
			entry.description = "Auto Refresh (5min)";
			entry.callback = "reloadPage";
			entry.parameters = {time: 5 * 60};
			entries.push(entry);

			entries.push({description: "separator"});

			entry = {};
			entry.description = "Mobile Emulation";
			entry.callback = "changeMode";
			entry.parameters = {};
			entry.parameters.mode = "mobile";
			entries.push(entry);

			entry = {};
			entry.description = "Desktop Emulation";
			entry.callback = "changeMode";
			entry.parameters = {};
			entry.parameters.mode = "desktop";
			entries.push(entry);

			entry = {};
			entry.description = "Show/Hide Console";
			entry.callback = "showConsole";
			entry.parameters = {};
			entries.push(entry);

			entries.push({description: "separator"});

			entry = {};
			entry.description = "Zoom In";
			entry.accelerator = "Alt \u2191";     // ALT up-arrow
			entry.callback = "zoomPage";
			entry.parameters = {};
			entry.parameters.dir = "zoomin";
			entries.push(entry);

			entry = {};
			entry.description = "Zoom Out";
			entry.accelerator = "Alt \u2193";     // ALT down-arrow
			entry.callback = "zoomPage";
			entry.parameters = {};
			entry.parameters.dir = "zoomout";
			entries.push(entry);

			entries.push({description: "separator"});

			entry   = {};
			// label of them menu
			entry.description = "Type URL:";
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
			entry.description = "Web Search:";
			// callback
			entry.callback = "navigation";
			// input setting
			entry.inputField     = true;
			entry.inputFieldSize = 20;
			// parameters of the callback function
			entry.parameters = {};
			entry.parameters.action = "search";
			entries.push(entry);
		}

		entries.push({
			description: "Type In Page:",
			callback: "sendTextToLastClickedInputField",
			inputField: true,
			inputFieldSize: 20,
			parameters: {}
		});
		entries.push({
			description: "Find:",
			callback: "findInPage",
			inputField: true,
			inputFieldSize: 20,
			parameters: {}
		});

		entries.push({
			description: "Copy URL to Clipboard",
			callback: "SAGE2_copyURL",
			parameters: {
				url: this.state.url
			}
		});

		return entries;
	},

	/**
	 * Will try send text to the focused element within the webview.
	 * Possible that nothing will happen because the focused element doesn't have input.
	 *
	 * @method     sendTextToLastClickedInputField
	 * @param      {Object}  responseObject  uses the clientInput
	 */
	sendTextToLastClickedInputField: function(responseObject) {
		if (responseObject.clientInput && (responseObject.clientInput.length > 0)) {
			this.element.insertText(responseObject.clientInput);

			for (let i = 0; i < responseObject.clientInput.length; i++) {
				this.element.sendInputEvent({ // Not sure why we need 'char' but it works ! -- Luc
					type: "char",
					keyCode: responseObject.clientInput.charAt(i)
				});
			}
		}
	},

	/**
	 * Will try to find in the page.
	 *
	 * @method     findInPage
	 * @param      {Object}  responseObject  uses the clientInput
	 */
	findInPage: function(responseObject) {
		if (responseObject.clientInput && (responseObject.clientInput.length > 0)) {
			this.element.findInPage(responseObject.clientInput);
		}
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
					// change the title to add the spinner
					this.changeWebviewTitle();
				}
			} else {
				// Just reload once
				this.isLoading = true;
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
				if (this.contentType === "google_slides") {
					// send the left arrow key
					this.element.sendInputEvent({
						type: "keyDown",
						keyCode: "Left",
						modifiers: null
					});
				} else {
					// navigate the webview
					this.element.goBack();
				}
			} else if (action === "forward") {
				if (this.contentType === "google_slides") {
					// send the right arrow key
					this.element.sendInputEvent({
						type: "keyDown",
						keyCode: "Right",
						modifiers: null
					});
				} else {
					// navigate the webview
					this.element.goForward();
				}
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
				this.element.focus();

				if (this.contentType === "youtube" ||
					this.contentType === "vimeo"   ||
					this.contentType === "twitch") {
					if (data.character === "m") {
						// m mute
						this.muteUnmute();
						return;
					} else if (data.character === "p") {
						// p play
						this.playPause();
						return;
					}
				}
				if (this.contentType === "google_slides") {
					if (data.character === "p") {
						// p play
						this.startPresentation();
						return;
					} else if (data.character === " ") {
						// send the right arrow key
						this.element.sendInputEvent({
							type: "keyDown",
							keyCode: "Right",
							modifiers: null
						});
						return;
					}
				}

				// send the character event
				this.element.sendInputEvent({
					// type: "keyDown",
					// Not sure why we need 'char' but it works ! -- Luc
					type: "char",
					keyCode: data.character
				});

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
					} else {
						// send the left arrow key
						this.element.sendInputEvent({
							type: "keyDown",
							keyCode: "Left",
							modifiers: null
						});
					}
					this.refresh(date);
				} else if (data.code === 38 && data.state === "down") {
					// arrow up
					if (data.status.ALT) {
						// ALT-up_arrow zooms in
						this.zoomPage({dir: "zoomin"});
					} else {
						this.element.sendInputEvent({
							type: "keyDown",
							keyCode: "Up",
							modifiers: null
						});
					}
					this.refresh(date);
				} else if (data.code === 82 && data.state === "down") {
					// r key
					if (data.status.ALT) {
						// ALT-r reloads
						this.isLoading = true;
						this.reloadPage({});
					}
					this.refresh(date);
				} else if (data.code === 39 && data.state === "down") {
					// arrow right
					if (data.status.ALT) {
						// navigate forward
						this.element.goForward();
					} else {
						// send the right arrow key
						this.element.sendInputEvent({
							type: "keyDown",
							keyCode: "Right",
							modifiers: null
						});
					}
					this.refresh(date);
				} else if (data.code === 40 && data.state === "down") {
					// arrow down
					if (data.status.ALT) {
						// ALT-down_arrow zooms out
						this.zoomPage({dir: "zoomout"});
					} else {
						this.element.sendInputEvent({
							type: "keyDown",
							keyCode: "Down",
							modifiers: null
						});
					}
					this.refresh(date);
				}
			}
		}
	}
});
