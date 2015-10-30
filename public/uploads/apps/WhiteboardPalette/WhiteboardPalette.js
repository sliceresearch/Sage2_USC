//
// SAGE2 application: WhiteboardPalette
// by: Filippo Pellolio <fpello2@uic.edu>
//
// Copyright (c) 2015
//
// Color picker at http://jsfiddle.net/cessor/NnH5Q/

function outerHTML(el) {
  var outer = document.createElement('div');
  outer.appendChild(el.cloneNode(true));
  return outer.innerHTML;
}
function svgImage(xml) {
  var image = new Image();
  image.src = 'data:image/svg+xml;base64,' + window.btoa(xml);
  return image;
}

var WhiteboardPalette = SAGE2_App.extend( {
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);

		this.svg = d3.select(this.element).append("svg").attr("id","paletteSVG");

		// move and resize callbacks
		this.resizeEvents = "continuous";
		this.moveEvents   = "continuous";



		this.palette = this.svg.style("position","absolute").style("left",0).attr("id","Palette").attr("width",this.element.clientWidth).attr("height",this.element.clientHeight);

		wsio.emit("enableDrawingMode",{id: this.id});
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
							  {name: "screenshot",action: this.takeScreenshot,icon: path+"/save.png",parent: this,r: 9,c: 0,cSpan: 3,rSpan: 1},
							  {name: "Color",action: this.changeColor,parent: this,backgroundColor: "#77DD77",r: 4,c: 3,cSpan: 2,rSpan: 2},
							  {name: "Color",action: this.changeColor,parent: this,backgroundColor: "black",r: 4,c: 5,cSpan: 2,rSpan: 2},
							  {name: "Color",action: this.changeColor,parent: this,backgroundColor: "#779ECB",r: 6,c: 3,cSpan: 2,rSpan: 2},
							  {name: "Color",action: this.changeColor,parent: this,backgroundColor: "#C23B22",r: 6,c: 5,cSpan: 2,rSpan: 2},
							  {name: "Color",action: this.changeColor,parent: this,backgroundColor: "white",r: 8,c: 3,cSpan: 4,rSpan: 1},
							  {name: "StrokeUp",action: this.changeStroke,increment: 1,parent: this,icon: path+"/up.png",r: 3,c: 5,cSpan: 2},
							  {name: "Stroke",action: null,parent: this,content: "circle",r: 0,c: 3,cSpan: 4,rSpan: 3},
							  {name: "StrokeDown",action: this.changeStroke,increment: -1,parent: this,icon: path+"/down.png",r: 3,c: 3,cSpan: 2},
							  {name: "SaveButton",action: this.saveDrawings,parent: this,icon: path+"/save.png",r: 0,c: 7,cSpan: 3,rSpan: 3},
							  {name: "loadButton",action: this.loadDrawings,parent: this,icon: path+"/load.png",r: 3,c: 7,cSpan: 3,rSpan: 3},
							  {name: "enablePaint",action: this.enablePaintingMode,parent: this,icon: path+"/brush.png",r: 6,c: 7,cSpan: 3,rSpan: 3}];
		
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
	takeScreenshot: function(){
		d3.select("#drawingSVG")
        	.attr("version", 1.1)
        	.attr("xmlns", "http://www.w3.org/2000/svg")
		var html = outerHTML(document.getElementById("drawingSVG"));
		var image = svgImage(html)
		d3.select("body").append("canvas").attr("id",'screenshotCanvas').style("display","none");
		var canvas = document.getElementById('screenshotCanvas');
		canvas.width = image.width;
		canvas.height = image.height;
		var context = canvas.getContext('2d');
		image.onload = function() {
			context.drawImage(image, 0, 0);
			data = {screenshot : canvas.toDataURL("image/png")};
			wsio.emit("saveScreenshot",data);
			d3.select("#screenshotCanvas").remove();
		};

 
	},
	changeStroke: function() {
		this.parent.strokeWidth += this.increment;
		if (this.parent.strokeWidth <=0) {
			this.parent.strokeWidth =1;
		}
		this.parent.sendStyleToServer("stroke-width",this.parent.strokeWidth);
		
	},
	changeColor: function() {
		this.parent.strokeColor = this.backgroundColor;
		this.parent.sendStyleToServer("stroke",this.parent.strokeColor);
		
		
	},
	clearCanvas: function() {
		wsio.emit("clearDrawingCanvas",null);
	},
	undoLast: function() {
		wsio.emit("undoLastDrawing",null);
	},
	redoLast: function() {
		wsio.emit("redoDrawing",null);
	},
	saveDrawings: function() {
		wsio.emit("saveDrawings",null);
	},
	loadDrawings: function() {
		wsio.emit("loadDrawings",null);
	},
	enablePaintingMode: function() {
		wsio.emit("enablePaintingMode",null);
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
		else if (eventType === "styleChange") {
			this.strokeColor = data.style.stroke;
			this.strokeWidth = parseInt(data.style["stroke-width"]);
			this.createPalette();
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
