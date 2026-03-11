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
    vec3 col1 = vec3(0.1, 0.0, 0.2); 
    vec3 col2 = vec3(0.0, 0.3, 0.1); 
    vec3 col3 = vec3(0.4, 0.0, 0.3); 
    vec3 color = mix(col1, col2, n);
    color = mix(color, col3, n2);
    float veins = smoothstep(0.4, 0.5, noise(p * 20.0 + time * 0.5));
    color += vec3(0.0, 1.0, 0.8) * veins * 0.3;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const MultiverseVertexShader = `
  varying vec2 vUv;
  varying vec3 vViewDir;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(worldPos.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
  }
`;

export const MultiverseFragmentShader = `
  uniform float time;
  uniform float collapseFocus; 
  uniform float vortexStrength;
  uniform float discoveryFactor; 
  uniform float energyIntensity; 

  varying vec2 vUv;
  varying vec3 vViewDir;
  varying vec3 vPosition;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n = p.x + p.y*57.0 + 113.0*p.z;
    return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                   mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
               mix(mix(hash(n+113.0), hash(n+114.0),f.x),
                   mix(hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
  }

  float map(vec3 p) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    float power = 8.0 + sin(time * 0.2) * 2.0;
    for (int i = 0; i < 8; i++) {
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
    return 0.5 * log(r) * r / dr;
  }

  void main() {
    vec3 rd = vViewDir;
    float angle = vortexStrength * 5.0;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    rd.xy *= rot;

    vec3 ro = vec3(0.0, 0.0, 2.5) - vec3(0.0, 0.0, collapseFocus * 2.45); 
    
    float t = 0.0;
    float maxD = 10.0;
    for (int i = 0; i < 128; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if (d < 0.0001 || t > maxD) break;
        t += d;
    }

    vec3 col = vec3(0.0);
    if (t < maxD) {
        vec3 p = ro + rd * t;
        vec3 baseCol = 0.5 + 0.5 * cos(time * 0.8 + p.xyx * 3.0 + vec3(0, 2, 4));
        col = baseCol;
        col += vec3(0.5, 0.0, 1.0) * (1.0 / (t * t + 0.5)) * energyIntensity;
    }

    // Removed background nebula logic for "Pure" Mandelbulb in black space
    
    vec3 pNorm = normalize(vPosition);
    float filamentCount = 12.0;
    for(float i = 0.0; i < filamentCount; i++) {
        float radialAngle = (i / filamentCount) * 6.28318 + time * 0.5;
        vec3 dir = vec3(cos(radialAngle), sin(radialAngle), sin(radialAngle * 2.0));
        float dLine = length(pNorm - dir * dot(pNorm, dir));
        float distortion = noise(pNorm * 5.0 + time * 2.0) * 0.1;
        dLine += distortion;
        float flow = sin(dot(pNorm, dir) * 10.0 - time * 20.0) * 0.5 + 0.5;
        float lineIntensity = smoothstep(0.05, 0.0, dLine) * flow * energyIntensity;
        col += vec3(0.4, 0.7, 1.0) * lineIntensity * 2.0;
    }

    col *= (1.0 - smoothstep(0.9, 1.0, collapseFocus / 1.0));

    gl_FragColor = vec4(col * discoveryFactor, discoveryFactor);
  }
`;

export const BeaconVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const BeaconFragmentShader = `
  uniform float time;
  uniform float intensity;
  varying vec2 vUv;
  void main() {
    float flare = exp(-abs(vUv.y - 0.5) * 15.0);
    float pulse = sin(vUv.x * 20.0 - time * 15.0) * 0.5 + 0.5;
    vec3 col = vec3(0.0, 1.0, 0.8) * flare * pulse * intensity;
    gl_FragColor = vec4(col, col.r);
  }
`;

export const PrimalCoreVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const PrimalCoreFragmentShader = `
  uniform float time;
  uniform float intensity;
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    float pulse = sin(time * 5.0) * 0.5 + 0.5;
    vec3 color1 = vec3(0.8, 0.0, 0.2); 
    vec3 color2 = vec3(0.4, 0.0, 0.8); 
    float noise = sin(vPosition.x * 10.0 + time) * cos(vPosition.y * 10.0 - time);
    vec3 color = mix(color1, color2, pulse * 0.5 + 0.5 + noise * 0.2);
    float fresnel = pow(1.0 - dot(vNormal, vec3(0,0,1)), 3.0);
    color += vec3(1.0, 0.5, 0.8) * fresnel * pulse;
    gl_FragColor = vec4(color * intensity, intensity);
  }
`;
