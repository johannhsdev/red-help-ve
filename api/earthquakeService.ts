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
  generatedAt?: string
  query?: EarthquakeQuery
  count?: number
  sourceStatuses?: SourceStatus[]
  events: EarthquakeEvent[]
}

interface EarthquakeQuery {
  latitude: number
  longitude: number
  maxradiuskm: number
  minmagnitude: number
  limit: number
  orderby: string
  starttime: string
  endtime?: string
}

interface UsgsFeature {
  id?: string
  geometry?: {
    coordinates?: [number, number, number]
  }
  properties?: {
    mag?: number | null
    place?: string | null
    time?: number | null
    updated?: number | null
    title?: string | null
    url?: string | null
  }
}

interface UsgsResponse {
  features?: UsgsFeature[]
}

interface EmscFeature {
  id?: string
  geometry?: {
    coordinates?: [number, number, number]
  }
  properties?: {
    mag?: number | null
    time?: string | null
    lastupdate?: string | null
    flynn_region?: string | null
    depth?: number | null
    source_id?: string | null
    unid?: string | null
  }
}

interface EmscResponse {
  features?: EmscFeature[]
}

interface FunvisisFeature {
  geometry?: {
    coordinates?: [number, number] | [number, number, number]
  }
  properties?: {
    address?: string | null
    city?: string | null
    lat?: string | number | null
    long?: string | number | null
    phone?: string | number | null
    postalCode?: string | null
    state?: string | number | null
  }
}

interface FunvisisResponse {
  features?: FunvisisFeature[]
}

interface SgcFeature {
  id?: string
  geometry?: {
    coordinates?: [number, number, number]
  }
  properties?: {
    agency?: string | null
    cdi?: number | null
    depth?: number | null
    localTime?: string | null
    mag?: number | null
    magType?: string | null
    place?: string | null
    status?: string | null
    type?: string | null
    updated?: string | null
    utcTime?: string | null
  }
}

interface SgcResponse {
  features?: SgcFeature[]
}

interface SourceResult {
  status: SourceStatus
  observations: SourceObservation[]
}

interface SourceObservation {
  id: string
  source: EarthquakeSource
  title: string
  magnitude: number
  place: string
  time: string
  updated: string | null
  latitude: number
  longitude: number
  depthKm: number | null
  url: string | null
}

export interface EarthquakeServiceResult {
  status: number
  body: EarthquakeApiResponse
}

const USGS_QUERY_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
const GEOFON_QUERY_URL = "https://geofon.gfz.de/fdsnws/event/1/query"
const EMSC_QUERY_URL = "https://www.seismicportal.eu/fdsnws/event/1/query"
const FUNVISIS_RECENT_URL = "http://www.funvisis.gob.ve/maravilla.json"
const SGC_QUERY_URL = "https://api.sgc.gov.co/biweekly/biweekly_earthquakes"
const DEFAULT_LATITUDE = 7
const DEFAULT_LONGITUDE = -66
const DEFAULT_MAX_RADIUS_KM = 1200
const DEFAULT_MIN_MAGNITUDE = 0
const DEFAULT_LIMIT = 300
const DEFAULT_ORDER_BY = "time"
const DEFAULT_START_TIME = "2026-06-23T04:00:00.000Z"
const EARTH_RADIUS_KM = 6371
const KM_PER_DEGREE = 111.195
const MERGE_TIME_WINDOW_MS = 30_000
const FUNVISIS_MERGE_TIME_WINDOW_MS = 90_000
const MERGE_DISTANCE_KM = 15
const MERGE_MAGNITUDE_DELTA = 0.3
const FUTURE_EVENT_TOLERANCE_MS = 5 * 60 * 1000
const SOURCE_PRIORITY: EarthquakeSource[] = ["SGC", "FUNVISIS", "USGS", "GEOFON", "EMSC"]

function getQueryValue(searchParams: URLSearchParams, name: string) {
  return searchParams.get(name) ?? undefined
}

function readNumber(searchParams: URLSearchParams, name: string, fallback: number, options?: { min?: number; max?: number }) {
  const raw = getQueryValue(searchParams, name)
  const parsed = raw === undefined ? fallback : Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  if (options?.min !== undefined && parsed < options.min) return options.min
  if (options?.max !== undefined && parsed > options.max) return options.max
  return parsed
}

