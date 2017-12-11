// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-16

/* global hostAlias */

"use strict";

/**
 * Generic functions used by all SAGE2 applications
 *
 * @module client
 * @submodule SAGE2_runtime
 * @class SAGE2_runtime
 */


/**
 * Global object, containing the version number
 *
 * @property __SAGE2__
 * @type {Object}
 */
var __SAGE2__ = {};
__SAGE2__.version = "3.0.0";


/**
 * In Strict mode Webix doesn't use "eval"
 * Should be enabled if Content Security Policy is switched on for the application
 * or if the application runs in a "strict" mode
 * The flag should be enabled before Webix files are included into the page
 */
window.webix_strict = true;

/**
 * Initializes global settings: random generator, ...
 *
 * @method SAGE2_initialize
 * @param data_seed {Date} seed number
 */
function SAGE2_initialize(data_seed) {
	// Reset random number based on server's time
	Math.seed(data_seed.getTime());
}

/**
 * Detect the current browser
 *
 * @method SAGE2_browser
 */
function SAGE2_browser() {
	var browser = {};
	var userAgent = window.navigator.userAgent.toLowerCase();
	// Internet Explorer 6-11
	browser.isIE       = /*@cc_on!@*/false || !!document.documentMode;
	// Edge 20+
	browser.isEdge     = !browser.isIE && !!window.StyleMedia;
	browser.isOpera    = userAgent.indexOf("opr") >= 0;
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
	browser.isElectron = (typeof window !== 'undefined' && window.process && window.process.type === "renderer") === true;
	// Mobile clients
	browser.isMobile   = browser.isWinPhone || browser.isIOS || browser.isAndroid;

	// Store a string for the type of browser
	var browserType = browser.isElectron ? "Electron" :
		browser.isIE ? "Explorer" :
			browser.isEdge ? "Edge" :
				browser.isFirefox ? "Firefox" :
					browser.isSafari ? "Safari" :
						browser.isOpera ? "Opera" :
							browser.isChrome ? "Chrome" : "---";
	browser.browserType  = browserType;

	// Detecting version
	var _browser = {};
	var match    = '';
	var ua       = userAgent;
	_browser.electron = /electron/.test(ua);
	_browser.opr      = /mozilla/.test(ua) && /applewebkit/.test(ua) && /chrome/.test(ua) && /safari/.test(ua) && /opr/.test(ua);
	_browser.firefox  = /mozilla/.test(ua) && /firefox/.test(ua);
	_browser.msie     = /msie/.test(ua) || /trident/.test(ua) || /edge/.test(ua);
	_browser.safari   = /safari/.test(ua)  && /applewebkit/.test(ua) && !/chrome/.test(ua);
	_browser.chrome   = /webkit/.test(ua) && /chrome/.test(ua) && !/edge/.test(ua);
	_browser.version  = '';
	for (var x in _browser) {
		if (_browser[x]) {
			match = ua.match(
				new RegExp("(" + (x === "msie" ? "msie|edge" : x === "safari" ? "version" : x) + ")( |/)([0-9.]+)")
			);
			if (match) {
				_browser.version = match[3];
			} else {
				match = ua.match(new RegExp("rv:([0-9]+)"));
				_browser.version = match ? match[1] : "";
			}
			break;
		}
	}
	browser.version = _browser.version;
	// version done

	// Keep a copy of the UA
	browser.userAgent  = userAgent;
	// Copy into the global object
	__SAGE2__.browser   = browser;
}

/**
 * Debug log function: send parameters to server for printout
 *   if mutiple paramters, sent as one array
 *
 * @method log
 * @param obj {Object} data to be printed
 */
function log(obj) {
	if (arguments.length === 0) {
		return;
	}
	var args;
	if (arguments.length > 1) {
		args = Array.prototype.slice.call(arguments);
	} else {
		args = obj;
	}
	// send a log message to the server
	sage2Log({app: "client", message: args});
}

/**
 * Basic function for creating a canvas in the DOM
 *
 * @method createDrawingElement
 * @param id {String} DOM id to be created
 * @param className {String}  CSS class
 * @param posx {Number} position x
 * @param posy {Number}  position y
 * @param width {Number}  width (number in pixel)
 * @param height {Number} height (number in pixel)
 * @param depth {Number} z index
 * @return {Element} DOM canvas element
 */
