# Sistema de diseño STUDIO — JUK Portal

Referencia del sistema de diseño del portal: de dónde salen los colores y medidas, qué componentes
hay, las reglas de mobile y accesibilidad, y cómo llevarlo a otro proyecto.

- **Fuente de verdad de los tokens:** `src/styles/tokens.css`. Este doc los resume.
- **Sincronía:** todo cambio en `src/components/ui/**` o `src/styles/**` actualiza este doc **en el
  mismo cambio** (regla de sincronía del `CLAUDE.md` de la raíz del workspace; la verifica
  `/juk-cierre`). Si encontrás que este doc y el código difieren, el código dice lo que pasa hoy y
  el doc se corrige ya, no "después".
- **Componentes:** `src/components/ui/`. El barrel `index.ts` cubre los primitivos; `form-errors`,
  `popover-position`, `use-scroll-lock` y los `Familia*Skeleton` no están en el barrel y se importan
  por su ruta (`@/components/ui/form-errors`).
- **Reglas de uso al programar** (qué no se hace, qué componente reemplaza a qué nativo):
  `juk-portal/CLAUDE.md`, sección "UI y sistema de diseño".

La dirección visual se llama **STUDIO**: cálida, redondeada y pensada primero para el dedo. Es la
única. Las otras direcciones que se exploraron vivían en un Design Lab que se retiró en septiembre
de 2026 (ADR-015 en `docs/architecture.md`); quedan en el tag `design-lab-final`.

---

## 1. Modelo mental

1. **Token-first.** Un solo archivo de custom properties (`--c-*` color, `--t-*` tipografía, `--r-*`
   radios, `--shadow-*`, `--sp-*` espaciado) scopeado a `.v-studio`, que el root layout pone en el
   `<body>`. Color, tipografía, radios y sombras salen de las variables, con valores arbitrarios de
   Tailwind (`bg-[var(--c-surface)]`, `rounded-[var(--r-lg)]`). Cambiar un valor en `tokens.css`
   restila toda la app: back-office, Portal de Familias y sitio público.
   Quedan **excepciones puntuales** que no siguen a los tokens y la guarda de lint no marca (solo
   mira la paleta default, los hex y `juk-*`): `text-4xl` en el número de `StatCard`, `text-[13px]`
   en el glifo de `Alert` y de `Toast`, `text-xl` en el emoji de `ConfirmDialog`, `text-[15px]` en
   la marca del drawer, el velo `bg-black/50` del drawer del back-office y el
   `bg-[rgba(23,63,58,0.35)]` (es `--c-surface-inverse` con transparencia, escrito a mano) de
   `ConfirmDialog` y del diálogo de registrar pago. No sumes nuevas.
2. **Los estados de negocio tienen color fijo.** Viaje, paso y police check usan su propio set de
   variables (`--b-viaje-*`, `--b-paso-*`, `--b-police-*`). Un estado se ve igual en toda la app;
   nunca se cambia en una pantalla "para que resalte".
3. **Touch-first.** Todo lo tocable mide al menos 44 px (`--tap`), la densidad de escritorio es la
   excepción, y la app tiene que funcionar dentro de la WebView de Capacitor (ADR-010).

## 2. Stack de diseño

| Pieza | Rol |
|---|---|
| Tailwind CSS **3.4** | Utilidades. No v4: ver §11 |
| `clsx` + `tailwind-merge` | Helper `cn()` en `src/lib/utils/cn.ts` (el mismo de shadcn) |
| `next/font/google` | Bricolage Grotesque, Plus Jakarta Sans y Space Mono, inyectadas como variables |
| React | Toda la interacción (popovers, diálogos, toasts) hecha a mano con a11y nativa |

No hay Radix, class-variance-authority, shadcn ni librería de íconos. Los íconos son SVG inline
donde se usan (los shells, `date-input.tsx`, `field.tsx`, `trip-card.tsx`,
`components/admin/logout-button.tsx` y varias páginas y secciones del sitio público);
`ConfirmDialog` usa emoji (`TONE_ICONO`) y `Alert` glifos de texto (`ALERT_STYLES`).

