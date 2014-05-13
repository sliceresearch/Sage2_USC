// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file

//
// Generic functions used by all SAGE2 applications
//

function SAGE2_initialize(data_seed) {
	// Reset random number based on server's time
	Math.seed(data_seed.getTime());
}


function sage2Log(msgObject) {
	// Local console print
	console.log("[" + msgObject.app + "] " + msgObject.message);

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
	if(hours == 0) hours = 12;
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

function average(arr) {
	var l = arr.length;
	if(l == 0) return 0;
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
	return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

	
function playPauseVideo(elemId) {
	var videoElem = document.getElementById(elemId + "_video");
	if(videoElem.paused == true){ videoElem.play(); console.log("play"); }
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
		
		//s = Math.sin(s) * 10000; return s - Math.floor(s);
	}
}
