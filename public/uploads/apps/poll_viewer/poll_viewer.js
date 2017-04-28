//
// SAGE2 application: exampleChild
// by: Jillian Aurisano <jillian.aurisano@gmail.com>
//
// Copyright (c) 2015
//

var poll_viewer = SAGE2_App.extend( {
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

		this.colorToDraw = [this.state.red, this.state.green, this.state.blue];

		this.randomColor = [0,255,0];
		this.generateRandomColor();

		this.votes = this.state.votes;//{ A:0, B:0, C:0, D:0, E:0 }; 
		this.voteTotal = this.state.voteTotal;
	},

	//not called anymore... 
	load: function(date) {
		console.log('exampleChild> Load with state value', this.state.value);

		this.votes = this.state.votes;
		this.voteTotal = this.state.voteTotal;

		this.refresh(date);
	},

	draw: function(date) {
		// console.log('exampleChild> Draw with state value', this.state.value);
		//console.log('poll Draw with state value', this.state.value);
		this.votes = this.state.votes;
		this.voteTotal = this.state.voteTotal;

		// I'm drawing things to make it evident that this is the child app
		this.ctx.clearRect(0, 0, this.element.width, this.element.height);


		this.ctx.font = "24px Ariel";
		this.ctx.textAlign="center"; 

		var runningX = 20;
		var gap = 5; 
		var barWidth = (this.element.width-runningX*2 - gap*5)/5.0 ;  
		// for(i = 0; i < this.votes.length; i++){
		for (var key in this.votes) {
			var barHeight = this.map(this.votes[key], 0, this.voteTotal, 0, this.element.height-80); 
			var y0 = this.element.height-40-barHeight; 
			this.ctx.fillStyle = "steelblue";
			this.ctx.fillRect(runningX, y0, barWidth, barHeight);

			this.ctx.fillStyle = "white";
			this.ctx.fillText(""+this.votes[key], runningX+barWidth/2, y0-12);

			this.ctx.fillText(""+key, runningX+barWidth/2, this.element.height-14);

			runningX += barWidth + gap;

		}
	},

	map: function( value, xMin, xMax, yMin, yMax){
		return (value-xMin)/xMax * (yMax-yMin) + yMin;
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
			console.log("new vote!")
			console.log(data);

			this.votes.A += data.A;
			this.votes.B += data.B;
			this.votes.C += data.C;
			this.votes.D += data.D;
			this.votes.E += data.E; 

			console.log(this.votes);

			this.state.votes = this.votes;

			this.voteTotal += 1;
			this.state.voteTotal = this.voteTotal;

			this.refresh(date);
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

	//here is where messages from parents and children are received
	messageEvent: function(data){
		console.log("I am in the child, getting message " + data); //just confirming that the message gets through

		if( data.type == "messageFromParent" && data.params.msgType == "changeColor" ){//this is one type of message
			this.colorToDraw = data.params.color; //in this case, we know that the parent can update our color										//so we look for the color param 
		}

		this.refresh(data.date);//need to refresh for update to be seen

	},

	parentMonitorEvent: function(data){
		//empty for now
	},

	generateRandomColor: function(){
		if (isMaster) {
			var rand1 = Math.floor(Math.random() * 255);
			var rand2 = Math.floor(Math.random() * 255);
			var rand3 = Math.floor(Math.random() * 255);
			var rand = [rand1, rand2, rand3];
			
			this.randomColor = rand; 
			console.log(this.randomColor);
		}
	},

	colorStringify: function( color ){
		str = "rgba("+color[0]+", "+color[1]+", "+color[2]+", 1.0)";
		return str; 
	}
});
