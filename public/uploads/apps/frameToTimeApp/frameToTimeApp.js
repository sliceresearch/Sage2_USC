//
// SAGE2 application: multiwindow
// by: matt rattle <>
//
// Copyright (c) 2015
//

"use strict";

/* global  */

var frameToTimeApp = SAGE2_App.extend({
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);
		// Set the DOM id
		this.element.id = "div_" + data.id;
		// Set the background to black
		this.element.style.backgroundColor = 'black';
		this.element.style.color = "green";

		// move and resize callbacks
		this.resizeEvents = "onfinish"; // onfinish
		// this.moveEvents   = "continuous";
		
		this.passSAGE2PointerAsMouseEvents = true;

		// erase me
		console.dir(this.state);

		this.appSpecific();
	},

	appSpecific: function() {
		var _this = this;
		// inject html code    file to grab from,    element.innerHTML to override
		this.loadHtmlFromFile(this.resrcPath + "design.html", this.element, function() {
			_this.postHtmlFillActions();
		});

		// set font size.
		this.element.style.fontSize = ui.titleTextSize * 2 + "px";
		this.element.style.fontFamily = "Arimo, Helvetica, sans-serif";

		// setup variables
		// this.state.startTimeValue = null; // these declared in instructions.json
		// this.endTimeValue = null;
		this.lastSendStartValue = null;
		this.lastSendEndValue = null;

		// broadcast a source and destination
		this.serverDataBroadcastSource("date",
			[], {
				app: this.id,
				interpretAs: "range",
				dataTypes: ["date"],
				dataFormat: "s2Date"
			}
		);
		// name suffix, value, description, callback
		this.serverDataBroadcastDestination("describedFrameDestination", [], {
			app: this.id,
			interpretAs: "set",
			dataTypes: ["frame"], // wants these datatypes
			dataFormat: "s2MovieFrame"
		}, "handleS2MovieFrame");
		this.serverDataBroadcastDestination("frameNoDescription", [], {
			app: this.id,
		}, "handleS2MovieFrame");
	},

	/**
	 * After body is filled, want to associate event listeners
	 *
	 * @method     postHtmlFillActions
	 */
	postHtmlFillActions: function() {
		var _this = this;
		// associate variables
		this.frameNumberTag = document.getElementById(this.id + "frameNumber");
		this.broadcastTimeTag = document.getElementById(this.id + "broadcastTime");
		this.startTimeTag = document.getElementById(this.id + "startTime");
		this.endTimeTag = document.getElementById(this.id + "endTime");
		this.broadcastTimeTag.textContent = "Not set";
		this.startTimeTag.textContent = "Not set";
		this.endTimeTag.textContent = "Not set";

		
		this.updateListedDateRange();
	},

	/**
	 * Handler for receiving frame data.
	 *
	 * @method     postHtmlFillActions
	 */
	handleS2MovieFrame: function(frameArrayFromServer) {
		var frameData;
		var error = false;
		if (Array.isArray(frameArrayFromServer)) {
			if (frameArrayFromServer.length >= 1) {
				frameData = frameArrayFromServer[0];
			} else {
				error = true;
			}
		} else {
			frameData = frameArrayFromServer;
			if (!frameData) {
				error = true;
			}
		}
		if (error) {
			console.log("Error>frameToTimeApp>Unable to convert invalid frame data");
			console.dir(frameArrayFromServer);
			throw "Error>frameToTimeApp>See above";
		}
		this.frameNumberTag.textContent = frameData.frame + " / " + frameData.maxFrame;
		this.convert(frameData);
	},

	/**
	 * After body is filled, want to associate event listeners
	 *
	 * @method     postHtmlFillActions
	 */
	convert: function(frameData) {
		var st = this.state.startTimeValue, et = this.state.endTimeValue;
		var daysBetweenStartAndEnd = this.getDaysBetween(st, et);

		// frame > days, produces 1+     frames < days, produces 1-
		var framesToDaysRatio = frameData.maxFrame / daysBetweenStartAndEnd;

		// start and end because if there are more days than frames, then each frame represents multiple days
		var startingDay = Math.round(frameData.frame / framesToDaysRatio);
		var endingDay = Math.round(frameData.frame / framesToDaysRatio);

		// create an object
		var startS2DateObject = this.addDays(st, startingDay);
		var endS2DateObject = this.addDays(st, endingDay);

		// is there any reason against this? // javascript the months start at 0.
		startS2DateObject.month++;
		endS2DateObject.month++;

		this.broadcastTimeTag.textContent = startS2DateObject.year + " "
			+ (startS2DateObject.month < 10? "0" : "") + (startS2DateObject.month) + " "
			+ (startS2DateObject.day < 10? "0" : "") + startS2DateObject.day;
		if (startingDay !== endingDay) {
			this.broadcastTimeTag.textContent += " to " +
				endS2DateObject.year + " "
				+ (endS2DateObject.month < 10? "0" : "") + (endS2DateObject.month) + " "
				+ (endS2DateObject.day < 10? "0" : "") + endS2DateObject.day;
		}

		// 
		this.serverDataSetSourceValue("date", [startS2DateObject, endS2DateObject]);
	},

	getDaysBetween: function(st, et) {
		// this.state.startTimeValue, this.endTimeValue
		if (!st || !et || !st.year) {
			console.dir(st);
			console.dir(et);
			throw "Error>frameToTimeApp>Unable to convert with null value start("
				+ st + "), end("+ et + ")";
		}
		// count days between to get day range.
		var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
		var firstDate = new Date(st.year,st.month - 1, st.day); // !!!!!!!!!!!!! months are off by 1. as in january is 0
		var secondDate = new Date(et.year,et.month - 1, et.day);
		var daysBetween = Math.round((secondDate.getTime() - firstDate.getTime()) / (oneDay)); // could be negative
		return daysBetween;
	},

	addDays: function(st, amountOfDaysToAdd) {
		var d = new Date(st.year,st.month - 1,st.day);
		d.setDate(d.getDate() + amountOfDaysToAdd);

		return {
			year: d.getFullYear(),
			month: d.getMonth(),
			day: d.getDate()
		};
	},





	getContextEntries: function() {
		var entries = [];
		var entry;

		entry = {};
		entry.description = "Set start date (space delim):";
		entry.callback = "contextMenuDateSet";
		entry.parameters = {
			start: true,
		};
		entry.inputField = true;
		entry.inputFieldSize = 12;
		entries.push(entry);

		entry = {};
		entry.description = "Set end date (space delim):";
		entry.callback = "contextMenuDateSet";
		entry.parameters = {
			end: true
		};
		entry.inputField = true;
		entry.inputFieldSize = 12;
		entries.push(entry);

		return entries;
	},

	contextMenuDateSet: function(responseObject) { 
		var parts = responseObject.clientInput.split(" ");
		if (parts.length >= 3) {
			var dateObject = {
				year: +parts[0],
				month: +parts[1],
				day: +parts[2]
			};
			if (responseObject.start) {
				this.state.startTimeValue = dateObject;
				this.saveState();
				this.updateListedDateRange();
			} else if (responseObject.end) {
				this.state.endTimeValue = dateObject;
				this.saveState();
				this.updateListedDateRange();
			} else {
				console.log("Error>frameToTimeApp> Something messed up context menu entry");
				console.dir(responseObject);
			}
		} else {
			console.log("Error>frameToTimeApp> unable to handle user input:" + responseObject.clientInput);
		}
	},

	updateListedDateRange: function() {
		var dateObject = this.state.startTimeValue;
		var stringForTag = dateObject.year + " "
			+ (dateObject.month < 10? "0" : "") + dateObject.month + " "
			+ (dateObject.day < 10? "0" : "") + dateObject.day;
		this.startTimeTag.textContent = stringForTag;
		dateObject = this.state.endTimeValue;
		stringForTag = dateObject.year + " "
			+ (dateObject.month < 10? "0" : "") + dateObject.month + " "
			+ (dateObject.day < 10? "0" : "") + dateObject.day;
		this.endTimeTag.textContent = stringForTag;
	},

	load: function(date) {
		var stringForTag, dateObject;
		if(this.state.startTimeValue) {
			dateObject = this.state.startTimeValue;
			stringForTag = dateObject.year + " " + dateObject.month + " " + dateObject.day;
			this.startTimeTag.textContent = stringForTag;
		}
		if(this.state.endTimeValue) {
			dateObject = this.state.endTimeValue;
			stringForTag = dateObject.year + " " + dateObject.month + " " + dateObject.day;
			this.startTimeTag.textContent = stringForTag;
		}
	},

	saveState: function() {
		if (this.state.endTimeValue) {
			console.log("changing end day");
			this.state.endDay = this.state.endTimeValue.day;
		} else {
			console.log("no this.state.endTimeValue ?" + this.state.endTimeValue);
		}
		this.SAGE2UpdateAppOptionsFromState();
		this.SAGE2Sync(true);
		console.log("State saved");
	},

	draw: function(date) {
	},

	resize: function(date) {
		// Called when window is resized
		this.refresh(date);
	},

	move: function(date) {
		// Called when window is moved (set moveEvents to continuous)
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	event: function(eventType, position, user_id, data, date) {
		
	},
















	// ------------------------------------------------------------------------------------------------------------------------
	// ------------------------------------------------------------------------------------------------------------------------
	// ------------------------------------------------------------------------------------------------------------------------
	// ------------------------------------------------------------------------------------------------------------------------
	// The following is related to the html loading

	/**
	 * This will load the visual layout from html file included in the folder
	 * Done so one doesn't have to programatically generate layout.
	 *
	 * @method     loadHtmlFromFile
	 * @param      {String}  relativePathFromAppFolder From the containing app folder, path to file
	 * @param      {String}  whereToAppend     Node who's innerHTML will be set to content
	 * @param      {String}  callback     What function to call after getting the file
	 */
	loadHtmlFromFile: function(relativePathFromAppFolder, whereToAppend, callback) {
		var _this = this;
		readFile(relativePathFromAppFolder, function(err, data) {
			_this.loadIntoAppendLocation(whereToAppend, data);
			callback();
		}, 'TEXT');
	},

	/**
	 * Called after xhr gets html content
	 * Main thing to note is that id fields are altered to be prefixed with SAGE2 assigned id
	 *
	 * @method     loadIntoAppendLocation
	 * @param      {String}  whereToAppend Node who's innerHTML will be set to content
	 * @param      {String}  responseText     Content of the file
	 */
	loadIntoAppendLocation: function(whereToAppend, responseText) {
		var content = "";
		// id and spaces because people aren't always consistent
		var idIndex;

		// find location of first id div. Because there will potentially be multiple apps.
		idIndex = this.findNextIdInHtml(responseText);

		// for each id, prefix it with this.id
		while (idIndex !== -1) {
			// based on id location move it over
			content += responseText.substring(0, idIndex);
			responseText = responseText.substring(idIndex);
			// collect up to the first double quote. design.html has double quotes, but HTML doesn't require.
			content += responseText.substring(0, responseText.indexOf('"') + 1);
			responseText = responseText.substring(responseText.indexOf('"') + 1);
			// apply id prefix
			content += this.id;
			// collect rest of id
			content += responseText.substring(0, responseText.indexOf('"') + 1);
			responseText = responseText.substring(responseText.indexOf('"') + 1);

			// find location of first id div. Because there will potentially be multiple apps.
			idIndex = this.findNextIdInHtml(responseText);
		}
		content += responseText;
		whereToAppend.innerHTML = content;
	},

	/**
	 * This returns the index of the first location of id
	 * Accounts for 0 to 3 spaces between id and =
	 *
	 * @method     findNextIdInHtml
	 */
	findNextIdInHtml: function(responseText) {
		// find location of first id div. Because there will potentially be multiple apps.
		// the multiple checks are incase writers are not consistent
		var idIndex = responseText.indexOf("id=");
		var ids1 = responseText.indexOf("id =");
		var ids2 = responseText.indexOf("id  =");
		var ids3 = responseText.indexOf("id   =");
		// if (idIndex isn't found) or (is found but ids1 also found and smaller than idIndex)
		if ((idIndex === -1) || (ids1 > -1 && ids1 < idIndex)) {
			idIndex = ids1;
		}
		if ((idIndex === -1) || (ids2 > -1 && ids2 < idIndex)) {
			idIndex = ids2;
		}
		if ((idIndex === -1) || (ids3 > -1 && ids3 < idIndex)) {
			idIndex = ids3;
		}
		return idIndex;
	},





	placeholder: ""
});
