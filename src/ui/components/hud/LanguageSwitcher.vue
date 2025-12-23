<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { locale } = useI18n()

const label = computed(() => (locale.value === 'es-CO' ? 'ES' : 'EN'))

function toggle() {
  locale.value = locale.value === 'es-CO' ? 'en-US' : 'es-CO'
}
</script>

<template>
  <button class="language-switcher btn btn-ghost" @click="toggle" aria-label="Switch language">
    {{ label }}
  </button>
</template>

<style scoped>
.language-switcher {
  font-weight: 700;
}
</style>
