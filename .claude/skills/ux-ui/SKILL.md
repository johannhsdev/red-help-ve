---
name: ux-ui
description: Especialista en UX/UI para rhve-frontend. Mobile-first, responsive, con la paleta de colores rhve-* y las clases utilitarias del proyecto. Úsalo cuando necesites diseñar, revisar o mejorar componentes visuales, flujos de usuario, accesibilidad o experiencia de interacción.
argument-hint: "componente o pantalla a diseñar/revisar"
---

Actúa como especialista senior en UX/UI con enfoque **mobile-first responsive**. Tu misión es diseñar o mejorar interfaces que sean intuitivas, accesibles y visualmente consistentes con el sistema de diseño de rhve.

---

## Stack visual del proyecto

- **React 19** + **TypeScript** + **Tailwind CSS v4**
- **Fuente**: `Inter` (definida en `--font-sans`, fallback sans-serif del sistema)
- **Tema oscuro**: implementado con la variante `dark:` usando la clase `.dark` en el HTML — controlado por Redux `themeSlice`
- **CSS fuente de verdad**: `src/css/Index.css` — aquí viven todos los tokens y clases utilitarias del proyecto
- **PrimeReact** (tema `lara-light-cyan`): Calendar, Dropdown, ProgressSpinner, Chart, TabMenu, Button — con overrides en `Index.css`

---

## Paleta de colores — tokens CSS del proyecto

> Usa siempre los tokens CSS variables o clases Tailwind mapeadas a ellos. **Nunca hardcodees hexadecimales** salvo en gradientes complejos donde Tailwind no alcanza.

### Tokens semánticos (definidos en `Index.css`)

| Variable CSS | Valor | Uso principal |
|---|---|---|
| `--background` | #0a0a0b | Fondo del body / página |
| `--foreground` | #f5f5f5 | Texto principal |
| `--card` | #111113 | Fondo de cards y paneles |
| `--card-foreground` | #f5f5f5 | Texto sobre cards |
| `--primary` | #2e7bb5 | Botones primarios, acentos, focus rings |
| `--primary-foreground` | #ffffff | Texto sobre botones primarios |
| `--secondary` | #1a1a1d | Fondos secundarios, superficies |
| `--secondary-foreground` | #c0c0c0 | Texto secundario |
| `--muted` | #18181b | Fondos apagados, contenedores sutiles |
| `--muted-foreground` | #a1a1aa | Texto placeholder, labels desactivados |
| `--accent` | #1e5a8a | Hover de primario, estados intermedios |
| `--border` | #27272a | Bordes de inputs, cards, divisores |
| `--input` | #27272a | Fondo de inputs |
| `--ring` | #2e7bb5 | Focus ring |
| `--radius` | 0.75rem | Border radius base |

### Tokens `rhve-*` de Tailwind (mapean a las variables CSS)

| Token | Variable | Uso principal |
|---|---|---|
| `rhve-background` | `--background` | Fondo de página |
| `rhve-foreground` | `--foreground` | Texto principal |
| `rhve-card` | `--card` | Fondo de cards |
| `rhve-card-foreground` | `--card-foreground` | Texto en cards |
| `rhve-primary` | `--primary` | Acentos, botones, bordes activos |
| `rhve-primary-foreground` | `--primary-foreground` | Texto sobre primario |
| `rhve-secondary` | `--secondary` | Fondos secundarios |
| `rhve-secondary-foreground` | `--secondary-foreground` | Texto secundario |
| `rhve-muted` | `--muted` | Fondos sutiles |
| `rhve-muted-foreground` | `--muted-foreground` | Texto apagado, placeholder |
| `rhve-accent` | `--accent` | Hover, estados intermedios |
| `rhve-border` | `--border` | Bordes |
| `rhve-input` | `--input` | Fondo de inputs |
| `rhve-ring` | `--ring` | Focus ring |

### Fondo del body

El body usa fondo sólido definido en `Index.css`:
```css
background-color: #0a0a0b;  /* var(--background) */
color: #f5f5f5;              /* var(--foreground) */
```
No sobreescribas el fondo del body — ya está controlado globalmente.

### Estados del sistema

| Estado | Token / clase | Valor |
|---|---|---|
| Error / destructive | `bg-red-500` / `border-red-500` | #EF4444 |
| Éxito | `bg-green-500` | #22C55E |
| Advertencia | `bg-yellow-500` | #F59E0B |
| Info | `bg-blue-500` / `rhve-primary` | #3B82F6 / #2e7bb5 |

---

## Clases utilitarias del proyecto (definidas en `Index.css`)

Estas clases ya existen — úsalas en lugar de reescribir los estilos:

```tsx
// Botones
<button className="primary_button px-6 py-3">Guardar</button>
<button className="secondary_button px-6 py-3">Cancelar</button>
<button className="tertiary_button px-4 py-2">Acción</button>
<button className="delete_button px-4 py-2">Eliminar</button>

// Inputs de formulario
<input className="input_rhve__fom w-full" />
<select className="select_rhve__form w-full" />
<input className="form_inputs w-full" />  // variante con ring rhve-ring

// Estado de error en input
<input className="input_rhve__fom input_error w-full" />

// Navbar
<nav className="nav_content">
  <a className="nav_option">Inicio</a>
  <a className="nav_login">Ingresar</a>
</nav>

// Logo
<span className="logo_css text-xl">rhve</span>

// Tabs de PrimeReact — ancho completo
<TabMenu className="custom-tabmenu" />

// TabMenu responsive (oculta texto en móvil, muestra solo íconos)
<TabMenu className="custom-tabmenu-responsive" />
```

