<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useAuditStore, type AuditEntry } from './audit.store'
import BaseModal from '@/ui/components/modals/BaseModal.vue'

const store = useAuditStore()
const entries = computed(() => store.entries)
const totalPages = computed(() => Math.max(1, Math.ceil(store.total / store.perPage)))
const detailVisible = ref(false)
const detail = ref<AuditEntry | null>(null)

onMounted(async () => {
  // fetch recent audit entries via API if available
  await store.fetchRecent({ p: store.page, limit: store.perPage })
})

function clear() {
  store.clear()
}

async function openDetail(id: string | number) {
  detailVisible.value = true
  detail.value = null
  try {
    detail.value = await store.fetchDetail(Number(id))
  } catch (err) {
    detail.value = {
      id: String(id),
      type: 'error',
      message: 'Failed to fetch detail',
      created_at: new Date().toISOString(),
    }
  }
}

function closeDetail() {
  detailVisible.value = false
}

async function prevPage() {
  if (store.page > 1) {
    await store.fetchRecent({ p: store.page - 1, limit: store.perPage })
  }
}

async function nextPage() {
  if (store.page < totalPages.value) {
    await store.fetchRecent({ p: store.page + 1, limit: store.perPage })
  }
}
</script>

<template>
  <div class="audit-viewer">
    <div class="audit-actions mb-2 flex gap-2">
      <button class="btn btn-sm" @click="clear">Clear</button>
      <div class="ml-auto flex items-center gap-2">
        <button class="btn btn-xs" :disabled="store.loading" @click="prevPage">Prev</button>
        <div class="text-xs">Page {{ store.page }} / {{ totalPages }}</div>
        <button
          class="btn btn-xs"
          :disabled="store.loading || store.page >= totalPages"
          @click="nextPage"
        >
          Next
        </button>
      </div>
    </div>

    <ul class="audit-list">
      <li v-for="e in store.entries" :key="e.id" class="audit-item">
        <div class="audit-meta text-xs text-muted">
          {{ new Date(e.created_at).toLocaleString() }} • {{ e.type }}
        </div>
        <div class="audit-msg">{{ e.message }}</div>
        <div class="mt-2">
          <button class="btn btn-ghost btn-sm" @click="openDetail(e.id)">View detail</button>
        </div>
      </li>
    </ul>

    <div v-if="store.entries.length === 0 && !store.loading" class="text-sm text-muted">
      No audit events
    </div>

    <BaseModal v-if="detailVisible" @close="closeDetail">
      <template #header>Audit detail</template>
      <template #default>
        <div v-if="detail">
          <p><strong>Type:</strong> {{ detail.type }}</p>
          <p><strong>Message:</strong> {{ detail.message }}</p>
          <p>
            <strong>Created:</strong>
            {{ detail && detail.created_at ? new Date(detail.created_at).toLocaleString() : '-' }}
          </p>
          <pre class="mt-2 p-2 bg-base-100 rounded">{{ detail }}</pre>
        </div>
        <div v-else class="text-sm text-muted">Loading...</div>
      </template>
    </BaseModal>
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
