export interface GeocodedPoint {
  latitude: number
  longitude: number
}

interface NominatimResult {
  lat: string
  lon: string
}

function searchVariants(query: string) {
  const normalized = query.trim()
  return [
    `${normalized}, Venezuela`,
    normalized,
    `${normalized}, VE`,
  ]
}

export async function geocodeVenezuelaReference(query: string): Promise<GeocodedPoint | null> {
  const variants = searchVariants(query)

  for (const variant of variants) {
    const params = new URLSearchParams({
      format: "json",
      limit: "1",
      countrycodes: "ve",
      addressdetails: "1",
      q: variant,
    })
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
    if (!response.ok) throw new Error("No se pudo buscar la referencia.")

    const results = (await response.json()) as NominatimResult[]
    const result = results[0]
    if (result) {
      return {
        latitude: Number(result.lat),
        longitude: Number(result.lon),
      }
    }
  }

  return null
}
