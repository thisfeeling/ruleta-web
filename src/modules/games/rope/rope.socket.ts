import { onUnmounted } from 'vue'
import { useRopeStore } from './rope.store'
import { useEcho } from '@/modules/core/composables/useEcho'

export function useRopeWebSocket() {
  const store = useRopeStore()
  const { channel } = useEcho()

  const gameChannel = channel('game.rope')

  interface Player {
    id: number
    nickname?: string
  }
  interface RoundStartedEvent {
    groups: Array<{ id: number; players: Player[]; totalClicks: number; status: string }>
  }
  interface TensionUpdatedEvent {
    tension: number
  }

  gameChannel.listen('RoundStarted', (...args: unknown[]) => {
    const event = args[0] as RoundStartedEvent
    // coerce statuses into known set
    const allowed = ['waiting', 'playing', 'passed', 'eliminated'] as const
    const groups = event.groups.map((g) => {
      const s = String(g.status)
      const status = (allowed as readonly string[]).includes(s)
        ? (s as 'waiting' | 'playing' | 'passed' | 'eliminated')
        : 'waiting'
      return { ...g, status }
    })
    store.setGroups(groups)
  })

  gameChannel.listen('TensionUpdated', (...args: unknown[]) => {
    const event = args[0] as TensionUpdatedEvent
    store.setTension(event.tension)
  })

  gameChannel.listen('RopeSnapped', () => {
    store.setTension(store.state.maxTension)
  })

  onUnmounted(() => {
    // cleanup
  })
}
