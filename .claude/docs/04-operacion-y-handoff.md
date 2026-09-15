# 04 · Operación y handoff

> Cómo correr, migrar, seedear, testear y deployar; qué servicios y variables usa; cómo se usa el
> harness de Claude. Qué servicios están **conectados hoy** y qué depende del dueño →
> [`docs/estado-actual.md`](../../juk-portal/docs/estado-actual.md).

Todos los comandos corren desde `juk-portal/`, salvo que se diga otra cosa.

## Correr en local

1. **Node ≥ 22** (`.nvmrc` = 22) y `npm install`.
2. `cp .env.example .env.local` y completá lo mínimo:
   `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`),
   `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` y `SEED_TEST_PASSWORD`. El resto de los servicios es
   opcional en dev (ver [qué pasa si falta](#servicios-externos-y-variables)).
3. Base: `npm run db:migrate` y después `npm run db:seed:demo` (primero cargá el env: ver abajo).
4. `npm run dev` → `http://localhost:3000`. Entrá con `test.superadmin@jovenesenuk.com` y la
   contraseña que pusiste en `SEED_TEST_PASSWORD`.

**Puertos.** El dueño corre su dev en el **3000**; los E2E levantan su propio server en el **3001**.
Next 16 no permite dos `next dev` sobre el mismo proyecto: para que Playwright use el server que
ya está corriendo, `PW_PORT=3000`. En dev, Better-Auth confía en `localhost:3000` y `localhost:3001`.

**Cargar `.env.local` en scripts que no lo leen solos.** Next (`dev`/`build`/`start`), Playwright
y el setup de integración lo cargan. `drizzle-kit` (`db:*`) y `tsx` (`db:seed*`) **no**:

```bash
# bash / Git Bash
set -a; source .env.local; set +a
npm run db:migrate
```

```powershell
# PowerShell (misma regla que el loader de playwright.config.ts)
Get-Content .env.local -Encoding UTF8 | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$') { Set-Item -Path "env:$($matches[1])" -Value $matches[2] }
}
npm run db:migrate
```

## Scripts de `package.json`

"¿Env?" dice si el script necesita que cargues `.env.local` a mano antes.

| Script | Qué hace | Cuándo | ¿Env? |
|---|---|---|---|
| `dev` | `next dev` (Turbopack) | Desarrollo | Lo carga Next |
| `build` | `next build` | Antes de un deploy o para validar un cambio grande; también lo corre el CI | Lo carga Next (necesita `DATABASE_URL` definida: `src/lib/db/index.ts` tira al importarse sin ella) |
| `start` | `next start` sobre el build | Probar el build en modo producción | Lo carga Next |
| `lint` | ESLint (flat config; incluye la guarda de tokens del DS) | Siempre antes de commitear | No |
| `typecheck` | `tsc --noEmit` | Siempre antes de commitear | No |
| `format` | Prettier sobre `ts`, `tsx` y `md` | Cuando quieras normalizar formato | No |
| `db:generate` | `drizzle-kit generate`: escribe el SQL en `drizzle/` | Después de tocar `src/lib/db/schema/` | **Sí** |
| `db:migrate` | `drizzle-kit migrate`: aplica las migraciones pendientes (usa `DATABASE_URL_UNPOOLED`, o `DATABASE_URL` si falta) | Local, CI y producción | **Sí** |
| `db:push` | `drizzle-kit push`: empuja el schema sin migración | No se usa para cambios de schema (van por migración). Como mucho, a mano sobre una base descartable y vacía. Claude lo tiene prohibido (`deny` + hook) | **Sí** |
| `db:studio` | Drizzle Studio (explorador de la base) | Inspeccionar datos | **Sí** |
| `db:seed` | Crea el `super_admin` inicial (editá `SEED_EMAIL` en `src/lib/db/seed.ts` antes). Imprime credenciales temporales en la terminal | Una vez por base nueva | **Sí** |
| `db:seed:demo` | Cuentas `test.*`, dos familias demo y el dataset `[DEMO]` (ver [Seeds](#seeds)) | Base de dev, branch de CI, precondición de los E2E | **Sí** |
| `trigger:dev` | CLI de Trigger.dev 4.5.16 en modo dev | Probar jobs en local | `trigger.config.ts` lee `TRIGGER_PROJECT_ID` del entorno |
| `trigger:deploy` | Deploy de las tasks de `src/trigger/` | Cuando cambian las tasks (va aparte del deploy de Vercel) | Ídem |
| `email:dev` | Preview de los templates de `src/lib/email/templates` | Diseñar mails | No |
| `test` | Vitest, proyecto `unit` | Siempre | No |
| `test:watch` | Ídem en watch | Mientras codeás dominio | No |
| `test:coverage` | Unit con cobertura; falla si baja del piso | Antes de pushear un cambio de lógica; lo corre el CI | No |
| `test:integration` | Vitest, proyecto `integration`, contra Postgres real. **Ojo:** corre con `--passWithNoTests` y sin `INTEGRATION_DATABASE_URL` cada archivo se saltea, así que termina en verde **sin haber probado nada**. Ese verde no es "integración OK": mirá que los tests figuren como pasados, no salteados | Al tocar queries con SQL no trivial o jobs | Lo carga el setup, **pero solo corre con `INTEGRATION_DATABASE_URL`** |
| `test:e2e` | Playwright, todos los proyectos. `setup` dispara al final el proyecto `cleanup` (`global.teardown.ts`), que borra los datos generados por la corrida. Con `E2E_DATABASE_URL` la suite apunta a otra base (una branch de Neon) y no toca la de dev | Al cerrar una feature con UI | Lo carga `playwright.config.ts` |
| `test:e2e:mobile` | Playwright, solo el proyecto `mobile` | Cambios de layout o de interacción táctil | Ídem |
| `check:tests` | Exige test compañero para lo nuevo o modificado en `domain`/`utils`/`actions` | Antes de pushear; lo corren el pre-push y el CI | No (usa git) |
| `check:env` · `check:env:prod` | Evalúa `.env.local` contra el catálogo de `src/lib/domain/configuracion/env.ts`: qué falta, qué quedó con el molde de `.env.example` y qué no debería estar seteada en un deploy. La variante `:prod` usa el perfil de producción. Los demás flags (`--env <archivo>` para evaluar lo que baja `vercel env pull`, `--soft` para no fallar nunca, `--nombres` para chequear solo existencia) van invocando el script directo: `npx tsx scripts/check-env.ts --prod --env .env.produccion` — **en PowerShell el `--` de `npm run … -- --flag` se pierde**. Ojo: `vercel env pull` trae los nombres con el valor **vacío** (Vercel no devuelve las encriptadas), así que el script entra solo en modo `--nombres` y solo puede decir qué falta cargar, no si allá quedó un molde. Nunca imprime valores | Antes de un deploy, o cuando "no manda mails" / "no sube archivos" | Lo lee el script |
| `hooks:install` | `git config core.hooksPath .githooks`: activa el pre-push. El hook vive en la **raíz del repo** (`jovenesuk/.githooks/pre-push`), no en `juk-portal/`: git resuelve el path relativo contra la raíz del working tree. Corre `typecheck` → `lint` → `npm test` → `check:tests` (sin cobertura, audit, build ni E2E: eso queda para el CI y `/juk-cierre`) | Una vez por clon | No |

Testing en detalle: [05-testing](05-testing.md).

## Base de datos y migraciones

- **Neon**, región São Paulo. `DATABASE_URL` es la conexión pooled (la usa la app) y
  `DATABASE_URL_UNPOOLED` la directa (la usa `drizzle-kit`).
- **Cambio de schema** → `/juk-migracion`: tocás `src/lib/db/schema/`, corrés `npm run db:generate`,
  **leés el SQL** de `drizzle/` y lo commiteás en el mismo commit que el schema. Si el SQL tiene un
  `DROP` que no esperabas (un rename mal detectado sale como drop+add), frená.
- **Migración de datos.** Primero preguntate si hace falta. Precedente del proyecto: cuando cambiaron
  los sub-estados de Pasajes y Excursiones, el código tolera los valores viejos y los normaliza al
  guardar, sin migrar datos. Si hace falta, `npx drizzle-kit generate --custom --name <nombre>` crea
  una migración vacía para escribir el `UPDATE` a mano (las migraciones son el único lugar con SQL
  crudo). Que sea idempotente y probala antes en una branch de Neon.
- **Producción:** ningún workflow migra producción. Se aplica a mano, con el env de producción
  cargado (`npm run db:migrate`), **antes** del deploy que necesita el cambio. Probalo antes en una
  branch de Neon creada desde producción.

## Seeds

- `db:seed`: el `super_admin` real inicial. Es idempotente: si el email ya existe, lo saltea.
- `db:seed:demo` (idempotente: borra lo `[DEMO]` y lo vuelve a crear):
  - `test.superadmin@jovenesenuk.com` (`super_admin`) y `test.admin@jovenesenuk.com` (`admin_juk`),
    con `SEED_TEST_PASSWORD` (obligatoria, sin default en el código). Si ya existen, les **vuelve a
    fijar** contraseña, rol y estado activo. Hace falta porque la branch de CI se copia de otra base.
  - `tutor@demo.jovenesenuk.com` y `tutor2@demo.jovenesenuk.com`: dos familias, cada una con su
    alumno, para probar el aislamiento. Contraseña: `SEED_FAMILIA_PASSWORD`, o `SEED_TEST_PASSWORD`
    si no está.
  - Un dataset que recorre todas las ramas del negocio (colegios con configs distintas, GL con
    police checks en tres estados, viajes grupales e individuales, alumnos con pasaportes al día,
    en alerta o cortos). Los tableros se generan con el mismo dominio que usa la app.
- Las cuentas `test.*` y el dataset demo **se borran antes de salir a producción con datos reales**.

## CI (GitHub Actions)

`.github/workflows/ci.yml` corre en cada push y PR a `main` (y a mano). Un push nuevo a la misma
rama cancela la corrida anterior.

| Job | Qué corre |
|---|---|
| `check` | `npm ci` → `typecheck` → `lint` → `test:coverage` (con piso) → test compañero contra la base del PR o del push → `npm audit --omit=dev --audit-level=high` → `next build` con variables dummy (no apuntan a nada) |
| `e2e-gate` | Mira si están los secrets de Neon. Si faltan, deja el e2e en *skipped* con un aviso: no lo pone en rojo |
| `e2e` | Corre solo si `check` pasó y hay secrets de Neon. Crea una branch efímera (se borra al final y vence sola a las 3 h) → `db:migrate` → `db:seed` + `db:seed:demo` → `test:integration` → instala Chromium → Playwright contra **`next dev`** (con `E2E_SERVER=start` hace antes `next build`) → sube reporte y traces. Chromium y Playwright corren si el seed salió bien, aunque haya fallado la integración |

**Por qué el e2e corre sobre `next dev`.** En modo producción rigen el rate limit real de login
(5 intentos cada 15 minutos) y el storage exige R2. Aflojar eso con un flag en el código de
producción sería un bypass de seguridad activable por variable de entorno. El build de producción
ya se valida en `check`. Con la variable de repo `E2E_SERVER=start` se puede probar contra
`next start` a mano.

**Configuración del repo** (Settings → Secrets and variables → Actions):

| Nombre | Tipo | Para qué |
|---|---|---|
| `NEON_API_KEY` | secret | Crear y borrar la branch efímera. Sin él, el e2e se saltea |
| `NEON_PROJECT_ID` | secret o variable | Ídem |
| `NEON_PARENT_BRANCH` | variable (recomendada) | Branch de la que se copia la efímera. Conviene una branch sin datos reales, así el runner nunca recibe una copia de ellos |
| `SEED_TEST_PASSWORD` | secret (opcional) | Si falta, se genera una al azar por corrida |
| `NEON_DATABASE`, `NEON_ROLE` | variables (opcionales) | Defaults `neondb` y `neondb_owner` |
| `E2E_SERVER` | variable (opcional) | `start` para correr contra el build |

`BETTER_AUTH_SECRET`, `GOOGLE_FORM_WEBHOOK_SECRET` y las URLs de la base se generan en cada corrida
y se enmascaran en el log: no se guardan en GitHub.

**Leer una corrida.** Los tests unitarios fallidos aparecen como anotaciones en el PR (reporter
`github-actions`). Los artifacts son `unit-coverage` (cobertura + junit) y `playwright-report`
(reporte html + `test-results/` con traces). En CI Playwright reintenta 2 veces: un test que pasa
recién al reintentar figura como *flaky* en el reporte, y eso hay que ir a buscarlo.

Sin GitHub Pro (repo privado), el CI **informa pero no bloquea** merges: la protección de rama
necesita un plan pago. Hasta entonces, la disciplina es no mergear con el CI en rojo.

## Deploy

- **Vercel.** Root Directory = `juk-portal`; región `gru1` (`vercel.json`). Las variables se cargan
  en Vercel (Production y Preview), nunca en el repo.
- **Orden de un deploy con cambio de schema:** probar la migración en una branch de Neon → migrar
  producción → deployar.
- **Trigger.dev** se deploya aparte: `npm run trigger:deploy` cuando cambian `src/trigger/` o lo que usan.
- **Source maps de Sentry:** se suben en el build solo si están `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` y
  `SENTRY_PROJECT`. Si falta alguna, el build no toca Sentry.

## Servicios externos y variables

Nombres, nunca valores. El **catálogo** (qué habilita cada variable, qué pasa si falta, qué nivel
tiene) vive en `src/lib/domain/configuracion/env.ts` y es el que leen `npm run check:env` y la
tarjeta de `/configuracion`: si agregás una variable, va ahí y en `.env.example` (el script avisa si
divergen). El alta de cada servicio, paso a paso, en
[`docs/setup-servicios.md`](../../juk-portal/docs/setup-servicios.md). La plantilla comentada es
`.env.example`, que trae las variables de la app y los servicios. Las de tests (`SEED_FAMILIA_PASSWORD`, `INTEGRATION_DATABASE_URL`,
`E2E_DATABASE_URL`, `PW_PORT`, `E2E_SERVER`, `E2E_EMAIL`/`E2E_PASSWORD`,
`E2E_FAMILIA_EMAIL`/`E2E_FAMILIA_PASSWORD`, `E2E_COLEGIO`) **no están** en la plantilla: se
documentan en [05-testing](05-testing.md). El estado de cada servicio (qué
variable falta) se ve en `/configuracion` (solo `super_admin`), en la tarjeta "Estado de servicios".

| Servicio | Variables | Si falta |
|---|---|---|
| App | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PORTAL_URL` (opcional: activa el split `portal.*`) | — |
| Neon | `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (migraciones) | Sin `DATABASE_URL` la app no arranca (ni compila: `src/lib/db/index.ts` tira al importarse). Sin `DATABASE_URL_UNPOOLED`, `drizzle-kit` usa `DATABASE_URL`; la app no la lee |
| Better-Auth | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | No hay login |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`, `EMAIL_FROM_COMUNICACIONES`, `EMAIL_FROM_OUTREACH`, `LEADS_NOTIFY_TO` | Fuera de producción los mails se renderizan y loguean sin salir (dry-run). En producción el envío falla. Los remitentes también se configuran en `/configuracion`, que tiene prioridad sobre el env |
| Resend (webhook) | `RESEND_WEBHOOK_SECRET` (`whsec_…`) | Los eventos de tracking se ignoran (responde 200) |
| Cloudflare R2 | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (bucket **privado**, sin `R2_PUBLIC_URL`) | En local (sin `VERCEL` ni `NODE_ENV=production`) los documentos van a `.uploads/`, también si R2 está configurado pero no responde (con un `console.error`). En producción y en **cualquier deploy de Vercel, Preview incluido**, la subida falla explícito (`StorageNoConfiguradoError`) |
| Trigger.dev | `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_ID` | La consulta nueva se avisa por mail directo desde la action. El aviso de cancelación de viaje no sale (la cancelación queda hecha y el error va a Sentry). El scan diario no corre |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`; para source maps `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Sentry queda desactivado (en producción se loguea el aviso) |
| Google Form | `GOOGLE_FORM_WEBHOOK_SECRET` (32+ caracteres) | El webhook rechaza todo con 401 |
| Analytics / SEO | `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GSC_VERIFICATION` | Sin analytics ni meta de verificación |
| Tweaker del sitio público | `NEXT_PUBLIC_ENABLE_TWEAK` | Es el `DesignTweaker` de `src/app/(public)/layout.tsx`, no el Design Lab retirado (ADR-015). En dev se muestra siempre; en un build de producción solo con `=1` (staging). En producción no se setea |
| Mails en tests | `EMAIL_DRY_RUN=1` | Lo fijan Playwright y el CI |
| Seeds y E2E | `SEED_TEST_PASSWORD`, `SEED_FAMILIA_PASSWORD`, `E2E_*`, `PW_PORT`, `E2E_SERVER`, `E2E_DATABASE_URL`, `INTEGRATION_DATABASE_URL` | Ver [05-testing](05-testing.md) |

## Dependencias

- **Para actualizar, `npm install <paquete>@<versión>` explícito.** `npm update` y `npm audit fix`
  crashean en este repo con `Cannot read properties of null (reading 'edgesOut')`: es un bug de
  arborist al resolver un peer `vitest@*` que termina en vitest 5, no un problema del proyecto.
- **`@vitest/coverage-v8` va en la misma versión que `vitest`.** El provider de cobertura falla si
  no coinciden: subilos juntos.
- **Bloque `overrides` de `package.json`.** Fija versiones parcheadas de dependencias transitivas con
  CVEs altos que npm no vuelve a resolver solo (conserva la copia vieja mientras cumpla el rango):

  | Override | Lo arrastra | Por qué | Se saca cuando |
  |---|---|---|---|
  | `ws` `^8.21.3` | `@trigger.dev/core`, que fija `socket.io-client` en 4.7.5 exacto (trae `ws` 8.17.1) | Ninguna versión publicada del padre lo resuelve | Trigger publique una versión con `socket.io-client` al día |
  | `socket.io-parser` `^4.2.7` | Ídem | Ídem | Ídem |
  | `fast-uri` `^3.1.6` | El plugin de webpack de Sentry, vía `ajv` (solo build) | CVE alto en la versión transitiva | Sentry actualice sus plugins de build |
  | `brace-expansion` `^5.0.9`, **solo dentro de `@sentry/bundler-plugin-core`** | Ídem | Acotado a propósito: en el árbol conviven copias 1.x (eslint) y 2.x (react-email) que no son vulnerables y no aceptarían una 5.x | Ídem |

  Para verificar si ya se puede sacar uno: sacalo, `npm install` y `npm audit --omit=dev`.
- **Criterio de audit:** el CI bloquea solo altas y críticas **de producción** (`--omit=dev`). La
  crítica que reporta el audit completo viene del Next.js que empaqueta `react-email`, una
  devDependency que solo usa `npm run email:dev`: los mails de producción usan
  `@react-email/components` y `@react-email/render`. Se arregla subiendo `react-email` a la 6, un
  salto mayor que toca las plantillas. Queda como deuda en `docs/estado-actual.md`.

## El harness de Claude Code (`.claude/`, en la raíz del repo)

| Pieza | Qué es |
|---|---|
| **Skills** (`.claude/skills/`) | `/juk-modulo` (andamiar un módulo por capas), `/juk-paso` (un paso del M6/M7), `/juk-migracion` (generar, revisar y commitear una migración), `/juk-gate` (¿hay una decisión abierta que afecte esta área?), `/juk-setup` (checklist de servicios), `/juk-cierre` (la Definition of Done: el loop completo antes de dar algo por cerrado) |
| **Agentes** (`.claude/agents/`) | `juk-arquitecto` (blueprint de una feature), `juk-prd-analyst` (cruza PRD, modelo y decisiones abiertas), `juk-revisor` (review contra las convenciones), `juk-infra` (servicios, deploy, entornos) |
| **Hooks** (`.claude/hooks/`, registrados en `.claude/settings.json`; detalle en [`.claude/hooks/README.md`](../hooks/README.md)) | **Antes de cada comando** (Bash/PowerShell): `destructive-command-guard` bloquea borrados recursivos fuera de temporales, SQL destructivo, `drizzle-kit push/drop`, `db:push`, `git push --force`, `reset --hard` y `clean -f`. **Después de cada edición:** `domain-purity-check` bloquea imports de framework o de base en `src/lib/domain/`; `schema-change-reminder` recuerda la migración; `gated-module-warning` avisa en áreas con decisión ⭐ (cuotas, excursiones); `test-companion-check` avisa qué `.test.ts` falta. **Al terminar el turno:** `docs-sync-reminder` recuerda la regla de sincronía si hay cambios en `src/` sin docs vivos tocados. `_comun.mjs` es código compartido y `probar-hooks.mjs` la prueba (`node .claude/hooks/probar-hooks.mjs`); ninguno es un hook |
| **Permisos** (`.claude/settings.json`) | `acceptEdits` con Bash y PowerShell en `allow`: la mayoría de los comandos corren sin confirmación. **Piden confirmación** (`ask`): `db:migrate`, `db:seed*`, `trigger:deploy` y `vercel --prod`. **Están prohibidos** (`deny`, y además los frena `destructive-command-guard`): `db:push`, `drizzle-kit push/drop`, `git push --force`, `git reset --hard` y `git clean -f`. Los hooks frenan errores, no son una barrera de seguridad |

Las skills y agentes pueden quedar atrás del código. Si uno contradice a `juk-portal/CLAUDE.md` o a
estos docs, ganan el código y `CLAUDE.md`, y hay que corregir la skill.

## Cómo seguir

1. Leé [`docs/estado-actual.md`](../../juk-portal/docs/estado-actual.md) y
   [`OPEN_DECISIONS.md`](../../juk-portal/OPEN_DECISIONS.md) antes de elegir qué hacer.
2. Área sensible (pagos, pasos, documentos de menores, portales externos) → `/juk-gate <área>`.
3. Construí con el molde de [02](02-arquitectura-y-convenciones.md#el-molde-de-un-módulo-tal-como-se-construye-hoy):
   de adentro hacia afuera, con el test de cada capa ([05](05-testing.md)).
4. Cerrá con `/juk-cierre`. La regla de sincronía del dueño (completa en el `CLAUDE.md` de la raíz)
   exige que **en el mismo commit o PR** vayan: el código; **su test** (unit, integración o E2E
   según la capa); el PRD (`docs/prd/`) si cambió una regla o algo visible; las definiciones
   (`OPEN_DECISIONS.md`, `docs/architecture.md`, `docs/design-system.md`);
   `docs/estado-actual.md` + `CHANGELOG.md`; y el mapa `03` si hay archivos nuevos o movidos
   (tabla "Qué doc tocar" en el [README](README.md)). Lo automático es solo el test compañero
   (`check:tests` en pre-push y CI) y el recordatorio del hook `docs-sync-reminder`. Lo documental
   lo verifican `/juk-cierre` y `juk-revisor`, y el cierre enumera los seis puntos (`no aplica:
   <motivo>` vale).
