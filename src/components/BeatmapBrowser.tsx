import { useState, useMemo, useRef } from 'react'
import {
  MdAdd,
  MdOutlineLibraryMusic,
  MdPause,
  MdPlayArrow,
} from 'react-icons/md'
import { OsuDirectBeatmapProvider } from '@/lib/osu/mirrors/osudirect'
import { BeatmapInfo } from '@/lib/osu/mirrors/provider'
import { useSavedBeatmaps } from '@/lib/hooks/useStorage'

function BeatmapCard({
  beatmap,
  savedBeatmaps,
}: {
  beatmap: BeatmapInfo
  savedBeatmaps: ReturnType<typeof useSavedBeatmaps>
}) {
  const audioRef = useRef<HTMLAudioElement>(null)

  return (
    <div
      key={beatmap.id}
      className="rounded-xl max-h-24 overflow-clip flex gap-2 shadow hover:bg-zinc-700 transition relative"
    >
      <img
        src={beatmap.cardCover}
        alt=""
        className="h-full w-full absolute object-cover"
      />

      <div className="flex bg-zinc-700/90 w-full h-full z-10">
        <div className="relative w-24 h-24">
          <img
            src={beatmap.listCover}
            alt=""
            className="h-24 w-24 absolute -z-10"
          />

          <div className="absolute inset-0 flex items-center justify-center z-20">
            <button
              className="bg-black/70 hover:opacity-100 opacity-0 h-full w-full hover:flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                const audio = audioRef.current
                if (audio) {
                  if (audio.paused) {
                    audio.currentTime = 0
                    audio.play()
                  } else {
                    audio.pause()
                  }
                }
              }}
            >
              {audioRef.current?.paused ? (
                <MdPlayArrow className="text-3xl" />
              ) : (
                <MdPause className="text-3xl" />
              )}
            </button>
          </div>

          <audio
            ref={audioRef}
            src={beatmap.previewUrl}
            autoPlay={false}
            className="h-24 w-24"
          ></audio>
        </div>

        <div className="flex flex-col leading-none p-2">
          <div className="text-xl font-bold">{beatmap.title}</div>

          <div className="text-md">by {beatmap.artist}</div>

          <div className="text-xs text-zinc-300">
            mapped by {beatmap.mapper}
          </div>
        </div>

        <div className="h-full absolute right-0 flex items-center">
          <button
            className="hover:text-zinc-500"
            onClick={() => {
              savedBeatmaps.toggleBeatmap(beatmap)
            }}
          >
            <MdAdd className="text-3xl" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function BeatmapBrowser({
  setIsOpen,
  savedBeatmaps,
}: {
  setIsOpen: (open: boolean) => void
  savedBeatmaps: ReturnType<typeof useSavedBeatmaps>
}) {
  const beatmapProvider = useMemo(() => new OsuDirectBeatmapProvider(), [])
  const [results, setResults] = useState<BeatmapInfo[]>([])

  return (
    <div className="absolute left-0 top-0 w-full h-full z-30 flex pointer-events-auto">
      <div
        onClick={() => setIsOpen(false)}
        className="absolute h-screen w-screen -z-10 bg-black/60"
      ></div>

      <div className="flex flex-col w-[90%] absolute left-1/2 -translate-x-1/2 h-full">
        <div className="min-h-20 bg-gray-800 flex items-center text-3xl px-24 w-full gap-6">
          <MdOutlineLibraryMusic className="text-5xl" />
          <div>beatmap listing</div>
        </div>

        <div className="min-h-48 bg-zinc-900 px-16 flex items-center justify-center">
          <input
            type="text"
            className="w-full px-4 h-14 bg-zinc-800 rounded-lg"
            placeholder="type in keywords..."
            onChange={async (e) => {
              const query = e.target.value

              const beatmaps = await beatmapProvider.searchBeatmaps(query)
              setResults(beatmaps)
            }}
          />
        </div>

        <div className="max-h-full h-full bg-zinc-900 overflow-y-auto overflow-x-hidden">
          <div className="p-8 grid grid-cols-4 gap-6 items-center">
            {results.length === 0 ? (
              <div className="text-zinc-400 col-span-4 text-center">
                No beatmaps found.
              </div>
            ) : (
              results.map((beatmap) => (
                <BeatmapCard
                  key={beatmap.id}
                  beatmap={beatmap}
                  savedBeatmaps={savedBeatmaps}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
