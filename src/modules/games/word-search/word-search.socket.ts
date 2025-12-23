import { onUnmounted } from 'vue'
import { useWordSearchStore } from './word-search.store'
import { useEcho } from '@/modules/core/composables/useEcho'

export function useWordSearchWebSocket() {
  const store = useWordSearchStore()
  const { channel } = useEcho()

  const gameChannel = channel('game.word-search')

  interface GridGeneratedEvent {
    grid: string[][]
    words: string[]
  }
  interface WordFoundEvent {
    word: string
  }

  gameChannel.listen('GridGenerated', (...args: unknown[]) => {
    const event = args[0] as GridGeneratedEvent
    store.setGrid(event.grid, event.words)
  })

  gameChannel.listen('WordFound', (...args: unknown[]) => {
    const event = args[0] as WordFoundEvent
    store.markWordFound(event.word)
  })

  onUnmounted(() => {})
}
