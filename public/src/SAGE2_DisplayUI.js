// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-15

"use strict";

/**
 * Web user interface for SAGE2
 *
 * @module client
 * @submodule SAGE2DisplayUI
 */

/**
 * User interface drawn using Canvas2D
 *
 * @class SAGE2DisplayUI
 * @constructor
 */
function SAGE2DisplayUI() {
	this.config = null;
	this.wsio = null;
	this.scale = 1.0;
	this.logoAspect = 3.47828052509;
	this.logoLoaded = false;
	this.fileDrop = false;
	this.fileUpload = false;
	this.uploadPercent = 0;
	this.fileDropFontSize = 12;
	this.applications = {};
	this.appCount = 0;
	this.mediaStreamIcon = null;
	this.pointerX = 0;
	this.pointerY = 0;
	this.scrollTimeId = null;
}

/**
 * Initialize the object
 *
 * @method init
 * @param config {Object} display configuration object
 * @param wsio {Object} WebsocktIO object
 */
SAGE2DisplayUI.prototype.init = function(config, wsio) {
	this.svgLoadedFunc = this.svgLoaded.bind(this);

	this.config = config;
	this.wsio   = wsio;

	this.mediaStreamIcon = document.createElement('canvas');
	this.mediaStreamIcon.width  = 512;
	this.mediaStreamIcon.height = 512;

	var applicationsDiv = document.getElementById('applicationsDiv');
	var logo = document.createElement('img');
	logo.style.opacity  = 0.4;
	logo.style.position = "absolute";
	logo.style.left     = "50%";
	logo.style.top      = "50%";
	logo.style.webkitTransform = "translate(-50%, -50%)";
	logo.style.mozTransform    = "translate(-50%, -50%)";
	logo.style.transform       = "translate(-50%, -50%)";
	if ((this.config.totalWidth / this.config.totalHeight) <= this.logoAspect) {
		logo.style.width  = "75%";
	} else {
		logo.style.height = "75%";
	}
	// If bacground watermark defined
	if (this.config.background.watermark !== undefined && this.config.background.watermark.svg !== undefined) {
		logo.src = this.config.background.watermark.svg;
	} else {
		logo.src = "images/sage2.svg";
	}
	applicationsDiv.appendChild(logo);
};

/**
 * Draw the UI
 *
 * @method draw
 */
SAGE2DisplayUI.prototype.draw = function() {
	var sage2UI = document.getElementById('sage2UI');
	var ctx = sage2UI.getContext('2d');

	ctx.clearRect(0, 0, sage2UI.width, sage2UI.height);

	// tiled display layout
	var i;
	ctx.lineWidth = 2;
	ctx.strokeStyle = "rgba(86, 86, 86, 1.0)";
	var stepX = sage2UI.width / this.config.layout.columns;
	var stepY = sage2UI.height / this.config.layout.rows;
	ctx.beginPath();
	for (i = 1; i < this.config.layout.columns; i++) {
		ctx.moveTo(i * stepX, 0);
		ctx.lineTo(i * stepX, sage2UI.height);
	}
	for (i = 1; i < this.config.layout.rows; i++) {
		ctx.moveTo(0, i * stepY);
		ctx.lineTo(sage2UI.width, i * stepY);
	}
	ctx.closePath();
	ctx.stroke();

	// file drop overlay
	if (this.fileDrop === true) {
		ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
		ctx.fillRect(0, 0, sage2UI.width, sage2UI.height);

		var txt = "Drop multimedia files here";
		ctx.font = this.fileDropFontSize + "px Verdana";

		var textBoxWidth = Math.round(sage2UI.width * 0.75);
		var lines = this.textLineCount(ctx, txt, textBoxWidth);
		var lineHeight = this.fileDropFontSize * 1.2;
		var textBoxHeight = lineHeight * lines;

		var textBoxX = (sage2UI.width - textBoxWidth) / 2;
		var textBoxY = (sage2UI.height - textBoxHeight) / 2;
		var textBoxRadius = this.fileDropFontSize * 0.5;
		ctx.textAlign = "center";
		ctx.fillStyle = "rgba(86, 86, 86, 0.7)";
		this.drawRoundedRect(ctx, textBoxX, textBoxY, textBoxWidth, textBoxHeight, textBoxRadius, true, false);

		var textStartX = sage2UI.width / 2 + this.fileDropFontSize * 0.175;
		var textStartY = sage2UI.height / 2 - ((lines - 1) / 2) * lineHeight + this.fileDropFontSize * 0.333;
		ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
		this.wrapText(ctx, txt, textStartX, textStartY, textBoxWidth, lineHeight);
	}

	// file upload overlay
	if (this.fileUpload === true) {
		ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
		ctx.fillRect(0, 0, sage2UI.width, sage2UI.height);

		var progressWidth = Math.round(sage2UI.width * 0.75);
		var progressHeight = progressWidth * 0.07;
		var progressX = (sage2UI.width - progressWidth) / 2;
		var progressY = (sage2UI.height - progressHeight) / 2;
		var progressRadius = progressHeight * 0.5;

		ctx.strokeStyle = "rgba(30, 30, 30, 0.85)";
		ctx.strokeWidth = 2;
		this.drawRoundedRect(ctx, progressX, progressY, progressWidth, progressHeight, progressRadius, false, true);

		var percentWidth = Math.round(progressWidth * this.uploadPercent);
		if (percentWidth > progressHeight) {
			ctx.fillStyle = "rgba(86, 86, 86, 0.85)";
			this.drawRoundedRect(ctx, progressX, progressY, percentWidth, progressHeight, progressRadius, true, false);
		}
	}
};

