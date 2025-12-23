import Echo from 'laravel-echo'

// Minimal local typings to avoid depending on package-provided types which vary
export type ChannelLike = {
  listen: (event: string, callback: (...args: unknown[]) => void) => void
  stopListening?: (event?: string) => void
}
export type PrivateChannelLike = ChannelLike & { whisper?: (event: string, data: unknown) => void }
export type PresenceChannelLike = ChannelLike & {
  here?: (callback: (members: unknown[]) => void) => void
  joining?: (callback: (member: unknown) => void) => void
  leaving?: (callback: (member: unknown) => void) => void
}

type EchoLike = {
  channel: (name: string) => ChannelLike
  private: (name: string) => PrivateChannelLike
  join: (name: string) => PresenceChannelLike
  leave: (name: string) => void
  disconnect: () => void
}

export class EchoService {
  private echo: EchoLike | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  initialize(): EchoLike | null {
    if (this.echo) {
      console.warn('[Echo] Already initialized')
      return this.echo
    }

    // Note: cast to EchoLike since laravel-echo's runtime exposes these methods
    this.echo = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST,
      wsPort: Number(import.meta.env.VITE_REVERB_PORT) || undefined,
      wssPort: Number(import.meta.env.VITE_REVERB_PORT) || undefined,
      forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
      enabledTransports: ['ws', 'wss'],
    }) as unknown as EchoLike

    // Note: Reverb connector does not expose the same events as Pusher in all builds.
    // We keep minimal connection listeners and re-initialize on errors.

    console.log('[Echo] Initialized')
    return this.echo
  }

  getEcho(): EchoLike | null {
    return this.echo
  }

  disconnect() {
    if (this.echo) {
      try {
        this.echo.disconnect()
      } catch (err) {
        console.warn('[Echo] Error disconnecting', err)
      }
      this.echo = null
      console.log('[Echo] Disconnected')
    }
  }

  listenToChannel(channelName: string): ChannelLike {
    if (!this.echo) {
      throw new Error('[Echo] Not initialized. Call initialize() first.')
    }
    return this.echo.channel(channelName)
  }

  listenToPrivateChannel(channelName: string): PrivateChannelLike {
    if (!this.echo) {
      throw new Error('[Echo] Not initialized. Call initialize() first.')
    }
    return this.echo.private(channelName)
  }

  listenToPresenceChannel(channelName: string): PresenceChannelLike {
    if (!this.echo) {
      throw new Error('[Echo] Not initialized. Call initialize() first.')
    }
    return this.echo.join(channelName)
  }

  leaveChannel(channelName: string) {
    if (this.echo) {
      try {
        this.echo.leave(channelName)
        console.log(`[Echo] Left channel: ${channelName}`)
      } catch (e) {
        console.warn('[Echo] Error leaving channel', e)
      }
    }
  }
}

export const echoService = new EchoService()
