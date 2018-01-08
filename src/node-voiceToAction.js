// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2017


// Require variables to be declared
"use strict";

// Builtins
var fs = require('fs');

// SAGE2 modules
var sageutils = require('../src/node-utils');

/**
 * VoiceActionManager container object.
 *
 * @class VoiceActionManager
 * @constructor
 * @param  {object} obj - Object containing necessary references to function at server top level
 */
function VoiceActionManager(obj) {
	this.s2 = obj;
	this.fullLog = [];
	this.lastLogEntry = "";
	this.currentCommandLogInfo = {}; // Used for tracking.
	var today = new Date();
	this.fileLogPath = "./" + today.getFullYear() + "-"
		+ (today.getMonth() + 1) + "-" + today.getDate() + "-transcript.json";
	this.confirmPhrases = null;
	this.rejectPhrases = null;
	this.appIdUnderPointer = null;
	this.fillPhrases();
}

/**
 * Adds to log. The log is actually two server variables that can be retrieved,
 * since it always uses the same name.
 * Consideration for future purposes: maybe the transcript should be another
 * available variable.
 *
 * @method log
 * @param  {Array} clients - A reference to the client list.
 */
VoiceActionManager.prototype.oldLog = function(line, shouldConsolePrint = false) {
	this.fullLog.push(line);
	this.lastLogEntry = line;
	if (shouldConsolePrint) {
		sageutils.log("Voice", line);
	}
	// First param should be wsio, but is not needed for set value (at least not currently)
	this.s2.sharedServerData.setValue(null, {
		nameOfValue: "voiceToActionFullLog",
		value: this.fullLog,
		description: "This is a list of history for voiceToAction"
	});
	// First param should be wsio, but is not needed for set value (at least not currently)
	this.s2.sharedServerData.setValue(null, {
		nameOfValue: "voiceToActionLastEntry",
		value: this.lastLogEntry,
		description: "This is the last entry submitted by voiceToAction"
	});
};

/**
 * File logging for command submission and transcripts.
 * Writes based on data within this.currentCommandLogInfo.
 *
 * Must be enabled with the configuration file entry: logVoiceCommands.
 *
 * @method fileLog
 */
VoiceActionManager.prototype.fileLog = function() {
	if (this.currentCommandLogInfo.logged
		|| !this.s2.config.voice_commands.log) {
		// Don't double log
		return;
	}
	var currentLog;
	try {
		currentLog = JSON.parse(fs.readFileSync(this.fileLogPath));
	} catch (e) {
		currentLog = [];
	}
	currentLog.push(this.currentCommandLogInfo);
	fs.writeFileSync(this.fileLogPath, JSON.stringify(currentLog));
	// Set logged to true to prevent error catch log
	this.currentCommandLogInfo.logged = true;
};

/**
 * Entry point for voice alteration
 *
 * @method process
 * @param  {Object} wsio - conneciton that initiated the voice command
 * @param  {Object} data - should contain .words a string of transcript.
 * @param  {String} data.words - what was said.
 */
VoiceActionManager.prototype.process = function(wsio, data) {
	this.currentCommandLogInfo = {
		time: Date.now(),
		transcript: {
			confidence: data.confidence,
			full: data.words,
			evaluated: ""
		},
		command: {
			wallCommand: false,
			inputValue: false,
			activatedFunction: "",
			description: "",
			keywords: ""
		},
		app: {
			id:     null,
			title:  null,
			type:   null,
			left:   null,
			top:    null,
			width:  null,
			height: null
		},
		status: "No Prompt - No Command Check",
		logged: false,
		currentSuccessPhrase: ""
	};
	try {
		this.secondaryProcessCallToUseInTryCatch(wsio, data);
	} catch (e) {
		this.oldLog(e, true);
		this.currentCommandLogInfo.status = "Error during lookup";
	}
	if (this.currentCommandLogInfo.logged === false) {
		this.fileLog();
	}
};

/**
 * Moved everything there to clean try catch
 *
 * @method secondaryProcessCallToUseInTryCatch
 * @param  {Object} wsio - conneciton that initiated the voice command
 * @param  {Object} data - should contain .words a string of transcript.
 * @param  {String} data.words - what was said.
 */
