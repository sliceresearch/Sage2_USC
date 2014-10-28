// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014
var SAGE2WidgetControls = {
	button: function () {
		this.appId = null;
		this.id    = null;
		this.type  = null;
		this.call  = null;
	},
	slider: function() {
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
	},
	textInput: function() {
		this.id    = null;
		this.appId = null;
		this.width = null;
	},
	label: function() {
		this.id     = null;
		this.appHandle = null;
		this.appId  = null;
		this.width  = null;
		this.appProperty = null;
	}

}

function SAGE2WidgetControlBar(id) {
	this.id = id;
	this.specReady = false;
	this.itemCount = 0;
	this.items = [];
	this.buttonGroups = [];
	this.buttonGroupIdx = -1;
	this.hasSlider = false;
	this.hasTextInput = false;
}

SAGE2WidgetControlBar.prototype.finishedAddingControls = function(){
	this.specReady = true;
}
SAGE2WidgetControlBar.prototype.controlsReady = function(){
	return this.specReady;
}
SAGE2WidgetControlBar.prototype.addButtonGroup = function(){
	if (this.buttonGroupIdx < 4){
		this.buttonGroupIdx = this.buttonGroupIdx+1;
		this.buttonGroups[this.buttonGroupIdx] = [];
	}
}



SAGE2WidgetControlBar.prototype.addButton = function(data) {
	if (this.buttonGroupIdx < 4 && this.buttonGroupIdx > -1 && this.buttonGroups[this.buttonGroupIdx].length <= 3){
		var b = new SAGE2WidgetControls.button();
		b.appId = this.id;
		b.id = "button" + this.itemCount;
		b.type = data.type;
		b.call = data.action;
		b.width = 1.5*ui.widgetControlSize;
		this.items.push(b);
		this.buttonGroups[this.buttonGroupIdx].push(b);
		this.itemCount++;
	}
};

SAGE2WidgetControlBar.prototype.addTextInput = function (data) {
	if (this.hasTextInput === false){
		this.hasTextInput = true;
		var tI = new SAGE2WidgetControls.textInput();
		tI.id = "textInput" + this.itemCount;
		tI.appId = this.id;
		tI.width = 12.0*ui.widgetControlSize;
		tI.call = data.action;
		this.textInput = tI;
		this.items.push(tI);
		this.itemCount++;
	}
	
};


SAGE2WidgetControlBar.prototype.addSlider = function(data){
	//begin,parts,end,action, property, appHandle
	if (this.hasSlider === false){
		this.hasSlider = true;
		var s = new SAGE2WidgetControls.slider();
		s.id = "slider" + this.itemCount;
		s.appId = this.id;
		s.begin = data.begin;
		s.end = data.end;
		if(data.increments){
			s.increments = data.increments || 1;
			s.parts = (s.end - s.begin)/s.increments;
		}
		else if(data.parts){
			s.parts = data.parts || 1;
			s.increments = (s.end - s.begin)/s.parts;
		}
		s.call = data.action;
		s.appProperty = data.property;
		s.appHandle = data.appHandle;
		s.sliderVal = data.begin;
		s.width = 12.0*ui.widgetControlSize;
		this.slider = s;
		this.items.push(s);
		this.itemCount++;
	}
	
};




SAGE2WidgetControlBar.prototype.enumerate = function(){
	return this.items;
};

SAGE2WidgetControlBar.prototype.computeSize = function(){
	var size = {
		width:0,
		height:0
	};
	var dim = {};
	dim.buttonRadius = 0.8 * ui.widgetControlSize;
	dim.radius = dim.buttonRadius * 5.027 ; // tan(78.5): angle subtended at the center is 22.5
	dim.innerR = dim.radius - dim.buttonRadius -3; // for the pie slice
	dim.outerR = dim.radius + dim.buttonRadius +3;

	size.height = dim.outerR * 2 + 5;
	size.width = size.height;

	if (this.hasSlider === true){
		size.width = size.width  + this.slider.width ;
	}
	else if ( this.hasTextInput === true){
		size.width = size.width  + this.textInput.width;
	}
	this.controlDimensions = dim;
	return size;
}



