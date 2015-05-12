// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

// Forecast.io API
// currently:
	// apparentTemperature: 67.73
	// cloudCover: 0.37
	// dewPoint: 48.23
	// humidity: 0.5
	// icon: "partly-cloudy-night"
	// nearestStormBearing: 207
	// nearestStormDistance: 110
	// ozone: 310.82
	// precipIntensity: 0
	// precipProbability: 0
	// pressure: 1018.1
	// summary: "Partly Cloudy"
	// temperature: 67.73
	// time: 1406251752
	// visibility: 10
	// windBearing: 77
	// windSpeed: 1.74
	// flags.units = 'us'
	// latitude: 41.8784
	// longitude: -87.6852
	// offset: -5
	// timezone: "America/Chicago"



var forecast = SAGE2_App.extend( {
	init: function(data) {
		this.SAGE2Init("div", data);

		this.ctx          = null;
		this.minDim       = null;
		this.resizeEvents = "onfinish";
		this.climacons    = {};
		this.boxWidth     = 100;
		this.xpos         = 5;
		this.needScroll   = false;
		this.city         = null;
		this.location     = null;
		this.updateTimer  = null;
		this.imageId      = null;
		
		this.element.id = "div" + data.id;
		this.element.style.backgroundColor = '#2a2a2a';

		// Frame rate, once per 10 min
		//this.maxFPS = 1.0 / 600.0;
		this.maxFPS = 5;

		// Make the SVG element fill the app
		this.svg = Snap("100%","100%");
		// Adding it to the DOM
		this.element.appendChild(this.svg.node);
		// Sets the scale of the SVG scenegraph: 0 to 100 (make sure it matches aspect ratio from pacakge.json)
		var ratio = 100;
		this.boxWidth = ratio * (data.width/data.height)
		this.svg.attr("viewBox", "0,0,"+this.boxWidth+","+ratio);

		// Lets create a background
		var rectbg = this.svg.rect(0, 0, 100, 100);
		// lets change its attributes
		rectbg.attr({ fill: "#2a2a2a", strokeWidth: 0 });

		// Array of weather icons
		this.climacons.CLEAR_DAY           = "Sun.svg";
		this.climacons.CLEAR_NIGHT         = "Moon.svg";
		this.climacons.PARTLY_CLOUDY_DAY   = "Cloud-Sun.svg";
		this.climacons.PARTLY_CLOUDY_NIGHT = "Cloud-Moon.svg";
		this.climacons.CLOUDY  = "Cloud.svg";
		this.climacons.RAIN    = "Cloud-Rain.svg";
		this.climacons.SLEET   = "Cloud-Drizzle.svg";
		this.climacons.SNOW    = "Cloud-Snow.svg";
		this.climacons.WIND    = "Wind.svg";
		this.climacons.FOG     = "Cloud-Fog.svg";
		this.climacons.DEFAULT = "Cloud-Wind-Sun.svg";

		var location = this.svg.text(50, 25, '-');
		location.attr( { fill: "#CCCCCC", "font-size": "20px", id:"location" });
		location.attr({ fontFamily: 'Arimo', textAnchor: 'left'});

		var bigtemp = this.svg.text(50, 60, 'F');
		bigtemp.attr( { fill: "#CCCCCC", "font-size": "28px", id:"bigtemp" });
		bigtemp.attr({ fontFamily: 'Arimo', textAnchor: 'left'});

		var summary = this.svg.text(this.xpos, 55, '-');
		summary.attr( { fill: "#CCCCCC", "font-size": "8px", id:"summary" });
		summary.attr({ fontFamily: 'Arimo', textAnchor: 'left'});

		var temp = this.svg.text(this.xpos, 65, 'Feels like');
		temp.attr( { fill: "#CCCCCC", "font-size": "6px", id:"temp" });
		temp.attr({ fontFamily: 'Arimo', textAnchor: 'left'});

		var humidity = this.svg.text(this.xpos, 74, 'humidity');
		humidity.attr( { fill: "#CCCCCC", "font-size": "6px", id:"humidity" });
		humidity.attr({ fontFamily: 'Arimo', textAnchor: 'left'});

		var next = this.svg.text(this.xpos, 83, '-');
		next.attr( { fill: "#CCCCCC", "font-size": "6px", id:"next" });
		next.attr({ fontFamily: 'Arimo', fontStyle: 'italic', textAnchor: 'left'});

		var today = this.svg.text(this.xpos, 92, '-');
		today.attr( { fill: "#CCCCCC", "font-size": "6px", id:"today" });
		today.attr({ fontFamily: 'Arimo', fontStyle: 'italic', textAnchor: 'left'});

		// Default location
		this.city     = "Chicago";
		this.location = "41.8784,-87.6852";  // lat,long

		var map_url = "http://maps.googleapis.com/maps/api/staticmap?center="+this.city+"&zoom=10&size=300x300";
		var img = this.svg.image(map_url, (this.boxWidth/2)+25,35, 50,50);
		this.imageId = img;

		var _this = this;

		// Get location information from IP
		//  { ip:, hostname: , city: , region: , country: , loc: , org: , postal: }
		readFile('http://ipinfo.io/json', function (err, response) {
			if (err) this.log('IP location error', err);
			// use the city field as location
			_this.city     = response.city;
			_this.location = response.loc;   // lat,long
		}, "JSON");

		// Build the application menu
		this.controls.addTextInput({caption:"City", id:"City"}); 
		this.controls.finishedAddingControls();

		// Request data
		var dataCB = this.getData.bind(this);
		this.updateTimer = setInterval(dataCB, 30*60*1000); // 30 minutes
		this.getData();
	},

	onData: function(data) {
		// Got some data back
		var iconName = data.currently.icon.toUpperCase().replace(/-/g, "_");
		var iconFile = this.climacons[iconName] || this.climacons.DEFAULT;
		Snap.load(this.resrcPath+"climacons/"+iconFile, function ( svg_data ) {
				// select the path and change color
				svg_data.selectAll("path").attr({fill: "#CCCCCC"});
				// select the svg element and position/scale it
				var g = svg_data.select("svg").attr({id:"icon", x:0,y:0,width:50,height:50});
				var oldicon = this.svg.select("#icon");
				if (oldicon) oldicon.remove();
				// add to the existing svg element
				this.svg.append(g);
		}, this);

		this.svg.select("#location").attr({text: this.city});
		this.svg.select("#bigtemp").attr({text: Math.round(data.currently.temperature) + 'F'});
		this.svg.select("#summary").attr({text: data.currently.summary});
		this.svg.select("#temp").attr({text: 'Feels like ' + Math.round(data.currently.apparentTemperature) + 'F'});
		this.svg.select("#humidity").attr({text: Math.round(data.currently.humidity * 100) + '% humidity'});
		this.svg.select("#next").attr({text: data.hourly.summary});

		var today_text = this.svg.select("#today");
		today_text.attr({text: data.daily.summary});

		var bbox = today_text.getBBox();
		if (bbox.width > this.boxWidth) {
			today_text.attr({text: data.daily.summary + " " + data.daily.summary, cx:this.boxWidth/2});
			this.needScroll = true;
			this.boxWidth = bbox.width;
		}

		// cleanup the JSONP script
		document.head.removeChild(document.getElementById("forecastio_script_" + this.id));
	},

	getData: function() {
		// need a global handler for the callback (i.e. scope pollution)
		forecast_self = this;

		if (this.config.apis && this.config.apis.forecastio && this.config.apis.forecastio.apiKey) {
			// prepare the URL for forecast.io
			var tag = document.createElement("script");
			// put an id so we can find and remove the script later
			tag.id  = "forecastio_script_" + forecast_self.id;
			// put the API key from the configuration of the wall
			var url = 'https://api.forecast.io/forecast/' + forecast_self.config.apis.forecastio.apiKey + '/';
			// put the latitude and longitude
			url += forecast_self.location;
			// add the callback function
			tag.src = url + '?callback=forecast_self.onData';
			// add the whole thing to the page header
			document.getElementsByTagName("head")[0].appendChild(tag);
		}
	},

	load: function(date) {
	},
	
	draw: function(date) {
		if (this.needScroll) {
			var today_text = this.svg.select("#today");
			var bbox = today_text.getBBox();
			if ( bbox.cx < 0) this.xpos = 0; else this.xpos -= 1;
			today_text.transform( new Snap.Matrix().translate(this.xpos,0) ) ;
		}
	},
	
	resize: function(date) {
		// this.refresh(date);
	},
	
	event: function(eventType, userId, x, y, data, date) {
		// this.refresh(date);
		if (eventType === "widgetEvent" && data.ctrlId === "City"){
			this.forcastForNewCity(data.text);
			this.refresh(date);
		}
	},
	forcastForNewCity: function(city){
		this.city = city;
		console.log('Forecast> got new city:', this.city);
		var newmap_url = "http://maps.googleapis.com/maps/api/staticmap?center="+this.city+"&zoom=10&size=300x300";
		this.imageId.attr({href: newmap_url});
		var _this = this;
		readFile('https://maps.googleapis.com/maps/api/geocode/json?address='+this.city,
			function (err, response) {
				if (err) this.log('Gmaps geocoding error', err);
				if (response.results[0]) {
					_this.city      = response.results[0].address_components[0].long_name;
					_this.location  = response.results[0].geometry.location.lat + ',';
					_this.location += response.results[0].geometry.location.lng;
					_this.getData();
				}
		}, "JSON");
	},
	quit: function() {
		this.log('Forecast> quit');
		if (this.updateTimer) clearInterval(this.updateTimer);
	}
});
