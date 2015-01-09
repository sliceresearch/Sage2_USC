// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var clock = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.ctx          = null;
		this.minDim       = null;
		this.resizeEvents = "onfinish";
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);
		
		// application specific 'init'
		this.ctx    = this.element.getContext("2d");
		this.minDim = Math.min(this.element.width, this.element.height);
		this.maxFPS = 1.0;
	},
	
	load: function(state, date) {
	},
	
	draw: function(date) {
		console.log("clock> drawing");

		// clear canvas		
		this.ctx.clearRect(0,0, this.element.width, this.element.height);
	
		this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)"
		this.ctx.fillRect(0,0, this.element.width, this.element.height)
	
		var radius  = 0.95 * this.minDim / 2;
		var centerX = this.element.width / 2;
		var centerY = this.element.height / 2;
	
		// outside of clock
		this.ctx.lineWidth   = (3.0/100.0) * this.minDim;
		this.ctx.strokeStyle = "rgba(85, 100, 120, 1.0)";
		this.ctx.beginPath();
		this.ctx.arc(centerX, centerY, radius, 0, Math.PI*2);
		this.ctx.closePath();
		this.ctx.stroke();
	
		// tick marks
		var theta = 0;
		var distance = radius * 0.90; // 90% from the center
		var x = 0;
		var y = 0;
	
		// second dots
		this.ctx.lineWidth = (0.5/100.0) * this.minDim;
		this.ctx.strokeStyle = "rgba(20, 50, 120, 1.0)";
	
		for(var i=0; i<60; i++){
			// calculate theta
			theta = theta + (6 * Math.PI/180);
			// calculate x,y
			x = centerX + distance * Math.cos(theta);
			y = centerY + distance * Math.sin(theta);
		
			this.ctx.beginPath();
			this.ctx.arc(x, y, (1.0/100.0) * this.minDim, 0, Math.PI*2);
			this.ctx.closePath();
			this.ctx.stroke();
		}
	
		// hour dots
		this.ctx.lineWidth = (2.5/100.0) * this.minDim;
		this.ctx.strokeStyle = "rgba(20, 50, 120, 1.0)";
	
		for(var i=0; i<12; i++){
			// calculate theta
			theta = theta + (30 * Math.PI/180);
			// calculate x,y
			x = centerX + distance * Math.cos(theta);
			y = centerY + distance * Math.sin(theta);
		
			this.ctx.beginPath();
			this.ctx.arc(x, y, (1.0/100.0) * this.minDim, 0, Math.PI*2, true);
			this.ctx.closePath();
			this.ctx.stroke();
		}
	
		// second hand
		var handSize = radius * 0.80; // 80% of the radius
		var sec = date.getSeconds();
	
		theta = (6 * Math.PI / 180);
		x = centerX + handSize * Math.cos(sec*theta - Math.PI/2);
		y = centerY + handSize * Math.sin(sec*theta - Math.PI/2);
	
		this.ctx.lineWidth   = (1.0/100.0) * this.minDim;
		this.ctx.strokeStyle = "rgba(70, 35, 50, 1.0)";
		this.ctx.lineCap     = "round";
		
		this.ctx.beginPath();
		this.ctx.moveTo(x, y);
		this.ctx.lineTo(centerX, centerY);
		this.ctx.moveTo(x, y);
		this.ctx.closePath();
		this.ctx.stroke();
	
		// minute hand
		handSize = radius * 0.60; // 60% of the radius
		var min = date.getMinutes() + sec/60;
	
		theta = (6 * Math.PI / 180);
		x = centerX + handSize * Math.cos(min*theta - Math.PI/2);
		y = centerY + handSize * Math.sin(min*theta - Math.PI/2);
	
		this.ctx.lineWidth = (1.5/100.0) * this.minDim;
		this.ctx.strokeStyle = "rgba(70, 35, 50, 1.0)";
		this.ctx.lineCap = "round";
		
		this.ctx.beginPath();
		this.ctx.moveTo(x, y);
		this.ctx.lineTo(centerX, centerY);
		this.ctx.moveTo(x, y);
		this.ctx.closePath();
		this.ctx.stroke();
	
		// hour hand
		handSize = radius * 0.40; // 40% of the radius
		var hour = date.getHours() + min/60;
	
		theta = (30 * Math.PI / 180);
		x = centerX + handSize * Math.cos(hour * theta - Math.PI/2);
		y = centerY + handSize * Math.sin(hour * theta - Math.PI/2);
	
		this.ctx.lineWidth = (2.0/100.0) * this.minDim;
		this.ctx.strokeStyle = "rgba(70, 35, 50, 1.0)";
		this.ctx.lineCap = "round";
		
		this.ctx.beginPath();
		this.ctx.moveTo(x, y);
		this.ctx.lineTo(centerX, centerY);
		this.ctx.moveTo(x, y);
		this.ctx.closePath();
		this.ctx.stroke();
	},
	
	resize: function(date) {
		console.log("clock> resize");
		this.minDim = Math.min(this.element.width, this.element.height);
		//this.redraw = true;
		this.refresh(date);
	},
	
	event: function(eventType, position, user_id, data, date) {
		console.log("clock> event");
		//this.refresh(date);
	}
});