function createDrawingElement(id, className, posx, posy, width, height, depth) {
	var element = document.createElement("canvas");
	element.id  = id;
	element.className    = className;
	element.width        = width;
	element.height       = height;
	element.style.left   = posx.toString() + "px";
	element.style.top    = posy.toString() + "px";
	element.style.zIndex = depth.toString();
	return element;
}


/**
 * Basic data types for inter-application communications
 *
 * @property SAGE2types
 * @type {Object}
 */
var SAGE2types = {};
function _LatLng(lat, lng) {
	this.description = "Depicts a geolocation";
	this.value   = {lat: lat, lng: lng};
	this.jsonstr = JSON.stringify(this.value);
}
SAGE2types.LatLng = _LatLng;

function _Int(val) {
	this.description = "Depicts an integer value";
	this.value   = parseInt(val);
	this.jsonstr = JSON.stringify(this.value);
}
SAGE2types.Int = _Int;

function _Float(val) {
	this.description = "Depicts an floating point value";
	this.value   = parseFloat(val);
	this.jsonstr = JSON.stringify(this.value);
}
SAGE2types.Float = _Float;

function _String(str) {
	this.description = "Depicts a string of characters";
	this.value   = str;
	this.jsonstr = str;
}
SAGE2types.String = _String;

function _Boolean(val) {
	this.description = "Depicts a boolean value";
	this.value   = (val === true);
	this.jsonstr = JSON.stringify(val);
}
SAGE2types.Boolean = _Boolean;

function _Object(obj) {
	this.description = "Depicts a javascript object";
	if (_typeOf(obj) === 'object') {
		this.value = obj;
	} else {
		this.value = {value: obj};
	}
	this.jsonstr = JSON.stringify(this.value);
}
SAGE2types.Object = _Object;

function _Array(obj) {
	this.description = "Depicts a javascript array";
	if (_typeOf(obj) === 'array') {
		this.value = obj;
	} else {
		this.value = [obj];
	}
	this.jsonstr = JSON.stringify(this.value);
}
SAGE2types.Array = _Array;

function _Date(obj) {
	this.description = "Depicts a javascript date";
	if (_typeOf(obj) === 'date') {
		this.value = obj;
	} else {
		this.value = new Date(obj);
	}
	this.jsonstr = JSON.stringify(this.value);
}
SAGE2types.Date = _Date;

SAGE2types.isaLatLng = function(obj) {
	return obj instanceof SAGE2types.LatLng;
};
SAGE2types.isaInt = function(obj) {
	return obj instanceof SAGE2types.Int;
};
SAGE2types.isaFloat = function(obj) {
	return obj instanceof SAGE2types.Float;
};
SAGE2types.isaString = function(obj) {
	return obj instanceof SAGE2types.String;
};
SAGE2types.isaObject = function(obj) {
	return obj instanceof SAGE2types.Object;
};
SAGE2types.isaArray = function(obj) {
	return obj instanceof SAGE2types.Array;
};
SAGE2types.isaDate = function(obj) {
	return obj instanceof SAGE2types.Date;
};

SAGE2types.create = function(val) {
	if (_typeOf(val) === 'object') {
		if (val.hasOwnProperty('lat') && val.hasOwnProperty('lng')) {
			return new SAGE2types.LatLng(val.lat, val.lng);
		}
		return new SAGE2types.Object(val);
	}
	if (_typeOf(val) === 'array') {
		return new SAGE2types.Array(val);
	}
	if (_typeOf(val) === 'number') {
		var v = parseInt(val);
		if (v === val) {
			return new SAGE2types.Int(val);
		}
		return new SAGE2types.Float(val);
	}
	if (_typeOf(val) === 'string') {
		return new SAGE2types.String(val);
	}
	if (_typeOf(val) === 'date') {
		return new SAGE2types.Date(val);
	}
	return null;
};

// from javascript.crockford.com
function _typeOf(value) {
	var s = typeof value;
	if (s === 'object') {
		if (value) {
			if (value instanceof Array) {
				s = 'array';
			} else if (value instanceof Date) {
				s = 'date';
			}
		} else {
			s = 'null';
		}
	}
	return s;
}

/**
 * Pretty print in browser and send to server
 *
 * @method sage2Log
 * @param msgObject {Object} data to be printed
 */
