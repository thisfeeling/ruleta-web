<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAuditStore } from './audit.store'

const store = useAuditStore()
const entries = computed(() => store.entries)

onMounted(() => {
  // fetch recent audit entries (could be replaced with real API)
  store.fetchRecent()
})

function clear() {
  store.clear()
}
</script>

<template>
  <div class="audit-viewer">
    <div class="audit-actions mb-2 flex gap-2">
      <button class="btn btn-sm" @click="clear">Clear</button>
    </div>

    <ul class="audit-list">
      <li v-for="e in entries" :key="e.id" class="audit-item">
        <div class="audit-meta text-xs text-muted">
          {{ new Date(e.created_at).toLocaleString() }} • {{ e.type }}
        </div>
        <div class="audit-msg">{{ e.message }}</div>
      </li>
    </ul>

    <div v-if="entries.length === 0" class="text-sm text-muted">No audit events</div>
  </div>
</template>

<style scoped>
.audit-viewer {
  padding: 1rem;
  max-height: 360px;
  overflow: auto;
  border-left: 2px solid var(--color-base-200);
}

.audit-item {
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--color-base-200);
}

.audit-msg {
  margin-top: 0.2rem;
}
</style>
