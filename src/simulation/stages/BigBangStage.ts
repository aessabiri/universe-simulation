import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';

export class BigBangStage extends Stage {
  private particles: THREE.Points | null = null;
  private particleCount = 10000;
  private startTime: number = 0;
  private timeUniform = { value: 0 };

  init() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      const color = new THREE.Color();
      const r = Math.random();
      if (r < 0.25) color.setHex(0xffaa33);
      else if (r < 0.5) color.setHex(0xffcc66);
      else if (r < 0.75) color.setHex(0x66ccff);
      else color.setHex(0xffffff);
      colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
      sizes[i] = 1.0 + Math.random() * 2.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particles = new THREE.Points(geometry, TextureUtils.createStarShaderMaterial(this.timeUniform));
    this.scene.add(this.particles);
    TextureUtils.addCosmicBackground(this.scene, 15);
    this.startTime = performance.now();
  }

  update(time: number, delta: number) {
    if (!this.particles) return;
    this.timeUniform.value = time * 0.001;
    const elapsed = (time - this.startTime) * 0.001;
    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const angle1 = (i / this.particleCount) * Math.PI * 2;
      const angle2 = Math.acos(2 * ((i * 1.5) % this.particleCount) / this.particleCount - 1);
      const speed = (1 + Math.sin(i * 0.1)) * 3;
      const r = elapsed * speed;
      positions[i3] = r * Math.sin(angle2) * Math.cos(angle1);
      positions[i3 + 1] = r * Math.sin(angle2) * Math.sin(angle1);
      positions[i3 + 2] = r * Math.cos(angle2);
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.camera.position.z = 10 + elapsed * 2;
  }

  destroy() {
    this.scene.clear();
  }
}
