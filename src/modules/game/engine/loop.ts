export class GameLoop {
  private running = false
  private frameId: number | null = null
  private lastTime = 0

  start(callback: (deltaTime: number) => void) {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()

    const tick = (t: number) => {
      if (!this.running) return
      const delta = (t - this.lastTime) / 1000
      this.lastTime = t
      try {
        callback(delta)
      } catch (err) {
        console.error('[GameLoop] callback error', err)
      }
      this.frameId = requestAnimationFrame(tick)
    }

    this.frameId = requestAnimationFrame(tick)
  }

  stop() {
    this.running = false
    if (this.frameId != null) cancelAnimationFrame(this.frameId)
    this.frameId = null
  }

  isRunning() {
    return this.running
  }
}
