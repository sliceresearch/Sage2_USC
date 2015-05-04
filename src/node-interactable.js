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
 * @submodule Interactable
 * @requires rbush
 */

// require variables to be declared
"use strict";

var RBush = require('rbush');


/**
 * Interactable container object
 *
 * @class InteractableManager
 * @constructor
 */
function InteractableManager() {
	this.layers = {};
	this.layerOrder = [];

	this.interactableObjects = {};
}

/**
* Add new layer of interactable objects
*
* @method addLayer
* @param id {String} unique identifier for the layer
* @param zIndex {Integer} determines ordering of the layers
*/
InteractableManager.prototype.addLayer = function(id, zIndex) {
	zIndex = (zIndex === undefined || zIndex === null) ? this.layerOrder.length : zIndex;
	this.layers[id] = {objects: new RBush(6, ['.x1', '.y1', '.x2', '.y2']), zIndex: zIndex};
	this.interactableObjects[id] = {};

	var _this = this;
	this.layerOrder = Object.keys(this.layers).sort(function(a, b) {
		return _this.layers[a].zIndex - _this.layers[b].zIndex;
	});
};

/**
* Remove layer of interactable objects
*
* @method removeLayer
* @param id {String} unique identifier for the layer
*/
InteractableManager.prototype.removeLayer = function(id) {
	if(this.layers.hasOwnProperty(id)) {
		delete this.layers[id];
		delete this.interactableObjects[id];

		var _this = this;
		this.layerOrder = Object.keys(this.layers).sort(function(a, b) {
			return _this.layers[a].zIndex - _this.layers[b].zIndex;
		});
	}
};

/**
* Add new object (with geomtry - rectangle or circle) to a layer
*
* @method addGeometry
* @param id {String} unique identifier for the geometric object
* @param layerId {String} unique identifier for the layer
* @param type {String} "rectangle" or "circle"
* @param geometry {Obejct} defines object (rectangle = {x: , y: , w: , h: }, circle = {x: , y: , r: })
* @param visible {Boolean} whether or not the geometric object is currently visible
* @param zIndex {Integer} determines ordering of the geometries within a given layers
* @param data {Object} data to store along with given geometry
*/
InteractableManager.prototype.addGeometry = function(id, layerId, type, geometry, visible, zIndex, data) {
	var pkg = {
		id:       id,
		layerId:  layerId,
		type:     type,
		geometry: geometry,
		visible:  visible,
		zIndex:   zIndex,
		data:     data
	};
	if(type === "circle") {
		pkg.x1 = geometry.x - geometry.r;
		pkg.y1 = geometry.y - geometry.r;
		pkg.x2 = geometry.x + geometry.r;
		pkg.y2 = geometry.y + geometry.r;
	}
	else {
		pkg.x1 = geometry.x;
		pkg.y1 = geometry.y;
		pkg.x2 = geometry.x + geometry.w;
		pkg.y2 = geometry.y + geometry.h;
	}

	this.layers[layerId].objects.insert(pkg);
	this.interactableObjects[layerId][id] = pkg;
};

/**
* Remove geometric object from a layer
*
* @method removeGeometry
* @param id {String} unique identifier for the geometric object
* @param layerId {String} unique identifier for the layer
*/
InteractableManager.prototype.removeGeometry = function(id, layerId) {
	var pkg = this.interactableObjects[layerId][id];
	this.layers[layerId].objects.remove(pkg);

	delete this.interactableObjects[layerId][id];
};

/**
* Edit geometric object position / size / type
*
* @method editGeometry
* @param id {String} unique identifier for the geometric object
* @param layerId {String} unique identifier for the layer
* @param type {String} "rectangle" or "circle"
* @param geometry {Obejct} defines object (rectangle = {x: , y: , w: , h: }, circle = {x: , y: , r: })
*/
InteractableManager.prototype.editGeometry = function(id, layerId, type, geometry) {
	var pkg = this.interactableObjects[layerId][id];

	this.layers[layerId].objects.remove(pkg);

	pkg.type = type;
	pkg.geometry = geometry;
	if(type === "circle") {
		pkg.x1 = geometry.x - geometry.r;
		pkg.y1 = geometry.y - geometry.r;
		pkg.x2 = geometry.x + geometry.r;
		pkg.y2 = geometry.y + geometry.r;
	}
	else {
		pkg.x1 = geometry.x;
		pkg.y1 = geometry.y;
		pkg.x2 = geometry.x + geometry.w;
		pkg.y2 = geometry.y + geometry.h;
	}

	this.layers[layerId].objects.insert(pkg);
};

/**
* Edit geometric object position / size / type
*
* @method editGeometry
* @param id {String} unique identifier for the geometric object
* @return hasObject {Boolean} whether or not an object with the given id exists
*/
InteractableManager.prototype.hasObjectWithId = function(id) {
	var key;
	for (key in this.interactableObjects) {
		if (this.interactableObjects[key].hasOwnProperty(id))
			return true;
	}
	return false;
};

/**
* Edit visibility of geometric object
*
* @method editVisibility
* @param id {String} unique identifier for the geometric object
* @param layerId {String} unique identifier for the layer
* @param visible {Boolean} whether or not the geometric object is currently visible
*/
InteractableManager.prototype.editVisibility = function(id, layerId, visible) {
	var pkg = this.interactableObjects[layerId][id];
	pkg.visible = visible;
};