function sage2Log(msgObject) {
	// Local console print
	console.log("%c[%s] %c%s", "color: cyan;", msgObject.app,
		"color: grey;", JSON.stringify(msgObject.message));

	// Add the display node ID to the message
	msgObject.node = clientID;

	// Send the message to the server
	wsio.emit('sage2Log', msgObject);
}

/**
 * Send the broadcast call to the server
 *
 * @method broadcast
 * @param dataObject {Object} data to be sent
 */
function broadcast(dataObject) {
	wsio.emit('broadcast', dataObject);
}

/**
 * Pretty print a date object into string
 *
 * @method formatAMPM
 * @param date {Object} momentjs object for time
 * @return {String} formatted date
 */
function formatAMPM(date) {
	return date.format('h:mm a');
}

/**
 * Convert date into 24h string format
 *
 * @method format24Hr
 * @param date {Object} momentjs object for time
 * @return {String} formatted date
 */
function format24Hr(date) {
	return date.format('HH:mm');
}

/**
 * Convert a duration number into readable string
 *
 * @method formatHHMMSS
 * @param duration {Number} duration
 * @return {String} formatted duration
 */
function formatHHMMSS(duration) {
	var ss = parseInt((duration / 1000) % 60,             10);
	var mm = parseInt((duration / (1000 * 60)) % 60,      10);
	var hh = parseInt((duration / (1000 * 60 * 60)) % 24, 10);

	hh = (hh < 10) ? "0" + hh : hh;
	mm = (mm < 10) ? "0" + mm : mm;
	ss = (ss < 10) ? "0" + ss : ss;

	return (hh + ":" + mm + ":" + ss);
}

/**
 * Decode base64 into string
 *
 * @method base64ToString
 * @param base64 {String} content to be decoded
 * @return {String} string content
 */
function base64ToString(base64) {
	return atob(base64);
}

/**
 * Encode a string to base64
 *
 * @method stringToBase64
 * @param string {String} content to be encoded
 * @return {String} base64 content
 */
function stringToBase64(string) {
	return btoa(string);
}

/**
 * Smallest transparent image, put in a image tag source
 *
 * @method smallTansparentGIF
 * @return {String} small GIF image in base64 content
 */
function smallTansparentGIF() {
	return "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
}

/**
 * Smallest white image, put in a image tag source
 *
 * @method smallWhiteGIF
 * @return {String} small GIF image in base64 content
 */
function smallWhiteGIF() {
	return "data:image/gif;base64,R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=";
}


/**
 * Convert a string to Uint8Array typed array
 *
 * @method stringToUint8Array
 * @param string {String} string to be converted
 * @return {TypedArray} resulting array
 */
function stringToUint8Array(string) {
	var uint8Array = new Uint8Array(new ArrayBuffer(string.length));
	for (var i = 0; i < string.length; i++) {
		uint8Array[i] = string.charCodeAt(i);
	}
	return uint8Array;
}

/**
 * Convert a string to Uint8Array typed array
 *
 * @method base64ToUint8Array
 * @param base64 {String} string to be converted
 * @return {TypedArray} resulting array
 */
function base64ToUint8Array(base64) {
	// This is a native function that decodes a base64-encoded string
	var raw = atob(base64);
	var uint8Array = new Uint8Array(new ArrayBuffer(raw.length));
	for (var i = 0; i < raw.length; i++) {
		uint8Array[i] = raw.charCodeAt(i);
	}
	return uint8Array;
}

/**
 * Do a HTTP GET request to the server to retrieve a file content
 *
 * @method readFile
 * @param filename {String} URL of the file to be read
 * @param callback {Function} called when data is received: callback(err, data)
 * @param type {String} type of data: TEXT, JSON, CSV, or SVG
 */
function readFile(filename, callback, type) {
	var dataType = type || "TEXT";

	var xhr = new XMLHttpRequest();
	xhr.open("GET", filename, true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				if (dataType === "TEXT") {
					callback(null, xhr.responseText);
				} else if (dataType === "JSON") {
					callback(null, JSON.parse(xhr.responseText));
				} else if (dataType === "CSV") {
					callback(null, csvToArray(xhr.responseText));
				} else if (dataType === "SVG") {
					callback(null, xhr.responseXML.getElementsByTagName('svg')[0]);
				} else {
					callback(null, xhr.responseText);
				}
			} else {
				callback("Error: File Not Found", null);
			}
		}
	};
	xhr.send();
}

