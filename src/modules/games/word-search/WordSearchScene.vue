<template>
  <div class="word-search-scene p-6">
    <h2 class="text-2xl font-bold">{{ $t('wordSearch.title') }}</h2>

    <div class="mt-4 grid grid-cols-2 gap-4">
      <WordSearchGrid :grid="store.state.grid" />
      <div>
        <WordList :words="store.state.words" :found="store.state.foundWords" />
        <TimerComponent :timeLeft="store.state.timeLeft" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useWordSearchStore } from './word-search.store'
import { useWordSearchWebSocket } from './word-search.socket'

import WordSearchGrid from './components/WordSearchGrid.vue'
import WordList from './components/WordList.vue'
import TimerComponent from './components/TimerComponent.vue'

const store = useWordSearchStore()
useWordSearchWebSocket()

onUnmounted(() => {
  store.reset()
})
</script>

<style scoped>
.word-search-scene {
}
</style>
