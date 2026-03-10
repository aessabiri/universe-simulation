import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';
import { GalaxyVertexShader, GalaxyFragmentShader } from '../shaders/GalaxyShaders';

export class GalaxyStage extends Stage {
  private galaxyGroup: THREE.Group = new THREE.Group();
  private stars: THREE.Points | null = null;
  private bulge: THREE.Points | null = null;
  private dust: THREE.Points | null = null;
  private nebulae: THREE.Points | null = null;
  private timeUniform = { value: 0 };

  init() {
    this.scene.add(this.galaxyGroup);

    const config = {
      radius: 25,
      branches: 3,
      spin: 4.5, // Increased from 3.0 for much more pronounced spirals
      randomness: 0.06, // Even tighter concentration
      randomnessPower: 6.0, // Sharper arm edges
      coreRadius: 4
    };

    // 1. DISK STARS (40,000 Particles)
    const starCount = 45000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starSiz = new Float32Array(starCount);
    const starProx = new Float32Array(starCount);

    const innerCol = new THREE.Color('#ffcc88'); // Warm
    const outerCol = new THREE.Color('#88ccff'); // Hot blue

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = Math.random() * config.radius;
      const spinAngle = radius * config.spin;
      const branchAngle = ((i % config.branches) / config.branches) * Math.PI * 2;

      // Density wave math: concentrating stars near the arm centers
      const randomX = Math.pow(Math.random(), config.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * config.randomness * radius;
      const randomZ = Math.pow(Math.random(), config.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * config.randomness * radius;
      const verticalDisp = (Math.random() - 0.5) * (0.8 / (radius + 1.0));

      starPos[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
      starPos[i3 + 1] = verticalDisp;
      starPos[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

      // Color population mapping
      const mixed = innerCol.clone().lerp(outerCol, radius / config.radius);
      starCol[i3] = mixed.r; starCol[i3+1] = mixed.g; starCol[i3+2] = mixed.b;
      
      starSiz[i] = 0.4 + Math.random() * 1.2;
      starProx[i] = 1.0 - (Math.abs(randomX) + Math.abs(randomZ)) / (config.randomness * radius);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSiz, 1));
    starGeo.setAttribute('armProximity', new THREE.BufferAttribute(starProx, 1));

    this.stars = new THREE.Points(starGeo, new THREE.ShaderMaterial({
      uniforms: { time: this.timeUniform, pointTexture: { value: TextureUtils.createCircularParticleTexture() } },
      vertexShader: GalaxyVertexShader,
      fragmentShader: GalaxyFragmentShader,
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.galaxyGroup.add(this.stars);

    // 2. GALACTIC BULGE (Dense, spherical heart)
    const coreCount = 12000;
    const coreGeo = new THREE.BufferGeometry();
    const corePos = new Float32Array(coreCount * 3);
    const coreCol = new Float32Array(coreCount * 3);
    const coreSiz = new Float32Array(coreCount);
    for (let i = 0; i < coreCount; i++) {
      const i3 = i * 3;
      const r = Math.pow(Math.random(), 2.0) * config.coreRadius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      corePos[i3] = r * Math.sin(phi) * Math.cos(theta);
      corePos[i3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      corePos[i3+2] = r * Math.cos(phi);
      const c = new THREE.Color('#fff4bb').lerp(new THREE.Color('#ffaa44'), Math.random());
      coreCol[i3] = c.r; coreCol[i3+1] = c.g; coreCol[i3+2] = c.b;
      coreSiz[i] = 0.8 + Math.random() * 1.5;
    }
    coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
    coreGeo.setAttribute('color', new THREE.BufferAttribute(coreCol, 3));
    coreGeo.setAttribute('size', new THREE.BufferAttribute(coreSiz, 1));
    this.bulge = new THREE.Points(coreGeo, new THREE.ShaderMaterial({
      uniforms: { time: this.timeUniform, pointTexture: { value: TextureUtils.createCircularParticleTexture() } },
      vertexShader: GalaxyVertexShader,
      fragmentShader: GalaxyFragmentShader,
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.galaxyGroup.add(this.bulge);

    // 3. DARK DUST SCAFOLDING
    const dustCount = 15000;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const radius = Math.random() * config.radius;
      const spinAngle = radius * config.spin + 0.4; // Offset to inside of arms
      const branchAngle = ((i % config.branches) / config.branches) * Math.PI * 2;
      const rX = Math.pow(Math.random(), 3.0) * (Math.random() < 0.5 ? 1 : -1) * config.randomness * radius;
      const rZ = Math.pow(Math.random(), 3.0) * (Math.random() < 0.5 ? 1 : -1) * config.randomness * radius;
      dustPos[i3] = Math.cos(branchAngle + spinAngle) * radius + rX;
      dustPos[i3+1] = (Math.random()-0.5) * 0.2;
      dustPos[i3+2] = Math.sin(branchAngle + spinAngle) * radius + rZ;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      size: 0.12, color: '#0a0502', transparent: true, opacity: 0.4, depthWrite: false
    }));
    this.galaxyGroup.add(this.dust);

    // 4. STAR NURSERIES (Pink/Magenta pockets)
    const nurseryCount = 800;
    const nurseryGeo = new THREE.BufferGeometry();
    const nurseryPos = new Float32Array(nurseryCount * 3);
    const nurseryCol = new Float32Array(nurseryCount * 3);
    for (let i = 0; i < nurseryCount; i++) {
      const i3 = i * 3;
      const radius = 5 + Math.random() * (config.radius - 5);
      const spinAngle = radius * config.spin;
      const branchAngle = ((i % config.branches) / config.branches) * Math.PI * 2;
      nurseryPos[i3] = Math.cos(branchAngle + spinAngle) * radius + (Math.random()-0.5)*1.5;
      nurseryPos[i3+1] = (Math.random()-0.5)*0.2;
      nurseryPos[i3+2] = Math.sin(branchAngle + spinAngle) * radius + (Math.random()-0.5)*1.5;
      const c = new THREE.Color('#ff4488').lerp(new THREE.Color('#ff00ff'), Math.random());
      nurseryCol[i3] = c.r; nurseryCol[i3+1] = c.g; nurseryCol[i3+2] = c.b;
    }
    nurseryGeo.setAttribute('position', new THREE.BufferAttribute(nurseryPos, 3));
    nurseryGeo.setAttribute('color', new THREE.BufferAttribute(nurseryCol, 3));
    this.nebulae = new THREE.Points(nurseryGeo, new THREE.PointsMaterial({
      size: 0.25, vertexColors: true, map: TextureUtils.createCircularParticleTexture(),
      transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.galaxyGroup.add(this.nebulae);

    // 5. SUPERMASSIVE SINGULARITY
    const coreGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
    );
    this.galaxyGroup.add(coreGlow);

    TextureUtils.addCosmicBackground(this.scene, 60);
    this.camera.position.set(0, 20, 30);
    this.camera.lookAt(0, 0, 0);
  }

  update(time: number, delta: number) {
    const t = time * 0.001;
    this.timeUniform.value = t;
    if (this.galaxyGroup) {
      this.galaxyGroup.rotation.y = t * 0.05; // Slow majestic rotation
    }
  }

  destroy() { this.scene.clear(); }
}
