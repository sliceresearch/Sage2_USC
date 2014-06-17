// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


 // 0.75 is a decent minimum
var scaleFactor = 1.0

// fahrenheit or celsius
var itsF = 1;

var date = "Loading ...";
var hour = "" ;
var ampm = "";
var outside = "NULL";

var data1 = -1;
var data2 = -1;
var data3 = -1;
var data4 = -1;
var data5 = -1;
var data6 = -1;
var data7 = -1;
     
var room1  = "Meeting Room";
var room2  = "Main Lab";
var room3  = "Machine Room";
var room4a = "Thin";
var room4b = "Rooms";
var room5a = "Work";
var room5b = "Room";
var room6  = "Classroom";
var room7  = "Ph.D. Room";

var displayFont = "Arial"


var massiveFont;
var massiveFontSize;

var largeFont;
var largeFontSize;

var smallFont;
var smallFontSize;

var rounded; 

// color brewer colors (derived from an 11 step diverging scale)

var color_hot 			= "#d73027";
var color_warmer 		= "#f46d43";
var color_warm			= "#fdae61";

var color_nice			= "#ffffbf";
var color_cool	 		= "#e0f3f8";
var color_cold	 		= "#abd9e9";

var color_colder 		= "#74add1";
var color_colderer		= "#4575b4";
var color_coldererer	= "#313695";

var color_unknown	 	= "#AAAAAA";


var temp_hot 			= 85;
var temp_nice			= 70;
var temp_cold	 		= 60;
var temp_colderer		= 30;
var temp_coldererer		= 0;
var temp_unknown	 	= 0;


var color1 = "NULL";
var color2 = "NULL";
var color3 = "NULL";
var color4 = "NULL";
var color5 = "NULL";
var color6 = "NULL";
var color7 = "NULL";

var perc1 = 1;
var perc2 = 1;
var perc3 = 1;
var perc4 = 1;
var perc5 = 1;
var perc6 = 1;
var perc7 = 1;


var color1b;
var color2b;
var color3b;
var color4b;
var color5b;
var color6b;
var color7b;

var colorOut;
var colorOutb;
var percOut;

var sampleSVG;
var interval;

var leftMargin = 20;
var canvasHeight = 440;
var canvasWidth = 435 + 2 * leftMargin;

var weatherIcon = "";
var iconSet;

var weatherImage = new Image;


////////////////////////////////////////

function tempConvert (data)
{
	color = color_unknown;
	colorb = color_unknown;
	perc = 1;

	if (data < 0)
		{
		color = color_unknown;
		colorb = color_unknown;
		perc  = 1;
		}
	else if (data < temp_coldererer)
		{
		color = color_coldererer;
		colorb = color_coldererer;
		perc  = 1;
		}
	else if (data < temp_colderer)
		{
		color = color_colderer;
		colorb = color_coldererer;
		perc = (data - temp_coldererer) / (temp_colderer - temp_coldererer)
		}
	else if (data < temp_cold)
		{
		color = color_cold;
		colorb = color_colderer;
		perc = (data - temp_colderer) / (temp_cold - temp_colderer)
		}
	else if (data < temp_nice)
		{
		color = color_nice;
		colorb = color_cold;
		perc = (data - temp_cold) / (temp_nice - temp_cold)		
		}		
	else
		{
		color = color_hot;
		colorb = color_nice;
		perc = (data - temp_nice) / (temp_hot - temp_nice)
		}

	if (perc > 1.0)
		perc = 1.0;
	if (perc < 0.0)
		perc = 0.0;
				
	return [color, colorb, perc]
}

////////////////////////////////////////

function ForC (data)
{
	if (itsF)
		return(data);
	else
		return(Math.round((parseInt(data)-32)*5/9));
}

////////////////////////////////////////

function drawBox (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)
{
     sampleSVG.append("svg:rect")
        .style("stroke", "black")
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .attr("x", parseInt(boxLocX*scaleFactor))
        .attr("y", parseInt(boxLocY*scaleFactor))
        .attr("rx", rounded)
        .attr("ry", rounded)
        .attr("height", parseInt(boxHeight*scaleFactor))
        .attr("width", parseInt(boxWidth*scaleFactor));
}

////////////////////////////////////////

function drawText(textLocX, textLocY, theText, textFontSize)
{
 sampleSVG.append("svg:text")
        .attr("x", parseInt(textLocX*scaleFactor))
        .attr("y", parseInt(textLocY*scaleFactor))
        .style("fill", "#000")
        .style("font-size", textFontSize)
        .style("font-family", displayFont)
        .style("text-anchor", "middle")
        .text(theText);   
}

////////////////////////////////////////

