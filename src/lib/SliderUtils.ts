import { HitObject } from './osu/objects'
export { calculateSliderPath } from './SliderPath'
import type { SliderPath, Point } from './SliderPath'

export function getSliderBallPosition(
  slider: HitObject,
  currentTime: number,
  sliderPath: SliderPath,
  sliderMultiplier: number,
  beatLength: number,
): Point | null {
  if (slider.objType !== 'slider') return null

  const { slides, length } = slider.params

  const pixelsPerBeat = sliderMultiplier * 100 * 1
  const slideDuration = (length / pixelsPerBeat) * beatLength
  const totalDuration = slideDuration * slides

  const timeSinceStart = currentTime - slider.time
  if (timeSinceStart < 0 || timeSinceStart > totalDuration) return null

  const slideProgress = (timeSinceStart / slideDuration) % 1
  const slideNumber = Math.floor(timeSinceStart / slideDuration)

  const isReverse = slideNumber % 2 === 1
  let progress = isReverse ? 1 - slideProgress : slideProgress

  progress = Math.max(0, Math.min(1, progress))

  if (sliderPath.points.length === 0) return null
  if (sliderPath.points.length === 1) return sliderPath.points[0]

  let totalPathLength = 0
  const segmentLengths: number[] = []

  for (let i = 1; i < sliderPath.points.length; i++) {
    const dx = sliderPath.points[i].x - sliderPath.points[i - 1].x
    const dy = sliderPath.points[i].y - sliderPath.points[i - 1].y
    const segmentLength = Math.sqrt(dx * dx + dy * dy)
    segmentLengths.push(segmentLength)
    totalPathLength += segmentLength
  }

  if (totalPathLength === 0) return sliderPath.points[0]

  const targetDistance = progress * totalPathLength
  let currentDistance = 0

  for (let i = 0; i < segmentLengths.length; i++) {
    if (currentDistance + segmentLengths[i] >= targetDistance) {
      const segmentProgress =
        (targetDistance - currentDistance) / segmentLengths[i]
      const p1 = sliderPath.points[i]
      const p2 = sliderPath.points[i + 1]

      return {
        x: p1.x + (p2.x - p1.x) * segmentProgress,
        y: p1.y + (p2.y - p1.y) * segmentProgress,
      }
    }
    currentDistance += segmentLengths[i]
  }

  return sliderPath.points[sliderPath.points.length - 1]
}
