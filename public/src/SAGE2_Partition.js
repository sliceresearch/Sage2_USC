// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-2015

/* global ignoreFields, SAGE2WidgetControl, SAGE2PointerToNativeMouseEvent */
/* global addStoredFileListEventHandler, removeStoredFileListEventHandler */

/**
 * @module client
 * @submodule SAGE2_Partition
 */

/**
 * Base class for SAGE2 partitions
 *
 * @class SAGE2_Partition
 * @param {object} data - The object in the server corresponding to the partition
 */
var SAGE2_Partition = function (data) {
	this.id = data.id;
	this.color = hexToRgb(data.color);
	this.snapState = data.snapping;
	this.anchorState = data.anchor;

	this.left = data.left;
	this.top = data.top;
	this.width = data.width;
	this.height = data.height;

	this.cornerSize = 0.2 * Math.min(this.width, this.height);

	var title = document.createElement('div');
	title.id = this.id + "_title";
	title.className = "partitionTitle";
	title.style.left = (-ui.offsetX).toString() + "px";
	title.style.top = (-ui.offsetY).toString() + "px";
	title.style.width = this.width + "px";
	title.style.height = ui.titleBarHeight + "px";
	title.style.webkitTransform = "translate(" + this.left + "px," + this.top + "px)";
	title.style.mozTransform = "translate(" + this.left + "px," + this.top + "px)";
	title.style.transform = "translate(" + this.left + "px," + this.top + "px)";
	// title.style.backgroundColor = "rgba(" + this.color.r + "," + this.color.g + "," + this.color.b + ", 1)";
	// title.style.border = "rgba(" + (this.color.r * 0.6) + "," + (this.color.g * 0.6) + "," + (this.color.b * 0.6) + ", 1)";
	// title.style.borderWidth = 4;
	title.style.zIndex = 0;

	this.title = title;

	var partitionArea = document.createElement('div');
	partitionArea.id = this.id;
	partitionArea.className = "partitionArea";
	partitionArea.style.left = (-ui.offsetX).toString() + "px";
	partitionArea.style.top = (-ui.offsetY).toString() + "px";
	partitionArea.style.width = this.width + "px";
	partitionArea.style.height = this.height + "px";
	// sharingArea.style.borderWidth = (4 / this.scaleX) + "px";
	partitionArea.style.webkitTransform = "translate(" + data.left + "px," +
		(data.top + ui.titleBarHeight) + "px)";
	partitionArea.style.mozTransform = "translate(" + data.left + "px," +
		(data.top + ui.titleBarHeight) + "px)";
	partitionArea.style.transform = "translate(" + data.left + "px," +
		(data.top + ui.titleBarHeight) + "px)";
	partitionArea.style.backgroundColor = "rgba(" + this.color.r + "," + this.color.g + "," + this.color.b + ", 0.25)";
	// partitionArea.style.border = "4px solid " + data.color;
	partitionArea.style.border = "4px solid #a5a5a5";
	partitionArea.style.zIndex = 0;

	this.partitionArea = partitionArea;
	// update border immediately based on snap/anchor states
	this.updateBorders();

	var closeIcon = document.createElement("img");
	closeIcon.src = "images/window-close3.svg";
	closeIcon.height = Math.round(ui.titleBarHeight - 4);
	closeIcon.style.position = "absolute";
	closeIcon.style.right = "0px";

	this.closeIcon = closeIcon;

	var maxIcon = document.createElement("img");
	maxIcon.src = "images/window-fullscreen.svg";
	maxIcon.height = Math.round(ui.titleBarHeight - 4);
	maxIcon.style.position = "absolute";
	maxIcon.style.right = (ui.titleBarHeight * 1.25) + "px";

	this.maxIcon = maxIcon;

	var clearcontentIcon = document.createElement("img");
	clearcontentIcon.src = "images/ui/clearcontent.svg";
	clearcontentIcon.height = Math.round(ui.titleBarHeight + 20);
	clearcontentIcon.style.position = "absolute";
	clearcontentIcon.style.left = "0px";
	clearcontentIcon.style.top = "-12px";

	this.clearcontentIcon = clearcontentIcon;

	var tilecontentIcon = document.createElement("img");
	tilecontentIcon.src = "images/ui/tilecontent.svg";
	tilecontentIcon.height = Math.round(ui.titleBarHeight + 20);
	tilecontentIcon.style.position = "absolute";
	tilecontentIcon.style.left = (ui.titleBarHeight * 1.25) + "px";
	tilecontentIcon.style.top = "-12px";

	this.tilecontentIcon = tilecontentIcon;

	var titleText = document.createElement('p');
	titleText.id = this.id + "_titleText";
	tilecontentIcon.style.position = "absolute";
	titleText.style.top = "50%";
	titleText.style.color = "#FFFFFF";
	titleText.style.fontSize = Math.round(ui.titleTextSize) + "px";
	titleText.style.transform = "translateY(20%)";
	// titleText.style.marginLeft = Math.round(0.5 * ui.titleTextSize) + "px";
	titleText.textContent = "Partition: " + this.id;

	this.titleText = titleText;

	var dragCorner = document.createElement('div');
	dragCorner.className = "dragCorner";
	dragCorner.style.position = "absolute";
	dragCorner.style.width = this.cornerSize.toString() + "px";
	dragCorner.style.height = this.cornerSize.toString() + "px";
	dragCorner.style.bottom = "0px";
	dragCorner.style.right = "0px";
	dragCorner.style.backgroundColor = "rgba(255,255,255,0.0)";
	dragCorner.style.border = "none";
	dragCorner.style.zIndex = "1000";

	this.dragCorner = dragCorner;

	this.title.appendChild(this.maxIcon);
	this.title.appendChild(this.closeIcon);
	this.title.appendChild(this.clearcontentIcon);
	this.title.appendChild(this.tilecontentIcon);
	this.title.appendChild(this.titleText);
	this.partitionArea.appendChild(this.dragCorner);

	ui.main.appendChild(this.partitionArea);
	ui.main.appendChild(this.title);

	function hexToRgb(hex) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : {
			r: 200,
			g: 200,
			b: 200
		};
	}
};

