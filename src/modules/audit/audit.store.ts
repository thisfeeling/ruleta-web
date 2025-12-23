import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/modules/core/composables/useApi'

export interface AuditEntry {
  id: string
  type: string
  message: string
  created_at: string
}

export const useAuditStore = defineStore('audit', () => {
  const entries = ref<AuditEntry[]>([])

  function add(entry: Omit<AuditEntry, 'id' | 'created_at'>) {
    const now = new Date().toISOString()
    entries.value.unshift({ id: String(Date.now()), created_at: now, ...entry })
  }

  function clear() {
    entries.value = []
  }

  async function fetchRecent({ page = 1, limit = 50 } = {}) {
    const { get } = useApi()
    try {
      const data = await get<AuditEntry[]>(`/api/audit/recent?page=${page}&limit=${limit}`)
      entries.value = data
    } catch (err) {
      // Endpoint may not exist yet; keep placeholder entry and log
      console.warn('[Audit] fetchRecent failed', err)
      entries.value = [
        {
          id: '1',
          type: 'system',
          message: 'Audit system initialized (local)',
          created_at: new Date().toISOString(),
        },
      ]
    }
  }

  return { entries, add, clear, fetchRecent }
})
