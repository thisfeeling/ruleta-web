import Phaser from 'phaser'
import { useFlappyStore } from './flappy.store'

export function createFlappyGame(containerId = 'flappy-container') {
  const store = useFlappyStore()

  class MainScene extends Phaser.Scene {
    bird: Phaser.Physics.Arcade.Sprite | null = null
    pipes: Phaser.Physics.Arcade.Group | null = null
    spawnTimer: Phaser.Time.TimerEvent | null = null

    constructor() {
      super({ key: 'MainScene' })
    }

    preload() {}

    create() {
      this.cameras.main.setBackgroundColor('#87CEEB')

      // bird as simple rectangle texture
      const gfx = this.add.graphics()
      gfx.fillStyle(0xffdd55, 1)
      gfx.fillRect(0, 0, 34, 24)
      gfx.generateTexture('bird', 34, 24)
      gfx.destroy()

      this.bird = this.physics.add.sprite(100, 300, 'bird')
      this.bird.setCollideWorldBounds(true)
      this.bird.setGravityY(0)
      if (this.bird.body) {
        ;(this.bird.body as Phaser.Physics.Arcade.Body).setSize(34, 24)
      }

      this.pipes = this.physics.add.group()

      this.input.on('pointerdown', () => {
        if (!store.state.isPlaying) {
          store.start()
        }
        if (this.bird) this.bird.setVelocityY(-320)
      })

      this.physics.add.overlap(this.bird!, this.pipes, this.onHit, undefined, this)

      // spawn pipes
      this.spawnTimer = this.time.addEvent({
        delay: 1500,
        loop: true,
        callback: this.spawnPipes,
        callbackScope: this,
      })

      // tick survival time
      this.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          if (store.state.isPlaying) store.tick(100)
        },
      })
    }

    spawnPipes() {
      const gap = 150
      const y = Phaser.Math.Between(150, 450 - gap)

      const top = this.add.rectangle(900, y - gap / 2 - 300, 60, 600, 0x228b22)
      const bottom = this.add.rectangle(900, y + gap / 2 + 300, 60, 600, 0x228b22)
      this.physics.add.existing(top)
      this.physics.add.existing(bottom)
      const topBody = top.body as Phaser.Physics.Arcade.Body
      const bottomBody = bottom.body as Phaser.Physics.Arcade.Body
      topBody.setVelocityX(-200)
      bottomBody.setVelocityX(-200)
      topBody.setImmovable(true)
      bottomBody.setImmovable(true)
      this.pipes!.add(top)
      this.pipes!.add(bottom)

      // clean up offscreen after a while
      this.time.addEvent({
        delay: 6000,
        callback: () => {
          top.destroy()
          bottom.destroy()
        },
      })
    }

    onHit() {
      // Game over: submit score as survivalTime / 100
      store.end(Math.floor(store.state.survivalTime / 100))
      store.state.gameOver = true
      store.state.isPlaying = false
      this.spawnTimer?.remove(false)
    }

    update() {
      if (this.bird && store.state.gameOver) {
        this.bird.setTint(0xff0000)
      }
    }
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: containerId,
    width: 800,
    height: 600,
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1000 } } },
    scene: [MainScene],
  }

  const game = new Phaser.Game(config)
  return game
}