/**
 * Callback when the browser is resize, adjust the position of UI elements
 *
 * @method resize
 * @param ratio {Number} scale factor
 */
SAGE2DisplayUI.prototype.resize = function(ratio) {
	var displayUI        = document.getElementById('displayUI');
	var sage2UI          = document.getElementById('sage2UI');
	var applicationsDiv  = document.getElementById('applicationsDiv');

	// Extra scaling factor
	ratio = ratio || 1.0;
	var menuScale = 1.0;
	// var winWidth = window.innerWidth * ratio;
	// if (window.innerWidth < 856) {
	// 	menuScale = window.innerWidth / 856;
	// }

	// window width minus padding
	var freeWidth   = window.innerWidth  - 26;
	//  bottom margin, and bottom buttons
	//  height scaled by ratio (like half the screen height)
	var sage2Aspect = this.config.totalWidth / this.config.totalHeight;

	// Calculate new sizes
	var drawWidth  = Math.floor(freeWidth * 1);
	var drawHeight = Math.floor(freeWidth * 1 / sage2Aspect);

	if ((drawHeight / window.innerHeight) < ratio) {
		// the UI is already smaller than needed
		ratio = 1.0;
		drawWidth  = Math.floor(freeWidth * ratio);
		drawHeight = Math.floor(freeWidth * ratio / sage2Aspect);
	}

	var freeHeight  = (window.innerHeight * ratio) - 24 - (86 * menuScale);
	if (freeHeight < 100) {
		freeHeight = 100;
	}

	// Check if it fits
	if (drawHeight >= freeHeight) {
		drawHeight = Math.floor(freeHeight);
		drawWidth  = Math.floor(drawHeight * sage2Aspect);
	}

	displayUI.style.marginLeft = parseInt((freeWidth - drawWidth) / 2 + 10, 10) + "px";

	var minDim = Math.min(drawWidth, drawHeight);
	this.fileDropFontSize = Math.round(minDim * 0.075);
	this.scale = drawWidth / this.config.totalWidth;

	sage2UI.width  = drawWidth;
	sage2UI.height = drawHeight;
	applicationsDiv.style.width  = drawWidth + "px";
	applicationsDiv.style.height = drawHeight + "px";
	displayUI.style.height = (drawHeight + 5) + "px";

	this.resizeAppWindows();

	this.draw();
};

