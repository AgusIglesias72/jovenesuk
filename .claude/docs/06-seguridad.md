# 06 · Seguridad

> Qué protege el sistema, dónde vive cada control y qué respetar al sumar algo. El porqué está en
> los ADRs de [`docs/architecture.md`](../../juk-portal/docs/architecture.md): ADR-000 (línea base),
> ADR-011 (documentos privados), ADR-012 (rate limit de formularios), ADR-017 (accesos por link) y
> ADR-019 (Google vincula, nunca da de alta). Lo que falta endurecer está en la
> deuda de [`docs/estado-actual.md`](../../juk-portal/docs/estado-actual.md).

## Modelo de amenazas (corto)

**Qué cuidamos.** Datos de **menores**: pasaporte (número, vencimiento), DNI, fecha de nacimiento,
salud (alergias), consentimientos firmados, autorizaciones ante escribano y certificados
psicofísicos, más datos de contacto y facturación de los tutores.

| Quién | Qué intentaría | Control principal |
|---|---|---|
| Internet anónimo | Crearse una cuenta, fuerza bruta de login, spam en los formularios, alumnos falsos por webhook | Registro cerrado · rate limit de login · honeypot + rate limit propio · secretos de webhook en tiempo constante |
| Cualquiera con un Gmail | Entrar por el botón de Google y que el provider le cree la cuenta que falta (rol `familia` por defecto) | `disableSignUp: true`: Better-Auth corta en link-account, antes de escribir en `users` o `accounts` |
| Alguien con un id_token armado | Quedarse con la cuenta de una familia haciendo figurar su email sin verificar | Google **no** está en `accountLinking.trustedProviders`, así que el `email_verified` del id_token se sigue exigiendo |
| Una familia logueada | Ver o tocar el alumno o los documentos de **otra** familia cambiando un DNI o una key en la URL | Ownership derivado server-side y 404 indistinguible |
| Un ex-miembro o una cuenta dada de baja | Seguir entrando con una sesión viva | Sin cookie cache: la baja aplica en el request siguiente |
| Un link de phishing | Mandar al usuario a otro dominio después del login | `returnTo` saneado |
| Alguien con una URL de documento | Bajar un pasaporte | No existen URLs públicas: todo pasa por `/api/uploads` con sesión y dueño |
| Nosotros mismos | Filtrar PII en logs, en Sentry o en el repo | `sendDefaultPii: false`, secretos solo por env |

## Autenticación (Better-Auth, `src/lib/auth/index.ts`)

- **Email y contraseña**, de 8 a 128 caracteres. Sesión de 8 h (`expiresIn`). Si se usa y pasó 1 h
  o más desde la última renovación (`updateAge`), el vencimiento se corre otras 8 h: en la práctica
  vence tras unas 8 h sin actividad. Cookies con prefijo `juk.`, `Secure` en producción
  (`__Secure-juk.session_token`).
- **Email verificado obligatorio** (`requireEmailVerification: true`). No hay flujo de verificación
  por mail (no está configurado `sendVerificationEmail`): las altas marcan `emailVerified: true` al
  fijar el rol (`finalizarAltaUsuario` en `src/lib/db/queries/usuarios.ts`, el caso `crear` de
  `src/lib/db/queries/familias.ts` y los seeds). Una cuenta creada por otro camino sin ese paso no
  puede loguearse: Better-Auth responde 403 `EMAIL_NOT_VERIFIED` aunque la contraseña sea correcta.
- **Registro cerrado en dos capas**, sin depender del proxy:
  1. `disabledPaths: ["/sign-up/email"]`: el router HTTP de Better-Auth responde 404.
  2. Un hook `before` con `debeBloquearAlta` (`src/lib/auth/sign-up-policy.ts`, puro y testeado)
     corta con 404 **cualquier** path `/sign-up*` que llegue por HTTP. La distinción es el
     transporte: `auth.api.signUpEmail(...)` llamado desde el server no trae `request`, así que el
     alta server-side (seed, `/usuarios`, cuentas de familia) sigue funcionando.

  Además, `src/proxy.ts` responde 404 a `/api/auth/sign-up*` antes de llegar a Better-Auth.
