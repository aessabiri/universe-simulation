export const MultiverseVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0); 
  }
`;

export const MultiverseFragmentShader = `
  uniform float time;
  uniform vec2 resolution;
  uniform float collapseFocus; 
  uniform float vortexStrength;

  varying vec2 vUv;

  // Noise for energy filaments
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n = p.x + p.y*57.0 + 113.0*p.z;
    return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                   mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
               mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                   mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
  }

  float map(vec3 p) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    float power = 8.0 + sin(time * 0.2) * 2.0;
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
    return 0.5 * log(r) * r / dr;
  }

  vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= resolution.x / resolution.y;
    
    float angle = atan(uv.y, uv.x);
    float dist = length(uv);
    angle += (1.0 / (dist + 0.01)) * vortexStrength * 5.0;
    uv = vec2(cos(angle), sin(angle)) * dist;
    uv *= mix(1.0, 10.0, vortexStrength);

    vec3 ro = vec3(0.0, 0.0, 2.5) - vec3(0.0, 0.0, collapseFocus * 2.4); 
    vec3 rd = normalize(vec3(uv, -1.0));
    
    float rotTime = time * 0.1;
    mat2 rotY = mat2(cos(rotTime), -sin(rotTime), sin(rotTime), cos(rotTime));
    ro.xz *= rotY;
    rd.xz *= rotY;

    float t = 0.0;
    float maxD = 10.0;
    float d = 0.0;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        d = map(p);
        if (d < 0.001 || t > maxD) break;
        t += d;
    }

    vec3 col = vec3(0.0);
    if (t < maxD) {
        vec3 p = ro + rd * t;
        vec3 n = getNormal(p);
        vec3 light = normalize(vec3(sin(time), 1.0, cos(time)));
        float diff = max(dot(n, light), 0.0);
        float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        vec3 baseCol = 0.5 + 0.5 * cos(time * 0.5 + p.xyx * 2.0 + vec3(0, 2, 4));
        col = baseCol * diff + vec3(0.5, 0.0, 1.0) * fresnel;
        col += vec3(0.1, 0.8, 0.5) * (sin(time * 3.0 + p.z * 10.0) * 0.5 + 0.5) * 0.2;
    } else {
        float nebula = sin(uv.x * 10.0 + time) * cos(uv.y * 10.0 - time) * 0.5 + 0.5;
        col = mix(vec3(0.0, 0.0, 0.1), vec3(0.1, 0.0, 0.2), nebula);
    }
    
    // ENERGY FILAMENTS (Power Lines)
    // Create radial lines that distort and "flow" toward the center
    float filamentCount = 12.0;
    for(float i = 0.0; i < filamentCount; i++) {
        float radialAngle = (i / filamentCount) * 6.28318 + time * 0.1;
        vec2 dir = vec2(cos(radialAngle), sin(radialAngle));
        
        // Distance to the line
        float dLine = length(uv - dir * dot(uv, dir));
        
        // Distort the line with noise to make it look like plasma
        float distortion = noise(vec3(uv * 2.0, time * 2.0)) * 0.2;
        dLine += distortion;
        
        // Intensity based on proximity and "flow" (sin wave along the line)
        float flow = sin(dot(uv, dir) * 5.0 - time * 10.0) * 0.5 + 0.5;
        float lineIntensity = smoothstep(0.08, 0.0, dLine) * flow;
        
        // Lines get brighter as they approach the center and as vortexStrength increases
        lineIntensity *= mix(0.5, 2.0, vortexStrength);
        col += vec3(0.4, 0.7, 1.0) * lineIntensity;
    }

    float coreGlow = (1.0 / (length(uv) + 0.05)) * vortexStrength * 0.5;
    col += vec3(1.0, 0.9, 0.7) * coreGlow;

    col = mix(col, vec3(0.0), 1.0 - exp(-0.2 * t));
    col *= (1.0 - smoothstep(0.8, 1.0, vortexStrength));

    gl_FragColor = vec4(col, 1.0);
  }
`;
