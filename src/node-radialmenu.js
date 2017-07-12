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

"use strict";

// unused: var radialMenuCenter = { x: 210, y: 210 }; // scale applied in ctor
var radialMenuDefaultSize = { x: 425, y: 425 }; // scale applied in ctor
var thumbnailWindowDefaultSize = { x: 1224, y: 860 };

/**
 * Class RadialMenu
 *
 * @class RadialMenu
 * @constructor
 */
function RadialMenu(id, ptrID, config) {
	this.id = id;
	this.pointerid = ptrID;
	this.label = "";
	this.color = [255, 255, 255];
	this.left  = 0; // left/top is the center of the radial menu, NOT the upper left
	this.top   = 0;
	this.visible = true;
	this.wsio    = undefined;

	// Default
	this.radialMenuScale = config.ui.widgetControlSize * 0.03;
	this.minimumMenuRadiusMeters = 0.1; // 5 cm
	this.maximumMenuRadiusMeters;

	if (config.ui.auto_scale_ui) {

		// this.radialMenuScale = 1;
		/*
		var borderLeft, borderRight, borderBottom, borderTop;
		var tileBorders = config.dimensions.tile_borders;
		if (tileBorders) {
			borderLeft   = parseFloat(tileBorders.left)   || 0.0;
			borderRight  = parseFloat(tileBorders.right)  || 0.0;
			borderBottom = parseFloat(tileBorders.bottom) || 0.0;
			borderTop    = parseFloat(tileBorders.top)    || 0.0;
		} else {
			borderLeft   = 0.0;
			borderRight  = 0.0;
			borderBottom = 0.0;
			borderTop    = 0.0;
		}
		var pixelsPerMeter = config.resolution.width / (config.dimensions.tile_width - borderLeft - borderRight);
		var windowDefaultHeightMeters = thumbnailWindowDefaultSize.y / pixelsPerMeter;

		// https://en.wikipedia.org/wiki/Optimum_HDTV_viewing_distance#Human_visual_system_limitation

		var width  = config.layout.columns * (config.dimensions.tile_width + borderLeft + borderRight);
		var height = config.layout.rows * (config.dimensions.tile_height + borderBottom + borderTop);
		var totalWallDimensionsMeters = { w: width, h: height };
		var wallDiagonal = Math.sqrt(Math.pow(totalWallDimensionsMeters.w, 2) + Math.pow(totalWallDimensionsMeters.h, 2));
		var DRC = Math.sqrt(Math.pow(totalWallDimensionsMeters.w / totalWallDimensionsMeters.h, 2) + 1);
		var calculatedIdealViewingDistance = wallDiagonal / (DRC * thumbnailWindowDefaultSize.y * Math.tan(Math.PI / 180 / 60));

		var viewDistRatio = config.layout.rows * (config.dimensions.tile_height + borderBottom + borderTop);

		if (config.ui.calculate_viewing_distance) {
			viewDistRatio = calculatedIdealViewingDistance / windowDefaultHeightMeters;
			console.log("node-radialMenu: calculatedIdealViewingDistance = " + calculatedIdealViewingDistance);
			this.radialMenuScale = calculatedIdealViewingDistance * (0.03 * viewDistRatio);
		} else {
			viewDistRatio = config.dimensions.viewing_distance / windowDefaultHeightMeters;
			this.radialMenuScale = config.dimensions.viewing_distance * (0.03 * viewDistRatio);
		}
		var radialMenuRadiusMeters = radialMenuDefaultSize.x * this.radialMenuScale / pixelsPerMeter;

		// Set radial menu radius bounds
		if (radialMenuRadiusMeters < (2 * this.minimumMenuRadiusMeters)) { // lower
			this.radialMenuScale = 2 * this.minimumMenuRadiusMeters / radialMenuDefaultSize.x * pixelsPerMeter;
		}
		var totalContentWindowSize = {
			w: (radialMenuDefaultSize.x + thumbnailWindowDefaultSize.x) * this.radialMenuScale / pixelsPerMeter,
			h: thumbnailWindowDefaultSize.y * this.radialMenuScale / pixelsPerMeter };

		// Radial menu + thumbnail window can never be more than 90% of the display width or height
		if (totalContentWindowSize.w > totalWallDimensionsMeters.w) {
			this.radialMenuScale = totalWallDimensionsMeters.w * 0.9 / (radialMenuDefaultSize.x +
				thumbnailWindowDefaultSize.x) * pixelsPerMeter;
		}

		// Recalculate size
		totalContentWindowSize = {
			w: (radialMenuDefaultSize.x + thumbnailWindowDefaultSize.x) * this.radialMenuScale / pixelsPerMeter,
			h: (thumbnailWindowDefaultSize.y + 100) * this.radialMenuScale / pixelsPerMeter };

		if (totalContentWindowSize.h > totalWallDimensionsMeters.h) {
			this.radialMenuScale = totalWallDimensionsMeters.h * 0.9 / thumbnailWindowDefaultSize.y * pixelsPerMeter;
		}
		*/
		console.log("node-radialMenu: this.radialMenuScale = " + this.radialMenuScale);
	}

	this.radialMenuSize = {
		x: radialMenuDefaultSize.x * this.radialMenuScale,
		y: radialMenuDefaultSize.y * this.radialMenuScale
	};
	this.thumbnailWindowSize = {
		x: thumbnailWindowDefaultSize.x * this.radialMenuScale,
		y: thumbnailWindowDefaultSize.y * this.radialMenuScale
	};
	this.activeEventIDs = [];

	this.dragState = false;
	this.dragID = -1;
	this.dragPosition = { x: 0, y: 0 };

	// States
	this.thumbnailWindowState = "closed"; // closed, images, pdfs, videos, applauncher, sessions
	this.thumbnailWindowScrollPosition = 0;

	this.buttonStates = {}; // idle, lit, over for every radial menu button

	this.radialButtons = {};

	this.buttonAngle = 36; // Degrees of separation between each radial button position
	this.menuButtonSize = 100;
	this.menuRadius = 95;

	this.pointersOnMenu = {}; // Stores the pointerIDs that are on the menu, but not on a button

	this.showArrangementSubmenu = false;

	// id - unique button id
	// icon - button icon
	// radialPosition - 0 = top of menu, 1 = buttonAngle degrees clockwise, 2 = buttonAngle*2 degrees clockwise, etc.
	this.radialButtons.closeMenu = {id: 7, icon: "images/ui/close.svg", radialPosition: 7.5, radialLevel: 0,
		group: "radialMenu", action: "close", window: "radialMenu", state: 0, pointers: {} };

	this.radialButtons.images = {id: 0, icon: "images/ui/images.svg", radialPosition: 0, radialLevel: 1,
		group: "radialMenu", action: "contentWindow", window: "image", state: 0, pointers: {} };
	this.radialButtons.pdfs = {id: 1, icon: "images/ui/pdfs.svg", radialPosition: 1, radialLevel: 1,
		group: "radialMenu", action: "contentWindow", window: "pdf", state: 0, pointers: {} };
	this.radialButtons.videos = {id: 2, icon: "images/ui/videos.svg", radialPosition: 2, radialLevel: 1,
		group: "radialMenu", action: "contentWindow", window: "video", state: 0, pointers: {} };
	this.radialButtons.apps = {id: 3, icon: "images/ui/applauncher.svg", radialPosition: 3, radialLevel: 1,
		group: "radialMenu", action: "contentWindow", window: "applauncher", state: 0, pointers: {} };
	this.radialButtons.loadSession = {id: 4, icon: "images/ui/loadsession.svg", radialPosition: 4, radialLevel: 1,
		group: "radialMenu", action: "contentWindow", window: "session", state: 0, pointers: {} };

	// Arrangement submenu
	this.radialButtons.settings = {id: 6, icon: "images/ui/arrangement.svg", radialPosition: 6.5, radialLevel: 1,
		group: "radialMenu", action: "toggleSubRadial", radial: "settingsMenu", state: 0, pointers: {} };

	this.radialButtons.tileContent = {id: 8, icon: "images/ui/tilecontent.svg", radialPosition: 6.5, radialLevel: 2,
		group: "settingsMenu", action: "tileContent", state: 0, pointers: {} };
	this.radialButtons.clearContent = {id: 9, icon: "images/ui/clearcontent.svg", radialPosition: 7.1, radialLevel: 2,
		group: "settingsMenu", action: "clearAllContent", state: 0, pointers: {} };
	this.radialButtons.saveSession = {id: 5, icon: "images/ui/savesession.svg", radialPosition: 5.9, radialLevel: 2,
		group: "settingsMenu", action: "saveSession", state: 0, pointers: {} };
}

