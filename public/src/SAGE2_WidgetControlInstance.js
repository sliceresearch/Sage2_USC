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

/*
*	Creates control bar instance from custom specifications
*/
function SAGE2WidgetControlInstance (instanceID, controlSpec) {

	this.id = controlSpec.id;
	this.instanceID = instanceID;
	this.controlSpec = controlSpec;
	var size = controlSpec.computeSize();
	var dimensions = controlSpec.controlDimensions;

	this.controlSVG = new Snap(size.width, size.height);

	var innerGeometry = {
		center:{x:0, y:0, r:0},
		buttons:[],
		textInput:null,
		slider:null
	};

	var center = {x:size.height/2.0, y:size.height/2.0}; //change to reflect controlSVG center

	this.controlSVG.attr({
		fill: "#000",
		id: instanceID + "SVG"
	});

	if (controlSpec.layoutOptions.drawBackground === true)
		drawBackgroundForWidgetRadialDial(instanceID, this.controlSVG, center, dimensions.outerR);

	/*Compute Angle Range*/
	var buttonCount = this.controlSpec.itemCount;
	var startAngle = 0;
	var endAngle = 360;
	var sequenceMaximum = 32;
	var innerSequence = 12;
	var outerSequence = 20;

	this.controlSpec.addDefaultButtons({
		id: this.id,
		instanceID: this.instanceID,
		sequence: {
			closeApp: parseInt(14*outerSequence/20 + innerSequence + 1),
			closeBar: 0,
			shareApp: parseInt(16*outerSequence/20 + innerSequence + 1)
		}
	});
	var innerThetaIncrement = (endAngle - startAngle)/innerSequence;
	var outerThetaIncrement = (endAngle - startAngle)/outerSequence;
	var theta = startAngle;
	var idx;
	var key;
	var button;
	var point;
	for (idx = 1; idx<= innerSequence; idx++) {
		key = idx.toString();
		if (key in this.controlSpec.buttonSequence) {
			button = this.controlSpec.buttonSequence[key];
			point = polarToCartesian(dimensions.firstRadius, theta, center);
			if (this.controlSpec.layoutOptions.drawSpokes === true)
				drawSpokeForRadialLayout(instanceID, this.controlSVG, center, point);
			this.createButton(button, point.x, point.y, dimensions.buttonRadius - 2);
			innerGeometry.buttons.push({x:point.x, y:point.y, r:dimensions.buttonRadius-2, id:button.id});
		}
		theta = theta + innerThetaIncrement;
	}
	theta = startAngle;
	for (; idx<= (innerSequence+outerSequence); idx++) {
		key = idx.toString();
		if (key in this.controlSpec.buttonSequence) {
			button = this.controlSpec.buttonSequence[key];
			point = polarToCartesian(dimensions.secondRadius, theta, center);
			//if (this.layoutOptions.drawSpokes === true)
			//	drawSpokeForRadialLayout(this.controlSVG,center,point);
			this.createButton(button, point.x, point.y, dimensions.buttonRadius - 2);
			innerGeometry.buttons.push({x:point.x, y:point.y, r:dimensions.buttonRadius-2, id:button.id});
		}
		theta = theta + outerThetaIncrement;
	}


	var d, leftMidOfBar, rightEndOfCircle;
	if (this.controlSpec.hasSlider===true && this.controlSpec.hasTextInput === true) {// && this.controlSpec.hasColorPalette === true) {
		d = makeWidgetBarOutlinePath(344, 360, dimensions.outerR, center, this.controlSpec.slider.width, dimensions.buttonRadius);
		leftMidOfBar = polarToCartesian(dimensions.outerR, 352, center);
		leftMidOfBar.x +=  dimensions.buttonRadius;
		rightEndOfCircle = polarToCartesian(dimensions.outerR, 352, center);
		if (this.controlSpec.layoutOptions.drawSpokes === true)
			drawSpokeForRadialLayout(instanceID, this.controlSVG, rightEndOfCircle, leftMidOfBar);
		innerGeometry.slider = this.createSlider(leftMidOfBar.x, leftMidOfBar.y, d);
		d = makeWidgetBarOutlinePath(0, 16, dimensions.outerR, center, this.controlSpec.textInput.width, dimensions.buttonRadius);
		leftMidOfBar = polarToCartesian(dimensions.outerR, 8, center);
		leftMidOfBar.x +=  dimensions.buttonRadius;
		rightEndOfCircle = polarToCartesian(dimensions.outerR, 8, center);
		if (this.controlSpec.layoutOptions.drawSpokes === true)
			drawSpokeForRadialLayout(instanceID, this.controlSVG, rightEndOfCircle, leftMidOfBar);
		innerGeometry.textInput = this.createTextInput(leftMidOfBar.x, leftMidOfBar.y, d);
		/*d = makeWidgetBarOutlinePath(375,405, dimensions.innerR, center, this.textInput.width);
		leftMidOfBar = polarToCartesian(dimensions.innerR,390, center);
		if (this.layoutOptions.drawSpokes === true)
			drawSpokeForRadialLayout(this.controlSVG,center,leftMidOfBar);
		this.createColorPalette(leftMidOfBar.x,leftMidOfBar.y, d);*/
	}
	else if (this.controlSpec.hasSlider===true) {
		d = makeWidgetBarOutlinePath(352, 368, dimensions.outerR, center, this.controlSpec.slider.width, dimensions.buttonRadius);
		leftMidOfBar = polarToCartesian(dimensions.outerR, 0, center);
		leftMidOfBar.x +=  dimensions.buttonRadius;
		rightEndOfCircle = polarToCartesian(dimensions.outerR, 0, center);
		if (this.controlSpec.layoutOptions.drawSpokes === true)
			drawSpokeForRadialLayout(instanceID, this.controlSVG, rightEndOfCircle, leftMidOfBar);
		innerGeometry.slider = this.createSlider(leftMidOfBar.x, leftMidOfBar.y, d);
	}
	else if (this.controlSpec.hasTextInput===true) {
		d = makeWidgetBarOutlinePath(352, 368, dimensions.outerR, center, this.controlSpec.textInput.width, dimensions.buttonRadius);
		leftMidOfBar = polarToCartesian(dimensions.outerR, 0, center);
		leftMidOfBar.x +=  dimensions.buttonRadius;
		rightEndOfCircle = polarToCartesian(dimensions.outerR, 0, center);
		if (this.controlSpec.layoutOptions.drawSpokes === true)
			drawSpokeForRadialLayout(instanceID, this.controlSVG, rightEndOfCircle, leftMidOfBar);
		innerGeometry.textInput = this.createTextInput(leftMidOfBar.x, leftMidOfBar.y, d);
	}
	/*else if (this.hasColorPalette===true) {
		d = makeWidgetBarOutlinePath(345,375, dimensions.innerR, center, this.textInput.width);
		leftMidOfBar = polarToCartesian(dimensions.innerR,0, center);
		if (this.layoutOptions.drawSpokes === true)
			drawSpokeForRadialLayout(this.controlSVG,center,leftMidOfBar);
		this.createColorPalette(leftMidOfBar.x,leftMidOfBar.y, d);
	}*/
	var centerButton = this.controlSpec.buttonSequence["0"];
	if (centerButton!==undefined && centerButton!==null){
		this.createButton(centerButton, center.x, center.y, dimensions.buttonRadius - 2);
		innerGeometry.buttons.push({x:center.x, y:center.y, r:dimensions.buttonRadius-2, id:centerButton.id});
	}
	else{
		drawWidgetControlCenter(instanceID, this.controlSVG, center, dimensions.buttonRadius, "");
		innerGeometry.center.x = center.x;
		innerGeometry.center.y = center.y;
		innerGeometry.center.r = dimensions.buttonRadius;
	}

	if (isMaster) {
		wsio.emit('recordInnerGeometryForWidget', {instanceID:instanceID, innerGeometry:innerGeometry});
	}
	var ctrHandle = document.getElementById(instanceID + "SVG");
	return ctrHandle;
}


