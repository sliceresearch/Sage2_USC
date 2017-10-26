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

/* global google svgForegroundForWidgetConnectors */

//
// The instruction.json file contains a default key to access the Google Maps API.
// The key is shared amongst thw whole SAGE2 community (25,000 map loads / day)
// Replace it with your key as soon as possible
//

var googlemaps = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);
		this.element.id = "div" + this.id;

		this.resizeEvents = "continuous"; // "onfinish";
		this.maxFPS = "10";

		this.map          = null;
		this.dragging     = false;
		this.position     = {x: 0, y: 0};
		this.scrollAmount = 0;
		this.trafficTimer = null;
		this.isShift      = false;

		// Create a callback function for traffic updates
		this.trafficCB = this.reloadTiles.bind(this);
		// Create a callback func for checking if Google Maps API is loaded yet
		this.initializeOnceMapsLoadedFunc = this.initializeOnceMapsLoaded.bind(this);

		this.initializeWidgets();
		this.initializeOnceMapsLoaded();

		// vars for plotting data
		this.plotAnyNewGeoSource = false;
		this.mapMarkers = [];
		this.markerCycleIndex = 0;
		// variable broadcasting
		this.broadcastData();
	},

	initializeWidgets: function() {
		this.controls.addButton({type: "traffic", position: 4, identifier: "Traffic"});
		this.controls.addButton({type: "zoom-in", position: 12, identifier: "ZoomIn"});
		this.controls.addButton({type: "zoom-out", position: 11, identifier: "ZoomOut"});
		this.controls.addTextInput({value: "", label: "Addr", identifier: "Address"});

		this.controls.addSlider({
			identifier: "Zoom",
			minimum: 0,
			maximum: 20,
			increments: 1,
			property: "this.state.zoomLevel",
			label: "Zoom",
			labelFormatFunction: function(value, end) {
				return ((value < 10) ? "0" : "") + value + "/" + end;
			}
		});
		this.mapTypeRadioButton = this.controls.addRadioButton({identifier: "MapType",
			label: "Map",
			options: ["Turf", "Roads", "Arial", "Mix"],
			default: "Mix"
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

		var _this  = this;

		// Extra layers
		this.trafficLayer = new google.maps.TrafficLayer();

		if (this.state.layer.t === true) {
			this.trafficLayer.setMap(this.map);
			// add a timer updating the traffic tiles: 60sec
			this.trafficTimer = setInterval(this.trafficCB, 60 * 1000);
		}

		// Passed a GeoJSON file as parameter
		if (this.state.file) {
			// change default rendering
			this.map.data.setStyle({
				fillColor: 'green',
				icon: this.resrcPath + 'dot.png',
				strokeWeight: 1
			});
			// select raodmap
			this.state.mapType = google.maps.MapTypeId.ROADMAP;
			this.map.setMapTypeId(this.state.mapType);
			// zoom to show all the features
			var bounds = new google.maps.LatLngBounds();
			this.map.data.addListener('addfeature', function(e) {
				processPoints(e.feature.getGeometry(), bounds.extend, bounds);
				_this.map.fitBounds(bounds);
			});
			// load GeoJSON and enable data layer
			this.map.data.loadGeoJson(this.state.file);
		}
	},

	updateMapFromState: function() {
		var city = new google.maps.LatLng(this.state.center.lat, this.state.center.lng);
		var mapOptions = {
			center: city,
			zoom: this.state.zoomLevel,
			mapTypeId: this.state.mapType,
			disableDefaultUI: true,
			zoomControl:  false,
			scaleControl: false,
			scrollwheel:  false
		};
		this.map.setOptions(mapOptions);

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
		if (this.map !== undefined && this.map !== null) {
			this.updateMapFromState();
			this.refresh(date);
		}
	},

	draw: function(date) {
		this.updateLinesToSource();
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
		this.state.layer = {t: this.trafficLayer.getMap() != null};
	},

	reloadTiles: function() {
		// Get the image tiles in the maps
		var tiles = this.element.getElementsByTagName('img');
		for (var i = 0; i < tiles.length; i++) {
			// get the URL
			var src = tiles[i].src;
			if (/googleapis.com\/maps\/vt\?pb=/.test(src)) {
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
		this.removeAllLinkLines();
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
			// check if there is a marker under the cursor
			this.showMarkerInfoIfReleasedOver({x: position.x, y: position.y});

			this.refresh(date);
		} else if (eventType === "pointerDblClick") {
			// Double click to zoom in, with shift to zoom out
			if (this.isShift) {
				this.relativeZoom(-1);
			} else {
				this.relativeZoom(1);
			}
		} else if (eventType === "pointerScroll") {
			// Scroll events for zoom
			this.scrollAmount += data.wheelDelta;

			if (this.scrollAmount >= 64) {
				// zoom out
				z = this.map.getZoom();
				this.map.setZoom(z - 1);
				this.state.zoomLevel = this.map.getZoom();
				this.lastZoom = date;

				this.scrollAmount -= 64;
			} else if (this.scrollAmount <= -64) {
				// zoom in
				z = this.map.getZoom();
				this.map.setZoom(z + 1);
				this.state.zoomLevel = this.map.getZoom();
				this.lastZoom = date;

				this.scrollAmount += 64;
			}

			this.refresh(date);
		} else if (eventType === "widgetEvent") {
			switch (data.identifier) {
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
					switch (data.action) {
						case "sliderLock":
							break;
						case "sliderUpdate":
							break;
						case "sliderRelease":
							this.map.setZoom(this.state.zoomLevel);
							break;
						default:
							console.log("GoogleMaps> No handler for: " + data.identifier + "->" + data.action);
							break;
					}
					break;
				case "Address":
					// Async call to geocoder (will sync the state)
					this.codeAddress(data.text);
					// Setting the zoom
					this.map.setZoom(15);
					this.state.zoomLevel = 15;
					break;
				case "MapType":
					this.changeMapType(data.value);
					break;
				default:
					console.log("GoogleMaps> No handler for:", data.identifier);
			}
			this.refresh(date);
		} else if (eventType === "keyboard") {
			if (data.character === "m") {
				// change map type
				this.changeMapType();
			} else if (data.character === "t") {
				this.toggleTraffic();
			}
			this.refresh(date);
		} else if (eventType === "specialKey") {
			if (data.status && data.status.SHIFT) {
				// Shift key
				this.isShift = true;
			} else {
				this.isShift = false;
			}
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

	changeMapType: function(value) {
		var options = [google.maps.MapTypeId.TERRAIN, google.maps.MapTypeId.ROADMAP,
			google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID];
		var i;
		if (value !== null && value !== undefined) {
			// Change due to radio button
			for (i = 0; i < options.length; i++) {
				if (this.mapTypeRadioButton.options[i] === value) {
					this.state.mapType = options[i];
					break;
				}
			}
		} else {
			// Change due to key board
			for (i = 0; i < options.length; i++) {
				if (this.mapTypeRadioButton.options[i] === this.mapTypeRadioButton.value) {
					this.mapTypeRadioButton.value = this.mapTypeRadioButton.options[(i + 1) % options.length];
					this.state.mapType = options[(i + 1) % options.length];
					break;
				}
			}
		}
		this.map.setMapTypeId(this.state.mapType);
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
				var res = results[0].geometry.location;
				// Update the map with the result
				this.map.setCenter(res);
				// Update the state variable
				this.state.center = {lat: res.lat(), lng: res.lng()};
				// Need to sync since it's an async function
				this.SAGE2Sync(true);
			} else {
				console.log('GoogleMaps> Geocode was not successful for the following reason: ' + status);
			}
		}.bind(this));
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

		var entry   = {};
		// label of them menu
		entry.description = "Type Location:";
		// callback
		entry.callback = "setLocation";
		// parameters of the callback function
		entry.parameters     = {};
		entry.inputField     = true;
		entry.inputFieldSize = 20;
		entries.push(entry);

		entry   = {};
		entry.description = "Show me";
		entry.callback = "setLocation";
		entry.parameters     = {};
		entry.inputField     = true;
		entry.inputFieldSize = 20;
		entry.voiceEntryOverload = true;
		entries.push(entry);

		entry   = {};
		entry.description = "go to";
		entry.callback = "setLocation";
		entry.parameters     = {};
		entry.inputField     = true;
		entry.inputFieldSize = 20;
		entry.voiceEntryOverload = true;
		entries.push(entry);

		entry   = {};
		entry.description = "set zoom level";
		entry.callback = "setZoomLevel";
		entry.parameters     = {};
		entry.inputField     = true;
		entry.inputFieldSize = 20;
		entry.voiceEntryOverload = true;
		entries.push(entry);

		entry   = {};
		entry.description = "zoom in";
		entry.callback = "setZoomLevel";
		entry.parameters     = { increase: true };
		entry.voiceEntryOverload = true;
		entries.push(entry);

		entry   = {};
		entry.description = "zoom out";
		entry.callback = "setZoomLevel";
		entry.parameters     = { decrease: true };
		entry.voiceEntryOverload = true;
		entries.push(entry);

		entry   = {};
		entry.description = "zoom to";
		entry.callback = "setZoomLevel";
		entry.parameters     = {};
		entry.inputField     = true;
		entry.inputFieldSize = 20;
		entry.voiceEntryOverload = true;
		entries.push(entry);

		entry = {};
		entry.description = "Save Current Location";
		entry.callback = "setDefault";
		entry.parameters = {};
		entries.push(entry);

		entry = {};
		entry.description = "Load Saved Location";
		entry.callback = "loadDefault";
		entry.parameters = {};
		entries.push(entry);

		entries.push({description: "separator"});

		// toggle for plotting image data.
		if (this.plotAnyNewGeoSource) {
			entry = {};
			entry.description = "Stop Plotting New Image Locations";
			entry.callback = "toggleAutomaticPlot";
			entry.parameters = { plot: false };
			entries.push(entry);
		} else {
			entry = {};
			entry.description = "Plot New Images With Location";
			entry.callback = "toggleAutomaticPlot";
			entry.parameters = { plot: true };
			entries.push(entry);
		}
		// enables cycling between plotted image coordinates
		if (this.mapMarkers.length > 0) {
			entries.push({description: "separator"});
			entry = {};
			// remove marker plots
			entry.description = "Remove All Markers From Map";
			entry.callback = "removeAllMarkersFromMap";
			entry.parameters = {};
			entries.push(entry);
			// even if only 1, allow going to it.
			entry = {};
			entry.description = "Go To Next Marker";
			entry.callback = "focusOnMarkerIndex";
			entry.parameters = { cycle: "next" };
			entries.push(entry);
			entry = {};
			entry.description = "Go To Prevous Marker";
			entry.callback = "focusOnMarkerIndex";
			entry.parameters = { cycle: "previous" };
			entries.push(entry);
		}
		return entries;
	},

	/**
	 * Callback from th web ui menu (right click)
	*/
	setLocation: function(msgParams) {
		// receive an object from the web ui
		// .clientInput for what they typed
		// UHM: 21.299N 157.8179887W,
		// oahu: 21.5N 158W, little right of wahiawa
		if (this.convertIntoLatLngIfCan(msgParams.clientInput)) {
			return;
		}
		this.codeAddress(msgParams.clientInput);
	},

	convertIntoLatLngIfCan: function(line) {
		var lowerCaseLine = line.toLowerCase();
		var words = line.trim().split(" ");

		// search for numbers and direction
		var num1 = false, num2 = false, dir1 = false, dir2 = false;

		// check if searched for a degree value
		if (lowerCaseLine.includes("north") || lowerCaseLine.includes("south") || lowerCaseLine.includes("latitude")) {
			if (lowerCaseLine.includes("east") || lowerCaseLine.includes("west") || lowerCaseLine.includes("longitude")) {
				for (let i = 0; i < words.length; i++) {
					// if this is a number
					if (!isNaN(+words[i])) {
						if (num1 === false) {
							num1 = +words[i];
						} else {
							num2 = +words[i];
						}
					} else if ((words[i] === "north")
						|| (words[i] === "south")
						|| (words[i] === "east")
						|| (words[i] === "west")
						|| (words[i] === "latitude")
						|| (words[i] === "longitude")
					) {
						// if this is a direction
						if (dir1 === false) {
							dir1 = words[i];
						} else {
							dir2 = words[i];
						}
					}
				}
			}
		}

		// if able to get all numbers and directions
		if (num1 && num2 && dir1 && dir2) {
			var centerLatLng = {};
			if (dir1 === "north" || dir1 === "south" || dir1 === "latitude") {
				centerLatLng.lat = num1;
				centerLatLng.lng = num2;
				if (dir1 === "south") {
					centerLatLng.lat *= -1;
				}
				if (dir2 === "west") {
					centerLatLng.lng *= -1;
				}
			} else {
				centerLatLng.lat = num2; // reversed
				centerLatLng.lng = num1;
				if (dir2 === "south") {
					centerLatLng.lat *= -1;
				}
				if (dir1 === "west") {
					centerLatLng.lng *= -1;
				}
			}
			// Update the map with the result
			this.map.setCenter(centerLatLng);
			// Update the state variable
			this.state.center = centerLatLng;
			// Need to sync since it's an async function
			this.SAGE2Sync(true);
			return true;
		}
		return false;
	},

	setZoomLevel: function(responseObject) {
		var zoomValue;
		if (responseObject.increase) {
			zoomValue = this.map.getZoom() + 1;
		} else if (responseObject.decrease) {
			zoomValue = this.map.getZoom() - 1;
		} else {
			// convert input to a number
			zoomValue = +responseObject.clientInput;
			if (isNaN(zoomValue)) {
				var lowerCaseLine = responseObject.clientInput.toLowerCase();
				if (lowerCaseLine.includes("world")
					|| lowerCaseLine.includes("glob")
					|| lowerCaseLine.includes("overview")) {
					zoomValue = 3;
				} else if (lowerCaseLine.includes("country")) {
					zoomValue = 6;
				} else if (lowerCaseLine.includes("province")
					|| lowerCaseLine.includes("prefecture")
					|| lowerCaseLine.includes("region")) {
					zoomValue = 9;
				} else if (lowerCaseLine.includes("city")
					|| lowerCaseLine.includes("town")
					|| lowerCaseLine.includes("district")
					|| lowerCaseLine.includes("territory")) {
					zoomValue = 12;
				} else if (lowerCaseLine.includes("neighborhood")
					|| lowerCaseLine.includes("block")
					|| lowerCaseLine.includes("street")) {
					zoomValue = 15;
				} else if (lowerCaseLine.includes("max")
					|| (lowerCaseLine.includes("close") && lowerCaseLine.includes("up"))
					|| lowerCaseLine.includes("ground")) {
					zoomValue = 20;
				} else {
					return;
				}
			}
		}
		zoomValue = (zoomValue < 1) ? 1 : zoomValue;
		zoomValue = (zoomValue > 20) ? 20 : zoomValue;

		this.map.setZoom(zoomValue);
		this.state.zoomLevel = zoomValue;
	},

	/**
	 * Set default location from app menu
	*/
	setDefault: function(msgParams) {
		// Select current position as default location for the application
		this.saveFile("", "default", "json", JSON.stringify(this.state, null, "\t"));
	},

	/**
	 * Reload the default location
	*/
	loadDefault: function(msgParams) {
		var _this = this;
		// Request the file already saved in the app private folder
		this.loadSavedData("default.json", function(error, data) {
			// Update the map with the result
			_this.map.setCenter(data.center);
			// Update the state variable
			_this.state.center = {lat: data.center.lat, lng: data.center.lng};
			// Setting the zoom
			_this.map.setZoom(data.zoomLevel);
			_this.state.zoomLevel = data.zoomLevel;
			// Set map type
			_this.map.setMapTypeId(data.mapType);
			_this.state.mapType = data.mapType;
			// Set traffic
			if (data.layer.t) {
				_this.trafficLayer.setMap(_this.map);
				clearInterval(_this.trafficTimer);
				_this.trafficTimer = setInterval(_this.trafficCB, 60 * 1000);
			} else {
				_this.trafficLayer.setMap(null);
				clearInterval(_this.trafficTimer);
			}
			// Need to sync since it's an async function
			_this.SAGE2Sync(true);
		});
	},

	//
	// From here is code related to plotting of image geo coordinates
	//

	/**
	 * Menu entry to toggle automatic plotting of images.
	 *
	 * @method toggleAutomaticPlot
	 * @param {Object} responseObject - Mainly used for .plot property.
	 */
	toggleAutomaticPlot: function(responseObject) {
		this.plotAnyNewGeoSource = responseObject.plot;
		this.getFullContextMenuAndUpdate();
	},

	/**
	 * Menu entry to remove all plotted markers.
	 *
	 * @method removeAllMarkersFromMap
	 */
	removeAllMarkersFromMap: function() {
		// if any of the maps have active lines, remove them
		this.removeAllLinkLines();
		for (let i = 0; i < this.mapMarkers.length; i++) {
			this.mapMarkers[i].setMap(null);
		}
		this.mapMarkers = [];
		this.getFullContextMenuAndUpdate();
	},

	/**
	 * Menu entry to center map on a marker.
	 * @method focusOnMarkerIndex
	 * @param {Object} responseObject - Mainly used for .cycle property.
	 */
	focusOnMarkerIndex: function(responseObject) {
		// if there are no markers, cannot focus on it
		if (this.mapMarkers.length <= 0) {
			return;
		}
		// based on which way to cycle
		if (responseObject.cycle === "next") {
			this.markerCycleIndex++;
			if (this.markerCycleIndex >= this.mapMarkers.length) {
				this.markerCycleIndex = 0;
			}
		} else {
			this.markerCycleIndex--;
			if (this.markerCycleIndex < 0) {
				this.markerCycleIndex = this.mapMarkers.length - 1;
			}
		}
		this.map.setCenter(this.mapMarkers[this.markerCycleIndex].markerLocation);
		this.updateCenter();
		this.showMarkerInfoIfReleasedOver({blank: "would have been coordinates"}, this.markerCycleIndex);
		this.refresh(new Date());
	},

	//
	// Marker functions
	//

	/**
	 * Adds a marker to the map
	 * @method addMarkerToMap
	 * @param {Object} markerLocation - Mainly used for .cycle property.
	 * @param {Object} preventViewChange - Mainly used for .cycle property.
	 */
	addMarkerToMap: function(markerLocation, preventViewChange) {
		var _this = this;
		if (typeof markerLocation === "string") {
			var latlng = markerLocation.split(",");
			markerLocation = {
				lat: parseFloat(latlng[0].trim()),
				lng: parseFloat(latlng[1].trim())
			};
		}
		if (typeof markerLocation.lat === "string") {
			// there are at least two different string types
			markerLocation.lat = this.convertDegMinSecDirToSignedDegree(markerLocation.lat);
			markerLocation.lng = this.convertDegMinSecDirToSignedDegree(markerLocation.lng);
		}
		// add marker to map at location
		let markToAdd = new google.maps.Marker({
			position: markerLocation,
			map: this.map
		});
		// add to tracking array to allow removal later
		this.mapMarkers.push(markToAdd);
		markToAdd.markerLocation = markerLocation;
		// always center view on new marker
		if (!preventViewChange) {
			this.map.setCenter(markerLocation);
			this.updateCenter();
		}
		// add info window if it doesn't exist
		if (this.gmapInfoWindow === undefined || this.gmapInfoWindow === null) {
			this.gmapInfoWindow = new google.maps.InfoWindow();
			google.maps.event.addListener(this.gmapInfoWindow, 'closeclick', function() {
				_this.removeAllLinkLines();
			});
		}
		// add overlay for this map if doesn't exist
		if (this.gmapOverlay === undefined || this.gmapOverlay === null) {
			this.gmapOverlay = new google.maps.OverlayView();
			this.gmapOverlay.draw = function() {}; // required?
			this.gmapOverlay.setMap(this.map);
		}
		// update the menu
		this.getFullContextMenuAndUpdate();
	},

	/**
	 * Converts string with degree, minute, second, direction to signed degree.
	 * To avoid being token specific, checks for numbers rather than symbols.
	 * Example coordinates from some images:
	 *
	 * lat: "21 deg 41' 33.14\" N",
	 * lng: "157 deg 50' 55.48\" W"
	 * lat: "19 deg 48' 59.66\" N ",
	 * lng:"156 deg 10' 45.01\" W "
	 * lat:"21 deg 52' 26.86\" N "
	 * lng:"159 deg 27' 22.96\" W "
	 *
	 * @method convertDegMinSecDirToSignedDegree
	 * @param {String} input - Will convert degree with mins and seconds notation to signed degree.
	 */
	convertDegMinSecDirToSignedDegree: function (input) {
		// find the number first, might be prefix fluff
		var index = 0;
		var partIndex = -1;
		var findingNextNumber = true;
		// deg, min, sec, dir
		var parts = ["", "", "", ""];
		// for each of the characters
		while (index < input.length) {
			// if finding next number
			if (findingNextNumber) {
				// if finding next number, but have gone through first 3, want direction
				if (partIndex == 2) {
					if (input.charAt(index) === "N"
						|| input.charAt(index) === "S"
						|| input.charAt(index) === "E"
						|| input.charAt(index) === "W") {
						parts[3] += input.charAt(index);
					}
				} else if (!isNaN(input.charAt(index))) {
					// else if this char is a number moveup part index and stop looking
					partIndex++;
					findingNextNumber = false;
				}
			} // if at the next number, add to the part
			if (!findingNextNumber) {
				// if it is a number or a decimal, add it.
				if (!isNaN(input.charAt(index))
					|| input.charAt(index) === ".") {
					parts[partIndex] += input.charAt(index);
				} else {
					// hitting a non-number or . means in between numbers
					findingNextNumber = true;
				}
			} // always increase the index
			index++;
		}
		// for all but the direction, convert to floats
		for (let i = 0; i < parts.length - 1; i++) {
			parts[i] = parseFloat(parts[i]);
		}
		var justDegrees = parts[0];
		justDegrees += parts[1] / 60;
		justDegrees += parts[2] / (60 * 60);

		// flip the sign depending on which direction the count was in
		if (parts[3] == "S" || parts[3] == "W") {
			justDegrees = justDegrees * -1;
		}
		return justDegrees;
	},

	/**
	 * Will check each marker to see if under the pointer
	 * @method showMarkerInfoIfReleasedOver
	 * @param {Object} releasePoint - Mainly used for .cycle property.
	 * @param {Object} indexMatcher - Mainly used for .cycle property.
	 */
	showMarkerInfoIfReleasedOver: function(releasePoint, indexMatcher) {
		var mpos;
		for (let i = 0; i < this.mapMarkers.length; i++) {
			// this will get the position relative to app top left corner
			mpos = this.gmapOverlay.getProjection().fromLatLngToContainerPixel(this.mapMarkers[i].position);
			// if clicking by the marker, or matches indexMatcher
			if ((indexMatcher !== undefined && indexMatcher === i)
				|| ((releasePoint.x > mpos.x - 15)
				&& (releasePoint.x < mpos.x + 15)
				&& (releasePoint.y > mpos.y - 45)
				&& (releasePoint.y < mpos.x + 5))) {
				// these values are estimated based on Mokulua site.
				this.removeAllLinkLines();
				// create a line to source app
				let said = this.mapMarkers[i].markerLocation.sourceAppId;
				let svgLine = svgForegroundForWidgetConnectors.line(0, 0, 0, 0);
				this.mapMarkers[i].s2lineLink = svgLine;
				svgLine.attr({
					id: this.id + "syncLineFor" + said,
					strokeWidth: ui.widgetControlSize * 0.18,
					stroke:  "rgba(250,250,250,1.0)"
				});
			}
		}
	},

	//
	// Line functions
	//

	/**
	 * Updates the lines from a marker to the source image.
	 * Called as part of the draw function.
	 * @method updateLinesToSource
	 */
	updateLinesToSource: function() {
		var mpos, borderToleranceForMarkerRemoval = 15;
		// for each marker
		for (let i = 0; i < this.mapMarkers.length; i++) {
			// if there is a line
			if (this.mapMarkers[i].s2lineLink !== null && this.mapMarkers[i].s2lineLink !== undefined) {
				// check if the app still exists
				if (applications[this.mapMarkers[i].markerLocation.sourceAppId] === undefined) {
					// if not, remove the line and move to the next marker
					this.mapMarkers[i].s2lineLink.remove();
					continue;
				}
				mpos = this.gmapOverlay.getProjection().fromLatLngToContainerPixel(this.mapMarkers[i].position);
				// if the marker is too close or off the view, remove it
				if (mpos.x < borderToleranceForMarkerRemoval
					|| mpos.x > this.sage2_width - borderToleranceForMarkerRemoval
					|| mpos.y < borderToleranceForMarkerRemoval
					|| mpos.y > this.sage2_height - borderToleranceForMarkerRemoval) {
					this.mapMarkers[i].s2lineLink.remove();
					continue;
				}
				// if the line and app exist, then redraw
				this.mapMarkers[i].s2lineLink.attr({
					x1: (this.sage2_x + mpos.x),
					y1: (this.sage2_y + mpos.y),
					x2: (applications[this.mapMarkers[i].markerLocation.sourceAppId].sage2_x + 10),
					y2: (applications[this.mapMarkers[i].markerLocation.sourceAppId].sage2_y
						- ui.titleBarHeight + 10)
				});
			}
		}
	},

	/**
	 * If a marker has a link line, remove it from the svg space.
	 * Support function for removeAllMarkersFromMap.
	 * @method removeAllLinkLines
	 */
	removeAllLinkLines: function() {
		for (var i = 0; i < this.mapMarkers.length; i++) {
			if (this.mapMarkers[i].s2lineLink !== null && this.mapMarkers[i].s2lineLink !== undefined) {
				this.mapMarkers[i].s2lineLink.remove();
			}
		}
	},

	//
	// Line functions
	//

	/**
	 * Sets up data handling from server.
	 * Currently just for images.
	 *
	 * @method broadcastData
	 */
	broadcastData: function() {
		if (!isMaster) {
			return; // prevent spamming
		}
		// ask for any new variables that are given to the server
		this.serverDataSubscribeToNewValueNotification("handlerForNewVariableNotification");
	},

	/**
	 * This function will receive notifications of new variables.
	 * If enabled, will grab image data to plot markers.
	 *
	 * @method handlerForNewVariableNotification
	 * @param {Object} addedVar - An object with properties as described below.
	 * @param {Object} addedVar.nameOfValue - Name of the value on server, needed for requesting.
	 * @param {Object} addedVar.description - User defined description.
	 */
	handlerForNewVariableNotification: function(addedVar) {
		if (!isMaster) {
			// prevent spam
			return;
		}
		// if this should plot any new geo data source
		if (this.plotAnyNewGeoSource
			&& addedVar.nameOfValue.indexOf("geoLocation") !== -1
			&& addedVar.nameOfValue.indexOf("source") !== -1
			&& addedVar.description.indexOf("image")  !== -1) {
			this.serverDataGetValue(addedVar.nameOfValue, "makeMarkerGivenImageGeoLocation");
		}
	},

	/**
	 * Requires the image to send data in a particular way.
	 *
	 * @method makeMarkerGivenImageGeoLocation
	 * @param {Object} value - An object with properties as described below.
	 * @param {Object} addedVar.nameOfValue - Name of the value on server, needed for requesting.
	 * @param {Object} addedVar.description - User defined description.
	 */
	makeMarkerGivenImageGeoLocation: function(value) {
		if (Array.isArray(value) && value.length < 1) {
			// don't use empty arrays
			return;
		}
		// all display clients need this to sync correctly
		this.addMarkerToMap({
			lat: value.location.lat,
			lng: value.location.lng,
			sourceAppId: value.source
		});
	}
});

/**
 * Extra function to process the bounds of map when adding data
 *
 * @method     processPoints
 * @param      {Object}    geometry  The geometry
 * @param      {Function}  callback  The callback
 * @param      {Object}    thisArg   The this argument
 */
function processPoints(geometry, callback, thisArg) {
	if (geometry instanceof google.maps.LatLng) {
		callback.call(thisArg, geometry);
	} else if (geometry instanceof google.maps.Data.Point) {
		callback.call(thisArg, geometry.get());
	} else {
		geometry.getArray().forEach(function(g) {
			processPoints(g, callback, thisArg);
		});
	}
}
