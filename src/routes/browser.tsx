import { OsuDirectBeatmapProvider } from '@/lib/osu/mirrors/osudirect'
import { BeatmapInfo } from '@/lib/osu/mirrors/provider'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { parseOszFile } from '@/lib/osu/compressed'

export const Route = createFileRoute('/browser')({
  component: RouteComponent,
})

function RouteComponent() {
  const provider = useMemo(() => new OsuDirectBeatmapProvider(), [])
  const navigate = useNavigate()

  const [query, setQuery] = useState('')

  const [beatmaps, setBeatmaps] = useState<BeatmapInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await provider.searchBeatmaps(query.trim())
      setBeatmaps(res)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch beatmaps')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadAndPlay = async (beatmapInfo: BeatmapInfo) => {
    try {
      const oszBuffer = await provider.downloadOsz(beatmapInfo.id)

      const blob = new Blob([oszBuffer], { type: 'application/octet-stream' })
      const oszUrl = URL.createObjectURL(blob)

      const { beatmaps } = await parseOszFile(oszUrl)

      navigate({
        to: '/game',
        search: {
          oszUrl,
          beatmapInfo: JSON.stringify(beatmapInfo),
          difficulties: JSON.stringify(
            beatmaps.map((b) => ({
              version: b.metadata.version,
              artist: b.metadata.artist,
              title: b.metadata.title,
              creator: b.metadata.creator,
            })),
          ),
        },
      })
    } catch (e: any) {
      setError(e?.message ?? 'Failed to download beatmap')
    }
  }

  return (
    <div className="min-h-screen w-screen flex flex-col items-center py-12">
      <h1 className="font-semibold text-5xl md:text-6xl mb-6">
        Search for beatmaps
      </h1>

      <div className="flex w-full items-center justify-center px-4 overflow-x-hidden">
        <input
          type="text"
          className="py-4 bg-zinc-900/80 border border-zinc-800 focus:border-yellow-400/60 focus:outline-none rounded-full w-full max-w-xl px-6 shadow-inner"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void runSearch()
          }}
        />

        <button
          className="ml-2 rounded-full bg-yellow-400 px-6 py-4 font-semibold transition hover:bg-yellow-300 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={runSearch}
          disabled={!query.trim() || loading}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Status area */}
      <div className="w-full max-w-6xl px-4 mt-6">
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/30 text-red-200 px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Results grid */}
      <div className="w-full max-w-6xl px-4 mt-6">
        {loading && (
          <div className="flex items-center gap-3 text-zinc-300">
            <span className="h-5 w-5 rounded-full border-2 border-zinc-600 border-t-yellow-400 animate-spin" />
            Searching beatmaps…
          </div>
        )}

        {!loading && beatmaps.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {beatmaps.map((b) => (
              <div
                key={b.id}
                className="group rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-yellow-400/60 transition overflow-hidden shadow-lg hover:shadow-yellow-400/10"
              >
                {b.cardCover && (
                  <img
                    src={b.cardCover}
                    alt={b.title + ' cover'}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-5">
                  <div className="text-sm text-zinc-400 truncate">
                    {b.artist}
                  </div>
                  <h3 className="mt-1 text-xl font-semibold text-zinc-100 line-clamp-2">
                    {b.title}
                  </h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">mapped by</span>
                    <span className="text-sm font-medium text-zinc-200 truncate ml-2">
                      {b.mapper}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDownloadAndPlay(b)}
                    className="mt-4 w-full cursor-pointer rounded-full bg-yellow-400 px-4 py-2 font-semibold text-white transition hover:bg-yellow-300 flex items-center justify-center"
                  >
                    ▶ Play
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
