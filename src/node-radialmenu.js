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
	this.thumbnailWindowOpen = false;
	this.wsio = undefined;
	
	// Default
	this.radialMenuScale = 1.0;
	this.radialMenuSize = { x: 425 * this.radialMenuScale, y: 425 * this.radialMenuScale };
	this.thumbnailWindowSize = { x: 1224, y: 860 };
}

radialmenu.prototype.start = function() {
	this.visible = true;
};

radialmenu.prototype.stop = function() {
	this.visible = false;
};

radialmenu.prototype.openThumbnailWindow = function(data) {
	this.thumbnailWindowOpen = data.thumbnailWindowOpen;
};

radialmenu.prototype.setPosition = function(data) {
	this.radialMenuSize = data.radialMenuSize;
	this.thumbnailWindowSize = data.thumbnailWindowSize;
	
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
			//console.log("over menu");
			return true;
		}
		else if( position.x > this.left + this.radialMenuSize.x/2 && position.x <  this.left + this.radialMenuSize.x/2 + this.thumbnailWindowSize.x 
			&& position.y > this.top - this.radialMenuSize.y/2 && position.y < this.top - this.radialMenuSize.y/2 + this.thumbnailWindowSize.y )
		{
			//this.windowInteractionMode = false;
			//console.log("over thumb");
			if( this.thumbnailWindowOpen === true )
				return true;
			else
				return false;
		}
		{
			//console.log("nope")
			return false;
		}
	}
};

module.exports = radialmenu;