function createControls(ctrId, spec){
	var size = spec.computeSize();
	var dim = spec.controlDimensions;
	
	var windowControls = Snap(size.width, size.height);
	var center = {x:size.height/2.0,y:size.height/2.0}; //change to reflect windowControls center

	windowControls.attr({
		fill: "#000",
		id: ctrId + "SVG"
	});
	

	drawControlCenter(windowControls,center, dim.innerR - 2*dim.buttonRadius, "SAGE2");


	
	/*Place buttons*/
	var angleRanges = (spec.buttonGroups.length===1)? [[56.25,303.75]]:[[56.25,123.75],[236.25,303.75],[146.25,213.75],[326.25,393.75]];

	for(var g=0; g < spec.buttonGroups.length; g++){
		var btns = spec.buttonGroups[g];
		var range = angleRanges[g];
		var start = range[0];
		var end = range[1];
		drawPieSlice(windowControls, start-5,end+5, dim.innerR, dim.outerR,center);
		var betweenButtons = (end - start)/btns.length;
		var padding = betweenButtons/2;
		var theta = start + padding;
		for (var b=0; b<btns.length;b++){
			var point = polarToCartesian(dim.radius,theta,center);
			createButton(windowControls,btns[b],point.x,point.y,dim.buttonRadius-2);
			theta = theta + betweenButtons;
		}

	}
	var d, centerY;
	if (spec.hasSlider===true && spec.hasTextInput === true){
		d = makeBarPath(5,45, dim.innerR, center, spec.slider.width);
		centerY = polarToCartesian(dim.innerR,23, center).y;
		createSlider(windowControls,spec.slider,center.x  + dim.innerR + 10, centerY, d);
		d = makeBarPath(315,355, dim.innerR, center, spec.textInput.width);
		centerY = polarToCartesian(dim.innerR,337, center).y;
		createTextInput(windowControls,spec.textInput, center.x  + dim.innerR + 10, centerY, d);
	}
	else if (spec.hasSlider===true){
		d = makeBarPath(340,380, dim.innerR, center, spec.slider.width);
		centerY = polarToCartesian(dim.innerR,0, center).y;
		createSlider(windowControls,spec.slider,center.x  + dim.innerR + 10, centerY, d);
	}
	else{
		d = makeBarPath(340,380, dim.innerR, center, spec.textInput.width);
		centerY = polarToCartesian(dim.innerR,0, center).y;
		createTextInput(windowControls,spec.textInput,center.x  + dim.innerR+10, centerY, d);
	}

	var ctrHandle = document.getElementById(ctrId + "SVG");
	return ctrHandle;
}


function drawControlCenter(paper, center, radius, initialText){
	var controlCenter = paper.circle(center.x,center.y,radius);
	controlCenter.attr("class", "widgetBackground");
	var controlCenterLabel = paper.text(center.x,center.y,initialText);
	controlCenterLabel.attr("class", "widgetText");
	controlCenterLabel.attr({
		fontSize: (0.045 * ui.widgetControlSize) + "em"
	})
	controlCenterLabel.attr("dy", "0.4em");
}

function drawPieSlice(paper, start,end, innerR, outerR, center){
	var pointA= polarToCartesian(innerR,start,center);
	var pointB = polarToCartesian(outerR,start,center);
	var pointC= polarToCartesian(outerR,end,center);
	var pointD = polarToCartesian(innerR,end,center);
	
	var d = "M " + pointA.x + " " + pointA.y
		+ "L " + pointB.x + " " + pointB.y
		+ "A " + outerR + " " + outerR + " " + 0 + " " + 0 + " " + 0 + " " + pointC.x + " " + pointC.y 
		+ "L " + pointD.x + " " + pointD.y
		+ "A " + innerR + " " + innerR + " " + 0 + " " + 0 + " " + 1 + " " + pointA.x + " " + pointA.y + "";

	var groupBoundaryPath = paper.path(d);
	groupBoundaryPath.attr("class", "widgetBackground");
}

function makeBarPath(start,end, innerR, center, width){
	var center2 = {x:center.x+width,y:center.y};
	var pointA= polarToCartesian(innerR,start,center);
	var pointB = polarToCartesian(innerR,start,center2);
	var pointC= polarToCartesian(innerR,end,center2);
	var pointD = polarToCartesian(innerR,end,center);
	
	var d = "M " + pointA.x + " " + pointA.y
		+ "L " + pointB.x + " " + pointB.y
		+ "A " + innerR + " " + innerR + " " + 0 + " " + 0 + " " + 0 + " " + pointC.x + " " + pointC.y 
		+ "L " + pointD.x + " " + pointD.y
		+ "A " + innerR + " " + innerR + " " + 0 + " " + 0 + " " + 1 + " " + pointA.x + " " + pointA.y + "";

	return d;
}