`tailwind.config.ts` es deliberadamente delgado: extiende fuentes, sombras (mapeadas a variables) y
radios, y conserva un **puente de migración** `juk-navy/coral/gold-*` con hex congelados. Al
11/09/2026 ese puente tiene **0 usos** en `src/` (el comentario del config que habla de "32 usos"
quedó viejo): se puede borrar (§12). Ojo con los radios y sombras con nombre del config: ver §6.

## 3. Tokens

Resumen por grupo. Los valores exactos están en `src/styles/tokens.css`.

### Color

| Grupo | Tokens | Valores clave |
|---|---|---|
| Marca | `--c-brand`, `--c-brand-50…700` | Teal profundo `#1f6f63` |
| Acentos | `--c-accent` (durazno `#ff8a5b`), `--c-accent-600/300/soft`, `--c-honey` (miel), `--c-berry` (baya) | `--grad-warm`: durazno → miel |
| Superficies | `--c-page` (crema `#fbf7f2`), `--c-surface`, `--c-surface-2/3`, `--c-surface-inverse` (`#173f3a`), `--c-overlay` | `--grad-page` (dos radiales fijos al viewport), `--grad-brand` |
| Tinta | `--c-ink` (`#21302d`, nunca negro puro), `--c-ink-muted`, `--c-ink-subtle`, `--c-ink-onbrand(-muted)`, `--c-ink-onaccent` | |
| Bordes | `--c-border`, `--c-border-strong`, `--c-border-brand`, `--c-ring` | |
| Semánticos | `--c-success`, `--c-warning`, `--c-danger` (+ `--c-danger-700` para hover del botón destructivo sólido), `--c-info`, `--c-neutral`, cada uno con su `-bg` | |

### Estados de negocio

| Set | Estados |
|---|---|
| `--b-viaje-*` | `abierta` (para el estado `inscripcion_abierta`), `confirmado`, `en_curso`, `finalizado`, `cancelado` |
| `--b-paso-*` | `pendiente`, `en_progreso`, `completado`, `bloqueado`, `na`, `vencido` |
| `--b-police-*` | `pendiente`, `en_tramite`, `aprobado`, `vencido` |

Cada estado tiene el color del texto y su fondo (`-bg`). El mapeo estado → token está en
`components/ui/badge.tsx` (`TripBadge`, `StepBadge`).

### Tipografía

- La raíz es de **14 px** (`globals.css`); la escala está calibrada para que **ningún token baje de
  12 px**, el piso legible en un teléfono:

  | Token | Valor | Equivale a |
  |---|---|---|
  | `--t-body` | `1rem` | 14 px |
  | `--t-small` | `0.9rem` | 12,6 px |
  | `--t-label` | `0.86rem` | 12 px |
  | `--t-mono` | `0.86rem` | 12 px |
  | `--t-h3` / `--t-h2` | `1.125rem` / `1.4rem` | |
  | `--t-h1`, `--t-display-1/2` | `clamp()` fluidos | |

- Interlineados `--lh-tight/snug/body`; tracking `--ls-label` y `--ls-tight`.

### Espacio, forma y profundidad

- Espaciado `--sp-1` (0,25 rem) a `--sp-9` (6 rem).
- Radios grandes, el sello de STUDIO: `--r-xs` 6 · `--r-sm` 10 · `--r-md` 14 · `--r-lg` 20 ·
  `--r-xl` 28 · `--r-pill`.
- Sombras difusas teñidas de cálido: `--shadow-soft`, `--shadow-1/2/3`, `--shadow-accent`,
  `--shadow-brand`, `--shadow-danger`, `--shadow-inset`.
- Foco: `--ring-focus` (halo teal), `--ring-accent`, `--ring-error`.

### Touch y dispositivo

| Token | Valor | Para qué |
|---|---|---|
| `--tap` | 44 px | Alto/ancho mínimo de todo lo tocable |
| `--safe-top/bottom/left/right` | `env(safe-area-inset-*, 0px)` | Notch y barra de gestos. El root layout declara `viewportFit: "cover"` por Capacitor; en escritorio resuelven a 0, así que se usan siempre |
| `--bottom-nav-h` | 0 px | Alto de una navegación inferior fija, si un shell la monta: los toasts se corren hacia arriba |

Uso desde Tailwind, sin espacios dentro del valor: `pt-[var(--safe-top)]`,
`pb-[calc(1rem+var(--safe-bottom))]`, `px-[max(1rem,var(--safe-left))]`.

### Assets de marca

