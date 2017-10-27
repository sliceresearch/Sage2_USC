// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2017


// require variables to be declared
"use strict";

// Builtins
var fs = require('fs');

// SAGE2 modules
var sageutils = require('../src/node-utils');    // provides utility functions

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
	this.currentCommandLogInfo = {}; // used for tracking.
	var today = new Date();
	this.fileLogPath = "./" + today.getFullYear() + "-"
		+ (today.getMonth() + 1) + "-" + today.getDate() + "-transcript.json";
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
	// wsio is not needed for set value (at least not currently)
	this.s2.sharedServerData.setValue(null, {
		nameOfValue: "voiceToActionFullLog",
		value: this.fullLog,
		description: "This is a list of history for voiceToAction"
	});
	// wsio is not needed for set value (at least not currently)
	this.s2.sharedServerData.setValue(null, {
		nameOfValue: "voiceToActionLastEntry",
		value: this.lastLogEntry,
		description: "This is the last entry submitted by voiceToAction"
	});
};

/**
 * File logging for command submission and transcripts.
 * Writes based on data within this.currentCommandLogInfo
 *
 * @method fileLog
 */
VoiceActionManager.prototype.fileLog = function() {
	if (this.currentCommandLogInfo.logged) {
		// don't double log
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
	// set logged to true to prevent error catch log
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
			serverCommand: false,
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
	// first check that the word voiceNameMarker was used
	if (!data.words.toLowerCase().includes(this.s2.voiceNameMarker.toLowerCase())) {
		// wait for initiation
		return;
	}
	// chop from beginning of voiceNameMarker
	data.words = data.words.slice(
		data.words.toLowerCase().indexOf(this.s2.voiceNameMarker.toLowerCase()));
	// then take out voiceNameMarker
	data.words = data.words.slice(data.words.indexOf(" ") + 1);
	// turn - into ' '. particularly "next-page" to "next page"
	data.words = data.words.replace(/-/g, ' ').trim();

	// log the words evaluated
	this.currentCommandLogInfo.status = "No Match";
	this.currentCommandLogInfo.transcript.evaluated = data.words;

	// get the pointer associated to this wsio
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

	// can't do anything if there is no pointer.
	if (!userPointer) {
		this.oldLog("ERROR>wsVoiceToContextMenu> No pointer detected for this wsio.id:" + wsio.id, true);
		return;
	}
	var pointerX = this.s2.sagePointers[wsio.id].left;
	var pointerY = this.s2.sagePointers[wsio.id].top;

	// get app under pointer, then get context menu
	var obj = this.s2.interactMgr.searchGeometry({x: pointerX, y: pointerY});
	var contextMenu = null, app = false;
	if (obj !== null) {
		// check type of item under click
		if (this.s2.SAGE2Items.applications.list.hasOwnProperty(obj.data.id)) {
			// if an app was under the rmb click
			if (this.s2.SAGE2Items.applications.list[obj.data.id].contextMenu) {
				contextMenu = this.s2.SAGE2Items.applications.list[obj.data.id].contextMenu;
				app = obj.data.id;
			}
		}
	}
	// should have passed one string of words
	var words = data.words.toLowerCase().split(" ");
	// if the server prechecks and eats the command then don't send it to an app.
	if (data.words.includes("cancel")) {
		this.oldLog("Command contained cancel, discarding: " + data.words, true);
		this.currentCommandLogInfo.command.name = "CANCEL";
		// unsure if this is a bad check
		return;
	}
	if (this.voicePreCheckForServerCommands(wsio, words)) {
		this.currentCommandLogInfo.command.serverCommand = true;
		wsio.emit("playVoiceCommandSuccessSound", {message: this.currentCommandLogInfo.currentSuccessPhrase});
		return;
	}

	var matchedMenu = null;
	if (contextMenu) {
		// pass the context menu and the transcript words array
		// returns object with: menuMatches(array), indexOfMostMatches, foundMatch, highestMatchCount
		matchedMenu = this.checkForContextMenuMatch(contextMenu, words);
		if (matchedMenu.foundMatch) {
			matchedMenu.app = app;
		} else {
			matchedMenu = null;
		}
	}
	// if no matched menu, search other apps for best match
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
			// if it has a contextMenu
			if (this.s2.SAGE2Items.applications.list[appIds[i]].contextMenu) {
				allMenuResults.push(this.checkForContextMenuMatch(
					this.s2.SAGE2Items.applications.list[appIds[i]].contextMenu, words));
				allMenuResults[allMenuResults.length - 1].app = appIds[i];
				// if a match was found on this app
				if (allMenuResults[allMenuResults.length - 1].foundMatch
					&& (allMenuResults[allMenuResults.length - 1].highestMatchCount > currentBestMatch.count)) {
					currentBestMatch.count = allMenuResults[allMenuResults.length - 1].highestMatchCount;
					currentBestMatch.app = allMenuResults[allMenuResults.length - 1].app;
					currentBestMatch.indexOnApp = allMenuResults[allMenuResults.length - 1].indexOfMostMatches;
					currentBestMatch.indexOfResult = allMenuResults.length - 1;
				}
			}
		}
		// check if there was a match
		if (currentBestMatch.app) {
			matchedMenu = allMenuResults[currentBestMatch.indexOfResult];
			matchedMenu.app = currentBestMatch.app;
		}
	}
	// has checked app under pointer (if any) and other apps, if matchedMenu, then can activate
	if (matchedMenu) {
		// at this point matchedMenu will contain info of the app with best menu match
		// menuMatches(array), indexOfMostMatches, foundMatch, highestMatchCount, app
		// get the menu and the particular match entry
		contextMenu = this.s2.SAGE2Items.applications.list[matchedMenu.app].contextMenu;
		var cmEntry = contextMenu[matchedMenu.indexOfMostMatches];
		var lastDescriptionWord;
		var wordsToPassAsInput = null;

		// if the menu entry is for input, try to take anything after the indicator to pass as values
		if (cmEntry.inputField) {
			this.oldLog(app + " has an input field, trying to separate input");
			lastDescriptionWord = cmEntry.description.toLowerCase();
			// remove : if exists
			lastDescriptionWord = lastDescriptionWord.replace(/:/g, '').trim();
			this.oldLog("Last word in:" + lastDescriptionWord);
			lastDescriptionWord = lastDescriptionWord.split(' ');
			lastDescriptionWord = lastDescriptionWord[lastDescriptionWord.length - 1];
			this.oldLog("  is:" + lastDescriptionWord);
			wordsToPassAsInput = data.words.toLowerCase();
			// need to send input, find the last descriptor word
			if (wordsToPassAsInput.indexOf(lastDescriptionWord) > -1) {
				wordsToPassAsInput = wordsToPassAsInput.substring(wordsToPassAsInput.indexOf(lastDescriptionWord));
				wordsToPassAsInput = wordsToPassAsInput.substring(lastDescriptionWord.length);
				wordsToPassAsInput = wordsToPassAsInput.trim();
			} else {
				// if last descriptor is not available, then it means cannot pass input.
				wordsToPassAsInput = "";
			}
			this.currentCommandLogInfo.command.inputValue = wordsToPassAsInput;
		}

		// log the app and command info
		obj = this.s2.SAGE2Items.applications.list[matchedMenu.app];
		this.currentCommandLogInfo.app.id     = obj.id;
		this.currentCommandLogInfo.app.title  = obj.title;
		this.currentCommandLogInfo.app.type   = obj.application;
		this.currentCommandLogInfo.app.left   = obj.left;
		this.currentCommandLogInfo.app.top    = obj.top;
		this.currentCommandLogInfo.app.width  = obj.width;
		this.currentCommandLogInfo.app.height = obj.height;
		// log command
		this.currentCommandLogInfo.command.activatedFunction = cmEntry.callback;
		this.currentCommandLogInfo.command.description = cmEntry.description;
		this.currentCommandLogInfo.status = "SUCCESS";


		// if there is an input field, but nothing to input, cannot activate function
		if (wordsToPassAsInput && wordsToPassAsInput.length === 0) {
			this.currentCommandLogInfo.status = "FAIL - Missing input";
			this.oldLog("Match found, but missing input in " + app + " for the phrase:" + words, true);
			wsio.emit("playVoiceCommandFailSound", {message: "please repeat"});
		} else {
			// begin sending preparation
			var dataToSend = {
				app: matchedMenu.app,
				func: cmEntry.callback,
				parameters: cmEntry.parameters
			};
			dataToSend.parameters.clientId = wsio.id;
			if (wordsToPassAsInput !== null) {
				// if input, need to pass it along
				dataToSend.parameters.clientInput = wordsToPassAsInput;
				dataToSend.parameters.clientVoiceInput = data.words.toLowerCase();
			}
			// call the function on the app
			this.s2.wsCallFunctionOnApp(wsio, dataToSend);
			this.oldLog("Action accepted for entry: " + cmEntry.description);
			this.oldLog("Activating " + dataToSend.func + " on " + dataToSend.app);
			if (wordsToPassAsInput !== null) {
				this.oldLog("--clientInput being given:" + wordsToPassAsInput);
			}
			wsio.emit("playVoiceCommandSuccessSound", {message: "By your command"});
		}
	} else {
		this.oldLog("No voice matches found in " + app + " for the phrase:" + words, true);
		wsio.emit("playVoiceCommandFailSound", {message: "please repeat"});
	}
};

