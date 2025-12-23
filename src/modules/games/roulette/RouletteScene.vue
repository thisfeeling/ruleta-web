<template>
  <div class="roulette-scene p-6">
    <h2 class="text-2xl font-bold">{{ $t('roulette.title') }}</h2>
    <p v-if="store.state.currentPlayer">
      {{ $t('roulette.turn') }}:
      {{ store.state.currentPlayer.nickname || store.state.currentPlayer.id }}
    </p>

    <RouletteWheel />
    <div class="mt-4 flex gap-4 items-center">
      <SpinButton />
      <ResultDisplay />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouletteStore } from './roulette.store'
import { useRouletteWebSocket } from './roulette.socket'

import RouletteWheel from './components/RouletteWheel.vue'
import SpinButton from './components/SpinButton.vue'
import ResultDisplay from './components/ResultDisplay.vue'

const store = useRouletteStore()
useRouletteWebSocket()

onMounted(() => {
  // placeholder: could request initial players from the API
})

onUnmounted(() => {
  store.reset()
})
</script>

<style scoped>
.roulette-scene {
}
</style>
