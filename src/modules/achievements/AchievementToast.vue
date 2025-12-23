<script setup lang="ts">
import type { Achievement } from './achievements.store'

interface Props {
  achievement: Achievement
}

const props = defineProps<Props>()
const emit = defineEmits(['close'])
</script>

<template>
  <div class="achievement-toast">
    <div class="achievement-left">
      <img
        v-if="props.achievement.icon"
        :src="props.achievement.icon"
        alt="icon"
        class="achievement-icon"
      />
      <div class="achievement-text">
        <div class="achievement-name">{{ props.achievement.name }}</div>
        <div class="achievement-desc">{{ props.achievement.description }}</div>
      </div>
    </div>
    <button class="achievement-close" @click="emit('close')">✕</button>
  </div>
</template>

<style scoped>
.achievement-toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.15);
  border-radius: 0.5rem;
  font-weight: 600;
  min-width: 240px;
}

.achievement-left {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.achievement-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
}

.achievement-name {
  font-size: 0.95rem;
}

.achievement-desc {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.5);
}

.achievement-close {
  background: transparent;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
}
</style>
