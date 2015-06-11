precision mediump float;

uniform sampler2D rgb_image; // actually it's bgra
varying vec2 v_texCoord;
vec4 mysample;

void main() {
        // for now, just use the (interpolated) luma
	gl_FragColor = vec4(0, 0, texture2D(rgb_image, v_texCoord).a, 1.0);
}
