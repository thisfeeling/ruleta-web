import { useChatStore } from './chat.store'
import { useEcho } from '@/modules/core/composables/useEcho'
import { echoService } from '@/modules/core/services/echo.service'

export function useChatWebSocket() {
  const store = useChatStore()
  const { channel } = useEcho()

  const chatChannel = channel('game.chat')

  chatChannel.listen('MessageSent', (event: any) => {
    store.addMessage({
      id: event.id,
      player_id: event.player_id,
      player_number: event.player_number,
      nickname: event.nickname,
      color: event.color,
      message: event.message,
      timestamp: event.timestamp,
      type: 'player',
    })
  })

  chatChannel.listen('SystemMessage', (event: any) => {
    store.addMessage({
      id: event.id,
      player_id: 0,
      player_number: 0,
      nickname: 'Sistema',
      color: '#888888',
      message: event.message,
      timestamp: event.timestamp,
      type: 'system',
    })
  })
}

// Register as a global listener (used by main.ts during app init)
export function registerChatSocketListeners() {
  let channel
  try {
    channel = echoService.listenToChannel('game.chat')
  } catch {
    console.debug('[ChatSocket] Echo not initialized, skipping listeners')
    return
  }

  channel.listen('MessageSent', (event: any) => {
    try {
      const store = useChatStore()
      store.addMessage({
        id: event.id,
        player_id: event.player_id,
        player_number: event.player_number,
        nickname: event.nickname,
        color: event.color,
        message: event.message,
        timestamp: event.timestamp,
        type: 'player',
      })
    } catch (e) {
      console.warn('[ChatSocket] Handler error', e)
    }
  })

  channel.listen('SystemMessage', (event: any) => {
    try {
      const store = useChatStore()
      store.addMessage({
        id: event.id,
        player_id: 0,
        player_number: 0,
        nickname: 'Sistema',
        color: '#888888',
        message: event.message,
        timestamp: event.timestamp,
        type: 'system',
      })
    } catch (e) {
      console.warn('[ChatSocket] Handler error', e)
    }
  })
}
