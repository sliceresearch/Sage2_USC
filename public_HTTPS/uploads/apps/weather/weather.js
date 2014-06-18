// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


gwin = new Object()
    gwin.itsF = 1; // fahrenheit or celsius

    gwin.sampleSVG;

    gwin.date = "Loading ...";
    gwin.hour = "" ;
    gwin.ampm = "";
    gwin.outside = "NULL";

    gwin.displayFont = "Arial"
    gwin.massiveFont;
    gwin.massiveFontSize;
    gwin.largeFont;
    gwin.largeFontSize;
    gwin.smallFont;
    gwin.smallFontSize;

    gwin.rounded; 

    gwin.scaleFactor = 1.0; // 0.75 is a decent minimum

    gwin.leftMargin = 20;
    gwin.canvasHeight = 400;
    gwin.canvasWidth = 435 + 2 * gwin.leftMargin;

    gwin.weatherIcon = "";
    gwin.weatherImage = new Image;
    gwin.iconSet;

glob = new Object()
    glob.perc1 = 1;
    glob.perc2 = 1;
    glob.perc3 = 1;
    glob.perc4 = 1;
    glob.perc5 = 1;
    glob.perc6 = 1;
    glob.perc7 = 1;
    glob.color1 = "NULL";
    glob.color2 = "NULL";
    glob.color3 = "NULL";
    glob.color4 = "NULL";
    glob.color5 = "NULL";
    glob.color6 = "NULL";
    glob.color7 = "NULL";

    glob.color1b;
    glob.color2b;
    glob.color3b;
    glob.color4b;
    glob.color5b;
    glob.color6b;
    glob.color7b;

    glob.data1 = -1;
    glob.data2 = -1;
    glob.data3 = -1;
    glob.data4 = -1;
    glob.data5 = -1;
    glob.data6 = -1;
    glob.data7 = -1;

    glob.colorOut;
    glob.colorOutb;
    glob.percOut;

    glob.temp_hot            = 85;
    glob.temp_nice           = 70;
    glob.temp_cold           = 60;
    glob.temp_colderer       = 30;
    glob.temp_coldererer     = 0;

////////////////////////////////////////

