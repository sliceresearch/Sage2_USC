// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var weather = SAGE2_App.extend( {
    construct: function() {
        arguments.callee.superClass.construct.call(this);

        this.resizeEvents = "continuous"; //onfinish
        this.svg = null;

    this.gwin = {};
    this.gwin.itsF = "F"; // Fahrenheit or Celsius or Kelvin
  
    this.gwin.sampleSVG = null;

    this.gwin.date = "Loading ...";
    this.gwin.hour = "" ;
    this.gwin.ampm = "";
    this.gwin.outside = "NULL";
    this.gwin.roughDate = "";

    this.gwin.displayFont = "Arial";
    this.gwin.massiveFont = 18;
    this.gwin.massiveFontSize = 18;
    this.gwin.largeFont = 18;
    this.gwin.largeFontSize = 18;
    this.gwin.smallFont = 18;
    this.gwin.smallFontSize = 18;

    this.gwin.rounded = 8; 

    this.gwin.scaleFactor = 1.0; // 0.75 is a decent minimum

    this.gwin.leftMargin = 20;
    this.gwin.canvasHeight = 400;
    this.gwin.canvasWidth = 435 + 2 * this.gwin.leftMargin;

    this.gwin.weatherIcon = "";
    this.gwin.weatherImage = new Image();
    this.gwin.iconSet = "";

    this.glob = {};
    this.glob.perc1 = 1;
    this.glob.perc2 = 1;
    this.glob.perc3 = 1;
    this.glob.perc4 = 1;
    this.glob.perc5 = 1;
    this.glob.perc6 = 1;
    this.glob.perc7 = 1;
    this.glob.color1 = "NULL";
    this.glob.color2 = "NULL";
    this.glob.color3 = "NULL";
    this.glob.color4 = "NULL";
    this.glob.color5 = "NULL";
    this.glob.color6 = "NULL";
    this.glob.color7 = "NULL";

    this.glob.color1b = "#AAAAAA";
    this.glob.color2b = "#AAAAAA";
    this.glob.color3b = "#AAAAAA";
    this.glob.color4b = "#AAAAAA";
    this.glob.color5b = "#AAAAAA";
    this.glob.color6b = "#AAAAAA";
    this.glob.color7b = "#AAAAAA";

    this.glob.data1 = -1;
    this.glob.data2 = -1;
    this.glob.data3 = -1;
    this.glob.data4 = -1;
    this.glob.data5 = -1;
    this.glob.data6 = -1;
    this.glob.data7 = -1;

    this.glob.colorOut = "#AAAAAA";
    this.glob.colorOutb = "#AAAAAA";
    this.glob.percOut = 0;

    this.glob.temp_hot            = 85;
    this.glob.temp_nice           = 70;
    this.glob.temp_cold           = 60;
    this.glob.temp_colderer       = 30;
    this.glob.temp_coldererer     = 0;
},

////////////////////////////////////////

initApp: function(temperatureScale)
{
    // should so some error checking on temperatureScale
        // and maybe flip it to upper case to be safe as well

    if (temperatureScale)
            this.gwin.itsF = temperatureScale;

    this.weatherOutsideCallbackFunc = this.weatherOutsideCallback.bind(this);
    this.weatherInsideCallbackFunc = this.weatherInsideCallback.bind(this);
},

////////////////////////////////////////

nextTemp: function()
{
    if (this.gwin.itsF == "C")
            this.gwin.itsF = "K";
    else if (this.gwin.itsF == "K")
            this.gwin.itsF = "F";
    else if (this.gwin.itsF == "F")
            this.gwin.itsF = "C";
},

////////////////////////////////////////

tempConvert: function (data)
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
    else if (data < this.glob.temp_coldererer)
        {
        color = color_coldererer;
        colorb = color_coldererer;
        perc  = 1;
        }
    else if (data < this.glob.temp_colderer)
        {
        color = color_colderer;
        colorb = color_coldererer;
        perc = (data - this.glob.temp_coldererer) / (this.glob.temp_colderer - this.glob.temp_coldererer);
        }
    else if (data < this.glob.temp_cold)
        {
        color = color_cold;
        colorb = color_colderer;
        perc = (data - this.glob.temp_colderer) / (this.glob.temp_cold - this.glob.temp_colderer);
        }
    else if (data < this.glob.temp_nice)
        {
        color = color_nice;
        colorb = color_cold;
        perc = (data - this.glob.temp_cold) / (this.glob.temp_nice - this.glob.temp_cold);       
        }       
    else
        {
        color = color_hot;
        colorb = color_nice;
        perc = (data - this.glob.temp_nice) / (this.glob.temp_hot - this.glob.temp_nice);
        }

    if (perc > 1.0)
        perc = 1.0;
    if (perc < 0.0)
        perc = 0.0;
                
    return [color, colorb, perc];
},

