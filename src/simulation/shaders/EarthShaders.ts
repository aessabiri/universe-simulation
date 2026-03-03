export const EarthVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const EarthFragmentShader = `
  uniform float time;
  uniform float evolution; // 0.0 = Lava, 0.5 = Oceans/Barren, 1.0 = Lush Earth
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // 3D Simplex Noise from Ashima Arts
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

    float n_ = 1.0/7.0; // N=7
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

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
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  float fbm(vec3 x) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 6; ++i) {
      v += a * snoise(x);
      x = x * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Basic lighting
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.02;
    float light = diff + ambient;

    // Terrain generation based on position
    vec3 pos = normalize(vPosition); // Base sphere pos
    float noiseVal = fbm(pos * 3.0) * 0.5 + 0.5; // 0 to 1
    
    // Latitude
    float lat = abs(pos.y);

    // Color palettes
    vec3 colorLava = vec3(0.1, 0.0, 0.0);
    vec3 colorMagma = vec3(1.0, 0.3, 0.0);
    vec3 colorCrust = vec3(0.2, 0.15, 0.1);

    vec3 colorDeepOcean = vec3(0.04, 0.1, 0.2);
    vec3 colorShallowWater = vec3(0.08, 0.2, 0.4);
    vec3 colorBarrenLand = vec3(0.6, 0.5, 0.4);
    vec3 colorDesert = vec3(0.8, 0.7, 0.5);
    vec3 colorJungle = vec3(0.1, 0.3, 0.1);
    vec3 colorForest = vec3(0.2, 0.4, 0.2);
    vec3 colorSnow = vec3(0.95, 0.95, 1.0);

    vec3 finalColor = vec3(0.0);
    float emissive = 0.0;

    // 0.0 -> 0.4 (Hadean - Lava)
    // 0.4 -> 0.7 (Archean - Water / Barren)
    // 0.7 -> 1.0 (Proterozoic - Lush / Snow)

    if (evolution < 0.4) {
      float lavaRatio = evolution / 0.4;
      // Animate lava
      float lavaNoise = fbm(pos * 5.0 + time * 0.2) * 0.5 + 0.5;
      
      if (noiseVal < 0.4 + (lavaRatio * 0.2)) {
        finalColor = mix(colorCrust, colorLava, lavaRatio);
      } else {
        finalColor = mix(colorMagma, vec3(1.0, 0.8, 0.2), lavaNoise);
        emissive = 1.0 * (1.0 - lavaRatio); // Lava glows less as it cools
      }
    } else {
      float lifeRatio = (evolution - 0.4) / 0.6; // 0 to 1
      
      // Oceans vs Land
      if (noiseVal < 0.5) {
        // Ocean
        float depth = smoothstep(0.3, 0.5, noiseVal);
        finalColor = mix(colorDeepOcean, colorShallowWater, depth);
        // Specular highlight for water
        vec3 viewDir = normalize(cameraPosition - vPosition);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
        finalColor += vec3(spec * 0.5) * diff; 
      } else {
        // Land
        if (noiseVal < 0.52) {
          finalColor = colorDesert; // Beach
        } else {
          // Biomes based on lifeRatio and latitude
          float snowLine = mix(1.0, 0.7, lifeRatio) + (fbm(pos*10.0)*0.1); // Snow moves south
          
          if (lat > snowLine) {
            finalColor = colorSnow;
          } else if (lat < 0.3) { // Equator
            finalColor = mix(colorBarrenLand, colorJungle, lifeRatio);
          } else { // Temperate
            finalColor = mix(colorBarrenLand, colorForest, lifeRatio);
          }
        }
      }
    }

    vec3 litColor = finalColor * light + (finalColor * emissive);
    gl_FragColor = vec4(litColor, 1.0);
  }
`;
