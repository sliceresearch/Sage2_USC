// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-17

/*
This file has two parts.

1. Supplement to get some additional input functionality.
	In particular backspace and sending keypresses to nodes with out value property.

2. An object to handle connection back to the SAGE2 server.
	This allows data passing between the page and SAGE2 server, not directly to the Webview app.
	Note: The Webview app can directly inject code that may activate page scripts(and send data),
		but there is no direct means of passing data from page to the app.

*/


// ------------------------------------------------------------------------------------------------------------------
// 1

var s2InjectForKeys = {};

/*
Unsure why but after testing, page doesn't get keydowns, so this conversion function needs to be injected.

Quote from MDN:
	The keypress event is fired when a key is pressed down, and that key normally produces a character value (use input instead).

Nodes without value should NOT be checking for keypress.
And checks for keydown will not be normally activated. This has been confirmed Youtube and spacebar for pausing video.
*/
document.addEventListener("keypress", function(e) {
	var kue = new CustomEvent("keydown", {bubbles:true});
	kue.target = e.target;
	kue.view = e.view;
	kue.detail = e.detail;
	kue.char = e.char;
	kue.key = e.key;
	kue.charCode = e.charCode;
	kue.keyCode = e.keyCode;
	kue.which = e.which;
	kue.location = e.location;
	kue.repeat = e.repeat;
	kue.locale = e.locale;
	kue.ctrlKey = e.ctrlKey;
	kue.shiftKey = e.shiftKey;
	kue.altKey = e.altKey;
	kue.metaKey = e.metaKey;
	// if a keypress is received and the target isn't an input node
	if (e.target.value === undefined) {
			// set the lastClickedElement to the target of event (since it needs to get there)
			s2InjectForKeys.lastClickedElement = e.target;
			s2InjectForKeys.lastClickedElement.dispatchEvent(kue);
			// should this be prevented? what if something check for keypress?
			e.preventDefault();
	}
});

// after any click, track the node clicked to send further events to it.
document.addEventListener("click", function(e) {
	s2InjectForKeys.lastClickedElement = document.elementFromPoint(e.clientX, e.clientY);
});
/*
Delete from value using keyup.
Keydown not activated due to squelch in keypress->keydown conversion to prevent double event if value field exists.
Normal keypress doesn't cause the backspace action either. Is this because backspace is not an input value?
*/
document.addEventListener("keyup", function(e) {
	if (e.keyCode == 8) {
		s2InjectForKeys.lastClickedElement.value = s2InjectForKeys.lastClickedElement.value.substring(0, s2InjectForKeys.lastClickedElement.value.length - 1);
	}
});



// ------------------------------------------------------------------------------------------------------------------
// 2

