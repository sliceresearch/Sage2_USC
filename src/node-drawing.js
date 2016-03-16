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
	this.drawingMode = false;
	this.drawState = [{id: "drawing_1",type: "path",options: { points: [{x: 100,y: 200}, {x: 200,y: 300}] }, style: this.style}];
	this.tilesPosition = [];
	this.palettePosition = {};
	this.calculateTileDimensions(config);
	// this.actualAction = "drawing"

	// Reformat 1/27/2016
	this.nextTouchSelection = false;
	this.actionXTouch = {};
	this.ERASER_SIZE = 200;
	this.TITLE_BAR_HEIGHT = 58;
	this.paletteIsMoving = false;
	this.offsetFromPaletteXTouch = {};
	this.selectionIsUsed = false;
	this.lastPosition = {};
	this.undoStack = [];
	this.redoStack = [];
	this.lastTimeSeen = {};
	this.TIMEOUT_TIME = 5000;


	// this.possibleActions = ["drawing", "movingPalette"];
	this.paintingMode = false;
	this.selectionStart = {};
	this.selectionEnd = {};
	this.selectedDrawingObject = [];
	this.selectionMovementStart = [];
	this.selectionBox = null;
	this.interactMgr = null;
	this.actionDoneStack = [{type: "drawing", data: [this.drawState[0].id]}];
	this.actionRedoStack = [];
	this.idAssociatedToAction = [];
	this.maxLineSize = 20;
	this.movingSelectionStartingPosition = null;
	this.resizeSelectionStart = null;
	this.oldSelectionInfo = {};

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
	// this.actualAction = "creatingSelection"
	this.nextTouchSelection = true;
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

function isInside(s,arr) {
	for (var i in arr) {
		if (arr[i] == s) {
			return true;
		}
	}
	return false;
}


DrawingManager.prototype.saveDrawingToUndo = function(e) {
	var obj = {type: "drawingToUndo"};

	obj["data"] = this.idAssociatedToAction[e.sourceId];

	this.undoStack.push(obj);
}

DrawingManager.prototype.undoThisDrawingGroup = function(array) {
	var groupToDelete = [];

	var i = 0;
	while (i < this.drawState.length) {
		if (isInside(this.drawState[i].id, array)) {
			groupToDelete.push(this.drawState.splice(i,1)[0]);
		} else {
			i++;
		}
	}

	// Tell the clients to remove them
	this.removeDrawingObject(groupToDelete);

	return groupToDelete;
}

DrawingManager.prototype.redoThisDrawingGroup = function(array) {
	var idRedone = [];

	for (var i in array) {
		this.drawState.push(array[i]);
		idRedone.push(array[i].id);
	}
	this.updateWithGroupDrawingObject(array);

	return idRedone;
}


DrawingManager.prototype.undoLastDrawing = function() {
	console.log(this.undoStack);
	if (this.undoStack.length > 0) {
		var last = this.undoStack.pop()

		if (last.type == "drawingToUndo") {
			last.data = this.undoThisDrawingGroup(last.data);
			last.type = "drawingToRedo";
			this.redoStack.push(last);
		}
	}

}

