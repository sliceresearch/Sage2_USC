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
	mat4 colorMatrix = mat4(1.16430000,  1.16430000,  1.16430000,  0.00000000,
                            0.00000000, -0.39173000,  2.01700000,  0.00000000,
                            1.59580000, -0.81290000,  0.00000000,  0.00000000,
                           -0.87066875,  0.52954625, -1.08126875,  1.00000000);
	
	gl_FragColor = clamp(colorMatrix * channels, 0.0, 1.0);
}
