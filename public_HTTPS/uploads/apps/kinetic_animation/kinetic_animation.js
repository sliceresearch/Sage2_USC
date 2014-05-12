// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file

var kinetic_animation = SAGE2_App.extend( {
	construct: function() {
		this.minDim = null;
		this.timer  = null;
		this.redraw = null;
		this.stage  = null;
		this.layer1 = null;
		this.frame  = null;
		this.width  = null;
		this.height = null;
		this.resizeEvents = "continuous";
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

		this.element.id = "div" + id;
		this.frame  = 0;
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.stage  = new Kinetic.Stage({container: this.element.id, width: this.width, height: this.height});
		this.layer1 = new Kinetic.Layer();
		
		this.stage.add(this.layer1);

		this.timer  = 0.0;
		this.redraw = true;
		this.minDim = Math.min(this.width, this.height);
	},

	load: function(state, date) {
		
	},

	draw: function(date) {
		// call super-class 'preDraw'
		arguments.callee.superClass.preDraw.call(this, date);

		this.timer = this.timer + this.dt;
		if(this.timer >= 0.033333333) {
			this.timer  = 0.0;
			this.redraw = true;
		}
		
		if(this.redraw) {		

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
			this.frame++;
			this.redraw = false;
		}

		// call super-class 'postDraw'
		arguments.callee.superClass.postDraw.call(this, date);
	},


	resize: function(date) {
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.minDim = Math.min(this.width, this.height);
		this.redraw = true;

        this.stage.setWidth(this.width);
        this.stage.setHeight(this.height);
		
		this.draw(date);
	},
	
	event: function(eventType, userId, x, y, data, date) {
		
	}

});
