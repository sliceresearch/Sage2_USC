// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/* global SAGE2WidgetButtonTypes */
/* global polarToCartesian */
"use strict";

/**
 * Provides widget controls and helper functionality for custom application user interface
 *
 * @module client
 * @submodule widgets
 */

/**
 * Widget Control: has functions exposed to SAGE2 apps for adding elements onto the widget bar
 *
 * @class SAGE2WidgetControl
 * @constructor
 * @param id {String} identifier for the object
 * @return {Object} an object representing a widget control bar
*/
function SAGE2WidgetControl(id) {
	this.ButtonClass = function() {
		this.appId = null;
		this.id    = null;
		this.type  = null;
		this.call  = null;
	};
	this.SliderClass = function() {
		this.id = null;
		this.appId = null;
		this.begin = null;
		this.end = null;
		this.increments = null;
		this.parts = null;
		this.call = null;
		this.appHandle = null;
		this.appProperty = null;
		this.sliderVal = null;
	};
	this.TextInputClass = function() {
		this.id    = null;
		this.appId = null;
		this.width = null;
	};
	this.LabelClass = function() {
		this.id     = null;
		this.appHandle = null;
		this.appId  = null;
		this.width  = null;
		this.appProperty = null;
	};
	this.RadioButton = function() {
		this.id 	= null;
		this.appId	= null;
		this.data = {
			options: [],
			value: null
		};
	};
	this.ColorPaletteClass = function() {
		this.id = null;
		this.appId = null;
		this.colorList = [];
	};

	this.id = id;
	this.instanceID = "";
	this.specReady = false;
	this.itemCount = 0;
	this.sideBarElements = [];
	this.buttonSequence = {};
	this.separatorList = [];
	this.buttonType = SAGE2WidgetButtonTypes;
	this.layoutOptions = {
		drawGroupBoundaries: false,
		drawBackground: true,
		shape: "radial",
		drawSpokes: true,
		drawSquareButtons: false
	};
}

/*
*	Ensures everything got added to the controls specification properly
*/
SAGE2WidgetControl.prototype.finishedAddingControls = function() {
	this.specReady = true;
};

/*
*	Check whether control specification is ready (used before creating widget elements from specification)
*/
SAGE2WidgetControl.prototype.controlsReady = function() {
	return this.specReady;
};




/*
*	Lets the user add a custom cover for buttons
* 	Added cover is available only to that instance of that app.
*/
SAGE2WidgetControl.prototype.addButtonType = function(type, buttonData) {
	if (this.buttonType[type] === undefined || this.buttonType[type] === null) {
		this.buttonType[type] = function() {
			this.state   = buttonData.state;
			this.from    = buttonData.from;
			this.to      =  buttonData.to;
			this.width   = buttonData.width;
			this.height  = buttonData.height;
			this.fill    = buttonData.fill;
			this.label   = buttonData.label;
			this.delay   = buttonData.delay;
			this.textual = buttonData.textual;
			this.animation   = buttonData.animation;
			this.strokeWidth = buttonData.strokeWidth;
		};
	}
};

/*
*
* 	Allows the user to modify the look of the widget control bar
*	layoutOptions
*		.shape - "radial" (only one option for now, will add more soon)
		.drawBackground - true/false (if set to true, displays the semi transparent background)
		.drawGroupBoundaries - true/false (if set to true, displays the sector like boundaries around button groups)
		.drawSpokes - true/false (if set to true, displays the spokes from center to each widget element)
		.drawSquareButton - true/false (Not yet implemented)
*/
SAGE2WidgetControl.prototype.setLayoutOptions = function(layoutOptions) {
	if (layoutOptions.drawBackground) {
		this.layoutOptions.drawBackground = layoutOptions.drawBackground;
	}
	if ((layoutOptions.drawGroupBoundaries === true) && (layoutOptions.drawBackground === false)) {
		this.layoutOptions.drawGroupBoundaries = layoutOptions.drawGroupBoundaries;
	}
	if (layoutOptions.shape) {
		this.layoutOptions.shape = layoutOptions.shape;
	}
	if (layoutOptions.drawSpokes) {
		this.layoutOptions.drawSpokes = layoutOptions.drawSpokes;
	}
	if (layoutOptions.drawSquareButtons) {
		this.layoutOptions.drawSquareButtons = layoutOptions.drawSquareButtons;
	}
};

