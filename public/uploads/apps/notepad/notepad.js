// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

"use strict";

var	NotepadBlinker = function(id, ctx, date, color) {
	this.id = id;
	this.visible  = true;
	this.color	= color;
	this.blinkerX = null;
	this.blinkerY = null;
	this.textIdx  = null;
	this.blinkerL = null;
	this.blinkerC = null;
	this.rangeBlinker = [0, 0];

	this.draw = function(text, fH) {
		// This function assumes that offSet function is always called prior to this function
		// console.log(fH);
		this.blinkerY += this.blinkerL * fH;
		if (this.blinkerC > 0 && this.blinkerL + this.rangeBlinker[0] in text) {
			this.blinkerX += ctx.measureText(text[this.blinkerL +
				this.rangeBlinker[0]].substring(0, this.blinkerC)).width;
		}
		var col	= ctx.strokeStyle;
		var offset = fH * 0.25;
		var offY   = this.blinkerY + offset;
		ctx.strokeStyle = "rgba(" + this.color[0] + "," + this.color[1] + "," + this.color[2] + ",1.0)";
		ctx.beginPath();
		ctx.moveTo(this.blinkerX, offY);
		ctx.lineTo(this.blinkerX, offY - fH);
		ctx.moveTo(this.blinkerX, offY);
		ctx.closePath();
		ctx.stroke();
		ctx.strokeStyle = col;
	};

	this.moveLC = function(l, c) {
		this.blinkerL = l;
		this.blinkerC = c;
	};

	this.offSet = function(x, y) {
		this.blinkerX = x;
		this.blinkerY = y;
	};

	this.range = function(start, end) {
		this.rangeBlinker[0] = start;
		this.rangeBlinker[1] = end;
	};
};


