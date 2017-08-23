// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

//
// SAGE2 application: jupyter
// by: Andrea Rottigni <arotti2@uic.edu>
//

/* global d3 */

"use strict";

/**
 * @module client
 * @submodule jupyter
 */

var jupyter = SAGE2_App.extend({
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);
		// Set the background to black
		this.element.style.backgroundColor = 'black';
		this.createPage();

		// move and resize callbacks
		this.resizeEvents = "continuous";

		if (this.state.imgDict === undefined) {
			this.state.imgDict = {};
		}
		if (this.state.mainImgs === undefined) {
			this.state.mainImgs = {};
		}
		if (this.state.page === undefined) {
			this.state.page = 1;
		}
		// this.SAGE2Sync(true);
		this.count = 0;
		this.thumbnailSize = parseFloat(this.element.style.width);
		this.visibleThumbnails = Math.ceil(parseFloat(this.element.style.height) / this.thumbnailSize);
		this.dragging = false;
		this.createButtons();
		this.prevMouseX = 0;
		this.prevMouseY = 0;
		this.uploadingImage = false;
		this.oldWidth = parseFloat(this.element.style.width);
		this.oldHeight = parseFloat(this.element.style.height);

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;
	},

	createButtons: function() {
		this.controls.addButton({type: "next", identifier: "NextButton", position: 7});
		this.controls.addButton({type: "prev", identifier: "PrevButton", position: 3});
	},

	createPage: function() {
		this.thumbNailDiv = d3.select(this.element)
			.append("div")
			.attr("id", "thumbnail")
			.style("width", this.element.style.width)
			.style("height", this.element.style.height)
			.style("position", "absolute");
		this.imagesDiv = d3.select(this.element)
			.append("div")
			.attr("id", "images")
			.style("left", this.element.width)
			.style("position", "absolute");
	},

	load: function(date) {
		console.log('jupyter> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
		console.log('jupyter> Draw with state value', this.state.value);
	},

	isIvisible: function(position) {
		return position < this.visibleThumbnails * this.state.page &&
			position >= (this.visibleThumbnails * (this.state.page - 1)) - 1;
	},

	resizeThumbnails: function() {
		var height = this.thumbnailSize;
		this.visibleThumbnails = Math.ceil(parseFloat(this.element.style.height) / height);
		for (var key in this.state.imgDict) {
			var currentImg = this.state.imgDict[key];
			if (this.isIvisible(currentImg.position)) {
				var marginTop = (currentImg.position - ((this.visibleThumbnails - 1) * (this.state.page - 1))) * height;
				var thumb = d3.select("#" + "thumb" + key);
				if (thumb.empty()) {
					thumb = this.thumbNailDiv.append("div")
						.style("width", "100%")
						.style("height", height + "px")
						.style("position", "absolute")
						.style("top", marginTop + "px")
						.attr("id", "thumb" + key);
					thumb.append("img")
						.attr("src", currentImg.src)
						.style("background-color", "white")
						.style("height", "100%")
						.style("width", "100%");
				}
			} else {
				d3.select("#" + "thumb" + key).remove();
			}
		}

	},

	resizeImages: function() {
		var deltax = parseFloat(this.element.style.width) - this.oldWidth;
		var deltay = parseFloat(this.element.style.height) - this.oldHeight;
		this.oldWidth = parseFloat(this.element.style.width);
		this.oldHeight = parseFloat(this.element.style.height);
		var size = Object.keys(this.state.mainImgs).length;
		if (size > 0) {
			deltax = deltax / size;
			// var pre = this.thumbnailSize;
			for (var key in this.state.mainImgs) {
				var div = d3.select("#main" + key);
				var img = div.select("img");
				var width = parseFloat(img.style("width")) + deltax;
				var height = parseFloat(img.style("height")) + deltay;
				var left = parseFloat(div.style("left")) + deltax * this.state.mainImgs[key].position;
				img.style("width", width + "px");
				img.style("height", height + "px");
				div.style("left", left + "px");
			}
		}
	},

	resize: function(date) {
		this.refresh(date);
		this.resizeThumbnails();
		if (this.uploadingImage) {
			this.uploadingImage = false;
			this.oldWidth = parseFloat(this.element.style.width);
			this.oldHeight = parseFloat(this.element.style.height);
		} else {
			this.resizeImages();
		}
	},


	handleUpdate: function(data) {
		var position = this.count;
		if (data.cellId in this.state.imgDict) {
			position = this.state.imgDict[data.cellId].position;
		} else {
			position = this.count;
			this.count += 1;
		}
		this.state.imgDict[data.cellId] = {src: data.src, position: position, mainPosition: null, clicked: false};
		// this.SAGE2Sync(true);
		this.refreshImage(data.cellId, position);
		this.refreshMainImage(data.cellId, data.src);
	},

	refreshMainImage: function(cellId, src) {
		var mainImage =  d3.select("#" + "main" + cellId).select("img");
		if (!mainImage.empty()) {
			mainImage.attr("src", src);
		}
	},

	refreshImage: function(cellId, position) {
		var thumbnail = d3.select("#" + "thumb" + cellId).select("img");
		if (thumbnail.empty() && this.isIvisible(position)) {

			thumbnail = this.thumbNailDiv.append("div")
				.attr("id", "thumb" + cellId)
				.style("width", "100%");
			var height = parseFloat(thumbnail.style("width"));
			var marginTop = (position - ((this.visibleThumbnails - 1) * (this.state.page - 1))) * height;
			thumbnail = thumbnail.style("height", height + "px")
				.style("top", marginTop + "px")
				.style("position", "absolute")
				.style("bottom", "0px")
				.append("img")
				.style("background-color", "white")
				.style("height", "100%")
				.style("width", "100%");
		}
		thumbnail.attr("src", this.state.imgDict[cellId].src);
	},



	showImage: function(image, key) {
		var size = Object.keys(this.state.mainImgs).length;
		if (!(key in this.state.mainImgs)) {
			this.state.mainImgs[key] = {src: image, position: size};
			var space = 15;
			var img = this.imagesDiv.append("div")
				.attr("id", "main" + key)
				.style("position", "absolute")
				.style("left", parseFloat(this.element.style.width) + space + "px")
				.append("img")
				.attr("src", image.src)
				.style("background-color", "white")
				.style("position", "absolute");
			this.uploadingImage = true;
			var height = parseFloat(this.element.style.height);
			if (parseFloat(this.element.style.height) < parseFloat(img.style("height"))) {
				height = parseFloat(img.style("height"));
			}
			this.sendResize((parseFloat(img.style("width")) + parseFloat(this.element.style.width) + space), height);
		}
	},

	setDraggableObject: function(mouseX, mouseY) {
		// var windowHeight = parseFloat(this.element.style.height);
		var height = this.thumbnailSize;
		for (var key in this.state.imgDict) {
			var currentImg = this.state.imgDict[key];
			var startYPos = currentImg.position * height;
			var startXPos = 0;
			var width = height;
			if (this.isIvisible(currentImg.position)) {
				// console.log("visible");
				// var tmpPos = currentImg.position % this.visibleThumbnails;
				if (startXPos < mouseX && mouseX < startXPos + width && startYPos < mouseY && mouseY < startYPos + height) {
					if (currentImg.clicked) {
						this.showImage(currentImg, key);
					} else {
						currentImg.clicked = true;
						setTimeout(function() {
							currentImg.clicked = false;
						}, 500);
					}
					this.draggedObject = d3.select("#" + "thumb" + key);
					return;
				}
			}
		}
	},

	moveObject: function(mouseX, mouseY) {
		var xDiff = mouseX - this.prevMouseX;
		var yDiff = mouseY - this.prevMouseY;
		var oldX = parseFloat(this.draggedObject.style("left"));
		var oldY = parseFloat(this.draggedObject.style("bottom"));
		this.draggedObject.style("left", oldX + xDiff + "px");
		this.draggedObject.style("bottom", oldY - yDiff + "px");
		this.prevMouseX = mouseX;
		this.prevMouseY = mouseY;
	},

	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			this.dragging = true;
			this.prevMouseX = position.x;
			this.prevMouseY = position.y;
			this.setDraggableObject(position.x, position.y);
		} else if (eventType === "pointerMove") {
			if (this.dragging && this.draggedObject !== null) {
				this.moveObject(position.x, position.y);
			}
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			this.dragging = false;
			this.draggedObject = null;
		} else if (eventType === "pointerScroll") {
			// Scroll events for zoom
		} else if (eventType === "widgetEvent") {
			if (data.identifier === "NextButton" && data.action === "buttonPress") {
				this.state.page += 1;
				this.resizeThumbnails();
			} else if (data.identifier === "PrevButton") {
				if (this.state.page > 0) {
					this.state.page -= 1;
					this.resizeThumbnails();
				}
			}
		} else if (eventType === "imageUpload") {
			this.handleUpdate(data);
		} else if (eventType === "keyboard") {
			if (data.character === "m") {
				this.refresh(date);
			}
		} else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") { // left
				this.refresh(date);
			} else if (data.code === 38 && data.state === "down") { // up
				this.refresh(date);
			} else if (data.code === 39 && data.state === "down") { // right
				this.refresh(date);
			} else if (data.code === 40 && data.state === "down") { // down
				this.refresh(date);
			}
		}

	}
});
