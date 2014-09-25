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
	this.div         = null;
	this.snap        = null;
	this.pointerIcon = null;
	this.appModeIcon = null;
	this.winModeIcon = null;
	this.labelBG     = null;
	this.labelText   = null;
	this.color       = null;
	this.mode        = null;
	
	this.init = function(id, label, color, width, height) {
		this.div = document.getElementById(id);
		this.snap = Snap(width, height);
		this.div.appendChild(this.snap.node);
		
		this.color = color;
		this.mode = 0;
		
		var pointerIconSize = height * 0.7;
		var pointerIconX = height * 0.2;
		var pointerIconY  = height * 0.2;
		
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
			
			_this.labelBG = _this.snap.rect(labelBGX, labelBGY, labelBGWidth, labelBGHeight, labelBGHeight/2, labelBGHeight/2).attr({
				fill: "rgba(0, 0, 0, 0.4)"
			});
			
			_this.labelText = _this.snap.text(labelTextX, labelTextY, label).attr({
				fill: "#FFFFFF",
    			fontSize: labelTextSize + "px",
    			fontFamily: "Verdana"
    		});
    		
    		_this.labelBG.attr({width: _this.labelText.node.clientWidth + labelBGHeight});
    		
    		_this.updateIconColors();
		});
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
	    	var rects = this.pointerIcon.select("rect");
			if(rects) paths.attr({fill: this.color, stroke: "#000000"});
			var circles = this.pointerIcon.select("circle");
			if(circles) paths.attr({fill: this.color, stroke: "#000000"});
			var ellipses = this.pointerIcon.select("ellipse");
			if(ellipses) paths.attr({fill: this.color, stroke: "#000000"});
			var polygons = this.pointerIcon.select("polygon");
			if(polygons) polygons.attr({fill: this.color, stroke: "#000000"});
			var paths = this.pointerIcon.select("path");
			if(paths) paths.attr({fill: this.color, stroke: "#000000"});
	    }
	    // application interaction
	    else if(this.mode === 1) {
	    	var rects = this.pointerIcon.select("rect");
			if(rects) paths.attr({fill: "#000000", stroke: this.color});
			var circles = this.pointerIcon.select("circle");
			if(circles) paths.attr({fill: "#000000", stroke: this.color});
			var ellipses = this.pointerIcon.select("ellipse");
			if(ellipses) paths.attr({fill: "#000000", stroke: this.color});
			var polygons = this.pointerIcon.select("polygon");
			if(polygons) polygons.attr({fill: "#000000", stroke: this.color});
			var paths = this.pointerIcon.select("path");
			if(paths) paths.attr({fill: "#000000", stroke: this.color});
	    }
	}
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