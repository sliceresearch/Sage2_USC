// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var unity = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "onfinish";
		this.viewer = null;
		this.u = null;
	},
	
	init: function(data) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, "div", data);
		
		// application specific 'init'
		console.log("Size ", this.element.clientWidth, this.element.clientHeight);
		this.element.id = "div" + data.id;

		console.log("Viewer: " , data.id, this.resrcPath, this.resrcPath);

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
	
	startResize: function(date) {
		
	},
	
	resize: function(date) {
		this.refresh(date);
	},
	
	event: function(eventType, position, user_id, data, date) {
		//this.refresh(date);
	}
});
