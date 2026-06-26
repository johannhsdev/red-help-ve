import { useState, type ChangeEvent, type FormEvent } from "react"
import { ImagePlus, Loader2, LocateFixed, Plus, Search } from "lucide-react"
import { Dialog } from "./ui/Dialog"
import { Button } from "./ui/Button"
import { Input, Label, Textarea } from "./ui/Input"
import { LocationMap, type MapPoint } from "./LocationMap"
import { ImageCropDialog } from "./ImageCropDialog"
import type { AffectedSite, AffectedSiteDraft, AffectedSiteUrgency } from "../types/registry"
import { geocodeVenezuelaReference } from "../lib/geocoding"

const urgencyOptions: { value: AffectedSiteUrgency; label: string }[] = [
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
  { value: "low", label: "Baja" },
]

function optionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim()
  if (!raw) return undefined
  return Number(raw)
}

export function AffectedSiteDialog({
  onAdd,
}: {
  onAdd: (site: AffectedSiteDraft, photoFile: File) => Promise<AffectedSite>
}) {
  const [open, setOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [address, setAddress] = useState("")
  const [location, setLocation] = useState<MapPoint | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [searchingAddress, setSearchingAddress] = useState(false)
  const [error, setError] = useState("")
  const isBusy = submitting || locating || searchingAddress

  function reset() {
    setPhotoUrl("")
    setPhotoFile(null)
    setCropFile(null)
    setAddress("")
    setLocation(null)
    setError("")
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropFile(file)
  }

  function useCurrentLocation() {
    setError("")
    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener la ubicacion actual.")
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocating(false)
      },
      () => {
        setError("No se pudo obtener tu ubicacion. Marca el punto manualmente en el mapa.")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function searchAddressOnMap() {
    const query = address.trim()
    if (!query) {
      setError("Escribe una direccion o referencia para buscar en el mapa.")
      return
    }

    setError("")
    setSearchingAddress(true)

    try {
      const point = await geocodeVenezuelaReference(query)
      if (!point) {
        setError("No se encontro una referencia aproximada. Prueba con sector, ciudad y estado, o marca el pin manualmente.")
        return
      }

      setLocation(point)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo buscar la direccion.")
    } finally {
      setSearchingAddress(false)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (!photoFile) {
      setError("Por favor sube una foto del lugar.")
      return
    }
    if (!location) {
      setError("Marca la ubicacion del lugar en el mapa.")
      return
    }

    const form = new FormData(e.currentTarget)
    const urgency = String(form.get("urgency") || "medium") as AffectedSiteUrgency
    const draft: AffectedSiteDraft = {
      name: String(form.get("name") || "").trim(),
      description: String(form.get("description") || "").trim() || undefined,
      address: address.trim(),
      latitude: location.latitude,
      longitude: location.longitude,
      familiesCount: optionalNumber(form.get("familiesCount")),
      peopleCount: optionalNumber(form.get("peopleCount")),
      needs: String(form.get("needs") || "").trim(),
      urgency,
      contactName: String(form.get("contactName") || "").trim() || undefined,
      contactPhone: String(form.get("contactPhone") || "").trim() || undefined,
    }

    try {
      setSubmitting(true)
      await onAdd(draft, photoFile)
      setOpen(false)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la zona afectada.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant="primary"
        size="md"
        className="h-8 min-h-8 gap-2 rounded-full bg-[#f4f4f5] px-3.5 py-1.5 text-sm font-medium text-[#18181b] hover:bg-white"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Registrar zona
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          if (submitting) return
          setOpen(false)
          reset()
        }}
        title="Nueva zona afectada"
        description="Busca una referencia aproximada o marca el punto manualmente en el mapa."
        className="sm:!max-w-5xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <fieldset disabled={isBusy} className="m-0 grid gap-4 border-0 p-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Foto del lugar</Label>
                <label
                  htmlFor="affected-photo"
                  className={`flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/40 transition-colors hover:bg-[var(--muted)] ${
                    isBusy ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                  }`}
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="Vista previa" className="aspect-video w-full object-cover" />
                  ) : (
                    <span className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <ImagePlus className="size-6" />
                      Toca para subir una foto
                    </span>
                  )}
                </label>
                <input
                  id="affected-photo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFile}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="affected-name">Nombre del lugar</Label>
                <Input id="affected-name" name="name" required placeholder="Ej: Familias del sector La Playa" />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="affected-address">Dirección o referencia</Label>
                <div className="flex gap-2">
                  <Input
                    id="affected-address"
                    name="address"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Sector, ciudad, estado..."
                  />
                  <button
                    type="button"
                    onClick={searchAddressOnMap}
                    className="tertiary_button min-h-10 shrink-0 gap-1.5 rounded-[var(--radius)] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {searchingAddress ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                    Buscar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="familiesCount">Familias</Label>
                  <Input id="familiesCount" name="familiesCount" type="number" min="0" placeholder="12" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="peopleCount">Personas</Label>
                  <Input id="peopleCount" name="peopleCount" type="number" min="0" placeholder="45" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Ubicación en mapa</Label>
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    className="tertiary_button min-h-8 gap-1.5 rounded-full px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {locating ? <Loader2 className="size-3.5 animate-spin" /> : <LocateFixed className="size-3.5" />}
                    Usar mi ubicación
                  </button>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Para mayor precisión, escribe sector + ciudad + estado. Si no aparece, haz zoom y marca el pin manualmente.
                </p>
                <LocationMap value={location} onChange={setLocation} className="h-72" />
                {location && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Pin marcado. Puedes arrastrarlo para ajustar la ubicación.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="urgency">Urgencia</Label>
                <select id="urgency" name="urgency" defaultValue="medium" className="select_rhve__form">
                  {urgencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:col-span-2">
              <Label htmlFor="needs">¿Qué necesitan?</Label>
              <Textarea id="needs" name="needs" required placeholder="Agua, comida, medicinas, colchonetas..." />
            </div>

            <div className="flex flex-col gap-2 lg:col-span-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea id="description" name="description" placeholder="Cuántas viviendas fueron afectadas, condiciones del lugar, observaciones..." />
            </div>

            <div className="grid gap-3 lg:col-span-2 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactName">Contacto responsable (opcional)</Label>
                <Input id="contactName" name="contactName" placeholder="Nombre de referencia" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactPhone">Teléfono (opcional)</Label>
                <Input id="contactPhone" name="contactPhone" inputMode="tel" placeholder="+58 412-000-0000" />
              </div>
            </div>
          </fieldset>

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isBusy}>
            {submitting ? "Guardando..." : "Guardar zona afectada"}
          </Button>
        </form>
      </Dialog>

      <ImageCropDialog
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onApply={(file, previewUrl) => {
          setPhotoFile(file)
          setPhotoUrl(previewUrl)
          setCropFile(null)
        }}
      />
    </>
  )
}
