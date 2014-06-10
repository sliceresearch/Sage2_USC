// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file

var unity = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "onfinish";
		this.viewer = null;
		this.u = null;
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);
		
		// application specific 'init'
		console.log("Size ", this.element.clientWidth, this.element.clientHeight);
		this.element.id = "div" + id;

		console.log("Viewer: " , id, this.resrcPath, this.resrcPath);

		var config = {
			width: "100%", 
			height: "100%",
			params: { enableDebugging:"0" }
		};
		// Create unity object
		this.u = new UnityObject2(config);
		// Load the project
		this.u.initPlugin(this.element, this.resrcPath + "web.unity3d");
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
		//this.refresh(date);
	}
});
