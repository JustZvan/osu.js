import * as fflate from 'fflate'
import { BeatmapLoader } from './parser'
import type { Beatmap } from 'osu-classes'

export async function parseOszFile(
  url: string,
): Promise<{ beatmaps: Beatmap[]; files: fflate.Unzipped }> {
  const res = await fetch(url)
  const arrayBuffer = await res.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  const files = await new Promise<fflate.Unzipped>((resolve, reject) => {
    fflate.unzip(uint8Array, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  const osuFiles = Object.keys(files).filter((filename) =>
    filename.endsWith('.osu'),
  )

  const loader = new BeatmapLoader()
  const beatmaps = osuFiles.map((filename) => {
    const content = files[filename]
    const contentString = new TextDecoder().decode(content)

    return loader.parseFromString(contentString)
  })

  return { beatmaps, files }
}
