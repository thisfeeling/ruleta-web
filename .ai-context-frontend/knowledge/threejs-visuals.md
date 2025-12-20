# Three.js Visual Systems

> **Uso específico**: Visual 3D para juegos Rope (cuerda) y Spell (bomba inflable)  
> **Principio fundamental**: Three.js es SOLO VISUAL, nunca decide lógica de juego  
> **Server-authoritative**: Laravel valida TODO, Three.js solo anima

---

## Arquitectura General

```
┌─────────────────────────────────────────┐
│  BACKEND (Laravel)                       │
│  ├─ Game Logic                           │
│  ├─ Physics Calculations                 │
│  ├─ Winner Determination                 │
│  └─ State Broadcast (Reverb)             │
└─────────────────────────────────────────┘
                ↓ WebSocket
         (state updates only)
                ↓
┌─────────────────────────────────────────┐
│  FRONTEND (Vue 3)                       │
│  ├─ Store (Pinia) - Game State          │
│  ├─ Three.js Visual - Rendering         │
│  └─ Audio Service - Sound               │
└─────────────────────────────────────────┘
```

### Reglas Críticas

| Rule                      | Descripción                                  |
| ------------------------- | -------------------------------------------- |
| ✅ **Visual Only**        | Three.js renderiza, NO calcula física real   |
| ✅ **State Driven**       | Lee estado del store, nunca lo modifica      |
| ✅ **No Game Logic**      | No decide ganadores, eliminaciones, puntos   |
| ✅ **Sync from Backend**  | Animaciones reaccionan a datos del servidor  |
| ✅ **Performance First**  | 60 FPS garantizado, optimizaciones agresivas |
| ❌ **Never Trust Client** | Frontend puede mentir, backend valida        |

---

## 1. Rope Game Visual (La Cuerda)

### Concepto

Visualización 3D de una cuerda de tug-of-war entre dos grupos. La tensión y posición se calculan en el backend y se transmiten al frontend para renderizado.

### Backend Data

```php
// Laravel broadcast
event(new RopeStateUpdated([
    'tension' => 0.65, // -1 (grupo A gana) a 1 (grupo B gana)
    'group_a_force' => 45.2,
    'group_b_force' => 72.8,
    'timestamp' => now()->timestamp
]));
```

### Frontend Store

```typescript
// modules/games/rope/rope.store.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useRopeStore = defineStore('rope', () => {
  const tension = ref(0) // -1 to 1
  const groupAForce = ref(0)
  const groupBForce = ref(0)
  const isActive = ref(false)

  function updateState(state: { tension: number; group_a_force: number; group_b_force: number }) {
    tension.value = state.tension
    groupAForce.value = state.group_a_force
    groupBForce.value = state.group_b_force
  }

  return {
    tension,
    groupAForce,
    groupBForce,
    isActive,
    updateState,
  }
})
```

### Three.js Visual Class

