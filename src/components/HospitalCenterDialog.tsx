import { useState, type FormEvent } from "react"
import { Loader2, Plus } from "lucide-react"
import type { HospitalCenter, HospitalCenterDraft } from "../types/registry"
import { Button } from "./ui/Button"
import { Dialog } from "./ui/Dialog"
import { Input, Label, Textarea } from "./ui/Input"

export function HospitalCenterDialog({
  onAdd,
}: {
  onAdd: (center: HospitalCenterDraft) => Promise<HospitalCenter>
}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function reset() {
    setError("")
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    const formElement = e.currentTarget
    const form = new FormData(formElement)
    const draft: HospitalCenterDraft = {
      name: String(form.get("name") || "").trim(),
      city: String(form.get("city") || "").trim(),
      state: String(form.get("state") || "").trim() || undefined,
      address: String(form.get("address") || "").trim(),
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
      setError(err instanceof Error ? err.message : "No se pudo guardar el centro hospitalario.")
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
        Registrar hospital
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          if (submitting) return
          setOpen(false)
          reset()
        }}
        title="Nuevo centro hospitalario"
        description="Registra el hospital o centro de salud que esta recibiendo personas."
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <fieldset disabled={submitting} className="m-0 flex flex-col gap-4 border-0 p-0">
            <div className="flex flex-col gap-2">
              <Label htmlFor="hospital-name">Nombre del centro</Label>
              <Input id="hospital-name" name="name" required placeholder="Hospital Central" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="hospital-city">Ciudad</Label>
                <Input id="hospital-city" name="city" required placeholder="Caracas" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="hospital-state">Estado (opcional)</Label>
                <Input id="hospital-state" name="state" placeholder="Distrito Capital" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="hospital-address">Direccion o referencia</Label>
              <Input id="hospital-address" name="address" required placeholder="Avenida, sector o punto de referencia" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="hospital-phone">Telefono de contacto (opcional)</Label>
              <Input id="hospital-phone" name="contactPhone" inputMode="tel" placeholder="+58 412-000-0000" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="hospital-notes">Notas (opcional)</Label>
              <Textarea id="hospital-notes" name="notes" placeholder="Area de ingreso, horarios, observaciones..." />
            </div>
          </fieldset>

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar centro hospitalario"
            )}
          </Button>
        </form>
      </Dialog>
    </>
  )
}
