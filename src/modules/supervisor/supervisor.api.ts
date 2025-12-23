import type { AuditEntry } from '@/modules/audit/audit.store'
import { apiService } from '@/modules/core/services/api.service'

export interface AuditListResponse {
  data: AuditEntry[]
  page: number
  per_page: number
  total: number
}

export async function getAuditLogs(page = 1, perPage = 50) {
  return apiService.get<AuditListResponse>(
    `/api/supervisor/audit-logs?page=${page}&limit=${perPage}`,
  )
}

export async function getAuditDetail(id: number) {
  return apiService.get<AuditEntry>(`/api/supervisor/audit-logs/${id}`)
}

export async function approveAudio(audioPlayId: number) {
  return apiService.post(`/api/supervisor/audio/${audioPlayId}/approve`)
}

export async function rejectAudio(audioPlayId: number) {
  return apiService.post(`/api/supervisor/audio/${audioPlayId}/reject`)
}

export async function controlShow(showId: number, action: 'start' | 'pause' | 'end') {
  return apiService.post(`/api/supervisor/shows/${showId}/${action}`)
}
