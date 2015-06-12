precision mediump float;

uniform sampler2D rgb_image; // strictly four bytes - rgba not rgb
varying vec2 v_texCoord;

// for now assume format is: uyvy mapped to rgba, ie y0==g, y1==a

void main() {
        // for now, just use the (interpolated) luma
	gl_FragColor = vec4(
          texture2D(rgb_image, v_texCoord).r,
          texture2D(rgb_image, v_texCoord).g,
          texture2D(rgb_image, v_texCoord).b,
          1.0
        );
}
