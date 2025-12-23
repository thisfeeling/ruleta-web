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
  const page = ref(1)
  const perPage = ref(50)
  const total = ref(0)
  const loading = ref(false)
  const api = useApi()

  function add(entry: Omit<AuditEntry, 'id' | 'created_at'>) {
    const now = new Date().toISOString()
    entries.value.unshift({ id: String(Date.now()), created_at: now, ...entry })
  }

  function clear() {
    entries.value = []
    page.value = 1
    total.value = 0
  }

  async function fetchRecent({ p = 1, limit = 50 } = {}) {
    loading.value = true
    try {
      // API may return { data: AuditEntry[], page, per_page, total } or an array
      const resp = await api.get<any>(`/api/supervisor/audit-logs?page=${p}&limit=${limit}`)
      if (Array.isArray(resp)) {
        entries.value = resp
        page.value = p
        perPage.value = limit
        total.value = resp.length
      } else if (resp && resp.data) {
        entries.value = resp.data
        page.value = resp.page ?? p
        perPage.value = resp.per_page ?? limit
        total.value = resp.total ?? resp.data.length
      } else {
        // fallback
        entries.value = resp ?? []
        page.value = p
        perPage.value = limit
        total.value = Array.isArray(resp) ? resp.length : 0
      }
    } catch (err) {
      console.warn('[Audit] fetchRecent failed', err)
      // keep a local placeholder
      entries.value = [
        {
          id: '1',
          type: 'system',
          message: 'Audit system initialized (local)',
          created_at: new Date().toISOString(),
        },
      ]
      page.value = 1
      perPage.value = 50
      total.value = 1
    } finally {
      loading.value = false
    }
  }

  async function fetchDetail(id: number) {
    try {
      const detail = await api.get<AuditEntry>(`/api/supervisor/audit-logs/${id}`)
      return detail
    } catch (err) {
      console.warn('[Audit] fetchDetail failed', err)
      throw err
    }
  }

  return { entries, page, perPage, total, loading, add, clear, fetchRecent, fetchDetail }
})
