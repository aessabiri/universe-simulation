export const WarpVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

export const WarpFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform float time;
  uniform float intensity;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    
    // Create organic liquid distortion
    float distortion = sin(uv.y * 10.0 + time * 5.0) * 0.01 * intensity;
    distortion += cos(uv.x * 12.0 + time * 4.0) * 0.01 * intensity;
    
    // Chromatic Aberration (Color splitting)
    float r = texture2D(tDiffuse, uv + distortion).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, uv - distortion).b;
    
    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;
