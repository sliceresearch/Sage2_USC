//
// SAGE2 application: WhiteboardPalette
// by: Filippo Pellolio <fpello2@uic.edu>
//
// Copyright (c) 2015
//
// Color picker at http://jsfiddle.net/cessor/NnH5Q/



var WhiteboardPalette = SAGE2_App.extend( {
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);

		this.svg = d3.select(this.element).append("svg").attr("id","paletteSVG");

		// move and resize callbacks
		this.resizeEvents = "continuous";
		this.moveEvents   = "continuous";
		wsio.emit("enableDrawingMode",null);

		// init the server active style
		this.strokeColor = "white";
		this.strokeWidth = 6;

		this.sendStyleToServer("stroke",this.strokeColor);
		this.sendStyleToServer("stroke-width",this.strokeWidth);

		this.palette = this.svg.style("position","absolute").style("left",0).attr("id","Palette").attr("width",this.element.clientWidth).attr("height",this.element.clientHeight);

		this.createPalette();
		this.updatePalettePosition();

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;
	},
	updatePalettePosition: function(){
		wsio.emit("updatePalettePosition", null);
	},
	sendStyleToServer: function(name,value){
		wsio.emit("changeStyle", { name : name, value : value });
	}
	,
	createPalette: function() {
		this.palette.selectAll("*").remove();
		var path = this.resrcPath + "/images/"

		var nRows = 10;
		var nCols = 10;

		this.paletteButtons= [{name: "Clear",action: this.clearCanvas,icon: path+"/clear.png",parent: this,r: 0,c: 0,cSpan: 3,rSpan: 3},
							  {name: "Undo",action: this.undoLast,icon: path+"/undo.png",parent: this,r: 3,c: 0,cSpan: 3,rSpan: 3},
							  {name: "Redo",action: this.redoLast,icon: path+"/redo.png",parent: this,r: 6,c: 0,cSpan: 3,rSpan: 3},
							  {name: "Color",action: this.changeColor,parent: this,backgroundColor: "green",r: 4,c: 3,cSpan: 2,rSpan: 2},
							  {name: "Color",action: this.changeColor,parent: this,backgroundColor: "black",r: 4,c: 5,cSpan: 2,rSpan: 2},
							  {name: "Color",action: this.changeColor,parent: this,backgroundColor: "blue",r: 6,c: 3,cSpan: 2,rSpan: 2},
							  {name: "Color",action: this.changeColor,parent: this,backgroundColor: "red",r: 6,c: 5,cSpan: 2,rSpan: 2},
							  {name: "Color",action: this.changeColor,parent: this,backgroundColor: "white",r: 8,c: 3,cSpan: 4,rSpan: 1},
							  {name: "StrokeUp",action: this.changeStroke,increment: 1,parent: this,icon: path+"/up.png",r: 3,c: 5,cSpan: 2},
							  {name: "Stroke",action: null,parent: this,content: "circle",r: 0,c: 3,cSpan: 4,rSpan: 3},
							  {name: "StrokeDown",action: this.changeStroke,increment: -1,parent: this,icon: path+"/down.png",r: 3,c: 3,cSpan: 2}];
		
		var w=parseInt(this.palette.style("width"));
		var h=parseInt(this.palette.style("height"));
		var padding = 4
		var colW = (w - ((nCols+ 2) * padding) )/ nCols
		var rowH = (h - ((nRows+ 2) * padding) )/ nRows
		
		var defaultBg = "gray"
		for (i in this.paletteButtons) {
			var butt = this.paletteButtons[i]
			var rSpan = butt.rSpan || 1;
			var cSpan = butt.cSpan || 1;
			var bg = butt.backgroundColor || defaultBg;
			
			var x = butt.c * (colW + padding) + padding;
			var y = butt.r * (rowH + padding) + padding;
			var buttH = rowH * rSpan + (rSpan -1) * padding;
			var buttW = colW * cSpan + (cSpan -1) * padding;

			butt.y = y;
			butt.h = buttH;
			butt.x = x;
			butt.w = buttW;

			var rect=this.palette.append("rect").attr("fill",bg).attr("x",x).attr("y",y).attr("width",buttW).attr("height",buttH).style("stroke","black");
			if (butt.icon) {
				this.palette.append("image").attr("fill",bg).attr("x",x).attr("y",y).attr("width",buttW).attr("height",buttH).attr("xlink:href",butt.icon)
			}
			if(butt.content=="circle") {
				this.palette.append("circle").attr("r",this.strokeWidth).attr("cx",x+buttW/2).attr("cy",y+buttH/2).attr("fill",this.strokeColor)
			}
		}
	},
	changeStroke: function() {
		this.parent.strokeWidth += this.increment;
		if (this.parent.strokeWidth <=0) {
			this.parent.strokeWidth =1;
		}
		this.parent.sendStyleToServer("stroke-width",this.parent.strokeWidth);
		this.parent.createPalette();
	},
	changeColor: function() {
		this.parent.strokeColor = this.backgroundColor;
		this.parent.sendStyleToServer("stroke",this.parent.strokeColor);
		
		this.parent.createPalette();
	},
	clearCanvas: function() {
		wsio.emit("clearDrawingCanvas",null);
	},
	undoLast: function(){
		wsio.emit("undoLastDrawing",null);
	},
	redoLast: function(){
		wsio.emit("redoDrawing",null);
	},
	load: function(date) {
		console.log('WhiteboardPalette> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
		console.log('WhiteboardPalette> Draw with state value', this.state.value);
	},

	resize: function(date) {
		this.refresh(date);
		this.palette.attr("width",this.element.clientWidth).attr("height",this.element.clientHeight);
		this.createPalette();
		this.updatePalettePosition();
	},
	move: function(date) {
		this.refresh(date);
		this.updatePalettePosition();
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},
	handlePaletteTouch: function(x,y){
		for (i in this.paletteButtons){
			var butt = this.paletteButtons[i]
			if (y>=butt.y & y<=butt.y+butt.h & x>=butt.x & x<=butt.x+butt.w){
				console.log("clicked");
				butt.action(x-butt.x,y-butt.y);
			}
		}
	}
	,

	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			this.handlePaletteTouch(position.x,position.y);
		}
		else if (eventType === "pointerMove" && this.dragging) {
		}
		else if (eventType === "pointerRelease" && (data.button === "left")) {
		}

		// Scroll events for zoom
		else if (eventType === "pointerScroll") {
		}
		else if (eventType === "widgetEvent"){
		}
		else if (eventType === "keyboard") {
			if (data.character === "m") {
				this.refresh(date);
			}
		}
		else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") { // left
				this.refresh(date);
			}
			else if (data.code === 38 && data.state === "down") { // up
				this.refresh(date);
			}
			else if (data.code === 39 && data.state === "down") { // right
				this.refresh(date);
			}
			else if (data.code === 40 && data.state === "down") { // down
				this.refresh(date);
			}
		}
	}
});
