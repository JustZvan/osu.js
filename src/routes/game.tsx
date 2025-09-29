import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSettings } from '@/lib/hooks/useStorage'
import { GameController } from '@/lib/GameController'
import useInterval from '@/lib/hooks/useInterval'
import {
  calculateSliderPath,
  getSliderBallPosition,
} from '@/lib/osu/SliderUtils'
import { parseOszFile } from '@/lib/osu/compressed'
import useInputHandler from '@/lib/hooks/useInputHandler'
import { preemptTime } from '@/lib/GameController'
import { InputHandler } from '@/lib/InputHandler'
import { AudioController } from '@/lib/AudioController'
import { getHitTime, getStartPosition } from '@/lib/osu/adapter'
import { LayerType, type Beatmap, type HitObject } from 'osu-classes'

import { FFmpeg } from '@ffmpeg/ffmpeg'

import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

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
  const settings = useSettings()
  const {
    oszUrl,
    difficulties,
    beatmapInfo,
    selectedDifficulty: preSelectedDifficulty,
  } = Route.useSearch()
  const [gc, setGc] = useState<GameController>()
  const [videoUri, setVideoUri] = useState<string>('')
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const inputHandler = useInputHandler()
  const [score, setScore] = useState(0)

  const [combo, setCombo] = useState(0)

  const [showDifficultySelect, setShowDifficultySelect] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null,
  )
  const videoRef = useRef<HTMLVideoElement>(null)

  const getSliderRuntime = (slider: HitObject) => {
    const sliderAny = slider as any
    const slides =
      typeof sliderAny.spans === 'number'
        ? sliderAny.spans
        : typeof sliderAny.repeats === 'number'
          ? sliderAny.repeats + 1
          : typeof sliderAny.repeatCount === 'number'
            ? sliderAny.repeatCount + 1
            : 1

    const length =
      typeof sliderAny.path?.expectedDistance === 'number'
        ? sliderAny.path.expectedDistance
        : typeof sliderAny.distance === 'number'
          ? sliderAny.distance
          : typeof sliderAny.params?.length === 'number'
            ? sliderAny.params.length
            : 0

    return {
      sliderAny,
      slides: Math.max(1, slides),
      length: Math.max(0, length),
      startTime: getHitTime(slider),
      startPosition: getStartPosition(slider),
    }
  }

  const getSpinnerRuntime = (spinner: HitObject) => {
    const spinnerAny = spinner as any
    const startTime = getHitTime(spinner)

    const explicitEndTime =
      typeof spinnerAny.endTime === 'number'
        ? spinnerAny.endTime
        : typeof spinnerAny.params?.endTime === 'number'
          ? spinnerAny.params.endTime
          : undefined

    const duration =
      typeof spinnerAny.duration === 'number'
        ? spinnerAny.duration
        : typeof explicitEndTime === 'number'
          ? explicitEndTime - startTime
          : 1000

    const endTime =
      typeof explicitEndTime === 'number'
        ? explicitEndTime
        : startTime + duration

    return {
      spinnerAny,
      startTime,
      endTime,
      position: getStartPosition(spinner),
    }
  }

  const getCircleRuntime = (circle: HitObject) => ({
    circleAny: circle as any,
    startTime: getHitTime(circle),
    position: getStartPosition(circle),
  })

  const ffmpegRef = useRef<FFmpeg | null>(null)
  if (!ffmpegRef.current) {
    ffmpegRef.current = new FFmpeg()
  }
  const ffmpeg = ffmpegRef.current

  useEffect(() => {
    if (!ffmpeg.loaded) {
      ffmpeg
        .load({
          coreURL,
          wasmURL,
        })
        .then(() => {
          console.log('loaded')
        })
    }
  }, [ffmpeg])

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

  async function loadBeatmap(newBeatmap: Beatmap, files: any) {
    if (AudioController._active) {
      AudioController._active.destroy?.()
      AudioController._active = null
    }
    gc?.audioController?.destroy?.()
    const audioFilename = newBeatmap.general.audioFilename
    const audioFile = files[audioFilename]
    if (!audioFile) return
    const audioController = new AudioController(audioFile)
    AudioController._active = audioController
    const newGc = new GameController(newBeatmap, audioController)
    setGc(newGc)
    const img = new window.Image()
    img.src = '/skin/hitcircleoverlay.png'
    img.onload = () => setImage(img)
    if (newBeatmap?.events?.backgroundPath) {
      const backgroundFilename = newBeatmap.events.backgroundPath
      const backgroundFile = files[backgroundFilename]
      if (backgroundFile) {
        const blob = new Blob([backgroundFile.buffer as ArrayBuffer])
        const backgroundUrl = URL.createObjectURL(blob)
        const bgImg = new window.Image()
        bgImg.src = backgroundUrl
        bgImg.onload = () => setBackgroundImage(bgImg)
      }
    }
    if (
      settings.settings.videoBackgrounds !== false &&
      newBeatmap?.events.storyboard?.layers
    ) {
      const videoLayer = newBeatmap.events.storyboard.getLayerByType(
        LayerType.Video,
      )
      if (videoLayer) {
        const videoFilePath = videoLayer.elements[0]?.filePath
        const videoFile = files[videoFilePath]
        if (videoFile && videoFilePath) {
          const extension = videoFilePath.split('.').pop()?.toLowerCase()
          let mimeType = 'video/mp4'
          if (extension === 'avi') mimeType = 'video/x-msvideo'
          else if (extension === 'mp4') mimeType = 'video/mp4'
          else if (extension === 'webm') mimeType = 'video/webm'
          else if (extension === 'ogg') mimeType = 'video/ogg'
          else if (extension === 'mov') mimeType = 'video/quicktime'
          else if (extension === 'wmv') mimeType = 'video/x-ms-wmv'
          const testVideo = document.createElement('video')
          const canPlay = testVideo.canPlayType(mimeType)
          if (!canPlay) {
            const inputName = `input.${extension}`
            const outputName = 'output.mp4'
            await ffmpeg.writeFile(
              inputName,
              new Uint8Array(videoFile.buffer as ArrayBuffer),
            )
            await ffmpeg.exec(['-i', inputName, '-c:v', 'copy', outputName])
            const data = await ffmpeg.readFile(outputName)
            const blob = new Blob([(data as any).buffer], { type: 'video/mp4' })
            const videoUrl = URL.createObjectURL(blob)
            setVideoUri(videoUrl)
          } else {
            const blob = new Blob([videoFile.buffer as ArrayBuffer], {
              type: mimeType,
            })
            const videoUrl = URL.createObjectURL(blob)
            setVideoUri(videoUrl)
          }
        }
      }
    }
  }

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
          const { beatmaps, files } = await parseOszFile(oszUrl)

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
    main()
  }, [
    oszUrl,
    difficulties,
    beatmapInfo,
    preSelectedDifficulty,
    showDifficultySelect,
    selectedDifficulty,
  ])

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
    const bgOpacity =
      typeof settings.settings.opacity === 'number'
        ? settings.settings.opacity / 100
        : 0.4
    if (
      settings.settings.videoBackgrounds !== false &&
      videoRef.current &&
      videoRef.current.src &&
      !videoRef.current.paused &&
      !videoRef.current.ended
    ) {
      try {
        context.save()
        context.globalAlpha = bgOpacity
        const video = videoRef.current
        const canvasWidth = canvas.current.width
        const canvasHeight = canvas.current.height
        const videoAspect = video.videoWidth / video.videoHeight
        const canvasAspect = canvasWidth / canvasHeight
        let drawWidth, drawHeight, offsetX, offsetY
        if (videoAspect > canvasAspect) {
          drawHeight = canvasHeight
          drawWidth = drawHeight * videoAspect
          offsetX = (canvasWidth - drawWidth) / 2
          offsetY = 0
        } else {
          drawWidth = canvasWidth
          drawHeight = drawWidth / videoAspect
          offsetX = 0
          offsetY = (canvasHeight - drawHeight) / 2
        }
        context.drawImage(video, offsetX, offsetY, drawWidth, drawHeight)
        context.restore()
      } catch (e) {}
    } else {
      if (backgroundImage) {
        const bgScaleX = canvas.current.width / backgroundImage.width
        const bgScaleY = canvas.current.height / backgroundImage.height
        const scale = Math.max(bgScaleX, bgScaleY)
        const scaledWidth = backgroundImage.width * scale
        const scaledHeight = backgroundImage.height * scale
        const x = (canvas.current.width - scaledWidth) / 2
        const y = (canvas.current.height - scaledHeight) / 2
        context.save()
        context.globalAlpha = bgOpacity
        context.drawImage(backgroundImage, x, y, scaledWidth, scaledHeight)
        context.restore()
      }
    }

    const zoomFactor = 0.8

    const gameplayWidth = canvas.current.width * zoomFactor
    const gameplayHeight = canvas.current.height * zoomFactor
    const offsetX = (canvas.current.width - gameplayWidth) / 2
    const offsetY = (canvas.current.height - gameplayHeight) / 2

    context.save()
    context.translate(offsetX, offsetY)
    context.scale(zoomFactor, zoomFactor)

    const scaleX = canvas.current.width / 512
    const scaleY = canvas.current.height / 384

    const cs = gc.beatmap.difficulty.circleSize ?? 5
    const circleRadius = 54.4 - 4.48 * cs
    const circleSize = circleRadius * 2 * Math.min(scaleX, scaleY)

    const currentTime = await gc.audioController.getTime()
    const currentTimeMs = currentTime * 1000
    const sliderMultiplier = gc.beatmap.difficulty.sliderMultiplier ?? 1.4

    const beatmapEvents = gc.beatmap.events

    beatmapEvents.breaks.forEach((breakPeriod) => {
      const startTime = breakPeriod.startTime
      const endTime = breakPeriod.endTime

      if (currentTimeMs >= startTime && currentTimeMs <= endTime) {
        const secondsLeft = Math.ceil((endTime - currentTimeMs) / 1000)
        context.save()
        context.globalAlpha = 1
        context.font = `bold ${canvas.current!.height * 0.12}px Arial`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillStyle = '#fff'
        context.strokeStyle = '#000'
        context.lineWidth = 8
        const centerX = canvas.current!.width / 2
        const centerY = canvas.current!.height / 2
        context.strokeText(secondsLeft.toString(), centerX, centerY)
        context.fillText(secondsLeft.toString(), centerX, centerY)
        context.restore()
      }
    })

    sliders?.forEach((slider, index) => {
      const {
        sliderAny,
        slides,
        length,
        startTime: sliderStartTime,
        startPosition,
      } = getSliderRuntime(slider)

      if (sliderAny.shouldRender === undefined) {
        sliderAny.shouldRender = true
      }

      if (!sliderAny.shouldRender) {
        return
      }

      if (sliderAny.userProgress === undefined) sliderAny.userProgress = 0
      if (sliderAny.isActive === undefined) sliderAny.isActive = false

      const beatLength = gc.getBeatLengthAt(sliderStartTime)
      const pixelsPerBeat = sliderMultiplier * 100
      const slideDuration = (length / pixelsPerBeat) * beatLength
      const totalSlides = Math.max(1, slides)
      const safeSlideDuration = slideDuration > 0 ? slideDuration : 1
      const totalDuration = safeSlideDuration * totalSlides
      const endTime = sliderStartTime + totalDuration
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

      if (currentTimeMs > endTime || sliderAny.userProgress >= totalDuration) {
        sliderAny.shouldRender = false
        return
      }

      if (sliderPath.points.length > 1) {
        const trackWidth = circleSize * 0.9

        const sliderProgress = Math.max(
          0,
          (currentTimeMs - sliderStartTime) / (safeSlideDuration * totalSlides),
        )
        const totalPathLength = sliderPath.points.length - 1

        const currentRepeat = Math.floor(sliderProgress * totalSlides)
        const repeatProgress = (sliderProgress * totalSlides) % 1
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

        if (currentTimeMs < sliderStartTime) {
          context.moveTo(firstPoint.x * scaleX, firstPoint.y * scaleY)
          for (let i = 1; i < sliderPath.points.length; i++) {
            const point = sliderPath.points[i]
            context.lineTo(point.x * scaleX, point.y * scaleY)
          }
        } else if (isReverse) {
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
        } else if (completedPoints < sliderPath.points.length - 1) {
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

          for (let i = completedPoints + 1; i < sliderPath.points.length; i++) {
            const point = sliderPath.points[i]
            context.lineTo(point.x * scaleX, point.y * scaleY)
          }
        }

        context.stroke()

        context.restore()
        context.globalAlpha = 1
      }

      const scaledX = startPosition.x * scaleX
      const scaledY = startPosition.y * scaleY

      const timeSinceAppear = currentTimeMs - (sliderStartTime - preemptTime)
      const approachProgress = Math.max(
        0,
        Math.min(1, timeSinceAppear / preemptTime),
      )

      if (currentTimeMs < sliderStartTime) {
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

      const sliderNumber = ((index + 1) % 10).toString()
      const fontSize = circleSize * 0.4
      context.font = `bold ${fontSize}px Arial`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillStyle = '#FFFFFF'
      context.strokeStyle = '#000000'
      context.lineWidth = fontSize * 0.08
      context.strokeText(sliderNumber, scaledX, scaledY)
      context.fillText(sliderNumber, scaledX, scaledY)
    })

    spinners?.forEach((spinner) => {
      const {
        spinnerAny,
        startTime: spinnerStartTime,
        endTime: spinnerEndTime,
        position,
      } = getSpinnerRuntime(spinner)

      if (spinnerAny.shouldRender === undefined) {
        spinnerAny.shouldRender = true
      }

      if (!spinnerAny.shouldRender) {
        return
      }

      const scaledX = position.x * scaleX
      const scaledY = position.y * scaleY

      const duration = Math.max(1, spinnerEndTime - spinnerStartTime)
      const progress = Math.max(
        0,
        Math.min(1, (currentTimeMs - spinnerStartTime) / duration),
      )

      if (spinnerAny.rotation === undefined) spinnerAny.rotation = 0

      if (spinnerAny.spinsRequired === undefined) {
        spinnerAny.spinsRequired = Math.max(3, Math.floor(duration / 500))
      }

      if (spinnerAny.spinsCompleted === undefined) spinnerAny.spinsCompleted = 0

      const outerRadius = 300 * (1 - progress)

      context.strokeStyle = '#FFFFFF'
      context.lineWidth = 3
      context.beginPath()
      context.arc(scaledX, scaledY, outerRadius, 0, Math.PI * 2)
      context.stroke()
    })

    circles?.forEach((circle, index) => {
      const {
        circleAny,
        startTime: circleStartTime,
        position,
      } = getCircleRuntime(circle)

      if (circleAny.shouldRender === undefined) {
        circleAny.shouldRender = true
      }

      if (!circleAny.shouldRender) {
        return
      }

      const scaledX = position.x * scaleX
      const scaledY = position.y * scaleY

      const fadeOutTime = 100
      const timeSinceHit = currentTimeMs - circleStartTime
      const alpha =
        timeSinceHit > 0 ? Math.max(0, 1 - timeSinceHit / fadeOutTime) : 1

      const timeSinceAppear = currentTimeMs - (circleStartTime - preemptTime)
      const approachProgress = Math.max(
        0,
        Math.min(1, timeSinceAppear / preemptTime),
      )

      if (currentTimeMs < circleStartTime && image) {
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

      const circleNumber = ((index + 1) % 10).toString()
      const fontSize = circleSize * 0.4
      context.font = `bold ${fontSize}px Arial`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillStyle = '#FFFFFF'
      context.strokeStyle = '#000000'
      context.lineWidth = fontSize * 0.08
      context.strokeText(circleNumber, scaledX, scaledY)
      context.fillText(circleNumber, scaledX, scaledY)

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
    const sliderMultiplier = gc.beatmap.difficulty.sliderMultiplier ?? 1.4

    // Handle spinner spinning logic
    spinners?.forEach((spinner) => {
      const {
        spinnerAny,
        startTime: spinnerStartTime,
        endTime: spinnerEndTime,
        position,
      } = getSpinnerRuntime(spinner)

      if (spinnerAny.shouldRender === undefined) {
        spinnerAny.shouldRender = true
      }

      if (!spinnerAny.shouldRender) {
        return
      }

      const spinnerDuration = Math.max(1, spinnerEndTime - spinnerStartTime)

      if (spinnerAny.rotation === undefined) spinnerAny.rotation = 0
      if (spinnerAny.spinsRequired === undefined) {
        spinnerAny.spinsRequired = Math.max(
          3,
          Math.floor(spinnerDuration / 500),
        )
      }
      if (spinnerAny.spinsCompleted === undefined) spinnerAny.spinsCompleted = 0
      if (spinnerAny.lastMouseAngle === undefined) spinnerAny.lastMouseAngle = 0
      if (spinnerAny.lastRotationTime === undefined) {
        spinnerAny.lastRotationTime = currentTimeMs
      }

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

      const spinnerX = position.x * scaleX
      const spinnerY = position.y * scaleY

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
        currentTimeMs >= spinnerStartTime &&
        currentTimeMs <= spinnerEndTime
      ) {
        // Calculate angular difference
        let angleDiff = currentMouseAngle - spinnerAny.lastMouseAngle

        // Handle angle wrap-around
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

        // Only register significant movement to avoid jitter
        if (Math.abs(angleDiff) > 0.05) {
          spinnerAny.rotation += angleDiff

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

      if (currentTimeMs > spinnerEndTime) {
        if (spinnerAny.shouldRender) {
          const completionRatio = Math.min(
            1,
            spinnerAny.spinsCompleted / spinnerAny.spinsRequired,
          )

          if (completionRatio === 0) {
            console.log('spinner miss!')
            setCombo(0)
          } else {
            const points = Math.floor(300 * completionRatio)
            setScore((prev) => prev + points)
            setCombo((prev) => prev + 1)
          }
        }
        spinnerAny.shouldRender = false
      }
    })

    sliders?.forEach((slider) => {
      const {
        sliderAny,
        slides,
        length,
        startTime: sliderStartTime,
      } = getSliderRuntime(slider)

      if (sliderAny.shouldRender === undefined) {
        sliderAny.shouldRender = true
      }

      if (!sliderAny.shouldRender) {
        return
      }

      if (sliderAny.userProgress === undefined) sliderAny.userProgress = 0
      if (sliderAny.isActive === undefined) sliderAny.isActive = false
      if (sliderAny.hasStarted === undefined) sliderAny.hasStarted = false
      if (sliderAny.shouldPlayHitSound === undefined)
        sliderAny.shouldPlayHitSound = true

      const beatLength = gc.getBeatLengthAt(sliderStartTime)
      const pixelsPerBeat = sliderMultiplier * 100
      const slideDuration = (length / pixelsPerBeat) * beatLength
      const totalSlides = Math.max(1, slides)
      const safeSlideDuration = slideDuration > 0 ? slideDuration : 1
      const totalDuration = safeSlideDuration * totalSlides
      const endTime = sliderStartTime + totalDuration

      const hitWindow = 150
      if (
        currentTimeMs > sliderStartTime + hitWindow &&
        !sliderAny.hasStarted
      ) {
        if (sliderAny.shouldRender) {
          console.log('slider miss!')
          setCombo(0)
          sliderAny.shouldRender = false
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
        currentTimeMs >= sliderStartTime &&
        currentTimeMs <= endTime
      ) {
        InputHandler._active.shouldHit = false
        const dx = osuPixelsX - ballPosition.x
        const dy = osuPixelsY - ballPosition.y
        const cs = gc.beatmap.difficulty.circleSize ?? 5
        const circleRadius = 54.4 - 4.48 * cs

        if (sliderAny.shouldPlayHitSound) {
          AudioController._active?.playHitSound()
          sliderAny.shouldPlayHitSound = false
        }

        if (dx * dx + dy * dy <= circleRadius * circleRadius) {
          sliderAny.isActive = true
          sliderAny.hasStarted = true
        }
      }

      if (sliderAny.isActive && ballPosition) {
        const dx = osuPixelsX - ballPosition.x
        const dy = osuPixelsY - ballPosition.y
        const cs = gc.beatmap.difficulty.circleSize ?? 5
        const circleRadius = 54.4 - 4.48 * cs

        const trackingRadius = circleRadius * 2
        if (dx * dx + dy * dy <= trackingRadius * trackingRadius) {
          sliderAny.userProgress = currentTimeMs - sliderStartTime
        } else {
          sliderAny.isActive = false
        }
      }

      if (currentTimeMs > endTime || sliderAny.userProgress >= totalDuration) {
        if (sliderAny.shouldRender) {
          if (sliderAny.isActive && sliderAny.hasStarted) {
            setScore((prev) => prev + 300 * (1 + combo))
            setCombo((prev) => prev + 1)
          } else {
            console.log('slider incomplete!')
            setCombo(0)
          }
        }
        sliderAny.shouldRender = false
      }
    })

    circles?.forEach((circle) => {
      const {
        circleAny,
        startTime: circleStartTime,
        position,
      } = getCircleRuntime(circle)

      if (circleAny.shouldRender === undefined) {
        circleAny.shouldRender = true
      }

      if (!circleAny.shouldRender) {
        return
      }

      const [mouseX, mouseY] = [inputHandler.mouseX, inputHandler.mouseY]

      const osuPixelsX = Math.floor(mouseX / (window.innerWidth / 512))
      const osuPixelsY = Math.floor(mouseY / (window.innerHeight / 384))

      if (currentTimeMs > circleStartTime) {
        if (circleAny.shouldRender) {
          console.log('miss!')
          setCombo(0)
          circleAny.shouldRender = false
        }
        return
      }

      if (InputHandler._active?.shouldHit) {
        InputHandler._active.shouldHit = false

        console.log('click!')

        const dx = osuPixelsX - position.x
        const dy = osuPixelsY - position.y
        const cs = gc.beatmap.difficulty.circleSize ?? 5
        const circleRadius = 54.4 - 4.48 * cs

        if (dx * dx + dy * dy <= circleRadius * circleRadius) {
          console.log('ooo click')

          AudioController._active?.playHitSound()

          const newScore = score + 300 * (1 + combo)
          setCombo((prev) => prev + 1)
          setScore(newScore)

          circleAny.shouldRender = false
          return
        }
      }
    })
  }, 0)

  // Handle video URI changes
  useEffect(() => {
    if (videoUri && videoRef.current) {
      console.log('Video URI changed:', videoUri)
      const video = videoRef.current

      const handleCanPlay = () => {
        console.log('Video can play - attempting to start')
        console.log('Video details:', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState,
        })

        video
          .play()
          .then(() => console.log('Video playing successfully'))
          .catch((error) => {
            console.error('Failed to play video:', error)
            // Clear video URI on persistent failure
            setVideoUri('')
          })
      }

      const handleLoadStart = () => console.log('Video load started')
      const handleLoadedMetadata = () => console.log('Video metadata loaded')
      const handleError = (e: Event) => {
        console.error('Video loading error:', e)
        const target = e.target as HTMLVideoElement
        if (target?.error) {
          console.error(
            'Video error code:',
            target.error.code,
            'message:',
            target.error.message,
          )
        }
        setVideoUri('')
      }

      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('loadstart', handleLoadStart)
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      video.addEventListener('error', handleError)

      // If video is already ready, try to play immediately
      if (video.readyState >= 3) {
        handleCanPlay()
      }

      return () => {
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('loadstart', handleLoadStart)
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('error', handleError)
      }
    }
  }, [videoUri])

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

  return (
    <div className="h-screen w-screen bg-black cursor-none overflow-hidden absolute">
      {videoUri && (
        <video
          ref={videoRef}
          src={videoUri}
          loop
          muted
          autoPlay
          playsInline
          hidden
          onLoadedData={() => {
            console.log('Video loaded data')
            if (videoRef.current) {
              console.log('Video duration:', videoRef.current.duration)
              console.log('Video ready state:', videoRef.current.readyState)
            }
          }}
          onCanPlay={() => {
            console.log('Video can play')
            if (videoRef.current && videoRef.current.paused) {
              videoRef.current
                .play()
                .then(() => console.log('Video playing from onCanPlay'))
                .catch(console.error)
            }
          }}
          onPlay={() => console.log('Video started playing')}
          onPause={() => console.log('Video paused')}
          onError={(e) => {
            console.error('Video error:', e)
            console.error('Video error details:', {
              error: videoRef.current?.error,
              networkState: videoRef.current?.networkState,
              readyState: videoRef.current?.readyState,
              src: videoRef.current?.src,
            })
            // Clear video URI on error to prevent further issues
            setVideoUri('')
          }}
        ></video>
      )}

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
