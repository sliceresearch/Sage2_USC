// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

require('./scripts/kinetic-v5.1.0.min');

module.exports = SAGE2_App.extend( {
	init: function(data) {
		// call super-class 'init'
		this.SAGE2Init("div", data);

		this.minDim = null;
		this.stage  = null;
		this.layer1 = null;
		this.width  = null;
		this.height = null;
		this.resizeEvents = "continuous";

		this.maxFPS = 30;

		this.element.id = "div" + data.id;
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.stage  = new Kinetic.Stage({container: this.element.id, width: this.width, height: this.height});
		this.layer1 = new Kinetic.Layer();
		
		this.stage.add(this.layer1);

		this.minDim = Math.min(this.width, this.height);
		this.controls.finishedAddingControls(); 
	},

	load: function(date) {
	},

	draw: function(date) {
		this.layer1.removeChildren();
				
		var amplitude = this.width / 4;
		var period    = 2.0; // in sec
		var centerX   = this.width  / 2;
		var centerY   = this.height / 2;
		
		var hexagon = new Kinetic.RegularPolygon({
			x: amplitude * Math.sin(this.t * 2*Math.PI / period) + centerX,
			y: centerY,
			sides: 6,
			radius: 0.25*this.minDim,
			fill: 'red',
			stroke: 'black',
			strokeWidth: 0.01*this.minDim
		});
		
		this.layer1.add(hexagon);
		this.stage.draw();
	},


	resize: function(date) {
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.minDim = Math.min(this.width, this.height);

        this.stage.setWidth(this.width);
        this.stage.setHeight(this.height);
		
		this.refresh(date);
	},
	
	event: function(eventType, position, user_id, data, date) {
		//this.refresh(date);
	}

});
