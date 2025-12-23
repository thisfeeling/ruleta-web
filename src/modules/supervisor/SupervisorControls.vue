<script setup lang="ts">
import { ref } from 'vue'
import { useSessionStore } from '@/modules/core/stores/session.store'
import { useUIStore } from '@/modules/core/stores/ui.store'
import { controlShow } from './supervisor.api'

const session = useSessionStore()
const uiStore = useUIStore()
const loading = ref<{ [k: string]: boolean }>({})

function currentShow() {
  return Number(session.session?.id ?? session.session?.id ?? 0)
}

async function perform(action: 'start' | 'pause' | 'end') {
  const id = currentShow()
  if (!id) return uiStore.error('No show available')
  loading.value[action] = true
  try {
    await controlShow(id, action)
    uiStore.success(`Show ${action} sent`)
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 403) {
      uiStore.error('No autorizado')
    } else {
      uiStore.error('Error al ejecutar acción')
    }
  } finally {
    loading.value[action] = false
  }
}
</script>

<template>
  <div class="supervisor-controls">
    <div class="flex items-center gap-4">
      <div class="text-sm text-muted">
        Show ID: <strong>{{ session.session?.id ?? '—' }}</strong>
      </div>

      <button class="btn btn-primary" :disabled="loading.start" @click="perform('start')">
        {{ loading.start ? 'Starting...' : 'Start' }}
      </button>
      <button class="btn btn-ghost" :disabled="loading.pause" @click="perform('pause')">
        {{ loading.pause ? 'Processing...' : 'Pause' }}
      </button>
      <button class="btn btn-error" :disabled="loading.end" @click="perform('end')">
        {{ loading.end ? 'Ending...' : 'End' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.supervisor-controls {
  display: flex;
  align-items: center;
}
</style>
