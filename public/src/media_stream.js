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
 * @submodule media_stream
 */

/**
 * Class for media streaming applications, no block streaming
 *
 * @class media_stream
 */
var media_stream = SAGE2_App.extend({
	/**
	* Init method, creates a 'img' tag in the DOM
	*
	* @method init
	* @param data {Object} contains initialization values (id, width, height, ...)
	*/
	init: function(data) {
		this.SAGE2Init("canvas", data);
		this.ctx = this.element.getContext('2d');
		this.bufferId = 0;

		this.img1LoadedFunc = this.img1Loaded.bind(this);
		this.img2LoadedFunc = this.img2Loaded.bind(this);

		this.img1 = new Image();
		this.img2 = new Image();

		this.img1IsLoaded = false;
		this.img2IsLoaded = false;

		this.img1.addEventListener('load', this.img1LoadedFunc, false);
		this.img2.addEventListener('load', this.img2LoadedFunc, false);

		this.resizeEvents = null;
		this.moveEvents   = null;
		this.date = data.date;
	},

	img1Loaded: function() {
		this.bufferId = 0;
		this.img1IsLoaded = true;
		this.draw(this.date);
	},

	img2Loaded: function() {
		this.img2IsLoaded = true;
		this.bufferId = 1;
		this.draw(this.date);
	},

	/**
	* Loads the app from a previous state
	*
	* @method load
	* @param state {Object} object to initialize or restore the app
	* @param date {Date} time from the server
	*/
	load: function(date) {
		this.date = date;

		var b64;
		if (this.state.encoding === "binary") {
			b64 = btoa(this.state.src);
		} else if (this.state.encoding === "base64") {
			b64 = this.state.src;
		}

		if (this.bufferId === 0) {
			this.img2.src = "data:" + this.state.type + ";base64," + b64;
		} else {
			this.img1.src = "data:" + this.state.type + ";base64," + b64;
		}


		// modifying img.src directly leads to memory leaks
		// explicitly allocate and deallocate: 'createObjectURL' / 'revokeObjectURL'

		// var base64;
		// if(state.encoding === "base64") base64 = state.src;
		// else if(state.encoding === "binary") base64 = btoa(state.src);
		// this.element.src = "data:" + state.type + ";base64," + base64;

		/*
		var bin;
		if (this.state.encoding === "binary") bin = this.state.src;
		else if (this.state.encoding === "base64") bin = atob(this.state.src);

		var buf  = new ArrayBuffer(bin.length);
		var view = new Uint8Array(buf);
		for (var i=0; i<view.length; i++) {
			view[i] = bin.charCodeAt(i);
		}

		var blob   = new Blob([buf], {type: this.state.type});
		var source = window.URL.createObjectURL(blob);

		if (this.src !== null) window.URL.revokeObjectURL(this.src);

		this.src = source;
		this.element.src = this.src;
		*/
	},

	/**
	* Draw function
	*
	* @method draw
	* @param date {Date} current time from the server
	*/
	draw: function(date) {
		if (this.bufferId === 0 && this.img1IsLoaded === true) {
			this.ctx.drawImage(this.img1, 0, 0, this.element.width, this.element.height);
		} else if (this.bufferId === 1 && this.img2IsLoaded === true) {
			this.ctx.drawImage(this.img2, 0, 0, this.element.width, this.element.height);
		}
	},

	/**
	* After resize
	*
	* @method resize
	* @param date {Date} current time from the server
	*/
	resize: function(date) {
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
		if (eventType === "keyboard") {
			// if (data.character === 'x') {
			// 	// Press 'x' to close itself
			// 	this.close();
			// }
		}
	}

});
