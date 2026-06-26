import { useMemo, useState, type FormEvent } from "react"
import {
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react"
import type { HospitalCenter, HospitalPatient, HospitalPatientDraft } from "../types/registry"
import { Badge } from "./ui/Badge"
import { Button } from "./ui/Button"
import { Input, Label, Textarea } from "./ui/Input"

type VerificationPatch = {
  verifiedInHospital?: boolean
  foundByFamily?: boolean
}

function formatDate(timestamp: number | undefined) {
  if (!timestamp) return ""
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp)
}

function patientMatches(patient: HospitalPatient, query: string) {
  if (!query) return true
  return [patient.name, patient.nationalId, patient.notes ?? ""].join(" ").toLowerCase().includes(query)
}

function patientCountLabel(count: number) {
  return count === 1 ? "1 paciente ingresado" : `${count} pacientes ingresados`
}

function hospitalVerifiedLabel(count: number) {
  return count === 1
    ? "1 ubicado en este hospital"
    : `${count} ubicados en este hospital`
}

function familyFoundLabel(count: number) {
  return count === 1
    ? "1 localizado por familiar"
    : `${count} localizados por familiares`
}

export function HospitalCenterAccordion({
  center,
  query,
  onAddPatient,
  onUpdatePatientVerification,
}: {
  center: HospitalCenter
  query: string
  onAddPatient: (hospitalCenterId: number, patient: HospitalPatientDraft) => Promise<HospitalPatient>
  onUpdatePatientVerification: (patientId: number, patch: VerificationPatch) => Promise<HospitalPatient>
}) {
  const [nationalId, setNationalId] = useState("")
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [savingKey, setSavingKey] = useState("")
  const [error, setError] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const centerText = [center.name, center.city, center.state ?? "", center.address, center.contactPhone ?? ""]
    .join(" ")
    .toLowerCase()
  const centerMatchesQuery = normalizedQuery ? centerText.includes(normalizedQuery) : true
  const visiblePatients = useMemo(() => {
    if (!normalizedQuery || centerMatchesQuery) return center.patients
    return center.patients.filter((patient) => patientMatches(patient, normalizedQuery))
  }, [center.patients, centerMatchesQuery, normalizedQuery])
  const verifiedCount = center.patients.filter((patient) => patient.verifiedInHospital).length
  const familyFoundCount = center.patients.filter((patient) => patient.foundByFamily).length

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    const draft: HospitalPatientDraft = {
      nationalId,
      name,
      age: age ? Number(age) : undefined,
      notes: notes.trim() || undefined,
    }

    try {
      setSubmitting(true)
      await onAddPatient(center.id, draft)
      setNationalId("")
      setName("")
      setAge("")
      setNotes("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el paciente.")
    } finally {
      setSubmitting(false)
    }
  }

  async function updateVerification(patientId: number, key: keyof VerificationPatch, value: boolean) {
    const nextSavingKey = `${patientId}-${key}`
    setSavingKey(nextSavingKey)
    setError("")

    try {
      await onUpdatePatientVerification(patientId, { [key]: value })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la verificacion.")
    } finally {
      setSavingKey("")
    }
  }

  return (
    <details className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5 shrink-0 text-sky-300" aria-hidden="true" />
            <h2 className="truncate text-base font-semibold text-white">{center.name}</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {center.city}
            {center.state ? `, ${center.state}` : ""} - {center.address}
          </p>
          {center.notes && (
            <p className="mt-2 line-clamp-2 text-sm text-[#cbd5e1]">{center.notes}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant="center" className="gap-1.5">
            <UsersRound className="size-3.5" />
            {patientCountLabel(center.patients.length)}
          </Badge>
          <Badge variant="found" className="gap-1.5">
            <ShieldCheck className="size-3.5" />
            {hospitalVerifiedLabel(verifiedCount)}
          </Badge>
          <Badge variant="default" className="gap-1.5 bg-emerald-950 text-emerald-200">
            <CheckCircle2 className="size-3.5" />
            {familyFoundLabel(familyFoundCount)}
          </Badge>
          <ChevronDown className="size-5 text-[var(--muted-foreground)] transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t border-[var(--border)] p-4">
        {center.contactPhone && (
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            Contacto del centro: <span className="font-medium text-white">{center.contactPhone}</span>
          </p>
        )}

        {visiblePatients.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
            No hay pacientes para mostrar en este centro.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visiblePatients.map((patient, index) => {
              const savingHospital = savingKey === `${patient.id}-verifiedInHospital`
              const savingFamily = savingKey === `${patient.id}-foundByFamily`

              return (
                <article
                  key={patient.id}
                  className="rounded-lg border border-white/[0.04] bg-[#171717] p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--muted-foreground)]">
                          {index + 1}-
                        </span>
                        <h3 className="text-sm font-semibold text-white">{patient.name}</h3>
                        <Badge variant={patient.verifiedInHospital ? "found" : "missing"}>
                          {patient.verifiedInHospital ? "En hospital" : "Por verificar"}
                        </Badge>
                        {patient.foundByFamily && <Badge variant="found">Familia lo encontro</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        Cedula: <span className="font-medium text-white">{patient.nationalId}</span>
                        {patient.age !== undefined && ` - ${patient.age} anos`}
                      </p>
                      {patient.notes && <p className="mt-2 text-sm text-[#cbd5e1]">{patient.notes}</p>}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
                      <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm text-white">
                        <input
                          type="checkbox"
                          checked={patient.verifiedInHospital}
                          disabled={savingHospital || savingFamily}
                          onChange={(e) =>
                            void updateVerification(patient.id, "verifiedInHospital", e.target.checked)
                          }
                          className="size-4 accent-green-500"
                        />
                        <span className="flex flex-col">
                          Verificado en hospital
                          {patient.verifiedAt && (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {formatDate(patient.verifiedAt)}
                            </span>
                          )}
                        </span>
                        {savingHospital && <Loader2 className="ml-auto size-4 animate-spin" />}
                      </label>

                      <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm text-white">
                        <input
                          type="checkbox"
                          checked={patient.foundByFamily}
                          disabled={savingHospital || savingFamily}
                          onChange={(e) =>
                            void updateVerification(patient.id, "foundByFamily", e.target.checked)
                          }
                          className="size-4 accent-green-500"
                        />
                        <span className="flex flex-col">
                          Familia lo encontro
                          {patient.familyFoundAt && (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {formatDate(patient.familyFoundAt)}
                            </span>
                          )}
                        </span>
                        {savingFamily && <Loader2 className="ml-auto size-4 animate-spin" />}
                      </label>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-black/10 p-4"
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <UserPlus className="size-4 text-sky-300" aria-hidden="true" />
            Agregar paciente a este centro
          </div>

          <fieldset disabled={submitting} className="m-0 grid gap-3 border-0 p-0 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`patient-id-${center.id}`}>Cedula</Label>
              <Input
                id={`patient-id-${center.id}`}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 12))}
                required
                inputMode="numeric"
                pattern="[0-9]{5,12}"
                placeholder="12345678"
              />
            </div>

            <div className="flex flex-col gap-2 lg:col-span-2">
              <Label htmlFor={`patient-name-${center.id}`}>Nombre completo</Label>
              <Input
                id={`patient-name-${center.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Nombre y apellido"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`patient-age-${center.id}`}>Edad (opcional)</Label>
              <Input
                id={`patient-age-${center.id}`}
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
                inputMode="numeric"
                placeholder="35"
              />
            </div>

            <div className="flex flex-col gap-2 lg:col-span-4">
              <Label htmlFor={`patient-notes-${center.id}`}>Notas (opcional)</Label>
              <Textarea
                id={`patient-notes-${center.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Area del hospital, condicion reportada, referencia..."
              />
            </div>
          </fieldset>

          {error && <p className="mt-3 text-sm font-medium text-red-400">{error}</p>}

          <Button type="submit" className="mt-3 w-full gap-2" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            {submitting ? "Agregando..." : "Agregar paciente"}
          </Button>
        </form>
      </div>
    </details>
  )
}