```typescript
// modules/games/rope/rope.visual.ts
import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

export interface RopeVisualConfig {
  container: HTMLElement
  ropeLength?: number
  ropeRadius?: number
  segments?: number
}

export class RopeVisual {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: WebGPURenderer | THREE.WebGLRenderer
  private rope: THREE.Mesh
  private centerMarker: THREE.Mesh
  private groupAMarker: THREE.Mesh
  private groupBMarker: THREE.Mesh
  private lights: THREE.Light[] = []
  private animationId: number | null = null

  // Config
  private ropeLength: number
  private ropeRadius: number
  private segments: number

  // State
  private currentTension: number = 0
  private targetTension: number = 0

  constructor(config: RopeVisualConfig) {
    this.ropeLength = config.ropeLength ?? 20
    this.ropeRadius = config.ropeRadius ?? 0.2
    this.segments = config.segments ?? 50

    // Init scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb) // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 10, 50)

    // Init camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      config.container.clientWidth / config.container.clientHeight,
      0.1,
      1000,
    )
    this.camera.position.set(0, 8, 15)
    this.camera.lookAt(0, 0, 0)

    // Init renderer
    this.renderer = this.createRenderer(config.container)

    // Create scene objects
    this.rope = this.createRope()
    this.centerMarker = this.createCenterMarker()
    this.groupAMarker = this.createGroupMarker('A', -this.ropeLength / 2)
    this.groupBMarker = this.createGroupMarker('B', this.ropeLength / 2)

    // Add to scene
    this.scene.add(this.rope)
    this.scene.add(this.centerMarker)
    this.scene.add(this.groupAMarker)
    this.scene.add(this.groupBMarker)

    // Setup lighting
    this.setupLighting()

    // Add ground
    this.createGround()

    // Handle resize
    window.addEventListener('resize', this.handleResize)
  }

  private createRenderer(container: HTMLElement): WebGPURenderer | THREE.WebGLRenderer {
    try {
      // Try WebGPU first (better performance)
      const renderer = new WebGPURenderer({ antialias: true })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      container.appendChild(renderer.domElement)
      console.log('✅ Using WebGPU renderer')
      return renderer
    } catch (error) {
      // Fallback to WebGL
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      container.appendChild(renderer.domElement)
      console.log('⚠️ Fallback to WebGL renderer')
      return renderer
    }
  }

  private createRope(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(
      this.ropeRadius,
      this.ropeRadius,
      this.ropeLength,
      16,
      this.segments,
      false,
    )

    // Rotate to horizontal
    geometry.rotateZ(Math.PI / 2)

    const material = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      roughness: 0.8,
      metalness: 0.1,
    })

    const rope = new THREE.Mesh(geometry, material)
    rope.castShadow = true
    rope.receiveShadow = true

    return rope
  }

  private createCenterMarker(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 16)
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000, // Red
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    })

    const marker = new THREE.Mesh(geometry, material)
    marker.position.y = 2

    return marker
  }

  private createGroupMarker(label: string, xPos: number): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(2, 4, 2)
    const material = new THREE.MeshStandardMaterial({
      color: label === 'A' ? 0x00ff00 : 0x0000ff,
      emissive: label === 'A' ? 0x00ff00 : 0x0000ff,
      emissiveIntensity: 0.3,
    })

    const marker = new THREE.Mesh(geometry, material)
    marker.position.set(xPos, 2, 0)

    return marker
  }

  private setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)
    this.lights.push(ambient)

    // Directional light (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 0.8)
    sun.position.set(10, 20, 10)
    sun.castShadow = true
    sun.shadow.mapSize.width = 2048
    sun.shadow.mapSize.height = 2048
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 50
    this.scene.add(sun)
    this.lights.push(sun)

    // Point lights for drama
    const pointLight1 = new THREE.PointLight(0xff4500, 0.5, 20)
    pointLight1.position.set(-10, 5, 5)
    this.scene.add(pointLight1)
    this.lights.push(pointLight1)

    const pointLight2 = new THREE.PointLight(0x4169e1, 0.5, 20)
    pointLight2.position.set(10, 5, 5)
    this.scene.add(pointLight2)
    this.lights.push(pointLight2)
  }

  private createGround() {
    const geometry = new THREE.PlaneGeometry(100, 100)
    const material = new THREE.MeshStandardMaterial({
      color: 0x228b22, // Green grass
      roughness: 0.9,
      metalness: 0,
    })

    const ground = new THREE.Mesh(geometry, material)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true

    this.scene.add(ground)
  }

  /**
   * Update tension from store
   * @param tension Value from -1 (group A wins) to 1 (group B wins)
   */
  public updateTension(tension: number) {
    this.targetTension = THREE.MathUtils.clamp(tension, -1, 1)
  }

  /**
   * Start animation loop
   */
  public start() {
    if (this.animationId !== null) return

    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      this.update()
      this.render()
    }

    animate()
  }

  /**
   * Stop animation loop
   */
  public stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * Update animation (called every frame)
   */
  private update() {
    // Smooth interpolation
    this.currentTension = THREE.MathUtils.lerp(this.currentTension, this.targetTension, 0.1)

    // Move rope based on tension
    const maxDisplacement = 5
    this.rope.position.x = this.currentTension * maxDisplacement

    // Rotate rope slightly for visual interest
    const rotationAmount = Math.sin(Date.now() * 0.001) * 0.05
    this.rope.rotation.y = rotationAmount

    // Scale rope based on tension (visual feedback)
    const scaleY = 1 + Math.abs(this.currentTension) * 0.1
    this.rope.scale.y = scaleY

    // Pulse center marker
    const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 1
    this.centerMarker.scale.set(pulse, pulse, pulse)

    // Move camera slightly for cinematic effect
    this.camera.position.x = Math.sin(Date.now() * 0.0005) * 2
  }

  /**
   * Render scene
   */
  private render() {
    this.renderer.render(this.scene, this.camera)
  }

  /**
   * Handle window resize
   */
  private handleResize = () => {
    const container = this.renderer.domElement.parentElement
    if (!container) return

    this.camera.aspect = container.clientWidth / container.clientHeight
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(container.clientWidth, container.clientHeight)
  }

  /**
   * Cleanup resources
   */
  public destroy() {
    this.stop()

    window.removeEventListener('resize', this.handleResize)

    // Dispose geometries
    this.rope.geometry.dispose()
    this.centerMarker.geometry.dispose()
    this.groupAMarker.geometry.dispose()
    this.groupBMarker.geometry.dispose()

    // Dispose materials
    if (Array.isArray(this.rope.material)) {
      this.rope.material.forEach((m) => m.dispose())
    } else {
      this.rope.material.dispose()
    }

    // Clear scene
    this.scene.clear()

    // Dispose renderer
    this.renderer.dispose()

    console.log('✅ RopeVisual destroyed')
  }
}
```

