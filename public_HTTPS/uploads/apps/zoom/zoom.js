// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file

var zoom = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous";
		this.viewer = null;
		this.lastZoom = null;
		this.dragging = null;
		this.position = null;
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);
		
		// application specific 'init'
		this.element.id = "div" + id;
		this.lastZoom = date;
		this.dragging = false;
		this.position = {x:0,y:0};

		// create the image viewer with the right data and path
		this.viewer = OpenSeadragon({
			id: this.element.id,      // suppporting div
			prefixUrl:   this.resrcPath + "/images/",
			// change tileSources for your dataset
			tileSources: this.resrcPath + "rat-brain.dzi"
		});
	},
	
	load: function(state, date) {
	},
	
	draw: function(date) {
	},
	
	resize: function(date) {
		this.refresh(date);
	},

	event: function(eventType, user_id, itemX, itemY, data, date) {
		//console.log("div event", eventType, user_id, itemX, itemY, data, date);

		if (eventType === "pointerPress" && (data.button === "left") ) {
			this.dragging = true;
			this.position.x = itemX;
			this.position.y = itemY;
		}
		if (eventType === "pointerMove" && this.dragging ) {
			//var center = this.viewer.viewport.pixelFromPoint( this.viewer.viewport.getCenter( true ) );
                	//var target = this.viewer.viewport.pointFromPixel(
				//new OpenSeadragon.Point(  (itemX-this.position.x),  (itemY-this.position.y) ) );
			//var offset = new OpenSeadragon.Point(this.position.x-itemX, this.position.y-itemY);
			//console.log("off ", offset);
			//var pt = this.viewer.viewport.viewerElementToViewportCoordinates(offset);
			//console.log("pt ", pt);
			//this.viewer.viewport.panTo(target, false);
			//this.viewer.viewport.applyConstraints();

			this.position.x = itemX;
			this.position.y = itemY;
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
			this.dragging = false;
			this.position.x = itemX;
			this.position.y = itemY;
		}

		// Scroll events for zoom
		if (eventType === "pointerScroll") {
			var amount = data.wheelDelta;
			var diff = date - this.lastZoom;
			if (amount >= 3 && (diff>300)) {
				// zoom in
				this.viewer.viewport.zoomBy(1.2);
				this.viewer.viewport.applyConstraints();
				this.lastZoom = date;
			}
			else if (amount <= -3 && (diff>300)) {
				// zoom out
				this.viewer.viewport.zoomBy(0.8);
				this.viewer.viewport.applyConstraints();
				this.lastZoom = date;
			}
		}

		if (eventType == "specialKey" && data.code == 16 && data.state == "down") {
			// shift down
			// zoom in
			this.viewer.viewport.zoomBy(1.1);
			this.viewer.viewport.applyConstraints();
		}
		else if (eventType == "specialKey" && data.code == 17 && data.state == "down") {
			// control down
			// zoom out
			this.viewer.viewport.zoomBy(0.9);
			this.viewer.viewport.applyConstraints();
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


