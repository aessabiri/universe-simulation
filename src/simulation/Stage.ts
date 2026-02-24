import * as THREE from 'three';

export abstract class Stage {
  protected scene: THREE.Scene;
  protected camera: THREE.PerspectiveCamera;
  protected container: HTMLElement;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, container: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.container = container;
  }

  abstract init(): void;
  abstract update(time: number, delta: number): void;
  abstract destroy(): void;
}