SAGE2DisplayUI.prototype.resizeAppWindows = function(event) {
	var key;
	for (key in this.applications) {
		var appWindow = document.getElementById(key);
		var appWindowTitle = document.getElementById(key + "_title");
		var appWindowArea = document.getElementById(key + "_area");

		appWindow.style.width = Math.round(this.applications[key].width * this.scale) + "px";
		appWindow.style.height = Math.round((this.applications[key].height + this.config.ui.titleBarHeight) * this.scale) + "px";
		appWindow.style.left = Math.round(this.applications[key].left * this.scale) + "px";
		appWindow.style.top = Math.round(this.applications[key].top * this.scale) + "px";

		appWindowTitle.style.width = Math.round(this.applications[key].width * this.scale) + "px";
		appWindowTitle.style.height = Math.round(this.config.ui.titleBarHeight * this.scale) + "px";

		appWindowArea.style.top = Math.round(this.config.ui.titleBarHeight * this.scale) + "px";
		appWindowArea.style.width = Math.round(this.applications[key].width * this.scale) + "px";
		appWindowArea.style.height = Math.round(this.applications[key].height * this.scale) + "px";
	}
};

SAGE2DisplayUI.prototype.svgLoaded = function(event) {
	this.logoLoaded = true;
	this.resize();
};

/**
 * Generate an image icon for media stream apps
 *
 * @method generateMediaStreamIcon
 * @param title {String} title of application
 * @param color {String} color for background of icon
 */
SAGE2DisplayUI.prototype.generateMediaStreamIcon = function(title, color) {
	var msiCtx = this.mediaStreamIcon.getContext('2d');
	msiCtx.clearRect(0, 0, this.mediaStreamIcon.width, this.mediaStreamIcon.height);
	var size = this.mediaStreamIcon.width;
	var mid = size / 2;
	var x, y, w, h;
	var radius;

	x = mid - (size * 0.1);
	y = mid + (size * 0.2125);
	w = size * 0.2;
	h = size * 0.15;
	msiCtx.fillStyle = "rgba(150, 150, 150, 1.0)";
	msiCtx.fillRect(x, y, w, h);

	radius = 0.035 * size;
	x = mid - (size * 0.2);
	y = mid + (size * 0.3125);
	w = size * 0.4;
	h = size * 0.1;
	msiCtx.fillStyle = "rgba(150, 150, 150, 1.0)";
	this.drawRoundedRect(msiCtx, x, y, w, h, radius, true, false);

	var strokeWidth = 0.0209 * size;
	radius = 0.035 * size;
	x = mid - (size * 0.5)    + (strokeWidth / 2);
	y = mid - (size * 0.4125) + (strokeWidth / 2);
	w = size - strokeWidth;
	h = w * 0.625;
	if (color) {
		msiCtx.fillStyle = color;
	} else {
		msiCtx.fillStyle = "rgba(150, 180, 220, 1.0)";
	}
	msiCtx.lineWidth = strokeWidth;
	msiCtx.strokeStyle = "rgba(150, 150, 150, 1.0)";
	this.drawRoundedRect(msiCtx, x, y, w, h, radius, true, true);

	var mediaTextSize = size * 0.1;
	var mediaTextW = (size - 2 * strokeWidth) * 0.9;
	msiCtx.font = mediaTextSize + "px Verdana";
	msiCtx.fillStyle = "rgba(0, 0, 0, 1.0)";
	var mediaTextLines = this.textLineCount(msiCtx, title, mediaTextW);
	var mediaTextLineHeight = mediaTextSize * 1.2;
	var mediaTextH = mediaTextLineHeight * mediaTextLines;
	var mediaTextX = (x + w / 2) - (mediaTextW / 2);
	var mediaTextY = (y + h / 2) - (mediaTextH / 2);
	msiCtx.fillStyle = "rgba(255, 255, 255, 0.4)";
	this.drawRoundedRect(msiCtx, mediaTextX, mediaTextY, mediaTextW, mediaTextH, radius, true, false);


	mediaTextX = (x + w / 2) + mediaTextSize * 0.175;
	mediaTextY = (y + h / 2) - ((mediaTextLines - 1) / 2) * mediaTextLineHeight + mediaTextSize * 0.333;
	msiCtx.textAlign = "center";
	msiCtx.fillStyle = "rgba(0, 0, 0, 1.0)";
	this.wrapText(msiCtx, title, mediaTextX, mediaTextY, mediaTextW, mediaTextLineHeight);

	return this.mediaStreamIcon.toDataURL("image/png");
};

