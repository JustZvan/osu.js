import { Beatmap } from './osu/parser'
import { AudioController } from './AudioController'
import { HitObject } from './osu/objects'

export const preemptTime = 600
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

    const audioLeadIn = parseInt(this.beatmap.general.audioLeadIn) || 0
    this.audioController = new AudioController(this.audio, audioLeadIn)
  }

  /**
   * Returns the circles that should be visible on screen at the current audio time.
   * Ignores sliders and spinners, only returns circle hit objects.
   * @param fadeOutTime How long after hit time to keep showing circles (default: 100ms)
   * @returns Array of circle hit objects that should be visible
   */
  async getVisibleCircles(fadeOutTime: number = 100): Promise<HitObject[]> {
    const currentTime = await this.audioController.getTime()
    const currentTimeMs = currentTime * 1000

    return this.beatmap.hitobjects.filter((hitObject) => {
      if (hitObject.objType !== 'circle') return false

      const hitTime = hitObject.time
      const showTime = hitTime - preemptTime
      const timeSinceHit = currentTimeMs - hitTime
      const alpha =
        timeSinceHit > 0 ? Math.max(0, 1 - timeSinceHit / fadeOutTime) : 1

      return currentTimeMs >= showTime && alpha > 0
    })
  }

  /**
   * Returns the sliders that should be visible on screen at the current audio time.
   * @param fadeOutTime How long after end time to keep showing sliders (default: 100ms)
   * @returns Array of slider hit objects that should be visible
   */
  async getVisibleSliders(fadeOutTime: number = 100): Promise<HitObject[]> {
    const currentTime = await this.audioController.getTime()
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
      const timeSinceEnd = currentTimeMs - endTime
      const alpha =
        timeSinceEnd > 0 ? Math.max(0, 1 - timeSinceEnd / fadeOutTime) : 1

      return currentTimeMs >= showTime && alpha > 0
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
