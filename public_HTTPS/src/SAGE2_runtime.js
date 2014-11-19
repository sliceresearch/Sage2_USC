// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

//
// Generic functions used by all SAGE2 applications
//

// Global variables
var __SAGE2__ = {};
__SAGE2__.version = "0.2.0";


function SAGE2_initialize(data_seed) {
	// Reset random number based on server's time
	Math.seed(data_seed.getTime());
}

// Debug log function: send parameters to server for printout
//  if mutiple paramters, sent as one array
function log (obj) {
	if (arguments.length===0) return;
	var args;
	if (arguments.length > 1)
		args = Array.prototype.slice.call(arguments);
	else
		args = obj;
	// send a log message to the server
	sage2Log({app: "index", message: args});
}


////////////////////////////////////////////////////////////////////////////////
// Basic fucntion for creating DOM elements
//
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



////////////////////////////////////////////////////////////////////////////////
// Basic data types for inter-application communications
//
var SAGE2types = {};
function _LatLng(lat, lng) {
	this.description = "Depicts a geolocation";
	this.value   = {lat:lat,lng:lng};
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
	if (_typeOf(obj) === 'object')
		this.value = obj;
	else
		this.value = {value: obj};
	this.jsonstr = JSON.stringify(this.value);
}
SAGE2types.Object = _Object;

function _Array(obj) {
	this.description = "Depicts a javascript array";
	if (_typeOf(obj) === 'array')
		this.value = obj;
	else
		this.value = [obj];
	this.jsonstr = JSON.stringify(this.value);
}
SAGE2types.Array = _Array;

function _Date(obj) {
	this.description = "Depicts a javascript date";
	if (_typeOf(obj) === 'date')
		this.value = obj;
	else
		this.value = new Date(obj);
	this.jsonstr = JSON.stringify(this.value);
}
SAGE2types.Date = _Date;

SAGE2types.isaLatLng = function(obj) { return obj instanceof SAGE2types.LatLng; };
SAGE2types.isaInt    = function(obj) { return obj instanceof SAGE2types.Int; };
SAGE2types.isaFloat  = function(obj) { return obj instanceof SAGE2types.Float; };
SAGE2types.isaString = function(obj) { return obj instanceof SAGE2types.String; };
SAGE2types.isaObject = function(obj) { return obj instanceof SAGE2types.Object; };
SAGE2types.isaArray  = function(obj) { return obj instanceof SAGE2types.Array; };
SAGE2types.isaDate   = function(obj) { return obj instanceof SAGE2types.Date; };

