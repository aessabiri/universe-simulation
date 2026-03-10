import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';

export class BigBangStage extends Stage {
  private particles: THREE.Points | null = null;
  private singularity: THREE.Mesh | null = null;
  private particleCount = 30000;
  private startTime: number = 0;
  private timeUniform = { value: 0 };
  private initialVelocities: Float32Array | null = null;

  init() {
    // 1. Singularity Core
    const singGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const singMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    this.singularity = new THREE.Mesh(singGeo, singMat);
    this.scene.add(this.singularity);

    // 2. Expansion Particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    this.initialVelocities = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = 0; positions[i3+1] = 0; positions[i3+2] = 0;

      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      const speed = 0.5 + Math.random() * 5.0;
      
      this.initialVelocities[i3] = Math.sin(theta) * Math.cos(phi) * speed;
      this.initialVelocities[i3+1] = Math.sin(theta) * Math.sin(phi) * speed;
      this.initialVelocities[i3+2] = Math.cos(theta) * speed;

      const color = new THREE.Color();
      const r = Math.random();
      if (r < 0.3) color.setHex(0xffffff); // Hot White
      else if (r < 0.6) color.setHex(0xffff00); // Yellow
      else color.setHex(0xff4400); // Red

      colors[i3] = color.r; colors[i3+1] = color.g; colors[i3+2] = color.b;
      sizes[i] = 1.0 + Math.random() * 3.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particles = new THREE.Points(geometry, TextureUtils.createStarShaderMaterial(this.timeUniform));
    this.scene.add(this.particles);

    TextureUtils.addCosmicBackground(this.scene, 10);
    this.startTime = performance.now();
    this.camera.position.set(0, 0, 50);
  }

  update(time: number, delta: number) {
    if (!this.particles || !this.initialVelocities) return;
    const elapsed = (time - this.startTime) * 0.001;
    this.timeUniform.value = elapsed;

    const posAttr = this.particles.geometry.attributes.position.array as Float32Array;
    
    // Inflation Logic
    let expansion;
    if (elapsed < 1.0) {
        expansion = Math.pow(elapsed * 10.0, 2.0); 
    } else {
        expansion = 100 + (elapsed - 1.0) * 10.0;
    }

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      posAttr[i3] = this.initialVelocities[i3] * expansion * 0.1;
      posAttr[i3+1] = this.initialVelocities[i3+1] * expansion * 0.1;
      posAttr[i3+2] = this.initialVelocities[i3+2] * expansion * 0.1;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    if (this.singularity) {
        if (elapsed < 0.5) {
            this.singularity.scale.setScalar(1 + elapsed * 200);
        } else {
            const op = Math.max(0, 1 - (elapsed - 0.5) * 2);
            (this.singularity.material as THREE.MeshBasicMaterial).opacity = op;
            if (op <= 0) this.singularity.visible = false;
        }
    }

    this.camera.position.z = 50 + expansion * 0.2;
    this.camera.lookAt(0, 0, 0);
  }

  destroy() { this.scene.clear(); }
}
