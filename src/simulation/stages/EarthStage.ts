import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';
import { MemoryUtils } from '../MemoryUtils';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { EarthVertexShader, EarthFragmentShader, AtmosphereVertexShader, AtmosphereFragmentShader } from '../shaders/EarthShaders';
import { CloudVertexShader, CloudFragmentShader } from '../shaders/CloudShaders';

interface Impact {
    pos: THREE.Vector3;
    intensity: number;
    startTime: number;
}

export class EarthStage extends Stage {
  private earth: THREE.Mesh | null = null;
  private clouds: THREE.Mesh | null = null;
  private atmosphere: THREE.Mesh | null = null;
  private moon: THREE.Mesh | null = null;
  private moon2: THREE.Mesh | null = null;
  private sun: THREE.Mesh | null = null;
  private stars: THREE.Points | null = null;
  
  private meteors: THREE.Mesh[] = [];

  private uniforms = {
    time: { value: 0 },
    evolution: { value: 1.0 },
    // Place sun much further away to prevent depth artifacts
    sunPosition: { value: new THREE.Vector3(1200, 600, -1800) },
    impacts: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] }
  };

  private targetEvolution = 1.0;

  init() {
    this.uniforms.evolution.value = 1.0;
    this.targetEvolution = 1.0;

    // 1. Stars and Background
    const starCount = 8000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starSiz = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 1000 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPos[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPos[i3 + 2] = radius * Math.cos(phi);
      const color = new THREE.Color().setHSL(Math.random() < 0.5 ? 0.6 : 0.1, 0.4, 0.9);
      starCol[i3] = color.r; starCol[i3+1] = color.g; starCol[i3+2] = color.b;
      starSiz[i] = 1.0 + Math.random();
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSiz, 1));
    this.stars = new THREE.Points(starGeo, TextureUtils.createStarShaderMaterial(this.uniforms.time));
    this.scene.add(this.stars);
    TextureUtils.addCosmicBackground(this.scene, 20);

    // 2. Earth (OPAQUE CORE)
    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(2, 128, 128),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: EarthVertexShader,
        fragmentShader: EarthFragmentShader,
        transparent: false,
        depthWrite: true,
        depthTest: true
      })
    );
    this.earth.rotation.y = Math.PI;
    this.scene.add(this.earth);

    // 3. Clouds (TRANSPARENT SHELL)
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(2.03, 128, 128),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: CloudVertexShader,
        fragmentShader: CloudFragmentShader,
        transparent: true,
        depthWrite: false, // Critical: don't block objects behind
        blending: THREE.NormalBlending
      })
    );
    this.scene.add(this.clouds);

    // 4. Atmosphere (TRANSPARENT GLOW)
    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.15, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: AtmosphereVertexShader,
        fragmentShader: AtmosphereFragmentShader,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false // Critical: prevent "glass" artifact blocking sun
      })
    );
    this.scene.add(this.atmosphere);

    // 5. Moons
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 }));
    this.moon.position.set(8, 0, 0);
    this.scene.add(this.moon);

    this.moon2 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 32), new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 1.0 }));
    this.moon2.position.set(-11, 2, 0);
    this.scene.add(this.moon2);

    // 6. Sun & Lensflare
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.sun.position.copy(this.uniforms.sunPosition.value);
    this.scene.add(this.sun);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.5);
    sunLight.position.copy(this.sun.position);
    this.scene.add(sunLight);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    const lensflare = new Lensflare();
    const textureMain = TextureUtils.createSunHueTexture();
    const textureGhost = TextureUtils.createFlareGhostTexture();
    
    // Lensflare elements MUST use AdditiveBlending or have perfectly clean alphas
    lensflare.addElement(new LensflareElement(textureMain, 800, 0, new THREE.Color(0xffffff)));
    lensflare.addElement(new LensflareElement(textureGhost, 60, 0.6, new THREE.Color(0xffffff)));
    lensflare.addElement(new LensflareElement(textureGhost, 70, 0.7, new THREE.Color(0xffffff)));
    lensflare.addElement(new LensflareElement(textureGhost, 120, 0.9, new THREE.Color(0xffffff)));
    
    sunLight.add(lensflare);

    this.camera.position.set(0, 0, 8);
  }

  public setEvolution(val: number) {
    this.targetEvolution = val;
  }

  public getMetrics() {
    const e = this.uniforms.evolution.value;
    if (e < 0.4) {
      return {
        phase: "Hadean Eon",
        temp: Math.round(1500 - e * 1000) + " K",
        atmo: "CO2, N2, H2O",
        o2: "0%",
        status: "Magma Ocean"
      };
    } else if (e < 0.7) {
      return {
        phase: "Archean Eon",
        temp: Math.round(350 - (e - 0.4) * 200) + " K",
        atmo: "N2, CH4, CO2",
        o2: "< 1%",
        status: "First Oceans"
      };
    } else if (e < 0.9) {
      return {
        phase: "Proterozoic Eon",
        temp: Math.round(260 + (e - 0.7) * 40) + " K",
        atmo: "N2, O2 (Rising)",
        o2: "5 - 15%",
        status: "Snowball Earth"
      };
    } else {
      return {
        phase: "Phanerozoic Eon",
        temp: "288 K",
        atmo: "N2, O2, Ar",
        o2: "21%",
        status: "Modern Life"
      };
    }
  }

  private spawnImpact(t: number) {
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const targetPos = new THREE.Vector3().setFromSphericalCoords(2, theta, phi);
    
    const meteorGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const meteorMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
    const meteor = new THREE.Mesh(meteorGeo, meteorMat);
    
    const startPos = targetPos.clone().multiplyScalar(5).applyAxisAngle(new THREE.Vector3(0,1,0), (Math.random()-0.5)*2);
    meteor.position.copy(startPos);
    this.scene.add(meteor);

    (meteor as any).targetPos = targetPos;
    (meteor as any).startPos = startPos;
    (meteor as any).birthTime = t;
    this.meteors.push(meteor);
  }

  private updateMeteors(time: number, delta: number) {
    for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        const age = time - (m as any).birthTime;
        const duration = 0.8;
        const progress = age / duration;

        if (progress >= 1.0) {
            const pos = (m as any).targetPos;
            const slot = this.uniforms.impacts.value.findIndex((v: THREE.Vector4) => v.w <= 0.01);
            if (slot !== -1) {
                this.uniforms.impacts.value[slot].set(pos.x, pos.y, pos.z, 1.0);
            }
            this.scene.remove(m);
            this.meteors.splice(i, 1);
        } else {
            m.position.lerpVectors((m as any).startPos, (m as any).targetPos, progress);
            m.scale.setScalar(1.0 + progress * 2.0);
        }
    }
  }

  update(time: number, delta: number) {
    const t = time * 0.001;
    this.uniforms.time.value = t;
    this.uniforms.evolution.value += (this.targetEvolution - this.uniforms.evolution.value) * 0.05;

    if (this.uniforms.evolution.value < 0.4) {
        if (Math.random() > 0.997) this.spawnImpact(t);
        this.updateMeteors(t, delta);
        this.uniforms.impacts.value.forEach((v: THREE.Vector4) => {
            if (v.w > 0) v.w -= delta * 0.4;
        });
    } else {
        this.uniforms.impacts.value.forEach((v: THREE.Vector4) => v.w = 0);
        this.meteors.forEach(m => this.scene.remove(m));
        this.meteors = [];
    }

    // Auto-advance evolution if we are in "fast forward" (delta is significant)
    if (delta > 0.04) {
      this.targetEvolution = Math.max(this.targetEvolution, this.uniforms.evolution.value);
      this.targetEvolution = Math.min(1.0, this.targetEvolution + delta * 0.005);
    }

    if (this.earth) this.earth.rotation.y += 0.03 * delta;
    if (this.clouds) this.clouds.rotation.y += 0.05 * delta;
    
    if (this.moon) { 
      this.moon.position.x = Math.cos(t * 0.08) * 8; 
      this.moon.position.z = Math.sin(t * 0.08) * 8; 
    }
    
    if (this.moon2) { 
      this.moon2.position.x = Math.cos(t * 0.12) * 11; 
      this.moon2.position.z = Math.sin(t * 0.12) * 11; 
      this.moon2.position.y = Math.sin(t * 0.12) * 3; 
    }
  }

  destroy() { 
    MemoryUtils.disposeObject(this.earth);
    MemoryUtils.disposeObject(this.clouds);
    MemoryUtils.disposeObject(this.atmosphere);
    MemoryUtils.disposeObject(this.moon);
    MemoryUtils.disposeObject(this.moon2);
    MemoryUtils.disposeObject(this.sun);
    MemoryUtils.disposeObject(this.stars);
    this.meteors.forEach(m => MemoryUtils.disposeObject(m));
    MemoryUtils.disposeObject(this.scene);
    
    this.earth = null;
    this.clouds = null;
    this.atmosphere = null;
    this.moon = null;
    this.moon2 = null;
    this.sun = null;
    this.stars = null;
    this.meteors = [];
    this.scene.clear(); 
  }
}
