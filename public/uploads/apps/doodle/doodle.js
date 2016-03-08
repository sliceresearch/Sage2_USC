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



		var workingDiv = document.getElementById( this.element.id );
			workingDiv.width = this.element.clientWidth + "px";
			workingDiv.height = this.element.clientHeight + "px";

		var drawCanvas = document.createElement('canvas');
			drawCanvas.id 			= this.element.id + "DrawCanvas";
			drawCanvas.width 		= 500;
			drawCanvas.height 		= 500;
			drawCanvas.style.width 	= "100%";
			drawCanvas.style.height = "100%";
		workingDiv.appendChild( drawCanvas );

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

	load: function(date) {
	},

	draw: function(date) {
	},

	resize: function(date) {
		var workingDiv = document.getElementById( this.element.id );
			workingDiv.width = this.element.clientWidth + "px";
			workingDiv.height = this.element.clientHeight + "px";
	},

	event: function(eventType, position, user_id, data, date) {

	},

	quit: function() {
		// no additional calls needed.
	}

});
