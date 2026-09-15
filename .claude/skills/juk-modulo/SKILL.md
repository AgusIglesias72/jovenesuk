---
name: juk-modulo
description: Construye un módulo o feature del JUK Portal con el molde real del proyecto — schema → domain + tests → queries con paginación en SQL → server actions con ActionResult y safeAudit → UI (tabla con modo card, EmptyState, filtros en la URL, loading con skeleton, detalle por slug) → tests por capa → docs. Usalo al arrancar un ABM o una feature nueva.
---

# /juk-modulo — Un módulo con el molde del proyecto

El molde con su porqué está en `.claude/docs/02-arquitectura-y-convenciones.md`; las convenciones
de código, en `juk-portal/CLAUDE.md`. Este skill es el orden de trabajo. Referencia viva más
simple para listado, filtros, formulario y actions: **Colegios** (`src/lib/domain/colegios/`,
`src/lib/db/queries/colegios.ts`, `src/app/(admin)/colegios/`). Colegios no tiene página de
detalle, su edición va por uuid y no tiene `actions.test.ts`: para el detalle por slug el molde es
Viajes (`src/app/(admin)/viajes/[id]/page.tsx`, `getViajeByCodigo`) o Alumnos
(`src/app/(admin)/alumnos/[id]/page.tsx`, `getAlumnoByDni`); para el test de actions,
`src/app/(admin)/usuarios/actions.test.ts`. Comandos desde `juk-portal/`.

## 0. Antes de escribir código

1. **Spec**: `docs/prd/00-indice.md` → el doc del módulo, con sus User Stories y criterios de
   aceptación. Si no hay spec, escribí una corta en `docs/prd/` y confirmala con el usuario.
2. **Estado**: `docs/estado-actual.md`. Que no exista ya, entero o a medias.
3. **Gate**: `/juk-gate <área>`.
4. Si cruza varias entidades o no es trivial: agente **`juk-arquitecto`** y seguí su blueprint.

## 1. Schema (solo si hace falta) — `src/lib/db/schema/<entidad>.ts`

- `pgTable`; tipos con `$inferSelect` / `$inferInsert`; re-export en `schema/index.ts`.
- Baja lógica con `estado` ENUM (TEC-03: no sumar `activo BOOLEAN`).
- Índices para los filtros y el orden del listado; `unique()` para el slug; FKs con `onDelete`.
- Después: `/juk-migracion`.

## 2. Dominio + tests — `src/lib/domain/<feature>/`

| Archivo | Qué va |
|---|---|
| `schema.ts` | enums con `z.enum`, `*CreateSchema`, `*UpdateSchema`, `*FiltersSchema`, tipos inferidos |
| `errors.ts` | errores nombrados (ej: `ColegioNotFoundError extends Error`); nunca `throw new Error("…")` |
| `labels.ts` | textos rioplatenses y tono de cada badge |
| `<regla>.ts` | reglas puras: transiciones, derivaciones, validaciones que no son de forma |
| `index.ts` | solo barrel (`export * from`). Lógica en `index.ts` queda fuera de la cobertura |

- `<archivo>.test.ts` al lado de todo archivo con lógica (el hook `test-companion-check` avisa;
  `npm run check:tests` lo exige).
- Puro: sin `next`, `react`, `server-only`, `@/app`, `drizzle-orm` ni `@/lib/db` (el hook
  `domain-purity-check` lo frena). Si necesitás los valores de un enum de la DB, replicalos con Zod.

## 3. Queries — `src/lib/db/queries/<feature>.ts`

- El único lugar con Drizzle. Devuelven filas tipadas; no validan ni hacen auth.
- Listado paginado **en SQL**: `listXPaginado(filters, pagina(page))` con `paginarEnSql` de
  `@/lib/utils/paginate` (ventana y total en paralelo). El ORDER BY desempata por `id`: sin eso,
  LIMIT/OFFSET repite o saltea filas entre páginas (pasó en `/pagos`).
- Cada query es un round-trip HTTPS (neon-http): consultas independientes en `Promise.all`,
  nada de N+1 (`inArray`).
- Detalle por slug: `getXByCodigo` / `getXByDni` sobre una columna `unique` (hoy no hay ningún
  `getXBySlug`: nombrala por la columna que uses).
- Lógica SQL real (filtros compuestos, agregados, ORDER BY paginado, escrituras encadenadas con
  `db.batch`; neon-http no tiene `db.transaction()`) → `<feature>.integration.test.ts` al lado.

## 4. Server actions — `src/app/(admin)/<feature>/actions.ts`

```ts
export async function crearXAction(input: unknown): Promise<ActionResult<{ id: string }>>
```

En este orden:

1. `"use server"` y guard de rol: `requireAdminJuk()` (o `requireFamilia()` en el portal de
   familias), de `@/lib/auth/helpers`.
