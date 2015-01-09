// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var texture_cube = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.fpsText = null;
		
		this.gl = null;
		this.shaderProgram = null;
		this.texture = null;

		this.pMatrix = null;
		this.mvMatrix = null

		this.cubeVertexPositionBuffer = null;
		this.cubeVertexNormalBuffer = null;
		this.cubeVertexTextureCoordBuffer = null;
		this.cubeVertexIndexBuffer = null;

		this.time = null;
		this.rotx = null;
		this.roty = null;
		
		this.resizeEvents = "continuous";
		
		this.webglContextLost = this.webglContextLostMethod.bind(this);
		this.webglContextRestored = this.webglContextRestoredMethod.bind(this);
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);
		
		this.fpsText = document.createElement('p');
		this.fpsText.textContent = "0.00 fps";
		this.fpsText.style.fontFamily = "Verdana,sans-serif";
		this.fpsText.style.fontSize = (0.05*height).toString() + "px";
		this.fpsText.style.textIndent = "0px";
		this.fpsText.style.color = "#000000";
		this.fpsText.style.position = "absolute";
		this.fpsText.style.top = "10px";
		this.fpsText.style.left = "10px";
		
		this.div.appendChild(this.fpsText);
		
		// application specific 'init'
		this.initGL();
		if(this.gl){
			this.element.addEventListener("webglcontextlost", this.webglContextLost, false);
			this.element.addEventListener("webglcontextrestored", this.webglContextRestored, false);
		
			this.gl.clearColor(0.5, 0.5, 0.5, 1.0);
			this.gl.enable(this.gl.DEPTH_TEST);
	
			this.pMatrix = mat4.create();
			this.mvMatrix = mat4.create();
		
			this.rotx = 0;
			this.roty = 0;
			
			this.gl.viewportWidth = this.gl.drawingBufferWidth;
			this.gl.viewportHeight = this.gl.drawingBufferHeight;
			this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
			
			mat4.perspective(45, this.element.width / this.element.height, 0.1, 100.0, this.pMatrix);
			
			var _this = this;
			this.initShaders(function() {
				_this.initLighting();
				_this.initBuffers();
				_this.initTexture();
			});
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
	
	webglContextLostMethod: function(event) {
		console.log("WebGL Context Lost");
		console.log(event);
	},
	
	webglContextRestoredMethod: function(event) {
		console.log("WebGL Context Restored");
		console.log(event);
	},
	
	initShaders: function(callback) {
		var _this = this;
		var vertFile = this.resrcPath + "shaders/texture_cube.vert";
		var fragFile = this.resrcPath + "shaders/texture_cube.frag";
		
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
	
			_this.shaderProgram.vertexPositionAttribute = _this.gl.getAttribLocation(_this.shaderProgram, "aVertexPosition");
			_this.gl.enableVertexAttribArray(_this.shaderProgram.vertexPositionAttribute);

			_this.shaderProgram.vertexNormalAttribute = _this.gl.getAttribLocation(_this.shaderProgram, "aVertexNormal");
			_this.gl.enableVertexAttribArray(_this.shaderProgram.vertexNormalAttribute);

			_this.shaderProgram.textureCoordAttribute = _this.gl.getAttribLocation(_this.shaderProgram, "aTextureCoord");
			_this.gl.enableVertexAttribArray(_this.shaderProgram.textureCoordAttribute);

			_this.shaderProgram.pMatrixUniform = _this.gl.getUniformLocation(_this.shaderProgram, "uPMatrix");
			_this.shaderProgram.mvMatrixUniform = _this.gl.getUniformLocation(_this.shaderProgram, "uMVMatrix");
			_this.shaderProgram.nMatrixUniform = _this.gl.getUniformLocation(_this.shaderProgram, "uNMatrix");
			_this.shaderProgram.samplerUniform = _this.gl.getUniformLocation(_this.shaderProgram, "uSampler");
			_this.shaderProgram.ambientColorUniform = _this.gl.getUniformLocation(_this.shaderProgram, "uAmbientColor");
			_this.shaderProgram.lightingDirectionUniform = _this.gl.getUniformLocation(_this.shaderProgram, "uLightingDirection");
			_this.shaderProgram.directionalColorUniform = _this.gl.getUniformLocation(_this.shaderProgram, "uDirectionalColor");
		
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
	
	initLighting: function() {
		var ambient = vec3.create([0.2, 0.2, 0.2]);
		var diffuse = vec3.create([1.0, 1.0, 1.0]);
		var lightDir = vec3.create();
		vec3.normalize(vec3.create([0.2, 1.0, 1.0]), lightDir);

		this.gl.uniform3fv(this.shaderProgram.ambientColorUniform, ambient);
		this.gl.uniform3fv(this.shaderProgram.directionalColorUniform, diffuse);
		this.gl.uniform3fv(this.shaderProgram.lightingDirectionUniform, lightDir);
	},
	
	initBuffers: function() {
		// vertices
		this.cubeVertexPositionBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeVertexPositionBuffer);
		var vertices = [
			// Front face
			-1.0, -1.0,  1.0,
			 1.0, -1.0,  1.0,
			 1.0,  1.0,  1.0,
			-1.0,  1.0,  1.0,
	
			// Back face
			-1.0, -1.0, -1.0,
			-1.0,  1.0, -1.0,
			 1.0,  1.0, -1.0,
			 1.0, -1.0, -1.0,
	
			// Top face
			-1.0,  1.0, -1.0,
			-1.0,  1.0,  1.0,
			 1.0,  1.0,  1.0,
			 1.0,  1.0, -1.0,
	
			// Bottom face
			-1.0, -1.0, -1.0,
			 1.0, -1.0, -1.0,
			 1.0, -1.0,  1.0,
			-1.0, -1.0,  1.0,
	
			// Right face
			 1.0, -1.0, -1.0,
			 1.0,  1.0, -1.0,
			 1.0,  1.0,  1.0,
			 1.0, -1.0,  1.0,
	
			// Left face
			-1.0, -1.0, -1.0,
			-1.0, -1.0,  1.0,
			-1.0,  1.0,  1.0,
			-1.0,  1.0, -1.0
		];
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
		this.cubeVertexPositionBuffer.itemSize = 3;
		this.cubeVertexPositionBuffer.numItems = 24;

		// normals
		this.cubeVertexNormalBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeVertexNormalBuffer);
		var vertexNormals = [
			// Front
			 0.0,  0.0,  1.0,
			 0.0,  0.0,  1.0,
			 0.0,  0.0,  1.0,
			 0.0,  0.0,  1.0,
	
			// Back
			 0.0,  0.0, -1.0,
			 0.0,  0.0, -1.0,
			 0.0,  0.0, -1.0,
			 0.0,  0.0, -1.0,
	
			// Top
			 0.0,  1.0,  0.0,
			 0.0,  1.0,  0.0,
			 0.0,  1.0,  0.0,
			 0.0,  1.0,  0.0,
	
			// Bottom
			 0.0, -1.0,  0.0,
			 0.0, -1.0,  0.0,
			 0.0, -1.0,  0.0,
			 0.0, -1.0,  0.0,
	
			// Right
			 1.0,  0.0,  0.0,
			 1.0,  0.0,  0.0,
			 1.0,  0.0,  0.0,
			 1.0,  0.0,  0.0,
	
			// Left
			-1.0,  0.0,  0.0,
			-1.0,  0.0,  0.0,
			-1.0,  0.0,  0.0,
			-1.0,  0.0,  0.0
		];
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertexNormals), this.gl.STATIC_DRAW);
		this.cubeVertexNormalBuffer.itemSize = 3;
		this.cubeVertexNormalBuffer.numItems = 24;
  
		// texture
		this.cubeVertexTextureCoordBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeVertexTextureCoordBuffer);
		var textureCoords = [
			// Front
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0,

			// Back
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0,

			// Top
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0,

			// Bottom
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0,

			// Right
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0,

			// Left
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0
		];
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoords), this.gl.STATIC_DRAW);
		this.cubeVertexTextureCoordBuffer.itemSize = 2;
		this.cubeVertexTextureCoordBuffer.numItems = 24;

		// faces of triangles
		this.cubeVertexIndexBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cubeVertexIndexBuffer);
		var cubeVertexIndices = [
			 0,  1,  2,      0,  2,  3,   // front
			 4,  5,  6,      4,  6,  7,   // back
			 8,  9, 10,      8, 10, 11,   // top
			12, 13, 14,     12, 14, 15,   // bottom
			16, 17, 18,     16, 18, 19,   // right
			20, 21, 22,     20, 22, 23    // left
		];
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), this.gl.STATIC_DRAW);
		this.cubeVertexIndexBuffer.itemSize = 1;
		this.cubeVertexIndexBuffer.numItems = 36;
	},
	
	initTexture: function() {
		var _this = this;
		this.texture = this.gl.createTexture();
		this.texture.image = new Image();
		this.texture.image.crossOrigin = "anonymous";
		this.texture.image.addEventListener('load', function(event){
			_this.texture.image.isLoaded = true;
			_this.handleLoadedTexture(_this.texture);
		}, false);
		this.texture.image.src = this.resrcPath + "images/crate.jpg";
	},
	
	handleLoadedTexture: function(tex) {
		this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

		this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex.image);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST);
		this.gl.generateMipmap(this.gl.TEXTURE_2D);

		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	},
	
	setMatrixUniforms: function() {
		this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
		this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);

		var normalMatrix = mat3.create();
		mat4.toInverseMat3(this.mvMatrix, normalMatrix);
		mat3.transpose(normalMatrix);
		this.gl.uniformMatrix3fv(this.shaderProgram.nMatrixUniform, false, normalMatrix);
	},
	
	load: function(state, date) {
	},
	
	draw: function(date) {
		if(this.shaderProgram === undefined || this.shaderProgram === null) return;
		if(this.texture.image.isLoaded === undefined || this.texture.image.isLoaded === false) return;
	
		this.rotx += 10.0 * this.dt;
		this.roty -= 15.0 * this.dt;
		
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		
		mat4.identity(this.mvMatrix);
		mat4.translate(this.mvMatrix, [0.0, 0.0, -5.0]);
		mat4.rotate(this.mvMatrix, this.rotx*(Math.PI/180), [1, 0, 0]);
		mat4.rotate(this.mvMatrix, this.roty*(Math.PI/180), [0, 1, 0]);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeVertexPositionBuffer);
		this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.cubeVertexPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeVertexNormalBuffer);
		this.gl.vertexAttribPointer(this.shaderProgram.vertexNormalAttribute, this.cubeVertexNormalBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeVertexTextureCoordBuffer);
		this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, this.cubeVertexTextureCoordBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
	
		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.uniform1i(this.shaderProgram.samplerUniform, 0);
	
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cubeVertexIndexBuffer);
		this.setMatrixUniforms();
		this.gl.drawElements(this.gl.TRIANGLES, this.cubeVertexIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
	
		this.fpsText.textContent = this.fps.toFixed(2).toString() + " fps";
	},
	
	resize: function(date) {
		this.gl.viewportWidth = this.gl.drawingBufferWidth;
		this.gl.viewportHeight = this.gl.drawingBufferHeight;
		this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
		
		mat4.perspective(45, this.element.width / this.element.height, 0.1, 100.0, this.pMatrix);
		
		this.fpsText.style.fontSize = (0.05*this.element.height).toString() + "px";
		
		this.refresh(date);
	},
	
	event: function(eventType, position, user_id, data, date) {
		//this.refresh(date);
	}
});	
