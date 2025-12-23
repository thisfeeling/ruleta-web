import * as THREE from 'three'

export class RopeVisual {
  scene: THREE.Scene | null = null
  ropeMesh: THREE.Mesh | null = null
  material: THREE.MeshStandardMaterial | null = null
  animationFrame = 0

  init(scene: THREE.Scene) {
    this.scene = scene

    // Simple cylinder rope placeholder
    this.material = new THREE.MeshStandardMaterial({ color: 0x7b3f00 })
    const geometry = new THREE.CylinderGeometry(0.15, 0.15, 6, 8)
    this.ropeMesh = new THREE.Mesh(geometry, this.material)
    this.ropeMesh.rotation.z = Math.PI / 2
    this.scene.add(this.ropeMesh)

    // Add small highlight
    const left = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xffd27f }),
    )
    left.position.set(-3, 0, 0)
    const right = left.clone()
    right.position.set(3, 0, 0)
    this.scene.add(left)
    this.scene.add(right)
  }

  setTension(tension: number, max = 100) {
    if (!this.ropeMesh) return
    const scale = 1 + (tension / max) * 0.6
    // stretch along x-axis (rope laid horizontally)
    this.ropeMesh.scale.set(scale, 1, 1)
    // subtle color change
    if (this.material) {
      const t = Math.min(1, tension / max)
      this.material.color.setRGB(0.48 + 0.5 * t, 0.25 * (1 - t), 0.0)
    }
  }

  snapAnimation() {
    if (!this.ropeMesh) return
    // quick shrink + remove
    const originalScale = this.ropeMesh.scale.x
    let progress = 0
    const duration = 20
    const animate = () => {
      progress++
      const v = Math.max(0, originalScale * (1 - progress / duration))
      this.ropeMesh!.scale.x = v
      if (progress < duration) this.animationFrame = requestAnimationFrame(animate)
      else this.destroy()
    }
    animate()
  }

  destroy() {
    if (this.ropeMesh && this.scene) {
      this.scene.remove(this.ropeMesh)
      ;(this.ropeMesh.geometry as THREE.BufferGeometry).dispose()
      if (this.material) this.material.dispose()
      this.ropeMesh = null
      this.material = null
    }
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame)
  }
}
