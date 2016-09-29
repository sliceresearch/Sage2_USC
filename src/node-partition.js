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
  * @submodule Partition
  */

// require variables to be declared
"use strict";

/**
  * @class Partition
  * @constructor
  */

function Partition(dims, id, partitionList) {
	console.log("Partition: Creating new Partition");

	// the list which this partition is a part of
	this.partitionList = partitionList;

	this.children = {};
	this.numChildren = 0;

	this.width = dims.width;
	this.height = dims.height;
	this.left = dims.left;
	this.top = dims.top;
	this.aspect = dims.width / dims.height;

	this.previous_left = null;
	this.previous_top = null;
	this.previous_width = null;
	this.previous_height = null;

	this.maximized = false;

	this.id = id;

	this.bounding = true;

	this.innerTiling = false;
	this.innerMaximization = false;
	this.currentMaximizedChild = 0;
}

/**
  * Add a Child application to the partition.
  *
  * @param {object} item - The item to be added
  */
Partition.prototype.addChild = function(item) {
	if (item.partition /*&& item.partition !== this*/) {
		// if the item was already in another partition, remove and add to this partition
		this.partitionList.removeChildFromPartition(item.id, item.partition.id);
	}

	item.partition = this;

	this.numChildren++;
	this.children[item.id] = item;
};

/**
  * Remove a Child application to the partition.
  *
  * @param {string} id - The id of child to remove
  */
Partition.prototype.releaseChild = function(id) {
	if (this.children.hasOwnProperty(id)) {

		this.children[id].maximized = false;
		this.children[id].partition = null;

		this.numChildren--;
		delete this.children[id];
	}
};

/**
  * Remove all Child applications from the partition
  */
Partition.prototype.releaseAllChildren = function() {
	var childIDs = Object.keys(this.children);

	childIDs.forEach((el) => {
		this.releaseChild(el);
	});
};

/**
  * Delete all children within the partition
  */
Partition.prototype.clearPartition = function(deleteFnc) {
	var childIDs = Object.keys(this.children);

	childIDs.forEach((el) => {
		this.releaseChild(el);
		deleteFnc(el);
	});
};

/**
  * Toggle partition tiling mode
  *
  */
Partition.prototype.toggleInnerTiling = function() {
	this.innerTiling = !this.innerTiling;
};

/**
  * Re-tile the apps within a partition
  */
Partition.prototype.tilePartition = function() {
	// TODO: run tiling algorithm on inner windows
};

/**
  * Toggle partition maximization mode
  */
Partition.prototype.toggleInnerMaximization = function() {
	this.innerMaximization = !this.innerMaximization;
};

/**
  * Increment the value of maximized child in the partition, and maximize that
  * child
  */
Partition.prototype.maximizeNextChild = function() {
	this.currentMaximizedChild = (this.currentMaximizedChild + 1) % this.numChildren;

	this.maximizeChild(this.currentMaximizedChild);
};

/**
  * Maximize a specific child in the partition
  *
  * @param {string} id - The id of child to maximize
  */
Partition.prototype.maximizeChild = function(id) {
	if (this.children.hasOwnProperty(id)) {
		// var child = this.children[id];

		// TODO: Maximize this child
	}
};

Partition.prototype.getDisplayString = function() {
	return {
		id: this.id,

		left: this.left,
		top: this.top,
		width: this.width,
		height: this.height
	};
};

module.exports = Partition;
