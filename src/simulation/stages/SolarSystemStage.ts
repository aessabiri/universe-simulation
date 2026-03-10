import * as THREE from 'three';
import { Stage } from '../Stage';
import { TextureUtils } from '../TextureUtils';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';

interface MoonData {
  name: string;
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
  composition: string;
  temperature: string;
  atmosphere: string;
}

export class SolarSystemStage extends Stage {
  private sun: THREE.Mesh | null = null;
  private planetMeshes: THREE.Group[] = [];
  private planetPivots: THREE.Group[] = [];
  private moonMeshes: { mesh: THREE.Mesh, pivot: THREE.Group, speed: number, distance: number }[] = [];
  private asteroidBelt: THREE.InstancedMesh | null = null;
  private kuiperBelt: THREE.InstancedMesh | null = null;
  private sunLight: THREE.PointLight | null = null;
  private dummy = new THREE.Object3D();
  private focusIndex: number | null = null;
  private targetVector = new THREE.Vector3();
  private timeUniform = { value: 0 };

  private planets: PlanetData[] = [
    { 
      name: 'Mercury', radius: 0.5, distance: 15, speed: 1.6, color: 0xffaa88, tilt: 0, 
      info: "The smallest planet and closest to the Sun.",
      composition: "70% metallic and 30% silicate material.",
      temperature: "430°C (Day), -180°C (Night)",
      atmosphere: "Thin exosphere (Oxygen, Sodium, Hydrogen)."
    },
    { 
      name: 'Venus', radius: 0.8, distance: 25, speed: 1.1, color: 0xffdd44, tilt: 0.05, 
      info: "Earth's twin in size with a runaway greenhouse effect.",
      composition: "Central iron core and rocky mantle.",
      temperature: "462°C (Average)",
      atmosphere: "96% Carbon Dioxide, 3% Nitrogen."
    },
    { 
      name: 'Earth', radius: 0.9, distance: 35, speed: 1.0, color: 0x0088ff, tilt: 0.4, 
      moons: [{ name: 'Moon', radius: 0.15, distance: 1.8, speed: 2, color: 0xaaaaaa }], 
      info: "The only known planet with liquid water and life.",
      composition: "Iron core, silicate mantle and crust.",
      temperature: "15°C (Average)",
      atmosphere: "78% Nitrogen, 21% Oxygen."
    },
    { 
      name: 'Mars', radius: 0.6, distance: 45, speed: 0.8, color: 0xff4400, tilt: 0.44, 
      moons: [
        { name: 'Phobos', radius: 0.08, distance: 1.2, speed: 3, color: 0x888888 }, 
        { name: 'Deimos', radius: 0.06, distance: 1.5, speed: 2.5, color: 0x999999 }
      ], 
      info: "The Red Planet, home to the largest volcanoes in the system.",
      composition: "Silicon, oxygen, iron, and magnesium.",
      temperature: "-65°C (Average)",
      atmosphere: "95% Carbon Dioxide, 2.7% Nitrogen."
    },
    { 
      name: 'Jupiter', radius: 2.5, distance: 75, speed: 0.4, color: 0xffaa33, tilt: 0.05, 
      moons: [
        { name: 'Io', radius: 0.15, distance: 3.5, speed: 2.0, color: 0xffcc00 }, 
        { name: 'Europa', radius: 0.14, distance: 4.2, speed: 1.6, color: 0xdddddd }, 
        { name: 'Ganymede', radius: 0.22, distance: 5.2, speed: 1.2, color: 0x998877 }, 
        { name: 'Callisto', radius: 0.2, distance: 6.2, speed: 0.8, color: 0x777777 }
      ], 
      info: "The King of Planets, a gas giant with a Great Red Spot.",
      composition: "89% Hydrogen, 10% Helium.",
      temperature: "-110°C (Average)",
      atmosphere: "Hydrogen, Helium, Methane, Ammonia."
    },
    { 
      name: 'Saturn', radius: 2.2, distance: 105, speed: 0.3, color: 0xffcc88, tilt: 0.4, hasRings: true, 
      moons: [{ name: 'Titan', radius: 0.25, distance: 4.5, speed: 1.2, color: 0xffaa00 }], 
      info: "Famous for its spectacular ring system made of ice.",
      composition: "96% Hydrogen, 3% Helium.",
      temperature: "-140°C (Average)",
      atmosphere: "Hydrogen, Helium, Methane."
    },
    { 
      name: 'Uranus', radius: 1.4, distance: 140, speed: 0.2, color: 0x00ffff, tilt: 1.7, 
      info: "An ice giant that orbits the Sun on its side.",
      composition: "Ices (Water, Ammonia, Methane).",
      temperature: "-195°C (Average)",
      atmosphere: "Hydrogen, Helium, Methane."
    },
    { 
      name: 'Neptune', radius: 1.4, distance: 175, speed: 0.15, color: 0x3366ff, tilt: 0.5, 
      moons: [{ name: 'Triton', radius: 0.2, distance: 3.2, speed: 1.5, color: 0xccbb99 }], 
      info: "Known for its deep blue color and supersonic winds.",
      composition: "80% Hydrogen, 19% Helium, 1.5% Methane.",
      temperature: "-201°C (Average)",
      atmosphere: "Hydrogen, Helium, Methane."
    }
  ];

