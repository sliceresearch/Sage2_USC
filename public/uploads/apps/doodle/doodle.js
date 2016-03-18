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

var doodle = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.element.id = "div" + data.id;
		this.appIdRef 	= data.id;

		//force this div to have specified width and height
		var workingDiv = document.getElementById( this.element.id );
			workingDiv.width = this.element.clientWidth + "px";
			workingDiv.height = this.element.clientHeight + "px";

		//use up the entire amount such that a scaling will occur when the app is increased / decreased in size.
		var drawCanvas = document.createElement('canvas');
			drawCanvas.id 			= this.element.id + "DrawCanvas";
			drawCanvas.width 		= 500;
			drawCanvas.height 		= 500;
			drawCanvas.style.width 	= "100%";
			drawCanvas.style.height = "100%";
		workingDiv.appendChild( drawCanvas );
		var ctx = drawCanvas.getContext("2d");
		ctx.fillStyle = "#FFFFFF";
		ctx.fillRect( 0, 0, drawCanvas.width, drawCanvas.height );
		ctx.fillStyle = "#000000";

		this.arrayOfEditors = [];




		//erase me after code update
		this.imageToDraw = new Image();



	},

	/**
	0: message
	1: clientId
	*/
	setCanvas: function(msgParams) {
		if( msgParams[0] === null || msgParams[0] === undefined ) { return; }

		this.imageToDraw.src 		= msgParams[0];
		var workingDiv 	= document.getElementById( this.element.id + "DrawCanvas");
		var ctx 		= workingDiv.getContext('2d');

		ctx.drawImage( this.imageToDraw, 0, 0 );

		ctx.font = "20px";
		ctx.fillText( msgParams[1], 0, 0);


		// workingDiv.innerHTML = msgParams[1];
		// workingDiv.innerHTML += ":<br>";
		// workingDiv.innerHTML += msgParams[0];
	},

	/**
	Returns current canvas as image encode.
	*/
	getCanvasAsImage: function () {
		return document.getElementById( this.element.id + "DrawCanvas" ).toDataURL();
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
		if(isMaster) {
			// send back to client the OK to start editing.
			var dataForClient = {};
			dataForClient.clientDest	= responseObject.clientId;
			dataForClient.canvasImage 	= imageString;
			dataForClient.func 			= 'uiDrawSetCurrentStateAndShow';
			dataForClient.appId 		= this.appIdRef;
			dataForClient.type 			= 'sendDataToClient';
			wsio.emit('csdMessage', dataForClient);
		}
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
		var workingDiv  = document.getElementById( this.element.id + "DrawCanvas");
		var ctx 		= workingDiv.getContext('2d');
		var lineWidth 	= lineData[4];
		ctx.fillStyle	= lineData[5];
		ctx.strokeStyle	= lineData[6];
		// if the line width is greater than 1. At 1 the fill + circle border will expand beyond the line causing bumps in the line.
		if(lineWidth > 2) {
			ctx.lineWidth 	= 1;
			ctx.beginPath();
			ctx.arc( lineData[2], lineData[3], lineWidth/2, 0, Math.PI * 2, false);
			ctx.fill();
		}
		ctx.beginPath();
		ctx.lineWidth = lineWidth;
		ctx.moveTo( lineData[2], lineData[3] );
		ctx.lineTo( lineData[0], lineData[1]);
		ctx.stroke();

		if(isMaster) {
			var dataForClient = {};
				dataForClient.clientDest	= lineData[7];
				dataForClient.params 		= lineData;
				dataForClient.func 			= 'uiDrawMakeLine';
				dataForClient.appId 		= this.appIdRef;
				dataForClient.type 			= 'sendDataToClient';
			for(var i = 0; i < this.arrayOfEditors.length; i++) {
				dataForClient.clientDest 	= this.arrayOfEditors[i];
				wsio.emit( 'csdMessage', dataForClient );
			}
		}
	},

	load: function(date) {
	},

	draw: function(date) {
	},

	resize: function(date) {
		var workingDiv = document.getElementById( this.element.id );
			workingDiv.width = this.element.clientWidth + "px";
			workingDiv.height = this.element.clientHeight + "px";
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
		entry.description = "Edit";
		entry.callback = "addClientIdAsEditor";
		entry.parameters = {};
		entries.push(entry);

		return entries;
	},

	event: function(eventType, position, user_id, data, date) {

	},

	quit: function() {
		// no additional calls needed.
	}

});
