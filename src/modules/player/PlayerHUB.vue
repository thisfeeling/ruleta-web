<script setup lang="ts">
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { useSessionStore } from '@/modules/core/stores/session.store'
import { useI18n } from 'vue-i18n'

const authStore = useAuthStore()
const sessionStore = useSessionStore()
const { t } = useI18n()
</script>

<template>
  <div
    class="fixed bottom-4 left-4 z-50 bg-base-100 rounded-xl shadow-2xl p-4 flex flex-col gap-3 min-w-50"
    :class="{ 'opacity-70 grayscale': authStore.isEliminated }"
  >
    <!-- Player Info -->
    <div class="flex items-center gap-3">
      <div
        class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold text-white"
        :style="{ backgroundColor: authStore.playerColor }"
      >
        {{ authStore.playerNumber }}
      </div>
      <div class="flex flex-col">
        <span class="font-semibold text-base">{{ authStore.playerNickname }}</span>
        <span class="text-xs text-base-content/70">{{
          authStore.isEliminated ? t('player.status.eliminated') : t('player.status.alive')
        }}</span>
      </div>
    </div>

    <!-- Game Info -->
    <div class="flex flex-col gap-1 text-sm text-base-content/80 border-t border-base-300 pt-2">
      <span>{{ t('lobby.playersConnected', { count: sessionStore.playersAlive }) }}</span>
      <span v-if="sessionStore.currentRound > 0"
        >{{ t('common.round') }}: {{ sessionStore.currentRound }}</span
      >
    </div>
  </div>
</template>
