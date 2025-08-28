import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { GameController } from '@/lib/GameController'
import { useAnimationFrame } from '@/lib/hooks/useAnimationFrame'
import { calculateSliderPath, getSliderBallPosition } from '@/lib/SliderUtils'
import { parseOszFile } from '@/lib/osu/compressed'

export const Route = createFileRoute('/test')({
  component: App,
})

function App() {
  const [gc, setGc] = useState<GameController>()
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    async function main() {
      const { beatmaps, files } = await parseOszFile('/badapple.osz')

      const hardBeatmap =
        beatmaps.find((b) => b.metadata.version === 'Insane') || beatmaps[0]

      console.log(hardBeatmap)

      if (!hardBeatmap) {
        console.error('No beatmap found')
        return
      }

      const audioFilename = hardBeatmap.general.audioFilename
      const audioFile = files[audioFilename]

      if (!audioFile) {
        console.error('Audio file not found:', audioFilename)
        return
      }

      const gc = new GameController(hardBeatmap, audioFile)
      setGc(gc)

      const img = new window.Image()
      img.src = '/skin/hitcircleoverlay.png'
      img.onload = () => setImage(img)

      const backgroundEvent = hardBeatmap.events.find((event) =>
        event.startsWith('0,0,'),
      )

      if (backgroundEvent) {
        const parts = backgroundEvent.split(',')
        const backgroundFilename = parts[2].replace(/"/g, '')
        const backgroundFile = files[backgroundFilename]

        if (backgroundFile) {
          const blob = new Blob([backgroundFile.buffer as ArrayBuffer])
          const backgroundUrl = URL.createObjectURL(blob)
          const bgImg = new window.Image()
          bgImg.style.opacity = '0.25'

          bgImg.src = backgroundUrl
          bgImg.onload = () => setBackgroundImage(bgImg)
        }
      }
    }

    main()
  }, [])

  useAnimationFrame(() => {
    if (!canvas.current || !image || !gc) return

    const context = canvas.current.getContext('2d')!
    const currentTime = gc.audioController.getTime()
    const circles = gc.getVisibleCircles(currentTime)
    const sliders = gc.getVisibleSliders(currentTime)

    context.clearRect(0, 0, canvas.current.width, canvas.current.height)

    if (backgroundImage) {
      const bgScaleX = canvas.current.width / backgroundImage.width
      const bgScaleY = canvas.current.height / backgroundImage.height
      const scale = Math.max(bgScaleX, bgScaleY)

      const scaledWidth = backgroundImage.width * scale
      const scaledHeight = backgroundImage.height * scale

      const x = (canvas.current.width - scaledWidth) / 2
      const y = (canvas.current.height - scaledHeight) / 2

      context.drawImage(backgroundImage, x, y, scaledWidth, scaledHeight)
    }

    const zoomFactor = 0.9

    const gameplayWidth = canvas.current.width * zoomFactor
    const gameplayHeight = canvas.current.height * zoomFactor
    const offsetX = (canvas.current.width - gameplayWidth) / 2
    const offsetY = (canvas.current.height - gameplayHeight) / 2

    context.save()
    context.translate(offsetX, offsetY)
    context.scale(zoomFactor, zoomFactor)

    const scaleX = canvas.current.width / 512
    const scaleY = canvas.current.height / 384

    const cs = parseFloat(gc.beatmap.difficulty.circleSize) || 5
    const circleRadius = 54.4 - 4.48 * cs
    const circleSize = circleRadius * 2 * Math.min(scaleX, scaleY)

    const currentTimeMs = currentTime * 1000
    const sliderMultiplier =
      parseFloat(gc.beatmap.difficulty.sliderMultiplier) || 1.4

    sliders?.forEach((slider) => {
      const sliderPath = calculateSliderPath(slider)

      if (sliderPath.points.length > 1) {
        const trackWidth = circleSize * 0.9

        context.save()
        context.beginPath()
        context.strokeStyle = '#333333'
        context.lineWidth = trackWidth + 8
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.beginPath()
        context.strokeStyle = '#333333'
        context.lineWidth = trackWidth + 8
        context.lineCap = 'round'
        context.lineJoin = 'round'

        const firstPoint = sliderPath.points[0]
        context.moveTo(firstPoint.x * scaleX, firstPoint.y * scaleY)

        for (let i = 1; i < sliderPath.points.length; i++) {
          const point = sliderPath.points[i]
          context.lineTo(point.x * scaleX, point.y * scaleY)
        }

        context.stroke()

        context.beginPath()
        context.strokeStyle = '#000'
        context.lineWidth = trackWidth
        context.lineCap = 'round'
        context.lineJoin = 'round'

        context.moveTo(firstPoint.x * scaleX, firstPoint.y * scaleY)
        for (let i = 1; i < sliderPath.points.length; i++) {
          const point = sliderPath.points[i]
          context.lineTo(point.x * scaleX, point.y * scaleY)
        }

        context.stroke()

        context.restore()
      }

      const scaledX = slider.x * scaleX
      const scaledY = slider.y * scaleY

      const preemptTime = 300
      const timeSinceAppear = currentTimeMs - (slider.time - preemptTime)
      const approachProgress = Math.max(
        0,
        Math.min(1, timeSinceAppear / preemptTime),
      )

      if (currentTimeMs < slider.time) {
        const approachCircleScale = 2 - 1 * approachProgress
        const approachRadius = (circleSize / 2) * approachCircleScale

        context.beginPath()
        context.strokeStyle = '#FFFFFF'
        context.lineWidth = 3
        context.arc(scaledX, scaledY, approachRadius, 0, Math.PI * 2)
        context.stroke()

        context.beginPath()
        context.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        context.lineWidth = 6
        context.arc(scaledX, scaledY, approachRadius, 0, Math.PI * 2)
        context.stroke()
      }

      context.drawImage(
        image,
        scaledX - circleSize / 2,
        scaledY - circleSize / 2,
        circleSize,
        circleSize,
      )

      if (sliderPath.points.length > 0) {
        const endPoint = sliderPath.points[sliderPath.points.length - 1]
        const endX = endPoint.x * scaleX
        const endY = endPoint.y * scaleY

        context.drawImage(
          image,
          endX - circleSize / 2,
          endY - circleSize / 2,
          circleSize,
          circleSize,
        )
      }

      const beatLength = gc.getBeatLengthAt(slider.time)

      const ballPosition = getSliderBallPosition(
        slider,
        currentTimeMs,
        sliderPath,
        sliderMultiplier,
        beatLength,
      )

      if (ballPosition) {
        const ballX = ballPosition.x * scaleX
        const ballY = ballPosition.y * scaleY
        const ballSize = circleSize * 0.25

        const gradient = context.createRadialGradient(
          ballX,
          ballY,
          0,
          ballX,
          ballY,
          ballSize,
        )
        gradient.addColorStop(0, '#FFFFFF')
        gradient.addColorStop(0.7, '#DDDDDD')
        gradient.addColorStop(1, '#AAAAAA')

        context.beginPath()
        context.fillStyle = gradient
        context.arc(ballX, ballY, ballSize, 0, Math.PI * 2)
        context.fill()

        context.beginPath()
        context.strokeStyle = '#666666'
        context.lineWidth = 2
        context.arc(ballX, ballY, ballSize, 0, Math.PI * 2)
        context.stroke()
      }
    })

    circles?.forEach((circle) => {
      const scaledX = circle.x * scaleX
      const scaledY = circle.y * scaleY

      const preemptTime = 600
      const timeSinceAppear = currentTimeMs - (circle.time - preemptTime)
      const approachProgress = Math.max(
        0,
        Math.min(1, timeSinceAppear / preemptTime),
      )

      if (currentTimeMs < circle.time) {
        const approachCircleScale = 2 - 1 * approachProgress
        const approachRadius = (circleSize / 2) * approachCircleScale

        context.beginPath()
        context.strokeStyle = '#FFFFFF'
        context.lineWidth = 3
        context.arc(scaledX, scaledY, approachRadius, 0, Math.PI * 2)
        context.stroke()

        context.beginPath()
        context.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        context.lineWidth = 6
        context.arc(scaledX, scaledY, approachRadius, 0, Math.PI * 2)
        context.stroke()
      }

      context.save()
      context.beginPath()
      context.arc(scaledX, scaledY, (circleSize * 0.9) / 2, 0, Math.PI * 2)
      context.closePath()
      context.fillStyle = '#000'
      context.globalAlpha = 1
      context.fill()
      context.restore()

      context.drawImage(
        image,
        scaledX - circleSize / 2,
        scaledY - circleSize / 2,
        circleSize,
        circleSize,
      )
    })

    context.restore()
  })

  return (
    <div className="h-screen w-screen bg-black">
      <canvas
        ref={canvas}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{ width: '100vw', height: '100vh', display: 'block' }}
      />
    </div>
  )
}
