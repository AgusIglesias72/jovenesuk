# Setup de servicios — paso a paso

> Lo que **solo vos podés hacer**: cuentas, dominios, credenciales. Cada sección dice para qué
> sirve, qué hacer y cómo verificar que quedó. Nada de esto se puede resolver desde el código.
>
> El estado vigente (qué está conectado y qué falta) vive en
> [`estado-actual.md`](estado-actual.md) §7. El detalle técnico de cada variable, en
> [`../../.claude/docs/04-operacion-y-handoff.md`](../../.claude/docs/04-operacion-y-handoff.md#servicios-externos-y-variables).

## Cómo verificar cualquier cosa de acá

```bash
cd juk-portal
npm run check:env        # tu máquina: qué falta para desarrollar
npm run check:env:prod   # perfil producción: qué tiene que estar en Vercel
```

> En PowerShell los flags sueltos no llegan (se come el `--` de `npm run … -- --flag`): para
> pasarle opciones al script, invocalo directo con `npx tsx scripts/check-env.ts <flags>`.

El comando lee `.env.local` y marca tres cosas: **falta** (✗), **quedó el valor de ejemplo** (⚠) y
**seteada donde no debería** (una variable que aflojaría producción). Nunca imprime valores.

Para chequear lo que realmente hay cargado en Vercel, bajalo y evaluá ese archivo:

```bash
vercel env pull .env.produccion --environment=production
npx tsx scripts/check-env.ts --prod --env .env.produccion
rm .env.produccion       # no lo dejes dando vueltas
```

La misma foto, desde adentro de la app: `/configuracion` → *Estado de servicios* (solo `super_admin`).

---

## Orden sugerido

| # | Qué | Destraba | Cuánto lleva |
|---|---|---|---|
| 1 | [Cloudflare R2](#1-cloudflare-r2--documentos) | Subir documentos en producción | ~15 min |
| 2 | [Secrets de Neon en GitHub](#2-secrets-de-neon-en-github--ci) | El job `e2e` del CI | ~10 min |
| 3 | [Sentry](#3-sentry--errores-de-producción) | Ver errores reales y endurecer la CSP | ~10 min |
| 4 | [Trigger.dev](#4-triggerdev--jobs-automáticos) | Recordatorios y transiciones por fecha | ~20 min |
| 5 | [Resend · outreach](#5-resend--outreach-del-crm) | Campañas del CRM y su tracking | ~30 min + DNS |
| 6 | [Dominio y Vercel](#6-dominio-vercel-y-deploy) | El portal en su dominio definitivo | variable |
| 7 | [Branch protection](#7-branch-protection-opcional) | Que el CI bloquee merges en rojo | 5 min (pago) |

---

## 1. Cloudflare R2 — documentos

**Para qué.** Pasaportes, consentimientos y todo lo que suben las familias. Hoy, en un deploy sin
R2, la subida **falla a propósito**: el disco de Vercel es efímero y perder un pasaporte subido es
peor que no aceptarlo.

1. Cloudflare → **R2** → *Create bucket*. Nombre sugerido: `juk-documents`. Región: automática.
2. **No** le actives dominio público ni `r2.dev`. Tiene que quedar **privado**: los documentos se
   sirven siempre por `/api/uploads/<key>`, que verifica sesión y dueño.
3. R2 → *Manage API tokens* → **Create API token**, permiso *Object Read & Write*, acotado a ese
   bucket. Guardá `Access Key ID` y `Secret Access Key` (el secreto se muestra una sola vez).
4. El `Account ID` está arriba a la derecha en el panel de R2.
5. Cargá las cuatro en Vercel (Production y Preview):

```bash
cd juk-portal
vercel env add R2_ACCOUNT_ID production
vercel env add R2_ACCESS_KEY_ID production
vercel env add R2_SECRET_ACCESS_KEY production
vercel env add R2_BUCKET_NAME production
```

**Verificá.** En un deploy, `/configuracion` → *Cloudflare R2 (archivos)* en **OK**; subí un
documento de prueba en la ficha de un alumno y bajálo. Si querés usar R2 desde tu máquina, poné las
mismas cuatro en `.env.local`; si las dejás vacías, los archivos van a `.uploads/` (fallback local).

> ⚠️ Nunca crees `R2_PUBLIC_URL`: no existe en el código y la idea es que no exista nunca.

---

## 2. Secrets de Neon en GitHub — CI

**Para qué.** El job `e2e` del CI crea una **branch efímera de Neon**, corre integración +
Playwright y la borra. Sin estos secrets se saltea con un aviso (el job `check` sí corre siempre).

1. Neon → *Account settings* → **API keys** → *Create new API key*. Copiala.
2. El `Project ID` está en Neon → *Project settings* → *General*.
3. Cargalos en el repo (ya tenés `gh` logueado en esta máquina):

```bash
gh secret set NEON_API_KEY          # pega la API key y Enter
gh secret set NEON_PROJECT_ID       # pega el project id
gh secret set SEED_TEST_PASSWORD    # una password cualquiera para las cuentas test.* del CI
gh variable set NEON_PARENT_BRANCH --body "ci-base"
```

`NEON_PARENT_BRANCH` es **recomendada**: apuntala a una branch **sin datos reales**. Si no la
seteás, la branch efímera se saca de tu rama principal y el runner recibe una copia de los datos
del negocio.

**Verificá.** `gh secret list` los muestra por nombre. Después de un push, `gh run list` tiene que
mostrar el job `e2e` corriendo en vez de salteado.

---

## 3. Sentry — errores de producción

**Para qué.** Sin DSN, un error en producción no se ve en ningún lado. Además es el requisito para
pasar la CSP de *Report-Only* a enforce.

1. sentry.io → proyecto (plataforma **Next.js**) → *Settings* → *Client Keys (DSN)*.
2. `vercel env add NEXT_PUBLIC_SENTRY_DSN production` (y `preview`, si querés).
3. Opcional, para stack traces legibles: *Settings* → *Auth Tokens*, scope `project:releases`, y
   cargá `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` y `SENTRY_PROJECT`. Las tres o ninguna.

**Verificá.** Después del deploy, `/configuracion` → *Sentry (errores)* en OK. Dejá correr una o dos
semanas mirando los reportes de CSP antes de endurecerla.

---

## 4. Trigger.dev — jobs automáticos

**Para qué.** Mientras no esté, **no hay recordatorios automáticos**, el paso A1 no pasa solo a
*vencido* y los viajes no pasan solos a *en curso* / *finalizado*.

1. cloud.trigger.dev → nuevo proyecto. Copiá el **Project ID** (`proj_…`) y una **API key**
   (`tr_dev_…` para dev, la de producción para el deploy).
2. En el entorno del proyecto de Trigger cargá lo que usan los jobs: `DATABASE_URL`,
   `RESEND_API_KEY` y los remitentes. Los jobs corren en la infra de Trigger, no en Vercel: no ven
   las variables de Vercel.
3. En Vercel: `TRIGGER_SECRET_KEY` y `TRIGGER_PROJECT_ID`.
4. Deployá las tasks: `npm run trigger:deploy` (va aparte del deploy de Vercel; repetilo cada vez
   que cambie algo de `src/trigger/`).

**Verificá.** Corré la task `run-reminder-scan` con `enviarEmails: false`.
⚠️ Ese dry-run **no es inocuo**: registra las ocurrencias (el candado anti-duplicados), así que una
corrida real posterior ya no manda esos mails. Usalo una vez, para ver que conecta.

---

## 5. Resend · outreach del CRM

**Para qué.** El módulo de Prospectos manda campañas en frío. Salen por un subdominio de marketing
separado (`mkt.jovenesenuk.com`) para no gastar la reputación del dominio con el que le escribís a
las familias.

1. Resend → *Domains* → **Add domain** → `mkt.jovenesenuk.com`.
2. Cargá en Cloudflare los registros que te da (SPF, DKIM y return-path). Esperá a que Resend los
   marque verificados.
3. `vercel env add EMAIL_FROM_OUTREACH production` → `hola@mkt.jovenesenuk.com`.
4. Resend → *Webhooks* → endpoint `https://<tu-dominio>/api/webhooks/resend`, eventos de entrega,
   apertura y bounce. Copiá el signing secret (`whsec_…`) → `vercel env add RESEND_WEBHOOK_SECRET production`.

**Verificá.** Mandá un outreach de prueba a una casilla tuya desde `/prospectos` y mirá que el
estado del envío cambie en la ficha (eso llega por el webhook).

---

## 6. Dominio, Vercel y deploy

1. Si esta carpeta todavía no está atada al proyecto de Vercel: `cd juk-portal && vercel link`.
   **Root Directory = `juk-portal`** (no la raíz del repo).
2. Dominio del sitio: `NEXT_PUBLIC_SITE_URL` (sin barra final) y `NEXT_PUBLIC_APP_URL`.
3. Si querés separar gestión de marketing: apuntá `portal.jovenesenuk.com` al mismo deployment y
   seteá `NEXT_PUBLIC_PORTAL_URL`. Sin esa variable todo se sirve del mismo dominio, que también
   está bien.
4. `BETTER_AUTH_URL` tiene que ser el dominio donde se usa el portal, o el login no fija la cookie.

**Nunca** cargues en producción `EMAIL_DRY_RUN` ni `NEXT_PUBLIC_ENABLE_TWEAK`: la primera apaga los
envíos reales y la segunda expone la herramienta de diseño. `npm run check:env:prod` las marca
como error si aparecen.

**Orden de un deploy con cambio de schema:** probar la migración en una branch de Neon → migrar
producción → deployar.

---

## 7. Branch protection (opcional)

El CI ya corre en cada push, pero **informa: no bloquea**. Para que un merge en rojo sea imposible
hace falta *branch protection*, y en un repo privado eso pide **GitHub Pro** (o hacer el repo
público). Con Pro: *Settings* → *Branches* → *Add rule* sobre `main` → *Require status checks* →
elegí `check`.

---

## Checklist

- [ ] Bucket R2 privado + las cuatro `R2_*` en Vercel
- [ ] `NEON_API_KEY`, `NEON_PROJECT_ID` y `NEON_PARENT_BRANCH` en GitHub
- [ ] `NEXT_PUBLIC_SENTRY_DSN` en Vercel
- [ ] Proyecto de Trigger.dev + `trigger:deploy` + sus variables
- [ ] DNS de `mkt.jovenesenuk.com` verificado en Resend + webhook
- [ ] Dominio definitivo en `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL`
- [ ] (Opcional) GitHub Pro para branch protection

Cuando marques uno, tachalo también en [`estado-actual.md`](estado-actual.md) §7: ese archivo es el
que dice el estado vigente.
