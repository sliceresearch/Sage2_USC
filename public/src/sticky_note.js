// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var sticky_note = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.svg  = null;
		this.cloneable = true;
		this.hasFileBuffer = true;
		this.state.owner = data.state.owner;
		this.state.createdOn = data.state.createdOn;
		this.state.buffer = (data.state.bufferEmpty) ? "" : data.state.buffer;
		this.state.caretPos = data.state.caretPos || 0;
		this.state.bufferEmpty = false;
		this.state.fileName = data.state.fileName || data.state.owner + "Note";
		this.state.fontSize = data.state.fontSize || "32px";

		this.element.id = "div" + data.id;
		this.copyNumber = 1;
		// Set refresh once every 2 sec.
		// this.maxFPS = 1/2;

		this.width = data.width;
		this.height = data.height;
		// Make the SVG element fill the app
		this.svg = Snap("100%", "100%");
		this.element.appendChild(this.svg.node);

		this.svg.attr("viewBox", "0,0," + this.width + "," + this.height);
		this.backColor =  "rgba(187,238,187,1.0)";
		if (data.state.noteColor !== undefined && data.state.noteColor !== null) {
			this.backColor = data.state.noteColor;
		}

		this.lineHeight = 1.4;

		// this.lineColor = this.backColor.diff(60);
		// console.log(this.lineColor);
		this.tailText = "";
		this.rectbg = this.svg.rect(0, 0, this.width, this.height);
		this.rectbg.attr({fill: this.backColor, strokeWidth: 0});
		this.setupWindow();
		this.setText();
		this.controls.addTextInput({value: this.state.fileName, identifier: "TextInput", label: "file"});
		this.controls.addButton({type: "duplicate", position: 3, identifier: "DuplicateNote"});
		this.controls.addButton({type: "new", position: 5, identifier: "NewNote"});
		this.controls.addButton({type: "zoom-in", position: 8, identifier: "increaseFont"});
		this.controls.addButton({type: "zoom-out", position: 9, identifier: "decreaseFont"});
		this.controls.finishedAddingControls();
		// this.requestFileBuffer(this.state.fileName);
		// console.log("state:", this.state);
	},

	// get messages from the server through a broadcast call
	onMessage: function(data) {

	},
	setText: function() {
		this.prefixText.innerHTML = this.state.buffer.slice(0, this.state.caretPos).replace(/\r\n|\r|\n/g, "<br>");
		this.suffixText.innerHTML = this.state.buffer.slice(this.state.caretPos).replace(/\r\n|\r|\n/g, "<br>");
		if (this.isOverflowed()) {
			this.suffixText.innerHTML = this.state.buffer.slice(this.state.caretPos, -1).replace(/\r\n|\r|\n/g, "<br>");
			this.tailText = this.state.buffer.slice(this.state.caretPos, -1) + this.tailText;
		} else if (this.tailText.length > 0) {
			this.suffixText.innerHTML = this.suffixText.innerHTML + this.tailText.slice(0, 1).replace(/\r\n|\r|\n/g, "<br>");
			this.tailText = this.tailText.slice(1);
		}
	},

	load: function(state, date) {
		this.SAGE2CopyState(state);
		if (this.state.bufferEmpty === true) {
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
		this.svg.attr("viewBox", "0,0," + this.width + "," + this.height);
		this.rectbg.attr({
			width: this.width,
			height: this.height
		});
		this.setWindowElementSize();
	},

	event: function(eventType, position, user_id, data, date) {
		this.caret.className = "blinking-cursor";
		this.caret.innerHTML = "|";
		if (this.timeoutId !== undefined && this.timeoutId !== null) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		this.timeoutId = setTimeout(function() {
			this.caret.className = "";
			this.caret.innerHTML = "";
		}.bind(this), 5000);
		if (this.state.bufferEmpty === true) {
			this.state.bufferEmpty = false;
		}
		if (eventType === "pointerPress" && (data.button === "left")) {
			// Handle pointer press events
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			// Handle pointer release events
		} else if (eventType === "keyboard") {
			// Keyboard events are passed to the file buffer. No events to be handled
		} else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") {
				// left arrow
			} else if (data.code === 38 && data.state === "down") {
				// up arrow
			} else if (data.code === 39 && data.state === "down") {
				// right arrow
			} else if (data.code === 40 && data.state === "down") {
				// down arrow
			}
		} else if (eventType === "widgetEvent") {
			switch (data.identifier) {
				case "DuplicateNote":
					this.requestForClone = true;
					break;
				case "NewNote":
					this.requestForClone = true;
					this.state.bufferEmpty = true;
					break;
				case "TextInput":
					this.requestFileBuffer({fileName: data.text, owner: this.state.owner, createdOn: null});
					this.requestNewTitle(data.text);
					break;
				case "increaseFont":
					this.state.fontSize = Math.min(parseInt(this.state.fontSize) + 2, 50) + "px";
					this.setFontSize();
					if (this.isOverflowed()) {
						this.state.fontSize =  Math.max(parseInt(this.state.fontSize) - 2, 10) + "px";
						this.setFontSize();
					}
					break;
				case "decreaseFont":
					this.state.fontSize =  Math.max(parseInt(this.state.fontSize) - 2, 10) + "px";
					this.setFontSize();
					break;
				default:
					console.log("No handler for:", data.identifier);
					break;
			}
		} else if (eventType === 'bufferUpdate') {
			var buff = this.state.buffer.split("");
			if (data.data !== null && data.data !== undefined) {
				buff.splice(data.index, data.deleteCount, data.data);
			} else if (data.deleteCount > 0) {
				buff.splice(data.index + data.offset, data.deleteCount);
			}
			this.state.buffer = buff.join("");
			this.state.caretPos = data.index + data.offset;
			this.setText();
		}
	},
	quit: function() {
		// Clean up code
	},

	setWindowElementSize: function() {
		this.credentialElement.style.right = "5%";
		this.credentialElement.style.top = "5%";
		this.credentialElement.style.lineHeight = 1.0;
		this.credentialElement.style.fontSize = parseInt(0.03 * this.height) + "px";
		this.insetElement.style.left = parseInt(0.05 * this.width) + "px";
		this.insetElement.style.top = parseInt(0.15 * this.height) + "px";
		this.insetElement.style.width = parseInt(0.9 * this.width) + "px";
		this.insetElement.style.height = parseInt(0.8 * this.height) + "px";
	},

	setCredentials: function() {

	},

	setFontSize: function() {
		this.prefixText.style.lineHeight = this.lineHeight;
		this.prefixText.style.fontSize = this.state.fontSize;
		this.prefixText.style.fontFamily = 'arial';
		this.caret.style.fontSize = this.state.fontSize;
		this.caret.style.lineHeight = this.lineHeight;
		this.suffixText.style.lineHeight = this.lineHeight;
		this.suffixText.style.fontSize = this.state.fontSize;
		this.suffixText.style.fontFamily = 'arial';
	},

	setupWindow: function() {
		this.credentialElement = document.createElement("span");
		this.credentialElement.id = "credentials";
		this.credentialElement.style.position = "absolute";
		this.credentialElement.style.display = "block";
		this.credentialElement.style.overflow = "hidden";
		this.credentialElement.innerText = this.state.owner + " : " + this.getCreationTime();
		this.credentialElement.style.fontFamily = 'arial';
		this.credentialElement.style.color = "rgba(80,80,80,0.8)";
		this.element.appendChild(this.credentialElement);

		this.insetElement = document.createElement("span");
		this.insetElement.id = "inset";
		this.insetElement.style.position = "absolute";
		this.insetElement.style.display = "block";
		this.insetElement.style.overflow = "hidden";
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
		this.prefixText.innerHTML = "";
		this.prefixText.style.textAlign = "justify";
		this.insetElement.appendChild(this.prefixText);

		this.caret = document.createElement("span");
		// this.caret.className = "blinking-cursor";
		this.caret.style.border = "none";
		// this.caret.innerHTML = "|";
		this.insetElement.appendChild(this.caret);


		this.suffixText = document.createElement("p");
		this.suffixText.id = "suffix";
		this.suffixText.style.textAlign = "justify";
		this.suffixText.style.wordWrap = "break-word";
		this.suffixText.style.display = "inline";
		this.insetElement.appendChild(this.suffixText);
		this.endMarker = document.createElement("span");
		this.insetElement.appendChild(this.endMarker);
		this.element.appendChild(this.insetElement);
		this.setFontSize();
	},

	getCreationTime: function() {
		moment.locale('en', {
			calendar: {
				lastDay: '[Yesterday,] LT',
				sameDay: '[Today,] LT',
				nextDay: '[Tomorrow,] LT',
				lastWeek: '[last] ddd[,] LT',
				nextWeek: 'ddd[,] LT',
				sameElse: 'L'
			}
		});
		var then = moment(this.state.createdOn);
		return then.calendar();
	},

	isOverflowed: function() {
		return parseInt(this.insetElement.style.height) > parseInt(0.9 * this.height)
			|| this.insetElement.scrollHeight > this.insetElement.clientHeight || this.insetElement.scrollWidth > this.insetElement.clientWidth;
	}
});
