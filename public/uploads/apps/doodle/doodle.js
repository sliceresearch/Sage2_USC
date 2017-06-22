// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2016

"use strict";

var doodle = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.element.id = "div" + data.id;

		// force this div to have specified width and height
		// var workingDiv = this.element;
		// workingDiv.width  = this.element.clientWidth  + "px";
		// workingDiv.height = this.element.clientHeight + "px";

		// use up the entire amount such that a scaling will occur when the app is increased / decreased in size.
		this.drawCanvas = document.createElement('canvas');
		this.drawCanvas.id           = this.element.id + "DrawCanvas";
		this.drawCanvas.width        = data.width;
		this.drawCanvas.height       = data.height;
		this.drawCanvas.style.width  = "100%";
		this.drawCanvas.style.height = "100%";
		this.element.appendChild(this.drawCanvas);
		this.ctx = this.drawCanvas.getContext("2d");
		this.ctx.fillStyle = "#FFFFFF";
		this.ctx.fillRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
		this.ctx.fillStyle = "#000000";

		// tracks who needs to receive updates for draw commands.
		this.arrayOfEditors = [];
		// used for initial state sending of drawing.
		this.imageToDraw = new Image();

		// If this was restored from a session, will have a state.imageSnapshot value.
		if (this.state.imageSnapshot !== undefined && this.state.imageSnapshot.length > 0) {
			this.setInitialCanvas(this.state.imageSnapshot);
		}
		this.changeTitleToOriginalCreatorAndTime(this.state);

		// If there are file contents, use the passed file values. It will overwrite the existing file.
		if (data.state.contentsOfDoodleFile) {
			this.changeTitleToOriginalCreatorAndTime({creationTime: data.state.fileName});
			this.setInitialCanvas(data.state.contentsOfDoodleFile);
		}
	},

	/**
	0: message
	1: clientId
	*/
	setInitialCanvas: function(initialImage) {
		if (initialImage === null || initialImage === undefined) {
			return;
		}
		var _this = this;
		this.imageToDraw.onload = function() {
			_this.drawCanvas.width = _this.imageToDraw.width;
			_this.drawCanvas.height = _this.imageToDraw.height;
			_this.ctx.drawImage(_this.imageToDraw, 0, 0);

			/*
			Resize app based on image size.
			NOTE: Known bug: if the canvas is set based upon an image, the localhost may error if the display client is on another computer.
			To avoid, have all display clients on one computer or use the actual hostname rather than localhost.
			*/
			_this.sendResize(_this.imageToDraw.naturalWidth, _this.imageToDraw.naturalHeight);
		};
		this.imageToDraw.src = initialImage;
		// this.fitImageToAppSize();

	},

	/*
	Since the app has a width and height, need to specify canvas stretch based upon change.
	Ratio is width / height.
	As width increases, the ratio increases.
	As height increases, the ratio decreases.
	If the app ratio is larger than the image ratio, the app has more width:height.
	Therefore the image should be limited by height.
	Else, the app ratio is smaller, meaning the app has less width:height.
	Therefore the image should be limited by width.

	Currently unused, and should be removed eventually after the autosizing based off of imagesize is implemented and checked.
	*/
	fitImageToAppSize: function() {
		var divWidth      = parseInt(this.element.style.width);
		var divHeight     = parseInt(this.element.style.height);
		var appRatio = divWidth / divHeight;
		var imageRatio      = this.drawCanvas.width / this.drawCanvas.height;
		if (appRatio > imageRatio) {
			this.drawCanvas.style.width  = "";
			this.drawCanvas.style.height = "100%";
		} else {
			this.drawCanvas.style.width  = "100%";
			this.drawCanvas.style.height = "";
		}
	},

	/**
	Returns current canvas as image encode.
	*/
	getCanvasAsImage: function () {
		this.saveCurrentWork();
		return this.drawCanvas.toDataURL();
	},

	/**
	 * Adds a clientId as an editer. Activates after launch or context menu edit.
	 * Everyone in the array should be able to update this app correctly and receive each other's updates.
	 *
	 * @method addClientIdAsEditor
	 * @param {Object} responseObject - Should contain the following.
	 * @param {Object} responseObject.clientId - Unique id of client given by server.
	 * @param {Object} responseObject.clientName - User input name of pointer.
	*/
	addClientIdAsEditor: function(responseObject) {
		// prevent multiple sends if there are more than 1 display.
		if (isMaster) {
			// add the client who responded to the list of editors.
			this.arrayOfEditors.push(responseObject.clientId);
			// get canvas as image.
			var imageString = this.getCanvasAsImage();

			// send back to client the OK to start editing.
			var dataForClient = {};
			dataForClient.canvasImage = imageString;
			dataForClient.imageWidth  = this.drawCanvas.width;
			dataForClient.imageHeight = this.drawCanvas.height;
			// sendDataToClient: function(clientDest, func, paramObj) appId is automatically added to param object
			this.sendDataToClient(responseObject.clientId, "uiDrawSetCurrentStateAndShow", dataForClient);
		}
		this.changeTitleToOriginalCreatorAndTime(responseObject);
	},

	/**
	Note: param is actually an array.
	*/
	removeClientIdAsEditor: function(clientId) {
		for (var i = 0; i < this.arrayOfEditors.length; i++) {
			if (this.arrayOfEditors[i] == clientId[0]) {
				this.arrayOfEditors.splice(i, 1);
				i--;
			}
		}
		this.saveCurrentWork();
	},

	/**
	Update the canvas with a line stroke.

	Currently lineData
	0: 	xDest
	1	yDest
	2	xPrev
	3	yPrev

	4 	lineWidth
	5 	fillStyle
	6 	strokeStyle

	7: 	uiClient
	*/
	drawLine: function(lineData) {
		var lineWidth = lineData[4];
		this.ctx.fillStyle   = lineData[5];
		this.ctx.strokeStyle = lineData[6];
		// if the line width is greater than 1. At 1 the fill + circle border will expand beyond the line causing bumps in the line.
		if (lineWidth > 2) {
			this.ctx.lineWidth = 1;
			this.ctx.beginPath();
			this.ctx.arc(lineData[2], lineData[3], lineWidth / 2, 0, Math.PI * 2, false);
			this.ctx.fill();
		}
		this.ctx.beginPath();
		this.ctx.lineWidth = lineWidth;
		this.ctx.moveTo(lineData[2], lineData[3]);
		this.ctx.lineTo(lineData[0], lineData[1]);
		this.ctx.stroke();

		if (isMaster) {
			var dataForClient = {};
			dataForClient.clientDest = lineData[7];
			dataForClient.params     = lineData;
			for (var i = 0; i < this.arrayOfEditors.length; i++) {
				dataForClient.clientDest = this.arrayOfEditors[i];
				// clientDest, function, param object for function. appId is automatically added.
				this.sendDataToClient(this.arrayOfEditors[i], "uiDrawMakeLine", dataForClient);
			}
		}
	},

	saveCurrentWork: function() {
		// Before saving make sure to grab a snapshot of current canvas.
		this.state.imageSnapshot = this.drawCanvas.toDataURL();
		this.SAGE2UpdateAppOptionsFromState();
		this.SAGE2Sync(true);
		// Tell server to save the file
		if (isMaster && this.state.creationTime !== null && this.state.creationTime !== undefined) {
			var fileData = {};
			fileData.fileType = "doodle"; // Extension
			fileData.fileName = this.state.creationTime + ".doodle"; // Full name w/ extension
			// What to save in the file
			fileData.fileContent = this.state.imageSnapshot;
			wsio.emit("saveDataOnServer", fileData);
		}
	},

	/**
	Will be called from addClientIdAsEditor or load.
	When called from addClientIdAsEditor it will get passsed a parameter, responseObject.
	From load, the responseObject will contain
	*/
	changeTitleToOriginalCreatorAndTime: function(responseObject) {
		// if the creationTime has not been set, then fill it out.
		if (this.state.creationTime === null
			&& responseObject.serverDate !== undefined
			&& responseObject.serverDate !== null) {
			this.state.creationTime = new Date(responseObject.serverDate);
			// build the title string.
			var titleString = responseObject.clientName + "-DO-" + this.state.creationTime.getFullYear();
			if (this.state.creationTime.getMonth() < 9) {
				titleString += "0";
			}
			titleString += (this.state.creationTime.getMonth() + 1) + ""; // month +1 because starts at 0
			if (this.state.creationTime.getDate() < 10) {
				titleString += "0";
			}
			titleString += this.state.creationTime.getDate() + "-";
			if (this.state.creationTime.getHours() < 10) {
				titleString += "0";
			}
			titleString += this.state.creationTime.getHours();
			if (this.state.creationTime.getMinutes() < 10) {
				titleString += "0";
			}
			titleString += this.state.creationTime.getMinutes();
			if (this.state.creationTime.getSeconds() < 10) {
				titleString += "0";
			}
			titleString += this.state.creationTime.getSeconds();
			if (this.state.creationTime.getMilliseconds() < 10) {
				titleString += "0";
			}
			if (this.state.creationTime.getMilliseconds() < 100) {
				titleString += "0";
			}
			titleString += this.state.creationTime.getMilliseconds();
			// store it for later and update the tile.
			this.state.creationTime = titleString;
			this.state.originalCreator = responseObject.clientName;
			this.formatAndSetTitle(this.state.creationTime);
		}
		// if loaded will include the creationTime
		if (responseObject.creationTime !== undefined && responseObject.creationTime !== null) {
			this.state.creationTime = responseObject.creationTime;
			this.formatAndSetTitle(this.state.creationTime);
		}
	},

	formatAndSetTitle: function(wholeName) {
		// Breaking apart whole name and using moment.js to make easier to read.
		var parts  = wholeName.split("-"); // 0 name - 1 qn - 2 YYYYMMDD - 3 HHMMSSmmm
		if (parts.length === 1) {
			// If loading lastDoodle, just use that name
			this.updateTitle(wholeName);
		} else {
			// Otherwise, decode filename into author and date
			var author = parts[0];
			var month  = parseInt(parts[2].substring(4, 6)); // YYYY[MM]
			var day    = parseInt(parts[2].substring(6, 8)); // YYYYMM[DD]
			var hour   = parseInt(parts[3].substring(0, 2)); // [HH]
			var min    = parseInt(parts[3].substring(2, 4)); // HH[MM]
			// Moment conversion
			var momentTime = {
				month: month,
				day: day,
				hour: hour,
				minute: min
			};
			momentTime = moment(momentTime);
			// If the author is supposed to be Anonymouse, then omit author inclusion and marker.
			if (author === "Anonymous") {
				this.updateTitle(momentTime.format("MMM Do, hh:mm A"));
			} else { // Otherwise have the name followed by @
				this.updateTitle(author + " @ " + momentTime.format("MMM Do, hh:mm A"));
			}
		}
	},

	load: function(date) {
		this.setInitialCanvas(this.state.imageSnapshot);
		this.changeTitleToOriginalCreatorAndTime({creationTime: this.state.creationTime});
	},

	draw: function(date) {
		// left intentionally blank
	},

	resize: function(date) {
		// this.fitImageToAppSize();
		// var workingDiv = document.getElementById(this.element.id);
		// workingDiv.width = this.element.clientWidth + "px";
		// workingDiv.height = this.element.clientHeight + "px";
	},

	initializationThroughDuplicate: function(responseObject) {
		this.setInitialCanvas(responseObject.imageSnapshot);
		responseObject.creationTime = null;
		this.changeTitleToOriginalCreatorAndTime(responseObject);
	},

	duplicate: function (responseObject) {
		if (isMaster) {
			// function(appName, x, y, params, funcToPassParams) {
			this.launchAppWithValues("doodle", {
				clientName: responseObject.clientName,
				imageSnapshot: this.getCanvasAsImage()
			}, this.sage2_x + 100, this.sage2_y, "initializationThroughDuplicate");
		}
	},

	/**
	* To enable right click context menu support this function needs to be present.
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

		entry = {};
		entry.description = "Duplicate";
		entry.callback    = "duplicate";
		entry.parameters  = {};
		entries.push(entry);

		entry = {};
		entry.description = "Edit";
		entry.callback    = "addClientIdAsEditor";
		entry.parameters  = {};
		entries.push(entry);

		return entries;
	},

	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
	},

	quit: function() {
		this.saveCurrentWork();
	}

});
