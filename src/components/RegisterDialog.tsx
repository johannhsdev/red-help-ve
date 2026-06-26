import { useState, type ChangeEvent, type FormEvent } from "react"
import { ImagePlus, Loader2, LocateFixed, Plus, Search, X } from "lucide-react"
import { Dialog } from "./ui/Dialog"
import { Button } from "./ui/Button"
import { Input, Label, Textarea } from "./ui/Input"
import { LocationMap, type MapPoint } from "./LocationMap"
import { ImageCropDialog } from "./ImageCropDialog"
import type { RecordType, RegistryDraft, RegistryRecord } from "../types/registry"
import { geocodeVenezuelaReference } from "../lib/geocoding"

export function RegisterDialog({
  onAdd,
  initialType = "persons",
  lockType = false,
  label = "Registrar",
}: {
  onAdd: (record: RegistryDraft, photoFile: File) => Promise<RegistryRecord>
  initialType?: RecordType
  lockType?: boolean
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<RecordType>(initialType)
  const [photoUrl, setPhotoUrl] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [centerAddress, setCenterAddress] = useState("")
  const [centerLocation, setCenterLocation] = useState<MapPoint | null>(null)
  const [locating, setLocating] = useState(false)
  const [searchingAddress, setSearchingAddress] = useState(false)
  const [contacts, setContacts] = useState<string[]>([""])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const isBusy = submitting || uploading || locating || searchingAddress

  function reset() {
    setType(initialType)
    setPhotoUrl("")
    setPhotoFile(null)
    setCropFile(null)
    setCenterAddress("")
    setCenterLocation(null)
    setContacts([""])
    setError("")
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setCropFile(file)
    setUploading(false)
  }

  function updateContact(index: number, value: string) {
    setContacts((prev) => prev.map((c, i) => (i === index ? value : c)))
  }

  function handleTypeChange(nextType: RecordType) {
    setType(nextType)
    setError("")
  }

  async function searchCenterAddressOnMap() {
    const query = centerAddress.trim()
    if (!query) {
      setError("Escribe la ubicacion del centro para buscar en el mapa.")
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

      setCenterLocation(point)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo buscar la ubicacion.")
    } finally {
      setSearchingAddress(false)
    }
  }

  function useCurrentCenterLocation() {
    setError("")
    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener la ubicacion actual.")
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenterLocation({
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const form = new FormData(e.currentTarget)
    const cleanContacts = contacts.map((c) => c.trim()).filter(Boolean)

    if (!photoFile) {
      setError("Por favor sube una foto.")
      return
    }
    if (type === "persons" && cleanContacts.length === 0) {
      setError("Agrega al menos un número de contacto.")
      return
    }

    setSubmitting(true)
    const base = {
      name: String(form.get("name") || "").trim(),
      location: type === "centers" ? centerAddress.trim() : String(form.get("location") || "").trim(),
      contacts: cleanContacts,
    }

    let record: RegistryDraft
    if (type === "persons") {
      record = {
        ...base,
        type: "persons",
        cedula: String(form.get("cedula") || "").trim(),
        age: String(form.get("age") || "").trim(),
        contactName: String(form.get("contactName") || "").trim(),
        notes: String(form.get("notes") || "").trim() || undefined,
        status: "missing",
      }
    } else {
      record = {
        ...base,
        type: "centers",
        organization: String(form.get("organization") || "").trim() || undefined,
        needs: String(form.get("needs") || "").trim(),
        schedule: String(form.get("schedule") || "").trim() || undefined,
        latitude: centerLocation?.latitude,
        longitude: centerLocation?.longitude,
      }
    }

    try {
      await onAdd(record, photoFile)
      setOpen(false)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el registro.")
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
        {label}
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          if (isBusy) return
          setOpen(false)
          reset()
        }}
        title="Nuevo registro"
        description={
          type === "centers"
            ? "Busca una referencia aproximada o marca el punto manualmente en el mapa."
            : "Completa la información. Los datos se publicarán en la red de ayuda."
        }
        className={type === "centers" ? "sm:!max-w-5xl" : "sm:max-w-lg"}
      >
        {!lockType && (
          <div className="grid grid-cols-2 gap-2 mt-2 mb-4">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleTypeChange("persons")}
              className={`rounded-lg border p-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                type === "persons"
                  ? "border-[var(--status-missing)] bg-[var(--status-missing)]/10 text-orange-300 ring-1 ring-[var(--status-missing)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              Persona desaparecida
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleTypeChange("centers")}
              className={`rounded-lg border p-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                type === "centers"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              Centro de acopio
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <fieldset
            disabled={isBusy}
            className={`m-0 border-0 p-0 ${
              type === "centers" ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "flex flex-col gap-4"
            }`}
          >
            {/* Photo upload */}
            <div className="flex flex-col gap-2">
              <Label>Foto</Label>
              <label
                htmlFor="photo"
                className={`flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/40 transition-colors hover:bg-[var(--muted)] ${
                  isBusy ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                }`}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Vista previa"
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <span className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
                    {uploading ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
                    {uploading ? "Procesando..." : "Toca para subir una foto"}
                  </span>
                )}
              </label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFile}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{type === "persons" ? "Nombre completo" : "Nombre del centro"}</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder={type === "persons" ? "Ej: Juan Pérez" : "Ej: Centro Cruz Comunitaria"}
              />
            </div>

            {type === "persons" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="cedula">Cédula (opcional)</Label>
                    <Input id="cedula" name="cedula" placeholder="V-12.345.678" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="age">Edad (opcional)</Label>
                    <Input id="age" name="age" type="number" min="0" placeholder="35" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="location">Dirección o zona donde vive</Label>
                  <Input id="location" name="location" required placeholder="Ej: El Limón, Maracay" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="contactName">Familiar que registra</Label>
                  <Input id="contactName" name="contactName" required placeholder="Nombre y parentesco" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="notes">Visto por última vez (opcional)</Label>
                  <Textarea id="notes" name="notes" placeholder="Ej: Visto en la iglesia. Vestía suéter rosado." />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="organization">Organización (opcional)</Label>
                  <Input id="organization" name="organization" placeholder="Junta vecinal, ONG..." />
                </div>
                <div className="flex flex-col gap-2 lg:col-span-2">
                  <Label htmlFor="location">Ubicación del centro</Label>
                  <div className="flex gap-2">
                    <Input
                      id="location"
                      name="location"
                      required
                      value={centerAddress}
                      onChange={(e) => setCenterAddress(e.target.value)}
                      placeholder="Sector, ciudad, estado..."
                    />
                    <button
                      type="button"
                      onClick={searchCenterAddressOnMap}
                      className="tertiary_button min-h-10 shrink-0 gap-1.5 rounded-[var(--radius)] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {searchingAddress ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                      Buscar
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Escribe sector + ciudad + estado para mayor precisión.
                    </p>
                    <button
                      type="button"
                      onClick={useCurrentCenterLocation}
                      className="tertiary_button min-h-8 shrink-0 gap-1.5 rounded-full px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {locating ? <Loader2 className="size-3.5 animate-spin" /> : <LocateFixed className="size-3.5" />}
                      Usar mi ubicación
                    </button>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Si la búsqueda no encuentra el lugar, haz zoom y marca el pin manualmente en el mapa.
                  </p>
                  <LocationMap value={centerLocation} onChange={setCenterLocation} className="h-72" />
                  {centerLocation && (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Pin marcado. Puedes arrastrarlo para ajustar la ubicación.
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 lg:col-span-2">
                  <Label htmlFor="needs">¿Qué se necesita / cómo colaborar?</Label>
                  <Textarea id="needs" name="needs" required placeholder="Agua, alimentos, voluntarios..." />
                </div>
                <div className="flex flex-col gap-2 lg:col-span-2">
                  <Label htmlFor="schedule">Horario (opcional)</Label>
                  <Input id="schedule" name="schedule" placeholder="Lun a sáb, 8AM - 6PM" />
                </div>
              </>
            )}

            {/* Contacts */}
            <div className={`flex flex-col gap-2 ${type === "centers" ? "lg:col-span-2" : ""}`}>
              <Label>{type === "persons" ? "Números de contacto de emergencia" : "Números de contacto (opcional)"}</Label>
              {contacts.map((contact, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={contact}
                    onChange={(e) => updateContact(i, e.target.value)}
                    placeholder="+58 412-000-0000"
                    inputMode="tel"
                  />
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setContacts((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Quitar número"
                      className="shrink-0 rounded-md p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setContacts((prev) => [...prev, ""])}
                className="tertiary_button w-fit gap-1.5 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="size-3.5" />
                Agregar otro número
              </button>
            </div>
          </fieldset>

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isBusy}
          >
            {submitting ? "Guardando..." : "Guardar registro"}
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
