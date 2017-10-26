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

/**
 * @module client
 * @submodule image_viewer
 */

/**
 * Image viewing application
 *
 * @class image_viewer
 */
var image_viewer = SAGE2_App.extend({

	/**
	* Init method, creates an 'img' tag in the DOM
	*
	* @method init
	* @param data {Object} contains initialization values (id, width, height, state, ...)
	*/
	init: function(data) {
		this.SAGE2Init("img", data);

		this.createLayer("rgba(0,0,0,0.85)");
		this.pre = document.createElement('pre');
		this.layer.appendChild(this.pre);

		// To get position and size updates
		this.resizeEvents = "continuous";
		this.moveEvents   = "continuous";

		// visible
		this.vis = true;

		// old image url
		this.old_img_url = "";

		this.title = data.title;

		this.updateAppFromState();
		this.addWidgetControlsToImageViewer();
		this.broadcastData();
	},

	/**
	* Load the app from a previous state
	*
	* @method load
	* @param date {Date} time from the server
	*/
	load: function(date) {
		this.updateAppFromState();
		this.refresh(date);
	},

	/**
	* Update the app from it's new state
	*
	* @method updateAppFromState
	*/
	updateAppFromState: function() {
		this.element.src  = cleanURL(this.state.src || this.state.img_url);

		this.pre.innerHTML = this.syntaxHighlight(this.state.exif);

		if (this.state.showExif === true) {
			this.showLayer();
		}

		this.layer.style.top = this.state.top + "px";

		// Fix iPhone picture: various orientations
		var ratio = this.state.exif.ImageHeight / this.state.exif.ImageWidth;
		var inv = 1.0 / ratio;
		if (this.state.exif.Orientation === 'Rotate 90 CW') {
			this.element.style.webkitTransform = "scale(" + ratio + "," + inv + ") rotate(90deg)";
			if (!this.state.crct) {
				this.sendResize(this.element.height, this.element.width);
			}
			this.state.crct = true;
		} else if (this.state.exif.Orientation === 'Rotate 270 CW') {
			this.element.style.webkitTransform = "scale(" + ratio + "," + inv + ") rotate(-90deg)";
			if (!this.state.crct) {
				this.sendResize(this.element.height, this.element.width);
			}
			this.state.crct = true;
		} else if (this.state.exif.Orientation === 'Rotate 180') {
			this.element.style.webkitTransform = "rotate(180deg)";
			this.state.crct = true;
		} else {
			this.state.crct = true;
		}
		this.layer.style.top = this.state.top + "px";
	},

	/**
	* Visibility callback, when app becomes locally visible or hidden.
	*    Called during preDraw
	*
	* @method onVisible
	* @param visibility {bool} became visible or hidden
	*/
	onVisible: function(visibility) {

		/*
		if (visibility) {
			this.element.src = this.state.src;
		} else {
			this.element.src = smallWhiteGIF();
		}
		*/
	},

	/**
	* To enable right click context menu support this function needs to be present with this format.
	*/
	getContextEntries: function() {
		var entries = [];

		// Special callback: download the file
		entries.push({
			description: "Download image",
			callback: "SAGE2_download",
			parameters: {
				url: cleanURL(this.state.src || this.state.img_url)
			}
		});
		entries.push({
			description: "Copy URL",
			callback: "SAGE2_copyURL",
			parameters: {
				url: cleanURL(this.state.src || this.state.img_url)
			}
		});

		// Show overlay with EXIF data
		entries.push({
			description: "Show EXIF",
			accelerator: "I",
			callback: "showEXIF",
			parameters: {}
		});

		if (this.checkIfHasGpsData()) {
			// Disable this for now
			// entries.push({
			// 	description: "Plot Location On Open Map",
			// 	callback: "tryPlotOnGoogleMap",
			// 	parameters: {}
			// });
			entries.push({
				description: "Plot Location On New Map",
				callback: "plotOnNewGoogleMap",
				parameters: {}
			});
		}

		return entries;
	},

	checkIfHasGpsData: function() {
		if (this.state
			&& this.state.exif
			&& this.state.exif.GPSLatitude
			&& this.state.exif.GPSLongitude) {
			return true;
		}
		return false;
	},

	tryPlotOnGoogleMap: function() {
		var mapAppIndex = this.checkForGoogleMapApp();
		if (mapAppIndex !== -1) {
			applications[mapAppIndex].addMarkerToMap({
				lat: this.state.exif.GPSLatitude,
				lng: this.state.exif.GPSLongitude,
				sourceAppId: this.id,
				shouldFocusViewOnNewMarker: true
			});
		}
	},

	checkForGoogleMapApp: function() {
		var keys = Object.keys(applications);
		// go from most recent to oldest
		for (let i = keys.length - 1; i >= 0; i--) {
			if (applications[keys[i]].application == "googlemaps") {
				return keys[i];
			}
		}
		return -1;
	},

	plotOnNewGoogleMap: function() {
		if (isMaster) {
			this.launchAppWithValues("googlemap", {
				lat: this.state.exif.GPSLatitude,
				lng: this.state.exif.GPSLongitude,
				sourceAppId: this.id,
				shouldFocusViewOnNewMarker: true
			}, this.sage2_x + 100, this.sage2_y, "addMarkerToMap");
		}
	},

	/**
	* Called through context menu. Starts a doodle app with this image.
	*
	* @method makeDoodle
	* @param responseObject {object} standard context values.
	*/
	makeDoodle: function(responseObject) {
		if (isMaster) {
			var data = {};
			data.appName = "doodle";
			data.func    = "initializationThroughDuplicate";
			data.xLaunch = this.sage2_x + 100;
			data.yLaunch = this.sage2_y;
			data.customLaunchParams  =  {};
			data.customLaunchParams.func = "initializationThroughDuplicate";
			data.customLaunchParams.clientName    = responseObject.clientName;
			data.customLaunchParams.imageSnapshot = cleanURL(this.state.src || this.state.img_url);
			wsio.emit("launchAppWithValues", data);
		}
	},

	/**
	* Draw function, empty since the img tag is in the DOM
	*
	* @method draw
	* @param date {Date} current time from the server
	*/
	draw: function(date) {
	},

	/**
	* Resize callback
	*
	* @method resize
	* @param date {Date} current time from the server
	*/
	resize: function(date) {
		// Force a redraw to test visibility
		this.refresh(date);
	},

	/**
	* Move callback
	*
	* @method move
	* @param date {Date} current time from the server
	*/
	move: function(date) {
		// Force a redraw to test visibility
		this.refresh(date);
	},

	/**
	* Parse JSON object and add colors
	*
	* @method syntaxHighlight
	* @param json {Object} object containing metadata
	*/
	syntaxHighlight: function(json) {
		if (typeof json !== 'string') {
			json = JSON.stringify(json, undefined, 4);
		}
		json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

		/* eslint-disable max-len */
		return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
			function(match) {
				var cls = 'color: darkorange;';
				if (/^"/.test(match)) {
					if (/:$/.test(match)) {
						cls = 'color: CadetBlue;';
					} else {
						cls = 'color: green;';
					}
				} else if (/true|false/.test(match)) {
					cls = 'color: blue;';
				} else if (/null/.test(match)) {
					cls = 'color: magenta;';
				}
				return '<span style="' + cls + '">' + match + '</span>';
			});

		/* eslint-enable max-len */
	},

	/**
	* Show / Hide EXIF overlay.
	*
	* @method showEXIF
	* @param responseObject {Object} contains response from entry selection
	*/
	showEXIF: function(responseObject) {
		if (this.isLayerHidden()) {
			this.state.top = 0;
			this.state.showExif = true;
			this.showLayer();
		} else {
			this.state.showExif = false;
			this.hideLayer();
		}
		this.refresh();
	},

	/**
	* Handles event processing for the app
	*
	* @method event
	* @param eventType {String} the type of event
	* @param position {Object} contains the x and y positions of the event
	* @param user_id {Object} data about the user who triggered the event
	* @param data {Object} object containing extra data about the event,
	* @param date {Date} current time from the server
	*/
	event: function(eventType, position, user_id, data, date) {
		// Press 'i' to display EXIF information
		if ((eventType === "keyboard" && data.character === "i") ||
			(eventType === "widgetEvent" && data.identifier === "Info")) {
			this.showEXIF();
		}

		// Scroll events for panning the info pannel
		if (eventType === "pointerScroll") {
			var amount = -data.wheelDelta / 32;

			this.state.top += ui.titleTextSize * amount;
			if (this.state.top > 0) {
				this.state.top = 0;
			}
			if (this.state.top < (-(this.layer.clientHeight - this.element.height))) {
				this.state.top = -(this.layer.clientHeight - this.element.height);
			}
			this.layer.style.top = this.state.top + "px";

			this.refresh(date);
		}
	},

	addWidgetControlsToImageViewer: function() {
		// UI stuff
		this.controls.addButton({label: "info", position: 7, identifier: "Info"});
		this.controls.finishedAddingControls();
	},

	broadcastData: function() {
		if (!isMaster) {
			// prevent spamming
			return;
		}
		if (this.checkIfHasGpsData()) {
			this.serverDataBroadcastSource("geoLocation", {
				source: this.id,
				location: {
					lat: this.state.exif.GPSLatitude,
					lng: this.state.exif.GPSLongitude
				}
			}, "an image geolocation");
		}
	}

});
