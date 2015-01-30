precision mediump float;

uniform sampler2D y_image;
uniform sampler2D u_image;
uniform sampler2D v_image;
varying vec2 v_texCoord;

void main() {
	// YUV Channels
	vec4 channels = vec4(texture2D(y_image, v_texCoord).r,
	                     texture2D(u_image, v_texCoord).r,
	                     texture2D(v_image, v_texCoord).r,
	                     1.0);
	
	// Color Conversion Matrix (YUV --> RGB)
	mat4 colorMatrix = mat4(1.000,  1.000,  1.000,  0.000,
                            0.000, -0.344,  1.773,  0.000,
                            1.403, -0.714,  0.000,  0.000,
                           -0.702,  0.529, -0.887,  1.000);
	
	gl_FragColor = clamp(colorMatrix * channels, 0.0, 1.0);
}
