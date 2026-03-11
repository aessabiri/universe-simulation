import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';
import { MemoryUtils } from '../MemoryUtils';
import { 
    AbstractVoidVertexShader, AbstractVoidFragmentShader,
    MultiverseVertexShader, MultiverseFragmentShader,
    BeaconVertexShader, BeaconFragmentShader,
    PrimalCoreVertexShader, PrimalCoreFragmentShader
} from '../shaders/BigBangShaders';

export class BigBangStage extends Stage {
  // Objects
  private voidSkybox: THREE.Mesh | null = null;
  private multiverseSphere: THREE.Mesh | null = null;
  private primalCore: THREE.Mesh | null = null;
  private beacon: THREE.Mesh | null = null;
  private singularityDot: THREE.Mesh | null = null;
  private whiteFlash: THREE.Mesh | null = null;
  private particles: THREE.Points | null = null;

  // State
  private isSearching = true;
  private isActivating = false;
  private activationTime = 0;
  private discoveryFactor = 0;
  private startTime = 0;
  private eventStartTime = 0;
  private particleCount = 60000;

  // Controls
  private mouse = new THREE.Vector2();
  private keys: Record<string, boolean> = {};
  private velocity = new THREE.Vector3();
  private moveSpeed = 80.0;
  private friction = 0.94;

  private uniforms = {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    collapseFocus: { value: 0.0 },
    vortexStrength: { value: 0.0 },
    discoveryFactor: { value: 0.0 },
    beaconIntensity: { value: 0.0 },
    coreIntensity: { value: 0.0 },
    expansion: { value: 0 },
    plasmaMix: { value: 0 },
    pointTexture: { value: TextureUtils.createCircularParticleTexture() }
  };