`--img-login` y `--grad-login-veil` (panel del login).

## 4. Fuentes

| Variable | Familia | Uso |
|---|---|---|
| `--font-display` | Bricolage Grotesque | Títulos, números grandes, marca |
| `--font-body` | Plus Jakarta Sans | Todo el resto |
| `--font-mono` | Space Mono | Códigos de viaje, DNI, fechas, métricas |

Se cargan con `next/font/google` en `src/app/layout.tsx` y sobreescriben los fallbacks de
`tokens.css`. En un componente: `font-[family-name:var(--font-display)]` (o las clases `font-display`,
`font-sans`, `font-mono` del config).

## 5. CSS global

**`src/styles/globals.css`** (lo carga el root layout):

- Importa `tokens.css` y `animations.css` (keyframes `studio-fade`, `studio-pop`,
  `studio-slide-left`, `studio-toast`, `studio-slide-up` de overlays y toasts), sin `@import`
  externos.
- `html, body` a 14 px con la fuente de cuerpo; `body.v-studio` pinta el fondo con `--grad-page`.
- **Piso de 16 px en controles de formulario por debajo de 1024 px.** Safari iOS (y la WebView de
  Capacitor) hacen zoom al enfocar un campo con fuente menor a 16 px y no lo deshacen al salir. La
  regla cubre `input` (menos checkbox, radio y file), `select` y `textarea`, también en el sitio
  público. **Lleva `!important` a propósito:** en una lista de selectores cada uno tiene su propia
  especificidad, y `textarea` a secas pierde contra cualquier utilidad de tamaño de Tailwind que
  aplique el componente; sin `!important` el control volvía a 13 px y el zoom reaparecía. No se
  pisa desde un componente.
- Cursor `pointer` en todo lo clickeable (el preflight de Tailwind lo resetea).

**`src/app/(public)/landing.css`** (solo el sitio público, lo importa `(public)/layout.tsx`): keyframes
propios (`landing-marquee`, `landing-rise`, `landing-drift`, `landing-dash`, `landing-ping`) y el
**único** bloque `prefers-reduced-motion` del repo. Las animaciones de `animations.css` no respetan
reduced motion (§12).

## 6. Tailwind v3 con variables: las trampas

| Querés | Escribís | Por qué |
|---|---|---|
| Color de texto o fondo | `text-[var(--c-ink)]`, `bg-[var(--c-surface)]` | Directo |
| **Tamaño de fuente** | `text-[length:var(--t-body)]` | Sin `length:`, Tailwind lo compila como **color** |
| **Sombra** | `shadow-[shadow:var(--shadow-1)]` | El hint evita la ambigüedad |
| Gradiente | `bg-[image:var(--grad-warm)]` | Hint `image:` |
| Familia | `font-[family-name:var(--font-display)]` | Hint `family-name:` |
| Radio, tracking, alto táctil | `rounded-[var(--r-lg)]`, `tracking-[var(--ls-tight)]`, `min-h-[var(--tap)]` | Directo |

- **Guión bajo:** dentro de un valor arbitrario `_` se compila como espacio. Si el nombre del token
  lo lleva, se escapa: `text-[var(--b-paso-en\\_progreso)]` (ver `badge.tsx`).
- **El JIT de Tailwind lee el texto de los archivos, comentarios incluidos.** Una clase armada por
  interpolación (`` `bg-${tono}` ``) no se genera nunca. Y al revés: un comentario que muestre esa
  interpolación como ejemplo también la escanea; eso ya rompió un build. Por eso los componentes
  usan **mapas con la clase completa como string literal** (`sizeClasses` en `button.tsx`, los tonos
  de `confirm-dialog.tsx` y `toast.tsx`) y los comentarios describen la regla sin escribir la clase
  interpolada.
- **La raíz de 14 px achica toda la escala en `rem` de Tailwind un 12,5 %.** `gap-4` son 14 px (no
  16), `h-9`/`w-9` son 31,5 px (no 36), `text-4xl` son 31,5 px. Cualquier medida que pienses en px
  con las utilidades por defecto sale más chica. Por eso lo táctil usa `--tap` en px y las alturas
  de escritorio de `Button` están en px (`min-h-[36px]`).
