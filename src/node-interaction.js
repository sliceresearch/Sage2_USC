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
 * @module interaction
 */


var MODE = {WINDOW_MANAGEMENT: 0, APP_INTERACTION: 1};

/**
 * @class interaction
 * @constructor
 */

function interaction(config) {
	this.selectedMoveItem    = null;
	this.selectedScrollItem  = null;
	this.selectedResizeItem  = null;
	this.selectedMoveControl = null;
	this.controlLock     = null;
	this.hoverCornerItem = null;
	this.selectOffsetX   = 0;
	this.selectOffsetY   = 0;
	this.selectTimeId    = {};
	this.interactionMode = MODE.WINDOW_MANAGEMENT;
	this.configuration   = config;

	this.CTRL  = false;
	this.SHIFT = false;
	this.ALT   = false;
	this.CMD   = false;
	this.CAPS  = false;
}

/**
 *@method selectMoveItem
 */

interaction.prototype.selectMoveItem = function(moveItem, pointerX, pointerY) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return;
	this.selectedMoveItem = moveItem;
	this.selectedMoveControl = null;
	this.selectedScrollItem = null;
	this.selectedResizeItem = null;
	this.selectOffsetX = this.selectedMoveItem.left - pointerX;
	this.selectOffsetY = this.selectedMoveItem.top - pointerY;
	
	if(this.selectedMoveItem.previous_left   === null) this.selectedMoveItem.previous_left   = this.selectedMoveItem.left;
	if(this.selectedMoveItem.previous_top    === null) this.selectedMoveItem.previous_top    = this.selectedMoveItem.top;
	if(this.selectedMoveItem.previous_width  === null) this.selectedMoveItem.previous_width  = this.selectedMoveItem.width;
	if(this.selectedMoveItem.previous_height === null) this.selectedMoveItem.previous_height = this.selectedMoveItem.height;
};

/**
 *@method selectMoveControl
 */

interaction.prototype.selectMoveControl = function(moveControl, pointerX, pointerY){
	this.selectedMoveItem    = null;
	this.selectedMoveControl = moveControl;
	this.selectedScrollItem  = null;
	this.selectedResizeItem  = null;
	this.selectOffsetX       = this.selectedMoveControl.left - pointerX;
	this.selectOffsetY       = this.selectedMoveControl.top - pointerY;
};

/**
 *@method releaseControl
 */

interaction.prototype.releaseControl = function() { // Same as release item, has been created for clarity of code	
	this.selectedMoveControl = null;
};


/**
 *@method selectScrollItem
 */

interaction.prototype.selectScrollItem = function(scrollItem) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return;
	
	this.selectedMoveItem    = null;
	this.selectedScrollItem  = scrollItem;
	this.selectedResizeItem  = null;
	this.selectedMoveControl = null;
};

/**
 *@method releaseItem
 */

interaction.prototype.releaseItem = function(valid) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return null;
	
	var updatedItem = null;
	if(!valid && this.selectedMoveItem !== null){
		this.selectedMoveItem.left   = this.selectedMoveItem.previous_left;
		this.selectedMoveItem.top    = this.selectedMoveItem.previous_top;
		this.selectedMoveItem.width  = this.selectedMoveItem.previous_width;
		this.selectedMoveItem.height = this.selectedMoveItem.previous_height;
		
		updatedItem = {elemId: this.selectedMoveItem.id, elemLeft: this.selectedMoveItem.left, elemTop: this.selectedMoveItem.top, elemWidth: this.selectedMoveItem.width, elemHeight: this.selectedMoveItem.height, date: new Date()};
	}
	
	if(valid && this.selectedMoveItem !== null && this.selectedMoveItem.maximized === false){
		this.selectedMoveItem.previous_left   = null;
		this.selectedMoveItem.previous_top    = null;
		this.selectedMoveItem.previous_width  = null;
		this.selectedMoveItem.previous_height = null;
	}
	
	this.selectedMoveItem   = null;
	this.selectedScrollItem = null;
	this.selectedResizeItem = null;
	
	return updatedItem;

};


