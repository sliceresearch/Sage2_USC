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
		debug: true,
		dataTypeRegistryName: "dataTypeDate",
		description: "Contains Year Month Day information",
		names: ["date"],
		type: "object",
		properties: {value: "string", year: "number", month: "number", day: "number"},
		subTypes: [],
		required: ["value", "year", "month", "day"], // everything?
		stringFormat: "alwaysTrue",
		stringParser: function(containerToFill, stringToParse) {
			// ISO 8601 - https://en.wikipedia.org/wiki/ISO_8601 contains information on string notation.
			// TODO - use moment.js for conversion. It allows submission of parse format.
			var couldParse = true;
			var problems = "";
			if (stringToParse.includes("!")) {
				// this is currently how the YMD is separated. YYYY!MM!DD
				var parts = stringToParse.split("!");
				if (parts.length >= 3) {
					containerToFill.year = +parts[0];
					containerToFill.month = +parts[1];
					containerToFill.day = +parts[2];
					containerToFill.value = containerToFill.year * 10000 + containerToFill.month * 100 + containerToFill.day;
				} else {
					couldParse = false;
					problems += "Not enough parts to parse:" + stringToParse;
				}
				if (parts.length > 3) {
					problems += "Too many parts:" + parts + ". Had to discard from " + parts[3];
				}
			} else {
				couldParse = false;
				problems += "Unable to parse string because no handler for it yet:" + stringToParse + ".";
			}
			
			if (this.debug && problems.length > 0) {
				console.log("ERROR>dataTypeDate>" + problems);
			}
			return couldParse;
		},
		makeIntoString: function() {
			var retval = "" + this.year + " " + this.month + " " + this.day; // spaces or no spaces?
			return retval;
		},
		getValue: function() {
			var retval = {
				value: this.value,
				year: this.year,
				month: this.month,
				day: this.day
			}
			return retval;
		},
		// returns -1 if a has lower value, 1 if a has larger value, 0 if equal
		compareTwoForOrder: function (a, b) {
			var aVal = a.getValue();
			var bVal = b.getValue();
			var problems = "";
			var aNumber = aVal.year * 10000 + aVal.month * 100 + aVal.day; // eg: y2017,m07,d10 -> 20170710
			var bNumber = bVal.year * 10000 + bVal.month * 100 + bVal.day;

			if (aNumber < bNumber) {
				return -1;
			}
			if (aNumber > bNumber) {
				return 1;
			}
			return 0;
		},
		getRangeInformation: function(arrayOfThisDataType, treatAsElementArrayWithDataTypes = true) {
			// probably possible to cut down on code with compareTwoForOrder
			var trackSL = {
				smallEntry: null,
				largeEntry: null
			};
			for (let i = 0; i < arrayOfThisDataType.length; i++) {
				if (i === 0) {
					if (treatAsElementArrayWithDataTypes) {
						trackSL.smallEntry = arrayOfThisDataType[i][this.dataTypeRegistryName];
						trackSL.largeEntry = arrayOfThisDataType[i][this.dataTypeRegistryName];
					} else {
						trackSL.smallEntry = arrayOfThisDataType[i];
						trackSL.largeEntry = arrayOfThisDataType[i];
					}
				} else {
					if (treatAsElementArrayWithDataTypes) {
						// see if smaller
						if (this.compareTwoForOrder(
							arrayOfThisDataType[i][this.dataTypeRegistryName], trackSL.smallEntry) === -1) {
							trackSL.smallEntry = arrayOfThisDataType[i][this.dataTypeRegistryName];
						}
						// see if larger
						if (this.compareTwoForOrder(
							arrayOfThisDataType[i][this.dataTypeRegistryName], trackSL.largeEntry) === 1) {
							trackSL.largeEntry = arrayOfThisDataType[i][this.dataTypeRegistryName];
						}
					} else {
						// see if smaller
						if (this.compareTwoForOrder(arrayOfThisDataType[i], trackSL.smallEntry) === -1) {
							trackSL.smallEntry = arrayOfThisDataType[i];
						}
						// see if larger
						if (this.compareTwoForOrder(arrayOfThisDataType[i], trackSL.largeEntry) === 1) {
							trackSL.largeEntry = arrayOfThisDataType[i];
						}
					}
				}
			}
			// shallow copy the containers
			var smallest = Object.assign({}, trackSL.smallEntry); // should preserve value and function ref.
			var largest = Object.assign({}, trackSL.largeEntry);
			return [smallest, largest];
		},
		createContainer: function() {
			return {
				dataTypeRegistryName: this.dataTypeRegistryName,
				makeIntoString: this.makeIntoString,
				getValue: this.getValue,
				value: null,
				year: null,
				month: null,
				day: null
			}; // latitues should only have one value
		},
	};
}

module.exports.getDescription = getDescription;