- **Los radios y sombras con nombre del config no son los tokens.** `tailwind.config.ts` define
  `rounded` / `rounded-md` = 10 px, `rounded-lg` = 14 px, `rounded-xl` = 20 px, `rounded-2xl` =
  28 px: quien escribe `rounded-lg` pensando en `--r-lg` (20 px) obtiene 14 px. Y `shadow-xs/sm/md/lg`
  y `shadow-focus` se remapean a `--shadow-soft`, `--shadow-1/2/3` y `--ring-focus`. Hoy casi no se
  usan (tres `rounded` sueltos en `prospectos/importar/`): usá siempre `rounded-[var(--r-*)]` y
  `shadow-[shadow:var(--shadow-*)]`.

## 7. Mobile y touch

- **44 px en todo lo tocable.** `Button` mide `min-h-[var(--tap)]` en todos los tamaños; la densidad
  de escritorio (`min-h` de 32 px para `sm` y de 36 px para `default` e `icon`; el ancho de `icon`
  es `w-9`, 31,5 px con la raíz de 14 px, así que no es cuadrado) se aplica solo con
  `lg:[@media(pointer:fine)]`: pantalla grande **y** puntero fino. Una notebook táctil conserva los
  44 px. `Pagination` sigue la misma regla (`h-9`/`w-9` en escritorio). `Checkbox` (`field.tsx`)
  también mide `min-h-[var(--tap)]`.
- **Tablas como tarjetas en el teléfono.** `<Table responsive>` (`data-table.tsx`) convierte la tabla
  en una lista de tarjetas por debajo de 640 px: el encabezado se oculta y cada celda muestra su
  rótulo, que sale de `<TD label="…">` (pasale a cada celda el mismo texto que su `<TH>`). Las celdas
  de acciones van sin `label` y se alinean con `className="max-sm:justify-end"`. Todos los elementos
  declaran su rol ARIA explícito porque `display: block` borra los roles implícitos de tabla; en modo
  tarjeta el nombre accesible de la celda incluye el rótulo, así que un test mobile filtra con
  `hasText`.
- **Popovers en un portal con posición medida.** El panel de `Select` y el calendario de `DateInput`
  se montan en `document.body`, así no los recorta una tabla ni un contenedor con overflow. La
  geometría es pura y testeada (`popover-position.ts`): abre hacia abajo o hacia arriba según el
  espacio, se acota al viewport con 16 px de margen y nunca baja de 160 px de alto. Los valores
  medidos viajan como custom properties (`--pop-x`, `--pop-y`, `--pop-w`, `--pop-h`).
- **Bloqueo de scroll que funciona en iOS** (`use-scroll-lock.ts`). `overflow: hidden` en el body no
  alcanza en Safari: el gesto sigue scrolleando el documento. El hook fija el body con
  `position: fixed` desplazado el scroll actual y lo restaura al cerrar; cuenta bloqueos anidados
  (drawer + confirmación). Lo usan `ConfirmDialog`, el drawer del back-office (`admin-shell.tsx`), el
  diálogo de registrar pago (`pagos/registrar-pago-dialog.tsx`) y el menú mobile del sitio público
  (`(public)/mobile-menu.tsx`).
- **Drawer del back-office** (`components/admin/admin-shell.tsx`): fondo `inert`, Escape para
  cerrar, foco atrapado adentro y devuelto al botón que lo abrió.
- **Safe area** en todo lo que toca un borde: overlays (`ConfirmDialog`, `Toast`, el diálogo de
  registrar pago, el drawer del back-office), los headers de los dos shells, la subnav del viaje
  (`viajes/[id]/subnav-viaje.tsx`) y el padding inferior del contenido de los dos shells.

## 8. Componentes (`src/components/ui/`)

