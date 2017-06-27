// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-2015

"use strict";

/**
 * Menu System for SAGE2 Display Clients
 *
 * @module client
 * @submodule RadialMenu
 */

// layout parameters (Defaults based on Cyber-Commons touch interaction)
var imageThumbSize = 75;
var thumbSpacer = 5;

// var thumbnailWindowWidth = 0.8;
var previewWindowWidth = 0.2;
// var previewWindowOffset = 0.74;

var radialMenuCenter = { x: 215, y: 215 }; // scaled in init - based on window size

var angleSeparation = 36;
var initAngle = 90;
var angle = 0;
var menuRadius = 100;
var menuButtonSize = 100; // pie image size
var menuButtonHitboxSize = 50;
var overlayIconScale = 0.5; // image, pdf, etc image

var thumbnailScrollScale = 1;
var thumbnailDisableSelectionScrollDistance = 5; // Distance in pixels scroll window can move before button select is cancelled
var thumbnailWindowSize = { x: 1024, y: 768 };
var thumbnailPreviewWindowSize = { x: 550, y: 800 };

var radialMenuList = {};

// Mostly for debugging, toggles buttons/thumbnails redrawing on a events (like move)
// var enableEventRedraw = false;

// common radial menu icons
var radialMenuIcons = {};

// Creates an image and adds to dictionary with image path as key
function loadImageIcon(src) {
	var newIcon = new Image();
	newIcon.src = src;
	radialMenuIcons[src] = newIcon;
}

var radialButtonIcon = new Image();
radialButtonIcon.src = "images/radialMenu/icon_radial_button_circle.svg";
var radialDragIcon = new Image();
radialDragIcon.src = "images/radialMenu/drag-ring.svg";


var radialMenuLevel2Icon = new Image();
radialMenuLevel2Icon.src = "images/radialMenu/icon_radial_level2_360.png";

// Level 1 radial icons
loadImageIcon("images/ui/close.svg");
loadImageIcon("images/ui/remote.svg");
loadImageIcon("images/ui/pdfs.svg");
loadImageIcon("images/ui/images.svg");
loadImageIcon("images/ui/videos.svg");
loadImageIcon("images/ui/applauncher.svg");
loadImageIcon("images/ui/loadsession.svg");
loadImageIcon("images/ui/savesession.svg");
loadImageIcon("images/ui/arrangement.svg");

// Level 2 radial icons
loadImageIcon("images/ui/clearcontent.svg");
loadImageIcon("images/ui/tilecontent.svg");

/**
 * Radial menu and Thumbnail Content Window
 * @class RadialMenu
 * @constructor
 */
