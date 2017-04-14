// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-17

"use strict";

// marked for removal
window.URL = (window.URL || window.webkitURL || window.msURL || window.oURL);
navigator.getUserMedia   = (navigator.getUserMedia  || navigator.webkitGetUserMedia ||
							navigator.mozGetUserMedia || navigator.msGetUserMedia);
document.exitPointerLock = document.exitPointerLock ||
							document.mozExitPointerLock  ||
							document.webkitExitPointerLock;
// end marked for removal

var wsio;
var appId, pointerName, pointerColor, uniqueID;



/*
For the most part, this file should not need to be edited once it is finalized.
What happens in this file:
	First a listener is added to detect when the page has finished loading
		AppControl_init() called at that time

	 AppControl_init()
	 	First checks for URL parameters
			appId
			pointerName
			pointerColor
			missing any of these will prevent page from loading
				they are automatically added as part of UI page open
				error is thrown preventing rest of AppControl_init() from completing
					bad practice?
		Then create a websocket connection
			connection is automatic to base hostname
				defined in sage/public/src/webwebsocket.io.js
				if wondering ..		/..		/..		/src/websocket.io.js
							apps	uploads	public  /src/websocket.io.js
				note: probably will init on wss, but is possible to use ws instead
		Define open actions
			setupListeners
				remoteConnection
					probably will be removed, currently used for status reporting
				initialize
					how this page can become aware of the ID assigned by server
				utdConsoleMessage
					probably will be removed, currently used for debug messages
				dtuRmbContextMenuContents
					might be useful to know what context menu functions are available
					unsure, but this is the core available functionality.
				csdSendDataToClient
					IMPORTANT!! this is what allows app to trigger responses on this page
					global function becomes activatable from the app
			Cookie retrieval for session
				TODO double check this actually gets retrieved properly.
			Setup description of what this is to the server
				TODO: possible to add another class of client?
			Finally emit to server.
*/

/**
 * When the page loads, start communcation setup
 *
 */
window.addEventListener("load", function(event) {
	AppControl_init();
});

// ------------------------------------------------------------------------------------------------------------------
// From here should be just function definitions
// ------------------------------------------------------------------------------------------------------------------


// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
/**
Starting point, note the on load was defined earlier which activates this.
*/
function AppControl_init() {
	getUrlParameters(); // necessary to figure out which app to control.

	// Create a connection to the SAGE2 server
	wsio = new WebsocketIO(); // uses ../../../src/websocket.io.js
	wsio.open(function() {
		console.log("Websocket opened");
		setupListeners();
		var session = getCookie("session"); // if meetingID, this need to be solved later somehow
		var clientDescription = {
			clientType: "sageUI",
			requests: {
				config:  true,
				version: true,
				time:    false,
				console: false
			},
			browser: SAGE2_browser(),
			session: session
		};
		wsio.emit("addClient", clientDescription);
	});
	// socket close event (i.e. server crashed)
	wsio.on("close", function(evt) {
		console.log("Server offline");
	});
}


// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
function setupListeners() {
	wsio.on("remoteConnection", function(data) {
		console.log("Response from server:" + data.status);
	});
	wsio.on("initialize", function(data) {
		console.log("uniqueID from server:" + data.UID);
		uniqueID = data.UID;
	});
	wsio.on("utdConsoleMessage", function(data) {
		console.log("UTD message:" + data.message);
	});
	wsio.on("dtuRmbContextMenuContents", function(data) {
		// setRmbContextMenuEntries(data);
	});
	wsio.on("csdSendDataToClient", function(data) {
		// depending on the specified func does different things.
		window[data.func](data);
	});
}
// ------------------------------------------------------------------------------------------------------------------
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
				encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1"))
		|| null;
}
// ------------------------------------------------------------------------------------------------------------------
/**
 * Detect the current browser
 *
 * @method SAGE2_browser
 */
function SAGE2_browser() {
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
}
// ------------------------------------------------------------------------------------------------------------------
function getUrlParameters() {
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
			appId = onePair[1];
		} else if (onePair[0] == "pointerName") {
			pointerName = onePair[1];
		} else if (onePair[0] == "pointerColor") {
			pointerColor = onePair[1];
		}
	}
	// Pointer name / color might actually be in localStorage
	if (localStorage.SAGE2_ptrName) {
		pointerName = localStorage.SAGE2_ptrName;
	}
	if (localStorage.SAGE2_ptrColor) {
		pointerColor = localStorage.SAGE2_ptrColor;
	}
	console.log(appId + " control for " + pointerName + "(" + pointerColor + ") starting");
	if (!appId || !pointerName || !pointerColor) {
		throw "Error url didn't contain necessary values";
		// TODO add more description and probably close the window
	}
}




