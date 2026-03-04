export const PlasmaVertexShader = `
  attribute float size;
  attribute vec3 velocity;
  varying vec3 vColor;
  varying float vEnergy;
  uniform float time;

  void main() {
    vColor = color;
    
    // High-frequency vibration (Quantum Jitter)
    vec3 jitter = vec3(
      sin(time * 50.0 + position.x) * 0.05,
      cos(time * 45.0 + position.y) * 0.05,
      sin(time * 55.0 + position.z) * 0.05
    );
    
    vec3 newPos = position + jitter;
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    
    // Energy state based on time and position
    vEnergy = sin(time * 10.0 + length(position) * 2.0) * 0.5 + 0.5;
    
    gl_PointSize = size * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const PlasmaFragmentShader = `
  varying vec3 vColor;
  varying float vEnergy;
  uniform sampler2D pointTexture;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);
    if (dist > 0.5) discard;
    
    // High energy core - make it solid and vibrant
    float core = 1.0 - smoothstep(0.3, 0.5, dist);
    vec3 finalColor = vColor * (1.2 + vEnergy * 1.5);
    
    gl_FragColor = vec4(finalColor, core);
  }
`;
