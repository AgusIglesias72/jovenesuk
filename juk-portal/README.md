# JUK Portal

Sistema de gestión de **Jóvenes en UK** (JUK), una agencia argentina de viajes de estudio. Una sola
app Next.js con tres superficies:

- **Back-office** (`/dashboard`, `/alumnos`, `/viajes`, …): el equipo gestiona colegios, viajes,
  alumnos, trámites (M6/M7), cuotas, consultas y el CRM de prospectos.
- **Portal de Familias** (`/familias/<dni>`): documentación, pagos y datos del viaje de cada alumno.
- **Sitio público** (`/`, `/salidas`, `/notas`, …): marketing y captura de consultas.

Qué está construido y qué falta: [`docs/estado-actual.md`](docs/estado-actual.md).

## Requisitos

- **Node 22** (`.nvmrc`; `engines` pide `>=22`) y npm.
- Una base **Neon Postgres**, con la URL pooled (`DATABASE_URL`) y la directa (`DATABASE_URL_UNPOOLED`, la usa drizzle-kit).
- El resto de los servicios (Resend, R2, Trigger.dev, Sentry) **no hacen falta para desarrollar**,
  siempre que sus variables queden **vacías**: `.env.example` trae placeholders, y un placeholder
  cuenta como credencial. Después del `cp` del Quickstart, dejá `RESEND_API_KEY=` vacía (o poné
  `EMAIL_DRY_RUN=1`) para que los mails salgan en dry-run; con el placeholder, los flujos que mandan
  mail (acceso de familia, alta de usuario, reset) fallan. Vaciá también las `R2_*` para que los
  documentos vayan directo a `.uploads/` sin intentar R2 primero.

## Quickstart

```bash
cd juk-portal
npm install
cp .env.example .env.local
# Completá como mínimo: DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET,
# BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL y SEED_TEST_PASSWORD.
```

`next dev`, Playwright y el setup de integración leen `.env.local` solos; **drizzle-kit y los seeds
(tsx) no**. Cargalo en la shell antes de correrlos:

```bash
# bash / Git Bash
set -a; source .env.local; set +a
```

```powershell
# PowerShell
Get-Content .env.local | ForEach-Object { if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$') { Set-Item -Path "env:$($matches[1])" -Value $matches[2] } }
```

Y después:

```bash
npm run db:migrate     # aplica las migraciones de drizzle/
npm run db:seed        # crea el super_admin: antes editá SEED_EMAIL en src/lib/db/seed.ts.
                       # Imprime una contraseña temporal: guardala y cambiala al entrar.
npm run db:seed:demo   # opcional: cuentas test.* + dataset [DEMO] (requiere SEED_TEST_PASSWORD)
npm run dev            # http://localhost:3000
```

Para ver qué te falta configurar en cualquier momento: `npm run check:env` (y
`npm run check:env:prod` para lo que tiene que estar en un deploy).

Setup de los servicios externos (Neon, Vercel, R2, Resend, Trigger.dev, Sentry): el paso a paso
está en [`docs/setup-servicios.md`](docs/setup-servicios.md); para hacerlo acompañado, la skill
`/juk-setup`. Operación y deploy: [`../.claude/docs/04-operacion-y-handoff.md`](../.claude/docs/04-operacion-y-handoff.md).

## Scripts

| Script | Para qué | ¿Hay que cargar `.env.local` en la shell? |
|---|---|---|
| `npm run dev` | Server de desarrollo (Turbopack) en el 3000 | No |
| `npm run build` / `npm run start` | Build de producción / servirlo | No |
| `npm run lint` | ESLint (incluye la guarda de tokens STUDIO) | No |
| `npm run typecheck` | `tsc --noEmit` | No |
| `npm run format` | Prettier sobre `ts`, `tsx` y `md` | No |
| `npm run db:generate` | Genera la migración de un cambio de schema (usar `/juk-migracion`) | Sí |
| `npm run db:migrate` | Aplica las migraciones pendientes | Sí |
| `npm run db:push` | Empuja el schema sin migración: no se usa para cambios de schema (van con migración) | Sí |
| `npm run db:studio` | Drizzle Studio | Sí |
| `npm run db:seed` | Crea el super_admin (idempotente) | Sí |
| `npm run db:seed:demo` | Cuentas `test.*` + dataset `[DEMO]` (idempotente) | Sí |
| `npm run trigger:dev` / `npm run trigger:deploy` | Jobs de Trigger.dev en local / deploy | Ver `.claude/docs/04` |
| `npm run email:dev` | Preview local de las plantillas de mail | No |
| `npm test` / `npm run test:watch` | Unit tests (Vitest, proyecto `unit`) | No |
| `npm run test:coverage` | Unit con cobertura; falla si baja del piso de `vitest.config.ts` | No |
| `npm run test:integration` | Integración contra Postgres real (solo con `INTEGRATION_DATABASE_URL`) | No (lo lee el setup) |
| `npm run test:e2e` / `npm run test:e2e:mobile` | Playwright: suite completa / solo el proyecto `mobile` | No |
| `npm run check:tests` | Falla si un archivo nuevo o modificado de domain/utils/actions no tiene su `.test.ts` | No |
| `npm run ci:local` | El CI completo en tu máquina: rápidos + integración + Playwright sobre una branch efímera de Neon | No (lee `.env.local`; necesita `NEON_PROJECT_ID` y `neonctl` logueado) |
| `npm run check:env` / `npm run check:env:prod` | Qué variables faltan, cuáles quedaron con el valor de ejemplo y cuáles no deberían estar en producción. La variante `:prod` evalúa el perfil de un deploy | No (lee `.env.local`) |
| `npm run hooks:install` | Activa el hook `pre-push` del repo (typecheck, lint, unit, `check:tests`) | No |

