// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

"use strict";

/**
 * User interaction for SAGE2
 *
 * @module client
 * @submodule SAGE2_interaction
 */

/**
 * Deals with pointer, file upload, desktop sharing, ...
 *
 * @class SAGE2_interaction
 * @constructor
 */
function SAGE2_interaction(wsio) {
	this.wsio        = wsio;
	this.uniqueID    = null;
	this.sensitivity = null;
	this.fileUploadProgress = null;
	this.fileUploadComplete = null;
	this.mediaStream = null;
	this.mediaVideo  = null;
	this.mediaResolution = 3;
	this.mediaQuality    = 5;
	this.chromeDesktopCaptureEnabled = false;
	this.broadcasting  = false;
	this.worker        = null;
	this.pix           = null;
	this.chunk         = 64 * 1024; // 32 KB
	this.maxUploadSize = 20 * (1024 * 1024 * 1024); // 20GB just as a precaution

	// Event filtering for mouseMove
	this.now = Date.now();
	this.cnt = 0;
	// accumultor for delta motion of the mouse
	this.deltaX = 0;
	this.deltaY = 0;
	// Send frequency (frames per second)
	this.sendFrequency = 25;
	// Timeout for when scrolling ends
	this.scrollTimeId = null;

	if (localStorage.SAGE2_ptrName  === undefined ||
		localStorage.SAGE2_ptrName  === null ||
		localStorage.SAGE2_ptrName  === "Default") {
		localStorage.SAGE2_ptrName  = "SAGE2_user";
	}
	if (localStorage.SAGE2_ptrColor === undefined ||
		localStorage.SAGE2_ptrColor === null) {
		localStorage.SAGE2_ptrColor = "#B4B4B4";
	}

	document.getElementById('sage2PointerLabel').value = localStorage.SAGE2_ptrName;
	document.getElementById('sage2PointerColor').value = localStorage.SAGE2_ptrColor;

	this.wsio.emit('registerInteractionClient', {name: document.getElementById('sage2PointerLabel').value,
			color: document.getElementById('sage2PointerColor').value});

	/**
	* Set a unique ID
	*
	* @method setInteractionId
	* @param id {String} client id
	*/
	this.setInteractionId = function(id) {
		this.uniqueID = id;
	};

	/**
	* Set the pointer scaling factor
	*
	* @method setPointerSensitivity
	* @param value {Number} scaling factor for pointer motion
	*/
	this.setPointerSensitivity = function(value) {
		this.sensitivity = value;
	};

	/**
	* Set the progress callback
	*
	* @method setFileUploadProgressCallback
	* @param callback {Function} upload progress callback
	*/
	this.setFileUploadProgressCallback = function(callback) {
		this.fileUploadProgress = callback;
	};

	/**
	* Set the complete callback
	*
	* @method setFileUploadCompleteCallback
	* @param callback {Function} upload complete callback
	*/
	this.setFileUploadCompleteCallback = function(callback) {
		this.fileUploadComplete = callback;
	};

	/**
	* Form processing function
	*
	* @method uploadFiles
	* @param files {Object} array of files dropped
	* @param dropX {Number} drop location X
	* @param dropY {Number} drop location Y
	*/
	this.uploadFiles = function(files, dropX, dropY) {
		var _this = this;
		var loaded = {};
		var filesFinished = 0;
		var total = 0;

		var progressCallback = function(event) {
			if (loaded[event.target.id] === undefined) {
				total += event.total;
			}
			loaded[event.target.id] = event.loaded;
			var uploaded = 0;
			for (var key in loaded) {
				uploaded += loaded[key];
			}
			var pc = uploaded / total;
			if (_this.fileUploadProgress) {
				_this.fileUploadProgress(pc);
			}
		};

		var loadCallback = function(event) {
			var sn = event.target.response.substring(event.target.response.indexOf("name: ") + 7);
			var st = event.target.response.substring(event.target.response.indexOf("type: ") + 7);
			var name = sn.substring(0, sn.indexOf("\n") - 2);
			var type = st.substring(0, st.indexOf("\n") - 2);

			filesFinished++;
			if (_this.fileUploadComplete && filesFinished === files.length) {
				_this.fileUploadComplete();
			}

			_this.wsio.emit('uploadedFile', {name: name, type: type});
		};

		for (var i = 0; i < files.length; i++) {
			if (files[i].size <= this.maxUploadSize) {
				var formdata = new FormData();
				formdata.append("file" + i.toString(), files[i]);
				formdata.append("dropX", dropX);
				formdata.append("dropY", dropY);
				var xhr = new XMLHttpRequest();
				xhr.open("POST", "upload", true);
				xhr.upload.id = "file" + i.toString();
				xhr.upload.addEventListener('progress', progressCallback, false);
				xhr.addEventListener('load', loadCallback, false);
				xhr.send(formdata);
			} else {
				alert("File: " + files[i].name + " is too large (max size is " + (this.maxUploadSize / (1024 * 1024 * 1024)) + " GB)");
			}
		}
	};

	/**
	* Process a URL drag and drop
	*
	* @method uploadURL
	* @param url {String} URL dropped on the UI
	* @param dropX {Number} drop location X
	* @param dropY {Number} drop location Y
	*/
	this.uploadURL = function(url, dropX, dropY) {
		var mimeType = "";
		var youtube  = url.indexOf("www.youtube.com");
		var ext      = url.substring(url.lastIndexOf('.') + 1);
		if (ext.length > 4) {
			ext = ext.substring(0, 4);
		}
		if (ext.length === 4 && (ext[3] === '?' || ext[3] === '#')) {
			ext = ext.substring(0, 3);
		}
		ext = ext.toLowerCase();
		if (youtube >= 0) {
			mimeType = "video/youtube";
		} else if (ext === "jpg") {
			mimeType = "image/jpeg";
		} else if (ext === "jpeg") {
			mimeType = "image/jpeg";
		} else if (ext === "png") {
			mimeType = "image/png";
		} else if (ext === "bmp") {
			mimeType = "image/bmp";
		} else if (ext === "mp4") {
			mimeType = "video/mp4";
		} else if (ext === "m4v") {
			mimeType = "video/mp4";
		} else if (ext === "webm") {
			mimeType = "video/webm";
		} else if (ext === "pdf") {
			mimeType = "application/pdf";
		}
		console.log("URL: " + url + ", type: " + mimeType);

		if (mimeType !== "") {
			this.wsio.emit('addNewWebElement', {type: mimeType, url: url, position: [dropX, dropY]});
		}
	};

	/**
	* Request a pointer lock or assume that's a touch device
	*
	* @method startSAGE2Pointer
	* @param buttonId {String} name of the button triggering the pointer
	*/
	this.startSAGE2Pointer = function(buttonId) {
		if (hasMouse) {
			var button = document.getElementById(buttonId);
			button.addEventListener('pointerlockchange', function(e) {
				console.log(e);
			});
			button.requestPointerLock = button.requestPointerLock       ||
										button.mozRequestPointerLock    ||
										button.webkitRequestPointerLock;

			// Ask the browser to lock the pointer
			if (button.requestPointerLock) {
				button.requestPointerLock();
			} else {
				console.log("No PointerLock support");
			}
		} else {
			console.log("No mouse detected - entering touch interface for SAGE2 Pointer");

			this.wsio.emit('startSagePointer', {label: localStorage.SAGE2_ptrName, color: localStorage.SAGE2_ptrColor});

			showSAGE2PointerOverlayNoMouse();
		}
	};

	/**
	* Release the pointer
	*
	* @method stopSAGE2Pointer
	*/
	this.stopSAGE2Pointer = function() {
		if (hasMouse) {
			if (document.exitPointerLock) {
				document.exitPointerLock();
			} else {
				console.log("No PointerLock support");
			}
		} else {
			this.wsio.emit('stopSagePointer');
			hideSAGE2PointerOverlayNoMouse();
		}
	};

	/**
	* Called if pointer lock failed
	*
	* @method pointerLockErrorMethod
	* @param event {Event} error event
	*/
	this.pointerLockErrorMethod = function(event) {
		console.log("Error locking pointer: ", event);
	};

	/**
	* Called when a pointer lock change is triggered, release or aquire
	*
	* @method pointerLockChangeMethod
	* @param event {Event} event
	*/
	this.pointerLockChangeMethod = function(event) {
		var pointerLockElement = document.pointerLockElement   ||
								document.mozPointerLockElement ||
								document.webkitPointerLockElement;

		// disable SAGE2 Pointer
		if (pointerLockElement === undefined || pointerLockElement === null) {
			this.wsio.emit('stopSagePointer');

			document.removeEventListener('mousedown',  this.pointerPress,     false);
			document.removeEventListener('mousemove',  this.pointerMove,      false);
			document.removeEventListener('mouseup',    this.pointerRelease,   false);
			document.removeEventListener('dblclick',   this.pointerDblClick,  false);
			document.removeEventListener('wheel',      this.pointerScroll,    false);
			document.removeEventListener('keydown',    this.pointerKeyDown,   false);
			document.removeEventListener('keyup',      this.pointerKeyUp,     false);
			document.removeEventListener('keypress',   this.pointerKeyPress,  false);

			document.addEventListener('click', pointerClick, false);

			sagePointerDisabled();
		} else {
			// enable SAGE2 Pointer
			this.wsio.emit('startSagePointer', {label: localStorage.SAGE2_ptrName, color: localStorage.SAGE2_ptrColor});

			document.addEventListener('mousedown',  this.pointerPress,     false);
			document.addEventListener('mousemove',  this.pointerMove,      false);
			document.addEventListener('mouseup',    this.pointerRelease,   false);
			document.addEventListener('dblclick',   this.pointerDblClick,  false);
			document.addEventListener('wheel',      this.pointerScroll,    false);
			document.addEventListener('keydown',    this.pointerKeyDown,   false);
			document.addEventListener('keyup',      this.pointerKeyUp,     false);
			document.addEventListener('keypress',   this.pointerKeyPress,  false);

			document.removeEventListener('click', pointerClick, false);

			sagePointerEnabled();
		}
	};

	/**
	* Start screen sharing, for Chrome or Firefox
	*
	* @method startScreenShare
	*/
	this.startScreenShare = function() {
		if (__SAGE2__.browser.isChrome === true && this.chromeDesktopCaptureEnabled === true) {
			// post message to start chrome screen share
			window.postMessage('capture_desktop', '*');
		} else if (__SAGE2__.browser.isChrome === true && this.chromeDesktopCaptureEnabled !== true) {
			if (window.confirm("Let's install the SAGE2 screen sharing extension for Chrome (or visit the help page).\n" +
					"Once done, please reload the SAGE UI page")) {
				window.open("https://chrome.google.com/webstore/detail/sage2-screen-capture/mbkfcmpjbkmmdcfocaclghbobhnjfpkk",
					"Good luck!");
			} else {
				window.open("help/index.html", "Good luck!");
			}
		} else if (__SAGE2__.browser.isFirefox === true) {
			// attempt to start firefox screen share
			//   can replace 'screen' with 'window' (but need user choice ahead of time)
			showDialog('ffShareScreenDialog');
		} else {
			alert("Cannot find screen capture support in this browser. Sorry.");
		}
	};

	/**
	* Initialize the screen share request, for Chrome or Firefox
	*
	* @method captureDesktop
	* @param data {Object} data
	*/
	this.captureDesktop = function(data) {
		if (__SAGE2__.browser.isChrome === true) {
			console.log('captureDesktop');
			var constraints = {chromeMediaSource: 'desktop',
								chromeMediaSourceId: data,
								maxWidth: 3840, maxHeight: 2160,
								minFrameRate:3, maxFrameRate: 30};
			navigator.getUserMedia({video: {mandatory: constraints, optional: []}, audio: false}, this.streamSuccess, this.streamFail);
		} else if (__SAGE2__.browser.isFirefox === true) {
			navigator.getUserMedia({video: {mediaSource: data}, audio: false},
				this.streamSuccess, this.streamFail);
		}
	};

	/**
	* Screen sharing is a go
	*
	* @method streamSuccessMethod
	* @param stream {Object} media stream
	*/
	this.streamSuccessMethod = function(stream) {
		console.log("media capture success!", stream);

		// TODO: must disable screen share button

		this.mediaStream = stream;
		this.mediaStream.onended = this.streamEnded;

		var mediaVideo = document.getElementById('mediaVideo');
		mediaVideo.src = window.URL.createObjectURL(this.mediaStream);
		mediaVideo.play();
	};

	/**
	* Screen sharing failed
	*
	* @method streamFailMethod
	* @param event {Object} error event
	*/
	this.streamFailMethod = function(event) {
		console.log("no access to media capture");

		if (__SAGE2__.browser.isChrome === true) {
			alert('Screen capture failed. Make sure to install and enable the Chrome SAGE2 extension.' +
				'See Window/Extension menu');
		} else if (__SAGE2__.browser.isFirefox === true) {
			alert('Screen capture failed.\nTo enable screen capture in Firefox:\n1- Open "about:config"\n' +
				'2- Set "media.getusermedia.screensharing.enabled" to true\n' +
				'3- Add your domain (or localhost) in "media.getusermedia.screensharing.allowed_domains" ');
		} else {
			alert("Cannot find screen capture support in this browser. Sorry.");
		}
	};

	/**
	* Screen sharing has ended
	*
	* @method streamEndedMethod
	* @param event {Object} event
	*/
	this.streamEndedMethod = function(event) {
		this.broadcasting = false;
		// Quit worker
		this.worker.postMessage("quit");
		// TODO: must re-enable screen share button
		this.wsio.emit('stopMediaStream', {id: this.uniqueID + "|0"});
	};

	/**
	* The screen sharing can start
	*
	* @method streamCanPlayMethod
	* @param event {Object} event
	*/
	this.streamCanPlayMethod = function(event) {
		var screenShareResolution = document.getElementById('screenShareResolution');
		var mediaVideo  = document.getElementById('mediaVideo');
		var mediaCanvas = document.getElementById('mediaCanvas');

		if (mediaVideo.videoWidth === 0 || mediaVideo.videoHeight === 0) {
			setTimeout(this.streamCanPlay, 500, event);
			return;
		}
		console.log('mediaVideo width height', mediaVideo.videoWidth, mediaVideo.videoHeight);

		var widths = [	Math.min(852, mediaVideo.videoWidth),
						Math.min(1280, mediaVideo.videoWidth),
						Math.min(1920, mediaVideo.videoWidth),
						mediaVideo.videoWidth];

		for (var i = 0; i < 4; i++) {
			var height = parseInt(widths[i] * mediaVideo.videoHeight / mediaVideo.videoWidth, 10);
			screenShareResolution.options[i].value = widths[i] + "x" + height;
		}

		var res = screenShareResolution.options[this.mediaResolution].value.split("x");
		mediaCanvas.width  = parseInt(res[0], 10);
		mediaCanvas.height = parseInt(res[1], 10);
		console.log('mediaCanvas width height', mediaCanvas.width, mediaCanvas.height);

		var frame = this.captureMediaFrame();
		this.pix  = frame;
		var raw   = atob(frame.split(",")[1]); // base64 to string
		this.wsio.emit('startNewMediaStream', {id: this.uniqueID + "|0",
			title: localStorage.SAGE2_ptrName + ": Shared Screen",
			color: localStorage.SAGE2_ptrColor,
			src: raw, type: "image/jpeg", encoding: "binary",
			width: mediaVideo.videoWidth, height: mediaVideo.videoHeight});

		this.broadcasting = true;
		var _this = this;

		// create a web worker to do the job
		this.worker = new Worker('src/SAGE2_Worker.js');
		this.worker.onmessage = function(evt) {
			var mediaCtx = mediaCanvas.getContext('2d');
			mediaCtx.drawImage(mediaVideo, 0, 0, mediaCanvas.width, mediaCanvas.height);
			_this.pix = mediaCanvas.toDataURL("image/jpeg", (_this.mediaQuality / 10));
		};
		this.worker.onerror = function(evt) {
			console.log('Got an error from worker', evt);
		};
		this.worker.postMessage("hello");

		// this.videoTimer = setInterval(function() {
		// 	var mediaCtx = mediaCanvas.getContext('2d');
		// 	// mediaCtx.clearRect(0, 0, mediaCanvas.width, mediaCanvas.height);
		// 	mediaCtx.drawImage(mediaVideo, 0, 0, mediaCanvas.width, mediaCanvas.height);
		// 	_this.pix = mediaCanvas.toDataURL("image/jpeg", (_this.mediaQuality / 10));
		// }, 100);
	};

	/**
	* Received a new frame, capture it and return a JPEG buffer
	*
	* @method captureMediaFrame
	*/
	this.captureMediaFrame = function() {
		var mediaVideo  = document.getElementById('mediaVideo');
		var mediaCanvas = document.getElementById('mediaCanvas');
		var mediaCtx    = mediaCanvas.getContext('2d');

		mediaCtx.clearRect(0, 0, mediaCanvas.width, mediaCanvas.height);
		mediaCtx.drawImage(mediaVideo, 0, 0, mediaCanvas.width, mediaCanvas.height);
		return mediaCanvas.toDataURL("image/jpeg", (this.mediaQuality / 10));
	};

	/**
	* Send the captured frame to the server
	*
	* @method sendMediaStreamFrame
	*/
	this.sendMediaStreamFrame = function() {
		if (this.broadcasting) {
			// var frame = this.captureMediaFrame();
			var frame = this.pix;
			var raw   = atob(frame.split(",")[1]);  // base64 to string

			if (raw.length > this.chunk) {
				var _this   = this;
				var nchunks = Math.ceil(raw.length / this.chunk);

				var updateMediaStreamChunk = function(index, msg_chunk) {
					setTimeout(function() {
						_this.wsio.emit('updateMediaStreamChunk', {id: _this.uniqueID + "|0",
							state: {src: msg_chunk, type: "image/jpeg", encoding: "binary"},
							piece: index, total: nchunks});
					}, 4);
				};

				for (var i = 0; i < nchunks; i++) {
					var start = i * this.chunk;
					var end   = (i + 1) * this.chunk < raw.length ? (i + 1) * this.chunk : raw.length;
					updateMediaStreamChunk(i, raw.substring(start, end));
				}
			} else {
				this.wsio.emit('updateMediaStreamFrame', {id: this.uniqueID + "|0", state:
					{src: raw, type: "image/jpeg", encoding: "binary"}});
			}
		}
	};

	/**
	* Handler for mouse press
	*
	* @method pointerPressMethod
	* @param event {Event} press event
	*/
	this.pointerPressMethod = function(event) {
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		this.wsio.emit('pointerPress', {button: btn});
		if (event.preventDefault) {
			event.preventDefault();
		}
	};

	/**
	* Handler for mouse move
	*
	* @method pointerMoveMethod
	* @param event {Event} move event
	*/
	this.pointerMoveMethod = function(event) {
		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		// Event filtering
		var now  = Date.now();
		// time difference since last event
		var diff = now - this.now;
		// count the events
		this.cnt++;
		if (diff >= (1000 / this.sendFrequency)) {
			// Calculate the offset
			var px  = this.deltaX * this.sensitivity;
			var py  = this.deltaY * this.sensitivity;
			// Send the event
			this.wsio.emit('pointerMove', {dx: Math.round(px), dy: Math.round(py)});
			// Reset the accumulators
			this.deltaX = 0;
			this.deltaY = 0;
			// Reset the time and count
			this.now = now;
			this.cnt = 0;
		} else {
			// if it's not time, just accumulate
			this.deltaX += movementX;
			this.deltaY += movementY;
		}
		if (event.preventDefault) {
			event.preventDefault();
		}
	};

	/**
	* Handler for mouse release
	*
	* @method pointerReleaseMethod
	* @param event {Event} release event
	*/
	this.pointerReleaseMethod = function(event) {
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		this.wsio.emit('pointerRelease', {button: btn});
		if (event.preventDefault) {
			event.preventDefault();
		}
	};

	/**
	* Handler for double click
	*
	* @method pointerDblClickMethod
	* @param event {Event} double click event
	*/
	this.pointerDblClickMethod = function(event) {
		this.wsio.emit('pointerDblClick');
		if (event.preventDefault) {
			event.preventDefault();
		}
	};

	/**
	* Handler for mouse scroll
	*
	* @method pointerScrollMethod
	* @param event {Object} scroll event
	*/
	this.pointerScrollMethod = function(event) {
		if (this.scrollTimeId === null) {
			this.wsio.emit('pointerScrollStart');
		} else {
			clearTimeout(this.scrollTimeId);
		}
		this.wsio.emit('pointerScroll', {wheelDelta: event.deltaY});

		var _this = this;
		this.scrollTimeId = setTimeout(function() {
			_this.wsio.emit('pointerScrollEnd');
			_this.scrollTimeId = null;
		}, 500);
		if (event.preventDefault) {
			event.preventDefault();
		}
	};

	/**
	* Handler for key down
	*
	* @method pointerKeyDownMethod
	* @param event {Object} key event
	*/
	this.pointerKeyDownMethod = function(event) {
		var code = parseInt(event.keyCode, 10);
		// exit if 'esc' key
		if (code === 27) {
			this.stopSAGE2Pointer();
			if (event.preventDefault) {
				event.preventDefault();
			}
		} else {
			this.wsio.emit('keyDown', {code: code});
			if (code === 9) { // tab is a special case - must emulate keyPress event
				this.wsio.emit('keyPress', {code: code, character: String.fromCharCode(code)});
			}
			// if a special key - prevent default (otherwise let continue to keyPress)
			if (code === 8 || code === 9 || (code >= 16 && code <= 46 && code !== 32) ||
				(code >= 91 && code <= 93) || (code >= 112 && code <= 145)) {
				if (event.preventDefault) {
					event.preventDefault();
				}
			}
		}
	};

	/**
	* Handler for key up
	*
	* @method pointerKeyUpMethod
	* @param event {Object} key event
	*/
	this.pointerKeyUpMethod = function(event) {
		var code = parseInt(event.keyCode, 10);
		if (code !== 27) {
			this.wsio.emit('keyUp', {code: code});
		}
		if (event.preventDefault) {
			event.preventDefault();
		}
	};

	/**
	* Handler for key press
	*
	* @method pointerKeyPressMethod
	* @param event {Object} key event
	*/
	this.pointerKeyPressMethod = function(event) {
		var code = parseInt(event.charCode, 10);
		this.wsio.emit('keyPress', {code: code, character: String.fromCharCode(code)});
		if (event.preventDefault) {
			event.preventDefault();
		}
	};

	/**
	* Handler for pointer lable text
	*
	* @method changeSage2PointerLabelMethod
	* @param event {Object} key event
	*/
	this.changeSage2PointerLabelMethod = function(event) {
		localStorage.SAGE2_ptrName = event.target.value;
	};

	/**
	* Handler for the pointer color selection
	*
	* @method changeSage2PointerColorMethod
	* @param event {Object} key event
	*/
	this.changeSage2PointerColorMethod = function(event) {
		localStorage.SAGE2_ptrColor = event.target.value;
	};

	/**
	* Handler for screen resolution selection
	*
	* @method changeScreenShareResolutionMethod
	* @param event {Object} key event
	*/
	this.changeScreenShareResolutionMethod = function(event) {
		if (event.target.options[event.target.selectedIndex].value) {
			this.mediaResolution = event.target.selectedIndex;
			var res = event.target.options[this.mediaResolution].value.split("x");
			var mediaCanvas = document.getElementById('mediaCanvas');
			mediaCanvas.width  = parseInt(res[0], 10);
			mediaCanvas.height = parseInt(res[1], 10);
			console.log("media resolution: " + event.target.options[this.mediaResolution].value);
		}
	};

	/**
	* Handler for screen quality selection
	*
	* @method changeScreenShareQualityMethod
	* @param event {Object} key event
	*/
	this.changeScreenShareQualityMethod = function(event) {
		this.mediaQuality = event.target.value;
		document.getElementById('screenShareQualityIndicator').textContent = this.mediaQuality;
	};

	this.streamSuccess               = this.streamSuccessMethod.bind(this);
	this.streamFail                  = this.streamFailMethod.bind(this);
	this.streamEnded                 = this.streamEndedMethod.bind(this);
	this.streamCanPlay               = this.streamCanPlayMethod.bind(this);

	this.pointerLockError            = this.pointerLockErrorMethod.bind(this);
	this.pointerLockChange           = this.pointerLockChangeMethod.bind(this);
	this.pointerPress                = this.pointerPressMethod.bind(this);
	this.pointerMove                 = this.pointerMoveMethod.bind(this);
	this.pointerRelease              = this.pointerReleaseMethod.bind(this);
	this.pointerDblClick             = this.pointerDblClickMethod.bind(this);
	this.pointerScroll               = this.pointerScrollMethod.bind(this);
	this.pointerKeyDown              = this.pointerKeyDownMethod.bind(this);
	this.pointerKeyUp                = this.pointerKeyUpMethod.bind(this);
	this.pointerKeyPress             = this.pointerKeyPressMethod.bind(this);

	this.changeSage2PointerLabel     = this.changeSage2PointerLabelMethod.bind(this);
	this.changeSage2PointerColor     = this.changeSage2PointerColorMethod.bind(this);
	this.changeScreenShareResolution = this.changeScreenShareResolutionMethod.bind(this);
	this.changeScreenShareQuality    = this.changeScreenShareQualityMethod.bind(this);

	document.addEventListener('pointerlockerror',        this.pointerLockError,  false);
	document.addEventListener('mozpointerlockerror',     this.pointerLockError,  false);
	document.addEventListener('pointerlockchange',       this.pointerLockChange, false);
	document.addEventListener('mozpointerlockchange',    this.pointerLockChange, false);

	document.getElementById('sage2PointerLabel').addEventListener('input',      this.changeSage2PointerLabel,     false);
	document.getElementById('sage2PointerColor').addEventListener('input',      this.changeSage2PointerColor,     false);
	document.getElementById('screenShareResolution').addEventListener('change', this.changeScreenShareResolution, false);
	document.getElementById('screenShareQuality').addEventListener('input',     this.changeScreenShareQuality,    false);
	document.getElementById('mediaVideo').addEventListener('canplay',           this.streamCanPlay,               false);
}
