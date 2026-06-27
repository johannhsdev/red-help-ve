import { useMemo, useState } from "react"
import { Home, MapPinned, Search } from "lucide-react"
import type { SheltersState } from "../hooks/useShelters"
import { LocationMap } from "./LocationMap"
import { ShelterAccordion } from "./ShelterAccordion"
import { ShelterDialog } from "./ShelterDialog"

function shelterMatchesQuery(shelter: SheltersState["shelters"][number], query: string) {
  if (!query) return true
  const shelterText = [
    shelter.name,
    shelter.city,
    shelter.state ?? "",
    shelter.address,
    shelter.contactPhone ?? "",
    shelter.notes ?? "",
  ]
    .join(" ")
    .toLowerCase()

  if (shelterText.includes(query)) return true

  return shelter.people.some((person) =>
    [person.name, person.nationalId ?? "", person.notes ?? ""].join(" ").toLowerCase().includes(query),
  )
}

export function SheltersView({ shelters }: { shelters: SheltersState }) {
  const { shelters: records, loaded, error, addShelter, addPerson, updatePersonVerification } = shelters
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records.filter((shelter) => shelterMatchesQuery(shelter, q))
  }, [records, query])
  const markers = filtered.map((shelter) => ({
    latitude: shelter.latitude,
    longitude: shelter.longitude,
    label: shelter.name,
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
            placeholder="Buscar por refugio, ciudad, persona o cedula..."
            className="input_rhve__fom h-8 min-h-8 rounded-[10px] border-[#303033] bg-transparent pl-9 text-[13px]"
            aria-label="Buscar refugios"
          />
        </div>
        <ShelterDialog onAdd={addShelter} />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
          No se pudieron cargar los refugios: {error}
        </div>
      ) : !loaded ? (
        <p className="py-16 text-center text-[var(--muted-foreground)]">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Home className="size-10 text-[var(--muted-foreground)]" />
          <p className="text-lg font-medium text-[var(--foreground)]">No hay refugios</p>
          <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
            Registra un refugio para empezar a cargar el listado de personas refugiadas.
          </p>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <MapPinned className="size-4 text-emerald-300" aria-hidden="true" />
              Mapa de refugios
            </div>
            <LocationMap markers={markers} className="h-[320px]" />
          </section>

          <p className="text-sm text-[var(--muted-foreground)]" aria-live="polite">
            Mostrando {filtered.length} de {records.length} refugios
          </p>
          <div className="flex flex-col gap-4">
            {filtered.map((shelter) => (
              <ShelterAccordion
                key={shelter.id}
                shelter={shelter}
                query={query}
                onAddPerson={addPerson}
                onUpdatePersonVerification={updatePersonVerification}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
