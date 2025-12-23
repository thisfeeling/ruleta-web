import { onUnmounted } from 'vue'
import { useSpellStore } from './spell.store'
import { useEcho } from '@/modules/core/composables/useEcho'

export function useSpellWebSocket() {
  const store = useSpellStore()
  const { channel } = useEcho()

  const gameChannel = channel('game.spell')

  interface PlayerSelectedEvent {
    word: string
    player: { id: number; nickname?: string }
  }
  interface AudioValidatedEvent {
    result: 'approved' | 'rejected'
  }

  gameChannel.listen('PlayerSelected', (...args: unknown[]) => {
    const event = args[0] as PlayerSelectedEvent
    store.assignWord(event.word, event.player)
  })

  gameChannel.listen('AudioValidated', (...args: unknown[]) => {
    const event = args[0] as AudioValidatedEvent
    store.setValidation(event.result)
  })

  onUnmounted(() => {
    // cleanup
  })
}
