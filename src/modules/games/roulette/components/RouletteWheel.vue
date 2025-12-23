<template>
  <div class="roulette-wheel w-80 h-80 flex items-center justify-center">
    <svg viewBox="0 0 200 200" class="w-64 h-64" :style="{ transform: `rotate(${angle}deg)` }">
      <circle cx="100" cy="100" r="90" fill="#fde68a" stroke="#000" />
      <g>
        <path
          v-for="i in 12"
          :key="i"
          :d="segmentPath(i - 1)"
          :fill="i % 2 === 0 ? '#f97316' : '#10b981'"
          stroke="#111"
        />
      </g>
      <circle cx="100" cy="100" r="18" fill="#111" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouletteStore } from '../roulette.store'

const store = useRouletteStore()
const angle = ref(0)
let animId: number | null = null
let target = 0
let velocity = 0

function segmentPath(i: number) {
  const seg = 360 / 12
  const a1 = (i * seg - 90) * (Math.PI / 180)
  const a2 = ((i + 1) * seg - 90) * (Math.PI / 180)
  const r = 90
  const x1 = 100 + r * Math.cos(a1)
  const y1 = 100 + r * Math.sin(a1)
  const x2 = 100 + r * Math.cos(a2)
  const y2 = 100 + r * Math.sin(a2)
  return `M100,100 L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`
}

function animate() {
  if (Math.abs(target - angle.value) < 0.5 && Math.abs(velocity) < 0.1) {
    angle.value = target
    if (animId) cancelAnimationFrame(animId)
    animId = null
    return
  }
  const dir = (target - angle.value) * 0.02
  velocity = velocity * 0.95 + dir
  angle.value += velocity
  animId = requestAnimationFrame(animate)
}

watch(
  () => store.state.isSpinning,
  (spinning) => {
    if (spinning) {
      target = angle.value + 720 + Math.random() * 360
      velocity = 20
      if (!animId) animate()
    }
  },
)

watch(
  () => store.state.spinAngle,
  (spinAngle) => {
    if (spinAngle !== 0) {
      target = Math.floor(angle.value / 360) * 360 + 360 + spinAngle
      velocity = 8
      if (!animId) animate()
    }
  },
)
</script>

<style scoped>
.roulette-wheel {
  background: transparent;
}
</style>
