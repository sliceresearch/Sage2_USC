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

function Partition(dims, id, color, partitionList) {
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
	this.color = color;

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
	var changedPartitions = [];

	if (item.partition /*&& item.partition !== this*/) {
		// if the item was already in another partition, remove and add to this partition
		changedPartitions.push(item.partition.id);
		this.partitionList.removeChildFromPartition(item.id, item.partition.id);
	}

	changedPartitions.push(this.id);
	item.partition = this;

	// if item is bigger than or slightly outside of partition, resize and put inside
	// to show that the item is now in the partiton
	var titleBarHeight = this.partitionList.configuration.ui.titleBarHeight;

	if (item.width > this.width - 8) {
		item.width = this.width - 8;
		item.height = item.width / item.aspect;
	}
	if (item.height > this.height - titleBarHeight - 8) {
		item.height = this.height - titleBarHeight - 8;
		item.width = item.height * item.aspect;
	}

	if (item.left < this.left + 4) {
		item.left = this.left + 4;
	} else if (item.left + item.width > this.left + this.width - 4) {
		item.left = this.left + this.width - 4 - item.width;
	}

	if (item.top < this.top + titleBarHeight + 4) {
		item.top = this.top + titleBarHeight + 4;
	} else if (item.top + item.height > this.top + this.height - 4) {
		item.top = this.top + this.height - 4 - item.height;
	}

	// save positions within partition as percentages of partition
	item.relative_left = (item.left - this.left) / this.width;
	item.relative_top = (item.top - this.top - titleBarHeight) / this.height;
	item.relative_width = item.width / this.width;
	item.relative_height = item.height / this.height;

	this.numChildren++;
	this.children[item.id] = item;

	return changedPartitions;
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
};

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

	return [this.id];
};

/**
  * Remove all Child applications from the partition
  */
Partition.prototype.releaseAllChildren = function() {
	var childIDs = Object.keys(this.children);

	childIDs.forEach((el) => {
		this.releaseChild(el);
	});

	return [this.id];
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

	return [this.id];
};

/**
  * Toggle partition tiling mode
  *
  */
Partition.prototype.toggleInnerTiling = function() {
	this.innerTiling = !this.innerTiling;
	console.log("Tiling:", this.innerTiling, this.id);

	if (this.innerTiling) {
		this.tilePartition();
	}

	return [this.id];
};

/**
  * Re-tile the apps within a partition
	* Tiling Algorithm taken from server.js
  */
