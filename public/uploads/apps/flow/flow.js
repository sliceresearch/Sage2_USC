//
// SAGE2 application: flow
// by: Luc Renambot <renambot@gmail.com>
//
// Copyright (c) 2015
//

require('./shared');
require('./app');

module.exports = SAGE2_App.extend( {
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("canvas", data);
		
		// move and resize callbacks
		this.resizeEvents = "continuous";

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 20.0;

		// Controls
		this.speed       = INITIAL_SPEED;
		this.persistence = INITIAL_TURBULENCE;
    	this.azimuth     = INITIAL_AZIMUTH;
        this.elevation   = INITIAL_ELEVATION;
    	this.lastMouse   = {x:0.0, y: 0.0};
        this.mouseDown   = false;

		this.controls.addSlider({
			begin:  0.0,
			end:  MAX_SPEED,
			increments:  MAX_SPEED/100.0,
			appHandle: this,
			property: "speed",
			caption: "Speed",
			id: "Speed",
			labelFormatFunction: function(value, end) {
				return (value*end/100).toFixed(1);
			}
		});

		this.controls.addButton({type: {textual: true, label: "L0"}, sequenceNo: 7, id: "L0"});
		this.controls.addButton({type: {textual: true, label: "L1"}, sequenceNo: 5, id: "L1"});
		this.controls.addButton({type: {textual: true, label: "L2"}, sequenceNo: 3, id: "L2"});
		this.controls.addButton({type: {textual: true, label: "L3"}, sequenceNo: 1, id: "L3"});

		this.controls.addTextInput({defaultText: INITIAL_TURBULENCE.toString(), caption:"Turb.", id:"Persistence"});

		this.controls.finishedAddingControls();

		// var elemW = data.width;
		// var elemH = data.height;
		// var guiW  = Math.min(0.3*elemW, 0.384*elemH);

		// this.guiDiv = document.createElement('div');
		// this.guiDiv.id = this.id + "_gui";
		// this.guiDiv.style.position = "absolute";
		// this.guiDiv.style.top = "0px";
		// this.guiDiv.style.left = (elemW-guiW).toString() + "px";
		// this.guiDiv.style.width = guiW + "px";
		// this.guiDiv.style.height = elemH + "px";
		// this.guiDiv.style.backgroundColor = "rgba(0,0,0,0.5)";
		// this.guiDiv.style.zIndex = parseInt(this.div.zIndex)+1;
		// this.div.appendChild(this.guiDiv);
		// this.initializeGUI();

		this.flow = new Flow(this.element, data.width, data.height);
		this.flow.setHue(0);
		this.flow.setTimeScale(this.speed);
		this.flow.setPersistence(this.persistence);
		this.flow.changeQualityLevel(0);
	},

	initializeGUI: function() {
		var guiW = parseInt(this.guiDiv.style.width,  10);
		var guiH = parseInt(this.guiDiv.style.height, 10);

		this.snap = new Snap(300, 780).attr({
  			viewBox: "0 0 300 780",
  			width:   guiW,
  			height:  parseInt(2.6*guiW, 10)
  		});
		this.guiDiv.appendChild(this.snap.node);

		var titleFont   = {fill: "#E6C86D", fontSize: "24px", fontFamily: "Arimo"};

		// Lengend - Markers
		this.snap.text(12, 40, "Flow").attr(titleFont);
	},

	load: function(date) {
		this.refresh(date);
	},

	draw: function(date) {
		this.flow.render(this.t*1000.0);
	},

	resize: function(date) {
		// Resize the flow
		this.flow.onresize();

		// Resize the UI
		// var elemW = this.element.width;
		// var elemH = this.element.height;
		// var guiW = Math.min(0.3*elemW, 0.384*elemH);
		// this.guiDiv.style.left = (elemW-guiW).toString() + "px";
		// this.guiDiv.style.width = guiW + "px";
		// this.guiDiv.style.height = elemH + "px";
		// this.snap.attr({
		// 	width: guiW,
		// 	height: 2.6*guiW
		// });

		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			this.mouseDown = true;
			this.lastMouse = position;
		}
		else if (eventType === "pointerMove") {
			if (this.mouseDown) {
				var mouseX = position.x;
				var mouseY = position.y;
				var deltaAzimuth   = (mouseX - this.lastMouse.x) * CAMERA_SENSITIVITY;
				var deltaElevation = (mouseY - this.lastMouse.y) * CAMERA_SENSITIVITY;

				this.azimuth += deltaAzimuth;
				this.elevation += deltaElevation;

				if (this.elevation < MIN_ELEVATION) {
					this.elevation = MIN_ELEVATION;
				} else if (this.elevation > MAX_ELEVATION) {
					this.elevation = MAX_ELEVATION;
				}
				this.flow.getCamera().recomputeViewMatrix(this.elevation, this.azimuth);

				this.lastMouse = position;
			}
		}
		else if (eventType === "pointerRelease" && (data.button === "left")) {
			this.mouseDown = false;
		}
		else if (eventType === "widgetEvent") {
			switch (data.ctrlId){
				case "Speed":
					console.log('Speed', this.speed);
					this.flow.setTimeScale(this.speed);
					break;
				case "L0":
					this.flow.changeQualityLevel(0);
					break;
				case "L1":
					this.flow.changeQualityLevel(1);
					break;
				case "L2":
					this.flow.changeQualityLevel(2);
					break;
				case "L3":
					this.flow.changeQualityLevel(3);
					break;
				case "Persistence":
					val = parseFloat(data.text);
					console.log('Persistence', val);
					if (val > 0.0 && val < MAX_TURBULENCE) {
						console.log('Setting persistence', val);
						this.flow.setPersistence(val);
					}
					break;
			}
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
