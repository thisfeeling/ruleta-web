<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps<{ duration?: number; timeLeft?: number; running?: boolean }>()
const emit = defineEmits(['done'])

const remaining = ref(props.duration ?? props.timeLeft ?? 0)
let timer: ReturnType<typeof setInterval> | null = null

function tick() {
  remaining.value = Math.max(0, remaining.value - 1)
  if (remaining.value === 0) {
    stopTimer()
    emit('done')
  }
}

function startTimer() {
  if (timer) return
  timer = setInterval(tick, 1000)
}

function stopTimer() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

onMounted(() => {
  remaining.value = props.duration ?? 0
  if (props.running ?? true) startTimer()
})

onBeforeUnmount(() => stopTimer())

watch(
  () => props.running,
  (val) => (val ? startTimer() : stopTimer()),
)
</script>

<template>
  <div class="wordsearch-timer">{{ new Date(remaining * 1000).toISOString().substr(14, 5) }}</div>
</template>

<style scoped>
.wordsearch-timer {
  font-weight: 700;
  font-family: 'Orbitron', monospace;
}
</style>
