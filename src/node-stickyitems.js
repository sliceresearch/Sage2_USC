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
	this.notPinnedAppsList = [];
	this.enablePiling = false;
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
	if (backgroundItem.foregroundItems !== null && backgroundItem.foregroundItems !== undefined) {
		if (backgroundItem.foregroundItems.indexOf(stickyItem) < 0) {
			backgroundItem.foregroundItems.push(stickyItem);
		}
	} else {
		backgroundItem.foregroundItems = [];
		backgroundItem.foregroundItems.push(stickyItem);
	}
	
	stickyItem.backgroundOffsetX = stickyItem.left - backgroundItem.left;
	stickyItem.backgroundOffsetY = stickyItem.top - backgroundItem.top;
	stickyItem.backgroundItem = backgroundItem;
};

/**
*
*
* @method detachStickyItem
*/
StickyItems.prototype.detachStickyItem = function(stickyItem) {
	var backgroundItem = stickyItem.backgroundItem;
	if (backgroundItem !== null && backgroundItem !== undefined) {
		var foregroundItems = backgroundItem.foregroundItems;
		if (foregroundItems !== null && foregroundItems !== undefined) {
			var stickyItemIdx = foregroundItems.indexOf(stickyItem);
			if (stickyItemIdx > -1) {
				foregroundItems.splice(stickyItemIdx, 1);
			}	
		}	
	}
	stickyItem.backgroundOffsetX = 0;
	stickyItem.backgroundOffsetY = 0;
	stickyItem.backgroundItem = null;	
};

/**
*
*
* @method removeElement
*/
StickyItems.prototype.removeElement = function(elem) {
	var foregroundItems = elem.foregroundItems;
	if (foregroundItems !== null && foregroundItems !== undefined) {
		for (var f = 0; f < foregroundItems.length; f ++) {
			var foregroundItem = foregroundItems[f];
			foregroundItem.backgroundItem = null;
		}
	}
	this.detachStickyItem(elem);
};

/**
*
*
* @method moveItemsStickingToUpdatedItem
*/
StickyItems.prototype.moveItemsStickingToUpdatedItem = function (updatedItem) {
	var foregroundItems = updatedItem.foregroundItems;
	var moveItems = [];
	if (foregroundItems !== null && foregroundItems !== undefined) {
		for (var f = 0; f < foregroundItems.length; f ++) {
			var foregroundItem = foregroundItems[f];
			foregroundItem.left = updatedItem.left + foregroundItem.backgroundOffsetX;
			foregroundItem.top = updatedItem.top + foregroundItem.backgroundOffsetY;
			var item     = {
				elemId: foregroundItem.id, elemLeft: foregroundItem.left, elemTop: foregroundItem.top,
				elemWidth: foregroundItem.width, elemHeight: foregroundItem.height, date: new Date()
			};
			moveItems.push(item);
			var oneDeepItems = this.moveItemsStickingToUpdatedItem(foregroundItem);
			moveItems.push.apply(moveItems, oneDeepItems);
		}
	}
	return moveItems;
};

StickyItems.prototype.pileItemsStickingToUpdatedItem = function (updatedItem) {
	if (this.enablePiling === false) {
		return;
	}
	var foregroundItems = updatedItem.foregroundItems;
	if (foregroundItems !== null && foregroundItems !== undefined) {
		for (var f = 0; f < foregroundItems.length; f ++) {
			var foregroundItem = foregroundItems[f];
			if (foregroundItem.backgroundOffsetX < 0) {
				foregroundItem.backgroundOffsetX = 0;
			} else if (foregroundItem.backgroundOffsetX + foregroundItem.width > updatedItem.width){
				foregroundItem.backgroundOffsetX = Math.max(updatedItem.width - foregroundItem.width, 0);
			}

			if (foregroundItem.backgroundOffsetY < 0) {
				foregroundItem.backgroundOffsetY = 0;
			} else if (foregroundItem.backgroundOffsetY + foregroundItem.height > updatedItem.height){
				foregroundItem.backgroundOffsetY = Math.max(updatedItem.height - foregroundItem.height, 0);
			}
			foregroundItem.width = Math.min(foregroundItem.width, updatedItem.width);
			foregroundItem.height = Math.min(foregroundItem.height, updatedItem.height);
			this.pileItemsStickingToUpdatedItem(foregroundItem);
		}
	}
};


StickyItems.prototype.moveAndResizeItemsStickingToUpdatedItem = function (updatedItem) {
	var foregroundItems = updatedItem.foregroundItems;
	var moveItems = [];
	if (foregroundItems !== null && foregroundItems !== undefined) {
		for (var f = 0; f < foregroundItems.length; f ++) {
			var foregroundItem = foregroundItems[f];
			foregroundItem.left = updatedItem.left + foregroundItem.backgroundOffsetX;
			foregroundItem.top = updatedItem.top + foregroundItem.backgroundOffsetY;
			foregroundItem.width = updatedItem.width;
			foregroundItem.height = updatedItem.height;
			var item     = {
				elemId: foregroundItem.id, elemLeft: foregroundItem.left, elemTop: foregroundItem.top,
				elemWidth: foregroundItem.width, elemHeight: foregroundItem.height, date: new Date()
			};
			moveItems.push(item);
			var oneDeepItems = this.moveItemsStickingToUpdatedItem(foregroundItem);
			moveItems.push.apply(moveItems, oneDeepItems);
		}
	}
	return moveItems;
};


/**
*
*
* @method getStickingItems
*/
StickyItems.prototype.getStickingItems = function(app) {
	var foregroundItems = app.foregroundItems;
	var stickingItems = [];
	if (foregroundItems !== null && foregroundItems !== undefined) {
		for (var f = 0; f < foregroundItems.length; f ++) {
			var foregroundItem = foregroundItems[f];
			stickingItems.push(foregroundItem);
			var oneDeepItems = this.getStickingItems(foregroundItem);
			stickingItems.push.apply(stickingItems, oneDeepItems);
		}
	}
	return stickingItems;
};


/**
*
*
* @method getFirstLevelStickingItems
*/
StickyItems.prototype.getFirstLevelStickingItems = function(app) {
	if (app.foregroundItems !== null && app.foregroundItems !== undefined) {
		return app.foregroundItems;
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

StickyItems.prototype.getListOfBackgroundAndForegroundItems = function(appList) {
	var temp = appList;
	var backgroundAndForegroundItems = {
		backgroundItems: [],
		foregroundItems: []
	};
	if (appList !== null && typeof appList === 'object') {
		temp = Object.keys(appList).map(function (key) { return appList[key]; });
	} else if (Object.prototype.toString.call( appList ) !== '[object Array]') {
		return backgroundAndForegroundItems;
	}
	appList = temp;
	appList.forEach((app) => {
		if (app.backgroundItem === null || app.backgroundItem === undefined) {
			backgroundAndForegroundItems.backgroundItems.push(app);
		} else {
			backgroundAndForegroundItems.foregroundItems.push(app);
		}
	});
	return backgroundAndForegroundItems;
}

module.exports = StickyItems;
