# Sistema de diseño JUK Portal — referencia completa (tokens · UI · componentes)

> Documento de handoff para **replicar la UX/diseño del JUK Portal en un proyecto aparte**.
> Está pensado para arrancar de cero en otro repo: copiás los tokens, el helper `cn`,
> el patrón de componentes, y ya tenés el mismo look & feel.
>
> La dirección visual productiva del portal se llama **STUDIO** (cálida, redondeada,
> touch-first). Durante el diseño convivieron varias "direcciones" en un *design lab*
> (`/design`) que **ya se retiró del repo**: sobrevive solo en el commit taggeado
> `design-lab-final`. Hoy STUDIO es la única dirección, y sus tokens viven en
> `src/styles/`. Shadcn aparece como **referencia**, no como dependencia instalada (ver §8).

---

## 0. Resumen ejecutivo (TL;DR para arrancar rápido)

El sistema es **token-first**: existe **un solo archivo CSS** con custom properties
(`--c-*`, `--t-*`, `--r-*`, `--shadow-*`, …) que es la **fuente de verdad**. Todos los
componentes consumen esas variables vía **Tailwind arbitrary values**
(`bg-[var(--c-surface)]`, `rounded-[var(--r-lg)]`, `text-[length:var(--t-body)]`).
Cambiás un valor en el archivo de tokens y **se restila toda la app**.

Para llevarlo a otro proyecto, lo mínimo es:

1. **Tailwind CSS v3.4** + PostCSS + autoprefixer.
2. Copiar el bloque de tokens (§3) a un CSS global y aplicarlo con una clase wrapper
   (`.v-studio`) o en `:root`.
3. Copiar el `tailwind.config.ts` (§2) — sólo extiende fuentes, sombras y radios.
4. Copiar el helper `cn()` (`clsx` + `tailwind-merge`) — §5.
5. Cargar las 3 fuentes con `next/font` (Bricolage Grotesque, Plus Jakarta Sans,
   Space Mono) e inyectarlas como CSS vars (§4).
6. Copiar los componentes que quieras de §6 (son autocontenidos, sólo dependen de
   `cn` y de los tokens).

No hay Radix, no hay class-variance-authority, no hay shadcn instalado. Es **Tailwind +
CSS variables + React puro**. Esa es la razón por la que es tan portable.

---

## 1. Modelo mental: por qué esto se ve bien y es fácil de mantener

Tres ideas sostienen todo el sistema:

### 1.1 Una sola fuente de verdad para los tokens
El archivo `src/styles/tokens.css` define **todo**: paleta, tinta, bordes,
superficies, semánticos, badges de estado, escala tipográfica, espaciado, radios y
sombras. Está scopeado a la clase `.v-studio`. La app lo importa tal cual
(`@import "./tokens.css"` desde `src/styles/globals.css`); los keyframes de
overlays/toasts van aparte en `src/styles/animations.css`.

> **Regla de oro:** para ajustar la dirección visual, tocás **sólo `tokens.css`**.
> Nunca hardcodeás un `#hex` en un componente. Si necesitás un color, sale de una var.

### 1.2 Componentes que consumen variables, no valores
Los componentes nunca traen color/medida propios; referencian la variable:

```tsx
// ✅ así
<div className="rounded-[var(--r-lg)] bg-[var(--c-surface)] text-[var(--c-ink)]" />

// ❌ nunca así
<div className="rounded-2xl bg-white text-gray-900" />
```

Esto es lo que permitió, mientras existió el design lab, tener **7 direcciones visuales
distintas sobre los mismos componentes**: cada dirección sólo cambiaba el valor de las
variables. Con una sola dirección (STUDIO) la ventaja sigue siendo la misma: retematizar
es editar un archivo.

### 1.3 Badges/estados con mapeo de color fijo
Los estados de negocio (paso pendiente/en progreso/completado/bloqueado, viaje
abierto/confirmado/…, police check) tienen su **propio set de variables** (`--b-paso-*`,
`--b-viaje-*`, `--b-police-*`). El color de un estado es **el mismo en toda la app**.
Nunca se cambia "para que resalte" en una pantalla puntual.

---

## 2. Stack y configuración base

### Stack real (lo que importa para el diseño)
| Pieza | Versión | Rol |
|---|---|---|
| Next.js | 16 (App Router, Turbopack) | framework |
| React | 19 | UI |
| Tailwind CSS | **3.4** | utilidades (¡no v4! ver §8) |
| `clsx` + `tailwind-merge` | 2.x | helper `cn()` |
| `lucide-react` | 0.460 | íconos (línea, 16–20px) |
| `next/font/google` | — | fuentes self-hosted como CSS vars |
| PostCSS + autoprefixer | 8 / 10 | build de CSS |

No hay `@radix-ui/*`, ni `class-variance-authority`, ni `components.json`. La interacción
(dropdowns, toasts, dialogs) está hecha a mano con React + estado local + a11y nativa.

