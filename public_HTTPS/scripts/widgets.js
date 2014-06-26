// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

function button(){
	this.appId = null;
	this.id = null;
	this.type = null;
	this.call = null;
};

function slider(){
	this.id = null;
	this.appId = null;
	this.begin = null;
	this.end = null;
	this.increments = null;
	this.parts = null;
	this.call = null;
	this.appObj = null;
	this.appProperty = null;
	this.sliderVal = null;
};

function textInput(){
	this.id = null;
	this.appId = null;
	this.width = null;
}

function label(){
	this.id = null;
	this.appObj = null;
	this.appId = null;
	this.width = null;
	this.appProperty = null;
}

function widgetSpec(id){
	this.id = id;
	this.itemCount = 0;
	this.items = [];
};
widgetSpec.prototype.addButton = function(data) {
	var b = new button();
	b.appId = this.id;
	b.id = "button" + this.itemCount;
	b.type = data.type;
	b.call = data.action;
	b.width = 1.5*ui.titleBarHeight;
	this.items.push(b);
	this.itemCount++;
}
widgetSpec.prototype.addTextInput = function (data) {
	var tI = new textInput();
	tI.id = "textInput" + this.itemCount;
	tI.appId = this.id;
	tI.width = data.width;
	tI.call = data.action;
	this.items.push(tI);
	this.itemCount++;
}

widgetSpec.prototype.addSlider = function(data){
	//begin,parts,end,action, property, appObj
	var s = new slider();
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
	s.appObj = data.appObj;
	s.sliderVal = data.begin;
	s.width = (s.parts < 10)? 8.0*ui.titleBarHeight: 12.0*ui.titleBarHeight;
	this.items.push(s);
	this.itemCount++;
};

widgetSpec.prototype.addLabel = function(data){
	//begin,parts,end,action, property, appObj
	var l = new label();
	l.id = "label" + this.itemCount;
	l.appId = this.id;
	l.appProperty = data.property;
	l.appObj = data.appObj;
	l.width = data.width;
	this.items.push(l);
	this.itemCount++;
};


widgetSpec.prototype.enumerate = function(){
	return this.items;
};


function computeSize(widgetObj){
	var arr = widgetObj.enumerate();
	var gap = 10; // distance between widgets
	var totalWidth = gap;
	for(var i in arr){
		totalWidth += arr[i].width;
		totalWidth += gap;
	}
	return {width : totalWidth, height: 2*ui.titleBarHeight};
}


function createControls(ctrId, spec){
	var size = computeSize(spec);
	var buttonRad = 0.75 * ui.titleBarHeight;
	var windowControls = Snap(size.width, size.height);
	var gap = 10;

	windowControls.attr({
		fill: "#000",
		id: ctrId + "SVG"
	});
	
	var ctrHandle = document.getElementById(ctrId + "SVG");
	
	var wArr = spec.enumerate();
	var x = gap;
	var y = ui.titleBarHeight;
	for (var i in wArr){
		if (wArr[i] instanceof button){
			createButton(windowControls,wArr[i],x+buttonRad,y);
		}
		else if (wArr[i] instanceof textInput){
			createTextInput(windowControls,wArr[i],x,1.75*y); // The bottom left corner of the rect
		}
		else if (wArr[i] instanceof slider){
			createSlider(windowControls,wArr[i],x,y);
		}
		else if (wArr[i] instanceof label){
			createLabel(windowControls,wArr[i],x,1.75*y); //Bottom left
		}
		x = x + wArr[i].width + gap;
	}

	return ctrHandle;
}

