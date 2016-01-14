//
// SAGE2 application: exampleParent
// by: Jillian Aurisano <jillian.aurisano@gmail.com>
//
// Copyright (c) 2015
//

var exampleParent = SAGE2_App.extend( {
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("canvas", data);
		// Set the background to black
		this.element.style.backgroundColor = 'black';

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
		this.minDim = Math.min(this.element.width, this.element.height);


		//Parent monitoring children:
		// for now, app decides how to store and handle children
		// if parent wanted to just launch apps and do nothing else, 
		// all it needs is 'launchChild' (see below)
		this.childList = [];

		//here is where the child is created
		this.launchChild(); 
	},

	load: function(date) {
		console.log('exampleParent> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
		console.log('exampleParent> Draw with state value', this.state.value);

		// I'm drawing things to make it evident that this is the parent app
		this.ctx.clearRect(0, 0, this.element.width, this.element.height);
		this.ctx.fillStyle = "rgba(121, 189, 224, 1.0)";
		this.ctx.fillRect(0, 0, this.element.width, this.element.height);

		this.ctx.font = "32px Ariel";
		this.ctx.textAlign="left"; 
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.fillText( "I am the parent app.  Click to launch child apps.", 10, 32);
		this.ctx.fillText( "Child app " + this.childList.length, 10, 32+32);
		
	},

	resize: function(date) {
		this.refresh(date);
	},
	move: function(date) {
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			this.launchChild();
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

	messageEvent: function(data){
		console.log("I am in the parent, getting message " + data.msg);

		if( data.type == "childCreated" ){
			console.log("the child is: " + data.childId); 
			childList[childList.length-1].childId = data.childId; //put the id into the obj
		}

		
	},

	//here is where the parent launches the child app
	//we will have to add appropriate data variables 
	launchChild: function(){
		data = {
			applicationType: "custom",
			application: "apps/exampleChild", 
			user: "articulate_ui", 
			id: this.id,
			msg:"this is a message from articulate_ui",
			childId: null 
		};
		if( isMaster ){
			launchLinkedChildApp(data);
		}

		this.childList.push( data );
	}

});
