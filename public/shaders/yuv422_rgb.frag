precision mediump float;

uniform sampler2D rgb_image; // actually it's bgra
varying vec2 v_texCoord;
varying vec4 mysample;

void main() {
        // for now, just use the (interpolated) luma
	mysample = texture2D(rgb_image, v_texCoord).rgba;
	gl_FragColor = vec4(mysample.a, mysample.a, mysample.a, 1.0);
}
