// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

/* global interactMgr */

/**
  * List structure containing Partitions (groups) of Apps
  * @module server
  * @submodule PartitionList
  * @requires node-partition
	* @requires node-interactable
  */

// require variables to be declared
"use strict";

var Partition = require('./node-partition');
var InteractableManager = require('./node-interactable');

/**
  * @class PartitionList
  * @constructor
  */

function PartitionList(config) {
	this.list = {};
	this.count = 0;
	this.totalCreated = 0;

	this.configuration = config;

	this.minSize = {
		width: Math.round(config.ui.titleBarHeight) * (300 / 235) * 6, // 4 buttons + some padding in between
		height: config.ui.titleBarHeight * 4 // titlebar + some height for inside of partition
	};

	this.defaultColors = [
		'#a6cee3',
		'#1f78b4',
		'#b2df8a',
		'#33a02c',
		'#fb9a99',
		'#e31a1c',
		'#fdbf6f',
		'#ff7f00',
		'#cab2d6',
		'#6a3d9a',
		'#ffff99',
		'#b15928'
	];

	this.interactable = new InteractableManager();
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
PartitionList.prototype.newPartition = function(dims, iMgr, color) {
	if (this.count <= 20) {
		this.count++;
		this.totalCreated++;
		// give the partition a unique ID
		var newID = "ptn_" + this.totalCreated;
		var newColor = color || [40, 200, 220]; // default color

		// add new partition to list
		this.list[newID] = new Partition(dims, newID, newColor, this);

		this.createPartitionGeometries(newID, iMgr);

		// return new partition for use by other methods
		return this.list[newID];
	} else {
		return null;
	}
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

		this.interactable.removeLayer(id);

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

	return this.list[partitionID].releaseChild(childID);
};

/**
  * Update partitions based on item which was moved
  *
  * @param {object} item - The item which was moved
  */
PartitionList.prototype.updateOnItemRelease = function(item, pointer) {
	var newPartitionID = this.calculateNewPartition(item, pointer);
	// console.log(item);

	if (newPartitionID !== null) {
		if (item.partition && item.partition.id === newPartitionID) {
			// stay in same partition, update relative position
			return this.list[newPartitionID].updateChild(item.id);
		} else {
			return this.list[newPartitionID].addChild(item);
		}
	} else {
		if (item.partition) {
			return this.removeChildFromPartition(item.id, item.partition.id);
		}
	}

	return [];
};

/**
  * Calculate which partition an item falls into
  *
  * @param {object} item - The item which was moved
  */
PartitionList.prototype.calculateNewPartition = function(item, pointer) {
	// check partitions to find if item falls into one
	var partitionIDs = Object.keys(this.list);

	var closestID = null;
	var closestDistance = Infinity;

	var itemCenter = {
		x: item.left + item.width / 2,
		y: item.top + item.height / 2
	};

	let decisionCoord = pointer || itemCenter;

	// check if item falls into any partition
	partitionIDs.forEach((el) => {
		var ptn = this.list[el];

		// the centroid of the item must be within the bounds of the partition
		if ((decisionCoord.x >= ptn.left) && (decisionCoord.x <= ptn.left + ptn.width) &&
			(decisionCoord.y >= ptn.top) && (decisionCoord.y <= ptn.top + ptn.height)) {
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
				Math.pow(decisionCoord.x - partitionCenter.x, 2) +
				Math.pow(decisionCoord.y - partitionCenter.y, 2)
			);

			if (distance < closestDistance) {
				closestID = el;
				closestDistance = distance;
			}
		}
	}); // end partitionIDs.forEach(...)

	return closestID;
};

/**
  * Retrieve a list of partitions which are neighbors to a partition,
  * along with the information of the side
  *
  * @param {string} ptnID - The Partition for which we are finding neighbors
  */