/**
*	Adds geometry to the Interaction module
*
* @method generateGeometry
* @param interactMgr Interaction manager
*/
RadialMenu.prototype.generateGeometry = function(interactMgr, radialMenus) {
	this.interactMgr = interactMgr;

	this.interactMgr.addGeometry(this.id + "_menu_radial", "radialMenus", "circle",
		{ x: this.left, y: this.top, r: this.radialMenuSize.y / 2},
		true, Object.keys(radialMenus).length, this);
	this.interactMgr.addGeometry(this.id + "_menu_thumbnail", "radialMenus", "rectangle",
		{x: this.left, y: this.top, w: this.thumbnailWindowSize.x, h: this.thumbnailWindowSize.y},
		false, Object.keys(radialMenus).length, this);

	for (var buttonName in this.radialButtons) {
		var buttonInfo = this.radialButtons[buttonName];

		var buttonRadius = 25 * this.radialMenuScale;
		var buttonRadialDistance = this.menuRadius;

		if (buttonInfo.radialLevel == 2) {
			buttonRadialDistance = this.menuRadius * 1.6;
		}

		var angle = (90 + this.buttonAngle * buttonInfo.radialPosition) * (Math.PI / 180);
		var position = {
			x: this.left - (buttonRadialDistance - buttonRadius / 2) * this.radialMenuScale * Math.cos(angle),
			y: this.top - (buttonRadialDistance - buttonRadius / 2) * this.radialMenuScale * Math.sin(angle)
		};
		var visible = true;

		if (buttonInfo.radialLevel === 0) {
			position = {
				x: this.left - (0 - buttonRadius / 2) * this.radialMenuScale * Math.cos(angle),
				y: this.top - (0 - buttonRadius / 2) * this.radialMenuScale * Math.sin(angle)
			};
		} else if (buttonInfo.radialLevel !== 1) {
			// visible = false;
		}

		this.interactMgr.addGeometry(this.id + "_menu_radial_button_" + buttonName, "radialMenus", "circle",
			{x: position.x, y: position.y, r: buttonRadius}, visible, Object.keys(radialMenus).length + 1, this);
	}
};

