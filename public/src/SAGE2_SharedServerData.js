// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015-2016

// Create a global that will act as a namespace

var SAGE2SharedServerData = {

	/**
	* After apps are initialized, they will have additional serverDataFunctions added.
	* Done this way to try keep things clearly separated.
	*
	* Note for later: is this good enough or should this file extend the SAGE2_App?
	* Some of the code here looks at the init values. Maybe polyfill approach?
	*    if (!SAGE2_App.prototype.functionName)
	*
	* @method addServerDataFunctions
	* @param {Object} app - app which called this function
	* @param {Object} data - data passed as init params
	*/
	addSharedServerDataFunctions: function(app, data) {
		app.childrenAppIds = [];
		app.parentIdOfThisApp = null;
		app.dataSourcesBeingBroadcast = [];
		app.dataDestinationsBeingBroadcast = [];

		// check for customLaunchParams and optionally a function to activate on next frame
		if (data.customLaunchParams) {
			if (data.customLaunchParams.parent) {
				app.parentIdOfThisApp = data.customLaunchParams.parent;
			}
			// if the function call should be made, do so on the next frame because app needs to fully initialize first.
			if (data.customLaunchParams.functionToCallAfterInit) {
				window.requestAnimationFrame(function() {
					app[data.customLaunchParams.functionToCallAfterInit](data.customLaunchParams);
				});
			}
		}
	},

	/**
	* Asks server to launch app with values. On the server this will add additional associations like which app launched which.
	* Part of the launch process will include calling back to this app and stating the id of the newly launched app.
	*
	* @method launchAppWithValues
	* @param {String} appName - name of app to launch. Has to correctly match.
	* @param {Object} paramObj - optional. What to pass the launched app. Appears within init() as serverDataInitValues.
	* @param {Integer|undefined|null} x - optional. X coordinate to start the app at.
	* @param {Integer|undefined|null} y -optional. Y coordinate to start the app at.
	* @param {String|undefined|null} funcToPassParams - optional. app which called this function. Could be a function and will convert to string.
	*/
	launchAppWithValues: function(appName, paramObj, x, y, funcToPassParams) {
		if (isMaster) {
			var callbackName = SAGE2SharedServerData.getCallbackName(funcToPassParams);
			wsio.emit("launchAppWithValues", {
				appName: appName,
				app: this.id,
				func: callbackName,
				customLaunchParams: paramObj,
				xLaunch: x,
				yLaunch: y
			});
		}
	},

	/**
	* Sends data to any apps that this one launched. This doesn't go through server.
	*
	* @method sendDataToChildrenApps
	* @param {String} func - name of function to activate. Has to correctly match
	* @param {Object} data - data to send. doens't have to be an object.
	*/
	sendDataToChildrenApps: function(func, data) {
		for (let i = 0; i < this.childrenAppIds.length; i++) {
			if (applications[this.childrenAppIds[i]]) {
				applications[this.childrenAppIds[i]][func](data);
			}
		}
	},

	/**
	* Sends data to app that launched this one if possible. This doesn't go through server.
	*
	* @method sendDataToParentApp
	* @param {String} func - name of function to activate. Has to correctly match.
	* @param {Object} data - data to send. doens't have to be an object.
	*/
	sendDataToParentApp: function(func, data) {
		if (this.parentIdOfThisApp) {
			applications[this.parentIdOfThisApp][func](data);
		}
	},

	/**
	* Asks server to launch app with values. On the server this will add additional associations like which app launched which.
	* Part of the launch process will include calling back to this app and stating the id of the newly launched app.
	*
	* @method addToAppsLaunchedList
	* @param {String} data - name of app to launch. Has to correctly match.
	*/
	addToAppsLaunchedList: function(appId) {
		this.childrenAppIds.push(appId);
	},

	// -------------------------------------------------------------------------------------------------------------------------------------------------
	// -------------------------------------------------------------------------------------------------------------------------------------------------

	/**
	* This is used to send data to a specific SAGE2 client. Usually UI clients.
	*
	* @method sendDataToClient
	* @param {String} clientDest - Which client to send the data.
	* @param {String} func - What function to call on the client.
	* @param {Object} paramObj - Object to give the function as parameter. This will have clientDest, func, and appId added.
	*/
	sendDataToClient: function(clientDest, func, paramObj) {
		if (isMaster) {
			paramObj.clientDest = clientDest;
			paramObj.func = func;
			paramObj.appId = this.id;
			wsio.emit("sendDataToClient", paramObj);
		}
	},

	// -------------------------------------------------------------------------------------------------------------------------------------------------
	// -------------------------------------------------------------------------------------------------------------------------------------------------

	/**
	* Given the name of the variable, will ask server for the variable.
	* The given callback will be activated with that variable's value.
	* Current setup will not activate callback if there is no variable.
	*
	* @method serverDataGetValue
	* @param {String} nameOfValue - which value to get
	* @param {String} callback - function on app to give value. Could be a function ref and will convert to string.
	*/
	serverDataGetValue: function(nameOfValue, callback) {
		if (isMaster) {
			var callbackName = SAGE2SharedServerData.getCallbackName(callback);
			if (callbackName === undefined) {
				throw "Missing callback for serverDataGetValue";
			}
			wsio.emit("serverDataGetValue", {
				nameOfValue: nameOfValue,
				app: this.id,
				func: callbackName
			});
		}
	},

	/**
	* Given the name of the variable, set value of variable on server.
	* Will create if doesn't exist.
	*
	* @method serverDataSetValue
	* @param {String} nameOfValue - name of value on server to set
	* @param {Object} value - the value to store for this variable
	* @param {Object} description - description object
	* @param {Boolean} shouldRemoveValueFromServerWhenAppCloses - Optional. If true, app quit will remove value from server.
	*/
	serverDataSetValue: function(nameOfValue, value, description, shouldRemoveValueFromServerWhenAppCloses = false) {
		if (isMaster) {
			wsio.emit("serverDataSetValue", {
				nameOfValue: nameOfValue,
				value: value,
				description: description
			});
			if (shouldRemoveValueFromServerWhenAppCloses
				&& !this.dataSourcesBeingBroadcast.includes(nameOfValue)) {
				this.dataSourcesBeingBroadcast.push(nameOfValue);
			}
		}
	},

	/**
	* Helper function, given the variable name suffix, set value of variable on server.
	* Checks in place to ensure value exists.
	*
	* @method serverDataSetSourceValue
	* @param {String} nameSuffix - name of value on server to set
	* @param {Object} value - the value to store for this variable
	* @param {Object} description - description object
	* @param {Boolean} shouldRemoveValueFromServerWhenAppCloses - Optional. If true, app quit will remove value from server.
	*/
	serverDataSetSourceValue: function(nameSuffix, value) {
		if (isMaster) {
			var nameOfValue = this.id + ":source:" + nameSuffix;
			if (!this.dataSourcesBeingBroadcast.includes(nameOfValue)) {
				throw "Cannot update source value that hasn't been created yet:" + nameOfValue;
			}
			wsio.emit("serverDataSetValue", {
				nameOfValue: nameOfValue,
				value: value
			});
		}
	},

	/**
	* Helper function to tell server about a source. This will add additional markers to the variable.
	* Name will be of format:
	*	app_id:source:givenName
	*
	* @method serverDataBroadcastSource
	* @param {String} nameSuffix - name suffix
	* @param {Object} value - the value to store for this variable
	* @param {Object} description - description object
	*/
	serverDataBroadcastSource: function(nameSuffix, value, description) {
		if (isMaster) {
			var nameOfValue = this.id + ":source:" + nameSuffix;
			this.serverDataSetValue(nameOfValue, value, description, true);
			if (!this.dataSourcesBeingBroadcast.includes(nameOfValue)) {
				this.dataSourcesBeingBroadcast.push(nameOfValue);
			}
		}
	},

	/**
	* Helper function to tell server about a destination. This will add additional markers to the variable.
	* In addition to creating the variable on the server, will also subscribe to the variable.
	* Name will be of format:
	*	app_id:destination:givenName
	*
	* @method serverDataBroadcastDestination
	* @param {String} nameSuffix - name suffix
	* @param {Object} value - the initial value. Probably is blank.
	* @param {Object} description - description object
	* @param {String} callback - what function will handle values given to the source
	*/
	serverDataBroadcastDestination: function(nameSuffix, value, description, callback) {
		if (isMaster) {
			var nameOfValue = this.id + ":destination:" + nameSuffix;
			// serverDataSubscribeToValue: function(nameOfValue, callback, unsubscribe = false)
			var callbackName = SAGE2SharedServerData.getCallbackName(callback);
			this.serverDataSetValue(nameOfValue, value, description, true); // set value first, then subscribe
			this.serverDataSubscribeToValue(nameOfValue, callbackName);
			if (!this.dataDestinationsBeingBroadcast.includes(nameOfValue)) {
				this.dataDestinationsBeingBroadcast.push(nameOfValue);
			}
		}
	},

	// -------------------------------------------------------------------------------------------------------------------------------------------------
	// -------------------------------------------------------------------------------------------------------------------------------------------------

	/**
	* Given the name of the variable, will ask server to send value each time it is assigned.
	* Notifications will be sent to callback.
	*
	* @method serverDataSubscribeToValue
	* @param {String} nameOfValue - app which called this function
	* @param {String} callback - app which called this function. Could be a function and will convert to string.
	* @param {Boolean} unsubscribe - optional. If true, will stop receiving updates for that variable.
	*/
	serverDataSubscribeToValue: function(nameOfValue, callback, unsubscribe = false) {
		if (isMaster) {
			var callbackName = SAGE2SharedServerData.getCallbackName(callback);
			if (callbackName === undefined) {
				throw "Missing callback for serverDataSubscribeToValue";
			}
			wsio.emit("serverDataSubscribeToValue", {
				nameOfValue: nameOfValue,
				app: this.id,
				func: callbackName,
				unsubscribe: unsubscribe
			});
		}
	},

	/**
	* Asks server for notifications of any new variables that are added to server.
	*
	* @method serverDataSubscribeToNewValueNotification
	* @param {String} callback - app which called this function. Could be a function and will convert to string.
	* @param {Boolean} unsubscribe - optional. If true, will stop receiving notificaitons.
	*/
	serverDataSubscribeToNewValueNotification: function(callback, unsubscribe) {
		if (isMaster) {
			var callbackName = SAGE2SharedServerData.getCallbackName(callback);
			if (callbackName === undefined) {
				throw "Missing callback for serverDataSubscribeToNewValueNotification";
			}
			unsubscribe = unsubscribe ? unsubscribe : false; // if there is a value for unsubscribe, keep otherwise false
			wsio.emit("serverDataSubscribeToNewValueNotification", {
				app: this.id,
				func: callbackName,
				unsubscribe: unsubscribe
			});
		}
	},

	/**
	* Asks server for all variable names and their descriptions. Goes to callback.
	*
	* @method serverDataGetAllTrackedDescriptions
	* @param {String} callback - app which called this function. Could be a function and will convert to string.
	* @param {Boolean} unsubscribe - optional. If true, will stop receiving updates for that variable.
	*/
	serverDataGetAllTrackedDescriptions: function(callback) {
		if (isMaster) {
			var callbackName = SAGE2SharedServerData.getCallbackName(callback);
			if (callbackName === undefined) {
				throw "Missing callback for serverDataGetAllTrackedDescriptions";
			}
			wsio.emit("serverDataGetAllTrackedDescriptions", {
				app: this.id,
				func: callbackName
			});
		}
	},

	// -------------------------------------------------------------------------------------------------------------------------------------------------
	// -------------------------------------------------------------------------------------------------------------------------------------------------

	/**
	* Given the name of the variable, remove variable from server.
	* Expectation is this is not called by user (but the option is there) instead as part of cleanup on quit().
	* Sends an array of strings, which this function is just the specified value.
	*
	* @method serverDataRemoveValue
	* @param {String | Array} namesOfValuesToRemove - Can give a single name as string, or an array of string to remove.
	*/
	serverDataRemoveValue: function(namesOfValuesToRemove) {
		if (isMaster) {
			if (!Array.isArray(namesOfValuesToRemove)) {
				namesOfValuesToRemove = [namesOfValuesToRemove];
			}
			wsio.emit("serverDataRemoveValue", { namesOfValuesToRemove: namesOfValuesToRemove });
		}
	},

	/**
	* Will remove all values given to server.
	* Expectation is this is not called by user (but the option is there) instead as part of cleanup on quit().
	*
	* @method serverDataRemoveAllValuesGivenToServer
	*/
	serverDataRemoveAllValuesGivenToServer: function() {
		if (isMaster) {
			var namesOfValuesToRemove = [];
			for (let i = 0; i < this.dataSourcesBeingBroadcast.length; i++) {
				namesOfValuesToRemove.push(this.dataSourcesBeingBroadcast[i]);
			}
			for (let i = 0; i < this.dataDestinationsBeingBroadcast.length; i++) {
				namesOfValuesToRemove.push(this.dataDestinationsBeingBroadcast[i]);
			}
			wsio.emit("serverDataRemoveValue", { namesOfValuesToRemove: namesOfValuesToRemove });
		}
	},

	// -------------------------------------------------------------------------------------------------------------------------------------------------
	// -------------------------------------------------------------------------------------------------------------------------------------------------

	/**
	 * Uses WebSocket to send a request to the server get value of a variable stored on server.
	 *
	 * @method getCallbackName
	 * @param {String} filename - The name for the file being saved
	 * @param {String} ext - The file's extension
	 */
	getCallbackName: function(callback) {
		var callbackName = undefined;
		// is callback a string?
		if (callback === undefined || callback === null) {
			return undefined;
		} else if (typeof(callback) == "string") {
			callbackName = callback;
		} else if (callback.name !== undefined && callback.name !== null) {
			callbackName = callback.name;
		} else {
			var keys = Object.keys(this); // all properties of this app
			for (let i = 0; i < keys.length; i++) {
				if (this[i] === callback) {
					callbackName = i;
					break;
				}
			}
		}
		return callbackName;
	},

	// -------------------------------------------------------------------------------------------------------------------------------------------------
	// -------------------------------------------------------------------------------------------------------------------------------------------------

	/**
	* Adds the shared data functionality to the SAGE2_App class.
	* Here instead of the SAGE2_App file for easy removal / grouping of functionality.
	*
	* @method addToAppClass
	*/
	addToAppClass: function() {
		if (!SAGE2_App) { // add if exists, otherwise wait for next frame
			window.requestAnimationFrame(SAGE2SharedServerData.addToAppClass);
			return;
		}
		SAGE2_App.prototype.launchAppWithValues = SAGE2SharedServerData.launchAppWithValues;
		SAGE2_App.prototype.sendDataToChildrenApps = SAGE2SharedServerData.sendDataToChildrenApps;
		SAGE2_App.prototype.sendDataToParentApp = SAGE2SharedServerData.sendDataToParentApp;
		SAGE2_App.prototype.addToAppsLaunchedList = SAGE2SharedServerData.addToAppsLaunchedList;
		// app to client
		SAGE2_App.prototype.sendDataToClient = SAGE2SharedServerData.sendDataToClient;
		// section shared data related
		SAGE2_App.prototype.serverDataGetValue = SAGE2SharedServerData.serverDataGetValue;
		SAGE2_App.prototype.serverDataSetValue = SAGE2SharedServerData.serverDataSetValue;
		SAGE2_App.prototype.serverDataSetSourceValue = SAGE2SharedServerData.serverDataSetSourceValue;
		SAGE2_App.prototype.serverDataBroadcastSource = SAGE2SharedServerData.serverDataBroadcastSource;
		SAGE2_App.prototype.serverDataBroadcastDestination = SAGE2SharedServerData.serverDataBroadcastDestination;
		// subscription
		SAGE2_App.prototype.serverDataSubscribeToValue = SAGE2SharedServerData.serverDataSubscribeToValue;
		SAGE2_App.prototype.serverDataSubscribeToNewValueNotification =
			SAGE2SharedServerData.serverDataSubscribeToNewValueNotification;
		SAGE2_App.prototype.serverDataGetAllTrackedDescriptions = SAGE2SharedServerData.serverDataGetAllTrackedDescriptions;
		// cleanup
		SAGE2_App.prototype.serverDataRemoveValue = SAGE2SharedServerData.serverDataRemoveValue;
		SAGE2_App.prototype.serverDataRemoveAllValuesGivenToServer =
			SAGE2SharedServerData.serverDataRemoveAllValuesGivenToServer;
	}

};

// add functions to app prototype
SAGE2SharedServerData.addToAppClass();