PartitionList.prototype.findNeighbors = function(ptnID) {
	if (this.list.hasOwnProperty(ptnID)) {
		let neighbors = {};
		let thisPtn = this.list[ptnID];

		let distanceTolerance = 25;

		let titleBar = this.configuration.ui.titleBarHeight;

		for (let id of Object.keys(this.list).filter(id => id !== ptnID)) {
			var ptn = this.list[id];

			// only if the other partition is snapping as well
			if (ptn.isSnapping) {
				let anyAdjacent = false;

				let adjacentSides = {
					left: null,
					right: null,
					top: null,
					bottom: null
				};

				// check top against top and bottom of other (can't be both, only one or the other)
				if (Math.abs(thisPtn.top - (ptn.top + ptn.height + titleBar)) < distanceTolerance) {
					adjacentSides.top = "bottom";
					anyAdjacent = true;
				} else if (Math.abs(thisPtn.top - ptn.top) < distanceTolerance) {
					adjacentSides.top = "top";
					anyAdjacent = true;
				}

				// check bottom against top and bottom of other
				if (Math.abs((thisPtn.top + thisPtn.height + titleBar) - ptn.top) < distanceTolerance) {
					adjacentSides.bottom = "top";
					anyAdjacent = true;
				} else if (Math.abs((thisPtn.top + thisPtn.height) - (ptn.top + ptn.height)) < distanceTolerance) {
					adjacentSides.bottom = "bottom";
					anyAdjacent = true;
				}

				// check left against left and right of other
				if (Math.abs(thisPtn.left - (ptn.left + ptn.width)) < distanceTolerance) {
					adjacentSides.left = "right";
					anyAdjacent = true;
				} else if (Math.abs(thisPtn.left - ptn.left) < distanceTolerance) {
					adjacentSides.left = "left";
					anyAdjacent = true;
				}

				// check right against left and right of other
				if (Math.abs((thisPtn.left + thisPtn.width) - ptn.left) < distanceTolerance) {
					adjacentSides.right = "left";
					anyAdjacent = true;
				} else if (Math.abs((thisPtn.left + thisPtn.width) - (ptn.left + ptn.width)) < distanceTolerance) {
					adjacentSides.right = "right";
					anyAdjacent = true;
				}

				// if any of the sides of the other partition are adjacent to this partition,
				// add to list of neighbors
				if (anyAdjacent) {
					neighbors[ptn.id] = adjacentSides;
				}

			} // end if (ptn.isSnapping ...
		} // end for (let ptn of ...
		return neighbors;
	}

	return [];
};

/**
  * Update the neighbors of a Partition, as well as update the Partition's neighbors
	* as well.
  *
  * @param {string} ptnID - The Partition for which we are updating neighbors
  */
PartitionList.prototype.updateNeighbors = function(ptnID) {
	if (this.list.hasOwnProperty(ptnID)) {
		// update neighbors of selected partition

		// reset snapping flags for sides of screen
		this.list[ptnID].snapTop = false;
		this.list[ptnID].snapRight = false;
		this.list[ptnID].snapBottom = false;
		this.list[ptnID].snapLeft = false;
		if (this.list[ptnID].isSnapping) {

			// find all neighbors
			this.list[ptnID].neighbors = this.findNeighbors(ptnID);

			// update its neighbors to correctly include the new partition
			for (let nID of Object.keys(this.list[ptnID].neighbors)) {
				let neighbor = this.list[nID];
				// inefficient but a partition may have been deleted, so recalculate from remaining group
				neighbor.neighbors = this.findNeighbors(nID);
			}

			if (Math.abs(this.list[ptnID].top - (this.configuration.ui.titleBarHeight)) < 25) {
				this.list[ptnID].snapTop = true;
			}

			if (Math.abs(this.list[ptnID].left + this.list[ptnID].width - this.configuration.totalWidth) < 25) {
				this.list[ptnID].snapRight = true;
			}

			if (Math.abs(this.list[ptnID].top + this.list[ptnID].height +
				this.configuration.ui.titleBarHeight - this.configuration.totalHeight) < 25) {

				this.list[ptnID].snapBottom = true;
			}

			if (Math.abs(this.list[ptnID].left) < 25) {
				this.list[ptnID].snapLeft = true;
			}

			// return ID of neighbors to update
			return Object.keys(this.list[ptnID].neighbors);
		} else {
			// if it is no longer a snapping partition, remove itself from neighbors' lists
			let updatedNeighbors = Object.keys(this.list[ptnID].neighbors);
			for (let nID of updatedNeighbors) {
				let neighbor = this.list[nID];

				if (neighbor.neighbors[ptnID]) {
					delete neighbor.neighbors[ptnID];
				}
			}

			this.list[ptnID].neighbors = null;

			// return ID of neighbors to update
			return updatedNeighbors;
		}
	}
};


/* **************************************************** */
/* Methods using node-interactable for user interaction */

/**
	* Create the geometries for a new partition when it is created
	*
	* @param {string} newID - the ID of the partiton whos geometries will be updated
	*/