### Vue Component Integration

```vue
<!-- modules/games/rope/RopeScene.vue -->
<template>
  <div class="rope-scene">
    <div class="hud">
      <div class="team team-a" :class="{ winning: tension < -0.3 }">
        <h3>Grupo A</h3>
        <div class="force">{{ groupAForce.toFixed(1) }} N</div>
      </div>

      <div class="center-indicator">
        <div class="tension-bar">
          <div class="tension-fill" :style="{ transform: `translateX(${tension * 50}%)` }" />
        </div>
        <div class="tension-value">{{ (tension * 100).toFixed(0) }}%</div>
      </div>

      <div class="team team-b" :class="{ winning: tension > 0.3 }">
        <h3>Grupo B</h3>
        <div class="force">{{ groupBForce.toFixed(1) }} N</div>
      </div>
    </div>

    <!-- Three.js renders here -->
    <div ref="canvasContainer" class="canvas-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRopeStore } from './rope.store'
import { useRopeSocket } from './rope.socket'
import { RopeVisual } from './rope.visual'

const store = useRopeStore()
const { channel } = useRopeSocket()

const canvasContainer = ref<HTMLElement | null>(null)
let visual: RopeVisual | null = null

const tension = ref(0)
const groupAForce = ref(0)
const groupBForce = ref(0)

// Watch store changes and update visual
watch(
  () => store.tension,
  (newTension) => {
    tension.value = newTension
    if (visual) {
      visual.updateTension(newTension)
    }
  },
)

watch(
  () => store.groupAForce,
  (newForce) => {
    groupAForce.value = newForce
  },
)

watch(
  () => store.groupBForce,
  (newForce) => {
    groupBForce.value = newForce
  },
)

onMounted(() => {
  if (!canvasContainer.value) return

  // Create Three.js visual
  visual = new RopeVisual({
    container: canvasContainer.value,
    ropeLength: 20,
    ropeRadius: 0.2,
    segments: 50,
  })

  // Start animation
  visual.start()

  console.log('✅ Rope visual initialized')
})

onUnmounted(() => {
  // CRITICAL: Cleanup Three.js
  if (visual) {
    visual.destroy()
    visual = null
  }

  channel.stopListening('RopeStateUpdated')
})
</script>

<style scoped>
.rope-scene {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(to bottom, #87ceeb 0%, #e0f6ff 100%);
}

.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, transparent 100%);
}

.team {
  flex: 1;
  text-align: center;
  color: white;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  transition: all 0.3s;
}

.team.winning {
  background: rgba(0, 255, 0, 0.3);
  transform: scale(1.05);
}

.team-a.winning {
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
}

.team-b.winning {
  box-shadow: 0 0 20px rgba(0, 0, 255, 0.5);
}

.force {
  font-size: 2rem;
  font-weight: bold;
  font-family: 'Orbitron', monospace;
}

.center-indicator {
  flex: 2;
  text-align: center;
}

.tension-bar {
  position: relative;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.tension-fill {
  position: absolute;
  left: 50%;
  top: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(90deg, #ff0000 0%, #ffff00 50%, #00ff00 100%);
  border-radius: 10px;
  transition: transform 0.3s ease;
}

.tension-value {
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  font-family: 'Orbitron', monospace;
}

.canvas-container {
  width: 100%;
  height: 100%;
}
</style>
```

---

## 2. Spell Game Visual (Bomba Inflable)

### Concepto

Bomba 3D que se infla gradualmente según el tiempo restante. Cuando el tiempo se acaba, explota con animación de partículas.

