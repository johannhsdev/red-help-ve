import { getEarthquakes, type EarthquakeApiResponse } from "./earthquakeService.js"

interface VercelRequest {
  method?: string
  url?: string
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => void
  json: (body: EarthquakeApiResponse) => void
  end: () => void
}

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  res.setHeader("Cache-Control", "s-maxage=90, stale-while-revalidate=180")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  if (req.method && req.method !== "GET") {
    res.status(405).json({
      ok: false,
      message: "Metodo no permitido. Usa GET.",
      events: [],
    })
    return
  }

  const result = await getEarthquakes(req.url || "/api/earthquakes")
  res.status(result.status).json(result.body)
}
