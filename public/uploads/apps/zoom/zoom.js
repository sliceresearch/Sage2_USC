// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var zoom = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous";
		this.viewer    = null;
		this.lastZoom  = null;
		this.lastClick = null;
		this.isShift   = null;
		this.dragging  = null;
		this.position  = null;
	},
	
	init: function(data) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, "div", data);
		
		// application specific 'init'
		this.element.id = "div" + data.id;
		this.lastZoom  = data.date;
		this.lastClick = data.date;
		this.dragging  = false;
		this.isShift   = false;
		this.position  = {x:0, y:0};

		// create the image viewer with the right data and path
		this.viewer = OpenSeadragon({
			id: this.element.id,      // suppporting div
			prefixUrl:   this.resrcPath + "/images/",
			// change tileSources for your dataset
			tileSources: this.resrcPath + "chicago.dzi"
			//tileSources: this.resrcPath + "halfdome.dzi"
		});






		this.controls.addButton({type:"prev",sequenceNo:7,action:function(date){ 
			//left
			this.viewer.viewport.panBy(new OpenSeadragon.Point(-0.01, 0));
			this.viewer.viewport.applyConstraints();
		}.bind(this)});
		this.controls.addButton({type:"next",sequenceNo:1,action:function(date){ 
			// right
			this.viewer.viewport.panBy(new OpenSeadragon.Point(0.01, 0));
			this.viewer.viewport.applyConstraints();
		}.bind(this)});
		this.controls.addButton({type:"up-arrow",sequenceNo:4,action:function(date){ 
			// up
			this.viewer.viewport.panBy(new OpenSeadragon.Point(0, -0.01));
			this.viewer.viewport.applyConstraints();
		}.bind(this)});
		this.controls.addButton({type:"down-arrow",sequenceNo:10,action:function(date){ 
			// down
			this.viewer.viewport.panBy(new OpenSeadragon.Point(0, 0.01));
			this.viewer.viewport.applyConstraints();
		}.bind(this)});
				
		this.controls.addButton({type:"zoom-in",sequenceNo:5,action:function(date){ 
			// zoom in
			this.viewer.viewport.zoomBy(0.8);
			this.viewer.viewport.applyConstraints();
			this.lastZoom = date;
		}.bind(this)});
		this.controls.addButton({type:"zoom-out",sequenceNo:6,action:function(date){ 
			// zoom out
			this.viewer.viewport.zoomBy(1.2);
			this.viewer.viewport.applyConstraints();
			this.lastZoom = date;
		}.bind(this)});
		this.controls.finishedAddingControls();
	},
	
	load: function(state, date) {
	},
	
	draw: function(date) {
	},
	
	resize: function(date) {
		this.refresh(date);
	},

	event: function(eventType, position, user_id, data, date) {
		//console.log("Zoom event", eventType, position, user_id, data, date);
		if (eventType === "pointerPress" && (data.button === "left") ) {
			if ( (date - this.lastClick) < 350) {
				// double click
				if (this.isShift) {
					this.viewer.viewport.zoomBy(0.6);
				} else {
					this.viewer.viewport.zoomBy(1.4);					
				}
				this.viewer.viewport.applyConstraints();
				this.lastZoom = date;
			} else {
				// not a double clikc
				this.dragging = true;
			}
			// keep values up to date
			this.position.x = position.x;
			this.position.y = position.y;
			this.lastClick  = date;
		}
		if (eventType === "pointerMove" && this.dragging ) {
            var delta = new OpenSeadragon.Point(this.position.x - position.x, this.position.y - position.y);
            this.viewer.viewport.panBy(
                this.viewer.viewport.deltaPointsFromPixels(delta)
            );
			this.position.x = position.x;
			this.position.y = position.y;
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
			this.dragging = false;
			this.position.x = position.x;
			this.position.y = position.y;
		}

		// Scroll events for zoom
		if (eventType === "pointerScroll") {
			var amount = data.wheelDelta;
			var diff = date - this.lastZoom;
			if (amount >= 1 && (diff>300)) {
				// zoom in
				this.viewer.viewport.zoomBy(0.8);
				this.viewer.viewport.applyConstraints();
				this.lastZoom = date;
			}
			else if (amount <= 1 && (diff>300)) {
				// zoom out
				this.viewer.viewport.zoomBy(1.2);
				this.viewer.viewport.applyConstraints();
				this.lastZoom = date;
			}
		}

		if (eventType == "specialKey" && data.code == 16 && data.state == "down") {
			// shift down
			this.isShift = true;
			// zoom in
			//this.viewer.viewport.zoomBy(1.1);
			//this.viewer.viewport.applyConstraints();
		}
		else if (eventType == "specialKey" && data.code == 16 && data.state == "up") {
			// shift up
			this.isShift = false;
		}
		else if (eventType == "specialKey" && data.code == 17 && data.state == "down") {
			// control down
			// zoom out
			//this.viewer.viewport.zoomBy(0.9);
			//this.viewer.viewport.applyConstraints();
		}
		else if (eventType == "specialKey" && data.code == 37 && data.state == "down") {
			// left
			this.viewer.viewport.panBy(new OpenSeadragon.Point(-0.01, 0));
			this.viewer.viewport.applyConstraints();
		}
		else if (eventType == "specialKey" && data.code == 38 && data.state == "down") {
			// up
			this.viewer.viewport.panBy(new OpenSeadragon.Point(0, -0.01));
			this.viewer.viewport.applyConstraints();
		}
		else if (eventType == "specialKey" && data.code == 39 && data.state == "down") {
			// right
			this.viewer.viewport.panBy(new OpenSeadragon.Point(0.01, 0));
			this.viewer.viewport.applyConstraints();
		}
		else if (eventType == "specialKey" && data.code == 40 && data.state == "down") {
			// down
			this.viewer.viewport.panBy(new OpenSeadragon.Point(0, 0.01));
			this.viewer.viewport.applyConstraints();
		}

		this.refresh(date);
	}
});