/*
*	Creates a slider from the slider specification
*/
SAGE2WidgetControlInstance.prototype.createSlider = function(x, y, outline) {
	var sliderHeight = 1.5 * ui.widgetControlSize;
	var sliderArea = this.controlSVG.path(outline);
	var sliderAreaWidth = sliderArea.getBBox().w;
	sliderArea.attr("class", "widgetBackground");
	var fontSize = 0.045 * ui.widgetControlSize;
	var sliderCaption = null;
	if (this.controlSpec.slider.caption) {
		sliderCaption = this.controlSVG.text(x+ui.widgetControlSize, y, this.controlSpec.slider.caption);
		sliderCaption.attr({
			id: this.controlSpec.slider.id+ "caption",
			dy:(0.26 * ui.widgetControlSize) + "px",
			class:"widgetText",
			fontSize: (fontSize*0.8) + "em"
		});
	}
	x = x + sliderAreaWidth*0.15;
	var sliderLine = this.controlSVG.line(x, y, x + sliderAreaWidth * 0.80, y);
	sliderLine.attr({
		strokeWidth:1,
		id:this.controlSpec.slider.id + 'line',
		style:"shape-rendering:crispEdges;",
		stroke:"rgba(230,230,230,1.0)"
	});
	var knobWidth = 3.6*ui.widgetControlSize;

	var knobHeight = 1.3*ui.widgetControlSize;
	var sliderKnob = this.controlSVG.rect(x+0.5*ui.widgetControlSize, y - knobHeight/2, knobWidth, knobHeight);
	sliderKnob.attr({
		id:this.controlSpec.slider.id + 'knob',
		rx:(knobWidth/16) + "px",
		ry:(knobHeight/8) + "px",
		//style:"shape-rendering:crispEdges;",
		fill:"rgba(110,110,110,1.0)",
		strokeWidth : 1,
		stroke: "rgba(230,230,230,1.0)"
	});
	var sliderKnobLabel = this.controlSVG.text(x+0.5*ui.widgetControlSize + knobWidth/2.0, y, "-");

	sliderKnobLabel.attr({
		id: this.controlSpec.slider.id+ "knobLabel",
		dy:(knobHeight*0.22) + "px",
		class:"widgetText",
		fontSize: fontSize + "em"
	});

	//var callabckFunc = this.slider.call.bind(applications[this.slider.appId]);

	var slider = this.controlSVG.group(sliderArea, sliderLine, sliderKnob, sliderKnobLabel);
	if (sliderCaption!==null)
		slider.add(sliderCaption);
	sliderKnob.data("appId", this.controlSpec.slider.appId);
	sliderKnobLabel.data("appId", this.controlSpec.slider.appId);
	slider.attr("id", this.controlSpec.slider.id);
	slider.data("appId", this.controlSpec.slider.appId);
	slider.data("instanceID", this.instanceID);
	slider.data("caption", this.controlSpec.slider.caption);
	slider.data('call', this.controlSpec.slider.call);
	slider.data('lockCall', this.controlSpec.slider.lockCall);
	slider.data('updateCall', this.controlSpec.slider.updateCall);
	slider.data('appProperty', this.controlSpec.slider.appProperty);
	var app = getProperty(this.controlSpec.slider.appHandle, this.controlSpec.slider.appProperty);
	var begin = this.controlSpec.slider.begin;
	var end = this.controlSpec.slider.end;
	var parts = this.controlSpec.slider.parts;
	var increments = this.controlSpec.slider.increments;
	slider.data('begin', this.controlSpec.slider.begin);
	slider.data('end', this.controlSpec.slider.end);
	slider.data('parts', this.controlSpec.slider.parts);
	slider.data('increments', this.controlSpec.slider.increments);
	var formatFunction = this.controlSpec.slider.knobLabelFormatFunction;
	if (!formatFunction) {
		formatFunction = function (curVal, endVal) {
			return curVal + " / " + endVal;
		};
	}
	var bound = sliderLine.getBBox();
	function moveSlider(sliderVal) {
		var left = bound.x + knobWidth/2.0;
		var right = bound.x2 - knobWidth/2.0;

		var deltaX = (right-left)/parts;

		var n = Math.floor(0.5 + (sliderVal-begin)/increments);
		if (isNaN(n)===true)
			n = 0;

		var position = left + n * deltaX;
		if (position < left)
			position = left;
		else if (position > right)
			position = right;
		sliderKnobLabel.attr("text", formatFunction(n+begin, end));
		sliderKnob.attr({x: position - knobWidth/2.0});//,1,mina.linear);
		sliderKnobLabel.attr({x: position});//,1,mina.linear);//fontSize:fontSize + "em"
	}

	Object.observe(app.handle, function(changes) {
		for(var i=0; i<changes.length; i++) {
			if (changes[i].name===app.property)
				moveSlider(app.handle[app.property]);
		}
	});
	//moveSlider(begin);
	if (app.handle[app.property] === null || app.handle[app.property] === begin) {
		app.handle[app.property] = begin + 1;
		app.handle[app.property] = begin;
	}
	else if (app.handle[app.property] !== begin) {
		var temp = app.handle[app.property];
		app.handle[app.property] = begin;
		app.handle[app.property] = temp;
	}
	return {id:this.controlSpec.slider.id, x:bound.x, y:bound.y-knobHeight/2, w:bound.x2-bound.x, h:knobHeight};
};


