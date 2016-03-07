// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

/* global videoTimer */

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
