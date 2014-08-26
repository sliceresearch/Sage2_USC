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
// simple image of the day / calvin and hobbes comic viewer
// Written by Andy Johnson - 2014
////////////////////////////////////////

var spiff = SAGE2_App.extend( {
    construct: function() {
        arguments.callee.superClass.construct.call(this);

    this.resizeEvents = "continuous"; //onfinish
    this.svg = null;

    this.canvasBackground = "black";

    this.canvasWidth = 600;
    this.canvasHeight = 190;

    this.sampleSVG = null;

    this.image1 = new Image();
 
    this.URL1 = "";
    this.URL1a = "";
    this.URL1b = "";

    this.today = "";
    this.timeDiff = 0;
 },

////////////////////////////////////////

initApp: function()
{
    this.nextCallbackFunc = this.nextCallback.bind(this);
    this.prevCallbackFunc = this.prevCallback.bind(this);

    this.loadFailCallbackFunc = this.loadFailCallback.bind(this);
    this.loadSuccessCallbackFunc = this.loadSuccessCallback.bind(this);
},

////////////////////////////////////////

createURLs: function (timeMachine)
{
    var URL1a = "http://images.ucomics.com/comics/ch/";
    var URL1b = ".gif";

    if (timeMachine > 0)
        timeMachine = 0;

    var today = new Date(new Date().getTime() + 24 * timeMachine * 60 * 60 * 1000);

    todayDay = today.getDate().toString(); // days are 1 - 31
    todayMonth = (today.getMonth()+1).toString(); // months are 0 - 11
    todayYear = today.getFullYear().toString(); // year is correct

    this.today = todayMonth + "/" + todayDay + "/" + todayYear;

    if (todayDay.length < 2)
            todayDay = "0" + todayDay;

    if (todayMonth.length < 2)
            todayMonth = "0" + todayMonth;

    var todayYear2 = todayYear.substr(todayYear.length - 2);

    //console.log(todayYear, todayMonth, todayDay, todayYear2);

    var todaysComic = todayYear + "/ch" + todayYear2 + todayMonth + todayDay;
    // sample "2014/ch140619"
    // no comics on sunday
 
    this.URL1 = URL1a+todaysComic+URL1b;
},

////////////////////////////////////////

drawText: function (textLocX, textLocY, theText, textFontSize)
{
    var displayFont = "Arial";
    var drawTempText;

        drawTempText = "#000";

    this.sampleSVG.append("svg:text")
        .attr("x", parseInt(textLocX*1))
        .attr("y", parseInt(textLocY*1))
        .style("fill", drawTempText)
        .style("font-size", textFontSize)
        .style("font-family", displayFont)
        .style("text-anchor", "middle")
        .text(theText);   
},

////////////////////////////////////////

drawBox: function  (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)
{
     this.sampleSVG.append("svg:rect")
        .style("stroke", "black")
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .attr("x", parseInt(boxLocX*1))
        .attr("y", parseInt(boxLocY*1))
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("height", parseInt(boxHeight*1))
        .attr("width", parseInt(boxWidth*1));
},


drawBoxPrev: function  (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)
{
     this.sampleSVG.append("svg:rect")
        .style("stroke", "black")
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .attr("x", boxLocX)
        .attr("y", boxLocY)
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("height", boxHeight)
        .attr("width", boxWidth)
        .on("click", this.prevCallbackFunc);

        var firstX = boxLocX+10,
            secondX = boxLocX+boxWidth*0.75-10,
            thirdX = boxLocX+boxWidth*0.75-10;

        var firstY = boxLocY + boxHeight*0.5, 
            secondY = boxLocY+boxHeight*0.5-10,
            thirdY = boxLocY+boxHeight*0.5+10;

        this.sampleSVG.append("polygon")
        .style("stroke", "black") 
        .style("fill", "black") 
        .attr("points", "" + firstX + "," + firstY + "," + secondX + "," + secondY + "," + thirdX + "," + thirdY)
        .on("click", this.prevCallbackFunc); 
},

drawBoxNext: function  (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)
{
     this.sampleSVG.append("svg:rect")
        .style("stroke", "black")
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .attr("x", boxLocX)
        .attr("y", boxLocY)
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("height", boxHeight)
        .attr("width", boxWidth)
        .on("click", this.nextCallbackFunc);

        var firstX = boxLocX+boxWidth-10,
            secondX = boxLocX+boxWidth*0.25+10,
            thirdX = boxLocX+boxWidth*0.25+10;

        var firstY = boxLocY + boxHeight*0.5, 
            secondY = boxLocY+boxHeight*0.5-10,
            thirdY = boxLocY+boxHeight*0.5+10;

        this.sampleSVG.append("polygon")
        .style("stroke", "black") 
        .style("fill", "black") 
        .attr("points", "" + firstX + "," + firstY + "," + secondX + "," + secondY + "," + thirdX + "," + thirdY)
        .on("click", this.nextCallbackFunc); 
},

prevCallback: function()
{
    this.timeDiff -= 1;
    this.update();
},

nextCallback: function()
{
    this.timeDiff += 1;
    if (this.timeDiff > 0)
        this.timeDiff = 0;
    this.update();
},

loadSuccessCallback: function()
{
    this.drawEverything(1);
},

loadFailCallback: function()
{
    this.drawEverything(0);
},

////////////////////////////////////////

drawImage: function (theImage, loadSuccess)
{
    // if there is an image then show it, else show black
    if (loadSuccess)
        this.sampleSVG.append("image")
        .attr("xlink:href", theImage)
        .attr("opacity", 1)
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", this.canvasWidth)
        .attr("height", this.canvasHeight);
    else
        {
//        this.drawBox(0.25 * this.canvasWidth, 0.5 * this.canvasHeight, 30, 0.5 * this.canvasWidth, "#ffffff", 1.0);
        this.drawBox(0, 0, this.canvasHeight, this.canvasWidth, "#ffffff", 1.0);
        this.drawText(0.5 * this.canvasWidth, 0.5 * this.canvasHeight+22, "no comic today", 24); 
        }

    this.drawBox(0,this.canvasHeight, 30, this.canvasWidth, "#fdae61", 1.0);
    this.drawText(0.5 * this.canvasWidth,this.canvasHeight+22, "classic Calvin and Hobbes - "+this.today, 24);

    this.drawBoxPrev(0,this.canvasHeight, 30, 50, "#fdae00", 1.0);
    this.drawBoxNext(this.canvasWidth-50,this.canvasHeight, 30, 50, "#fdae00", 1.0);

},

////////////////////////////////////////

drawEverything: function (loadSuccess)
{
    this.sampleSVG.selectAll("*").remove();

    this.drawImage(this.image1.src, loadSuccess); 
},

////////////////////////////////////////

update: function ()
{
    // get new image
    this.createURLs(this.timeDiff);

    this.updateSlim();
},

updateSlim: function ()
{
    this.image1.src = this.URL1+ '?' + Math.floor(Math.random() * 10000000);
    this.image1.onload = this.loadSuccessCallbackFunc;
    this.image1.onerror = this.loadFailCallbackFunc;
},

////////////////////////////////////////

updateWindow: function (){

    x = this.element.clientWidth;
    y = this.element.clientHeight;


   // console.log("Update Window", x, y);

    var newWidth = this.canvasWidth;
    var newHeight = this.canvasHeight+30;

    // set background color for areas around my app (in case of non-proportional scaling)
    this.element.style.backgroundColor = this.canvasBackground;

    var box="0,0,"+newWidth+","+newHeight;
    this.sampleSVG.attr("width", x) 
        .attr("height", y) 
        .attr("viewBox", box)
        .attr("preserveAspectRatio", "xMinYMin meet");

    this.updateSlim(); 
},

////////////////////////////////////////

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

        this.maxFPS = 0.0003; // update once per hour

		// Get width height from the supporting div		
		//var divWidth  = this.element.clientWidth;
		//var divHeight = this.element.clientHeight;

		this.element.id = "div" + id;

		// backup of the context
		var self = this;

        var newWidth = this.canvasWidth;
        var newHeight = this.canvasHeight+30;


		// attach the SVG into the this.element node provided to us
		var box="0,0,"+newWidth+","+newHeight;
		this.svg = d3.select(this.element).append("svg:svg")
		    .attr("width",   width)
		    .attr("height",  height+30)
		    .attr("viewBox", box)
            .attr("preserveAspectRatio", "xMinYMin meet"); // new
		this.sampleSVG = this.svg;

        this.initApp();

		this.update();
		this.draw_d3(date);
	},

	load: function(state, date) {
	},

	draw_d3: function(date) {
        this.updateWindow();
	},
	
	draw: function(date) {
	    this.update();
	},

	resize: function(date) {
		this.svg.attr('width' ,  this.element.clientWidth  +"px");
		this.svg.attr('height' , this.element.clientHeight  +"px");

        this.updateWindow();
		this.refresh(date);
	},

    event: function(eventType, position, user, data, date) {
	//event: function(eventType, userId, x, y, data, date) {
		if (eventType === "pointerPress" && (data.button === "left") ) {
		}
		if (eventType === "pointerMove" ) {
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
            if (position.x < 0.5 * this.element.clientWidth)   
            {
                this.timeDiff -= 1;
                this.update();
            }
            else
            {
                this.timeDiff += 1;
                if (this.timeDiff > 0)
                    this.timeDiff = 0;
                this.update();
            }
		}
	}
	
});
