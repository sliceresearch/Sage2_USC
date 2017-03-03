const {ipcRenderer} = require('electron');

ipcRenderer.on('getDataFromWebview', function(event, data){
	var tagsOfType = document.body.getElementsByTagName(data); 
    ipcRenderer.sendToHost("The Webview has " + tagsOfType.length + " elements of tag " + data);
});

ipcRenderer.on("whereAmI",function(event,data){
    ipcRenderer.sendToHost("Location:" + window.location);
});

ipcRenderer.on("objectRetrievalTest",function(event,data){
	var obj = {};
	obj.location = window.location;
	obj.divCount = document.body.getElementsByTagName(data).length;
	obj.a = "alpha";
	obj.b = "beta";
	obj.c = "charlie";
    ipcRenderer.sendToHost(obj);
});


var s2InjectForKeys = {};

document.addEventListener("keypress", function(e) {
	var kue = new CustomEvent("keydown", {bubbles:true});
	kue.target = e.target;
	kue.view = e.view;
	kue.detail = e.detail;
	kue.char = e.char;
	kue.key = e.key;
	kue.charCode = e.charCode;
	kue.keyCode = e.keyCode;
	kue.which = e.which;
	kue.location = e.location;
	kue.repeat = e.repeat;
	kue.locale = e.locale;
	kue.ctrlKey = e.ctrlKey;
	kue.shiftKey = e.shiftKey;
	kue.altKey = e.altKey;
	kue.metaKey = e.metaKey;
	if (e.target.value == undefined) {
			s2InjectForKeys.lastClickedElement = e.target;
			s2InjectForKeys.lastClickedElement.dispatchEvent(kue);
			e.preventDefault();
		/*if (s2InjectForKeys.lastClickedElement != null) {
			s2InjectForKeys.lastClickedElement.dispatchEvent(kue);
			e.preventDefault();
		}*/
	}
});
document.addEventListener("click", function(e) {
	s2InjectForKeys.lastClickedElement = document.elementFromPoint(e.clientX, e.clientY);
});

document.addEventListener("keydown", function(e) {
	/* Shift */
	if (e.keyCode == 16) {
		s2InjectForKeys.shift = true;
		return;
	}
	/* Backspace */
	if (e.keyCode == 8) {
		s2InjectForKeys.lastClickedElement.value = s2InjectForKeys.lastClickedElement.value.substring(0, s2InjectForKeys.lastClickedElement.value.length - 1);
		return;
	}
	/* Dont set keypress value if there was no clicked div */
	if (s2InjectForKeys.lastClickedElement.value == undefined) {
		return; 
	}
	/* By default, characters are capitalized, if shift is not down, lower case them. */
	var sendChar = String.fromCharCode(e.keyCode);
	if (!s2InjectForKeys.shift) {
		sendChar = sendChar.toLowerCase();
	} else if(e.keyCode == 49) { /* 1 */
		sendChar =  "!";
	} else if(e.keyCode == 50) { /* 2 */
		sendChar =  "@";
	} else if(e.keyCode == 51) { /* 3 */
		sendChar =  "#";
	} else if(e.keyCode == 52) { /* 4 */
		sendChar =  "$";
	} else if(e.keyCode == 53) { /* 5 */
		sendChar =  "%";
	} else if(e.keyCode == 54) { /* 6 */
		sendChar =  "^";
	} else if(e.keyCode == 55) { /* 7 */
		sendChar =  "&";
	} else if(e.keyCode == 56) { /* 8 */
		sendChar =  "*";
	} else if(e.keyCode == 57) { /* 9 */
		sendChar =  "(";
	} else if(e.keyCode == 48) { /* 0 */
		sendChar =  ")";
	}
	if (s2InjectForKeys.lastClickedElement.value != undefined) {
	} else {
	}
});
document.addEventListener("keyup", function(e) {
	if (e.keyCode == 0x10) {
		s2InjectForKeys.shift = false;
	}
	if (e.keyCode == 8) {
		s2InjectForKeys.lastClickedElement.value = s2InjectForKeys.lastClickedElement.value.substring(0, s2InjectForKeys.lastClickedElement.value.length - 1);
	}
});