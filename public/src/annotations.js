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
 * Annotations client side functionality
 *
 * @class SAGE2Annotations
 */

var SAGE2Annotations = function (){
	this.id = null;
	this.appId = null;
	this.data = null;
	this.windowDiv = null;
	this.show = null;
	this.buttonDiv = null;
	this.textAreas = [];
}

SAGE2Annotations.prototype.makeWindow = function(data){
	var translate = "translate(" + (-ui.offsetX).toString()  + "px," + (-ui.offsetY).toString() + "px)";
	//data.button.width = ui.titleBarHeight;
	this.id = data.id;
	this.appId = data.appId;
	this.data = data.annotationData;
	this.show = data.show;
	
	this.windowDiv = document.createElement("div");
	this.windowDiv.id = data.id;
	this.windowDiv.style.left = data.left.toString()+ "px";
	this.windowDiv.style.top = data.top.toString()+ "px";
	this.windowDiv.style.width = data.width.toString() + "px";
	this.windowDiv.style.height = data.height.toString() + "px";
	this.windowDiv.style.webkitTransform = translate;
	this.windowDiv.style.mozTransform    = translate;
	this.windowDiv.style.transform       = translate;
	this.windowDiv.style.zIndex			 = "20";
	this.windowDiv.style.display		 = "block";
	this.windowDiv.className = "annotationWindow";
	


	this.buttonDiv 							= document.createElement("div");
	this.buttonDiv.style.left 				= data.button.left.toString()+ "px";
	this.buttonDiv.style.top 				= data.button.top.toString()+ "px";
	this.buttonDiv.style.width 				= data.button.width.toString() + "px";
	this.buttonDiv.style.height 			= data.button.height.toString() + "px";
	this.buttonDiv.id 						= data.button.id;
	this.buttonDiv.style.webkitTransform 	= translate;
	this.buttonDiv.style.mozTransform    	= translate;
	this.buttonDiv.style.transform       	= translate;
	this.buttonDiv.style.zIndex				= "20";
	this.buttonDiv.display 					= "block";
	this.buttonDiv.className 				= "annotationButton";

	var buttonText 				= document.createElement("p");
	buttonText.className 		= "annotationButton-text";
	buttonText.style.lineHeight = Math.round(ui.titleBarHeight) + "px";
	buttonText.style.fontSize   = Math.round(ui.titleTextSize) + "px";
	buttonText.style.color      = "#FFFFFF";
	buttonText.style.marginLeft = Math.round(ui.titleBarHeight/4) + "px";
	buttonText.display			= "block";
	buttonText.innerText      = data.button.caption;
	this.buttonDiv.appendChild(buttonText);
	ui.main.appendChild(this.buttonDiv);

	this.makeButtonsForAnnotationWindow(data);
	
	
	console.log("created button");
	this.prepareWindow();
	this.populateWindow();
}

SAGE2Annotations.prototype.populateWindow = function(){
	//A for loop to add individual comments
}

SAGE2Annotations.prototype.makeButtonsForAnnotationWindow = function(data){
	this.addNoteButton						= document.createElement("div");
	this.addNoteButton.style.left 				= data.addButton.left.toString() + "px";
	this.addNoteButton.style.top 				= data.addButton.top.toString() + "px";
	this.addNoteButton.style.width 				= data.addButton.width.toString() + "px";
	this.addNoteButton.style.height 			= data.addButton.height.toString() + "px";
	this.addNoteButton.id 						= data.addButton.id;
	this.addNoteButton.style.zIndex				= "20";
	this.addNoteButton.display 					= "block";
	this.addNoteButton.style.borderRadius		= "2px";
	this.addNoteButton.className 				= "annotationButton";

	var buttonText 				= document.createElement("p");
	buttonText.style.lineHeight = Math.round(ui.titleBarHeight) + "px";
	buttonText.style.fontSize   = Math.round(ui.titleTextSize) + "px";
	buttonText.style.color      = "#FFFFFF";
	buttonText.style.marginLeft = Math.round(ui.titleBarHeight/4) + "px";
	buttonText.display			= "block";
	buttonText.innerText      = data.addButton.caption;
	
	this.addNoteButton.appendChild(buttonText);
	this.windowDiv.appendChild(this.addNoteButton);
}

