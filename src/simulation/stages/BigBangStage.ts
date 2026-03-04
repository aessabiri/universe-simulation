import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';

export class BigBangStage extends Stage {
  private particles: THREE.Points | null = null;
  private phantoms: THREE.Group = new THREE.Group();
  private interference: THREE.Points | null = null;
  private whiteFlash: THREE.Mesh | null = null;
  
  // THE NEW SINGULARITY
  private singularityGroup: THREE.Group = new THREE.Group();
  private blackHole: THREE.Mesh | null = null;
  private eventHorizon: THREE.Mesh | null = null;
  
  private particleCount = 45000;
  private startTime: number = 0;
  
  private PHANTOM_END = 6.0;
  private INTERFERENCE_END = 9.0;
  private COLLAPSE_END = 11.5;
  private VOID_BREATH_END = 12.0; 
  
  private uniforms = {
    time: { value: 0 },
    expansion: { value: 0 },
    pointTexture: { value: TextureUtils.createCircularParticleTexture() }
  };

  init() {
    // 1. PHANTOMS (Unchanged)
    const smearTex = TextureUtils.createSmearedTexture();
    for (let i = 0; i < 30; i++) {
      const mat = new THREE.SpriteMaterial({
        map: smearTex, color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set((Math.random()-0.5)*40, (Math.random()-0.5)*40, (Math.random()-0.5)*20);
      sprite.scale.set(10 + Math.random()*20, 2 + Math.random()*5, 1);
      this.phantoms.add(sprite);
    }
    this.scene.add(this.phantoms);

    // 2. THE NEW GRAVITATIONAL SINGULARITY
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.blackHole = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), blackMat);
    
    const horizonMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending 
    });
    this.eventHorizon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 32), horizonMat);
    
    this.singularityGroup.add(this.blackHole);
    this.singularityGroup.add(this.eventHorizon);
    this.scene.add(this.singularityGroup);

    // 3. THE OPAQUE WHITE HUE (Fullscreen)
    const flashMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false
    });
    this.whiteFlash = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), flashMat);
    this.whiteFlash.position.z = 5;
    this.scene.add(this.whiteFlash);

    // 4. MAIN PARTICLES (The "Primordial Dots")
    const geometry = new THREE.BufferGeometry();
    const posArr = new Float32Array(this.particleCount * 3);
    const sizeArr = new Float32Array(this.particleCount);
    const velArr = new Float32Array(this.particleCount);
    for (let i = 0; i < this.particleCount; i++) {
      velArr[i] = 0.8 + Math.random() * 6.0; // FASTER WEEZING
      sizeArr[i] = 0.5 + Math.random() * 1.5;
      const i3 = i * 3;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      posArr[i3] = Math.sin(theta) * Math.cos(phi) * 0.01;
      posArr[i3+1] = Math.sin(theta) * Math.sin(phi) * 0.01;
      posArr[i3+2] = Math.cos(theta) * 0.01;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizeArr, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velArr, 1));

    this.particles = new THREE.Points(geometry, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        attribute float size; attribute float velocity; varying vec3 vColor; varying float vAlpha; uniform float expansion; uniform float time;
        void main() {
          float d = expansion * velocity;
          
          // Opaque era colors: High energy white/blue dots
          if (d < 100.0) vColor = mix(vec3(1.0, 1.0, 1.0), vec3(0.6, 0.8, 1.0), d/100.0);
          else vColor = mix(vec3(0.6, 0.8, 1.0), vec3(0.8, 0.1, 0.0), (d-100.0)/200.0);
          
          vAlpha = (expansion < 0.1) ? 0.0 : 3.0 / (1.0 + d * 0.02); // Brighter dots for longer

          vec3 dir = normalize(position + vec3(0.0001));
          // Faster, tighter ripples for "weezing" effect
          float ripple = sin(d * 0.5 - time * 10.0) * 1.0;
          vec4 mvPosition = modelViewMatrix * vec4(dir * (d + ripple), 1.0);
          gl_PointSize = size * (600.0 / -mvPosition.z);
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
    this.scene.add(this.particles);

    this.startTime = performance.now();
    this.camera.position.set(0, 0, 50);
  }

  update(time: number, delta: number) {
    const totalElapsed = (time - this.startTime) * 0.001;
    this.uniforms.time.value = totalElapsed;

    if (totalElapsed < this.PHANTOM_END) {
        const p = totalElapsed / this.PHANTOM_END;
        this.phantoms.children.forEach((phantom, i) => {
            const s = phantom as THREE.Sprite;
            s.material.opacity = Math.sin(totalElapsed * 2.0 + i) * p * 0.5;
        });
        this.camera.position.z = 50 - p * 10.0;

    } else if (totalElapsed < this.COLLAPSE_END) {
        const p = (totalElapsed - this.PHANTOM_END) / (this.COLLAPSE_END - this.PHANTOM_END);
        
        this.phantoms.children.forEach((phantom) => {
            const s = phantom as THREE.Sprite;
            s.position.multiplyScalar(0.85);
            s.material.opacity = (1.0 - p) * 0.8;
        });
        
        if (this.singularityGroup) {
            this.singularityGroup.visible = true;
            // The black hole scales up, event horizon glows blindingly
            const s = 0.5 + Math.pow(p, 5.0) * 50.0;
            this.singularityGroup.scale.setScalar(s);
            (this.eventHorizon!.material as THREE.MeshBasicMaterial).opacity = p;
        }
        this.camera.position.z = 40 - p * 30.0;

    } else if (totalElapsed < this.VOID_BREATH_END) {
        this.phantoms.visible = false;
        if(this.singularityGroup) this.singularityGroup.visible = false;
        
    } else {
        const bangElapsed = totalElapsed - this.VOID_BREATH_END;
        let expansion;
        if (bangElapsed < 1.0) {
            expansion = Math.pow(bangElapsed * 25.0, 2.0); // Faster expansion
        } else {
            expansion = 625.0 + (bangElapsed - 1.0) * 80.0;
        }
        this.uniforms.expansion.value = expansion;

        if (this.whiteFlash) {
            // Keep the opaque white hue but keep it brighter
            let flashOp = bangElapsed < 0.2 ? 1.0 : Math.max(0.5, 1.0 - (bangElapsed - 0.2) * 0.1); 
            (this.whiteFlash.material as THREE.MeshBasicMaterial).opacity = flashOp;
            this.whiteFlash.position.z = this.camera.position.z - 1;
        }
        this.camera.fov = 75;
        this.camera.updateProjectionMatrix();
        if (bangElapsed < 3.0) {
            this.camera.position.x = (Math.random() - 0.5) * (3.0 - bangElapsed) * 10.0;
            this.camera.position.y = (Math.random() - 0.5) * (3.0 - bangElapsed) * 10.0;
        }
        this.camera.position.z = 10 + expansion * 0.45;
    }
    this.camera.lookAt(0, 0, 0);
  }

  destroy() { this.scene.clear(); }
}
