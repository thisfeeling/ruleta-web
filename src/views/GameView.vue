<template>
  <div class="game-view min-h-screen bg-base-100">
    <header class="p-4 border-b border-base-200 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold">{{ $t('games.showTitle') }}</h1>
        <p class="text-sm text-base-content/60">
          {{ sessionStore.session?.code ?? $t('lobby.noCode') }}
        </p>
      </div>

      <div class="flex items-center gap-4">
        <div class="text-sm text-base-content/60">
          {{ $t('lobby.players') }}: {{ sessionStore.playersTotal }}
        </div>
        <scoreboard-compact />

        <div v-if="DEV" class="ml-4">
          <div class="btn-group">
            <button class="btn btn-ghost btn-xs" @click="setScreen('lobby')">Lobby</button>
            <button class="btn btn-ghost btn-xs" @click="setScreen('transition')">
              Transition
            </button>
            <button class="btn btn-ghost btn-xs" @click="setScreen('millionaire')">
              Millionaire
            </button>
            <button class="btn btn-ghost btn-xs" @click="setScreen('rope')">Rope</button>
            <button class="btn btn-ghost btn-xs" @click="setScreen('spell')">Spell</button>
            <button class="btn btn-ghost btn-xs" @click="setScreen('roulette')">Roulette</button>
            <button class="btn btn-ghost btn-xs" @click="setScreen('winner')">Winner</button>
          </div>
        </div>
      </div>
    </header>

    <main class="p-6">
      <component :is="currentScene" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@/modules/core/stores/session.store'
import { useGameWebSocket } from '@/modules/game/net/game.socket'

// Scenes
import { defineAsyncComponent } from 'vue'
const LobbyScene = defineAsyncComponent(() => import('@/modules/game/scenes/LobbyScene.vue'))
const TransitionScene = defineAsyncComponent(
  () => import('@/modules/game/scenes/TransitionScene.vue'),
)
const MillionaireScene = defineAsyncComponent(
  () => import('@/modules/games/millionaire/MillionaireScene.vue'),
)
const RopeScene = defineAsyncComponent(() => import('@/modules/games/rope/RopeScene.vue'))
const SpellScene = defineAsyncComponent(() => import('@/modules/games/spell/SpellScene.vue'))
const RouletteScene = defineAsyncComponent(
  () => import('@/modules/games/roulette/RouletteScene.vue'),
)
const WordSearchScene = defineAsyncComponent(
  () => import('@/modules/games/word-search/WordSearchScene.vue'),
)
const FlappyScene = defineAsyncComponent(() => import('@/modules/games/flappy/FlappyScene.vue'))
const WinnerScene = defineAsyncComponent(() => import('@/modules/game/scenes/WinnerScene.vue'))

import ScoreboardCompact from '@/modules/game/scoreboard/ScoreboardCompact.vue'

// Initialize WebSocket listeners for game events
useGameWebSocket()

const sessionStore = useSessionStore()

// Dev helpers
const DEV = import.meta.env.DEV

import type { GameScreen } from '@/modules/core/stores/session.store'

function setScreen(screen: GameScreen) {
  sessionStore.setScreen(screen)
}

const currentScene = computed(() => {
  switch (sessionStore.currentScreen) {
    case 'lobby':
      return LobbyScene
    case 'transition':
      return TransitionScene
    case 'millionaire':
      return MillionaireScene
    case 'rope':
      return RopeScene
    case 'spell':
      return SpellScene
    case 'roulette':
      return RouletteScene
    case 'word-search':
      return WordSearchScene
    case 'flappy':
      return FlappyScene
    case 'winner':
      return WinnerScene
    default:
      return LobbyScene
  }
})
</script>
