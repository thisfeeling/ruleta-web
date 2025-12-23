import { onUnmounted } from 'vue'
import { useRouletteStore } from './roulette.store'
import { useEcho } from '@/modules/core/composables/useEcho'

export function useRouletteWebSocket() {
  const store = useRouletteStore()
  const { channel } = useEcho()

  const gameChannel = channel('game.roulette')

  interface SpinStartedEvent {
    player: { id: number; nickname?: string }
  }
  interface SpinResultEvent {
    result: 'win' | 'lose'
    angle: number
  }

  gameChannel.listen('SpinStarted', (...args: unknown[]) => {
    const event = args[0] as SpinStartedEvent
    store.startSpin(event.player)
  })

  gameChannel.listen('SpinResult', (...args: unknown[]) => {
    const event = args[0] as SpinResultEvent
    store.setSpinResult(event.result, event.angle)
  })

  onUnmounted(() => {
    // cleanup if echo supports off
  })
}
