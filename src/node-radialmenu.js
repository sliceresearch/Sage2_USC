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
 * Radial menu for a given pointer
 *
 * @module server
 * @submodule radialmenu
 */

// require variables to be declared
"use strict";

// unused: var radialMenuCenter = { x: 210, y: 210 }; // scale applied in ctor
var radialMenuDefaultSize      = { x: 425, y: 425 }; // scale applied in ctor
var thumbnailWindowDefaultSize = { x: 1224, y: 860 };

/**
 * Class RadialMenu
 *
 * @class RadialMenu
 * @constructor
 */
function RadialMenu(id, ptrID, ui) {
	this.id        = id;
	this.pointerid = ptrID;
	this.label     = "";
	this.color     = [255, 255, 255];
	this.left      = 0;
	this.top       = 0;
	this.visible   = true;
	this.wsio      = undefined;
	this.thumbnailWindowOpen = false;

	// Default
	this.radialMenuScale     = ui.widgetControlSize * 0.03;
	this.radialMenuSize      = { x: radialMenuDefaultSize.x * this.radialMenuScale, y: radialMenuDefaultSize.y * this.radialMenuScale };
	this.thumbnailWindowSize = { x: thumbnailWindowDefaultSize.x * this.radialMenuScale, y: thumbnailWindowDefaultSize.y * this.radialMenuScale };
	this.activeEventIDs      = [];

	this.dragState = false;
	this.dragID = -1;
	this.dragPosition = { x: 0, y: 0 };
}

/**
*
*
* @method getInfo
*/
RadialMenu.prototype.getInfo = function() {
	return {id: this.pointerid, x: this.left, y: this.top, radialMenuSize: this.radialMenuSize, thumbnailWindowSize: this.thumbnailWindowSize, radialMenuScale: this.radialMenuScale, visble: this.visible };
};

/**
*
*
* @method start
*/
RadialMenu.prototype.start = function() {
	this.visible = true;
};

/**
*
*
* @method stop
*/
RadialMenu.prototype.stop = function() {
	this.visible = false;
};

/**
*
*
* @method openThumbnailWindow
*/
RadialMenu.prototype.openThumbnailWindow = function(data) {
	this.thumbnailWindowOpen = data.thumbnailWindowOpen;
};

/**
*
*
* @method setPosition
*/
RadialMenu.prototype.setPosition = function(data) {
	this.left = data.x;
	this.top  = data.y;
	//console.log("node-radialMenu:setPosition() " + data.x + " " + data.y);
};

/**
*
*
* @method hasEventID
*/
RadialMenu.prototype.hasEventID = function(id) {
	if (this.activeEventIDs.indexOf(id) === -1)
		return false;
	else
		return true;
};

/**
*
*
* @method isEventOnMenu
*/
RadialMenu.prototype.isEventOnMenu = function(data) {
	if (this.visible === true) {
		// If over radial menu bounding box
		if ((data.x > this.left - this.radialMenuSize.x/2) && (data.x < this.left - this.radialMenuSize.x/2 + this.radialMenuSize.x) &&
			(data.y > this.top  - this.radialMenuSize.y/2) && (data.y < this.top - this.radialMenuSize.y/2  + this.radialMenuSize.y) ) {
			return true;
		}
		// Else if over thumbnail window bounding box
		else if ((data.x > this.left + this.radialMenuSize.x/2) && (data.x < this.left + this.radialMenuSize.x/2 + this.thumbnailWindowSize.x) &&
				(data.y > this.top - this.radialMenuSize.y/2)  && (data.y < this.top - this.radialMenuSize.y/2  + this.thumbnailWindowSize.y) ) {
			if (this.thumbnailWindowOpen === true) {
				return true;
			}
		}
	}
	return false;
};

/**
*
*
* @method onEvent
*/
RadialMenu.prototype.onEvent = function(data) {
	var idIndex = this.activeEventIDs.indexOf(data.id);
	if (idIndex !== -1 && data.type === "pointerRelease")
		this.activeEventIDs.splice(idIndex);

	if (this.visible === true) {
		// Press over radial menu, drag menu
		//console.log((this.left - this.radialMenuSize.x/2), " < ", position.x, " < ", (this.left - this.radialMenuSize.x/2 + this.radialMenuSize.x) );
		//console.log((this.top - this.radialMenuSize.y/2), " < ", position.y, " < ", (this.top - this.radialMenuSize.y/2 + this.radialMenuSize.y) );

		// If over radial menu bounding box
		if ((data.x > this.left - this.radialMenuSize.x/2) && (data.x < this.left - this.radialMenuSize.x/2 + this.radialMenuSize.x) &&
			(data.y > this.top  - this.radialMenuSize.y/2) && (data.y < this.top - this.radialMenuSize.y/2  + this.radialMenuSize.y) ) {
			//this.windowInteractionMode = false;

			if (this.visible === true && data.type === "pointerPress")
				this.activeEventIDs.push(data.id);

			return true;
		}
		// Else if over thumbnail window bounding box
		else if (this.thumbnailWindowOpen === true && (data.x > this.left + this.radialMenuSize.x/2) && (data.x < this.left + this.radialMenuSize.x/2 + this.thumbnailWindowSize.x) &&
				(data.y > this.top - this.radialMenuSize.y/2)  && (data.y < this.top - this.radialMenuSize.y/2  + this.thumbnailWindowSize.y) ) {
			//this.windowInteractionMode = false;

			if (this.visible === true && data.type === "pointerPress")
				this.activeEventIDs.push(data.id);
			return true;
		}
		else if (this.activeEventIDs.indexOf(data.id) !== -1) {
			return true;
		}
	}
	return false;
};

/**
*
*
* @method onPress
*/
RadialMenu.prototype.onPress = function(id) {
	this.activeEventIDs.push(id);
};

/**
*
*
* @method onMove
*/
RadialMenu.prototype.onMove = function(id) {
	//console.log( this.hasEventID(id) );
};

/**
*
*
* @method onRelease
*/
RadialMenu.prototype.onRelease = function(id) {
	this.activeEventIDs.splice(this.activeEventIDs.indexOf(id), 1);

	if (this.dragState === true && this.dragID === id) {
		this.dragState = false;
	}
};

/**
* Initializes the radial menu's drag state
*
* @method onStartDrag
* @param id {Integer} input ID initiating the drag
* @param localPos {x: Float, y: Float} initial drag position
*/
RadialMenu.prototype.onStartDrag = function(id, localPos) {
	if (this.dragState === false) {
		this.dragID       = id;
		this.dragState    = true;
		this.dragPosition = localPos;
	}
};

/**
* Checks if an input ID is dragging the menu
*
* @method isDragging
* @param id {Integer} input ID
* @param localPos {x: Float, y: Float} input position
* @return dragPos {x: Float, y: Float}
*/
RadialMenu.prototype.getDragOffset = function(id, localPos) {
	var offset = {x: 0, y: 0 };
	if (this.dragState === true && this.dragID === id) {
		// If this ID is dragging the menu, return the drag offset
		offset = { x: localPos.x - this.dragPosition.x, y: localPos.y - this.dragPosition.y };
	}
	return offset;
};


module.exports = RadialMenu;
