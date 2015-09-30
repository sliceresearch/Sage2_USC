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
	this.left = 0; // left/top is the center of the radial menu, NOT the upper left
	this.top = 0;
	this.visible = true;
	this.wsio = undefined;
	this.thumbnailWindowOpen = false;

	// Default
	this.radialMenuScale = config.ui.widgetControlSize * 0.03;

	if (config.ui.enable_perceptual_scaling) {
		this.radialMenuScale = 1;
		var tileBorders = config.dimensions.tile_borders;
		var pixelsPerMeter = (config.dimensions.tile_width - tileBorders[0] - tileBorders[1]) / config.resolution.width;

		var windowDefaultHeightMeters = thumbnailWindowDefaultSize.y * pixelsPerMeter;

		// https://en.wikipedia.org/wiki/Optimum_HDTV_viewing_distance#Human_visual_system_limitation

		var width = config.layout.columns * (config.dimensions.tile_width + tileBorders[0] + tileBorders[1]);
		var height = config.layout.rows * (config.dimensions.tile_height + tileBorders[2] + [3]);
		var totalWallDimensionsMeters = { w: width, h: height };
		var wallDiagonal = Math.sqrt(Math.pow(totalWallDimensionsMeters.w, 2) + Math.pow(totalWallDimensionsMeters.h, 2));
		var DRC = Math.sqrt(Math.pow(totalWallDimensionsMeters.w / totalWallDimensionsMeters.h, 2) + 1);
		var calculatedIdealViewingDistance = wallDiagonal / (DRC * thumbnailWindowDefaultSize.y * Math.tan(Math.PI / 180 / 60));

		var viewDistRatio = config.layout.rows * (config.dimensions.tile_height + tileBorders[2] + tileBorders[3]);

		if (config.ui.use_calcuated_viewing_distance) {
			viewDistRatio = calculatedIdealViewingDistance / windowDefaultHeightMeters;
			console.log("node-radialMenu: calculatedIdealViewingDistance = " + calculatedIdealViewingDistance);

			this.radialMenuScale = calculatedIdealViewingDistance * (0.03 * viewDistRatio);
		} else {
			viewDistRatio = config.dimensions.viewing_distance / windowDefaultHeightMeters;
			this.radialMenuScale = config.dimensions.viewing_distance * (0.03 * viewDistRatio);
		}
		console.log("node-radialMenu: this.radialMenuScale = " + this.radialMenuScale);
	}

	this.radialMenuSize = {x: radialMenuDefaultSize.x * this.radialMenuScale,
							y: radialMenuDefaultSize.y * this.radialMenuScale };
	this.thumbnailWindowSize = {x: thumbnailWindowDefaultSize.x * this.radialMenuScale,
								y: thumbnailWindowDefaultSize.y * this.radialMenuScale };
	this.activeEventIDs = [];

	this.dragState = false;
	this.dragID = -1;
	this.dragPosition = { x: 0, y: 0 };

	// States
	this.thumbnailWindowState = "closed"; // closed, images, pdfs, videos, applauncher, sessions
	this.thumbnailWindowScrollPosition = 0;

	this.buttonState = []; // idle, lit, over for every radial menu button

	this.radialButtons = {};

	this.buttonAngle = 36; // Degrees of separation between each radial button position
	this.menuButtonSize = 100;
	this.menuRadius = 110;

	this.pointersOnMenu = {}; // Stores the pointerIDs that are on the menu, but not on a button

	// id - unique button id
	// icon - button icon
	// radialPosition - 0 = top of menu, 1 = buttonAngle degrees clockwise, 2 = buttonAngle*2 degrees clockwise, etc.
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
	this.radialButtons.saveSession = {id: 5, icon: "images/ui/savesession.svg", radialPosition: 5, radialLevel: 1,
		group: "radialMenu", action: "saveSession", state: 0, pointers: {} };
	// this.radialButtons.settings = {id: 6, icon: "images/ui/arrangement.svg", radialPosition: 6.5, radialLevel: 1,
	// group: "radialMenu", action: "toggleRadial", radial: "settingsMenu", state: 0, pointers: {} };
	this.radialButtons.closeMenu = {id: 7, icon: "images/ui/close.svg", radialPosition: 7.5, radialLevel: 0,
		group: "radialMenu", action: "close", window: "radialMenu", state: 0, pointers: {} };
	// this.radialButtons.tileContent = {id: 8, icon: "images/ui/tilecontent.svg", radialPosition: 7.175, radialLevel: 2,
	// group: "settingsMenu", action: "tileContent", state: 0, pointers: {} };
	// this.radialButtons.clearContent = {id: 9, icon: "images/ui/clearcontent.svg", radialPosition: 7.875, radialLevel: 2,
	// group: "settingsMenu", action: "clearAllContent", state: 0, pointers: {} };
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
		var angle = (90 + this.buttonAngle * buttonInfo.radialPosition) * (Math.PI / 180);
		var position = {x: this.left - (this.menuRadius - buttonRadius / 2) * this.radialMenuScale * Math.cos(angle),
						y: this.top - (this.menuRadius - buttonRadius / 2) * this.radialMenuScale * Math.sin(angle) };
		var visible = true;

		if (buttonInfo.radialLevel === 0) {
			position = {x: this.left - (0 - buttonRadius / 2) * this.radialMenuScale * Math.cos(angle),
						y: this.top - (0 - buttonRadius / 2) * this.radialMenuScale * Math.sin(angle) };
		} else if (buttonInfo.radialLevel !== 1) {
			visible = false;
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
	return {id: this.pointerid, x: this.left, y: this.top, radialMenuSize: this.radialMenuSize,
			thumbnailWindowSize: this.thumbnailWindowSize, radialMenuScale: this.radialMenuScale,
			visble: this.visible, layout: this.radialButtons };
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
	var buttonStates = {};
	var action;
	var otherButtonName;
	
	if( buttonType === "pointerPress" ) {
		// Process based on button type
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
					console.log("Clear button state for "+ otherButtonName);
					delete this.radialButtons[otherButtonName].pointers[pointerID];
					if (Object.keys(this.radialButtons[otherButtonName].pointers).length === 0) {
						if (this.radialButtons[otherButtonName].state !== 0 &&
							this.thumbnailWindowState !== this.radialButtons[otherButtonName].window) {
							this.radialButtons[otherButtonName].state = 0;
						}
					}
					buttonStates[otherButtonName] = this.radialButtons[otherButtonName].state;
				}
			}

			// Set the visibility of the content window
			this.interactMgr.editVisibility(this.id + "_menu_thumbnail", "radialMenus", this.thumbnailWindowState !== "closed");

			action = {type: this.radialButtons[buttonName].action, window: this.radialButtons[buttonName].window};
		} else if (this.radialButtons[buttonName].action === "toggleRadial") { // Actions with parameters
			// Radial submenus
			action = {type: this.radialButtons[buttonName].action, window: this.radialButtons[buttonName].radial};
		} else { // All no parameter actions
			action = {type: this.radialButtons[buttonName].action};
				// Close button
				if (action.type === "close") {
					this.hide();
				}
				// Save session button
				if (action.type === "saveSession") {
					// NOTE: This action is handled by the server
				}
		}
	}
	
	// Update the menu state
	buttonStates[buttonName] = this.radialButtons[buttonName].state;
	return {action: action, buttonState: buttonStates, color: color};
