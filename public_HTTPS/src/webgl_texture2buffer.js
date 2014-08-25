function webgl_texture2buffer() {
	this.gl = null;
	this.canvas = null;
	this.texture = null;
	this.framebuffer = null;
	
	this.width  = 0;
	this.height = 0;
	
	this.init = function(width, height) {
		this.initGL();
		if(this.gl){
			this.width  = width;
			this.height = height;
			
			this.initTexture();
			this.initFrameBuffer();
		}
	};
	
	this.initGL = function() {
		this.canvas = document.createElement('canvas');
		try{
			this.gl = this.canvas.getContext("webgl");
		} catch(e) {
			try{
				this.gl = this.canvas.getContext("experimental-webgl");
			} catch(e){
				alert("Canvas \"webgl\" and \"experimental-webgl\" unavailable.");
			}
		}
		if(!this.gl){
			alert("Unable to initialize WebGL. Your browser may not support it.");
		}
	};
	
	this.initTexture = function() {
		this.texture = this.gl.createTexture();
		
		this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		
		var buffer = new Uint8Array(this.width*this.height*4);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, buffer);
		
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	};
	
	this.initFrameBuffer = function() {
		this.framebuffer = this.gl.createFramebuffer();
		
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture, 0);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
	};
	
	this.updateTextureWithBuffer = function(buffer) {
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, buffer);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	};
	
	this.updateTextureWithElement = function (htmlElement) {
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, htmlElement);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	};
	
	this.extractRGBA = function(x ,y, w, h) {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
		
		var buffer = new Uint8Array(w*h*4);
		this.gl.readPixels(x, y, w, h, this.gl.RGBA, this.gl.UNSIGNED_BYTE, buffer);
		
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
	
		return buffer;
	};
}	