SAGE2Annotations.prototype.addNote = function(){
	// Create a new text area and set its properties

	var t = new textArea();
	t.init(this.innerDiv, {id: "text"+(this.textAreas.length+1), left: 10, top: 0, width: parseInt(this.innerDiv.style.width)-20, height:140});
	this.textAreas.push(t);
	for (var i = this.textAreas.length-1; i>=0; i--){
		this.textAreas[i].setTop(10 + (this.textAreas.length-1-i)*150);
	}

	var computeKnobHeight = function(){
		var val = parseInt(this.scrollBar.style.height) * parseInt(this.innerDiv.style.height) / parseInt(this.innerDiv.scrollHeight) ;
		return val-4;

	};

	computeKnobHeight = computeKnobHeight.bind(this);
	this.scrollKnob.style.height = computeKnobHeight().toString() + "px";
	
}

SAGE2Annotations.prototype.prepareWindow = function(){
	this.innerDiv = document.createElement("div");
	this.innerDiv.id = "innerWindowID";
	this.innerDiv.className = "innerWindow";
	this.innerDiv.style.left = "6px";
	this.innerDiv.style.top = "6px";
	this.innerDiv.style.width = (parseInt(this.windowDiv.style.width) - ui.titleBarHeight - 15).toString() + "px";
	this.innerDiv.style.height = (parseInt(this.windowDiv.style.height) - ui.titleBarHeight - 15).toString() + "px";
	this.innerDiv.style.display = "block";
	this.innerDiv.style.position = "relative";
	this.innerDiv.style.borderRadius = "3px 3px 3px 3px";
	this.innerDiv.style.backgroundColor = "#89a455";
	this.innerDiv.style.overflow = "hidden";
	this.windowDiv.appendChild(this.innerDiv);

	

	this.scrollBar = document.createElement("div");
	this.scrollBar.id = "scrollBar";
	this.scrollBar.style.left = (parseInt(this.windowDiv.style.width) - ui.titleBarHeight - 6).toString() + "px";
	this.scrollBar.style.top = "6px";
	this.scrollBar.style.width = ui.titleBarHeight.toString() + "px";
	this.scrollBar.style.height = (parseInt(this.windowDiv.style.height) - ui.titleBarHeight - 15).toString() + "px";
	this.scrollBar.style.display = "block";
	this.scrollBar.style.position = "absolute";
	this.scrollBar.style.borderRadius = "3px 3px 3px 3px";
	this.scrollBar.style.backgroundColor = "#aaaaaa";

	this.windowDiv.appendChild(this.scrollBar);

	this.scrollKnob = document.createElement("div");
	this.scrollKnob.id = "scrollKnob";
	this.scrollKnob.style.left = "1px";
	this.scrollKnob.style.top = "2px";
	this.scrollKnob.style.width = (ui.titleBarHeight-4).toString() + "px";
	this.scrollKnob.style.height = (parseInt(this.scrollBar.style.height)-4).toString() + "px";
	this.scrollKnob.style.display = "block";
	this.scrollKnob.style.position = "absolute";
	this.scrollKnob.style.borderRadius = "3px 3px 3px 3px";
	this.scrollKnob.style.border = "solid 1px #000000";
	this.scrollKnob.style.backgroundColor = "#999999";
	this.scrollBar.appendChild(this.scrollKnob);
}	

SAGE2Annotations.prototype.showWindow = function(data){
	console.log("show");
	if (this.show===false){
		console.log("show2");
		this.windowDiv.style.left = data.left.toString() + "px";;
		this.windowDiv.style.top = data.top.toString() + "px";;
		this.buttonDiv.style.top = data.button.top.toString() + "px";;
		this.buttonDiv.style.left = data.button.left.toString() + "px";;
		ui.main.appendChild(this.windowDiv);
		this.show = true;
	}
}

SAGE2Annotations.prototype.hideWindow = function(data){
	console.log("hide");
	if (this.show===true){
		console.log("hide2");
		this.buttonDiv.style.top = data.button.top.toString() + "px";;
		this.buttonDiv.style.left = data.button.left.toString() + "px";;
		ui.main.removeChild(this.windowDiv);
		this.show = false;
	}
}