function RadialMenu() {
	this.element = null;
	this.ctx = null;

	this.thumbnailScrollWindowElement = null;
	this.thumbScrollWindowctx = null;

	this.thumbnailScrollWindowElement2 = null;
	this.thumbScrollWindowctx2 = null;

	this.thumbnailWindowSize = thumbnailWindowSize;
	this.imageThumbSize = imageThumbSize;

	// This is the number of thumbnails in the window WITHOUT scrolling
	this.thumbnailGridSize = { x: 10, y: 10 }; // Overwritten in setThumbnailPosition().

	this.level0Buttons = [];
	this.level1Buttons = [];
	this.level2Buttons = [];

	this.radialMenuButtons = {};
	this.thumbnailWindows = {};

	this.thumbnailButtons = [];
	this.imageThumbnailButtons = [];
	this.videoThumbnailButtons = [];
	this.pdfThumbnailButtons = [];
	this.appThumbnailButtons = [];
	this.sessionThumbnailButtons = [];

	/**
	 * Helper function for creating radial menu buttons
	 *
	 * @method addRadialMenuButton
	 * @param name {String} name of the button
	 * @param icon {Image} icon image for the button
	 * @param iconScale {Float} scale factor for icon
	 * @param dim {{buttonSize: float, hitboxSize: float}} object specifying the button display and hitbox size
	 * @param alignment {String} where the center of the button is defined 'left' (default) or 'centered'
	 * @param radialAnglePos {Float} position of the button along the radius. based on angleSeparation and initAngle
	 * @param radialLevel {Float} radial level of button (0 = center, 1 = standard icons, 2 = secondary icons)
	 * @return {ButtonWidget} the ButtonWidget object created
	 */
	this.addRadialMenuButton = function(name, icon, iconScale, dim, alignment, radialAnglePos, radialLevel) {
		var button;

		if (radialLevel === 0) {
			button = this.createRadialButton(radialButtonIcon, false, dim.buttonSize, dim.hitboxSize,
				alignment, dim.shape, radialAnglePos, 0);
			button.setOverlayImage(icon, iconScale);
			button.isLit = true; // Button will stay lit regardless of hover-over
			this.level0Buttons.push(button);
		} else if (radialLevel === 1) {
			button = this.createRadialButton(radialButtonIcon, false, dim.buttonSize, dim.hitboxSize,
				alignment, dim.shape, radialAnglePos, menuRadius);
			button.setOverlayImage(icon, iconScale);
			button.isLit = true; // Button will stay lit regardless of hover-over
			this.level1Buttons.push(button);
		} else if (radialLevel === 2) {
			button = this.createRadialButton(radialButtonIcon, false, dim.buttonSize, dim.hitboxSize,
				alignment, dim.shape, radialAnglePos, menuRadius * 1.6);
			button.setOverlayImage(icon, iconScale);
			button.isLit = true; // Button will stay lit regardless of hover-over
			this.level2Buttons.push(button);
		}
		this.radialMenuButtons[name] = button;
		return button;
	};

	/**
	 * Initialization
	 *
	 * @method init
	 * @param data { id: this.pointerid, x: this.left, y: this.top, radialMenuSize: this.radialMenuSize,
	 *               thumbnailWindowSize: this.thumbnailWindowSize, radialMenuScale: this.radialMenuScale,
	 *               visble: this.visible } Radial menu info from node-radialMenu
	 * @param thumbElem {Element} DOM element for the thumbnail content window
	 * @param thumbElem2 {Element} DOM element for the metadata window (not currently implemented)
	 */
	this.init = function(data, thumbElem, thumbElem2) {
		this.divCtxDebug = false;

		this.id = data.id;
		this.radialMenuScale = data.radialMenuScale;
		// overwritten in init - based on window size
		this.radialMenuCenter = {
			x: radialMenuCenter.x * this.radialMenuScale,
			y: radialMenuCenter.y * this.radialMenuScale
		};
		this.radialMenuSize = data.radialMenuSize;

		this.thumbnailWindowSize.x = data.thumbnailWindowSize.x;
		this.thumbnailWindowSize.y = data.thumbnailWindowSize.y;
		this.imageThumbSize = imageThumbSize * this.radialMenuScale;

		this.textHeaderHeight = 32 * this.radialMenuScale;

		// gets because pointer is assumed to be created with initial connection (else createElement( canvas tag)
		this.element = document.getElementById(this.id + "_menu");
		this.ctx = this.element.getContext("2d");

		this.resrcPath = "images/radialMenu/";

		this.menuID = this.id + "_menu";
		this.currentMenuState = "radialMenu";
		this.currentRadialState = "radialMenu";

		this.showArrangementSubmenu = false;
		this.settingMenuOpen = false;

		this.timer = 0;
		this.menuState = "open";
		this.stateTransition = 0;
		this.stateTransitionTime = 1;

		this.visible = true;
		this.windowInteractionMode = false;
		this.ctx.redraw = true;
		this.dragPosition = { x: 0, y: 0 };

		this.notEnoughThumbnailsToScroll = false; // Flag to stop scrolling if there are not enough thumbnails
		this.dragThumbnailWindow = false;
		this.thumbnailWindowPosition = {
			x: (this.radialMenuCenter.x * 2 + this.imageThumbSize / 2),
			y: 30 * this.radialMenuScale };
		this.thumbnailWindowDragPosition = { x: 0, y: 0 };
		this.thumbnailWindowScrollOffset = { x: 0, y: 0 };
		this.thumbnailWindowInitialScrollOffset = { x: 0, y: 0 };
		this.maxThumbnailScrollDistance = 0;

		this.radialMenuDiv = document.getElementById(this.id + "_menu");
		this.thumbnailWindowDiv = document.getElementById(this.id + "_menuDiv");

		// Debug: Show scrolling window background
		if (this.divCtxDebug) {
			this.thumbnailWindowDiv.style.backgroundColor = "rgba(10,50,200,0.2)";
		}

		this.thumbnailScrollWindowElement = thumbElem;
		this.thumbScrollWindowctx = this.thumbnailScrollWindowElement.getContext("2d");

		this.thumbnailWindowScrollLock = { x: false, y: true };
		this.scrollOpenContentLock = false; // Stop opening content/app if window is scrolling

		this.thumbnailScrollWindowElement.width = this.thumbnailWindowSize.x - this.thumbnailWindowPosition.x;
		this.thumbnailScrollWindowElement.height = this.thumbnailWindowSize.y - this.thumbnailWindowPosition.y;
		this.thumbnailScrollWindowElement.style.display = "block";

		this.hoverOverText = "";
		radialMenuList[this.id + "_menu"] = this;

		if (isMaster) {
			this.wsio = wsio;
			this.sendsToServer = true;
		} else {
			this.sendsToServer = false;
		}

		// Create buttons
		// icon, useBackgroundColor, buttonSize, hitboxSize, alignment, hitboxType, radialAnglePos, radialDistance
		this.radialDragButton = this.createRadialButton(radialDragIcon, false, 500,
			this.imageThumbSize, "centered", "circle", 0, 0);

		this.radialCenterButton = this.createRadialButton(radialButtonIcon, false, menuButtonSize,
			menuButtonHitboxSize, "centered", "circle", 0, 0);

		// Generate the radial menu buttons as specified by the server
		for (var buttonName in data.layout) {
			var buttonInfo = data.layout[buttonName];

			this.addRadialMenuButton(buttonName, radialMenuIcons[buttonInfo.icon], overlayIconScale,
				{buttonSize: menuButtonSize, hitboxSize: menuButtonHitboxSize, shape: "circle"},
				"centered", buttonInfo.radialPosition, buttonInfo.radialLevel);
		}
	};

	/**
	 * Sets the state of a radial menu button
	 *
	 * @method createRadialButton
	 * @param buttonID
	 * @param state
	 */
	this.setRadialButtonState = function(buttonID, state, color) {
		if (color !== undefined) {
			this.radialMenuButtons[buttonID].mouseOverColor = color;
		}
		this.radialMenuButtons[buttonID].setButtonState(state);
		this.draw();
	};

	/**
	 * Helper function for creating a radial button (more generic than addRadialMenuButton)
	 *
	 * @method createRadialButton
	 * @param icon {Image} icon image for the button
	 * @param useBackgroundColor {Boolean}
	 * @param buttonSize {Float} size of the button in pixels
	 * @param hitboxSize {Float} size of the button hitbox in pixels
	 * @param alignment {String} where the center of the button is defined "left" (default) or "centered"
	 * @param hitboxShape {String} shape of the hitbox "box" or "circle"
	 * @param radialPos {Float} position of the button along the radius. based on angleSeparation and initAngle
	 * @param buttonRadius {Float} distance from the center of the menu
	 * @return {ButtonWidget} the ButtonWidget object created
	 */
	this.createRadialButton = function(idleIcon, useBackgroundColor, buttonSize, hitboxSize, alignment,
		hitboxShape, radialPos, buttonRadius) {
		var button = new ButtonWidget();
		button.init(0, this.ctx, null);
		button.setButtonImage(idleIcon);
		button.useBackgroundColor = useBackgroundColor;
		button.useEventOverColor = true;

		button.setSize(buttonSize * this.radialMenuScale, buttonSize * this.radialMenuScale);
		button.setHitboxSize(hitboxSize * this.radialMenuScale, hitboxSize * this.radialMenuScale);

		button.alignment = alignment;
		button.hitboxShape = hitboxShape;

		angle = (initAngle + angleSeparation * radialPos) * (Math.PI / 180);
		button.setPosition(this.radialMenuCenter.x - buttonRadius * this.radialMenuScale * Math.cos(angle),
			this.radialMenuCenter.y - buttonRadius * this.radialMenuScale * Math.sin(angle));
		button.setRotation(angle - Math.PI / 2);

		return button;
	};

	/**
	 * Helper function for drawing an image
	 *
	 * @method drawImage
	 * @param ctx {Context} context to draw on
	 * @param image {Image} image to draw
	 * @param position {x: Float, y: Float} position to draw
	 * @param size {x: Float, y: Float} width, height of image
	 * @param color {Color} fill color to use
	 * @param rotation {Float} rotation of the image (not currently used)
	 * @param centered {Boolean} is the center of the image the origin for positioning
	 */
	this.drawImage = function(ctx, image, position, size, color, rotation, centered) {
		// this.ctx.save();
		ctx.fillStyle = color;
		// this.ctx.translate( position.x , position.y);
		// this.ctx.rotate( (initAngle + angleSeparation * angleIncrement + 90) * (Math.PI/180));
		if (centered) {
			ctx.drawImage(image, position.x - size.x / 2, position.y - size.y / 2, size.x, size.y);
		} else {
			ctx.drawImage(image, position.x, position.y, size.x, size.y);
		}
		// this.ctx.restore();
	};

	/**
	 * Forces a redraw of the menu
	 *
	 * @method redraw
	 */
	this.redraw = function() {
		this.thumbScrollWindowctx.redraw = true;

		this.draw();
		this.drawThumbnailWindow();
	};

	/**
	 * Draws the menu
	 *
	 * @method draw
	 */
	this.draw = function() {
		// clear canvas
		this.ctx.clearRect(0, 0, this.element.width, this.element.height);

		// TEMP: Just to clearly see context edge
		if (this.divCtxDebug) {
			this.ctx.fillStyle = "rgba(5, 255, 5, 0.3)";
			this.ctx.fillRect(0, 0, this.element.width, this.element.height);
		}

		if (this.menuState === "opening") {
			if (this.stateTransition < 1) {
				this.stateTransition += this.stateTransitionTime / 1000;
			} else {
				this.stateTransition = 0;
			}
		} else if (this.menuState === "open") {
			this.stateTransition = 1;
		}

		this.radialDragButton.draw();

		if (this.currentMenuState !== "radialMenu") {
			// line from radial menu to thumbnail window
			this.ctx.beginPath();
			this.ctx.moveTo(this.radialMenuCenter.x + menuButtonSize / 4 * this.radialMenuScale, this.radialMenuCenter.y);
			this.ctx.lineTo(this.thumbnailWindowPosition.x - 18 * this.radialMenuScale, this.radialMenuCenter.y);
			this.ctx.strokeStyle = "#ffffff";
			this.ctx.lineWidth = 5 * this.radialMenuScale;
			this.ctx.stroke();
		}

		// draw lines to each button
		var i;
		for (i = 0; i < this.level1Buttons.length; i++) {
			if (this.level1Buttons[i].isHidden() === false) {
				this.ctx.beginPath();

				// We are adding -Math.PI/2 since angle also accounts for the initial orientation of the button image
				this.ctx.moveTo(this.radialMenuCenter.x + (menuButtonSize / 4 * this.radialMenuScale) *
					Math.cos(this.level1Buttons[i].angle - Math.PI / 2),
				this.radialMenuCenter.y + (menuButtonSize / 4 * this.radialMenuScale) *
					Math.sin(this.level1Buttons[i].angle - Math.PI / 2));

				this.ctx.lineTo(this.level1Buttons[i].posX + (menuButtonSize / 4 * this.radialMenuScale) *
					Math.cos(this.level1Buttons[i].angle + Math.PI / 2),
				this.level1Buttons[i].posY + (menuButtonSize / 4 * this.radialMenuScale) *
					Math.sin(this.level1Buttons[i].angle + Math.PI / 2));

				this.ctx.strokeStyle = "#ffffff";
				this.ctx.lineWidth = 5 * this.radialMenuScale;
				this.ctx.stroke();
			}
		}

		/*
		for (i = 0; i < this.level2Buttons.length; i++) {
			if (this.level2Buttons[i].isHidden() === false) {
				this.ctx.beginPath();

				// We are adding -Math.PI/2 since angle also accounts for the initial orientation of the button image
				var centerButton = this.level1Buttons[i];
				this.ctx.moveTo(centerButton.posX + (menuButtonSize / 4 * this.radialMenuScale) *
					Math.cos(this.level2Buttons[i].angle - Math.PI / 2),
					centerButton.posY + (menuButtonSize / 4 * this.radialMenuScale) *
					Math.sin(this.level2Buttons[i].angle - Math.PI / 2));
				this.ctx.lineTo(this.level2Buttons[i].posX + (menuButtonSize / 4 * this.radialMenuScale) *
					Math.cos(this.level2Buttons[i].angle + Math.PI / 2),
					this.level2Buttons[i].posY + (menuButtonSize / 4 * this.radialMenuScale) *
					Math.sin(this.level2Buttons[i].angle + Math.PI / 2));
				this.ctx.strokeStyle = "#ffffff";
				this.ctx.lineWidth = 5 * this.radialMenuScale;
				this.ctx.stroke();
			}
		}
		*/
		if (this.level0Buttons.length === 0) {
			this.radialCenterButton.draw();
		}
		if (this.currentRadialState === "radialMenu") {
			for (i = 0; i < this.level0Buttons.length; i++) {
				this.level0Buttons[i].draw();
			}
			for (i = 0; i < this.level1Buttons.length; i++) {
				this.level1Buttons[i].draw();
			}
			if (this.showArrangementSubmenu) {
				for (i = 0; i < this.level2Buttons.length; i++) {
					this.level2Buttons[i].draw();
				}
			}
		}

		this.drawThumbnailWindow();

		this.ctx.redraw = false;
	};

	this.drawThumbnailWindow = function() {
		var i;

		if (this.thumbScrollWindowctx.redraw || this.currentMenuState === "radialMenu") {
			this.thumbScrollWindowctx.clearRect(0, 0,
				this.thumbnailScrollWindowElement.width,
				this.thumbnailScrollWindowElement.height);
		}

		if (this.windowInteractionMode === false) {
			this.ctx.fillStyle = "rgba(5, 15, 55, 0.5)";
			this.thumbScrollWindowctx.fillStyle = this.ctx.fillStyle;
		} else if (this.dragThumbnailWindow === true) {
			this.ctx.fillStyle = "rgba(55, 55, 5, 0.5)";
			this.thumbScrollWindowctx.fillStyle = this.ctx.fillStyle;
		} else {
			this.ctx.fillStyle = "rgba(5, 5, 5, 0.5)";
			this.thumbScrollWindowctx.fillStyle = this.ctx.fillStyle;
		}

		// Thumbnail window
		if (this.currentMenuState !== "radialMenu") {
			this.thumbnailWindowDiv.style.backgroundColor = "rgba(5,5,5,0.5)";

			var currentThumbnailButtons = this.imageThumbnailButtons;

			if (this.currentMenuState === "imageThumbnailWindow") {
				currentThumbnailButtons = this.imageThumbnailButtons;
			} else if (this.currentMenuState === "pdfThumbnailWindow") {
				currentThumbnailButtons = this.pdfThumbnailButtons;
			} else if (this.currentMenuState === "videoThumbnailWindow") {
				currentThumbnailButtons = this.videoThumbnailButtons;
			} else if (this.currentMenuState === "applauncherThumbnailWindow") {
				currentThumbnailButtons = this.appThumbnailButtons;
			} else if (this.currentMenuState === "sessionThumbnailWindow") {
				currentThumbnailButtons = this.sessionThumbnailButtons;
			}

			if (this.thumbScrollWindowctx.redraw) {
				for (i = 0; i < currentThumbnailButtons.length; i++) {
					var thumbButton = currentThumbnailButtons[i];
					thumbButton.draw();
				}
				this.thumbScrollWindowctx.redraw = false;
			}

			// Preview window
			var previewImageSize = this.element.width * previewWindowWidth;
			var previewImageX = this.thumbnailWindowSize.x + this.imageThumbSize / 2 - 10;
			var previewImageY = 60 + this.textHeaderHeight;

			// Metadata
			var metadataLine = 0;
			var metadataTextPosX = previewImageX;
			var metadataTextPosY = previewImageY + previewImageSize + 20 + this.textHeaderHeight;

			// Preview Window Background
			if (this.currentMenuState !== "radialMenu") {
				this.ctx.fillStyle = "rgba(5, 5, 5, 0.5)";
				this.ctx.fillRect(previewImageX - 10, this.thumbnailWindowPosition.y + this.textHeaderHeight,
					previewImageSize + 20, this.thumbnailWindowSize.y);
			}

			this.borderLineThickness = 5 * this.radialMenuScale;

			// Thumbnail window - Title bar
			this.ctx.beginPath();
			this.ctx.moveTo(this.thumbnailWindowPosition.x - 18 * this.radialMenuScale - this.borderLineThickness / 2,
				this.borderLineThickness / 2);
			// Top vertical line
			this.ctx.lineTo(previewImageX - 10 - 40 * this.radialMenuScale + 2.5 * this.radialMenuScale -
				this.borderLineThickness / 2, this.borderLineThickness / 2);
			// Angled line
			this.ctx.lineTo(previewImageX - 10 - this.borderLineThickness, this.thumbnailWindowPosition.y +
				this.textHeaderHeight - this.borderLineThickness / 2);
			// Bottom horizontal line
			this.ctx.lineTo(this.thumbnailWindowPosition.x - 18 * this.radialMenuScale - this.borderLineThickness / 2,
				this.thumbnailWindowPosition.y + this.textHeaderHeight - this.borderLineThickness / 2);
			this.ctx.closePath();

			this.ctx.fillStyle = "#50505080";
			this.ctx.fill();
			this.ctx.strokeStyle = "#ffffff";
			this.ctx.lineWidth = 5 * this.radialMenuScale;
			this.ctx.stroke();

			// Thumbnail window - Vert line
			this.ctx.beginPath();
			this.ctx.moveTo(this.thumbnailWindowPosition.x - 18 * this.radialMenuScale - this.borderLineThickness / 2,
				this.thumbnailWindowPosition.y + this.textHeaderHeight);
			this.ctx.lineTo(this.thumbnailWindowPosition.x - 18 * this.radialMenuScale - this.borderLineThickness / 2,
				this.thumbnailWindowSize.y);
			this.ctx.strokeStyle = "#ffffff";
			this.ctx.lineWidth = 5 * this.radialMenuScale;
			this.ctx.stroke();

			// Thumbnail window - Horz line across preview window
			this.ctx.beginPath();
			this.ctx.moveTo(previewImageX - 10 - 5 * this.radialMenuScale, this.thumbnailWindowPosition.y +
				this.textHeaderHeight - this.borderLineThickness / 2);
			this.ctx.lineTo(previewImageX - 10 + previewImageSize + 20, this.thumbnailWindowPosition.y +
				this.textHeaderHeight - this.borderLineThickness / 2);
			this.ctx.strokeStyle = "#ffffff";
			this.ctx.lineWidth = 5 * this.radialMenuScale;
			this.ctx.stroke();

			// Filename text
			this.ctx.font = parseInt(this.textHeaderHeight) + "px sans-serif";
			this.ctx.fillStyle = "rgba(250, 250, 250, 1.0)";
			this.ctx.fillText(this.hoverOverText, this.thumbnailWindowPosition.x,
				this.thumbnailWindowPosition.y + this.textHeaderHeight / 1.8);

			if (this.hoverOverThumbnail) {
				this.ctx.drawImage(this.hoverOverThumbnail, previewImageX, previewImageY,
					previewImageSize, previewImageSize);
			}

			if (this.hoverOverMeta) {
				this.ctx.font = "16px sans-serif";
				this.ctx.fillStyle = "rgba(250, 250, 250, 1.0)";
				var metadata = this.hoverOverMeta;

				var metadataTags = [];

				// Generic
				metadataTags[0] = { tag: metadata.FileName, longLabel: "File Name: " };
				if (metadata.FileSize !== undefined) {
					metadataTags[1] = { tag: this.bytesToReadableString(metadata.FileSize), longLabel: "File Size: " };
				}
				metadataTags[2] = { tag: metadata.FileDate, longLabel: "File Date: " };

				// Image
				metadataTags[3] = { tag: metadata.ImageSize, longLabel: "Resolution: " };
				metadataTags[4] = { tag: metadata.DateCreated, longLabel: "Date Created: " };
				metadataTags[5] = { tag: metadata.Copyright, longLabel: "Copyright: " };

				// Photo
				metadataTags[6] = { tag: metadata.Artist, longLabel: "Artist: " };
				metadataTags[7] = { tag: metadata.Aperture, longLabel: "Aperture: " };
				metadataTags[8] = { tag: metadata.Exposure, longLabel: "Exposure: " };
				metadataTags[9] = { tag: metadata.Flash, longLabel: "Flash: " };
				metadataTags[10] = { tag: metadata.ExposureTime, longLabel: "Exposure Time: " };
				metadataTags[11] = { tag: metadata.FOV, longLabel: "FOV: " };
				metadataTags[12] = { tag: metadata.FocalLength, longLabel: "Focal Length: " };
				metadataTags[13] = { tag: metadata.Model, longLabel: "Model: " };
				metadataTags[14] = { tag: metadata.LensModel, longLabel: "Lens Model: " };
				metadataTags[15] = { tag: metadata.ISO, longLabel: "ISO: " };
				metadataTags[16] = { tag: metadata.ShutterSpeed, longLabel: "Shutter Speed: " };

				// GPS
				metadataTags[17] = { tag: metadata.GPSAltitude, longLabel: "GPS Altitude: " };
				metadataTags[18] = { tag: metadata.GPSLatitude, longLabel: "GPS Latitude: " };
				metadataTags[19] = { tag: metadata.GPSTimeStamp, longLabel: "GPS TimeStamp: " };

				// Video
				metadataTags[20] = { tag: metadata.Duration, longLabel: "Duration: " };
				metadataTags[21] = { tag: metadata.CompressorID, longLabel: "Compressor: " };
				metadataTags[22] = { tag: metadata.AvgBitrate, longLabel: "Avg. Bitrate: " };
				metadataTags[23] = { tag: metadata.AudioFormat, longLabel: "Audio Format: " };
				metadataTags[24] = { tag: metadata.AudioChannels, longLabel: "Audio Channels: " };
				metadataTags[25] = { tag: metadata.AudioSampleRate, longLabel: "Audio Sample Rate: " };

				// Apps
				if (metadata.metadata !== undefined) {
					metadataTags[26] = { tag: metadata.metadata.title, longLabel: "Title: " };
					metadataTags[27] = { tag: metadata.metadata.version, longLabel: "Version: " };
					metadataTags[28] = { tag: metadata.metadata.author, longLabel: "Author: " };
					metadataTags[29] = { tag: metadata.metadata.license, longLabel: "License: " };
					metadataTags[30] = { tag: metadata.metadata.keywords, longLabel: "Keywords: " };
					metadataTags[31] = { tag: metadata.metadata.description, longLabel: "Description: " };
				}

				// Sessions
				metadataTags[32] = { tag: metadata.numapps, longLabel: "Applications: " };

				var newTagSpacing = 28;
				var sameTagSpacing = 20;

				/*
				// No word wrap (Debugging purposes only now)
				for (i = 0; i < metadataTags.length; i++) {
					if (metadataTags[i] !== undefined && metadataTags[i].tag) {
						this.ctx.fillText(metadataTags[i].longLabel + metadataTags[i].tag,
							metadataTextPosX, metadataTextPosY + metadataLine * newTagSpacing);
						metadataLine++;
					}
				}
				*/
				// Word Wrap
				for (i = 0; i < metadataTags.length; i++) {
					if (metadataTags[i] !== undefined && metadataTags[i].tag) {
						var labelLength = this.ctx.measureText(metadataTags[i].longLabel).width;
						var tagLength = this.ctx.measureText(metadataTags[i].tag).width;
						var maxTextWidth = this.element.width * previewWindowWidth;

						if (labelLength + tagLength <= maxTextWidth) {
							this.ctx.fillText(metadataTags[i].longLabel + metadataTags[i].tag,
								metadataTextPosX, metadataTextPosY + metadataLine * newTagSpacing);
						} else {
							var textWords = (metadataTags[i].longLabel + metadataTags[i].tag).split(' ');
							var testLine = "";
							var j = 0;
							var line = 0;
							for (j = 0; j < textWords.length; j++) {
								var nextTestLine = testLine + textWords[j] + " ";
								if (this.ctx.measureText(nextTestLine).width <= maxTextWidth) {
									testLine = nextTestLine;
								} else {
									this.ctx.fillText(testLine,
										metadataTextPosX,
										metadataTextPosY + metadataLine * newTagSpacing + sameTagSpacing * line);
									testLine = textWords[j] + " ";
									line += 1;
								}
							}
							this.ctx.fillText(testLine,
								metadataTextPosX,
								metadataTextPosY + metadataLine * newTagSpacing + sameTagSpacing * line);
							if (line > 0) {
								metadataLine++;
							}
						}
						metadataLine++;
					}
				}
			}
		}
	};

	/**
	 * Converts bytes to human readable string
	 *
	 * @method bytesToReadableString
	 */
	this.bytesToReadableString = function(bytes) {
		var bytesInt = parseInt(bytes);

		if (bytesInt > Math.pow(1024, 3)) {
			return (bytesInt / Math.pow(1024, 3)).toFixed(2) + " GB";
		}
		if (bytesInt > Math.pow(1024, 2)) {
			return (bytesInt / Math.pow(1024, 2)).toFixed(2) + " MB";
		}
		if (bytesInt > Math.pow(1024, 1)) {
			return Math.round(bytesInt / Math.pow(1024, 1)) + " KB";
		}
		return bytes + " bytes";
	};

	/**
	 * Closes the menu, sends close signal to server
	 *
	 * @method closeMenu
	 */
	this.closeMenu = function() {
		// console.log("radialMenu: closeMenu");
		this.visible = false;

		this.radialMenuDiv.style.display = "none";
		this.thumbnailWindowDiv.style.display = "none";

		this.currentMenuState = "radialMenu";
	};

	/**
	 * Toggles the content window open/close
	 *
	 * @method setToggleMenu
	 */
	this.setToggleMenu = function(type) {
		// console.log("radialMenu: setToggleMenu " + type);
		if (this.currentMenuState !== type) {
			this.thumbnailWindowScrollOffset = { x: 0, y: 0 };

			this.currentMenuState = type;
			this.element.width = this.thumbnailWindowSize.x + thumbnailPreviewWindowSize.x;
			this.element.height = this.thumbnailWindowSize.y;
			this.thumbnailScrollWindowElement.style.display = "block";
			this.thumbnailWindowDiv.style.display = "block";
			this.thumbScrollWindowctx.redraw = true;
			this.updateThumbnailPositions();
			this.draw();
			return true;
		}
		this.currentMenuState = "radialMenu";
		this.element.width = this.radialMenuSize.x;
		this.element.height = this.radialMenuSize.y;
		this.thumbnailWindowDiv.style.display = "none";
		this.draw();
		return false;
	};

	/**
	 * Sets the content window
	 *
	 * @method setMenu
	 */
	this.setMenu = function(type) {
		if (type !== "radialMenu") {
			// console.log("radialMenu: setMenu " + type);
			this.thumbnailWindowScrollOffset = { x: 0, y: 0 };

			this.currentMenuState = type;
			this.element.width = this.thumbnailWindowSize.x + thumbnailPreviewWindowSize.x;
			this.element.height = this.thumbnailWindowSize.y;
			this.thumbnailScrollWindowElement.style.display = "block";
			this.thumbnailWindowDiv.style.display = "block";
			this.thumbScrollWindowctx.redraw = true;
			this.updateThumbnailPositions();
			this.draw();
		} else {
			// console.log("radialMenu: setMenu " + type);
			this.currentMenuState = "radialMenu";
			this.element.width = this.radialMenuSize.x;
			this.element.height = this.radialMenuSize.y;
			this.thumbnailWindowDiv.style.display = "none";
			this.draw();
		}
	};

	/**
	 * Toggles a subradial menu
	 *
	 * @method toggleSubRadialMenu
	 */
	this.toggleSubRadialMenu = function(type) {
		this.showArrangementSubmenu = !this.showArrangementSubmenu;
		// console.log("radialMenu: toggleSubRadialMenu - " + this.showArrangementSubmenu);
	};

	/**
	 * Moves the radial menu based on master and server events
	 *
	 * @method moveMenu
	 * @param data {x: data.x, y: data.y, windowX: rect.left, windowY: rect.top}
	 *                 Contains the event position and the bounding rectangle
	 * @param offset {x: this.offsetX, y: this.offsetY} Contains the display client offset
	 */
	this.moveMenu = function(data, offset) {
		// Note: We don"t check if the pointer is over the menu because the server/node-radialMenu does this for us
		if (this.windowInteractionMode === false && this.buttonOverCount === 0) {
			var dragOffset = this.dragPosition;

			this.element.style.left = (data.x - offset.x - dragOffset.x).toString() + "px";
			this.element.style.top = (data.y - offset.y - dragOffset.y).toString() + "px";
		}

		this.thumbnailWindowDiv.style.left = (data.windowX + this.thumbnailWindowPosition.x -
				18 * this.radialMenuScale).toString() + "px";
		this.thumbnailWindowDiv.style.top = (data.windowY + this.thumbnailWindowPosition.y +
			this.textHeaderHeight).toString() + "px";

		this.thumbnailWindowDiv.style.width = (this.thumbnailWindowSize.x + this.imageThumbSize / 2 -
				10 - this.radialMenuSize.x - 25 * this.radialMenuScale).toString() + "px";
		this.thumbnailWindowDiv.style.height = (this.thumbnailWindowSize.y -
				this.textHeaderHeight * 2).toString() + "px";
	};

	/**
	 * Processes events
	 *
	 * @method onEvent
	 * @param type {String} i.e. "pointerPress", "pointerMove", "pointerRelease"
	 * @param position {x: Float, y: Float} event position
	 * @param user {Integer} userID
	 * @param data { button: "left/right", color: "#000000" }
	 */
	this.onEvent = function(type, position, user, data) {
		this.buttonOverCount = 0; // Count number of buttons have a pointer over it

		// Level 1 -----------------------------------
		var i = 0;
		if (this.currentRadialState === "radialMenu") {
			for (i = 0; i < this.level1Buttons.length; i++) {
				this.buttonOverCount += this.level1Buttons[i].onEvent(type, user.id, position, data);
			}
		}

		// Thumbnail window ----------------------------
		if (this.currentMenuState !== "radialMenu") {
			var currentThumbnailButtons = this.imageThumbnailButtons;

			if (this.currentMenuState === "imageThumbnailWindow") {
				currentThumbnailButtons = this.imageThumbnailButtons;
			} else if (this.currentMenuState === "pdfThumbnailWindow") {
				currentThumbnailButtons = this.pdfThumbnailButtons;
			} else if (this.currentMenuState === "videoThumbnailWindow") {
				currentThumbnailButtons = this.videoThumbnailButtons;
			} else if (this.currentMenuState === "applauncherThumbnailWindow") {
				currentThumbnailButtons = this.appThumbnailButtons;
			} else if (this.currentMenuState === "sessionThumbnailWindow") {
				currentThumbnailButtons = this.sessionThumbnailButtons;
			}

			var thumbUpdated = false;
			for (i = 0; i < currentThumbnailButtons.length; i++) {
				var thumbButton = currentThumbnailButtons[i];


				var thumbEventPos = {
					x: position.x - this.thumbnailWindowPosition.x + 18 * this.radialMenuScale,
					y: position.y - this.thumbnailWindowPosition.y - this.textHeaderHeight
				};

				// Prevent clicking on hidden thumbnails under preview window
				//    should match where "this.thumbnailWindowDiv.style.width" is assigned
				var thumbnailWindowDivWidth = this.thumbnailWindowSize.x + this.imageThumbSize / 2 - 10 -
					this.radialMenuSize.x - 25 * this.radialMenuScale;
				if (thumbEventPos.x >= 0 && thumbEventPos.x <= thumbnailWindowDivWidth) {
					thumbEventPos.x -= this.thumbnailWindowScrollOffset.x;
					this.buttonOverCount += thumbButton.onEvent(type, user.id, thumbEventPos, data);

					if (thumbButton.isReleased() && this.scrollOpenContentLock === false && data.button === "left") {

						if (this.currentMenuState === "applauncherThumbnailWindow") {
							this.loadApplication(thumbButton.getData(), user);
						} else {
							this.loadFileFromServer(thumbButton.getData(), user);
						}

					}
					if (thumbButton.isPositionOver(user.id, thumbEventPos)) {
						this.hoverOverText = thumbButton.getData().shortname;
						this.hoverOverThumbnail = thumbButton.buttonImage;

						if (thumbButton.buttonImage.lsrc) {
							this.hoverOverThumbnail.src = thumbButton.buttonImage.lsrc;
						}
						this.hoverOverMeta = thumbButton.getData().meta;
					}
					// Only occurs on first pointerMove event over button
					if (thumbButton.isFirstOver()) {
						thumbUpdated = true;
					}
				}
			}

			if (thumbUpdated) {
				this.redraw();
			}
		}

		// windowInteractionMode = true if any active button has an event over its
		if (type === "pointerPress" && data.button === "left") {
			// Press over radial menu, drag menu
			if (position.x > 0 && position.x < this.radialMenuSize.x && position.y > 0 &&
					position.y < this.radialMenuSize.y && this.buttonOverCount === 0) {
				this.windowInteractionMode = false;
				this.dragPosition = position;
			}

			if (position.x > this.radialMenuSize.x && position.x < this.thumbnailWindowSize.x &&
				position.y > 0 && position.y < this.thumbnailWindowSize.y) {
				if (this.dragThumbnailWindow === false) {
					this.dragThumbnailWindow = true;
					this.thumbnailWindowDragPosition = position;

					this.thumbnailWindowInitialScrollOffset.x = this.thumbnailWindowScrollOffset.x;
					this.thumbnailWindowInitialScrollOffset.y = this.thumbnailWindowScrollOffset.y;
				}
			}
			this.ctx.redraw = true;

			this.scrollOpenContentLock = false;

		} else if (type === "pointerMove") {
			if (this.dragThumbnailWindow === true) {
				// Controls the content window scrolling.
				// Note:Scrolling is +right, -left so offset should always be negative
				if (this.thumbnailWindowScrollOffset.x <= 0 && this.notEnoughThumbnailsToScroll === false) {
					var nextScrollPos = this.thumbnailWindowScrollOffset;

					nextScrollPos.x += (position.x - this.thumbnailWindowDragPosition.x) * thumbnailScrollScale;
					nextScrollPos.y += (position.y - this.thumbnailWindowDragPosition.y) * thumbnailScrollScale;

					if (nextScrollPos.x > 0) {
						nextScrollPos.x = 0;
					}
					if (nextScrollPos.y > 0) {
						nextScrollPos.y = 0;
					}

					if (-nextScrollPos.x < this.maxThumbnailScrollDistance) {
						this.scrollThumbnailWindow(nextScrollPos);
						this.thumbnailWindowDragPosition = position;
					} else {
						nextScrollPos.x = -this.maxThumbnailScrollDistance;
						this.scrollThumbnailWindow(nextScrollPos);
						this.thumbnailWindowDragPosition = position;
					}
				} else {
					this.thumbnailWindowScrollOffset.x = 0;
				}
			}

		} else if (type === "pointerRelease") {
			if (this.windowInteractionMode === false)	{
				this.windowInteractionMode = true;
				this.dragPosition = { x: 0, y: 0 };
			} else if (this.dragThumbnailWindow === true) {
				this.dragThumbnailWindow = false;
			}
		} else if (type === "pointerScroll") {
			if (this.thumbnailWindowScrollOffset.x <= 0 && this.notEnoughThumbnailsToScroll === false) {
				var wheelDelta = this.thumbnailWindowScrollOffset.x + data.wheelDelta;
				if (-wheelDelta < this.maxThumbnailScrollDistance) {
					this.scrollThumbnailWindow({x: wheelDelta, y: 0 });
				}
			}
		}
	};

	this.scrollThumbnailWindow = function(nextScrollPos) {
		var scrollDist = 0;
		if (this.thumbnailWindowScrollLock.x === false) {
			this.thumbnailWindowScrollOffset.x = nextScrollPos.x;
			scrollDist += this.thumbnailWindowInitialScrollOffset.x - this.thumbnailWindowScrollOffset.x;
		}
		if (this.thumbnailWindowScrollLock.y === false) {
			this.thumbnailWindowScrollOffset.y = nextScrollPos.y;
			scrollDist += this.thumbnailWindowInitialScrollOffset.y - this.thumbnailWindowScrollOffset.y;
		}

		if (scrollDist < 0) {
			scrollDist *= -1;
		}
		if (scrollDist >= thumbnailDisableSelectionScrollDistance) {
			this.scrollOpenContentLock = true;
		}

		if (this.thumbnailWindowScrollOffset.x > 0) {
			this.thumbnailWindowScrollOffset.x = 0;
		}

		this.thumbnailScrollWindowElement.style.left = (this.thumbnailWindowScrollOffset.x).toString() + "px";
	};

	/**
	 * Tells the server to load a file
	 *
	 * @method loadFileFromServer
	 * @param data {} Content information like type and filename
	 * @param user {Integer} userID
	 */
	this.loadFileFromServer = function(data, user) {
		if (this.sendsToServer === true) {
			this.wsio.emit("loadFileFromServer", { application: data.application, filename: data.filename, user: user});
		}
	};

	/**
	 * Tells the server to start an application
	 *
	 * @method loadApplication
	 * @param data {} Application information like filename
	 * @param user {Integer} userID
	 */
	this.loadApplication = function(data, user) {
		if (this.sendsToServer === true) {
			this.wsio.emit("loadApplication", { application: data.filename, user: user});
		}
	};

	/**
	 * Receives the current asset list from server
	 *
	 * @method updateFileList
	 * @param serverFileList {} Server file list
	 */
	this.updateFileList = function(serverFileList) {

		this.thumbnailButtons = [];
		this.imageThumbnailButtons = [];
		this.videoThumbnailButtons = [];
		this.pdfThumbnailButtons = [];
		this.appThumbnailButtons = [];
		this.sessionThumbnailButtons = [];

		// Server file lists by type
		var imageList = serverFileList.images;
		var pdfList = serverFileList.pdfs;
		var videoList = serverFileList.videos;
		var appList = serverFileList.applications;
		var sessionList = serverFileList.sessions;

		var i = 0;
		var thumbnailButton;
		var customIcon;
		var invalidFilenameRegex = "[:#$%^&@]";
		var data;
		var curList;

		if (imageList !== null) {
			// var validImages = 0;
			for (i = 0; i < imageList.length; i++) {
				if (imageList[i].filename.search("Thumbs.db") === -1) {
					thumbnailButton = new ButtonWidget();
					thumbnailButton.init(0, this.thumbScrollWindowctx, null);
					curList = imageList[i];
					data = {
						application: "image_viewer",
						filename: curList.filename,
						shortname: curList.exif.FileName,
						meta: curList.exif
					};
					thumbnailButton.setData(data);
					thumbnailButton.simpleTint = false;

					thumbnailButton.setSize(this.imageThumbSize, this.imageThumbSize);
					thumbnailButton.setHitboxSize(this.imageThumbSize, this.imageThumbSize);

					// Thumbnail image
					if (imageList[i].exif.SAGE2thumbnail !== null) {
						customIcon = new Image();
						customIcon.lsrc = imageList[i].exif.SAGE2thumbnail + "_512.jpg";
						customIcon.src = imageList[i].exif.SAGE2thumbnail + "_256.jpg";
						thumbnailButton.setButtonImage(customIcon);
						thumbnailButton.setDefaultImage(radialMenuIcons["images/ui/images.svg"]);
					} else {
						thumbnailButton.setButtonImage(radialMenuIcons["images/ui/images.svg"]);
					}

					// File has a bad filename for thumbnails, set default icon
					if (imageList[i].exif.SAGE2thumbnail !== undefined &&
						imageList[i].exif.SAGE2thumbnail.match(invalidFilenameRegex) !== null) {
						thumbnailButton.setButtonImage(radialMenuIcons["images/ui/images.svg"]);
					}

					this.thumbnailButtons.push(thumbnailButton);
					this.imageThumbnailButtons.push(thumbnailButton);
					// validImages++;
				}
			}
		}
		if (pdfList !== null) {
			for (i = 0; i < pdfList.length; i++) {
				thumbnailButton = new ButtonWidget();
				thumbnailButton.init(0, this.thumbScrollWindowctx, null);
				curList = pdfList[i];
				data = {
					application: "pdf_viewer",
					filename: curList.filename,
					shortname: curList.exif.FileName,
					meta: curList.exif
				};
				thumbnailButton.setData(data);
				thumbnailButton.simpleTint = false;

				thumbnailButton.setSize(this.imageThumbSize, this.imageThumbSize);
				thumbnailButton.setHitboxSize(this.imageThumbSize, this.imageThumbSize);

				// Thumbnail image
				if (pdfList[i].exif.SAGE2thumbnail !== null) {
					customIcon = new Image();
					customIcon.lsrc = pdfList[i].exif.SAGE2thumbnail + "_512.jpg";
					customIcon.src = pdfList[i].exif.SAGE2thumbnail + "_256.jpg";
					thumbnailButton.setButtonImage(customIcon);
					thumbnailButton.setDefaultImage(radialMenuIcons["images/ui/pdfs.svg"]);
				} else {
					thumbnailButton.setButtonImage(radialMenuIcons["images/ui/pdfs.svg"]);
				}
				// File has a bad filename for thumbnails, set default icon
				if (pdfList[i].exif.SAGE2thumbnail !== undefined
					&& pdfList[i].exif.SAGE2thumbnail.match(invalidFilenameRegex) !== null) {
					thumbnailButton.setButtonImage(radialMenuIcons["images/ui/pdfs.svg"]);
				}

				this.thumbnailButtons.push(thumbnailButton);
				this.pdfThumbnailButtons.push(thumbnailButton);
			}
		}
		if (videoList !== null) {
			for (i = 0; i < videoList.length; i++) {
				thumbnailButton = new ButtonWidget();
				thumbnailButton.init(0, this.thumbScrollWindowctx, null);
				curList = videoList[i];
				data = {
					application: "movie_player",
					filename: curList.filename,
					shortname: curList.exif.FileName,
					meta: curList.exif
				};
				thumbnailButton.setData(data);
				thumbnailButton.simpleTint = false;

				thumbnailButton.setSize(this.imageThumbSize, this.imageThumbSize);
				thumbnailButton.setHitboxSize(this.imageThumbSize, this.imageThumbSize);

				// Thumbnail image
				if (videoList[i].exif.SAGE2thumbnail !== null) {
					customIcon = new Image();
					customIcon.lsrc = videoList[i].exif.SAGE2thumbnail + "_512.jpg";
					customIcon.src  = videoList[i].exif.SAGE2thumbnail + "_256.jpg";
					thumbnailButton.setButtonImage(customIcon);
					thumbnailButton.setDefaultImage(radialMenuIcons["images/ui/videos.svg"]);
				} else {
					thumbnailButton.setButtonImage(radialMenuIcons["images/ui/videos.svg"]);
				}
				// File has a bad filename for thumbnails, set default icon
				if (videoList[i].exif.SAGE2thumbnail !== undefined
					&& videoList[i].exif.SAGE2thumbnail.match(invalidFilenameRegex) !== null) {
					thumbnailButton.setButtonImage(radialMenuIcons["images/ui/videos.svg"]);
				}

				this.thumbnailButtons.push(thumbnailButton);
				this.videoThumbnailButtons.push(thumbnailButton);
			}
		}
		if (appList !== null) {
			for (i = 0; i < appList.length; i++) {
				thumbnailButton = new ButtonWidget();
				thumbnailButton.init(0, this.thumbScrollWindowctx, null);
				data = {
					application: "custom_app",
					filename: appList[i].filename,
					shortname: appList[i].exif.FileName,
					meta: appList[i].exif
				};
				thumbnailButton.setData(data);
				thumbnailButton.simpleTint = false;
				thumbnailButton.useBackgroundColor = true;

				thumbnailButton.setSize(this.imageThumbSize * 2, this.imageThumbSize * 2);
				thumbnailButton.setHitboxSize(this.imageThumbSize * 2, this.imageThumbSize * 2);

				if (appList[i].exif.SAGE2thumbnail !== null) {
					customIcon = new Image();
					customIcon.lsrc = appList[i].exif.SAGE2thumbnail + "_512.jpg";
					customIcon.src = appList[i].exif.SAGE2thumbnail + "_256.jpg";
					thumbnailButton.setButtonImage(customIcon);
					thumbnailButton.setDefaultImage(radialMenuIcons["images/ui/applauncher.svg"]);
				} else {
					thumbnailButton.setButtonImage(radialMenuIcons["images/ui/applauncher.svg"]);
				}
				// File has a bad filename for thumbnails, set default icon
				if (appList[i].exif.SAGE2thumbnail !== undefined
					&& appList[i].exif.SAGE2thumbnail.match(invalidFilenameRegex) !== null) {
					thumbnailButton.setButtonImage(radialMenuIcons["images/ui/applauncher.svg"]);
				}

				this.thumbnailButtons.push(thumbnailButton);
				this.appThumbnailButtons.push(thumbnailButton);
			}
		}
		if (sessionList !== null) {
			for (i = 0; i < sessionList.length; i++) {
				thumbnailButton = new ButtonWidget();
				thumbnailButton.init(0, this.thumbScrollWindowctx, null);
				curList = sessionList[i];
				data = {application: "load_session", filename: curList.id, shortname: curList.exif.FileName, meta: curList.exif};
				thumbnailButton.setData(data);
				thumbnailButton.setButtonImage(radialMenuIcons["images/ui/loadsession.svg"]);
				thumbnailButton.simpleTint = false;

				thumbnailButton.setSize(this.imageThumbSize, this.imageThumbSize);
				thumbnailButton.setHitboxSize(this.imageThumbSize, this.imageThumbSize);

				this.thumbnailButtons.push(thumbnailButton);
				this.sessionThumbnailButtons.push(thumbnailButton);
			}
		}

		this.updateThumbnailPositions();
	};

	/**
	 * Helper function for arranging thumbnails
	 *
	 * @method setThumbnailPosition
	 * @param thumbnailSourceList {} List of thumbnails
	 * @param imageThumbnailSize {Float} width of thumbnail in pixels
	 * @param thumbSpacer {Float} space between thumbnails in pixels
	 * @param maxRows {Integer} maximum thumbnails per row
	 * @param neededColumns {Integer} calculated number of columns needed
	 */
	this.setThumbnailPosition = function(thumbnailSourceList, imageThumbnailSize, thumbnailSpacer, maxRows, neededColumns) {
		var curRow = 0;
		var curColumn = 0;

		this.thumbnailScrollWindowElement.width = (imageThumbnailSize + thumbSpacer) * neededColumns;
		for (var i = 0; i < thumbnailSourceList.length; i++) {
			var currentButton = thumbnailSourceList[i];

			if (curColumn + 1 > neededColumns) {
				curColumn = 0;

				if (curRow < maxRows - 1) {
					curRow++;
				}
			}
			currentButton.setPosition(curColumn * (imageThumbnailSize + thumbnailSpacer),
				curRow * (imageThumbnailSize + thumbnailSpacer));
			curColumn++;
		}
	};

	/**
	 * Recalculates the thumbnail positions
	 *
	 * @method updateThumbnailPositions
	 */
	this.updateThumbnailPositions = function() {
		var thumbWindowSize = this.thumbnailWindowSize;

		// maxRows is considered a "hard" limit based on the thumbnail and window size.
		// If maxRows and maxCols is exceeded, then maxCols is expanded as needed.
		var maxRows = Math.floor((thumbWindowSize.y - this.thumbnailWindowPosition.y) / (this.imageThumbSize + thumbSpacer));
		var maxCols = Math.floor((thumbWindowSize.x - this.thumbnailWindowPosition.x) / (this.imageThumbSize + thumbSpacer));

		var neededColumns = maxRows;

		if (this.currentMenuState === "imageThumbnailWindow") {
			if (this.imageThumbnailButtons.length > (maxRows * maxCols)) {
				neededColumns = Math.ceil(this.imageThumbnailButtons.length / maxRows);
			}
		} else if (this.currentMenuState === "pdfThumbnailWindow") {
			if (this.pdfThumbnailButtons.length > (maxRows * maxCols)) {
				neededColumns = Math.ceil(this.pdfThumbnailButtons.length / maxRows);
			}
		} else if (this.currentMenuState === "videoThumbnailWindow") {
			if (this.videoThumbnailButtons.length > (maxRows * maxCols)) {
				neededColumns = Math.ceil(this.videoThumbnailButtons.length / maxRows);
			}
		} else if (this.currentMenuState === "sessionThumbnailWindow") {
			if (this.sessionThumbnailButtons.length > (maxRows * maxCols)) {
				neededColumns = Math.ceil(this.sessionThumbnailButtons.length / maxRows);
			}
		}
		this.maxThumbnailScrollDistance = (neededColumns - maxCols)  * (this.imageThumbSize * 1 + thumbSpacer);
		// Special thumbnail size for custom apps
		if (this.currentMenuState === "applauncherThumbnailWindow") {
			maxRows = Math.floor((thumbWindowSize.y - this.thumbnailWindowPosition.y) / (this.imageThumbSize * 2 + thumbSpacer));
			maxCols = Math.floor((thumbWindowSize.x - this.thumbnailWindowPosition.x) / (this.imageThumbSize * 2 + thumbSpacer));
			neededColumns = maxRows;
			if (this.appThumbnailButtons.length > (maxRows * maxCols)) {
				neededColumns = Math.ceil(this.appThumbnailButtons.length / maxRows);
			}
			this.maxThumbnailScrollDistance = (neededColumns - maxCols) * (this.imageThumbSize * 2 + thumbSpacer);
		}

		this.thumbnailGridSize = { x: maxRows, y: maxCols };
		if (neededColumns > maxRows) {
			this.notEnoughThumbnailsToScroll = false;
		} else {
			this.notEnoughThumbnailsToScroll = true;
			this.thumbnailWindowScrollOffset.x = 0;
			this.thumbnailScrollWindowElement.style.left = (this.thumbnailWindowScrollOffset.x).toString() + "px";
		}

		if (this.currentMenuState === "imageThumbnailWindow") {
			this.setThumbnailPosition(this.imageThumbnailButtons, this.imageThumbSize, thumbSpacer, maxRows, neededColumns);
		}

		if (this.currentMenuState === "pdfThumbnailWindow") {
			this.setThumbnailPosition(this.pdfThumbnailButtons, this.imageThumbSize, thumbSpacer, maxRows, neededColumns);
		}

		if (this.currentMenuState === "videoThumbnailWindow") {
			this.setThumbnailPosition(this.videoThumbnailButtons, this.imageThumbSize, thumbSpacer, maxRows, neededColumns);
		}

		if (this.currentMenuState === "applauncherThumbnailWindow") {
			this.setThumbnailPosition(this.appThumbnailButtons, this.imageThumbSize * 2, thumbSpacer, maxRows, neededColumns);
		}

		if (this.currentMenuState === "sessionThumbnailWindow") {
			this.setThumbnailPosition(this.sessionThumbnailButtons, this.imageThumbSize, thumbSpacer, maxRows, neededColumns);
		}
	};

	/**
	 * Sets the state of the radial menu: buttons, content windows
	 *
	 * @method setState
	 * @param stateData {} node-radialMenu.js getInfo()
	 */
	this.setState = function(stateData) {
		// console.log("radialMenu: setState " + stateData.thumbnailWindowState);
		// {id: this.pointerid, x: this.left, y: this.top, radialMenuSize: this.radialMenuSize,
		// 	thumbnailWindowSize: this.thumbnailWindowSize, radialMenuScale: this.radialMenuScale,
		// 	visble: this.visible, layout: this.radialButtons, thumbnailWindowState: this.thumbnailWindowState }
		// console.log(stateData);
		this.showArrangementSubmenu = stateData.arrangementMenuState;

		if (stateData.thumbnailWindowState === "image") {
			this.setMenu("imageThumbnailWindow");
		} else if (stateData.thumbnailWindowState === "pdf") {
			this.setMenu("pdfThumbnailWindow");
		} else if (stateData.thumbnailWindowState === "video") {
			this.setMenu("videoThumbnailWindow");
		} else if (stateData.thumbnailWindowState === "applauncher") {
			this.setMenu("applauncherThumbnailWindow");
		} else if (stateData.thumbnailWindowState === "session") {
			this.setMenu("sessionThumbnailWindow");
		}  else if (stateData.thumbnailWindowState === "closed") {
			this.setMenu("radialMenu");
		}
	};
}