var buttonType = {
	"play-pause": {
		"from":"m -5 -5 l 0 10 l 6 -3 l 4 -2 z",
		"to":"m -2 -5 l 0 10 m 4 0 l 0 -10",
		"width":10,
		"height":12,
		"strokeWidth": 1,
		"fill":"#000000",
		"switch": 0,
		"delay": 400
	},
	"play-stop": {
		"from":"m -5 -5 l 0 10 l 6 -3 l 4 -2 z",
		"to":"m -5 -5 l 0 10 l 10 0 l 0 -10 z",
		"width":10,
		"height":12,
		"strokeWidth": 1,
		"fill":"#000000",
		"switch": 0,
		"delay": 400
	},
	"next": {
		"switch": null,
		"from":"m 0 -6 l 4 6 l -4 6",
		"to":"m -6 0 l 10 0 l -10 0",//"m -3 0 a 6 6 180 1 0 0 1 z",
		"width":10,
		"height":12,
		"fill":"none",
		"strokeWidth": 1,
		"delay": 600
	},
	"prev": {
		"switch": null,
		"from":"m 0 -6 l -4 6 l 4 6",
		"to":"m 6 0 l -10 0 l 10 0",
		"width":10,
		"height":12,
		"fill":"none",
		"strokeWidth": 1,
		"delay":600

	},
	"next-zoom": {
		"switch": null,
		"from":"m 0 -6 l 4 6 l -4 6",
		"to":"m -2 -9 l 8 9 l -10 9",
		"width":10,
		"height":12,
		"fill":"none",
		"strokeWidth": 1,
		"delay": 600
	},
	"prev-zoom": {
		"switch": null,
		"from":"m 0 -6 l -4 6 l 4 6",
		"to":"m -2 -9 l -8 9 l 10 9",
		"width":10,
		"height":12,
		"fill":"none",
		"strokeWidth": 1,
		"delay":600
	},
	"rewind": {
		"switch": null,
		"from":"m 0 -6 l -4 6 l 4 6 m 4 -12 l -4 6 l 4 6",
		"to":"m 0 -6 l -4 6 l 4 6 m 6 -6 l -10 0 l 10 0",
		"width":10,
		"height":12,
		"fill":"none",
		"strokeWidth": 1,
		"delay":600
	},
	"fastforward": {
		"switch": null,
		"from":"m 0 -6 l 4 6 l -4 6 m -4 -12 l 4 6 l -4 6",
		"to":"m 0 -6 l 4 6 l -4 6 m -6 -6 l 10 0 l -10 0 ",
		"width":10,
		"height":12,
		"fill":"none",
		"strokeWidth": 1,
		"delay":600
	},
	"duplicate": {
		"switch": null,
		"from":"m -4 -5 l 8 0 l 0 10 l -8 0 z",
		"to":"m -4 -5 l 8 0 l 0 10 l -8 0 z m 3 0 l 0 -3 l 8 0 l 0 10 l -3 0",
		"width":10,
		"height":12,
		"fill":"#999999",
		"strokeWidth": 1,
		"delay":600
	}

};

