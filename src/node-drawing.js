"use strict"

function DrawingManager() {
	console.log("Created DrawingManager");
	this.idPrequel = "drawing_"
	this.drawState = [{id: "drawing_1",type: "path",options: { points: [{x: 10,y: 20}, {x: 20,y: 30}] }}];
	this.clientIDandSockets = {}; 
	this.newDrawingObject = {};
	this.style = {fill: "none", stroke: "white", stroke-width: "5px"};

	// An object drawing is defined as follows:
	// {
	// id: String
	// type: Type of the svg element
	// options : {} Object containing all the attributes needed by that type of element
	// style: {} Current style of the object to be drawn
	// }


}

DrawingManager.prototype.init = function(wsio) {

	var clientID = wsio.clientID;

	if (clientID in clientIDandSockets) {
		clientIDandSockets[clientID].push(wsio);
	} else {
		clientIDandSockets[clientID] = [wsio];
	}

	this.drawingInit(wsio, this.drawState);
}

DrawingManager.prototype.removeWebSocket = function(wsio) {


}

DrawingManager.prototype.update = function(drawingObject) {

	this.drawingUpdate(drawingObject);

}

DrawingManager.prototype.pointerEvent = function(e,sourceId,posX,posY) {
	console.log("pointer event received");
	console.log(e);

	if (e.type == 5) {

		this.newDrawingObject[e.sourceId] = {};
		this.newDrawingObject[e.sourceId]["id"] = this.idPrequel + e.sourceId;
		this.newDrawingObject[e.sourceId]["type"] = "path";
		this.newDrawingObject[e.sourceId]["options"] = { points: [ {x: posX,y: posY}] };
		this.newDrawingObject[e.sourceId]["style"] = this.style;

		this.drawState.push(this.newDrawingObject[e.sourceId]);
	}

	

	if (e.type == 4) {

		this.newDrawingObject[e.sourceId]["options"]["points"].push( {x: posX,y: posY} );

	}

	this.update(this.newDrawingObject[e.sourceId]);

	// e.type=5 --> pointer down
	// e.type=4 --> pointer move
	// e.type=6 --> pointer release
}

DrawingManager.prototype.setCallbacks = function(
		drawingInitCB,
		drawingUpdateCB
	) {
	this.drawingInit = drawingInitCB;
	this.drawingUpdate = drawingUpdateCB;
};
module.exports = DrawingManager;