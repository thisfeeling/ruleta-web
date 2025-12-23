import { storageService } from '@/modules/core/services/storage.service'

export function useStorage() {
  return {
    set: storageService.set.bind(storageService),
    get: storageService.get.bind(storageService),
    remove: storageService.remove.bind(storageService),
    clear: storageService.clear.bind(storageService),
    has: storageService.has.bind(storageService),
    getPlayerSession: storageService.getPlayerSession.bind(storageService),
    savePlayerSession: storageService.savePlayerSession.bind(storageService),
    getSettings: storageService.getSettings.bind(storageService),
    saveSettings: storageService.saveSettings.bind(storageService),
  }
}
