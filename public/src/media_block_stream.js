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
 * @submodule media_block_stream
 */

/**
 * Class for media block streaming applications, inherits from SAGE2_BlockStreamingApp
 *
 * @class media_block_stream
 */
var media_block_stream = SAGE2_BlockStreamingApp.extend({

	/**
	* Init method, creates a 'div' tag in the DOM
	*
	* @method init
	* @param data {Object} contains initialization values (id, width, height, ...)
	*/
	init: function(data) {
		this.blockStreamInit(data);
		this.firstLoad();
	},

	/**
	* Loads the app from a previous state
	*
	* @method load
	* @param state {Object} object to initialize or restore the app
	* @param date {Date} time from the server
	*/
	load: function(date) {
	}

});
