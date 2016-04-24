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

var aDataPassMaster = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.element.id = "div" + data.id;


		this.colorList = [
			'red',
			'blue',
			'green',
			'orange',
			'yellow',
			'pink'
		];
		this.sharedNumber = 0;
		this.numberLimit = 10;

		this.colorIndex = 0;
		this.sharedColor = this.colorList[this.colorIndex];

		this.fillWithHtml();

		//emit for number
		wsio.emit('csdMessage',
			{type: "setValue", nameOfValue: "number" , value: this.sharedNumber , description: "integer"} );
		//color
		wsio.emit('csdMessage',
			{type: "setValue", nameOfValue: "color", value: this.sharedColor, description: "string"} );
	},

	fillWithHtml: function() {
		var workingDiv = document.getElementById( this.element.id );
			workingDiv.style.background = "gray";
		var _this = this;

		var nDisplay = document.createElement('div');
			nDisplay.id 			= this.element.id + "nDisplay";
			nDisplay.style.position 	= 'absolute';
			nDisplay.style.top 		= "300px";
			nDisplay.style.left 	= '0px';
			nDisplay.style.width 	= '300px';
			nDisplay.style.height 	= '300px';
			nDisplay.style.fontSize = "100px";
			nDisplay.innerHTML 		= this.sharedNumber;

		workingDiv.appendChild(nDisplay);

		var cDisplay = document.createElement('div');
			cDisplay.id 			= this.element.id + "cDisplay";
			cDisplay.style.position 	= 'absolute';
			cDisplay.style.top 		= "300px";
			cDisplay.style.left 	= '300px';
			cDisplay.style.width 	= '300px';
			cDisplay.style.height 	= '300px';
			cDisplay.style.fontSize = "100px";
			cDisplay.style.background = this.sharedColor;

		workingDiv.appendChild(cDisplay);

		var nInc = document.createElement('div');
			nInc.id 			= this.element.id + "nInc";
			nInc.style.position 	= 'absolute';
			nInc.style.top 		= "0px";
			nInc.style.left 	= '0px';
			nInc.style.width 	= '300px';
			nInc.style.height 	= '300px';
			nInc.style.fontSize = "100px";
			nInc.innerHTML 		= "Inc";
		nInc.addEventListener( 'click', function() {
			_this.increaseNumber();
		} );
		workingDiv.appendChild(nInc);

		var nDec = document.createElement('div');
			nDec.id 			= this.element.id + "nDec";
			nDec.style.position 	= 'absolute';
			nDec.style.top 		= "600px";
			nDec.style.left 	= '0px';
			nDec.style.width 	= '300px';
			nDec.style.height 	= '300px';
			nDec.style.fontSize = "100px";
			nDec.innerHTML 		= "Dec";
		nDec.addEventListener( 'click', function() {
			_this.decreaseNumber();
		} );
		workingDiv.appendChild(nDec);

		var cNext = document.createElement('div');
			cNext.id 			= this.element.id + "cNext";
			cNext.style.position = 'absolute';
			cNext.style.top 	= "0px";
			cNext.style.left 	= '300px';
			cNext.style.width 	= '300px';
			cNext.style.height 	= '300px';
			cNext.style.fontSize = "100px";
			cNext.innerHTML 	= "Next";
		cNext.addEventListener( 'click', function() {
			_this.nextColor();
		} );
		workingDiv.appendChild(cNext);

		var cPrev = document.createElement('div');
			cPrev.id 			= this.element.id + "cPrev";
			cPrev.style.position = 'absolute';
			cPrev.style.top 	= "600px";
			cPrev.style.left 	= '300px';
			cPrev.style.width 	= '300px';
			cPrev.style.height 	= '300px';
			cPrev.style.fontSize = "100px";
			cPrev.innerHTML 	= "Prev";
		cPrev.addEventListener( 'click', function() {
			_this.prevColor();
		} );
		workingDiv.appendChild(cPrev);

	}, //end fillWithHtml

	increaseNumber: function() {
		this.sharedNumber++;
		if(this.sharedNumber > this.numberLimit) { this.sharedNumber = 0; }
		document.getElementById( this.element.id + "nDisplay" ).innerHTML = this.sharedNumber;
		//emit the value updates.
		wsio.emit('csdMessage',
			{type: "setValue", nameOfValue: "number" , value: this.sharedNumber} );
	},
	decreaseNumber: function() {
		this.sharedNumber--;
		if(this.sharedNumber < 0) { this.sharedNumber = this.numberLimit; }
		document.getElementById( this.element.id + "nDisplay" ).innerHTML = this.sharedNumber;
		//emit the value updates.
		wsio.emit('csdMessage',
			{type: "setValue", nameOfValue: "number" , value: this.sharedNumber} );
	},
	nextColor: function() {
		this.colorIndex++;
		if(this.colorIndex >= this.colorList.length) { this.colorIndex = 0; }
		this.sharedColor = this.colorList[this.colorIndex];
		document.getElementById( this.element.id + "cDisplay" ).style.background = this.sharedColor;
		//emit the value updates.
		wsio.emit('csdMessage',
			{type: "setValue", nameOfValue: "color", value: this.sharedColor} );
	},
	prevColor: function() {
		this.colorIndex--;
		if(this.colorIndex < 0) { this.colorIndex =  this.colorList.length -1; }
		this.sharedColor = this.colorList[this.colorIndex];
		document.getElementById( this.element.id + "cDisplay" ).style.background = this.sharedColor;
		//emit the value updates.
		wsio.emit('csdMessage',
			{type: "setValue", nameOfValue: "color", value: this.sharedColor} );
	},

	load: function(date) {
	},

	draw: function(date) {
	},

	resize: function(date) {
	},

	event: function(eventType, position, user_id, data, date) {
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

		entry = {};
		entry.description = "Increase Number";
		entry.callback = "increaseNumber";
		entry.parameters = {};
		entries.push(entry);

		entry = {};
		entry.description = "Decrease Number";
		entry.callback = "decreaseNumber";
		entry.parameters = {};
		entries.push(entry);
		
		entry = {};
		entry.description = "Next Color";
		entry.callback = "nextColor";
		entry.parameters = {};
		entries.push(entry);
		
		entry = {};
		entry.description = "Previous Color";
		entry.callback = "prevColor";
		entry.parameters = {};
		entries.push(entry);

		return entries;
	},

	quit: function() {
		// no additional calls needed.
	}

});
