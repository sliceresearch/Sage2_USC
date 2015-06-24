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

function FileBuffer (root){

	this.buffers = {};
	this.files = {};
	this.root = root;
	this.textFileFolder = path.join(root, "notes");
	if (!sageutils.fileExists(this.textFileFolder)){
		fs.mkdirSync(this.textFileFolder);
	}
}

function Buffer(data){
	this.appId = data.appId;
	this.owner = data.owner;
	this.createdOn = data.createdOn;
	this.str = [];
	this.caret = 0;
	this.changeCount = 0;
}

Buffer.prototype.insertStr = function(text){
	var str = this.str.join("");
	this.str = (str.slice(0, this.caret) + text + str.slice(this.caret)).split('');
	this.caret = this.caret + text.length;
	this.changeCount = text.length;
	var result = {index:this.caret-text.length, offset:text.length, deleteCount:0, data:text};
	return result;
};

Buffer.prototype.resetChange = function(){
	this.changeCount = 0;
};

Buffer.prototype.getData = function(){
	var data = {
		owner: this.owner,
		createdOn: this.createdOn,
		text: this.str.join("")
	};
	return data;
};

Buffer.prototype.insertChar = function(code, printable){
	var result = {index:this.caret, offset:0, deleteCount:0, data:null};
	if (printable){
		this.str.splice(this.caret, 0, String.fromCharCode(code));
		this.caret = this.caret + 1;
		this.changeCount = this.changeCount + 1;
		result.offset = 1;
		result.data = String.fromCharCode(code);
	}else{
		switch (code){
			case 35://End
				if (this.caret < this.str.length){
					result.offset = this.str.length - this.caret;
					this.caret = this.str.length;
				}
				break;
			case 36://Home
				if (this.caret > 0){
					result.offset = -this.caret;
					this.caret = 0;
				}
				break;
			case 37://left
				if (this.caret > 0){
					this.caret = this.caret - 1;
					result.offset = -1;
				}
				break;
			case 39://right
				if (this.caret < this.str.length){
					this.caret = this.caret + 1;
					result.offset = 1;
				}
				break;
			case 8://backspace
				if (this.caret > 0){
					this.str.splice(this.caret-1, 1);
					this.caret = this.caret - 1;
					this.changeCount = this.changeCount + 1;
					result.offset = -1;
					result.deleteCount = 1;
				}
				break;
			case 46://delete
				if (this.caret < this.str.length){
					this.str.splice(this.caret, 1);
					this.changeCount = this.changeCount + 1;
					result.deleteCount = 1;
				}
				break;
		}
	}
	return result;
};

FileBuffer.prototype.requestBuffer = function(data){
	if ((data.appId.toString() in this.buffers)===false){
		console.log("Creating buffer for:", data.appId);
		var buf = new Buffer(data);
		this.buffers[data.appId] = buf;
		Object.observe(buf, function(changes){
			for(var key in changes){
				if (changes[key].name === 'changeCount' && parseInt(buf.changeCount) > 20){
					this.writeToFile(appId);
					break;
				}
			}
		}.bind(this));
	}
};

FileBuffer.prototype.editCredentialsForBuffer = function(data){
	if ((data.appId.toString() in this.buffers)===true){
		var buf = this.buffers[data.appId];
		buf.owner = data.owner;
		buf.createdOn = data.createdOn;
	}
};

FileBuffer.prototype.closeFileBuffer = function(appId){
	if (this.buffers.hasOwnProperty(appId)){
		var buf = this.buffers[appId];
		if (buf.changeCount > 0){
			this.writeToFile(appId);
		}
		delete this.buffers[appId];
		delete this.files[appId];
	}
};

FileBuffer.prototype.hasFileBufferForApp = function(appId){
	return (appId.toString() in this.buffers);
};

FileBuffer.prototype.associateFile = function(data){
	var fileName = path.join(this.textFileFolder, data.fileName + "." + data.extension);
	this.files[data.appId] = fileName;
};

FileBuffer.prototype.writeToFile = function(appId){
	if (this.buffers.hasOwnProperty(appId) && this.files.hasOwnProperty(appId)){
		var buffer = this.buffers[appId];
		var fileName = this.files[appId];

		fs.writeFile(fileName, JSON.stringify(buffer.getData()), function (err) {
			if (err){
				console.log("Could not save file: " + fileName);
			}
			buffer.resetChange();
		});
	}
};

FileBuffer.prototype.insertChar = function(data){
	if (this.buffers.hasOwnProperty(data.appId)){
		var buffer = this.buffers[data.appId];
		return buffer.insertChar(data.code, data.printable);
	}
};

FileBuffer.prototype.insertStr = function(data){
	if (this.buffers.hasOwnProperty(data.appId)){
		var buffer = this.buffers[data.appId];
		return buffer.insertStr(data.text);
	}
};

module.exports = FileBuffer;
