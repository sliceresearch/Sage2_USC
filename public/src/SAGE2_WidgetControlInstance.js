// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/* global drawBackgroundForWidgetRadialDial */
/* global polarToCartesian */
/* global drawSpokeForRadialLayout */
/* global makeWidgetBarOutlinePath */
/* global getPropertyHandle */
/* global createButtonShape */
/* global drawWidgetControlCenter */
/* global insertTextIntoTextInputWidget */
/* global thetaFromY */

"use strict";

/**
 * Provides widget controls and helper functionality for custom application user interface
 *
 * @module client
 * @submodule widgets
 */

/*
*	Creates control bar instance from custom specifications
*/
function SAGE2WidgetControlInstance(instanceID, controlSpec) {

	this.id = controlSpec.id;
	this.instanceID = instanceID;
	this.controlSpec = controlSpec;
	var size = controlSpec.computeSize();
	var dimensions = controlSpec.controlDimensions;

	this.controlSVG = new Snap(size.width, size.height);

	var innerGeometry = {
		center: {x: 0, y: 0, r: 0},
		buttons: [],
		textInputs: [],
		sliders: [],
		radioButtons: []
	};

	// change to reflect controlSVG center
	var center = {x: size.height / 2.0, y: size.height / 2.0};

	this.controlSVG.attr({
		fill: "#000",
		id: instanceID + "SVG"
	});

	if (controlSpec.layoutOptions.drawBackground === true) {
		drawBackgroundForWidgetRadialDial(instanceID, this.controlSVG, center, dimensions.outerR);
	}

	/*Compute Angle Range*/
	var startAngle = 180;
	var endAngle = -180;
	// var sequenceMaximum = 32;
	var innerSequence = 12;
	var outerSequence = 20;

	this.controlSpec.addDefaultButtons({
		id: this.id,
		instanceID: this.instanceID,
		sequence: {closeApp: parseInt(3 * outerSequence / 4 + innerSequence + 1), closeBar: 0 }
	});
	var innerThetaIncrement = (endAngle - startAngle) / innerSequence;
	var outerThetaIncrement = (endAngle - startAngle) / outerSequence;
	var theta = startAngle;
	var idx;
	var key;
	var button;
	var point;
	for (idx = 1; idx <= innerSequence; idx++) {
		key = idx.toString();
		if (key in this.controlSpec.buttonSequence) {
			button = this.controlSpec.buttonSequence[key];
			point = polarToCartesian(dimensions.firstRadius, theta, center);
			if (this.controlSpec.layoutOptions.drawSpokes === true) {
				drawSpokeForRadialLayout(instanceID, this.controlSVG, center, point);
			}
			this.createButton(button, point.x, point.y, dimensions.buttonRadius - 2);
			innerGeometry.buttons.push({x: point.x, y: point.y, r: dimensions.buttonRadius - 2, id: button.id});
		}
		theta = theta + innerThetaIncrement;
	}
	theta = startAngle;
	for (; idx <= (innerSequence + outerSequence); idx++) {
		key = idx.toString();
		if (key in this.controlSpec.buttonSequence) {
			button = this.controlSpec.buttonSequence[key];
			point = polarToCartesian(dimensions.secondRadius, theta, center);
			this.createButton(button, point.x, point.y, dimensions.buttonRadius - 2);
			innerGeometry.buttons.push({x: point.x, y: point.y, r: dimensions.buttonRadius - 2, id: button.id});
		}
		theta = theta + outerThetaIncrement;
	}

	var p1 = polarToCartesian(dimensions.outerR, 352, center);
	var p2 = polarToCartesian(dimensions.outerR, 368, center);
	var heightOfBar = Math.abs(p1.y - p2.y);
	var leftMidOfBar, rightEndOfCircle;
	var sideBarCount = this.controlSpec.sideBarElements.length;
	var yFrom = center.y + heightOfBar * sideBarCount / 2;
	var thetaFrom = thetaFromY(yFrom, dimensions.outerR, center);
	for (var i = 0; i < sideBarCount; i++) {
		var thetaTo = thetaFromY(yFrom - heightOfBar, dimensions.outerR, center);
		var sideBarElement = this.controlSpec.sideBarElements[i];
		var midAngle = (thetaFrom + thetaTo) / 2.0;
		var outline = makeWidgetBarOutlinePath(thetaFrom, thetaTo, dimensions.outerR,
			center, sideBarElement.width, dimensions.buttonRadius);
		leftMidOfBar = polarToCartesian(dimensions.outerR, midAngle, center);
		leftMidOfBar.x +=  dimensions.buttonRadius;
		rightEndOfCircle = polarToCartesian(dimensions.outerR, midAngle, center);
		var left = (outline.leftTop.x + outline.leftBottom.x) / 2.0;
		var right = Math.min(outline.rightTop.x, outline.rightBottom.x);
		var midOfBarY = yFrom - heightOfBar / 2.0;
		if (this.controlSpec.layoutOptions.drawSpokes === true) {
			drawSpokeForRadialLayout(instanceID, this.controlSVG, rightEndOfCircle, leftMidOfBar);
		}
		if (sideBarElement.id.indexOf('slider') > -1) {
			innerGeometry.sliders.push(this.createSlider(sideBarElement, left, right, midOfBarY, outline.d));
		} else if (sideBarElement.id.indexOf('textInput') > -1) {
			innerGeometry.textInputs.push(this.createTextInput(sideBarElement, left, right, midOfBarY, outline.d));
		} else if (sideBarElement.id.indexOf('radio') > -1) {
			innerGeometry.radioButtons.push(this.createRadioButton(sideBarElement, left, right,
				midOfBarY, outline.d, dimensions.buttonRadius - 2));
		}
		thetaFrom = thetaTo;
		yFrom = yFrom - heightOfBar;
	}

	var centerButton = this.controlSpec.buttonSequence["0"];
	if (centerButton !== undefined && centerButton !== null) {
		this.createButton(centerButton, center.x, center.y, dimensions.buttonRadius - 2);
		innerGeometry.buttons.push({x: center.x, y: center.y, r: dimensions.buttonRadius - 2, id: centerButton.id});
	} else {
		drawWidgetControlCenter(instanceID, this.controlSVG, center, dimensions.buttonRadius);
		innerGeometry.center.x = center.x;
		innerGeometry.center.y = center.y;
		innerGeometry.center.r = dimensions.buttonRadius;
	}

	if (isMaster) {
		wsio.emit('recordInnerGeometryForWidget', {instanceID: instanceID, innerGeometry: innerGeometry});
	}
	var ctrHandle = document.getElementById(instanceID + "SVG");
	return ctrHandle;
}


