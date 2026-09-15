# JUK Portal — Workspace

Este workspace es el **JUK Portal** de *Jóvenes en UK*, una agencia argentina de viajes de estudio.
Es una sola app Next.js con tres superficies: el **back-office** del equipo, el **Portal de
Familias** y el **sitio público** de marketing. El código vive en `juk-portal/`; el harness de
Claude Code, en `.claude/`.

## Layout

```
jovenesuk/
├── .claude/                  ← harness de Claude Code (NO es código de la app)
│   ├── skills/               ← /juk-cierre, /juk-modulo, /juk-paso, /juk-migracion, /juk-gate, /juk-setup
│   ├── agents/               ← juk-arquitecto, juk-prd-analyst, juk-revisor, juk-infra
│   ├── hooks/                ← guardas automáticas (Node, cross-platform)
│   ├── docs/                 ← documentación de handoff (empezar por README.md)
│   └── settings.json         ← hooks + permisos
├── .githooks/pre-push        ← typecheck + lint + unit + check:tests antes de pushear (opt-in: npm run hooks:install)
├── .github/workflows/ci.yml  ← CI: job check (siempre) + job e2e (integración + Playwright sobre una branch efímera de Neon; se saltea sin los secrets NEON_API_KEY/NEON_PROJECT_ID)
├── assets/screenshots/       ← capturas locales de revisión (ignorado por git)
└── juk-portal/               ← la app: código, tests, migraciones y docs del producto
    └── CLAUDE.md             ← convenciones de código (importado abajo)
```

**Los comandos corren desde `juk-portal/`** (`cd juk-portal && npm run …`). El `next dev` del
dueño corre en el **3000**: no lo mates. Los E2E levantan (o reusan) su propio server en el 3001.

## Convenciones de código

@juk-portal/CLAUDE.md

## ⚠️ Regla de sincronía: cada cambio deja el proyecto coherente

Es un pedido explícito del dueño, y aplica a **toda** modificación, chica o grande:

> Cada modificación deja el proyecto coherente **en el mismo cambio** (mismo commit o misma PR):
>
> 1. **el código**;
> 2. **su test**: `src/lib/domain`, `src/lib/utils` y `src/lib/actions` → unit al lado; queries con
>    lógica en SQL → integración; pantalla o flujo → E2E (con `@mobile` si afecta al teléfono).
>    Cada modificación suma o ajusta **el caso que la cubre**: no alcanza con que el archivo de
>    test ya exista;
> 3. **el PRD** en `juk-portal/docs/prd/` si cambió una regla o un comportamiento visible;
> 4. **las definiciones**: `juk-portal/OPEN_DECISIONS.md` si se tomó o abrió una decisión,
>    `juk-portal/docs/architecture.md` si cambió un porqué, `juk-portal/docs/design-system.md` si
>    cambió un componente o un token;
> 5. **`juk-portal/docs/estado-actual.md` y `juk-portal/CHANGELOG.md`**;
> 6. **el mapa `.claude/docs/03-mapa-de-archivos.md`** si se agregó, movió o borró un archivo.

Un cambio que no cumple los seis puntos **no está terminado**, aunque compile y los tests pasen.
"No aplica" es una respuesta válida, pero se dice explícitamente (ver *Cómo se cierra*).

### Si tocaste X → actualizá Y

