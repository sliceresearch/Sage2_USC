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
	}
	return {value: entry, end: position + tempPos};
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

function FileBuffer(root) {
	this.buffers = {};
	this.files = {};
	this.root = root;
	this.textFileFolder = path.join(root, "notes");
	this.mdManager = new MDManager();
	if (!sageutils.folderExists(this.textFileFolder)) {
		fs.mkdirSync(this.textFileFolder);
	}
}

function CustomBuffer(data) {
	this.changeCount = 0;
	this.appId = data.appId;
	this.owner = data.owner;
	this.createdOn = data.createdOn;
	this.color = data.color;
	this.str = [];
	this.caret = 0;
}

CustomBuffer.prototype.insertStr = function(text) {
	var str = this.str.join("");
	this.str = (str.slice(0, this.caret) + text + str.slice(this.caret)).split('');
	this.caret = this.caret + text.length;
	this.changeCount = this.changeCount + text.length;
	var result = {index: this.caret - text.length, offset: text.length, deleteCount: 0, data: text};
	return result;
};

CustomBuffer.prototype.resetChange = function() {
	this.changeCount = 0;
};

CustomBuffer.prototype.getData = function() {
	var data = {
		owner: this.owner,
		createdOn: this.createdOn,
		text: this.str.join(""),
		color: this.color
	};
	return data;
};

CustomBuffer.prototype.insertChar = function(code, printable) {
	var result = {index: this.caret, offset: 0, deleteCount: 0, data: null};
	if (printable) {
		this.str.splice(this.caret, 0, String.fromCharCode(code));
		this.caret = this.caret + 1;
		this.changeCount = this.changeCount + 1;
		result.offset = 1;
		result.data = String.fromCharCode(code);
	} else {
		switch (code) {
			case 35:// End

				if (this.caret < this.str.length) {
					result.offset = this.str.length - this.caret;
					this.caret = this.str.length;
				}
				break;
			case 36:// Home

				if (this.caret > 0) {
					result.offset = -this.caret;
					this.caret = 0;
				}
				break;
			case 37:// left

				if (this.caret > 0) {
					this.caret = this.caret - 1;
					result.offset = -1;
				}
				break;
			case 39:// right

				if (this.caret < this.str.length) {
					this.caret = this.caret + 1;
					result.offset = 1;
				}
				break;
			case 8:// backspace

				if (this.caret > 0) {
					this.str.splice(this.caret - 1, 1);
					this.caret = this.caret - 1;
					this.changeCount = this.changeCount + 1;
					result.offset = -1;
					result.deleteCount = 1;
				}
				break;
			case 46:// delete

				if (this.caret < this.str.length) {
					this.str.splice(this.caret, 1);
					this.changeCount = this.changeCount + 1;
					result.deleteCount = 1;
				}
				break;
		}
	}
	return result;
};

FileBuffer.prototype.requestBuffer = function(data) {
	if ((data.appId.toString() in this.buffers) === false) {
		console.log(sageutils.header("SAGE2") + "Creating buffer for:" + data.appId);
		var buf = new CustomBuffer(data);
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
	if (fileName.indexOf('.' + data.extension, fileName.length - (data.extension.length + 1)) === -1) {
		fileName += '.' + data.extension;
	}
	fileName = path.join(this.textFileFolder, fileName);
	this.files[data.appId] = fileName;
	console.log(sageutils.header("SAGE2") + "File " + fileName + " attached to buffer of " + data.appId);
};

FileBuffer.prototype.writeToFile = function(appId) {
	if (this.buffers.hasOwnProperty(appId) && this.files.hasOwnProperty(appId)) {
		var buffer = this.buffers[appId];
		var fileName = this.files[appId];
		var bufData = buffer.getData();
		var prefix = " _Owner:_ " + bufData.owner + "  \n"
			+ " _Color:_ " + bufData.color + "  \n"
			+ " _Created On:_ " + bufData.createdOn + "  \n";

		var output = prefix + bufData.text;
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
		var update = buffer.insertChar(data.code, data.printable);
		if (buffer.changeCount > 15) {
			this.writeToFile(data.appId);
		}
		return update;
	}
};

FileBuffer.prototype.insertStr = function(data) {
	if (this.buffers.hasOwnProperty(data.appId)) {
		var buffer = this.buffers[data.appId];
		var update = buffer.insertStr(data.text);
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



module.exports = FileBuffer;
