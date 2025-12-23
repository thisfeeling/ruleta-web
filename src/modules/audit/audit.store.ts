import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  async function fetchRecent() {
    // Placeholder: could fetch from API. Keep minimal implementation here.
    // Simulate fetching a few recent audit events
    entries.value = [
      {
        id: '1',
        type: 'system',
        message: 'Audit system initialized',
        created_at: new Date().toISOString(),
      },
    ]
  }

  return { entries, add, clear, fetchRecent }
})
