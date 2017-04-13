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
	"OMICRON_SKEL_LEFT_WRIST": {
		"partName": "leftWrist",
		"shape": "square",
		"baseSize": 15
	},
	"OMICRON_SKEL_LEFT_FINGERTIP": {
		"partName": "leftFingerTip",
		"shape": "circle",
		"baseSize": 10
	},
	"OMICRON_SKEL_LEFT_THUMB": {
		"partName": "leftThumb",
		"shape": "circle",
		"baseSize": 4
	},
	"OMICRON_SKEL_LEFT_ELBOW": {
		"partName": "leftElbow",
		"shape": "circle",
		"baseSize": 20
	},
	"OMICRON_SKEL_LEFT_SHOULDER": {
		"partName": "leftShoulder",
		"shape": "circle",
		"baseSize": 20
	},
	"OMICRON_SKEL_LEFT_HIP": {
		"partName": "leftHip",
		"shape": "circle",
		"baseSize": 4
	},
	"OMICRON_SKEL_LEFT_KNEE": {
		"partName": "leftKnee",
		"shape": "circle",
		"baseSize": 4
	},
	"OMICRON_SKEL_LEFT_ANKLE": {
		"partName": "leftAnkle",
		"shape": "circle",
		"baseSize": 4
	},
	"OMICRON_SKEL_LEFT_FOOT": {
		"partName": "leftFoot",
		"shape": "circle",
		"baseSize": 4
	},
	"OMICRON_SKEL_RIGHT_HAND": {
		"partName": "rightHand",
		"shape": "square",
		"baseSize": 15
	},
	"OMICRON_SKEL_RIGHT_WRIST": {
		"partName": "rightWrist",
		"shape": "square",
		"baseSize": 15
	},
	"OMICRON_SKEL_RIGHT_FINGERTIP": {
		"partName": "rightFingerTip",
		"shape": "circle",
		"baseSize": 10
	},
	"OMICRON_SKEL_RIGHT_THUMB": {
		"partName": "rightThumb",
		"shape": "circle",
		"baseSize": 4
	},
	"OMICRON_SKEL_RIGHT_ELBOW": {
		"partName": "rightElbow",
		"shape": "circle",
		"baseSize": 20
	},
	"OMICRON_SKEL_RIGHT_SHOULDER": {
		"partName": "rightShoulder",
		"shape": "circle",
		"baseSize": 20
	},
	"OMICRON_SKEL_RIGHT_HIP": {
		"partName": "rightHip",
		"shape": "circle",
		"baseSize": 4
	},
	"OMICRON_SKEL_RIGHT_KNEE": {
		"partName": "rightKnee",
		"shape": "circle",
		"baseSize": 4
	},
	"OMICRON_SKEL_RIGHT_ANKLE": {
		"partName": "rightAnkle",
		"shape": "circle",
		"baseSize": 4
	},
	"OMICRON_SKEL_RIGHT_FOOT": {
		"partName": "rightFoot",
		"shape": "circle",
		"baseSize": 4
	},
	"OMICRON_SKEL_SPINE": {
		"partName": "spine",
		"shape": "circle",
		"baseSize": 10
	},
	"OMICRON_SKEL_SHOULDER_CENTER": {
		"partName": "shoulderCenter",
		"shape": "circle",
		"baseSize": 10
	},

};

// function endOfPeriod (timePeriod) {
// 	for (const skeletonID in timePeriod) {
// 		const skeletonPeriod = timePeriod[skeletonID];
//
// 		var leftHandStartAvgY = 0;
// 		var leftHandEndAvgY = 0;
// 		var leftHandStartAvgX = 0;
// 		var leftHandEndAvgX = 0;
//
// 		var i = 0;
// 		for (; i < skeletonPeriod.length && i < 5; i++) {
// 			leftHandStartAvgY += skeletonPeriod[i].leftHandY;
// 			leftHandEndAvgY += skeletonPeriod[skeletonPeriod.length - (i + 1)].leftHandY;
// 			leftHandStartAvgX += skeletonPeriod[i].leftHandX;
// 			leftHandEndAvgX += skeletonPeriod[skeletonPeriod.length - (i + 1)].leftHandX;
// 		}
// 		leftHandStartAvgY /= i;
// 		leftHandEndAvgY /= i;
// 		leftHandStartAvgX /= i;
// 		leftHandEndAvgX /= i;
//
// 		if (leftHandEndAvgY + 200 < leftHandStartAvgY) {
// 			console.log("Hand was raised");
// 		} else if (leftHandStartAvgY + 200 < leftHandEndAvgY) {
// 			console.log("Hand was lowered");
// 		}
//
// 		if (leftHandEndAvgX - 200 > leftHandStartAvgX) {
// 			console.log("Hand was swept right");
// 		} else if (leftHandStartAvgX - 200 > leftHandEndAvgX) {
// 			console.log("Hand was swept left");
// 		}
// 	}
// }

