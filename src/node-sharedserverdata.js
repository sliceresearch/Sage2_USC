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

var sageutils        = require('../src/node-utils');               // for print formating

var dataTypeRegistry = require('../src/node-shareddataregistry'); // contains data type information



// !!! marker for original dataset
var originalDatasetMarker = "originalData";



/**
 * SharedServerDataManager container object.
 * The dataStructure is:
 * this.dataStructure is an object with:
 *    this.dataStructure.allValues = {};
 *       object to hold all tracked values
 *       example this.dataStructure.allValues['nameOfValue'] = <entryObject>
 *    this.dataStructure.allNamesOfValues = [];
 *       strings to denote the names used for values
 *       order is based on when it was first set (not alphabetical)
 * The allValues is comprised of entry objects
 * {
 *    name: name of value
 *    value: actual value which could be an object of more values
 *    desc: used for later
 *    subscribers: []
 * }
 * Each entry in subscribers is also an object.
 * Current assumption is that all subscribers are apps on a display, however being wsio based, its more a matter of how
 * the wsio client receives the data and what it does.
 * {
 *    app: identifies the app which is subscribing to the value.
 *    func: name of the function to call in order to pass the information.
 * }
 *
 * @class SharedServerDataManager
 * @constructor
 * @param  {Array} clients - A reference to the client list.
 */
function SharedServerDataManager(clients, broadcast) {
	this.infoPrint("Loading SharedServerDataManager");
	this.dataStructure = {
		allValues: {},
		allNamesOfValues: [],
		newValueWatchers: []
	};
	this.clients = clients;
	this.broadcast = broadcast;

	// linker structure is an array, because each array entry represents groups of links
	// see linkerAddGroupIfNecessary for specifics on group properties.
	this.trackerForServerSideDataLinks = [];

	this.debug = {
		any: true,
		createDataLink: true,
		handleLinkUpdateConversion: true
	};

	// this.loadDataTypeRegistry(); // load
	dataTypeRegistry.loadDataTypes();
}

// debug functions
SharedServerDataManager.prototype.debugPrint = function(line, type = "any") {
	if (this.debug[type]) {
		console.log("dbug>n-ssd>" + type + ">" + line);
	}
};
SharedServerDataManager.prototype.debugDir = function(obj, type = "any") {
	if (this.debug[type]) {
		console.log("dbug>n-ssd>" + type + ">console.dir");
		console.dir(obj);
	}
};
SharedServerDataManager.prototype.infoPrint = function(line) {
	console.log(sageutils.header('SharedServerDataManager') + line);
};

/**
 * Sets the value of specified server data. If it doesn't exist, will create it.
 *
 * @method setValue
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.nameOfValue - Name of value to set.
 * @param  {*} data.value - Value to store.
 * @param  {*} data.description - Currently a string to plain text describe the variable.
 */
