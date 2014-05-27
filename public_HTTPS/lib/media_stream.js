// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file

var media_stream = SAGE2_App.extend( {
	construct: function() {
		this.src = null;
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "img", width, height, resrc, date);
		
		// application specific 'init'
	},
	
	load: function(state, date) {
		var base64;
		if(state.encoding === "base64") base64 = state.src;
		else if(state.encoding === "binary") base64 = btoa(state.src);
		this.element.src = "data:" + state.type + ";base64," + base64;
	},
	
	draw: function(date) {
	},
	
	resize: function(date) {
		
	},
	
	event: function(eventType, userId, x, y, data, date) {
		
	}
});
