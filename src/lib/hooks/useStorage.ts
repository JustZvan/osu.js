import { useState, useEffect, useCallback } from 'react'
import { StorageManager } from '../storage/StorageManager'
import type { StorageKey, StorageSchema } from '../storage/StorageManager'
import { BeatmapInfo } from '../osu/mirrors/provider'
import { OsuDirectBeatmapProvider } from '../osu/mirrors/osudirect'

export type Settings = {
  videoBackgrounds: boolean
  seasonalBackgrounds: boolean
  opacity: number // 1-100
}

const DEFAULT_SETTINGS: Settings = {
  videoBackgrounds: true,
  seasonalBackgrounds: true,
  opacity: 100,
}

const osuDirectProvider = new OsuDirectBeatmapProvider()

let PRELOADED_BEATMAPS: BeatmapInfo[] = []

async function initializePreloadedBeatmaps() {
  const savedBeatmaps = StorageManager.get('savedBeatmaps')

  if (savedBeatmaps.length === 0) {
    const ids = [891334, 292301, 13177, 241526, 1839623, 2297706]
    const beatmaps: BeatmapInfo[] = []
    for (const id of ids) {
      try {
        const beatmap = await osuDirectProvider.getBeatmapById(id)
        if (beatmap) {
          beatmaps.push(beatmap)
          StorageManager.beatmaps.add(beatmap)
        }
      } catch (e) {}
    }
    PRELOADED_BEATMAPS = beatmaps
  }
}

export function useStorage<K extends StorageKey>(key: K) {
  const [value, setValue] = useState<StorageSchema[K]>(() =>
    StorageManager.get(key),
  )

  useEffect(() => {
    if (key === 'savedBeatmaps') {
      initializePreloadedBeatmaps()
    }
  }, [key])

  const updateValue = useCallback(
    (newValue: StorageSchema[K]) => {
      StorageManager.set(key, newValue)
      setValue(newValue)
    },
    [key],
  )

  const removeValue = useCallback(() => {
    StorageManager.remove(key)
    setValue(StorageManager.get(key))
  }, [key])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const storageKey = `osu-js-${key}`
      if (e.key === storageKey) {
        setValue(StorageManager.get(key))
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return {
    value,
    setValue: updateValue,
    removeValue,
    hasValue: StorageManager.has(key),
  }
}

export function useSettings() {
  const { value, setValue } = useStorage('settings' as any)

  const settings: Settings = {
    videoBackgrounds:
      value?.videoBackgrounds ?? DEFAULT_SETTINGS.videoBackgrounds,
    seasonalBackgrounds:
      value?.seasonalBackgrounds ?? DEFAULT_SETTINGS.seasonalBackgrounds,
    opacity:
      typeof value?.opacity === 'number'
        ? Math.max(1, Math.min(100, value.opacity))
        : DEFAULT_SETTINGS.opacity,
  }

  const updateSetting = <K extends keyof Settings>(
    key: K,
    newValue: Settings[K],
  ) => {
    setValue({ ...settings, [key]: newValue })
  }

  return {
    settings,
    setSettings: setValue,
    updateSetting,
  }
}

export function useSavedBeatmaps() {
  initializePreloadedBeatmaps()
  const { value: savedBeatmaps, setValue } = useStorage('savedBeatmaps')

  const addBeatmap = useCallback(
    (beatmap: BeatmapInfo) => {
      StorageManager.beatmaps.add(beatmap)
      setValue(StorageManager.get('savedBeatmaps'))
    },
    [setValue],
  )

  const removeBeatmap = useCallback(
    (beatmapId: any) => {
      StorageManager.beatmaps.remove(beatmapId)
      setValue(StorageManager.get('savedBeatmaps'))
    },
    [setValue],
  )

  const toggleBeatmap = useCallback(
    (beatmap: BeatmapInfo): boolean => {
      const isSaved = StorageManager.beatmaps.toggle(beatmap)
      setValue(StorageManager.get('savedBeatmaps'))
      return isSaved
    },
    [setValue],
  )

  const isBeatmapSaved = useCallback((beatmapId: any): boolean => {
    return StorageManager.beatmaps.isSaved(beatmapId)
  }, [])

  const clearAllBeatmaps = useCallback(() => {
    StorageManager.beatmaps.clear()
    setValue(StorageManager.get('savedBeatmaps'))
  }, [setValue])

  return {
    savedBeatmaps,
    addBeatmap,
    removeBeatmap,
    toggleBeatmap,
    isBeatmapSaved,
    clearAllBeatmaps,
    count: savedBeatmaps.length,
  }
}