- **Login con Google: vincula, nunca da de alta** (ADR-019; `src/lib/auth/google-oauth.ts` y el
  bloque `socialProviders` de `index.ts`). Qué impide qué:

  | Control | Qué frena |
  |---|---|
  | `disableSignUp: true` en el provider | Que un email de Google que no está en `users` se convierta en una cuenta. Better-Auth corta en link-account, **antes** de escribir en `users` o en `accounts`; el callback lo traduce a `/login?error=signup_disabled`. Sin esto, cualquiera con un Gmail entraría como `familia`, que es el rol por defecto |
  | Google **fuera** de `accountLinking.trustedProviders` | La toma de cuenta. Un provider "confiable" saltea el chequeo del `email_verified` del id_token; dejarlo puesto alcanzaría para vincularse a la cuenta de una familia con un email sin verificar. Del lado local el chequeo se apoya en que todas las cuentas JUK nacen con `emailVerified: true` desde el server |
  | Provider condicional (`googleOAuthConfig()`) | Que exista superficie de OAuth sin credenciales: sin las dos variables no se declara, `/api/auth/sign-in/social` responde 404 y el botón no se renderiza |
  | `updateUserInfoOnLink: false` · `encryptOAuthTokens: true` | Que el perfil de Google pise el nombre que administra el equipo, y que queden tokens en texto plano que no usamos para nada |
  | Ventana propia en `/sign-in/social` | Abuso del arranque del flujo: 10 cada 15 min en producción (30 en dev). No valida credenciales, pero escribe estado y pega contra Google |
  | El rol y el `isActive` siguen saliendo de la base | Que Google influya en los permisos. Una cuenta desactivada que entra por Google se rechaza en el mismo `databaseHooks.session.create.before` que el login por email (el `code: "cuenta_desactivada"` del `APIError` es lo que hace que el callback vuelva a `/login` en vez de escupir el JSON de la API) |

  **Las dos variables son opcionales.** Sin `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` el login por
  email queda **entero**: es el estado en local y en los E2E, y revertir la feature es borrarlas del
  entorno. Las dos van juntas: media configuración rompería el callback, así que `googleOAuthConfig()`
  devuelve `null` si falta cualquiera.
- **Rol por defecto `familia`**, el de menor privilegio (migración `0018`). Quien crea un admin fija
  el rol explícitamente después del alta.
- **Sin `cookieCache`.** Desactivar un usuario o cambiarle el rol aplica en el request siguiente, no
  5 minutos después. El costo (una lectura de sesión por request) lo absorbe `getSession`, memoizado
  por request con `cache()` en `src/lib/auth/helpers.ts`.
- **Cuenta desactivada:**
  - `databaseHooks.session.create.before` lanza `APIError("FORBIDDEN")` y la sesión no se crea.
    Corre **después** de verificar la contraseña, así no sirve para sondear qué emails existen. Se
    usa `FORBIDDEN` y no `return false` porque `false` daría un 401 genérico y el usuario no vería
    "Cuenta desactivada".
  - `requireSession` además borra la sesión de un usuario inactivo y redirige a `/login?inactivo=1`.
  - `/api/uploads` rechaza sesiones de usuarios inactivos.
  - El proxy **no** rebota `/login` mirando solo la cookie (con una cookie vencida o de una cuenta
    inactiva armaba el loop `/login → /dashboard → /login`). Quien redirige es la página de login,
    con la sesión real.
- **Rate limit** guardado en la base (tabla `rate_limits`; en memoria no sirve en serverless):
  20 requests por minuto en general, y `/sign-in/email` con **5 intentos cada 15 minutos en
  producción** (30 en dev, porque el equipo y los E2E comparten la IP local) y `/sign-in/social` con
  10 cada 15 minutos en producción. Cuenta intentos, no solo fallos: Better-Auth no expone un hook de
  login fallido.
- **Reset de contraseña:** el token dura **24 h** (lo que promete el mail). Al cambiarla se manda un
  aviso por mail.
- **No hay contraseñas temporales por mail.** El alta del equipo (`src/app/(admin)/usuarios/actions.ts`)
  y la de familias (`src/lib/db/queries/familias.ts`) crean la cuenta con una contraseña que nadie
  conoce y mandan un link de creación de contraseña (`requestPasswordReset` con `alta=equipo` o
  `alta=familia`, que elige el mail de bienvenida). Si una familia ya tiene alumnos de otro apellido,
  vincular uno más exige confirmación explícita del admin.
- **`returnTo` saneado** (`src/lib/auth/return-to.ts`): solo paths relativos que caen dentro de
  `PORTAL_PREFIXES`. Rechaza backslash (`/\evil.com`), caracteres de control y cualquier cambio de origen.
