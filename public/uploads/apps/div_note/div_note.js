// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014



Array.prototype.diff = function(num){
	return this.map(function(x){
		return x - num;
	});
}

var div_note = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous"; // "onfinish";
		this.pElement = null;
		this.textNodeElement = null;
		this.obj  = null;
		this.text = null;
		this.textLines = [];
		this.enableControls = true;
		this.cloneable = true;
	},

	init: function(data) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, "div", data);

		// application specific 'init'

		this.element.id = "div" + data.id;

		// Set refresh once every 2 sec.
		//this.maxFPS = 1/2;

		var _myself = this;

		//this.textNodeElement = document.createTextNode("Sample text shown here. it is quite long. it will hopefully go into mulitple lines. If it does not, then I am in big trouble");
		//this.textNodeElement.id = "noteText";
		this.pElement = document.createElement("p");
		this.pElement.id = "notePara";

		this.pElement.style.position = "absolute";
		this.pElement.style.left = parseInt(0.05*data.width) +"px";
		this.pElement.style.top = parseInt(0.05*data.height) + "px";
		this.pElement.style.width = parseInt(0.9*data.width) +"px";
		this.pElement.style.height = parseInt(0.9*data.height) +"px";
		this.pElement.style.lineHeight = 1.5;
		this.pElement.style.fontSize = 16 + "px";
		this.pElement.style.fontFamily = 'arial';
		this.pElement.style.textAlign = "justify";
		//this.pElement.appendChild(this.textNodeElement);
		this.element.appendChild(this.pElement);
		this.element.style.background = "#FCF0AD";
		this.caret = document.createElement("span");
		this.startMarker = document.createElement("span");
		this.endMarker = document.createElement("span");
		this.prefixText = document.createTextNode("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sollicitudin mattis metus, ut dignissim quam consequat id. Quisque massa est, scelerisque a diam nec, condimentum malesuada purus. Phasellus consectetur massa ut mollis sagittis. Nullam ullamcorper augue vitae tempor auctor. Maecenas vitae semper ante. Donec ex justo, tempus eu convallis non, tincidunt nec arcu. Fusce mollis dui a mauris tempor efficitur. Nam eget mollis nulla. Suspendisse feugiat suscipit blandit. Interdum et malesuada fames ac ante ipsum primis in faucibus. Morbi scelerisque nec diam vel molestie. Mauris tristique cursus accumsan. Pellentesque commodo bibendum ex vitae viverra. Vestibulum vitae nisl est. Vivamus imperdiet pulvinar tempus. Proin nec velit metus.");
		this.suffixText = document.createTextNode("");

		this.startMarker.style.width = "0px";
		this.startMarker.style.height = "0px";
		this.startMarker.style.border = "none";

		this.caret.style.width = "0px";
		this.caret.style.border = "1px solid black";
		//this.caret.style.background = "black";
		this.caret.style.height = parseInt(this.pElement.style.fontSize) * this.pElement.style.lineHeight + "px";
		//this.element.appendChild(this.caret);
		console.log(this.pElement.style.fontSize, this.pElement.style.lineHeight);
		//console.log(this.textNodeElement.nodeValue);
		//this.textNodeElement.nodeValue = "Just got this!";
		this.pElement.appendChild(this.startMarker);
		this.pElement.appendChild(this.prefixText);
		this.pElement.appendChild(this.caret);
		this.pElement.appendChild(this.suffixText);

		this.pElement.appendChild(this.endMarker);
		//console.log(document.createTextNode(this.caret).nodeValue);
		this.margin = 0.05*this.vw;
		this.backColor = [175,175,200];

		this.lineColor = this.backColor.diff(60);
		//console.log(this.lineColor);
		
		
		console.log(this.startMarker.offsetLeft,this.caret.offsetLeft,this.endMarker.offsetLeft);
	},



	// get messages from the server through a broadcast call
	onMessage: function(data) {

	},

	
	load: function(state, date) {
		var text = "Enter note";
		/*if (state){
			state.loadData = state.loadData || "";
			if (state.loadData.length > 0){
				this.wrapText(state.loadData);
				text = state.loadData;
			}
				
		}
		this.controls.addTextInput({defaultText: text,action:this.wrapText.bind(this)});
		this.controls.addButton({type:"duplicate",sequenceNo:6,action:function(date){
			this.requestForClone = true;
			this.cloneData = this.text;
		}.bind(this)});
		this.controls.addButton({type:"new",sequenceNo:8,action:function(date){
			this.requestForClone = true;
			this.cloneData = "";
		}.bind(this)});
		this.controls.finishedAddingControls();*/
	},

	draw: function(date) {
		// Update the text: instead of storing a variable, querying the SVG graph to retrieve the element
		//this.svg.select("#mytext").attr({ text: date});
	},

	resize: function(date) {
		// no need, it's SVG!
	},

	event: function(eventType, position, user_id, data, date) {

		if (eventType === "pointerPress" && (data.button === "left")) {
			//console.log(position.x,position.y);
			this.updateCaretPos(position.x,position.y);

		}
		else if (eventType === "pointerRelease" && (data.button === "left")) {
		}

		else if (eventType === "keyboard") {
			this.prefixText.nodeValue = this.prefixText.nodeValue + data.character;
		}

		else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") { // left arrow
				if (this.prefixText.nodeValue.length>0){
					this.suffixText.nodeValue = this.prefixText.nodeValue.slice(-1) + this.suffixText.nodeValue;
					this.prefixText.nodeValue = this.prefixText.nodeValue.slice(0,-1);
				}
			}
			else if (data.code === 38 && data.state === "down") { // up arrow
				this.updateCaretPos(this.caret.offsetLeft,this.caret.offsetTop-parseInt(this.caret.style.height));
			}
			else if (data.code === 39 && data.state === "down") { // right arrow
				if (this.suffixText.nodeValue.length>0){
					this.prefixText.nodeValue = this.prefixText.nodeValue + this.suffixText.nodeValue.slice(0,1);
					this.suffixText.nodeValue = this.suffixText.nodeValue.slice(1);
				}
			}
			else if (data.code === 40 && data.state === "down") { // down arrow
				this.updateCaretPos(this.caret.offsetLeft,this.caret.offsetTop+parseInt(this.caret.style.height));
			}	
			else if (data.code === 46 && data.state === "down"){ // delete
				if (this.suffixText.nodeValue.length>0){
					this.suffixText.nodeValue = this.suffixText.nodeValue.slice(1);
				}
			}	
			else if (data.code === 8 && data.state === "down"){ // delete
				if (this.prefixText.nodeValue.length>0){
					this.prefixText.nodeValue = this.prefixText.nodeValue.slice(0,-1);
				}
			}		
		}
	},

	/*
	insertText = function(textInput, code, printable){
	var textBox = textInput.select("rect");
	var boxWidth = textBox.attr("width");
	var tAxVal = textInput.data("left"); 
	var rightEnd = tAxVal + parseInt(textBox.attr("width"));
	var position= textInput.data("blinkerPosition");
	var displayText = '';
	ctrl = textInput.select("text");
	buf = textInput.data("text") || '';	
	
	var head = textInput.data("head");
	var prefix = textInput.data("prefix");
	var suffix = textInput.data("suffix");
	var tail = textInput.data("tail");
	
	if (printable){
		prefix = prefix + String.fromCharCode(code);
	}else{
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
		}
	}
	displayText = prefix + suffix;
	ctrl.attr("text",displayText);
	var textWidth = (displayText.length > 0)? ctrl.getBBox().width : 0;
	while (textWidth > boxWidth - 5){
		if (suffix.length > 0){
			tail = suffix.slice(-1) + tail;
			suffix = suffix.slice(0,-1);
		}
		else{
			head = head + prefix.slice(0,1);
			prefix = prefix.slice(1);
		}
		displayText = prefix + suffix;
		ctrl.attr("text",displayText);
		textWidth = (displayText.length > 0)? ctrl.getBBox().width : 0;
	}
	ctrl.attr("text", "l");
	var extraspace = ctrl.getBBox().width;
	ctrl.attr("text",prefix + "l");
	var bposition= (prefix.length > 0)? ctrl.getBBox().width - extraspace : 0; // Trailing space is not considered to BBbox width, hence extraspace is a work around
	pth = "M " + (textInput.data("left") + bposition) + textInput.data("blinkerSuf");
	textInput.select("path").attr({path:pth});
	ctrl.attr("text",prefix + suffix);
	textInput.data("head", head);
	textInput.data("prefix", prefix);
	textInput.data("suffix", suffix);
	textInput.data("tail", tail);

};

	*/
	quit: function(){
		
	},

	updateCaretPos: function(x,y){
		var paddingLeft = this.pElement.offsetLeft;
		var paddingTop = this.pElement.offsetTop;
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
			this.suffixText.nodeValue = this.prefixText.nodeValue + this.suffixText.nodeValue;
			this.prefixText.nodeValue = "";
			return;
		}
		else if (y > eyL || (y > eyH && x > ex)){
			this.prefixText.nodeValue = this.prefixText.nodeValue + this.suffixText.nodeValue;
			this.suffixText.nodeValue = "";
			return;
		}

		
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
	}

});

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