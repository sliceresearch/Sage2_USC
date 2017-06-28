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
	this.dataStructure = {
		allValues: {},
		allNamesOfValues: [],
		newValueWatchers: []
	};
	this.clients = clients;
	this.broadcast = broadcast;

	// linker structure is an array, because each array entry represents groups of links
	// see linkerAddGroupIfNecessary for specifics on group properties.
	this.linkerStructure = [];
	// array of entries of known data types.
	this.dataTypeRegistry = [];
	
	this.loadDataTypeRegistry(); // load
}

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
	for (let i = 0; i < this.dataStructure.allValues[ "" + data.nameOfValue ].subscribers.length; i++) {
		// alter data based on subscriber id and their specified function
		dataForApp.app  = this.dataStructure.allValues["" + data.nameOfValue].subscribers[i].app;
		dataForApp.func = this.dataStructure.allValues["" + data.nameOfValue].subscribers[i].func;
		this.broadcast('broadcast', dataForApp);
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
 * App can submit data to affect linking. Based on what it updated, will inform requesters of data.
 *
 * @method linkerSubmitData
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.nameOfValue - App that submitted (id).
 * @param  {Array}  data.value - Should be an array.
 * @param  {String} data.description - App that submitted (id).
 * @param  {String} data.description.app - App that submitted (id).
 * @param  {String} data.description.linkType - What is this for: selection, hover
 * @param  {Integer} data.description.linkerGroup - Which link group this is for. Default 0.
 */
SharedServerDataManager.prototype.linkerSubmitData = function(wsio, data) {
	// rebind
	var linkInformation = Object.assign({}, data.description);
	// add name of value
	linkInformation.nameOfValue = nameOfValue;
	linkInformation.value = data.value; // TODO will this cause problems with reference copies of objects?

	// if not defined, the default group is 0
	if (!linkInformation.linkerGroup) {
		linkInformation.linkerGroup = 0;
	} // then see if the group exists
	this.linkerAddGroupIfNecessary(linkInformation);
	// put data in array if it already isn't
	if (!Array.isArray(linkInformation.value)) {
		linkInformation.value = [linkInformation.value];
	}
	// TODO, does this section need to be skipped if there is no value?
	var listOfLinkTypes = ["selection", "hover", "dataset"];
	var linkTypeWasUpdated = Array(listOfLinkTypes.length).fill(false);
	// possible to update more than one, which is why the for loop is here. But currently assuming one.
	for (let i = 0; i < listOfLinkTypes.length; i++) {
		// if the submission matches a link type
		if (linkInformation.linkType.includes(listOfLinkTypes[i])) {
			// update the linkInformation set for that type
			this.linkerStructure[linkInformation.linkerGroup][listOfLinkTypes[i]] = linkInformation.value;
			linkTypeWasUpdated[i] = true;
		}
	}
	// now for each of the requesters, update them if the link type matches(selection, hover, dataset) and that type was updated
	var requester;
	for (let i = 0; i < this.linkerStructure[linkInformation.linkerGroup].requesters.length; i++) {
		requester = this.linkerStructure[linkInformation.linkerGroup].requesters[i];
		for (let type = 0; type < listOfLinkTypes.length; type++) {
			// if the link type was updated and the requester wanted it
			if (linkTypeWasUpdated[type] && requester.linkType.includes(listOfLinkTypes[type])) {
				// call the update requester, giving the corresponding dataset
				this.linkerUpdateRequester(this.linkerStructure[linkInformation.linkerGroup][listOfLinkTypes[type]], requester);
			}
		}
	}
};

/**
 * Add link group if the specified group doesn't exist.
 *
 * @method linkerAddGroupIfNecessary
 * @param  {Integer} data.linkerGroup - Which link group this is for. Default 0.
 */
SharedServerDataManager.prototype.linkerAddGroupIfNecessary = function(data) {
	// if not defined, the default group is 0
	if (!data.linkerGroup) {
		data.linkerGroup = 0;
	}
	// if that group doesn't exist, make it.
	if (!this.linkerStructure[data.linkerGroup]) {
		this.linkerStructure[data.linkerGroup] = {
			allData: [], // array of all data. unsure how to implement
			dataSources: [], // array of objects {app:app that submitted data, desc: {object describing data} }
			selection: [],
			hover: [],
			dataset: [],
			requesters: [], // array of objects {app: app that requested, func: function to return data, dataDesired:[{type:"", format:""}]}
			history: []
		};
	}
};

/**
 * Updates the requester of link information. The requester object is given.
 *
 * @method linkerUpdateRequester
 * @param  {Array} dataSubmitted - the data that was submitted for the particular link type (ex: dataset, selection, hover)
 * @param  {Object} requester - The object which contains requester information. Major pieces described below.
 * @param  {String} requester.app - id of app to send back to.
 * @param  {String} requester.func - func on app to give data to
 * @param  {String} requester.dataType - what data type the app wants
 * @param  {Object} requester.dataFormat - what format the data has to be in.
 */
SharedServerDataManager.prototype.linkerUpdateRequester = function(dataSubmitted, requester) {
	var requestedDataType = requester.dataType;
	var convertedDataToMatchRequester = null;
	// If the requested data type isn't dataset, because dataset currently means "give me a copy"
	if (requestedDataType !== "dataset") {
		// get information about the data type, should be an object 
		var dataTypeInformation = this.linkerGetDataTypeInformation(requestedDataType);

		// check if in data type, this will also return how to find the data
		var dataTypeLocationInData = this.linkerDoesDataContainRequestedDataType(dataSubmitted, requestedDataType);

		// if the data is within the submission, and it isn't already at the top leve.
		if (dataTypeLocationInData) {
			// reduce / convert based on data type information
			convertedDataToMatchRequester = this.linkerConvertDataToMatch(dataSubmitted, requester, dataTypeLocationInData);
			// error asdf asdf 
			// fill out above function





















		} else { // otherwise, create appropriate pass data to 
			throw new "Error: linkerUpdateRequester incomplete, need to create correct data based on original submission";
		}
	} else {
		convertedDataToMatchRequester = dataSubmitted.slice();
	}
	// // send to requester
	// error asdf asdf 
	// make packet and emit
	// use the source/destination values

	// do not set description to avoid further looping of data, after setting, destinations should be self subscribed.
	this.setValue(null, {
		nameOfValue: requester.nameOfValue,
		value: convertedDataToMatchRequester
	});




















};

/**
 * This will search through the the data set and see if it contains the requestedDataTypedata
 *
 * @method linkerDoesDataContainRequestedDataType
 * @param {Array} dataSubmitted - Should be an array of data.
 * @param {String} requestedDataType - What data type was requested.
 * @return {Boolean} match - matching object that describes requestedDataTypedata 
 */
SharedServerDataManager.prototype.linkerDoesDataContainRequestedDataType = function(dataSubmitted, requestedDataType) {
	// dataSubmitted should have been converted to array as part of submit
	var element1 = dataSubmitted[0]; // get first element
	var typeOfElement1 = typeof element1;
	var objectPath;
	var wasFound = false;
	//what happens if it is an array?
	if (typeOfElement1 === "object") { // if it is an object
		wasFound = this.linkerRecursiveCheckOnObjectFor(element1, requestedDataType);
	} else if (typeOfElement1 === "string"
	|| typeOfElement1 === "number" || typeOfElement1 === "boolean") {
		// TODO formatting needs to be checked against current datatype not subtype
		if (requestedDataType.stringFormat === "alwaysTrue") {
			wasFound = {
				path: [],
				value: true
			};
		}
	} else {
		// more check cases?
	}

	// report
	if (wasFound) {
		console.log("erase me, linkerDoesDataContainRequestedDataType detects " + requestedDataType.names[0] + " within "
			+ element1 + "(" + typeOfElement1 + ")");
	} else {
		console.log("erase me, linkerDoesDataContainRequestedDataType DOES NOT detect " + requestedDataType.names[0] + " within "
			+ element1 + "(" + typeOfElement1 + ")");
	}
	return wasFound;
};

/**
 * Recursivly calls itself to see if the given object contains the data type.
 *
 * @method linkerRecursiveCheckOnObjectFor
 * @param {Object} objectToCheck - The object who's structure might contain datatype.
 * @param {String} requestedDataType - What data type was requested.
 */
SharedServerDataManager.prototype.linkerRecursiveCheckOnObjectFor = function(objectToCheck, requestedDataType, trackingHistory = false) {
	// first get the keys (names of attributes on object)
	var keys = Object.keys(objectToCheck);
	var nameMatchIndexes = [];
	var formatMatchIndexes = [];
	var subTypesChecklist = [];
	var foundCurrentDataType = false;

	// if there is no trackingHistory, create it
	if (!trackingHistory) {
		trackingHistory = {
			path:[]
		}
	}

	// then see if any of the requestedDataType names are in the keys
	for (let i = 0; i < requestedDataType.names.length; i++) {
		if (keys.includes(requestedDataType.names[i])) {
			nameMatchIndexes.push(i);
		}
	}
	// warning in case of name collision
	if (nameMatchIndexes.length > 1) {
		let matchedNames = "";
		for (let i = 0; i < nameMatchIndexes.length; i++) {
			matchedNames += requestedDataType.names[nameMatchIndexes[i]] + " ";
		}
		console.log("Warning: linkerRecursiveCheckOnObjectFor detects more than one match for datatype "
		+ requestedDataType.name[0] + " > " + matchedNames);
	}
	// if there are name matches on any keys, then check for subTypes(if possible)
	if (nameMatchIndexes.length > 0) {
		// get the subTypes in an array for checking
		// for each subtype make an object for checking if exists.
		for (let i = 0; i < requestedDataType.subTypes.length; i++) {
			subTypesChecklist.push({
				keyOfCurrentProperty: null,
				found: false,
				// get the datatype object for recursive passing
				dataType: this.linkerGetDataTypeInformation(requestedDataType.subTypes[i])
			});
		}
		var currentProperty;
		// go through each match and see if it is an object.
		for (let i = 0; i < nameMatchIndexes.length; i++) {
			currentProperty = objectToCheck[keys[nameMatchIndexes[i]]];
			// if the matched property is an object, the subTypes can be searched for.
			if (typeof currentProperty === "object") {
				// perform same search on the next level 
				for (let s = 0; s < subTypesChecklist.length; s++) {
					subTypesChecklist[s].found = this.linkerRecursiveCheckOnObjectFor(currentProperty, subTypesChecklist[s].dataType);
					// which key was used to find this sub type
					subTypesChecklist[s].keyOfCurrentProperty = keys[nameMatchIndexes[i]];
				}
			} else if (typeof currentProperty === "string"
			|| typeof currentProperty === "number" || typeof currentProperty === "boolean") {
				// TODO formatting needs to be checked against current datatype not subtype
				if (requestedDataType.stringFormat === "alwaysTrue") {
					// but currently just returning true on string match.
					foundCurrentDataType = true;
					// track which one it was
					trackingHistory.path.push(keys[nameMatchIndexes[i]]);
					trackingHistory.value = true;
				}
			} else {
				// not sure what to do with it actually
				console.log("Error: linkerRecursiveCheckOnObjectFor unable to check var type "
				+ (typeof currentProperty));

				// should this be assumed to be conversion to string?
				// for example there might be numbers. a datetime could be numbers, not just string.
			}
		}
		// if there was a match on the data type name, but it wasn't found in string format, see if all subTypes were accounted for.
		if (!foundCurrentDataType && subTypesChecklist.length > 0) {
			foundCurrentDataType = true; // easier to start true and set to false if not found
			trackingHistory.subTypes = [];
			// check if all subTypes were found.
			for (let s = 0; s < subTypesChecklist.length; s++) {
				if (!subTypesChecklist[s].found) {
					foundCurrentDataType = false;
					break; // stop now
				} else {
					trackingHistory.subTypes.push(subTypesChecklist[s].found);
				}
			}
			// if not all subTypes were found, remove
			if (!foundCurrentDataType) {
				delete trackingHistory.subTypes;
			}
		}
	}
	// if at this point the data type wasn't found, no properties on the current level matched the data type
	if (!foundCurrentDataType) {
		// check each of the attributes
		for (let i = 0; i < keys.length; i++) {
			// insert a placeholder for the path that will be taken.
			trackingHistory.path.push("temp");
			// only continue if has not found, don't overwrite incorrectly
			if (typeof objectToCheck[keys[i]] === "object" && !foundCurrentDataType) {
				trackingHistory[trackingHistory.path.length - 1] = keys[i]; // swap out the placeholder.
				foundCurrentDataType = this.linkerRecursiveCheckOnObjectFor(objectToCheck[keys[i]], requestedDataType, trackingHistory);
			}
		}
	}
	// if at this point the data type wasn't found, no properties on the current level matched the data type
	if (!foundCurrentDataType) {
		return false;
	} else {
		return trackingHistory
	}
};

/**
 * Converts the data that was just submitted to match what was requested by the app.
 *
 * @method linkerConvertDataToMatch
 * @param {Array} dataSubmitted - Data in an array.
 * @param {Object} requester - Requester object. properties: app, func, dataType, dataFormat, linkType
 * @param {Object} containsRequestedDataType - Object with properties below.
 * @param {Array} containsRequestedDataType.path - Array of strings showing how to find the property.
 * @param {String|Number|Boolean|Null} containsRequestedDataType.value - Not null if value of the data type is at this level.
 * @param {Array|Null} containsRequestedDataType.subTypes - Not null if has subTypes. Described as containsRequestedDataType.
 */
SharedServerDataManager.prototype.linkerConvertDataToMatch = function(dataSubmitted, requester, containsRequestedDataType) {
	var convertedDataToMatchRequester = [];

	// if the data type in the requester wants isn't in the submitted values, then must to a reverse action on the data.
	// based on what was submitted, apply a filter to the original data of the requester
	if (!containsRequestedDataType) {
		// TODO fill this out, placeholder is copy
		convertedDataToMatchRequester = dataSubmitted.slice();










	} else if (containsRequestedDataType.path.length <= 0) {
		// at top level, is a primitive (not object), and may need conversion
		convertedDataToMatchRequester = dataSubmitted.slice();






	} else { // geting this far, the submitted data contains the requested datatype and is within a path.
		// for each elememt in the submitted data
		let originalElement, currentElement, currentDataType;
		for (let entryIndex = 0; entryIndex < dataSubmitted.length; entryIndex++) {
			// make a reference to the original element
			originalElement = dataSubmitted[entryIndex];
			currentElement = originalElement;
			// reference the original data type
			currentDataType = containsRequestedDataType;

			// traverse the path as far as possible
			while (currentDataType != null && currentDataType != undefined) {
				for (let p = 0; p < currentDataType.path.length; p++) {
					currentElement = currentElement[currentDataType.path[p]];
				}

				// TODO continue down the subTypes array. AND SPLIT?
				// this might have to be recursive function.
				// actually this also might have to be a reconstruction of the data itself
				currentDataType = null;
			}

			// TODO here might actually be format compliance based on the generated data structure to match the registry

			// after traversal for dataType parts
			convertedDataToMatchRequester[entryIndex] = currentElement;
		}
	}

	return convertedDataToMatchRequester;
	// TODO erorr here fill out format matcher




































};

/**
 * Request for data based on the submission description.
 * 
 * Example:
 *   Request <all>
 *   Request <gps> <1 value> <format>.
 *   Request <gps> as <range> <format>
 *   Request <gps> as <set> <format>
 *   Request <time> <1 value> <format>.
 *   Request <time> as <range> <format>
 *   Request <time> as <set> <format>
 * 
 * @method linkerRequestForData
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.app - App that submitted (id)
 * @param  {String} data.func - Name of function to give back to.
 * @param  {String} data.linkType - What is this for: selection, hover
 * @param  {String} data.linkerGroup - Which link group is this for. Default 0.
 * @param  {String} data.dataType - What it is requesting. Currently: "dataset", "time", "gps"
 * @param  {Object} data.dataFormat - How the data should be formatted.
 * @param  {Boolean|undefined} data.stopLink - if exists and true, will stop sending updates
 */
SharedServerDataManager.prototype.linkerRequestForData = function(wsio, data) {
	this.linkerAddGroupIfNecessary(data);

	// don't allow double submissions for the sake of app spam and confusion.
	var requester = this.linkerAddRequesterIfNecessary(data);
	
};

/**
 * Add requester. They have the following properties
 *   app
 *   func
 *   dataType
 *   dataFormat - not implemented yet
 *   linkType - dataset, selection, hover
 *
 * @method linkerAddRequesterIfNecessary
 * @param  {Integer} data.linkerGroup - Which link group this is for. Default 0.
 */
SharedServerDataManager.prototype.linkerAddRequesterIfNecessary = function(data) {
	var requester = {
		nameOfValue: data.nameOfValue,
		app: data.app, // string of app that requested..
		func: data.func, // where to send the data back
		dataType: data.dataType, // which data type
	};
	var requestersInGroup = this.linkerStructure[data.linkerGroup].requesters;

	// if the request was already made don't add.
	// a new request is if: app is different, function is different, or dataType is different. Ex: Request time and space.
	var alreadyRequested = false;
	for (let i = 0; i < requestersInGroup.length; i++) {
		if (requestersInGroup.app === requester.app
		&& requestersInGroup.func === requester.func
		&& requestersInGroup.dataType === requester.dataType) {
			alreadyRequested = true;
		}
	}
	if (!alreadyRequested) {
		requester.dataFormat = data.dataFormat;
		if (!data.linkType) {
			data.linkType = "selection hover"
		}
		requester.linkType = data.linkType;
		this.linkerStructure[data.linkerGroup].requesters.push(requester);
	}
	return requester;
};

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// experimental - data type registry

/**
 * Loads data types in to the registry.
 *
 * @method loadDataTypeRegistry
 */
SharedServerDataManager.prototype.loadDataTypeRegistry = function() {
	// this.dataTypeRegistry

	// TODO convert to some kind of file reader or something with generic attributes

	// currently gps
	var dataTypeGps = {
		names: ["gps", "coordinate", "coordinates", "position", "location"],
		subTypes: ["latitude", "longitude"],
		stringFormat: "alwaysTrue"
	};
	var dataTypeLatitude = {
		names: ["latitude", "lat"],
		subTypes: [],
		stringFormat: "alwaysTrue"
	};
	var dataTypeLongitude = {
		names: ["longitude", "lng"],
		subTypes: [],
		stringFormat: "alwaysTrue"
	};

	this.dataTypeRegistry.push(dataTypeGps);
	this.dataTypeRegistry.push(dataTypeLatitude);
	this.dataTypeRegistry.push(dataTypeLongitude);
};

/**
 * This will search through the data type registry for a match on the named data type.
 *
 * @method linkerGetDataTypeInformation
 * @param {String} requestedDataType - What data type was requested.
 * @return {Object|null} match - matching object that describes requestedDataTypedata 
 */
SharedServerDataManager.prototype.linkerGetDataTypeInformation = function(requestedDataTypedata) {
	for(let i = 0; i < this.dataTypeRegistry.length; i++) {
		if (this.dataTypeRegistry[i].names.includes(requestedDataTypedata)) {
			return this.dataTypeRegistry[i];
		}
	}
	return null;
};





module.exports = SharedServerDataManager;
