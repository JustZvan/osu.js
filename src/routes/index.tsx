import { createFileRoute, useNavigate } from '@tanstack/react-router'
import logo from '@/assets/logo.png'
import { useState, useEffect, useRef, type JSX } from 'react'

import { FaGithub } from 'react-icons/fa'

import cogIcon from '@/assets/icons/cog_solid.svg'

import { MdOutlineLibraryMusic } from 'react-icons/md'

import { BeatmapInfo } from '@/lib/osu/mirrors/provider'
import { useSavedBeatmaps, useSettings } from '@/lib/hooks/useStorage'
import { useSeasonalBackgrounds } from '@/lib/osu/ui/backgrounds'
import { useEvents } from '@/lib/osu/ui/events'
import useInterval from '@/lib/hooks/useInterval'
import { BeatmapBrowser } from '@/components/BeatmapBrowser'
import { Settings } from '@/components/Settings'
import { RainbowBackground } from '@/components/RainbowBackground'
import { BeatmapCard } from '@/components/BeatmapCard'
import { SubmapCard } from '@/components/SubmapCard'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [currentTime, setCurrentTime] = useState(0)
  const [showLibrary, setShowLibrary] = useState(false)
  const savedBeatmaps = useSavedBeatmaps()

  const [selectedCard, setSelectedCard] = useState<BeatmapInfo | null>(null)
  const [selectedSubmapId, setSelectedSubmapId] = useState<number | null>(null)

  const [showPreIntro, setShowPreIntro] = useState(true)
  const [showIntro, setShowIntro] = useState(false)
  const [audioLoaded, setAudioLoaded] = useState(false)
  const audioUrl = '/circles.mp3'
  const audioRef = useRef<HTMLAudioElement>(null)

  const [bounce, setBounce] = useState(1)
  const animationFrameRef = useRef<number>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const events = useEvents()

  const [eventIndex, setEventIndex] = useState(0)

  useEffect(() => {
    if (savedBeatmaps.savedBeatmaps.length > 0) {
      const randomBeatmap =
        savedBeatmaps.savedBeatmaps[
          Math.floor(Math.random() * savedBeatmaps.savedBeatmaps.length)
        ]
      setSelectedCard(randomBeatmap)
      if (
        Array.isArray(randomBeatmap.submaps) &&
        randomBeatmap.submaps.length > 0
      ) {
        const randomSubmap =
          randomBeatmap.submaps[
            Math.floor(Math.random() * randomBeatmap.submaps.length)
          ]
        setSelectedSubmapId(randomSubmap.id)
      }
    }
  }, [savedBeatmaps.savedBeatmaps.length])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 10)
    return () => clearInterval(interval)
  }, [])

  const [settingsShown, setSettingsShown] = useState(false)
  const navigate = useNavigate()
  const { backgrounds } = useSeasonalBackgrounds()

  const [bgIndex, setBgIndex] = useState(0)
  const [nextBgIndex, setNextBgIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const settings = useSettings()

  useInterval(() => {
    if (events && events.images.length > 0) {
      setEventIndex((prev) => (prev + 1) % events.images.length)
    }
  }, 10000)

  useInterval(() => {
    if (
      settings.settings.seasonalBackgrounds &&
      backgrounds &&
      backgrounds.length > 0
    ) {
      const nextIndex = (bgIndex + 1) % backgrounds.length
      setNextBgIndex(nextIndex)
      setIsFading(true)

      setTimeout(() => {
        setBgIndex(nextIndex)
        setIsFading(false)
      }, 500)
    }
  }, 20000)

  useEffect(() => {
    if (!showIntro) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      analyserRef.current = null
      return
    }

    let running = true
    let lastBounce = 1
    let lastPeak = 0
    let beatCooldown = 0
    const MIN_BEAT_INTERVAL = 200

    const setupAudio = () => {
      if (!audioRef.current) return
      if (audioCtxRef.current) return
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)()
      audioCtxRef.current = ctx
      const src = ctx.createMediaElementSource(audioRef.current)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      src.connect(analyser)
      analyser.connect(ctx.destination)
      analyserRef.current = analyser
    }

    setupAudio()

    const animate = () => {
      if (!running || !analyserRef.current) return
      const analyser = analyserRef.current
      const data = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(data)

      const bass = data.slice(0, 32)
      const avgBass = bass.reduce((a, b) => a + b, 0) / bass.length
      const now = performance.now()
      if (avgBass > 180 && now - lastPeak > MIN_BEAT_INTERVAL) {
        lastPeak = now
        lastBounce = 1.1
        setBounce(1.1)
        beatCooldown = 6
      } else if (beatCooldown > 0) {
        beatCooldown--
      } else {
        lastBounce = Math.max(1, lastBounce - 0.04)
        setBounce(lastBounce)
      }
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animationFrameRef.current = requestAnimationFrame(animate)
    return () => {
      running = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
      analyserRef.current = null
    }
  }, [showIntro])

  let content: JSX.Element

  if (showPreIntro) {
    content = (
      <main className="game-cursor overflow-hidden h-screen w-screen flex items-center justify-center bg-black">
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          loop
          onCanPlayThrough={() => setAudioLoaded(true)}
          style={{ display: 'none' }}
        />
        <button
          className="flex flex-col items-center justify-center h-full w-full"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={() => {
            if (audioRef.current && audioLoaded) {
              audioRef.current.play()
              setShowPreIntro(false)
              setShowIntro(true)
            }
          }}
          disabled={!audioLoaded}
        >
          <span className="text-3xl text-white mb-4">
            {audioLoaded ? (
              <div>
                <div>click anywhere to begin</div>
                <div className="text-xs text-zinc-400">
                  note this will play audio
                </div>
              </div>
            ) : (
              <div>loading...</div>
            )}
          </span>
        </button>
      </main>
    )
  } else if (showIntro) {
    content = (
      <main className="game-cursor overflow-hidden h-screen w-screen flex items-center justify-center p-48 relative">
        {settings.settings.seasonalBackgrounds ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
            style={{
              backgroundImage: `url(${backgrounds[bgIndex]?.url})`,
              opacity: isFading ? 0 : 1,
            }}
          />
        ) : (
          <div>
            <RainbowBackground />
          </div>
        )}

        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${backgrounds[nextBgIndex]?.url})`,
            opacity: isFading ? 1 : 0,
          }}
        />

        <audio
          ref={audioRef}
          src={audioUrl}
          autoPlay
          style={{ display: 'none' }}
        />
        <button
          onClick={() => setShowIntro(false)}
          className="h-full relative z-10"
        >
          <img
            src={logo}
            alt="Logo"
            className={`drop-shadow-xl h-full`}
            style={{
              transform: `scale(${bounce})`,
              transition:
                bounce > 1
                  ? 'transform 0.08s cubic-bezier(.5,2,.5,1)'
                  : 'transform 0.2s',
            }}
          />
        </button>

        <div className="absolute bottom-0 grid grid-cols-3 w-full z-10 bg-black/50">
          <div className="p-4 flex flex-col justify-center">
            <div className="text-5xl text-white pencil-child">JustZvan</div>
            <div>not affiliated with osu! in any way!</div>
          </div>

          <div className="flex h-full items-center justify-center">
            {events && events.images.length > 0 && (
              <a
                href={events.images[eventIndex]?.url}
                className="flex items-center justify-center"
              >
                <img
                  src={events.images[eventIndex]?.image}
                  alt="Event"
                  className="h-30"
                />
              </a>
            )}
          </div>

          <div className="flex items-center justify-end">
            <div className="aspect-square items-center justify-center flex">
              <a href="https://github.com/JustZvan/osu.js">
                <FaGithub className="text-8xl text-white mr-2 inline" />
              </a>
            </div>
          </div>
        </div>
      </main>
    )
  } else {
    content = (
      <main className="game-cursor overflow-hidden relative">
        <img
          src={selectedCard?.cardCover}
          alt=""
          className="absolute h-screen w-screen opacity-80 object-cover -z-10 blur-xl transition-all duration-1000"
        />

        {showLibrary && (
          <BeatmapBrowser
            setIsOpen={(_) => setShowLibrary(false)}
            savedBeatmaps={savedBeatmaps}
          />
        )}

        {settingsShown && (
          <Settings closeSettings={() => setSettingsShown(false)} />
        )}

        <div className="h-screen w-screen flex flex-col z-20">
          <div className="bg-zinc-900 w-full h-fit flex justify-between items-center pr-4 p-0.5">
            <div>
              <button
                className="flex items-center p-6 py-3 hover:bg-zinc-800 rounded"
                onClick={() => setSettingsShown(!settingsShown)}
              >
                <img
                  src={cogIcon}
                  alt="Settings"
                  className="h-8"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </button>
            </div>

            <div className="flex gap-2 h-full items-center p-1">
              <button
                className="p-2 hover:bg-zinc-800 h-full aspect-square items-center justify-center flex text-3xl rounded-lg"
                onClick={() => setShowLibrary(!showLibrary)}
                title="Search beatmaps"
              >
                <MdOutlineLibraryMusic />
              </button>

              <div className="text-xl w-20">
                {new Date(currentTime).toLocaleTimeString([], {
                  hour12: false,
                })}
              </div>
            </div>
          </div>

          <div className="w-full h-full flex justify-between">
            <div className="bg-zinc-800/80 w-fit h-fit p-4 clip-slant pr-96">
              <div className="uppercase bg-green-400 text-black px-2 rounded-full text-sm w-fit">
                You cant play ranked on osu.js lol
              </div>

              <div className="text-4xl">{selectedCard?.title}</div>
              <div className="text-2xl">{selectedCard?.artist}</div>
              <div className="text-xl">{selectedCard?.mapper}</div>

              <div className="flex gap-2 flex-wrap"></div>
            </div>

            <div className="h-full flex flex-col justify-center gap-2 p-4">
              {savedBeatmaps.savedBeatmaps.length === 0 ? (
                <div className="text-zinc-400 text-center py-8">
                  No saved beatmaps yet. Add some from the library!
                </div>
              ) : (
                <div className="flex flex-col gap-2 overflow-scroll h-1/2 overflow-x-hidden">
                  {savedBeatmaps.savedBeatmaps.map((b) => (
                    <div key={b.id} className="flex flex-col gap-2">
                      <BeatmapCard
                        beatmap={b}
                        onClick={() =>
                          setSelectedCard(selectedCard?.id === b.id ? null : b)
                        }
                        onContextMenu={(e) => {
                          e.preventDefault()
                          savedBeatmaps.removeBeatmap(b.id)
                        }}
                      />

                      {selectedCard?.id === b.id &&
                        Array.isArray(b.submaps) &&
                        b.submaps.length > 0 && (
                          <div className="w-[30vw] rounded-lg p-4 ml-0">
                            <div className="flex flex-col gap-2">
                              {(Array.isArray(b.submaps) ? b.submaps : [])
                                .sort(
                                  (a, b) =>
                                    a.difficulty_rating - b.difficulty_rating,
                                )
                                .map((submap) => {
                                  const isSelected =
                                    selectedSubmapId === submap.id
                                  return (
                                    <SubmapCard
                                      key={submap.id}
                                      submap={submap}
                                      beatmap={b}
                                      isSelected={isSelected}
                                      onClick={() =>
                                        setSelectedSubmapId(
                                          isSelected ? null : submap.id,
                                        )
                                      }
                                    />
                                  )
                                })}
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 right-0 translate-x-1/8 translate-y-1/3 overflow-hidden transition-all hover:scale-120 active:scale-95">
            <button
              onClick={() => {
                if (selectedCard && selectedSubmapId) {
                  const selectedSubmap = selectedCard.submaps?.find(
                    (submap) => submap.id === selectedSubmapId,
                  )
                  if (selectedSubmap) {
                    const oszUrl = `https://osu.direct/api/d/${selectedCard.id}`
                    navigate({
                      to: '/game',
                      search: {
                        oszUrl: oszUrl,
                        beatmapInfo: JSON.stringify({
                          id: selectedCard.id,
                          title: selectedCard.title,
                          artist: selectedCard.artist,
                          mapper: selectedCard.mapper,
                          selectedSubmap: selectedSubmap,
                        }),
                        difficulties: JSON.stringify(
                          selectedCard.submaps || [],
                        ),
                        selectedDifficulty: selectedSubmap.version,
                      },
                    })
                  }
                }
              }}
              className={`transition-all ${
                selectedCard && selectedSubmapId
                  ? 'cursor-pointer hover:brightness-110'
                  : 'cursor-default opacity-50'
              }`}
            >
              <img src={logo} alt="Logo" className="h-80" />
            </button>
          </div>
        </div>
      </main>
    )
  }

  return content
}
