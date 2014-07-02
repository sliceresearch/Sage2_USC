
////////////////////////////////////////
// Weather across the Continental US Viewer
// example of D3 + GEOjson use
// Written by Andy Johnson - Spring 2014
////////////////////////////////////////

    // might be nice to use the albersUSA projection and add in alaska and hawaii
    // but right now that would conflict with the mexico temperatures

    // need to store values to shift from weather to color temp to numerical temp
    // or keep different svg elements in the group and show/hide them

    // could allow clicking on individual elements to change its state

    // might also allow people to focus on smaller state level

    // probably should store all 3 version of viz in each node and then swap as needed


var USweather = SAGE2_App.extend( {
    construct: function() {
        arguments.callee.superClass.construct.call(this);

        this.resizeEvents = "continuous"; //onfinish
        this.svg = null;

this.gwin = {};
this.gwin.canvasWidth = 1200;
this.gwin.canvasHeight = 800;

this.gwin.sampleSVG = null;

this.gwin.latMinTemp = 26.5;
this.gwin.latMaxTemp = 48.5;

this.gwin.lonMinTemp = -124;
this.gwin.lonMaxTemp = -67;

this.gwin.boxSize = 35;

this.gwin.mode = 1;

this.gwin.appID;

this.gwin.projection = null;
},

////////////////////////////////////////

tempConvert: function(data)
    {
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

    var temp_hot            = 85;
    var temp_nice           = 70;
    var temp_cold           = 60;
    var temp_colderer       = 30;
    var temp_coldererer     = 0;
    var temp_unknown        = 0;

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
        perc = (data - temp_coldererer) / (temp_colderer - temp_coldererer);
        }
    else if (data < temp_cold)
        {
        color = color_cold;
        colorb = color_colderer;
        perc = (data - temp_colderer) / (temp_cold - temp_colderer);
        }
    else if (data < temp_nice)
        {
        color = color_nice;
        colorb = color_cold;
        perc = (data - temp_cold) / (temp_nice - temp_cold);    
        }       
    else
        {
        color = color_warmer;
        colorb = color_nice;
        perc = (data - temp_nice) / (temp_hot - temp_nice);
        }

    if (perc > 1.0)
        perc = 1.0;
    if (perc < 0.0)
        perc = 0.0;
                
    return [color, colorb, perc];
},

///////////////////////////////////////

jsonCallback: function(err, json)
{
   if(err)
    {
        console.log("error loading in map");
        return;
    }


    var rad = 15;

   //Define path generator
    var path = d3.geo.path()
                     .projection(this.gwin.projection);


   //Bind data and create one path per GeoJSON feature
    this.gwin.sampleSVG.selectAll("path")
       .data(json.features)
       .enter()
       .append("path")
       .attr("d", path)
       .style("stroke", "black")
       .style("stroke-width", 2)
       .style("fill", "grey");


    // chicago
    this.gwin.sampleSVG.append("svg:rect")
    .style("fill", "yellow")
    .style("fill-opacity", 1)
    .style("stroke", "black")
    .attr("x", this.gwin.projection([-87.6500500, 41.8500300])[0] - rad/2)
    .attr("y", this.gwin.projection([-87.6500500, 41.8500300])[1] - rad/2)
    .attr("rx", 8)
    .attr("ry", 8)
    .attr("height", rad)
    .attr("width", rad);
},

///////////////////////////////////////

makeCallback: function (lat, lon, weatherOut)
{
    var iconSet;
    var weather;
    var weatherIcon;
    var weatherImage = new Image();

     if((weatherOut === null) || (weatherOut.query === null) || (weatherOut.query.results === null) || (weatherOut.query.results.current_observation === null) || (weatherOut.query.results.current_observation.icons === null))
        return; 

    weather = weatherOut.query.results.current_observation.temp_f;
    iconSet = weatherOut.query.results.current_observation.icons.icon_set;

    if ((weather === null) || (weather == "null") || (iconSet === null))
            return;

        weatherIcon = iconSet[8].icon_url;
        var weatherName = weatherIcon.substring(28, weatherIcon.length-4);
        var currentHour = new Date().getHours(); // 0-23

        if (weatherName === "")
                weatherName = "unknown";

        //weatherImage.src = "./icons/"+weatherName+".svg";
        weatherImage.src = this.resrcPath + "/icons/"+weatherName+".svg";

        // if its night then swap out the sun icons for the moon icons
        if ( (currentHour < 7) || (currentHour > 18) )
            {
            if ((weatherName == "mostlycloudy") || (weatherName == "partlycloudy") ||
                (weatherName == "clear"))
                {
                //weatherImage.src = "./icons/"+weatherName+"-night.svg";
                this.gwin.weatherImage.src = this.resrcPath + "icons/"+weatherName+"-night.svg";
                }
            }

        // I am still seeing some temp is null printouts on the console

        var mySelf = this;

        weatherImage.onload = function(){
            //console.log("temp is " + weather + " at " + Math.round(lat) + ", " + Math.round(lon));

            mySelf.drawEverything(lat, lon, weather, weatherImage.src);
            }
},

///////////////////////////////////////

updateOutsideTemp: function ()
{ 
     var lat, lon;
 
    var MeSelf = this;

    for (lat = this.gwin.latMaxTemp; lat >= this.gwin.latMinTemp; lat -= 2.2)
        for (lon = this.gwin.lonMinTemp; lon <= this.gwin.lonMaxTemp; lon += 2.7)
            {
            if (Math.random() > 0.95) // cut down on accesses at once
            (function(lat,lon)
                {
                d3.json("https://query.yahooapis.com/v1/public/yql?q=select%20temp_f%2C%20weather%2C%20icons%20from%20wunderground.currentobservation%20where%20location%3D'"+lat+","+lon+"'%3B&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=", 
                    function(err, response)
                        {
                        if(err)
                            {
                            console.log("NO DATA at " + lat + " " + lon);
                            return;
                            }
                       MeSelf.makeCallbackFunc(lat, lon, response);
                        });
                }(lat,lon));
            }
},

////////////////////////////////////////

nextMode: function()
{
    this.gwin.mode = this.gwin.mode + 1;
    if (this.gwin.mode > 2)
            this.gwin.mode = 0;
},

////////////////////////////////////////

drawBox: function (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)
{
     this.gwin.sampleSVG.append("svg:rect")
        .style("stroke", "black")
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .attr("x", boxLocX)
        .attr("y", boxLocY)
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("height", boxHeight)
        .attr("width", boxWidth);
},

////////////////////////////////////////

drawText: function (nodeToAddTo, textLocX, textLocY, theText, textFontSize)
{
    var displayFont = "Arial";
    var drawTempText;

    if (+theText < 30) //temp_colderer
        drawTempText = "#FFF";
    else
        drawTempText = "#000";

    var tempToShow;

// SAGE Specific
    if (this.state.itsF === "C")
        {
        tempToShow = (Math.round((parseInt(theText)-32)*5/9));
        }
     else
        tempToShow = theText; // F by default


    nodeToAddTo.append("svg:text")
        .attr("x", textLocX)
        .attr("y", textLocY)
        .style("fill", drawTempText)
        .style("font-size", textFontSize)
        .style("font-family", displayFont)
        .style("text-anchor", "middle")
        .text(tempToShow);   
},

////////////////////////////////////////

drawEverything: function (lat, lon, weather, iconSrc)
{
    var c, colorOut, colorOutb, percOut;

    var mapWidth = this.gwin.canvasWidth;
    var mapHeight = this.gwin.canvasHeight;

    if ((lat === null) || (lon === null) || (weather === null) || (weather == "null") || (iconSrc === null))
        return;

    var xLoc = this.gwin.projection([lon, lat])[0]; - this.gwin.boxSize/2;
    var yLoc = this.gwin.projection([lon, lat])[1]; - this.gwin.boxSize/2;

    c = this.tempConvert(weather);
    colorOut = c[0];
    colorOutb = c[1];
    percOut = c[2];

    // add a named group in for each one
    var myName = this.gwin.appID+"loc"+Math.round(lat).toString() + Math.round(lon).toString();

    
    if (d3.select("#" + myName).node() !== null)
        {
        d3.select("#" + myName).node().remove();
        }
            

    var oneLocation = this.gwin.sampleSVG.append("svg:g") 
        .attr("id", myName)
        .attr("class", "node");

    //console.log(xLoc, yLoc);

    oneLocation.append("svg:rect")
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .style("stroke", "black")
        .attr("x", xLoc)
        .attr("y", yLoc)
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("height", this.gwin.boxSize)
        .attr("width", this.gwin.boxSize);

    oneLocation.append("svg:rect")
        .style("fill", colorOutb)
        .style("fill-opacity", (1-percOut))
        .style("stroke", "black")
        .attr("id", "tempRect")
        .attr("x", xLoc)
        .attr("y", yLoc)
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("height", this.gwin.boxSize)
        .attr("width", this.gwin.boxSize);

        if (this.gwin.mode === 0)
            {
            this.drawText(oneLocation, xLoc+this.gwin.boxSize*0.5, yLoc+this.gwin.boxSize*0.75, weather, 20);
            }

        else if (this.gwin.mode === 1)
            {          
            oneLocation.append("svg:image")
            .attr("id", "tempRect")
            .attr("xlink:href", iconSrc)
            .attr("opacity", 1)
            .attr("x", xLoc+this.gwin.boxSize*0.1)
            .attr("y", yLoc+this.gwin.boxSize*0.1)
            .attr("width", this.gwin.boxSize *0.8) 
            .attr("height", this.gwin.boxSize *0.8);
            }

        else if (this.gwin.mode == 2)
            {   // just the coloured boxes          
            }
        else
            console.log ("unknown mode");
},


////////////////////////////////////////

updateWindow: function ()
{
    // Get width height from the supporting div     
    var divWidth  = this.element.clientWidth;
    var divHeight = this.element.clientHeight;

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

    this.makeCallbackFunc = this.makeCallback.bind(this);
    this.jsonCallbackFunc = this.jsonCallback.bind(this);

    this.gwin.projection = d3.geo.albers()
               .translate([this.gwin.canvasWidth/2, this.gwin.canvasHeight/2])
               .scale([1500]);// default 1000


    //Load in GeoJSON data
    d3.json(this.resrcPath +"./us-states.json", this.jsonCallbackFunc);

    this.gwin.appID = this.div.id;

        this.maxFPS = 0.1;

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
            .attr("preserveAspectRatio", "xMinYMin meet");
        this.gwin.sampleSVG = this.svg;

        this.drawBox(0, 0, this.gwin.canvasHeight, this.gwin.canvasWidth, "black", 1);

        this.draw_d3(date);
    },

    load: function(state, date) {
        if (state) {
            this.state.itsF = state.itsF;
        } else {
            this.state.itsF = "F"; // Fahrenheit or Celsius
        }

        this.refresh(date);
    },

    draw_d3: function(date) {

        this.updateOutsideTemp();
        this.updateWindow();
    },
    
    draw: function(date) {
        this.updateOutsideTemp();
    },

    resize: function(date) {
        this.svg.attr('width' ,  parseInt(this.element.clientWidth,10) +"px");
        this.svg.attr('height' , parseInt(this.element.clientHeight,10)  +"px");

        this.updateWindow();
        this.refresh(date);
    },

    event: function(eventType, userId, x, y, data, date) {
        if (eventType === "pointerPress" && (data.button === "left") ) {
        }
        if (eventType === "pointerMove" ) {
        }
        if (eventType === "pointerRelease" && (data.button === "left") ) {
            this.nextMode();
        }
    }
    
});
