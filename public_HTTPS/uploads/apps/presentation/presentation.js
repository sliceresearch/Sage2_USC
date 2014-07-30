// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


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
	
	event: function(eventType, position, user_id, data, date) {

		if (eventType === "pointerPress" && (data.button === "left") ) {
		}
		if (eventType === "pointerMove") {
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
		}

		// Scroll events for zoom
		if (eventType === "pointerScroll") {
		}

		if (eventType == "specialKey" && data.code == 37 && data.state == "down") {
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

