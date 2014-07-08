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
// current issues:
// initial window sometimes appears double-height with blank bottom half

function addCSS( url, callback ) {
    var fileref = document.createElement("link")
	if( callback ) fileref.onload = callback;
    fileref.setAttribute("rel", "stylesheet")
    fileref.setAttribute("type", "text/css")
    fileref.setAttribute("href", url)
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
	},


	init: function(id, width, height, resrc, date) {

		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

		// Get width height from the supporting div		
		var width  = this.element.clientWidth;
		var height = this.element.clientHeight;

		this.element.id = "div" + id;
		var mySelf = this;

		this.map = null;

		// for SAGE2
		this.lastZoom = date;
		this.dragging = false;
		this.position = {x:0,y:0};

		// Load the CSS file
		addCSS(mySelf.resrcPath + "scripts/leaflet.css", function(){

			mySelf.map = L.map(mySelf.element.id).setView([41.869910, -87.65], 17);
			var mapLink = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
				attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
			}).addTo(mySelf.map);


			/* Initialize the SVG layer */
			mySelf.map._initPathRoot()    

			/* We simply pick up the SVG from the map object */
			var svg = d3.select(mySelf.map.getPanes().overlayPane).select("svg");
			var g = svg.append("g");

			d3.json("http://data.cityofchicago.org/resource/x2n5-8w5q.json?beat=1232", function(collection) {
				collection.forEach(function(d) {

				if (d.latitude && d.longitude)
					{
						if (isNaN(d.latitude))
							console.log("latitude is not a number");
						if (isNaN(d.longitude))
							console.log("longitude is not a number");
						d.LatLng = new L.LatLng(+d.latitude, +d.longitude)
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
					   	case "CRIMINAL TRESPASS": 	d.color = "blue"; break;

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
					.style("stroke", "white")  
					.style("stroke-width", 2)
					.style("opacity", .6) 
					.style("fill", function (d) { return d.color; })
					.attr("r", 15);

				mySelf.map.on("viewreset", update);
				update();

				function update() {
					feature.attr("transform", 
					function(d) { 
						return "translate("+ 
							mySelf.map.latLngToLayerPoint(d.LatLng).x +","+ 
							mySelf.map.latLngToLayerPoint(d.LatLng).y +")";
						}
					)
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

		this.refresh(date);
	}
	
});