SAGE2types.create    = function(val) {
	if (_typeOf(val) === 'object') {
		if (val.hasOwnProperty('lat') && val.hasOwnProperty('lng'))
			return new SAGE2types.LatLng(val.lat,val.lng);
		else
			return new SAGE2types.Object(val);
	}
	else if (_typeOf(val) === 'array') {
		return new SAGE2types.Array(val);
	}
	else if (_typeOf(val) === 'number') {
		var v = parseInt(val);
		if (v === val)
			return new SAGE2types.Int(val);
		else
			return new SAGE2types.Float(val);
	}
	else if (_typeOf(val) === 'string') {
		return new SAGE2types.String(val);		
	}
	else if (_typeOf(val) === 'date') {
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

////////////////////////////////////////////////////////////////////////////////


// Pretty print in browser and send to server
//
function sage2Log(msgObject) {
	// Local console print
	console.log("%c[%s] %c%s", "color: blue;", msgObject.app,
		"color: black;", JSON.stringify(msgObject.message));

	// Add the display node ID to the message
	msgObject.node = clientID;

	// Send the message to the server
	wsio.emit('sage2Log', msgObject);
}

function broadcast(dataObject) {
	wsio.emit('broadcast', dataObject);
}

function searchTweets(tweetObject) {
	wsio.emit('searchTweets', tweetObject);
}

function formatAMPM(date) {
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var ampm = hours >= 12 ? "pm" : "am";
	hours = hours % 12;
	if (hours === 0) hours = 12;
	var hh = hours.toString();
	var mm = minutes < 10 ? "0"+minutes.toString() : minutes.toString();
	return (hh + ":" + mm + ampm);
}

function format24Hr(date) {
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var hh = hours.toString();
	var mm = minutes < 10 ? "0"+minutes.toString() : minutes.toString();
	return (hh + ":" + mm);
}

function base64ToString(base64) {
	//return decodeURIComponent(escape(atob(base64)));
	return atob(base64);
}

function stringToBase64(string) {
	//return btoa(unescape(encodeURIComponent(string)));
	return btoa(string);
}

function stringToUint8Array(string) {
    var uint8Array = new Uint8Array(new ArrayBuffer(string.length));
    for (var i = 0; i < string.length; i++) {
        uint8Array[i] = string.charCodeAt(i);
    }

    return uint8Array;
}

function base64ToUint8Array(base64) {
    var raw = atob(base64); //This is a native function that decodes a base64-encoded string.
    var uint8Array = new Uint8Array(new ArrayBuffer(raw.length));
    for (var i = 0; i < raw.length; i++) {
        uint8Array[i] = raw.charCodeAt(i);
    }

    return uint8Array;
}

function readFile(filename, callback, type) {
	var dataType = type || "TEXT";
	
	var xhr = new XMLHttpRequest();
	xhr.open("GET", filename, true);
	xhr.onreadystatechange = function() {
		if(xhr.readyState == 4){
			if(xhr.status == 200){
				if     (dataType === "TEXT") callback(null, xhr.responseText);
				else if(dataType === "JSON") callback(null, JSON.parse(xhr.responseText));
				else if(dataType === "CSV")  callback(null, CSVToArray(xhr.responseText));
				else if(dataType === "SVG")  callback(null, xhr.responseXML.getElementsByTagName('svg')[0]);
				else                         callback(null, xhr.responseText);
			}
			else{
				callback("Error: File Not Found", null);
			}
		}
	};
	xhr.send();
}

function CSVToArray(strData, strDelimiter){
	// Check to see if the delimiter is defined. If not,
	// then default to comma.
	strDelimiter = strDelimiter || ",";

	// Create a regular expression to parse the CSV values.
	var objPattern = new RegExp(("(\\" + strDelimiter + "|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");

	// Create an array to hold our data. Give the array
	// a default empty first row.
	var arrData = [[]];

	// Create an array to hold our individual pattern
	// matching groups.
	var arrMatches = null;


	// Keep looping over the regular expression matches
	// until we can no longer find a match.
	while (arrMatches = objPattern.exec( strData )) {

		// Get the delimiter that was found.
		var strMatchedDelimiter = arrMatches[ 1 ];

		// Check to see if the given delimiter has a length
		// (is not the start of string) and if it matches
		// field delimiter. If id does not, then we know
		// that this delimiter is a row delimiter.
		if(strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter){
			// Since we have reached a new row of data,
			// add an empty row to our data array.
			arrData.push([]);
		}

		var strMatchedValue;

		// Now that we have our delimiter out of the way,
		// let's check to see which kind of value we
		// captured (quoted or unquoted).
		if(arrMatches[2]){
			// We found a quoted value. When we capture
			// this value, unescape any double quotes.
			strMatchedValue = arrMatches[2].replace(new RegExp( "\"\"", "g" ),"\"");
		}
		else{
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

function average(arr) {
	var l = arr.length;
	if (l === 0) return 0;
	var sum = 0;
	for(var i=0; i<l; i++){
		sum += arr[i];
	}
	return sum / l;
}

function allTrueDict(dict) {
	var key;
	for(key in dict){
		if(dict[key] !== true) return false;
	}
	return true;
}

function getParameterByName(name) {
	name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	results = regex.exec(location.search);
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

	
function playPauseVideo(elemId) {
	var videoElem = document.getElementById(elemId + "_video");
	if (videoElem.paused === true) { videoElem.play(); console.log("play"); }
	else{ videoElem.pause(); console.log("pause"); }
}

function moveItemToFront(elem) {
	var last = elem.parentNode.lastChild;
	if(elem != last){
		elem.parentNode.replaceChild(elem, last);
		elem.parentNode.insertBefore(last, elem);
	}
}

function cleanURL(url) {
	var a = document.createElement("a");
	a.href = url;
	var clean = url;
	
	if(hostAlias[a.hostname] !== undefined)
		clean = url.replace(a.hostname, hostAlias[a.hostname]);
	
	return clean;
}

function isEmpty(obj) {
	// undefined and null are "empty"
	if (obj === undefined || obj === null) return true;

	// Assume if it has a length property with a non-zero value
	// that that property is correct.
	if (obj.length > 0)    return false;
	if (obj.length === 0)  return true;

	// Otherwise, does it have any properties of its own?
	// Note that this doesn't handle
	// toString and valueOf enumeration bugs in IE < 9
	for (var key in obj) {
		if (hasOwnProperty.call(obj, key)) return false;
	}

	return true;
}
	

// Redefine random function to work in distributed fashion
Math.seed = function(s) {
	Math.random = function() {
		// POSIX drand48 ==> Xn+1 = (a*Xn+c) % m
		var a = 25214903917;
		var c = 11;
		var m = 281474976710656;
		
		s = (a*s+c) % m;
		return s / m;
	};
};