/**
* Returns information on the radial menu's layout and position
*
* @method getInfo
*/
RadialMenu.prototype.getInfo = function() {
	return {
		id: this.pointerid,
		x: this.left,
		y: this.top,
		radialMenuSize: this.radialMenuSize,
		thumbnailWindowSize: this.thumbnailWindowSize,
		radialMenuScale: this.radialMenuScale,
		visible: this.visible,
		layout: this.radialButtons,
		thumbnailWindowState: this.thumbnailWindowState,
		arrangementMenuState: this.showArrangementSubmenu
	};
};

/**
*
*
* @method onButtonEvent
* @param buttonID
* @param pointerID
* @return stateChange -1 = no change, 0 = now idle, 1 = now mouse over, 2 = now clicked
*/
RadialMenu.prototype.onButtonEvent = function(buttonID, pointerID, buttonType, color) {
	var buttonName = buttonID.substring((this.id + "_menu_radial_button_").length, buttonID.length);
	var action;
	var otherButtonName;

	if (buttonType === "pointerPress") {
		// Process based on button type
		// console.log("node-radialMenu: button press on " + buttonName);
		if (this.radialButtons[buttonName].action === "contentWindow") { // Actions with parameters

			// Set thumbnail window and button lit state
			if (this.thumbnailWindowState === this.radialButtons[buttonName].window) {
				this.thumbnailWindowState = "closed"; // Mark the content window to be closed
				this.radialButtons[buttonName].state = 0; // Dim the current button
			} else {
				this.thumbnailWindowState = this.radialButtons[buttonName].window;
				this.radialButtons[buttonName].state = 5; // Highlight the current button
			}

			// Clear button lit state for other buttonState
			for (otherButtonName in this.radialButtons) {
				if (otherButtonName !== buttonName) {
					// console.log("Clear button state for " + otherButtonName);
					delete this.radialButtons[otherButtonName].pointers[pointerID];
					if (Object.keys(this.radialButtons[otherButtonName].pointers).length === 0) {
						if (this.radialButtons[otherButtonName].state !== 0 &&
							this.thumbnailWindowState !== this.radialButtons[otherButtonName].window) {
							this.radialButtons[otherButtonName].state = 0;
						}
					}
					this.buttonStates[otherButtonName] = this.radialButtons[otherButtonName].state;
				}
			}

			// Set the visibility of the content window
			this.interactMgr.editVisibility(this.id + "_menu_thumbnail", "radialMenus", (this.thumbnailWindowState !== "closed"));

			action = {type: this.radialButtons[buttonName].action, window: this.radialButtons[buttonName].window};
		} else if (this.radialButtons[buttonName].action === "toggleSubRadial") { // Actions with parameters
			// Radial submenus
			action = {type: this.radialButtons[buttonName].action, window: this.radialButtons[buttonName].radial};
			this.showArrangementSubmenu = !this.showArrangementSubmenu;
		} else { // All no parameter actions
			action = {type: this.radialButtons[buttonName].action};
			// Close button
			if (action.type === "close") {
				this.hide();
			}
			if (this.showArrangementSubmenu === false) {
				// Save session button
				if (action.type === "saveSession") {
					// NOTE: This action is handled by the server radialMenuEvent()
					action.type = "none";
				}
				// Tile content
				if (action.type === "tileContent") {
					// NOTE: This action is handled by the server radialMenuEvent()
					action.type = "none";
				}
				// Clear all content button
				if (action.type === "clearAllContent") {
					// NOTE: This action is handled by the server radialMenuEvent()
					action.type = "none";
				}
			}
		}
	}

	// Update the menu state
	this.buttonStates[buttonName] = this.radialButtons[buttonName].state;
	return {action: action, buttonState: this.buttonStates, color: color};
};