- **Orígenes confiables:** en dev, `localhost:3000` y `localhost:3001`; en producción, solo `BETTER_AUTH_URL`.

## Autorización

| Capa | Qué hace | Qué NO hace |
|---|---|---|
| `src/proxy.ts` | Sin cookie de sesión → `/login?returnTo=…`. Deja pasar el sitio público, `/login` y `/reset-password`, `/api/auth`, `/api/webhooks`, `/baja`, `/offline` y `/_next`. Con `NEXT_PUBLIC_PORTAL_URL`/`NEXT_PUBLIC_SITE_URL` configuradas, separa `portal.<dominio>` del sitio público con redirects. `/api/*` siempre pasa por el matcher, aunque termine en `.pdf` | No valida la sesión ni mira roles: es un filtro barato, **nunca** la autorización |
| Layouts | `(admin)/layout.tsx` → `requireAdminJuk()`. `familias/layout.tsx` → `requireFamilia()` | No protegen las server actions |
| Cada server action exportada | Llama a su guard **antes de cualquier lectura o escritura**. En el back-office va en la primera línea (de la action o del helper común, como `cambiarEstado` en `colegios/actions.ts`): `requireAdminJuk()`, o `requireRole("super_admin")` en `usuarios/actions.ts` y `configuracion/actions.tsx`. En `familias/_actions.ts` primero se valida el input con Zod (sin efectos) y después `requireFamilia()` o `pasoConOwnership`. Las actions públicas de `(public)/leads/actions.ts` no tienen guard: las protegen el honeypot y el rate limit. Una action se puede invocar por POST directo, sin pasar por la página | — |
| Route handlers | Cada uno decide: `/api/uploads` exige sesión y dueño, los webhooks exigen firma o secreto | — |

- Los guards viven en `src/lib/auth/helpers.ts`. Un rol que no corresponde se redirige al home de su
  rol real (`HOME_BY_ROLE`, en `src/lib/routes.ts`), para evitar loops entre admin y familia.
  **Ojo con `representante`:** el rol existe en el enum `user_role` y su home es `/dashboard`, que
  exige admin, así que una cuenta con ese rol quedaría en loop. Hoy no se puede crear desde
  `/usuarios` (`usuarioRoleEnum` solo admite `admin_juk` y `super_admin`), pero antes de habilitar
  la Vista del Representante hay que darle un home y un guard propios.
- **Ownership de familias, siempre derivado en el server:**
  - Páginas: `cargarAlumnoFamilia(dni)` (`src/app/familias/[dni]/_data.ts`) trae la sesión y el
    alumno y exige `alumno.familiaUserId === session.user.id`.
  - Actions: `pasoConOwnership(pasoId)` (`src/app/familias/_actions.ts`) recorre paso → asignación →
    alumno → familia. Nunca se confía en un id de alumno o de familia que venga del cliente.
- **Por qué el 404 es indistinguible.** Un DNI que no existe y un DNI de otra familia responden igual
  (`notFound()`). En `/api/uploads`, con sesión activa, todo lo que no se puede ver (key inválida,
  documento ajeno o inexistente, rol sin acceso) responde 404; sin sesión o con una cuenta inactiva
  responde 401, y sin cookie el proxy ya redirige a `/login`. Si respondiera 403, una familia podría
  enumerar qué DNIs o qué documentos existen.
