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
  * @submodule partitionlist
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
  * Create a new partition by dimensions
  *
  * @method newPartition
  * @param dims       Dimensions of the Partition
  */
PartitionList.prototype.newPartition = function(dims) {
	this.count++;
	this.totalCreated++;
	// give the partition a unique ID (up to 99)
	var newID = "ptn" + ('00' + this.totalCreated).substring(-2);

	// add new partition to list
	this.list[newID] = new Partition(dims, newID);

	// return new partition for use by other methods
	return this.list[newID];
};

/**
  * Create a new partition from a list of apps
  *
  * @method newBoundingPartition
  * @param items      A list of items to create the Partition from
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
	var partition = new Partition(bounds);

	// add children to new partition automatically
	items.forEach((el) => {
		partition.addChild(el);
	});
};

/**
  * Create a new partition by dimensions
  *
  * @method removePartition
  * @param id       id of the Partition to remove
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
  * Calculate if an item falls within a partition
  *
  * @method updateOnItemRelease
  * @param item     The item which was moved
  */
PartitionList.prototype.updateOnItemRelease = function(item) {
  // check partitions to find if item falls into one
	var partitionIDs = Object.keys(this.list);

	var closestID = null;
	var closestDistance = Infinity;

	var itemCenter = {
		x: item.left + item.width / 2,
		y: item.top + item.height / 2
	};

	partitionIDs.forEach((el) => {
	// the centroid of the item must be within the bounds of the partition
		if (itemCenter.x >= this.list[el].left &&
			itemCenter.x <= this.list[el].left) {
				//
		}

		// calculate center point of partition
		var partitionCenter = {
			x: this.list[el].left + this.list[el].width / 2,
			y: this.list[el].top + this.list[el].height / 2
		};

		var distance = Math.sqrt(
		Math.pow(itemCenter.x - partitionCenter.x, 2) +
		Math.pow(itemCenter.y - partitionCenter.y, 2)
		);

		if (distance < closestDistance) {
			closestID = el;
			closestDistance = distance;
		}
	}); // end partitionIDs.forEach(...)

	if (closestID !== null) {
		this.list[closestID].addChild(item);
	} else {
		if (item.partition !== null) {
			item.partition.removeChild(item.id);
		}
	}
};

module.exports = PartitionList;