2. `schema.safeParse(input)`; si falla, `{ ok: false, error, fieldErrors: fieldErrorsFromZod(...) }`
   (`@/lib/utils/zod`).
3. El dueño y los ids relacionados se derivan en el server, nunca del input del cliente.
4. Query. Errores esperados (los nombrados del dominio) → `{ ok: false, error }` con copy;
   inesperados → `Sentry.captureException` + mensaje genérico.
5. `safeAudit({ accion, entidadTipo, entidadId, usuarioId, metadata })` de `@/lib/actions/safe-audit`.
6. `revalidatePath("/<ruta>/[id]", "page")` con la forma literal.
7. `{ ok: true, data }` (`ActionResult` de `@/lib/actions/result`).

- Test: `actions.test.ts` al lado, con los mocks de `src/lib/actions/__tests__/mocks.ts`
  (ejemplo: `src/app/(admin)/usuarios/actions.test.ts`): sin sesión o rol incorrecto, Zod
  inválido, ownership, camino feliz con auditoría, error de query.
- Lógica que usan varias pantallas → `src/lib/actions/<x>.ts` (como `asignaciones.ts`).
- Route handler solo para consumidores externos o archivos, en `src/app/api/`.

## 5. UI — `src/app/(admin)/<feature>/`

| Archivo | Qué hace |
|---|---|
| `page.tsx` | server component: `await searchParams` → `xFiltersSchema.safeParse` → `listXPaginado` → `<PageHeader>`, filtros, tabla y `<Pagination total page pages />` |
| `<feature>-filters.tsx` | `"use client"`: escribe los filtros en la URL (nunca en estado React) |
| `<feature>-table.tsx` | `<Table responsive>` con `label` en cada `<TD>` (modo card en el teléfono); vacío con `<EmptyState>`, distinguiendo "sin resultados para estos filtros" de "todavía no hay" |
| `<feature>-form.tsx` | `"use client"`: alta y edición compartidas; errores por campo desde el `ActionResult` |
| `nuevo/page.tsx`, `[id]/page.tsx`, `[id]/editar/page.tsx` | alta, detalle, edición |
| `loading.tsx` (en cada segmento) | el skeleton con la silueta de la pantalla (`ListPageSkeleton`, `FormPageSkeleton`, …); nada de spinners ni `GlobeLoader` |

- **Detalle por slug, nunca por uuid**: la carpeta sigue siendo `[id]` pero el param es el slug;
  la página resuelve con la query por slug (`getViajeByCodigo`, `getAlumnoByDni`), llama `notFound()` si no existe y pasa el uuid real a
  componentes hijos, actions y queries. Los `<Link>` emiten el slug.
- `error.tsx` y `not-found.tsx` de `(admin)` cubren el módulo; sumá uno propio solo si necesita
  otro mensaje. El layout de `(admin)` ya exige `requireAdminJuk()`, pero cada action valida igual.
- Componentes de `@/components/ui`: `<Select>` (con `searchable` si la lista es larga),
  `<DateInput>`, `useConfirm()`. Nada de `<select>` o `<input type="date">` nativos, `window.confirm`
  ni estilos inline.
- Copy rioplatense; fechas DD/MM/YYYY con los helpers de `src/lib/utils/date.ts`; moneda según
  `juk-portal/CLAUDE.md`.
- Navegación: link en `src/components/admin/admin-shell.tsx`, label en
  `src/components/admin/breadcrumb-labels.ts` y prefijo en `PORTAL_PREFIXES` de `src/lib/routes.ts`
  (de ahí lee el proxy qué rutas exigen sesión; actualizá `routes.test.ts`).

## 6. Tests por capa

| Capa | Test | Cómo se corre |
|---|---|---|
| dominio, utils, `src/lib/actions` | `<archivo>.test.ts` al lado | `npm run test:coverage` |
| server actions | `actions.test.ts` con mocks | `npm test` |
| queries con lógica SQL | `<archivo>.integration.test.ts` | `npm run test:integration` (con `INTEGRATION_DATABASE_URL`) |
| pantallas y flujos | `tests/e2e/<feature>.spec.ts`, más tests `@mobile` si el layout cambia en el teléfono | `npx playwright test tests/e2e/<feature>.spec.ts` |

Reglas de E2E: `.claude/docs/05-testing.md`.

## 7. Docs (regla de sincronía)

- Spec del módulo en `docs/prd/` (y `03-modelo-datos.md` si hubo schema).
- `docs/estado-actual.md`: el módulo, construido o parcial.
- `.claude/docs/03-mapa-de-archivos.md`: la carpeta nueva.
- `OPEN_DECISIONS.md` si asumiste algo de producto.
- `CHANGELOG.md`, sección `[Sin publicar]`.

## 8. Cerrar

`/juk-cierre` completo. Después, al usuario: qué quedó hecho y qué falta, en dos frases.