/**
 * Convert CSV data to an array (used by the readFile function)
 *
 * @method csvToArray
 * @param strData {String} data to be converter
 * @param strDelimiter {String} string delimter (parsing using RegExp)
 * @return {Array} array containing the parsed data
 */
function csvToArray(strData, strDelimiter) {
	// Check to see if the delimiter is defined. If not,
	// then default to comma.
	strDelimiter = strDelimiter || ",";

	// Create a regular expression to parse the CSV values.
	var objPattern = new RegExp(("(\\" + strDelimiter +
		"|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" +
		strDelimiter + "\\r\\n]*))"), "gi");

	// Create an array to hold our data. Give the array
	// a default empty first row.
	var arrData = [[]];

	// Create an array to hold our individual pattern
	// matching groups.
	var arrMatches = null;

	// Keep looping over the regular expression matches
	// until we can no longer find a match.
	while (arrMatches = objPattern.exec(strData)) {  // eslint-disable-line

		// Get the delimiter that was found.
		var strMatchedDelimiter = arrMatches[ 1 ];

		// Check to see if the given delimiter has a length
		// (is not the start of string) and if it matches
		// field delimiter. If id does not, then we know
		// that this delimiter is a row delimiter.
		if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
			// Since we have reached a new row of data,
			// add an empty row to our data array.
			arrData.push([]);
		}

		var strMatchedValue;

		// Now that we have our delimiter out of the way,
		// let's check to see which kind of value we
		// captured (quoted or unquoted).
		if (arrMatches[2]) {
			// We found a quoted value. When we capture
			// this value, unescape any double quotes.
			strMatchedValue = arrMatches[2].replace(new RegExp("\"\"", "g"), "\"");
		} else {
			// We found a non-quoted value.
			strMatchedValue = arrMatches[3];

		}

		// Now that we have our value string, let's add
		// it to the data array.
		arrData[arrData.length - 1].push(strMatchedValue);
	}

	// Return the parsed data.
	return arrData;
}

/**
 * Calculate the average value of an array
 *
 * @method average
 * @param arr {Array} values to be averaged
 * @return {Number} the average
 */
function average(arr) {
	var l = arr.length;
	if (l === 0) {
		return 0;
	}
	var sum = 0;
	for (var i = 0; i < l; i++) {
		sum += arr[i];
	}
	return sum / l;
}

/**
 * Test if all values of an object are true
 *
 * @method allTrueDict
 * @param dict {Object} values
 * @return {Bool} true if all values are true
 */
function allTrueDict(dict) {
	var key;
	for (key in dict) {
		if (dict[key] !== true) {
			return false;
		}
	}
	return true;
}

/**
 * Extract the parameter value from the current URL (?clientID=0&param=4)
 *
 * @method getParameterByName
 * @param name {String} parameter to search for
 * @return {String} null or the value found
 */
function getParameterByName(name) {
	name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]"); // eslint-disable-line
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
	var results = regex.exec(location.search);
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/**
 * Search for a video tag and switch its state
 *
 * @method playPauseVideo
 * @param elemId {String} video element to search
 */
function playPauseVideo(elemId) {
	var videoElem = document.getElementById(elemId + "_video");
	if (videoElem.paused === true) {
		videoElem.play();
	} else {
		videoElem.pause();
	}
}

/**
 * Reorder elements at given level in the DOM
 *
 * @method moveItemToFront
 * @param elem {Element} DOM element to reorder
 */
function moveItemToFront(elem) {
	var last = elem.parentNode.lastChild;
	if (elem !== last) {
		elem.parentNode.replaceChild(elem, last);
		elem.parentNode.insertBefore(last, elem);
	}
}

/**
 * Delete an element in the DOM
 *
 * @method deleteElement
 * @param id {Element} DOM element to delete
 */
function deleteElement(id) {
	var elem = document.getElementById(id);
	if (elem !== undefined && elem !== null) {
		elem.parentNode.removeChild(elem);
	}
}

/**
 * Remove of children of a DOM element
 *
 * @method removeAllChildren
 * @param node {Element|String} id or node to be processed
 */
function removeAllChildren(node) {
	// if the parameter a string, look it up
	var elt = (typeof node === "string") ? document.getElementById(node) : node;
	// remove one child at a time
	while (elt.lastChild) {
		elt.removeChild(elt.lastChild);
	}
}


