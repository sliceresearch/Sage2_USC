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
 @module radialmenu
 */


function radialmenu(id, ptrID) {
	this.id = id;
	this.pointerid = ptrID;
	this.label = "";
	this.color = [255, 255, 255];
	this.left = 0;
	this.top = 0;
	this.visible = true;
}

radialmenu.prototype.start = function(label, color) {
	this.label = label;
	this.color = color;
	this.left = 0;
	this.top = 0;
	this.visible = true;
};

radialmenu.prototype.stop = function() {
	this.visible = false;
};

radialmenu.prototype.onEvent = function(type, position, data) {
	var radialMenuScale = 1.0;
	var radialMenuSize = { x: 425 * radialMenuScale, y: 425 * radialMenuScale };

	if( this.visible === true && type !== "pointerRelease" && data.button === 'left' )
	{
		// Press over radial menu, drag menu
		console.log("radial menu ", this.left, " ", this.top);
		if( position.x > this.left - radialMenuSize.x/2 && position.x <  this.left  - radialMenuSize.x/2 + radialMenuSize.x && position.y > this.top  - radialMenuSize.y/2 && position.y < this.top - radialMenuSize.y/2 + radialMenuSize.y )
		{
			//this.windowInteractionMode = false;
			return true;
		}
		else
		{
			return false;
		}
	}
};

module.exports = radialmenu;
