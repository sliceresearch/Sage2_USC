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
 * Returns description for the data type registry.
 *
 * @method getDescription
 * @return {Object} describing this datatype
 */
function getDescription() {
	return {
		dataTypeRegistryName: "dataTypeGps",
		description: "A location in the word based on global positioning system",
		names: ["gps", "coordinate", "coordinates", "position", "location"],
		type: "object",
		properties: {
			dataTypeLatitude: { subType: true },
			dataTypeLongitude: { subType: true }, // more?
		},
		subTypes: ["dataTypeLatitude", "dataTypeLongitude"], // more?
		required: ["dataTypeLatitude", "dataTypeLongitude"],
		// legacy?
		stringFormat: "alwaysTrue",
		stringParser: function(containerToFill, stringToParse) {
			var pieces;
			// if this is a comma separation lat, lng
			if (stringToParse.includes(",")) {
				pieces = stringToParse.split(",");
				if (pieces.length === 2) {
					// create containers
					containerToFill.dataTypeLatitude = this.refToRegistryMap.dataTypeLatitude.createContainer();
					containerToFill.dataTypeLongitude = this.refToRegistryMap.dataTypeLatitude.createContainer();
					// fill values
					this.refToRegistryMap.dataTypeLatitude.stringParser(containerToFill.dataTypeLatitude, pieces[0]);
					this.refToRegistryMap.dataTypeLongitude.stringParser(containerToFill.dataTypeLongitude, pieces[1]);
					if (containerToFill.dataTypeLatitude.value === null || containerToFill.dataTypeLatitude.value === null) {
						return false;
					}
				} else {
					return false; // unable to parse
				}
			} // there might be other ways to parse the data, for example "lat: 123, lng:123"
			return true;
		},
		// odd name to avoid overriding default object toString()
		makeIntoString: function() {
			return this.dataTypeLatitude.makeIntoString() + ", " + this.dataTypeLatitude.makeIntoString();
		},
		getValue: function() {
			return {latitude: this.dataTypeLatitude.getValue(), longitude: this.dataTypeLongitude.getValue()};
		},
		// returns -1 if a has lower... value
		compareTwoForOrder: function (a, b) {
			// this process is currently skewed. currently, a is less than b only if both values are less
			// coordinate comparison doesn't really work.
			var aVal = a.getValue();
			var bVal = b.getValue();
			var retval;
			if (aVal.latitude < bVal.latitude && aVal.longitude < bVal.longitude) {
				retval =  -1;
			} else if (aVal.latitude > bVal.latitude && aVal.longitude > bVal.longitude) {
				retval =  1;
			} else {
				retval =  0;
			}
			return retval;
		},
		getRangeInformation: function(arrayOfThisDataType, treatAsElementArrayWithDataTypes = true) {
			var retval = {
				smallestLatitude: null,
				smallestLongitude: null,
				largestLatitude: null,
				largestLongitude: null,
			}
			for (let i = 0; i < arrayOfThisDataType.length; i++) {
				if (i === 0) {
					if (treatAsElementArrayWithDataTypes) {
						retval.smallestLatitude = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().latitude;
						retval.smallestLongitude = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().longitude;
						retval.largestLatitude = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().latitude;
						retval.largestLongitude = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().longitude;
					} else {
						console.log("improper usage of getRangeInformation caused by false on treatAsElementArrayWithDataTypes");
					}
				} else {
					if (treatAsElementArrayWithDataTypes) {
						// see if smaller lat, else larger
						if (arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().latitude < retval.smallestLatitude) {
							retval.smallestLatitude = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().latitude
						} else if (arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().latitude > retval.largestLatitude) {
							retval.largestLatitude = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().latitude
						}
						// see if smaller lng, else larger
						if (arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().longitude < retval.smallestLongitude) {
							retval.smallestLongitude = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().longitude
						} else if (arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().longitude > retval.largestLongitude) {
							retval.largestLongitude = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().longitude
						}
					} else {
						console.log("improper usage of getRangeInformation caused by false on treatAsElementArrayWithDataTypes");
					}
				}
			}
			// This should return an array of two objects, the first is the smallest, value, second is the largest value.
			console.log("erase me, this might error");
			var smallest = this.createContainer();
			smallest.dataTypeLatitude = this.refToRegistryMap.dataTypeLatitude.createContainer();
			smallest.dataTypeLatitude.value = retval.smallestLatitude;
			smallest.dataTypeLongitude = this.refToRegistryMap.dataTypeLongitude.createContainer();
			smallest.dataTypeLongitude.value = retval.smallestLongitude;
			var largest = this.createContainer();
			largest.dataTypeLatitude = this.refToRegistryMap.dataTypeLatitude.createContainer();
			largest.dataTypeLatitude.value = retval.largestLatitude;
			largest.dataTypeLongitude = this.refToRegistryMap.dataTypeLongitude.createContainer();
			largest.dataTypeLongitude.value = retval.largestLongitude;

			return [smallest, largest];
		},
		createContainer: function() {
			return {
				dataTypeRegistryName: "dataTypeGps",
				dataTypeLatitude: null,
				dataTypeLongitude: null,
				makeIntoString: this.makeIntoString,
				getValue: this.getValue
			};
		},
	};
}

module.exports.getDescription = getDescription;
