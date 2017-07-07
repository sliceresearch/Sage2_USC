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
 * The s2GeoLocation format is a json object that looks like the following:
 * {
 *   lat: float,
 *   lng: float
 * }
 * 
 * @method addReader
 * @param {Object} registryReaders - Object to put the reader onto.
 */
function addReader(registryReaders) {
	registryReaders.s2GeoLocation = {

		// this particular format only contains the following data types.
		availableDataTypes: [
			"dataTypeGps",
			"dataTypeLatitude",
			"dataTypeLongitude"
		],
		requiredDataTypes: [
			"dataTypeGps"
		],

// ---------------------------------------------------------------------------------------------------------------------------------------------------

		/**
		 * Create two object showing lower and upper bound ranges.
		 *
		 * @method generateRangeValuesFromData
		 * @param {Object} smallLargeInfo - Objects containing information about the smallest and largest.
		 * @return {Object} dataTypeContainer - A filled out data type container for the requested type.
		 */
		generateRangeValuesFromData: function(smallLargeInfo) {
			//geo location needs gps.

			var small = {
				lat: smallLargeInfo.dataTypeGps.smallestLatitude,
				lng: smallLargeInfo.dataTypeGps.smallestLongitude
			};

			var large = {
				lat: smallLargeInfo.dataTypeGps.largestLatitude,
				lng: smallLargeInfo.dataTypeGps.largestLongitude
			}

			if (!small.lat || !small.lng || !large.lat || !large.lng) {
				console.log("Error generateRangeValuesFromData received an incomplete object");
				console.dir(small);
				console.dir(large);
				console.dir(smallLargeInfo);
			}

			return [small, large];
		},

		/**
		 * Will attempt to extract datatype information from a specific element.
		 *
		 * @method makeElementFromValues
		 * @param {Object} valueMap - all values needed to make one of this.
		 * @return {Object} dataTypeContainer - A filled out data type container for the requested type.
		 */
		makeElementFromValues: function(valueMap) {
			// check all required values exist:
			if (!valueMap.dataTypeGps) {
				console.log("Unable to create s2GeoLocation from given values");
				console.dir(valueMap);
			}
			// get the sage converted structure
			var sageConvertedGpsValue = valueMap.dataTypeGps.getValue();
			// create element to pass back
			var element = {
				lat: sageConvertedGpsValue.latitude,
				lng: sageConvertedGpsValue.longitude
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
				console.log("ERROR: s2GeoLocation doesn't contain " + dataTypeNameToFind);
			} else {
				registryEntry = registryMap[dataTypeNameToFind];
				dataTypeContainer = registryEntry.createContainer();
			}

			// some hard coding since there are really only three data types
			if (dataTypeNameToFind === "dataTypeGps") {
				// its still recursive. is there a point?
				dataTypeContainer.dataTypeLatitude = this.getFromElement("dataTypeLatitude", element, descriptionArray, registryArray, registryMap);
				dataTypeContainer.dataTypeLongitude = this.getFromElement("dataTypeLongitude", element, descriptionArray, registryArray, registryMap);
			} else if (dataTypeNameToFind === "dataTypeLatitude") {
				dataTypeContainer.value = +element.lat;
			} else if (dataTypeNameToFind === "dataTypeLongitude") {
				dataTypeContainer.value = +element.lng;
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
				element1 = valueObject; // the descriptor was s2GeoLocation, so this better be a s2GeoLocation object.
			}
			if (typeof element1 !== "object") {
				throw new "Specified format was s2GeoLocation, but did not get a s2GeoLocation object";
			}
			// map will be returned, then need to know what goes in it
			var registryStatus = Array(registryArray.length).fill("unchecked"); // this will change to an object path?
			// var hasGoneThroughKey = [];

			// for each of the data types search for them in the element's structure
			var indexOfGps = -1;
			var indexOfLatitude = -1;
			var indexOfLongitude = -1;
			for (let i = 0; i < registryStatus.length; i++) {
				if (registryArray[i].dataTypeRegistryName === "dataTypeGps") {
					indexOfGps = i;
				} else if (registryArray[i].dataTypeRegistryName === "dataTypeLatitude") {
					registryStatus[i] = registryArray[i].createContainer();
					registryStatus[i].value = element1.lat;
					if (registryStatus[i].value)
					registryStatus[i].path = ["lat"];
					indexOfLatitude = i;
				} else if (registryArray[i].dataTypeRegistryName === "dataTypeLongitude") {
					registryStatus[i] = registryArray[i].createContainer();
					registryStatus[i].value = element1.lat;
					registryStatus[i].path = ["lng"];
					indexOfLongitude = i;
				}
			}
			if (indexOfGps === -1 || indexOfLatitude === -1 || indexOfLongitude === -1) {
				console.log("Error: s2GeoLocation needs an datatype that isn't registered");
				console.log("dataTypeGps:" + (indexOfGps === -1 ? "unavailable" : "Found"));
				console.log("dataTypeLatitude:" + (indexOfLatitude === -1 ? "unavailable" : "Found"));
				console.log("dataTypeLongitude:" + (indexOfLongitude === -1 ? "unavailable" : "Found"));
			} else {
				registryStatus[indexOfGps] = registryArray[indexOfGps].createContainer();
				registryStatus[indexOfGps].dataTypeLatitude = registryStatus[indexOfLatitude];
				registryStatus[indexOfGps].dataTypeLongitude = registryStatus[indexOfLongitude];
			}
			return registryStatus;
		},
	};
}

module.exports.addReader = addReader;
