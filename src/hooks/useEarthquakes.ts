import { useCallback, useEffect, useMemo, useState } from "react"
import type { EarthquakeApiResponse, EarthquakeEvent, UserLocation } from "../types/earthquake"

const API_URL = "/api/earthquakes"
const REFRESH_INTERVAL_MS = 15_000

function buildUrl(userLocation: UserLocation | null) {
  const params = new URLSearchParams({
    latitude: "7",
    longitude: "-66",
    maxradiuskm: "1200",
    minmagnitude: "0",
    limit: "300",
    orderby: "time",
    starttime: "2026-06-23",
  })

  if (userLocation) {
    params.set("userLatitude", String(userLocation.latitude))
    params.set("userLongitude", String(userLocation.longitude))
  }

  return `${API_URL}?${params.toString()}`
}

export function useEarthquakes() {
  const [events, setEvents] = useState<EarthquakeEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)

  const endpoint = useMemo(() => buildUrl(userLocation), [userLocation])

  const loadEarthquakes = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(endpoint)
      const payload = (await response.json()) as EarthquakeApiResponse

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "No se pudo cargar la informacion sismica.")
      }

      const nextEvents = payload.events
      setEvents(nextEvents)
      setGeneratedAt(payload.generatedAt ?? null)
      setLoaded(true)
    } catch (err) {
      setEvents([])
      setGeneratedAt(null)
      setError(err instanceof Error ? err.message : "No se pudo cargar la informacion sismica.")
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadEarthquakes()
    }, 0)

    const interval = window.setInterval(() => {
      void loadEarthquakes()
    }, REFRESH_INTERVAL_MS)

    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [loadEarthquakes])

  return {
    events,
    loaded,
    loading,
    error,
    generatedAt,
    userLocation,
    setUserLocation,
    refresh: loadEarthquakes,
  }
}

export type EarthquakesState = ReturnType<typeof useEarthquakes>
