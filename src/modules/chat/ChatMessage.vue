<script setup lang="ts">
import type { ChatMessage } from './chat.store'

interface Props {
  message: ChatMessage
}

const props = defineProps<Props>()
</script>

<template>
  <div class="chat-message" :class="{ 'chat-message--system': props.message.type === 'system' }">
    <div class="chat-message__header">
      <span
        v-if="props.message.type === 'player'"
        class="chat-message__number"
        :style="{ backgroundColor: props.message.color }"
      >
        {{ props.message.player_number }}
      </span>
      <span class="chat-message__nickname">{{ props.message.nickname }}</span>
      <span class="chat-message__time">{{
        new Date(props.message.timestamp).toLocaleTimeString()
      }}</span>
    </div>
    <div class="chat-message__text">{{ props.message.message }}</div>
  </div>
</template>

<style scoped>
.chat-message {
  background: var(--color-base-200);
  border-radius: 0.5rem;
  padding: 0.5rem;
}

.chat-message--system {
  background: rgba(59, 130, 246, 0.08); /* light info */
}

.chat-message__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.chat-message__number {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
}

.chat-message__nickname {
  font-weight: 600;
  font-size: 0.875rem;
}

.chat-message__time {
  margin-left: auto;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
}

.chat-message__text {
  font-size: 0.875rem;
}
</style>