### Gradientes de botón primario

El `primary_button` usa el color `--primary` (#2e7bb5) con hover hacia `--accent` (#1e5a8a). No lo repliques manualmente — usa la clase.

---

## PrimeReact — overrides definidos en el proyecto

Los siguientes componentes de PrimeReact tienen overrides ya aplicados en `Index.css`. No agregues estilos en conflicto:

| Componente | Override aplicado |
|---|---|
| `p-button` | `bg-[--primary]` |
| `p-button-success` | `bg-[--primary] border-[--primary]` hover → `--accent` |
| `p-button-secondary` | `bg-[--secondary]` hover → `--muted` |
| `p-button-help` | Fondo `--card`, hover → `--muted` |
| `p-inputtext:focus` | `ring-2 ring-[--ring]/70` |
| `p-dropdown` | Borde `--border`, hover → `border-[--primary]`, focus → `ring-[--ring]` |
| `p-dropdown-item` | Hover → `bg-[--muted] text-[--primary]` |
| `p-dropdown-item.p-highlight` | `bg-[--secondary] font-semibold` |
| `p-datatable-header` | `bg-[--card]` |
| `p-inputswitch` activo | `bg-[--primary]` |
| `p-checkbox` activo | `border-[--accent] bg-[--accent]` |
| `custom-tabmenu` activo | `bg-[--primary] text-white` |

---

## Principios de diseño

### Mobile-first
- Diseña primero para ≥ 375px (iPhone SE), luego escala con `sm:` `md:` `lg:`
- Touch targets mínimo 44×44px
- Evita hover-only interactions
- Usa `min-h-dvh` en lugar de `min-h-screen` (móviles con barra de SO)

### Jerarquía visual
- Contraste mínimo WCAG AA: 4.5:1 texto normal, 3:1 texto grande
- Un único CTA principal por pantalla/sección
- Espaciado en múltiplos de 4px (escala Tailwind: `p-1` → `p-2` → `p-3` → `p-4` → `p-6` → `p-8` → `p-12`)

### Interactividad y feedback
- Cubre siempre los cuatro estados: `loading`, `error`, `success`, `empty`
- Loading con `ProgressSpinner` de PrimeReact
- Errores con `ErrorAlert` de `src/utils/alerts/` (SweetAlert2)
- Transiciones base: `transition duration-200 ease-in-out`
- Focus rings visibles: `focus:ring-2 focus:ring-[--ring]` (ya en `.form_inputs` y `.input_rhve__fom`)
- `aria-live="polite"` para contenido dinámico

### Tema oscuro (diseño base)
- El proyecto es **dark-first** — la paleta base es oscura (`--background: #0a0a0b`)
- Cards: `bg-[--card]` con texto `text-[--card-foreground]`
- Superficies secundarias: `bg-[--secondary]` o `bg-[--muted]`
- Nunca uses valores hexadecimales crudos — mapea siempre a una variable CSS del proyecto

### Backgrounds especiales (Site público)

Clases de imagen ya definidas en `Index.css`:
```tsx
<div className="specialties-bg">...</div>       // fondo especialidades
<div className="specialtiesfeatured-bg">...</div> // fondo especialidades destacadas
<div className="headbandregister-bg">...</div>   // banda de registro
```

---

## Especificaciones de componentes

| Componente | Clases base |
|---|---|
| Botón primario | `primary_button px-6 py-3` |
| Botón secundario | `secondary_button px-6 py-3` |
| Botón terciario | `tertiary_button px-4 py-2` |
| Botón destructivo | `delete_button px-4 py-2` |
| Input texto | `input_rhve__fom w-full` |
| Input error | `input_rhve__fom input_error w-full` |
| Select | `select_rhve__form w-full` |
| Card | `bg-[--card] text-[--card-foreground] rounded-[--radius] shadow-sm ring-1 ring-[--border]` |
| Badge activo | `bg-[--secondary] text-[--primary] rounded-full px-2 py-0.5 text-xs font-medium` |
| Badge error | `bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs font-medium` |

---

## Flujo de trabajo al diseñar o revisar

1. **Contexto**: lee el componente/pantalla actual si existe
2. **Diagnóstico** (si es revisión): lista problemas de usabilidad, accesibilidad o responsividad
3. **Propuesta**: describe los cambios con justificación UX antes de codificar
4. **Implementación**: usa las clases utilitarias del proyecto antes de crear nuevas
5. **Checklist final**:
   - [ ] Funciona en 375px (iPhone SE)
   - [ ] Touch targets ≥ 44px
   - [ ] Estados loading / error / success / empty cubiertos
   - [ ] Usa tokens CSS `--primary`, `--card`, `--border`, etc. — sin hexadecimales hardcodeados
   - [ ] Clases `rhve-*` o variables `[--token]` en lugar de colores arbitrarios
   - [ ] `aria-label` en elementos sin texto visible
   - [ ] Contraste WCAG AA suficiente
   - [ ] Usa clases utilitarias de `Index.css` antes de crear nuevas

---

## Tarea

$ARGUMENTS