VoiceActionManager.prototype.secondaryProcessCallToUseInTryCatch = function(wsio, data) {
	// First check that the word voiceNameMarker was used
	if (!data.words.toLowerCase().includes(this.s2.voiceNameMarker.toLowerCase())) {
		// Wait for initiation
		return;
	}
	// Chop from beginning of voiceNameMarker
	data.words = data.words.slice(
		data.words.toLowerCase().indexOf(this.s2.voiceNameMarker.toLowerCase()));
	// Then take out voiceNameMarker
	data.words = data.words.slice(data.words.indexOf(" ") + 1);
	// Turn - into ' '. particularly "next-page" to "next page"
	data.words = data.words.replace(/-/g, ' ').trim();

	// Log the words evaluated
	this.currentCommandLogInfo.status = "No Match";
	this.currentCommandLogInfo.transcript.evaluated = data.words;

	// Get the pointer associated to this wsio
	var userPointer = this.s2.sagePointers[wsio.id];
	this.currentCommandLogInfo.userInformation = {
		id:    userPointer.id,
		name:  userPointer.label,
		color: userPointer.color,
		left:  userPointer.left,
		top:   userPointer.top,
		visibleLeft: userPointer.visibleLeft,
		visibleTop:  userPointer.visibleTop,
		visible:     userPointer.visible
	};

	// Can't do anything if there is no pointer.
	if (!userPointer) {
		this.oldLog("ERROR>wsVoiceToContextMenu> No pointer detected for this wsio.id:" + wsio.id, true);
		return;
	}
	var pointerX = this.s2.sagePointers[wsio.id].left;
	var pointerY = this.s2.sagePointers[wsio.id].top;

	// Get app under pointer, then get context menu
	var obj = this.s2.interactMgr.searchGeometry({x: pointerX, y: pointerY});
	var contextMenu = null, app = false;
	this.appIdUnderPointer = null;
	if (obj !== null) {
		// Check type of item under click
		if (this.s2.SAGE2Items.applications.list.hasOwnProperty(obj.data.id)) {
			// If an app was under the rmb click
			if (this.s2.SAGE2Items.applications.list[obj.data.id].contextMenu) {
				contextMenu = this.s2.SAGE2Items.applications.list[obj.data.id].contextMenu;
				app = obj.data.id;
				this.appIdUnderPointer = app;
			}
		}
	}
	// Should have passed one string of words
	var words = data.words.toLowerCase().split(" ");
	// If the server prechecks and eats the command then don't send it to an app.
	if (data.words.includes("cancel")) {
		this.oldLog("Command contained cancel, discarding: " + data.words, true);
		this.currentCommandLogInfo.command.name = "CANCEL";
		// Unsure if this is a bad check
		return;
	}


	// Check command for matches. First check for wall commands.
	if (this.voicePreCheckForWallCommands(wsio, words)) {
		this.currentCommandLogInfo.command.wallCommand = true;
		wsio.emit("playVoiceCommandSuccessSound", {message: this.currentCommandLogInfo.currentSuccessPhrase});
		return;
	}

	// Getting here means the command didn't match against a server command. Check app under pointer.
	var matchedMenu = null;
	if (contextMenu) {
		// Pass the context menu and the transcript words array
		// Returns object with: menuMatches(array), indexOfMostMatches, foundMatch, highestMatchCount
		matchedMenu = this.checkForContextMenuMatch(contextMenu, words);
		if (matchedMenu.foundMatch) {
			matchedMenu.app = app;
		} else {
			matchedMenu = null;
		}
	}
	// If no matched menu, search other apps for best match
	if (!matchedMenu) {
		let appIds = Object.keys(this.s2.SAGE2Items.applications.list);
		let allMenuResults = [];
		let currentBestMatch = {
			count: 0,
			app: null,
			indexOnApp: -1,
			indexOfResult: -1
		};
		for (let i = 0; i < appIds.length; i++) {
			// If it has a contextMenu
			if (this.s2.SAGE2Items.applications.list[appIds[i]].contextMenu) {
				allMenuResults.push(this.checkForContextMenuMatch(
					this.s2.SAGE2Items.applications.list[appIds[i]].contextMenu, words));
				allMenuResults[allMenuResults.length - 1].app = appIds[i];
				// If a match was found on this app
				if (allMenuResults[allMenuResults.length - 1].foundMatch
					&& (allMenuResults[allMenuResults.length - 1].highestMatchCount > currentBestMatch.count)) {
					currentBestMatch.count = allMenuResults[allMenuResults.length - 1].highestMatchCount;
					currentBestMatch.app = allMenuResults[allMenuResults.length - 1].app;
					currentBestMatch.indexOnApp = allMenuResults[allMenuResults.length - 1].indexOfMostMatches;
					currentBestMatch.indexOfResult = allMenuResults.length - 1;
				}
			}
		}
		// Check if there was a match
		if (currentBestMatch.app) {
			matchedMenu = allMenuResults[currentBestMatch.indexOfResult];
			matchedMenu.app = currentBestMatch.app;
		}
	}
	// Has checked app under pointer (if any) and other apps, if matchedMenu, then can activate
	if (matchedMenu) {
		// At this point matchedMenu will contain info of the app with best menu match
		// MenuMatches(array), indexOfMostMatches, foundMatch, highestMatchCount, app
		// Get the menu and the particular match entry
		contextMenu = this.s2.SAGE2Items.applications.list[matchedMenu.app].contextMenu;
		var cmEntry = contextMenu[matchedMenu.indexOfMostMatches];
		var lastDescriptionWord;
		var wordsToPassAsInput = null;

		// If the menu entry is for input, try to take anything after the indicator to pass as values
		if (cmEntry.inputField) {
			this.oldLog(app + " has an input field, trying to separate input");
			lastDescriptionWord = cmEntry.description.toLowerCase();
			// Remove : if exists
			lastDescriptionWord = lastDescriptionWord.replace(/:/g, '').trim();
			this.oldLog("Last word in:" + lastDescriptionWord);
			lastDescriptionWord = lastDescriptionWord.split(' ');
			lastDescriptionWord = lastDescriptionWord[lastDescriptionWord.length - 1];
			this.oldLog("  is:" + lastDescriptionWord);
			wordsToPassAsInput = data.words.toLowerCase();
			// Need to send input, find the last descriptor word
			if (wordsToPassAsInput.indexOf(lastDescriptionWord) > -1) {
				wordsToPassAsInput = wordsToPassAsInput.substring(wordsToPassAsInput.indexOf(lastDescriptionWord));
				wordsToPassAsInput = wordsToPassAsInput.substring(lastDescriptionWord.length);
				wordsToPassAsInput = wordsToPassAsInput.trim();
			} else {
				// If last descriptor is not available, then it means cannot pass input.
				wordsToPassAsInput = "";
			}
			this.currentCommandLogInfo.command.inputValue = wordsToPassAsInput;
		}

		// Log the app and command info
		obj = this.s2.SAGE2Items.applications.list[matchedMenu.app];
		this.currentCommandLogInfo.app.id     = obj.id;
		this.currentCommandLogInfo.app.title  = obj.title;
		this.currentCommandLogInfo.app.type   = obj.application;
		this.currentCommandLogInfo.app.left   = obj.left;
		this.currentCommandLogInfo.app.top    = obj.top;
		this.currentCommandLogInfo.app.width  = obj.width;
		this.currentCommandLogInfo.app.height = obj.height;
		// Log command
		this.currentCommandLogInfo.command.activatedFunction = cmEntry.callback;
		this.currentCommandLogInfo.command.description = cmEntry.description;
		this.currentCommandLogInfo.status = "SUCCESS";


		// If there is an input field, but nothing to input, cannot activate function
		if (wordsToPassAsInput && wordsToPassAsInput.length === 0) {
			this.currentCommandLogInfo.status = "FAIL - Missing input";
			this.oldLog("Match found, but missing input in " + app + " for the phrase:" + words, true);
			wsio.emit("playVoiceCommandFailSound", {message: this.getRandomRejectPhrase()});
		} else {
			// Begin sending preparation
			var dataToSend = {
				app: matchedMenu.app,
				func: cmEntry.callback,
				parameters: cmEntry.parameters
			};
			dataToSend.parameters.clientId = wsio.id;
			if (wordsToPassAsInput !== null) {
				// If input, need to pass it along
				dataToSend.parameters.clientInput = wordsToPassAsInput;
				dataToSend.parameters.clientVoiceInput = data.words.toLowerCase();
			}
			// Call the function on the app
			this.s2.wsCallFunctionOnApp(wsio, dataToSend);
			this.oldLog("Action accepted for entry: " + cmEntry.description);
			this.oldLog("Activating " + dataToSend.func + " on " + dataToSend.app);
			if (wordsToPassAsInput !== null) {
				this.oldLog("--clientInput being given:" + wordsToPassAsInput);
			}
			wsio.emit("playVoiceCommandSuccessSound", {message: this.getRandomConfirmPhrase()});
		}
	} else {
		this.oldLog("No voice matches found in " + app + " for the phrase:" + words, true);
		wsio.emit("playVoiceCommandFailSound", {message: this.getRandomRejectPhrase()});
	}
};