### `tailwind.config.ts` (copiable casi tal cual)

El config es deliberadamente **delgado**: no redefine la paleta en Tailwind (la paleta vive
en CSS vars). Sólo extiende fuentes, sombras (mapeadas a vars), radios y un "puente" de
colores legacy.

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // PUENTE de migración: clases viejas juk-* mapeadas a valores STUDIO.
        // En un proyecto nuevo podés borrar esto y usar sólo las CSS vars.
        "juk-navy": {
          50: "#eef9f5", 100: "#dcf2ec", 200: "#bfe6dd", 300: "#9fd9cf",
          400: "#5e6b67", 500: "#46b3a0", 600: "#339a88", 700: "#1f6f63",
          800: "#1b5f55", 900: "#173f3a", 950: "#21302d",
        },
        "juk-coral": {
          50: "#fff4ee", 100: "#ffe8dc", 400: "#ffc4a8",
          500: "#ff8a5b", 600: "#f5713e", 700: "#d65151",
        },
        "juk-gold": { 50: "#fdf6e9", 100: "#fdeccd", 500: "#f7b955", 600: "#d08a16" },
      },
      fontFamily: {
        display: ["var(--font-display)", '"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ["var(--font-body)", '"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", '"Space Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        xs: "var(--shadow-soft)", sm: "var(--shadow-1)", md: "var(--shadow-2)",
        lg: "var(--shadow-3)", focus: "var(--ring-focus)",
      },
      borderRadius: {
        DEFAULT: "10px", md: "10px", lg: "14px", xl: "20px", "2xl": "28px",
      },
    },
  },
  plugins: [],
};

