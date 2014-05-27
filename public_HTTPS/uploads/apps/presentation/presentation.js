// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file


var presentation = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous";
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "iframe", width, height, resrc, date);
		
		// application specific 'init'
		this.element.frameborder = 0;

		// office online
		this.element.src = 'https://onedrive.live.com/embed?cid=F0E33DA97A9466D0&resid=F0E33DA97A9466D0%21142&authkey=&em=2&wdAr=1.7791519434628975&wdEaa=1';
		// google doc
		//this.element.src = "https://docs.google.com/presentation/d/115vZOOr0mB6jxK-eL_HbU9ygMIv6U9JIvrr5wqQm47A/embed?start=true&loop=true&delayms=3000";
	},
	
	load: function(state, date) {
	},
	
	draw: function(date) {
	},
	
	resize: function(date) {
		this.refresh(date);
	},
	
	event: function(eventType, user_id, itemX, itemY, data, date) {
		//console.log("div event", eventType, user_id, itemX, itemY, data, date);

		if (eventType === "pointerPress" && (data.button === "left") ) {
		}
		if (eventType === "pointerMove" && this.dragging ) {
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
		}

		// Scroll events for zoom
		if (eventType === "pointerScroll") {
		}

		if (eventType == "keyboard" && data.code == 109 && data.state == "down") {
			// m key down
		}
		if (eventType == "keyboard" && data.code == 116 && data.state == "down") {
			// t key down
		}
		if (eventType == "keyboard" && data.code == 119 && data.state == "down") {
			// w key down
		}
		else if (eventType == "specialKey" && data.code == 16 && data.state == "down") {
			// shift down
		}
		else if (eventType == "specialKey" && data.code == 17 && data.state == "down") {
			// control down
		}
		else if (eventType == "specialKey" && data.code == 37 && data.state == "down") {
			// left
		}
		else if (eventType == "specialKey" && data.code == 38 && data.state == "down") {
			// up
		}
		else if (eventType == "specialKey" && data.code == 39 && data.state == "down") {
			// right
		}
		else if (eventType == "specialKey" && data.code == 40 && data.state == "down") {
			// down
		}
		
		this.refresh(date);
	}
});

