### SAGE2 Application Methods:
| Method                                        | Parameters                                               |
| --------------------------------------------- | -------------------------------------------------------- |
| `init(id, width, height, resrc, date)`        | `id` is canvas element id, `width` is the initial application width, `height` is the initial application height, `resrc` is path to resource directory, `date` is the date |
| `load(state, date)`                           | `state` is the initial application state (eg. initial data to display), `date` is the date
| `draw(date)`                                  | `date` is the date (used to calculate t and dt for animations). Within your application, call 'refresh' if you need a redraw. If it's interactive application, you can enable 'animation' in the file "instruction.json". the default frame rate is 60fps. Maximum frame rate can be controlled by the variable maxFPS (`this.maxFPS = 20.0` for instance) |
| `resize(date)`                                | `date` is the date. Application can trigger a resize if needed by calling `this.sendResize (newWidth, newHeight)` |
| `moved(px,py, wx,wy, date)`  | application was moved to (px,py) position in wall space (top-left corner), (wx,wy) contains the size of the wall|
| `event(type, position, user, data, date)`     | `type` is the type of event, `position` contains the x and y positions of the event, `user` contains data about the user who triggered the event, `data` is an object containing extra data about the event, `date` is the date.  See event description below.|
| `quit()`                                      | called when an application is closed |

## Boiler-plate for a canvas application

```
var myApp = SAGE2_App.extend( {
	construct: function() {
		// call the constructor of the base class
		arguments.callee.superClass.construct.call(this);

		// initialize your variables
		this.myvalue = 5.0;

		this.resizeEvents = "continuous";//see below for other options
	},

	init: function(id, width, height, resrc, date) {    
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, <html-tag container for your app (eg. img, canvas)>, width, height, resrc, date);

		// application specific 'init'
		this.log("Init");
	},

	//load function allows application to begin with a particular state.  Needed for remote site collaboration. 
	load: function(state, date) {
        //your load code here- state should define the initial/current state of the application
	},

	draw: function(date) {
		// application specific 'draw'
		this.log("Draw");

		//may need to update state here
	},

	resize: function(date) {
		// to do:  may be a super class resize
		// or your resize code here
		this.refresh(date); //redraw after resize
	},

	event: function(type, position, user, data, date) {
		// see event handling description below
        
		// may need to update state here
        
		// may need to redraw 
		this.refresh(date);
	},

	moved: function(px, py, wx, wy, date) {
		// px, py : position in wall coordinate, top-left corner of the window
		// wx, wy : width and height of the wall
               // date: when it happened
               // may need to redraw 
		this.refresh(date);
       },

	quit: function() {
		// It's the end
		this.log("Done");
	}
});
```

## Function Descriptions

### Construct

### Init

### Draw

### Resize

### Load

### Event

### Quit
```
#!javascript

event: function(type, position, user, data, date) {

}

```
type can be any one of the following: 

* pointerPress (button down) - data.button will indicate whether it is 'left' or 'right' button that caused the event

* pointerRelease (button up) - data.button will indicate whether it is 'left' or 'right' button that caused the event

* pointerMove 

* pointerDoubleClick (left button double click)

* keyboard (printable key events from the keyboard) - data.code is the character code, data.character is the printable character's string

* specialKey (key events for all keys on the keyboard including Backspace, Delete, Shift, etc...) - data.code is the character code, data.state is 'up' or 'down'

position has x and y to give the position of the event.

user has id, label, and color to describe the user who generated the event

date object may be used for synchronizing.


## External Libraries

## How to write an app

### instructions.json

### load into app library

## Widgets
Four different types of widgets are available for custom applications. Namely: 

* Buttons 

* Sliders 

* Text Input (Single line) and 

* Labels  

Any application may request SAGE2 to enable widget support for that application. This is done setting the enableControls property to true (this can be done as a part of the construct function).
```
construct: function() {
        ...
        this.enableControls = true;
}

init: function(id, width, height, resrc, date) {
        ...
        this.controls.<addWidget>(paramObject);
}

```

