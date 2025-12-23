<template>
  <div class="p-4">
    <div class="flex justify-end"><LanguageSwitcher /></div>
    <h1>{{ t('narrator.welcome') }}</h1>
  </div>
</template>

<script setup lang="ts">
import LanguageSwitcher from '@/ui/components/LanguageSwitcher.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped></style>
