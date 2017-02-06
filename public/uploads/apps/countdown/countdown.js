// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//

//
// SAGE2 application: Timer
// by: Davide Tantillo <dtanti2@uic.edu>
//
// Copyright (c) 2015
//

/* global d3 SAGE2_LibLoader*/
"use strict";
var countdown = (function() {
	let myApp;

	// migrate code into IIFE to allow for local d3 instance
	let d3 = SAGE2_LibLoader.import("d3", "v3");

	console.log("countdown d3 version", d3.version);

	myApp = SAGE2_App.extend({
		init: function(data) {

			// Create div into the DOM
			this.SAGE2Init("div", data);

			this.data = data;

			// Set the background to black
			this.element.style.backgroundColor = 'black';

			// move and resize callbacks
			this.resizeEvents = "continuous";

			// SAGE2 Application Settings
			//

			// adding widget buttons
			this.controls.addButton({ label: "Start", identifier: "start", position: 4 });
			this.controls.addButton({ label: "Stop", identifier: "stop", position: 8 });
			this.controls.addButton({ label: "Pause", identifier: "pause", position: 12 });

			// adding widget slider
			this.controls.addSlider({
				identifier: "sliderMinutes",
				minimum: 0,
				maximum: 59,
				property: "this.minutes",
				step: 1
			});

			this.controls.finishedAddingControls();

			this.enableControls = true;

			// adding an svg to the element
			this.container = d3.select(this.element)
				.append("svg")
				.attr("id", "timerContainerSVG")
				.attr("width", this.element.clientWidth)
				.attr("height", this.element.clientHeight)
				.style("font-family", "Arimo");

			// initializing some instance variables
			this.resetTimeText();
			this.positionInsertion = 0;
			this.minutes = 0;

			// some instance variable
			this.startButton = null;
			this.pauseButton = null;

			// start the timer if there is residual time and the timer was running
			if (this.state.remainingTime > 0 && this.state.running) {
				this.startTimer(this);
			}

			// generate the interface of the timer
			this.createTimerInterface();
		},

		// synchronized setter over all the clients of the remaining time
		setRemainingTime: function(time) {
			this.SAGE2UserModification = true;
			this.state.remainingTime = time;
			this.refresh(this.data.date);
			this.SAGE2UserModification = false;
		},

		// synchronized modifier (to true) over all the clients of the running variable
		startRunning: function() {
			this.SAGE2UserModification = true;
			this.state.running = true;
			this.refresh(this.data.date);
			this.SAGE2UserModification = false;
		},

		// synchronized modifier (to true) over all the clients of the running variable
		stopRunning: function() {
			this.SAGE2UserModification = true;
			this.state.running = false;
			this.refresh(this.data.date);
			this.SAGE2UserModification = false;
		},

		// functionused to transform residual time to a string of hh/mm/ss
		getTextTimeFromMillis: function() {

			if (this.state.remainingTime == 0) {
				return "00:00:00";
			}

			var _second = 1000;
			var _minute = _second * 60;
			var _hour   = _minute * 60;
			var _day    = _hour * 24;

			var text    = "";
			var hours   = Math.floor((this.state.remainingTime % _day) / _hour);
			var minutes = Math.floor((this.state.remainingTime % _hour) / _minute);
			var seconds = Math.floor((this.state.remainingTime % _minute) / _second);

			if (seconds < 10) {
				seconds = "0" + seconds;
			}

			if (minutes < 10) {
				minutes = "0" + minutes;
			}

			if (hours < 10) {
				hours = "0" + hours;
			}

			text += hours + ":" + minutes + ":" + seconds;
			return text;

		},

		// functionused to create the interface of the timer
		createTimerInterface: function() {
			// clear the current svg
			this.container.selectAll("*").remove();

			// setting the number of rows, cols and the padding size of the table
			var nRows   = 4;
			var nCols   = 3;
			var padding = 5;

			// setting the image path
			var path = this.resrcPath + "/img/";

			// getting the text of the residual time
			var timerToVisualize = this.getTextTimeFromMillis();

			// creating the model of the interface that will be given and interpreted by d3 to create the interface
			this.modelInterface = [
				{ name: "Timer", text: timerToVisualize, parent: this, r: 0, c: 0, cSpan: 3, rSpan: 2 },
				{ name: "Hour", parent: this, action: this.modifyHours, text: "Hours", r: 2, c: 0, cSpan: 1, rSpan: 1 },
				{ name: "Minute", parent: this, action: this.modifyMinutes, text: "Minutes", r: 2, c: 1, cSpan: 1, rSpan: 1 },
				{ name: "Second", parent: this, action: this.modifySeconds, text: "Seconds", r: 2, c: 2, cSpan: 1, rSpan: 1 },
				{ name: "Start", command: "true",
					parent: this, action: this.startTimer, image: path + "play.png", r: 3, c: 1, cSpan: 1, rSpan: 1 },
				{ name: "Pause", command: "true",
					parent: this, action: this.pauseTimer, image: path + "pause.png", r: 3, c: 0, cSpan: 1, rSpan: 1 },
				{ name: "Reset", command: "true",
					parent: this, action: this.resetTimer, image: path + "stop.png", r: 3, c: 2, cSpan: 1, rSpan: 1 }
			];

			// getting the height and width of the current container
			var w = parseInt(this.container.style("width"));
			var h = parseInt(this.container.style("height"));

			// calculating the heght and width of a single col and row
			var colW = (w - ((nCols + 2) * padding)) / nCols;
			var rowH = (h - ((nRows + 2) * padding)) / nRows;

			// setting default stroke and background variables
			var defaultBg = "gray";
			var defaultStroke = "white";

			// iterate over the interface model and generates every single item specified before
			for (var i in this.modelInterface) {

				// getting the styles contained into the model for the current item.
				// If a style is not specified, it is set to the default value
				var elem   = this.modelInterface[i];
				var rSpan  = elem.rSpan || 1;
				var cSpan  = elem.cSpan || 1;
				var bg     = elem.backgroundColor || defaultBg;
				var stroke = elem.stroke || defaultStroke;

				// calculate the actual size with respect to the proportions specified in the model
				var x = elem.c * (colW + padding) + padding;
				var y = elem.r * (rowH + padding) + padding;
				var elemH = rowH * rSpan + (rSpan - 1) * padding;
				var elemW = colW * cSpan + (cSpan - 1) * padding;

				elem.y = y;
				elem.h = elemH;
				elem.x = x;
				elem.w = elemW;

				// generating the svg item with the specified properties and styles
				this.container
					.append("rect")
					.attr("id", elem.name)
					.attr("fill", bg)
					.attr("x", x)
					.attr("y", y)
					.attr("width", elemW)
					.attr("height", elemH)
					.style("stroke", stroke);

				// adding special attribute, if the item name is Timer
				if (elem.text) {
					var t = this.container.append("text")
						.attr("x", x + elem.w / 2)
						.attr("y", y + elem.h / 2)
						.style("dominant-baseline", "middle")
						.style("text-anchor", "middle")
						.style("font-size", elem.w / 5 + "px")
						.text(elem.text);

					if (elem.name == "Timer") {
						this.timerText = t;
					}
				}

				// inserting the image, if present in the model
				if (elem.image) {
					this.container
						.append("image")
						.attr("fill", bg)
						.attr("x", x)
						.attr("y", y)
						.attr("width", elemW)
						.attr("height", elemH)
						.attr("xlink:href", elem.image);
				}

				if (elem.name == "Start") {
					this.startButton = elem;
				}

				if (elem.name == "Pause") {
					this.pauseButton = elem;
				}

			}

		},

		draw: function(date) {
		},

		resize: function(date) {
			this.refresh(date);

			// getting the new size and redraw the interface into the svg
			this.container
				.attr("width",  this.element.clientWidth)
				.attr("height", this.element.clientHeight);
			this.createTimerInterface();
		},

		event: function(eventType, position, user_id, data, date) {
			if (eventType === "pointerPress" && (data.button === "left")) {
				// if left mouse is pressed, try to understand if the click was within a button
				this.leftClickPosition(position.x, position.y);
			}
			if (eventType === "widgetEvent") {

				// identify the button pressed ont he widget
				switch (data.identifier) {
					case "start":
						// if start button pressed, invoke its function
						this.startTimer(this);
						break;
					case "pause":
						// if pause button pressed, invoke its function
						this.pauseTimer(this);
						break;
					case "stop":
						// if reset button pressed, invoke its function
						this.resetTimer(this);
						break;
					case "sliderMinutes":
						// identify the action performed by the slider
						switch (data.action) {
							case "sliderLock":
								break;

							// when the slider is moved, enter into this case
							case "sliderUpdate":

								// calculate the text to with the minutes contained into the slider (the slider controls the this.minutes variable)
								var textToInsert = '';
								textToInsert += this.hourText[1];
								textToInsert += this.hourText[0];
								textToInsert += ':';
								textToInsert += Math.floor(this.minutes / 10);
								textToInsert += Math.floor(this.minutes % 10);
								textToInsert += ':';
								textToInsert += this.secondText[1];
								textToInsert += this.secondText[0];

								// update the visualized timer text with the new value
								this.timerText.text(textToInsert);

								// calculate th enew residual time
								var seconds = this.secondText[1] * 10 + this.secondText[0];
								var minutes = Math.floor(this.minutes);
								var hours = this.hourText[1] * 10 + this.hourText[0];

								// set the synchronized residual time variable with the new residual time
								this.setRemainingTime(seconds * 1000 + minutes * 60 * 1000 + hours * 60 * 60 * 1000);
								break;
							case "sliderRelease":
								break;
						}
						break;
				}
			} else if (eventType === "keyboard") {

				if (data.code == "32" || data.code == "13") {

					var button = this.state.running ? this.pauseButton : this.startButton;

					if (button.command) {
						var oldColor = button.backgroundColor || "gray";
						d3.select("#" + button.name).attr("fill", "white").transition().duration(500).attr("fill", oldColor);
					}

					// invoke the button action passing the reference of the main object
					button.action(this);
				}

				var c = data.character;

				if (isNaN(parseInt(c))) {
					return;
				}

				if (this.insertionStateSecond || this.insertionStateMinute || this.insertionStateHour) {
					this.interpretNumber(c);
				} else if (!this.state.running) {
					this.interpretNumberFree(c);
				}

			} else if (eventType === "specialKey") {
				if (data.code === 37 && data.state === "down") {
					// left
					this.refresh(date);
				} else if (data.code === 38 && data.state === "down") {
					// up
					this.refresh(date);
				} else if (data.code === 39 && data.state === "down") {
					// right
					this.refresh(date);
				} else if (data.code === 40 && data.state === "down") {
					// down
					this.refresh(date);
				}
			}
		},

		interpretNumberFree: function(numb) {
			var number = parseInt(numb);
			this.freeText.shift();
			this.freeText.push(number);
			this.positionInsertion += 1;
			if (this.positionInsertion > 5) {
				this.positionInsertion = 0;
			}

			this.secondText[0] = this.freeText[5];
			this.secondText[1] = this.freeText[4];
			this.minuteText[0] = this.freeText[3];
			this.minuteText[1] = this.freeText[2];
			this.hourText[0]   = this.freeText[1];
			this.hourText[1]   = this.freeText[0];

			var textToInsert = '';
			textToInsert += this.freeText[0];
			textToInsert += this.freeText[1];
			textToInsert += ':';
			textToInsert += this.freeText[2];
			textToInsert += this.freeText[3];
			textToInsert += ':';
			textToInsert += this.freeText[4];
			textToInsert += this.freeText[5];

			// update the text on the timer
			this.timerText.text(textToInsert);

			// claculating the residual time, from the number contained into the arrays
			var seconds = this.freeText[4] * 10 + this.freeText[5];
			var minutes = this.freeText[2] * 10 + this.freeText[3];
			var hours = this.freeText[0] * 10 + this.freeText[1];

			// setting the synchronized residual time, with this new value
			this.setRemainingTime(seconds * 1000 + minutes * 60 * 1000 + hours * 60 * 60 * 1000);
		},

		// functionused to interpret a character into a numeric value (hour, minute or second)
		interpretNumber: function(numb) {
			// interpret character as number
			var number = parseInt(numb);

			// fill vector of seconds, minutes or hours depending the button was pressed
			if (this.insertionStateSecond) {

				// if it is the second number inserted, populate the second array field with the first one
				if (this.positionInsertion == 1) {
					this.secondText[1] = this.secondText[0];
				}

				// insert the new number in the first field
				this.secondText[0] = number;

			} else if (this.insertionStateMinute) {

				// if it is the second number inserted, populate the second array field with the first one
				if (this.positionInsertion == 1) {
					this.minuteText[1] = this.minuteText[0];
				}

				// insert the new number in the first field
				this.minuteText[0] = number;

			} else if (this.insertionStateHour) {

				// if it is the second number inserted, populate the second array field with the first one
				if (this.positionInsertion == 1) {
					this.hourText[1] = this.hourText[0];
				}

				// insert the new number in the first field
				this.hourText[0] = number;

			}

			if (this.positionInsertion == 1) {
				// reset the insert position, if the number inserted is the second one
				this.resetInsertion();
			} else {
				// increase the insertion position, if the number inserted is the first one
				this.positionInsertion = 1;
			}

			// maintaing coherent the free insertion mode with the single insertion mode
			this.freeText[5] = this.secondText[0];
			this.freeText[4] = this.secondText[1];
			this.freeText[3] = this.minuteText[0];
			this.freeText[2] = this.minuteText[1];
			this.freeText[1] = this.hourText[0];
			this.freeText[0] = this.hourText[1];

			// transforming the number in a text
			var textToInsert = '';
			textToInsert += this.hourText[1];
			textToInsert += this.hourText[0];
			textToInsert += ':';
			textToInsert += this.minuteText[1];
			textToInsert += this.minuteText[0];
			textToInsert += ':';
			textToInsert += this.secondText[1];
			textToInsert += this.secondText[0];

			// update the text on the timer
			this.timerText.text(textToInsert);

			// claculating the residual time, from the number contained into the arrays
			var seconds = this.secondText[1] * 10 + this.secondText[0];
			var minutes = this.minuteText[1] * 10 + this.minuteText[0];
			var hours   = this.hourText[1] * 10 + this.hourText[0];

			// setting the synchronized residual time, with this new value
			this.setRemainingTime(seconds * 1000 + minutes * 60 * 1000 + hours * 60 * 60 * 1000);
		},

		// this functionnullify the buttons effect and the insertion position,
		// so that when a new isertion occurs no interferences happen
		resetInsertion: function() {
			this.insertionStateSecond = false;
			this.insertionStateMinute = false;
			this.insertionStateHour = false;
			d3.select("#Hour").attr("fill", "grey");
			d3.select("#Minute").attr("fill", "grey");
			d3.select("#Second").attr("fill", "grey");
			this.positionInsertion = 0;
		},

		// reset the arrays containing the number of the timer
		resetTimeText: function() {
			this.secondText = [];
			this.secondText.push(0, 0);

			this.minuteText = [];
			this.minuteText.push(0, 0);

			this.hourText = [];
			this.hourText.push(0, 0);

			this.freeText = [];
			this.freeText.push(0, 0, 0, 0, 0, 0);
		},

		// stop the timer in a syncronized way
		pauseTimer: function(that) {
			clearInterval(that.theTimer);

			// stop the timer on every client
			that.stopRunning();
		},

		// reset the timer in a syncronized way
		resetTimer: function(that) {
			clearInterval(that.theTimer);

			// set the synchronized residula time to zero
			that.setRemainingTime(0);

			// stop the timer on every client
			that.stopRunning();

			// reset all possible insertion variables
			that.resetTimeText();
			that.resetInsertion();

			// setting the timer text to zero
			d3.select("#Timer").transition().duration(1000).attr("fill", "grey");
			that.timerText.text('00:00:00');
		},

		// this functionstart the timer if
		startTimer: function(that) {

			// if no residual time is present or the timer is active and no timer exists, do not start any timer
			if (that.state.remainingTime == 0 || that.state.running && that.theTimer) {
				return;
			}

			// reset the insertion arrays
			that.resetInsertion();

			// instantiate the functiongiven to the timer
			var intervalFunction = function(that) {

				// when the timer is not running and no residual timer remains, delete the timer and return
				if (!that.state.running && that.state.running == 0) {
					clearInterval(that.theTimer);
					return;
				}

				// variable used for maths
				var _second = 1000;
				var _minute = _second * 60;
				var _hour   = _minute * 60;
				var _day    = _hour * 24;

				// when one minutes remain, change the background color from green to red with a transition
				if (that.state.remainingTime <= 60000) {
					d3.select("#Timer").transition().duration(1000).attr("fill", "red");
				} else {
					d3.select("#Timer").attr("fill", "green");
				}

				// if no residual time remains, delete the timer and set the text timer to 'END'
				if (that.state.remainingTime <= 0) {
					that.timerText.text('END');
					clearInterval(that.theTimer);
					return;
				}

				// reducing the synchronized variable by one second unit
				that.setRemainingTime(that.state.remainingTime -= _second);

				// generate the text of residual time
				var hours  = Math.floor((that.state.remainingTime % _day) / _hour);
				var minutes = Math.floor((that.state.remainingTime % _hour) / _minute);
				var seconds = Math.floor((that.state.remainingTime % _minute) / _second);

				if (seconds < 10) {
					seconds = "0" + seconds;
				}

				if (minutes < 10) {
					minutes = "0" + minutes;
				}

				if (hours < 10) {
					hours = "0" + hours;
				}

				var textRemainingTime = '';
				textRemainingTime += hours + ':';
				textRemainingTime += minutes + ':';
				textRemainingTime += seconds;

				// set the timer text with the new string
				that.timerText.text(textRemainingTime);

			};

			// start the timer and repeat the givn functionevery second
			that.theTimer = setInterval(intervalFunction, 1000, that);

			// setting to true the synchronized running variable, so that every client knows that the timer is running
			that.startRunning();

			// change the background of the timer
			d3.select("#Timer").attr("fill", "green");

		},

		// action associated to the seconds button
		modifySeconds: function(that) {
			// reset the current insertion
			that.resetInsertion();

			// fill of white the selected button
			d3.select("#Second").attr("fill", "white");

			// setting to true the variable that identified that the current button is pressed
			that.insertionStateSecond = true;

			// reset the array of the seconds
			that.secondText = [];
			that.secondText.push(0);
			that.secondText.push(0);
		},

		// action associated to the minutes button
		modifyMinutes: function(that) {
			// reset the current insertion
			that.resetInsertion();

			// fill of white the selected button
			d3.select("#Minute").attr("fill", "white");

			// setting to true the variable that identified that the current button is pressed
			that.insertionStateMinute = true;

			// reset the array of the minutes
			that.minuteText = [];
			that.minuteText.push(0);
			that.minuteText.push(0);
		},

		// action associated to the hours button
		modifyHours: function(that) {
			// reset the current insertion
			that.resetInsertion();

			// fill of white the selected button
			d3.select("#Hour").attr("fill", "white");

			// setting to true the variable that identified that the current button is pressed
			that.insertionStateHour = true;

			// reset the array of the hours
			that.hourText = [];
			that.hourText.push(0);
			that.hourText.push(0);
		},

		// function used to invoke button actions
		leftClickPosition: function(x, y) {
			// setting the feedback button color
			var pressedColor = "white";
			var defaultBg    = "gray";

			// taking a reference of the main object
			var _this = this;

			// iterating over the model trying to understand if a button was pressed
			for (var i in this.modelInterface) {
				var elem = this.modelInterface[i];

				// check if the click is within the current button
				if (elem.action && y >= elem.y & y <= elem.y + elem.h & x >= elem.x & x <= elem.x + elem.w) {
					// if the button is clickable, generates a color transition feedback
					if (elem.command) {
						var oldColor = elem.backgroundColor || defaultBg;
						d3.select("#" + elem.name).attr("fill", pressedColor).transition().duration(500).attr("fill", oldColor);
					}

					// invoke the button action passing the reference of the main object
					elem.action(_this);
				}
			}

		}

	});

	return myApp;
}());
