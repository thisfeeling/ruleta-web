import { onMounted, onUnmounted } from 'vue'
import { echoService, type ChannelLike } from '@/modules/core/services/echo.service'

export function useEcho() {
  return {
    channel: (name: string) => echoService.listenToChannel(name),
    privateChannel: (name: string) => echoService.listenToPrivateChannel(name),
    presenceChannel: (name: string) => echoService.listenToPresenceChannel(name),
    leave: (name: string) => echoService.leaveChannel(name),
  }
}

export function useChannel(channelName: string) {
  let channel: ChannelLike | null = null

  onMounted(() => {
    channel = echoService.listenToChannel(channelName)
  })

  onUnmounted(() => {
    if (channel) echoService.leaveChannel(channelName)
  })

  return { channel }
}
