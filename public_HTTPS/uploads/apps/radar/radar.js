// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var station = "LOT";    // LOT Chicago
                        // HMO Honolulu
                        // NKX San Diego

var canvasWidth = 1.0;
var canvasHeight = 1.0;

var sampleSVG;

var image1, image2, image3, image4, image5, image6;
var image3a, image4a;

/*
var URL1 = "http://radar.weather.gov/ridge/Overlays/Topo/Short/LOT_Topo_Short.jpg";
var URL2 = "http://radar.weather.gov/ridge/Overlays/County/Short/LOT_County_Short.gif";
var URL3 = "http://radar.weather.gov/ridge/RadarImg/N0R/LOT_N0R_0.gif";
var URL4 = "http://radar.weather.gov/ridge/Warnings/Short/LOT_Warnings_0.gif";
var URL5 = "http://radar.weather.gov/ridge/Legend/N0R/LOT_N0R_Legend_0.gif";
var URL6 = "http://radar.weather.gov/Overlays/Cities/Short/LOT_City_Short.gif";
*/

var URL1a = "http://radar.weather.gov/ridge/Overlays/Topo/Short/";
var URL2a = "http://radar.weather.gov/ridge/Overlays/County/Short/";
var URL3a = "http://radar.weather.gov/ridge/RadarImg/N0R/";
var URL4a = "http://radar.weather.gov/ridge/Warnings/Short/";
var URL5a = "http://radar.weather.gov/ridge/Legend/N0R/";
var URL6a = "http://radar.weather.gov/Overlays/Cities/Short/";

var URL1b = "_Topo_Short.jpg";
var URL2b = "_County_Short.gif";
var URL3b = "_N0R_0.gif";
var URL4b = "_Warnings_0.gif";
var URL5b = "_N0R_Legend_0.gif";
var URL6b = "_City_Short.gif";

var URL1 = URL1a+station+URL1b;
var URL2 = URL2a+station+URL2b;
var URL3 = URL3a+station+URL3b;
var URL4 = URL4a+station+URL4b;
var URL5 = URL5a+station+URL5b;
var URL6 = URL6a+station+URL6b;

////////////////////////////////////////

function drawImage(theImage)
{
    sampleSVG.append("image")
    .attr("xlink:href", theImage)
    .attr("opacity", 1)
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", canvasWidth)
    .attr("height", canvasHeight); 
}
////////////////////////////////////////

function drawEverything()
{
    sampleSVG.selectAll("*").remove();

    drawImage(image1.src); //TOPO
    drawImage(image2.src); //Counties
    
    drawImage(image3.src); //Radar
    drawImage(image4.src); //Warnings

    drawImage(image6.src); //Cities

    drawImage(image5.src); //Legend
}

////////////////////////////////////////

function update()
{
    // get new imagery for the radar and the warnings

    image3.src = URL3+ '?' + Math.floor(Math.random() * 10000000);
    image3.onload = function(){
        //image3 = image3a;
    } 

    
    image4.src = URL4+ '?' + Math.floor(Math.random() * 10000000);
    image4.onload = function(){
        //image4 = image4a;
    }   
}

////////////////////////////////////////

function setUpBackground()
{
        // only need to load the background images and the legend once

        image1 = new Image;
        image1.src = URL1+ '?' + Math.floor(Math.random() * 10000000);
        image1.onload = function(){
        } 

        image2 = new Image;
        image2.src = URL2+ '?' + Math.floor(Math.random() * 10000000);
        image2.onload = function(){
        } 

        image5 = new Image;
        image5.src = URL5+ '?' + Math.floor(Math.random() * 10000000);
        image5.onload = function(){
        }

        image6 = new Image;
        image6.src = URL6+ '?' + Math.floor(Math.random() * 10000000);
        image6.onload = function(){
        }

        image3 = new Image;
        image4 = new Image;

        image3a = new Image;
        image4a = new Image;
}

////////////////////////////////////////

var radar = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous"; //onfinish
		this.svg = null;
	},


	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

        this.maxFPS = 0.01;

		// Get width height from the supporting div		
		var width  = this.element.clientWidth;
		var height = this.element.clientHeight;

		this.element.id = "div" + id;

		// backup of the context
		var self = this;

		// attach the SVG into the this.element node provided to us
		var box="0,0,"+width+","+height;
		this.svg = d3.select(this.element).append("svg:svg")
		    .attr("width",   width)
		    .attr("height",  height)
		    .attr("viewBox", box);
		sampleSVG = this.svg;

        setUpBackground();

		update();
		this.draw_d3(date);
	},

	load: function(state, date) {
	},

	draw_d3: function(date) {
		// Get width height from the supporting div		
		var x = this.element.clientWidth;
		var y = this.element.clientHeight;

        canvasWidth = x;
        canvasHeight = y;

	    sampleSVG.append("svg:rect")
	    .style("stroke", "black")
	    .style("fill", "black")
	    .style("fill-opacity", 1)
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("height", y)
	    .attr("width", x);
	},
	
	draw: function(date) {
	    update();
        drawEverything();
	},

	resize: function(date) {
		this.svg.attr('width' ,  this.element.clientWidth  +"px");
		this.svg.attr('height' , this.element.clientHeight  +"px");
		this.refresh(date);
	},

	event: function(eventType, userId, x, y, data, date) {
		if (eventType === "pointerPress" && (data.button === "left") ) {
		}
		if (eventType === "pointerMove" ) {
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
		}
	}
	
});
