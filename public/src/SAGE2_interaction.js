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
/* global viewOnlyMode, deleteCookie */

"use strict";

/**
 * User interaction for SAGE2
 *
 * @module client
 * @submodule SAGE2_interaction
 */


const SAGE2_interaction = (function() {

	var _loggedIn = false;
	var _uid = null;

	var _userSettings = {};

	/**
	* Callback any time a login event is attempted
	*
	* @method handleLoginStateChange
	* @param response {Object} data returned by the server
	*/
	function handleLoginStateChange(response) {
		// if user tried to log in: check if successful
		if (response.login) {
			let user = response.user;
			if (response.success) {
				_uid = response.uid;
				_loggedIn = true;

				if ($$("login_form_container")) {
					$$("login_form_container").hide();
					$$("settings_dialog").show();
				}

				// store auth credentials in cookies
				_userSettings.SAGE2_userName = user.name;
				_userSettings.SAGE2_userEmail = user.email;
				addCookie('SAGE2_userName', user.name);
				addCookie('SAGE2_userEmail', user.email);
			}

			if (user.SAGE2_ptrName !== _userSettings.SAGE2_ptrName) {
				this.changeSage2PointerLabel(user.SAGE2_ptrName);
			}
			if (user.SAGE2_ptrColor !== _userSettings.SAGE2_ptrColor) {
				this.changeSage2PointerColor(user.SAGE2_ptrColor);
			}
		}

		// if user tried to logout
		if (response.login === false) {
			_uid = null;
			_loggedIn = false;

			// clear credentials
			delete _userSettings.SAGE2_userName;
			delete _userSettings.SAGE2_userEmail;
			deleteCookie('SAGE2_userName');
			deleteCookie('SAGE2_userEmail');
			this.changeSage2PointerLabel(response.name);
		}

		// if an error message is shown
		if (response.errorMessage && $$("login_error")) {
			$$("login_error").setValue(response.errorMessage);
			$$("login_error").show();
		}

		// on initialization
		if (response.init) {
			if (!_loggedIn && _userSettings.SAGE2_ptrName && _userSettings.SAGE2_ptrName.startsWith('Anon ')) {
				this.settingsDialog('init');
			}
		}

		this.updateLoginButton();
	}

	/**
	* Handles server notification that action was permitted
	*
	* @method allowAction
	*/
	function allowAction(action) {
		switch (action) {
			case 'stream':
				this.startScreenShare();
				break;
		}
	}


	/**
	* Handles server notification that action was canceled due to
	* permissions
	*
	* @method cancelAction
	*/
	function cancelAction(action) {
		let actionFound;
		switch (action) {
			case 'pointer':
				this.stopSAGE2Pointer();
				actionFound = true;
				break;
			case 'stream':
			case 'application':
			case 'file':
				actionFound = true;
				break;
		}

		if (actionFound) {
			webix.alert("You don't have permission to do that.");
		}
	}

	/**
	* @method randomHexColor
	* @return {String} color as a hex string
	*/
	function randomHexColor() {
		let hex = (Math.floor(Math.random() * 0xffffff)).toString(16);
		if (hex.length < 6) {
			hex = Array(6 - hex.length + 1).join('0') + hex;
		}
		return '#' + hex;
	}


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

					formdata.append("SAGE2_ptrName",  _userSettings.SAGE2_ptrName);
					formdata.append("SAGE2_ptrColor", _userSettings.SAGE2_ptrColor);

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
				// mimeType = "video/youtube";
				mimeType = "application/url";
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
				this.wsio.emit('addNewWebElement', {
					type: mimeType,
					url: url,
					position: [dropX, dropY],
					id: this.uniqueID,
					SAGE2_ptrName:  localStorage.SAGE2_ptrName,
					SAGE2_ptrColor: localStorage.SAGE2_ptrColor
				});
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
				this.wsio.emit('startSagePointer', this.user);

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
				this.wsio.emit('stopSagePointer', this.user);
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
				this.wsio.emit('stopSagePointer', this.user);

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
				this.wsio.emit('startSagePointer', this.user);

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

		this.requestToStartScreenShare = function() {
			if (!this.broadcasting) {
				wsio.emit('requestToStartMediaStream');
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
			this.wsio.emit('stopMediaStream', Object.assign({id: this.uniqueID + "|0"}, _userSettings));
		};

		/**
		* Screen sharing has to stop
		*
		* @method streamEnd
		*/
		this.streamEnd = function() {
			this.broadcasting = false;
			cancelIdleCallback(this.req);
		};

		/**
		* Using requestIdleCallback from Chrome for screen capture
		*
		* @method stepMethod
		* @param deadline {Object} object containing timing information
		*/
		this.stepMethod = function(deadline) {
			// if more than 10ms of freetime, go for it
			if (deadline.timeRemaining() > 10) {
				if (this.gotRequest) {
					this.pix = this.captureMediaFrame();
					this.sendMediaStreamFrame();
				}
			}
			// and request again
			this.req = requestIdleCallback(this.step);
		};

		/**
		* The screen sharing can start
		*
		* @method streamCanPlayMethod
		* @param event {Object} event
		*/
		this.streamCanPlayMethod = function(event) {
			// Making sure it's not already sending
			if (!this.broadcasting) {
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

				var height = widths[this.mediaResolution] * mediaVideo.videoHeight / mediaVideo.videoWidth;

				mediaCanvas.width  = widths[this.mediaResolution];
				mediaCanvas.height = height;

				var frame = this.captureMediaFrame();
				this.pix  = frame;
				var raw   = atob(frame.split(",")[1]); // base64 to string
				this.wsio.emit('startNewMediaStream', Object.assign({
					id: this.uniqueID + "|0",
					title: _userSettings.SAGE2_ptrName + ": Shared Screen",
					color: _userSettings.SAGE2_ptrColor,
					src: raw, type: "image/jpeg", encoding: "binary",
					width: mediaVideo.videoWidth, height: mediaVideo.videoHeight
				}, _userSettings));

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
					this.gotRequest = false;
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
		* @param value {String} new name
		*/
		this.changeSage2PointerLabelMethod = function(value) {
			if (value) {
				_userSettings.SAGE2_ptrName = value;
			} else if (hasMouse) {
				_userSettings.SAGE2_ptrName  = "SAGE2_user";
			} else {
				_userSettings.SAGE2_ptrName  = "SAGE2_mobile";
			}

			addCookie('SAGE2_ptrName', _userSettings.SAGE2_ptrName);
			if ($$("settings_dialog")) {
				// this should be the same as in settingsdialog
				webix.ui({
					view: "text",
					id: "user_name",
					label: "Name",
					value: _userSettings.SAGE2_ptrName
				}, $$("user_name"));
			}
		};

		/**
		* Handler for the pointer color selection
		*
		* @method changeSage2PointerColorMethod
		* @param value {String} new name
		*/
		this.changeSage2PointerColorMethod = function(value) {
			_userSettings.SAGE2_ptrColor = value || randomHexColor();

			addCookie('SAGE2_ptrColor', _userSettings.SAGE2_ptrColor);
			if ($$("settings_dialog")) {
				// this should be the same as in settingsdialog
				// webix.ui({
				// 	view: "colorpicker", id: "user_color", label: "Color", value: _userSettings.SAGE2_ptrColor
				// }, $$("user_color"));

				// not sure what that code does
				webix.ui({
					cols: [
						{
							view: "label",
							align: "left",
							label: "Color"
						},
						{
							view: "colorboard",
							id: "user_color",
							label: "Color",
							value: _userSettings.SAGE2_ptrColor,
							width: 290, height: 100,
							cols: 12, rows: 5,
							minLightness: 0.3, maxLightness: 0.9
						}
					]
				}, $$("user_color"));
			}
		};

		/**
		* Handler for screen resolution selection
		*
		* @method changeScreenShareResolutionMethod
		* @param value {Number} a value corresponding to a resolution level
		* @param resolution {String} resolution in the format "width x height"
		*/
		this.changeScreenShareResolutionMethod = function(value, resolution) {
			this.mediaResolution = value;
			var res = resolution.split("x");
			if (res.length === 2) {
				var mediaCanvas = document.getElementById('mediaCanvas');
				mediaCanvas.width  = parseInt(res[0], 10);
				mediaCanvas.height = parseInt(res[1], 10);
				console.log("Media resolution: " + resolution);
			}
		};

		/**
		* Handler for screen quality selection
		*
		* @method changeScreenShareQualityMethod
		* @param value {Number} a value corresponding to a quality level
		*/
		this.changeScreenShareQualityMethod = function(value) {
			this.mediaQuality = parseInt(value, 10);
		};

		/**
		* Webix modal for user login
		*
		* @method loginDialog
		* @param callingView {Object} webix view that called this method
		*/
		this.loginDialog = function(callingView) {
			if ($$("login_form_container")) {
				$$("login_form_container").show();
			} else {
				webix.ui({
					view: "window",
					position: "center",
					modal: true,
					zIndex: 9999,
					id: "login_form_container",
					head: "Sign in",
					body: {
						view: "form",
						id: "login_form",
						width: 400,
						borderless: false,
						elements: [
							{
								view: "text", id: "login_name", label: "Name", name: "name"
							},
							{
								view: "text", id: "login_email", label: "Email", name: "email"
							},
							{
								view: "label", id: "login_error", label: "", align: "center"
							},
							{
								margin: 5, cols: [
									{
										view: "button", id: "login_cancel", label: "Cancel", type: "prev",
										click: function() {
											this.getTopParentView().hide();
											if (callingView && $$('settings_dialog')) {
												$$('settings_dialog').show();
											}
										}
									},
									{
										view: "button", id: "login_create", label: "Create new user",
										click: function() {
											let data = $$("login_form").getValues();
											if ($$("settings_dialog")) {
												data.SAGE2_ptrName = $$("user_name").getValue();
												data.SAGE2_ptrColor = $$("user_color").getValue();
											} else {
												data.SAGE2_ptrName = _userSettings.SAGE2_ptrName;
												data.SAGE2_ptrColor = _userSettings.SAGE2_ptrColor;
											}
											wsio.emit('createUser', data);
										}
									},
									{
										view: "button", id: "login_confirm", label: "Sign in", type: "form",
										click: function() {
											let data = $$("login_form").getValues();
											wsio.emit('loginUser', data);
										}
									}
								]
							}
						]
					}
				}).show();
			}


			if (callingView) {
				callingView.hide();
			}

			// clear initial values
			let name = $$("login_name");
			let email = $$("login_email");
			$$("login_form").setValues({
				name: "",
				email: ""
			});
			$$("login_cancel").enable();
			$$("login_confirm").disable();
			$$("login_create").disable();
			$$("login_error").hide();

			$$("login_name").focus();

			// check input
			function validate() {
				if (name.getValue() && email.getValue()) {
					$$("login_create").enable();
					$$("login_confirm").enable();
				} else {
					$$("login_create").disable();
					$$("login_confirm").disable();
				}
			}
			if (!name.hasEvent('onTimedKeyPress')) {
				$$("login_name").attachEvent("onTimedKeyPress", validate);
			}
			if (!email.hasEvent('onTimedKeyPress')) {
				$$("login_email").attachEvent("onTimedKeyPress", validate);
			}
		};

		this.updateLoginButton = function() {
			if ($$('user_confirm')) {
				let label = "Ok";
				if (!_loggedIn && !$$('user_cancel')) {
					label = "Log in as guest";
				}

				webix.ui({
					view: "button", id: "user_confirm", value: label, type: "form",
					click: () => {
						// When OK button pressed

						var uname  = $$("user_name").getValue();
						var ucolor = $$("user_color").getValue();

						// Set the values into _userSettings of browser
						this.changeSage2PointerLabel(uname);
						this.changeSage2PointerColor(ucolor);

						this.wsio.emit('editUser', {
							uid: _uid,
							properties: {
								SAGE2_ptrColor: ucolor,
								SAGE2_ptrName: uname
							}
						});

						// Close the UI
						$$('settings_dialog').destructor();
					}
				}, $$('user_confirm'));
			}

			if ($$("user_login")) {
				webix.ui({
					view: "button", id: "user_login",
					template: "<button style='border:none; color:#555; background:#ddd;'>#label#</button>",
					label: _loggedIn ? "Sign out" : "Sign up for more options",
					click: () => {
						if (_loggedIn) {
							wsio.emit('logoutUser', _uid);
						} else {
							// redirect view to login modal
							this.loginDialog($$("settings_dialog"));
						}
					}
				}, $$("user_login"));
			}
		};

		/**
		* Webix modal for user settings
		*
		* @method settingsDialog
		* @param type {String} (init | main) indicates how to populate the dialog
		*/
		this.settingsDialog = function(type) {
			if (!type) {
				return;
			}

			// get default or stored values
			let username = _userSettings.SAGE2_ptrName || (hasMouse ? "SAGE2_user" : "SAGE2_mobile");
			let color = _userSettings.SAGE2_ptrColor || randomHexColor();

			let loginElement;
			if (type === 'init') {
				loginElement = {
					view: "button", id: "user_confirm", value: "Log in as guest", type: "form"
				};
			} else {
				loginElement = {
					margin: 5, cols: [
						{
							view: "button", id: "user_cancel", value: "Cancel",
							click: function() {
								// close the dialog without saving changes
								this.getTopParentView().destructor();
							}
						},
						{
							view: "button", id: "user_confirm", value: "Ok", type: "form"
						}
					]
				};
			}

			let webixOptions = {
				view: "window",
				id: "settings_dialog",
				position: "center",
				modal: true,
				zIndex: 9999,
				body: {
					view: "form",
					width: 400,
					borderless: false,
					elements: [
						{
							// this should be the same as in changeSage2PointerLabelMethod
							view: "text",
							id: "user_name",
							label: "Name",
							value: username
						},

						// {
						// 	// this should be the same as in changeSage2PointerColorMethod
						// 	view: "colorpicker",
						// 	id: "user_color",
						// 	label: "Color",
						// 	value: color
						// },

						// Alternate version with just a colorboard
						{
							cols: [
								{
									view: "label",
									align: "left",
									label: "Color"
								},
								{
									view: "colorboard",
									id: "user_color",
									label: "Color",
									value: color,
									width: 295, height: 100,
									cols: 12, rows: 5,
									minLightness: 0.3, maxLightness: 0.9
								}
							]
						},

						loginElement
						// {
						// 	view: "button", id: "user_login"
						// }
					],
					elementsConfig: {
						// labelPosition: "top"
					}
				}
			};

			switch (type) {
				case 'init':
					webixOptions.head = "Enter your name or nickname and choose a pointer color";
					break;
				case 'main':
					// also show screen resolution options when called via toolbar
					webixOptions.head = "Settings";
					var elements = webixOptions.body.elements;
					var userElements = elements.splice(0, 2);

					elements.unshift(
						{
							view: "label", label: "Enter your name or nickname and choose a pointer color", align: "center"
						},
						{
							type: "space",
							rows: userElements
						},
						{
							view: "label", label: "Screen sharing settings", align: "center"
						},
						{
							type: "space",
							rows: [
								{
									view: "richselect",
									label: "Resolution",
									id: "screen_resolution",
									value: (this.mediaResolution + 1) || 3,
									options: [
										{id: 1, value: "Low"},
										{id: 2, value: "Medium"},
										{id: 3, value: "High"},
										{id: 4, value: "Full"}
									]
								},
								{
									view: "richselect",
									label: "Quality",
									id: "screen_quality",
									value: this.mediaQuality || 9,
									options: [
										{id: 3, value: "Low"},
										{id: 7, value: "Medium"},
										{id: 9, value: "High"}
									]
								}
							]
						},
						{
							view: "label"
						}
					);
					break;
				default: break;
			}

			webix.ui.zIndexBase = 10000;	// to make the colorboard appear on top of the modal
			webix.ui(webixOptions).show();

			this.updateLoginButton();

			// Attach event handlers

			// change screen resolution
			if (type === 'main') {
				let res = $$("screen_resolution");
				res.attachEvent("onChange", () => {
					this.changeScreenShareResolution(res.getValue() - 1, res.getText());
				});

				// change screen quality
				let quality = $$("screen_quality");
				$$("screen_quality").attachEvent("onChange", () => {
					this.changeScreenShareQuality(quality.getValue());
				});
			}

			// Focus the text box
			$$('user_name').focus();
		};

		/**
		* Getter for user settings
		*
		* @property user
		*/
		Object.defineProperty(this, "user", {
			get: function() {
				return {
					name: _userSettings.SAGE2_userName,
					// id: _uid,
					label: _userSettings.SAGE2_ptrName,
					color: _userSettings.SAGE2_ptrColor
				};
			}
		});


		/**
		* Getter for user name
		*
		* @property username
		*/
		Object.defineProperty(this, "username", {
			get: function() {
				return _userSettings.SAGE2_userName;
			}
		});

		/**
		* Getter for user email
		*
		* @property email
		*/
		Object.defineProperty(this, "email", {
			get: function() {
				return _userSettings.SAGE2_userEmail;
			}
		});


		/**
		* Getter for pointer color
		*
		* @property pointerColor
		*/
		Object.defineProperty(this, "pointerColor", {
			get: function() {
				return _userSettings.SAGE2_ptrColor;
			}
		});

		/**
		* Getter for pointer label
		*
		* @property pointerLabel
		*/
		Object.defineProperty(this, "pointerLabel", {
			get: function() {
				return _userSettings.SAGE2_ptrName;
			}
		});


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


		/** init **/

		// Check if a domain cookie exists for the name
		var cookieName = getCookie('SAGE2_ptrName');
		if (cookieName) {
			if (cookieName.startsWith('Anon ')  ||
				cookieName === 'SAGE2_user' ||
				cookieName === 'SAGE2_mobile') {
				deleteCookie('SAGE2_ptrName');
				cookieName = null;
			}
			_userSettings.SAGE2_ptrName = cookieName;
		}
		// Check if a domain cookie exists for the color
		var cookieColor = getCookie('SAGE2_ptrColor');
		if (cookieColor) {
			_userSettings.SAGE2_ptrColor = cookieColor;
		}

		// Post message to the Chrome extension to register the UI
		if (__SAGE2__.browser.isChrome === true) {
			window.postMessage('SAGE2_registerUI', '*');
		}

		// Deals with the name and color of the pointer
		if (_userSettings.SAGE2_ptrColor === undefined ||
			_userSettings.SAGE2_ptrColor === null) {
			_userSettings.SAGE2_ptrColor = randomHexColor();
			addCookie('SAGE2_ptrColor', _userSettings.SAGE2_ptrColor);
		}

		// Check if user email / name exists
		var cookieUserName = getCookie('SAGE2_userName') || '';
		var cookieEmail = getCookie('SAGE2_userEmail') || '';

		if (!viewOnlyMode) {
			wsio.emit('loginUser', {
				name: cookieUserName,
				email: cookieEmail,
				SAGE2_ptrName: _userSettings.SAGE2_ptrName,
				SAGE2_ptrColor: _userSettings.SAGE2_ptrColor,
				init: true
			});
		}

		this.wsio.on('loginStateChanged', handleLoginStateChange.bind(this));
		this.wsio.on('allowAction', allowAction.bind(this));
		this.wsio.on('cancelAction', cancelAction.bind(this));

		document.addEventListener('pointerlockerror',        this.pointerLockError,  false);
		document.addEventListener('mozpointerlockerror',     this.pointerLockError,  false);
		document.addEventListener('pointerlockchange',       this.pointerLockChange, false);
		document.addEventListener('mozpointerlockchange',    this.pointerLockChange, false);
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

	return SAGE2_interaction;
}());
