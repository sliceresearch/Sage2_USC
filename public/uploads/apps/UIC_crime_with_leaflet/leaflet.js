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

// sample app using leaflet to grab and maniuplate map layers
// with an overlay of chicago crime data for the last year near UIC campus
//
// written by Andy Johnson 2014
// adapted from http://bl.ocks.org/d3noob/9267535
//
// currently:
//     app has two map sources - could have more
//     app only reads in data at launch - could re-load every 12 hours
//     app shows all crimes in past year the same - could make current less transparent

/* global d3, SAGE2_policeDistricts, L */

function addCSS(url, callback) {
	var fileref = document.createElement("link");

	if (callback) {
		fileref.onload = callback;
	}

	fileref.setAttribute("rel", "stylesheet");
	fileref.setAttribute("type", "text/css");
	fileref.setAttribute("href", url);
	document.head.appendChild(fileref);
}

var leaflet = SAGE2_App.extend({
	getNewData: function(meSelf, beat, date) {

		if (isMaster) {

			var query = "https://data.cityofchicago.org/resource/x2n5-8w5q.json?beat=".concat(beat);

			d3.json(query, function(collection) {
				meSelf.currentBeats++;

				if (meSelf.currentBeats === 1) {
					meSelf.bigCollection = collection;
				} else {
					meSelf.bigCollection = meSelf.bigCollection.concat(collection);
				}

				// when I have all the data start parsing it
				if (meSelf.currentBeats === meSelf.numBeats) {
					meSelf.dealWithData(meSelf.bigCollection, date);
				}
			});
		}

	},

	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";
		this.svg = null;

		// for SAGE2 interaction
		this.lastZoom = null;
		this.dragging = null;
		this.position = null;

		this.map = null;
		this.map1 = null;
		this.map2 = null;

		this.whichMap = 1;

		this.bigCollection = {};

		this.numBeats = SAGE2_policeDistricts.length;
		this.currentBeats = 0;

		this.g = null;

		this.allLoaded = 0;

		// Get width height from the supporting div
		var myWidth  = this.element.clientWidth;
		var myHeight = this.element.clientHeight;

		this.element.id = "div" + data.id;
		var _this = this;

		this.maxFPS = 0.000023; // once every 12 hours

		// for SAGE2
		this.lastZoom = data.date;
		this.dragging = false;
		this.position = {x: 0, y: 0};

		// store off the current starting point to be able to reset to it later
		// new May 2016
		this.saveStartLat = this.state.center.lat;
		this.saveStartLng = this.state.center.lng;
		this.saveStartZoom = this.state.zoomLevel;

		var mapURL1 = 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
		var mapCopyright1 = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS,' +
			' AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

		var mapURL2 = 'http://{s}.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png';
		var mapCopyright2 = '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors,' +
			' <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';

		// Load the CSS file for leaflet.js
		addCSS(_this.resrcPath + "scripts/leaflet.css", function() {

			_this.map1 = L.tileLayer(mapURL1, {attribution: mapCopyright1});
			_this.map2 = L.tileLayer(mapURL2, {attribution: mapCopyright2});


			// want to do this same thing when we reset the location
			if (_this.state.whichMap === 1) {
				_this.map = L.map(_this.element.id, {layers: [_this.map1], zoomControl: false}).setView(
					[_this.state.center.lat, _this.state.center.lng], _this.state.zoomLevel);
			} else {
				_this.map = L.map(_this.element.id, {layers: [_this.map2], zoomControl: false}).setView(
					[_this.state.center.lat, _this.state.center.lng], _this.state.zoomLevel);
			}

			/* Initialize the SVG layer */
			_this.map._initPathRoot();

			/* We simply pick up the SVG from the map object */
			_this.svg = d3.select(_this.map.getPanes().overlayPane).select("svg");
			_this.g = _this.svg.append("g");

			for (var loopIdx = 0; loopIdx < SAGE2_policeDistricts.length; loopIdx++) {
				_this.getNewData(_this, SAGE2_policeDistricts[loopIdx], data.date);
			}

			// attach the SVG into the this.element node provided to us
			var box = "0,0," + myWidth + "," + myHeight;
			_this.svg = d3.select(_this.element).append("svg")
				.attr("width",   myWidth)
				.attr("height",  myHeight)
				.attr("viewBox", box);
		});

		this.controls.addButton({label: "home", position: 6, identifier: "Home"});
		this.controls.addButton({label: "view", position: 4, identifier: "View"});
		this.controls.addButton({type: "zoom-in", position: 12, identifier: "ZoomIn"});
		this.controls.addButton({type: "zoom-out", position: 11, identifier: "ZoomOut"});
		this.controls.finishedAddingControls(); // Important
	},

	resetMap: function() {
		//this.map.setView([41.869910, -87.65], 17); //original coordinates
		this.map.setView([this.saveStartLat, this.saveStartLng], this.saveStartZoom); // new May 2016
	},

	changeMap: function() {
		var selectedOnes = null;

		if (this.whichMap === 1) {
			this.whichMap = 2;
			this.state.whichMap = 2;
			this.map.removeLayer(this.map1);
			this.map2.addTo(this.map);

			selectedOnes = this.g.selectAll("text");
			selectedOnes.style("fill", "black");
		} else {
			this.whichMap = 1;
			this.state.whichMap = 1;
			this.map.removeLayer(this.map2);
			this.map1.addTo(this.map);

			selectedOnes = this.g.selectAll("text");
			selectedOnes.style("fill", "white");
		}
	},

	zoomIn: function(date) {
		var z = this.map.getZoom();
		if (z <= 19) {
			this.map.setZoom(z + 1, {animate: false});
			this.state.zoomLevel = z + 1; // new 5/2016
		}
		this.lastZoom = date;
		this.refresh(date);
	},

	zoomOut: function(date) {
		var z = this.map.getZoom();
		if (z >= 3) {
			this.map.setZoom(z - 1, {animate: false});
			this.state.zoomLevel = z - 1; // new 5/2016
		}
		this.lastZoom = date;
		this.refresh(date);
	},

	dealWithData: function(collection, today) {
		this.broadcast("dealWithDataNode", {collection: collection, today: today});
	},

	dealWithDataNode: function(data) {

		var collection = data.collection;
		// var today = data.today;

		var parseDate = d3.time.format("%Y-%m-%dT%H:%M:%S").parse;

		// the today that comes along through the function is not in the same format
		// this one will be today in javascript date format

		var today = new Date();

		collection.forEach(function(d) {

			if (d.latitude && d.longitude) {
				if (isNaN(d.latitude)) {
					console.log("latitude is not a number");
				}
				if (isNaN(d.longitude)) {
					console.log("longitude is not a number");
				}
				d.LatLng = new L.LatLng(+d.latitude, +d.longitude);


				// date_of_occurrence : "2013-07-03T09:00:00",
				// date difference is in milliseconds
				d.myDate = parseDate(d.date_of_occurrence);
				d.daysAgo = (today - d.myDate) / 1000 / 60 / 60 / 24; // 7-373

				if (d.daysAgo < 31) {
					d.inLastMonth = 1;
				} else {
					d.inLastMonth = 0;
				}


				d.description = d._primary_decsription;

				switch (d._primary_decsription) {
					case "THEFT":
					case "BURGLARY":
					case "MOTOR VEHICLE THEFT":
					case "ROBBERY":
						d.color = "green";
						break;

					case "ASSAULT":
					case "HOMICIDE":
					case "CRIM SEXUAL ASSAULT":
					case "BATTERY":
						d.color = "red";
						break;

					case "CRIMINAL DAMAGE":
					case "CRIMINAL TRESPASS":
						d.color = "purple";
						break;

					case "NARCOTICS":
						d.color = "pink";
						break;

					case "DECEPTIVE PRACTICE":
						d.color = "orange";
						break;

					default:
						d.color = "grey";
						break;
				}
			} else {
				d.LatLng = new L.LatLng(0, 0);
			}

		});

		var _this = this;

		/* eslint-disable brace-style */
		var feature = this.g.selectAll("circle")
		.data(collection)
		.enter()
		.append("svg:circle")
		.style("stroke", function(d) { if (d.inLastMonth) { return "black"; } else { return "white"; } })
		.style("stroke-width", function(d) { if (d.inLastMonth) { return 6; } else { return 2; } })
		.style("opacity", function(d) { if (d.inLastMonth) { return 1.0; } else { return 0.4; } })
		.style("fill", function(d) { return d.color; })
		.attr("r", 15);

		/* eslint-enable brace-style */

		var myTextColor;
		if (this.whichMap === 2) {
			myTextColor = "black";
		} else {
			myTextColor = "white";
		}


		var feature2 = this.g.selectAll("text")
			.data(collection)
			.enter()
			.append("svg:text")
			.style("fill", myTextColor)
			.style("stroke", function(d) {
				return d.color;
			})
			.style("stroke-width", "1")
			.style("font-size", "30px")
			.style("font-family", "Arial")
			.style("text-anchor", "start")
			.style("font-weight", "bold")
			.text(function(d) {
				if (d.inLastMonth) {
					return d._primary_decsription.toLowerCase();
				}
			});

		this.map.on("viewreset", update);
		update();

		function update() {
			feature.attr("transform",
				function(d) {
					return "translate(" +
						_this.map.latLngToLayerPoint(d.LatLng).x + "," +
						_this.map.latLngToLayerPoint(d.LatLng).y + ")";
				}
			);

			feature2.attr("transform",
				function(d) {
					return "translate(" +
						(_this.map.latLngToLayerPoint(d.LatLng).x + 20.0) + "," +
						(_this.map.latLngToLayerPoint(d.LatLng).y + 5.0) + ")";
				}
			);
		}

		this.allLoaded = 1;
	},


	load: function(date) {
	},

	draw_d3: function(date) {

	},

	draw: function(date) {
		var _this = this;

		if (this.allLoaded === 1) {
			this.currentBeats = 0;

			for (var loopIdx = 0; loopIdx < SAGE2_policeDistricts.length; loopIdx++) {
				_this.getNewData(_this, SAGE2_policeDistricts[loopIdx], date);
			}
		}
	},

	resize: function(date) {
		this.svg.attr('width',  this.element.clientWidth +  "px");
		this.svg.attr('height', this.element.clientHeight + "px");

		this.map.invalidateSize();

		this.refresh(date);
	},

	event: function(eventType, pos, user, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			this.dragging = true;
			this.position.x = pos.x;
			this.position.y = pos.y;
		} else if (eventType === "pointerMove" && this.dragging) {
			// need to turn animation off here or the pan stutters
			this.map.panBy([this.position.x - pos.x, this.position.y - pos.y], {animate: false});
			this.position.x = pos.x;
			this.position.y = pos.y;
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			this.dragging = false;
			this.position.x = pos.x;
			this.position.y = pos.y;

			this.state.center.lat = this.map.getCenter().lat; // new 5/2016
			this.state.center.lng = this.map.getCenter().lng; // new 5/2016
		} else if (eventType === "pointerScroll") {
			var amount = data.wheelDelta;
			var diff = date - this.lastZoom;

			if (amount >= 3 && (diff > 300)) {
				// zoom in
				this.zoomIn(date);
			} else if (amount <= -3 && (diff > 300)) {
				// zoom out
				this.zoomOut(date);
			}
		} else if (eventType === "keyboard" && data.character === "m") {
			// m key down
			// change map type
			this.changeMap();
		} else if (eventType === "widgetEvent") {
			switch (data.identifier) {
				case "Home":
					this.resetMap();
					break;
				case "View":
					this.changeMap();
					break;
				case "ZoomIn":
					this.zoomIn(date);
					break;
				case "ZoomOut":
					this.zoomOut(date);
					break;
				default:
					console.log("No handler for:", data.identifier);
					return;
			}
		}

		this.refresh(date);
	}

});
