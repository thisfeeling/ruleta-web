import { onUnmounted } from 'vue'
import { useFlappyStore } from './flappy.store'
import { useEcho } from '@/modules/core/composables/useEcho'

export function useFlappyWebSocket() {
  const store = useFlappyStore()
  const { channel } = useEcho()

  const gameChannel = channel('game.flappy')

  gameChannel.listen('GameStarted', () => {
    store.start()
  })

  interface GameEndedEvent {
    score: number
  }

  gameChannel.listen('GameEnded', (...args: unknown[]) => {
    const event = args[0] as GameEndedEvent
    store.end(event.score)
  })

  onUnmounted(() => {})
}