SAGE2Annotations.prototype.createOrSetMarker = function(data){
	var appWindow = document.getElementById(data.appId);
	var marker = document.getElementById(data.id);
	if (!marker){
		marker 							= document.createElement("div");
		marker.style.width 					= "20px";
		marker.style.height					= "20px";
		marker.id 							= data.id;
		marker.style.zIndex					= "20";
		marker.display 						= "block";
		marker.className 					= "annotationButton";
		appWindow.appendChild(marker);
	}
	marker.style.left 					= (data.position.pointerX -ui.offsetX - parseInt(appWindow.style.left)).toString()+ "px";
	marker.style.top 					= (data.position.pointerY -ui.offsetY +ui.titleBarHeight - parseInt(appWindow.style.top)).toString()+ "px";
	
	

	/*var buttonText 				= document.createElement("p");
	buttonText.className 		= "annotationButton-text";
	buttonText.style.lineHeight = Math.round(ui.titleBarHeight) + "px";
	buttonText.style.fontSize   = Math.round(ui.titleTextSize) + "px";
	buttonText.style.color      = "#FFFFFF";
	buttonText.style.marginLeft = Math.round(ui.titleBarHeight/4) + "px";
	buttonText.display			= "block";
	buttonText.innerText      = data.button.caption;
	this.buttonDiv.appendChild(buttonText);
	ui.main.appendChild(this.buttonDiv);*/
	
}


SAGE2Annotations.prototype.setPosition = function(data){
	//var buttonOffsetLeft = parseInt(this.buttonDiv.style.left) - parseInt(this.windowDiv.style.left);
	//var buttonOffsetTop = parseInt(this.buttonDiv.style.top) - parseInt(this.windowDiv.style.top);
	this.windowDiv.style.left = data.left.toString() + "px";
	this.windowDiv.style.top  = data.top.toString() + "px";
	this.buttonDiv.style.left = (data.button.left).toString() + "px";
	this.buttonDiv.style.top = (data.button.top).toString() + "px";
}


function textArea(){
}

textArea.prototype.setTop = function(val){
	this.element.style.top = parseInt(val) + "px";
}

