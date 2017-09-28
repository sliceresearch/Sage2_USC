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
 * @module filebuffer
 */

"use strict";

var fs        = require('fs');
var path      = require('path');
var sageutils = require('../src/node-utils');    // provides utility functions

/* global  */
if (!String.prototype.splice) {

	/**
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
		newSubStr = newSubStr || "";
		return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
	};
}





function MDManager() {
}

function getEntryValue(data, entryStr, delim) {
	var position = data.indexOf(entryStr);
	var entry = null;
	var tempStr;
	var tempPos = 0;
	if (position > -1) {
		position = position + entryStr.length;
		tempStr = data.slice(position);
		tempPos = tempStr.indexOf(delim);
		if (tempPos > -1) {
			entry = tempStr.slice(0, tempPos);
			tempPos = tempPos + delim.length;
		} else {
			entry = tempStr;
			tempPos = 0;
		}
		position = position + tempPos;
	} else {
		position = 0;
	}
	return {value: entry, end: position};
}

MDManager.prototype.parse = function(data) {
	var owner = getEntryValue(data, ' _Owner:_ ', '  \n').value;
	var color = getEntryValue(data, ' _Color:_ ', '  \n').value;
	var temp = getEntryValue(data, ' _Created On:_ ', '  \n');
	var createdOn = parseInt(temp.value, 10);
	var texIdx = temp.end;
	var text = data.slice(texIdx);
	return {text: text, owner: owner, createdOn: createdOn, color: color};
};

function FileBuffer() {
	this.buffers = {};
	this.files = {};
	this.mdManager = new MDManager();
}

function CustomBuffer(data) {
	this.changeCount = 0;
	this.appId = data.appId;
	this.owner = data.owner;
	this.createdOn = data.createdOn;
	this.color = data.color;
	this.str = "";
	this.cursorTable = {};
	this.insertMode = false;
}

CustomBuffer.prototype.insertStr = function(text, user_id) {
	if (user_id !== undefined && user_id !== null) {
		var caret = this.cursorTable[user_id] || 0;
	}
	var replace = this.insertMode ? text.length : 0;
	this.str = this.str.splice(caret, replace, text);
	caret = caret + text.length;
	this.changeCount = this.changeCount + text.length;
	var result = {index: caret - text.length, offset: text.length, deleteCount: replace, data: text, user_id: user_id};
	this.cursorTable[user_id] = caret;
	return result;
};

CustomBuffer.prototype.resetChange = function() {
	this.changeCount = 0;
};

CustomBuffer.prototype.getData = function() {
	var data = {
		owner: this.owner,
		createdOn: this.createdOn,
		text: this.str,
		color: this.color
	};
	return data;
};

CustomBuffer.prototype.insertChar = function(code, printable, user_id) {
	var caret = this.cursorTable[user_id];
	var result = {index: caret, offset: 0, deleteCount: 0, data: null, user_id: user_id};
	if (printable) {
		//Changing \r to \n
		//Need to make this flexible enough to handle \r, \n, or \r\n
		var char = (code === 13) ? '\n' : String.fromCharCode(code);
		var replace = this.insertMode ? 1 : 0;
		this.str = this.str.splice(caret, replace, char);
		caret = caret + 1;
		this.changeCount = this.changeCount + 1;
		result.offset = 1;
		result.data = char;
		result.deleteCount = replace;
	} else {
		switch (code) {
			case 35:// End
				if (caret < this.str.length) {
					var lineEnd = this.str.indexOf('\n', caret) + 1; // If found, +1 will point to next char
					if (lineEnd === 0) {
						lineEnd = this.str.length;
					}
					result.offset = lineEnd - caret;
					caret = lineEnd;
				}
				break;
			case 36:// Home

				if (caret > 0) {
					var lineBegin = this.str.slice(0, caret).lastIndexOf('\n') + 1;
					result.offset = lineBegin - caret;
					caret = lineBegin;
				}
				break;
			case 37:// left

				if (caret > 0) {
					caret = caret - 1;
					result.offset = -1;
				}
				break;
			case 39:// right

				if (caret < this.str.length) {
					caret = caret + 1;
					result.offset = 1;
				}
				break;
			case 8:// backspace

				if (caret > 0) {
					this.str = this.str.splice(caret - 1, 1);
					caret = caret - 1;
					this.changeCount = this.changeCount + 1;
					result.offset = -1;
					result.deleteCount = 1;
				}
				break;
			case 46:// delete

				if (caret < this.str.length) {
					this.str = this.str.splice(caret, 1);
					this.changeCount = this.changeCount + 1;
					result.deleteCount = 1;
				}
				break;
			case 45:
				this.insertMode = !this.insertMode;
				break;
		}
	}
	this.cursorTable[user_id] = caret;
	return result;
};


CustomBuffer.prototype.updateCursorPosition = function(data) {
	this.cursorTable[data.user_id] = data.cursorPosition;
};

FileBuffer.prototype.requestBuffer = function(data) {
	if ((data.appId.toString() in this.buffers) === false) {
		var buf = new CustomBuffer(data);
		if (data.content !== undefined && data.content !== null) {
			var text = data.content.split('\r\n').join('\n');
			text = this.parse(text).text;
			buf.insertStr(text);
		}
		this.buffers[data.appId] = buf;
	}
};

FileBuffer.prototype.editCredentialsForBuffer = function(data) {
	if ((data.appId.toString() in this.buffers) === true) {
		var buf = this.buffers[data.appId];
		buf.owner = data.owner;
		buf.createdOn = data.createdOn;
	}
};

FileBuffer.prototype.closeFileBuffer = function(appId) {
	if (this.buffers.hasOwnProperty(appId)) {
		var buf = this.buffers[appId];
		if (buf.changeCount > 0) {
			this.writeToFile(appId);
		}
		delete this.buffers[appId];
		delete this.files[appId];
	}
};

FileBuffer.prototype.hasFileBufferForApp = function(appId) {
	return (appId.toString() in this.buffers);
};

FileBuffer.prototype.associateFile = function(data) {
	var fileName = data.fileName;
	var fileDir = data.fileDir;
	// check and create the folder if needed
	if (!sageutils.folderExists(fileDir)) {
		sageutils.mkdirParent(fileDir);
	}

	// finally, build the full path
	var fullPath = path.join(fileDir, fileName);

	this.files[data.appId] = fullPath;
	sageutils.log("SAGE2", "File", fileName, "attached to buffer of", data.appName);
};

FileBuffer.prototype.writeToFile = function(appId) {
	if (this.buffers.hasOwnProperty(appId) && this.files.hasOwnProperty(appId)) {
		var buffer = this.buffers[appId];
		var fileName = this.files[appId];
		var bufData = buffer.getData();

		/*var prefix = " _Owner:_ " + bufData.owner + "  \n"
			+ " _Color:_ " + bufData.color + "  \n"
			+ " _Created On:_ " + bufData.createdOn + "  \n";
		*/

		var output = bufData.text.split('\n').join('\r\n');
		fs.writeFile(fileName, output, function(err) {
			if (err) {
				return console.log(err);
			}
			buffer.resetChange();
		});
	}
};

