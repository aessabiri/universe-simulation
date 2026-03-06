import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';
import { PlasmaVertexShader, PlasmaFragmentShader } from '../shaders/PlasmaShaders';

export class PlasmaStage extends Stage {
  private particles: THREE.Points | null = null;
  private filaments: THREE.LineSegments | null = null;
  private particleCount = 25000; // Reduced density to prevent white-out
  private timeUniform = { value: 0 };
  private initialPositions: Float32Array | null = null;

  init() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    this.initialPositions = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      // MUCH LARGER SPREAD (r = 5 to 40)
      const r = 5 + Math.random() * 35; 
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3+2] = r * Math.cos(phi);
      
      this.initialPositions[i3] = positions[i3];
      this.initialPositions[i3+1] = positions[i3+1];
      this.initialPositions[i3+2] = positions[i3+2];

      const color = new THREE.Color();
      const rand = Math.random();
      // Intense but distinct colors
      if (rand < 0.4) color.setHex(0x8800ff); // Deep Purple
      else if (rand < 0.8) color.setHex(0x00ccff); // Electric Blue
      else color.setHex(0xff0066); // Hot Pink

      colors[i3] = color.r; colors[i3 + 1] = color.g; colors[i3 + 2] = color.b;
      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particles = new THREE.Points(geometry, new THREE.ShaderMaterial({
      uniforms: { time: this.timeUniform, pointTexture: { value: TextureUtils.createCircularParticleTexture() } },
      vertexShader: PlasmaVertexShader,
      fragmentShader: PlasmaFragmentShader,
      vertexColors: true, 
      transparent: true, 
      blending: THREE.AdditiveBlending, 
      depthWrite: false
    }));
    this.scene.add(this.particles);

    const filamentCount = 500;
    const filGeo = new THREE.BufferGeometry();
    filGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(filamentCount * 6), 3));
    this.filaments = new THREE.LineSegments(filGeo, new THREE.LineBasicMaterial({
        color: 0x00ffff, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.filaments);

    TextureUtils.addCosmicBackground(this.scene, 30);
    // Move camera further back to see the cloud structure
    this.camera.position.set(0, 0, 30); 
  }

  update(time: number, delta: number) {
    if (!this.particles || !this.initialPositions) return;
    const t = time * 0.001;
    this.timeUniform.value = t;
    const posAttr = this.particles.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const x = this.initialPositions[i3];
      const y = this.initialPositions[i3+1];
      const z = this.initialPositions[i3+2];
      const speed = 0.8;
      posAttr[i3] = x + Math.sin(t * speed + y) * 4.0;
      posAttr[i3+1] = y + Math.cos(t * speed + z) * 4.0;
      posAttr[i3+2] = z + Math.sin(t * speed + x) * 4.0;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    if (this.filaments && Math.random() > 0.9) {
        const filAttr = this.filaments.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < 500; i++) {
            const i6 = i * 6;
            const pIdx = Math.floor(Math.random() * (this.particleCount - 1)) * 3;
            filAttr[i6] = posAttr[pIdx]; filAttr[i6+1] = posAttr[pIdx+1]; filAttr[i6+2] = posAttr[pIdx+2];
            filAttr[i6+3] = posAttr[pIdx] + (Math.random()-0.5)*5.0;
            filAttr[i6+4] = posAttr[pIdx+1] + (Math.random()-0.5)*5.0;
            filAttr[i6+5] = posAttr[pIdx+2] + (Math.random()-0.5)*5.0;
        }
        this.filaments.geometry.attributes.position.needsUpdate = true;
    }
  }

  destroy() { this.scene.clear(); }
}
