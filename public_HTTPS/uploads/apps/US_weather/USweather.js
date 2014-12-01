
////////////////////////////////////////
// Weather across the Continental US Viewer
// example of D3 + GEOjson use
// Written by Andy Johnson - Spring 2014
////////////////////////////////////////
    
    // could allow clicking on individual elements to change its state

    // might also allow people to focus on smaller state level

var USweather = SAGE2_App.extend( {
    construct: function() {
        arguments.callee.superClass.construct.call(this);

        this.resizeEvents = "continuous"; //onfinish
        this.svg = null;

        // Need to set this to true in order to tell SAGE2 that you will be needing widget controls for this app
        this.enableControls = true;

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

        this.gwin.appID = "";

        this.appName = "evl_photos:";

        this.gwin.projection = null;

        this.gwin.iconmostlycloudynight = new Image();
        this.gwin.iconpartlycloudynight = new Image();
        this.gwin.iconclearnight        = new Image();
        this.gwin.iconsnow              = new Image();
        this.gwin.iconunknown           = new Image();
        this.gwin.iconstorms            = new Image();
        this.gwin.icontstorms           = new Image();
        this.gwin.iconmostlycloudy      = new Image();
        this.gwin.iconpartlycloudy      = new Image();
        this.gwin.iconrain              = new Image();
        this.gwin.iconfog               = new Image();
        this.gwin.iconhazy              = new Image();
        this.gwin.iconsleet             = new Image();
        this.gwin.iconcloudy            = new Image();
        this.gwin.iconclear             = new Image();
        this.gwin.iconsunny             = new Image();

        this.gwin.numIconsLoaded = 0;

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
    var color_coldererer    = "#AAAAAA"; //"#313695";

    var color_unknown       = "#EEEEEE"; //"#AAAAAA";

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
    //var weatherImage = new Image();
    var weatherImage;

     if((weatherOut === null) || (weatherOut.query === null) || (weatherOut.query.results === null) || (weatherOut.query.results.current_observation === null) || (weatherOut.query.results.current_observation.icons === null))
        return; 

    weather = weatherOut.query.results.current_observation.temp_f;
    iconSet = weatherOut.query.results.current_observation.icons.icon_set;

    if ((weather === null) || (weather == "null") || (iconSet === null))
            return;

        weatherIcon = iconSet[8].icon_url;
        var weatherName = weatherIcon.substring(28, weatherIcon.length-4);
       // var currentHour = new Date().getHours(); // 0-23
var currentTime = new Date().getHours()+new Date().getMinutes()/60;

        if (weatherName === "")
                weatherName = "unknown";

        weatherImage = this.getCorrectWeatherIcon(weatherName, 0); //day
        //weatherImage.src = "./icons/"+weatherName+".svg";
        //weatherImage.src = this.resrcPath + "icons/"+weatherName+".svg";

        // all of these times are computed in the local time of where computation is done
        // ie when Andy does it the numbers are all in Chicago time
        // not the time zone of the lat lon location


        // get today's sunrise and sunset times for a given lat lon today 
        var times = SunCalc.getTimes(new Date(), lat, lon);
        var sunrise = times.sunrise.getHours() + times.sunrise.getMinutes()/60;
        var sunset = times.sunset.getHours() + times.sunset.getMinutes()/60;

        // correct for hawaii among others
        // need to improve this for more generality
        if (sunset < 12)
            sunset += 24;

        // if its night then swap out the sun icons for the moon icons
        if ( (currentTime < sunrise) || (currentTime > sunset) )
            {
            if ((weatherName == "mostlycloudy") || (weatherName == "partlycloudy") ||
                (weatherName == "clear"))
                {
                weatherImage = this.getCorrectWeatherIcon(weatherName, 1); // night
                //weatherImage.src = "./icons/"+weatherName+"-night.svg";
                //weatherImage.src = this.resrcPath + "icons/"+weatherName+"-night.svg";
                }
            }

        // I am still seeing some temp is null printouts on the console

        var mySelf = this;

            if (this.gwin.numIconsLoaded === 16)
                {
                mySelf.drawEverything(lat, lon, weather, weatherImage.src);
                };
},

///////////////////////////////////////

updateOutsideTemp: function ()
{ 
    var lat, lon;
    var MeSelf = this;

    for (lat = this.gwin.latMaxTemp; lat >= this.gwin.latMinTemp; lat -= 2.2)
        for (lon = this.gwin.lonMinTemp; lon <= this.gwin.lonMaxTemp; lon += 2.7)
            {
            var replace = 0;

            // replace some of the coverage area SW of Texas with Honolulu
            if ((lat < 29.15) && (lon < -103.5))
                {
                    replace = 1;
                }

            // replace some of the coverage area SW of Texas with Anchorage
            if ((lat < 31.13) && (lon < -106.7))
                {
                    replace = 2;
                }

            // replace some of the coverage sw of LA area with Anchorage
            if ((lat < 33.78) && (lon < -118.98))
                {
                    replace = 2;
                }

            // replace some of the coverage area SE of New York with Honolulu
            if ((lat < 40.296) && (lon > -73.367)) 
                {
                    replace = 1;
                }

            // replace some of the coverage area SE of the carloinas with Honolulu
            if ((lat < 43.707) && (lon > -69.038))
                {
                    replace = 1;
                }

            // replace some of the coverage area SE of the carloinas with Honolulu
            if ((lat < 32.769) && (lon > -79.651))
                {
                    replace = 1;
                }

            // replace some of the coverage area SE of the Maine with Honolulu
            if ((lat < 33.32) && (lon > -78.00))
                {
                    replace = 1;
                }
                

            if (Math.random() > 0.95) // cut down on accesses at once
            (function(lat,lon, replace)
                {
                if (replace === 1)
                    {
                    lat = 21.307;
                    lon = -157.858;
                    }
                else if (replace === 2)
                    {
                    lat = 61.218;
                    lon = -149.90;
                    }

                lon = lon.toFixed(3);
                lat = lat.toFixed(3);

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
                }(lat,lon, replace));
            }
},

////////////////////////////////////////

nextMode: function()
{
    this.gwin.mode = this.gwin.mode + 1;
    if (this.gwin.mode > 2)
            this.gwin.mode = 0;

    if (this.gwin.mode === 0)
        {
        this.convertToTemp();
        } 
    else if (this.gwin.mode === 1)
        {
        this.convertToIcon();
        } 
    else
        {
        this.convertToNone();
        } 
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

drawText: function (textVisibility, nodeToAddTo, textLocX, textLocY, theText, textFontSize)
{
    var displayFont = "Arial";
    var drawTempText;

   // if (+theText < 30) //temp_colderer
   //     drawTempText = "#FFF";
   // else
        drawTempText = "#000";

    var tempToShow;


    if (this.gwin.itsF === "C") // there is a sage versionof this
        {
        tempToShow = (Math.round((parseInt(theText)-32)*5/9));
        //console.log(tempToShow);
        }
     else
        tempToShow = theText; // F by default


    nodeToAddTo.append("svg:text")
        .attr("visibility", textVisibility)
        .attr("id", this.gwin.appID+"IDtext")
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

    var xLoc = this.gwin.projection([lon, lat])[0]; //- this.gwin.boxSize/2;
    var yLoc = this.gwin.projection([lon, lat])[1]; //- this.gwin.boxSize/2;

    c = this.tempConvert(weather);
    colorOut = c[0];
    colorOutb = c[1];
    percOut = c[2];

    // add a named group in for each one
    var myName = this.gwin.appID+"loc"+Math.round(lat).toString() + Math.round(lon).toString();

    
    if (d3.select("#" + myName).node() !== null)
        {
        //console.log("OLD", d3.select("#" + myName).node());
        d3.select("#" + myName).node().remove();
        }
            

    var oneLocation = this.gwin.sampleSVG.append("svg:g") 
        .attr("id", myName)
        .attr("class", "node");

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
        .attr("x", xLoc)
        .attr("y", yLoc)
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("height", this.gwin.boxSize)
        .attr("width", this.gwin.boxSize);

    if (this.gwin.mode === 0)
        {
        textVisibility = "visible";
        iconVisibility = "hidden";
        } 
    else if (this.gwin.mode === 1)
        {
        textVisibility = "hidden";
        iconVisibility = "visible";
        } 
    else
        {
        textVisibility = "hidden";
        iconVisibility = "hidden";
        } 

    this.drawText(textVisibility, oneLocation, xLoc+this.gwin.boxSize*0.5, yLoc+this.gwin.boxSize*0.75, weather, 20);

    //console.log("DrawIcon ", this.gwin.appID+"IDicon");

    oneLocation.append("svg:image")
        .attr("visibility", iconVisibility)
        .attr("id", this.gwin.appID+"IDicon")
        .attr("xlink:href", iconSrc)
        .attr("opacity", 1)
        .attr("x", xLoc+this.gwin.boxSize * 0.1)
        .attr("y", yLoc+this.gwin.boxSize * 0.1)
        .attr("width", this.gwin.boxSize * 0.8) 
        .attr("height", this.gwin.boxSize * 0.8);
},

////////////////////////////////////////

updateWindow: function ()
{
    // Get width height from the supporting div     
    var divWidth  = this.element.clientWidth;
    var divHeight = this.element.clientHeight;

    // set background color for areas around my app (in case of non-proportional scaling)
    this.element.style.backgroundColor =  "black";
    
    var box="0,0,"+this.gwin.canvasWidth+","+this.gwin.canvasHeight;

    this.gwin.sampleSVG
        .attr("width",   divWidth)
        .attr("height",  divHeight)
        .attr("viewBox", box)
        .attr("preserveAspectRatio", "xMinYMin meet");
},

////////////////////////////////////////

convertToTemp: function ()
{
    var selectedOnes = null;

    selectedOnes = d3.selectAll("#" +this.gwin.appID + "IDtext");
    selectedOnes.attr("visibility", "visible");

    selectedOnes = d3.selectAll("#" +this.gwin.appID + "IDicon");
    selectedOnes.attr("visibility", "hidden");

    this.gwin.mode = 0;
},

convertToIcon: function ()
{
    var selectedOnes = null;


    selectedOnes = d3.selectAll("#" +this.gwin.appID + "IDtext");
    selectedOnes.attr("visibility", "hidden");

    selectedOnes = d3.selectAll("#" +this.gwin.appID + "IDicon");
    selectedOnes.attr("visibility", "visible");

    this.gwin.mode = 1;
},

convertToNone: function ()
{
    var selectedOnes = null;

    selectedOnes = d3.selectAll("#" +this.gwin.appID + "IDtext");
    selectedOnes.attr("visibility", "hidden");

    selectedOnes = d3.selectAll("#" +this.gwin.appID + "IDicon");
    selectedOnes.attr("visibility", "hidden");

    this.gwin.mode = 2;
},

getCorrectWeatherIcon: function(weatherCondition, night)
{
    if (night === 1)
        {   
            switch(weatherCondition) {
                case "mostlycloudy": return(this.gwin.iconmostlycloudynight);
                case "partlycloudy": return(this.gwin.iconpartlycloudynight);
                case "clear":       return(this.gwin.iconclearnight);
            }
        }
    else // night === 0
        {
            switch(weatherCondition) {
                case "snow":        return(this.gwin.iconsnow);
                case "unknown":     return(this.gwin.iconunknown);
                case "storms":      return(this.gwin.iconstorms);
                case "tstorms":     return(this.gwin.icontstorms);
                case "mostlycloudy": return(this.gwin.iconmostlycloudy);
                case "partlycloudy": return(this.gwin.iconpartlycloudy);

                case "rain":        return(this.gwin.iconrain);
                case "fog":         return(this.gwin.iconfog);
                case "hazy":        return(this.gwin.iconhazy);
                case "sleet":       return(this.gwin.iconsleet);
                case "cloudy":      return(this.gwin.iconcloudy);
                case "clear":       return(this.gwin.iconclear);
                case "sunny":       return(this.gwin.iconsunny);
            }
        }
},

// load in all of the weather icons at startup time
loadInIcons: function()
{
    //var path = "./icons/";
    var path = this.resrcPath + "icons/";
    var self = this;

    this.gwin.iconmostlycloudynight.src     = path+"mostlycloudy-night.svg";
    this.gwin.iconmostlycloudynight.onload  = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconpartlycloudynight.src     = path+"partlycloudy-night.svg";
    this.gwin.iconpartlycloudynight.onload  = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconclearnight.src            = path+"clear-night.svg";
    this.gwin.iconclearnight.onload         = function(){self.gwin.numIconsLoaded++};


    this.gwin.iconsnow.src          = path+"snow.svg";
    this.gwin.iconsnow.onload       = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconunknown.src       = path+"unknown.svg";
    this.gwin.iconunknown.onload    = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconstorms.src        = path+"storms.svg";
    this.gwin.iconstorms.onload     = function(){self.gwin.numIconsLoaded++};
    this.gwin.icontstorms.src       = path+"tstorms.svg";
    this.gwin.icontstorms.onload    = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconmostlycloudy.src  = path+"mostlycloudy.svg";
    this.gwin.iconmostlycloudy.onload = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconpartlycloudy.src  = path+"partlycloudy.svg";
    this.gwin.iconpartlycloudy.onload = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconrain.src          = path+"rain.svg";
    this.gwin.iconrain.onload       = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconfog.src           = path+"fog.svg";
    this.gwin.iconfog.onload        = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconhazy.src          = path+"hazy.svg";
    this.gwin.iconhazy.onload       = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconsleet.src         = path+"sleet.svg";
    this.gwin.iconsleet.onload      = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconcloudy.src        = path+"cloudy.svg";
    this.gwin.iconcloudy.onload     = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconclear.src         = path+"clear.svg";
    this.gwin.iconclear.onload      = function(){self.gwin.numIconsLoaded++};
    this.gwin.iconsunny.src         = path+"sunny.svg";
    this.gwin.iconsunny.onload      = function(){self.gwin.numIconsLoaded++};
},


////////////////////////////////////////

    init: function(id, width, height, resrc, date) {
        // call super-class 'init'
        arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

        this.makeCallbackFunc = this.makeCallback.bind(this);
        this.jsonCallbackFunc = this.jsonCallback.bind(this);

        this.gwin.projection = d3.geo.albersUsa()
               .translate([this.gwin.canvasWidth/2, this.gwin.canvasHeight/2])
               .scale([1500]);// default 1000


        //Load in GeoJSON data
        d3.json(this.resrcPath +"./us-states.json", this.jsonCallbackFunc);

        this.gwin.appID = this.div.id;

        this.maxFPS = 0.1;

        this.loadInIcons();

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

        var tempButton = {
            "textual":true,
            "label":"Temp",
            "fill":"rgba(250,250,250,1.0)",
            "animation":false
        };
        var iconButton = {
            "textual":true,
            "label":"Icon",
            "fill":"rgba(250,250,250,1.0)",
            "animation":false
        };
        var colorButton = {
            "textual":true,
            "label":"Color",
            "fill":"rgba(250,250,250,1.0)",
            "animation":false
        };
        // create the widgets
        console.log("creating controls");

        this.controls.addButtonType("temp", tempButton);
        this.controls.addButtonType("icon", iconButton);
        this.controls.addButtonType("color", colorButton);

        this.controls.addButton({type:"temp",sequenceNo:4,action:function(date){
            //This is executed after the button click animation occurs.
            this.gwin.mode = 0;
            this.convertToTemp();
        }.bind(this)});
        this.controls.addButton({type:"icon",sequenceNo:6,action:function(date){
            //This is executed after the button click animation occurs.
            this.gwin.mode = 1;
            this.convertToIcon();
        }.bind(this)});
        this.controls.addButton({type:"color",sequenceNo:8,action:function(date){
            //This is executed after the button click animation occurs.
            this.gwin.mode = 2;
            this.convertToNone();
        }.bind(this)});
        this.controls.finishedAddingControls(); // Important
        

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

    event: function(eventType, pos, user, data, date) {
    //event: function(eventType, userId, x, y, data, date) {
        if (eventType === "pointerPress" && (data.button === "left") ) {
        }
        if (eventType === "pointerMove" ) {
        }
        if (eventType === "pointerRelease" && (data.button === "left") ) {
            this.nextMode();
        }
    }
    
});
