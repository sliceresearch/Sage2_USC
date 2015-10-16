"use strict"

function DrawingManager() {
	console.log("Created DrawingManager");
	this.idPrequel = "drawing_"
	this.drawState = [{id: "drawing_1",type: "path",options: { points: [{x: 10,y: 20}, {x: 20,y: 30}] }}];
	this.clientIDandSockets = {}; 

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

	if (clientID in clientIDandSocket) {
		clientIDandSocket["clientID"].append(wsio);
	} else {
		clientIDandSocket["clientID"] = [wsio];
	}

	this.drawingInit(wsio, this.drawState);
}

DrawingManager.prototype.update = function(drawingObject) {

	this.drawingUpdate(drawingObject);

}

DrawingManager.prototype.pointerEvent = function(e,sourceID,posX,posY) {
	console.log("pointer event received");
	console.log(e);

	{id: "drawing_1",type: "path", options: { points: [{x: 10,y: 20}, {x: 20,y: 30}] }}

	if (e.type == 5) {

		this.newDrawingObject[e.sourceID] = {};
		this.newDrawingObject[e.sourceID]["id"] = this.idPrequel + e.sourceID;
		this.newDrawingObject[e.sourceID]["type"] = "path";
		this.newDrawingObject[e.sourceID]["options"] = { points: [ {x: posX,y: posY}] };

		drawState.push(this.newDrawingObject[e.sourceID]);
	}

	

	if (e.type == 4) {

		this.newDrawingObject[e.sourceID]["options"]["points"].push( {x: posX,y: posY} );

	}

	this.update(this.newDrawingObject[e.sourceID]);

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