/**
 *@method moveSelectedItem
 */

interaction.prototype.moveSelectedItem = function(pointerX, pointerY) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return null;
	if(this.selectedMoveItem === null) return null;
	
	this.selectedMoveItem.left = pointerX + this.selectOffsetX;
	this.selectedMoveItem.top  = pointerY + this.selectOffsetY;
	this.selectedMoveItem.maximized = false;

	return {elemId: this.selectedMoveItem.id, elemLeft: this.selectedMoveItem.left, elemTop: this.selectedMoveItem.top, elemWidth: this.selectedMoveItem.width, elemHeight: this.selectedMoveItem.height, date: new Date()};
};

/**
 *@method moveSelectedControl
 */

interaction.prototype.moveSelectedControl = function(pointerX, pointerY) {
	
	if (this.selectedMoveControl === null) return null;
	
	this.selectedMoveControl.left = pointerX + this.selectOffsetX;
	this.selectedMoveControl.top  = pointerY + this.selectOffsetY;

	return {elemId: this.selectedMoveControl.id, elemLeft: this.selectedMoveControl.left, elemTop: this.selectedMoveControl.top, elemWidth: this.selectedMoveControl.width, elemHeight: this.selectedMoveControl.height, date: new Date()};
};


/**
 *@method lockedControl
 */

interaction.prototype.lockedControl = function() {
	return this.controlLock;
};

/**
 *@method lockControl
 */

interaction.prototype.lockControl = function(ctrl) {
	this.controlLock = ctrl;
};

/**
 *@method dropControl
 */

interaction.prototype.dropControl = function() {
	this.controlLock = null;
};

/**
 *@method scrollSelectedItem
 */

interaction.prototype.scrollSelectedItem = function(scale) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return null;
	if(this.selectedScrollItem === null) return null;
	
	var iWidth = this.selectedScrollItem.width * scale;
	var iHeight = iWidth / this.selectedScrollItem.aspect;
	if(iWidth < this.configuration.ui.minWindowWidth){
		iWidth  = this.configuration.ui.minWindowWidth;
		iHeight = iWidth / this.selectedScrollItem.aspect;
	}
	if(iWidth > this.configuration.ui.maxWindowWidth){
		iWidth  = this.configuration.ui.maxWindowWidth;
		iHeight = iWidth / this.selectedScrollItem.aspect;
	}
	if(iHeight < this.configuration.ui.minWindowHeight){
		iHeight = this.configuration.ui.minWindowHeight;
		iWidth  = iHeight * this.selectedScrollItem.aspect;
	}
	if(iHeight > this.configuration.ui.maxWindowHeight){
		iHeight = this.configuration.ui.maxWindowHeight;
		iWidth  = iHeight * this.selectedScrollItem.aspect;
	}
	var iCenterX = this.selectedScrollItem.left + (this.selectedScrollItem.width/2);
	var iCenterY = this.selectedScrollItem.top + (this.selectedScrollItem.height/2);
	
	this.selectedScrollItem.left   = iCenterX - (iWidth/2);  //parseInt(iCenterX - (iWidth/2), 10);
	this.selectedScrollItem.top    = iCenterY - (iHeight/2); //parseInt(iCenterY - (iHeight/2), 10);
	this.selectedScrollItem.width  = iWidth;                 //parseInt(iWidth, 10);
	this.selectedScrollItem.height = iHeight;                //parseInt(iHeight, 10);
	
	this.selectedScrollItem.maximized = false;

	return {elemId: this.selectedScrollItem.id, elemLeft: this.selectedScrollItem.left, elemTop: this.selectedScrollItem.top, elemWidth: this.selectedScrollItem.width, elemHeight: this.selectedScrollItem.height, date: new Date()};
};

/**
 *@method setHoverCornerItem
 */

