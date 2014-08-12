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
// simple photo slideshow
// Written by Andy Johnson - 2014
////////////////////////////////////////

var evl_photos = SAGE2_App.extend( {
    construct: function() {
        arguments.callee.superClass.construct.call(this);

    this.resizeEvents = "continuous"; //onfinish
    this.svg = null;

    this.canvasBackground = "black";

    this.canvasWidth = 800;
    this.canvasHeight = 600;

    this.sampleSVG = null;
 
    this.URL1 = "";
    this.URL1a = "";
    this.URL1b = "";

    this.today = "";
    this.timeDiff = 0;

    this.bigList = null;

    this.okToDraw = 10;
    this.counter = 1;
    this.forceRedraw = 1;

    this.fileName = "";
    this.listFileName = "";

    this.image1 = "NULL";
    this.image2 = "NULL";
    this.image3 = "NULL";

    this.updateCounter = 0;
 },

////////////////////////////////////////

initApp: function()
{
    this.listFileCallbackFunc = this.listFileCallback.bind(this);
    this.imageLoadCallbackFunc = this.imageLoadCallback.bind(this);
    this.imageLoadFailedCallbackFunc = this.imageLoadFailedCallback.bind(this);

    this.loadInList();
    this.newImage();
},

////////////////////////////////////////

imageLoadCallback: function()
    {
    this.okToDraw = 10.0;
    this.image1 = this.image3; // image1 is now the new image

    //console.log ("image load callback");
    this.newImage();
    },

imageLoadFailedCallback: function()
    {
    console.log("image load failed");
    this.newImage();
    this.update();
    },

////////////////////////////////////////

listFileCallback: function(error, data)
{
    if(error)
        {
        console.log("listFileCallback - error");
        return;
        }

   if(data === null)
        {
        console.log("list of photos is empty");
        return;
        }

    this.bigList = d3.csv.parse(data);
    console.log("loaded in list of photos");

    this.update();
    this.drawEverything();
},

////////////////////////////////////////

drawEverything: function ()
{
    if ((this.okToDraw > -1) || (this.forceRedraw > 0))
        {
        this.sampleSVG.selectAll("*").remove(); 
        this.forceRedraw = 0;

    var newWidth = this.canvasWidth;
    var newHeight = this.canvasHeight;


        this.sampleSVG.append("svg:rect")
            .style("stroke", "black")
            .style("fill", "black")
            .style("fill-opacity", 1)
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", newHeight)
            .attr("width", newWidth);

        if (this.image2 != "NULL") // previous image
            this.sampleSVG.append("svg:image")
            .attr("xlink:href", this.image2.src)
            .attr("opacity", (this.okToDraw * 0.1))
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.canvasWidth -10)
            .attr("height", this.canvasHeight - 10)
            ;

        if (this.image1 != "NULL") // current image
            this.sampleSVG.append("svg:image")
            .attr("xlink:href", this.image1.src)
            .attr("opacity", 1.0 - (this.okToDraw * 0.1))
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.canvasWidth -10)
            .attr("height", this.canvasHeight - 10)
            ;

        this.okToDraw -= 1.0;
        }

    this.updateCounter += 1;
    if (this.updateCounter > 100)
        {
            this.update();
            this.updateCounter = 0;
        }
},  

////////////////////////////////////////

loadInList: function ()
{

//    this.listFileName = "http://www.evl.uic.edu/aej/photos.txt";
    this.listFileName = "http://lyra.evl.uic.edu:9000/photos.txt";

    d3.text(this.listFileName, this.listFileCallbackFunc);


//    readFile(this.listFileName, this.listFileCallbackFunc);
},

////////////////////////////////////////

newImage: function ()
{
    this.counter = Math.floor(Math.random() * 2803) + 1;
},

////////////////////////////////////////

update: function ()
{
    if (this.bigList == null)
    {
        console.log("list of photos is null");
        return;
    }

    if (this.bigList[this.counter] == null)
        {   
        console.log("cant find name of number "+this.counter);
        this.newImage();
        this.update(); // potential for infinite loop here
        return;
        }

//    this.fileName = "http://www.evl.uic.edu/aej/evl_Pictures/"+this.bigList[this.counter].name;
    this.fileName = "http://lyra.evl.uic.edu:9000/evl_Pictures/"+this.bigList[this.counter].name;
    //console.log ("loading in " + this.fileName);
 
    this.image2 = this.image1; // image2 is the previous image

    this.image3 = new Image; // image3 stores new image while its being loaded in
    this.image3.src = this.fileName;

    this.image3.onload = this.imageLoadCallbackFunc;
    this.image3.onerror = this.imageLoadFailedCallbackFunc;
    
    
},

////////////////////////////////////////

updateWindow: function (){

    x = this.element.clientWidth;
    y = this.element.clientHeight;

    var newWidth = this.canvasWidth;
    var newHeight = this.canvasHeight;

    var box="0,0,"+newWidth+","+newHeight;
    this.sampleSVG.attr("width", x) 
        .attr("height", y) 
        .attr("viewBox", box)
        .attr("preserveAspectRatio", "xMinYMin meet");

    // want a black backdrop to start with
    this.sampleSVG.append("svg:rect")
        .style("stroke", "black")
        .style("fill", "black")
        .style("fill-opacity", 1)
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", newHeight)
        .attr("width", newWidth);


    this.forceRedraw = 1;
    this.drawEverything(); // need this to keep image while scaling etc
},

////////////////////////////////////////

    init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

        this.maxFPS = 10.0;

		// Get width height from the supporting div		
		//var divWidth  = this.element.clientWidth;
		//var divHeight = this.element.clientHeight;

		this.element.id = "div" + id;

		// backup of the context
		var self = this;

        var newWidth = this.canvasWidth;
        var newHeight = this.canvasHeight;


		// attach the SVG into the this.element node provided to us
		var box="0,0,"+newWidth+","+newHeight;
		this.svg = d3.select(this.element).append("svg:svg")
		    .attr("width",   width)
		    .attr("height",  height)
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
	    
        this.drawEverything();
	},

	resize: function(date) {
		this.svg.attr('width' ,  this.element.clientWidth  +"px");
		this.svg.attr('height' , this.element.clientHeight  +"px");

        this.updateWindow();
		this.refresh(date);
	},

    event: function(eventType, position, user, data, date) {
	}
	
});

