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
  * List structure containing Partitions (groups) of Apps
  * @module server
  * @submodule PartitionList
  * @requires node-partition
  */

// require variables to be declared
"use strict";

var Partition = require('./node-partition');

/**
  * @class PartitionList
  * @constructor
  */

function PartitionList() {
	this.list = {};
	this.count = 0;
	this.totalCreated = 0;
}

/**
  * Create a new partition from a set of dimensions
  *
  * @param {object} dims - Dimensions of the Partition
	* @param {number} dims.left - Coordinate of left side of Partition
	* @param {number} dims.top - Coordinate of Top side of Partition
	* @param {number} dims.width - Width of the Partition
	* @param {number} dims.height - Height of the partition
  */
PartitionList.prototype.newPartition = function(dims) {
	console.log("PartitionList: Creating new Partition");

	this.count++;
	this.totalCreated++;
	// give the partition a unique ID
	var newID = "ptn_" + this.totalCreated;

	// add new partition to list
	this.list[newID] = new Partition(dims, newID, this);

	// return new partition for use by other methods
	return this.list[newID];
};

/**
  * Create a new partition from a list of apps
  *
  * @param {array} items - A list of items from which to create the Partition
  */
PartitionList.prototype.newBoundingPartition = function(items) {
	var bounds = {
		xMin: Infinity,
		yMin: Infinity,
		xMax: -Infinity,
		yMax: -Infinity
	};

	// calculate outer bounding box of items
	items.forEach((el) => {
		// calculate left edge
		if (el.left < bounds.xMin) {
			bounds.xMin = el.left;
		}

		// calculate top edge
		if (el.top < bounds.yMin) {
			bounds.yMin = el.top;
		}

		// calculate right edge
		if (el.left + el.width > bounds.xMax) {
			bounds.xMax = el.left + el.width;
		}

		// calculate bottom edge
		if (el.top + el.height > bounds.yMax) {
			bounds.yMax = el.top + el.height;
		}
	});

	// add 10 unit padding to edges of partiton
	bounds.xMin -= 10;
	bounds.yMin -= 10;
	bounds.xMax += 10;
	bounds.yMax += 10;

	// create new partition of dimensions of bounding box
	var partition = new Partition({
		left: bounds.xMin,
		top: bounds.yMin,
		width: bounds.xMax - bounds.xMin,
		height: bounds.yMax - bounds.yMin
	});

	// add children to new partition automatically
	items.forEach((el) => {
		partition.addChild(el);
	});
};

/**
  * Create a new partition by dimensions
  *
  * @param {string} id - id of the Partition to remove
  */
PartitionList.prototype.removePartition = function(id) {
	if (this.list.hasOwnProperty(id)) {
		// remove all children from the partition
		this.list[id].releaseAllChildren();

		// delete reference of partition
		this.count--;
		delete this.list[id];
	}
};

/**
  * Create a new partition by dimensions
  *
  * @param {string} childID - id of the Child to remove
  * @param {string} partitionID - id of the Partition from which to remove the Child
  */
PartitionList.prototype.removeChildFromPartition = function(childID, partitionID) {
	console.log("Removing", childID, "from", partitionID);
	this.list[partitionID].releaseChild(childID);
};

/**
  * Update partitions based on item which was moved
  *
  * @param {object} item - The item which was moved
  */
PartitionList.prototype.updateOnItemRelease = function(item) {
	var newPartitionID = this.calculateNewPartition(item);
	// console.log(item);

	if (newPartitionID !== null) {
		if (item.partition === newPartitionID) {
			// stay in same partition, do nothing
		} else {
			console.log(item.id, "added to", newPartitionID);
			this.list[newPartitionID].addChild(item);
		}
	} else {
		if (item.partition) {
			this.removeChildFromPartition(item.id, item.partition.id);
		}
	}
};

/**
  * Calculate which partition an item falls into
  *
  * @param {object} item - The item which was moved
  */
PartitionList.prototype.calculateNewPartition = function(item) {
	// check partitions to find if item falls into one
	var partitionIDs = Object.keys(this.list);

	var closestID = null;
	var closestDistance = Infinity;

	var itemCenter = {
		x: item.left + item.width / 2,
		y: item.top + item.height / 2
	};

	// check if item falls into any partition
	partitionIDs.forEach((el) => {
		var ptn = this.list[el];

		// the centroid of the item must be within the bounds of the partition
		if ((itemCenter.x >= ptn.left) && (itemCenter.x <= ptn.left + ptn.width) &&
			(itemCenter.y >= ptn.top) && (itemCenter.y <= ptn.top + ptn.height)) {
			// the centroid of the item is inside the partition

			// if the partition is the parent automatically remain inside
			if (item.partition && item.partition === el) {
				// negative distance will always be the minimum number
				closestID = el;
				closestDistance = -1;
			}

			// calculate center point of partition
			var partitionCenter = {
				x: ptn.left + ptn.width / 2,
				y: ptn.top + ptn.height / 2
			};

			// calculate distance between item centroid and partition centroid
			var distance = Math.sqrt(
				Math.pow(itemCenter.x - partitionCenter.x, 2) +
				Math.pow(itemCenter.y - partitionCenter.y, 2)
			);

			if (distance < closestDistance) {
				closestID = el;
				closestDistance = distance;
			}
		}
	}); // end partitionIDs.forEach(...)

	return closestID;
};

module.exports = PartitionList;
