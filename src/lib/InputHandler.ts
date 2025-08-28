import { AudioController } from './AudioController'

export class InputHandler {
  static _active: InputHandler | null = null

  mouseX: number = 0
  mouseY: number = 0
  private onMouseMove?: (x: number, y: number) => void
  shouldHit: boolean = false

  constructor(onMouseMove?: (x: number, y: number) => void) {
    InputHandler._active = this
    this.onMouseMove = onMouseMove

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX
      this.mouseY = e.clientY
      this.onMouseMove?.(this.mouseX, this.mouseY)
    })

    window.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault()

      if (e.deltaY < 0) {
        AudioController._active?.gainNode.gain.setValueAtTime(
          Math.min(AudioController._active.gainNode.gain.value + 0.1, 1),
          AudioController._active.context.currentTime,
        )
      } else {
        AudioController._active?.gainNode.gain.setValueAtTime(
          Math.max(AudioController._active.gainNode.gain.value - 0.1, 0),
          AudioController._active.context.currentTime,
        )
      }
    })

    window.addEventListener('keypress', (e) => {
      if (e.key === 'x') {
        this.shouldHit = true
      }
    })
  }

  destroy() {
    if (InputHandler._active === this) {
      InputHandler._active = null
    }
  }
}