/**
 * Will attempt to take a transcript and use best case to match an action.
 *
 * @method voicePreCheckForWallCommands
 * @param {Array} words - Array of transcript words
 */
VoiceActionManager.prototype.voicePreCheckForWallCommands = function (wsio, words) {
	var commandBin = {
		tileApplications: {
			successFunction: this.s2.tileApplications,
			phraseRequirements: [
				"clean wall",
				"clean this up",
				"cleanup",
				"tile content",
				// Speech to text commonly turns content into context
				"tile context",
				"tile everything",
				"tile wall",
				// No "s" since these words are required, window is in windows
				"tile window",
				"organize"
			],
			successPhrase: "Organizing wall content"
		},
		clearAllContent: {
			successFunction: this.voiceHandlerForClearDisplay,
			phraseRequirements: [
				"close everything",
				"clear everything",
				"get rid everything",
				"toss everything",
				"toss it all"
			],
			successPhrase: "Closing all open applications"
		},
		viewRestore: {
			successFunction: this.voiceHandlerForViewRestore,
			phraseRequirements: [
				"restore view",
				"restore everything",
				"bring it back",
				"bring back everything"
			],
			successPhrase: "Restoring the view"
		},
		launchApplication: {
			successFunction: this.voiceHandlerForApplicationLaunch,
			phraseRequirements: [
				"launch",
				"open",
				"start",
				"load application"
			],
			successPhrase: "Launching application"
		},
		makeNote: {
			successFunction: this.voiceHandlerForMakeNote,
			phraseRequirements: [
				"make a note",
				"write down",
				"make a reminder"
			],
			successPhrase: "Noted"
		},
		sessionRestore: {
			successFunction: this.voiceHandlerForSessionRestore,
			phraseRequirements: [
				"restore session",
				"load session"
			],
			successPhrase: "Restoring session"
		},
		sessionSave: {
			successFunction: this.voiceHandlerForSessionSave,
			phraseRequirements: [
				"save session as",
				"save content as",
				"save wall as",
				"save state as",
				"save open applications as",
				"save applications as",
				"save session name",
				"save content name",
				"save wall name",
				"save state name",
				"save open applications name",
				"save applications name"
			],
			successPhrase: "Saving session"
		},
		webSearch: {
			successFunction: this.voiceHandlerForWebSearch,
			phraseRequirements: [
				"google search",
				"web search"
			],
			successPhrase: "Searching"
		},
		shareToRemoteSite: {
			successFunction: this.voiceHandlerForShareToRemoteSite,
			phraseRequirements: [
				"share with",
				"send to"
			],
			successPhrase: "Sending to "
		}
	};

	var commandKeys = Object.keys(commandBin);
	var allWords = words.join(" ");
	var commandInfo, foundAll, phraseWords;
	// For each of the commands
	for (let i = 0; i < commandKeys.length; i++) {
		commandInfo = commandBin[commandKeys[i]];

		// Go through each of that commands phrase requirements
		for (let phrase = 0; phrase < commandInfo.phraseRequirements.length; phrase++) {
			foundAll = true;
			phraseWords = commandInfo.phraseRequirements[phrase].split(" ");
			for (let pwi = 0; pwi < phraseWords.length; pwi++) {
				if (!allWords.includes(phraseWords[pwi])) {
					foundAll = false;
				}
			}

			// If all the phrase words were found for a command, activate the command and return true;
			if (foundAll) {
				// Call the success function and use this object as reference for this,
				// Without call "this" is commandBin
				this.oldLog("Action accepted. Activating...");
				this.currentCommandLogInfo.currentSuccessPhrase = commandInfo.successPhrase;
				var tempPhraseAddition = commandInfo.successFunction.call(this, wsio, words);
				if (typeof tempPhraseAddition === "string") {
					this.currentCommandLogInfo.currentSuccessPhrase += tempPhraseAddition;
				} else if (typeof tempPhraseAddition === "boolean" && !tempPhraseAddition) {
					return false;
				}

				this.currentCommandLogInfo.command.activatedFunction = commandInfo.successFunction.name;
				this.currentCommandLogInfo.command.description = commandInfo.phraseRequirements[phrase];
				this.currentCommandLogInfo.status = "SUCCESS";
				return true;
			}
		}
	}
	return false;
};

