import { useEffect, useMemo, useRef, useState } from "react"
import { Search, Users, Package, HeartHandshake } from "lucide-react"
import type { RegistryState } from "../hooks/useRegistry"
import type { RecordType, RegistryRecord, SupplyCenter } from "../types/registry"
import { RecordCard } from "./RecordCard"
import { RegisterDialog } from "./RegisterDialog"

const PAGE_SIZE = 6
type Filter = "todos" | RecordType

function priority(record: RegistryRecord) {
  if (record.type === "persons" && record.status === "missing") return 0
  if (record.type === "centers") return 1
  return 2
}

export function RegistryView({ registry }: { registry: RegistryState }) {
  const { records, loaded, error, addRecord, reportFound, reopenPerson } = registry
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("todos")
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records
      .filter((r) => {
        if (filter !== "todos" && r.type !== filter) return false
        if (!q) return true
        const haystack = [
          r.name,
          r.location,
          ...r.contacts,
          r.type === "persons" ? r.cedula : "",
          r.type === "persons" ? r.contactName : "",
          r.type === "persons" ? (r.notes ?? "") : "",
          r.type === "centers" ? (r.organization ?? "") : "",
          r.type === "centers" ? r.needs : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => {
        const byPriority = priority(a) - priority(b)
        return byPriority || b.createdAt - a.createdAt
      })
  }, [records, query, filter])

  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [query, filter])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + PAGE_SIZE, filtered.length))
        }
      },
      { rootMargin: "200px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [filtered.length])

  const centers = useMemo(
    () => records.filter((r): r is SupplyCenter => r.type === "centers"),
    [records],
  )
  const personCount = records.filter((r) => r.type === "persons").length
  const centerCount = centers.length
  const shown = filtered.slice(0, visible)

  const filters: { key: Filter; label: string; count: number; icon?: React.ReactNode }[] = [
    { key: "todos", label: "Todos", count: records.length },
    { key: "persons", label: "Personas", count: personCount, icon: <Users className="size-3.5" /> },
    { key: "centers", label: "Centros", count: centerCount, icon: <Package className="size-3.5" /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Controls bar */}
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-[448px]">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, cédula, ubicación..."
            className="input_rhve__fom h-8 min-h-8 rounded-[10px] border-[#303033] bg-transparent pl-9 text-[13px]"
            aria-label="Buscar registros"
          />
        </div>

        {/* Filters + Register */}
        <div className="flex items-center gap-2">
          {/* Filtros: scroll horizontal en mobile */}
          <div className="-mx-4 flex flex-1 items-center gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:px-0">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.key
                    ? "border-[#f4f4f5] bg-[#f4f4f5] text-[#18181b]"
                    : "border-[#2f2f32] bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                {f.icon}
                {f.label}
                <span className="text-xs opacity-70">{f.count}</span>
              </button>
            ))}
          </div>
          <div className="shrink-0">
            <RegisterDialog onAdd={addRecord} />
          </div>
        </div>
      </div>

      {/* Results */}
      {error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
          No se pudo cargar la información: {error}
        </div>
      ) : !loaded ? (
        <p className="py-16 text-center text-[var(--muted-foreground)]">Cargando...</p>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <HeartHandshake className="size-10 text-[var(--muted-foreground)]" />
          <p className="text-lg font-medium text-[var(--foreground)]">No hay resultados</p>
          <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
            {records.length === 0
              ? "Aún no hay registros. Sé el primero en registrar una persona o un centro de acopio."
              : "Prueba con otra búsqueda o cambia el filtro."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--muted-foreground)]" aria-live="polite">
            Mostrando {shown.length} de {filtered.length} registros
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((record) => (
              <RecordCard
                key={`${record.type}-${record.id}`}
                record={record}
                centers={centers}
                onReportFound={reportFound}
                onReopen={reopenPerson}
              />
            ))}
          </div>
          {visible < filtered.length && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              <div className="size-6 animate-spin rounded-full border-2 border-[var(--muted)] border-t-[var(--primary)]" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
