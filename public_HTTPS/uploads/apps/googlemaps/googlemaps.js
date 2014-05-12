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
		this.resizeEvents = "continuous"; // "onfinish";

		this.map      = null;
		this.mapType  = null;
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

		// need a global handler for the callback (i.e. scope pollution)
		googlemaps_self = this;
		this.APIKEY = "XXXXXX PUT your API KEY XXXXX";
		// load google maps
		addScript('https://maps.googleapis.com/maps/api/js?key=' + this.APIKEY + '&sensor=false&libraries=weather&callback=googlemaps_self.initialize');
	},


	initialize: function() {
		this.mapType = google.maps.MapTypeId.HYBRID;

		// Enable the visual refresh
		google.maps.visualRefresh = true;

		var chicago = new google.maps.LatLng(41.850033, -87.6500523);
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
			center: chicago,
			zoom: 8,
			mapTypeId: this.mapType,
			disableDefaultUI: true,
				zoomControl: false,
				scaleControl: false,
				scrollwheel: false
		};
		this.map = new google.maps.Map(this.element, mapOptions);
		this.map.setTilt(45);
		this.map.setOptions({styles: styles});

		//
		// StreetView API test
		//
		 //var fenway = new google.maps.LatLng(42.345573,-71.098326);
		 //var panoramaOptions = {
		   //position: fenway,
		   //pov: {
		     //heading: 34,
		     //pitch: 10
		   //}
		 //};
		 //var panorama = new  google.maps.StreetViewPanorama(this.element, panoramaOptions);
		 //this.map.setStreetView(panorama);

		//
		// Extra layers
		//
		this.trafficLayer = new google.maps.TrafficLayer();
		this.weatherLayer = new google.maps.weather.WeatherLayer({
			temperatureUnits: google.maps.weather.TemperatureUnit.FAHRENHEIT
		});

	},

	load: function(state, date) {

	},

	draw: function(date) {
		// call super-class 'preDraw'
		arguments.callee.superClass.preDraw.call(this, date);

		// Custom draw code

		// call super-class 'postDraw'
		arguments.callee.superClass.postDraw.call(this, date);
	},

	resize: function(date) {
		google.maps.event.trigger(this.map, 'resize');
		this.draw(date);
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
				this.lastZoom = date;
			}
			else if (amount <= -3 && (diff>300)) {
				// zoom out
				var z = this.map.getZoom();
				this.map.setZoom(z-1);
				this.lastZoom = date;
			}
		}

		if (eventType == "keyboard" && data.code == 109 && data.state == "down") {
			// m key down
			// change map type
			if (this.mapType == google.maps.MapTypeId.TERRAIN)
				this.mapType = google.maps.MapTypeId.ROADMAP;
			else if (this.mapType == google.maps.MapTypeId.ROADMAP)
				this.mapType = google.maps.MapTypeId.SATELLITE;
			else if (this.mapType == google.maps.MapTypeId.SATELLITE)
				this.mapType = google.maps.MapTypeId.HYBRID;
			else if (this.mapType == google.maps.MapTypeId.HYBRID)
				this.mapType = google.maps.MapTypeId.TERRAIN;
			else 
				this.mapType = google.maps.MapTypeId.HYBRID;
			this.map.setMapTypeId(this.mapType);
		}
		if (eventType == "keyboard" && data.code == 116 && data.state == "down") {
			// t key down
			// add/remove traffic layer
			if (this.trafficLayer.getMap() == null) {
				console.log("Setting traffic");
				this.trafficLayer.setMap(this.map);
			}
			else {
				console.log("Removing traffic");
				this.trafficLayer.setMap(null);
			}
		}
		if (eventType == "keyboard" && data.code == 119 && data.state == "down") {
			// w key down
			// add/remove weather layer
			if (this.weatherLayer.getMap() == null)
				this.weatherLayer.setMap(this.map);
			else
				this.weatherLayer.setMap(null);
		}

		else if (eventType == "specialKey" && data.code == 16 && data.state == "down") {
			// shift down
			// zoom in
			var z = this.map.getZoom();
			this.map.setZoom(z+1);
		}
		else if (eventType == "specialKey" && data.code == 17 && data.state == "down") {
			// control down
			// zoom out
			var z = this.map.getZoom();
			this.map.setZoom(z-1);
		}
		else if (eventType == "specialKey" && data.code == 37 && data.state == "down") {
			// left
			this.map.panBy(-100,0);
		}
		else if (eventType == "specialKey" && data.code == 38 && data.state == "down") {
			// up
			this.map.panBy(0,-100);
		}
		else if (eventType == "specialKey" && data.code == 39 && data.state == "down") {
			// right
			this.map.panBy(100,0);
		}
		else if (eventType == "specialKey" && data.code == 40 && data.state == "down") {
			// down
			this.map.panBy(0,100);
		}
		this.draw(date);
	}

});
