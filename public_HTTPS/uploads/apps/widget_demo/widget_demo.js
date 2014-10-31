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
		this.controls.addButtonGroup();
		this.controls.addButton({type:"next",action:function(appHandle, date){
			//This is executed after the button click animation occurs.
			appHandle.colorIdx = (appHandle.colorIdx + 1) % 3;
			appHandle.draw(date);
		}});
		this.controls.addButton({type:"prev",action:function(appHandle, date){
			appHandle.colorIdx = (appHandle.colorIdx + 2) % 3;
			appHandle.draw(date);
		}});
		this.controls.addButtonGroup();
		this.controls.addButton({type:"rewind",action:function(appHandle, date){
			appHandle.brightness = 64; //Reset value
			appHandle.draw(date);
		}});
		//appHandle and property are used to bind the app property to the slider knob, in this case this.brightness is bound to the knob
		//property can also be a nested value, for example this.a.b. To bind this.a.b to the knob, call using- appHandle:this and property:"a.b"
		//Only simple numerical values can be manipulated using the slider.
		this.controls.addSlider({begin:64,end:255,increments:1,appHandle:this, property:"brightness", action:function(appHandle, date){
			//Perform refresh or updating actions here
			appHandle.draw(date);
		}});
		this.controls.addTextInput({action:function(appHandle, text){
			appHandle.displayText = text;
			console.log(appHandle.displayText);
			appHandle.draw(date);
		}});
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
		this.ctx.fillText(this.displayText.split(" ")[0], this.element.width*0.45, this.element.height*0.5);
		
	},
	
	resize: function(date) {
		this.draw(date);
	},
	

	
	
	//event: function( type, userId, x, y, data , date, user_color){
	event: function(type, position, userId, data, date) {
		
	}
	 
});    
