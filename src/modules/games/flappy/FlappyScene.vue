<template>
  <div class="flappy-scene p-6">
    <h2 class="text-2xl font-bold">{{ $t('flappy.title') }}</h2>

    <div class="mt-4 relative">
      <div id="flappy-container" class="w-full h-600px bg-slate-100"></div>
      <FlappyHUD @restart="onRestart" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useFlappyStore } from './flappy.store'
import { useFlappyWebSocket } from './flappy.socket'
import type { Game } from 'phaser'
import FlappyHUD from './components/FlappyHUD.vue'
import { createFlappyGame } from './flappy.game'

const store = useFlappyStore()
useFlappyWebSocket()
let game: Game | null = null

function create() {
  if (game && game.destroy) game.destroy(true)
  game = createFlappyGame('flappy-container')
}

onMounted(() => {
  create()
  store.start()
})

function onRestart() {
  store.reset()
  create()
  store.start()
}

onUnmounted(() => {
  if (game && game.destroy) game.destroy(true)
  store.reset()
})
</script>

<style scoped>
.flappy-scene {
  min-height: 160px;
}
</style>