textArea.prototype.init = function(div, data){
	this.element = document.createElement("span");
	this.element.id = data.id;
	this.element.style.background = "#FCF0AD";
	this.element.style.position = "absolute";
	this.element.style.left = parseInt(data.left) + "px";
	this.element.style.top = parseInt(data.top) + "px";
	this.element.style.width = parseInt(data.width) +"px";
	this.element.style.height = parseInt(data.height) + "px";
	this.element.style.display = "block";
	this.element.style.overflow = "hidden";
	div.appendChild(this.element);

	this.insetElement = document.createElement("span");
	this.insetElement.style.position = "absolute";
	this.insetElement.style.left = parseInt(0.05*data.width) +"px";
	this.insetElement.style.top = parseInt(0.05*data.height) + "px";
	this.insetElement.style.width = parseInt(0.9*data.width) +"px";
	this.insetElement.style.height = parseInt(0.9*data.height) +"px";
	this.insetElement.style.display = "block";
	this.element.appendChild(this.insetElement);
	
	this.startMarker = document.createElement("span");
	this.startMarker.style.width = "0px";
	this.startMarker.style.height = "0px";
	this.startMarker.style.border = "none";
	this.insetElement.appendChild(this.startMarker);

	this.prefixText = document.createElement("p");
	this.prefixText.id = "prefix";
	this.prefixText.style.lineHeight = 1.5;
	this.prefixText.style.fontSize = 16 + "px";
	this.prefixText.style.fontFamily = 'arial';
	this.prefixText.style.wordWrap = "break-word";
	this.prefixText.style.display = "inline";
	this.prefixText.innerHTML = "";//"Lorem ipsum dolor sit amet,<br> consectetur adipiscing elit.";//" Donec sollicitudin mattis metus, ut dignissim quam consequat id. Quisque massa est, scelerisque a diam nec, condimentum malesuada purus. Phasellus consectetur massa ut mollis sagittis. Nullam ullamcorper augue vitae tempor auctor.";//" Maecenas vitae semper ante. Donec ex justo, tempus eu convallis non, tincidunt nec arcu. Fusce mollis dui a mauris tempor efficitur. Nam eget mollis nulla. Suspendisse feugiat suscipit blandit. Interdum et malesuada fames ac ante ipsum primis in faucibus. Morbi scelerisque nec diam vel molestie. Mauris tristique cursus accumsan. Pellentesque commodo bibendum ex vitae viverra. Vestibulum vitae nisl est. Vivamus imperdiet pulvinar tempus. Proin nec velit metus.";
	this.prefixText.style.textAlign = "justify";
	this.insetElement.appendChild(this.prefixText);

	this.caret = document.createElement("span");
	this.caret.style.width = "0px";
	this.caret.style.border = "1px solid black";
	this.caret.style.height = parseInt(this.prefixText.style.fontSize) * this.prefixText.style.lineHeight + "px";
	this.insetElement.appendChild(this.caret);


	this.suffixText = document.createElement("p");
	this.suffixText.id = "prefix";
	this.suffixText.style.lineHeight = 1.5;
	this.suffixText.style.fontSize = 16 + "px";
	this.suffixText.style.fontFamily = 'arial';
	this.suffixText.style.textAlign = "justify";
	this.suffixText.style.wordWrap = "break-word";
	this.suffixText.style.display = "inline";
	//this.suffixText.innerHTML = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sollicitudin mattis metus, ut dignissim quam consequat id. Quisque massa est, scelerisque a diam nec, condimentum malesuada purus. Phasellus consectetur massa ut mollis sagittis. Nullam ullamcorper augue vitae tempor auctor. Maecenas vitae semper ante. Donec ex justo, tempus eu convallis non, tincidunt nec arcu. Fusce mollis dui a mauris tempor efficitur. Nam eget mollis nulla. Suspendisse feugiat suscipit blandit. Interdum et malesuada fames ac ante ipsum primis in faucibus. Morbi scelerisque nec diam vel molestie. Mauris tristique cursus accumsan. Pellentesque commodo bibendum ex vitae viverra. Vestibulum vitae nisl est. Vivamus imperdiet pulvinar tempus. Proin nec velit metus.";
	this.insetElement.appendChild(this.suffixText);
	
	this.endMarker = document.createElement("span");
	this.insetElement.appendChild(this.endMarker);

}

textArea.prototype.event = function(eventType, position, user_id, data, date) {
	if (position.x < parseInt(this.element.style.left) || position.x > (parseInt(this.element.style.left) + parseInt(this.element.style.width)) || position.y < parseInt(this.element.style.top) || position.y > (parseInt(this.element.style.top)+parseInt(this.element.style.height)))
		return;
	if (eventType === "pointerPress" && (data.button === "left")) {
		//console.log(position.x,position.y);
		this.updateCaretPos(position.x,position.y);
		if (this.caret.style.display === "none")
			this.caret.style.display = "inline";

	}
	else if (eventType === "pointerRelease" && (data.button === "left")) {
	}

	else if (eventType === "keyboard") {
		if (data.code ===13)
			this.prefixText.innerHTML = this.prefixText.innerHTML + "<br>";
		else
			this.prefixText.innerHTML = this.prefixText.innerHTML + data.character;
	}

	else if (eventType === "specialKey") {
		var split;
		if (data.code === 37 && data.state === "down") { // left arrow
			if (this.prefixText.innerHTML.length>0){
				split = this.splitLastChar(this.prefixText.innerHTML);
				console.log(split);
				this.suffixText.innerHTML = split.last + this.suffixText.innerHTML;
				this.prefixText.innerHTML = split.first;
			}
		}
		else if (data.code === 38 && data.state === "down") { // up arrow
			this.updateCaretPos(this.caret.offsetLeft,this.caret.offsetTop-parseInt(this.caret.style.height));
		}
		else if (data.code === 39 && data.state === "down") { // right arrow
			if (this.suffixText.innerHTML.length>0){
				split = this.splitFirstChar(this.suffixText.innerHTML);
				this.prefixText.innerHTML = this.prefixText.innerHTML + split.first;
				this.suffixText.innerHTML = split.last;
			}
		}
		else if (data.code === 40 && data.state === "down") { // down arrow
			this.updateCaretPos(this.caret.offsetLeft,this.caret.offsetTop+parseInt(this.caret.style.height));
		}	
		else if (data.code === 46 && data.state === "down"){ // delete
			if (this.suffixText.innerHTML.length>0){
				this.suffixText.innerHTML = this.splitFirstChar(this.suffixText.innerHTML).last;
			}
		}	
		else if (data.code === 8 && data.state === "down"){ // backspace
			if (this.prefixText.innerHTML.length>0){
				this.prefixText.innerHTML = this.splitLastChar(this.prefixText.innerHTML).first;
			}
		}		
	}
}

