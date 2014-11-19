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
	
	this.activeEventIDs = [];
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

radialmenu.prototype.hasEventID = function(id) {
	if( this.activeEventIDs.indexOf(id) === -1 )
		return false;
	else
		return true;
};

radialmenu.prototype.onEvent = function(data) {
	
	var idIndex = this.activeEventIDs.indexOf(data.id);
	if( idIndex !== -1 && data.type === "pointerRelease" )
		this.activeEventIDs.splice( idIndex );
				
	if( this.visible === true && data.type !== "pointerRelease" )
	{
		// Press over radial menu, drag menu
		//console.log((this.left - this.radialMenuSize.x/2), " < ", position.x, " < ", (this.left - this.radialMenuSize.x/2 + this.radialMenuSize.x) );
		//console.log((this.top - this.radialMenuSize.y/2), " < ", position.y, " < ", (this.top - this.radialMenuSize.y/2 + this.radialMenuSize.y) );
		
		if( data.x > this.left - this.radialMenuSize.x/2 && data.x <  this.left - this.radialMenuSize.x/2 + this.radialMenuSize.x 
			&& data.y > this.top  - this.radialMenuSize.y/2 && data.y < this.top - this.radialMenuSize.y/2 + this.radialMenuSize.y )
		{
			//this.windowInteractionMode = false;
			//console.log("over menu");
			if( this.visible === true && data.type === "pointerPress" )
				this.activeEventIDs.push( data.id );
		
			return true;
		}
		else if( data.x > this.left + this.radialMenuSize.x/2 && data.x <  this.left + this.radialMenuSize.x/2 + this.thumbnailWindowSize.x 
			&& data.y > this.top - this.radialMenuSize.y/2 && data.y < this.top - this.radialMenuSize.y/2 + this.thumbnailWindowSize.y )
		{
			//this.windowInteractionMode = false;
			//console.log("over thumb");
			if( this.thumbnailWindowOpen === true )
			{
				if( this.visible === true && data.type === "pointerPress" )
					this.activeEventIDs.push( data.id );
				
				return true;
			}
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
