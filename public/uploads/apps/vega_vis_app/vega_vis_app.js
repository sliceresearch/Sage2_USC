//
// SAGE2 application: vega_vis_app
// by: Jillian Aurisano <jillian.aurisano@gmail.com>
//
// Copyright (c) 2015
//

var vega_vis_app = SAGE2_App.extend( {
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);

		this.vis = d3.select(this.element).append("vis");

		// Set the background to black
		this.element.style.backgroundColor = 'white';

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

		this.view = null;//where we will put the view object

		this.vegaCallbackFunc = this.vegaCallback.bind(this);

		this.spec = "uploads/apps/vega_vis_app/data/spec.json";
		this.parse(this.spec);
  		// this.sendResize(spec.width, spec.height);

	},

	load: function(date) {
		console.log('vega_vis_app> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
		console.log('vega_vis_app> Draw with state value', this.state.value);

	},

	resize: function(date) {
		updated = false;
		if( this.element.clientWidth > 400 ){
  			this.view.width(this.element.clientWidth-50);
  			updated = true;
  		}
  		if( this.element.clientWidth > 400 ){
  			this.view.height(this.element.clientHeight-59);
  			updated = true;	
  		}
  		if
  		this.view.renderer('svg').update();

		this.refresh(date);
	},


	move: function(date) {
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
		}
		else if (eventType === "pointerMove" && this.dragging) {
		}
		else if (eventType === "pointerRelease" && (data.button === "left")) {
		}

		// Scroll events for zoom
		else if (eventType === "pointerScroll") {
		}
		else if (eventType === "widgetEvent"){
		}
		else if (eventType === "keyboard") {
			if (data.character === "m") {
				this.refresh(date);
			}
		}
		else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") { // left
				this.refresh(date);
			}
			else if (data.code === 38 && data.state === "down") { // up
				this.refresh(date);
			}
			else if (data.code === 39 && data.state === "down") { // right
				this.refresh(date);
			}
			else if (data.code === 40 && data.state === "down") { // down
				this.refresh(date);
			}
		}
	},

	parse: function(spec) {
		console.log("parse");
  		vg.parse.spec(spec, this.vegaCallbackFunc);

	},

	vegaCallback: function(error, chart) { 
		// chart( {el:"vis"} ).update(); 
		this.view = chart({el:'vis'});
		this.view.update();
  		this.view.width(this.element.clientWidth-50).height(this.element.clientHeight-50).renderer('svg').update();
  		// console.log("call back " + this.view);
  		// this.test = "I changed";
  		// console.log(this.test);
  		//this.view.width(1024).height(768).update({duration: 2000});

	},

	callback2(){
		console.log("it worked!");
	}
});
