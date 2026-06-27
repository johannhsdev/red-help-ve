import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowDownUp,
  Clock3,
  ExternalLink,
  LocateFixed,
  MapPin,
  RefreshCw,
  Ruler,
  Waves,
} from "lucide-react"
import type { EarthquakesState } from "../hooks/useEarthquakes"
import type { EarthquakeEvent, EarthquakeSource } from "../types/earthquake"
import { Dialog } from "./ui/Dialog"
import { Button } from "./ui/Button"
import { LocationMap } from "./LocationMap"

type SortMode = "recent" | "magnitude" | "nearest"
type SourceFilter = "all" | EarthquakeSource

const dateFormatter = new Intl.DateTimeFormat("es-VE", {
  dateStyle: "medium",
  timeStyle: "short",
})

const relativeFormatter = new Intl.RelativeTimeFormat("es-VE", {
  numeric: "auto",
})

function formatDate(value: string | null | undefined) {
  if (!value) return "No disponible"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No disponible"
  return dateFormatter.format(date)
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60000)

  if (diffMinutes > 0) return "hace instantes"
  if (Math.abs(diffMinutes) < 60) return relativeFormatter.format(diffMinutes, "minute")
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 48) return relativeFormatter.format(diffHours, "hour")
  return relativeFormatter.format(Math.round(diffHours / 24), "day")
}

function formatDepth(depthKm: number | null) {
  if (depthKm === null) return "Profundidad no disponible"
  return `${depthKm.toFixed(1)} km de profundidad`
}

function magnitudeTone(magnitude: number) {
  if (magnitude >= 6) return "border-red-500/70 bg-red-950/70 text-red-100"
  if (magnitude >= 4.5) return "border-orange-500/70 bg-orange-950/60 text-orange-100"
  if (magnitude >= 3) return "border-amber-500/70 bg-amber-950/60 text-amber-100"
  return "border-sky-500/60 bg-sky-950/60 text-sky-100"
}

const sourceLabel: Record<EarthquakeSource, string> = {
  USGS: "USGS",
  GEOFON: "GFZ GEOFON",
  EMSC: "EMSC",
  FUNVISIS: "FUNVISIS",
}

const sourceClass: Record<EarthquakeSource, string> = {
  USGS: "border-sky-500/40 bg-sky-950/50 text-sky-100",
  GEOFON: "border-violet-500/40 bg-violet-950/50 text-violet-100",
  EMSC: "border-amber-500/40 bg-amber-950/50 text-amber-100",
  FUNVISIS: "border-emerald-500/40 bg-emerald-950/50 text-emerald-100",
}

function validationLabel(event: EarthquakeEvent) {
  const sources = new Set(event.confirmedBy)

  if (sources.size === 0) return "Sin validar"
  if (sources.has("FUNVISIS")) {
    return sources.size === 1 ? "Validado por FUNVISIS" : `Validado por FUNVISIS y ${sources.size - 1} fuente${sources.size === 2 ? "" : "s"}`
  }
  if (sources.has("USGS") && sources.has("EMSC")) return "Validacion media alta"
  if (sources.size >= 3) return "Validacion alta"
  if (sources.size === 2) return "Validacion media"

  return `Reportado por ${sourceLabel[event.source]}`
}

function sourceBadgeLabel(source: EarthquakeSource, sourceCount: number) {
  if (source === "FUNVISIS") return "Validado por FUNVISIS"
  return `${sourceCount > 1 ? "Confirmado" : "Reportado"} por ${sourceLabel[source]}`
}

function sortEvents(events: EarthquakeEvent[], sortMode: SortMode) {
  return [...events].sort((a, b) => {
    if (sortMode === "magnitude") return b.magnitude - a.magnitude
    if (sortMode === "nearest") {
      const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY
      const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY
      return aDistance - bDistance
    }
    return new Date(b.time).getTime() - new Date(a.time).getTime()
  })
}

