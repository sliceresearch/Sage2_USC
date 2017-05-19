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

var SAGE2CsdAppExtend = {

	/**
	* After apps are initialized, they will have additional csdFunctions added.
	* Done this way to try keep things clearly separated.
	*
	* @method addCsdFunctions
	* @param app {Object} app which called this function
	* @param data {Object} data passed as init params
	*/
	addCsdFunctions: function(app, data) {
		app.childrenAppIds = [];
		app.parentOfThisApp = null;

		/**
		* Given the name of the variable, will ask server for the variable.
		* The given callback will be activated with that variable's value.
		* Current setup will not activate callback if there is no variable.
		*
		* @method csdGetValue
		* @param nameOfValue {String} app which called this function
		* @param callback {String} app which called this function. Could be a function and will convert to string.
		*/
		app.csdGetValue = function(nameOfValue, callback) {
			if (isMaster) {
				var callbackName = SAGE2CsdAppExtend.getCallbackName(callback);
				if (callbackName === undefined) {
					throw "Missing callback for csdGetValue";
				}
				wsio.emit("csdMessage", {
					type: "getValue",
					nameOfValue: nameOfValue,
					app: this.id,
					func: callbackName
				});
			}
		};

		/**
		* Given the name of the variable, set value of variable on server.
		*
		* @method csdSetValue
		* @param nameOfValue {String} app which called this function
		* @param value {Object} the value to store for this variable
		* @param description {Object} description object
		*/
		app.csdSetValue = function(nameOfValue, value, description) {
			if (isMaster) {
				wsio.emit("csdMessage", {
					type: "setValue",
					nameOfValue: nameOfValue,
					value: value,
					description: description
				});
			}
		};

		/**
		* Given the name of the variable, will ask server to send value each time it is assigned.
		* Notifications will be sent to callback.
		*
		* @method csdSubscribeToValue
		* @param nameOfValue {String} app which called this function
		* @param callback {String} app which called this function. Could be a function and will convert to string.
		* @param unsubscribe {Boolean} optional. If true, will stop receiving updates for that variable.
		*/
		app.csdSubscribeToValue = function(nameOfValue, callback, unsubscribe) {
			if (isMaster) {
				var callbackName = SAGE2CsdAppExtend.getCallbackName(callback);
				if (callbackName === undefined) {
					throw "Missing callback for csdSubscribeToValue";
				}
				unsubscribe = unsubscribe ? unsubscribe : false; // if there is a value for unsubscribe, keep otherwise false
				wsio.emit("csdMessage", {
					type: "subscribeToValue",
					nameOfValue: nameOfValue,
					app: this.id,
					func: callbackName,
					unsubscribe: unsubscribe
				});
			}
		};

		/**
		* Asks server for notifications of any new variables that are added to server.
		*
		* @method csdSubscribeToNewValueNotification
		* @param callback {String} app which called this function. Could be a function and will convert to string.
		* @param unsubscribe {Boolean} optional. If true, will stop receiving notificaitons.
		*/
		app.csdSubscribeToNewValueNotification = function(callback, unsubscribe) {
			if (isMaster) {
				var callbackName = SAGE2CsdAppExtend.getCallbackName(callback);
				if (callbackName === undefined) {
					throw "Missing callback for csdSubscribeToNewValueNotification";
				}
				unsubscribe = unsubscribe ? unsubscribe : false; // if there is a value for unsubscribe, keep otherwise false
				wsio.emit("csdMessage", {
					type: "subscribeToNewValueNotification",
					app: this.id,
					func: callbackName,
					unsubscribe: unsubscribe
				});
			}
		};

		/**
		* Asks server for all variable names and their descriptions. Goes to callback.
		*
		* @method csdGetAllTrackedDescriptions
		* @param callback {String} app which called this function. Could be a function and will convert to string.
		* @param unsubscribe {Boolean} optional. If true, will stop receiving updates for that variable.
		*/
		app.csdGetAllTrackedDescriptions = function(callback) {
			if (isMaster) {
				var callbackName = SAGE2CsdAppExtend.getCallbackName(callback);
				if (callbackName === undefined) {
					throw "Missing callback for csdGetAllTrackedDescriptions";
				}
				wsio.emit("csdMessage", {
					type: "getAllTrackedDescriptions",
					app: this.id,
					func: callbackName
				});
			}
		};

		/**
		* Asks server to launch app with values. On the server this will add additional associations like which app launched which.
		* Part of the launch process will include calling back to this app and stating the id of the newly launched app.
		*
		* @method csdLaunchAppWithValues
		* @param appName {String} name of app to launch. Has to correctly match.
		* @param params {Object} optional. What to pass the launched app. Appears within init() as csdInitValues.
		* @param funcToPassParams {String} optional. app which called this function. Could be a function and will convert to string.
		* @param x {Integer} optional. X coordinate to start the app at.
		* @param y {Integer} optional. Y coordinate to start the app at.
		*/
		app.csdLaunchAppWithValues = function(appName, params, funcToPassParams, x, y) {
			if (isMaster) {
				var callbackName = SAGE2CsdAppExtend.getCallbackName(funcToPassParams);
				wsio.emit("csdMessage", {
					type: "launchAppWithValues",
					appName: appName,
					app: this.id,
					func: callbackName,
					params: params,
					xLaunch: x,
					yLaunch: y
				});
			}
		};

		/**
		* Sends data to children.
		*
		* @method csdSendDataToChildren
		* @param func {String} name of function to activate. Has to correctly match
		* @param data {Object} data to send. doens't have to be an object.
		*/
		app.csdSendDataToChildren = function(func, data) {
			for (let i = 0; i < this.childrenAppIds.length; i++) {
				if (applications[this.childrenAppIds[i]]) {
					applications[this.childrenAppIds[i]][func](data);
				}
			}
		};

		/**
		* Asks server to launch app with values. On the server this will add additional associations like which app launched which.
		* Part of the launch process will include calling back to this app and stating the id of the newly launched app.
		*
		* @method csdListOfAppsLaunched
		* @param appName {String} name of app to launch. Has to correctly match.
		*/
		app.csdAddToAppsLaunchedList = function(appId) {
			this.childrenAppIds.push(appId);
		};
		// handle initvalues
		if (data.csdInitValues) {
			if (data.csdInitValues.parent != null) {
				app.parentOfThisApp = data.csdInitValues.parent;
			}
			// if the function call should be made, do so on the next frame because app needs to fully initialize first.
			if (data.csdInitValues.csdFunctionCallback) {
				window.requestAnimationFrame(function() {
					app[data.csdInitValues.csdFunctionCallback](data.csdInitValues);
				});
			}
		}
	},

	/**
	 * Uses WebSocket to send a request to the server get value of a variable stored on server.
	 *
	 * @method     csdGetValue
	 * @param      {String}  filename		The name for the file being saved
	 * @param      {String}  ext			The file's extension
	 */
	getCallbackName: function(callback) {
		var callbackName = undefined;
		// is callback a string?
		if (callback === undefined) {
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
