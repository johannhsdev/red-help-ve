import { useEffect, useState } from "react"
import { AlertTriangle, ExternalLink, Home, MapPin, Maximize2, Phone, UsersRound, X } from "lucide-react"
import type { IAffectedSite, IAffectedSiteUrgency } from "../../../Interfaces/IAffectedSite"
import { Badge } from "../../../components/ui/Badge"

const urgencyLabel: Record<IAffectedSiteUrgency, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
}

const urgencyClass: Record<IAffectedSiteUrgency, string> = {
  low: "border-sky-700/50 bg-sky-950/50 text-sky-200",
  medium: "border-amber-700/50 bg-amber-950/50 text-amber-200",
  high: "border-orange-700/50 bg-orange-950/50 text-orange-200",
  critical: "border-red-700/50 bg-red-950/60 text-red-200",
}

export function AffectedSiteCard({ site }: { site: IAffectedSite }) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`
  const [imageOpen, setImageOpen] = useState(false)
  const photoSrc = site.photoUrl || "/placeholder.svg"

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
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#201516]">
          <img
            src={photoSrc}
            alt={`Foto de ${site.name}`}
            className="size-full object-cover"
            loading="lazy"
          />
          <button
            type="button"
            onClick={() => setImageOpen(true)}
            aria-label={`Ver foto completa de ${site.name}`}
            title="Ver foto completa"
            className="absolute inset-0 cursor-pointer border-0 bg-transparent p-0"
          />
          <div className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-white shadow-lg ring-1 ring-white/15">
            <Maximize2 className="size-3.5" aria-hidden="true" />
            Abrir foto
          </div>
          <div className="pointer-events-none absolute left-3 top-3">
            <Badge className="rounded-md bg-red-700 px-2 py-1 text-[11px] font-extrabold text-white shadow-sm">
              Zona afectada
            </Badge>
          </div>
          <div className={`pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold shadow-lg ${urgencyClass[site.urgency]}`}>
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            {urgencyLabel[site.urgency]}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-4 py-5">
          <h3 className="text-pretty text-xl font-extrabold leading-tight text-white">{site.name}</h3>

          <div className="flex flex-col gap-2 text-sm text-[#c7cbd1]">
            <span className="flex items-start gap-2">
              <MapPin className="size-4 shrink-0 translate-y-0.5 text-[#aab0b8]" aria-hidden="true" />
              {site.address}
            </span>
            {(site.familiesCount !== undefined || site.peopleCount !== undefined) && (
              <span className="flex items-center gap-2">
                <UsersRound className="size-4 shrink-0 text-[#aab0b8]" aria-hidden="true" />
                {site.familiesCount !== undefined && `${site.familiesCount} familias`}
                {site.familiesCount !== undefined && site.peopleCount !== undefined && " / "}
                {site.peopleCount !== undefined && `${site.peopleCount} personas`}
              </span>
            )}
            {site.contactPhone && (
              <a
                href={`tel:${site.contactPhone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 font-extrabold text-white hover:underline"
              >
                <Phone className="size-4 shrink-0 text-[#aab0b8]" aria-hidden="true" />
                {site.contactName ? `${site.contactName}: ` : ""}
                {site.contactPhone}
              </a>
            )}
          </div>

          <div className="mt-1 rounded-lg bg-[#262626] px-3 py-3 text-sm text-white">
            <div className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[#aeb4bd]">
              <Home className="size-4 shrink-0" aria-hidden="true" />
              Necesitan ayuda
            </div>
            <p className="line-clamp-3 text-pretty leading-snug">{site.needs}</p>
            {site.description && (
              <p className="mt-2 line-clamp-3 text-pretty text-[#d7dce3]">{site.description}</p>
            )}
          </div>
        </div>

        <div className="border-t border-[#303033] px-4 py-4">
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="tertiary_button w-full px-3 py-1.5 text-sm"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Abrir ubicación
          </a>
        </div>
      </article>

      {imageOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto completa de ${site.name}`}
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
              alt={`Foto completa de ${site.name}`}
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