SharedServerDataManager.prototype.setValue = function(wsio, data) {
	// don't do anything if not given nameOfValue
	if (data.nameOfValue === undefined || data.nameOfValue === null || data.value === undefined) {
		return;
	}
	var addedNewValue = false;
	// check if there is no entry for that value
	if (this.dataStructure.allValues["" + data.nameOfValue] === undefined) {
		// need to make an entry for this value
		var newValue = {};
		newValue.nameOfValue        = data.nameOfValue;
		newValue.value              = data.value;
		newValue.description		= data.description;
		newValue.subscribers		= [];
		// placeholder for subscription ahead of time
		if (data.subscribePlaceholder) {
			newValue.value = undefined; // this should be the only way a value is undefined
		}
		// add it and update tracking vars.
		this.dataStructure.allValues["" + data.nameOfValue] = newValue;
		this.dataStructure.allNamesOfValues.push("" + data.nameOfValue);
		addedNewValue = true;
	} else {
		// undefined should only possible through subscription placeholder
		if (undefined === this.dataStructure.allValues[ "" + data.nameOfValue ].value) {
			addedNewValue = true;
		}
		// value exists, just update it.
		this.dataStructure.allValues["" + data.nameOfValue].value = data.value;
		// potentially the new value isn't the same and a description can be useful
		if (data.description) {
			this.dataStructure.allValues["" + data.nameOfValue].description = data.description;
		}
	}
	var dataForApp = {};
	dataForApp.data = { // this data piece is only for new value watchers
		nameOfValue: data.nameOfValue,
		description: data.description,
		status: "add"
	};
	// if a new value send to each of the new value watchers, currently only works with displays clients
	if (addedNewValue && !data.subscribePlaceholder) {
		for (let i = 0; i < this.dataStructure.newValueWatchers.length; i++) {
			// alter data based on subscriber id and their specified function
			dataForApp.app  = this.dataStructure.newValueWatchers[i].app;
			dataForApp.func = this.dataStructure.newValueWatchers[i].func;
			// notify to all clients
			this.broadcast('broadcast', dataForApp);
		}
	}
	// now send to each of the subscribers the new value
	dataForApp.data = this.dataStructure.allValues["" + data.nameOfValue].value;
	var currentSubscriber, destinationValueObject;
	for (let i = 0; i < this.dataStructure.allValues["" + data.nameOfValue].subscribers.length; i++) {
		currentSubscriber = this.dataStructure.allValues["" + data.nameOfValue].subscribers[i];
		// if this is a data link, the data must be updated and the app/function altered based on destination value information
		if (currentSubscriber.destinationValueName) {
			this.debugPrint("detected need to data link update> "
			+ data.nameOfValue + " to " + currentSubscriber.destinationValueName);
			// first get destination value object
			destinationValueObject = this.dataStructure.allValues["" + currentSubscriber.destinationValueName];
			try {
				this.handleLinkUpdateConversion(this.dataStructure.allValues["" + data.nameOfValue], destinationValueObject);
				// handleLinkUpdateConversion will set the value and that will trigger subscriber to receive data.
			} catch (e) {
				console.log();
				console.log();
				console.log("Error occured somewhere in handleLinkUpdateConversion");
				console.log();
				console.log();
				console.dir(e);
			}
		} else {
			// alter data based on subscriber id and their specified function
			dataForApp.app  = currentSubscriber.app;
			dataForApp.func = currentSubscriber.func;
			this.broadcast('broadcast', dataForApp);
		}
	}
};

/**
 * Checks if there is a value, and if so will send the value.
 * If the value doesn't exist, it will not do anything.
 *
 * @method getValue
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.nameOfValue - Name of value to get.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give value to.
 */
SharedServerDataManager.prototype.getValue = function(wsio, data) {
	// don't do anything if this isn't filled out.
	if (data.nameOfValue === undefined || data.nameOfValue === null) {
		return;
	}
	// also don't do anything if the value doesn't exist
	if (this.dataStructure.allValues["" + data.nameOfValue] === undefined) {
		return;
	}
	// make the data for the app, using display's broadcast packet
	var dataForApp = {};
	dataForApp.app  = data.app;
	dataForApp.func = data.func;
	dataForApp.data = this.dataStructure.allValues[ "" + data.nameOfValue ].value;
	// send only to the client that requestd it. Q: does it matter it multiple display clients?
	this.broadcast('broadcast', dataForApp);
};

/**
 * Checks if there is a value, and if so will send the value.
 * If the value doesn't exist, it will not do anything.
 *
 * @method removeValue
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {Array} data.namesOfValuesToRemove - Names of values to remove.
 */