  private createPlanetTexture(color: number, type: 'rocky' | 'gas', name: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const baseColor = new THREE.Color(color);
    ctx.fillStyle = '#' + baseColor.getHexString();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (type === 'gas') {
      for (let i = 0; i < 40; i++) {
        const y = Math.random() * canvas.height;
        const h = 5 + Math.random() * 30;
        const factor = Math.random() > 0.5 ? 0.5 : 1.5;
        const shade = baseColor.clone().multiplyScalar(factor);
        ctx.fillStyle = '#' + shade.getHexString();
        ctx.globalAlpha = 0.4 + Math.random() * 0.4;
        ctx.fillRect(0, y, canvas.width, h);
      }
      if (name === 'Jupiter') {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#802000';
        ctx.beginPath(); ctx.ellipse(700, 380, 80, 45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#401000'; ctx.lineWidth = 10; ctx.stroke();
      }
    } else {
      for (let i = 0; i < 500; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = 1 + Math.random() * 10;
        const factor = Math.random() > 0.5 ? 0.4 : 1.3;
        const shade = baseColor.clone().multiplyScalar(factor);
        ctx.fillStyle = '#' + shade.getHexString();
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    return tex;
  }

  private createRingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grd = ctx.createLinearGradient(0, 0, 512, 0);
    grd.addColorStop(0, 'rgba(136, 119, 102, 0)');
    grd.addColorStop(0.2, 'rgba(136, 119, 102, 0.8)');
    grd.addColorStop(0.4, 'rgba(80, 70, 60, 0.5)');
    grd.addColorStop(0.5, 'rgba(136, 119, 102, 0.9)');
    grd.addColorStop(0.7, 'rgba(80, 70, 60, 0.4)');
    grd.addColorStop(1, 'rgba(136, 119, 102, 0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 512, 64);
    return new THREE.CanvasTexture(canvas);
  }

  init() {
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(6, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff })));
    this.sunLight = new THREE.PointLight(0xffffff, 5, 0, 0); 
    this.scene.add(this.sunLight);
    const hueSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TextureUtils.createSunHueTexture(), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
    hueSprite.scale.set(60, 60, 1);
    this.scene.add(hueSprite);
    const lensflare = new Lensflare();
    lensflare.addElement(new LensflareElement(TextureUtils.createFlareGhostTexture(), 40, 0.6, new THREE.Color(0xffccaa)));
    this.sunLight.add(lensflare);

    this.planets.forEach(p => {
      const pivot = new THREE.Group();
      this.scene.add(pivot);
      this.planetPivots.push(pivot);
      const type = (p.name === 'Jupiter' || p.name === 'Saturn' || p.name === 'Uranus' || p.name === 'Neptune') ? 'gas' : 'rocky';
      const mat = new THREE.MeshStandardMaterial({ 
        map: this.createPlanetTexture(p.color, type, p.name),
        roughness: 0.7, metalness: 0.1,
        emissive: new THREE.Color(p.color),
        emissiveIntensity: 0.02
      });
      const planetGroup = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.radius, 32, 32), mat);
      planetGroup.add(mesh);
      planetGroup.position.set(p.distance, 0, 0);
      planetGroup.rotation.z = p.tilt;
      pivot.add(planetGroup);
      this.planetMeshes.push(planetGroup);
      if (p.hasRings) {
        const rings = new THREE.Mesh(new THREE.RingGeometry(p.radius * 1.4, p.radius * 2.5, 64), new THREE.MeshStandardMaterial({ map: this.createRingTexture(), side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
        rings.rotation.x = Math.PI / 2;
        planetGroup.add(rings);
      }
      if (p.moons) {
        p.moons.forEach(m => {
          const moonPivot = new THREE.Group();
          planetGroup.add(moonPivot);
          const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(m.radius, 16, 16), new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.9 }));
          moonMesh.position.set(m.distance, 0, 0);
          moonPivot.add(moonMesh);
          this.moonMeshes.push({ mesh: moonMesh, pivot: moonPivot, speed: m.speed, distance: m.distance });
        });
      }
      const path = new THREE.Mesh(new THREE.RingGeometry(p.distance - 0.05, p.distance + 0.05, 128), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.DoubleSide }));
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
  }

  private createBelt(minR: number, maxR: number, count: number, size: number, color: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(size, 0), new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 }), count);
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
    return mesh;
  }

  private createStars() {
    const count = 7000;
    const geo = new THREE.BufferGeometry();
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
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.scene.add(new THREE.Points(geo, TextureUtils.createStarShaderMaterial(this.timeUniform)));
  }

  update(time: number, delta: number) {
    const t = time * 0.0004;
    this.timeUniform.value = time * 0.001;
    this.planetPivots.forEach((pivot, i) => pivot.rotation.y = t * this.planets[i].speed);
    this.planetMeshes.forEach(pGroup => pGroup.children[0].rotation.y += 0.002);
    this.moonMeshes.forEach(m => m.pivot.rotation.y += m.speed * 0.01);
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
      planet.updateMatrixWorld(true);
      planet.getWorldPosition(this.targetVector);
      return this.targetVector;
    }
    this.targetVector.set(0, 0, 0);
    return this.targetVector;
  }

  destroy() { this.scene.clear(); }
}
