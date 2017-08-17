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


var StickyItems         = require('./node-stickyitems');
var stickyAppHandler     = new StickyItems();

/**
  * @class Partition
  * @constructor
  */
function Partition(dims, id, color, partitionList) {
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

	this.resizeMode = "free";
	this.maximized = false;

	this.id = id;
	this.color = color;

	this.bounding = true;

	this.innerTiling = false;
	this.currentMaximizedChild = null;

	// for the more geometric idea of partitions
	this.isSnapping = dims.isSnapping || false;
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

	if (this.innerTiling && this.currentMaximizedChild) {
		this.maximizeChild(item.id);
	}

	var stickingItems = stickyAppHandler.getFirstLevelStickingItems(item);
	for (var s in stickingItems) {
		this.addChild(stickingItems[s]);
	}
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
		var movedItems = stickyAppHandler.moveFirstLevelItemsStickingToUpdatedItem(item);
		for (var mI in movedItems) {
			this.updateChild(movedItems[mI].elemId);
		}
	}

	return [this.id];
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

		// if it is tiling and maximized, maximize another child
		if (this.innerTiling && this.currentMaximizedChild === id) {

			if (Object.keys(this.children).length > 0) {
				this.maximizeChild(Object.keys(this.children)[0]);
			} else {
				this.currentMaximizedChild = null;
			}
		}
		var stickingItems = stickyAppHandler.getFirstLevelStickingItems(item);
		for (var s in stickingItems) {
			this.releaseChild(stickingItems[s].id);
		}
	}

	return [this.id];
};

/**
  * Remove all Child applications from the partition
  */