////////////////////////////////////////

ForC: function (data)
{
    if (this.gwin.itsF == "C")
        return(Math.round((parseInt(data)-32)*5/9));
    else if (this.gwin.itsF == "K")
        return(Math.round((parseInt(data)-32)*5/9+273.15));
    else
        return(data); // F
},

////////////////////////////////////////

drawBox: function (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)
{
     this.gwin.sampleSVG.append("svg:rect")
        .style("stroke", "black")
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .attr("x", parseInt(boxLocX*this.gwin.scaleFactor))
        .attr("y", parseInt(boxLocY*this.gwin.scaleFactor))
        .attr("rx", this.gwin.rounded)
        .attr("ry", this.gwin.rounded)
        .attr("height", parseInt(boxHeight*this.gwin.scaleFactor))
        .attr("width", parseInt(boxWidth*this.gwin.scaleFactor));
},

drawBorderlessBox: function (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)
{
     this.gwin.sampleSVG.append("svg:rect")
        .style("stroke", colorOut)
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .attr("x", parseInt(boxLocX*this.gwin.scaleFactor))
        .attr("y", parseInt(boxLocY*this.gwin.scaleFactor))
        .attr("rx", this.gwin.rounded)
        .attr("ry", this.gwin.rounded)
        .attr("height", parseInt(boxHeight*this.gwin.scaleFactor))
        .attr("width", parseInt(boxWidth*this.gwin.scaleFactor));
},

////////////////////////////////////////

drawT: function (textLocX, textLocY, theText, textFontSize, justification)
{
    this.gwin.sampleSVG.append("svg:text")
        .attr("x", parseInt(textLocX*this.gwin.scaleFactor))
        .attr("y", parseInt(textLocY*this.gwin.scaleFactor))
        .style("fill", "#000")
        .style("font-size", textFontSize)
        .style("font-family", this.gwin.displayFont)
        .style("text-anchor", justification)
        .text(theText);   
},

drawText: function (textLocX, textLocY, theText, textFontSize)
{
    this.drawT(textLocX, textLocY, theText, textFontSize, "middle");
},

drawTextLeft: function (textLocX, textLocY, theText, textFontSize)
{
    this.drawT(textLocX, textLocY, theText, textFontSize, "start");  
},

drawTextRight: function (textLocX, textLocY, theText, textFontSize)
{
    this.drawT(textLocX, textLocY, theText, textFontSize, "end");  
},

////////////////////////////////////////

drawTempText: function (textColor)
{
    var tempSys = " " + this.gwin.itsF;

    // ouside temperature text
    this.gwin.sampleSVG.append("svg:text")
        .attr("x", parseInt(this.gwin.canvasWidth*0.5*this.gwin.scaleFactor))
        .attr("y", parseInt(378*this.gwin.scaleFactor))
        .style("fill", textColor)
        .style("font-size", this.gwin.largeFontSize)
        .style("font-family", this.gwin.displayFont)
        .style("text-anchor", "middle")
        .text("Outside it is "+Math.round(this.ForC(this.gwin.outside))+ tempSys);

    // icons for the current weather conditions
    this.gwin.sampleSVG.append("image")
        .attr("xlink:href", this.gwin.weatherImage.src)
        .attr("opacity", 1)
        .attr("x", parseInt(this.gwin.canvasWidth*0.83*this.gwin.scaleFactor))
        .attr("y", parseInt(340*this.gwin.scaleFactor))
        .attr("width", 50*this.gwin.scaleFactor) // -10
        .attr("height", 50*this.gwin.scaleFactor); // -10
 
    this.gwin.sampleSVG.append("image")
        .attr("xlink:href", this.gwin.weatherImage.src)
        .attr("opacity", 1)
        .attr("x", parseInt(this.gwin.canvasWidth*0.08 *this.gwin.scaleFactor))
        .attr("y", parseInt(340*this.gwin.scaleFactor))
        .attr("width", 50*this.gwin.scaleFactor) // -10
        .attr("height", 50*this.gwin.scaleFactor); // -10       
    },

