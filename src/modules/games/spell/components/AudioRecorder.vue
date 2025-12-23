<script setup lang="ts">
import { ref } from 'vue'

const recording = ref(false)
const duration = ref(0)
let mediaRecorder: MediaRecorder | null = null
let chunks: Blob[] = []
let timer: ReturnType<typeof setInterval> | null = null
const emit = defineEmits(['recorded'])

async function start() {
  if (recording.value) return
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    chunks = []
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      emit('recorded', blob)
      stream.getTracks().forEach((t) => t.stop())
    }
    mediaRecorder.start()
    recording.value = true
    duration.value = 0
    timer = setInterval(() => (duration.value += 1), 1000)
  } catch (e) {
    console.warn('Recording failed', e)
  }
}

function stop() {
  if (!recording.value) return
  mediaRecorder?.stop()
  recording.value = false
  if (timer) clearInterval(timer)
  timer = null
}
</script>

<template>
  <div class="audio-recorder">
    <button class="record-btn" @click="recording ? stop() : start()">
      {{ recording ? 'Stop' : 'Record' }}
    </button>
    <div class="text-sm text-muted">{{ recording ? duration + 's' : '' }}</div>
  </div>
</template>

<style scoped>
.audio-recorder {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.record-btn {
  padding: 0.5rem;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
}
</style>
