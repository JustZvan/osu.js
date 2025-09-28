import { useEffect, useRef } from 'react'

interface RainbowBackgroundProps {
  className?: string
}

export function RainbowBackground({ className }: RainbowBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(null)
  const lastFrameTime = useRef<number>(0)

  const speed = 5
  const intensity = 100
  const targetFPS = 30
  const frameInterval = 1000 / targetFPS
  const pixelRatio = 0.25

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      // Set display size
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'

      // Set actual canvas size (lower resolution for performance)
      canvas.width = Math.floor(window.innerWidth * pixelRatio)
      canvas.height = Math.floor(window.innerHeight * pixelRatio)

      // Scale context to ensure correct drawing operations
      ctx.scale(pixelRatio, pixelRatio)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    let time = 0

    function hslToRgb(
      h: number,
      s: number,
      l: number,
    ): [number, number, number] {
      s /= 100
      l /= 100
      const c = (1 - Math.abs(2 * l - 1)) * s
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
      const m = l - c / 2
      let r = 0,
        g = 0,
        b = 0

      if (0 <= h && h < 60) {
        r = c
        g = x
        b = 0
      } else if (60 <= h && h < 120) {
        r = x
        g = c
        b = 0
      } else if (120 <= h && h < 180) {
        r = 0
        g = c
        b = x
      } else if (180 <= h && h < 240) {
        r = 0
        g = x
        b = c
      } else if (240 <= h && h < 300) {
        r = x
        g = 0
        b = c
      } else if (300 <= h && h < 360) {
        r = c
        g = 0
        b = x
      }

      r = Math.round((r + m) * 255)
      g = Math.round((g + m) * 255)
      b = Math.round((b + m) * 255)

      return [r, g, b]
    }

    function getColorAtPosition(
      x: number,
      y: number,
      t: number,
    ): [number, number, number] {
      const baseHue = (x * 0.3 + y * 0.2 + t * 10) % 360
      const sat = intensity * 0.8
      const light = 45 + Math.sin(x * 0.01 + y * 0.01 + t * 0.1) * 15

      return hslToRgb(baseHue, sat, Math.max(25, Math.min(75, light)))
    }

    function drawRainbow() {
      if (!canvas || !ctx) return

      const imageData = ctx.createImageData(canvas.width, canvas.height)
      const data = imageData.data

      const step = 2

      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const [r, g, b] = getColorAtPosition(x, y, time)

          for (let dy = 0; dy < step && y + dy < canvas.height; dy++) {
            for (let dx = 0; dx < step && x + dx < canvas.width; dx++) {
              const index = ((y + dy) * canvas.width + (x + dx)) * 4
              data[index] = r
              data[index + 1] = g
              data[index + 2] = b
              data[index + 3] = 255
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0)
    }

    function animate(currentTime: number) {
      if (currentTime - lastFrameTime.current < frameInterval) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      lastFrameTime.current = currentTime
      time += speed * 0.02
      drawRainbow()
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
      }}
    />
  )
}
