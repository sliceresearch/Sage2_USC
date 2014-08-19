// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


var whiteboard = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "onfinish";
		this.stage  = null;
		this.layer  = null;
		this.width  = null;
		this.height = null;

		this.allLayers = null;
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);
		
		this.element.id = "div" + id;
		this.element.style.backgroundColor    = "rgba(0,0,0,1)";
		this.element.style.backgroundPosition = "top left";
		// this.element.style.backgroundColor    = 'rgba(42,42,42,1)';
		// this.element.style.backgroundImage    = "url(" + this.resrcPath + "images/dbgrid.webp)";
		// this.element.style.backgroundRepeat   = "repeat-x repeat-y";

		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;

		// application specific 'init'
		this.maxFPS = 20.0;
		this.stage  = new Kinetic.Stage({container: this.element.id, width: this.width, height: this.height});
		this.layer  = new Kinetic.Layer();
		this.stage.add(this.layer);
		this.allLayers = [this.layer];

	},

	load: function(state, date) {
	},
	
	draw: function(date) {
		this.stage.draw();
	},
	
	resize: function(date) {
        this.stage.setSize({
			width  : this.element.clientWidth,
   			height : this.element.clientHeight
		});
        var val = this.element.clientWidth/this.width;
		this.stage.setScale({x:val, y:val});
		this.refresh(date);
	},

	event: function(type, position, user, data, date) {
		if (type === 'pointerDraw') {
			if (data.command === 'draw') {
				var lineWidth = data.pressure;
				if (lineWidth===0)
					lineWidth = 3;
				else
					lineWidth = lineWidth*8.0;
				var aSpline = new Kinetic.Line({
					points: data.points,
					stroke: data.color,
					strokeWidth: lineWidth,
					lineCap: 'round',
					tension: 0.5
				});
				this.layer.add(aSpline);
			}
			if (data.command === 'newlayer') {
				var nlayer = new Kinetic.Layer();
				// hide all the layers
				for (var i=0;i<this.allLayers.length;i++)
					this.allLayers[i].hide();
				// put the new layer on display
				this.stage.add(nlayer);
				nlayer.show();
				// add it to the array of layers
				this.allLayers.push(nlayer);
				// make it the active layer
				this.layer = nlayer;
			}
			if (data.command === 'activelayer') {
				// hide all the layers
				for (var i=0;i<this.allLayers.length;i++)
					this.allLayers[i].hide();
				// make it the active layer
				this.layer = this.allLayers[data.value];
				this.layer.show();
			}
		}
		this.refresh(date);
	}
});
