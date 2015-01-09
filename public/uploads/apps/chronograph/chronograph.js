// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014
//
// Ported to SAGE2 from http://www.3quarks.com/en/SVGClock/
//    station-clock.svg
//    Copyright (c) 2012 Rüdiger Appel
//    Licensed under the creative common license.
//    Date:    2012-03-23
//    Version: 1.0
//    Email:   ludi(at)me(dot)com
//    Home:    http://www.3Quarks.com/
//

var chronograph = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);
		this.ready = null;
	},
	
	// Adds a parameter to the clock
	addParameter: function(name, value) {
		this[name] = value;
	},

	setParameters: function() {
		// settings: see http://www.3quarks.com/en/SVGClock/
		if (this.state.mode === 0) {
			this.element.style.backgroundColor = "rgba(255,255,255,0)";
			this.addParameter("dial"               , "din 41091.4");
			this.addParameter("hourHand"           , "din 41092.3");
			this.addParameter("minuteHand"         , "din 41092.3");
			this.addParameter("secondHand"         , "din 41071.2");
			this.addParameter("minuteHandBehavior" , "stepping");
			this.addParameter("secondHandBehavior" , "stepping");
			this.addParameter("secondHandStopToGo" , "yes");
			this.addParameter("secondHandStopTime" , "1.5");
			this.addParameter("backgroundColor"    , "rgba(255,255,255,255)");
			this.addParameter("dialColor"          , "rgb(40,40,40)");
			this.addParameter("hourHandColor"      , "rgb(20,20,20)");
			this.addParameter("minuteHandColor"    , "rgb(20,20,20)");
			this.addParameter("secondHandColor"    , "rgb(160,50,40)");
			this.addParameter("axisCoverColor"     , "rgb(20,20,20)");
			this.addParameter("axisCoverRadius"    , "9.5");
		} else {
			this.element.style.backgroundColor = "rgba(255,255,255,0)";
			this.addParameter("dial"               , "din 41091.1");
			this.addParameter("hourHand"           , "siemens");
			this.addParameter("minuteHand"         , "siemens");
			this.addParameter("secondHand"         , "din 41071.2");
			this.addParameter("minuteHandBehavior" , "stepping");
			this.addParameter("secondHandBehavior" , "sweeping");
			this.addParameter("secondHandStopToGo" , "yes");
			this.addParameter("secondHandStopTime" , "1.5");
			this.addParameter("backgroundColor"    , "rgba(198,186,156,255)");
			this.addParameter("dialColor"          , "rgb(40,40,40)");
			this.addParameter("hourHandColor"      , "rgb(20,20,20)");
			this.addParameter("minuteHandColor"    , "rgb(20,20,20)");
			this.addParameter("secondHandColor"    , "rgb(160, 50, 40)");
			this.addParameter("axisCoverColor"     , "rgb(20,20,20)");
			this.addParameter("axisCoverRadius"    , "7");
		}
	},
	updateClock: function() {
		// set clock colors
		this.setColorForElement('background');
		this.setColorForElement('dial');
		this.setColorForElement('hourHand');
		this.setColorForElement('minuteHand');
		this.setColorForElement('secondHand');
		this.setColorForElement('axisCover');
		// set clock elements
		this.setClockDial(this.dial);
		this.setHourHand(this.hourHand);
		this.setMinuteHand(this.minuteHand);
		this.setSecondHand(this.secondHand);
		this.setAxisCover(this.axisCoverRadius);
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "object", width, height, resrc, date);

		// application specific 'init'
		this.element.setAttribute('id',    'myclock');
		this.element.setAttribute('data',   this.resrcPath + 'chronograph.svg');
		this.element.setAttribute('type',  'image/svg+xml');

		// Customize the clock
		this.state.mode = 0;
		this.setParameters();

		this.ready = false;

		// Draw once per second
		this.maxFPS = 1.0;
	},

	// set element fill and stroke color
	setColorForElement: function(id) {
		var svgDoc  = this.element.contentDocument;
		var element = svgDoc.getElementById(id);
		var color   = this[id + 'Color']; // retrieve the parameter
		if (color && element) {
			element.setAttribute('style', 'fill:' + color + '; stroke:' + color);
		}
	},

	// set clock dial
	setClockDial: function(value) {
		this.showElement('dialSwiss',      value === 'swiss' || value === undefined);
		this.showElement('dialAustria',    value === 'austria');
		this.showElement('dialPoints',     value === 'points');
		this.showElement('dialDIN41091.1', value === 'din 41091.1');
		this.showElement('dialDIN41091.3', value === 'din 41091.3');
		this.showElement('dialDIN41091.4', value === 'din 41091.4');
	},

	// set hour hand
	setHourHand: function(value) {
		this.showElement('hourHandSwiss',      value === 'swiss' || value === undefined);
		this.showElement('hourHandGerman',     value === 'german');
		this.showElement('hourHandSiemens',    value === 'siemens');
		this.showElement('hourHandDIN41092.3', value === 'din 41092.3');
	},

	// set minute hand
	setMinuteHand: function(value) {
		this.showElement('minuteHandSwiss',      value === 'swiss' || value === undefined);
		this.showElement('minuteHandGerman',     value === 'german');
		this.showElement('minuteHandSiemens',    value === 'siemens');
		this.showElement('minuteHandDIN41092.3', value === 'din 41092.3');
	},

	// set second hand
	setSecondHand: function(value) {
		this.showElement('secondHandSwiss',      value === 'swiss' || value === undefined);
		this.showElement('secondHandGerman',     value === 'german');
		this.showElement('secondHandDIN41071.1', value === 'din 41071.1');
		this.showElement('secondHandDIN41071.2', value === 'din 41071.2');
	},

	// set axis cover
	setAxisCover: function(value) {
		var svgDoc = this.element.contentDocument;
		svgDoc.getElementById('axisCoverCircle').setAttribute('r', isNaN(value) ? 0 : value);
	},

	// show or hide clock element
	showElement: function(id, visible) {
		var svgDoc = this.element.contentDocument;
		svgDoc.getElementById(id).setAttribute('visibility', visible ? 'visible' : 'hidden');
	},

	// rotate clock element
	rotateElement: function(id, angle) {
		var svgDoc = this.element.contentDocument;
		svgDoc.getElementById(id).setAttribute('transform', 'rotate(' + angle + ', 100, 100)');
	},


	load: function(state, date) {
		// is it empty state object ?
		if (Object.getOwnPropertyNames(state).length !== 0) {
			this.state.mode = state.mode;
			this.setParameters();
		}
		var _this  = this;
		// Callback when the SVG file is loaded
    	this.element.onload = function() {
			// Get the SVG document inside the Object tag
			var svgDoc = _this.element.contentDocument;
	    	// initialize clock
	        if (svgDoc.getElementById('background') && 
	            svgDoc.getElementById('dial') &&
	            svgDoc.getElementById('hourHand') &&
	            svgDoc.getElementById('minuteHand') &&
	            svgDoc.getElementById('secondHand') && 
	            svgDoc.getElementById('axisCover')) {

				// Update the clock
				_this.updateClock();

				// draw clock
				_this.ready = true;

				// show clock
				_this.showElement('clock', true);
				_this.refresh(date);
			}
		};
	},
	
	draw: function(date) {
		if (this.ready) {
	        var now     = date;
			var hours   = now.getHours();
			var minutes = now.getMinutes();
			var seconds = now.getSeconds();
			var millis  = now.getMilliseconds();

			// rotate hour hands
			this.rotateElement('hourHand', 30 * hours + 0.5 * minutes);

			// rotate minute hand
			this.rotateElement('minuteHand', 6 * minutes + (this.minuteHandBehavior === 'sweeping' ? 0.1 * seconds : 0));

			// handle "stop to go" second hand
			if (this.secondHandStopToGo === 'yes' || this.secondHandStopToGo === 'true') {
				var wait = isNaN(this.secondHandStopTime) ? 1.5 : this.secondHandStopTime;
				var fact = 60 / (60 - Math.min(30, Math.max(0, wait)));
				var time = Math.min(60000, fact * (1000 * seconds + millis));
				seconds  = Math.floor(time / 1000);
				millis   = time % 1000;
			}

			// rotate second hand
			var secondAngle = 6 * seconds;
			if (this.secondHandBehavior === 'sweeping') {
				secondAngle += 0.006 * millis;
			} else if (this.secondHandBehavior === 'swinging') {
				secondAngle += 3 * (1 + Math.cos(Math.PI + Math.PI * (0.001 * millis)));
			}
			this.rotateElement('secondHand', secondAngle);
	    }
	},
	
	resize: function(date) {
		//console.log("chronograph> resize", this.element.width, this.element.height);
		this.refresh(date);
	},

	flip: function(date) {
		if (this.state.mode === 0) this.state.mode = 1;
		else if (this.state.mode === 1) this.state.mode = 0;
		this.setParameters();
		this.updateClock();
		this.refresh(date);
	},

	event: function(eventType, position, user_id, data, date) {
		if (this.ready) {
			if (eventType === "pointerRelease" && (data.button === "left") ) {
				this.flip(date);
			}
			else if (eventType === "keyboard") {
				if(data.character === " ")
					this.flip(date);
			}
		}
	}
});