////////////////////////////////////////

drawBasicStuff: function ()
{
    this.drawText(this.gwin.canvasWidth*0.5, 35, "Current weather inside evl", this.gwin.massiveFontSize);
},

////////////////////////////////////////

weatherOutsideCallback: function(error, weatherOut)
{
    if(error)
        {
        console.log("weatherOutsideCallback - error");
        return;
        }

   if(weatherOut == null)
        {
        console.log("weatherOut has no data");
        return;
        }

    var weather = weatherOut.query.results.current_observation.temp_f;
    this.gwin.iconSet = weatherOut.query.results.current_observation.icons.icon_set;
    
    // should use the name field to make sure I get the correct one
    this.gwin.weatherIcon = this.gwin.iconSet[8].icon_url;
    this.gwin.weatherImage.src = this.gwin.weatherIcon;
    
    this.gwin.outside = weather;
},

updateOutsideTemp: function ()
{
    d3.json("https://query.yahooapis.com/v1/public/yql?q=select%20temp_f%2C%20weather%2C%20icons%20from%20wunderground.currentobservation%20where%20location%3D'Chicago%2C%20IL'%3B&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=", this.weatherOutsideCallbackFunc);
},

////////////////////////////////////////

drawOutsideTemp: function ()
{
    this.drawBox(this.gwin.leftMargin, 340, 50, 450, "white", 1);

    if (this.gwin.outside != "NULL")
        {
        c = this.tempConvert(this.gwin.outside);
        this.glob.colorOut = c[0];
        this.glob.colorOutb = c[1];
        this.glob.percOut = c[2];

        this.drawBox(this.gwin.leftMargin, 340, 50, 450, this.glob.colorOut, this.glob.percOut);
        this.drawBox(this.gwin.leftMargin, 340, 50, 450, this.glob.colorOutb, 1.0 - this.glob.percOut);
                
        if (this.gwin.outside < this.glob.temp_colderer)
            this.drawTempText("#FFF");
        else
            this.drawTempText("#000");
        }
},

////////////////////////////////////////

convertTimeFormat: function()
{
    var d1, d2;
    
    d1 = this.gwin.roughDate;

    if (d1 === "")
        return;

    d2 = d1.split(" ");

    this.gwin.date = d2[0];
    this.gwin.hour = d2[1];
    //this.gwin.ampm = d2[2];
    this.gwin.ampm = d2[2].toLowerCase();

    var dateSplit;
    var dateMonth, dateDay, dateYear;

    var hourAndMinute = this.gwin.hour.split(":");
    var hourCompute = + hourAndMinute[0];
    var minuteCompute = + hourAndMinute[1];

    this.gwin.hour = hourCompute+":"+hourAndMinute[1];

    // if we are on the metric side also go to 24 hour clock
    if ((this.gwin.itsF != "F") && (this.gwin.ampm == "pm"))
        { // need to break into to integers based on the colon then re-form}
         if (hourCompute < 12)
            hourCompute += 12;
 
        this.gwin.hour = hourCompute.toString()+ ":" + hourAndMinute[1];
    }

    // handle 12:XX am
    if ((this.gwin.itsF != "F") && (this.gwin.ampm == "am"))
        { // need to break into to integers based on the colon then re-form}
         if (hourCompute >= 12)
            hourCompute = 0;
 
        this.gwin.hour = hourCompute.toString() + ":" + hourAndMinute[1];
    }

        if ((this.gwin.hour.charAt(0) == "0") && (this.gwin.hour.charAt(1) != ":"))
            this.gwin.hour = this.gwin.hour.slice(1);

        dateSplit = this.gwin.date.split("/");
        dateMonth = dateSplit[0];
        dateDay = dateSplit[1];
        dateYear = dateSplit[2];

        if (dateDay[0] == "0")
            dateDay = dateDay[1];
 
        if (this.gwin.itsF == "F")
            this.gwin.date = dateMonth + " " + dateDay +", " + dateYear;
        else      
            this.gwin.date = dateDay + " " + dateMonth + " " + dateYear;
     
},

