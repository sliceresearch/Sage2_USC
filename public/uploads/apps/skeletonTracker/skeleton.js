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

		this.skeletons = {};
	},

	load: function(date) {
		console.log('articulate_ui> Load with state value', this.state.value);


		this.refresh(date);
	},



	//----------------------------------------//
	//---------- DRAWING FUNCTIONS ----------//
	//---------------------------------------//
	draw: function(date) {
		this.ctx.clearRect(0, 0, this.element.width, this.element.height);

		// filter out skeletons that haven't been updated in over 2 seconds
		this.skeletons = _.pickBy(this.skeletons, function (skeleton) {
			return date.getTime() - skeleton.lastUpdate < 2000;
		});

		for (const skeletonID in this.skeletons) {
			const skeleton = this.skeletons[skeletonID];

			console.log('articulate_ui> Draw with state value', this.state.value);

			this.fontSize = 32;
			this.ctx.font = "32px Helvetica";
			this.ctx.textAlign="center";

			//status bar
			this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
			this.ctx.fillText( "Input: " + this.textToDraw, this.element.width/2.0, 32);

			this.ctx.fillStyle = skeleton.color || this.ctx.fillStyle;
			this.ctx.fillText("head", skeleton.headPosition.x, skeleton.headPosition.y);
			this.ctx.fillText("leftHand", skeleton.leftHandPosition.x, skeleton.leftHandPosition.y);
			this.ctx.fillText("rightHand", skeleton.rightHandPosition.x, skeleton.rightHandPosition.y);
			this.ctx.fillText(skeletonID, skeleton.shoulderCenterPosition.x, skeleton.shoulderCenterPosition.y);

			this.ctx.beginPath();
			this.ctx.arc(skeleton.headPosition.x, skeleton.headPosition.y, 15, 0, 2*Math.PI)
			this.ctx.fill();
			this.ctx.stroke();

			this.ctx.beginPath();
			this.ctx.arc(skeleton.leftHandPosition.x, skeleton.leftHandPosition.y, 10, 0, 2*Math.PI)
			this.ctx.fill();
			this.ctx.stroke();

			this.ctx.beginPath();
			this.ctx.arc(skeleton.rightHandPosition.x, skeleton.rightHandPosition.y, 10, 0, 2*Math.PI)
			this.ctx.fill();
			this.ctx.stroke();
		}
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
		const skeletonColors = ["red", "blue", "green", "orange", "pink", "white"];

		if( eventType == "kinectInput"){
			const skeletonID = data["skeletonID"];

			if (!this.skeletons[skeletonID]) {
				var availableColors = [];

				for (var i = 0; i < skeletonColors.length; i++) {
					const skeletonColor = skeletonColors[i];
					const skeletonsWithThisColor = _.pickBy(this.skeletons, function (skeleton) {
						return skeleton.color == skeletonColor;
					});

					if (_.size(skeletonsWithThisColor) == 0) {
						availableColors.push(skeletonColor);
					}
				};

				this.skeletons[skeletonID] = {
					headPosition: {},
					leftHandPosition: {},
					rightHandPosition: {},
					shoulderCenterPosition: {},
					color: availableColors.length > 0 ? _.shuffle(availableColors)[0] : undefined
				};
			}

			const headPos = data["OMICRON_SKEL_HEAD"];
			const leftHandPos = data["OMICRON_SKEL_LEFT_HAND"];
			const rightHandPos = data["OMICRON_SKEL_RIGHT_HAND"];
			const shoulderCenterPos = data["OMICRON_SKEL_SHOULDER_CENTER"];

			this.skeletons[skeletonID].headPosition.x = this.element.width/2.0+headPos.x*this.element.width;
			this.skeletons[skeletonID].headPosition.y = this.element.height/2.0-headPos.y*this.element.height;
			this.skeletons[skeletonID].leftHandPosition.x = this.element.width/2.0+leftHandPos.x*this.element.width;
			this.skeletons[skeletonID].leftHandPosition.y = this.element.height/2.0-leftHandPos.y*this.element.height;
			this.skeletons[skeletonID].rightHandPosition.x = this.element.width/2.0+rightHandPos.x*this.element.width;
			this.skeletons[skeletonID].rightHandPosition.y = this.element.height/2.0-rightHandPos.y*this.element.height;
			this.skeletons[skeletonID].shoulderCenterPosition.x = this.element.width/2.0+shoulderCenterPos.x*this.element.width;
			this.skeletons[skeletonID].shoulderCenterPosition.y = this.element.height/2.0-shoulderCenterPos.y*this.element.height;

			this.skeletons[skeletonID].lastUpdate = date.getTime();

			this.inputCount++;

			this.textToDraw = "skeletons: [ ";
			for (const skeleton in this.skeletons) {
				this.textToDraw += skeleton + " ";
			}
			this.textToDraw += "]";

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
