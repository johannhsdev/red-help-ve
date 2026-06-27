export type EarthquakeSource = "USGS" | "GEOFON" | "EMSC" | "FUNVISIS" | "SGC"
export type EarthquakeConfidence = "single" | "medium" | "high"

export interface EarthquakeSourceReport {
  source: EarthquakeSource
  id: string
  magnitude: number
  time: string
  place: string
  depthKm: number | null
  url: string | null
}

export interface EarthquakeEvent {
  id: string
  title: string
  magnitude: number
  place: string
  time: string
  updated: string | null
  coordinates: {
    latitude: number
    longitude: number
  }
  depthKm: number | null
  distanceKm?: number
  url: string | null
  source: EarthquakeSource
  sources: EarthquakeSourceReport[]
  confidence: EarthquakeConfidence
  confirmedBy: EarthquakeSource[]
}

export interface SourceStatus {
  source: EarthquakeSource
  ok: boolean
  status?: number
  count: number
  message?: string
}

export interface EarthquakeApiResponse {
  ok: boolean
  message?: string
  sourceStatus?: number
  generatedAt?: string
  query?: {
    latitude: number
    longitude: number
    maxradiuskm: number
    minmagnitude: number
    limit: number
    orderby: string
    starttime: string
    endtime?: string
  }
  count?: number
  sourceStatuses?: SourceStatus[]
  events: EarthquakeEvent[]
}

export interface UserLocation {
  latitude: number
  longitude: number
}