DrawingManager.prototype.redoDrawing = function() {
	console.log(this.redoStack);
	if (this.redoStack.length > 0) {
		var last = this.redoStack.pop();

		if (last.type == "drawingToRedo") {
			last.data = this.redoThisDrawingGroup(last.data);
			last.type = "drawingToUndo";
			this.undoStack.push(last);
		}
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
	this.sendModesToPalette();
}

DrawingManager.prototype.reEnableDrawingMode = function(data) {
	console.log("Drawing mode reEnabled");
	this.drawingMode = true;
	console.log(this.palettePosition);
	this.sendStyleToPalette(this.paletteID,this.style);
	this.sendModesToPalette();
}

DrawingManager.prototype.disableDrawingMode = function(data) {
	console.log("Drawing mode disabled");
	this.drawingMode = false;
	// this.paletteID = null;
	this.sendModesToPalette();
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



DrawingManager.prototype.eraseArea = function(x,y,w,h) {
	// Erase everything in the given area

	var eraserBox = {x: x - w / 2,y: y - h / 2,w: w,h: h};
	var i = 0;
	var groupToDelete = [];
	while (i < this.drawState.length) {
		var draw = this.drawState[i]["options"]["points"];
		var inside = false;
		for (var j in draw) {
			var p = draw[j];
			if (p.x > eraserBox.x &&
				p.x < eraserBox.x + eraserBox.w  &&
				p.y > eraserBox.y &&
				p.y < eraserBox.y + eraserBox.h) {
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
		this.removeDrawingObject(groupToDelete);
	}
	// returns all the deleted elements?
	return groupToDelete;
}




DrawingManager.prototype.createNewDraw = function(e,posX,posY) {

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
		this.createNewDraw(e, posX, posY);
		this.idAssociatedToAction[e.sourceId] = [drawingId];
	}

	var drawingId = this.dictionaryId[e.sourceId];
	var lastPoint = this.newDrawingObject[drawingId]["options"]["points"]
					[this.newDrawingObject[drawingId]["options"]["points"].length - 1];
	if (this.distance(lastPoint, {x: posX, y: posY}) > 0.5) {
		this.newDrawingObject[drawingId]["type"] = "path";
		this.newDrawingObject[drawingId]["options"]["points"].push({x: posX,y: posY});
	}

	if (this.newDrawingObject[drawingId]["options"]["points"].length > this.maxLineSize) {
		var l = this.newDrawingObject[drawingId]["options"]["points"].length;
		var secondPart = this.newDrawingObject[drawingId]["options"]["points"].splice(this.maxLineSize - 1,l);
		this.newDrawingObject[drawingId]["options"]["points"].push(this.copy(secondPart[0]));
		this.realeaseId(e.sourceId);
		var id = this.getNewId(e.sourceId);
		if (this.idAssociatedToAction[e.sourceId]) {
			this.idAssociatedToAction[e.sourceId].push(id);
		}
		var newDraw = {};
		newDraw["type"] = "path";
		newDraw["style"] = this.newDrawingObject[drawingId]["style"];
		newDraw["options"] = {};
		newDraw["options"]["points"] = secondPart;
		newDraw["id"] = id;
		this.drawState.push(newDraw);
		this.newDrawingObject[id] = newDraw;
	}
}

DrawingManager.prototype.touchNearBottom = function(x,y) {
	var c = this.checkInvolvedClient(x,y);
	if (c != null && (c > -1)) {
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

	this.selectedDrawingObject = [];
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
		this.initAll();
	}
}


DrawingManager.prototype.selectionMove = function(x, y) {

	// var actionSelectionMove = {type: "selectionMove", data: {'x': x, 'y': y, obj: []}};

	for (var drawingObj in this.selectedDrawingObject) {
		var obj = this.selectedDrawingObject[drawingObj];
		// actionSelectionMove['data']['obj'].push(obj);
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

DrawingManager.prototype.startSelectionFrom = function(e,posX,posY) {
	this.deleteSelectionBox();
	this.selectionStart = {x: posX, y: posY};
	this.selectionEnd = {x: posX, y: posY};
	this.selectionIsUsed = true;
	this.newSelectionBox(e);
}

DrawingManager.prototype.updateCreatingSelection = function(posX,posY) {
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

}

DrawingManager.prototype.moveSelectionTo = function(e,posX,posY) {
	var dx = posX - this.lastPosition[e.sourceId]['x'];
	var dy = posY - this.lastPosition[e.sourceId]['y'];
	this.lastPosition[e.sourceId]['x'] = posX;
	this.lastPosition[e.sourceId]['y'] = posY;

	this.selectionStart.x += dx;
	this.selectionStart.y += dy;
	this.selectionEnd.x += dx;
	this.selectionEnd.y += dy;
	this.moveSelectionBox();
	this.selectionMove(dx, dy);
}

DrawingManager.prototype.zoomSelectionBy = function(e,posX,posY) {
	var dx = posX - this.lastPosition[e.sourceId]['x'];
	var dy = posY - this.lastPosition[e.sourceId]['y'];
	var oldW = this.selectionEnd.x - this.selectionStart.x;
	var oldH = this.selectionEnd.y - this.selectionStart.y;

	var newW = oldW + dx;
	var newH = oldH + dy;
	var sx = parseFloat(newW) / oldW;
	var sy = parseFloat(newH) / oldH;

	this.lastPosition[e.sourceId] = {x: posX, y: posY};
	this.selectionEnd.x += dx;
	this.selectionEnd.y += dy;
	this.moveSelectionBox();
	this.selectionZoom(sx, sy);

}

DrawingManager.prototype.updateTimer = function() {
	console.log(this.lastTimeSeen);
	var t = new Date();
	var timouted = [];
	for (var i in this.lastTimeSeen) {
		var e = this.lastTimeSeen[i];
		if (t - e > this.TIMEOUT_TIME) {
			console.log("Timeout for id: " + i);
			timouted.push(i);
			break;
		}
	}

	for (var j in timouted) {
		delete this.lastTimeSeen[timouted[j]];
		var fake = {sourceId: timouted[j],type: 6};
		this.pointerEvent(fake,timouted[j],0,0,0,0);
	}
}


DrawingManager.prototype.detectDownAction = function(posX,posY,w,h) {
	// First Priority: Moving & Using palette
	if (this.touchInsidePaletteTitleBar(posX,posY)) {

		// Check that nobody else is moving the palette
		if (!this.paletteIsMoving) {
			this.paletteIsMoving = true;
			return "movingPalette";
		}
		// somebody else is moving
		return "ignored";

	}
	if (this.touchInsidePalette(posX,posY)) {
		return "usePalette";
	}
	if (this.touchNearBottom(posX,posY)) {
		if (!this.paletteIsMoving) {
			this.paletteIsMoving = true;
			return "recallingPalette";
		}
		return "ignored";

	}

	// Second Priority: Selections
	if (this.nextTouchSelection) {
		this.nextTouchSelection = false;
		return "creatingSelection";
	}
	if (this.touchInsideSelectionZoomBox(posX,posY)) {
		if (!this.selectionIsUsed) {
			this.selectionIsUsed = true;
			return "zoomingSelection";
		}
		return "ignored";

	}
	if (this.touchInsideSelection(posX,posY)) {
		if (!this.selectionIsUsed) {
			this.selectionIsUsed = true;
			return "movingSelection";
		}
		return "ignored";

	}

	// Third Priority: Eraser
	if ((!this.paintingMode) && (Math.max(w,h) >= this.ERASER_SIZE)) {
		return "eraser";
	}


	// Default: Drawing

	return "drawing";

}

DrawingManager.prototype.touchDown = function(e,sourceId,posX,posY,w,h) {
	// Detect what the user wants to do with this touch
	var action = this.detectDownAction(posX,posY,w,h);
	this.actionXTouch[e.sourceId] = action;

	if (action == "movingPalette") {
		// Just save the offset
		this.offsetFromPaletteXTouch[e.sourceId] = {x: posX - this.palettePosition.startX,
													y: posY - this.palettePosition.startY + this.TITLE_BAR_HEIGHT};
		return;
	}

	// Action Performed at touch down: Using Palette
	if (action == "usePalette") {
		this.sendTouchToPalette(this.paletteID, posX - this.palettePosition.startX, posY - this.palettePosition.startY);
		return;
	}
	// Action Performed at touch down: recall Palette
	if (action == "recallingPalette") {
		this.movePaletteTo(this.paletteID
								, posX
								, this.palettePosition.startY - this.TITLE_BAR_HEIGHT
								, this.palettePosition.endX - this.palettePosition.startX
								, this.palettePosition.endY - this.palettePosition.startY);
		return;
	}

	if (action == "creatingSelection") {
		this.startSelectionFrom(e,posX,posY);
		return;
	}

	if (action == "movingSelection") {
		this.lastPosition[e.sourceId] = {x: posX, y: posY};
		return;
	}

	if (action == "zoomingSelection") {
		this.lastPosition[e.sourceId] = {x: posX, y: posY};
		return;
	}

	// Action Performed at touch down: erasing
	if (action == "eraser") {
		this.eraseArea(posX,posY,w,h);
		return;
	}

	// Action Performed at touch down: drawing
	if (action == "drawing") {
		if (!this.selectionIsUsed) {
			this.deleteSelectionBox();
		}
		if (this.paintingMode) {
			this.style["stroke-width"] = Math.max(w,h)
		}
		this.redoStack = [];
		this.createNewDraw(e,posX,posY);
		return;
	}






}

DrawingManager.prototype.touchMove = function(e,sourceId,posX,posY,w,h) {
	// do what is supposed to happen when a touch is moving
	var action = this.actionXTouch[e.sourceId];

	// First Priority: Moving palette (using ignored)
	if (action == "movingPalette") {
		var offX = this.offsetFromPaletteXTouch[e.sourceId].x || 0;
		var offY = this.offsetFromPaletteXTouch[e.sourceId].y || 0;
		this.movePaletteTo(this.paletteID
								, posX - offX
								, posY - offY
								, this.palettePosition.endX - this.palettePosition.startX
								, this.palettePosition.endY - this.palettePosition.startY);
	}

	if (action == "recallingPalette") {
		this.movePaletteTo(this.paletteID
								, posX
								, this.palettePosition.startY - this.TITLE_BAR_HEIGHT
								, this.palettePosition.endX - this.palettePosition.startX
								, this.palettePosition.endY - this.palettePosition.startY);
		return;
	}

	// Second Priority: Selections
	if (action == "creatingSelection") {
		this.updateCreatingSelection(posX,posY);
		return;
	}

	if (action == "movingSelection") {
		this.moveSelectionTo(e,posX,posY);
		return;
	}

	if (action == "zoomingSelection") {
		this.zoomSelectionBy(e,posX,posY);
		return;
	}

	// Third Priority: Eraser

	// A Drawing can become an eraser
	if ((!this.paintingMode) && (Math.max(w,h) >= this.ERASER_SIZE)) {
		action = "eraser";
		this.actionXTouch[e.sourceId] = action;
	}

	// An eraser can never go back to be a drawing
	if (action == "eraser") {
		this.eraseArea(posX,posY,w,h);
		return;
	}

	if (action == "drawing") {
		this.updateDrawingObject(e,posX,posY);
		return;
	}
}

DrawingManager.prototype.touchRelease = function(e,sourceId,posX,posY,w,h) {
	// do what is supposed to happen when a touch is released
	var action = this.actionXTouch[e.sourceId];

	if (action == "movingPalette") {
		delete this.offsetFromPaletteXTouch[e.sourceId];
		this.paletteIsMoving = false;
		return;
	}

	if (action == "recallingPalette") {
		this.paletteIsMoving = false;
		return;
	}

	if (action == "creatingSelection") {
		// Select what's in the selection right now
		this.selectDrawingObjects();

		this.selectionIsUsed = false;
		return;
	}

	if (action == "movingSelection") {

		delete this.lastPosition[e.sourceId];

		this.selectionIsUsed = false;
		return;
	}

	if (action == "zoomingSelection") {

		delete this.lastPosition[e.sourceId];

		this.selectionIsUsed = false;
		return;
	}


	if (action == "drawing") {
		// Check if an application is under one of the lines drawn by this id
		this.linkToApplication(e.sourceId);

		this.saveDrawingToUndo(e);

		// Release the drawingId
		this.realeaseId(e.sourceId);

	}
}


DrawingManager.prototype.pointerEvent = function(e,sourceId,posX,posY,w,h) {


	if (e.type == 5) {
		this.touchDown(e,sourceId,posX,posY,w,h);
		this.lastTimeSeen[e.sourceId] = new Date();
	} else if (e.type == 4) {
		this.touchMove(e,sourceId,posX,posY,w,h);
		this.lastTimeSeen[e.sourceId] = new Date();
	} else if (e.type == 6) {
		this.touchRelease(e,sourceId,posX,posY,w,h);
		delete this.lastTimeSeen[e.sourceId];
	}

	// console.log( e.type+": "+this.actionXTouch[e.sourceId]  );

	if (this.actionXTouch[e.sourceId] == "drawing") {
		var drawingId = this.dictionaryId[e.sourceId];
		var involvedClient = this.checkInvolvedClient(posX, posY);
		var manipulatedObject = this.manipulateDrawingObject(this.newDrawingObject[drawingId], involvedClient);

		this.update(manipulatedObject, involvedClient);
	}

	// Maybe a timeout system here?

	this.updateTimer(e,posX,posY);
}

DrawingManager.prototype.linkToApplication = function(touchId) {
	var application;
	for (var j in this.idAssociatedToAction[touchId]) {
		var application = this.checkForApplications(this.idAssociatedToAction[touchId][j]);
		if (application != undefined) {
			break;
		}
	}

	if (application != undefined) {
		// Application found, link to all lines
		for (var i in this.drawState) {
			if (this.drawState[i].id in this.idAssociatedToAction[touchId]) {
				this.drawState[i].linkedAppID = application.id;
			}
		}
	}


}

DrawingManager.prototype.checkForApplications = function(id) {
	var drawing;

	// Find the drawing with that id inside the drawing state
	for (var i in this.drawState) {
		if (this.drawState[i].id == id) {
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
				return obj;
			}
		}
	}

	return ;
}

DrawingManager.prototype.manipulateDrawingObject = function(drawingObject, clientID) {

	if (clientID == null || !drawingObject) {
		return;
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
	return;

}

DrawingManager.prototype.saveDrawings = function() {
	this.saveSession(this.drawState);
}

DrawingManager.prototype.loadDrawings = function(data) {
	// asynchronous
	this.loadSession(data);
}

DrawingManager.prototype.gotSessionsList = function(data) {
	this.sendSessionListToPalette(this.paletteID, data);
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
		sendDragToPaletteCB,
		sendStyleToPaletteCB,
		sendChangeToPaletteCB,
		movePaletteToCB,
		saveSessionCB,
		loadSessionCB,
		sendSessionListCB
	) {
	this.drawingInit = drawingInitCB;
	this.drawingUpdate = drawingUpdateCB;
	this.drawingRemove = drawingRemoveCB;
	this.sendTouchToPalette = sendTouchToPaletteCB;
	this.sendDragToPalette = sendDragToPaletteCB;
	this.sendStyleToPalette = sendStyleToPaletteCB;
	this.sendChangeToPalette = sendChangeToPaletteCB;
	this.movePaletteTo = movePaletteToCB;
	this.saveSession = saveSessionCB;
	this.loadSession = loadSessionCB;
	this.sendSessionListToPalette = sendSessionListCB;
};
module.exports = DrawingManager;