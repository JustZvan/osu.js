export class Submap {
  beatmapset_id: number
  difficulty_rating: number
  id: number
  mode: string
  status: string
  total_length: number
  user_id: number
  version: string
  accuracy: number
  ar: number
  bpm: number
  convert: boolean
  count_circles: number
  count_sliders: number
  count_spinners: number
  cs: number
  deleted_at: string | null
  drain: number
  hit_length: number
  is_scoreable: boolean
  last_updated: string
  mode_int: number
  passcount: number
  playcount: number
  ranked: number
  url: string
  checksum: string
  max_combo: number

  constructor(data: any) {
    this.beatmapset_id = data.beatmapset_id
    this.difficulty_rating = data.difficulty_rating
    this.id = data.id
    this.mode = data.mode
    this.status = data.status
    this.total_length = data.total_length
    this.user_id = data.user_id
    this.version = data.version
    this.accuracy = data.accuracy
    this.ar = data.ar
    this.bpm = data.bpm
    this.convert = data.convert
    this.count_circles = data.count_circles
    this.count_sliders = data.count_sliders
    this.count_spinners = data.count_spinners
    this.cs = data.cs
    this.deleted_at = data.deleted_at
    this.drain = data.drain
    this.hit_length = data.hit_length
    this.is_scoreable = data.is_scoreable
    this.last_updated = data.last_updated
    this.mode_int = data.mode_int
    this.passcount = data.passcount
    this.playcount = data.playcount
    this.ranked = data.ranked
    this.url = data.url
    this.checksum = data.checksum
    this.max_combo = data.max_combo
  }
}

export class BeatmapProvider {
  async searchBeatmaps(_: string): Promise<BeatmapInfo[]> {
    throw new Error('searchBeatmaps must be implemented!')
  }

  async downloadOsz(_: any): Promise<ArrayBuffer> {
    throw new Error('downloadOsz must be implemented!')
  }
}

export class BeatmapInfo {
  id: any
  title: string
  artist: string
  mapper: string

  cardCover: string
  listCover: string

  previewUrl: string
  submaps: Submap[]

  constructor(
    id: any,
    title: string,
    artist: string,
    mapper: string,
    cardCover: string,
    listCover: string,
    previewUrl?: string,
    submaps?: Submap[],
  ) {
    this.id = id
    this.title = title
    this.artist = artist
    this.mapper = mapper
    this.cardCover = cardCover
    this.listCover = listCover
    this.previewUrl = previewUrl || ''
    this.submaps = submaps || []
  }
}
