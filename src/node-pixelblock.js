// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/**
 * @module pixelblock
 */

// require variables to be declared
"use strict";

// chop RGB pixel buffer into square blocks
module.exports.rgbToPixelBlocks = function(rgbBuffer, width, height, maxSize) {

};

// chop RGBA pixel buffer into square blocks
module.exports.rgbaToPixelBlocks = function(rgbaBuffer, width, height, maxSize) {

};

// chop YUV420 pixel buffer into square blocks
module.exports.yuv420ToPixelBlocks = function(yuvBuffer, width, height, maxSize) {
	var uStart = width*height;
	var vStart = uStart + (width*height/4);

	var i, j, k;
	var blockBuffers = [];

	var horizontalBlocks = Math.ceil(width/maxSize);
	var verticalBlocks   = Math.ceil(height/maxSize);
	for(i=0; i<verticalBlocks; i++){
		for(j=0; j<horizontalBlocks; j++){
			var bWidth  = (j+1)*maxSize > width  ? width -(j*maxSize) : maxSize;
			var bHeight = (i+1)*maxSize > height ? height-(i*maxSize) : maxSize;
			var buStart = bWidth*bHeight;
			var bvStart = buStart + (bWidth*bHeight/4);
			var block   = new Buffer(bWidth*bHeight*1.5);

			for(k=0; k<bHeight; k++){
				var row = i*maxSize + k;
				var col = j*maxSize;
				var yStart = row*width + col;

				yuvBuffer.copy(block, k*bWidth, yStart, yStart+bWidth);
				if(k%2 === 0){
					var uvRow   = Math.floor(row/2);
					var uvCol   = Math.floor(col/2);
					var uvStart = uvRow*width/2 + uvCol;

					yuvBuffer.copy(block, buStart+k/2*bWidth/2, uStart+uvStart, uStart+uvStart+bWidth/2);
					yuvBuffer.copy(block, bvStart+k/2*bWidth/2, vStart+uvStart, vStart+uvStart+bWidth/2);
				}
			}
			blockBuffers.push(block);
		}
	}
	return blockBuffers;
};

// chop YUV422 pixel buffer into square blocks
module.exports.yuv422ToPixelBlocks = function(yuvBuffer, width, height, maxSize) {

};

// chop DXT1 pixel buffer into square blocks
module.exports.dxt1ToPixelBlocks = function(dxt1Buffer, width, height, maxSize) {

};