/**
 * Delete all of the partition elements created
 *
 */
SAGE2_Partition.prototype.deletePartition = function () {

	ui.main.removeChild(this.title);
	ui.main.removeChild(this.partitionArea);
};

/**
 * Update position and size of the partition based on the partition within the server
 *
 * @param {object} data - The object in the server corresponding to the partition
 */
SAGE2_Partition.prototype.updatePositionAndSize = function (data) {
	this.left = data.left;
	this.top = data.top;

	this.title.style.webkitTransform = "translate(" + this.left + "px," + this.top + "px)";
	this.title.style.mozTransform = "translate(" + this.left + "px," + this.top + "px)";
	this.title.style.transform = "translate(" + this.left + "px," + this.top + "px)";

	this.partitionArea.style.webkitTransform = "translate(" + this.left + "px," +
		(this.top + ui.titleBarHeight) + "px)";
	this.partitionArea.style.mozTransform = "translate(" + this.left + "px," +
		(this.top + ui.titleBarHeight) + "px)";
	this.partitionArea.style.transform = "translate(" + this.left + "px," +
		(this.top + ui.titleBarHeight) + "px)";

	this.cornerSize = Math.min(data.width, data.height) / 5;

	this.dragCorner.style.width = this.cornerSize + "px";
	this.dragCorner.style.height = this.cornerSize + "px";

	if (this.width !== data.width) {
		this.width = data.width;

		this.title.style.width = this.width + "px";
		this.partitionArea.style.width = this.width + "px";
	}

	if (this.height != data.height) {
		this.height = data.height;

		this.partitionArea.style.height = this.height + "px";
	}

};

/**
 * Update the backgorund color of a partition based on a hex string
 *
 * @param {string} color - The new color for the partition
 */
SAGE2_Partition.prototype.updateColor = function (data) {
	this.color = hexToRgb(data);

	this.partitionArea.style.backgroundColor = "rgba(" + this.color.r + "," + this.color.g + "," + this.color.b + ", 0.25)";

	// borders may have to be updated since they are colored when snapped
	this.updateBorders();

	function hexToRgb(hex) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : {
			r: 200,
			g: 200,
			b: 200
		};
	}
};

/**
 * Update position and size of the partition based on the partition within the server
 *
 * @param {string} title - The title of the partition
 */
SAGE2_Partition.prototype.updateTitle = function (title) {
	this.titleText.textContent = title;
};

/**
 * Update partition borders (highlighted if app will be dropped in)
 *
 * @param {bool} selected - Whether or not this partition is selected
 */
SAGE2_Partition.prototype.updateSelected = function (selected) {
	if (selected) {
		// set a custom yellow border
		this.partitionArea.style.border = "6px solid #fff723";
	} else {
		// reset borders
		this.partitionArea.style.border = "4px solid #a5a5a5";

		this.updateBorders();
	}
};

/**
 * Set snapping state of partition on display (connection to neighboring partitions)
 *
 * @param {object} snapped - Object with keys for each side of partition and flags for the snapping state of the sides
 */
SAGE2_Partition.prototype.setSnappedBorders = function (snapped) {
	this.snapState = snapped;
};

/**
 * Set anchored state of partition on display (anchor to edges of display)
 *
 * @param {object} anchored - Object with keys for each side of partition and flags for the anchored state of the sides
 */
SAGE2_Partition.prototype.setAnchoredBorders = function (anchored) {
	this.anchorState = anchored;
};

/**
 * Update borders of partition based on snapping and anchored state
 */
SAGE2_Partition.prototype.updateBorders = function () {
	let defaultStyle = "4px solid #a5a5a5";
	let snapStyle = "2px groove rgba(" + this.color.r + ", " + this.color.g + ", " + this.color.b + ", 0.25)";
	let anchorStyle = "4px ridge #999999";

	let titleSnapStyle = "2px groove #a5a5a5";

	// update style of borders right -> bottom -> left

	let sides = ["Right", "Bottom", "Left"];

	for (let side of sides) {
		if (this.anchorState[side.toLowerCase()]) {
			this.partitionArea.style["border" + side] = anchorStyle;
		} else if (this.snapState[side.toLowerCase()]) {
			this.partitionArea.style["border" + side] = snapStyle;
		} else {
			this.partitionArea.style["border" + side] = defaultStyle;
		}
	}

	let titleSides = ["Top", "Right", "Left"];

	for (let side of titleSides) {
		if (this.anchorState[side.toLowerCase()]) {
			this.title.style["border" + side] = anchorStyle;
		} else if (this.snapState[side.toLowerCase()]) {
			this.title.style["border" + side] = titleSnapStyle;
		} else {
			this.title.style["border" + side] = defaultStyle;
		}
	}

	if (this.anchorState.top || this.snapState.top) {
		this.title.style.borderBottom = "3px solid #6b6b6b";
		this.partitionArea.style.borderTop = snapStyle;
	} else {
		this.title.style.borderBottom = defaultStyle;
		this.partitionArea.style.borderTop = defaultStyle;
	}
};
