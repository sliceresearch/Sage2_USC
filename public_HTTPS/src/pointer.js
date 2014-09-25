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
	this.div               = null;
	this.snap              = null;
	this.pointerIcon       = null;
	this.pointerIconLoaded = null;
	this.appModeIcon       = null;
	this.appModeIconLoaded = null;
	this.winModeIcon       = null;
	this.winModeIconLoaded = null;
	this.labelBG           = null;
	this.labelText         = null;
	this.color             = null;
	this.mode              = null;
	
	this.init = function(id, label, color, width, height) {
		this.div = document.getElementById(id);
		this.snap = Snap(width, height);
		this.div.appendChild(this.snap.node);
		
		this.color = color;
		this.mode = 0;
		
		var pointerIconSize = height * 0.7;
		var pointerIconX = height * 0.2;
		var pointerIconY  = height * 0.2;
		this.pointerIconLoaded = false;
		
		var winModeIconSize = height * 0.275;
		var winModeIconX = height * 0.375;
		var winModeIconY = height * 0.72;
		this.winModeIconLoaded = false;
		
		var appModeIconSize = height * 0.275;
		var appModeIconX = height * 0.085;
		var appModeIconY = height * 0.085;
		this.appModeIconLoaded = false;
		
		var labelBGX = height * 0.675;
		var labelBGY = height * 0.73;
		var labelBGWidth  = height * 1.00;
		var labelBGHeight = height * 0.25;
		var labelTextX = height * 0.80;
		var labelTextY = height * 0.90;
		var labelTextSize = Math.round(0.155*height);
		
		var _this = this;
		Snap.load("images/SAGE2 Pointer.svg", function(f) {
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
			
			_this.snap.append(_this.winModeIcon);
			
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
			fontFamily: "Verdana"
		});
		
		this.labelBG.attr({width: this.labelText.node.clientWidth + labelBGHeight});
	};
	
	this.setColor = function(color) {
	    this.color = color;
	    this.updateIconColors();
	};
	
	this.setLabel = function(label) {
		var labelBGHeight = this.snap.node.clientHeight * 0.25;
	    this.labelText.attr({text: label});
	    this.labelBG.attr({width: this.labelText.node.clientWidth + labelBGHeight});
	};
	
	this.changeMode = function(mode) {
		this.mode = mode;
	    this.updateIconColors();
	};
	
	this.updateIconColors = function() {
		 // window manipulation
	    if(this.mode === 0) {
	    	this.colorSVG(this.pointerIcon, "#000000", this.color);
	    	this.colorSVG(this.winModeIcon, "#000000", this.color);
	    	this.colorSVG(this.appModeIcon, "#000000", this.color);
	    	
	    	this.winModeIcon.attr({display: ""});
	    	this.appModeIcon.attr({display: "none"});
	    }
	    // application interaction
	    else if(this.mode === 1) {
	    	this.colorSVG(this.pointerIcon, this.color, "#000000");
	    	this.colorSVG(this.winModeIcon, this.color, "#000000");
	    	this.colorSVG(this.appModeIcon, this.color, "#000000");
	    	
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

/*
function pointer() {
	this.element    = null;
	this.ctx        = null;
	this.label      = "";
	this.givenColor = "#FFFFFF";
	this.drawMode   = null;
	
	this.init = function(id, label, color) {
		this.element = document.getElementById(id);
		this.ctx     = this.element.getContext("2d");
		this.label   = label;

		this.givenColor    = "rgba(" + color[0].toString() + "," + color[1].toString() + "," + color[2].toString() + ",1.0)"; 
		this.pointerOffset = [0.0, 0.0];
		this.drawMode = 0; 
	};
	
	this.setColor = function(color){
	    this.givenColor = color;
	};
	
	this.setLabel = function(label){
	    this.label = label;
	};
	
	this.changeMode = function(mode){
	    this.drawMode = mode;
	};
	
	this.draw = function() {
		// clear canvas
		this.ctx.clearRect(0,0, this.element.width, this.element.height);
		
		var minDim = Math.min(this.element.width, this.element.height);
		
		// pointer
		this.ctx.lineWidth = (3.0/100.0) * minDim;
		if( this.drawMode === 0 ){
            this.ctx.fillStyle   = this.givenColor;
            this.ctx.strokeStyle = "rgba(0, 0, 0, 1.0)";
        }
        else if(this.drawMode == 1){
            this.ctx.fillStyle   = "rgba(0, 0, 0, 1.0)";
            this.ctx.strokeStyle = this.givenColor;
        }
		this.ctx.lineJoin = "round";
		this.ctx.beginPath();
		this.ctx.moveTo(0.025384*minDim, 0.934002*minDim);
		this.ctx.lineTo(0.025384*minDim, 0.060805*minDim);
		this.ctx.lineTo(0.665052*minDim, 0.649706*minDim);
		this.ctx.lineTo(0.282297*minDim, 0.649706*minDim);
		this.ctx.lineTo(0.025384*minDim, 0.934002*minDim);
		this.ctx.closePath();
		this.ctx.fill();
		this.ctx.stroke();
		
		// name
		var name = this.label; 
		var size = Math.round(0.22*minDim);
		this.ctx.font  = size.toString() + "pt Arial";
		var metrics    = this.ctx.measureText(name);
		var textWidth  = metrics.width;
		var textHeight = metrics.height;
      
		this.ctx.lineWidth = 1.6*size;
		this.ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
		this.ctx.lineCap = "round";   
		this.ctx.beginPath();
		this.ctx.moveTo(0.82*minDim, 0.80*minDim);
		this.ctx.lineTo(0.82*minDim+textWidth, 0.80*minDim);
		this.ctx.moveTo(0.82*minDim, 0.80*minDim);
		this.ctx.closePath();
		this.ctx.stroke();
		
		this.ctx.textAlign = "left";
		this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
		this.ctx.fillText(name, 0.82*minDim, 0.80*minDim+(0.4*size));
	};
}
*/