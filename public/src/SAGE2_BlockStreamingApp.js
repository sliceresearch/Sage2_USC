// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/* global mat4 */

"use strict";


/**
 * @module client
 * @submodule SAGE2_BlockStreamingApp
 */

/**
 * Base class for block streaming applications
 *
 * @class SAGE2_BlockStreamingApp
 */
var SAGE2_BlockStreamingApp = SAGE2_App.extend({

	/**
	* Init method, creates an 'canvas' tag in the DOM and setups up WebGL
	*
	* @method init
	* @param data {Object} contains initialization values (id, width, height, ...)
	*/
	blockStreamInit: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents     = "onfinish";
		this.moveEvents       = "continuous"; // "onfinish";
		this.enableControls   = true;

		this.canvas           = null;
		this.gl               = null;
		this.shaderProgram    = null;
		this.pMatrix          = null;

		this.ctx              = null;
		this.maxSize          = null;
		this.verticalBlocks   = null;
		this.horizontalBlocks = null;
		// this.rgbaBuffer       = [];
		this.rgbaTexture      = [];
		// this.rgbBuffer        = [];
		this.rgbTexture       = [];
		// this.yuvBuffer        = [];
		this.yTexture         = [];
		this.uTexture         = [];
		this.vTexture         = [];
		this.changeBlockList  = false;
		this.newBlockList     = null;
		this.validBlocks      = [];
		this.receivedBlocks   = [];

		this.squareVertexPositionBuffer     = [];
		this.squareVertexTextureCoordBuffer = [];
		this.squareVertexIndexBuffer        = [];

		this.canvas = document.createElement('canvas');
		this.canvas.id = data.id + "_canvas";
		this.canvas.style.position = "absolute";
		this.canvas.width  = ui.json_cfg.resolution.width;
		this.canvas.height = ui.json_cfg.resolution.height;
		this.element.appendChild(this.canvas);

		// application specific 'init'
		this.maxSize = 512; // block size
		this.maxFPS  = 60;

		// Setup a function for RAF call
		this.drawFunc = this.mydraw.bind(this);

		this.initGL();
		if (this.gl) {
			var _this = this;
			this.div.style.backgroundColor = "#000000";

			this.gl.clearColor(0.5, 0.5, 0.5, 1.0);
			this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

			this.pMatrix = mat4.create();

			this.initShaders(function() {
				// shaders compiled
				_this.resizeCanvas();
				_this.refresh(data.date);
			});
		}
		this.setValidBlocksFalse();
	},

	/**
	* Gets a WebGL context from the canvas
	*
	* @method initGL
	*/
	initGL: function() {
		this.gl = this.canvas.getContext("webgl");
		if (!this.gl) {
			this.gl = this.canvas.getContext("experimental-webgl");
		}
		if (!this.gl) {
			this.log("Unable to initialize WebGL. Your browser may not support it.");
		}
	},

	/**
	* Reset valid blocks to false
	*
	* @method setValidBlocksFalse
	*/
	setValidBlocksFalse: function() {
		for (var i = 0; i < this.receivedBlocks.length; i++) {
			if (this.validBlocks.indexOf(i) >= 0) {
				this.receivedBlocks[i] = false;
			} else {
				this.receivedBlocks[i] = true;
			}
		}
	},

	/**
	* Loads the yuv2rgb shaders
	*
	* @method initShaders
	* @param callback {Function} to be executed when shaders are loaded
	*/
	initShaders: function(callback) {
		if (this.state.colorspace === "RGBA" || this.state.colorspace === "RGB") {
			this.initRGBAShaders(callback);
		} else if (this.state.colorspace === "BGR") {
			this.initBGRShaders(callback);
		} else if (this.state.colorspace === "YUV420p") {
			this.initYUV420pShaders(callback);
		}
	},

	initRGBAShaders: function(callback) {
		var _this = this;
		var vertFile = "shaders/rgb.vert";
		var fragFile = "shaders/rgb.frag";

		this.getShaders(vertFile, fragFile, function(vertexShader, fragmentShader) {
			// Create the shader program
			_this.shaderProgram = _this.gl.createProgram();
			_this.gl.attachShader(_this.shaderProgram, vertexShader);
			_this.gl.attachShader(_this.shaderProgram, fragmentShader);
			_this.gl.linkProgram(_this.shaderProgram);

			// If creating the shader program failed, alert
			if (!_this.gl.getProgramParameter(_this.shaderProgram, _this.gl.LINK_STATUS)) {
				throw new Error('Unable to initialize the shader program');
			}

			_this.gl.useProgram(_this.shaderProgram);

			// set vertex array
			_this.shaderProgram.vertexPositionAttribute = _this.gl.getAttribLocation(_this.shaderProgram, "a_position");
			_this.gl.enableVertexAttribArray(_this.shaderProgram.vertexPositionAttribute);
			// set texture coord array
			_this.shaderProgram.textureCoordAttribute = _this.gl.getAttribLocation(_this.shaderProgram, "a_texCoord");
			_this.gl.enableVertexAttribArray(_this.shaderProgram.textureCoordAttribute);

			// set view matrix
			_this.shaderProgram.pMatrixUniform = _this.gl.getUniformLocation(_this.shaderProgram, "p_matrix");

			// set image texture
			_this.shaderProgram.samplerUniform1 = _this.gl.getUniformLocation(_this.shaderProgram, "rgb_image");

			callback();
		});
	},

	initBGRShaders: function(callback) {
		var _this = this;
		var vertFile = "shaders/rgb.vert";
		var fragFile = "shaders/bgr.frag";

		this.getShaders(vertFile, fragFile, function(vertexShader, fragmentShader) {
			// Create the shader program
			_this.shaderProgram = _this.gl.createProgram();
			_this.gl.attachShader(_this.shaderProgram, vertexShader);
			_this.gl.attachShader(_this.shaderProgram, fragmentShader);
			_this.gl.linkProgram(_this.shaderProgram);

			// If creating the shader program failed, alert
			if (!_this.gl.getProgramParameter(_this.shaderProgram, _this.gl.LINK_STATUS)) {
				throw new Error('Unable to initialize the shader program');
			}

			_this.gl.useProgram(_this.shaderProgram);

			// set vertex array
			_this.shaderProgram.vertexPositionAttribute = _this.gl.getAttribLocation(_this.shaderProgram, "a_position");
			_this.gl.enableVertexAttribArray(_this.shaderProgram.vertexPositionAttribute);
			// set texture coord array
			_this.shaderProgram.textureCoordAttribute = _this.gl.getAttribLocation(_this.shaderProgram, "a_texCoord");
			_this.gl.enableVertexAttribArray(_this.shaderProgram.textureCoordAttribute);

			// set view matrix
			_this.shaderProgram.pMatrixUniform = _this.gl.getUniformLocation(_this.shaderProgram, "p_matrix");

			// set image texture
			_this.shaderProgram.samplerUniform1 = _this.gl.getUniformLocation(_this.shaderProgram, "rgb_image");

			callback();
		});
	},

	initYUV420pShaders: function(callback) {
		var _this = this;
		var vertFile = "shaders/yuv2rgb.vert";
		var fragFile = "shaders/yuv2rgb.frag";

		this.getShaders(vertFile, fragFile, function(vertexShader, fragmentShader) {
			// Create the shader program
			_this.shaderProgram = _this.gl.createProgram();
			_this.gl.attachShader(_this.shaderProgram, vertexShader);
			_this.gl.attachShader(_this.shaderProgram, fragmentShader);
			_this.gl.linkProgram(_this.shaderProgram);

			// If creating the shader program failed, alert
			if (!_this.gl.getProgramParameter(_this.shaderProgram, _this.gl.LINK_STATUS)) {
				throw new Error('Unable to initialize the shader program');
			}

			_this.gl.useProgram(_this.shaderProgram);

			// set vertex array
			_this.shaderProgram.vertexPositionAttribute = _this.gl.getAttribLocation(_this.shaderProgram, "a_position");
			_this.gl.enableVertexAttribArray(_this.shaderProgram.vertexPositionAttribute);
			// set texture coord array
			_this.shaderProgram.textureCoordAttribute = _this.gl.getAttribLocation(_this.shaderProgram, "a_texCoord");
			_this.gl.enableVertexAttribArray(_this.shaderProgram.textureCoordAttribute);

			// set view matrix
			_this.shaderProgram.pMatrixUniform = _this.gl.getUniformLocation(_this.shaderProgram, "p_matrix");

			// set image texture
			_this.shaderProgram.samplerUniform1 = _this.gl.getUniformLocation(_this.shaderProgram, "y_image");
			_this.shaderProgram.samplerUniform2 = _this.gl.getUniformLocation(_this.shaderProgram, "u_image");
			_this.shaderProgram.samplerUniform3 = _this.gl.getUniformLocation(_this.shaderProgram, "v_image");

			callback();
		});
	},

	/**
	* Loads the shaders files from the server and creates the shaders
	*
	* @method getShaders
	* @param vertFile {String} filename of the vertex shader
	* @param fragFile {String} filename of the fragment shader
	* @param callback {Function} to be executed when shaders are loaded
	*/
	getShaders: function(vertFile, fragFile, callback) {
		var _this = this;

		var vertShader;
		var fragShader;

		var vertReadComplete = false;
		var fragReadComplete = false;

		readFile(vertFile, function(err, text) {
			if (err) {
				this.log(err);
			}

			vertShader = _this.gl.createShader(_this.gl.VERTEX_SHADER);

			// Send the source to the shader object
			_this.gl.shaderSource(vertShader, text);

			// Compile the shader program
			_this.gl.compileShader(vertShader);

			// See if it compiled successfully
			if (!_this.gl.getShaderParameter(vertShader, _this.gl.COMPILE_STATUS)) {
				this.log("An error occurred compiling the vertex shader: " + _this.gl.getShaderInfoLog(vertShader));
			}

			if (fragReadComplete) {
				callback(vertShader, fragShader);
			}

			vertReadComplete = true;
		});
		readFile(fragFile, function(err, text) {
			if (err) {
				this.log(err);
			}

			fragShader = _this.gl.createShader(_this.gl.FRAGMENT_SHADER);

			// Send the source to the shader object
			_this.gl.shaderSource(fragShader, text);

			// Compile the shader program
			_this.gl.compileShader(fragShader);

			// See if it compiled successfully
			if (!_this.gl.getShaderParameter(fragShader, _this.gl.COMPILE_STATUS)) {
				_this.log("An error occurred compiling the fragment shader: " + _this.gl.getShaderInfoLog(fragShader));
			}

			if (vertReadComplete) {
				callback(vertShader, fragShader);
			}

			fragReadComplete = true;
		});
	},

	/**
	* Initializes the GL buffers for the blocks of pixel
	*
	* @method initBuffers
	*/
	initBuffers: function() {
		var i, j;
		if (this.state.colorspace === "RGB" || this.state.colorspace === "BGR") {
			// Go bottom up
			// for (i = this.verticalBlocks - 1; i >= 0; i--) {
			// 	for (j = 0; j < this.horizontalBlocks; j++) {
			// 		this.initABlock(i, j);
			// 	}
			// }
			for (i = 0; i < this.verticalBlocks; i++) {
				for (j = 0; j < this.horizontalBlocks; j++) {
					this.initABlock(i, j);
				}
			}
		} else {
			// Go top down
			for (i = 0; i < this.verticalBlocks; i++) {
				for (j = 0; j < this.horizontalBlocks; j++) {
					this.initABlock(i, j);
				}
			}
		}
	},

	initABlock: function(i, j) {
		var bWidth  = (j + 1) * this.maxSize > this.state.width  ? this.state.width - (j * this.maxSize) : this.maxSize;
		var bHeight = (i + 1) * this.maxSize > this.state.height ? this.state.height - (i * this.maxSize) : this.maxSize;
		var bX = j * this.maxSize;
		var bY = i * this.maxSize;

		var left   =  (bX / this.state.width * 2.0) - 1.0;
		var right  = ((bX + bWidth) / this.state.width * 2.0) - 1.0;
		var bottom = -1 *  ((bY / this.state.height * 2.0) - 1.0);
		var top    = -1 * (((bY + bHeight) / this.state.height * 2.0) - 1.0);

		// vertices
		var squareVertexPositionBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, squareVertexPositionBuffer);
		var vertices = [
			left,  bottom,
			right, bottom,
			left,  top,
			right, top
		];
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
		squareVertexPositionBuffer.itemSize = 2;
		squareVertexPositionBuffer.numItems = 4;

		// texture
		var squareVertexTextureCoordBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, squareVertexTextureCoordBuffer);
		var textureCoords = [
			0.0,  1.0,
			1.0,  1.0,
			0.0,  0.0,
			1.0,  0.0
		];
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoords), this.gl.STATIC_DRAW);
		squareVertexTextureCoordBuffer.itemSize = 2;
		squareVertexTextureCoordBuffer.numItems = 4;

		// faces of triangles
		var squareVertexIndexBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, squareVertexIndexBuffer);
		var vertexIndices = [0, 1, 2,   2, 1, 3];
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndices), this.gl.STATIC_DRAW);
		squareVertexIndexBuffer.itemSize = 1;
		squareVertexIndexBuffer.numItems = 6;

		this.squareVertexPositionBuffer.push(squareVertexPositionBuffer);
		this.squareVertexTextureCoordBuffer.push(squareVertexTextureCoordBuffer);
		this.squareVertexIndexBuffer.push(squareVertexIndexBuffer);
	},

	/**
	* Initializes the GL textures for the blocks of pixel
	*
	* @method initTextures
	*/
	initTextures: function() {
		this.horizontalBlocks = Math.ceil(this.state.width / this.maxSize);
		this.verticalBlocks   = Math.ceil(this.state.height / this.maxSize);

		// Global settings for WebGL textures
		this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT,    1);
		// Flips the source data along its vertical axis if true
		this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

		if (this.state.colorspace === "RGBA") {
			this.initRGBATextures();
		} else if (this.state.colorspace === "RGB" || this.state.colorspace === "BGR") {
			this.initRGBTextures();
		} else if (this.state.colorspace === "YUV420p") {
			this.initYUV420pTextures();
		}
	},

	initRGBATextures: function() {
		for (var i = 0; i < this.verticalBlocks; i++) {
			for (var j = 0; j < this.horizontalBlocks; j++) {
				var bWidth  = (j + 1) * this.maxSize > this.state.width  ? this.state.width  - (j * this.maxSize) : this.maxSize;
				var bHeight = (i + 1) * this.maxSize > this.state.height ? this.state.height - (i * this.maxSize) : this.maxSize;

				var rgbaTexture = this.gl.createTexture();

				var rgbaBuffer = new Uint8Array(bWidth * bHeight * 4);

				this.gl.activeTexture(this.gl.TEXTURE0);
				this.gl.bindTexture(this.gl.TEXTURE_2D, rgbaTexture);
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, bWidth, bHeight,
					0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, rgbaBuffer);

				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

				this.rgbaTexture.push(rgbaTexture);

				// this.rgbaBuffer.push(rgbaBuffer);
			}
		}
	},

	initRGBTextures: function() {
		// Flips the source data along its vertical axis if true
		// this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);

		for (var i = 0; i < this.verticalBlocks; i++) {
			for (var j = 0; j < this.horizontalBlocks; j++) {
				var bWidth  = (j + 1) * this.maxSize > this.state.width  ? this.state.width  - (j * this.maxSize) : this.maxSize;
				var bHeight = (i + 1) * this.maxSize > this.state.height ? this.state.height - (i * this.maxSize) : this.maxSize;

				var rgbTexture = this.gl.createTexture();

				var rgbBuffer = new Uint8Array(bWidth * bHeight * 3);

				this.gl.activeTexture(this.gl.TEXTURE0);
				this.gl.bindTexture(this.gl.TEXTURE_2D, rgbTexture);
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, bWidth, bHeight,
					0, this.gl.RGB, this.gl.UNSIGNED_BYTE, rgbBuffer);

				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

				this.rgbTexture.push(rgbTexture);

				// this.rgbBuffer.push(rgbBuffer);
			}
		}
	},

	initYUV420pTextures: function() {
		for (var i = 0; i < this.verticalBlocks; i++) {
			for (var j = 0; j < this.horizontalBlocks; j++) {
				var bWidth  = (j + 1) * this.maxSize > this.state.width  ? this.state.width - (j * this.maxSize) : this.maxSize;
				var bHeight = (i + 1) * this.maxSize > this.state.height ? this.state.height - (i * this.maxSize) : this.maxSize;

				var yTexture = this.gl.createTexture();
				var uTexture = this.gl.createTexture();
				var vTexture = this.gl.createTexture();

				var yBuffer = new Uint8Array(bWidth * bHeight);
				var uBuffer = new Uint8Array(bWidth * bHeight / 4);
				var vBuffer = new Uint8Array(bWidth * bHeight / 4);

				this.gl.bindTexture(this.gl.TEXTURE_2D, yTexture);
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, bWidth, bHeight, 0,
					this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, yBuffer);

				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

				this.gl.bindTexture(this.gl.TEXTURE_2D, uTexture);
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, bWidth / 2, bHeight / 2, 0,
					this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, uBuffer);

				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

				this.gl.bindTexture(this.gl.TEXTURE_2D, vTexture);
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, bWidth / 2, bHeight / 2, 0,
					this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, vBuffer);

				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

				this.gl.bindTexture(this.gl.TEXTURE_2D, null);

				this.yTexture.push(yTexture);
				this.uTexture.push(uTexture);
				this.vTexture.push(vTexture);


				// var yuvBuffer = new Uint8Array(bWidth * bHeight * 1.5);
				// yuvBuffer.set(yBuffer, 0);
				// yuvBuffer.set(uBuffer, bWidth * bHeight);
				// yuvBuffer.set(vBuffer, bWidth * bHeight + bWidth * bHeight / 4);
				// this.yuvBuffer.push(yuvBuffer);
			}
		}
	},

	/**
	* Sets a block of pixels into a buffer
	*
	* @method textureData
	* @param blockIdx {Number} index to the block
	* @param yuvBuffer {Object} pixel data
	*/
	textureData: function(blockIdx, buffer) {
		if (this.state.colorspace === "RGBA") {
			this.textureDataRGBA(blockIdx, buffer);
		} else if (this.state.colorspace === "RGB" || this.state.colorspace === "BGR") {
			this.textureDataRGB(blockIdx, buffer);
		} else if (this.state.colorspace === "YUV420p") {
			this.textureDataYUV420p(blockIdx, buffer);
		}
	},

	textureDataRGBA: function(blockIdx, rgbaBuffer) {
		// this.rgbaBuffer[blockIdx] = rgbaBuffer;
		this.receivedBlocks[blockIdx] = true;


		// Updating the texture right away
		var i, j;
		i = Math.floor(blockIdx / this.horizontalBlocks);
		j = blockIdx % this.horizontalBlocks;
		var bWidth  = (j + 1) * this.maxSize > this.state.width  ? this.state.width  - (j * this.maxSize) : this.maxSize;
		var bHeight = (i + 1) * this.maxSize > this.state.height ? this.state.height - (i * this.maxSize) : this.maxSize;
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.rgbaTexture[blockIdx]);
		this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth, bHeight, this.gl.RGBA,
			this.gl.UNSIGNED_BYTE, rgbaBuffer);
	},

	textureDataRGB: function(blockIdx, rgbBuffer) {
		// this.rgbBuffer[blockIdx] = rgbBuffer;
		this.receivedBlocks[blockIdx] = true;


		// Updating the texture right away
		var i, j;
		i = Math.floor(blockIdx / this.horizontalBlocks);
		j = blockIdx % this.horizontalBlocks;
		var bWidth  = (j + 1) * this.maxSize > this.state.width  ? this.state.width  - (j * this.maxSize) : this.maxSize;
		var bHeight = (i + 1) * this.maxSize > this.state.height ? this.state.height - (i * this.maxSize) : this.maxSize;
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.rgbTexture[blockIdx]);
		this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth, bHeight, this.gl.RGB,
			this.gl.UNSIGNED_BYTE, rgbBuffer);
	},

	textureDataYUV420p: function(blockIdx, yuvBuffer) {
		// this.yuvBuffer[blockIdx] = yuvBuffer;
		this.receivedBlocks[blockIdx] = true;

		// Updating the texture right away
		var i, j;
		i = Math.floor(blockIdx / this.horizontalBlocks);
		j = blockIdx % this.horizontalBlocks;

		var bWidth  = (j + 1) * this.maxSize > this.state.width  ? this.state.width  - (j * this.maxSize) : this.maxSize;
		var bHeight = (i + 1) * this.maxSize > this.state.height ? this.state.height - (i * this.maxSize) : this.maxSize;

		var yEnd = bWidth * bHeight;
		var uEnd = yEnd + bWidth * bHeight / 4;
		var vEnd = uEnd + bWidth * bHeight / 4;

		// var yBuffer = yuvBuffer.subarray(0,    yEnd);
		// var uBuffer = yuvBuffer.subarray(yEnd, uEnd);
		// var vBuffer = yuvBuffer.subarray(uEnd, vEnd);

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.yTexture[blockIdx]);
		this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth, bHeight, this.gl.LUMINANCE,
			this.gl.UNSIGNED_BYTE, yuvBuffer);

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.uTexture[blockIdx]);
		this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth / 2, bHeight / 2, this.gl.LUMINANCE,
			this.gl.UNSIGNED_BYTE, yuvBuffer.subarray(yEnd, uEnd));

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.vTexture[blockIdx]);
		this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth / 2, bHeight / 2, this.gl.LUMINANCE,
			this.gl.UNSIGNED_BYTE, yuvBuffer.subarray(uEnd, vEnd));
	},

	/**
	* Update the textures with the new pixel data
	*
	* @method updateTextures
	*/
	updateTextures: function() {
		if (this.state.colorspace === "RGBA") {
			this.updateTexturesRGBA();
		} else if (this.state.colorspace === "RGB" || this.state.colorspace === "BGR") {
			this.updateTexturesRGB();
		} else if (this.state.colorspace === "YUV420p") {
			this.updateTexturesYUV420p();
		}
	},

	updateTexturesRGBA: function() {
		// for (var i = 0; i < this.verticalBlocks; i++) {
		// 	for (var j = 0; j < this.horizontalBlocks; j++) {
		// 		var blockIdx = i * this.horizontalBlocks + j;
		// 		// Update only valid bocks
		// 		if (this.validBlocks.indexOf(blockIdx) >= 0) {
		// 			var bWidth  = (j + 1) * this.maxSize > this.state.width  ? this.state.width  - (j * this.maxSize) : this.maxSize;
		// 			var bHeight = (i + 1) * this.maxSize > this.state.height ? this.state.height - (i * this.maxSize) : this.maxSize;

		// 			this.gl.bindTexture(this.gl.TEXTURE_2D, this.rgbaTexture[blockIdx]);
		// 			this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth, bHeight, this.gl.RGBA,
		// 						this.gl.UNSIGNED_BYTE, this.rgbaBuffer[blockIdx]);
		// 			this.gl.bindTexture(this.gl.TEXTURE_2D, null);
		// 		}
		// 	}
		// }
	},

	updateTexturesRGB: function() {
		// for (var i = 0; i < this.verticalBlocks; i++) {
		// 	for (var j = 0; j < this.horizontalBlocks; j++) {
		// 		var blockIdx = i * this.horizontalBlocks + j;
		// 		// Update only valid bocks
		// 		if (this.validBlocks.indexOf(blockIdx) >= 0) {
		// 			var bWidth  = (j + 1) * this.maxSize > this.state.width  ? this.state.width  - (j * this.maxSize) : this.maxSize;
		// 			var bHeight = (i + 1) * this.maxSize > this.state.height ? this.state.height - (i * this.maxSize) : this.maxSize;

		// 			this.gl.bindTexture(this.gl.TEXTURE_2D, this.rgbTexture[blockIdx]);
		// 			this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth, bHeight, this.gl.RGB,
		// 						this.gl.UNSIGNED_BYTE, this.rgbBuffer[blockIdx]);
		// 		}
		// 	}
		// }
	},

	updateTexturesYUV420p: function() {
		// for (var i = 0; i < this.verticalBlocks; i++) {
		// 	for (var j = 0; j < this.horizontalBlocks; j++) {
		// 		var blockIdx = i * this.horizontalBlocks + j;
		// 		// Update only valid bocks
		// 		if (this.validBlocks.indexOf(blockIdx) >= 0) {
		// 			var bWidth  = (j + 1) * this.maxSize > this.state.width  ? this.state.width  - (j * this.maxSize) : this.maxSize;
		// 			var bHeight = (i + 1) * this.maxSize > this.state.height ? this.state.height - (i * this.maxSize) : this.maxSize;

		// 			var yEnd = bWidth * bHeight;
		// 			var uEnd = yEnd + bWidth * bHeight / 4;
		// 			var vEnd = uEnd + bWidth * bHeight / 4;

		// 			var yBuffer = this.yuvBuffer[blockIdx].subarray(0,    yEnd);
		// 			var uBuffer = this.yuvBuffer[blockIdx].subarray(yEnd, uEnd);
		// 			var vBuffer = this.yuvBuffer[blockIdx].subarray(uEnd, vEnd);

		// 			this.gl.bindTexture(this.gl.TEXTURE_2D, this.yTexture[blockIdx]);
		// 			this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth, bHeight, this.gl.LUMINANCE,
		// 						this.gl.UNSIGNED_BYTE, yBuffer);

		// 			this.gl.bindTexture(this.gl.TEXTURE_2D, this.uTexture[blockIdx]);
		// 			this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth / 2, bHeight / 2, this.gl.LUMINANCE,
		// 						this.gl.UNSIGNED_BYTE, uBuffer);

		// 			this.gl.bindTexture(this.gl.TEXTURE_2D, this.vTexture[blockIdx]);
		// 			this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth / 2, bHeight / 2, this.gl.LUMINANCE,
		// 						this.gl.UNSIGNED_BYTE, vBuffer);

		// 			this.gl.bindTexture(this.gl.TEXTURE_2D, null);
		// 		}
		// 	}
		// }
	},

	/**
	* Loads the app from a previous state and initializes the buffers and textures
	*
	* @method firstLoad
	*/
	firstLoad: function() {
		this.horizontalBlocks = Math.ceil(this.state.width / this.maxSize);
		this.verticalBlocks   = Math.ceil(this.state.height / this.maxSize);
		this.receivedBlocks   = initializeArray(this.horizontalBlocks * this.verticalBlocks, false);

		this.initBuffers();
		this.initTextures();
	},

	/**
	* Draw function, draws each blocks
	*
	* @method draw
	* @param date {Date} current time from the server
	*/
	draw: function(date) {
		// Schedule a draw call
		requestAnimationFrame(this.drawFunc);
	},

	mydraw: function(date) {
		if (this.shaderProgram === undefined || this.shaderProgram === null) {
			// this.log("waiting for shaders to load");
			return;
		}

		// if (this.state.colorspace === "RGBA" && (this.rgbaBuffer === undefined || this.rgbaBuffer === null)) {
		// 	this.log("no RGBA texture loaded");
		// 	return;
		// }
		// if (this.state.colorspace === "RGB" && (this.rgbBuffer === undefined || this.rgbBuffer === null)) {
		// 	this.log("no RGB texture loaded");
		// 	return;
		// }
		// if (this.state.colorspace === "BGR" && (this.rgbBuffer === undefined || this.rgbBuffer === null)) {
		// 	this.log("no BGR texture loaded");
		// 	return;
		// }
		// if (this.state.colorspace === "YUV420p" && (this.yuvBuffer === undefined || this.yuvBuffer === null)) {
		// 	this.log("no YUV420p texture loaded");
		// 	return;
		// }

		// this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		// this.updateTextures();

		if (this.state.colorspace === "RGBA") {
			this.drawRGBA();
		} else if (this.state.colorspace === "RGB" || this.state.colorspace === "BGR") {
			this.drawRGB();
		} else if (this.state.colorspace === "YUV420p") {
			this.drawYUV420p();
		}
	},

	drawRGBA: function() {
		for (var i = 0; i < this.verticalBlocks; i++) {
			for (var j = 0; j < this.horizontalBlocks; j++) {
				var blockIdx = i * this.horizontalBlocks + j;
				// Draw only valid bocks
				if (this.validBlocks.indexOf(blockIdx) >= 0) {

					this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer[blockIdx]);
					this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute,
						this.squareVertexPositionBuffer[blockIdx].itemSize, this.gl.FLOAT, false, 0, 0);

					this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexTextureCoordBuffer[blockIdx]);
					this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute,
						this.squareVertexTextureCoordBuffer[blockIdx].itemSize, this.gl.FLOAT, false, 0, 0);

					this.gl.bindTexture(this.gl.TEXTURE_2D, this.rgbaTexture[blockIdx]);
					this.gl.uniform1i(this.shaderProgram.samplerUniform1, 0);

					this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.squareVertexIndexBuffer[blockIdx]);
					this.gl.drawElements(this.gl.TRIANGLES, this.squareVertexIndexBuffer[blockIdx].numItems,
						this.gl.UNSIGNED_SHORT, 0);
				}
			}
		}
	},

	drawRGB: function() {
		for (var i = 0; i < this.verticalBlocks; i++) {
			for (var j = 0; j < this.horizontalBlocks; j++) {
				var blockIdx   = i * this.horizontalBlocks + j;
				// Draw only valid bocks
				if (this.validBlocks.indexOf(blockIdx) >= 0) {

					this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer[blockIdx]);
					this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute,
						this.squareVertexPositionBuffer[blockIdx].itemSize, this.gl.FLOAT, false, 0, 0);

					this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexTextureCoordBuffer[blockIdx]);
					this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute,
						this.squareVertexTextureCoordBuffer[blockIdx].itemSize, this.gl.FLOAT, false, 0, 0);

					this.gl.bindTexture(this.gl.TEXTURE_2D, this.rgbTexture[blockIdx]);
					this.gl.uniform1i(this.shaderProgram.samplerUniform1, 0);

					this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.squareVertexIndexBuffer[blockIdx]);
					this.gl.drawElements(this.gl.TRIANGLES, this.squareVertexIndexBuffer[blockIdx].numItems,
						this.gl.UNSIGNED_SHORT, 0);
				}
			}
		}
	},

	drawYUV420p: function() {
		for (var i = 0; i < this.verticalBlocks; i++) {
			for (var j = 0; j < this.horizontalBlocks; j++) {
				var blockIdx = i * this.horizontalBlocks + j;
				// Draw only valid bocks
				if (this.validBlocks.indexOf(blockIdx) >= 0) {
					this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer[blockIdx]);
					this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute,
						this.squareVertexPositionBuffer[blockIdx].itemSize, this.gl.FLOAT, false, 0, 0);

					this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexTextureCoordBuffer[blockIdx]);
					this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute,
						this.squareVertexTextureCoordBuffer[blockIdx].itemSize, this.gl.FLOAT, false, 0, 0);

					this.gl.activeTexture(this.gl.TEXTURE0);
					this.gl.bindTexture(this.gl.TEXTURE_2D, this.yTexture[blockIdx]);
					this.gl.uniform1i(this.shaderProgram.samplerUniform1, 0);

					this.gl.activeTexture(this.gl.TEXTURE1);
					this.gl.bindTexture(this.gl.TEXTURE_2D, this.uTexture[blockIdx]);
					this.gl.uniform1i(this.shaderProgram.samplerUniform2, 1);

					this.gl.activeTexture(this.gl.TEXTURE2);
					this.gl.bindTexture(this.gl.TEXTURE_2D, this.vTexture[blockIdx]);
					this.gl.uniform1i(this.shaderProgram.samplerUniform3, 2);

					this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.squareVertexIndexBuffer[blockIdx]);
					this.gl.drawElements(this.gl.TRIANGLES, this.squareVertexIndexBuffer[blockIdx].numItems,
						this.gl.UNSIGNED_SHORT, 0);
				}
			}
		}
	},

	/**
	* Resize the canvas in local (client) coordinates, never bigger than the local screen
	*
	* @method resizeCanvas
	*/
	resizeCanvas: function() {
		if (this.shaderProgram === undefined || this.shaderProgram === null) {
			return;
		}

		var checkWidth  = this.config.resolution.width;
		var checkHeight = this.config.resolution.height;
		// Overview client covers all
		if (clientID === -1) {
			// set the resolution to be the whole display wall
			checkWidth  *= this.config.layout.columns;
			checkHeight *= this.config.layout.rows;
		} else {
			checkWidth  *= (ui.json_cfg.displays[clientID].width || 1);
			checkHeight *= (ui.json_cfg.displays[clientID].height || 1);
		}

		var localX = this.sage2_x - ui.offsetX;
		var localY = this.sage2_y - ui.offsetY;
		var localRight  = localX + this.sage2_width;
		var localBottom = localY + this.sage2_height;
		var viewX = Math.max(localX, 0);
		var viewY = Math.max(localY, 0);
		var viewRight   = Math.min(localRight,  checkWidth);
		var viewBottom  = Math.min(localBottom, checkHeight);
		var localWidth  = viewRight  - viewX;
		var localHeight = viewBottom - viewY;

		// completely off-screen
		if (localWidth <= 0 || localHeight <= 0) {
			this.canvas.width  = 1;
			this.canvas.height = 1;
			this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		} else {
			var parentTransform = getTransform(this.div.parentNode);
			this.canvas.width  = localWidth / parentTransform.scale.x;
			this.canvas.height = localHeight / parentTransform.scale.y;
			this.canvas.style.left = ((viewX - localX) / parentTransform.scale.x) + "px";
			this.canvas.style.top  = ((viewY - localY) / parentTransform.scale.y) + "px";

			var left   = ((viewX     - localX) / (localRight - localX) * 2.0) - 1.0;
			var right  = ((viewRight - localX) / (localRight - localX) * 2.0) - 1.0;
			var top    = ((1.0 - (viewY     - localY) / (localBottom - localY)) * 2.0) - 1.0;
			var bottom = ((1.0 - (viewBottom - localY) / (localBottom - localY)) * 2.0) - 1.0;

			mat4.ortho(left, right, bottom, top, -1, 1, this.pMatrix);
			this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
			this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		}
	},

	/**
	* When a move starts, hide the canvas
	*
	* @method startMove
	* @param date {Date} current time from the server
	*/
	startMove: function(date) {
		this.canvas.style.display = "none";
	},

	/**
	* After move, show the canvas and update the coordinate system (resizeCanvas)
	*
	* @method move
	* @param date {Date} current time from the server
	*/
	move: function(date) {
		this.canvas.style.display = "block";
		this.resizeCanvas();
		this.refresh(date);
	},

	/**
	* When a resize starts, hide the canvas
	*
	* @method startResize
	* @param date {Date} current time from the server
	*/
	startResize: function(date) {
		this.canvas.style.display = "none";
	},

	/**
	* After resize, show the canvas and update the coordinate system (resizeCanvas)
	*
	* @method resize
	* @param date {Date} current time from the server
	*/
	resize: function(date) {
		this.canvas.style.display = "block";
		this.resizeCanvas();
		this.refresh(date);
	},

	/**
	* Handles event processing for the app
	*
	* @method event
	* @param eventType {String} the type of event
	* @param position {Object} contains the x and y positions of the event
	* @param user_id {Object} data about the user who triggered the event
	* @param data {Object} object containing extra data about the event,
	* @param date {Date} current time from the server
	*/
	event: function(type, position, user, data, date) {
	}

});
