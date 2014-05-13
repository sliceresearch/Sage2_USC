// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file

var shader_fs = "precision mediump float;\
\
	varying vec2 vTextureCoord;\
	varying vec3 vLightWeighting;\
\
	uniform sampler2D uSampler;\
\
	void main(void) {\
		vec4 textureColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));\
		gl_FragColor = vec4(textureColor.rgb * vLightWeighting, textureColor.a);\
	}\
";

var shader_vs = "attribute vec3 aVertexPosition;\
	attribute vec3 aVertexNormal;\
	attribute vec2 aTextureCoord;\
\
	uniform mat4 uMVMatrix;\
	uniform mat4 uPMatrix;\
	uniform mat3 uNMatrix;\
\
	uniform vec3 uAmbientColor;\
\
	uniform vec3 uLightingDirection;\
	uniform vec3 uDirectionalColor;\
\
	varying vec2 vTextureCoord;\
	varying vec3 vLightWeighting;\
\
	void main(void) {\
		gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
		vTextureCoord = aTextureCoord;\
\
		vec3 transformedNormal = uNMatrix * aVertexNormal;\
		float directionalLightWeighting = max(dot(transformedNormal, uLightingDirection), 0.0);\
		vLightWeighting = uAmbientColor + uDirectionalColor * directionalLightWeighting;\
	}\
";


var texture_cube = SAGE2_App.extend( {
	construct: function() {
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
		
		// application specific 'init'
		this.initGL();
		if(this.gl){
			this.element.addEventListener("webglcontextlost", this.webglContextLost, false);
			this.element.addEventListener("webglcontextrestored", this.webglContextRestored, false);
		
			this.initShaders();
			this.initLighting();
			this.initBuffers();
			this.initTexture();
	
			this.gl.clearColor(0.5, 0.5, 0.5, 1.0);
			this.gl.enable(this.gl.DEPTH_TEST);
		
			this.pMatrix = mat4.create();
			this.mvMatrix = mat4.create();
			
			this.rotx = 0;
			this.roty = 0;
		}
	},
	
	initGL: function() {
		try{
			this.gl = this.element.getContext("webgl");
			this.gl.viewportWidth = this.element.width;
			this.gl.viewportHeight = this.element.height;
		} catch(e) {
			try{
				this.gl = this.element.getContext("experimental-webgl");
				this.gl.viewportWidth = this.element.width;
				this.gl.viewportHeight = this.element.height;
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
	
	initShaders: function() {
		var fragmentShader = this.getShader(shader_fs, "x-shader/x-fragment");
		var vertexShader = this.getShader(shader_vs, "x-shader/x-vertex");
  
		// Create the shader program
		this.shaderProgram = this.gl.createProgram();
		this.gl.attachShader(this.shaderProgram, vertexShader);
		this.gl.attachShader(this.shaderProgram, fragmentShader);
		this.gl.linkProgram(this.shaderProgram);
  
		// If creating the shader program failed, alert
		if(!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)){
			alert("Unable to initialize the shader program.");
		}
  
		this.gl.useProgram(this.shaderProgram);
	
		this.shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
		this.gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);

		this.shaderProgram.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexNormal");
		this.gl.enableVertexAttribArray(this.shaderProgram.vertexNormalAttribute);

		this.shaderProgram.textureCoordAttribute = this.gl.getAttribLocation(this.shaderProgram, "aTextureCoord");
		this.gl.enableVertexAttribArray(this.shaderProgram.textureCoordAttribute);

		this.shaderProgram.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
		this.shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
		this.shaderProgram.nMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uNMatrix");
		this.shaderProgram.samplerUniform = this.gl.getUniformLocation(this.shaderProgram, "uSampler");
		this.shaderProgram.ambientColorUniform = this.gl.getUniformLocation(this.shaderProgram, "uAmbientColor");
		this.shaderProgram.lightingDirectionUniform = this.gl.getUniformLocation(this.shaderProgram, "uLightingDirection");
		this.shaderProgram.directionalColorUniform = this.gl.getUniformLocation(this.shaderProgram, "uDirectionalColor");
	},
	
	getShader: function(theSource, type) {
		// Now figure out what type of shader script we have,
		// based on its MIME type.
		var shader;
  
		if(type == "x-shader/x-fragment") shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		else if(type == "x-shader/x-vertex") shader = this.gl.createShader(this.gl.VERTEX_SHADER);
		else return null;  // Unknown shader type
  
		// Send the source to the shader object
		this.gl.shaderSource(shader, theSource);
  
		// Compile the shader program
		this.gl.compileShader(shader);
  
		// See if it compiled successfully
		if(!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)){
			alert("An error occurred compiling the " + type + " shader: " + this.gl.getShaderInfoLog(shader));
			return null;
		}
  
		return shader;
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
		// call super-class 'preDraw'
		arguments.callee.superClass.preDraw.call(this, date);
		
		this.rotx += 10.0 * this.dt;
		this.roty -= 15.0 * this.dt;
		
		this.gl.viewportWidth = this.element.width;
		this.gl.viewportHeight = this.element.height;
		this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		mat4.perspective(45, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0, this.pMatrix);
	
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
		
		// call super-class 'postDraw'
		arguments.callee.superClass.postDraw.call(this, date);
	},
	
	resize: function(date) {
		this.draw(date);
	},
	
	event: function(eventType, userId, x, y, data, date) {
		
	}
});