function createSlider (paper, sliderSpec, x, y, outline){
	var sliderHeight = 1.5 * ui.widgetControlSize;
	var sliderArea = paper.path(outline);
	sliderArea.attr("class", "widgetBackground");

	var linePath = "M " + x + " " + y + "l " + (sliderSpec.width - 20) + " " + 0 ;
	var sliderLine = paper.path(linePath); 
	sliderLine.attr({
		strokeWidth:1,
		id:sliderSpec.id + 'line',
		style:"shape-rendering:crispEdges;",
		stroke:"rgba(230,230,230,1.0)"
	});
	var knobWidth = 3.6*ui.widgetControlSize;

	var knobHeight = 1.5*ui.widgetControlSize;
	var sliderKnob = paper.rect(x+0.5*ui.widgetControlSize,y - knobHeight/2, knobWidth, knobHeight);
	sliderKnob.attr({
		id:sliderSpec.id + 'knob',
		class: "sliderKnob",
		rx:"0.5em",
		ry:"0.5em",
		//style:"shape-rendering:crispEdges;",
		fill:"rgba(200,200,200,1.0)",
		strokeWidth : 1,
		stroke: "rgba(230,230,230,1.0)"
	});
	var sliderKnobLabel = paper.text(x+0.5*ui.widgetControlSize + knobWidth/2.0, y,"-");
	var fontSize = 0.045 * ui.widgetControlSize;
	sliderKnobLabel.attr({
		id: sliderSpec.id+ "knobLabel",
		class:"sliderText",
		dy:"0.3em",
		fontSize:fontSize + "em"
	});
	

	var slider = paper.group(sliderArea,sliderLine,sliderKnob,sliderKnobLabel);
	sliderKnob.data("appId", sliderSpec.appId);
	sliderKnobLabel.data("appId", sliderSpec.appId);
	slider.data('begin', sliderSpec.begin);
	slider.data("appId", sliderSpec.appId);
	slider.data('end', sliderSpec.end);
	slider.data('parts', sliderSpec.parts);
	slider.data('increments', sliderSpec.increments);
	slider.data('call', sliderSpec.call);
	slider.data('appProperty', sliderSpec.appProperty);
	
	function moveSlider(){
		var slider = sliderKnob.parent();
		var halfKnobWidth = sliderKnob.getBBox().w/2.0;
		var bound = sliderArea.getBBox();
		var left = bound.x + 10 + halfKnobWidth ;
		var right = bound.x2 - 10 - halfKnobWidth ;
		var begin = slider.data('begin');
		var end = slider.data('end');
		var parts = slider.data('parts');
		var increments = slider.data('increments');
		var deltaX = (right-left)/parts;
		var app = getProperty(sliderSpec.appHandle,sliderSpec.appProperty);
		var sliderVal = app.handle[app.property];
		var n = Math.floor(0.5 + (sliderVal-begin)/increments);
		var pos = left + n*deltaX;
		var cxVal = sliderKnob.attr('cx');
		
		if(pos < left ){
			return begin;
		}
		else if(pos > right){
			return end;
		}
	
		sliderKnob.animate({x: pos - knobWidth/2.0},100,mina.linear);
		sliderKnobLabel.attr("text", (n+1) +" / "+ end );
		sliderKnobLabel.animate({x: pos},100,mina.linear,moveSlider);
	}
	
	moveSlider();
	
	return slider;
}

function mapMoveToSlider(sliderKnob, pos){
	var slider = sliderKnob.parent();
	var halfKnobWidth = sliderKnob.getBBox().w/2.0;
	var bound = slider.getBBox();
	var left = bound.x + bound.h/2 + halfKnobWidth ;
	var right = bound.x2 - bound.h/2 - halfKnobWidth;
	var begin = slider.data('begin');
	var end = slider.data('end');
	var parts = slider.data('parts');
	var increments = slider.data('increments');

	if(pos < left )
		return begin;
	else if(pos > right) 
		return end;
	
	var knobPos = sliderKnob.attr('cx')?sliderKnob.attr('cx'):sliderKnob.attr('x');	
	var deltaX = (right-left)/parts;
	var n = Math.floor(0.5 + (pos-left)/deltaX);
	var sliderValue = begin + n*increments;
	return sliderValue;
}


function createButton(paper, buttonSpec, cx, cy, rad){
	var buttonRad = rad;
	var buttonBack = paper.circle(cx,cy,buttonRad);
	buttonBack.attr({
		id: buttonSpec.id + "bkgnd",
		fill:"rgba(200,200,200,1.0)",
		strokeWidth : 1,
		stroke: "rgba(230,230,230,1.0)"
	});

	var type = buttonType[buttonSpec.type];
	var pthf = "M " + cx + " " + cy  + " " + type["from"];
	var ptht= "M " + cx + " " + cy  + " " + type["to"];
	var buttonCover = paper.path(pthf);
	var coverWidth = type["width"];
	var coverHeight = type["height"];
	buttonCover.attr({
		id: buttonSpec.id + "cover",
		transform: "s " + (buttonRad/(1.5*coverWidth)) + " " + (buttonRad/coverHeight),
		strokeWidth:type["strokeWidth"],
		stroke:"#000",
		style:"stroke-linecap:round; stroke-linejoin:round",
		fill:type["fill"]
	});
	var button = paper.group(buttonBack,buttonCover);

	buttonCover.data("call",buttonSpec.call);
	buttonCover.data("switch", type["switch"]) ;
	buttonCover.data("from",pthf);
	buttonCover.data("to",ptht);
	buttonCover.data("delay",type["delay"]);
	buttonCover.data("appId", buttonSpec.appId);
	buttonBack.data("appId", buttonSpec.appId);
	button.data("call",buttonSpec.call);
	button.data("appId", buttonSpec.appId);
	return button;
}

