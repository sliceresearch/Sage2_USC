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

var mainPort = null;

chrome.runtime.onConnect.addListener(function(port) {

	port.onMessage.addListener(portOnMessageHanlder);

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

	if (mainPort === null) {
		// Making sure that only the first tab connecting sends screenshot
		mainPort = port.sender.tab.id;
		// Listen for a click on the camera icon. On that click, take a screenshot.
		chrome.browserAction.onClicked.addListener(function(tab) {
			chrome.tabs.captureVisibleTab(function(screenshotUrl) {
				port.postMessage({cmd: "screenshot",
					src:    screenshotUrl,
					title:  tab.title,
					url:    tab.url,
					width:  tab.width,
					height: tab.height
				});
			});
		});
	}
});
