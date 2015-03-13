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
 * @module client
 * @submodule WebsocketIO
 */

/**
 * Lightweight object around websocket, handles string and binary communication
 *
 * @class WebsocketIO
 * @constructor
 */
function WebsocketIO(url) {
	if (url !== undefined && url !== null) this.url = url;
	else this.url = (window.location.protocol === "https:" ? "wss" : "ws") + "://" + window.location.host + "/" + window.location.pathname.split("/")[1];

	/**
	 * websocket object handling the communication with the server
	 *
	 * @property ws
	 * @type WebSocket
	 */
	this.ws = null;
	/**
	 * list of messages to be handled (name + callback)
	 *
	 * @property messages
	 * @type Object
	 */
	this.messages = {};

	/**
	* Open a websocket
	*
	* @method open
	* @param callback {Function} function to be called when the socket is ready
	*/
	this.open = function(callback) {
		var _this = this;

		console.log(this.url);
		this.ws = new WebSocket(this.url);
		this.ws.binaryType = "arraybuffer";
		this.ws.onopen = callback;

		// Handler when a message arrives
		this.ws.onmessage = function(msg) {
			// text message
			if (typeof msg.data === "string") {
				var message = JSON.parse(msg.data);
				if (message.f in _this.messages) {
					_this.messages[message.f](message.d);
				} else {
					console.log('WebsocketIO> No handler for', message.f);
				}
			}
			else {
				var uInt8 = new Uint8Array(msg.data);
				var i     = 0;
				var func  = "";
				while (uInt8[i] !== 0 && i < uInt8.length) {
					func += String.fromCharCode(uInt8[i]);
					i++;
				}
				var buffer = uInt8.subarray(i+1, uInt8.length);
				_this.messages[func](buffer);
			}
		};
		// triggered by unexpected close event
		this.ws.onclose = function(evt) {
			console.log("WebsocketIO> socket closed");
			if ('close' in _this.messages)
				_this.messages.close(evt);
		};
	};

	/**
	* Set a message handler for a given name
	*
	* @method on
	* @param name {String} name for the handler
	* @param callback {Function} handler to be called for a given name
	*/
	this.on = function(name, callback) {
		this.messages[name] = callback;
	};

	/**
	* Send a message with a given name and payload (format> f:name d:payload)
	*
	* @method emit
	* @param name {String} name of the message (i.e. RPC)
	* @param data {Object} data to be sent with the message
	*/
	this.emit = function(name, data) {
		if (name === null || name === "") {
			console.log("Error: no message name specified");
			return;
		}

		// send binary data as array buffer
		if (data instanceof Uint8Array) {
			// build an array with the name of the function
			var funcName = new Uint8Array(name.length+1);
			for (var i=0; i<name.length; i++) {
				funcName[i] = name.charCodeAt(i);
			}
			var message = new Uint8Array(funcName.length + data.length);
			// copy the name of the function first
			message.set(funcName, 0);
			// then copy the payload
			message.set(data, funcName.length);
			// send the message using websocket
			this.ws.send(message.buffer);
		}
		// send data as JSON string
		else {
			var jmessage = {f: name, d: data};
			this.ws.send(JSON.stringify(jmessage));
		}
	};

	/**
	* Deliberate close function
	*
	* @method emit
	*/
	this.close = function() {
		// disable onclose handler first
		this.ws.onclose = function () {};
		// then close
		this.ws.close();
    };

}
