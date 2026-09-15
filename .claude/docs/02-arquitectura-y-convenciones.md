# 02 · Arquitectura y cómo se construye un módulo

> Las convenciones de código (nombres, imports, TypeScript, lo que no se hace) tienen una sola
> copia: [`juk-portal/CLAUDE.md`](../../juk-portal/CLAUDE.md). Este doc no las repite: explica la
> estructura y el **molde real** con el que se construye un módulo hoy. El porqué de cada decisión
> grande está en los ADRs de [`docs/architecture.md`](../../juk-portal/docs/architecture.md).

## Stack y por qué

| Pieza | Por qué, en corto | Más |
|---|---|---|
| **Next.js 16** (App Router, Turbopack) | Una sola app para back-office, Portal de Familias y sitio. Server components y server actions sin una API aparte. Ojo: esta versión cambia APIs (el middleware se llama `proxy.ts`); ante la duda, leé `node_modules/next/dist/docs/`. | ADR-001, ADR-009 |
| **TypeScript** estricto (`strict` + `noUncheckedIndexedAccess`) | El dominio tiene muchas ramas: que el compilador las marque | `tsconfig.json` |
| **PostgreSQL en Neon** (São Paulo), driver `neon-http` | Serverless, con branches copy-on-write para previews y CI. Cada query es un round-trip HTTPS: ver [07](07-performance.md) | ADR-002, ADR-008 |
| **Drizzle ORM** | Tipos derivados del schema, SQL predecible, migraciones versionadas | ADR-003 |
| **Better-Auth** | Auth en nuestra base, sin vendor, con email y contraseña | ADR-004, [06](06-seguridad.md) |
| **Zod** | Validación de todo input que no es de confianza: los schemas del dominio los usan las actions, y los webhooks validan su payload con un schema propio en el route handler | — |
| **Tailwind 3 + tokens STUDIO** | Todo el look sale de `src/styles/tokens.css`; un lint avisa si aparecen colores fuera de los tokens | [`docs/design-system.md`](../../juk-portal/docs/design-system.md) |
| **Resend + React Email** | Mails transaccionales con templates en React (`src/lib/email/templates/`) | — |
| **Trigger.dev v4** | Trabajo fuera del request, con reintentos (recordatorios, avisos masivos) | ADR-006 |
| **Cloudflare R2** (bucket privado) | Documentos de menores; nunca con URL pública | ADR-007, ADR-011, [06](06-seguridad.md) |
| **Sentry** | Errores en server, edge y cliente. Se inicializa solo si está `NEXT_PUBLIC_SENTRY_DSN` y reporta solo en producción (en dev no manda nada aunque haya DSN) | ADR-000 |
| **Vercel** (`gru1`) | Deploy de la app, en la misma región que la base | ADR-002 |
| **Vitest + Playwright** | Unit, integración contra Postgres y E2E | ADR-016, [05](05-testing.md) |

## Capas

```
src/lib/domain/        reglas de negocio PURAS: Zod, labels, errores, cálculos
      ▲                (sin next, react, app/ ni la base)
src/lib/db/queries/    el único lugar con Drizzle: lecturas, escrituras, agregados
      ▲
server actions         src/app/**/actions.ts, <panel>-actions.ts, familias/_actions.ts,
                       src/lib/actions/ (compartidas)
route handlers         src/app/api/{auth,uploads,webhooks}
Trigger.dev            src/trigger/ → src/lib/jobs/
      ▲
UI                     src/app/** (server components por defecto)
```

Cada capa importa solo de las de abajo. Reglas verificables:

- **`src/lib/domain/` no importa framework ni base.** El hook
  `.claude/hooks/domain-purity-check.mjs` bloquea al editar (exit 2) los imports de `next`,
  `react`/`react-dom`, `server-only`/`client-only`, `@/app`, `drizzle-orm` o drivers de DB
  (`@neondatabase/*`, `pg`) y `@/lib/db`, en cualquier forma (`import`, `import "x"`,
  `export … from`, `import()`, `require`). El porqué (ADR-005): la misma regla la usan la
  pantalla, la action, el webhook y los jobs, y se prueba con unit tests sin base ni navegador.
