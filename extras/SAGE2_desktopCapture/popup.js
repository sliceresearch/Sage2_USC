
// The popup page is loaded
document.addEventListener('DOMContentLoaded', function () {
	// request a list of SAGE2 sites currently opened
	chrome.runtime.sendMessage({cmd: "getList"});
});

// Get a reply to 'getList'
chrome.runtime.onMessage.addListener(function(response) {
	// Remove all existing servers
	var divs = document.querySelectorAll('div');
	for (var i = 0; i < divs.length; i++) {
		divs[i].parentNode.removeChild(divs[i]);
	}
	// Add new servers
	for (var v in response) {
		if (response[v]) {
			var div = document.createElement('div');
			div.innerText = response[v];
			// Set a click callback
			div.addEventListener('click', click);
			// Add to the popup page
			document.body.appendChild(div);
		}
	}
});

function click(e) {
	chrome.tabs.query({active: true, currentWindow:true}, function(tabs) {
		var tab = tabs[0];
		chrome.tabs.captureVisibleTab(function(screenshotUrl) {
			console.log('Target',  e.target.innerText);
			chrome.runtime.sendMessage({id: tabs[0].id,
				sender: e.target.innerText,
				cmd: "screenshot",
				src:    screenshotUrl,
				title:  tab.title,
				url:    tab.url,
				width:  tab.width,
				height: tab.height
			});
			window.close();
		});
	});
}