function readString(searchParams: URLSearchParams, name: string, fallback: string, allowed: string[]) {
  const value = getQueryValue(searchParams, name)?.trim() || fallback
  return allowed.includes(value) ? value : fallback
}

function readDateTime(searchParams: URLSearchParams, name: string, fallback?: string) {
  const raw = getQueryValue(searchParams, name)?.trim()
  if (!raw) return fallback

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00-04:00` : raw
  const date = new Date(normalized)

  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function distanceInKm(fromLatitude: number, fromLongitude: number, toLatitude: number, toLongitude: number) {
  const latitudeDelta = toRadians(toLatitude - fromLatitude)
  const longitudeDelta = toRadians(toLongitude - fromLongitude)
  const startLatitude = toRadians(fromLatitude)
  const endLatitude = toRadians(toLatitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function roundedDistanceInKm(fromLatitude: number, fromLongitude: number, toLatitude: number, toLongitude: number) {
  return Math.round(distanceInKm(fromLatitude, fromLongitude, toLatitude, toLongitude))
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function numberFromValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string") return null

  const match = value.replace(",", ".").match(/-?\d+(?:\.\d+)?/)
  if (!match) return null

  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function sourceRank(source: EarthquakeSource) {
  return SOURCE_PRIORITY.indexOf(source)
}

function isNotFutureEvent(observation: SourceObservation) {
  return new Date(observation.time).getTime() <= Date.now() + FUTURE_EVENT_TOLERANCE_MS
}

function confidenceForSources(count: number): EarthquakeConfidence {
  if (count >= 3) return "high"
  if (count === 2) return "medium"
  return "single"
}

function sortObservationsByPriority(observations: SourceObservation[]) {
  return [...observations].sort((a, b) => sourceRank(a.source) - sourceRank(b.source))
}

function sourceReport(observation: SourceObservation): EarthquakeSourceReport {
  return {
    source: observation.source,
    id: observation.id,
    magnitude: observation.magnitude,
    time: observation.time,
    place: observation.place,
    depthKm: observation.depthKm,
    url: observation.url,
  }
}

function canMerge(reference: SourceObservation, candidate: SourceObservation) {
  if (reference.source === candidate.source) return false

  const timeWindow =
    reference.source === "FUNVISIS" || candidate.source === "FUNVISIS"
      ? FUNVISIS_MERGE_TIME_WINDOW_MS
      : MERGE_TIME_WINDOW_MS
  const timeDelta = Math.abs(new Date(reference.time).getTime() - new Date(candidate.time).getTime())
  if (timeDelta > timeWindow) return false

  const kilometers = distanceInKm(reference.latitude, reference.longitude, candidate.latitude, candidate.longitude)
  if (kilometers > MERGE_DISTANCE_KM) return false

  return Math.abs(reference.magnitude - candidate.magnitude) <= MERGE_MAGNITUDE_DELTA
}

function mergeObservations(
  observations: SourceObservation[],
  userLatitude?: number,
  userLongitude?: number,
): EarthquakeEvent[] {
  const groups: SourceObservation[][] = []

  observations
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .forEach((observation) => {
      const group = groups.find((items) => items.some((item) => canMerge(item, observation)))
      if (group) {
        group.push(observation)
        return
      }

      groups.push([observation])
    })

  return groups.map((group) => {
    const sorted = sortObservationsByPriority(group)
    const primary = sorted[0]
    const sources = sorted.map(sourceReport)
    const confirmedBy = sorted.map((item) => item.source)
    const uniqueSourceCount = new Set(confirmedBy).size
    const event: EarthquakeEvent = {
      id: `${primary.source.toLowerCase()}:${primary.id}`,
      title: primary.title,
      magnitude: primary.magnitude,
      place: primary.place,
      time: primary.time,
      updated: primary.updated,
      coordinates: {
        latitude: primary.latitude,
        longitude: primary.longitude,
      },
      depthKm: primary.depthKm,
      url: primary.url,
      source: primary.source,
      sources,
      confidence: confidenceForSources(uniqueSourceCount),
      confirmedBy,
    }

    if (userLatitude !== undefined && userLongitude !== undefined) {
      event.distanceKm = roundedDistanceInKm(userLatitude, userLongitude, primary.latitude, primary.longitude)
    }

    return event
  })
}

function normalizeUsgsFeature(feature: UsgsFeature): SourceObservation | null {
  const [longitude, latitude, depth] = feature.geometry?.coordinates ?? []
  const magnitude = feature.properties?.mag
  const time = feature.properties?.time

  if (
    !feature.id ||
    !finiteNumber(latitude) ||
    !finiteNumber(longitude) ||
    !finiteNumber(magnitude) ||
    !finiteNumber(time)
  ) {
    return null
  }

  const place = feature.properties?.place || "Ubicacion no disponible"
  return {
    id: feature.id,
    source: "USGS",
    title: feature.properties?.title || `M ${magnitude.toFixed(1)} - ${place}`,
    magnitude,
    place,
    time: new Date(time).toISOString(),
    updated: feature.properties?.updated ? new Date(feature.properties.updated).toISOString() : null,
    latitude,
    longitude,
    depthKm: finiteNumber(depth) ? depth : null,
    url: feature.properties?.url || null,
  }
}

function normalizeEmscFeature(feature: EmscFeature): SourceObservation | null {
  const [longitude, latitude, rawDepth] = feature.geometry?.coordinates ?? []
  const magnitude = feature.properties?.mag
  const rawTime = feature.properties?.time

  if (
    !feature.id ||
    !finiteNumber(latitude) ||
    !finiteNumber(longitude) ||
    !finiteNumber(magnitude) ||
    !rawTime
  ) {
    return null
  }

  const time = new Date(rawTime)
  if (Number.isNaN(time.getTime())) return null

  const depth = feature.properties?.depth ?? (finiteNumber(rawDepth) ? Math.abs(rawDepth) : null)
  const place = feature.properties?.flynn_region || "Ubicacion no disponible"
  return {
    id: feature.properties?.unid || feature.id,
    source: "EMSC",
    title: `M ${magnitude.toFixed(1)} - ${place}`,
    magnitude,
    place,
    time: time.toISOString(),
    updated: feature.properties?.lastupdate ? new Date(feature.properties.lastupdate).toISOString() : null,
    latitude,
    longitude,
    depthKm: finiteNumber(depth) ? Math.abs(depth) : null,
    url: `https://www.emsc-csem.org/Earthquake_information/earthquake.php?id=${feature.properties?.source_id || feature.id}`,
  }
}

