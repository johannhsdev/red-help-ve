import { useMemo, useState } from "react"
import { AlertTriangle, MapPinned, Search } from "lucide-react"
import type { AffectedSitesState } from "../hooks/useAffectedSites"
import { AffectedSiteCard } from "./AffectedSiteCard"
import { AffectedSiteDialog } from "./AffectedSiteDialog"
import { LocationMap } from "./LocationMap"

const urgencyRank = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function AffectedSitesView({ affectedSites }: { affectedSites: AffectedSitesState }) {
  const { sites, loaded, error, addSite } = affectedSites
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sites
      .filter((site) => {
        if (!q) return true
        return [
          site.name,
          site.address,
          site.needs,
          site.description ?? "",
          site.contactName ?? "",
          site.contactPhone ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || b.createdAt - a.createdAt)
  }, [query, sites])

  const markers = filtered.map((site) => ({
    latitude: site.latitude,
    longitude: site.longitude,
    label: site.name,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-[448px]">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por lugar, necesidad, contacto..."
            className="input_rhve__fom h-8 min-h-8 rounded-[10px] border-[#303033] bg-transparent pl-9 text-[13px]"
            aria-label="Buscar zonas afectadas"
          />
        </div>
        <AffectedSiteDialog onAdd={addSite} />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
          No se pudieron cargar las zonas afectadas: {error}
        </div>
      ) : !loaded ? (
        <p className="py-16 text-center text-[var(--muted-foreground)]">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertTriangle className="size-10 text-[var(--muted-foreground)]" />
          <p className="text-lg font-medium text-[var(--foreground)]">No hay zonas afectadas</p>
          <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
            Registra un lugar donde haya familias que necesiten ayuda directa.
          </p>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <MapPinned className="size-4 text-red-300" aria-hidden="true" />
              Mapa de zonas afectadas
            </div>
            <LocationMap markers={markers} className="h-[320px]" />
          </section>

          <p className="text-sm text-[var(--muted-foreground)]" aria-live="polite">
            Mostrando {filtered.length} de {sites.length} zonas afectadas
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((site) => (
              <AffectedSiteCard key={site.id} site={site} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
