# 05 - Player System (Join, Reconnect, PlayerCard)

**Status**: [x] Completed

---

## 📋 Overview

Sistema completo de jugadores: unirse al juego, reconexión tras desconexión, visualización de tarjetas de jugador con número como ícono.

---

## 🎯 Objectives

- [x] Implementar player.store.ts (gestión de jugadores)
- [x] Crear componente PlayerCard (con número como ícono)
- [x] Crear componente PlayerList (lista de jugadores)
- [x] Crear componente ReconnectView (interfaz de reconexión)
- [x] Crear componente PlayerHUB (HUD del jugador)
- [x] Integrar WebSocket events para jugadores

---

## 📁 Files to Create

```
src/modules/player/
├── player.store.ts
├── PlayerCard.vue
├── PlayerList.vue
├── PlayerHUB.vue
└── ReconnectView.vue
```

---

## 🔧 Implementation

### 1. Player Store (`player.store.ts`)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Player } from '@/modules/core/stores/auth.store'

export const usePlayersStore = defineStore('players', () => {
  // State
  const players = ref<Map<number, Player>>(new Map())
  const eliminatedPlayers = ref<Set<number>>(new Set())

  // Getters
  const allPlayers = computed(() => Array.from(players.value.values()))

  const alivePlayers = computed(() => allPlayers.value.filter((p) => !p.is_eliminated))

  const eliminatedPlayersList = computed(() => allPlayers.value.filter((p) => p.is_eliminated))

  const playerCount = computed(() => players.value.size)
  const aliveCount = computed(() => alivePlayers.value.length)
  const eliminatedCount = computed(() => eliminatedPlayersList.value.length)

  // Actions

  /**
   * Add or update a player
   */
  function addPlayer(player: Player) {
    players.value.set(player.id, player)

    if (player.is_eliminated) {
      eliminatedPlayers.value.add(player.id)
    }
  }

  /**
   * Add multiple players
   */
  function addPlayers(playerList: Player[]) {
    playerList.forEach((player) => addPlayer(player))
  }

  /**
   * Get player by ID
   */
  function getPlayer(id: number): Player | undefined {
    return players.value.get(id)
  }

  /**
   * Get player by number
   */
  function getPlayerByNumber(number: number): Player | undefined {
    return allPlayers.value.find((p) => p.number === number)
  }

  /**
   * Update player data
   */
  function updatePlayer(id: number, updates: Partial<Player>) {
    const player = players.value.get(id)
    if (player) {
      const updated = { ...player, ...updates }
      players.value.set(id, updated)

      if (updated.is_eliminated) {
        eliminatedPlayers.value.add(id)
      }
    }
  }

  /**
   * Mark player as eliminated
   */
  function eliminatePlayer(id: number) {
    const player = players.value.get(id)
    if (player) {
      player.is_eliminated = true
      player.eliminated_at = new Date().toISOString()
      eliminatedPlayers.value.add(id)
      console.log(`[Players] Player ${player.nickname} eliminated`)
    }
  }

  /**
   * Remove a player (disconnect)
   */
  function removePlayer(id: number) {
    players.value.delete(id)
    eliminatedPlayers.value.delete(id)
  }

  /**
   * Clear all players
   */
  function reset() {
    players.value.clear()
    eliminatedPlayers.value.clear()
  }

  /**
   * Sort players by number
   */
  function sortedPlayers(): Player[] {
    return allPlayers.value.sort((a, b) => a.number - b.number)
  }

  return {
    // State
    players,
    eliminatedPlayers,

    // Getters
    allPlayers,
    alivePlayers,
    eliminatedPlayersList,
    playerCount,
    aliveCount,
    eliminatedCount,

    // Actions
    addPlayer,
    addPlayers,
    getPlayer,
    getPlayerByNumber,
    updatePlayer,
    eliminatePlayer,
    removePlayer,
    reset,
    sortedPlayers,
  }
})
```

**Checklist**:

- [x] Create players Map state
- [x] Implement CRUD operations (add, update, remove)
- [x] Add getters for alive/eliminated players
- [x] Add helpers (getByNumber, sortedPlayers)
- [x] Test with mock player data

---

### 2. PlayerCard Component (`PlayerCard.vue`)

```vue
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
  const sizes = {
    sm: 'w-16 h-20',
    md: 'w-20 h-24',
    lg: 'w-24 h-28',
  }
  return sizes[props.size]
})

