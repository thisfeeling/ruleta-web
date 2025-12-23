<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { usePlayersStore } from '@/modules/player/player.store'
import { useUIStore } from '@/modules/core/stores/ui.store'
import { useI18n } from 'vue-i18n'
import PlayerCard from './PlayerCard.vue'

const router = useRouter()
const authStore = useAuthStore()
const playersStore = usePlayersStore()
const uiStore = useUIStore()
const { t } = useI18n()

const selectedPlayerNumber = ref<number | null>(null)
const pin = ref('')
const isReconnecting = ref(false)

const availablePlayers = computed(() => playersStore.sortedPlayers())

async function handleReconnect() {
  if (!selectedPlayerNumber.value || !pin.value) {
    uiStore.warning(t('player.selectPlayer'))
    return
  }

  isReconnecting.value = true

  try {
    await authStore.reconnect(selectedPlayerNumber.value, pin.value)
    uiStore.success(t('player.reconnectSuccess'))
    router.push({ name: 'lobby' })
  } catch (err: unknown) {
    const message =
      typeof err === 'object' &&
      err !== null &&
      'message' in err &&
      typeof (err as Record<string, unknown>)['message'] === 'string'
        ? ((err as Record<string, unknown>)['message'] as string)
        : t('player.reconnectFailed')
    uiStore.error(message)
  } finally {
    isReconnecting.value = false
  }
}

function selectPlayer(playerNumber: number) {
  selectedPlayerNumber.value = playerNumber
}
</script>

<template>
  <div class="reconnect-view">
    <div class="reconnect-view__container">
      <h1 class="reconnect-view__title">{{ $t('player.reconnect') }}</h1>

      <p class="reconnect-view__subtitle">{{ $t('player.selectPlayer') }}</p>

      <!-- Players Grid -->
      <div class="reconnect-view__players">
        <div
          v-for="player in availablePlayers"
          :key="player.id"
          class="reconnect-view__player"
          :class="{
            'reconnect-view__player--selected': selectedPlayerNumber === player.number,
          }"
          @click="selectPlayer(player.number)"
        >
          <PlayerCard :player="player" size="md" :show-status="false" />
        </div>
      </div>

      <!-- PIN Input -->
      <div v-if="selectedPlayerNumber" class="reconnect-view__pin-section">
        <label class="form-control w-full max-w-xs">
          <div class="label">
            <span class="label-text">{{ $t('player.enterPin') }}</span>
          </div>
          <input
            v-model="pin"
            type="password"
            inputmode="numeric"
            maxlength="4"
            :placeholder="$t('player.enterPin')"
            class="input input-bordered input-lg w-full"
            @keyup.enter="handleReconnect"
          />
        </label>

        <button
          class="btn btn-primary btn-lg"
          :class="{ loading: isReconnecting }"
          :disabled="!pin || pin.length !== 4 || isReconnecting"
          @click="handleReconnect"
        >
          {{ $t('player.reconnect') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reconnect-view {
  @apply min-h-screen flex items-center justify-center p-4;
  @apply bg-linear-to-br from-primary/10 to-secondary/10;
}

.reconnect-view__container {
  @apply max-w-4xl w-full space-y-6;
  @apply bg-base-100 rounded-2xl shadow-2xl p-8;
}

.reconnect-view__title {
  @apply text-4xl font-bold text-center;
}

.reconnect-view__subtitle {
  @apply text-center text-base-content/70;
}

.reconnect-view__players {
  @apply grid grid-cols-4 gap-4;
}

.reconnect-view__player {
  @apply cursor-pointer transition-transform;
  @apply hover:scale-105;
}

.reconnect-view__player--selected {
  @apply scale-105;
}

.reconnect-view__pin-section {
  @apply flex flex-col items-center gap-4 pt-6;
}
</style>