function EarthquakeCard({
  event,
  onSelect,
}: {
  event: EarthquakeEvent
  onSelect: (event: EarthquakeEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className="grid w-full cursor-pointer gap-3 rounded-[10px] border border-[#2a2a2d] bg-[#151515] p-4 text-left transition-colors hover:border-[#3e3e42] hover:bg-[#191919] sm:grid-cols-[88px_minmax(0,1fr)_auto]"
    >
      <span
        className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-lg border text-center ${magnitudeTone(
          event.magnitude,
        )}`}
      >
        <span className="text-[11px] font-bold uppercase tracking-wide opacity-80">Mag</span>
        <span className="text-3xl font-extrabold leading-none">{event.magnitude.toFixed(1)}</span>
      </span>

      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="block text-base font-extrabold leading-tight text-white">{event.place}</span>
          {event.sources.map((source) => (
            <span
              key={`${event.id}-${source.source}`}
              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${sourceClass[source.source]}`}
            >
              {sourceLabel[source.source]}
            </span>
          ))}
        </span>
        <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#b7c0cc]">
          <span className="inline-flex items-center gap-1.5 text-emerald-200">
            {validationLabel(event)} ({event.confirmedBy.length} fuente
            {event.confirmedBy.length === 1 ? "" : "s"})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-4" aria-hidden="true" />
            {formatRelativeTime(event.time)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="size-4" aria-hidden="true" />
            {formatDepth(event.depthKm)}
          </span>
          {event.distanceKm !== undefined ? (
            <span className="inline-flex items-center gap-1.5 text-sky-200">
              <LocateFixed className="size-4" aria-hidden="true" />
              {event.distanceKm} km de ti
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <LocateFixed className="size-4" aria-hidden="true" />
              Activa ubicacion para distancia
            </span>
          )}
        </span>
      </span>

      <span className="flex items-center gap-1.5 text-sm font-bold text-[#d7dce3] sm:self-center">
        Detalle
        <ExternalLink className="size-4" aria-hidden="true" />
      </span>
    </button>
  )
}

