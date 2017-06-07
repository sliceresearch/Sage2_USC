// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2016

"use strict";

var dataFileHandler = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "onfinish"; // "onfinish";
		this.passSAGE2PointerAsMouseEvents = true;

		this.element.id = "div" + data.id;
		// Using SAGE2 default font
		this.element.style.fontFamily = "Arimo, Helvetica, sans-serif";
		// Default starting attributes
		this.element.style.background = "white";
		this.element.style.fontSize = ui.titleTextSize;
		this.element.style.color = "green";

		this.debug = true;
		//keep title?
		this.title = data.title;
		this.appSpecific();
	},

	dbprint: function(string) {
		if (this.debug){
			console.log(string);
		}
	},

	/**
	* Pieces not created by init().
	* Will start with loading message, if given a state file, will load.
	* After load will attempt to add to this object.
	*
	* @method appSpecific
	*/
	appSpecific: function() {
		this.element.style.fontSize = "100px";

		// This should be activated based off of the dragged and dropped file
		if (this.state.file) {
			// all clients need to get the data, not master specific.
			this.element.textContent = "Loading ";
			var _this = this;
			if (this.state.file.indexOf(".json")) {
				this.element.textContent += " json:" + this.state.file;
				d3.json(this.state.file, function(error, jsObject) {
					if (error) {
						this.element.textContent = "Unable to load " + this.state.file;
					}
					_this.d3Loaded(jsObject);
				});
			} else if (this.state.file.indexOf(".csv")) {
				this.element.textContent += " csv:" + this.state.file;
				throw new "Error: not implemented yet!";
			} else {
				this.element.textContent = "Unable to load " + this.state.file;
			}
		} else {
			this.element.textContent = "No file given...";
		}
	},

	/**
	* After file is pulled, will end the jsObject here.
	* Will start with loading message, if given a state file, will load.
	* After load will attempt to add to this object. Puts in array if not already an array.
	*
	* @method appSpecific
	* @param jsObject {Object} what was in the file
	*/
	d3Loaded: function(jsObject) {
		// if it isn't an object, can't do anything.
		if (typeof jsObject !== "object") {
			this.dbprint("Did not get an object from file");
			this.element.textContent = "Unable to load " + this.state.file;
			return;
		}
		// Put in an array if not already in one.
		if (Array.isArray(jsObject)) {
			this.dataFromFile = jsObject;
		} else {
			this.dataFromFile = [jsObject]; // put in array even if only 1 element
		}
		// Use the first element as the reference object
		jsObject = this.dataFromFile[0];
		// Display information about contents
		this.element.style.fontSize = ui.titleTextSize + "px";
		// Title trim
		this.fileName = this.state.file;
		while (this.fileName.indexOf("/") !== -1) {
			this.fileName = this.fileName.substring(this.fileName.indexOf("/") + 1);
		}
		this.updateTitle(this.fileName + " (" + this.dataFromFile.length + " elements)");
		var content = "<div style='margin-left:" + ui.titleTextSize + "px'>";
		content += "<h3>Attributes:</h3>";
		content += "<p>";
		var keys = Object.keys(jsObject);
		for (let i = 0; i < keys.length; i++) {
			content += "<div>" + keys[i] + "</div>";
		}
		content += "</p><br>";
		content += "<p><div>Raw Data:</div><div>" + JSON.stringify(this.dataFromFile) + "</div></p></div>";
		this.element.innerHTML = content;

		this.analyseAndOpenChart();
	},

	/**
	* Looks at attributes in this.dataFromFile, based on what is there will try to open a chart.
	* Separate for later?
	*
	* @method analyseAndOpenChart
	*/
	analyseAndOpenChart: function() {
		var element1 = this.dataFromFile[0];
		var keys = Object.keys(element1);

		var hasTime = null, xAxisAttribute = null, yAxisAttribute;
		for (let i = 0; i < keys.length; i++) {
			if (keys[i] === "time" || keys[i] === "date") {
				hasTime = keys[i];
				xAxisAttribute = hasTime;
			}
		}

		// set a random y axis property to plot against
		var justInCase = 0;
		do {
			this.dbprint(this.getRandomInt(0, keys.length));
			this.dbprint(this.getRandomInt(0, keys.length));
			this.dbprint(this.getRandomInt(0, keys.length));
			this.dbprint(this.getRandomInt(0, keys.length));
			this.dbprint(this.getRandomInt(0, keys.length));
			yAxisAttribute = keys[this.getRandomInt(0, keys.length)];
			this.dbprint("chosen y attribute:" + yAxisAttribute + " from possible " + keys.length);
			justInCase++;
			if (justInCase > 100) {
				break;
			}
		} while(yAxisAttribute == xAxisAttribute);

		// if has time can open a chart...
		if (hasTime) {
			// function(appName, params, funcToPassParams, x, y)
			var chartValues = {
				data: this.dataFromFile,
				chartType: "Line",
				xAxisAttribute: xAxisAttribute,
				xAxisScale: "scaleTime",
				yAxisAttribute: yAxisAttribute,
				yAxisScale: "scaleLinear"
			};


			// line 
			this.csdLaunchAppWithValues("d3Charts", { chartValues: chartValues },
				undefined, // no post launch function activation
				this.sage2_x + 30, this.sage2_y + 30);


			chartValues.chartType = "Scatter";
			// chartValues.xAxisScale = "scaleLinear";
			this.csdLaunchAppWithValues("d3Charts", { chartValues: chartValues },
				undefined, // no post launch function activation
				this.sage2_x + 60, this.sage2_y + 60);


			chartValues.chartType = "Bar"; // bar charts only want counts, right?
			chartValues.xAxisAttribute = chartValues.yAxisAttribute;
			chartValues.xAxisScale = chartValues.yAxisScale;
			this.csdLaunchAppWithValues("d3Charts", { chartValues: chartValues },
				undefined, // no post launch function activation
				this.sage2_x + 90, this.sage2_y + 90);


		} else {
			this.dbprint("Unsure what kind of chart to use, has to be manual");
		}
	},

	/**
	* Generate random int, needs params min(inc) and max(exc).
	*
	* @method getRandomInt
	* @param min {Integer} minimum value, inclusive
	* @param min {Integer} maximum value, excluded
	*/
	getRandomInt: function(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min;
	},

	load: function(date) {
	},

	draw: function(date) {
		// left intentionally blank
	},

	resize: function(date) {
		//this.svg.attr("width", this.sage2_width).attr("height", this.sage2_height);
	},

	/**
	* To enable right click context menu support this function needs to be present.
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

		// entry = {};
		// entry.description = "Bar chart data set 1";
		// entry.callback    = "loadBarChartData";
		// entry.parameters  = { dataset: 1 };
		// entries.push(entry);

		return entries;
	},

	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
	},

	quit: function() {
		// no additional calls needed.
	},



	blankString: "" // just a place holder

});
