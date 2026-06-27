import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { EarthquakeApiResponse, EarthquakeEvent, UserLocation } from "../types/earthquake"

const API_URL = "/api/earthquakes"
const REFRESH_INTERVAL_MS = 15_000
const ALARM_ENABLED_STORAGE_KEY = "red-help-ve-earthquake-alarm-enabled"
const ALARM_THRESHOLD_STORAGE_KEY = "red-help-ve-earthquake-alarm-threshold"
const PUSH_SUBSCRIPTIONS_URL = "/api/pushSubscriptions"
const MIN_ALARM_THRESHOLD = 4
const STRONG_ALARM_THRESHOLD = 5
const DEFAULT_ALARM_THRESHOLD = 4
const ALARM_RECENT_WINDOW_MS = 30 * 60 * 1000

function storedBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback
  const value = window.localStorage.getItem(key)
  if (value === null) return fallback
  return value === "true"
}

function storedNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback
  const value = Number(window.localStorage.getItem(key))
  return Number.isFinite(value) ? value : fallback
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index)
  }

  return output
}

function notificationPermission() {
  if (typeof Notification === "undefined") return "default" as NotificationPermission
  return Notification.permission
}

function elapsedSinceEvent(value: string) {
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000))
  if (elapsedSeconds < 60) return `hace ${elapsedSeconds} segundos`

  const elapsedMinutes = Math.round(elapsedSeconds / 60)
  if (elapsedMinutes < 60) return `hace ${elapsedMinutes} min`

  const elapsedHours = Math.round(elapsedMinutes / 60)
  return `hace ${elapsedHours} h`
}

function playAlarmSound() {
  if (typeof window === "undefined" || !("AudioContext" in window)) return

  const audio = new AudioContext()
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(880, audio.currentTime)
  oscillator.frequency.setValueAtTime(660, audio.currentTime + 0.18)
  oscillator.frequency.setValueAtTime(880, audio.currentTime + 0.36)
  gain.gain.setValueAtTime(0.001, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.35, audio.currentTime + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.8)

  oscillator.connect(gain)
  gain.connect(audio.destination)
  oscillator.start()
  oscillator.stop(audio.currentTime + 0.85)
  window.setTimeout(() => void audio.close(), 1000)
}