function drawTextLeft(textLocX, textLocY, theText, textFontSize)
{
 sampleSVG.append("svg:text")
        .attr("x", parseInt(textLocX*scaleFactor))
        .attr("y", parseInt(textLocY*scaleFactor))
        .style("fill", "#000")
        .style("font-size", textFontSize)
        .style("font-family", displayFont)
        .style("text-anchor", "start")
        .text(theText);   
}

////////////////////////////////////////

function drawTextRight(textLocX, textLocY, theText, textFontSize)
{
 sampleSVG.append("svg:text")
        .attr("x", parseInt(textLocX*scaleFactor))
        .attr("y", parseInt(textLocY*scaleFactor))
        .style("fill", "#000")
        .style("font-size", textFontSize)
        .style("font-family", displayFont)
        .style("text-anchor", "end")
        .text(theText);   
}

////////////////////////////////////////

function drawTempText(textColor)
{
    sampleSVG.append("svg:text")
        .attr("x", parseInt(canvasWidth*0.5*scaleFactor))
        .attr("y", parseInt(378*scaleFactor))
        .style("fill", textColor)
        .style("font-size", largeFontSize)
        .style("font-family", displayFont)
        .style("text-anchor", "middle")
        .text("Outside it is "+Math.round(ForC(outside)));

    sampleSVG.append("image")
        .attr("xlink:href", weatherImage.src)
        .attr("opacity", 1)
        .attr("x", parseInt(canvasWidth*0.83*scaleFactor))
        .attr("y", parseInt(340*scaleFactor))
        .attr("width", 50*scaleFactor) // -10
        .attr("height", 50*scaleFactor); // -10
 

    sampleSVG.append("image")
        .attr("xlink:href", weatherImage.src)
        .attr("opacity", 1)
        .attr("x", parseInt(canvasWidth*0.08 *scaleFactor))
        .attr("y", parseInt(340*scaleFactor))
        .attr("width", 50*scaleFactor) // -10
        .attr("height", 50*scaleFactor); // -10       
    }

////////////////////////////////////////

function drawBasicStuff()
{
    drawText(canvasWidth*0.5, 35, "Current weather inside evl", massiveFontSize);

    if(itsF)
        drawText(canvasWidth*0.5, 435, "Fahrenheit", massiveFontSize)
    else    
        drawText(canvasWidth*0.5, 435, "Celsius", massiveFontSize)
}

////////////////////////////////////////

function updateOutsideTemp()
{
// need to add a random number to the end of the request to avoid browser caching

    d3.json("https://query.yahooapis.com/v1/public/yql?q=select%20temp_f%2C%20weather%2C%20icons%20from%20wunderground.currentobservation%20where%20location%3D'Chicago%2C%20IL'%3B&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=", function(weatherOut) {
        weather = weatherOut.query.results.current_observation.temp_f;
        iconSet = weatherOut.query.results.current_observation.icons.icon_set;
        
        // should use the name field to make sure I get the correct one
        weatherIcon = iconSet[8].icon_url;
        weatherImage.src = weatherIcon;

        outside = weather;

//    d3.text("ftp://ftp.evl.uic.edu/pub/INcoming/andy/Final_outside.txt"+ '?' + Math.floor(Math.random() * 10000000), function(datasetTextOut) {
//    var parsedCSVoutside = d3.csv.parseRows(datasetTextOut);

//    var d4 = parsedCSVoutside[0][0];
//    var d5 = d4.split(" ");
//    outside= d5[0];
    });
}

////////////////////////////////////////

function drawOutsideTemp()
{
    drawBox(leftMargin, 340, 50, 450, "white", 1);
    if (outside != "NULL")
        {
        c = tempConvert(outside);
        colorOut = c[0];
        colorOutb = c[1];
        percOut = c[2];

        drawBox(leftMargin, 340, 50, 450, colorOut, percOut);
        drawBox(leftMargin, 340, 50, 450, colorOutb, 1-percOut);
                
        if (outside < temp_colderer)
            drawTempText("#FFF");
        else
            drawTempText("#000");
        }
}

////////////////////////////////////////

