import { apiService } from '@/modules/core/services/api.service'

export class ElevenLabsService {
  // Requests backend to generate/return a signed URL for a TTS audio asset
  async requestTTS(text: string, voice = 'es-CO'): Promise<string> {
    try {
      const payload = { text, voice }
      const res = await apiService.post<{ url: string }>(`/tts`, payload)
      return res.url
    } catch (e) {
      console.warn('[ElevenLabs] TTS request failed', e)
      throw e
    }
  }
}

export const elevenLabsService = new ElevenLabsService()
