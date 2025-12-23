<script setup lang="ts">
import { computed } from 'vue'
import PlayerList from '@/modules/player/PlayerList.vue'
import ChatBox from '@/modules/chat/ChatBox.vue'
import { useSessionStore } from '@/modules/core/stores/session.store'
import { usePlayersStore } from '@/modules/player/player.store'
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { useGameStore } from '@/modules/game/stores/game.store'

const sessionStore = useSessionStore()
const playersStore = usePlayersStore()
const authStore = useAuthStore()
const gameStore = useGameStore()

const playerCount = computed(() => sessionStore.playersTotal)
const playersAlive = computed(() => sessionStore.playersAlive)
const code = computed(() => sessionStore.gameCode)

function startShow() {
  if (!authStore.isSupervisor) return
  gameStore.startGame()
  // Emit event to backend via API or socket in real scenario
}
</script>

<template>
  <div class="lobby-scene p-6">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold">{{ $t('lobby.title') }}</h2>
        <p class="text-sm text-base-content/60">
          {{ $t('lobby.code') }}: <strong>{{ code }}</strong>
        </p>
      </div>
      <div class="text-right">
        <div>{{ $t('lobby.players') }}: {{ playerCount }}</div>
        <div>{{ $t('lobby.alive') }}: {{ playersAlive }}</div>
        <button
          v-if="authStore.isSupervisor"
          @click="startShow"
          class="btn btn-primary btn-sm mt-2"
        >
          {{ $t('supervisor.startShow') }}
        </button>
      </div>
    </div>

    <PlayerList />

    <div class="mt-6">
      <ChatBox />
    </div>
  </div>
</template>

<style scoped>
.lobby-scene {
  max-width: 1200px;
  margin: 0 auto;
}
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
