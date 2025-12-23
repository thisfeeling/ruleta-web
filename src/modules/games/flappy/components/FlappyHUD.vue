<template>
  <div class="flappy-hud absolute top-4 left-4 text-white">
    <div class="bg-black/50 px-3 py-1 rounded">Score: {{ score }}</div>
    <div class="mt-2">
      <button v-if="gameOver" @click="$emit('restart')" class="btn btn-sm">Restart</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFlappyStore } from '../flappy.store'
const store = useFlappyStore()
const score = computed(() => Math.floor(store.state.survivalTime / 1000))
const gameOver = computed(() => store.state.gameOver)
</script>

<style scoped>
.flappy-hud {
  z-index: 10;
}
</style>
