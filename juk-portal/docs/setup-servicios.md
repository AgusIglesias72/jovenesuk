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

Para chequear qué hay cargado en Vercel, bajalo y evaluá ese archivo:

```bash
vercel env pull .env.produccion --environment=production
npx tsx scripts/check-env.ts --prod --env .env.produccion
rm .env.produccion       # no lo dejes dando vueltas
```

⚠️ **Vercel devuelve los nombres, no los valores** (no deja leer una variable encriptada desde el
CLI: bajan como `NOMBRE=""`). El script lo detecta y pasa a **modo nombres**: chequea que la
variable *exista*, no qué dice. Sirve para ver qué falta cargar; **no** para descubrir que allá
quedó un valor de ejemplo. Eso se ve entrando a `/configuracion` en el deploy, o probando la
capacidad (subir un documento, mandarte un mail).

También podés listar los nombres directo: `vercel env ls production`.

La misma foto, desde adentro de la app: `/configuracion` → *Estado de servicios* (solo `super_admin`).

---

## Orden sugerido

| # | Qué | Destraba | Cuánto lleva |
|---|---|---|---|
| 1 | [Cloudflare R2](#1-cloudflare-r2--documentos) | Subir documentos en producción | ~15 min |
| 2 | [Secrets de Neon en GitHub](#2-secrets-de-neon-en-github--ci) | El job `e2e` del CI | ~10 min |
| 3 | [Sentry](#3-sentry--errores-de-producción) | Ver errores reales y endurecer la CSP | ~10 min |
| 4 | [Trigger.dev](#4-triggerdev--jobs-automáticos) | Recordatorios y transiciones por fecha | ~20 min |
| 5a | [Resend · mails transaccionales](#5a-resend--los-mails-transaccionales) | Que lleguen el acuse, la invitación y los avisos | ~20 min + DNS |
| 5b | [Resend · outreach](#5b-resend--outreach-del-crm) | Campañas en frío del CRM y su tracking | ~30 min + DNS |
| 6 | [Dominio y Vercel](#6-dominio-vercel-y-deploy) | El portal en su dominio definitivo | variable |
| 7 | [Branch protection](#7-branch-protection-opcional) | Que el CI bloquee merges en rojo | 5 min (pago) |
| 8 | [Google OAuth](#8-google-oauth--botón-continuar-con-google-opcional) | El botón "Continuar con Google" en el login | ~20 min |

> **5a va antes que 5b.** El Application Form (invitación + acuse a la familia) depende del dominio
> transaccional, **no** del subdominio de marketing. Si solo tenés tiempo para una, es 5a.

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

> **Hecho el 15/09/2026**, y así quedó (para rehacerlo si hiciera falta):
>
> - Login: `npx neonctl@latest auth`. Espera la autorización **60 segundos**: lanzalo recién cuando
>   estés frente al navegador.
> - La key se creó acotada al proyecto y se mandó directo al secret, sin mostrarla:
>   `neonctl api-keys create --name github-actions-ci-jovenesuk --project-id <id> --output json` →
>   campo `key` → `gh secret set NEON_API_KEY`. `NEON_PROJECT_ID` va como **variable** (no es secreta).
> - ⚠️ **`ci-base` no puede ser una branch "solo estructura" pelada.** El CI corre `db:migrate` sobre
>   la branch hija: con la tabla `drizzle.__drizzle_migrations` vacía, drizzle intenta recrear todas
>   las tablas y falla. Se creó con `neonctl branches create --name ci-base --parent dev
>   --schema-only` y después se le copiaron **solo** las filas de `drizzle.__drizzle_migrations`
>   desde `dev` (un SELECT sobre `dev`, INSERTs sobre `ci-base`). Resultado: 25 tablas, 0 filas de
>   negocio. No hace falta refrescarla: cada corrida aplica las migraciones que falten.

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

> **Hecho el 15/09/2026**: organización `aiglesias`, proyecto `javascript-nextjs`. Las credenciales se
> obtuvieron con el flujo de login del instalador oficial (`@sentry/wizard`) sin correr el
> instalador, que reescribe archivos del proyecto: `GET https://sentry.io/api/0/wizard/` da un hash,
> se abre `https://sentry.io/account/settings/wizard/<hash>/`, el dueño inicia sesión y elige el
> proyecto, y un polling a `/api/0/wizard/<hash>/` devuelve el token y el DSN.
>
> - El token es de **CI** (`org:ci`): sube releases y source maps, pero la API le responde 403 para
>   leer el proyecto. Es lo esperado, no un error.
> - ⚠️ Cargá `SENTRY_AUTH_TOKEN` con `vercel env add … --value`. Por pipe (`… | vercel env add`) desde
>   PowerShell quedó vacío, y el build lo mostró como *Authentication credentials were not provided
>   (401)*.
> - Chequeo real: en el log del build (`vercel inspect <url> --logs`) tiene que aparecer *Uploaded
>   files to Sentry*.

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

## 5a. Resend · los mails transaccionales

**Para qué.** Todo lo que el portal le manda a una familia o al equipo: la **invitación** al
Application Form, el **acuse** de que la ficha llegó, el aviso al equipo, las credenciales, los
recordatorios y el reset de contraseña. Es el circuito que hay que tener sano antes que ningún otro.

### Qué funciona hoy y qué no

| | Estado |
|---|---|
| `RESEND_API_KEY` en Vercel | ✅ cargada |
| `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` en Vercel | ✅ cargadas (alimentan **solo** el remitente de los `automatico`) |
| `EMAIL_FROM_COMUNICACIONES` en Vercel | ✗ no está → los `comunicacion` caen al literal `info@jovenesenuk.com` |
| El dominio del remitente verificado en Resend | ❓ **el repo no lo puede saber**, y es de lo que depende todo |
| `RESEND_WEBHOOK_SECRET` | ✗ no está → ver [5b](#5b-resend--outreach-del-crm) |

La **invitación** al Application Form y el **acuse** a la familia son los dos de tipo
`comunicacion`. O sea: los dos salen desde `remitenteComunicaciones`, que hoy es
`info@jovenesenuk.com`.

### ⚠️ El riesgo grande: el remitente NO sale del entorno

El remitente se resuelve en **cada envío** leyendo la configuración guardada, no una variable:
`sendEmail` llama a `getMailSettings()` (`src/lib/email/index.ts`) y esa función devuelve lo que
haya en la tabla `configuracion`, clave `mails`. Las variables de Vercel son apenas el **default
para cuando esa fila todavía no existe**.

De ahí salen dos cosas que hay que tener presentes:

1. **Si el dominio del remitente no está verificado en Resend, cada envío falla y no se nota.**
   Resend rechaza el request, la ficha del Application Form **se guarda igual** (cada mail va en su
   propio `try/catch`, `src/app/inscripcion/actions.ts`) y el error **solo llega a Sentry**. Desde
   la pantalla, la familia y el equipo ven una operación exitosa. Ninguna tarjeta de
   `/configuracion` lo detecta tampoco: *Estado de servicios* mira si la variable **existe**, nunca
   le pregunta nada a Resend.
2. **Guardar `/configuracion` → *Remitentes* escribe una fila que le gana al entorno para
   siempre.** Lo guardado pisa a la variable (`{ ...defaultsConEnv(), ...guardado }`,
   `src/lib/db/queries/configuracion.ts`). Si entrás a probar y ponés `onboarding@resend.dev`, ese
   remitente **queda**: cargar después `EMAIL_FROM_COMUNICACIONES` en Vercel no va a tener ningún
   efecto. Se vuelve atrás desde la misma pantalla, no desde Vercel.
   - Peor todavía: ese formulario tiene cuatro campos (nombre, automáticos, comunicaciones,
     reply-to) y **no muestra el de marketing**, pero al guardar también lo congela con el valor que
     tenía al abrir la pantalla. Traducción: si guardás hoy, `EMAIL_FROM_OUTREACH` (paso 5b) deja de
     servir y hay que volver acá.

### El camino largo (el bueno): verificar el dominio

1. Resend → *Domains* → **Add domain** → `jovenesenuk.com` (el dominio de `info@`, no el `mkt.*`).
2. Cargá en Cloudflare los registros que te da (SPF, DKIM y return-path) y esperá el badge
   **Verified**.
3. Opcional pero recomendado, para no depender del default del código:
   `vercel env add EMAIL_FROM_COMUNICACIONES production` → `info@jovenesenuk.com`.

### El camino corto, para probar HOY sin tocar DNS

Mientras no haya dominio verificado, Resend deja mandar **solo desde `onboarding@resend.dev`** y
**solo hacia la casilla con la que creaste la cuenta de Resend**. No sirve poner un Gmail como
remitente: no es un dominio tuyo, no lo podés verificar y Resend lo rechaza.

1. `/configuracion` → *Remitentes*: poné `onboarding@resend.dev` en **automáticos** y en
   **comunicaciones**. Guardá. (Leé antes el punto 2 del riesgo: esto escribe la fila.)
2. `/configuracion` → **Enviar mail de prueba**: elegí *Invitación al Application Form* o *Acuse del
   Application Form (familia)*, poné la casilla de tu cuenta de Resend y enviá. El asunto llega con
   `[PRUEBA]`. Solo lo ve `super_admin`.
3. Cuando el dominio quede verificado, **volvé a esa pantalla** y reponé `noreply@jovenesenuk.com` e
   `info@jovenesenuk.com`. No alcanza con borrar nada en Vercel.

**Verificá.** Si la prueba falla, el mensaje de la pantalla ya nombra las dos causas probables (API
key o dominio sin verificar). Para ver qué remitente quedó resuelto de verdad:
`/configuracion` → *Estado de servicios*, última línea (`Remitentes · auto: … · com: …`).

> ⚠️ Nada de esto se prueba de punta a punta mientras el deploy pida el SSO de Vercel: un invitado
> no puede abrir `/inscripcion`. Ver [`estado-actual.md`](estado-actual.md) §10.

---

## 5b. Resend · outreach del CRM

**Para qué.** El módulo de Prospectos manda campañas **en frío**. Salen por un subdominio de
marketing separado (`mkt.jovenesenuk.com`) para no gastar la reputación del dominio con el que le
escribís a las familias. **El Application Form no depende de esto**: la invitación se manda a
propósito como `comunicacion` y no como `marketing`, justamente porque este subdominio todavía no
tiene DNS.

1. Resend → *Domains* → **Add domain** → `mkt.jovenesenuk.com`.
2. Cargá en Cloudflare los registros que te da (SPF, DKIM y return-path). Esperá a que Resend los
   marque verificados.
3. `vercel env add EMAIL_FROM_OUTREACH production` → `hola@mkt.jovenesenuk.com`. (Si ya guardaste
   `/configuracion` → *Remitentes*, esta variable no va a tener efecto: ver el riesgo de 5a.)
4. Resend → *Webhooks* → endpoint `https://<tu-dominio>/api/webhooks/resend`, eventos
   `email.delivered`, `email.opened`, `email.clicked`, `email.bounced` y `email.complained`. Copiá
   el signing secret (`whsec_…`) → `vercel env add RESEND_WEBHOOK_SECRET production`.

**Qué desbloquea el webhook, exactamente.** Es lo único que mueve tres escalones del embudo de
`/prospectos/invitaciones`: *Entregadas*, *Abrieron el mail* y *Clic en el link*, que sin secreto se
muestran como un solo renglón **"No disponible"** (a propósito: no mienten un cero). También es lo
único que marca `rebotado` y `spam`, que alimentan el badge rojo *"N fallaron"*. Los otros escalones
—*Enviadas*, *Abrieron el formulario*, *Fichas recibidas*, *Fichas procesadas*— los escribe la
propia app y funcionan sin webhook.

> ⚠️ **No lo cargues antes de destapar el acceso público al deploy**: si el endpoint pide SSO,
> Resend postea, nunca llega, y los tres escalones pasan de "No disponible" a **cero para siempre**,
> que es justo lo que el diseño quiso evitar.
>
> ⚠️ **Ni con el valor de ejemplo `whsec_xxxx`** de `.env.example`: la pantalla lo detecta como
> placeholder y lo sigue tratando como ausente.

**Verificá.** *Send test event* desde el endpoint de Resend tiene que responder 200. Después mandá
un outreach de prueba a una casilla tuya desde `/prospectos` y mirá que el estado del envío cambie
en la ficha (eso llega por el webhook).

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

## 8. Google OAuth — botón "Continuar con Google" (opcional)

Habilita el botón del login. **Google no da de alta nunca**: solo abre sesión en una cuenta que el
equipo ya creó (`disableSignUp: true`, MIN-28 en [`OPEN_DECISIONS.md`](../OPEN_DECISIONS.md)). Sin
`GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` el provider ni se declara: el botón no aparece y el
login por email queda igual de completo. Es el estado normal hoy.

**Antes de arrancar, mirá el valor exacto de `BETTER_AUTH_URL` en Vercel (Production):** de ahí sale
la URI de redirección, y Google la compara carácter por carácter. Abajo asumimos
`https://jovenesuk.vercel.app`; si es otra, usá esa.

1. **Proyecto.** [console.cloud.google.com](https://console.cloud.google.com) → selector de
   proyecto → *Proyecto nuevo* → nombre `JUK Portal`. Esperá a que el selector lo muestre.
2. **Pantalla de consentimiento.** ☰ → *APIs y servicios* → *Pantalla de consentimiento de OAuth*
   (en la consola nueva, *Google Auth Platform* → *Comenzar*). Nombre de la app
   `Jóvenes en UK — Portal`, correo de asistencia y contacto: el Gmail del dueño, público
   **Externo**. **No cargues** links de página principal, privacidad ni términos todavía: apenas
   los ponés, Google exige verificar el dominio, y `vercel.app` no es un dominio propio.
3. **Permisos.** *Acceso a datos* → *Agregar o quitar permisos*: solo
   `.../auth/userinfo.email`, `.../auth/userinfo.profile` y `openid`. Son los tres "no sensibles";
   cualquier otro dispara el proceso de verificación y el cartel de app no verificada.
4. **Cliente OAuth.** *Clientes* → *Crear cliente* → **Aplicación web**, nombre `JUK Portal (web)`.
   - *Orígenes de JavaScript autorizados*: `http://localhost:3000`, `http://localhost:3001` y
     `https://jovenesuk.vercel.app`.
   - *URIs de redireccionamiento autorizados*, exactos, sin barra final:
     `http://localhost:3000/api/auth/callback/google`,
     `http://localhost:3001/api/auth/callback/google` y
     `https://jovenesuk.vercel.app/api/auth/callback/google`.
   - Los alias de Vercel **no** se cargan: Better-Auth arma el redirect con `BETTER_AUTH_URL`, así
     que Google vuelve siempre ahí. Es el mismo comportamiento que ya tiene el login por email.
5. **Credenciales.** El ID termina en `.apps.googleusercontent.com` y el secreto empieza con
   `GOCSPX-`. Van a `juk-portal/.env.local` y a Vercel → *Settings* → *Environment Variables*
   (Production y Preview). El secreto no se pega en ningún chat, doc ni commit.
6. **Publicación.** Si Google deja pasar la app a *En producción* sin verificación (debería, con
   esos tres scopes), pasala. Si la rechaza porque `vercel.app` no es un dominio propio, dejala en
   *Prueba* y cargá en *Usuarios de prueba* los mails del equipo: en ese modo **solo esos mails**
   pueden usar el botón, las familias no.
7. **Redeploy** en Vercel para que tome las variables, y `npm run check:env` para confirmar que las
   dos quedaron con valor real (el `xxxxxxxx` de la plantilla se detecta como placeholder).

> **Configurado el 18/09/2026.** La *Deployment Protection* de Vercel está apagada, así que
> cualquiera llega al login. Lo que decide a quién le sirve el botón es el **estado de publicación**
> de la app en Google Cloud: en modo *Prueba*, solo a los mails cargados como usuarios de prueba.
> Ver [`estado-actual.md`](estado-actual.md) §7.

---

## Checklist

- [ ] Bucket R2 privado + las cuatro `R2_*` en Vercel
- [ ] `NEON_API_KEY`, `NEON_PROJECT_ID` y `NEON_PARENT_BRANCH` en GitHub
- [ ] `NEXT_PUBLIC_SENTRY_DSN` en Vercel
- [ ] Proyecto de Trigger.dev + `trigger:deploy` + sus variables
- [ ] `jovenesenuk.com` **verificado** en Resend (sin esto, la invitación y el acuse fallan en silencio)
- [ ] Remitentes reales en `/configuracion` → *Remitentes* (no `onboarding@resend.dev` de la prueba)
- [ ] DNS de `mkt.jovenesenuk.com` verificado en Resend + `EMAIL_FROM_OUTREACH`
- [ ] Webhook de Resend + `RESEND_WEBHOOK_SECRET` (después de destapar el acceso público)
- [ ] Dominio definitivo en `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL`
- [ ] (Opcional) GitHub Pro para branch protection
- [ ] (Opcional) OAuth Client de Google + `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` en Vercel

Cuando marques uno, tachalo también en [`estado-actual.md`](estado-actual.md) §7: ese archivo es el
que dice el estado vigente.
