import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';
import { EarthVertexShader, EarthFragmentShader } from '../shaders/EarthShaders';
import { CloudVertexShader, CloudFragmentShader } from '../shaders/CloudShaders';

export class EarthStage extends Stage {
  private earth: THREE.Mesh | null = null;
  private clouds: THREE.Mesh | null = null;
  private atmosphere: THREE.Mesh | null = null;
  private moon: THREE.Mesh | null = null;
  private moon2: THREE.Mesh | null = null;
  private sun: THREE.Mesh | null = null;
  private stars: THREE.Points | null = null;
  
  private earthUniforms = {
    time: { value: 0 },
    evolution: { value: 0 },
    sunPosition: { value: new THREE.Vector3(800, 400, -1000) }
  };

  private evolutionProgress = 0.0;

  private generateMoonTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 0.5 + Math.random() * 8;
      ctx.fillStyle = Math.random() > 0.5 ? '#777777' : '#999999';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }

  private generateMoon2Texture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 1 + Math.random() * 5;
      ctx.fillStyle = '#3e2723';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }

  init() {
    this.evolutionProgress = 0.0; // Start at Hadean (Lava)

    // 1. Stars and Background
    const starCount = 8000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 500 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPos[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPos[i3 + 2] = radius * Math.cos(phi);
      const color = new THREE.Color();
      const r = Math.random();
      if (r < 0.2) color.setHex(0xaaccff);
      else if (r < 0.4) color.setHex(0xfff0aa);
      else color.setHex(0xffffff);
      starCol[i3] = color.r; starCol[i3+1] = color.g; starCol[i3+2] = color.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      size: 1.5, vertexColors: true, map: TextureUtils.createCircularParticleTexture(),
      transparent: true, alphaTest: 0.01, depthWrite: false
    }));
    this.scene.add(this.stars);
    TextureUtils.addCosmicBackground(this.scene, 20);

    // 2. Earth (ShaderMaterial)
    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(2, 128, 128), // High res for vertex displacement later if needed
      new THREE.ShaderMaterial({
        uniforms: this.earthUniforms,
        vertexShader: EarthVertexShader,
        fragmentShader: EarthFragmentShader
      })
    );
    this.earth.rotation.y = Math.PI;
    this.scene.add(this.earth);

    // 3. Clouds (ShaderMaterial)
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(2.03, 128, 128),
      new THREE.ShaderMaterial({
        uniforms: this.earthUniforms, // Share uniforms for sync
        vertexShader: CloudVertexShader,
        fragmentShader: CloudFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending
      })
    );
    this.scene.add(this.clouds);

    // 4. Atmospheric Scattering (Fresnel)
    const atmoVertexShader = `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const atmoFragmentShader = `
      varying vec3 vNormal;
      uniform float evolution;
      void main() {
        if(evolution < 0.4) discard; // No blue atmo during lava phase
        float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 4.0);
        float alpha = smoothstep(0.4, 0.6, evolution);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity * alpha;
      }
    `;
    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: this.earthUniforms,
        vertexShader: atmoVertexShader,
        fragmentShader: atmoFragmentShader,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
      })
    );
    this.scene.add(this.atmosphere);

    // 5. Moons
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ map: this.generateMoonTexture(), roughness: 0.9 }));
    this.moon.position.set(8, 0, 0);
    this.scene.add(this.moon);

    this.moon2 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 32), new THREE.MeshStandardMaterial({ map: this.generateMoon2Texture(), roughness: 1.0 }));
    this.moon2.position.set(-11, 2, 0);
    this.scene.add(this.moon2);

    // 6. Sun & Lighting (Used by Moons, Shaders use uniform)
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.sun.position.copy(this.earthUniforms.sunPosition.value);
    this.scene.add(this.sun);
    
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffddaa, transparent: true, opacity: 0.3, side: THREE.BackSide }));
    this.sun.add(sunGlow);

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.5);
    sunLight.position.copy(this.sun.position);
    this.scene.add(sunLight);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    this.camera.position.set(0, 0, 8);
  }

  update(time: number, delta: number) {
    const t = time * 0.001;
    
    // Animate evolution (Takes ~60 seconds to fully evolve)
    if (this.evolutionProgress < 1.0) {
        this.evolutionProgress += delta * 0.015;
    }
    this.earthUniforms.evolution.value = Math.min(1.0, this.evolutionProgress);
    this.earthUniforms.time.value = t;

    if (this.earth) this.earth.rotation.y += 0.001;
    if (this.clouds) {
      this.clouds.rotation.y += 0.0015; // Clouds move slightly faster
    }
    if (this.moon) {
      this.moon.position.x = Math.cos(t * 0.08) * 8;
      this.moon.position.z = Math.sin(t * 0.08) * 8;
      this.moon.rotation.y += 0.001;
    }
    if (this.moon2) {
      this.moon2.position.x = Math.cos(t * 0.12) * 11;
      this.moon2.position.z = Math.sin(t * 0.12) * 11;
      this.moon2.position.y = Math.sin(t * 0.12) * 3;
      this.moon2.rotation.y += 0.002;
    }
  }

  destroy() {
    [this.earth, this.clouds, this.atmosphere, this.moon, this.moon2, this.stars, this.sun].forEach(obj => {
      if (obj) {
        this.scene.remove(obj);
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
          } else {
              obj.material.dispose();
          }
        }
      }
    });
    this.scene.clear();
  }
}