/*
*	Creates a slider from the slider specification
*/
SAGE2WidgetControlInstance.prototype.createSlider = function(sliderSpec, x1, x2, y, outline) {
	// var sliderHeight = 1.5 * ui.widgetControlSize;
	var sliderArea = this.controlSVG.path(outline);
	var sliderAreaWidth = sliderArea.getBBox().w;
	sliderArea.attr("class", "widgetBackground");
	var fontSize = 0.045 * ui.widgetControlSize;
	var sliderLabel = null;
	if (sliderSpec.label) {
		sliderLabel = this.controlSVG.text(x1 + ui.widgetControlSize, y, sliderSpec.label.slice(0, 5));
		sliderLabel.attr({
			id: sliderSpec.id + "label",
			dy: (0.26 * ui.widgetControlSize) + "px",
			class: "widgetLabel",
			fontSize: (fontSize * 0.7) + "em"
		});
	}
	x1 = x1 + sliderAreaWidth * 0.15;
	var sliderLine = this.controlSVG.line(x1, y, x2 - ui.widgetControlSize / 2.0, y);
	sliderLine.attr({
		strokeWidth: 1,
		id: sliderSpec.id + 'line',
		style: "shape-rendering:crispEdges;",
		stroke: "rgba(230,230,230,1.0)"
	});
	var knobWidth = 3.6 * ui.widgetControlSize;

	var knobHeight = 1.3 * ui.widgetControlSize;
	var sliderKnob = this.controlSVG.rect(x1 + 0.5 * ui.widgetControlSize, y - knobHeight / 2, knobWidth, knobHeight);
	sliderKnob.attr({
		id: sliderSpec.id + 'knob',
		rx: (knobWidth / 16) + "px",
		ry: (knobHeight / 8) + "px",
		// style:"shape-rendering:crispEdges;",
		fill: "rgba(185,206,235,1.0)",
		strokeWidth: 1,
		stroke: "rgba(230,230,230,1.0)"
	});
	var sliderKnobLabel = this.controlSVG.text(x1 + 0.5 * ui.widgetControlSize + knobWidth / 2.0, y, "-");

	sliderKnobLabel.attr({
		id: sliderSpec.id + "knobLabel",
		dy: (knobHeight * 0.22) + "px",
		class: "widgetText",
		fontSize: fontSize + "em"
	});

	var slider = this.controlSVG.group(sliderArea, sliderLine, sliderKnob, sliderKnobLabel);
	if (sliderLabel !== null) {
		slider.add(sliderLabel);
	}
	sliderKnob.data("appId", sliderSpec.appId);
	sliderKnobLabel.data("appId", sliderSpec.appId);
	slider.attr("id", sliderSpec.id);
	slider.data("appId", sliderSpec.appId);
	slider.data("instanceID", this.instanceID);
	slider.data("label", sliderSpec.label);
	slider.data('appProperty', sliderSpec.appProperty);
	var app = getPropertyHandle(applications[sliderSpec.appId], sliderSpec.appProperty);
	var begin = sliderSpec.begin;
	var end = sliderSpec.end;
	var steps = sliderSpec.steps;
	var increments = sliderSpec.increments;
	slider.data('begin', begin);
	slider.data('end', end);
	slider.data('steps', steps);
	slider.data('increments', increments);
	var formatFunction = sliderSpec.knobLabelFormatFunction;
	if (!formatFunction) {
		formatFunction = function(curVal, endVal) {
			return curVal + " / " + endVal;
		};
	}
	var bound = sliderLine.getBBox();
	function moveSlider(sliderVal) {
		var left = bound.x + knobWidth / 2.0;
		var right = bound.x2 - knobWidth / 2.0;

		var deltaX = (right - left) / steps;

		var n = Math.floor(0.5 + (sliderVal - begin) / increments);
		if (isNaN(n) === true) {
			n = 0;
		}

		var position = left + n * deltaX;
		if (position < left) {
			position = left;
		} else if (position > right) {
			position = right;
		}
		sliderKnobLabel.attr("text", formatFunction(n + begin, end));
		sliderKnob.attr({x: position - knobWidth / 2.0});
		sliderKnobLabel.attr({x: position});
	}

	var safeValue = app.handle[app.property];
	var internalSliderValue = "_" + sliderSpec.id + "BoundValue";
	Object.defineProperty(app.handle, app.property, {
		get: function () {
			return this[internalSliderValue];
		},
		set: function (x) {
			this[internalSliderValue] = x;
			moveSlider(x);
		}
	});

	if (safeValue === null || safeValue === undefined) {
		safeValue = begin;
	} else if (safeValue < begin || safeValue > end) {
		safeValue = (begin + end) / 2;
	}
	app.handle[app.property] = safeValue;
	return {id: sliderSpec.id, x: bound.x, y: bound.y - knobHeight / 2, w: bound.x2 - bound.x, h: knobHeight};
};


