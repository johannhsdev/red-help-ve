import { useState, type ChangeEvent, type FormEvent } from "react"
import { ImagePlus, Loader2, Plus, X } from "lucide-react"
import { Dialog } from "./ui/Dialog"
import { Button } from "./ui/Button"
import { Input, Label, Textarea } from "./ui/Input"
import type { RecordType, RegistryDraft, RegistryRecord } from "../types/registry"

export function RegisterDialog({
  onAdd,
}: {
  onAdd: (record: RegistryDraft, photoFile: File) => Promise<RegistryRecord>
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<RecordType>("persons")
  const [photoUrl, setPhotoUrl] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [contacts, setContacts] = useState<string[]>([""])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const isBusy = submitting || uploading

  function reset() {
    setType("persons")
    setPhotoUrl("")
    setPhotoFile(null)
    setContacts([""])
    setError("")
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const url = URL.createObjectURL(file)
    setPhotoUrl(url)
    setPhotoFile(file)
    setUploading(false)
  }

  function updateContact(index: number, value: string) {
    setContacts((prev) => prev.map((c, i) => (i === index ? value : c)))
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
    if (cleanContacts.length === 0) {
      setError("Agrega al menos un número de contacto.")
      return
    }

    setSubmitting(true)
    const base = {
      name: String(form.get("name") || "").trim(),
      location: String(form.get("location") || "").trim(),
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
        Registrar
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          if (isBusy) return
          setOpen(false)
          reset()
        }}
        title="Nuevo registro"
        description="Completa la información. Los datos se publicarán en la red de ayuda."
        className="sm:max-w-lg"
      >
        {/* Type selector */}
        <div className="grid grid-cols-2 gap-2 mt-2 mb-4">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setType("persons")}
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
            onClick={() => setType("centers")}
            className={`rounded-lg border p-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              type === "centers"
                ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            }`}
          >
            Centro de acopio
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <fieldset disabled={isBusy} className="m-0 flex flex-col gap-4 border-0 p-0">
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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="location">Ubicación del centro</Label>
                  <Input id="location" name="location" required placeholder="Dirección completa" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="needs">¿Qué se necesita / cómo colaborar?</Label>
                  <Textarea id="needs" name="needs" required placeholder="Agua, alimentos, voluntarios..." />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="schedule">Horario (opcional)</Label>
                  <Input id="schedule" name="schedule" placeholder="Lun a sáb, 8AM - 6PM" />
                </div>
              </>
            )}

            {/* Contacts */}
            <div className="flex flex-col gap-2">
              <Label>{type === "persons" ? "Números de contacto de emergencia" : "Números de contacto"}</Label>
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
    </>
  )
}
