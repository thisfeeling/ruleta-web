<script setup lang="ts">
import LanguageSwitcher from '@/ui/components/LanguageSwitcher.vue'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const nickname = ref('')
const color = ref('#2b8bf2')

function reset() {
  nickname.value = ''
  color.value = '#2b8bf2'
}

async function join() {
  try {
    await auth.join(nickname.value.trim() || 'Player', color.value)
    router.push({ name: 'lobby' })
  } catch (err) {
    // error handled in store
    console.warn('Join failed', auth.error)
  }
}
</script>

<template>
  <div class="p-4 max-w-md mx-auto">
    <div class="flex justify-end mb-4"><LanguageSwitcher /></div>

    <h1 class="text-2xl font-bold mb-2">{{ t('narrator.welcome') }}</h1>
    <p class="text-sm text-base-content/60 mb-4">{{ $t('lobby.enterRoom') }}</p>

    <div class="card p-4 bg-base-100 shadow">
      <label class="label">
        <span class="label-text">Nickname</span>
      </label>
      <input
        v-model="nickname"
        class="input w-full mb-3"
        placeholder="{{ $t('lobby.nickname') }}"
      />

      <label class="label">
        <span class="label-text">Color</span>
      </label>
      <input type="color" v-model="color" class="w-12 h-10 p-0 mb-3" />

      <div class="flex items-center gap-2">
        <button class="btn btn-primary" :disabled="auth.isLoading" @click="join">
          {{ auth.isLoading ? $t('lobby.joining') : $t('lobby.join') }}
        </button>
        <button class="btn btn-ghost" @click="reset">Reset</button>
      </div>

      <p v-if="auth.error" class="text-error text-sm mt-2">{{ auth.error }}</p>
    </div>

    <div class="mt-6 text-sm text-base-content/60">
      <p>{{ $t('lobby.howToPlay') }}</p>
    </div>
  </div>
</template>

<style scoped></style>
