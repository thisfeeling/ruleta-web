<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  seconds: number
  maxSeconds?: number
  warning?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxSeconds: 60,
  warning: 10,
})

const progress = computed(() => (props.seconds / props.maxSeconds) * 100)
const isWarning = computed(() => props.seconds <= props.warning)
const minutes = computed(() => Math.floor(props.seconds / 60))
const remainingSeconds = computed(() => props.seconds % 60)
</script>

<template>
  <div class="timer" :class="{ 'timer--warning': isWarning }">
    <div class="timer__display">{{ minutes }}:{{ String(remainingSeconds).padStart(2, '0') }}</div>
    <div class="timer__bar mt-2">
      <div class="timer__progress h-2 rounded-full" :style="{ width: `${progress}%` }" />
    </div>
  </div>
</template>

<style scoped>
.timer {
  @apply flex flex-col items-center gap-2;
}

.timer__display {
  @apply text-3xl font-mono font-bold;
}

.timer--warning .timer__display {
  @apply text-error animate-pulse;
}

.timer__bar {
  @apply w-32 bg-base-300 rounded-full overflow-hidden;
}

.timer__progress {
  @apply h-full bg-primary transition-all duration-1000;
}

.timer--warning .timer__progress {
  @apply bg-error;
}
</style>
