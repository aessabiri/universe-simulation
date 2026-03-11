import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';
import { MemoryUtils } from '../MemoryUtils';
import { 
  MultiverseVertexShader, MultiverseFragmentShader,
  RadianceVertexShader, RadianceFragmentShader 
} from '../shaders/BigBangShaders';

export class BigBangStage extends Stage {
  // Pre-Singularity Objects
  private multiversePlane: THREE.Mesh | null = null;
  private radiancePlane: THREE.Mesh | null = null;
  
  // Big Bang Objects
  private particles: THREE.Points | null = null;
  private singularityDot: THREE.Mesh | null = null;
  private whiteFlash: THREE.Mesh | null = null;
  
  private particleCount = 60000;
  private startTime: number = 0;
  
  // Revised Lifecycle Timings
  private MULTIVERSE_END = 8.0;         // Drifting ends
  private COLLAPSE_END = 11.0;          // Zoom into void ends
  private RADIANCE_END = 15.0;          // Super Radiance fractals end
  private DOT_STASIS_END = 16.5;        // Small dot "waiting"
  private BIG_BANG_START = 16.5;        // BOOM!
  private PLASMA_TRANSITION = 26.5;     // Cooling

  private uniforms = {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    collapseFocus: { value: 0.0 }, 
    radianceIntensity: { value: 0.0 }, 
    expansion: { value: 0 },
    plasmaMix: { value: 0 },
    pointTexture: { value: TextureUtils.createCircularParticleTexture() }
  };

  init() {
    this.startTime = performance.now();
    
    // 1. Multiverse (Mandelbulb) Background
    this.multiversePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: {
          time: this.uniforms.time,
          resolution: this.uniforms.resolution,
          collapseFocus: this.uniforms.collapseFocus
        },
        vertexShader: MultiverseVertexShader,
        fragmentShader: MultiverseFragmentShader,
        depthTest: false,
        depthWrite: false,
        transparent: true
      })
    );
    this.multiversePlane.position.z = -1; 
    this.camera.add(this.multiversePlane);
    this.scene.add(this.camera);

    // 2. Super Radiance (Kaleidoscopic Symmetrical Fractal)
    this.radiancePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                intensity: this.uniforms.radianceIntensity
            },
            vertexShader: RadianceVertexShader,
            fragmentShader: RadianceFragmentShader,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            blending: THREE.AdditiveBlending
        })
    );
    this.radiancePlane.position.z = -0.6; // In front of Multiverse
    this.radiancePlane.visible = false;
    this.camera.add(this.radiancePlane);

    // 3. The Singularity Dot
    this.singularityDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.singularityDot.visible = false;
    this.scene.add(this.singularityDot);

    // 4. White Flash
    this.whiteFlash = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false })
    );
    this.whiteFlash.visible = false;
    this.whiteFlash.position.z = -0.5;
    this.camera.add(this.whiteFlash);

    // 5. Particles
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
      const speed = 2.0 + Math.random() * 18.0; // Slightly wilder
      
      velArr[i3] = Math.sin(theta) * Math.cos(phi) * speed;
      velArr[i3+1] = Math.sin(theta) * Math.sin(phi) * speed;
      velArr[i3+2] = Math.cos(theta) * speed;

      const pR = 15 + Math.random() * 60;
      plasmaPosArr[i3] = Math.sin(theta) * Math.cos(phi) * pR;
      plasmaPosArr[i3+1] = Math.sin(theta) * Math.sin(phi) * pR;
      plasmaPosArr[i3+2] = Math.cos(theta) * pR;

      sizeArr[i] = 0.5 + Math.random() * 3.5;
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
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    this.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  }

  update(time: number, delta: number) {
    const totalElapsed = (time - this.startTime) * 0.001;
    this.uniforms.time.value = totalElapsed;

    if (totalElapsed < this.MULTIVERSE_END) {
        // 1. Multiverse Phase
        this.uniforms.collapseFocus.value = 0.0;
        
    } else if (totalElapsed < this.COLLAPSE_END) {
        // 2. Multiverse Zoom
        const p = (totalElapsed - this.MULTIVERSE_END) / (this.COLLAPSE_END - this.MULTIVERSE_END);
        this.uniforms.collapseFocus.value = Math.pow(p, 3.0); 

    } else if (totalElapsed < this.RADIANCE_END) {
        // 3. Super Radiance Fractal Phase
        if (this.multiversePlane) this.multiversePlane.visible = false;
        if (this.radiancePlane) {
            this.radiancePlane.visible = true;
            // Pulse intensity up and down
            const p = (totalElapsed - this.COLLAPSE_END) / (this.RADIANCE_END - this.COLLAPSE_END);
            this.uniforms.radianceIntensity.value = Math.sin(p * Math.PI) * 1.5;
        }

    } else if (totalElapsed < this.DOT_STASIS_END) {
        // 4. Stasis (Dot)
        if (this.radiancePlane) this.radiancePlane.visible = false;
        
        this.singularityDot!.visible = true;
        this.singularityDot!.scale.setScalar(0.5 + Math.sin(totalElapsed * 40.0) * 0.2);
        this.camera.position.set(0,0,5);

    } else {
        // 5. BIG BANG Phase
        const bangElapsed = totalElapsed - this.BIG_BANG_START;
        this.singularityDot!.visible = false;
        this.particles!.visible = true;

        let expansion = 0;
        if (bangElapsed < 0.1) {
            expansion = Math.pow(bangElapsed * 50.0, 3.0);
            if (this.whiteFlash) {
                this.whiteFlash.visible = true;
                (this.whiteFlash.material as THREE.MeshBasicMaterial).opacity = 1.0 - (bangElapsed / 0.1);
            }
        } else {
            expansion = 125.0 + (bangElapsed - 0.1) * 150.0;
            if(this.whiteFlash) this.whiteFlash.visible = false;
        }
        this.uniforms.expansion.value = expansion;

        let pMix = 0;
        if (totalElapsed > this.PLASMA_TRANSITION) {
            pMix = Math.min(1.0, (totalElapsed - this.PLASMA_TRANSITION) / 5.0);
        }
        this.uniforms.plasmaMix.value = pMix;

        this.camera.position.z = mixValue(5 + expansion * 0.02, 30, pMix);
    }
  }

  destroy() { 
    window.removeEventListener('resize', this.onResize);
    MemoryUtils.disposeObject(this.multiversePlane);
    MemoryUtils.disposeObject(this.radiancePlane);
    MemoryUtils.disposeObject(this.particles);
    MemoryUtils.disposeObject(this.singularityDot);
    MemoryUtils.disposeObject(this.whiteFlash);
    MemoryUtils.disposeTexture(this.uniforms.pointTexture.value);
    
    if (this.multiversePlane) this.camera.remove(this.multiversePlane);
    if (this.radiancePlane) this.camera.remove(this.radiancePlane);
    if (this.whiteFlash) this.camera.remove(this.whiteFlash);
    this.scene.remove(this.camera);

    this.scene.clear(); 
  }
}

function mixValue(a: number, b: number, t: number) {
    return a * (1 - t) + b * t;
}
