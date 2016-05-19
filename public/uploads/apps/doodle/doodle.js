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
			this.changeTitleToOriginalCreatorAndTime({creationTime:data.state.fileName});
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

		this.imageToDraw.src = initialImage;
		this.ctx.drawImage(this.imageToDraw, 0, 0);
	},

	/**
	Returns current canvas as image encode.
	*/
	getCanvasAsImage: function () {
		this.saveCurrentWork();
		return this.drawCanvas.toDataURL();
	},

	/**
	Adds a clientId as a editer.
	Everyone in the array should be able to update this app correctly and receive each other's updates.
	*/
	addClientIdAsEditor: function(responseObject) {
		// add the client who responded to the list of editors.
		this.arrayOfEditors.push(responseObject.clientId);
		// get canvas as image.
		var imageString = this.getCanvasAsImage();

		// prevent multiple sends if there are more than 1 display.
		if (isMaster) {
			// send back to client the OK to start editing.
			var dataForClient = {};
			dataForClient.clientDest  = responseObject.clientId;
			dataForClient.canvasImage = imageString;
			dataForClient.func        = 'uiDrawSetCurrentStateAndShow';
			dataForClient.appId       = this.id;
			dataForClient.type        = 'sendDataToClient';
			wsio.emit('csdMessage', dataForClient);
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
			dataForClient.func       = 'uiDrawMakeLine';
			dataForClient.appId      = this.id;
			dataForClient.type       = 'sendDataToClient';
			for (var i = 0; i < this.arrayOfEditors.length; i++) {
				dataForClient.clientDest = this.arrayOfEditors[i];
				wsio.emit('csdMessage', dataForClient);
			}
		}
	},

	saveCurrentWork: function() {
		// Before saving make sure to grab a snapshot of current canvas.
		this.state.imageSnapshot = this.drawCanvas.toDataURL();
		this.SAGE2UpdateAppOptionsFromState();
		this.SAGE2Sync(true);
		// Tell server to save the file
		if (this.state.creationTime !== null && this.state.creationTime !== undefined) {
			var fileData = {};
			fileData.type = "saveDataOnServer";
			fileData.fileType = "doodle"; // Extension
			fileData.fileName = this.state.creationTime + ".doodle"; // Full name w/ extension
			// What to save in the file
			fileData.fileContent = this.state.imageSnapshot;
			wsio.emit("csdMessage", fileData);
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
			this.updateTitle(this.state.creationTime);
			this.state.originalCreator = responseObject.clientName;
		}
		// if loaded will include the creationTime
		if (responseObject.creationTime !== undefined && responseObject.creationTime !== null) {
			this.state.creationTime = responseObject.creationTime;
			this.updateTitle(responseObject.creationTime);
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
			var data = {};
			data.type    = "launchAppWithValues";
			data.appName = "doodle";
			data.func    = "initializationThroughDuplicate";
			data.xLaunch    = this.sage2_x + 100;
			data.yLaunch    = this.sage2_y;
			data.params  =  {};
			data.params.clientName    = responseObject.clientName;
			data.params.imageSnapshot = this.getCanvasAsImage();
			wsio.emit("csdMessage", data);
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
