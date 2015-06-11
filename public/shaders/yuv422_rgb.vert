uniform mat4 p_matrix;

attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
	// vertex space [-1, 1]
	gl_Position = p_matrix * vec4(a_position, 0, 1);

	// pass the texCoord to the fragment shader
	// The GPU will interpolate this value between points
	v_texCoord = a_texCoord;
}
