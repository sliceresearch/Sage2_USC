// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/**
 * @module client
 * @submodule media_stream
 */

/**
 * Class for media streaming applications, no block streaming
 *
 * @class media_stream
 */
var media_stream = SAGE2_App.extend( {
	/**
	* Constructor
	*
	* @class media_stream
	* @constructor
	*/
	construct: function() {
		arguments.callee.superClass.construct.call(this);
		this.src = null;
	},

	/**
	* Init method, creates a 'img' tag in the DOM
	*
	* @method init
	* @param data {Object} contains initialization values (id, width, height, ...)
	*/
	init: function(data) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, "img", data);

		// overwrite img element with dynamic image (based on the original img)
		this.element = new DynamicImage(this.element);
	},

	/**
	* Loads the app from a previous state
	*
	* @method load
	* @param state {Object} object to initialize or restore the app
	* @param date {Date} time from the server
	*/
	load: function(state, date) {
		// modifying img.src directly leads to memory leaks
		// explicitly allocate and deallocate: 'createObjectURL' / 'revokeObjectURL'

		// var base64;
		// if(state.encoding === "base64") base64 = state.src;
		// else if(state.encoding === "binary") base64 = btoa(state.src);
		// this.element.src = "data:" + state.type + ";base64," + base64;

		var base64;
		if(state.encoding === "base64") base64 = state.src;
		else if(state.encoding === "binary") base64 = btoa(state.src);
		this.element.src = "data:" + state.type + ";base64," + base64;		

		/*
		var bin;
		if (state.encoding === "binary") bin = state.src;
		else if (state.encoding === "base64") bin = atob(state.src);

		var buf  = new ArrayBuffer(bin.length);
		var view = new Uint8Array(buf);
		for (var i=0; i<view.length; i++) {
			view[i] = bin.charCodeAt(i);
		}

		var blob   = new Blob([buf], {type: state.type});
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
	event: function(type, position, user, data, date) {
	}

});
