import { BeatmapInfo } from '@/lib/osu/mirrors/provider'

interface BeatmapCardProps {
  beatmap: BeatmapInfo
  onClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  className?: string
}

export function BeatmapCard({
  beatmap,
  onClick,
  onContextMenu,
  className = '',
}: BeatmapCardProps) {
  return (
    <button
      className={`relative border-2 border-zinc-500 h-24 bg-gradient-to-r from-black/90 to-black/60 flex overflow-hidden text-left shadow-lg hover:shadow-xl group w-[30vw] ${className}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <img
        src={beatmap.cardCover}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
      />

      <div className="relative z-10 flex items-center w-full h-full">
        <div className="flex-1 px-4 py-2 min-w-0">
          <div className="text-lg font-semibold text-white truncate">
            {beatmap.title}
          </div>
          <div className="text-sm text-zinc-300 truncate">
            by {beatmap.artist}
          </div>
          <div className="text-xs text-zinc-400 truncate">
            mapped by {beatmap.mapper}
          </div>
        </div>
      </div>
    </button>
  )
}
