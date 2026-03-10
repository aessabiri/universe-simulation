import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Stage } from './Stage';
import { BigBangStage } from './stages/BigBangStage';
import { PlasmaStage } from './stages/PlasmaStage';
import { StellarDawnStage } from './stages/StellarDawnStage';
import { GalaxyStage } from './stages/GalaxyStage';
import { SolarSystemStage } from './stages/SolarSystemStage';
import { EarthStage } from './stages/EarthStage';
import { AudioManager } from './AudioManager';
import { MemoryUtils } from './MemoryUtils';

export enum Epoch {
  BIG_BANG,
  PLASMA,
  STELLAR_DAWN,
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
  private bloomPass: UnrealBloomPass;
  private currentStage: Stage | null = null;
  private epoch: Epoch = Epoch.BIG_BANG;
  private container: HTMLElement;
  private audio = new AudioManager();
  private onUpdateCallback: ((time: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    this.camera.position.set(0, 5, 10);

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      powerPreference: "high-performance" 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.container.appendChild(this.renderer.domElement);

    const renderScene = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8, 0.4, 0.85
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(this.bloomPass);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    window.addEventListener('resize', () => this.onWindowResize());
    
    this.setEpoch(Epoch.BIG_BANG);
  }

  public initAudio() {
    this.audio.init();
  }

  public setEpoch(epoch: Epoch) {
    if (this.currentStage) {
      this.currentStage.destroy();
      MemoryUtils.disposeObject(this.scene);
      this.scene.clear();
      this.scene.background = new THREE.Color(0x000000);
    }

    this.epoch = epoch;
    this.controls.reset();
    this.controls.target.set(0, 0, 0);
    
    switch (epoch) {
      case Epoch.BIG_BANG:
        this.controls.minDistance = 2;
        this.controls.maxDistance = 30;
        this.currentStage = new BigBangStage(this.scene, this.camera, this.container);
        break;
      case Epoch.PLASMA:
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 15;
        this.currentStage = new PlasmaStage(this.scene, this.camera, this.container);
        break;
      case Epoch.STELLAR_DAWN:
        this.controls.minDistance = 1;
        this.controls.maxDistance = 500;
        this.currentStage = new StellarDawnStage(this.scene, this.camera, this.container);
        break;
      case Epoch.GALAXY_FORMATION:
        this.controls.minDistance = 12;
        this.controls.maxDistance = 500;
        this.currentStage = new GalaxyStage(this.scene, this.camera, this.container);
        break;
      case Epoch.SOLAR_SYSTEM:
        this.controls.minDistance = 10;
        this.controls.maxDistance = 600;
        this.currentStage = new SolarSystemStage(this.scene, this.camera, this.container);
        break;
      case Epoch.EARTH:
        this.controls.minDistance = 3;
        this.controls.maxDistance = 500;
        this.currentStage = new EarthStage(this.scene, this.camera, this.container);
        break;
    }

    if (this.currentStage) {
      this.currentStage.init();
    }
  }

  /**
   * Returns scientific metrics for the current cosmic epoch.
   */
  public getEpochData() {
    switch (this.epoch) {
      case Epoch.BIG_BANG:
        return {
          title: "The Big Bang",
          time: "0 - 10^-32 seconds",
          temp: "10^27 K",
          density: "Infinite",
          info: "The universe begins as a singularity and undergoes rapid inflation."
        };
      case Epoch.PLASMA:
        return {
          title: "Quark-Gluon Plasma",
          time: "1 microsecond",
          temp: "10^12 K",
          density: "10^18 kg/m³",
          info: "A hot, dense soup of quarks and gluons. Light cannot yet travel freely."
        };
      case Epoch.STELLAR_DAWN:
        return {
          title: "Stellar Dawn",
          time: "100 Million Years",
          temp: "20 K",
          density: "1 atom/cm³",
          info: "Gravity pulls hydrogen into the first stars, ending the Cosmic Dark Ages."
        };
      case Epoch.GALAXY_FORMATION:
        return {
          title: "Galaxy Formation",
          time: "500 Million Years",
          temp: "2.7 K (CMB)",
          density: "Varies",
          info: "Massive structures of stars and dark matter collapse into spiral and elliptical galaxies."
        };
      case Epoch.SOLAR_SYSTEM:
        return {
          title: "Solar System",
          time: "9 Billion Years",
          temp: "Varies",
          density: "Nebular",
          info: "A local cloud of dust and gas collapses to form our Sun and protoplanetary disk."
        };
      case Epoch.EARTH:
        return {
          title: "Evolution of Earth",
          time: "13.8 Billion Years",
          temp: "288 K (Avg)",
          density: "5,514 kg/m³",
          info: "A terrestrial planet undergoes cooling, bombardment, and the emergence of life."
        };
      default:
        return null;
    }
  }

  public setBloomEnabled(enabled: boolean) {
    this.bloomPass.enabled = enabled;
  }

  public setBloomIntensity(val: number) {
    this.bloomPass.strength = val;
  }

  public setHighPerformanceMode(enabled: boolean) {
    const ratio = enabled ? 1 : Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(ratio);
    this.composer.setPixelRatio(ratio);
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  public getCurrentStage(): Stage | null {
    return this.currentStage;
  }

  public getProjectedPosition(worldVector: THREE.Vector3): { x: number, y: number } {
    const vector = worldVector.clone();
    vector.project(this.camera);
    return {
      x: (vector.x * 0.5 + 0.5) * window.innerWidth,
      y: (-(vector.y * 0.5) + 0.5) * window.innerHeight
    };
  }

  public onUpdate(cb: (time: number) => void) {
    this.onUpdateCallback = cb;
  }

  public animate(time: number) {
    if (this.currentStage) {
      this.currentStage.update(time, 0.016);
      const target = this.currentStage.getFocusTarget();
      if (target) {
        this.controls.target.lerp(target, 0.1);
      } else {
        this.controls.target.set(0, 0, 0);
      }
    }
    this.controls.update();
    this.composer.render();
    this.audio.setIntensity(this.epoch / 6.0);

    if (this.onUpdateCallback) {
      this.onUpdateCallback(time);
    }

    requestAnimationFrame((t) => this.animate(t));
  }

  public focusOnIndex(index: number | null) {
    if (this.currentStage && 'setFocusIndex' in this.currentStage) {
      (this.currentStage as any).setFocusIndex(index);
    }
  }

  public setEarthStage(val: number) {
    if (this.currentStage && this.currentStage instanceof EarthStage) {
      this.currentStage.setEvolution(val);
    }
  }
}
