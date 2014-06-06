// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file


function addScript( url, callback ) {
	var script = document.createElement( 'script' );
	if( callback ) script.onload = callback;
	script.type = 'text/javascript';
	script.src = url;
	document.body.appendChild( script );  
}


var googlemaps = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous"; // "onfinish";
		this.map      = null;
		this.lastZoom = null;
		this.dragging = null;
		this.position = null;
		this.APIKEY   = null;  // google maps developer API key
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

		// application specific 'init'
		this.element.id = "div" + id;

		this.lastZoom = date;
		this.dragging = false;
		this.position = {x:0,y:0};

		// building up the state object
		this.state.mapType   = null;
		this.state.zoomLevel = null;
		this.state.center    = null;
		this.state.layer     = null;

		// need a global handler for the callback (i.e. scope pollution)
		googlemaps_self = this;
		this.APIKEY = "AIzaSyBEngu_3hdR3tzZs6yVKho8LxhkEVkfgcw"; // luc's key
		// load google maps
		addScript('https://maps.googleapis.com/maps/api/js?key=' + this.APIKEY + '&sensor=false&libraries=weather&callback=googlemaps_self.initialize');
	},


	initialize: function() {
		this.log("initialize googlemaps");
		if (this.state.mapType == null)
			this.state.mapType = google.maps.MapTypeId.HYBRID;
		if (this.state.zoomLevel == null)
			this.state.zoomLevel = 8;
		if (this.state.center == null)
			this.state.center = {lat:41.850033, lng:-87.6500523};
		if (this.state.layer == null)
			this.state.layer = {w:false,t:false};

		// Enable the visual refresh
		google.maps.visualRefresh = true;

		var city = new google.maps.LatLng(this.state.center.lat,this.state.center.lng);
		var styles = [
			{
				stylers: [
					{ hue: "#00ffe6" },
					{ saturation: -20 }
				]
			},{
				featureType: "road",
				elementType: "geometry",
				stylers: [
					{ lightness: 100 },
					{ visibility: "simplified" }
				]
			},{
				featureType: "road",
				elementType: "labels",
				stylers: [
					{ visibility: "off" }
				]
			}
		];
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
		//this.map.setOptions({styles: styles});

		//
		// Extra layers
		//
		this.trafficLayer = new google.maps.TrafficLayer();
		this.weatherLayer = new google.maps.weather.WeatherLayer({
			temperatureUnits: google.maps.weather.TemperatureUnit.FAHRENHEIT
		});
		if (this.state.layer.t)
			this.trafficLayer.setMap(this.map);
		else
			this.trafficLayer.setMap(null);
		if (this.state.layer.w)
			this.weatherLayer.setMap(this.map);
		else
			this.weatherLayer.setMap(null);
	},

	load: function(state, date) {
		if (state) {
			this.state.mapType   = state.mapType;
			this.state.zoomLevel = state.zoomLevel;
			this.state.center    = state.center;
			this.state.layer     = state.layer;
		}
	},

	draw: function(date) {
	},

	resize: function(date) {
		google.maps.event.trigger(this.map, 'resize');
		this.refresh(date);
	},

	updateCenter: function () {
		var c = this.map.getCenter();
		this.state.center = {lat:c.lat(), lng:c.lng()};
	},

	updateLayers: function () {
		// to trigger an 'oberve' event, need to rebuild the layer field
		this.state.layer = {w: this.weatherLayer.getMap() != null,
							t: this.trafficLayer.getMap() != null};
	},

	event: function(eventType, user_id, itemX, itemY, data, date) {
		//console.log("div event", eventType, user_id, itemX, itemY, data, date);

		if (eventType === "pointerPress" && (data.button === "left") ) {
			this.dragging = true;
			this.position.x = itemX;
			this.position.y = itemY;
		}
		if (eventType === "pointerMove" && this.dragging ) {
			this.map.panBy(this.position.x-itemX, this.position.y-itemY);
			this.updateCenter();
			this.position.x = itemX;
			this.position.y = itemY;
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
			this.dragging = false;
			this.position.x = itemX;
			this.position.y = itemY;
		}

		// Scroll events for zoom
		if (eventType === "pointerScroll") {
			var amount = data.wheelDelta;
			var diff = date - this.lastZoom;
			if (amount >= 3 && (diff>300)) {
				// zoom in
				var z = this.map.getZoom();
				this.map.setZoom(z+1);
				this.state.zoomLevel = this.map.getZoom();
				this.lastZoom = date;
			}
			else if (amount <= -3 && (diff>300)) {
				// zoom out
				var z = this.map.getZoom();
				this.map.setZoom(z-1);
				this.state.zoomLevel = this.map.getZoom();
				this.lastZoom = date;
			}
		}

		if (eventType == "keyboard" && data.code == 109 && data.state == "down") {
			// m key down
			// change map type
			if (this.state.mapType == google.maps.MapTypeId.TERRAIN)
				this.state.mapType = google.maps.MapTypeId.ROADMAP;
			else if (this.state.mapType == google.maps.MapTypeId.ROADMAP)
				this.state.mapType = google.maps.MapTypeId.SATELLITE;
			else if (this.state.mapType == google.maps.MapTypeId.SATELLITE)
				this.state.mapType = google.maps.MapTypeId.HYBRID;
			else if (this.state.mapType == google.maps.MapTypeId.HYBRID)
				this.state.mapType = google.maps.MapTypeId.TERRAIN;
			else 
				this.state.mapType = google.maps.MapTypeId.HYBRID;
			this.map.setMapTypeId(this.state.mapType);
		}
		if (eventType == "keyboard" && data.code == 116 && data.state == "down") {
			// t key down
			// add/remove traffic layer
			if (this.trafficLayer.getMap() == null)
				this.trafficLayer.setMap(this.map);
			else
				this.trafficLayer.setMap(null);
			this.updateLayers();
		}
		if (eventType == "keyboard" && data.code == 119 && data.state == "down") {
			// w key down
			// add/remove weather layer
			if (this.weatherLayer.getMap() == null)
				this.weatherLayer.setMap(this.map);
			else
				this.weatherLayer.setMap(null);
			this.updateLayers();
		}

		else if (eventType == "specialKey" && data.code == 16 && data.state == "down") {
			// shift down
			// zoom in
			var z = this.map.getZoom();
			this.map.setZoom(z+1);
			this.state.zoomLevel = this.map.getZoom();
		}
		else if (eventType == "specialKey" && data.code == 17 && data.state == "down") {
			// control down
			// zoom out
			var z = this.map.getZoom();
			this.map.setZoom(z-1);
			this.state.zoomLevel = this.map.getZoom();
		}
		else if (eventType == "specialKey" && data.code == 37 && data.state == "down") {
			// left
			this.map.panBy(-100,0);
			this.updateCenter();
		}
		else if (eventType == "specialKey" && data.code == 38 && data.state == "down") {
			// up
			this.map.panBy(0,-100);
			this.updateCenter();
		}
		else if (eventType == "specialKey" && data.code == 39 && data.state == "down") {
			// right
			this.map.panBy(100,0);
			this.updateCenter();
		}
		else if (eventType == "specialKey" && data.code == 40 && data.state == "down") {
			// down
			this.map.panBy(0,100);
			this.updateCenter();
		}
		this.refresh(date);
	}

});