interaction.prototype.setHoverCornerItem = function(item) {
	this.hoverCornerItem = item;
};

/**
 *@method selectResizeItem
 */

interaction.prototype.selectResizeItem = function(resizeItem, pointerX, pointerY) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return;
	
	this.selectedMoveItem    = null;
	this.selectedScrollItem  = null;
	this.selectedMoveControl = null;
	this.selectedResizeItem  = resizeItem;
	this.selectOffsetX       = this.selectedResizeItem.width  - (pointerX - this.selectedResizeItem.left);
	this.selectOffsetY       = this.selectedResizeItem.height - (pointerY - this.selectedResizeItem.top);
};

/**
 *@method resizeSelectedItem
 */

interaction.prototype.resizeSelectedItem = function(pointerX, pointerY) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return null;
	if(this.selectedResizeItem === null) return null;
	
	var iWidth  = pointerX - this.selectedResizeItem.left + this.selectOffsetX;
	var iHeight = 1;
	var resizeMode = this.SHIFT;

	// Flip the resize mode if resize app preference is 'free'
	if (this.selectedResizeItem.resizeMode === "free")
		resizeMode = ! resizeMode;

	if(resizeMode === true){
		iHeight = pointerY - this.selectedResizeItem.top + this.selectOffsetY;

		if(iWidth  < this.configuration.ui.minWindowWidth)  iWidth  = this.configuration.ui.minWindowWidth;
		if(iHeight < this.configuration.ui.minWindowHeight) iHeight = this.configuration.ui.minWindowHeight;

		if(iWidth  > this.configuration.ui.maxWindowWidth)  iWidth  = this.configuration.ui.maxWindowWidth;
		if(iHeight > this.configuration.ui.maxWindowHeight) iHeight = this.configuration.ui.maxWindowHeight;
		
		this.selectedResizeItem.aspect = iWidth/iHeight;
	}
	else{
		iHeight = iWidth / this.selectedResizeItem.aspect;
		if(iWidth < this.configuration.ui.minWindowWidth){
			iWidth  = this.configuration.ui.minWindowWidth;
			iHeight = iWidth / this.selectedResizeItem.aspect;
		}
		if(iWidth > this.configuration.ui.maxWindowWidth){
			iWidth  = this.configuration.ui.maxWindowWidth;
			iHeight = iWidth / this.selectedResizeItem.aspect;
		}
		if(iHeight < this.configuration.ui.minWindowHeight){
			iHeight = this.configuration.ui.minWindowHeight;
			iWidth  = iHeight * this.selectedResizeItem.aspect;
		}
		if(iHeight > this.configuration.ui.maxWindowHeight){
			iHeight = this.configuration.ui.maxWindowHeight;
			iWidth  = iHeight * this.selectedResizeItem.aspect;
		}
	}
	
	this.selectedResizeItem.width  = iWidth;  //parseInt(iWidth, 10);
	this.selectedResizeItem.height = iHeight; //parseInt(iHeight, 10);
	this.selectedResizeItem.maximized = false;

	return {elemId: this.selectedResizeItem.id, elemLeft: this.selectedResizeItem.left, elemTop: this.selectedResizeItem.top, elemWidth: this.selectedResizeItem.width, elemHeight: this.selectedResizeItem.height, date: new Date()};
};

/**
 *@method maximizeSelectedItem
 */