var machineLearning2 = SAGE2_App.extend( {
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
		this.maxFPS = 20.0;
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;

		this.ctx = this.element.getContext('2d');

		// this.textToDraw = "waiting for kinect input... ";

		this.skeletons = {};
		this.speechEvents = [];

		var date = new Date();
		this.startTime = date.getTime();
		this.currentTrialStartTime = this.startTime;
		this.calibratedBuffer = ""; // buffer for printing data to a file
		this.rawSkeletonBuffer = "";
		this.trialRunning = false;
		this.trialNumber = 0;

		this.regularTrialMode = true;
		this.drawSkeletonMode = true;

		// Math.seed(date);

		this.trialStates = ["pause","free_gestures", "init_gesture", "gesture", "stop_gesture", "free_gestures", "saveornot"];
		this.trialTimes = [10000000, 10, 2, 10, 2, 6, 1000000]; //how many seconds for each state
		this.generateRandomTimings();
		this.currentState = 0;
		this.saveOrNotStatus = "";
		this.timeSinceLastState = Date.now();
		// this.ballStartPosition = {"x": this.element.width/2, "y": this.element.height/2};
		// this.ballEndPosition = { "x": Math.random()*this.element.width, "y": Math.random()*this.element.height}
		this.generateRandomPosition();

		this.timeSinceLastDraw = Date.now();

		// randomly calculate direction and speed of ball
		const xSign = ((Math.floor(Math.random() * 2)) - 1) === -1 ? -1 : 1;
		const ySign = ((Math.floor(Math.random() * 2)) - 1) === -1 ? -1 : 1;
		const xDir = (Math.random() * 2 + 2) * xSign;
		const yDir = (Math.random() * 2 + 2) * ySign;

		this.ball = {
			"x": this.element.width / 2,
			"y": this.element.height / 2,
			"xDir": xDir, // between [-4, -2] or [2, 4]
			"yDir": yDir, // between [-4, -2] or [2, 4]
			"color": "red",
			"radius": 35,
			"stopMoveTime": Date.now()
		};

		this.calibrations = {
			"calibrated": false
		};
	},

	load: function(date) {
		console.log('articulate_ui> Load with state value', this.state.value);

		this.refresh(date);
	},

	fillCircle: function(x, y, diameter) {
		this.ctx.beginPath();
		this.ctx.arc(x, y, diameter, 0, 2*Math.PI);
		this.ctx.fill();
		this.ctx.stroke();
		this.ctx.closePath();
	},

	// -------------- CALIBRATED TRIAL FUNCTIONS

	drawCalibrationGuides: function() {
		const {upperLeft, lowerLeft, upperRight, lowerRight} = this.calibrations;

		this.ctx.fillStyle = "blue";
		if (upperLeft) { // draw upper left guide
			this.fillCircle(upperLeft.x, upperLeft.y, 10);
		}
		if (lowerLeft) { // draw lower left guide
			this.fillCircle(lowerLeft.x, lowerLeft.y, 10);
		}
		if (upperRight) { // draw upper right guide
			this.fillCircle(upperRight.x, upperRight.y, 10);
		}
		if (lowerRight) { // draw lower right guide
			this.fillCircle(lowerRight.x, lowerRight.y, 10);
		}
	},

	map: function(oldValue, oldMin, oldMax, newMin, newMax) {
		if ((oldMax - oldMin ) === 0) return 0; // avoid divide by zero
		return (oldValue - oldMin) / (oldMax - oldMin) * (newMax - newMin) + newMin;
	},

	fingerPointingAtBall: function (fingerX, fingerY, ballX, ballY, radius) {
		return (fingerX >= ballX - radius) && (fingerX <= ballX + radius) && (fingerY >= ballY - radius) && (fingerY <= ballY + radius);
	},

	drawWithCalibrations: function() {
		const {xMin, xMax, yMin, yMax} = this.calibrations;
		const {x, y} = this.mostRecentSkeleton.leftFingerTip;

		const adjustedX = this.map(x, xMin, xMax, 0, this.element.width);
		const adjustedY = this.map(y, yMin, yMax, 0, this.element.height);
		const ballX = this.ball.x;
		const ballY = this.ball.y;
		const radius = this.ball.radius;
		const fingerIsPointingAtBall = this.fingerPointingAtBall(adjustedX, adjustedY, ballX, ballY, radius);

		// if ball is not moving, finger is pointing at ball, and it has been 5 seconds since last "trial"
		// begin new trial
		if (this.ball.color != "green" && fingerIsPointingAtBall && Date.now() - 5000 > this.ball.stopMoveTime) {
			this.ball.color = "green";
			// this.ball.color = "yellow";
			// setTimeout(function() {
			// 	this.ball.color = "green";
			// 	this.ball.startMoveTime = Date.now();
			// }, 2000);
		}

		// if ball has been moving for 10 seconds, stop it
		if (this.ball.color === "green" && Date.now() - 10000 > this.ball.startMoveTime) {
			this.ball.stopMoveTime = Date.now();
			this.ball.color = "red";
			this.logCalibratedData("calibrated_subject0_trial" + this.trialNumber);
			this.logSkeletonData("skeleton_subject0_trial" + this.trialNumber);
			this.trialNumber++;
		}

		// during "trial" (ball is moving) log data for finger and ball
		if (this.ball.color === "green") {
			this.calibratedBuffer += adjustedX + "," + adjustedY + "," + ballX + "," + ballY + "," + fingerIsPointingAtBall + "\n";

			// fill the skeleton buffer
			count = 0;
			this.rawSkeletonBuffer += Date.now() +"," + "green:";
			for (const bodyPartName in this.mostRecentSkeleton) {
				const bodyPart = this.mostRecentSkeleton[bodyPartName];
				if( count == 0 ){ // first line body part
					this.rawSkeletonBuffer += bodyPart.kinectX + "," + bodyPart.kinectY + "," + bodyPart.z;
				}
				else { // remaining body parts, start with a comma - fencepost
					this.rawSkeletonBuffer += "," + bodyPart.kinectX + "," + bodyPart.kinectY + "," + bodyPart.z;
				}
				count++;
			}
			this.rawSkeletonBuffer += "\n"; //end with a new line
		}

		this.ctx.fillStyle = this.ball.color;
		this.fillCircle(this.ball.x, this.ball.y, this.ball.radius * 2); // draw ball

		this.ctx.fillStyle = "white"; // left finger tip color
		this.fillCircle(adjustedX, adjustedY, 10); // left finger tip
	},

	drawRawBodyParts: function () {
		// drawing the ball
		this.ctx.fillStyle = this.ball.color;
		this.fillCircle(this.ball.x, this.ball.y, this.ball.radius * 2);

		this.drawCalibrationGuides();

		for (const skeletonID in this.skeletons) {
			const skeleton = this.skeletons[skeletonID];

			// console.log('articulate_ui> Draw with state value', this.state.value);

			this.fontSize = 32;
			this.ctx.font = "32px Helvetica";
			this.ctx.textAlign="center";

			//status bar
			this.ctx.fillStyle = "white";
			this.ctx.fillText( "Number of skeletons recognized: " + _.size(this.skeletons), this.element.width/2.0, 32);

			this.ctx.fillStyle = skeleton.color;
			this.ctx.fillText("leftHand", skeleton.leftHand.x, skeleton.leftHand.y);

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
					this.fillCircle(x, y, size);
				} else if (shape === "square") {
					this.ctx.rect(x, y, size, size);
					this.ctx.fill();
					this.ctx.stroke();
				}
			}
		}
	},

	calibratedTrialModeDraw: function(date) {
			this.ctx.clearRect(0, 0, this.element.width, this.element.height);

			// draw data logging "button"
			const logText = this.trialRunning ? "End Trial" : "Begin Trial";
			this.ctx.fillStyle = this.trialRunning ? "red" : "green";
			this.ctx.rect(0, this.element.height - 50, 100, this.element.height);
			this.ctx.fill();
			this.ctx.stroke();
			this.ctx.fillStyle = "black";
			this.ctx.font = "18px Helvetica";
			this.ctx.fillText(logText, 50, this.element.height - 20);

			// draw trial number
			this.ctx.fillStyle = "white";
			this.ctx.fillText("Trial: " + this.trialNumber, 30, 20);

			// filter out skeletons that haven't been updated in over 1 second
			this.skeletons = _.pickBy(this.skeletons, function (skeleton) {
				return date.getTime() - skeleton.lastUpdate < 1000;
			});

			// moving the ball if in green state
			if (this.ball.color === "green") {
				this.ball.x += this.ball.xDir;
				this.ball.y += this.ball.yDir;
				if (this.ball.x + this.ball.radius > this.element.width || this.ball.x - this.ball.radius < 0) {
					this.ball.xDir = -this.ball.xDir;
				}
				if (this.ball.y + this.ball.radius > this.element.height || this.ball.y - this.ball.radius < 0) {
					this.ball.yDir = -this.ball.yDir;
				}
			}

			if (this.calibrations.calibrated) {
				this.drawWithCalibrations();
			}
			else {
				this.drawRawBodyParts();
			}
		},

	//----------------------------------------//
	//---------- DRAWING FUNCTIONS ----------//
	//---------------------------------------//
	draw: function(date) {
		// console.log( "time elapsed: " + (Date.now() - this.timeSinceLastState));
		// console.log( "time in state " + (this.trialTimes[this.currentState]*1000) );
		if( this.trialTimes[this.currentState]*1000 < date - this.timeSinceLastState ){
			this.currentState++;
			this.timeSinceLastState = date; //Date.now();
			if( this.currentState>this.trialTimes.length)
				this.currentState = 0;
		}
		if( this.regularTrialMode ){
			this.regularTrialModeDraw(date);
		}
		else {
			this.calibratedTrialModeDraw(date);
		}
		// this.refresh(date);
		this.timeSinceLastDraw = date;

	},


