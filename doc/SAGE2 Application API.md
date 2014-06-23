SAGE2 Application Methods
=======

| Method                                        | Parameters                                               |
| --------------------------------------------- | -------------------------------------------------------- |
| `init(id, width, height, resrc, date)`        | `id` is canvas element id, `width` is the initial application width, `height` is the initial application height, `resrc` is path to resource directory, `date` is the date |
| `load(state, date)`                           | `state` is the initial application state (eg. initial data to display), `date` is the date
| `draw(date)`                                  | `date` is the date (used to calculate t and dt for animations). Within your application, call 'refresh' if you need a redraw. If it's interactive application, you can enable 'animation' in the file "instruction.json". the default frame rate is 60fps. Maximum frame rate can be controlled by the variable maxFPS (`this.maxFPS = 20.0` for instance) |
| `resize(date)`                                | `date` is the date |
| `event(eventType, user_id, x, y, data, date)` | `eventType` is the type of event, `user_id` is the id of the user who triggered the event, `x` and `y` are the position of the event, `data` is an object containing extra data about the event, `date` is the data .  See event description below.|

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

	event: function(eventType, userId, x, y, data, date) {
        // see event handling description below
        
        // may need to update state here
        
        // may need to redraw 
        this.refresh(date);
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
```
#!javascript

event: function(eventType, userId, x, y, data, date) {

}

```
eventType can be any one of the following: 

* pointerPress (button down)

* pointerRelease (button up) -In both of these cases data.button will indicate whether it is 'left' or 'right' button that caused the event.

* pointerMove 

* pointerDoubleClick (left button double click)

* keyboard (Normal key events from the keyboard)

* specialKey (Special Keys on the keyboard such as Backspace, Delete, Shift, etc...)

data holds values such as button(for mouse events), state(for key board events to signal 'up' or 'down' state of the key), and code (code of the key pressed in case of key board events).

x and y gives the position of the pointer.

userId gives the Id of the user generating the event.

date object is may be used for synchronizing.


## External Libraries

## How to write an app

### instructions.json

### load into app library

## Future:  Widgets

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

	event: function(eventType, userId, x, y, data, date) {
		// this.refresh(date);
	}
});
```