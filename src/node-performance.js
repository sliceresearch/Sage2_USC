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
var os		  = require('os');
//var path      = require('path');
//var sageutils = require('../src/node-utils');    // provides utility functions

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
		newSubStr = newSubStr || "";
		return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
	};
}



function PerformanceManager() {
	this.messageInfoList = [];
}

PerformanceManager.prototype.wrapDataTransferFunctions = function(WebsocketIO) {
	var _this = this;
	var onFunc = WebsocketIO.prototype.on;
	WebsocketIO.prototype.on = function(name, callback) {
		var args = [].slice.call(arguments, 0);
		var wsio = this;
		args[1] = function(obj, data) {
			callback(obj, data);
			_this.recordMessageReceived(name, wsio, data);
		};
		return onFunc.apply(this, args);
	}
	
	var emitFunc = WebsocketIO.prototype.emit;
	WebsocketIO.prototype.emit = function (name, dataString, attempts) {
		var args = [].slice.call(arguments, 0);
		var emitReturnValue = emitFunc.apply(this, args);
		_this.recordMessageSent(name, this, dataString);
		return emitReturnValue;
	}

	var emitStringFunc = WebsocketIO.prototype.emitString;
	WebsocketIO.prototype.emitString = function (name, dataString, attempts) {
		var args = [].slice.call(arguments, 0);
		var emitReturnValue = emitStringFunc.apply(this, args);
		_this.recordMessageSent(name, this, dataString);
		return emitReturnValue;
	}
};

PerformanceManager.prototype.setupLogFile = function(path) {
	this.logFile = path;
	fs.writeFile(this.logFile, JSON.stringify(this.getHostDetails()), function (err) {
		if (err){
			console.log("Error: performance log could not be saved!");
		}
		
	});
};

PerformanceManager.prototype.getFileZise = function(data) {

};

PerformanceManager.prototype.recordMessageReceived = function(message, wsio, data) {
	this.recordMessage(message, wsio, data, false);
};

PerformanceManager.prototype.recordMessageSent = function(message, wsio, data) {
	this.recordMessage(message, wsio, data, true);
};


PerformanceManager.prototype.getHostDetails = function() {
	var data = {
		arch: os.arch(),
		cpus: os.cpus(),
		endianness: os.endianness(),
		freemem: os.freemem() / 1000000.0,
		homedir: os.homedir(),
		hostname: os.hostname(),
		loadavg: os.loadavg(),
		networkInterfaces: os.networkInterfaces(),
		platform: os.platform(),
		release: os.release(),
		tmpdir: os.tmpdir(),
		totalmem: os.totalmem() / 1000000.0,
		type: os.type(),
		uptime: os.uptime(),
		userInfo: os.userInfo()
	};
	return data;
};

PerformanceManager.prototype.getClientDetails = function(clients) {
	var list = [];
	for (var c in clients) {
		var data = {
			id: clients[c].id,
			remoteAddress: clients[c].remoteAddress,
			clientType: clients[c].clientType,
			clientID: clients[c].clientID
		};
		list.push(data);
		//console.log(clients[c]);
	}
	return list;
};

function byteBufferToString(buf) {
	var str = "";
	var i   = 0;
	while (buf[i] !== 0 && i < buf.length) {
		str += String.fromCharCode(buf[i]);
		i++;
	}
	return str;
}

PerformanceManager.prototype.recordMessage = function(fName, wsio, data, outBound) {
	var message = {
		name: fName,
		outBound: outBound,
		date: Date.now(),
		clientID: wsio.clientID,
		clientType: wsio.clientType
	};
	var obj;
	if (Buffer.isBuffer(data) === true) {
		message.size = data.length;
		message.id = byteBufferToString(data);
	} else if (typeof data === "string") {
		obj = JSON.parse(data);
	} else {
		obj = data;
	}
	
	if (obj !== null && obj !== undefined) {
		message.id = obj.id;
		message.size = Buffer.byteLength(JSON.stringify(obj));
	}
	

	this.messageInfoList.push(message);

	if (this.messageInfoList.length > 100) {
		var temp = this.messageInfoList.splice(0, 100);
		fs.appendFile(this.logFile, JSON.stringify(temp), function (err) {
			if (err){
				console.log("Error: performance log could not be saved!");
			}
		});
	}
	
}

PerformanceManager.prototype.getMessageInfo = function() {
	return this.messageInfoList;
}
module.exports = PerformanceManager;
