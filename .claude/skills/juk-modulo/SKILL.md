---
name: juk-modulo
description: Andamia un módulo/feature completo del JUK Portal siguiendo la arquitectura por capas (schema → domain → queries → server actions/api → UI). Usalo cuando arranques un ABM o feature nueva (Colegios, Viajes, Alumnos, Asignaciones, etc.).
---

# /juk-modulo — Scaffold de un módulo por capas

Construí una feature respetando las reglas de `juk-portal/CLAUDE.md` y las ADRs de
`juk-portal/docs/architecture.md`. **Todos los comandos corren desde `juk-portal/`.**

## Paso 0 — Gate check (OBLIGATORIO)

Antes de escribir nada, corré `/juk-gate <módulo>` o leé `juk-portal/OPEN_DECISIONS.md`.
Si el módulo toca **aprobación de excursiones (CRIT-04)** o la **moneda de cuotas (CRIT-05)**,
NO asumas esa regla: confirmá con el usuario cómo proceder (modelar desacoplado vs. esperar).

## Paso 1 — Entender el alcance

1. Buscá la spec funcional del módulo en `juk-portal/docs/prd/` (02 = portal interno;
   03 = modelo objetivo; 06 = deltas y plan). Las User Stories con criterios de aceptación
   están ahí; `docs/phases.md` da el orden por fases.
2. Leé el modelo de datos relevante en `docs/prd/03-modelo-datos.md` (objetivo) +
   `juk-portal/docs/data-model.md` (implementado) y el/los schema(s) en
   `juk-portal/src/lib/db/schema/`.
3. Si la feature es no trivial o cruza varias entidades, delegá el diseño al agente
   **`juk-arquitecto`** y seguí su blueprint.

## Paso 2 — Construir, en este orden (de adentro hacia afuera)

> Regla de capas (ADR-005): `lib/domain/` es lógica PURA, sin imports de `next`/`react`/`app/`.
> El hook `domain-purity-check` lo enforza.

1. **Schema** (`src/lib/db/schema/<entidad>.ts`) — solo si falta o hay que extenderlo.
   - `pgTable`, tipos con `$inferSelect` / `$inferInsert`.
   - Soft-delete vía `estado` ENUM (no agregar `activo BOOLEAN` nuevos — ver TEC-03).
   - Índices y `unique()` donde corresponda; FKs con `onDelete`.
   - Si tocás un schema → al final corré `/juk-migracion`.

2. **Domain** (`src/lib/domain/<feature>/`) — crear la carpeta si no existe.
   - Lógica de negocio pura + validaciones. Schemas **Zod** para inputs.
   - Errores con **clases nombradas** (no `throw new Error("...")`).
   - Sin imports de Next/React/app.

3. **Queries** (`src/lib/db/queries/<feature>.ts`) — crear la carpeta si no existe.
   - Acceso a DB tipado y reusable vía Drizzle. Nada de drizzle crudo en componentes.

4. **Mutaciones**:
   - Desde la UI → **Server Actions**. Devolver `{ ok: true, data } | { ok: false, error }`.
     Validar el input con Zod. Registrar en `auditoria` los cambios sensibles.
   - Para consumidores externos → **Route Handler** en `src/app/api/v1/`.

5. **UI** (`src/app/(admin)/<ruta>/`):
   - Server Components por defecto; `"use client"` solo si hace falta.
   - Usar SIEMPRE los componentes de `@/components/ui` (PageHeader, DataTable, Field, Badge, etc.).
     No inventes componentes si ya existe uno.
   - Las páginas admin ya están protegidas por `requireAdminJuk()` en el layout.

## Paso 3 — Convenciones que no se negocian

- Copy de UI en **español rioplatense**.
- Fechas **DD/MM/YYYY**. Plata: **GBP** para montos del viaje, **ARS** para conceptos locales.
- Datos de facturación visibles **solo** para `admin_juk`/`super_admin` (enforcement en domain).
- TypeScript estricto: nada de `any`; `type` sobre `interface`; `const … as const` en vez de `enum`.
- Cero `console.log` commiteado (solo `console.error` en paths inesperados).
- Comentarios solo para el **porqué** no obvio.

## Paso 4 — Cerrar

Corré el loop completo de **`/juk-cierre`** (typecheck + lint + unit + E2E afectados +
navegador + migración pendiente + `juk-revisor`). Después resumí al usuario qué quedó
hecho y qué falta (no más de 2 frases).
