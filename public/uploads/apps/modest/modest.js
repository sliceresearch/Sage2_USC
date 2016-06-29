// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/* global MM */

var modest = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";
		this.map          = null;
		this.position     = null;
		this.dragging     = null;
		this.scrollAmount = null;

		// application specific 'init'
		this.element.id = "div" + data.id;
		this.dragging     = false;
		this.position     = {x: 0, y: 0};
		this.scrollAmount = 0;

		this.roadmap = new MM.TemplatedLayer('http://otile1.mqcdn.com/tiles/1.0.0/osm/{Z}/{X}/{Y}.jpg');
		this.satellite = new MM.TemplatedLayer('http://otile1.mqcdn.com/tiles/1.0.0/sat/{Z}/{X}/{Y}.jpg');
		this.map = new MM.Map(this.element.id, [this.roadmap, this.satellite], null, [
			new MM.MouseWheelHandler(null, true)
		]);
		if (this.state.mapType == "roadmap") {
			this.map.swapLayersAt(0, 1);
		}

		var loc = new MM.Location(this.state.center.latitude, this.state.center.longitude);
		this.map.setCenterZoom(loc, this.state.zoomLevel);
		this.log("Modest map at " + JSON.stringify(loc));
		this.controls.addButton({type: "prev", sequenceNo: 7, id: "Left"});
		this.controls.addButton({type: "next", sequenceNo: 1, id: "Right"});
		this.controls.addButton({type: "up-arrow", sequenceNo: 4, id: "Up"});
		this.controls.addButton({type: "down-arrow", sequenceNo: 10, id: "Down"});

		this.controls.addButton({type: "zoom-in", sequenceNo: 8, id: "ZoomIn"});
		this.controls.addButton({type: "zoom-out", sequenceNo: 9, id: "ZoomOut"});
		this.controls.finishedAddingControls();
	},

	load: function(date) {
		if (this.map !== undefined && this.map !== null) {
			this.updateMapFromState();
			this.refresh(date);
		}
	},

	updateMapFromState: function() {
		var loc = new MM.Location(this.state.center.latitude, this.state.center.longitude);
		this.map.setCenterZoom(loc, this.state.zoomLevel);
		
		if (this.map.getLayerAt(1) === this.roadmap && this.state.mapType === "satellite") {
			this.map.swapLayersAt(0, 1);
		}
		else if (this.map.getLayerAt(1) === this.satellite && this.state.mapType === "roadmap") {
			this.map.swapLayersAt(0, 1);
		}
	},

	draw: function(date) {
	},

	resize: function(date) {
		this.map.setSize(new MM.Point(this.element.clientWidth, this.element.clientHeight));
		this.refresh(date);
	},

	event: function(eventType, position, user_id, data, date) {
		var center;

		if (eventType === "pointerPress" && (data.button === "left")) {
			this.dragging = true;
			this.position.x = position.x;
			this.position.y = position.y;
			this.refresh(date);
		} else if (eventType === "pointerMove" && this.dragging) {
			this.map.panBy(position.x - this.position.x, position.y - this.position.y);
			this.position.x = position.x;
			this.position.y = position.y;
			center = this.map.getCenter(); 
			this.state.center.latitude = center.lat;
			this.state.center.longitude = center.lon;
			this.refresh(date);
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			this.dragging = false;
			this.position.x = position.x;
			this.position.y = position.y;
			this.refresh(date);
		} else if (eventType === "pointerScroll") {
			this.scrollAmount += data.wheelDelta;
			if (this.scrollAmount >= 128) {
				// zoom out
				this.map.zoomOut();
				this.scrollAmount -= 128;
				this.state.zoomLevel = this.map.getZoom();
			} else if (this.scrollAmount <= -128) {
				// zoom in
				this.map.zoomIn();
				this.scrollAmount += 128;
				this.state.zoomLevel = this.map.getZoom();
			}
			this.refresh(date);
		} 
		else if (eventType === "keyboard") {
			if (data.character === "m" || data.character === "M" || data.character === " ") {
				if (this.state.mapType === "roadmap") {
					this.state.mapType = "satellite";
				}
				else if (this.state.mapType === "satellite") {
					this.state.mapType = "roadmap";
				}
				this.map.swapLayersAt(0, 1);
			}
			this.refresh(date);
		} else if (eventType === "specialKey") {
			if (data.code === 18 && data.state === "down") {        // alt
				this.map.zoomIn();
				this.state.zoomLevel = this.map.getZoom();
			} else if (data.code === 17 && data.state === "down") { // control
				this.map.zoomOut();
				this.state.zoomLevel = this.map.getZoom();
			} else if (data.code === 37 && data.state === "down") { // left arrow
				this.map.panLeft();
				center = this.map.getCenter(); 
				this.state.center.latitude = center.lat;
				this.state.center.longitude = center.lon;
			} else if (data.code === 38 && data.state === "down") { // up arrow
				this.map.panUp();
				center = this.map.getCenter(); 
				this.state.center.latitude = center.lat;
				this.state.center.longitude = center.lon;
			} else if (data.code === 39 && data.state === "down") { // right arrow
				this.map.panRight();
				center = this.map.getCenter(); 
				this.state.center.latitude = center.lat;
				this.state.center.longitude = center.lon;
			} else if (data.code === 40 && data.state === "down") { // down arrow
				this.map.panDown();
				center = this.map.getCenter(); 
				this.state.center.latitude = center.lat;
				this.state.center.longitude = center.lon;
			}
			this.refresh(date);
		} else if (eventType === "widgetEvent") {
			switch (data.ctrlId) {
				case "Up":
					this.map.panUp();
					center = this.map.getCenter(); 
					this.state.center.latitude = center.lat;
					this.state.center.longitude = center.lon;
					break;
				case "Down":
					this.map.panDown();
					center = this.map.getCenter(); 
					this.state.center.latitude = center.lat;
					this.state.center.longitude = center.lon;
					break;
				case "Left":
					this.map.panLeft();
					center = this.map.getCenter(); 
					this.state.center.latitude = center.lat;
					this.state.center.longitude = center.lon;
					break;
				case "Right":
					this.map.panRight();
					center = this.map.getCenter(); 
					this.state.center.latitude = center.lat;
					this.state.center.longitude = center.lon;
					break;
				case "ZoomIn":
					this.map.zoomIn();
					this.state.zoomLevel = this.map.getZoom();
					break;
				case "ZoomOut":
					this.map.zoomOut();
					this.state.zoomLevel = this.map.getZoom();
					break;
				default:
					console.log("No handler for:", data.ctrlId);
			}
			this.refresh(date);
		}
	}
});