function tempConvert (data)
    {
    // color brewer colors (derived from an 11 step diverging scale)
    var color_hot           = "#d73027";
    var color_warmer        = "#f46d43";
    var color_warm          = "#fdae61";

    var color_nice          = "#ffffbf";
    var color_cool          = "#e0f3f8";
    var color_cold          = "#abd9e9";

    var color_colder        = "#74add1";
    var color_colderer      = "#4575b4";
    var color_coldererer    = "#313695";

    var color_unknown       = "#AAAAAA";


    var color = color_unknown;
    var colorb = color_unknown;
    var perc = 1;

    if (data < 0)
        {
        color = color_unknown;
        colorb = color_unknown;
        perc  = 1;
        }
    else if (data < glob.temp_coldererer)
        {
        color = color_coldererer;
        colorb = color_coldererer;
        perc  = 1;
        }
    else if (data < glob.temp_colderer)
        {
        color = color_colderer;
        colorb = color_coldererer;
        perc = (data - glob.temp_coldererer) / (glob.temp_colderer - glob.temp_coldererer)
        }
    else if (data < glob.temp_cold)
        {
        color = color_cold;
        colorb = color_colderer;
        perc = (data - glob.temp_colderer) / (glob.temp_cold - glob.temp_colderer)
        }
    else if (data < glob.temp_nice)
        {
        color = color_nice;
        colorb = color_cold;
        perc = (data - glob.temp_cold) / (glob.temp_nice - glob.temp_cold)      
        }       
    else
        {
        color = color_hot;
        colorb = color_nice;
        perc = (data - glob.temp_nice) / (glob.temp_hot - glob.temp_nice)
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
    if (gwin.itsF)
        return(data);
    else
        return(Math.round((parseInt(data)-32)*5/9));
}

////////////////////////////////////////

function drawBox (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)
{
     gwin.sampleSVG.append("svg:rect")
        .style("stroke", "black")
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .attr("x", parseInt(boxLocX*gwin.scaleFactor))
        .attr("y", parseInt(boxLocY*gwin.scaleFactor))
        .attr("rx", gwin.rounded)
        .attr("ry", gwin.rounded)
        .attr("height", parseInt(boxHeight*gwin.scaleFactor))
        .attr("width", parseInt(boxWidth*gwin.scaleFactor));
}

function drawBorderlessBox (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)
{
     gwin.sampleSVG.append("svg:rect")
        .style("stroke", colorOut)
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .attr("x", parseInt(boxLocX*gwin.scaleFactor))
        .attr("y", parseInt(boxLocY*gwin.scaleFactor))
        .attr("rx", gwin.rounded)
        .attr("ry", gwin.rounded)
        .attr("height", parseInt(boxHeight*gwin.scaleFactor))
        .attr("width", parseInt(boxWidth*gwin.scaleFactor));
}

////////////////////////////////////////

function drawText(textLocX, textLocY, theText, textFontSize)
{
 gwin.sampleSVG.append("svg:text")
        .attr("x", parseInt(textLocX*gwin.scaleFactor))
        .attr("y", parseInt(textLocY*gwin.scaleFactor))
        .style("fill", "#000")
        .style("font-size", textFontSize)
        .style("font-family", gwin.displayFont)
        .style("text-anchor", "middle")
        .text(theText);   
}

////////////////////////////////////////

function drawTextLeft(textLocX, textLocY, theText, textFontSize)
{
 gwin.sampleSVG.append("svg:text")
        .attr("x", parseInt(textLocX*gwin.scaleFactor))
        .attr("y", parseInt(textLocY*gwin.scaleFactor))
        .style("fill", "#000")
        .style("font-size", textFontSize)
        .style("font-family", gwin.displayFont)
        .style("text-anchor", "start")
        .text(theText);   
}

////////////////////////////////////////

function drawTextRight(textLocX, textLocY, theText, textFontSize)
{
 gwin.sampleSVG.append("svg:text")
        .attr("x", parseInt(textLocX*gwin.scaleFactor))
        .attr("y", parseInt(textLocY*gwin.scaleFactor))
        .style("fill", "#000")
        .style("font-size", textFontSize)
        .style("font-family", gwin.displayFont)
        .style("text-anchor", "end")
        .text(theText);   
}

////////////////////////////////////////

function drawTempText(textColor)
{
    var tempSys = "";

    if (gwin.itsF)
        tempSys = " F"
    else
        tempSys = " C";

    gwin.sampleSVG.append("svg:text")
        .attr("x", parseInt(gwin.canvasWidth*0.5*gwin.scaleFactor))
        .attr("y", parseInt(378*gwin.scaleFactor))
        .style("fill", textColor)
        .style("font-size", gwin.largeFontSize)
        .style("font-family", gwin.displayFont)
        .style("text-anchor", "middle")
        .text("Outside it is "+Math.round(ForC(gwin.outside))+ tempSys);

    gwin.sampleSVG.append("image")
        .attr("xlink:href", gwin.weatherImage.src)
        .attr("opacity", 1)
        .attr("x", parseInt(gwin.canvasWidth*0.83*gwin.scaleFactor))
        .attr("y", parseInt(340*gwin.scaleFactor))
        .attr("width", 50*gwin.scaleFactor) // -10
        .attr("height", 50*gwin.scaleFactor); // -10
 

    gwin.sampleSVG.append("image")
        .attr("xlink:href", gwin.weatherImage.src)
        .attr("opacity", 1)
        .attr("x", parseInt(gwin.canvasWidth*0.08 *gwin.scaleFactor))
        .attr("y", parseInt(340*gwin.scaleFactor))
        .attr("width", 50*gwin.scaleFactor) // -10
        .attr("height", 50*gwin.scaleFactor); // -10       
    }

////////////////////////////////////////

function drawBasicStuff()
{
    drawText(gwin.canvasWidth*0.5, 35, "Current weather inside evl", gwin.massiveFontSize);
}

////////////////////////////////////////

function updateOutsideTemp()
{
// need to add a random number to the end of the request to avoid browser caching

    d3.json("https://query.yahooapis.com/v1/public/yql?q=select%20temp_f%2C%20weather%2C%20icons%20from%20wunderground.currentobservation%20where%20location%3D'Chicago%2C%20IL'%3B&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=", function(error, weatherOut) {

      if (error) {
          return;
      }
      
        weather = weatherOut.query.results.current_observation.temp_f;
        gwin.iconSet = weatherOut.query.results.current_observation.icons.icon_set;
        
        // should use the name field to make sure I get the correct one
        gwin.weatherIcon = gwin.iconSet[8].icon_url;
        gwin.weatherImage.src = gwin.weatherIcon;

        gwin.outside = weather;
    });
}

////////////////////////////////////////

function drawOutsideTemp()
{
    drawBox(gwin.leftMargin, 340, 50, 450, "white", 1);

    if (gwin.outside != "NULL")
        {
        c = tempConvert(gwin.outside);
        glob.colorOut = c[0];
        glob.colorOutb = c[1];
        glob.percOut = c[2];

        drawBox(gwin.leftMargin, 340, 50, 450, glob.colorOut, glob.percOut);
        drawBox(gwin.leftMargin, 340, 50, 450, glob.colorOutb, 1.0 - glob.percOut);
                
        if (gwin.outside < glob.temp_colderer)
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

//    d3.text("ftp://ftp.evl.uic.edu/pub/INcoming/andy/Final_temps.txt" + '?' + 
     d3.text("http://lyra.evl.uic.edu:9000/TEMPS/Final_temps.txt" + '?' + 
 //    d3.text("http://www.evl.uic.edu/aej/TEMPS/Final_temps.txt" + '?' + 
         Math.floor(Math.random() * 10000000), function(error, datasetTextIn) {

      if (error) {
          return;
      }

    var parsedCSV = d3.csv.parseRows(datasetTextIn);

    var d1 = parsedCSV[0][0];
    var d2 = d1.split(" ");
    gwin.date = d2[0];
    gwin.hour = d2[1];
    gwin.ampm = d2[2];
    gwin.ampm = gwin.ampm.toLowerCase();

    var dateSplit;
    var dateMonth, dateDay, dateYear;

  //  alert(hour);
    var hourAndMinute = gwin.hour.split(":");
    var hourCompute = + hourAndMinute[0];
    var minuteCompute = + hourAndMinute[1];

    gwin.hour = hourCompute+":"+hourAndMinute[1];

    // if we are on the metric side also go to 24 hour clock
    // 12:55 should be 0:55 but its 12:55 now
    if ((gwin.itsF == 0) && (gwin.ampm == "pm"))
        { // need to break into to integers based on the colon then re-form}
         if (hourCompute < 12)
            hourCompute += 12;
 
        gwin.hour = hourCompute.toString()+ ":" + hourAndMinute[1];
    }

    // handle 12:XX am
    if ((gwin.itsF == 0) && (gwin.ampm == "am"))
        { // need to break into to integers based on the colon then re-form}
         if (hourCompute >= 12)
            hourCompute = 0;
 
        gwin.hour = hourCompute.toString() + ":" + hourAndMinute[1];
    }

    // if no new data is found do not try to convert nonexistent temperatures
    // just draw using the previous temperatures
    if (parsedCSV.length >= 9)
        {
        if ((gwin.hour.charAt(0) == "0") && (gwin.hour.charAt(1) != ":"))
            gwin.hour = gwin.hour.slice(1);

        dateSplit = gwin.date.split("/");
        dateMonth = dateSplit[0];
        dateDay = dateSplit[1];
        dateYear = dateSplit[2];

        if (dateDay[0] == "0")
            dateDay = dateDay[1];
 
        if (gwin.itsF == 1)
            gwin.date = dateMonth + " " + dateDay +", " + dateYear;
        else      
            gwin.date = dateDay + " " + dateMonth + " " + dateYear;
        
        d1 = parsedCSV[2][0];
        d2 = d1.split(" ");
        glob.data7 = d2[2];

        d1 = parsedCSV[3][0];
        d2 = d1.split(" ");
        glob.data6 = d2[2];

        d1 = parsedCSV[4][0];
        d2 = d1.split(" ");
        glob.data4 = d2[2];

        d1 = parsedCSV[5][0];
        d2 = d1.split(" ");
        glob.data5 = d2[2];

        d1 = parsedCSV[6][0];
        d2 = d1.split(" ");
        glob.data2 = d2[2];

        d1 = parsedCSV[7][0];
        d2 = d1.split(" ");
        glob.data1 = d2[2];

        d1 = parsedCSV[8][0];
        d2 = d1.split(" ");
        glob.data3 = d2[2];

        //--------------------------------------

        c = tempConvert(glob.data1);
        glob.color1 = c[0]; 
        glob.color1b = c[1];
        glob.perc1 = c[2];

        c = tempConvert(glob.data2);
        glob.color2 = c[0]; 
        glob.color2b = c[1];
        glob.perc2 = c[2];

        c = tempConvert(glob.data3);
        glob.color3 = c[0]; 
        glob.color3b = c[1];
        glob.perc3 = c[2];

        c = tempConvert(glob.data4);
        glob.color4 = c[0]; 
        glob.color4b = c[1];
        glob.perc4 = c[2];

        c = tempConvert(glob.data5);
        glob.color5 = c[0]; 
        glob.color5b = c[1];
        glob.perc5 = c[2];

        c = tempConvert(glob.data6);
        glob.color6 = c[0]; 
        glob.color6b = c[1];
        glob.perc6 = c[2];

        c = tempConvert(glob.data7);
        glob.color7 = c[0]; 
        glob.color7b = c[1];
        glob.perc7 = c[2];
        }

     });
}

////////////////////////////////////////

function drawInsideTemp()
{
    var room1  = "Meeting Room";
    var room2  = "Main Lab";
    var room3  = "Machine Room";
    var room4a = "Thin";
    var room4b = "Rooms";
    var room5a = "Work";
    var room5b = "Room";
    var room6  = "Classroom";
    var room7  = "Ph.D. Room";

    drawBox(gwin.leftMargin,      50, 100, 150, "white", 1);
    drawBox(gwin.leftMargin+150,  50, 100, 150, "white", 1);
    drawBox(gwin.leftMargin+300,  50, 150, 150, "white", 1); 
    drawBox(gwin.leftMargin+300, 200,  75, 150, "white", 1);
    drawBox(gwin.leftMargin+225, 175, 100,  75, "white", 1);
    drawBox(gwin.leftMargin+150, 175, 100,  75, "white", 1);
    drawBox(gwin.leftMargin,     175, 100, 150, "white", 1);

    if (glob.color1 != "NULL")
        {
        drawBox(gwin.leftMargin, 50, 100, 150, glob.color7, glob.perc7);
        drawBox(gwin.leftMargin, 50, 100, 150, glob.color7b, 1-glob.perc7);

        drawBox(gwin.leftMargin+150, 50, 100, 150, glob.color1, glob.perc1);
        drawBox(gwin.leftMargin+150, 50, 100, 150, glob.color1b, 1-glob.perc1);
               
        drawBox(gwin.leftMargin+300, 50, 150, 150, glob.color2, glob.perc2);
        drawBox(gwin.leftMargin+300, 50, 150, 150, glob.color2b, 1-glob.perc2);

        drawBox(gwin.leftMargin+300, 200, 75, 150, glob.color3, glob.perc3);
        drawBox(gwin.leftMargin+300, 200, 75, 150, glob.color3b, 1-glob.perc3);

        drawBox(gwin.leftMargin+225, 175, 100, 75, glob.color4, glob.perc4);
        drawBox(gwin.leftMargin+225, 175, 100, 75, glob.color4b, 1-glob.perc4);

        drawBox(gwin.leftMargin+150, 175, 100, 75, glob.color5, glob.perc5);
        drawBox(gwin.leftMargin+150, 175, 100, 75, glob.color5b, 1-glob.perc5);
            
        drawBox(gwin.leftMargin, 175, 100, 150, glob.color6, glob.perc6);
        drawBox(gwin.leftMargin, 175, 100, 150, glob.color6b, 1-glob.perc6);
        }
            
    //--------------------------------------


    drawTextLeft(gwin.leftMargin, 320, gwin.date, gwin.largeFontSize)

    // if hour < 10 indent a bit
    hourIndent = 0;
    if (gwin.hour.length < 5)
        hourIndent = 20;
      
    if (gwin.itsF)  
        drawTextRight(gwin.canvasWidth-5, 320, gwin.hour+" "+gwin.ampm, gwin.largeFontSize)
    else
       drawTextRight(gwin.canvasWidth-5, 320, gwin.hour, gwin.largeFontSize)
 
 var textHeightHigh = 135;
 var textHeightLow = 260;

    if (glob.color1 != "NULL")
        {
        drawText(gwin.leftMargin+75,  textHeightLow,  ForC(glob.data6), gwin.largeFontSize)
        drawText(gwin.leftMargin+75,  textHeightHigh, ForC(glob.data7), gwin.largeFontSize)
        drawText(gwin.leftMargin+225, textHeightHigh, ForC(glob.data1), gwin.largeFontSize)
        drawText(gwin.leftMargin+375, textHeightHigh, ForC(glob.data2), gwin.largeFontSize)
        drawText(gwin.leftMargin+375, textHeightLow,  ForC(glob.data3), gwin.largeFontSize) 
        drawText(gwin.leftMargin+263, textHeightLow,  ForC(glob.data4), gwin.largeFontSize)
        drawText(gwin.leftMargin+187, textHeightLow,  ForC(glob.data5), gwin.largeFontSize)
        }

    drawText(gwin.leftMargin+75,  200, room6, gwin.smallFontSize)
    drawText(gwin.leftMargin+75,   75, room7, gwin.smallFontSize)
    drawText(gwin.leftMargin+225,  75, room1, gwin.smallFontSize)
    drawText(gwin.leftMargin+375,  75, room2, gwin.smallFontSize)
    drawText(gwin.leftMargin+375, 220, room3, gwin.smallFontSize)
    drawText(gwin.leftMargin+263, 200, room4a, gwin.smallFontSize)
    drawText(gwin.leftMargin+263, 220, room4b, gwin.smallFontSize)
    drawText(gwin.leftMargin+187, 200, room5a, gwin.smallFontSize)
    drawText(gwin.leftMargin+187, 220, room5b, gwin.smallFontSize)
}

////////////////////////////////////////

function updateAll()
{
    console.log("updateAll");
    updateOutsideTemp();
    updateInsideTemp(); 
}

////////////////////////////////////////

function drawAll()
{

    gwin.sampleSVG.selectAll("*").remove();
    drawBorderlessBox(0,      0, 1.05 * gwin.canvasHeight, 1.05 * gwin.canvasWidth, "white", 1);

    drawBasicStuff();
    drawOutsideTemp();
    drawInsideTemp(); 
}

////////////////////////////////////////

function updateText()
{
    gwin.massiveFont = parseInt(38*gwin.scaleFactor);
    gwin.massiveFontSize   = gwin.massiveFont.toString()+"px";

    gwin.largeFont = parseInt(36*gwin.scaleFactor);
    gwin.largeFontSize   = gwin.largeFont.toString()+"px";

    gwin.smallFont = parseInt(18*gwin.scaleFactor);
    gwin.smallFontSize   = gwin.smallFont.toString()+"px";

    gwin.rounded = parseInt(8*gwin.scaleFactor);    
}

////////////////////////////////////////

function updateWindow(){
    var w = window,
    d = document,
    e = d.documentElement,
    g = d.getElementsByTagName('body')[0],
    x = w.innerWidth || e.clientWidth || g.clientWidth,
    y = w.innerHeight|| e.clientHeight|| g.clientHeight;

    var scaleFactorX = x / gwin.canvasWidth;
    var scaleFactorY = y / gwin.canvasHeight;

    gwin.scaleFactor = 0.97 * Math.min(scaleFactorX, scaleFactorY)

    updateText();

    gwin.sampleSVG.append("svg:rect")
    .style("stroke", "white")
    .style("fill", "white")
    .style("fill-opacity", 1)
    .attr("x", 0)
    .attr("y", 0)
    .attr("rx", gwin.rounded)
    .attr("ry", gwin.rounded)
    .attr("height", y)
    .attr("width", x);

    gwin.sampleSVG.attr("width", parseInt(gwin.canvasWidth * gwin.scaleFactor));
    gwin.sampleSVG.attr("height", parseInt(gwin.canvasHeight * gwin.scaleFactor));

    drawAll();
}

////////////////////////////////////////

var weather = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous"; //onfinish
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
		gwin.sampleSVG = this.svg;

		updateAll();
		this.draw_d3(date);
	},

	load: function(state, date) {
	},

	draw_d3: function(date) {
		// Get width height from the supporting div		
		var x = this.element.clientWidth;
		var y = this.element.clientHeight;

	    var scaleFactorX = x / gwin.canvasWidth;
	    var scaleFactorY = y / gwin.canvasHeight;

	    gwin.scaleFactor = 0.97 * Math.min(scaleFactorX, scaleFactorY);

	    updateText();

	    gwin.sampleSVG.append("svg:rect")
	    .style("stroke", "white")
	    .style("fill", "white")
	    .style("fill-opacity", 1)
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("rx", gwin.rounded)
	    .attr("ry", gwin.rounded)
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
        //drawAll();
	},

	event: function(eventType, userId, x, y, data, date) {
		if (eventType === "pointerPress" && (data.button === "left") ) {
		}
		if (eventType === "pointerMove" ) {
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
        gwin.itsF = !gwin.itsF;
        this.refresh(date);
        //updateAll();
        //drawAll();
		}
	}
	
});