weatherInsideCallback: function(error, datasetTextIn)
{
    if (error)
        {
        console.log("weatherInsideCallback - error");
        return;
        }

    var parsedCSV = d3.csv.parseRows(datasetTextIn);
    var d1, d2;

    this.gwin.roughDate = parsedCSV[0][0];

     // if no new data is found do not try to convert nonexistent temperatures
    // just draw using the previous temperatures
    if (parsedCSV.length >= 9)
        {      
        d1 = parsedCSV[2][0];
        d2 = d1.split(" ");
        this.glob.data7 = d2[2];

        d1 = parsedCSV[3][0];
        d2 = d1.split(" ");
        this.glob.data6 = d2[2];

        d1 = parsedCSV[4][0];
        d2 = d1.split(" ");
        this.glob.data4 = d2[2];

        d1 = parsedCSV[5][0];
        d2 = d1.split(" ");
        this.glob.data5 = d2[2];

        d1 = parsedCSV[6][0];
        d2 = d1.split(" ");
        this.glob.data2 = d2[2];

        d1 = parsedCSV[7][0];
        d2 = d1.split(" ");
        this.glob.data1 = d2[2];

        d1 = parsedCSV[8][0];
        d2 = d1.split(" ");
        this.glob.data3 = d2[2];

        //--------------------------------------

        c = this.tempConvert(this.glob.data1);
        this.glob.color1 = c[0]; 
        this.glob.color1b = c[1];
        this.glob.perc1 = c[2];

        c = this.tempConvert(this.glob.data2);
        this.glob.color2 = c[0]; 
        this.glob.color2b = c[1];
        this.glob.perc2 = c[2];

        c = this.tempConvert(this.glob.data3);
        this.glob.color3 = c[0]; 
        this.glob.color3b = c[1];
        this.glob.perc3 = c[2];

        c = this.tempConvert(this.glob.data4);
        this.glob.color4 = c[0]; 
        this.glob.color4b = c[1];
        this.glob.perc4 = c[2];

        c = this.tempConvert(this.glob.data5);
        this.glob.color5 = c[0]; 
        this.glob.color5b = c[1];
        this.glob.perc5 = c[2];

        c = this.tempConvert(this.glob.data6);
        this.glob.color6 = c[0]; 
        this.glob.color6b = c[1];
        this.glob.perc6 = c[2];

        c = this.tempConvert(this.glob.data7);
        this.glob.color7 = c[0]; 
        this.glob.color7b = c[1];
        this.glob.perc7 = c[2];
    }
},

updateInsideTemp: function ()
{
// need to add a random number to the end of the request to avoid browser caching
// http://stackoverflow.com/questions/13053096/avoid-data-caching-when-using-d3-text

    // d3.text("ftp://ftp.evl.uic.edu/pub/INcoming/andy/Final_temps.txt" + '?' + 
    d3.text("http://lyra.evl.uic.edu:9000/TEMPS/Final_temps.txt" + '?' +
     // d3.text("http://www.evl.uic.edu/aej/TEMPS/Final_temps.txt" + '?' + 
         Math.floor(Math.random() * 10000000), this.weatherInsideCallbackFunc);
},

////////////////////////////////////////

