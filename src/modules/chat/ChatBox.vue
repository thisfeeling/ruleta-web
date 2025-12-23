<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useChatStore } from './chat.store'
import { useChatWebSocket } from './chat.socket'
import { useApi } from '@/modules/core/composables/useApi'
import ChatMessage from './ChatMessage.vue'

const store = useChatStore()
const api = useApi()
const messageInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

useChatWebSocket()

// Auto-scroll to bottom on new messages
watch(
  () => store.messages.length,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  },
)

async function sendMessage() {
  if (!messageInput.value.trim()) return

  try {
    await api.post('/api/chat/send', {
      message: messageInput.value,
    })
    messageInput.value = ''
  } catch (error) {
    console.error('[Chat] Failed to send message:', error)
  }
}
</script>

<template>
  <div class="chat-box">
    <div class="chat-box__header">
      {{ $t('chat.title') }}
    </div>

    <div ref="messagesContainer" class="chat-box__messages">
      <ChatMessage v-for="message in store.messages" :key="message.id" :message="message" />
    </div>

    <div class="chat-box__input">
      <input
        v-model="messageInput"
        type="text"
        :placeholder="$t('chat.placeholder')"
        class="input input-bordered input-sm w-full"
        @keyup.enter="sendMessage"
      />
      <button class="btn btn-primary btn-sm" @click="sendMessage">
        {{ $t('chat.sendMessage') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-box {
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  z-index: 50;
  width: 20rem; /* ~ w-80 */
  height: 24rem; /* ~ h-96 */
  display: flex;
  flex-direction: column;
  background: var(--color-base-100);
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px rgba(2, 6, 23, 0.2);
  overflow: hidden;
}

.chat-box__header {
  padding: 0.5rem 1rem;
  background: var(--color-base-200);
  font-weight: 700;
  font-size: 0.875rem;
}

.chat-box__messages {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 0.75rem;
  display: block;
}

.chat-box__input {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-base-200);
}
</style>
