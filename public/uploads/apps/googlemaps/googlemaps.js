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

		// Markers for map
		this.mapMarkers = [];
		this.markerCycleIndex = 0;

		// temporarily testing how well mouse conversion works
		this.passSAGE2PointerAsMouseEvents = true;

		// testing broadcast capabilities
		this.broadcastData();
		this.lastViewSetTime = Date.now();
		this.plotAnyNewGeoSource = false;
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
			zoomControl: false,
			scaleControl: false,
			scrollwheel: false
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

		if (isMaster) {
			// function(nameOfValue, value, description)
			this.serverDataSetSourceValue("geoLocation", {
				source: this.id,
				location: this.state.center
			});
		}
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
							console.log("No handler for: " + data.identifier + "->" + data.action);
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
					console.log("No handler for:", data.identifier);
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
				this.updateCenter();
				// Update the state variable
				this.state.center = {lat: res.lat(), lng: res.lng()};
				// Need to sync since it's an async function
				this.SAGE2Sync(true);
			} else {
				console.log('Geocode was not successful for the following reason: ' + status);
			}
		}.bind(this));
	},

	/**
	 * Adding a Markers
	 *
	 * This function assumes the data is correctly formatted to have
	 * {
	 *  lat: float,
	 *  lng: float
	 * }
	 */
	addMarkerToMap: function(markerLocation) {
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
		this.map.setCenter(markerLocation);
		this.updateCenter();
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
		// add a click effect to marker. not working?
		google.maps.event.addListener(markToAdd, 'click', function(e) {
			_this.gmapInfoWindow.setContent("Latitude: " + this.markerLocation.lat
											+ "<br>\nLongitude:" + this.markerLocation.lng);
			_this.gmapInfoWindow.open(_this.map, this); // this is the marker
		});
		this.getFullContextMenuAndUpdate();
	},

	/**
	 * Converts string with degree, minute, second, direction. To signed degree.
	 * To avoid being token specific, checks for numbers rather than symbols.
	 * Example coordinates from some images:
	 *
{
	lat: "21 deg 41' 33.14\" N",
	lng: "157 deg 50' 55.48\" W"
}
{
	lat: "19 deg 48' 59.66\" N ",
	lng:"156 deg 10' 45.01\" W "
}
{
	lat:"21 deg 52' 26.86\" N "
	lng:"159 deg 27' 22.96\" W "
}
	 */
	convertDegMinSecDirToSignedDegree: function (input) {
		var index = 0, partIndex = -1; // find the number first, might be prefix fluff
		var findingNextNumber = true;
		var parts = ["", "", "", ""]; // deg, min, sec, dir
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

	removeAllMarkersFromMap: function() {
		// if any of the maps have active lines, remove them
		this.removeAllLinkLines();
		for (let i = 0; i < this.mapMarkers.length; i++) {
			this.mapMarkers[i].setMap(null);
		}
		this.mapMarkers = [];
		this.getFullContextMenuAndUpdate();
	},

	focusOnMarkerIndex: function(responseObject) {
		// if there are no markers, cannot focus on it
		if (this.mapMarkers.length <= 0) {
			return;
		}
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

	// will check each marker to see if under the pointer
	showMarkerInfoIfReleasedOver: function(releasePoint, indexMatcher) {
		var mpos;
		for (let i = 0; i < this.mapMarkers.length; i++) {
			// this will get the position relative to app top left corner
			mpos = this.gmapOverlay.getProjection().fromLatLngToContainerPixel(this.mapMarkers[i].position);
			// if clicking by the marker
			if ((indexMatcher !== undefined && indexMatcher === i) || ((releasePoint.x > mpos.x - 15)
				&& (releasePoint.x < mpos.x + 15)
				&& (releasePoint.y > mpos.y - 45)
				&& (releasePoint.y < mpos.x + 5))) {
				// show the pop up google info window
				google.maps.event.trigger(this.mapMarkers[i], 'click');
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

	// redraw the line.
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
	}, //applications[this.mapMarkers[i].markerLocation.sourceAppId].sage2_height / 2)

	// if a marker has a link line, remove it from the svg space
	removeAllLinkLines: function() {
		for (var i = 0; i < this.mapMarkers.length; i++) {
			if (this.mapMarkers[i].s2lineLink !== null && this.mapMarkers[i].s2lineLink !== undefined) {
				this.mapMarkers[i].s2lineLink.remove();
			}
		}
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
		entry.description = "Type a location:";
		// callback
		entry.callback = "setLocation";
		// parameters of the callback function
		entry.parameters     = {};
		entry.inputField     = true;
		entry.inputFieldSize = 20;
		entries.push(entry);

		entry = {};
		entry.description = "Save current location";
		entry.callback = "setDefault";
		entry.parameters = {};
		entries.push(entry);

		entry = {};
		entry.description = "Load saved location";
		entry.callback = "loadDefault";
		entry.parameters = {};
		entries.push(entry);

		entries.push({description: "separator"});

		// if always plotting, then toggle off
		if (this.plotAnyNewGeoSource) {
			entry = {};
			entry.description = "Stop automatic plotting";
			entry.callback = "toggleAutomaticPlot";
			entry.parameters = {
				plot: false
			};
			entries.push(entry);
		} else {
			entry = {};
			entry.description = "Plot any app that gives geo data";
			entry.callback = "toggleAutomaticPlot";
			entry.parameters = {
				plot: true
			};
			entries.push(entry);
		}

		if (this.mapMarkers.length > 0) {
			entries.push({description: "separator"});

			entry = {};
			entry.description = "Remove all markers from map";
			entry.callback = "removeAllMarkersFromMap";
			entry.parameters = {};
			entries.push(entry);

			if (this.mapMarkers.length > 1) {
				entry = {};
				entry.description = "Go to next marker";
				entry.callback = "focusOnMarkerIndex";
				entry.parameters = {
					cycle: "next"
				};
				entries.push(entry);

				entry = {};
				entry.description = "Go to prevous marker";
				entry.callback = "focusOnMarkerIndex";
				entry.parameters = {
					cycle: "previous"
				};
				entries.push(entry);
			}

		}

		return entries;
	},

	/**
	 * Callback from th web ui menu (right click)
	*/
	setLocation: function(msgParams) {
		// receive an object from the web ui
		// .clientInput for what they typed
		this.codeAddress(msgParams.clientInput);
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

	/**
	 * Function to setup the data handling.
	 *
	 * @method     broadcastData
	 */
	broadcastData: function() {
		if (!isMaster) {
			return; // try to prevent spamming
		}
		// ask for any new variables that are given to the server
		// function(callback, unsubscribe)
		this.serverDataSubscribeToNewValueNotification("handlerForNewVariableNotification");
		// give its own center view to server
		// serverDataBroadcastSource: function(suffix, value, description)
		this.serverDataBroadcastSource("geoLocation", {
			source: this.id,
			location: this.state.center
		}, "the map's center geoLocation value");

		// creates destination variables
		// serverDataBroadcastDestination: function(suffix, value, description, callback)
		this.serverDataBroadcastDestination(
			"geoLocation:markerPlot", [], "plots geo marker on this map", "makeMarkerGivenImageGeoLocation");
		this.serverDataBroadcastDestination(
			"geoLocation:replaceMarkerPlots", [], "clears out current markers and places given", "replaceMarkerPlots");
		this.serverDataBroadcastDestination(
			"geoLocation:viewCenter", [], "this will set the maps center view", "setView");
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
			return; // prevent spam
		}
		// if this should plot any new geo data source
		if (this.plotAnyNewGeoSource
			&& addedVar.nameOfValue.indexOf("geoLocation") !== -1
			&& addedVar.nameOfValue.indexOf("source") !== -1
			&& addedVar.description.indexOf("image") !== -1) {
			// serverDataGetValue: function(nameOfValue, callback)
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
			return; // don't use empty arrays
		}
		// all display clients need this to sync correctly
		this.addMarkerToMap({
			lat: value.location.lat,
			lng: value.location.lng,
			sourceAppId: value.source
		});
	},

	/**
	 * Given an array of geolocations will clear out current markers and plot new ones.
	 *
	 * @method replaceMarkerPlots
	 * @param {Array} value - An array containing locations to plot on map.
	 */
	replaceMarkerPlots: function(value) {
		// clear out all marker plots
		this.removeAllMarkersFromMap();
		// plot the new ones.
		if (!Array.isArray(value)) {
			value = [value]; // put in array for now
		}
		// if cleaning is successful
		if (this.replaceMarkerPlotsHelperFunctionMoveGpsToTop(value)){
			// add to map
			for (let i = 0; i < value.length; i++) {
				this.addMarkerToMap(value[i]);
			}
		}
	},

	/**
	 * This will move values to top level on the array based on prior knowledge of what it is.
	 * Assumes array since it made past the check.
	 *
	 * @method replaceMarkerPlots
	 * @param {Array} value - An array containing locations to plot on map.
	 */
	replaceMarkerPlotsHelperFunctionMoveGpsToTop: function(value){
		var e1 = value[0];
		var unableToPlot = false
		// if it is an object, cannot guarante usage
		if (typeof e1 === "object") {
			var e1keys = Object.keys(value[0]);
			if (e1keys.includes("gps")) {
				if (typeof e1["gps"] === "object") {
					// place gps checks
					if (e1["gps"]["lat"]) {
						// move obj to top level
						for (let i = 0; i < value.length; i++) {
							value[i] = value[i]["gps"];
						}
					} else if (e1["gps"]["latitude"]) {
						// move obj to top level and rename
						for (let i = 0; i < value.length; i++) {
							value[i] = value[i]["gps"];
							value[i].lat = value[i]["gps"]["latitude"];
							value[i].lng = value[i]["gps"]["longitude"]
						}
					} else {
						unableToPlot = true;
					}
				} else if (typeof e1["gps"] === "string"){
					// move string to top level
					for (let i = 0; i < value.length; i++) {
						value[i] = value[i].gps
					}
				} else {
					unableToPlot = true;
				}
			} else if (e1keys.includes("location")) {
				if (typeof e1["location"] === "object") {
					// place gps checks
					if (e1["gps"]["lat"]) {
						// move obj to top level
						for (let i = 0; i < value.length; i++) {
							value[i] = value[i]["gps"];
						}
					} else if (e1["gps"]["latitude"]) {
						// move obj to top level and rename
						for (let i = 0; i < value.length; i++) {
							value[i] = value[i]["gps"];
							value[i].lat = value[i]["gps"]["latitude"];
							value[i].lng = value[i]["gps"]["longitude"]
						}
					} else {
						unableToPlot = true;
					}
				} else if (typeof e1["location"] === "string"){
					// move string to top level
					for (let i = 0; i < value.length; i++) {
						value[i] = value[i].location
					}
				} else {
					unableToPlot = true;
				}
			}
		} else if (typeof e1 === "string") {
			// this would be a check to see if it is a float, float
		} else {
			unableToPlot = true;
		}
		// state unabel to plot
		if (unableToPlot) {
			console.log("googlemaps> Unable to plot " + e1);
			return false;
		}
		return true;
	},
	

	toggleAutomaticPlot: function(responseObject) {
		this.plotAnyNewGeoSource = responseObject.plot;
		this.getFullContextMenuAndUpdate();
	},

	setView: function(serverVar) {
		if (this.lastViewSetTime + 1000 < Date.now()) {
			this.map.setCenter(serverVar.location);
			this.updateCenter();
			this.lastViewSetTime = Date.now();
		}
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
