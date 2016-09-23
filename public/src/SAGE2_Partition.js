// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-2015

/* global ignoreFields, SAGE2WidgetControl, SAGE2MEP */
/* global addStoredFileListEventHandler, removeStoredFileListEventHandler */

/**
 * @module client
 * @submodule SAGE2_Partition
 */

 /**
 * Base class for SAGE2 partitions
 *
 * @class SAGE2_Partition
 */
var SAGE2_Partition = Class.extend({

	/**
	* Constructor for SAGE2 partitions
	*
	* @class SAGE2_Partition
	* @constructor
	*/
	construct: function() {
		arguments.callee.superClass.construct.call(this);


	},

  /**
	* SAGE2Init method called right after the constructor
	*
	* @method SAGE2Init
	* @param type {String} type of DOM element to be created (div, canvas, ...)
	* @param data {Object} contains initialization values (id, width, height, state, ...)
	*/
	SAGE2Init: function(type, data) {

	}
});
