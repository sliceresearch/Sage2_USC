// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


var snap_one = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous"; // "onfinish";

		this.svg  = null;
		this.obj  = null;
		this.text = null;
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

		// application specific 'init'
		this.element.id = "div" + id;

		// Set refresh once every 2 sec.
		this.maxFPS = 1/2;

		// save yourself ;-)
		var _myself = this;

		// Make the SVG element fill the app
		this.svg = Snap("100%","100%");
		// Adding it to the DOM
		this.element.appendChild(this.svg.node);
		// Sets the scale of the SVG scenegraph: 0 to 100 (make sure it matches aspect ratio from pacakge.json)
		var ratio = 100*width/height;
		this.svg.attr("viewBox", "0,0,100,"+ratio);

		// Lets create a background
		var rectbg = this.svg.rect(0, 0, 100, 100);
		// lets change its attributes
		rectbg.attr({ fill: "#aaaaaa", strokeWidth: 0 });

		// create image: src, x,y, width,height
		// adds the application icon
		var image = this.svg.image(this.resrcPath+'snap_one.webp', 40, 40, 30, 30);

		// create a circle, store it into an application variable
		this.obj = this.svg.circle(10, 80, 10);
		this.obj.attr({ fill: "#aa0000", strokeWidth: 1 });

		// Text
		var text = this.svg.text(5, 25, "Snap App");
		text.attr( { fill: "#333333", "font-size": "5px", id:"mytext" });
		text.attr({ fontFamily: 'Arimo', textAnchor: 'left'});

		// PDU
		//		http://solgae.evl.uic.edu:8888/totalAccumEnergy
		// 		http://solgae.evl.uic.edu:8888/totalInEnergy
		// Chicago crime data:
		//   	http://data.cityofchicago.org/resource/x2n5-8w5q.json?beat=1232
		// SAGE2 config:
		//		//config

		// readFile("http://data.cityofchicago.org/resource/x2n5-8w5q.json?beat=1232", function (err, data) {
		// 	if (err) console.log('Error retrieving JSON data', err);
		// 	else {
		// 		var t1 = _myself.svg.text(5, 5, "Crimes: " + data.length);
		// 		t1.attr( { fill: "#333333", "font-size": "5px" });
		// 		t1.attr({ fontFamily: 'Arimo', textAnchor: 'left'});
		// 		var t2 = _myself.svg.text(5, 12, "offense 1: " + data[0]._primary_decsription + " at " + data[0]._location_description);
		// 		t2.attr( { fill: "#333333", "font-size": "5px" });
		// 		t2.attr({ fontFamily: 'Arimo', textAnchor: 'left'});
		// 	}
		// }, "JSON");

		// get the SAGE2 server configuration information
		//   readFile from SAGE2 runtime

		// Only the 'master' display node is doing the query
		if (isMaster) {
			readFile("//"+window.location.host+"/config", function (err, data) {
				if (err) console.log('Error retrieving JSON data', err);
				else {
					// broadcast the data to all display nodes
					_myself.broadcast("onMessage", data);
				}
			}, "JSON");
		}
		this.controls.finishedAddingControls();
	},

	// get messages from the server through a broadcast call
	onMessage: function(data) {
		// hostname
		var t1 = this.svg.text(5, 5, "Host: " + data.host);
		t1.attr( { fill: "#333333", "font-size": "5px" });
		t1.attr({ fontFamily: 'Arimo', textAnchor: 'left'});

		// display configuration
		var t2 = this.svg.text(5, 12, "Display: " + data.resolution.width + "x" + data.resolution.height +
										 " [" + data.layout.rows + "x" + data.layout.columns + "]");
		t2.attr( { fill: "#333333", "font-size": "5px" });
		t2.attr({ fontFamily: 'Arimo', textAnchor: 'left'});

	},

	load: function(state, date) {
		if (state) {
		}
	},

	draw: function(date) {
		// Update the text: instead of storing a variable, querying the SVG graph to retrieve the element
		this.svg.select("#mytext").attr({ text: date});
	},

	resize: function(date) {
		// no need, it's SVG!
	},

	event: function(eventType, position, user_id, data, date) {

		if (eventType === "pointerPress" && (data.button === "left")) {
			// Move the circle when I click
			this.obj.attr({ cx: Math.round(Math.random()*100), cy:Math.round(Math.random()*100)});
		}
		else if (eventType === "pointerRelease" && (data.button === "left")) {
		}

		else if (eventType === "keyboard") {
			if(data.character === "m") {
			}
			else if (data.character === "t") {
			}
			else if (data.character === "w") {
			}			
		}

		else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") { // left arrow
			}
			else if (data.code === 38 && data.state === "down") { // up arrow
			}
			else if (data.code === 39 && data.state === "down") { // right arrow
			}
			else if (data.code === 40 && data.state === "down") { // down arrow
			}			
		}
	}

});
