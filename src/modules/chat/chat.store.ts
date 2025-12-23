import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ChatMessage {
  id: string
  player_id: number
  player_number: number
  nickname: string
  color: string
  message: string
  timestamp: string
  type: 'player' | 'system'
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const maxMessages = 100

  function addMessage(message: ChatMessage) {
    messages.value.push(message)

    // Keep only last maxMessages
    if (messages.value.length > maxMessages) {
      messages.value = messages.value.slice(-maxMessages)
    }
  }

  function clear() {
    messages.value = []
  }

  return { messages, addMessage, clear }
})
