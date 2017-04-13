//
// SAGE2 application: articulate_ui
// by: Jillian Aurisano <jillian.aurisano@gmail.com>
//
// Copyright (c) 2015
//

const bodyParts = {
	"OMICRON_SKEL_HEAD": {
		"partName": "head",
		"shape": "circle",
		"baseSize": 20
	},
	"OMICRON_SKEL_LEFT_HAND": {
		"partName": "leftHand",
		"shape": "square",
		"baseSize": 15
	},
	"OMICRON_SKEL_RIGHT_HAND": {
		"partName": "rightHand",
		"shape": "square",
		"baseSize": 15
	},
	"OMICRON_SKEL_SHOULDER_CENTER": {
		"partName": "shoulderCenter",
		"shape": "square",
		"baseSize": 5
	},
	"OMICRON_SKEL_LEFT_SHOULDER": {
		"partName": "leftShoulder",
		"shape": "circle",
		"baseSize": 10
	},
	"OMICRON_SKEL_RIGHT_SHOULDER": {
		"partName": "rightShoulder",
		"shape": "circle",
		"baseSize": 10
	},
	"OMICRON_SKEL_LEFT_FINGERTIP": {
		"partName": "leftFingerTip",
		"shape": "circle",
		"baseSize": "4"
	},
	"OMICRON_SKEL_RIGHT_FINGERTIP": {
		"partName": "rightFingerTip",
		"shape": "circle",
		"baseSize": "4"
	}
};

function skeletonPointing (skeleton) {
	const leftFingerTip = skeleton.leftFingerTip;
	const leftHand = skeleton.leftHand;
	const rightFingerTip = skeleton.rightFingerTip;
	const rightHand = skeleton.rightHand;

	if (fingerIsPointing(leftFingerTip, leftHand)) {
		skeleton.leftFingerTip.colorOverride = "white";
	}

	if (fingerIsPointing(rightFingerTip, rightHand)) {
		skeleton.rightFingerTip.colorOverride = "white";
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

		this.buffer = ""; // buffer for printing data to a file
		this.loggingData = false;
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

		// draw data logging button
		const logText = this.loggingData ? "Turn off logging" : "Turn on logging";
		this.ctx.fillStyle = this.loggingData ? "red" : "green";
		this.ctx.rect(0, this.element.height - 50, 100, this.element.height);
		this.ctx.fill();
		this.ctx.stroke();

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
			this.ctx.fillText("head", skeleton.head.x, skeleton.head.y);
			this.ctx.fillText("leftHand", skeleton.leftHand.x, skeleton.leftHand.y);
			this.ctx.fillText("rightHand", skeleton.rightHand.x, skeleton.rightHand.y);
			this.ctx.fillText(skeletonID, skeleton.shoulderCenter.x, skeleton.shoulderCenter.y);

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

		if( eventType == "pointerPress"){
			this.loggingData = !this.loggingData;
		}
		if( eventType === "kinectInput"){
			// determine which time period this event belongs to
			if (date.getTime() - 10000 > this.beginningOfCurrentTimePeriod) {
				this.logData("subject0_trial" + this.currentTimePeriod);

				this.beginningOfCurrentTimePeriod = date.getTime();
				this.timePeriods.push({});
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
				"leftHandY" : this.skeletons[skeletonID].leftHand.y,
				"rightHandY" : this.skeletons[skeletonID].rightHand.y,
				"leftHandX": this.skeletons[skeletonID].leftHand.x,
				"rightHandX" : this.skeletons[skeletonID].rightHand.x,
			};

			this.addToBuffer(skeletonID, "leftHand");

			this.timePeriods[this.currentTimePeriod][skeletonID].push(skel);

			this.refresh(date);
		}
		else if (eventType === "grammarInput") {
			// what to do if grammar recognized
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

	addToBuffer: function (skeletonID, bodyPartName) {
		const bodyPart = this.skeletons[skeletonID][bodyPartName];
		this.buffer += bodyPartName + "," + bodyPart.x + "," + bodyPart.y + "\n";
	},

	//this is how we can print data to a file
	logData: function(filename){
		if (this.loggingData) {
			console.log("logging data to file: " + filename);
			this.buffer = "Body Part,X coord,Y coord\n" + this.buffer;
			dataToSave = this.buffer;
			this.saveFile("", filename, "csv", dataToSave); //JSON.stringify(this.state, null, "\t"));
		}
		this.buffer = "";
	}

});