const numberSizeClasses = computed(() => {
  const sizes = {
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
      <span v-if="isCurrentPlayer" class="player-card__badge">
        {{ $t('player.you') }}
      </span>
    </div>

    <!-- Status Badge -->
    <div v-if="showStatus && player.is_eliminated" class="player-card__status">
      ❌ {{ $t('player.eliminated') }}
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
  background-color: var(--player-color);
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
```

**Checklist**:

- [x] Create PlayerCard component
- [x] Display player number as icon (gray bg, white text, or player color)
- [x] Show player nickname below icon
- [x] Highlight current player with ring
- [x] Show eliminated status
- [x] Add size variants (sm, md, lg)
- [x] Test with different player states

---

### 3. PlayerList Component (`PlayerList.vue`)

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { usePlayersStore } from '@/modules/player/player.store'
import PlayerCard from './PlayerCard.vue'

interface Props {
  filter?: 'all' | 'alive' | 'eliminated'
  size?: 'sm' | 'md' | 'lg'
  columns?: number
}

const props = withDefaults(defineProps<Props>(), {
  filter: 'all',
  size: 'md',
  columns: 4,
})

const playersStore = usePlayersStore()

const filteredPlayers = computed(() => {
  switch (props.filter) {
    case 'alive':
      return playersStore.alivePlayers
    case 'eliminated':
      return playersStore.eliminatedPlayersList
    default:
      return playersStore.sortedPlayers()
  }
})

const gridColumns = computed(() => `repeat(${props.columns}, minmax(0, 1fr))`)
</script>

<template>
  <div class="player-list">
    <div class="player-list__grid" :style="{ gridTemplateColumns: gridColumns }">
      <PlayerCard
        v-for="player in filteredPlayers"
        :key="player.id"
        :player="player"
        :size="size"
      />
    </div>

    <div v-if="filteredPlayers.length === 0" class="player-list__empty">
      <p>{{ $t('lobby.waitingForPlayers') }}</p>
    </div>
  </div>
</template>

<style scoped>
.player-list {
  @apply w-full;
}

.player-list__grid {
  @apply grid gap-4;
}

.player-list__empty {
  @apply text-center py-8 text-base-content/60;
}
</style>
```

**Checklist**:

- [x] Create PlayerList component
- [x] Support filtering (all, alive, eliminated)
- [x] Use grid layout with configurable columns
- [x] Show empty state when no players
- [x] Test with different filter modes
---

### 4. ReconnectView Component (`ReconnectView.vue`)

```vue
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
    uiStore.success(t('common.success'))
    router.push({ name: 'lobby' })
  } catch (error: any) {
    uiStore.error(error.response?.data?.message || t('errors.invalidPin'))
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
      <h1 class="reconnect-view__title">
        {{ $t('player.reconnect') }}
      </h1>

      <p class="reconnect-view__subtitle">
        {{ $t('player.selectPlayer') }}
      </p>

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
```

**Checklist**:

- [x] Create ReconnectView component
- [x] Display all players in grid
- [x] Allow selecting player by clicking card
- [x] Show PIN input after selection
- [x] Handle reconnect with validation
- [x] Show loading state during reconnection
- [x] Redirect to lobby on success
- [x] Show error on failure

---

### 5. PlayerHUB Component (`PlayerHUB.vue`)

```vue
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
          {{ authStore.isEliminated ? t('player.eliminated') : t('player.alive') }}
        </span>
      </div>
    </div>

    <!-- Game Info -->
    <div class="player-hub__game">
      <span>{{ t('lobby.playersOnline', { count: sessionStore.playersAlive }) }}</span>
      <span v-if="sessionStore.currentRound > 0">
        {{ t('common.round') }}: {{ sessionStore.currentRound }}
      </span>
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
```

**Checklist**:

- [x] Create PlayerHUB component
- [x] Display current player info (number, nickname)
- [x] Show player status (alive/eliminated)
- [x] Show game info (players alive, round)
- [x] Position fixed in corner
- [x] Apply visual changes when eliminated

---

### 6. WebSocket Integration

```typescript
// In a setup file or composable (e.g., useGameWebSocket.ts)
import { usePlayersStore } from '@/modules/player/player.store'
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { useEcho } from '@/modules/core/composables/useEcho'

export function usePlayerWebSocket() {
  const playersStore = usePlayersStore()
  const authStore = useAuthStore()
  const { channel } = useEcho()

  const gameChannel = channel('game.show')

  // Player joined
  gameChannel.listen('PlayerJoined', (event: any) => {
    playersStore.addPlayer(event.player)
    console.log('[WS] Player joined:', event.player.nickname)
  })

  // Player eliminated
  gameChannel.listen('PlayerEliminated', (event: any) => {
    playersStore.eliminatePlayer(event.player_id)

    // Check if it's the current player
    if (authStore.player?.id === event.player_id) {
      authStore.markEliminated()
    }

    console.log('[WS] Player eliminated:', event.player_id)
  })

  // Player disconnected
  gameChannel.listen('PlayerDisconnected', (event: any) => {
    playersStore.removePlayer(event.player_id)
    console.log('[WS] Player disconnected:', event.player_id)
  })

  // Player reconnected
  gameChannel.listen('PlayerReconnected', (event: any) => {
    playersStore.addPlayer(event.player)
    console.log('[WS] Player reconnected:', event.player.nickname)
  })

  // Initial players list
  gameChannel.listen('PlayersList', (event: any) => {
    playersStore.addPlayers(event.players)
    console.log('[WS] Players list received:', event.players.length)
  })
}
```

**Checklist**:

- [x] Listen to PlayerJoined event
- [x] Listen to PlayerEliminated event
- [x] Listen to PlayerDisconnected event
- [x] Listen to PlayerReconnected event
- [x] Listen to PlayersList event (initial load)
- [x] Update stores accordingly
- [x] Test all WebSocket events

---

## ✅ Acceptance Criteria

- [x] Players store manages all player data
- [x] PlayerCard displays number as icon with color
- [x] PlayerCard shows eliminated state
- [x] PlayerList renders grid of players
- [x] PlayerList supports filtering
- [x] ReconnectView allows selecting player
- [x] ReconnectView validates PIN
- [x] PlayerHUB shows current player info
- [x] WebSocket events update stores in real-time
- [x] Reconnection flow works end-to-end
- [x] UI updates reactively when players join/leave/eliminated

---

## 🔗 Related Files

- `src/modules/player/player.store.ts`
- `src/modules/player/PlayerCard.vue`
- `src/modules/player/PlayerList.vue`
- `src/modules/player/PlayerHUB.vue`
- `src/modules/player/ReconnectView.vue`
- `src/modules/core/stores/auth.store.ts`

---

## 📚 References

- [Pinia Stores](https://pinia.vuejs.org/)
- [Vue 3 Composition API](https://vuejs.org/guide/introduction.html)
- [DaisyUI Components](https://daisyui.com/components/)
