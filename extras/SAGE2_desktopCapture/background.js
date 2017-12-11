// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-16


// This background script is used to invoke desktopCapture API
// to capture screen-MediaStream.

var ports = {};

chrome.runtime.onInstalled.addListener(function() {
	ports = {};
});

chrome.runtime.onSuspend.addListener(function() {
});

chrome.runtime.onConnectExternal.addListener(function(port) {
});

chrome.runtime.onMessage.addListener(function(message, sender) {
	// getList message from popup
	if (message.cmd && message.cmd === 'getList') {
		var urls = uniqueArray(allURL(ports));
		chrome.runtime.sendMessage(sender.id, {cmd: 'list', urls: urls});
	} else {
		if (message.sender) {
			// Find a port with a matching URL
			for (var p in ports) {
				if (ports[p].sender.url === message.sender) {
					// only send to the first found
					ports[p].postMessage(message);
					return;
				}
			}
		} else {
			// Nothing yet
		}
	}
});

// Find if existing URL inside list of ports
function findURL(arr, aurl) {
	var res = false;
	Object.keys(arr).forEach(function(k) {
		if (arr[k].sender.url === aurl) {
			res = true;
		}
	});
	return res;
}

// Build arrays of URL
function allURL(arr) {
	var res = [];
	Object.keys(arr).forEach(function(k) {
		res.push(arr[k].sender.url);
	});
	return res;
}

// Return an array of unique values
function uniqueArray(arr) {
    var a = [];
    for (var i=0, l=arr.length; i<l; i++)
        if (a.indexOf(arr[i]) === -1)
            a.push(arr[i]);
    return a;
}

chrome.runtime.onConnect.addListener(function(port) {
	port.onMessage.addListener(portOnMessageHanlder);

	port.onDisconnect.addListener(function() {
		delete ports[port.sender.tab.id];
		var urls = uniqueArray(allURL(ports));
		var numberOfConnection = urls.length;
		if (numberOfConnection === 0) {
			chrome.browserAction.setBadgeText({text:""});
		} else {
			chrome.browserAction.setBadgeText({text:numberOfConnection.toString()});
		}
		port.onMessage.removeListener(portOnMessageHanlder);
	});

	// this one is called for each message from "content-script.js"
	function portOnMessageHanlder(message) {
		if (message === "SAGE2_capture_desktop" || message === "capture_desktop") {
			chrome.desktopCapture.chooseDesktopMedia(['screen', 'window', 'tab'],
				port.sender.tab, onAccessApproved);
		} else if (message === "SAGE2_registerUI") {
			var found = findURL(ports, port.sender.url);
			// if it is a new site, store the info
			if (!found) {
				// Save the port in the list, indexed by URL
				ports[port.sender.tab.id] = port;
				var numberOfConnection = Object.keys(ports).length;
				chrome.browserAction.setBadgeText({text: numberOfConnection.toString()});
			} else {
				ports[port.sender.tab.id] = port;
			}
		}
	}

	// on getting sourceId
	// "sourceId" will be empty if permission is denied.
	function onAccessApproved(sourceId) {
		// if "cancel" button is clicked
		if (!sourceId || !sourceId.length) {
			return port.postMessage({cmd: "permission_denied"});
		}

		// "ok" button is clicked; share "sourceId" with the
		// content-script which will forward it to the webpage
		port.postMessage({cmd: "window_selected", mediaSourceId: sourceId});
	}

	// Listen for a click on the camera icon. On that click, take a screenshot.
	// chrome.browserAction.onClicked.addListener(function(tab) {
	// });

});
