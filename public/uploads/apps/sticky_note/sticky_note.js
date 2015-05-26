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

var sticky_note = SAGE2_App.extend( {
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.svg  = null;
		this.obj  = null;
		this.text = null;
		this.textLines = [];
		this.enableControls = true;
		this.cloneable = true;
		this.state.buffer = (data.state.bufferEmpty)? "" : data.state.buffer;
		this.state.caretPos = data.state.caretPos || 0;
		this.state.bufferEmpty = false;
		this.state.fileName = "sticky_note" + Date.now();
		this.state.fontSize = data.state.fontSize || "16px";

		this.element.id = "div" + data.id;

		// Set refresh once every 2 sec.
		//this.maxFPS = 1/2;

		this.width = data.width;
		this.height = data.height;
		// Make the SVG element fill the app
		this.svg = Snap("100%","100%");
		this.element.appendChild(this.svg.node);
		this.vh = 1000*data.width/data.height;
		this.vw = 1000;
		this.margin = 0.05*this.vw;
		this.svg.attr("viewBox", "0,0," + this.vw + "," + this.vh);
		this.backColor = [187,238,187];
		this.lineHeight = 1.4;
		
		this.lineColor = this.backColor.diff(60);
		//console.log(this.lineColor);
		
		var rectbg = this.svg.rect(0, 0, this.vw, this.vh);
		rectbg.attr({ fill: "rgba(" + this.backColor.join(",") + ",1.0)", strokeWidth: 0 });
		this.setupWindow();
		this.setText();
		this.controls.addTextInput({defaultText: this.state.fileName, id:"TextInput", caption:"file"});
		this.controls.addButton({type:"duplicate",sequenceNo:3, id:"DuplicateNote"});
		this.controls.addButton({type:"new",sequenceNo:5, id:"NewNote"});
		this.controls.addButton({type:"zoom-in",sequenceNo:8, id:"increaseFont"});
		this.controls.addButton({type:"zoom-out",sequenceNo:9, id:"decreaseFont"});
		this.controls.finishedAddingControls();
		this.requestFileBuffer(this.state.fileName);
		console.log("state:",this.state);
	},

	// get messages from the server through a broadcast call
	onMessage: function(data) {

	},
	setText: function(){
		this.prefixText.innerHTML = this.state.buffer.slice(0,this.state.caretPos).replace(/\r\n|\r|\n/g,"<br>");
		this.suffixText.innerHTML = this.state.buffer.slice(this.state.caretPos).replace(/\r\n|\r|\n/g,"<br>");
	},
	

	load: function(state, date) {
		this.SAGE2CopyState(state);
		if (this.state.bufferEmpty===true){
			this.state.buffer = "";
			this.state.bufferEmpty = false;
		}
		this.setText();
	},

	draw: function(date) {
		// Update the text: instead of storing a variable, querying the SVG graph to retrieve the element
		//this.svg.select("#mytext").attr({ text: date});
	},

	resize: function(date) {
		this.width = parseInt(this.element.style.width);
		this.height = parseInt(this.element.style.height);
		this.setWindowElementSize();
	},

	event: function(eventType, position, user_id, data, date) {
		this.caret.className = "blinking-cursor";
		this.caret.innerHTML = "|";
		if (this.timeoutId!==undefined&&this.timeoutId!==null){
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		this.timeoutId = setTimeout(function(){
			this.caret.className = "";
			this.caret.innerHTML = "";
		}.bind(this),5000);
		if(this.state.bufferEmpty===true){
			this.state.bufferEmpty = false;
		}
		if (eventType === "pointerPress" && (data.button === "left")) {
		}
		else if (eventType === "pointerRelease" && (data.button === "left")) {
		}

		else if (eventType === "keyboard") {
			if(data.character === "m") {
			}
			else if (data.character === "t") {
			}
			else if (data.character === "w") {
			}			
		}

		else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") { // left arrow
			}
			else if (data.code === 38 && data.state === "down") { // up arrow
			}
			else if (data.code === 39 && data.state === "down") { // right arrow
			}
			else if (data.code === 40 && data.state === "down") { // down arrow
			}			
		}
		else if (eventType === "widgetEvent"){
			switch(data.ctrlId){
				case "DuplicateNote":
					this.requestForClone = true;
					break;
				case "NewNote":
					this.requestForClone = true;
					this.state.bufferEmpty = true;
					break;
				case "TextInput":
					this.requestFileBuffer(data.text);
					break;
				case "increaseFont":
					this.state.fontSize = Math.min(parseInt(this.state.fontSize) + 2, 40) + "px";
					this.setFontSize();
					if (this.isOverflowed()){
						this.state.fontSize =  Math.max(parseInt(this.state.fontSize) - 2, 10) + "px";
						this.setFontSize();
					}
					break;
				case "decreaseFont":
					this.state.fontSize =  Math.max(parseInt(this.state.fontSize) - 2, 10) + "px";
					this.setFontSize();
					break;
				default:
					console.log("No handler for:", data.ctrlId);
					break;
			}
		}
		else if (eventType === 'bufferUpdate'){
			var buff = this.state.buffer.split("");
			if (data.data!==null && data.data!==undefined){
				buff.splice(data.index,data.deleteCount,data.data);
			}
			else if (data.deleteCount>0){
				buff.splice(data.index+data.offset,data.deleteCount);
			}
			this.state.buffer = buff.join("");
			this.state.caretPos = data.index + data.offset;
			this.setText();
		}
	},
	quit: function(){
		
	},

	setWindowElementSize: function(){
		this.insetElement.style.left = parseInt(0.05*this.width) +"px";
		this.insetElement.style.top = parseInt(0.05*this.height) + "px";
		this.insetElement.style.width = parseInt(0.9*this.width) +"px";
		this.insetElement.style.height = parseInt(0.9*this.height) +"px";
	},

	setFontSize: function(){
		this.prefixText.style.lineHeight = this.lineHeight;
		this.prefixText.style.fontSize = this.state.fontSize;
		this.prefixText.style.fontFamily = 'arial';
		this.caret.style.fontSize = this.state.fontSize;
		this.caret.style.lineHeight = this.lineHeight;
		this.suffixText.style.lineHeight = this.lineHeight;
		this.suffixText.style.fontSize = this.state.fontSize;
		this.suffixText.style.fontFamily = 'arial';
	},
	setupWindow: function(){
		this.insetElement = document.createElement("span");
		this.insetElement.style.position = "absolute";
		this.insetElement.style.display = "block";
		this.setWindowElementSize();
		this.element.appendChild(this.insetElement);
		
		this.startMarker = document.createElement("span");
		this.startMarker.style.width = "0px";
		this.startMarker.style.height = "0px";
		this.startMarker.style.border = "none";
		this.insetElement.appendChild(this.startMarker);

		this.prefixText = document.createElement("p");
		this.prefixText.id = "prefix";
		
		
		this.prefixText.style.wordWrap = "break-word";
		this.prefixText.style.display = "inline";
		this.prefixText.innerHTML = "";//"Lorem ipsum dolor sit amet,<br> consectetur adipiscing elit.";//" Donec sollicitudin mattis metus, ut dignissim quam consequat id. Quisque massa est, scelerisque a diam nec, condimentum malesuada purus. Phasellus consectetur massa ut mollis sagittis. Nullam ullamcorper augue vitae tempor auctor.";//" Maecenas vitae semper ante. Donec ex justo, tempus eu convallis non, tincidunt nec arcu. Fusce mollis dui a mauris tempor efficitur. Nam eget mollis nulla. Suspendisse feugiat suscipit blandit. Interdum et malesuada fames ac ante ipsum primis in faucibus. Morbi scelerisque nec diam vel molestie. Mauris tristique cursus accumsan. Pellentesque commodo bibendum ex vitae viverra. Vestibulum vitae nisl est. Vivamus imperdiet pulvinar tempus. Proin nec velit metus.";
		this.prefixText.style.textAlign = "justify";
		this.insetElement.appendChild(this.prefixText);

		this.caret = document.createElement("span");
		//this.caret.className = "blinking-cursor";
		
		this.caret.style.border = "none";
		//this.caret.innerHTML = "|";		
		this.insetElement.appendChild(this.caret);


		this.suffixText = document.createElement("p");
		this.suffixText.id = "prefix";
		
		this.suffixText.style.textAlign = "justify";
		this.suffixText.style.wordWrap = "break-word";
		this.suffixText.style.display = "inline";
		//this.suffixText.innerHTML = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sollicitudin mattis metus, ut dignissim quam consequat id. Quisque massa est, scelerisque a diam nec, condimentum malesuada purus. Phasellus consectetur massa ut mollis sagittis. Nullam ullamcorper augue vitae tempor auctor. Maecenas vitae semper ante. Donec ex justo, tempus eu convallis non, tincidunt nec arcu. Fusce mollis dui a mauris tempor efficitur. Nam eget mollis nulla. Suspendisse feugiat suscipit blandit. Interdum et malesuada fames ac ante ipsum primis in faucibus. Morbi scelerisque nec diam vel molestie. Mauris tristique cursus accumsan. Pellentesque commodo bibendum ex vitae viverra. Vestibulum vitae nisl est. Vivamus imperdiet pulvinar tempus. Proin nec velit metus.";
		this.insetElement.appendChild(this.suffixText);
		
		this.endMarker = document.createElement("span");
		this.insetElement.appendChild(this.endMarker);
		this.element.appendChild(this.insetElement);
		this.setFontSize();
	},
	isOverflowed: function(){
    	return this.insetElement.scrollHeight > this.insetElement.clientHeight || this.insetElement.scrollWidth > this.insetElement.clientWidth;
	}
	/*blinkCaret: function(){
		setInterval(function(){
			this.showCaret();
			setTimeout(this.hideCaret,400);
		}, 900);
	},

	hideCaret:function(){
		this.caret.style.border = "none";
	},

	showCaret:function(){
		this.caret.style.border = "solid 1px black";
	}*/


});
