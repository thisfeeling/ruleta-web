<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSessionStore } from '@/modules/core/stores/session.store'
import { useAudio } from '@/modules/core/composables/useAudio'

const sessionStore = useSessionStore()
const countdown = ref(10)
const audio = useAudio()

onMounted(() => {
  const timer = setInterval(() => {
    countdown.value = Math.max(0, countdown.value - 1)
    if (countdown.value === 0) clearInterval(timer)
  }, 1000)
  audio.play({ id: 'transition-countdown', url: '/assets/audio/sfx/tick.mp3', channel: 'sfx' })
})
</script>

<template>
  <div class="transition-scene p-8 text-center">
    <h2 class="text-3xl font-bold">{{ $t('transition.nextGame') }}</h2>
    <p class="text-xl mt-2">{{ sessionStore.session?.current_game }}</p>
    <p class="text-6xl font-bold mt-6">{{ countdown }}</p>
    <p class="mt-4 text-base-content/60">
      {{ $t('transition.playersRemaining') }}: {{ sessionStore.playersAlive }}
    </p>
  </div>
</template>

<style scoped>
.transition-scene {
  @apply w-full;
}
</style>
