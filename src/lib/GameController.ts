import type { Beatmap, HitObject } from 'osu-classes'
import { AudioController } from './AudioController'
import { isSlider, isSpinner, getHitTime } from './osu/adapter'

export const preemptTime = 600

export class GameController {
  beatmap: Beatmap
  audioController: AudioController

  constructor(beatmap: Beatmap, audioController: AudioController) {
    this.beatmap = beatmap
    this.audioController = audioController
  }

  /**
   * Returns the circles that should be visible on screen at the current audio time.
   */
  async getVisibleCircles(fadeOutTime: number = 100): Promise<HitObject[]> {
    const currentTime = await this.audioController.getTime()
    const currentTimeMs = currentTime * 1000

    return this.beatmap.hitObjects.filter((hitObject) => {
      if (isSlider(hitObject) || isSpinner(hitObject)) return false

      const hitTime = getHitTime(hitObject)
      const showTime = hitTime - preemptTime
      const timeSinceHit = currentTimeMs - hitTime
      const alpha =
        timeSinceHit > 0 ? Math.max(0, 1 - timeSinceHit / fadeOutTime) : 1

      return currentTimeMs >= showTime && alpha > 0
    })
  }

  /**
   * Returns the sliders that should be visible on screen at the current audio time.
   */
  async getVisibleSliders(fadeOutTime: number = 100): Promise<HitObject[]> {
    const currentTime = await this.audioController.getTime()
    const currentTimeMs = currentTime * 1000

    return this.beatmap.hitObjects.filter((hitObject) => {
      if (!isSlider(hitObject)) return false

      const hitTime = getHitTime(hitObject)
      const showTime = hitTime - preemptTime

      const sliderMultiplier = this.beatmap.difficulty.sliderMultiplier || 1.4
      const beatLength = this.getBeatLengthAt(hitTime)
      const pixelsPerBeat = sliderMultiplier * 100
      const sliderLength = 100
      const slideDuration = (sliderLength / pixelsPerBeat) * beatLength
      const slides = 1
      const totalDuration = slideDuration * slides
      const endTime = hitTime + totalDuration

      const timeSinceEnd = currentTimeMs - endTime
      const alpha =
        timeSinceEnd > 0 ? Math.max(0, 1 - timeSinceEnd / fadeOutTime) : 1

      return currentTimeMs >= showTime && alpha > 0
    })
  }

  async getVisibleSpinners(): Promise<HitObject[]> {
    const currentTime = await this.audioController.getTime()
    const currentTimeMs = currentTime * 1000

    return this.beatmap.hitObjects.filter((hitObject) => {
      if (!isSpinner(hitObject)) return false

      const hitTime = getHitTime(hitObject)
      const showTime = hitTime - preemptTime

      const endTime = hitTime + 1000
      const timeSinceEnd = currentTimeMs - endTime
      const alpha = timeSinceEnd > 0 ? Math.max(0, 1 - timeSinceEnd / 100) : 1

      return currentTimeMs >= showTime && alpha > 0
    })
  }

  /**
   * Get the beat length at a specific time from timing points
   */
  getBeatLengthAt(_time: number): number {
    return 500
  }

  destroy() {}
}
