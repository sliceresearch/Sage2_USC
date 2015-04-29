// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


var modest = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous"; // "onfinish";
		this.map          = null;
		this.position     = null;
		this.lastZoom     = null;
		this.dragging     = null;
		this.scrollAmount = null;
	},

	init: function(data) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, "div", data);

		// application specific 'init'	
		this.element.id = "div" + data.id;
		this.lastZoom     = data.date;
		this.dragging     = false;
		this.position     = {x:0, y:0};
		this.scrollAmount = 0;

		var template   = 'http://{S}tile.openstreetmap.org/{Z}/{X}/{Y}.png';
		var subdomains = ['', 'a.', 'b.', 'c.'];
		var provider   = new MM.TemplatedLayer(template, subdomains);
		this.map       = new MM.Map(this.element.id, provider, null, [
			new MM.MouseWheelHandler(null, true)
		]);
		var london = new MM.Location(51.5001524, -0.1262362);
		var sf     = new MM.Location(37.7749295, -122.4194155);
		this.map.setCenterZoom(sf, 14);
		this.log("Modest map at " + JSON.stringify(sf));
		this.controls.addButton({type:"prev",sequenceNo:7, id:"Left"});
		this.controls.addButton({type:"next",sequenceNo:1, id:"Right"});
		this.controls.addButton({type:"up-arrow",sequenceNo:4, id:"Up"});
		this.controls.addButton({type:"down-arrow",sequenceNo:10, id:"Down"});
				
		this.controls.addButton({type:"zoom-in",sequenceNo:8, id:"ZoomIn"});
		this.controls.addButton({type:"zoom-out",sequenceNo:9, id:"ZoomOut"});
		this.controls.finishedAddingControls();
	},

	load: function(state, date) {
	},

	draw: function(date) {
	},

	resize: function(date) {
		this.map.setSize(new MM.Point(this.element.clientWidth, this.element.clientHeight));
		this.refresh(date);
	},

	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left") ) {
			this.dragging = true;
			this.position.x = position.x;
			this.position.y = position.y;
			
			this.refresh(date);
		}
		else if (eventType === "pointerMove" && this.dragging ) {
			this.map.panBy(position.x-this.position.x, position.y-this.position.y);
			this.position.x = position.x;
			this.position.y = position.y;
			
			this.refresh(date);
		}
		else if (eventType === "pointerRelease" && (data.button === "left") ) {
			this.dragging = false;
			this.position.x = position.x;
			this.position.y = position.y;
			
			this.refresh(date);
		}

		// Scroll events for zoom
		else if (eventType === "pointerScroll") {
			this.scrollAmount += data.wheelDelta;
			
			if (this.scrollAmount >= 128) {
				// zoom out
				this.map.zoomOut();
				this.lastZoom = date;
				
				this.scrollAmount -= 128;
			}
			else if (this.scrollAmount <= -128) {
				// zoom in
				this.map.zoomIn();
				this.lastZoom = date;
				
				this.scrollAmount += 128;
			}
			
			this.refresh(date);
		}

		else if (eventType === "specialKey") {
			if (data.code === 18 && data.state === "down") {      // alt
				// zoom in
				this.map.zoomIn();
			}
			else if (data.code === 17 && data.state === "down") { // control
				// zoom out
				this.map.zoomOut();
			}
			else if (data.code === 37 && data.state === "down") { // left
				this.map.panLeft();
			}
			else if (data.code === 38 && data.state === "down") { // up
				this.map.panUp();
			}
			else if (data.code === 39 && data.state === "down") { // right
				this.map.panRight();
			}
			else if (data.code === 40 && data.state === "down") { // down
				this.map.panDown();
			}
			
			this.refresh(date);
		}
		else if (eventType === "widgetEvent"){
			switch(data.ctrlId){
				case "Up":
					this.map.panUp();
					break;
				case "Down":
					this.map.panDown();
					break;
				case "Left":
					this.map.panLeft();
					break;
				case "Right":
					this.map.panRight();
					break;
				case "ZoomIn":
					this.map.zoomIn();
					break;
				case "ZoomOut":
					this.map.zoomOut();
					break;
				default:
					console.log("No handler for:", data.ctrlId);
			}
		}
	}

});
