<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { locale, availableLocales } = useI18n()

const currentLocale = computed({
  get: () => locale.value,
  set: (value) => {
    locale.value = value as 'es-CO' | 'en-US'
    try {
      localStorage.setItem('locale', value)
    } catch {}
  },
})

const localeNames: Record<string, string> = {
  'es-CO': '🇨🇴 Español',
  'en-US': '🇺🇸 English',
}
</script>

<template>
  <div class="language-switcher">
    <select v-model="currentLocale" class="select select-bordered select-sm">
      <option v-for="loc in availableLocales" :key="loc" :value="loc">
        {{ localeNames[loc] || loc }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.language-switcher {
  display: inline-block;
}
</style>