/*
var shader_fs = "precision mediump float;\
\
	varying vec2 vTextureCoord;\
	varying vec3 vLightWeighting;\
\
	uniform sampler2D uSampler;\
\
	void main(void) {\
		vec4 textureColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));\
		gl_FragColor = vec4(textureColor.rgb * vLightWeighting, textureColor.a);\
	}\
";

var shader_vs = "attribute vec3 aVertexPosition;\
	attribute vec3 aVertexNormal;\
	attribute vec2 aTextureCoord;\
\
	uniform mat4 uMVMatrix;\
	uniform mat4 uPMatrix;\
	uniform mat3 uNMatrix;\
\
	uniform vec3 uAmbientColor;\
\
	uniform vec3 uLightingDirection;\
	uniform vec3 uDirectionalColor;\
\
	varying vec2 vTextureCoord;\
	varying vec3 vLightWeighting;\
\
	void main(void) {\
		gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
		vTextureCoord = aTextureCoord;\
\
		vec3 transformedNormal = uNMatrix * aVertexNormal;\
		float directionalLightWeighting = max(dot(transformedNormal, uLightingDirection), 0.0);\
		vLightWeighting = uAmbientColor + uDirectionalColor * directionalLightWeighting;\
	}\
";

function texture_cube() {
	this.element = null;
	this.gl = null;
	this.resrcPath = null;
	
	this.startDate = null;
	this.prevDate = null;
	this.frame = null;
	
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
	
	this.init = function(id, date, resrc) {
		this.element = document.getElementById(id);
		this.initGL();
		if(this.gl){
			this.resrcPath = resrc;
			
			this.startDate = date;
			this.prevDate = date;
			this.frame = 0;
		
			this.initShaders();
			this.initLighting();
			this.initBuffers();
			this.initTexture();
	
			this.gl.clearColor(0.5, 0.5, 0.5, 1.0);
			this.gl.enable(this.gl.DEPTH_TEST);
		
			this.pMatrix = mat4.create();
			this.mvMatrix = mat4.create();
			
			this.rotx = 0;
			this.roty = 0;
		}
	};
	
	this.initGL = function() {
		try{
			this.gl = this.element.getContext("webgl");
			this.gl.viewportWidth = this.element.width;
			this.gl.viewportHeight = this.element.height;
		} catch(e) {
			try{
				this.gl = this.element.getContext("experimental-webgl");
				this.gl.viewportWidth = this.element.width;
				this.gl.viewportHeight = this.element.height;
			} catch(e){
				alert("Canvas \"webgl\" and \"experimental-webgl\" unavailable.");
			}
		}
		if(!this.gl){
			alert("Unable to initialize WebGL. Your browser may not support it.");
		}
	};
	
	this.initShaders = function() {
		//var fragmentShader = this.getShader("shader-fs");
		//var vertexShader = this.getShader("shader-vs");
		var fragmentShader = this.getShader(shader_fs, "x-shader/x-fragment");
		var vertexShader = this.getShader(shader_vs, "x-shader/x-vertex");
  
		// Create the shader program
		this.shaderProgram = this.gl.createProgram();
		this.gl.attachShader(this.shaderProgram, vertexShader);
		this.gl.attachShader(this.shaderProgram, fragmentShader);
		this.gl.linkProgram(this.shaderProgram);
  
		// If creating the shader program failed, alert
		if(!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)){
			alert("Unable to initialize the shader program.");
		}
  
		this.gl.useProgram(this.shaderProgram);
	
		this.shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
		this.gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);

		this.shaderProgram.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexNormal");
		this.gl.enableVertexAttribArray(this.shaderProgram.vertexNormalAttribute);

		this.shaderProgram.textureCoordAttribute = this.gl.getAttribLocation(this.shaderProgram, "aTextureCoord");
		this.gl.enableVertexAttribArray(this.shaderProgram.textureCoordAttribute);

		this.shaderProgram.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
		this.shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
		this.shaderProgram.nMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uNMatrix");
		this.shaderProgram.samplerUniform = this.gl.getUniformLocation(this.shaderProgram, "uSampler");
		this.shaderProgram.ambientColorUniform = this.gl.getUniformLocation(this.shaderProgram, "uAmbientColor");
		this.shaderProgram.lightingDirectionUniform = this.gl.getUniformLocation(this.shaderProgram, "uLightingDirection");
		this.shaderProgram.directionalColorUniform = this.gl.getUniformLocation(this.shaderProgram, "uDirectionalColor");
	};
	
	//this.getShader = function(id) {
	this.getShader = function(theSource, type) {
		// Now figure out what type of shader script we have,
		// based on its MIME type.
		var shader;
  
		//if(shaderScript.type == "x-shader/x-fragment") shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		//else if(shaderScript.type == "x-shader/x-vertex") shader = this.gl.createShader(this.gl.VERTEX_SHADER);
		if(type == "x-shader/x-fragment") shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		else if(type == "x-shader/x-vertex") shader = this.gl.createShader(this.gl.VERTEX_SHADER);
		else return null;  // Unknown shader type
  
		// Send the source to the shader object
		this.gl.shaderSource(shader, theSource);
  
		// Compile the shader program
		this.gl.compileShader(shader);
  
		// See if it compiled successfully
		if(!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)){
			//var type = "unknown";
			//if(shaderScript.type == "x-shader/x-fragment") type = "fragment";
			//else if(shaderScript.type == "x-shader/x-vertex") type = "vertex";
			alert("An error occurred compiling the " + type + " shader: " + this.gl.getShaderInfoLog(shader));
			return null;
		}
  
		return shader;
	};
	
	this.initLighting = function() {
		var ambient = vec3.create([0.2, 0.2, 0.2]);
		var diffuse = vec3.create([1.0, 1.0, 1.0]);
		var lightDir = vec3.create();
		vec3.normalize(vec3.create([0.2, 1.0, 1.0]), lightDir);

		this.gl.uniform3fv(this.shaderProgram.ambientColorUniform, ambient);
		this.gl.uniform3fv(this.shaderProgram.directionalColorUniform, diffuse);
		this.gl.uniform3fv(this.shaderProgram.lightingDirectionUniform, lightDir);
	};
	
	this.initBuffers = function() {
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
	};
	
	this.initTexture = function() {
		var _this = this;
		this.texture = this.gl.createTexture();
		this.texture.image = new Image();
		this.texture.image.addEventListener('load', function(event){
			_this.handleLoadedTexture(_this.texture);
		}, false);

		this.texture.image.src = this.resrcPath + "images/crate.jpg";
	};
	
	this.handleLoadedTexture = function(tex) {
		this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

		this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex.image);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST);
		this.gl.generateMipmap(this.gl.TEXTURE_2D);

		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	};
	
	this.setMatrixUniforms = function() {
		this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
		this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);

		var normalMatrix = mat3.create();
		mat4.toInverseMat3(this.mvMatrix, normalMatrix);
		mat3.transpose(normalMatrix);
		this.gl.uniformMatrix3fv(this.shaderProgram.nMatrixUniform, false, normalMatrix);
	};
	
	this.draw = function(date) {
		var t = (date.getTime() - this.startDate.getTime()) / 1000; // total time since start of program (sec)
		var dt = (date.getTime() - this.prevDate.getTime()) / 1000; // delta time since last frame (sec)
		
		this.animate(dt);
		
		this.gl.viewportWidth = this.element.width;
		this.gl.viewportHeight = this.element.height;
		this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		mat4.perspective(45, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0, this.pMatrix);
	
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
		
		// update time variables
		this.prevDate = date;
		this.frame++;
	};
	
	this.animate = function(dt) {
		this.rotx += 10.0 * dt;
		this.roty -= 15.0 * dt;
	}
}
*/	
