export const EarthVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;
  
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vPosition = worldPosition.xyz;
    vNormal = normalize(vec3(modelMatrix * vec4(normal, 0.0)));
    vViewDir = normalize(cameraPosition - vPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const EarthFragmentShader = `
  uniform float time;
  uniform float evolution; 
  uniform vec3 sunPosition;
  uniform vec4 impacts[5]; 

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;

  // Noise functions for procedural generation
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0 ); 
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  float fbm(vec3 x) {
    float v = 0.0; float a = 0.5; vec3 shift = vec3(100.0);
    for (int i = 0; i < 6; ++i) { v += a * snoise(x); x = x * 2.0 + shift; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 pos = normalize(vPosition);
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.05;
    
    vec3 finalColor = vec3(0.0);
    float emissive = 0.0;
    float roughness = 0.8;

    if (evolution < 0.4) {
      // HADEAN EARTH: LAVA FLOWS
      float flowSpeed = time * 0.2;
      
      // Moving noise for lava veins
      float noise1 = snoise(pos * 3.0 + vec3(flowSpeed, 0.0, flowSpeed * 0.5));
      float noise2 = snoise(pos * 6.0 - vec3(0.0, flowSpeed * 0.8, flowSpeed));
      float combinedNoise = noise1 * 0.6 + noise2 * 0.4;
      
      // Magma vs Cooling Crust
      float lavaMask = smoothstep(0.1, 0.5, combinedNoise);
      vec3 colorLava = mix(vec3(0.8, 0.1, 0.0), vec3(1.0, 0.6, 0.0), snoise(pos * 10.0 + time) * 0.5 + 0.5);
      vec3 colorCrust = vec3(0.05, 0.04, 0.03);
      
      finalColor = mix(colorCrust, colorLava, lavaMask);
      emissive = lavaMask * 2.0;
      roughness = mix(0.9, 0.3, lavaMask);

      // Impact craters (glowing hot)
      for(int i=0; i<5; i++) {
        float d = distance(pos, normalize(impacts[i].xyz));
        if (d < 0.15) {
            float impactForce = impacts[i].w * (1.0 - smoothstep(0.0, 0.15, d));
            finalColor = mix(finalColor, vec3(1.0, 0.9, 0.5), impactForce);
            emissive += impactForce * 6.0;
        }
      }
    } else {
      // EVOLVED EARTH
      float lifeRatio = clamp((evolution - 0.4) / 0.6, 0.0, 1.0);
      float noiseVal = fbm(pos * 3.0) * 0.5 + 0.5;
      float lat = abs(pos.y);
      float snowballFactor = clamp(1.0 - abs(evolution - 0.7) * 5.0, 0.0, 1.0);

      if (noiseVal < 0.5) {
        // Ocean / Ice
        vec3 waterColor = mix(vec3(0.02, 0.08, 0.2), vec3(0.05, 0.15, 0.35), smoothstep(0.3, 0.5, noiseVal));
        finalColor = mix(waterColor, vec3(0.95, 0.98, 1.0), snowballFactor);
        roughness = mix(0.2, 0.1, snowballFactor);
      } else {
        // Land
        float snowLine = mix(0.95, 0.7, lifeRatio) + (fbm(pos*10.0)*0.05);
        snowLine = mix(snowLine, 0.0, snowballFactor);
        
        if (lat > snowLine) {
          finalColor = vec3(0.95, 0.95, 1.0);
          roughness = 0.9;
        } else {
          vec3 aridColor = vec3(0.6, 0.5, 0.35);
          vec3 lushColor = mix(vec3(0.1, 0.25, 0.05), vec3(0.05, 0.2, 0.05), lat * 2.0);
          finalColor = mix(aridColor, lushColor, lifeRatio);
          roughness = 1.0;
        }
      }
    }

    // Specular highlight
    vec3 halfDir = normalize(lightDir + vViewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
    vec3 specularColor = vec3(0.5) * (1.0 - roughness);

    gl_FragColor = vec4(finalColor * (diff + ambient) + (finalColor * emissive) + (specularColor * spec * diff), 1.0);
  }
`;

export const AtmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(vec3(modelMatrix * vec4(normal, 0.0)));
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vViewDir = normalize(cameraPosition - vPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const AtmosphereFragmentShader = `
  uniform vec3 sunPosition;
  uniform float evolution;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;

  void main() {
    vec3 lightDir = normalize(sunPosition - vPosition);
    float dotNL = dot(vNormal, lightDir);
    float viewDotNormal = dot(vViewDir, vNormal);
    
    // Fresnel-like effect for the atmospheric "ring"
    float intensity = pow(1.0 - viewDotNormal, 4.0);
    
    // Rayleigh scattering colors (blue sky, orange sunset)
    vec3 dayColor = vec3(0.3, 0.6, 1.0);
    vec3 sunsetColor = vec3(1.0, 0.5, 0.2);
    
    // Transition based on light angle
    float sunsetFactor = clamp(1.0 - abs(dotNL + 0.1) * 2.0, 0.0, 1.0);
    vec3 atmosColor = mix(dayColor, sunsetColor, sunsetFactor);
    
    // Thin out atmosphere based on evolution (early earth had thicker/different atmosphere)
    float atmosThickness = mix(0.5, 1.2, smoothstep(0.0, 0.5, evolution));
    
    // Night side should be dark
    float shadow = smoothstep(-0.2, 0.2, dotNL);
    
    gl_FragColor = vec4(atmosColor, intensity * shadow * atmosThickness);
  }
`;
