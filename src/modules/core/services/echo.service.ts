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

    // Environment values: frontend expects `VITE_` prefixed vars. We provide fallbacks
    // to plain `REVERB_*` names for convenience when mirroring backend env files.
    const REVERB_KEY = import.meta.env.VITE_REVERB_APP_KEY ?? import.meta.env.REVERB_APP_KEY
    const REVERB_HOST = import.meta.env.VITE_REVERB_HOST ?? import.meta.env.REVERB_HOST
    const REVERB_PORT =
      Number(import.meta.env.VITE_REVERB_PORT ?? import.meta.env.REVERB_PORT) || undefined
    const REVERB_SCHEME =
      import.meta.env.VITE_REVERB_SCHEME ?? import.meta.env.REVERB_SCHEME ?? 'https'
    const REVERB_PATH = import.meta.env.VITE_REVERB_PATH ?? import.meta.env.REVERB_PATH ?? '/ws'
    const FORCE_TLS = REVERB_SCHEME === 'https'

    this.echo = new Echo({
      broadcaster: 'reverb',
      key: REVERB_KEY,
      wsHost: REVERB_HOST,
      wsPort: REVERB_PORT,
      wssPort: REVERB_PORT,
      forceTLS: FORCE_TLS,
      enabledTransports: ['ws', 'wss'],
      // Reverb path (e.g. '/ws') — depending on Echo connector this may be used as `path` or `wsPath`.
      path: REVERB_PATH,
    }) as unknown as EchoLike

    // Setup connection listeners for reconnection/backoff
    this.setupConnectionListeners()

    console.log('[Echo] Initialized')
    return this.echo
  }

  private setupConnectionListeners() {
    if (!this.echo) return

    // Some connector implementations expose nested objects in different shapes
    const connector = (this.echo as unknown as { connector?: unknown })?.connector

    /**
     * Resolve the underlying connection object from different connector shapes.
     *
     * Notes:
     * - Reverb intentionally mimics parts of the Pusher-shaped connector Echo historically used.
     * - We inspect a few possible shapes (pusher-like, socket, reverb) only to obtain a
     *   raw connection/socket so we can bind reconnection events (connected/disconnected/etc.).
     * - This DOES NOT mean we use Pusher service; do NOT add `pusher-js` or assume Pusher is used.
     *   Echo is configured for Reverb via `broadcaster: 'reverb'` in `initialize()`.
     */
    const resolveConnection = (conn: unknown): unknown => {
      if (typeof conn !== 'object' || conn === null) return undefined
      const c = conn as Record<string, unknown>

      // Some connectors expose a Pusher-shaped object. We treat it as "pusher-like" for
      // compatibility, but we do not depend on the Pusher service here.
      const maybePusherLike = c.pusher as Record<string, unknown> | undefined
      if (maybePusherLike && typeof maybePusherLike.connection !== 'undefined')
        return maybePusherLike.connection

      // Generic socket-based connectors
      if (typeof c.socket !== 'undefined') return c.socket

      // Reverb-specific connector shape
      const maybeReverb = c.reverb as Record<string, unknown> | undefined
      if (maybeReverb && typeof maybeReverb.socket !== 'undefined') return maybeReverb.socket

      return undefined
    }

    const connection = resolveConnection(connector)
    try {
      type Bindable = { bind: (event: string, callback: (...args: unknown[]) => void) => void }

      if (connection && typeof (connection as Bindable).bind === 'function') {
        const conn = connection as Bindable
        const onFailure = () => this.handleReconnect()

        // Reset attempts on connected
        try {
          conn.bind('connected', () => {
            this.reconnectAttempts = 0
          })
        } catch {}

        // Bind common failure events
        try {
          conn.bind('disconnected', onFailure)
        } catch {}
        try {
          conn.bind('error', onFailure)
        } catch {}
        try {
          conn.bind('connect_error', onFailure)
        } catch {}
        try {
          conn.bind('close', onFailure)
        } catch {}
      }
    } catch {
      // Not all connectors expose events - ignore
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Echo] Max reconnection attempts reached')
      try {
        window.dispatchEvent(new CustomEvent('echo:connection-failed'))
      } catch {}
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts - 1))
    console.log(`[Echo] Reconnecting... Attempt ${this.reconnectAttempts} in ${delay}ms`)

    setTimeout(() => {
      try {
        this.disconnect()
        this.initialize()
      } catch (e) {
        console.warn('[Echo] Reconnect attempt failed', e)
        // schedule next attempt
        this.handleReconnect()
      }
    }, delay)
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
