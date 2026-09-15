---
name: juk-setup
description: Deja el JUK Portal corriendo en una máquina nueva y guía la conexión de cada servicio (Neon, Better-Auth, Resend, Cloudflare R2, Trigger.dev, Sentry, Vercel y el CI de GitHub). Usalo para el setup inicial, para sumar un servicio que falta o para revisar uno mal configurado.
---

# /juk-setup — Setup local y servicios

- Qué servicios están conectados hoy y cuáles dependen del dueño: `juk-portal/docs/estado-actual.md`.
- Variables: `juk-portal/.env.example` (nombres y para qué sirve cada una). Los valores van solo en
  `juk-portal/.env.local` (gitignored) o en el panel del servicio; nunca en un doc ni en git.
- Operación del día a día: `.claude/docs/04-operacion-y-handoff.md`. Tareas de infra puntuales:
  agente **`juk-infra`**.

> 🤖 lo hace Claude · 🧑 lo hace el usuario (crear cuentas, pegar credenciales, DNS).

## Local

1. 🤖 Node 22 (`juk-portal/.nvmrc`). `cd juk-portal && npm install`.
   No uses `npm update` ni `npm audit fix`: crashean en este repo por un bug de npm. Para
   actualizar un paquete: `npm install <paquete>@<versión>`.
2. 🧑 **Neon**: proyecto en `aws-sa-east-1` (São Paulo). Pasar `DATABASE_URL` (pooled, la usa la
   app) y `DATABASE_URL_UNPOOLED` (directa, la usa drizzle-kit).
3. 🤖 `cp .env.example .env.local` y completar la DB y los secretos locales:
   `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `GOOGLE_FORM_WEBHOOK_SECRET`,
   `RESEND_WEBHOOK_SECRET`, `SEED_TEST_PASSWORD`. `BETTER_AUTH_URL` y `NEXT_PUBLIC_APP_URL` con el
   puerto que vayas a usar.
4. 🤖 Migraciones: `npm run db:migrate`. drizzle-kit y los seeds (tsx) no leen `.env.local` solos:
   cargalo en la shell antes (receta en `.claude/docs/04`). Nunca `db:push`.
   Si la base ya tiene datos (la de desarrollo del dueño los tiene), no corras nada destructivo.
5. 🧑 Poner el email real del super_admin en `src/lib/db/seed.ts` → 🤖 `npm run db:seed` (imprime
   la contraseña temporal). Opcional: `npm run db:seed:demo` (dataset demo y cuentas `test.*` con
   `SEED_TEST_PASSWORD`).
6. 🤖 `npm run dev` → login → dashboard. Puertos: el dueño usa el 3000; Claude y los E2E, el 3001
   (`npm run dev -- -p 3001`). Next 16 no permite dos dev servers del mismo proyecto: si ya hay uno,
   los E2E se apuntan a ese con `PW_PORT`.
7. 🤖 `npm run hooks:install` (activa el pre-push: typecheck, lint, unit y `check:tests`).
8. 🤖 Verificar: `npm run typecheck && npm run lint && npm test`.

El dev server arranca aunque falten las variables de los servicios (fallan solo las features que
los usan). `DATABASE_URL` es la excepción: `src/lib/db/index.ts` lanza al importarse, así que sin
ella toda pantalla que toca la base, login incluido, da error.

## Servicios

| Servicio | 🧑 Qué hace el usuario | Variables | Cómo se verifica |
|---|---|---|---|
| Resend (mails) | API key; verificar por DNS el dominio de `EMAIL_FROM_ADDRESS`/`EMAIL_FROM_COMUNICACIONES` y el subdominio de marketing de `EMAIL_FROM_OUTREACH`; webhook de eventos a `/api/webhooks/resend` | `RESEND_API_KEY`, `EMAIL_FROM_*`, `EMAIL_REPLY_TO`, `LEADS_NOTIFY_TO`, `RESEND_WEBHOOK_SECRET` | `/configuracion` → envío de prueba (solo super_admin). Con `EMAIL_DRY_RUN=1` los mails se renderizan y loguean sin salir |
| Cloudflare R2 (documentos) | bucket **privado** y token con Object Read & Write | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | subir un documento a un paso y abrirlo (se sirve por `/api/uploads`, con control de acceso). En producción sin R2 los uploads fallan; en dev caen a `.uploads/` |
| Trigger.dev (jobs diarios) | crear el proyecto | `TRIGGER_PROJECT_ID`, `TRIGGER_SECRET_KEY` | `npm run trigger:dev` en local; `npm run trigger:deploy` lo decide y lo corre el usuario |
| Sentry | proyecto Next.js | `NEXT_PUBLIC_SENTRY_DSN`; opcionales, para subir source maps en el build: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | un error de prueba llega al proyecto |
| Google Form (alta de alumnos) | apuntar el script del formulario al webhook con el secreto | `GOOGLE_FORM_WEBHOOK_SECRET` | una respuesta del form crea el alumno (`/api/webhooks/google-form`) |
| Vercel | conectar el repo, **Root Directory = `juk-portal`**, región `gru1` (`vercel.json`), variables en Production y Preview | las de `.env.example` con valores de producción | deploy + login |
| Sitio público y dominios | decidir los dominios de marketing y de gestión; opcional: Google Analytics y Search Console | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PORTAL_URL` (separa gestión y marketing por dominio en `src/proxy.ts`), `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GSC_VERIFICATION`, `NEXT_PUBLIC_ENABLE_TWEAK` | el sitio público y el portal responden cada uno en su dominio |
| GitHub Actions | secrets `NEON_API_KEY` y `NEON_PROJECT_ID` (este también puede ir como variable; sin ellos el job e2e se saltea sin fallar); `SEED_TEST_PASSWORD` opcional; variable `NEON_PARENT_BRANCH` recomendada (así el runner no recibe una copia de los datos reales); opcionales `NEON_DATABASE` (default `neondb`), `NEON_ROLE` (default `neondb_owner`) y `E2E_SERVER` (default `dev`) | — | un push corre `check` y `e2e` (`.github/workflows/ci.yml`). Sin GitHub Pro el CI informa pero no bloquea merges |

## Reglas

- Free tier en todo el stack: no actives planes pagos sin avisar.
- Toda variable nueva va a `.env.example` (sin valor) y a `.claude/docs/04` en el mismo cambio.