/*
*	Creates a button from the button specification
*/
SAGE2WidgetControlInstance.prototype.createButton = function(buttonSpec, cx, cy, rad) {
	var buttonRad = rad;
	var buttonRad2x = 2*rad;
	var buttonBack = this.controlSVG.circle(cx, cy, buttonRad);
	buttonBack.attr({
		id: buttonSpec.id + "bkgnd",
		fill:"rgba(110,110,110,1.0)",
		strokeWidth : 1,
		stroke: "rgba(230,230,230,1.0)"
	});
	var type = buttonSpec.type;

	var button = this.controlSVG.group(buttonBack);
	var instanceID = this.instanceID;

	function buttonCoverReady(cover){
		button.add(cover);
		cover.data("call", buttonSpec.call);
		cover.data("animationInfo", type);
		cover.data("appId", buttonSpec.appId);
		buttonBack.data("appId", buttonSpec.appId);
		button.data("call", buttonSpec.call);
		button.data("appId", buttonSpec.appId);
		button.data("instanceID", instanceID);
		button.data("animationInfo", type);
		button.attr("id", buttonSpec.id);
	}
	var buttonCover;

	if (type.textual === true) {
		buttonCover = this.controlSVG.text(cx, cy, type.label.slice(0, 5));
		var coverFontSize = buttonRad/8.0;
		buttonCover.attr({
			id: buttonSpec.id + "cover",
			class: "widgetText",
			//transform: "s " + (buttonRad/coverWidth) + " " + (buttonRad/coverHeight),
			fontSize:(0.040 * buttonRad) + "em",
			dy: (0.16 * ui.widgetControlSize) + "px",
			stroke:"none",
			fill:type.fill
		});
		buttonCoverReady(buttonCover);
		type.label = type.label.slice(0, 5);
	}
	else if (type.img!==undefined && type.img!==null){
		Snap.load(type.img, function(frag){
			var gs = frag.select("svg");
			gs.attr({
				id: buttonSpec.id + "cover",
				x: (cx - buttonRad) + "px",
				y: (cy - buttonRad) + "px",
				width:buttonRad2x + "px",
				height:buttonRad2x + "px"
			});
			buttonCoverReady(gs);
		});
	}
	else {

		type.from = "M " + cx + " " + cy  + " " + type.from;
		type.to = "M " + cx + " " + cy  + " " + type.to;
		type.toFill = type.toFill || null;
		var coverWidth = type.width;
		var coverHeight = type.height;
		var initialPath;
		var initialFill;
		if (type.state !== null && type.state !== undefined) {
			initialPath = (type.state === 0)? type.from: type.to;
			initialFill = (type.state === 0)? type.fill: type.toFill;
			buttonCover = this.controlSVG.path(initialPath);
			buttonCover.attr("fill", initialFill);
		}
		else{
			buttonCover = this.controlSVG.path(type.from);
			buttonCover.attr("fill", type.fill);
		}
		buttonCover.attr({
			id: buttonSpec.id + "cover",
			transform: "s " + (buttonRad/coverWidth) + " " + (buttonRad/coverHeight),
			strokeWidth:type.strokeWidth,
			stroke:"rgba(250,250,250,1.0)",
			style:"stroke-linecap:round; stroke-linejoin:round"
		});
		buttonCoverReady(buttonCover);
	}

	if (type.state !== null && type.state !== undefined) {
		Object.observe(type, function(changes) {
			for(var i=0; i<changes.length; i++) {
				if (changes[i].name==="state") {
					var path = (type.state===0)? type.from: type.to;
					var fill = (type.state===0)? type.fill: type.toFill;
					buttonCover.animate({"path":path, "fill":fill}, type.delay, mina.bounce);
				}
			}
		});
	}
	return button;
};


