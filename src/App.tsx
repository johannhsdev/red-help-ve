import { useState } from "react"
import { Analytics } from "@vercel/analytics/react"
import { AlertTriangle, HeartHandshake, Home, Hospital, MapPinned, ShieldCheck, UsersRound } from "lucide-react"
import { AffectedSitesView } from "./components/AffectedSitesView"
import { HospitalCentersView } from "./components/HospitalCentersView"
import { RegistryView } from "./components/RegistryView"
import { SheltersView } from "./components/SheltersView"
import { useAffectedSites } from "./hooks/useAffectedSites"
import { useHospitalCenters } from "./hooks/useHospitalCenters"
import { useRegistry } from "./hooks/useRegistry"
import { useShelters } from "./hooks/useShelters"

function App() {
  const registry = useRegistry()
  const affectedSites = useAffectedSites()
  const hospitalCenters = useHospitalCenters()
  const shelters = useShelters()
  const [activeTab, setActiveTab] = useState<"persons" | "centers" | "hospitals" | "shelters" | "affected">("persons")
  const missingCount = registry.records.filter(
    (record) => record.type === "persons" && record.status === "missing",
  ).length
  const foundCount = registry.records.filter(
    (record) => record.type === "persons" && record.status === "found",
  ).length
  const personCount = registry.records.filter((record) => record.type === "persons").length
  const centerCount = registry.records.filter((record) => record.type === "centers").length
  const affectedCount = affectedSites.sites.length
  const hospitalCount = hospitalCenters.centers.length
  const hospitalPatientCount = hospitalCenters.centers.reduce(
    (total, center) => total + center.patients.length,
    0,
  )
  const shelterCount = shelters.shelters.length
  const shelteredPeopleCount = shelters.shelters.reduce(
    (total, shelter) => total + shelter.people.length,
    0,
  )
  const stats = [
    {
      label: "Personas desaparecidas",
      value: missingCount,
      icon: UsersRound,
      tone: "text-amber-400",
    },
    {
      label: "Personas encontradas",
      value: foundCount,
      icon: ShieldCheck,
      tone: "text-emerald-400",
    },
    {
      label: "Centros de acopio",
      value: centerCount,
      icon: MapPinned,
      tone: "text-sky-400",
    },
    {
      label: "Pacientes en hospitales",
      value: hospitalPatientCount,
      icon: Hospital,
      tone: "text-rose-300",
    },
    {
      label: "Personas en refugios",
      value: shelteredPeopleCount,
      icon: Home,
      tone: "text-emerald-300",
    },
    {
      label: "Zonas afectadas",
      value: affectedCount,
      icon: AlertTriangle,
      tone: "text-red-400",
    },
  ]

  return (
    <>
      <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
        <header className="border-b border-[var(--border)] bg-[#151515]">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f4f5] text-[#191919]">
                <HeartHandshake className="size-5 stroke-[2.25]" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-[1.45rem] font-extrabold leading-none tracking-[-0.01em] text-white sm:text-2xl">
                  Red de Ayuda - Terremoto en Venezuela
                </h1>
                <p className="mt-1 text-[0.875rem] leading-none text-[#b7c0cc]">
                  Personas desaparecidas y centros de acopio
                </p>
                <p className="mt-2 text-xs font-medium leading-none text-[#8f98a3]">
                  Desarrollado por{" "}
                  <a
                    href="https://slasdevelopments.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d7dce3] underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    Slas Developments
                  </a>{" "}
                  /{" "}
                  <a
                    href="https://www.instagram.com/johannhs.dev/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d7dce3] underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    Johann Salas
                  </a>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-[10px] border border-white/[0.025] bg-[#171717] px-3.5 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.012)]">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden="true" />
              <p className="text-pretty text-sm font-medium leading-relaxed text-white">
                Tras el <strong>sismo que vivimos ayer en Venezuela</strong>, habilitamos esta
                plataforma pública y gratuita como apoyo informativo para toda la comunidad. Aquí
                puedes <strong>reportar y buscar personas desaparecidas</strong> y ubicar los{" "}
                <strong>centros de acopio</strong> donde recibir o llevar ayuda. Usa el buscador para
                filtrar en tiempo real.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-[10px] border border-white/[0.04] bg-[#171717] px-4 py-3"
                  >
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ${stat.tone}`}>
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-2xl font-extrabold leading-none text-white">{stat.value}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#9ba4af]">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 pb-16">
          <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--border)] pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("persons")}
              className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "persons"
                  ? "border-[#f4f4f5] bg-[#f4f4f5] text-[#18181b]"
                  : "border-[#2f2f32] bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              Desaparecidos
              <span className="text-xs opacity-70">{personCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("hospitals")}
              className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "hospitals"
                  ? "border-[#f4f4f5] bg-[#f4f4f5] text-[#18181b]"
                  : "border-[#2f2f32] bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              Centros hospitalarios
              <span className="text-xs opacity-70">{hospitalCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("shelters")}
              className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "shelters"
                  ? "border-[#f4f4f5] bg-[#f4f4f5] text-[#18181b]"
                  : "border-[#2f2f32] bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              Refugios
              <span className="text-xs opacity-70">{shelterCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("centers")}
              className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "centers"
                  ? "border-[#f4f4f5] bg-[#f4f4f5] text-[#18181b]"
                  : "border-[#2f2f32] bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              Centros de Acopio
              <span className="text-xs opacity-70">{centerCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("affected")}
              className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "affected"
                  ? "border-[#f4f4f5] bg-[#f4f4f5] text-[#18181b]"
                  : "border-[#2f2f32] bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              Zonas afectadas
              <span className="text-xs opacity-70">{affectedCount}</span>
            </button>
          </div>

          {activeTab === "persons" && <RegistryView registry={registry} mode="persons" />}
          {activeTab === "centers" && <RegistryView registry={registry} mode="centers" />}
          {activeTab === "hospitals" && <HospitalCentersView hospitalCenters={hospitalCenters} />}
          {activeTab === "shelters" && <SheltersView shelters={shelters} />}
          {activeTab === "affected" && (
            <AffectedSitesView affectedSites={affectedSites} />
          )}
        </main>
      </div>
      <Analytics />
    </>
  )
}

export default App
