<script setup lang="ts">
import { useSupervisorStore } from './supervisor.store'
import { useApi } from '@/modules/core/composables/useApi'
import { useUIStore } from '@/modules/core/stores/ui.store'
import { approveAudio, rejectAudio } from './supervisor.api'
import { ref } from 'vue'

const store = useSupervisorStore()
const api = useApi()
const uiStore = useUIStore()

const loading = ref<Record<string, boolean>>({})

async function approve(validationId: string, audioPlayId?: number) {
  try {
    loading.value[validationId] = true
    if (audioPlayId) {
      await approveAudio(Number(audioPlayId))
    } else {
      await api.post(`/api/supervisor/validate-audio/${validationId}`, { approved: true })
    }

    store.removeValidation(validationId)
    uiStore.success('Audio aprobado')
  } catch (error: any) {
    const status = error?.response?.status
    if (status === 403) {
      uiStore.error('No autorizado')
      return
    }
    uiStore.error('Error al aprobar')
  } finally {
    loading.value[validationId] = false
  }
}

async function reject(validationId: string, audioPlayId?: number) {
  try {
    loading.value[validationId] = true
    if (audioPlayId) {
      await rejectAudio(Number(audioPlayId))
    } else {
      await api.post(`/api/supervisor/validate-audio/${validationId}`, { approved: false })
    }

    store.removeValidation(validationId)
    uiStore.warning('Audio rechazado')
  } catch (error: any) {
    const status = error?.response?.status
    if (status === 403) {
      uiStore.error('No autorizado')
      return
    }
    uiStore.error('Error al rechazar')
  } finally {
    loading.value[validationId] = false
  }
}
</script>

<template>
  <div class="audio-review">
    <h2 class="text-xl font-bold mb-4">
      {{ $t('supervisor.pendingValidations') }}
    </h2>

    <div v-if="store.pendingValidations.length === 0" class="text-center py-8">
      <p class="text-base-content/60">No hay validaciones pendientes</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="validation in store.pendingValidations"
        :key="validation.id"
        class="audio-review__item"
      >
        <div class="audio-review__player">
          <span class="font-bold">Jugador #{{ validation.player_number }}</span>
          <span>{{ validation.nickname }}</span>
        </div>

        <div class="audio-review__word">
          Palabra: <strong>{{ validation.word }}</strong>
        </div>

        <audio controls class="audio-review__player">
          <source :src="validation.audio_url" type="audio/mpeg" />
        </audio>

        <div class="audio-review__actions">
          <button
            class="btn btn-success btn-sm"
            :disabled="loading[validation.id]"
            @click="approve(validation.id, validation.audio_play_id)"
          >
            {{ loading[validation.id] ? $t('supervisor.processing') : $t('supervisor.approve') }}
          </button>
          <button
            class="btn btn-error btn-sm"
            :disabled="loading[validation.id]"
            @click="reject(validation.id, validation.audio_play_id)"
          >
            {{ loading[validation.id] ? $t('supervisor.processing') : $t('supervisor.reject') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audio-review__item {
  background: var(--color-base-100);
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  display: block;
}

.audio-review__player {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.audio-review__word {
  font-size: 0.875rem;
}

.audio-review__actions {
  display: flex;
  gap: 0.5rem;
}
</style>
