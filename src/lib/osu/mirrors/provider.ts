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

  constructor(
    id: any,
    title: string,
    artist: string,
    mapper: string,
    cardCover: string,
  ) {
    this.id = id
    this.title = title
    this.artist = artist
    this.mapper = mapper
    this.cardCover = cardCover
  }
}
