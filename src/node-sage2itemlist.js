// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

/**
 * object to check for intersections on interactable geometry
 *
 * @module server
 * @submodule SAGE2ItemList
 * @requires node-interactable
 */

// require variables to be declared
"use strict";

var InteractableManager = require('./node-interactable');


/**
 * SAGE2ItemList object
 *
 * @class SAGE2ItemList
 * @constructor
 */
function SAGE2ItemList() {
	this.numItems = 0;
	this.list = {};

	this.interactable = new InteractableManager();
}

/**
* Add new item to list
*
* @method addItem
* @param item {Object} item to be added into list (must have property id)
*/
SAGE2ItemList.prototype.addItem = function(item) {
	this.numItems++;
	this.list[item.id] = item;
	this.interactable.addLayer(item.id, 0);
};

/**
* Remove item from list
*
* @method removeItem
* @param id {String} id of item to be removed from list
*/
SAGE2ItemList.prototype.removeItem = function(id) {
	if (this.list.hasOwnProperty(id)) {
		this.numItems--;
		delete this.list[id];
		this.interactable.removeLayer(id);
	}
};

/**
* Edit item in list
*
* @method editItem
* @param id {String} id of item to be edited
* @param newProperties {Object} properties to add / change in item
*/
SAGE2ItemList.prototype.editItem = function(id, newProperties) {
	var key;
	for (key in newProperties) {
		this.list[id][key] = newProperties[key];
	}
};

/**
* Add an interactable button to an item in the list
*
* @method addButtonToItem
* @param id {String} id of item
* @param buttonId {String} id of button
* @param type {String} "rectangle" or "circle"
* @param geometry {Object} defines button (rectangle = {x: , y: , w: , h: }, circle = {x: , y: , r: })
*/
SAGE2ItemList.prototype.addButtonToItem = function(id, buttonId, type, geometry, zIndex) {
	this.interactable.addGeometry(buttonId, id, type, geometry, true, zIndex, null);
};

/**
* Edit an interactable button for an item in the list
*
* @method editButtonOnItem
* @param id {String} id of item
* @param buttonId {String} id of button
* @param type {String} "rectangle" or "circle"
* @param geometry {Object} defines button (rectangle = {x: , y: , w: , h: }, circle = {x: , y: , r: })
*/
SAGE2ItemList.prototype.editButtonOnItem = function(id, buttonId, type, geometry) {
	this.interactable.editGeometry(buttonId, id, type, geometry);
};

/**
* Edit visibility for an interactable button for an item in the list
*
* @method editButtonVisibilityOnItem
* @param id {String} id of item
* @param buttonId {String} id of button
* @param visible {Boolean} whether or not the button is visible
*/
SAGE2ItemList.prototype.editButtonVisibilityOnItem = function(id, buttonId, visible) {
	this.interactable.editVisibility(buttonId, id, visible);
};

/**
* Test to see which button is under a given point
*
* @method findButtonByPoint
* @param id {String} id of item
* @param point {Object} {x: , y: }
* @return button {Object} button under the point
*/
SAGE2ItemList.prototype.findButtonByPoint = function(id, point) {
	return this.interactable.searchGeometry(point, id);
};

/**
* Sort the list by a given property
*
* @method sortList
* @param property {String} property to sort items by
* @return order {Array} list of keys sorted by propery
*/
SAGE2ItemList.prototype.sortList = function(property) {
	var tmpList = this.list;
	var order = Object.keys(tmpList).sort(function(a, b) {
		return tmpList[a][property] - tmpList[b][property];
	});
	return order;
};

/**
* Get an item from the list with a given id
*
* @method getItemById
* @param id {String} id of item to retrieve
* @return item {Object} item with given id
*/
SAGE2ItemList.prototype.getItemById = function(id) {
	return this.list[id];
};


//pass a title of the app, get this item

SAGE2ItemList.prototype.getFirstItemWithTitle = function(title) {
	for (var key in this.list) {
	  if (this.list[key].title == title) {
	    return this.list[key];
	  }
	}
	return null;
};

// TODO: Given local coordinate inside the item bounding box, determine if inside an interactable area

module.exports = SAGE2ItemList;
