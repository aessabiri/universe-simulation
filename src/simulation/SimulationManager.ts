import * as THREE from 'three';
import { Stage } from './Stage';
import { BigBangStage } from './stages/BigBangStage';

export enum Epoch {
  BIG_BANG,
  PLASMA,
  GALAXY_FORMATION,
  SOLAR_SYSTEM,
  EARTH
}

export class SimulationManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private currentStage: Stage | null = null;
  private epoch: Epoch = Epoch.BIG_BANG;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => this.onWindowResize());
    
    this.setEpoch(Epoch.BIG_BANG);
  }

  public setEpoch(epoch: Epoch) {
    if (this.currentStage) {
      this.currentStage.destroy();
      this.scene.clear();
    }

    this.epoch = epoch;
    
    switch (epoch) {
      case Epoch.BIG_BANG:
        this.currentStage = new BigBangStage(this.scene, this.camera, this.container);
        break;
      // Other stages will be added here
      default:
        console.warn('Stage not implemented yet');
    }

    if (this.currentStage) {
      this.currentStage.init();
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public animate(time: number) {
    const delta = 0.016; // Simplified delta for now
    if (this.currentStage) {
      this.currentStage.update(time, delta);
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((t) => this.animate(t));
  }
}
