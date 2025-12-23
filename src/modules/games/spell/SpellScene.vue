<template>
  <div class="spell-scene p-6">
    <h2 class="text-2xl font-bold">{{ $t('spell.title') }}</h2>

    <div class="grid grid-cols-2 gap-4 mt-4">
      <BombVisual3D />
      <div>
        <WordDisplay :word="store.state.currentWord" />
        <AudioRecorder />
        <ValidationStatus :status="store.state.validationResult" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useSpellStore } from './spell.store'
import { useSpellWebSocket } from './spell.socket'

import BombVisual3D from './components/BombVisual3D.vue'
import AudioRecorder from './components/AudioRecorder.vue'
import WordDisplay from './components/WordDisplay.vue'
import ValidationStatus from './components/ValidationStatus.vue'

const store = useSpellStore()
useSpellWebSocket()

onUnmounted(() => {
  store.reset()
})
</script>

<style scoped>
.spell-scene {
}
</style>
