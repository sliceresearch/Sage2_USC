// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015


// require variables to be declared
"use strict";


/**
 * SharedServerDataManager container object.
 * The dataStructure is:
 * this.dataStructure is an object with:
 *    this.dataStructure.allValues = {};
 *       object to hold all tracked values
 *       example this.dataStructure.allValues['nameOfvalue'] = <entryObject>
 *    this.dataStructure.allNamesOfValues = [];
 *       strings to denote the names used for values
 *       order is based on when it was first set (not alphabetical)
 * The allValues is comprised of entry objects
 * {
 *    name: name of value
 *    value: actual value which could be an object of more values
 *    desc: used for later
 *    subscribers: []
 * }
 * Each entry in subscribers is also an object.
 * Current assumption is that all subscribers are apps on a display, however being wsio based, its more a matter of how
 * the wsio client receives the data and what it does.
 * {
 *    app: identifies the app which is subscribing to the value.
 *    func: name of the function to call in order to pass the information.
 * }
 *
 * @class SharedServerDataManager
 * @constructor
 * @param  {Array} clients - A reference to the client list.
 */
function SharedServerDataManager(clients, broadcast) {
	this.dataStructure = {
		allValues: {},
		allNamesOfValues: [],
		newValueWatchers: []
	};
	this.clients = clients;
	this.broadcast = broadcast;
}

/**
 * Sets the value of specified server data. If it doesn't exist, will create it.
 *
 * @method setValue
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.nameOfValue - Name of value to set.
 * @param  {*} data.value - Value to store.
 * @param  {*} data.description - Currently a string to plain text describe the variable.
 * @param  {*} clients - All connected clients. Needed to send values.
 */
SharedServerDataManager.prototype.setValue = function(wsio, data) {
	// don't do anything if not given nameOfValue
	if (data.nameOfValue === undefined || data.nameOfValue === null || data.value === undefined) {
		return;
	}
	var addedNewValue = false;
	// check if there is no entry for that value
	if (this.dataStructure.allValues["" + data.nameOfValue] === undefined) {
		// need to make an entry for this value
		var newValue = {};
		newValue.nameOfValue        = data.nameOfValue;
		newValue.value              = data.value;
		newValue.description		= data.description;
		newValue.subscribers		= [];
		// placeholder for subscription ahead of time
		if (data.subscribePlaceholder) {
			// this should be the only way a value is undefined
			newValue.value = undefined;
		}
		// add it and update tracking vars.
		this.dataStructure.allValues["" + data.nameOfValue] = newValue;
		this.dataStructure.allNamesOfValues.push("" + data.nameOfValue);
		addedNewValue = true;
	} else {
		// undefined should only possible through subscription placeholder
		if (undefined === this.dataStructure.allValues[ "" + data.nameOfValue ].value) {
			addedNewValue = true;
		}
		// value exists, just update it.
		this.dataStructure.allValues["" + data.nameOfValue].value = data.value;
		// potentially the new value isn't the same and a description can be useful
		if (data.description) {
			this.dataStructure.allValues["" + data.nameOfValue].description = data.description;
		}
	}
	var dataForApp = {};
	// this data piece is only for new value watchers
	dataForApp.data = {
		nameOfValue: data.nameOfValue,
		description: data.description,
		status: "add"
	};
	// if a new value send to each of the new value watchers, currently only works with displays clients
	if (addedNewValue && !data.subscribePlaceholder) {
		for (let i = 0; i < this.dataStructure.newValueWatchers.length; i++) {
			// alter data based on subscriber id and their specified function
			dataForApp.app  = this.dataStructure.newValueWatchers[i].app;
			dataForApp.func = this.dataStructure.newValueWatchers[i].func;
			// notify to all clients
			this.broadcast('broadcast', dataForApp);
		}
	}
	// now send to each of the subscribers the new value
	dataForApp.data = this.dataStructure.allValues["" + data.nameOfValue].value;
	for (let i = 0; i < this.dataStructure.allValues[ "" + data.nameOfValue ].subscribers.length; i++) {
		// alter data based on subscriber id and their specified function
		dataForApp.app  = this.dataStructure.allValues["" + data.nameOfValue].subscribers[i].app;
		dataForApp.func = this.dataStructure.allValues["" + data.nameOfValue].subscribers[i].func;
		this.broadcast('broadcast', dataForApp);
	}
};

/**
 * Checks if there is a value, and if so will send the value.
 * If the value doesn't exist, it will not do anything.
 *
 * @method getValue
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.nameOfValue - Name of value to get.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give value to.
 */
