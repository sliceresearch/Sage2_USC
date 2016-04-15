// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

"use strict";

var quickNote = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous"; // "onfinish";

		this.element.id = "div" + data.id;

		var workingDiv = document.getElementById( this.element.id );
		workingDiv.style.background = "lightyellow";
		workingDiv.width 			= this.element.clientWidth + "px";
		workingDiv.height 			= this.element.clientHeight + "px";

		workingDiv.style.fontSize 	= ui.titleTextSize + "px";

		this.backgroundChoice = "lightyellow";
		this.startingFontSize = ui.titleTextSize;
		this.startingWidth    = 300; // hard coded to match instructions width
		// This is critical for naming of file scheme. Currently the file name will be based upon creator and time.
		// However this does have potential issues later. For example edits by different users.
		// console.log("erase me, value of creationTime:" + this.state.creationTime );

		// this.setMessage(
		// 	{
		// 		clientName: "Quick Note",
		// 		clientInput: "Loading note from user..."
		// 	})


		// console.log("erase me, init function activate this.state");
		// console.dir(this.state);

		this.setMessage(this.state);

		// If a .note file is drag and dropped with launch with the known file
		// var data = {};
		// data.type     = "consolePrint";
		// data.message  = "Quick note was launched with file:" + this.state.file;
		// wsio.emit("csdMessage", data);
		// var msgData = {};
		// msgData.type     = "consolePrint";
		// msgData.message  = "QuickNote: does it have the new variable:" + data.thisVariableIsNew;
		// wsio.emit("csdMessage", msgData);
		console.log("erase me, printing supposedly the passed data" + data);
		console.dir(data);
		console.log("erase me, compared to this" + this);
		console.dir(this);
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
		var fileData = {};
		var fileLines = fileContentsFromServer.split("\n");
		fileData.fileDefined = true;
		fileData.clientName = fileLines[0];
		fileData.colorChoice = fileLines[1];
		fileData.clientInput = fileLines[2];
		this.setMessage(fileData);
	},

	/**
	msgParams.clientName	Client input pointer name
	msgParams.clientInput	What they typed for the note.
	*/
	setMessage: function(msgParams) {
		var workingDiv = document.getElementById( this.element.id );
		// First remove potential new lines from input
		if (msgParams.clientInput) { msgParams.clientInput = msgParams.clientInput.replace(/\n/g,""); }
		// If defined by a file, use those values
		if (msgParams.fileDefined === true) {
			this.backgroundChoice       = msgParams.colorChoice;
			this.state.colorChoice      = this.backgroundChoice;
			workingDiv.style.background = msgParams.colorChoice;
			this.state.clientInput      = msgParams.clientInput;
			workingDiv.innerHTML        = msgParams.clientInput;
			this.state.creationTime     = msgParams.clientName;
			this.updateTitle(this.state.creationTime);
			this.saveNote(msgParams.creationTime);
			return;
		}

		// Otherwise set the values using probably user input.
		if (msgParams.clientName === undefined || msgParams.clientName === null || msgParams.clientName =="") {
			msgParams.clientName = "Anonymous";
		}
		// If the color choice was not defined, default to lightyellow.
		if (msgParams.colorChoice === undefined || msgParams.colorChoice === null || msgParams.colorChoice =="") {
			this.backgroundChoice = "lightyellow";
			workingDiv.style.background = "lightyellow";
		}
		else { // Else use the given color.
			this.backgroundChoice = msgParams.colorChoice;
			workingDiv.style.background = msgParams.colorChoice;
		}

		workingDiv.innerHTML = msgParams.clientInput;

		this.state.clientName = msgParams.clientName;
		this.state.clientInput = msgParams.clientInput;
		this.state.colorChoice = this.backgroundChoice;

		console.log("erase me, setMessage function activate this.state");
		console.dir(this.state);

		// if the creationTime has not been set, then fill it out.
		if (this.state.creationTime === null
			&& msgParams.serverDate !== undefined
			&& msgParams.serverDate !== null) {
			this.state.creationTime = new Date(msgParams.serverDate);
			// build the title string.
			var titleString = msgParams.clientName + "-QN-" + this.state.creationTime.getFullYear();
			if (this.state.creationTime.getMonth() < 9) { titleString += "0"; }
			titleString += (this.state.creationTime.getMonth() + 1) + ""; // month +1 because starts at 0
			if (this.state.creationTime.getDate() < 10) { titleString += "0"; }
			titleString += this.state.creationTime.getDate() + "-";
			if (this.state.creationTime.getHours() < 10) { titleString += "0"; }
			titleString += this.state.creationTime.getHours();
			if (this.state.creationTime.getMinutes() < 10) { titleString += "0"; }
			titleString += this.state.creationTime.getMinutes();
			if (this.state.creationTime.getSeconds() < 10) { titleString += "0"; }
			titleString += this.state.creationTime.getSeconds();
			if (this.state.creationTime.getMilliseconds() < 10) { titleString += "0"; }
			if (this.state.creationTime.getMilliseconds() < 100) { titleString += "0"; }
			titleString += this.state.creationTime.getMilliseconds();
			// store it for later and update the tile.
			this.state.creationTime = titleString;
			this.updateTitle(this.state.creationTime);
			console.log("Should have updated title to:" + titleString);
		}
		// if loaded will include the creationTime
		if (msgParams.creationTime !== undefined && msgParams.creationTime !== null) {
			this.updateTitle(msgParams.creationTime);
		}
		this.saveNote(msgParams.creationTime);
	},

	load: function(date) {
		if (this.state.clientInput !== undefined && this.state.clientInput !== null) {
			this.setMessage({
				clientName:this.state.clientName,
				clientInput:this.state.clientInput,
				colorChoice:this.state.colorChoice,
				creationTime:this.state.creationTime
			});
		}
		console.log("erase me, load function activate this.state");
		console.dir(this.state);
		this.resize(date);
	},

	saveNote: function(date) {
		if (this.state.creationTime === null || this.state.creationTime === undefined) { return; }
		// This is what saves the state between sessions as far as can be determined.
		this.SAGE2UpdateAppOptionsFromState();
		this.SAGE2Sync(true);
		this.resize();

		// Tell server to save the file.
		var fileData = {};
		fileData.type = "saveDataOnServer";
		fileData.fileType = "note";
		fileData.fileName = this.state.creationTime + ".note";
		fileData.fileContent = this.state.creationTime
			+ "\n"
			+ this.state.colorChoice
			+ "\n"
			+ this.state.clientInput;

		console.log();
		console.log();
		console.log();
		console.log("erase me, double checking save data");
		console.log("type:" + fileData.fileType);
		console.log("name:" + fileData.fileName);
		console.log("content:" + fileData.fileContent);
		console.log("oc creationTime:" + this.state.creationTime);
		console.log("oc colorChoice:" + this.state.colorChoice);
		console.log("oc clientInput:" + this.state.clientInput);
		wsio.emit("csdMessage", fileData);
	},

	draw: function(date) {
	},

	resize: function(date) {
		var workingDiv = document.getElementById( this.element.id );
		workingDiv.style.background = this.backgroundChoice;
		workingDiv.width = this.element.clientWidth + "px";
		workingDiv.height = this.element.clientHeight + "px";

		var percentChange = parseInt( this.element.clientWidth ) / this.startingWidth;
		workingDiv.style.fontSize = (this.startingFontSize * percentChange) + "px";
	},

	event: function(eventType, position, user_id, data, date) {

	},

	duplicate: function() {
		if (isMaster) {
			var data = {};
			data.type		= "launchAppWithValues";
			data.appName	= "quickNote";
			data.func		= "setMessage";
			data.params		= {};
			data.params.clientName = this.state.clientName;
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
	getContextEntries: function(	) {
		var entries = [];
		var entry;

		entry = {};
		entry.description = "Duplicate";
		entry.callback = "duplicate";
		entry.parameters = {};
		entries.push(entry);

		entry = {};
		entry.description = "Change Note:";
		entry.callback = "setMessage";
		entry.parameters = {};
		entry.inputField = true;
		entry.inputFieldSize = 20;
		entries.push(entry);

		return entries;
	},

	quit: function() {
		// no additional calls needed.
	}

});