SharedServerDataManager.prototype.removeValue = function(wsio, data) {
	// don't do anything if this isn't filled out.
	if (data.namesOfValuesToRemove === undefined || data.namesOfValuesToRemove === null) {
		return;
	}
	var nameToRemove;
	for (let i = 0; i < data.namesOfValuesToRemove.length; i++) {
		nameToRemove = data.namesOfValuesToRemove[i];
		// also don't do anything if the value doesn't exist
		if (this.dataStructure.allValues["" + nameToRemove] === undefined) {
			continue; // doesn't exist, move to next one
		} else {
			// remove from names of values
			this.dataStructure.allNamesOfValues.splice(this.dataStructure.allNamesOfValues.indexOf(nameToRemove), 1);
			// remove from dataStructure
			delete this.dataStructure.allValues[nameToRemove];

			// necessary to tell new value watchers that this value was removed?
			var dataForApp = {};
			dataForApp.data = {
				nameOfValue: nameToRemove,
				description: "",
				status: "remove"
			};
			for (let i = 0; i < this.dataStructure.newValueWatchers.length; i++) {
				// alter data based on subscriber id and their specified function
				dataForApp.app  = this.dataStructure.newValueWatchers[i].app;
				dataForApp.func = this.dataStructure.newValueWatchers[i].func;
				// notify to all clients
				this.broadcast('broadcast', dataForApp);
			}
		}
	}
};

/**
 * Add the app to the named values a subscriber.
 * If the value doesn't exist, it will create a "blank" value and subscribe to it.
 *
 * @method subscribeToValue
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.nameOfValue - Name of value to subscribe to.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give value to.
 * @param  {String|undefined} data.unsubscribe - If exists and true, then will remove user from subscribe list.
 */
SharedServerDataManager.prototype.subscribeToValue = function(wsio, data) {
	// Need to have a name. Without a name, nothing can be done.
	if (data.nameOfValue === undefined || data.nameOfValue === null) {
		return;
	}
	if (data.dataLink) { // if this should be a smart link don't do normal subscribe actions
		this.createDataLink(wsio, data);
		return;
	}
	// if value doesn't exist make it, when changed later the subscription will work
	if (this.dataStructure.allValues["" + data.nameOfValue] === undefined) {
		data.value = null; // nothing, it'll be replace later if at all
		data.subscribePlaceholder = true;
		this.setValue(wsio, data);
	}

	var foundSubscriber = false;
	for (let i = 0; i < this.dataStructure.allValues[ "" + data.nameOfValue ].subscribers.length; i++) {
		// do not double add if the app and function are the same this permits same app diff function
		if (this.dataStructure.allValues[ "" + data.nameOfValue ].subscribers[i].app == data.app
			&& this.dataStructure.allValues[ "" + data.nameOfValue ].subscribers[i].func == data.func) {
			foundSubscriber = true;
			if (data.unsubscribe) {
				this.dataStructure.allValues[ "" + data.nameOfValue ].subscribers.splice(i, 1);
			}
			break;
		}
	}
	// if app is not already subscribing
	if (!foundSubscriber && !data.unsubscribe) {
		// make the new subscriber entry
		var newSubscriber  = {};
		newSubscriber.app  = data.app;
		newSubscriber.func = data.func;
		// add it to that value
		this.dataStructure.allValues[ "" + data.nameOfValue ].subscribers.push(newSubscriber);
	}
};

/**
 * Will respond back once to the app giving the func an array of tracked values.
 * They will be in an array of objects with properties nameOfValue and value.
 * NOTE: this could be a huge array.
 *
 * @method getAllTrackedValues
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give value to.
 */
SharedServerDataManager.prototype.getAllTrackedValues = function(wsio, data) {
	var dataForApp = {};
	dataForApp.data = [];
	dataForApp.app  = data.app;
	dataForApp.func = data.func;
	for (var i = 0; i < this.dataStructure.allNamesOfValues.length; i++) {
		dataForApp.data.push(
			{	nameOfValue: this.dataStructure.allNamesOfValues[i],
				value: this.dataStructure.allValues[ this.dataStructure.allNamesOfValues[i] ]
			});
	}
	this.broadcast('broadcast', dataForApp); // send to all clients, they want it.
};

