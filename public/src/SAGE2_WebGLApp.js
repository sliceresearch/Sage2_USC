// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015


//
// contributed by Garry Keltie
//     garry.keltie@gmail.com
//

"use strict";


/**
 * @module client
 * @submodule SAGE2_WebGLApp
 */

/**
 * Base class for WebGL applications
 *
 * @class SAGE2_WebGLApp
 */
var SAGE2_WebGLApp = SAGE2_App.extend({

	/**
	* Init method, creates an 'canvas' tag in the DOM and setups up WebGL
	*
	* @method init
	* @param data {Object} contains initialization values (id, width, height, ...)
	*/
	WebGLAppInit: function(type, data) {
		this.SAGE2Init("div", data);

		this.moveEvents       = "onfinish";
		this.resizeEvents     = "onfinish";
		this.enableControls   = true;

		this.canvas           = null;
		this.gl               = null;

		// Some applications can provide their own canvas as well as a supplied one.
		if (type === 'canvas') {
			this.canvas = document.createElement(type);
			this.element.appendChild(this.canvas);
			this.initGL();
		} else {
			this.log("Critical! We are relying on a canvas element");
		}
		this.canvas.id = data.id + "_canvas";
		this.canvas.style.position = "relative";
		this.canvas.width  = ui.json_cfg.resolution.width;
		this.canvas.height = ui.json_cfg.resolution.height;
	},

	/**
	* Gets a WebGL context from the canvas
	*
	* @method initGL
	*/
	initGL: function() {
		this.gl = this.canvas.getContext("webgl");
		if (!this.gl) {
			this.gl = this.canvas.getContext("experimental-webgl");
		}
		if (!this.gl) {
			this.log("Unable to initialize WebGL. Your browser may not support it.");
		}
	},

	/**
	* Resize the canvas in local (client) coordinates, never bigger than the local screen
	*
	* @method resizeCanvas
	*/
	resizeCanvas: function(date) {
		// Applications will require different parameters to do their frustum setting.
		var resizeData = {
			left: 0, right: 0, bottom: 0, top: 0,
			leftViewOffset: 0, topViewOffset: 0,
			localWidth: 0, localHeight: 0
		};

		var checkWidth  = this.config.resolution.width;
		var checkHeight = this.config.resolution.height;

		// Overview client covers all
		if (clientID === -1) {
			// set the resolution to be the whole display wall
			checkWidth  *= this.config.layout.columns;
			checkHeight *= this.config.layout.rows;
		} else {
			checkWidth  *= (ui.json_cfg.displays[clientID].width || 1);
			checkHeight *= (ui.json_cfg.displays[clientID].height || 1);
		}

		var localX = this.sage2_x - ui.offsetX;
		var localY = this.sage2_y - ui.offsetY;
		var localRight  = localX + this.sage2_width;
		var localBottom = localY + this.sage2_height;
		var viewX = Math.max(localX, 0);
		var viewY = Math.max(localY, 0);
		var viewRight   = Math.min(localRight,  checkWidth);
		var viewBottom  = Math.min(localBottom, checkHeight);
		var localWidth  = viewRight  - viewX;
		var localHeight = viewBottom - viewY;

		if (localWidth <= 0 || localHeight <= 0) { // completely off-screen
			this.canvas.width  = 1;
			this.canvas.height = 1;
			this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		} else {
			var parentTransform = getTransform(this.div.parentNode);
			this.canvas.width  = localWidth / parentTransform.scale.x;
			this.canvas.height = localHeight / parentTransform.scale.y;

			this.canvas.style.width = this.canvas.width + 'px';
			this.canvas.style.height = this.canvas.height + 'px';

			this.canvas.style.left = ((viewX - localX) / parentTransform.scale.x) + "px";
			this.canvas.style.top  = ((viewY - localY) / parentTransform.scale.y) + "px";

			resizeData.left   = ((viewX     - localX) / (localRight - localX) * 2.0) - 1.0;
			resizeData.right  = ((viewRight - localX) / (localRight - localX) * 2.0) - 1.0;
			resizeData.top    = ((1.0 - (viewY     - localY) / (localBottom - localY)) * 2.0) - 1.0;
			resizeData.bottom = ((1.0 - (viewBottom - localY) / (localBottom - localY)) * 2.0) - 1.0;

			resizeData.leftViewOffset = (viewX - localX);
			resizeData.topViewOffset =  (viewY - localY);

			resizeData.localWidth  = localWidth;
			resizeData.localHeight = localHeight;

			this.resizeApp(resizeData);
		}
	},

	/**
	* When a move starts, hide the canvas
	*
	* @method startMove
	* @param date {Date} current time from the server
	*/
	startMove: function(date) {
	},

	/**
	* After move, show the canvas and update the coordinate system (resizeCanvas)
	*
	* @method move
	* @param date {Date} current time from the server
	*/
	move: function(date) {
		this.resizeCanvas(date);
		this.refresh(date);
	},

	/**
	* When a resize starts, hide the canvas
	*
	* @method startResize
	* @param date {Date} current time from the server
	*/
	startResize: function(date) {
		this.canvas.style.display = "none";
	},

	/**
	* After resize, show the canvas and update the coordinate system (resizeCanvas)
	*
	* @method resize
	* @param date {Date} current time from the server
	*/
	resize: function(date) {
		this.canvas.style.display = "none";
		this.resizeCanvas(date);
		this.canvas.style.display = "block";
		this.refresh(date);
	}
});