/**
*
*
* @method onMenuEvent
* @param pointerID
* @return stateChange
*/
RadialMenu.prototype.onMenuEvent = function(pointerID) {
	if (pointerID in this.pointersOnMenu) {
		// console.log("Existing pointer event on menu: "+pointerID);
	} else {
		// console.log("New pointer event on menu: "+pointerID);
		this.pointersOnMenu[pointerID] = "";

		// Clear this pointer ID from all buttons (clear hover state)
		var buttonStates = {};
		for (var buttonName in this.radialButtons) {
			delete this.radialButtons[buttonName].pointers[pointerID];
			if (Object.keys(this.radialButtons[buttonName].pointers).length === 0) {
				if (this.radialButtons[buttonName].state !== 0 && this.radialButtons[buttonName].state !== 5) {
					this.radialButtons[buttonName].state = 0;
				}
			}
			buttonStates[buttonName] = this.radialButtons[buttonName].state;
		}
		return {buttonState: buttonStates};
	}
};

/**
* Gets the short name of a button given the long name
*
* @method getShortButtonName
* @param longButtonName
*/
RadialMenu.prototype.getShortButtonName = function(longName) {
	var buttonName = longName.substring((this.id + "_menu_radial_button_").length, longName.length);
	return buttonName;
};

/**
* Returns if the thumbnail window is currently open
*
* @method isThumbnailWindowOpen
* @return openState
*/
RadialMenu.prototype.isThumbnailWindowOpen = function() {
	return this.thumbnailWindowState !== "closed";
};