/**
* Edit zIndex of geometric object
*
* @method editZIndex
* @param id {String} unique identifier for the geometric object
* @param layerId {String} unique identifier for the layer
* @param zIndex {Integer} determines ordering of the geometries within a given layers
*/
InteractableManager.prototype.editZIndex = function(id, layerId, zIndex) {
	var pkg = this.interactableObjects[layerId][id];
	pkg.zIndex = zIndex;
};

/**
* Move geometric object to front (edit zIndex)
*
* @method moveObjectToFront
* @param id {String} unique identifier for the geometric object
* @param layerId {String} unique identifier for the layer
* @param otherLayerIds {Array} unique identifiers for other layers to include in sort
*/
InteractableManager.prototype.moveObjectToFront = function(id, layerId, otherLayerIds) {
	var i;
	var key;
	var currZIndex = this.interactableObjects[layerId][id].zIndex;
	var maxZIndex = currZIndex;
	var allLayerIds = [layerId].concat(otherLayerIds || []);

	for (i=0; i<allLayerIds.length; i++) {
		if (this.interactableObjects.hasOwnProperty(allLayerIds[i])) {
			for (key in this.interactableObjects[allLayerIds[i]]) {
				var itemZIndex = this.interactableObjects[allLayerIds[i]][key].zIndex;
				if (itemZIndex > currZIndex) {
					if (itemZIndex > maxZIndex) maxZIndex = itemZIndex;
					this.interactableObjects[allLayerIds[i]][key].zIndex--;
				}
			}
		}
	}
	this.interactableObjects[layerId][id].zIndex = maxZIndex;
};

/**
* Move geometric object to front (edit zIndex)
*
* @method getObjectZIndexList
* @param layerId {String} unique identifier for the layer
* @param otherLayerIds {Array} unique identifiers for other layers to include in list
* @return zIndexList {Obejct} list of geometric object ids and there zIndex values
*/
InteractableManager.prototype.getObjectZIndexList = function(layerId, otherLayerIds) {
	var i;
	var key;
	var zIndexList = {};
	var allLayerIds = [layerId].concat(otherLayerIds || []);

	for (i=0; i<allLayerIds.length; i++) {
		if (this.interactableObjects.hasOwnProperty(allLayerIds[i])) {
			for (key in this.interactableObjects[allLayerIds[i]]) {
				zIndexList[this.interactableObjects[allLayerIds[i]][key].id] = this.interactableObjects[allLayerIds[i]][key].zIndex;
			}
		}
	}
	return zIndexList;
};


/**
* Get geometric object with given id
*
* @method getObject
* @param id {String} unique identifier for the geometric object
* @param layerId {String} unique identifier for the layer
* @return object {Object} geometric object with given id
*/
InteractableManager.prototype.getObject = function(id, layerId) {
	return this.interactableObjects[layerId][id];
};

/**
* Search for topmost geometric object (optionally within a given layer)
*
* @method searchGeometry
* @param point {Object} {x: , y: }
* @param layerId {String} unique identifier for the layer
* @param ignoreList {Array} list of ids to ignore during the search
* @return {Object} geometric object
*/
InteractableManager.prototype.searchGeometry = function(point, layerId, ignoreList) {
	var results = [];
	if (layerId !== undefined && layerId !== null) {
		results.push(this.layers[layerId].objects.search([point.x, point.y, point.x, point.y]));
	}
	else {
		var i;
		var tmp;
		results = [];
		for(i=this.layerOrder.length-1; i>=0; i--) {
			tmp = this.layers[this.layerOrder[i]].objects.search([point.x, point.y, point.x, point.y]);
			if (i < this.layerOrder.length-1 && this.layers[this.layerOrder[i]].zIndex === this.layers[this.layerOrder[i+1]].zIndex) {
				results[results.length-1] = results[results.length-1].concat(tmp);
			}
			else {
				results.push(tmp);
			}
		}
	}

	return findTopmostGeometry(point, results, ignoreList);
};

/**
* Finds for topmost geometric object (highest zIndex)
*
* @method findTopmostGeometry
* @param point {Object} {x: , y: }
* @param geometryList {Array} list of geometric objects
* @param ignoreList {Array} list of ids to ignore during the search
* @return {Object} geometric object
*/
function findTopmostGeometry(point, geometryList, ignoreList) {
	var i, j;
	var topmost = null;
	if (!(ignoreList instanceof Array)) ignoreList = [];
	for(i=0; i<geometryList.length; i++) {
		for(j=0; j<geometryList[i].length; j++) {
			if (ignoreList.indexOf(geometryList[i][j].id) >= 0) continue;
			if (geometryList[i][j].type === "circle") {
				var x = point.x - geometryList[i][j].geometry.x;
				var y = point.y - geometryList[i][j].geometry.y;
				var r = geometryList[i][j].geometry.r;
				if ((x*x + y*y) < (r*r) && geometryList[i][j].visible === true && (topmost === null || geometryList[i][j].zIndex > topmost.zIndex)) {
					topmost = geometryList[i][j];
				}
			}
			else {
				if (geometryList[i][j].visible === true && (topmost === null || geometryList[i][j].zIndex > topmost.zIndex)) {
					topmost = geometryList[i][j];
				}
			}
		}
		if(topmost !== null) return topmost;
	}
	return null;
}


module.exports = InteractableManager;