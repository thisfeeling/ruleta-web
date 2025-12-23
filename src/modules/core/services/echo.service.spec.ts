import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock laravel-echo default export as a simple class
vi.mock('laravel-echo', () => {
  class MockEcho {
    constructor() {}
    channel(name: string) {
      return { name, listen: vi.fn() }
    }
    private(name: string) {
      return { name, listen: vi.fn(), whisper: vi.fn() }
    }
    join(name: string) {
      return { name, listen: vi.fn(), here: vi.fn(), joining: vi.fn(), leaving: vi.fn() }
    }
    disconnect() {}
    leave() {}
  }
  return { default: MockEcho }
})

import { echoService } from './echo.service'

describe('EchoService', () => {
  beforeEach(() => {
    echoService.disconnect()
  })

  it('initializes and returns echo-like instance', () => {
    const e = echoService.initialize()
    expect(e).not.toBeNull()
  })

  it('listenToChannel returns a channel-like object', () => {
    echoService.initialize()
    const ch = echoService.listenToChannel('game.show')
    expect(ch).toHaveProperty('listen')
  })

  it('disconnect clears instance without throwing', () => {
    echoService.initialize()
    echoService.disconnect()
    expect(echoService.getEcho()).toBeNull()
  })
})
