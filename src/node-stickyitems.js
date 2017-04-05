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
	this.notPinnedAppsList = [];
}

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
		offsetX: 100.0 * (stickyItem.left - backgroundItem.left) / backgroundItem.width,
		offsetY: 100.0 * (stickyItem.top - backgroundItem.top) / backgroundItem.height
	};
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
StickyItems.prototype.moveItemsStickingToUpdatedItem = function (updatedItem) {
	var moveItems = [];
	if (this.stickyItemParent[updatedItem.elemId] !== null && this.stickyItemParent[updatedItem.elemId] !== undefined) {
		var list = this.stickyItemParent[updatedItem.elemId];
		for (var l in list) {
			list[l].left = updatedItem.elemLeft + this.stickyItemOffsetInfo[list[l].id].offsetX / 100.0 * updatedItem.elemWidth;
			list[l].top  = updatedItem.elemTop + this.stickyItemOffsetInfo[list[l].id].offsetY / 100.0 * updatedItem.elemHeight;
			var item     = {
				elemId: list[l].id, elemLeft: list[l].left, elemTop: list[l].top,
				elemWidth: list[l].width, elemHeight: list[l].height, date: new Date()
			};
			moveItems.push(item);
			var oneDeepItems = this.moveItemsStickingToUpdatedItem(item);
			Array.prototype.push.apply(moveItems, oneDeepItems);
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
	var stickingItems = [];
	if (this.stickyItemParent[elemId] !== null && this.stickyItemParent[elemId] !== undefined) {
		var list = this.stickyItemParent[elemId];
		for (var i in list) {
			stickingItems.push(list[i]);
			var oneDeepItems = this.getStickingItems(list[i].id);
			if (oneDeepItems.length > 0) {
				Array.prototype.push.apply(stickingItems, oneDeepItems);
			}
		}
	}
	return stickingItems;
};


/**
*
*
* @method getFirstLevelStickingItems
*/
StickyItems.prototype.getFirstLevelStickingItems = function(elemId) {
	if (this.stickyItemParent[elemId] !== null && this.stickyItemParent[elemId] !== undefined) {
		return this.stickyItemParent[elemId];
	}
	return [];
};


/**
*
*
* @method registerNotPinnedApp
*/

StickyItems.prototype.registerNotPinnedApp = function(app) {
	if (app.sticky === true && app.pinned !== true) {
		this.notPinnedAppsList.push(app);
	}
};

/**
*
*
* @method getNotPinnedAppList
*/

StickyItems.prototype.getNotPinnedAppList = function() {
	return this.notPinnedAppsList;
};

/**
*
*
* @method refreshNotPinnedAppList
*/

StickyItems.prototype.refreshNotPinnedAppList = function(appList) {
	this.notPinnedAppsList = appList;
};

module.exports = StickyItems;
