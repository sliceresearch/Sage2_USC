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
 * Pixel block processing functions
 *
 * @module server
 * @submodule pixelblock
 * @class pixelblock
 */

// require variables to be declared
"use strict";

/**
 * Chop RGB pixel buffer into square blocks (NYI)
 *
 * @method rgbToPixelBlocks
 * @param rgbBuffer {Buffer} pixel buffer
 * @param width {Number} buffer width
 * @param height {Number} buffer height
 * @param maxSize {Number} block size (at most)
 * @return {Array} array of buffer, one for each block of pixel
 */
module.exports.rgbToPixelBlocks = function(rgbBuffer, width, height, maxSize) {
	var i, j, k;
	var blockBuffers = [];

	var horizontalBlocks = Math.ceil(width  / maxSize);
	var verticalBlocks   = Math.ceil(height / maxSize);
	for (i = 0; i < verticalBlocks; i++) {
		for (j = 0; j < horizontalBlocks; j++) {
			var bWidth  = (j + 1) * maxSize > width  ? width  - (j * maxSize) : maxSize;
			var bHeight = (i + 1) * maxSize > height ? height - (i * maxSize) : maxSize;
			var block   = new Buffer(bWidth * bHeight * 3);

			for (k = 0; k < bHeight; k++) {
				var row = i * maxSize + k;
				var col = j * maxSize;
				var start = 3 * (row * width + col);

				rgbBuffer.copy(block, k * bWidth * 3, start, start + bWidth * 3);
			}
			blockBuffers.push(block);
		}
	}

	return blockBuffers;
};

/**
 * Chop RGBA pixel buffer into square blocks (NYI)
 *
 * @method rgbaToPixelBlocks
 * @param rgbBuffer {Buffer} pixel buffer
 * @param width {Number} buffer width
 * @param height {Number} buffer height
 * @param maxSize {Number} block size (at most)
 * @return {Array} array of buffer, one for each block of pixel
 */
module.exports.rgbaToPixelBlocks = function(rgbaBuffer, width, height, maxSize) {
	var i, j, k;
	var blockBuffers = [];

	var horizontalBlocks = Math.ceil(width / maxSize);
	var verticalBlocks   = Math.ceil(height / maxSize);
	for (i = 0; i < verticalBlocks; i++) {
		for (j = 0; j < horizontalBlocks; j++) {
			var bWidth  = (j + 1) * maxSize > width  ? width - (j * maxSize) : maxSize;
			var bHeight = (i + 1) * maxSize > height ? height - (i * maxSize) : maxSize;
			var block   = new Buffer(bWidth * bHeight * 4);

			for (k = 0; k < bHeight; k++) {
				var row = i * maxSize + k;
				var col = j * maxSize;
				var start = 4 * (row * width + col);

				rgbaBuffer.copy(block, k * bWidth * 4, start, start + bWidth * 4);
			}
			blockBuffers.push(block);
		}
	}

	return blockBuffers;
};

/**
 * Chop YUV420 pixel buffer into square blocks
 *
 * @method yuv420ToPixelBlocks
 * @param yuvBuffer {Buffer} pixel buffer
 * @param width {Number} buffer width
 * @param height {Number} buffer height
 * @param maxSize {Number} block size (at most)
 * @return {Array} array of buffer, one for each block of pixel
 */
module.exports.yuv420ToPixelBlocks = function(yuvBuffer, width, height, maxSize) {
	var uStart = width * height;
	var vStart = uStart + (width * height / 4);

	var i, j, k;
	var blockBuffers = [];

	var horizontalBlocks = Math.ceil(width / maxSize);
	var verticalBlocks   = Math.ceil(height / maxSize);
	for (i = 0; i < verticalBlocks; i++) {
		for (j = 0; j < horizontalBlocks; j++) {
			var bWidth  = (j + 1) * maxSize > width  ? width - (j * maxSize) : maxSize;
			var bHeight = (i + 1) * maxSize > height ? height - (i * maxSize) : maxSize;
			var buStart = bWidth * bHeight;
			var bvStart = buStart + (bWidth * bHeight / 4);
			var block   = new Buffer(bWidth * bHeight * 1.5);

			for (k = 0; k < bHeight; k++) {
				var row = i * maxSize + k;
				var col = j * maxSize;
				var yStart = row * width + col;

				yuvBuffer.copy(block, k * bWidth, yStart, yStart + bWidth);
				if (k % 2 === 0) {
					var uvRow   = Math.floor(row / 2);
					var uvCol   = Math.floor(col / 2);
					var uvStart = uvRow * width / 2 + uvCol;

					yuvBuffer.copy(block, buStart + k / 2 * bWidth / 2, uStart + uvStart, uStart + uvStart + bWidth / 2);
					yuvBuffer.copy(block, bvStart + k / 2 * bWidth / 2, vStart + uvStart, vStart + uvStart + bWidth / 2);
				}
			}
			blockBuffers.push(block);
		}
	}
	return blockBuffers;
};

/**
 * Chop YUV422 pixel buffer into square blocks (NYI)
 *
 * @method yuv422ToPixelBlocks
 * @param yuvBuffer {Buffer} pixel buffer
 * @param width {Number} buffer width
 * @param height {Number} buffer height
 * @param maxSize {Number} block size (at most)
 * @return {Array} array of buffer, one for each block of pixel
 */
module.exports.yuv422ToPixelBlocks = function(yuvBuffer, width, height, maxSize) {

};

/**
 * Chop DXT1 pixel buffer into square blocks
 *
 * @method dxt1ToPixelBlocks
 * @param dxt1Buffer {Buffer} pixel buffer
 * @param width {Number} buffer width
 * @param height {Number} buffer height
 * @param maxSize {Number} block size (at most)
 * @return {Array} array of buffer, one for each block of pixel
 */
module.exports.dxt1ToPixelBlocks = function(dxt1Buffer, width, height, maxSize) {

};
