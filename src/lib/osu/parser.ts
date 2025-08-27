import { ParseRawHitobject, HitObject } from './objects'

function RawParse(content: string) {
  const lines = content.split('\n')
  let currentSection = ''
  const result: any = { Version: '' }
  let sectionOrder: string[] = []
  let sectionLines: Record<string, string[]> = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('osu file format ')) {
      result.Version = trimmed.split('osu file format ')[1]
      continue
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1)
      if (!sectionLines[currentSection]) {
        sectionLines[currentSection] = []
        sectionOrder.push(currentSection)
      }
      continue
    }

    if (currentSection) {
      sectionLines[currentSection].push(trimmed)
    }
  }

  for (const section of sectionOrder) {
    const linesArr = sectionLines[section]

    if (section == 'HitObjects') {
      result.HitObjects = result.HitObjects || []
      result.HitObjects.push(...linesArr)
      continue
    }

    if (linesArr.length > 0 && linesArr.every((l) => l.includes(':'))) {
      const obj: Record<string, string> = {}
      for (const l of linesArr) {
        const idx = l.indexOf(':')
        if (idx !== -1) {
          const key = l.slice(0, idx).trim()
          const value = l.slice(idx + 1).trim()
          obj[key] = value
        }
      }

      result[section] = obj
    } else {
      result[section] = linesArr
    }
  }

  result._sectionOrder = sectionOrder
  return result
}

export class BeatmapMetadata {
  artist: string = ''
  creator: string = ''
  source: string = ''
  title: string = ''
  titleUnicode: string = ''
  artistUnicode: string = ''
  version: string = ''
  tags: string = ''
}

export class BeatmapGeneral {
  audioLeadIn: string = ''
  previewTime: string = ''
  countdown: string = ''
  sampleSet: string = ''
  stackLeniency: string = ''
  mode: string = ''
  letterboxInBreaks: string = ''
  widescreenStoryboard: string = ''
  audioFilename: string = ''
}

export class BeatmapEditor {
  distanceSpacing: string = ''
  beatDivisor: string = ''
  gridSize: string = ''
  timelineZoom: string = ''
}

export class BeatmapDifficulty {
  hpDrainRate: string = ''
  circleSize: string = ''
  overallDifficulty: string = ''
  approachRate: string = ''
  sliderMultiplier: string = ''
  sliderTickRate: string = ''
}

export class BeatmapTimingPoint {
  raw: string
  constructor(raw: string) {
    this.raw = raw
  }
}

export class BeatmapColours {
  combo1: string = ''
  combo2: string = ''
  combo3: string = ''
  combo4: string = ''
}

export class Beatmap {
  metadata: BeatmapMetadata = new BeatmapMetadata()
  hitobjects: HitObject[] = []
  general: BeatmapGeneral = new BeatmapGeneral()
  editor: BeatmapEditor = new BeatmapEditor()
  difficulty: BeatmapDifficulty = new BeatmapDifficulty()
  timingPoints: BeatmapTimingPoint[] = []
  colours: BeatmapColours = new BeatmapColours()
  events: string[] = []

  constructor(contents: string) {
    const decoded = RawParse(contents)

    const metadata = decoded['Metadata']
    if (metadata) {
      this.metadata.artist = metadata['Artist'] || ''
      this.metadata.creator = metadata['Creator'] || ''
      this.metadata.source = metadata['Source'] || ''
      this.metadata.title = metadata['Title'] || ''
      this.metadata.titleUnicode = metadata['TitleUnicode'] || ''
      this.metadata.artistUnicode = metadata['ArtistUnicode'] || ''
      this.metadata.version = metadata['Version'] || ''
      this.metadata.tags = metadata['Tags'] || ''
    }

    const general = decoded['General']
    if (general) {
      this.general.audioLeadIn = general['AudioLeadIn'] || ''
      this.general.previewTime = general['PreviewTime'] || ''
      this.general.countdown = general['Countdown'] || ''
      this.general.sampleSet = general['SampleSet'] || ''
      this.general.stackLeniency = general['StackLeniency'] || ''
      this.general.mode = general['Mode'] || ''
      this.general.letterboxInBreaks = general['LetterboxInBreaks'] || ''
      this.general.widescreenStoryboard = general['WidescreenStoryboard'] || ''
      this.general.audioFilename = general['AudioFilename'] || ''
    }

    const editor = decoded['Editor']
    if (editor) {
      this.editor.distanceSpacing = editor['DistanceSpacing'] || ''
      this.editor.beatDivisor = editor['BeatDivisor'] || ''
      this.editor.gridSize = editor['GridSize'] || ''
      this.editor.timelineZoom = editor['TimelineZoom'] || ''
    }

    const difficulty = decoded['Difficulty']
    if (difficulty) {
      this.difficulty.hpDrainRate = difficulty['HPDrainRate'] || ''
      this.difficulty.circleSize = difficulty['CircleSize'] || ''
      this.difficulty.overallDifficulty = difficulty['OverallDifficulty'] || ''
      this.difficulty.approachRate = difficulty['ApproachRate'] || ''
      this.difficulty.sliderMultiplier = difficulty['SliderMultiplier'] || ''
      this.difficulty.sliderTickRate = difficulty['SliderTickRate'] || ''
    }

    const timingPoints = decoded['TimingPoints']
    if (Array.isArray(timingPoints)) {
      this.timingPoints = timingPoints.map((tp) => new BeatmapTimingPoint(tp))
    }

    const colours = decoded['Colours']
    if (colours) {
      this.colours.combo1 = colours['Combo1'] || ''
      this.colours.combo2 = colours['Combo2'] || ''
      this.colours.combo3 = colours['Combo3'] || ''
      this.colours.combo4 = colours['Combo4'] || ''
    }

    const events = decoded['Events']
    if (Array.isArray(events)) {
      this.events = events
    }

    const hitobjects = decoded['HitObjects']
    if (hitobjects) {
      for (const line of hitobjects) {
        const hitObject = ParseRawHitobject(line)
        if (hitObject) {
          this.hitobjects.push(hitObject)
        }
      }
    }
  }
}