/*
*	Creates a button from the button specification
*/
SAGE2WidgetControlInstance.prototype.createButton = function(buttonSpec, cx, cy, rad) {
	var buttonRad = rad;
	var buttonRad2x = 2 * rad;
	var buttonBack;
	var type = buttonSpec.type;
	var buttonShape = type.shape;
	if (buttonShape === null || buttonShape === undefined) {
		buttonShape = "circle";
	}
	buttonBack = createButtonShape(this.controlSVG, cx, cy, buttonRad, buttonShape);
	buttonBack.attr({
		id: buttonSpec.id + "bkgnd",
		fill: "rgba(185,206,235,1.0)",
		strokeWidth: 1,
		stroke: "rgba(230,230,230,1.0)"
	});

	var button = this.controlSVG.group(buttonBack);
	var instanceID = this.instanceID;

	function buttonCoverReady(cover, use) {
		button.add(cover);
		cover.data("animationInfo", type);
		cover.data("appId", buttonSpec.appId);
		buttonBack.data("appId", buttonSpec.appId);
		button.data("appId", buttonSpec.appId);
		button.data("instanceID", instanceID);
		button.data("animationInfo", type);
		button.attr("id", buttonSpec.id);
	}
	var buttonCover;

	if (type.textual === true) {
		buttonCover = this.controlSVG.text(cx, cy, type.label.slice(0, 5));
		// var coverFontSize = buttonRad / 8.0;
		buttonCover.attr({
			id: buttonSpec.id + "cover",
			class: "widgetText",
			fontSize: (0.040 * buttonRad) + "em",
			dy: (0.16 * ui.widgetControlSize) + "px",
			stroke: "none",
			fill: type.fill
		});
		buttonCoverReady(buttonCover);
		type.label = type.label.slice(0, 5);
	} else if (type.img !== undefined && type.img !== null) {
		Snap.load(type.img, function(frag) {
			var gs = frag.select("svg");
			gs.attr({
				id: "cover",
				x: (cx - buttonRad) + "px",
				y: (cy - buttonRad) + "px",
				width: buttonRad2x + "px",
				height: buttonRad2x + "px",
				visibility: (type.state !== 1) ? "visible" : "hidden"
			});
			buttonCoverReady(gs);
		});
		if (type.img2 !== undefined && type.img2 !== null) {
			Snap.load(type.img2, function(frag) {
				var gs = frag.select("svg");
				gs.attr({
					id: "cover2",
					x: (cx - buttonRad) + "px",
					y: (cy - buttonRad) + "px",
					width: buttonRad2x + "px",
					height: buttonRad2x + "px",
					visibility: (type.state === 1) ? "visible" : "hidden"
				});
				buttonCoverReady(gs);
			});
		}
	} else {
		type.from = "M " + cx + " " + cy  + " " + type.from;
		type.to = "M " + cx + " " + cy  + " " + type.to;
		type.toFill = type.toFill || null;
		var coverWidth = type.width;
		var coverHeight = type.height;
		var initialPath;
		var initialFill;
		if (type.state !== null && type.state !== undefined) {
			initialPath = (type.state === 0) ? type.from : type.to;
			initialFill = (type.state === 0) ? type.fill : type.toFill;
			buttonCover = this.controlSVG.path(initialPath);
			buttonCover.attr("fill", initialFill);
		} else {
			buttonCover = this.controlSVG.path(type.from);
			buttonCover.attr("fill", type.fill);
		}
		buttonCover.attr({
			id: buttonSpec.id + "cover",
			transform: "s " + (buttonRad / coverWidth) + " " + (buttonRad / coverHeight),
			strokeWidth: type.strokeWidth,
			stroke: "rgba(250,250,250,1.0)",
			style: "stroke-linecap:round; stroke-linejoin:round"
		});
		buttonCoverReady(buttonCover);
	}
	function buttonCoverAnimate(value) {
		if (type.img2 === null || type.img2 === undefined) {
			var path = (value === 0) ? type.from : type.to;
			var fill = (value === 0) ? type.fill : type.toFill;
			buttonCover.animate({path: path, fill: fill}, type.delay, mina.bounce);
		} else if (value === 1) {
			button.select("#cover2").attr("visibility", "visible");
			button.select("#cover").attr("visibility", "hidden");
		} else {
			button.select("#cover").attr("visibility", "visible");
			button.select("#cover2").attr("visibility", "hidden");
		}
	}

	if (type.state !== null && type.state !== undefined) {
		var internalStateValue = "_" + buttonSpec.id + "BoundValue";
		type[internalStateValue] = type.state;
		Object.defineProperty(type, "state", {
			get: function () {
				return this[internalStateValue];
			},
			set: function (x) {
				this[internalStateValue] = x;
				buttonCoverAnimate(x);
			}
		});
	}

	return button;
};