| Archivo | Exporta | Notas |
|---|---|---|
| `button.tsx` | `Button`, `buttonClasses` | Variantes: `primary` (una por pantalla), `secondary`, `ghost`, `critical` (gradiente warm, reservado a compromisos duros como confirmar el último pago), `danger` (outline), `danger-solid` (la confirmación final de una acción destructiva). Tamaños `sm`, `default`, `lg`, `icon` con la regla de §7 |
| `link-button.tsx` | `LinkButton` | El mismo look sobre `<Link>` |
| `field.tsx` | `Field`, `Label`, `Input`, `Textarea`, `Select`, `Checkbox`, `HelpText`, `ErrorText` | `Field` inyecta el `id` y asocia label, ayuda (`aria-describedby`) y error (`aria-invalid`). `Select`: ver §9 |
| `date-input.tsx` | `DateInput` | Reemplaza el `<input type="date">` nativo: ver §9 |
| `form-errors.tsx` | `useErroresDeFormulario`, `AvisoErrores` | Estado de errores por campo, foco al primer control inválido y anuncio en una región viva. Fuera del barrel |
| `badge.tsx` | `Badge`, `StepBadge`, `TripBadge`, `MoraBadge` | Badges atados a estados de negocio. `StepBadge` cubre 5 estados (sin `vencido`: §12) |
| `stat-card.tsx` | `StatCard`, `Alert` | `StatCard` con `href` convierte la card entera en link al listado filtrado. `Alert` con niveles `critical`, `warning`, `info`, `success` |
| `trip-card.tsx` | `TripCard` | Tarjeta de viaje del dashboard (`dashboard/sections.tsx`): `TripBadge`, fechas, colegio, inscriptos/cupo y barra de progreso (`progressMode` `completion` con `--grad-brand` o `minimum` con `--grad-warm`). Sin foto |
| `empty-state.tsx` | `EmptyState` | Ver §10 |
| `data-table.tsx` | `TableWrap`, `Table`, `THead`, `TBody`, `TR`, `TH`, `TD`, `CodeCell`, `DateCell`, `CLASES_MODO_CARD` | Tabla densa con modo tarjeta (§7). La plata se formatea con `formatMonto` del dominio de cuotas, no con una celda |
| `page-header.tsx` | `PageHeader` | Título, subtítulo y acciones |
| `section-title.tsx` | `SectionTitle`, `sectionTitleClasses` | Ver §10 |
| `pagination.tsx` | `Pagination` | Obligatoria en tablas que pueden superar 50 filas |
| `confirm-dialog.tsx` | `ConfirmProvider`, `useConfirm` | Reemplazo de `window.confirm`. Tonos `danger`, `warning`, `brand`; campo de texto opcional (motivo). El foco entra en el control seguro, Tab cicla adentro (`indiceFocoTrap` es puro y testeado), Escape cancela, el scroll del fondo queda bloqueado y al cerrar vuelve el foco a quien lo abrió. Lo montan los dos shells |
| `toast.tsx` | `ToastProvider`, `useToast` | Pila de avisos con safe area y `--bottom-nav-h`. Lo montan los dos shells |
| `skeleton.tsx` | `Skeleton`, piezas y siluetas por pantalla | Piezas: `PageHeaderSkeleton`, `FiltersSkeleton`. Siluetas: `ListPageSkeleton`, `PagosPageSkeleton`, `PanelSkeleton`, `FormPageSkeleton`, `ConfigSkeleton`, `FichaAlumnoSkeleton`, `ViajeDetalleSkeleton` y las del portal de familias (`FamiliaResumenSkeleton`, `FamiliaDocumentacionSkeleton`, `FamiliaPagosSkeleton`, `FamiliaViajeSkeleton`, `FamiliaDatosSkeleton`, que no están en el barrel) |
| `globe-loader.tsx` | `GlobeLoader` | Loader de marca. **No se usa** en la app (decisión 12/06/2026) |
| `popover-position.ts` | `posicionarPopover`, `clasesPopover`, `varsPopover`, `medirPopover` | Geometría de los popovers (§7). Fuera del barrel |
| `use-scroll-lock.ts` | `useScrollLock` | Bloqueo de scroll (§7). Fuera del barrel |

Fuera de `ui/`, parte del sistema:

- **`useUnsavedChanges(dirty)`** (`src/lib/hooks/use-unsaved-changes.ts`): mientras el form tiene
  cambios sin guardar, registra `beforeunload` para que el navegador pida confirmación al cerrar o
  recargar. Lo usan los forms de alta y edición (alumno, colegio, viaje, group leader, prospecto,
  usuario, mails de configuración). No intercepta la navegación interna con `<Link>`.
