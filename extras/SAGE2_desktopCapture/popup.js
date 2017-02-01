
// The popup page is loaded
document.addEventListener('DOMContentLoaded', function () {
	// request a list of SAGE2 sites currently opened
	chrome.runtime.sendMessage({cmd: "getList"});
});

// Get a reply to 'getList'
chrome.runtime.onMessage.addListener(function(response) {
	if (response && response.cmd && response.cmd === 'list') {
		// Remove all existing servers
		var screenList = document.getElementById('screenshot_list');
		removeAllChildren(screenList);
		var linkList = document.getElementById('link_list');
		removeAllChildren(linkList);
		// Add new servers
		for (var v in response.urls) {
			if (response.urls[v]) {
				// remove index.html from URL
				var baseURL = response.urls[v].split('index.html');
				var div = document.createElement('div');
				div.className = 'server';
				var textnode = document.createTextNode(baseURL[0]);
				div.appendChild(textnode);
				// Set a click callback
				div.addEventListener('click', click);
				// Add to the popup page
				screenList.appendChild(div);


				var div2 = document.createElement('div');
				div2.className = 'server';
				var textnode2 = document.createTextNode(baseURL[0]);
				div2.appendChild(textnode2);
				// Set a click callback
				div2.addEventListener('click', openlink);
				// Add to the popup page
				linkList.appendChild(div2);
			}
		}
	}
});

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

function openlink(e) {
	chrome.tabs.query({active: true, currentWindow:true}, function(tabs) {
		var tab = tabs[0];
		chrome.runtime.sendMessage({id: tabs[0].id,
			sender: e.target.innerText + 'index.html',
			cmd:    "openlink",
			title:  tab.title,
			url:    tab.url,
			width:  tab.width,
			height: tab.height
		});
		// window.close();
	});
}

function click(e) {
	chrome.tabs.query({active: true, currentWindow:true}, function(tabs) {
		var tab = tabs[0];
		chrome.tabs.captureVisibleTab(function(screenshotUrl) {
			chrome.runtime.sendMessage({id: tabs[0].id,
				sender: e.target.innerText + 'index.html',
				cmd:    "screenshot",
				src:    screenshotUrl,
				title:  tab.title,
				url:    tab.url,
				width:  tab.width,
				height: tab.height
			});
			// window.close();
		});
	});
}