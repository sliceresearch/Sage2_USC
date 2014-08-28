// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014
//
// GoTime Plugin written by Todd Margolis

var GoTimeList = {};

var GoTime = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous"; // "onfinish";
		this.time = null;
		this.dragging = null;
		this.position = null;
		this.lastScroll = null;

		this.enableControls = true;
		this.controls = null;
		this.frameValText = null;
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

		// application specific 'init'
		this.element.id = id;
		console.log(id);

		this.time = date;
		this.dragging = false;
		this.position = {x:0,y:0};
		this.lastScroll = date;

		// building up the state object
		this.state.frame = 1;

		// may need a global handler for callbacks (i.e. scope pollution)
		GoTimeList[id] = this;

		// Build UI for GoTime app
		// var my_div = null;
		// var newDiv = null;
		// function addElement () {
		//   // create a new div element and give it some content
		//   var newDiv = document.createElement("div");
		//   var newContent = document.createTextNode("Hi there and greetings!");
		//   newDiv.appendChild(newContent); //add the text node to the newly created div. 
		//   // add the newly created element and its content into the DOM
		//   document.getElementById(id).appendChild(newDiv);
		//   // my_div = document.getElementById("org_div1");
		//   // document.body.insertBefore(newDiv, my_div);
		// }
		// addElement();

		this.frameValText         = '';

		// websocket to server for file library access
		// Note: using a different socket to prevent locking up other app animations
		hostname = window.location.hostname;
		port = window.location.port;
		if(window.location.protocol == "http:" && port == "") port = "80";
		if(window.location.protocol == "https:" && port == "") port = "443";
		
		this.wsio = new websocketIO(window.location.protocol, hostname, parseInt(port));


		this.wsio.open(function() {
			// console.log("open websocket");
			var clientDescription = {
				clientType: "GoTime",
				clientID: id,
				sendsPointerData: false,
				sendsMediaStreamFrames: false,
				requestsServerFiles: false,
				sendsWebContentToLoad: false,
				launchesWebBrowser: false,
				sendsVideoSynchonization: false,
				sharesContentWithRemoteServer: false,
				receivesDisplayConfiguration: true,
				receivesClockTime: false,
				requiresFullApps: false,
				requiresAppPositionSizeTypeOnly: true,
				receivesMediaStreamFrames: false,
				receivesWindowModification: false,
				receivesPointerData: false,
				receivesInputEvents: false,
				receivesRemoteServerInfo: false,
				removeMediabrowserID: false,
				receivesGoTime: true
			};
			GoTimeList[id].wsio.emit('addClient', clientDescription);
		});
		
		this.wsio.on('initialize', function(uniqueID, date, startTime) {
			GoTimeList[id].wsio.emit('requestCurrentFrame');
		});
		
		this.wsio.on('updateFrame', function(frame) {
			GoTimeList[id].updateFrame(frame);
		});

	},

	updateFrame: function(ff) {
		this.state.frame = ff.currentFrame;
		this.state.numFrames = ff.numFrames;
		console.log("frame", this.state.frame);
	},

	load: function(state, date) {
		// if (state) {
			// this.state.frame   = state.frame;

			var _this = this;
			_this.numFrames = 25;

			// UI stuff
			_this.controls.addButton({type:"rewind", action:function(appObj, date){
				appObj.state.frame = 1;
				appObj.setLabelText();
				appObj.refresh(date);
			}});
			_this.controls.addButton({type:"prev", action:function(appObj, date){
				if(appObj.state.frame <= 1) return;
				appObj.state.frame--;
				appObj.setLabelText();
				appObj.refresh(date);
				appObj.wsio.emit('changeFrame', {frame: appObj.state.frame});
			}});
	
			_this.controls.addSlider({begin:1,end:_this.numFrames,increments:1,appObj:_this, property:"state.frame", action:function(appObj, date){
				appObj.setLabelText();
				appObj.refresh(date);
			}});
			var labelWidth = ("" + _this.numFrames).length * 2 + 3; // 3 for the spaces and the '/'

			_this.controls.addLabel({textLength:labelWidth,appObj:_this, property:"frameValText"});

			_this.controls.addButton({type:"next", action:function(appObj, date){
				if (appObj.state.frame  >= appObj.numFrames) return;
				appObj.state.frame++;
				appObj.setLabelText();
				appObj.refresh(date);
				appObj.wsio.emit('changeFrame', {frame: appObj.state.frame});
			}});
			_this.controls.addButton({type:"fastforward", action:function(appObj, date){
				appObj.state.frame = appObj.numFrames;
				appObj.setLabelText();
				appObj.refresh(date);
			}});
			
			_this.setLabelText();
		// } else {
		// // load new state of same document
		// 	this.state.frame = state.frame;
		// 	this.refresh(date);
		// }
	},

	draw: function(date) {
		if(this.loaded === false) return;

		var _this = this;

	},

	resize: function(date) {
		this.refresh(date);
	},

	forward: function () {
		this.state.frame++;
	},

	backward: function () {
		this.state.frame--;
	},

	event: function(eventType, user_id, itemX, itemY, data, date) {
		console.log("div event", eventType, user_id, itemX, itemY, data, date);

		if (eventType === "pointerPress" && (data.button === "left") ) {
			this.dragging = true;
			this.position.x = itemX;
			this.position.y = itemY;
		}
		if (eventType === "pointerMove" && this.dragging ) {
			this.map.panBy(this.position.x-itemX, this.position.y-itemY);
			this.updateCenter();
			this.position.x = itemX;
			this.position.y = itemY;
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
			this.dragging = false;
			this.position.x = itemX;
			this.position.y = itemY;
		}

		// Scroll events for zoom
		if (eventType === "pointerScroll") {
			var amount = data.wheelDelta;
			var diff = date - this.lastScroll;
			if (amount >= 3 && (diff>300)) {
				this.state.frame++;
				this.lastScroll = date;
			}
			else if (amount <= -3 && (diff>300)) {
				this.state.frame--;
				this.lastScroll = date;
			}
		}

		else if (eventType == "specialKey" && data.code == 16 && data.state == "down") {
			// shift down
			// zoom in
		}
		else if (eventType == "specialKey" && data.code == 17 && data.state == "down") {
			// control down
			// zoom out
		}

		// else if (eventType == "specialKey" && data.code == 37 && data.state == "down") {
		// 	// left
		// 	this.backward();
		// }
		// else if (eventType == "specialKey" && data.code == 38 && data.state == "down") {
		// 	// up
		// 	this.forward();
		// }
		// else if (eventType == "specialKey" && data.code == 39 && data.state == "down") {
		// 	// right
		// 	this.forward();
		// }
		// else if (eventType == "specialKey" && data.code == 40 && data.state == "down") {
		// 	// down
		// 	this.backward();
		// }

		if(eventType === "specialKey"){
			if(data.code === 37 && data.state === "up"){ // Left Arrow
				if(this.state.frame <= 1) return;
				this.state.frame--;
				this.setLabelText();
				this.refresh(date);
			}
			if(data.code === 39 && data.state === "up"){ // Right Arrow
				if(this.state.frame >= this.numFrames) return;
				this.state.frame++;
				this.setLabelText();
				this.refresh(date);
			}
		}


		console.log("frame: " + this.state.frame);
		this.refresh(date);
	},

	setLabelText: function(){
		this.frameValText = this.state.frame + ' / ' + this.numFrames;
	}

});
