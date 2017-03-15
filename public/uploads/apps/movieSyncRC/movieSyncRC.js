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

var movieSyncRC = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "onfinish";
		this.passSAGE2PointerAsMouseEvents = true;

		this.element.id = "div" + data.id;
		this.element.style.fontSize   = ui.titleTextSize + "px";
		// Using SAGE2 default font
		this.element.style.fontFamily = "Arimo, Helvetica, sans-serif";
		this.maxFPS = 3; // don't need super fast detection. instr


		// Default starting attributes
		var _this = this;
		this.pausedStatus = true;
		this.loopStatus = false;
		this.muteStatus = false;

		this.playerRemoteIsOver = null;
		this.rectangleHelper = {
			x: 0,
			y: 0,
			w: 0,
			h: 0,
			setValues: function(nx, ny, nw, nh){
				this.x = nx;
				this.y = ny;
				this.w = nw;
				this.h = nh;
			},
			contains: function (px, py) {
				return (this.x    <= px
						&& px     <= this.x + this.w
						&& this.y <= py
						&& py     <= this.y + this.h);
			}
		};
		// no transparency
		this.element.style.background = "lightgray";

		// inject html code    file to grab from,    element.innerHTML to override
		this.loadHtmlFromFile(this.resrcPath + "design.html", this.element, function() {
			_this.postHtmlFillActions();
		});
	},

	loadHtmlFromFile: function(relativePathFromAppFolder, whereToAppend, callback) {
		var xhr = new XMLHttpRequest();
		var _this = this;
		xhr.onreadystatechange = function() {
			if ( xhr.readyState === 4 ) {
				if ( xhr.status === 200 || xhr.status === 0 ) {
					// xhr.responseText should contain the contents.
					_this.loadIntoAppendLocation(whereToAppend, xhr.responseText);
					callback();
				}
			}
		};
		xhr.open( "GET", relativePathFromAppFolder, true );
		xhr.setRequestHeader( "Content-Type", "text/plain" );
		xhr.send( null );
	},

	loadIntoAppendLocation: function(whereToAppend, responseText) {
		var content = "";
		// id and spaces because people aren't always consistent
		var idIndex, ids1, ids2, ids3;

		// find location of first id div. Because there will potentially be multiple apps.
		idIndex = this.findNextIdInHtml(responseText);

		// for each id, prefix it with this.id
		while(idIndex !== -1) {
			// based on id location move it over
			content += responseText.substring(0, idIndex);
			responseText = responseText.substring(idIndex);
			// collect up to the first double quote. HTML needs double quotes for id.
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

	findNextIdInHtml: function(responseText) {
		// find location of first id div. Because there will potentially be multiple apps.
		// the multiple checks are incase writers are not consistent
		var idIndex = responseText.indexOf("id=");
		var ids1 = responseText.indexOf("id =");
		var ids2 = responseText.indexOf("id  =");
		var ids3 = responseText.indexOf("id   =");
		// if (idIndex isn't found) or (is found but ids1 also found and smaller than idIndex)
		if ( (idIndex === -1) || (ids1 > -1 && ids1 < idIndex)) {
			idIndex = ids1;
		}
		if ( (idIndex === -1) || (ids2 > -1 && ids2 < idIndex)) {
			idIndex = ids2;
		}
		if ( (idIndex === -1) || (ids3 > -1 && ids3 < idIndex)) {
			idIndex = ids3;
		}
		return idIndex;
	},

	postHtmlFillActions: function() {
		var _this = this;
		// associate variables
		this.addPlayerDiv = document.getElementById(this.id + "addPlayerDiv");
		this.addPlayerButton = document.getElementById(this.id + "addPlayerButton");
		this.addPlayerDiv.style.fontSize = ui.titleTextSize + "px";
		this.addPlayerButton.style.fontSize = ui.titleTextSize + "px";
		// create click effect
		this.addPlayerButton.addEventListener("click", function() {
			_this.doAssociatePlayer();
		});
		// list connected players
		this.listAllPlayersDiv = document.getElementById(this.id + "listAllPlayersDiv");
		this.listAllPlayersDiv.style.fontSize = ui.titleTextSize + "px";
		this.updateListOfAssociatedPlayers();

		// associate button actions.
		this.playPauseButton = document.getElementById(this.id + "playPauseButton");
		this.playPauseButton.addEventListener("click", function() {
			_this.playPauseButtonEffect();
		});
		this.stopButton = document.getElementById(this.id + "stopButton");
		this.stopButton.addEventListener("click", function() {
			_this.stopButtonEffect();
		});
		this.loopButton = document.getElementById(this.id + "loopButton");
		this.loopButton.addEventListener("click", function() {
			_this.loopButtonEffect();
		});
		this.muteButton = document.getElementById(this.id + "muteButton");
		this.muteButton.addEventListener("click", function() {
			_this.muteButtonEffect();
		});
	},

	updateListOfAssociatedPlayers: function() {
		var _this = this;
		var pTitleDiv, pBr, pHr, pRemoveButton, removeId;
		this.listAllPlayersDiv.innerHTML = "Connected Movies:";

		for (var i = 0; i < this.state.associatedPlayers.length; i++) {
			// new line per movie
			pBr = document.createElement("br");
			this.listAllPlayersDiv.appendChild(pBr);
			pHr = document.createElement("hr");
			this.listAllPlayersDiv.appendChild(pHr);
			// add title div
			pTitleDiv = document.createElement("div");
			pTitleDiv.textContent = this.state.associatedPlayers[i].title;
			pTitleDiv.style.fontSize = ui.titleTextSize + "px";
			pBr = document.createElement("br");
			pTitleDiv.appendChild(pBr);
			// create button
			pRemoveButton = document.createElement("button");
			pRemoveButton.textContent = "Remove";
			pRemoveButton.style.background = "lightpink";
			pRemoveButton.style.fontSize = ui.titleTextSize + "px";
			removeId = _this.state.associatedPlayers[i].id;
			pRemoveButton.addEventListener("click", function() {
				_this.removeAssociatedPlayer(removeId);
			})
			pTitleDiv.appendChild(pRemoveButton);
			this.listAllPlayersDiv.appendChild(pTitleDiv);
		}
	},

	load: function(date) {
		console.log("load activated but code isn't implemented!");
	},

	/**
	* Used as a logic loop. Each draw() will check if over a movie player.
	*/
	draw: function(date) {
		// this remote's size
		var rx = this.sage2_x, ry = this.sage2_y, rw = this.sage2_width, rh = this.sage2_height;
		var foundPlayer = false;
		var idsOfAssociatedPlayers = [];
		for (var i = 0; i < this.state.associatedPlayers.length; i++) {
			idsOfAssociatedPlayers.push(this.state.associatedPlayers[i].id);
		}
		// go through each application
		for (var key in applications) {
			if (applications[key].application === "movie_player"
				&& !idsOfAssociatedPlayers.includes(applications[key].id)) {
				// set the rectangle help to match the application
				this.rectangleHelper.setValues(
					applications[key].sage2_x,
					applications[key].sage2_y,
					applications[key].sage2_width,
					applications[key].sage2_height);
				// if the application contains any of the four corners / center of this remote
				if (this.rectangleHelper.contains(rx, ry)
					|| this.rectangleHelper.contains(rx + rw, ry)
					|| this.rectangleHelper.contains(rx, ry + rh)
					|| this.rectangleHelper.contains(rx + rw, ry + rh)
					|| this.rectangleHelper.contains(rx + rw / 2, ry + rh / 2)) {
					this.enableAssociatePlayerButton(applications[key]);
					foundPlayer = true;
				}
			}
		}
		if (!foundPlayer) {
			this.disableAssociatePlayerButton();
			this.getFullContextMenuAndUpdate();
		}

	},

	enableAssociatePlayerButton: function(playerObject) {
		if (this.addPlayerButton !== undefined) {
			this.addPlayerButton.style.visibility = "visible";
			this.addPlayerButton.textContent = "Associate:" + playerObject.title;
			this.playerRemoteIsOver = playerObject;

			this.getFullContextMenuAndUpdate();
		}
	},

	disableAssociatePlayerButton: function() {
		if (this.addPlayerButton !== undefined) {
			this.addPlayerButton.style.visibility = "hidden";
		}
	},

	doAssociatePlayer: function() {
		if (this.playerRemoteIsOver !== null && this.playerRemoteIsOver !== undefined) {
			this.state.associatedPlayers.push(this.playerRemoteIsOver);
			this.playerRemoteIsOver = null;
			this.updateListOfAssociatedPlayers();
			this.disableAssociatePlayerButton();
			
			this.getFullContextMenuAndUpdate();
		}
	},

	removeAssociatedPlayer: function(idOfPlayerToRemove) {
		for (var i = 0; i < this.state.associatedPlayers.length; i++) {
			if (this.state.associatedPlayers[i].id === idOfPlayerToRemove) {
				this.state.associatedPlayers.splice(i, 1);
				break;
			}
		}
		this.updateListOfAssociatedPlayers();
	}, 

	resize: function(date) {
		this.element.style.background = this.backgroundChoice;
		var percentChange = parseInt(this.element.clientWidth) / this.startingWidth;
		this.element.style.fontSize = (this.startingFontSize * percentChange) + "px";
	},

	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
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

		if (this.playerRemoteIsOver !== null && this.playerRemoteIsOver !== undefined) {
			entry = {};
			entry.description = "Associate " + this.playerRemoteIsOver.title;
			entry.callback    = "doAssociatePlayer";
			entry.entryColor  = "lightgreen";
			entry.parameters  = {};
			entries.push(entry);
			// separate
			entry = {};
			entry.description = "separator";
			entries.push(entry);
		}

		if (this.pausedStatus) {
			entry = {};
			entry.description = "Play";
			entry.callback    = "playPauseButtonEffect";
			entry.parameters  = {};
			entries.push(entry);
		} else {
			entry = {};
			entry.description = "Pause";
			entry.callback    = "playPauseButtonEffect";
			entry.parameters  = {};
			entries.push(entry);
		}

		entry = {};
		entry.description = "Stop";
		entry.callback    = "stopButtonEffect";
		entry.parameters  = {};
		entries.push(entry);

		if (this.loopStatus) {
			entry = {};
			entry.description = "Stop Looping";
			entry.callback    = "loopButtonEffect";
			entry.parameters  = {};
			entries.push(entry);
		} else {
			entry = {};
			entry.description = "Loop Video";
			entry.callback    = "loopButtonEffect";
			entry.parameters  = {};
			entries.push(entry);
		}

		if (this.muteStatus) {
			entry = {};
			entry.description = "Unmute";
			entry.callback    = "muteButtonEffect";
			entry.parameters  = {};
			entries.push(entry);
		} else {
			entry = {};
			entry.description = "Mute";
			entry.callback    = "muteButtonEffect";
			entry.parameters  = {};
			entries.push(entry);
		}


		entry = {};
		entry.description = "Jump to second";
		entry.callback    = "setPlayersToSecond";
		entry.parameters  = {};
		entry.inputField  = true;
		entry.inputFieldSize = 5;
		entries.push(entry);


		if (this.state.associatedPlayers.length > 0) {
			// separate
			entry = {};
			entry.description = "separator";
			entries.push(entry);
			// add remove option for each
			for (var i = 0; i < this.state.associatedPlayers.length; i++){
				entry = {};
				entry.description = "Disassociate " + this.state.associatedPlayers[i].title;
				entry.callback    = "contextMenuRemoveAssociatedPlayer";
				entry.entryColor  = "lightpink";
				entry.parameters  = {
					playerId: this.state.associatedPlayers[i].id
				};
				entries.push(entry);
			}
		}

		return entries;
	},



	// ------------------------------------------------------------------------------------------------------------------------
	// ------------------------------------------------------------------------------------------------------------------------
	/**
		For each of the applications, first set the state because they need to all sync to the movieSyncRC.
		Then apply the corresponding function
	*/
	playPauseButtonEffect: function() {
		for (var i = 0; i < this.state.associatedPlayers.length; i++) {
			this.state.associatedPlayers[i].state.paused = this.pausedStatus;
			this.state.associatedPlayers[i]["contextTogglePlayPause"](new Date());
		}
		// set after, and flip the status
		this.pausedStatus = !this.pausedStatus;

		if (this.pausedStatus) {
			this.playPauseButton.src = "../../../images/appUi/playBtn.svg" 
		} else {
			this.playPauseButton.src = "../../../images/appUi/pauseBtn.svg" 
		}
		this.getFullContextMenuAndUpdate();
	},
	stopButtonEffect: function() {
		// not playing first because this is a stop button
		this.pausedStatus = true;
		for (var i = 0; i < this.state.associatedPlayers.length; i++) {
			this.state.associatedPlayers[i]["stopVideo"](new Date());
		}
		this.getFullContextMenuAndUpdate();
	},
	loopButtonEffect: function() {
		for (var i = 0; i < this.state.associatedPlayers.length; i++) {
			this.state.associatedPlayers[i].state.looped = this.loopStatus;
			this.state.associatedPlayers[i]["toggleLoop"](new Date());
		}
		// set after, and flip the status
		this.loopStatus = !this.loopStatus;

		if (this.loopStatus) {
			this.loopButton.src = "../../../images/appUi/dontLoopBtn.svg" 
		} else {
			this.loopButton.src = "../../../images/appUi/loopBtn.svg" 
		}
		this.getFullContextMenuAndUpdate();
	},
	muteButtonEffect: function() {
		for (var i = 0; i < this.state.associatedPlayers.length; i++) {
			this.state.associatedPlayers[i].state.muted = this.muteStatus;
			this.state.associatedPlayers[i]["contextToggleMute"](new Date());
		}
		// set after, and flip the status
		this.muteStatus = !this.muteStatus;

		if (this.muteStatus) {
			this.muteButton.src = "../../../images/appUi/muteBtn.svg" 
		} else {
			this.muteButton.src = "../../../images/appUi/soundBtn.svg" 
		}
		this.getFullContextMenuAndUpdate();
	},
	setPlayersToSecond: function(responseObject) {
		var second = parseInt(responseObject.clientInput);

		this.getFullContextMenuAndUpdate();
	},
	contextMenuRemoveAssociatedPlayer: function(responseObject) {
		this.removeAssociatedPlayer(responseObject.playerId);
	},

	quit: function() {
		// no additional calls needed.
	}

});
