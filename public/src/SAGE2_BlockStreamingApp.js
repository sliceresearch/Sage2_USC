// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var SAGE2_BlockStreamingApp = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.moveEvents     = "onfinish";
		this.resizeEvents   = "onfinish";
		this.enableControls = true;

		this.canvas           = null;
		this.gl               = null;
		this.shaderProgram    = null;
		this.pMatrix          = null;

		this.ctx              = null;
		this.maxSize          = null;
		this.verticalBlocks   = null;
		this.horizontalBlocks = null;
		this.yuvBuffer        = [];
		this.yTexture         = [];
		this.uTexture         = [];
		this.vTexture         = [];
		this.changeBlockList  = false;
		this.newBlockList     = null;
		this.validBlocks      = [];
		this.receivedBlocks   = [];

		this.state.paused = true;
		this.state.muted = false;
		this.state.looped = false;
		this.state.frame = 0;

		this.squareVertexPositionBuffer     = [];
		this.squareVertexTextureCoordBuffer = [];
		this.squareVertexIndexBuffer        = [];
	},

	init: function(elem, data) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, elem, data);
		this.canvas = document.createElement('canvas');
		this.canvas.id = data.id + "_canvas";
		this.canvas.style.position = "absolute";
		this.canvas.width  = ui.json_cfg.resolution.width;
		this.canvas.height = ui.json_cfg.resolution.height;
		this.element.appendChild(this.canvas);

		// application specific 'init'
		this.maxSize = 128; // block size

		this.initGL();
		if(this.gl){
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

	initGL: function() {
		this.gl = this.canvas.getContext("webgl");
		if(!this.gl) this.gl = this.canvas.getContext("experimental-webgl");
		if(!this.gl) this.log("Unable to initialize WebGL. Your browser may not support it.");
	},

    setValidBlocksFalse: function() {
        console.log("setValidBlocks");
		for(var i=0; i<this.receivedBlocks.length; i++){
			if(this.validBlocks.indexOf(i) >= 0) this.receivedBlocks[i] = false;
			else                                 this.receivedBlocks[i] = true;
		}
	},

	initShaders: function(callback) {
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
			if(!_this.gl.getProgramParameter(_this.shaderProgram, _this.gl.LINK_STATUS)){
				alert("Unable to initialize the shader program.");
			}

			_this.gl.useProgram(_this.shaderProgram);

			// set vertex array
			_this.shaderProgram.vertexPositionAttribute = _this.gl.getAttribLocation(_this.shaderProgram, "a_position");
			_this.gl.enableVertexAttribArray(_this.shaderProgram.vertexPositionAttribute);
			// set texture coord array
			_this.shaderProgram.textureCoordAttribute = _this.gl.getAttribLocation(_this.shaderProgram, "a_texCoord");
			_this.gl.enableVertexAttribArray(_this.shaderProgram.textureCoordAttribute);

			//set view matrix
			_this.shaderProgram.pMatrixUniform = _this.gl.getUniformLocation(_this.shaderProgram, "p_matrix");

			// set image texture
			_this.shaderProgram.samplerUniform1 = _this.gl.getUniformLocation(_this.shaderProgram, "y_image");
			_this.shaderProgram.samplerUniform2 = _this.gl.getUniformLocation(_this.shaderProgram, "u_image");
			_this.shaderProgram.samplerUniform3 = _this.gl.getUniformLocation(_this.shaderProgram, "v_image");

			callback();
		});
	},

	getShaders: function(vertFile, fragFile, callback) {
		var _this = this;

		var vertShader;
		var fragShader;

		var vertReadComplete = false;
		var fragReadComplete = false;

		readFile(vertFile, function(err, text) {
			if(err) this.log(err);

			vertShader = _this.gl.createShader(_this.gl.VERTEX_SHADER);

			// Send the source to the shader object
			_this.gl.shaderSource(vertShader, text);

			// Compile the shader program
			_this.gl.compileShader(vertShader);

			// See if it compiled successfully
			if(!_this.gl.getShaderParameter(vertShader, _this.gl.COMPILE_STATUS)){
				this.log("An error occurred compiling the vertex shader: " + _this.gl.getShaderInfoLog(vertShader));
			}

			if(fragReadComplete) callback(vertShader, fragShader);

			vertReadComplete = true;
		});
		readFile(fragFile, function(err, text) {
			if(err) this.log(err);

			fragShader = _this.gl.createShader(_this.gl.FRAGMENT_SHADER);

			// Send the source to the shader object
			_this.gl.shaderSource(fragShader, text);

			// Compile the shader program
			_this.gl.compileShader(fragShader);

			// See if it compiled successfully
			if(!_this.gl.getShaderParameter(fragShader, _this.gl.COMPILE_STATUS)){
				this.log("An error occurred compiling the fragment shader: " + _this.gl.getShaderInfoLog(fragShader));
			}

			if(vertReadComplete) callback(vertShader, fragShader);

			fragReadComplete = true;
		});
	},

	initBuffers: function() {
		this.log(this.state);
		for(var i=0; i<this.verticalBlocks; i++){
			for(var j=0; j<this.horizontalBlocks; j++){
				var bWidth  = (j+1)*this.maxSize > this.state.width  ? this.state.width -(j*this.maxSize) : this.maxSize;
				var bHeight = (i+1)*this.maxSize > this.state.height ? this.state.height-(i*this.maxSize) : this.maxSize;
				var bX = j*this.maxSize;
				var bY = i*this.maxSize;

				var left   =  (bX         /this.state.width *2.0) - 1.0;
				var right  = ((bX+bWidth) /this.state.width *2.0) - 1.0;
				var bottom = -1 *  ((bY         /this.state.height*2.0) - 1.0);
				var top    = -1 * (((bY+bHeight)/this.state.height*2.0) - 1.0);

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
				var vertexIndices = [
					 0, 1, 2,   2, 1, 3
				];
				this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndices), this.gl.STATIC_DRAW);
				squareVertexIndexBuffer.itemSize = 1;
				squareVertexIndexBuffer.numItems = 6;


				this.squareVertexPositionBuffer.push(squareVertexPositionBuffer);
				this.squareVertexTextureCoordBuffer.push(squareVertexTextureCoordBuffer);
				this.squareVertexIndexBuffer.push(squareVertexIndexBuffer);
			}
		}
	},

	initTextures: function() {
        console.log("initTextures");
		this.horizontalBlocks = Math.ceil(this.state.width /this.maxSize);
		this.verticalBlocks   = Math.ceil(this.state.height/this.maxSize);

		for(var i=0; i<this.verticalBlocks; i++){
			for(var j=0; j<this.horizontalBlocks; j++){
				var bWidth  = (j+1)*this.maxSize > this.state.width  ? this.state.width -(j*this.maxSize) : this.maxSize;
				var bHeight = (i+1)*this.maxSize > this.state.height ? this.state.height-(i*this.maxSize) : this.maxSize;

				var yTexture = this.gl.createTexture();
				var uTexture = this.gl.createTexture();
				var vTexture = this.gl.createTexture();

				var yBuffer = new Uint8Array(bWidth*bHeight);
				var uBuffer = new Uint8Array(bWidth*bHeight/4);
				var vBuffer = new Uint8Array(bWidth*bHeight/4);

				this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

				this.gl.bindTexture(this.gl.TEXTURE_2D, yTexture);
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, bWidth, bHeight, 0, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, yBuffer);

				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

				this.gl.bindTexture(this.gl.TEXTURE_2D, uTexture);
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, bWidth/2, bHeight/2, 0, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, uBuffer);

				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

				this.gl.bindTexture(this.gl.TEXTURE_2D, vTexture);
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, bWidth/2, bHeight/2, 0, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, vBuffer);

				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
				this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

				this.gl.bindTexture(this.gl.TEXTURE_2D, null);

				this.yTexture.push(yTexture);
				this.uTexture.push(uTexture);
				this.vTexture.push(vTexture);


				var yuvBuffer = new Uint8Array(bWidth*bHeight*1.5);
				yuvBuffer.set(yBuffer, 0);
				yuvBuffer.set(uBuffer, bWidth*bHeight);
				yuvBuffer.set(vBuffer, bWidth*bHeight + bWidth*bHeight/4);

				this.yuvBuffer.push(yuvBuffer);
			}
		}
	},

	textureData: function(blockIdx, yuvBuffer) {
		this.yuvBuffer[blockIdx] = yuvBuffer;
		this.receivedBlocks[blockIdx] = true;
	},

	updateTextures: function() {
        console.log("updateTextures");
		for(var i=0; i<this.verticalBlocks; i++){
			for(var j=0; j<this.horizontalBlocks; j++){
				var blockIdx = i*this.horizontalBlocks+j;

				var bWidth  = (j+1)*this.maxSize > this.state.width  ? this.state.width -(j*this.maxSize) : this.maxSize;
				var bHeight = (i+1)*this.maxSize > this.state.height ? this.state.height-(i*this.maxSize) : this.maxSize;

				var yEnd = bWidth*bHeight;
				var uEnd = yEnd + bWidth*bHeight/4;
				var vEnd = uEnd + bWidth*bHeight/4;

				var yBuffer = this.yuvBuffer[blockIdx].subarray(0,    yEnd);
				var uBuffer = this.yuvBuffer[blockIdx].subarray(yEnd, uEnd);
				var vBuffer = this.yuvBuffer[blockIdx].subarray(uEnd, vEnd);

				this.gl.bindTexture(this.gl.TEXTURE_2D, this.yTexture[blockIdx]);
				this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth, bHeight, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, yBuffer);

				this.gl.bindTexture(this.gl.TEXTURE_2D, this.uTexture[blockIdx]);
				this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth/2, bHeight/2, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, uBuffer);

				this.gl.bindTexture(this.gl.TEXTURE_2D, this.vTexture[blockIdx]);
				this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, bWidth/2, bHeight/2, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, vBuffer);

				this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        	}
        }

        //this.setValidBlocksFalse();
    },

	load: function(state, date) {
        console.log("load");
		this.state.width                = state.width;
		this.state.height               = state.height;
		this.state.display_aspect_ratio = state.display_aspect_ratio;
		this.state.muted                = state.muted;

		this.horizontalBlocks = Math.ceil(this.state.width /this.maxSize);
		this.verticalBlocks   = Math.ceil(this.state.height/this.maxSize);
		this.receivedBlocks = initializeArray(this.horizontalBlocks*this.verticalBlocks, false);

		this.initBuffers();
		this.initTextures();
	},

	draw: function(date) {
		if(this.shaderProgram === undefined || this.shaderProgram === null){
			this.log("waiting for shaders to load");
			return;
		}
		if(this.yuvBuffer === undefined || this.yuvBuffer === null){
			this.log("no texture loaded");
			return;
		}

		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		this.updateTextures();

		for(var i=0; i<this.verticalBlocks; i++){
			for(var j=0; j<this.horizontalBlocks; j++){
				var blockIdx = i*this.horizontalBlocks+j;

				this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer[blockIdx]);
				this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.squareVertexPositionBuffer[blockIdx].itemSize, this.gl.FLOAT, false, 0, 0);

				this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexTextureCoordBuffer[blockIdx]);
				this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, this.squareVertexTextureCoordBuffer[blockIdx].itemSize, this.gl.FLOAT, false, 0, 0);

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
				this.gl.drawElements(this.gl.TRIANGLES, this.squareVertexIndexBuffer[blockIdx].numItems, this.gl.UNSIGNED_SHORT, 0);
			}
		}
	},

	resizeCanvas: function() {
		if(this.shaderProgram === undefined || this.shaderProgram === null) return;

		var localX = this.sage2_x - ui.offsetX;
		var localY = this.sage2_y - ui.offsetY;
		var localRight  = localX + this.sage2_width;
		var localBottom = localY + this.sage2_height;
		var viewX = Math.max(localX, 0);
		var viewY = Math.max(localY, 0);
		var viewRight  = Math.min(localRight,  ui.json_cfg.resolution.width);
		var viewBottom = Math.min(localBottom, ui.json_cfg.resolution.height);
		var localWidth  = viewRight  - viewX;
		var localHeight = viewBottom - viewY;

		// completely off-screen
		if(localWidth <= 0 || localHeight <= 0) {
			this.canvas.width  = 1;
			this.canvas.height = 1;
			this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		}
		else {
			this.canvas.width  = localWidth;
			this.canvas.height = localHeight;
			this.canvas.style.left = (viewX-localX) + "px";
			this.canvas.style.top  = (viewY-localY) + "px";
			this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

			var left   = ((viewX     -localX) / (localRight -localX) * 2.0) - 1.0;
			var right  = ((viewRight -localX) / (localRight -localX) * 2.0) - 1.0;
			var top    = ((1.0 - (viewY     -localY) / (localBottom-localY)) * 2.0) - 1.0;
			var bottom = ((1.0 - (viewBottom-localY) / (localBottom-localY)) * 2.0) - 1.0;

			mat4.ortho(left, right, bottom, top, -1, 1, this.pMatrix);
			this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
		}
	},

	startMove: function(date) {
		this.canvas.style.display = "none";
	},

	move: function(date) {
		this.canvas.style.display = "block";
		this.resizeCanvas();

		this.refresh(date);
	},

	startResize: function(date) {
		this.canvas.style.display = "none";
	},

	resize: function(date) {
		this.canvas.style.display = "block";
		this.resizeCanvas();

		this.refresh(date);
	},

	event: function(type, position, user, data, date) {

	}
});
