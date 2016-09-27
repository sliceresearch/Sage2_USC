//
// SAGE2 application: articulate_ui
// by: Jillian Aurisano <jillian.aurisano@gmail.com>
//
// Copyright (c) 2015
//

function handIsForward (hand, shoulder) {
	if (hand.z + 0.15 < shoulder.z) {
		return true;
	} else return false;
}

function handIsRaised (hand, shoulder) {
	if (hand.y + 100 < shoulder.y) {
		return true;
	} else return false;
}

function fingerIsPointing (fingerTip, hand) {
	if (fingerTip.z + 0.02 < hand.z) {
		return true;
	} else return false;
}

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
			this.ctx.fillStyle = "white";
			this.ctx.fillText( "Input: " + this.textToDraw, this.element.width/2.0, 32);

			this.ctx.fillStyle = skeleton.color;
			this.ctx.fillText("head", skeleton.headPosition.x, skeleton.headPosition.y);
			this.ctx.fillText("leftHand", skeleton.leftHandPosition.x, skeleton.leftHandPosition.y);
			this.ctx.fillText("rightHand", skeleton.rightHandPosition.x, skeleton.rightHandPosition.y);
			this.ctx.fillText(skeletonID, skeleton.shoulderCenterPosition.x, skeleton.shoulderCenterPosition.y);

			for (const bodyPartName in skeleton) {
				const bodyPart = skeleton[bodyPartName];

				const shape = bodyPart.shape;
				const x = bodyPart.x;
				const y = bodyPart.y;
				const z = bodyPart.z;
				const size = bodyPart.baseSize / z;

				if (shape === "circle") {
					this.ctx.beginPath();
					this.ctx.arc(x, y, size, 0, 2*Math.PI);
					this.ctx.fill();
					this.ctx.stroke();
				} else if (shape === "square") {
					this.ctx.rect(x, y, size, size);
					this.ctx.fill();
					this.ctx.stroke();
				}
			}

			const leftFingerTip = skeleton.leftFingerTipPosition;
			const leftHand = skeleton.leftHandPosition;
			const leftShoulder = skeleton.leftShoulderPosition;

			if (handIsForward(leftHand, leftShoulder) &&
				handIsRaised(leftHand, leftShoulder) &&
				fingerIsPointing(leftFingerTip, leftHand)) {
				console.log("Finger is pointing foward and up");
			}

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
		const skeletonColors = ["red", "blue", "green", "orange", "pink"];

		if( eventType === "kinectInput"){
			const skeletonID = data["skeletonID"];

			if (!this.skeletons[skeletonID]) {
				var availableColors = [];

				for (var i = 0; i < skeletonColors.length; i++) {
					const skeletonColor = skeletonColors[i];
					const skeletonsWithThisColor = _.pickBy(this.skeletons, function (skeleton) {
						return skeleton.color === skeletonColor;
					});

					if (_.size(skeletonsWithThisColor) === 0) {
						availableColors.push(skeletonColor);
					}
				}

				this.skeletons[skeletonID] = {
					color: availableColors.length > 0 ? _.shuffle(availableColors)[0] : "white"
				};
			}

			const bodyParts = {
				"OMICRON_SKEL_HEAD": {
					"partName": "headPosition",
					"shape": "circle",
					"baseSize": 20
				},
				"OMICRON_SKEL_LEFT_HAND": {
					"partName": "leftHandPosition",
					"shape": "square",
					"baseSize": 15
				},
				"OMICRON_SKEL_RIGHT_HAND": {
					"partName": "rightHandPosition",
					"shape": "square",
					"baseSize": 15
				},
				"OMICRON_SKEL_SHOULDER_CENTER": {
					"partName": "shoulderCenterPosition",
					"shape": "square",
					"baseSize": 5
				},
				"OMICRON_SKEL_LEFT_SHOULDER": {
					"partName": "leftShoulderPosition",
					"shape": "circle",
					"baseSize": 10
				},
				"OMICRON_SKEL_RIGHT_SHOULDER": {
					"partName": "rightShoulderPosition",
					"shape": "circle",
					"baseSize": 10
				},
				"OMICRON_SKEL_LEFT_FINGERTIP": {
					"partName": "leftFingerTipPosition",
					"shape": "circle",
					"baseSize": "2"
				},
				"OMICRON_SKEL_RIGHT_FINGERTIP": {
					"partName": "rightFingerTipPosition",
					"shape": "circle",
					"baseSize": "2"
				}
			};
			for (const bodyPartID in data) {
				const bodyPart = data[bodyPartID];

				if (bodyParts[bodyPartID]) {
					const bodyPartName = bodyParts[bodyPartID].partName;

					this.skeletons[skeletonID][bodyPartName] = {};
					this.skeletons[skeletonID][bodyPartName].x = this.element.width/2.0+bodyPart.x*this.element.width;
					this.skeletons[skeletonID][bodyPartName].y = this.element.height/2.0-bodyPart.y*this.element.height;
					this.skeletons[skeletonID][bodyPartName].z = bodyPart.z/2.0;
					this.skeletons[skeletonID][bodyPartName].shape = bodyParts[bodyPartID].shape;
					this.skeletons[skeletonID][bodyPartName].baseSize = bodyParts[bodyPartID].baseSize;
				}
			}
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
