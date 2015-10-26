// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-2015

// we use arguments and callee to build inheritance
/*eslint-disable use-strict, strict, global-strict */

/**
 * @module client
 * @submodule SAGE2_App
 */

/**
 * Base class for SAGE2 applications
 *
 * @class SAGE2_App
 */
var SAGE2_App = Class.extend({

	/**
	* Constructor for SAGE2 applications
	*
	* @class SAGE2_App
	* @constructor
	*/
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.div          = null;
		this.element      = null;
		this.resrcPath    = null;
		this.moveEvents   = "never";
		this.resizeEvents = "never";
		this.state        = {};

		this.startDate = null;
		this.prevDate  = null;

		this.t     = null;
		this.dt    = null;
		this.frame = null;
		this.fps   = null;

		this.timer  = null;
		this.maxFPS = null;
		this.sticky = null;
		this.config = null;
		this.controls  = null;
		this.cloneable = null;
		// If the clone is not a fresh copy, this variable holds data to be loaded into the clone
		this.cloneData = null;
		this.enableControls  = null;
		this.requestForClone = null;

		// "was visible" state
		this.vis = null;

		// File Handling
		this.id = null;
		this.filePath = null;
		this.fileDataBuffer = null;
		this.fileRead = null;
		this.fileWrite = null;
		this.fileReceived = null;

		// Track if in User Event loop
		this.SAGE2UserModification = false;
	},

	/**
	* SAGE2Init method called right after the constructor
	*
	* @method SAGE2Init
	* @param type {String} type of DOM element to be created (div, canvas, ...)
	* @param data {Object} contains initialization values (id, width, height, state, ...)
	*/
	SAGE2Init: function(type, data) {
		// Application ID
		this.id = data.id;

		this.div = document.getElementById(data.id);
		this.element = document.createElement(type);
		this.element.className = "sageItem";
		this.element.style.zIndex = "0";
		if (type === "div") {
			this.element.style.width  = data.width  + "px";
			this.element.style.height = data.height + "px";
		} else {
			this.element.width  = data.width;
			this.element.height = data.height;
		}
		this.div.appendChild(this.element);

		this.resrcPath = data.resrc + "/";
		this.startDate = data.date;

		// visible
		this.vis = true;

		var parentTransform = getTransform(this.div.parentNode);
		var border = parseInt(this.div.parentNode.style.borderWidth || 0, 10);
		this.sage2_x      = (data.x + border + 1) * parentTransform.scale.x + parentTransform.translate.x;
		this.sage2_y      = (data.y + border) * parentTransform.scale.y + parentTransform.translate.y;
		this.sage2_width  = data.width * parentTransform.scale.x;
		this.sage2_height = data.height * parentTransform.scale.y;

		this.sage2_x      = data.x;
		this.sage2_y      = data.y;
		this.sage2_width  = data.width;
		this.sage2_height = data.height;

		this.controls = new SAGE2WidgetControl(data.id);

		this.prevDate  = data.date;
		this.frame     = 0;

		// Measurement variables
		this.frame_sec = 0;
		this.sec       = 0;
		this.fps       = 0.0;

		// Frame rate control
		this.timer     = 0;
		this.maxFPS    = 30.0; // Default to 30fps for performance reasons

		// keep a copy of the wall configuration
		this.config    = ui.json_cfg;

		// Top layer
		this.layer     = null;

		// File Handling
		this.fileName       = "";
		this.fileDataBuffer = null;
		this.fileRead       = false;
		this.fileWrite      = false;
		this.fileReceived   = false;

		this.SAGE2CopyState(data.state);
	},

	SAGE2Load: function(state, date) {
		this.SAGE2CopyState(state);
		this.load(date);
	},

	SAGE2Event: function(eventType, position, user_id, data, date) {
		this.SAGE2UserModification = true;
		this.event(eventType, position, user_id, data, date);
		this.SAGE2UserModification = false;
	},

	/**
	* SAGE2CopyState method called on init or load to copy state of app instance
	*
	* @method SAGE2CopyState
	* @param state {Object} contains state of app instance
	*/
	SAGE2CopyState: function(state) {
		var key;
		for (key in state) {
			this.state[key] = state[key];
		}
	},

	SAGE2Sync: function(updateRemote) {
		if (isMaster) {
			wsio.emit('updateAppState', {id: this.id, state: this.state, updateRemote: updateRemote});
		}
	},

	/**
	* Method to create a layered div ontop the application
	*
	* @method createLayer
	* @param backgroundColor {String} color in DOM-syntax for the div
	*/
	createLayer: function(backgroundColor) {
		this.layer = document.createElement('div');
		this.layer.style.backgroundColor  = backgroundColor;
		this.layer.style.position = "absolute";
		this.layer.style.padding  = "0px";
		this.layer.style.margin   = "0px";
		this.layer.style.left     = "0px";
		this.layer.style.top      = "0px";
		this.layer.style.width    = "100%";
		this.layer.style.color    = "#FFFFFF";
		this.layer.style.display  = "none";
		this.layer.style.overflow = "visible";
		this.layer.style.zIndex   = parseInt(this.div.zIndex) + 1;
		this.layer.style.fontSize = Math.round(this.config.ui.titleTextSize) + "px";

		this.div.appendChild(this.layer);

		return this.layer;
	},

	/**
	* Method to display the layer
	*
	* @method showLayer
	*/
	showLayer: function() {
		if (this.layer) {
			// Reset its top position, just in case
			this.layer.style.top = "0px";
			this.layer.style.display = "block";
		}
	},

	/**
	* Method to hide the layer
	*
	* @method hideLayer
	*/
	hideLayer: function() {
		if (this.layer) {
			this.layer.style.display = "none";
		}
	},

	/**
	* Method to flip the visibility of the layer
	*
	* @method showHideLayer
	*/
	showHideLayer: function() {
		if (this.layer) {
			if (this.isLayerHidden()) {
				this.showLayer();
			} else {
				this.hideLayer();
			}
		}
	},

	/**
	* Method returning the visibility of the layer
	*
	* @method isLayerHidden
	* @return {Bool} true if layer is hidden
	*/
	isLayerHidden: function() {
		if (this.layer) {
			return (this.layer.style.display === "none");
		} else {
			return false;
		}
	},

	/**
	* Calculate if the application is hidden in this display
	*
	* @method isHidden
	* @return {Boolean} Returns true if out of screen
	*/
	isHidden: function() {
		var checkWidth  = this.config.resolution.width;
		var checkHeight = this.config.resolution.height;
		if (clientID === -1) {
			// set the resolution to be the whole display wall
			checkWidth  *= this.config.layout.columns;
			checkHeight *= this.config.layout.rows;
		}
		return (this.sage2_x > (ui.offsetX + checkWidth)  ||
				(this.sage2_x + this.sage2_width) < ui.offsetX ||
				this.sage2_y > (ui.offsetY + checkHeight) ||
				(this.sage2_y + this.sage2_height) < ui.offsetY);
	},

	/**
	* Calculate if the application is visible in this display
	*
	* @method isVisible
	* @return {Boolean} Returns true if visible
	*/
	isVisible: function() {
		return !this.isHidden();
	},

	/**
	* Method called before the draw function, calculates timing and frame rate
	*
	* @method preDraw
	* @param date {Date} current time from the server
	*/
	preDraw: function(date) {
		// total time since start of program (sec)
		this.t  = (date.getTime() - this.startDate.getTime()) / 1000;
		// delta time since last frame (sec)
		this.dt = (date.getTime() -  this.prevDate.getTime()) / 1000;

		// Frame rate control
		this.timer += this.dt;
		if (this.timer > (1.0 / this.maxFPS)) {
			this.timer  = 0.0;
		}

		// Check for visibility
		var visible = this.isVisible();
		if (!visible && this.vis) {
			// trigger the app visibility callback, if there's one
			if (this.onVisible) {
				this.onVisible(false);
			}
			// app became hidden
			this.vis = false;
		}
		if (visible && !this.vis) {
			// trigger the visibility callback, if there's one
			if (this.onVisible) {
				this.onVisible(true);
			}
			// app became visible
			this.vis = true;
		}

		// Increase time
		this.sec += this.dt;
	},

	/**
	* Method called after the draw function
	*
	* @method postDraw
	* @param date {Date} current time from the server
	*/
	postDraw: function(date) {
		this.prevDate = date;
		this.frame++;
	},

	/**
	* Internal method for an actual draw loop (predraw, draw, postdraw).
	*  draw is called as needed
	*
	* @method refresh
	* @param date {Date} current time from the server
	*/
	refresh: function(date) {
		if (this.SAGE2UserModification === true) {
			this.SAGE2Sync(true);
		}

		// update time
		this.preDraw(date);
		// measure actual frame rate
		if (this.sec >= 1.0) {
			this.fps       = this.frame_sec / this.sec;
			this.frame_sec = 0;
			this.sec       = 0;
		}
		// actual application draw
		this.draw(date);
		this.frame_sec++;
		// update time and misc
		this.postDraw(date);
	},

	/**
	* Method called by SAGE2, and calls the application 'quit' method
	*
	* @method terminate
	*/
	terminate: function() {
		if (typeof this.quit === 'function') {
			this.quit();
		}
	},

	/**
	* Close the application itself
	*
	* @method close
	*/
	close: function() {
		// send the message to server
		wsio.emit('deleteApplication', {appId: this.id});
	},

	/**
	* Application request for a new size
	*
	* @method sendResize
	* @param newWidth {Number} desired width
	* @param newHeight {Number} desired height
	*/
	sendResize: function(newWidth, newHeight) {
		var msgObject = {};
		// Add the display node ID to the message
		msgObject.node   = clientID;
		msgObject.id     = this.div.id;
		msgObject.width  = newWidth;
		msgObject.height = newHeight;
		// Send the message to the server
		wsio.emit('appResize', msgObject);
	},

	/**
	* RPC to every application client (client-side)
	*
	* @method broadcast
	* @param funcName {String} name of the function to be called in each client
	* @param data {Object} parameters to the function call
	*/
	broadcast: function(funcName, data) {
		broadcast({app: this.div.id, func: funcName, data: data});
	},

	/**
	* Support for the RPC call to the server
	*
	* @method applicationRPC
	* @param query {Object} parameter for RPC function on server
	* @param funcName {String} return function name for broadcast or emit
	* @param broadcast {Boolean} wether or not doing a return broadcast or emit
	*/
	applicationRPC: function(query, funcName, broadcast) {
		wsio.emit('applicationRPC', {app: this.div.id, func: funcName, query: query, broadcast: broadcast});
	},

	/**
	* Prints message to local browser console and send to server.
	*  Accept a string as parameter or multiple parameters
	*
	* @method log
	* @param msg {Object} list of arguments to be printed
	*/
	log: function(msg) {
		if (arguments.length === 0) {
			return;
		}
		var args;
		if (arguments.length > 1) {
			args = Array.prototype.slice.call(arguments);
		} else {
			args = msg;
		}
		sage2Log({app: this.div.id, message: args});
	}
});
