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
			console.log("Debug>" + string);
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
		this.element.style.whiteSpace = "pre";
		// File path trim to just file name
		this.fileName = this.state.file;
		while (this.fileName.indexOf("/") !== -1) {
			this.fileName = this.fileName.substring(this.fileName.indexOf("/") + 1);
		}

		// This should be activated based off of the dragged and dropped file
		if (this.state.file) {
			// all clients need to get the data, not master specific.
			this.element.textContent = "Loading ";
			var _this = this;
			if (this.state.file.indexOf(".json")) {
				this.element.textContent += "\r\njson file:"
				d3.json(this.state.file, function(error, jsObject) {
					if (error) {
						_this.showMessageErrorLoad();
					}
					_this.d3Loaded(jsObject);
				});
			} else if (this.state.file.indexOf(".csv")) {
				this.element.textContent += " csv:" + this.state.file;
				throw new "Error: not implemented yet!";
			} else {
				this.element.textContent = "Unable to load " + this.state.file;
			}
			this.element.textContent += "\r\n" + this.state.file;
		} else {
			this.element.textContent = "No file given...";
		}
	},

	showMessageErrorLoad: function() {
		this.updateTitle("Unable to load " + this.state.file);
		this.element.textContent = "Unable to load " + this.state.file;
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
			this.showMessageErrorLoad();
			return;
		}
		// Put in an array if not already in one.
		if (Array.isArray(jsObject)) {
			this.dataFromFile = jsObject;
		} else {
			this.dataFromFile = [jsObject]; // put in array even if only 1 element
		}
		// if there is more than one element.
		if (this.dataFromFile.length > 1) {
			// Use the first element as the reference object
			jsObject = this.dataFromFile[0];
			// Display information about contents
			this.element.style.fontSize = ui.titleTextSize + "px";
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

			this.broadcastData(); // broadcast before opening charts
			this.analyseAndOpenChart();
		} else { // it was empty?
			this.updateTitle(this.fileName + " (" + this.dataFromFile.length + " elements)");
			var content = "<div style='margin-left:" + ui.titleTextSize + "px'>";
			content += "<h3>Attributes:</h3>";
			content += "<p>";
		}
	},

	/**
	* Broadcast data
	*
	* @method broadcastData
	*/
	broadcastData: function() {
		// function(nameOfValue, value, description) {
		this.csdSetValue(this.id + ":source:" + "datasetSource", this.dataFromFile, "json data loaded from file:" + this.fileName);
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

		var hasTime = null, xAxisAttribute = null, yAxisAttribute = null;
		for (let i = 0; i < keys.length; i++) {
			if (keys[i] === "time" || keys[i] === "date") {
				hasTime = keys[i];
				xAxisAttribute = hasTime;
			}
		}

		// set a random y axis property to plot against, if there is more than one
		if (keys.length > 1) {
			// set a random y axis property to plot against
			var justInCase = 0;
			do {
				yAxisAttribute = keys[this.getRandomInt(0, keys.length)];
				this.dbprint("chosen y attribute:" + yAxisAttribute + " from possible " + keys.length);
				justInCase++;
				if (justInCase > 100) {
					break;
				}
			} while(yAxisAttribute == xAxisAttribute);
		}

		// if has time can open a chart...
		if (hasTime && yAxisAttribute) {
			// function(appName, params, funcToPassParams, x, y)
			var chartValues = {
				data: this.dataFromFile,
				chartType: "Line",
				xAxisAttribute: xAxisAttribute,
				xAxisScale: "scaleTime",
				yAxisAttribute: yAxisAttribute,
				yAxisScale: "scaleLinear"
			};

			// chartValues.chartType = "Line";
			// this.makeChart(chartValues, 60);

			chartValues.chartType = "Scatter";
			this.makeChart(chartValues, 60);

			chartValues.chartType = "Bar"; // bar charts only want counts, right?
			chartValues.xAxisAttribute = chartValues.yAxisAttribute;
			chartValues.xAxisScale = chartValues.yAxisScale;
			this.makeChart(chartValues, 90);

			chartValues.chartType = "Pie";
			chartValues.xAxisAttribute = chartValues.yAxisAttribute;
			chartValues.xAxisScale = chartValues.yAxisScale;
			this.makeChart(chartValues, 120);
		} else {
			console.log("Chart must be build manually");
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

		entry = {};
		entry.description = "Make Bar";
		entry.callback    = "makeChart";
		entry.parameters  = { type: "Bar" };
		entries.push(entry);

		entry = {};
		entry.description = "Make Pie";
		entry.callback    = "makeChart";
		entry.parameters  = { type: "Pie" };
		entries.push(entry);

		entry = {};
		entry.description = "Make Line";
		entry.callback    = "makeChart";
		entry.parameters  = { type: "Line" };
		entries.push(entry);

		return entries;
	},

	/**
	* Makes a chart based on given parameters.
	* Activated by two locations: context and after file load.
	* Context needs to have additional assignment, after fileload should give all needed parts.
	*
	* @method makeChart
	* @param {Object} params - what d3 returns after d3.data() on an element
	* @returns {Integer} posOffset - how far away to make the chart, x and y
	*/
	makeChart: function(params, posOffset) {
		if (this.dataFromFile.length < 1) {
			return; // cannot do anything with no elements.
		}
		var chartValues;
		// check if it came from context menu activation, (clientId is always given)
		if (params.clientId) {
			// for now use first two keys if available
			var keys = Object.keys(this.dataFromFile[0]);
			chartValues = {
				data: this.dataFromFile,
				chartType: params.type,
			};
			if (keys.length > 1) {
				chartValues.xAxisAttribute = keys[0];
				chartValues.yAxisAttribute = keys[1];
			} else {
				chartValues.xAxisAttribute = keys[0];
				chartValues.yAxisAttribute = keys[0];
			}
		} else { // if activated after file, this will be given necessary data
			chartValues = params;
		}
		this.csdLaunchAppWithValues("d3Charts", { chartValues: chartValues },
			undefined, // no post launch function activation
			this.sage2_x + posOffset, this.sage2_y + posOffset);
	},

	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
	},

	quit: function() {
		// no additional calls needed.
	},

	blankString: "" // just a place holder

});