////  REGULAR (non-calibrated) TRIAL FUNCTIONS
	regularTrialModeDraw: function(date){

		this.ctx.clearRect(0, 0, this.element.width, this.element.height);
		// filter out skeletons that haven't been updated in over 1 second
		this.skeletons = _.pickBy(this.skeletons, function (skeleton) {
			return date.getTime() - skeleton.lastUpdate < 1000;
		});

		if( this.drawSkeletonMode ){
			this.drawSkeleton();
		}

		// // draw data logging "button"
		// const logText = this.trialRunning ? "End Trial" : "Begin Trial";
		// this.ctx.fillStyle = this.trialRunning ? "red" : "green";
		// this.ctx.rect(0, this.element.height - 50, 200, this.element.height);
		// this.ctx.fill();
		// this.ctx.stroke();
		this.ctx.fillStyle = "black";
		this.ctx.font = "24px Helvetica";
		// this.ctx.fillText(logText, 50, this.element.height - 20);

		// draw trial number
		this.ctx.fillStyle = "white";
		this.ctx.fillText("Trial: " + this.trialNumber, 30, 20);
		this.ctx.fillText( "Number of skeletons recognized: " + _.size(this.skeletons), this.element.width/2.0, 32);

		if( this.trialStates[this.currentState] == "pause" ){
			// this.ctx.fillStyle = "steelblue";
			// this.ctx.rect(this.element.width/2-200, this.element.height/2-20, 400, 40 );
			// this.ctx.fill();
			// this.ctx.stroke();
			this.ctx.fillStyle = "white";
			this.ctx.fillText(this.saveOrNotStatus + "  click anywhere to begin", this.element.width/2-100, this.element.height/2);

			this.ball.x = this.ballStartPosition.x;
			this.ball.y = this.ballEndPosition.y;
			this.incrementPerMS = {
				"x": (this.ballEndPosition.x-this.ballStartPosition.x)/(this.trialTimes[3]*1000),
				"y": (this.ballStartPosition.y- this.ballEndPosition.y)/(this.trialTimes[3]*1000)
			};
		}
		if( this.trialStates[this.currentState] == "free_gestures"){

			this.ctx.fillStyle = "tomato"
			this.fillCircle(this.ball.x, this.ball.y, 100);
			this.ctx.fillStyle = "black";
			this.ctx.textAlign ="center"
			this.ctx.fillText("Gesture freely",this.ball.x, this.ball.y);

			this.fillSkeletonBuffer();
		}
		if( this.trialStates[this.currentState] == "init_gesture"){

			this.ctx.fillStyle = "gold"
			this.fillCircle(this.ball.x, this.ball.y, 100);
			this.ctx.fillStyle = "black";
			this.ctx.textAlign ="center"
			this.ctx.fillText("Select ball",this.ball.x, this.ball.y);

			this.fillSkeletonBuffer();

		}
		if( this.trialStates[this.currentState] == "gesture"){

			//pixelsPerMS * MS elapsed
			this.ball.x +=  this.incrementPerMS.x * (date-this.timeSinceLastDraw);
			this.ball.y += this.incrementPerMS.y * (date-this.timeSinceLastDraw);

			this.ctx.fillStyle = "mediumseagreen"
			this.fillCircle(this.ball.x, this.ball.y, 100);
			this.ctx.fillStyle = "black";
			this.ctx.textAlign ="center"
			this.ctx.fillText("Follow ball",this.ball.x, this.ball.y);

			this.fillSkeletonBuffer();

		}
		if( this.trialStates[this.currentState] == "stop_gesture"){

			this.ctx.fillStyle = "gold"
			this.fillCircle(this.ball.x, this.ball.y, 100);
			this.ctx.fillStyle = "black";
			this.ctx.textAlign ="center"
			this.ctx.fillText("Stop selecting",this.ball.x, this.ball.y);

			this.fillSkeletonBuffer();

		}
		if( this.trialStates[this.currentState] == "saveornot"){
			this.ctx.fillStyle = "mediumseagreen";
		  this.ctx.fillRect(this.element.width/4-100, this.element.height/2-40, 200, 80);

			// this.ctx.stroke();
			//
			this.ctx.fillStyle = "crimson";
			this.ctx.fillRect(3*this.element.width/4-100, this.element.height/2-40, 200, 80);

			this.ctx.fillStyle = "black";
			this.ctx.fillText("Click here to save",this.element.width/4, this.element.height/2);
			this.ctx.fillText("Click here to skip",3*this.element.width/4, this.element.height/2);

			// this.logSkeletonData("skeleton_subject0_trial" + this.trialNumber);
			// this.trialNumber++;
		}
	},

	drawSkeleton: function(date){
		for (const skeletonID in this.skeletons) {
			const skeleton = this.skeletons[skeletonID];

			// console.log('articulate_ui> Draw with state value', this.state.value);

			this.fontSize = 32;
			this.ctx.font = "32px Helvetica";
			this.ctx.textAlign="center";

			//status bar
			this.ctx.fillStyle = "white";

			this.ctx.fillStyle = skeleton.color;
			this.ctx.fillText("leftHand", skeleton.leftHand.x, skeleton.leftHand.y);

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
					this.fillCircle(x, y, size);
				} else if (shape === "square") {
					this.ctx.rect(x, y, size, size);
					this.ctx.fill();
					this.ctx.stroke();
				}
			}
		}
	},


	fillSkeletonBuffer: function(){
		// fill the skeleton buffer
		count = 0;
		this.rawSkeletonBuffer += Date.now() +"," + this.trialStates[this.currentState]+",";
		for (const bodyPartName in this.mostRecentSkeleton) {
			if(bodyPartName != "color" && bodyPartName != "lastUpdate"){
				const bodyPart = this.mostRecentSkeleton[bodyPartName];
				if( count == 0 ){ // first line body part
					this.rawSkeletonBuffer += bodyPart.kinectX + "," + bodyPart.kinectY + "," + bodyPart.z;
				}
				else { // remaining body parts, start with a comma - fencepost
					this.rawSkeletonBuffer += "," + bodyPart.kinectX + "," + bodyPart.kinectY + "," + bodyPart.z;
				}
				count++;
			}
		}
		this.rawSkeletonBuffer += "," + this.ball.x + "," + this.ball.y;
		this.rawSkeletonBuffer += "\n"; //end with a new line

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

	handlePointerPress: function (position, date) {
		// if (position.x < 100 && position.y > this.element.height - 50) {
		// 	if (this.trialRunning) { // end trial manually
		// 		this.endTrial();
		// 	} else { // start trial
		// 		this.beginTrial();
		// 	}
		// }

		// if( this.trialStates[this.currentState] == "pause" ){
		// 	this.currentState = this.currentState +1;
		// }
		// if( this.tr)
		if( this.trialStates[this.currentState] == "pause"){
			//start
			this.currentState++;
			this.timeSinceLastState = Date.now(); //start series
		}
		//if( this.t)
		if( this.trialStates[this.currentState] == "saveornot"){

			if(position.x < this.element.width/2){
				this.logSkeletonData("skeleton_subject0_trial" + this.trialNumber);
				this.trialNumber++;
				this.saveOrNotStatus = "saved! "
			}
			else {
				this.saveOrNotStatus = "not saved. "
			}
			this.rawSkeletonBuffer = ""; //clear it

			this.generateRandomPosition();
			// this.ballStartPosition = {"x": Math.random()*this.element.width, "y": Math.random()*this.element.height};
			// this.ballEndPosition = { "x": Math.random()*this.element.width, "y": Math.random()*this.element.height}
			this.currentState++;
			if(this.currentState == this.trialStates.length)
				this.currentState = 0;
		}

		// this.currentState++;
		// if(this.currentState == this.trialStates.length)
		// 	this.currentState = 0;
	},

	generateRandomPosition(){
		this.ballStartPosition = {"x": Math.random()*this.element.width*.95+this.element.width*.05, "y": Math.random()*this.element.height*.95+this.element.height*.05};

		distanceToRight = this.element.width - this.ballStartPosition.x;
		distanceToBottom = this.element.height - this.ballStartPosition.y;

		maxDistanceX = this.ballStartPosition.x*.95;
		signX = -1;
		if( distanceToRight > this.ballStartPosition.x ){
			maxDistanceX = distanceToRight*.95;
			signX = 1;
		}
		distanceX = Math.random()*maxDistanceX*.80+maxDistanceX*.2;

		maxDistanceY = this.ballStartPosition.y*.95;
		signY = -1;
		if( distanceToBottom > this.ballStartPosition.y ){
			maxDistanceY = distanceToBottom*.95;
			signY = 1;
		}
		distanceY = Math.random()*maxDistanceY*.8+maxDistanceY*.2;

		//Math.random()*this.element.width*.95+this.element.width*.05
		this.ballEndPosition = { "x": signX*distanceX+this.ballStartPosition.x, "y": signY*distanceY+this.ballStartPosition.y}

		console.log(this.ballStartPosition);
		console.log(this.ballEndPosition);
	},

	generateRandomTimings(){
		this.trialTimes[1] = 5 + Math.random()*5; //free
		this.trialTimes[2] = 2 + Math.random()*2; //init
		this.trialTimes[3] = 5 + Math.random()*10; //move
		this.trialTimes[4] = 2 + Math.random()*2; //stop

	},

	//------------------------------------------//
	//--------------EVENT FUNCTIONS-------------//
	//------------------------------------------//
	event: function(eventType, position, user_id, data, date) {
		const skeletonColors = ["red", "blue", "green", "orange", "pink"];

		if (eventType == "pointerPress"){
			this.handlePointerPress(position, date);
			this.refresh(date);
		}
		else if ( eventType === "kinectInput"){
			// if (this.trialRunning && Date.now() - 10000 > this.currentTrialStartTime) {
			// 	// this.endTrial();
			// }

			const skeletonID = data["skeletonID"];

			// ignore "phantom" skeletons (fixes BUG)
			if (skeletonID === 0 || skeletonID === 1) return;

			// add a new skeleton and give it a color
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

			for (const bodyPartID in data) {
				const bodyPart = data[bodyPartID];

				if (bodyParts[bodyPartID]) {
					const bodyPartName = bodyParts[bodyPartID].partName;
					this.skeletons[skeletonID][bodyPartName] = {};
					this.skeletons[skeletonID][bodyPartName].x = this.element.width/2.0+bodyPart.x*this.element.width;
					this.skeletons[skeletonID][bodyPartName].y = this.element.height/2.0-bodyPart.y*this.element.height;
					this.skeletons[skeletonID][bodyPartName].kinectX = bodyPart.x;
					this.skeletons[skeletonID][bodyPartName].kinectY = bodyPart.y;
					this.skeletons[skeletonID][bodyPartName].z = bodyPart.z;
					this.skeletons[skeletonID][bodyPartName].shape = bodyParts[bodyPartID].shape;
					this.skeletons[skeletonID][bodyPartName].baseSize = bodyParts[bodyPartID].baseSize;
				}
			}

			this.skeletons[skeletonID].lastUpdate = date.getTime();
			this.mostRecentSkeleton = this.skeletons[skeletonID];

			this.refresh(date);
		}
		else if (eventType === "grammarInput") {
			// // what to do if grammar recognized
			// const phrase = data.phrase;
			// if (data.confidence < 0.5) return;
			//
			// const {x, y} = this.mostRecentSkeleton.leftFingerTip;
			// const {upperLeft, lowerLeft, upperRight, lowerRight} = this.calibrations;
			//
			// if (!this.trialRunning && phrase === "start") {
			// 	// this.beginTrial();
			// } else if (this.trialRunning && phrase === "stop") {
			// 	// this.endTrial();
			// } else if (phrase === "calibrate" && upperLeft && lowerLeft && upperRight && lowerRight) {
			// 	this.calibrations.calibrated = true;
			// 	this.calibrations.xMin = (upperLeft.x + lowerLeft.x) / 2;
			// 	this.calibrations.xMax = (upperRight.x + lowerRight.x) / 2;
			// 	this.calibrations.yMin = (upperLeft.y + upperRight.y) / 2;
			// 	this.calibrations.yMax = (lowerLeft.y + lowerRight.y) / 2;
			// } else if (phrase === "upper left") {
			// 	this.calibrations.upperLeft = {};
			// 	this.calibrations.upperLeft.x = x;
			// 	this.calibrations.upperLeft.y = y;
			// } else if (phrase === "lower left") {
			// 	this.calibrations.lowerLeft = {};
			// 	this.calibrations.lowerLeft.x = x;
			// 	this.calibrations.lowerLeft.y = y;
			// } else if (phrase === "upper right") {
			// 	this.calibrations.upperRight = {};
			// 	this.calibrations.upperRight.x = x;
			// 	this.calibrations.upperRight.y = y;
			// } else if (phrase === "lower right") {
			// 	this.calibrations.lowerRight = {};
			// 	this.calibrations.lowerRight.x = x;
			// 	this.calibrations.lowerRight.y = y;
			// }
		}
		else if (eventType === "dictationInput") {
			// const phrase = data.phrase;
			//
			// const minutes = date.getMinutes();
			// const minutesFormatted = minutes < 10 ? "0" + minutes : "" + minutes;
			//
			// const seconds = date.getSeconds();
			// const secondsFormatted = seconds < 10 ? "0" + seconds : "" + seconds;
			//
			// this.textToDraw = phrase;
			// this.speechEvents.push({
			// 	"phrase": phrase,
			// 	"time": date.getHours() + ":" + minutesFormatted + ":" + secondsFormatted
			// });
			//
			// this.refresh(date);
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

	//this is how we can print data to a file
	logCalibratedData: function(filename){
		console.log("logging data to file: " + filename);
		this.calibratedBuffer = "fingerX, fingerY, ballX, ballY, fingerIsPointingAtBall\n" + this.calibratedBuffer;
		dataToSave = this.calibratedBuffer;
		this.calibratedBuffer = "";
		this.saveFile("", filename, "csv", dataToSave); //JSON.stringify(this.state, null, "\t"));
	},

	//this is how we can print data to a file
	logSkeletonData: function(filename){
		console.log("logging data to file: " + filename);

		header = "timestamp,classification,";
		for (const bodyPartName in this.mostRecentSkeleton) {
			if( bodyPartName != "color" && bodyPartName!= "lastUpdate")
				header += bodyPartName +".x," + bodyPartName+".y,"+bodyPartName+".z,";
		}
		header += "ballX,ballY";
		header+= "\n";

		this.rawSkeletonBuffer = header + this.rawSkeletonBuffer;
		dataToSave = this.rawSkeletonBuffer;
		this.rawSkeletonBuffer = "";
		this.saveFile("", filename, "csv", dataToSave); //JSON.stringify(this.state, null, "\t"));
	},

});
