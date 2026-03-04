export const GalaxyVertexShader = `
  attribute float size;
  attribute float armProximity; // 0.0 = far from arm, 1.0 = center of arm
  varying vec3 vColor;
  varying float vTwinkle;
  varying float vProximity;
  uniform float time;

  void main() {
    vColor = color;
    vProximity = armProximity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Independent twinkle logic
    vTwinkle = sin(time * 3.0 + position.x * 0.5 + position.z * 0.5) * 0.5 + 0.5;
    
    gl_PointSize = size * (250.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const GalaxyFragmentShader = `
  varying vec3 vColor;
  varying float vTwinkle;
  varying float vProximity;
  uniform sampler2D pointTexture;

  void main() {
    vec4 tex = texture2D(pointTexture, gl_PointCoord);
    if (tex.a < 0.1) discard;
    
    // Stars in the arms are slightly brighter and more "active"
    float brightness = 0.8 + (vTwinkle * 0.4) + (vProximity * 0.3);
    gl_FragColor = vec4(vColor * brightness, tex.a);
  }
`;
