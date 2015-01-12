
var shader_fs1 = "\
	precision mediump float; \
	varying vec2 v_texcoord; \
	uniform sampler2D u_texture; \
	void main() { \
	  if ( ( (gl_FragCoord/2.0 - vec4(ivec4(gl_FragCoord.y/2.0)))).y < 0.5) { \
	  	vec2 n_texcoord = vec2(v_texcoord.s /2.0,v_texcoord.t);\
	   	gl_FragColor = texture2D(u_texture, n_texcoord + vec2(0.5,0) ); \
	  } else { \
	  	vec2 n_texcoord = vec2(v_texcoord.s /2.0,v_texcoord.t);\
	   	gl_FragColor = texture2D(u_texture, n_texcoord); \
	  }\
	}";

var shader_fs = "\
	precision mediump float; \
	varying vec2 v_texcoord; \
	uniform sampler2D u_texture; \
	uniform int order; \
	void main() { \
	   vec2 n_texcoord = vec2(v_texcoord.s /2.0,v_texcoord.t);\
	  if ( ( (gl_FragCoord/2.0 - vec4(ivec4(gl_FragCoord.y/2.0)))).y < 0.5) { \
		if (order==0) \
			gl_FragColor = texture2D(u_texture, n_texcoord + vec2(0.5,0) ); \
		else \
			gl_FragColor = texture2D(u_texture, n_texcoord); \
	  } else { \
		if (order==0) \
			gl_FragColor = texture2D(u_texture, n_texcoord); \
		else \
			gl_FragColor = texture2D(u_texture, n_texcoord + vec2(0.5,0) ); \
	  }\
	}";


var shader_vs = "\
	attribute vec4 a_position; \
	attribute vec2 a_texcoord; \
	varying vec2 v_texcoord; \
	void main() { \
	  gl_Position = a_position; \
	  v_texcoord = a_texcoord; \
	}";


// Anaglyph stereo shader
// ----------------------
//   Left eye is full red and actual green and blue
//   Right eye is full green and blue and actual red
//   Multiply left and right components for final output colour
var shader_fs_rb = "\
	precision mediump float; \
	varying vec2 v_texcoord; \
	uniform sampler2D u_texture; \
	uniform int order; \
	vec4 leftFrag, rightFrag; \
	void main() { \
		vec2 n_texcoord = vec2(v_texcoord.s /2.0,v_texcoord.t);\
		rightFrag = texture2D(u_texture, n_texcoord + vec2(0.5,0) ); \
		rightFrag = vec4(rightFrag.r, 1.0, 1.0, 1.0); \
		leftFrag  = texture2D(u_texture, n_texcoord); \
		leftFrag  = vec4(1.0, leftFrag.g, leftFrag.b, 1.0); \
		gl_FragColor = vec4(leftFrag.rgb * rightFrag.rgb, 1.0); \
	}";



