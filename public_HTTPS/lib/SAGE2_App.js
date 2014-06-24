// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var SAGE2_App = Class.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);
		this.div          = null;
		this.element      = null;
		this.resrcPath    = null;
		this.resizeEvents = "never";
		this.state = {};
		console.log("SAGE2_App:", this.state);
	
		this.startDate = null;
		this.prevDate  = null;
	
		this.t     = null;
		this.dt    = null;
		this.frame = null;
		this.fps   = null;

		this.timer  = null;
		this.maxfps = null;
		this.redraw = null;
	},
	
	init: function(id, elem, width, height, resrc, date) {
		this.div     = document.getElementById(id);
		this.element = document.createElement(elem);
		this.element.className = "sageItem";
		this.element.style.zIndex = "0";
		if (elem === "div") {
			this.element.style.width  = width  + "px";
			this.element.style.height = height + "px";
		} else {
			this.element.width  = width;
			this.element.height = height;
		}
		this.div.appendChild(this.element);
		
		this.resrcPath = resrc + "/";
		this.startDate = date;

		this.controls = new widgetSpec(id);
		this.controls.id = id;
		this.prevDate  = date;
		this.frame     = 0;
		
		// Measurement variables
		this.frame_sec = 0;
		this.sec       = 0;
		this.fps       = 0.0;

		// Frame rate control
		this.timer     = 0;
		this.maxFPS    = 60.0; // Big than 60, since Chrome is Vsync anyway
		this.redraw    = true;
	},
	
	preDraw: function(date) {
		this.t  = (date.getTime() - this.startDate.getTime()) / 1000; // total time since start of program (sec)
		this.dt = (date.getTime() -  this.prevDate.getTime()) / 1000; // delta time since last frame (sec)
		
		// Frame rate control
		this.timer = this.timer + this.dt;
		if (this.timer > (1.0/this.maxFPS)) {
			this.timer  = 0.0;
			this.redraw = true;			
		}
		// If we ask for more, just let it run
		if (this.maxFPS>=60.0) this.redraw = true;

		this.sec += this.dt;
	},
	
	postDraw: function(date) {
		this.prevDate = date;
		this.frame++;
	},

	// high-level function to be called a complete draw
	refresh: function (date) {
		// update time
		this.preDraw(date);
		// actual application draw
		if (this.redraw) {
			// If drawing, measure actual frame rate
			if( this.sec >= 1.0){
				this.fps       = this.frame_sec / this.sec;
				this.frame_sec = 0;
				this.sec       = 0;
			}

			this.draw(date);

			this.frame_sec++;
			this.redraw = false;	
		}
		// update time and misc
		this.postDraw(date);
	},

	// Prints message to local browser console and send to server
	//   accept a string as parameter: this.log("my message")
	log: function(msg) {
		if (arguments.length===0) return;
		var args;
		if (arguments.length > 1)
			args = Array.prototype.slice.call(arguments);
		else
			args = msg;
		sage2Log({app: this.div.id, message: args});
	},
});


