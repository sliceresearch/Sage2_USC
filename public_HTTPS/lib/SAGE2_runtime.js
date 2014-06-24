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
		if(xhr.readyState == 4 && xhr.status == 200){
			if     (dataType === "TEXT") callback(xhr.responseText);
			else if(dataType === "JSON") callback(JSON.parse(xhr.responseText));
			else if(dataType === "CSV")  callback(CSVToArray(xhr.responseText));
			else                         callback(xhr.responseText);
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
	while (arrMatches = objPattern.exec( strData )){

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