/**
 * Gets all tracked value names and descriptions, gives to requesting app.
 *
 * @method getAllTrackedValues
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give value to.
 */
SharedServerDataManager.prototype.getAllTrackedDescriptions = function(wsio, data) {
	var dataForApp = {};
	dataForApp.data = [];
	dataForApp.app  = data.app;
	dataForApp.func = data.func;
	for (var i = 0; i < this.dataStructure.allNamesOfValues.length; i++) {
		dataForApp.data.push(
			{	nameOfValue: this.dataStructure.allNamesOfValues[i],
				description: this.dataStructure.allValues[this.dataStructure.allNamesOfValues[i]].description
			});
	}
	this.broadcast('broadcast', dataForApp);
};

/**
 * Will send a notification to app when a new value gets created.
 * App will get the value's name and description.
 *
 * NOTE: this could be a huge array.
 *
 * @method subscribeToNewValueNotification
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give notification.
 * @param  {Boolean|undefined} data.unsubscribe - if exists and true, will remove from new value watcher list.
 */
SharedServerDataManager.prototype.subscribeToNewValueNotification = function(wsio, data) {
	// create the element
	var appWatcher = {
		app: data.app,
		func: data.func
	};
	// make sure it wasn't already added
	for (let i = 0; i < this.dataStructure.newValueWatchers.length; i++) {
		if (this.dataStructure.newValueWatchers[i].app === appWatcher.app
		&& this.dataStructure.newValueWatchers[i].func === appWatcher.func) {
			if (data.unsubscribe) {
				this.dataStructure.newValueWatchers.splice(i, 1);
			}
			return; // they are already subscribed, or this was an unsubscribe
		}
	}
	this.dataStructure.newValueWatchers.push(appWatcher);
};

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// experimental
/**
 * Creates a data link if doesn't exist already, or removes if the unLink value is true.
 *
 * @method createDataLink
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {Object} data.dataLink - Main descriptor for link creation.
 * @param  {String} data.dataLink.source - Any time this value changes.
 * @param  {String} data.dataLink.destination - Update this value.
 * @param  {Boolean} data.dataLink.unLink - If true, remove the link.
 */
SharedServerDataManager.prototype.createDataLink = function(wsio, data) {
	var sourceName = data.dataLink.source;
	var destinationName = data.dataLink.destination;
	var sourceValueObject;
	var linkString = sourceName + "$=>@" + destinationName; // weird string combo to find separation between source and destination.

	this.debugPrint("Triggered for source to destination:" + linkString, "createDataLink");

	if (data.dataLink.printValues) {
		this.debugPrint("Listing available values of type:" + data.dataLink.printValues, "createDataLink");
		var entry;
		for (let i = 0; i < this.dataStructure.allNamesOfValues.length; i++) {
			if (data.dataLink.printValues === "any"
			|| this.dataStructure.allNamesOfValues[i].includes(data.dataLink.printValues)) {
				this.debugPrint(this.dataStructure.allNamesOfValues[i], "createDataLink");
				entry = this.dataStructure.allValues[this.dataStructure.allNamesOfValues[i]];
				if (typeof entry.description === "object" && entry.description.dataFormat) {
					this.debugPrint("  can data link, format:"
					+ entry.description.dataFormat + ", interpretAs:"
					+ entry.description.interpretAs, "createDataLink");
				}
			}
		}
		return;
	} else {
		this.debugPrint("no custom values detected", "createDataLink");
		this.debugDir(data.dataLink);
	}

	// need sourceName and destination
	if (!sourceName || !destinationName) {
		this.debugPrint("Incomplete link request source(" + sourceName
		+ ") or destination(" + destinationName + ")", "createDataLink");
		return;
	}
	// look for sourceName
	if (!this.dataStructure.allValues[ "" + sourceName]) {
		console.log("Unable to link, sourceName " + sourceName + " doesn't exist");
		return;
	}
	sourceValueObject = this.dataStructure.allValues[ "" + sourceName];
	// look for destinationName
	if (!this.dataStructure.allValues[ "" + destinationName]) {
		console.log("Unable to link, destinationName " + destinationName + " doesn't exist");
		return;
	}
	// at this point, both variable exist. make sure the link doesn't already exist.
	var foundLink = false;
	var shouldUnLink = data.dataLink.unLink ? true : false; // might be undefined
	var currentSubscriber;

	for (let i = 0; i < sourceValueObject.subscribers.length; i++) {
		currentSubscriber = sourceValueObject.subscribers[i];
		// this is a special case, if it has a destination value, then it must be a linked value, see if it matches this requested link.
		if (currentSubscriber.destinationValueName && currentSubscriber.destinationValueName == destinationName) {
			this.debugPrint("Found existing link", "createDataLink");
			foundLink = true;
			if (shouldUnLink) { // unlink by removing the entry from subscribers.
				this.debugPrint("Removing link", "createDataLink");
				sourceValueObject.subscribers.splice(i, 1);
				// remove the server side tracker, its really basic and probably needs to be updated.
				this.trackerForServerSideDataLinks.splice(
					this.trackerForServerSideDataLinks.indexOf(linkString)
					, 1);
			}
			break;
		}
	}
	// if not already linked
	if (!foundLink && !shouldUnLink) {
		this.debugPrint("Adding subscriber as a data link", "createDataLink");
		// make the new subscriber entry for linking the variables
		var newSubscriber  = {};
		newSubscriber.destinationValueName  = destinationName;
		// add it to that value
		this.dataStructure.allValues[ "" + sourceName ].subscribers.push(newSubscriber);
		this.trackerForServerSideDataLinks.push(linkString);
	}
};

