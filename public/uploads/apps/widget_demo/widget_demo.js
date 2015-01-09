// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


var widget_demo = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);
		this.element = null;
		this.ctx = null;
		this.resrcPath = null;
		
		
		
		this.timer = null;
		this.redraw = null;

		this.resizeEvents = "onfinish";

		// Need to set this to true in order to tell SAGE2 that you will be needing widget controls for this app
		this.enableControls = true;

		//Some variables that the widget will use to communicate with the app

		this.color = [[127,0,0],[0,127,0],[0,0,127]];
		this.colorIdx = 0; // Chooses red initially
		this.brightness = 64;
		this.displayText = "";

		
	},
	
	load: function(state, date) {
		console.log("creating controls");
		
		var plusButton2 = {
			"state": 0,
			"from":"m 0 -6 l 0 12 m 6 -6 l -12 0",
			"to":"m 6 0 l -12 0 m 12 0 l -12 0",//"m -3 0 a 6 6 180 1 0 0 1 z",
			"width":12,
			"height":12,
			"fill":"none",
			"strokeWidth": 1,
			"delay": 600,
			"textual":false,
			"animation":true
		};
		var watchButton = {
			"textual":true,
			"label":"Watch",
			"fill":"rgba(250,250,250,1.0)",
			"animation":false
		};
		
		//this.controls.addButtonType("plus", plusButton);
		this.controls.addButtonType("watch", watchButton);
		this.controls.addButton({type:"next",sequenceNo:2,action:function(date){ //Seqeunce number gives the absolute position of the button around the widget center, sequence number increases as we go counter clockwise.
			//This is executed after the button click animation occurs.
			this.colorIdx = (this.colorIdx + 1) % 3;
			this.draw(date);
		}.bind(this)});
		this.controls.addButton({type:"prev",sequenceNo:3,action:function(date){
			this.colorIdx = (this.colorIdx + 2) % 3;
			this.draw(date);
		}.bind(this)});
		this.controls.addButton({type:"rewind",sequenceNo:7,action:function(date){
			this.brightness = 64; //Reset value
			this.draw(date);
		}.bind(this)});
		this.controls.addButton({type:"watch",sequenceNo:5,action:function(date){
			this.displayText = "Pushed watch button"; //Reset value
			this.draw(date);
		}.bind(this)});


		//Alternative way to specify button type for just one button.
		var plusButton = {
			"state": 0,
			"from":"m 0 -6 l 0 12 m 6 -6 l -12 0",
			"to":"m 6 0 l -12 0 m 6 6 l 0 -12",//"m -3 0 a 6 6 180 1 0 0 1 z",
			"width":12,
			"height":12,
			"fill":"none",
			"strokeWidth": 1,
			"delay": 600,
			"textual":false,
			"animation":true
		};
		this.controls.addButton({type:plusButton,sequenceNo:8,action:function(date){
			this.displayText = "Pushed plus button"; //Reset value
			this.draw(date);
		}.bind(this)});

		
		var helpButton = {
			"textual":true,
			"label":"Help",
			"fill":"rgba(250,250,250,1.0)",
			"animation":false
		};
		this.controls.addButton({type:helpButton,sequenceNo:9,action:function(date){ // Instead of a string, the type field can be used to specify the button type data itself. 
			this.displayText = "Pushed Help button"; //Reset value
			this.draw(date);
		}.bind(this)});

		
		
		this.controls.addSeparatorAfterButtons(3,5); // Adds a small gap after button positon 3 and 5
		
		//appHandle and property are used to bind the app property to the slider knob, in this case this.brightness is bound to the knob
		//property can also be a nested value, for example this.a.b. To bind this.a.b to the knob, call using- appHandle:this and property:"a.b"
		//Only simple numerical values can be manipulated using the slider.
		var formatFunction = function(value,end){
			return value + ":" + end;
		}
		this.controls.addSlider({begin:64,end:255,increments:1,appHandle:this, property:"brightness", labelFormatFunction:formatFunction , action:function(date){
			//Perform refresh or updating actions here
			this.draw(date);
		}.bind(this)});
		this.controls.addTextInput({defaultText: "Default Text!!",action:function(text){
			this.displayText = text.split(" ")[0];
			this.draw(date);
		}.bind(this)});
		this.controls.finishedAddingControls(); // Important
	},

	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);
	
		this.ctx = this.element.getContext("2d");
		this.resrcPath = resrc;
		this.minDim = Math.min(this.element.width, this.element.height);
		
		
	},
	
	
	

	
	draw: function(date) {
		arguments.callee.superClass.preDraw.call(this, date);
		// clear canvas		
		this.ctx.clearRect(0,0, this.element.width, this.element.height);
		
        this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)" ;
		this.ctx.fillRect(0,0, this.element.width, this.element.height);
		var color = [0,0,0];
		for (var i=0;i<3;i++){
			color[i] = this.color[this.colorIdx][i] + this.brightness;
		}
		this.ctx.fillStyle = "rgb("  + color.join(",") + ")" ;
		this.ctx.fillRect(this.element.width * 0.25,this.element.height * 0.25, this.element.width * 0.50, this.element.height * 0.50);
		this.ctx.font = "16px Arial";
		this.ctx.strokeStyle = 	"rgba(0,0,0, 1.0)"; 
		this.ctx.fillStyle = "rgba(0,0,0,1.0)";
		this.ctx.fillText("Text demo, displaying first word only:", this.element.width*0.3, this.element.height*0.4);
		this.ctx.fillText(this.displayText, this.element.width*0.45, this.element.height*0.5);
		
	},
	
	resize: function(date) {
		this.draw(date);
	},
	

	
	
	//event: function( type, userId, x, y, data , date, user_color){
	event: function(type, position, userId, data, date) {
		
	}
	 
});    
