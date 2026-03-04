import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
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
  
  private uniforms = {
    time: { value: 0 },
    evolution: { value: 1.0 }, // 0.0: Lava, 0.5: Early, 1.0: Modern
    sunPosition: { value: new THREE.Vector3(600, 300, -900) }
  };

  private targetEvolution = 1.0;

  init() {
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
      const color = new THREE.Color().setHSL(Math.random() < 0.5 ? 0.6 : 0.1, 0.4, 0.9);
      starCol[i3] = color.r; starCol[i3+1] = color.g; starCol[i3+2] = color.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    this.stars = new THREE.Points(starGeo, TextureUtils.createStarShaderMaterial(this.uniforms.time));
    this.scene.add(this.stars);
    TextureUtils.addCosmicBackground(this.scene, 20);

    // 2. Earth (ShaderMaterial)
    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(2, 128, 128),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
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
        uniforms: this.uniforms,
        vertexShader: CloudVertexShader,
        fragmentShader: CloudFragmentShader,
        transparent: true,
        depthWrite: false
      })
    );
    this.scene.add(this.clouds);

    // 4. Atmosphere
    const atmoVertex = `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const atmoFragment = `varying vec3 vNormal; uniform float evolution; void main() { if(evolution < 0.3) discard; float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 4.0); gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity * smoothstep(0.3, 0.5, evolution); }`;
    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: atmoVertex,
        fragmentShader: atmoFragment,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
      })
    );
    this.scene.add(this.atmosphere);

    // 5. Moons
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 }));
    this.moon.position.set(8, 0, 0);
    this.scene.add(this.moon);

    this.moon2 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 32), new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 1.0 }));
    this.moon2.position.set(-11, 2, 0);
    this.scene.add(this.moon2);

    // 6. Sun
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(25, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.sun.position.copy(this.uniforms.sunPosition.value);
    this.scene.add(this.sun);
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.5);
    sunLight.position.copy(this.sun.position);
    this.scene.add(sunLight);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    const lensflare = new Lensflare();
    lensflare.addElement(new LensflareElement(TextureUtils.createCircularParticleTexture(), 700, 0, new THREE.Color(0xffddaa)));
    sunLight.add(lensflare);

    this.camera.position.set(0, 0, 8);
  }

  public setEvolution(val: number) {
    this.targetEvolution = val;
  }

  update(time: number, delta: number) {
    const t = time * 0.001;
    this.uniforms.time.value = t;
    
    // Smooth transition between stages
    this.uniforms.evolution.value += (this.targetEvolution - this.uniforms.evolution.value) * 0.05;

    if (this.earth) this.earth.rotation.y += 0.0002;
    if (this.clouds) this.clouds.rotation.y += 0.0003;
    if (this.moon) { this.moon.position.x = Math.cos(t * 0.08) * 8; this.moon.position.z = Math.sin(t * 0.08) * 8; }
    if (this.moon2) { this.moon2.position.x = Math.cos(t * 0.12) * 11; this.moon2.position.z = Math.sin(t * 0.12) * 11; this.moon2.position.y = Math.sin(t * 0.12) * 3; }
  }

  destroy() { this.scene.clear(); }
}
