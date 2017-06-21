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
	SAGE2Connection to allow external webpages to communicate with SAGE2.
*/

/**
* Global object to connect back to SAGE2.
*
* @class SAGE2Connection
*/
var SAGE2Connection = {
	// Will be filled out through initS2Connection or detectConnectionInformationFromBrowser
	wsio: null,
	appId: null,
	pointerName: null,
	pointerColor: null,
	uniqueID: null,
	debug: true,
	isMaster: false,
	afterSAGE2Connection: null,
	hostname: null,

	/**
	* Attempts to connect to server.
	* Apps connecting back should not need to fill this out since the information should be in the browser.
	*
	* @method initS2Connection
	* @param {String} s2Hostname - Expected to contains the below properties.
	* @param {String} session - password hash.
	* @param {Boolean} isMasterDisplayOrUniqueWebpage - Check for later usage in webview.
	* @param {String} appIdOfWebview - Check for later usage in webview.
	*/
	initS2Connection: function(s2Hostname = null, session = null, isMasterDisplayOrUniqueWebpage = true, appIdOfWebview = null) {
		// if not given a hostname, probably this is an app page connecting back.
		if (s2Hostname === null) {
			// first check if url was given parameters
			this.detectConnectionInformationFromBrowser();
			session = this.getCookie("session");
		} else {
			this.appId = appIdOfWebview;
			this.hostname = s2Hostname;
			this.isMaster = isMasterDisplayOrUniqueWebpage ? isMasterDisplayOrUniqueWebpage : false; // undefined == false
		}
		var _this = this;
		// Create a connection to the SAGE2 server
		this.wsio = new this.WebsocketIO(s2Hostname);
		this.wsio.open(function() {
			if (_this.debug) {
				console.log("Websocket opened");
			}
			_this.setupListeners();
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
			console.log("Webpage connected to server and received uniqueID:" + data.UID);
			_this.uniqueID = data.UID;
			if (_this.afterSAGE2Connection) {
				_this.afterSAGE2Connection();
			}
		});
		this.wsio.on("sendDataToClient", function(data) {
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
			window[data.func](data.data);
		});
	},

	// ------------------------------------------------------------------------------------------------------------------
	// ------------------------------------------------------------------------------------------------------------------
	// ------------------------------------------------------------------------------------------------------------------
	// Helper functions that may help users with server communication 

	/**
	* Attempts to activate function on app giving specified parameter object.
	* Will add additional values to the parameter object before sending.
	*
	* @method callFunctionOnApp
	* @param {String} functionName - Expected to contains the below properties.
	* @param {Object} parameterObject - Object to give to app function as parameter.
	*/
	callFunctionOnApp: function(functionName, parameterObject) {
		var data = {};
		data.app = this.appId;
		data.func = functionName;
		data.parameters = parameterObject;
		data.parameters.clientName = this.pointerName;
		data.parameters.clientColor = this.pointerColor;
		data.parameters.clientId   = this.uniqueID;

		this.wsio.emit('callFunctionOnApp', data);
	},


	// ------------------------------------------------------------------------------------------------------------------
	// ------------------------------------------------------------------------------------------------------------------
	// ------------------------------------------------------------------------------------------------------------------
	// Connection functions
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
	// ------------------------------------------------------------------------------------------------------------------
	detectConnectionInformationFromBrowser: function() {
		var address = window.location.search;
		if (address.indexOf("?") == -1 ) {
			return;
		}
		var pairs, onePair;
		address = address.substring(address.indexOf("?") + 1);
		// if there is only one url param, put it into an array by itself.
		if (address.indexOf("&") == -1) {
			pairs = [address];
		} else { // otherwise split on each param
			pairs = address.split("&");
		}
		for (var i = 0; i < pairs.length; i++) {
			onePair = pairs[i].split("=");
			if (onePair[0] == "appId") {
				this.appId = onePair[1];
			} else if (onePair[0] == "pointerName") {
				this.pointerName = onePair[1];
			} else if (onePair[0] == "pointerColor") {
				this.pointerColor = onePair[1];
			}
		}
		// Pointer name / color might actually be in localStorage
		if (localStorage.SAGE2_ptrName) {
			this.pointerName = localStorage.SAGE2_ptrName;
		}
		if (localStorage.SAGE2_ptrColor) {
			this.pointerColor = localStorage.SAGE2_ptrColor;
		}
		console.log(this.appId + " control for " + this.pointerName + "(" + this.pointerColor + ") starting");
		if (!this.appId || !this.pointerName || !this.pointerColor) {
			throw "Error url didn't contain necessary values";
			// TODO add more description and probably close the window
		}
	},
	// ------------------------------------------------------------------------------------------------------------------
	/**
	 * Return a cookie value for given key
	 *
	 * @method getCookie
	 * @param sKey {String} key
	 * @return {String} value found or null
	 */
	getCookie: function(sKey) {
		if (!sKey) {
			return null;
		}
		return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" +
					encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1"))
			|| null;
	},

	// ------------------------------------------------------------------------------------------------------------------
	// ------------------------------------------------------------------------------------------------------------------
	// ------------------------------------------------------------------------------------------------------------------
	/*
	Modified from public/src/websocket.io.js
	*/
	WebsocketIO: function(url) {
		if (url !== undefined && url !== null) {
			this.url = url;
			if (this.url.indexOf("ws") === -1) { // needs to be a websocket connection
				this.url = "ws://" + url;
			}
		} else {
			this.url = (window.location.protocol === "https:" ? "wss" : "ws") + "://" + window.location.host +
						"/" + window.location.pathname.split("/")[1];
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