function updateInsideTemp()
{
// need to add a random number to the end of the request to avoid browser caching
// http://stackoverflow.com/questions/13053096/avoid-data-caching-when-using-d3-text

//    d3.text("http://www.evl.uic.edu/aej/TEMPS/Final_temps.txt" + '?' + 
    d3.text("http://lyra.evl.uic.edu:9000/TEMPS/Final_temps.txt" + '?' + 
        Math.floor(Math.random() * 10000000), function(datasetTextIn) {
    var parsedCSV = d3.csv.parseRows(datasetTextIn);

    var d1 = parsedCSV[0][0];
    var d2 = d1.split(" ");
    date = d2[0];
    hour = d2[1];
    ampm = d2[2];
    ampm = ampm.toLowerCase();

    var dateSplit;
    var dateMonth, dateDay, dateYear;

	//  alert(hour);
	var hourAndMinute = hour.split(":");
	var hourCompute = + hourAndMinute[0];
	var minuteCompute = + hourAndMinute[1];

	hour = hourCompute+":"+hourAndMinute[1];

    // if we are on the metric side also go to 24 hour clock
    if ((itsF == 0) && (ampm == "pm"))
        { // need to break into to integers based on the colon then re-form}
         if (hourCompute < 12)
            hourCompute += 12;
         var hourString = hourCompute.toString();

        hour = hourString + ":" + hourAndMinute[1];
    }

//alert(parsedCSV.length);

    // if no new data is found do not try to convert nonexistent temperatures
    // just draw using the previous temperatures
    if (parsedCSV.length >= 9)
    {
        if (hour.charAt(0) == "0")
            hour = hour.slice(1);

//alert(date); // default date format is Jun/09/2014


        dateSplit = date.split("/");
        dateMonth = dateSplit[0];
        dateDay = dateSplit[1];
        dateYear = dateSplit[2];

        if (dateDay[0] == "0")
            dateDay = dateDay[1];
 
        if (itsF == 1)
            date = dateMonth + " " + dateDay +", " + dateYear;
        else      
            date = dateDay + " " + dateMonth + " " + dateYear;
        
        //date = date.replace("/", " ");
        //date = date.replace("/", ",");

        d1 = parsedCSV[2][0];
        d2 = d1.split(" ");
        data7 = d2[2];

        d1 = parsedCSV[3][0];
        d2 = d1.split(" ");
        data6 = d2[2];

        d1 = parsedCSV[4][0];
        d2 = d1.split(" ");
        data4 = d2[2];

        d1 = parsedCSV[5][0];
        d2 = d1.split(" ");
        data5 = d2[2];

        d1 = parsedCSV[6][0];
        d2 = d1.split(" ");
        data2 = d2[2];

        d1 = parsedCSV[7][0];
        d2 = d1.split(" ");
        data1 = d2[2];

        d1 = parsedCSV[8][0];
        d2 = d1.split(" ");
        data3 = d2[2];

        //--------------------------------------

        c = tempConvert(data1);
        color1 = c[0]; 
        color1b = c[1];
        perc1 = c[2];

        c = tempConvert(data2);
        color2 = c[0]; 
        color2b = c[1];
        perc2 = c[2];

        c = tempConvert(data3);
        color3 = c[0]; 
        color3b = c[1];
        perc3 = c[2];

        c = tempConvert(data4);
        color4 = c[0]; 
        color4b = c[1];
        perc4 = c[2];

        c = tempConvert(data5);
        color5 = c[0]; 
        color5b = c[1];
        perc5 = c[2];

        c = tempConvert(data6);
        color6 = c[0]; 
        color6b = c[1];
        perc6 = c[2];

        c = tempConvert(data7);
        color7 = c[0]; 
        color7b = c[1];
        perc7 = c[2];
        }
     });
}

////////////////////////////////////////

