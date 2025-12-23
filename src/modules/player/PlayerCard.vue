<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '@/modules/core/stores/auth.store'
import { useAuthStore } from '@/modules/core/stores/auth.store'

interface Props {
  player: Player
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showStatus: true,
})

const authStore = useAuthStore()

const isCurrentPlayer = computed(() => authStore.player?.id === props.player.id)

const sizeClasses = computed(() => {
  const sizes: Record<string, string> = {
    sm: 'w-16 h-20',
    md: 'w-20 h-24',
    lg: 'w-24 h-28',
  }
  return sizes[props.size]
})

const numberSizeClasses = computed(() => {
  const sizes: Record<string, string> = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  }
  return sizes[props.size]
})
</script>

<template>
  <div
    class="player-card"
    :class="[
      sizeClasses,
      {
        'player-card--current': isCurrentPlayer,
        'player-card--eliminated': player.is_eliminated,
      },
    ]"
  >
    <!-- Player Number Icon -->
    <div
      class="player-card__number"
      :class="numberSizeClasses"
      :style="{
        backgroundColor: player.is_eliminated ? '#6b7280' : player.color,
      }"
    >
      {{ player.number }}
    </div>

    <!-- Player Nickname -->
    <div class="player-card__nickname">
      {{ player.nickname }}
      <span v-if="isCurrentPlayer" class="player-card__badge">{{ $t('player.you') }}</span>
    </div>

    <!-- Status Badge -->
    <div v-if="showStatus && player.is_eliminated" class="player-card__status">
      ❌ {{ $t('player.status.eliminated') }}
    </div>
  </div>
</template>

<style scoped>
.player-card {
  @apply flex flex-col items-center gap-2 p-2 rounded-lg;
  @apply bg-base-200 transition-all duration-200;
}

.player-card--current {
  @apply ring-2 ring-primary ring-offset-2;
}

.player-card--eliminated {
  @apply opacity-60 grayscale;
}

.player-card__number {
  @apply w-full aspect-square rounded-lg;
  @apply flex items-center justify-center;
  @apply font-bold text-white shadow-lg;
}

.player-card__nickname {
  @apply text-sm font-medium text-center truncate max-w-full;
  @apply flex flex-col items-center gap-1;
}

.player-card__badge {
  @apply badge badge-primary badge-xs;
}

.player-card__status {
  @apply text-xs text-error font-semibold;
}
</style>