/**
 * Cleanup a URL and replace the origin to match the client (to mitigate CORS problems, cross-origin resource sharing)
 *
 * @method cleanURL
 * @param url {String} URL to clenaup
 * @return {Strinf} new URL
 */
function cleanURL(url) {
	if (url === null) {
		return url;
	}
	var a = document.createElement('a');
	a.href = url;
	var clean = url;

	if (hostAlias[a.origin] !== undefined) {
		clean = url.replace(a.origin, hostAlias[a.origin]);
	}

	return clean;
}

/**
 *
 */
function ignoreFields(obj, fields) {
	var key;

	var result = {};
	for (key in obj) {
		if (fields.indexOf(key) < 0) {
			if (obj[key] === null || obj[key] instanceof Array || typeof obj[key] !== "object") {
				result[key] = obj[key];
			} else {
				result[key] = ignoreFields(obj[key], fields);
			}
		}
	}
	if (isEmpty(result)) {
		return undefined;
	}
	return result;
}

/**
 * Utility function to test if a string or number represents a true value.
 * Used for parsing JSON values
 *
 * @method parseBool
 * @param value {Object} value to test
 */
function parseBool(value) {
	if (typeof value === 'string') {
		value = value.toLowerCase();
	}
	switch (value) {
		case true:
		case "true":
		case 1:
		case "1":
		case "on":
		case "yes": {
			return true;
		}
		default: {
			return false;
		}
	}
}

/**
 * Test if element is equal to true (used in .every call on an array)
 *
 * @method isTrue
 * @param element {Bool} The current element being processed in the array
 * @param index {Number} The index of the current element being processed in the array
 * @param array {Array} The array every was called upon
 * @return {Bool} true if element is true
 */
function isTrue(element, index, array) {
	return (element === true);
}

/**
 * Test is an object is equivalen to 'empty'
 *
 * @method isEmpty
 * @param obj {Object} value to be tested
 * @return {Bool} true if empty
 */
function isEmpty(obj) {
	// undefined and null are "empty"
	if (obj === undefined || obj === null) {
		return true;
	}

	// Assume if it has a length property with a non-zero value
	// that that property is correct.
	if (obj.length > 0) {
		return false;
	}
	if (obj.length === 0) {
		return true;
	}

	// Otherwise, does it have any properties of its own?
	// Note that this doesn't handle
	// toString and valueOf enumeration bugs in IE < 9
	for (var key in obj) {
		if (hasOwnProperty.call(obj, key)) {
			return false;
		}
	}
	return true;
}

/**
 * Create an array of given size filled with a value
 *
 * @method initializeArray
 * @param size {Number} size of the array
 * @param value {Value} initial value
 * @return {Array} new array
 */
function initializeArray(size, value) {
	var arr = new Array(size);
	for (var i = 0; i < size; i++) {
		arr[i] = value;
	}
	return arr;
}

/**
 * Convert an array of byte to an integer
 *
 * @method byteBufferToInt
 * @param buff {Array} buffer to be processed
 * @return {Number} resulting value
 */
function byteBufferToInt(buf) {
	var value = 0;
	for (var i = buf.length - 1; i >= 0; i--) {
		value = (value * 256) + buf[i];
	}
	return value;
}

/**
 * Convert an array of byte to a string (using fromCharCode on every character)
 *
 * @method byteBufferToString
 * @param buff {Array} buffer to be processed
 * @return {String} string
 */
function byteBufferToString(buf) {
	var str = "";
	var i   = 0;
	while (buf[i] !== 0 && i < buf.length) {
		str += String.fromCharCode(buf[i]);
		i++;
	}
	return str;
}

/**
 * Overload Math.seed and Math.random to be deterministic, for distributed work
 *
 * @method Math.seed
 * @param s {Number} seed
 */
Math.seed = function(s) {
	Math.random = function() {
		// POSIX drand48 ==> Xn+1 = (a*Xn+c) % m
		var a = 25214903917;
		var c = 11;
		var m = 281474976710656;
		s = (a * s + c) % m;
		return s / m;
	};
};

/**
 * Add a key-value pair as a cookie
 *
 * @method addCookie
 * @param sKey {String} key
 * @param sValue {String} value
 * @return {Boolean} true/false
 */
