export const CloudVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vLocalPos;
  varying vec3 vNormal;
  uniform float time;
  uniform float evolution;

  // Simple noise for displacement
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vUv = uv;
    vLocalPos = position;
    vec3 pos = position;
    
    // Physical volumetric bumpiness for clouds
    if (evolution >= 0.4) {
      float n = snoise(pos.xy * 2.0 + time * 0.05) * 0.5 + 0.5;
      n *= snoise(pos.yz * 3.0 - time * 0.03) * 0.5 + 0.5;
      pos += normal * n * 0.08;
    }

    vNormal = normalize(vec3(modelMatrix * vec4(normal, 0.0)));
    vPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const CloudFragmentShader = `
  uniform float time;
  uniform float evolution;
  uniform vec3 sunPosition;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vLocalPos;
  varying vec3 vNormal;

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
    vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0; vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy ); vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }
  
  float fbm(vec3 x) {
    float v = 0.0; float a = 0.5; vec3 shift = vec3(100.0);
    for (int i = 0; i < 5; ++i) { v += a * snoise(x); x = x * 2.0 + shift; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 lightDir = normalize(sunPosition - vPosition);
    // Use vLocalPos for noise generation so it rotates with the mesh!
    vec3 pos = normalize(vLocalPos);
    
    // Main cloud noise
    float n = fbm(pos * 4.5 + vec3(time * 0.03, 0.0, time * 0.01));
    
    // Secondary noise for detail
    float detail = fbm(pos * 12.0 - vec3(time * 0.05));
    float finalNoise = n * 0.7 + detail * 0.3;

    vec3 cloudColor = vec3(1.0);
    float alpha = 0.0;

    if (evolution < 0.4) {
      // Proto-atmosphere / Primordial clouds
      cloudColor = vec3(0.85, 0.55, 0.3); 
      alpha = (finalNoise * 0.7) + 0.3; 
    } else {
      // Modern clouds
      float lat = abs(pos.y);
      float band = abs(sin(lat * 8.0)) * 0.3 + 0.7;
      alpha = smoothstep(0.42, 0.65, finalNoise) * band;
      alpha *= smoothstep(0.4, 0.55, evolution);
    }

    // Pseudo self-shadowing: sample noise again at offset towards sun
    float shadowSample = fbm((pos + lightDir * 0.05) * 4.5 + vec3(time * 0.03, 0.0, time * 0.01));
    float shadow = smoothstep(0.3, 0.6, shadowSample);
    
    float diff = max(dot(vNormal, lightDir), 0.0);
    vec3 lighting = cloudColor * (diff * 0.8 + 0.2);
    lighting *= (1.0 - shadow * 0.4); // Darken based on self-shadowing

    gl_FragColor = vec4(lighting, alpha * 0.8);
  }
`;
