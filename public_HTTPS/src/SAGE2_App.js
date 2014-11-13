// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var SAGE2_App = Class.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);
		this.div          = null;
		this.element      = null;
		this.resrcPath    = null;
		this.moveEvents   = "never";
		this.resizeEvents = "never";
		this.state        = {};
	
		this.startDate = null;
		this.prevDate  = null;
	
		this.t     = null;
		this.dt    = null;
		this.frame = null;
		this.fps   = null;

		this.timer  = null;
		this.maxfps = null;
		this.redraw = null;
		this.sticky = null;
		this.controls  = null;
		this.cloneable = null;
		this.enableControls  = null;
		this.requestForClone = null;
	},
	
	init: function(id, elem, width, height, resrc, date) {
		this.div     = document.getElementById(id);
		this.element = document.createElement(elem);
		this.element.className = "sageItem";
		this.element.style.zIndex = "0";
		if (elem === "div") {
			this.element.style.width  = width  + "px";
			this.element.style.height = height + "px";
		} else {
			this.element.width  = width;
			this.element.height = height;
		}
		this.div.appendChild(this.element);
		
		this.resrcPath = resrc + "/";
		this.startDate = date;

		if (this.enableControls === true)
			this.controls = new SAGE2WidgetControlBar(id);
		
		this.prevDate  = date;
		this.frame     = 0;
		
		// Measurement variables
		this.frame_sec = 0;
		this.sec       = 0;
		this.fps       = 0.0;

		// Frame rate control
		this.timer     = 0;
		this.maxFPS    = 60.0; // Big than 60, since Chrome is Vsync anyway
		this.redraw    = true;

		// Top layer
		this.layer     = null;
	},

	// Functions to create and manager another layered DVI ontop the app
	/////////////////////////////////////////////////////////////////////
	createLayer: function(backgroundColor) {
		this.layer = document.createElement('div');
		this.layer.style.backgroundColor  = backgroundColor;
		this.layer.style.position = "absolute";
		this.layer.style.padding  = "0px";
		this.layer.style.margin   = "0px";
		this.layer.style.left     = "0px";
		this.layer.style.top      = "0px";
		this.layer.style.width    = "100%";
		this.layer.style.color    = "#FFFFFF";
		this.layer.style.display  = "none";
		this.layer.style.overflow = "visible";
		this.layer.style.zIndex   = parseInt(this.div.zIndex)+1;
		this.layer.style.fontSize = Math.round(ui.titleTextSize) + "px";

		this.div.appendChild(this.layer);

		return this.layer;
	},
	showLayer: function() {
		if (this.layer) {
			// Reset its top position, just in case
			this.layer.style.top = "0px";
			this.layer.style.display = "block";
		}
	},
	hideLayer: function () {
		if (this.layer) {
			this.layer.style.display = "none";
		}
	},
	showHideLayer: function () {
		if (this.layer) {
			if (this.isLayerHidden()) this.showLayer();
			else this.hideLayer();
		}
	},
	isLayerHidden: function () {
		if (this.layer)	return (this.layer.style.display === "none");
		else return false;
	},
	/////////////////////////////////////////////////////////////////////

	preDraw: function(date) {
		this.t  = (date.getTime() - this.startDate.getTime()) / 1000; // total time since start of program (sec)
		this.dt = (date.getTime() -  this.prevDate.getTime()) / 1000; // delta time since last frame (sec)
		
		// Frame rate control
		this.timer = this.timer + this.dt;
		if (this.timer > (1.0/this.maxFPS)) {
			this.timer  = 0.0;
			this.redraw = true;			
		}
		// If we ask for more, just let it run
		if (this.maxFPS>=60.0) this.redraw = true;

		this.sec += this.dt;
	},
	
	postDraw: function(date) {
		this.prevDate = date;
		this.frame++;
	},

	// high-level function to be called a complete draw
	refresh: function (date) {
		// update time
		this.preDraw(date);
		// actual application draw
		if (this.redraw) {
			// If drawing, measure actual frame rate
			if( this.sec >= 1.0){
				this.fps       = this.frame_sec / this.sec;
				this.frame_sec = 0;
				this.sec       = 0;
			}

			this.draw(date);

			this.frame_sec++;
			this.redraw = false;	
		}
		// update time and misc
		this.postDraw(date);
	},

	// Called by SAGE2 core
	//    application can define the 'quit' method
	terminate: function () {
		if (typeof this.quit === 'function' ) {
			this.quit();
		}
	},

	// Send a resize
	sendResize: function (newWidth, newHeight) {
		var msgObject = {};
		// Add the display node ID to the message
		msgObject.node   = clientID;
		msgObject.id     = this.div.id;
		msgObject.width  = newWidth;
		msgObject.height = newHeight;
		// Send the message to the server
		wsio.emit('appResize', msgObject);
	},
	
	broadcast: function (funcName, data) {
		broadcast({app: this.div.id, func: funcName, data: data});
	},
	
	searchTweets: function(funcName, query, broadcast) {
		searchTweets({app: this.div.id, func: funcName, query: query, broadcast: broadcast});
	},

	// Prints message to local browser console and send to server
	//   accept a string as parameter: this.log("my message")
	log: function(msg) {
		if (arguments.length===0) return;
		var args;
		if (arguments.length > 1)
			args = Array.prototype.slice.call(arguments);
		else
			args = msg;
		sage2Log({app: this.div.id, message: args});
	},
});


