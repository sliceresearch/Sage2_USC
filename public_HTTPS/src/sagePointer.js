// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

function sagePointer(wsio) {
	this.wsio = wsio;
	
	this.uniqueID = null;
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
	
	this.mediaVideo         = document.getElementById('mediaVideo');
	this.mediaCanvas        = document.getElementById('mediaCanvas');
	this.mediaCtx           = this.mediaCanvas.getContext('2d');
	this.mediaResolution    = this.screenShareResolution.options[this.screenShareResolution.selectedIndex].value;
	this.mediaQuality       = this.screenShareQuality.value;
	this.mediaHeight        = Math.min(this.mediaResolution, screen.height);
	this.mediaWidth         = screen.width/screen.height * this.mediaHeight;
	this.mediaCanvas.width  = this.mediaWidth;
	this.mediaCanvas.height = this.mediaHeight;
	this.broadcasting       = false;
	this.desktopId          = null;
	
	this.chunk = 32 * 1024; // 32 KB
	//this.maxUploadSize = 500 * (1024*1024); // 500 MB
	this.maxUploadSize = 2 * (1024*1024*1024); // 2GB just as a precaution

	if(localStorage.SAGE2_ptrName  === undefined || localStorage.SAGE2_ptrName  === null) localStorage.SAGE2_ptrName  = "Default";
	if(localStorage.SAGE2_ptrColor === undefined || localStorage.SAGE2_ptrColor === null) localStorage.SAGE2_ptrColor = "#B4B4B4";
	
	this.sagePointerLabel.value = localStorage.SAGE2_ptrName;
	this.sagePointerColor.value = localStorage.SAGE2_ptrColor;
	
	var _this = this;
	
	this.frameExtractor = new webgl_texture2buffer();
	this.DXT1unfinished;
	this.DXT1frame;
	this.streamId;
	this.dxt1ByteSize = 0;
	this.workerCount = 0;
	this.rgba2dxt1_worker1 = new Worker('src/rgba2dxt1_worker.js');
	this.rgba2dxt1_worker1.addEventListener('message', function(e) {
		if(e.data instanceof ArrayBuffer){
			var startIdx = 3*_this.dxt1ByteSize/4;
			_this.receivedCompressedImagePortion(new Uint8Array(e.data), startIdx);
		}
	}, false);
	
	this.rgba2dxt1_worker2 = new Worker('src/rgba2dxt1_worker.js');
	this.rgba2dxt1_worker2.addEventListener('message', function(e) {
		if(e.data instanceof ArrayBuffer){
			var startIdx = 2*_this.dxt1ByteSize/4;
			_this.receivedCompressedImagePortion(new Uint8Array(e.data), startIdx);
		}
	}, false);
	
	this.rgba2dxt1_worker3 = new Worker('src/rgba2dxt1_worker.js');
	this.rgba2dxt1_worker3.addEventListener('message', function(e) {
		if(e.data instanceof ArrayBuffer){
			var startIdx = _this.dxt1ByteSize/4;
			_this.receivedCompressedImagePortion(new Uint8Array(e.data), startIdx);
		}
	}, false);
	
	this.rgba2dxt1_worker4 = new Worker('src/rgba2dxt1_worker.js');
	this.rgba2dxt1_worker4.addEventListener('message', function(e) {
		if(e.data instanceof ArrayBuffer){
			var startIdx = 0;
			_this.receivedCompressedImagePortion(new Uint8Array(e.data), startIdx);
		}
	}, false);

	// Capture the changes in the pointer name
	this.sagePointerLabel.addEventListener('input', function(evt) {
		localStorage.SAGE2_ptrName  = _this.sagePointerLabel.value;
	});

	// Capture the changes in the pointer color
	this.sagePointerColor.addEventListener('change', function(evt) {
		localStorage.SAGE2_ptrColor = _this.sagePointerColor.value;
	});

	this.setPointerId = function(id) {
		this.uniqueID = id;
		
		var streamIdStr = this.uniqueID + "|0";
		this.streamId = new Uint8Array(streamIdStr.length);
		for(var i=0; i<this.streamId.length; i++){
			this.streamId[i] = streamIdStr.charCodeAt(i);
		}
	};
	
	this.setPointerSensitivity = function(value) {
		this.sensitivity = value;
	};
	
	this.preventDefaultMethod = function(event) {
		event.preventDefault();
	};
	
	this.startSagePointerMethod = function(event) {
		this.sagePointerBtn.requestPointerLock = this.sagePointerBtn.requestPointerLock       || 
												 this.sagePointerBtn.mozRequestPointerLock    || 
												 this.sagePointerBtn.webkitRequestPointerLock;

		// Ask the browser to lock the pointer
		this.sagePointerBtn.requestPointerLock();
	};
	
	this.pointerLockChangeMethod = function() {
		if(document.pointerLockElement === this.sagePointerBtn ||  document.mozPointerLockElement === this.sagePointerBtn || document.webkitPointerLockElement === this.sagePointerBtn){
			console.log("pointer lock enabled");
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
		}
		else{
			console.log("pointer lock disabled");
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
	
	this.pointerPressMethod = function(event) {
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		this.wsio.emit('pointerPress', {button:btn});
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
		this.wsio.emit('pointerRelease', {button:btn});
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

	this.pointerScrollFFMethod = function(event) {
		var wheelDelta = -120*event.detail;
		this.wsio.emit('pointerScrollStart');
		this.wsio.emit('pointerScroll', {wheelDelta: wheelDelta});
		event.preventDefault();
	};

	this.pointerKeyDownMethod = function(event) {
		var code = parseInt(event.keyCode);
		this.wsio.emit('keyDown', {code: code});
		if(code == 9){ // tab is a special case - no keypress event called (do we need to change code?)
			this.wsio.emit('keyPress', {code: code, character: String.fromCharCode(code)});
		}
		// if a special key - prevent default (otherwise let continue to keyPress)
		if(code == 8 || code == 9 || (code >= 16 && code <= 46 && code != 32) ||  (code >=91 && code <= 93) || (code >= 112 && code <= 145)){
			event.preventDefault();
		}
	};

	this.pointerKeyUpMethod = function(event) {
		var code = parseInt(event.keyCode);
		this.wsio.emit('keyUp', {code: code});
		event.preventDefault();
	};

	this.pointerKeyPressMethod = function(event) {
		var code = parseInt(event.charCode);
		this.wsio.emit('keyPress', {code: code, character: String.fromCharCode(code)});
		event.preventDefault();
	};
	
	this.startScreenShareMethod = function(event) {
		// start screen share
		this.screenShareBtn.disabled = true;
		
		var streamWidth  = Math.min(screen.width, 1280);
		var streamHeight = parseInt(streamWidth * screen.height/screen.width);
		var constraints = {chromeMediaSource: 'screen', maxWidth: streamWidth, maxHeight: streamHeight}; // Screen Capture
		navigator.getUserMedia({video: {mandatory: constraints, optional: []}, audio: false}, this.streamSuccess, this.streamFail);
		
		/*
		// current chrome desktop capture via getUserMedia
		var streamHeight = Math.min(1080, screen.height);
		var streamWidth = screen.width/screen.height * streamHeight;

		var constraints = {chromeMediaSource: 'screen', maxWidth: streamWidth, maxHeight: streamHeight};
		navigator.getUserMedia({video: {mandatory: constraints, optional: []}, audio: false}, this.streamSuccess, this.streamFail);
		*/
		
		// future chrome desktop capture via extension
		//this.desktopId = chrome.desktopCapture.chooseDesktopMedia(["screen"], this.onAccessApproved);
	};
	
	this.onAccessApprovedMethod = function(chromeMediaSourceId) {
		if (!chromeMediaSourceId) {
            this.streamFailMethod();
            return;
        }
        
        var streamHeight = Math.min(1080, screen.height);
		var streamWidth = screen.width/screen.height * streamHeight;
		
        var constraints = {chromeMediaSource: 'desktop', maxWidth: streamWidth, maxHeight: streamHeight};
		navigator.getUserMedia({video: {mandatory: constraints, optional: []}, audio: false}, this.streamSuccess, this.streamFail);
	};
	
	this.streamSuccessMethod = function(stream) {
		console.log("media capture success!");

		this.mediaStream = stream;
		this.mediaStream.onended = this.streamEnded;
		
		this.mediaVideo = document.createElement('video');
		this.mediaVideo.addEventListener('loadedmetadata', this.streamMetaData, false);
		this.mediaVideo.src = window.URL.createObjectURL(this.mediaStream);
		this.mediaVideo.play();
		
		/*
		var frame = this.captureMediaFrame();
		var raw = this.base64ToString(frame.split(",")[1]);
		
		wsio.emit('sage2Log', {app: "", message: "Screen To JPEG:   " + Date.now()});
		
		//this.wsio.emit('startNewMediaStream', {id: this.uniqueID+"|0", title: localStorage.SAGE2_ptrName+": Shared Screen", src: raw, type: "image/jpeg", encoding: "binary", width: screen.width, height: screen.height});
		this.wsio.emit('startNewMediaStream', {id: this.uniqueID+"|0", title: localStorage.SAGE2_ptrName+": Shared Screen", src: raw, type: "image/png", encoding: "binary", width: screen.width, height: screen.height});
		*/
		
		this.broadcasting = true;
	};

	this.streamFailMethod = function() {
		console.log("no access to media capture");
	};
	
	this.streamEndedMethod = function(e) {
		console.log("media stream ended");
		this.broadcasting = false;
		this.screenShareBtn.disabled = false;
		this.wsio.emit('stopMediaStream', {id: this.uniqueID+"|0"});
	};
	
	this.streamMetaDataMethod = function(event) {
		console.log("meta data");
		console.log("starting media stream: " + this.mediaVideo.videoWidth + "x" + this.mediaVideo.videoHeight);
		
		var dxt1Width  = this.mediaVideo.videoWidth  - (this.mediaVideo.videoWidth  %  4);
		var dxt1Height = this.mediaVideo.videoHeight - (this.mediaVideo.videoHeight % 16);
		this.dxt1ByteSize = dxt1Width * dxt1Height * 0.5;
		
		this.DXT1unfinished = new Uint8Array(this.dxt1ByteSize);
		this.DXT1frame      = new Uint8Array(this.dxt1ByteSize);
		this.wsio.emit('startNewMediaStream', {id: this.uniqueID+"|0", title: localStorage.SAGE2_ptrName+": Shared Screen", width: dxt1Width, height: dxt1Height});
		
		this.frameExtractor.init(this.mediaVideo.videoWidth, this.mediaVideo.videoHeight);
		this.rgba2dxt1_worker1.postMessage({cmd: "setParams", width: dxt1Width, height: dxt1Height/4});
		this.rgba2dxt1_worker2.postMessage({cmd: "setParams", width: dxt1Width, height: dxt1Height/4});
		this.rgba2dxt1_worker3.postMessage({cmd: "setParams", width: dxt1Width, height: dxt1Height/4});
		this.rgba2dxt1_worker4.postMessage({cmd: "setParams", width: dxt1Width, height: dxt1Height/4});
		
		this.extractFrameMethod();
		
		/*
		this.textureViewer.init("dxt1_v", dxt1Width, dxt1Height, function() {
			dxt1 = new Uint8Array(dxt1ByteSize);
			
			textureViewer.initTexture(dxt1, dxt1Width, dxt1Height);
			textureViewer.draw();
			frameStart = Date.now();
		
			frameExtractor.init(mediaVideo.videoWidth, mediaVideo.videoHeight);
			extractFrame();
		});
		*/
	};
	
	this.extractFrameMethod = function() {
		this.frameExtractor.updateTextureWithElement(this.mediaVideo);
		
		var width  = this.frameExtractor.width  - (this.frameExtractor.width  %  4);
		var height = this.frameExtractor.height - (this.frameExtractor.height % 16);
		var rgba1 = this.frameExtractor.extractRGBA(0,          0, width, height/4);
		var rgba2 = this.frameExtractor.extractRGBA(0,   height/4, width, height/4);
		var rgba3 = this.frameExtractor.extractRGBA(0, 2*height/4, width, height/4);
		var rgba4 = this.frameExtractor.extractRGBA(0, 3*height/4, width, height/4);
		
		this.rgba2dxt1_worker1.postMessage(rgba1.buffer, [rgba1.buffer]);
		this.rgba2dxt1_worker1.postMessage({cmd: "start"});
		this.rgba2dxt1_worker2.postMessage(rgba2.buffer, [rgba2.buffer]);
		this.rgba2dxt1_worker2.postMessage({cmd: "start"});
		this.rgba2dxt1_worker3.postMessage(rgba3.buffer, [rgba3.buffer]);
		this.rgba2dxt1_worker3.postMessage({cmd: "start"});
		this.rgba2dxt1_worker4.postMessage(rgba4.buffer, [rgba4.buffer]);
		this.rgba2dxt1_worker4.postMessage({cmd: "start"});
	};
	
	this.receivedCompressedImagePortion = function(data, startIdx) {
		this.DXT1unfinished.set(data, startIdx);
		
		this.workerCount++;
		if(this.workerCount === 4){
			this.workerCount = 0;
			
			this.DXT1frame.set(this.DXT1unfinished, 0);
		
			if(this.broadcasting === true) setTimeout(this.extractFrame, 4);
		}
	};
	
	this.captureMediaFrame = function() {
		this.mediaCtx.clearRect(0, 0, this.mediaWidth, this.mediaHeight);
		this.mediaCtx.drawImage(mediaVideo, 0, 0, this.mediaWidth, this.mediaHeight);
		//return this.mediaCanvas.toDataURL("image/jpeg", (this.mediaQuality/10));
		return this.mediaCanvas.toDataURL("image/png");
	};
	
	this.sendMediaStreamFrame = function() {
		if(this.broadcasting){
			this.wsio.emit('updateMediaStreamFrame', Uint8Concat(this.streamId, this.DXT1frame));
			
			/*
			wsio.emit('sage2Log', {app: "", message: "START:            " + Date.now()});
			
			var frame = this.captureMediaFrame();
			var raw = this.base64ToString(frame.split(",")[1]);
			
			wsio.emit('sage2Log', {app: "", message: "Screen To JPEG:   " + Date.now()});
			
			if(raw.length > this.chunk){
				var _this = this;
				var nchunks = Math.ceil(raw.length / this.chunk);
				
				for(var i=0; i<nchunks; i++){
					function updateMediaStreamChunk(index, msg_chunk){
						setTimeout(function() {
							//_this.wsio.emit('updateMediaStreamChunk', {id: _this.uniqueID+"|0", state: {src: msg_chunk, type:"image/jpeg", encoding: "binary"}, piece: index, total: nchunks});
							_this.wsio.emit('updateMediaStreamChunk', {id: _this.uniqueID+"|0", state: {src: msg_chunk, type:"image/png", encoding: "binary"}, piece: index, total: nchunks});
						}, 4);
					}
					var start = i*this.chunk;
					var end = (i+1)*this.chunk < raw.length ? (i+1)*this.chunk : raw.length;
					updateMediaStreamChunk(i, raw.substring(start, end));
				}
			}
			else{
				//this.wsio.emit('updateMediaStreamFrame', {id: this.uniqueID+"|0", state: {src: raw, type:"image/jpeg", encoding: "binary"}});
				this.wsio.emit('updateMediaStreamFrame', {id: this.uniqueID+"|0", state: {src: raw, type:"image/png", encoding: "binary"}});
			}
			*/
		}
	};
	
	this.changeScreenShareResolutionMethod = function(event) {
		this.mediaResolution = parseInt(this.screenShareResolution.options[this.screenShareResolution.selectedIndex].value);
		this.mediaHeight = Math.min(this.mediaResolution, screen.height);
		this.mediaWidth  = screen.width/screen.height * this.mediaHeight;
		this.mediaCanvas.width  = this.mediaWidth;
		this.mediaCanvas.height = this.mediaHeight;
		console.log("media resolution: " + this.mediaResolution);
	};

	this.changeScreenShareQualityMethod = function(event) {
		this.mediaQuality = this.screenShareQuality.value;
		this.screenShareQualityIndicator.textContent = this.mediaQuality;
	};
	
	this.uploadFileToServerMethod = function(event) {
		event.preventDefault();

		var files = event.dataTransfer.files;
		var url   = event.dataTransfer.getData("Url");
		var text  = event.dataTransfer.getData("Text");
		if (files.length > 0) {
			var _this  = this;
			var total  = {};
			var loaded = {};
			var pc     = 0;

			for(var i=0; i<files.length; i++){
				if(files[i].size <= this.maxUploadSize){
					var formdata = new FormData();
					formdata.append("file"+i.toString(), files[i]);

					xhr = new XMLHttpRequest();
					xhr.open("POST", "upload", true);
					xhr.upload.id = "file"+i.toString();
					xhr.upload.addEventListener('progress', function(event) {
						if(!(event.srcElement.id in total)){
							total[event.srcElement.id] = event.total;
						}
						loaded[event.srcElement.id] = event.loaded;

						var totalSize = 0;
						var uploaded = 0;
						for(var key in total){ totalSize += total[key]; uploaded += loaded[key]; }
						pc = Math.floor((uploaded/totalSize) * 100);
						_this.fileDropText.textContent = "File upload... " + pc.toString() + "%";
						_this.fileDropProgress.value = pc;
						if(pc == 100){
							setTimeout(function() {
								if (pc == 100) {
									_this.fileDropText.textContent = "Drop multimedia files here";
									_this.fileDropProgress.value = 0;
								}
							}, 500);
						}
					}, false);
					xhr.send(formdata);
				}
				else{
					alert("File: " + files[i].name + " is too large (max size is " + (this.maxUploadSize / (1024*1024)) + " MB)");
				}
			}
		}
		else if(url !== null || text !== null){
			var dataUrl;
			if (url === null) dataUrl = text;
			else if (text === null) dataUrl = url;
			else dataUrl = (url.length > text.length) ? url : text;
			var mimeType = "";
			var youtube  = dataUrl.indexOf("www.youtube.com");
			var ext      = dataUrl.substring(dataUrl.lastIndexOf('.')+1);
			if(ext.length > 4) ext = ext.substring(0,4);
			ext = ext.toLowerCase();
			if (youtube >= 0) mimeType = "video/youtube";
			else if(ext == "jpg" || ext == "jpeg") mimeType = "image/jpeg";
			else if(ext == "png") mimeType  = "image/png";
			else if(ext == "mp4") mimeType  = "video/mp4";
			else if(ext == "m4v") mimeType  = "video/mp4";
			else if(ext == "webm") mimeType = "video/webm";
			else if(ext == "pdf") mimeType  = "application/pdf";
			console.log("URL: " + dataUrl + ", type: " + mimeType);

			if (mimeType !== "") this.wsio.emit('addNewWebElement', {type: mimeType, url: dataUrl});
		}
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
	this.onAccessApproved            = this.onAccessApprovedMethod.bind(this);
	this.streamSuccess               = this.streamSuccessMethod.bind(this);
	this.streamFail                  = this.streamFailMethod.bind(this);
	this.streamEnded                 = this.streamEndedMethod.bind(this);
	this.streamMetaData              = this.streamMetaDataMethod.bind(this);
	this.extractFrame                = this.extractFrameMethod.bind(this);
	
	// Event Listeners
	window.addEventListener('dragover', this.preventDefault, false);
	window.addEventListener('dragend',  this.preventDefault, false);
	window.addEventListener('drop',     this.preventDefault, false);
	
	fileDrop.addEventListener('dragover', this.preventDefault,     false);
	fileDrop.addEventListener('dragend',  this.preventDefault,     false);
	fileDrop.addEventListener('drop',     this.uploadFileToServer, false);
	
	if (this.windowManager) {
		// Not all sagePointer have a windowManager
		this.windowManager.addEventListener('dragover', this.preventDefault,     false);
		this.windowManager.addEventListener('dragend',  this.preventDefault,     false);
		this.windowManager.addEventListener('drop',     this.uploadFileToServer, false);
	}

	sagePointerBtn.addEventListener('click', this.startSagePointer, false);
	screenShareBtn.addEventListener('click', this.startScreenShare, false);
	
	screenShareResolution.addEventListener('change', this.changeScreenShareResolution, false);
	screenShareQuality.addEventListener('change',    this.changeScreenShareQuality,    false);
	
	document.addEventListener('pointerlockchange',       this.pointerLockChange, false);
	// redudant here (webkit)
	// document.addEventListener('mozpointerlockchange',    this.pointerLockChange, false);
	// document.addEventListener('webkitpointerlockchange', this.pointerLockChange, false);
	
	
	
	this.base64ToString = function(base64) {
		//return decodeURIComponent(escape(atob(base64)));
		return atob(base64);
	};
}