### Button

To add a button to the widget bar, the application may call addButton function on the controls. AddButton function takes one object with two properties, namely type and action. Type specifies the type of the button (appearance and animation of the button) and action is the callback that is executed when the button is clicked.

The type property can take any one value out of: play-pause, play-stop, rewind, fastforward, prev, and next. 

```
this.controls.addButton({type:"rewind", action:function(appObj, date){
        // appObj is the instance of the application that this widget is bound to
        
}});
```

### Slider

To add a slider to the widget bar, the application may call addSlider function on the controls. addSlider function takes an object with the following properties:

* appObj: The instance of the application that is bound to this slider. Usually 'this' reference is set as the value of appObj.

* property: A string representing the property of the application that is tied to the slider. (A change in the value of appObj.property will be reflected in the slider and vice versa)

* begin: starting (minimum) value of the property associated with the slider.

* end: last (maximum) value of the property associated with the slider.

* increments: The step value change that occurs in the property when the slider is moved one unit. (alternatively, parts can be specified in place of increments, where parts represents the number of increments from begin to end)

* action:  The callback that is executed after the slider has been moved. This callback is not executed when the property value changes from within the app and in turn affects the slider, it is only executed when the property is changed by the slider.

```
this.controls.addSlider({
                            begin:  ,
                            end:  ,
                            increments:  ,
                            appObj:  , 
                            property: , 
                            action:function(appObj, date){
                                ...
                            }
                        });
```

### Text Input

To add a slider to the widget bar, the application may call addSlider function on the controls. addSlider function takes an object with two properties, namely width and action. Width specifies the width of the text input widget (in pixels) and action is the callback that is executed when the Enter key is hit, which marks the end of the input.

```

this.controls.addTextInput({ width: , action: function(appObj, text){
        // appObj is the instance of the application that this widget is bound to
        // text data from the widget is sent to this callback.
}});
```
### Label

To add a label to the widget bar, the application may call addLabel function on the controls. addLabel function takes an object with three properties, namely textLength, appObj and property. textLength specifies the maximum length of the string that will be displayed in the label. appObj is the instance of the application that this widget is bound to. property is the property of the appObj whose value will be converted to a string to be displayed in the label.

The changes to the value of the 'property' are immediately reflected in the text displayed in the label.

```

this.controls.addLabel({textLength:10,appObj:this, property:"pageVal"});

```
In the above example, the value of this.pageVal will be displayed on the label.


## Future:  Inter-application communication