var notepad = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("canvas", data);

		// Set the framerate
		this.maxFPS = 4;
		this.resizeEvents = "continuous";

		this.linesVisble = null;
		this.columns = null;
		this.lines   = null;

		this.fontSize = 12;
		this.font	 = "Arial";
		this.bold	 = false;
		this.height   = null;
		this.space	= null;
		this.lMargin  = 40;
		this.fontHeight = null;

		this.minDim  = null;
		this.text	= "";
		this.range   = [];
		this.timer   = null;
		this.blinkerArr = [];
		this.specialKeyFlag = false;

		var _this = this;

		if (this.state.content === undefined || this.state.content.length === 0) {
			if (this.state.file) {
				readFile(this.state.file, function(err, text) {
					if (!err) {
						var arrayOfLines = text.match(/[^\r\n]+/g);
						for (var j = 0; j < arrayOfLines.length; j++) {
							_this.state.content[j + 1] = arrayOfLines[j];
						}
						_this.SAGE2Sync(true);
					}
				}, "TEXT");
			} else {
				this.state.content = [];
			}
		}

		this.ctx = this.element.getContext('2d');
		this.minDim = Math.min(this.element.width, this.element.height);
		this.computeMetrics();
		this.findRange();
		if (isMaster) {
			this.fileRead = true;
			this.fileName = "Sample.txt";
		}
		this.controls.finishedAddingControls();
	},

	load: function(date) {
		this.refresh(date);
	},

	computeMetrics: function() {
		this.height = this.element.height;
		this.fontHeight = this.getHeightOfText(this.bold, this.font, this.fontSize);
		this.linesVisible = Math.floor(this.element.height / this.fontHeight);
		this.space = this.ctx.measureText(" ").width;
		this.columns = Math.floor(this.element.width / this.space);
	},

	findRange: function() {
		this.range[0] = [1, this.linesVisible];
	},

	getHeightOfText: function(bold, font, size) {
		var div = document.createElement('DIV');
		div.innerHTML = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
		div.style.position = 'absolute';
		div.style.top = '-100px';
		div.style.left = '-100px';
		div.style.fontFamily = font;
		div.style.fontWeight = bold ? 'bold' : 'normal';
		div.style.fontSize = size + 'pt';
		document.body.appendChild(div);
		var rsize = div.offsetHeight;
		document.body.removeChild(div);
		return rsize;
	},

	joinText: function() {
		var buffer = "";
		for (var parts = 0; parts < this.range.length; parts++) {
			var start = this.range[parts][0];
			var end   = this.range[parts][1];
			for (var i = start; i <= end; i++) {
				if (i in this.state.content) {
					buffer = buffer + this.state.content[i];
				}
				buffer = buffer + "\r\n";
			}
		}
		return buffer;
	},

	displayText: function() {
		var count = 1;
		for (var parts = 0; parts < this.range.length; parts++) {
			var start = this.range[parts][0];
			var end = this.range[parts][1];
			// console.log(start + " : " + end);
			for (var i = start; i <= end; i++) {

				this.ctx.font = "16px " + this.font;
				this.ctx.fillText(('000' + i).slice(-3), 5, count * this.fontHeight);
				this.ctx.font = this.fontSize + "px " + this.font;
				if (i in this.state.content && this.state.content[i] !== null) {
					var wrSpc = this.element.width - (2 * this.space + this.lMargin);
					if (this.ctx.measureText(this.state.content[i]).width > wrSpc) {
						var cut = Math.floor(wrSpc / this.ctx.measureText(this.state.content[i]).width
							* this.state.content[i].length);
						var re = new RegExp(".{1," + cut + "}", "g");
						var mLines = this.state.content[i].match(re);
						for (var ml = 0; ml < mLines.length; ml++) {
							this.ctx.fillText(mLines[ml], this.space + this.lMargin, count * this.fontHeight);
							count++;
						}

					} else {
						this.ctx.fillText(this.state.content[i], this.space + this.lMargin, count * this.fontHeight);
					}
				}
				count++;
			}
		}
	},

	draw: function(date) {
		// clear canvas
		this.ctx.clearRect(0, 0, this.element.width, this.element.height);

		this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
		this.ctx.fillRect(0, 0, this.element.width, this.element.height);
		this.ctx.fillStyle = "rgba(150, 150, 150, 1.0)";
		this.ctx.fillRect(0, 0, this.lMargin, this.element.height);
		this.ctx.fillStyle = "rgba(200, 200, 200, 1.0)";
		this.ctx.fillRect(this.element.width - 30, 0, 30, this.element.height);
		this.ctx.strokeStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.space = this.ctx.measureText(" ").width;
		this.displayText();
		if (date.getMilliseconds() < 500) {
			for (var bkr in this.blinkerArr) {
				this.blinkerArr[bkr].offSet(this.space + this.lMargin, 0);
				this.blinkerArr[bkr].draw(this.state.content, this.fontHeight);
			}
		}
	},

	resize: function(date) {
		this.fontSize = Math.max(Math.floor(0.02 * this.element.height), 14);
		this.computeMetrics();
		this.findRange();
		this.draw(date);
	},


	enterKey: function(curL, curC, userId) {
		if (curL + this.range[0][0] - 1 in this.state.content) {
			// console.log("curL::::" + curL);
			var nl = this.state.content[curL + this.range[0][0] - 1].substring(curC,
				this.state.content[curL + this.range[0][0] - 1].length);
			this.state.content[curL + this.range[0][0] - 1] =
				this.state.content[curL + this.range[0][0] - 1].substring(0, curC);
			if (curL + this.range[0][0] in this.state.content) {
				// console.log("");
				this.state.content.splice(curL + 1, 0, nl);
			} else {
				this.state.content[curL + 1] = nl;
			}
		} else {
			this.state.content[curL + this.range[0][0] - 1] = "";
		}
		this.blinkerArr[userId].moveLC(curL + 1, 0);
	},

	/**
	* To enable right click context menu support,
	* this function needs to be present with this format.
	*/
	getContextEntries: function() {
		var entries = [];

		// Special callback: dowload the file
		entries.push({
			description: "Download",
			callback: "SAGE2_download",
			parameters: {
				url: this.state.file
			}
		});

		return entries;
	},

	event: function(type, position, userId, data, date) {
		var curL, curC, pre, post, t;
		var x = position.x;
		var y = position.y;
		var user_color = userId.color || [255, 0, 0];
		if (type === "pointerPress") {
			if (data.button === "left") {
				if ((userId.id in this.blinkerArr) === false) {
					var bkr = new NotepadBlinker(userId.id, this.ctx, date, user_color);
					this.blinkerArr[userId.id] = bkr;
				} else {
					this.blinkerArr[userId.id].color = user_color;
				}
				var lno = Math.ceil(y / this.fontHeight);
				var tArIdx = lno + this.range[0][0] - 1;
				if (tArIdx in this.state.content && this.state.content[tArIdx] != null) {
					// console.log(tArIdx);
					var len = this.ctx.measureText(this.state.content[tArIdx]).width;
					if (x >= len) {
						this.blinkerArr[userId.id].moveLC(lno, this.state.content[tArIdx].length);
					} else {
						var c;
						for (c = 0; c < this.state.content[tArIdx].length; c++) {
							if (this.ctx.measureText(this.state.content[tArIdx].substring(0, c)).width > x) {
								break;
							}
						}
						this.blinkerArr[userId.id].moveLC(lno, c - 1);
					}
				} else {
					this.blinkerArr[userId.id].moveLC(lno, 0);
				}

			} else if (data.button === "right") {
				// right press
			}
		} else if (type === "pointerRelease") {
			if (data.button === "left") {
				// left release
			} else if (data.button === "right") {
				// right release
			}
		} else if (type === "pointerMove") {
			// pointer move
		} else if (type === "pointerDoubleClick") {
			// double click
		} else if (type === "keyboard") {
			// the key character is stored in ascii in data.code
			// all other keys will come in as typed:  'a', 'A', '1', '!' etc
			// tabs and new lines ought to be coming in too
			var theAsciiCode = data.code;
			if ((userId.id in this.blinkerArr) === false) {
				// Bad code. need to remove once the event handler has been modified.
				return;
			}
			curL = this.blinkerArr[userId.id].blinkerL;
			curC = this.blinkerArr[userId.id].blinkerC;
			if (theAsciiCode === 13) {
				this.enterKey(curL, curC, userId.id);
			} else {
				if (curL + this.range[0][0] - 1 in this.state.content
					&& this.state.content[curL + this.range[0][0] - 1] != null) {
					this.blinkerArr[userId.id].range(this.range[0][0] - 1, this.range[0][1]);
					this.state.content[curL + this.range[0][0] - 1] =
						this.state.content[curL + this.range[0][0] - 1].substring(0, curC)
						+ String.fromCharCode(theAsciiCode)
						+ this.state.content[curL + this.range[0][0] - 1].substring(curC,
							this.state.content[curL + this.range[0][0] - 1].length);
				} else {
					this.state.content[curL + this.range[0][0] - 1] = String.fromCharCode(theAsciiCode);
				}
				this.blinkerArr[userId.id].moveLC(curL, curC + 1);
			}
		} else if (type === "specialKey" && data.state === "down") {
			var theJavascriptCode = data.code;
			curL = userId.id && this.blinkerArr[userId.id].blinkerL;
			curC = this.blinkerArr[userId.id].blinkerC;
			if (theJavascriptCode === 8) {
				if (curL + this.range[0][0] - 1 in this.state.content) {
					pre  = this.state.content[curL + this.range[0][0] - 1].substring(0, curC - 1);
					post = this.state.content[curL + this.range[0][0] - 1].substring(curC,
						this.state.content[curL + this.range[0][0] - 1].length);
					if (curC > 0) {
						this.state.content[curL + this.range[0][0] - 1] = pre + post;
						this.blinkerArr[userId.id].moveLC(curL, curC - 1);

					} else if (curL > 1) {
						t = "";
						if (curL + this.range[0][0] - 2 in this.state.content) {
							t =  this.state.content[curL + this.range[0][0] - 2];
							// console.log("T : ");
						}
						this.state.content[curL + this.range[0][0] - 2] = t + post;
						this.state.content.splice(curL + this.range[0][0] - 1, 1);
						this.blinkerArr[userId.id].moveLC(curL - 1, t.length);
					}
				} else if (curL + this.range[0][0] - 1 in this.state.content) {
					this.blinkerArr[userId.id].moveLC(curL - 1, this.state.content[curL - 1].length);
				} else if (curL > 1) {
					this.blinkerArr[userId.id].moveLC(curL - 1, 0);
				}

			} else if (theJavascriptCode === 46) {
				pre  = this.state.content[curL + this.range[0][0] - 1].substring(0, curC);
				post = this.state.content[curL + this.range[0][0] - 1].substring(curC + 1,
					this.state.content[curL + this.range[0][0] - 1].length);

				if ((curL + this.range[0][0] - 1 in this.state.content) === false) {
					return;
				}

				if (curC < this.state.content[curL + this.range[0][0] - 1].length) {
					this.state.content[curL + this.range[0][0] - 1] = pre + post;
				} else {
					t = "";
					if (curL + this.range[0][0] in this.state.content) {
						t = this.state.content[curL + this.range[0][0]];
						this.state.content.splice(curL + 1, 1);
					}
					this.state.content[curL + this.range[0][0] - 1] =
						this.state.content[curL + this.range[0][0] - 1]  + t;
				}

			} else if (theJavascriptCode === 37) {
				if (curC > 0) {
					curC--;
				} else {
					curL = curL - 1 || curL;
					curC = (curL + this.range[0][0] - 1 in this.state.content)
						? this.state.content[curL + this.range[0][0] - 1].length : 0;
				}
				this.blinkerArr[userId.id].moveLC(curL, curC);

			} else if (theJavascriptCode === 39) {
				if (curL + this.range[0][0] - 1 in this.state.content && curC
					< this.state.content[curL + this.range[0][0] - 1].length) {
					curC++;
				} else {
					curL++;
					curC = 0;
				}
				this.blinkerArr[userId.id].moveLC(curL, curC);
			} else if (theJavascriptCode === 38) {
				if (curL - 1 in this.state.content) {
					curC = Math.min(curC, this.state.content[curL - 1].length);
					curL--;
				} else if (curL - 1 > 0) {
					curL--;
					curC = 0;
				}
				this.blinkerArr[userId.id].moveLC(curL, curC);
			} else if (theJavascriptCode === 40) {
				if (curL + 1 in this.state.content) {
					curC = Math.min(curC, this.state.content[curL + 1].length);
					curL++;
				} else {
					curL++;
					curC = 0;
				}
				this.blinkerArr[userId.id].moveLC(curL, curC);
			}

		} else if (type === "pointerScroll") {
			// not implemented yet
			if (data.wheelDelta > 0) {
				this.range[0][0] += 5;
				this.range[0][1] += 5;
			} else if (data.wheelDelta < 0) {
				if (this.range[0][0] > 5) {
					this.range[0][0] += -5;
					this.range[0][1] += -5;
				}
			}
		}

		// this.refresh(date);
	},

	quit: function() {
		// Save
	}

});
