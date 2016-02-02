//
// SAGE2 application: articulate_ui
// by: Jillian Aurisano <jillian.aurisano@gmail.com>
//
// Copyright (c) 2015
//

var articulate_ui = SAGE2_App.extend( {
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("canvas", data);
		// Set the background to black
		this.element.style.backgroundColor = 'white';

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


		//TEST
		// if( isMaster ){
		// 	console.log("I'm the master");
		// 	this.contactArticulateHub("this is a test");
		// }

		this.commands = [];
		this.commands.push(">");
	},

	

	load: function(date) {
		console.log('articulate_ui> Load with state value', this.state.value);


		this.refresh(date);
	},

	//---------------------------------------------
	//------------ CONNECTION FUNCTIONS -----------
	//---------------------------------------------

	//contact the smart hub-- only called by master
	contactArticulateHub: function(msg){
		console.log("sending msg: " , msg);

		msg = msg.replace(" ", "%"); 
		url = "http://articulate.evl.uic.edu:8080/smarthub/webapi/myresource/query/"
		url = url+msg; 

		this.callbackFunc = this.callback.bind(this);

		this.postRequest(url, this.callbackFunc, 'TEXT');
		//wsio.emit('launchLinkedChildApp', {application: "apps/d3plus_visapp", user: "articulate_ui", msg:"this is a message from articulate_ui"});

	},

	//this sends the request to the rest service
	//only called by master
	postRequest: function(filename, callback, type) {
		var dataType = type || "TEXT";

		var xhr = new XMLHttpRequest();
		xhr.open("GET", filename, true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					if (dataType === "TEXT") {
						callback(null, xhr.responseText);
					} else if (dataType === "JSON") {
						callback(null, JSON.parse(xhr.responseText));
					} else if (dataType === "CSV") {
						callback(null, csvToArray(xhr.responseText));
					} else if (dataType === "SVG") {
						callback(null, xhr.responseXML.getElementsByTagName('svg')[0]);
					} else {
						callback(null, xhr.responseText);
					}
				} else {
					callback("Error: File Not Found", null);
				}
			}
		};
		xhr.send();
	},

	//this gets the data from the smart hub, in a callback
	//only called by master, hence the 'broadcast'
	callback: function(err, text) {
			if (err)			{
				console.log("error connecting to articulate smart hub");
				return;
			}
			console.log("GOT THE RESPONSE: ");
			console.log(text);

			//then broadcast the results to display nodes!
			//broadcast( "handleResponse", {response:"responseTest"} ); 
		},

	handleResponse: function(data){
		console.log(data.response);


		// wsio.emit('launchLinkedChildApp', {msg:"this is a message from articulate_ui"});
	},

	//----------------------------------------//
	//---------- DRAWING FUNCTIONS ----------//
	//---------------------------------------//
	draw: function(date) {
		console.log('articulate_ui> Draw with state value', this.state.value);

		this.ctx.clearRect(0, 0, this.element.width, this.element.height);

		this.ctx.font = "32px Ariel";
		this.ctx.textAlign="left"; 
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		theY = 32;

		//no idea if this works... 
		startIdx = 0;
		if( this.commands.length*32 > this.element.length-100 ) {
			diff = (this.element.length-100) - (this.commands.length*32);
			startIdx = diff % 32; 
		}

		// but this works...
		for(i = 0; i < this.commands.length; i++){
			this.ctx.fillText( this.commands[i], 10, theY);
			theY += 32;
		}

		// synced data
		// this.ctx.fillStyle = "rgba(189, 148, 255, 1.0)";
		// this.ctx.fillRect(100, this.element.height - 100, this.element.width-200, 75 );
		// this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		// this.ctx.font = "24px Ariel";
		// this.ctx.textAlign="left"; 
		// this.ctx.fillText("generate vis", 110, this.element.height - 50 );
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

	textInputEvent: function(text, date){
		this.commands[this.commands.length-1] = text;
		this.commands.push(">"); 


		if( isMaster ){
			//send to articulate hub...
		}

		this.refresh(date);
	}


});
