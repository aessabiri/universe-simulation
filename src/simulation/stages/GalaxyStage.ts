import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';

export class GalaxyStage extends Stage {
  private galaxyGroup: THREE.Group = new THREE.Group();
  private stars: THREE.Points | null = null;
  private core: THREE.Points | null = null;
  private nebulae: THREE.Points | null = null;
  private dust: THREE.Points | null = null;
  private timeUniform = { value: 0 };

  init() {
    this.scene.add(this.galaxyGroup);

    const parameters = {
      radius: 12,
      branches: 3,
      spin: 1.2,
      randomness: 0.25,
      randomnessPower: 3,
    };

    // 1. MAIN STAR POPULATION (Shader-based)
    const starCount = 25000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starSiz = new Float32Array(starCount);

    const colorInside = new THREE.Color('#ffcc88');
    const colorOutside = new THREE.Color('#88aaff');

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = Math.random() * parameters.radius;
      const spinAngle = radius * parameters.spin;
      const branchAngle = ((i % parameters.branches) / parameters.branches) * Math.PI * 2;
      const verticalDispersion = (Math.random() - 0.5) * (0.5 / (radius + 1)); 
      const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
      const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

      starPos[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
      starPos[i3 + 1] = verticalDispersion;
      starPos[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

      const mixedColor = colorInside.clone().lerp(colorOutside, radius / parameters.radius);
      starCol[i3] = mixedColor.r; starCol[i3 + 1] = mixedColor.g; starCol[i3 + 2] = mixedColor.b;
      starSiz[i] = 0.5 + Math.random() * 1.5;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSiz, 1));

    this.stars = new THREE.Points(starGeo, TextureUtils.createStarShaderMaterial(this.timeUniform));
    this.galaxyGroup.add(this.stars);

    // 2. GALACTIC CORE (Shader-based)
    const coreCount = 8000;
    const coreGeo = new THREE.BufferGeometry();
    const corePos = new Float32Array(coreCount * 3);
    const coreCol = new Float32Array(coreCount * 3);
    const coreSiz = new Float32Array(coreCount);
    for (let i = 0; i < coreCount; i++) {
      const i3 = i * 3;
      const r = Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      corePos[i3] = r * Math.sin(phi) * Math.cos(theta);
      corePos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      corePos[i3 + 2] = r * Math.cos(phi);
      const c = new THREE.Color('#fff0aa').lerp(new THREE.Color('#ffaa44'), Math.random());
      coreCol[i3] = c.r; coreCol[i3+1] = c.g; coreCol[i3+2] = c.b;
      coreSiz[i] = 1.0 + Math.random();
    }
    coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
    coreGeo.setAttribute('color', new THREE.BufferAttribute(coreCol, 3));
    coreGeo.setAttribute('size', new THREE.BufferAttribute(coreSiz, 1));
    this.core = new THREE.Points(coreGeo, TextureUtils.createStarShaderMaterial(this.timeUniform));
    this.galaxyGroup.add(this.core);

    // 3. NEBULAE & DUST (Basic materials)
    const nurseryCount = 1000;
    const nurseryGeo = new THREE.BufferGeometry();
    const nurseryPos = new Float32Array(nurseryCount * 3);
    const nurseryCol = new Float32Array(nurseryCount * 3);
    for (let i = 0; i < nurseryCount; i++) {
      const i3 = i * 3;
      const radius = 2 + Math.random() * (parameters.radius - 2);
      const spinAngle = radius * parameters.spin;
      const branchAngle = ((i % parameters.branches) / parameters.branches) * Math.PI * 2;
      nurseryPos[i3] = Math.cos(branchAngle + spinAngle) * radius + (Math.random()-0.5)*0.5;
      nurseryPos[i3 + 1] = (Math.random()-0.5)*0.1;
      nurseryPos[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + (Math.random()-0.5)*0.5;
      const color = Math.random() > 0.5 ? new THREE.Color('#ff44aa') : new THREE.Color('#44aaff');
      nurseryCol[i3] = color.r; nurseryCol[i3+1] = color.g; nurseryCol[i3+2] = color.b;
    }
    nurseryGeo.setAttribute('position', new THREE.BufferAttribute(nurseryPos, 3));
    nurseryGeo.setAttribute('color', new THREE.BufferAttribute(nurseryCol, 3));
    this.nebulae = new THREE.Points(nurseryGeo, new THREE.PointsMaterial({
      size: 0.2, vertexColors: true, map: TextureUtils.createCircularParticleTexture(),
      transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.galaxyGroup.add(this.nebulae);

    const dustCount = 10000;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const radius = 2 + Math.random() * (parameters.radius - 1);
      const spinAngle = radius * parameters.spin + 0.3;
      const branchAngle = ((i % parameters.branches) / parameters.branches) * Math.PI * 2;
      dustPos[i3] = Math.cos(branchAngle + spinAngle) * radius + (Math.random()-0.5)*0.4;
      dustPos[i3 + 1] = (Math.random()-0.5)*0.05;
      dustPos[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + (Math.random()-0.5)*0.4;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      size: 0.15, color: '#110a05', transparent: true, opacity: 0.4, depthWrite: false
    }));
    this.galaxyGroup.add(this.dust);

    this.createDistantGalaxies();
    TextureUtils.addCosmicBackground(this.scene, 50);

    this.camera.position.set(0, 10, 15);
    this.camera.lookAt(0, 0, 0);
  }

  private createDistantGalaxies() {
    const distantCount = 50;
    for (let i = 0; i < distantCount; i++) {
      const radius = 200 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const posX = radius * Math.sin(phi) * Math.cos(theta);
      const posY = radius * Math.sin(phi) * Math.sin(theta);
      const posZ = radius * Math.cos(phi);

      const miniGeo = new THREE.BufferGeometry();
      const miniCount = 400;
      const miniPos = new Float32Array(miniCount * 3);
      const miniCol = new Float32Array(miniCount * 3);
      const miniSiz = new Float32Array(miniCount);
      const miniSize = 2 + Math.random() * 5;
      const miniColor = new THREE.Color().setHSL(Math.random(), 0.5, 0.7);

      for (let j = 0; j < miniCount; j++) {
        const j3 = j * 3;
        const r = Math.random() * miniSize;
        const angle = r * 1.5 + (j % 2) * Math.PI;
        miniPos[j3] = Math.cos(angle) * r;
        miniPos[j3 + 1] = (Math.random()-0.5) * 0.1;
        miniPos[j3 + 2] = Math.sin(angle) * r;
        miniCol[j3] = miniColor.r; miniCol[j3+1] = miniColor.g; miniCol[j3+2] = miniColor.b;
        miniSiz[j] = 0.5;
      }
      miniGeo.setAttribute('position', new THREE.BufferAttribute(miniPos, 3));
      miniGeo.setAttribute('color', new THREE.BufferAttribute(miniCol, 3));
      miniGeo.setAttribute('size', new THREE.BufferAttribute(miniSiz, 1));
      
      const miniPoints = new THREE.Points(miniGeo, TextureUtils.createStarShaderMaterial(this.timeUniform));
      miniPoints.position.set(posX, posY, posZ);
      miniPoints.lookAt(0, 0, 0);
      this.scene.add(miniPoints);
    }
  }

  update(time: number, delta: number) {
    this.timeUniform.value = time * 0.001;
    if (this.galaxyGroup) {
      this.galaxyGroup.rotation.y += 0.0005;
    }
  }

  destroy() {
    this.scene.clear();
  }
}
