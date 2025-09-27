import { useEffect, useState } from 'react'

type EventImage = {
  image: string
  url: string
  IsCurrent: boolean
  begins: string | null
  expires: string | null
}

type EventsData = {
  images: EventImage[]
}

export function useEvents() {
  const [events, setEvents] = useState<EventsData | null>(null)

  useEffect(() => {
    fetch('https://cors.notesnook.com/https://assets.ppy.sh/menu-content.json')
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch(() => setEvents(null))
  }, [])

  return events
}
