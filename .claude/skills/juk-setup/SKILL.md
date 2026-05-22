---
name: juk-setup
description: Checklist guiado de la Fase 0 del JUK Portal — configura todos los servicios (Neon, Vercel, R2, Resend, Trigger.dev, Sentry) y deja el proyecto corriendo local y deployado. Usalo para el setup inicial o para sumar un servicio que falte.
---

# /juk-setup — Setup técnico (Fase 0)

Lleva el proyecto de "scaffold sin correr" a "anda local + deployado". Basado en
`juk-portal/START_HERE.md` y `juk-portal/docs/phases.md` (Fase 0). Para tareas de infra puntuales,
delegá en el agente **`juk-infra`**.

> **División de tareas:** lo que dice 🤖 lo hace Claude; lo que dice 🧑 lo hace el usuario (crear
> cuentas, pegar credenciales, DNS). Nunca commitear secretos: van en `.env.local` (gitignored).

## Camino crítico mínimo (para que ABM/features sean testeables)

Esto es lo único imprescindible antes de poder correr y verificar features:

1. 🤖 `cd juk-portal && npm install`
2. 🧑 **Neon** ([neon.tech](https://neon.tech)): crear proyecto en región `aws-sa-east-1` (São Paulo).
   Pegar de vuelta `DATABASE_URL` (pooled) y `DATABASE_URL_UNPOOLED` (direct, para migraciones).
3. 🤖 `cp .env.example .env.local` y completar las dos vars de DB + generar secrets locales:
   - `BETTER_AUTH_SECRET` → `openssl rand -base64 32`
   - `GOOGLE_FORM_WEBHOOK_SECRET` → `openssl rand -base64 24`
4. 🤖 `npm run db:generate` (revisar SQL con `/juk-migracion`) y `npm run db:push` (primera vez, greenfield).
5. 🧑 Editar `src/lib/db/seed.ts` con tu email real → 🤖 `npm run db:seed` (crea el super_admin).
6. 🤖 `npm run dev` → verificar login → dashboard. **Ahí ya se pueden construir y testear features.**

## Resto de la Fase 0 (sumar a medida que cada feature lo necesite)

7. 🧑 **GitHub:** crear repo privado, agregar el remote, push. 🤖 El workflow de CI ya está en
   `.github/workflows/ci.yml` (typecheck + lint en cada PR).
8. 🧑 **Vercel:** conectar el repo. **Root Directory = `juk-portal`**. Región Functions `gru1`.
   Copiar las env vars de `.env.local` a Settings → Environment Variables (Production + Preview).
9. 🧑 **Cloudflare R2:** bucket `juk-documents`, API token `Object Read & Write`, custom domain
   `files.jovenesenuk.com`. Pegar credenciales R2.
10. 🧑 **Resend:** API key + verificar dominio `jovenesenuk.com` (requiere acceso DNS). Mientras no esté
    verificado, los emails se logean en consola.
11. 🧑 **Trigger.dev:** crear proyecto, pegar `TRIGGER_PROJECT_ID` y `TRIGGER_SECRET_KEY`.
12. 🧑 **Sentry:** proyecto Next.js, pegar DSN. (Si rompe el build, se puede comentar en `next.config.ts` por ahora.)
13. 🧑 Dominio `portal.jovenesenuk.com` → Vercel.

## Criterio de salida (Fase 0)

Podés crear el usuario super_admin desde el seed, hacer login en producción, y ver el dashboard con el
shell completo. CI corre typecheck + lint en cada PR.

## Notas

- El dev server **arranca aunque falten env vars** — solo fallan las features que las usan al ejecutarlas.
  Por eso el camino crítico mínimo (1-6) alcanza para empezar a codear.
- Costos: todo el stack está en free tier (USD 0-40/mes los primeros 6 meses). No actives planes pagos sin avisar.
