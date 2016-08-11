// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

"use strict";

// simple radar image app
// written by andy johnson - summer 2014

/*    SAGE2_radarStations = [
        "LOT", // Chicago
        "HMO", // Honolulu
        "NKX", // San Diego
        "OKX", // New York City
        "GRK" // Austin
    ];
*/

/* global d3, SAGE2_radarStations */

var radar = SAGE2_App.extend({

	initApp: function() {
		this.load1SuccessCallbackFunc = this.load1SuccessCallback.bind(this);
		this.load1FailCallbackFunc    = this.load1FailCallback.bind(this);
		this.load2SuccessCallbackFunc = this.load2SuccessCallback.bind(this);
		this.load2FailCallbackFunc    = this.load2FailCallback.bind(this);
		this.load3SuccessCallbackFunc = this.load3SuccessCallback.bind(this);
		this.load3FailCallbackFunc    = this.load3FailCallback.bind(this);
		this.load4SuccessCallbackFunc = this.load4SuccessCallback.bind(this);
		this.load4FailCallbackFunc    = this.load4FailCallback.bind(this);
		this.load5SuccessCallbackFunc = this.load5SuccessCallback.bind(this);
		this.load5FailCallbackFunc    = this.load5FailCallback.bind(this);
		this.load6SuccessCallbackFunc = this.load6SuccessCallback.bind(this);
		this.load6FailCallbackFunc    = this.load6FailCallback.bind(this);
	},

	createURLs: function() {
		var URL1a = "http://radar.weather.gov/ridge/Overlays/Topo/Short/";
		var URL2a = "http://radar.weather.gov/ridge/Overlays/County/Short/";
		var URL3a = "http://radar.weather.gov/ridge/RadarImg/N0R/";
		var URL4a = "http://radar.weather.gov/ridge/Warnings/Short/";
		var URL5a = "http://radar.weather.gov/ridge/Legend/N0R/";
		var URL6a = "http://radar.weather.gov/Overlays/Cities/Short/";

		var URL1b = "_Topo_Short.jpg";
		var URL2b = "_County_Short.gif";
		var URL3b = "_N0R_0.gif";
		var URL4b = "_Warnings_0.gif";
		var URL5b = "_N0R_Legend_0.gif";
		var URL6b = "_City_Short.gif";

		console.log("creating URLs for  " + this.state.currentStation);

		this.URL1 = URL1a + SAGE2_radarStations[this.state.currentStation].code + URL1b;
		this.URL2 = URL2a + SAGE2_radarStations[this.state.currentStation].code + URL2b;
		this.URL3 = URL3a + SAGE2_radarStations[this.state.currentStation].code + URL3b;
		this.URL4 = URL4a + SAGE2_radarStations[this.state.currentStation].code + URL4b;
		this.URL5 = URL5a + SAGE2_radarStations[this.state.currentStation].code + URL5b;
		this.URL6 = URL6a + SAGE2_radarStations[this.state.currentStation].code + URL6b;
	},

	drawImage: function(theImage) {
		this.sampleSVG.append("image")
			.attr("xlink:href", theImage)
			.attr("opacity", 1)
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", this.canvasWidth)
			.attr("height", this.canvasHeight);
	},


	drawEverything: function() {
		var sum = this.OK1 + this.OK2 + this.OK3 + this.OK4 + this.OK5 + this.OK6;

		if (sum >= 6) {
			this.sampleSVG.selectAll("*").remove();

			this.drawImage(this.image1.src); // TOPO
			this.drawImage(this.image2.src); // Counties

			this.drawImage(this.image3.src); // Radar
			this.drawImage(this.image4.src); // Warnings

			this.drawImage(this.image6.src); // Cities

			this.drawImage(this.image5.src); // Legend
		}
	},

	load1SuccessCallback: function() {
		this.OK1 = 1;
		this.drawEverything();
	},
	load1FailCallback: function() {
		this.OK1 = 0;

		setTimeout(function() {
			this.image1.src = this.URL1 + '?' + Math.floor(Math.random() * 10000000);
			this.image1.onload = this.load1SuccessCallbackFunc;
			this.image1.onerror = this.load1FailCallbackFunc;
		}, 2000);
	},
	load2SuccessCallback: function() {
		this.OK2 = 1;
		this.drawEverything();
	},
	load2FailCallback: function() {
		this.OK2 = 0;

		setTimeout(function() {
			this.image2.src = this.URL2 + '?' + Math.floor(Math.random() * 10000000);
			this.image2.onload = this.load2SuccessCallbackFunc;
			this.image2.onerror = this.load2FailCallbackFunc;
		}, 2000);
	},
	load3SuccessCallback: function() {
		this.OK3 = 1;
		this.drawEverything();
	},
	load3FailCallback: function() {
		this.OK3 = 0;

		setTimeout(function() {
			this.image3.src = this.URL3 + '?' + Math.floor(Math.random() * 10000000);
			this.image3.onload = this.load3SuccessCallbackFunc;
			this.image3.onerror = this.load3FailCallbackFunc;
		}, 2000);
	},
	load4SuccessCallback: function() {
		this.OK4 = 1;
		this.drawEverything();
	},
	load4FailCallback: function() {
		this.OK4 = 0;

		setTimeout(function() {
			this.image4.src = this.URL4 + '?' + Math.floor(Math.random() * 10000000);
			this.image4.onload = this.load4SuccessCallbackFunc;
			this.image4.onerror = this.load4FailCallbackFunc;
		}, 2000);
	},
	load5SuccessCallback: function() {
		this.OK5 = 1;
		this.drawEverything();
	},
	load5FailCallback: function() {
		this.OK5 = 0;

		setTimeout(function() {
			this.image5.src     = this.URL5 + '?' + Math.floor(Math.random() * 10000000);
			this.image5.onload  = this.load5SuccessCallbackFunc;
			this.image5.onerror = this.load5FailCallbackFunc;
		}, 2000);
	},
	load6SuccessCallback: function() {
		this.OK6 = 1;
		this.drawEverything();
	},
	load6FailCallback: function() {
		this.OK6 = 0;

		setTimeout(function() {
			this.image6.src     = this.URL6 + '?' + Math.floor(Math.random() * 10000000);
			this.image6.onload  = this.load6SuccessCallbackFunc;
			this.image6.onerror = this.load6FailCallbackFunc;
		}, 2000);
	},

	nextStation: function() {
		this.state.currentStation += 1;
		if (this.state.currentStation >= SAGE2_radarStations.length) {
			this.state.currentStation = 0;
		}

		console.log("moving to next location " + this.state.currentStation);
	},

	setStation: function(newStation) {
		this.state.currentStation = +newStation;

		console.log("setting location to " + this.state.currentStation);
	},

	update: function() {
		// get new imagery for the radar, warnings, overlay (time)

		if (isMaster) {
			var commonRandom = Math.floor(Math.random() * 10000000);
			this.broadcast("updateNode", {commonRandom: commonRandom});
		}
	},


	updateNode: function(data) {
		var localRandom = data.commonRandom;

		this.image3.src     = this.URL3 + '?' + localRandom;
		this.image3.onload  = this.load3SuccessCallbackFunc;
		this.image3.onerror = this.load3FailCallbackFunc;

		this.image4.src     = this.URL4 + '?' + localRandom;
		this.image4.onload  = this.load4SuccessCallbackFunc;
		this.image4.onerror = this.load4FailCallbackFunc;

		this.image5.src     = this.URL5 + '?' + localRandom;
		this.image5.onload  = this.load5SuccessCallbackFunc;
		this.image5.onerror = this.load5FailCallbackFunc;
	},

	startup: function() {
		// set up the area to render into

		// load in the background images and the legend once

		this.initApp();
		this.createURLs();

		// the master generates one random number and sends it to everyone for the load

		if (isMaster) {
			var commonRandom = Math.floor(Math.random() * 10000000);
			this.broadcast("startupNode", {commonRandom: commonRandom});
		}
	},

	startupNode: function(data) {
		var localRandom = data.commonRandom;

		// TOPO
		this.image1.src     = this.URL1 + '?' + localRandom;
		this.image1.onload  = this.load1SuccessCallbackFunc;
		this.image1.onerror = this.load1FailCallbackFunc;

		// Counties
		this.image2.src     = this.URL2 + '?' + localRandom;
		this.image2.onload  = this.load2SuccessCallbackFunc;
		this.image2.onerror = this.load2FailCallbackFunc;

		// Cities
		this.image6.src     = this.URL6 + '?' + localRandom;
		this.image6.onload  = this.load6SuccessCallbackFunc;
		this.image6.onerror = this.load6FailCallbackFunc;
	},


	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous";
		this.svg = null;

		this.canvasWidth = 1.0;
		this.canvasHeight = 1.0;

		this.sampleSVG = null;

		this.image1 = new Image();
		this.image2 = new Image();
		this.image3 = new Image();
		this.image4 = new Image();
		this.image5 = new Image();
		this.image6 = new Image();

		this.image3a = new Image();
		this.image4a = new Image();
		this.image5a = new Image();

		this.URL1 = "";
		this.URL2 = "";
		this.URL3 = "";
		this.URL4 = "";
		this.URL5 = "";
		this.URL6 = "";

		this.OK1 = 0;
		this.OK2 = 0;
		this.OK3 = 0;
		this.OK4 = 0;
		this.OK5 = 0;
		this.OK6 = 0;

		this.maxFPS = 0.01;

		console.log("initalizing location to  " + this.state.currentStation);

		// Get width height from the supporting div
		var divWidth  = this.element.clientWidth;
		var divHeight = this.element.clientHeight;

		this.element.id = "div" + data.id;

		// set background color for areas around my app (in case of non-proportional scaling)
		this.element.style.backgroundColor = "black";

		// attach the SVG into the this.element node provided to us
		var box = "0,0," + data.width + "," + data.height;
		this.svg = d3.select(this.element).append("svg:svg")
			.attr("width",   divWidth)
			.attr("height",  divHeight)
			.attr("viewBox", box);
		this.sampleSVG = this.svg;


		this.startup(); // refresh the URLs after the state load
		// create the widgets
		console.log("creating controls");
		this.controls.addButton({type: "next", position: 5, identifier: "Next"});

		for (var loopIdx = 0; loopIdx < SAGE2_radarStations.length; loopIdx++) {
			var loopIdxWithPrefix = "0" + loopIdx;
			var pos = 3 - loopIdx;
			if (pos < 1) {
				pos = pos + 12;
			}
			this.controls.addButton({label: SAGE2_radarStations[loopIdx].name, position: pos, identifier: loopIdxWithPrefix});
		}
		this.controls.finishedAddingControls(); // Important

		this.update();
		this.draw_d3(data.date);
	},

	load: function(date) {
		this.refresh(date);
	},

	draw_d3: function(date) {
		// Get width height from the supporting div
		var x = this.element.clientWidth;
		var y = this.element.clientHeight;

		this.canvasWidth  = x;
		this.canvasHeight = y;

		this.sampleSVG.append("svg:rect")
			.style("stroke", "black")
			.style("fill", "black")
			.style("fill-opacity", 1)
			.attr("x", 0)
			.attr("y", 0)
			.attr("height", y)
			.attr("width", x);
	},

	draw: function(date) {
		this.update();
	},

	resize: function(date) {
		this.svg.attr('width',  this.element.clientWidth  + "px");
		this.svg.attr('height', this.element.clientHeight  + "px");
		this.refresh(date);
	},

	/**
	* To enable right click context menu support this function needs to be present with this format.
	*
	* Must return an array of entries. An entry is an object with three properties:
	*	description: what is to be displayed to the viewer.
	*	callback: String containing the name of the function to activate in the app. It must exist.
	*	parameters: an object with specified datafields to be given to the function.
	*		The following attributes will be automatically added by server.
	*			serverDate, on the return back, server will fill this with time object.
	*			clientId, unique identifier (ip and port) for the client that selected entry.
	*			clientName, the name input for their pointer. Note: users are not required to do so.
	*			clientInput, if entry is marked as input, the value will be in this property. See pdf_viewer.js for example.
	*		Further parameters can be added. See pdf_view.js for example.
	*/
	getContextEntries: function() {
		var entries = [];
		var entry;

		for (var comicCounter = 0; comicCounter < SAGE2_radarStations.length; comicCounter++) {
			entry = {};
			entry.description = SAGE2_radarStations[comicCounter].longName;
			entry.callback = "changeStation";
			entry.parameters = {};
			entry.parameters.page = comicCounter;
			entries.push(entry);
		}

		return entries;
	},

	/**
	* Support function to allow page changing through right mouse context menu.
	*
	* @method changeThePage
	* @param responseObject {Object} contains response from entry selection
	*/
	changeStation: function(responseObject) {
		var page = responseObject.page;
		this.setStation(page);
		this.startup();

		// This needs to be a new date for the extra function.
		this.refresh(new Date(responseObject.serverDate));
	},

	event: function(eventType, pos, user, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			// pointer press
		} else if (eventType === "pointerMove") {
			// pointer move
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			this.nextStation();
			this.startup();
			this.refresh(date);
		} else if (eventType === "widgetEvent") {
			if (data.ctrlId === "Next") {
				this.nextStation();
			} else {
				this.setStation(data.identifier);
			}
			this.startup();
			this.refresh(date);
		}
	}

});
