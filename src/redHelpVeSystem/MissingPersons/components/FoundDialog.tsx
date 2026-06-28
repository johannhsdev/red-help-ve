import { useEffect, useState } from "react"
import { CheckCircle2, Home, Building2 } from "lucide-react"
import { Dialog } from "../../../components/ui/Dialog"
import { Button } from "../../../components/ui/Button"
import { Input, Label } from "../../../components/ui/Input"
import type { SupplyCenter } from "../../../types/registry"
import type { IFoundInfo, IMissingPerson } from "../../../Interfaces/IMissingPerson"

type Place = "family" | "center"
type CenterSource = "registrado" | "externo"

interface Props {
  person: IMissingPerson | null
  centers: SupplyCenter[]
  onConfirm: (foundInfo: IFoundInfo) => Promise<void>
  onClose: () => void
}

export function FoundDialog({ person, centers, onConfirm, onClose }: Props) {
  const [place, setPlace] = useState<Place>("family")
  const [centerSource, setCenterSource] = useState<CenterSource>(
    centers.length > 0 ? "registrado" : "externo",
  )
  const [selectedCenterId, setSelectedCenterId] = useState(centers[0]?.id?.toString() ?? "")
  const [externalName, setExternalName] = useState("")
  const [externalLocation, setExternalLocation] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!person) return
    setPlace("family")
    setCenterSource(centers.length > 0 ? "registrado" : "externo")
    setSelectedCenterId(centers[0]?.id?.toString() ?? "")
    setExternalName("")
    setExternalLocation("")
    setError("")
  }, [person, centers])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      if (place === "family") {
        await onConfirm({ kind: "family" })
        return
      }

      if (centerSource === "registrado") {
        const center = centers.find((c) => c.id.toString() === selectedCenterId)
        if (!center) {
          setError("Selecciona un centro de acopio.")
          return
        }
        await onConfirm({ kind: "registered_center", centerId: center.id, centerName: center.name })
        return
      }

      const name = externalName.trim()
      if (!name) {
        setError("Indica el nombre del centro de acopio.")
        return
      }
      await onConfirm({
        kind: "external_center",
        centerName: name,
        centerLocation: externalLocation.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reportar el cambio.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={Boolean(person)}
      onClose={() => {
        if (submitting) return
        onClose()
      }}
      title="Reportar como encontrada"
      description={
        person
          ? `Indícanos dónde se encuentra ${person.name} para mantener la información actualizada.`
          : ""
      }
    >
      <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPlace("family")}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-colors ${
              place === "family"
                ? "border-[var(--status-found)] bg-green-950/40 text-green-400 ring-1 ring-[var(--status-found)]"
                : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            }`}
          >
            <Home className="size-5" />
            Con sus familiares
          </button>
          <button
            type="button"
            onClick={() => setPlace("center")}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-colors ${
              place === "center"
                ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            }`}
          >
            <Building2 className="size-5" />
            En un centro de acopio
          </button>
        </div>

        {place === "center" && (
          <div className="flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">
                ¿El centro está registrado en el sistema?
              </span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label
                  className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm transition-colors ${
                    centerSource === "registrado"
                      ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--foreground)]"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                  } ${centers.length === 0 ? "pointer-events-none opacity-50" : ""}`}
                >
                  <input
                    type="radio"
                    name="center-source"
                    checked={centerSource === "registrado"}
                    onChange={() => setCenterSource("registrado")}
                    disabled={centers.length === 0}
                    className="accent-[var(--primary)]"
                  />
                  Sí, elegir de la lista
                </label>
                <label
                  className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm transition-colors ${
                    centerSource === "externo"
                      ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--foreground)]"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="center-source"
                    checked={centerSource === "externo"}
                    onChange={() => setCenterSource("externo")}
                    className="accent-[var(--primary)]"
                  />
                  No, escribir datos
                </label>
              </div>
            </div>

            {centerSource === "registrado" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="center-select">Centro de acopio</Label>
                <select
                  id="center-select"
                  value={selectedCenterId}
                  onChange={(e) => setSelectedCenterId(e.target.value)}
                  className="select_rhve__form"
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id.toString()}>
                      {c.name} — {c.location}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="external-name">Nombre del centro (informativo)</Label>
                  <Input
                    id="external-name"
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                    placeholder="Ej: Refugio Iglesia San José"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="external-location">Ubicación (opcional)</Label>
                  <Input
                    id="external-location"
                    value={externalLocation}
                    onChange={(e) => setExternalLocation(e.target.value)}
                    placeholder="Sector, ciudad"
                  />
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Este centro no está registrado en el sistema, así que solo se mostrará como información en la tarjeta.
                </p>
              </>
            )}
          </div>
        )}

        {error && <p className="text-sm font-medium text-red-400">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full gap-1.5 !bg-[var(--status-found)] hover:!bg-green-700"
          disabled={submitting}
        >
          <CheckCircle2 className="size-4" />
          {submitting ? "Confirmando..." : "Confirmar reporte"}
        </Button>
      </form>
    </Dialog>
  )
}
