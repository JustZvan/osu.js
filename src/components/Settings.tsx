import cogIcon from '@/assets/icons/cog_solid.svg'
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
    <div className="flex w-full items-center justify-between">
      <div>{label}</div>

      <div className="flex items-center justify-center w-14">
        <button
          className={`h-4 rounded-full ${checked ? 'bg-purple-600 w-14' : 'border-2 border-purple-600 w-10'}`}
          onClick={() => onChange(!checked)}
        ></button>
      </div>
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
    <div className="flex flex-col w-full">
      <div>{label}</div>

      <div className="flex items-center">
        <div
          className="relative w-full h-2 bg-slate-800 rounded-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const percentage = Math.max(
              0,
              Math.min(100, (x / rect.width) * 100),
            )
            onChange(Math.round(percentage))
          }}
        >
          <div
            className="absolute h-2 bg-purple-600 rounded-full transition-all duration-150"
            style={{ width: `${value}%` }}
          />

          <div
            className="absolute w-4 h-4 bg-purple-600 rounded-full -top-1 transition-all duration-150 cursor-grab active:cursor-grabbing"
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
        </div>
      </div>
    </div>
  )
}

export function Settings() {
  const settings = useSettings()

  return (
    <div
      className={`absolute left-0 top-14 h-full bg-settings-bg-2 z-10 flex transition-transform duration-300`}
    >
      <div className="h-full w-56 bg-settings-bg-1 pr-16">
        <button className="w-full p-8 flex justify-start text-xl items-center">
          <img
            src={cogIcon}
            alt="Settings"
            className="h-6 mr-2 inline"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          General
        </button>
      </div>

      <div className="h-full w-full">
        <div className="p-6 py-8 w-full h-full min-w-96">
          <div className="flex flex-col h-full w-full">
            <div className="text-5xl">settings</div>
            <div className="mb-14">change the way osu.js behaves</div>

            <div className="h-full w-full flex flex-col">
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
  )
}
