import * as THREE from 'three';

/**
 * Utility class for managing Three.js GPU memory disposal.
 * Essential for maintaining performance during stage transitions in a single-page simulation.
 */
export class MemoryUtils {
  /**
   * Recursively disposes of an object and all its children, including geometries, 
   * materials, and textures.
   */
  public static disposeObject(obj: THREE.Object3D | null) {
    if (!obj) return;

    // Recursive call for children
    while (obj.children.length > 0) {
      this.disposeObject(obj.children[0]);
      obj.remove(obj.children[0]);
    }

    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points || obj instanceof THREE.Sprite) {
      if (obj.geometry) {
        obj.geometry.dispose();
      }

      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(mat => this.disposeMaterial(mat));
        } else {
          this.disposeMaterial(obj.material);
        }
      }
    }

    // Explicitly handle other types of objects that might hold resources
    if (obj instanceof THREE.Group) {
      // Group itself doesn't have geometry/material, handled by children recursion
    }
  }

  /**
   * Safely disposes of a material and its associated textures.
   */
  private static disposeMaterial(material: THREE.Material) {
    material.dispose();

    // Iterate through all properties of the material to find textures
    for (const key in material) {
      const value = (material as any)[key];
      if (value && value instanceof THREE.Texture) {
        value.dispose();
      }
    }

    // Handle ShaderMaterial uniforms
    if (material instanceof THREE.ShaderMaterial && material.uniforms) {
      for (const key in material.uniforms) {
        const uniform = material.uniforms[key];
        if (uniform && uniform.value && uniform.value instanceof THREE.Texture) {
          uniform.value.dispose();
        }
        if (Array.isArray(uniform.value)) {
          uniform.value.forEach((v: any) => {
            if (v instanceof THREE.Texture) v.dispose();
          });
        }
      }
    }
  }

  /**
   * Helper to dispose of a standalone texture.
   */
  public static disposeTexture(texture: THREE.Texture | null) {
    if (texture) {
      texture.dispose();
    }
  }
}
