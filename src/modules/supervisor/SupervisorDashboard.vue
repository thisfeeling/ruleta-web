<script setup lang="ts">
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { useGameStore } from '@/modules/game/stores/game.store'
import { useApi } from '@/modules/core/composables/useApi'
import { useUIStore } from '@/modules/core/stores/ui.store'
import AudioReview from './AudioReview.vue'
import PlayerTimeline from './PlayerTimeline.vue'

const authStore = useAuthStore()
const gameStore = useGameStore()
const api = useApi()
const uiStore = useUIStore()

// Redirect if not supervisor
if (!authStore.isSupervisor) {
  window.location.href = '/'
}

async function startGame() {
  try {
    await api.post('/api/supervisor/start-game')
    uiStore.success('Juego iniciado')
  } catch (error) {
    uiStore.error('No se pudo iniciar el juego')
  }
}

async function nextRound() {
  try {
    await api.post('/api/supervisor/next-round')
    uiStore.success('Siguiente ronda')
  } catch (error) {
    uiStore.error('No se pudo avanzar')
  }
}

async function startBonusGame(game: string) {
  try {
    await api.post('/api/supervisor/start-bonus', { game })
    uiStore.success(`Juego bonus ${game} iniciado`)
  } catch (error) {
    uiStore.error('No se pudo iniciar el juego bonus')
  }
}

async function endGame() {
  try {
    await api.post('/api/supervisor/end-game')
    uiStore.success('Juego terminado')
  } catch (error) {
    uiStore.error('No se pudo terminar el juego')
  }
}
</script>

<template>
  <div class="supervisor-dashboard">
    <div class="supervisor-dashboard__header">
      <h1 class="text-3xl font-bold">{{ $t('supervisor.title') }}</h1>
    </div>

    <!-- Controls -->
    <div class="supervisor-dashboard__controls">
      <h2 class="text-xl font-bold">{{ $t('supervisor.controls') }}</h2>
      <div class="flex gap-4">
        <button class="btn btn-primary" @click="startGame">
          {{ $t('supervisor.startGame') }}
        </button>
        <button class="btn btn-secondary" @click="nextRound">
          {{ $t('supervisor.nextRound') }}
        </button>
        <button class="btn btn-accent" @click="startBonusGame('word-search')">¡A Buscar!</button>
        <button class="btn btn-accent" @click="startBonusGame('flappy')">No Lo Choques</button>
        <button class="btn btn-error" @click="endGame">
          {{ $t('supervisor.endGame') }}
        </button>
      </div>
    </div>

    <!-- Audio Validations -->
    <div class="supervisor-dashboard__validations">
      <AudioReview />
    </div>

    <!-- Player Timeline -->
    <div class="supervisor-dashboard__timeline">
      <PlayerTimeline />
    </div>
  </div>
</template>

<style scoped>
.supervisor-dashboard {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem;
}
.supervisor-dashboard > * + * {
  margin-top: 2rem;
}

.supervisor-dashboard__header {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-base-300);
}

.supervisor-dashboard__controls,
.supervisor-dashboard__validations,
.supervisor-dashboard__timeline {
  background: var(--color-base-200);
  padding: 1rem;
  border-radius: 0.5rem;
}
</style>
