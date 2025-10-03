import { BeatmapInfo } from '@/lib/osu/mirrors/provider'

interface SubmapCardProps {
  submap: any
  beatmap: BeatmapInfo
  isSelected: boolean
  onClick: () => void
}

export function SubmapCard({
  submap,
  beatmap,
  isSelected,
  onClick,
}: SubmapCardProps) {
  return (
    <button
      className={`relative border-2 border-zinc-500 h-24 bg-gradient-to-r from-black/90 to-black/60 flex overflow-hidden text-left shadow-lg hover:shadow-xl group transition-all duration-200 ${
        isSelected
          ? 'w-[28vw] ml-[2vw] scale-[1.03] shadow-lg z-10'
          : 'w-[24vw] ml-[6vw]'
      } hover:scale-[1.02]`}
      onClick={onClick}
    >
      <img
        src={beatmap.cardCover}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
      />

      <div className="relative z-10 flex items-center w-full h-full">
        <div className="flex-1 px-4 py-2 min-w-0">
          <div className="text-lg font-semibold text-white truncate">
            {submap.version}
          </div>
          <div className="text-sm text-zinc-300 truncate">
            by {beatmap.artist}
          </div>
          <div className="text-xs text-zinc-400 truncate">
            ★ {submap.difficulty_rating.toFixed(2)}
          </div>
        </div>
      </div>
    </button>
  )
}
