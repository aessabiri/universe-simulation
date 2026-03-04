import * as THREE from 'three';
import { StarVertexShader, StarFragmentShader } from './shaders/StarShaders';

export class TextureUtils {
  static createCircularParticleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  static createNebulaTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(0.4, 'rgba(100, 150, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }

  static createStarShaderMaterial(time: { value: number }): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: time,
        pointTexture: { value: this.createCircularParticleTexture() }
      },
      vertexShader: StarVertexShader,
      fragmentShader: StarFragmentShader,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  static addCosmicBackground(scene: THREE.Scene, count: number = 40): void {
    const nebulaTexture = this.createNebulaTexture();
    const colors = [0x221144, 0x112244, 0x052233, 0x1a0522];
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({
        map: nebulaTexture, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide
      });
      const size = 300 + Math.random() * 600;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
      const radius = 600 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      mesh.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi));
      mesh.lookAt(0, 0, 0);
      mesh.material.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
      scene.add(mesh);
    }
    
    // Distant Galaxy Clusters
    const clusterCount = 1000;
    const clusterGeo = new THREE.BufferGeometry();
    const clusterPos = new Float32Array(clusterCount * 3);
    const clusterCol = new Float32Array(clusterCount * 3);
    for (let i = 0; i < clusterCount; i++) {
      const radius = 500 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      clusterPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      clusterPos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      clusterPos[i * 3 + 2] = radius * Math.cos(phi);
      const color = new THREE.Color().setHSL(Math.random(), 0.3, 0.7);
      clusterCol[i * 3] = color.r; clusterCol[i * 3 + 1] = color.g; clusterCol[i * 3 + 2] = color.b;
    }
    clusterGeo.setAttribute('position', new THREE.BufferAttribute(clusterPos, 3));
    clusterGeo.setAttribute('color', new THREE.BufferAttribute(clusterCol, 3));
    scene.add(new THREE.Points(clusterGeo, new THREE.PointsMaterial({ size: 1.5, vertexColors: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })));
  }

  // Common Flare and Sun Textures
  static createFlareGhostTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = 64 + Math.cos(angle) * 45;
      const y = 64 + Math.sin(angle) * 45;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  }

  static createSunHueTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.1, 'rgba(255, 255, 200, 0.8)');
    gradient.addColorStop(0.3, 'rgba(255, 180, 50, 0.4)');
    gradient.addColorStop(0.6, 'rgba(255, 80, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(canvas);
  }

  static createSmearedTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 256);
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.translate(128, 128);
    ctx.rotate(0.5);
    ctx.scale(1.0, 0.2); 
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  }
}