### Backend Data

```php
// Laravel broadcast
event(new SpellTimerUpdated([
    'player_id' => $player->id,
    'time_remaining' => 15.5, // seconds
    'max_time' => 30.0,
    'exploded' => false
]));
```

### Three.js Visual Class

```typescript
// modules/games/spell/spell.visual.ts
import * as THREE from 'three'

export interface BombVisualConfig {
  container: HTMLElement
  maxScale?: number
  baseColor?: number
}

export class BombVisual {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private bomb: THREE.Mesh
  private fuse: THREE.Mesh
  private particles: THREE.Points | null = null
  private animationId: number | null = null

  // Config
  private maxScale: number
  private baseColor: number

  // State
  private currentScale: number = 1.0
  private targetScale: number = 1.0
  private exploded: boolean = false

  constructor(config: BombVisualConfig) {
    this.maxScale = config.maxScale ?? 3.0
    this.baseColor = config.baseColor ?? 0x1a1a1a

    // Init scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a0a)

    // Init camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      config.container.clientWidth / config.container.clientHeight,
      0.1,
      1000,
    )
    this.camera.position.z = 8

    // Init renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(config.container.clientWidth, config.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    config.container.appendChild(this.renderer.domElement)

    // Create bomb
    this.bomb = this.createBomb()
    this.fuse = this.createFuse()

    this.scene.add(this.bomb)
    this.scene.add(this.fuse)

    // Lighting
    this.setupLighting()

    // Handle resize
    window.addEventListener('resize', this.handleResize)
  }

  private createBomb(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(1, 32, 32)
    const material = new THREE.MeshStandardMaterial({
      color: this.baseColor,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0xff0000,
      emissiveIntensity: 0,
    })

    const bomb = new THREE.Mesh(geometry, material)
    return bomb
  }

  private createFuse(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8)
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      emissive: 0xff4500,
      emissiveIntensity: 0.5,
    })

    const fuse = new THREE.Mesh(geometry, material)
    fuse.position.y = 1.4
    fuse.rotation.z = Math.PI * 0.2

    return fuse
  }

  private setupLighting() {
    // Ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.3)
    this.scene.add(ambient)

    // Spotlight on bomb
    const spotlight = new THREE.SpotLight(0xffffff, 1.5)
    spotlight.position.set(0, 5, 5)
    spotlight.angle = Math.PI / 6
    spotlight.penumbra = 0.5
    spotlight.target = this.bomb
    this.scene.add(spotlight)

    // Danger light (pulsing red)
    const dangerLight = new THREE.PointLight(0xff0000, 0, 10)
    dangerLight.position.set(0, 0, 3)
    this.scene.add(dangerLight)
  }

  /**
   * Update bomb size based on remaining time
   * @param timeRemaining Seconds left
   * @param maxTime Total time in seconds
   */
  public updateTime(timeRemaining: number, maxTime: number) {
    const progress = 1 - timeRemaining / maxTime
    this.targetScale = 1 + progress * (this.maxScale - 1)

    // Update emissive intensity (more red as time runs out)
    const material = this.bomb.material as THREE.MeshStandardMaterial
    material.emissiveIntensity = progress * 0.8
  }

  /**
   * Trigger explosion animation
   */
  public explode() {
    if (this.exploded) return

    this.exploded = true

    // Hide bomb
    this.bomb.visible = false
    this.fuse.visible = false

    // Create particle explosion
    this.createExplosion()
  }

  private createExplosion() {
    const particleCount = 500
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities: THREE.Vector3[] = []

    for (let i = 0; i < particleCount; i++) {
      // Random position
      positions[i * 3] = (Math.random() - 0.5) * 0.5
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5

      // Random velocity (outward)
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      )
      velocities.push(velocity)
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      color: 0xff4500,
      size: 0.2,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 1.0,
    })

    this.particles = new THREE.Points(geometry, material)
    this.scene.add(this.particles)

    // Animate particles
    let time = 0
    const animateExplosion = () => {
      if (!this.particles || time > 2) {
        if (this.particles) {
          this.scene.remove(this.particles)
          this.particles.geometry.dispose()
          ;(this.particles.material as THREE.Material).dispose()
          this.particles = null
        }
        return
      }

      time += 0.016

      const positions = this.particles.geometry.attributes.position.array as Float32Array

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velocities[i].x * 0.016
        positions[i * 3 + 1] += velocities[i].y * 0.016
        positions[i * 3 + 2] += velocities[i].z * 0.016

        // Gravity
        velocities[i].y -= 9.8 * 0.016
      }

      this.particles.geometry.attributes.position.needsUpdate = true

      // Fade out
      const material = this.particles.material as THREE.PointsMaterial
      material.opacity = Math.max(0, 1 - time / 2)

      requestAnimationFrame(animateExplosion)
    }

    animateExplosion()
  }

  /**
   * Start animation loop
   */
  public start() {
    if (this.animationId !== null) return

    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      this.update()
      this.render()
    }

    animate()
  }

  /**
   * Stop animation loop
   */
  public stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private update() {
    if (this.exploded) return

    // Smooth scale interpolation
    this.currentScale = THREE.MathUtils.lerp(this.currentScale, this.targetScale, 0.1)

    this.bomb.scale.setScalar(this.currentScale)

    // Pulsing animation (faster as it gets bigger)
    const pulseSpeed = 2 + this.currentScale
    const pulse = Math.sin(Date.now() * 0.001 * pulseSpeed) * 0.05 + 1
    this.bomb.scale.multiplyScalar(pulse)

    // Rotate bomb slowly
    this.bomb.rotation.y += 0.01

    // Shake as it gets bigger
    const shake = (this.currentScale - 1) * 0.2
    this.bomb.position.x = (Math.random() - 0.5) * shake
    this.bomb.position.y = (Math.random() - 0.5) * shake
  }

  private render() {
    this.renderer.render(this.scene, this.camera)
  }

  private handleResize = () => {
    const container = this.renderer.domElement.parentElement
    if (!container) return

    this.camera.aspect = container.clientWidth / container.clientHeight
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(container.clientWidth, container.clientHeight)
  }

  public destroy() {
    this.stop()

    window.removeEventListener('resize', this.handleResize)

    // Dispose resources
    this.bomb.geometry.dispose()
    ;(this.bomb.material as THREE.Material).dispose()
    this.fuse.geometry.dispose()
    ;(this.fuse.material as THREE.Material).dispose()

    if (this.particles) {
      this.particles.geometry.dispose()
      ;(this.particles.material as THREE.Material).dispose()
    }

    this.scene.clear()
    this.renderer.dispose()

    console.log('✅ BombVisual destroyed')
  }
}
```

