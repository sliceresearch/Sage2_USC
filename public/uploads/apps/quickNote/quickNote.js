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
		this.element.style.fontFamily = "Arimo, Helvetica, sans-serif";
		// Default starting attributes
		this.backgroundChoice = "lightyellow";
		this.startingFontSize = ui.titleTextSize;
		this.startingWidth    = 300; // Hardcode necessary to keep scale on resize/restart/reload
		// textarea setup
		this.txtArea = document.createElement("textarea");
		this.txtArea.rows = 5;
		this.txtArea.cols = 22;
		this.txtArea.style.resize = 'none';
		// this.txtArea.style.width = "100%";
		// this.txtArea.style.height = "100%";
		this.txtArea.style.fontFamily = "Arimo, Helvetica, sans-serif";
		this.txtArea.style.fontSize = '30px';
		this.element.appendChild(this.txtArea);

		// Keep a copy of the title
		this.noteTitle = "";

		// If loaded from session, this.state will have meaningful values.
		this.setMessage(this.state);

		// If it got file contents from the sever, then extract.
		if (data.state.contentsOfNoteFile) {
			this.parseDataFromServer(data.state.contentsOfNoteFile);
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
		// First remove potential new lines from input
		if (msgParams.clientInput) {
			msgParams.clientInput = msgParams.clientInput.replace(/\n/g, "<br>");
		}
		// If defined by a file, use those values
		if (msgParams.fileDefined === true) {
			this.backgroundChoice   = msgParams.colorChoice;
			this.state.colorChoice  = this.backgroundChoice;
			this.state.clientInput  = msgParams.clientInput;
			this.state.creationTime = msgParams.clientName;
			this.element.style.background = msgParams.colorChoice;
			this.element.innerHTML        = msgParams.clientInput;
			this.formatAndSetTitle(this.state.creationTime);
			this.saveNote(msgParams.creationTime);
			return;
		}

		// Otherwise set the values using probably user input.
		if (msgParams.clientName === undefined || msgParams.clientName === null || msgParams.clientName == "") {
			msgParams.clientName = "";
		}
		// If the color choice was defined, use the given color. RMB choices do not provide a color (currently)
		if (msgParams.colorChoice !== undefined && msgParams.colorChoice !== null && msgParams.colorChoice !== "") {
			this.backgroundChoice = msgParams.colorChoice;
			this.element.style.background = msgParams.colorChoice;
		}

		this.element.innerHTML = msgParams.clientInput;

		this.state.clientName  = msgParams.clientName;
		this.state.clientInput = msgParams.clientInput;
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
		this.saveNote(msgParams.creationTime);
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
		fileData.type = "saveDataOnServer";
		fileData.fileType = "note"; // Extension
		fileData.fileName = this.state.creationTime + ".note"; // Fullname with extension
		// What to save in the file
		fileData.fileContent = this.state.creationTime
			+ "\n"
			+ this.state.colorChoice
			+ "\n"
			+ this.state.clientInput;
		wsio.emit("csdMessage", fileData);

		// update the context menu with the current content
		this.getFullContextMenuAndUpdate();
	},

	draw: function(date) {
		// left intentionally blank
	},

	resize: function(date) {
		this.element.style.background = this.backgroundChoice;
		var percentChange = parseInt(this.element.clientWidth) / this.startingWidth;
		this.element.style.fontSize = (this.startingFontSize * percentChange) + "px";
	},

	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
	},

	duplicate: function(responseObject) {
		if (isMaster) {
			var data = {};
			data.type       = "launchAppWithValues";
			data.appName    = "quickNote";
			data.func       = "setMessage";
			data.xLaunch    = this.sage2_x + 100;
			data.yLaunch    = this.sage2_y;
			data.params		= {};
			data.params.clientName  = responseObject.clientName;
			data.params.clientInput = this.state.clientInput;
			data.params.colorChoice = this.state.colorChoice;
			wsio.emit("csdMessage", data);
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
		entry.description = "Duplicate";
		entry.callback    = "duplicate";
		entry.parameters  = {};
		entries.push(entry);

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

		entry = {};
		entry.description = "Change Note:";
		entry.callback    = "setMessage";
		entry.parameters  = {};
		entry.inputField  = true;
		entry.inputFieldSize = 20;
		entries.push(entry);

		entries.push({description: "separator"});

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