- **Drizzle solo en `src/lib/db/`** (schema, queries, seeds). La otra excepción es el adapter de
  Better-Auth en `src/lib/auth/index.ts`. Actions, webhooks y jobs pasan por las queries.
- **Las páginas server leen las queries directo.** Las mutaciones van por server actions. No existe
  `src/app/api/v1/`: nace recién cuando haya un consumidor externo real (ADR-001). La app nativa
  no la necesita, porque Capacitor envuelve la web (ADR-010).
- **Piezas de soporte:** `src/lib/auth/` (config y guards), `src/lib/routes.ts` (fuente única de
  rutas, puro), `src/lib/storage/` (R2), `src/lib/email/` (envío y templates), `src/lib/jobs/`
  (lógica de los jobs, testeable sin Trigger), `src/lib/utils/` (fechas, paginación, Zod, DNI, `cn`, `agrupar`, `aria`) y
  `src/components/ui/` (design system).

## El molde de un módulo (tal como se construye hoy)

Referencias vivas: **Prospectos** (el último módulo completo: listado, alta, edición, ficha e
importación) y **Viajes/Alumnos** (fichas con slug y secciones en streaming). Se construye de
adentro hacia afuera. `/juk-modulo` guía el andamiaje y `/juk-cierre` lo cierra.

### 1. Schema y migración

- `src/lib/db/schema/<entidad>.ts`: `pgTable` y `pgEnum`. Exportá los tipos con `$inferSelect` y
  `$inferInsert`, y re-exportá la entidad en `schema/index.ts`.
- Índices y `unique()` donde haya búsqueda o join frecuente (criterio en [07](07-performance.md)).
- Las entidades del negocio no se borran: la baja es un `estado` (ENUM, TEC-03). Se borran de
  verdad solo filas dependientes que se regeneran: el tablero M6 al reasignar, un plan de cuotas
  reemplazado, el vínculo GL-viaje o las ventanas vencidas de rate limit.