function drawInsideTemp()
{
    drawBox(leftMargin,      50, 100, 150, "white", 1);
    drawBox(leftMargin+150,  50, 100, 150, "white", 1);
    drawBox(leftMargin+300,  50, 150, 150, "white", 1); 
    drawBox(leftMargin+300, 200,  75, 150, "white", 1);
    drawBox(leftMargin+225, 175, 100,  75, "white", 1);
    drawBox(leftMargin+150, 175, 100,  75, "white", 1);
    drawBox(leftMargin,     175, 100, 150, "white", 1);

    if (color1 != "NULL")
        {
        drawBox(leftMargin, 50, 100, 150, color7, perc7);
        drawBox(leftMargin, 50, 100, 150, color7b, 1-perc7);

        drawBox(leftMargin+150, 50, 100, 150, color1, perc1);
        drawBox(leftMargin+150, 50, 100, 150, color1b, 1-perc1);
               
        drawBox(leftMargin+300, 50, 150, 150, color2, perc2);
        drawBox(leftMargin+300, 50, 150, 150, color2b, 1-perc2);

        drawBox(leftMargin+300, 200, 75, 150, color3, perc3);
        drawBox(leftMargin+300, 200, 75, 150, color3b, 1-perc3);

        drawBox(leftMargin+225, 175, 100, 75, color4, perc4);
        drawBox(leftMargin+225, 175, 100, 75, color4b, 1-perc4);

        drawBox(leftMargin+150, 175, 100, 75, color5, perc5);
        drawBox(leftMargin+150, 175, 100, 75, color5b, 1-perc5);
            
        drawBox(leftMargin, 175, 100, 150, color6, perc6);
        drawBox(leftMargin, 175, 100, 150, color6b, 1-perc6);
        }
            
    //--------------------------------------
      
    // clear area for time

    sampleSVG.append("svg:rect")
    .style("stroke", "white")
    .style("fill", "white")
    .style("fill-opacity", 1)
    .attr("x", 0)
    .attr("y", 280*scaleFactor)
    .attr("rx", rounded)
    .attr("ry", rounded)
    .attr("height", 55*scaleFactor)
    .attr("width", canvasWidth*scaleFactor);

    drawTextLeft(leftMargin, 320, date, largeFontSize)

    // if hour < 10 indent a bit
    hourIndent = 0;
    if (hour.length < 5)
        hourIndent = 20;
      
    if (itsF)  
        drawTextRight(canvasWidth-5, 320, hour+" "+ampm, largeFontSize)
    else
       drawTextRight(canvasWidth-5, 320, hour, largeFontSize)
 
 var textHeightHigh = 135;
 var textHeightLow = 260;

    if (color1 != "NULL")
        {
        drawText(leftMargin+75,  textHeightLow,  ForC(data6), largeFontSize)
        drawText(leftMargin+75,  textHeightHigh, ForC(data7), largeFontSize)
        drawText(leftMargin+225, textHeightHigh, ForC(data1), largeFontSize)
        drawText(leftMargin+375, textHeightHigh, ForC(data2), largeFontSize)
        drawText(leftMargin+375, textHeightLow,  ForC(data3), largeFontSize) 
        drawText(leftMargin+263, textHeightLow,  ForC(data4), largeFontSize)
        drawText(leftMargin+187, textHeightLow,  ForC(data5), largeFontSize)
        }

    drawText(leftMargin+75,  200, room6, smallFontSize)
    drawText(leftMargin+75,   75, room7, smallFontSize)
    drawText(leftMargin+225,  75, room1, smallFontSize)
    drawText(leftMargin+375,  75, room2, smallFontSize)
    drawText(leftMargin+375, 220, room3, smallFontSize)
    drawText(leftMargin+263, 200, room4a, smallFontSize)
    drawText(leftMargin+263, 220, room4b, smallFontSize)
    drawText(leftMargin+187, 200, room5a, smallFontSize)
    drawText(leftMargin+187, 220, room5b, smallFontSize)
}

////////////////////////////////////////

function updateAll()
{
    updateOutsideTemp();
    updateInsideTemp(); 
}

////////////////////////////////////////

function drawAll()
{
    sampleSVG.selectAll("*").remove();
    drawBasicStuff();
    drawOutsideTemp();
    drawInsideTemp(); 
}

////////////////////////////////////////

function updateText()
{
    massiveFont = parseInt(38*scaleFactor);
    massiveFontSize   = massiveFont.toString()+"px";

    largeFont = parseInt(36*scaleFactor);
    largeFontSize   = largeFont.toString()+"px";

    smallFont = parseInt(18*scaleFactor);
    smallFontSize   = smallFont.toString()+"px";

    rounded = parseInt(8*scaleFactor);    
}

////////////////////////////////////////

var weather = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "onfinish";
		this.svg = null;
	},


	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

        this.maxFPS = 0.5;

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

		updateAll();
		this.draw_d3(date);
	},

	load: function(state, date) {
	},

	draw_d3: function(date) {
		// Get width height from the supporting div		
		var x = this.element.clientWidth;
		var y = this.element.clientHeight;

	    var scaleFactorX = x / canvasWidth;
	    var scaleFactorY = y / canvasHeight;

	    if (scaleFactorX < scaleFactorY)
	        scaleFactor = 0.95 * scaleFactorX;
	    else
	        scaleFactor = 0.95 * scaleFactorY;

	    updateText();

	    sampleSVG.append("svg:rect")
	    .style("stroke", "white")
	    .style("fill", "white")
	    .style("fill-opacity", 1)
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("rx", rounded)
	    .attr("ry", rounded)
	    .attr("height", y)
	    .attr("width", x);

	    // sampleSVG.attr("width",  parseInt(canvasWidth*scaleFactor));
	    // sampleSVG.attr("height", parseInt(canvasHeight*scaleFactor));

	    drawBasicStuff()
	},
	
	draw: function(date) {
	    updateAll();
        drawAll();
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
        itsF = !itsF;
		}
	}
	
});
