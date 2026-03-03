import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';

export class StellarDawnStage extends Stage {
  private nebulaGroup: THREE.Group = new THREE.Group();
  private firstStars: THREE.Points | null = null;
  private staticStars: THREE.Points | null = null;
  private protoStars: THREE.Points | null = null;
  private particleCount = 200; 
  private staticParticleCount = 1000; 
  private starStates: { birthTime: number, pos: THREE.Vector3, color: THREE.Color }[] = [];
  private cachedTextures: THREE.CanvasTexture[] = [];

  private createSoftNebulaTexture(color1: string, color2: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256; // Reduced resolution for faster upload
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, color1);
    grad.addColorStop(0.6, color2);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }

  init() {
    this.scene.add(this.nebulaGroup);

    // OPTIMIZATION: Create only 3 textures once and reuse them
    const configs = [
      { c1: 'rgba(255, 60, 0, 0.25)', c2: 'rgba(150, 0, 0, 0.05)' },
      { c1: 'rgba(200, 150, 50, 0.2)', c2: 'rgba(150, 80, 0, 0.03)' },
      { c1: 'rgba(150, 100, 255, 0.2)', c2: 'rgba(50, 0, 150, 0.03)' }
    ];
    
    this.cachedTextures = configs.map(c => this.createSoftNebulaTexture(c.c1, c.c2));

    for (let i = 0; i < 250; i++) {
      const tex = this.cachedTextures[i % this.cachedTextures.length];
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0.8
      });
      const size = 60 + Math.random() * 120;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      const r = 50 + Math.random() * 150;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      mesh.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      mesh.lookAt(0, 0, 0);
      this.nebulaGroup.add(mesh);
    }

    // 2. STELLAR IGNITION
    const starGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(this.particleCount * 3);
    const colArr = new Float32Array(this.particleCount * 3);
    const sizeArr = new Float32Array(this.particleCount);
    for (let i = 0; i < this.particleCount; i++) {
      const r = 40 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const pos = new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      this.starStates.push({ birthTime: i * 30, pos, color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.1, 0.9, 0.9) });
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sizeArr, 1));

    this.firstStars = new THREE.Points(starGeo, new THREE.ShaderMaterial({
      vertexShader: `attribute float size; varying vec3 vColor; void main() { vColor = color; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * (500.0 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition; }`,
      fragmentShader: `varying vec3 vColor; void main() { float d = length(gl_PointCoord - vec2(0.5)); if (d > 0.5) discard; gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.0, 0.5, d)); }`,
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.scene.add(this.firstStars);

    // 3. PROTOSTARS
    const protoCount = 10;
    const protoGeo = new THREE.BufferGeometry();
    const protoPos = new Float32Array(protoCount * 3);
    for (let i = 0; i < protoCount; i++) {
        const i3 = i * 3;
        const r = 50 + Math.random() * 150;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        protoPos[i3] = r * Math.sin(phi) * Math.cos(theta);
        protoPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        protoPos[i3 + 2] = r * Math.cos(phi);
    }
    protoGeo.setAttribute('position', new THREE.BufferAttribute(protoPos, 3));
    this.protoStars = new THREE.Points(protoGeo, new THREE.PointsMaterial({
        size: 3.0, color: 0xffffff, map: TextureUtils.createCircularParticleTexture(),
        transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.scene.add(this.protoStars);

    // 4. STATIC STARS
    const staticGeo = new THREE.BufferGeometry();
    const staticPos = new Float32Array(this.staticParticleCount * 3);
    for (let i = 0; i < this.staticParticleCount; i++) {
      const i3 = i * 3;
      const r = 100 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      staticPos[i3] = r * Math.sin(phi) * Math.cos(theta);
      staticPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      staticPos[i3 + 2] = r * Math.cos(phi);
    }
    staticGeo.setAttribute('position', new THREE.BufferAttribute(staticPos, 3));
    this.staticStars = new THREE.Points(staticGeo, new THREE.PointsMaterial({ size: 0.5, color: 0xaaccff, transparent: true, opacity: 0.5 }));
    this.scene.add(this.staticStars);

    TextureUtils.addCosmicBackground(this.scene, 25);
    this.camera.position.set(0, 0, 10);
  }

  update(time: number, delta: number) {
    if (!this.firstStars) return;
    const positions = this.firstStars.geometry.attributes.position.array as Float32Array;
    const colors = this.firstStars.geometry.attributes.color.array as Float32Array;
    const sizes = (this.firstStars.geometry.attributes as any).size.array as Float32Array;
    const t = time * 0.001;
    const cycleTime = this.particleCount * 30;

    for (let i = 0; i < this.particleCount; i++) {
        const state = this.starStates[i];
        const i3 = i * 3;
        let age = (t % cycleTime) - state.birthTime;
        let intensity = 0;
        let starSize = 0;
        if (age > 0 && age < 180) {
            if (age < 3.0) { intensity = (age / 3.0) * 2.0; starSize = intensity * 3.5; }
            else if (age < 150.0) { intensity = 1.0 + Math.sin(t * 5 + i) * 0.15; starSize = 1.5; }
            else { intensity = Math.max(0, 1.0 - (age - 150.0) / 30.0); starSize = intensity * 1.5; }
        }
        positions[i3] = state.pos.x; positions[i3+1] = state.pos.y; positions[i3+2] = state.pos.z;
        colors[i3] = state.color.r * intensity; colors[i3+1] = state.color.g * intensity; colors[i3+2] = state.color.b * intensity;
        sizes[i] = starSize;
    }
    this.firstStars.geometry.attributes.position.needsUpdate = true;
    this.firstStars.geometry.attributes.color.needsUpdate = true;
    (this.firstStars.geometry.attributes as any).size.needsUpdate = true;
  }

  destroy() {
    this.cachedTextures.forEach(t => t.dispose());
    this.scene.clear();
  }
}
