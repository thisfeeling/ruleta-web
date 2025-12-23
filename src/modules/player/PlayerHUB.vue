<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { useSessionStore } from '@/modules/core/stores/session.store'
import { useI18n } from 'vue-i18n'

const authStore = useAuthStore()
const sessionStore = useSessionStore()
const { t } = useI18n()

const statusClass = computed(() => {
  if (authStore.isEliminated) return 'player-hub--eliminated'
  return 'player-hub--alive'
})
</script>

<template>
  <div class="player-hub" :class="statusClass">
    <!-- Player Info -->
    <div class="player-hub__info">
      <div class="player-hub__number" :style="{ backgroundColor: authStore.playerColor }">
        {{ authStore.playerNumber }}
      </div>
      <div class="player-hub__details">
        <span class="player-hub__nickname">{{ authStore.playerNickname }}</span>
        <span class="player-hub__status">
          {{ authStore.isEliminated ? t('player.status.eliminated') : t('player.status.alive') }}
        </span>
      </div>
    </div>

    <!-- Game Info -->
    <div class="player-hub__game">
      <span>{{ t('lobby.playersConnected', { count: sessionStore.playersAlive }) }}</span>
      <span v-if="sessionStore.currentRound > 0"
        >{{ t('common.round') }}: {{ sessionStore.currentRound }}</span
      >
    </div>
  </div>
</template>

<style scoped>
.player-hub {
  @apply fixed bottom-4 left-4 z-50;
  @apply bg-base-100 rounded-xl shadow-2xl p-4;
  @apply flex flex-col gap-3;
  @apply min-w-200px;
}

.player-hub--eliminated {
  @apply opacity-70 grayscale;
}

.player-hub__info {
  @apply flex items-center gap-3;
}

.player-hub__number {
  @apply w-12 h-12 rounded-lg;
  @apply flex items-center justify-center;
  @apply text-2xl font-bold text-white;
}

.player-hub__details {
  @apply flex flex-col;
}

.player-hub__nickname {
  @apply font-semibold text-base;
}

.player-hub__status {
  @apply text-xs text-base-content/70;
}

.player-hub__game {
  @apply flex flex-col gap-1 text-sm text-base-content/80;
  @apply border-t border-base-300 pt-2;
}
</style>
