// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var kinetic_oscillating = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.stage   = null;
		this.layer   = null;
		this.blobs   = null;
		this.nBlobs  = 0;
		this.nPoints = 0;
		this.initialPoints = null;
		this.width   = null;
		this.height  = null;
		this.resizeEvents = "onfinish";
		this.lastZoom = null;
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

		this.maxFPS = 30;
		
		this.lastZoom = date;

		this.element.id = "div" + id;
		this.element.style.background = '#000';
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.stage  = new Kinetic.Stage({container: this.element.id, width: this.width, height: this.height});
		this.layer  = new Kinetic.Layer();
		
		this.nBlobs  = 6;
		this.nPoints = 5;
		
		if(isMaster){
			console.log("I'm master! " + clientID);
			var blobPoints = new Array(this.nBlobs);
			var blobOpacity = new Array(this.nBlobs);
			for(var i=0; i<this.nBlobs; i++){
				blobPoints[i] = new Array(this.nPoints*2);
				for(var j=0; j<this.nPoints; j++){
					blobPoints[i][2*j + 0] = this.width   * Math.random();
					blobPoints[i][2*j + 1] = this.height  * Math.random();
				}
				blobOpacity[i] = Math.random();
			}
			this.broadcast("initializeBlobs", {blobPoints: blobPoints, blobOpacity: blobOpacity});
		}
	},
	
	initializeBlobs: function(data) {
		this.initialPoints = data.blobPoints;
		this.initialOpacity = data.blobOpacity;
		
		var colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
		this.blobs = [];

		// create 6 blobs
		for(var n=0; n<this.nBlobs; n++) {
			var blob = new Kinetic.Line({
							points: this.initialPoints[n],
							fill: colors[n],
							stroke: 'black',
							strokeWidth: 2,
							tension: 0,
							closed: true,
							opacity: this.initialOpacity[n],
							draggable: true
						});

			this.layer.add(blob); 
			this.blobs.push(blob);
		}

		this.stage.add(this.layer);
	},

	load: function(state, date) {
	},

	draw: function(date) {
		if(!this.blobs) return;
	
		var period        = 2000;
		var amplitude     = 1;
		var centerTension = 0;

		for(var n=0; n<this.blobs.length; n++) {
			this.blobs[n].setTension(amplitude * Math.sin(this.t*1000.0 * 2 * Math.PI / period) + centerTension);
		}

		this.stage.draw();
	},

	resize: function(date) {
        this.stage.setSize({
			width : this.element.clientWidth,
   			height : this.element.clientHeight
		});
        var val = this.element.clientWidth/this.width;
		this.stage.setScale({x:val, y:val});

		this.refresh(date);
	},
	
	event: function(eventType, position, user_id, data, date) {
		// Scroll events for zoom
		if (eventType === "pointerScroll") {
			var amount = data.scale;
			var diff = date - this.lastZoom;
			if (amount >= 1 && (diff>100)) {
				// zoom in within the stage
				var scale = this.stage.scale();
				scale.x *= 1.2;
				scale.y *= 1.2;
				this.stage.setScale(scale);
				this.lastZoom = date;
			}
			else if (amount <= 1 && (diff>100)) {
				// zoom out within the stage
				var scale = this.stage.scale();
				scale.x *= 0.8;
				scale.y *= 0.8;
				this.stage.setScale(scale);
				this.lastZoom = date;
			}
		}
	}

});