- Migración con `/juk-migracion` (proceso en [04](04-operacion-y-handoff.md#base-de-datos-y-migraciones)).

### 2. Dominio — `src/lib/domain/<feature>/`

| Archivo | Qué va |
|---|---|
| `schema.ts` | `z.enum` que replican los `pgEnum`; `<x>CreateSchema`, `<x>UpdateSchema`, `<x>FiltersSchema` (búsqueda, estado, `page`) y sus tipos inferidos |
| `labels.ts` | Textos rioplatenses por valor de enum y el tono de `Badge` por estado (`PROSPECTO_ESTADO_LABELS`, `PROSPECTO_ESTADO_TONE`) |
| `errors.ts` | Errores con nombre (`ProspectoNotFoundError`). Nunca `throw new Error("…")` |
| Reglas puras en archivos propios | `prospectos/pipeline.ts`, `prospectos/csv.ts`, `viajes/transiciones.ts`, `alertas/urgencias.ts`… **cada una con su `<archivo>.test.ts` al lado** (lo exige `check:tests`) |
| `index.ts` | Solo el barrel (`export * from …`) |

No pongas lógica en `index.ts`, `labels.ts` ni `errors.ts`: `check:tests` no les exige test y la
cobertura los excluye. Hoy `configuracion/`, `documentos/` y `recordatorios/` tienen lógica en su
`index.ts`, y esa lógica no entra en el número de cobertura.

### 3. Queries — `src/lib/db/queries/<feature>.ts`

- Una función `condiciones<X>(filtros): SQL | undefined` que comparten el listado y el conteo.
- Un listado paginado **en la base** (ADR-013): `list<X>(filtros, pagina)` devuelve
  `paginarEnSql(pagina, (limit, offset) => …, () => …count())` (`src/lib/utils/paginate.ts`).
  El `ORDER BY` termina en una columna única: sin desempate, `LIMIT/OFFSET` repite o saltea filas
  entre páginas (el bug que tenía `/pagos`). El modelo es `listCuotasGlobal` (`queries/pagos.ts`:
  `fechaVencimiento, numero, id`). Ojo: la vista tabla de Prospectos (`listProspectos`) todavía
  ordena por `(estado, posicion)` sin desempate (`posicion` no es única), así que en esto no la copies.
- Si la lista no pagina o va al navegador, un **DTO liviano** con solo lo que se muestra
  (`listProspectosKanban`).
- `get<X>ById`, `get<X>By<Slug>` y mutaciones que tiran el error con nombre del dominio.
- Si varias escrituras tienen que quedar todas o ninguna, `db.batch([...])` (`marcarPrincipal`).
  Límites en [07](07-performance.md).
- Los totales se agregan en SQL, no en memoria (`resumenPagosGlobal`).

### 4. Server actions — `src/app/(admin)/<feature>/actions.ts`

Cuando un panel de una ficha tiene sus propias mutaciones, van en `<panel>-actions.ts` en la
carpeta de la ficha (`alumnos/[id]/cuotas-actions.ts`, `alumnos/[id]/documentos-actions.ts`,
`viajes/[id]/pasos-actions.ts`). El Portal de Familias usa `familias/_actions.ts` y el sitio
público `(public)/leads/actions.ts`.

Si dos pantallas comparten la action, va a `src/lib/actions/` (`asignaciones.ts` la usan el
detalle del viaje y la ficha del alumno). Todas siguen el mismo orden (el contrato está en
`juk-portal/CLAUDE.md` y su porqué en el ADR-014):

```ts
"use server";
export async function createProspectoAction(input: unknown): Promise<ActionResult<Prospecto>> {
  const session = await requireAdminJuk();                 // 1. guard, SIEMPRE primero
  const parsed = prospectoCreateSchema.safeParse(input);   // 2. Zod sobre unknown
  if (!parsed.success) {
    return { ok: false, error: "Revisá los campos del formulario.",
             fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    const prospecto = await createProspecto({ ...parsed.data, createdBy: session.user.id }); // 3. query
    await safeAudit({ accion: "create", entidadTipo: "prospecto",                            // 4. auditoría
                      entidadId: prospecto.id, usuarioId: session.user.id });
    revalidatePath("/prospectos");                                                          // 5. revalidar
    return { ok: true, data: prospecto };
  } catch (err) {
    Sentry.captureException(err);                                                           // 6. inesperado
    return { ok: false, error: "No pudimos crear el prospecto. Probá de nuevo." };
  }
}
```

Los errores esperados se traducen desde el error con nombre **antes** del `Sentry.captureException`.
En Prospectos lo hace `updateProspectoAction` con `ProspectoNotFoundError` (`if (err instanceof
ProspectoNotFoundError) return { ok: false, error: "El prospecto no existe." }`); una creación no
tiene ese caso.

- **Contrato único:** `ActionResult<T>` de `src/lib/actions/result.ts`. El error admite
  `fieldErrors` (por campo, con paths anidados) y `requiereConfirmacion` para los flujos
  "¿guardar igual?" (sobrecupo, pago fuera de orden).
- **Guard en cada action exportada** (`requireAdminJuk`, `requireRole("super_admin")`,
  `requireFamilia`). Una server action se puede invocar por POST directo: el layout no la protege.
- **Auditoría:** `safeAudit` (`src/lib/actions/safe-audit.ts`) es best-effort: si falla, avisa a
  Sentry y no rompe una operación que el usuario ya vio como exitosa.
- **`revalidatePath`:** literal para listados (`"/prospectos"`); para detalles con slug, la forma
  agnóstica al valor (`revalidatePath("/viajes/[id]", "page")`).
- **Trabajo pesado** (N mails, reintentos) → una task de Trigger.dev encolada desde la action, con
  `try/catch` para que la operación principal quede hecha igual (`cancelarViajeAction`).
- **Portal de Familias:** el ownership se deriva server-side en la action, nunca desde lo que manda
  el cliente (`pasoConOwnership` en `src/app/familias/_actions.ts`).

### 5. UI — `src/app/(admin)/<feature>/`

| Archivo | Qué hace |
|---|---|
| `page.tsx` (server) | `await searchParams`, parsea con `<x>FiltersSchema.safeParse` (lo inválido se ignora), arma `pagina(sp.page)`, llama la query y compone `PageHeader` + filtros + tabla + `Pagination` |
| `<x>-filters.tsx` (`"use client"`) | Lee `useSearchParams` y escribe la URL con `router.push` dentro de `startTransition`; la búsqueda con debounce. **Los filtros viven en la URL**, no en estado de React |
| `<x>-table.tsx` | `<TableWrap><Table responsive>` con `<TD label="…">` en **cada** celda: debajo de 640px la tabla pasa a tarjetas. `EmptyState` distingue "todavía no hay" (acción: alta) de "sin resultados para estos filtros" (acción: limpiar) |
| `<x>-form.tsx` (`"use client"`) | Alta y edición con `Field`/`Input`/`Select`/`DateInput` del DS, errores por campo desde `fieldErrors` y el guard de cambios sin guardar (`src/lib/hooks/use-unsaved-changes.ts`) |
| `nuevo/page.tsx`, `[id]/editar/page.tsx` | Alta y edición |
| `[id]/page.tsx` | Solo si hay ficha. Nace con slug (regla y única excepción, Prospectos por uuid, en `juk-portal/CLAUDE.md`) |
| `loading.tsx` en **cada** segmento | Skeleton con la silueta de la pantalla: `ListPageSkeleton`, `FormPageSkeleton`, `FichaAlumnoSkeleton`, `ViajeDetalleSkeleton`, `PagosPageSkeleton`, `ConfigSkeleton`; `PanelSkeleton` para secciones |
| `error.tsx` / `not-found.tsx` | **No se crean por módulo.** Los ponen los grupos (`(admin)/error.tsx`, `(admin)/not-found.tsx`, `familias/error.tsx`, `familias/not-found.tsx`); la página solo llama `notFound()` |

- En un detalle con varias secciones hay **una sola query bloqueante** (la que decide el 404) y el
  resto va en `<Suspense>` con su skeleton (`src/app/(admin)/viajes/[id]/page.tsx`). Antes de poner
  un `loading.tsx` por encima de un chequeo de pertenencia, leé la trampa del 404 en [07](07-performance.md).
- **Registrar la ruta:** el prefijo en `PORTAL_PREFIXES` de `src/lib/routes.ts` (de ahí salen el
  saneo de `returnTo`, `robots.txt` y el split de subdominio), el ítem en
  `src/components/admin/admin-shell.tsx` y el label en `src/components/admin/breadcrumb-labels.ts`.

### 6. Tests por capa

| Capa | Test | Dónde |
|---|---|---|
| Dominio y utils | Unit de cada regla, bordes incluidos | `<archivo>.test.ts` al lado |
| Actions | Unit con mocks compartidos: guard por rol, Zod, ownership, auditoría, revalidate | `actions.test.ts` al lado; mocks en `src/lib/actions/__tests__/mocks.ts` |
| Queries con SQL no trivial | Integración contra Postgres real | `<query>.integration.test.ts` |
| Pantalla y flujo | E2E con selectores por rol | `tests/e2e/<modulo>.spec.ts` |

Cómo se escribe y se corre cada uno: [05-testing](05-testing.md).

## Rutas y auth, en una línea cada una

- `src/proxy.ts` es un **primer filtro**. Primero separa subdominios si está
  `NEXT_PUBLIC_PORTAL_URL` (gestión en `portal.*`, marketing en la raíz). Después: responde 404 a
  `/api/auth/sign-up`; deja pasar el sitio público, `/api/auth`, `/api/webhooks`, `/baja` y
  `/offline`; y sin cookie de sesión redirige a `/login?returnTo=…` (salvo en `/login` y
  `/reset-password`). No mira roles ni valida la sesión: a un usuario logueado que entra a `/login`
  lo redirige la página, con la sesión real (rebotarlo por la cookie armaba un loop con cookies
  vencidas). El matcher excluye los assets estáticos, pero nunca `/api/*`.
- La autorización real es server-side: `requireAdminJuk()` en `(admin)/layout.tsx`, `require*` en
  cada action y chequeos propios en los route handlers. Detalle en [06-seguridad](06-seguridad.md).

## Dos detalles de práctica

Todo lo demás (moneda, fechas, DNI, slugs, UI, qué no hacemos) está en `juk-portal/CLAUDE.md`.

- **Labels:** los valores de un enum viven en el dominio y su texto en `labels.ts`. La UI no
  hardcodea strings de estado.
- **Mensajes de error:** para humanos ("No pudimos…", "Revisá…"). El detalle técnico va a Sentry,
  nunca a la pantalla.
