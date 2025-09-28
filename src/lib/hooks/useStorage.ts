import { useState, useEffect, useCallback } from 'react'
import { StorageManager } from '../storage/StorageManager'
import type { StorageKey, StorageSchema } from '../storage/StorageManager'
import type { BeatmapInfo } from '../osu/mirrors/provider'

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

/**
 * Custom hook for managing localStorage with type safety and reactivity
 */
export function useStorage<K extends StorageKey>(key: K) {
  const [value, setValue] = useState<StorageSchema[K]>(() =>
    StorageManager.get(key),
  )

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

/**
 * Specialized hook for managing saved beatmaps with convenient methods
 */
export function useSavedBeatmaps() {
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