- **Shells.** `components/admin/admin-shell.tsx`: sidebar en escritorio, header y drawer en el
  teléfono, breadcrumb con los rótulos de `breadcrumb-labels.ts`. `app/familias/_shell.tsx`: sidebar
  con el gradiente de marca en escritorio y, en el teléfono, header con pestañas que se desplazan
  solas hasta la activa. Los dos montan `ConfirmProvider` y `ToastProvider`: un `useConfirm()` o
  `useToast()` fuera de esos shells (sitio público, login, `baja/`) tira error porque no hay
  provider. Hoy ninguna de esas superficies los usa.

**Loading:** siempre skeletons con la silueta de la pantalla, en el `loading.tsx` del segmento. Nada
de spinners ad-hoc.

## 9. Controles de formulario

- **Densidad:** una columna en angosto, dos a partir de 640 px (`grid-cols-1 sm:grid-cols-2`);
  `gap-4` entre campos, que son 14 px porque la raíz es de 14 px; asterisco de requerido en
  `--c-accent-600`; foco con `--ring-focus`, error con `--ring-error` y borde danger.
- **`Select`:** debajo hay un `<select>` nativo invisible que sigue siendo la fuente de verdad (forms,
  `getByLabel` y `selectOption` de Playwright); encima, la UI propia que lo espeja. Al elegir,
  escribe el valor en el nativo y despacha un `change` real, así React, los forms y los tests ven el
  mismo flujo. Soporta `searchable` (búsqueda sin acentos), teclado (↑ ↓ Home End Esc Tab) y roles
  `listbox`/`option`. El panel va en un portal (§7). El `<select>` nativo lleva el
  `aria-labelledby` del campo; el botón visible (`role="combobox"`) se nombra con la opción elegida y
  recibe el nombre del campo, la ayuda y el error por `aria-describedby`, para que un mismo label no
  resuelva a dos elementos.
- **`DateInput`:** el `<input type="date">` nativo queda invisible como fuente de verdad (valor ISO,
  label, `.fill()` de Playwright). Encima hay un campo de texto donde se **tipea** la fecha en
  DD/MM/AAAA y un calendario propio que navega días → meses → años, en un portal. API compatible con
  `<Input type="date">`.
- **Errores:** `useErroresDeFormulario` da `fe(campo)` para `<Field error>`, `reportar(fieldErrors)`
  cuando la action falla (lleva el foco al primer control con `aria-invalid` y lo centra en
  pantalla) y el texto para `<AvisoErrores>`, que se lo anuncia a un lector de pantalla.

## 10. Vacíos y títulos de sección

- **`EmptyState`** cubre los tres vacíos de la app: "todavía no hay X" (título + acción de alta),
  "sin resultados para estos filtros" (título + "Limpiar filtros") y el vacío dentro de un panel
  (`compact`, sin ícono). No usa hooks: sirve en server components y en paneles cliente.
- **`SectionTitle`** es el rótulo de sección (label en mayúsculas, tracking ancho, tinta sutil). `as`
  permite usarlo como `h2`, `h3`, `h4`, `dt` o `div`; `sectionTitleClasses` expone la clase para los
  casos que no pueden usar el componente.

## 10-bis. Pieles del formulario de inscripción (`.v-form-a|b|c`)

El Application Form público se sirve con una de tres pieles —**Legajo**, **Cuaderno** y
**Embarque**— que cambian estética, nunca campos ni lógica. Viven en `src/styles/form-variants.css`
y se eligen desde `/configuracion` (o por `?v=` en el link de una campaña).

Cómo están hechas, y por qué así:

- Cada piel redefine un vocabulario propio `--form-*` (papel, borde, radio, sombra, rótulo, filete,
  nota, acento) además de algunos tokens STUDIO **dentro de su alcance**. No hay clases sueltas por
  variante en el TSX: el componente es uno solo y lee su presentación de
  `src/app/inscripcion/variantes.ts`, con la clase completa como literal (el JIT de Tailwind lee el
  texto del archivo: una clase interpolada no existe).
- El vocabulario se declara en `.v-studio` y no en `:root`: los tokens STUDIO viven ahí, y una
  variable que los referencie desde `<html>` se computa donde todavía no existen.
- La piel se engancha **dos veces**: por la clase del contenedor y por `body:has(.v-form-X)`. La
  segunda alcanza al shell y, sobre todo, a los popover de `Select` y `DateInput`, que se montan en
  un **portal fuera del formulario**: una variable declarada solo en `.v-form-b` resolvería vacía
  ahí y —como un `var()` sin fallback invalida la propiedad entera— el desplegable quedaría sin
  fondo ni borde. Donde no haya `:has()`, el formulario se estila igual y el popover conserva el
  STUDIO base: degrada, no se rompe.