Partition.prototype.tilePartition = function() {
	// TODO: run tiling algorithm on inner windows
	console.log("Performing tiling on", this.id);

	// alias for this
	var _this = this;

	var app;
	var i, c, r, key;
	var numCols, numRows, numCells;

	var displayAr  = this.width / this.height;
	var arDiff     = displayAr / averageWindowAspectRatio();
	var numWindows = this.numChildren;

	// 3 scenarios... windows are on average the same aspect ratio as the display
	if (arDiff >= 0.7 && arDiff <= 1.3) {
		numCols = Math.ceil(Math.sqrt(numWindows));
		numRows = Math.ceil(numWindows / numCols);
	} else if (arDiff < 0.7) {
		// windows are much wider than display
		c = Math.round(1 / (arDiff / 2.0));
		if (numWindows <= c) {
			numRows = numWindows;
			numCols = 1;
		} else {
			numCols = Math.max(2, Math.round(numWindows / c));
			numRows = Math.round(Math.ceil(numWindows / numCols));
		}
	} else {
		// windows are much taller than display
		c = Math.round(arDiff * 2);
		if (numWindows <= c) {
			numCols = numWindows;
			numRows = 1;
		} else {
			numRows = Math.max(2, Math.round(numWindows / c));
			numCols = Math.round(Math.ceil(numWindows / numRows));
		}
	}
	numCells = numRows * numCols;

	// determine the bounds of the tiling area
	var titleBar = this.partitionList.configuration.ui.titleBarHeight;
	if (this.partitionList.configuration.ui.auto_hide_ui === true) {
		titleBar = 0;
	}
	var areaX = 0;
	var areaY = Math.round(1.5 * titleBar); // keep 0.5 height as margin
	if (this.partitionList.configuration.ui.auto_hide_ui === true) {
		areaY = -this.partitionList.configuration.ui.titleBarHeight;
	}

	var areaW = this.width;
	var areaH = this.height - (1.0 * titleBar);

	var tileW = Math.floor(areaW / numCols);
	var tileH = Math.floor(areaH / numRows);

	var padding = 4;
	// if only one application, no padding, i.e maximize
	if (numWindows === 1) {
		padding = 0;
	}

	var centroidsApps  = {};
	var centroidsTiles = [];

	// Caculate apps centers
	for (key in this.children) {
		app = this.children[key];
		centroidsApps[key] = {x: app.left + app.width / 2.0, y: app.top + app.height / 2.0};
	}
	// Caculate tiles centers
	for (i = 0; i < numCells; i++) {
		c = i % numCols;
		r = Math.floor(i / numCols);
		centroidsTiles.push({x: (c * tileW + areaX) + tileW / 2.0, y: (r * tileH + areaY) + tileH / 2.0});
	}

	// Calculate distances
	var distances = {};
	for (key in centroidsApps) {
		distances[key] = [];
		for (i = 0; i < numCells; i++) {
			var d = distanceSquared2D(centroidsApps[key], centroidsTiles[i]);
			distances[key].push(d);
		}
	}

	for (key in this.children) {
		// get the application
		app = this.children[key];
		// pick a cell
		var cellid = findMinimum(distances[key]);
		// put infinite value to disable the chosen cell
		for (i in this.children) {
			distances[i][cellid] = Number.MAX_VALUE;
		}

		// calculate new dimensions
		c = cellid % numCols;
		r = Math.floor(cellid / numCols);
		var newdims = fitWithin(app, c * tileW + areaX, r * tileH + areaY, tileW, tileH, padding);

		// update the data structure
		app.left = newdims[0] + this.left;
		app.top = newdims[1] - titleBar + this.top;
		app.width = newdims[2];
		app.height = newdims[3];
		var updateItem = {
			elemId: app.id,
			elemLeft: app.left,
			elemTop: app.top,
			elemWidth: app.width,
			elemHeight: app.height,
			force: true,
			date: Date.now()
		};

		// broadcast('startMove', {id: updateItem.elemId, date: updateItem.date});
		// broadcast('startResize', {id: updateItem.elemId, date: updateItem.date});

		this.updateChild(app.id);

		// broadcast('finishedMove', {id: updateItem.elemId, date: updateItem.date});
		// broadcast('finishedResize', {id: updateItem.elemId, date: updateItem.date});
	}

	function averageWindowAspectRatio() {
		var num = _this.numChildren;

		if (num === 0) {
			return 1.0;
		}

		var totAr = 0.0;
		var key;
		for (key in _this.children) {
			totAr += (_this.children[key].width / _this.children[key].height);
		}
		return (totAr / num);
	}

	function fitWithin(app, x, y, width, height, margin) {
		var titleBar = _this.partitionList.configuration.ui.titleBarHeight;
		if (_this.partitionList.configuration.ui.auto_hide_ui === true) {
			titleBar = 0;
		}

		// take buffer into account
		x += margin;
		y += margin;
		width  = width  - 2 * margin;
		height = height - 2 * margin;

		var widthRatio  = (width - titleBar)  / app.width;
		var heightRatio = (height - titleBar) / app.height;
		var maximizeRatio;
		if (widthRatio > heightRatio) {
			maximizeRatio = heightRatio;
		} else {
			maximizeRatio = widthRatio;
		}

		// figure out the maximized app size (w/o the widgets)
		var newAppWidth  = Math.round(maximizeRatio * app.width);
		var newAppHeight = Math.round(maximizeRatio * app.height);

		// figure out the maximized app position (with the widgets)
		var postMaxX = Math.round(width / 2.0 - newAppWidth / 2.0);
		var postMaxY = Math.round(height / 2.0 - newAppHeight / 2.0);

		// the new position of the app considering the maximized state and
		// all the widgets around it
		var newAppX = x + postMaxX;
		var newAppY = y + postMaxY;

		return [newAppX, newAppY, newAppWidth, newAppHeight];
	}

	// Calculate the square of euclidian distance between two objects with .x and .y fields
	function distanceSquared2D(p1, p2) {
		var dx = p2.x - p1.x;
		var dy = p2.y - p1.y;
		return (dx * dx + dy * dy);
	}

	function findMinimum(arr) {
		var val = Number.MAX_VALUE;
		var idx = 0;
		for (var i = 0; i < arr.length; i++) {
			if (arr[i] < val) {
				val = arr[i];
				idx = i;
			}
		}
		return idx;
	}
};

/**
  * Toggle partition maximization mode
  */
Partition.prototype.toggleInnerMaximization = function() {
	this.innerMaximization = !this.innerMaximization;

	return [this.id];
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
  */
Partition.prototype.getDisplayInfo = function() {
	return {
		id: this.id,
		color: this.color,

		left: this.left,
		top: this.top,
		width: this.width,
		height: this.height
	};
};

/**
  * Get a string corresponding to the information needed to update the display
  */
Partition.prototype.getTitle = function() {
	var partitionString = "# Items: " + this.numChildren;

	if (this.innerMaximization && this.innerTiling) {
		partitionString += " | Maximized & Tiled";
	} else if (this.innerMaximization) {
		partitionString += " | Maximized";
	} else if (this.innerTiling) {
		partitionString += " | Tiled";
	}

	return {id: this.id, title: partitionString};
};


module.exports = Partition;