FileBuffer.prototype.insertChar = function(data) {
	if (this.buffers.hasOwnProperty(data.appId)) {
		var buffer = this.buffers[data.appId];
		var update = buffer.insertChar(data.code, data.printable, data.user_id);
		if (buffer.changeCount > 15) {
			this.writeToFile(data.appId);
		}
		return update;
	}
};

FileBuffer.prototype.insertStr = function(data) {
	if (this.buffers.hasOwnProperty(data.appId)) {
		var buffer = this.buffers[data.appId];
		var text = data.text.split('\r\n').join('\n');
		text = this.parse(text).text;
		var update = buffer.insertStr(text, data.user_id);
		if (buffer.changeCount > 15) {
			this.writeToFile(data.appId);
		}
		return update;
	}
};

FileBuffer.prototype.parse = function(data) {
	try {
		if (typeof data !== 'string') {
			data = data.toString('utf8');
		}
		var parsedFileData = this.mdManager.parse(data);
		return parsedFileData;
	} catch (e) {
		console.log("Error :->", e);
	}
};

FileBuffer.prototype.updateFileBufferCursorPosition = function(data) {
	if (this.buffers.hasOwnProperty(data.appId)) {
		var buffer = this.buffers[data.appId];
		buffer.updateCursorPosition(data);
	}
};



module.exports = FileBuffer;
