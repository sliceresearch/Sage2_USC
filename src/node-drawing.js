"use strict"

function DrawingManager() {
	console.log("Created DrawingManager");
	this.idPrequel = "drawing_"
	this.drawState = [{id: "drawing_1",type: "path",options: { points: [{x: 10,y: 20}, {x: 20,y: 30}] }}];


	// An object drawing is defined as follows:
	// {
	// id: String
	// type: Type of the svg element
	// options : {} Object containing all the attributes needed by that type of element
	// style: {} Current style of the object to be drawn
	// }


}

DrawingManager.prototype.init = function(wsio) {
	this.drawingInit(wsio, this.drawState);
}

DrawingManager.prototype.update = function(clientID) {
	this.drawingUpdate(clientID, this.drawState);
}

DrawingManager.prototype.pointerEvent = function(e,sourceID,posX,posY) {
	console.log("pointer event received");
	console.log(e);
	// e.type=5 --> pointer down
	// e.type=4 --> pointer move
	// e.type=6 --> pointer release
}

DrawingManager.prototype.setCallbacks = function(
		drawingInitCB,
		drawingUpdateCB
	) {
	this.drawingInit = drawingInitCB;
	this.drawingUpdateCB = drawingUpdateCB;
};
module.exports = DrawingManager;