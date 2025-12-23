import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock audioService module in a factory to avoid hoisting issues
vi.mock('@/modules/core/services/audio.service', () => {
  const play = vi.fn()
  const stop = vi.fn()
  const stopAll = vi.fn()
  const setVolume = vi.fn()
  const getVolume = vi.fn(() => 0.5)
  const preload = vi.fn()

  return { audioService: { play, stop, stopAll, setVolume, getVolume, preload } }
})

describe('useAudio composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes play/stop/stopAll/setVolume/getVolume/preload and delegates to audioService', async () => {
    const { useAudio } = await import('./useAudio')
    const { audioService } = await import('@/modules/core/services/audio.service')

    const composable = useAudio()

    const track = { id: 't1', url: '/a.mp3', channel: 'sfx' as const }
    composable.play(track)
    expect(audioService.play).toHaveBeenCalledWith(track)

    composable.stop('music')
    expect(audioService.stop).toHaveBeenCalledWith('music')

    composable.stopAll()
    expect(audioService.stopAll).toHaveBeenCalled()

    composable.setVolume('voice', 0.2)
    expect(audioService.setVolume).toHaveBeenCalledWith('voice', 0.2)

    const vol = composable.getVolume('voice')
    expect(vol).toEqual(0.5)

    composable.preload(['/a.mp3'])
    expect(audioService.preload).toHaveBeenCalledWith(['/a.mp3'])
  })
})