/**
 * Given an app and the transcript array, will return match values.
 *
 * @method checkForContextMenuMatch
 * @param {Array} contextMenuToCheck - Application's context menu to check.
 * @param {Array} wordArray - Array of transcript words.
 * @return {Object} matchInfo - Array containing each context menu entry and its match count.
 */
VoiceActionManager.prototype.checkForContextMenuMatch = function(contextMenuToCheck, wordArray) {
	// Will contain information about the context menu
	var matchInfo = {};
	// Given the menu, make an array for matches
	var menuMatches = Array(contextMenuToCheck.length).fill(0);
	var descriptionWords;
	// Go through each entry, if there is any match for a word 2+ letters, then activate.
	// "go, to, me"
	for (let i = 0; i < contextMenuToCheck.length; i++) {
		for (let w = 0; w < wordArray.length; w++) {
			if (wordArray[w].length >= 2) {
				// Lower case
				descriptionWords = contextMenuToCheck[i].description.toLowerCase();
				// Remove : then split
				descriptionWords = descriptionWords.replace(/:/g, '').split(" ");
				for (let dwi = 0; dwi < descriptionWords.length; dwi++) {
					if (descriptionWords[dwi] === wordArray[w]) {
						menuMatches[i]++;
					}
				}
			}
		}
	}
	// Add info to object.
	matchInfo.menuMatches = menuMatches;
	// Search for description with most matches
	var indexOfMostMatches = -1;
	var mostMatches = 0;
	for (let i = 0; i < menuMatches.length; i++) {
		if (menuMatches[i] > mostMatches) {
			mostMatches = menuMatches[i];
			indexOfMostMatches = i;
		}
	}
	matchInfo.indexOfMostMatches = indexOfMostMatches;
	matchInfo.foundMatch = (indexOfMostMatches > -1) ? true : false;
	matchInfo.highestMatchCount = (indexOfMostMatches > -1) ? menuMatches[indexOfMostMatches] : 0;

	return matchInfo;
};

/**
 * Will take transcript and attempt to launch application
 *
 * @method getWordsAfterInList
 * @param {String} wordToSearchFor - word to search for in the list.
 * @param {Array} listOfWords - list of words
 * @return {Array|undefined} retval - if word was found will return array of words after, else undefined.
 */