function addCookie(sKey, sValue) {
	if (!sKey) {
		return false;
	}
	var domain;
	if (window.location.hostname === "127.0.0.1") {
		domain = "127.0.0.1";
	} else {
		var domainPieces = window.location.hostname.split('.');
		var maybeInt = parseInt(domainPieces[domainPieces.length - 1]);
		var numberOfPiecesFromEndTokeep;

		// if (maybeInt) { // this is a number, so must be last part of an ip address, need 4 parts
		// 	numberOfPiecesFromEndTokeep = 4;
		// } else if (domainPieces[domainPieces.length - 1] == "tw") {
		// 	numberOfPiecesFromEndTokeep = 3;
		// } else { // was a hostname extension
		// 	numberOfPiecesFromEndTokeep = 2;
		// }

		// NaN triggers false on a test
		if (maybeInt) {
			// this is a number, so must be last part of an ip address
			// use the whole hostname
			numberOfPiecesFromEndTokeep = domainPieces.length;
		} else {
			// was a hostname extension
			// to get domain, remove hostname
			numberOfPiecesFromEndTokeep = domainPieces.length - 1;
		}

		// calculate the domain from the spliced hostname
		domain = domainPieces.slice(-1 * numberOfPiecesFromEndTokeep).join(".");
	}

	document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) +
		"; expires=Fri, 31 Dec 9999 23:59:59 GMT" +
		"; domain=" + domain +
		"; path=/";
	return true;
}

/**
 * Delete a cookie for a given key
 *
 * @method deleteCookie
 * @param sKey {String} key
 * @return {Boolean} true/false
 */
function deleteCookie(sKey) {
	if (!sKey) {
		return false;
	}
	document.cookie = encodeURIComponent(sKey) + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	return true;
}

/**
 * Return a cookie value for given key
 *
 * @method getCookie
 * @param sKey {String} key
 * @return {String} value found or null
 */
function getCookie(sKey) {
	if (!sKey) {
		return null;
	}
	return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" +
		encodeURIComponent(sKey).replace(/[-.+*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1"))
		|| null;
}

/**
 * Extract translate and scale from a DOM element
 *
 * @method getTransform
 * @param elem {Object} DOM element
 * @return {Object} contains translate and scale specification
 */
function getTransform(elem) {
	var transform = elem.style.transform;
	var translate = {x: 0, y: 0};
	var scale = {x: 1, y: 1};
	if (transform) {
		var tIdx = transform.indexOf("translate");
		if (tIdx >= 0) {
			var tStr = transform.substring(tIdx + 10, transform.length);
			tStr = tStr.substring(0, tStr.indexOf(")"));
			var tValue = tStr.split(",");
			translate.x = parseFloat(tValue[0]);
			translate.y = parseFloat(tValue[1]);
		}
		var sIdx = transform.indexOf("scale");
		if (sIdx >= 0) {
			var sStr = transform.substring(sIdx + 6, transform.length);
			sStr = sStr.substring(0, sStr.indexOf(")"));
			var sValue = sStr.split(",");
			scale.x = parseFloat(sValue[0]);
			scale.y = parseFloat(sValue[1]);
		}
	}
	return {translate: translate, scale: scale};
}


/**
 * From stackoverflow:
 * Copies a string to the clipboard. Must be called from within an
 * event handler such as click. May return false if it failed, but
 * this is not always possible. Browser support for Chrome 43+,
 * Firefox 42+, Safari 10+, Edge and IE 10+.
 * IE: The clipboard feature may be disabled by an administrator. By
 * default a prompt is shown the first time the clipboard is
 * used (per session)
 *
 * @method     copyToClipboard
 * @param      {String}   text    The text to be copied
 * @return     {Boolean}  A Boolean that is false if the command is not supported or enabled
 */
function SAGE2_copyToClipboard(text) {
	if (window.clipboardData && window.clipboardData.setData) {
		// IE specific code path to prevent textarea being shown while dialog is visible.
		return window.clipboardData.setData("Text", text);
	} else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
		var textarea = document.createElement("textarea");
		textarea.textContent = text;
		// Prevent scrolling to bottom of page in MS Edge
		textarea.style.position = "fixed";
		document.body.appendChild(textarea);
		textarea.select();
		try {
			// Security exception may be thrown by some browsers
			return document.execCommand("copy");
		} catch (ex) {
			console.warn("Copy to clipboard failed.", ex);
			return false;
		} finally {
			document.body.removeChild(textarea);
		}
	}
}
