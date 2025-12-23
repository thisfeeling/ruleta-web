import { apiService } from '@/modules/core/services/api.service'

export function useApi() {
  return {
    get: apiService.get.bind(apiService),
    post: apiService.post.bind(apiService),
    put: apiService.put.bind(apiService),
    del: apiService.delete.bind(apiService),
    patch: apiService.patch.bind(apiService),
  }
}
