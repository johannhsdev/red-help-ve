Aplica este patrón en **todo módulo** que crees o refactorices en este proyecto. El estándar está establecido en módulos como `HospitalCenters` y `MissingPersons`, y debe replicarse en todos los módulos del sistema.

---

## Estructura de carpetas por módulo

```
src/
├── redHelpVeSystem/{Module}/
│   ├── {Module}Page.tsx              ← Orquestador: solo compone, no define sub-componentes inline
│   └── components/
│       ├── {Module}List.tsx          ← Lista o grid de registros con búsqueda
│       ├── {Module}Form.tsx          ← Formulario (modal Dialog)
│       └── {Module}Card.tsx          ← Card visual (si el módulo usa grid de cards)
│
├── Services/
│   └── {Module}Service.ts            ← Llamadas Supabase puras (una función por operación)
│
├── hooks/
│   └── use{Module}.ts                ← Hook CRUD: estado + handlers expuestos al componente
│
└── Interfaces/
    └── I{Module}.ts                  ← Interfaces TypeScript del módulo
```

---

## Service — `src/Services/{Module}Service.ts`

Funciones Supabase puras. Sin estado, sin lógica de UI. Los errores se lanzan — el hook los captura.

```ts
import { supabase } from "../lib/supabase"
import { moduleRowToRecord, draftToModuleInsert } from "../lib/registryMapper"
import { validateModuleDraft } from "../lib/registryValidation"
import type { IModule, IModuleDraft } from "../Interfaces/IModule"

export async function ModuleList(): Promise<IModule[]> {
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(moduleRowToRecord)
}

export async function ModuleCreate(draft: IModuleDraft): Promise<IModule> {
  validateModuleDraft(draft)

  const { data, error } = await supabase
    .from("modules")
    .insert(draftToModuleInsert(draft))
    .select()
    .single()

  if (error) throw new Error(error.message)
  return moduleRowToRecord(data)
}
```

Para mutaciones complejas usa RPC:

```ts
export async function ModulePersonAdd(moduleId: number, draft: IModulePersonDraft): Promise<IModulePerson> {
  const { data, error } = await supabase.rpc("add_module_person", {
    p_module_id: moduleId,
    p_name: draft.name,
    p_national_id: draft.nationalId ?? null,
  })

  if (error) throw new Error(error.message)
  return modulePersonRowToRecord(data)
}
```

---

## Hook CRUD — `src/hooks/use{Module}.ts`

Toda la lógica del módulo vive aquí: estado de carga, errores, datos y handlers CRUD.

```ts
import { useEffect, useState } from "react"
import { ModuleList, ModuleCreate } from "../Services/ModuleService"
import type { IModule, IModuleDraft } from "../Interfaces/IModule"

export type ModuleState = {
  items: IModule[]
  loaded: boolean
  error: string
}

export function useModule() {
  const [items, setItems] = useState<IModule[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setError("")
    try {
      const data = await ModuleList()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar.")
    } finally {
      setLoaded(true)
    }
  }

  async function addItem(draft: IModuleDraft): Promise<IModule> {
    const created = await ModuleCreate(draft) // lanza si falla
    setItems((prev) => [created, ...prev])
    return created
  }

  return { items, loaded, error, addItem }
}
```

El hook **no muestra alertas ni toast** — solo setea `error: string`. El componente renderiza ese string.

---

## Interfaces — `src/Interfaces/I{Module}.ts`

```ts
export interface IModule {
  id: number
  name: string
  createdAt: number  // timestamp ms, convertido desde created_at en el mapper
  // ... campos del dominio en camelCase
}

export interface IModuleDraft {
  name: string
  // ... solo los campos requeridos para creación
}
```

Sin `any`. Los campos opcionales se marcan con `?`. Los timestamps son `number` (ms).

---

## Orquestador `{Module}Page.tsx` — reglas

1. **No define sub-componentes inline** — solo importa y compone.
2. Importa el hook desde `../../hooks/use{Module}`.
3. No gestiona lógica de datos — delega todo al hook.