### Vue Component Integration

```vue
<!-- modules/games/spell/SpellScene.vue -->
<template>
  <div class="spell-scene">
    <div class="hud">
      <div class="timer" :class="{ danger: timeRemaining < 10 }">
        {{ timeRemaining.toFixed(1) }}s
      </div>

      <div class="word-display">
        Deletrea: <strong>{{ currentWord }}</strong>
      </div>
    </div>

    <!-- Three.js renders here -->
    <div ref="canvasContainer" class="canvas-container"></div>

    <div v-if="exploded" class="explosion-overlay">
      <h1>💥 ¡BOOM!</h1>
      <p>Tiempo agotado</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useSpellStore } from './spell.store'
import { useSpellSocket } from './spell.socket'
import { useSpellAudio } from './spell.audio'
import { BombVisual } from './spell.visual'

const store = useSpellStore()
const { channel } = useSpellSocket()
const { playBombTick, playBombExplode } = useSpellAudio()

const canvasContainer = ref<HTMLElement | null>(null)
let visual: BombVisual | null = null

const timeRemaining = ref(30)
const maxTime = ref(30)
const currentWord = ref('')
const exploded = ref(false)

// Ticker interval
let tickInterval: number | null = null

watch(
  () => store.timeRemaining,
  (newTime) => {
    timeRemaining.value = newTime

    if (visual) {
      visual.updateTime(newTime, maxTime.value)
    }

    // Play tick sound when low
    if (newTime < 10 && newTime > 0) {
      playBombTick()
    }
  },
)

watch(
  () => store.exploded,
  (didExplode) => {
    if (didExplode && visual) {
      exploded.value = true
      visual.explode()
      playBombExplode()
    }
  },
)

onMounted(() => {
  if (!canvasContainer.value) return

  visual = new BombVisual({
    container: canvasContainer.value,
    maxScale: 3.5,
    baseColor: 0x1a1a1a,
  })

  visual.start()

  console.log('✅ Bomb visual initialized')
})

onUnmounted(() => {
  if (visual) {
    visual.destroy()
    visual = null
  }

  if (tickInterval) {
    clearInterval(tickInterval)
  }

  channel.stopListening('SpellTimerUpdated')
})
</script>

<style scoped>
.spell-scene {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #0a0a0a;
}

.hud {
  position: absolute;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  text-align: center;
  color: white;
}

.timer {
  font-size: 4rem;
  font-weight: bold;
  font-family: 'Orbitron', monospace;
  color: #00ff00;
  text-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
  transition: color 0.3s;
}

.timer.danger {
  color: #ff0000;
  text-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
  animation: pulse 0.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.word-display {
  font-size: 2rem;
  margin-top: 1rem;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.explosion-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(255, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.9) 100%);
  color: white;
  z-index: 20;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.explosion-overlay h1 {
  font-size: 6rem;
  margin: 0;
  animation: shake 0.5s;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}
</style>
```

