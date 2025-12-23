import { useSupervisorStore } from './supervisor.store'
import { echoService } from '@/modules/core/services/echo.service'

function registerOnChannel(channelName: string) {
  let channel
  try {
    channel = echoService.listenToChannel(channelName)
  } catch {
    console.debug(`[SupervisorSocket] Echo not initialized, skipping listeners for ${channelName}`)
    return
  }

  channel.listen('SpellAudioPending', (event: any) => {
    try {
      const store = useSupervisorStore()
      const payload = event ?? {}
      const validation = {
        id: payload.audio_id ?? payload.id ?? String(Date.now()),
        player_id: payload.player?.id ?? payload.player_id ?? 0,
        player_number: payload.player?.number ?? payload.player_number ?? 0,
        nickname: payload.player?.nickname ?? payload.nickname ?? 'Jugador',
        word: payload.word ?? payload.text ?? '',
        audio_url: payload.audio_url ?? payload.url ?? '',
        uploaded_at: payload.uploaded_at ?? new Date().toISOString(),
      }
      store.addValidation(validation)
    } catch (e) {
      console.warn('[SupervisorSocket] Handler error', e)
    }
  })
}

export function registerSupervisorSocketListeners() {
  registerOnChannel('game.show')
  registerOnChannel('game.supervisor')
}
