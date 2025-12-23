<template>
  <button
    aria-label="Spin the roulette"
    class="spin-button"
    @click="onSpin"
    :aria-busy="spinning"
    :disabled="spinning"
  >
    {{ spinning ? 'Spinning…' : 'Spin' }}
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouletteStore } from '../roulette.store'

const store = useRouletteStore()
const spinning = ref(false)

async function onSpin() {
  if (spinning.value) return
  const player = store.state.currentPlayer || store.state.remainingPlayers[0]
  if (!player) return
  // start local spin (server should drive this in production)
  spinning.value = true
  store.startSpin(player)

  // simulate server result after delay
  setTimeout(() => {
    const result = Math.random() > 0.5 ? 'win' : 'lose'
    const angle = Math.floor(Math.random() * 360)
    store.setSpinResult(result as 'win' | 'lose', angle)
    spinning.value = false
  }, 1800)
}
</script>

<style scoped>
.spin-button {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: var(--color-primary);
  color: var(--color-primary-content);
  font-weight: 700;
}
</style>
