//
// SAGE2 application: WhiteboardPalette
// by: Filippo Pellolio <fpello2@uic.edu>
//
// Copyright (c) 2015
//
// Color picker at http://jsfiddle.net/cessor/NnH5Q/
// https://github.com/wbkd/d3-extended
    d3.selection.prototype.moveToFront = function() {  
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };

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

function hsvFromValues(h,s,v) {
	return "hsl("+h+","+s+"%,"+v+"%)";
}

var WhiteboardPalette = SAGE2_App.extend( {
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);
		this.paletteMode = "colorPicker"
		this.svg = d3.select(this.element).append("svg").attr("id","paletteSVG");
		// Tutorial div over me
		this.tutorial = d3.select("#main").append("div");
		//this.tutorial.style("visibility","hidden");
		this.tutorialImg = this.tutorial.append("img").style("width","100%").style("height","100%");
		this.updateTutorial();
		// Variables for the color picker
		this.hue = 150;
		this.s = 50;
		this.v = 50;

		// move and resize callbacks
		this.resizeEvents = "continuous";
		this.moveEvents   = "continuous";

		d3.select(this.div).style("z-index",5);

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
		var path = this.resrcPath + "/images/";
		var cancelColor = "#C23B22";
		var acceptColor = "#77DD77";
		
		var that = this;
		
		if (this.paletteMode == "default") {

			var nRows = 72;
			var nCols = 6;

			this.paletteButtons= [{name: "Clear",action: this.areYouSureScreen,icon: path+"/clear.png",parent: this,r: 0,c: 0,cSpan: 2,rSpan: 10},
								  {name: "Undo",action: this.undoLast,icon: path+"/undo.png",parent: this,r: 0,c: 2,cSpan: 2,rSpan: 10},
								  {name: "Redo",action: this.redoLast,icon: path+"/redo.png",parent: this,r: 0,c: 4,cSpan: 2,rSpan: 10},
								  
								  {name: "Color1",action: this.changeColor,parent: this,backgroundColor: "#77DD77",r: 12,c: 0,cSpan: 1,rSpan: 5},
								  {name: "Color2",action: this.changeColor,parent: this,backgroundColor: "black",r: 17,c: 0,cSpan: 1,rSpan: 5},
								  {name: "Color3",action: this.changeColor,parent: this,backgroundColor: "#779ECB",r: 12,c: 1,cSpan: 1,rSpan: 5},
								  {name: "Color4",action: this.changeColor,parent: this,backgroundColor: "#C23B22",r: 17,c: 1,cSpan: 1,rSpan: 5},
								  {name: "Color5",action: this.changeColor,parent: this,backgroundColor: "white",r: 17,c: 2,cSpan: 1,rSpan: 5},
								  {name: "Color6",action: this.colorPicker,parent: this,icon: path+"/color-picker.png",r: 12,c: 3,cSpan: 3,rSpan: 10},
								  
								  {name: "selectionModeButton",action: this.selectionModeOnOff,parent: this,icon: path+"/selection.png",r: 24,c: 0,cSpan: 3,rSpan:10},
								  {name: "enablePaint",
								  			action: this.paintingMode? this.disablePaintingMode: this.enablePaintingMode,
								  			parent: this,icon: this.paintingMode? path + "/paintActive.png": path + "/paintNonActive.png",
								  r: 24,c: 3,cSpan: 3,rSpan: 10},
								  
								  {name: "SaveButton",action: this.saveDrawings,parent: this,icon: path+"/save.png",r: 36,c: 0,cSpan: 2,rSpan: 10},
								  {name: "loadButton",action: this.loadDrawings,parent: this,icon: path+"/load.png",r: 36,c: 2,cSpan: 2,rSpan: 10},
								  {name: "screenshot",action: this.takeScreenshot,icon: path+"/screenshot.png",parent: this,r: 36,c: 4,cSpan: 2,rSpan: 10},
								  
								  {name: "StrokeUp",action: this.changeStroke,increment: 1,parent: this,icon: path+"/up.png",r: 50,c: 5,cSpan: 1,rSpan:10},
								  {name: "Stroke",action: function() {},parent: this,content: "circle",r: 50,c: 1,cSpan: 4,rSpan: 10},
								  {name: "StrokeDown",action: this.changeStroke,increment: -1,parent: this,icon: path+"/down.png",r: 50,c: 0,cSpan: 1,rSpan:10},
								  
								  {name: "Tutorial",action: function() {
										if (that.tutorial.style("visibility")== "visible") {
											that.tutorial.style("visibility","hidden");
										} else {
											that.tutorial.style("visibility","visible");
										}
								  },increment: 1,parent: this,icon: path+"/info.png",r: 62,c: 0,cSpan: 6,rSpan:10}
								  
								  ];
			var padding = 4
		} else if(this.paletteMode == "colorPicker"){
			var nRows = 16;
			var nCols = 100;
			var padding = 0;

			this.paletteButtons=[];
			for (var i=2; i<nCols-2; i++) {
				var hue = 360 / (nCols -4) * (i-2);
				var s = 100 / (nCols -4) * (i-2);
				var v = 100 / (nCols -4) * (i-2);
				this.paletteButtons.push({parent: this,action: this.changeHue,r: 1,c: i,rSpan: 2,hue: hue,
											backgroundColor: hsvFromValues(hue,this.s,this.v),stroke: "transparent",
											selected: hue==this.hue?true:false});
				this.paletteButtons.push({parent: this,action: this.changeSaturation,r: 4,c: i,rSpan: 2,s: s,
											backgroundColor: hsvFromValues(this.hue,s,this.v),stroke: "transparent",
											selected: s==this.s?true:false}); 
				this.paletteButtons.push({parent: this,action: this.changeLuminance,r: 7,c: i,rSpan: 2,v: v,
											backgroundColor: hsvFromValues(this.hue,this.s,v),stroke: "transparent",
											selected: v==this.v?true:false}); 
			}
			
			this.paletteButtons.push({parent: this,action: this.cancelPicker,r: 13,c: 10,cSpan: 35,rSpan: 2,v: v,
											icon: path+"cancel.png",backgroundColor: cancelColor});
			this.paletteButtons.push({parent: this,action: this.changeColor,r: 10,c: 35,cSpan: 30,rSpan: 2,v: v,
											backgroundColor: hsvFromValues(this.hue,this.s,this.v),
											selectedColor: hsvFromValues(this.hue,this.s,this.v)});
			this.paletteButtons.push({parent: this,action: this.changeColor,r: 13,c: 55,cSpan: 35,rSpan: 2,v: v,
											icon: path+"select.png",selectedColor: hsvFromValues(this.hue,this.s,this.v),
											backgroundColor: acceptColor});

		} else if(this.paletteMode == "sure"){
			var nRows = 100;
			var nCols = 100;
			var padding = 0;
			this.paletteButtons=[{parent: this,name: "sure",action: function() {},icon: path+"/areyousure.png",parent: this,r: 5,c: 5,cSpan: 90,rSpan: 20,
								backgroundColor:"none",stroke:"transparent"},
								{parent: this,name: "no",action: this.cancelPicker,icon: path+"/no.png",parent: this,r: 50,c: 5,cSpan: 40,rSpan: 20,backgroundColor: cancelColor},
								{parent: this,name: "yes",action: this.clearCanvas,icon: path+"/yes.png",parent: this,r: 50,c: 55,cSpan: 40,rSpan: 20,backgroundColor: acceptColor}];
			
		}

		var w=parseInt(this.palette.style("width"));
		var h=parseInt(this.palette.style("height"));
		
		var colW = (w - ((nCols+ 2) * padding) )/ nCols
		var rowH = (h - ((nRows+ 2) * padding) )/ nRows
		var toGoToFront =[]
		var defaultBg = "gray"
		var defaultStroke = "black"
		for (i in this.paletteButtons) {
			var butt = this.paletteButtons[i]
			var rSpan = butt.rSpan || 1;
			var cSpan = butt.cSpan || 1;
			var bg = butt.backgroundColor || defaultBg;
			var stroke = butt.stroke || defaultStroke;
			
			var x = butt.c * (colW + padding) + padding;
			var y = butt.r * (rowH + padding) + padding;
			var buttH = rowH * rSpan + (rSpan -1) * padding;
			var buttW = colW * cSpan + (cSpan -1) * padding;

			butt.y = y;
			butt.h = buttH;
			butt.x = x;
			butt.w = buttW;

			var rect=this.palette.append("rect").attr("fill",bg)
						.attr("x",x).attr("y",y).attr("width",buttW).attr("height",buttH).style("stroke",stroke);
			if (butt.name) {
				rect.attr("id",butt.name);
			}
			if (butt.icon) {
				this.palette.append("image").attr("fill",bg).attr("x",x).attr("y",y).attr("width",buttW).attr("height",buttH).attr("xlink:href",butt.icon)
			}
			if(butt.content=="circle") {
				this.palette.append("circle")
					.attr("r",this.paintingMode? Math.min(buttH,buttW) / 2 - padding: this.strokeWidth)
					.attr("cx",x+buttW/2).attr("cy",y+buttH/2).attr("fill",this.strokeColor)
			}
			if (butt.text) {
				this.palette.append("text")
							.attr("x",x+butt.w/2)
							.attr("y",y+butt.h/2)
							.style("dominant-baseline","middle")
							.style("text-anchor","middle")
							.text(butt.text);
			}
			if (butt.selected) {
				var selectedStroke = "white";
				toGoToFront.push(this.palette.append("rect").attr("fill","none").attr("x",x-colW).attr("y",y-colW)
							.attr("width",buttW+2*colW).attr("height",buttH+2*colW).style("stroke",selectedStroke)
							.style("stroke-width",colW));
			}
		}

		for (i in toGoToFront) {
			var f = toGoToFront[i].moveToFront();
		}
	},
	colorPicker : function() {
		this.parent.paletteMode = "colorPicker";
		this.parent.createPalette();
	},
	changeHue : function() {
		this.parent.hue = this.hue;
		this.parent.createPalette();
	},
	changeSaturation : function() {
		this.parent.s = this.s;
		this.parent.createPalette();
	},
	changeLuminance : function() {
		this.parent.v = this.v;
		this.parent.createPalette();
	},
	cancelPicker : function() {
		this.parent.paletteMode = "default";
		this.parent.createPalette();
	},
	takeScreenshot: function() {
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
		this.parent.strokeColor = this.selectedColor || this.backgroundColor;
		this.parent.sendStyleToServer("stroke",this.parent.strokeColor);
		
		
	},
	clearCanvas: function() {
		wsio.emit("clearDrawingCanvas",null);
		this.parent.paletteMode = "default";
		this.parent.createPalette();
	},
	areYouSureScreen: function() {
		this.parent.paletteMode = "sure";
		this.parent.createPalette();
	}
	,
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
	disablePaintingMode: function() {
		wsio.emit("disablePaintingMode",null);
	},
	selectionModeOnOff: function() {
		wsio.emit("selectionModeOnOff",null);
	},
	load: function(date) {
		console.log('WhiteboardPalette> Load with state value', this.state.value);
		this.refresh(date);
		this.updateTutorial();
	},

	draw: function(date) {
		console.log('WhiteboardPalette> Draw with state value', this.state.value);
		this.updateTutorial();
	},

	resize: function(date) {
		this.refresh(date);
		this.palette.attr("width",this.element.clientWidth).attr("height",this.element.clientHeight);
		this.createPalette();
		this.updatePalettePosition();
		this.updateTutorial();
	},
	move: function(date) {
		this.refresh(date);
		this.updatePalettePosition();
		this.updateTutorial();
	},
	updateTutorial : function() {
		var path = this.resrcPath + "images/";
		var xt = (-3.4*parseInt(this.element.clientWidth))+"px";
		var yt= (-0.62*parseInt(this.element.clientHeight))+"px";
		var wt = (parseInt(this.element.clientWidth)*8.8)+"px";
		var ht = ((parseInt(this.element.clientHeight)+58)*2.08)+"px";
		this.tutorial.style("position","absolute").style("left",xt).style("top",yt)
			.style("width",wt).style("height",ht).style("z-index",8)
			.style("transform",d3.select(this.div).style("transform"));
		this.tutorialImg.attr("src",path+"tutorial.png");
	}
	,

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},
	handlePaletteTouch: function(x,y){
		var pressedColor = "white";
		for (i in this.paletteButtons){
			var butt = this.paletteButtons[i]
			if (y>=butt.y & y<=butt.y+butt.h & x>=butt.x & x<=butt.x+butt.w){
				// FeedBack
				if (butt.name) {
					var oldColor = d3.select("#"+butt.name).attr("fill");

					d3.select("#"+butt.name).attr("fill",pressedColor).transition().duration(500).attr("fill",oldColor);
				}

				butt.action(x-butt.x,y-butt.y);
				break;
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
			this.paletteMode = "default";
			this.strokeWidth = parseInt(data.style["stroke-width"]);
			this.createPalette();
		}
		else if (eventType === "modeChange") {
			this.paintingMode = data.paintingMode;
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
