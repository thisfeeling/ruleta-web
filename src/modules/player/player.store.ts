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
  function addPlayer(player: Player) {
    players.value.set(player.id, player)
    if (player.is_eliminated) eliminatedPlayers.value.add(player.id)
  }

  function addPlayers(playerList: Player[]) {
    playerList.forEach((p) => addPlayer(p))
  }

  function getPlayer(id: number): Player | undefined {
    return players.value.get(id)
  }

  function getPlayerByNumber(number: number): Player | undefined {
    return allPlayers.value.find((p) => p.number === number)
  }

  function updatePlayer(id: number, updates: Partial<Player>) {
    const player = players.value.get(id)
    if (player) {
      const updated = { ...player, ...updates }
      players.value.set(id, updated)
      if (updated.is_eliminated) eliminatedPlayers.value.add(id)
    }
  }

  function eliminatePlayer(id: number) {
    const player = players.value.get(id)
    if (player) {
      player.is_eliminated = true
      player.eliminated_at = new Date().toISOString()
      eliminatedPlayers.value.add(id)
      players.value.set(id, player)
      console.log(`[Players] Player ${player.nickname} eliminated`)
    }
  }

  function removePlayer(id: number) {
    players.value.delete(id)
    eliminatedPlayers.value.delete(id)
  }

  function reset() {
    players.value.clear()
    eliminatedPlayers.value.clear()
  }

  function sortedPlayers(): Player[] {
    return allPlayers.value.slice().sort((a, b) => a.number - b.number)
  }

  return {
    players,
    eliminatedPlayers,

    allPlayers,
    alivePlayers,
    eliminatedPlayersList,
    playerCount,
    aliveCount,
    eliminatedCount,

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