export default config;
```

> Nota: la mayoría del código nuevo usa **arbitrary values con la var directa**
> (`rounded-[var(--r-lg)]`), no las clases del config. El config existe sobre todo para
> el puente legacy y para que `font-display`/`shadow-md` etc. existan.

---

## 3. Tokens — la fuente de verdad (STUDIO)

Este es el corazón. Copialo entero a tu CSS global. Está scopeado a `.v-studio` (la clase
se pone en `<body>`); también podés ponerlo en `:root` si no necesitás multi-tema.

```css
.v-studio {
  /* ── Tipografías (next/font sobreescribe estas vars en el wrapper) ── */
  --font-display: "Bricolage Grotesque", "Plus Jakarta Sans", system-ui, sans-serif;
  --font-body: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
  --font-mono: "Space Mono", "JetBrains Mono", ui-monospace, monospace;

  /* ── Paleta · Marca (teal cálido) ── */
  --c-brand: #1f6f63;        /* teal profundo y amistoso */
  --c-brand-700: #2a8576;
  --c-brand-600: #339a88;
  --c-brand-500: #46b3a0;
  --c-brand-300: #9fd9cf;
  --c-brand-100: #dcf2ec;
  --c-brand-50: #eef9f5;

  /* ── Paleta · Acentos (durazno coral + amarillo miel) ── */
  --c-accent: #ff8a5b;       /* durazno coral, el alma de STUDIO */
  --c-accent-600: #f5713e;
  --c-accent-300: #ffc4a8;
  --c-accent-soft: #ffe8dc;
  --c-honey: #f7b955;        /* amarillo miel, segundo acento */
  --c-honey-soft: #fdeccd;
  --c-berry: #e0608e;        /* baya, toques puntuales (estado "vencido") */
  --c-berry-soft: #fbe1ec;

  /* ── Superficies ── */
  --c-page: #fbf7f2;            /* crema cálido, base de la app */
  --c-surface: #ffffff;        /* tarjeta / panel */
  --c-surface-2: #f4ede4;      /* superficie hundida / header de tabla / chips */
  --c-surface-3: #faf3ea;      /* fila alterna / inputs en reposo */
  --c-surface-inverse: #173f3a;/* paneles oscuros (login, hero, sidebar) */
  --c-overlay: rgba(31, 111, 99, 0.05);

  /* Gradientes gentiles (permitidos en STUDIO) */
  --grad-brand: linear-gradient(135deg, #2a8576 0%, #1f6f63 60%, #173f3a 100%);
  --grad-warm: linear-gradient(135deg, #ff8a5b 0%, #f7b955 100%);
  --grad-page: radial-gradient(1200px 600px at 85% -10%, #fef0e6 0%, rgba(254,240,230,0) 55%),
               radial-gradient(900px 500px at -5% 110%, #e3f4ef 0%, rgba(227,244,239,0) 50%);

  /* ── Tinta (texto) ── */
  --c-ink: #21302d;            /* texto principal (verde-grisáceo casi negro) */
  --c-ink-muted: #5e6b67;      /* secundario */
  --c-ink-subtle: #94a09b;     /* terciario / placeholder */
  --c-ink-onbrand: #f4faf7;    /* texto sobre superficies oscuras/marca */
  --c-ink-onbrand-muted: #a9c8c0;
  --c-ink-onaccent: #5a2410;   /* texto sobre el durazno */

  /* ── Bordes ── */
  --c-border: #ece2d6;         /* hairline cálido */
  --c-border-strong: #d9cbb9;
  --c-border-brand: #9fd9cf;
  --c-ring: rgba(31, 111, 99, 0.12);

  /* ── Semánticos ── */
  --c-success: #2f9e6f;  --c-success-bg: #e2f5ec;
  --c-warning: #d08a16;  --c-warning-bg: #fbeecd;
  --c-danger:  #d65151;  --c-danger-bg:  #fbe4e2;
  --c-info:    #2f7fb8;  --c-info-bg:    #e2f0fa;
  --c-neutral: #6c7873;  --c-neutral-bg: #eee7dd;

  /* ── Badges · Estado de VIAJE ── */
  --b-viaje-abierta: var(--c-info);            --b-viaje-abierta-bg: var(--c-info-bg);
  --b-viaje-confirmado: var(--c-success);      --b-viaje-confirmado-bg: var(--c-success-bg);
  --b-viaje-en_curso: var(--c-accent-600);     --b-viaje-en_curso-bg: var(--c-accent-soft);
  --b-viaje-finalizado: var(--c-neutral);      --b-viaje-finalizado-bg: var(--c-neutral-bg);
  --b-viaje-cancelado: var(--c-danger);        --b-viaje-cancelado-bg: var(--c-danger-bg);

  /* ── Badges · Estado de PASO (flujos de tracking) ── */
  --b-paso-pendiente: var(--c-neutral);        --b-paso-pendiente-bg: var(--c-neutral-bg);
  --b-paso-en_progreso: var(--c-info);         --b-paso-en_progreso-bg: var(--c-info-bg);
  --b-paso-completado: var(--c-success);       --b-paso-completado-bg: var(--c-success-bg);
  --b-paso-bloqueado: var(--c-danger);         --b-paso-bloqueado-bg: var(--c-danger-bg);
  --b-paso-na: var(--c-ink-subtle);            --b-paso-na-bg: var(--c-overlay);
  --b-paso-vencido: var(--c-berry);            --b-paso-vencido-bg: var(--c-berry-soft);

  /* ── Badges · Police check ── */
  --b-police-pendiente: var(--c-neutral);      --b-police-pendiente-bg: var(--c-neutral-bg);
  --b-police-en_tramite: var(--c-warning);     --b-police-en_tramite-bg: var(--c-warning-bg);
  --b-police-aprobado: var(--c-success);       --b-police-aprobado-bg: var(--c-success-bg);
  --b-police-vencido: var(--c-danger);         --b-police-vencido-bg: var(--c-danger-bg);

  /* ── Escala tipográfica (fluida) ── */
  --t-display-1: clamp(2.5rem, 4.5vw, 3.75rem);
  --t-display-2: clamp(1.9rem, 3vw, 2.6rem);
  --t-h1: clamp(1.6rem, 2.4vw, 2.1rem);
  --t-h2: 1.4rem;
  --t-h3: 1.125rem;
  --t-body: 0.975rem;
  --t-small: 0.85rem;
  --t-label: 0.74rem;
  --t-mono: 0.8rem;

  --lh-tight: 1.08;  --lh-snug: 1.3;  --lh-body: 1.6;
  --ls-label: 0.04em;  --ls-tight: -0.02em;

  /* ── Espaciado ── */
  --sp-1: 0.25rem; --sp-2: 0.5rem; --sp-3: 0.75rem; --sp-4: 1rem;
  --sp-5: 1.5rem;  --sp-6: 2rem;   --sp-7: 3rem;    --sp-8: 4rem; --sp-9: 6rem;

  /* ── Radios (GRANDES: el sello de STUDIO) ── */
  --r-xs: 6px; --r-sm: 10px; --r-md: 14px; --r-lg: 20px; --r-xl: 28px; --r-pill: 999px;

  /* ── Sombras (difusas, suaves, teñidas de cálido) ── */
  --shadow-soft: 0 2px 8px rgba(33, 48, 45, 0.05);
  --shadow-1: 0 2px 10px rgba(33,48,45,0.06), 0 1px 3px rgba(33,48,45,0.04);
  --shadow-2: 0 12px 30px rgba(33,48,45,0.08), 0 3px 8px rgba(33,48,45,0.05);
  --shadow-3: 0 24px 60px rgba(23,63,58,0.14), 0 8px 18px rgba(33,48,45,0.06);
  --shadow-accent: 0 10px 24px rgba(255,138,91,0.32);
  --shadow-brand: 0 12px 28px rgba(31,111,99,0.28);
  --shadow-inset: inset 0 1px 0 rgba(255,255,255,0.7);

  --ring-focus: 0 0 0 4px rgba(31,111,99,0.18);
  --ring-accent: 0 0 0 4px rgba(255,138,91,0.22);
  --ring-error: 0 0 0 4px rgba(214,81,81,0.18);

  /* ── Misc ── */
  --hairline: 1px;
  --tap: 44px; /* target de toque mínimo (touch-first) */
}
```

### Identidad de STUDIO en una línea
- **Marca:** teal profundo `#1f6f63` (no azul corporativo, sino cálido y amistoso).
- **Acento:** durazno coral `#ff8a5b` → gradiente warm (durazno → miel). Es "el alma".
- **Base:** crema `#fbf7f2` con dos gradientes radiales sutiles fijos al viewport.
- **Tinta:** verde-grisáceo casi negro `#21302d` (nunca negro puro).
- **Radios grandes** (10–28px) y **sombras difusas teñidas de cálido**.
- **Touch-first:** `--tap: 44px` mínimo en todo lo clickeable.

---

## 4. Tipografía y fuentes

Tres familias, cargadas con `next/font/google` (self-hosted, sin FOUT) e inyectadas como
CSS vars que sobreescriben los fallbacks de `tokens.css`:

| Var | Familia | Uso | Pesos |
|---|---|---|---|
| `--font-display` | **Bricolage Grotesque** | títulos, números grandes, marca | 400–800 |
| `--font-body` | **Plus Jakarta Sans** | cuerpo, labels, todo lo demás | 400–700 |
| `--font-mono` | **Space Mono** | códigos (`UK-2026-JUL-LONDON`), DNI, fechas, métricas | 400/700 |

```tsx
// root layout (Next.js)
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Space_Mono } from "next/font/google";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400","500","600","700","800"], variable: "--font-display" });
const body    = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-body" });
const mono    = Space_Mono({ subsets: ["latin"], weight: ["400","700"], variable: "--font-mono" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className={`v-studio ${display.variable} ${body.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
```

**Cómo se aplica una fuente en un componente:** con la sintaxis arbitraria de family-name:

```tsx
<h1 className="font-[family-name:var(--font-display)] text-[length:var(--t-h1)] tracking-[var(--ls-tight)]">
```

---

## 5. El CSS global y el helper `cn`

### `src/styles/globals.css` (lo que carga el root layout)

```css
/* Fuente de verdad de los tokens. */
@import "./tokens.css";
@import "./animations.css"; /* keyframes de overlays/toasts */

@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  font-family: var(--font-body, system-ui, sans-serif);
  background: var(--c-page, #fbf7f2);
  color: var(--c-ink, #21302d);
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

/* Fondo con gradientes gentiles en toda la app. */
body.v-studio {
  background-color: var(--c-page);
  background-image: var(--grad-page);
  background-attachment: fixed;
}

* { box-sizing: border-box; }

/* Tailwind preflight resetea el cursor de los botones; lo forzamos a pointer. */
button:not(:disabled), [role="button"]:not(:disabled),
summary, label[for], select:not(:disabled) { cursor: pointer; }
```

### El helper `cn()` (igual al de shadcn)

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** clsx (condicionales) + tailwind-merge (resuelve conflictos px-2 px-4 → px-4). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

> Es **exactamente** el `cn` que usa shadcn/ui. Eso hace que cualquier componente shadcn
> que pegues sea compatible de entrada (sólo cambiás los colores a tus vars).

---

## 6. Biblioteca de componentes

Hoy hay **un solo lugar** con componentes: `src/components/ui/` — los **componentes
productivos** de la app (tipados, `forwardRef`, a11y, integrados con forms/tests).

El design lab tenía además una galería autocontenida de ~30 primitivos
(`src/app/design/shared/primitives.tsx`: Badge, Button, Card, Input, Select, Textarea,
Checkbox, Radio, Switch, Alert, Avatar, AvatarGroup, Breadcrumb, Chip, Divider, EmptyState,
Kbd, Pagination, Progress, Skeleton, Tooltip, ToastCard, AccordionItem, StatDelta, Timeline,
Segmented, Banner, SectionTitle). Se retiró junto con el lab; si la querés como kit inicial
para otro proyecto, está en el tag `design-lab-final` (`git show design-lab-final:juk-portal/src/app/design/shared/primitives.tsx`).

### 6.1 Inventario de `src/components/ui/` (lo productivo)

| Archivo | Exporta | Notas |
|---|---|---|
| `button.tsx` | `Button`, `buttonClasses`, tipos | 5 variantes, 4 tamaños, pill, `active:scale-0.97` |
| `link-button.tsx` | `LinkButton` | mismo look del Button sobre `<Link>` (reusa `buttonClasses`) |
| `field.tsx` | `Field`, `Label`, `Input`, `Textarea`, `Select`, `Checkbox`, `HelpText`, `ErrorText` | `Select` custom con `searchable`; `Field` inyecta `id` por a11y |
| `date-input.tsx` | `DateInput` | reemplaza `<input type=date>` nativo (DD/MM/AAAA) |
| `badge.tsx` | `Badge`, `StepBadge`, `TripBadge`, `MoraBadge` + tipos | badges atados a estados de negocio |
| `stat-card.tsx` | `StatCard`, `Alert` | KPIs del dashboard + avisos |
| `trip-card.tsx` | `TripCard` | tarjeta de viaje con foto |
| `step-strip.tsx` | `StepStrip`, `StepLegend`, `STEP_LABELS` | tira de pasos del tracking |
| `data-table.tsx` | `TableWrap`, `Table`, `THead`, `TBody`, `TR`, `TH`, `TD`, `StudentCell`, `CodeCell`, `DateCell`, `MoneyCell` | tabla + celdas tipadas |
| `app-shell.tsx` | `AppShell`, `SidebarLogo`, `SidebarNavSection`, `SidebarNavItem`, `SidebarUserChip`, `Breadcrumb`, `TopbarSearch` | layout autenticado |
| `page-header.tsx` | `PageHeader` | encabezado de página |
| `pagination.tsx` | `Pagination` | paginado (tablas >50 filas) |
| `confirm-dialog.tsx` | `ConfirmProvider`, `useConfirm` | reemplazo de `window.confirm` |
| `toast.tsx` | `ToastProvider`, `useToast` | stack de toasts |
| `skeleton.tsx` | `Skeleton`, `*Skeleton` por silueta | loading states (no spinners ad-hoc) |
| `globe-loader.tsx` | `GlobeLoader` | loader de marca (existe pero NO se usa en la app) |
| `index.ts` | barrel | re-exporta todo |

### 6.2 Button — anatomía (el patrón a copiar)

Es el ejemplo canónico de "componente que consume tokens":

```tsx
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "critical" | "danger";
export type ButtonSize = "sm" | "default" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:   "border-transparent bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)] hover:bg-[var(--c-brand-700)] focus-visible:shadow-[shadow:var(--ring-focus)]",
  secondary: "border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink)] shadow-[shadow:var(--shadow-soft)] hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)] focus-visible:shadow-[shadow:var(--ring-focus)]",
  ghost:     "border-transparent bg-transparent text-[var(--c-ink-muted)] hover:bg-[var(--c-overlay)] hover:text-[var(--c-ink)] focus-visible:shadow-[shadow:var(--ring-focus)]",
  critical:  "border-transparent bg-[image:var(--grad-warm)] text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)] hover:brightness-[1.03] focus-visible:shadow-[shadow:var(--ring-accent)]",
  danger:    "border-[var(--c-danger)] bg-[var(--c-surface)] text-[var(--c-danger)] hover:bg-[var(--c-danger-bg)] focus-visible:shadow-[shadow:var(--ring-error)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-[32px] px-3.5 text-[length:var(--t-label)]",
  default: "min-h-[36px] px-4 text-[length:var(--t-small)]",
  lg: "min-h-[var(--tap)] px-6 text-[length:var(--t-body)]",
  icon: "min-h-[36px] w-9 p-0 justify-center",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "default", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-pill)] border font-semibold",
    "transition-[transform,box-shadow,background-color,border-color,color] duration-150 active:scale-[0.97]",
    "focus-visible:outline-none disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100",
    variantClasses[variant], sizeClasses[size], className
  );
}
```

**Jerarquía de variantes (regla de uso):**
- `primary` → **una sola por pantalla**. Acción principal. Teal sólido.
- `critical` → gradiente warm. **Reservado** para confirmar-pago-final / commits duros. Si
  hay 2+ en una pantalla, rediseñá.
- `secondary` → outline. Cancelar / alternativa.
- `danger` → outline rojo. Destructivo (dar de baja, eliminar).
- `ghost` → bajo énfasis (acciones de fila, sidebar).

> Ojo: el Button de la galería del lab (tag `design-lab-final`) usaba una nomenclatura
> distinta (`primary | accent | ghost | outline`). El productivo es el de arriba
> (`primary | secondary | ghost | critical | danger`). Para un proyecto nuevo, elegí uno.

### 6.3 Badge — estados atados a negocio

`Badge` genérico (tones: `neutral|info|success|warning|danger|brand|critical`) + tres
componentes "bound" que garantizan consistencia de color: `StepBadge`, `TripBadge`,
`MoraBadge`. Base compartida:

```tsx
const badgeBase =
  "inline-flex items-center gap-1.5 rounded-[var(--r-pill)] px-3 py-1 " +
  "text-[length:var(--t-label)] font-semibold uppercase leading-none " +
  "tracking-[var(--ls-label)] whitespace-nowrap";
```

`StepBadge`/`TripBadge` leen las vars `--b-paso-*` / `--b-viaje-*` por estado, con un
puntito de color (`bg-current`). `MoraBadge` es coral sólido (más peso visual a propósito,
señala urgencia operativa).

### 6.4 Form controls (`field.tsx`)

Reglas de densidad del sistema de formularios:
- Una columna en angosto, dos columnas a >640px (`grid grid-cols-2 gap-4`).
- **Gap de 16px** entre campos (no 24px).
- Asterisco de requerido en **coral** (`--c-accent-600`) — "esto importa".
- Altura de control = `--tap` (44px).
- Foco = `--ring-focus` (halo teal); error = `--ring-error` (halo rojo) + borde danger.

`Field` es el wrapper compuesto: recibe `label/required/help/error` y un control hijo, le
**inyecta un `id` con `useId()`** y asocia el `<label htmlFor>` (a11y + testabilidad):

```tsx
<Field label="Nombre" required help="Como figura en el pasaporte">
  <Input value={name} onChange={(e) => setName(e.target.value)} />
</Field>
```

**`Select` custom (importante):** no usa el `<select>` nativo a la vista. Renderiza un
`<select>` **invisible** debajo (fuente de verdad para forms, `getByLabel` y
`selectOption` de Playwright) y una UI custom encima que lo espeja. Soporta `searchable`
(buscador con normalización de acentos), navegación por teclado (↑↓ Home End Esc Tab) y
roles ARIA (`listbox`/`option`). Patrón clave: al elegir, escribe el value en el select
nativo y despacha un `change` real, así React/forms/tests ven el mismo flujo que el nativo.

### 6.5 AppShell — layout autenticado

Grid `[256px_1fr]`: sidebar teal profundo (`--c-surface-inverse`) + topbar
(breadcrumb + search) + contenido scrolleable.

```tsx
<AppShell
  sidebar={<>
    <SidebarLogo />
    <SidebarNavSection title="Operación">
      <SidebarNavItem icon={<HomeIcon/>} label="Dashboard" active count={4} countUrgent />
      <SidebarNavItem icon={<UserIcon/>} label="Alumnos" count={62} />
      <SidebarNavItem icon={<MapIcon/>} label="Reportes" soon /> {/* badge "Pronto" */}
    </SidebarNavSection>
    <SidebarUserChip initials="FM" name="Felix Mir" role="Sales · Admin" />
  </>}
  topbar={<>
    <Breadcrumb items={[{ label: "Operación" }, { label: "Dashboard" }]} />
    <TopbarSearch />
  </>}
>
  {/* contenido */}
</AppShell>
```

Detalles del sidebar: ítem activo lleva una barrita coral a la izquierda
(`-left-5 w-[3px] bg-[var(--c-accent)]`), badges de conteo en mono, hover `bg-white/5`,
estado `soon` con pill "Pronto" y `opacity-60`. El logo "J" usa el gradiente warm.

---

## 7. Patrones y convenciones para replicar

### 7.1 La sintaxis de arbitrary values (clave en Tailwind v3)
| Querés… | Escribís | Por qué |
|---|---|---|
| color de fondo | `bg-[var(--c-surface)]` | directo |
| color de texto | `text-[var(--c-ink)]` | directo |
| **tamaño de fuente** | `text-[length:var(--t-body)]` | sin `length:` Tailwind lo toma como **color** |
| **sombra** | `shadow-[shadow:var(--shadow-1)]` | el hint `shadow:` evita ambigüedad |
| gradiente como fondo | `bg-[image:var(--grad-warm)]` | hint `image:` |
| familia tipográfica | `font-[family-name:var(--font-display)]` | hint `family-name:` |
| radio | `rounded-[var(--r-lg)]` | directo |
| tracking | `tracking-[var(--ls-tight)]` | directo |
| min-height tap | `min-h-[var(--tap)]` | directo |

> **Gotcha #1 (data hint):** `text-[var(--x)]` compila como **color**, no como tamaño.
> Para tamaño SIEMPRE `text-[length:var(--x)]`. Igual `shadow:` para sombras y `image:`
> para gradientes.
>
> **Gotcha #2 (guión bajo):** en Tailwind v3 el `_` dentro de un arbitrary value se
> convierte en espacio. Si una var tiene `_` (ej. `--b-paso-en_progreso`), hay que
> **escaparlo**: `text-[var(--b-paso-en\\_progreso)]`. (Visible en `badge.tsx`.)

### 7.2 Reglas duras del proyecto (las "que NO hacemos")
- ❌ Inline styles para cosas tematizables (salvo cuando el valor es 100% dinámico, ej.
  `style={{ backgroundColor: fg }}` en badges con color calculado).
- ❌ `window.confirm` / `window.prompt` → `useConfirm()`.
- ❌ `<input type="date">` nativo → `<DateInput>`.
- ❌ `<select>` nativo suelto → `<Select>` (con `searchable` si la lista es larga).
- ❌ Tablas sin paginar cuando pueden superar 50 filas → `<Pagination>`.
- ❌ Spinners ad-hoc → skeletons por silueta de pantalla.
- ❌ Cambiar el color de un estado de negocio en una sola pantalla.
- Comentarios sólo para el **porqué** no-obvio (el código es la doc).

### 7.3 Microinteracciones que dan el "feel"
- Botones: `active:scale-[0.97]` + transición de 150ms.
- Tarjetas de viaje: `hover:-translate-y-1` + sube la sombra; la foto hace `scale-105`.
- Foco visible siempre con halo (`--ring-focus` teal / `--ring-error` rojo), nunca outline
  del browser.
- Chevrons/acordeones rotan 180° en open.
- Gradiente warm reservado para acentos de acción (CTA accent/critical, barras de progreso,
  banners, el logo).

### 7.4 Convención de datos visuales
- Códigos, DNI, fechas y métricas en **mono** (`--font-mono`).
- Fechas **DD/MM/AAAA** (Argentina).
- Estados con **punto de color** + label en MAYÚSCULA tracking ancho.
- Avatares: iniciales sobre fondo de hue rotativo (4 hues: brand/accent/honey/berry).

---

## 8. Shadcn — la historia honesta

Esto importa para no perder tiempo en el proyecto nuevo:

**Shadcn NO está instalado en el JUK Portal.** No hay `components.json`, ni `@radix-ui/*`,
ni `class-variance-authority`. Lo que existe es:

1. **Una dirección visual "shadcn" que existió en el design lab** (hoy solo en el tag
   `design-lab-final`, `src/app/design/shadcn/tokens.css`): reproducía con tokens el look de
   `shadcn init --preset b0` (estilo *nova*, tema neutral): blanco + escala neutral, primary
   casi negro `#171717`, **Inter** en todo, `--radius: 0.625rem` (10px) y derivados, sombras
   sutiles, densidad compacta (botón h-9 = 36px). Servía como **punto de comparación
   neutral** frente a STUDIO. Era sólo CSS vars sobre las mismas pantallas.

2. **El helper `cn()` idéntico al de shadcn** (`clsx` + `tailwind-merge`) — §5. Esto es lo
   que hace el sistema **compatible** con shadcn.

3. **Hay un MCP de shadcn-studio configurado** en el harness (para traer bloques/temas),
   pero los componentes productivos del portal están hechos a mano.

### Por qué shadcn no se instaló (¡leelo antes de instalarlo en el proyecto nuevo!)
La CLI de **shadcn moderna asume Tailwind v4** (tokens en `@theme`, `oklch`, `@import
"tailwindcss"`). El JUK Portal corre **Tailwind v3.4**. Correr `shadcn init` rompió el build
y se revirtió. Conclusión práctica:

- Si en el proyecto nuevo querés **usar shadcn de verdad** → arrancá con **Tailwind v4** y
  dejá que shadcn maneje sus tokens en `@theme`; después remapeás los colores de shadcn a la
  paleta STUDIO (teal/durazno) editando las vars `--primary`, `--background`, etc.
- Si querés **el look STUDIO tal cual está acá** → quedate en Tailwind v3.4 con el sistema de
  tokens de este documento. No necesitás shadcn; los componentes de §6 ya te dan el catálogo.

> Recomendación: para clonar la UX del portal, **no instales shadcn**. Copiá los tokens +
> los componentes de `src/components/ui/` + `cn`. Si más adelante querés sumar un componente complejo de
> shadcn (ej. command palette, date picker con Radix), migrá a Tailwind v4 primero y
> remapeá colores a las vars STUDIO.

---

## 9. El Design Lab (historia; ya no está en el repo)

Durante el diseño el repo tuvo un **laboratorio de direcciones visuales** en `/design`,
pensado para comparar estéticas sobre las mismas pantallas ancla (Dashboard, ABM, Detalle
de viaje, Login). **Se retiró** una vez elegida STUDIO: no hay ruta `/design`, ni
`src/app/design/`, ni las otras direcciones. Todo eso quedó congelado en el commit
taggeado **`design-lab-final`** (`git checkout design-lab-final` para verlo). Esta sección
queda como contexto por si querés portar el patrón multi-tema.

Estructura que tenía:
```
src/app/design/
├── variants.ts          ← registro de las 7 direcciones
├── page.tsx             ← índice del lab
├── shared/              ← SECCIONES grandes, agnósticas de dirección
│   ├── primitives.tsx   ← ~30 componentes autocontenidos (LA galería)
│   ├── interactive.tsx  ← componentes con estado (SelectMenu, etc.)
│   ├── gallery.tsx, pagos.tsx, seguimiento.tsx, pantallas*.tsx
│   └── animations.css   ← keyframes (overlays/toasts/carousel)
├── studio/   tokens.css + page.tsx   ← ★ la dirección PRODUCTIVA
├── console/  tokens.css + …          ← power-tool denso (indigo, radios crisp)
├── shadcn/   tokens.css + …          ← base neutral shadcn (referencia)
├── editorial/ marino/ puerto/ autor/ ← otras exploraciones
```

Las 7 direcciones (cada una era un archivo de tokens; las **shared** se restilaban solas
según las vars):

| Slug | Carácter |
|---|---|
| **studio** ★ | Cálido, redondeado, touch-first. **La que usa la app.** |
| console | Denso/operativo, gris-frío + indigo eléctrico, radios chicos crisp |
| editorial | Premium, mucho aire, display serif |
| marino | JUK sobrio: navy + oro sobre blanco |
| puerto | Navy con presencia, oro de acento |
| autor | Diseño de autor, anti-estética-genérica-IA |
| shadcn | Base neutral de shadcn/ui (blanco + neutral, Inter) |

**Cómo funcionaba el multi-tema:** cada dirección scopeaba sus tokens a `.v-<slug>`
(`.v-studio`, `.v-console`, …). Las secciones compartidas usaban una **convención común** de
nombres (`--c-page`, `--t-h1`, `--b-paso-*`, …); las direcciones con otra paleta
(ej. console con su `--c-bg`/`--c-brand` indigo) **mapeaban 1:1** esa convención al final de
su `tokens.css`. Por eso un mismo componente se veía coherente en las 7.

Si en tu proyecto nuevo querés **una sola estética**, quedate con `src/styles/tokens.css`.
Si querés **poder cambiar de tema**, copiá el patrón `.v-<slug>` + convención común desde
el tag.

---

## 10. Checklist para arrancar el proyecto nuevo

1. `create-next-app` (App Router, TS strict).
2. Instalar: `tailwindcss@^3.4 postcss autoprefixer clsx tailwind-merge lucide-react`.
3. `npx tailwindcss init -p` → reemplazar config por el de §2.
4. Crear `src/styles/globals.css` con el `@import` de tokens + `@tailwind` + el bloque
   `html,body` y el fix de cursor (§5).
5. Crear `src/styles/tokens.css` con el bloque completo de §3, scopeado a `.v-studio`, y
   `src/styles/animations.css` con los keyframes.
6. Cargar las 3 fuentes con `next/font` en el root layout y poner
   `className="v-studio ..."` en `<body>` (§4).
7. Crear `src/lib/utils/cn.ts` (§5).
8. Ir trayendo de `src/components/ui/` los productivos que quieras (o, como kit inicial
   más liviano, la galería `shared/primitives.tsx` del tag `design-lab-final`).
9. Verificar el primer componente: un `<Button>` y un `<Badge>` deberían verse idénticos al
   portal. Si el texto sale del color equivocado, revisá el gotcha `length:`/`shadow:` (§7.1).

### Archivos a copiar literalmente (rutas en este repo)
- `juk-portal/src/styles/tokens.css` — **los tokens** (imprescindible).
- `juk-portal/tailwind.config.ts` — config (sacá el puente `juk-*` si no lo necesitás).
- `juk-portal/src/styles/globals.css` — CSS global.
- `juk-portal/src/lib/utils/cn.ts` — helper.
- `juk-portal/src/styles/animations.css` — keyframes.
- `juk-portal/src/components/ui/*` — componentes productivos.
- (en el tag `design-lab-final`) `juk-portal/src/app/design/shared/primitives.tsx` — galería de ~30 componentes autocontenidos.

---

## Apéndice · Tabla rápida de tokens más usados

| Token | Valor | Dónde se usa |
|---|---|---|
| `--c-brand` | `#1f6f63` | botón primario, links, foco, acentos |
| `--c-accent` / `--grad-warm` | `#ff8a5b` / durazno→miel | CTA accent/critical, progreso, banners, logo |
| `--c-page` | `#fbf7f2` | fondo de la app |
| `--c-surface` | `#ffffff` | cards/paneles |
| `--c-surface-2` | `#f4ede4` | headers de tabla, chips, hundidos |
| `--c-surface-inverse` | `#173f3a` | sidebar, login, heros oscuros |
| `--c-ink` / `--c-ink-muted` / `--c-ink-subtle` | `#21302d` / `#5e6b67` / `#94a09b` | jerarquía de texto |
| `--c-border` / `--c-border-strong` | `#ece2d6` / `#d9cbb9` | hairlines / inputs |
| `--r-md` / `--r-lg` / `--r-pill` | 14 / 20 / 999px | inputs / cards / botones-badges |
| `--shadow-1` / `--shadow-2` | difusas cálidas | cards / hover-elevación |
| `--ring-focus` | halo teal | foco de todo control |
| `--tap` | 44px | altura mínima clickeable |
| `--t-body` / `--t-small` / `--t-label` | 0.975 / 0.85 / 0.74rem | cuerpo / secundario / labels |

---

*Generado desde el código del JUK Portal (Tailwind v3.4, Next 16, dirección STUDIO).
Para ajustar la estética entera, editás un solo archivo: `src/styles/tokens.css`.*
