import { BeatmapInfo, BeatmapProvider } from './provider'

export class OsuDirectBeatmapProvider extends BeatmapProvider {
  async searchBeatmaps(query: string) {
    const res = await fetch(`https://osu.direct/api/v2/search?q=${query}`)

    const data = await res.json()

    const beatmaps: BeatmapInfo[] = []

    data.forEach(
      ({
        id,
        title,
        artist,
        creator,
        covers,
        nsfw,
      }: {
        id: number
        title: string
        artist: string
        creator: string
        covers: {
          [key: string]: string
        }
        nsfw: boolean
      }) => {
        // get this weirdo shit out of here
        if (nsfw) return

        const beatmap = new BeatmapInfo(id, title, artist, creator, covers.card)

        beatmaps.push(beatmap)
      },
    )

    return beatmaps
  }

  async downloadOsz(id: number): Promise<ArrayBuffer> {
    const res = await fetch(`https://osu.direct/api/d/${id}`, {
      headers: {
        accept: 'application/octet-stream',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
      redirect: 'follow',
    })

    if (!res.ok) {
      throw new Error(`Failed to download beatmap ${id}: ${res.status}`)
    }

    return await res.arrayBuffer()
  }
}
