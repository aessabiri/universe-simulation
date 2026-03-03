import * as THREE from 'three';
import { Stage } from '../Stage';

export class SolarSystemStage extends Stage {
  private sun: THREE.Mesh | null = null;
  private planets: THREE.Group = new THREE.Group();
  private disk: THREE.Mesh | null = null;

  init() {
    // Sun
    const sunGeo = new THREE.SphereGeometry(1, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sun);

    // Sun glow
    const light = new THREE.PointLight(0xffffff, 2, 20);
    this.scene.add(light);

    // Protoplanetary Disk
    const diskGeo = new THREE.TorusGeometry(4, 1.5, 2, 100);
    const diskMat = new THREE.MeshStandardMaterial({ 
      color: 0x443322, 
      transparent: true, 
      opacity: 0.3,
      wireframe: true 
    });
    this.disk = new THREE.Mesh(diskGeo, diskMat);
    this.disk.rotation.x = Math.PI / 2;
    this.scene.add(this.disk);

    // Some protoplanets
    for (let i = 0; i < 5; i++) {
      const pGeo = new THREE.SphereGeometry(0.1 + Math.random() * 0.2, 16, 16);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
      const planet = new THREE.Mesh(pGeo, pMat);
      
      const angle = (i / 5) * Math.PI * 2;
      const dist = 2 + i * 0.8;
      planet.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      this.planets.add(planet);
    }
    this.scene.add(this.planets);

    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);
  }

  update(time: number, delta: number) {
    const t = time * 0.001;
    if (this.planets) {
      this.planets.children.forEach((p: THREE.Object3D, i: number) => {
        const speed = 0.5 / (i + 1);
        const dist = 2 + i * 0.8;
        const angle = t * speed + (i / 5) * Math.PI * 2;
        p.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      });
    }
    if (this.disk) this.disk.rotation.z += 0.005;
  }

  destroy() {
    this.scene.remove(this.sun!);
    this.scene.remove(this.planets);
    this.scene.remove(this.disk!);
  }
}