/**
 * Update the upload progress bar
 *
 * @method setUploadPercent
 * @param percent {Number} progress [0.0 - 1.0]
 */
SAGE2DisplayUI.prototype.setUploadPercent = function(percent) {
	this.uploadPercent = percent; // [0.0 - 1.0]   (not 0 - 100)
};

/**
 * Add an application with its icon and draw
 *
 * @method addAppWindow
 * @param data {Object} contains .icon image of the application
 */
SAGE2DisplayUI.prototype.addAppWindow = function(data) {
	var applicationsDiv  = document.getElementById('applicationsDiv');

	var appWindow = document.createElement('div');
	appWindow.id = data.id;
	appWindow.className = "appWindow";
	appWindow.style.width = Math.round(data.width * this.scale) + "px";
	appWindow.style.height = Math.round((data.height + this.config.ui.titleBarHeight) * this.scale) + "px";
	appWindow.style.left = Math.round(data.left * this.scale) + "px";
	appWindow.style.top = Math.round(data.top * this.scale) + "px";
	appWindow.style.zIndex = this.appCount;

	var appWindowTitle = document.createElement('div');
	appWindowTitle.id = data.id + "_title";
	appWindowTitle.className    = "appWindowTitle";
	appWindowTitle.style.left   = "0px";
	appWindowTitle.style.top    = "0px";
	appWindowTitle.style.width  = Math.round(data.width * this.scale) + "px";
	appWindowTitle.style.height = Math.round(this.config.ui.titleBarHeight * this.scale) + "px";
	appWindowTitle.style.backgroundColor = "rgba(230, 230, 230, 1.0)";

	var appWindowArea = document.createElement('div');
	appWindowArea.id = data.id + "_area";
	appWindowArea.className    = "appWindowArea";
	appWindowArea.style.left   = "0px";
	appWindowArea.style.top    = Math.round(this.config.ui.titleBarHeight * this.scale) + "px";
	appWindowArea.style.width  = Math.round(data.width * this.scale) + "px";
	appWindowArea.style.height = Math.round(data.height * this.scale) + "px";
	appWindowArea.style.backgroundColor = "rgba(72, 72, 72, 1.0)";

	var appIcon = document.createElement('img');
	appIcon.id = data.id + "_icon";
	appIcon.className = "appWindowIcon";
	if (data.width < data.height) {
		appIcon.style.width  = "100%";
	} else {
		appIcon.style.height = "100%";
	}
	appIcon.onerror = function(event) {
		setTimeout(function() {
			appIcon.src = data.icon + "_512.jpg";
		}, 1000);
	};

	if (data.icon) {
		appIcon.src = data.icon + "_512.jpg";
	} else if (data.application === "media_stream" || data.application === "media_block_stream") {
		appIcon.src = this.generateMediaStreamIcon(data.title, data.color);
	} else {
		// appIcon.src = "images/blank.png";
		appIcon.src = "images/unknownapp_512.png";
	}

	appWindowArea.appendChild(appIcon);
	appWindow.appendChild(appWindowTitle);
	appWindow.appendChild(appWindowArea);
	applicationsDiv.appendChild(appWindow);

	this.appCount++;
	this.applications[data.id] = data;
};

/**
 * Reorder the application list and draw
 *
 * @method updateItemOrder
 * @param order {Object} contains the application ids and zIndex
 */
SAGE2DisplayUI.prototype.updateItemOrder = function(order) {
	var key;
	for (key in order) {
		if (this.applications.hasOwnProperty(key)) {
			var appWindow = document.getElementById(key);
			appWindow.style.zIndex = order[key];
		}
	}
};

/**
 * Move an application and redraw
 *
 * @method setItemPosition
 * @param position_data {Object}  oject with .elemId .elemLeft .elemTop .elemWidth .elemHeight fields
 */