function parseFunvisisTime(dateValue: string | null | undefined, timeValue: string | null | undefined) {
  const dateMatch = dateValue?.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  const timeMatch = timeValue?.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!dateMatch || !timeMatch) return null

  const [, day, month, year] = dateMatch
  const [, hours, minutes] = timeMatch
  const date = new Date(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hours.padStart(2, "0")}:${minutes}:00-04:00`,
  )

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function parseSgcLocalDateTime(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.trim().replace(" ", "T")
  const date = new Date(`${normalized}-05:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function parseSgcUtcDateTime(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.trim().replace(" ", "T")
  const date = new Date(`${normalized}Z`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function sgcDateParam(value: string | undefined) {
  const date = value ? new Date(value) : new Date()
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
  return safeDate.toISOString().slice(0, 19)
}

function funvisisId(place: string, time: string, latitude: number, longitude: number, magnitude: number) {
  const slug = place
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)

  return `${time.slice(0, 16)}-${latitude.toFixed(3)}-${longitude.toFixed(3)}-${magnitude.toFixed(1)}-${slug}`
}

function normalizeSgcFeature(feature: SgcFeature): SourceObservation | null {
  const [longitude, latitude, rawDepth] = feature.geometry?.coordinates ?? []
  const magnitude = feature.properties?.mag
  const time = parseSgcUtcDateTime(feature.properties?.utcTime) ?? parseSgcLocalDateTime(feature.properties?.localTime)

  if (
    !feature.id ||
    !finiteNumber(latitude) ||
    !finiteNumber(longitude) ||
    !finiteNumber(magnitude) ||
    !time
  ) {
    return null
  }

  const place = feature.properties?.place || "Ubicacion no disponible"
  const status = feature.properties?.status === "manual" ? "manual" : "automatic"
  return {
    id: feature.id,
    source: "SGC",
    title: `M ${magnitude.toFixed(1)} - ${place}`,
    magnitude,
    place: `${place}${status === "automatic" ? " (automatico/no confirmado)" : ""}`,
    time,
    updated: parseSgcLocalDateTime(feature.properties?.updated),
    latitude,
    longitude,
    depthKm: finiteNumber(feature.properties?.depth)
      ? Math.abs(feature.properties.depth)
      : finiteNumber(rawDepth)
        ? Math.abs(rawDepth)
        : null,
    url: "https://www.sgc.gov.co/sismos",
  }
}

function normalizeFunvisisFeature(feature: FunvisisFeature): SourceObservation | null {
  const properties = feature.properties
  const geometryLongitude = feature.geometry?.coordinates?.[0]
  const geometryLatitude = feature.geometry?.coordinates?.[1]
  const latitude = numberFromValue(properties?.lat) ?? (finiteNumber(geometryLatitude) ? geometryLatitude : null)
  const longitude = numberFromValue(properties?.long) ?? (finiteNumber(geometryLongitude) ? geometryLongitude : null)
  const magnitude = numberFromValue(properties?.phone)
  const depthKm = numberFromValue(properties?.state)
  const time = parseFunvisisTime(properties?.postalCode, properties?.city)

  if (!finiteNumber(latitude) || !finiteNumber(longitude) || !finiteNumber(magnitude) || !time) {
    return null
  }

  const place = properties?.address?.trim() || "Ubicacion no disponible"
  return {
    id: funvisisId(place, time, latitude, longitude, magnitude),
    source: "FUNVISIS",
    title: `M ${magnitude.toFixed(1)} - ${place}`,
    magnitude,
    place,
    time,
    updated: null,
    latitude,
    longitude,
    depthKm,
    url: "http://www.funvisis.gob.ve/index.php",
  }
}

function parseFdsnText(text: string, source: EarthquakeSource): SourceObservation[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  const headerLine = lines.find((line) => line.startsWith("#"))
  if (!headerLine) return []

  const headers = headerLine.replace(/^#/, "").split("|")
  const index = (name: string) => headers.indexOf(name)
  const idIndex = index("EventID")
  const timeIndex = index("Time")
  const latitudeIndex = index("Latitude")
  const longitudeIndex = index("Longitude")
  const depthIndex = index("Depth/km")
  const magnitudeIndex = index("Magnitude")
  const placeIndex = index("EventLocationName")
  const contributorIndex = index("ContributorID")

  return lines
    .filter((line) => !line.startsWith("#"))
    .map((line): SourceObservation | null => {
      const columns = line.split("|")
      const id = columns[idIndex] || columns[contributorIndex]
      const time = new Date(columns[timeIndex])
      const latitude = Number(columns[latitudeIndex])
      const longitude = Number(columns[longitudeIndex])
      const depthKm = Number(columns[depthIndex])
      const magnitude = Number(columns[magnitudeIndex])
      const place = columns[placeIndex] || "Ubicacion no disponible"

      if (
        !id ||
        Number.isNaN(time.getTime()) ||
        !finiteNumber(latitude) ||
        !finiteNumber(longitude) ||
        !finiteNumber(magnitude)
      ) {
        return null
      }

      return {
        id,
        source,
        title: `M ${magnitude.toFixed(1)} - ${place}`,
        magnitude,
        place,
        time: time.toISOString(),
        updated: null,
        latitude,
        longitude,
        depthKm: finiteNumber(depthKm) ? depthKm : null,
        url:
          source === "GEOFON"
            ? `https://geofon.gfz.de/eqinfo/event.php?id=${id}`
            : null,
      }
    })
    .filter((item): item is SourceObservation => Boolean(item))
}

function fdsnRadiusDegrees(maxradiuskm: number) {
  return Math.max(0.01, Math.min(180, maxradiuskm / KM_PER_DEGREE))
}

async function loadUsgs(query: EarthquakeQuery): Promise<SourceResult> {
  const url = new URL(USGS_QUERY_URL)
  url.searchParams.set("format", "geojson")
  url.searchParams.set("latitude", String(query.latitude))
  url.searchParams.set("longitude", String(query.longitude))
  url.searchParams.set("maxradiuskm", String(query.maxradiuskm))
  url.searchParams.set("minmagnitude", String(query.minmagnitude))
  url.searchParams.set("limit", String(query.limit))
  url.searchParams.set("orderby", query.orderby)
  url.searchParams.set("starttime", query.starttime)
  if (query.endtime) url.searchParams.set("endtime", query.endtime)

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { status: { source: "USGS", ok: false, status: response.status, count: 0 }, observations: [] }
    }

    const payload = (await response.json()) as UsgsResponse
    const observations = (payload.features ?? [])
      .map(normalizeUsgsFeature)
      .filter((event): event is SourceObservation => Boolean(event))

    return { status: { source: "USGS", ok: true, status: response.status, count: observations.length }, observations }
  } catch (error) {
    return {
      status: {
        source: "USGS",
        ok: false,
        count: 0,
        message: error instanceof Error ? error.message : "No se pudo consultar USGS.",
      },
      observations: [],
    }
  }
}

