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
		//this.launchChild(); 
		this.count = 0;

		this.randomColor1 = [0,0,0];
		this.randomColor2 = [0,0,0];
		this.randomColor3 = [0,0,0];

		this.generateRandomColor(0);
		this.generateRandomColor(1);
		this.generateRandomColor(2);
	},

	load: function(date) {
		console.log('exampleParent> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
		//console.log('exampleParent> Draw with state value', this.state.value);

		// I'm drawing things to make it evident that this is the parent app
		this.ctx.clearRect(0, 0, this.element.width, this.element.height);
		this.ctx.fillStyle = "rgba(255, 248, 208, 1.0)";
		this.ctx.fillRect(0, 0, this.element.width, this.element.height);

		//title
		this.ctx.font = "32px Ariel";
		this.ctx.textAlign="left"; 
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.fillText( "I am the parent app.  Test features below:", 10, 32);

		//console.log(this.randomColor1);
		//button to create new child
		this.ctx.fillStyle = "rgba(148, 240, 255, 1.0)";
		this.ctx.fillRect(100, 100, this.element.width-200, 75);
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.fillText( "Click to create child with color: ", 110, 150);
		this.ctx.fillStyle = this.colorStringify(this.randomColor1);
		this.ctx.fillRect(this.element.width-200, 100, 100, 75);

		//button to send message to all children 
		this.ctx.fillStyle = "rgba(148, 210, 255, 1.0)";
		this.ctx.fillRect(100, 200, this.element.width-200, 75);
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.fillText( "Click to change color of children to: ", 110, 250);
		this.ctx.fillStyle = this.colorStringify(this.randomColor2);
		this.ctx.fillRect(this.element.width-200, 200, 100, 75);

		//button to send message to first child
		this.ctx.fillStyle = "rgba(148, 165, 255, 1.0)";
		this.ctx.fillRect(100, 300, this.element.width-200, 75);
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.fillText( "Click to change color of child"+this.count+" to:", 110, 350);
		this.ctx.fillStyle = this.ctx.fillStyle = this.colorStringify(this.randomColor3);
		this.ctx.fillRect(this.element.width-200, 300, 100, 75);

		//future features 
		this.ctx.fillStyle = "rgba(189, 148, 255, 1.0)";
		this.ctx.fillRect(100, 400, this.element.width-200, 75);

		this.ctx.fillStyle = "rgba(237, 148, 255, 1.0)";
		this.ctx.fillRect(100, 500, this.element.width-200, 75);

		//this.ctx.fillText( "Number of child apps " + this.childList.length, 10, 32+32);
		
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
			100, 100, this.element.width-200, 75
			
			if( position.x > 100 && position.x < 100+this.element.width-200 )
			{

				if( position.y > 100 && position.y < 175 ){ //1st button:launch a child
					this.launchChild();
					this.generateRandomColor(0);//new color for next app
				}
				if( position.y > 200 && position.y < 275 ){ //2nd button:change color on childred

					this.generateRandomColor(1);
				}
				if( position.y > 300 && position.y < 375 ){ //2nd button:change color on childred

					this.generateRandomColor(2);
				}
			}
		
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
			this.childList[this.childList.length-1].childId = data.childId; //put the id into the obj
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
			childId: null,
			initState: {  // these values will load on child app init
				value: 10,
				red: this.randomColor1[0], 
				green: this.randomColor1[1], 
				blue: this.randomColor1[2]  
			}
		};
		if( isMaster ){
			launchLinkedChildApp(data);
		}

		this.childList.push( data );
	},

	generateRandomColor: function(idx){
		if (isMaster) {
			var rand1 = Math.floor(Math.random() * 255);
			var rand2 = Math.floor(Math.random() * 255);
			var rand3 = Math.floor(Math.random() * 255);
			var rand = [rand1, rand2, rand3];
			if( idx == 0 ){
				this.randomColor1 = rand; 
				//this.broadcast("storeRandomColor1", {random: rand});
			}
			if( idx == 1 )
				this.randomColor2 = rand; 
				// this.broadcast("storeRandomColor2", {random: rand});
			if( idx == 2)
				this.randomColor3 = rand; 
				// this.broadcast("storeRandomColor3", {random: rand});
		}
	},

	// storeRandomColor1: function(rand){
	// 	this.randomColor1 = rand;
	// 	console.log("STORE: " + this.randomColor1);
	// },

	// storeRandomColor2: function(rand){
	// 	this.randomColor2 = rand;
	// 	console.log(rand);
	// },

	// storeRandomColor3: function(rand){
	// 	this.randomColor3 = rand;
	// 	console.log(rand);
	// },

	colorStringify: function( color ){
		str = "rgba("+color[0]+", "+color[1]+", "+color[2]+", 1.0)";
		return str; 
	}

});