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

		this.vis = d3.select(this.element).append("vis"+this.id);

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

		this.initBarSpec();
		//updated = true; 

		//this.spec = "uploads/apps/vega_vis_app/data/spec.json";
		//this.parse(this.spec);
  		

  		// this.sendResize(spec.width, spec.height);

	},

	load: function(date) {
		console.log('vega_vis_app> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
		console.log('vega_vis_app> Draw with state value', this.state.value);

		//this.spec = this.state.specFile;//"uploads/apps/vega_vis_app/data/spec.json";
		//console.log(this.spec);
		if(this.state.type == "bar"){
		
			this.barSpec.marks[0].properties.update.fill.value = this.state.color; //"red"; 
			this.barSpec.axes[0].title = this.state.x;
			this.barSpec.axes[1].title = this.state.y;
			this.barSpec.data[0].values = this.state.data;
		}

		this.parse(this.barSpec);

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
  		if( updated )
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
  		//vg.embed("#vis", spec, this.vegaCallbackFunc);

	},

	vegaCallback: function(error, chart) { 
		// chart( {el:"vis"} ).update(); 
		this.view = chart({el:'vis'+this.id});
		this.view.update();
  		
		//set width and height appropriately
		paddingWidth = this.barSpec.padding.left + this.barSpec.padding.right;
		paddingHeight = this.barSpec.padding.top + this.barSpec.padding.bottom;
  		this.view.width(this.element.clientWidth-paddingWidth).height(this.element.clientHeight-paddingHeight).renderer('svg').update();
  		
		//this.view.props.marks.update.fill.value = "red";


  		// console.log("call back " + this.view);
  		// this.test = "I changed";
  		// console.log(this.test);
  		//this.view.width(1024).height(768).update({duration: 2000});

	},

	callback2(){
		console.log("it worked!");
	},





	initBarSpec: function(){
		this.barSpec = {
			  "width": 1200,
			  "height": 600,
			  "padding": {"top": 10, "left": 60, "bottom": 60, "right": 30},
			  "data": [
			    {
			      "name": "table",
			      "values": [
			        // {"x": 1,  "y": 28}, {"x": 2,  "y": 55},
			        // {"x": 3,  "y": 43}, {"x": 4,  "y": 91},
			        // {"x": 5,  "y": 81}, {"x": 6,  "y": 53},
			        // {"x": 7,  "y": 19}, {"x": 8,  "y": 87},
			        // {"x": 9,  "y": 52}, {"x": 10, "y": 48},
			        // {"x": 11, "y": 24}, {"x": 12, "y": 49},
			        // {"x": 13, "y": 87}, {"x": 14, "y": 66},
			        // {"x": 15, "y": 17}, {"x": 16, "y": 27},
			        // {"x": 17, "y": 68}, {"x": 18, "y": 16},
			        // {"x": 19, "y": 49}, {"x": 20, "y": 15}
			      ]
			    }
			  ],
			  "scales": [
			    {
			      "name": "x",
			      "type": "ordinal",
			      "range": "width",
			      "domain": {"data": "table", "field": "x"}
			    },
			    {
			      "name": "y",
			      "type": "linear",
			      "range": "height",
			      "domain": {"data": "table", "field": "y"},
			      "nice": true
			    }
			  ],
			  "axes": [
			    {
			    	"type": "x", 
			    	"scale": "x",
				    "properties": {
				      	 "ticks": {
				         "stroke": {"value": "black"}
				       },
				       "majorTicks": {
				         "strokeWidth": {"value": 1}
				       },
				       "labels": {
				         "fill": {"value": "black"},
				         "angle": {"value": 50},
				         "fontSize": {"value": 10},
				         "align": {"value": "left"},
				         "baseline": {"value": "middle"}				       },
				       "title": {
				         "fontSize": {"value": 16}
				       },
				       "axis": {
				         "stroke": {"value": "black"},
				         "strokeWidth": {"value": 1.0}
				       }
				     }
				},
			    {"type": "y", "scale": "y"}
			  ],
			  "marks": [
			    {
			      "type": "rect",
			      "from": {"data": "table"},
			      "properties": {
			        "enter": {
			          "x": {"scale": "x", "field": "x"},
			          "width": {"scale": "x", "band": true, "offset": -1},
			          "y": {"scale": "y", "field": "y"},
			          "y2": {"scale": "y", "value": 0}
			        },
			        "update": {
			          "x": {"scale": "x", "field": "x"},
			          "width": {"scale": "x", "band": true, "offset": -1},
			          "y": {"scale": "y", "field": "y"},
			          "y2": {"scale": "y", "value": 0},
			          "fill": {"value": "steelblue"}
			        },
			        "hover": {
			          "fill": {"value": "red"}
			        }
			      }
			    }
			  ]
			};
	}
});