function notifyEarthquake(event: EarthquakeEvent) {
  const isStrong = event.magnitude >= STRONG_ALARM_THRESHOLD
  playAlarmSound()
  navigator.vibrate?.([500, 180, 500, 180, 700])

  if (notificationPermission() !== "granted") return
  new Notification(`${isStrong ? "Alerta sismica fuerte" : "Alerta sismica"} M ${event.magnitude.toFixed(1)}`, {
    body: `${event.place} - ${elapsedSinceEvent(event.time)} - ${new Date(event.time).toLocaleString("es-VE")}`,
    icon: "/favicon.svg",
    tag: `earthquake-${event.id}`,
  })
}

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
  const [alarmEnabled, setAlarmEnabledState] = useState(() => storedBoolean(ALARM_ENABLED_STORAGE_KEY, false))
  const [alarmThreshold, setAlarmThresholdState] = useState(() => storedNumber(ALARM_THRESHOLD_STORAGE_KEY, DEFAULT_ALARM_THRESHOLD))
  const [alarmPermission, setAlarmPermission] = useState<NotificationPermission>(() => notificationPermission())
  const [pushStatus, setPushStatus] = useState("")
  const [pushError, setPushError] = useState("")
  const seenEventIds = useRef<Set<string>>(new Set())
  const bootstrappedAlarm = useRef(false)

  const endpoint = useMemo(() => buildUrl(userLocation), [userLocation])

  const requestAlarmPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      setAlarmPermission("denied")
      return "denied" as NotificationPermission
    }

    const permission = await Notification.requestPermission()
    setAlarmPermission(permission)
    return permission
  }, [])

  const registerPushSubscription = useCallback(async (threshold: number) => {
    setPushError("")
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushError("Este navegador no soporta Web Push.")
      return false
    }

    const permission = notificationPermission() === "granted"
      ? "granted"
      : await requestAlarmPermission()

    if (permission !== "granted") {
      setPushError("Activa los permisos de notificacion para recibir alertas con la app cerrada.")
      return false
    }

    const keyResponse = await fetch(PUSH_SUBSCRIPTIONS_URL)
    const keyPayload = (await keyResponse.json()) as { ok?: boolean; publicKey?: string; message?: string }
    if (!keyResponse.ok || !keyPayload.publicKey) {
      setPushError(keyPayload.message || "Falta configurar la clave publica VAPID.")
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const existingSubscription = await registration.pushManager.getSubscription()
    const subscription = existingSubscription ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyPayload.publicKey),
    })

    const response = await fetch(PUSH_SUBSCRIPTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        threshold,
      }),
    })

    const payload = (await response.json()) as { ok?: boolean; message?: string }
    if (!response.ok || !payload.ok) {
      setPushError(payload.message || "No se pudo guardar la suscripcion push.")
      return false
    }

    setPushStatus("Web Push activo para alertas con la PWA cerrada.")
    return true
  }, [requestAlarmPermission])

  const unregisterPushSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    await fetch(PUSH_SUBSCRIPTIONS_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
    await subscription.unsubscribe()
    setPushStatus("Web Push desactivado.")
    setPushError("")
  }, [])

  const setAlarmEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const registered = await registerPushSubscription(alarmThreshold)
      if (!registered) return
    } else {
      await unregisterPushSubscription()
    }

    setAlarmEnabledState(enabled)
    window.localStorage.setItem(ALARM_ENABLED_STORAGE_KEY, String(enabled))
  }, [alarmThreshold, registerPushSubscription, unregisterPushSubscription])

  const setAlarmThreshold = useCallback((threshold: number) => {
    const nextThreshold = Math.max(MIN_ALARM_THRESHOLD, Math.min(8, threshold))
    setAlarmThresholdState(nextThreshold)
    window.localStorage.setItem(ALARM_THRESHOLD_STORAGE_KEY, String(nextThreshold))
  }, [])

  useEffect(() => {
    if (!alarmEnabled) return
    const timeout = window.setTimeout(() => {
      void registerPushSubscription(alarmThreshold)
    }, 500)
    return () => window.clearTimeout(timeout)
  }, [alarmEnabled, alarmThreshold, registerPushSubscription])

  const handleEarthquakeAlarm = useCallback(
    (nextEvents: EarthquakeEvent[]) => {
      const now = Date.now()
      const newAlertableEvents = nextEvents
        .filter((event) => !seenEventIds.current.has(event.id))
        .filter((event) => event.magnitude >= alarmThreshold)
        .filter((event) => now - new Date(event.time).getTime() <= ALARM_RECENT_WINDOW_MS)
        .sort((a, b) => b.magnitude - a.magnitude || new Date(b.time).getTime() - new Date(a.time).getTime())

      nextEvents.forEach((event) => seenEventIds.current.add(event.id))

      if (!bootstrappedAlarm.current) {
        bootstrappedAlarm.current = true
        return
      }

      if (!alarmEnabled || newAlertableEvents.length === 0) return
      notifyEarthquake(newAlertableEvents[0])
    },
    [alarmEnabled, alarmThreshold],
  )

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
      handleEarthquakeAlarm(nextEvents)
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
  }, [endpoint, handleEarthquakeAlarm])

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
    alarmEnabled,
    setAlarmEnabled,
    alarmThreshold,
    setAlarmThreshold,
    alarmPermission,
    pushStatus,
    pushError,
    requestAlarmPermission,
    refresh: loadEarthquakes,
  }
}

export type EarthquakesState = ReturnType<typeof useEarthquakes>
