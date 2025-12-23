import * as THREE from 'three'

export class BombVisual {
  scene: THREE.Scene | null = null
  sphere: THREE.Mesh | null = null
  material: THREE.MeshStandardMaterial | null = null
  animationFrame = 0

  init(scene: THREE.Scene) {
    this.scene = scene

    this.material = new THREE.MeshStandardMaterial({ color: 0x222222 })
    const geometry = new THREE.SphereGeometry(1, 32, 16)
    this.sphere = new THREE.Mesh(geometry, this.material)
    this.scene.add(this.sphere)

    const fuse = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x884400 }),
    )
    fuse.position.set(0, 1.1, 0)
    this.scene.add(fuse)
  }

  setInflation(scale: number) {
    if (!this.sphere) return
    const s = Math.max(0.1, Math.min(3.5, scale))
    this.sphere.scale.set(s, s, s)
    if (this.material) {
      // shift to red as it inflates
      const t = (s - 1) / (3.5 - 1)
      this.material.color.setRGB(0.3 + 0.7 * t, 0.1 * (1 - t), 0.1 * (1 - t))
    }
  }

  explodeAnimation() {
    if (!this.sphere) return
    const originalScale = this.sphere.scale.x
    let progress = 0
    const duration = 30
    const animate = () => {
      progress++
      const v = originalScale + progress * 0.3
      this.sphere!.scale.x = v
      this.sphere!.scale.y = v
      this.sphere!.scale.z = v
      if (progress < duration) this.animationFrame = requestAnimationFrame(animate)
      else this.destroy()
    }
    animate()
  }

  destroy() {
    if (this.sphere && this.scene) {
      this.scene.remove(this.sphere)
      ;(this.sphere.geometry as THREE.BufferGeometry).dispose()
      if (this.material) this.material.dispose()
      this.sphere = null
      this.material = null
    }
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame)
  }
}
