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


		//in this case, we are passing colors to the children
		//so, we need random colors to test message passing
		this.count = 0; //keeping track of a child
		this.randomColor1 = [0,0,0];
		this.randomColor2 = [0,0,0];
		this.randomColor3 = [0,0,0];
		this.generateRandomColor(0);
		this.generateRandomColor(1);
		this.generateRandomColor(2);

		this.colorToDraw = [255,248,208];

		this.monitoringText = "";

		this.someDataSet = [2, 4, 6, 8, 10, 12, 14, 16];

		if (isMaster) { //get display configuration from server

		}
	},

	load: function(date) {
		console.log('exampleParent> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
		//console.log('exampleParent> Draw with state value', this.state.value);

		// I'm drawing things to make it evident that this is the parent app
		this.ctx.clearRect(0, 0, this.element.width, this.element.height);
		this.ctx.fillStyle = this.colorStringify(this.colorToDraw);
		this.ctx.fillRect(0, 0, this.element.width, this.element.height);

		//title
		this.ctx.font = "32px Ariel";
		this.ctx.textAlign="left"; 
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.fillText( "I am the parent app.  Test features below:", 10, 32);

		//console.log(this.randomColor1);
		//drawing a button to create new child
		this.ctx.fillStyle = "rgba(148, 240, 255, 1.0)";
		this.ctx.fillRect(100, 100, this.element.width-200, 75);
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.fillText( "Click to create child with color: ", 110, 150);
		this.ctx.fillStyle = this.colorStringify(this.randomColor1);
		this.ctx.fillRect(this.element.width-200, 100, 100, 75);

		//drawing a button to send message to all children 
		this.ctx.fillStyle = "rgba(148, 210, 255, 1.0)";
		this.ctx.fillRect(100, 200, this.element.width-200, 75);
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.fillText( "Click to change color of all to: ", 110, 250);
		this.ctx.fillStyle = this.colorStringify(this.randomColor2);
		this.ctx.fillRect(this.element.width-200, 200, 100, 75);

		//drawing a button to send message to a child
		this.ctx.fillStyle = "rgba(148, 165, 255, 1.0)";
		this.ctx.fillRect(100, 300, this.element.width-200, 75);
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.fillText( "Click to change color of child"+this.count + " to:", 110, 350);
		this.ctx.fillStyle = this.colorStringify(this.randomColor3);
		this.ctx.fillRect(this.element.width-200, 300, 100, 75);

		// close child
		this.ctx.fillStyle = "rgba(189, 148, 255, 1.0)";
		this.ctx.fillRect(100, 400, this.element.width-200, 75);
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.textAlign="left"; 
		this.ctx.fillText("click to close most recent child: child" + (this.getNumberOfChildren() -1) , 110, 450 );

		// move child
		this.ctx.fillStyle = "rgba(249, 134, 167, 1.0)";
		this.ctx.fillRect(100, 500, this.element.width-200, 75);
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.textAlign="left"; 
		this.ctx.fillText("click to move most recent child: child" +  (this.getNumberOfChildren() -1) , 110, 550 );

		// resize child
		this.ctx.fillStyle = "rgba(249, 156, 134, 1.0)";
		this.ctx.fillRect(100, 600, this.element.width-200, 75);
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.textAlign="left"; 
		this.ctx.fillText("click to resize most recent child: child" +  (this.getNumberOfChildren() -1) , 110, 650 );

		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.fillText("monitoring: " + this.getNumberOfChildren() + "   active children", 100, 710 );
		this.ctx.textAlign="left"; 
		this.ctx.fillText(this.monitoringText, 100, 750);   

		// this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		// this.ctx.fillText("display resolution: " + this.display + "   active children", 100, 610 );
		// this.ctx.textAlign="left"; 
		// this.ctx.fillText(this.monitoringText, 100, 650); 

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
				if( position.y > 200 && position.y < 275 ){ //2nd button:change color on all children
					this.sendMessageToAllChildren();
					this.generateRandomColor(1);

				}
				if( position.y > 300 && position.y < 375 ){ //3rd button:change color on childred
					this.sendMessageToChild();
					this.generateRandomColor(2);
				}
				if( position.y > 400 && position.y < 475 ){ //3rd button:change color on childred
					if( this.getNumberOfChildren() > 0 )
						this.closeChild(this.getNumberOfChildren()-1);
				}
				if( position.y > 500 && position.y < 575 ){ //3rd button:change color on childred
					if( this.getNumberOfChildren() > 0 )
						this.moveChild(this.getNumberOfChildren()-1, 300, 300);
				}
				if( position.y > 600 && position.y < 675 ){ //3rd button:change color on childred
					if( this.getNumberOfChildren() > 0 )
						this.resizeChild(this.getNumberOfChildren()-1, 900, 400, false);
				}
			}
		
		}
		else if (eventType === "pointerMove" && this.dragging) {
			console.log(position);
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

	//here is where the parent launches the child app
	//we will have to add appropriate data variables 
	launchChild: function(){
		applicationType ="custom",
		application = "apps/exampleChild", 	
		msg = "this is a message from articulate_ui",
		initState = {  // these values will load on child app init
				value: 10,
				red: this.randomColor1[0], 
				green: this.randomColor1[1], 
				blue: this.randomColor1[2]  
			}

		this.launchNewChild(applicationType, application, initState, msg);//defined in sage2 app
	},


	//here is where the parent launches the child app
	//we will have to add appropriate data variables 
	launchChildImage: function(){
		// applicationType ="standard",
		// application = "image_viewer", 	
		// initState = {  // these values will load on child app init
		// 		img_url: "sage2-displays-cave2-4.jpg"
		// 	}

		// this.launchNewChild(applicationType, application, initState, msg);//defined in sage2 app
	},

	sendMessageToChild: function(){
		if( this.getNumberOfChildren() == 0 || this.count >= this.getNumberOfChildren() )
			return;

		childId = this.getChildIdByIdx(this.count); //request the ith child
		

		this.incrementCount(); 

		//what to send:
		colorToSend = this.randomColor3; //sending the color shown next to the button

		//send it: 
		if( isMaster ){//only want one display node to send the message, not all
			sendMessageToChild( this.id, childId, {msgType: "changeColor",color: colorToSend});
		}
	},

	sendMessageToAllChildren: function(){
		console.log("Send to " + this.childList.length);
		for(var i =0; i<this.childList.length; i++){
			//who to send the message to:
			childId = this.childList[i].childId; //get the id of the child to send message to 

			//what to send:
			colorToSend = this.randomColor2; //sending the color shown next to the button

			//send it: 
			if( isMaster ){//only want one display node to send the message, not all
				sendMessageToChild( this.id, childId, {msgType: "changeColor",color: colorToSend});
			}
		}
	},

	childMonitorEvent: function(childId, type, data, date){
		if( type == "childMoveEvent")
			this.monitoringText = "child: " + childId + " " + type + " x: " + data.x + "y: " + data.y;
		if( type == "childResizeEvent")
			this.monitoringText = "child: " + childId + " " + type + " w: " + data.w + "h: " + data.h;
		if( type == "childMoveAndResizeEvent")
			this.monitoringText = "child: " + childId + " " + type +  " x: " + data.x + "y: " + data.y + " w: " + data.w + "h: " + data.h;
		if( type == "childCloseEvent" )
			this.monitoringText = "child: " + childId + " closed";
		if( type == "childOpenEvent") {
			this.monitoringText = "child: " + childId + " opened";	
		}		
		if( type == "childReopenEvent"){
			this.monitoringText = "child: " + childId + " reopened ";
		}
		this.refresh(date);
	},

		//here is where messages from parents and children are received
	messageEvent: function(data){
		console.log("I am in the parent, getting message " + data); //just confirming that the message gets through

		if( data.type == "messageFromChild" && data.params.msgType == "changeColor" ){//this is one type of message
			this.colorToDraw = data.params.color ; //in this case, we know that the parent can update our color										//so we look for the color param 
		}

		this.refresh(data.date);//need to refresh for update to be seen

	},

	incrementCount: function(){
		this.count++;
		if( this.count >= this.getNumberOfChildren() )
			this.count = 0;
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
	},

	positionChild: function(){
		// broadcast( "positionChild", {id: , childId: this.childList[i].childId;})
	}

});