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
		"baseSize": 30
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
// var wsio;
// wsio = new WebsocketIO();
//
// wsio.open(function() {
//     console.log("Websocket opened");
//
//     setupListeners();
//
//     var clientDescription = {
//       clientType: "kinectUI",
//       requests: {
//         config: false,
//         version: false,
//         time: false,
//         console: false
//       }
//       // },
//       // browser: __SAGE2__.browser
//     };
//     wsio.emit('addClient', clientDescription);
//   });
//
// // socket close event (i.e. server crashed)
//   wsio.on('close', function(evt) {
//     // show a popup for a long time
//     showMessage("Server offline", 2147483647);
//     // try to reload every few seconds
//     var refresh = setInterval(function() {
//       reloadIfServerRunning(function() {
//         clearInterval(refresh);
//       });
//     }, 2000);
//   });
//
// 	function init(){
// 	  console.log("init");
// 	}
//
// 	function setupListeners() {
// 	  wsio.on('initialize', function(data){
// 	    //interactor.setInteractionId(data.UID);
//   });
//
//   // Open a popup on message sent from server
//   wsio.on('errorMessage', showMessage);
//
//     // Server sends the SAGE2 version
//   wsio.on('setupSAGE2Version', function(data) {
//     sage2Version = data;
//     console.log('SAGE2: version', data.base, data.branch, data.commit, data.date);
//   });
// }
// function showMessage(message, delay) {
//   var aMessage = webix.alert({
//     type:  "alert-error",
//     title: "SAGE2 Error",
//     ok:    "OK",
//     text:  message
//   });
//   setTimeout(function() {
//     webix.modalbox.hide(aMessage);
//   }, delay ? delay : 2000);
// }
//kinect App
var machineLearning = SAGE2_App.extend( {
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
		this.maxFPS = 100.0;
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;

		this.ctx = this.element.getContext('2d');

		this.textToDraw = "waiting for kinect input... ";

		this.skeletons = {};
		this.speechEvents = [];

		var date = new Date();
		this.calibratedBuffer = ""; // buffer for printing data to a file
		this.rawSkeletonBuffer = "";
		this.trialRunning = false;
		this.trialNumber = 0;

		this.regularTrialMode = true;
		this.recognitionStatus = 'false';
		// rotation matrix math:
		// measured angle between kinect and screen = 63 degrees
		// rotated -27 degrees so kinect is perpendicular to screen on x-axis
		// [1.0 0 0 0
		//	0 cos-27 -sin-27 0
		//	0 sin-27 cos-27 0
		//	0 0 0 1.0]
		this.physicalSpace = {
			"minX": -2.0, // meters
			"maxX": 2.0, // meters
			"minY": -0.92, // meters
			"maxY": 0.92, // meters
			"heightOfKinect": 2.04, // meters
			"kinectToCenterOfScreenVertical":1.0,// 0.92, // meters
			"kinectToCenterOfScreenHorizontal": 0.06, // meters
			"lengthFromDisplayToKinectGroundIntersect": 4.00, // meters
			"angleFromKinectToDisplay": 63, // degrees
			"rotationMatrix": [
				1.0, 0.0, 0.0, 0.0,
				0.0, 0.891, 0.454, 0.0,
				0.0, -0.454, 0.891, 0.0,
				0.0, 0.0, 0.0, 1.0
			]
		};

		// Math.seed(date);

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
		if (diameter >= 0.0) {
			this.ctx.beginPath();
			this.ctx.arc(x, y, diameter, 0, 2*Math.PI);
			this.ctx.fill();
			this.ctx.stroke();
		}
	},
	startGestureRecognition: function(data, date){
		this.recognitionStatus = data;
		console.log("in machinesLearning App! "+this.recognitionStatus);
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

		this.drawStatusBar();

		// if ball is not moving, finger is pointing at ball, and it has been 5 seconds since last "trial"
		// begin new trial
		if (this.ball.color != "green" && fingerIsPointingAtBall && Date.now() - 5000 > this.ball.stopMoveTime) {
			this.ball.color = "yellow";
			var timeoutFunc = function() {
				this.ball.color = "green";
				this.ball.startMoveTime = Date.now();
			};
			setTimeout(timeoutFunc.bind(this), 2000);
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
			const skeleton = this.mostRecentSkeleton;
			for (const bodyPartName in this.mostRecentSkeleton) {
				const bodyPart = skeleton[bodyPartName];
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

	drawStatusBar: function () {
		this.ctx.fillStyle = "white";
		this.ctx.fillText( "Skeletons tracked: " + _.size(this.skeletons), this.element.width/2.0, 32);
	},

	// checkValidArmLength: function () {
	// 	const leftShoulder = this.mostRecentSkeleton.leftShoulder;
	// 	const leftHand = this.mostRecentSkeleton.leftHand;
	//
	// 	if (leftHand.z + 0.15 < leftShoulder.z) {
	// 		return true;
	// 	}
	// 	else {
	// 		return false;
	// 	}
	// },
	//
	// drawBoundingBox: function () {
	// 	return;
	// 	if (!this.mostRecentSkeleton) return;
	// 	const leftShoulder = this.mostRecentSkeleton.leftShoulder;
	// 	const leftHand = this.mostRecentSkeleton.leftHand;
	//
	// 	// if arm is not pointing toward screen, do not update arm length
	// 	if (this.checkValidArmLength()) {
	// 		const newArmLength = Math.sqrt(
	// 			Math.pow((leftHand.x - leftShoulder.x), 2) + Math.pow((leftHand.y - leftShoulder.y), 2)
	// 		);
	//
	// 		if (!this.boundingBox.armLength || newArmLength > this.boundingBox.armLength) {
	// 			this.boundingBox.armLength = newArmLength;
	// 		}
	// 	}
	//
	// 	const armLength = this.boundingBox.armLength;
	//
	// 	// left shoulder is center of bounding box with "radius" of arm length
	// 	this.boundingBox.centerX = leftShoulder.x
	// 	this.boundingBox.centerY = leftShoulder.y
	//
	// 	this.ctx.fillStyle = "white";
	// 	this.fillCircle(leftShoulder.x, leftShoulder.y, 10);
	//
	// 	const {centerX, centerY} = this.boundingBox;
	// 	this.ctx.fillStyle = "white";
	// 	this.ctx.rect(centerX - armLength, centerY - armLength, armLength * 2, armLength * 2);
	// 	this.ctx.fill();
	// 	this.ctx.stroke();
	// },
drawSkeletonLines: function(){
	for (const skeletonID in this.skeletons) {
		const skeleton = this.skeletons[skeletonID];

		this.ctx.strokeStyle = "magenta";
		this.ctx.lineWidth = 3;
		//head to shoulderCenter
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.head.x,  this.element.height - skeleton.head.y);
		this.ctx.lineTo(skeleton.shoulderCenter.x, this.element.height - skeleton.shoulderCenter.y);
		this.ctx.stroke();

		//shoulderCenter to spine
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.shoulderCenter.x,  this.element.height - skeleton.shoulderCenter.y);
		this.ctx.lineTo(skeleton.spine.x, this.element.height - skeleton.spine.y);
		this.ctx.stroke();

		//-------------------- Left side -----------------------------------------------

		//shoulderCenter to leftShoulder
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.shoulderCenter.x,  this.element.height - skeleton.shoulderCenter.y);
		this.ctx.lineTo(skeleton.leftShoulder.x, this.element.height - skeleton.leftShoulder.y);
		this.ctx.stroke();

		//leftShoulder to leftElbow
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.leftShoulder.x,  this.element.height - skeleton.leftShoulder.y);
		this.ctx.lineTo(skeleton.leftElbow.x, this.element.height - skeleton.leftElbow.y);
		this.ctx.stroke();

		//leftElbow to leftWrist
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.leftElbow.x,  this.element.height - skeleton.leftElbow.y);
		this.ctx.lineTo(skeleton.leftWrist.x, this.element.height - skeleton.leftWrist.y);
		this.ctx.stroke();

		//leftWrist to leftHand
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.leftWrist.x,  this.element.height - skeleton.leftWrist.y);
		this.ctx.lineTo(skeleton.leftHand.x, this.element.height - skeleton.leftHand.y);
		this.ctx.stroke();

		//leftHand to leftFingerTip
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.leftHand.x,  this.element.height - skeleton.leftHand.y);
		this.ctx.lineTo(skeleton.leftFingerTip.x, this.element.height - skeleton.leftFingerTip.y);
		this.ctx.stroke();

		//leftWrist to leftThumb
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.leftWrist.x,  this.element.height - skeleton.leftWrist.y);
		this.ctx.lineTo(skeleton.leftThumb.x, this.element.height - skeleton.leftThumb.y);
		this.ctx.stroke();

		//spine to leftHip
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.spine.x,  this.element.height - skeleton.spine.y);
		this.ctx.lineTo(skeleton.leftHip.x, this.element.height - skeleton.leftHip.y);
		this.ctx.stroke();

		//leftHip to leftKnee
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.leftHip.x,  this.element.height - skeleton.leftHip.y);
		this.ctx.lineTo(skeleton.leftKnee.x, this.element.height - skeleton.leftKnee.y);
		this.ctx.stroke();

		//leftKnee to leftAnkle
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.leftKnee.x,  this.element.height - skeleton.leftKnee.y);
		this.ctx.lineTo(skeleton.leftAnkle.x, this.element.height - skeleton.leftAnkle.y);
		this.ctx.stroke();

		//leftAnkle to leftFoot
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.leftAnkle.x,  this.element.height - skeleton.leftAnkle.y);
		this.ctx.lineTo(skeleton.leftFoot.x, this.element.height - skeleton.leftFoot.y);
		this.ctx.stroke();


		//-------------------- Right side -----------------------------------------------

		//shoulderCenter to rightShoulder
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.shoulderCenter.x,  this.element.height - skeleton.shoulderCenter.y);
		this.ctx.lineTo(skeleton.rightShoulder.x, this.element.height - skeleton.rightShoulder.y);
		this.ctx.stroke();

		//rightShoulder to rightElbow
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.rightShoulder.x,  this.element.height - skeleton.rightShoulder.y);
		this.ctx.lineTo(skeleton.rightElbow.x, this.element.height - skeleton.rightElbow.y);
		this.ctx.stroke();

		//rightElbow to rightWrist
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.rightElbow.x,  this.element.height - skeleton.rightElbow.y);
		this.ctx.lineTo(skeleton.rightWrist.x, this.element.height - skeleton.rightWrist.y);
		this.ctx.stroke();

		//rightWrist to rightHand
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.rightWrist.x,  this.element.height - skeleton.rightWrist.y);
		this.ctx.lineTo(skeleton.rightHand.x, this.element.height - skeleton.rightHand.y);
		this.ctx.stroke();

		//rightHand to rightFingerTip
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.rightHand.x,  this.element.height - skeleton.rightHand.y);
		this.ctx.lineTo(skeleton.rightFingerTip.x, this.element.height - skeleton.rightFingerTip.y);
		this.ctx.stroke();

		//rightWrist to rightThumb
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.rightWrist.x,  this.element.height - skeleton.rightWrist.y);
		this.ctx.lineTo(skeleton.rightThumb.x, this.element.height - skeleton.rightThumb.y);
		this.ctx.stroke();

		//spine to rightHip
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.spine.x,  this.element.height - skeleton.spine.y);
		this.ctx.lineTo(skeleton.rightHip.x, this.element.height - skeleton.rightHip.y);
		this.ctx.stroke();

		//rightHip to rightKnee
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.rightHip.x,  this.element.height - skeleton.rightHip.y);
		this.ctx.lineTo(skeleton.rightKnee.x, this.element.height - skeleton.rightKnee.y);
		this.ctx.stroke();

		//rightKnee to rightAnkle
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.rightKnee.x,  this.element.height - skeleton.rightKnee.y);
		this.ctx.lineTo(skeleton.rightAnkle.x, this.element.height - skeleton.rightAnkle.y);
		this.ctx.stroke();

		//rightAnkle to rightFoot
		this.ctx.beginPath();
		this.ctx.moveTo(skeleton.rightAnkle.x,  this.element.height - skeleton.rightAnkle.y);
		this.ctx.lineTo(skeleton.rightFoot.x, this.element.height - skeleton.rightFoot.y);
		this.ctx.stroke();


	}
},
	drawRawBodyParts: function () {
		// drawing the ball
	  // this.ctx.fillStyle = this.ball.color;
	  // this.fillCircle(this.ball.x, this.ball.y, this.ball.radius * 2);

		//this.drawCalibrationGuides();
		//this.drawBoundingBox();

		for (const skeletonID in this.skeletons) {
			const skeleton = this.skeletons[skeletonID];

			this.fontSize = 32;
			this.ctx.font = "48px Helvetica";
			this.ctx.textAlign="center";

			//status bar
			this.drawStatusBar();
			this.drawSkeletonLines();
			this.ctx.fillStyle = skeleton.color;
			this.ctx.fillText("Head", skeleton.head.x,  this.element.height - skeleton.head.y);

			for (const bodyPartName in skeleton) {
				const bodyPart = skeleton[bodyPartName];
				const shape = bodyPart.shape;
				const x = bodyPart.x;//bodyPart.kinectX;
				const y = this.element.height - bodyPart.y;//To flip the skeleton upside
				const z = bodyPart.z;
				const size = bodyPart.baseSize / z;
				const skeletonColor = bodyPart.colorOverride ? bodyPart.colorOverride : skeleton.color;
				this.ctx.fillStyle = skeletonColor; //bodyPart.colorOverride ? bodyPart.colorOverride : skeleton.color;
				this.ctx.strokeStyle = skeletonColor;
				// var wristX = 0;
				// var wristY = 0;
				// var elbowX = 0;
				// var elbowY = 0;
				// var line = false;
				//
				// if(bodyPart.partName === "head")
				// //if (bodyPartName === "OMICRON_SKEL_HEAD")
				// {
				// 	 wristX = x;
				// 	 wristY = y;
				// 	 	console.log("HEAD");
				// }
				// else if(bodyPart.partName === "spine")
				// //else if (bodyPartName === "OMICRON_SKEL_SPINE")
				// {
				// 	 elbowX = x;
				// 	 elbowY = y;
				//   line = true;
				// 	 console.log("ELBOW");
				// }
				//
				// if(line)
				// {
				// 	this.ctx.fillStyle = "Lime";
				// 	this.ctx.lineWidth = 8;
				// 	this.ctx.beginPath();
				// 	this.ctx.moveTo(skeleton.head.x, skeleton.head.y);
				// 	this.ctx.lineTo(skeleton.spine.x, skeleton.spine.y);
				// 	this.ctx.stroke();
				// 	console.log("LINE");
				// }

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
			// if (this.calibrations.calibrated) {
			// 	this.drawWithCalibrations();
			// }
			// else {
			this.drawRawBodyParts();
			// }
		},

	//----------------------------------------//
	//---------- DRAWING FUNCTIONS ----------//
	//---------------------------------------//
	draw: function(date) {

		this.calibratedTrialModeDraw(date);
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

	handlePointerPress: function (position) {
		// if (position.x < 100 && position.y > this.element.height - 50) {
		// 	if (this.trialRunning) { // end trial manually
		// 		this.endTrial();
		// 	} else { // start trial
		// 		this.beginTrial();
		// 	}
		// }
	},

	multiplyMatrixAndPoint: function (matrix, point) {
	  //Give a simple variable name to each part of the matrix, a column and row number
	  var c0r0 = matrix[ 0], c1r0 = matrix[ 1], c2r0 = matrix[ 2], c3r0 = matrix[ 3];
	  var c0r1 = matrix[ 4], c1r1 = matrix[ 5], c2r1 = matrix[ 6], c3r1 = matrix[ 7];
	  var c0r2 = matrix[ 8], c1r2 = matrix[ 9], c2r2 = matrix[10], c3r2 = matrix[11];
	  var c0r3 = matrix[12], c1r3 = matrix[13], c2r3 = matrix[14], c3r3 = matrix[15];

	  //Now set some simple names for the point
	  var x = point[0];
	  var y = point[1];
	  var z = point[2];
	  var w = point[3];

	  //Multiply the point against each part of the 1st column, then add together
	  var resultX = (x * c0r0) + (y * c0r1) + (z * c0r2) + (w * c0r3);

	  //Multiply the point against each part of the 2nd column, then add together
	  var resultY = (x * c1r0) + (y * c1r1) + (z * c1r2) + (w * c1r3);

	  //Multiply the point against each part of the 3rd column, then add together
	  var resultZ = (x * c2r0) + (y * c2r1) + (z * c2r2) + (w * c2r3);

	  return [resultX, resultY, resultZ];
	},

	rotateJoint: function (joint) {
		const x = joint.kinectX;
		const y = joint.kinectY;
		const z = joint.z;

		const point = [x, y, z, 1.0];

		return this.multiplyMatrixAndPoint(this.physicalSpace.rotationMatrix, point);
	},

	// returns true if user is within 2 meter distance from kinect, false otherwise
	inProximity: function () {
		return this.mostRecentSkeleton.shoulderCenter.z <= 2.0;
	},

	inRange: function (x, y, minX, maxX, minY, maxY) {
		if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
			return true;
		}
		return false;
	},

	euclideanDistance: function (x1, y1, x2, y2) {
		return Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2));
	},

	vectorSubtraction: function (a, b) {
		return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
	},

	dotProduct:  function (a, b) {
		var n = 0, lim = Math.min(a.length,b.length);
		for (var i = 0; i < lim; i++) n += a[i] * b[i];
		return n;
	},

	angleOfArm: function () {
		const {rightShoulder, rightFingerTip, shoulderCenter} = this.mostRecentSkeleton;

		const rS = [rightShoulder.kinectX, rightShoulder.kinectY, rightShoulder.z];
		const rF = [rightFingerTip.kinectX, rightFingerTip.kinectY, rightFingerTip.z];
		const sC = [shoulderCenter.kinectX, shoulderCenter.kinectY, shoulderCenter.z];

		const v1 = this.vectorSubtraction(rS, rF);
		const v2 = this.vectorSubtraction(rS, sC);

		const dotProduct = this.dotProduct(v1, v2);
		return Math.acos(dotProduct);
	},

	// TODO:
	// only update arm length if the angle between shoulder and finger
	// is <60 degrees from origin point
	armLength: function (shoulder, fingerTip) {
		const currArmLength = this.euclideanDistance(shoulder.kinectX, shoulder.kinectY, fingerTip.kinectX, fingerTip.kinectY);

		const angleInRadians = this.angleOfArm();
		if (!this.maxArmLength || currArmLength > this.maxArmLength) {
			this.maxArmLength = currArmLength;
		}

		return this.maxArmLength;
	},

	recognizePoint: function () {

	 const {head, rightShoulder, rightFingerTip} = this.mostRecentSkeleton;

	 //Centering head and rightFingerTip to create a virtual screen in front of the display
	 const centroidHeadX = 0;
	 const centroidHeadY = 0;
	 const centroidRightFingerTipX = rightFingerTip.kinectX - head.kinectX;
	 const centroidRightFingerTipY = rightFingerTip.kinectY - head.kinectY;

   //Dimensions of the physical space
	 const spaceMinX = this.physicalSpace.minX;
	 const spaceMaxX = this.physicalSpace.maxX;
	 const spaceMinY = this.physicalSpace.minY;
	 const spaceMaxY = this.physicalSpace.maxY;

	 //Dimensions of virtual touch screen
	 const minX = -(((centroidHeadX - spaceMinX) * ( head.z - rightFingerTip.z )) / head.z);// + head.z) - spaceMaxX;
	 const maxX = -(((centroidHeadX - spaceMaxX) * ( head.z - rightFingerTip.z )) / head.z);// + head.z) - spaceMaxX;
	 const minY = -(((centroidHeadY - spaceMinY) * ( head.z - rightFingerTip.z )) / head.z);// + head.kinectY) - spaceMaxY;
	 const maxY = -(((centroidHeadY - spaceMaxY) * ( head.z - rightFingerTip.z )) / head.z);// + head.kinectY) - spaceMaxY;

	 if (this.inRange(centroidRightFingerTipX, -centroidRightFingerTipY, minX, maxX, minY, maxY)){

	 //Drawing the virtual screen just to figure things out
	//  this.ctx.strokeStyle = "rgba(240, 205, 50, 0.5)";
	//  this.ctx.fillStyle = "rgba(240, 205, 50, 0.5)";
	//  this.ctx.lineWidth = 3;
	//  this.ctx.beginPath();
	//  this.ctx.moveTo(this.map(minX, spaceMinX, spaceMaxX, 0, this.element.width), this.map(minY, spaceMinY, spaceMaxY, 0, this.element.height));
	//  this.ctx.lineTo(this.map(maxX, spaceMinX, spaceMaxX, 0, this.element.width), this.map(minY, spaceMinY, spaceMaxY, 0, this.element.height));
	//  this.ctx.lineTo(this.map(minX, spaceMinX, spaceMaxX, 0, this.element.width), this.map(maxY, spaceMinY, spaceMaxY, 0, this.element.height));
  //  this.ctx.moveTo(this.map(maxX, spaceMinX, spaceMaxX, 0, this.element.width), this.map(maxY, spaceMinY, spaceMaxY, 0, this.element.height));
	//  this.ctx.lineTo(this.map(minX, spaceMinX, spaceMaxX, 0, this.element.width), this.map(maxY, spaceMinY, spaceMaxY, 0, this.element.height));
	//  this.ctx.lineTo(this.map(maxX, spaceMinX, spaceMaxX, 0, this.element.width), this.map(minY, spaceMinY, spaceMaxY, 0, this.element.height));
	//  this.ctx.stroke();
	//  this.ctx.fill();

	 //Factors to map point from virtual screen to large display
	 const factorX = (spaceMaxX - spaceMinX) / (maxX - minX);
	 const factorY = (spaceMaxY - spaceMinY) / (maxY - minY);

	 //Mapping from virtual screen to large screen positions
	 const adjustedX = centroidRightFingerTipX * factorX;
	 const adjustedY = centroidRightFingerTipY * factorY;

	 //Retranslating point to relative position
	 const translatedX = adjustedX + head.kinectX;
	 const translatedY = adjustedY + head.kinectY;

	 //Mapping from physical coordinates to screen coordinates
	 const mappedX = this.map(translatedX, spaceMinX, spaceMaxX, 0, this.element.width);
	 const mappedY = this.map(-translatedY, spaceMinY, spaceMaxY, 0, this.element.height);

	 //const x = (head.z * (rightFingerTip.kinectX - head.kinectX))/(head.z - rightFingerTip.z) + head.kinectX;
	 //const y = (head.z * (rightFingerTip.kinectY - head.kinectY))/(head.z - rightFingerTip.z) + head.kinectY;

	 this.fillCircle(mappedX, mappedY, 20);

	 //if the server needs to capture pointing --> send pointing position
	 if(this.recognitionStatus == 'true'){
	   //sending the pointing position to the server
	   wsio.emit("pointingGesturePosition", {x: mappedX, y:mappedY});
	 }
 }
    //Old virtual screen by Rayan
		// const {rightShoulder, rightFingerTip} = this.mostRecentSkeleton;
		//
		// const rightArmLength = this.armLength(rightShoulder, rightFingerTip);
		//
		// const minX = rightShoulder.kinectX - rightArmLength;
		// //console.log("minX: "+minX);
		// const maxX = rightShoulder.kinectX + rightArmLength;
		// //console.log("maxX: "+maxX);
		// //console.log("fingX: "+rightFingerTip.kinectX);
		// const minY = rightShoulder.kinectY - rightArmLength;
		// const maxY = rightShoulder.kinectY + rightArmLength;
		//
		// if (this.inRange(rightFingerTip.kinectX, rightFingerTip.kinectY, minX, maxX, minY, maxY)) {
		// 	const mappedX = this.map(rightFingerTip.kinectX, minX, maxX, 0, this.element.width);
		// 	const mappedY = this.map(-rightFingerTip.kinectY, minY, maxY, 0, this.element.height);
		//
		// 	this.fillCircle(mappedX, mappedY, 20);
		// 	if(mappedX >= 2680 && mappedX <= 2720 && mappedY >= 980 && mappedY <= 1020)
		// 	{
		// 	console.log("pointx "+ mappedX);
		// 	//console.log("pointy "+mappedY);
		//	}
			//}
		//}
	},

	//------------------------------------------//
	//--------------EVENT FUNCTIONS-------------//
	//------------------------------------------//

	// rotate all joints for a skeleton and save rotated joints positions to state (this.skeletons)
	rotateAboutXAxis: function (skeletonID) {
		const skeleton = this.skeletons[skeletonID];

		for (const bodyPartID in skeleton) {
			const bodyPart = skeleton[bodyPartID];
			if (bodyPart.kinectX) { // check that this is in fact a body part
				const rotatedPoints = this.rotateJoint(bodyPart);
				if (this.skeletons[skeletonID][bodyPartID]) {
					this.skeletons[skeletonID][bodyPartID].kinectX = rotatedPoints[0];
					this.skeletons[skeletonID][bodyPartID].kinectY = rotatedPoints[1];
					this.skeletons[skeletonID][bodyPartID].z = rotatedPoints[2];
				}
			}
		}
	},

	translateJoints: function (skeletonID) {
		const skeleton = this.skeletons[skeletonID];

		for (const bodyPartID in skeleton) {
			const bodyPart = skeleton[bodyPartID];
			if (bodyPart.kinectX) { // check that this is in fact a body part
				if (this.skeletons[skeletonID][bodyPartID]) {
					this.skeletons[skeletonID][bodyPartID].kinectY = bodyPart.kinectY + this.physicalSpace.kinectToCenterOfScreenVertical;
					this.skeletons[skeletonID][bodyPartID].kinectX = bodyPart.kinectX - this.physicalSpace.kinectToCenterOfScreenHorizontal;
				}
			}
		}
	},

	physicalToScreen: function (x, y) {
		var xy_arr = [];

		xy_arr.push(this.map(x, this.physicalSpace.minX, this.physicalSpace.maxX, 0, this.element.width));
		xy_arr.push(this.map(y, this.physicalSpace.minY, this.physicalSpace.maxY, 0, this.element.height));

		return xy_arr;
	},

	mapPhysicalSpaceToScreenSpace: function (skeletonID) {
		const skeleton = this.skeletons[skeletonID];

		for (const bodyPartID in skeleton) {
			const bodyPart = skeleton[bodyPartID];
			if (bodyPart.kinectX) {
				if (this.skeletons[skeletonID][bodyPartID]) {
					const xy_screen_arr = this.physicalToScreen(bodyPart.kinectX, bodyPart.kinectY);
					this.skeletons[skeletonID][bodyPartID].x = xy_screen_arr[0];
					this.skeletons[skeletonID][bodyPartID].y = xy_screen_arr[1];
				}
			}
		}
	},

	event: function(eventType, position, user_id, data, date) {
		const skeletonColors = ["red", "blue", "green", "orange", "pink"];

		if (eventType == "pointerPress"){
			this.handlePointerPress(position);
		}
		else if ( eventType === "kinectInput"){
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
					this.skeletons[skeletonID][bodyPartName].kinectX = bodyPart.x;//**
					this.skeletons[skeletonID][bodyPartName].kinectY = bodyPart.y;//**
					this.skeletons[skeletonID][bodyPartName].z = bodyPart.z;//**
					this.skeletons[skeletonID][bodyPartName].shape = bodyParts[bodyPartID].shape;
					this.skeletons[skeletonID][bodyPartName].baseSize = bodyParts[bodyPartID].baseSize;
				}
			}

			// need to make (x,y)-origin the center of screen for all joints
			// rotate, then translate
			this.rotateAboutXAxis(skeletonID);
			this.translateJoints(skeletonID);

			// physical coords -> screen coords
			this.mapPhysicalSpaceToScreenSpace(skeletonID);
			//console.log(this.skeletons[skeletonID].head);

			this.skeletons[skeletonID].lastUpdate = date.getTime();
			this.mostRecentSkeleton = this.skeletons[skeletonID];
			//console.log(this.mostRecentSkeleton.head);

			if (this.inProximity()) {
				this.recognizePoint();
			}

			this.refresh(date);
		}
		else if (eventType === "grammarInput") {
			// what to do if grammar recognized
			const phrase = data.phrase;
			if (data.confidence < 0.5) return;

			const {x, y} = this.mostRecentSkeleton.leftFingerTip;
			const {upperLeft, lowerLeft, upperRight, lowerRight} = this.calibrations;

			if (!this.trialRunning && phrase === "start") {
				// this.beginTrial();
			} else if (this.trialRunning && phrase === "stop") {
				// this.endTrial();
			} else if (phrase === "calibrate" && upperLeft && lowerLeft && upperRight && lowerRight) {
				this.calibrations.calibrated = true;
				this.calibrations.xMin = (upperLeft.x + lowerLeft.x) / 2;
				this.calibrations.xMax = (upperRight.x + lowerRight.x) / 2;
				this.calibrations.yMin = (upperLeft.y + upperRight.y) / 2;
				this.calibrations.yMax = (lowerLeft.y + lowerRight.y) / 2;
			} else if (phrase === "upper left") {
				this.calibrations.upperLeft = {};
				this.calibrations.upperLeft.x = x;
				this.calibrations.upperLeft.y = y;
			} else if (phrase === "lower left") {
				this.calibrations.lowerLeft = {};
				this.calibrations.lowerLeft.x = x;
				this.calibrations.lowerLeft.y = y;
			} else if (phrase === "upper right") {
				this.calibrations.upperRight = {};
				this.calibrations.upperRight.x = x;
				this.calibrations.upperRight.y = y;
			} else if (phrase === "lower right") {
				this.calibrations.lowerRight = {};
				this.calibrations.lowerRight.x = x;
				this.calibrations.lowerRight.y = y;
			}
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
		//console.log("logging data to file: " + filename);
		this.calibratedBuffer = "fingerX, fingerY, ballX, ballY, fingerIsPointingAtBall\n" + this.calibratedBuffer;
		dataToSave = this.calibratedBuffer;
		this.calibratedBuffer = "";
		this.saveFile("", filename, "csv", dataToSave); //JSON.stringify(this.state, null, "\t"));
	},

	//this is how we can print data to a file
	logSkeletonData: function(filename){
		//console.log("logging data to file: " + filename);

		header = "";
		for (const bodyPartName in this.mostRecentSkeleton) {
			header += bodyPartName +".x," + bodyPartName+".y,"+bodyPartName+".z,";
		}
		header+= "\n";

		this.rawSkeletonBuffer = header + this.rawSkeletonBuffer;
		dataToSave = this.rawSkeletonBuffer;
		this.rawSkeletonBuffer = "";
		this.saveFile("", filename, "csv", dataToSave); //JSON.stringify(this.state, null, "\t"));
	},

});
