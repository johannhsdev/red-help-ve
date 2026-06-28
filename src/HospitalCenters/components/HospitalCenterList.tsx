import { useMemo, useState, type ReactNode } from "react"
import { Building2, Search } from "lucide-react"
import type { IHospitalCenter, IHospitalCenterDraft, IHospitalPatient, IHospitalPatientDraft } from "../../Interfaces/IHospitalCenter"
import { HospitalCenterCard } from "./HospitalCenterCard"

type VerificationPatch = { verifiedInHospital?: boolean; foundByFamily?: boolean }

function centerMatchesQuery(center: IHospitalCenter, query: string) {
  if (!query) return true
  const centerText = [
    center.name,
    center.city,
    center.state ?? "",
    center.address,
    center.contactPhone ?? "",
    center.notes ?? "",
  ]
    .join(" ")
    .toLowerCase()

  if (centerText.includes(query)) return true

  return center.patients.some((patient) =>
    [patient.name, patient.nationalId, patient.notes ?? ""].join(" ").toLowerCase().includes(query),
  )
}

export function HospitalCenterList({
  centers,
  loaded,
  error,
  onAddCenter: _onAddCenter,
  onAddPatient,
  onUpdatePatientVerification,
  renderForm,
}: {
  centers: IHospitalCenter[]
  loaded: boolean
  error: string
  onAddCenter: (draft: IHospitalCenterDraft) => Promise<IHospitalCenter>
  onAddPatient: (hospitalCenterId: number, draft: IHospitalPatientDraft) => Promise<IHospitalPatient>
  onUpdatePatientVerification: (patientId: number, patch: VerificationPatch) => Promise<IHospitalPatient>
  renderForm: () => ReactNode
}) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return centers.filter((center) => centerMatchesQuery(center, q))
  }, [centers, query])

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
            placeholder="Buscar por hospital, ciudad, paciente o cedula..."
            className="input_rhve__fom h-8 min-h-8 rounded-[10px] border-[#303033] bg-transparent pl-9 text-[13px]"
            aria-label="Buscar centros hospitalarios"
          />
        </div>
        {renderForm()}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
          No se pudieron cargar los centros hospitalarios: {error}
        </div>
      ) : !loaded ? (
        <p className="py-16 text-center text-[var(--muted-foreground)]">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Building2 className="size-10 text-[var(--muted-foreground)]" />
          <p className="text-lg font-medium text-[var(--foreground)]">No hay centros hospitalarios</p>
          <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
            Registra un hospital para empezar a cargar el listado de personas recibidas.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--muted-foreground)]" aria-live="polite">
            Mostrando {filtered.length} de {centers.length} centros hospitalarios
          </p>
          <div className="flex flex-col gap-4">
            {filtered.map((center) => (
              <HospitalCenterCard
                key={center.id}
                center={center}
                query={query}
                onAddPatient={onAddPatient}
                onUpdatePatientVerification={onUpdatePatientVerification}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
