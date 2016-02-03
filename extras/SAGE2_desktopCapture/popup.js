
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
	Object.keys(response).forEach(function (v) {
		if (response[v].sender && response[v].sender.url) {
			var div = document.createElement('div');
			console.log('Adding', response[v].sender.url)
			div.innerText = response[v].sender.url;
			// Set a click callback
			div.addEventListener('click', click);
			// Add to the popup page
			document.body.appendChild(div);
		}
	});
});

function click(e) {
	chrome.tabs.query({active: true, currentWindow:true}, function(tabs) {
		var tab = tabs[0];
		chrome.tabs.captureVisibleTab(function(screenshotUrl) {
			console.log('target is',  e.target.innerText);
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