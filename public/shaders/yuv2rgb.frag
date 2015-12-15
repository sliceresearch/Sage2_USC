precision mediump float;

uniform sampler2D y_image;
uniform sampler2D u_image;
uniform sampler2D v_image;
varying vec2 v_texCoord;

void main() {
	float y, u, v, r, g, b;

	y = 1.1643 * (texture2D(y_image, v_texCoord).r - 0.0625);
	u = texture2D(u_image, v_texCoord).r - 0.5;
	v = texture2D(v_image, v_texCoord).r - 0.5;

	r = y + 1.59580 * v;
	g = y - 0.39173 * u - 0.81290 * v;
	b = y + 2.01700 * u;

	gl_FragColor=vec4(r, g, b, 1.0);
}
