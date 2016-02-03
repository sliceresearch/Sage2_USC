
videoTimer = null;

postMessage("I'm alive");

videoTimer = setInterval(function() {
	postMessage('work');
}, 1000 / 10);


self.addEventListener('message', function(e) {
	// console.log('worker> got message', e);
	if (e.data && e.data === "quit") {
		// Clear timer
		if (videoTimer) {
			clearInterval(videoTimer);
		}
		// Got the quit signal
		self.close();
		return;
	}
	if (e.data) {
		// postMessage('ok');
		return;
	}
}, false);
