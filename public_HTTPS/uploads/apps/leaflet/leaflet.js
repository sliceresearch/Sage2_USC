// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


// sample app using leaflet to grab and maniuplate map layers
// with an overlay of chicago crime data for the last year near UIC campus
//
// written by Andy Johnson 2014
// adapted from http://bl.ocks.org/d3noob/9267535
//
// currently:
//		app has two map sources - could have more
// 		app only reads in data at launch - could re-load every 12 hours
//		app shows all crimes in past year the same - could make current less transparent


function addCSS( url, callback ) {
    var fileref = document.createElement("link");

	if( callback ) fileref.onload = callback;

    fileref.setAttribute("rel", "stylesheet");
    fileref.setAttribute("type", "text/css");
    fileref.setAttribute("href", url);
	document.head.appendChild( fileref );
}


var leaflet = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous"; //"onfinish";
		this.svg      = null;

		// for SAGE2 interaction
		this.lastZoom = null;
		this.dragging = null;
		this.position = null;

		this.map = null;
		this.map1 = null;
		this.map2 = null;

		this.whichMap = 1;
	},


	init: function(id, width, height, resrc, date) {

		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

		// Get width height from the supporting div		
		var width  = this.element.clientWidth;
		var height = this.element.clientHeight;

		this.element.id = "div" + id;
		var mySelf = this;


		// for SAGE2
		this.lastZoom = date;
		this.dragging = false;
		this.position = {x:0,y:0};

		var mapURL1 = 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
		var mapCopyright1 = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

		var mapURL2 = 'http://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}';
		var mapCopyright2 = 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC';

		// Load the CSS file for leaflet.js
		addCSS(mySelf.resrcPath + "scripts/leaflet.css", function(){


			mySelf.map1 = L.tileLayer(mapURL1, {attribution: mapCopyright1});
			mySelf.map2 = L.tileLayer(mapURL2, {attribution: mapCopyright2});


			if (mySelf.whichMap === 1)
				mySelf.map = L.map(mySelf.element.id, {layers: [mySelf.map1], zoomControl: false}).setView([41.869910, -87.65], 16);
			else
				mySelf.map = L.map(mySelf.element.id, {layers: [mySelf.map2], zoomControl: false}).setView([41.869910, -87.65], 16);

			/* Initialize the SVG layer */
			mySelf.map._initPathRoot();

			/* We simply pick up the SVG from the map object */
			var svg = d3.select(mySelf.map.getPanes().overlayPane).select("svg");
			var g = svg.append("g");

			var parseDate = d3.time.format("%Y-%m-%dT%H:%M:%S").parse;

			var today = new Date();


			d3.json("http://data.cityofchicago.org/resource/x2n5-8w5q.json?beat=1232", function(collection) {
				collection.forEach(function(d) {

				if (d.latitude && d.longitude)
					{
						if (isNaN(d.latitude))
							console.log("latitude is not a number");
						if (isNaN(d.longitude))
							console.log("longitude is not a number");
						d.LatLng = new L.LatLng(+d.latitude, +d.longitude);


						//"date_of_occurrence" : "2013-07-03T09:00:00",
						// date difference is in milliseconds
						d.myDate = parseDate(d.date_of_occurrence);
						d.daysAgo = (today - d.myDate) / 1000 / 60 / 60 / 24; //7-373

						if (d.daysAgo < 31)
							d.inLastMonth = 1;
						else
							d.inLastMonth = 0;



						d.description = d._primary_decsription;

					   switch(d._primary_decsription) {
					   	case "THEFT":
					   	case "BURGLARY":
					   	case "MOTOR VEHICLE THEFT":
					   	case "ROBBERY": 			d.color = "green"; break; 

					   	case "ASSAULT":
					   	case "HOMICIDE":
					   	case "CRIM SEXUAL ASSAULT":
					   	case "BATTERY": 			d.color = "red"; break; 

					   	case "CRIMINAL DAMAGE": 
					   	case "CRIMINAL TRESPASS": 	d.color = "aqua"; break;

					   	case "WEAPONS VIOLATION": 
					   	case "CONCEALED CARRY LICENSE VIOLATION":
					   								d.color = "black"; break;

					   	case "NARCOTICS": 			d.color = "pink"; break;

					   	case "OTHER OFFENSE": 		d.color = "white"; break;

					   	case "DECEPTIVE PRACTICE": d.color = "yellow"; break; 

					   	default: 					d.color = "grey"; break;
						}
					}
				else
					{
					//console.log("FOUND BAD ONE ", +d.latitude, +d.longitude);
					d.LatLng = new L.LatLng(0,0);
					}
					
				});

		var feature = g.selectAll("circle")
			.data(collection)
			.enter()
			.append("svg:circle")
			.style("stroke", function (d) { if (d.inLastMonth) return "black"; else return "white"; })  
			.style("stroke-width", function (d) { if (d.inLastMonth) return 6; else return 2; })
			.style("opacity", function (d) { if (d.inLastMonth) return 1.0; else return 0.4; })
			.style("fill", function (d) { return d.color; })
			.attr("r", 15);


		var feature2 = g.selectAll("text")
			.data(collection)
			.enter()
			.append("svg:text")
			.style("fill", "white")
			.style("stroke", function (d) { return d.color; })
			.style("stroke-width", "1")
            .style("font-size", "30px")
            .style("font-family", "Arial")
            .style("text-anchor", "start")
            .style("font-weight","bold")
            .text(function (d)
            		{
            			if (d.inLastMonth)
            				return d._primary_decsription.toLowerCase(); 
            		});

			mySelf.map.on("viewreset", update);
				update();

		function update() {
			feature.attr("transform", 
			function(d) { 
				return "translate("+ 
					mySelf.map.latLngToLayerPoint(d.LatLng).x +","+ 
					mySelf.map.latLngToLayerPoint(d.LatLng).y +")";
				}
			);

			feature2.attr("transform", 
			function(d) { 
				return "translate("+ 
					(mySelf.map.latLngToLayerPoint(d.LatLng).x+20.0) +","+ 
					(mySelf.map.latLngToLayerPoint(d.LatLng).y+5.0) +")";
				}
			);
			
		}
			});	
}
);

		// backup of the context
		var self = this;
		// attach the SVG into the this.element node provided to us
		var box="0,0,"+width+","+height;
		this.svg = d3.select(this.element).append("svg")
		    .attr("width",   width)
		    .attr("height",  height)
		    .attr("viewBox", box);

		this.draw_d3(date);
	},

	load: function(state, date) {
	},

	draw_d3: function(date) {

	},
	
	draw: function(date) {
	},

	resize: function(date) {
		this.svg.attr('width' ,  this.element.clientWidth  +"px");
		this.svg.attr('height' , this.element.clientHeight  +"px");

		this.map.invalidateSize();

		this.refresh(date);
	},
	
	event: function(eventType, user_id, itemX, itemY, data, date) {

		if (eventType === "pointerPress" && (data.button === "left") ) {
			this.dragging = true;
			this.position.x = itemX;
			this.position.y = itemY;
		}
		if (eventType === "pointerMove" && this.dragging ) {
			// need to turn animation off here or the pan stutters
			this.map.panBy([this.position.x-itemX, this.position.y-itemY], { animate: false});
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

				if (this.whichMap === 1)
					{
					this.whichMap = 2;
					this.map.removeLayer(this.map1);
					this.map2.addTo(this.map);
					}
				else
					{
					this.whichMap = 1;
					this.map.removeLayer(this.map2);
					this.map1.addTo(this.map);
					}
				}

		this.refresh(date);
	}
	
});