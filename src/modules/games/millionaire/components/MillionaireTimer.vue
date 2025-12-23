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
  @apply flex flex-col items-center gap-2;
}

.millionaire-timer__value {
  @apply text-3xl font-mono font-bold text-white;
}

.millionaire-timer__bar {
  @apply w-32 h-3 bg-base-300 rounded-full overflow-hidden;
}

.millionaire-timer__progress {
  @apply h-full transition-all duration-1000 ease-linear;
}
</style>
