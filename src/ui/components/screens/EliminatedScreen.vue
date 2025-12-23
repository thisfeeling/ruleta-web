<script setup lang="ts">
const props = defineProps<{ reason?: string }>()
</script>

<template>
  <div class="eliminated-screen">
    <h2 class="text-xl font-bold">Eliminated</h2>
    <p class="text-sm text-muted" v-if="props.reason">{{ props.reason }}</p>
    <slot name="actions"></slot>
  </div>
</template>

<style scoped>
.eliminated-screen {
  text-align: center;
}
</style>
