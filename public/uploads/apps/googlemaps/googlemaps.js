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

/* global google */

var googlemaps = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);
		this.element.id = "div" + this.id;

		this.resizeEvents = "continuous"; // "onfinish";

		this.map          = null;
		this.dragging     = false;
		this.position     = {x: 0, y: 0};
		this.scrollAmount = 0;
		this.trafficTimer = null;

		// Create a callback function for traffic updates
		this.trafficCB = this.reloadTiles.bind(this);
		// Create a callback func for checking if Google Maps API is loaded yet
		this.initializeOnceMapsLoadedFunc = this.initializeOnceMapsLoaded.bind(this);

		this.initializeWidgets();
		this.initializeOnceMapsLoaded();
	},

	initializeWidgets: function() {
		var mapLabel     = {textual: true, label: "Map", fill: "rgba(250,250,250,1.0)", animation: false};
		var trafficLabel = {textual: true, label: "T",   fill: "rgba(250,250,250,1.0)", animation: false};
		var weatherLabel = {textual: true, label: "W",   fill: "rgba(250,250,250,1.0)", animation: false};

		this.controls.addButton({type: mapLabel,     sequenceNo: 4, id: "Map"});
		this.controls.addButton({type: trafficLabel, sequenceNo: 5, id: "Traffic"});
		this.controls.addButton({type: weatherLabel, sequenceNo: 3, id: "Weather"});
		this.controls.addButton({type: "zoom-in",    sequenceNo: 8, id: "ZoomIn"});
		this.controls.addButton({type: "zoom-out",   sequenceNo: 9, id: "ZoomOut"});
		this.controls.addTextInput({defaultText: "", caption: "Addr", id: "Address"});
		this.controls.addSlider({
			id: "Zoom",
			begin: 0,
			end: 20,
			increments: 1,
			appHandle: this,
			property: "state.zoomLevel",
			caption: "Zoom",
			labelFormatFunction: function(value, end) {
				return ((value < 10) ? "0" : "") + value + "/" + end;
			}
		});

		this.controls.finishedAddingControls();
	},

	initializeOnceMapsLoaded: function() {
		if (window.google === undefined || google.maps === undefined || google.maps.Map === undefined) {
			setTimeout(this.initializeOnceMapsLoadedFunc, 40);
		} else {
			this.initialize();
		}
	},

	initialize: function() {
		google.maps.visualRefresh = true;
		this.geocoder = new google.maps.Geocoder();
		var city = new google.maps.LatLng(this.state.center.lat, this.state.center.lng);
		var mapOptions = {
			center: city,
			zoom: this.state.zoomLevel,
			mapTypeId: this.state.mapType,
			disableDefaultUI: true,
			zoomControl: false,
			scaleControl: false,
			scrollwheel: false
		};
		this.map = new google.maps.Map(this.element, mapOptions);
		this.map.setTilt(45);

		// Extra layers
		this.trafficLayer = new google.maps.TrafficLayer();
		this.weatherLayer = new google.maps.weather.WeatherLayer({
			temperatureUnits: google.maps.weather.TemperatureUnit.FAHRENHEIT
		});

		if (this.state.layer.w === true) {
			this.weatherLayer.setMap(this.map);
		}
		if (this.state.layer.t === true) {
			this.trafficLayer.setMap(this.map);
			// add a timer updating the traffic tiles: 60sec
			this.trafficTimer = setInterval(this.trafficCB, 60 * 1000);
		}
	},

	updateMapFromState: function() {
		var city = new google.maps.LatLng(this.state.center.lat, this.state.center.lng);
		var mapOptions = {
			center: city,
			zoom: this.state.zoomLevel,
			mapTypeId: this.state.mapType,
			disableDefaultUI: true,
			zoomControl: false,
			scaleControl: false,
			scrollwheel: false
		};
		this.map.setOptions(mapOptions);

		// weather layer
		if (this.state.layer.w === true) {
			this.weatherLayer.setMap(this.map);
		} else {
			this.weatherLayer.setMap(null);
		}

		// traffic layer
		if (this.state.layer.t === true) {
			this.trafficLayer.setMap(this.map);
			// add a timer updating the traffic tiles: 60sec
			this.trafficTimer = setInterval(this.trafficCB, 60 * 1000);
		} else {
			this.trafficLayer.setMap(null);
			// remove the timer updating the traffic tiles
			clearInterval(this.trafficTimer);
		}

		this.updateLayers();
	},

	load: function(date) {
		this.updateMapFromState();
		this.refresh(date);
	},

	draw: function(date) {
	},

	resize: function(date) {
		google.maps.event.trigger(this.map, 'resize');
		this.refresh(date);
	},

	updateCenter: function() {
		var c = this.map.getCenter();
		this.state.center = {lat: c.lat(), lng: c.lng()};
	},

	updateLayers: function() {
		// to trigger an 'oberve' event, need to rebuild the layer field
		this.state.layer = {w: this.weatherLayer.getMap() != null,
							t: this.trafficLayer.getMap() != null};
	},

	reloadTiles: function() {
		// Get the image tiles in the maps
		var tiles = this.element.getElementsByTagName('img');
		for (var i = 0; i < tiles.length; i++) {
			// get the URL
			var src = tiles[i].src;
			if (/googleapis.com\/vt\?pb=/.test(src)) {
				// add a date inthe URL will trigger a reload
				var new_src = src.split("&ts")[0] + '&ts=' + (new Date()).getTime();
				tiles[i].src = new_src;
			}
		}
	},

	quit: function() {
		// Make sure to delete the timer when quitting the app
		if (this.trafficTimer) {
			clearInterval(this.trafficTimer);
		}
	},

	event: function(eventType, position, user_id, data, date) {
		var z;

		if (eventType === "pointerPress" && (data.button === "left")) {
			this.dragging = true;
			this.position.x = position.x;
			this.position.y = position.y;

			this.refresh(date);
		} else if (eventType === "pointerMove" && this.dragging) {
			this.map.panBy(this.position.x - position.x, this.position.y - position.y);
			this.updateCenter();
			this.position.x = position.x;
			this.position.y = position.y;

			this.refresh(date);
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			this.dragging = false;
			this.position.x = position.x;
			this.position.y = position.y;

			this.refresh(date);
		} else if (eventType === "pointerScroll") {
			// Scroll events for zoom
			this.scrollAmount += data.wheelDelta;

			if (this.scrollAmount >= 128) {
				// zoom out
				z = this.map.getZoom();
				this.map.setZoom(z - 1);
				this.state.zoomLevel = this.map.getZoom();
				this.lastZoom = date;

				this.scrollAmount -= 128;
			} else if (this.scrollAmount <= -128) {
				// zoom in
				z = this.map.getZoom();
				this.map.setZoom(z + 1);
				this.state.zoomLevel = this.map.getZoom();
				this.lastZoom = date;

				this.scrollAmount += 128;
			}

			this.refresh(date);
		} else if (eventType === "widgetEvent") {
			switch (data.ctrlId){
				case "Map":
					this.changeMapType();
					break;
				case "Weather":
					this.toggleWeather();
					break;
				case "Traffic":
					this.toggleTraffic();
					break;
				case "ZoomIn":
					this.relativeZoom(1);
					break;
				case "ZoomOut":
					this.relativeZoom(-1);
					break;
				case "Zoom":
					switch (data.action){
						case "sliderLock":
							break;
						case "sliderUpdate":
							break;
						case "sliderRelease":
							this.map.setZoom(this.state.zoomLevel);
							break;
						default:
							console.log("No handler for: " + data.ctrlId + "->" + data.action);
							break;
					}
					break;
				case "Address":
					this.codeAddress(data.text);
					this.updateCenter();
					this.map.setZoom(15);
					this.state.zoomLevel = this.map.getZoom();
					break;
				default:
					console.log("No handler for:", data.ctrlId);
			}
		} else if (eventType === "keyboard") {
			if (data.character === "m") {
				// change map type
				this.changeMapType();
			} else if (data.character === "t") {
				this.toggleTraffic();
			} else if (data.character === "w") {
				// add/remove weather layer
				this.toggleWeather();
			}

			this.refresh(date);
		} else if (eventType === "specialKey") {
			if (data.code === 18 && data.state === "down") {      // alt
				// zoom in
				this.relativeZoom(1);
			} else if (data.code === 17 && data.state === "down") { // control
				// zoom out
				this.relativeZoom(-1);
			} else if (data.code === 37 && data.state === "down") { // left
				this.map.panBy(-100, 0);
				this.updateCenter();
			} else if (data.code === 38 && data.state === "down") { // up
				this.map.panBy(0, -100);
				this.updateCenter();
			} else if (data.code === 39 && data.state === "down") { // right
				this.map.panBy(100, 0);
				this.updateCenter();
			} else if (data.code === 40 && data.state === "down") { // down
				this.map.panBy(0, 100);
				this.updateCenter();
			}

			this.refresh(date);
		}
	},
	changeMapType: function() {
		if (this.state.mapType === google.maps.MapTypeId.TERRAIN) {
			this.state.mapType = google.maps.MapTypeId.ROADMAP;
		} else if (this.state.mapType === google.maps.MapTypeId.ROADMAP) {
			this.state.mapType = google.maps.MapTypeId.SATELLITE;
		} else if (this.state.mapType === google.maps.MapTypeId.SATELLITE) {
			this.state.mapType = google.maps.MapTypeId.HYBRID;
		} else if (this.state.mapType === google.maps.MapTypeId.HYBRID) {
			this.state.mapType = google.maps.MapTypeId.TERRAIN;
		} else {
			this.state.mapType = google.maps.MapTypeId.HYBRID;
		}
		this.map.setMapTypeId(this.state.mapType);
	},
	toggleWeather: function() {
		if (this.weatherLayer.getMap() == null) {
			this.weatherLayer.setMap(this.map);
		} else {
			this.weatherLayer.setMap(null);
		}
		this.updateLayers();
	},
	toggleTraffic: function() {
		// add/remove traffic layer
		if (this.trafficLayer.getMap() == null) {
			this.trafficLayer.setMap(this.map);
			// add a timer updating the traffic tiles: 60sec
			this.trafficTimer = setInterval(this.trafficCB, 60 * 1000);
		} else {
			this.trafficLayer.setMap(null);
			// remove the timer updating the traffic tiles
			clearInterval(this.trafficTimer);
		}
		this.updateLayers();
	},
	relativeZoom: function(delta) {
		delta = parseInt(delta);
		delta = (delta > -1) ? 1 : -1;
		var z = this.map.getZoom();
		this.map.setZoom(z + delta);
		this.state.zoomLevel = this.map.getZoom();
	},
	codeAddress: function(text) {
		this.geocoder.geocode({address: text}, function(results, status) {
			if (status === google.maps.GeocoderStatus.OK) {
				this.map.setCenter(results[0].geometry.location);
			} else {
				console.log('Geocode was not successful for the following reason: ' + status);
			}
		}.bind(this));
	}

});
