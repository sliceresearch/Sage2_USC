// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014
//
// Authors: Victor Mateevitsi <mvictoras@gmail.com>

var histoViewer = SAGE2_App.extend( {
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
			//tileSources: this.resrcPath + "chicago.dzi"
			tileSources: this.resrcPath + "/images/" + "Liver.dzi",
            showNavigator: true,
            showNavigationControl: false,
            autoHideControls: false,
            maxZoomLevel: 100
        });
	},

	load: function(state, date) {
	},

	draw: function(date) {
	},

	resize: function(date) {
		this.refresh(date);
	},

	event: function(eventType, pos, user_id, data, date) {
		//console.log("Zoom event", eventType, position, user_id, data, date);

        if (eventType === "pointerPress" && (data.button === "left") ) {
            this.dragging = true;
            this.position.x = pos.x;
            this.position.y = pos.y;
        }
        if (eventType === "pointerMove" && this.dragging ) {
			// need to turn animation off here or the pan stutters
            var delta = new OpenSeadragon.Point(this.position.x - pos.x, this.position.y - pos.y);
            this.viewer.viewport.panBy(
                this.viewer.viewport.deltaPointsFromPixels(delta)
            );
			this.position.x = pos.x;
			this.position.y = pos.y;
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
			this.dragging = false;
			this.position.x = pos.x;
			this.position.y = pos.y;
		}

		// Scroll events for zoom
		if (eventType === "pointerScroll") {
			var amount = data.wheelDelta;
			var diff = date - this.lastZoom;

			if (amount >= 3 && (diff>300)) {
				this.viewer.viewport.zoomBy(1.2);
				this.viewer.viewport.applyConstraints();
                this.lastZoom = date;
			}
			else if (amount <= -3 && (diff>300)) {
				this.viewer.viewport.zoomBy(0.8);
				this.viewer.viewport.applyConstraints();
            this.lastZoom = date;
			}
		}

		this.refresh(date);
	}
});
