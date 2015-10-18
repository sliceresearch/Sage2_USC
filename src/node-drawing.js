"use strict"
// Function to copy an obj, useful for assigning this.style to a drawingObject so that it doesnt change when this.style is changed


function DrawingManager(config) {
	this.idPrequel = "drawing_"
	this.clientIDandSockets = {};
	this.newDrawingObject = {};
	this.style = {fill: "none", stroke: "white", "stroke-width": "5px"};
	this.drawingMode = false;
	this.drawState = [{id: "drawing_1",type: "path",options: { points: [{x: 1000,y: 2000}, {x: 2000,y: 3000}] }, style: this.style}];
	this.drawingsUndone = [];
	this.tilesPosition = [];
	this.calculateTileDimensions(config);
	// An object drawing is defined as follows:
	// {
	// id: String
	// type: Type of the svg element
	// options : {} Object containing all the attributes needed by that type of element
	// style: {} Current style of the object to be drawn
	// }


}


DrawingManager.prototype.calculateTileDimensions = function(config) {

	//This method crashes if config.displays is less than product of rows and columns
	//Check if the clientID corresponds to the actual clientID
	var clients = config.layout.rows * config.layout.columns;
	var width = config.resolution.width;
	var height = config.resolution.height;

	for (var i = 0; i < clients; i++) {
		
		var display = config.displays[i];

		var startX = width * display.column;
		var endX = startX + width - 1;
		
		var startY = height * display.row;
		var endY = startY + height - 1;

		var position = {"startX": startX, "endX": endX, "startY": startY, "endY": endY, "clientID": i};

		this.tilesPosition.push(position);

	};

}

/*

function calculateTileDimensions (config) {

	var rows = config.layout.rows;
	var columns = config.layout.columns;
	var width = config.resolution.width;
	var height = config.resolution.height;

	for (var i = 0; i < rows; i++) {
		
		var startX = width * i;
		var endX = startX + width;
		

		for (var j = 0; j < columns; j++) {
			
			var startY = height * j;
			var endY = startY + height;

			var position = {"startX": startX, "endX": endX, "startY": startY, "endY": endY};

			this.tilesPosition.push(position);
		};

	};


}

*/

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

DrawingManager.prototype.update = function(drawingObject, clientID) {

	for (ws in this.clientIDandSockets[clientID]) {
		this.drawingUpdate(ws, drawingObject);
	}

	//Send the object also to client -1, but not manipulated. Maybe create another udpate.

}

DrawingManager.prototype.pointerEvent = function(e,sourceId,posX,posY) {

	if (e.type == 5) {

		//pointer down
		this.drawingsUndone = {};
		this.newDrawingObject(e, posX, posY);		

	} else if (e.type == 4) {

		//pointer move
		this.updateDrawingObject(e, posX, posY);
		
	} else if (e.type == 6) {
		//pointer release
	}

	var involvedClient = this.checkInvolvedClient(posX, posY);
	var manipulatedObject = manipulateDrawingObject(this.newDrawingObject[e.sourceId], involvedClient);

	this.update(manipulatedObject, involvedClient);
}

DrawingManager.prototype.newDrawingObject = function(e,posX,posY) {

	//Create new Drawing object
	this.newDrawingObject[e.sourceId] = {};
	this.newDrawingObject[e.sourceId]["id"] = this.idPrequel + e.sourceId;
	this.newDrawingObject[e.sourceId]["type"] = "path";
	this.newDrawingObject[e.sourceId]["options"] = { points: [ {x: posX,y: posY}] };
	this.newDrawingObject[e.sourceId]["style"] = this.style;

	this.drawState.push(this.newDrawingObject[e.sourceId]);

}

DrawingManager.prototype.updateDrawingObject = function(e,posX,posY) {
	this.newDrawingObject[e.sourceId]["options"]["points"].push({x: posX,y: posY});
}

DrawingManager.prototype.manipulateDrawingObject = function(drawingObject, clientID) {

	//Cloning the drawing object to manipuate its position, in order to send to the clients its relativ position
	var manipulatedObject = JSON.parse(JSON.stringify(drawingObject));

	var offsetX = this.tilesPosition.startX;
	var offsetY = this.tilesPosition.startY;

	for(var point in manipulatedObject.options.points) {

		point.x = point.x - offsetX;
		point.x = point.x - offsetY;

	}

	return manipulatedObject;

}

DrawingManager.prototype.checkInvolvedClient = function(posX, posY) {
	
	//Probably this method is inconsistent if the object start from a display and terminates in another

	for(var client in this.tilesPosition) {

		if (client.startX <= posX &&
			client.endX >= posX &&
			client.startY <= posY &&
			client.endY >= posY) {

			return client.clientID;

		}

	}

	console.log("No single client involved")
	return -1;

}


DrawingManager.prototype.setCallbacks = function(
		drawingInitCB,
		drawingUpdateCB
	) {
	this.drawingInit = drawingInitCB;
	this.drawingUpdate = drawingUpdateCB;
};
module.exports = DrawingManager;