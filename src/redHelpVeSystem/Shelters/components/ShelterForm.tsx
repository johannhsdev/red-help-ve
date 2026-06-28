import { useState, type FormEvent } from "react"
import { Loader2, LocateFixed, Plus, Search } from "lucide-react"
import type { IShelter, IShelterDraft } from "../../../Interfaces/IShelter"
import { geocodeVenezuelaReference } from "../../../lib/geocoding"
import { Button } from "../../../components/ui/Button"
import { Dialog } from "../../../components/ui/Dialog"
import { Input, Label, Textarea } from "../../../components/ui/Input"
import { LocationMap, type MapPoint } from "../../../components/LocationMap"

export function ShelterForm({
  onAdd,
}: {
  onAdd: (shelter: IShelterDraft) => Promise<IShelter>
}) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState("")
  const [location, setLocation] = useState<MapPoint | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [searchingAddress, setSearchingAddress] = useState(false)
  const [error, setError] = useState("")
  const isBusy = submitting || locating || searchingAddress

  function reset() {
    setAddress("")
    setLocation(null)
    setError("")
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

    if (!location) {
      setError("Marca la ubicacion del refugio en el mapa.")
      return
    }

    const formElement = e.currentTarget
    const form = new FormData(formElement)
    const draft: IShelterDraft = {
      name: String(form.get("name") || "").trim(),
      city: String(form.get("city") || "").trim(),
      state: String(form.get("state") || "").trim() || undefined,
      address: address.trim(),
      latitude: location.latitude,
      longitude: location.longitude,
      contactPhone: String(form.get("contactPhone") || "").trim() || undefined,
      notes: String(form.get("notes") || "").trim() || undefined,
    }

    try {
      setSubmitting(true)
      await onAdd(draft)
      formElement.reset()
      setOpen(false)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el refugio.")
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
        Registrar refugio
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          if (submitting) return
          setOpen(false)
          reset()
        }}
        title="Nuevo refugio"
        description="Busca una referencia aproximada o marca el punto manualmente en el mapa."
        className="sm:!max-w-5xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <fieldset disabled={isBusy} className="m-0 grid gap-4 border-0 p-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="shelter-name">Nombre del refugio</Label>
                <Input id="shelter-name" name="name" required placeholder="Refugio comunitario" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="shelter-city">Ciudad</Label>
                  <Input id="shelter-city" name="city" required placeholder="Caracas" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="shelter-state">Estado (opcional)</Label>
                  <Input id="shelter-state" name="state" placeholder="Distrito Capital" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="shelter-address">Direccion o referencia</Label>
                <div className="flex gap-2">
                  <Input
                    id="shelter-address"
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

              <div className="flex flex-col gap-2">
                <Label htmlFor="shelter-phone">Telefono de contacto (opcional)</Label>
                <Input id="shelter-phone" name="contactPhone" inputMode="tel" placeholder="+58 412-000-0000" />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="shelter-notes">Notas (opcional)</Label>
                <Textarea id="shelter-notes" name="notes" placeholder="Capacidad, responsables, condiciones del lugar..." />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Ubicacion en mapa</Label>
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    className="tertiary_button min-h-8 gap-1.5 rounded-full px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {locating ? <Loader2 className="size-3.5 animate-spin" /> : <LocateFixed className="size-3.5" />}
                    Usar mi ubicacion
                  </button>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Escribe sector + ciudad + estado. Si no aparece, haz zoom y marca el pin manualmente.
                </p>
                <LocationMap value={location} onChange={setLocation} className="h-80" />
                {location && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Pin marcado. Puedes arrastrarlo para ajustar la ubicacion.
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isBusy}>
            {submitting ? "Guardando..." : "Guardar refugio"}
          </Button>
        </form>
      </Dialog>
    </>
  )
}
