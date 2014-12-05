// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var movie_player = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);
		
		this.gl               = null;
		this.shaderProgram    = null;
	
		this.ctx              = null;
		this.maxSize          = null;
		this.verticalBlocks   = null;
		this.horizontalBlocks = null;
		this.yuvBuffer        = [];
		this.yTexture         = [];
		this.uTexture         = [];
		this.vTexture         = [];
		this.video            = null;
		this.validBlocks      = [];
		this.receivedBlocks   = [];
	
		this.squareVertexPositionBuffer     = [];
		this.squareVertexTextureCoordBuffer = [];
		this.squareVertexIndexBuffer        = [];
	},
	
	init: function(id, x, y, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);
		
		// application specific 'init'
		this.maxSize = 128; // block size
		this.appX = x;
		this.appY = y;
		this.appW = width;
		this.appH = height;
		
		this.initGL();
		if(this.gl){
			this.gl.clearColor(0.5, 0.5, 0.5, 1.0);
			
			this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
			
			this.initShaders(function() {
				// shaders compiled
			});
		}
	},
	
	initGL: function() {
		this.gl = this.element.getContext("webgl");
		if(!this.gl) this.gl = this.element.getContext("experimental-webgl");
		if(!this.gl) this.log("Unable to initialize WebGL. Your browser may not support it.");
	},
	
	calculateValidBlocks: function(x, y, width, height) {
		var renderBlockSize  = this.maxSize * width/this.video.width;
		for(var i=0; i<this.verticalBlocks; i++){
			for(var j=0; j<this.horizontalBlocks; j++){
				var blockIdx = i*this.horizontalBlocks+j;
				var left = j*renderBlockSize + x;
				var top  = i*renderBlockSize + y;
				if((left+renderBlockSize) >= 0 && left <= (ui.json_cfg.resolution.width) &&
				   (top +renderBlockSize) >= 0 && top  <= (ui.json_cfg.resolution.height)) {
					this.validBlocks.push(blockIdx);
				}
			}
		}
		this.setValidBlocksFalse();
	},
	
	setValidBlocksFalse: function() {
		for(var i=0; i<this.validBlocks.length; i++){
			this.receivedBlocks[this.validBlocks[i]] = false;
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
		this.log(this.video);
		for(var i=0; i<this.verticalBlocks; i++){
			for(var j=0; j<this.horizontalBlocks; j++){
				var bWidth  = (j+1)*this.maxSize > this.video.width  ? this.video.width -(j*this.maxSize) : this.maxSize;
				var bHeight = (i+1)*this.maxSize > this.video.height ? this.video.height-(i*this.maxSize) : this.maxSize;
				var bX = j*this.maxSize;
				var bY = (i)*this.maxSize;
				
				var left   =  (bX         /this.video.width *2.0) - 1.0;
				var right  = ((bX+bWidth) /this.video.width *2.0) - 1.0;
				var bottom = -1 *  ((bY         /this.video.height*2.0) - 1.0);
				var top    = -1 * (((bY+bHeight)/this.video.height*2.0) - 1.0);
				
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
		this.horizontalBlocks = Math.ceil(this.video.width /this.maxSize);
		this.verticalBlocks   = Math.ceil(this.video.height/this.maxSize);
		
		for(var i=0; i<this.verticalBlocks; i++){
			for(var j=0; j<this.horizontalBlocks; j++){
				var bWidth  = (j+1)*this.maxSize > this.video.width  ? this.video.width -(j*this.maxSize) : this.maxSize;
				var bHeight = (i+1)*this.maxSize > this.video.height ? this.video.height-(i*this.maxSize) : this.maxSize;
			
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
		for(var i=0; i<this.verticalBlocks; i++){
			for(var j=0; j<this.horizontalBlocks; j++){
				var blockIdx = i*this.horizontalBlocks+j;
				
				var bWidth  = (j+1)*this.maxSize > this.video.width  ? this.video.width -(j*this.maxSize) : this.maxSize;
				var bHeight = (i+1)*this.maxSize > this.video.height ? this.video.height-(i*this.maxSize) : this.maxSize;
				
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
        
        this.setValidBlocksFalse();
    },
	
	load: function(state, date) {
		this.video = state;
		
		this.horizontalBlocks = Math.ceil(this.video.width /this.maxSize);
		this.verticalBlocks   = Math.ceil(this.video.height/this.maxSize);
		this.receivedBlocks = initializeArray(this.horizontalBlocks*this.verticalBlocks, true);
		
		this.calculateValidBlocks(this.appX, this.appY, this.appW, this.appH);
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
	
	resize: function(date) {
		this.appW = this.element.width;
		this.appH = this.element.height;
	},
	
	moved: function(px, py, wx, wy, date) {
		// px, py : position in wall coordination
		// wx, wy : width and height of the wall
		this.appX = px - ui.offsetX;
		this.appY = py + ui.titleBarHeight - ui.offsetY;
		
		this.calculateValidBlocks(this.appX, this.appY, this.appW, this.appH);
	},
	
	event: function(type, position, user, data, date) {
		
	}
});
