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
}

export class SolarSystemStage extends Stage {
  private sun: THREE.Mesh | null = null;
  private planetMeshes: THREE.Group[] = [];
  private planetPivots: THREE.Group[] = [];
  private moonMeshes: { mesh: THREE.Mesh, pivot: THREE.Group, speed: number, distance: number }[] = [];
  private asteroidBelt: THREE.Points | null = null;
  private kuiperBelt: THREE.Points | null = null;

  private planets: PlanetData[] = [
    { name: 'Mercury', radius: 0.3, distance: 15, speed: 1.6, color: 0x888888, tilt: 0 },
    { name: 'Venus', radius: 0.5, distance: 25, speed: 1.1, color: 0xe3bb76, tilt: 0.05 },
    { name: 'Earth', radius: 0.55, distance: 35, speed: 1.0, color: 0x2233ff, tilt: 0.4, moons: [{ radius: 0.12, distance: 1.4, speed: 2, color: 0xaaaaaa }] },
    { name: 'Mars', radius: 0.4, distance: 45, speed: 0.8, color: 0xc1440e, tilt: 0.44, moons: [{ radius: 0.08, distance: 1.0, speed: 3, color: 0x888888 }] },
    { name: 'Jupiter', radius: 1.8, distance: 75, speed: 0.4, color: 0xd8ca9d, tilt: 0.05, moons: [{ radius: 0.15, distance: 2.8, speed: 1.5, color: 0xccbb99 }] },
    { name: 'Saturn', radius: 1.6, distance: 105, speed: 0.3, color: 0xead6b8, tilt: 0.4, hasRings: true },
    { name: 'Uranus', radius: 1.0, distance: 140, speed: 0.2, color: 0xd1e7e7, tilt: 1.7 },
    { name: 'Neptune', radius: 1.0, distance: 175, speed: 0.15, color: 0x3f54ba, tilt: 0.5 }
  ];

  private createPlanetTexture(color: number, type: 'rocky' | 'gas' | 'venus'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const baseColor = new THREE.Color(color);
    ctx.fillStyle = '#' + baseColor.getHexString();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (type === 'gas') {
      // Banded pattern
      for (let i = 0; i < 15; i++) {
        const y = Math.random() * canvas.height;
        const h = 5 + Math.random() * 20;
        const shade = baseColor.clone().multiplyScalar(0.7 + Math.random() * 0.6);
        ctx.fillStyle = '#' + shade.getHexString();
        ctx.globalAlpha = 0.4;
        ctx.fillRect(0, y, canvas.width, h);
      }
    } else if (type === 'rocky') {
      // Craters / Spots
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
    // 1. Sun & Hue & Lens Flare
    const sunGeo = new THREE.SphereGeometry(6, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sun);

    // Revert to original beautiful Sprite Hue
    const hueSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TextureUtils.createSunHueTexture(),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    }));
    hueSprite.scale.set(60, 60, 1);
    this.sun.add(hueSprite);

    // Sun Lighting
    const sunLight = new THREE.PointLight(0xffffff, 8, 500);
    this.sun.add(sunLight);

    // Clean Lens Flare (Removing the large 0-distance element to prevent double circle)
    const lensflare = new Lensflare();
    const ghostTexture = TextureUtils.createFlareGhostTexture();
    lensflare.addElement(new LensflareElement(ghostTexture, 40, 0.6, new THREE.Color(0xffccaa)));
    lensflare.addElement(new LensflareElement(ghostTexture, 60, 0.7));
    sunLight.add(lensflare);

    // 2. Planets
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
        emissiveIntensity: 0.05 // Subtle glow so they are never pitch black
      });
      
      const planetGroup = new THREE.Group();
      const mesh = new THREE.Mesh(geo, mat);
      planetGroup.add(mesh);
      planetGroup.position.set(p.distance, 0, 0);
      planetGroup.rotation.z = p.tilt;
      pivot.add(planetGroup);
      this.planetMeshes.push(planetGroup);

      // Saturn's Rings
      if (p.hasRings) {
        const ringGeo = new THREE.RingGeometry(p.radius * 1.4, p.radius * 2.2, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x887766,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
          emissive: 0x443322,
          emissiveIntensity: 0.1
        });
        const rings = new THREE.Mesh(ringGeo, ringMat);
        rings.rotation.x = Math.PI / 2;
        planetGroup.add(rings);
      }

      // Moons
      if (p.moons) {
        p.moons.forEach(m => {
          const moonPivot = new THREE.Group();
          planetGroup.add(moonPivot);
          const moonMesh = new THREE.Mesh(
            new THREE.SphereGeometry(m.radius, 16, 16),
            new THREE.MeshStandardMaterial({ 
              color: m.color, 
              roughness: 0.9,
              emissive: new THREE.Color(m.color),
              emissiveIntensity: 0.05
            })
          );
          moonMesh.position.set(m.distance, 0, 0);
          moonPivot.add(moonMesh);
          this.moonMeshes.push({ mesh: moonMesh, pivot: moonPivot, speed: m.speed, distance: m.distance });
        });
      }

      // Orbital Path
      const pathGeo = new THREE.RingGeometry(p.distance - 0.05, p.distance + 0.05, 128);
      const pathMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
      const path = new THREE.Mesh(pathGeo, pathMat);
      path.rotation.x = Math.PI / 2;
      this.scene.add(path);
    });

    // 3. Belts
    this.asteroidBelt = this.createBelt(55, 62, 4000, 0.08, 0x888888);
    this.scene.add(this.asteroidBelt);
    this.kuiperBelt = this.createBelt(210, 260, 8000, 0.15, 0xaaaaaa);
    this.scene.add(this.kuiperBelt);

    TextureUtils.addNebula(this.scene, 30);
    this.createStars();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.05));
    this.camera.position.set(0, 100, 250);
    this.camera.lookAt(0, 0, 0);
  }

  private createBelt(minR: number, maxR: number, count: number, size: number, color: number): THREE.Points {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = minR + Math.random() * (maxR - minR);
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      pos[i * 3 + 2] = Math.sin(theta) * r;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ size, color, transparent: true, opacity: 0.5 }));
  }

  private createStars() {
    const starGeo = new THREE.BufferGeometry();
    const count = 7000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 400 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.0, color: 0xffffff, transparent: true, opacity: 0.8, map: TextureUtils.createCircularParticleTexture(), alphaTest: 0.01 })));
  }

  update(time: number, delta: number) {
    const t = time * 0.0004;
    this.planetPivots.forEach((pivot, i) => {
      pivot.rotation.y = t * this.planets[i].speed;
    });
    this.planetMeshes.forEach(pGroup => {
      pGroup.children[0].rotation.y += 0.005;
    });
    this.moonMeshes.forEach(m => {
      m.pivot.rotation.y += m.speed * 0.01;
    });
    if (this.asteroidBelt) this.asteroidBelt.rotation.y += 0.00008;
    if (this.kuiperBelt) this.kuiperBelt.rotation.y += 0.00003;
  }

  destroy() {
    this.scene.clear();
  }
}
