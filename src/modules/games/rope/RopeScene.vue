<template>
  <div class="rope-scene p-6">
    <h2 class="text-2xl font-bold">{{ $t('rope.title') }}</h2>

    <div class="mt-4 grid grid-cols-2 gap-4">
      <RopeVisual3D />
      <div>
        <TensionMeter :tension="store.state.tension" :max="store.state.maxTension" />
        <GroupIndicator :groups="store.state.groups" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRopeStore } from './rope.store'
import { useRopeWebSocket } from './rope.socket'

import RopeVisual3D from './components/RopeVisual3D.vue'
import TensionMeter from './components/TensionMeter.vue'
import GroupIndicator from './components/GroupIndicator.vue'

const store = useRopeStore()
useRopeWebSocket()

onMounted(() => {})

onUnmounted(() => {
  store.reset()
})
</script>

<style scoped>
.rope-scene {
  min-height: 120px;
}
</style>
