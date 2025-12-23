import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock echoService in factory to avoid hoisting issues
vi.mock('@/modules/core/services/echo.service', () => {
  const listenToChannel = vi.fn(() => ({ listen: vi.fn() }))
  const listenToPrivateChannel = vi.fn(() => ({ listen: vi.fn(), whisper: vi.fn() }))
  const listenToPresenceChannel = vi.fn(() => ({
    listen: vi.fn(),
    here: vi.fn(),
    joining: vi.fn(),
    leaving: vi.fn(),
  }))
  const leaveChannel = vi.fn()

  return {
    echoService: { listenToChannel, listenToPrivateChannel, listenToPresenceChannel, leaveChannel },
  }
})

describe('useEcho composable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('useEcho returns channel helpers that call echoService', async () => {
    const { useEcho } = await import('./useEcho')
    const { echoService } = await import('@/modules/core/services/echo.service')

    const helpers = useEcho()

    helpers.channel('game.show')
    expect(echoService.listenToChannel).toHaveBeenCalledWith('game.show')

    helpers.privateChannel('private.1')
    expect(echoService.listenToPrivateChannel).toHaveBeenCalledWith('private.1')

    helpers.presenceChannel('presence.1')
    expect(echoService.listenToPresenceChannel).toHaveBeenCalledWith('presence.1')

    helpers.leave('chan')
    expect(echoService.leaveChannel).toHaveBeenCalledWith('chan')
  })

  it('useChannel calls listen on mount and leave on unmount', async () => {
    const { useChannel } = await import('./useEcho')
    const { echoService } = await import('@/modules/core/services/echo.service')

    const TestComp = {
      template: '<div />',
      setup() {
        useChannel('game.show')
      },
    }

    const wrapper = mount(TestComp)
    expect(echoService.listenToChannel).toHaveBeenCalledWith('game.show')

    await wrapper.unmount()
    expect(echoService.leaveChannel).toHaveBeenCalledWith('game.show')
  })
})
