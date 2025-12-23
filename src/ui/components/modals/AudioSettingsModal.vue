<script setup lang="ts">
import { ref } from 'vue'
import { useAudio } from '@/modules/core/composables/useAudio'

const audio = useAudio()
const music = ref(audio.getVolume('music') ?? 0.6)
const sfx = ref(audio.getVolume('sfx') ?? 0.8)
const voice = ref(audio.getVolume('voice') ?? 1.0)

function apply() {
  audio.setVolume('music', music.value)
  audio.setVolume('sfx', sfx.value)
  audio.setVolume('voice', voice.value)
}
</script>

<template>
  <div class="audio-settings-modal">
    <div class="field">
      <label>Music</label>
      <input type="range" min="0" max="1" step="0.01" v-model.number="music" />
      <span class="ml-2">{{ Math.round(music * 100) }}%</span>
    </div>

    <div class="field">
      <label>SFX</label>
      <input type="range" min="0" max="1" step="0.01" v-model.number="sfx" />
      <span class="ml-2">{{ Math.round(sfx * 100) }}%</span>
    </div>

    <div class="field">
      <label>Voice</label>
      <input type="range" min="0" max="1" step="0.01" v-model.number="voice" />
      <span class="ml-2">{{ Math.round(voice * 100) }}%</span>
    </div>

    <div class="actions mt-4">
      <button class="btn btn-primary" @click="apply">Apply</button>
    </div>
  </div>
</template>

<style scoped>
.audio-settings-modal .field {
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
