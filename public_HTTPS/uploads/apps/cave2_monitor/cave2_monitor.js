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
// cave2 status viewer
// Written by Andy Johnson - 2005 - 2014
// now in D3 / SVG / etc
////////////////////////////////////////


var cave2_monitor = SAGE2_App.extend( {

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
    this.gwin.massiveFontSize = "80px";
    this.gwin.largeFontSize = "36px";
    this.gwin.smallFontSize = "12px";

    this.gwin.canvasBackground = "black";

    this.gwin.rounded = 4; 

    this.gwin.margin = 20;
    this.gwin.canvasHeight = 630;
    this.gwin.canvasWidth = 1260;

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

    this.glob.temp_hot            = 75;
    this.glob.temp_nice           = 30;
    this.glob.temp_cold           = 20;
    this.glob.temp_colderer       = 10;
    this.glob.temp_coldererer     = 0;

    this.bigD = new Array(37);

    this.bigN1 = new Array(37);
    this.bigN2 = new Array(37);

    this.connection = 0;
    this.net1Connection = 0;
    this.net2Connection = 0;

    this.today = new Date();
    this.net1Time = new Date();
    this.net2Time = new Date();

    this.oldSumTotal = 0;
    this.newSumTotal = 0;
    this.staleConnection = 1;
},

////////////////////////////////////////

initApp: function()
{
    var i;

    this.weatherInsideCallbackFunc = this.weatherInsideCallback.bind(this);
    this.network1CallbackFunc = this.network1Callback.bind(this);
    this.network2CallbackFunc = this.network2Callback.bind(this);

    for (i=0; i <37; i++)
        {
        this.bigN1[0] = 1; // start assuming all connections are up
        this.bigN2[0] = 1; // start assuming all connections are up
    }
},

////////////////////////////////////////

tempConvert: function (data)
    {
    // color brewer colors (derived from an 11 step diverging scale)
    var color_hot           = "#d73027"; //"#d73027"
    var color_warmer        = "#f46d43";
    var color_warm          = "#fdae61";

    var color_nice          = "#ffffbf";
    var color_cool          = "#e0f3f8";
    var color_cold          = "#abd9e9";

    var color_colder        = "#74add1";
    var color_colderer      = "#4575b4";
    var color_coldererer    = "#222222"; //"#313695"

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
        color = color_warmer; //color_hot
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

drawBox: function (boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)
{
    var b = null;

    if (this.gwin.sampleSVG !== null)
        {
        b = this.gwin.sampleSVG.append("svg:rect")
        .style("stroke", "grey")
        .style("stroke-width", 1)
        .style("fill", colorOut)
        .style("fill-opacity", percOut)
        .attr("x", boxLocX)
        .attr("y", boxLocY)
        .attr("rx", this.gwin.rounded)
        .attr("ry", this.gwin.rounded)
        .attr("height", boxHeight)
        .attr("width", boxWidth);
        }   
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

drawTWhite: function (textLocX, textLocY, theText, textFontSize, justification)
{
    if (this.gwin.sampleSVG !== null)
        this.gwin.sampleSVG.append("svg:text")
            .attr("x", textLocX)
            .attr("y", textLocY)
            .style("fill", "#FFF")
            .style("font-size", textFontSize)
            .style("font-family", this.gwin.displayFont)
            .style("text-anchor", justification)
            .text(theText);   
},

drawTRed: function (textLocX, textLocY, theText, textFontSize, justification)
{
    if (this.gwin.sampleSVG !== null)
        this.gwin.sampleSVG.append("svg:text")
            .attr("x", textLocX)
            .attr("y", textLocY)
            .style("fill", "#F22")
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

drawTextRightWhite: function (textLocX, textLocY, theText, textFontSize)
{
    this.drawTWhite(textLocX, textLocY, theText, textFontSize, "end");  
},


////////////////////////////////////////

drawBasicStuff: function ()
{
    this.today = new Date();
    var currentTime = (this.today.getMonth()+1) + "/" + this.today.getDate()  + 
    "/" + this.today.getFullYear() + " - " + this.today.getHours() + ":" +
    ("0" + this.today.getMinutes()).slice (-2) +
    ":" + ("0" + this.today.getSeconds()).slice (-2);


    this.drawTWhite(45, 50, "evl CAVE2 monitor", "40px");

    // check if the CPU monitoring is stuck and no values are changing
    if (this.newSumTotal === this.oldSumTotal)
        this.staleConnection += 1;
    else
        this.staleConnection = 0;

    this.oldSumTotal = this.newSumTotal;


    if ((this.connection === 0) || (this.net1Connection === 0) ||
        (this.net2Connection === 0) || (this.staleConnection >= 5))
        {
            this.drawTRed(this.gwin.canvasWidth/2, 50, "Connection Lost", "40px", "middle");
            this.drawBox(45, 65, 5, 1160, "red", 1.0);

            if ((this.connection === 0) || (this.staleConnection >= 5))
                this.drawTRed(this.gwin.canvasWidth/2-100, 62, "cluster", "10px", "left");
            if (this.net1Connection === 0)
                this.drawTRed(this.gwin.canvasWidth/2, 62, "net int", "10px", "left");
            if (this.net2Connection === 0)
                this.drawTRed(this.gwin.canvasWidth/2+100, 62, "net ext", "10px", "left");
        }
    else
        this.drawBox(45, 65, 5, 1160, "white", 1.0);



    this.drawTextRightWhite(1205, 50, currentTime, "40px");

    this.drawTWhite(40, 390, "GPU Memory",  "10px", "start");
    this.drawTWhite(40, 420, "CPU Cores",   "10px", "start");
    this.drawTWhite(40, 555, "CPU Memory",  "10px", "start");
    this.drawTWhite(40, 580, "Network Out", "10px", "start");
    this.drawTWhite(40, 600, "Network In",  "10px", "start");
},


////////////////////////////////////////

network1Callback: function(error, datasetTextIn)
{
    var status, parsedNet1, line;

    if (error)
        {
        console.log("network 1 Callback - error");
        return;
        }

    // could also have a problem if length is less than 37
    // need to deal with that

    parsedNet1 = d3.csv.parseRows(datasetTextIn);
    line = parsedNet1[0]; // eg Sat Aug 30 17:55:36 CDT 2014
    status = line[0].split(" ");
    time = status[3].split(":");

    this.net1Time.setDate(status[2]);
    this.net1Time.setFullYear(status[5]);
    this.net1Time.setHours(time[0]);
    this.net1Time.setMinutes(time[1]);
    this.net1Time.setSeconds(time[2]);

    var timeSinceLastConnect1 = Math.floor((this.today - this.net1Time)/1000);
    if (timeSinceLastConnect1 > 45)
        this.net1Connection = 0;
    else
        this.net1Connection = 1;
    
    //console.log(parsedNet1);
    // line 0 is date and time
    // lines 1-36 are nodes
    for (i=1; i <= 37; i++)
        {
        line = parsedNet1[i];
        status = line[0].split(" ");
        if (status[1] === "UP")
            {
                // update network status array location to be up
                this.bigN1[i-1] = 1;
            }
        else
            {
                // update network status array location to be down
                //console.log ("node " + i + " is down");
                this.bigN1[i-1] = 0;
            }
        }
},

network2Callback: function(error, datasetTextIn)
{
    var status, parsedNet2, line;

    if (error)
        {
        console.log("network 2 Callback - error");
        return;
        }

    // could also have a problem if length is less than 37
    // need to deal with that

    parsedNet2 = d3.csv.parseRows(datasetTextIn);
    line = parsedNet2[0]; // eg Sat Aug 30 17:55:36 CDT 2014
    status = line[0].split(" ");
    time = status[3].split(":");

    this.net2Time.setDate(status[2]);
    this.net2Time.setFullYear(status[5]);
    this.net2Time.setHours(time[0]);
    this.net2Time.setMinutes(time[1]);
    this.net2Time.setSeconds(time[2]);

    var timeSinceLastConnect2 = Math.floor((this.today - this.net2Time)/1000);
    if (timeSinceLastConnect2 > 45)
        this.net2Connection = 0;
    else
        this.net2Connection = 1;

    //console.log(parsedNet1);
    // line 0 is date and time
    // lines 1-36 are nodes
    for (i=1; i <= 37; i++)
        {
        line = parsedNet2[i];
        status = line[0].split(" ");
        if (status[1] === "UP")
            {
                // update network status array location to be up
                this.bigN2[i-1] = 1; // for now
            }
        else
            {
                // update network status array location to be down
                //console.log ("node " + i + " is down");
                this.bigN2[i-1] = 0; 
            }
        }
},

////////////////////////////////////////

weatherInsideCallback: function(error, datasetTextIn)
{
    if (error)
        {
        console.log("lyra data Callback - error");
        return;
        }

    var parsedCSV = d3.csv.parseRows(datasetTextIn);
    var d, d2, c;

    if (parsedCSV.length >= 37)
        {
        this.connection = 1;

        // should be 37 lines in parsedCSV
        //console.log(parsedCSV.length);
        //console.log(parsedCSV[0][0]); // entire line 1 (master)
        //console.log(parsedCSV[27][0]); // entire line 2 (node 1)

        this.gwin.roughDate = parsedCSV[0][0];

        d = parsedCSV[0][0].slice(0, 21);
        d2 = parsedCSV[0][0].slice(23, 38);

        this.newSumTotal = 0;

        for (c = 0; c < 37; c++)
            this.bigD[c] = new Array(20); // 16 + 4

        for (j=0; j<37; j+= 1)
            {
            for( i=0; i<16; i+= 1)
                {
                this.bigD[j][i] = + parsedCSV[j][0].slice(41+(4*i), 44+(4*i));
                this.newSumTotal += this.bigD[j][i];
                }

            this.bigD[j][16] = + parsedCSV[j][0].slice(105, 110);
            this.bigD[j][17] = + parsedCSV[j][0].slice(113, 118);
            this.bigD[j][18] = + parsedCSV[j][0].slice(119, 125);
            this.bigD[j][19] = Math.round(100 / 64 * (+ parsedCSV[j][0].slice(126, 132)));
            
            this.newSumTotal += this.bigD[j][16];
            this.newSumTotal += this.bigD[j][17];
            this.newSumTotal += this.bigD[j][18];
            this.newSumTotal += this.bigD[j][19];

            //console.log("bigD["+j+"] is " + this.bigD[j]);
            }

        }
    else // zero out all the display values
        {
            this.connection = 0;

            for (c = 0; c < 37; c++)
                this.bigD[c] = new Array(20); // 16 + 4

            for (j=0; j<37; j+= 1)
                {
                for( i=0; i<16; i+= 1)
                    {
                    this.bigD[j][i] = 0;
                    }

                this.bigD[j][16] = 0;
                this.bigD[j][17] = 0;
                this.bigD[j][18] = 0;
                this.bigD[j][19] = 0;
                }
        }

        //console.log (this.newSumTotal);
    this.drawAll();
},

updateInsideTemp: function ()
{ 
     d3.text("http://lyra.evl.uic.edu:9000/html/cluster.txt" + '?' +
         Math.floor(Math.random() * 10000000), this.weatherInsideCallbackFunc);
},

updateNetwork1: function ()
{ 
     d3.text("http://lyra.evl.uic.edu:9000/html/ping.txt" + '?' +
         Math.floor(Math.random() * 10000000), this.network1CallbackFunc);
},

updateNetwork2: function ()
{ 
     d3.text("http://lyra.evl.uic.edu:9000/html/pingcavewave.txt" + '?' +
         Math.floor(Math.random() * 10000000), this.network2CallbackFunc);
},

drawOneNode: function (x, y, proc, p, row)
{
    var i, j, num, t, topX;
    var modNet, modNetText;

    if (p === 2) // processors - value ranges from 0 to 16
        {
        for (i=0; i<8; i++)
            for (j=0; j<2; j++)
            {
                num = i + j*8;
                topX = x+50+j*20;
                topY = y + i*16;
                btmY = y - i*16;

                if (row < 1)
                    theY = topY;
                else
                    theY = btmY;

                if (num < Math.floor(proc))
                    {
                    c = this.tempConvert(100); // full 
                    }
                else if (num < (Math.ceil(proc)) )
                    {
                    t = (proc - Math.floor(proc))*100;
                    c = this.tempConvert(t); // partial
                    }
                else
                    {
                    c = this.tempConvert(0); // off
                    }

                this.glob.colorOut = c[0];
                this.glob.colorOutb = c[1];
                this.glob.percOut = c[2];

                this.drawBox(topX, theY, 14, 20, this.glob.colorOut, this.glob.percOut);
                this.drawBox(topX, theY, 14, 20, this.glob.colorOutb, 1.0 - this.glob.percOut);
            }

        //this.drawTextRightWhite(x+80, y+12, proc.toFixed(1), "10px"); // 0 - 1600
        }
    else if ((p == 1) || (p == 3)) // GPU and memory space percentage
        {
        c = this.tempConvert(proc);
        this.glob.colorOut = c[0];
        this.glob.colorOutb = c[1];
        this.glob.percOut = c[2];

        this.drawBox(x+50, y, 14, 40, this.glob.colorOut, this.glob.percOut);
        this.drawBox(x+50, y, 14, 40, this.glob.colorOutb, 1.0 - this.glob.percOut);

        if (proc <= 0)
            this.drawTextRightWhite(x+85, y+11, "", "10px");
        else if (proc < this.glob.temp_colderer)
            this.drawTextRightWhite(x+85, y+11, proc.toFixed(0)+"%", "10px");
        else
            this.drawTextRight(x+85, y+11, proc.toFixed(0)+"%", "10px");
        }
    else // networking values
        // net out < 1000, 1000 - 100000, > 100000
        {
            if (proc <= 0)
                {
                    modNet = 0;
                    modNetText = "";
                }
            else if (proc < 1000)
                {
                    modNet = 30 * proc / 1000;
                    modNetText = Math.floor(proc) + "K";
                }
            else if (proc < 100000)
                {
                    modNet = 30 + 45 * proc / 100000;
                    modNetText = Math.floor(proc / 1000) + "M";
                }
            else
                {
                    modNet = 90;
                    modNetText = Math.floor(proc / 1000) + "M";
                }

        c = this.tempConvert(modNet);
        this.glob.colorOut = c[0];
        this.glob.colorOutb = c[1];
        this.glob.percOut = c[2];

        this.drawBox(x+50, y, 14, 40, this.glob.colorOut, this.glob.percOut);
        this.drawBox(x+50, y, 14, 40, this.glob.colorOutb, 1.0 - this.glob.percOut);

        if (proc < 600)
            this.drawTextRightWhite(x+85, y+11, modNetText, "10px");
        else
            this.drawTextRight(x+85, y+11, modNetText, "10px");
        }
},


////////////////////////////////////////

drawInsideTemp: function ()
{
    var procTotal = 0;
    var netsUp = 0;
    var netColor;


    for (j=0; j<37; j+= 1)
    {
        procTotal = 0;
        //console.log("bigD["+j+"] is " + this.bigD[j]);
        for( i=0; i<16; i+= 1)
            procTotal += Number(this.bigD[j][i]);

        //total processor usage 0-16

        netsUp = this.bigN1[j] + this.bigN2[j]; // should be 2 if all working well
        if (netsUp === 1)
            netColor = "yellow";
        else if (netsUp === 0)
            netColor = "red";

        if (j === 0)    // 0
            {
            this.drawTWhite((j+2)*30+10, 335, "master", "18px", "middle");
            this.drawOneNode((j)*30, 300, this.bigD[j][16], 1, -1); // GPU %age
            this.drawOneNode((j)*30, 160, procTotal / 100,  2, -1); // CPU
            this.drawOneNode((j)*30, 135, this.bigD[j][19], 3, -1); // memory %age
            this.drawOneNode((j)*30, 110, this.bigD[j][18], 4, -1); // net out < 1000, 1000 - 100000, > 100000
            this.drawOneNode((j)*30,  90, this.bigD[j][17], 5, -1); // net in < 1000, 1000 - 100000, > 100000

            if (netsUp < 2)
                    this.drawBorderlessBox((j+1)*30+10, 80, 260, 60, netColor, 0.15);
            }

        else if ( (j % 2) === 1) // 1 3 5 7
            {
            this.drawTWhite((j+4)*30+10, 335, j, "18px", "middle");
            this.drawOneNode((j+2)*30, 300, this.bigD[j][16], 1, 0); // GPU %age
            this.drawOneNode((j+2)*30, 160, procTotal / 100,  2, 0); // CPU
            this.drawOneNode((j+2)*30, 135, this.bigD[j][19], 3, 0); // memory %age
            this.drawOneNode((j+2)*30, 110, this.bigD[j][18], 4, 0); // net out < 1000, 1000 - 100000, > 100000
            this.drawOneNode((j+2)*30,  90, this.bigD[j][17], 5, 0); // net in < 1000, 1000 - 100000, > 100000

            if (netsUp < 2)
                    this.drawBorderlessBox((j+3)*30+10, 80, 260, 60, netColor, 0.15);
            }

        else if ( (j % 2) === 0) // 2 4 6 8
            {
            this.drawTWhite((j+3)*30+10, 370, j, "18px", "middle");
            this.drawOneNode((j+1)*30, 380, this.bigD[j][16], 1, 1); // GPU %age
            this.drawOneNode((j+1)*30, 520, procTotal / 100,  2, 1); // CPU
            this.drawOneNode((j+1)*30, 545, this.bigD[j][19], 3, 1); // memory %age
            this.drawOneNode((j+1)*30, 570, this.bigD[j][18], 4, 1); // net out < 1000, 1000 - 100000, > 100000
            this.drawOneNode((j+1)*30, 590, this.bigD[j][17] ,5, 1); // net in < 1000, 1000 - 100000, > 100000

            if (netsUp < 2)
                    this.drawBorderlessBox((j+2)*30+10, 350, 260, 60, netColor, 0.15);
            }            
        }
},

////////////////////////////////////////

updateAll: function ()
{
    this.updateInsideTemp(); 
    this.updateNetwork1();
    this.updateNetwork2();
},

////////////////////////////////////////

drawAll: function ()
{
    var regionX, regionY;

    // clear out the existing drawing
    if (this.gwin.sampleSVG !== null)
        this.gwin.sampleSVG.selectAll("*").remove();

    // draw the background
    this.drawBorderlessBox(0, 0, this.gwin.canvasHeight, this.gwin.canvasWidth, this.gwin.canvasBackground, 1);

    // draw the foreground elements
    this.drawBasicStuff();
    this.drawInsideTemp(); 
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

    init: function(id, width, height, resrc, date) {
        // call super-class 'init'
        arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

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
            .attr("preserveAspectRatio", "xMinYMin meet"); // new
        this.gwin.sampleSVG = this.svg;

        this.drawBox(0, 0, this.gwin.canvasHeight, this.gwin.canvasWidth, "black", 1);

        this.initApp();
        this.updateAll();
        //this.draw_d3(date);
    },

    load: function(state, date) {
        this.refresh(date);
    },

    draw_d3: function(date) {

        //this.drawBasicStuff();
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
        }
    }
    
});
