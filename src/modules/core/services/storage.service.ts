export class StorageService {
  private prefix = 'ruleta_'

  set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(this.prefix + key, serialized)
    } catch (e) {
      console.warn('[Storage] Failed to set', key, e)
    }
  }

  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const raw = localStorage.getItem(this.prefix + key)
      if (!raw) return defaultValue ?? null
      return JSON.parse(raw) as T
    } catch (e) {
      console.warn('[Storage] Failed to get', key, e)
      return defaultValue ?? null
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key)
  }

  clear(): void {
    const keys = Object.keys(localStorage)
    keys.forEach((k) => {
      if (k.startsWith(this.prefix)) localStorage.removeItem(k)
    })
  }

  has(key: string): boolean {
    return localStorage.getItem(this.prefix + key) !== null
  }

  // Helpers
  savePlayerSession(session: unknown) {
    this.set('player_session', session)
  }

  getPlayerSession(): unknown {
    return this.get('player_session')
  }

  clearPlayerSession() {
    this.remove('player_session')
  }

  saveSettings(settings: unknown) {
    this.set('settings', settings)
  }

  getSettings(): unknown {
    return this.get('settings')
  }
}

export const storageService = new StorageService()
