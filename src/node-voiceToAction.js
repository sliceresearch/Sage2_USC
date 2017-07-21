// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015


// require variables to be declared
"use strict";


/**
 * VoiceActionManager container object.
 *
 * @class VoiceActionManager
 * @constructor
 * @param  {object} obj - An object containing necessary references to function at server top level.
 */
function VoiceActionManager(obj) {
	this.s2 = obj;
	this.fullLog = [];
	this.lastLogEntry = "";
}

/**
 * Adds to log.
 *
 * @method log
 * @param  {Array} clients - A reference to the client list.
 */
VoiceActionManager.prototype.log = function(line, shouldConsolePrint = false) {
	this.fullLog.push(line);
	this.lastLogEntry = line;
	if (shouldConsolePrint) {
		console.log(line);
	}
	this.s2.sharedServerData.setValue(null, { // wsio is not needed for set value (at least not currently)
		nameOfValue: "voiceToActionFullLog",
		value: this.fullLog,
		description: "This is a list of history for voiceToAction",
	});
	this.s2.sharedServerData.setValue(null, { // wsio is not needed for set value (at least not currently)
		nameOfValue: "voiceToActionLastEntry",
		value: this.lastLogEntry,
		description: "This is the last entry submitted by voiceToAction",
	});
}


/**
 * Entry point for voice alteration
 *
 * @method process
 * @param  {Object} wsio - conneciton that initiated the voice command
 * @param  {Object} data - should contain .words a string of transcript.
 * @param  {String} data.words - what was said.
 */
VoiceActionManager.prototype.process = function(wsio, data) {
	try {
		this.secondaryProcessCallToUseInTryCatch(wsio, data);
	} catch(e) {
		this.log(e, true);
	}
}

/**
 * Moved everything there to clean try catch
 *
 * @method secondaryProcessCallToUseInTryCatch
 * @param  {Object} wsio - conneciton that initiated the voice command
 * @param  {Object} data - should contain .words a string of transcript.
 * @param  {String} data.words - what was said.
 */
