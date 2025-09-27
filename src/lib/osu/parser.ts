import { BeatmapDecoder } from 'osu-parsers'
import type { Beatmap } from 'osu-classes'

export class BeatmapLoader {
  private decoder = new BeatmapDecoder()

  /**
   * Parse a beatmap from string content
   */
  parseFromString(contents: string): Beatmap {
    return this.decoder.decodeFromString(contents)
  }

  /**
   * Parse a beatmap from file path
   */
  async parseFromPath(path: string): Promise<Beatmap> {
    return await this.decoder.decodeFromPath(path)
  }
}

export { BeatmapDecoder } from 'osu-parsers'

export type {
  Beatmap,
  HitObject,
  BeatmapMetadataSection,
  BeatmapDifficultySection,
  BeatmapGeneralSection,
  BeatmapEditorSection,
  ControlPoint,
  TimingPoint,
} from 'osu-classes'