interaction.prototype.maximizeSelectedItem = function(item) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return null;
	if(item === null) return null;
	
	var wallRatio = this.configuration.totalWidth  / this.configuration.totalHeight;
	var iCenterX  = this.configuration.totalWidth  / 2.0;
	var iCenterY  = this.configuration.totalHeight / 2.0;
	var iWidth    = 1;
	var iHeight   = 1;
	var titleBar = this.configuration.ui.titleBarHeight;
	if (this.configuration.ui.auto_hide_ui===true) titleBar = 0;

	if(this.SHIFT === true){
		item.aspect = item.native_width / item.native_height;
	}
	if (item.aspect > wallRatio) {
		// Image wider than wall
		iWidth  = this.configuration.totalWidth;// - (3*titleBar);
		iHeight = iWidth / item.aspect;
	} else {
		// Wall wider than image
		iHeight = this.configuration.totalHeight - (2*titleBar);// - (3*titleBar);
		iWidth  = iHeight*item.aspect;
	}
	// back up values for restore
	item.previous_left   = item.left;
	item.previous_top    = item.top;
	item.previous_width  = item.width;
	item.previous_height = item.width / item.aspect;

	// calculate new values
	item.left   = iCenterX - (iWidth/2);  //parseInt(iCenterX - (iWidth/2) ,10);
	item.top    = iCenterY - (iHeight/2); //parseInt(iCenterY - (iHeight/2), 10);
	item.width  = iWidth;                 //parseInt(iWidth, 10);
	item.height = iHeight;                //parseInt(iHeight, 10);

	// Shift by 'titleBarHeight' if no auto-hide
	if (this.configuration.ui.auto_hide_ui===true) item.top = item.top - this.configuration.ui.titleBarHeight;

	item.maximized = true;

	return {elemId: item.id, elemLeft: item.left, elemTop: item.top, elemWidth: item.width, elemHeight: item.height, date: new Date()};
};

interaction.prototype.maximizeFullSelectedItem = function(item) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return null;
	if(item === null) return null;

	// back up values for restore
	item.previous_left   = item.left;
	item.previous_top    = item.top;
	item.previous_width  = item.width;
	item.previous_height = item.width / item.aspect;

	// calculate new values
	if (this.configuration.ui.auto_hide_ui===true) {
		item.left   = 0;
		item.top    = -this.configuration.ui.titleBarHeight;
		item.width  = this.configuration.totalWidth;
		item.height = this.configuration.totalHeight;
	} else {
		item.left   = 0;
		item.top    = this.configuration.ui.titleBarHeight;
		item.width  = this.configuration.totalWidth;
		item.height = this.configuration.totalHeight-2*this.configuration.ui.titleBarHeight;
	}

	item.maximized = true;

	return {elemId: item.id, elemLeft: item.left, elemTop: item.top, elemWidth: item.width, elemHeight: item.height, date: new Date()};
};


/**
 *@method maximizeLeftSelectedItem
 */

interaction.prototype.maximizeLeftSelectedItem = function(item) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return null;
	if(item === null) return null;
	var titleBar = this.configuration.ui.titleBarHeight;
	if (this.configuration.ui.auto_hide_ui===true) titleBar = 0;

	var wallRatio = (this.configuration.totalWidth/2.0) / this.configuration.totalHeight;
	var iCenterX  = this.configuration.totalWidth/4.0;
	var iCenterY  = this.configuration.totalHeight/2.0;
	var iWidth    = 1;
	var iHeight   = 1;
	if(this.SHIFT === true){
		item.aspect = item.native_width / item.native_height;
	}
	if (item.aspect > wallRatio) {
		// Image wider than wall
		iWidth  = (this.configuration.totalWidth/2.0) - (3*titleBar);
		iHeight = iWidth / item.aspect;
	} else {
		// Wall wider than image
		iHeight = this.configuration.totalHeight - (3*titleBar);
		iWidth  = iHeight*item.aspect;
	}
	// back up values for restore
	item.previous_left   = item.left;
	item.previous_top    = item.top;
	item.previous_width  = item.width;
	item.previous_height = item.width / item.aspect;

	// calculate new values
	item.left   = iCenterX - (iWidth/2);  //parseInt(iCenterX - (iWidth/2) ,10);
	item.top    = iCenterY - (iHeight/2); //parseInt(iCenterY - (iHeight/2), 10);
	item.width  = iWidth;                 //parseInt(iWidth, 10);
	item.height = iHeight;                //parseInt(iHeight, 10);

	item.maximized = true;

	return {elemId: item.id, elemLeft: item.left, elemTop: item.top, elemWidth: item.width, elemHeight: item.height, date: new Date()};
};

