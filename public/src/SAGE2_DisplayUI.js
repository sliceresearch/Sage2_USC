// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-15

/**
 * Web user interface for SAGE2
 *
 * @module SAGE2DisplayUI
 */

/**
 * User interface drawn using Canvas2D
 *
 * @class SAGE2DisplayUI
 * @constructor
 */
function SAGE2DisplayUI() {
	/**
	* Initialize the object
	*
	* @method init
	* @param config {Object} display configuration object
	* @param wsio {Object} WebsocktIO object
	*/
	this.init = function(config, wsio) {
		var _this   = this;
		this.config = config;
		this.wsio   = wsio;
		this.scale  = 1.0;
		this.logo   = new Image();
		this.logo.onload = function(event) {
			_this.resize();
		};
		this.logo.src   = "images/EVL-LAVA_UI.svg";
		this.logoAspect = 3.47828052509;
		this.fileDrop   = false;
		this.fileUpload = false;
		this.uploadPercent    = 0;
		this.fileDropFontSize = 12;

		this.applications = [];
		this.pointerX = 0;
		this.pointerY = 0;
	};

	/**
	* Draw the UI
	*
	* @method draw
	*/
	this.draw = function() {
		var i, size, x, y, w, h;
		var sage2UI = document.getElementById('sage2UI');
		var ctx = sage2UI.getContext('2d');

		// background
		ctx.fillStyle = "rgba(180, 180, 180, 1.0)";
		ctx.fillRect(0, 0, sage2UI.width, sage2UI.height);

		var logoX, logoY, logoW, logoH;
		if((sage2UI.width/sage2UI.height) <= this.logoAspect){
			logoW = sage2UI.width * 0.75;
			logoH = logoW / this.logoAspect;
		}
		else {
			logoH = sage2UI.height * 0.75;
			logoW = logoH * this.logoAspect;
		}
		logoX = sage2UI.width/2  - logoW/2;
		logoY = sage2UI.height/2 - logoH/2;

		// doesnt seem enough for Internet Explorer: SVG file might not be loaded
		if (this.logo.complete && this.logo.naturalWidth !== undefined) {
			// draw the logo in the background
			ctx.drawImage(this.logo, logoX, logoY, logoW, logoH);
		}

		// applications
		for(i=0; i<this.applications.length; i++){
			// item
			ctx.fillStyle = "rgba(230, 230, 230, 1.0)";
			ctx.lineWidth = 2;
			ctx.strokeStyle = "rgba(108, 108, 108, 1.0)";

			var tLeft   = this.applications[i].left * this.scale;
			var tTop    = (this.applications[i].top) * this.scale;
			var tWidth  = this.applications[i].width * this.scale;
			var tHeight = this.config.ui.titleBarHeight * this.scale;

			ctx.fillRect(tLeft, tTop, tWidth, tHeight);
			ctx.strokeRect(tLeft, tTop, tWidth, tHeight);

			ctx.fillStyle = "rgba(72, 72, 72, 1.0)";

			var eLeft   =  this.applications[i].left * this.scale;
			var eTop    = (this.applications[i].top+this.config.ui.titleBarHeight) * this.scale;
			var eWidth  =  this.applications[i].width * this.scale;
			var eHeight =  this.applications[i].height * this.scale;

			ctx.fillRect(eLeft, eTop, eWidth, eHeight);
			ctx.strokeRect(eLeft, eTop, eWidth, eHeight);

			if(this.applications[i].application === "media_block_stream" || this.applications[i].application === "media_stream") {
				size = 0.85*Math.min(eWidth, eHeight);

				x = eLeft + (eWidth/2) - (size*0.1);
				y = eTop + (eHeight/2) + (size*0.2125);
				w = size * 0.2;
				h = size * 0.15;
				ctx.fillStyle = "rgba(150, 150, 150, 1.0)";
				ctx.fillRect(x, y, w, h);

				var radius = 0.035 * size;
				x = eLeft + (eWidth/2) - (size*0.2);
				y = eTop + (eHeight/2) + (size*0.3125);
				w = size * 0.4;
				h = size * 0.1;
				ctx.fillStyle = "rgba(150, 150, 150, 1.0)";
				this.drawRoundedRect(ctx, x, y, w, h, radius, true, false);

				var strokeWidth = 0.0209 * size;
				radius = 0.035 * size;
				x = eLeft + (eWidth/2) - (size*0.5)    + (strokeWidth/2);
				y = eTop + (eHeight/2) - (size*0.4125) + (strokeWidth/2);
				w = size - strokeWidth;
				h = w * 0.625;
				if(this.applications[i].color) ctx.fillStyle = this.applications[i].color;
				else                           ctx.fillStyle = "rgba(150, 180, 220, 1.0)";
				ctx.lineWidth = strokeWidth;
				ctx.strokeStyle = "rgba(150, 150, 150, 1.0)";
				this.drawRoundedRect(ctx, x, y, w, h, radius, true, true);

				var mediaTextSize = size*0.1;
				var mediaTextW = (size - 2*strokeWidth) * 0.9;
				ctx.font = mediaTextSize + "px Verdana";
				ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
				var mediaTextLines = this.textLineCount(ctx, this.applications[i].title, mediaTextW);
				var mediaTextLineHeight = mediaTextSize * 1.2;
				var mediaTextH = mediaTextLineHeight * mediaTextLines;
				var mediaTextX = (x+w/2) - (mediaTextW/2);
				var mediaTextY = (y+h/2) - (mediaTextH/2);
				ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
				this.drawRoundedRect(ctx, mediaTextX, mediaTextY, mediaTextW, mediaTextH, radius, true, false);


				mediaTextX = (x+w/2) + mediaTextSize*0.175;
				mediaTextY = (y+h/2) - ((mediaTextLines-1)/2)*mediaTextLineHeight + mediaTextSize*0.333;
				ctx.textAlign = "center";
				ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
				this.wrapText(ctx, this.applications[i].title, mediaTextX, mediaTextY, mediaTextW, mediaTextLineHeight);
			}
			else if(this.applications[i].iconLoaded === true) {
				size = 0.85*Math.min(eWidth, eHeight);
				x = eLeft + (eWidth/2) - (size/2);
				y = eTop + (eHeight/2) - (size/2);

				ctx.drawImage(this.applications[i].icon, x, y, size, size);
			}
		}

		// tiled display layout
		ctx.lineWidth = 2;
		ctx.strokeStyle = "rgba(86, 86, 86, 1.0)";
		var stepX = sage2UI.width/this.config.layout.columns;
		var stepY = sage2UI.height/this.config.layout.rows;
		ctx.beginPath();
		for(i=1; i<this.config.layout.columns; i++){
			ctx.moveTo(i*stepX, 0);
			ctx.lineTo(i*stepX, sage2UI.height);
		}
		for(i=1; i<this.config.layout.rows; i++){
			ctx.moveTo(0, i*stepY);
			ctx.lineTo(sage2UI.width, i*stepY);
		}
		ctx.closePath();
		ctx.stroke();

		// file drop overlay
		if (this.fileDrop === true) {
			ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
			ctx.fillRect(0, 0, sage2UI.width, sage2UI.height);

			var txt = "Drop multimedia files here";
			ctx.font = this.fileDropFontSize + "px Verdana";

			var textBoxWidth = Math.round(sage2UI.width*0.75);
			var lines = this.textLineCount(ctx, txt, textBoxWidth);
			var lineHeight = this.fileDropFontSize * 1.2;
			var textBoxHeight = lineHeight * lines;

			var textBoxX = (sage2UI.width-textBoxWidth) / 2;
			var textBoxY = (sage2UI.height-textBoxHeight) / 2;
			var textBoxRadius = this.fileDropFontSize * 0.5;
			ctx.textAlign = "center";
			ctx.fillStyle = "rgba(86, 86, 86, 0.7)";
			this.drawRoundedRect(ctx, textBoxX, textBoxY, textBoxWidth, textBoxHeight, textBoxRadius, true, false);

			var textStartX = sage2UI.width/2 + this.fileDropFontSize*0.175;
			var textStartY = sage2UI.height/2 - ((lines-1)/2)*lineHeight + this.fileDropFontSize*0.333;
			ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
			this.wrapText(ctx, txt, textStartX, textStartY, textBoxWidth, lineHeight);
		}

		// file upload overlay
		if(this.fileUpload === true){
			ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
			ctx.fillRect(0, 0, sage2UI.width, sage2UI.height);

			var progressWidth = Math.round(sage2UI.width*0.75);
			var progressHeight = progressWidth * 0.07;
			var progressX = (sage2UI.width-progressWidth) / 2;
			var progressY = (sage2UI.height-progressHeight) / 2;
			var progressRadius = progressHeight * 0.5;

			ctx.strokeStyle = "rgba(30, 30, 30, 0.85)";
			ctx.strokeWidth = 2;
			this.drawRoundedRect(ctx, progressX, progressY, progressWidth, progressHeight, progressRadius, false, true);

			var percentWidth = Math.round(progressWidth * this.uploadPercent);
			if(percentWidth > progressHeight){
				ctx.fillStyle = "rgba(86, 86, 86, 0.85)";
				this.drawRoundedRect(ctx, progressX, progressY, percentWidth, progressHeight, progressRadius, true, false);
			}
		}
	};

	/**
	* Update the upload progress bar
	*
	* @method setUploadPercent
	* @param percent {Number} progress [0.0 - 1.0]
	*/
	this.setUploadPercent = function(percent) {
		this.uploadPercent = percent; // [0.0 - 1.0]   (not 0 - 100)
	};

	/**
	* Add an application with its icon and draw
	*
	* @method addAppWindow
	* @param data {Object} contains .icon image of the application
	*/
	this.addAppWindow = function(data) {
		var icon = data.icon;
		data.icon = new Image();
		var _this = this;
		data.icon.onload = function(event) {
			data.iconLoaded = true;
			_this.draw();
		};
		data.icon.onerror = function(event) {
			setTimeout(function() {
				data.icon.src = icon+"_512.png";
			}, 1000);
		};
		data.iconLoaded = false;
		if (icon) data.icon.src = icon+"_512.png";
		else data.icon.src = "images/blank.png";
		this.applications.push(data);
	};

	/**
	* Delete an application and draw
	*
	* @method deleteApp
	* @param id {String} application id
	*/
	this.deleteApp = function(id) {
		var selectedIndex;
		var selectedItem;
		var i;
		for (i=0; i<this.applications.length; i++) {
			if (this.applications[i].id === id) {
				selectedIndex = i;
				selectedItem = this.applications[i];
				break;
			}
		}
		for (i=selectedIndex; i<this.applications.length-1; i++) {
			this.applications[i] = this.applications[i+1];
		}
		this.applications[this.applications.length-1] = selectedItem;
		this.applications.pop();
		this.draw();
	};

	/**
	* Reorder the application list and draw
	*
	* @method updateItemOrder
	* @param order {Array} contains the application ids in order
	*/
	this.updateItemOrder = function(order) {
		var i;
		var j;
		for( i=0; i<order.length; i++) {
			for (j=0; j<this.applications.length; j++) {
				if (this.applications[j].id === order[i]) {
					var tmp = this.applications[i];
					this.applications[i] = this.applications[j];
					this.applications[j] = tmp;
				}
			}
		}
		this.draw();
	};

	/**
	* Move an application and redraw
	*
	* @method setItemPosition
	* @param position_data {Object}  oject with .elemId .elemLeft .elemTop .elemWidth .elemHeight fields
	*/
	this.setItemPosition = function(position_data) {
		var i;
		for (i=0; i<this.applications.length; i++) {
			if (this.applications[i].id === position_data.elemId){
				this.applications[i].left = position_data.elemLeft;
				this.applications[i].top  = position_data.elemTop;
				break;
			}
		}
		this.draw();
	};

	/**
	* Move and scale an application and redraw
	*
	* @method setItemPositionAndSize
	* @param position_data {Object}  oject with .elemId .elemLeft .elemTop .elemWidth .elemHeight fields
	*/
	this.setItemPositionAndSize = function(position_data) {
		var i;
		for (i=0; i<this.applications.length; i++){
			if (this.applications[i].id === position_data.elemId) {
				this.applications[i].left   = position_data.elemLeft;
				this.applications[i].top    = position_data.elemTop;
				this.applications[i].width  = position_data.elemWidth;
				this.applications[i].height = position_data.elemHeight;
				break;
			}
		}
		this.draw();
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
	this.drawRoundedRect = function(ctx, x, y, width, height, radius, fillFlag, strokeFlag) {
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
		if (fillFlag === true)   ctx.fill();
		if (strokeFlag === true) ctx.stroke();
	};

	/**
	* Count the number of lines for a given maximum width
	*
	* @method textLineCount
	* @param ctx {Object} canvas context
	* @param text {String} text to be drawn
	* @param maxWidth {Number} maximum width
	*/
	this.textLineCount = function(ctx, text, maxWidth) {
		var words = text.split(" ");
		var line  = "";
		var count = 1;

		for (var n=0; n<words.length; n++) {
			var testLine = line + words[n] + " ";
			var testWidth = ctx.measureText(testLine).width;
			if (testWidth > maxWidth && n > 0) {
				line = words[n] + ' ';
				count++;
			}
			else {
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
	this.wrapText = function(ctx, text, x, y, maxWidth, lineHeight) {
		var words = text.split(" ");
		var line  = "";

		for (var n=0; n<words.length; n++) {
			var testLine  = line + words[n] + " ";
			var testWidth = ctx.measureText(testLine).width;
			if (testWidth > maxWidth && n > 0) {
				ctx.fillText(line, x, y);
				line = words[n] + ' ';
				y += lineHeight;
			}
			else {
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
	this.pointerPress = function(btn) {
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
	this.pointerRelease = function(btn) {
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
	this.pointerMove = function(x, y) {
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
	this.pointerScroll = function(value) {
		this.wsio.emit('pointerScrollStart');
		this.wsio.emit('pointerScroll', {wheelDelta: value});
	};

	/**
	* Handler for double click
	*
	* @method pointerDblClick
	*/
	this.pointerDblClick = function() {
		this.wsio.emit('pointerDblClick');
	};

	/**
	* Handler for key down
	*
	* @method keyDown
	* @param keyCode {Number} character code
	*/
	this.keyDown = function(keyCode) {
		if (keyCode !== 27) {
			this.wsio.emit('keyDown', {code: keyCode});
			if (keyCode === 9) { // tab is a special case - must emulate keyPress event
				this.wsio.emit('keyPress', {code: keyCode, character: String.fromCharCode(keyCode)});
			}
			// if a special key - prevent default (otherwise let continue to keyPress)
			if (keyCode <= 7 || (keyCode >= 10 && keyCode <= 15) || keyCode === 32 || (keyCode >= 47 && keyCode <= 90) || (keyCode >= 94 && keyCode <= 111) || keyCode >= 146) {
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
	this.keyUp = function(keyCode) {
		if (keyCode !== 27) {
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
	this.keyPress = function(charCode) {
		this.wsio.emit('keyPress', {code: charCode, character: String.fromCharCode(charCode)});
		return true;
	};

	/**
	* Callback when the browser is resize, adjust the position of UI elements
	*
	* @method resize
	*/
	this.resize = function() {
		var displayUI = document.getElementById('displayUI');
		var menuUI    = document.getElementById('menuUI');
		var sage2UI   = document.getElementById('sage2UI');

		var freeWidth   = window.innerWidth  - 25;      // window width minus padding
		var freeHeight  = window.innerHeight - 20 - 100 - 65; // size of 10px margin (top, bottom) and bottom buttons
		var sage2Aspect = this.config.totalWidth / this.config.totalHeight;
		//var freeAspect  = freeWidth / freeHeight;

		// wide sage2 display (compared to page)
		//if(freeAspect < sage2Aspect) {

		// Calculate new sizes
		sage2UI.width  = Math.floor(freeWidth);
		sage2UI.height = Math.floor(freeWidth / sage2Aspect);

		// Check if it fits
		if (sage2UI.height>=freeHeight) {
			sage2UI.height = Math.floor(freeHeight);
			sage2UI.width  = Math.floor(sage2UI.height * sage2Aspect);
		}

		displayUI.style.marginLeft = Math.floor((freeWidth-sage2UI.width) / 2 + 10).toString() + "px";
		displayUI.style.marginTop  = "10px";
		menuUI.style.marginLeft    = "20px";

		// Move the menubar below the drawing area
		menuUI.style.top    = (sage2UI.height+100) + "px";

		// Setting the buttons in a row
		// var myElements = document.querySelectorAll(".uiButton");
		// for (var i = 0; i < myElements.length; i++) {
		//     myElements[i].style.display = "inline-block";
		// }
		//}

		// tall sage2 display (compared to page)
		// else {
		// 	sage2UI.height = Math.floor(freeHeight) - 100 - 150; // 100 sage2 logo, 150: margin for buttons
		// 	sage2UI.width  = Math.floor(sage2UI.height * sage2Aspect);
		// 	displayUI.style.marginLeft = Math.floor((freeWidth-sage2UI.width) / 2 + 10).toString() + "px";
		// 	displayUI.style.marginTop  = "10px";
		// }

		// if(sage2UI.height < menuUI.offsetHeight) {
		// 	var dTop = (menuUI.offsetHeight-sage2UI.height) / 2;
		// 	var mTop = 0;
		// 	if(dTop < 10) {
		// 		mTop = 10-dTop;
		// 		dTop = 10;
		// 	}
		// 	displayUI.style.marginTop = dTop.toString() + "px";
		// 	menuUI.style.marginTop = mTop.toString() + "px";
		// }

		var minDim = Math.min(sage2UI.width, sage2UI.height);
		this.fileDropFontSize = Math.round(minDim * 0.075);

		this.scale = sage2UI.width / this.config.totalWidth;

		this.draw();
	};
}
