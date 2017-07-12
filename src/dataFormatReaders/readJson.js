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


var dataTypeRegistry = require('../node-shareddataregistry'); // contains data type information


/**
 * Adds this reader to the registry.
 *
 * @method addReader
 * @param {Object} registryReaders - Object to put the reader onto.
 */
function addReader(registryReaders) {
	registryReaders.json = {

		// basically json is unknown
		availableDataTypes: [],
		requiredDataTypes: [],

		debug: {
			any: true,
			recursion: false,
			foundDt: true
		},

		debugPrint: function(line, type = "any") {
			if (this.debug[type]) {
				console.log("dbug>jsonReader>" + line);
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
		 *
		 * @method generateRangeValuesFromData
		 * @param {Object} smallLargeInfo - Objects containing information about the smallest and largest.
		 * @return {Object} dataTypeContainer - A filled out data type container for the requested type.
		 */
		generateRangeValuesFromData: function(smallLargeInfo) {
			throw "json reader > generateRangeValuesFromData > this wasn't filled out yet because json is too diverse.";
		},

		/**
		 * Will attempt to extract datatype information from a specific element.
		 *
		 * @method makeElementFromValues
		 * @param {Object} valueMap - all values needed to make one of this.
		 * @return {Object} dataTypeContainer - A filled out data type container for the requested type.
		 */
		makeElementFromValues: function(valueMap) {
			throw "json reader > makeElementFromValues > this wasn't filled out yet because json is too diverse.";
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
			this.debugPrint("Trying to get " + dataTypeNameToFind + " from element", "recursion");
			// make sure the requested type exists
			if (!registryMap[dataTypeNameToFind]) {
				console.log("ERROR>readJson>: dataTypeNameToFind " + dataTypeNameToFind + " isn't registered unable to extract from element");
			}
			// create container for the data
			var dataTypeContainer = registryMap[dataTypeNameToFind].createContainer();

			// get index of the data type in the registry
			var descriptionIndex = registryMap[dataTypeNameToFind]; // get data type object
			descriptionIndex = registryArray.indexOf(descriptionIndex); // index
			if (descriptionIndex < 0) {
				console.log("ERROR: dataTypeNameToFind " + dataTypeNameToFind + " wasn't found in the element, not possible to extract");
			}

			// grab the data, which may need recursive traversal.
			this.recursiveDataGrabOnElement(dataTypeContainer, element, descriptionIndex, descriptionArray, registryArray, registryMap);

			return dataTypeContainer;
		},

		/**
		 * Will attempt to extract datatype information from a specific element.
		 *
		 * @method recursiveDataGrabOnElement
		 * @param {Object} dataTypeContainer - Which registered datatype to get from element.
		 * @param {Object} element - Json object to search for values within.
		 * @param {Integer} descriptionIndex - Json object to search for values within.
		 * @param {Array} descriptionArray - Json object to search for values within.
		 * @param {Array} registryArray - Data type registry array.
		 * @param {Object} registryMap - Data type registry map.
		 * @return {Object} dataTypeContainer - A filled out data type container for the requested type.
		 */
		recursiveDataGrabOnElement(dataTypeContainer, element, descriptionIndex, descriptionArray, registryArray, registryMap){
			// get the description entry, search each property if it has a path.
			var descriptionEntry = descriptionArray[descriptionIndex];
			var keysOfDescription = Object.keys(descriptionEntry);

			// for each sub property in the description, if the sub properties were detected separately, then there will be a path
			var subTypeContainer;
			var subTypeIndex;
			for (let i = 0; i < keysOfDescription.length; i++) {
				// if the property is an object and it has a path to get the data, then go find it.
				if (typeof descriptionEntry[keysOfDescription[i]] === "object" && descriptionEntry[keysOfDescription[i]].pathToGetData) {
					// // create a container
					// subTypeContainer = descriptionEntry[keysOfDescription[i]].dataTypeRegistryName; // get name
					// subTypeContainer = registryMap[subTypeContainer]; // gets entry
					// subTypeIndex = registryArray.indexOf(subTypeContainer); // gets index in registry
					// subTypeContainer = subTypeContainer.createContainer(); // finally get container

					// // now perform recursion to fill container using element 
					// this.recursiveDataGrabOnElement(subTypeContainer, element, subTypeIndex, descriptionArray, registryArray, registryMap);
					// // put it in the container
					// dataTypeContainer[keysOfDescription[i]] = subTypeContainer;

					// search for the sub type.
					dataTypeContainer[keysOfDescription[i]] = this.getFromElement(
						descriptionEntry[keysOfDescription[i]].dataTypeRegistryName, element, descriptionArray, registryArray, registryMap);
				}
			}

			// all sub properties should hit this point
			// use the path to get the data
			if (descriptionEntry.pathToGetData) {
				var currentProperty = element;
				var currentPropertyObjectKeys;
				var keysOfDataTypeContainer = Object.keys(dataTypeContainer);
				var registryEntry = registryMap[dataTypeContainer.dataTypeRegistryName];

				// traverse the element
				for (let i = 0; i < descriptionEntry.pathToGetData.length; i++) {
					currentProperty = currentProperty[descriptionEntry.pathToGetData[i]];
				}

				// if the type is an object, need to grab data from attributes (sub types may not have correctly detected)
				if (typeof currentProperty === "object") {
					// get each of the object's keys
					currentPropertyObjectKeys = Object.keys(currentProperty);

					// for object key, see if it is wanted by the datatype
					for (let curPropKeyIndex = 0; curPropKeyIndex < currentPropertyObjectKeys.length; curPropKeyIndex++) {

						// for each data type key
						for (let s = 0; s < keysOfDataTypeContainer.length; s++) {
							// BUT need to match against subtype alternative names
							subTypePossibleNames = keysOfDataTypeContainer[s]; // name of subtype
							subTypePossibleNames = registryMap[subTypePossibleNames]; // subtype object
							// if the subtype exists in the registry
							if (subTypePossibleNames) {
								// then get its possible names
								subTypePossibleNames = subTypePossibleNames.names; // array of possible names.
								// check if the possible names includes the name of the current object key
								if (dataTypeContainer[keysOfDataTypeContainer[s]] === null
								&& subTypePossibleNames.includes(currentPropertyObjectKeys[curPropKeyIndex])){
									// if so, then assign the value
									dataTypeContainer[keysOfDataTypeContainer[s]] = currentProperty[currentPropertyObjectKeys[curPropKeyIndex]];
								}
							} else if (dataTypeContainer[keysOfDataTypeContainer[s]] === null
							&& keysOfDataTypeContainer[s] === currentPropertyObjectKeys[curPropKeyIndex]){
								// if the subtype didn't resolve, it isn't in the registry.
								// do a direct check if the object key is the data type and hasn't already been assigned.
								dataTypeContainer[keysOfDataTypeContainer[s]] = currentProperty[currentPropertyObjectKeys[curPropKeyIndex]];
								// assign the matching key
							}
						}
					}
				} else if (typeof currentProperty === "string") { // should have traveled the path to be at location
					registryEntry.stringParser(dataTypeContainer, currentProperty);
				} else if (typeof currentProperty === "number") {
					if (registryEntry.type === "number") {
						currentDataTypeInfo.value = currentProperty;
					} else if (registryEntry.type === "string") {
						currentDataTypeInfo.value = "" + currentProperty;
					} else if (registryEntry.type === "boolean") {
						currentDataTypeInfo.value = (currentProperty) ? true: false;
					}
				} else if (typeof currentProperty === "boolean") {
					if (registryEntry.type === "number") {
						currentDataTypeInfo.value = (currentProperty) ? 1: 0;
					} else if (registryEntry.type === "string") {
						currentDataTypeInfo.value = "" + currentProperty;
					} else if (registryEntry.type === "boolean") {
						currentDataTypeInfo.value = currentProperty;
					}
				} else { // not sure what to do with it actually, symbols, and functions probably get here.
					console.log("Error: linkerRecursiveCheckOnObjectFor unable to check var type "
					+ (typeof currentProperty));
				}
			}
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
				element1 = valueObject; // the descriptor was json, so this better be a json object.
			}
			if (typeof element1 !== "object") {
				throw new "Specified format was json, but did not get a json object";
			}
			// map will be returned, then need to know what goes in it
			var registryStatus = Array(registryArray.length).fill("unchecked"); // this will change to an object path?
			this.debugPrint("Array of unchecked?", "recursion");
			this.debugDir(registryStatus, "recursion");
			// var hasGoneThroughKey = [];

			// for each of the data types search for them in the element's structure
			for (let i = 0; i < registryStatus.length; i++) {
				if (registryStatus[i] === "unchecked") {
					this.checkForDataType(element1, i, registryStatus, registryArray, registryMap);
				}
			}

			// upon the completion of the loop, registryStatus should be an array "false" or objects corresponding to location in datatype registry
			// each object should have path, which describes how to get to a particular value.
			return registryStatus;
		},

		/**
		 * Json data can be any amount of levels deep. Given the 1st element or the only element of what was submitted.
		 * Figure out if the datatype of the given index is within this.
		 * Start by first searching for sub types.
		 *
		 * @method checkForDataType
		 * @param {Object} structure - Has to be a json object. Otherwise something was declared wrong.
		 * @param {number} index - Search this for datatypes, major attributes below.
		 * @param {Object} statArr - status array. Contains either "unchecked", object of information, or how to get.
		 * @param {Object} regArr - registry array.
		 * @param {Object} regMap - registry map.
		 * @return {Object|boolean} found - If found data, gives the object. Otherwise, false.
		 */
		checkForDataType: function(structure, index, statArr, regArr, regMap) {
			// need a container for the current info.
			var currentDataTypeInfo = regArr[index].createContainer();
			var indexOfSubType;

			// perform all sub type checks first
			this.debugPrint(currentDataTypeInfo.dataTypeRegistryName + " has " +
			regArr[index].subTypes.length + " subTypes", "recursion");
			for (let i = 0; i < regArr[index].subTypes.length; i++) {
				indexOfSubType = regArr[index].subTypes[i]; // get the name of subtype
				indexOfSubType = dataTypeRegistry.getDataTypeIndexGivenName(indexOfSubType);
				this.debugPrint("  " + regArr[index].subTypes[i] + " index in registry: " + indexOfSubType
				+ ", status:" + statArr[indexOfSubType], "recursion");
				
				// It doesn't
				// this.debugPrint("Sanity check, when toString() is removed from entry, does it correctly detect?", "recursion");
				// this.debugPrint("   typeof " + typeof regMap[indexOfSubType], "recursion");
				// this.debugPrint("   exact: " + regMap[indexOfSubType], "recursion");
				// this.debugPrint("   index in regArr: " + regArr.indexOf(regMap[indexOfSubType]), "recursion");
				// this.debugPrint("", "recursion");
				// this.debugPrint("", "recursion");
				// this.debugPrint("", "recursion");

				// if wasn't found (already done if it was the subtype of something else), look for it
				if (statArr[indexOfSubType] === "unchecked") {
					this.debugPrint("Attempting subTypes search for " +
					regArr[indexOfSubType].dataTypeRegistryName, "recursion");
					this.checkForDataType(structure, indexOfSubType, statArr, regArr, regMap);
				}
				// the checkForDataType will either make the status false, or an object.
				if (statArr[indexOfSubType] !== "false") {
					// set the assignment to the object.
					currentDataTypeInfo[regArr[index].subTypes[i]] = statArr[indexOfSubType];
				} else {
					this.debugPrint("    No entry for sub type: " + regArr[index].subTypes[i], "recursion");
				}
			}

			var haveAllProperties = true;
			var dataTypeKeys = Object.keys(currentDataTypeInfo);
			// go through the current data type info, if any pieces are missing need to try search for string conversion
			// base types should have null on value
			for (let i = 0; i < dataTypeKeys.length; i++) {
				if (currentDataTypeInfo[dataTypeKeys[i]] === null) {
					this.debugPrint("Current datatype (" + currentDataTypeInfo.dataTypeRegistryName
					+ ") is missing attribute named: " + dataTypeKeys[i], "recursion");
					haveAllProperties = false;
				}
			}

			// if it doesn't have all properties, traverse object and try to find name match to get value
			if (!haveAllProperties) {
				this.debugPrint("  Will try find in the structure", "recursion");
				this.findThisDataTypeInStructure(structure, currentDataTypeInfo, regArr[index], regMap);
			} else {
					this.debugPrint("Current datatype (" + currentDataTypeInfo.dataTypeRegistryName
					+ ") detected as having all values, no need to search structure", "recursion");
			}
			// go through the current data type info, if any pieces are missing cannot say the data type was found.
			for (let i = 0; i < dataTypeKeys.length; i++) {
				if (currentDataTypeInfo[dataTypeKeys[i]] === null) {
					statArr[index] = "false"; // not found.
					this.debugPrint("    Unable to find " + currentDataTypeInfo.dataTypeRegistryName
					+ " in this data structure", "recursion");
					return false; // did not find this datatype
				}
			}
			// making it here means currentDataTypeInfo is fully filled out
			if(!currentDataTypeInfo.pathToGetData) { // if no path
				let comprisedOfSubtypes = false;
				// then the subtypes should be filled out
				for (let i = 0; i < currentDataTypeInfo.subTypes.length; i++) {
					subTypeIndex = currentDataTypeInfo.subTypes[i]; // name
					subTypeIndex = dataTypeRegistry.getDataTypeIndexGivenName(subTypeIndex); // now index
					if (subTypeIndex !== -1) {
						comprisedOfSubtypes = true;
						break;
					}
				}
				// should not be possible to be filled out, have not path and have no subtypes.
				if (!comprisedOfSubtypes) {
					console.log();
					console.log();
					console.dir(currentDataTypeInfo);
					console.log("Error> somehow currentDataTypeInfo has all properties but no path?");
					console.log();
				}
			}
			statArr[index] = currentDataTypeInfo;
			this.debugPrint("Found " + currentDataTypeInfo.dataTypeRegistryName, "foundDt");
			this.debugPrint("  Path length: " + currentDataTypeInfo.pathToGetData.length, "foundDt");
			this.debugPrint("  Path: " + currentDataTypeInfo.pathToGetData, "foundDt");
			return true; // passing the check means the datatype was found
		},

		/**
		 * Finds "path" of data type if available. This modifies the given currentDataTypeInfo.
		 * 
		 *
		 * @method findThisDataTypeInStructure
		 * @param {Object} structure - Has to be a json object. Otherwise something was declared wrong.
		 * @param {Object} currentDataTypeInfo - container object for the data.
		 * @param {Object} registryEntry - Entry for the datatype in the registry.
		 * @param {Array} trackingHistory - array of where in the structure this has gone to get values.
		 * @return {Array|null} found - If found data, gives the array. Otherwise, null.
		 */
		findThisDataTypeInStructure: function(structure, currentDataTypeInfo, registryEntry, registryMap, pathTracker = false) {
			// first get the keys (names of attributes on object)
			var keysOfStructure = Object.keys(structure);
			var keyValuesOfCurrentDataType = Object.keys(currentDataTypeInfo);
			var nameMatchIndexes = [];
			var currentProperty; // for checking element properties later
			var subTypePossibleNames;
			var currentPropertyObjectKeys;
			// if there is no pathTracker, create it
			if (!pathTracker) {
				pathTracker = [];
			}
			// for each key in the structure, see if a name of the current data type matches
			for (let i = 0; i < keysOfStructure.length; i++) {
				if (registryEntry.names.includes(keysOfStructure[i])) {
					nameMatchIndexes.push(i);
				}
			}
			// warning in case of name collision
			if (nameMatchIndexes.length > 1) {
				let matchedNames = "";
				for (let i = 0; i < nameMatchIndexes.length; i++) {
					matchedNames += registryEntry.names[nameMatchIndexes[i]] + " ";
				}
				console.log("Warning: linkerRecursiveCheckOnObjectFor detects more than one match for datatype "
				+ registryEntry.name[0] + " > " + matchedNames);
			}

			// if this structure contains any matches in the entry
			var foundAllAttributes = false;
			if (nameMatchIndexes.length > 0) {
				// go through each match and see if it is an object.
				for (let i = 0; i < nameMatchIndexes.length; i++) {
					currentProperty = structure[keysOfStructure[nameMatchIndexes[i]]];
					// if the matched property is an object, the properties can be searched for.
					if (typeof currentProperty === "object") {
						// get each of the object's keys
						currentPropertyObjectKeys = Object.keys(currentProperty);

						// for object key, see if it is wanted by the datatype
						for (let curPropKeyIndex = 0; curPropKeyIndex < currentPropertyObjectKeys.length; curPropKeyIndex++) {

							// for each data type key
							for (let s = 0; s < keyValuesOfCurrentDataType.length; s++) {
								// BUT need to match against subtype alternative names
								subTypePossibleNames = keyValuesOfCurrentDataType[s]; // name of potential subtype, could be a value or function name
								subTypePossibleNames = dataTypeRegistry.getDataTypeEntryGivenName(subTypePossibleNames);
								// subTypePossibleNames = registryMap[subTypePossibleNames]; // subtype object
								// if the subtype exists in the registry
								if (subTypePossibleNames) {
									// then get its possible names
									subTypePossibleNames = subTypePossibleNames.names; // array of possible names.
									// check if the possible names includes the name of the current object key
									if (currentDataTypeInfo[keyValuesOfCurrentDataType[s]] === null
									&& subTypePossibleNames.includes(currentPropertyObjectKeys[curPropKeyIndex])){
										// if so, then assign the value
										currentDataTypeInfo[keyValuesOfCurrentDataType[s]] = currentProperty[currentPropertyObjectKeys[curPropKeyIndex]];
									}
								} else if (currentDataTypeInfo[keyValuesOfCurrentDataType[s]] === null
								&& keyValuesOfCurrentDataType[s] === currentPropertyObjectKeys[curPropKeyIndex]){
									// if the subtype didn't resolve, it isn't in the registry.
									// do a direct check if the object key is the data type and hasn't already been assigned.
									currentDataTypeInfo[keyValuesOfCurrentDataType[s]] = currentProperty[currentPropertyObjectKeys[curPropKeyIndex]];
									// assign the matching key
								}
							}
						}
					} else if (typeof currentProperty === "string") {
						// attempt to string convert
						registryEntry.stringParser(currentDataTypeInfo, currentProperty);
					} else if (typeof currentProperty === "number"){
						if (registryEntry.type === "number") {
							currentDataTypeInfo.value = currentProperty;
						} else if (registryEntry.type === "string") {
							currentDataTypeInfo.value = "" + currentProperty;
						} else if (registryEntry.type === "boolean") {
							currentDataTypeInfo.value = (currentProperty) ? true: false;
						}
					} else if (typeof currentProperty === "boolean") {
						if (registryEntry.type === "number") {
							currentDataTypeInfo.value = (currentProperty) ? 1: 0;
						} else if (registryEntry.type === "string") {
							currentDataTypeInfo.value = "" + currentProperty;
						} else if (registryEntry.type === "boolean") {
							currentDataTypeInfo.value = currentProperty;
						}
					} else { // not sure what to do with it actually, symbols, and functions probably get here.
						console.log("Error: linkerRecursiveCheckOnObjectFor unable to check var type "
						+ (typeof currentProperty));
					}
					// if all values have been accounted for, then use this path
					foundAllAttributes = true;
					for (let keyIndex = 0; keyIndex < keyValuesOfCurrentDataType.length; keyIndex++) {
						if (currentDataTypeInfo[keyValuesOfCurrentDataType[keyIndex]] === null) {
							foundAllAttributes = false;
							continue;
						}
					}
					pathTracker.push(keysOfStructure[nameMatchIndexes[i]]);
					break;
				} // end for each match index
			} // end if this structure contains any matches in the entry 
			// if not all attributes were found
			if (!foundAllAttributes) {
				// go through each of the structure keys, and if they are objects, recur on them
				for (let i = 0; i < keysOfStructure.length; i++) {
					currentProperty = structure[keysOfStructure[i]];
					// if the matched property is an object, the properties can be searched for.
					if (typeof currentProperty === "object") {
						// add the path
						pathTracker.push(keysOfStructure[i]);
						// try to find
						if (!this.findThisDataTypeInStructure(currentProperty, currentDataTypeInfo, registryEntry, registryMap, pathTracker)){
							// false means it wasn't in there, remove the entry and let the loop go to the next one
							pathTracker.pop();
						} else {
							foundAllAttributes = true;
							break;
						}
					}
				}
			}
			// if all attributes were found, add the path, return true.
			if (foundAllAttributes) {
				currentDataTypeInfo.pathToGetData = pathTracker;
				return true;
			}
			return false;
		}



	};
}

module.exports.addReader = addReader;
