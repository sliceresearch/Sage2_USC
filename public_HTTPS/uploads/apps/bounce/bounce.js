// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file

var bounce = SAGE2_App.extend( {
    construct: function() {
		arguments.callee.superClass.construct.call(this);
		this.ctx     = null;
		this.ballImg = null;
		this.vel     = null;
		this.pos     = null;
		this.dir     = null;
		this.frame   = null;
		this.resizeEvents = "continuous";
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);

		this.ctx = this.element.getContext("2d");
		this.minDim = Math.min(this.element.width, this.element.height);

		this.ballImg = new Image();
		this.ballImg.src = this.resrcPath + "images/evllogo.png";
		this.vel = 1;
		this.pos = [0.5, 0.5];
		this.dir = [0.7071, 0.7071];		
		this.frame = 0;
		this.timer = 0.0;
		this.redraw = true;
		this.minDim = Math.min(this.element.width, this.element.height);
	},

	load: function(state, date) {
		
	},

	draw: function(date) {
		this.timer = this.timer + this.dt;
		if(this.timer >= 0.033333333) {
			this.timer = 0.0;
			this.redraw = true;
		}
		
		if(this.redraw) {		
			// clear canvas		
			this.ctx.clearRect(0,0, this.element.width, this.element.height);
			
			this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)"
			this.ctx.fillRect(0,0, this.element.width, this.element.height)
			
			var wScale = 1.0;
			var hScale = 1.0;
			if(this.element.width < this.element.height) hScale = this.element.height / this.element.width;
			if(this.element.height < this.element.width) wScale = this.element.width / this.element.height;
			
			if(this.pos[0]<0 && this.dir[0]<0) this.dir[0] = -this.dir[0];
			if(this.pos[0]>1.0*wScale && this.dir[0]>0) this.dir[0] = -this.dir[0];
			if(this.pos[1]<0 && this.dir[1]<0) this.dir[1] = -this.dir[1];
			if(this.pos[1]>1.0*hScale && this.dir[1]>0) this.dir[1] = -this.dir[1];
			
			this.pos[0] += this.dir[0]*this.vel*this.dt;
			this.pos[1] += this.dir[1]*this.vel*this.dt;
			var size = 0.2*this.minDim;
			var x = this.pos[0]*this.minDim - (size/2);
			var y = this.pos[1]*this.minDim - (size/2);
			this.ctx.drawImage(this.ballImg, x, y, size, size);
			
			this.frame++;
			this.redraw = false;
		}
	},

	resize: function(date) {
		this.minDim = Math.min(this.element.width, this.element.height);
		this.redraw = true;
		
		this.draw(date);
	},
	
	event: function(eventType, userId, x, y, data, date) {
		
	}
});
