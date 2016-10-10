// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-2015

/* global ignoreFields, SAGE2WidgetControl, SAGE2MEP */
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
var SAGE2_Partition = function(data) {
	this.id = data.id;
	this.color = hexToRgb(data.color);

	this.left = data.left;
	this.top = data.top;
	this.width = data.width;
	this.height = data.height;

	this.cornerSize = 0.2 * Math.min(this.width, this.height);

	console.log("SAGE2_Partition: Creating new Partition");

	var title = document.createElement('div');
	title.id = this.id + "_title";
	title.className = "partitionTitle";
	title.style.left = (-ui.offsetX).toString() + "px";
	title.style.top = (-ui.offsetY).toString() + "px";
	title.style.width = this.width + "px";
	title.style.height = 55 + "px";
	title.style.webkitTransform = "translate(" + this.left + "px," + this.top + "px)";
	title.style.mozTransform    = "translate(" + this.left + "px," + this.top + "px)";
	title.style.transform       = "translate(" + this.left + "px," + this.top + "px)";
	// title.style.backgroundColor = "rgba(" + this.color.r + "," + this.color.g + "," + this.color.b + ", 1)";
	// title.style.border = "rgba(" + (this.color.r * 0.6) + "," + (this.color.g * 0.6) + "," + (this.color.b * 0.6) + ", 1)";
	title.style.borderWidth = 4;
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
	partitionArea.style.mozTransform    = "translate(" + data.left + "px," +
			(data.top + ui.titleBarHeight) + "px)";
	partitionArea.style.transform       = "translate(" + data.left + "px," +
			(data.top + ui.titleBarHeight) + "px)";
	partitionArea.style.backgroundColor = "rgba(" + this.color.r + "," + this.color.g + "," + this.color.b + ", 0.25)";
	// partitionArea.style.border = "4px solid " + data.color;
	partitionArea.style.zIndex = 0;

	this.partitionArea = partitionArea;

	var titleIcons = document.createElement("img");
	titleIcons.src = "images/layout3.svg";
	titleIcons.height = Math.round(ui.titleBarHeight - 4);
	titleIcons.style.position = "absolute";
	titleIcons.style.right    = "0px";

	this.titleIcons = titleIcons;

	var clearcontentIcon = document.createElement("img");
	clearcontentIcon.src = "images/ui/clearcontent.svg";
	clearcontentIcon.height = Math.round(ui.titleBarHeight + 20);
	clearcontentIcon.style.position = "absolute";
	clearcontentIcon.style.left    	 = "0px";
	clearcontentIcon.style.top			 = "-10px";

	this.clearcontentIcon = clearcontentIcon;

	var tilecontentIcon = document.createElement("img");
	tilecontentIcon.src = "images/ui/tilecontent.svg";
	tilecontentIcon.height = Math.round(ui.titleBarHeight + 20);
	tilecontentIcon.style.position = "absolute";
	tilecontentIcon.style.left     = "75px";
	tilecontentIcon.style.top			 = "-10px";

	this.tilecontentIcon = tilecontentIcon;

	var titleText = document.createElement('p');
	titleText.id = this.id + "_titleText";
	tilecontentIcon.style.position = "absolute";
	titleText.style.top = "50%";
	titleText.style.color = "#FFFFFF";
	titleText.style.fontSize = Math.round(ui.titleTextSize) + "px";
	// titleText.style.marginLeft = Math.round(0.5 * ui.titleTextSize) + "px";
	titleText.textContent = "Partition: " + this.id;

	this.titleText = titleText;

	var dragCorner = document.createElement('div');
	dragCorner.className      = "dragCorner";
	dragCorner.style.position = "absolute";
	dragCorner.style.width    = this.cornerSize.toString() + "px";
	dragCorner.style.height   = this.cornerSize.toString() + "px";
	dragCorner.style.top      = (this.height - this.cornerSize).toString() + "px";
	dragCorner.style.left     = (this.width - this.cornerSize).toString() + "px";
	dragCorner.style.backgroundColor = "rgba(255,255,255,0.0)";
	dragCorner.style.border   = "none";
	dragCorner.style.zIndex   = "1000";

	this.dragCorner = dragCorner;

	this.title.appendChild(this.titleIcons);
	this.title.appendChild(this.clearcontentIcon);
	this.title.appendChild(this.tilecontentIcon);
	this.title.appendChild(this.titleText);
	this.partitionArea.appendChild(this.dragCorner);

	ui.main.appendChild(this.title);
	ui.main.appendChild(this.partitionArea);

	function hexToRgb(hex) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	}
};

/**
	* Delete all of the partition elements created
	*
	*/
SAGE2_Partition.prototype.deletePartition = function() {
	console.log("SAGE2_Partition: Deleting Partition", this.id);

	ui.main.removeChild(this.title);
	ui.main.removeChild(this.partitionArea);
};

/**
	* Update position and size of the partition based on the partition within the server
	*
	* @param {object} data - The object in the server corresponding to the partition
	*/
SAGE2_Partition.prototype.updatePositionAndSize = function(data) {
	this.left = data.left;
	this.top = data.top;

	this.title.style.webkitTransform = "translate(" + this.left + "px," + this.top + "px)";
	this.title.style.mozTransform    = "translate(" + this.left + "px," + this.top + "px)";
	this.title.style.transform       = "translate(" + this.left + "px," + this.top + "px)";

	this.partitionArea.style.webkitTransform = "translate(" + this.left + "px," +
			(this.top + ui.titleBarHeight) + "px)";
	this.partitionArea.style.mozTransform    = "translate(" + this.left + "px," +
			(this.top + ui.titleBarHeight) + "px)";
	this.partitionArea.style.transform       = "translate(" + this.left + "px," +
			(this.top + ui.titleBarHeight) + "px)";

	if (this.width !== data.width) {
		this.width = data.width;

		this.title.style.width = this.width + "px";
		this.partitionArea.style.width = this.width + "px";
		this.dragCorner.style.left     = (this.width - this.cornerSize).toString() + "px";
	}

	if (this.height != data.height) {
		this.height = data.height;

		this.partitionArea.style.height = this.height + "px";
		this.dragCorner.style.top = (this.height - this.cornerSize).toString() + "px";
	}

};

/**
	* Update position and size of the partition based on the partition within the server
	*
	* @param {string} title - The title of the partition
	*/
SAGE2_Partition.prototype.updateTitle = function(title) {
	this.titleText.textContent = title;
};