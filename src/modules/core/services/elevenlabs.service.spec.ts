import { vi, describe, it, expect, beforeEach } from 'vitest'
import { elevenLabsService } from './elevenlabs.service'
import { apiService } from './api.service'

vi.mock('./api.service', async () => ({
  apiService: { post: vi.fn(async () => ({ url: 'https://example.com/tts.mp3' })) },
}))

describe('ElevenLabsService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requests TTS from backend and returns url', async () => {
    const url = await elevenLabsService.requestTTS('hola')
    expect(url).toEqual('https://example.com/tts.mp3')
    expect(apiService.post as any).toHaveBeenCalled()
  })
})