/**
 *@method maximizeRightSelectedItem
 */

interaction.prototype.maximizeRightSelectedItem = function(item) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return null;
	if(item === null) return null;
	var titleBar = this.configuration.ui.titleBarHeight;
	if (this.configuration.ui.auto_hide_ui===true) titleBar = 0;

	var wallRatio = (this.configuration.totalWidth/2.0) / this.configuration.totalHeight;
	var iCenterX  = 3*this.configuration.totalWidth/4.0;
	var iCenterY  = this.configuration.totalHeight/2.0;
	var iWidth    = 1;
	var iHeight   = 1;
	if(this.SHIFT === true){
		item.aspect = item.native_width / item.native_height;
	}
	if (item.aspect > wallRatio) {
		// Image wider than wall
		iWidth  = (this.configuration.totalWidth/2.0) - (3*titleBar);
		iHeight = iWidth / item.aspect;
	} else {
		// Wall wider than image
		iHeight = this.configuration.totalHeight - (3*titleBar);
		iWidth  = iHeight*item.aspect;
	}
	// back up values for restore
	item.previous_left   = item.left;
	item.previous_top    = item.top;
	item.previous_width  = item.width;
	item.previous_height = item.width / item.aspect;

	// calculate new values
	item.left   = iCenterX - (iWidth/2);  //parseInt(iCenterX - (iWidth/2) ,10);
	item.top    = iCenterY - (iHeight/2); //parseInt(iCenterY - (iHeight/2), 10);
	item.width  = iWidth;                 //parseInt(iWidth, 10);
	item.height = iHeight;                //parseInt(iHeight, 10);

	item.maximized = true;

	return {elemId: item.id, elemLeft: item.left, elemTop: item.top, elemWidth: item.width, elemHeight: item.height, date: new Date()};
};

/**
 *@method maximizeTopSelectedItem
 */

interaction.prototype.maximizeTopSelectedItem = function(item) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return null;
	if(item === null) return null;
	var titleBar = this.configuration.ui.titleBarHeight;
	if (this.configuration.ui.auto_hide_ui===true) titleBar = 0;

	var wallRatio = this.configuration.totalWidth / (this.configuration.totalHeight/2);
	var iCenterX  = this.configuration.totalWidth/2.0;
	var iCenterY  = this.configuration.totalHeight/4.0;
	var iWidth    = 1;
	var iHeight   = 1;
	if(this.SHIFT === true){
		item.aspect = item.native_width / item.native_height;
	}
	if (item.aspect > wallRatio) {
		// Image wider than wall
		iWidth  = this.configuration.totalWidth - (3*titleBar);
		iHeight = iWidth / item.aspect;
	} else {
		// Wall wider than image
		iHeight = (this.configuration.totalHeight/2.0) - (3*titleBar);
		iWidth  = iHeight*item.aspect;
	}
	// back up values for restore
	item.previous_left   = item.left;
	item.previous_top    = item.top;
	item.previous_width  = item.width;
	item.previous_height = item.width / item.aspect;

	// calculate new values
	item.left   = iCenterX - (iWidth/2);  //parseInt(iCenterX - (iWidth/2) ,10);
	item.top    = iCenterY - (iHeight/2); //parseInt(iCenterY - (iHeight/2), 10);
	item.width  = iWidth;                 //parseInt(iWidth, 10);
	item.height = iHeight;                //parseInt(iHeight, 10);

	item.maximized = true;

	return {elemId: item.id, elemLeft: item.left, elemTop: item.top, elemWidth: item.width, elemHeight: item.height, date: new Date()};
};

/**
 *@method maximizeBottomSelectedItem
 */

