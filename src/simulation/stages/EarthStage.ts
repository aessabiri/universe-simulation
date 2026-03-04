import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';

export class EarthStage extends Stage {
  private earth: THREE.Mesh | null = null;
  private clouds: THREE.Mesh | null = null;
  private atmosphere: THREE.Mesh | null = null;
  private moon: THREE.Mesh | null = null;
  private moon2: THREE.Mesh | null = null;
  private sun: THREE.Mesh | null = null;
  private stars: THREE.Points | null = null;
  private timeUniform = { value: 0 };

  private noise(x: number, y: number, scale: number, seed: number): number {
    const p = (x: number, y: number) => {
      const val = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
      return val - Math.floor(val);
    };
    const xi = Math.floor(x * scale); const yi = Math.floor(y * scale);
    const xf = (x * scale) - xi; const yf = (y * scale) - yi;
    const u = xf * xf * (3 - 2 * xf); const v = yf * yf * (3 - 2 * yf);
    const aa = p(xi, yi); const ab = p(xi + 1, yi);
    const ba = p(xi, yi + 1); const bb = p(xi + 1, yi + 1);
    return aa * (1 - u) * (1 - v) + ab * u * (1 - v) + ba * (1 - u) * v + bb * u * v;
  }

  private fbm(x: number, y: number, octaves: number, seed: number): number {
    let value = 0; let amplitude = 0.5; let frequency = 1;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise(x * frequency, y * frequency, 1, seed);
      amplitude *= 0.5; frequency *= 2;
    }
    return value;
  }

  private generateEarthTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const nx = x / canvas.width; const ny = y / canvas.height;
        const lat = Math.abs(ny * 180 - 90);
        const h = this.fbm(nx * 4, ny * 2, 6, 123);
        const i = (y * canvas.width + x) * 4;
        let r, g, b;
        const polarThreshold = 72 + (h * 20 - 10);
        const isPolar = lat > polarThreshold;
        if (h < 0.45) { r = 10; g = 20; b = 60; if (isPolar) { r = 220; g = 230; b = 245; } }
        else if (h < 0.5) { r = 20; g = 50; b = 100; if (isPolar) { r = 230; g = 240; b = 255; } }
        else if (h < 0.52) { r = 190; g = 170; b = 130; if (isPolar) { r = 245; g = 250; b = 255; } }
        else {
          const isDesert = lat < 30 && lat > 15 && h < 0.6;
          const isSnow = isPolar || (h > 0.75 && lat > 35);
          if (isSnow) { r = 245; g = 250; b = 255; }
          else if (isDesert) { r = 180; g = 140; b = 80; }
          else { const green = (h - 0.5) * 400; r = 40 + green * 0.1; g = 80 + green * 0.5; b = 40; }
        }
        data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  private generateCloudTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const nx = x / canvas.width; const ny = y / canvas.height;
        const n = this.fbm(nx * 6, ny * 3, 5, 456);
        const lat = ny * 180 - 90;
        const band = Math.abs(Math.sin(lat * 0.08)) * 0.4 + 0.6;
        const i = (y * canvas.width + x) * 4;
        const alpha = Math.max(0, n - 0.5) * 2 * band;
        data[i] = 255; data[i+1] = 255; data[i+2] = 255; data[i+3] = alpha * 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  init() {
    const starCount = 8000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starSiz = new Float32Array(starCount);
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
      starSiz[i] = 1.0 + Math.random();
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSiz, 1));
    this.stars = new THREE.Points(starGeo, TextureUtils.createStarShaderMaterial(this.timeUniform));
    this.scene.add(this.stars);
    TextureUtils.addCosmicBackground(this.scene, 20);

    this.earth = new THREE.Mesh(new THREE.SphereGeometry(2, 64, 64), new THREE.MeshStandardMaterial({ map: this.generateEarthTexture(), roughness: 0.8, metalness: 0.1 }));
    this.earth.rotation.y = Math.PI;
    this.scene.add(this.earth);

    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(2.03, 64, 64), new THREE.MeshStandardMaterial({ map: this.generateCloudTexture(), transparent: true, opacity: 0.8, depthWrite: false }));
    this.scene.add(this.clouds);

    const atmoVertexShader = `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const atmoFragmentShader = `varying vec3 vNormal; void main() { float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 4.0); gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity; }`;
    this.atmosphere = new THREE.Mesh(new THREE.SphereGeometry(2.1, 64, 64), new THREE.ShaderMaterial({ vertexShader: atmoVertexShader, fragmentShader: atmoFragmentShader, blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false }));
    this.scene.add(this.atmosphere);

    this.moon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 }));
    this.moon.position.set(8, 0, 0);
    this.scene.add(this.moon);

    this.moon2 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 32), new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 1.0 }));
    this.moon2.position.set(-11, 2, 0);
    this.scene.add(this.moon2);

    this.sun = new THREE.Mesh(new THREE.SphereGeometry(25, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.sun.position.set(600, 300, -900);
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

  update(time: number, delta: number) {
    const t = time * 0.001;
    this.timeUniform.value = t;
    if (this.earth) this.earth.rotation.y += 0.0002;
    if (this.clouds) this.clouds.rotation.y += 0.0003;
    if (this.moon) { this.moon.position.x = Math.cos(t * 0.08) * 8; this.moon.position.z = Math.sin(t * 0.08) * 8; }
    if (this.moon2) { this.moon2.position.x = Math.cos(t * 0.12) * 11; this.moon2.position.z = Math.sin(t * 0.12) * 11; this.moon2.position.y = Math.sin(t * 0.12) * 3; }
  }

  destroy() { this.scene.clear(); }
}