drawInsideTemp: function ()
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

    this.convertTimeFormat();

    this.drawBox(this.gwin.leftMargin,      50, 100, 150, "white", 1);
    this.drawBox(this.gwin.leftMargin+150,  50, 100, 150, "white", 1);
    this.drawBox(this.gwin.leftMargin+300,  50, 150, 150, "white", 1); 
    this.drawBox(this.gwin.leftMargin+300, 200,  75, 150, "white", 1);
    this.drawBox(this.gwin.leftMargin+225, 175, 100,  75, "white", 1);
    this.drawBox(this.gwin.leftMargin+150, 175, 100,  75, "white", 1);
    this.drawBox(this.gwin.leftMargin,     175, 100, 150, "white", 1);

    if (this.glob.color1 != "NULL")
        {
        this.drawBox(this.gwin.leftMargin, 50, 100, 150, this.glob.color7, this.glob.perc7);
        this.drawBox(this.gwin.leftMargin, 50, 100, 150, this.glob.color7b, 1-this.glob.perc7);

        this.drawBox(this.gwin.leftMargin+150, 50, 100, 150, this.glob.color1, this.glob.perc1);
        this.drawBox(this.gwin.leftMargin+150, 50, 100, 150, this.glob.color1b, 1-this.glob.perc1);
               
        this.drawBox(this.gwin.leftMargin+300, 50, 150, 150, this.glob.color2, this.glob.perc2);
        this.drawBox(this.gwin.leftMargin+300, 50, 150, 150, this.glob.color2b, 1-this.glob.perc2);

        this.drawBox(this.gwin.leftMargin+300, 200, 75, 150, this.glob.color3, this.glob.perc3);
        this.drawBox(this.gwin.leftMargin+300, 200, 75, 150, this.glob.color3b, 1-this.glob.perc3);

        this.drawBox(this.gwin.leftMargin+225, 175, 100, 75, this.glob.color4, this.glob.perc4);
        this.drawBox(this.gwin.leftMargin+225, 175, 100, 75, this.glob.color4b, 1-this.glob.perc4);

        this.drawBox(this.gwin.leftMargin+150, 175, 100, 75, this.glob.color5, this.glob.perc5);
        this.drawBox(this.gwin.leftMargin+150, 175, 100, 75, this.glob.color5b, 1-this.glob.perc5);
            
        this.drawBox(this.gwin.leftMargin, 175, 100, 150, this.glob.color6, this.glob.perc6);
        this.drawBox(this.gwin.leftMargin, 175, 100, 150, this.glob.color6b, 1-this.glob.perc6);
        }
            
    //--------------------------------------

    this.drawTextLeft(this.gwin.leftMargin, 320, this.gwin.date, this.gwin.largeFontSize);

    // if hour < 10 indent a bit
    hourIndent = 0;
    if (this.gwin.hour.length < 5)
        hourIndent = 20;
      
    if (this.gwin.itsF == "F")  
        this.drawTextRight(this.gwin.canvasWidth-5, 320, this.gwin.hour+" "+this.gwin.ampm, this.gwin.largeFontSize);
    else
       this.drawTextRight(this.gwin.canvasWidth-5, 320, this.gwin.hour, this.gwin.largeFontSize);
 
    var textHeightHigh = 135;
    var textHeightLow = 260;

    if (this.glob.color1 != "NULL")
        {
        this.drawText(this.gwin.leftMargin+75,  textHeightLow,  this.ForC(this.glob.data6), this.gwin.largeFontSize);
        this.drawText(this.gwin.leftMargin+75,  textHeightHigh, this.ForC(this.glob.data7), this.gwin.largeFontSize);
        this.drawText(this.gwin.leftMargin+225, textHeightHigh, this.ForC(this.glob.data1), this.gwin.largeFontSize);
        this.drawText(this.gwin.leftMargin+375, textHeightHigh, this.ForC(this.glob.data2), this.gwin.largeFontSize);
        this.drawText(this.gwin.leftMargin+375, textHeightLow,  this.ForC(this.glob.data3), this.gwin.largeFontSize);
        this.drawText(this.gwin.leftMargin+263, textHeightLow,  this.ForC(this.glob.data4), this.gwin.largeFontSize);
        this.drawText(this.gwin.leftMargin+187, textHeightLow,  this.ForC(this.glob.data5), this.gwin.largeFontSize);
        }

    this.drawText(this.gwin.leftMargin+75,  200, room6, this.gwin.smallFontSize);
    this.drawText(this.gwin.leftMargin+75,   75, room7, this.gwin.smallFontSize);
    this.drawText(this.gwin.leftMargin+225,  75, room1, this.gwin.smallFontSize);
    this.drawText(this.gwin.leftMargin+375,  75, room2, this.gwin.smallFontSize);
    this.drawText(this.gwin.leftMargin+375, 220, room3, this.gwin.smallFontSize);
    this.drawText(this.gwin.leftMargin+263, 200, room4a, this.gwin.smallFontSize);
    this.drawText(this.gwin.leftMargin+263, 220, room4b, this.gwin.smallFontSize);
    this.drawText(this.gwin.leftMargin+187, 200, room5a, this.gwin.smallFontSize);
    this.drawText(this.gwin.leftMargin+187, 220, room5b, this.gwin.smallFontSize);
},

////////////////////////////////////////

updateAll: function ()
{
    this.updateOutsideTemp();
    this.updateInsideTemp(); 
},

////////////////////////////////////////