VoiceActionManager.prototype.getWordsAfterInList = function(wordToSearchFor, listOfWords) {
	var retval;
	for (let i = 0; i < listOfWords.length; i++) {
		if (listOfWords[i] === wordToSearchFor) {
			retval = listOfWords.slice(i + 1);
			break;
		}
	}
	return retval;
};

/**
 * Fills the phrases.
 *
 * @method fillPhraseP
 * @param {Array} words - Array of transcript words
 */
VoiceActionManager.prototype.fillPhrases = function () {
	this.confirmPhrases = [
		"Activating", "Affirmative", "Alright", "Beginning", "Can do", "Commencing",
		"Give me a second", "Great", "Got it", "No problem", "Of course", "Ok", "One moment",
		"Please wait", "Processing", "Pull that up", "Retrieving", "Roger", "Starting on that", "Sure",
		"Understood", "Will do", "Working on it", "Yeah, sure", "Yes boss",
		"You got it", "You're the boss", "Yup"
	];
	this.rejectPhrases = [
		"Huh", "I couldn't process that", "I couldn't hear you",
		"I didn't catch that", "I didn't follow", "I don't understand what you said",
		"I'm not sure what was said", "No matching command available",
		"Please repeat", "Please speak up", "Please try again",
		"Unsure what was said", "What", "Would you repeat"
	];
};

/**
 * Grabs a random confirm response so the same phrase isn't constantly repeated.
 *
 * @method getRandomConfirmPhrase
 * @param {Array} words - Array of transcript words
 */
VoiceActionManager.prototype.getRandomConfirmPhrase = function () {
	return this.confirmPhrases[parseInt(Math.random() * this.confirmPhrases.length)];
};

/**
 * Grabs a random reject response so the same phrase isn't constantly repeated.
 *
 * @method getRandomRejectPhrase
 * @param {Array} words - Array of transcript words
 */
VoiceActionManager.prototype.getRandomRejectPhrase = function () {
	return this.rejectPhrases[parseInt(Math.random() * this.rejectPhrases.length)];
};

/**
 * Don't just clear the display, first save the session because it might include things wanted.
 *
 * @method voiceHandlerForClearDisplay
 * @param {Array} words - transcript as array of words
 */
VoiceActionManager.prototype.voiceHandlerForClearDisplay = function(wsio, words) {
	// First save the session, use autosave name,
	// Default one might be overwritten on save
	this.s2.wsSaveSession(wsio, "autosave.json");
	// Then clear the display.
	this.s2.clearDisplay();
};

/**
 * Loads the saved session, which is probably result of accidentially closing everything.
 *
 * @method voiceHandlerForViewRestore
 * @param {Array} words - transcript as array of words
 */
VoiceActionManager.prototype.voiceHandlerForViewRestore = function(wsio, words) {
	// Request the session 'autosave' from a previous clear command
	this.s2.wsLoadFileFromServer(wsio, {
		application: 'load_session',
		filename: "autosave.json",
		user: wsio.id
	});
};

/**
 * Will take transcript and attempt to launch application
 *
 * @method voiceHandlerForApplicationLaunch
 * @param {Array} words - transcript as array of words
 */
