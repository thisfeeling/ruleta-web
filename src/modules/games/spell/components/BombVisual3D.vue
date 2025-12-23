<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { BombVisual } from '../spell.visual'
import { useSpellStore } from '../spell.store'

const container = ref<HTMLElement | null>(null)
let visual: BombVisual | null = null
let renderer: THREE.WebGLRenderer | null = null
let camera: THREE.PerspectiveCamera | null = null
let scene: THREE.Scene | null = null
let raf = 0
const store = useSpellStore()

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
  camera.position.set(0, 0, 6)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  container.value.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambient)
  const dir = new THREE.DirectionalLight(0xffffff, 0.6)
  dir.position.set(5, 10, 7)
  scene.add(dir)

  visual = new BombVisual()
  visual.init(scene)

  window.addEventListener('resize', onResize)
  onResize()

  const animate = () => {
    renderer!.render(scene!, camera!)
    raf = requestAnimationFrame(animate)
  }
  raf = requestAnimationFrame(animate)
})

watch(
  () => store.state.timeLeft,
  (t) => {
    // Map timeLeft to inflation scale: assuming initial time is >0
    const total = 10 // placeholder total time; real time should come from game payload
    const scale = 1 + ((total - t) / total) * 2.5
    visual?.setInflation(scale)
  },
)

watch(
  () => store.state.validationResult,
  (res) => {
    if (res === 'rejected') visual?.explodeAnimation()
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
  <div ref="container" class="bomb-visual-3d" />
</template>

<style scoped>
.bomb-visual-3d {
  width: 100%;
  height: 200px;
  background: radial-gradient(circle at center, rgba(255, 0, 0, 0.06), transparent 40%);
  display: block;
}
</style>
