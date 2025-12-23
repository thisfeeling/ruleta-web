<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  timeLeft: number
  maxTime?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxTime: 30,
})

const progress = computed(() => (props.timeLeft / props.maxTime) * 100)
const isLowTime = computed(() => props.timeLeft <= 10)
</script>

<template>
  <div class="millionaire-timer">
    <div class="millionaire-timer__value" :class="{ 'text-error': isLowTime }">
      {{ props.timeLeft }}s
    </div>
    <div class="millionaire-timer__bar">
      <div
        class="millionaire-timer__progress"
        :class="{ 'bg-error': isLowTime, 'bg-primary': !isLowTime }"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.millionaire-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.millionaire-timer__value {
  font-size: 1.875rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Courier New', monospace;
  font-weight: 700;
  color: #fff;
}

.millionaire-timer__bar {
  width: 8rem;
  height: 0.75rem;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 9999px;
  overflow: hidden;
}

.millionaire-timer__progress {
  height: 100%;
  transition: width 1s linear;
}
</style>
