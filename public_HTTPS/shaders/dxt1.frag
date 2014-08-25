precision mediump float;

uniform sampler2D dxt_image;
varying vec2 v_texCoord;

void main() {
	gl_FragColor = texture2D(dxt_image, v_texCoord);
}
