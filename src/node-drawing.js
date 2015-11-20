"use strict"

// Put a Tutorial, maybe an overlay text to say that drawing is enabled

function DrawingManager(config) {

	this.lastId = 1;
	this.dictionaryId = {};
	this.idPrequel = "drawing_";
	this.clientIDandSockets = {};
	this.newDrawingObject = {};
	this.style = {fill: "none", stroke: "white", "stroke-width": "5px", "stroke-linecap": "round"};
	this.selectionBoxStyle = {fill: "none", stroke: "white", "stroke-width": "5px","stroke-dasharray": "10,10"};
	this.drawingMode = true;
	this.drawState = [{id: "drawing_1",type: "path",options: { points: [{x: 100,y: 200}, {x: 200,y: 300}] }, style: this.style}];
	this.drawingsUndone = [];
	this.tilesPosition = [];
	this.palettePosition = {};
	this.idMovingPalette = -1;
	this.calculateTileDimensions(config);
	this.actualAction = "drawing"
	this.possibleActions = ["drawing", "movingPalette"];
	this.paintingMode = false;
	this.selectionMode = false;
	this.selectionStart = {};
	this.selectionEnd = {};
	this.selectionTouchId = -1;
	this.selectedDrawingObject = [];
	this.selectionMovementStart = [];
	this.selectionBox = null;
	this.eraserBox = null;
	this.eraserTouchId = -1;
	this.interactMgr = null;
	this.actionDoneStack = [{type: "drawing", data: [this.drawState[0].id]}];
	this.actionRedoStack = [];
	this.idAssociatedToAction = [];
	this.maxLineSize = 20;
	this.movingSelectionStartingPosition = null;
	// An object drawing is defined as follows:
	// {
	// id: String
	// type: Type of the svg element
	// options : {} Object containing all the attributes needed by that type of element
	// style: {} Current style of the object to be drawn
	// }

}

DrawingManager.prototype.linkInteractableManager = function(mngr) {
	this.interactMgr = mngr;
}

DrawingManager.prototype.scalePoint = function(point,origin,scaleX,scaleY) {
	var dx = point.x - origin.x;
	var dy = point.y - origin.y;
	var newDX = dx * scaleX;
	var newDY = dy * scaleY;
	return {x: origin.x + newDX, y: origin.y + newDY}
}

