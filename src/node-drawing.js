"use strict"

function DrawingManager() {
	console.log("Created DrawingManager");
}

DrawingManager.prototype.init = function() {
	this.drawingInit();
}

DrawingManager.prototype.pointerEvent = function(e,sourceID,posX,posY) {
	console.log("pointer event received");
	console.log(e);
	// e.type=5 --> pointer down
	// e.type=4 --> pointer move
	// e.type=6 --> pointer release
}

DrawingManager.prototype.setCallbacks = function(
		drawingInitCB
	) {
	this.drawingInit = drawingInitCB;
};
module.exports = DrawingManager;