<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import FirstExperience from '@/modules/try/FirstExperience.vue'

import { RouterView } from 'vue-router'
</script>

<template>
  <TresCanvas
    clear-color="#82DBC5"
    window-size
  >
    <FirstExperience />
  </TresCanvas>

  <RouterView />
</template>

<style scoped></style>
