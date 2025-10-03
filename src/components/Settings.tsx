import { FaDisplay } from 'react-icons/fa6'
import { useSettings } from '@/lib/hooks/useStorage'

function SettingCheck({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="p-1">
        <button
          className={`h-3 w-3 rounded-full ${checked ? 'bg-rose-400' : 'border-2 border-rose-400'}`}
          onClick={() => onChange(!checked)}
        ></button>
      </div>

      <div>{label}</div>
    </div>
  )
}
function SettingsSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex w-full items-center gap-4">
      <div className="whitespace-nowrap">{label}</div>
      <div
        className="relative flex w-full rounded-full cursor-pointer items-center"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
          onChange(Math.round(percentage))
        }}
      >
        <div
          className="h-[1px] bg-rose-400 rounded-full transition-all duration-150"
          style={{ width: `${value}%` }}
        />

        <div
          className="w-4 h-4 border border-rose-400 rounded-full -top-1 transition-all duration-150 cursor-grab active:cursor-grabbing"
          style={{ left: `calc(${value}% - 8px)` }}
          onMouseDown={(e) => {
            const slider = e.currentTarget.parentElement!
            const rect = slider.getBoundingClientRect()

            const handleMouseMove = (e: MouseEvent) => {
              const x = e.clientX - rect.left
              const percentage = Math.max(
                0,
                Math.min(100, (x / rect.width) * 100),
              )
              onChange(Math.round(percentage))
            }

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />

        <div
          className="h-[1px] right-0 bg-rose-500 rounded-full transition-all duration-150"
          style={{ width: `${100 - value}%` }}
        />
      </div>
    </div>
  )
}

export function Settings({ closeSettings }: { closeSettings: () => void }) {
  const settings = useSettings()

  return (
    <div
      className={`absolute left-0 top-0 h-full bg-black/70 z-10 flex transition-transform duration-300`}
    >
      <div className="h-full bg-black w-20 flex justify-center">
        <button className="aspect-square h-20 flex justify-center text-3xl items-center">
          <FaDisplay />
        </button>
      </div>

      <button
        className="absolute bottom-14 left-0 bg-pink-500 clip-slant w-30 h-14 text-3xl"
        onClick={closeSettings}
      >
        back
      </button>

      <div className="h-full w-full">
        <div className="p-6 py-8 w-full h-full">
          <div className="flex flex-col h-full w-full">
            <div className="text-center">
              <div className="text-3xl font-light mt-14">Options</div>
              <div className="mb-14 text-rose-400 px-24 text-xl">
                Change the way osu.js behaves
              </div>
            </div>

            <div className="h-full w-full flex flex-col">
              <div>
                <div className="text-4xl text-right text-blue-400 pb-2">
                  GRAPHICS
                </div>

                <div className="border-l-4 border-zinc-600 px-2">
                  <div>GENERAL</div>

                  <div>
                    <SettingCheck
                      label="Seasonal Backgrounds"
                      checked={settings.settings.seasonalBackgrounds}
                      onChange={() => {
                        settings.updateSetting(
                          'seasonalBackgrounds',
                          !settings.settings.seasonalBackgrounds,
                        )
                      }}
                    />

                    <SettingCheck
                      label="Video Backgrounds"
                      checked={settings.settings.videoBackgrounds}
                      onChange={() => {
                        settings.updateSetting(
                          'videoBackgrounds',
                          !settings.settings.videoBackgrounds,
                        )
                      }}
                    />

                    <SettingsSlider
                      label="Background Opacity"
                      value={settings.settings.opacity}
                      onChange={(value) => {
                        settings.updateSetting('opacity', value)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
