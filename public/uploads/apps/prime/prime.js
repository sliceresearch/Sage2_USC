// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var prime = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);
		this.resizeEvents = "onfinish";

		this.ctx     = null;
		this.worker  = null;
		this.msgFunc = null;
		this.errFunc = null;
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);
		
		// application specific 'init'
		this.ctx    = this.element.getContext("2d");
		this.maxFPS = 30.0;

		// Number of prime numbers found
		this.state.count  = 1;
		// Last prime number
		this.state.prime  = 1;
		// is Calculating
		this.state.running = true;

		// create a web worker to do the job
		this.worker = new Worker(this.resrcPath + 'compute.js');

		// Create callback functions		
		this.msgFunc = this.onMessage.bind(this);
		this.errFunc = this.onError.bind(this);

		// Attach the callbacks to the worker object
		this.worker.onmessage = this.msgFunc;
		this.worker.onerror   = this.errFunc;
	},
	
	// Message back from the worker
	onMessage: function (event) {
		this.state.count = this.state.count + 1;
		this.state.prime = event.data;
	},

	// Error from the worker
	onError: function (event) {
		this.log("Prime> Worker error: " + event.message + "\n");
	},

	quit: function () {
		// stop the worker
		this.worker.postMessage(0);	
	},

	load: function(state, date) {
		if (state.prime !== undefined) {
			this.state.count   = state.count;
			this.state.prime   = state.prime;
			this.state.running = state.running
		}
		// Start the worker
		if (this.state.running) {
			this.worker.postMessage(this.state.prime);
			this.state.running = true;	
			this.refresh(date);
		}
	},
	
	draw: function(date) {
		if (this.state.running) {
			// Ask to calculate another number
			this.worker.postMessage(this.state.prime);
		}

		// clear canvas		
		this.ctx.clearRect(0,0, this.element.width, this.element.height);
		// draw
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.fillRect(0,0, this.element.width, this.element.height);

		this.ctx.font         = "normal 36px Arial";
		this.ctx.textAlign    = "center";
		this.ctx.textBaseline = "middle";
		this.ctx.fillStyle    = "#FFFFFF";

		this.ctx.save();
			this.ctx.textAlign    = "left";
			this.ctx.textBaseline = "hanging";
			var mytext = "Number of prime numbers found";
			var textw  = this.ctx.measureText(mytext).width;
			var scalex = this.element.width * 0.9 / textw;
			this.ctx.scale(scalex, scalex);
			this.ctx.fillText(mytext, 0,0);
		this.ctx.restore();

		this.ctx.save();
			this.ctx.textAlign    = "center";
			this.ctx.textBaseline = "alphabetic";
			var mytext = this.state.count.toString();
			var textw  = this.ctx.measureText(mytext).width;
			var scalex = this.element.width / textw;
			this.ctx.scale(scalex, scalex);
			this.ctx.fillText(mytext, this.element.width/(2*scalex), this.element.height/(2*scalex));
		this.ctx.restore();


		this.ctx.save();
			this.ctx.textAlign    = "left";
			this.ctx.textBaseline = "top";
			var mytext = "Largest prime";
			var textw  = this.ctx.measureText(mytext).width;
			var scalex = this.element.width * 0.9 / textw;
			this.ctx.scale(scalex, scalex);
			this.ctx.fillStyle = "#990000";
			this.ctx.fillText(mytext, 0, this.element.height/(2*scalex));
		this.ctx.restore();

		this.ctx.save();
			this.ctx.textAlign    = "center";
			this.ctx.textBaseline = "alphabetic";
			var mytext = this.state.prime.toString();
			var textw  = this.ctx.measureText(mytext).width;
			var scalex = this.element.width / textw;
			this.ctx.scale(scalex, scalex);
			this.ctx.fillStyle = "#990000";
			this.ctx.fillText(mytext, this.element.width/(2*scalex), this.element.height/scalex);
		this.ctx.restore();
	},
	
	resize: function(date) {
		this.refresh(date);
	},
	
	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress") {
			// Any pointer click, start/stop the computation
			this.state.running = ! this.state.running;
			if (this.state.running) this.maxFPS = 30;
			else this.maxFPS = 2;
			this.refresh(date);
		}
	}
});
