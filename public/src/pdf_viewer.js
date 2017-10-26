// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2016

/* global d3 */

"use strict";

/**
 * @module client
 * @submodule pdf_viewer
 */

PDFJS.workerSrc       = 'lib/pdf.worker.js';
PDFJS.disableWorker   = false;
PDFJS.disableWebGL    = true;
PDFJS.verbosity       = PDFJS.VERBOSITY_LEVELS.warnings;
PDFJS.maxCanvasPixels = 67108864; // 8k2
PDFJS.disableStream   = true;

// List of icons
var svgImages = [
	'arrowLeftBtnOff.svg',   // 0
	'arrowLeftBtnOn.svg',    // 1
	'arrowRightBtnOn.svg',   // 2
	'arrowRightBtnOff.svg',  // 3
	'addPage.svg',           // 4
	'deletePage.svg',        // 5
	'thumbnail.svg'];        // 6

// Folder containing the icons
var iconPath = "/images/appUi/";

/**
 * PDF viewing application, based on pdf.js library
 *
 * @class pdf_viewer
 */
var pdf_viewer = SAGE2_App.extend({

	modifyState: function(name, value) {
		this.state[name] = value;
		this.SAGE2Sync(true);
	},

	/**
	* Init method, creates an 'img' tag in the DOM and a few canvas contexts to handle multiple redraws
	*
	* @method init
	* @param data {Object} contains initialization values (id, width, height, ...)
	*/
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);

		// Set the background
		this.element.style.backgroundColor = '#272822';

		// move and resize callbacks
		this.resizeEvents = "continuous";

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;

		this.activeTouch    = [];
		this.interactable   = [];
		this.gotInformation = false;
		this.pageDocument   = 0;
		this.baseWidthPage  = null;
		this.baseHeightPage = null;
		this.pageCurrentlyVisible  = {};
		this.pageCurrentlyGenerated = {};
		this.loaded = false;
		this.TVALUE = 0.25;
		this.showUI = true;
		this.title  = data.title;

		// disable gap between pages (bug in scaling)
		// this.displacement = this.marginButton;
		this.displacement = 0;

		this.marginButton    = 5;
		this.thumbnailHeight = 0;
		this.thumbnailHorizontalPosition = 0;
		this.resizeValue = 1;
		this.previousResizeValue = 1;

		// svg container, big as the application
		this.container = d3.select(this.element).append("svg").attr("id", "container");
		this.container
			.style("position", "absolute")
			.style("left", 0)
			.attr("width",  this.element.clientWidth)
			.attr("height", this.element.clientHeight);

		// the group that will visualize the images
		this.imageVisualizer = this.container.append("g");
		this.imageVisualizer.groups = {};
		for (var i = 1; i <= 3; i++) {
			this.imageVisualizer.groups[i] = this.imageVisualizer.append("g").style("visibility", "hidden");
		}

		// this.imageVisualizer = this.container.append("g");
		// array used to store the svg image item used to visualize the images
		this.imageViewers = {};
		// array containing the image links
		this.imagesLink = {};

		// the group that will visualize the thumbnails
		this.thumbnailsVisualizer = this.container.append("g");
		// array used to store the svg image for thumbnails
		this.thumbnailsViewers = [];
		// array containing the image links
		this.thumbnailsLink = [];

		// menu bar
		this.commandBarG = this.container.append("g");

		this.imageVisualizer.groups[Math.ceil(this.resizeValue)] =
			this.imageVisualizer.append("g").style("visibility", "visible");
		this.thumbnailsVisualizer.style("visibility",
			this.state.showingThumbnails ? "visible" : "hidden");

		// if no state available, load new pdf
		this.loadPDF(cleanURL(this.state.doc_url));
	},

	loadPDF: function(docURL) {
		var _this = this;
		PDFJS.getDocument(docURL).then(function(solver) {

			// saving the solver
			_this.solver = solver;

			// memorize the number of page of the document
			_this.pageDocument = solver.numPages;

			// no UI needed when only one page
			if (_this.pageDocument === 1) {
				_this.showUI = false;
			}

			// load the first page the get the INFORMATION
			_this.obtainPageFromPDF(solver, 1, _this, 1);

			// generating the thumbnails - i do not need to generate thumbnails.
			for (var i = 1; i <= _this.pageDocument; i++) {
				_this.obtainPageFromPDF(solver, i, _this, _this.TVALUE);
			}

			// Update the title
			_this.changeTitle();

			// Build the wall UI
			_this.addWidgetControlsToPdfViewer();
		});
	},

	/**
	* Adds custom widgets to app
	*
	* @method addWidgetControlsToPdfViewer
	*/
	addWidgetControlsToPdfViewer: function() {
		if (this.pageDocument > 1) {
			this.controls.addButton({type: "fastforward", position: 6, identifier: "LastPage"});
			this.controls.addButton({type: "rewind",      position: 2, identifier: "FirstPage"});
			this.controls.addButton({type: "prev",        position: 3, identifier: "PreviousPage"});
			this.controls.addButton({type: "next",        position: 5, identifier: "NextPage"});
			this.controls.addSlider({
				minimum: 1,
				maximum: this.pageDocument,
				increments: 1,
				property: "this.state.currentPage",
				label: "Page",
				identifier: "Page"
			});
		}
		this.controls.finishedAddingControls();
	},

	/**
	 * Update the tile with current page number
	 *
	 * @method     `eTitle
	 */
	changeTitle: function() {
		// Get the page in center of the screen
		var currentNumber = this.pageInCenter();
		// Boundaries check
		currentNumber = (currentNumber < 1) ? 1 : currentNumber;
		currentNumber = (currentNumber > this.pageDocument) ? this.pageDocument : currentNumber;
		var newTitle  = this.title + " (page " + currentNumber + " of " + this.pageDocument + ")";
		this.updateTitle(newTitle);
	},

	obtainPageFromPDF: function(pdfFile, pageNumber, that, quality) {

		var thumbnail = (quality === that.TVALUE) ? true : false;

		pdfFile.getPage(pageNumber).then(function(page) {

			var canvas = document.createElement("canvas");
			var ctx = canvas.getContext("2d");
			var viewport;
			viewport = page.getViewport(quality);

			if (!that.gotInformation && !thumbnail) {
				if (that.baseWidthPage == null) {
					that.baseWidthPage  = viewport.width;
					that.baseHeightPage = viewport.height;
				}
				that.gotInformation = true;

				that.createMenuBar();

				var dx = (-1) * that.baseWidthPage * (that.state.currentPage - 1);
				that.imageVisualizer.attr("transform", "translate(" + dx + ",0)");

				that.scaleThumbnailBar();

				var commandDy = that.state.showingThumbnails ? that.thumbnailHeight * that.resizeValue : 0;
				that.commandBarG.attr("transform", "translate(0," + (viewport.height + commandDy) + ")");

				that.loaded = true;

				var neww = that.baseWidthPage * that.state.numberOfPageToShow * that.resizeValue;
				var newh = (that.baseHeightPage + that.commandBarG.height + that.thumbnailHeight) * that.resizeValue;
				// calculate the aspect ratio
				var newar = neww / newh;
				// use the same width as specified by the server
				neww = that.sage2_width;
				// adjust the height
				newh = neww / newar;
				// ask for a size update
				that.sendResize(neww, newh);
				return;
			}

			canvas.width  = viewport.width;
			canvas.height = viewport.height;

			// rendering the page
			var renderContext = {
				canvasContext: ctx,
				viewport:      viewport
			};

			page.render(renderContext).then(function(pdf) {
				// Render as a JPEG, 80%
				// var data = canvas.toDataURL("image/jpeg", 0.80).split(',');
				// Render as a PNG
				var data = canvas.toDataURL().split(',');

				var bin  = atob(data[1]);
				var mime = data[0].split(':')[1].split(';')[0];
				var buf  = new ArrayBuffer(bin.length);
				var view = new Uint8Array(buf);
				for (var i = 0; i < view.length; i++) {
					view[i] = bin.charCodeAt(i);
				}
				var blob = new Blob([buf], {type: mime});
				var source = window.URL.createObjectURL(blob);

				var theWidth, theHeight, dx, c;

				if (thumbnail) {

					that.thumbnailsLink[page.pageNumber] = source;

					theWidth  = that.baseWidthPage  * that.TVALUE;
					theHeight = that.baseHeightPage * that.TVALUE;
					dx = (theWidth + that.marginButton * that.TVALUE) * (page.pageNumber - 1);

					c = that.thumbnailsVisualizer.append("image")
						.attr("x", dx)
						.attr("y", 0)
						.attr("width",  theWidth)
						.attr("height", theHeight + 2 * that.marginButton)
						.attr("xlink:href", source);

					c.thumbnail = true;
					c.container = that.thumbnailsVisualizer;
					c.page = page.pageNumber;
					that.interactable.push(c);
					that.thumbnailsViewers.push(c);

				} else {
					if (!that.imagesLink[quality]) {
						that.imagesLink[quality] = [];
					}
					that.imagesLink[quality][page.pageNumber] = source;

					theWidth  = that.baseWidthPage  * quality;
					theHeight = that.baseHeightPage * quality;
					dx = (theWidth + that.displacement) * (page.pageNumber - 1);

					c = that.imageVisualizer.groups[quality].append("image")
						.attr("x", dx)
						.attr("y", 0)
						.attr("width", theWidth)
						.attr("height", theHeight)
						.attr("xlink:href", source);
				}
			});
		});
	},

	changeImageQuality: function(q, previousQ) {
		this.imageVisualizer.groups[previousQ].style("visibility", "hidden");
		if (!this.imageVisualizer.groups[q]) {
			this.imageVisualizer.groups[q] = this.imageVisualizer.append("g").style("visibility", "visible");
		} else {
			this.imageVisualizer.groups[q].style("visibility", "visible");
		}
	},

	resize: function(date) {
		if (!this.loaded) {
			return;
		}

		var r = this.element.clientWidth / this.state.numberOfPageToShow / Math.round(this.baseWidthPage);
		this.resizeValue = r;

		var qualityRequested = Math.ceil(this.resizeValue);
		var previousQualityRequested = Math.ceil(this.previousResizeValue);

		var scale = r / qualityRequested;

		this.translateGroup(this.imageVisualizer, this.state.horizontalOffset, 0, scale);
		this.translateGroup(this.thumbnailsVisualizer, this.thumbnailHorizontalPosition,
			this.baseHeightPage * r, r, this.clickedThumbnail);
		this.translateGroup(this.commandBarG, null, (this.baseHeightPage + this.thumbnailHeight) * r,
			r, this.clickedThumbnail);

		if (this.clickedThumbnail) {
			this.clickedThumbnail = false;
		}

		if (Math.ceil(this.previousResizeValue) != qualityRequested) {
			this.previousResizeValue = r;
			this.changeImageQuality(qualityRequested, previousQualityRequested);
		}

		this.generateMissingPages();

		this.container
			.attr("width",  this.element.clientWidth)
			.attr("height", this.element.clientHeight);
		this.refresh(date);
	},

	translateGroup: function(g, dx, dy, s, animated) {
		var transf = parse_transform(g.attr("transform"));
		var scale  = transf.scale ? parseFloat(transf.scale[0]) : 1;
		dx = (dx == null) ? parseFloat(transf.translate[0]) : dx;
		dy = (dy == null) ? parseFloat(transf.translate[1]) : dy;
		s  = (s  == null) ? scale : s;
		var tDuration = animated ? 200 : 0;
		g.transition().attr("transform",
			"translate(" + dx * this.resizeValue + "," + dy +
			"), scale(" + s + ")").duration(tDuration);
	},

	generateMissingPages: function() {

		var q = Math.ceil(this.resizeValue);

		// generating array of images of current quality, if not available
		if (!this.pageCurrentlyVisible[q]) {
			this.pageCurrentlyVisible[q] = [];
			this.SAGE2Sync(true);
		}
		if (!this.pageCurrentlyGenerated[q]) {
			this.pageCurrentlyGenerated[q] = [];
			this.SAGE2Sync(true);
		}

		// calculate page in view
		var halfRange = Math.floor(this.state.numberOfPageToShow / 2);
		for (var i = this.pageInCenter() - halfRange - 1; i <= this.pageInCenter() + halfRange + 1; i++) {
			if (i > 0 && i <= this.pageDocument && this.pageCurrentlyVisible[q].indexOf(i) === -1) {
				this.pageCurrentlyVisible[q].push(i);
				this.SAGE2Sync(true);
			}
		}

		// generate page not already loaded
		for (var index in this.pageCurrentlyVisible[q]) {
			var pageIndex = this.pageCurrentlyVisible[q][index];
			if (this.pageCurrentlyGenerated[q].indexOf(pageIndex) === -1) {
				this.pageCurrentlyGenerated[q].push(pageIndex);
				this.SAGE2Sync(true);
				this.obtainPageFromPDF(this.solver, pageIndex, this, q);
			}
		}

	},

	leftClickDown: function(x, y, id) {
		// setting the feedback button color
		var pressedColor = "gray";
		var defaultBg    = "lightgray";

		// taking a reference of the main object
		var _this = this;
		// iterating over the model trying to understand if a button was pressed
		for (var i in this.interactable) {
			var item = this.interactable[i];
			var position = {
				x: parseInt(item.attr("x")),
				y: parseInt(item.attr("y")),
				w: parseInt(item.attr("width")),
				h: parseInt(item.attr("height")),
				container: item.container
			};
			// check if the click is within the current button
			if (item.command && within(position, x, y)) {
				// if the button is clickable, generates a color transition feedback
				if (item.command) {
					item.action(_this);
					// feedback
					var oldColor = item.backgroundColor || defaultBg;
					item.transition();
					item.attr("fill", pressedColor).transition().duration(500).attr("fill", oldColor);
				}
				return;
			}

			if (item.thumbnail && within(position, x, y)) {

				if (item.clickReceived) {
					this.doubleLeftClickPosition(x, y, id, item);
					item.clickReceived = null;
					return;
				} else {
					item.clickReceived = true;
					setTimeout(deleteClick, 500, item);
				}

				this.activeTouch[id] = {};
				this.activeTouch[id].lastMousePosition = {x: x, y: y};
				this.activeTouch[id].item = item;
			}

		}

	},

	leftClickMove: function(x, y, id) {
		var position = {
			x: parseInt(this.commandBarBG.attr("x")),
			y: parseInt(this.commandBarBG.attr("y")),
			w: parseInt(this.commandBarBG.attr("width")),
			h: parseInt(this.commandBarBG.attr("height")),
			container: this.commandBarBG.container
		};

		// check if the click is within the current button
		if (this.inBarCommand == null && within(position, x, y)) {
			// Do not move the widget bar at the bottom anymore
			// var center = ((this.widthCommandButton + this.marginButton) *
			// 	(this.commandBarG.node().childNodes.length - 1) / 2) / 2;
			// var iFound = 0;
			// for (var i in this.interactable) {
			// 	var item = this.interactable[i];
			// 	if (item.ico) {
			// 		item.transition().attr("x", x / this.resizeValue +
			// 			(this.widthCommandButton + this.marginButton) * iFound - center).duration(200);
			// 		item.ico.transition().attr("x", x / this.resizeValue +
			// 			(this.widthCommandButton + this.marginButton) * iFound - center).duration(200);
			// 		iFound += 1;
			// 	}
			// }
			this.inBarCommand = true;
		} else if (!within(position, x, y)) {
			this.inBarCommand = null;
		}

		var f = this.activeTouch[id];
		if (f && this.state.showingThumbnails && f.item.thumbnail) {
			var transf = parse_transform(f.item.container.attr("transform"));
			var sx = parseFloat(transf.scale[0]);
			var translate = transf.translate;
			var newX = parseFloat(translate[0]) + x - f.lastMousePosition.x;
			var newY = parseFloat(translate[1]);
			newX /= sx;
			newY /= sx;
			f.lastMousePosition = {x: x, y: y};
			this.thumbnailHorizontalPosition = newX;
			this.thumbnailsVisualizer.attr("transform", "scale(" + sx + "), translate(" + newX + "," + newY + ")");
		}
	},

	leftClickRelease: function(x, y, id) {
		var f = this.activeTouch[id];
		if (f) {
			// empty
		}
		delete this.activeTouch[id];
	},

	doubleLeftClickPosition: function(x, y, id, item) {
		if (this.state.showingThumbnails) {
			this.goToPage(item.page);
		}
	},

	pageInCenter: function() {
		return Math.floor((this.state.horizontalOffset * (-1) * this.resizeValue +
			this.element.clientWidth / 2) / (this.baseWidthPage * this.resizeValue) + 1);
	},

	addPage: function(that) {
		if (that.state.numberOfPageToShow < that.pageDocument) {
			that.modifyState("numberOfPageToShow", that.state.numberOfPageToShow + 1);
			var neww = that.baseWidthPage * that.state.numberOfPageToShow * that.resizeValue;
			var newh = (that.baseHeightPage + that.commandBarG.height + that.thumbnailHeight) * that.resizeValue;
			that.sendResize(neww, newh);
		}
	},

	removePage: function(that) {
		if (that.state.numberOfPageToShow > 1) {
			that.modifyState("numberOfPageToShow", that.state.numberOfPageToShow - 1);
			var neww = that.baseWidthPage * that.state.numberOfPageToShow * that.resizeValue;
			var newh = (that.baseHeightPage + that.commandBarG.height + that.thumbnailHeight) * that.resizeValue;
			that.sendResize(neww, newh);
		}
	},

	/**
	* Callback from right-click menu for adding/removing pages
	*
	* @method pageCallback
	* @param responseObject {Object} contains operation to perform
	*/
	pageCallback: function(responseObject) {
		if (responseObject.operation === 'add') {
			this.addPage(this);
		} else if (responseObject.operation === 'remove') {
			this.removePage(this);
		}
	},

	showThumbnails: function(that) {
		that.modifyState("showingThumbnails", !that.state.showingThumbnails);
		that.thumbnailsVisualizer.style("visibility", that.state.showingThumbnails ? "visible" : "hidden");
		that.clickedThumbnail = true;

		var multiplier = that.state.showingThumbnails ? 0.25 : 0;
		that.thumbnailHeight = that.baseHeightPage * multiplier;

		var neww = that.baseWidthPage * that.state.numberOfPageToShow * that.resizeValue;
		var newh = (that.baseHeightPage + that.commandBarG.height + that.thumbnailHeight) * that.resizeValue;
		that.sendResize(neww, newh);
	},

	scaleThumbnailBar: function() {
		var ty = this.baseHeightPage / this.resizeValue;
		this.thumbnailsVisualizer.attr("transform", "scale(" + this.resizeValue +
			"), translate(" + this.thumbnailHorizontalPosition + "," + ty + ")");
	},

	goToPage: function(page) {
		// var center = (this.baseWidthPage / 2) * (this.state.numberOfPageToShow - 1);
		// var dx = center - (this.baseWidthPage + this.displacement) * (page - 1);
		var dx = -1 * (this.baseWidthPage + this.displacement) * (page - 1);
		this.state.horizontalOffset = dx;
		this.generateMissingPages();
		if (this.state.currentPage !== page) {
			this.modifyState("currentPage", page);
		}
		this.translateGroup(this.imageVisualizer, this.state.horizontalOffset, 0);
		return dx;
	},

	GoToNext: function(that) {
		if (that.state.currentPage === that.pageDocument) {
			return;
		}

		if (that.state.currentPage === that.pageDocument - 1) {
			that.nextButton.ico.attr("xlink:href", iconPath + svgImages[3]);
		}
		that.previousButton.ico.attr("xlink:href", iconPath + svgImages[1]);
		that.goToPage(that.state.currentPage + 1);
		that.refresh();
	},

	GoToPrevious: function(that) {
		if (that.state.currentPage === 1) {
			return;
		}

		if (that.state.currentPage === 2) {
			that.previousButton.ico.attr("xlink:href", iconPath + svgImages[0]);
		}
		that.goToPage(that.state.currentPage - 1);
		that.nextButton.ico.attr("xlink:href", iconPath + svgImages[2]);
		that.refresh();
	},

	GoToFirst: function(that) {
		that.goToPage(1);
		that.previousButton.ico.attr("xlink:href", iconPath + svgImages[0]);
		that.nextButton.ico.attr("xlink:href", iconPath + svgImages[2]);
		that.refresh();
	},

	GoToLast: function(that) {
		that.goToPage(that.pageDocument);
		that.previousButton.ico.attr("xlink:href", iconPath + svgImages[1]);
		that.nextButton.ico.attr("xlink:href", iconPath + svgImages[3]);
		that.refresh();
	},

	createMenuBar: function() {

		if (this.commandBarG) {
			this.commandBarG.selectAll("*").remove();
		}

		this.commandBarG.height = this.baseHeightPage * 0.1;
		this.widthCommandButton = this.commandBarG.height - this.marginButton * 2;

		if (!this.showUI) {
			this.commandBarG.height = 0;
			return;
		}

		// the background
		this.commandBarBG = this.commandBarG.append("rect")
			.attr("x", -3000).attr("y", 0)
			.attr("height", this.commandBarG.height)
			.attr("width", 10000)
			.attr("fill", "#272822");
		this.commandBarBG.container = this.commandBarG;

		// the previous < button
		this.previousButton = this.commandBarG.append("rect")
			.attr("x", 0 + this.marginButton)
			.attr("y", 0 + this.marginButton)
			.attr("width", this.widthCommandButton)
			.attr("height", this.widthCommandButton)
			.attr("fill", "lightgray");
		this.previousButton.ico = this.commandBarG.append("image")
			.attr("x",  0 + this.marginButton)
			.attr("y", 0 + this.marginButton)
			.attr("width", this.widthCommandButton)
			.attr("height", this.widthCommandButton)
			.attr("xlink:href", iconPath + svgImages[0]);
		this.previousButton.command = true;
		this.previousButton.action = this.GoToPrevious;
		this.previousButton.container = this.commandBarG;
		this.interactable.push(this.previousButton);

		// the next > button
		this.nextButton = this.commandBarG.append("rect")
			.attr("x", parseInt(this.previousButton.attr("x")) + this.widthCommandButton + this.marginButton)
			.attr("y", 0 + this.marginButton)
			.attr("width", this.widthCommandButton)
			.attr("height", this.widthCommandButton)
			.attr("fill", "lightgray");
		this.nextButton.ico = this.commandBarG.append("image")
			.attr("x", parseInt(this.previousButton.attr("x")) + this.widthCommandButton + this.marginButton)
			.attr("y", 0 + this.marginButton)
			.attr("width", this.widthCommandButton)
			.attr("height", this.widthCommandButton)
			.attr("xlink:href", iconPath + svgImages[2]);
		this.nextButton.command = true;
		this.nextButton.action = this.GoToNext;
		this.nextButton.container = this.commandBarG;
		this.interactable.push(this.nextButton);

		// the plus button
		this.plusButton = this.commandBarG.append("rect")
			.attr("x", parseInt(this.nextButton.attr("x")) + this.widthCommandButton + this.marginButton)
			.attr("y", 0 + this.marginButton)
			.attr("width", this.widthCommandButton)
			.attr("height", this.widthCommandButton)
			.attr("fill", "lightgray");
		this.plusButton.ico = this.commandBarG.append("image")
			.attr("x", parseInt(this.nextButton.attr("x")) + this.widthCommandButton + this.marginButton)
			.attr("y", 0 + this.marginButton)
			.attr("width", this.widthCommandButton)
			.attr("height", this.widthCommandButton)
			.attr("xlink:href", iconPath + svgImages[4]);
		this.plusButton.command = true;
		this.plusButton.action = this.addPage;
		this.plusButton.container = this.commandBarG;
		this.interactable.push(this.plusButton);

		// the minus button
		this.minusButton = this.commandBarG.append("rect")
			.attr("x", parseInt(this.plusButton.attr("x")) + this.widthCommandButton + this.marginButton)
			.attr("y", 0 + this.marginButton)
			.attr("width", this.widthCommandButton)
			.attr("height", this.widthCommandButton)
			.attr("fill", "lightgray");
		this.minusButton.ico = this.commandBarG.append("image")
			.attr("x", parseInt(this.plusButton.attr("x")) + this.widthCommandButton + this.marginButton)
			.attr("y", 0 + this.marginButton)
			.attr("width", this.widthCommandButton)
			.attr("height", this.widthCommandButton)
			.attr("xlink:href", iconPath + svgImages[5]);
		this.minusButton.command = true;
		this.minusButton.action = this.removePage;
		this.minusButton.container = this.commandBarG;
		this.interactable.push(this.minusButton);

		// the show thumbnails button
		this.thumbnailsButton = this.commandBarG.append("rect")
			.attr("x", parseInt(this.minusButton.attr("x")) + this.widthCommandButton + this.marginButton)
			.attr("y", 0 + this.marginButton)
			.attr("width", this.widthCommandButton)
			.attr("height", this.widthCommandButton)
			.attr("fill", "lightgray");
		this.thumbnailsButton.ico = this.commandBarG.append("image")
			.attr("x", parseInt(this.minusButton.attr("x")) + this.widthCommandButton + this.marginButton)
			.attr("y", 0 + this.marginButton)
			.attr("width", this.widthCommandButton)
			.attr("height", this.widthCommandButton)
			.attr("xlink:href", iconPath + svgImages[6]);
		this.thumbnailsButton.command = true;
		this.thumbnailsButton.action = this.showThumbnails;
		this.thumbnailsButton.container = this.commandBarG;
		this.interactable.push(this.thumbnailsButton);
	},

	load: function(date) {
		// This check is necessary for remote sharing.
		// Activating generateMissingPages() will infinitely loop on first sync.
		if (!this.hadFirstRemoteLoad) {
			this.hadFirstRemoteLoad = true;
			return;
		}
		// Update the current page
		this.goToPage(this.state.currentPage);

		// Adjust the number of pages
		var neww = this.baseWidthPage * this.state.numberOfPageToShow * this.resizeValue;
		var newh = (this.baseHeightPage + this.commandBarG.height + this.thumbnailHeight) * this.resizeValue;
		this.sendResize(neww, newh);
	},

	draw: function(date) {
		// Update the title
		this.changeTitle();
	},

	/**
	* To enable right click context menu support,
	* this function needs to be present with this format.
	*/
	getContextEntries: function() {
		var entries = [];
		var entry;

		entry = {};
		entry.description = "First Page";
		entry.accelerator = "\u2191";     // up arrow
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.parameters.page = "first";
		entries.push(entry);

		entry = {};
		entry.description = "Previous Page";
		entry.accelerator = "\u2190";     // left arrow
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.parameters.page = "previous";
		entries.push(entry);

		entry = {};
		entry.description = "Next Page";
		entry.accelerator = "\u2192";     // right arrow
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.parameters.page = "next";
		entries.push(entry);

		entry = {};
		entry.description = "Last Page";
		entry.accelerator = "\u2193";     // down arrow
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.parameters.page = "last";
		entries.push(entry);

		entry = {};
		entry.description = "Jump To: ";
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.inputField = true;
		entry.inputFieldSize = 3;
		entries.push(entry);

		entry = {};
		entry.description = "Go to page: ";
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.inputField = true;
		entry.inputFieldSize = 3;
		entry.voiceEntryOverload = true; // not visible on UI
		entries.push(entry);

		entry = {};
		entry.description = "Jump to page: ";
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.inputField = true;
		entry.inputFieldSize = 3;
		entry.voiceEntryOverload = true; // not visible on UI
		entries.push(entry);

		entry = {};
		entry.description = "Show page: ";
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.inputField = true;
		entry.inputFieldSize = 3;
		entry.voiceEntryOverload = true; // not visible on UI

		entry.description = "separator";
		entries.push(entry);

		entry = {};
		entry.description = "Show Extra Page";
		entry.accelerator = "+";
		entry.callback = "pageCallback";
		entry.parameters = {operation: 'add'};
		entries.push(entry);

		entry = {};
		entry.description = "Remove Extra Page";
		entry.accelerator = "-";
		entry.callback = "pageCallback";
		entry.parameters = {operation: 'remove'};
		entries.push(entry);

		// Special callback: dowload the file
		entries.push({
			description: "Download PDF",
			callback: "SAGE2_download",
			parameters: {
				url: this.state.doc_url
			}
		});
		entries.push({
			description: "Copy URL",
			callback: "SAGE2_copyURL",
			parameters: {
				url: this.state.doc_url
			}
		});

		return entries;
	},

	/**
	* Support function to allow page changing through right mouse context menu.
	*
	* @method changeThePage
	* @param responseObject {Object} contains response from entry selection
	*/
	changeThePage: function(responseObject) {
		var page = responseObject.page;
		// if the user did the input option
		if (responseObject.clientInput) {
			page = parseInt(responseObject.clientInput);
			if (page > 0 && page <= this.pageDocument) {
				if (page === 1) {
					this.GoToFirst(this);
				} else if (page === this.pageDocument) {
					this.GoToLast(this);
				} else {
					this.previousButton.ico.attr("xlink:href", iconPath + svgImages[1]);
					this.nextButton.ico.attr("xlink:href", iconPath + svgImages[2]);
					this.goToPage(page);
				}
			}
		} else {
			// else check for these word options
			if (page === "first") {
				this.GoToFirst(this);
			} else if (page === "previous") {
				if (this.pageInCenter() === 1) {
					return;
				}
				this.GoToPrevious(this);
			} else if (page === "next") {
				if (this.pageInCenter() === this.pageDocument) {
					return;
				}
				this.GoToNext(this);
			} else if (page === "last") {
				this.GoToLast(this);
			}
		}
		// This needs to be a new date for the extra function.
		this.refresh(new Date(responseObject.serverDate));
	},

	/**
	* Handles event processing, arrow keys to navigate, and r to redraw
	*
	* @method event
	* @param eventType {String} the type of event
	* @param position {Object} contains the x and y positions of the event
	* @param user_id {Object} data about the user who triggered the event
	* @param data {Object} object containing extra data about the event,
	* @param date {Date} current time from the server
	*/
	event: function(eventType, position, user, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			if (this.showUI) {
				this.leftClickDown(position.x, position.y, user.id);
				this.refresh(date);
			}
		} else if (eventType === "pointerMove") {
			if (this.showUI) {
				this.leftClickMove(position.x, position.y, user.id);
				this.refresh(date);
			}
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			if (this.showUI) {
				this.leftClickRelease(position.x, position.y, user.id);
				this.refresh(date);
			}
		}

		if (eventType === "specialKey") {
			var newOffset, center, minOffset, step;

			if (data.code === 39 && data.state === "down") {
				// Right Arrow

				if (data.status.SHIFT) {
					// calculate a offset amount
					step = (this.baseWidthPage + this.displacement) / 10;
					// apply offset
					newOffset = this.state.horizontalOffset - step;
					center = (this.baseWidthPage / 2) * (this.state.numberOfPageToShow - 1);
					minOffset = center - (this.baseWidthPage + this.displacement) * (this.pageDocument - 1);
					if (newOffset < minOffset) {
						newOffset = minOffset;
					}
					this.modifyState("horizontalOffset", newOffset);
					this.translateGroup(this.imageVisualizer, this.state.horizontalOffset, 0);
					this.generateMissingPages();
				} else {
					this.GoToNext(this);
				}
				this.refresh(date);
			} else if (data.code === 37 && data.state === "down") {
				// Left Arrow

				if (data.status.SHIFT) {
					// calculate a offset amount
					step = (this.baseWidthPage + this.displacement) / 10;
					// apply offset
					newOffset = this.state.horizontalOffset + step;
					center = (this.baseWidthPage / 2) * (this.state.numberOfPageToShow - 1);
					if (newOffset > center) {
						newOffset = center;
					}
					this.modifyState("horizontalOffset", newOffset);
					this.translateGroup(this.imageVisualizer, this.state.horizontalOffset, 0);
					this.generateMissingPages();
				} else {
					this.GoToPrevious(this);
				}
				this.refresh(date);
			} else if (data.code === 38 && data.state === "down") {
				// Up Arrow
				this.GoToFirst(this);
				this.refresh(date);
			} else if (data.code === 40 && data.state === "down") {
				// Down Arrow
				this.GoToLast(this);
				this.refresh(date);
			}
		}

		// Keyboard:
		//   spacebar - next
		//   1/f - first
		//   0/l - last
		if (eventType === "keyboard") {
			if (data.character === " ") {
				this.GoToNext(this);
			} else if (data.character === "1" || data.character === "f") {
				this.GoToFirst(this);
			} else if (data.character === "0" || data.character === "l") {
				this.GoToLast(this);
			} else if (data.character === "+") {
				this.addPage(this);
			} else if (data.character === "-") {
				this.removePage(this);
			}
		}

		if (eventType === "widgetEvent") {
			switch (data.identifier) {
				case "LastPage":
					this.GoToLast(this);
					break;
				case "FirstPage":
					this.GoToFirst(this);
					break;
				case "PreviousPage":
					this.GoToPrevious(this);
					break;
				case "NextPage":
					this.GoToNext(this);
					break;
				case "Page":
					switch (data.action) {
						case "sliderRelease":
							this.goToPage(this.state.currentPage);
							break;
						default:
							return;
					}
					break;
				default:
					return;
			}
			this.refresh(date);
		}

	}
});


// Extra functions

function deleteClick(item) {
	item.clickReceived = null;
}

function parse_transform(a) {
	var b = {};
	for (var i in a = a.match(/(\w+)\(([^,)]+),?([^)]+)?\)/gi)) {
		/* eslint-disable */
		var c = a[i].match(/[\w\.\-]+/g);
		/* eslint-enable */
		b[c.shift()] = c;
	}
	return b;
}

function within(element, x, y) {
	var transf = parse_transform(element.container.attr("transform"));
	var translate = transf.translate;
	var s = transf.scale ? parseFloat(transf.scale[0]) : 1;

	var mX = (x - parseFloat(translate[0]));
	var mY = (y - parseFloat(translate[1]));

	mX /= s;
	mY /= s;

	return (mY >= element.y &&
			mY <= (element.y + element.h) &&
			mX >= element.x &&
			mX <= (element.x + element.w));
}
