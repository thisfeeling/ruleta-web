<script setup lang="ts">
import ScoreboardCompact from '@/modules/game/scoreboard/ScoreboardCompact.vue'
import PlayerHUB from '@/modules/player/PlayerHUB.vue'
import { useScoreboardWebSocket } from '@/modules/game/scoreboard/scoreboard.socket'

// Initialize WebSocket listeners for scoreboard
useScoreboardWebSocket()
</script>

<template>
  <div class="game-layout">
    <!-- Player HUD (bottom-left) -->
    <PlayerHUB />

    <!-- Scoreboard Compact (top-right) -->
    <ScoreboardCompact />

    <!-- Slot for game scenes -->
    <slot />
  </div>
</template>

<style scoped>
.game-layout {
  min-height: 100vh;
}
</style>
