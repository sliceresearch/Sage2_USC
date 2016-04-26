//
// SAGE2 application: articulate_console
// by: Krupa Patel <kpate216@uic.edu>
//
// Copyright (c) 2015
//

var heat_map = SAGE2_App.extend( {
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);

		// Set the background to black
		this.element.style.backgroundColor = 'black';

		// move and resize callbacks
		this.resizeEvents = "continuous";
		this.moveEvents   = "continuous";

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;


		this.map          = null;
		this.position     = null;
		this.lastZoom     = null;
		this.dragging     = null;
		this.scrollAmount = null;

		// application specific 'init'	
		this.element.id = "div" + data.id;
		this.lastZoom     = data.date;
		this.dragging     = false;
		this.position     = {x:0, y:0};
		this.scrollAmount = 0;


		var toner = new MM.TemplatedLayer("http://tile.stamen.com/toner/{Z}/{X}/{Y}.png");
		var bing = new MM.TemplatedLayer("http://ecn.t0.tiles.virtualearth.net/tiles/r{Q}?" +
    		"g=689&mkt=en-us&lbl=l1&stl=h");
		var osm = new MM.TemplatedLayer("http://tile.openstreetmap.org/{Z}/{X}/{Y}.png");
		this.map       = new MM.Map(this.element.id, bing, null, [
			new MM.MouseWheelHandler(null, true)
		]);
		var chicago  = new MM.Location(41.8781, -87.6298);
		this.map.setCenterZoom(chicago, 14);
		this.log("Modest map at " + JSON.stringify(chicago));

		this.canvasDiv = document.createElement('div');

		// Create the extra canvas
		this.mycanvas = document.createElement("canvas");
		this.mycanvas.width  = data.width;
		this.mycanvas.height = data.height;
		this.mycanvas.style.position = "absolute";
		this.mycanvas.id = data.id + "_canvas";
		this.element.appendChild(this.mycanvas);
		this.ctx = this.mycanvas.getContext('2d');

		console.log(this.map);

		//color gradient
		this.colors = [ "255,245,240", 
						"254,224,210", 
						"252,187,161", 
						"252,146,114", 
						"251,106,74", 
						"239,59,44", 
						"203,24,29", 
						"165,15,21", 
						"103,0,13" 
					]; 
		this.partition = Math.round( this.state.maxValue / this.colors.length ); 

		//this.updateTitle("title");	

	},

	load: function(date) {
		console.log('heat_map Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
		
		this.ctx.clearRect(0, 0, this.mycanvas.width, this.mycanvas.height);


		for(i = 0; i < this.state.data.length; i++){

			mmLoc = new com.modestmaps.Location(this.state.data[i].latitude, this.state.data[i].longitude);
			p = this.map.locationPoint( mmLoc );
			
			mmLoc2 = new com.modestmaps.Location(this.state.data[i].latitude+.001, this.state.data[i].longitude+.001);
			p2 = this.map.locationPoint( mmLoc2 );
			xDim = p2.x - p.x;
			yDim = p.y - p2.y;

 			idx = Math.round( this.state.data[i].value / this.colors.length );
			this.ctx.fillStyle = "rgba(" + this.colors[idx] + ", .5)";
			this.ctx.fillRect(p.x, p.y, xDim, yDim);
		}

		this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
		this.ctx.fillRect(0, 0, this.element.width, this.element.height);

	},

	resize: function(date) {
		this.mycanvas.width = this.element.clientWidth;
		this.mycanvas.height = this.element.clientHeight; 
		this.refresh(date);

	},
	move: function(date) {
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
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
			this.refresh(date);
		}
	}
});
