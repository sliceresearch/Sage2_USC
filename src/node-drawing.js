"use strict"

function DrawingManager(){
	console.log("Create");
}

DrawingManager.prototype.pointerEvent(e,sourceID,posX,posY){
	console.log("pointer event received: ")
	console.log(e);
	//e.type=5 --> pointer down
	//e.type=4 --> pointer move
	//e.type=6 --> pointer release
}

module.exports = DrawingManager;