VoiceActionManager.prototype.voiceHandlerForApplicationLaunch = function(wsio, words) {
	// "launch",
	// "open",
	// "load application"
	var wordsDescribing, wordCompare;

	// Media check is little different
	var launchWords = ["launch", "open", "load"];
	var fileTypeWords = [
		["pdf"],
		["image", "picture"],
		["video", "movie"]
	];
	var launchWordIndex;
	var fileTypeIndex;
	var fileNameDescription = null;
	for (let i = 0; i < launchWords.length; i++) {
		if (words.includes(launchWords[i])) {
			for (let fIndex = 0; fIndex < fileTypeWords.length; fIndex++) {
				for (let fType = 0; fType < fileTypeWords[fIndex].length; fType++) {
					// If the detected word
					launchWordIndex = words.indexOf(launchWords[i]);
					fileTypeIndex = words.indexOf(fileTypeWords[fIndex][fType]);
					if (
						// If there are more words than index of words
						(words.length - 1 > launchWordIndex)
						// And the type word comes after file keyword
						&& (launchWordIndex + 1 === fileTypeIndex)
						// And there are name words
						&& (words.length - 1 > fileTypeIndex)
					) {
						fileNameDescription = this.getWordsAfterInList(fileTypeWords[fIndex][fType], words);
						launchWordIndex = launchWords[i];
						fileTypeIndex = fileTypeWords[fIndex][fType];
						break;
					}
				}
				if (fileNameDescription) {
					// If a filename description was found
					break;
				}
			}
			if (fileNameDescription) {
				// If a filename description was found
				break;
			}
		}
		if (fileNameDescription) {
			// If a filename description was found
			break;
		}
	}
	// If a filename description was found. fileNameDescription will be an array
	if (fileNameDescription) {
		// This returns an object with properties: images, videos, pdfs
		var assetsList = this.s2.assets.listAssets();
		var retval;
		if (fileTypeIndex === "pdf") {
			fileTypeIndex = "pdfs";
			retval = "pdf_viewer";
		} else if (fileTypeIndex === "image" || fileTypeIndex === "picture") {
			fileTypeIndex = "images";
			retval = "image_viewer";
		} else if (fileTypeIndex === "video" || fileTypeIndex === "movie") {
			fileTypeIndex = "videos";
			retval = "movie_player";
		} else {
			console.log("error");
		}
		// Go through asset list and get a match
		var matches = Array(assetsList[fileTypeIndex].length).fill(0);
		var foundMatch = false;
		for (let i = 0; i < assetsList[fileTypeIndex].length; i++) {
			for (let j = 0; j < fileNameDescription.length; j++) {
				if (assetsList[fileTypeIndex][i].sage2URL.toLowerCase().includes(
					fileNameDescription[j].toLowerCase())) {
					// Increase
					matches[i]++;
					foundMatch = true;
				}
			}
		}
		// Go through matches if any and open it
		if (foundMatch) {
			var bestMatch = 0;
			var bestMatchIndex = -1;
			for (let i = 0; i < matches.length; i++) {
				if (matches[i] > bestMatch) {
					bestMatch = matches[i];
					bestMatchIndex = i;
				}
			}
			if (bestMatchIndex > 0) {
				// Launch
				this.oldLog("Launching" + retval + ":" + assetsList[fileTypeIndex][bestMatchIndex].filename);
				this.s2.wsLoadFileFromServer(wsio, {
					application: retval,
					filename: assetsList[fileTypeIndex][bestMatchIndex].filename,
					user: wsio.id
				});
				return retval;
			}
		}
		return false;
		// If not a file, then might be an app
	}


	// Use descriptor string that is longer, first get the words after "application"
	// Takes and returns array
	wordsDescribing = this.getWordsAfterInList("application", words);
	wordCompare = this.getWordsAfterInList("launch", words);
	// If there are hits for both, use the longer string
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare;
	} else if (!wordsDescribing) {
		// No hits, move on
		wordsDescribing = wordCompare;
	}
	wordCompare = this.getWordsAfterInList("open", words);
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare;
	} else if (!wordsDescribing) {
		wordsDescribing = wordCompare;
	}
	if (wordsDescribing === undefined) {
		this.oldLog("Error>voiceToAction> voiceHandlerForApplicationLaunch given:" + words, true);
		this.oldLog("Error>voiceToAction> voiceHandlerForApplicationLaunch tripped,"
			+ " but no application word descriptors. Returning...", true);
		return;
	}
	var apps = this.s2.assets.listApps();
	// Will be an array of best match cases. searching through filename, title, description, keywords
	var matchList = [];
	var nameString, titleString, descriptionString, keywordString;
	var nameCount, titleCount, descriptionCount, keywordCount, largestCountIndex;
	largestCountIndex = 0;
	for (let appIndex = 0; appIndex < apps.length; appIndex++) {
		// Reset counters and comparison variables for the new apps.
		// TODO, move this out and store it for later instead of recalc on each voice call
		nameCount   = titleCount = descriptionCount = keywordCount = 0;
		nameString  = apps[appIndex].exif.FileName.toLowerCase();
		titleString = apps[appIndex].exif.metadata.title.toLowerCase();
		descriptionString = apps[appIndex].exif.metadata.description.toLowerCase();
		keywordString = apps[appIndex].exif.metadata.keywords.join(" ");
		keywordString = keywordString.toLowerCase();
		// For each of the words.
		for (let w = 0; w < wordsDescribing.length; w++) {
			if (wordsDescribing[w].length < 3) {
				// Do not check words 2 or less characters long
				continue;
			}
			if (nameString.includes(wordsDescribing[w])) {
				nameCount++;
			}
			if (titleString.includes(wordsDescribing[w])) {
				titleCount++;
			}
			if (descriptionString.includes(wordsDescribing[w])) {
				descriptionCount++;
			}
			if (keywordString.includes(wordsDescribing[w])) {
				keywordCount++;
			}
		}
		// Store the largest match count
		matchList.push(nameCount);
		if (titleCount > matchList[appIndex]) {
			matchList[appIndex] = titleCount;
		}
		if (descriptionCount > matchList[appIndex]) {
			matchList[appIndex] = descriptionCount;
		}
		if (keywordCount > matchList[appIndex]) {
			matchList[appIndex] = keywordCount;
		}
		if (matchList[appIndex] > matchList[largestCountIndex]) {
			largestCountIndex = appIndex;
		}
	}
	// Based on highest match count, launch the application.
	if (matchList[largestCountIndex] > 0) {
		// Launch app
		this.oldLog("Launching app:" + apps[largestCountIndex].exif.FileName);
		this.s2.wsLaunchAppWithValues(wsio, {
			appName: apps[largestCountIndex].exif.FileName
		});
		return apps[largestCountIndex].exif.metadata.title.toLowerCase();
	}
	return false;
};

/**
 * Will try to make a note
 *
 * @method voiceHandlerForMakeNote
 * @param {Array} words - transcript as array of words
 */
