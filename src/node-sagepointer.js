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
 * SAGE pointer object
 *
 * @module server
 * @submodule sagepointer
 */

// require variables to be declared
"use strict";

/**
 * SagePointer class
 *
 * @class SagePointer
 * @constructor
 * @param id {String} identifier of the new pointer
 */
function SagePointer(id) {
	this.id          = id;
	this.label       = "";
	this.color       = "#FFFFFF";
	this.left        = 0;
	this.top         = 0;
	this.visibleLeft = 0;
	this.visibleTop  = 0;
	this.visible     = false;
}

/**
* Activate the pointer
*
* @method start
* @param label {String} name of the user
* @param color {Array} RGB array
* @param sourceType {String} type of pointer
*/
SagePointer.prototype.start = function(label, color, sourceType) {
	this.label = label;
	this.color = color;
	this.sourceType = sourceType;
	this.left    = this.visibleLeft;
	this.top     = this.visibleTop;
	this.visible = true;
};

/**
* Make the pointer invisible
*
* @method stop
*/
SagePointer.prototype.stop = function() {
	this.visibleLeft = this.left;
	this.visibleTop = this.top;
	this.visible = false;
};

SagePointer.prototype.updatePointerPosition = function(data, maxW, maxH) {
	if (data.pointerX !== undefined) {
		this.left = data.pointerX;
	}
	if (data.pointerY !== undefined) {
		this.top = data.pointerY;
	}
	if (data.dx !== undefined) {
		this.left += data.dx;
	}
	if (data.dy !== undefined) {
		this.top  += data.dy;
	}

	if (this.left < 0) {
		this.left = 0;
	}
	if (this.left > maxW) {
		this.left = maxW;
	}
	if (this.top < 0) {
		this.top = 0;
	}
	if (this.top > maxH) {
		this.top = maxH;
	}
};


module.exports = SagePointer;
