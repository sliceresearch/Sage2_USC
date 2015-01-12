// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

function pointer() {
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
	this.mode               = null;
	
	this.init = function(id, label, color, width, height) {
		this.div = document.getElementById(id);
		this.snap = Snap(width, height);
		this.div.appendChild(this.snap.node);
		
		this.color = color;
		this.mode = 0;
		
		var pointerIconSize = height * 0.65;
		var pointerIconX = height * 0.25;
		var pointerIconY  = height * 0.20;
		this.pointerIconLoaded = false;
		
		var winModeIconSize = height * 0.330;
		var winModeIconX = height * 0.0925;
		var winModeIconY = height * 0.044167;
		this.winModeIconLoaded = false;
		
		var appModeIconSize = height * 0.330;
		var appModeIconX = height * 0.0925;
		var appModeIconY = height * 0.044167;   
		this.appModeIconLoaded = false;
		
		var labelBGX = height * 0.40;
		var labelBGY = height * 0.65;
		var labelBGWidth  = height * 1.00;
		var labelBGHeight = height * 0.275;
		var labelTextX = height * 0.5425;
		var labelTextY = height * 0.8475;
		var labelTextSize = Math.round(0.17*height);
		
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
			
			_this.snap.append(_this.pointerIcon);
    		
    		_this.pointerIconLoaded = true;
			if(_this.winModeIconLoaded === true && _this.appModeIconLoaded)
				_this.updateIconColors();
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
			
			_this.snap.prepend(_this.winModeIcon);
			
			_this.winModeIconLoaded = true;
			if(_this.pointerIconLoaded === true && _this.appModeIconLoaded === true)
				_this.updateIconColors();
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
			if(_this.pointerIconLoaded === true && _this.winModeIconLoaded === true)
				_this.updateIconColors();
		});
		
		this.labelBG = this.snap.rect(labelBGX, labelBGY, labelBGWidth, labelBGHeight, labelBGHeight/2, labelBGHeight/2).attr({
			fill: "rgba(0, 0, 0, 0.6)"
		});
		
		this.labelText = this.snap.text(labelTextX, labelTextY, label).attr({
			fill: "#FFFFFF",
			fontSize: labelTextSize + "px",
			fontFamily: "Verdana,Arial,Helvetica"
		});
		
		this.labelBG.attr({width: this.labelText.node.clientWidth + labelBGHeight});
	};
	
	this.setColor = function(color) {
	    this.color = color;
	    this.updateIconColors();
	};
	
	this.setLabel = function(label) {
		var labelBGHeight = this.snap.node.clientHeight * 0.275;
	    this.labelText.attr({text: label});
	    this.labelBG.attr({width: this.labelText.node.clientWidth + labelBGHeight});
	};
	
	this.changeMode = function(mode) {
		this.mode = mode;
	    this.updateIconColors();
	};
	
	this.updateIconColors = function() {
		this.colorSVG(this.pointerIcon, "#000000", this.color);
		this.colorSVG(this.winModeIcon,  "#000000", "#FFFFFF");
		this.colorSVG(this.appModeIcon,  "#000000", "#FFFFFF");
	    	
		// window manipulation
	    if(this.mode === 0) {
	    	//this.pointerIcon1.attr({display: "none"});
	    	//this.pointerIcon2.attr({display: ""});
	    	this.winModeIcon.attr({display: "none"});
	    	this.appModeIcon.attr({display: "none"});
	    }
	    // application interaction
	    else if(this.mode === 1) {
	    	//this.pointerIcon1.attr({display: ""});
	    	//this.pointerIcon2.attr({display: "none"});
	    	this.winModeIcon.attr({display: "none"});
	    	this.appModeIcon.attr({display: ""});
	    }
	};
	
	this.colorSVG = function(svg, stroke, fill) {
		var rects = svg.selectAll("rect");
		if(rects) rects.attr({fill: fill, stroke: stroke});
		var circles = svg.selectAll("circle");
		if(circles) circles.attr({fill: fill, stroke: stroke});
		var ellipses = svg.selectAll("ellipse");
		if(ellipses) ellipses.attr({fill: fill, stroke: stroke});
		var polygons = svg.selectAll("polygon");
		if(polygons) polygons.attr({fill: fill, stroke: stroke});
		var paths = svg.selectAll("path");
		if(paths) paths.attr({fill: fill, stroke: stroke});
	};
}