VoiceActionManager.prototype.voiceHandlerForMakeNote = function(wsio, words) {
	// "make a note",
	// "write down",
	// "make a reminder"
	var wordsDescribing, wordCompare;
	wordsDescribing = this.getWordsAfterInList("note", words); // Takes and returns array
	wordCompare = this.getWordsAfterInList("down", words);
	// If there are hits for both, use the longer string
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare;
	} else if (!wordsDescribing) {
		// No hits, move on
		wordsDescribing = wordCompare;
	}
	wordCompare = this.getWordsAfterInList("reminder", words);
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare;
	} else if (!wordsDescribing) {
		// No hits, move on
		wordsDescribing = wordCompare;
	}
	if (wordsDescribing === undefined) {
		this.oldLog("Error>voiceToAction> voiceHandlerForMakeNote given:" + words, true);
		this.oldLog("Error>voiceToAction> voiceHandlerForMakeNote tripped, but no word descriptors. Returning...", true);
		return;
	}

	var data = {};
	data.appName = "quickNote";
	data.customLaunchParams = {};
	data.customLaunchParams.clientName = this.s2.sagePointers[wsio.id].label;
	data.customLaunchParams.clientInput = wordsDescribing.join(" ");

	this.s2.wsLaunchAppWithValues(wsio, data);
};

/**
 * Will take transcript and attempt to restore session.
 *
 * @method voiceHandlerForSessionRestore
 * @param {Array} words - transcript as array of words
 */
VoiceActionManager.prototype.voiceHandlerForSessionRestore = function(wsio, words) {
	// "restore session",
	// "load session",
	// "bring back"
	var wordsDescribing, wordCompare;
	// Takes and returns array
	wordsDescribing = this.getWordsAfterInList("session", words);
	wordCompare = this.getWordsAfterInList("back", words);
	// If there are hits for both, use the longer string
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare;
	} else if (!wordsDescribing) {
		// No hits, move on
		wordsDescribing = wordCompare;
	}
	if (wordsDescribing === undefined) {
		this.oldLog("Error>voiceToAction> voiceHandlerForSessionRestore given:" + words, true);
		this.oldLog("Error>voiceToAction> voiceHandlerForSessionRestore tripped, but no word descriptors. Returning...", true);
		return;
	}
	var sessions = this.s2.listSessions();
	// Will be an array of best match cases. searching through filename, title, description, keywords
	var matchList = [];
	var nameString, nameCount;
	var largestCountIndex = 0;
	for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
		// Reset counters and comparison variables for the new sessions.
		// TODO, move this out and store it for later instead of recalc on each voice call
		nameCount = 0;
		// Lower case, words are already expected to be lower case
		nameString = sessions[sessionIndex].exif.FileName.toLowerCase();
		// For each of the words.
		for (let w = 0; w < wordsDescribing.length; w++) {
			if (wordsDescribing[w].length < 2) {
				continue;
			}
			if (nameString.includes(wordsDescribing[w])) {
				nameCount++;
			}
		}
		// Store the largest match count
		matchList.push(nameCount);
		if (matchList[sessionIndex] > matchList[largestCountIndex]) {
			largestCountIndex = sessionIndex;
		}
	}
	// Based on highest match count, launch the application.
	if (matchList[largestCountIndex] > 0) {
		// Launch app...
		this.oldLog("Loading session:" + sessions[largestCountIndex].id);
		this.s2.wsLoadFileFromServer(wsio, {
			application: 'load_session',
			filename: sessions[largestCountIndex].id,
			user: wsio.id
		});
		return sessions[largestCountIndex].exif.FileName.toLowerCase();
	}
};

/**
 * Will take transcript and attempt to save session.
 *
 * @method voiceHandlerForSessionSave
 * @param {Array} words - transcript as array of words
 */
VoiceActionManager.prototype.voiceHandlerForSessionSave = function(wsio, words) {
	// "save session as",
	// "save content as",
	// "save wall as",
	// "save state as",
	// "save open applications as",
	// "save applications as",
	// " ... name"
	var wordsDescribing, wordCompare;
	// Takes and returns array
	wordsDescribing = this.getWordsAfterInList("as", words);
	wordCompare = this.getWordsAfterInList("name", words);
	// If there are hits for both, use the longer string
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare;
	} else if (!wordsDescribing) {
		// No hits, move on
		wordsDescribing = wordCompare;
	}
	if (wordsDescribing === undefined) {
		this.oldLog("Error>voiceToAction> voiceHandlerForSessionSave given:" + words, true);
		this.oldLog("Error>voiceToAction> voiceHandlerForSessionSave tripped, but no word descriptors. Returning...", true);
		return;
	}
	if (wordsDescribing.length < 1) {
		this.oldLog("Error>voiceToAction> voiceHandlerForSessionSave given:" + words, true);
		this.oldLog("Error>voiceToAction> voiceHandlerForSessionSave tripped, but name scheme was not given.", true);
		return;
	}
	// Save the session with the given name
	this.oldLog("Saving session, filename:" + wordsDescribing.join(" "));
	this.s2.wsSaveSession(wsio, wordsDescribing.join(" "));
	return wordsDescribing.join(" ");
};

