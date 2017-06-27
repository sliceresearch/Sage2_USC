// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

"use strict";

/**
 * @module client
 * @submodule Pointer
 */

/**
 * Graphical representation of a pointer, using Snap.svg and SVG
 *
 * @class Pointer
 * @constructor
 */
function Pointer() {

	// Variable definitions
	this.div                = null;
	this.snap               = null;
	this.pointerIcon        = null;
	this.pointerIconLoaded  = null;
	this.appModeIcon        = null;
	this.appModeIconLoaded  = null;
	this.winModeIcon        = null;
	this.winModeIconLoaded  = null;
	this.labelBG            = null;
	this.labelText          = null;
	this.color              = null;
	this.sourceType         = null;
	this.labelBGWidth       = null;

	/**
	* Init method, creates a div to attach Snap rendering into it
	*
	* @method init
	* @param id {String} id of the div supporting the pointer
	* @param label {String} label for the username
	* @param color {String} color for the pointer
	* @param width {Number} width in pixel
	* @param height {Number} height in pixel
	*/
	this.init = function(id, label, color, width, height) {
		this.div  = document.getElementById(id);
		this.snap = new Snap(width, height);
		this.div.appendChild(this.snap.node);

		this.color = color;
		this.mode  = 0;

		var pointerIconSize    = Math.round(height * 0.65);
		var pointerIconX       = Math.round(height * 0.25);
		var pointerIconY       = Math.round(height * 0.20);
		this.pointerIconLoaded = false;

		var winModeIconSize    = Math.round(height * 0.330);
		var winModeIconX       = Math.round(height * 0.0925);
		var winModeIconY       = Math.round(height * 0.044167);
		this.winModeIconLoaded = false;

		var appModeIconSize    = Math.round(height * 0.330);
		var appModeIconX       = Math.round(height * 0.0925);
		var appModeIconY       = Math.round(height * 0.044167);
		this.appModeIconLoaded = false;

		// Keep a copy of icon size to update width of snap
		this.iconWidth = pointerIconSize;

		var labelBGX = Math.round(height * 0.40);
		var labelBGY = Math.round(height * 0.65);
		var labelTextX    = Math.round(height * 0.5425);
		var labelTextY    = Math.round(height * 0.8475);
		var labelTextSize = Math.round(0.17 * height);
		var labelBGHeight = Math.round(height * 0.275);
		this.labelBGWidth = Math.round(height * 1.00);

		var _this = this;

		Snap.load("images/SAGE2 Pointer Arrow.svg", function(f) {
			_this.pointerIcon = f.select("svg");
			_this.pointerIcon.attr({
				id: "pointerIcon",
				x: pointerIconX,
				y: pointerIconY,
				width: pointerIconSize,
				height: pointerIconSize,
				preserveAspectRatio: "xMinYMin meet"
			});
			// add the loaded element into the SVG graph
			_this.snap.append(_this.pointerIcon);
			// mark it as loaded
			_this.pointerIconLoaded = true;
			// if both icons loaded, update colors
			if (_this.winModeIconLoaded === true && _this.appModeIconLoaded) {
				_this.updateIconColors();
			}
		});

		Snap.load("images/SAGE2 Window Manipulation.svg", function(f) {
			_this.winModeIcon = f.select("svg");
			_this.winModeIcon.attr({
				id: "winModeIcon",
				x: winModeIconX,
				y: winModeIconY,
				width: winModeIconSize,
				height: winModeIconSize,
				preserveAspectRatio: "xMinYMin meet"
			});
			// add the loaded element into the SVG graph
			_this.snap.prepend(_this.winModeIcon);
			// mark it as loaded
			_this.winModeIconLoaded = true;
			// if both icons loaded, update colors
			if (_this.pointerIconLoaded === true && _this.appModeIconLoaded === true) {
				_this.updateIconColors();
			}
		});

		Snap.load("images/SAGE2 Application Interaction.svg", function(f) {
			_this.appModeIcon = f.select("svg");
			_this.appModeIcon.attr({
				id: "appModeIcon",
				x: appModeIconX,
				y: appModeIconY,
				width: appModeIconSize,
				height: appModeIconSize,
				preserveAspectRatio: "xMinYMin meet"
			});

			_this.snap.prepend(_this.appModeIcon);

			_this.appModeIconLoaded = true;
			if (_this.pointerIconLoaded === true && _this.winModeIconLoaded === true) {
				_this.updateIconColors();
			}
		});

		// Black background, transparent
		this.labelBG = this.snap.rect(labelBGX, labelBGY, this.labelBGWidth, labelBGHeight, labelBGHeight / 2, labelBGHeight / 2);
		this.labelBG.attr({
			fill: "rgba(0, 0, 0, 0.6)"
		});

		// Arimo: SAGE2 "official" font
		this.labelText = this.snap.text(labelTextX, labelTextY, label).attr({
			fill: "#FFFFFF",
			fontSize: labelTextSize + "px",
			fontFamily: "Arimo"
		});

		// Get the size of the text and padding
		this.labelBGWidth = this.labelText.node.getBoundingClientRect().width + labelBGHeight;
		this.labelBG.attr({width: this.labelBGWidth});
		// Update width of parent SVG (snap)
		this.snap.attr({width: this.labelBGWidth + this.iconWidth});
	};

	/**
	* Change the color of the pointer
	*
	* @method setColor
	* @param color {String} color for the pointer
	*/
	this.setColor = function(color) {
		this.color = color;
		this.updateIconColors();
	};

	/**
	* Change the label of the pointer (user name)
	*
	* @method setLabel
	* @param label {String} label for the username
	*/
	this.setLabel = function(label) {
		this.labelText.attr({text: label});
		var labelBGHeight = Math.round(this.snap.node.getBoundingClientRect().height * 0.275);
		// Get the size of the text and padding
		this.labelBGWidth = this.labelText.node.getBoundingClientRect().width + labelBGHeight;
		this.labelBG.attr({width: this.labelBGWidth});
		// Update width of parent SVG (snap)
		this.snap.attr({width: this.labelBGWidth + this.iconWidth});
	};

	/**
	* Change the type of pointer: touch, mouse, ...
	*
	* @method setSourceType
	* @param type {String} new type of pointer
	*/
	this.setSourceType = function(type) {
		this.sourceType = type;
		this.updateIconColors();
	};

	/**
	* Switch between window manipulation and application interaction
	*
	* @method changeMode
	* @param mode {Number} new pointer mode: 0 window manipulation, 1 application interaction
	*/
	this.changeMode = function(mode) {
		this.mode = mode;
		this.updateIconColors();
	};

	/**
	* Recalculate the boxe around the pointer label
	*
	* @method updateBox
	* @param scale {Number} new scale for client -1
	*/
	this.updateBox = function(scale) {
		this.labelBG.attr({width: this.labelBGWidth / scale});
	};

	/**
	* Update the colors based on mode and type
	*
	* @method updateIconColors
	*/
	this.updateIconColors = function() {
		if (this.sourceType === "Touch") {
			if (this.pointerIconLoaded) {
				this.colorSVG(this.pointerIcon, "#000000", this.color);
			}
			if (this.winModeIconLoaded) {
				this.colorSVG(this.winModeIcon, "#000000", this.color);
			}
			if (this.appModeIconLoaded) {
				this.colorSVG(this.appModeIcon, "#000000", this.color);
			}

			// window manipulation
			if (this.mode === 0) {
				if (this.pointerIconLoaded) {
					this.pointerIcon.attr({display: "none"});
				}
				if (this.winModeIconLoaded) {
					this.winModeIcon.attr({display: ""});
				}
				if (this.appModeIconLoaded) {
					this.appModeIcon.attr({display: "none"});
				}
				this.labelText.attr({display: "none"});
				this.labelBG.attr({display: "none"});
			} else if (this.mode === 1) {
				// application interaction
				if (this.pointerIconLoaded) {
					this.pointerIcon.attr({display: "none"});
				}
				if (this.winModeIconLoaded) {
					this.winModeIcon.attr({display: "none"});
				}
				if (this.appModeIconLoaded) {
					this.appModeIcon.attr({display: ""});
				}
				this.labelText.attr({display: "none"});
				this.labelBG.attr({display: "none"});
			}
		} else {
			if (this.pointerIconLoaded) {
				this.colorSVG(this.pointerIcon, "#000000", this.color);
			}
			if (this.winModeIconLoaded) {
				this.colorSVG(this.winModeIcon, "#000000", "#FFFFFF");
			}
			if (this.appModeIconLoaded) {
				this.colorSVG(this.appModeIcon, "#000000", "#FFFFFF");
			}

			// window manipulation
			if (this.mode === 0) {
				if (this.winModeIconLoaded) {
					this.winModeIcon.attr({display: ""});
				}
				if (this.appModeIconLoaded) {
					this.appModeIcon.attr({display: "none"});
				}
			} else if (this.mode === 1) {
				// application interaction
				if (this.winModeIconLoaded) {
					this.winModeIcon.attr({display: "none"});
				}
				if (this.appModeIconLoaded) {
					this.appModeIcon.attr({display: "none"});
				}
			}

		}
	};

	/**
	* Utility function to modify the color of SVG elememts
	*
	* @method colorSVG
	* @param svg {Object} svg element
	* @param stroke {Object} stroke color
	* @param fill {Object} fill color
	*/
	this.colorSVG = function(svg, stroke, fill) {
		var rects = svg.selectAll("rect");
		if (rects) {
			rects.attr({fill: fill, stroke: stroke});
		}
		var circles = svg.selectAll("circle");
		if (circles) {
			circles.attr({fill: fill, stroke: stroke});
		}
		var ellipses = svg.selectAll("ellipse");
		if (ellipses) {
			ellipses.attr({fill: fill, stroke: stroke});
		}
		var polygons = svg.selectAll("polygon");
		if (polygons) {
			polygons.attr({fill: fill, stroke: stroke});
		}
		var paths = svg.selectAll("path");
		if (paths) {
			paths.attr({fill: fill, stroke: stroke});
		}
	};

}
