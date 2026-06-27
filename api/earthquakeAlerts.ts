import { getEarthquakes } from "./earthquakeService.js"
import {
  getServerSupabase,
  sendEarthquakePush,
  type PushSubscriptionRecord,
} from "./pushService.js"

interface VercelRequest {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  url?: string
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => void
  json: (body: unknown) => void
  end: () => void
}

const ALERT_LOOKBACK_MS = 2 * 60 * 60 * 1000
const MIN_ALERT_MAGNITUDE = 4

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Cron-Secret")
}

function readHeader(req: VercelRequest, name: string) {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

function isAuthorized(req: VercelRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true

  const authorization = readHeader(req, "authorization")
  const cronSecret = readHeader(req, "x-cron-secret")
  return authorization === `Bearer ${secret}` || cronSecret === secret
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  if (req.method && req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Metodo no permitido." })
    return
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ ok: false, message: "No autorizado." })
    return
  }

  try {
    const supabase = getServerSupabase()
    const starttime = new Date(Date.now() - ALERT_LOOKBACK_MS).toISOString()
    const result = await getEarthquakes(
      `/api/earthquakes?starttime=${encodeURIComponent(starttime)}&minmagnitude=${MIN_ALERT_MAGNITUDE}&limit=80&orderby=time`,
    )

    if (!result.body.ok) {
      res.status(502).json({ ok: false, message: result.body.message ?? "No se pudo consultar sismos." })
      return
    }

    const alertableEvents = result.body.events
      .filter((event) => event.magnitude >= MIN_ALERT_MAGNITUDE)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    if (alertableEvents.length === 0) {
      res.status(200).json({ ok: true, checked: 0, sent: 0 })
      return
    }

    const eventIds = alertableEvents.map((event) => event.id)
    const { data: alreadySentRows, error: sentError } = await supabase
      .from("earthquake_alert_events")
      .select("event_id")
      .in("event_id", eventIds)

    if (sentError) throw new Error(sentError.message)

    const alreadySent = new Set((alreadySentRows ?? []).map((row) => String(row.event_id)))
    const newEvents = alertableEvents.filter((event) => !alreadySent.has(event.id))

    const { data: subscriptionRows, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, subscription, alarm_threshold, enabled")
      .eq("enabled", true)

    if (subscriptionError) throw new Error(subscriptionError.message)

    const subscriptions = (subscriptionRows ?? []) as PushSubscriptionRecord[]
    let sent = 0
    const invalidEndpoints: string[] = []

    for (const event of newEvents) {
      const matchingSubscriptions = subscriptions.filter((subscription) => event.magnitude >= subscription.alarm_threshold)

      await Promise.all(
        matchingSubscriptions.map(async (subscription) => {
          try {
            await sendEarthquakePush(subscription.subscription, event)
            sent += 1
          } catch (error) {
            const statusCode = typeof error === "object" && error && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode)
              : 0
            if (statusCode === 404 || statusCode === 410) invalidEndpoints.push(subscription.endpoint)
          }
        }),
      )

      const { error: insertError } = await supabase.from("earthquake_alert_events").upsert({
        event_id: event.id,
        magnitude: event.magnitude,
        place: event.place,
        event_time: event.time,
        sent_at: new Date().toISOString(),
      })

      if (insertError) throw new Error(insertError.message)
    }

    if (invalidEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", invalidEndpoints)
    }

    res.status(200).json({
      ok: true,
      checked: alertableEvents.length,
      newEvents: newEvents.length,
      subscriptions: subscriptions.length,
      sent,
    })
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo enviar alertas sismicas.",
    })
  }
}
