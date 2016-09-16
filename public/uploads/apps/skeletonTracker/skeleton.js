//
// SAGE2 application: articulate_ui
// by: Jillian Aurisano <jillian.aurisano@gmail.com>
//
// Copyright (c) 2015
//

var skeleton = SAGE2_App.extend( {
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("canvas", data);
		// Set the background to black
		this.element.style.backgroundColor = '#111111';
		this.element.style.opacity = .9;

		// move and resize callbacks
		this.resizeEvents = "continuous";
		this.moveEvents   = "continuous";

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;

		this.ctx = this.element.getContext('2d');

		this.inputCount = 0;
		this.textToDraw = "waiting for kinect input... ";

	  this.headPosition = {"x": this.element.width/2.0, "y": this.element.height/2.0};
		this.leftHandPosition = {"x": this.element.width/2.0 - 50, "y": this.element.height/2.0 + 50};
		this.rightHandPosition = {"x": this.element.width/2.0 + 50, "y": this.element.height/2.0 + 50};
	},

	load: function(date) {
		console.log('articulate_ui> Load with state value', this.state.value);


		this.refresh(date);
	},



	//----------------------------------------//
	//---------- DRAWING FUNCTIONS ----------//
	//---------------------------------------//
	draw: function(date) {
		console.log('articulate_ui> Draw with state value', this.state.value);

		this.ctx.clearRect(0, 0, this.element.width, this.element.height);

		this.fontSize = 32;
		this.ctx.font = "32px Helvetica";
		this.ctx.textAlign="center";

		//status bar
		this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
		this.ctx.fillText( "Input: " + this.textToDraw, this.element.width/2.0, 32);

		this.ctx.fillText("head", this.headPosition.x, this.headPosition.y);
		this.ctx.fillText("handLeft", this.leftHandPosition.x, this.leftHandPosition.y);
		this.ctx.fillText("handRight", this.rightHandPosition.x, this.rightHandPosition.y);

		this.ctx.beginPath();
		this.ctx.arc(this.headPosition.x, this.headPosition.y, 15, 0, 2*Math.PI)
		this.ctx.fill();
		this.ctx.stroke();

		this.ctx.beginPath();
		this.ctx.arc(this.leftHandPosition.x, this.leftHandPosition.y, 10, 0, 2*Math.PI)
		this.ctx.fill();
		this.ctx.stroke();

		this.ctx.beginPath();
		this.ctx.arc(this.rightHandPosition.x, this.rightHandPosition.y, 10, 0, 2*Math.PI)
		this.ctx.fill();
		this.ctx.stroke();

	},


	//--------------------------------------------//
	//--------- WINDOW CHANGE FUNCTIONS ----------//
	//--------------------------------------------//
	resize: function(date) {
		this.refresh(date);
	},
	move: function(date) {
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},


	//------------------------------------------//
	//--------------EVENT FUNCTIONS-------------//
	//------------------------------------------//
	event: function(eventType, position, user_id, data, date) {

		if( eventType == "kinectInput"){
			const headPos = data["OMICRON_SKEL_HEAD"];
			const leftHandPos = data["OMICRON_SKEL_LEFT_HAND"];
			const rightHandPos = data["OMICRON_SKEL_RIGHT_HAND"];
			this.headPosition.x = this.element.width/2.0+headPos.x*this.element.width;
			// this.headPosition.y = this.element.height/2.0+headPos.y*this.element.height;
			this.leftHandPosition.x = this.element.width/2.0+leftHandPos.x*this.element.width;
			// this.leftHandPosition.y = this.element.height/2.0+leftHandPos.y*this.element.height;
			this.rightHandPosition.x = this.element.width/2.0+rightHandPos.x*this.element.width;
			// this.rightHandPosition.y = this.element.height/2.0+rightHandPos.y*this.element.height;

			this.inputCount++;
			this.textToDraw = "Kinect Input!   Count: " + this.inputCount + " Type: Head" + " Position: " + headPos.x + " , " + headPos.y;
			this.refresh(date);
		}
		else if (eventType === "pointerPress" && (data.button === "left")) {

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
	},


});