PartitionList.prototype.createPartitionGeometries = function(newID, iMgr) {
	// Add new partition to global interactMgr
	var newPtn = this.list[newID];

	var titleBarHeight = this.configuration.ui.titleBarHeight;

	// TODO: change ui title bar height
	var zIndex = this.count;
	iMgr.addGeometry(newID, "partitions", "rectangle", {
		x: newPtn.left,
		y: newPtn.top,
		w: newPtn.width,
		h: newPtn.height + titleBarHeight
	}, true, zIndex, newPtn);

	// Add geometries to this interactable
	this.interactable.addLayer(newID, 0);

	var cornerSize   = 0.2 * Math.min(newPtn.width, newPtn.height);
	var oneButton    = Math.round(titleBarHeight) * (300 / 235);
	var buttonsPad   = 0.1 * oneButton;
	var startButtons = newPtn.width - Math.round(2 * oneButton + 2 * buttonsPad);

	// add controls for partition
	this.addButtonToItem(newID, "titleBar", "rectangle",
		{x: 0, y: 0, w: newPtn.width, h: titleBarHeight}, 0);
	this.addButtonToItem(newID, "tileButton", "rectangle",
		{x: 0 + (1 * (buttonsPad + oneButton)), y: 0, w: oneButton, h: titleBarHeight}, 1);
	this.addButtonToItem(newID, "clearButton", "rectangle",
		{x: 0, y: 0, w: oneButton, h: titleBarHeight}, 1);
	this.addButtonToItem(newID, "fullscreenButton", "rectangle",
		{x: startButtons, y: 0, w: oneButton, h: titleBarHeight}, 1);
	this.addButtonToItem(newID, "closeButton", "rectangle",
		{x: startButtons + (1 * (buttonsPad + oneButton)), y: 0, w: oneButton, h: titleBarHeight}, 1);
	this.addButtonToItem(newID, "dragCorner", "rectangle",
		{x: newPtn.width - cornerSize,
			y: newPtn.height + titleBarHeight - cornerSize, w: cornerSize, h: cornerSize}, 2);
};

/**
	* Update the geometries of an item on resize
	*
	* @param {string} ptnID - the ID of the partiton whos geometries will be updated
	*/
PartitionList.prototype.updatePartitionGeometries = function(ptnID, iMgr) {
	// edit geometries of moved/resized partition
	var thisPtn = this.list[ptnID];
	var titleBarHeight = this.configuration.ui.titleBarHeight;

	var cornerSize   = 0.2 * Math.min(thisPtn.width, thisPtn.height);
	var oneButton    = Math.round(titleBarHeight) * (300 / 235);
	var buttonsPad   = 0.1 * oneButton;
	var startButtons = thisPtn.width - Math.round(2 * oneButton + 2 * buttonsPad);

	iMgr.editGeometry(ptnID, "partitions", "rectangle", {
		x: thisPtn.left, y: thisPtn.top,
		w: thisPtn.width, h: thisPtn.height + titleBarHeight});

	this.editButtonOnItem(ptnID, "titleBar", "rectangle",
		{x: 0, y: 0, w: thisPtn.width, h: titleBarHeight}, 0);
	this.editButtonOnItem(ptnID, "tileButton", "rectangle",
		{x: 0 + (1 * (buttonsPad + oneButton)), y: 0, w: oneButton, h: titleBarHeight}, 1);
	this.editButtonOnItem(ptnID, "clearButton", "rectangle",
		{x: 0, y: 0, w: oneButton, h: titleBarHeight}, 1);
	this.editButtonOnItem(ptnID, "fullscreenButton", "rectangle",
		{x: startButtons, y: 0, w: oneButton, h: titleBarHeight}, 1);
	this.editButtonOnItem(ptnID, "closeButton", "rectangle",
		{x: startButtons + (1 * (buttonsPad + oneButton)), y: 0, w: oneButton, h: titleBarHeight}, 1);
	this.editButtonOnItem(ptnID, "dragCorner", "rectangle",
		{x: thisPtn.width - cornerSize,
			y: thisPtn.height + titleBarHeight - cornerSize, w: cornerSize, h: cornerSize}, 2);
};

/**
* Add an interactable button to a partition in the list
*
* @method addButtonToItem
* @param id {String} id of partition
* @param buttonId {String} id of button
* @param type {String} "rectangle" or "circle"
* @param geometry {Object} defines button (rectangle = {x: , y: , w: , h: }, circle = {x: , y: , r: })
*/
PartitionList.prototype.addButtonToItem = function(id, buttonId, type, geometry, zIndex) {
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
PartitionList.prototype.editButtonOnItem = function(id, buttonId, type, geometry) {
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
PartitionList.prototype.editButtonVisibilityOnItem = function(id, buttonId, visible) {
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
PartitionList.prototype.findButtonByPoint = function(id, point) {
	return this.interactable.searchGeometry(point, id);
};

module.exports = PartitionList;
