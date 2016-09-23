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
PartitionList.prototype.newPartition(dims) {
  this.count++;
  this.totalCreated++;
  // give the partition a unique ID (up to 99)
  var newID = ('00' + this.totalCreated).substring(-2);

  // add new partition to list
  this.list[newID] = new Partition(dims, newID);

  // return new partition for use by other methods
  return this.list[newID];
}

/**
  * Create a new partition from a list of apps
  *
  * @method newBoundingPartition
  * @param items      A list of items to create the Partition from
  */
PartitionList.prototype.newBoundingPartition(items) {
  var bounds = {
    xMin = Infinity;
    yMin = Infinity;
    xMax = -Infinity;
    yMax = -Infinity;
  };

  // calculate outer bounding box of items
  items.forEach((el) => {
    // calculate left edge
    if (el.left < bounding.xMin) {
      bounding.xMin = el.left;
    }

    // calculate top edge
    if (el.top < bounding.yMin) {
      bounding.yMin = el.top;
    }

    // calculate right edge
    if (el.left + el.width > bounding.xMax) {
        bounding.xMax = el.left + el.width;
    }

    // calculate bottom edge
    if (el.top + el.height > bounding.yMax) {
        bounding.yMax = el.top + el.height;
    }
  });

  // add 10 unit padding to edges of partiton
  bounding.xMin -= 10;
  bounding.yMin -= 10;
  bounding.xMax += 10;
  bounding.yMax += 10;

  // create new partition of dimensions of bounding box
  var partition = newPartition(bounds);

  // add children to new partition automatically
  items.forEach((el) => {
    partition.addChild(el);
  });
}

/**
  * Create a new partition by dimensions
  *
  * @method removePartition
  * @param id       id of the Partition to remove
  */
PartitionList.prototype.removePartition(id) {
  if (this.list.hasOwnProperty(id)) {
    // remove all children from the partition
    this.list[id].releaseAllChildren();

    // delete reference of partition
    this.count--;
    delete this.list[id];
  }
}

module.exports = PartitionList;
