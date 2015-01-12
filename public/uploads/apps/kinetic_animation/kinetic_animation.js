// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var kinetic_animation = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.minDim = null;
		this.stage  = null;
		this.layer1 = null;
		this.width  = null;
		this.height = null;
		this.resizeEvents = "continuous";
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

		this.maxFPS = 30;

		this.element.id = "div" + id;
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.stage  = new Kinetic.Stage({container: this.element.id, width: this.width, height: this.height});
		this.layer1 = new Kinetic.Layer();
		
		this.stage.add(this.layer1);

		this.minDim = Math.min(this.width, this.height);
	},

	load: function(state, date) {
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
