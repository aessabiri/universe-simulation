export const MultiverseVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Render a full-screen quad or large plane
    gl_Position = vec4(position.xy, 1.0, 1.0); 
  }
`;

export const MultiverseFragmentShader = `
  uniform float time;
  uniform vec2 resolution;
  uniform float collapseFocus; // 0.0 to 1.0 (1.0 = fully zoomed into the void)

  varying vec2 vUv;

  // 3D Mandelbulb distance estimator
  float map(vec3 p) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    
    // Animate the fractal's power over time to make it shift and "breathe"
    float power = 8.0 + sin(time * 0.2) * 2.0;
    
    for (int i = 0; i < 6; i++) {
        r = length(z);
        if (r > 2.0) break;
        
        // Convert to polar coordinates
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        
        // Scale and rotate
        float zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;
        
        // Convert back to cartesian
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        z += p;
    }
    return 0.5 * log(r) * r / dr;
  }

  // Calculate normals for lighting
  vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
  }

  void main() {
    // Normalize coordinates
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= resolution.x / resolution.y;

    // Raymarching setup
    // Camera zooms into a specific "empty" pocket of the multiverse as collapseFocus approaches 1.0
    vec3 ro = vec3(0.0, 0.0, 2.5) - vec3(0.0, 0.0, collapseFocus * 2.4); 
    vec3 rd = normalize(vec3(uv, -1.0));

    // Rotate camera slightly over time to explore the multiverse
    float rotTime = time * 0.1;
    mat2 rotY = mat2(cos(rotTime), -sin(rotTime), sin(rotTime), cos(rotTime));
    ro.xz *= rotY;
    rd.xz *= rotY;

    float t = 0.0;
    float maxD = 10.0;
    int maxSteps = 64;
    float d = 0.0;

    for (int i = 0; i < maxSteps; i++) {
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
        
        // "Weird" multiverse lighting: Iridescent, shifting colors
        float diff = max(dot(n, light), 0.0);
        float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        
        vec3 baseCol = 0.5 + 0.5 * cos(time * 0.5 + p.xyx * 2.0 + vec3(0, 2, 4));
        col = baseCol * diff + vec3(0.5, 0.0, 1.0) * fresnel;
        
        // Add a pulsing glow
        col += vec3(0.1, 0.8, 0.5) * (sin(time * 3.0 + p.z * 10.0) * 0.5 + 0.5) * 0.2;
    } else {
        // Background void - empty space in the multiverse
        // Introduce a subtle, shifting energy nebula in the background
        float nebula = sin(uv.x * 10.0 + time) * cos(uv.y * 10.0 - time) * 0.5 + 0.5;
        col = mix(vec3(0.0, 0.0, 0.1), vec3(0.1, 0.0, 0.2), nebula);
    }

    // Fog to fade out distance
    col = mix(col, vec3(0.0), 1.0 - exp(-0.2 * t));

    // Darken everything as the collapse happens
    col *= (1.0 - pow(collapseFocus, 4.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;