```tsx
import { useModule } from "../../hooks/useModule"
import { ModuleList } from "./components/ModuleList"
import { ModuleForm } from "./components/ModuleForm"

export function ModulePage() {
  const { items, loaded, error, addItem } = useModule()

  return (
    <ModuleList
      items={items}
      loaded={loaded}
      error={error}
      onAdd={addItem}
    />
  )
}
```

---

## Componente List — reglas

- Recibe `items`, `loaded`, `error` como props — no llama al hook directamente.
- Maneja búsqueda/filtro con `useState` + `useMemo` local.
- Renderiza siempre los tres estados: loading → error → lista (o empty state).
- Incluye el botón de acción (`Form` trigger) en el header sticky.

```tsx
export function ModuleList({ items, loaded, error, onAdd }: Props) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((item) => item.name.toLowerCase().includes(q)) : items
  }, [items, query])

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 ...">
        <input /* búsqueda */ />
        <ModuleForm onAdd={onAdd} />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : !loaded ? (
        <p className="py-16 text-center text-[var(--muted-foreground)]">Cargando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((item) => <ModuleCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  )
}
```

---

## Componente Form — reglas

- Gestiona su propio estado `open` (botón trigger + Dialog).
- Al submit: construye el draft, llama `onAdd(draft)`, muestra `error` local si lanza.
- Usa `<Dialog>` de `src/components/ui/Dialog` — no `<dialog>` nativo.
- Usa `<Button>`, `<Input>`, `<Label>`, `<Textarea>` de `src/components/ui/`.

```tsx
export function ModuleForm({ onAdd }: { onAdd: (draft: IModuleDraft) => Promise<IModule> }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const form = new FormData(e.currentTarget)
    const draft: IModuleDraft = { name: String(form.get("name") || "").trim() }

    setSubmitting(true)
    try {
      await onAdd(draft)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Registrar</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo registro">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <fieldset disabled={submitting} className="m-0 flex flex-col gap-4 border-0 p-0">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" required />
            </div>
          </fieldset>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </Dialog>
    </>
  )
}
```

---

## Primitivos UI disponibles

En `src/components/ui/` — úsalos siempre, no crees inline:

| Componente | Import |
|---|---|
| `Button` | `import { Button } from "../../../components/ui/Button"` |
| `Dialog` | `import { Dialog } from "../../../components/ui/Dialog"` |
| `Input`, `Label`, `Textarea` | `import { Input, Label, Textarea } from "../../../components/ui/Input"` |
| `Badge` | `import { Badge } from "../../../components/ui/Badge"` |

Clases utilitarias CSS disponibles: `input_rhve__fom`, `tertiary_button`, `select_rhve__form`.

---

## Manejo de errores — resumen

| Capa | Responsabilidad |
|---|---|
| **Service** | Lanza `throw new Error(error.message)` cuando Supabase retorna error |
| **Hook** | Captura con `try/catch`, setea `error: string` en estado. Handlers de mutación re-lanzan para que el Form lo capture |
| **Component List** | Renderiza `error` del hook como bloque rojo |
| **Component Form** | Captura errores del handler en `try/catch` local, muestra texto rojo bajo el form |

Nunca: `alert()`, `console.error()` como feedback de UI, SweetAlert2, toast.

---

## Checklist antes de entregar un módulo

- [ ] Service en `src/Services/{Module}Service.ts` — solo Supabase, sin lógica de UI
- [ ] Hook en `src/hooks/use{Module}.ts` — todo el estado y handlers; errores como `error: string`
- [ ] Interfaces en `src/Interfaces/I{Module}.ts` — sin `any`, Draft separado
- [ ] `{Module}Page.tsx` en `src/redHelpVeSystem/{Module}/` — no define componentes inline
- [ ] Componentes en `src/redHelpVeSystem/{Module}/components/` — props-driven
- [ ] Estados loading / error / empty cubiertos en List
- [ ] Primitivos UI usados: Button, Dialog, Input, Label, Textarea, Badge
- [ ] Touch targets ≥ 44px, `aria-label` donde corresponda