> Nunca `npm update` ni `npm audit fix`: crashean en este repo. Para actualizar un paquete:
> `npm install <paquete>@<versión>`.

> El detalle operativo de cada script (cuándo se usa, qué variables necesita, las trampas) vive en
> [`.claude/docs/04-operacion-y-handoff.md`](../.claude/docs/04-operacion-y-handoff.md#scripts-de-packagejson).

## Tests

La guía completa (qué cubre cada capa, cómo diagnosticar, trampas conocidas):
[`../.claude/docs/05-testing.md`](../.claude/docs/05-testing.md).

- **Unit**: `npm test`. No necesita base: `src/**/*.test.ts(x)` al lado de cada archivo, más los
  tests de `scripts/**/*.test.mjs`.
- **Integración**: `INTEGRATION_DATABASE_URL=$DATABASE_URL npm run test:integration` (bash, con el
  env cargado). Crea filas con prefijos `INT-` / `[INT]` / `int+` y las borra al terminar. Sin la
  variable, los tests se saltean y la base de dev no se toca.
- **E2E**: antes, `npm run db:seed:demo`; `SEED_TEST_PASSWORD` tiene que estar en `.env.local`.
  `npm run test:e2e` levanta su propio `next dev` en el **3001** (o reusa uno que ya esté ahí).
  Para apuntar a un server que ya corre: `PW_PORT=3000 npm run test:e2e`. Un solo spec:
  `npx playwright test tests/e2e/viajes.spec.ts`. Para diagnosticar: `--trace on` y leer el trace.
  - `E2E_DATABASE_URL=<url de una branch de Neon>` corre la suite contra esa base sin tocar la de
    dev (aplica al server que levanta Playwright; con `PW_PORT` manda la base con la que arrancó
    ese server).
  - `E2E_SERVER=dev|start` fuerza `next dev` o `next start` sobre el build. Sin la variable, en
    local es `dev`.
- **Todo junto, en local**: `npm run ci:local`. Chequeos rápidos + una branch efímera de Neon (hija
  de `ci-base`, sin datos) con migraciones, seeds, integración y Playwright; al final la borra. No
  toca la base de dev y convive con tu `next dev` del 3000. Opciones: `--rapido`, `--sin-e2e`,
  `--saltear-rapidos`, `--mantener-branch` (con `node scripts/ci-local.mjs …`).
- **CI** (`../.github/workflows/ci.yml`, en la raíz del repo): el job `check` corre en cada push y
  PR a `main`; el job `e2e` **solo a mano** (Actions → CI → *Run workflow*), porque son ~30 minutos
  de runner. Configuración:
  [`../.claude/docs/04-operacion-y-handoff.md` § CI](../.claude/docs/04-operacion-y-handoff.md#ci-github-actions).

## Documentación

| Qué | Dónde |
|---|---|
| Estado: construido, pendiente, depende del dueño, deuda | [`docs/estado-actual.md`](docs/estado-actual.md) |
| Historial de cambios | [`CHANGELOG.md`](CHANGELOG.md) |
| Specs funcionales (PRD) | [`docs/prd/00-indice.md`](docs/prd/00-indice.md) |
| Decisiones de negocio | [`OPEN_DECISIONS.md`](OPEN_DECISIONS.md) |
| Arquitectura y stack (ADRs) | [`docs/architecture.md`](docs/architecture.md) |
| Sistema de diseño STUDIO | [`docs/design-system.md`](docs/design-system.md) |
| Convenciones de código | [`CLAUDE.md`](CLAUDE.md) |
| Regla de sincronía y cómo se trabaja con Claude Code | [`../CLAUDE.md`](../CLAUDE.md) |
| Handoff: producto, mapa de archivos, operación, testing, seguridad, performance | [`../.claude/docs/`](../.claude/docs/README.md) |
| App nativa (Capacitor) | [`docs/mobile-app/`](docs/mobile-app/README.md) |
| Guía para que terceros prueben el entorno demo (cuentas `test.*`, qué mirar) | [`docs/guia-stakeholders.md`](docs/guia-stakeholders.md) |
