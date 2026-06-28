import { useEffect, useMemo, useRef, useState } from "react"
import { Search, HeartHandshake } from "lucide-react"
import { MissingPersonCard } from "./MissingPersonCard"
import type { IMissingPerson } from "../../../Interfaces/IMissingPerson"

const PAGE_SIZE = 6

function priority(person: IMissingPerson) {
  return person.status === "missing" ? 0 : 1
}

interface Props {
  persons: IMissingPerson[]
  loading: boolean
  onReportFound: (person: IMissingPerson) => void
  onReopen: (id: number) => void
  headerAction?: React.ReactNode
}

export function MissingPersonList({ persons, loading, onReportFound, onReopen, headerAction }: Props) {
  const [query, setQuery] = useState("")
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return persons
      .filter((person) => {
        if (!q) return true
        const haystack = [
          person.name,
          person.location,
          person.cedula,
          person.contactName,
          person.notes ?? "",
          ...person.contacts,
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
  }, [persons, query])

  function handleQueryChange(value: string) {
    setQuery(value)
    setVisible(PAGE_SIZE)
  }

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

  const shown = filtered.slice(0, visible)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 sm:max-w-[448px]">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar por nombre, cédula, ubicación..."
            className="input_rhve__fom h-8 min-h-8 w-full rounded-[10px] border-[#303033] bg-transparent pl-9 text-[13px]"
            aria-label="Buscar personas"
          />
        </div>
        {headerAction && <div className="ml-auto">{headerAction}</div>}
      </div>

      {loading ? (
        <p className="py-16 text-center text-[var(--muted-foreground)]">Cargando...</p>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <HeartHandshake className="size-10 text-[var(--muted-foreground)]" />
          <p className="text-lg font-medium text-[var(--foreground)]">No hay resultados</p>
          <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
            {persons.length === 0
              ? "Aún no hay registros. Sé el primero en registrar una persona."
              : "Prueba con otra búsqueda."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--muted-foreground)]" aria-live="polite">
            Mostrando {shown.length} de {filtered.length} registros
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((person) => (
              <MissingPersonCard
                key={person.id}
                person={person}
                onReportFound={onReportFound}
                onReopen={onReopen}
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