SharedServerDataManager.prototype.getValue = function(wsio, data) {
	// don't do anything if this isn't filled out.
	if (data.nameOfValue === undefined || data.nameOfValue === null) {
		return;
	}
	// also don't do anything if the value doesn't exist
	if (this.dataStructure.allValues["" + data.nameOfValue] === undefined) {
		return;
	}
	// make the data for the app, using display's broadcast packet
	var dataForApp = {};
	dataForApp.app  = data.app;
	dataForApp.func = data.func;
	dataForApp.data = this.dataStructure.allValues[ "" + data.nameOfValue ].value;
	// send only to the client that requestd it.
	// Q: does it matter it multiple display clients?
	this.broadcast('broadcast', dataForApp);
};

/**
 * Checks if there is a value, and if so will send the value.
 * If the value doesn't exist, it will not do anything.
 *
 * @method removeValue
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {Array} data.namesOfValuesToRemove - Names of values to remove.
 */
SharedServerDataManager.prototype.removeValue = function(wsio, data) {
	// don't do anything if this isn't filled out.
	if (data.namesOfValuesToRemove === undefined || data.namesOfValuesToRemove === null) {
		return;
	}
	var nameToRemove;
	for (let i = 0; i < data.namesOfValuesToRemove.length; i++) {
		nameToRemove = data.namesOfValuesToRemove[i];
		// also don't do anything if the value doesn't exist
		if (this.dataStructure.allValues["" + nameToRemove] === undefined) {
			// doesn't exist, move to next one
			continue;
		} else {
			// remove from names of values
			this.dataStructure.allNamesOfValues.splice(this.dataStructure.allNamesOfValues.indexOf(nameToRemove), 1);
			// remove from dataStructure
			delete this.dataStructure.allValues[nameToRemove];

			// necessary to tell new value watchers that this value was removed?
			var dataForApp = {};
			dataForApp.data = {
				nameOfValue: nameToRemove,
				description: "",
				status: "remove"
			};
			for (let i = 0; i < this.dataStructure.newValueWatchers.length; i++) {
				// alter data based on subscriber id and their specified function
				dataForApp.app  = this.dataStructure.newValueWatchers[i].app;
				dataForApp.func = this.dataStructure.newValueWatchers[i].func;
				// notify to all clients
				this.broadcast('broadcast', dataForApp);
			}
		}
	}
};

/**
 * Add the app to the named values a subscriber.
 * If the value doesn't exist, it will create a "blank" value and subscribe to it.
 *
 * @method subscribeToValue
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.nameOfValue - Name of value to subscribe to.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give value to.
 * @param  {String|undefined} data.unsubscribe - If exists and true, then will remove user from subscribe list.
 */
SharedServerDataManager.prototype.subscribeToValue = function(wsio, data) {
	// Need to have a name. Without a name, nothing can be done.
	if (data.nameOfValue === undefined || data.nameOfValue === null) {
		return;
	}
	// if value doesn't exist make it, when changed later the subscription will work
	if (this.dataStructure.allValues["" + data.nameOfValue] === undefined) {
		// nothing, it'll be replace later if at all
		data.value = null;
		data.subscribePlaceholder = true;
		this.setValue(wsio, data);
	}

	var foundSubscriber = false;
	for (let i = 0; i < this.dataStructure.allValues[ "" + data.nameOfValue ].subscribers.length; i++) {
		// do not double add if the app and function are the same this permits same app diff function
		if (this.dataStructure.allValues[ "" + data.nameOfValue ].subscribers[i].app == data.app
			&& this.dataStructure.allValues[ "" + data.nameOfValue ].subscribers[i].func == data.func) {
			foundSubscriber = true;
			if (data.unsubscribe) {
				this.dataStructure.allValues[ "" + data.nameOfValue ].subscribers.splice(i, 1);
			}
			break;
		}
	}
	// if app is not already subscribing
	if (!foundSubscriber && !data.unsubscribe) {
		// make the new subscriber entry
		var newSubscriber  = {};
		newSubscriber.app  = data.app;
		newSubscriber.func = data.func;
		// add it to that value
		this.dataStructure.allValues[ "" + data.nameOfValue ].subscribers.push(newSubscriber);
	}
};

/**
 * Will respond back once to the app giving the func an array of tracked values.
 * They will be in an array of objects with properties nameOfValue and value.
 * NOTE: this could be a huge array.
 *
 * @method getAllTrackedValues
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give value to.
 */
SharedServerDataManager.prototype.getAllTrackedValues = function(wsio, data) {
	var dataForApp = {};
	dataForApp.data = [];
	dataForApp.app  = data.app;
	dataForApp.func = data.func;
	for (var i = 0; i < this.dataStructure.allNamesOfValues.length; i++) {
		dataForApp.data.push({
			nameOfValue: this.dataStructure.allNamesOfValues[i],
			value: this.dataStructure.allValues[ this.dataStructure.allNamesOfValues[i] ]
		});
	}
	// send to all clients, they want it.
	this.broadcast('broadcast', dataForApp);
};

/**
 * Gets all tracked value names and descriptions, gives to requesting app.
 *
 * @method getAllTrackedValues
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give value to.
 */