async function loadGeofon(query: EarthquakeQuery): Promise<SourceResult> {
  const url = new URL(GEOFON_QUERY_URL)
  url.searchParams.set("format", "text")
  url.searchParams.set("lat", String(query.latitude))
  url.searchParams.set("lon", String(query.longitude))
  url.searchParams.set("maxradius", String(fdsnRadiusDegrees(query.maxradiuskm)))
  url.searchParams.set("minmag", String(query.minmagnitude))
  url.searchParams.set("limit", String(query.limit))
  url.searchParams.set("starttime", query.starttime)
  if (query.endtime) url.searchParams.set("endtime", query.endtime)

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { status: { source: "GEOFON", ok: false, status: response.status, count: 0 }, observations: [] }
    }

    const observations = parseFdsnText(await response.text(), "GEOFON")
    return { status: { source: "GEOFON", ok: true, status: response.status, count: observations.length }, observations }
  } catch (error) {
    return {
      status: {
        source: "GEOFON",
        ok: false,
        count: 0,
        message: error instanceof Error ? error.message : "No se pudo consultar GEOFON.",
      },
      observations: [],
    }
  }
}

async function loadEmsc(query: EarthquakeQuery): Promise<SourceResult> {
  const url = new URL(EMSC_QUERY_URL)
  url.searchParams.set("format", "json")
  url.searchParams.set("lat", String(query.latitude))
  url.searchParams.set("lon", String(query.longitude))
  url.searchParams.set("maxradius", String(fdsnRadiusDegrees(query.maxradiuskm)))
  url.searchParams.set("minmag", String(query.minmagnitude))
  url.searchParams.set("limit", String(query.limit))
  url.searchParams.set("starttime", query.starttime)
  if (query.endtime) url.searchParams.set("endtime", query.endtime)

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { status: { source: "EMSC", ok: false, status: response.status, count: 0 }, observations: [] }
    }

    const payload = (await response.json()) as EmscResponse
    const observations = (payload.features ?? [])
      .map(normalizeEmscFeature)
      .filter((event): event is SourceObservation => Boolean(event))

    return { status: { source: "EMSC", ok: true, status: response.status, count: observations.length }, observations }
  } catch (error) {
    return {
      status: {
        source: "EMSC",
        ok: false,
        count: 0,
        message: error instanceof Error ? error.message : "No se pudo consultar EMSC.",
      },
      observations: [],
    }
  }
}