/**
*
*
* @method setScale
*/
RadialMenu.prototype.setScale = function(value) {
	this.radialMenuScale = value / 100;
	this.radialMenuSize = {
		x: radialMenuDefaultSize.x * this.radialMenuScale,
		y: radialMenuDefaultSize.y * this.radialMenuScale
	};
	this.thumbnailWindowSize = {
		x: thumbnailWindowDefaultSize.x * this.radialMenuScale,
		y: thumbnailWindowDefaultSize.y * this.radialMenuScale
	};
};

/**
*
*
* @method show
*/
RadialMenu.prototype.show = function() {
	this.visible = true;
};

/**
*
*
* @method hide
*/
RadialMenu.prototype.hide = function() {
	this.visible = false;
	this.interactMgr.editVisibility(this.id + "_menu_radial", "radialMenus", false);
	this.interactMgr.editVisibility(this.id + "_menu_thumbnail", "radialMenus", false);
	for (var buttonName in this.radialButtons) {
		this.interactMgr.editVisibility(this.id + "_menu_radial_button_" + buttonName, "radialMenus", false);
		this.radialButtons[buttonName].state = 0;
	}
	this.thumbnailWindowState = "closed";
};

/**
*
*
* @method setPosition
*/
RadialMenu.prototype.setPosition = function(data) {
	this.show();

	this.left = data.x;
	this.top = data.y;

	this.interactMgr.editGeometry(this.id + "_menu_radial", "radialMenus", "circle", {
		x: this.left, y: this.top, r: this.radialMenuSize.y / 2
	});
	this.interactMgr.editGeometry(this.id + "_menu_thumbnail", "radialMenus", "rectangle", {
		x: this.getThumbnailWindowPosition().x, y: this.getThumbnailWindowPosition().y,
		w: this.thumbnailWindowSize.x, h: this.thumbnailWindowSize.y
	});

	for (var buttonName in this.radialButtons) {

		var buttonInfo = this.radialButtons[buttonName];

		var buttonRadius = this.menuButtonSize / 4 * this.radialMenuScale;
		var angle = (90 + this.buttonAngle * buttonInfo.radialPosition) * (Math.PI / 180);
		var position = {
			x: this.left - buttonRadius - this.menuRadius * this.radialMenuScale * Math.cos(angle),
			y: this.top - buttonRadius - this.menuRadius * this.radialMenuScale * Math.sin(angle)
		};

		if (buttonInfo.radialLevel === 0) {
			position = {
				x: this.left - buttonRadius,
				y: this.top - buttonRadius
			};
		} else if (buttonInfo.radialLevel === 2) {
			position = {
				x: this.left - buttonRadius - (this.menuRadius * 1.6) * this.radialMenuScale * Math.cos(angle),
				y: this.top - buttonRadius - (this.menuRadius * 1.6) * this.radialMenuScale * Math.sin(angle)
			};
		}

		// console.log("setPosition: " + buttonName + " " +menuRadius * Math.cos(angle) + " " + menuRadius * Math.sin(angle) );
		this.interactMgr.editGeometry(this.id + "_menu_radial_button_" + buttonName, "radialMenus",
			"rectangle", {x: position.x, y: position.y, w: buttonRadius * 2, h: buttonRadius * 2});
		this.interactMgr.editVisibility(this.id + "_menu_radial_button_" + buttonName, "radialMenus", true);
	}
	// console.log("done");
};

