// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/* global sagePointerEnabled, sagePointerDisabled */

"use strict";

/**
 * @module client
 * @submodule sagePointer
 */

/**
 * Class repsenting a pointer, used in the sagePointerApp.html page
 *
 * @class sagePointer
 * @constructor
 */
function sagePointer(wsio) {
	this.wsio = wsio;

	this.uniqueID    = null;
	this.sensitivity = null;
	this.mediaStream = null;

	this.fileDrop         = document.getElementById('fileDrop');
	this.fileDropText     = document.getElementById('fileDropText');
	this.fileDropProgress = document.getElementById('fileDropProgress');
	this.sagePointerBtn   = document.getElementById('sagePointerBtn');
	this.screenShareBtn   = document.getElementById('screenShareBtn');

	this.sagePointerLabel      = document.getElementById('sagePointerLabel');
	this.sagePointerColor      = document.getElementById('sagePointerColor');
	this.screenShareResolution = document.getElementById('screenShareResolution');
	this.screenShareQuality    = document.getElementById('screenShareQuality');
	this.windowManager         = document.getElementById('winMgr');
	this.screenShareQualityIndicator = document.getElementById('screenShareQualityIndicator');

	this.mediaVideo      = document.getElementById('mediaVideo');
	this.mediaCanvas     = document.getElementById('mediaCanvas');
	this.mediaCtx        = this.mediaCanvas.getContext('2d');
	this.mediaResolution = this.screenShareResolution.selectedIndex;
	this.mediaQuality    = this.screenShareQuality.value;
	this.broadcasting    = false;
	this.desktopId       = null;

	this.desktopCaptureEnabled = false;

	this.chunk = 32 * 1024; // 32 KB
	this.maxUploadSize = 20 * (1024 * 1024 * 1024); // 20GB just as a precaution

	if (localStorage.SAGE2_ptrName  === undefined ||
		localStorage.SAGE2_ptrName  === null ||
		localStorage.SAGE2_ptrName  === "Default") {
		localStorage.SAGE2_ptrName  = "SAGE2_user";
	}
	if (localStorage.SAGE2_ptrColor === undefined ||
		localStorage.SAGE2_ptrColor === null) {
		localStorage.SAGE2_ptrColor = "#B4B4B4";
	}

	this.sagePointerLabel.value = localStorage.SAGE2_ptrName;
	this.sagePointerColor.value = localStorage.SAGE2_ptrColor;

	var _this = this;

	// Capture the changes in the pointer name
	this.sagePointerLabel.addEventListener('input', function() {
		localStorage.SAGE2_ptrName = _this.sagePointerLabel.value;
	});

	// Capture the changes in the pointer color
	this.sagePointerColor.addEventListener('change', function() {
		localStorage.SAGE2_ptrColor = _this.sagePointerColor.value;
	});


	/**
	*
	* @method setPointerId
	*/
	this.setPointerId = function(id) {
		this.uniqueID = id;
	};

	/**
	*
	* @method setPointerSensitivity
	*/
	this.setPointerSensitivity = function(value) {
		this.sensitivity = value;
	};

	/**
	*
	* @method preventDefaultMethod
	*/
	this.preventDefaultMethod = function(event) {
		event.preventDefault();
	};

	/**
	*
	* @method startSagePointerMethod
	*/
	this.startSagePointerMethod = function() {
		this.sagePointerBtn.requestPointerLock = this.sagePointerBtn.requestPointerLock      ||
												this.sagePointerBtn.mozRequestPointerLock    ||
												this.sagePointerBtn.webkitRequestPointerLock;
		// Ask the browser to lock the pointer
		this.sagePointerBtn.requestPointerLock();
	};

	/**
	*
	* @method pointerLockChangeMethod
	*/
	this.pointerLockChangeMethod = function() {
		if (document.pointerLockElement === this.sagePointerBtn ||
				document.mozPointerLockElement === this.sagePointerBtn ||
				document.webkitPointerLockElement === this.sagePointerBtn) {
			this.wsio.emit('startSagePointer', {label: localStorage.SAGE2_ptrName, color: localStorage.SAGE2_ptrColor});

			document.addEventListener('mousedown',           this.pointerPress,     false);
			document.addEventListener('mousemove',           this.pointerMove,      false);
			document.addEventListener('mouseup',             this.pointerRelease,   false);
			document.addEventListener('dblclick',            this.pointerDblClick,  false);
			document.addEventListener('mousewheel',          this.pointerScroll,    false);
			document.addEventListener('DOMMouseScroll',      this.pointerScrollFF,  false);
			document.addEventListener('keydown',             this.pointerKeyDown,   false);
			document.addEventListener('keyup',               this.pointerKeyUp,     false);
			document.addEventListener('keypress',            this.pointerKeyPress,  false);

			this.sagePointerBtn.removeEventListener('click', this.startSagePointer, false);

			sagePointerEnabled();
		} else {
			this.wsio.emit('stopSagePointer');

			document.removeEventListener('mousedown',        this.pointerPress,     false);
			document.removeEventListener('mousemove',        this.pointerMove,      false);
			document.removeEventListener('mouseup',          this.pointerRelease,   false);
			document.removeEventListener('dblclick',         this.pointerDblClick,  false);
			document.removeEventListener('mousewheel',       this.pointerScroll,    false);
			document.removeEventListener('DOMMouseScroll',   this.pointerScrollFF,  false);
			document.removeEventListener('keydown',          this.pointerKeyDown,   false);
			document.removeEventListener('keyup',            this.pointerKeyUp,     false);
			document.removeEventListener('keypress',         this.pointerKeyPress,  false);

			this.sagePointerBtn.addEventListener('click',    this.startSagePointer, false);

			sagePointerDisabled();
		}
	};

	/**
	*
	* @method pointerPressMethod
	*/
	this.pointerPressMethod = function(event) {
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		this.wsio.emit('pointerPress', {button: btn});
		event.preventDefault();
	};

	/**
	*
	* @method pointerMoveMethod
	*/
	this.pointerMoveMethod = function(event) {
		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
		this.wsio.emit('ptm', {dx: Math.round(movementX * this.sensitivity), dy: Math.round(movementY * this.sensitivity)});
		event.preventDefault();
	};

	/**
	*
	* @method pointerReleaseMethod
	*/
	this.pointerReleaseMethod = function(event) {
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		this.wsio.emit('pointerRelease', {button: btn});
		event.preventDefault();
	};

	/**
	*
	* @method pointerDblClickMethod
	*/
	this.pointerDblClickMethod = function(event) {
		this.wsio.emit('pointerDblClick');
		event.preventDefault();
	};

	/**
	*
	* @method pointerScrollMethod
	*/
	this.pointerScrollMethod = function(event) {
		this.wsio.emit('pointerScrollStart');
		this.wsio.emit('pointerScroll', {wheelDelta: event.wheelDelta});
		event.preventDefault();
	};

	/**
	*
	* @method pointerScrollFFMethod
	*/
	this.pointerScrollFFMethod = function(event) {
		var wheelDelta = -120 * event.detail;
		this.wsio.emit('pointerScrollStart');
		this.wsio.emit('pointerScroll', {wheelDelta: wheelDelta});
		event.preventDefault();
	};

	/**
	*
	* @method pointerKeyDownMethod
	*/
	this.pointerKeyDownMethod = function(event) {
		var code = parseInt(event.keyCode);
		this.wsio.emit('keyDown', {code: code});
		// tab is a special case - no keypress event called (do we need to change code?)
		if (code  === 9) {
			this.wsio.emit('keyPress', {code: code, character: String.fromCharCode(code)});
		}
		// if a special key - prevent default (otherwise let continue to keyPress)
		if (code  === 8 || code  === 9 || (code >= 16 && code <= 46 && code !== 32) ||
				(code >= 91 && code <= 93) || (code >= 112 && code <= 145)) {
			event.preventDefault();
		}
	};

	/**
	*
	* @method pointerKeyUpMethod
	*/
	this.pointerKeyUpMethod = function(event) {
		var code = parseInt(event.keyCode);
		this.wsio.emit('keyUp', {code: code});
		event.preventDefault();
	};

	/**
	*
	* @method pointerKeyPressMethod
	*/
	this.pointerKeyPressMethod = function(event) {
		var code = parseInt(event.charCode);
		this.wsio.emit('keyPress', {code: code, character: String.fromCharCode(code)});
		event.preventDefault();
	};

	/**
	*
	* @method startScreenShareMethod
	*/
	this.startScreenShareMethod = function() {
		if (this.desktopCaptureEnabled === false) {
			alert("Cannot share screen: \"SAGE2 Screen Capture\" Extension not enabled.");
			return;
		}
		// start screen share
		window.postMessage('capture_desktop', '*');
	};

	/**
	*
	* @method captureDesktop
	*/
	this.captureDesktop = function(mediaSourceId) {
		var constraints = {chromeMediaSource: 'desktop', chromeMediaSourceId: mediaSourceId, maxWidth: 3840, maxHeight: 2160};
		navigator.getUserMedia({
			video: {mandatory: constraints, optional: []},
			audio: false
		}, this.streamSuccess, this.streamFail);
	};

	/**
	*
	* @method streamSuccessMethod
	*/
	this.streamSuccessMethod = function(stream) {
		console.log("media capture success!");

		this.screenShareBtn.disabled = true;
		this.mediaStream = stream;
		this.mediaStream.onended = this.streamEnded;
		this.mediaVideo.src = window.URL.createObjectURL(this.mediaStream);
		this.mediaVideo.play();
	};

	/**
	*
	* @method streamFailMethod
	*/
	this.streamFailMethod = function() {
		console.log("no access to media capture");
	};

	/**
	*
	* @method streamEndedMethod
	*/
	this.streamEndedMethod = function() {
		console.log("media stream ended");
		this.broadcasting = false;
		this.screenShareBtn.disabled = false;
		this.wsio.emit('stopMediaStream', {id: this.uniqueID + "|0"});
	};

	/**
	*
	* @method streamMetaDataMethod
	*/
	this.streamMetaDataMethod = function() {
		var widths = [
			Math.min(852, this.mediaVideo.videoWidth),
			Math.min(1280, this.mediaVideo.videoWidth),
			Math.min(1920, this.mediaVideo.videoWidth),
			this.mediaVideo.videoWidth
		];

		for (var i = 0; i < 4; i++) {
			var height = parseInt(widths[i] * this.mediaVideo.videoHeight / this.mediaVideo.videoWidth, 10);
			this.screenShareResolution.options[i].value = widths[i] + "x" + height;
		}

		var res = this.screenShareResolution.options[this.mediaResolution].value.split("x");
		this.mediaWidth  = parseInt(res[0], 10);
		this.mediaHeight = parseInt(res[1], 10);
		this.mediaCanvas.width  = this.mediaWidth;
		this.mediaCanvas.height = this.mediaHeight;

		var frame = this.captureMediaFrame();
		var raw = this.base64ToString(frame.split(",")[1]);
		this.wsio.emit('startNewMediaStream', {
			id: this.uniqueID + "|0",
			title: localStorage.SAGE2_ptrName + ": Shared Screen",
			src: raw, type: "image/jpeg", encoding: "binary",
			width: this.mediaVideo.videoWidth,
			height: this.mediaVideo.videoHeight
		});

		this.broadcasting = true;
	};

	/**
	*
	* @method captureMediaFrame
	*/
	this.captureMediaFrame = function() {
		this.mediaCtx.clearRect(0, 0, this.mediaWidth, this.mediaHeight);
		this.mediaCtx.drawImage(this.mediaVideo, 0, 0, this.mediaWidth, this.mediaHeight);
		return this.mediaCanvas.toDataURL("image/jpeg", (this.mediaQuality / 10));
	};

	/**
	*
	* @method sendMediaStreamFrame
	*/
	this.sendMediaStreamFrame = function() {
		if (this.broadcasting) {
			var frame = this.captureMediaFrame();
			var raw = this.base64ToString(frame.split(",")[1]);

			if (raw.length > this.chunk) {
				var nchunks = Math.ceil(raw.length / this.chunk);

				/*eslint-disable */
				function updateMediaStreamChunk(index, msg_chunk) { // jshint ignore:line
					setTimeout(function() {
						_this.wsio.emit('updateMediaStreamChunk', {id: _this.uniqueID + "|0",
							state: {src: msg_chunk, type: "image/jpeg", encoding: "binary"},
							piece: index, total: nchunks});
					}, 4);
				}
				/*eslint-enable */
				for (var i = 0; i < nchunks; i++) {
					var start = i * this.chunk;
					var end = (i + 1) * this.chunk < raw.length ? (i + 1) * this.chunk : raw.length;
					updateMediaStreamChunk(i, raw.substring(start, end));
				}
			} else {
				this.wsio.emit('updateMediaStreamFrame', {id: this.uniqueID + "|0", state: {src: raw,
					type: "image/jpeg", encoding: "binary"}});
			}
		}
	};

	/**
	*
	* @method changeScreenShareResolutionMethod
	*/
	this.changeScreenShareResolutionMethod = function() {
		this.mediaResolution = this.screenShareResolution.selectedIndex;
		if (this.screenShareResolution.options[this.mediaResolution].value) {
			var res = this.screenShareResolution.options[this.mediaResolution].value.split("x");
			this.mediaHeight = parseInt(res[0], 10);
			this.mediaWidth  = parseInt(res[1], 10);
			this.mediaCanvas.width  = this.mediaWidth;
			this.mediaCanvas.height = this.mediaHeight;
			console.log("media resolution: " + this.screenShareResolution.options[this.mediaResolution].value);
		}
	};

	/**
	*
	* @method changeScreenShareQualityMethod
	*/
	this.changeScreenShareQualityMethod = function() {
		this.mediaQuality = this.screenShareQuality.value;
		this.screenShareQualityIndicator.textContent = this.mediaQuality;
	};

	/**
	*
	* @method uploadFileToServerMethod
	*/
	this.uploadFileToServerMethod = function(event) {
		event.preventDefault();

		var dropX = 0.0;
		var dropY = 0.0;

		// Check if we are are a sageUI or a sagePointer
		if (event.target.id === "fileDropText") {
			// we are in sagePointer
			dropX = 0.0;
			dropY = 0.0;
		} else if (event.target.id === "winMgr") {
			// we are in sageUI
			dropX = event.offsetX / event.target.clientWidth;
			dropY = event.offsetY / event.target.clientHeight;
		}

		var files = event.dataTransfer.files;
		var url   = event.dataTransfer.getData("Url");
		var text  = event.dataTransfer.getData("Text");

		var total  = {};
		var loaded = {};
		var pc     = 0;

		function onProgress(evt) {
			if (!(evt.srcElement.id in total)) {
				total[evt.srcElement.id] = evt.total;
			}
			loaded[evt.srcElement.id] = evt.loaded;

			var totalSize = 0;
			var uploaded = 0;
			for (var key in total) {
				totalSize += total[key]; uploaded += loaded[key];
			}
			pc = Math.floor((uploaded / totalSize) * 100);
			_this.fileDropText.textContent = "File upload... " + pc.toString() + "%";
			// sagePointerApp has no progress bar
			if (_this.fileDropProgress !== null) {
				_this.fileDropProgress.value = pc;
			}
			if (pc === 100) {
				setTimeout(function() {
					if (pc === 100) {
						_this.fileDropText.textContent = "Drop multimedia files here";
						// sagePointerApp has no progress bar
						if (_this.fileDropProgress !== null) {
							_this.fileDropProgress.value = 0;
						}
					}
				}, 500);
			}
		}

		if (files.length > 0) {
			for (var i = 0; i < files.length; i++) {
				if (files[i].size <= this.maxUploadSize) {
					var formdata = new FormData();
					formdata.append("file" + i.toString(), files[i]);
					formdata.append("dropX", dropX);
					formdata.append("dropY", dropY);

					var xhr = new XMLHttpRequest();
					xhr.open("POST", "upload", true);
					xhr.upload.id = "file" + i.toString();
					xhr.upload.addEventListener('progress', onProgress);
					xhr.send(formdata);
				} else {
					alert("File: " + files[i].name + " is too large (max size is " +
						(this.maxUploadSize / (1024 * 1024 * 1024)) + " GB)");
				}
			}
		} else if (url !== null || text !== null) {
			var dataUrl;
			if (url === null) {
				dataUrl = text;
			} else if (text === null) {
				dataUrl = url;
			} else {
				dataUrl = (url.length > text.length) ? url : text;
			}
			var mimeType = "";
			var youtube  = dataUrl.indexOf("www.youtube.com");
			var ext      = dataUrl.substring(dataUrl.lastIndexOf('.') + 1);
			if (ext.length > 4) {
				ext = ext.substring(0, 4);
			}
			ext = ext.toLowerCase();
			if (youtube >= 0) {
				mimeType = "video/youtube";
			} else if (ext === "jpg" || ext === "jpeg") {
				mimeType = "image/jpeg";
			} else if (ext === "png") {
				mimeType  = "image/png";
			} else if (ext === "mp4") {
				mimeType  = "video/mp4";
			} else if (ext === "m4v") {
				mimeType  = "video/mp4";
			} else if (ext === "webm") {
				mimeType = "video/webm";
			} else if (ext === "pdf") {
				mimeType  = "application/pdf";
			}
			if (mimeType !== "") {
				this.wsio.emit('addNewWebElement', {type: mimeType, url: dataUrl, position: [dropX, dropY]});
			}
		}
	};


	/**
	*
	* @method base64ToString
	*/
	this.base64ToString = function(base64) {
		return atob(base64);
	};

	// convert class methods to functions (to be used as callbacks)
	this.preventDefault              = this.preventDefaultMethod.bind(this);
	this.uploadFileToServer          = this.uploadFileToServerMethod.bind(this);
	this.startSagePointer            = this.startSagePointerMethod.bind(this);
	this.startScreenShare            = this.startScreenShareMethod.bind(this);
	this.changeScreenShareResolution = this.changeScreenShareResolutionMethod.bind(this);
	this.changeScreenShareQuality    = this.changeScreenShareQualityMethod.bind(this);
	this.pointerLockChange           = this.pointerLockChangeMethod.bind(this);
	this.pointerPress                = this.pointerPressMethod.bind(this);
	this.pointerMove                 = this.pointerMoveMethod.bind(this);
	this.pointerRelease              = this.pointerReleaseMethod.bind(this);
	this.pointerDblClick             = this.pointerDblClickMethod.bind(this);
	this.pointerScroll               = this.pointerScrollMethod.bind(this);
	this.pointerScrollFF             = this.pointerScrollFFMethod.bind(this);
	this.pointerKeyDown              = this.pointerKeyDownMethod.bind(this);
	this.pointerKeyUp                = this.pointerKeyUpMethod.bind(this);
	this.pointerKeyPress             = this.pointerKeyPressMethod.bind(this);
	this.streamSuccess               = this.streamSuccessMethod.bind(this);
	this.streamFail                  = this.streamFailMethod.bind(this);
	this.streamEnded                 = this.streamEndedMethod.bind(this);
	this.streamMetaData              = this.streamMetaDataMethod.bind(this);

	// Event Listeners
	window.addEventListener('dragover', this.preventDefault, false);
	window.addEventListener('dragend',  this.preventDefault, false);
	window.addEventListener('drop',     this.preventDefault, false);

	this.fileDrop.addEventListener('dragover', this.preventDefault,     false);
	this.fileDrop.addEventListener('dragend',  this.preventDefault,     false);
	this.fileDrop.addEventListener('drop',     this.uploadFileToServer, false);

	if (this.windowManager) {
		// Not all sagePointer have a windowManager
		this.windowManager.addEventListener('dragover', this.preventDefault,     false);
		this.windowManager.addEventListener('dragend',  this.preventDefault,     false);
		this.windowManager.addEventListener('drop',     this.uploadFileToServer, false);
	}

	this.sagePointerBtn.addEventListener('click', this.startSagePointer, false);
	this.screenShareBtn.addEventListener('click', this.startScreenShare, false);

	this.screenShareResolution.addEventListener('change', this.changeScreenShareResolution, false);
	this.screenShareQuality.addEventListener('change',    this.changeScreenShareQuality,    false);

	document.addEventListener('pointerlockchange',       this.pointerLockChange, false);
	// redudant here (webkit)
	// document.addEventListener('mozpointerlockchange',    this.pointerLockChange, false);
	// document.addEventListener('webkitpointerlockchange', this.pointerLockChange, false);

	this.mediaVideo.addEventListener('loadedmetadata', this.streamMetaData, false);

}
