export const EarthVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vLocalPos;
  varying vec3 vViewDir;
  uniform float time;
  uniform float evolution;
  
  void main() {
    vUv = uv;
    vLocalPos = position;
    vec3 pos = position;
    
    // Subtle heat distortion for Hadean phase
    if (evolution < 0.4) {
      float distortion = sin(pos.y * 10.0 + time * 2.0) * cos(pos.x * 10.0 + time * 1.5) * 0.01;
      pos += normal * distortion;
    }

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vPosition = worldPosition.xyz;
    vNormal = normalize(vec3(modelMatrix * vec4(normal, 0.0)));
    vViewDir = normalize(cameraPosition - vPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
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
  varying vec3 vLocalPos;
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
    // CRITICAL: Use vLocalPos for noise generation so it rotates with the mesh!
    vec3 pos = normalize(vLocalPos);
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.05;
    
    vec3 finalColor = vec3(0.0);
    float emissive = 0.0;
    float roughness = 0.8;

    if (evolution < 0.4) {
      // HADEAN EARTH: ADVANCED LAVA FLOWS
      float flowSpeed = time * 0.15;
      
      // Multi-layered 4D-like noise for fluid lava
      float n1 = snoise(pos * 2.5 + vec3(0.0, flowSpeed, 0.0));
      float n2 = snoise(pos * 5.0 - vec3(flowSpeed * 0.5, flowSpeed * 0.2, 0.0));
      float n3 = snoise(pos * 10.0 + vec3(0.0, 0.0, flowSpeed * 0.8));
      
      float combinedNoise = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2) * 0.5 + 0.5;
      
      // Sharp transitions for crust/lava
      float lavaMask = smoothstep(0.45, 0.65, combinedNoise);
      float pulse = sin(time * 0.5 + combinedNoise * 10.0) * 0.1 + 0.9;
      
      vec3 colorLava = mix(vec3(0.6, 0.05, 0.0), vec3(1.0, 0.4, 0.0), combinedNoise) * pulse;
      vec3 colorCrust = vec3(0.06, 0.05, 0.04);
      
      finalColor = mix(colorCrust, colorLava, lavaMask);
      emissive = lavaMask * 3.5;
      roughness = mix(0.95, 0.2, lavaMask);

      // Impact craters (hyper-heated)
      for(int i=0; i<5; i++) {
        float d = distance(pos, normalize(impacts[i].xyz));
        if (d < 0.12) {
            float force = impacts[i].w * (1.0 - smoothstep(0.0, 0.12, d));
            finalColor = mix(finalColor, vec3(1.2, 1.0, 0.6), force);
            emissive += force * 8.0;
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
        roughness = mix(0.15, 0.05, snowballFactor);
      } else {
        // Land
        float snowLine = mix(0.95, 0.72, lifeRatio) + (fbm(pos*12.0)*0.04);
        snowLine = mix(snowLine, 0.0, snowballFactor);
        
        if (lat > snowLine) {
          finalColor = vec3(0.98, 0.98, 1.0);
          roughness = 0.95;
        } else {
          vec3 aridColor = vec3(0.55, 0.45, 0.3);
          vec3 lushColor = mix(vec3(0.08, 0.22, 0.05), vec3(0.04, 0.18, 0.04), lat * 1.8);
          finalColor = mix(aridColor, lushColor, lifeRatio);
          roughness = 1.0;
        }
      }
    }

    // Specular highlight
    vec3 halfDir = normalize(lightDir + vViewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0);
    vec3 specularColor = vec3(0.4) * (1.0 - roughness);

    // Final lighting assembly
    vec3 lighting = (diff + ambient) * finalColor;
    vec3 reflection = specularColor * spec * diff;
    vec3 emission = finalColor * emissive;
    
    gl_FragColor = vec4(lighting + emission + reflection, 1.0);
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
    // Re-normalize interpolated vectors for accuracy
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDir);
    vec3 lightDir = normalize(sunPosition - vPosition);
    
    float dotNL = dot(normal, lightDir);
    float viewDotNormal = dot(viewDir, normal);
    
    // Correct Rayleigh/Fresnel falloff for BackSide:
    // Rim is where view is perpendicular to normal (dot ~ 0)
    // Center is where view is opposite to normal (dot ~ -1)
    float rim = 1.0 - abs(viewDotNormal);
    float intensity = pow(clamp(rim, 0.0, 1.0), 6.0);
    
    // Scattering parameters
    vec3 blueSky = vec3(0.3, 0.6, 1.0);
    vec3 orangeSunset = vec3(1.0, 0.45, 0.15);
    vec3 spaceBlack = vec3(0.02, 0.05, 0.1);
    
    // Sunset transition logic
    float sunsetFactor = clamp(1.0 - abs(dotNL + 0.15) * 2.5, 0.0, 1.0);
    vec3 scatterColor = mix(blueSky, orangeSunset, sunsetFactor);
    
    // Pseudo-Mie scattering (halo around sun)
    float dotVL = dot(viewDir, -lightDir);
    float mie = pow(max(0.0, dotVL), 12.0) * 0.5;
    scatterColor += orangeSunset * mie * sunsetFactor;
    
    // Atmosphere thickness over evolution
    float thickness = mix(0.4, 1.3, smoothstep(0.0, 0.5, evolution));
    
    // Night side shadow
    float shadow = smoothstep(-0.3, 0.3, dotNL);
    
    vec3 finalColor = mix(spaceBlack, scatterColor, shadow);
    
    gl_FragColor = vec4(finalColor, intensity * shadow * thickness);
  }
`;