/*
*	Adds a button specification
*	data
*		.type - one of the several predefined button(cover) types [ex: "next", "prev", and so on]
*		.action - callback function to specify action after the button has been pressed
*	action callback looks like this:
*	function (appHandle, date){
*		//use the appHandle to perform button click related action here
*	}
*/
SAGE2WidgetControl.prototype.addButton = function(data) {
	var type = null;
	if (this.itemCount <= 30) {
		var button = new this.ButtonClass();
		button.appId = this.id;
		if (data.identifier !== undefined && data.identifier !== null) {
			button.id = "button" + data.identifier;
		} else {
			button.id = "button" + ((this.itemCount < 10) ? "0" : "") + this.itemCount;
		}
		if (data.hasOwnProperty("label") && data.label !== undefined && data.label !== null) {
			type = new this.buttonType.default();
			type.label = data.label;
		} else if (data.hasOwnProperty("type") && data.type !== undefined && data.type !== null) {
			if (typeof data.type === "string") {
				var TypeVar = this.buttonType[data.type];
				if (typeof TypeVar === "function") {
					type =  new TypeVar();
				}
			} else if (typeof data.type === "function") {
				type = new data.type();
			} else if (typeof data.type === "object") {
				var TypeFunc = function() {
					this.state = data.type.state;
					this.from = data.type.from;
					this.to =  data.type.to;
					this.width = data.type.width;
					this.height = data.type.height;
					this.fill = data.type.fill;
					this.label = data.type.label;
					this.strokeWidth = data.type.strokeWidth;
					this.delay = data.type.delay;
					this.textual = data.type.textual;
					this.animation = data.type.animation;
				};
				type = new TypeFunc();
			}
		}

		if (type === null || type === undefined) {
			type = new this.buttonType.default();
		}
		if (data.initialState !== null && data.initialState !== undefined) {
			type.state = data.initialState % 2;  // Making sure initial state is 0 or 1
		}
		button.type = type;
		button.width = 1.5 * ui.widgetControlSize;
		if (data.hasOwnProperty("position") && data.position !== undefined && data.position !== null) {
			this.buttonSequence[data.position.toString()] = button;
		} else {
			for (var pos = 1; pos <= 30; pos++) {
				if (this.buttonSequence.hasOwnProperty(pos.toString()) === false) {
					this.buttonSequence[pos] = button;
					break;
				}
			}
		}

		this.itemCount++;
	}
	return type;
};

SAGE2WidgetControl.prototype.addSeparatorAfterButtons = function(firstSeparator, secondSeparator, thirdSeparator) {

};

/*
*	Adds a text-input bar specification
*	data
*		.action - callback function to specify action after the text has been input and enter key pressed
*	action callback looks like this:
*	function (appHandle, text){
*		// text contains the string from the text-input widget
*		// use the appHandle to send text to the app
*	}
*/
SAGE2WidgetControl.prototype.addTextInput = function(data) {
	if (this.sideBarElements.length < 5) {
		var textInput = new this.TextInputClass();
		if (data.identifier !== undefined && data.identifier !== null) {
			textInput.id = "textInput" + data.identifier;
		} else {
			textInput.id = "textInput" + ((this.itemCount < 10) ? "0" : "") + this.itemCount;
		}
		textInput.appId = this.id;
		textInput.label = data.label || null;
		textInput.width = 13.0 * ui.widgetControlSize;
		textInput.value = data.value || "";
		this.sideBarElements[this.sideBarElements.length] = textInput;
		this.itemCount++;
	} else {
		console.log("Can't create widget " + data.identifier + ", no space on widget bar!");
	}
};

/*
*	Adds a slider specification
*	data
*		.appHandle
*		.property - appHandle and preperty are used to bind a property of the app to the slider
*		for example, if you want to bind this.state.currentPage to the slider, then send appHandle:this,
*			property:"state.currentPage"
*		.begin - the minimum value that the proerty will take
*		.end - the maximum value the property will take
*		.increments - step value for the proerty
*		alternatively, you can specify .parts - number of increments/step values between .begin and .end
*/
SAGE2WidgetControl.prototype.addSlider = function(data) {
	// begin,parts,end,action, property, appHandle
	if (this.sideBarElements.length < 5) {
		var slider = new this.SliderClass();
		if (data.identifier !== undefined && data.identifier !== null) {
			slider.id = "slider" + data.identifier;
		} else {
			slider.id = "slider" + ((this.itemCount < 10) ? "0" : "") + this.itemCount;
		}
		slider.appId = this.id;
		slider.begin = data.minimum;
		slider.end = data.maximum;
		if (data.increments) {
			slider.increments = data.increments || 1;
			slider.steps = (slider.end - slider.begin) / slider.increments;
		} else {
			slider.steps = data.steps || 100;
			slider.increments = (slider.end - slider.begin) / slider.steps;
		}
		slider.label = data.label || null;
		slider.appProperty = data.property;
		slider.sliderVal = data.minimum;
		slider.knobLabelFormatFunction = data.labelFormatFunction;
		slider.width = 13.0 * ui.widgetControlSize;
		if (slider.steps < 1) {
			return;
		}
		this.sideBarElements[this.sideBarElements.length] = slider;
		this.itemCount++;
	} else {
		console.log("Can't create widget " + data.identifier + ", no space on widget bar!");
	}
};