Partition.prototype.releaseAllChildren = function() {
	var childIDs = Object.keys(this.children);


	childIDs.forEach((cID) => {
		this.releaseChild(cID);
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

	if (this.innerTiling) {
		this.tilePartition();
	}

	return [this.id];
};

/**
  * Toggle partition tiling mode
  *
  */
Partition.prototype.setColor = function (color) {
	console.log(color);
	this.color = color;
};



/**
  * Re-tile the apps within a partition
	* Tiling Algorithm taken from server.js
  */
Partition.prototype.tilePartition = function() {

	// alias for this
	var _this = this;

	var app;
	var i, c, r, key;
	var numCols, numRows, numCells;

	var backgroundAndForegroundItems = stickyAppHandler.getListOfBackgroundAndForegroundItems(this.children);
	var appsWithoutBackground = backgroundAndForegroundItems.backgroundItems;
	var numAppsWithoutBackground = appsWithoutBackground.length;

	// Don't use sticking items to compute number of windows.
	var numWindows = numAppsWithoutBackground - (this.currentMaximizedChild ? 1 : 0);


	// determine the bounds of the tiling area
	var titleBar = this.partitionList.configuration.ui.titleBarHeight;
	// if (this.partitionList.configuration.ui.auto_hide_ui === true) {
	// 	titleBar = 0;
	// }

	var tilingArea = {
		left: this.left,
		top: this.top + titleBar,
		width: this.width,
		height: this.height
	};

	var maxChildCopy = null;

	if (this.currentMaximizedChild) {

		let maxChild = this.children[this.currentMaximizedChild];

		if (numWindows === 0) {
			// if the maximized window is the only window
			// place in center
			maxChild.left = this.left + this.width / 2 - maxChild.width / 2;
			maxChild.top = this.top + (this.height - maxChild.height + titleBar) / 2;

			this.updateChild(this.currentMaximizedChild);
			return;
		}

		if (maxChild.maximizeConstraint === "width_ptn") {
			// aspect ratio is wider than partition

			// shift maximized child to top
			maxChild.top = this.top + 2 * titleBar;

			// adjust tiling area to be rest of space
			tilingArea.top = maxChild.top + maxChild.height;
			tilingArea.height = this.height - maxChild.height - titleBar;
		} else if (maxChild.maximizeConstraint === "height_ptn") {
			// aspect ratio is taller than partition

			// shift maximized child to left
			maxChild.left = this.left + 4;

			// adjust tiling area to be rest of space
			tilingArea.left = maxChild.left + maxChild.width;
			tilingArea.width = this.width - maxChild.width;
		}

		// shift maximized child to top-left
		maxChild.top = this.top + titleBar + 4;
		maxChild.left = this.left + 4;

		maxChildCopy = Object.assign({}, maxChild);
		this.updateChild(this.currentMaximizedChild);
	}

	if (numWindows === 0) {
		// return if no windows
		return;
	}

	var displayAr  = tilingArea.width / tilingArea.height;
	var arDiff     = displayAr / averageWindowAspectRatio();

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

	var areaX = 0;
	var areaY = Math.round(1.5 * titleBar); // keep 0.5 height as margin
	// if (this.partitionList.configuration.ui.auto_hide_ui === true) {
	// 	areaY = -this.partitionList.configuration.ui.titleBarHeight;
	// }

	var areaW = tilingArea.width;
	var areaH = tilingArea.height - (1.0 * titleBar);

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
	// use a subset of children excluding maximizedChild

	for (key in appsWithoutBackground) {
		app = appsWithoutBackground[key];
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

	for (key in appsWithoutBackground) {
		// get the application
		app = appsWithoutBackground[key];

		// pick a cell
		var cellid = findMinimum(distances[key]);
		// put infinite value to disable the chosen cell
		for (i in appsWithoutBackground) {
			distances[i][cellid] = Number.MAX_VALUE;
		}

		// calculate new dimensions
		c = cellid % numCols;
		r = Math.floor(cellid / numCols);
		var newdims = fitWithin(app, c * tileW + areaX, r * tileH + areaY, tileW, tileH, padding);

		// update the data structure
		app.left = newdims[0] + tilingArea.left;
		app.top = newdims[1] - titleBar + tilingArea.top - titleBar / 2;
		app.width = newdims[2];
		app.height = newdims[3];

		// var updateItem = {
		// 	elemId: app.id,
		// 	elemLeft: app.left,
		// 	elemTop: app.top,
		// 	elemWidth: app.width,
		// 	elemHeight: app.height,
		// 	force: true,
		// 	date: Date.now()
		// };

		// broadcast('startMove', {id: updateItem.elemId, date: updateItem.date});
		// broadcast('startResize', {id: updateItem.elemId, date: updateItem.date});
		stickyAppHandler.pileItemsStickingToUpdatedItem(app);
		this.updateChild(app.id);
		// broadcast('finishedMove', {id: updateItem.elemId, date: updateItem.date});
		// broadcast('finishedResize', {id: updateItem.elemId, date: updateItem.date});
	}
	//Restore maximized app's dimensions and position
	if (this.currentMaximizedChild) {
		let maxChild = this.children[this.currentMaximizedChild];
		maxChild.left = maxChildCopy.left;
		maxChild.top = maxChildCopy.top;
		maxChild.width = maxChildCopy.width;
		maxChild.height = maxChildCopy.height;
		this.updateChild(this.currentMaximizedChild);
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
		// if (_this.partitionList.configuration.ui.auto_hide_ui === true) {
		// 	titleBar = 0;
		// }

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
  * Maximize a specific child in the partition
  *
  * @param {string} id - The id of child to maximize
  */
Partition.prototype.maximizeChild = function(id, shift) {
	if (this.children.hasOwnProperty(id)) {
		var item = this.children[id];
		var config = this.partitionList.configuration;

		// normally is just the screen size, but if in partition it is the partition boundaries
		var titleBar = config.ui.titleBarHeight;
		// if (config.ui.auto_hide_ui === true) {
		// 	titleBar = 0;
		// }

		// only 1 child maximized in tiled mode
		if (this.innerTiling) {
			if (this.currentMaximizedChild) {
				this.restoreChild(this.currentMaximizedChild);
			}
			this.currentMaximizedChild = id;
		}

		var maxBound = {
			left: this.left + 4,
			top: this.top + 4,
			width: this.width - 8,
			height: this.height - 8
		};

		var outerRatio = maxBound.width  / maxBound.height;
		var iCenterX  = item.left + item.width / 2.0;
		var iCenterY  = item.top + item.height / 2.0;
		var iWidth    = 1;
		var iHeight   = 1;


		if (shift === true && item.resizeMode === "free") {
			// previously would resize to native height/width
			// item.aspect = item.native_width / item.native_height;

			// Free Resize aspect ratio fills wall
			iWidth = maxBound.width;
			iHeight = maxBound.height - titleBar;
			item.maximizeConstraint = "none_ptn";
		} else {
			if (item.aspect > outerRatio) {
				// Image wider than wall area
				iWidth  = maxBound.width;
				iHeight = iWidth / item.aspect;
				item.maximizeConstraint = "width_ptn";
			} else {
				// Wall area than image
				iHeight = maxBound.height - titleBar;
				iWidth  = iHeight * item.aspect;
				item.maximizeConstraint = "height_ptn";
			}
		}

		// back up values for restore
		item.previous_left   = item.left;
		item.previous_top    = item.top;
		item.previous_width  = item.width;
		item.previous_height = item.width / item.aspect;

		item.previous_relative_left = item.relative_left;
		item.previous_relative_top = item.relative_top;
		item.previous_relative_width = item.relative_width;
		item.previous_relative_height = item.relative_height;

		// calculate new values
		item.top    = iCenterY - (iHeight / 2);
		item.width  = iWidth;
		item.height = iHeight;

		// keep window inside display horizontally
		if (iCenterX - (iWidth / 2) < maxBound.left) {
			item.left = maxBound.left;
		} else if (iCenterX + (iWidth / 2) > maxBound.left + maxBound.width) {
			item.left = maxBound.width + maxBound.left - iWidth;
		} else {
			item.left = iCenterX - (iWidth / 2);
		}

		// keep window inside display vertically
		if (iCenterY - (iHeight / 2) < maxBound.top + titleBar) {
			item.top = maxBound.top + titleBar;
		} else if (iCenterY + (iHeight / 2) > maxBound.top + (maxBound.height + titleBar)) {
			item.top = maxBound.top + maxBound.height - iHeight;
		} else {
			item.top = iCenterY - (iHeight / 2);
		}

		// Shift by 'titleBarHeight' if no auto-hide
		// if (this.partitionList.configuration.ui.auto_hide_ui === true) {
		// 	item.top = item.top - this.partitionList.configuration.ui.titleBarHeight;
		// }

		this.updateChild(item.id);

		item.maximized = true;

		return {
			elemId: item.id, elemLeft: item.left, elemTop: item.top,
			elemWidth: item.width, elemHeight: item.height, date: new Date()
		};
	}

	return null;
};

/**
  * Restore a specific child in the partition
  *
  * @param {string} id - The id of child to restore
  */
Partition.prototype.restoreChild = function(id, shift) {
	if (this.children.hasOwnProperty(id)) {
		var item = this.children[id];

		this.currentMaximizedChild = null;

		if (shift === true) {
			// resize to native width/height
			item.aspect = item.native_width / item.native_height;
			item.left = item.previous_left + item.previous_width / 2 - item.native_width / 2;
			item.top = item.previous_top + item.previous_height / 2 - item.native_height / 2;
			item.width = item.native_width;
			item.height = item.native_height;
		} else {
			item.left   = item.previous_relative_left * this.width + this.left;
			item.top    = item.previous_relative_top * this.height +
				this.top + this.partitionList.configuration.ui.titleBarHeight;
			item.width  = item.previous_relative_width * this.width;
			item.height = item.previous_relative_height * this.height;
		}

		this.updateChild(item.id);

		item.maximized = false;

		return {
			elemId: item.id, elemLeft: item.left, elemTop: item.top,
			elemWidth: item.width, elemHeight: item.height, date: new Date()
		};
	}

	return null;
};

/**
  * Updates the inner layout of the Partition according to whether or not
	* the partition is in innerTiling mode or has a maximized child mode or both
  *
  * @param {string} id - The id of child to restore
  */
Partition.prototype.updateInnerLayout = function() {
	if (this.currentMaximizedChild) {
		this.maximizeChild(this.currentMaximizedChild);
	}

	if (this.innerTiling) {
		this.tilePartition();
	}
};


/**
  * Updates positions of all children based on the relative positions of the children
	* within the Partition and the size of the Partition. Used when a Partition is moved
	* or resized and the children should also resize/move. Returns a list of children
	* which have been moved.
  *
  */
Partition.prototype.updateChildrenPositions = function() {
	var updatedChildren = [];

	var backgroundAndForegroundItems = stickyAppHandler.getListOfBackgroundAndForegroundItems(this.children);
	var appsWithoutBackground = backgroundAndForegroundItems.backgroundItems;
	var titleBarHeight = this.partitionList.configuration.ui.titleBarHeight;

	appsWithoutBackground.forEach((item) => {
		item.left = item.relative_left * this.width + this.left;
		item.top = item.relative_top * this.height + this.top + titleBarHeight;
		item.width = item.relative_width * this.width;
		item.height = item.relative_height * this.height;

		if (item.resizeMode !== "free") {
			if (item.aspect < item.width / item.height) {
				item.width = item.height * item.aspect;
			} else {
				item.height = item.width / item.aspect;
			}
		}

		updatedChildren.push({
			elemId: item.id, elemLeft: item.left, elemTop: item.top,
			elemWidth: item.width, elemHeight: item.height, date: new Date()
		});
	});

	return updatedChildren;
};

/**
  * Returns the movement bounds of a Partition by the minimum and maximum coordinate
	* that each side can move to. This is only applicable when a partition has neighbors
	* while snapped.
  *
  */
Partition.prototype.getMovementBoundaries = function() {
	let partitions = this.partitionList;
	let config = partitions.configuration;
	let titleBar = config.ui.titleBarHeight;

	// bounds to be used to clamp this partitions position/size and then update neighbors
	let partitionMovementBounds = {
		left: {},
		right: {},
		top: {},
		bottom: {}
	};

	// initialized with maximum in every dimension
	// after populating array, take max of min bounds, min of max bounds
	let boundCollections = {
		left: {min: [0], max: [config.totalWidth - partitions.minSize.width]},
		right: {min: [partitions.minSize.width], max: [config.totalWidth]},
		top: {min: [titleBar], max: [config.totalHeight - partitions.minSize.height]},
		bottom: {min: [titleBar + partitions.minSize.height], max: [config.totalHeight - titleBar]}
	};

	// calculate the bounds that the current partition can move
	for (let ptnID of Object.keys(this.neighbors)) {
		let neighPtn = partitions.list[ptnID];
		let neighInfo = this.neighbors[ptnID];

		// if the top of this partition is shared with the bottom of another
		if (neighInfo.top) {

			// check which of the 2 sides is the same
			if (neighInfo.top === "bottom") {
				boundCollections.top.min.push(neighPtn.top + partitions.minSize.height + titleBar);
			} else { // "top"
				boundCollections.top.max.push(neighPtn.top + neighPtn.height - partitions.minSize.height);
			}
		}
		// if the bottom of this partition is shared with the top of another
		if (neighInfo.bottom) {
			if (neighInfo.bottom === "top") {
				boundCollections.bottom.max.push(neighPtn.top + neighPtn.height - partitions.minSize.height - titleBar);
			} else { // "bottom"
				boundCollections.bottom.min.push(neighPtn.top + partitions.minSize.height);
			}
		}
		// if the left of this partition is shared with the right of another
		if (neighInfo.left) {
			if (neighInfo.left === "right") {
				boundCollections.left.min.push(neighPtn.left + partitions.minSize.width);
			} else { // "left"
				boundCollections.left.max.push(neighPtn.left + neighPtn.width - partitions.minSize.width);
			}
		}
		// if the right of this partition is shared with the left of another
		if (neighInfo.right) {
			if (neighInfo.right === "left") {
				boundCollections.right.max.push(neighPtn.left + neighPtn.width - partitions.minSize.width);
			} else { // "right"
				boundCollections.right.min.push(neighPtn.left + partitions.minSize.width);
			}
		}
	}

	// calculate take max of min bounds, min of max bounds of each bound collection
	for (let side of Object.keys(boundCollections)) {
		partitionMovementBounds[side].min = Math.max(...boundCollections[side].min);
		partitionMovementBounds[side].max = Math.min(...boundCollections[side].max);
	}

	return partitionMovementBounds;
};

/**
  * Clamps each side of the Partition to be within each's respective boundary.
  *
	* @param {object} boundaries - The movement boundaries of a Partition (from Partition.getMovementBoundaries)
  */
Partition.prototype.clampPositionWithinBoundaries = function (boundaries) {
	let partitions = this.partitionList;
	let config = partitions.configuration;
	let titleBar = config.ui.titleBarHeight;

	// clamp this partition within the bounds
	let newPositionAfterClamp = {
		left: this.left,
		right: this.left + this.width,
		top: this.top,
		bottom: this.top + this.height
	};

	// clamp left
	if (this.left < boundaries.left.min) {
		newPositionAfterClamp.left = boundaries.left.min;
	} else if (this.left > boundaries.left.max) {
		newPositionAfterClamp.left = boundaries.left.max;
	}

	// clamp top
	if (this.top < boundaries.top.min) {
		newPositionAfterClamp.top = boundaries.top.min;
	} else if (this.top > boundaries.top.max) {
		newPositionAfterClamp.top = boundaries.top.max;
	}

	// clamp right
	if (this.left + this.width < boundaries.right.min) {
		newPositionAfterClamp.right = boundaries.right.min;
	} else if (this.left + this.width > boundaries.right.max) {
		newPositionAfterClamp.right = boundaries.right.max;
	}

	// clamp bottom
	if (this.top + this.height < boundaries.bottom.min) {
		newPositionAfterClamp.bottom = boundaries.bottom.min;
	} else if (this.top + this.height > boundaries.bottom.max) {
		newPositionAfterClamp.bottom = boundaries.bottom.max;
	}

	// check for screen boundary snapping
	if (this.snapTop) {
		newPositionAfterClamp.top = titleBar;
	}
	if (this.snapLeft) {
		newPositionAfterClamp.left = 0;
	}
	if (this.snapRight) {
		newPositionAfterClamp.right = config.totalWidth;
	}
	if (this.snapBottom) {
		newPositionAfterClamp.bottom = config.totalHeight - titleBar;
	}

	this.left = newPositionAfterClamp.left;
	this.top = newPositionAfterClamp.top;
	this.width = newPositionAfterClamp.right - this.left;
	this.height = newPositionAfterClamp.bottom - this.top;
};

/**
  * Updates the position of all of the Partitions neighbors based on the position of the Partition
	* after it has been clamped into its boundaries.
  */
Partition.prototype.updateNeighborPtnPositions = function() {
	let partitions = this.partitionList;
	let config = partitions.configuration;
	let titleBar = config.ui.titleBarHeight;

	// bounds to be used to clamp this partitions position/size and then update neighbors
	let partitionMovementBounds = this.getMovementBoundaries();

	// clamp with those bounds
	this.clampPositionWithinBoundaries(partitionMovementBounds);

	// update all neighbors based on this position of the partition

	let updatedPtnIDs = [];

	for (var neigh of Object.keys(this.neighbors)) {

		// make sure this partition is in partitions (list)
		if (partitions.list.hasOwnProperty(neigh)) {
			let neighPtn = partitions.list[neigh];
			let isUpdated = false;

			// if the top of this partition is shared with the bottom of another
			if (this.neighbors[neigh].top) {

				// check which of the 2 sides is the same
				if (this.neighbors[neigh].top === "bottom") {
					// adjust height of neighbor
					neighPtn.height = this.top - neighPtn.top - titleBar;

					isUpdated = true;
				} else { // "top"
					// save bottom coordinate
					let botCoord = neighPtn.top + neighPtn.height;

					// adjust the top and height of neighbor
					neighPtn.top = this.top;
					neighPtn.height = botCoord - neighPtn.top;

					isUpdated = true;
				}
			}
			// if the bottom of this partition is shared with the top of another
			if (this.neighbors[neigh].bottom) {
				if (this.neighbors[neigh].bottom === "top") {
					// save bottom coordinate
					let botCoord = neighPtn.top + neighPtn.height;

					// adjust the top and height of neighbor
					neighPtn.top = this.top + this.height + titleBar;
					neighPtn.height = botCoord - neighPtn.top;

					isUpdated = true;
				} else { // "bottom"
					// adjust height of neighbor
					neighPtn.height = this.top + this.height - neighPtn.top;

					isUpdated = true;
				}
			}
			// if the left of this partition is shared with the right of another
			if (this.neighbors[neigh].left) {
				if (this.neighbors[neigh].left === "right") {
					// adjust width of neighbor
					neighPtn.width = this.left - neighPtn.left;

					isUpdated = true;
				} else { // "left"
					// save right coordinate
					let rightCoord = neighPtn.left + neighPtn.width;

					// adjust the left and width of neighbor
					neighPtn.left = this.left;
					neighPtn.width = rightCoord - neighPtn.left;

					isUpdated = true;
				}
			}
			// if the right of this partition is shared with the left of another
			if (this.neighbors[neigh].right) {
				if (this.neighbors[neigh].right === "left") {
					// save right coordinate
					let rightCoord = neighPtn.left + neighPtn.width;

					// adjust the left and width of neighbor
					neighPtn.left = this.left + this.width;
					neighPtn.width = rightCoord - neighPtn.left;

					isUpdated = true;
				} else { // "right"
					// adjust width of neighbor
					neighPtn.width = this.left + this.width - neighPtn.left;

					isUpdated = true;
				}
			}

			if (isUpdated) {
				updatedPtnIDs.push(neigh);
			}
		}
	}

	// return the IDs of updated Partitions so the updates can be reflected in
	// ui and display
	return updatedPtnIDs;
};

/**
  * Toggles whether or not the Partition is being snapped to its neighbors.
  */
Partition.prototype.toggleSnapping = function() {
	this.isSnapping = !this.isSnapping;

	return this.updateNeighborPartitionList();
};

/**
  * Updates the list of neighbors and which side they are neighboring on for this
	* Partition
  */
Partition.prototype.updateNeighborPartitionList = function() {
	return this.partitionList.updateNeighbors(this.id);
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
		height: this.height,

		// snapped to other partitions
		snapping: !this.isSnapping || !this.neighbors ? {left: false, right: false, top: false, bottom: false} : {
			left: Object.values(this.neighbors).reduce((snapped, neighbor) => snapped || neighbor.left, false),
			right: Object.values(this.neighbors).reduce((snapped, neighbor) => snapped || neighbor.right, false),
			top: Object.values(this.neighbors).reduce((snapped, neighbor) => snapped || neighbor.top, false),
			bottom: Object.values(this.neighbors).reduce((snapped, neighbor) => snapped || neighbor.bottom, false)
		},

		// anchored to sides of screen
		anchor: {
			left: this.snapLeft,
			right: this.snapRight,
			top: this.snapTop,
			bottom: this.snapBottom
		}
	};
};

/**
  * Get a string corresponding to the information needed to update the display
  */
Partition.prototype.getTitle = function() {
	var partitionString = "";
	if (this.numChildren === 0) {
		partitionString = "Empty";
	} else if (this.numChildren === 1) {
		partitionString = "1 Item";
	} else {
		partitionString = this.numChildren + " Items";
	}
	if (this.currentMaximizedChild && this.innerTiling) {
		partitionString += " | Maximized & Tiled";
	} else if (this.innerTiling) {
		partitionString += " | Tiled";
	}

	return {
		id: this.id,
		title: partitionString
	};
};

/**
  * Create the context menu based on the current state of the Partition
  */
Partition.prototype.getContextMenu = function() {
	var contextMenu = [];

	contextMenu.push({
		description: "Set Color:",
		callback: "setColor",
		value: this.color,
		inputField: true,
		inputFieldSize: 7,
		inputDefault: this.color,
		parameters: {}
	});

	contextMenu.push({
		description: this.innerTiling ? "Stop Tiling" : "Tile Content",
		callback: "toggleInnerTiling",
		parameters: {}
	});
	contextMenu.push({
		description: "Clear Content",
		callback: "clearPartition",
		parameters: {}
	});

	contextMenu.push({
		description: "separator"
	});


	contextMenu.push({
		description: this.isSnapping ? "Un-Snap Partition" : "Snap Partition",
		callback: "toggleSnapping",
		parameters: {}
	});

	if (this.isSnapping) {
		contextMenu.push({
			description: "Update Snapped Neighbors",
			callback: "updateNeighborPartitionList",
			parameters: {}
		});
	}

	contextMenu.push({
		description: "separator"
	});

	contextMenu.push({
		description: this.maximized ? "Restore Partition" : "Maximize Partition",
		callback: "SAGE2Maximize",
		parameters: {}
	});
	contextMenu.push({
		description: "Close Partition",
		callback: "SAGE2DeleteElement",
		parameters: {}
	});

	return contextMenu;
};


module.exports = Partition;
