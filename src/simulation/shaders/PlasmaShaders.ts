export const PlasmaVertexShader = `
  attribute float size;
  varying vec3 vColor;
  varying float vEnergy;
  uniform float time;

  void main() {
    vColor = color;
    vec3 jitter = vec3(
      sin(time * 30.0 + position.x) * 0.1,
      cos(time * 25.0 + position.y) * 0.1,
      sin(time * 35.0 + position.z) * 0.1
    );
    vec3 newPos = position + jitter;
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    vEnergy = sin(time * 5.0 + length(position) * 0.5) * 0.5 + 0.5;
    gl_PointSize = size * (350.0 / -mvPosition.z);
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
    
    // Sharper falloff to prevent overlap bloat
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    // Lower energy boost to keep colors visible
    vec3 finalColor = vColor * (0.8 + vEnergy * 0.7);
    
    gl_FragColor = vec4(finalColor, alpha * 0.8);
  }
`;
