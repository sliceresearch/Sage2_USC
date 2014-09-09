// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

////////////////////////////////////////
// simple evl weather viewer
// Written by Andy Johnson - 2005 - 2014
// now in D3 / SVG / SAGE
////////////////////////////////////////

var weather = SAGE2_App.extend( {
    construct: function() {
        arguments.callee.superClass.construct.call(this);

        this.resizeEvents = "continuous"; //onfinish
        this.svg = null;

    this.gwin = {};
    this.myTag = "";
  
    this.gwin.sampleSVG = null;

    this.gwin.date = "Loading ...";
    this.gwin.hour = "" ;
    this.gwin.ampm = "";
    this.gwin.outside = "NULL";
    this.gwin.roughDate = "";

    this.gwin.displayFont = "Arial";
    this.gwin.massiveFontSize = "38px";
    this.gwin.largeFontSize = "36px";
    this.gwin.smallFontSize = "18px";

    this.gwin.canvasBackground = "white";

    this.gwin.rounded = 8; 

    this.gwin.margin = 20;
    this.gwin.canvasHeight = 400;
    this.gwin.canvasWidth = 450 + (2 * this.gwin.margin);

    this.gwin.weatherIcon = "";
    this.gwin.weatherImage = new Image();
    this.gwin.iconSet = "";

    this.gwin.conditions = "";

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

    // add the temperature unit into the state
    this.state.itsF = null;

},

////////////////////////////////////////

initApp: function(temperatureScale)
{
    // should also make sure temperatureScale is a legal value

    if (temperatureScale)
        this.state.itsF = temperatureScale.toUpperCase();

    this.weatherOutsideCallbackFunc = this.weatherOutsideCallback.bind(this);
    this.weatherInsideCallbackFunc = this.weatherInsideCallback.bind(this);
},

////////////////////////////////////////

nextTemp: function()
{
    if (this.state.itsF == "C")
            this.state.itsF = "K";
    else if (this.state.itsF == "K")
            this.state.itsF = "F";
    else if (this.state.itsF == "F")
            this.state.itsF = "C";
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
        color = color_warmer;
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
    if (this.state.itsF == "C")
        return(Math.round((parseInt(data)-32)*5/9));
    else if (this.state.itsF == "K")
        return(Math.round((parseInt(data)-32)*5/9+273.15));
    else
        return(data); // F by default
},

////////////////////////////////////////


drawBox: function (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut, roomNum)
{
    var b = null;

  if (this.gwin.sampleSVG !== null)
    {
        b = this.gwin.sampleSVG.append("svg:rect")
        .style("stroke", "black")
        .style("stroke-width", 2)
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .attr("x", boxLocX)
        .attr("y", boxLocY)
        .attr("rx", this.gwin.rounded)
        .attr("ry", this.gwin.rounded)
        .attr("height", boxHeight)
        .attr("width", boxWidth);

    switch(roomNum) {
        case 1:
             b.on("click", this.room1CallbackFunc); break;
        case 2:
             b.on("click", this.room2CallbackFunc); break;
        case 3:
             b.on("click", this.room3CallbackFunc); break;
        case 4:
             b.on("click", this.room4CallbackFunc); break;
        case 5:
             b.on("click", this.room5CallbackFunc); break;
        case 6:
             b.on("click", this.room6CallbackFunc); break;
        case 7:
             b.on("click", this.room7CallbackFunc); break;
        }
    }

        
},

drawRoom: function (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut, roomNum)
{
    this.drawBox(boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut, roomNum);
},

room1Callback: function()
{
    console.log("room 1");
},
room2Callback: function()
{
    console.log("room 2");
},
room3Callback: function()
{
    console.log("room 3");
},
room4Callback: function()
{
    console.log("room 4");
},
room5Callback: function()
{
    console.log("room 5");
},
room6Callback: function()
{
    console.log("room 6");
},
room7Callback: function()
{
    console.log("room 7");
},

drawBorderlessBox: function (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)
{
    if (this.gwin.sampleSVG !== null)
     this.gwin.sampleSVG.append("svg:rect")
        .style("stroke", colorOut)
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .attr("x", boxLocX)
        .attr("y", boxLocY)
        .attr("rx", this.gwin.rounded)
        .attr("ry", this.gwin.rounded)
        .attr("height", boxHeight)
        .attr("width", boxWidth);
},

////////////////////////////////////////

drawT: function (textLocX, textLocY, theText, textFontSize, justification)
{
    if (this.gwin.sampleSVG !== null)
        this.gwin.sampleSVG.append("svg:text")
            .attr("x", textLocX)
            .attr("y", textLocY)
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
    var tempSys = " " + this.state.itsF;

    // ouside temperature text
    this.gwin.sampleSVG.append("svg:text")
        .attr("y", 375)
        .style("fill", textColor)
        .style("font-size", "30")
        .style("font-family", this.gwin.displayFont)
        .attr("x", parseInt((this.gwin.canvasWidth+this.gwin.margin+25) * 0.5))
        .style("text-anchor", "middle")
        .text(Math.round(this.ForC(this.gwin.outside))+ tempSys + " - " + this.gwin.conditions.toLowerCase());
 
    this.gwin.sampleSVG.append("svg:image")
        .attr("xlink:href", this.gwin.weatherImage.src)
        .attr("opacity", 1.0)
        .attr("x", this.gwin.margin+10)
        .attr("y", 345)
        .attr("width", 40)
        .attr("height", 40);  
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

   if((weatherOut === null) || (weatherOut.query === null) || (weatherOut.query.results === null) || (weatherOut.query.results.current_observation === null))
        {
        console.log("weatherOut has no data");
        return;
        }

    var weather = weatherOut.query.results.current_observation.temp_f;
    var conditions = weatherOut.query.results.current_observation.weather;
 
        // partly cloudy icon: "Mostly Cloudy" "Overcast" "Scattered Clouds"
        conditions = conditions.split(/\s+/).slice(0,2).join(" ");

        // light rain
        // thunderstorm rain mist
        // heavy thunderstorm rain mist
        // light thunderstorm rain
        // thunderstorm

        // I may need to just take the first 2 words
        // or ignore anything after thunderstorm

    this.gwin.iconSet = weatherOut.query.results.current_observation.icons.icon_set;
    
    // grab the icon name - I will use the same name to grab a local svg icon
    this.gwin.weatherIcon = this.gwin.iconSet[8].icon_url;
    this.gwin.weatherImage.src = this.gwin.weatherIcon;

    var weatherName = this.gwin.weatherIcon.substring(28, this.gwin.weatherIcon.length-4);

   // if weatherName == "clear" or "partly cloudy" or "mostly cloudy"
    // and its between 6pm and 6am then add"-night" to the icon name
 
     var currentHour = new Date().getHours(); // 0-23

    // sometimes the current conditions come back empty
    if (weatherName == "")
        weatherName = "unknown";
    
    // set the default daylight icon for this weather
    this.gwin.weatherImage.src = this.resrcPath + "icons/"+weatherName+".svg";
    //this.gwin.weatherImage.src = "./icons/"+weatherName+".svg";

    // if its night time then swap out the sun icons for the moon icons
    if ( (currentHour < 7) || (currentHour > 18) )
        {
        if ((weatherName == "mostlycloudy") || (weatherName == "partlycloudy") ||
            (weatherName == "clear"))
            {
            this.gwin.weatherImage.src = this.resrcPath + "icons/"+weatherName+"-night.svg";
            }
        }    

    
    this.gwin.outside = weather;

    this.gwin.conditions = conditions;

    this.drawAll();
    },

////////////////////////////////////////

updateOutsideTemp: function ()
{
    d3.json("https://query.yahooapis.com/v1/public/yql?q=select%20temp_f%2C%20weather%2C%20icons%20from%20wunderground.currentobservation%20where%20location%3D'Chicago%2C%20IL'%3B&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=", this.weatherOutsideCallbackFunc);
},

////////////////////////////////////////

drawOutsideTemp: function ()
{
    // draw placeholder outside temperature box
    this.drawBox(this.gwin.margin, 340, 50, 450, "white", 1);

    if (this.gwin.outside != "NULL")
        {
        c = this.tempConvert(this.gwin.outside);
        this.glob.colorOut = c[0];
        this.glob.colorOutb = c[1];
        this.glob.percOut = c[2];

        this.drawBox(this.gwin.margin, 340, 50, 450, this.glob.colorOut, this.glob.percOut);
        this.drawBox(this.gwin.margin, 340, 50, 450, this.glob.colorOutb, 1.0 - this.glob.percOut);

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
    this.gwin.ampm = d2[2].toLowerCase();

    var dateSplit;
    var dateMonth, dateDay, dateYear;

    var hourAndMinute = this.gwin.hour.split(":");
    var hourCompute = + hourAndMinute[0];
    var minuteCompute = + hourAndMinute[1];

    this.gwin.hour = hourCompute+":"+hourAndMinute[1];

    // if we are on the metric side also go to 24 hour clock
    if ((this.state.itsF != "F") && (this.gwin.ampm == "pm"))
        { // need to break into to integers based on the colon then re-form}
         if (hourCompute < 12)
            hourCompute += 12;
 
        this.gwin.hour = hourCompute.toString()+ ":" + hourAndMinute[1];
    }

    // handle 12:XX am
    if ((this.state.itsF != "F") && (this.gwin.ampm == "am"))
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
 
        if (this.state.itsF == "F")
            this.gwin.date = dateMonth + " " + dateDay +", " + dateYear;
        else      
            this.gwin.date = dateDay + " " + dateMonth + " " + dateYear;
},

////////////////////////////////////////

weatherInsideCallback: function(error, datasetTextIn)
{
    if (error)
        {
        console.log("weatherInsideCallback - error");
        return;
        }

    var parsedCSV = d3.csv.parseRows(datasetTextIn);
    var d2;

    this.gwin.roughDate = parsedCSV[0][0];

     // if no new data is found do not try to convert nonexistent temperatures
    // just draw using the previous temperatures
    if (parsedCSV.length >= 9)
        {      
        d2 = parsedCSV[2][0].split(" ");
        this.glob.data7 = d2[2];

        d2 = parsedCSV[3][0].split(" ");
        this.glob.data6 = d2[2];

        d2 = parsedCSV[4][0].split(" ");
        this.glob.data4 = d2[2];

        d2 = parsedCSV[5][0].split(" ");
        this.glob.data5 = d2[2];

        d2 = parsedCSV[6][0].split(" ");
        this.glob.data2 = d2[2];

        d2 = parsedCSV[7][0].split(" ");
        this.glob.data1 = d2[2];

        d2 = parsedCSV[8][0].split(" ");
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

        this.drawAll();
    }
},

updateInsideTemp: function ()
{
// need to add a random number to the end of the request to avoid browser caching
// http://stackoverflow.com/questions/13053096/avoid-data-caching-when-using-d3-text

    // d3.text("ftp://ftp.evl.uic.edu/pub/INcoming/andy/Final_temps.txt" + '?' + 
     d3.text("http://lyra.evl.uic.edu:9000/TEMPS/Final_temps.txt" + '?' +
    //d3.text("http://www.evl.uic.edu/aej/TEMPS/Final_temps.txt" + '?' + 
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

    // draw a white room in case there is no data to show
    this.drawRoom(this.gwin.margin+150,  50, 100, 150, "white", 1, 1);
    this.drawRoom(this.gwin.margin+300,  50, 150, 150, "white", 1, 2); 
    this.drawRoom(this.gwin.margin+300, 200,  75, 150, "white", 1, 3);
    this.drawRoom(this.gwin.margin+225, 175, 100,  75, "white", 1, 4);
    this.drawRoom(this.gwin.margin+150, 175, 100,  75, "white", 1, 5);
    this.drawRoom(this.gwin.margin,     175, 100, 150, "white", 1, 6);
    this.drawRoom(this.gwin.margin,      50, 100, 150, "white", 1, 7);

    // draw the room in the appropriate color for its temperature
    if (this.glob.color1 != "NULL")
        {
        this.drawRoom(this.gwin.margin+150, 50, 100, 150, this.glob.color1, this.glob.perc1, 1);
        this.drawRoom(this.gwin.margin+150, 50, 100, 150, this.glob.color1b, 1-this.glob.perc1, 1);
               
        this.drawRoom(this.gwin.margin+300, 50, 150, 150, this.glob.color2, this.glob.perc2, 2);
        this.drawRoom(this.gwin.margin+300, 50, 150, 150, this.glob.color2b, 1-this.glob.perc2, 2);

        this.drawRoom(this.gwin.margin+300, 200, 75, 150, this.glob.color3, this.glob.perc3, 3);
        this.drawRoom(this.gwin.margin+300, 200, 75, 150, this.glob.color3b, 1-this.glob.perc3, 3);

        this.drawRoom(this.gwin.margin+225, 175, 100, 75, this.glob.color4, this.glob.perc4, 4);
        this.drawRoom(this.gwin.margin+225, 175, 100, 75, this.glob.color4b, 1-this.glob.perc4, 4);

        this.drawRoom(this.gwin.margin+150, 175, 100, 75, this.glob.color5, this.glob.perc5, 5);
        this.drawRoom(this.gwin.margin+150, 175, 100, 75, this.glob.color5b, 1-this.glob.perc5, 5);
            
        this.drawRoom(this.gwin.margin,     175, 100, 150, this.glob.color6, this.glob.perc6, 6);
        this.drawRoom(this.gwin.margin,     175, 100, 150, this.glob.color6b, 1-this.glob.perc6, 6);

        this.drawRoom(this.gwin.margin,      50, 100, 150, this.glob.color7, this.glob.perc7, 7);
        this.drawRoom(this.gwin.margin,      50, 100, 150, this.glob.color7b, 1-this.glob.perc7, 7);
        }
            
    //--------------------------------------

    this.drawTextLeft(this.gwin.margin, 320, this.gwin.date, this.gwin.largeFontSize);

    // if hour < 10 indent a bit
    hourIndent = 0;
    if (this.gwin.hour.length < 5)
        hourIndent = 20;
      
    if (this.state.itsF == "F")  
        this.drawTextRight(this.gwin.canvasWidth-this.gwin.margin, 320, this.gwin.hour+" "+this.gwin.ampm, this.gwin.largeFontSize);
    else
       this.drawTextRight(this.gwin.canvasWidth-this.gwin.margin, 320, this.gwin.hour, this.gwin.largeFontSize);
 
    var textHeightHigh = 135;
    var textHeightLow = 260;

     // draw the temperature in the room
    if (this.glob.color1 != "NULL")
        {
        this.drawText(this.gwin.margin+225, textHeightHigh, this.ForC(this.glob.data1), this.gwin.largeFontSize);
        this.drawText(this.gwin.margin+375, textHeightHigh, this.ForC(this.glob.data2), this.gwin.largeFontSize);
        this.drawText(this.gwin.margin+375, textHeightLow,  this.ForC(this.glob.data3), this.gwin.largeFontSize);
        this.drawText(this.gwin.margin+263, textHeightLow,  this.ForC(this.glob.data4), this.gwin.largeFontSize);
        this.drawText(this.gwin.margin+187, textHeightLow,  this.ForC(this.glob.data5), this.gwin.largeFontSize);
        this.drawText(this.gwin.margin+75,  textHeightLow,  this.ForC(this.glob.data6), this.gwin.largeFontSize);
        this.drawText(this.gwin.margin+75,  textHeightHigh, this.ForC(this.glob.data7), this.gwin.largeFontSize);
        }

    // draw room name
    this.drawText(this.gwin.margin+225,  75, room1, this.gwin.smallFontSize);
    this.drawText(this.gwin.margin+375,  75, room2, this.gwin.smallFontSize);
    this.drawText(this.gwin.margin+375, 220, room3, this.gwin.smallFontSize);
    this.drawText(this.gwin.margin+263, 200, room4a, this.gwin.smallFontSize);
    this.drawText(this.gwin.margin+263, 220, room4b, this.gwin.smallFontSize);
    this.drawText(this.gwin.margin+187, 200, room5a, this.gwin.smallFontSize);
    this.drawText(this.gwin.margin+187, 220, room5b, this.gwin.smallFontSize);
    this.drawText(this.gwin.margin+75,  200, room6, this.gwin.smallFontSize);
    this.drawText(this.gwin.margin+75,   75, room7, this.gwin.smallFontSize);
    this.drawText(this.gwin.margin+187, 220, room5b, this.gwin.smallFontSize);
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
    // clear out the existing drawing
    if (this.gwin.sampleSVG !== null)
        this.gwin.sampleSVG.selectAll("*").remove();

    // draw the background
    this.drawBorderlessBox(0, 0, this.gwin.canvasHeight, this.gwin.canvasWidth, this.gwin.canvasBackground, 1);

    // draw the foreground elements
    this.drawBasicStuff();
    this.drawOutsideTemp();
    this.drawInsideTemp(); 
},

////////////////////////////////////////

updateWindow: function ()
{
    // Get width height from the supporting div     
    var divWidth  = this.element.clientWidth;
    var divHeight = this.element.clientHeight;

    // set background color for areas around my app (in case of non-proportional scaling)
    this.element.style.backgroundColor =  this.gwin.canvasBackground;

    var box="0,0,"+this.gwin.canvasWidth+","+this.gwin.canvasHeight;

    this.gwin.sampleSVG
        .attr("width",   divWidth)
        .attr("height",  divHeight)
        .attr("viewBox", box)
        .attr("preserveAspectRatio", "xMinYMin meet");
},

////////////////////////////////////////


	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

        this.maxFPS = 0.02;

		// Get width height from the supporting div		
		var divWidth  = this.element.clientWidth;
		var divHeight = this.element.clientHeight;

		this.element.id = "div" + id;

		// backup of the context
		var self = this;

		// attach the SVG into the this.element node provided to us
		var box="0,0,"+this.gwin.canvasWidth+","+this.gwin.canvasHeight;
		this.svg = d3.select(this.element).append("svg:svg")
		    .attr("width",   divWidth)
		    .attr("height",  divHeight)
		    .attr("viewBox", box)
            .attr("preserveAspectRatio", "xMinYMin meet"); // new
		this.gwin.sampleSVG = this.svg;

        this.initApp ("F");
		this.updateAll();
		this.draw_d3(date);
	},

	load: function(state, date) {
        if (state) {
            this.state.itsF = state.itsF;
        } else {
            this.state.itsF = "F"; // Fahrenheit or Celsius or Kelvin
        }
        this.refresh(date);
	},

	draw_d3: function(date) {

	    this.drawBasicStuff();
        this.updateWindow();
	},
	
	draw: function(date) {
	    this.updateAll();
	},

	resize: function(date) {
		this.svg.attr('width' ,  parseInt(this.element.clientWidth,10) +"px");
		this.svg.attr('height' , parseInt(this.element.clientHeight,10)  +"px");

        this.updateWindow();
		this.refresh(date);
	},

    event: function(eventType, pos, user, data, date) {
	//event: function(eventType, userId, x, y, data, date) {
		if (eventType === "pointerPress" && (data.button === "left") ) {
		}
		if (eventType === "pointerMove" ) {
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
            this.nextTemp();
            this.updateAll();
		}
	}
	
});
