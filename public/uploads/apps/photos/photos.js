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
// simple photo slideshow
// Written by Andy Johnson - 2014
//

/* global d3, photoAlbums */


var photos = SAGE2_App.extend({

	// choose a specific image library from those loaded to cycle through

	chooseImagery: function(selection) {
		this.listFileNamePhotos  = this.photoAlbums[selection].list;
		this.listFileNameLibrary = this.photoAlbums[selection].location;
	},

	initApp: function() {
		this.listFileCallbackFunc        = this.listFileCallback.bind(this);
		this.imageLoadCallbackFunc       = this.imageLoadCallback.bind(this);

		this.imageLoadFailedCallbackFunc = this.imageLoadFailedCallback.bind(this);

		this.image1.onload  = this.imageLoadCallbackFunc;
		this.image1.onerror = this.imageLoadFailedCallbackFunc;
		this.image2.onload  = this.imageLoadCallbackFunc;
		this.image2.onerror = this.imageLoadFailedCallbackFunc;
		this.image3.onload  = this.imageLoadCallbackFunc;
		this.image3.onerror = this.imageLoadFailedCallbackFunc;

		this.chooseImagery(this.state.imageSet);

		// Register a callback to handle file list from server
		this.registerFileListHandler(this.fileList);

		// Load the current list of images
		this.loadInList();
	},

	// Callback from file manager
	fileList: function(data) {
		var slideshowUpdate = false;
		// Create an array of images from the 'slideshow' user folder
		this.slideshowList = [];
		for (var i = data.images.length - 1; i >= 0; i--) {
			// take only images from the slideshow folder in user directory
			if (data.images[i].sage2URL.startsWith("/user/slideshow/")) {
				this.slideshowList.push({name: data.images[i].sage2URL});
				slideshowUpdate = true;
			}
		}
		// If a new pic was added to the slideshow
		if (slideshowUpdate && this.listFileNamePhotos === "slideshow") {
			this.loadInList();
		}
	},

	imageLoadCallback: function() {
		this.imageTemp = this.image2; // hold onto the previous image (image2)
		this.image2    = this.image1; // current image becomes the previous image (needed for fading)
		this.image1   = this.image3;  // image1 is now the new image (image3)
		this.image3   = this.imageTemp;
		this.okToDraw = this.fadeCount;
	},

	imageLoadFailedCallback: function() {
		console.log(this.appName + "image load failed on " + this.fileName);
		this.update();
	},

	// send the list of images in the current image library to all of the client nodes

	listFileCallback: function(error, data) {
		this.broadcast("listFileCallbackNode", {error: error, data: data});
	},

	listFileCallbackNode: function(data) {

		var error = data.error;
		var localData = data.data;

		if (error) {
			console.log(this.appName + "listFileCallback - error");
			return;
		}

		if (localData === null)				{
			console.log(this.appName + "list of photos is empty");
			return;
		}

		this.bigList = d3.csvParse(localData);
		console.log(this.appName + "loaded in list of " + this.bigList.length + " images");

		this.updateTitle("Slideshow: " + this.photoAlbums[this.state.imageSet].longName);
		this.update();
		this.drawEverything();
	},

	// blend from the current image to a new image if there is a new image to show

	drawEverything: function() {
		if ((this.okToDraw >= -this.fadeCount) || (this.forceRedraw > 0)) {

			if 	(this.forceRedraw > 0) {
				this.okToDraw = this.fadeCount;
			}

			var newWidth  = this.canvasWidth;
			var newHeight = this.canvasHeight;
			var newOpacityOld = 1;
			var newOpacityNew = 1;

			this.svg.select("#baserect")
				.attr("height", newHeight)
				.attr("width", newWidth);

			var windowRatio = this.canvasWidth / this.canvasHeight;
			var image1DrawWidth = this.canvasWidth;
			var image1DrawHeight = this.canvasHeight;
			var image2DrawWidth = this.canvasWidth;
			var image2DrawHeight = this.canvasHeight;

			// previous image
			if (this.image2 !== "NULL") {
				var image2x = this.image2.width;
				var image2y = this.image2.height;
				var image2ratio = image2x / image2y;

				// want wide images to be aligned to top not center
				if (image2ratio > windowRatio) {
					image2DrawWidth  = this.canvasWidth;
					image2DrawHeight = this.canvasWidth / image2ratio;
				}

				// okToDraw starts at this.fadeCount and decreases by one each frame
				//
				// mid 2016 something changed and I'm not getting the nice blend from before
				// so diabling the blending for multiple image scrapbooks for now
				//
				// different images look ok with a fade to black in between
				// webcams look better without the fade to black in between
				///////

				newOpacityOld = Math.max(0.0, Math.min(1.0, (this.okToDraw + 9) / this.fadeCount));
				newOpacityNew = Math.max(0.0, Math.min(1.0, 1.0 - (this.okToDraw / this.fadeCount)));

				if (this.bigList != null) {
					if (this.bigList.length > 1) {
						newOpacityOld = 0.0;
					}
					this.svg.select("#image2").attr("opacity", newOpacityOld);
				}
			}

			// current image
			if (this.image1 !== "NULL") {
				var image1x     = this.image1.width;
				var image1y     = this.image1.height;
				var image1ratio = image1x / image1y;

				// want wide images to be aligned to top not center
				if (image1ratio > windowRatio) {
					image1DrawWidth  =  this.canvasWidth;
					image1DrawHeight = this.canvasWidth / image1ratio;
				}

				if (this.okToDraw === this.fadeCount) {
					this.svg.select("#image1")
						.attr("xlink:href", this.image1.src)
						.attr("opacity", 0)
						.attr("width",  image1DrawWidth)
						.attr("height", image1DrawHeight);

					this.svg.select("#image2")
						.attr("xlink:href", this.image2.src)
						//.attr("opacity", newOpacity)
						.attr("width",  image2DrawWidth)
						.attr("height", image2DrawHeight);

				} else {
					this.svg.select("#image1")
						.attr("opacity", newOpacityNew);
				}
			}

			this.forceRedraw = 0;
			this.okToDraw = this.okToDraw - 1;
		}


		// if enough time has passed grab a new image and display it

		if (isMaster) {
			this.updateCounter += 1;

			if (this.updateCounter > (this.loadTimer * this.maxFPS)) {
				this.update();
			}
		}
	},

	// the master loads in the text file containing ths list of images in this photo album

	loadInList: function() {
		if (this.listFileNamePhotos === "slideshow") {
			// Special case: slideshow filder from server
			this.bigList = this.slideshowList;
			this.update();
			this.drawEverything();
			this.updateTitle("Photo Slideshow: user");
		} else {
			if (isMaster) {
				if (this.listFileNamePhotos.startsWith("http")) {
					// treat the list parameter as a public list of images
					this.listFileName = this.listFileNamePhotos;
					d3.text(this.listFileName, this.listFileCallbackFunc);
				} else {
					// treat the list parameter as a single image (eg a webcam image)
					// and pretend we loaded in the list
					this.listFileCallbackFunc("", "name\n" + this.listFileNamePhotos);
				}


			}
		}
	},

	// choose a random image from the current photo album
	// only the master should pick a new image (but right now each clients does)
	// if all the random numbers are in sync this will work - but not completely safe

	newImage: function() {
		if (this.bigList === null) {
			this.state.counter = 0;
		} else {
			this.state.counter = Math.floor(Math.random() * this.bigList.length);
		}
	},

	// move to the next photo album
	nextAlbum: function() {
		this.bigList = null;
		this.state.imageSet += 1;
		if (this.state.imageSet >= this.photoAlbums.length) {
			this.state.imageSet = 0;
		}
		this.chooseImagery(this.state.imageSet);
		this.loadInList();
	},

	// choose a particular photo album
	setAlbum: function(albumNumber) {
		console.log("setting album to " + albumNumber);
		this.bigList = null;
		this.state.imageSet = +albumNumber;
		this.chooseImagery(this.state.imageSet);
		this.loadInList();
	},

	// update tries to load in a new image (set in the newImage function)
	// this image may be a completely new image (from a file)
	// or a more recent version of the same image from a webcam

	update: function() {
		if (isMaster) {
			// reset the timer counting towards the next image swap
			this.updateCounter = 0;


			// if there is no big list of images to pick from then get out
			if (this.bigList === null) {
				console.log(this.appName + "list of photos not populated yet");
				return;
			}

			// randomly pick a new image to show from the current photo album
			// which can be showing the same image if the album represents a webcam

			this.newImage();

			// if there is no image name for that nth image then get out
			if (this.bigList[this.state.counter] === null) {
				console.log(this.appName + "cant find filename of image number " + this.state.counter);
				return;
			}

			// escape makes a string url-compatible
			// except for ()s, commas, &s, and odd characters like umlauts and graves

			// this also appends a random number to the end of the request to avoid browser caching
			// in case this is a single image repeatedly loaded from a webcam

			// ideally this random number should come from the master to guarantee identical values across clients

			if (this.bigList.length > 0) {
				this.fileName = this.listFileNameLibrary + escape(this.bigList[this.state.counter].name) +
									'?' + Math.floor(Math.random() * 10000000);
				this.broadcast("updateNode", {data: this.fileName});
			}
		}
	},

	updateNode: function(data) {

		this.fileName = data.data;

		if (this.fileName === null) {
			console.log(this.appName + "no filename of new photo to load");
			return;
		}

		// ask for image3 to load in the new image
		this.image3.src = this.fileName;
	},

	// if the window gets reshaped then update my drawing area

	updateWindow: function() {
		this.canvasWidth  = this.element.clientWidth;
		this.canvasHeight = this.element.clientHeight;

		var box = "0,0," + this.canvasWidth + "," + this.canvasHeight;

		this.svg.attr("width", this.canvasWidth)
			.attr("height", this.canvasHeight)
			.attr("viewBox", box)
			.attr("preserveAspectRatio", "xMinYMin meet");

		this.forceRedraw = 1;
		this.drawEverything(); // need this to keep image while scaling etc
	},

	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // onfinish
		this.svg = null;

		this.canvasBackground = "black";

		this.canvasWidth  = 800;
		this.canvasHeight = 600;

		this.loadTimer = 15;   // default value to be replaced from photo_scrapbooks.js
		this.fadeCount = 10.0; // default value to be replaced from photo_scrapbooks.js

		// Load the settings from the scrapbook file
		var settings = photoAlbums();

		this.photoAlbums = [];
		if (settings.albums !== null) {
			this.photoAlbums = settings.albums;
		}

		if (settings.loadTimer !== null) {
			this.loadTimer = settings.loadTimer;
		}

		if (settings.fadeCount !== null) {
			this.fadeCount = settings.fadeCount;
		}

		if (this.fadeCount === 0) {
			this.fadeCount = 1; // avoid divide by zero later on
		}

		if (settings.background !== null) {
			this.canvasBackground = settings.background;
		}

		// Add an extra slideshow: will load images from the 'slideshow' user folder
		this.photoAlbums.push({
			list:     "slideshow",
			location: "",
			name:     "slideshow",
			longName: "Local Slideshow"
		});

		this.URL1  = "";
		this.URL1a = "";
		this.URL1b = "";

		this.today = "";
		this.timeDiff = 0;

		this.bigList = null;
		this.slideshowList = null;

		this.okToDraw = this.fadeCount;
		this.forceRedraw = 1;

		this.fileName = "";
		this.listFileName = "";

		this.appName = "evl_photos:";

		this.image1 = new Image();
		this.image2 = new Image();
		this.image3 = new Image();
		this.imageTemp = null;

		this.updateCounter = 0;

		this.listFileNamePhotos = "";
		this.listFileNameLibrary = "";

		this.maxFPS = 30.0;
		this.element.id = "div" + data.id;

		// attach the SVG into the this.element node provided to us
		var box = "0,0," + this.canvasWidth + "," + this.canvasHeight;
		this.svg = d3.select(this.element).append("svg:svg")
			.attr("width",   data.width)
			.attr("height",  data.height)
			.attr("viewBox", box)
			.attr("preserveAspectRatio", "xMinYMin meet"); // new

		this.svg.append("svg:rect")
			.style("stroke", this.canvasBackground)
			.style("fill", this.canvasBackground)
			.style("fill-opacity", 1.0)
			.attr("x",  0)
			.attr("y",  0)
			.attr("id", "baserect")
			.attr("width",  data.width)
			.attr("height", data.height);
		this.svg.append("svg:image")
			.attr("opacity", 1)
			.attr("x",  0)
			.attr("y",  0)
			.attr("id", "image2")
			.attr("width",  data.width)
			.attr("height", data.height);
		this.svg.append("svg:image")
			.attr("opacity", 1)
			.attr("x",  0)
			.attr("y",  0)
			.attr("id", "image1")
			.attr("width",  data.width)
			.attr("height", data.height);

		// create the widgets
		console.log("creating controls");
		this.controls.addButton({type: "next", position: 7, identifier: "Next"});

		for (var loopIdx = 0; loopIdx < this.photoAlbums.length; loopIdx++) {
			var loopIdxWithPrefix = "0" + loopIdx;
			var pos = 5 - loopIdx;
			if (pos < 1) {
				pos = pos + 12;
			}
			this.controls.addButton({label: this.photoAlbums[loopIdx].name, position: pos, identifier: loopIdxWithPrefix});
		}
		this.controls.finishedAddingControls(); // Important

		this.initApp();

		this.update();
		this.draw_d3(data.date);
	},

	load: function(date) {
	},

	draw_d3: function(date) {
		this.updateWindow();
	},

	draw: function(date) {
		this.drawEverything();
	},

	resize: function(date) {
		this.svg.attr('width',  this.element.clientWidth  + "px");
		this.svg.attr('height', this.element.clientHeight  + "px");

		this.updateWindow();
		this.refresh(date);
	},

	quit: function() {
		// Remove callback
		this.unregisterFileListHandler(this.fileList);
	},

	/**
	* To enable right click context menu support this function needs to be present with this format.
	*
	* Must return an array of entries. An entry is an object with three properties:
	*	description: what is to be displayed to the viewer.
	*	callback: String containing the name of the function to activate in the app. It must exist.
	*	parameters: an object with specified datafields to be given to the function.
	*		The following attributes will be automatically added by server.
	*			serverDate, on the return back, server will fill this with time object.
	*			clientId, unique identifier (ip and port) for the client that selected entry.
	*			clientName, the name input for their pointer. Note: users are not required to do so.
	*			clientInput, if entry is marked as input, the value will be in this property. See pdf_viewer.js for example.
	*		Further parameters can be added. See pdf_view.js for example.
	*/
	getContextEntries: function() {
		var entries = [];
		var entry;

		for (var albumCounter = 0; albumCounter < this.photoAlbums.length; albumCounter++) {
			entry = {};
			entry.description = this.photoAlbums[albumCounter].longName;
			entry.callback = "changeSlideshow";
			entry.parameters = {};
			entry.parameters.page = albumCounter;
			entries.push(entry);
		}

		return entries;
	},

	/**
	* Support function to allow page changing through right mouse context menu.
	*
	* @method changeThePage
	* @param responseObject {Object} contains response from entry selection
	*/
	changeSlideshow: function(responseObject) {
		var page = responseObject.page;
		this.setAlbum(page);

		// This needs to be a new date for the extra function.
		this.refresh(new Date(responseObject.serverDate));
	},


	event: function(eventType, pos, user, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			// pointer press
		}
		if (eventType === "pointerMove") {
			// pointer move
		}
		if (eventType === "pointerRelease" && (data.button === "left")) {
			this.nextAlbum();
			this.refresh(date);
		} else if (eventType === "widgetEvent") {
			if (data.identifier === "Next") {
				this.nextAlbum();
			} else {
				this.setAlbum(data.identifier);
			}
			this.refresh(date);
		}
	}

});

