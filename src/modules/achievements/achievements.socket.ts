import { useAchievementsStore } from './achievements.store'
import { useEcho } from '@/modules/core/composables/useEcho'
import { echoService } from '@/modules/core/services/echo.service'

export function useAchievementsWebSocket() {
  const store = useAchievementsStore()
  const { channel } = useEcho()

  const achChannel = channel('game.achievements')

  achChannel.listen('AchievementUnlocked', (event: any) => {
    store.unlock({
      id: event.id,
      name: event.name,
      description: event.description,
      icon: event.icon ?? '',
      unlocked_at: event.unlocked_at ?? new Date().toISOString(),
    })
  })
}

export function registerAchievementsSocketListeners() {
  let channel
  try {
    channel = echoService.listenToChannel('game.achievements')
  } catch {
    console.debug('[AchievementsSocket] Echo not initialized, skipping listeners')
    return
  }

  channel.listen('AchievementUnlocked', (event: any) => {
    try {
      const store = useAchievementsStore()
      store.unlock({
        id: event.id,
        name: event.name,
        description: event.description,
        icon: event.icon ?? '',
        unlocked_at: event.unlocked_at ?? new Date().toISOString(),
      })
    } catch (e) {
      console.warn('[AchievementsSocket] Handler error', e)
    }
  })
}
