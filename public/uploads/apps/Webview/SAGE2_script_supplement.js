// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-17

/*
Supplement to get some additional input functionality.
	In particular backspace and sending keypresses to nodes with out value property.

*/


// ------------------------------------------------------------------------------------------------------------------
// 1

var s2InjectForKeys = {};

/*
Unsure why but after testing, page doesn't get keydowns, so this conversion function needs to be injected.

Quote from MDN:
	The keypress event is fired when a key is pressed down, and that key normally produces a character value (use input instead).

Nodes without value should NOT be checking for keypress.
And checks for keydown will not be normally activated. This has been confirmed Youtube and spacebar for pausing video.
*/
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
	// if a keypress is received and the target isn't an input node
	if (e.target.value === undefined) {
			// set the lastClickedElement to the target of event (since it needs to get there)
			s2InjectForKeys.lastClickedElement = e.target;
			s2InjectForKeys.lastClickedElement.dispatchEvent(kue);
			// should this be prevented? what if something check for keypress?
			e.preventDefault();
	}
});

// after any click, track the node clicked to send further events to it.
document.addEventListener("click", function(e) {
	s2InjectForKeys.lastClickedElement = document.elementFromPoint(e.clientX, e.clientY);
});
/*
Delete from value using keyup.
Keydown not activated due to squelch in keypress->keydown conversion to prevent double event if value field exists.
Normal keypress doesn't cause the backspace action either. Is this because backspace is not an input value?
*/
document.addEventListener("keyup", function(e) {
	if (e.keyCode == 8) {
		s2InjectForKeys.lastClickedElement.value = s2InjectForKeys.lastClickedElement.value.substring(0, s2InjectForKeys.lastClickedElement.value.length - 1);
	}
});