/**
 * Handles the data link when a "source" value updates.
 *
 * @method handleLinkUpdateConversion
 * @param  {Object} sourceObject - Value entry in the data structure that got updated.
 * @param  {Object} destinationObject - Value entry in the data structure was listed as a subscriber for data link.
 */
SharedServerDataManager.prototype.handleLinkUpdateConversion = function(sourceObject, destinationObject) {
	// newValue.nameOfValue			= data.nameOfValue;
	// newValue.value				= data.value;
	// newValue.description			= data.description;
	// newValue.description.app
	// newValue.description.interpretAs
	// newValue.description.dataTypes
	// newValue.description.dataFormat
	// newValue.subscribers			= [];

	this.debugPrint(" triggered", "handleLinkUpdateConversion");

	var shouldJustPassValue = false;
	var sourceFormat, destinationFormat;
	var sourceInterpretAs, destinationInterpretAs; // set or range
	var valueToGiveToDestination;

	// if there are no descriptions on either object unable to convert. The descriptions contain convert information
	if (!sourceObject.description || !destinationObject.description
		|| !sourceObject.description.dataFormat || !destinationObject.description.dataFormat) {
		this.infoPrint(" unable to convert the values one of"
			+ sourceObject.nameOfValue + " and " + destinationObject.nameOfValue
			+ " do not have dataFormat descriptions, just passsing the value");
		// just pass the value
		shouldJustPassValue = true;
	} else {
		// otherwise, get the formats
		sourceFormat = sourceObject.description.dataFormat;
		sourceInterpretAs = sourceObject.description.interpretAs;
		destinationFormat = destinationObject.description.dataFormat;
		destinationInterpretAs = destinationObject.description.interpretAs;

		if (!sourceInterpretAs) {
			sourceInterpretAs = "set";
			this.debugPrint(" sourceInterpretAs not specified using set", "handleLinkUpdateConversion");
		}
		if (!destinationInterpretAs) {
			destinationInterpretAs = "set";
			this.debugPrint(" destinationInterpretAs not specified using set", "handleLinkUpdateConversion");
		}

		// if there is no information for the given data types, for if the formats match just pass the values
		if ((sourceFormat === destinationFormat) && (sourceInterpretAs === destinationInterpretAs)) {
			this.debugPrint(" matching formats and interpretation, just passing values", "handleLinkUpdateConversion");
			shouldJustPassValue = true;
		}
		if (!sourceFormat || !destinationFormat) {
			this.infoPrint("Error no format given for " + (sourceFormat ? "sourceFormat" : "")
			+ " " + (destinationFormat ? "destinationFormat" : ""));
		}
		// final check is if there is actually information in the source object, might be an empty array
		if ((Array.isArray(sourceObject.value) && sourceObject.value.length === 0) || sourceObject.value === null) {
			if (destinationInterpretAs === "set" && sourceInterpretAs === "set") {
				shouldJustPassValue = true; // ok to pass empty.
			} else { // one or both was a range,
				// if the destination wants a set, but the source has nothing. it should be whole original set
				throw "n-ssd>handleLinkUpdateConversion> unimplemented is when source is nothing and need to interpret range";
			}
		}
	}
	// reset indentation
	// dont just pass the value if formats are different or interpretation is different.
	if (!shouldJustPassValue) { // but there is information for the given data type
		this.debugPrint("attempting to convert", "handleLinkUpdateConversion");
		// given a data format, what can I get out of it?
		// first detect all datatypes
		var dataTypesInSource = dataTypeRegistry.findDataTypesInValue(sourceObject);
		this.debugPrint("collected datatypes in source", "handleLinkUpdateConversion");

		// unable to rely on destination value becaue the initial value is always blank.
		var dataTypesInDestination = null;
		// dataTypesInDestination =  dataTypeRegistry.findDataTypesInValue(destinationObject);

		// check if destination has a source dataset.
		var destinationOriginalDatasetObject = null;
		destinationOriginalDatasetObject = this.findDestinationOriginalDataSetSourceIfAvailable(destinationObject);
		if (destinationOriginalDatasetObject !== null) {
			this.debugPrint("Detected:" + destinationOriginalDatasetObject.nameOfValue
			+ " to be used as destination dataset reference", "handleLinkUpdateConversion");
			dataTypesInDestination = dataTypeRegistry.findDataTypesInValue(destinationOriginalDatasetObject);
			this.debugPrint("collected datatypes in destination dataset", "handleLinkUpdateConversion");
		} else {
			this.debugPrint("No dataset detected for destination", "handleLinkUpdateConversion");
		}

		// detect necessary data types for destination both format + user specified.
		// var requiredDataTypesOfDestinationNameList = dataTypeRegistry.getRequiredDataTypes(destinationObject);

		// no conversion necessary because dataType matches
		// this function checks if all necessary data types are available in source
		var canConvert = dataTypeRegistry.canSourceConvertToDestination(sourceObject, dataTypesInSource, destinationObject);

		// if conversion is possible, then in theory this should be 1:1 or super to sub.
		if (canConvert) {
			this.debugPrint("should be possible to convert values");

			// if the formats are the same, then the interpretation is probably different
			if (sourceFormat === destinationFormat) {
				if (sourceInterpretAs !== destinationInterpretAs) {
					if (sourceInterpretAs === "set" && destinationInterpretAs === "range") { // format match,  set to range
						// conver the set to a range.
						valueToGiveToDestination = dataTypeRegistry.convertKeepFormatSetToRange(
							sourceObject, dataTypesInSource,
							destinationObject);
					} else if (sourceInterpretAs === "range" && destinationInterpretAs === "set") { // format match,  range to set








						throw "not implemented, range to set with same formatting";







					} else {
						console.log("Unknown interpretation:" + sourceInterpretAs);
					}
				} else {
					console.log("Unsure how this was triggered, formats and interpretation matches..");
				}
			} else { // the formats do not match
				// if interpretation matches
				if (sourceInterpretAs === destinationInterpretAs) {
					if (sourceInterpretAs === "set") {
						// format diff, but interpret as set
						valueToGiveToDestination = dataTypeRegistry.convertFormatSetToSet( // format mismatch,  set to set
							sourceObject, dataTypesInSource,
							destinationObject, dataTypesInDestination);
					} else if (sourceInterpretAs === "range") {
						valueToGiveToDestination = dataTypeRegistry.convertFormatRangeToRange( // format mismatch, range to range
							sourceObject, dataTypesInSource,
							destinationObject, dataTypesInDestination);
					} else {
						console.log("Unknown interpretation:" + sourceInterpretAs);
					}

				} else { // interpretation does not match
					// if source is a set and
					if (sourceInterpretAs === "set" && destinationInterpretAs === "range") { // format mismatch,  set to range
						// conver the set to a range.
						valueToGiveToDestination = dataTypeRegistry.convertKeepFormatSetToRange(
							sourceObject, dataTypesInSource,
							destinationObject, dataTypesInDestination);
					} else if (sourceInterpretAs === "range" && destinationInterpretAs === "set") { // format mismatch, range to set
						// this.debugDir(dataTypesInDestination);
						valueToGiveToDestination = dataTypeRegistry.convertFormatRangeToSet(
							sourceObject, dataTypesInSource,
							destinationObject, dataTypesInDestination,
							// destinationOriginalDatasetObject value entry in structure, not just plain value
							destinationOriginalDatasetObject);
					} else {
						console.log("Unknown interpretation:" + sourceInterpretAs);
					}

				}
			}
		} else { // getting here means that the destination needs more than source offers
			// find the datatypes in source
			this.debugPrint("don't know how to convert, unsure if the throw will crash server");

			throw "error here because it wasn't filled out, this a case of source subset destination";

			// find original destination data set

			// attempt to reduce original set based on availability in source.
		}

		// super set to sub range :  json set to time start/end to specify axis change.

		// range to set : given gps bounds, find points within gps bounds, but where are the points from?
		// does this mean ranges needs original sets to work off of?


		// range to range : if a graph stated its selection on element property, say temp. and gave to graph that wanted just wind range.


		/*
		what if the data types are not convertible? can this be detected
		detect if can conver

		*/
	} else {
		this.debugPrint("no changes applied for what will be given to destination");
		valueToGiveToDestination = sourceObject.value;
	}


	this.debugPrint("passing data...");
	this.setValue(null, {
		nameOfValue: destinationObject.nameOfValue,
		value: valueToGiveToDestination
	});
};

