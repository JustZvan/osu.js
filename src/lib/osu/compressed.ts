import * as fflate from 'fflate'
import { Beatmap } from './parser'

export async function parseOszFile(url: string) {
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

  const beatmaps = osuFiles.map((filename) => {
    const content = files[filename]

    return new Beatmap(new TextDecoder().decode(content))
  })

  return { beatmaps, files }
}
