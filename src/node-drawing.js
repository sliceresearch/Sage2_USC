"use strict"
// Function to copy an obj, useful for assigning this.style to a drawingObject so that it doesnt change when this.style is changed


function DrawingManager() {
	this.idPrequel = "drawing_"
	this.clientIDandSockets = {};
	this.newDrawingObject = {};
	this.style = {fill: "none", stroke: "white", "stroke-width": "5px"};
	this.drawingMode = false;
	this.drawState = [{id: "drawing_1",type: "path",options: { points: [{x: 10,y: 20}, {x: 20,y: 30}] }, style: this.style}];
	this.drawingsUndone = [];
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

	if (clientID in this.clientIDandSockets) {
		this.clientIDandSockets[clientID].push(wsio);
	} else {
		this.clientIDandSockets[clientID] = [wsio];
	}

	this.drawingInit(wsio, this.drawState);
}

DrawingManager.prototype.initAll = function() {

	for (var clientID in this.clientIDandSockets) {
		for (var i in this.clientIDandSockets[clientID]) {
			var wsio = this.clientIDandSockets[clientID][i];
			this.drawingInit(wsio, this.drawState);
		}
	}

}

DrawingManager.prototype.removeWebSocket = function(wsio) {

	//Detecting the position of the socket into the corresponding socket array
	var clientID = wsio.clientID;
	var position = this.clientIDandSockets[clientID].indexOf(wsio);
	if (position > -1) {
		this.clientIDandSockets[clientID].splice(wsio, 1);
		console.log("Socket removed from drawingManager");
	} else {
		console.log("Attempt to remove a socket from drawingManager, but not present");
	}

}

DrawingManager.prototype.clearDrawingCanvas = function() {
	this.drawState = [];
	this.initAll();
}

DrawingManager.prototype.undoLastDrawing = function() {
	var undone = this.drawState.pop();
	if (undone) {
		this.drawingsUndone.push(undone);
		this.initAll();
	}
}

DrawingManager.prototype.redoDrawing = function() {
	var reDone = this.drawingsUndone.pop();
	if (reDone) {
		this.drawState.push(reDone);
		this.update(reDone);
	}
}

DrawingManager.prototype.changeStyle = function(data) {
	this.style[data.name] = data.value;
	console.log(this.style);
}

DrawingManager.prototype.enableDrawingMode = function() {
	console.log("Drawing mode enabled");
	this.drawingMode = true;
}

DrawingManager.prototype.update = function(drawingObject) {
	this.drawingUpdate(drawingObject);
}

DrawingManager.prototype.pointerEvent = function(e,sourceId,posX,posY) {

	if (e.type == 5) {
		this.drawingsUndone = {};

		this.newDrawingObject[e.sourceId] = {};
		this.newDrawingObject[e.sourceId]["id"] = this.idPrequel + e.sourceId;
		this.newDrawingObject[e.sourceId]["type"] = "path";
		this.newDrawingObject[e.sourceId]["options"] = { points: [ {x: posX,y: posY}] };
		this.newDrawingObject[e.sourceId]["style"] = this.style;

		this.drawState.push(this.newDrawingObject[e.sourceId]);
	}

	if (e.type == 4) {

		this.newDrawingObject[e.sourceId]["options"]["points"].push({x: posX,y: posY});

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