- Las tres exponen el **mismo árbol accesible**: los números, la volanta, el tilde y la barra de
  progreso van en nodos `aria-hidden`, así el nombre accesible de cada grupo no cambia y los mismos
  selectores de los E2E sirven para las tres.

## 11. Shadcn: por qué no está instalado

La CLI moderna de shadcn asume **Tailwind v4** (tokens en `@theme`, `oklch`, `@import "tailwindcss"`).
El portal corre Tailwind v3.4: correr `shadcn init` rompió el build y se revirtió. Lo que sí hay es el
helper `cn()` idéntico, así que un componente de shadcn pegado a mano es compatible cambiando los
colores por los tokens.

- Para **usar shadcn de verdad** en otro proyecto: arrancar con Tailwind v4 y remapear sus variables
  (`--primary`, `--background`…) a la paleta STUDIO.
- Para **el look STUDIO tal cual**: quedarse en Tailwind v3.4 con estos tokens y componentes.

## 12. Deuda del sistema

- **Guarda de lint en *warn*.** `eslint.config.mjs` marca, dentro de los `className` literales de
  `src/app` y `src/components`, la paleta default de Tailwind, los hex sueltos y el puente `juk-*`.
  Al 11/09/2026 da **0 avisos**. Siguiente paso: subirla a `error` y borrar el bloque `colors` de
  `tailwind.config.ts`. La guarda no ve template strings con interpolación ni las excepciones de §1
  (`text-[13px]`, `bg-black/50`, `rgba(…)`): eso se revisa a mano.
- **No hay escala de z-index.** Valores en uso: headers fijos `z-10` (familias: shell y selector de
  alumnos de `familias/page.tsx`) y `z-30` (back-office en el teléfono); subnav del viaje `z-20`;
  fondo de los popovers y nav del sitio público `z-40`; panel de popovers y drawer del back-office
  `z-50`; diálogo de registrar pago `z-[35]`; `ConfirmDialog` `z-[80]`; toasts y `DesignTweaker`
  `z-[100]`; link "Saltar al contenido" del sitio público `z-[200]`. Conflicto conocido: el diálogo
  de registrar pago quedó en `z-[35]` a propósito, por **debajo** de los popovers, porque su
  `DateInput` abre el calendario en un portal que tiene que verse encima. Un `Select` o `DateInput`
  dentro de `ConfirmDialog` quedaría tapado (hoy el campo del confirm es un `Textarea`). Arreglo
  pendiente: tokens `--z-*` por capa y popovers que se monten por encima del diálogo que los contiene.
- **`animations.css` no respeta `prefers-reduced-motion`.** Los overlays y toasts animan igual para
  quien pidió menos movimiento; solo `landing.css` tiene el bloque. Arreglo: un
  `@media (prefers-reduced-motion: reduce)` que anule las animaciones `studio-*`.
- **`StepBadge` no tiene `vencido`.** El tablero M6 pinta ese estado con sus propias clases sobre los
  tokens `--b-paso-vencido`; sumarlo al badge evita la duplicación.
- **`GlobeLoader` sin uso**, junto con `public/globe-loader.html`. Para borrarlo: sacar el archivo, el
  export del barrel (`components/ui/index.ts`), `public/globe-loader.html` y la mención en el
  comentario del matcher de `src/proxy.ts`.
- **Accesibilidad sin axe.** `@axe-core/playwright` ya está en `devDependencies`, pero ningún spec lo
  usa: el chequeo vigente es el manual de `tests/e2e/a11y-basico.spec.ts` (§15).

## 13. Llevar el sistema a otro proyecto

1. Next.js con App Router y TypeScript estricto; `tailwindcss@^3.4`, `postcss`, `autoprefixer`,
   `clsx`, `tailwind-merge`.
2. Copiar tal cual: `src/styles/tokens.css`, `src/styles/animations.css`, `src/styles/globals.css`,
   `tailwind.config.ts` (sin el bloque `colors` del puente) y `src/lib/utils/cn.ts`.
3. Cargar las tres fuentes con `next/font` en el root layout y poner `className="v-studio …"` en el
   `<body>`, con `viewport.viewportFit = "cover"` si va a correr dentro de una app.