interaction.prototype.maximizeBottomSelectedItem = function(item) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return null;
	if(item === null) return null;
	var titleBar = this.configuration.ui.titleBarHeight;
	if (this.configuration.ui.auto_hide_ui===true) titleBar = 0;

	var wallRatio = this.configuration.totalWidth / (this.configuration.totalHeight/2.0);
	var iCenterX  = this.configuration.totalWidth/2.0;
	var iCenterY  = 3*this.configuration.totalHeight/4.0;
	var iWidth    = 1;
	var iHeight   = 1;
	if(this.SHIFT === true){
		item.aspect = item.native_width / item.native_height;
	}
	if (item.aspect > wallRatio) {
		// Image wider than wall
		iWidth  = this.configuration.totalWidth - (3*titleBar);
		iHeight = iWidth / item.aspect;
	} else {
		// Wall wider than image
		iHeight = (this.configuration.totalHeight/2) - (3*titleBar);
		iWidth  = iHeight*item.aspect;
	}
	// back up values for restore
	item.previous_left   = item.left;
	item.previous_top    = item.top;
	item.previous_width  = item.width;
	item.previous_height = item.width / item.aspect;

	// calculate new values
	item.left   = iCenterX - (iWidth/2);  //parseInt(iCenterX - (iWidth/2) ,10);
	item.top    = iCenterY - (iHeight/2); //parseInt(iCenterY - (iHeight/2), 10);
	item.width  = iWidth;                 //parseInt(iWidth, 10);
	item.height = iHeight;                //parseInt(iHeight, 10);

	item.maximized = true;

	return {elemId: item.id, elemLeft: item.left, elemTop: item.top, elemWidth: item.width, elemHeight: item.height, date: new Date()};
};

/**
 *@method restoreSelectedItem
 */

interaction.prototype.restoreSelectedItem = function(item) {
	if(this.interactionMode != MODE.WINDOW_MANAGEMENT) return null;
	if(item === null) return null;

	item.left   = item.previous_left;
	item.top    = item.previous_top;
	item.width  = item.previous_width;
	item.height = item.previous_height;
	
	item.maximized = false;

	return {elemId: item.id, elemLeft: item.left, elemTop: item.top, elemWidth: item.width, elemHeight: item.height, date: new Date()};
};

/**
 *@method isWindowManagementMode
 */

interaction.prototype.isWindowManagementMode = function() {
	return this.interactionMode == MODE.WINDOW_MANAGEMENT;
};

/**
 *@method isAppInteractionMode
 */

interaction.prototype.isAppInteractionMode = function() {
	return this.interactionMode == MODE.APP_INTERACTION;
};

/**
 *@method selectWindowManagementMode
 */

interaction.prototype.selectWindowManagementMode = function() {
	this.interactionMode = MODE.WINDOW_MANAGEMENT;
	
	this.selectedMoveItem   = null;
	this.selectedScrollItem = null;
	this.selectedResizeItem = null;
};

/**
 *@method selectAppInteractionMode
 */

interaction.prototype.selectAppInteractionMode = function() {
	this.interactionMode = MODE.APP_INTERACTION;
	console.log("interaction: " + this.interactionMode);
	
	this.selectedMoveItem   = null;
	this.selectedScrollItem = null;
	this.selectedResizeItem = null;
};

/**
 *@method toggleModes
 */

interaction.prototype.toggleModes = function(){
    if( this.interactionMode == MODE.WINDOW_MANAGEMENT )
        this.interactionMode = MODE.APP_INTERACTION; 
    else if( this.interactionMode ==  MODE.APP_INTERACTION )
        this.interactionMode = MODE.WINDOW_MANAGEMENT;
    
    this.selectedMoveItem   = null;
	this.selectedScrollItem = null;
	this.selectedResizeItem = null;
};

/**
 *@method windowManagementMode
 */

interaction.prototype.windowManagementMode = function(){
    return this.interactionMode == MODE.WINDOW_MANAGEMENT;
};

/**
 *@method appInteractionMode
 */

interaction.prototype.appInteractionMode = function(){
    return this.interactionMode == MODE.APP_INTERACTION;
};

module.exports = interaction;