DrawingManager.prototype.calculateTileDimensions = function(config) {

	// This method crashes if config.displays is less than product of rows and columns
	// Check if the clientID corresponds to the actual clientID
	var clients = config.layout.rows * config.layout.columns;
	var width = config.resolution.width;
	var height = config.resolution.height;

	for (var i = 0; i < clients; i++) {

		var display = config.displays[i];

		var startX = width * display.column;
		var endX = startX + width - 1;

		var startY = height * display.row;
		var endY = startY + height - 1;

		var position = {startX: startX, endX: endX, startY: startY, endY: endY, clientID: i};

		this.tilesPosition.push(position);

	};

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

// TODO: manage the check involved client
DrawingManager.prototype.updateWithGroupDrawingObject = function(group) {
	for (var drawingObject in group) {
		for (var clientID in this.tilesPosition) {
			var clientID = this.tilesPosition[clientID].clientID;
			var manipulatedObject = this.manipulateDrawingObject(group[drawingObject], clientID);
			this.update(manipulatedObject, clientID);
		}
	}
}

DrawingManager.prototype.removeDrawingObject = function(group) {
	for (var clientID in this.tilesPosition) {
		var clientID = this.tilesPosition[clientID].clientID;
		this.remove(group, clientID);
	}

}

DrawingManager.prototype.enablePaintingMode = function() {
	this.paintingMode = true;
	this.sendModesToPalette();

}

DrawingManager.prototype.disablePaintingMode = function() {
	this.paintingMode = false;
	this.sendModesToPalette();
}

DrawingManager.prototype.selectionModeOnOff = function() {
	this.actualAction = "creatingSelection"
}

DrawingManager.prototype.sendModesToPalette = function() {
	var data = {drawingMode: this.drawingMode, paintingMode: this.paintingMode};
	this.sendChangeToPalette(this.paletteID,data);
}


DrawingManager.prototype.removeWebSocket = function(wsio) {

	// Detecting the position of the socket into the corresponding socket array
	var clientID = wsio.clientID;
	var position = this.clientIDandSockets[clientID].indexOf(wsio);
	if (position > -1) {
		this.clientIDandSockets[clientID].splice(position, 1);
		console.log("Socket removed from drawingManager");
	} else {
		console.log("Attempt to remove a socket from drawingManager, but not present");
	}

}

DrawingManager.prototype.clearDrawingCanvas = function() {
	this.actionDoneStack.push({type: "clearAll", data: this.copy(this.drawState)});
	this.drawState = [];
	this.deleteSelectionBox();
	this.initAll();
}

function isInside (s,arr) {
	for (var i in arr) {
		if (arr[i] == s) {
			return true;
		}
	}
	return false;
}

DrawingManager.prototype.saveActionToActionStack = function(e, type, data) {

	if (type == "drawing") {
		if (this.idAssociatedToAction[e.sourceId]) {
			var newAction = {type: "drawing", data: this.idAssociatedToAction[e.sourceId]};
			this.actionDoneStack.push(newAction);
			delete this.idAssociatedToAction[e.sourceId];
		}
	} else if (type == "creatingSelection") {
		var newAction = {type: "creatingSelection", data: {selection: this.selectionBox, start: this.selectionStart, end: this.selectionEnd, obj: this.selectedDrawingObject}};
		this.actionDoneStack.push(newAction);
	} else if (type == "erase") {
		this.actionDoneStack.push({type: "erase", 'data': data});
	} else if (type == "movingSelection") {
		this.actionDoneStack.push({type: "movingSelection", 'data': data});
	}

	this.actionRedoStack = [];

}

DrawingManager.prototype.undoLastDrawing = function() {

	var undone = this.actionDoneStack.pop();

	if (undone) {
		var type = undone.type;

		if (type == "drawing") {
			var undoneDrawings = [];
			var groupDrawings = undone.data;
			var i = 0
			while (i < this.drawState.length) {
				if (isInside(this.drawState[i].id, groupDrawings)) {
					undoneDrawings.push(this.drawState.splice(i,1)[0]);
				} else {
					i++;
				}
			}

			this.removeDrawingObject(undoneDrawings);
			undone.data = undoneDrawings;
		} else if (type == "clearAll") {
			var redoState = this.copy(undone.data);
			undone.data = this.drawState;
			this.drawState = redoState;
			this.initAll();
		} else if (type == "erase") {
			var eraseIdDrawings = [];
			var groupDrawings = undone.data;
			for (var i in groupDrawings) {
				this.drawState.push(groupDrawings[i]);
				eraseIdDrawings.push(groupDrawings[i].id);
			}

			this.updateWithGroupDrawingObject(groupDrawings);
			undone.data = eraseIdDrawings;
		} else if (type == "creatingSelection") {
			this.deleteSelectionBox();
		} else if (type == "movingSelection") {
			var dx = undone.data['dx'];
			var dy = undone.data['dy'];
			this.selectionStart.x += - dx;
			this.selectionStart.y += - dy;
			this.selectionEnd.x += - dx;
			this.selectionEnd.y += - dy;
			this.moveSelectionBox();
			this.selectionMove(- dx, - dy);
		}

		this.actionRedoStack.push(undone);
	}

}

DrawingManager.prototype.redoDrawing = function() {

	var redone = this.actionRedoStack.pop();

	if (redone) {
		var type = redone.type;

		if (type == "drawing") {

			var undoneIdDrawings = [];
			var groupDrawings = redone.data;
			for (var i in groupDrawings) {
				this.drawState.push(groupDrawings[i]);
				undoneIdDrawings.push(groupDrawings[i].id);
			}

			this.updateWithGroupDrawingObject(groupDrawings);
			redone.data = undoneIdDrawings;
		} else if (type == "clearAll") {
			var undoState = this.copy(redone.data);
			redone.data = this.drawState;
			this.drawState = undoState;
			this.initAll();
		} else if (type == "erase") {
			var eraseDrawings = [];
			var groupDrawings = redone.data;
			while (i < this.drawState.length) {
				if (isInside(this.drawState[i].id, groupDrawings)) {
					eraseDrawings.push(eraseDrawings.push(this.drawState.splice(i,1)[0]));
				} else {
					i++;
				}
			}
			this.removeDrawingObject(eraseDrawings);
			redone.data = eraseDrawings;
		} else if (type == "creatingSelection") {
			this.selectionBox = redone['data']['selection'];
			this.selectedDrawingObject = redone['data']['obj'];
			this.selectionStart = redone['data']['start'];
			this.selectionEnd = redone['data']['end'];
			this.drawState.push(this.selectionBox);
			this.updateWithGroupDrawingObject([this.selectionBox]);
		} else if (type == "movingSelection") {
			var dx = redone.data['dx'];
			var dy = redone.data['dy'];
			this.selectionStart.x += dx;
			this.selectionStart.y += dy;
			this.selectionEnd.x += dx;
			this.selectionEnd.y += dy;
			this.moveSelectionBox();
			this.selectionMove(dx, dy);
		}

		this.actionDoneStack.push(redone);
	}
}

DrawingManager.prototype.changeStyle = function(data) {
	this.style[data.name] = data.value;
	this.sendStyleToPalette(this.paletteID,this.style);
}

DrawingManager.prototype.enableDrawingMode = function(data) {
	console.log("Drawing mode enabled");
	this.drawingMode = true;
	this.paletteID = data.id;
	this.sendStyleToPalette(this.paletteID,this.style);
}

DrawingManager.prototype.update = function(drawingObject, clientID) {

	for (var ws in this.clientIDandSockets[clientID]) {
		this.drawingUpdate(this.clientIDandSockets[clientID][ws], drawingObject);
	}

	// Send the object also to client -1, but not manipulated. Maybe create another udpate.
	for (var ws in this.clientIDandSockets[-1]) {
		this.drawingUpdate(this.clientIDandSockets[-1][ws], drawingObject);
	}
}

DrawingManager.prototype.remove = function(group, clientID) {

	for (var ws in this.clientIDandSockets[clientID]) {
		this.drawingRemove(this.clientIDandSockets[clientID][ws], group);
	}

	// Send the object also to client -1, but not manipulated. Maybe create another udpate.
	for (var ws in this.clientIDandSockets[-1]) {
		this.drawingUpdate(this.clientIDandSockets[-1][ws], drawingObject);
	}
}

DrawingManager.prototype.copy = function(a) {
	return JSON.parse(JSON.stringify(a));
}

DrawingManager.prototype.distance = function(p1,p2) {
	return (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y);
}

DrawingManager.prototype.getNewId = function(sourceId) {
	this.lastId++;
	var newId = this.idPrequel + this.lastId;
	this.dictionaryId[sourceId] = newId;
	return newId;
}

DrawingManager.prototype.realeaseId = function(sourceId) {
	delete this.dictionaryId[sourceId];
}

DrawingManager.prototype.existsId = function(sourceId) {
	return sourceId in this.dictionaryId
}

DrawingManager.prototype.findMaxId = function() {
	var max = -1;

	for (var drawingObj in this.drawState) {
		var idx = this.drawState[drawingObj]['id'];
		idx = parseInt(idx.substring(this.idPrequel.length, idx.length));
		if (idx > max) {
			max = idx;
		}
	}

	return max;
}

DrawingManager.prototype.newEraserBox = function(x,y,w,h) {

	// Create new Eraser box
	this.eraserBox = {x: x - w / 2,y: y - h / 2,w: w,h: h};

}

DrawingManager.prototype.erase = function() {
	// Erases all the elements intersecting with the erase box
	var i = 0;
	var groupToDelete = [];
	while (i < this.drawState.length) {
		var draw = this.drawState[i]["options"]["points"];
		var inside = false;
		for (var j in draw) {
			var p = draw[j];
			if (p.x > this.eraserBox.x &&
				p.x < this.eraserBox.x + this.eraserBox.w  &&
				p.y > this.eraserBox.y &&
				p.y < this.eraserBox.y + this.eraserBox.h) {
				inside = true;
				break;
			}
		}
		if (inside) {
			groupToDelete.push(this.drawState[i]);
			for (var x in this.dictionaryId) {
				if (this.drawState[i].id == this.dictionaryId[x]) {
					this.realeaseId(x);
				}
			}
			this.drawState.splice(i,1)
		} else {
			i += 1;
		}
	}

	if (groupToDelete.length > 0) {
		this.saveActionToActionStack(this.eraserTouchId, "erase", groupToDelete);
		this.removeDrawingObject(groupToDelete);
	}
	
}


DrawingManager.prototype.newSelectionBox = function(e) {

	// Create new Selection box
	var drawingId = this.getNewId(e.sourceId);
	this.newDrawingObject[drawingId] = {};
	this.newDrawingObject[drawingId]["id"] = drawingId;
	this.newDrawingObject[drawingId]["type"] = "rect";
	this.newDrawingObject[drawingId]["options"] = { points: [this.selectionStart, this.selectionEnd] };
	this.newDrawingObject[drawingId]["style"] = this.selectionBoxStyle;

	this.selectionBox = this.newDrawingObject[drawingId];

	this.drawState.push(this.newDrawingObject[drawingId]);
}

DrawingManager.prototype.moveSelectionBox = function() {

	if (this.selectionBox) {
		this.selectionBox["options"]["points"] = [this.selectionStart, this.selectionEnd];
		this.updateWithGroupDrawingObject([this.selectionBox]);
	}

}

DrawingManager.prototype.deleteSelectionBox = function() {

	if (this.selectionBox) {
		for (var drawingObj in this.drawState) {
			var idx = this.drawState[drawingObj]['id'];
			if (idx == this.selectionBox["id"]) {
				this.drawState.splice(drawingObj, 1);
				break;
			}
		}
		this.selectedDrawingObject = [];
		this.selectionStart = {};
		this.selectionEnd = {};
		this.selectionBox = null;
		this.selectionTouchId = -1;
		this.initAll();
	}
}

DrawingManager.prototype.newDrawingObjectFunc = function(e,posX,posY) {

	// Create new Drawing object
	var drawingId = this.getNewId(e.sourceId);
	this.newDrawingObject[drawingId] = {};
	this.newDrawingObject[drawingId]["id"] = drawingId;
	this.newDrawingObject[drawingId]["type"] = "circle";
	this.newDrawingObject[drawingId]["options"] = { points: [ {x: posX,y: posY}] };
	this.newDrawingObject[drawingId]["style"] = this.copy(this.style);

	this.drawState.push(this.newDrawingObject[drawingId]);

	this.idAssociatedToAction[e.sourceId] = [drawingId];

}

DrawingManager.prototype.updateDrawingObject = function(e,posX,posY) {
	if (!this.existsId(e.sourceId)) {
		this.newDrawingObjectFunc(e, posX, posY);
		this.idAssociatedToAction[e.sourceId] = [drawingId];
	}
	var drawingId = this.dictionaryId[e.sourceId];
	var lastPoint = this.newDrawingObject[drawingId]["options"]["points"]
					[this.newDrawingObject[drawingId]["options"]["points"].length - 1];
	if (this.distance(lastPoint, {x: posX, y: posY}) > 0.5) {
		this.newDrawingObject[drawingId]["type"] = "path";
		this.newDrawingObject[drawingId]["options"]["points"].push({x: posX,y: posY});
	}

	if (this.newDrawingObject[drawingId]["options"]["points"].length >this.maxLineSize) { 
		var l=this.newDrawingObject[drawingId]["options"]["points"].length; 
		var secondPart = this.newDrawingObject[drawingId]["options"]["points"].splice(this.maxLineSize - 1,l);
		this.newDrawingObject[drawingId]["options"]["points"].push(this.copy(secondPart[0]));
		this.realeaseId(e.sourceId);
		var id = this.getNewId(e.sourceId);
		this.idAssociatedToAction[e.sourceId].push(id);
		var newDraw= {};
		newDraw["type"]="path";
		newDraw["style"]=this.newDrawingObject[drawingId]["style"];
		newDraw["options"]={};
		newDraw["options"]["points"] = secondPart;
		newDraw["id"] = id;
		this.drawState.push(newDraw);
		this.newDrawingObject[id] = newDraw;
		}
}

DrawingManager.prototype.touchNearBottom = function(x,y) {
	var c = this.checkInvolvedClient(x,y);
	if (c!= null && (c > -1)) {
		var startY = this.tilesPosition[c].startY;
		var endY = this.tilesPosition[c].endY;
		var w = endY - startY;
		var activeArea = w * 0.1;
		return y >= endY - activeArea;
	}
	return false;
}

DrawingManager.prototype.touchInsidePalette = function(x,y) {
	return ((x >= this.palettePosition.startX) && (x <= this.palettePosition.endX) &&
			(y >= this.palettePosition.startY) && (y <= this.palettePosition.endY));
}
DrawingManager.prototype.touchInsidePaletteTitleBar = function(x,y) {
	return ((x >= this.palettePosition.startX) && (x <= this.palettePosition.endX) &&
			(y >= this.palettePosition.startY - 58) && (y < this.palettePosition.startY));
}

DrawingManager.prototype.touchInsideSelection = function(x, y) {

	if (x > this.selectionStart['x'] &&
		y > this.selectionStart['y'] &&
		x < this.selectionEnd['x'] &&
		y < this.selectionEnd['y']) {
		return true;
	}
	return false;

}

DrawingManager.prototype.touchInsideSelectionZoomBox = function(x, y) {
	var w = this.selectionEnd['x'] - this.selectionStart['x'];
	var h = this.selectionEnd['y'] - this.selectionStart['y'];

	if (x >= this.selectionStart['x'] + 0.9 * w &&
		y >= this.selectionStart['y'] + 0.9 * h &&
		x <= this.selectionEnd['x'] &&
		y <= this.selectionEnd['y']) {
		return true;
	}
	return false;

}

DrawingManager.prototype.selectDrawingObjects = function() {

	for (var drawingObj in this.drawState) {
		var points = this.drawState[drawingObj]['options']['points'];
		for (var i in points) {
			if (this.touchInsideSelection(points[i]['x'], points[i]['y'])) {
				this.selectedDrawingObject.push(this.drawState[drawingObj]);
				break;
			}
		}
	}

}

DrawingManager.prototype.selectionMove = function(x, y) {

	//var actionSelectionMove = {type: "selectionMove", data: {'x': x, 'y': y, obj: []}};

	for (var drawingObj in this.selectedDrawingObject) {
		var obj = this.selectedDrawingObject[drawingObj];
		//actionSelectionMove['data']['obj'].push(obj);
		var points = obj['options']['points'];
		for (var i in points) {
			points[i]['x'] += x;
			points[i]['y'] += y;
		}
	}


	this.updateWithGroupDrawingObject(this.selectedDrawingObject);
}

DrawingManager.prototype.selectionZoom = function(sx, sy) {

	for (var drawingObj in this.selectedDrawingObject) {
		var points = this.selectedDrawingObject[drawingObj]['options']["points"];
		for (var i in points) {
			var p = points[i];
			points[i] = this.scalePoint(p,this.selectionStart,sx,sy);
		}
	}

	this.updateWithGroupDrawingObject(this.selectedDrawingObject);
}

DrawingManager.prototype.pointerEvent = function(e,sourceId,posX,posY,w,h) {

	if (this.paintingMode) {
		this.style["stroke-width"] = Math.max(w,h)
	}

	if (e.type == 5) {
		// touch down
		if (this.touchInsidePaletteTitleBar(posX,posY)) {
			this.actualAction = "movingPalette";
			this.idMovingPalette = e.sourceId;
			this.touchOnPaletteOffsetX = posX - this.palettePosition.startX;
			this.touchOnPaletteOffsetY = posY - this.palettePosition.startY + 58; // Title bar height
			return;
		} else if (this.touchInsidePalette(posX,posY)) {
			this.sendTouchToPalette(this.paletteID, posX - this.palettePosition.startX, posY - this.palettePosition.startY);
			return;
		} else if (this.touchNearBottom(posX,posY)) {
			this.movePaletteTo(this.paletteID
								, posX
								, this.palettePosition.startY - 58
								, this.palettePosition.endX - this.palettePosition.startX
								, this.palettePosition.endY - this.palettePosition.startY);
			return;
		} else if (this.actualAction == "creatingSelection" && this.selectionTouchId == -1) {
			this.deleteSelectionBox();
			this.selectionStart = {x: posX, y: posY};
			this.selectionEnd = {x: posX, y: posY};
			this.selectionTouchId = e.sourceId;
			this.newSelectionBox(e);
			return;
		} else if (this.touchInsideSelection(posX, posY) && this.selectionTouchId == -1) {
			this.selectionMovementStart = {x: posX, y: posY};
			this.selectionTouchId = e.sourceId;
			if (this.touchInsideSelectionZoomBox(posX,posY)) {
				this.actualAction = "zoomingSelection";
			} else {
				this.actualAction = "movingSelection";
				this.movingSelectionStartingPosition = {x: posX, y: posY};
			}
			return;
		} else if (this.paintingMode == false && Math.max(w,h) > 200 && this.eraserTouchId == -1) {
			this.deleteSelectionBox();
			this.actualAction = "erasing";
			this.newEraserBox(posX,posY,w,h);
			this.eraserTouchId = e.sourceId;
			this.erase();
			return;
		} else {
			if (this.actualAction == "drawing") {
				this.deleteSelectionBox();
			}
			this.drawingsUndone = [];
			this.newDrawingObjectFunc(e, posX, posY);
		}

	} else if (e.type == 4) {
		// touch move
		if (this.paintingMode == false && Math.max(w,h) > 200 && this.eraserTouchId == -1) {
			this.actualAction = "erasing";
			this.eraserTouchId = e.sourceId;
		}

		if ((this.actualAction == "movingPalette") && (this.idMovingPalette == e.sourceId)) {
			this.movePaletteTo(this.paletteID
								, posX - this.touchOnPaletteOffsetX
								, posY - this.touchOnPaletteOffsetY
								, this.palettePosition.endX - this.palettePosition.startX
								, this.palettePosition.endY - this.palettePosition.startY);
			return;
		}

		if (this.eraserTouchId == e.sourceId) {
			this.realeaseId(e.sourceId);
			this.newEraserBox(posX,posY,w,h);
			this.erase();
			return;
		}

		if (this.touchInsidePalette(posX,posY)) {
			return;
		}

		if ((this.actualAction == "movingSelection") && (this.selectionTouchId == e.sourceId)) {
			var dx = posX - this.selectionMovementStart['x'];
			var dy = posY - this.selectionMovementStart['y'];
			this.selectionMovementStart = {x: posX, y: posY};
			this.selectionStart.x += dx;
			this.selectionStart.y += dy;
			this.selectionEnd.x += dx;
			this.selectionEnd.y += dy;
			this.moveSelectionBox();
			this.selectionMove(dx, dy);
			return;
		}

		if ((this.actualAction == "zoomingSelection") && (this.selectionTouchId == e.sourceId)) {
			var dx = posX - this.selectionMovementStart['x'];
			var dy = posY - this.selectionMovementStart['y'];
			var oldW = this.selectionEnd.x - this.selectionStart.x;
			var oldH = this.selectionEnd.y - this.selectionStart.y;
			var newW = oldW + dx;
			var newH = oldH + dy;
			var sx = parseFloat(newW) / oldW;
			var sy = parseFloat(newH) / oldH;
			this.selectionMovementStart = {x: posX, y: posY};
			this.selectionEnd.x += dx;
			this.selectionEnd.y += dy;
			this.moveSelectionBox();
			this.selectionZoom(sx, sy);
			return;
		}

		if ((this.actualAction == "creatingSelection") && (this.selectionTouchId == e.sourceId)) {
			if (this.selectionStart['x'] > posX) {
				this.selectionStart['x'] = posX;
			} else if (this.selectionEnd['x'] < posX) {
				this.selectionEnd['x'] = posX;
			}else {
				var d1 = this.distance({x: posX,y: this.selectionStart.y},this.selectionStart);
				if (d1 < this.distance({x: posX,y: this.selectionEnd.y},this.selectionEnd)) {
					this.selectionStart['x'] = posX;
				} else {
					this.selectionEnd['x'] = posX;
				}
			}

			if (this.selectionStart['y'] > posY) {
				this.selectionStart['y'] = posY;
			} else if (this.selectionEnd['y'] < posY) {
				this.selectionEnd['y'] = posY;
			}else {
				var d1 = this.distance({x: this.selectionStart.x,y: posY},this.selectionStart);
				if (d1 < this.distance({x: this.selectionEnd.x,y: posY},this.selectionEnd)) {
					this.selectionStart['y'] = posY;
				} else {
					this.selectionEnd['y'] = posY;
				}
			}
			this.moveSelectionBox();
			return;
		}

		this.updateDrawingObject(e, posX, posY);

	} else if (e.type == 6) {
		// touch release
		if (this.idMovingPalette == e.sourceId) {
			return;
		} else if (this.eraserTouchId == e.sourceId) {
			this.actualAction = "drawing";
			this.eraserTouchId = -1;
		} else if ((this.actualAction == "movingPalette") && (this.idMovingPalette == e.sourceId)) {
			this.actualAction = "drawing";
			this.idMovingPalette = -1;
		} else if ((this.actualAction == "creatingSelection") && (this.selectionTouchId == e.sourceId)) {

			var drawn = false;

			if (this.selectionStart['x'] > posX) {
				this.selectionStart['x'] = posX;
			} else if (this.selectionEnd['x'] < posX) {
				this.selectionEnd['x'] = posX;
			}else {
				var d1 = this.distance({x: posX,y: this.selectionStart.y},this.selectionStart);
				if (d1 < this.distance({x: posX,y: this.selectionEnd.y},this.selectionEnd)) {
					this.selectionStart['x'] = posX;
				} else {
					this.selectionEnd['x'] = posX;
				}
			}

			if (this.selectionStart['y'] > posY) {
				this.selectionStart['y'] = posY;
			} else if (this.selectionEnd['y'] < posY) {
				this.selectionEnd['y'] = posY;
			}else {
				var d1 = this.distance({x: this.selectionStart.x,y: posY},this.selectionStart)
				if (d1 < this.distance({x: this.selectionEnd.x,y: posY},this.selectionEnd)) {
					this.selectionStart['y'] = posY;
				} else {
					this.selectionEnd['y'] = posY;
				}
			}

			this.selectionTouchId = -1;
			this.selectDrawingObjects();
			this.moveSelectionBox();
			drawn = true;
			this.actualAction = "drawing";
			this.saveActionToActionStack(e, "creatingSelection", null);

		} else if ((this.actualAction == "movingSelection") && (this.selectionTouchId == e.sourceId)) {
			var dx = posX - this.selectionMovementStart['x'];
			var dy = posY - this.selectionMovementStart['y'];
			this.selectionStart.x += dx;
			this.selectionStart.y += dy;
			this.selectionEnd.x += dx;
			this.selectionEnd.y += dy;
			this.moveSelectionBox();
			this.selectionMove(dx, dy);
			this.selectionTouchId = -1;
			this.actualAction = "drawing";
			var completeMovementX = posX - this.movingSelectionStartingPosition.x;
			var completeMovementY = posY - this.movingSelectionStartingPosition.y;
			this.saveActionToActionStack(e.sourceId, "movingSelection",
				{selectionStart: this.selectionStart, selectionEnd: this.selectionEnd, dx: completeMovementX, dy: completeMovementY});
			this.movingSelectionStartingPosition = null;
		} else if ((this.actualAction == "zoomingSelection") && (this.selectionTouchId == e.sourceId)) {
			var dx = posX - this.selectionMovementStart['x'];
			var dy = posY - this.selectionMovementStart['y'];
			var oldW = this.selectionEnd.x - this.selectionStart.x;
			var oldH = this.selectionEnd.y - this.selectionStart.y;
			var newW = oldW + dx;
			var newH = oldH + dy;
			var sx = parseFloat(newW) / oldW;
			var sy = parseFloat(newH) / oldH;
			this.selectionMovementStart = {x: posX, y: posY};
			this.selectionEnd.x += dx;
			this.selectionEnd.y += dy;
			this.moveSelectionBox();
			this.selectionZoom(sx, sy);
			this.selectionTouchId = -1;
			this.actualAction = "drawing";
		}

		if (!drawn) {
			for (var j in this.idAssociatedToAction[e.sourceId]) {
				this.checkForApplications(this.idAssociatedToAction[e.sourceId][j]);
			}
			if (!this.touchInsidePalette(posX, posY)) {
				this.saveActionToActionStack(e, "drawing", null);
			}
			this.realeaseId(e.sourceId);
			return;
		}

	}

	var drawingId = this.dictionaryId[e.sourceId];
	var involvedClient = this.checkInvolvedClient(posX, posY);
	var manipulatedObject = this.manipulateDrawingObject(this.newDrawingObject[drawingId], involvedClient);

	this.update(manipulatedObject, involvedClient);
}

DrawingManager.prototype.checkForApplications = function (id) {
	var drawing;
	for (var i in this.drawState) {
		if (this.drawState[i].id == id){
			drawing = this.drawState[i];
			break;
		}
	}
	if (drawing) {
		var app;
		for (var i in drawing["options"]["points"]) {
			var p = drawing["options"]["points"][i];
			var obj = this.interactMgr.searchGeometry({x: p.x, y: p.y});
			if (obj && obj.layerId == "applications") {
				app = obj;
				break;
			}
		}
		if (app) {
			drawing.linkedAppID = obj.id;
		}
	}
}

DrawingManager.prototype.manipulateDrawingObject = function(drawingObject, clientID) {

	if (clientID == null) {
		return
	}

	// Cloning the drawing object to manipuate its position, in order to send to the clients its relativ position
	var manipulatedObject = JSON.parse(JSON.stringify(drawingObject));

	var offsetX = this.tilesPosition[clientID].startX;
	var offsetY = this.tilesPosition[clientID].startY;

	for (var i in manipulatedObject.options.points) {
		var point = manipulatedObject.options.points[i]

		manipulatedObject.options.points[i].x = point.x - offsetX;
		manipulatedObject.options.points[i].y = point.y - offsetY;

	}

	return manipulatedObject;

}

DrawingManager.prototype.isOnPalette = function(posX, posY) {

	if (this.palettePosition.startX <= posX &
		this.palettePosition.endX >= posX &
		this.palettePosition.startY <= posY &
		this.palettePosition.endY >= posY) {

		return true;

	}

	return false;
}

DrawingManager.prototype.updatePalettePosition = function(data) {
	this.palettePosition.startX = data.startX;
	this.palettePosition.startY = data.startY + 58;
	this.palettePosition.endX = data.endX;
	this.palettePosition.endY = data.endY;
}

DrawingManager.prototype.applicationMoved = function(id,newX,newY) {
	var oldX = this.interactMgr.getObject(id,"applications").x1;
	var oldY = this.interactMgr.getObject(id,"applications").y1;
	var dx = newX - oldX;
	var dy = newY - oldY;

	var toMove = [];

	for (var i in this.drawState) {
		var draw = this.drawState[i];
		if (draw.linkedAppID == id) {
			toMove.push(draw);
			for (var j in draw["options"]["points"]) {
				var p = draw["options"]["points"][j];
				p.x += dx;
				p.y += dy;
			}
		}
	}	
	if (toMove != []) {
		this.updateWithGroupDrawingObject(toMove);
	}
}

DrawingManager.prototype.applicationResized = function(id,newW,newH,origin) {
	var oldW = this.interactMgr.getObject(id,"applications").x2 - this.interactMgr.getObject(id,"applications").x1;
	var oldH = this.interactMgr.getObject(id,"applications").y2 - this.interactMgr.getObject(id,"applications").y1;
	var sx = newW / oldW;
	var sy = newH / oldH;
	if (!origin) {
		var origin = {x: this.interactMgr.getObject(id,"applications").x1, y: this.interactMgr.getObject(id,"applications").y1};
	}
	var toMove = [];

	for (var i in this.drawState) {
		var draw = this.drawState[i];
		if (draw.linkedAppID == id) {
			toMove.push(draw);
			for (var j in draw["options"]["points"]) {
				var p = draw["options"]["points"][j];
				draw["options"]["points"][j] = this.scalePoint(p,origin,sx,sy);
			}
		}
	}	
	if (toMove != []) {
		this.updateWithGroupDrawingObject(toMove);
	}
}

DrawingManager.prototype.checkInvolvedClient = function(posX, posY) {

	// Probably this method is inconsistent if the object start from a display and terminates in another

	for (var i in this.tilesPosition) {
		var client = this.tilesPosition[i];
		if (client.startX <= posX &
			client.endX >= posX &
			client.startY <= posY &
			client.endY >= posY) {

			return client.clientID;

		}

	}

	console.log("No single client involved")
	return null;

}

DrawingManager.prototype.saveDrawings = function() {
	this.saveSession(this.drawState);
}

DrawingManager.prototype.loadDrawings = function(data) {
	// asynchronous
	this.loadSession(data);
}

DrawingManager.prototype.loadOldState = function(data) {
	this.drawState = data || [];
	this.lastId = this.findMaxId() + 1;
	this.initAll();
}

DrawingManager.prototype.setCallbacks = function(
		drawingInitCB,
		drawingUpdateCB,
		drawingRemoveCB,
		sendTouchToPaletteCB,
		sendStyleToPaletteCB,
		sendChangeToPaletteCB,
		movePaletteToCB,
		saveSessionCB,
		loadSessionCB
	) {
	this.drawingInit = drawingInitCB;
	this.drawingUpdate = drawingUpdateCB;
	this.drawingRemove = drawingRemoveCB;
	this.sendTouchToPalette = sendTouchToPaletteCB;
	this.sendStyleToPalette = sendStyleToPaletteCB;
	this.sendChangeToPalette = sendChangeToPaletteCB;
	this.movePaletteTo = movePaletteToCB;
	this.saveSession = saveSessionCB;
	this.loadSession = loadSessionCB;
};
module.exports = DrawingManager;