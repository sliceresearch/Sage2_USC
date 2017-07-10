// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


// require variables to be declared
"use strict";

var sageutils        = require('../src/node-utils');               // for print formating

// readers
var jsonReader  = require('../src/dataFormatReaders/readJson'); // contains data format information
var s2GeoLocationReader  = require('../src/dataFormatReaders/readS2GeoLocation');

// data types
var dataTypeGps = require('../src/dataTypes/dataTypeGps');
var dataTypeLatitude = require('../src/dataTypes/dataTypeLatitude');
var dataTypeLongitude = require('../src/dataTypes/dataTypeLongitude');

var hasBeenLoaded = false;
var dataTypeRegistry = [];
var dataTypeRegistryMap = {}; // unsure which is better

var formatReaders = {}; // these get loaded with format readers to be determined on contents.

// debug functions
var debug = {
	any: true,
	findDataTypesInValue: true,
	canSourceConvertToDestination: true,
	getRequiredDataTypes: true,
	convertKeepFormatSetToRange: true,
	convertFormatRangeToRange: true,
	convertFormatRangeToSet: true,
	convertFormatSetToSet: true
};
function debugPrint(line, type = "any", dir = false) {
	if (debug[type]) {
		if (dir) {
			debugDir(line, type);
		} else {
			console.log("dbug>n-sdr>" + type + ">" + line);
		}
	}
}
function debugDir(obj, type) {
	if (debug[type]) {
		console.log("dbug>n-sdr>" + type + ">console.dir");
		console.dir(obj);
	}
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------

function loadDataTypes() {
	if (hasBeenLoaded) {
		return;
	} else {
		console.log(sageutils.header('DataRegistry') + "Intializing..");
		hasBeenLoaded = true;
		console.log(sageutils.header('DataRegistry') + "Loading Types..");
		loadDataTypeRegistry();
		console.log(sageutils.header('DataRegistry') + ".. loaded " + dataTypeRegistry.length);
		console.log(sageutils.header('DataRegistry') + "Loading Format Reader..");
		loadFormatReaders();
		console.log(sageutils.header('DataRegistry') + ".. loaded " + Object.keys(formatReaders).length);
	}
} // loadDataTypes


// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * Loads format readers into the registry.
 *
 * TODO: is this really the best way to do this, the readability is strange.
 *
 * @method loadFormatReaders
 */
function loadFormatReaders() {
	// add format readers
	jsonReader.addReader(formatReaders);
	s2GeoLocationReader.addReader(formatReaders);
}

/**
 * Loads data types into the registry.
 *
 * @method loadDataTypeRegistry
 */
function loadDataTypeRegistry() {
	registerDataType(dataTypeGps.getDescription());
	registerDataType(dataTypeLatitude.getDescription());
	registerDataType(dataTypeLongitude.getDescription());

}

// adds references to the data types
function registerDataType(objDescription) {
	objDescription.refToRegistryArray = dataTypeRegistry;
	objDescription.refToRegistryMap = dataTypeRegistryMap;

	dataTypeRegistry.push(objDescription);
	dataTypeRegistryMap[objDescription.dataTypeRegistryName] = objDescription;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------


/**
 * This will search through the data type registry for a match on the named data type.
 *
 * @method getDataTypeInformation
 * @param {String} requestedDataType - What data type was requested. This could be one of the generic names or offical name.
 * @return {Object|null} match - matching object that describes requestedDataTypedata
 */
function getDataTypeInformation(requestedDataTypeStringName) {
	for (let i = 0; i < dataTypeRegistry.length; i++) {
		if (dataTypeRegistry[i].names.includes(requestedDataTypeStringName)
		|| dataTypeRegistry[i].dataTypeRegistryName === requestedDataTypeStringName) {
			return dataTypeRegistry[i];
		}
	}
	return null;
}

// /**
//  * This will search through the given array to determine the largest value.
//  *
//  * @method findIndexOfLargestValue
//  * @param {String} dataTypeName - What data type was requested.
//  * @param {Array} elementArray - Array representing element mapped values. Each element is an object with properties of registry names.
//  * @return {Object|null} match - matching object that describes requestedDataTypedata
//  */
// function findIndexOfLargestValue(dataTypeName, elementArray) {
// 	var currentLargestIndex = 0;
// 	if (elementArray.length <= 0) {
// 		console.log("Unable to find largest index of empty array");
// 		currentLargestIndex = -1;
// 	}
// 	var registryEntry = dataTypeRegistryMap[dataTypeName];
// 	if (!registryEntry) {
// 		console.log("Unable to find largest index of non-exist entry:" + dataTypeName);
// 	}
// 	for(let i = 1; i < elementArray.length; i++) {
// 		if (registryEntry.order(elementArray[i].dataTypeName, elementArray[i].dataTypeName) > 0) {

// 		}
// 	}
// 	return currentLargestIndex;
// };


// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------


/**
 * Given a value, will try to find the data typesin them.
 * Needs to have correct descriptors.
 *
 * @method findDataTypesInValue
 * @param {Object} valueObject - Search this for data types, major attributes below.
 * @param {Object} valueObject.value - What to search.
 * @param {Object} valueObject.description.interpretAs - .
 * @param {Object} valueObject.description.dataTypes - .
 * @param {Object} valueObject.description.dataFormat - .
 * @return {Array} dataTypesInValue - An array with element for each data type that specifies Object or "false".
 */
function findDataTypesInValue(valueObject) {
	debugPrint("Trying to find datatypes in " + valueObject, "findDataTypesInValue");
	var formatReader = formatReaders[valueObject.description.dataFormat];

	if (!formatReader) {
		throw new "Unknown format: " + valueObject.description.dataFormat;
	}

	// extract data types into a map, giving array registry and map because unsure if either is better.
	// give entire value, because maybe the extra descripters matter
	var dataTypesInValue = formatReader.getDataTypesFromValue(valueObject, dataTypeRegistry, dataTypeRegistryMap);

	// this should be an array that corresponds to each data type registered.
	// elements will be "false" or object describing how to get the values by property path.
	// no path should mean that the subtypes were found, and those have paths.

	return dataTypesInValue;
}



/**
 * This assumes a destination value object. Will return an array of the dataTypeRegistryName.
 *
 * @method getRequiredDataTypes
 * @param  {Object} destinationObject - Value that wants update. Checking for source dataset if available.
 * @return {null | Array} requiredDataTypes - null if not found. Array of dataTypeRegistryName strings if found.
 */
function getRequiredDataTypes(destinationObject) {
	// newValue.nameOfValue			= data.nameOfValue;
	// newValue.value				= data.value;
	// newValue.description			= data.description;
	// newValue.description.app
	// newValue.description.interpretAs
	// newValue.description.dataTypes
	// newValue.description.dataFormat
	// newValue.subscribers			= [];

	var dataFormat = formatReaders[destinationObject.description.dataFormat];
	var requiredDataTypes = null, userSpecified, entryHolder;

	debugPrint("Getting required datatypes for " + destinationObject.nameOfValue, "getRequiredDataTypes");
	debugPrint("  Format specified is:" + destinationObject.description.dataFormat, "getRequiredDataTypes");
	debugPrint("  Value of format reader:" + dataFormat, "getRequiredDataTypes");
	debugPrint("  typeof:" + typeof dataFormat, "getRequiredDataTypes");

	// do not alter the original array
	requiredDataTypes = dataFormat.requiredDataTypes.slice();
	// user might not have specified, need to check first
	userSpecified = destinationObject.description;
	if (typeof userSpecified === "object" &&  userSpecified.dataTypes) {
		userSpecified = userSpecified.dataTypes.slice(); // do not alter the original array

		// first check if a registered data type, then convert to proper name.
		for (let i = 0; i < userSpecified.length; i++) {
			entryHolder = getDataTypeInformation(userSpecified[i]);
			// if a match was found
			if (null !== entryHolder) {
				userSpecified[i] = entryHolder.dataTypeRegistryName;
			} else {
				debugPrint("  unknown user specified data type " + userSpecified[i], "getRequiredDataTypes");
			}
		}

		// first check if already known. if not add it. Only possible if format contains optional values.
		for (let i = 0; i < userSpecified.length; i++) {
			if (!requiredDataTypes.includes(userSpecified[i])) {
				requiredDataTypes.push(userSpecified[i]);
			}
		}
	} else {
		debugPrint("  required types not specified by user on " + destinationObject.nameOfValue, "getRequiredDataTypes");
	}

	return requiredDataTypes;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * Can the source convert to destination.
 * Currently: is the source a superset of destination?
 *
 * @method canSourceConvertToDestination
 * @param {Object} sourceObject - Entry in the value data structure.
 * @param {Array} dataTypesInSource - Types detected with a "false" / object entries.
 * @param {Object} destinationObject - Entry in the value data structure
 * @param {Array} dataTypesInDestination - Types detected with a "false" / object entries.
 * @return {Object} dataTypeMap - all detected data types and their values.
 */
function canSourceConvertToDestination(sourceObject, dataTypesInSource, destinationObject) {
	debugPrint("Trying to determine if source can make destination", "canSourceConvertToDestination");
	// major value attributes
	// newValue.nameOfValue			= data.nameOfValue;
	// newValue.value				= data.value;
	// newValue.description			= data.description;
	// newValue.description.app
	// newValue.description.interpretAs
	// newValue.description.dataTypes
	// newValue.description.dataFormat
	// newValue.subscribers			= [];

	var sourceInfo = {};
	sourceInfo.valueObject = sourceObject;
	sourceInfo.typesDetected = dataTypesInSource;
	sourceInfo.reader = formatReaders[sourceObject.description.dataFormat];
	sourceInfo.available = [];

	var destinationInfo = {};
	destinationInfo.valueObject = destinationObject;
	destinationInfo.reader = formatReaders[destinationObject.description.dataFormat];
	// destinationInfo.required; // will be filled by assignment below

	// get all available types from source
	for (let i = 0; i < dataTypesInSource.length; i++) {
		// add the available information if it was detected.
		if (typeof dataTypesInSource[i] === "object") {
			sourceInfo.available.push(dataTypesInSource[i].dataTypeRegistryName);
		} else if (dataTypesInSource[i] !== "false") {
			console.log("Error:canSourceConvertToDestination> unknown description given:" + dataTypesInSource[i]);
		}
	}

	// get all required destination types
	destinationInfo.required = getRequiredDataTypes(destinationObject);

	// check if all required types are in source.
	for (let i = 0; i < destinationInfo.required.length; i++) {
		if (!sourceInfo.available.includes(destinationInfo.required[i])) {
			console.log("The data type " + destinationInfo.required[i] + " is not available in the source");
			return false;
		}
	}

	return true;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * Perform conversion between formats, maintain set status.
 * For each element in the souce, make a destination object out of it.
 *
 * @method convertFormatSetToSet
 * @param {Object} sourceObject - Entry in the value data structure.
 * @param {Array} dataTypesInSource - Types detected with a "false" / object entries.
 * @param {Object} destinationObject - Entry in the value data structure
 * @param {Array} dataTypesInDestination - Types detected with a "false" / object entries.
 * @return {Object} dataTypeMap - all detected data types and their values.
 */
function convertFormatSetToSet(sourceObject, dataTypesInSource, destinationObject, dataTypesInDestination) {
	// major value attributes
	// newValue.nameOfValue			= data.nameOfValue;
	// newValue.value				= data.value;
	// newValue.description			= data.description;
	// newValue.description.app
	// newValue.description.interpretAs
	// newValue.description.dataTypes
	// newValue.description.dataFormat
	// newValue.subscribers			= [];

	debugPrint("Activating convertFormatSetToSet", "convertFormatSetToSet");

	// this activating means conversion was possible source is a superset of destination.

	// get all required datatypes of destination
	var destFormat = formatReaders[destinationObject.description.dataFormat];
	var destRequiredVars = getRequiredDataTypes(destinationObject); // names of datatypes
	//
	var sourceFormat = formatReaders[sourceObject.description.dataFormat];

	var valuesForDest = [];

	var sourceValues;
	var currentSourceElement;
	var valuesToMakeDestinationElementOutOf;
	var createdDestinationElement;
	if (!Array.isArray(sourceObject.value)) {
		sourceValues = [sourceObject.value]; // set to set is fine, should be
	} else {
		sourceValues = sourceObject.value;
	}

	debugPrint("  Beginning individual element conversion", "convertFormatSetToSet");
	// for each element in the source values
	for (let e = 0; e < sourceValues.length; e++) {
		currentSourceElement = sourceValues[e];
		// get from that element each of the required values, put into the valuesToMakeDestinationElementOutOf map
		valuesToMakeDestinationElementOutOf = {};
		for (let r = 0; r < destRequiredVars.length; r++) {
			// fetch the value from the structure
			valuesToMakeDestinationElementOutOf[destRequiredVars[r]] =
				// function(dataTypeNameToFind, element, descriptionArray, regArr, regMap)
				sourceFormat.getFromElement(
					destRequiredVars[r],
					currentSourceElement,
					dataTypesInSource,
					dataTypeRegistry, dataTypeRegistryMap
				);
		}
		// after getting all required values create an element from it
		createdDestinationElement = destFormat.makeElementFromValues(valuesToMakeDestinationElementOutOf);
		valuesForDest.push(createdDestinationElement);
	}
	return valuesForDest;
}

/**
 * Perform conversion between formats, maintain it as a range.
 * For each element in the souce, make a destination object out of it.
 *
 * @method convertFormatRangeToRange
 * @param {Object} sourceObject - Entry in the value data structure.
 * @param {Array} dataTypesInSource - Types detected with a "false" / object entries.
 * @param {Object} destinationObject - Entry in the value data structure
 * @param {Array} dataTypesInDestination - Types detected with a "false" / object entries.
 * @return {Object} dataTypeMap - all detected data types and their values.
 */
function convertFormatRangeToRange(sourceObject, dataTypesInSource, destinationObject, dataTypesInDestination) {
	// major value attributes
	// newValue.nameOfValue			= data.nameOfValue;
	// newValue.value				= data.value;
	// newValue.description			= data.description;
	// newValue.description.app
	// newValue.description.interpretAs
	// newValue.description.dataTypes
	// newValue.description.dataFormat
	// newValue.subscribers			= [];

	debugPrint("Activating convertFormatRangeToRange", "convertFormatRangeToRange");

	// this activating means conversion was possible source is a superset of destination.

	// get all required datatypes of destination
	var destFormat = formatReaders[destinationObject.description.dataFormat];
	var destRequiredVars = getRequiredDataTypes(destinationObject); // returns dataTypeRegistryName (string) array
	//
	var sourceFormat = formatReaders[sourceObject.description.dataFormat];

	var valuesForDest;

	var sourceValues;
	var sourceValuesThatWillDetermineRange = [];
	var currentSourceElement;
	if (!Array.isArray(sourceObject.value)) {
		sourceValues = [sourceObject.value]; // set to set is fine, should be
	} else {
		sourceValues = sourceObject.value;
	}

	// for each element in the source values, get required values out of source.
	for (let e = 0; e < sourceValues.length; e++) {
		currentSourceElement = sourceValues[e];
		// push an object for each element that will be a map
		sourceValuesThatWillDetermineRange.push({});
		for (let r = 0; r < destRequiredVars.length; r++) {
			// fetch the value from the structure
			// its an array, put on the element, a map entry for the required data type
			sourceValuesThatWillDetermineRange[e][destRequiredVars[r]] =
				// function(dataTypeNameToFind, element, descriptionArray, regArr, regMap)
				sourceFormat.getFromElement(
					destRequiredVars[r],
					currentSourceElement,
					dataTypesInSource,
					dataTypeRegistry, dataTypeRegistryMap
				);
		}
	}

	debugPrint("  Collected datatypes in source", "convertFormatRangeToRange");
	// now sourceValuesThatWillDetermineRange is an array with object for each element containing its detected data type value
	var valueSmallLarge = {};
	var registryEntry;
	// go through each of the required datatypes and set their values.
	for (let i = 0; i < destRequiredVars.length; i++) {
		debugPrint("    Attempting to get small large of " + destRequiredVars[i], "convertFormatRangeToRange");
		registryEntry = dataTypeRegistryMap[destRequiredVars[i]];
		valueSmallLarge[destRequiredVars[i]] = registryEntry.getRangeInformation(sourceValuesThatWillDetermineRange);
	}

	// with the smallest and largest of values, create two elements of destination formatReaders
	valuesForDest = destFormat.generateRangeValuesFromData(valueSmallLarge);

	return valuesForDest;
}

/**
 * Perform conversion, same format, Set to range.
 *
 * @method convertKeepFormatSetToRange
 * @param {Object} sourceObject - Entry in the value data structure.
 * @param {Array} dataTypesInSource - Types detected with a "false" / object entries.
 * @param {Object} destinationObject - Entry in the value data structure
 * @param {Array} dataTypesInDestination - Types detected with a "false" / object entries.
 * @return {Object} dataTypeMap - all detected data types and their values.
 */
function convertKeepFormatSetToRange(sourceObject, dataTypesInSource, destinationObject, dataTypesInDestination) {
	debugPrint("Currently convertKeepFormatSetToRange uses same logic as convertFormatRangeToRange",
		"convertKeepFormatSetToRange");
	return convertFormatRangeToRange(
		sourceObject, dataTypesInSource,
		destinationObject, dataTypesInDestination);
}

/**
 * Perform conversion, same format, range to set.
 * Range values should be given as part of parameters.
 * Will have to be based on original set of elements for trim down. Way to avoid this?
 *
 * @method convertFormatRangeToSet
 * @param {Object} sourceObject - Entry in the value data structure.
 * @param {Array} dataTypesInSource - Types detected with a "false" / object entries.
 * @param {Object} destinationObject - Entry in the value data structure
 * @param {Array} dataTypesInDestination - Types detected with a "false" / object entries.
 * @param {Array} destinationOriginalDatasetSourceValueObject - Entry for destination's original data set to reduce.
 * @return {Object} dataTypeMap - all detected data types and their values.
 */
function convertFormatRangeToSet(sourceObject, dataTypesInSource,
	destinationObject, dataTypesInDestination, destinationOriginalDatasetSourceValueObject) {
	debugPrint("Triggered convertFormatRangeToSet", "convertFormatRangeToSet");

	// data types in destination relate to what was found in the original data source elements
	if (!dataTypesInDestination) {
		// no "original" data means the range cannot be used to reduce/restrict the destination elements shown
		debugPrint("  No value in dataTypesInDestination, unable to apply range restriction", "convertFormatRangeToSet");
		return false;
	}

	var sourceFormat = formatReaders[sourceObject.description.dataFormat];
	var destinationFormat = formatReaders[destinationObject.description.dataFormat];
	var sourceValuesThatWillDetermineRange = [];
	var currentSourceElement, currentDestinationElement;
	var sourceValues = sourceObject.value;
	// these destination values will be reduce later
	var destinationValuesToGetCulled = destinationOriginalDatasetSourceValueObject.value;
	if (!Array.isArray(destinationValuesToGetCulled)) {
		destinationValuesToGetCulled = [destinationValuesToGetCulled];
	}

	debugPrint("  collecting data for each element", "convertFormatRangeToSet");
	if (debug.convertFormatRangeToSet) {
		var listOfDtS = [];
		for (let i = 0; i < dataTypesInSource.length; i++) {
			listOfDtS.push(dataTypesInSource[i].dataTypeRegistryName);
		}
		debugPrint("    source contains:" + listOfDtS, "convertFormatRangeToSet");
		var listOfDtD = [];
		for (let i = 0; i < dataTypesInDestination.length; i++) {
			listOfDtD.push(dataTypesInDestination[i].dataTypeRegistryName);
		}
		debugPrint("    dest contains:" + listOfDtD, "convertFormatRangeToSet");
	}

	// using the data types in source, get each element's value and find small large
	// for each element in the source values, get required values out of source.
	for (let e = 0; e < sourceValues.length; e++) {
		currentSourceElement = sourceValues[e];
		// push an object for each element that will be a map
		sourceValuesThatWillDetermineRange.push({});

		// for each of the data types in source
		for (let r = 0; r < dataTypesInSource.length; r++) {
			// if it was not found, it cannot be extracted
			if (dataTypesInSource[r] === "false") {
				continue; // source did not have this particular data type, move to next
			}
			// if it is not in destination, it cannot be used to reduce destination
			if (dataTypesInDestination[r] === "false") {
				continue;
			}

			// NOTE: the dataTypesInSource is ["false", or {dataTypeRegistryName, path, value, ...}]

			// fetch the value from the structure
			// its an array, put on the element, a map entry for the required data type
			sourceValuesThatWillDetermineRange[e][dataTypesInSource[r].dataTypeRegistryName] =
				// function(dataTypeNameToFind, element, descriptionArray, regArr, regMap)
				sourceFormat.getFromElement(
					dataTypesInSource[r].dataTypeRegistryName,
					currentSourceElement,
					dataTypesInSource, // not sure if necessary
					dataTypeRegistry, dataTypeRegistryMap // mainly map is used...
				);
		}
	}

	// should now be an array of two elements with properties equal to found data types
	// get the small large values.
	var dataTypesToUseForRange = Object.keys(sourceValuesThatWillDetermineRange[0]);
	debugPrint("  Collected data in source on each object value:" + dataTypesToUseForRange, "convertFormatRangeToSet");
	// now sourceValuesThatWillDetermineRange is an array with object for each element containing its detected data type value
	var valueSmallLarge = {};
	var registryEntry;
	// go through each of the source data types to get small large values.
	for (let i = 0; i < dataTypesToUseForRange.length; i++) {
		debugPrint("    Attempting to get small large of " + dataTypesToUseForRange[i], "convertFormatRangeToSet");
		registryEntry = dataTypeRegistryMap[dataTypesToUseForRange[i]];
		valueSmallLarge[dataTypesToUseForRange[i]] = registryEntry.getRangeInformation(sourceValuesThatWillDetermineRange);
	}

	debugPrint("  Starting review of destination original element to see if they fit in range", "convertFormatRangeToSet");
	// keysOfSmallLarge will contain names of type found in source and destination
	var keysOfSmallLarge = Object.keys(valueSmallLarge);
	var destElementValue, withinRange;
	var valuesForDest = [];
	// using the data types in source, get each element's value and find small large
	// for each element in original destination

	debugDir(dataTypesInDestination, "convertFormatRangeToSet");

	for (let e = 0; e < destinationValuesToGetCulled.length; e++) {
		currentDestinationElement = destinationValuesToGetCulled[e];
		withinRange = true;
		// go through each of the data types in small large, it should only contain what was in source and destination
		for (let smKeyIndex = 0; smKeyIndex < keysOfSmallLarge.length; smKeyIndex++) {
			// get the value of the destination element for this data type
			// destElementValue will be a container for the data type

			destElementValue = destinationFormat.getFromElement(
				keysOfSmallLarge[smKeyIndex],
				currentDestinationElement,
				dataTypesInDestination, // not sure if necessary
				dataTypeRegistry, dataTypeRegistryMap // mainly map is used...
			);
			// need the registry entry to perform comparison
			registryEntry = dataTypeRegistryMap[keysOfSmallLarge[smKeyIndex]];

			// if destElementValue smaller than allowed, don't pass.
			if (registryEntry.compareTwoForOrder(valueSmallLarge[keysOfSmallLarge[smKeyIndex]][0], destElementValue) > 0) {
				// compareTwoForOrder returns -1 if 1st element is smaller, 1 if larger
				withinRange = false;
				break;
			} // if destElementValue bigger than allowed, dont' pass
			if (registryEntry.compareTwoForOrder(valueSmallLarge[keysOfSmallLarge[smKeyIndex]][1], destElementValue) < 0) {
				withinRange = false;
				break;
			}
		}
		if (withinRange) {
			valuesForDest.push(currentDestinationElement);
		}
	}
	debugPrint("  Element survival:" + valuesForDest.length + " / "
		+ destinationValuesToGetCulled.length, "convertFormatRangeToSet");
	return valuesForDest;
}


// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------------------




function getDataTypeEntryGivenName(nameOfDataType, getIndexInstead = false) {
	for (let i = 0; i < dataTypeRegistry.length; i++) {
		if (dataTypeRegistry[i].dataTypeRegistryName === nameOfDataType) {
			if (getIndexInstead) {
				return i;
			}
			return dataTypeRegistry[i];
		}
	}
	console.log("Error>DTR>unknown data type name given:" + nameOfDataType);
	return null;
}

function getDataTypeIndexGivenName(nameOfDataType) {
	var retval = getDataTypeEntryGivenName(nameOfDataType, "getIndexInstead");
	if (retval === null) {
		return -1;
	}
	return retval;
}

// functions
module.exports.loadDataTypes = loadDataTypes;
module.exports.getDataTypeInformation = getDataTypeInformation;
module.exports.findDataTypesInValue = findDataTypesInValue;
module.exports.canSourceConvertToDestination = canSourceConvertToDestination;
module.exports.convertKeepFormatSetToRange = convertKeepFormatSetToRange;
module.exports.convertFormatSetToSet = convertFormatSetToSet;
module.exports.convertFormatRangeToRange = convertFormatRangeToRange;
module.exports.convertFormatRangeToSet = convertFormatRangeToSet;

// retrieval
module.exports.getDataTypeEntryGivenName = getDataTypeEntryGivenName;
module.exports.getDataTypeIndexGivenName = getDataTypeIndexGivenName;

// variables
module.exports.dataTypeRegistry = dataTypeRegistry;
module.exports.dataTypeRegistryMap = dataTypeRegistryMap;
module.exports.formatReaders = formatReaders;