var SAGE2Connection = {
	// Will be filled out after Webview scrit activation (~.2 second after this script gets injected)
	wsio: null,
	appId: null,
	uniqueID: null,
	debug: true,


	/*
		This function is activated by the secondary script injection of Webview.
		It will be passed the hostname of the server. Each site is different.
		Name passed will be based on the displayed name in topleft of display.
	*/
	initS2Connection: function(s2Hostname, appIdOfWebview, session) {
		var _this = this;
		this.appId = appIdOfWebview;
		// Create a connection to the SAGE2 server
		// error here, the WebsocketIO may need to change
		this.wsio = new this.WebsocketIO(s2Hostname); // uses ../../../src/websocket.io.js
		this.wsio.open(function() {
			if (_this.debug) {
				console.log("Websocket opened");
			}
			_this.setupListeners();
			// var session = getCookie("session"); // if meetingID, _this need to be solved later somehow
			var clientDescription = {
				clientType: "sageUI", // maybe add additional client type?
				requests: {
					config:  true,
					version: true,
					time:    false,
					console: false
				},
				browser: _this.SAGE2_browser(),
				session: session
			};
			_this.wsio.emit("addClient", clientDescription);
		});
		// socket close event (i.e. server crashed)
		this.wsio.on("close", function(evt) {
			console.log("Server offline");
		});
	},
	// ------------------------------------------------------------------------------------------------------------------
	setupListeners: function() {
		var _this = this;
		this.wsio.on("remoteConnection", function(data) {
			if (_this.debug) {
				console.log("Response from server:" + data.status);
			}
		});
		this.wsio.on("initialize", function(data) {
			console.log("Webpage in Webview " + _this.appId + " connected to server and received uniqueID:" + data.UID);
			_this.uniqueID = data.UID;
			if (_this.debug) {
				var dataToSend = {
					type: "consolePrint",
					message: "This is from webpage in Webview " + _this.appId
						+ " and has been given unique id " + _this.uniqueID
						+ " viewing page:" + window.location
				};
				SAGE2Connection.wsio.emit("csdMessage", dataToSend);
			}
		});
		this.wsio.on("utdConsoleMessage", function(data) {
			console.log("UTD message:" + data.message);
		});
		this.wsio.on("dtuRmbContextMenuContents", function(data) {
			// TODO remove
		});
		this.wsio.on("csdSendDataToClient", function(data) {
			// unsure if this function is reachable
			window[data.func](data);
		});
		/*
		**Important**
		This is how the webpage in the Webview will get non-standard data.
		Note the function has to exist on the window level.
		Maybe change this to SAGE2Connection?
		*/
		this.wsio.on("broadcast", function(data) {
			window[data.func](data);
		});
	},









	// ------------------------------------------------------------------------------------------------------------------
	// ------------------------------------------------------------------------------------------------------------------
	// ------------------------------------------------------------------------------------------------------------------
	/**
	 * Detect the current browser
	 *
	 * @method SAGE2_browser
	 */
	SAGE2_browser: function() {
		var browser = {};
		var userAgent = window.navigator.userAgent.toLowerCase();
		browser.isOpera    = userAgent.indexOf("opera") >= 0;
		browser.isIE       = !browser.isOpera && (userAgent.indexOf("edge") >= 0 || userAgent.indexOf("msie") >= 0 ||
				userAgent.indexOf("trident") >= 0);
		browser.isChrome   = !browser.isIE && userAgent.indexOf("chrome") >= 0;
		browser.isWebKit   = userAgent.indexOf("webkit") >= 0;
		browser.isSafari   = !browser.isChrome && !browser.isIE && userAgent.indexOf("safari") >= 0;
		browser.isGecko    = !browser.isWebKit && userAgent.indexOf("gecko") >= 0;
		browser.isFirefox  = browser.isGecko && userAgent.indexOf("firefox") >= 0;
		browser.isWinPhone = userAgent.indexOf("windows phone") >= 0;
		browser.isIPhone   = userAgent.indexOf("iphone") >= 0;
		browser.isIPad     = userAgent.indexOf("ipad") >= 0;
		browser.isIPod     = userAgent.indexOf("ipod") >= 0;
		browser.isIOS      = !browser.isWinPhone && (browser.isIPhone || browser.isIPad || browser.isIPod);
		browser.isAndroid  = userAgent.indexOf("android") >= 0;
		browser.isAndroidTablet = (userAgent.indexOf("android") >= 0) && !(userAgent.indexOf("mobile") >= 0);
		browser.isWindows  = userAgent.indexOf("windows") >= 0 || userAgent.indexOf("win32") >= 0;
		browser.isMac      = !browser.isIOS && (userAgent.indexOf("macintosh") >= 0 || userAgent.indexOf("mac os x") >= 0);
		browser.isLinux    = userAgent.indexOf("linux") >= 0;
		// Mobile clients
		browser.isMobile   = browser.isWinPhone || browser.isIOS || browser.isAndroid;
		// Keep a copy of the UA
		browser.userAgent  = userAgent;
		// Copy into the global object
		return browser;
	},

	/*
	Modified from public/src/websocket.io.js
	*/
	WebsocketIO: function(url) {
		if (url !== undefined && url !== null) {
			this.url = url;
		} else {
			this.url = (window.location.protocol === "https:" ? "wss" : "ws") + "://" + window.location.host +
						"/" + window.location.pathname.split("/")[1];
		}
		if (url.indexOf("ws") === -1) {
			this.url = "ws://" + url;
		}

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
		 * number of aliases created for listeners
		 *
		 * @property aliasCount
		 * @type Integer
		 */
		this.aliasCount = 1;

		/**
		 * list of listeners on other side of connection
		 *
		 * @property remoteListeners
		 * @type Object
		 */
		this.remoteListeners = {"#WSIO#addListener": "0000"};

		/**
		 * list of local listeners on this side of connection
		 *
		 * @property localListeners
		 * @type Object
		 */
		this.localListeners = {"0000": "#WSIO#addListener"};

		/**
		* Open a websocket
		*
		* @method open
		* @param callback {Function} function to be called when the socket is ready
		*/
		this.open = function(callback) {
			var _this = this;
			if (this.debug) {
				console.log('WebsocketIO> open', this.url);
			}
			this.ws = new WebSocket(this.url);
			this.ws.binaryType = "arraybuffer";
			this.ws.onopen = callback;

			// Handler when a message arrives
			this.ws.onmessage = function(message) {
				var fName;
				// text message
				if (typeof message.data === "string") {
					var msg = JSON.parse(message.data);
					fName = _this.localListeners[msg.f];
					if (fName === undefined) {
						console.log('WebsocketIO> No handler for message');
					}

					if (fName === "#WSIO#addListener") {
						_this.remoteListeners[msg.d.listener] = msg.d.alias;
						return;
					}
					_this.messages[fName](msg.d);
				} else {
					var uInt8 = new Uint8Array(message.data);
					var func  = String.fromCharCode(uInt8[0]) +
								String.fromCharCode(uInt8[1]) +
								String.fromCharCode(uInt8[2]) +
								String.fromCharCode(uInt8[3]);
					fName = _this.localListeners[func];
					var buffer = uInt8.subarray(4, uInt8.length);
					_this.messages[fName](buffer);
				}
			};
			// triggered by unexpected close event
			this.ws.onclose = function(evt) {
				console.log("WebsocketIO> socket closed");
				if ('close' in _this.messages) {
					_this.messages.close(evt);
				}
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
			var alias = ("0000" + this.aliasCount.toString(16)).substr(-4);
			this.localListeners[alias] = name;
			this.messages[name] = callback;
			this.aliasCount++;
			if (name === "close") {
				return;
			}
			this.emit('#WSIO#addListener', {listener: name, alias: alias});
		};

		/**
		* Send a message with a given name and payload (format> f:name d:payload)
		*
		* @method emit
		* @param name {String} name of the message (i.e. RPC)
		* @param data {Object} data to be sent with the message
		*/
		this.emit = function(name, data, attempts) {
			if (name === null || name === "") {
				console.log("Error: no message name specified");
				return;
			}
			var _this = this;
			var message;
			var alias = this.remoteListeners[name];
			if (alias === undefined) {
				if (attempts === undefined) {
					attempts = 16;
				}
				if (attempts >= 0) {
					setTimeout(function() {
						_this.emit(name, data, attempts - 1);
					}, 4);
				} else {
					console.log("Warning: not sending message, recipient has no listener (" + name + ")");
				}
				return;
			}
			// send binary data as array buffer
			if (data instanceof Uint8Array) {
				// build an array with the name of the function
				var funcName = new Uint8Array(4);
				funcName[0] = alias.charCodeAt(0);
				funcName[1] = alias.charCodeAt(1);
				funcName[2] = alias.charCodeAt(2);
				funcName[3] = alias.charCodeAt(3);
				message = new Uint8Array(4 + data.length);
				// copy the name of the function first
				message.set(funcName, 0);
				// then copy the payload
				message.set(data, 4);
				// send the message using websocket
				this.ws.send(message.buffer);
			} else {
				// send data as JSON string
				message = {f: alias, d: data};
				this.ws.send(JSON.stringify(message));
			}
		};

		/**
		* Deliberate close function
		*
		* @method emit
		*/
		this.close = function() {
			// disable onclose handler first
			this.ws.onclose = function() {};
			// then close
			this.ws.close();
		};
	} // end WebsocketIO



}; // end SAGE2Connection

