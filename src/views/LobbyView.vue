<script setup lang="ts">
import { useSessionStore } from '@/modules/core/stores/session.store'
const session = useSessionStore()

function copyCode() {
  navigator.clipboard?.writeText(session.gameCode)
}
</script>

<template>
  <div class="lobby-view p-6">
    <h1 class="text-2xl font-bold">Lobby</h1>
    <p class="text-sm text-muted">
      Code: <strong>{{ session.gameCode }}</strong>
    </p>
    <p class="text-sm">Players: {{ session.playersAlive }} / {{ session.playersTotal }}</p>
    <div class="mt-4">
      <button class="btn" @click="copyCode">Copy code</button>
    </div>
  </div>
</template>

<style scoped>
.lobby-view {
}
</style>
