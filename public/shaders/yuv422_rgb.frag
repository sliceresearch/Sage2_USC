precision mediump float;

uniform sampler2D rgb_image; // strictly four bytes - rgba not rgb
varying vec2 v_texCoord;

// for now assume format is: uyvy mapped to rgba, ie u=r, y1==g, v=b, y2==a

void main() {
        // YUV Channels
        vec4 channels = vec4(texture2D(rgb_image, v_texCoord).g, // Y (downsampled, choose y1 arbitrarily)
                             texture2D(rgb_image, v_texCoord).r, // U
                             texture2D(rgb_image, v_texCoord).b, // V
                             1.0
                             );

        // Color Conversion Matrix (YUV --> RGB)
        mat4 colorMatrix = mat4(1.000,  1.000,  1.000,  0.000,
                            0.000, -0.344,  1.773,  0.000,
                            1.403, -0.714,  0.000,  0.000,
                           -0.702,  0.529, -0.887,  1.000);

        gl_FragColor = clamp(colorMatrix * channels, 0.0, 1.0);
}