/*
	if (pointerID in this.radialButtons[buttonName].pointers || buttonType === "pointerPress" ) {
		console.log("Existing pointer event: "+pointerID + " on button " + buttonName +" buttonType: "+buttonType);
		if (buttonType === "pointerPress") {
			this.radialButtons[buttonName].state = 2;
			//console.log("RadialMenu PointerPress by pointerID : "+pointerID + " on button " + buttonName);
			
			// Process the button click
			if (this.radialButtons[buttonName].action === "contentWindow") { // Actions with parameters

				// Set thumbnail window and button lit state
				if (this.thumbnailWindowState === this.radialButtons[buttonName].window) {
					this.thumbnailWindowState = "closed";
				} else {
					this.thumbnailWindowState = this.radialButtons[buttonName].window;
					this.radialButtons[buttonName].state = 5;
				}

				// Clear button lit state for other buttonState
				for (otherButtonName in this.radialButtons) {
					if (otherButtonName !== buttonName) {
						console.log("Clear button state for "+ otherButtonName);
						delete this.radialButtons[otherButtonName].pointers[pointerID];
						if (Object.keys(this.radialButtons[otherButtonName].pointers).length === 0) {
							if (this.radialButtons[otherButtonName].state !== 0 &&
								this.thumbnailWindowState !== this.radialButtons[otherButtonName].window) {
								this.radialButtons[otherButtonName].state = 0;
							}
						}
						buttonStates[otherButtonName] = this.radialButtons[otherButtonName].state;
					}
				}
				this.interactMgr.editVisibility(this.id + "_menu_thumbnail", "radialMenus", this.thumbnailWindowState !== "closed");

				action = {type: this.radialButtons[buttonName].action, window: this.radialButtons[buttonName].window};
			} else if (this.radialButtons[buttonName].action === "toggleRadial") { // Actions with parameters
				action = {type: this.radialButtons[buttonName].action, window: this.radialButtons[buttonName].radial};
			} else { // All no parameter actions
				action = {type: this.radialButtons[buttonName].action};

				if (action.type === "close") {
					this.hide();
				}
			}
		} else if (buttonType === "pointerRelease") {
			if (this.radialButtons[buttonName].state !== 5) {
				this.radialButtons[buttonName].state = 4;
			}
		}

		buttonStates[buttonName] = this.radialButtons[buttonName].state;
		return {action: action, buttonState: buttonStates, color: color};
	} else {
		// Clear ID from other buttons (in case pointer moved so fast, that a clear event on menu never happened)
		for (otherButtonName in this.radialButtons) {
			if (otherButtonName !== buttonName) {
				delete this.radialButtons[otherButtonName].pointers[pointerID];
				if (Object.keys(this.radialButtons[otherButtonName].pointers).length === 0) {
					if (this.radialButtons[otherButtonName].state !== 0 &&
						this.thumbnailWindowState !== this.radialButtons[otherButtonName].window) {
						this.radialButtons[otherButtonName].state = 0;
					}
				}
				buttonStates[otherButtonName] = this.radialButtons[otherButtonName].state;
			}
		}
		// console.log("New pointer event: "+pointerID + " on button " + buttonName);
		this.radialButtons[buttonName].pointers[pointerID] = "";
		if (buttonType === "pointerMove" && this.radialButtons[buttonName].state !== 5) {
			this.radialButtons[buttonName].state = 1;
		} else if (buttonType === "pointerPress" && this.radialButtons[buttonName].state !== 5) {
			this.radialButtons[buttonName].state = 2;
		} else if (buttonType === "pointerRelease" && this.radialButtons[buttonName].state !== 5) {
			this.radialButtons[buttonName].state = 4;
		}
		buttonStates[buttonName] = this.radialButtons[buttonName].state;
		delete this.pointersOnMenu[pointerID];
		return {buttonState: buttonStates};
	}
	*/
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
*
*
* @method setScale
*/
RadialMenu.prototype.setScale = function(value) {
	this.radialMenuScale = value / 100;
	this.radialMenuSize = { x: radialMenuDefaultSize.x * this.radialMenuScale,
							y: radialMenuDefaultSize.y * this.radialMenuScale };
	this.thumbnailWindowSize = {x: thumbnailWindowDefaultSize.x * this.radialMenuScale,
								y: thumbnailWindowDefaultSize.y * this.radialMenuScale };
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
	this.show();

	this.left = data.x;
	this.top = data.y;

	this.interactMgr.editGeometry(this.id + "_menu_radial", "radialMenus", "circle",
								{x: this.left, y: this.top, r: this.radialMenuSize.y / 2});
	this.interactMgr.editGeometry(this.id + "_menu_thumbnail", "radialMenus", "rectangle",
								{x: this.getThumbnailWindowPosition().x, y: this.getThumbnailWindowPosition().y,
								w: this.thumbnailWindowSize.x, h: this.thumbnailWindowSize.y});

	for (var buttonName in this.radialButtons) {

		var buttonInfo = this.radialButtons[buttonName];

		var buttonRadius = 25 * this.radialMenuScale;
		var angle = (90 + this.buttonAngle * buttonInfo.radialPosition) * (Math.PI / 180);
		var position = {x: this.left - (this.menuRadius - buttonRadius / 2) * this.radialMenuScale * Math.cos(angle),
						y: this.top - (this.menuRadius - buttonRadius / 2) * this.radialMenuScale * Math.sin(angle) };

		if (buttonInfo.radialLevel === 0) {
			position = {x: this.left - (0 - buttonRadius / 2) * this.radialMenuScale * Math.cos(angle),
						y: this.top - (0 - buttonRadius / 2) * this.radialMenuScale * Math.sin(angle) };
		}

		// console.log("setPosition: " + buttonName + " " +menuRadius * Math.cos(angle) + " " + menuRadius * Math.sin(angle) );
		this.interactMgr.editGeometry(this.id + "_menu_radial_button_" + buttonName, "radialMenus",
									"circle", {x: position.x, y: position.y, r: buttonRadius});
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
	} else {
		return true;
	}
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
		} else if ((data.x > this.left + this.radialMenuSize.x / 2) &&
				(data.x < this.left + this.radialMenuSize.x / 2 + this.thumbnailWindowSize.x) &&
				(data.y > this.top - this.radialMenuSize.y / 2) &&
				(data.y < this.top - this.radialMenuSize.y / 2 + this.thumbnailWindowSize.y)) {
			// Else if over thumbnail window bounding box
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
		} else if (this.thumbnailWindowOpen === true &&
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
		} else if (this.activeEventIDs.indexOf(data.id) !== -1) {
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
