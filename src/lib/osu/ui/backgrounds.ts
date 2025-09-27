import { useEffect, useState } from 'react'

interface SeasonalBackground {
  url: string
  user: {
    avatar_url: string
    country_code: string
    default_group: string
    id: number
    is_active: boolean
    is_bot: boolean
    is_deleted: boolean
    is_online: boolean
    is_supporter: boolean
    last_visit: string | null
    pm_friends_only: boolean
    profile_colour: string | null
    username: string
  }
}

interface SeasonalBackgroundsResponse {
  ends_at: string
  backgrounds: SeasonalBackground[]
}

export function useSeasonalBackgrounds() {
  const [backgrounds, setBackgrounds] = useState<SeasonalBackground[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(
      'https://cors.notesnook.com/https://osu.ppy.sh/api/v2/seasonal-backgrounds',
    )
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data: SeasonalBackgroundsResponse) => {
        const shuffled = [...data.backgrounds].sort(() => Math.random() - 0.5)
        setBackgrounds(shuffled)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { backgrounds, loading, error }
}
