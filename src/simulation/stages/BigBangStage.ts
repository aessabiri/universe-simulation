import * as THREE from 'three';
import { Stage } from '../Stage';

export class BigBangStage extends Stage {
  private particles: THREE.Points | null = null;
  private particleCount = 10000;
  private startTime: number = 0;

  init() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      // Start all at the origin
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      const color = new THREE.Color();
      color.setHSL(Math.random() * 0.1 + 0.05, 1.0, 0.5); // Yellowish/Reddish
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
    this.startTime = performance.now();
  }

  update(time: number, delta: number) {
    if (!this.particles) return;

    const elapsed = (time - this.startTime) * 0.001;
    const positions = this.particles.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      // Simple radial expansion
      const angle1 = (i / this.particleCount) * Math.PI * 2;
      const angle2 = Math.acos(2 * Math.random() - 1);
      
      const speed = (1 + Math.sin(i)) * 2;
      const r = elapsed * speed;

      positions[i3] = r * Math.sin(angle2) * Math.cos(angle1);
      positions[i3 + 1] = r * Math.sin(angle2) * Math.sin(angle1);
      positions[i3 + 2] = r * Math.cos(angle2);
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    
    // Move camera back as the universe expands
    this.camera.position.z = 5 + elapsed * 2;
  }

  destroy() {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }
  }
}
