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
 @module WebSocket
 */

// require variables to be declared
"use strict";


var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server;

function WebsocketIO(ws, strictSSL, openCallback) {
	if(typeof ws === "string") this.ws = new WebSocket(ws, null, {rejectUnauthorized: strictSSL});
	else this.ws = ws;

	var _this = this;
	this.messages = {};
	if (this.ws.readyState === 1) this.remoteAddress = {address: this.ws._socket.remoteAddress, port: this.ws._socket.remotePort};

	this.ws.on('error', function(err) {
		if (err.errno === "ECONNREFUSED") return; // do nothing
	});
	this.ws.on('open', function() {
		_this.ws.binaryType = "arraybuffer";
		_this.remoteAddress = {address: _this.ws._socket.remoteAddress, port: _this.ws._socket.remotePort};
		if(openCallback !== null) openCallback();
	});
	this.ws.on('message', function(message) {
		if(typeof message === "string"){
			var msg = JSON.parse(message);
			if(msg.f in _this.messages){
				_this.messages[msg.f](_this, msg.d);
			}
		}
		else{
			var i = 0;
			var func = "";

			while(message[i] !== 0 && i < message.length) {
				func += String.fromCharCode(message[i]);
				i++;
			}

			var buf = message.slice(i+1, message.length);
			_this.messages[func](_this, buf);
		}
	});
}

WebsocketIO.prototype.onclose = function(callback) {
	var _this = this;
	this.ws.on('close', function(){
		callback(_this);
	});
};

WebsocketIO.prototype.on = function(name, callback) {
	this.messages[name] = callback;
};

WebsocketIO.prototype.emit = function(name, data) {
	var message;

	if(name === null || name === ""){
		console.log("Error: no message name specified");
		return;
	}

	// send binary data as array buffer
	if(Buffer.isBuffer(data)){
		var funcName = Buffer.concat([new Buffer(name), new Buffer([0])]);
		message = Buffer.concat([funcName, data]);

		try {
			this.ws.send(message, {binary: true, mask: false}, function(err){
				if(err) console.log("---ERROR (ws.send)---");
				// else success
			});
		}
		catch(e) {
			console.log("---ERROR (try-catch)---");
		}
	}
	// send data as JSON string
	else {
		message = {f: name, d: data};

		// double error handling
		try {
			var msgString = JSON.stringify(message);
			this.ws.send(msgString, {binary: false, mask: false}, function(err){
				if(err) console.log("---ERROR (ws.send)---");
				// else success
			});
		}
		catch(e) {
			console.log("---ERROR (try-catch)---");
		}
	}
};

// No JSON stringigy and no check version
WebsocketIO.prototype.emitString = function(data) {
	this.ws.send(data, {binary: false, mask: false});
};


function WebsocketIOServer(data) {
	if(data.server !== undefined)    this.wss = new WebSocketServer({server: data.server, perMessageDeflate: false});
	else if(data.port !== undefined) this.wss = new WebSocketServer({port: data.port, perMessageDeflate: false});
}

WebsocketIOServer.prototype.onconnection = function(callback) {
	this.wss.on('connection', function(ws) {
		ws.binaryType = "arraybuffer";

		var wsio = new WebsocketIO(ws);
		callback(wsio);
	});
};



module.exports = WebsocketIO;
module.exports.Server = WebsocketIOServer;