/*
*	Creates a text-input from the text-input specification
*/
SAGE2WidgetControlInstance.prototype.createTextInput = function(textInputSpec, x1, x2, y, outline) {
	var uiElementSize = ui.widgetControlSize;
	var textInputAreaHeight = 1.3 * uiElementSize;
	var fontSize = 0.045 * ui.widgetControlSize;

	var textInputOutline = this.controlSVG.path(outline);
	textInputOutline.attr("class", "widgetBackground");
	var textInputBarWidth = textInputOutline.getBBox().w;
	var textInputLabel = null;
	if (textInputSpec.label !== null) {
		textInputLabel = this.controlSVG.text(x1 + ui.widgetControlSize, y, textInputSpec.label.slice(0, 5));
		textInputLabel.attr({
			id: textInputSpec.id + "label",
			dy: (0.26 * ui.widgetControlSize) + "px",
			class: "widgetLabel",
			fontSize: (fontSize * 0.7) + "em"
		});
	}
	x1 = x1 + textInputBarWidth * 0.15;
	var textArea = this.controlSVG.rect(x1, y - textInputAreaHeight / 2.0,
		x2 - ui.widgetControlSize / 2.0 - x1, textInputAreaHeight);
	textArea.attr({
		id: textInputSpec.id + "Area",
		fill: "rgba(185,206,235,1.0)",
		strokeWidth: 1,
		stroke: "rgba(230,230,230,1.0)"
	});

	var pth = "M " + (x1 + 2) + " " + (y - textInputAreaHeight / 2.0 + 2) + " l 0 " + (textInputAreaHeight - 4);
	var blinker = this.controlSVG.path(pth);
	blinker.attr({
		id: textInputSpec.id + "Blinker",
		stroke: "#ffffff",
		fill: "#ffffff",
		style: "shape-rendering:crispEdges;",
		strokeWidth: 1
	});

	var blink = function() {
		blinker.animate({stroke: "rgba(100,100,100,1.0)"}, 400, mina.easein, function() {
			blinker.animate({stroke: "rgba(255,255,255,1.0)"}, 400, mina.easeout);
		});
	};



	var textData = this.controlSVG.text(x1 + 2, y, "");
	textData.attr({
		id: textInputSpec.id + "TextData",
		class: "textInput",
		fontSize: fontSize + "em",
		dy: (textArea.attr("height") * 0.25) + "px"
	});
	var textInput = this.controlSVG.group(textArea, blinker);
	textInput.add(textData);
	textArea.data("appId", textInputSpec.appId);
	textData.data("appId", textInputSpec.appId);
	blinker.data("appId", textInputSpec.appId);
	textInput.attr("id", textInputSpec.id);
	textInput.data("instanceID", this.instanceID);
	textInput.data("appId", textInputSpec.appId);
	textInput.data("buffer", "");
	textInput.data("blinkerPosition", 0);
	textInput.data("blinkerSuf", " " + (y - textInputAreaHeight / 2.0 + 2) + " l 0 " + (textInputAreaHeight - 4));
	textInput.data("left", x1 + 2);
	textInput.data("call", textInputSpec.call);
	textInput.data("head", "");
	textInput.data("prefix", "");
	textInput.data("suffix", "");
	textInput.data("tail", "");
	textInput.data("blinkCallback", blink);

	if (textInputSpec.value) {
		for (var i = 0; i < textInputSpec.value.length; i++) {
			insertTextIntoTextInputWidget(textInput, textInputSpec.value.charCodeAt(i), true);
		}
	}

	var rectangle = {
		id: textInputSpec.id,
		x: parseInt(textArea.attr("x")),
		y: parseInt(textArea.attr("y")),
		h: parseInt(textArea.attr("height")),
		w: parseInt(textArea.attr("width"))
	};

	return rectangle;
};

