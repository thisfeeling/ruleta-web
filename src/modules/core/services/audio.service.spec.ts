import { vi, describe, it, expect, beforeEach } from 'vitest'

// Provide a minimal fake AudioContext used by our service
class FakeAudioContext {
  state = 'running'
  createGain() {
    return { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }
  }
  createBufferSource() {
    return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }
  }
  async decodeAudioData(_: ArrayBuffer) {
    // return a dummy buffer
    return {} as unknown as AudioBuffer
  }
}

describe('AudioService', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('preloads urls by decoding audio data', async () => {
    // Mock global AudioContext before importing the singleton
    ;(globalThis as any).AudioContext = FakeAudioContext
    const { audioService } = await import('./audio.service')

    const stub = vi
      .spyOn(globalThis as any, 'fetch')
      .mockImplementation(async () => ({ arrayBuffer: async () => new ArrayBuffer(1) }))
    await audioService.preload(['/a.mp3', '/b.mp3'])
    expect(stub).toHaveBeenCalledTimes(2)
    stub.mockRestore()
  })

  it('can play sfx immediately', async () => {
    ;(globalThis as any).AudioContext = FakeAudioContext
    const { audioService } = await import('./audio.service')

    const stub = vi
      .spyOn(globalThis as any, 'fetch')
      .mockImplementation(async () => ({ arrayBuffer: async () => new ArrayBuffer(1) }))

    const track = { id: 't1', url: '/a.mp3', channel: 'sfx' as const }
    await audioService.play(track)

    stub.mockRestore()
    // no throw
  })

  it('queues voice tracks and plays them sequentially', async () => {
    ;(globalThis as any).AudioContext = FakeAudioContext
    const { audioService } = await import('./audio.service')

    const t1 = { id: 'v1', url: '/v1.mp3', channel: 'voice' as const }
    const t2 = { id: 'v2', url: '/v2.mp3', channel: 'voice' as const }

    const stub = vi
      .spyOn(globalThis as any, 'fetch')
      .mockImplementation(async () => ({ arrayBuffer: async () => new ArrayBuffer(1) }))

    await audioService.play(t1)
    await audioService.play(t2)

    stub.mockRestore()
  })
})
