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
 * @module server
 * @submodule interaction
 */

// require variables to be declared
"use strict";

var MODE = {WINDOW_MANAGEMENT: 0, APP_INTERACTION: 1};

/**
 * @class Interaction
 * @constructor
 */

function Interaction(config) {
	this.selectedMoveItem    = null;
	this.selectedScrollItem  = null;
	this.selectedResizeItem  = null;
	this.selectedMoveControl = null;
	this.previousInteractionItem = null;
	this.controlLock     = null;
	this.hoverControlItem = null;
	this.hoverCornerItem = null;
	this.selectOffsetX   = 0;
	this.selectOffsetY   = 0;
	this.selectTimeId    = {};
	this.portal = null;
	this.interactionMode = MODE.WINDOW_MANAGEMENT;
	this.previousMode    = MODE.APP_INTERACTION;
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

Interaction.prototype.selectMoveItem = function(moveItem, pointerX, pointerY) {
	this.selectedMoveItem    = moveItem;
	this.selectedMoveControl = null;
	// this.selectedScrollItem  = null;
	this.selectedResizeItem  = null;
	this.selectOffsetX = this.selectedMoveItem.left - pointerX;
	this.selectOffsetY = this.selectedMoveItem.top - pointerY;

	if (this.selectedMoveItem.previous_left === null) {
		this.selectedMoveItem.previous_left = this.selectedMoveItem.left;
	}
	if (this.selectedMoveItem.previous_top === null) {
		this.selectedMoveItem.previous_top = this.selectedMoveItem.top;
	}
	if (this.selectedMoveItem.previous_width === null) {
		this.selectedMoveItem.previous_width = this.selectedMoveItem.width;
	}
	if (this.selectedMoveItem.previous_height === null) {
		this.selectedMoveItem.previous_height = this.selectedMoveItem.height;
	}
};

/**
 *@method selectMoveControl
 */

Interaction.prototype.selectMoveControl = function(moveControl, pointerX, pointerY) {
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

Interaction.prototype.releaseControl = function() {
	// Same as release item, has been created for clarity of code
	this.selectedMoveControl = null;
};


/**
 *@method selectScrollItem
 */

Interaction.prototype.selectScrollItem = function(scrollItem) {
	this.selectedMoveItem    = null;
	this.selectedScrollItem  = scrollItem;
	this.selectedResizeItem  = null;
	this.selectedMoveControl = null;
};

/**
 *@method releaseItem
 */

Interaction.prototype.releaseItem = function(valid) {
	var updatedItem = null;
	if (!valid && this.selectedMoveItem !== null) {
		this.selectedMoveItem.left   = this.selectedMoveItem.previous_left;
		this.selectedMoveItem.top    = this.selectedMoveItem.previous_top;
		this.selectedMoveItem.width  = this.selectedMoveItem.previous_width;
		this.selectedMoveItem.height = this.selectedMoveItem.previous_height;

		updatedItem = {
			elemId: this.selectedMoveItem.id, elemLeft: this.selectedMoveItem.left,
			elemTop: this.selectedMoveItem.top, elemWidth: this.selectedMoveItem.width,
			elemHeight: this.selectedMoveItem.height, date: new Date()
		};
	}

	if (valid && this.selectedMoveItem !== null && this.selectedMoveItem.maximized === false) {
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

Interaction.prototype.moveSelectedItem = function(pointerX, pointerY) {
	if (this.selectedMoveItem === null) {
		return null;
	}

	// testing maximized item slide constrained by edges of screen
	// this.selectedMoveItem.left = pointerX + this.selectOffsetX;
	// this.selectedMoveItem.top  = pointerY + this.selectOffsetY;
	// this.selectedMoveItem.maximized = false;

	// save the bottom and right coordinates for later use
	let botCoord = this.selectedMoveItem.top + this.selectedMoveItem.height;
	let rightCoord = this.selectedMoveItem.left + this.selectedMoveItem.width;

	if (!this.selectedMoveItem.maximized) {
		// move window as normal
		this.selectedMoveItem.left = pointerX + this.selectOffsetX;
		this.selectedMoveItem.top  = pointerY + this.selectOffsetY;

	} else {
		// if it is maximized
		if (this.selectedMoveItem.maximizeConstraint === "width") {
			// if maximization is constrained by width
			// only translate vertically
			this.selectedMoveItem.left = 0;
			this.selectedMoveItem.top  = pointerY + this.selectOffsetY;

			this.selectedMoveItem.previous_top =
				this.selectedMoveItem.top + this.selectedMoveItem.height / 2 -
				this.selectedMoveItem.previous_height / 2;

		} else if (this.selectedMoveItem.maximizeConstraint === "height") {
			// if maximization is constrained by height
			// only translate horizontally
			this.selectedMoveItem.left = pointerX + this.selectOffsetX;
			this.selectedMoveItem.top  = this.configuration.ui.titleBarHeight;

			this.selectedMoveItem.previous_left =
				this.selectedMoveItem.left + this.selectedMoveItem.width / 2 -
				this.selectedMoveItem.previous_width / 2;
		} else {
			// move window as normal
			// possible to change the way this works at later time
			this.selectedMoveItem.left = pointerX + this.selectOffsetX;
			this.selectedMoveItem.top  = pointerY + this.selectOffsetY;
		} // end if maximizeConstraint === ...

	} // end if maximized ...


	// if it is a snapped partition, subtract the X, Y movement from width, height
	if (this.selectedMoveItem.isSnapping && this.selectedMoveItem.partitionList) {
		this.selectedMoveItem.width = rightCoord - this.selectedMoveItem.left;
		this.selectedMoveItem.height = botCoord - this.selectedMoveItem.top;

		// enforce min width
		if (this.selectedMoveItem.width < this.selectedMoveItem.partitionList.minSize.width) {
			this.selectedMoveItem.width = this.selectedMoveItem.partitionList.minSize.width;
			this.selectedMoveItem.left = rightCoord - this.selectedMoveItem.width;
		}

		// enforce min height
		if (this.selectedMoveItem.height < this.selectedMoveItem.partitionList.minSize.height) {
			this.selectedMoveItem.height = this.selectedMoveItem.partitionList.minSize.height;
			this.selectedMoveItem.top = botCoord - this.selectedMoveItem.height;
		}
	}

	return {
		elemId: this.selectedMoveItem.id, elemLeft: this.selectedMoveItem.left,
		elemTop: this.selectedMoveItem.top, elemWidth: this.selectedMoveItem.width,
		elemHeight: this.selectedMoveItem.height, date: new Date()
	};
};

/**
 *@method moveSelectedControl
 */

Interaction.prototype.moveSelectedControl = function(pointerX, pointerY) {
	if (this.selectedMoveControl === null) {
		return null;
	}

	this.selectedMoveControl.left = pointerX + this.selectOffsetX;
	this.selectedMoveControl.top  = pointerY + this.selectOffsetY;

	return {
		elemId: this.selectedMoveControl.id, appId: this.selectedMoveControl.appId,
		elemLeft: this.selectedMoveControl.left, elemTop: this.selectedMoveControl.top,
		elemWidth: this.selectedMoveControl.width, elemHeight: this.selectedMoveControl.height,
		elemBarHeight: this.selectedMoveControl.barHeight, hasSideBar: this.selectedMoveControl.hasSideBar,
		date: Date.now()
	};
};


/**
 *@method lockedControl
 */

Interaction.prototype.lockedControl = function() {
	return this.controlLock;
};

/**
 *@method lockControl
 */

Interaction.prototype.lockControl = function(ctrl) {
	this.controlLock = ctrl;
};

/**
 *@method hoverOverControl
 */

Interaction.prototype.hoverOverControl = function() {
	return this.hoverControlItem;
};

/**
 *@method leaveControlArea
 */

Interaction.prototype.leaveControlArea = function() {
	this.hoverControlItem = null;
};

/**
 *@method enterControlArea
 */

Interaction.prototype.enterControlArea = function(controlItem) {
	this.hoverControlItem = controlItem;
};

/**
 *@method pressOnItem
 */

Interaction.prototype.pressOnItem = function(item) {
	this.pressedItem = item;
};

/**
 *@method releaseOnItem
 */

Interaction.prototype.releaseOnItem = function() {
	var item = this.pressedItem;
	this.pressedItem = null;
	return item;
};


/**
 *@method dropControl
 */

Interaction.prototype.dropControl = function() {
	this.controlLock = null;
};

/**
 *@method scrollSelectedItem
 */

Interaction.prototype.scrollSelectedItem = function(scale) {
	if (this.selectedScrollItem === null) {
		return null;
	}

	var iWidth = this.selectedScrollItem.width * scale;
	var iHeight = iWidth / this.selectedScrollItem.aspect;
	if (iWidth < this.configuration.ui.minWindowWidth) {
		iWidth  = this.configuration.ui.minWindowWidth;
		iHeight = iWidth / this.selectedScrollItem.aspect;
	}
	if (iWidth > this.configuration.ui.maxWindowWidth) {
		iWidth  = this.configuration.ui.maxWindowWidth;
		iHeight = iWidth / this.selectedScrollItem.aspect;
	}
	if (iHeight < this.configuration.ui.minWindowHeight) {
		iHeight = this.configuration.ui.minWindowHeight;
		iWidth  = iHeight * this.selectedScrollItem.aspect;
	}
	if (iHeight > this.configuration.ui.maxWindowHeight) {
		iHeight = this.configuration.ui.maxWindowHeight;
		iWidth  = iHeight * this.selectedScrollItem.aspect;
	}
	var iCenterX = this.selectedScrollItem.left + (this.selectedScrollItem.width / 2);
	var iCenterY = this.selectedScrollItem.top + (this.selectedScrollItem.height / 2);

	this.selectedScrollItem.left   = iCenterX - (iWidth / 2);
	this.selectedScrollItem.top    = iCenterY - (iHeight / 2);
	this.selectedScrollItem.width  = iWidth;
	this.selectedScrollItem.height = iHeight;

	this.selectedScrollItem.maximized = false;

	return {
		elemId: this.selectedScrollItem.id, elemLeft: this.selectedScrollItem.left,
		elemTop: this.selectedScrollItem.top, elemWidth: this.selectedScrollItem.width,
		elemHeight: this.selectedScrollItem.height, date: new Date()
	};
};

/**
 *@method setHoverCornerItem
 */

Interaction.prototype.setHoverCornerItem = function(item) {
	this.hoverCornerItem = item;
};

/**
 *@method selectResizeItem
 */

Interaction.prototype.selectResizeItem = function(resizeItem, pointerX, pointerY) {
	this.selectedMoveItem    = null;
	// this.selectedScrollItem  = null;
	this.selectedMoveControl = null;
	this.selectedResizeItem  = resizeItem;
	this.selectOffsetX       = this.selectedResizeItem.width  - (pointerX - this.selectedResizeItem.left);
	this.selectOffsetY       = this.selectedResizeItem.height - (pointerY - this.selectedResizeItem.top);
};

/**
 *@method resizeSelectedItem
 */

Interaction.prototype.resizeSelectedItem = function(pointerX, pointerY) {
	if (this.selectedResizeItem === null) {
		return null;
	}

	// save the bottom and right coordinates for later use
	let botCoord = this.selectedResizeItem.top + this.selectedResizeItem.height;
	let rightCoord = this.selectedResizeItem.left + this.selectedResizeItem.width;


	var iWidth  = pointerX - this.selectedResizeItem.left + this.selectOffsetX;
	var iHeight = 1;
	var resizeMode = this.SHIFT;

	// Flip the resize mode if resize app preference is 'free'
	if (this.selectedResizeItem.resizeMode === "free") {
		resizeMode = !resizeMode;
	}

	if (resizeMode === true) {
		iHeight = pointerY - this.selectedResizeItem.top + this.selectOffsetY;

		if (iWidth  < this.configuration.ui.minWindowWidth) {
			iWidth  = this.configuration.ui.minWindowWidth;
		}
		if (iHeight < this.configuration.ui.minWindowHeight) {
			iHeight = this.configuration.ui.minWindowHeight;
		}

		if (iWidth  > this.configuration.ui.maxWindowWidth) {
			iWidth  = this.configuration.ui.maxWindowWidth;
		}
		if (iHeight > this.configuration.ui.maxWindowHeight) {
			iHeight = this.configuration.ui.maxWindowHeight;
		}

		this.selectedResizeItem.aspect = iWidth / iHeight;
	} else {
		iHeight = iWidth / this.selectedResizeItem.aspect;
		if (iWidth < this.configuration.ui.minWindowWidth) {
			iWidth  = this.configuration.ui.minWindowWidth;
			iHeight = iWidth / this.selectedResizeItem.aspect;
		}
		if (iWidth > this.configuration.ui.maxWindowWidth) {
			iWidth  = this.configuration.ui.maxWindowWidth;
			iHeight = iWidth / this.selectedResizeItem.aspect;
		}
		if (iHeight < this.configuration.ui.minWindowHeight) {
			iHeight = this.configuration.ui.minWindowHeight;
			iWidth  = iHeight * this.selectedResizeItem.aspect;
		}
		if (iHeight > this.configuration.ui.maxWindowHeight) {
			iHeight = this.configuration.ui.maxWindowHeight;
			iWidth  = iHeight * this.selectedResizeItem.aspect;
		}
	}

	if (this.selectedResizeItem.partition) {
		// if the item is in a partition
		if (this.selectedResizeItem.maximized) {
			// and it is maximized
			// cancel maximized state of partition
			this.selectedResizeItem.partition.innerMaximization = false;
		}
		if (this.selectedResizeItem.partition.innerTiling) {
			// if the partition is tiled
			// cancel the tiled state of the partition
			this.selectedResizeItem.partition.toggleInnerTiling();
		}
	}

	this.selectedResizeItem.width  = iWidth;
	this.selectedResizeItem.height = iHeight;
	this.selectedResizeItem.maximized = false;


	// if it is a partition enforce minimum size constraints
	if (this.selectedResizeItem.partitionList) {
		// enforce min width
		if (this.selectedResizeItem.width < this.selectedResizeItem.partitionList.minSize.width) {
			this.selectedResizeItem.width = this.selectedResizeItem.partitionList.minSize.width;
			this.selectedResizeItem.left = rightCoord - this.selectedResizeItem.width;
		}

		// enforce min height
		if (this.selectedResizeItem.height < this.selectedResizeItem.partitionList.minSize.height) {
			this.selectedResizeItem.height = this.selectedResizeItem.partitionList.minSize.height;
			this.selectedResizeItem.top = botCoord - this.selectedResizeItem.height;
		}
	}

	return {
		elemId: this.selectedResizeItem.id, elemLeft: this.selectedResizeItem.left,
		elemTop: this.selectedResizeItem.top, elemWidth: this.selectedResizeItem.width,
		elemHeight: this.selectedResizeItem.height, date: new Date()
	};
};

/**
 *@method maximizeSelectedItem
 */

Interaction.prototype.maximizeSelectedItem = function(item, centered) {
	if (item === null) {
		return null;
	}

	// normally is just the screen size, but if in partition it is the partition boundaries
	var maxBound = {
		left: 0,
		top: 0,
		width: 0,
		height: 0
	};

	var titleBar = this.configuration.ui.titleBarHeight;
	if (this.configuration.ui.auto_hide_ui === true) {
		titleBar = 0;
	}

	if (item.partitionList && item.isSnapping) {
		// if the item is a partition which is snapped, make it as large as it can get (keeping neighbor positions correct)
		let newSize = item.getMovementBoundaries();

		// back up values for restore
		item.previous_left   = item.left;
		item.previous_top    = item.top;
		item.previous_width  = item.width;
		item.previous_height = item.width / item.aspect;

		item.left = newSize.left.min;
		item.top = newSize.top.min;
		item.width = newSize.right.max - item.left;
		item.height = newSize.bottom.max - item.top;

		item.maximized = true;

	} else if (item.partition) {
		// if the item is content in a partition
		return item.partition.maximizeChild(item.id, this.SHIFT);
	} else {
		// normal wall maximization parameters
		maxBound.left = 0;
		maxBound.top = 0;
		maxBound.width = this.configuration.totalWidth;
		maxBound.height = this.configuration.totalHeight;

		var outerRatio = maxBound.width  / maxBound.height;
		var iCenterX  = centered ? maxBound.left + maxBound.width / 2.0 : item.left + item.width / 2.0;
		var iCenterY  = centered ? maxBound.top + maxBound.height / 2.0 : item.top + item.height / 2.0;
		var iWidth    = 1;
		var iHeight   = 1;


		if (this.SHIFT === true && item.resizeMode === "free") {
			// previously would resize to native height/width
			// item.aspect = item.native_width / item.native_height;

			// Free Resize aspect ratio fills wall
			iWidth = maxBound.width;
			iHeight = maxBound.height - (2 * titleBar);
			item.maximizeConstraint = "none";
		} else {
			if (item.aspect > outerRatio) {
				// Image wider than wall area
				iWidth  = maxBound.width;
				iHeight = iWidth / item.aspect;
				item.maximizeConstraint = "width";
			} else {
				// Wall area than image
				iHeight = maxBound.height - (2 * titleBar);
				iWidth  = iHeight * item.aspect;
				item.maximizeConstraint = "height";
			}
		}

		// back up values for restore
		item.previous_left   = item.left;
		item.previous_top    = item.top;
		item.previous_width  = item.width;
		item.previous_height = item.width / item.aspect;

		// calculate new values
		item.top    = iCenterY - (iHeight / 2);
		item.width  = iWidth;
		item.height = iHeight;

		// keep window inside display horizontally
		if (iCenterX - (iWidth / 2) < maxBound.left) {
			item.left = maxBound.left;
		} else if (iCenterX + (iWidth / 2) > maxBound.left + maxBound.width) {
			item.left = maxBound.width + maxBound.left - iWidth;
		} else {
			item.left = iCenterX - (iWidth / 2);
		}

		// keep window inside display vertically
		if (iCenterY - (iHeight / 2) < maxBound.top + titleBar) {
			item.top = maxBound.top + titleBar;
		} else if (iCenterY + (iHeight / 2) > maxBound.top + maxBound.height) {
			item.top = maxBound.top + maxBound.height - iHeight - titleBar;
		} else {
			item.top = iCenterY - (iHeight / 2);
		}

		// Shift by 'titleBarHeight' if no auto-hide
		if (this.configuration.ui.auto_hide_ui === true) {
			item.top = item.top - this.configuration.ui.titleBarHeight;
		}

		item.maximized = true;

		return {
			elemId: item.id, elemLeft: item.left, elemTop: item.top,
			elemWidth: item.width, elemHeight: item.height, date: new Date()
		};
	}
};

Interaction.prototype.maximizeFullSelectedItem = function(item) {
	if (item === null) {
		return null;
	}

	// back up values for restore
	item.previous_left   = item.left;
	item.previous_top    = item.top;
	item.previous_width  = item.width;
	item.previous_height = item.width / item.aspect;

	// calculate new values
	if (this.configuration.ui.auto_hide_ui === true) {
		item.left   = 0;
		item.top    = -this.configuration.ui.titleBarHeight;
		item.width  = this.configuration.totalWidth;
		item.height = this.configuration.totalHeight;
	} else {
		item.left   = 0;
		item.top    = this.configuration.ui.titleBarHeight;
		item.width  = this.configuration.totalWidth;
		item.height = this.configuration.totalHeight - 2 * this.configuration.ui.titleBarHeight;
	}

	item.maximized = true;

	return {
		elemId: item.id, elemLeft: item.left, elemTop: item.top,
		elemWidth: item.width, elemHeight: item.height, date: new Date()
	};
};


/**
 *@method restoreSelectedItem
 */
Interaction.prototype.restoreSelectedItem = function(item) {
	if (item === null) {
		return null;
	}

	if (item.partition) {
		return item.partition.restoreChild(item.id, this.SHIFT);
	}

	if (this.SHIFT === true) {
		// resize to native width/height
		item.aspect = item.native_width / item.native_height;
		item.left = item.previous_left + item.previous_width / 2 - item.native_width / 2;
		item.top = item.previous_top + item.previous_height / 2 - item.native_height / 2;
		item.width = item.native_width;
		item.height = item.native_height;
	} else {
		item.left   = item.previous_left;
		item.top    = item.previous_top;
		item.width  = item.previous_width;
		item.height = item.previous_height;
	}

	item.maximized = false;

	return {
		elemId: item.id, elemLeft: item.left, elemTop: item.top,
		elemWidth: item.width, elemHeight: item.height, date: new Date()
	};
};

/**
 *@method isWindowManagementMode
 */
Interaction.prototype.isWindowManagementMode = function() {
	return this.interactionMode === MODE.WINDOW_MANAGEMENT;
};

/**
 *@method isAppInteractionMode
 */
Interaction.prototype.isAppInteractionMode = function() {
	return this.interactionMode === MODE.APP_INTERACTION;
};

/**
 *@method selectWindowManagementMode
 */
Interaction.prototype.selectWindowManagementMode = function() {
	this.interactionMode = MODE.WINDOW_MANAGEMENT;

	this.selectedMoveItem   = null;
	this.selectedScrollItem = null;
	this.selectedResizeItem = null;
};

/**
 *@method selectAppInteractionMode
 */
Interaction.prototype.selectAppInteractionMode = function() {
	this.interactionMode = MODE.APP_INTERACTION;

	this.selectedMoveItem   = null;
	this.selectedScrollItem = null;
	this.selectedResizeItem = null;
};

/**
 *@method toggleModes
 */
Interaction.prototype.toggleModes = function() {
	if (this.interactionMode === MODE.WINDOW_MANAGEMENT) {
		this.interactionMode = MODE.APP_INTERACTION;
	} else if (this.interactionMode ===  MODE.APP_INTERACTION) {
		this.interactionMode = MODE.WINDOW_MANAGEMENT;
	}

	this.selectedMoveItem   = null;
	this.selectedScrollItem = null;
	this.selectedResizeItem = null;
};

/**
 *@method windowManagementMode
 */
Interaction.prototype.windowManagementMode = function() {
	return this.interactionMode === MODE.WINDOW_MANAGEMENT;
};

/**
 *@method appInteractionMode
 */
Interaction.prototype.appInteractionMode = function() {
	return this.interactionMode === MODE.APP_INTERACTION;
};

/**
 *@method setPreviousInteractionItem
 */
Interaction.prototype.setPreviousInteractionItem = function(item) {
	this.previousInteractionItem = item;
};

/**
 *@method getPreviousInteractionItem
 */
Interaction.prototype.getPreviousInteractionItem = function() {
	return this.previousInteractionItem;
};

/**
 *@method getPreviousMode
 */
Interaction.prototype.getPreviousMode = function() {
	return this.previousMode;
};

/**
 *@method getPreviousMode
 */
Interaction.prototype.saveMode = function() {
	this.previousMode = this.interactionMode;
};

module.exports = Interaction;
