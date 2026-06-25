---
name: react-frontend-architecture
description: Patrón de arquitectura frontend para módulos del panel admin en este proyecto. Define estructura de carpetas, hooks CRUD, servicios Axios y convenciones que DEBEN seguirse al crear o refactorizar cualquier módulo en src/Admin/.
argument-hint: "nombre del módulo a crear o revisar"
---

Aplica este patrón en **todo módulo admin** que crees o refactorices. El estándar está establecido en módulos como `Appointment`, `MedicalOrder` y `Dependent`, y debe replicarse en todos los módulos del sistema.

---

## Estructura de carpetas por módulo

```
src/
├── Admin/{Module}/
│   ├── {Module}Page.tsx              ← Orquestador: solo compone, no define sub-componentes inline
│   └── components/
│       ├── {Module}Table.tsx         ← Tabla o grid de registros
│       ├── {Module}Form.tsx          ← Formulario (modal o panel)
│       └── {Module}Card.tsx          ← Card visual (si el módulo usa grid de cards)
│
├── Services/
│   └── {Module}Service.ts            ← Llamadas Axios crudas (una función por endpoint)
│
├── hooks/
│   └── use{Module}.ts                ← Hook CRUD: estado + handlers expuestos al componente
│
└── Interfaces/
    └── I{Module}.ts                  ← Interfaces TypeScript del módulo
```

---

## Service — `src/Services/{Module}Service.ts`

Funciones Axios puras. Sin estado, sin lógica de UI. Los query params se limpian de valores nulos/vacíos antes de enviarse.

```ts
import api from "../api/api";
import type { IModuleResponse, IModule } from "../Interfaces/IModule";

// Filtrar params vacíos antes de enviar
const cleanParams = (params: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null && v !== "" && v !== undefined));

export const ModuleList = (params?: Record<string, unknown>) =>
  api.get<IModuleResponse>("/modules", { params: params ? cleanParams(params) : undefined });

export const ModuleCreate = (data: Partial<IModule>) =>
  api.post<IModule>("/modules", data);

export const ModuleUpdate = (id: number, data: Partial<IModule>) =>
  api.put<IModule>(`/modules/${id}`, data);

export const ModuleDelete = (id: number) =>
  api.delete(`/modules/${id}`);
```

---

## Hook CRUD — `src/hooks/use{Module}.ts`

Toda la lógica del módulo vive aquí: estado de modal, loading, errores, CRUD handlers y selección.

```ts
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ModuleList, ModuleCreate, ModuleUpdate, ModuleDelete } from "../Services/ModuleService";
import { SuccessAlert, ErrorAlert, DeleteAlert } from "../utils/alerts";
import type { IModule } from "../Interfaces/IModule";

export const useModule = () => {
  const { refreshKey } = useAuth();
  const [modules, setModules] = useState<IModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedModule, setSelectedModule] = useState<IModule | null>(null);

  useEffect(() => {
    fetchModules();
  }, [refreshKey]);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const { data } = await ModuleList();
      setModules(data.modules);
    } catch {
      ErrorAlert("No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => { setSelectedModule(null); setModalVisible(true); };
  const handleEdit = (item: IModule) => { setSelectedModule(item); setModalVisible(true); };
  const handleClose = () => { setModalVisible(false); setSelectedModule(null); };

  const handleSave = async (formData: Partial<IModule>) => {
    setLoading(true);
    try {
      if (selectedModule) {
        await ModuleUpdate(selectedModule.id, formData);
        SuccessAlert("Registro actualizado correctamente.");
      } else {
        await ModuleCreate(formData);
        SuccessAlert("Registro creado correctamente.");
      }
      handleClose();
      fetchModules();
    } catch {
      ErrorAlert("Ocurrió un error al guardar.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await DeleteAlert("¿Eliminar este registro?");
    if (!confirmed) return;
    try {
      await ModuleDelete(id);
      SuccessAlert("Registro eliminado.");
      fetchModules();
    } catch {
      ErrorAlert("No se pudo eliminar el registro.");
    }
  };

  return { modules, loading, modalVisible, selectedModule,
           handleNew, handleEdit, handleClose, handleSave, handleDelete };
};
```

---

## Interfaces — `src/Interfaces/I{Module}.ts`

```ts
export interface IModule {
  id: number;
  name: string;
  // ... campos del dominio
}

// Las respuestas paginadas siempre tienen meta.total
export interface IModuleResponse {
  modules: IModule[];
  meta: {
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
}
```

Los tipos de formulario pueden ir en la misma interfaz o como `IModuleForm` separado si difieren del modelo de dominio.

---

## Orquestador `{Module}Page.tsx` — reglas

1. **No define sub-componentes inline** — solo importa y compone.
2. Importa el hook desde `../../hooks/use{Module}`.
3. Gestiona solo lógica de UI de nivel página (filtros, paginación activa).
4. Delega toda la lógica de datos al hook.

```tsx
import { useModule } from "../../hooks/useModule";
import { ModuleTable } from "./components/ModuleTable";
import { ModuleForm } from "./components/ModuleForm";

export const ModulePage = () => {
  const { modules, loading, modalVisible, selectedModule,
          handleNew, handleEdit, handleClose, handleSave, handleDelete } = useModule();

  return (
    <div>
      <button onClick={handleNew}>Nuevo</button>
      <ModuleTable items={modules} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
      {modalVisible && (
        <ModuleForm
          item={selectedModule}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}
    </div>
  );
};
```

---

## Auth y re-fetch

- Usa `triggerRefresh()` del `AuthContext` para forzar re-fetch cross-módulo tras mutaciones que afectan al usuario.
- Para re-fetch local dentro del mismo módulo, llama directamente a la función `fetch*` del hook.
- Usa `canUseModule(user, featureName, count)` de `src/utils/` para controlar acceso por suscripción.

---

## Alertas — `src/utils/alerts/`

Siempre usa las utilidades SweetAlert2, nunca alerts nativos ni console.

```ts
import { SuccessAlert, ErrorAlert, DeleteAlert } from "../utils/alerts";

// Confirmación de borrado — retorna boolean
const confirmed = await DeleteAlert("¿Deseas eliminar este registro?");

// Feedback tras operación
SuccessAlert("Guardado correctamente.");
ErrorAlert("No se pudo completar la operación.");
```

---

## Checklist antes de entregar un módulo

- [ ] Servicio en `src/Services/{Module}Service.ts` — solo Axios, sin lógica de UI
- [ ] Hook en `src/hooks/use{Module}.ts` — todo el estado y handlers del módulo
- [ ] Interfaces en `src/Interfaces/I{Module}.ts` — sin `any`
- [ ] Respuestas paginadas incluyen `meta.total`, `meta.current_page`, `meta.last_page`
- [ ] `{Module}Page.tsx` no define componentes inline
- [ ] Alertas usan `SuccessAlert` / `ErrorAlert` / `DeleteAlert`
- [ ] `cleanParams()` aplicado antes de enviar query params opcionales
- [ ] Loading state manejado en el hook, no en el componente

---

## Tarea

$ARGUMENTS
