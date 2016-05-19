// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/**
 * Implements sticky notes for SAGE2
 *
 * @module server
 * @submodule stickyitems
 */

// require variables to be declared
"use strict";

/**
 * Implements sticky notes for SAGE2
 *
 * @class StickyItems
 * @constructor
 * @return {Object} an object representing....
 */
function StickyItems() {
	this.stickyItemParent = {};
	this.stickyItemOffsetInfo = {};
}

/**
*
*
* @method getStickyItemsStructure
*/
StickyItems.prototype.getStickyItemsStructure = function() {
	var managerObj = {
		stickyItemParent: {},
		stickyItemOffsetInfo: {}
	};
	for (var key in this.stickyItemParent) {
		if (this.stickyItemParent.hasOwnProperty(key)) {
			managerObj.stickyItemParent[key] = [];
			for (var idx = 0; idx < this.stickyItemParent[key].length; idx++) {
				managerObj.stickyItemParent[key].push(this.stickyItemParent[key][idx].id);
			}
		}
	}
	for (var key2 in this.stickyItemOffsetInfo) {
		if (this.stickyItemOffsetInfo.hasOwnProperty(key2)) {
			managerObj.stickyItemOffsetInfo[key2] = this.stickyItemOffsetInfo[key2];
		}
	}
	return managerObj;
};

/**
*
*
* @method copyStickyItemsStructure
*/
StickyItems.prototype.copyStickyItemsStructure = function(managerObj) {
	this.stickyItemParent = {};
	this.stickyItemOffsetInfo = {};
	for (var key in managerObj.stickyItemParent) {
		if (managerObj.stickyItemParent.hasOwnProperty(key)) {
			this.stickyItemParent[key] = managerObj.stickyItemParent[key];
		}
	}
	for (var key2 in managerObj.stickyItemOffsetInfo) {
		if (managerObj.stickyItemOffsetInfo.hasOwnProperty(key2)) {
			this.stickyItemParent[key2] = managerObj.stickyItemParent[key2];
		}
	}
};

/**
*
*
* @method attachStickyItem
*/
StickyItems.prototype.attachStickyItem = function(backgroundItem, stickyItem) {
	if (backgroundItem.id === stickyItem.id) {
		return;
	}
	if (this.stickyItemParent[backgroundItem.id]) {
		if (this.stickyItemParent[backgroundItem.id].indexOf(stickyItem) < 0) {
			this.stickyItemParent[backgroundItem.id].push(stickyItem);
		}
	} else {
		this.stickyItemParent[backgroundItem.id] = [];
		this.stickyItemParent[backgroundItem.id].push(stickyItem);
	}
	this.stickyItemOffsetInfo[stickyItem.id] = {
		offsetX: (stickyItem.left - backgroundItem.left) / backgroundItem.width,
		offsetY: (stickyItem.top - backgroundItem.top) / backgroundItem.height
	};
};

/**
*
*
* @method attachStickyItemWithPredifnedOffset
*/
StickyItems.prototype.attachStickyItemWithPredifnedOffset = function(backgroundItem, stickyItem, offset) {
	if (backgroundItem.id === stickyItem.id) {
		return;
	}
	if (this.stickyItemParent[backgroundItem.id]) {
		if (this.stickyItemParent[backgroundItem.id].indexOf(stickyItem) < 0) {
			this.stickyItemParent[backgroundItem.id].push(stickyItem);
		}
	} else {
		this.stickyItemParent[backgroundItem.id] = [];
		this.stickyItemParent[backgroundItem.id].push(stickyItem);
	}
	this.stickyItemOffsetInfo[stickyItem.id] = offset;
};

/**
*
*
* @method detachStickyItem
*/
StickyItems.prototype.detachStickyItem = function(stickyItem) {
	for (var key in this.stickyItemParent) {
		if (this.stickyItemParent.hasOwnProperty(key)) {
			var idx = this.stickyItemParent[key].indexOf(stickyItem);
			if (idx > -1) {
				this.stickyItemParent[key].splice(idx, 1);
				if (this.stickyItemParent[key].length < 1) {
					delete this.stickyItemParent[key];
				}
				delete this.stickyItemOffsetInfo[stickyItem.id];
				break;
			}
		}
	}
};


/**
*
*
* @method removeElement
*/
StickyItems.prototype.removeElement = function(elem) {
	this.detachStickyItem(elem);
	if (elem.id in this.stickyItemParent) {
		delete this.stickyItemParent[elem.id];
	}
};

/**
*
*
* @method moveItemsStickingToUpdatedItem
*/
StickyItems.prototype.moveItemsStickingToUpdatedItem = function(updatedItem) {
	var moveItems = [];
	if (this.stickyItemParent[updatedItem.elemId]) {
		var list = this.stickyItemParent[updatedItem.elemId];
		for (var l in list) {
			list[l].left = updatedItem.elemLeft + this.stickyItemOffsetInfo[list[l].id].offsetX * updatedItem.elemWidth;
			list[l].top  = updatedItem.elemTop + this.stickyItemOffsetInfo[list[l].id].offsetY * updatedItem.elemHeight;
			var item     = {elemId: list[l].id, elemLeft: list[l].left, elemTop: list[l].top,
							elemWidth: list[l].width, elemHeight: list[l].height, date: new Date()};
			moveItems.push(item);
		}
	}
	return moveItems;
};

/**
*
*
* @method getStickingItems
*/
StickyItems.prototype.getStickingItems = function(elemId) {
	if (this.stickyItemParent[elemId]) {
		return this.stickyItemParent[elemId];
	}
	return [];
};



module.exports = StickyItems;
