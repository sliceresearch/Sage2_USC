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

var aNumberSlave = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.element.id = "div" + data.id;
		this.appIdRef = data.id;

		this.fillWithHtml();

		//get number
		wsio.emit('csdMessage',
			{type: "getValue", nameOfValue: "number" , app: this.appIdRef , func: "setNumber"} );
		//subscribe
		wsio.emit('csdMessage',
			{type: "subscribeToValue", nameOfValue: "number" , app: this.appIdRef , func: "setNumber"} );
	},

	fillWithHtml: function() {
		var workingDiv = document.getElementById( this.element.id );
			workingDiv.style.background = "white";
		var _this = this;

		var nDisplay = document.createElement('div');
			nDisplay.id 			= this.element.id + "nDisplay";
			nDisplay.style.position 	= 'absolute';
			nDisplay.style.top 		= "0px";
			nDisplay.style.left 	= '0px';
			nDisplay.style.width 	= '300px';
			nDisplay.style.height 	= '300px';
			nDisplay.style.fontSize = "100px";
			nDisplay.innerHTML 		= "????";

		workingDiv.appendChild(nDisplay);

	}, //end fillWithHtml

	setNumber: function(num) {
		document.getElementById( this.element.id + "nDisplay" ).innerHTML = num;
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
