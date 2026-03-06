import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';

interface MoonData {
  radius: number;
  distance: number;
  speed: number;
  color: number;
}

interface PlanetData {
  name: string;
  radius: number;
  distance: number;
  speed: number;
  color: number;
  tilt: number;
  hasRings?: boolean;
  moons?: MoonData[];
  info: string;
}

export class SolarSystemStage extends Stage {
  private sun: THREE.Mesh | null = null;
  private planetMeshes: THREE.Group[] = [];
  private planetPivots: THREE.Group[] = [];
  private moonMeshes: { mesh: THREE.Mesh, pivot: THREE.Group, speed: number, distance: number }[] = [];
  private asteroidBelt: THREE.InstancedMesh | null = null;
  private kuiperBelt: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  private focusIndex: number | null = null;
  private targetVector = new THREE.Vector3();
  private timeUniform = { value: 0 };

  private planets: PlanetData[] = [
    { name: 'Mercury', radius: 0.3, distance: 15, speed: 1.6, color: 0x888888, tilt: 0, info: "Smallest planet, closest to the Sun. Surface is covered in craters." },
    { name: 'Venus', radius: 0.5, distance: 25, speed: 1.1, color: 0xe3bb76, tilt: 0.05, info: "Earth's twin in size, with a thick, toxic atmosphere that traps heat." },
    { name: 'Earth', radius: 0.55, distance: 35, speed: 1.0, color: 0x2233ff, tilt: 0.4, moons: [{ radius: 0.12, distance: 1.4, speed: 2, color: 0xaaaaaa }], info: "The only known planet with liquid water and life." },
    { name: 'Mars', radius: 0.4, distance: 45, speed: 0.8, color: 0xc1440e, tilt: 0.44, moons: [{ radius: 0.08, distance: 1.0, speed: 3, color: 0x888888 }], info: "The Red Planet. Home to massive volcanoes and desert-like landscapes." },
    { name: 'Jupiter', radius: 1.8, distance: 75, speed: 0.4, color: 0xd8ca9d, tilt: 0.05, moons: [{ radius: 0.15, distance: 2.8, speed: 1.5, color: 0xccbb99 }], info: "Largest planet in the solar system. A gas giant with dozens of moons." },
    { name: 'Saturn', radius: 1.6, distance: 105, speed: 0.3, color: 0xead6b8, tilt: 0.4, hasRings: true, info: "Famous for its stunning ring system made of ice and rock." },
    { name: 'Uranus', radius: 1.0, distance: 140, speed: 0.2, color: 0xd1e7e7, tilt: 1.7, info: "An ice giant that orbits the Sun on its side." },
    { name: 'Neptune', radius: 1.0, distance: 175, speed: 0.15, color: 0x3f54ba, tilt: 0.5, info: "The most distant planet, known for its deep blue color and supersonic winds." }
  ];

