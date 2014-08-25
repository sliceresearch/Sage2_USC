// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var media_stream = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);
		
		this.gl = null;
		this.ext = null;
		this.shaderProgram = null;
	
		this.squareVertexPositionBuffer = null;
		this.squareVertexTextureCoordBuffer = null;
		this.squareVertexIndexBuffer = null;
	
		this.texWidth  = 0;
		this.texHeight = 0;
		
		this.resizeEvents = "continuous";
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);
		
		// application specific 'init'
		this.initGL();
		if(this.gl){
			this.gl.clearColor(0.5, 0.5, 0.5, 1.0);
			
			this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
			
			var _this = this;
			this.initShaders();
			this.initBuffers();
			this.initTexture(new Uint8Array(1280*800*0.5), 1280, 800);
		}
	},
	
	initGL: function() {
		try{
			this.gl = this.element.getContext("webgl");
		} catch(e) {
			try{
				this.gl = this.element.getContext("experimental-webgl");
			} catch(e){
				alert("Canvas \"webgl\" and \"experimental-webgl\" unavailable.");
			}
		}
		if(!this.gl){
			alert("Unable to initialize WebGL. Your browser may not support it.");
		}
	},
	
	initShaders: function() {
		var _this = this;
		var vertFile = "shaders/dxt1.vert";
		var fragFile = "shaders/dxt1.frag";
		
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
			_this.shaderProgram.samplerUniform1 = _this.gl.getUniformLocation(_this.shaderProgram, "dxt_image");
		});
	},
	
	getShaders: function(vertFile, fragFile, callback) {
		var _this = this;
		
		var vertShader;
		var fragShader;
		
		var vertReadComplete = false;
		var fragReadComplete = false;
		
		readFile(vertFile, function(err, text) {
			if(err) log(err);
			
			vertShader = _this.gl.createShader(_this.gl.VERTEX_SHADER);
			
			// Send the source to the shader object
			_this.gl.shaderSource(vertShader, text);
			
			// Compile the shader program
			_this.gl.compileShader(vertShader);
			
			// See if it compiled successfully
			if(!_this.gl.getShaderParameter(vertShader, _this.gl.COMPILE_STATUS)){
				alert("An error occurred compiling the vertex shader: " + _this.gl.getShaderInfoLog(vertShader));
			}
			
			if(fragReadComplete) {
				callback(vertShader, fragShader);
			}
			
			vertReadComplete = true;
		});
		readFile(fragFile, function(err, text) {
			if(err) log(err);
			
			fragShader = _this.gl.createShader(_this.gl.FRAGMENT_SHADER);
			
			// Send the source to the shader object
			_this.gl.shaderSource(fragShader, text);
			
			// Compile the shader program
			_this.gl.compileShader(fragShader);
			
			// See if it compiled successfully
			if(!_this.gl.getShaderParameter(fragShader, _this.gl.COMPILE_STATUS)){
				alert("An error occurred compiling the fragment shader: " + _this.gl.getShaderInfoLog(fragShader));
			}
			
			if(vertReadComplete) {
				callback(vertShader, fragShader);
			}
			
			fragReadComplete = true;
		});
	},
	
	initBuffers: function() {
		// vertices
		this.squareVertexPositionBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
		var vertices = [
			-1.0, -1.0, 
			 1.0, -1.0, 
			-1.0,  1.0,  
			 1.0,  1.0
		];
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
		this.squareVertexPositionBuffer.itemSize = 2;
		this.squareVertexPositionBuffer.numItems = 4;
  
		// texture
		this.squareVertexTextureCoordBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexTextureCoordBuffer);
		var textureCoords = [
			0.0,  1.0,
			1.0,  1.0,
			0.0,  0.0,
			1.0,  0.0
		];
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoords), this.gl.STATIC_DRAW);
		this.squareVertexTextureCoordBuffer.itemSize = 2;
		this.squareVertexTextureCoordBuffer.numItems = 4;

		// faces of triangles
		this.squareVertexIndexBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.squareVertexIndexBuffer);
		var vertexIndices = [
			 0, 1, 2,   2, 1, 3
		];
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndices), this.gl.STATIC_DRAW);
		this.squareVertexIndexBuffer.itemSize = 1;
		this.squareVertexIndexBuffer.numItems = 6;
	},
	
	initTexture: function(buffer, width, height) {
		this.texture = this.gl.createTexture();
		
		this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		
		this.ext = this.gl.getExtension('WEBGL_compressed_texture_s3tc');
		this.gl.compressedTexImage2D(this.gl.TEXTURE_2D, 0, this.ext.COMPRESSED_RGBA_S3TC_DXT1_EXT, width, height, 0, buffer);
		
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
		
		this.texWidth  = width;
		this.texHeight = height;
	},
	
	load: function(state, date) {
		if(this.ext === null || state.dxt1 === undefined) return;
		
		this.state.dxt1 = state.dxt1;
		
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.compressedTexSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.texWidth, this.texHeight, this.ext.COMPRESSED_RGBA_S3TC_DXT1_EXT, this.state.dxt1);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
		
		this.refresh(date);
	},
	
	draw: function(date) {
		if(this.shaderProgram === undefined || this.shaderProgram === null) return;
		
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
		this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.squareVertexPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
		
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexTextureCoordBuffer);
		this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, this.squareVertexTextureCoordBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
		
		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.uniform1i(this.shaderProgram.samplerUniform1, 0);
		
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.squareVertexIndexBuffer);
		this.gl.drawElements(this.gl.TRIANGLES, this.squareVertexIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
	},
	
	resize: function(date) {
		this.gl.viewportWidth = this.gl.drawingBufferWidth;
		this.gl.viewportHeight = this.gl.drawingBufferHeight;
		this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
		
		this.refresh(date);
	},
	
	event: function(type, position, user, data, date) {
		
	}
});