SAGE2DisplayUI.prototype.setItemPosition = function(position_data) {
	this.applications[position_data.elemId].left = position_data.elemLeft;
	this.applications[position_data.elemId].top  = position_data.elemTop;

	var appWindow = document.getElementById(position_data.elemId);

	appWindow.style.left = Math.round(position_data.elemLeft * this.scale) + "px";
	appWindow.style.top = Math.round(position_data.elemTop * this.scale) + "px";
};

/**
 * Move and scale an application and redraw
 *
 * @method setItemPositionAndSize
 * @param position_data {Object}  oject with .elemId .elemLeft .elemTop .elemWidth .elemHeight fields
 */
SAGE2DisplayUI.prototype.setItemPositionAndSize = function(position_data) {
	this.applications[position_data.elemId].left   = position_data.elemLeft;
	this.applications[position_data.elemId].top    = position_data.elemTop;
	this.applications[position_data.elemId].width  = position_data.elemWidth;
	this.applications[position_data.elemId].height = position_data.elemHeight;

	var appWindow = document.getElementById(position_data.elemId);
	var appWindowTitle = document.getElementById(position_data.elemId + "_title");
	var appWindowArea = document.getElementById(position_data.elemId + "_area");

	appWindow.style.width = Math.round(position_data.elemWidth * this.scale) + "px";
	appWindow.style.height = Math.round((position_data.elemHeight + this.config.ui.titleBarHeight) * this.scale) + "px";
	appWindow.style.left = Math.round(position_data.elemLeft * this.scale) + "px";
	appWindow.style.top = Math.round(position_data.elemTop * this.scale) + "px";

	appWindowTitle.style.width = Math.round(position_data.elemWidth * this.scale) + "px";

	appWindowArea.style.width = Math.round(position_data.elemWidth * this.scale) + "px";
	appWindowArea.style.height = Math.round(position_data.elemHeight * this.scale) + "px";
};

/**
 * Delete an application and draw
 *
 * @method deleteApp
 * @param id {String} application id
 */
SAGE2DisplayUI.prototype.deleteApp = function(id) {
	var applicationsDiv  = document.getElementById('applicationsDiv');
	var appWindow = document.getElementById(id);
	applicationsDiv.removeChild(appWindow);

	delete this.applications[id];
};

/**
 * Draw a rounded rectangle
 *
 * @method drawRoundedRect
 * @param ctx {Object} canvas context
 * @param x {Number} position x
 * @param y {Number} position y
 * @param width {Number}  width
 * @param height {Number} height
 * @param radius {Number} radius of corner
 * @param fillFlag {Bool} whether to fill or not
 * @param strokeFlag {Bool} whether to stroke or not
 */
SAGE2DisplayUI.prototype.drawRoundedRect = function(ctx, x, y, width, height, radius, fillFlag, strokeFlag) {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
	if (fillFlag === true) {
		ctx.fill();
	}
	if (strokeFlag === true) {
		ctx.stroke();
	}
};

/**
 * Count the number of lines for a given maximum width
 *
 * @method textLineCount
 * @param ctx {Object} canvas context
 * @param text {String} text to be drawn
 * @param maxWidth {Number} maximum width
 */
SAGE2DisplayUI.prototype.textLineCount = function(ctx, text, maxWidth) {
	var words = text.split(" ");
	var line  = "";
	var count = 1;

	for (var n = 0; n < words.length; n++) {
		var testLine = line + words[n] + " ";
		var testWidth = ctx.measureText(testLine).width;
		if (testWidth > maxWidth && n > 0) {
			line = words[n] + ' ';
			count++;
		} else {
			line = testLine;
		}
	}
	return count;
};

/**
 * Draw some text, and wrap it over multiple lines if necessary
 *
 * @method wrapText
 * @param ctx {Object} canvas context
 * @param text {String} text to be drawn
 * @param x {Number} position x
 * @param y {Number} position y
 * @param maxWidth {Number} maximum width
 * @param lineHeight {Number} line height
 */