/**
 * ButtonWidget used for menu and thumbnail buttons
 *
 * @class ButtonWidget
 * @constructor
 */
function ButtonWidget() {
	this.ctx = null;
	this.resrcPath = null;

	this.posX = 100;
	this.posY = 100;
	this.angle = 0;
	this.width = imageThumbSize;
	this.height = imageThumbSize;

	this.hitboxWidth = imageThumbSize;
	this.hitboxheight = imageThumbSize;

	this.defaultColor = "rgba(210, 210, 210, 1.0)";
	this.mouseOverColor = "rgba(210, 210, 10, 1.0)";
	this.clickedColor = "rgba(10, 210, 10, 1.0)";
	this.pressedColor = "rgba(10, 210, 210, 1.0)";

	this.releasedColor = "rgba(10, 10, 210, 1.0)";

	this.litColor = "rgba(10, 210, 210, 1.0)";

	this.buttonImage = null;
	this.overlayImage = null;
	this.defaultImage = null;

	this.useBackgroundColor = true;
	this.useEventOverColor = false;
	this.simpleTint = false;

	this.alignment = "left";
	this.hitboxShape = "box";

	this.isLit = false;
	this.isHoveredOver = false;

	// Button states:
	// -2 = Hidden (and Disabled)
	// -1 = Disabled (Visible, but ignores events - eventually will be dimmed?)
	// 0  = Idle
	// 1  = First over
	// 2  = Pressed
	// 3  = Held
	// 4  = Released
	// 5	= Lit
	// 6	= Over
	this.state = 0;

	this.buttonData = {};

	this.init = function(id, ctx, resrc) {
		this.ctx = ctx;
		this.resrcPath = resrc;

		this.tintImage = document.createElement("canvas");
		this.tintImageCtx = this.tintImage.getContext("2d");
	};

	this.setPosition = function(x, y) {
		this.posX = x;
		this.posY = y;
	};

	this.setRotation = function(a) {
		this.angle = a;
	};

	this.setData = function(data) {
		this.buttonData = data;
	};

	this.setButtonImage = function(image) {
		this.buttonImage = image;
	};

	this.setDefaultImage = function(image) {
		this.defaultImage = image;
	};

	this.setOverlayImage = function(overlayImage, scale) {
		this.overlayImage = overlayImage;
		this.overlayScale = scale;
	};

	this.setSize = function(w, h) {
		this.width = w;
		this.height = h;
	};

	this.setHitboxSize = function(w, h) {
		this.hitboxWidth  = w;
		this.hitboxheight = h;
	};

	this.getData = function() {
		return this.buttonData;
	};

	this.draw = function() {
		if (this.state === -2) { // Button is hidden
			return;
		}
		// Default - align "left"
		var translate = { x: this.posX, y: this.posY };
		var offsetHitbox = { x: 0, y: 0 };
		var offset = { x: 0, y: 0 };

		if (this.alignment === "centered") {
			offset = { x: -this.width / 2, y: -this.height / 2 };
			offsetHitbox = { x: -this.hitboxWidth / 2, y: -this.hitboxWidth / 2 };
		}

		this.ctx.save();
		this.ctx.translate(translate.x, translate.y);

		if (this.useBackgroundColor) {
			if (this.state === 5) {
				this.ctx.fillStyle = this.litColor;
			} else {
				this.ctx.fillStyle = this.defaultColor;
			}
			if (this.hitboxShape === "box") {
				this.ctx.fillRect(offsetHitbox.x, offsetHitbox.y, this.hitboxWidth, this.hitboxheight);
			}
		}
		if (this.state === 1) {
			this.ctx.fillStyle = this.mouseOverColor;
		} else if (this.state === 3) {
			this.ctx.fillStyle = this.clickedColor;
			// this.state = 2; // Pressed state
		} else if (this.state === 2) {
			this.ctx.fillStyle = this.pressedColor;
		} else if (this.state === 4) {
			this.ctx.fillStyle = this.releasedColor;
			// this.state = 1;
		}

		// Draw icon aligned centered
		if (this.buttonImage !== null) {
			// this.ctx.rotate( this.angle);

			// draw the original image
			try {
				this.ctx.drawImage(this.buttonImage, offset.x, offset.y, this.width, this.height);
			} catch (e) {
				this.buttonImage = this.defaultImage;
				this.ctx.drawImage(this.buttonImage, offset.x, offset.y, this.width, this.height);
			}
			if (this.state === 5) {
				this.drawTintImage(this.buttonImage, offset, this.width, this.height, this.litColor, 0.5);
			} else if (this.state === 1) {
				this.drawTintImage(this.buttonImage, offset, this.width, this.height, this.mouseOverColor, 0.8);
			}
		}
		this.ctx.restore();

		if (this.overlayImage !== null) {
			this.ctx.save();
			this.ctx.translate(translate.x, translate.y);
			this.ctx.drawImage(this.overlayImage, -this.width * this.overlayScale / 2,
				-this.height * this.overlayScale / 2,
				this.width * this.overlayScale,
				this.height * this.overlayScale);
			this.ctx.restore();
		}
	};

	this.drawTintImage = function(image, offset, width, height, color, alpha) {
		var im;

		// Tint the image (Part 1)
		// create offscreen buffer,
		this.tintImage.width  = width;
		this.tintImage.height = height;

		// Firefox doesnt seem to deal with blending SVG onto canvas
		if (__SAGE2__.browser.isFirefox) {
			// Render the SVG into an image
			this.tintImageCtx.drawImage(image, 0, 0, width, height);
			// and make an image
			im = new Image();
			im.src = this.tintImage.toDataURL();
		}

		// fill offscreen buffer with the tint color
		this.tintImageCtx.fillStyle = color;
		this.tintImageCtx.fillRect(0, 0, this.tintImage.width, this.tintImage.height);

		// destination atop makes a result with an alpha channel identical to fg,
		//   but with all pixels retaining their original color *as far as I can tell*
		this.tintImageCtx.globalCompositeOperation = "destination-in";
		if (__SAGE2__.browser.isFirefox) {
			this.tintImageCtx.drawImage(im, 0, 0, width, height);
			im = null;
		} else {
			this.tintImageCtx.drawImage(image, 0, 0, width, height);
		}

		// then set the global alpha to the amound that you want to tint it,
		//   and draw the buffer directly on top of it.
		this.ctx.globalAlpha = alpha;

		// draw the tinted overlay
		this.ctx.drawImage(this.tintImage, offset.x, offset.y, width, height);
	};

	this.onEvent = function(type, user, position, data) {
		if (this.state < 0) {
			// Button is disabled or hidden
			return 0;
		}

		if (this.isPositionOver(user, position)) {
			this.mouseOverColor = data.color;

			if (type === "pointerPress" && this.state !== 2) {
				this.state = 3; // Click state
				if (this.useEventOverColor) {
					this.ctx.redraw = true;
				}
			} else if (type === "pointerRelease") {
				this.state = 4;
				if (this.useEventOverColor) {
					this.ctx.redraw = true;
				}
			} else if (type === "pointerMove") {
				if (this.state !== 1) {
					this.state = 1;
					if (this.useEventOverColor) {
						this.ctx.redraw = true;
					}
				} else if (this.state === 1) {
					// this.state = 6;
				}
			}

			/*else if (this.state !== 2) {
				if (this.state !== 1) {
					this.state = 5;
					if (this.useEventOverColor) {
						this.ctx.redraw = true;
					}
				}
				else {
					this.state = 1;
				}
			}*/
			return 1;
		}
		if (this.isLit === false) {
			if (this.state !== 0 && this.useEventOverColor) {
				this.ctx.redraw = true;
			}
			this.state = 0;
		}
		return 0;
	};

	this.setButtonState = function(state) {
		this.state = state;
		this.ctx.redraw = true;
	};

	this.isPositionOver = function(id, position) {
		var x = position.x;
		var y = position.y;

		if (this.alignment === "centered" && this.hitboxShape === "box") {
			x += this.hitboxWidth / 2;
			y += this.hitboxheight / 2;
		}

		if (this.hitboxShape === "box") {
			if (x >= this.posX && x <= this.posX + this.hitboxWidth && y >= this.posY && y <= this.posY + this.hitboxheight) {
				return true;
			}
			return false;
		}
		if (this.hitboxShape === "circle") {
			var distance = Math.sqrt(Math.pow(Math.abs(x - this.posX), 2) + Math.pow(Math.abs(y - this.posY), 2));

			if (distance <= this.hitboxWidth / 2) {
				return true;
			}
			return false;
		}
	};

	this.isFirstOver = function() {
		if (this.state === 1) {
			return true;
		}
		return false;
	};

	this.isOver = function() {
		if (this.state === 1 || this.state === 6) {
			return true;
		}
		return false;
	};

	this.isClicked = function() {
		if (this.state === 3) {
			this.state = 2;
			return true;
		}
		return false;
	};

	this.isReleased = function() {
		if (this.state === 4) {
			this.state = 0;
			return true;
		}
		return false;
	};

	this.isHidden = function() {
		if (this.state === -2) {
			return true;
		}
		return false;
	};

	this.isDisabled = function() {
		if (this.state === -1) {
			return true;
		}
		return false;
	};

	this.setHidden = function(val) {
		if (val) {
			this.state = -2;
		} else {
			this.state = 0;
		}
	};

	this.setDisabled = function(val) {
		if (val) {
			this.state = -1;
		} else {
			this.state = 0;
		}
	};
}