| Si tocaste… | Test que tiene que venir en el mismo cambio | Además actualizá… |
|---|---|---|
| Una regla de negocio en `src/lib/domain/**` | Unit `<archivo>.test.ts` al lado (lo exige `check:tests`) | La spec de `docs/prd/` (`02` back-office, `04` familias, `05` representante, `07` web pública, consultas y CRM de prospectos); `OPEN_DECISIONS.md` si la regla sale de una decisión |
| `src/lib/utils/**` o `src/lib/actions/**` | Unit al lado (lo exige `check:tests`) | `juk-portal/CLAUDE.md` si nace una convención |
| Una server action de pantalla (`src/app/**/*actions.ts`, `_actions.ts`) | Unit `<archivo>.test.ts` al lado: autorización, validación y ownership, con los mocks de `src/lib/actions/__tests__/mocks.ts`. `check:tests` no lo exige. Hoy no tienen test `alumnos/actions.ts`, `alumnos/[id]/documentos-actions.ts`, `colegios`, `consultas`, `group-leaders`, `viajes/[id]/group-leaders-actions.ts` y `(public)/leads`: al tocarlos, se suma | La spec de `docs/prd/` si cambió lo que ve el usuario |
| Una query con lógica en SQL (`src/lib/db/queries/**`: filtros, agregados, orden, paginación, escrituras encadenadas) | Integración `<archivo>.integration.test.ts` | — |
| El schema (`src/lib/db/schema/**`) | Migración con `/juk-migracion`, e integración si cambia una constraint | `docs/prd/03-modelo-datos.md`; `docs/architecture.md` si hay un porqué |
| Jobs (`src/lib/jobs/**`, `src/trigger/**`) | Integración del job | `docs/estado-actual.md` (servicios); `.claude/docs/04-operacion-y-handoff.md` si cambia cómo se opera |
| Una pantalla, panel o flujo (`src/app/**`) | E2E en `tests/e2e/`; `@mobile` si cambia el layout en el teléfono | La spec de `docs/prd/` si cambió lo que ve el usuario |
| Un componente o token (`src/components/ui/**`, `src/styles/**`) | Unit si tiene lógica pura (ej. `popover-position.test.ts`) + el E2E de una pantalla que lo use | `docs/design-system.md` |
| Acceso o seguridad (`src/proxy.ts`, `src/lib/routes.ts`, `src/lib/auth/**`, `src/app/api/**`, headers de `next.config.ts`) | Unit (`proxy.test.ts`, `routes.test.ts`, `src/lib/auth/*.test.ts`) + E2E de acceso | `.claude/docs/06-seguridad.md`; `docs/architecture.md` si cambia un porqué |
| Performance (consultas por request, caché, paginación, assets) | El test de la capa que tocaste | `.claude/docs/07-performance.md` |
| Dependencias (`package.json`, `overrides`) | La suite completa | `CHANGELOG.md`; `.claude/docs/06-seguridad.md` si es por una CVE; `.claude/docs/04` si cambia cómo se actualiza |
| Tests, CI o hooks (`tests/**`, `vitest.config.ts`, `playwright.config.ts`, `.github/`, `.githooks/`, `scripts/`) | Test del script si tiene lógica (ej. `scripts/check-test-companions.test.mjs`) | `.claude/docs/05-testing.md` |
| Hooks del harness (`.claude/hooks/**`, `.claude/settings.json`) | `node .claude/hooks/probar-hooks.mjs` | `.claude/hooks/README.md` |
| Una decisión de negocio (tomada o abierta) | — | `OPEN_DECISIONS.md` + la spec afectada en `docs/prd/` |
| Un archivo o carpeta nueva, movida o borrada | — | `.claude/docs/03-mapa-de-archivos.md` |
| **Siempre** | — | Una línea en `CHANGELOG.md` (sección *Sin publicar*); `docs/estado-actual.md` si cambió el estado de un módulo, un servicio o la deuda |

### Qué lo hace cumplir

- **Automático** — `npm run check:tests` corre en el CI y en el pre-push (opt-in:
  `npm run hooks:install`). Falla si un archivo nuevo o modificado de `src/lib/domain`, `utils` o
  `actions` **no tiene** su `.test.ts` al lado. Exime index/labels/errors/types y los archivos
  solo de tipos.
  - ⚠️ Solo exige que el test **exista**, no que haya cambiado. Modificar lógica implica **sumar o
    ajustar el caso** que cubre la modificación en ese test. Eso es responsabilidad de quien cambia
    y lo repasa `/juk-cierre`; ninguna automatización lo garantiza.
  - El job `check` del CI además corre typecheck, lint, el piso de cobertura, el audit de producción
    y `next build`. Hoy **informa pero no bloquea** merges: bloquear requiere branch protection
    (GitHub Pro o repo público; pendiente en `docs/estado-actual.md`). El job `e2e` (integración +
    Playwright) no corre hasta que estén los secrets de Neon: mientras tanto, corrélos a mano.
- **Hooks de Claude Code** (`.claude/settings.json`, detalle en `.claude/hooks/README.md`). Avisan,
  no reemplazan al cierre:
  - `test-companion-check.mjs` (PostToolUse): al editar en `src/lib/`, avisa si falta el test
    compañero. Usa las mismas reglas que `check:tests`.
  - `domain-purity-check.mjs` (PostToolUse): marca imports prohibidos en `src/lib/domain/`.
  - `docs-sync-reminder.mjs` (Stop): si hay cambios en `juk-portal/src/` sin cambios en los docs
    vivos (`docs/prd/`, `OPEN_DECISIONS.md`, `docs/estado-actual.md`, `CHANGELOG.md`, mapa 03), le
    devuelve a Claude la tabla de arriba. Avisa una vez por archivo, no mira `architecture.md` ni
    `design-system.md` y se apaga con `JUK_DOCS_SYNC=off`.
  - `destructive-command-guard.mjs` (PreToolUse sobre Bash/PowerShell): frena borrados recursivos
    fuera de temporales, SQL destructivo, `drizzle-kit push/drop`, `git push --force`,
    `reset --hard` y `clean -f`.