var stereo_viewer = SAGE2_App.extend( {
	construct: function() {
		this.src = null;
		this.ctx = null;
		this.img = null;
		this.gl  = null;
		this.texture = null;
		this.program = null;
		this.ready   = false;
		this.resizeEvents = "onfinish";
		//this.resizeEvents = "continuous";
	},
	
	getShader: function(theSource, type) {
		var shader;

		if(type == "x-shader/x-fragment") shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		else if(type == "x-shader/x-vertex") shader = this.gl.createShader(this.gl.VERTEX_SHADER);
		else return null;
  
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

	createProgram: function(gl, shaders, opt_attribs, opt_locations) {
	  var program = gl.createProgram();
	  for (var ii = 0; ii < shaders.length; ++ii) {
	    gl.attachShader(program, shaders[ii]);
	  }
	  if (opt_attribs) {
	    for (var ii = 0; ii < opt_attribs.length; ++ii) {
	      gl.bindAttribLocation(
	          program,
	          opt_locations ? opt_locations[ii] : ii,
	          opt_attribs[ii]);
	    }
	  }
	  gl.linkProgram(program);

	  // Check the link status
	  var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
	  if (!linked) {
	      // something went wrong with the link
	      lastError = gl.getProgramInfoLog (program);
	      console.log("Error in program linking:" + lastError);

	      gl.deleteProgram(program);
	      return null;
	  }
	  return program;
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);

		this.gl = this.element.getContext("webgl");
		this.ready = false;

		// setup a GLSL program
		// interleaved
		//var fragmentShader = this.getShader(shader_fs, "x-shader/x-fragment");
		// anaglyph
		var fragmentShader = this.getShader(shader_fs_rb, "x-shader/x-fragment");
		var vertexShader   = this.getShader(shader_vs, "x-shader/x-vertex");
		this.program       = this.createProgram(this.gl, [vertexShader, fragmentShader]);
		this.gl.useProgram(this.program);

		// lookup attribute
		var positionLocation = this.gl.getAttribLocation(this.program, "a_position");
		this.gl.enableVertexAttribArray(positionLocation);
		var texcoordLocation = this.gl.getAttribLocation(this.program, "a_texcoord");
		this.gl.enableVertexAttribArray(texcoordLocation);

		// lookup uniforms
		// set order to 0
		this.gl.uniform1i(this.gl.getUniformLocation(this.program, "order"), 0);

		// Create a buffer for texcoords.
		var buffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
		// We'll supply texcoords as floats.
		this.gl.vertexAttribPointer(texcoordLocation, 2, this.gl.FLOAT, false, 0, 0);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
				new Float32Array([
					0, 0,
					1, 0,
					0, 1,
					0, 1,
					1, 0,
					1, 1]),
		      this.gl.STATIC_DRAW);

		// Create a texture.
		this.texture = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

		// Create a buffer and put a single clipspace rectangle in
		// it (2 triangles)
		var buffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
		this.gl.bufferData(
		    this.gl.ARRAY_BUFFER, 
		    new Float32Array([
			        -1.0, -1.0, 
			         1.0, -1.0, 
			        -1.0,  1.0, 
			        -1.0,  1.0, 
			         1.0, -1.0, 
			         1.0,  1.0]), this.gl.STATIC_DRAW);
		this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

		// Asynchronously load an image
		var image = new Image();
		image.src = this.resrcPath + "3dpics/adler.jps";
		//image.src = this.resrcPath + "3dpics/CAVE2-4K.jps";
		var self  = this;
		image.addEventListener('load', function() {
			self.log('Image loaded:', this.width, this.height);
			// Now that the image has loaded make copy it to the texture.
			self.gl.bindTexture(self.gl.TEXTURE_2D, self.texture);
    		self.gl.pixelStorei(self.gl.UNPACK_FLIP_Y_WEBGL, true);
			self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
			self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.LINEAR);
			self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S,     self.gl.CLAMP_TO_EDGE);
			self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T,     self.gl.CLAMP_TO_EDGE);
			self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, self.gl.RGBA, self.gl.UNSIGNED_BYTE, image);
			self.ready = true;
			self.sendResize(this.width/2, this.height);
			self.refresh(date);
		});
	},
	
	load: function(state, date) {
	},
	
	draw: function(date) {
		if (!this.ready) return;

		var error = this.gl.getError();
		if (error != this.gl.NO_ERROR && error != this.gl.CONTEXT_LOST_WEBGL) {
			console.log("WebGL fail");
		} else {
			// var pos = this.element.parentNode.offsetTop;
			// if ((pos%2)==1)
			// 	this.gl.uniform1i(this.gl.getUniformLocation(this.program, "order"), 0);
			// else
				this.gl.uniform1i(this.gl.getUniformLocation(this.program, "order"), 1);
			this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
			this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
		}
	},
	
	moved: function(px, py, wx, wy, date) {
		this.refresh(date);
	},

	resize: function(date) {
		if (!this.ready) return;
		var error = this.gl.getError();
		if (error != this.gl.NO_ERROR && error != this.gl.CONTEXT_LOST_WEBGL) {
			this.log("WebGL fail");
		} else {
			this.gl.viewportWidth  = this.gl.drawingBufferWidth;
			this.gl.viewportHeight = this.gl.drawingBufferHeight;
			this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);

			this.refresh(date);
		}
	},
	
	event: function(eventType, position, user_id, data, date) {
	},

	quit: function () {
		this.log("Stereo quit");
	}
});
