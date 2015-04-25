// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

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
	this.ButtonClass = function () {
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
	this.ColorPaletteClass = function(){
		this.id = null;
		this.appId = null;
		this.colorList = [];
	};

	this.id = id;
	this.instanceID = "";
	this.specReady = false;
	this.itemCount = 0;
	this.hasSlider = false;
	this.hasTextInput = false;
	this.buttonSequence = {};
	this.separatorList = [];
	this.buttonType = SAGE2WidgetButtonTypes;
	this.layoutOptions = {
		"drawGroupBoundaries":false,
		"drawBackground": true,
		"shape": "radial",
		"drawSpokes": true,
		"drawSquareButtons":false
	};
}

/*
*	Ensures everything got added to the controls specification properly
*/
SAGE2WidgetControl.prototype.finishedAddingControls = function(){
	this.specReady = true;
};

/*
*	Check whether control specification is ready (used before creating widget elements from specification)
*/
SAGE2WidgetControl.prototype.controlsReady = function(){
	return this.specReady;
};




/*
*	Lets the user add a custom cover for buttons
* 	Added cover is available only to that instance of that app.
*/
SAGE2WidgetControl.prototype.addButtonType = function(type, buttonData){
	if (this.buttonType[type] === undefined || this.buttonType[type] === null) {
		this.buttonType[type] = function () {
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
SAGE2WidgetControl.prototype.setLayoutOptions = function(layoutOptions){
	if (layoutOptions.drawBackground) this.layoutOptions.drawBackground = layoutOptions.drawBackground;
	if ((layoutOptions.drawGroupBoundaries === true) && (layoutOptions.drawBackground === false)) {
		this.layoutOptions.drawGroupBoundaries = layoutOptions.drawGroupBoundaries;
	}
	if (layoutOptions.shape) this.layoutOptions.shape = layoutOptions.shape;
	if (layoutOptions.drawSpokes) this.layoutOptions.drawSpokes = layoutOptions.drawSpokes;
	if (layoutOptions.drawSquareButtons) this.layoutOptions.drawSquareButtons = layoutOptions.drawSquareButtons;
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
	if (this.itemCount <= 30){
		var button = new this.ButtonClass();
		button.appId = this.id;
		if (data.id !== undefined && data.id!== null)
			button.id = "button" + data.id;
		else
			button.id = "button" + ((this.itemCount<10)? "0" : "") + this.itemCount;
		if (typeof data.type === "string" ){
			var typeVar = this.buttonType[data.type];
			if (typeof typeVar === "function")
				type =  new typeVar();
		}
		else if (typeof data.type === "function"){
			type = new data.type();
		}
		else if (typeof data.type === "object"){
			var typeFunc = function (){
				this.state= data.type.state;
				this.from= data.type.from;
				this.to=  data.type.to;
				this.width= data.type.width;
				this.height= data.type.height;
				this.fill= data.type.fill;
				this.label = data.type.label;
				this.strokeWidth= data.type.strokeWidth;
				this.delay= data.type.delay;
				this.textual= data.type.textual;
				this.animation= data.type.animation;
			};
			type = new typeFunc();
		}

		if (type === null || type === undefined){
			type = new this.buttonType.default();
		}
		if (data.initialState !== null && data.initialState !== undefined)
			type.state = data.initialState % 2;  // Making sure initial state is 0 or 1
		button.type=type;
		button.call = data.action || null;
		button.width = 1.5*ui.widgetControlSize;
		this.buttonSequence[data.sequenceNo.toString()] = button;
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
SAGE2WidgetControl.prototype.addTextInput = function (data) {
	if (this.hasTextInput === false && this.itemCount <= 30){
		this.hasTextInput = true;
		var textInput = new this.TextInputClass();
		if (data.id !== undefined && data.id!== null)
			textInput.id = "textInput" + data.id;
		else
			textInput.id = "textInput" + ((this.itemCount<10)? "0" : "") + this.itemCount;
		textInput.appId = this.id;
		textInput.caption = data.caption || null;
		textInput.width = 13.0*ui.widgetControlSize;
		textInput.call = data.action || null;
		textInput.defaultText = data.defaultText || "";
		this.textInput = textInput;
		this.itemCount++;
	}
};

/*
*	Adds a slider specification
*	data
*		.appHandle
*		.property - appHandle and preperty are used to bind a property of the app to the slider
*		for example, if you want to bind this.state.currentPage to the slider, then send appHandle:this, property:"state.currentPage"
*		.begin - the minimum value that the proerty will take
*		.end - the maximum value the property will take
*		.increments - step value for the proerty
*		alternatively, you can specify .parts - number of increments/step values between .begin and .end
*		.action - callback function to specify action after the slider has been moved
*	action callback looks like this:
*	function (appHandle, date){
*		// The bound property will already have been updated by the slider
*		// use this cal back to perform additional functions like refreshing the app
*	}
*/
SAGE2WidgetControl.prototype.addSlider = function(data){
	//begin,parts,end,action, property, appHandle
	if (this.hasSlider === false && this.itemCount <= 30){

		var slider = new this.SliderClass();
		if (data.id !== undefined && data.id!== null)
			slider.id = "slider" + data.id;
		else
			slider.id = "slider" + ((this.itemCount<10)? "0" : "") + this.itemCount;
		slider.appId = this.id;
		slider.begin = data.begin;
		slider.end = data.end;
		if(data.increments){
			slider.increments = data.increments || 1;
			slider.parts = (slider.end - slider.begin)/slider.increments;
		}
		else if(data.parts){
			slider.parts = data.parts || 1;
			slider.increments = (slider.end - slider.begin)/slider.parts;
		}
		slider.caption = data.caption || null;
		slider.call = data.action || null;
		slider.lockCall = data.lockAction || null;
		slider.updateCall = data.updateAction || null;
		slider.appProperty = data.property;
		slider.appHandle = data.appHandle;
		slider.sliderVal = data.begin;
		slider.knobLabelFormatFunction = data.labelFormatFunction;
		slider.width = 13.0*ui.widgetControlSize;
		if (slider.parts < 1)
			return;

		this.hasSlider = true;
		this.slider = slider;
		this.itemCount++;
	}
};

/*
*	Adds a color palette
*/
SAGE2WidgetControl.prototype.addColorPalette = function(data){
	if (this.hasColorPalette === false && this.itemCount <= 12){

		var colorPalette = new this.ColorPaletteClass();
		colorPalette.id = "colorPalette" + this.itemCount;
		colorPalette.appId = this.id;
		colorPalette.call = data.action || null;

		if (data.colorList === null || data.colorList === undefined)
			return;
		else if (data.colorList.length === 0)
			return;

		this.hasColorPalette = true;
		this.colorPalette = colorPalette;
		this.itemCount++;
	}
};


/*
*	Computes the dimensions of the widget control bar
*/
SAGE2WidgetControl.prototype.computeSize = function(){
	var size = {
		width:0,
		height:0
	};
	var dimensions = {};
	dimensions.buttonRadius = 0.8 * ui.widgetControlSize;
	dimensions.radius = dimensions.buttonRadius * 5.027; // tan(78.5): angle subtended at the center is 22.5
	dimensions.firstRadius = dimensions.radius *0.75;

	dimensions.innerR = dimensions.radius - dimensions.buttonRadius -3; // for the pie slice
	dimensions.outerR = ui.widgetControlSize * 6.0;
	dimensions.secondRadius = dimensions.firstRadius + dimensions.buttonRadius*2.5;

	size.height = dimensions.outerR * 2 + 5;
	size.width = size.height;
	size.barHeight = dimensions.buttonRadius*4;
	size.hasSideBar = false;

	if (this.hasSlider === true){
		size.width = size.width  + this.slider.width + dimensions.buttonRadius;
		size.hasSideBar = true;
	}
	else if ( this.hasTextInput === true){
		size.width = size.width  + this.textInput.width + dimensions.buttonRadius;
		size.hasSideBar = true;
	}
	else if ( this.hasColorPalette === true){
		size.width = size.width  + this.colorPalette.width + dimensions.buttonRadius;
		size.hasSideBar = true;
	}
	this.controlDimensions = dimensions;
	return size;
};

/*
*	Creates default close and radial menu buttons
*/


SAGE2WidgetControl.prototype.addDefaultButtons = function(data){
	this.addButton({type:"closeApp", id:"CloseApp", sequenceNo:data.sequence.closeApp, action:function(date){
		if (isMaster)
			wsio.emit('closeAppFromControl', {appId:data.id});
	}});
	this.addButton({type:"closeBar", id:"CloseWidget", sequenceNo:data.sequence.closeBar, action:function(date){
		if (isMaster)
			wsio.emit('hideWidgetFromControl', {instanceID:data.instanceID});
	}});
};


/*
*	Creates a color palette
*/
/*SAGE2WidgetControl.prototype.createColorPalette = function(x, y, outline){
	var uiElementSize = ui.widgetControlSize;
	var colorPaletteAreaHeight = 1.3 * uiElementSize;
	//var fontSize = 0.045 * ui.widgetControlSize;

	var colorPaletteOutline = this.controlSVG.path(outline);
	colorPaletteOutline.attr("class","widgetBackground");
	var colorPaletteBarWidth = colorPaletteOutline.getBBox().w;
	x = x + colorPaletteBarWidth*0.075;
	//for(var i=0;i<this. )
}
*/



