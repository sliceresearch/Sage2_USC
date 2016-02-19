//
// SAGE2 application: d3plus-visapp
// by: Jillian Aurisano <jillian.aurisano@gmail.com>
//
// Copyright (c) 2015
//

var d3plus_visapp = SAGE2_App.extend( {

	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);
		// Set the background to black
		this.element.style.backgroundColor = 'black';

		this.vis = d3.select(this.element).append("vis"); //Need container

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

		// sample data array- will need to pull from db
	  	this.theData = [
		    {"year": 2010, "id":"UIC", "total_crime": 15},
		    {"year": 2010, "id":"Loop", "total_crime": 10},
		    {"year": 2010, "id":"River-North", "total_crime": 5},
		    {"year": 2010, "id":"Near-West", "total_crime": 50},
		  	{"year": 2011, "id":"UIC", "total_crime": 22},
		    {"year": 2011, "id":"Loop", "total_crime": 13},
		    {"year": 2011, "id":"River-North", "total_crime": 16},
		    {"year": 2011, "id":"Near-West", "total_crime": 55},
		  	{"year": 2012, "id":"UIC", "total_crime": 43},
		    {"year": 2012, "id":"Loop", "total_crime": 3},
		    {"year": 2012, "id":"River-North", "total_crime": 34},
		    {"year": 2012, "id":"Near-West", "total_crime": 23},
		  	{"year": 2013, "id":"UIC", "total_crime": 27},
		    {"year": 2013, "id":"Loop", "total_crime": 14},
		    {"year": 2013, "id":"River-North", "total_crime": 10},
		    {"year": 2013, "id":"Near-West", "total_crime": 2},
		    {"year": 2014, "id":"UIC", "total_crime": 47},
		    {"year": 2014, "id":"Loop", "total_crime": 4},
		    {"year": 2014, "id":"River-North", "total_crime": 18},
		    {"year": 2014, "id":"Near-West", "total_crime": 22},
		  ];

	},

	load: function(date) {
		console.log('d3plus-visapp> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
		console.log('d3plus-visapp> Draw with state value', this.state.value);

		console.log(this.theData); 

		//draw variables
		this.selectedType = this.state.type; //"bar";
		this.selectedX = this.state.x; //"year";
		this.selectedY = this.state.y; //"value";
		this.selectedId = "id";//this.state.id;//"name";
		this.theData = this.state.data;

		console.log( "in app " + this.selectedType +  " " + this.selectedX + " " + this.selectedY + " " + this.selectedId);
		console.log( this.theData );

		//do it!
		visualization = d3plus.viz()
		    .container( d3.select("vis") )  // container DIV to hold the visualization
		    .data(this.theData)  // data to use with the visualization
		    .type(this.selectedType)       // visualization type
		    .id(this.selectedId)         // key for which our data is unique on
		    .text(this.selectedId)       // key to use for display text
		    .y(this.selectedY)         // key to use for y-axis
		    .x(this.selectedX)          // key to use for x-axis
		    .draw()  
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
	}
});