var buttonType = {
	"play-pause": {
		"from":"m -5 -5 l 0 10 l 6 -3 l 4 -2 z",
		"to":"m -2 -5 l 0 10 m 4 0 l 0 -10",
		"strokeWidth": 2,
		"fill":"#000000",
		"switch": 0,
		"delay": 400
	},
	"play-stop": {
		"from":"m -5 -5 l 0 10 l 6 -3 l 4 -2 z",
		"to":"m -5 -5 l 0 10 l 10 0 l 0 -10 z",
		"strokeWidth": 2,
		"fill":"#000000",
		"switch": 0,
		"delay": 400
	},
	"next": {
		"switch": null,
		"from":"m 0 -6 l 4 6 l -4 6",
		"to":"m -6 0 l 6 0 l -6 0",
		"fill":"none",
		"strokeWidth": 2,
		"delay": 600
	},
	"prev": {
		"switch": null,
		"from":"m 0 -6 l -4 6 l 4 6",
		"to":"m 6 0 l -6 0 l 6 0",
		"fill":"none",
		"strokeWidth": 2,
		"delay":600

	},
	"next-zoom": {
		"switch": null,
		"from":"m 0 -6 l 4 6 l -4 6",
		"to":"m -2 -9 l 8 9 l -10 9",
		"fill":"none",
		"strokeWidth": 2,
		"delay": 600
	},
	"prev-zoom": {
		"switch": null,
		"from":"m 0 -6 l -4 6 l 4 6",
		"to":"m -2 -9 l -8 9 l 10 9",
		"fill":"none",
		"strokeWidth": 2,
		"delay":600
	},
	"rewind": {
		"switch": null,
		"from":"m 0 -6 l -4 6 l 4 6 m 4 -12 l -4 6 l 4 6",
		"to":"m 0 -6 l -4 6 l 4 6 m 4 -6 l -8 0 l 8 0",
		"fill":"none",
		"strokeWidth": 2,
		"delay":600
	},
	"fastforward": {
		"switch": null,
		"from":"m 0 -6 l 4 6 l -4 6 m 4 -12 l 4 6 l -4 6",
		"to":"m 0 0 l 4 0 l -4 0 m 4 -6 l 4 6 l -4 6 ",
		"fill":"none",
		"strokeWidth": 2,
		"delay":600
	}

};

function createSlider (paper, sliderSpec, x, y){
	var sliderHeight = 1.5 * ui.titleBarHeight;
	var sliderArea = paper.rect(x,y-sliderHeight/2.0,sliderSpec.width, sliderHeight);
	sliderArea.attr({
		id: sliderSpec.id + "Area",
		fill:"#000000",
		strokeWidth : 1,
		stroke: "#999999"
	});

	var linePath = "M " + (x+0.5*ui.titleBarHeight) + " " + y + "l " + (sliderSpec.width - ui.titleBarHeight) + " " + 0 ;
	var sliderLine = paper.path(linePath); 
	sliderLine.attr({
		strokeWidth:1,
		id:sliderSpec.id + 'line',
		style:"shape-rendering:crispEdges;",
		stroke:"#888"
	});

	var sliderKnob = paper.circle(x+0.5*ui.titleBarHeight,y, 0.25*ui.titleBarHeight);
	sliderKnob.attr({
		id:sliderSpec.id + 'knob',
		style:"shape-rendering:crispEdges;",
		fill:"#aaa",
		stroke:"#666",
		strokeWidth:1
	});
	var slider = paper.group(sliderArea,sliderLine,sliderKnob);
	sliderKnob.data("appId", sliderSpec.appId);
	slider.data('begin', sliderSpec.begin);
	slider.data("appId", sliderSpec.appId);
	slider.data('end', sliderSpec.end);
	slider.data('parts', sliderSpec.parts);
	slider.data('increments', sliderSpec.increments);
	slider.data('call', sliderSpec.call);
	slider.data('appProperty', sliderSpec.appProperty);
	
	function moveSlider(){
		var slider = sliderKnob.parent();
		var bound = sliderArea.getBBox();
		var left = bound.x + bound.h/2;
		var right = bound.x2 - bound.h/2;
		var begin = slider.data('begin');
		var end = slider.data('end');
		var parts = slider.data('parts');
		var increments = slider.data('increments');
		var incX = (right-left)/parts;
		var app = getProperty(sliderSpec.appObj,sliderSpec.appProperty);
		var sliderVal = app.obj[app.property];
		var n = Math.floor(0.5 + (sliderVal-begin)/increments);
		var pos = left + n*incX;
		var cxVal = sliderKnob.attr('cx');
		
		if(pos < left ){
			return begin;
		}
		else if(pos > right){
			return end;
		}
	
		sliderKnob.animate({cx: pos},100,mina.linear,moveSlider);
	}
	
	moveSlider();
	
	return slider;
}

function mapMoveToSlider(sliderKnob, pos){
	var slider = sliderKnob.parent();
	var bound = slider.getBBox();
	var left = bound.x + bound.h/2;
	var right = bound.x2 - bound.h/2;
	var begin = slider.data('begin');
	var end = slider.data('end');
	var parts = slider.data('parts');
	var increments = slider.data('increments');

	if(pos < left )
		return begin;
	else if(pos > right) 
		return end;
	
	var knobPos = sliderKnob.attr('cx')?sliderKnob.attr('cx'):sliderKnob.attr('x');	
	var incX = (right-left)/parts;
	var n = Math.floor(0.5 + (pos-left)/incX);
	var sliderValue = begin + n*increments;
	slider.data('sliderValue', sliderValue);
	return sliderValue;
}