/*
*	Creates a text-input from the text-input specification
*/
SAGE2WidgetControlInstance.prototype.createTextInput = function(x, y, outline) {
	var uiElementSize = ui.widgetControlSize;
	var textInputAreaHeight = 1.3 * uiElementSize;
	var fontSize = 0.045 * ui.widgetControlSize;

	var textInputOutline = this.controlSVG.path(outline);
	textInputOutline.attr("class", "widgetBackground");
	var textInputBarWidth = textInputOutline.getBBox().w;
	var textInputCaption = null;
	if (this.controlSpec.textInput.caption !== null) {
		textInputCaption = this.controlSVG.text(x+ui.widgetControlSize, y, this.controlSpec.textInput.caption);
		textInputCaption.attr({
			id: this.controlSpec.textInput.id+ "caption",
			dy:(0.26 * ui.widgetControlSize) + "px",
			class:"widgetText",
			fontSize: (fontSize*0.8) + "em"
		});
	}
	x = x + textInputBarWidth*0.15;
	var textArea = this.controlSVG.rect(x, y-textInputAreaHeight/2.0, textInputBarWidth*0.80, textInputAreaHeight);
	textArea.attr({
		id: this.controlSpec.textInput.id + "Area",
		fill:"rgba(100,100,100,1.0)",
		strokeWidth : 1,
		stroke: "rgba(230,230,230,1.0)"
	});

	var pth = "M " + (x+2) + " " + (y-textInputAreaHeight/2.0 +2) + " l 0 " + (textInputAreaHeight - 4);
	var blinker = this.controlSVG.path(pth);
	blinker.attr({
		id: this.controlSpec.textInput.id + "Blinker",
		stroke:"#ffffff",
		fill:"#ffffff",
		style:"shape-rendering:crispEdges;",
		strokeWidth:1
	});

	var blink = function() {
		blinker.animate({"stroke":"rgba(100,100,100,1.0)"}, 400, mina.easein, function() {
			blinker.animate({"stroke":"rgba(255,255,255,1.0)"}, 400, mina.easeout);
		});
	};



	var textData = this.controlSVG.text(x+2, y, "");
	textData.attr({
		id: this.controlSpec.textInput.id + "TextData",
		class: "textInput",
		fontSize: fontSize + "em",
		dy: (textArea.attr("height")*0.25) + "px"
	});
	var textInput = this.controlSVG.group(textArea, blinker);
	textInput.add(textData);
	textArea.data("appId", this.controlSpec.textInput.appId);
	textData.data("appId", this.controlSpec.textInput.appId);
	blinker.data("appId", this.controlSpec.textInput.appId);
	textInput.attr("id", this.controlSpec.textInput.id);
	textInput.data("instanceID", this.instanceID);
	textInput.data("appId", this.controlSpec.textInput.appId);
	textInput.data("buffer", "");
	textInput.data("blinkerPosition", 0);
	textInput.data("blinkerSuf", " " + (y-textInputAreaHeight/2.0 +2) + " l 0 " + (textInputAreaHeight - 4));
	textInput.data("left", x+2);
	textInput.data("call", this.controlSpec.textInput.call);
	textInput.data("head", "");
	textInput.data("prefix", "");
	textInput.data("suffix", "");
	textInput.data("tail", "");
	textInput.data("blinkCallback", blink);

	if (this.controlSpec.textInput.defaultText) {
		for(var i=0; i<this.controlSpec.textInput.defaultText.length; i++) {
			insertTextIntoTextInputWidget(textInput, this.controlSpec.textInput.defaultText.charCodeAt(i), true);
		}
	}
	var rectangle = {id:this.controlSpec.textInput.id, x:parseInt(textArea.attr("x")), y:parseInt(textArea.attr("y")), h:parseInt(textArea.attr("height")), w:parseInt(textArea.attr("width"))};
	return rectangle;
};

