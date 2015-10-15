"use strict"

function DrawingManager(){
	console.log("Created DrawingManager");
}

DrawingManager.prototype.pointerEvent= function(e,sourceID,posX,posY){
	console.log("pointer event received");
	console.log(e);
	//e.type=5 --> pointer down
	//e.type=4 --> pointer move
	//e.type=6 --> pointer release
}

module.exports = DrawingManager;