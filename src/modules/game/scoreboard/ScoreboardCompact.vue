<script setup lang="ts">
import { useScoreboardStore } from './scoreboard.store'
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { computed, ref } from 'vue'

const scoreboardStore = useScoreboardStore()
const authStore = useAuthStore()

const expanded = ref(false)
const maxShown = computed(() => (expanded.value ? 10 : 3))
const topList = computed(() => scoreboardStore.topPlayers.slice(0, maxShown.value))

const playerEntry = computed(() => scoreboardStore.getPlayerScore(authStore.player?.id ?? 0))
const playerRank = computed(() => scoreboardStore.getPlayerRank(authStore.player?.id ?? 0))

function toggleExpand() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div class="scoreboard-compact hidden sm:block" role="region" aria-label="Scoreboard compact">
    <button
      class="scoreboard-compact__header w-full flex items-center justify-between cursor-pointer"
      @click="toggleExpand"
      :aria-expanded="expanded"
      aria-controls="scoreboard-compact-list"
    >
      <span>{{ $t('scoreboard.title') }}</span>
      <svg
        class="w-4 h-4 transition-transform duration-200"
        :class="{ 'rotate-180': expanded }"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div v-if="playerEntry" class="scoreboard-compact__player">
      <span class="scoreboard-compact__rank">#{{ playerRank }}</span>
      <div class="flex items-center gap-2">
        <span
          :class="[
            'scoreboard-compact__score',
            playerEntry && playerEntry.player_id === authStore.player?.id
              ? 'player-badge--you'
              : '',
          ]"
          >{{ playerEntry.total_score }}</span
        >
        <span class="scoreboard-compact__label">pts</span>
      </div>
    </div>

    <transition-group
      name="list"
      tag="div"
      id="scoreboard-compact-list"
      class="scoreboard-compact__list"
    >
      <div
        v-for="entry in topList"
        :key="entry.player_id"
        class="scoreboard-compact__entry"
        :aria-label="`Player ${entry.nickname} position ${entry.rank}`"
      >
        <span class="text-xs text-muted">{{ entry.rank }}.</span>
        <div
          class="scoreboard-compact__player-badge"
          :style="{ backgroundColor: entry.color }"
          :title="entry.nickname"
        >
          <span class="text-[10px] font-bold">{{ entry.player_number }}</span>
        </div>
        <span class="scoreboard-compact__player-name truncate">{{ entry.nickname }}</span>
        <span class="scoreboard-compact__player-score">{{ entry.total_score }}</span>
      </div>
    </transition-group>

    <div
      v-if="expanded && topList.length > 3"
      class="text-xs text-center text-base-content/60 mt-2"
    >
      Showing {{ topList.length }} players
    </div>
  </div>
</template>

<style scoped>
.scoreboard-compact {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
}

.scoreboard-compact__header {
  font-size: 0.875rem; /* text-sm */
  font-weight: 700; /* font-bold */
  text-align: center; /* text-center */
  border-bottom: 1px solid rgba(0, 0, 0, 0.06); /* border-b */
  padding: 0.5rem 0.75rem; /* py-2 px-3 */
}

.scoreboard-compact__player {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem; /* py-2 px-3 */
  background-color: rgba(59, 130, 246, 0.06); /* bg-primary/10 fallback */
  border-radius: 0.5rem; /* rounded-lg */
  margin-top: 0.5rem; /* mt-2 */
}

.scoreboard-compact__rank {
  font-size: 1.125rem; /* text-lg */
  font-weight: 700;
  color: var(--color-primary, #3b82f6);
}

.scoreboard-compact__score {
  font-size: 1.5rem; /* text-2xl */
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Courier New', monospace;
  font-weight: 700;
}

.scoreboard-compact__label {
  font-size: 0.75rem; /* text-xs */
  color: rgba(0, 0, 0, 0.6);
}

.scoreboard-compact__list {
  margin-top: 0.5rem; /* mt-2 */
  font-size: 0.875rem; /* text-sm */
  max-height: 16rem; /* max-h-64 */
  overflow-y: auto;
  padding-right: 0.25rem; /* pr-1 */
}

.scoreboard-compact__entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem; /* rounded-md */
  background-color: rgba(255, 255, 255, 0.5); /* bg-base-100/50 fallback */
  transition:
    transform 200ms ease,
    opacity 200ms ease;
}

/* Move animation for transition-group */
.list-move {
  transition: transform 200ms ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.list-enter-to,
.list-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.scoreboard-compact__player-badge {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.player-badge--you {
  box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.12);
  animation: cpulse 2000ms infinite ease-in-out;
}

.scoreboard-compact__player-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}

/* Responsive: hide on very small devices to avoid blocking UI */
@media (max-width: 640px) {
  .scoreboard-compact {
    display: none;
  }
}

/* scrollbar styling */
.scoreboard-compact__list::-webkit-scrollbar {
  width: 6px;
}
.scoreboard-compact__list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 999px;
}
</style>
