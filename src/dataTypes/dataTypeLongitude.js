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
 * @method getDescription
 * @return {Object} describing this datatype
 */
function getDescription() {
	return {
		dataTypeRegistryName: "dataTypeLongitude",
		description: "Longitude value of a gps coordinate",
		names: ["longitude", "lng"],
		type: "number",
		properties: {value: "number"},
		subTypes: [],
		required: ["value"],
		stringFormat: "alwaysTrue",
		stringParser: function(containerToFill, stringToParse) {
			if (isNaN(+stringToParse)) {
				return false;
			}
			containerToFill.value = +stringToParse;
			return true;
		},
		makeIntoString: function() {
			return this.value;
		},
		getValue: function() {
			return this.value;
		},
		// returns -1 if a has lower value, 1 if a has larger value, 0 if equal
		compareTwoForOrder: function (a, b) {
			var aVal = a.getValue();
			var bVal = b.getValue();
			if (aVal < bVal) {
				return -1;
			}
			if (aVal > bVal) {
				return 1;
			}
			return 0;
		},
		getRangeInformation: function(arrayOfThisDataType, treatAsElementArrayWithDataTypes = true) {
			var retval = {
				smallestValue: null,
				smallestIndex: null,
				largestValue: null,
				largestIndex: null
			}
			for (let i = 0; i < arrayOfThisDataType.length; i++) {
				if (i === 0) {
					if (treatAsElementArrayWithDataTypes) {
						retval.smallestValue = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue();
						retval.smallestIndex = i;
						retval.largestValue = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue();
						retval.largestIndex = i;
					} else {
						retval.smallestValue = arrayOfThisDataType[i].getValue();
						retval.smallestIndex = i;
						retval.largestValue = arrayOfThisDataType[i].getValue();
						retval.largestIndex = i;
					}
				} else {
					if (treatAsElementArrayWithDataTypes) {
						// see if smaller
						if (arrayOfThisDataType[i][this.dataTypeRegistryName].getValue() < retval.smallestValue) {
							retval.smallestIndex = i;
							retval.smallestValue = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue();
						}
						// see if larger
						if (arrayOfThisDataType[i][this.dataTypeRegistryName].getValue() > retval.largestValue) {
							retval.largestIndex = i;
							retval.largestValue = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue();
						}
					} else {
						// see if smaller
						if (arrayOfThisDataType[i].getValue() < retval.smallestValue) {
							retval.smallestIndex = i;
							retval.smallestValue = arrayOfThisDataType[i].getValue();
						}
						// see if larger
						if (arrayOfThisDataType[i].getValue() > retval.largestValue) {
							retval.largestIndex = i;
							retval.largestValue = arrayOfThisDataType[i].getValue();
						}
					}
				}
			}
			return retval;
		},
		createContainer: function() {
			return {
				dataTypeRegistryName: "dataTypeLongitude",
				value: null,
				makeIntoString: this.makeIntoString,
				getValue: this.getValue
			}; // latitues should only have one value
		},
	};
}

module.exports.getDescription = getDescription;
