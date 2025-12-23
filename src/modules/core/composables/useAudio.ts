import { onUnmounted } from 'vue'
import { audioService } from '@/modules/core/services/audio.service'
import type { AudioTrack } from '@/modules/core/services/audio.service'

export function useAudio() {
  onUnmounted(() => {
    // Optionally stop audio when component unmounts
    // audioService.stopAll()
  })

  return {
    play: (track: AudioTrack) => audioService.play(track),
    stop: (channel: Parameters<typeof audioService.stop>[0]) => audioService.stop(channel),
    stopAll: () => audioService.stopAll(),
    setVolume: (channel: Parameters<typeof audioService.setVolume>[0], volume: number) =>
      audioService.setVolume(channel, volume),
    getVolume: (channel: Parameters<typeof audioService.getVolume>[0]) =>
      audioService.getVolume(channel),
    preload: (urls: string[]) => audioService.preload(urls),
  }
}