  init() {
    this.startTime = performance.now();
    
    // 1. Abstract Void
    this.voidSkybox = new THREE.Mesh(
        new THREE.SphereGeometry(500, 32, 32),
        new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: AbstractVoidVertexShader,
            fragmentShader: AbstractVoidFragmentShader,
            side: THREE.BackSide
        })
    );
    this.scene.add(this.voidSkybox);

    // 2. Multiverse Sphere
    this.multiverseSphere = new THREE.Mesh(
        new THREE.SphereGeometry(20, 64, 64),
        new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: MultiverseVertexShader,
            fragmentShader: MultiverseFragmentShader,
            transparent: true,
            depthWrite: false
        })
    );
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(2 * Math.random() - 1);
    this.multiverseSphere.position.setFromSphericalCoords(120, theta, phi);
    this.scene.add(this.multiverseSphere);

    // 3. Primal Core (Inside the sphere)
    this.primalCore = new THREE.Mesh(
        new THREE.IcosahedronGeometry(2, 4),
        new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                intensity: this.uniforms.coreIntensity
            },
            vertexShader: PrimalCoreVertexShader,
            fragmentShader: PrimalCoreFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending
        })
    );
    this.primalCore.position.copy(this.multiverseSphere.position);
    this.scene.add(this.primalCore);

    // 4. Guidance Beacon
    const beaconGeo = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
    beaconGeo.rotateX(Math.PI * 0.5);
    beaconGeo.translate(0, 0, -1);
    this.beacon = new THREE.Mesh(
        beaconGeo,
        new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                intensity: this.uniforms.beaconIntensity
            },
            vertexShader: BeaconVertexShader,
            fragmentShader: BeaconFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false
        })
    );
    this.camera.add(this.beacon);
    this.scene.add(this.camera);

    // 5. Singularity Dot
    this.singularityDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.singularityDot.visible = false;
    this.scene.add(this.singularityDot);

    // 6. White Flash
    this.whiteFlash = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false })
    );
    this.whiteFlash.visible = false;
    this.whiteFlash.position.z = -0.5;
    this.camera.add(this.whiteFlash);

    // 7. Particles
    const geometry = new THREE.BufferGeometry();
    const posArr = new Float32Array(this.particleCount * 3);
    const sizeArr = new Float32Array(this.particleCount);
    const velArr = new Float32Array(this.particleCount * 3);
    const plasmaPosArr = new Float32Array(this.particleCount * 3);
    const colorSeedArr = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const phiP = Math.random() * Math.PI * 2;
      const thetaP = Math.acos(2 * Math.random() - 1);
      const speed = 2.0 + Math.random() * 18.0;
      velArr[i3] = Math.sin(thetaP) * Math.cos(phiP) * speed;
      velArr[i3+1] = Math.sin(thetaP) * Math.sin(phiP) * speed;
      velArr[i3+2] = Math.cos(thetaP) * speed;
      const pR = 15 + Math.random() * 60;
      plasmaPosArr[i3] = Math.sin(thetaP) * Math.cos(phiP) * pR;
      plasmaPosArr[i3+1] = Math.sin(thetaP) * Math.sin(phiP) * pR;
      plasmaPosArr[i3+2] = Math.cos(thetaP) * pR;
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

    this.camera.position.set(0, 0, 0);
    this.camera.rotation.set(0, 0, 0, 'YXZ');

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isSearching) return;
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  private onKeyDown = (e: KeyboardEvent) => { this.keys[e.code.toLowerCase()] = true; };
  private onKeyUp = (e: KeyboardEvent) => { this.keys[e.code.toLowerCase()] = false; };
  private onResize = () => { this.uniforms.resolution.value.set(window.innerWidth, window.innerHeight); };

  update(time: number, delta: number) {
    this.uniforms.time.value = time * 0.001;

    if (this.isSearching) {
        // 1. ROTATION
        const targetPitch = this.mouse.y * Math.PI * 0.45;
        const targetYaw = -this.mouse.x * Math.PI;
        this.camera.rotation.x += (targetPitch - this.camera.rotation.x) * 0.1;
        this.camera.rotation.y += (targetYaw - this.camera.rotation.y) * 0.1;

        // 2. MOVEMENT
        const accel = new THREE.Vector3();
        if (this.keys['keyw'] || this.keys['arrowup']) accel.z -= 1;
        if (this.keys['keys'] || this.keys['arrowdown']) accel.z += 1;
        if (this.keys['keya'] || this.keys['arrowleft']) accel.x -= 1;
        if (this.keys['keyd'] || this.keys['arrowright']) accel.x += 1;
        
        if (accel.lengthSq() > 0) {
            accel.normalize().multiplyScalar(this.moveSpeed * delta);
            accel.applyQuaternion(this.camera.quaternion);
            this.velocity.add(accel);
        }
        this.velocity.multiplyScalar(this.friction);
        this.camera.position.add(this.velocity);

        // 3. GUIDANCE & DISCOVERY
        const spherePos = this.multiverseSphere!.position;
        const dirToSphere = spherePos.clone().sub(this.camera.position).normalize();
        this.beacon!.lookAt(spherePos);
        
        const viewDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const dot = viewDir.dot(dirToSphere);
        const dist = this.camera.position.distanceTo(spherePos);

        this.uniforms.beaconIntensity.value = 0.8;

        // Reveal fractal and core
        if (dot > 0.9) {
            this.discoveryFactor += delta * 0.5;
        } else {
            this.discoveryFactor = Math.max(0, this.discoveryFactor - delta * 0.2);
        }
        this.uniforms.discoveryFactor.value = this.discoveryFactor;
        this.uniforms.coreIntensity.value = this.discoveryFactor;

        // NEW LOGIC: Reach the core and stay for 1 second
        if (dist < 8) {
            if (!this.isActivating) {
                this.isActivating = true;
                this.activationTime = time;
            } else if ((time - this.activationTime) > 1000) {
                // ACTIVATED!
                this.isSearching = false;
                this.eventStartTime = time;
                this.beacon!.visible = false;
            }
        } else {
            this.isActivating = false;
        }
    } else {
        // CINEMATIC TRANSITION
        const elapsed = (time - this.eventStartTime) * 0.001;
        if (elapsed < 4.0) {
            const p = elapsed / 4.0;
            this.uniforms.vortexStrength.value = p;
            this.uniforms.collapseFocus.value = Math.pow(p, 2.0);
            this.uniforms.coreIntensity.value = 1.0 + p * 5.0; // Intensify core before it becomes the dot
            this.camera.position.lerp(this.multiverseSphere!.position, 0.05);
        } else if (elapsed < 5.5) {
            if (this.multiverseSphere) this.multiverseSphere.visible = false;
            if (this.primalCore) this.primalCore.visible = false;
            if (this.voidSkybox) this.voidSkybox.visible = false;
            
            this.singularityDot!.visible = true;
            this.singularityDot!.position.copy(this.camera.position).add(new THREE.Vector3(0,0,-10).applyQuaternion(this.camera.quaternion));
            this.singularityDot!.scale.setScalar(0.5 + Math.sin(elapsed * 40.0) * 0.2);
        } else {
            const bangElapsed = elapsed - 5.5;
            this.singularityDot!.visible = false;
            this.particles!.visible = true;
            this.particles!.position.copy(this.singularityDot!.position);
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
            if (bangElapsed > 10.0) pMix = Math.min(1.0, (bangElapsed - 10.0) / 5.0);
            this.uniforms.plasmaMix.value = pMix;
        }
    }
  }

  destroy() { 
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    MemoryUtils.disposeObject(this.voidSkybox);
    MemoryUtils.disposeObject(this.multiverseSphere);
    MemoryUtils.disposeObject(this.primalCore);
    MemoryUtils.disposeObject(this.beacon);
    MemoryUtils.disposeObject(this.particles);
    MemoryUtils.disposeObject(this.singularityDot);
    MemoryUtils.disposeObject(this.whiteFlash);
    MemoryUtils.disposeTexture(this.uniforms.pointTexture.value);
    if (this.whiteFlash) this.camera.remove(this.whiteFlash);
    if (this.beacon) this.camera.remove(this.beacon);
    this.scene.clear(); 
  }
}