/*
SAGE2WidgetControlBar.prototype.addLabel = function(data) {

	var labelHeight = 1.5 * ui.widgetControlSize;
	var l = new SAGE2WidgetControls.label();
	l.id = "label" + this.itemCount;
	l.appId = this.id;
	l.appProperty = data.property;
	l.appHandle = data.appHandle;
	var font = (labelHeight-12) + 'px arial';

	var doubleUs = new Array(data.textLength+1).join('W');
	l.width =  doubleUs.width(font);
	this.itemCount++;
};
function createLabel(paper, labelSpec, x, y) {
	var labelHeight = 1.5 * ui.widgetControlSize;
	var lArea = paper.rect(x,y-labelHeight,labelSpec.width, labelHeight);
	lArea.attr({
		id: labelSpec.id + "Area",
		fill:"#666666",
		strokeWidth : 1,
		stroke: "#666666"
	});


	var lData = paper.text(x+2, y-8,"");
	lData.attr({
		id: labelSpec.id + "TextData",
		style:"fill: #000000; stroke: #000000; shape-rendering:crispEdges; font-family:Times,sans-serif; font-size:" + (labelHeight-12) + "px; font-weight:200; font-style:normal;"
		//clipPath:paper.rect(x+2,y-labelHeight, labelSpec.width,labelHeight)
	});
	var label = paper.group(lArea,lData);

	lArea.data("appId", labelSpec.appId);
	lData.data("appId",labelSpec.appId);
	label.data("appId", labelSpec.appId);

	//label.data("left", x+2);
	function showText() {
		var app = getProperty(labelSpec.appHandle,labelSpec.appProperty);
		var data = app.obj[app.property];
		lData.attr('text',data);
		lData.animate({width:lData.getBBox().width},10,mina.linear,showText);
	}

	showText();
	return label;
}

*/


