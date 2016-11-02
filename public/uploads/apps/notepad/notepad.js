//
// SAGE2 application: notepad
// by: Krishna Bharadwaj <kbhara5@uic.edu>
//
// Copyright (c) 2015
//

"use strict";

/* global  */
if (!String.prototype.splice) {

	/**
	 * {JSDoc}
	 *
	 * The splice() method changes the content of a string by removing a range of
	 * characters and/or adding new characters.
	 *
	 * @this {String}
	 * @param {number} start Index at which to start changing the string.
	 * @param {number} delCount An integer indicating the number of old chars to remove.
	 * @param {string} newSubStr The String that is spliced in.
	 * @return {string} A new string with the spliced substring.
	 */
	String.prototype.splice = function(start, delCount, newSubStr) {
		return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
	};
}

function getPosition(str, m, i) {
	return str.split(m, i).join(m).length;
}

var notepad = SAGE2_App.extend({
	init: function(data) {

		// Create div into the DOM
		this.SAGE2Init("div", data);
		this.cloneable = true;
		this.state.owner = data.state.owner;
		this.state.createdOn = data.date;
		this.state.buffer = (data.state.bufferEmpty) ? "" : data.state.buffer;
		this.state.cursorTable = data.state.cursorTable || {};
		this.state.bufferEmpty = false;
		this.state.fileName = data.state.fileName || "untitled";
		this.state.fontSize = data.state.fontSize || "32px";
		// Set the DOM id
		this.element.id = "div_" + data.id;
		// Set the background to black
		this.element.style.backgroundColor = 'black';

		// move and resize callbacks
		this.resizeEvents = "onfinish";
		// this.moveEvents   = "continuous";

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;
		this.colorSchemeTable = [];
		this.colorSchemeIndex = 0;

		this.enableControls = true;
		this.fontSize = 18.0;
		this.fontScaleFactor = this.fontSize / this.getMinDim();

		this.createRuler();
		this.setupDivElements();
		this.makeColorSchemeTable();

		if (this.writeArea.scrollHeight === this.writeArea.clientHeight) {
			var n = this.getNumberOfLines(false);
			this.state.buffer = this.appendEmptyLines(this.state.buffer, n);
		}

		//this.controls.addButton({label: "color", position: 4, identifier: "color"});
		this.controls.addButton({type: "zoom-in", position: 8, identifier: "increaseFont"});
		this.controls.addButton({type: "zoom-out", position: 9, identifier: "decreaseFont"});
		//this.controls.addButton({type: "new", position: 5, identifier: "NewNote"});
		this.controls.addRadioButton({identifier: "colorScheme",
			label: "Theme",
			options: ["Dark", "Lite", "Cofi", "Blue"],
			default: "Dark"
		});
		//TODO: Need to fetch user id and feed it as Owner
		if (this.state.file) {
			console.log(this.state.file);
			readFile(this.state.file, function(error, fileContent) {
				if (error === null || error === undefined) {
					var fileName = this.state.file;
					var end = fileName.lastIndexOf('.');
					end = (end > -1) ? end : fileName.length;
					fileName = fileName.slice(fileName.lastIndexOf('/') + 1, end);
					this.state.fileName = fileName;
					this.requestFileBuffer({
						fileName: fileName,
						extension: "md",
						owner: this.state.owner,
						createdOn: data.date,
						content: fileContent
					});
					this.requestNewTitle(fileName + ' - notepad');
					this.controls.addTextInput({value: this.state.fileName, identifier: "TextInput", label: "File"});
					this.controls.finishedAddingControls();
					this.state.buffer = fileContent;
					this.refresh(data.date);
				}
			}.bind(this));
		} else {
			this.requestFileBuffer({
				fileName: this.state.fileName,
				extension: "md", owner: this.state.owner,
				createdOn: data.date,
				content: this.state.buffer
			});
			this.requestNewTitle(this.state.fileName + ' - notepad');
			this.controls.addTextInput({value: this.state.fileName, identifier: "TextInput", label: "File"});
			this.controls.finishedAddingControls();
		}

		this.changeColorScheme("Dark");
		console.log("end of init");
	},

	getMinDim: function() {
		return Math.min(this.element.clientWidth, this.element.clientHeight);
	},

	setFontSize: function(newSize) {
		this.fontSize = newSize;
		this.fontScaleFactor = this.fontSize / this.getMinDim();
		this.computeDimensions();
		this.scrollKnob.style.top = parseInt(this.writeArea.scrollTop / this.writeArea.scrollHeight
			* parseInt(this.scrollBar.style.height)) + "px";
	},

	setupDivElements: function() {
		var leftMargin = this.makeDivElement({
			id: this.element.id + "leftMargin",
			type: "span",
			options: {
				id: this.element.id + "leftMargin"
			},
			style: {
				position: 'absolute',
				display: 'block',
				overflow: 'hidden',
				wordWrap: 'break-word',
				lineHeight: 1.2,
				color: 'rgba(150,90,90,1.0)',
				fontSize: parseInt(this.fontScaleFactor * this.getMinDim()) + "px",
				backgroundColor: 'rgba(0,0,0,1.0)',
				textAlign: "right"
			}
		}, true);

		var scrollBar = this.makeDivElement({
			id: this.element.id + "scrollBar",
			type: "div",
			options: {
				id: this.element.id + "scrollBar"
			},
			style: {
				position: 'absolute',
				display: 'block',
				borderRadius: "3px 3px 3px 3px",
				backgroundColor: 'rgba(30,30,30,1.0)'
			}
		}, true);

		var scrollKnob = this.makeDivElement({
			id: this.element.id + "scrollKnob",
			type: "div",
			options: {
				id: this.element.id + "scrollKnob"
			},
			style: {
				position: 'absolute',
				display: 'block',
				borderRadius: "3px 3px 3px 3px",
				backgroundColor: 'rgba(90,90,90,1.0)'
			}
		}, true);

		var writeArea = this.makeDivElement({
			id: this.element.id + "writeArea",
			type: "span",
			options: {
				id: this.element.id + "writeArea"
			},
			style: {
				display: 'block',
				position: 'absolute',
				overflow: 'hidden',
				wordWrap: 'break-word',
				lineHeight: 1.2,
				color: 'rgba(150,90,90,1.0)',
				fontSize: parseInt(this.fontScaleFactor * this.getMinDim()) + "px",
				backgroundColor: 'rgba(0,0,0,1.0)'
			}
		}, true);
		this.element.appendChild(scrollBar);
		this.element.appendChild(leftMargin);
		this.element.appendChild(writeArea);
		this.scrollBar = scrollBar;
		this.scrollBar.appendChild(scrollKnob);
		this.scrollKnob = scrollKnob;
		this.writeArea = writeArea;
		this.leftMargin = leftMargin;
		this.makeCaretHTML();
		this.computeDimensions();
	},

	computeDimensions: function() {
		var scrollBarWidth = parseInt(this.config.ui.titleBarHeight * 0.4);
		var marginWidth = this.computeVisualLengthOfString('9999');
		this.makeDivElement({
			id: this.element.id + "leftMargin",
			style: {
				left: '5px',
				top: '10px',
				height: (parseInt(this.element.clientHeight) - 20).toString() + 'px',
				width: marginWidth + 'px',
				fontSize: parseInt(this.fontScaleFactor * this.getMinDim()) + "px"
			}
		}, false);

		this.makeDivElement({
			id: this.element.id + "scrollBar",
			style: {
				right: '5px',
				top: '10px',
				height: (parseInt(this.element.clientHeight) - 20).toString() + 'px',
				width: scrollBarWidth + "px"
			}
		}, false);

		this.makeDivElement({
			id: this.element.id + "scrollKnob",
			style: {
				left: (parseInt(scrollBarWidth * 0.25)).toString() + "px",
				top: '0px',
				width: (parseInt(scrollBarWidth * 0.5)).toString() + "px",
				height: (parseInt(this.element.clientHeight) - 20).toString() + 'px'
			}
		}, false);

		this.makeDivElement({
			id: this.element.id + "writeArea",
			style: {
				left: (marginWidth + 10).toString() + 'px',
				top: '10px',
				height: (parseInt(this.element.clientHeight) - 20).toString() + 'px',
				width: (parseInt(this.element.clientWidth) - scrollBarWidth - marginWidth - 20).toString() + "px",
				fontSize: parseInt(this.fontScaleFactor * this.getMinDim()) + "px"
			}
		}, false);
		this.makeDivElement({
			id: this.ruler.id,
			style: {
				fontSize: this.writeArea.style.fontSize, lineHeight: this.writeArea.style.lineHeight
			}
		}, false);
		this.caretHandle.style.fontSize = this.writeArea.style.fontSize;
		this.caretHandle.style.lineHeight = this.writeArea.style.lineHeight * 1.2;
		this.computeKnobHeight();
	},

	getNumberOfLines: function(visible) {
		var fontSize = parseInt(this.writeArea.style.fontSize);
		var lineHeight = parseFloat(this.writeArea.style.lineHeight) || 1.0;
		return parseInt((visible ? this.writeArea.clientHeight : this.writeArea.scrollHeight) / (fontSize * lineHeight));
	},

	getCharacterPositionClicked: function(position, str) {
		var temp;
		var i = 0;
		var actualX = position.x - parseInt(this.writeArea.style.left);
		temp = "";
		while ((this.computeVisualLengthOfString(temp + str[i]) <= actualX) && i < str.length) {
			temp += str[i];
			i = i + 1;
		}
		return i;
	},

	makeDivElement: function(data, create) {
		var div;
		if (create === true) {
			div = document.createElement(data.type);
		} else {
			div = document.getElementById(data.id);
		}

		var opt, style, o, s;
		for (o in data.options) {
			opt = data.options[o];
			div[o] = opt;
		}
		for (s in data.style) {
			style = data.style[s];
			div.style[s] = style;
		}
		return div;
	},

	load: function(date) {
		console.log(this.state);
		if (this.state.bufferEmpty === true) {
			this.state.buffer = "";
			this.state.bufferEmpty = false;
		}
		this.refresh(date);
	},

	draw: function(date) {
		//console.log(linesVisible - this.displayArray.length + 2);
		if (this.writeArea.scrollHeight === this.writeArea.clientHeight) {
			var n = this.getNumberOfLines(false);
			this.state.buffer = this.appendEmptyLines(this.state.buffer, n);
		}
		var lines = this.state.buffer;
		var posList = [];
		for (var key in this.state.cursorTable) {
			if (this.state.cursorTable.hasOwnProperty(key) === true) {
				posList.push(this.state.cursorTable[key]);
			}
		}
		var temp;
		if (posList.length > 0) {
			temp = posList.sort().map(function(d) {
				var chunk = lines.slice(0, d);
				lines = lines.slice(d);
				return chunk;
			}).join(this.caretHTML.innerHTML);
			temp = (temp + this.caretHTML.innerHTML + lines).split('\n');
		} else {
			temp = lines.split('\n');
		}

		this.writeArea.innerHTML = temp.join('<br>');
		this.leftMargin.innerHTML = (temp.map(function(d, i) {
			return i + 1;
		})).join('<br>');
		this.computeKnobHeight();
	},

	appendEmptyLines: function(str, n) {
		var temp = str.split('\n');
		if (temp.length < n) {
			temp = temp.concat(Array(n - temp.length + 2).join('\n').split('\n'));
		}
		return temp.join('\n');
	},

	resize: function(date) {
		// Called when window is resized
		this.setFontSize(this.fontSize);
		this.refresh(date);
	},

	move: function(date) {
		// Called when window is moved (set moveEvents to continuous)
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	changeColorScheme: function(name) {
		var colorScheme = this.colorSchemeTable[name];
		if (colorScheme !== null && colorScheme !== undefined) {
			for (var c in colorScheme) {
				this.makeDivElement({id: c,
					style: {backgroundColor: colorScheme[c].backgroundColor, color: colorScheme[c].color}}, false);
			}
			this.caretHandle.style.color = colorScheme[this.writeArea.id].color;
		}
	},

	addColorScheme: function(name, data) {
		var colorScheme = {};
		for (var i in data) {
			colorScheme[data[i].id] = { color: data[i].color, backgroundColor: data[i].backgroundColor};
		}
		this.colorSchemeTable[name] = colorScheme;
	},

	makeColorSchemeTable: function() {
		this.addColorScheme("Dark", [{id: this.element.id, backgroundColor: "#1E1E1E", color: "#000000"},
			{id: this.writeArea.id, backgroundColor: "#1E1E1E", color: "#FFFFFF"},
			{id: this.element.id + "leftMargin", backgroundColor: "#1E1E1E", color: "#787878"},
			{id: this.element.id + "scrollBar", backgroundColor: "#1E1E1E", color: "#000000"},
			{id: this.element.id + "scrollKnob", backgroundColor: "#5A5A5A", color: "#000000"}]);
		this.addColorScheme("Lite", [{id: this.element.id, backgroundColor: "#F0F0F0", color: "#000000"},
			{id: this.writeArea.id, backgroundColor: "#F0F0F0", color: "#000000"},
			{id: this.element.id + "leftMargin", backgroundColor: "#F0F0F0", color: "#787878"},
			{id: this.element.id + "scrollBar", backgroundColor: "#F0F0F0", color: "#000000"},
			{id: this.element.id + "scrollKnob", backgroundColor: "#969696", color: "#000000"}]);
		this.addColorScheme("Cofi", [{id: this.element.id, backgroundColor: "#4D351D", color: "#000000"},
			{id: this.writeArea.id, backgroundColor: "#4D351D", color: "#CCB697"},
			{id: this.element.id + "leftMargin", backgroundColor: "#4D351D", color: "#8B6E46"},
			{id: this.element.id + "scrollBar", backgroundColor: "#4D351D", color: "#000000"},
			{id: this.element.id + "scrollKnob", backgroundColor: "#B99768", color: "#000000"}]);
		this.addColorScheme("Blue", [{id: this.element.id, backgroundColor: "#003399", color: "#000000"},
			{id: this.writeArea.id, backgroundColor: "#003399", color: "#CCFFCC"},
			{id: this.element.id + "leftMargin", backgroundColor: "#003399", color: "#0099CC"},
			{id: this.element.id + "scrollBar", backgroundColor: "#003399", color: "#000000"},
			{id: this.element.id + "scrollKnob", backgroundColor: "#66CCFF", color: "#000000"}]);
	},

	event: function(eventType, position, user_id, data, date) {
		var cursor;
		if (eventType === "pointerPress" && (data.button === "left")) {
			// click
			if (position.x > parseInt(this.scrollBar.style.right) - parseInt(this.scrollBar.style.width)
				&& position.x < parseInt(this.scrollBar.style.right)
				&& position.y > parseInt(this.scrollBar.style.top)
				&& position.y < parseInt(this.scrollBar.style.top) + parseInt(this.scrollBar.style.height)) {
				this.moveScrollKnob(position);
			} else {
				if (data.button === "left") {
					if ((user_id.id in this.state.cursorTable) === false) {
						this.state.cursorTable[user_id.id] = 0;
					}
				}
				cursor = this.getStringIndex(position);
				this.state.cursorTable[user_id.id] = cursor;
				this.updateFileBufferCursorPosition({user_id: user_id.id, cursorPosition: cursor});
				this.refresh(date);
			}
		} else if (eventType === "pointerMove" && this.dragging) {
			// move
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			// click release
		} else if (eventType === "pointerScroll") {
			this.setWindowScroll(data.wheelDelta);
			// Scroll events for zoom
		} else if (eventType === "widgetEvent") {
			// widget events
			switch (data.identifier) {
				case "colorScheme":
					this.changeColorScheme(data.value);
					break;
				case "NewNote":
					//this.requestForClone = true;
					//this.state.bufferEmpty = true;
					break;
				case "TextInput":
					this.requestFileBuffer({fileName: data.text, extension: "md", owner: this.state.owner, createdOn: null});
					this.requestNewTitle(data.text + ' - notepad');
					break;
				case "increaseFont":
					if (this.fontSize < 56) {
						this.setFontSize(this.fontSize + 1);
						this.refresh(date);
					}
					break;
				case "decreaseFont":
					if (this.fontSize > 12) {
						this.setFontSize(this.fontSize - 1);
						this.refresh(date);
					}
					break;
				default:
					console.log("No handler for:", data.identifier);
					break;
			}
			this.refresh(date);
		} else if (eventType === "keyboard") {
			this.insertBufferUpdate(data, user_id);
			this.refresh(date);
		} else if (eventType === "specialKey" && data.state === "down") {
			var lineOffset = 1;
			switch (data.code) {
				case 8:
				case 35:
				case 36:
				case 37:
				case 39:
				case 46:
					this.insertBufferUpdate(data, user_id);
					this.refresh(date);
					break;
				case 38://UP
				case 40://DOWN
					if (data.code === 38) {
						lineOffset += -2;
					}
					var fontSize = parseInt(this.writeArea.style.fontSize);
					var lineHeight = parseFloat(this.writeArea.style.lineHeight) || 1.0;
					var heightPerLine = fontSize * lineHeight;
					var pos = this.state.cursorTable[user_id.id];
					var positionXY = this.getXYFromIndex(pos);
					positionXY.y += lineOffset * heightPerLine;
					cursor = this.getStringIndex(positionXY);
					this.state.cursorTable[user_id.id] = cursor;
					this.updateFileBufferCursorPosition({user_id: user_id.id, cursorPosition: cursor});
					this.refresh(date);
					break;
				default:
					break;
			}
		}
	},

	insertBufferUpdate: function(data, user_id) {
		if (data.bufferUpdate !== null && data.bufferUpdate !== undefined) {
			var update = data.bufferUpdate;
			var buff = this.state.buffer;
			if (update.data !== null && update.data !== undefined) {
				buff = buff.splice(update.index, update.deleteCount, update.data);
			} else if (update.deleteCount > 0) {
				buff = buff.splice(update.index + update.offset, update.deleteCount, "");
			}

			this.state.buffer = buff;
			this.state.cursorTable[user_id.id] = update.index + update.offset;
		}
	},

	createRuler: function() {
		this.ruler = this.makeDivElement({
			type: "span",
			id: this.element.id + "ruler",
			options: {
				id: this.element.id + "ruler"
			},
			style: {
				visibility: "hidden",
				whiteSpace: "no-wrap",
				fontSize: parseInt(this.fontScaleFactor * this.getMinDim()) + "px",
				lineHeight: 1.2
			}
		}, true);
		this.element.appendChild(this.ruler);
	},

	computeVisualLengthOfString: function(str) {
		this.ruler.innerHTML = str;
		return this.ruler.offsetWidth;
	},

	breakStringToLines: function(str) {
		//str is assumed to contain no html tags including <br>
		var temp;
		var writeAreaWidth = this.writeArea.clientWidth;
		var i = 0;
		var lines = [];
		while (i < str.length) {
			temp = "";
			while (((this.computeVisualLengthOfString(temp + str[i]) + 10) < writeAreaWidth) && i < str.length) {
				temp += str[i];
				i = i + 1;
				if (str[i - 1] === '\n') {
					break; // This works only because node-filebuffer is converting \r to \n
				}
			}
			lines.push(temp);
		}
		return lines;
	},

	makeCaretHTML: function() {
		if (this.caretHTML === null || this.caretHTML === undefined) {

			var caret = this.makeDivElement({
				type: "span",
				options: {
					className: "blinking-cursor",
					innerHTML: ""
				},
				style: {
					border: "1px solid",
					color: 'rgba(30, 30, 80, 1.0)',
					fontWeight: 200
				}
			}, true);
			var caretDiv = this.makeDivElement({
				type: "div",
				id: this.element.id + "caret",
				options: {
					id: this.element.id + "caret"
				},
				style: {
					border: "none"
				}
			}, true);
			caretDiv.appendChild(caret);
			this.caretHandle = caret;
			this.caretHTML = caretDiv;
		}
	},

	getStringIndex: function(position) {
		var fontSize = parseInt(this.writeArea.style.fontSize);
		var lineHeight = parseFloat(this.writeArea.style.lineHeight) || 1.0;
		var heightPerLine = fontSize * lineHeight;
		var elementHeight = parseInt(this.element.clientHeight);
		var height = parseInt(this.writeArea.clientHeight);
		var actualY = position.y - parseInt((elementHeight - height) / 2.0) + parseInt(this.writeArea.scrollTop);
		var lineClicked = Math.ceil(actualY / heightPerLine);
		var sentences = this.state.buffer.split('\n');
		var visibleWidth = parseInt(this.writeArea.clientWidth);
		var numberOfLines = 0;
		var temp;
		var stringIndex = 0;
		//console.log(sentences.length, )
		for (var i = 0; i < sentences.length; i++) {
			temp = Math.max(1, Math.ceil(this.computeVisualLengthOfString(sentences[i]) / visibleWidth));
			if (numberOfLines < lineClicked && numberOfLines + temp >= lineClicked) {
				var lines = this.breakStringToLines(sentences[i]);
				var idx = lineClicked - numberOfLines - 1;
				console.log(idx, lines.length);
				if (lines.length <= idx) {
					break;
				}
				stringIndex += lines.slice(0, idx).join('').length;
				stringIndex += this.getCharacterPositionClicked(position, lines[idx]);
				break;
			}
			numberOfLines += temp;
			stringIndex += (sentences[i].length + 1);
		}

		return stringIndex;
	},

	getXYFromIndex: function (index) {
		var visibleWidth = parseInt(this.writeArea.clientWidth);
		var sentences = this.state.buffer.slice(0, index).split('\n');
		var numberOfLines = 0;
		var i;
		for (i = 0; i < sentences.length; i++) {
			numberOfLines += Math.max(1, Math.ceil(this.computeVisualLengthOfString(sentences[i]) / visibleWidth));
		}
		var x = this.computeVisualLengthOfString(sentences[i - 1]) % visibleWidth;
		var fontSize = parseInt(this.writeArea.style.fontSize);
		var lineHeight = parseFloat(this.writeArea.style.lineHeight) || 1.0;
		var heightPerLine = fontSize * lineHeight;
		var y = (numberOfLines - 0.5) * heightPerLine - parseInt(this.writeArea.scrollTop);
		var elementHeight = parseInt(this.element.clientHeight);
		var height = parseInt(this.writeArea.clientHeight);
		return ({x: x + parseInt(this.writeArea.style.left), y: y + parseInt((elementHeight - height) / 2.0)});

	},

	moveScrollKnob: function(position) {
		var top = (position.y - parseInt(this.scrollBar.style.top)) -  parseInt(this.scrollKnob.style.height) / 2;
		top = Math.min(Math.max(top, 0), parseInt(this.scrollBar.style.height) - parseInt(this.scrollKnob.style.height));
		this.scrollKnob.style.top = top + "px";
		this.setWindowScroll();
	},

	setWindowScroll: function(value) {
		if (value !== undefined && value !== null) {
			this.writeArea.scrollTop += value;
			this.leftMargin.scrollTop = this.writeArea.scrollTop;
			if (this.writeArea.scrollTop < 0) {
				this.writeArea.scrollTop = 0;
				this.leftMargin.scrollTop = 0;
			}
			this.scrollKnob.style.top = parseInt(this.writeArea.scrollTop
				* parseInt(this.scrollBar.style.height) / this.writeArea.scrollHeight) + "px";
		} else {
			this.writeArea.scrollTop = parseInt(this.scrollKnob.style.top)
				/ parseInt(this.scrollBar.style.height) * this.writeArea.scrollHeight;
			this.leftMargin.scrollTop = parseInt(this.scrollKnob.style.top)
				/ parseInt(this.scrollBar.style.height) * this.leftMargin.scrollHeight;
		}
	},

	computeKnobHeight: function() {
		var scrollHeight = parseInt(this.writeArea.scrollHeight);
		var val = parseInt(this.scrollBar.style.height);
		if (scrollHeight > 0) {
			val = val * parseInt(this.writeArea.style.height) / scrollHeight;
			this.scrollKnob.style.top = parseInt(this.writeArea.scrollTop
				* parseInt(this.scrollBar.style.height) / scrollHeight) + "px";
		}
		this.scrollKnob.style.height = (val).toString() + "px";
		this.leftMargin.style.paddingBottom = (parseInt(this.writeArea.scrollHeight)
			- parseInt(this.leftMargin.scrollHeight)) + "px";
		// console.log("height:", val);
	}


});
