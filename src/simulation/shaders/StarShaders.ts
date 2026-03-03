export const StarVertexShader = `
  attribute float size;
  varying vec3 vColor;
  varying float vTwinkle;
  uniform float time;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Twinkle logic based on position and time
    vTwinkle = sin(time * 2.0 + position.x * 10.0 + position.y * 10.0) * 0.5 + 0.5;
    
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const StarFragmentShader = `
  varying vec3 vColor;
  varying float vTwinkle;
  uniform sampler2D pointTexture;

  void main() {
    vec4 tex = texture2D(pointTexture, gl_PointCoord);
    if (tex.a < 0.1) discard;
    
    // Distant stars twinkle more
    vec3 finalColor = vColor * (0.7 + vTwinkle * 0.3);
    gl_FragColor = vec4(finalColor, tex.a);
  }
`;
