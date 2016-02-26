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

var aColorSlave = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.element.id = "div" + data.id;
		this.appIdRef = data.id;

		this.fillWithHtml();

		//get color
		wsio.emit('csdMessage',
			{type: "getValue", nameOfValue: "color" , app: this.appIdRef , func: "setColor"} );
		//subscribe
		wsio.emit('csdMessage',
			{type: "subscribeToValue", nameOfValue: "color" , app: this.appIdRef , func: "setColor"} );
	},

	fillWithHtml: function() {
		var workingDiv = document.getElementById( this.element.id );
			workingDiv.style.background = "gray";
		var _this = this;

		var cDisplay = document.createElement('div');
			cDisplay.id 			= this.element.id + "cDisplay";
			cDisplay.style.position 	= 'absolute';
			cDisplay.style.top 		= "0px";
			cDisplay.style.left 	= '0px';
			cDisplay.style.width 	= '300px';
			cDisplay.style.height 	= '300px';
			cDisplay.style.fontSize = "100px";
			cDisplay.style.background = 'white';

		workingDiv.appendChild(cDisplay);

	}, //end fillWithHtml

	setColor: function(color) {
		document.getElementById( this.element.id + "cDisplay" ).style.background = color;
	},

	load: function(date) {
	},

	draw: function(date) {
	},

	resize: function(date) {
	},

	event: function(eventType, position, user_id, data, date) {
	},

	quit: function() {
		// no additional calls needed.
	}

});
