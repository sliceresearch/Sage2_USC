// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


module.exports = SAGE2_App.extend( {

	init: function(data) {
		this.SAGE2Init("canvas", data);
		this.timer = null;
		this.resizeEvents = "onfinish";

		//Some variables that the widget will use to communicate with the app

		this.color = [[127,0,0],[0,127,0],[0,0,127]];
		this.colorIdx = 0; // Chooses red initially
		this.brightness = 64;
		this.displayText = "";
		
	
		this.ctx = this.element.getContext('2d');
		this.minDim = Math.min(this.element.width, this.element.height);
		this.appInit(data.date);
	},
	
	load: function(date) {
	},

	appInit: function(date){
		this.playPauseHandle = this.controls.addButton({type:"play-pause",sequenceNo:1, id:"PlayPause"});
		this.controls.addButton({type:"stop",sequenceNo:2, id:"Stop"});
		this.controls.addButton({type:"mute",sequenceNo:3, id:"Mute"});
		this.controls.addButton({type:"loop",sequenceNo:4, id:"Loop"});
		this.controls.addButton({type:"play-stop",sequenceNo:5, id:"PlayStop"});
		this.controls.addButton({type:"next",sequenceNo:6, id:"Next"});
		this.controls.addButton({type:"prev",sequenceNo:7, id:"Previous"});
		this.controls.addButton({type:"up-arrow",sequenceNo:8, id:"Up"});
		this.controls.addButton({type:"down-arrow",sequenceNo:9, id:"Down"});
		this.controls.addButton({type:"zoom-in",sequenceNo:10, id:"ZoomIn"});
		this.controls.addButton({type:"zoom-out",sequenceNo:11, id:"ZoomOut"});
		this.controls.addButton({type:"rewind",sequenceNo:12, id:"Rewind"});
		this.controls.addButton({type:"fastforward",sequenceNo:13, id:"FastForward"});
		this.controls.addButton({type:"duplicate",sequenceNo:14, id:"Duplicate"});
		this.controls.addButton({type:"new",sequenceNo:15, id:"New"});
		
		//this.controls.addButton({type:"new",sequenceNo:15, id:"New"});
		

		var watchButton = {
			"textual":true,
			"label":"Watch",
			"fill":"rgba(250,250,250,1.0)",
			"animation":false
		};
		
		this.controls.addButtonType("watch", watchButton);
		
		this.controls.addButton({type:"watch",sequenceNo:16, id:"Watch"});


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
		this.buttonHandle = this.controls.addButton({type:plusButton,sequenceNo:17, id:"Plus"});

		this.controls.addButton({type:"remote",sequenceNo:18, id:"Remote"});
		this.controls.addButton({type:"shareScreen",sequenceNo:19, id:"ShareScreen"});
	
		//appHandle and property are used to bind the app property to the slider knob, in this case this.brightness is bound to the knob
		//property can also be a nested value, for example this.a.b. To bind this.a.b to the knob, call using- appHandle:this and property:"a.b"
		//Only simple numerical values can be manipulated using the slider.
		var formatFunction = function(value,end){
			return value + ":" + end;
		};
		this.controls.addSlider({
			id:"Brightness",
			begin:64,
			end:255,
			increments:1,
			caption:"Val",
			appHandle:this, 
			property:"brightness", 
			labelFormatFunction:formatFunction
		});
		/*this.controls.addTextInput({defaultText: "Default Text!!",action:function(text){
			this.displayText = text.split(" ")[0];
			this.draw(date);
		}.bind(this)});*/
		this.controls.finishedAddingControls(); // Important
	},
	

	
	draw: function(date) {
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
	event: function(eventType, position, userId, data, date) {
		if (eventType === "widgetEvent"){
			switch(data.ctrlId){
				case "PlayPause":
					this.displayText = (this.playPauseHandle.state === 0)? "Paused" : "Playing"; //Reset value
					break;
				case "Stop":
					if(this.playPauseHandle.state === 1){
						this.playPauseHandle.state = 0;
						this.displayText =  "Stopped"; 
					}
					else
						this.displayText =  "Stop button pressed";
					break;
				case "Next":
					this.displayText =  "Next button pressed"; 
					this.colorIdx = (this.colorIdx + 1) % 3;
					break;
				case "Previous":
					this.displayText =  "Prev button pressed"; 
					this.colorIdx = (this.colorIdx + 1) % 3;
					break;
				case "Rewind":
					this.displayText =  "Rewind button pressed"; 
					this.brightness = 64;
					break;
				case "FastForward":
					this.displayText =  "Fastforward button pressed"; 
					this.brightness = 255;
					break;
				case "Mute":
				case "Loop":
				case "PlayStop":
				case "Up":
				case "Down":
				case "ZoomIn":
				case "ZoomOut":
				case "Duplicate":
				case "New":
				case "Watch":
				case "Plus":
					this.displayText =  data.ctrlId + " button pressed"; 
					break;

				case "Brightness":
					if (data.action !== "sliderRelease"){
						return;
					}
					break;
				
				default:
					console.log("No handler for:", data.ctrlId);
					return;
			}
			this.draw(date);
		}
	}
	 
});    
