import type { HitObject } from 'osu-classes'
import { isSlider, getHitTime } from './adapter'

import type { Point, SliderPath } from './SliderPath'

export { calculateSliderPath } from './SliderPath'
export type { Point, SliderPath } from './SliderPath'

export function getSliderBallPosition(
  hitObject: HitObject,
  currentTime: number,
  sliderPath: SliderPath,
  sliderMultiplier: number,
  beatLength: number,
): Point | null {
  if (!isSlider(hitObject)) return null

  const sliderAny = hitObject as any
  const path = sliderAny.path

  // Get slides/repeats from slider data
  const slides =
    typeof sliderAny.spans === 'number'
      ? sliderAny.spans
      : typeof sliderAny.repeats === 'number'
        ? sliderAny.repeats + 1
        : typeof sliderAny.repeatCount === 'number'
          ? sliderAny.repeatCount + 1
          : 1

  // Get slider length from slider data
  const length =
    typeof path?.expectedDistance === 'number'
      ? path.expectedDistance
      : typeof sliderAny.distance === 'number'
        ? sliderAny.distance
        : typeof sliderAny.params?.length === 'number'
          ? sliderAny.params.length
          : sliderPath.length

  const pixelsPerBeat = sliderMultiplier * 100
  const slideDuration = (length / pixelsPerBeat) * beatLength
  const totalDuration = slideDuration * Math.max(1, slides)

  const timeSinceStart = currentTime - getHitTime(hitObject)
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
      const start = sliderPath.points[i]
      const end = sliderPath.points[i + 1]

      return {
        x: start.x + (end.x - start.x) * segmentProgress,
        y: start.y + (end.y - start.y) * segmentProgress,
      }
    }
    currentDistance += segmentLengths[i]
  }

  return sliderPath.points[sliderPath.points.length - 1]
}
