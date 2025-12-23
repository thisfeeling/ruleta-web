<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@/modules/core/stores/session.store'
import { usePlayersStore } from '@/modules/player/player.store'
import PlayerCard from '@/modules/player/PlayerCard.vue'
import { useAuthStore } from '@/modules/core/stores/auth.store'

const sessionStore = useSessionStore()
const playersStore = usePlayersStore()
const authStore = useAuthStore()

const winner = computed(() => playersStore.alivePlayers[0] ?? null)

function playAgain() {
  if (!authStore.isSupervisor) return
  // In real app, send request to backend to restart
}
</script>

<template>
  <div class="winner-scene p-6 text-center">
    <h2 class="text-4xl font-bold">{{ $t('winner.title') }}</h2>
    <div v-if="winner" class="mt-6">
      <player-card :player="winner" :size="'lg'" />
      <p class="mt-4">{{ $t('winner.congrats', { name: winner.nickname }) }}</p>
    </div>
    <div v-else class="mt-6">{{ $t('winner.noWinner') }}</div>

    <div class="mt-8">
      <button v-if="authStore.isSupervisor" @click="playAgain" class="btn btn-primary">
        {{ $t('supervisor.playAgain') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.winner-scene {
  padding: 1rem;
  text-align: center;
}
.player-card-large {
  max-width: 320px;
  margin: 0 auto;
}
</style>
