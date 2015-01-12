// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var bounce = SAGE2_App.extend( {
    construct: function() {
		arguments.callee.superClass.construct.call(this);
		this.ctx     = null;
		this.ballImg = null;
		this.sizex   = null;
		this.sizey   = null;
		this.moveEvents   = "continuous";
		this.resizeEvents = "continuous";
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);

		// Set the framerate
		this.maxFPS = 30;

		this.ctx = this.element.getContext("2d");
		this.minDim = Math.min(this.element.width, this.element.height);

		this.state.vel = null;
		this.state.pos = null;
		this.state.dir = null;

		this.ballImg = new Image();
		this.ballImg.src = this.resrcPath + "images/evllogo.png";
		this.minDim = Math.min(this.element.width, this.element.height);

		this.sizex = 0.2 * this.minDim;
		this.sizey = 0.2 * this.minDim;
	},

	load: function(state, date) {
		if (state) {
			this.state.vel = state.vel;
			this.state.pos = state.pos;
			this.state.dir = state.dir;
		} else {
			this.state.vel = 1;
			this.state.pos = [0.5, 0.5];
			this.state.dir = [0.7071, 0.7071];
		}
	},

	draw: function(date) {
		//this.log("BOUNCE");

		// clear canvas		
		this.ctx.clearRect(0,0, this.element.width, this.element.height);
		
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)"
		this.ctx.fillRect(0,0, this.element.width, this.element.height)
		
		var wScale = 1.0;
		var hScale = 1.0;
		if(this.element.width < this.element.height) hScale = this.element.height / this.element.width;
		if(this.element.height < this.element.width) wScale = this.element.width / this.element.height;
		if(this.state.pos[0]<0 && this.state.dir[0]<0) this.state.dir[0] = -this.state.dir[0];
		if(this.state.pos[0]>1.0*wScale && this.state.dir[0]>0) this.state.dir[0] = -this.state.dir[0];
		if(this.state.pos[1]<0 && this.state.dir[1]<0) this.state.dir[1] = -this.state.dir[1];
		if(this.state.pos[1]>1.0*hScale && this.state.dir[1]>0) this.state.dir[1] = -this.state.dir[1];
		this.state.pos[0] += this.state.dir[0]*this.state.vel*this.dt;
		this.state.pos[1] += this.state.dir[1]*this.state.vel*this.dt;
		//var size = 0.2*this.minDim;
		var x = this.state.pos[0]*this.minDim - (this.sizex/2);
		var y = this.state.pos[1]*this.minDim - (this.sizey/2);
		this.ctx.drawImage(this.ballImg, x, y, this.sizex, this.sizey);
	},

	resize: function(date) {
		this.minDim = Math.min(this.element.width, this.element.height);		
		this.refresh(date);
	},
	
	moved: function(px, py, wx, wy, date) {
		// px, py : position in wall coordination
		// wx, wy : width and height of the wall
		this.sizex = ((px/wx)*0.5 + 0.5) * (0.4*this.minDim);
		this.sizey = ((py/wy)*0.5 + 0.5) * (0.4*this.minDim);
		this.refresh(date);
	},

	event: function(eventType, position, user_id, data, date) {
	},

	quit: function () {
		this.log("Bounce quit");
	}
});