/**
 * Will perform search. If "image" keyword is used early then will perform image search.
 *
 * @method voiceHandlerForWebSearch
 * @param {Array} words - transcript as array of words
 */
VoiceActionManager.prototype.voiceHandlerForWebSearch = function(wsio, words) {
	// "google search"
	var imageSearching = false;

	/*
	making some assumptions about image search invoke:
		computer
			google image search [for]
			search google images [for]
			image search in google [for]
			do a google image search [for]

		first check if the words contain "image"
			then position check
	*/
	var foundImage = false;
	var searchEngine = "google";
	var foundEngine = false;
	var foundFor = false;
	var foundSearch = false;
	// First check for marker type
	if (!words.includes(searchEngine)) {
		// Currently either "google search" or "web search"
		searchEngine = "web";
	}
	// Now determine
	for (let i = 0; i < words.length; i++) {
		if (words[i].includes("image") && foundImage === false) {
			if ((foundFor ==  false)
				&& ((foundEngine == false) || (foundSearch == false))) {
				// Only image search if "for" has not been found and both engine and search was not found
				// If for has been found, this isn't an image search
				// If engine and search was found, this isn't an image search
				imageSearching = true;
				foundImage = i;
			}
		} else if (words[i].includes(searchEngine) && foundEngine === false) {
			// Want index of the word
			foundEngine = i;
		} else if (words[i].includes("for") && foundFor === false) {
			// Image after for means that image was probably a search term.
			foundFor = i;
		} else if (words[i].includes("search") && foundSearch === false) {
			foundSearch = i;
		}
	}

	// This should not be possible
	var searchTermStartIndex = -1;
	if ((foundSearch === false) || (foundEngine === false)) {
		console.log("Error in voiceToAction: voiceHandlerForWebSearch activated but could not find keyword");
	}

	// Determine which word of the keywords marks the start of the search terms.
	if (foundFor !== false) {
		// If "for" was in the phrase, will take everything after "for"
		searchTermStartIndex = foundFor;
	} else if ((foundImage !== false) && (imageSearching)) {
		// If found "image" need to know if "search" was earlier
		if (foundImage > foundSearch) {
			// If index of image was after search
			searchTermStartIndex = foundImage;
		} else if (foundSearch > foundEngine) {
			searchTermStartIndex = foundSearch;
		} else {
			searchTermStartIndex = foundEngine;
		}
	} else {
		// Else words following engine or "search"
		if (foundEngine > foundSearch) {
			searchTermStartIndex = foundEngine;
		} else {
			searchTermStartIndex = foundSearch;
		}
	}

	// Take the words after the last activator word
	var searchTerms = words.slice(searchTermStartIndex + 1);
	if (searchTerms.length === 0) {
		this.oldLog("Discarding web search, no search terms given:" + words);
		return;
	}
	searchTerms = searchTerms.join("+");
	var params =  {
		action: "address",
		clientInput: "https://www.google.com/#q=" + searchTerms
	};
	if (imageSearching) {
		params.clientInput += "&source=lnms&tbm=isch";
	}
	this.s2.wsLaunchAppWithValues(wsio, {
		appName: "Webview",
		customLaunchParams: params,
		func: "navigation"
	});
};

/**
 * Will attempt to share application to specified site.
 *
 * @method voiceHandlerForShareToRemoteSite
 * @param {Array} words - transcript as array of words
 */
VoiceActionManager.prototype.voiceHandlerForShareToRemoteSite = function(wsio, words) {
	// Need an app under pointer to share
	if (this.appIdUnderPointer) {
		// Get context menu
		var contextMenu = this.s2.SAGE2Items.applications.list[this.appIdUnderPointer].contextMenu;
		// If there is no context menu, can't do anything. This means it wasn't loaded on display.
		if (!contextMenu) {
			return false;
		}
		// Update the share entries
		this.s2.fillContextMenuWithShareSites(contextMenu, this.appIdUnderPointer);
		var shareDescription = "Share With:";
		var availableRemoteSites;
		// first search for the share entry
		for (let i = 0; i < contextMenu.length; i++) {
			if (contextMenu[i].description === shareDescription) {
				availableRemoteSites = contextMenu[i].children;
			}
		}
		// If there is no availableRemoteSites, can't do anything.
		if (!availableRemoteSites) {
			return false;
		}
		var match = this.checkForContextMenuMatch(availableRemoteSites, words);
		if (match.foundMatch) {
			match = availableRemoteSites[match.indexOfMostMatches];
			// Params are: uniqueId, app object, remoteSites[data.parameters.remoteSiteIndex]
			this.s2.shareApplicationWithRemoteSite(
				wsio.id,
				{application: this.s2.SAGE2Items.applications.list[this.appIdUnderPointer]},
				this.s2.remoteSites[match.parameters.remoteSiteIndex]);
			return match.parameters.siteName;
		}
	}
	return false;
};



module.exports = VoiceActionManager;
