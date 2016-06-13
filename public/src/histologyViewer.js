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

var histologyViewer = SAGE2_App.extend( {

	init: function(data) {
		// call super-class 'init'
        this.SAGE2Init("div", data);

        this.resizeEvents = "continuous";
		this.viewer = null;
		this.lastZoom = null;
        this.enableControls = true;

        this.rectButton = {
            "from": "m -4 -4 l 0 8 l 8 0 l 0 -8 z",
            "to": "m -4 -4 l 0 8 l 8 0 l 0 -8 z",
            "width": 10,
            "height": 10,
            "strokeWidth": 1,
            "fill": "none",
            "state": null,
            "delay": 400,
            "textual": false,
            "animation": false
        };

		// application specific 'init'
		this.element.id = "div" + data.id;
		this.lastZoom = data.date;
		this.events = [];
        this.annotations = [];

		// Add the menu
        this.controls.addButton({type:this.rectButton, position:3, identifier:"RectangularAnnotation"});
		this.controls.finishedAddingControls();
        this.updateAppFromState();
	},

    /* EVENTS */
    fileLoaded: function(event) {
        var _this = event.userData;
        if(_this.state.zoom !== null ) {
            _this.viewer.viewport.zoomTo(_this.state.zoom);
        }
        if(_this.state.panX !== null) {
            var p = new OpenSeadragon.Point(_this.state.panX, _this.state.panY);
            _this.viewer.viewport.panTo(p);
        }

        // Load annotations
        for(var k in _this.state.annotations) {
            var a = _this.state.annotations[k];
            var layer = _this.createLayer(a.color);
            var rect = new OpenSeadragon.Rect(a.x, a.y, a.width, a.height);
            _this.viewer.drawer.addOverlay(layer, rect);
            _this.annotations.push({"color": a.color, "rect": rect});
        }
    },

    /* END EVENTS */

    updateAppFromState: function() {
        // Format file
        var url = this.resrcPath;

        this.viewer = OpenSeadragon({
			id: this.element.id,      // suppporting div
			// change tileSources for your dataset
		    tileSources: this.state.absolute_url,
            showNavigator: true,
            showNavigationControl: false,
            autoHideControls: false,
            maxZoomLevel: 100
        });
        this.viewer.setMouseNavEnabled(false);
        this.viewer.addHandler('open', this.fileLoaded, this);

        },

	draw: function(date) {
	},

	resize: function(date) {
		this.refresh(date);
	},

	event: function(eventType, pos, user_id, data, date) {

        if (eventType === "pointerPress" && (data.button === "left") ) {
            var osCurPos = new OpenSeadragon.Point(pos.x, pos.y);
            var vpCurPos = this.viewer.viewport.pointFromPixel(osCurPos);
            if( this.events[user_id.id] === undefined || this.events[user_id.id] === null ){
                this.events[user_id.id] = {};
            }
            this.events[user_id.id].prevPos = {};
            if( this.events[user_id.id].eventState === "annotateRectStart" ) {
                this.events[user_id.id].activeLayer = this.createLayer(user_id.color);
                this.events[user_id.id].vpStartPos = vpCurPos;
                // top left.x, top left y, width, height
                var rect = new OpenSeadragon.Rect(vpCurPos.x, vpCurPos.y, 0, 0);
                this.annotations.push({"color": user_id.color, "rect": rect});
                this.state.annotations.push({"color": user_id.color});
                this.events[user_id.id].idx = this.annotations.length - 1;
                this.viewer.drawer.addOverlay(this.events[user_id.id].activeLayer, rect);
                this.events[user_id.id].eventState = "annotateRectDrag";
            } else {
                this.events[user_id.id].eventState = "pan";
            }
            this.events[user_id.id].prevPos.x = pos.x;
            this.events[user_id.id].prevPos.y = pos.y;
        }
        else if (eventType === "pointerMove" && this.events[user_id.id] !== undefined) {
            var osCurPos = new OpenSeadragon.Point(pos.x, pos.y);
            var vpCurPos = this.viewer.viewport.pointFromPixel(osCurPos);
            if(this.events[user_id.id].eventState === "annotateRectDrag") {

                var width = Math.abs(this.events[user_id.id].vpStartPos.x - vpCurPos.x);
                var height = Math.abs(this.events[user_id.id].vpStartPos.y - vpCurPos.y);

                var rec = this.annotations[this.events[user_id.id].idx].rect;
                rec.width = width;
                rec.height = height;
                this.viewer.drawer.updateOverlay(this.events[user_id.id].activeLayer, rec);
            } else if(this.events[user_id.id].eventState === "pan") {
                // need to turn animation off here or the pan stutters
                var delta = new OpenSeadragon.Point(this.events[user_id.id].prevPos.x - pos.x, this.events[user_id.id].prevPos.y - pos.y);
                this.viewer.viewport.panBy(
                    this.viewer.viewport.deltaPointsFromPixels(delta)
                );
                this.events[user_id.id].prevPos.x = pos.x;
                this.events[user_id.id].prevPos.y = pos.y;
                this.state.panX = this.viewer.viewport.getCenter(false).x;
                this.state.panY = this.viewer.viewport.getCenter(false).y;
            }
        }
        else if (eventType === "pointerRelease" && (data.button === "left") && this.events[user_id.id] !== undefined) {
            this.events[user_id.id].prevPos.x = pos.x;
            this.events[user_id.id].prevPos.y = pos.y;
            this.events[user_id.id].eventState = "idle";
            // Save annotations.
            // Create temp array
            var tmpAnnotations = [];
            for(var k in this.annotations) {
                var rect = {};
                rect.width = this.annotations[k].rect.width;
                rect.height = this.annotations[k].rect.height;
                rect.x = this.annotations[k].rect.x;
                rect.y = this.annotations[k].rect.y;
                rect.color = this.annotations[k].color;
                tmpAnnotations.push(rect);
            }
            this.save({"file": this.state.relative_url, "annotations": tmpAnnotations});
        }

		// Scroll events for zoom
		else if (eventType === "pointerScroll") {
			var amount = data.wheelDelta;
			var diff = date - this.lastZoom;

			if (amount <= -3 && (diff>300)) {
				this.viewer.viewport.zoomBy(1.2);
				this.viewer.viewport.applyConstraints();
                this.lastZoom = date;
                this.state.zoom = this.viewer.viewport.getZoom(false);
            }
			else if (amount >= 3 && (diff>300)) {
				this.viewer.viewport.zoomBy(0.8);
				this.viewer.viewport.applyConstraints();
                this.lastZoom = date;
                this.state.zoom = this.viewer.viewport.getZoom(false);
			}
        }
        else if (eventType === "widgetEvent") {
            switch(data.identifier) {
                case "RectangularAnnotation":
                    if( this.events[user_id.id] === undefined || this.events[user_id.id] === null ) {
                        this.events[user_id.id] = {};
                        this.events[user_id.id].prevPos = {};
                    }
                    this.events[user_id.id].eventState = "annotateRectStart";
                    break;
                default:
                    console.log("No handler for:", data.identifier);
                    break;
            }
        }

		this.refresh(date);
	},

    createLayer: function(color) {
        var elem = document.createElement('a');
        elem.style.borderColor = color;
        elem.style.borderStyle = "solid";
        elem.style.borderWidth = "4px";

        return elem;
    }
});
