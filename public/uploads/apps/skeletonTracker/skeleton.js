//
// SAGE2 application: articulate_ui
// by: Jillian Aurisano <jillian.aurisano@gmail.com>
//
// Copyright (c) 2015
//

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
		"baseSize": "4"
	},
	"OMICRON_SKEL_RIGHT_FINGERTIP": {
		"partName": "rightFingerTipPosition",
		"shape": "circle",
		"baseSize": "4"
	}
};

function skeletonPointing (skeleton) {
	const leftFingerTip = skeleton.leftFingerTipPosition;
	const leftHand = skeleton.leftHandPosition;
	const rightFingerTip = skeleton.rightFingerTipPosition;
	const rightHand = skeleton.rightHandPosition;

	if (fingerIsPointing(leftFingerTip, leftHand)) {
		skeleton.leftFingerTipPosition.colorOverride = "white";
	}

	if (fingerIsPointing(rightFingerTip, rightHand)) {
		skeleton.rightFingerTipPosition.colorOverride = "white";
	}
}

function fingerIsPointing (fingerTip, hand) {
	return fingerTip.z + 0.015 < hand.z;
}

function endOfPeriod (timePeriod) {
	for (const skeletonID in timePeriod) {
		const skeletonPeriod = timePeriod[skeletonID];

		var leftHandStartAvgY = 0;
		var leftHandEndAvgY = 0;
		var leftHandStartAvgX = 0;
		var leftHandEndAvgX = 0;
		var rightHandStartAvgX = 0;
		var rightHandEndAvgX = 0;

		var i = 0;
		for (; i < skeletonPeriod.length && i < 5; i++) {
			leftHandStartAvgY += skeletonPeriod[i].leftHandY;
			leftHandEndAvgY += skeletonPeriod[skeletonPeriod.length - (i + 1)].leftHandY;
			leftHandStartAvgX += skeletonPeriod[i].leftHandX;
			leftHandEndAvgX += skeletonPeriod[skeletonPeriod.length - (i + 1)].leftHandX;
			rightHandStartAvgX += skeletonPeriod[i].rightHandX;
			rightHandEndAvgX += skeletonPeriod[skeletonPeriod.length - (i + 1)].rightHandX;
		}
		leftHandStartAvgY /= i;
		leftHandEndAvgY /= i;
		leftHandStartAvgX /= i;
		leftHandEndAvgX /= i;
		rightHandStartAvgX /= i;
		rightHandEndAvgX /= i;

		if (leftHandEndAvgY + 200 < leftHandStartAvgY) {
			console.log("Hand was raised");
		} else if (leftHandStartAvgY + 200 < leftHandEndAvgY) {
			console.log("Hand was lowered");
		}

		if ((leftHandEndAvgX - 200 > leftHandStartAvgX) &&
				 (rightHandEndAvgX - 200 > rightHandStartAvgX)) {
			console.log("Hands were swept right");
		} else if ((leftHandStartAvgX - 200 > leftHandEndAvgX) &&
								(rightHandStartAvgX - 200 > rightHandEndAvgX)) {
			console.log("Hands were swept left");
		}
	}
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

		this.textToDraw = "waiting for kinect input... ";

		this.skeletons = {};
		this.speechEvents = [];

		var date = new Date();
		this.startTime = date.getTime();
		this.beginningOfCurrentTimePeriod = this.startTime;
		this.timePeriods = [{}];
		this.currentTimePeriod = 0;

		this.displayCorners = {
			"topLeft": {
				"x": -1,
				"y": -1,
				"z": -1
			},
			"topRight": {
				"x": -1,
				"y": -1,
				"z": -1
			},
			"bottomLeft": {
				"x": -1,
				"y": -1,
				"z": -1
			},
			"bottomRight": {
				"x": -1,
				"y": -1,
				"z": -1
			},
		};
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

		// filter out skeletons that haven't been updated in over 1 second
		this.skeletons = _.pickBy(this.skeletons, function (skeleton) {
			return date.getTime() - skeleton.lastUpdate < 1000;
		});

		for (const skeletonID in this.skeletons) {
			const skeleton = this.skeletons[skeletonID];

			// console.log('articulate_ui> Draw with state value', this.state.value);

			this.fontSize = 32;
			this.ctx.font = "32px Helvetica";
			this.ctx.textAlign="center";

			//status bar
			this.ctx.fillStyle = "white";
			this.ctx.fillText( "Speech Input: " + this.textToDraw, this.element.width/2.0, 32);

			this.ctx.fillStyle = skeleton.color;
			this.ctx.fillText("head", skeleton.headPosition.x, skeleton.headPosition.y);
			this.ctx.fillText("leftHand", skeleton.leftHandPosition.x, skeleton.leftHandPosition.y);
			this.ctx.fillText("rightHand", skeleton.rightHandPosition.x, skeleton.rightHandPosition.y);
			this.ctx.fillText(skeletonID, skeleton.shoulderCenterPosition.x, skeleton.shoulderCenterPosition.y);

			skeletonPointing(skeleton);

			for (const bodyPartName in skeleton) {
				const bodyPart = skeleton[bodyPartName];

				const shape = bodyPart.shape;
				const x = bodyPart.x;
				const y = bodyPart.y;
				const z = bodyPart.z;
				const size = bodyPart.baseSize / z;

				if (bodyPart.colorOverride) {
					this.ctx.fillStyle = bodyPart.colorOverride;
				} else {
					this.ctx.fillStyle = skeleton.color;
				}

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
		}

		const cornerColors = {
			"topLeft": "white",
			"topRight": "blue",
			"bottomLeft": "red",
			"bottomRight": "yellow"
		};

		// draw corners of display
		for (const cornerID in this.displayCorners) {
			const cornerPos = this.displayCorners[cornerID];
			const cornerColor = cornerColors[cornerID];

			this.ctx.fillStyle = cornerColor;
			this.ctx.beginPath();
			this.ctx.arc(cornerPos.x, cornerPos.y, 10, 0, 2*Math.PI);
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
		const skeletonColors = ["red", "blue", "green", "orange", "pink"];

		if( eventType === "kinectInput"){
			// determine which time period this event belongs to
			if (date.getTime() - 2000 > this.beginningOfCurrentTimePeriod) {
				this.beginningOfCurrentTimePeriod = date.getTime();
				this.timePeriods.push({});

				endOfPeriod(this.timePeriods[this.currentTimePeriod]);

				this.currentTimePeriod += 1;
			}

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

			// if this skeleton isn't present in the current time period, add it
			if (!this.timePeriods[this.currentTimePeriod][skeletonID]) {
				this.timePeriods[this.currentTimePeriod][skeletonID] = [];
			}

			for (const bodyPartID in data) {
				const bodyPart = data[bodyPartID];

				if (bodyParts[bodyPartID]) {
					const bodyPartName = bodyParts[bodyPartID].partName;
					if (bodyPartName === "leftHandPosition") console.log(bodyPart.x);
					this.skeletons[skeletonID][bodyPartName] = {};
					this.skeletons[skeletonID][bodyPartName].x = this.element.width/2.0+bodyPart.x*this.element.width;
					this.skeletons[skeletonID][bodyPartName].y = this.element.height/2.0-bodyPart.y*this.element.height;
					this.skeletons[skeletonID][bodyPartName].z = bodyPart.z;
					this.skeletons[skeletonID][bodyPartName].shape = bodyParts[bodyPartID].shape;
					this.skeletons[skeletonID][bodyPartName].baseSize = bodyParts[bodyPartID].baseSize;
				}
			}
			this.mostRecentSkeleton = this.skeletons[skeletonID];
			this.skeletons[skeletonID].lastUpdate = date.getTime();
			const skel = {
				"leftHandY" : this.skeletons[skeletonID].leftHandPosition.y,
				"rightHandY" : this.skeletons[skeletonID].rightHandPosition.y,
				"leftHandX": this.skeletons[skeletonID].leftHandPosition.x,
				"rightHandX" : this.skeletons[skeletonID].rightHandPosition.x,
			};

			this.timePeriods[this.currentTimePeriod][skeletonID].push(skel);

			this.refresh(date);
		}
		else if (eventType === "grammarInput") {
			// what to do if grammar recognized
			const phrase = data.phrase;

			if (phrase === "Top Left") {
				this.displayCorners["topLeft"] = this.mostRecentSkeleton["leftFingerTipPosition"];
			} else if (phrase === "Top Right") {
				this.displayCorners["topRight"] = this.mostRecentSkeleton["leftFingerTipPosition"];
			} else if (phrase === "Bottom Left") {
				this.displayCorners["bottomLeft"] = this.mostRecentSkeleton["leftFingerTipPosition"];
			} else if (phrase === "Bottom Right") {
				this.displayCorners["bottomRight"] = this.mostRecentSkeleton["leftFingerTipPosition"];
			}
		}
		else if (eventType === "dictationInput") {
			const phrase = data.phrase;

			const minutes = date.getMinutes();
			const minutesFormatted = minutes < 10 ? "0" + minutes : "" + minutes;

			const seconds = date.getSeconds();
			const secondsFormatted = seconds < 10 ? "0" + seconds : "" + seconds;

			this.textToDraw = phrase;
			this.speechEvents.push({
				"phrase": phrase,
				"time": date.getHours() + ":" + minutesFormatted + ":" + secondsFormatted
			});

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
