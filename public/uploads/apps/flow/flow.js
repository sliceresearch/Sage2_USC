//
// SAGE2 application: flow
// by: Luc Renambot <renambot@gmail.com>
//
// Copyright (c) 2015
//

/* global Flow */
/* global INITIAL_SPEED, INITIAL_TURBULENCE, INITIAL_AZIMUTH, INITIAL_ELEVATION */
/* global MAX_SPEED, CAMERA_SENSITIVITY, MIN_ELEVATION, MAX_ELEVATION, MAX_TURBULENCE */

var flow = SAGE2_App.extend({
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
		this.lastMouse   = {x: 0.0, y: 0.0};
		this.mouseDown   = false;

		this.controls.addSlider({
			minimum:  0.0,
			maximum:  MAX_SPEED,
			increments:  MAX_SPEED / 100.0,
			property: "this.speed",
			label: "Speed",
			identifier: "Speed",
			labelFormatFunction: function(value, end) {
				return (value * end / 100).toFixed(1);
			}
		});
		this.controls.addButton({type: {textual: true, label: "L0"}, position: 7, identifier: "L0"});
		this.controls.addButton({type: {textual: true, label: "L1"}, position: 5, identifier: "L1"});
		this.controls.addButton({type: {textual: true, label: "L2"}, position: 3, identifier: "L2"});
		this.controls.addButton({type: {textual: true, label: "L3"}, position: 1, identifier: "L3"});

		this.controls.addTextInput({defaultText: INITIAL_TURBULENCE.toString(), label: "Turb.", identifier: "Persistence"});

		this.controls.finishedAddingControls();

		this.flow = new Flow(this.element, data.width, data.height);
		this.flow.setHue(0);
		this.flow.setTimeScale(this.speed);
		this.flow.setPersistence(this.persistence);
		this.flow.changeQualityLevel(0);
	},

	load: function(date) {
		this.refresh(date);
	},

	draw: function(date) {
		this.flow.render(this.t * 1000.0);
	},

	resize: function(date) {
		// Resize the flow
		this.flow.onresize();
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			this.mouseDown = true;
			this.lastMouse = position;
		} else if (eventType === "pointerMove") {
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
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			this.mouseDown = false;
		} else if (eventType === "widgetEvent") {
			switch (data.identifier) {
				case "Speed":
					console.log('Speed', this.speed);
					this.flow.setTimeScale(this.speed);
					break;
				case "L0":
					console.log('Quality', 0);
					this.flow.changeQualityLevel(0);
					break;
				case "L1":
					console.log('Quality', 1);
					this.flow.changeQualityLevel(1);
					break;
				case "L2":
					console.log('Quality', 2);
					this.flow.changeQualityLevel(2);
					break;
				case "L3":
					console.log('Quality', 3);
					this.flow.changeQualityLevel(3);
					break;
				case "Persistence":
					var val = parseFloat(data.text);
					if (val > 0.0 && val < MAX_TURBULENCE) {
						console.log('Setting persistence', val);
						this.flow.setPersistence(val);
					}
					break;
			}
		} else if (eventType === "pointerScroll") {
			// Scroll events for zoom
		} else if (eventType === "keyboard") {
			if (data.character === "m") {
				this.refresh(date);
			}
		} else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") { // left
				this.refresh(date);
			} else if (data.code === 38 && data.state === "down") { // up
				this.refresh(date);
			} else if (data.code === 39 && data.state === "down") { // right
				this.refresh(date);
			} else if (data.code === 40 && data.state === "down") { // down
				this.refresh(date);
			}
		}
	}
});