SharedServerDataManager.prototype.getAllTrackedDescriptions = function(wsio, data) {
	var dataForApp = {};
	dataForApp.data = [];
	dataForApp.app  = data.app;
	dataForApp.func = data.func;
	for (var i = 0; i < this.dataStructure.allNamesOfValues.length; i++) {
		dataForApp.data.push({
			nameOfValue: this.dataStructure.allNamesOfValues[i],
			description: this.dataStructure.allValues[this.dataStructure.allNamesOfValues[i]].description
		});
	}
	this.broadcast('broadcast', dataForApp);
};

/**
 * Will send a notification to app when a new value gets created.
 * App will get the value's name and description.
 *
 * NOTE: this could be a huge array.
 *
 * @method subscribeToNewValueNotification
 * @param  {Object} wsio - The websocket of sender.
 * @param  {Object} data - The object properties described below.
 * @param  {String} data.app - App that requested.
 * @param  {String} data.func - Name of the function on the app to give notification.
 * @param  {Boolean|undefined} data.unsubscribe - if exists and true, will remove from new value watcher list.
 */
SharedServerDataManager.prototype.subscribeToNewValueNotification = function(wsio, data) {
	// create the element
	var appWatcher = {
		app: data.app,
		func: data.func
	};
	// make sure it wasn't already added
	for (let i = 0; i < this.dataStructure.newValueWatchers.length; i++) {
		if (this.dataStructure.newValueWatchers[i].app === appWatcher.app
		&& this.dataStructure.newValueWatchers[i].func === appWatcher.func) {
			if (data.unsubscribe) {
				this.dataStructure.newValueWatchers.splice(i, 1);
			}
			// they are already subscribed, or this was an unsubscribe
			return;
		}
	}
	this.dataStructure.newValueWatchers.push(appWatcher);
};

/**
 * Updates the stored information about connections.
 * Currently updates three values for: UI, displays, remote servers.
 * Users information from the clients array.
 *
 * @method updateInformationAboutConnections
 * @param  {Array} clients - The array containing information of all connected clients.
 * @param  {Array} sagePointers - The array containing information of all pointers.
 */
SharedServerDataManager.prototype.updateInformationAboutConnections = function(clients, sagePointers) {
	var currentUiList = [];
	var currentDisplayList = [];
	var currentRemoteSiteList = [];
	var currentItem;
	for (let i = 0; i < clients.length; i++) {
		if (clients[i].clientType === "sageUI") {
			currentItem = {};
			currentItem.name  = sagePointers[clients[i].id].label;
			currentItem.color = sagePointers[clients[i].id].color;
			currentItem.uniqueID = clients[i].id;
			currentUiList.push(currentItem);
		} else if (clients[i].clientType === "display") {
			currentItem = {};
			currentItem.viewPort = clients[i].clientID;
			currentItem.uniqueID = clients[i].id;
			currentDisplayList.push(currentItem);
		} else if (clients[i].clientType === "remoteServer") {
			currentItem = {};
			currentItem.remoteAddress = clients[i].remoteAddress.address;
			currentItem.uniqueID = clients[i].id;
			currentRemoteSiteList.push(currentItem);
		}
	}
	var data = {};
	if (currentUiList.length > 0) {
		data.nameOfValue = "serverConnectionDataUiList";
		data.value = currentUiList;
		//  wsio is not needed to set value
		this.setValue(null, data);
	}
	if (currentDisplayList.length > 0) {
		data.nameOfValue = "serverConnectionDataDisplayList";
		data.value = currentDisplayList;
		//  wsio is not needed to set value
		this.setValue(null, data);
	}
	if (currentRemoteSiteList.length > 0) {
		data.nameOfValue = "serverConnectionDataRemoteSiteList";
		data.value = currentRemoteSiteList;
		//  wsio is not needed to set value
		this.setValue(null, data);
	}
};

/**
 * Updates the stored information about failed remote site connections.
 *
 * @method updateInformationAboutConnectionsFailedRemoteSite
 * @param  {Object} wsio - The websocket of sender.
 */
SharedServerDataManager.prototype.updateInformationAboutConnectionsFailedRemoteSite = function(wsio) {
	var data = {};
	data.nameOfValue = "serverConnectionDataFailedRemoteSite";
	if (this.dataStructure.allNamesOfValues.includes(data.nameOfValue)) {
		data.value = this.dataStructure.allValues[data.nameOfValue].value;
	}
	if (data.value === undefined) {
		data.value = {total: 0, sites: []};
	}
	data.value.total++;
	var sites = data.value.sites;
	var found = false;
	for (let i = 0; i < sites.length; i++) {
		if (sites[i].id === wsio.id) {
			sites[i].total++;
			found = true;
		}
	}
	if (!found) {
		sites.push({id: wsio.id, total: 1});
	}
	// wsio is not needed to set value
	this.setValue(null, data);
};

module.exports = SharedServerDataManager;
