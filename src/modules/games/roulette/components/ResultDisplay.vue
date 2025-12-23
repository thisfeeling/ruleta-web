<template>
  <div class="roulette-result">
    <div
      v-if="store.state.spinResult"
      :class="store.state.spinResult === 'win' ? 'text-green-600' : 'text-red-600'"
    >
      {{ store.state.spinResult === 'win' ? $t('roulette.win') : $t('roulette.lose') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouletteStore } from '../roulette.store'
const store = useRouletteStore()
</script>

<style scoped>
.roulette-result {
  min-width: 120px;
  text-align: center;
}
</style>