/*
*	Adds a color palette
*/
SAGE2WidgetControl.prototype.addColorPalette = function(data) {
	if (this.hasColorPalette === false && this.itemCount <= 12) {

		var colorPalette = new this.ColorPaletteClass();
		colorPalette.id = "colorPalette" + this.itemCount;
		colorPalette.appId = this.id;
		colorPalette.call = data.action || null;

		if (data.colorList === null || data.colorList === undefined) {
			return;
		}
		if (data.colorList.length === 0) {
			return;
		}

		this.hasColorPalette = true;
		this.colorPalette = colorPalette;
		this.itemCount++;
	}
};


/*
*	Computes the dimensions of the widget control bar
*/
SAGE2WidgetControl.prototype.computeSize = function() {
	var size = {
		width: 0,
		height: 0
	};
	var dimensions = {};
	dimensions.buttonRadius = 0.8 * ui.widgetControlSize;
	dimensions.radius = dimensions.buttonRadius * 5.027; // tan(78.5): angle subtended at the center is 22.5
	dimensions.firstRadius = dimensions.radius * 0.75;

	dimensions.innerR = dimensions.radius - dimensions.buttonRadius - 3; // for the pie slice
	dimensions.outerR = ui.widgetControlSize * 6.0;
	dimensions.secondRadius = dimensions.firstRadius + dimensions.buttonRadius * 2.5;

	size.height = dimensions.outerR * 2.4; // 10% extra on all sides
	size.width = size.height;
	size.hasSideBar = false;
	if (this.sideBarElements.length > 0) {
		size.hasSideBar = true;
		var elementWidth = Math.max.apply(null, this.sideBarElements.map(function(d) {
			return d.width;
		}));
		size.width = size.width  + elementWidth + dimensions.buttonRadius;
		var center = {x: size.height / 2.0, y: size.height / 2.0};
		var sideBarHeightInAngles = 16;
		var theta = sideBarHeightInAngles * this.sideBarElements.length;
		var start = 360 - theta / 2;
		var point1 = polarToCartesian(dimensions.outerR, start, center);
		var point2 = polarToCartesian(dimensions.outerR, start + theta, center);
		size.barHeight = Math.abs(point2.y - point1.y);
	}
	this.controlDimensions = dimensions;
	return size;
};

/*
*	Creates default close and radial menu buttons
*/
SAGE2WidgetControl.prototype.addDefaultButtons = function(data) {
	this.addButton({type: "closeApp", identifier: "CloseApp", position: data.sequence.closeApp});
	this.addButton({type: "closeBar", identifier: "CloseWidget", position: data.sequence.closeBar});
};

SAGE2WidgetControl.prototype.addRadioButton = function(data) {
	if (this.sideBarElements.length < 5) {
		data.options = data.options || [];
		if (data.options.length < 2) {
			console.log("Radio button should have more than one option!");
			return;
		}
		var radioButton = new this.RadioButton();
		if (data.identifier !== undefined && data.identifier !== null) {
			radioButton.id = "button_radio" + data.identifier;
		} else {
			radioButton.id = "button_radio" + ((this.itemCount < 10) ? "0" : "") + this.itemCount;
		}
		radioButton.appId = this.id;
		radioButton.label = data.label || null;
		radioButton.data.value = data.options[0];
		for (var i = 0; i < data.options.length; i++) {
			radioButton.data.options[i] = data.options[i];
			if (data.default === data.options[i]) {
				radioButton.data.value = data.default;
			}
		}
		radioButton.width = 13.0 * ui.widgetControlSize;
		this.sideBarElements[this.sideBarElements.length] = radioButton;
		this.itemCount++;
	} else {
		console.log("Can't create widget " + data.identifier + ", no space on widget bar!");
	}
	return radioButton.data;
};