/**
 * Checks the data structure to see if there was a destination source marked as a dataset.
 * Maybe this should be "original".
 *
 * @method findDestinationOriginalDataSetSourceIfAvailable
 * @param  {Object} destinationObject - Value that wants update. Checking for source dataset if available.
 * @return {null | Object} destinationOriginalDatasetObject - null if not found. Object is the entry found.
 */
SharedServerDataManager.prototype.findDestinationOriginalDataSetSourceIfAvailable = function(destinationObject) {
	var destinationOriginalDatasetObject = null;
	var destName;
	// get the name to parse out the app
	destName = destinationObject.nameOfValue;
	if (destName.includes("app_") && destName.includes(":")) { // if app marker exists. this isn't complete and assumes.
		destName = destName.substring(0, destName.indexOf(":")); // get the app_x
		if (destName.includes("app_")) {
			for (let i = 0; i < this.dataStructure.allNamesOfValues.length; i++) {
				if (this.dataStructure.allNamesOfValues[i].includes(destName)
				&& this.dataStructure.allNamesOfValues[i].includes(":source:")
				&& this.dataStructure.allNamesOfValues[i].includes(originalDatasetMarker)) {
					destinationOriginalDatasetObject = this.dataStructure.allValues[this.dataStructure.allNamesOfValues[i]];
					break;
				}
			}
		}
	}
	return destinationOriginalDatasetObject;
};

module.exports = SharedServerDataManager;