/*
*	Creates a radio button input from the radio button specification
*/
SAGE2WidgetControlInstance.prototype.createRadioButton = function(radioButtonSpec, x1, x2, y, outline, buttonRad) {
	var radioButtonArea = this.controlSVG.path(outline);
	var radioButtonAreaWidth = radioButtonArea.getBBox().w;
	radioButtonArea.attr("class", "widgetBackground");
	var fontSize = 0.045 * ui.widgetControlSize;
	var radioButtonLabel = null;
	if (radioButtonSpec.label) {
		radioButtonLabel = this.controlSVG.text(x1 + ui.widgetControlSize, y, radioButtonSpec.label.slice(0, 5));
		radioButtonLabel.attr({
			id: radioButtonSpec.id + "label",
			dy: (0.26 * ui.widgetControlSize) + "px",
			class: "widgetLabel",
			fontSize: (fontSize * 0.7) + "em"
		});
	}
	var geometry = [];
	var radioButton = this.controlSVG.group();
	x1 = x1 + radioButtonAreaWidth * 0.15;
	var buttonSpace = (x2 - x1) / 6.0;
	var options = radioButtonSpec.data.options;
	var xMid = (x1 + x2) / 2.0;
	var x = xMid - (options.length - 1) * buttonSpace / 2.0;
	for (var i = 0; i < options.length; i++) {
		var buttonRing = createButtonShape(this.controlSVG, x, y, buttonRad, "circle");
		buttonRing.attr({
			id: radioButtonSpec.id + options[i] + "ring",
			fill: "rgba(42, 86, 140, 1.0)",
			strokeWidth: 1,
			stroke: "rgba(42, 86, 140, 1.0)",
			visibility: (radioButtonSpec.data.value === options[i]) ? "visible" : "hidden"
		});

		var buttonCenter = createButtonShape(this.controlSVG, x, y, buttonRad * 0.9, "circle");
		buttonCenter.attr({
			id: radioButtonSpec.id + options[i] + "center",
			fill: "rgba(185,206,235,1.0)",
			strokeWidth: 1,
			stroke: "rgba(230,230,230,1.0)"
		});

		var buttonText = this.controlSVG.text(x, y, options[i].slice(0, 5));
		buttonText.attr({
			id: radioButtonSpec.id + options[i] + "label",
			class: "widgetText",
			fontSize: (0.040 * buttonRad) + "em",
			dy: (0.16 * ui.widgetControlSize) + "px"
		});
		var button = this.controlSVG.group(buttonRing, buttonCenter, buttonText);
		button.attr("id", radioButtonSpec.id + options[i]);
		button.data("appId", radioButtonSpec.appId);
		button.data("instanceID", this.instanceID);
		radioButton.add(button);
		geometry.push({id: radioButtonSpec.id + options[i], x: x, y: y, r: buttonRad});
		x += buttonSpace;
	}

	radioButtonArea.data("appId", radioButtonSpec.appId);
	radioButton.attr("id", radioButtonSpec.id);
	radioButton.data("radioState", radioButtonSpec.data);
	radioButton.data("instanceID", this.instanceID);

	radioButton.data("appId", radioButtonSpec.appId);

	function radioStateAnimate(oldValue, newValue) {
		var oldSelection = radioButton.select("#" + radioButtonSpec.id + oldValue);
		var newSelection = radioButton.select("#" + radioButtonSpec.id + newValue);
		if (newSelection !== null && newSelection !== undefined) {
			oldSelection.select("#" + radioButtonSpec.id + oldValue + "ring").attr("visibility", "hidden");
			newSelection.select("#" + radioButtonSpec.id + newValue + "ring").attr("visibility", "visible");
			return true;
		} else {
			return false;
		}
	}
	var radioState = radioButtonSpec.data;
	if (radioState.value !== null && radioState.value !== undefined) {
		var internalStateValue = "_" + radioButtonSpec.id + "BoundValue";
		radioState[internalStateValue] = radioState.value;
		Object.defineProperty(radioState, "value", {
			get: function () {
				return this[internalStateValue];
			},
			set: function (x) {
				if (radioStateAnimate(this[internalStateValue], x) === true) {
					this[internalStateValue] = x;
				}
			}
		});
	}
	return geometry;
};