## Example Application: Clock
```
var clock = SAGE2_App.extend( {
	construct: function() {
		 arguments.callee.superClass.construct.call(this);
		this.ctx = null;
		this.minDim = null;
		this.timer = null;
		this.redraw = null;

		this.resizeEvents = "continuous";
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);

		// application specific 'init'
		this.ctx = this.element.getContext("2d");
		this.minDim = Math.min(this.element.width, this.element.height);
		this.timer = 0.0;
		this.redraw = true;
		this.log("Clock created");
	},

	load: function(state, date) {

	},

	draw: function(date) {
		// application specific 'draw'
		// only redraw if more than 1 sec has passed
		this.timer = this.timer + this.dt;
		if(this.timer >= 1.0) {
			this.timer = 0.0;
			this.redraw = true;
		}

		if(this.redraw) {
			// clear canvas		
			this.ctx.clearRect(0,0, this.element.width, this.element.height);

			this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)"
			this.ctx.fillRect(0,0, this.element.width, this.element.height)

			var radius = 0.95 * this.minDim / 2;
			var centerX = this.element.width / 2;
			var centerY = this.element.height / 2;

			// outside of clock
			this.ctx.lineWidth = (3.0/100.0) * this.minDim;
			this.ctx.strokeStyle = "rgba(85, 100, 120, 1.0)";
			this.ctx.beginPath();
			this.ctx.arc(centerX, centerY, radius, 0, Math.PI*2);
			this.ctx.closePath();
			this.ctx.stroke();

			// tick marks
			var theta = 0;
			var distance = radius * 0.90; // 90% from the center
			var x = 0;
			var y = 0;

			// second dots
			this.ctx.lineWidth = (0.5/100.0) * this.minDim;
			this.ctx.strokeStyle = "rgba(20, 50, 120, 1.0)";

			for(var i=0; i<60; i++){
				// calculate theta
				theta = theta + (6 * Math.PI/180);
				// calculate x,y
				x = centerX + distance * Math.cos(theta);
				y = centerY + distance * Math.sin(theta);

				this.ctx.beginPath();
				this.ctx.arc(x, y, (1.0/100.0) * this.minDim, 0, Math.PI*2);
				this.ctx.closePath();
				this.ctx.stroke();
			}

			// hour dots
			this.ctx.lineWidth = (2.5/100.0) * this.minDim;
			this.ctx.strokeStyle = "rgba(20, 50, 120, 1.0)";

			for(var i=0; i<12; i++){
				// calculate theta
				theta = theta + (30 * Math.PI/180);
				// calculate x,y
				x = centerX + distance * Math.cos(theta);
				y = centerY + distance * Math.sin(theta);

				this.ctx.beginPath();
				this.ctx.arc(x, y, (1.0/100.0) * this.minDim, 0, Math.PI*2, true);
				this.ctx.closePath();
				this.ctx.stroke();
			}

			// second hand
			var handSize = radius * 0.80; // 80% of the radius
			var sec = date.getSeconds();

			theta = (6 * Math.PI / 180);
			x = centerX + handSize * Math.cos(sec*theta - Math.PI/2);
			y = centerY + handSize * Math.sin(sec*theta - Math.PI/2);

			this.ctx.lineWidth = (1.0/100.0) * this.minDim;
			this.ctx.strokeStyle = "rgba(70, 35, 50, 1.0)";
			this.ctx.lineCap = "round";

			this.ctx.beginPath();
			this.ctx.moveTo(x, y);
			this.ctx.lineTo(centerX, centerY);
			this.ctx.moveTo(x, y);
			this.ctx.closePath();
			this.ctx.stroke();

			// minute hand
			handSize = radius * 0.60; // 60% of the radius
			var min = date.getMinutes() + sec/60;

			theta = (6 * Math.PI / 180);
			x = centerX + handSize * Math.cos(min*theta - Math.PI/2);
			y = centerY + handSize * Math.sin(min*theta - Math.PI/2);

			this.ctx.lineWidth = (1.5/100.0) * this.minDim;
			this.ctx.strokeStyle = "rgba(70, 35, 50, 1.0)";
			this.ctx.lineCap = "round";

			this.ctx.beginPath();
			this.ctx.moveTo(x, y);
			this.ctx.lineTo(centerX, centerY);
			this.ctx.moveTo(x, y);
			this.ctx.closePath();
			this.ctx.stroke();

			// hour hand
			handSize = radius * 0.40; // 40% of the radius
			var hour = date.getHours() + min/60;

			theta = (30 * Math.PI / 180);
			x = centerX + handSize * Math.cos(hour * theta - Math.PI/2);
			y = centerY + handSize * Math.sin(hour * theta - Math.PI/2);

			this.ctx.lineWidth = (2.0/100.0) * this.minDim;
			this.ctx.strokeStyle = "rgba(70, 35, 50, 1.0)";
			this.ctx.lineCap = "round";

			this.ctx.beginPath();
			this.ctx.moveTo(x, y);
			this.ctx.lineTo(centerX, centerY);
			this.ctx.moveTo(x, y);
			this.ctx.closePath();
			this.ctx.stroke();

			this.redraw = false;
        }
	},

	resize: function(date) {
		this.minDim = Math.min(this.element.width, this.element.height);
		this.redraw = true;

		this.refresh(date);
	},

	event: function(type, position, user, data, date) {
		// this.refresh(date);
	},

	quit: function() {
		// done
	}
});
```
