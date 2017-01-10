// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/* global showSAGE2Message, showDialog */
/* global cancelIdleCallback, requestIdleCallback */
/* global showSAGE2PointerOverlayNoMouse, hideSAGE2PointerOverlayNoMouse */
/* global pointerClick, sagePointerDisabled, sagePointerEnabled */

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
	this.fileUploadStart    = null;
	this.fileUploadProgress = null;
	this.fileUploadComplete = null;
	this.mediaStream = null;
	this.mediaVideo  = null;
	this.mediaResolution = 2;
	this.mediaQuality    = 9;
	this.chromeDesktopCaptureEnabled = false;
	this.broadcasting  = false;
	this.gotRequest    = false;
	this.pix           = null;
	this.chunk         = 32 * 1024; // 32 KB
	this.maxUploadSize = 20 * (1024 * 1024 * 1024); // 20GB just as a precaution
	this.array_xhr     = [];


        this.origWidth = 0;
        this.origHeight = 0;
        this.lastChecksum = 0; // image checksum
        this.dropTot = 0;
        this.sentTot = 0;
        this.dropTot2 = 0;
        this.sentTot2 = 0;
        this.frameCount = 0;

	// Event filtering for mouseMove
	this.now = Date.now();
	this.cnt = 0;
	// accumultor for delta motion of the mouse
	this.deltaX = 0;
	this.deltaY = 0;
	// Send frequency (frames per second)
	this.sendFrequency = 30;
	// Timeout for when scrolling ends
	this.scrollTimeId = null;

	// Check if a domain cookie exists for the name
	var cookieName = getCookie('SAGE2_ptrName');
	if (cookieName) {
		localStorage.SAGE2_ptrName = cookieName;
	}
	// Check if a domain cookie exists for the color
	var cookieColor = getCookie('SAGE2_ptrColor');
	if (cookieColor) {
		localStorage.SAGE2_ptrColor = cookieColor;
	}

	if (!cookieName && !localStorage.SAGE2_ptrColor) {
		showDialog('settingsDialog2');
	}

	// Post message to the Chrome extension to register the UI
	if (__SAGE2__.browser.isChrome === true) {
		window.postMessage('SAGE2_registerUI', '*');
	}

	// Deals with the name and color of the pointer
	if (localStorage.SAGE2_ptrName  === undefined ||
		localStorage.SAGE2_ptrName  === null ||
		localStorage.SAGE2_ptrName  === "Default") {
		if (hasMouse) {
			localStorage.SAGE2_ptrName  = "SAGE2_user";
		} else {
			localStorage.SAGE2_ptrName  = "SAGE2_mobile";

		}
	}
	if (localStorage.SAGE2_ptrColor === undefined ||
		localStorage.SAGE2_ptrColor === null) {
		localStorage.SAGE2_ptrColor = "#B4B4B4";
	}

	addCookie('SAGE2_ptrName',  localStorage.SAGE2_ptrName);
	addCookie('SAGE2_ptrColor', localStorage.SAGE2_ptrColor);

	document.getElementById('sage2PointerLabel').value = localStorage.SAGE2_ptrName;
	document.getElementById('sage2PointerColor').value = localStorage.SAGE2_ptrColor;

	this.wsio.emit('registerInteractionClient', {
		name: document.getElementById('sage2PointerLabel').value,
		color: document.getElementById('sage2PointerColor').value
	});

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
	* Set the start callback
	*
	* @method setFileUploadStartCallback
	* @param callback {Function} upload start callback
	*/
	this.setFileUploadStartCallback = function(callback) {
		this.fileUploadStart = callback;
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
	* Cancel the file uploads by aborting the XMLHttpRequests
	*
	* @method cancelUploads
	*/
	this.cancelUploads = function() {
		if (this.array_xhr.length > 0) {
			for (var i = 0; i < this.array_xhr.length; i++) {
				this.array_xhr[i].abort();
			}
			this.array_xhr.length = 0;
		}
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

			// Parse the reply into JSON
			var msgFromServer = JSON.parse(event.target.response);

			// Check the return values for success/error
			Object.keys(msgFromServer.files).map(function(k) {
				name = msgFromServer.files[k].name;
				type = msgFromServer.files[k].type;
				if (!msgFromServer.fields.good) {
					showSAGE2Message('Unrecognized file type: ' + name + ' ' + type);
				}
			});

			filesFinished++;
			if (_this.fileUploadComplete && filesFinished === files.length) {
				_this.fileUploadComplete();
			}

			_this.wsio.emit('uploadedFile', {name: name, type: type});
		};

		if (this.fileUploadStart) {
			this.fileUploadStart(files);
		}

		// Clear the upload array
		this.array_xhr.length = 0;

		for (var i = 0; i < files.length; i++) {
			if (files[i].size <= this.maxUploadSize) {
				var formdata = new FormData();
				formdata.append("file" + i.toString(), files[i]);
				formdata.append("dropX", dropX);
				formdata.append("dropY", dropY);
				formdata.append("open",  true);

				formdata.append("SAGE2_ptrName",  localStorage.SAGE2_ptrName);
				formdata.append("SAGE2_ptrColor", localStorage.SAGE2_ptrColor);

				var xhr = new XMLHttpRequest();
				// add the request into the array
				this.array_xhr.push(xhr);
				xhr.open("POST", "upload", true);
				xhr.upload.id = "file" + i.toString();
				xhr.upload.addEventListener('progress', progressCallback, false);
				xhr.addEventListener('load', loadCallback, false);
				xhr.send(formdata);
			} else {
				// show message for 4 seconds
				showSAGE2Message("File: " + files[i].name + " is too large (max size is " +
					(this.maxUploadSize / (1024 * 1024 * 1024)) + " GB)");
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
		} else {
			// madeup mimetype for drag-drop URL
			mimeType = "application/url";
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
				console.log('Pointerlockchange>', e);
			});
			button.requestPointerLock = button.requestPointerLock       ||
										button.mozRequestPointerLock    ||
										button.webkitRequestPointerLock;

			// Ask the browser to lock the pointer
			if (button.requestPointerLock) {
				button.requestPointerLock();
			} else {
				showSAGE2Message("No PointerLock support in this browser.<br> Google Chrome is preferred.");
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
		if (!this.broadcasting) {
			if (__SAGE2__.browser.isChrome === true && this.chromeDesktopCaptureEnabled === true) {
				// post message to start chrome screen share
				window.postMessage('SAGE2_capture_desktop', '*');
			} else if (__SAGE2__.browser.isChrome === true && this.chromeDesktopCaptureEnabled !== true) {

				/* eslint-disable max-len */
				webix.confirm({
					title: "Screen sharing",
					ok: "Ok",
					cancel: "Cancel",
					text:  "Let's install the SAGE2 screen sharing extension for Chrome (or visit the help page).<br>" +
							"Once done, please reload the SAGE UI page",
					width: "60%",
					position: "center",
					callback: function(confirm) {
						if (confirm) {
							window.open("https://chrome.google.com/webstore/detail/sage2-screen-capture/mbkfcmpjbkmmdcfocaclghbobhnjfpkk",
								"Good luck!");
						} else {
							window.open("help/index.html", "Good luck!");
						}
						webix.modalbox.hide(this);
					}
				});

				/* eslint-enable max-len */

			} else if (__SAGE2__.browser.isFirefox === true) {
				// attempt to start firefox screen share
				//   can replace 'screen' with 'window' (but need user choice ahead of time)
				showDialog('ffShareScreenDialog');
			} else {
				showSAGE2Message("Screen capture not supported in this browser.<br> Google Chrome is preferred.");
			}
		} else {
			var _this = this;
			// Create a modal window
			webix.confirm({
				title: "Screen sharing",
				ok: "Confirm",
				cancel: "Cancel",
				text: "Already sharing content.<br> Press <strong style='font-weight:bold;'>Confirm</strong> " +
					"to close the existing window and share another one.<br>" +
					"Press <strong style='font-weight:bold;'>Cancel</strong> to continue sharing the existing window.",
				width: "60%",
				position: "center",
				callback: function(confirm) {
					if (confirm) {
						_this.streamEnded();
						_this.startScreenShare();
					}
					webix.modalbox.hide(this);
				}
			});
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
			var constraints = {
				chromeMediaSource: 'desktop',
				chromeMediaSourceId: data,
				maxWidth: 1920, maxHeight: 1080,
				maxFrameRate: 24,
				minFrameRate: 3
			};
			navigator.getUserMedia({video: {mandatory: constraints, optional: []}, audio: false},
				this.streamSuccess, this.streamFail);
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
		this.mediaStream = stream;

		// deprecated:
		// this.mediaStream.onended = this.streamEnded;
		// Get list of tracks and set the handler on the track
		var tracks = stream.getTracks();
		if (tracks.length > 0) {
			// Place the callback when the track is ended
			tracks[0].onended = this.streamEnded;
		}

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
			showSAGE2Message('Screen capture failed.<br> Make sure to install and enable the Chrome SAGE2 extension.<br>' +
				'See Window/Extension menu');
		} else if (__SAGE2__.browser.isFirefox === true) {
			showSAGE2Message('Screen capture failed. To enable screen capture in Firefox:<br>1- Open "about:config"<br>' +
				'2- Set "media.getusermedia.screensharing.enabled" to true<br>' +
				'3- Add your domain (or localhost) in "media.getusermedia.screensharing.allowed_domains"');
		} else {
			showSAGE2Message("No screen capture support in this browser.<br> Google Chrome is preferred.");
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
		// cancelAnimationFrame(this.req);
		cancelIdleCallback(this.req);
		this.wsio.emit('stopMediaStream', {id: this.uniqueID + "|0"});
	};

	/**
	* Using requestIdleCallback from Chrome for screen capture
	*
	* @method stepMethod
	* @param deadline {Object} object containing timing information
	*/
        this.deadlineLimit = 15;
        this.timeForThisFrame;
	this.stepMethod = function(deadline) {
		// if more than 10ms of freetime, go for it
		if (deadline.timeRemaining() > 10) {
			if (true) { // (this.gotRequest) {
                                this.timeForThisFrame = deadline.timeRemaining();
				this.pix = this.captureMediaFrame();
				this.sendMediaStreamFrame();
			}
		}
		// and request again
		this.req = requestIdleCallback(this.step);
	};

        this.qosUpdate = function(match) {
                // ratio of dropped frames to total frames gathered
                var ratio1 = this.resolutionCheck1(match);
                var ratio2 = this.resolutionCheck2(match);
                this.frameCount = this.frameCount + 1;
                if (this.frameCount === 19) {
                        console.log("shape use ratio1 "+ratio1);
                        var mediaCanvas = document.getElementById('mediaCanvas');
                        if (ratio1 > 0.8 || (this.origWidth<600) || (this.timeForThisFrame>50)) {
                          console.log("full scale");
                          mediaCanvas.width = this.origWidth;
                          mediaCanvas.height = this.origHeight;
                          this.mediaQuality    = 9;
                        } else {
                          console.log("half scale");
                          mediaCanvas.width = this.origWidth * 0.7;
                          mediaCanvas.height = this.origHeight * 0.7;
                          this.mediaQuality    = 7;
                        }
                }
                if (this.frameCount === 39) {
                        console.log("shape use ratio2 "+ratio2);
                        var mediaCanvas = document.getElementById('mediaCanvas');
                        if (ratio2 > 0.8 || (this.origWidth<600) || (this.timeForThisFrame>50)) {
                          console.log("full scale");
                          mediaCanvas.width = this.origWidth;
                          mediaCanvas.height = this.origHeight;
                          this.mediaQuality    = 9;
                        } else {
                          console.log("half scale");
                          mediaCanvas.width = this.origWidth * 0.7;
                          mediaCanvas.height = this.origHeight * 0.7;
                          this.mediaQuality    = 7;
                        }
                }
        }

        this.resolutionCheck1 = function(match) {
                if (match) {
                        this.dropTot = this.dropTot + 1;
                } else {
                        this.sentTot = this.sentTot + 1;
                }
                if (this.frameCount === 20) {
                        this.dropTot = 1;
                        this.sentTot = 1;
                }
                return this.dropTot / (this.dropTot + this.sentTot);
        }

        this.resolutionCheck2 = function(match) {
                if (match) {
                        this.dropTot2 = this.dropTot2 + 1;
                } else {
                        this.sentTot2 = this.sentTot2 + 1;
                }
                if (this.frameCount === 40) {
                        this.dropTot2 = 1;
                        this.sentTot2 = 1;
                        this.frameCount = 0;
                }
                return this.dropTot2 / (this.dropTot2 + this.sentTot2);
        }


	/**
	* The screen sharing can start
	*
	* @method streamCanPlayMethod
	* @param event {Object} event
	*/
	this.streamCanPlayMethod = function(event) {
		// Making sure it's not already sending
		if (!this.broadcasting) {
			var screenShareResolution = document.getElementById('screenShareResolution');
			var mediaVideo  = document.getElementById('mediaVideo');
			var mediaCanvas = document.getElementById('mediaCanvas');

			if (mediaVideo.videoWidth === 0 || mediaVideo.videoHeight === 0) {
				setTimeout(this.streamCanPlay, 500, event);
				return;
			}

			var widths = [
				Math.min(852,  mediaVideo.videoWidth),
				Math.min(1280, mediaVideo.videoWidth),
				Math.min(1920, mediaVideo.videoWidth),
				mediaVideo.videoWidth
			];

			for (var i = 0; i < 4; i++) {
				var height = parseInt(widths[i] * mediaVideo.videoHeight / mediaVideo.videoWidth, 10);
				screenShareResolution.options[i].value = widths[i] + "x" + height;
			}

			var res = screenShareResolution.options[this.mediaResolution].value.split("x");
			mediaCanvas.width  = parseInt(res[0], 10);
			mediaCanvas.height = parseInt(res[1], 10);

                        var res = screenShareResolution.options[this.mediaResolution].value.split("x");
                        mediaCanvas.width  = parseInt(res[0], 10);
                        mediaCanvas.height = parseInt(res[1], 10);
                        console.log("IP1: "+mediaCanvas.width+" "+mediaCanvas.height);
                        this.origWidth = mediaCanvas.width;
                        this.origHeight = mediaCanvas.height;
                        //if (mediaCanvas.width > 800) {
                        //        mediaCanvas.width = mediaCanvas.width * 0.9;
                        //        mediaCanvas.height = mediaCanvas.height * 0.9;
                        //}
                        //if (this.origWidth > 1024) {
                        //                mediaCanvas.width = this.origWidth * 0.8;
                        //        mediaCanvas.height = this.origHeight * 0.8;
                        //}
                        console.log("IP2: "+mediaCanvas.width+" "+mediaCanvas.height);
                        console.log("mediaQuality "+this.mediaQuality);
                        console.log("deadlineLimit "+this.deadlineLimit);

			var frame = this.captureMediaFrame();
			this.pix  = frame;
			var raw   = atob(frame.split(",")[1]); // base64 to string
			this.wsio.emit('startNewMediaStream', {
				id: this.uniqueID + "|0",
				title: localStorage.SAGE2_ptrName + ": Shared Screen",
				color: localStorage.SAGE2_ptrColor,
				src: raw, type: "image/jpeg", encoding: "binary",
				width: mediaVideo.videoWidth, height: mediaVideo.videoHeight
			});

			this.broadcasting = true;

			// Using requestAnimationFrame
			// var _this = this;
			// var lastCapture = performance.now();
			// function step(timestamp) {
			// 	console.log('    update', timestamp - lastCapture);
			// 	var interval = timestamp - lastCapture;
			// 	// if (_this.broadcasting && interval >= 16) {
			// 		lastCapture = timestamp;
			// 		if (_this.gotRequest) {
			// 			console.log('  Capture', timestamp);
			// 			_this.pix = _this.captureMediaFrame();
			// 			_this.sendMediaStreamFrame();
			// 		}
			// 		_this.req = requestAnimationFrame(step);
			// 	// }
			// }
			// this.req = requestAnimationFrame(step);

			// Request an idle callback for screencapture
			this.req = requestIdleCallback(this.step);
		}
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

		// mediaCtx.clearRect(0, 0, mediaCanvas.width, mediaCanvas.height);
		mediaCtx.drawImage(mediaVideo, 0, 0, mediaCanvas.width, mediaCanvas.height);
		return mediaCanvas.toDataURL("image/jpeg", (this.mediaQuality / 10));
	};

	this.requestMediaStreamFrame = function(argument) {
		if (this.broadcasting) {
			this.gotRequest = true;
		}
	};

        function str2ab(str, refChecksum) {
          var buf = new ArrayBuffer(str.length);
          var bufView = new Uint8Array(buf);
          var checkSum = 0;
          for (var i=0, strLen=str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
            checkSum = (checkSum + bufView[i]) % 256;
          }
          if (refChecksum !== null && refChecksum !== undefined) {
            refChecksum.val = checkSum;
          }
          return bufView;
        }


        /**
         * Creates a new Uint8Array based on multiple ArrayBuffers
         * @return {ArrayBuffers} The new ArrayBuffer created out of the two.
         */
        var _appendBuffers = function(buffer1, buffer2, buffer3, buffer4) {
          //console.log("appendBuffers ",buffer1.byteLength, buffer2.byteLength, buffer3.byteLength, buffer4.byteLength);
          var nulB = new Uint8Array([0]);
          var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength + buffer3.byteLength + buffer4.byteLength + 3);
          var pos = 0;
          tmp.set(buffer1, pos);
          var i = 0;
          pos = pos + buffer1.byteLength;
          tmp.set(nulB, pos);
          pos = pos + 1;
          tmp.set(buffer2, pos);
          pos = pos + buffer2.byteLength;
          tmp.set(nulB, pos);
          pos = pos + 1;
          tmp.set(buffer3, pos);
          pos = pos + buffer3.byteLength;
          tmp.set(nulB, pos);
          pos = pos + 1;
          tmp.set(buffer4, pos);
          //for (i = 0; i<buffer1.byteLength + 2; i++) {
          //  console.log("tmp ",i,tmp[i]);
          //}
          return tmp;
        };

        /**
         * Creates a new Uint8Array based on multiple ArrayBuffers
         * @return {ArrayBuffers} The new ArrayBuffer created out of the two.
         */
        var _appendBuffers6 = function(buffer1, buffer2, buffer3, buffer4, buffer5, buffer6) {
          console.log("appendBuffers ");
          var nulB = new Uint8Array([0]);
          var tmplen = buffer1.byteLength + buffer2.byteLength + buffer3.byteLength + buffer4.byteLength + buffer5.byteLength + buffer6.byteLength + 5;
          var tmp = new Uint8Array(tmplen);
          var pos = 0;
          // buffer1
          tmp.set(buffer1, pos);
          pos = pos + buffer1.byteLength;
          tmp.set(nulB, pos);
          pos = pos + 1;
          // buffer2
          tmp.set(buffer2, pos);
          pos = pos + buffer2.byteLength;
          tmp.set(nulB, pos);
          pos = pos + 1;
          // buffer3
          tmp.set(buffer3, pos);
          pos = pos + buffer3.byteLength;
          tmp.set(nulB, pos);
          pos = pos + 1;
          // buffer4
          tmp.set(buffer4, pos);
          pos = pos + buffer4.byteLength;
          tmp.set(nulB, pos);
          pos = pos + 1;
          // buffer5
          tmp.set(buffer5, pos);
          pos = pos + buffer5.byteLength;
          tmp.set(nulB, pos);
          pos = pos + 1;
          // buffer6
          tmp.set(buffer6, pos);
          pos = pos + buffer6.byteLength;
          //tmp.set(nulB, pos);
          //pos = pos + 1;

          if (pos !== tmplen) {
                console.log("WARNING: length inconsistency in _appendBuffers6");
          }
          return tmp;
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

			if (true) { // raw.length > this.chunk) {
                                var _this   = this;
                                var nchunks = Math.ceil(raw.length / this.chunk);

                                var refChecksum = {};
                                var intAr = str2ab(raw, refChecksum);
                                var lastChecksum = refChecksum.val;
                                var match = (lastChecksum === this.lastChecksum);
                                if (match) {
                                    console.log("checksum match - drop frame");
                                } else {
				    var updateMediaStreamChunk = function(index, start, end) {
					    setTimeout(function() {
						    //_this.wsio.emit('updateMediaStreamChunk', {id: _this.uniqueID + "|0",
						    //      state: {src: msg_chunk, type: "image/jpeg", encoding: "binary"},
						    //      piece: index, total: nchunks});
						    var id = _this.uniqueID+"|0";
						    var clen = end - start;
						    //console.log("updateMediaStreamChunk ", index, id, intAr.length, start, end, clen);
						    //var subAr = intAr.subarray(start, clen);
						    var subAr = new Uint8Array(intAr,start,clen);
						    //console.log("extracted chunk "+subAr.length);
						    var buffer = _appendBuffers6(str2ab(id), str2ab(index.toString()), str2ab(nchunks.toString()), str2ab("image/jpeg"), str2ab("base64"), subAr);
						    _this.wsio.emit('updateMediaStreamChunk', buffer);
					    }, 4);
				    };
				    for (var i = 0; i < nchunks; i++) {
					    var start = i * this.chunk;
					    var end   = (i + 1) * this.chunk < raw.length ? (i + 1) * this.chunk : raw.length;
					    updateMediaStreamChunk(i, start, end);
				    }
				    this.gotRequest = false;
                                }
                                this.qosUpdate(match);
                                this.lastChecksum = lastChecksum;

			} else {
                                //console.log("sendMediaStreamFrame ", this.uniqueID);
                                //mytrace(raw);
                                var id = this.uniqueID+"|0";
                                //console.log("id ",id.byteLength);
                                var refChecksum = {};
                                var buffer = _appendBuffers(str2ab(id), str2ab("image/jpeg"), str2ab("base64"), str2ab(raw, refChecksum));
                                var lastChecksum = refChecksum.val;
                                var match = (lastChecksum === this.lastChecksum);
                                if (match) {
                                    console.log("checksum match - drop frame");
                                } else {
                                    this.wsio.emit('updateMediaStreamFrame', buffer);
                                }
                                this.qosUpdate(match);
                                this.lastChecksum = lastChecksum;
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
			// increase the speed for touch devices
			var scale = (hasMouse ? this.sensitivity : 3 * this.sensitivity);
			var px  = this.deltaX * scale;
			var py  = this.deltaY * scale;
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
		// Get the code of the event
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
	* Simalute Shift-Tab with keys
	*
	* @method togglePointerMode
	*/
	this.togglePointerMode = function() {
		this.wsio.emit('keyDown', {code: 16});
		this.wsio.emit('keyPress', {code: 9, character: String.fromCharCode(9)});
		this.wsio.emit('keyUp', {code: 16});
	};

	/**
	* Send a spacebar key, for playing PDF and movies mostly
	*
	* @method sendPlay
	*/
	this.sendPlay = function() {
		// send spacebar code 32
		this.wsio.emit('keyPress', {code: 32, character: String.fromCharCode(32)});
	};

	/**
	* Handler for pointer lable text
	*
	* @method changeSage2PointerLabelMethod
	* @param event {Object} key event
	*/
	this.changeSage2PointerLabelMethod = function(event) {
		localStorage.SAGE2_ptrName = event.target.value;

		addCookie('SAGE2_ptrName', localStorage.SAGE2_ptrName);

		// if it's an first time run, update the UI too
		if (event.target.id === "sage2PointerLabelInit") {
			document.getElementById('sage2PointerLabel').value = event.target.value;
		}
	};

	/**
	* Handler for the pointer color selection
	*
	* @method changeSage2PointerColorMethod
	* @param event {Object} key event
	*/
	this.changeSage2PointerColorMethod = function(event) {
		localStorage.SAGE2_ptrColor = event.target.value;

		addCookie('SAGE2_ptrColor', localStorage.SAGE2_ptrColor);

		// if it's an first time run, update the UI too
		if (event.target.id === "sage2PointerColorInit") {
			document.getElementById('sage2PointerColor').value = event.target.value;
		}
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
			console.log("Media resolution: " + event.target.options[this.mediaResolution].value);
		}
	};

	/**
	* Handler for screen quality selection
	*
	* @method changeScreenShareQualityMethod
	* @param event {Object} key event
	*/
	this.changeScreenShareQualityMethod = function(event) {
		this.mediaQuality = parseInt(event.target.value, 10);
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
	this.step                        = this.stepMethod.bind(this);

	document.addEventListener('pointerlockerror',        this.pointerLockError,  false);
	document.addEventListener('mozpointerlockerror',     this.pointerLockError,  false);
	document.addEventListener('pointerlockchange',       this.pointerLockChange, false);
	document.addEventListener('mozpointerlockchange',    this.pointerLockChange, false);

	document.getElementById('sage2PointerLabel').addEventListener('input',      this.changeSage2PointerLabel,     false);
	document.getElementById('sage2PointerColor').addEventListener('input',      this.changeSage2PointerColor,     false);
	document.getElementById('sage2PointerLabelInit').addEventListener('input',  this.changeSage2PointerLabel,     false);
	document.getElementById('sage2PointerColorInit').addEventListener('input',  this.changeSage2PointerColor,     false);
	document.getElementById('screenShareResolution').addEventListener('change', this.changeScreenShareResolution, false);
	document.getElementById('screenShareQuality').addEventListener('input',     this.changeScreenShareQuality,    false);
	document.getElementById('mediaVideo').addEventListener('canplay',           this.streamCanPlay,               false);


	// -----------
	// Shim for requestIdleCallback (available on Chrome)
	// -----------
	window.requestIdleCallback = window.requestIdleCallback || function(cb) {
		var start = Date.now();
		return setTimeout(function() {
			cb({
				didTimeout: false,
				timeRemaining: function() {
					return Math.max(0, 50 - (Date.now() - start));
				}
			});
		}, 1);
	};
	window.cancelIdleCallback =	window.cancelIdleCallback || function(id) {
		clearTimeout(id);
	};
	// -----------
}
