// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


/***************** Sticky Apps Section *****************/

/**
 * @module stickyitems
 */

// require variables to be declared
"use strict";


function StickyItems() {
	this.stickyItemParent = {};
}

StickyItems.prototype.attachStickyItem = function(backgroundItem, stickyItem) {
	if (this.stickyItemParent[backgroundItem.id] ){
		if (this.stickyItemParent[backgroundItem.id].indexOf(stickyItem) < 0){
			this.stickyItemParent[backgroundItem.id].push(stickyItem);
		}
	}
	else{
		this.stickyItemParent[backgroundItem.id] = [];
		this.stickyItemParent[backgroundItem.id].push(stickyItem);
	}
	stickyItem.offsetInfo = {offsetX:stickyItem.left - backgroundItem.left, offsetY:stickyItem.top - backgroundItem.top };
};

StickyItems.prototype.detachStickyItem = function(stickyItem) {
	for (var key in this.stickyItemParent){
		if (!this.stickyItemParent[key]) continue;
		var idx = this.stickyItemParent[key].indexOf(stickyItem);
		if (idx>-1){
			this.stickyItemParent[key].splice(idx, 1);
			return;
		}
	}
};

StickyItems.prototype.removeElement = function(elem) {
	for (var key in this.stickyItemParent){
		if (!this.stickyItemParent[key]) continue;
		var idx = this.stickyItemParent[key].indexOf(elem);
		if (idx>-1){
			this.stickyItemParent[key].splice(idx, 1);
			break;
		}
	}
	if (elem.id in this.stickyItemParent)
		delete this.stickyItemParent[elem.id];
};

StickyItems.prototype.moveItemsStickingToUpdatedItem = function(updatedItem, pointerX, pointerY) {
	var moveItems = [];
	if (this.stickyItemParent[updatedItem.elemId]){
		var list = this.stickyItemParent[updatedItem.elemId];
		for (var l in list){
			list[l].left = updatedItem.elemLeft + list[l].offsetInfo.offsetX;
			list[l].top  = updatedItem.elemTop + list[l].offsetInfo.offsetY;
			var item     = {elemId: list[l].id, elemLeft: list[l].left, elemTop: list[l].top, elemWidth: list[l].width, elemHeight: list[l].height, date: new Date()};
			moveItems.push(item);
		}
	}
	return moveItems;
};

StickyItems.prototype.getStickingItems = function(elemId) {
	if (this.stickyItemParent[elemId])
		return this.stickyItemParent[elemId];
	return [];
};

module.exports = StickyItems;
