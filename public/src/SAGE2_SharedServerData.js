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
	* @method addServerDataFunctions
	* @param app {Object} app which called this function
	* @param data {Object} data passed as init params
	*/
	addSharedServerDataFunctions: function(app, data) {
		app.childrenAppIds = [];
		app.parentIdOfThisApp = null;

		app.serverDataGetValue = this.serverDataGetValue;
		app.serverDataSetValue = this.serverDataSetValue;
		app.serverDataSubscribeToValue = this.serverDataSubscribeToValue;
		app.serverDataSubscribeToNewValueNotification = this.serverDataSubscribeToNewValueNotification;
		app.serverDataGetAllTrackedDescriptions = this.serverDataGetAllTrackedDescriptions;
		app.launchAppWithValues = this.launchAppWithValues;
		app.sendDataToChildrenApps = this.sendDataToChildrenApps;
		app.sendDataToParentApp = this.sendDataToParentApp;
		app.addToAppsLaunchedList = this.addToAppsLaunchedList;

		// handle initvalues
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
	* Given the name of the variable, will ask server for the variable.
	* The given callback will be activated with that variable's value.
	* Current setup will not activate callback if there is no variable.
	*
	* @method serverDataGetValue
	* @param nameOfValue {String} app which called this function
	* @param callback {String} app which called this function. Could be a function and will convert to string.
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
	*
	* @method serverDataSetValue
	* @param nameOfValue {String} app which called this function
	* @param value {Object} the value to store for this variable
	* @param description {Object} description object
	*/
	serverDataSetValue: function(nameOfValue, value, description) {
		if (isMaster) {
			wsio.emit("serverDataSetValue", {
				nameOfValue: nameOfValue,
				value: value,
				description: description
			});
		}
	},

	/**
	* Given the name of the variable, will ask server to send value each time it is assigned.
	* Notifications will be sent to callback.
	*
	* @method serverDataSubscribeToValue
	* @param nameOfValue {String} app which called this function
	* @param callback {String} app which called this function. Could be a function and will convert to string.
	* @param unsubscribe {Boolean} optional. If true, will stop receiving updates for that variable.
	*/
	serverDataSubscribeToValue: function(nameOfValue, callback, unsubscribe) {
		if (isMaster) {
			var callbackName = SAGE2SharedServerData.getCallbackName(callback);
			if (callbackName === undefined) {
				throw "Missing callback for serverDataSubscribeToValue";
			}
			unsubscribe = unsubscribe ? unsubscribe : false; // if there is a value for unsubscribe, keep otherwise false
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
	* @param callback {String} app which called this function. Could be a function and will convert to string.
	* @param unsubscribe {Boolean} optional. If true, will stop receiving notificaitons.
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
	* @param callback {String} app which called this function. Could be a function and will convert to string.
	* @param unsubscribe {Boolean} optional. If true, will stop receiving updates for that variable.
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

	/**
	* Asks server to launch app with values. On the server this will add additional associations like which app launched which.
	* Part of the launch process will include calling back to this app and stating the id of the newly launched app.
	*
	* @method launchAppWithValues
	* @param appName {String} name of app to launch. Has to correctly match.
	* @param params {Object} optional. What to pass the launched app. Appears within init() as serverDataInitValues.
	* @param x {Integer|undefined|null} optional. X coordinate to start the app at.
	* @param y {Integer|undefined|null} optional. Y coordinate to start the app at.
	* @param funcToPassParams {String|undefined|null} optional. app which called this function. Could be a function and will convert to string.
	*/
	launchAppWithValues: function(appName, params, x, y, funcToPassParams) {
		if (isMaster) {
			var callbackName = SAGE2SharedServerData.getCallbackName(funcToPassParams);
			wsio.emit("launchAppWithValues", {
				appName: appName,
				app: this.id,
				func: callbackName,
				customLaunchParams: params,
				xLaunch: x,
				yLaunch: y
			});
		}
	},

	/**
	* Sends data to any apps that this one launched. This doesn't go through server.
	*
	* @method sendDataToChildrenApps
	* @param func {String} name of function to activate. Has to correctly match
	* @param data {Object} data to send. doens't have to be an object.
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
	* @param func {String} name of function to activate. Has to correctly match.
	* @param data {Object} data to send. doens't have to be an object.
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
	* @param appName {String} name of app to launch. Has to correctly match.
	*/
	addToAppsLaunchedList: function(appId) {
		this.childrenAppIds.push(appId);
	},

	/**
	 * Uses WebSocket to send a request to the server get value of a variable stored on server.
	 *
	 * @method     getCallbackName
	 * @param      {String}  filename		The name for the file being saved
	 * @param      {String}  ext			The file's extension
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
	}
};
