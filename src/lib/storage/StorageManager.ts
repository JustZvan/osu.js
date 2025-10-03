import { BeatmapInfo } from '../osu/mirrors/provider'

export interface StorageSchema {
  savedBeatmaps: BeatmapInfo[]
  selectedSkin: string
}

export type StorageKey = keyof StorageSchema

class StorageManagerClass {
  private prefix = 'osu-js-'

  private getStorageKey(key: StorageKey): string {
    return `${this.prefix}${key}`
  }

  private serializeValue<T>(value: T): string {
    try {
      return JSON.stringify(value)
    } catch (error) {
      console.error('Failed to serialize value:', error)
      throw new Error('Failed to serialize value for storage')
    }
  }

  private deserializeValue<T>(value: string | null, defaultValue: T): T {
    if (value === null) return defaultValue

    try {
      const parsed = JSON.parse(value)
      return parsed as T
    } catch (error) {
      console.error('Failed to deserialize value:', error)
      return defaultValue
    }
  }

  /**
   * Get a value from localStorage with type safety
   */
  get<K extends StorageKey>(key: K): StorageSchema[K] {
    const storageKey = this.getStorageKey(key)
    const value = localStorage.getItem(storageKey)

    const defaultValues: StorageSchema = {
      savedBeatmaps: [],
      selectedSkin: 'default',
    }

    return this.deserializeValue(value, defaultValues[key]) as StorageSchema[K]
  }

  /**
   * Set a value in localStorage with type safety
   */
  set<K extends StorageKey>(key: K, value: StorageSchema[K]): void {
    const storageKey = this.getStorageKey(key)
    const serializedValue = this.serializeValue(value)

    try {
      localStorage.setItem(storageKey, serializedValue)
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      throw new Error('Failed to save data to storage')
    }
  }

  /**
   * Remove a value from localStorage
   */
  remove<K extends StorageKey>(key: K): void {
    const storageKey = this.getStorageKey(key)
    localStorage.removeItem(storageKey)
  }

  /**
   * Clear all osu.js data from localStorage
   */
  clear(): void {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key)
      }
    })
  }

  /**
   * Check if a value exists in localStorage
   */
  has<K extends StorageKey>(key: K): boolean {
    const storageKey = this.getStorageKey(key)
    return localStorage.getItem(storageKey) !== null
  }

  beatmaps = {
    /**
     * Get all saved beatmaps
     */
    getAll: (): BeatmapInfo[] => {
      return StorageManager.get('savedBeatmaps')
    },

    /**
     * Add a beatmap to saved beatmaps (if not already saved)
     */
    add: (beatmap: BeatmapInfo): void => {
      const savedBeatmaps = StorageManager.get('savedBeatmaps')
      const exists = savedBeatmaps.some((saved) => saved.id === beatmap.id)

      if (!exists) {
        const updated = [...savedBeatmaps, beatmap]
        StorageManager.set('savedBeatmaps', updated)
      }
    },

    /**
     * Remove a beatmap from saved beatmaps
     */
    remove: (beatmapId: any): void => {
      const savedBeatmaps = StorageManager.get('savedBeatmaps')
      const filtered = savedBeatmaps.filter(
        (beatmap) => beatmap.id !== beatmapId,
      )
      StorageManager.set('savedBeatmaps', filtered)
    },

    /**
     * Check if a beatmap is saved
     */
    isSaved: (beatmapId: any): boolean => {
      const savedBeatmaps = StorageManager.get('savedBeatmaps')
      return savedBeatmaps.some((beatmap) => beatmap.id === beatmapId)
    },

    /**
     * Toggle a beatmap's saved status
     */
    toggle: (beatmap: BeatmapInfo): boolean => {
      const savedBeatmaps = StorageManager.get('savedBeatmaps')
      const exists = savedBeatmaps.some((saved) => saved.id === beatmap.id)

      if (exists) {
        const filtered = savedBeatmaps.filter(
          (saved) => saved.id !== beatmap.id,
        )
        StorageManager.set('savedBeatmaps', filtered)
        return false
      } else {
        const updated = [...savedBeatmaps, beatmap]
        StorageManager.set('savedBeatmaps', updated)
        return true
      }
    },

    /**
     * Clear all saved beatmaps
     */
    clear: (): void => {
      StorageManager.set('savedBeatmaps', [])
    },
  }
}

export const StorageManager = new StorageManagerClass()