- **`/juk-cierre`** es la **Definition of Done**: corre la verificación completa y repasa los seis
  puntos. Nada se da por cerrado sin pasarlo.
- Lo documental (PRD, definiciones, estado, changelog, mapa) **no** tiene un chequeo que bloquee:
  más allá del aviso de `docs-sync-reminder`, lo verifican `/juk-cierre` y el review
  (`juk-revisor`). Por eso se reporta explícito.

### Cómo se cierra

El reporte final (o el cuerpo del commit) enumera los seis puntos con lo que se tocó o
`no aplica: <motivo>`. Por ejemplo:

```
código: src/lib/domain/cuotas/schema.ts
test: schema.test.ts (+2 casos) · E2E tests/e2e/cuotas.spec.ts
PRD: docs/prd/02-portal-interno.md §Módulo 6 (vencimientos)
definiciones: no aplica (no hubo decisión nueva)
estado/changelog: CHANGELOG (Sin publicar) · estado-actual sin cambios
mapa: no aplica (sin archivos nuevos)
```

## Dónde está cada cosa (una fuente de verdad por tema)

| Tema | Archivo |
|---|---|
| Qué está construido, qué falta, qué depende del dueño, deuda | `juk-portal/docs/estado-actual.md` |
| Historial de cambios | `juk-portal/CHANGELOG.md` |
| Qué hace el sistema (reglas, user stories) | `juk-portal/docs/prd/` (empezar por `00-indice.md`) |
| Decisiones de negocio abiertas y cerradas | `juk-portal/OPEN_DECISIONS.md` |
| Por qué la arquitectura es como es (ADRs) | `juk-portal/docs/architecture.md` |
| Sistema de diseño STUDIO | `juk-portal/docs/design-system.md` |
| Convenciones de código | `juk-portal/CLAUDE.md` |
| Levantar el proyecto y scripts | `juk-portal/README.md` |
| Handoff: producto, arquitectura, mapa, operación, testing, seguridad, performance | `.claude/docs/` (empezar por `README.md`) |
| App nativa (Capacitor) | `juk-portal/docs/mobile-app/` |
| Guía para stakeholders (no técnica) | `juk-portal/docs/guia-stakeholders.md` |

Si un dato ya vive en uno de estos archivos, los demás lo **linkean**; no lo copian. Este archivo
no lleva "estado del proyecto": envejece. El estado está en `docs/estado-actual.md`.

## Gates de negocio

No hay gates ROJOS. Lo que sigue abierto está en `juk-portal/OPEN_DECISIONS.md` (no se copia acá).
Dos reglas se decidieron el 11/06/2026 con ⭐ "validar con el equipo": **CRIT-04** (las excursiones
las aprueba el representante) y **CRIT-05** (cuotas multi-moneda, default USD). Mantenelas acotadas
y fáciles de revertir. Ante un área sensible, corré `/juk-gate <área>` o consultá al agente
`juk-prd-analyst`.

## Cómo trabajar acá

- **Antes de arrancar** → leé `juk-portal/docs/estado-actual.md` y la spec de `docs/prd/` que toca
  tu cambio.
- **Feature nueva** → `/juk-modulo <nombre>` (scaffold por capas) o el agente `juk-arquitecto`.
- **Paso del M6/M7** → `/juk-paso <tipo>`.
- **Cambio de schema Drizzle** → `/juk-migracion` (genera, revisa y commitea la migración).
- **¿Puedo tocar este módulo?** → `/juk-gate <área>`.
- **Servicio externo o setup** → `/juk-setup` o el agente `juk-infra`.
- **Cierre** → `/juk-cierre`: la Definition of Done, que incluye la regla de sincronía.

## Reglas operativas del workspace

- No mates procesos ni liberes puertos del dueño sin preguntar.
- Nunca `npm update` ni `npm audit fix`: crashean en este repo (bug de npm/arborist al resolver un
  peer de vitest, no del proyecto). Para actualizar: `npm install <paquete>@<versión>`. Detalle en
  `.claude/docs/04-operacion-y-handoff.md`.
- Nada de secretos en docs, commits ni logs: nombres de variables sí, valores nunca.
- Permisos de `.claude/settings.json`: están **denegados** `db:push`, `drizzle-kit push/drop`,
  `git push --force`, `git reset --hard` y `git clean -f`. **Piden confirmación** `db:migrate`,
  `db:seed` y los deploys (`trigger:deploy`, `vercel --prod`). La base de desarrollo tiene datos
  reales del dueño.
- Commits chicos, en español, con el formato `tipo(scope): descripción` (el scope es opcional: `perf: …`).
