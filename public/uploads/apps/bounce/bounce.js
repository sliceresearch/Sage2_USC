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
	init: function(data) {
		this.SAGE2Init("canvas", data);

		// Set the framerate
		this.maxFPS = 30;
		// Receive move / resize events continuously
		this.moveEvents   = "continuous";
		this.resizeEvents = "continuous";

		this.ctx = this.element.getContext('2d');

		this.ballImg = new Image();
		this.ballImg.src = this.resrcPath + "images/evllogo.png";
		this.minDim = Math.min(this.element.width, this.element.height);

		this.sizex = ((this.sage2_x/ui.json_cfg.totalWidth) *0.5 + 0.5) * (0.4*this.minDim);
		this.sizey = ((this.sage2_y/ui.json_cfg.totalHeight)*0.5 + 0.5) * (0.4*this.minDim);

		console.log(this.state);
		console.log(this.sizex, this.sizey);

		this.controls.finishedAddingControls(); //Not adding controls but making the default buttons available
	},

	load: function(date) {
		// this.state has now been updated
		this.refresh(date);
	},

	draw: function(date) {
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
		
		var x = this.state.pos[0]*this.minDim - (this.sizex/2);
		var y = this.state.pos[1]*this.minDim - (this.sizey/2);
		this.ctx.drawImage(this.ballImg, x, y, this.sizex, this.sizey);

		this.SAGE2Sync(false);
	},

	resize: function(date) {
		this.minDim = Math.min(this.element.width, this.element.height);		
		this.refresh(date);
	},
	
	move: function(date) {
		this.sizex = ((this.sage2_x/ui.json_cfg.totalWidth) *0.5 + 0.5) * (0.4*this.minDim);
		this.sizey = ((this.sage2_y/ui.json_cfg.totalHeight)*0.5 + 0.5) * (0.4*this.minDim);
		this.refresh(date);
	},

	event: function(eventType, position, user_id, data, date) {
		
	},

	quit: function () {
		this.log("Bounce quit");
	}
});