async function loadFunvisis(query: EarthquakeQuery): Promise<SourceResult> {
  try {
    const response = await fetch(FUNVISIS_RECENT_URL)
    if (!response.ok) {
      return { status: { source: "FUNVISIS", ok: false, status: response.status, count: 0 }, observations: [] }
    }

    const payload = (await response.json()) as FunvisisResponse
    const startTime = new Date(query.starttime).getTime()
    const endTime = query.endtime ? new Date(query.endtime).getTime() : Number.POSITIVE_INFINITY
    const observations = (payload.features ?? [])
      .map(normalizeFunvisisFeature)
      .filter((event): event is SourceObservation => Boolean(event))
      .filter(
        (event) => {
          const eventTime = new Date(event.time).getTime()
          return (
            eventTime >= startTime &&
            eventTime <= endTime &&
            event.magnitude >= query.minmagnitude &&
            distanceInKm(query.latitude, query.longitude, event.latitude, event.longitude) <= query.maxradiuskm
          )
        },
      )
      .slice(0, query.limit)

    return {
      status: { source: "FUNVISIS", ok: true, status: response.status, count: observations.length },
      observations,
    }
  } catch (error) {
    return {
      status: {
        source: "FUNVISIS",
        ok: false,
        count: 0,
        message: error instanceof Error ? error.message : "No se pudo consultar FUNVISIS.",
      },
      observations: [],
    }
  }
}

