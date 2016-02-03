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
var numberOfConnection = 0;

chrome.runtime.onInstalled.addListener(function() {
	numberOfConnection = 0;
	ports = {};
});

chrome.runtime.onSuspend.addListener(function() {
});

chrome.runtime.onConnectExternal.addListener(function(port) {
});

chrome.runtime.onMessage.addListener(function(message, sender) {
	// getList message from popup
	if (message.cmd && message.cmd === 'getList') {
		chrome.runtime.sendMessage(sender.id, ports);
	} else {
		console.log('onMessage', message.sender);
		if (message.sender) {
			ports[message.sender].postMessage(message);
		}
	}
});

chrome.runtime.onConnect.addListener(function(port) {
	numberOfConnection++;
	chrome.browserAction.setBadgeText({text:numberOfConnection.toString()});

	port.onMessage.addListener(portOnMessageHanlder);

	port.onDisconnect.addListener(function() {
		numberOfConnection--;
		if (numberOfConnection === 0) {
			chrome.browserAction.setBadgeText({text:""});
		} else {
			chrome.browserAction.setBadgeText({text:numberOfConnection.toString()});
		}
		port.onMessage.removeListener(portOnMessageHanlder);
		delete  ports[port.sender.url];
	});

	// Save the port in the list, indexed by URL
	ports[port.sender.url] = port;

	// this one is called for each message from "content-script.js"
	function portOnMessageHanlder(message) {
		if (message === "capture_desktop") {
			chrome.desktopCapture.chooseDesktopMedia(['screen', 'window'],
				port.sender.tab, onAccessApproved);
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
