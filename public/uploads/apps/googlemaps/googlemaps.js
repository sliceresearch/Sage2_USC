// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


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
		this.map          = null;
		this.lastZoom     = null;
		this.dragging     = null;
		this.position     = null;
		this.scrollAmount = null;
		this.trafficTimer = null;
		this.trafficCB    = null;

	},

	init: function(data) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, "div", data);

		// application specific 'init'
		this.element.id = "div" + data.id;

		this.lastZoom     = data.date;
		this.dragging     = false;
		this.position     = {x:0, y:0};
		this.scrollAmount = 0;

		this.zoomFactor = null;
		// building up the state object
		this.state.mapType   = null;
		this.state.zoomLevel = null;
		this.state.center    = null;
		this.state.layer     = null;

		// Create a callback function for traffic updates
		this.trafficCB = this.reloadTiles.bind(this);

		// need a global handler for the callback (i.e. scope pollution)
		googlemaps_self = this;
		// load google maps
		addScript('https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&libraries=weather&callback=googlemaps_self.initialize');
		this.controls.addButton({type:"prev",sequenceNo:7,action:function(date){ 
			this.map.panBy(-100,0);
			this.updateCenter();
		}.bind(this)});
		this.controls.addButton({type:"next",sequenceNo:1,action:function(date){ 
			this.map.panBy(100,0);
			this.updateCenter();
		}.bind(this)});
		this.controls.addButton({type:"up-arrow",sequenceNo:4,action:function(date){ 
			this.map.panBy(0,-100);
			this.updateCenter();
		}.bind(this)});
		this.controls.addButton({type:"down-arrow",sequenceNo:10,action:function(date){ 
			this.map.panBy(0,100);
			this.updateCenter();
		}.bind(this)});
		/*this.controls.addSlider({
			begin:8,
			end:20,
			increments:1,
			appHandle:this, 
			property:"state.zoomLevel", 
			labelFormatFunction:function(value,end){
				return ((value<10)?"0":"") + value + "/" + end;
			},
			lockAction:function(date){
			}, 
			updateAction:function(date){
			}, 
			action:function(date){
				this.map.setZoom(this.state.zoomLevel);
			}.bind(this)
		});	*/
		this.controls.addButton({type:"zoom-in",sequenceNo:5,action:function(date){ 
			var z = this.map.getZoom();
			this.map.setZoom(z+1);
			this.state.zoomLevel = this.map.getZoom();
		}.bind(this)});
		this.controls.addButton({type:"zoom-out",sequenceNo:6,action:function(date){ 
			var z = this.map.getZoom();
			this.map.setZoom(z-1);
			this.state.zoomLevel = this.map.getZoom();
		}.bind(this)});
		var mapLabel =  { "textual":true, "label":"Map", "fill":"rgba(250,250,250,1.0)", "animation":false};
		this.controls.addButton({type:mapLabel,sequenceNo:2,action:function(date){ 
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
		}.bind(this)});
		var trafficLabel = { "textual":true, "label":"T", "fill":"rgba(250,250,250,1.0)", "animation":false};
		this.controls.addButton({type:trafficLabel,sequenceNo:8,action:function(date){ 
			// add/remove traffic layer
			if (this.trafficLayer.getMap() == null) {
				this.trafficLayer.setMap(this.map);
				// add a timer updating the traffic tiles: 60sec
				this.trafficTimer = setInterval(this.trafficCB, 60*1000);
			}
			else {
				this.trafficLayer.setMap(null);
				// remove the timer updating the traffic tiles
				clearInterval(this.trafficTimer);
			}
			this.updateLayers();
		}.bind(this)});
		var weatherLabel = { "textual":true, "label":"W", "fill":"rgba(250,250,250,1.0)", "animation":false};
		this.controls.addButton({type:weatherLabel,sequenceNo:9,action:function(date){ 
			// add/remove weather layer
			if (this.weatherLayer.getMap() == null)
				this.weatherLayer.setMap(this.map);
			else
				this.weatherLayer.setMap(null);
			this.updateLayers();
		}.bind(this)});
			
		this.controls.finishedAddingControls();
	},


	initialize: function() {
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
		if (this.state.layer.t) {
			this.trafficLayer.setMap(this.map);
			// add a timer updating the traffic tiles: 60sec
			this.trafficTimer = setInterval(this.trafficCB, 60*1000);
		}
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
		if (this.trafficTimer) clearInterval(this.trafficTimer);
	},

	event: function(eventType, position, user_id, data, date) {
		//console.log("Googlemaps event", eventType, position, user_id, data, date);

		if (eventType === "pointerPress" && (data.button === "left")) {
			this.dragging = true;
			this.position.x = position.x;
			this.position.y = position.y;
			
			this.refresh(date);
		}
		else if (eventType === "pointerMove" && this.dragging) {
			this.map.panBy(this.position.x-position.x, this.position.y-position.y);
			this.updateCenter();
			this.position.x = position.x;
			this.position.y = position.y;
			
			this.refresh(date);
		}
		else if (eventType === "pointerRelease" && (data.button === "left")) {
			this.dragging = false;
			this.position.x = position.x;
			this.position.y = position.y;
			
			this.refresh(date);
		}

		// Scroll events for zoom
		else if (eventType === "pointerScroll") {
			this.scrollAmount += data.wheelDelta;
			
			if (this.scrollAmount >= 128) {
				// zoom out
				var z = this.map.getZoom();
				this.map.setZoom(z-1);
				this.state.zoomLevel = this.map.getZoom();
				this.lastZoom = date;
				
				this.scrollAmount -= 128;
			}
			else if (this.scrollAmount <= -128) {
				// zoom in
				var z = this.map.getZoom();
				this.map.setZoom(z+1);
				this.state.zoomLevel = this.map.getZoom();
				this.lastZoom = date;
				
				this.scrollAmount += 128;
			}
			
			this.refresh(date);
		}

		else if (eventType === "keyboard") {
			if(data.character === "m") {
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
			else if (data.character === "t") {
				// add/remove traffic layer
				if (this.trafficLayer.getMap() == null) {
					this.trafficLayer.setMap(this.map);
					// add a timer updating the traffic tiles: 60sec
					this.trafficTimer = setInterval(this.trafficCB, 60*1000);
				}
				else {
					this.trafficLayer.setMap(null);
					// remove the timer updating the traffic tiles
					clearInterval(this.trafficTimer);
				}
				this.updateLayers();
			}
			else if (data.character === "w") {
				// add/remove weather layer
				if (this.weatherLayer.getMap() == null)
					this.weatherLayer.setMap(this.map);
				else
					this.weatherLayer.setMap(null);
				this.updateLayers();
			}
			
			this.refresh(date);
		}

		else if (eventType === "specialKey") {
			if (data.code === 18 && data.state === "down") {      // alt
				// zoom in
				var z = this.map.getZoom();
				this.map.setZoom(z+1);
				this.state.zoomLevel = this.map.getZoom();
			}
			else if (data.code === 17 && data.state === "down") { // control
				// zoom out
				var z = this.map.getZoom();
				this.map.setZoom(z-1);
				this.state.zoomLevel = this.map.getZoom();
			}
			else if (data.code === 37 && data.state === "down") { // left
				this.map.panBy(-100,0);
				this.updateCenter();
			}
			else if (data.code === 38 && data.state === "down") { // up
				this.map.panBy(0,-100);
				this.updateCenter();
			}
			else if (data.code === 39 && data.state === "down") { // right
				this.map.panBy(100,0);
				this.updateCenter();
			}
			else if (data.code === 40 && data.state === "down") { // down
				this.map.panBy(0,100);
				this.updateCenter();
			}
			
			this.refresh(date);
		}
	}

});
