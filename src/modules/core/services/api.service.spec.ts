import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('axios', () => {
  const create = vi.fn(() => ({
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    get: vi.fn(async () => ({ data: { ok: true } })),
    post: vi.fn(async () => ({ data: { posted: true } })),
    put: vi.fn(async () => ({ data: { put: true } })),
    delete: vi.fn(async () => ({ data: { deleted: true } })),
    patch: vi.fn(async () => ({ data: { patched: true } })),
  }))
  // Provide both default and named exports to be compatible with different import styles
  return { default: { create }, create }
})

import { apiService } from './api.service'

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('get returns response data', async () => {
    const res = await apiService.get('/test')
    expect(res).toEqual({ ok: true })
  })

  it('post/put/delete/patch return response data', async () => {
    expect(await apiService.post('/x', { a: 1 })).toEqual({ posted: true })
    expect(await apiService.put('/x', { a: 1 })).toEqual({ put: true })
    expect(await apiService.delete('/x')).toEqual({ deleted: true })
    expect(await apiService.patch('/x', { a: 1 })).toEqual({ patched: true })
  })
})
