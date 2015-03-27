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
 * Lightweight object around websocket, handles string and binary communication
 *
 * @module server
 * @submodule WebsocketIO
 * @requires ws
 */

// require variables to be declared
"use strict";

var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server;

/**
 * Client socket object
 *
 * @class WebsocketIO
 * @constructor
 * @param ws {Object} ULR of the server or actual websocket
 * @param strictSSL {Bool} require or not SSL verification with a certiifcate
 * @param openCallback {Function} callback when the socket opens
 */
function WebsocketIO(ws, strictSSL, openCallback) {
	if (typeof ws === "string")
		this.ws = new WebSocket(ws, null, {rejectUnauthorized: strictSSL});
	else
		this.ws = ws;

	var _this = this;
	this.messages = {};
	if (this.ws.readyState === 1) {
		this.remoteAddress = {address: this.ws._socket.remoteAddress, port: this.ws._socket.remotePort};
		this.id = this.remoteAddress.address + ":" + this.remoteAddress.port;
	}

	this.closeCallbacks = [];
	this.listeners = ["#WSIO#addListener"];

	this.ws.on('error', function(err) {
		if (err.errno === "ECONNREFUSED") return; // do nothing
	});

	this.ws.on('open', function() {
		_this.ws.binaryType = "arraybuffer";
		_this.remoteAddress = {address: _this.ws._socket.remoteAddress, port: _this.ws._socket.remotePort};
		_this.id = _this.remoteAddress.address + ":" + _this.remoteAddress.port;
		if(openCallback !== null) openCallback();
	});

	this.ws.on('message', function(message) {
		if (typeof message === "string") {
			var msg = JSON.parse(message);

			// add lister to client
			if(msg.f === "#WSIO#addListener") {
				_this.listeners.push(msg.d.listener);
				return;
			}

			// handle message
			if (msg.f in _this.messages) {
				_this.messages[msg.f](_this, msg.d);
			} else {
				console.log(" WebsocketIO>\tno handler for '" + msg.f + "'");
			}
		}
		else {
			var i = 0;
			var func = "";

			while (message[i] !== 0 && i < message.length) {
				func += String.fromCharCode(message[i]);
				i++;
			}

			var buf = message.slice(i+1, message.length);
			_this.messages[func](_this, buf);
		}
	});

	this.ws.on('close', function() {
		for(var i=0; i<_this.closeCallbacks.length; i++) {
			_this.closeCallbacks[i](_this);
		}
	});
}

/**
* Setting a callback when the socket closes
*
* @method onclose
* @param callback {Function} function to execute after closing
*/
WebsocketIO.prototype.onclose = function(callback) {
	this.closeCallbacks.push(callback);
};

/**
* Set a message handler for a given name
*
* @method on
* @param name {String} name for the handler
* @param callback {Function} handler to be called for a given name
*/
WebsocketIO.prototype.on = function(name, callback) {
	this.messages[name] = callback;
	this.emit('#WSIO#addListener', {listener: name});
};

/**
* Send a message with a given name and payload (format> f:name d:payload)
*
* @method emit
* @param name {String} name of the message (i.e. RPC)
* @param data {Object} data to be sent with the message
*/
WebsocketIO.prototype.emit = function(name, data) {
	var message;

	if (name === null || name === "") {
		console.log(" WebsocketIO>\tError, no message name specified");
		return;
	}
	/*else if(this.listeners.indexOf(name) < 0) {
		console.log(" WebsocketIO>\tWarning: not sending message, recipient has no listener (" + name + ")");
		return;
	}*/

	// send binary data as array buffer
	if (Buffer.isBuffer(data)) {
		var funcName = Buffer.concat([new Buffer(name), new Buffer([0])]);
		message      = Buffer.concat([funcName, data]);

		try {
			this.ws.send(message, {binary: true, mask: false}, function(err){
				if(err) console.log(" WebsocketIO>\t---ERROR (ws.send)---", name);
				// else success
			});
		}
		catch(e) {
			console.log(" WebsocketIO>\t---ERROR (try-catch)---", name);
		}
	}
	// send data as JSON string
	else {
		message = {f: name, d: data};

		// double error handling
		try {
			var msgString = JSON.stringify(message);
			this.ws.send(msgString, {binary: false, mask: false}, function(err){
				if(err) console.log(" WebsocketIO>\t---ERROR (ws.send)---", name);
				// else success
			});
		}
		catch(e) {
			console.log(" WebsocketIO>\t---ERROR (try-catch)---", name);
		}
	}
};

/**
* Faster version for emit: No JSON stringigy and no check version
*
* @method emitString
* @param data {String} data to be sent as the message
*/
WebsocketIO.prototype.emitString = function(data) {
	this.ws.send(data, {binary: false, mask: false});
};

/**
* Faster version for emit: No packing data into single buffer
*
* @method emitBinary
* @param data {Buffer} data to be sent as the message
*/
WebsocketIO.prototype.emitBinary = function(data) {
	this.ws.send(data, {binary: true, mask: false});
};


/**
 * Server socket object
 *
 * @class WebsocketIOServer
 * @constructor
 * @param data {Object} object containing .server or .port information
 */
function WebsocketIOServer(data) {
	if (data.server !== undefined)
		this.wss = new WebSocketServer({server: data.server, perMessageDeflate: false});
	else if(data.port !== undefined)
		this.wss = new WebSocketServer({port: data.port, perMessageDeflate: false});

	this.clients = {};
}

/**
* Setting a callback when a connection happens
*
* @method onconnection
* @param callback {Function} function taking the new client (WebsocketIO) as parameter
*/
WebsocketIOServer.prototype.onconnection = function(callback) {
	var _this = this;
	this.wss.on('connection', function(ws) {
		ws.binaryType = "arraybuffer";

		var wsio = new WebsocketIO(ws);
		wsio.onclose(function(closed) {
			delete _this.clients[closed.id];
		});
		_this.clients[wsio.id] = wsio;
		callback(wsio);
	});
};

WebsocketIOServer.prototype.broadcast = function(name, data) {
	var key;
	var pkg = null;
	// send as binary buffer
	if (Buffer.isBuffer(data)) {
		var funcName = Buffer.concat([new Buffer(name), new Buffer([0])]);
		pkg = Buffer.concat([funcName, data]);
		for(var key in this.clients) {
			if(this.clients[key].listeners.indexOf(name) >= 0) this.clients[key].emitBinary(pkg);
		}
	}
	// send data as JSON string
	else {
		pkg = JSON.stringify({f: name, d: data});
		for(var key in this.clients) {
			if(this.clients[key].listeners.indexOf(name) >= 0) this.clients[key].emitString(pkg);
		}
	}
}



module.exports = WebsocketIO;
module.exports.Server = WebsocketIOServer;
