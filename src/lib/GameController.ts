import { Beatmap } from './osu/parser'
import { AudioController } from './AudioController'
import { HitObject } from './osu/objects'

export class GameController {
  static _active: GameController | null = null
  beatmap: Beatmap
  audio: Uint8Array<ArrayBufferLike>
  audioController: AudioController

  constructor(beatmap: Beatmap, audio: Uint8Array<ArrayBufferLike>) {
    if (GameController._active) {
      throw new Error('Only one GameController can be active at a time.')
    }

    GameController._active = this
    this.beatmap = beatmap
    this.audio = audio

    this.audioController = new AudioController(this.audio)
  }

  /**
   * Returns the circles that should be visible on screen at the current audio time.
   * Ignores sliders and spinners, only returns circle hit objects.
   * @param preemptTime How early before hit time to show circles (default: 600ms)
   * @param fadeOutTime How long after hit time to keep showing circles (default: 100ms)
   * @returns Array of circle hit objects that should be visible
   */
  getVisibleCircles(
    currentTime: number,
    preemptTime: number = 300,
    fadeOutTime: number = 100,
  ): HitObject[] {
    const currentTimeMs = currentTime * 1000

    return this.beatmap.hitobjects.filter((hitObject) => {
      if (hitObject.objType !== 'circle') return false

      const hitTime = hitObject.time
      const showTime = hitTime - preemptTime
      const hideTime = hitTime + fadeOutTime

      return currentTimeMs >= showTime && currentTimeMs <= hideTime
    })
  }

  /**
   * Returns the sliders that should be visible on screen at the current audio time.
   * @param preemptTime How early before hit time to show sliders (default: 600ms)
   * @param fadeOutTime How long after end time to keep showing sliders (default: 100ms)
   * @returns Array of slider hit objects that should be visible
   */
  getVisibleSliders(
    currentTime: number,
    preemptTime: number = 300,
    fadeOutTime: number = 100,
  ): HitObject[] {
    const currentTimeMs = currentTime * 1000

    return this.beatmap.hitobjects.filter((hitObject) => {
      if (hitObject.objType !== 'slider') return false

      const hitTime = hitObject.time
      const showTime = hitTime - preemptTime

      const sliderMultiplier =
        parseFloat(this.beatmap.difficulty.sliderMultiplier) || 1.4
      const beatLength = this.getBeatLengthAt(hitTime)
      const pixelsPerBeat = sliderMultiplier * 100
      const sliderLength = hitObject.params.length
      const slideDuration = (sliderLength / pixelsPerBeat) * beatLength
      const endTime = hitTime + slideDuration * hitObject.params.slides
      const hideTime = endTime + fadeOutTime

      return currentTimeMs >= showTime && currentTimeMs <= hideTime
    })
  }

  /**
   * Get the beat length at a specific time from timing points
   */
  getBeatLengthAt(time: number): number {
    let beatLength = 500

    for (const tp of this.beatmap.timingPoints) {
      const parts = tp.raw.split(',')
      const tpTime = parseFloat(parts[0])
      const tpBeatLength = parseFloat(parts[1])

      if (tpTime <= time) {
        if (tpBeatLength > 0) {
          beatLength = tpBeatLength
        }
      } else {
        break
      }
    }

    return beatLength
  }

  destroy() {
    if (GameController._active === this) {
      GameController._active = null
    }
  }
}
