import { useEffect, useState } from "react"
import {
  Phone, User, Calendar, IdCard,
  RotateCcw, Home, Building2, Maximize2, X, Loader2, Share2, MapPin,
} from "lucide-react"
import { Badge } from "../../../components/ui/Badge"
import { Button } from "../../../components/ui/Button"
import { shareMissingPerson } from "../../../lib/missingPersonShare"
import type { MissingPerson } from "../../../types/registry"
import type { IFoundInfo, IMissingPerson } from "../../../Interfaces/IMissingPerson"

function ContactList({ contacts }: { contacts: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      {contacts.map((c) => (
        <a
          key={c}
          href={`tel:${c.replace(/\s/g, "")}`}
          className="flex min-h-7 items-center gap-2 text-sm font-extrabold text-white hover:underline"
        >
          <Phone className="size-3.5 shrink-0 text-[#d5d9df]" aria-hidden="true" />
          {c}
        </a>
      ))}
    </div>
  )
}

function foundSummary(info: IFoundInfo | undefined): string {
  if (!info || info.kind === "family") return "Está con sus familiares"
  return `Está en el centro: ${info.centerName}`
}

interface Props {
  person: IMissingPerson
  onReportFound: (person: IMissingPerson) => void
  onReopen: (id: number) => void
}

export function MissingPersonCard({ person, onReportFound, onReopen }: Props) {
  const isFound = person.status === "found"
  const [imageOpen, setImageOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const photoSrc = person.photoUrl || "/placeholder.svg"

  useEffect(() => {
    if (!imageOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setImageOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
    }
  }, [imageOpen])

  async function handleShare() {
    if (person.status !== "missing") return
    setSharing(true)
    try {
      await shareMissingPerson(person as unknown as MissingPerson)
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      <article className="flex flex-col overflow-hidden rounded-2xl bg-[#151515] ring-1 ring-[#2a2a2d] transition-shadow hover:shadow-lg hover:shadow-black/30">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--muted)]">
          <img src={photoSrc} alt={`Foto de ${person.name}`} className="size-full object-cover" loading="lazy" />
          <button
            type="button"
            onClick={() => setImageOpen(true)}
            aria-label={`Ver foto completa de ${person.name}`}
            title="Ver foto completa"
            className="absolute inset-0 cursor-pointer border-0 bg-transparent p-0"
          />
          <div className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-white shadow-lg ring-1 ring-white/15">
            <Maximize2 className="size-3.5" aria-hidden="true" />
            Abrir foto
          </div>
          <div className="pointer-events-none absolute left-3 top-3">
            <Badge
              variant={isFound ? "found" : "missing"}
              className={isFound ? "" : "rounded-md bg-black/85 px-2 py-1 text-[11px] shadow-sm"}
            >
              {isFound ? "Persona encontrada" : "Persona desaparecida"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-4 py-5">
          <h3 className="text-pretty text-xl font-extrabold leading-tight text-white">{person.name}</h3>

          <div className="flex flex-col gap-2 text-sm text-[#c7cbd1]">
            {person.cedula && (
              <span className="flex items-center gap-2">
                <IdCard className="size-4 shrink-0 text-[#aab0b8]" aria-hidden="true" />
                v-{person.cedula.replace(/^v-?/i, "")}
              </span>
            )}
            {person.age && (
              <span className="flex items-center gap-2">
                <Calendar className="size-4 shrink-0 text-[#aab0b8]" aria-hidden="true" />
                {person.age} años
              </span>
            )}
            <span className="flex items-center gap-2">
              <Home className="size-4 shrink-0 text-[#aab0b8]" aria-hidden="true" />
              <span><strong className="font-extrabold text-white">Vive en:</strong> {person.location}</span>
            </span>
            <span className="flex items-start gap-2">
              <User className="size-4 shrink-0 translate-y-0.5 text-[#aab0b8]" aria-hidden="true" />
              Contacto: {person.contactName}
            </span>
          </div>

          {person.notes && (
            <div className="mt-1 rounded-lg bg-[#262626] px-3 py-3 text-sm text-white">
              <div className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[#aeb4bd]">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                Visto por última vez
              </div>
              <p className="line-clamp-3 text-pretty leading-snug">{person.notes}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#303033] px-4 py-4">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[#aeb4bd]">Contactos de emergencia</p>
            <ContactList contacts={person.contacts} />
          </div>

          {isFound ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2 rounded-md border border-green-800/40 bg-green-950/50 p-2.5">
                {person.foundInfo?.kind === "family" ? (
                  <Home className="mt-0.5 size-4 shrink-0 text-green-400" aria-hidden="true" />
                ) : (
                  <Building2 className="mt-0.5 size-4 shrink-0 text-green-400" aria-hidden="true" />
                )}
                <div className="text-sm leading-snug">
                  <p className="font-medium text-green-300">{foundSummary(person.foundInfo)}</p>
                  {person.foundInfo?.kind === "external_center" && person.foundInfo.centerLocation && (
                    <p className="text-xs text-green-400/80">{person.foundInfo.centerLocation}</p>
                  )}
                  {person.foundInfo?.kind === "external_center" && (
                    <p className="mt-0.5 text-xs text-green-500/70">Centro no registrado (informativo)</p>
                  )}
                </div>
              </div>
              <Button
                variant="tertiary"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => onReopen(person.id)}
                aria-label={`Corregir: marcar a ${person.name} como desaparecida nuevamente`}
              >
                <RotateCcw className="size-4" />
                Sigue desaparecida (revertir)
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                size="sm"
                className="h-8 min-h-8 w-full gap-1.5 rounded-lg !bg-[#0ea66f] text-sm font-extrabold hover:!bg-[#0b8f60]"
                onClick={() => onReportFound(person)}
                aria-label={`Reportar que ${person.name} ya fue encontrada`}
              >
                <Building2 className="size-4" />
                Reportar que ya fue encontrada
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="h-8 min-h-8 w-full gap-1.5 rounded-lg bg-[#25d366] text-sm font-extrabold text-white hover:bg-[#1fb857]"
                onClick={handleShare}
                disabled={sharing}
                aria-label={`Compartir por WhatsApp la tarjeta de ${person.name}`}
              >
                {sharing ? (
                  <Loader2 className="size-4 animate-spin text-white" aria-hidden="true" />
                ) : (
                  <Share2 className="size-4 text-white" aria-hidden="true" />
                )}
                {sharing ? "Preparando tarjeta..." : "Compartir por WhatsApp"}
              </Button>
            </div>
          )}
        </div>
      </article>

      {imageOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto completa de ${person.name}`}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-out border-0 bg-transparent p-0"
            onClick={() => setImageOpen(false)}
            aria-label="Cerrar visor de imagen"
          />
          <div className="relative z-10 flex max-h-[92dvh] max-w-[94vw] items-center justify-center">
            <img
              src={photoSrc}
              alt={`Foto completa de ${person.name}`}
              className="max-h-[92dvh] max-w-[94vw] rounded-lg object-contain shadow-2xl ring-1 ring-white/15"
            />
            <button
              type="button"
              onClick={() => setImageOpen(false)}
              aria-label="Cerrar"
              className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full border-0 bg-black/75 p-0 text-white shadow-lg ring-1 ring-white/20 transition-colors hover:bg-black"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