SAGE2DisplayUI.prototype.wrapText = function(ctx, text, x, y, maxWidth, lineHeight) {
	var words = text.split(" ");
	var line  = "";

	for (var n = 0; n < words.length; n++) {
		var testLine  = line + words[n] + " ";
		var testWidth = ctx.measureText(testLine).width;
		if (testWidth > maxWidth && n > 0) {
			ctx.fillText(line, x, y);
			line = words[n] + ' ';
			y += lineHeight;
		} else {
			line = testLine;
		}
	}
	ctx.fillText(line, x, y);
};

/**
 * Handler for mouse up
 *
 * @method pointerPress
 * @param btn {String} mouse button name (left, right, middle)
 */
SAGE2DisplayUI.prototype.pointerPress = function(btn) {
	if (btn !== "right") {
		this.wsio.emit('pointerPress', {button: btn});
	}
};

/**
 * Handler for mouse up
 *
 * @method pointerRelease
 * @param btn {String} mouse button name (left, right, middle)
 */
SAGE2DisplayUI.prototype.pointerRelease = function(btn) {
	if (btn !== "right") {
		this.wsio.emit('pointerRelease', {button: btn});
	}
};

/**
 * Handler for mouse move
 *
 * @method pointerMove
 * @param x {Number} x value
 * @param y {Number} y value
 */
SAGE2DisplayUI.prototype.pointerMove = function(x, y) {
	if (this.pointerX === x && this.pointerY === y) {
		return;
	}
	this.pointerX = x;
	this.pointerY = y;
	var globalX = this.pointerX / this.scale;
	var globalY = this.pointerY / this.scale;
	this.wsio.emit('pointerPosition', {pointerX: globalX, pointerY: globalY});
};

/**
 * Handler for scrolling
 *
 * @method pointerScroll
 * @param value {Number} scroll amount
 */
SAGE2DisplayUI.prototype.pointerScroll = function(x, y, value) {
	if (this.scrollTimeId === null) {
		this.pointerMove(x, y);
		this.wsio.emit('pointerScrollStart');
	} else {
		clearTimeout(this.scrollTimeId);
	}
	this.wsio.emit('pointerScroll', {wheelDelta: value});

	var _this = this;
	this.scrollTimeId = setTimeout(function() {
		_this.wsio.emit('pointerScrollEnd');
		_this.scrollTimeId = null;
	}, 500);
};

/**
 * Handler for double click
 *
 * @method pointerDblClick
 */
SAGE2DisplayUI.prototype.pointerDblClick = function() {
	this.wsio.emit('pointerDblClick');
};

/**
 * Handler for key down
 *
 * @method keyDown
 * @param keyCode {Number} character code
 */
SAGE2DisplayUI.prototype.keyDown = function(x, y, keyCode) {
	if (keyCode !== 27) { // not ESC key
		this.pointerMove(x, y);
		this.wsio.emit('keyDown', {code: keyCode});
		if (keyCode === 9) { // tab is a special case - must emulate keyPress event
			this.wsio.emit('keyPress', {code: keyCode, character: String.fromCharCode(keyCode)});
		}
		// if a special key - prevent default (otherwise let continue to keyPress)
		if (keyCode <= 7 || (keyCode >= 10 && keyCode <= 15) || keyCode === 32 ||
			(keyCode >= 47 && keyCode <= 90) || (keyCode >= 94 && keyCode <= 111) ||
			keyCode >= 146) {
			return false;
		}
	}
	return true;
};

/**
 * Handler for key up
 *
 * @method keyUp
 * @param keyCode {Number} character code
 */
SAGE2DisplayUI.prototype.keyUp = function(x, y, keyCode) {
	if (keyCode !== 27) { // not ESC key
		this.pointerMove(x, y);
		this.wsio.emit('keyUp', {code: keyCode});
	}
	return true;
};

/**
 * Handler for key press
 *
 * @method keyPress
 * @param charCode {Number} character code
 */
SAGE2DisplayUI.prototype.keyPress = function(x, y, charCode) {
	this.pointerMove(x, y);
	this.wsio.emit('keyPress', {code: charCode, character: String.fromCharCode(charCode)});
	return true;
};

