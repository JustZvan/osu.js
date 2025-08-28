export class InputHandler {
  static _active: InputHandler | null = null

  mouseX: number = 0
  mouseY: number = 0
  private onMouseMove?: (x: number, y: number) => void

  constructor(onMouseMove?: (x: number, y: number) => void) {
    InputHandler._active = this
    this.onMouseMove = onMouseMove

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX
      this.mouseY = e.clientY
      this.onMouseMove?.(this.mouseX, this.mouseY)
    })
  }

  destroy() {
    if (InputHandler._active === this) {
      InputHandler._active = null
    }
  }
}
