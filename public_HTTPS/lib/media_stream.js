// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var media_stream = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);
		
		this.src = null;
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "img", width, height, resrc, date);
		
		// application specific 'init'
	},
	
	load: function(state, date) {
		// modifying img.src directly leads to memory leaks
		// explicitly allocate and deallocate: 'createObjectURL' / 'revokeObjectURL'
		
		//var base64;
		//if(state.encoding === "base64") base64 = state.src;
		//else if(state.encoding === "binary") base64 = btoa(state.src);
		//this.element.src = "data:" + state.type + ";base64," + base64;
		
		var bin;
		if(state.encoding === "binary") bin = state.src;
		else if(state.encoding === "base64") bin = atob(state.src);
		
		var buf = new ArrayBuffer(bin.length);
		var view = new Uint8Array(buf);
		for(var i=0; i<view.length; i++) {
			view[i] = bin.charCodeAt(i);
		}
		
		var blob = new Blob([buf], {type: state.type});
		var source = window.URL.createObjectURL(blob);
		
		if(this.src !== null) window.URL.revokeObjectURL(this.src);
		this.src = source;
		
		this.element.src = this.src;
	},
	
	draw: function(date) {
	
	},
	
	resize: function(date) {
		
	},
	
	event: function(type, position, user, data, date) {
		
	}
});
