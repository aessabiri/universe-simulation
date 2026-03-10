import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';

export class BigBangStage extends Stage {
  private particles: THREE.Points | null = null;
  private singularity: THREE.Mesh | null = null;
  private recombinationClouds: THREE.Group = new THREE.Group();
  private whiteOut: THREE.Mesh | null = null;
  
  private particleCount = 30000;
  private startTime: number = 0;
  private timeUniform = { value: 0 };
  private initialVelocities: Float32Array | null = null;

  init() {
    // 1. THE SINGULARITY
    this.singularity = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 })
    );
    this.scene.add(this.singularity);

    // 2. RECOMBINATION CLOUDS (Massive hues after flash)
    const nebulaTex = TextureUtils.createNebulaTexture();
    const colors = [0x5511aa, 0xffaa00, 0x00aaff];
    for (let i = 0; i < 20; i++) {
        const mat = new THREE.MeshBasicMaterial({
            map: nebulaTex, color: colors[i % colors.length],
            transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), mat);
        mesh.position.set((Math.random()-0.5)*40, (Math.random()-0.5)*40, (Math.random()-0.5)*40);
        mesh.lookAt(0,0,0);
        this.recombinationClouds.add(mesh);
    }
    this.scene.add(this.recombinationClouds);

    // 3. WHITE-OUT PLANE
    this.whiteOut = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false })
    );
    this.whiteOut.position.z = 5;
    this.scene.add(this.whiteOut);

    // 4. PARTICLES
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colorsArr = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    this.initialVelocities = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      const speed = 0.5 + Math.random() * 5.0;
      this.initialVelocities[i3] = Math.sin(theta) * Math.cos(phi) * speed;
      this.initialVelocities[i3+1] = Math.sin(theta) * Math.sin(phi) * speed;
      this.initialVelocities[i3+2] = Math.cos(theta) * speed;
      
      // VIBRANT MULTI-COLOR PARTICLE SPECTRUM
      const color = new THREE.Color();
      // Use HSL for maximum vibrancy across the full spectrum
      const hue = Math.random(); // Full circle 0-1
      const saturation = 0.8 + Math.random() * 0.2; // High saturation
      const lightness = 0.5 + Math.random() * 0.3; // High brightness
      color.setHSL(hue, saturation, lightness);

      colorsArr[i3] = color.r; colorsArr[i3+1] = color.g; colorsArr[i3+2] = color.b;
      sizes[i] = 1.0 + Math.random() * 3.0;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorsArr, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particles = new THREE.Points(geometry, TextureUtils.createStarShaderMaterial(this.timeUniform));
    this.scene.add(this.particles);

    this.startTime = performance.now();
    this.camera.position.set(0, 0, 10); // Start closer
  }

  update(time: number, delta: number) {
    if (!this.particles || !this.initialVelocities) return;
    const elapsed = (time - this.startTime) * 0.001;
    this.timeUniform.value = elapsed;

    const posAttr = this.particles.geometry.attributes.position.array as Float32Array;
    let expansion;
    if (elapsed < 1.0) expansion = Math.pow(elapsed * 10.0, 2.0); 
    else expansion = 100 + (elapsed - 1.0) * 15.0;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      posAttr[i3] = this.initialVelocities[i3] * expansion * 0.1;
      posAttr[i3+1] = this.initialVelocities[i3+1] * expansion * 0.1;
      posAttr[i3+2] = this.initialVelocities[i3+2] * expansion * 0.1;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    // Singularity and Flash Logic
    if (elapsed < 0.5) {
        if(this.singularity) this.singularity.scale.setScalar(1 + elapsed * 300);
    } else {
        if(this.singularity) this.singularity.visible = false;
        // White-out flash
        const flashIntensity = Math.max(0, 1.0 - (elapsed - 0.5) * 1.5);
        if(this.whiteOut) {
            (this.whiteOut.material as THREE.MeshBasicMaterial).opacity = flashIntensity;
            this.whiteOut.position.z = this.camera.position.z - 1;
        }
    }

    // Fade in Recombination Clouds after flash
    if (elapsed > 0.8) {
        this.recombinationClouds.children.forEach((cloud, i) => {
            const m = cloud as THREE.Mesh;
            const mat = m.material as THREE.MeshBasicMaterial;
            mat.opacity = Math.min(0.15, (elapsed - 0.8) * 0.05);
            m.rotation.z += 0.001;
        });
    }

    // Camera stays inside the bubbles
    this.camera.position.z = 10 + expansion * 0.05;
  }

  destroy() { this.scene.clear(); }
}