---

## Performance Optimizations

### 1. Renderer Selection

```typescript
function createOptimalRenderer(container: HTMLElement) {
  // Try WebGPU first (Chrome/Edge)
  if ('gpu' in navigator) {
    try {
      return new WebGPURenderer({ antialias: true })
    } catch {}
  }

  // Fallback to WebGL
  return new THREE.WebGLRenderer({
    antialias: window.devicePixelRatio < 2, // Only on low DPI
    powerPreference: 'high-performance',
  })
}
```

### 2. Geometry Instancing (if many objects)

```typescript
// For particle systems or repeated geometry
const instancedGeometry = new THREE.InstancedBufferGeometry()
instancedGeometry.instanceCount = 100
```

### 3. Frustum Culling

Objects outside camera view are automatically culled by Three.js.

### 4. Level of Detail (LOD)

```typescript
const lod = new THREE.LOD()
lod.addLevel(highPolyMesh, 0) // Close
lod.addLevel(mediumPolyMesh, 10) // Medium
lod.addLevel(lowPolyMesh, 20) // Far
```

### 5. Dispose Pattern

Always dispose resources to prevent memory leaks:

```typescript
geometry.dispose()
material.dispose()
texture.dispose()
renderer.dispose()
```

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RopeVisual } from './rope.visual'

describe('RopeVisual', () => {
  let container: HTMLElement
  let visual: RopeVisual

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)

    visual = new RopeVisual({ container })
  })

  afterEach(() => {
    visual.destroy()
    document.body.removeChild(container)
  })

  it('creates renderer canvas', () => {
    expect(container.querySelector('canvas')).toBeTruthy()
  })

  it('updates tension correctly', () => {
    visual.updateTension(0.5)
    // Assertions about state
  })
})
```

### Integration Tests (Playwright)

```typescript
test('rope visual renders and animates', async ({ page }) => {
  await page.goto('/game/rope')

  // Wait for canvas
  await page.waitForSelector('canvas')

  // Check WebGL context exists
  const hasWebGL = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    return canvas?.getContext('webgl') !== null
  })

  expect(hasWebGL).toBe(true)
})
```

---

## Troubleshooting

### Issue: Black screen

**Causa**: Renderer no inicializado o cámara mal posicionada

**Solución**:

```typescript
console.log('Camera position:', this.camera.position)
console.log('Scene children:', this.scene.children.length)
```

### Issue: Memory leak

**Causa**: No se llama `.destroy()` al desmontar

**Solución**:

```typescript
onUnmounted(() => {
  visual?.destroy() // Always call destroy
})
```

### Issue: Low FPS

**Causa**: Demasiados polígonos o luces

**Solución**:

- Reducir segments en geometrías
- Limitar número de luces a 3-4
- Usar `setPixelRatio(1)` en móviles

---

## Summary

| Feature         | Rope Game                               | Spell Game                |
| --------------- | --------------------------------------- | ------------------------- |
| **Geometry**    | Cylinder (rope)                         | Sphere (bomb)             |
| **Animation**   | Position + rotation                     | Scale + particles         |
| **State Input** | `tension` (-1 to 1)                     | `timeRemaining` (seconds) |
| **Special FX**  | Fog, multiple lights                    | Explosion particles       |
| **Performance** | 🟢 Excellent                            | 🟢 Excellent              |
| **Renderer**    | WebGPU / WebGL                          | WebGL                     |
| **Lifecycle**   | Mount → Start → Update → Stop → Destroy | Same                      |

---

**Última actualización**: Diciembre 20, 2025  
**Versión**: 1.0.0
