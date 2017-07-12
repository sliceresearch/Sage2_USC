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


/**
 * Adds this reader to the registry.
 * 
 * The s2Date format is a json object that looks like the following:
 * {
 *   year: int,
 *   month: int,
 *   day: int,
 * }
 * 
 * @method addReader
 * @param {Object} registryReaders - Object to put the reader onto.
 */
function addReader(registryReaders) {
	registryReaders.s2Date = {

		// this particular format only contains the following data types.
		availableDataTypes: [
			"dataTypeDate"
		],
		requiredDataTypes: [
			"dataTypeDate"
		],

		debug: {
			any: true,
			recursion: true,
			foundDt: true
		},

		debugPrint: function(line, type = "any") {
			if (this.debug[type]) {
				console.log("dbug>reader>s2Date>" + line);
			}
		},

		debugDir: function(obj, type = "any") {
			if (this.debug[type]) {
				console.dir(obj);
			}
		},

// ---------------------------------------------------------------------------------------------------------------------------------------------------

		/**
		 * Create two object showing lower and upper bound ranges.
		 * It will be given an object that has properties named dataTypeRegistryName.
		 * In that value will have an array of two values.
		 * 
		 *
		 * @method generateRangeValuesFromData
		 * @param {Object} smallLargeInfo - Objects containing information about the smallest and largest.
		 * @return {Object} dataTypeContainer - A filled out data type container for the requested type.
		 */
		generateRangeValuesFromData: function(smallLargeInfo) {
			//geo location needs gps.

			var smallValuesFound = smallLargeInfo.dataTypeDate[0].getValue(); // 0 should be small
			var largeValuesFound = smallLargeInfo.dataTypeDate[1].getValue(); //
			var small = {
				year: smallValuesFound.year,
				month: smallValuesFound.month,
				day: smallValuesFound.day
			};
			var large = {
				year: largeValuesFound.year,
				month: largeValuesFound.month,
				day: largeValuesFound.day
			}

			if (!small.year || !small.month || !small.day
				|| !large.year || !large.month  || !large.day) {
				console.log("Error>s2Date>generateRangeValuesFromData received an incomplete object");
				console.dir(small);
				console.dir(large);
				console.dir(smallLargeInfo);
			}

			return [small, large];
		},

		/**
		 * Will attempt to extract datatype information to make an element.
		 *
		 * @method makeElementFromValues
		 * @param {Object} valueMap - all values needed to make one of this. Object with mapped data type containers.
		 * @return {Object} element - A filled out element.
		 */
		makeElementFromValues: function(valueMap) {
			// check all required values exist:
			if (!valueMap.dataTypeDate) {
				console.log("Unable to create s2Date from given values");
				console.dir(valueMap);
			}
			// get the sage converted structure
			var sageConvertedValue = valueMap.dataTypeDate.getValue();
			// create element to pass back
			var element = {
				year: sageConvertedValue.year,
				month: sageConvertedValue.month,
				day: sageConvertedValue.day
			}
			return element;
		},



// ---------------------------------------------------------------------------------------------------------------------------------------------------

		/**
		 * Will attempt to extract datatype information from a specific element.
		 *
		 * @method getFromElement
		 * @param {String} dataTypeNameToFind - Which registered datatype to get from element.
		 * @param {String} element - Json object to search for values within.
		 * @param {Array} descriptionArray - The results from getDataTypesFromValue.
		 * @param {Array} registryArray - Data type registry array.
		 * @param {Object} registryMap - Data type registry map.
		 * @return {Object} dataTypeContainer - A filled out data type container for the requested type.
		 */
		getFromElement: function(dataTypeNameToFind, element, descriptionArray, registryArray, registryMap) {
			// make sure the requested type exists
			if (!registryMap[dataTypeNameToFind]) {
				console.log("ERROR: dataTypeNameToFind " + dataTypeNameToFind + " isn't registered unable to extract from element");
			}

			// create vars ahead of time.
			var dataTypeContainer;
			var registryEntry;

			// this format can only give back 
			if (!this.availableDataTypes.includes(dataTypeNameToFind)) {
				console.log("ERROR>s2Date> doesn't contain " + dataTypeNameToFind);
			} else {
				registryEntry = registryMap[dataTypeNameToFind];
				dataTypeContainer = registryEntry.createContainer();
			}

			// some hard coding since there are really only three data types
			if (dataTypeNameToFind === "dataTypeDate") {
				// its still recursive. is there a point?
				dataTypeContainer.year = +element.year;
				dataTypeContainer.month = +element.month;
				dataTypeContainer.day = +element.day;
				dataTypeContainer.value = dataTypeContainer.year * 10000
					+ dataTypeContainer.month * 100
					+ dataTypeContainer.day;
			} else {
				console.log("ERROR: s2Date doesn't contain " + dataTypeNameToFind);
				return false;
			}

			return dataTypeContainer;
		},
// ---------------------------------------------------------------------------------------------------------------------------------------------------

		/**
		 * Given a value, will try to find the datatypesin them.
		 * Needs to have correct descriptors.
		 *
		 * @method getDataTypesFromValue
		 * @param {Object} valueObject - Search this for datatypes, major attributes below.
		 * @param {Object} valueObject.value - What to search.
		 * @param {Object} valueObject.description.interpretAs - .
		 * @param {Object} valueObject.description.dataTypes - .
		 * @param {Object} valueObject.description.dataFormat - .
		 * @param {Object} registryArray - array of datatypes.
		 * @param {Object} registryMap - datatypes in map.
		 * @return {Object} dataTypeMap - all detected datatypes and their values.
		 */
		getDataTypesFromValue: function(valueObject, registryArray, registryMap) {
			// element 1, most things are expected to be in array
			var element1;
			if (Array.isArray(valueObject.value)) {
				element1 = valueObject.value[0];
			} else {
				element1 = valueObject; // the descriptor was s2Date, so this better be a s2Date object.
			}
			if (typeof element1 !== "object") {
				console.log();
				console.log();
				console.log();
				console.log();
				console.log("Specified format was s2Date, but did not get object");
				console.dir(valueObject);
			}
			// map will be returned, then need to know what goes in it
			var registryStatus = Array(registryArray.length).fill("false"); // this will change to an object path?
			// var hasGoneThroughKey = [];

			// for each of the data types search for them in the element's structure
			var indexOfDate = -1;
			for (let i = 0; i < registryStatus.length; i++) {
				if (registryArray[i].dataTypeRegistryName === "dataTypeDate") {
					indexOfDate = i;
				}
			}
			if (indexOfDate === -1) {
				console.log("Error: s2Date needs an datatype that isn't registered");
				console.log("indexOfDate:" + (indexOfDate === -1 ? "unavailable" : "Found"));
			} else {
				registryStatus[indexOfDate] = registryArray[indexOfDate].createContainer();
				// honestly, this is just used for the path information
				// the reason it was present in json was to ensure all values could be filled out ot validate data type exists.
				// probably the values aren't needed. (year month day value)
				registryStatus[indexOfDate].year = element1.year;
				registryStatus[indexOfDate].month = element1.month;
				registryStatus[indexOfDate].day = element1.day;
				registryStatus[indexOfDate].value = element1.year * 10000 + element1.month * 100 + element1.day;
				registryStatus[indexOfDate].pathToGetData = [""]; // top level of element
			}
			return registryStatus;
		},
	};
}

module.exports.addReader = addReader;
