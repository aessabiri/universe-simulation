import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';
import { MemoryUtils } from '../MemoryUtils';
import { MultiverseVertexShader, MultiverseFragmentShader } from '../shaders/BigBangShaders';

export class BigBangStage extends Stage {
  // Pre-Singularity Objects
  private multiversePlane: THREE.Mesh | null = null;
  
  // Big Bang Objects
  private particles: THREE.Points | null = null;
  private singularityDot: THREE.Mesh | null = null;
  private whiteFlash: THREE.Mesh | null = null;
  
  private particleCount = 60000;
  private startTime: number = 0;
  
  // Lifecycle Timings
  private PRE_SINGULARITY_END = 8.0;
  private COLLAPSE_START = 8.0;
  private COLLAPSE_END = 11.0;
  private DOT_STASIS_END = 12.0;
  private BIG_BANG_START = 12.0;
  private PLASMA_TRANSITION = 22.0;

  private uniforms = {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    collapseFocus: { value: 0.0 }, // Raymarching zoom parameter
    expansion: { value: 0 },
    plasmaMix: { value: 0 },
    pointTexture: { value: TextureUtils.createCircularParticleTexture() }
  };

  init() {
    this.startTime = performance.now();
    
    // 1. Raymarched Multiverse (Mandelbulb) Background
    // Using a large plane that always faces the camera
    this.multiversePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: MultiverseVertexShader,
        fragmentShader: MultiverseFragmentShader,
        depthTest: false,
        depthWrite: false
      })
    );
    // Attach to camera so it moves with it and acts as a skybox
    this.multiversePlane.position.z = -1; // 1 unit in front of camera
    this.camera.add(this.multiversePlane);
    this.scene.add(this.camera);

    // 2. The Singularity Dot
    this.singularityDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.singularityDot.visible = false;
    this.scene.add(this.singularityDot);

    // 3. White Flash (Screen-space explosion)
    this.whiteFlash = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false })
    );
    this.whiteFlash.visible = false;
    this.whiteFlash.position.z = -0.5;
    this.camera.add(this.whiteFlash);

    // 4. Particles (Big Bang Expansion)
    const geometry = new THREE.BufferGeometry();
    const posArr = new Float32Array(this.particleCount * 3);
    const sizeArr = new Float32Array(this.particleCount);
    const velArr = new Float32Array(this.particleCount * 3);
    const plasmaPosArr = new Float32Array(this.particleCount * 3);
    const colorSeedArr = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      const speed = 2.0 + Math.random() * 15.0;
      
      velArr[i3] = Math.sin(theta) * Math.cos(phi) * speed;
      velArr[i3+1] = Math.sin(theta) * Math.sin(phi) * speed;
      velArr[i3+2] = Math.cos(theta) * speed;

      const pR = 15 + Math.random() * 60;
      plasmaPosArr[i3] = Math.sin(theta) * Math.cos(phi) * pR;
      plasmaPosArr[i3+1] = Math.sin(theta) * Math.sin(phi) * pR;
      plasmaPosArr[i3+2] = Math.cos(theta) * pR;

      sizeArr[i] = 0.5 + Math.random() * 3.0;
      colorSeedArr[i] = Math.random();
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizeArr, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velArr, 3));
    geometry.setAttribute('plasmaPos', new THREE.BufferAttribute(plasmaPosArr, 3));
    geometry.setAttribute('colorSeed', new THREE.BufferAttribute(colorSeedArr, 1));

    this.particles = new THREE.Points(geometry, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        attribute float size;
        attribute vec3 velocity;
        attribute vec3 plasmaPos;
        attribute float colorSeed;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float expansion;
        uniform float plasmaMix;
        uniform float time;

        void main() {
          vec3 explosionPos = velocity * expansion * 0.1;
          vec3 swirl = vec3(
            plasmaPos.x + sin(time * 1.5 + plasmaPos.y * 0.4) * 8.0,
            plasmaPos.y + cos(time * 1.5 + plasmaPos.z * 0.4) * 8.0,
            plasmaPos.z + sin(time * 1.5 + plasmaPos.x * 0.4) * 8.0
          );

          vec3 finalPos = mix(explosionPos, swirl, plasmaMix);
          
          vec3 c1 = vec3(1.0, 0.9, 0.4);
          vec3 c2 = vec3(1.0, 0.3, 0.1);
          vec3 c3 = vec3(0.5, 0.0, 1.0);
          
          vec3 expColor = mix(c1, c2, colorSeed);
          expColor = mix(expColor, c3, clamp(expansion/100.0, 0.0, 1.0));
          
          vec3 plaColor = mix(vec3(0.1, 0.8, 1.0), vec3(0.8, 0.1, 1.0), sin(time + colorSeed * 6.28)*0.5+0.5);
          vColor = mix(expColor, plaColor, plasmaMix);

          vAlpha = mix(5.0 / (1.0 + expansion * 0.01), 0.8, plasmaMix);

          vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
          gl_PointSize = size * (mix(800.0, 400.0, plasmaMix) / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor; varying float vAlpha; uniform sampler2D pointTexture;
        void main() {
          vec4 tex = texture2D(pointTexture, gl_PointCoord);
          if (tex.a * vAlpha < 0.01) discard;
          gl_FragColor = vec4(vColor, tex.a * vAlpha);
        }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.particles.visible = false;
    this.scene.add(this.particles);

    this.camera.position.set(0, 0, 30);
    
    // Handle resize for the raymarching resolution
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    this.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  }

  update(time: number, delta: number) {
    const totalElapsed = (time - this.startTime) * 0.001;
    this.uniforms.time.value = totalElapsed;

    if (totalElapsed < this.PRE_SINGULARITY_END) {
        // 1. Multiverse Phase: Slowly drifting through the Mandelbulb
        this.uniforms.collapseFocus.value = 0.0;
        this.camera.position.z = 30; // Camera position doesn't matter much for the quad, but keeps consistency
        
    } else if (totalElapsed < this.COLLAPSE_END) {
        // 2. Collapse Phase: Zoom into a void pocket in the Multiverse
        const p = (totalElapsed - this.COLLAPSE_START) / (this.COLLAPSE_END - this.COLLAPSE_START);
        
        // Exponential zoom for dramatic effect
        this.uniforms.collapseFocus.value = Math.pow(p, 3.0); 

    } else if (totalElapsed < this.DOT_STASIS_END) {
        // 3. Stasis Phase: The dot appears
        if (this.multiversePlane) this.multiversePlane.visible = false;
        
        this.singularityDot!.visible = true;
        this.singularityDot!.scale.setScalar(0.5 + Math.sin(totalElapsed * 40.0) * 0.2); // Rapid pulsing
        this.camera.position.set(0,0,5);

    } else {
        // 4. BIG BANG EXPLOSION Phase
        const bangElapsed = totalElapsed - this.BIG_BANG_START;
        this.singularityDot!.visible = false;
        this.particles!.visible = true;

        let expansion = 0;
        if (bangElapsed < 0.1) {
            // Flash bang
            expansion = Math.pow(bangElapsed * 50.0, 3.0);
            if (this.whiteFlash) {
                this.whiteFlash.visible = true;
                (this.whiteFlash.material as THREE.MeshBasicMaterial).opacity = 1.0 - (bangElapsed / 0.1);
            }
        } else {
            // Continued expansion
            expansion = 125.0 + (bangElapsed - 0.1) * 150.0;
            if(this.whiteFlash) this.whiteFlash.visible = false;
        }
        this.uniforms.expansion.value = expansion;

        let pMix = 0;
        if (totalElapsed > this.PLASMA_TRANSITION) {
            pMix = Math.min(1.0, (totalElapsed - this.PLASMA_TRANSITION) / 5.0);
        }
        this.uniforms.plasmaMix.value = pMix;

        // Pull camera back as it expands
        this.camera.position.z = mixValue(5 + expansion * 0.02, 30, pMix);
    }
  }

  destroy() { 
    window.removeEventListener('resize', this.onResize);
    MemoryUtils.disposeObject(this.multiversePlane);
    MemoryUtils.disposeObject(this.particles);
    MemoryUtils.disposeObject(this.singularityDot);
    MemoryUtils.disposeObject(this.whiteFlash);
    MemoryUtils.disposeTexture(this.uniforms.pointTexture.value);
    
    // Clean up camera children
    if (this.multiversePlane) this.camera.remove(this.multiversePlane);
    if (this.whiteFlash) this.camera.remove(this.whiteFlash);
    this.scene.remove(this.camera); // Remove from scene if added during init

    this.scene.clear(); 
  }
}

function mixValue(a: number, b: number, t: number) {
    return a * (1 - t) + b * t;
}