function createButton(paper, buttonSpec, cx, cy){
	var buttonRad = 0.75 * ui.titleBarHeight;
	var buttonBack = paper.circle(cx,cy,buttonRad);
	buttonBack.attr({
		id: buttonSpec.id + "bkgnd",
		fill:"#baba55",
		strokeWidth : 2,
		stroke: "#000"
	});

	var type = buttonType[buttonSpec.type];
	var pthf = "M " + cx + " " + cy  + " " + type["from"];
	var ptht= "M " + cx + " " + cy  + " " + type["to"];
	var buttonCover = paper.path(pthf);
	buttonCover.attr({
		id: buttonSpec.id + "cover",
		transform: "s " + parseInt(buttonRad/8) + " " + parseInt(buttonRad/8),
		strokeWidth:type["strokeWidth"],
		stroke:"#000",
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

function createTextInput(paper, textInputSpec, x, y){
	var tIHeight = 1.5 * ui.titleBarHeight;
	var textArea = paper.rect(x,y-tIHeight,textInputSpec.width, tIHeight);
	textArea.attr({
		id: textInputSpec.id + "Area",
		fill:"#000000",
		strokeWidth : 1,
		stroke: "#999999"
	});

	var pth = "M " + (x+2) + " " + (y-2) + " l 0 -" + (tIHeight - 4);
	var blinker = paper.path(pth);
	blinker.attr({
		id: textInputSpec.id + "Blinker",
		stroke:"#ffffff",
		fill:"#ffffff",
		style:"shape-rendering:crispEdges;",
		strokeWidth:1
	});

	var show = function(){
		blinker.animate({"stroke":"#ffffff"},800,mina.easein,hide);
	}

	var hide = function(){
		blinker.animate({"stroke":"#000000"},200,mina.easeout,show);
	}
	var textData = paper.text(x+2, y-8,"");
	textData.attr({
		id: textInputSpec.id + "TextData",
		style:"fill: #ffffff; stroke: #ffffff; shape-rendering:crispEdges; font-family:georgia; font-size:" + (tIHeight-6) + "px; font-weight:lighter; font-style:normal;",
		clipPath:paper.rect(x+2,y-tIHeight, textInputSpec.width,tIHeight)
	});
	var textInput = paper.group(textArea,blinker);
	textInput.add(textData);
	textArea.data("appId", textInputSpec.appId);
	textData.data("appId",textInputSpec.appId);
	blinker.data("appId", textInputSpec.appId);
	textInput.data("appId", textInputSpec.appId);
	blinker.data("show", show); // Find out how to stop animating the blinker
	textInput.data("buffer","");
	textInput.data("blinkerPos",0) ;
	textInput.data("blinkerSuf"," " + (y-2) + " l 0 -" + (tIHeight - 4));
	textInput.data("left", x+2);
	textInput.data("call", textInputSpec.call);
	
	show();

	return textInput;
}

function computeBlinkerPosition (currentPos, str, charCode, printable){
	var position = currentPos;
	var currentStrLen = str.length;
	var pre = "";
	var suf = "";
	var flag = false;
	console.log(charCode);
	//var printable = (charCode > 31 && charCode < 137) ;// spacebar & return key(s) (if you want to allow carriage returns)
        
    if (printable){
    	var temp = (charCode===32)? ' ' : String.fromCharCode(charCode);
    	pre = str.substring(0,currentPos) + temp;
		suf = str.substring(currentPos,currentStrLen);
		str = pre + suf;
		position++;
    }
    else if (charCode === 39)
    {
    	pre = str.substring(0,currentPos+1);
		suf = str.substring(currentPos+1,currentStrLen);
		str = pre + suf;
    	position++;
    }
	else if (charCode === 37){
		pre = (currentPos===1)? '' : str.substring(0,currentPos-1);
		suf = str.substring(currentPos-1,currentStrLen);
		str = pre + suf;
		position--;
	}
	else if (charCode == 8){
		pre = (currentPos===1)? '' : str.substring(0,currentPos-1);
		suf = str.substring(currentPos,currentStrLen);
		str = pre + suf;
		position--;
	}
	else if (charCode == 46){
		pre = (currentPos===0)? '' : str.substring(0,currentPos);
		suf = str.substring(currentPos+1,currentStrLen);
		str = pre + suf;
	}
	
	position = (position<0)? 0 : position;
	position = (position>str.length)?str.length:position;
	//pre = (position > 0)? str.substring(0,position): "";
	return {data:str, prefix:pre, blinkerPos:position};
}

insertText = function(textInput, code, printable){
	var textArea = textInput.select("rect");
	var tAxVal = textInput.data("left"); 
	var rightEnd = tAxVal + parseInt(textArea.attr("width"));
	var pos = textInput.data("blinkerPos");
	var displayText = '';
	ctrl = textInput.select("text");
	buf = textInput.data("text") || '';	
	
	if (buf.length==0) buf = "";
	buf = computeBlinkerPosition(pos, buf, code, printable);

	var pth = "";
	
	ctrl.attr("text",buf.prefix);
	var textWidth = (buf.prefix.length > 0)? ctrl.getBBox().width : 0;
	
	if (textWidth >= textArea.attr("width")-5){
		ctrl.attr('x', rightEnd-5); // + 
		ctrl.attr('text-anchor','end');
		pth = "M " + (rightEnd-5) + textInput.data("blinkerSuf");
		displayText = buf.prefix;
	}
	else{
		ctrl.attr("x", textInput.data('left'));	
		ctrl.attr('text-anchor','start');
		pth = "M " + (textInput.data("left") + textWidth) + textInput.data("blinkerSuf");
		displayText = buf.data;
	}
	textInput.select("path").attr({path:pth});
	textInput.data("blinkerPos",buf.blinkerPos);
	ctrl.attr("text",displayText);
	textInput.data("text", buf.data);	
}

getText = function(textInput){
	return textInput.select("text").attr("text");
}

getCtrl = function(data){
	var lst = Snap.selectAll('*');
	var ctrl = null;
	for(var l=0; l< lst.length; l++){
		if (lst[l].attr("id") === data.ctrlId && lst[l].data("appId") === data.appId){
			ctrl = lst[l];
			break;
		}
	}
	return ctrl;
}

getProperty = function (obj,property){
	var names = property.split('.');
	var prop = obj;
	var i = 0;
	for(;i<names.length-1;i++){
		prop = prop[names[i]]
	}
	return {obj:prop, property:names[i]};
}

getCtrlUnderPointer = function(data, offsetX, offsetY){
	var ptr = document.getElementById(data.ptrId);
	ptr.style.left = (parseInt(ptr.style.left) - 500) + "px"; 
	var ctrl = Snap.getElementByPoint(data.x-offsetX,data.y-offsetY);
	ptr.style.left = (parseInt(ptr.style.left) + 500) + "px";
	var ctrId = ctrl? ctrl.attr("id"):"";
	if (/control/.test(ctrId) || /button/.test(ctrId) || /slider/.test(ctrId) || /textInput/.test(ctrId))
		return ctrl;
	return null;
}

function createLabel(paper, labelSpec, x, y){
	var lHeight = 1.5 * ui.titleBarHeight;
	var lArea = paper.rect(x,y-lHeight,labelSpec.width, lHeight);
	lArea.attr({
		id: labelSpec.id + "Area",
		fill:"#666666",
		strokeWidth : 1,
		stroke: "#666666"
	});

	
	var lData = paper.text(x+2, y-8,"");
	lData.attr({
		id: labelSpec.id + "TextData",
		style:"fill: #000000; stroke: #000000; shape-rendering:crispEdges; font-family:georgia; font-size:" + (lHeight-12) + "px; font-weight:lighter; font-style:normal;"
		//clipPath:paper.rect(x+2,y-lHeight, labelSpec.width,lHeight)
	});
	var label = paper.group(lArea,lData);
	
	lArea.data("appId", labelSpec.appId);
	lData.data("appId",labelSpec.appId);
	label.data("appId", labelSpec.appId);
	
	//label.data("left", x+2);
	function showText(){
		var app = getProperty(labelSpec.appObj,labelSpec.appProperty);
		var data = app.obj[app.property];
		lData.attr('text',data);
		lData.animate({width:lData.getBBox().width},10,mina.linear,showText);
	}

	showText();
	return label;
}
