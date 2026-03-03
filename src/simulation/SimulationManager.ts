import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Stage } from './Stage';
import { BigBangStage } from './stages/BigBangStage';
import { PlasmaStage } from './stages/PlasmaStage';
import { GalaxyStage } from './stages/GalaxyStage';
import { SolarSystemStage } from './stages/SolarSystemStage';
import { EarthStage } from './stages/EarthStage';

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
  private controls: OrbitControls;
  private composer: EffectComposer;
  private currentStage: Stage | null = null;
  private epoch: Epoch = Epoch.BIG_BANG;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 5, 10);

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: false, // Turn off native antialiasing for postprocessing
      powerPreference: "high-performance" 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.container.appendChild(this.renderer.domElement);

    // Post-processing
    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,  // strength
      0.4,  // radius
      0.85  // threshold
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 4;   // Don't go inside Earth
    this.controls.maxDistance = 50;  // Stay within Earth/Moon system

    window.addEventListener('resize', () => this.onWindowResize());
    
    this.setEpoch(Epoch.BIG_BANG);
  }

  public setEpoch(epoch: Epoch) {
    if (this.currentStage) {
      this.currentStage.destroy();
      this.scene.clear();
    }

    this.epoch = epoch;
    this.controls.reset();
    
    switch (epoch) {
      case Epoch.BIG_BANG:
        this.controls.minDistance = 2;
        this.controls.maxDistance = 100;
        this.currentStage = new BigBangStage(this.scene, this.camera, this.container);
        break;
      case Epoch.PLASMA:
        this.controls.minDistance = 2;
        this.controls.maxDistance = 100;
        this.currentStage = new PlasmaStage(this.scene, this.camera, this.container);
        break;
      case Epoch.GALAXY_FORMATION:
        this.controls.minDistance = 5;
        this.controls.maxDistance = 100; // Restrict zoom out to keep background distant
        this.currentStage = new GalaxyStage(this.scene, this.camera, this.container);
        break;
      case Epoch.SOLAR_SYSTEM:
        this.controls.minDistance = 20; // Restrict zoom in
        this.controls.maxDistance = 1000; // Allow more zoom out
        this.currentStage = new SolarSystemStage(this.scene, this.camera, this.container);
        break;
      case Epoch.EARTH:
        this.controls.minDistance = 4;
        this.controls.maxDistance = 100;
        this.currentStage = new EarthStage(this.scene, this.camera, this.container);
        break;
    }

    if (this.currentStage) {
      this.currentStage.init();
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  public animate(time: number) {
    if (this.currentStage) {
      this.currentStage.update(time, 0.016);
    }
    this.controls.update();
    this.composer.render();
    requestAnimationFrame((t) => this.animate(t));
  }
}
