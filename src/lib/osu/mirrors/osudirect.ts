import { BeatmapInfo, BeatmapProvider, Submap } from './provider'

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
        preview_url,
        beatmaps: submapsData,
      }: {
        id: number
        title: string
        artist: string
        creator: string
        covers: {
          [key: string]: string
        }
        nsfw: boolean
        preview_url: string
        beatmaps: any[]
      }) => {
        // get this weirdo shit out of here
        if (nsfw) return

        const submaps = submapsData
          ? submapsData.map((submapData) => new Submap(submapData))
          : []

        const beatmap = new BeatmapInfo(
          id,
          title,
          artist,
          creator,
          covers.card,
          covers['list@2x'],
          preview_url,
          submaps,
        )

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
