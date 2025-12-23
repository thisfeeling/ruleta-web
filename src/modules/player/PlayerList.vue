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
  <div class="w-full">
    <div class="grid gap-4" :style="{ gridTemplateColumns: gridColumns }">
      <PlayerCard
        v-for="player in filteredPlayers"
        :key="player.id"
        :player="player"
        :size="size"
      />
    </div>

    <div v-if="filteredPlayers.length === 0" class="text-center py-8 text-base-content/60">
      <p>{{ $t('lobby.waitingForPlayers') }}</p>
    </div>
  </div>
</template>
