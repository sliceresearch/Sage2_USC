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
	this.wsio = undefined;
	
	// Default
	this.radialMenuScale = 1.0;
	this.radialMenuSize = { x: 425 * this.radialMenuScale, y: 425 * this.radialMenuScale };
}

radialmenu.prototype.start = function() {
	this.visible = true;
};

radialmenu.prototype.stop = function() {
	this.visible = false;
};

radialmenu.prototype.setPosition = function(data) {
	this.radialMenuSize = data.radialMenuSize;
	
	this.left = data.x + this.radialMenuSize.x/2;
	this.top = data.y + this.radialMenuSize.y/2;
};

radialmenu.prototype.onEvent = function(type, position, data) {
	

	if( this.visible === true && type !== "pointerRelease" )
	{
		// Press over radial menu, drag menu
		//console.log((this.left - this.radialMenuSize.x/2), " < ", position.x, " < ", (this.left - this.radialMenuSize.x/2 + this.radialMenuSize.x) );
		//console.log((this.top - this.radialMenuSize.y/2), " < ", position.y, " < ", (this.top - this.radialMenuSize.y/2 + this.radialMenuSize.y) );
		
		if( position.x > this.left - this.radialMenuSize.x/2 && position.x <  this.left - this.radialMenuSize.x/2 + this.radialMenuSize.x 
			&& position.y > this.top  - this.radialMenuSize.y/2 && position.y < this.top - this.radialMenuSize.y/2 + this.radialMenuSize.y )
		{
			//this.windowInteractionMode = false;
			//console.log("in")
			return true;
		}
		else
		{
			//console.log("out")
			return false;
		}
	}
};

module.exports = radialmenu;