export function EarthquakesView({ earthquakes }: { earthquakes: EarthquakesState }) {
  const {
    events,
    loaded,
    loading,
    error,
    generatedAt,
    userLocation,
    setUserLocation,
    refresh,
  } = earthquakes
  const [sortMode, setSortMode] = useState<SortMode>("recent")
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all")
  const [selected, setSelected] = useState<EarthquakeEvent | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState("")

  const availableSources = useMemo(
    () => Array.from(new Set(events.flatMap((event) => event.sources.map((source) => source.source)))).sort(),
    [events],
  )
  const filteredEvents = useMemo(
    () => events.filter((event) => sourceFilter === "all" || event.sources.some((source) => source.source === sourceFilter)),
    [events, sourceFilter],
  )
  const sortedEvents = useMemo(() => sortEvents(filteredEvents, sortMode), [filteredEvents, sortMode])
  const strongest = useMemo(
    () => events.reduce<EarthquakeEvent | null>((current, event) => (!current || event.magnitude > current.magnitude ? event : current), null),
    [events],
  )

  function useCurrentLocation() {
    setLocationMessage("")

    if (!navigator.geolocation) {
      setLocationMessage("Tu navegador no permite obtener la ubicacion actual.")
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationMessage("Ubicacion activa. Calculando distancia aproximada.")
        setLocating(false)
      },
      () => {
        setLocationMessage("No se pudo obtener tu ubicacion. Puedes ver los sismos sin distancia.")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[10px] border border-[#2a2a2d] bg-[#151515] p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-950/60 text-red-200">
              <Waves className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold leading-tight text-white">Actividad sismica reciente</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#b7c0cc]">
                Consulta centralizada con USGS, GFZ GEOFON, EMSC y FUNVISIS. La distancia se calcula solo si activas GPS.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[10px] border border-[#2a2a2d] bg-[#151515] p-4">
            <p className="text-2xl font-extrabold leading-none text-white">{events.length}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#9ba4af]">Sismos</p>
          </div>
          <div className="rounded-[10px] border border-[#2a2a2d] bg-[#151515] p-4">
            <p className="text-2xl font-extrabold leading-none text-white">
              {strongest ? strongest.magnitude.toFixed(1) : "0"}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#9ba4af]">Mayor magnitud</p>
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-[#b7c0cc]">
            <ArrowDownUp className="size-4" aria-hidden="true" />
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="select_rhve__form h-8 min-h-8 w-44 rounded-full bg-transparent text-[13px]"
            >
              <option value="recent">Mas recientes</option>
              <option value="magnitude">Mayor magnitud</option>
              <option value="nearest" disabled={!userLocation}>
                Mas cercanos
              </option>
            </select>
          </label>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-[#b7c0cc]">
            Fuente
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
              className="select_rhve__form h-8 min-h-8 w-40 rounded-full bg-transparent text-[13px]"
            >
              <option value="all">Todas</option>
              {availableSources.map((source) => (
                <option key={source} value={source}>
                  {sourceLabel[source]}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            variant="tertiary"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
            className="min-h-8 rounded-full px-3 py-1.5"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Actualizar
          </Button>
        </div>

        <Button
          type="button"
          variant={userLocation ? "secondary" : "primary"}
          size="sm"
          onClick={useCurrentLocation}
          disabled={locating}
          className="min-h-8 rounded-full px-3 py-1.5"
        >
          <LocateFixed className={`size-4 ${locating ? "animate-pulse" : ""}`} aria-hidden="true" />
          {userLocation ? "Ubicacion activa" : locating ? "Ubicando..." : "Usar mi ubicacion"}
        </Button>
      </div>

      {locationMessage && (
        <p className="rounded-lg border border-[#2a2a2d] bg-[#151515] px-3 py-2 text-sm text-[#d7dce3]">
          {locationMessage}
        </p>
      )}

      {error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
          No se pudo cargar la informacion sismica: {error}
        </div>
      ) : !loaded ? (
        <p className="py-16 text-center text-[var(--muted-foreground)]">Cargando sismos...</p>
      ) : sortedEvents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertTriangle className="size-10 text-[var(--muted-foreground)]" aria-hidden="true" />
          <p className="text-lg font-medium text-[var(--foreground)]">No hay sismos recientes para mostrar</p>
          <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
            Intenta actualizar en unos minutos o ajustar el origen de datos de la API.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--muted-foreground)]" aria-live="polite">
            Mostrando {sortedEvents.length} sismos
            {sourceFilter !== "all" ? ` de ${sourceLabel[sourceFilter]}` : ""}
            {generatedAt ? `, actualizado ${formatDate(generatedAt)}` : ""}
          </p>
          <div className="flex max-h-[70dvh] flex-col gap-3 overflow-y-auto pr-1">
            {sortedEvents.map((event) => (
              <EarthquakeCard key={event.id} event={event} onSelect={setSelected} />
            ))}
          </div>
        </>
      )}

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Magnitud ${selected.magnitude.toFixed(1)}` : "Detalle del sismo"}
        description={selected?.place}
        className="sm:!max-w-3xl"
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#2a2a2d] bg-[#18181b] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#9ba4af]">Hora</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatDate(selected.time)}</p>
              </div>
              <div className="rounded-lg border border-[#2a2a2d] bg-[#18181b] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#9ba4af]">Profundidad</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatDepth(selected.depthKm)}</p>
              </div>
              <div className="rounded-lg border border-[#2a2a2d] bg-[#18181b] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#9ba4af]">Distancia</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {selected.distanceKm !== undefined ? `${selected.distanceKm} km de tu ubicacion` : "GPS no activo"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selected.sources.map((source) => (
                <span
                  key={`${selected.id}-detail-${source.source}`}
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide ${sourceClass[source.source]}`}
                >
                  {sourceBadgeLabel(source.source, selected.sources.length)}
                </span>
              ))}
            </div>

            <LocationMap
              value={{
                latitude: selected.coordinates.latitude,
                longitude: selected.coordinates.longitude,
                label: selected.title,
              }}
              className="h-72"
            />

            <div className="flex flex-col gap-2 text-sm text-[#c7cbd1]">
              <span className="font-semibold text-emerald-200">
                {validationLabel(selected)} con {selected.confirmedBy.length} fuente
                {selected.confirmedBy.length === 1 ? "" : "s"}.
              </span>
              <span className="inline-flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#aab0b8]" aria-hidden="true" />
                {selected.coordinates.latitude.toFixed(4)}, {selected.coordinates.longitude.toFixed(4)}
              </span>
              {selected.updated && <span>Ultima actualizacion: {formatDate(selected.updated)}</span>}
            </div>

            {selected.sources.some((source) => source.url) && (
              <div className="grid gap-2 sm:grid-cols-2">
                {selected.sources.map((source) =>
                  source.url ? (
                    <a
                      key={`${selected.id}-link-${source.source}`}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="tertiary_button px-3 py-2 text-sm"
                    >
                      <ExternalLink className="size-4" aria-hidden="true" />
                      Ver en {sourceLabel[source.source]}
                    </a>
                  ) : null,
                )}
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
