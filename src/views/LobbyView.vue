<script setup lang="ts">
import { useSessionStore } from '@/modules/core/stores/session.store'
import PlayerList from '@/modules/player/PlayerList.vue'
import { useAuthStore } from '@/modules/core/stores/auth.store'

const session = useSessionStore()
const auth = useAuthStore()

function copyCode() {
  navigator.clipboard?.writeText(session.gameCode)
}
</script>

<template>
  <div class="lobby-view p-6">
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold">Lobby</h1>
        <p class="text-sm text-muted mt-1">
          Code: <strong>{{ session.gameCode }}</strong>
        </p>
        <p class="text-sm">Players: {{ session.playersAlive }} / {{ session.playersTotal }}</p>
      </div>

      <div class="flex items-center gap-2">
        <button class="btn" @click="copyCode">Copy code</button>
        <div v-if="auth.isSupervisor" class="badge badge-outline">Supervisor</div>
      </div>
    </div>

    <div class="mt-6">
      <PlayerList :filter="'alive'" :columns="6" />
    </div>
  </div>
</template>

<style scoped>
.lobby-view {
}
</style>