function createTextInput(paper, textInputSpec, x, y, outline){
	var uiElementSize = ui.widgetControlSize;
	var tIHeight = 1.5 * uiElementSize;
	var textInputOutline = paper.path(outline);
	textInputOutline.attr("class","widgetBackground");
	var textArea = paper.rect(x,y-tIHeight/2.0,textInputOutline.getBBox().w-50, tIHeight);
	textArea.attr({
		id: textInputSpec.id + "Area",
		fill:"#000000",
		strokeWidth : 1,
		stroke: "#999999"
	});

	var pth = "M " + (x+2) + " " + (y-tIHeight/2.0 +2) + " l 0 " + (tIHeight - 4);
	var blinker = paper.path(pth);
	blinker.attr({
		id: textInputSpec.id + "Blinker",
		stroke:"#ffffff",
		fill:"#ffffff",
		style:"shape-rendering:crispEdges;",
		strokeWidth:1
	});

	var show = function() {
		blinker.animate({"stroke":"#ffffff"},800,mina.easein,hide);
	};

	var hide = function() {
		blinker.animate({"stroke":"#000000"},200,mina.easeout,show);
	};

	var textData = paper.text(x+2, y + tIHeight/2.0 -6,"");
	textData.attr({
		id: textInputSpec.id + "TextData",
		style:"fill: #ffffff; stroke: #ffffff; font-family:sans-serif; font-size:" + (tIHeight-6) + "px; font-weight:lighter; font-style:normal;",
	});
	var textInput = paper.group(textArea,blinker);
	textInput.add(textData);
	textArea.data("appId", textInputSpec.appId);
	textData.data("appId",textInputSpec.appId);
	blinker.data("appId", textInputSpec.appId);
	textInput.data("appId", textInputSpec.appId);
	blinker.data("show", show); // Find out how to stop animating the blinker
	textInput.data("buffer","");
	textInput.data("blinkerPosition",0) ;
	textInput.data("blinkerSuf"," " + (y-tIHeight/2.0 +2) + " l 0 " + (tIHeight - 4));
	textInput.data("left", x+2);
	textInput.data("call", textInputSpec.call);
	textInput.data("head", "");
	textInput.data("prefix", "");
	textInput.data("suffix", "");
	textInput.data("tail", "");
	
	show();

	return textInput;
}


insertText = function(textInput, code, printable){
	var textBox = textInput.select("rect");
	var boxWidth = textBox.attr("width");
	var tAxVal = textInput.data("left"); 
	var rightEnd = tAxVal + parseInt(textBox.attr("width"));
	var pos = textInput.data("blinkerPosition");
	var displayText = '';
	ctrl = textInput.select("text");
	buf = textInput.data("text") || '';	
	
	var head = textInput.data("head");
	var prefix = textInput.data("prefix");
	var suffix = textInput.data("suffix");
	var tail = textInput.data("tail");
	switch (code){
		case 37://left
			if (prefix.length > 0){
				suffix = prefix.slice(-1) + suffix;
				prefix = prefix.slice(0,-1);
			}
			else if (head.length > 0){
				suffix = head.slice(-1) + suffix;
				head = head.slice(0,-1);
			}
			break;
		case 39://right
			if (suffix.length > 0){
				prefix = prefix + suffix.slice(0,1);
				suffix = suffix.slice(1);
			}
			else if (tail.length > 0){
				prefix = prefix + tail.slice(0,1);
				tail = tail.slice(1);
			}
			break;
		case 8://backspace
			if (prefix.length > 0){
				prefix = prefix.slice(0,-1);
			}
			else{
				head = head.slice(0,-1);
			}
			suffix = suffix + tail.slice(0,1);
			tail = tail.slice(1);
			break;
		case 46://delete
			if (suffix.length > 0){
				suffix = suffix.slice(1) + tail.slice(0,1);
			}
			tail = tail.slice(1);
			break;
		default:
			if (printable){
				var temp = (code===32)? ' ' : String.fromCharCode(code);
				prefix = prefix + temp;
			}
	}
	displayText = prefix + suffix;
	ctrl.attr("text",displayText);
	var textWidth = (displayText.length > 0)? ctrl.getBBox().width : 0;
	if (textWidth > boxWidth - 5){
		if (suffix.length > 0){
			tail = suffix.slice(-1) + tail;
			suffix = suffix.slice(0,-1);
		}
		else{
			head = head + prefix.slice(0,1);
			prefix = prefix.slice(1);
		}
	}

	ctrl.attr("text",prefix);
	var pos = (prefix.length > 0)? ctrl.getBBox().width : 0;
	pth = "M " + (textInput.data("left") + pos) + textInput.data("blinkerSuf");
	textInput.select("path").attr({path:pth});
	ctrl.attr("text",prefix + suffix);
	textInput.data("head", head);
	textInput.data("prefix", prefix);
	textInput.data("suffix", suffix);
	textInput.data("tail", tail);

};

