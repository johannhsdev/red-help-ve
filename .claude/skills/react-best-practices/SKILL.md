---
name: react-best-practices
description: Convenciones y buenas prácticas de React 19 + TypeScript para este proyecto. Cubre tipado estricto, patrones de componentes, estado, formularios y rendimiento. Aplícalo al construir o revisar cualquier componente o página.
argument-hint: "componente o página a construir/revisar"
---

Aplica estas convenciones en todo el código React/TypeScript que escribas o revises en este proyecto.

---

## TypeScript estricto

- **Sin `any`** — nunca. Usa `unknown` + type guard si el tipo es genuinamente desconocido.
- Props de componentes siempre con `interface` explícita, no inline.
- Tipos de dominio en `src/Interfaces/I{Name}.ts` con prefijo `I`.
- Tipos de formulario como `I{Module}Form` si difieren del modelo de dominio.
- Prefiere `type` para uniones/intersecciones, `interface` para formas de objetos extensibles.

```ts
// ✅ Correcto
interface IAppointmentFormProps {
  appointment: IAppointment | null;
  onSave: (data: IAppointmentForm) => Promise<void>;
  onClose: () => void;
}

// ❌ Incorrecto
const MyComponent = ({ data, onSave }: any) => { ... }
```

---

## Componentes

- **< 200 líneas** — si supera, extrae responsabilidades a sub-componentes.
- **Página = orquestador**: solo compone y conecta, no define lógica de datos ni sub-componentes inline.
- **Una responsabilidad por componente**: Card visual ≠ formulario ≠ tabla ≠ página.
- Componentes nombrados con PascalCase, archivos con el mismo nombre.
- Exporta componentes como named exports, no default cuando sea posible en módulos admin.

```tsx
// ✅ Componente con props tipadas y responsabilidad única
interface IAppointmentCardProps {
  appointment: IAppointment;
  onEdit: (item: IAppointment) => void;
  onDelete: (id: number) => void;
}

export const AppointmentCard = ({ appointment, onEdit, onDelete }: IAppointmentCardProps) => {
  return (
    <div className="...">
      {/* renderizado visual únicamente */}
    </div>
  );
};
```

---

## Estado y hooks

- **Estado local en el hook del módulo** — nunca en Redux (Redux es solo para `theme` y `route`).
- Agrupa estado relacionado en el hook del módulo, no en múltiples `useState` dispersos por el árbol.
- `useEffect` con dependencias explícitas. Si solo debe correr al montar, usa `[]` y documenta por qué.
- `useMemo` / `useCallback` solo cuando el costo de re-computación sea real y medible — no por defecto.
- Usa React 19 (`use`, `useOptimistic`, `useFormStatus`) cuando simplifiquen código real.

```ts
// ✅ Estado agrupado en el hook del módulo
export const useAppointment = () => {
  const { refreshKey } = useAuth();
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<IAppointment | null>(null);
  // ...
};

// ❌ Estado de datos del módulo en el componente
const AppointmentPage = () => {
  const [appointments, setAppointments] = useState([]);
  // Esto va en el hook, no aquí
};
```

---

## Formularios

No hay Inertia en este proyecto. Los formularios usan estado React controlado, gestionado desde el hook del módulo.

```tsx
// ✅ Formulario controlado con estado local en el componente de formulario
interface IAppointmentFormProps {
  appointment: IAppointment | null;
  onSave: (data: IAppointmentForm) => Promise<void>;
  onClose: () => void;
}

export const AppointmentForm = ({ appointment, onSave, onClose }: IAppointmentFormProps) => {
  const [form, setForm] = useState<IAppointmentForm>({
    patient_id: appointment?.patient_id ?? "",
    doctor_id: appointment?.doctor_id ?? "",
    date: appointment?.date ?? "",
  });

  const handleChange = (field: keyof IAppointmentForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* campos */}
    </form>
  );
};
```

---

## Navegación y routing

Este proyecto usa React Router v7 — no uses `window.location` ni `<a href>` para navegación interna.

```tsx
import { useNavigate, Link } from "react-router-dom";

// Declarativa
<Link to="/appointments">Ver citas</Link>

// Programática
const navigate = useNavigate();
navigate("/dashboard");
```

---

## Autenticación y contexto

```tsx
import { useAuth } from "../context/AuthContext";

const { user, isAuthenticated, triggerRefresh, logout } = useAuth();

// Forzar re-fetch en otros módulos tras una mutación importante
triggerRefresh();

// Control de acceso por suscripción
import { canUseModule } from "../utils/canUseModule";
if (!canUseModule(user, "appointments", appointmentCount)) {
  // mostrar mensaje de upgrade
}
```

---

## Axios y API

```ts
// ✅ Siempre tipado el retorno
const { data } = await AppointmentList();
// data es IAppointmentResponse — usa el tipo de src/Interfaces/

// ✅ Manejo de errores en el hook, no en el componente
try {
  await AppointmentCreate(formData);
  SuccessAlert("Cita creada.");
} catch {
  ErrorAlert("No se pudo crear la cita.");
}
```

---

## UI — PrimeReact + Tailwind

- **Tailwind v4** para layout, espaciado y colores. Mobile-first: `base → sm: → md: → lg:`.
- **PrimeReact** para componentes complejos: `Calendar`, `Dropdown`, `TabMenu`, `Chart`, `ProgressSpinner`.
- **Headless UI** (`@headlessui/react`) para modales, menús y transiciones accesibles.
- **Heroicons** para iconografía consistente.
- **Framer Motion** para animaciones de componentes (no para transiciones de página simples).
- No mezcles librerías UI para el mismo propósito — si usas PrimeReact `Dropdown`, no uses otro select.

```tsx
// ✅ Spinner de carga con PrimeReact
import { ProgressSpinner } from "primereact/progressspinner";

{loading && <ProgressSpinner style={{ width: "50px", height: "50px" }} />}
```

---

## Páginas públicas (src/Site/)

- Estructura semántica HTML5: `<main>`, `<section>`, `<article>`, `<nav>`.
- Imágenes con `loading="lazy"`.
- SEO con `react-helmet-async` desde `src/seo/`.
- Animaciones de scroll con AOS (ya inicializado en `App.tsx` — solo agrega `data-aos` attributes).

---

## Checklist antes de entregar

- [ ] Sin `any` en TypeScript — interfaces explícitas en todo componente y hook
- [ ] Componente < 200 líneas — si supera, extraer sub-componentes
- [ ] Página solo orquesta — no define lógica de datos ni componentes inline
- [ ] Estado del módulo en el hook, no en el componente página
- [ ] Formularios con estado controlado y tipado
- [ ] Navegación con React Router — sin `window.location` ni `<a>` para rutas internas
- [ ] Alertas con `SuccessAlert` / `ErrorAlert` / `DeleteAlert`
- [ ] `useEffect` con dependencias declaradas explícitamente
- [ ] `useMemo` / `useCallback` solo cuando el costo sea real

---

## Tarea

$ARGUMENTS
