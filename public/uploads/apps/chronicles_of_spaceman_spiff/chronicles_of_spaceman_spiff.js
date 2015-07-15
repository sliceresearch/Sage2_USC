// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

"use strict";

//
// simple image of the day / calvin and hobbes comic viewer
// Written by Andy Johnson - 2014
//

/* global d3 */

var chronicles_of_spaceman_spiff = SAGE2_App.extend({

	initApp: function()	{
		this.nextCallbackFunc = this.nextCallback.bind(this);
		this.prevCallbackFunc = this.prevCallback.bind(this);

		this.loadFailCallbackFunc = this.loadFailCallback.bind(this);
		this.loadSuccessCallbackFunc = this.loadSuccessCallback.bind(this);
	},

	createURLs: function(timeMachine)	{
		var URL1a = "http://images.ucomics.com/comics/ch/";
		var URL1b = ".gif";

		if (timeMachine > 0) {
			timeMachine = 0;
		}

		var today = new Date(new Date().getTime() + 24 * timeMachine * 60 * 60 * 1000);

		var todayDay   = today.getDate().toString();        // days are 1 - 31
		var todayMonth = (today.getMonth() + 1).toString(); // months are 0 - 11
		var todayYear  = today.getFullYear().toString();    // year is correct

		this.today = todayMonth + "/" + todayDay + "/" + todayYear;

		if (todayDay.length < 2) {
			todayDay = "0" + todayDay;
		}

		if (todayMonth.length < 2) {
			todayMonth = "0" + todayMonth;
		}

		var todayYear2 = todayYear.substr(todayYear.length - 2);

		var todaysComic = todayYear + "/ch" + todayYear2 + todayMonth + todayDay;
		// sample "2014/ch140619"
		// no comics on sunday

		this.URL1 = URL1a + todaysComic + URL1b;
	},

	drawText: function(textLocX, textLocY, theText, textFontSize)	{
		var displayFont = "Arial";
		var drawTempText;

		drawTempText = "#000";

		this.sampleSVG.append("svg:text")
			.attr("x", parseInt(textLocX * 1))
			.attr("y", parseInt(textLocY * 1))
			.style("fill", drawTempText)
			.style("font-size", textFontSize)
			.style("font-family", displayFont)
			.style("text-anchor", "middle")
			.text(theText);
	},

	drawBox: function(boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)	{
		this.sampleSVG.append("svg:rect")
			.style("stroke", "black")
			.style("fill", colorOut)
			.style("fill-opacity", percOut)
			.attr("x", parseInt(boxLocX * 1))
			.attr("y", parseInt(boxLocY * 1))
			.attr("rx", 8)
			.attr("ry", 8)
			.attr("height", parseInt(boxHeight * 1))
			.attr("width", parseInt(boxWidth * 1));
	},


	drawBoxPrev: function(boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)	{
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

		var firstX = boxLocX + 10;
		var secondX = boxLocX + boxWidth * 0.75 - 10;
		var thirdX = boxLocX + boxWidth * 0.75 - 10;

		var firstY = boxLocY + boxHeight * 0.5;
		var secondY = boxLocY + boxHeight * 0.5 - 10;
		var thirdY = boxLocY + boxHeight * 0.5 + 10;

		this.sampleSVG.append("polygon")
			.style("stroke", "black")
			.style("fill", "black")
			.attr("points", "" + firstX + "," + firstY + "," + secondX + "," + secondY + "," + thirdX + "," + thirdY)
			.on("click", this.prevCallbackFunc);
	},

	drawBoxNext: function(boxLocX, boxLocY, boxHeight, boxWidth, colorOut, percOut)	{
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

		var firstX = boxLocX + boxWidth - 10;
		var secondX = boxLocX + boxWidth * 0.25 + 10;
		var thirdX = boxLocX + boxWidth * 0.25 + 10;

		var firstY = boxLocY + boxHeight * 0.5;
		var secondY = boxLocY + boxHeight * 0.5 - 10;
		var thirdY = boxLocY + boxHeight * 0.5 + 10;

		this.sampleSVG.append("polygon")
			.style("stroke", "black")
			.style("fill", "black")
			.attr("points", "" + firstX + "," + firstY + "," + secondX + "," + secondY + "," + thirdX + "," + thirdY)
			.on("click", this.nextCallbackFunc);
	},

	prevCallback: function()	{
		this.state.timeDiff -= 1;
		this.update();
	},

	nextCallback: function()	{
		this.state.timeDiff += 1;
		if (this.state.timeDiff > 0) {
			this.state.timeDiff = 0;
		}
		this.update();
	},

	loadSuccessCallback: function()	{
		this.drawEverything(1);
	},

	loadFailCallback: function() {
		this.drawEverything(0);
	},

	drawImage: function(theImage, loadSuccess)	{
		// if there is an image then show it, else show black
		if (loadSuccess) {
			this.sampleSVG.append("image")
				.attr("xlink:href", theImage)
				.attr("opacity", 1)
				.attr("x", 0)
				.attr("y", 0)
				.attr("width", this.canvasWidth)
				.attr("height", this.canvasHeight);
		} else {
			this.drawBox(0, 0, this.canvasHeight, this.canvasWidth, "#ffffff", 1.0);
			this.drawText(0.5 * this.canvasWidth, 0.5 * this.canvasHeight + 22, "no comic today", 24);
		}

		this.drawBox(0, this.canvasHeight, 30, this.canvasWidth, "#fdae61", 1.0);
		this.drawText(0.5 * this.canvasWidth, this.canvasHeight + 22, "classic Calvin and Hobbes - " + this.today, 24);

		this.drawBoxPrev(0, this.canvasHeight, 30, 50, "#fdae00", 1.0);
		this.drawBoxNext(this.canvasWidth - 50, this.canvasHeight, 30, 50, "#fdae00", 1.0);

	},

	drawEverything: function(loadSuccess)	{
		this.sampleSVG.selectAll("*").remove();

		this.drawImage(this.image1.src, loadSuccess);
	},

	update: function()	{
		// get new image
		this.createURLs(this.state.timeDiff);

		this.updateSlim();
	},

	updateSlim: function() {
		if (isMaster) {
			var comicFileName = this.URL1 + '?' + Math.floor(Math.random() * 10000000);
			this.broadcast("updateSlimNode", {comicFileName: comicFileName});
		}
	},

	updateSlimNode: function(data) {
		if (data.comicFileName === null) {
			return;
		}

		this.image1.src = data.comicFileName;
		this.image1.onload = this.loadSuccessCallbackFunc;
		this.image1.onerror = this.loadFailCallbackFunc;
	},

	updateWindow: function() {
		var x = this.element.clientWidth;
		var y = this.element.clientHeight;

		var newWidth = this.canvasWidth;
		var newHeight = this.canvasHeight + 30;

		// set background color for areas around my app (in case of non-proportional scaling)
		this.element.style.backgroundColor = this.canvasBackground;

		var box = "0,0," + newWidth + "," + newHeight;
		this.sampleSVG.attr("width", x)
			.attr("height", y)
			.attr("viewBox", box)
			.attr("preserveAspectRatio", "xMinYMin meet");

		this.updateSlim();
	},

	init: function(data) {
		this.SAGE2Init("div", data);

		console.log(this.state);

		this.resizeEvents = "continuous"; // onfinish
		this.svg = null;

		this.canvasBackground = "black";

		this.canvasWidth = 600;
		this.canvasHeight = 190;

		this.sampleSVG = null;

		this.image1 = new Image();

		this.URL1  = "";
		this.URL1a = "";
		this.URL1b = "";
		this.today = "";

		this.maxFPS = 0.0003; // update once per hour

		// Get width height from the supporting div
		// var divWidth  = this.element.clientWidth;
		// var divHeight = this.element.clientHeight;

		this.element.id = "div" + data.id;

		var newWidth = this.canvasWidth;
		var newHeight = this.canvasHeight + 30;

		// attach the SVG into the this.element node provided to us
		var box = "0,0," + newWidth + "," + newHeight;
		this.svg = d3.select(this.element).append("svg:svg")
			.attr("width",   data.width)
			.attr("height",  data.height + 30)
			.attr("viewBox", box)
			.attr("preserveAspectRatio", "xMinYMin meet"); // new
		this.sampleSVG = this.svg;

		this.initApp();

		this.update();
		this.draw_d3(data.date);
        this.controls.addButton({type: "next", position: 7, identifier: "Next"});
        this.controls.addButton({type: "prev", position: 1, identifier: "Prev"});
        this.controls.finishedAddingControls(); //Not adding controls but making the default buttons available
	},

	load: function(date) {
		this.refresh(date);
	},

	draw_d3: function(date) {
		this.updateWindow();
	},

	draw: function(date) {
		this.update();
	},

	resize: function(date) {
		this.svg.attr('width',  this.element.clientWidth  + "px");
		this.svg.attr('height', this.element.clientHeight + "px");

		this.updateWindow();
		this.refresh(date);
	},

	showNextPage: function() {
		this.state.timeDiff += 1;
		if (this.state.timeDiff > 0) {
			this.state.timeDiff = 0;
		}
		this.update();
	},
	showPreviousPage: function() {
		this.state.timeDiff -= 1;
		this.update();
	},
	event: function(eventType, position, user, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			// pointer press
		} else if (eventType === "pointerMove") {
			// pointer move
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			if (position.x < 0.5 * this.element.clientWidth) {
				this.showPreviousPage();
			}			else {
				this.showNextPage();
			}
			this.refresh(date);
		} else if (eventType === "widgetEvent"){
            switch(data.identifier){
                case "Next":
                    this.showNextPage();
                    break;
                case "Prev":
                    this.showPreviousPage();
                    break;
                default:
                    console.log("No handler for:", data.identifier);
            }
            this.refresh(date);
        }
	}

});
