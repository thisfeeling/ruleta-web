<template>
  <div class="chat-message">Message</div>
</template>

<script setup lang="ts"></script>

<style scoped>
.chat-message {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  padding: 0.5rem 0;
}
.chat-message .nick {
  font-weight: 700;
  margin-right: 0.5rem;
}
.chat-message .text {
  color: var(--color-base-content);
}
</style>
