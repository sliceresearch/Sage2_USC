// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

//
// Weather across the Continental US Viewer
// example of D3 + GEOjson use
// Written by Andy Johnson - Spring 2014
//

"use strict";

/* global d3 SunCalc */

// could allow clicking on individual elements to change its state
// might also allow people to focus on smaller state level

var USweather = SAGE2_App.extend({

	tempConvert: function(data) {
		// var color_hot           = "#d73027";
		// var color_colder        = "#74add1";
		// var color_warm          = "#fdae61";
		// var color_cool          = "#e0f3f8";

		var color_warmer        = "#f46d43";
		var color_nice          = "#ffffbf";
		var color_cold          = "#abd9e9";
		var color_colderer      = "#4575b4";
		var color_coldererer    = "#AAAAAA"; // "#313695";
		var color_unknown       = "#EEEEEE"; // "#AAAAAA";

		var temp_hot            = 85;
		var temp_nice           = 70;
		var temp_cold           = 60;
		var temp_colderer       = 30;
		var temp_coldererer     = 0;
		// var temp_unknown        = 0;

		var color  = color_unknown;
		var colorb = color_unknown;
		var perc   = 1;

		if (data < 0) {
			color = color_unknown;
			colorb = color_unknown;
			perc  = 1;
		} else if (data < temp_coldererer) {
			color = color_coldererer;
			colorb = color_coldererer;
			perc  = 1;
		} else if (data < temp_colderer) {
			color = color_colderer;
			colorb = color_coldererer;
			perc = (data - temp_coldererer) / (temp_colderer - temp_coldererer);
		} else if (data < temp_cold) {
			color = color_cold;
			colorb = color_colderer;
			perc = (data - temp_colderer) / (temp_cold - temp_colderer);
		} else if (data < temp_nice) {
			color = color_nice;
			colorb = color_cold;
			perc = (data - temp_cold) / (temp_nice - temp_cold);
		} else {
			color = color_warmer;
			colorb = color_nice;
			perc = (data - temp_nice) / (temp_hot - temp_nice);
		}

		if (perc > 1.0) {
			perc = 1.0;
		}
		if (perc < 0.0) {
			perc = 0.0;
		}

		return [color, colorb, perc];
	},


	jsonCallback: function(err, json) {
		if (err)			{
			console.log("error loading in map");
			return;
		}

		var rad = 15;

		// Define path generator
		var path = d3.geoPath().projection(this.gwin.projection);

		// Bind data and create one path per GeoJSON feature
		this.gwin.sampleSVG.selectAll("path")
			.data(json.features)
			.enter()
			.append("path")
			.attr("d", path)
			.style("stroke", "black")
			.style("stroke-width", 2)
			.style("fill", "grey");

		// Chicago
		this.gwin.sampleSVG.append("svg:rect")
			.style("fill", "yellow")
			.style("fill-opacity", 1)
			.style("stroke", "black")
			.attr("x", this.gwin.projection([-87.6500500, 41.8500300])[0] - rad / 2)
			.attr("y", this.gwin.projection([-87.6500500, 41.8500300])[1] - rad / 2)
			.attr("rx", 8)
			.attr("ry", 8)
			.attr("height", rad)
			.attr("width", rad);
	},


	makeCallback: function(lat, lon, weatherOut) {
		this.broadcast("newWeather", {lat: lat, lon: lon, weatherOut: weatherOut});

	},

	newWeather: function(data) {

		var lat = data.lat;
		var lon = data.lon;
		var weatherOut = data.weatherOut;

		var iconSet;
		var weather;
		var weatherIcon;
		var weatherImage;

		if ((weatherOut === null) || (weatherOut.query === null) || (weatherOut.query.results === null) ||
			(weatherOut.query.results.current_observation === null) ||
			(weatherOut.query.results.current_observation.icons === null)) {
			return;
		}

		weather = weatherOut.query.results.current_observation.temp_f;
		iconSet = weatherOut.query.results.current_observation.icons.icon_set;

		if ((weather === null) || (weather === "null") || (iconSet === null)) {
			return;
		}

		weatherIcon = iconSet[8].icon_url;
		var weatherName = weatherIcon.substring(28, weatherIcon.length - 4);
		var currentTime = new Date().getHours() + new Date().getMinutes() / 60;

		if (weatherName === "") {
			weatherName = "unknown";
		}

		weatherImage = this.getCorrectWeatherIcon(weatherName, 0); // day

		// all of these times are computed in the local time of where computation is done
		// ie when Andy does it the numbers are all in Chicago time
		// not the time zone of the lat lon location

		// get today's sunrise and sunset times for a given lat lon today
		var times = SunCalc.getTimes(new Date(), lat, lon);
		var sunrise = times.sunrise.getHours() + times.sunrise.getMinutes() / 60;
		var sunset = times.sunset.getHours() + times.sunset.getMinutes() / 60;

		// correct for hawaii among others
		// need to improve this for more generality
		if (sunset < 12) {
			sunset += 24;
		}

		// if its night then swap out the sun icons for the moon icons
		if ((currentTime < sunrise) || (currentTime > sunset))			{
			if ((weatherName === "mostlycloudy") || (weatherName === "partlycloudy") ||
				(weatherName === "clear"))				{
				weatherImage = this.getCorrectWeatherIcon(weatherName, 1); // night
			}
		}

		if (this.gwin.numIconsLoaded === 16) {
			this.drawEverything(lat, lon, weather, weatherImage.src);
		}
	},

	updateOutsideTemp: function() {
		var lat, lon;
		var _this = this;
		var replace;

		/* eslint-disable max-len */
		var url_part0 = "https://query.yahooapis.com/v1/public/";
		var url_part1 = "yql?q=select%20temp_f%2C%20weather%2C%20icons%20from%20wunderground.currentobservation%20where%20location%3D'";
		var url_part2 = "'%3B&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";

		/* eslint-enable max-len */

		function getData(plat, plon, preplace) {
			if (preplace === 1) {
				plat = 21.307;
				plon = -157.858;
			} else if (preplace === 2) {
				plat = 61.218;
				plon = -149.90;
			}

			plon = plon.toFixed(3);
			plat = plat.toFixed(3);
			d3.json(url_part0 + url_part1 + plat + "," + plon + url_part2,
				function(err, response) {
					if (err) {
						console.log("NO DATA at " + plat + " " + plon);
						return;
					}
					_this.makeCallbackFunc(plat, plon, response);
				}
			);
		}

		if (isMaster) {

			for (lat = this.gwin.latMaxTemp; lat >= this.gwin.latMinTemp; lat -= 2.2) {
				for (lon = this.gwin.lonMinTemp; lon <= this.gwin.lonMaxTemp; lon += 2.7) {
					replace = 0;

					// replace some of the coverage area SW of Texas with Honolulu
					if ((lat < 29.15) && (lon < -103.5)) {
						replace = 1;
					}

					// replace some of the coverage area SW of Texas with Anchorage
					if ((lat < 31.13) && (lon < -106.7)) {
						replace = 2;
					}

					// replace some of the coverage sw of LA area with Anchorage
					if ((lat < 33.78) && (lon < -118.98)) {
						replace = 2;
					}

					// replace some of the coverage area SE of New York with Honolulu
					if ((lat < 40.296) && (lon > -73.367)) {
						replace = 1;
					}

					// replace some of the coverage area SE of the carloinas with Honolulu
					if ((lat < 43.707) && (lon > -69.038)) {
						replace = 1;
					}

					// replace some of the coverage area SE of the carloinas with Honolulu
					if ((lat < 32.769) && (lon > -79.651)) {
						replace = 1;
					}

					// replace some of the coverage area SE of the Maine with Honolulu
					if ((lat < 33.32) && (lon > -78.00)) {
						replace = 1;
					}

					if (Math.random() > 0.80) {
						// cut down on accesses at once
						// cut down less now that just master is fetching
						getData(lat, lon, replace);
					}
				}
			}
		}
	},

	nextMode: function() {
		this.state.mode = this.state.mode + 1;
		if (this.state.mode > 2) {
			this.state.mode = 0;
		}

		if (this.state.mode === 0) {
			this.convertToTemp();
		} else if (this.state.mode === 1) {
			this.convertToIcon();
		} else {
			this.convertToNone();
		}
	},

	drawBox: function(boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut) {
		this.gwin.sampleSVG.append("svg:rect")
			.style("stroke", "black")
			.style("fill", colorOut)
			.style("fill-opacity", percOut)
			.attr("x", boxLocX)
			.attr("y", boxLocY)
			.attr("rx", 8)
			.attr("ry", 8)
			.attr("height", boxHeight)
			.attr("width", boxWidth);
	},

	drawText: function(textVisibility, nodeToAddTo, textLocX, textLocY, theText, textFontSize) {
		var displayFont = "Arial";
		var drawTempText;
		var tempToShow;

		drawTempText = "#000";

		if (this.gwin.itsF === "C") {
			tempToShow = (Math.round((parseInt(theText) - 32) * 5 / 9));
		} else {
			tempToShow = theText; // F by default
		}

		nodeToAddTo.append("svg:text")
			.attr("visibility", textVisibility)
			.attr("id", this.gwin.appID + "IDtext")
			.attr("x", textLocX)
			.attr("y", textLocY)
			.style("fill", drawTempText)
			.style("font-size", textFontSize)
			.style("font-family", displayFont)
			.style("text-anchor", "middle")
			.text(tempToShow);
	},

	drawEverything: function(lat, lon, weather, iconSrc) {
		var c, colorOut, colorOutb, percOut;

		// var mapWidth  = this.gwin.canvasWidth;
		// var mapHeight = this.gwin.canvasHeight;

		if ((lat === null) || (lon === null) || (weather === null) || (weather === "null") || (iconSrc === null)) {
			return;
		}

		var xLoc = this.gwin.projection([lon, lat])[0];
		var yLoc = this.gwin.projection([lon, lat])[1];

		c = this.tempConvert(weather);
		colorOut = c[0];
		colorOutb = c[1];
		percOut = c[2];

		// add a named group in for each one
		var myName = this.gwin.appID + "loc" + Math.round(lat).toString() + Math.round(lon).toString();

		if (d3.select("#" + myName).node() !== null) {
			d3.select("#" + myName).node().remove();
		}

		var oneLocation = this.gwin.sampleSVG.append("svg:g")
			.attr("id", myName)
			.attr("class", "node");

		oneLocation.append("svg:rect")
			.style("fill", colorOut)
			.style("fill-opacity", percOut)
			.style("stroke", "black")
			.attr("x", xLoc)
			.attr("y", yLoc)
			.attr("rx", 8)
			.attr("ry", 8)
			.attr("height", this.gwin.boxSize)
			.attr("width", this.gwin.boxSize);

		oneLocation.append("svg:rect")
			.style("fill", colorOutb)
			.style("fill-opacity", (1 - percOut))
			.style("stroke", "black")
			.attr("x", xLoc)
			.attr("y", yLoc)
			.attr("rx", 8)
			.attr("ry", 8)
			.attr("height", this.gwin.boxSize)
			.attr("width", this.gwin.boxSize);

		var textVisibility;
		var iconVisibility;

		if (this.state.mode === 0) {
			textVisibility = "visible";
			iconVisibility = "hidden";
		} else if (this.state.mode === 1) {
			textVisibility = "hidden";
			iconVisibility = "visible";
		} else {
			textVisibility = "hidden";
			iconVisibility = "hidden";
		}

		this.drawText(textVisibility, oneLocation, xLoc + this.gwin.boxSize * 0.5, yLoc + this.gwin.boxSize * 0.75, weather, 20);

		oneLocation.append("svg:image")
			.attr("visibility", iconVisibility)
			.attr("id", this.gwin.appID + "IDicon")
			.attr("xlink:href", iconSrc)
			.attr("opacity", 1)
			.attr("x", xLoc + this.gwin.boxSize * 0.1)
			.attr("y", yLoc + this.gwin.boxSize * 0.1)
			.attr("width", this.gwin.boxSize * 0.8)
			.attr("height", this.gwin.boxSize * 0.8);
	},

	updateWindow: function() {
		// Get width height from the supporting div
		var divWidth  = this.element.clientWidth;
		var divHeight = this.element.clientHeight;

		// set background color for areas around my app (in case of non-proportional scaling)
		this.element.style.backgroundColor =  "black";

		var box = "0,0," + this.gwin.canvasWidth + "," + this.gwin.canvasHeight;

		this.gwin.sampleSVG
			.attr("width",   divWidth)
			.attr("height",  divHeight)
			.attr("viewBox", box)
			.attr("preserveAspectRatio", "xMinYMin meet");
	},

	convertToTemp: function() {
		var selectedOnes = null;

		selectedOnes = d3.selectAll("#" + this.gwin.appID + "IDtext");
		selectedOnes.attr("visibility", "visible");

		selectedOnes = d3.selectAll("#" + this.gwin.appID + "IDicon");
		selectedOnes.attr("visibility", "hidden");

		this.state.mode = 0;
	},

	convertToIcon: function() {
		var selectedOnes = null;


		selectedOnes = d3.selectAll("#" + this.gwin.appID + "IDtext");
		selectedOnes.attr("visibility", "hidden");

		selectedOnes = d3.selectAll("#" + this.gwin.appID + "IDicon");
		selectedOnes.attr("visibility", "visible");

		this.state.mode = 1;
	},

	convertToNone: function() {
		var selectedOnes = null;

		selectedOnes = d3.selectAll("#" + this.gwin.appID + "IDtext");
		selectedOnes.attr("visibility", "hidden");

		selectedOnes = d3.selectAll("#" + this.gwin.appID + "IDicon");
		selectedOnes.attr("visibility", "hidden");

		this.state.mode = 2;
	},

	getCorrectWeatherIcon: function(weatherCondition, night) {
		if (night === 1) {
			switch (weatherCondition) {
				case "mostlycloudy": return (this.gwin.iconmostlycloudynight);
				case "partlycloudy": return (this.gwin.iconpartlycloudynight);
				case "clear":       return (this.gwin.iconclearnight);
			}
		} else {
			switch (weatherCondition) {
				case "snow":        return (this.gwin.iconsnow);
				case "unknown":     return (this.gwin.iconunknown);
				case "storms":      return (this.gwin.iconstorms);
				case "tstorms":     return (this.gwin.icontstorms);
				case "mostlycloudy": return (this.gwin.iconmostlycloudy);
				case "partlycloudy": return (this.gwin.iconpartlycloudy);

				case "rain":        return (this.gwin.iconrain);
				case "fog":         return (this.gwin.iconfog);
				case "hazy":        return (this.gwin.iconhazy);
				case "sleet":       return (this.gwin.iconsleet);
				case "cloudy":      return (this.gwin.iconcloudy);
				case "clear":       return (this.gwin.iconclear);
				case "sunny":       return (this.gwin.iconsunny);
			}
		}
	},

	// load in all of the weather icons at startup time
	loadInIcons: function() {
		var path = this.resrcPath + "icons/";
		var _this = this;

		/* eslint-disable brace-style */
		this.gwin.iconmostlycloudynight.src     = path + "mostlycloudy-night.svg";
		this.gwin.iconmostlycloudynight.onload  = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconpartlycloudynight.src     = path + "partlycloudy-night.svg";
		this.gwin.iconpartlycloudynight.onload  = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconclearnight.src            = path + "clear-night.svg";
		this.gwin.iconclearnight.onload         = function() {_this.gwin.numIconsLoaded++; };


		this.gwin.iconsnow.src          = path + "snow.svg";
		this.gwin.iconsnow.onload       = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconunknown.src       = path + "unknown.svg";
		this.gwin.iconunknown.onload    = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconstorms.src        = path + "storms.svg";
		this.gwin.iconstorms.onload     = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.icontstorms.src       = path + "tstorms.svg";
		this.gwin.icontstorms.onload    = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconmostlycloudy.src  = path + "mostlycloudy.svg";
		this.gwin.iconmostlycloudy.onload = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconpartlycloudy.src  = path + "partlycloudy.svg";
		this.gwin.iconpartlycloudy.onload = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconrain.src          = path + "rain.svg";
		this.gwin.iconrain.onload       = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconfog.src           = path + "fog.svg";
		this.gwin.iconfog.onload        = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconhazy.src          = path + "hazy.svg";
		this.gwin.iconhazy.onload       = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconsleet.src         = path + "sleet.svg";
		this.gwin.iconsleet.onload      = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconcloudy.src        = path + "cloudy.svg";
		this.gwin.iconcloudy.onload     = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconclear.src         = path + "clear.svg";
		this.gwin.iconclear.onload      = function() {_this.gwin.numIconsLoaded++; };
		this.gwin.iconsunny.src         = path + "sunny.svg";
		this.gwin.iconsunny.onload      = function() {_this.gwin.numIconsLoaded++; };

		/* eslint-enable brace-style */
	},

	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // onfinish
		this.svg = null;

		// Need to set this to true in order to tell SAGE2 that you will be needing widget controls for this app
		this.enableControls = true;

		this.gwin = {};
		this.gwin.canvasWidth = 1200;
		this.gwin.canvasHeight = 800;

		this.gwin.sampleSVG = null;

		this.gwin.latMinTemp = 26.5;
		this.gwin.latMaxTemp = 48.5;

		this.gwin.lonMinTemp = -124;
		this.gwin.lonMaxTemp = -67;

		this.gwin.boxSize = 35;

		this.gwin.appID = "";

		this.appName = "evl_photos:";

		this.gwin.projection = null;

		this.gwin.iconmostlycloudynight = new Image();
		this.gwin.iconpartlycloudynight = new Image();
		this.gwin.iconclearnight        = new Image();
		this.gwin.iconsnow              = new Image();
		this.gwin.iconunknown           = new Image();
		this.gwin.iconstorms            = new Image();
		this.gwin.icontstorms           = new Image();
		this.gwin.iconmostlycloudy      = new Image();
		this.gwin.iconpartlycloudy      = new Image();
		this.gwin.iconrain              = new Image();
		this.gwin.iconfog               = new Image();
		this.gwin.iconhazy              = new Image();
		this.gwin.iconsleet             = new Image();
		this.gwin.iconcloudy            = new Image();
		this.gwin.iconclear             = new Image();
		this.gwin.iconsunny             = new Image();

		this.gwin.numIconsLoaded = 0;

		this.makeCallbackFunc = this.makeCallback.bind(this);
		this.jsonCallbackFunc = this.jsonCallback.bind(this);

		this.gwin.projection = d3.geoAlbersUsa()
			.translate([this.gwin.canvasWidth / 2, this.gwin.canvasHeight / 2])
			.scale([1500]);// default 1000


		// Load in GeoJSON data
		d3.json(this.resrcPath + "./us-states.json", this.jsonCallbackFunc);

		this.gwin.appID = this.div.id;
		// Looks like D3 (or DOM) doesn't like our remote ids
		this.gwin.appID = this.gwin.appID.replace(/\+/g, '_');
		this.gwin.appID = this.gwin.appID.replace(/:/g, '_');

		this.maxFPS = 0.1;

		this.loadInIcons();

		// Get width height from the supporting div
		var divWidth  = this.element.clientWidth;
		var divHeight = this.element.clientHeight;

		this.element.id = "div" + data.id;

		// attach the SVG into the this.element node provided to us
		var box = "0,0," + this.gwin.canvasWidth + "," + this.gwin.canvasHeight;
		this.svg = d3.select(this.element).append("svg:svg")
			.attr("width",   divWidth)
			.attr("height",  divHeight)
			.attr("viewBox", box)
			.attr("preserveAspectRatio", "xMinYMin meet");
		this.gwin.sampleSVG = this.svg;

		this.drawBox(0, 0, this.gwin.canvasHeight, this.gwin.canvasWidth, "black", 1);

		this.draw_d3(data.date);

		this.controls.addButton({label: "Temp", position: 4, identifier: "Temperature"});
		this.controls.addButton({label: "Icon", position: 2, identifier: "Icon"});
		this.controls.addButton({label: "Color", position: 12, identifier: "Color"});
		this.controls.finishedAddingControls(); // Important
	},

	load: function(date) {
		this.refresh(date);
	},

	draw_d3: function(date) {

		this.updateOutsideTemp();
		this.updateWindow();
	},

	draw: function(date) {
		this.updateOutsideTemp();
	},

	resize: function(date) {
		this.svg.attr('width',  parseInt(this.element.clientWidth, 10) + "px");
		this.svg.attr('height', parseInt(this.element.clientHeight, 10)  + "px");

		this.updateWindow();
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

		entry = {};
		entry.description = "Color";
		entry.callback = "changeView";
		entry.parameters = {};
		entry.parameters.page = "color";
		entries.push(entry);

		entry = {};
		entry.description = "Weather";
		entry.callback = "changeView";
		entry.parameters = {};
		entry.parameters.page = "weather";
		entries.push(entry);

		entry = {};
		entry.description = "Temperature";
		entry.callback = "changeView";
		entry.parameters = {};
		entry.parameters.page = "temperature";
		entries.push(entry);

		return entries;
	},

	/**
	* Support function to allow page changing through right mouse context menu.
	*
	* @method changeThePage
	* @param responseObject {Object} contains response from entry selection
	*/
	changeView: function(responseObject) {
		var page = responseObject.page;

		if (page === "color") {
			this.state.mode = 2;
			this.convertToNone();
			// this.refresh(date);
		}
		if (page === "weather") {
			this.state.mode = 1;
			this.convertToIcon();
			// this.refresh(date);
		}
		if (page === "temperature") {
			this.state.mode = 0;
			this.convertToTemp();
			// this.refresh(date);
		}

		// This needs to be a new date for the extra function.
		this.refresh(new Date(responseObject.serverDate));
	},

	event: function(eventType, pos, user, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			// pointer press
		} else if (eventType === "pointerMove") {
			// pointer move
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			this.nextMode();
			this.refresh(date);
		} else if (eventType === "widgetEvent") {
			switch (data.identifier) {
				case "Temperature":
					this.state.mode = 0;
					this.convertToTemp();
					this.refresh(date);
					break;
				case "Icon":
					this.state.mode = 1;
					this.convertToIcon();
					this.refresh(date);
					break;
				case "Color":
					this.state.mode = 2;
					this.convertToNone();
					this.refresh(date);
					break;
				default:
					console.log("No handler for:", data.identifier);
					return;
			}
		}
	}

});