- Cuidado con un `loading.tsx` por encima de un chequeo de pertenencia: convierte ese 404 en 200.
  Detalle en [07](07-performance.md#streaming-con-suspense-y-la-trampa-del-404).

## Documentos (pasaportes, consentimientos, certificados)

- **Nunca una URL pública.** El bucket de R2 es privado (sin dominio público ni `r2.dev`) y la URL
  que se guarda es siempre `/api/uploads/<key>`.
- **Subida** (`putDocumento`, en `src/lib/storage/index.ts`, por donde pasan todos los uploads):
  - `keyEsSegura`: alfabeto acotado, sin `.`, `..` ni segmentos vacíos, 512 caracteres como máximo.
  - `validarDocumento` con los **magic bytes** del archivo (`detectarMime` en
    `src/lib/domain/documentos/index.ts`): el MIME que declara el navegador se puede falsear. Si el
    contenido no coincide con el tipo declarado, se rechaza.
  - Allowlist: PDF, DOC, DOCX, JPG, PNG y WEBP, hasta 10 MB. `serverActions.bodySizeLimit` está en
    `11mb`, con margen para el multipart.
  - **Sin R2 en producción, la subida falla explícito** (`StorageNoConfiguradoError`, que también se
    dispara con `VERCEL` definido): perder un pasaporte en el disco efímero de Vercel sería peor. En
    dev cae a `.uploads/` (gitignored).
- **Lectura** (`src/app/api/uploads/[...key]/route.ts`):
  - Sesión activa → key segura → rol. Admin ve todo; familia solo los documentos cuyo alumno es suyo
    (`getDocumentoAccesoByKey` resuelve documento → paso o alumno → `familiaUserId`). Un documento
    que no cuelga de un alumno (colegio, viaje) solo lo ve un admin. Cualquier otro rol: 404.
  - Headers: `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`,
    `Content-Security-Policy: sandbox`, y `Content-Disposition` armado con
    `src/lib/storage/content-disposition.ts`, que escapa comillas, CR/LF y no-ASCII del nombre que
    subió el usuario.
  - Inline solo PDF e imágenes; DOC/DOCX y lo desconocido se descargan, para que nada se abra desde
    el origin del portal.
- La tabla `documentos` **no tiene FK** hacia la entidad dueña (es polimórfica). Borrar una entidad
  no borra sus documentos solo.

## Superficies públicas

| Superficie | Controles |
|---|---|
| **Formulario de consulta y newsletter** (`src/app/(public)/leads/actions.ts`) | Honeypot: si viene completo, se responde ok sin hacer nada. Zod sobre el payload. **Rate limit propio** (`src/lib/domain/anti-abuso.ts`): 5 envíos por IP cada 10 minutos y 3 por email por hora, con un upsert atómico (`incrementarYVerificar`, sin carrera entre requests simultáneos). El aviso al equipo se deduplica 24 h por email e interés. Al límite se le muestra el mismo mensaje que a un error transitorio (no le confirmamos a un bot que lo frenamos). **Falla abierto a propósito:** si la tabla de rate limit falla, el lead entra igual (el honeypot y Zod siguen en pie). La IP sale del primer valor de `x-forwarded-for` (o de `x-real-ip` si falta); sin ningún header, todo el tráfico comparte la clave `desconocida`. Las ventanas se guardan en la tabla `form_rate_limits` (migración `0018`), separada de la `rate_limits` de Better-Auth. Sin captcha, por decisión del 08/09/2026 |
| **Webhook del Google Form** (`/api/webhooks/google-form`) | Header `x-webhook-secret` comparado en **tiempo constante** (`coincideSecreto`, `src/lib/domain/webhooks/secreto.ts`). Un secreto de menos de 32 caracteres se considera mal configurado y se rechaza todo con 401 (se loguea una vez por instancia). JSON roto → 400; payload que no pasa Zod → 422. Idempotente por DNI: un DNI existente responde 200 con `duplicado: true`. Si dos envíos simultáneos chocan contra el unique, el segundo responde `duplicado`, o 409 si no puede releer al ganador; nunca un 500 por la carrera. El DNI no se normaliza (un DNI con puntos rompe el slug: decisión abierta en `OPEN_DECISIONS.md`). El mínimo de 32 caracteres del secreto no figura en `.env.example`: tenelo en cuenta al generarlo |
| **Webhook de Resend** (`/api/webhooks/resend`) | Firma **Svix** verificada a mano (`src/lib/domain/webhooks/svix.ts`): HMAC-SHA256 sobre el body **crudo**, comparado con `timingSafeEqual`, tolerancia de **±5 minutos** en el timestamp (sin eso, un evento capturado se podía reenviar para siempre). Rechaza un secret vacío o que no sea base64 (con clave vacía cualquiera calcula una firma "válida"). Acepta varias firmas durante una rotación. Sin headers `svix-*` → 400; firma inválida → 401. Un evento con firma válida pero no mapeado responde 200 (para que Resend no reintente). Su único efecto es actualizar el estado de `prospecto_comunicaciones` (entregado, abierto, click, rebotado, spam). Sin `RESEND_WEBHOOK_SECRET`, ignora los eventos |
| **`/baja`** | Da de baja por el token del mail (`darDeBajaPorToken`), validado en el server |
| **Registro** | Cerrado (ver Autenticación) |

## Headers (`next.config.ts`)

En todas las rutas: `Strict-Transport-Security` (2 años, `includeSubDomains`, `preload`),
`X-Frame-Options: SAMEORIGIN` + `frame-ancestors 'self'`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()` y `poweredByHeader: false`.

**La CSP está en `Content-Security-Policy-Report-Only`**: no bloquea nada, reporta las violaciones a
Sentry (el `report-uri` se deriva de `NEXT_PUBLIC_SENTRY_DSN`). Está así porque todavía hace falta
`'unsafe-inline'`: JSON-LD del sitio (`seo.tsx`, `_sections/faq.tsx`), el init de GA4
(`analytics.tsx`), `style={{}}` en SSR, el `srcDoc` del preview de mails y el script inline de
`public/globe-loader.html`. Para pasarla a enforce:

1. Dejarla en Report-Only 1 o 2 semanas y confirmar que Sentry no reporta violaciones legítimas.
2. Reemplazar `'unsafe-inline'` de `script-src` por nonces (el back-office ya renderiza dinámico) o
   por hashes en lo estático.
3. Renombrar el header a `Content-Security-Policy`.

## Secretos

- Solo por variables de entorno: `.env.local` (gitignored) en dev, Vercel en producción, generados
  por corrida en CI (`openssl rand`, enmascarados). `.env.example` tiene nombres y placeholders,
  nunca valores.
- **Ninguna contraseña en el código ni en los docs**, tampoco las de prueba: el seed demo y los E2E
  exigen `SEED_TEST_PASSWORD` y fallan sin ella.
- El DSN de Sentry va por env: un clon o fork no reporta al proyecto real. Sentry corre con
  `sendDefaultPii: false`.
- Largos mínimos: `BETTER_AUTH_SECRET` con `openssl rand -base64 32`; `GOOGLE_FORM_WEBHOOK_SECRET` de
  32 caracteres o más.
- **Si se filtra un secreto:** rotalo en el proveedor, actualizalo en Vercel (y en el Google Form o
  en Resend si es de un webhook) y redeployá. Una sesión robada se invalida desactivando al usuario:
  aplica en el request siguiente.
- Las cuentas `test.*` y las familias demo **se borran antes de salir a producción con datos reales**.
- Entorno de trabajo: el harness de Claude corre con `acceptEdits` y Bash/PowerShell permitidos
  (`.claude/settings.json`). Nunca le pases secretos en el chat.

## Dependencias

El CI bloquea vulnerabilidades altas y críticas de las dependencias de producción
(`npm audit --omit=dev --audit-level=high`). El audit completo sí reporta una **crítica**: viene del
Next.js que empaqueta `react-email` (devDependency, solo `npm run email:dev`; los mails de
producción usan `@react-email/components` y `@react-email/render`). No llega a producción, y
arreglarla exige subir `react-email` a la 6, un cambio mayor que toca las plantillas: es deuda en
[`docs/estado-actual.md`](../../juk-portal/docs/estado-actual.md). Las transitivas parcheadas con
`overrides`, y por qué cada una: [04 · Dependencias](04-operacion-y-handoff.md#dependencias).
Nunca `npm audit fix` ni `npm update`: crashean en este repo (bug de arborist); se actualiza con
`npm install <paquete>@<versión>`.

## Checklist para una feature nueva

- [ ] Cada server action exportada llama a su `require*` antes de tocar la base (en el back-office,
      en la primera línea) y valida el input con Zod.
- [ ] Si la usa una familia: el ownership se deriva en el server desde el recurso, y lo ajeno
      responde igual que lo inexistente.
- [ ] El test de la action prueba el **negativo**: otro rol, otra familia, sin sesión, y que no hubo efecto.
- [ ] Ningún dato de facturación ni de salud llega a una pantalla de un rol que no debe verlo.
      Al cliente van DTOs con solo lo que se muestra.
- [ ] Un archivo subido pasa por `putDocumento` y se sirve por `/api/uploads`. Nada de URLs de bucket.
- [ ] Una superficie pública nueva tiene honeypot o secreto, rate limit y un mensaje de error que no
      revela nada.
- [ ] Un webhook nuevo verifica firma o secreto en tiempo constante sobre el body crudo, con ventana
      de tiempo si el proveedor la da, y es idempotente.
- [ ] Una ruta nueva está en `src/lib/routes.ts` (pública o de portal) y un `loading.tsx` nuevo no
      queda por encima de un `notFound()` de pertenencia.
- [ ] Una mutación sensible deja auditoría (`safeAudit`).
- [ ] Una variable nueva: en `.env.example` (sin valor), en Vercel y en la tabla de [04](04-operacion-y-handoff.md#servicios-externos-y-variables).
- [ ] Los errores inesperados van a Sentry sin PII en el mensaje.
