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
	this.mediaStream = null;
	
	if(localStorage.SAGE2_ptrName  === undefined || localStorage.SAGE2_ptrName  === null) localStorage.SAGE2_ptrName  = "Default";
	if(localStorage.SAGE2_ptrColor === undefined || localStorage.SAGE2_ptrColor === null) localStorage.SAGE2_ptrColor = "#B4B4B4";
	
	this.setInteractionId = function(id) {
		this.uniqueID = id;
	};
	
	this.setPointerSensitivity = function(value) {
		this.sensitivity = value;
	};
	
	this.startSAGE2Pointer = function(buttonId) {
		var button = document.getElementById(buttonId);
		button.requestPointerLock = button.requestPointerLock       || 
									button.mozRequestPointerLock    || 
									button.webkitRequestPointerLock;

		// Ask the browser to lock the pointer
		button.requestPointerLock();
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
	
	
	this.pointerLockChange           = this.pointerLockChangeMethod.bind(this);
	this.pointerPress                = this.pointerPressMethod.bind(this);
	this.pointerMove                 = this.pointerMoveMethod.bind(this);
	this.pointerRelease              = this.pointerReleaseMethod.bind(this);
	this.pointerDblClick             = this.pointerDblClickMethod.bind(this);
	this.pointerScroll               = this.pointerScrollMethod.bind(this);
	this.pointerKeyDown              = this.pointerKeyDownMethod.bind(this);
	this.pointerKeyUp                = this.pointerKeyUpMethod.bind(this);
	this.pointerKeyPress             = this.pointerKeyPressMethod.bind(this);
	
	
	document.addEventListener('pointerlockchange',       this.pointerLockChange, false);
}