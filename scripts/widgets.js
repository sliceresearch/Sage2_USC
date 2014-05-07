function button(){
	this.appId = null;
	this.id = null;
	this.type = null;
	this.call = null;
};

function slider(){
	this.id = null;
	this.min = null;
	this.max = null;
	this.step = null;
	this.call = null;
	this.val = null;
	this.pVal = null;
};

function textInput(){
	this.id = null;
	this.appId = null;
	this.width = null;
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

widgetSpec.prototype.addSlider = function(mn,mx,st,val,a,action){
	var s = new slider();
	s.id = "slider" + this.itemCount;
	s.min = mn;
	s.max = mx;
	s.step = st < 2 ? 2 : st;
	s.call = action;
	s.val = val;
	s.pVal = null;
	this.items.push(s);
	this.itemCount++;
};

widgetSpec.prototype.addText = function(t) {
		this.items.push({ctrl:"text",value:t});
		this.itemCount++;	
};

widgetSpec.prototype.enumerate = function(){
	return this.items;
};


function computeSize(widgetObj){
	var arr = widgetObj.enumerate();
	var butCount = 0;
	var sliderCount = 0; // total number of steps from all the sliders
	var gap = 10; // distance between widgets
	var sliderUnit = 10;
	var tIwidth = 0;
	for(var i in arr){
		if (arr[i] instanceof button){
			butCount++;
		}
		else if (arr[i] instanceof slider){
			sliderCount += remapVal(arr[i].step);
		}
		else if (arr[i] instanceof textInput){
			tIwidth += arr[i].width;
		}
	}
	return {width : butCount*1.5*titleBarHeight + sliderCount*sliderUnit + (arr.length+1)*gap + tIwidth, height: 2*titleBarHeight};
}

function remapVal(val){
	var r = (val==2)? 10 : (val<20)? 16 : (val<50)? 25 : 40;
	return r;
}

function createControls(ctrId, spec){
	var size = computeSize(spec);
	var buttonRad = 0.75 * titleBarHeight;
	var windowControls = Snap(size.width, size.height);
	var gap = 10;

	windowControls.attr({
		fill: "#000",
		id: ctrId + "SVG"
	});
	
	var ctrHandle = document.getElementById(ctrId + "SVG");
	
	var wArr = spec.enumerate();
	var x = gap;
	var y = titleBarHeight;
	for (var i in wArr){
		if (wArr[i] instanceof button){
			createButton(windowControls,wArr[i],x+buttonRad,y);
			x = x + buttonRad*2 + gap; 
		}
		else if (wArr[i] instanceof textInput){
			createTextInput(windowControls,wArr[i],x,1.75*titleBarHeight);
			x = x + wArr[i].width + gap;
		}

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
		"speed": 400
	},
	"play-stop": {
		"from":"m -5 -5 l 0 10 l 6 -3 l 4 -2 z",
		"to":"m -5 -5 l 0 10 l 10 0 l 0 -10 z",
		"strokeWidth": 2,
		"fill":"#000000",
		"switch": 0,
		"speed": 400
	},
	"next": {
		"switch": null,
		"from":"m 0 -6 l 4 6 l -4 6",
		"to":"m 0 -7 l 0 7 l 0 7",
		"fill":"none",
		"strokeWidth": 2,
		"speed": 600
	},
	"prev": {
		"switch": null,
		"from":"m 0 -6 l -4 6 l 4 6",
		"to":"m 0 -7 l 0 7 l 0 7",
		"fill":"none",
		"strokeWidth": 2,
		"speed":600

	}
};


function createButton(paper, buttonSpec, cx, cy){
	var buttonRad = 0.75 * titleBarHeight;
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
	buttonCover.data("speed",type["speed"]);
	buttonCover.data("appId", buttonSpec.appId);
	buttonBack.data("appId", buttonSpec.appId);
	return button;
}

function createTextInput(paper, textInputSpec, x, y){
	var tIHeight = 1.5 * titleBarHeight;
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
    	pre = str.substring(0,currentPos) + String.fromCharCode(charCode);
		suf = str.substring(currentPos,currentStrLen);
		str = pre + suf;
		flag = true;
		position++;
    }
    else if (charCode === 39)
    {
    	position++;
    }
	else if (charCode === 37){

		position--;
	}
	else if (charCode == 8){
		pre = str.substring(0,currentPos-1);
		suf = str.substring(currentPos,currentStrLen);
		str = pre + suf;
		flag = true;
		position--;
	}
	
	position = (position<0)? 0 : position;
	position = (position>str.length)?str.length:position;
	pre = (position > 0)? str.substring(0,position): "";
	return {data:str, prefix:pre, blinkerPos:position};
}

insertText = function(textInput, code, printable){
	var textArea = textInput.select("rect");
	var tAxVal = textInput.data("left"); 
	var rightEnd = tAxVal + parseInt(textArea.attr("width"));
	var pos = textInput.data("blinkerPos");
	
	ctrl = textInput.select("text");
	buf = ctrl.attr("text");
	
	if (buf.length==0) buf = "";
	buf = computeBlinkerPosition(pos, buf, code, printable);

	var pth = "";
	if(buf.blinkerPos>0){
		ctrl.attr("text",buf.prefix);
		var textWidth = ctrl.getBBox().width;
		
		if (textWidth >= textArea.attr("width")-5){
			ctrl.attr('x', rightEnd-5); // + 
			ctrl.attr('text-anchor','end');
			pth = "M " + (rightEnd-5) + textInput.data("blinkerSuf");
		}
		else{
			ctrl.attr("x", textInput.data('left'));	
			ctrl.attr('text-anchor','start');
			pth = "M " + (textInput.data("left") + textWidth) + textInput.data("blinkerSuf");
		}
	}
	else{
		pth = "M " + textInput.data("left") + textInput.data("blinkerSuf");
	}
	textInput.select("path").attr({path:pth});
	textInput.data("blinkerPos",buf.blinkerPos);
	ctrl.attr("text",buf.data);	
}

getText = function(textInput){
	return textInput.select("text").attr("text");
}