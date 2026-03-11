export const AbstractVoidVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const AbstractVoidFragmentShader = `
  uniform float time;
  varying vec2 vUv;
  varying vec3 vPosition;

  // 3D Noise for the "Non-Universe" void
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                   mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                   mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    vec3 p = normalize(vPosition);
    float n = noise(p * 5.0 + time * 0.2);
    float n2 = noise(p * 10.0 - time * 0.1);
    
    // Abstract, non-universe colors (Eerie purples, sickly greens, hot pinks)
    vec3 col1 = vec3(0.1, 0.0, 0.2); // Dark Purple
    vec3 col2 = vec3(0.0, 0.3, 0.1); // Dark Green
    vec3 col3 = vec3(0.4, 0.0, 0.3); // Hot Pink
    
    vec3 color = mix(col1, col2, n);
    color = mix(color, col3, n2);
    
    // Add "veins" of energy
    float veins = smoothstep(0.4, 0.5, noise(p * 20.0 + time * 0.5));
    color += vec3(0.0, 1.0, 0.8) * veins * 0.3;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const MultiverseVertexShader = `
  varying vec2 vUv;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    // View direction in world space
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(worldPos.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
  }
`;

export const MultiverseFragmentShader = `
  uniform float time;
  uniform float collapseFocus; 
  uniform float vortexStrength;
  uniform float discoveryFactor; // 0.0 to 1.0 (Opacity/Visibility)

  varying vec2 vUv;
  varying vec3 vViewDir;

  float map(vec3 p) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    float power = 8.0 + sin(time * 0.2) * discoveryFactor * 2.0;
    for (int i = 0; i < 6; i++) {
        r = length(z);
        if (r > 2.0) break;
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        float zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        z += p;
    }
    return discoveryFactor * 0.5 * log(r) * r / dr;
  }

  void main() {
    vec3 rd = vViewDir;
    // Spiral space only if discovered
    float angle = discoveryFactor * vortexStrength * 5.0;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    rd.xy *= rot;

    vec3 ro = vec3(0.0, 0.0, 2.5) - vec3(0.0, 0.0, collapseFocus * 2.4); 
    
    float t = discoveryFactor * 0.0;
    float maxD = 10.0;
    float d = discoveryFactor * 0.0;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        d = map(p);
        if (d < 0.001 || t > maxD) break;
        t += d;
    }

    if (t < maxD) {
        vec3 p = ro + rd * t;
        vec3 baseCol = 0.5 + 0.5 * cos(time * 0.5 + p.xyx * 2.0 + vec3(0, 2, 4));
        // Fade in based on discovery
        gl_FragColor = vec4(baseCol * discoveryFactor, discoveryFactor);
    } else {
        discard;
    }
  }
`;
