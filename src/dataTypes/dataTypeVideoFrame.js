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
		dataTypeRegistryName: "dataTypeVideoFrame",
		description: "Video frame of a movie",
		names: ["frame"],
		type: "object",
		properties: {value: "number", maxFrame: "number", fps: "number"},
		subTypes: [],
		required: ["value"], // maxFrame, fps is not required
		stringFormat: "alwaysTrue",
		stringParser: function(containerToFill, stringToParse) {
			var parts = stringToParse.split("/");
			var problem = null;
			var couldGetFrame = true;
			if (parts.length == 1) {
				if (isNaN(+parts[0])) {
					couldGetFrame = false;
				} else {
					containerToFill.value = +parts[0];
				}
			}
			if (parts.length == 2) {
				if (isNaN(+parts[1])) {
					problem = "Unknown part after '/':" + parts[1];
				} else {
					containerToFill.maxFrame = +parts[1]
				}
			}
			if (this.debug && problem) {
				console.log("erase me, frame string parse problem:" + stringToParse);
			}
			return couldGetFrame;
		},
		makeIntoString: function() {
			var retval = this.value;
			if (this.maxFrame) {
				retval += "/" + this.maxFrame;
			}
			return retval;
		},
		getValue: function() {
			var retval = {
				value: this.value,
				fps: this.fps,
				maxFrame: this.maxFrame,
				modifiedValue: null
			}
			if (retval.value) {
				retval.modifiedValue = retval.value;
				if (retval.fps) {
					retval.modifiedValue /= retval.fps;
				}
				if (retval.maxFrame) {
					retval.modifiedValue /= retval.maxFrame;
				}
			}
			return retval;
		},
		// returns -1 if a has lower value, 1 if a has larger value, 0 if equal
		compareTwoForOrder: function (a, b) {
			var aVal = a.getValue();
			var bVal = b.getValue();
			var problems = "";

			// report problems if fps was not in both
			if (((aVal.fps)?true:false) !== ((bVal.fps)?true:false)) {
				problems += "Only one value had fps: a("
					+ ((aVal.fps)?true:false) + ") b(" + ((bVal.fps)?true:false) + ")";
			}
			// if maxFrame was not in both
			if (((aVal.maxFrame)?true:false) !== ((bVal.maxFrame)?true:false)) {
				problems += "Only one value had maxFrame: a("
					+ ((aVal.maxFrame)?true:false) + ") b(" + ((bVal.maxFrame)?true:false) + ")";
			}
			if (this.debug) {
				console.log("Debug>dtVideoFrame>" + problems);
			}
			if (aVal.modifiedValue < bVal.modifiedValue) {
				return -1;
			}
			if (aVal.modifiedValue > bVal.modifiedValue) {
				return 1;
			}
			return 0;
		},
		getRangeInformation: function(arrayOfThisDataType, treatAsElementArrayWithDataTypes = true) {
			// probably possible to cut down on code with compareTwoForOrder
			var retval = {
				smallestValue: null,
				largestValue: null
			}
			for (let i = 0; i < arrayOfThisDataType.length; i++) {
				if (i === 0) {
					if (treatAsElementArrayWithDataTypes) {
						retval.smallestValue = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue();
						retval.largestValue = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue();
					} else {
						retval.smallestValue = arrayOfThisDataType[i].getValue();
						retval.largestValue = arrayOfThisDataType[i].getValue();
					}
				} else {
					if (treatAsElementArrayWithDataTypes) {
						// see if smaller
						if (arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().modifiedValue
							< retval.smallestValue.modifiedValue) {
							retval.smallestValue = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue();
						}
						// see if larger
						if (arrayOfThisDataType[i][this.dataTypeRegistryName].getValue().modifiedValue
							> retval.largestValue.modifiedValue) {
							retval.largestValue = arrayOfThisDataType[i][this.dataTypeRegistryName].getValue();
						}
					} else {
						// see if smaller
						if (arrayOfThisDataType[i].getValue().modifiedValue < retval.smallestValue.modifiedValue) {
							retval.smallestValue = arrayOfThisDataType[i].getValue();
						}
						// see if larger
						if (arrayOfThisDataType[i].getValue().modifiedValue > retval.largestValue.modifiedValue) {
							retval.largestValue = arrayOfThisDataType[i].getValue();
						}
					}
				}
			}
			// returns a smallest and largest object returned by getValue()
			// shallow copy the values.
			var smallest = this.createContainer();
			smallest.value = retval.smallestValue.value;
			smallest.maxFrame = retval.smallestValue.maxFrame;
			smallest.fps = retval.smallestValue.fps;
			var largest = this.createContainer();
			largest.value = retval.largestValue.value;
			largest.maxFrame = retval.largestValue.maxFrame;
			largest.fps = retval.largestValue.fps;
			// return
			return [smallest, largest];
		},
		createContainer: function() {
			return {
				dataTypeRegistryName: this.dataTypeRegistryName,
				value: null,
				maxFrame: null,
				fps: null,
				makeIntoString: this.makeIntoString,
				getValue: this.getValue
			}; // latitues should only have one value
		},
	};
}

module.exports.getDescription = getDescription;
