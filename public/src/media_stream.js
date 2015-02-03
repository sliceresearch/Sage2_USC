// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var media_stream = SAGE2_BlockStreamingApp.extend( {

	construct: function() {
		arguments.callee.superClass.construct.call(this);
	},

	init: function(data) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, "div", data);
	},
	load: function(state, date) {
		arguments.callee.superClass.load.call(this, state, date);
	},
});
