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
		this.map = null;
		this.position = null;
		this.lastZoom = null;
		this.dragging = null;
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

		// application specific 'init'	
		this.element.id = "div" + id;
		this.lastZoom = date;
		this.dragging = false;
		this.position = {x:0,y:0};

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
	},

	load: function(state, date) {
	},

	draw: function(date) {
	},

	resize: function(date) {
		this.map.setSize(new MM.Point(this.element.clientWidth, this.element.clientHeight));
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
			this.map.panBy(itemX-this.position.x, itemY-this.position.y);
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
				this.map.zoomIn();
				this.lastZoom = date;
			}
			else if (amount <= -3 && (diff>300)) {
				// zoom out
				this.map.zoomOut();
				this.lastZoom = date;
			}
		}

		else if (eventType == "specialKey" && data.code == 16 && data.state == "down") {
			// shift down
			// zoom in
			this.map.zoomIn();
		}
		else if (eventType == "specialKey" && data.code == 17 && data.state == "down") {
			// control down
			// zoom out
			this.map.zoomOut();
		}
		else if (eventType == "specialKey" && data.code == 37 && data.state == "down") {
			// left
			this.map.panLeft();
		}
		else if (eventType == "specialKey" && data.code == 38 && data.state == "down") {
			// up
			this.map.panUp();
		}
		else if (eventType == "specialKey" && data.code == 39 && data.state == "down") {
			// right
			this.map.panRight();
		}
		else if (eventType == "specialKey" && data.code == 40 && data.state == "down") {
			// down
			this.map.panDown();
		}
		
		this.refresh(date);
	}

});
