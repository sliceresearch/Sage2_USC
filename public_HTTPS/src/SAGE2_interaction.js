// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

function SAGE2_interaction(wsio) {
	this.wsio = wsio;
	this.uniqueID = null;
	this.sensitivity = null;
	this.fileUploadProgress = null;
	this.fileUploadComplete = null;
	this.mediaStream = null;
	this.mediaVideo = null;
	this.mediaResolution = 3;
	this.mediaQuality = 5;
	this.desktopCaptureEnabled = false;
	this.broadcasting = false;
	this.chunk = 32 * 1024; // 32 KB
	this.maxUploadSize = 2 * (1024*1024*1024); // 2GB just as a precaution
	
	if(localStorage.SAGE2_ptrName  === undefined || localStorage.SAGE2_ptrName  === null) localStorage.SAGE2_ptrName  = "Default";
	if(localStorage.SAGE2_ptrColor === undefined || localStorage.SAGE2_ptrColor === null) localStorage.SAGE2_ptrColor = "#B4B4B4";
	
	document.getElementById('sage2PointerLabel').value = localStorage.SAGE2_ptrName;
	document.getElementById('sage2PointerColor').value = localStorage.SAGE2_ptrColor;
	
	this.setInteractionId = function(id) {
		this.uniqueID = id;
	};
	
	this.setPointerSensitivity = function(value) {
		this.sensitivity = value;
	};
	
	this.setFileUploadProgressCallback = function(callback) {
		this.fileUploadProgress = callback;
	};
	
	this.setFileUploadCompleteCallback = function(callback) {
		this.fileUploadComplete = callback;
	};
	
	this.uploadFiles = function(files, dropX, dropY) {
		var _this = this;
		var loaded = {};
		var filesFinished = 0;
		var total = 0;

		for(var i=0; i<files.length; i++){
			if(files[i].size <= this.maxUploadSize){
				var formdata = new FormData();
				formdata.append("file"+i.toString(), files[i]);
				xhr = new XMLHttpRequest();
				xhr.open("POST", "upload", true);
				xhr.upload.id = "file"+i.toString();
				xhr.upload.addEventListener('progress', function(event) {
					if(loaded[event.srcElement.id] === undefined) total += event.total;
					loaded[event.srcElement.id] = event.loaded;
					var uploaded = 0;
					for(var key in loaded) uploaded += loaded[key];
					var pc = uploaded/total;
					if(_this.fileUploadProgress) _this.fileUploadProgress(pc);
				}, false);
				xhr.addEventListener('load', function(event) {
					filesFinished++;
					if(_this.fileUploadComplete && filesFinished === files.length) _this.fileUploadComplete();
				}, false);
				xhr.send(formdata);
			}
			else{
				alert("File: " + files[i].name + " is too large (max size is " + (this.maxUploadSize / (1024*1024)) + " MB)");
			}
		}
	};
	
	this.uploadURL = function(url, dropX, dropY) {
		var mimeType = "";
		var youtube  = url.indexOf("www.youtube.com");
		var ext      = url.substring(url.lastIndexOf('.')+1);
		if(ext.length > 4) ext = ext.substring(0, 4);
		if(ext.length === 4 && (ext[3] === '?' || ext[3] === '#')) ext = ext.substring(0, 3);
		ext = ext.toLowerCase();
		if (youtube >= 0)       mimeType = "video/youtube";
		else if(ext === "jpg")  mimeType = "image/jpeg";
		else if(ext === "jpeg") mimeType = "image/jpeg";
		else if(ext === "png")  mimeType = "image/png";
		else if(ext === "mp4")  mimeType = "video/mp4";
		else if(ext === "m4v")  mimeType = "video/mp4";
		else if(ext === "webm") mimeType = "video/webm";
		else if(ext === "pdf")  mimeType = "application/pdf";
		console.log("URL: " + url + ", type: " + mimeType);

		if (mimeType !== "") this.wsio.emit('addNewWebElement', {type: mimeType, url: url});
	};
	
	this.startSAGE2Pointer = function(buttonId) {
		if(hasMouse) {
			var button = document.getElementById(buttonId);
			button.requestPointerLock = button.requestPointerLock       || 
										button.mozRequestPointerLock    || 
										button.webkitRequestPointerLock;
		
			// Ask the browser to lock the pointer
			button.requestPointerLock();
		}
		else {
			console.log("No mouse detected - entering touch interface for SAGE2 Pointer");
		}
	};
	
	this.pointerLockChangeMethod = function() {
		var pointerLockElement = document.pointerLockElement       ||
								 document.mozPointerLockElement    ||
								 document.webkitPointerLockElement;
		
		// disable SAGE2 Pointer
		if(pointerLockElement === null) {
			this.wsio.emit('stopSagePointer');
			
			document.removeEventListener('mousedown',  this.pointerPress,     false);
			document.removeEventListener('mousemove',  this.pointerMove,      false);
			document.removeEventListener('mouseup',    this.pointerRelease,   false);
			document.removeEventListener('dblclick',   this.pointerDblClick,  false);
			document.removeEventListener('mousewheel', this.pointerScroll,    false);
			document.removeEventListener('keydown',    this.pointerKeyDown,   false);
			document.removeEventListener('keyup',      this.pointerKeyUp,     false);
			document.removeEventListener('keypress',   this.pointerKeyPress,  false);
			
			document.addEventListener('click', pointerClick, false);
			
			sagePointerDisabled();
		}
		// enable SAGE2 Pointer
		else {
			this.wsio.emit('startSagePointer', {label: localStorage.SAGE2_ptrName, color: localStorage.SAGE2_ptrColor});
			
			document.addEventListener('mousedown',  this.pointerPress,     false);
			document.addEventListener('mousemove',  this.pointerMove,      false);
			document.addEventListener('mouseup',    this.pointerRelease,   false);
			document.addEventListener('dblclick',   this.pointerDblClick,  false);
			document.addEventListener('mousewheel', this.pointerScroll,    false);
			document.addEventListener('keydown',    this.pointerKeyDown,   false);
			document.addEventListener('keyup',      this.pointerKeyUp,     false);
			document.addEventListener('keypress',   this.pointerKeyPress,  false);
			
			document.removeEventListener('click', pointerClick, false);
			
			sagePointerEnabled();
		}
	};
	
	this.startScreenShare = function() {
		if(this.desktopCaptureEnabled === false) {
			alert("Cannot share screen: \"SAGE2 Screen Capture\" Extension not enabled.");
			return;
		}
		
		// start screen share
		window.postMessage('capture_desktop', '*');
	};
	
	this.captureDesktop = function(mediaSourceId) {
		var constraints = {chromeMediaSource: 'desktop', chromeMediaSourceId: mediaSourceId, maxWidth: 3840, maxHeight: 2160};
		navigator.getUserMedia({video: {mandatory: constraints, optional: []}, audio: false}, this.streamSuccess, this.streamFail);
	};
	
	this.streamSuccessMethod = function(stream) {
		console.log("media capture success!");
		
		// TODO: must disable screen share button
		
		this.mediaStream = stream;
		this.mediaStream.onended = this.streamEnded;
		
		var mediaVideo = document.getElementById('mediaVideo');
		mediaVideo.src = window.URL.createObjectURL(this.mediaStream);
		mediaVideo.play();
	};
	
	this.streamFailMethod = function(event) {
		console.log("no access to media capture");
	};
	
	this.streamEndedMethod = function(event) {
		console.log("media stream ended");
		this.broadcasting = false;
		// TODO: must re-enable screen share button
		this.wsio.emit('stopMediaStream', {id: this.uniqueID+"|0"});
	};
	
	this.streamMetaDataMethod = function(event) {
		var screenShareResolution = document.getElementById('screenShareResolution');
		var mediaVideo = document.getElementById('mediaVideo');
		var mediaCanvas = document.getElementById('mediaCanvas');
	
		var widths = [Math.min( 852, mediaVideo.videoWidth), 
					  Math.min(1280, mediaVideo.videoWidth), 
					  Math.min(1920, mediaVideo.videoWidth), 
					  mediaVideo.videoWidth];
		
		var screenShareResolution = document.getElementById('screenShareResolution');
		for(var i=0; i<4; i++){
			var height = parseInt(widths[i] * mediaVideo.videoHeight/mediaVideo.videoWidth, 10);
			screenShareResolution.options[i].value = widths[i] + "x" + height;
		}
		
		var res = screenShareResolution.options[this.mediaResolution].value.split("x");
		mediaCanvas.width  = parseInt(res[0], 10);
		mediaCanvas.height = parseInt(res[1], 10);
		
		var frame = this.captureMediaFrame();
		var raw = atob(frame.split(",")[1]); // base64 to string
		this.wsio.emit('startNewMediaStream', {id: this.uniqueID+"|0", title: localStorage.SAGE2_ptrName+": Shared Screen", src: raw, type: "image/jpeg", encoding: "binary", width: mediaVideo.videoWidth, height: mediaVideo.videoHeight});

		this.broadcasting = true;
	};
	
	this.captureMediaFrame = function() {
		var mediaVideo = document.getElementById('mediaVideo');
		var mediaCanvas = document.getElementById('mediaCanvas');
		var mediaCtx = mediaCanvas.getContext('2d');
		
		mediaCtx.clearRect(0, 0, mediaCanvas.width, mediaCanvas.height);
		mediaCtx.drawImage(mediaVideo, 0, 0, mediaCanvas.width, mediaCanvas.height);
		return mediaCanvas.toDataURL("image/jpeg", (this.mediaQuality/10));
	};
	
	this.sendMediaStreamFrame = function() {
		if(this.broadcasting){
			var frame = this.captureMediaFrame();
			var raw = atob(frame.split(",")[1]);  // base64 to string
			
			if(raw.length > this.chunk){
				var _this = this;
				var nchunks = Math.ceil(raw.length / this.chunk);
				
				for(var i=0; i<nchunks; i++){
					function updateMediaStreamChunk(index, msg_chunk){
						setTimeout(function() {
							_this.wsio.emit('updateMediaStreamChunk', {id: _this.uniqueID+"|0", state: {src: msg_chunk, type:"image/jpeg", encoding: "binary"}, piece: index, total: nchunks});
						}, 4);
					}
					var start = i*this.chunk;
					var end = (i+1)*this.chunk < raw.length ? (i+1)*this.chunk : raw.length;
					updateMediaStreamChunk(i, raw.substring(start, end));
				}
			}
			else{
				this.wsio.emit('updateMediaStreamFrame', {id: this.uniqueID+"|0", state: {src: raw, type:"image/jpeg", encoding: "binary"}});
			}
		}
	};
	
	this.pointerPressMethod = function(event) {
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		this.wsio.emit('pointerPress', {button: btn});
		event.preventDefault();
	};
	
	this.pointerMoveMethod = function(event) {
		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		this.wsio.emit('pointerMove', {deltaX: Math.round(movementX*this.sensitivity), deltaY: Math.round(movementY*this.sensitivity)});	
		event.preventDefault();
	};
	
	this.pointerReleaseMethod = function(event) {
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		this.wsio.emit('pointerRelease', {button: btn});
		event.preventDefault();
	};
	
	this.pointerDblClickMethod = function(event) {
		this.wsio.emit('pointerDblClick');
		event.preventDefault();
	};
	
	this.pointerScrollMethod = function(event) {
		this.wsio.emit('pointerScrollStart');
		this.wsio.emit('pointerScroll', {wheelDelta: event.wheelDelta});
		event.preventDefault();
	};
	
	this.pointerKeyDownMethod = function(event) {
		var code = parseInt(event.keyCode, 10);
		// exit if 'esc' key
		if(code === 27) {
			document.exitPointerLock();
			event.preventDefault();
		}
		else {
			this.wsio.emit('keyDown', {code: code});
			if(code == 9){ // tab is a special case - must emulate keyPress event
				this.wsio.emit('keyPress', {code: code, character: String.fromCharCode(code)});
			}
			// if a special key - prevent default (otherwise let continue to keyPress)
			if(code == 8 || code == 9 || (code >= 16 && code <= 46 && code != 32) ||  (code >=91 && code <= 93) || (code >= 112 && code <= 145)){
				event.preventDefault();
			}
		}
	};
	
	this.pointerKeyUpMethod = function(event) {
		var code = parseInt(event.keyCode, 10);
		if(code !== 27) {
			this.wsio.emit('keyUp', {code: code});
		}
		event.preventDefault();
	};
	
	
	this.pointerKeyPressMethod = function(event) {
		var code = parseInt(event.charCode, 10);
		this.wsio.emit('keyPress', {code: code, character: String.fromCharCode(code)});
		event.preventDefault();
	};
	
	
	this.changeSage2PointerLabelMethod = function(event) {
		localStorage.SAGE2_ptrName = event.srcElement.value;
	};
	
	this.changeSage2PointerColorMethod = function(event) {
		localStorage.SAGE2_ptrColor = event.srcElement.value;
	};
	
	this.changeScreenShareResolutionMethod = function(event) {
		if(event.srcElement.options[event.srcElement.selectedIndex].value) {
			this.mediaResolution = event.srcElement.selectedIndex;
			var res = event.srcElement.options[this.mediaResolution].value.split("x");
			var mediaCanvas = document.getElementById('mediaCanvas');
			mediaCanvas.width  = parseInt(res[0], 10);
			mediaCanvas.height = parseInt(res[1], 10);
			console.log("media resolution: " + event.srcElement.options[this.mediaResolution].value);
		}
	};
	
	this.changeScreenShareQualityMethod = function(event) {
		this.mediaQuality = event.srcElement.value;
		document.getElementById('screenShareQualityIndicator').textContent = this.mediaQuality;
	};
	
	this.streamSuccess               = this.streamSuccessMethod.bind(this);
	this.streamFail                  = this.streamFailMethod.bind(this);
	this.streamEnded                 = this.streamEndedMethod.bind(this);
	this.streamMetaData              = this.streamMetaDataMethod.bind(this);
	
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
	
	
	document.addEventListener('pointerlockchange',       this.pointerLockChange, false);
	
	document.getElementById('sage2PointerLabel').addEventListener('input',      this.changeSage2PointerLabel,     false);
	document.getElementById('sage2PointerColor').addEventListener('input',      this.changeSage2PointerColor,     false);
	document.getElementById('screenShareResolution').addEventListener('change', this.changeScreenShareResolution, false);
	document.getElementById('screenShareQuality').addEventListener('input',     this.changeScreenShareQuality,    false);
	
	document.getElementById('mediaVideo').addEventListener('loadedmetadata',    this.streamMetaData,              false);
}