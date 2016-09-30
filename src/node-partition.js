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

	var titleBarHeight = this.partitionList.configuration.ui.titleBarHeight;
	// save positions within partition as percentages of partition
	item.relative_left = (item.left - this.left) / this.width;
	item.relative_top = (item.top - this.top - titleBarHeight) / this.height;
	item.relative_width = item.width / this.width;
	item.relative_height = item.height / this.height;

	this.numChildren++;
	this.children[item.id] = item;
};

Partition.prototype.updateChild = function(id) {
	if (this.children.hasOwnProperty(id)) {
		// when a child is moved, update the relative positions within the parent
		var item = this.children[id];
		var titleBarHeight = this.partitionList.configuration.ui.titleBarHeight;

		item.relative_left = (item.left - this.left) / this.width;
		item.relative_top = (item.top - this.top - titleBarHeight) / this.height;
		item.relative_width = item.width / this.width;
		item.relative_height = item.height / this.height;

	}
}

/**
  * Remove a Child application to the partition.
  *
  * @param {string} id - The id of child to remove
  */
Partition.prototype.releaseChild = function(id) {
	if (this.children.hasOwnProperty(id)) {

		var item = this.children[id];

		item.relative_left = null;
		item.relative_top = null;
		item.relative_width = null;
		item.relative_height = null;

		item.maximized = false;
		item.partition = null;

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

Partition.prototype.updateChildrenPositions = function() {
	var updatedChildren = [];

	var childIDs = Object.keys(this.children);
	var titleBarHeight = this.partitionList.configuration.ui.titleBarHeight;

	childIDs.forEach((el) => {
		var item = this.children[el];

		item.left = item.relative_left * this.width + this.left;
		item.top = item.relative_top * this.height + this.top + titleBarHeight;
		item.width = item.relative_width * this.width;
		item.height = item.relative_height * this.height;

		updatedChildren.push({elemId: item.id, elemLeft: item.left, elemTop: item.top,
				elemWidth: item.width, elemHeight: item.height, date: new Date()});
	});

	return updatedChildren;
};

/**
  * Get a string corresponding to the information needed to update the display
  *
  * @param {string} id - The id of child to maximize
  */
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
