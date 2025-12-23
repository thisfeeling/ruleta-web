<script setup lang="ts">
import { useScoreboardStore } from './scoreboard.store'
import { useI18n } from 'vue-i18n'

const store = useScoreboardStore()
const { t } = useI18n()
</script>

<template>
  <div class="scoreboard">
    <h2 class="scoreboard__title">{{ t('scoreboard.title') }}</h2>

    <div class="scoreboard__table">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th>{{ t('scoreboard.rank') }}</th>
            <th>{{ t('scoreboard.player') }}</th>
            <th class="text-right">{{ t('scoreboard.score') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in store.sortedScoreboard"
            :key="entry.player_id"
            :class="{ 'opacity-50': entry.is_eliminated }"
          >
            <td class="font-bold">
              <span v-if="entry.rank === 1">🥇</span>
              <span v-else-if="entry.rank === 2">🥈</span>
              <span v-else-if="entry.rank === 3">🥉</span>
              <span v-else>{{ entry.rank }}</span>
            </td>
            <td>
              <div class="flex items-center gap-2">
                <div
                  class="w-8 h-8 rounded flex items-center justify-center text-white font-bold"
                  :style="{ backgroundColor: entry.color }"
                >
                  {{ entry.player_number }}
                </div>
                <span>{{ entry.nickname }}</span>
                <span v-if="entry.is_eliminated" class="badge badge-ghost">
                  {{ t('player.status.eliminated') }}
                </span>
              </div>
            </td>
            <td class="font-mono font-bold text-lg text-right">
              {{ entry.total_score.toLocaleString() }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="store.sortedScoreboard.length === 0" class="scoreboard__empty">
      <p>{{ t('scoreboard.noScores') }}</p>
    </div>
  </div>
</template>

<style scoped>
.scoreboard {
  @apply w-full max-w-4xl mx-auto p-6;
  @apply bg-base-100 rounded-2xl shadow-xl;
}

.scoreboard__title {
  @apply text-3xl font-bold mb-6 text-center;
}

.scoreboard__table {
  @apply overflow-x-auto;
}

.scoreboard__empty {
  @apply text-center py-8 text-base-content/60;
}
</style>
