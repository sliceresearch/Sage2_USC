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

var GoTime = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous"; // "onfinish";
		this.time = null;
		this.dragging = null;
		this.position = null;
		this.lastScroll = null;

		this.enableControls = null;
		this.controls = null;
		this.pageValText = null;
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
		this.state.playhead   = 0;
		this.state.page = null;

		// may need a global handler for callbacks (i.e. scope pollution)
		GoTime_self = this;

		var my_div = null;
		var newDiv = null;
		function addElement () {
		  // create a new div element and give it some content
		  var newDiv = document.createElement("div");
		  var newContent = document.createTextNode("Hi there and greetings!");
		  newDiv.appendChild(newContent); //add the text node to the newly created div. 
		  // add the newly created element and its content into the DOM
		  document.getElementById(id).appendChild(newDiv);
		  // my_div = document.getElementById("org_div1");
		  // document.body.insertBefore(newDiv, my_div);
		}

		this.enableControls      = true;
		this.pageValText         = '';

	},

	load: function(state, date) {
		if (state) {
			this.state.playhead   = state.playhead;

			var _this = this;

			// UI stuff
			_this.controls.addButton({type:"rewind", action:function(appObj, date){
				appObj.state.page  = 1;
				appObj.setLabelText();
				appObj.refresh(date);
			}});
			_this.controls.addButton({type:"prev", action:function(appObj, date){
				if(appObj.state.page <= 1) return;
				appObj.state.page  = appObj.state.page - 1;
				appObj.setLabelText();
				appObj.refresh(date);
			}});
	
			_this.controls.addSlider({begin:1,end:100,increments:1,appObj:_this, property:"state.page", action:function(appObj, date){
				appObj.setLabelText();
				appObj.refresh(date);
			}});
			var labelWidth = ("" + _this.pdfDoc.numPages).length * 2 + 3; // 3 for the spaces and the '/'

			_this.controls.addLabel({textLength:labelWidth,appObj:_this, property:"pageValText"});

			_this.controls.addButton({type:"next", action:function(appObj, date){
				if (appObj.state.page  >= appObj.pdfDoc.numPages) return;
				appObj.state.page = appObj.state.page + 1;
				appObj.setLabelText();
				appObj.refresh(date);
			}});
			_this.controls.addButton({type:"fastforward", action:function(appObj, date){
				appObj.state.page  = appObj.pdfDoc.numPages;
				appObj.setLabelText();
				appObj.refresh(date);
			}});
			
			_this.setLabelText();
		}
	},

	draw: function(date) {
		if(this.loaded === false) return;

		var _this = this;

	},

	resize: function(date) {
		this.refresh(date);
	},

	forward: function () {
		this.state.playhead++;
	},

	backward: function () {
		this.state.playhead--;
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
				this.state.playhead++;
				this.lastScroll = date;
			}
			else if (amount <= -3 && (diff>300)) {
				this.state.playhead--;
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
				if(this.state.page <= 1) return;
				this.state.page = this.state.page - 1;
				this.setLabelText();
				this.refresh(date);
			}
			if(data.code === 39 && data.state === "up"){ // Right Arrow
				if(this.state.page >= this.pdfDoc.numPages) return;
				this.state.page = this.state.page + 1;
				this.setLabelText();
				this.refresh(date);
			}
		}


		console.log("playhead: " + this.state.playhead);
		this.refresh(date);
	},

	setLabelText: function(){
		this.pageValText = this.state.page + ' / ' + this.pdfDoc.numPages;
	}

});