4. Traer de `src/components/ui/` lo que haga falta, con sus dependencias: `Select` (`field.tsx`) y
   `DateInput` necesitan `popover-position.ts` y `src/lib/utils/aria.ts`; `ConfirmDialog` necesita
   `use-scroll-lock.ts`, `button.tsx` y `field.tsx`; `Pagination` necesita `PAGE_SIZE` de
   `src/lib/utils/paginate.ts` (y `next/navigation`); `form-errors.tsx` necesita el tipo
   `FieldErrors` de `src/lib/actions/result.ts`; `TripCard` necesita `badge.tsx`; `LinkButton`
   necesita `button.tsx`; `StatCard` y `LinkButton` usan `next/link`.
5. Probar un `<Button>` y un `<Badge>`: si el texto sale del color equivocado, es la trampa de
   `length:` / `shadow:` de §6. Si las medidas salen más grandes que acá, el proyecto nuevo no tiene
   la raíz de 14 px (§6).
6. La galería de ~30 primitivos del lab (más liviana, menos pulida) está en el tag:
   `git show design-lab-final:juk-portal/src/app/design/shared/primitives.tsx`.

## 14. `DesignTweaker`: la herramienta de diseño que quedó

`src/app/(public)/design-tweaker.tsx`, montado en `(public)/layout.tsx`. Es interna, no es para el
público, y es la única herramienta de iteración visual que sobrevivió al retiro del Design Lab
(ADR-015).

- **Qué hace:** ajusta en vivo colores de marca y acentos (recalcula las escalas derivadas), radios,
  intensidad de sombras, ángulo de los gradientes, fuentes display/body y los textos marcados con
  `data-tweak-text`. "Copiar estilos" exporta el bloque para `src/styles/tokens.css`; "Copiar
  fuentes", el snippet de `next/font` para `src/app/layout.tsx`.
- **Cuándo aparece:** solo se monta en desarrollo o con `NEXT_PUBLIC_ENABLE_TWEAK=1`. Dentro de eso,
  se activa entrando con `?tweak` en la URL y queda activada (y con los ajustes guardados) en
  `localStorage` hasta que se cierra con "Ocultar".
- **Qué no hacer:** no dejar `NEXT_PUBLIC_ENABLE_TWEAK=1` en producción. Los cambios que hace son
  locales al navegador: para que valgan hay que pegar lo exportado en `tokens.css` / `layout.tsx` y
  commitear.

## 15. Cómo se testea el sistema

La regla general (qué test pide cada capa) está en la regla de sincronía del `CLAUDE.md` de la raíz
y en `../.claude/docs/05-testing.md`. Para `components/ui` y `styles`:

- **Unit para la lógica pura**, extraída del componente para poder testearla sin DOM:
  `popover-position.test.ts` (geometría), `use-scroll-lock.test.ts` (`estilosBloqueo` y
  `scrollDesdeTop`: el cálculo del body fijado y la vuelta al scroll, overscroll de iOS incluido),
  `confirm-dialog.test.ts` (`indiceFocoTrap`), `data-table.test.ts` (clases del modo tarjeta y el
  hint `length:` de `sectionTitleClasses`). Si un
  componente nuevo tiene una decisión no trivial, se saca a una función pura y se testea así.
- **E2E de una pantalla que lo use**, con el tag `@mobile` si afecta al teléfono (tablas en modo
  tarjeta, drawer, formularios con el piso de 16 px: `listados-mobile.spec.ts`,
  `formularios-mobile.spec.ts`, `mobile-nav.spec.ts`, `smoke-mobile.spec.ts`, `familias-ux.spec.ts`). Antes de interactuar
  con un `Select`, `DateInput` o cualquier control recién cargado, esperar la hidratación con
  `esperarHidratacion` de `tests/e2e/helpers.ts`.
- **Accesibilidad:** `tests/e2e/a11y-basico.spec.ts` es un chequeo hecho a mano (nombres accesibles,
  un solo `h1`, `alt` en imágenes, foco visible) sobre `/dashboard`, `/alumnos`, `/alumnos/nuevo`,
  `/` y `/login`. No usa axe (§12). Una pantalla nueva con controles propios conviene sumarla a sus
  rutas.