/**
 * Will attempt to take a transcript and use best case to match an action.
 *
 * @method voicePreCheckForServerCommands
 * @param {Array} words - Array of transcript words
 */
VoiceActionManager.prototype.voicePreCheckForServerCommands = function (wsio, words) {
	var commandBin = {
		tileApplications: {
			successFunction: this.s2.tileApplications,
			phraseRequirements: [
				"clean wall",
				"clean this up",
				"cleanup",
				"tile content",
				"tile context", // speech to text commonly turns content into context
				"tile everything",
				"tile wall",
				"organize"
			],
			successPhrase: "Organizing wall content"
		},
		clearAllContent: {
			successFunction: this.s2.clearDisplay,
			phraseRequirements: [
				"close everything",
				"clear everything",
				"get rid everything",
				"toss everything",
				"toss it all"
			],
			successPhrase: "Closing all open applications"
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
				"load session",
				"bring back"
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
				"google search"
			],
			successPhrase: "Searching"
		}
	};

	var commandKeys = Object.keys(commandBin);
	var allWords = words.join(" ");
	var commandInfo, foundAll, phraseWords;
	// for each of the commands
	for (let i = 0; i < commandKeys.length; i++) {
		commandInfo = commandBin[commandKeys[i]];

		// go through each of that commands phrase requirements
		for (let phrase = 0; phrase < commandInfo.phraseRequirements.length; phrase++) {
			foundAll = true;
			phraseWords = commandInfo.phraseRequirements[phrase].split(" ");
			for (let pwi = 0; pwi < phraseWords.length; pwi++) {
				if (!allWords.includes(phraseWords[pwi])) {
					foundAll = false;
				}
			}

			// if all the phrase words were found for a command, activate the command and return true;
			if (foundAll) {
				// call the success function and use this object as reference for this,
				// without call "this" is commandBin
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
	// will contain information about the context menu
	var matchInfo = {};
	// given the menu, make an array for matches
	var menuMatches = Array(contextMenuToCheck.length).fill(0);
	var descriptionWords;
	// go through each entry, if there is any match for a word 2+ letters, then activate.
	// "go, to, me"
	for (let i = 0; i < contextMenuToCheck.length; i++) {
		for (let w = 0; w < wordArray.length; w++) {
			if (wordArray[w].length >= 2) {
				// lower case
				descriptionWords = contextMenuToCheck[i].description.toLowerCase();
				// remove : then split
				descriptionWords = descriptionWords.replace(/:/g, '').split(" ");
				for (let dwi = 0; dwi < descriptionWords.length; dwi++) {
					if (descriptionWords[dwi] === wordArray[w]) {
						menuMatches[i]++;
					}
				}
			}
		}
	}
	// add info to object.
	matchInfo.menuMatches = menuMatches;
	// search for description with most matches
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

	// media check is little different
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
					// if the detected word
					launchWordIndex = words.indexOf(launchWords[i]);
					fileTypeIndex = words.indexOf(fileTypeWords[fIndex][fType]);
					if (
						// if there are more words than index of words
						(words.length - 1 > launchWordIndex)
						// and the type word comes after file keyword
						&& (launchWordIndex + 1 === fileTypeIndex)
						// and there are name words
						&& (words.length - 1 > fileTypeIndex)
					) {
						fileNameDescription = this.getWordsAfterInList(fileTypeWords[fIndex][fType], words);
						launchWordIndex = launchWords[i];
						fileTypeIndex = fileTypeWords[fIndex][fType];
						break;
					}
				}
				if (fileNameDescription) {
					// if a filename description was found
					break;
				}
			}
			if (fileNameDescription) {
				// if a filename description was found
				break;
			}
		}
		if (fileNameDescription) {
			// if a filename description was found
			break;
		}
	}
	// if a filename description was found. fileNameDescription will be an array
	if (fileNameDescription) {
		// this returns an object with properties: images, videos, pdfs
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
		// go through asset list and get a match
		var matches = Array(assetsList[fileTypeIndex].length).fill(0);
		var foundMatch = false;
		for (let i = 0; i < assetsList[fileTypeIndex].length; i++) {
			for (let j = 0; j < fileNameDescription.length; j++) {
				if (assetsList[fileTypeIndex][i].sage2URL.toLowerCase().includes(
					fileNameDescription[j].toLowerCase())) {
					// increase
					matches[i]++;
					foundMatch = true;
				}
			}
		}
		// go through matches if any and open it
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
				// launch
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
		// if not a file, then might be an app
	}


	// use descriptor string that is longer, first get the words after "application"
	// takes and returns array
	wordsDescribing = this.getWordsAfterInList("application", words);
	wordCompare = this.getWordsAfterInList("launch", words);
	// if there are hits for both, use the longer string
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare;
	} else if (!wordsDescribing) {
		// no hits, move on
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
	// will be an array of best match cases. searching through filename, title, description, keywords
	var matchList = [];
	var nameString, titleString, descriptionString, keywordString;
	var nameCount, titleCount, descriptionCount, keywordCount, largestCountIndex;
	largestCountIndex = 0;
	for (let appIndex = 0; appIndex < apps.length; appIndex++) {
		// reset counters and comparison variables for the new apps.
		// TODO, move this out and store it for later instead of recalc on each voice call
		nameCount   = titleCount = descriptionCount = keywordCount = 0;
		nameString  = apps[appIndex].exif.FileName.toLowerCase();
		titleString = apps[appIndex].exif.metadata.title.toLowerCase();
		descriptionString = apps[appIndex].exif.metadata.description.toLowerCase();
		keywordString = apps[appIndex].exif.metadata.keywords.join(" ");
		keywordString = keywordString.toLowerCase();
		// for each of the words.
		for (let w = 0; w < wordsDescribing.length; w++) {
			if (wordsDescribing[w].length < 3) {
				// do not check words 2 or less characters long
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
		// store the largest match count
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
	// based on highest match count, launch the application.
	if (matchList[largestCountIndex] > 0) {
		// launch app
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
	wordsDescribing = this.getWordsAfterInList("note", words); // takes and returns array
	wordCompare = this.getWordsAfterInList("down", words);
	// if there are hits for both, use the longer string
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare;
	} else if (!wordsDescribing) {
		// no hits, move on
		wordsDescribing = wordCompare;
	}
	wordCompare = this.getWordsAfterInList("reminder", words);
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare;
	} else if (!wordsDescribing) {
		// no hits, move on
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
	// takes and returns array
	wordsDescribing = this.getWordsAfterInList("session", words);
	wordCompare = this.getWordsAfterInList("back", words);
	// if there are hits for both, use the longer string
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare;
	} else if (!wordsDescribing) {
		// no hits, move on
		wordsDescribing = wordCompare;
	}
	if (wordsDescribing === undefined) {
		this.oldLog("Error>voiceToAction> voiceHandlerForSessionRestore given:" + words, true);
		this.oldLog("Error>voiceToAction> voiceHandlerForSessionRestore tripped, but no word descriptors. Returning...", true);
		return;
	}
	var sessions = this.s2.listSessions();
	// will be an array of best match cases. searching through filename, title, description, keywords
	var matchList = [];
	var nameString, nameCount;
	var largestCountIndex = 0;
	for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
		// reset counters and comparison variables for the new sessions.
		// TODO, move this out and store it for later instead of recalc on each voice call
		nameCount = 0;
		// lower case, words are already expected to be lower case
		nameString = sessions[sessionIndex].exif.FileName.toLowerCase();
		// for each of the words.
		for (let w = 0; w < wordsDescribing.length; w++) {
			if (wordsDescribing[w].length < 2) {
				continue;
			}
			if (nameString.includes(wordsDescribing[w])) {
				nameCount++;
			}
		}
		// store the largest match count
		matchList.push(nameCount);
		if (matchList[sessionIndex] > matchList[largestCountIndex]) {
			largestCountIndex = sessionIndex;
		}
	}
	// based on highest match count, launch the application.
	if (matchList[largestCountIndex] > 0) {
		// launch app...
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
	// takes and returns array
	wordsDescribing = this.getWordsAfterInList("as", words);
	wordCompare = this.getWordsAfterInList("name", words);
	// if there are hits for both, use the longer string
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare;
	} else if (!wordsDescribing) {
		// no hits, move on
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
	// save the session with the given name
	this.oldLog("Saving session, filename:" + wordsDescribing.join(" "));
	this.s2.wsSaveSesion(wsio, wordsDescribing.join(" "));
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
	for (let i = 0; i < words.length; i++) {
		if (words[i].includes("image")) {
			// engine should be before image
			if ((foundEngine !== false) && (foundEngine === (i - 1))) {
				imageSearching = true;
			} else {
				// finding "image" before engine means use the engine's image search
				imageSearching = true;
			}
			foundImage = i;
		} else if (words[i].includes(searchEngine)) {
			// want index of the word
			foundEngine = i;
		} else if (words[i].includes("for")) {
			// image after for means that image was probably a search term.
			foundFor = i;
		} else if (words[i].includes("search")) {
			foundSearch = i;
		}
	}

	// this should not be possible
	var searchTermStartIndex = -1;
	if ((foundSearch === false) || (foundEngine === false)) {
		console.log("Error in voiceToAction: voiceHandlerForWebSearch activated but could not find keyword");
	}

	// determine which word of the keywords marks the start of the search terms.
	if (foundFor !== false) {
		searchTermStartIndex = foundFor;
	} else if (foundImage !== false) {
		// if found "image"
		// need to know if search was after, or image
		if (foundImage > foundSearch) {
			searchTermStartIndex = foundImage;
		} else if (foundSearch > foundEngine) {
			searchTermStartIndex = foundSearch;
		} else {
			searchTermStartIndex = foundEngine;
		}
	} else {
		// else it was after engine or search
		if (foundEngine > foundSearch) {
			searchTermStartIndex = foundEngine;
		} else {
			searchTermStartIndex = foundSearch;
		}
	}

	// take the words after the last activator word
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

module.exports = VoiceActionManager;