  private createPlanetTexture(color: number, type: 'rocky' | 'gas' | 'venus'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const baseColor = new THREE.Color(color);
    ctx.fillStyle = '#' + baseColor.getHexString();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (type === 'gas') {
      for (let i = 0; i < 15; i++) {
        const y = Math.random() * canvas.height;
        const h = 5 + Math.random() * 20;
        const shade = baseColor.clone().multiplyScalar(0.7 + Math.random() * 0.6);
        ctx.fillStyle = '#' + shade.getHexString();
        ctx.globalAlpha = 0.4;
        ctx.fillRect(0, y, canvas.width, h);
      }
    } else if (type === 'rocky') {
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = 1 + Math.random() * 10;
        const shade = baseColor.clone().multiplyScalar(0.5 + Math.random() * 0.5);
        ctx.fillStyle = '#' + shade.getHexString();
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    return new THREE.CanvasTexture(canvas);
  }

  init() {
    const sunGeo = new THREE.SphereGeometry(6, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sun);

    const hueSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TextureUtils.createSunHueTexture(),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    }));
    hueSprite.scale.set(60, 60, 1);
    this.sun.add(hueSprite);

    const sunLight = new THREE.PointLight(0xffffff, 8, 500);
    this.sun.add(sunLight);

    const lensflare = new Lensflare();
    const ghostTexture = TextureUtils.createFlareGhostTexture();
    lensflare.addElement(new LensflareElement(ghostTexture, 40, 0.6, new THREE.Color(0xffccaa)));
    lensflare.addElement(new LensflareElement(ghostTexture, 60, 0.7));
    sunLight.add(lensflare);

    this.planets.forEach(p => {
      const pivot = new THREE.Group();
      this.scene.add(pivot);
      this.planetPivots.push(pivot);

      const type = (p.name === 'Jupiter' || p.name === 'Saturn' || p.name === 'Uranus' || p.name === 'Neptune') ? 'gas' : 'rocky';
      const geo = new THREE.SphereGeometry(p.radius, 32, 32);
      const mat = new THREE.MeshStandardMaterial({ 
        map: this.createPlanetTexture(p.color, type),
        roughness: 0.8,
        metalness: 0.1,
        emissive: new THREE.Color(p.color),
        emissiveIntensity: 0.05
      });
      
      const planetGroup = new THREE.Group();
      const mesh = new THREE.Mesh(geo, mat);
      planetGroup.add(mesh);
      planetGroup.position.set(p.distance, 0, 0);
      planetGroup.rotation.z = p.tilt;
      pivot.add(planetGroup);
      this.planetMeshes.push(planetGroup);

      if (p.hasRings) {
        const ringGeo = new THREE.RingGeometry(p.radius * 1.4, p.radius * 2.2, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x887766, side: THREE.DoubleSide, transparent: true, opacity: 0.6,
          emissive: 0x443322, emissiveIntensity: 0.1
        });
        const rings = new THREE.Mesh(ringGeo, ringMat);
        rings.rotation.x = Math.PI / 2;
        planetGroup.add(rings);
      }

      if (p.moons) {
        p.moons.forEach(m => {
          const moonPivot = new THREE.Group();
          planetGroup.add(moonPivot);
          const moonMesh = new THREE.Mesh(
            new THREE.SphereGeometry(m.radius, 16, 16),
            new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.9, emissive: new THREE.Color(m.color), emissiveIntensity: 0.05 })
          );
          moonMesh.position.set(m.distance, 0, 0);
          moonPivot.add(moonMesh);
          this.moonMeshes.push({ mesh: moonMesh, pivot: moonPivot, speed: m.speed, distance: m.distance });
        });
      }

      const pathGeo = new THREE.RingGeometry(p.distance - 0.05, p.distance + 0.05, 128);
      const pathMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
      const path = new THREE.Mesh(pathGeo, pathMat);
      path.rotation.x = Math.PI / 2;
      this.scene.add(path);
    });

    this.asteroidBelt = this.createBelt(55, 62, 4000, 0.08, 0x888888);
    this.scene.add(this.asteroidBelt);
    this.kuiperBelt = this.createBelt(210, 260, 8000, 0.15, 0xaaaaaa);
    this.scene.add(this.kuiperBelt);

    TextureUtils.addCosmicBackground(this.scene, 30);
    this.createStars();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.05));
    this.camera.position.set(0, 100, 250);
    this.camera.lookAt(0, 0, 0);
  }

  private createBelt(minR: number, maxR: number, count: number, size: number, color: number): THREE.InstancedMesh {
    const geometry = new THREE.DodecahedronGeometry(size, 0);
    const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.9, metalness: 0.1, emissive: color, emissiveIntensity: 0.05 });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    for (let i = 0; i < count; i++) {
      const r = minR + Math.random() * (maxR - minR);
      const theta = Math.random() * Math.PI * 2;
      this.dummy.position.set(Math.cos(theta) * r, (Math.random() - 0.5) * (size * 10), Math.sin(theta) * r);
      this.dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const scale = 0.5 + Math.random() * 1.5;
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  private createStars() {
    const starGeo = new THREE.BufferGeometry();
    const count = 7000;
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 400 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = 1.0 + Math.random();
      const col = new THREE.Color(0xffffff);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const starMesh = new THREE.Points(starGeo, TextureUtils.createStarShaderMaterial(this.timeUniform));
    this.scene.add(starMesh);
  }

  update(time: number, delta: number) {
    const t = time * 0.0004;
    this.timeUniform.value = time * 0.001;
    this.planetPivots.forEach((pivot, i) => {
      pivot.rotation.y = t * this.planets[i].speed;
    });
    this.planetMeshes.forEach(pGroup => {
      pGroup.children[0].rotation.y += 0.002; // Reduced from 0.005 for slower rotation
    });
    this.moonMeshes.forEach(m => {
      m.pivot.rotation.y += m.speed * 0.01;
    });
    if (this.asteroidBelt) this.asteroidBelt.rotation.y += 0.00008;
    if (this.kuiperBelt) this.kuiperBelt.rotation.y += 0.00003;
  }

  public setFocusIndex(index: number | null) {
    this.focusIndex = index;
    if (index === null) this.targetVector.set(0, 0, 0);
  }

  public getFocusTarget(): THREE.Vector3 | null {
    if (this.focusIndex !== null && this.planetMeshes[this.focusIndex]) {
      const planet = this.planetMeshes[this.focusIndex].children[0];
      planet.updateMatrixWorld(true); // Force update to get current orbital position
      planet.getWorldPosition(this.targetVector);
      return this.targetVector;
    }
    this.targetVector.set(0, 0, 0);
    return this.targetVector;
  }

  destroy() {
    this.scene.clear();
  }
}
