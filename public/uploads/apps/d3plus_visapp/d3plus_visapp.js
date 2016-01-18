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
		    {"year": 2010, "name":"UIC", "value": 15},
		    {"year": 2010, "name":"Loop", "value": 10},
		    {"year": 2010, "name":"River-North", "value": 5},
		    {"year": 2010, "name":"Near-West", "value": 50},
		  	{"year": 2011, "name":"UIC", "value": 22},
		    {"year": 2011, "name":"Loop", "value": 13},
		    {"year": 2011, "name":"River-North", "value": 16},
		    {"year": 2011, "name":"Near-West", "value": 55},
		  	{"year": 2012, "name":"UIC", "value": 43},
		    {"year": 2012, "name":"Loop", "value": 3},
		    {"year": 2012, "name":"River-North", "value": 34},
		    {"year": 2012, "name":"Near-West", "value": 23},
		  	{"year": 2013, "name":"UIC", "value": 27},
		    {"year": 2013, "name":"Loop", "value": 14},
		    {"year": 2013, "name":"River-North", "value": 10},
		    {"year": 2013, "name":"Near-West", "value": 2},
		    {"year": 2014, "name":"UIC", "value": 47},
		    {"year": 2014, "name":"Loop", "value": 4},
		    {"year": 2014, "name":"River-North", "value": 18},
		    {"year": 2014, "name":"Near-West", "value": 22},
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
		this.selectedType = "bar";
		this.selectedX = "year";
		this.selectedY = "value";
		this.selectedId = "name";

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
