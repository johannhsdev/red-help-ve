import { useMemo, useState, type FormEvent } from "react"
import {
  CheckCircle2,
  ChevronDown,
  Home,
  Loader2,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react"
import type { IShelter, IShelterPerson, IShelterPersonDraft } from "../../../Interfaces/IShelter"
import { Badge } from "../../../components/ui/Badge"
import { Button } from "../../../components/ui/Button"
import { Input, Label, Textarea } from "../../../components/ui/Input"

type VerificationPatch = {
  verifiedInShelter?: boolean
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

function personMatches(person: IShelterPerson, query: string) {
  if (!query) return true
  return [person.name, person.nationalId ?? "", person.notes ?? ""].join(" ").toLowerCase().includes(query)
}

function peopleCountLabel(count: number) {
  return count === 1 ? "1 persona refugiada" : `${count} personas refugiadas`
}

function shelterVerifiedLabel(count: number) {
  return count === 1 ? "1 ubicada en este refugio" : `${count} ubicadas en este refugio`
}

function familyFoundLabel(count: number) {
  return count === 1 ? "1 localizada por familiar" : `${count} localizadas por familiares`
}

export function ShelterAccordion({
  shelter,
  query,
  onAddPerson,
  onUpdatePersonVerification,
}: {
  shelter: IShelter
  query: string
  onAddPerson: (shelterId: number, person: IShelterPersonDraft) => Promise<IShelterPerson>
  onUpdatePersonVerification: (personId: number, patch: VerificationPatch) => Promise<IShelterPerson>
}) {
  const [nationalId, setNationalId] = useState("")
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [savingKey, setSavingKey] = useState("")
  const [error, setError] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
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
  const shelterMatchesQuery = normalizedQuery ? shelterText.includes(normalizedQuery) : true
  const visiblePeople = useMemo(() => {
    if (!normalizedQuery || shelterMatchesQuery) return shelter.people
    return shelter.people.filter((person) => personMatches(person, normalizedQuery))
  }, [shelter.people, shelterMatchesQuery, normalizedQuery])
  const verifiedCount = shelter.people.filter((person) => person.verifiedInShelter).length
  const familyFoundCount = shelter.people.filter((person) => person.foundByFamily).length

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    const draft: IShelterPersonDraft = {
      nationalId: nationalId || undefined,
      name,
      age: age ? Number(age) : undefined,
      notes: notes.trim() || undefined,
    }

    try {
      setSubmitting(true)
      await onAddPerson(shelter.id, draft)
      setNationalId("")
      setName("")
      setAge("")
      setNotes("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar la persona refugiada.")
    } finally {
      setSubmitting(false)
    }
  }

  async function updateVerification(personId: number, key: keyof VerificationPatch, value: boolean) {
    const nextSavingKey = `${personId}-${key}`
    setSavingKey(nextSavingKey)
    setError("")

    try {
      await onUpdatePersonVerification(personId, { [key]: value })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la verificacion.")
    } finally {
      setSavingKey("")
    }
  }

  return (
    <details className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 transition-colors hover:bg-white/[0.03] xl:flex-row xl:items-center xl:justify-between [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Home className="size-5 shrink-0 text-emerald-300" aria-hidden="true" />
            <h2 className="truncate text-base font-semibold text-white">{shelter.name}</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {shelter.city}
            {shelter.state ? `, ${shelter.state}` : ""} - {shelter.address}
          </p>
          {shelter.notes && <p className="mt-2 line-clamp-2 text-sm text-[#cbd5e1]">{shelter.notes}</p>}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant="center" className="gap-1.5">
            <UsersRound className="size-3.5" />
            {peopleCountLabel(shelter.people.length)}
          </Badge>
          <Badge variant="found" className="gap-1.5">
            <ShieldCheck className="size-3.5" />
            {shelterVerifiedLabel(verifiedCount)}
          </Badge>
          <Badge variant="default" className="gap-1.5 bg-emerald-950 text-emerald-200">
            <CheckCircle2 className="size-3.5" />
            {familyFoundLabel(familyFoundCount)}
          </Badge>
          <ChevronDown className="size-5 text-[var(--muted-foreground)] transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t border-[var(--border)] p-4">
        {shelter.contactPhone && (
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            Contacto del refugio: <span className="font-medium text-white">{shelter.contactPhone}</span>
          </p>
        )}

        {visiblePeople.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
            No hay personas para mostrar en este refugio.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visiblePeople.map((person, index) => {
              const savingShelter = savingKey === `${person.id}-verifiedInShelter`
              const savingFamily = savingKey === `${person.id}-foundByFamily`

              return (
                <article key={person.id} className="rounded-lg border border-white/[0.04] bg-[#171717] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--muted-foreground)]">
                          {index + 1}-
                        </span>
                        <h3 className="text-sm font-semibold text-white">{person.name}</h3>
                        <Badge variant={person.verifiedInShelter ? "found" : "missing"}>
                          {person.verifiedInShelter ? "En refugio" : "Por verificar"}
                        </Badge>
                        {person.foundByFamily && <Badge variant="found">Familia lo localizo</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        Cedula:{" "}
                        <span className="font-medium text-white">
                          {person.nationalId ?? "Sin cedula registrada"}
                        </span>
                        {person.age !== undefined && ` - ${person.age} años`}
                      </p>
                      {person.notes && <p className="mt-2 text-sm text-[#cbd5e1]">{person.notes}</p>}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
                      <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm text-white">
                        <input
                          type="checkbox"
                          checked={person.verifiedInShelter}
                          disabled={savingShelter || savingFamily}
                          onChange={(e) =>
                            void updateVerification(person.id, "verifiedInShelter", e.target.checked)
                          }
                          className="size-4 accent-green-500"
                        />
                        <span className="flex flex-col">
                          Verificado en refugio
                          {person.verifiedAt && (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {formatDate(person.verifiedAt)}
                            </span>
                          )}
                        </span>
                        {savingShelter && <Loader2 className="ml-auto size-4 animate-spin" />}
                      </label>

                      <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm text-white">
                        <input
                          type="checkbox"
                          checked={person.foundByFamily}
                          disabled={savingShelter || savingFamily}
                          onChange={(e) =>
                            void updateVerification(person.id, "foundByFamily", e.target.checked)
                          }
                          className="size-4 accent-green-500"
                        />
                        <span className="flex flex-col">
                          Familiar lo localizo
                          {person.familyFoundAt && (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {formatDate(person.familyFoundAt)}
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
            <UserPlus className="size-4 text-emerald-300" aria-hidden="true" />
            Agregar persona a este refugio
          </div>

          <fieldset disabled={submitting} className="m-0 grid gap-3 border-0 p-0 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`shelter-person-id-${shelter.id}`}>Cedula (opcional)</Label>
              <Input
                id={`shelter-person-id-${shelter.id}`}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 12))}
                inputMode="numeric"
                pattern="[0-9]{5,12}"
                placeholder="Solo si esta disponible"
              />
            </div>

            <div className="flex flex-col gap-2 lg:col-span-2">
              <Label htmlFor={`shelter-person-name-${shelter.id}`}>Nombre completo</Label>
              <Input
                id={`shelter-person-name-${shelter.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Nombre y apellido"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`shelter-person-age-${shelter.id}`}>Edad (opcional)</Label>
              <Input
                id={`shelter-person-age-${shelter.id}`}
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
                inputMode="numeric"
                placeholder="35"
              />
            </div>

            <div className="flex flex-col gap-2 lg:col-span-4">
              <Label htmlFor={`shelter-person-notes-${shelter.id}`}>Notas (opcional)</Label>
              <Textarea
                id={`shelter-person-notes-${shelter.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Area del refugio, condicion reportada, referencia..."
              />
            </div>
          </fieldset>

          {error && <p className="mt-3 text-sm font-medium text-red-400">{error}</p>}

          <Button type="submit" className="mt-3 w-full gap-2" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            {submitting ? "Agregando..." : "Agregar persona"}
          </Button>
        </form>
      </div>
    </details>
  )
}
