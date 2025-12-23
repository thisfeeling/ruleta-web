export type AudioChannel = 'music' | 'sfx' | 'voice'

export interface AudioTrack {
  id: string
  url: string
  channel: AudioChannel
  loop?: boolean
  volume?: number
}

class AudioChannelController {
  private context: AudioContext
  private gainNode: GainNode
  private currentSource: AudioBufferSourceNode | null = null
  private currentBuffer: AudioBuffer | null = null
  private endedCallback: (() => void) | null = null

  constructor(context: AudioContext, volume: number) {
    this.context = context
    this.gainNode = context.createGain()
    this.gainNode.gain.value = volume
    this.gainNode.connect(context.destination)
  }

  async play(track: AudioTrack): Promise<void> {
    this.stop()
    try {
      const response = await fetch(track.url)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = await this.context.decodeAudioData(arrayBuffer)

      const source = this.context.createBufferSource()
      source.buffer = buffer
      source.loop = !!track.loop

      const trackGain = this.context.createGain()
      trackGain.gain.value = typeof track.volume === 'number' ? track.volume : 1
      source.connect(trackGain)
      trackGain.connect(this.gainNode)

      source.onended = () => {
        if (this.endedCallback) this.endedCallback()
      }

      source.start(0)
      this.currentSource = source
      this.currentBuffer = buffer
      console.log(`[Audio] Playing: ${track.id} on ${track.channel}`)
    } catch (error) {
      console.error(`[Audio] Failed to play track ${track.id}:`, error)
    }
  }

  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.onended = null
        this.currentSource.stop()
      } catch {
        // ignore
      }
      this.currentSource = null
    }
  }

  setVolume(volume: number) {
    this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
  }

  getVolume(): number {
    return this.gainNode.gain.value
  }

  onEnded(callback: () => void) {
    this.endedCallback = callback
  }
}

export class AudioService {
  private context: AudioContext
  private channels: Map<AudioChannel, AudioChannelController>
  private voiceQueue: AudioTrack[] = []
  private isPlayingVoice = false

  private defaultVolumes: Record<AudioChannel, number> = {
    music: 0.6,
    sfx: 0.8,
    voice: 1.0,
  }

  constructor() {
    // Support webkit prefixed context
    // Support vendor-prefixed AudioContext in some browsers
    const win = window as unknown as { webkitAudioContext?: typeof AudioContext }
    this.context = new (window.AudioContext || win.webkitAudioContext)()

    this.channels = new Map([
      ['music', new AudioChannelController(this.context, this.defaultVolumes.music)],
      ['sfx', new AudioChannelController(this.context, this.defaultVolumes.sfx)],
      ['voice', new AudioChannelController(this.context, this.defaultVolumes.voice)],
    ])

    this.setupAutoplayUnlock()
  }

  private setupAutoplayUnlock() {
    const unlock = () => {
      if (this.context.state === 'suspended') {
        try {
          this.context.resume()
        } catch {
          // ignore
        }
      }
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
    }
    document.addEventListener('click', unlock)
    document.addEventListener('touchstart', unlock)
  }

  async play(track: AudioTrack): Promise<void> {
    const channel = this.channels.get(track.channel)
    if (!channel) {
      console.error(`[Audio] Invalid channel: ${track.channel}`)
      return
    }

    if (track.channel === 'voice') {
      this.voiceQueue.push(track)
      if (!this.isPlayingVoice) {
        this.processVoiceQueue()
      }
      return
    }

    await channel.play(track)
  }

  private async processVoiceQueue() {
    if (this.voiceQueue.length === 0) {
      this.isPlayingVoice = false
      return
    }

    this.isPlayingVoice = true
    const track = this.voiceQueue.shift()!
    const channel = this.channels.get('voice')!

    await channel.play(track)

    channel.onEnded(() => {
      this.processVoiceQueue()
    })
  }

  stop(channel: AudioChannel) {
    this.channels.get(channel)?.stop()
  }

  stopAll() {
    this.channels.forEach((ch) => ch.stop())
    this.voiceQueue = []
    this.isPlayingVoice = false
  }

  setVolume(channel: AudioChannel, volume: number) {
    this.channels.get(channel)?.setVolume(volume)
  }

  getVolume(channel: AudioChannel): number {
    return this.channels.get(channel)?.getVolume() ?? 0
  }

  async preload(urls: string[]): Promise<void> {
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const arrayBuffer = await res.arrayBuffer()
          await this.context.decodeAudioData(arrayBuffer)
          return { url, ok: true }
        } catch (err: unknown) {
          // Decoding failures can happen in dev / preview environments; log at debug level
          // to avoid cluttering the console for end users.

          console.debug('[Audio] Failed to preload', url, err)
          return { url, ok: false, err }
        }
      }),
    )

    const successes = results.filter((r) => r.ok).length
    const failures = results.length - successes
    // Use debug so non-critical preload failures don't show as warnings in dev consoles
    // (they can still be inspected by enabling verbose logging).

    console.debug(`[Audio] Preloaded ${successes}/${urls.length} tracks (${failures} failed)`)
  }
}

export const audioService = new AudioService()
