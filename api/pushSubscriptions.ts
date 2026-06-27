import { publicVapidKey, getServerSupabase, type WebPushSubscription } from "./pushService.js"

interface VercelRequest {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  body?: unknown
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => void
  json: (body: unknown) => void
  end: () => void
}

interface SubscriptionBody {
  subscription?: WebPushSubscription
  endpoint?: string
  threshold?: number
}

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

function readBody(body: unknown): SubscriptionBody {
  if (!body) return {}
  if (typeof body === "string") return JSON.parse(body) as SubscriptionBody
  return body as SubscriptionBody
}

function validSubscription(subscription: WebPushSubscription | undefined): subscription is WebPushSubscription {
  return Boolean(subscription?.endpoint && subscription.keys?.p256dh && subscription.keys?.auth)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  try {
    if (req.method === "GET") {
      res.status(200).json({ ok: true, publicKey: publicVapidKey() })
      return
    }

    const supabase = getServerSupabase()
    const body = readBody(req.body)

    if (req.method === "POST") {
      const subscription = body.subscription
      if (!validSubscription(subscription)) {
        res.status(400).json({ ok: false, message: "Suscripcion push invalida." })
        return
      }

      const threshold = Number.isFinite(body.threshold) ? Math.max(4, Math.min(8, Number(body.threshold))) : 4
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          endpoint: subscription.endpoint,
          subscription,
          alarm_threshold: threshold,
          enabled: true,
          user_agent: Array.isArray(req.headers?.["user-agent"])
            ? req.headers?.["user-agent"][0]
            : req.headers?.["user-agent"] ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      )

      if (error) throw new Error(error.message)
      res.status(200).json({ ok: true })
      return
    }

    if (req.method === "DELETE") {
      const endpoint = body.endpoint || body.subscription?.endpoint
      if (!endpoint) {
        res.status(400).json({ ok: false, message: "Falta endpoint de suscripcion." })
        return
      }

      const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
      if (error) throw new Error(error.message)
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ ok: false, message: "Metodo no permitido." })
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo procesar la suscripcion push.",
    })
  }
}