textArea.prototype.updateCaretPos = function(x,y){
	var paddingLeft = this.insetElement.offsetLeft;
	var paddingTop = this.insetElement.offsetTop;
	x = x - paddingLeft;
	y = y - paddingTop;
	
	var cx = parseInt(this.caret.offsetLeft);
	var cyH = parseInt(this.caret.offsetTop);
	var lineHeight = parseInt(this.caret.style.height);
	y = (parseInt(y/lineHeight) + 0.5) * lineHeight;
	var cyL = cyH + lineHeight;

	var sx = parseInt(this.startMarker.offsetLeft);
	var syH = parseInt(this.startMarker.offsetTop);
	var syL = syH + parseInt(this.caret.style.height);

	var ex = parseInt(this.endMarker.offsetLeft);
	var eyH = parseInt(this.endMarker.offsetTop);
	var eyL = eyH + parseInt(this.caret.style.height);

	if (y < syH || (y < syL && x < sx)){
		this.suffixText.innerHTML = this.prefixText.innerHTML + this.suffixText.innerHTML;
		this.prefixText.innerHTML = "";
		return;
	}
	else if (y > eyL || (y > eyH && x > ex)){
		this.prefixText.innerHTML = this.prefixText.innerHTML + this.suffixText.innerHTML;
		this.suffixText.innerHTML = "";
		return;
	}

	/*
	var buffer;
	var editVal;

	//assuming we are searching current suffix
	var low = 0;
	var high = this.prefixText.nodeValue.length +this.suffixText.nodeValue.length - 1;

	var fhalf;
	var shalf;
	while(low < high){
		mid = (low+high)/2;
		fhalf = (this.prefixText.nodeValue + this.suffixText.nodeValue).slice(0,mid);
		shalf = (this.prefixText.nodeValue + this.suffixText.nodeValue).slice(mid);
		this.prefixText.nodeValue = fhalf;
		this.suffixText.nodeValue = shalf;
		console.log(fhalf.length +","+shalf.length);
		cyH = parseInt(this.caret.offsetTop);
		cx = parseInt(this.caret.offsetLeft);
		cyL = cyH + lineHeight;
		if (whitinRangeOfPoint(x,y,cx-4,cyH,cx+4,cyL)){
			console.log("whitinRangeOfPoint");
			break;
		}
		else if(isPoint1BehindPoint2(x,y,cx,cyH)){
			high = mid -1;
			
		}
		else{
			low = mid + 1;
			
		}
	}
	//console.log(text);
	*/
}

textArea.prototype.splitLastChar = function(htmlText){
	var numberOfChars = 1;
	if (htmlText.lastIndexOf("<br>") >= htmlText.length-4) numberOfChars =htmlText.length-htmlText.lastIndexOf("<br>");
	return {first:htmlText.slice(0,-numberOfChars),last:htmlText.slice(-numberOfChars)};
},
textArea.prototype.splitFirstChar = function(htmlText){
	var numberOfChars = 1;
	if (htmlText.indexOf("<br>") === 0) numberOfChars = 4;
	return {first:htmlText.slice(0,numberOfChars),last:htmlText.slice(numberOfChars)};
}

isPoint1BehindPoint2 = function(x1,y1,x2,y2){
	if (y1 < y2)
		return true;
	else if (y1 > y2)
		return false;
	if (x1 < x2)
		return true;
	return false;
}

whitinRangeOfPoint = function(x, y, xmin, ymin, xmax, ymax){
	if (x > xmin && x <= xmax && y > ymin && y < ymax )
		return true;
	return false;
}