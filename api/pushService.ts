import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"
import type { EarthquakeEvent } from "./earthquakeService.js"

export interface PushSubscriptionRecord {
  endpoint: string
  subscription: WebPushSubscription
  alarm_threshold: number
  enabled: boolean
}

export interface WebPushSubscription {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? process.env.VITE_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:alertas@red-help-ve.vercel.app"

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export function getServerSupabase() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Faltan SUPABASE_URL/VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.")
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })
}

export function assertWebPushConfigured() {
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error("Faltan VAPID_PUBLIC_KEY/VITE_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY.")
  }
}

export function publicVapidKey() {
  return vapidPublicKey ?? ""
}

export function alertTitle(event: EarthquakeEvent) {
  return `${event.magnitude >= 5 ? "Alerta sismica fuerte" : "Alerta sismica"} M ${event.magnitude.toFixed(1)}`
}

export function elapsedSinceEvent(value: string) {
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000))
  if (elapsedSeconds < 60) return `hace ${elapsedSeconds} segundos`

  const elapsedMinutes = Math.round(elapsedSeconds / 60)
  if (elapsedMinutes < 60) return `hace ${elapsedMinutes} min`

  const elapsedHours = Math.round(elapsedMinutes / 60)
  return `hace ${elapsedHours} h`
}

export function alertBody(event: EarthquakeEvent) {
  const sources = event.confirmedBy.join(", ")
  return `${event.place}. ${elapsedSinceEvent(event.time)}. Fuente: ${sources}.`
}

export async function sendEarthquakePush(subscription: WebPushSubscription, event: EarthquakeEvent) {
  assertWebPushConfigured()

  return webpush.sendNotification(
    subscription,
    JSON.stringify({
      type: "earthquake-alert",
      title: alertTitle(event),
      body: alertBody(event),
      eventId: event.id,
      magnitude: event.magnitude,
      place: event.place,
      time: event.time,
      url: "/",
    }),
  )
}
