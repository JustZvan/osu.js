import type { HitObject, Beatmap } from 'osu-classes'

/**
 * Utility functions to bridge between old custom API and new osu-classes/osu-parsers API
 */

export interface Point {
  x: number
  y: number
}

/**
 * Get the object type as a string (for backward compatibility)
 */
export function getObjectType(hitObject: HitObject): string {
  if (hitObject.constructor.name === 'HitCircle') return 'circle'
  if (hitObject.constructor.name === 'Slider') return 'slider'
  if (hitObject.constructor.name === 'Spinner') return 'spinner'

  if (hitObject.hitType & 0b1) return 'circle'
  if (hitObject.hitType & 0b10) return 'slider'
  if (hitObject.hitType & 0b1000) return 'spinner'

  return 'circle'
}

/**
 * Check if hit object is a slider
 */
export function isSlider(hitObject: HitObject): boolean {
  return hitObject.constructor.name === 'Slider' || !!(hitObject.hitType & 0b10)
}

/**
 * Check if hit object is a spinner
 */
export function isSpinner(hitObject: HitObject): boolean {
  return (
    hitObject.constructor.name === 'Spinner' || !!(hitObject.hitType & 0b1000)
  )
}

/**
 * Check if hit object is a circle
 */
export function isCircle(hitObject: HitObject): boolean {
  return (
    hitObject.constructor.name === 'HitCircle' || !!(hitObject.hitType & 0b1)
  )
}

/**
 * Get start position as a Point object
 */
export function getStartPosition(hitObject: HitObject): Point {
  return {
    x: hitObject.startPosition.x,
    y: hitObject.startPosition.y,
  }
}

/**
 * Get hit object time in milliseconds
 */
export function getHitTime(hitObject: HitObject): number {
  return hitObject.startTime
}

/**
 * Legacy compatibility interface that mimics the old HitObject structure
 */
export interface LegacyHitObject {
  x: number
  y: number
  time: number
  type: number
  hitSound: number
  objType: string
  params: any
  hitSample: string
  shouldRender: boolean
  shouldPlayHitSound: boolean
  spinnerStartTime: number
  original?: HitObject
}

/**
 * Convert new HitObject to legacy format for gradual migration
 */
export function toLegacyHitObject(hitObject: HitObject): LegacyHitObject {
  const position = getStartPosition(hitObject)
  const objType = getObjectType(hitObject)

  let params: any = {}

  if (isSlider(hitObject)) {
    const sliderAny = hitObject as any
    const path = sliderAny.path
    const controlPoints: Array<{
      position: { x: number; y: number }
      type?: string | null
    }> = path?.controlPoints ?? []

    let curveType =
      (path?.curveType as string | undefined) ?? controlPoints[0]?.type ?? 'B'

    const curvePoints: string[] = []
    let previousPoint = { x: position.x, y: position.y }

    for (let i = 1; i < controlPoints.length; i++) {
      const cp = controlPoints[i]
      if (!cp?.position) continue

      const absoluteX = position.x + cp.position.x
      const absoluteY = position.y + cp.position.y

      if (cp.type && i !== 1) {
        curvePoints.push(
          `${Math.round(previousPoint.x)}:${Math.round(previousPoint.y)}`,
        )
        curveType = cp.type || curveType
      }

      curvePoints.push(`${Math.round(absoluteX)}:${Math.round(absoluteY)}`)
      previousPoint = { x: absoluteX, y: absoluteY }
    }

    if (curvePoints.length === 0) {
      curvePoints.push(
        `${Math.round(position.x + 100)}:${Math.round(position.y)}`,
      )
    }

    const spans =
      typeof sliderAny.spans === 'number' ? sliderAny.spans : undefined
    const repeats =
      typeof sliderAny.repeats === 'number' ? sliderAny.repeats : undefined
    const slides = spans ?? (typeof repeats === 'number' ? repeats + 1 : 1)

    const length =
      typeof path?.expectedDistance === 'number'
        ? path.expectedDistance
        : typeof sliderAny.distance === 'number'
          ? sliderAny.distance
          : 0

    params = {
      curveType: (curveType ?? 'B').toString().charAt(0).toUpperCase(),
      curvePoints,
      slides,
      length,
      edgeSounds: [],
      edgeSets: [],
    }
  } else if (isSpinner(hitObject)) {
    params = {
      endTime: hitObject.startTime + 1000,
    }
  }

  return {
    x: position.x,
    y: position.y,
    time: getHitTime(hitObject),
    type: hitObject.hitType,
    hitSound: hitObject.hitSound,
    objType,
    params,
    hitSample: '0:0:0:0:',
    shouldRender: true,
    shouldPlayHitSound: true,
    spinnerStartTime: 0,
    original: hitObject,
  }
}

/**
 * Get beatmap metadata in legacy format
 */
export function getLegacyMetadata(beatmap: Beatmap) {
  return {
    artist: beatmap.metadata.artist,
    creator: beatmap.metadata.creator,
    source: beatmap.metadata.source,
    title: beatmap.metadata.title,
    titleUnicode: beatmap.metadata.titleUnicode,
    artistUnicode: beatmap.metadata.artistUnicode,
    version: beatmap.metadata.version,
    tags: beatmap.metadata.tags,
  }
}

/**
 * Get beatmap difficulty in legacy format
 */
export function getLegacyDifficulty(beatmap: Beatmap) {
  return {
    hpDrainRate: beatmap.difficulty.drainRate.toString(),
    circleSize: beatmap.difficulty.circleSize.toString(),
    overallDifficulty: beatmap.difficulty.overallDifficulty.toString(),
    approachRate: beatmap.difficulty.approachRate.toString(),
    sliderMultiplier: beatmap.difficulty.sliderMultiplier.toString(),
    sliderTickRate: beatmap.difficulty.sliderTickRate.toString(),
  }
}

/**
 * Get beatmap general settings in legacy format
 */
export function getLegacyGeneral(beatmap: Beatmap) {
  return {
    audioLeadIn: beatmap.general.audioLeadIn.toString(),
    previewTime: beatmap.general.previewTime.toString(),
    countdown: beatmap.general.countdown.toString(),
    sampleSet: beatmap.general.sampleSet,
    stackLeniency: beatmap.general.stackLeniency.toString(),
    mode: '0',
    letterboxInBreaks: beatmap.general.letterboxInBreaks.toString(),
    widescreenStoryboard: beatmap.general.widescreenStoryboard.toString(),
    audioFilename: beatmap.general.audioFilename,
  }
}
