// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2016

"use strict";

var quickNote = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.element.id = "div" + data.id;
		this.element.style.background = "lightyellow";
		this.element.style.fontSize   = ui.titleTextSize + "px";
		// Using SAGE2 default font
		this.element.style.fontFamily = "Courier New, Consolas, Menlo, monospace";
		// Default starting attributes
		this.backgroundChoice = "lightyellow";

		/*
		basing text size on title size is throwing off the sizing based on site location.
		need to have a base size and then scale.
		starting with size 20 and scaling up provides 25 characters of space
		at 300px wide, this is 15px per character.
		each character is roughly 26.8px tall
		*/
		this.startingFontSize       = 19.9;
		this.startingAppWidth       = 300; // Hardcode necessary(?) to keep scale on resize/restart/reload
		this.startingAppHeight      = 134; // 5 lines is 26.8 * 5 = 134;
		this.startingFontHeight     = 26.8;
		this.startingTextZoneWidth  = 25;
		this.startingTextZoneHeight = 5;
		this.needTextZoneHeight     = 5;
		this.sizeModification       = 1; // 1 is normal <1 is small >1 is larger

		// Keep a copy of the title
		this.noteTitle = "";

		// If loaded from session, this.state will have meaningful values.
		this.setMessage(this.state);


		var _this = this;
		// If it got file contents from the sever, then extract.
		if (data.state.contentsOfNoteFile) {
			this.parseDataFromServer(data.state.contentsOfNoteFile);
		} else if (this.state.contentsOfNoteFile) {
			this.parseDataFromServer(this.state.contentsOfNoteFile);
		} else if (data.customLaunchParams) { // if it was passed additional init values
			data.customLaunchParams.serverDate = new Date(Date.now());
			_this.setMessage(data.customLaunchParams);
		}
	},

	/**
	Currently assumes that file from server will contain three lines.
	1st: creator and timestamp
	2nd: color for note
	3rd: content for note

	*/
	parseDataFromServer: function(fileContentsFromServer) {
		var fileData  = {};
		var fileLines = fileContentsFromServer.split("\n");
		fileData.fileDefined = true;
		fileData.clientName  = fileLines[0];
		fileData.colorChoice = fileLines[1];
		fileData.clientInput = fileLines[2];
		this.setMessage(fileData);
	},

	/**
	msgParams.clientName	Client input pointer name
	msgParams.clientInput	What they typed for the note.
	*/
	setMessage: function(msgParams) {
		// First clean the input, if there is i nput
		if (msgParams.clientInput) {
			this.state.clientInput = msgParams.clientInput; // keep original
			let words = msgParams.clientInput.split(" "); // separate out words
			let hasModifiedWord = false;
			// determine the number of lines needed
			let lines = msgParams.clientInput.split("\n");
			this.needTextZoneHeight = lines.length + 1; // have extra line to show no missing text
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].length > this.startingTextZoneWidth) {
					this.needTextZoneHeight += parseInt(lines[i].length / this.startingTextZoneWidth);
				}
			}

			for (let i = 0; i < words.length; i++) {
				// if a word is larget than the zone width
				if (words[i].length > this.startingTextZoneWidth) {
					hasModifiedWord = true;
					let pieces = "";
					// split it into pieces that will fit within one line
					while (words[i].length > this.startingTextZoneWidth) {
						pieces += words[i].substring(0, this.startingTextZoneWidth);
						pieces += " ";
						words[i] = words[i].substring(this.startingTextZoneWidth);
						this.needTextZoneHeight++; // inflates lines usage by 1
					}
					pieces += words[i];
					words[i] = pieces; // put back into location
				}
			} // if there was word modification to shrink into view, then need to rejoin
			if (hasModifiedWord) {
				msgParams.clientInput = words.join(" ");
			}
			msgParams.clientInput = msgParams.clientInput.replace(/\n/g, "<br>");
		}
		// If defined by a file, use those values
		if (msgParams.fileDefined === true) {
			this.backgroundChoice   = msgParams.colorChoice;
			this.state.colorChoice  = this.backgroundChoice;
			this.state.creationTime = msgParams.clientName;
			this.element.style.background = msgParams.colorChoice;
			this.element.innerHTML        = msgParams.clientInput;
			this.formatAndSetTitle(this.state.creationTime);
			this.saveNote(msgParams.creationTime);
		} else { // else defined by load or user input
			// Otherwise set the values using probably user input.
			if (msgParams.clientName === undefined || msgParams.clientName === null || msgParams.clientName == "") {
				msgParams.clientName = "";
			}
			// If the color choice was defined, use the given color. RMB choices do not provide a color (currently)
			if (msgParams.colorChoice !== undefined && msgParams.colorChoice !== null && msgParams.colorChoice !== "") {
				this.backgroundChoice = msgParams.colorChoice;
				this.element.style.background = msgParams.colorChoice;
			}

			// set the text, currently innerHTML matters to render <br> and allow for html tags
			this.element.innerHTML = msgParams.clientInput;
			// client input state set as part of the clean
			this.state.clientName  = msgParams.clientName;
			this.state.colorChoice = this.backgroundChoice;

			// if the creationTime has not been set, then fill it out.
			if (this.state.creationTime === null
				&& msgParams.serverDate !== undefined
				&& msgParams.serverDate !== null) {
				this.state.creationTime = new Date(msgParams.serverDate);
				// build the title string.
				var titleString = msgParams.clientName + "-QN-" + this.state.creationTime.getFullYear();
				if (this.state.creationTime.getMonth() < 9) {
					titleString += "0";
				}
				titleString += (this.state.creationTime.getMonth() + 1) + ""; // month +1 because starts at 0
				if (this.state.creationTime.getDate() < 10) {
					titleString += "0";
				}
				titleString += this.state.creationTime.getDate() + "-";
				if (this.state.creationTime.getHours() < 10) {
					titleString += "0";
				}
				titleString += this.state.creationTime.getHours();
				if (this.state.creationTime.getMinutes() < 10) {
					titleString += "0";
				}
				titleString += this.state.creationTime.getMinutes();
				if (this.state.creationTime.getSeconds() < 10) {
					titleString += "0";
				}
				titleString += this.state.creationTime.getSeconds();
				if (this.state.creationTime.getMilliseconds() < 10) {
					titleString += "0";
				}
				if (this.state.creationTime.getMilliseconds() < 100) {
					titleString += "0";
				}
				titleString += this.state.creationTime.getMilliseconds();
				// store it for later and update the tile.
				this.state.creationTime = titleString;
				this.formatAndSetTitle(this.state.creationTime);
			}
			// if loaded will include the creationTime
			if (msgParams.creationTime !== undefined && msgParams.creationTime !== null) {
				this.formatAndSetTitle(msgParams.creationTime);
			}
		}

		// adjust height to show all text. minimum 5 lines enforce(?)
		this.needTextZoneHeight = (this.needTextZoneHeight < 5) ? 5 : this.needTextZoneHeight;
		this.sizeModification = parseInt(this.element.clientWidth) / this.startingAppWidth;
		this.sendResize(this.sage2_width,
			this.needTextZoneHeight * this.startingFontHeight * this.sizeModification);

		// save if didn't come from file
		if (msgParams.fileDefined !== true) {
			this.saveNote(msgParams.creationTime);
		}
	},

	setColor: function(responseObject) {
		this.backgroundChoice         = responseObject.color;
		this.state.colorChoice        = this.backgroundChoice;
		this.element.style.background = responseObject.color;
		this.saveNote(responseObject.creationTime);
	},

	formatAndSetTitle: function(wholeName) {
		// Breaking apart whole name and using moment.js to make easier to read.
		var parts  = wholeName.split("-"); // 0 name - 1 qn - 2 YYYYMMDD - 3 HHMMSSmmm
		var author = parts[0];
		var month  = parseInt(parts[2].substring(4, 6)); // YYYY[MM]
		var day    = parseInt(parts[2].substring(6, 8)); // YYYYMM[DD]
		var hour   = parseInt(parts[3].substring(0, 2)); // [HH]
		var min    = parseInt(parts[3].substring(2, 4)); // HH[MM]
		// Moment conversion
		var momentTime = {
			month: month - 1,
			day: day,
			hour: hour,
			minute: min
		};
		momentTime = moment(momentTime);
		// If the author is supposed to be Anonymouse, then omit author inclusion and marker.
		if (author === "Anonymous") {
			this.noteTitle = momentTime.format("MMM Do, hh:mm A");
		} else { // Otherwise have the name followed by @
			this.noteTitle = author + " @ " + momentTime.format("MMM Do, hh:mm A");
		}
		this.updateTitle(this.noteTitle);
	},

	load: function(date) {
		if (this.state.clientInput !== undefined && this.state.clientInput !== null) {
			this.setMessage({
				clientName:   this.state.clientName,
				clientInput:  this.state.clientInput,
				colorChoice:  this.state.colorChoice,
				creationTime: this.state.creationTime
			});
		}
		this.resize(date);
	},

	saveNote: function(date) {
		if (this.state.creationTime === null || this.state.creationTime === undefined) {
			return;
		}
		// This is what saves the state between sessions as far as can be determined.
		this.SAGE2UpdateAppOptionsFromState();
		this.SAGE2Sync(true);
		this.resize();
		// Tell server to save the file.
		var fileData = {};
		fileData.fileType = "note"; // Extension
		fileData.fileName = this.state.creationTime + ".note"; // Fullname with extension
		// What to save in the file
		fileData.fileContent = this.state.creationTime
			+ "\n"
			+ this.state.colorChoice
			+ "\n"
			+ this.state.clientInput;
		wsio.emit("saveDataOnServer", fileData);
		// save the state value
		this.state.contentsOfNoteFile = fileData.fileContent;

		// update the context menu with the current content
		this.getFullContextMenuAndUpdate();
	},

	draw: function(date) {
		// left intentionally blank
	},

	resize: function(date) {
		this.element.style.background = this.backgroundChoice;
		this.sizeModification = parseInt(this.element.clientWidth) / this.startingAppWidth;
		this.element.style.fontSize = (this.startingFontSize * this.sizeModification) + "px";
	},

	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
	},

	duplicate: function(responseObject) {
		if (isMaster) {
			// function(appName, x, y, params, funcToPassParams) {
			this.launchAppWithValues("quickNote", {
				clientName: responseObject.clientName,
				clientInput: this.state.clientInput,
				colorChoice: this.state.colorChoice
			},
			this.sage2_x + 100, this.sage2_y);
		}
	},

	/**
	* To enable right click context menu support this function needs to be present.
	*
	* Must return an array of entries. An entry is an object with three properties:
	*	description: what is to be displayed to the viewer.
	*	callback: String containing the name of the function to activate in the app. It must exist.
	*	parameters: an object with specified datafields to be given to the function.
	*		The following attributes will be automatically added by server.
	*			serverDate, on the return back, server will fill this with time object.
	*			clientId, unique identifier (ip and port) for the client that selected entry.
	*			clientName, the name input for their pointer. Note: users are not required to do so.
	*			clientInput, if entry is marked as input, the value will be in this property. See pdf_viewer.js for example.
	*		Further parameters can be added. See pdf_view.js for example.
	*/
	getContextEntries: function() {
		var entries = [];
		var entry;

		entry = {};
		entry.description = "Edit Note";
		entry.callback    = "SAGE2_editQuickNote";
		entry.parameters  = {
			currentContent: this.state.clientInput,
			currentColorChoice: this.state.colorChoice
		};
		entries.push(entry);

		entries.push({description: "separator"});

		entry = {};
		entry.description = "Duplicate";
		entry.callback    = "duplicate";
		entry.parameters  = {};
		entries.push(entry);

		entries.push({description: "separator"});

		entry = {};
		entry.description = "Blue";
		entry.callback    = "setColor";
		entry.parameters  = { color: "lightblue"};
		entry.entryColor  = "lightblue";
		entries.push(entry);

		entry = {};
		entry.description = "Yellow";
		entry.callback    = "setColor";
		entry.parameters  = { color: "lightyellow"};
		entry.entryColor  = "lightyellow";
		entries.push(entry);

		entry = {};
		entry.description = "Pink";
		entry.callback    = "setColor";
		entry.parameters  = { color: "lightpink"};
		entry.entryColor  = "lightpink";
		entries.push(entry);

		entry = {};
		entry.description = "Green";
		entry.callback    = "setColor";
		entry.parameters  = { color: "lightgreen"};
		entry.entryColor  = "lightgreen";
		entries.push(entry);

		entry = {};
		entry.description = "White";
		entry.callback    = "setColor";
		entry.parameters  = { color: "white"};
		entry.entryColor  = "white";
		entries.push(entry);

		entry = {};
		entry.description = "Orange";
		entry.callback    = "setColor";
		entry.parameters  = { color: "lightsalmon"};
		entry.entryColor  = "lightsalmon";
		entries.push(entry);

		entries.push({
			description: "Copy content to clipboard",
			callback: "SAGE2_copyURL",
			parameters: {
				url: this.noteTitle + "\n" + this.state.clientInput + "\n"
			}
		});

		return entries;
	},

	quit: function() {
		// no additional calls needed.
	}

});
