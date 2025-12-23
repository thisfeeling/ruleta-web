<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { RopeVisual } from '../rope.visual'
import { useRopeStore } from '../rope.store'

const container = ref<HTMLElement | null>(null)
let visual: RopeVisual | null = null
let renderer: THREE.WebGLRenderer | null = null
let camera: THREE.PerspectiveCamera | null = null
let scene: THREE.Scene | null = null
let raf = 0
const store = useRopeStore()

function onResize() {
  if (!container.value || !renderer || !camera) return
  const w = container.value.clientWidth
  const h = container.value.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

onMounted(() => {
  if (!container.value) return

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(
    50,
    container.value.clientWidth / container.value.clientHeight,
    0.1,
    1000,
  )
  camera.position.set(0, 2, 6)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  container.value.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambient)
  const dir = new THREE.DirectionalLight(0xffffff, 0.6)
  dir.position.set(5, 10, 7)
  scene.add(dir)

  visual = new RopeVisual()
  visual.init(scene)
  visual.setTension(store.state.tension, store.state.maxTension)

  window.addEventListener('resize', onResize)
  onResize()

  const animate = () => {
    if (visual) {
      // could run visual animations here
    }
    renderer!.render(scene!, camera!)
    raf = requestAnimationFrame(animate)
  }
  raf = requestAnimationFrame(animate)
})

watch(
  () => store.state.tension,
  (t) => {
    visual?.setTension(t, store.state.maxTension)
  },
)

watch(
  () => store.state.isSnapped,
  (snapped) => {
    if (snapped) visual?.snapAnimation()
  },
)

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  if (visual) visual.destroy()
  if (renderer && renderer.domElement.parentElement)
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div ref="container" class="rope-visual-3d" />
</template>

<style scoped>
.rope-visual-3d {
  width: 100%;
  height: 260px;
  background: linear-gradient(180deg, #0000, rgba(0, 0, 0, 0.03));
  border-radius: 0.5rem;
  overflow: hidden;
}
</style>