getText = function(textInput){
	return textInput.data("head") + textInput.data("prefix") + textInput.data("suffix") + textInput.data("tail");
};

getWidgetControlById = function(ctrl){
	var svgElements = Snap.selectAll('*');
	var requestedSvgElement = null;
	for(var l=0; l< svgElements.length; l++){
		if (svgElements[l].attr("id") === ctrl.ctrlId && svgElements[l].data("appId") === ctrl.appId){
			requestedSvgElement = svgElements[l];
			break;
		}
	}
	return requestedSvgElement;
};

getProperty = function (objectHandle,property){
	var names = property.split('.');
	var handle  = objectHandle;
	var i     = 0;
	for (;i<names.length-1;i++) {
		handle = handle[names[i]];
	}
	return {handle:handle, property:names[i]};
};

getWidgetControlUnderPointer = function(data, offsetX, offsetY){
	var pointerElement = document.getElementById(data.ptrId);
	pointerElement.style.left = (parseInt(pointerElement.style.left) + 10000) + "px"; 
	var widgetControlUnderPointer = Snap.getElementByPoint(data.x-offsetX,data.y-offsetY);
	pointerElement.style.left = (parseInt(pointerElement.style.left) - 10000) + "px";
	var widgetControlId = widgetControlUnderPointer? widgetControlUnderPointer.attr("id"):"";
	if (/control/.test(widgetControlId) || /button/.test(widgetControlId) || /slider/.test(widgetControlId) || /textInput/.test(widgetControlId))
		return widgetControlUnderPointer;
	return null;
};


polarToCartesian = function (radius,theta,center){
	theta = theta * Math.PI / 180.0;
	if (center === undefined || center === null)
		center = {x:0,y:0};
	var x = center.x + radius*Math.cos(theta);
	var y = center.y - radius*Math.sin(theta);
	return {x:x,y:y};
}

/*
String.prototype.width = function(font) {
	var f = font || '12px arial';
	var div = document.createElement('DIV');
	//div.style['width'] = 'auto';
	//div.style['height'] = 'auto';
	div.innerHTML = this;
	div.style['position'] = 'absolute';
	div.style['float'] = 'left';
	div.style['white-space'] = 'nowrap';
	div.style['visibility']= 'hidden';
	div.style['font'] = f ;
	
	document.body.appendChild(div);
	var w = div.offsetWidth;
	document.body.removeChild(div);
  	return w;
}
SAGE2WidgetControlBar.prototype.addLabel = function(data){
	
	var labelHeight = 1.5 * ui.widgetControlSize;
	var l = new SAGE2WidgetControls.label();
	l.id = "label" + this.itemCount;
	l.appId = this.id;
	l.appProperty = data.property;
	l.appHandle = data.appHandle;
	var font = (labelHeight-12) + 'px arial';

	var doubleUs = new Array(data.textLength+1).join('W');
	l.width =  doubleUs.width(font);
	this.items.push(l);
	this.itemCount++;
};
function createLabel(paper, labelSpec, x, y){
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
	function showText(){
		var app = getProperty(labelSpec.appHandle,labelSpec.appProperty);
		var data = app.obj[app.property];
		lData.attr('text',data);
		lData.animate({width:lData.getBBox().width},10,mina.linear,showText);
	}

	showText();
	return label;
}

*/