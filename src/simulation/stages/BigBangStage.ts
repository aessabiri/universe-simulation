import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';

export class BigBangStage extends Stage {
  private particles: THREE.Points | null = null;
  private phantoms: THREE.Group = new THREE.Group();
  private whiteFlash: THREE.Mesh | null = null;
  private singularityGroup: THREE.Group = new THREE.Group();
  private blackHole: THREE.Mesh | null = null;
  private eventHorizon: THREE.Mesh | null = null;
  private filaments: THREE.LineSegments | null = null;
  
  private particleCount = 45000;
  private startTime: number = 0;
  
  private PHANTOM_END = 6.0;
  private COLLAPSE_END = 10.0;
  private VOID_BREATH_END = 10.5; 
  private PLASMA_TRANSITION_START = 18.0; 
  private PLASMA_SETTLED = 25.0; 

  private uniforms = {
    time: { value: 0 },
    expansion: { value: 0 },
    plasmaMix: { value: 0 },
    pointTexture: { value: TextureUtils.createCircularParticleTexture() }
  };

  init() {
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

    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.blackHole = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), blackMat);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    this.eventHorizon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 32), horizonMat);
    this.singularityGroup.add(this.blackHole);
    this.singularityGroup.add(this.eventHorizon);
    this.scene.add(this.singularityGroup);

    this.whiteFlash = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false }));
    this.whiteFlash.position.z = 5;
    this.scene.add(this.whiteFlash);

    const geometry = new THREE.BufferGeometry();
    const posArr = new Float32Array(this.particleCount * 3);
    const sizeArr = new Float32Array(this.particleCount);
    const velArr = new Float32Array(this.particleCount * 3);
    const plasmaPosArr = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      const speed = 0.5 + Math.random() * 5.0;
      
      velArr[i3] = Math.sin(theta) * Math.cos(phi) * speed;
      velArr[i3+1] = Math.sin(theta) * Math.sin(phi) * speed;
      velArr[i3+2] = Math.cos(theta) * speed;

      // PLASMA STATE: Wide expansion (fill the universe)
      const pR = 10 + Math.random() * 40; // Expand outward
      plasmaPosArr[i3] = Math.sin(theta) * Math.cos(phi) * pR;
      plasmaPosArr[i3+1] = Math.sin(theta) * Math.sin(phi) * pR;
      plasmaPosArr[i3+2] = Math.cos(theta) * pR;

      sizeArr[i] = 0.8 + Math.random() * 2.0;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizeArr, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velArr, 3));
    geometry.setAttribute('plasmaPos', new THREE.BufferAttribute(plasmaPosArr, 3));

    this.particles = new THREE.Points(geometry, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        attribute float size;
        attribute vec3 velocity;
        attribute vec3 plasmaPos;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float expansion;
        uniform float plasmaMix;
        uniform float time;

        void main() {
          vec3 explosionPos = velocity * expansion * 0.1;
          
          // PLASMA STATE: Swirling within the expanded volume
          vec3 p = plasmaPos;
          vec3 swirl = vec3(
            p.x + sin(time * 1.2 + p.y * 0.5) * 5.0,
            p.y + cos(time * 1.2 + p.z * 0.5) * 5.0,
            p.z + sin(time * 1.2 + p.x * 0.5) * 5.0
          );

          vec3 finalPos = mix(explosionPos, swirl, plasmaMix);
          
          vec3 expColor = mix(vec3(1.0), vec3(1.0, 0.4, 0.0), clamp(expansion/200.0, 0.0, 1.0));
          vec3 plaColor = mix(vec3(0.6, 0.0, 1.0), vec3(0.0, 1.0, 1.0), sin(time + length(p)*0.1)*0.5+0.5);
          vColor = mix(expColor, plaColor, plasmaMix);

          vAlpha = mix(2.5 / (1.0 + expansion * 0.02), 0.7, plasmaMix);

          vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
          gl_PointSize = size * (mix(600.0, 400.0, plasmaMix) / -mvPosition.z);
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

    const filamentCount = 800;
    const filGeo = new THREE.BufferGeometry();
    filGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(filamentCount * 6), 3));
    this.filaments = new THREE.LineSegments(filGeo, new THREE.LineBasicMaterial({
        color: 0x00ffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.filaments);

    this.startTime = performance.now();
    this.camera.position.set(0, 0, 10);
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
        if (bangElapsed < 1.0) expansion = Math.pow(bangElapsed * 25.0, 2.0); 
        else expansion = 625.0 + (bangElapsed - 1.0) * 80.0;
        this.uniforms.expansion.value = expansion;

        let pMix = 0;
        if (totalElapsed > this.PLASMA_TRANSITION_START) {
            pMix = Math.min(1.0, (totalElapsed - this.PLASMA_TRANSITION_START) / (this.PLASMA_SETTLED - this.PLASMA_TRANSITION_START));
        }
        this.uniforms.plasmaMix.value = pMix;

        if (this.whiteFlash) {
            let flashOp = bangElapsed < 0.2 ? 1.0 : Math.max(0.4, 1.0 - (bangElapsed - 0.2) * 0.1); 
            const coolingFactor = mixValue(flashOp, 0.1, pMix);
            
            const mat = this.whiteFlash.material as THREE.MeshBasicMaterial;
            mat.opacity = coolingFactor;
            
            // NEW: Ensure the flash plane is always facing camera and large enough
            this.whiteFlash.position.copy(this.camera.position);
            this.whiteFlash.lookAt(this.camera.position.x, this.camera.position.y, this.camera.position.z - 1);
            this.whiteFlash.translateZ(-0.5); // Stay just in front of lens
            this.whiteFlash.scale.setScalar(50); // Make it massive relative to view
            
            // Hide if practically invisible to save draw calls and prevent artifacts
            this.whiteFlash.visible = coolingFactor > 0.01;
        }

        if (this.filaments) {
            (this.filaments.material as THREE.LineBasicMaterial).opacity = pMix * 0.2;
            if (pMix > 0.1 && Math.random() > 0.8) {
                const posAttr = this.particles!.geometry.attributes.position.array as Float32Array;
                const filAttr = this.filaments.geometry.attributes.position.array as Float32Array;
                for (let i = 0; i < 800; i++) {
                    const i6 = i * 6;
                    const pIdx = Math.floor(Math.random() * (this.particleCount - 1)) * 3;
                    filAttr[i6] = posAttr[pIdx]; filAttr[i6+1] = posAttr[pIdx+1]; filAttr[i6+2] = posAttr[pIdx+2];
                    filAttr[i6+3] = posAttr[pIdx] + (Math.random()-0.5)*10.0;
                    filAttr[i6+4] = posAttr[pIdx+1] + (Math.random()-0.5)*10.0;
                    filAttr[i6+5] = posAttr[pIdx+2] + (Math.random()-0.5)*10.0;
                }
                this.filaments.geometry.attributes.position.needsUpdate = true;
            }
        }

        // Keep camera immersed in the soup
        this.camera.position.z = mixValue(10 + expansion * 0.05, 12, pMix);
    }
  }

  destroy() { this.scene.clear(); }
}

function mixValue(a: number, b: number, t: number) {
    return a * (1 - t) + b * t;
}