async function loadSgc(query: EarthquakeQuery): Promise<SourceResult> {
  const url = new URL(SGC_QUERY_URL)
  url.searchParams.set("startdate", sgcDateParam(query.starttime))
  url.searchParams.set("enddate", sgcDateParam(query.endtime))

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { status: { source: "SGC", ok: false, status: response.status, count: 0 }, observations: [] }
    }

    const payload = (await response.json()) as SgcResponse
    const startTime = new Date(query.starttime).getTime()
    const endTime = query.endtime ? new Date(query.endtime).getTime() : Number.POSITIVE_INFINITY
    const observations = (payload.features ?? [])
      .map(normalizeSgcFeature)
      .filter((event): event is SourceObservation => Boolean(event))
      .filter((event) => {
        const eventTime = new Date(event.time).getTime()
        return (
          eventTime >= startTime &&
          eventTime <= endTime &&
          event.magnitude >= query.minmagnitude &&
          distanceInKm(query.latitude, query.longitude, event.latitude, event.longitude) <= query.maxradiuskm
        )
      })
      .slice(0, query.limit)

    return {
      status: { source: "SGC", ok: true, status: response.status, count: observations.length },
      observations,
    }
  } catch (error) {
    return {
      status: {
        source: "SGC",
        ok: false,
        count: 0,
        message: error instanceof Error ? error.message : "No se pudo consultar SGC.",
      },
      observations: [],
    }
  }
}

export async function getEarthquakes(requestUrl: string): Promise<EarthquakeServiceResult> {
  const url = new URL(requestUrl, "https://red-help-ve.vercel.app")
  const latitude = readNumber(url.searchParams, "latitude", DEFAULT_LATITUDE, { min: -90, max: 90 })
  const longitude = readNumber(url.searchParams, "longitude", DEFAULT_LONGITUDE, { min: -180, max: 180 })
  const userLatitudeRaw = getQueryValue(url.searchParams, "userLatitude")
  const userLongitudeRaw = getQueryValue(url.searchParams, "userLongitude")
  const userLatitude = userLatitudeRaw === undefined ? undefined : Number(userLatitudeRaw)
  const userLongitude = userLongitudeRaw === undefined ? undefined : Number(userLongitudeRaw)
  const hasUserLocation =
    finiteNumber(userLatitude) &&
    finiteNumber(userLongitude) &&
    userLatitude !== undefined &&
    userLongitude !== undefined

  const query = {
    latitude,
    longitude,
    maxradiuskm: readNumber(url.searchParams, "maxradiuskm", DEFAULT_MAX_RADIUS_KM, { min: 1, max: 20001 }),
    minmagnitude: readNumber(url.searchParams, "minmagnitude", DEFAULT_MIN_MAGNITUDE, { min: 0, max: 10 }),
    limit: Math.round(readNumber(url.searchParams, "limit", DEFAULT_LIMIT, { min: 1, max: 500 })),
    orderby: readString(url.searchParams, "orderby", DEFAULT_ORDER_BY, ["time", "time-asc", "magnitude", "magnitude-asc"]),
    starttime: readDateTime(url.searchParams, "starttime", DEFAULT_START_TIME) ?? DEFAULT_START_TIME,
    endtime: readDateTime(url.searchParams, "endtime"),
  }

  const results = await Promise.all([loadSgc(query), loadUsgs(query), loadGeofon(query), loadEmsc(query), loadFunvisis(query)])
  const sourceStatuses = results.map((result) => result.status)
  const observations = results.flatMap((result) => result.observations).filter(isNotFutureEvent)
  const events = mergeObservations(
    observations,
    hasUserLocation ? userLatitude : undefined,
    hasUserLocation ? userLongitude : undefined,
  )
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, query.limit)

  const hasSuccessfulSource = sourceStatuses.some((status) => status.ok)
  return {
    status: hasSuccessfulSource ? 200 : 502,
    body: {
      ok: hasSuccessfulSource,
      message: hasSuccessfulSource ? undefined : "No se pudo consultar ninguna fuente sismica.",
      generatedAt: new Date().toISOString(),
      query,
      count: events.length,
      sourceStatuses,
      events,
    },
  }
}
