// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var Module;

var unity = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "onfinish";
		this.viewer = null;
		this.u = null;
	},
	
	init: function(data) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, "canvas", data);
		
		// application specific 'init'

		// From Unity page
		this.element.classList.add("emscripten");

		Module = {
			filePackagePrefixURL: this.resrcPath + "Release/",
			memoryInitializerPrefixURL: this.resrcPath + "Release/",
			preRun: [],
			postRun: [],
			print: (function() {
					return function(text) {
					};
				})(),
			printErr: function(text) {
			},
			canvas: this.element,
			progress: null,
			setStatus: function(text) {
			},
			totalDependencies: 0,
			monitorRunDependencies: function(left) {
				this.totalDependencies = Math.max(this.totalDependencies, left);
				Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
			}
		};
		Module.setStatus('Downloading (0.0/1)');

		var script0 = document.createElement('script');
		script0.src = this.resrcPath + "Release/UnityConfig.js";
		document.body.appendChild(script0);

		var script1 = document.createElement('script');
		script1.src = this.resrcPath + "Release/fileloader.js";
		document.body.appendChild(script1);

		var script2 = document.createElement('script');
		script2.src = this.resrcPath + "Release/webgl.js";
		document.body.appendChild(script2);

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
