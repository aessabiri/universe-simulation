import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';

export class PlasmaStage extends Stage {
  private particles: THREE.Points | null = null;
  private particleCount = 15000;

  init() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 12;
      positions[i3 + 1] = (Math.random() - 0.5) * 12;
      positions[i3 + 2] = (Math.random() - 0.5) * 12;

      const color = new THREE.Color();
      const rand = Math.random();
      if (rand < 0.33) color.setHex(0xff00ff);
      else if (rand < 0.66) color.setHex(0x00ffff);
      else color.setHex(0xffaa00);

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      map: TextureUtils.createCircularParticleTexture(),
      blending: THREE.AdditiveBlending,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
    TextureUtils.addNebula(this.scene, 20);
    this.camera.position.z = 8;
  }

  update(time: number, delta: number) {
    if (!this.particles) return;

    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const t = time * 0.002;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      positions[i3] += Math.sin(t + i) * 0.03;
      positions[i3 + 1] += Math.cos(t * 0.8 + i) * 0.03;
      positions[i3 + 2] += Math.sin(t * 1.2 + i) * 0.03;
      
      if (Math.abs(positions[i3]) > 8) positions[i3] *= 0.95;
      if (Math.abs(positions[i3+1]) > 8) positions[i3+1] *= 0.95;
      if (Math.abs(positions[i3+2]) > 8) positions[i3+2] *= 0.95;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.rotation.y += 0.003;
  }

  destroy() {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }
  }
}
