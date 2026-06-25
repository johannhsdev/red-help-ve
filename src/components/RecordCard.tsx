import { useEffect, useState } from "react"
import {
  MapPin, Phone, User, Calendar, IdCard,
  Package, Clock, RotateCcw, Home, Building2, Maximize2, X,
} from "lucide-react"
import { Badge } from "./ui/Badge"
import { Button } from "./ui/Button"
import { FoundDialog } from "./FoundDialog"
import type { RegistryRecord, FoundInfo, SupplyCenter } from "../types/registry"

function ContactList({ contacts, prominent = false }: { contacts: string[]; prominent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      {contacts.map((c) => (
        <a
          key={c}
          href={`tel:${c.replace(/\s/g, "")}`}
          className={`flex min-h-7 items-center gap-2 text-sm hover:underline ${
            prominent
              ? "font-extrabold text-white"
              : "font-medium text-[var(--primary)]"
          }`}
        >
          <Phone
            className={`size-3.5 shrink-0 ${prominent ? "text-[#d5d9df]" : ""}`}
            aria-hidden="true"
          />
          {c}
        </a>
      ))}
    </div>
  )
}

function foundSummary(info: FoundInfo | undefined): string {
  if (!info || info.kind === "family") return "Está con sus familiares"
  return `Está en el centro: ${info.centerName}`
}

interface RecordCardProps {
  record: RegistryRecord
  centers: SupplyCenter[]
  onReportFound: (id: number, info: FoundInfo) => void | Promise<void>
  onReopen: (id: number) => void | Promise<void>
}

export function RecordCard({ record, centers, onReportFound, onReopen }: RecordCardProps) {
  const isPerson = record.type === "persons"
  const isFound = isPerson && record.status === "found"
  const [imageOpen, setImageOpen] = useState(false)
  const photoSrc = record.photoUrl || "/placeholder.svg"

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

  return (
    <>
      <article className="flex flex-col overflow-hidden rounded-2xl bg-[#151515] ring-1 ring-[#2a2a2d] transition-shadow hover:shadow-lg hover:shadow-black/30">
        {/* Photo */}
        <div className={`relative w-full overflow-hidden ${isPerson ? "aspect-[4/3] bg-[var(--muted)]" : "aspect-[4/3] bg-[#1c2634]"}`}>
          <img
            src={photoSrc}
            alt={`Foto de ${record.name}`}
            className="size-full object-cover"
            loading="lazy"
          />
          <button
            type="button"
            onClick={() => setImageOpen(true)}
            aria-label={`Ver foto completa de ${record.name}`}
            title="Ver foto completa"
            className="absolute inset-0 cursor-pointer border-0 bg-transparent p-0"
          />
          <div className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-white shadow-lg ring-1 ring-white/15">
            <Maximize2 className="size-3.5" aria-hidden="true" />
            Abrir foto
          </div>
          <div className="pointer-events-none absolute left-3 top-3">
            <Badge
              variant={!isPerson ? "center" : isFound ? "found" : "missing"}
              className={
                !isPerson
                  ? "rounded-full bg-[#f1f5f9] px-3 py-1 text-xs font-extrabold text-[#0f172a] shadow-sm"
                  : isFound
                    ? ""
                    : "rounded-md bg-black/85 px-2 py-1 text-[11px] shadow-sm"
              }
            >
              {!isPerson ? "Centro de acopio" : isFound ? "Persona encontrada" : "Persona desaparecida"}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className={`flex flex-1 flex-col gap-3 px-4 ${isPerson ? "py-5" : "py-7"}`}>
          <h3 className={`text-pretty font-extrabold leading-tight text-white ${isPerson ? "text-xl" : "text-xl uppercase"}`}>
            {isPerson ? record.name : record.name.toUpperCase()}
          </h3>

          <div className="flex flex-col gap-2 text-sm text-[#c7cbd1]">
            {isPerson ? (
              <>
                {record.cedula && (
                  <span className="flex items-center gap-2">
                    <IdCard className="size-4 shrink-0 text-[#aab0b8]" aria-hidden="true" />
                    v-{record.cedula.replace(/^v-?/i, "")}
                  </span>
                )}
                {record.age && (
                  <span className="flex items-center gap-2">
                    <Calendar className="size-4 shrink-0 text-[#aab0b8]" aria-hidden="true" />
                    {record.age} años
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Home className="size-4 shrink-0 text-[#aab0b8]" aria-hidden="true" />
                  <span><strong className="font-extrabold text-white">Vive en:</strong> {record.location}</span>
                </span>
                <span className="flex items-start gap-2">
                  <User className="size-4 shrink-0 translate-y-0.5 text-[#aab0b8]" aria-hidden="true" />
                  Contacto: {record.contactName}
                </span>
              </>
            ) : (
              <>
                {record.organization && (
                  <span className="flex items-center gap-2">
                    <User className="size-4 shrink-0 text-[#aab0b8]" aria-hidden="true" />
                    {record.organization}
                  </span>
                )}
                <span className="flex items-start gap-2">
                  <MapPin className="size-4 shrink-0 translate-y-0.5 text-[#aab0b8]" aria-hidden="true" />
                  {record.location}
                </span>
                <span className="flex items-start gap-2">
                  <Package className="size-4 shrink-0 translate-y-0.5 text-[#aab0b8]" aria-hidden="true" />
                  {record.needs}
                </span>
                {record.schedule && (
                  <span className="flex items-center gap-2">
                    <Clock className="size-4 shrink-0 text-[#aab0b8]" aria-hidden="true" />
                    {record.schedule}
                  </span>
                )}
              </>
            )}
          </div>

          {isPerson && record.notes && (
            <div className="mt-1 rounded-lg bg-[#262626] px-3 py-3 text-sm text-white">
              <div className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[#aeb4bd]">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                Visto por última vez
              </div>
              <p className="line-clamp-3 text-pretty leading-snug">{record.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-[#303033] px-4 py-4">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[#aeb4bd]">
              {isPerson ? "Contactos de emergencia" : "Cómo colaborar"}
            </p>
            <ContactList contacts={record.contacts} prominent />
          </div>

          {isPerson && (
            isFound ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2 rounded-md bg-green-950/50 border border-green-800/40 p-2.5">
                  {record.foundInfo?.kind === "family" ? (
                    <Home className="mt-0.5 size-4 shrink-0 text-green-400" aria-hidden="true" />
                  ) : (
                    <Building2 className="mt-0.5 size-4 shrink-0 text-green-400" aria-hidden="true" />
                  )}
                  <div className="text-sm leading-snug">
                    <p className="font-medium text-green-300">{foundSummary(record.foundInfo)}</p>
                    {record.foundInfo?.kind === "external_center" && record.foundInfo.centerLocation && (
                      <p className="text-xs text-green-400/80">{record.foundInfo.centerLocation}</p>
                    )}
                    {record.foundInfo?.kind === "external_center" && (
                      <p className="mt-0.5 text-xs text-green-500/70">Centro no registrado (informativo)</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="tertiary"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => onReopen(record.id)}
                  aria-label={`Corregir: marcar a ${record.name} como desaparecida nuevamente`}
                >
                  <RotateCcw className="size-4" />
                  Sigue desaparecida (revertir)
                </Button>
              </div>
            ) : (
              <FoundDialog
                personName={record.name}
                centers={centers}
                onConfirm={(info) => onReportFound(record.id, info)}
              />
            )
          )}
        </div>
      </article>

      {imageOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto completa de ${record.name}`}
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
              alt={`Foto completa de ${record.name}`}
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