/**
*
*
* @method getThumbnailWindowPosition
*/
RadialMenu.prototype.getThumbnailWindowPosition = function() {
	return { x: this.left + this.radialMenuSize.x / 2, y: this.top - this.radialMenuSize.y / 2};
};

/**
*
*
* @method hasEventID
*/
RadialMenu.prototype.hasEventID = function(id) {
	if (this.activeEventIDs.indexOf(id) === -1) {
		return false;
	}
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
		if ((data.x > this.left - this.radialMenuSize.x / 2) &&
			(data.x < this.left - this.radialMenuSize.x / 2 + this.radialMenuSize.x) &&
			(data.y > this.top - this.radialMenuSize.y / 2) &&
			(data.y < this.top - this.radialMenuSize.y / 2 + this.radialMenuSize.y)) {
			return true;
		}
		if ((data.x > this.left + this.radialMenuSize.x / 2) &&
				(data.x < this.left + this.radialMenuSize.x / 2 + this.thumbnailWindowSize.x) &&
				(data.y > this.top - this.radialMenuSize.y / 2) &&
				(data.y < this.top - this.radialMenuSize.y / 2 + this.thumbnailWindowSize.y)) {
			// Else if over thumbnail window bounding box
			if (this.isThumbnailWindowOpen()) {
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
	if (idIndex !== -1 && data.type === "pointerRelease") {
		this.activeEventIDs.splice(idIndex);
	}

	if (this.visible === true) {
		// Press over radial menu, drag menu
		// console.log((this.left - this.radialMenuSize.x / 2), " < ", position.x, " < ",
		//   (this.left - this.radialMenuSize.x / 2 + this.radialMenuSize.x) );
		// console.log((this.top - this.radialMenuSize.y / 2), " < ", position.y, " < ",
		//   (this.top - this.radialMenuSize.y / 2 + this.radialMenuSize.y) );

		// If over radial menu bounding box
		if ((data.x > this.left - this.radialMenuSize.x / 2) &&
			(data.x < this.left - this.radialMenuSize.x / 2 + this.radialMenuSize.x) &&
			(data.y > this.top - this.radialMenuSize.y / 2) &&
			(data.y < this.top - this.radialMenuSize.y / 2 + this.radialMenuSize.y)) {
			// this.windowInteractionMode = false;
			if (this.visible === true && data.type === "pointerPress") {
				this.activeEventIDs.push(data.id);
			}
			return true;
		}
		if (this.isThumbnailWindowOpen() &&
			(data.x > this.left + this.radialMenuSize.x / 2) &&
			(data.x < this.left + this.radialMenuSize.x / 2 + this.thumbnailWindowSize.x) &&
			(data.y > this.top - this.radialMenuSize.y / 2) &&
			(data.y < this.top - this.radialMenuSize.y / 2 + this.thumbnailWindowSize.y)) {
			// Else if over thumbnail window bounding box
			// this.windowInteractionMode = false;
			if (this.visible === true && data.type === "pointerPress") {
				this.activeEventIDs.push(data.id);
			}
			return true;
		}
		if (this.activeEventIDs.indexOf(data.id) !== -1) {
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
RadialMenu.prototype.onMove = function() {
	// console.log( this.hasEventID(id) );
};

/**
*
*
* @method onRelease
*/
RadialMenu.prototype.onRelease = function(id) {
	// console.log("node-RadialMenu.onRelease()");
	this.activeEventIDs.splice(this.activeEventIDs.indexOf(id), 1);
	// console.log("drag state "+ this.dragID + " " + id);
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
		this.dragID = id;
		this.dragState = true;
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
		this.dragPosition = localPos;
	}
	return offset;
};

module.exports = RadialMenu;