drawAll: function ()
{
    this.gwin.sampleSVG.selectAll("*").remove();
    this.drawBorderlessBox(0, 0, 1.05 * this.gwin.canvasHeight, 1.05 * this.gwin.canvasWidth, "white", 1);

    this.drawBasicStuff();
    this.drawOutsideTemp();
    this.drawInsideTemp(); 
},

////////////////////////////////////////

updateText: function ()
{
    this.gwin.massiveFont = parseInt(38*this.gwin.scaleFactor);
    this.gwin.massiveFontSize   = this.gwin.massiveFont.toString()+"px";

    this.gwin.largeFont = parseInt(36*this.gwin.scaleFactor);
    this.gwin.largeFontSize   = this.gwin.largeFont.toString()+"px";

    this.gwin.smallFont = parseInt(18*this.gwin.scaleFactor);
    this.gwin.smallFontSize   = this.gwin.smallFont.toString()+"px";

    this.gwin.rounded = parseInt(8*this.gwin.scaleFactor);    
},

////////////////////////////////////////

updateWindow: function (){
    var w = window,
    d = document,
    e = d.documentElement,
    g = d.getElementsByTagName('body')[0],
    x = w.innerWidth || e.clientWidth || g.clientWidth,
    y = w.innerHeight|| e.clientHeight|| g.clientHeight;

    var scaleFactorX = x / this.gwin.canvasWidth;
    var scaleFactorY = y / this.gwin.canvasHeight;

    this.gwin.scaleFactor = 0.97 * Math.min(scaleFactorX, scaleFactorY);

    this.updateText();

    this.gwin.sampleSVG.append("svg:rect")
    .style("stroke", "white")
    .style("fill", "white")
    .style("fill-opacity", 1)
    .attr("x", 0)
    .attr("y", 0)
    .attr("rx", this.gwin.rounded)
    .attr("ry", this.gwin.rounded)
    .attr("height", y)
    .attr("width", x);

    this.gwin.sampleSVG.attr("width", parseInt(this.gwin.canvasWidth * this.gwin.scaleFactor));
    this.gwin.sampleSVG.attr("height", parseInt(this.gwin.canvasHeight * this.gwin.scaleFactor));

    this.drawAll();
},

////////////////////////////////////////


	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

        this.maxFPS = 0.1; // 0.05

		// Get width height from the supporting div		
		var divWidth  = this.element.clientWidth;
		var divHeight = this.element.clientHeight;

		this.element.id = "div" + id;

		// backup of the context
		var self = this;

		// attach the SVG into the this.element node provided to us
		var box="0,0,"+width+","+height;
		this.svg = d3.select(this.element).append("svg:svg")
		    .attr("width",   divWidth)
		    .attr("height",  divHeight)
		    .attr("viewBox", box);
		this.gwin.sampleSVG = this.svg;

        this.initApp ("F");
		this.updateAll();
		this.draw_d3(date);
	},

	load: function(state, date) {
	},

	draw_d3: function(date) {
		// Get width height from the supporting div		
		var x = this.element.clientWidth;
		var y = this.element.clientHeight;

	    var scaleFactorX = x / this.gwin.canvasWidth;
	    var scaleFactorY = y / this.gwin.canvasHeight;

	    this.gwin.scaleFactor = 0.97 * Math.min(scaleFactorX, scaleFactorY);

	    this.updateText();

	    this.gwin.sampleSVG.append("svg:rect")
	    .style("stroke", "white")
	    .style("fill", "white")
	    .style("fill-opacity", 1)
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("rx", this.gwin.rounded)
	    .attr("ry", this.gwin.rounded)
	    .attr("height", y)
	    .attr("width", x);

	    this.drawBasicStuff();
	},
	
	draw: function(date) {
	    this.updateAll();
        this.drawAll();
	},

	resize: function(date) {
		this.svg.attr('width' ,  this.element.clientWidth  +"px");
		this.svg.attr('height' , this.element.clientHeight  +"px");

        // force immediate re-draw
        this.updateAll();
        this.drawAll();

		//this.refresh(date);
	},

	event: function(eventType, userId, x, y, data, date) {
		if (eventType === "pointerPress" && (data.button === "left") ) {
		}
		if (eventType === "pointerMove" ) {
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
            this.nextTemp();

            // force an immediate re-draw
            this.updateAll();
            this.drawAll();
		}
	}
	
});
