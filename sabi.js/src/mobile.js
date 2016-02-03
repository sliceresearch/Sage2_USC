// Copyright 2012 Luc Renambot, University of Illinois at Chicago.
//    All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of Google Inc. nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Contact: Luc Renambot - renambot@gmail.com


var audioCtx = null;
var soundBuffer = null;


function playSound() {
    if (soundBuffer) {
		//console.log("beep");
		var source = audioCtx.createBufferSource(); // creates a sound source
		source.buffer = soundBuffer;            // tell the source which sound to play
		source.connect(audioCtx.destination);   // connect the source to the speakers
		source.start(0);                       // play the source now
    }
}



(function($){

		// Connection: websocket through the http server (no port needed)
	var url = window.location.origin;
	socket = io( url );
	console.log("Connected to server: " + url);
	window.socket = socket;

	////////////////////////////////////////////////////////////////////////

	var userAgent = window.navigator.userAgent.toLowerCase();
	var oldIOS    = userAgent.indexOf("5_1_1") >= 0;

	// Explicitely close web socket when web browser is closed
	window.onbeforeunload = function() {
		if (socket !== undefined) {
			socket.close();
		}
	};

	if (! oldIOS) {
		if (window.hasOwnProperty('webkitAudioContext') &&
				!window.hasOwnProperty('AudioContext')) {
			window.AudioContext = webkitAudioContext;
		}

		if (AudioContext) {
			console.log("Audio Context: we've got winner");
			//audioCtx = new webkitAudioContext();
			audioCtx = new AudioContext();

			var request = new XMLHttpRequest();
			request.open('GET', 'images/computerbeep_5.mp3', true);
			request.responseType = 'arraybuffer';
			request.addEventListener('load', function() {
			audioCtx.decodeAudioData(request.response, function onSuccess(decodedBuffer) {
				// Decoding was successful
				soundBuffer = decodedBuffer;
				}, function onFailure() {
					//alert("Decoding the audio buffer failed");
				});
			}, false);
			request.send();
		} else {
			console.log("No Audio Context");
		}
	}

	////////////////////////////////////////////////////////////////////////

	// Wait for the message start from the server
	// receive the name of the configuration file as parameter
    socket.once('start', function (data) {
    	console.log("start: ", data);
    	// Create the model
		var aModel = new App.AppModel();
		console.log("App> model built");
		// Create the view
		var aView  = new Views.AppView( {model: aModel, el:$('body')} );
		// Pass the configuration file name to the view
		aView.load(data);
		// All done
		console.log("App ready");

		socket.on('file', function(file) {
			var content = btoa(file.data);
			window.open("ace.html?name=" + file.name + "&action=" + file.action +
				"&file=" + content, "_parent");
		});

        // Socket close event (ie server crashed)
        socket.on('disconnect', function(evt) {
						console.log('closed')
			var refresh = setInterval(function() {
				// make a dummy request to test the server every 2 sec
				var xhr = new XMLHttpRequest();
				xhr.open("GET", "/", true);
				xhr.onreadystatechange = function() {
					if (xhr.readyState === 4 && xhr.status === 200) {
						console.log("server ready");
						// when server ready, clear the interval callback
						clearInterval(refresh);
						// and reload the page
						console.log('reloading')
						window.location.reload();
					}
				};
				xhr.send();
			}, 2000);
        });

	});

	// audio feedback for clicks
	$('a').click(function(){
		playSound();
		return true;
	});

})(jQuery);