VoiceActionManager.prototype.secondaryProcessCallToUseInTryCatch = function(wsio, data) {
	// get the pointer associated to this wsio
	var userPointer = this.s2.sagePointers[wsio.id];

	// can't do anything if there is no pointer.
	if (!userPointer) {
		this.log("ERROR>wsVoiceToContextMenu> No pointer detected for this wsio.id:" + wsio.id, true);
		return;
	}
	var pointerX = this.s2.sagePointers[wsio.id].left;
	var pointerY = this.s2.sagePointers[wsio.id].top;

	// get app under pointer, then get context menu
	var obj = this.s2.interactMgr.searchGeometry({x: pointerX, y: pointerY});
	var contextMenu = false, app = false;
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
	var words = data.words.split(" "); // should have passed one string of words
	words = words.map(function(w) { return w.toLowerCase();}); // change to lower case.
	// if the server prechecks and eats the command then don't send it to an app.
	if (data.words.includes("cancel")) {
		this.log("Command contained cancel, discarding: " + data.words, true);
		return; // unsure if this is a bad check
	}
	if (this.voicePreCheckForServerCommands(wsio, words)) {
		return;
	}
	if (!contextMenu) {
		return; // can't do anything if didn't find
	}
	var menuDescription;
	var menuMatches = Array(contextMenu.length).fill(0); // make an array of matches "next page"
	var descriptionWords;
	// go through each entry, if there is any match for a word 3+ letters, then activate
	for (let i = 0; i < contextMenu.length; i++) {
		for (let w = 0; w < words.length; w++) {
			if (words[w].length >= 3) {
				descriptionWords = contextMenu[i].description.toLowerCase().split(" ");
				for (let dwi = 0; dwi < descriptionWords.length; dwi++) {
					if (descriptionWords[dwi] === words[w]) {
						menuMatches[i]++;
					}
				}
			}
		}
	}
	// search for description with most matches
	var indexOfMostMatches = -1;
	var mostMatches = 0;
	for (let i = 0; i < menuMatches.length; i++) {
		if (menuMatches[i] > mostMatches) {
			mostMatches = menuMatches[i];
			indexOfMostMatches = i;
		}
	}
	// if there was at least one word match
	if (indexOfMostMatches > -1) {
		var cmEntry = contextMenu[indexOfMostMatches];

		var dataToSend = {
			app: app,
			func: cmEntry.callback,
			parameters: cmEntry.parameters
		};
		dataToSend.parameters.clientId = wsio.id;

		// should work on branch: master / acronymRemove derivative 
		this.s2.wsCallFunctionOnApp(wsio, dataToSend);
		this.log("Action accepted. Activating " + dataToSend.func + " on " + dataToSend.app);
	} else {
		this.log("No voice matches found in " + app + " for the phrase:" + words, true);
	}
}
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
				"tile everything",
				"tile content",
				"organize this",
				"organize everything"
			]
		},
		clearAllContent: {
			successFunction: this.s2.deleteAllApplications,
			phraseRequirements: [
				"close everything",
				"get rid everything",
				"toss everything",
				"toss it all"
			]
		},
		launchApplication: {
			successFunction: this.voiceHandlerForApplicationLaunch,
			phraseRequirements: [
				"launch",
				"open",
				"start",
				"load application"
			]
		},
		sessionRestore: {
			successFunction: this.voiceHandlerForSessionRestore,
			phraseRequirements: [
				"restore session",
				"load session",
				"bring back"
			]
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
			]
		},
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
			phraseWords = commandInfo.phraseRequirements[phrase].split(" ");;
			for (let pwi = 0; pwi < phraseWords.length; pwi++) {
				if (!allWords.includes(phraseWords[pwi])) {
					foundAll = false;
				}
			}

			// if all the phrase words were found for a command, activate the command and return true;
			if (foundAll) {
				// call the success function and use this object as reference for this, without call "this" is commandBin
				this.log("Action accepted. Activating...");
				commandInfo.successFunction.call(this, wsio, words);
				return true;
			}
		}
	} // end for each command key

	return false;
} // end voicePreCheckForServerCommands

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
			retval = listOfWords.slice(i);
			break;
		}
	}
	return retval;
}

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
	// use descriptor string that is longer, first get the words after "application"
	wordsDescribing = this.getWordsAfterInList("application", words); // should be array, not single string.
	wordCompare = this.getWordsAfterInList("launch", words);
	// if there are hits for both, use the longer string
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare
	} else if (!wordsDescribing) { // no hits, move on
		wordsDescribing = wordCompare
	}
	wordCompare = this.getWordsAfterInList("open", words);
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare
	} else if (!wordsDescribing) {
		wordsDescribing = wordCompare
	}
	if (wordsDescribing === undefined) {
		this.log("Error>voiceToAction> voiceHandlerForApplicationLaunch given:" + words, true);
		this.log("Error>voiceToAction> voiceHandlerForApplicationLaunch tripped, but no application word descriptors. Returning...", true);
		return;
	}
	var apps = this.s2.assets.listApps();
	var matchList = []; // will be an array of best match cases. searching through filename, title, description, keywords
	var nameString, titleString, descriptionString, keywordString;
	var nameCount, titleCount, descriptionCount, keywordCount, largestCountIndex;
	largestCountIndex = 0;
	for (let appIndex = 0; appIndex < apps.length; appIndex++) {
		// reset counters and comparison variables for the new apps.
		// TODO, move this out and store it for later instead of recalc on each voice call
		nameCount = titleCount = descriptionCount = keywordCount = 0;
		nameString = apps[appIndex].exif.FileName.toLowerCase();
		titleString = apps[appIndex].exif.metadata.title.toLowerCase();
		descriptionString = apps[appIndex].exif.metadata.description.toLowerCase();
		keywordString = apps[appIndex].exif.metadata.keywords.join(" ");
		keywordString = keywordString.toLowerCase();
		// for each of the words.
		for (let w = 0; w < wordsDescribing.length; w++) {
			if (wordsDescribing[w].length < 3) {
				continue; // do not check words 2 or less characters long
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
		// launch app...
		this.log("Launching app:" + apps[largestCountIndex].exif.FileName);
		this.s2.wsLaunchAppWithValues(wsio, {
			appName: apps[largestCountIndex].exif.FileName
		});
	}
} // end voiceHandlerForApplicationLaunch

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
	wordsDescribing = this.getWordsAfterInList("session", words); // should be array, not single string.
	wordCompare = this.getWordsAfterInList("back", words);
	// if there are hits for both, use the longer string
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare
	} else if (!wordsDescribing) { // no hits, move on
		wordsDescribing = wordCompare
	}
	if (wordsDescribing === undefined) {
		this.log("Error>voiceToAction> voiceHandlerForSessionRestore given:" + words, true);
		this.log("Error>voiceToAction> voiceHandlerForSessionRestore tripped, but no word descriptors. Returning...", true);
		return;
	}
	// var assetList = this.s2.assets.listAssets();
	var sessions = this.s2.listSessions();
	var matchList = []; // will be an array of best match cases. searching through filename, title, description, keywords
	var nameString, nameCount;
	var largestCountIndex = 0;
	for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
		// reset counters and comparison variables for the new sessions.
		// TODO, move this out and store it for later instead of recalc on each voice call
		nameCount = 0;
		nameString = sessions[sessionIndex].exif.FileName.toLowerCase(); // lower case, words are already expected to be lower case
		// for each of the words.
		for (let w = 0; w < wordsDescribing.length; w++) {
			if (wordsDescribing[w].length < 3) {
				continue; // do not check words 2 or less characters long
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
		this.log("Loading session:" + sessions[largestCountIndex].id);
		this.s2.wsLoadFileFromServer(wsio, {
			application: 'load_session',
			filename: sessions[largestCountIndex].id,
			user: wsio.id
		});
	}
}

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
	wordsDescribing = this.getWordsAfterInList("as", words); // should be array, not single string.
	wordCompare = this.getWordsAfterInList("name", words);
	// if there are hits for both, use the longer string
	if (wordsDescribing && wordCompare && (wordCompare.length < wordsDescribing.length)) {
		wordsDescribing = wordCompare
	} else if (!wordsDescribing) { // no hits, move on
		wordsDescribing = wordCompare
	}
	if (wordsDescribing === undefined) {
		this.log("Error>voiceToAction> voiceHandlerForSessionSave given:" + words, true);
		this.log("Error>voiceToAction> voiceHandlerForSessionSave tripped, but no word descriptors. Returning...", true);
		return;
	};
	if (wordsDescribing.length < 1) {
		this.log("Error>voiceToAction> voiceHandlerForSessionSave given:" + words, true);
		this.log("Error>voiceToAction> voiceHandlerForSessionSave tripped, but name scheme was not given.", true);
		return;
	}
	// save the session with the given name
	this.log("Saving session, filename:" + wordsDescribing.join(" "));
	this.s2.wsSaveSesion(wsio, wordsDescribing.join(" "));
}



module.exports = VoiceActionManager;
