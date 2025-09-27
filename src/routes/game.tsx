import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState, useCallback } from 'react'
import { GameController } from '@/lib/GameController'
import useInterval from '@/lib/hooks/useInterval'
import { calculateSliderPath, getSliderBallPosition } from '@/lib/SliderUtils'
import { parseOszFile } from '@/lib/osu/compressed'
import useInputHandler from '@/lib/hooks/useInputHandler'
import { preemptTime } from '@/lib/GameController'
import { InputHandler } from '@/lib/InputHandler'
import { AudioController } from '@/lib/AudioController'
import { Beatmap } from '@/lib/osu/parser'

export const Route = createFileRoute('/game')({
  component: App,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      oszUrl: search.oszUrl as string | undefined,
      beatmapInfo: search.beatmapInfo as string | undefined,
      difficulties: search.difficulties as string | undefined,
      selectedDifficulty: search.selectedDifficulty as string | undefined,
    }
  },
})

function App() {
  const {
    oszUrl,
    difficulties,
    beatmapInfo,
    selectedDifficulty: preSelectedDifficulty,
  } = Route.useSearch()
  const [gc, setGc] = useState<GameController>()
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const inputHandler = useInputHandler()
  const [score, setScore] = useState(0)

  const [combo, setCombo] = useState(0)

  const [showDifficultySelect, setShowDifficultySelect] = useState(false)
  const [availableDifficulties, setAvailableDifficulties] = useState<
    Array<{
      version: string
      artist: string
      title: string
      creator: string
    }>
  >([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null,
  )
  const [allBeatmaps, setAllBeatmaps] = useState<Beatmap[]>([])
  const [oszFiles, setOszFiles] = useState<any>(null)

  useEffect(() => {
    async function main() {
      if (showDifficultySelect) {
        return
      }

      if (selectedDifficulty && oszUrl) {
        return
      }

      if (oszUrl && difficulties) {
        try {
          const parsedDifficulties = JSON.parse(difficulties)
          setAvailableDifficulties(parsedDifficulties)

          const { beatmaps, files } = await parseOszFile(oszUrl)
          setAllBeatmaps(beatmaps)
          setOszFiles(files)

          // If we have pre-selected difficulty from beatmapInfo, use it directly
          if (preSelectedDifficulty) {
            const selectedBeatmap = beatmaps.find(
              (b) => b.metadata.version === preSelectedDifficulty,
            )
            if (selectedBeatmap) {
              setSelectedDifficulty(preSelectedDifficulty)
              await loadBeatmap(selectedBeatmap, files)
              return
            }
          }

          // If we have beatmapInfo with selectedSubmap, find the matching beatmap
          if (beatmapInfo) {
            const parsedBeatmapInfo = JSON.parse(beatmapInfo)
            if (parsedBeatmapInfo.selectedSubmap) {
              const selectedBeatmap = beatmaps.find(
                (b) =>
                  b.metadata.version ===
                  parsedBeatmapInfo.selectedSubmap.version,
              )
              if (selectedBeatmap) {
                setSelectedDifficulty(selectedBeatmap.metadata.version)
                await loadBeatmap(selectedBeatmap, files)
                return
              }
            }
          }

          if (beatmaps.length > 1) {
            setShowDifficultySelect(true)
            return
          } else {
            setSelectedDifficulty(beatmaps[0].metadata.version)
            await loadBeatmap(beatmaps[0], files)
          }
        } catch (error) {
          console.error('Failed to load custom beatmap:', error)
          await loadDemoBeatmap()
        }
      } else {
        await loadDemoBeatmap()
      }
    }

    async function loadDemoBeatmap() {
      const { beatmaps, files } = await parseOszFile('/badapple.osz')

      const hardBeatmap =
        beatmaps.find((b) => b.metadata.version === 'Hard') || beatmaps[0]

      if (!hardBeatmap) {
        console.error('No beatmap found')
        return
      }

      await loadBeatmap(hardBeatmap, files)
    }

    async function loadBeatmap(beatmap: Beatmap, files: any) {
      console.log(beatmap)

      const audioFilename = beatmap.general.audioFilename
      const audioFile = files[audioFilename]

      if (!audioFile) {
        console.error('Audio file not found:', audioFilename)
        return
      }

      const gc = new GameController(beatmap, audioFile)
      setGc(gc)

      const img = new window.Image()
      img.src = '/skin/hitcircleoverlay.png'
      img.onload = () => setImage(img)

      const backgroundEvent = beatmap.events.find((event) =>
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
  }, [oszUrl, difficulties, beatmapInfo, preSelectedDifficulty])

  const handleDifficultySelect = async (difficultyVersion: string) => {
    const selectedBeatmap = allBeatmaps.find(
      (b) => b.metadata.version === difficultyVersion,
    )
    if (selectedBeatmap && oszFiles) {
      setSelectedDifficulty(difficultyVersion)
      setShowDifficultySelect(false)

      setGc(undefined)
      setImage(null)
      setBackgroundImage(null)
      setScore(0)

      const audioFilename = selectedBeatmap.general.audioFilename
      const audioFile = oszFiles[audioFilename]

      if (!audioFile) {
        console.error('Audio file not found:', audioFilename)
        return
      }

      const gc = new GameController(selectedBeatmap, audioFile)
      setGc(gc)

      const img = new window.Image()
      img.src = '/skin/hitcircleoverlay.png'
      img.onload = () => setImage(img)

      const backgroundEvent = selectedBeatmap.events.find((event) =>
        event.startsWith('0,0,'),
      )

      if (backgroundEvent) {
        const parts = backgroundEvent.split(',')
        const backgroundFilename = parts[2].replace(/"/g, '')
        const backgroundFile = oszFiles[backgroundFilename]

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
  }

  const approachCircleImg = useRef<HTMLImageElement | null>(null)
  useEffect(() => {
    const img = new window.Image()
    img.src = '/skin/approachcircle.png'
    img.onload = () => {
      approachCircleImg.current = img
    }
  }, [])

  const render = useCallback(async () => {
    if (!canvas.current || !image || !gc) return

    const context = canvas.current.getContext('2d')!

    const circles = await gc?.getVisibleCircles()
    const sliders = await gc?.getVisibleSliders()
    const spinners = await gc?.getVisibleSpinners()

    context.clearRect(0, 0, canvas.current.width, canvas.current.height)

    if (backgroundImage) {
      const bgScaleX = canvas.current.width / backgroundImage.width
      const bgScaleY = canvas.current.height / backgroundImage.height
      const scale = Math.max(bgScaleX, bgScaleY)

      const scaledWidth = backgroundImage.width * scale
      const scaledHeight = backgroundImage.height * scale

      const x = (canvas.current.width - scaledWidth) / 2
      const y = (canvas.current.height - scaledHeight) / 2

      context.fillStyle = '#000'
      context.globalAlpha = 0.4
      context.fill()
      context.restore()

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

    const currentTime = await gc.audioController.getTime()
    const currentTimeMs = currentTime * 1000
    const sliderMultiplier =
      parseFloat(gc.beatmap.difficulty.sliderMultiplier) || 1.4

    sliders?.forEach((slider) => {
      if (!slider.shouldRender) {
        return
      }

      const sliderAny = slider as any
      if (sliderAny.userProgress === undefined) sliderAny.userProgress = 0
      if (sliderAny.isActive === undefined) sliderAny.isActive = false

      const beatLength = gc.getBeatLengthAt(slider.time)
      const pixelsPerBeat = sliderMultiplier * 100
      const slideDuration = (slider.params.length / pixelsPerBeat) * beatLength
      const endTime = slider.time + slideDuration * slider.params.slides
      const fadeOutTime = 100
      const timeSinceEnd = currentTimeMs - endTime
      const alpha =
        timeSinceEnd > 0 ? Math.max(0, 1 - timeSinceEnd / fadeOutTime) : 1

      const sliderPath = calculateSliderPath(slider)

      const ballPosition = getSliderBallPosition(
        slider,
        currentTimeMs,
        sliderPath,
        sliderMultiplier,
        beatLength,
      )

      if (
        currentTimeMs > endTime ||
        sliderAny.userProgress >= slideDuration * slider.params.slides
      ) {
        slider.shouldRender = false
        return
      }

      if (sliderPath.points.length > 1) {
        const trackWidth = circleSize * 0.9

        const sliderProgress = Math.max(
          0,
          (currentTimeMs - slider.time) /
            (slideDuration * slider.params.slides),
        )
        const totalPathLength = sliderPath.points.length - 1

        const currentRepeat = Math.floor(sliderProgress * slider.params.slides)
        const repeatProgress = (sliderProgress * slider.params.slides) % 1
        const isReverse = currentRepeat % 2 === 1

        let pathProgress = isReverse ? 1 - repeatProgress : repeatProgress
        pathProgress = Math.max(0, Math.min(1, pathProgress))

        const completedPoints = Math.floor(pathProgress * totalPathLength)
        const segmentProgress = (pathProgress * totalPathLength) % 1

        context.save()
        context.globalAlpha = alpha / 2

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

        if (currentTimeMs < slider.time) {
          context.moveTo(firstPoint.x * scaleX, firstPoint.y * scaleY)
          for (let i = 1; i < sliderPath.points.length; i++) {
            const point = sliderPath.points[i]
            context.lineTo(point.x * scaleX, point.y * scaleY)
          }
        } else {
          if (isReverse) {
            if (completedPoints > 0 || segmentProgress > 0) {
              context.moveTo(firstPoint.x * scaleX, firstPoint.y * scaleY)

              for (
                let i = 1;
                i <= completedPoints && i < sliderPath.points.length;
                i++
              ) {
                const point = sliderPath.points[i]
                context.lineTo(point.x * scaleX, point.y * scaleY)
              }

              if (
                segmentProgress > 0 &&
                completedPoints < sliderPath.points.length - 1
              ) {
                const currentPoint = sliderPath.points[completedPoints]
                const nextPoint = sliderPath.points[completedPoints + 1]
                const interpX =
                  currentPoint.x +
                  (nextPoint.x - currentPoint.x) * segmentProgress
                const interpY =
                  currentPoint.y +
                  (nextPoint.y - currentPoint.y) * segmentProgress
                context.lineTo(interpX * scaleX, interpY * scaleY)
              }
            }
          } else {
            if (completedPoints < sliderPath.points.length - 1) {
              let startPoint
              if (
                segmentProgress > 0 &&
                completedPoints < sliderPath.points.length - 1
              ) {
                const currentPoint = sliderPath.points[completedPoints]
                const nextPoint = sliderPath.points[completedPoints + 1]
                startPoint = {
                  x:
                    currentPoint.x +
                    (nextPoint.x - currentPoint.x) * segmentProgress,
                  y:
                    currentPoint.y +
                    (nextPoint.y - currentPoint.y) * segmentProgress,
                }
              } else {
                startPoint = sliderPath.points[completedPoints]
              }

              context.moveTo(startPoint.x * scaleX, startPoint.y * scaleY)

              for (
                let i = completedPoints + 1;
                i < sliderPath.points.length;
                i++
              ) {
                const point = sliderPath.points[i]
                context.lineTo(point.x * scaleX, point.y * scaleY)
              }
            }
          }
        }

        context.stroke()

        context.restore()
        context.globalAlpha = 1
      }

      const scaledX = slider.x * scaleX
      const scaledY = slider.y * scaleY

      const timeSinceAppear = currentTimeMs - (slider.time - preemptTime)
      const approachProgress = Math.max(
        0,
        Math.min(1, timeSinceAppear / preemptTime),
      )

      if (currentTimeMs < slider.time) {
        const approachCircleScale = 2 - 1 * approachProgress
        const approachRadius = (circleSize / 2) * approachCircleScale

        context.globalAlpha = alpha
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
        context.globalAlpha = 1
      }

      context.globalAlpha = alpha
      context.drawImage(
        image,
        scaledX - circleSize / 2,
        scaledY - circleSize / 2,
        circleSize,
        circleSize,
      )
      context.globalAlpha = 1

      if (sliderPath.points.length > 0) {
        const endPoint = sliderPath.points[sliderPath.points.length - 1]
        const endX = endPoint.x * scaleX
        const endY = endPoint.y * scaleY

        context.globalAlpha = alpha
        context.drawImage(
          image,
          endX - circleSize / 2,
          endY - circleSize / 2,
          circleSize,
          circleSize,
        )
        context.globalAlpha = 1
      }

      if (ballPosition) {
        const ballX = ballPosition.x * scaleX
        const ballY = ballPosition.y * scaleY

        context.save()
        context.beginPath()
        context.arc(ballX, ballY, (circleSize * 0.9) / 2, 0, Math.PI * 2)
        context.closePath()
        context.fillStyle = '#000'
        context.globalAlpha = alpha / 2
        context.fill()
        context.restore()

        context.save()
        context.beginPath()
        context.arc(ballX, ballY, circleSize, 0, Math.PI * 2)
        context.closePath()
        context.strokeStyle = '#FFFFFF'
        context.lineWidth = 3
        context.stroke()
        context.restore()

        context.globalAlpha = alpha
        context.drawImage(
          image,
          ballX - circleSize / 2,
          ballY - circleSize / 2,
          circleSize,
          circleSize,
        )
        context.globalAlpha = 1
      }
    })

    spinners?.forEach((spinner) => {
      if (!spinner.shouldRender) {
        return
      }

      const scaledX = spinner.x * scaleX
      const scaledY = spinner.y * scaleY

      const progress = Math.max(
        0,
        Math.min(
          1,
          (currentTimeMs - spinner.time) /
            (spinner.params.endTime - spinner.time),
        ),
      )

      const spinnerAny = spinner as any
      if (spinnerAny.rotation === undefined) spinnerAny.rotation = 0

      if (spinnerAny.spinsRequired === undefined) {
        const duration = spinner.params.endTime - spinner.time
        spinnerAny.spinsRequired = Math.max(3, Math.floor(duration / 500))
      }

      if (spinnerAny.spinsCompleted === undefined) spinnerAny.spinsCompleted = 0

      let outerRadius = 300 * (1 - progress)

      context.strokeStyle = '#FFFFFF'
      context.lineWidth = 3
      context.beginPath()
      context.arc(scaledX, scaledY, outerRadius, 0, Math.PI * 2)
      context.stroke()
    })

    circles?.forEach((circle) => {
      if (!circle.shouldRender) {
        return
      }

      const scaledX = circle.x * scaleX
      const scaledY = circle.y * scaleY

      const fadeOutTime = 100
      const timeSinceHit = currentTimeMs - circle.time
      const alpha =
        timeSinceHit > 0 ? Math.max(0, 1 - timeSinceHit / fadeOutTime) : 1

      const preemptTime = 600
      const timeSinceAppear = currentTimeMs - (circle.time - preemptTime)
      const approachProgress = Math.max(
        0,
        Math.min(1, timeSinceAppear / preemptTime),
      )

      if (currentTimeMs < circle.time && image) {
        const approachCircleScale = 2 - 1 * approachProgress
        const approachRadius = (circleSize / 2) * approachCircleScale

        context.globalAlpha = alpha
        if (approachCircleImg.current && approachCircleImg.current.complete) {
          context.drawImage(
            approachCircleImg.current,
            scaledX - approachRadius,
            scaledY - approachRadius,
            approachRadius * 2,
            approachRadius * 2,
          )
        } else {
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
        context.globalAlpha = 1
      }

      context.save()
      context.beginPath()
      context.arc(scaledX, scaledY, (circleSize * 0.9) / 2, 0, Math.PI * 2)
      context.closePath()
      context.fillStyle = '#000'
      context.globalAlpha = alpha / 2
      context.fill()
      context.restore()

      context.globalAlpha = alpha
      context.drawImage(
        image,
        scaledX - circleSize / 2,
        scaledY - circleSize / 2,
        circleSize,
        circleSize,
      )
      context.globalAlpha = 1
    })

    context.restore()
  }, [canvas, image, gc, backgroundImage, inputHandler, approachCircleImg])

  useInterval(async () => {
    if (!gc) return

    const circles = await gc?.getVisibleCircles()
    const sliders = await gc?.getVisibleSliders()
    const spinners = await gc?.getVisibleSpinners()

    const currentTime = await gc.audioController.getTime()
    const currentTimeMs = currentTime * 1000
    const sliderMultiplier =
      parseFloat(gc.beatmap.difficulty.sliderMultiplier) || 1.4

    // Handle spinner spinning logic
    spinners?.forEach((spinner) => {
      if (!spinner.shouldRender) {
        return
      }

      const spinnerAny = spinner as any
      if (spinnerAny.rotation === undefined) spinnerAny.rotation = 0
      if (spinnerAny.spinsRequired === undefined) {
        const duration = spinner.params.endTime - spinner.time
        spinnerAny.spinsRequired = Math.max(3, Math.floor(duration / 500))
      }
      if (spinnerAny.spinsCompleted === undefined) spinnerAny.spinsCompleted = 0
      if (spinnerAny.lastMouseAngle === undefined) spinnerAny.lastMouseAngle = 0
      if (spinnerAny.lastRotationTime === undefined)
        spinnerAny.lastRotationTime = currentTimeMs

      const [mouseX, mouseY] = [inputHandler.mouseX, inputHandler.mouseY]
      const canvasRect = canvas.current?.getBoundingClientRect()
      if (!canvasRect) return

      // Convert mouse position to canvas coordinates
      const canvasX = mouseX - canvasRect.left
      const canvasY = mouseY - canvasRect.top

      // Convert to osu! coordinates
      const scaleX = canvas.current!.width / 512
      const scaleY = canvas.current!.height / 384
      const zoomFactor = 0.9
      const offsetX =
        (canvas.current!.width - canvas.current!.width * zoomFactor) / 2
      const offsetY =
        (canvas.current!.height - canvas.current!.height * zoomFactor) / 2

      const adjustedX = (canvasX - offsetX) / zoomFactor
      const adjustedY = (canvasY - offsetY) / zoomFactor

      const spinnerX = spinner.x * scaleX
      const spinnerY = spinner.y * scaleY

      // Calculate angle from spinner center to mouse
      const dx = adjustedX - spinnerX
      const dy = adjustedY - spinnerY
      const currentMouseAngle = Math.atan2(dy, dx)

      // Check if mouse is being held down and is within spinning range
      const distance = Math.sqrt(dx * dx + dy * dy)
      const isInRange = distance < 200 // 200 pixel radius for spinning

      if (
        InputHandler._active?.isMouseDown &&
        isInRange &&
        currentTimeMs >= spinner.time &&
        currentTimeMs <= spinner.params.endTime
      ) {
        // Calculate angular difference
        let angleDiff = currentMouseAngle - spinnerAny.lastMouseAngle

        // Handle angle wrap-around
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

        // Only register significant movement to avoid jitter
        if (Math.abs(angleDiff) > 0.05) {
          spinnerAny.rotation += angleDiff

          // Calculate rotation speed
          const timeDiff = currentTimeMs - spinnerAny.lastRotationTime
          if (timeDiff > 0) {
            spinnerAny.rotationSpeed = Math.abs(angleDiff) / (timeDiff / 1000)
          }

          spinnerAny.lastRotationTime = currentTimeMs
          spinnerAny.lastMouseAngle = currentMouseAngle

          const totalRotation = Math.abs(spinnerAny.rotation)
          const newSpinsCompleted = Math.floor(totalRotation / (Math.PI * 2))

          if (newSpinsCompleted > spinnerAny.spinsCompleted) {
            const additionalSpins =
              newSpinsCompleted - spinnerAny.spinsCompleted
            spinnerAny.spinsCompleted = newSpinsCompleted

            AudioController._active?.playHitSound()

            if (spinnerAny.spinsCompleted > spinnerAny.spinsRequired) {
              const bonusSpins = Math.min(
                additionalSpins,
                spinnerAny.spinsCompleted - spinnerAny.spinsRequired,
              )
              if (bonusSpins > 0) {
                setScore((prev) => prev + bonusSpins * 50)
              }
            }
          }
        }
      } else {
        spinnerAny.lastMouseAngle = currentMouseAngle
      }

      // Check if spinner is completed
      if (currentTimeMs > spinner.params.endTime) {
        if (spinner.shouldRender) {
          // Award points based on completion
          const completionRatio = Math.min(
            1,
            spinnerAny.spinsCompleted / spinnerAny.spinsRequired,
          )

          if (completionRatio === 0) {
            // If no spins were completed, it's a miss
            console.log('spinner miss!')
            setCombo(0)
          } else {
            const points = Math.floor(300 * completionRatio)
            setScore((prev) => prev + points)
            setCombo((prev) => prev + 1)
          }
        }
        spinner.shouldRender = false
      }
    })

    sliders?.forEach((slider) => {
      if (!slider.shouldRender) {
        return
      }

      const sliderAny = slider as any
      if (sliderAny.userProgress === undefined) sliderAny.userProgress = 0
      if (sliderAny.isActive === undefined) sliderAny.isActive = false
      if (sliderAny.hasStarted === undefined) sliderAny.hasStarted = false

      const beatLength = gc.getBeatLengthAt(slider.time)
      const pixelsPerBeat = sliderMultiplier * 100
      const slideDuration = (slider.params.length / pixelsPerBeat) * beatLength
      const endTime = slider.time + slideDuration * slider.params.slides

      // Check for slider miss - if we're past the hit window and haven't started tracking
      const hitWindow = 150 // ms after slider time to consider it a miss
      if (currentTimeMs > slider.time + hitWindow && !sliderAny.hasStarted) {
        if (slider.shouldRender) {
          console.log('slider miss!')
          setCombo(0) // Reset combo on miss
          slider.shouldRender = false
        }
        return
      }

      const sliderPath = calculateSliderPath(slider)

      const [mouseX, mouseY] = [inputHandler.mouseX, inputHandler.mouseY]
      const osuPixelsX = Math.floor(mouseX / (window.innerWidth / 512))
      const osuPixelsY = Math.floor(mouseY / (window.innerHeight / 384))

      const ballPosition = getSliderBallPosition(
        slider,
        currentTimeMs,
        sliderPath,
        sliderMultiplier,
        beatLength,
      )

      if (
        InputHandler._active?.shouldHit &&
        ballPosition &&
        currentTimeMs >= slider.time &&
        currentTimeMs <= endTime
      ) {
        InputHandler._active.shouldHit = false
        const dx = osuPixelsX - ballPosition.x
        const dy = osuPixelsY - ballPosition.y
        const cs = parseFloat(gc.beatmap.difficulty.circleSize) || 5
        const circleRadius = 54.4 - 4.48 * cs

        if (slider.shouldPlayHitSound) {
          AudioController._active?.playHitSound()

          slider.shouldPlayHitSound = false
        }

        if (dx * dx + dy * dy <= circleRadius * circleRadius) {
          sliderAny.isActive = true
          sliderAny.hasStarted = true // Mark that the slider has been started
        }
      }

      if (sliderAny.isActive && ballPosition) {
        const dx = osuPixelsX - ballPosition.x
        const dy = osuPixelsY - ballPosition.y
        const cs = parseFloat(gc.beatmap.difficulty.circleSize) || 5
        const circleRadius = 54.4 - 4.48 * cs

        const trackingRadius = circleRadius * 2
        if (dx * dx + dy * dy <= trackingRadius * trackingRadius) {
          sliderAny.userProgress = currentTimeMs - slider.time
        } else {
          sliderAny.isActive = false
        }
      }

      if (
        currentTimeMs > endTime ||
        sliderAny.userProgress >= slideDuration * slider.params.slides
      ) {
        if (slider.shouldRender) {
          if (sliderAny.isActive && sliderAny.hasStarted) {
            setScore((prev) => prev + 300)
            setCombo((prev) => prev + 1)
          } else {
            console.log('slider incomplete!')
            setCombo(0)
          }
        }
        slider.shouldRender = false
        return
      }
    })

    circles?.forEach((circle) => {
      if (!circle.shouldRender) {
        return
      }

      const [mouseX, mouseY] = [inputHandler.mouseX, inputHandler.mouseY]

      const osuPixelsX = Math.floor(mouseX / (window.innerWidth / 512))
      const osuPixelsY = Math.floor(mouseY / (window.innerHeight / 384))

      if (currentTimeMs > circle.time) {
        if (circle.shouldRender) {
          console.log('miss!')
          setCombo(0)
          circle.shouldRender = false
        }
        return
      }

      if (InputHandler._active?.shouldHit) {
        InputHandler._active.shouldHit = false

        console.log('click!')

        const dx = osuPixelsX - circle.x
        const dy = osuPixelsY - circle.y
        const cs = parseFloat(gc.beatmap.difficulty.circleSize) || 5
        const circleRadius = 54.4 - 4.48 * cs

        if (dx * dx + dy * dy <= circleRadius * circleRadius) {
          console.log('ooo click')

          AudioController._active?.playHitSound()

          const newScore = score + 300 * (1 + combo) // unfinished calculation
          setCombo((prev) => prev + 1)
          setScore(newScore)

          circle.shouldRender = false
          return
        }
      }
    })
  }, 0)

  useEffect(() => {
    let animationId: number

    const loop = () => {
      render()
      animationId = requestAnimationFrame(loop)
    }

    animationId = requestAnimationFrame(loop)

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [render])

  if (showDifficultySelect) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-lg w-full mx-4">
          <h2 className="text-white text-2xl font-semibold mb-6 text-center">
            Select Difficulty
          </h2>
          <div className="space-y-3">
            {availableDifficulties.map((diff) => (
              <button
                key={diff.version}
                onClick={() => handleDifficultySelect(diff.version)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 hover:border-yellow-400/60 rounded-xl p-4 text-left transition group"
              >
                <div className="text-yellow-400 font-semibold text-lg group-hover:text-yellow-300">
                  {diff.version}
                </div>
                <div className="text-zinc-400 text-sm mt-1">
                  {diff.artist} - {diff.title}
                </div>
                <div className="text-zinc-500 text-xs mt-1">
                  by {diff.creator}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-black cursor-none overflow-hidden absolute">
      <div
        className="w-48 h-48 rounded-full z-20 absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
        style={{
          left: inputHandler.mouseX + 'px',
          top: inputHandler.mouseY + 'px',
          pointerEvents: 'none',
        }}
      >
        <img
          src="/skin/cursor@2x.png"
          alt=""
          className="h-48 w-48 object-contain"
        />
      </div>

      {/* Overlay UI layout */}
      <div className="z-10 w-screen h-screen absolute top-0 left-0 flex flex-col justify-between pointer-events-none">
        {/* Top bar: Score */}
        <div className="flex justify-end w-full p-8">
          <div className="text-white text-5xl font-semibold">
            {score.toString().padStart(6, '0')}
          </div>
        </div>

        <div className="flex justify-start w-full p-8">
          <div className="font-bold drop-shadow-lg">
            <span className="text-6xl">{combo}</span>{' '}
            <span className="text-xl text-yellow-400">X</span>
          </div>
        </div>
      </div>

      <canvas
        ref={canvas}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{ width: '100vw', height: '100vh', display: 'block' }}
      />
    </div>
  )
}
