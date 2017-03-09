// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-15

"use strict";

/**
 * Web user interface
 *
 * @module client
 * @submodule SAGE2_UI
 * @class SAGE2_UI
 */

window.URL = (window.URL || window.webkitURL || window.msURL || window.oURL);
navigator.getUserMedia   = (navigator.getUserMedia  || navigator.webkitGetUserMedia ||
							navigator.mozGetUserMedia || navigator.msGetUserMedia);
document.exitPointerLock = document.exitPointerLock ||
							document.mozExitPointerLock  ||
							document.webkitExitPointerLock;
var wsio;
var appId, pointerName, pointerColor, uniqueID;


//
// Polyfill for "startsWith"
//
if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position) {
		position = position || 0;
		return this.indexOf(searchString, position) === position;
	};
}
/* eslint-enable */
//


/**
 * When the page loads, SAGE2 starts
 *
 */
window.addEventListener("load", function(event) {
	AppControl_init();
});

// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
// From here should be just function definitions
// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------


// Get Browser-Specifc Prefix
function getBrowserPrefix() {
	// Check for the unprefixed property.
	if ("hidden" in document) {
		return null;
	}
	// All the possible prefixes.
	var browserPrefixes = ["moz", "ms", "o", "webkit"];

	for (var i = 0; i < browserPrefixes.length; i++) {
		var prefix = browserPrefixes[i] + "Hidden";
		if (prefix in document) {
			return browserPrefixes[i];
		}
	}
	// The API is not supported in browser.
	return null;
}


// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
/**
Starting point, note the on load was defined earlier which activates this.
*/
function AppControl_init() {
	getUrlParameters();

	// Create a connection to the SAGE2 server
	wsio = new WebsocketIO();
	wsio.open(function() {
		console.log("Websocket opened");

		setupListeners();
		var session = getCookie("session");

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
		// show a popup
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
		requestControlDescriptionFromApp();
	});

	wsio.on("utdConsoleMessage", function(data) {
		console.log("UTD message:" + data.message);
	});

	wsio.on("dtuRmbContextMenuContents", function(data) {
		// ignore for now
	});

	wsio.on("csdSendDataToClient", function(data) {
		// depending on the specified func does different things.
		if (data.func === "controlPanelLayout") {
			setupControlPanel(data);
		} else if (data.func === "uiDrawSetCurrentStateAndShow") {
			// uiDrawSetCurrentStateAndShow(data); // keeping as reference to how doodle was done
		} else if (data.func === "uiDrawMakeLine") {
			// uiDrawMakeLine(data);
		} else {
			console.log("Error, csd data packet for client contained invalid function:" + data.func);
		}
	});
}

// ------------------------------------------------------------------------------------------------------------------
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
// ------------------------------------------------------------------------------------------------------------------
function getUrlParameters() {
	var address = window.location.search;
	if (address.indexOf("?") == -1) {
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





// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
// Functions involved with building the page.
// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
function requestControlDescriptionFromApp() {
	var dataForApp = {};
	dataForApp.app   = appId;
	dataForApp.func  = "requestControlPanelLayout";
	dataForApp.data  = {
		pointerName: pointerName,
		pointerColor: pointerColor,
		uniqueID: uniqueID
	};
	dataForApp.type			= "sendDataToClient";
	dataForApp.clientDest	= "allDisplays";
	wsio.emit("csdMessage", dataForApp);
}

// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
function setupControlPanel(data) {
	console.log("erase me, data from app description");
	console.dir(data);

	if (data.appId != appId) {
		console.log("Error mismatch id expected " + appId + " but got " + data.appId);
		return;
	}

	var layout  = data.layout;
	var item, divToBe;

	for (var i = 0; i < layout.length; i++) {
		item = layout[i];

		divToBe            = document.createElement(item.type);
		divToBe.callback   = item.callback;
		divToBe.parameters = item.parameters;

		if (item.type == "button") {
			divToBe.textContent = "button";
			divToBe.style.background = item.entryColor;

			divToBe.clickEffect = function() {
				var dataForApp = {};
				dataForApp.app = appId;
				dataForApp.func = this.callback;
				dataForApp.parameters = this.parameters;
				dataForApp.parameters.clientName = pointerName;
				wsio.emit('utdCallFunctionOnApp', dataForApp);

				console.log("erase me, sending click effect for button");
				console.dir(dataForApp);
			};
			divToBe.addEventListener("click", divToBe.clickEffect);
		} else if (item.type == "textarea") {
			divToBe.rows = item.rows;
			divToBe.cols = item.cols;

			divToBe.keyPressEffect = function() {
				var dataForApp = {};
				dataForApp.app = appId;
				dataForApp.func = this.callback;
				dataForApp.parameters = this.parameters;
				dataForApp.parameters.clientName = pointerName;
				dataForApp.parameters.clientInput = pointerName;
				wsio.emit('utdCallFunctionOnApp', dataForApp);

				console.log("erase me, sending keyDown effect for textarea");
				console.dir(dataForApp);
			};
			divToBe.addEventListener("keydown", divToBe.keyPressEffect);
		} else {
			console.log("Unknown layout type:" + item.type);
		}

		document.getElementById("appControlPanelDiv").appendChild(divToBe);
		document.getElementById("appControlPanelDiv").appendChild(document.createElement("br"));
	}
} // end setupControlPanel





