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
  * Partitioning of SAGE2 Apps into groups
  * @module server
  * @submodule partition
  */

// require variables to be declared
"use strict";

/**
  * @class Partition
  * @constructor
  */

function Partition(dims, id) {
	this.children = {};
	this.numChildren = 0;

	this.width = dims.width;
	this.height = dims.height;
	this.left = dims.left;
	this.top = dims.top;

	this.bounding = true;

	this.innerTiling = false;
	this.innerMaximization = false;
	this.currentMaximizedChild = 0;
}

/**
  * Add a Child application to the partition.
  *
  * @method addChild
  * @param item     The item to be added
  */
Partition.prototype.addChild = function(item) {
	this.numChildren++;
	this.children[item.id] = item;
};

/**
  * Remove a Child application to the partition.
  *
  * @method releaseChild
  * @param id     The id of child to remove
  */
Partition.prototype.releaseChild = function(id) {
	if (this.children.hasOwnProperty(id)) {

		this.children[id].partition = null;

		this.numChildren--;
		delete this.children[id];
	}
};

/**
  * Remove all Child applications from the partition
  *
  * @method releaseAllChildren
  */
Partition.prototype.releaseAllChildren = function() {
	var childIDs = Object.keys(this.children);

	childIDs.forEach((el) => {
		this.children[el].removeChild(el);
	});
};

/**
  * Toggle partition tiling mode
  *
  * @method toggleInnerTiling
  */
Partition.prototype.toggleInnerTiling = function() {
	this.innerTiling = !this.innerTiling;
};

/**
  * Re-tile the apps within a partition
  *
  * @method tilePartition
  */
Partition.prototype.tilePartition = function() {
	// TODO: run tiling algorithm on inner windows
};

/**
  * Toggle partition maximization mode
  *
  * @method toggleInnerMaximization
  */
Partition.prototype.toggleInnerMaximization = function() {
	this.innerMaximization = !this.innerMaximization;
};

/**
  * Increment the value of maximized child in the partition, and maximize that
  * child
  *
  * @method maximizeNextChild
  */
Partition.prototype.maximizeNextChild = function() {
	this.currentMaximizedChild = (this.currentMaximizedChild + 1) % this.numChildren;

	this.maximizeChild(this.currentMaximizedChild);
};

/**
  * Maximize a specific child in the partition
  *
  * @method maximizeChild
  * @param id     The id of child to maximize
  */
Partition.prototype.maximizeChild = function(id) {
	if (this.children.hasOwnProperty(id)) {
		// var child = this.children[id];

		// TODO: Maximize this child
	}
};

module.exports = Partition;
