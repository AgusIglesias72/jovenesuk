# Arquitectura — decisiones técnicas (ADRs)

El **porqué** de cómo está construido el JUK Portal. Cada decisión grande lleva fecha, contexto,
qué se descartó y cuándo conviene revisarla.

- Cómo se escribe el código (capas, nombres, contrato de actions, UI): `juk-portal/CLAUDE.md`.
- Qué está construido y qué servicios están conectados: [`docs/estado-actual.md`](estado-actual.md).
- Cómo se opera, se testea, se asegura y se mide: `.claude/docs/04-operacion-y-handoff.md`,
  `05-testing.md`, `06-seguridad.md` y `07-performance.md`.

**Regla:** un ADR no se borra. Si la decisión cambia, se agrega uno nuevo y el viejo se marca
"Reemplazado por ADR-XXX". Si el código deja de coincidir con un ADR, se corrige uno de los dos en
el mismo cambio.

## Contexto que condiciona todo

- **Un solo desarrollador** con asistencia de Claude Code.
- **Escala operativa baja:** 4 admins de uso diario, 40 a 80 alumnos por año, familias de consulta
  ocasional.
- **Datos personales de menores:** pasaportes, DNI, salud, datos fiscales de las familias.
- **Crecimiento por etapas:** back-office → Portal de Familias → Vista del Representante → app en
  las stores.

## Stack

Versiones instaladas según `package-lock.json` al 11/09/2026 (el rango de `package.json` va
entre paréntesis cuando no coincide).

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.3 | [ADR-009](#adr-009--nextjs-16-mayo-2026-revisado-sept-2026) |
| UI | React | 19.2 | Server Components por defecto |
| Lenguaje | TypeScript estricto | 5.9 (`^5.7`) | `strict` + `noUncheckedIndexedAccess` |
| Estilos | Tailwind CSS | 3.4 | Tokens STUDIO en `src/styles/tokens.css`. No v4: ver `docs/design-system.md` §11 |
| Validación | Zod | 3.25 (`^3.23`) | Schemas en el dominio, compartidos por formularios y actions |
| ORM | Drizzle ORM + drizzle-kit | 0.45 / 0.31 | [ADR-003](#adr-003--drizzle-orm-sobre-prisma-mayo-2026) |
| Base de datos | Postgres en Neon, driver `neon-http` | `@neondatabase/serverless` 0.10 | [ADR-002](#adr-002--región-são-paulo-mayo-2026), [ADR-013](#adr-013--paginación-y-agregados-en-sql-con-neon-http-sept-2026) |
| Auth | Better-Auth | 1.7 | [ADR-004](#adr-004--better-auth-sobre-clerk-mayo-2026) |
| Jobs | Trigger.dev | SDK 4.5 (CLI fijada en 4.5.16) | [ADR-006](#adr-006--triggerdev-v4-para-jobs-mayo-2026-revisado-sept-2026) |
| Mail | Resend + React Email | `resend` 4 · `@react-email/components` 0.0.30 · `@react-email/render` 1 | `react-email` 3 (devDependency) es solo el preview local (`npm run email:dev`) |
| Archivos | Cloudflare R2 (API S3) | `@aws-sdk/client-s3` 3 | [ADR-007](#adr-007--cloudflare-r2-para-archivos-mayo-2026-revisado-sept-2026), [ADR-011](#adr-011--documentos-privados-vía-apiuploads-sept-2026) |
| Errores | Sentry | `@sentry/nextjs` 10.73 | [ADR-000](#adr-000--línea-base-de-seguridad-privacidad-y-observabilidad-mayo-2026-revisado-sept-2026) |
| Tests | Vitest + Playwright (+ axe) | 4.1 / 1.63 | [ADR-016](#adr-016--testing-por-capas-y-ci-sept-2026) |
| Hosting | Vercel | región `gru1` (`vercel.json`) | |
| Runtime | Node.js | ≥ 22 (`engines`, `.nvmrc`) | |

No hay kit de componentes (ni Radix, ni shadcn, ni librería de íconos): la UI es propia sobre
tokens. **Se pide permiso antes de sumar una dependencia.**

Actualizar dependencias: `npm update` y `npm audit fix` fallan en este repo por un bug de npm (no
del proyecto); se actualiza con `npm install <paquete>@<versión>` explícito. Los `overrides` de
`package.json` fijan versiones parcheadas de dependencias transitivas. Procedimiento y el porqué de
cada override: `.claude/docs/04-operacion-y-handoff.md`.

---

## ADR-000 · Línea base de seguridad, privacidad y observabilidad (mayo 2026, revisado sept 2026)

**Contexto:** el sistema guarda datos personales de menores y de sus tutores (pasaporte, DNI,
fecha de nacimiento, salud, CUIL/CUIT, teléfonos y emails).

**Decisión — lo que se exige siempre:**

- **Transporte y cabeceras** (`next.config.ts`): HSTS de 2 años con preload, `X-Frame-Options`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy` y CSP en modo **Report-Only** con reporte a
  Sentry (pasa a enforce cuando no queden `unsafe-inline`; procedimiento en `06-seguridad.md`).
- **Autorización en el server:** el proxy (`src/proxy.ts`) solo mira si hay cookie de sesión (no
  la valida), además de cortar el sign-up y separar `portal.*` del sitio público; cada superficie exige su
  rol en el layout (`requireAdminJuk`, `requireFamilia`) y cada action vuelve a exigirlo y deriva
  el dueño de la entidad desde la base, nunca del cliente.
- **Auth** (`src/lib/auth/index.ts`): registro público cerrado en tres capas (proxy, `disabledPaths`
  y hook); `requireEmailVerification: true`, así que todo camino que crea cuentas server-side
  (seed, `/usuarios`, cuentas de familia) las marca `emailVerified` al crearlas y el acceso llega
  por link ([ADR-017](#adr-017--accesos-por-link-no-contraseñas-temporales-sept-2026)): una cuenta
  creada por otro camino sin ese flag no puede iniciar sesión; rol por defecto `familia`, el de
  menor privilegio; sesión de 8 h sin cookie cache (una
  desactivación aplica en el request siguiente); cuenta inactiva rechazada al **crear la sesión**,
  que corre después de verificar la contraseña y por eso no sirve para sondear qué emails existen;
  rate limit guardado en base (en memoria no sirve en serverless); reset de 24 h; contraseñas de 8
  a 128 caracteres; cookies con prefijo `juk.`. El login con Google, cuando está configurado, no
  abre una cuarta puerta de alta ([ADR-019](#adr-019--google-vincula-nunca-da-de-alta-sept-2026)).
- **Webhooks:** el del Google Form exige un secreto de 32+ caracteres comparado en tiempo
  constante; el de Resend verifica la firma Svix con tolerancia de 5 minutos para cortar replays.
- **Documentos** nunca públicos ([ADR-011](#adr-011--documentos-privados-vía-apiuploads-sept-2026)).
- **Auditoría** de los cambios sobre datos sensibles en la tabla `auditoria`, best-effort
  ([ADR-014](#adr-014--contrato-único-de-server-actions-sept-2026)).
- **Credenciales fuera del código:** ninguna contraseña (tampoco las de las cuentas `test.*` del
  seed demo) va como literal en el repo ni en los docs; se leen de variables de entorno. Las
  cuentas `test.*` y el dataset demo se borran antes del go-live.
- **Observabilidad:** Sentry en server, edge y cliente, activo solo en producción y solo si hay
  DSN por variable; `sendDefaultPii: false`; 10 % de trazas. Logs a stdout (Vercel).

**Por qué así:** con un solo dev, cada regla tiene que estar en un único lugar que el código haga
cumplir solo, no en la memoria de quien programa. Detalle operativo (matriz de rutas del proxy,
secrets, rotación): `.claude/docs/06-seguridad.md`.

## ADR-001 · Una sola app Next.js, sin monorepo (mayo 2026, estructura actualizada sept 2026)

**Decisión:** un único proyecto Next.js; las superficies se separan por carpetas del App Router.

**Por qué no monorepo:** un solo desarrollador; los tres portales comparten el mismo modelo de
datos (separarlos forzaría un paquete compartido, que ya es un monorepo); pasar a Turborepo más
adelante no exige reestructurar el dominio.

**Estructura real:**

```
src/app/
├── (admin)/      back-office: dashboard, alumnos, viajes, colegios, group-leaders,
│                 pagos, consultas, prospectos, usuarios, configuracion
├── (auth)/       login, reset-password
├── (public)/     sitio público de marketing
├── familias/     Portal de Familias (sin route group: la URL empieza en /familias)
├── baja/         desuscripción del outreach por token
├── offline/      fallback de la PWA
└── api/
    ├── auth/[...all]      Better-Auth
    ├── uploads/[...key]   documentos privados (ADR-011)
    └── webhooks/          google-form, resend
```

Todavía no existen `(representante)` ni `api/v1`: nacen cuando exista la Vista del Representante o
un consumidor externo real. Los prefijos de rutas salen de `src/lib/routes.ts`.

## ADR-002 · Región São Paulo (mayo 2026)

**Decisión:** Vercel en `gru1` (fijado en `vercel.json`) y Neon en `aws-sa-east-1`. R2 es
multi-región por defecto.

**Por qué:** los usuarios son argentinos; São Paulo queda a ~30–50 ms contra ~130 ms de US East, y
simplifica el cumplimiento si aplican regulaciones locales.

**Caveat:** las consultas desde Europa (colegios, familias viajando) tienen más latencia. Para el
back-office no es un problema.

## ADR-003 · Drizzle ORM sobre Prisma (mayo 2026)

**Decisión:** Drizzle ORM.

**Por qué:** schema en TypeScript (sin DSL ni generación de cliente), tipos que salen del schema
(`$inferSelect`), buen soporte serverless con Neon y migraciones como SQL legible.

**Cómo se usa:** los schemas viven en `src/lib/db/schema/`, las migraciones en `drizzle/` (generadas
con `npm run db:generate` y commiteadas junto al cambio: `/juk-migracion`), y todo acceso a datos
pasa por `src/lib/db/queries/`. SQL escrito a mano, solo en migraciones.

**Trade-off aceptado:** comunidad más chica que Prisma.

## ADR-004 · Better-Auth sobre Clerk (mayo 2026)

**Decisión:** Better-Auth, con los datos en nuestra base.

**Por qué no Clerk:** los datos de menores tienen que vivir en infraestructura de JUK; los roles
propios (`super_admin`, `admin_juk`, `representante`, `familia`) son más simples de modelar; sin
costo por usuario y sin lock-in.

**Cuándo reconsiderar:** si hicieran falta miles de altas autoservicio. El login con Google ya no es
motivo: Better-Auth lo resuelve acotado a vinculación
([ADR-019](#adr-019--google-vincula-nunca-da-de-alta-sept-2026)).

## ADR-005 · Dominio puro (mayo 2026, revisado sept 2026)

**Decisión:** las reglas de negocio viven en `src/lib/domain/<modulo>/` y no importan `next`,
`react`, `server-only`/`client-only`, `@/app`, `@/lib/db`, `drizzle-orm` ni drivers de base
(`@neondatabase/*`, `pg`). Lo vigila el hook `.claude/hooks/domain-purity-check.mjs`.

**Por qué:** la misma regla sirve a la pantalla, a la server action, al webhook y a los jobs sin
duplicarse, y se prueba con tests unitarios rápidos, sin base ni navegador (es la capa con el piso
de cobertura más alto). La app nativa ([ADR-010](#adr-010--app-nativa-capacitor-sobre-la-web-jul-2026))
reusa la web entera, así que la pureza ya no se justifica por un cliente móvil sino por esto.

**Regla práctica:** si un archivo de `lib/domain/` necesita la base o el framework, está mal
ubicado: la lectura va a `queries/` y la orquestación a la action o al job.

## ADR-006 · Trigger.dev v4 para jobs (mayo 2026, revisado sept 2026)

**Decisión:** Trigger.dev para lo programado y lo que no debe correr dentro de un request.

**Tasks reales** (`src/trigger/`):

| Task | Qué hace |
|---|---|
| `daily-reminder-scan` | Todos los días 09:00 UTC: transiciones de viajes por fecha y recordatorios de A1 y D1 con dedup |
| `run-reminder-scan` | A mano, solo el scan de recordatorios (no corre las transiciones de viajes). Con `enviarEmails: false` no manda mails pero **sí registra** cada ocurrencia en `notificaciones_enviadas`, así que esos recordatorios ya no salen ese día: no usarlo como ensayo en producción (TEC-14) |
| `notificar-cancelacion-viaje` | Los N mails a las familias al cancelar un viaje |
| `notificar-consulta-nueva` | Aviso al equipo por una consulta de la web |

**Regla:** la lógica vive en `src/lib/jobs/` o en las queries (probada con tests de integración); el
task solo orquesta. Si Trigger no está disponible, la acción del usuario no falla, pero los dos
casos no son iguales: el aviso de consultas cae a un envío directo
(`src/app/(public)/leads/actions.ts`); la cancelación del viaje queda hecha y el aviso a las
familias **no sale** (queda solo el error en Sentry y hay que avisar a mano).

**Por qué no Vercel Cron:** el plan Hobby permite pocos crons y no reintenta. **Por qué no una cola
propia (BullMQ + Redis):** infraestructura que un solo dev no necesita mantener.

## ADR-007 · Cloudflare R2 para archivos (mayo 2026, revisado sept 2026)

**Decisión:** Cloudflare R2 por la API de S3.

**Por qué:** egreso gratis, 10 GB incluidos y el mismo SDK de S3.

**Revisión de septiembre:** el bucket es **privado** y no se publica con dominio propio: todo
archivo se sirve por el proxy autenticado ([ADR-011](#adr-011--documentos-privados-vía-apiuploads-sept-2026)).
Sin R2 configurado, desarrollo y CI escriben en `.uploads/`; producción falla con un error
explícito en lugar de escribir en un disco efímero. "Producción" es `NODE_ENV=production` **o**
cualquier deploy de Vercel (`esProduccion()` en `src/lib/storage/index.ts`): un preview de Vercel
sin R2 también rechaza las subidas.

## ADR-008 · Ambientes (mayo 2026, revisado sept 2026)

**Decisión:** desarrollo local, CI y producción, sin staging dedicado.

- **Local:** `npm run dev` en `localhost:3000`, contra una branch de Neon de desarrollo.
- **CI:** cada corrida del job E2E crea una branch efímera de Neon y la borra al terminar
  (`.github/workflows/ci.yml`).
- **Producción:** Vercel sobre `main`.

**Por qué no staging:** mantenerlo sincronizado es trabajo de QA que un solo dev no puede sostener.
Las previews por PR con branch de Neon son el objetivo, pero dependen de la integración
Vercel–Neon de la cuenta del dueño y no se pueden verificar desde el repo.

## ADR-009 · Next.js 16 (mayo 2026, revisado sept 2026)

**Decisión:** Next.js 16, no 15.

**Por qué:** Turbopack por defecto, React 19, `proxy.ts` en lugar de `middleware.ts`, server actions
maduras.

**Hoy:** Node ≥ 22 (`package.json` y `.nvmrc`). El React Compiler **no** está activado (queda
comentado en `next.config.ts` hasta medir la ganancia). El CI corre `next build` en cada cambio. Un
salto de versión mayor lleva ADR propio.

## ADR-010 · App nativa: Capacitor sobre la web (jul 2026)

**Contexto:** el back-office, el Portal de Familias y el sitio ya son responsive e instalables como
PWA (`src/app/manifest.ts`, service worker solo en producción). Para estar en Google Play y en el
App Store hace falta un binario firmado.

**Decisión:** envolver la web con **Capacitor**: un proyecto nativo mínimo cuya WebView carga el
deploy de producción (`server.url`).

**Por qué:**

- **No se reescribe la UI.** Tablas, formularios, `DateInput`, `Select` con búsqueda y paginación
  se reusan tal cual.
- **Una sola base de código:** cada deploy a Vercel actualiza la app sin volver a subir el binario
  (salvo cambios de la capa nativa: íconos, permisos, plugins, versión).
- **El equipo ya conoce Next y React**; no se suma otro stack.
- La PWA sigue existiendo; Capacitor la envuelve para las stores, donde la PWA sola no llega (y en
  iOS tiene límites de push e instalación).

**Alternativa descartada — Expo / React Native:** es un proyecto aparte que reescribe cada pantalla
con componentes nativos; compartiría solo `src/lib/domain/` y los tipos, no las pantallas ni el
sistema de diseño. A favor tenía una experiencia más nativa (push ricas, offline real, APIs del
dispositivo) y que EAS compila iOS en la nube sin Mac. Se descartó por el costo de mantener dos UIs
con un solo desarrollador.

**Consecuencias en la web:** `viewportFit: "cover"` y tokens de safe area para el notch y la barra
de gestos; objetivos táctiles de 44 px; piso de 16 px en los controles para que iOS no haga zoom
(ver `docs/design-system.md`).

**Riesgos:** rechazo de Apple por "app que es solo un sitio web" (guideline 4.2; se mitiga sumando
algo nativo con valor, como push o cámara para subir documentación); la WebView remota necesita
conexión; iOS exige una Mac con Xcode para compilar y firmar.

**Estado:** scaffold y runbooks en `docs/mobile-app/` (`capacitor.config.ts` como plantilla,
`runbook-android.md`, `runbook-ios.md`). Bloqueado por lo que depende del dueño (cuentas de
desarrollador, Mac, keystore, appId): `docs/mobile-app/BLOQUEADO-POR-VOS.md`.

**Cuándo revisar:** si el producto necesita offline real o notificaciones push que la WebView no
resuelve; ahí se evalúa Expo consumiendo una API `api/v1` sobre el mismo dominio.

## ADR-011 · Documentos privados vía /api/uploads (sept 2026)

**Contexto:** se guardan pasaportes, certificados psicofísicos y consentimientos de menores. La
primera versión tenía una rama de URL pública del bucket.

**Decisión:**

- Toda lectura pasa por `src/app/api/uploads/[...key]/route.ts`: exige sesión activa (sin cookie,
  el proxy redirige a `/login`; con una sesión inválida o de una cuenta desactivada, el handler
  responde **401**). Con sesión, los admins ven todo, una familia solo los documentos de sus
  alumnos y cualquier otro rol nada; lo que no se puede ver (key insegura, rol sin acceso, familia
  que no es dueña, archivo inexistente) responde **404** (no revela si la key existe).
- Respuesta con `Cache-Control: private, no-store`, `nosniff`, `Content-Security-Policy: sandbox` y
  nombre de archivo escapado; PDF e imágenes inline, el resto como descarga.
- Toda escritura pasa por `putDocumento` (`src/lib/storage/index.ts`), que valida el tipo real por
  **magic bytes** (no el MIME que declara el cliente), el tamaño máximo de 10 MB y que la key sea
  segura.
- El matcher del proxy incluye `/api/*` aunque la URL termine en `.pdf` o `.jpg`.

**Por qué no URLs firmadas:** una URL firmada se puede reenviar mientras dure; el proxy verifica
sesión y dueño en cada acceso. Se quitó `@aws-sdk/s3-request-presigner` por no tener uso.

**Trade-off:** cada descarga consume una invocación de función. Con el volumen de JUK no importa;
se revisa si aparecen descargas masivas (por ejemplo, el ZIP post-viaje de MIN-08).

**Pendiente:** política de retención y borrado de documentos (TEC-02 en `OPEN_DECISIONS.md`).

## ADR-012 · Rate limit propio para formularios públicos (sept 2026)

**Contexto:** la consulta y el newsletter son públicos: spam, abuso y gasto de cuota de Trigger y
Resend.

**Decisión:** honeypot + ventanas de rate limit por IP (5 cada 10 minutos) y por email (3 por hora)
en la tabla `form_rate_limits`, con un upsert atómico por intento; las reglas son puras en
`src/lib/domain/anti-abuso.ts`. El aviso al equipo se deduplica 24 h por email e interés. El login
usa el rate limit de Better-Auth (tabla `rate_limits`).

**Por qué sin captcha (decisión del 08/09/2026):** fricción para familias, un tercero más con
scripts y cookies (y la CSP que eso implica). **Por qué no Redis/Upstash:** otra infraestructura
para un volumen que Postgres absorbe. **Por qué no reusar `rate_limits`:** la administra
Better-Auth con formato y limpieza propios.

**Trade-off:** la IP sale de `x-forwarded-for`; sin ese header todo el tráfico comparte una clave.
Si aparece abuso distribuido, se suma un captcha.

## ADR-013 · Paginación y agregados en SQL con neon-http (sept 2026)

**Contexto:** con `neon-http` cada query es un round-trip HTTPS y no hay `db.transaction()`. La
primera versión traía tablas enteras y cortaba en memoria, y encadenaba queries en serie.

**Decisión:**

- Los listados paginan en la base (`paginarEnSql`, `src/lib/utils/paginate.ts`): la ventana y el
  total salen en paralelo. El orden total **no** lo pone el helper: cada query tiene que terminar
  su `ORDER BY` con una columna única (el id) o LIMIT/OFFSET repite o saltea filas entre páginas
  (pasó en `/pagos`). `paginar()` en memoria queda para listas acotadas que ya vienen completas.
- Los agregados se calculan en SQL (resumen de `/pagos`, completitud del dashboard).
- Las lecturas independientes van en `Promise.all`; lo que varias partes del request piden (la
  sesión, el alumno del portal de familias) se memoiza con `cache()`.
- Las escrituras que tienen que ir juntas se mandan con `db.batch([...])`, que el server de Neon
  ejecuta en una transacción (ej. `asignarConTablero`).

**Por qué no el driver con WebSocket o un pool:** funciones serverless de vida corta; `neon-http` no
mantiene conexiones abiertas. Detalle y recetas: `.claude/docs/07-performance.md`.

## ADR-014 · Contrato único de server actions (sept 2026)

**Contexto:** el tipo del resultado de las actions estaba copiado en 15 archivos y el helper de
auditoría en 14; varias actions, el webhook y los jobs usaban Drizzle directo.

**Decisión:**

- Un solo `ActionResult` (`src/lib/actions/result.ts`): `{ ok: true, data } | { ok: false, error,
  fieldErrors?, requiereConfirmacion? }`. `requiereConfirmacion` modela las advertencias "¿guardar
  igual?" (sobre-cupo, pasaporte).
- Un solo `safeAudit` (`src/lib/actions/safe-audit.ts`): si la auditoría falla, se reporta a Sentry
  y no rompe una operación que el usuario ya vio como exitosa. Vive fuera de
  `queries/auditoria.ts` para que los jobs de Trigger no arrastren `@sentry/nextjs`.
- Las actions que usan varias pantallas van en `src/lib/actions/`; el acceso a la base, solo en
  `src/lib/db/queries/`.

**Por qué:** una sola forma de mostrar errores en toda la UI (`useErroresDeFormulario`), actions
testeables con mocks compartidos (`src/lib/actions/__tests__/mocks.ts`) y cobertura con piso sobre
`lib/actions`. Las reglas detalladas están en `juk-portal/CLAUDE.md`.

## ADR-015 · Retiro del Design Lab y del playground /tests (sept 2026)

**Contexto:** `src/app/design` tenía ~15 mil líneas (32 % de `src`) con 6–7 direcciones visuales, y
el proxy lo servía **sin sesión**. `/tests` era un playground interno que aparecía en el menú.

**Decisión:** se borraron los dos. Sobreviven los tokens de la dirección elegida (STUDIO) en
`src/styles/tokens.css` y `src/styles/animations.css`. El tag `design-lab-final` conserva el último
commit con el lab. El estado de servicios y el preview de templates pasaron a `/configuracion`.

**Por qué:** la dirección ya estaba elegida; el lab era superficie pública innecesaria y peso en
build, lint y documentación. La herramienta de ajuste del sitio público (`DesignTweaker`) se
conserva porque solo se monta en desarrollo o con `NEXT_PUBLIC_ENABLE_TWEAK=1`.

## ADR-016 · Testing por capas y CI (sept 2026)

**Decisión:**

- **Unit** (Vitest, proyecto `unit`) sobre `src/lib/domain`, `src/lib/utils` y `src/lib/actions`, con
  **piso de cobertura** en `vitest.config.ts` para que no retroceda. La cobertura excluye por
  contrato `index.ts`, `labels.ts` y `errors.ts`; `configuracion/`, `documentos/` y
  `recordatorios/` tienen lógica real en su `index.ts` que no entra en el número (tienen tests,
  pero el piso no los mide).
- **Integración** contra Postgres real para queries y jobs (`*.integration.test.ts`). Solo corre
  con `INTEGRATION_DATABASE_URL`; sin esa variable el setup apunta a un host inválido, así un test
  mal gateado nunca escribe en la base de desarrollo.
- **E2E** con Playwright (desktop, teléfono, familias y público), con axe para accesibilidad.
- **Test compañero obligatorio:** `npm run check:tests` exige un `.test.ts` al lado de todo archivo
  nuevo o modificado de domain, utils y actions. Lo corren el hook pre-push (opt-in) y el CI.
- **CI** (`.github/workflows/ci.yml`, en la raíz del workspace), tres jobs: `check` (typecheck,
  lint, cobertura, test compañero, audit de producción, `next build`); `e2e-gate`, que decide si
  hay Neon configurado; y `e2e`, que crea una branch efímera de Neon, migra, siembra, corre
  integración y E2E, y borra la branch al terminar (con vencimiento automático como red de
  seguridad). Si faltan `NEON_API_KEY` (secret) o `NEON_PROJECT_ID` (secret o variable de repo),
  `e2e` se saltea sin fallar. `NEON_PARENT_BRANCH` (variable) es recomendada, para que el runner no
  reciba una copia de los datos reales; `SEED_TEST_PASSWORD` (secret) es opcional.

**Por qué el E2E del CI corre sobre `next dev` y no sobre el build:** en modo producción rigen el
rate limit real de login y la exigencia de R2. Aflojarlos con una variable de entorno sería un
bypass de seguridad activable en producción; es preferible testear sobre dev. El build de
producción igual se valida en el job de checks, y la variable de repo `E2E_SERVER=start` permite
correr la suite contra `next start` a mano.

**Trade-off:** sin GitHub Pro el CI informa pero no bloquea merges. Cómo correr cada capa y las
trampas conocidas: `.claude/docs/05-testing.md`.

## ADR-017 · Accesos por link, no contraseñas temporales (sept 2026)

**Contexto:** el PRD (US-03 para el equipo, US-19b para las familias) pide mandar una contraseña
temporal por mail.

**Decisión:** el alta de un usuario del equipo y el envío del acceso a una familia mandan un
**link de Better-Auth para crear la contraseña**, que caduca a las 24 h. El mismo mecanismo de reset
distingue un alta (mail de bienvenida) de un olvido (mail de reset) por el callback. Si el link
vence, se reenvía el acceso desde `/usuarios` o desde la ficha del alumno. Vincular un alumno a una
cuenta de familia que ya tiene otros alumnos exige confirmación explícita del admin.

**Por qué:** una contraseña en texto plano queda viva en una casilla de mail que nadie controla; un
link que caduca no.

---

## ADR-018 · Tabla de aterrizaje y compuerta del alta pública (sept 2026)

**Contexto:** el Application Form propio (`/inscripcion`) recolecta la misma ficha que entraba por
el webhook del Google Form y tiene que terminar creando al alumno. Pero el webhook puede hacerlo
porque va detrás de un secreto compartido de 32+ caracteres, y un formulario abierto en un navegador
no tiene ese secreto. El alta llama a `asegurarCuentaFamilia`, que **vincula el alumno a una cuenta
del Portal de Familias que ya existe** cuando el email del tutor coincide: copiar el flujo tal cual
habría dejado que cualquiera, desde internet, le cuelgue un alumno inventado a la cuenta real de
otra familia.

**Decisión:** dos piezas.

1. **Tabla de aterrizaje `inscripciones`.** La ficha se persiste siempre ahí antes de tocar
   `alumnos`. Una carga que no puede —o no debe— convertirse en alumno tiene dónde quedarse, con su
   estado y su motivo, en vez de perderse o forzar el alta.
2. **Compuerta.** El alta no se dispara porque la ficha exista, sino por una **capacidad** que el
   equipo entregó: un token de invitación válido, o una persona con sesión apretando el botón. Sin
   eso, la ficha espera en la bandeja. Y aun con la capacidad, manda la rama del vínculo: *crear* es
   automático; *vincular* se hace pero queda marcado para revisión y auditado; *conflicto* y
   *email del equipo* nunca son automáticos (el alumno se crea sin cuenta y resuelve un humano).
   La idempotencia por DNI corta antes de todo: mandar la ficha de un alumno ya cargado no puede
   cambiarle la cuenta de familia.

La política vive en UN solo lugar (`src/lib/actions/alta-inscripcion.ts`) y la comparten el
formulario público, la bandeja y el webhook legacy, que pasó a delegar: dos implementaciones del
alta se desincronizan y una de las dos termina siendo la insegura.

**Por qué:** lo encontró la revisión adversarial del diseño, no un incidente. El costo de la tabla
—una migración y una pantalla— es chico al lado de una filtración de datos de menores entre familias.
El precio aceptado es que una parte de las cargas requiere un clic humano; a cambio, ninguna carga
anónima puede tocar una cuenta existente.

---

## ADR-019 · Google vincula, nunca da de alta (sept 2026)

**Contexto:** el dueño pidió un botón "Continuar con Google" en el login. El PRD tenía el SSO
descartado en dos lugares (Interno §M1 y Representante §M1), así que la decisión se reabre y queda
como MIN-28 en `OPEN_DECISIONS.md`. El problema no es la comodidad, es el modelo de acceso del
portal: **el registro público está cerrado** en tres capas
([ADR-000](#adr-000--línea-base-de-seguridad-privacidad-y-observabilidad-mayo-2026-revisado-sept-2026)),
las cuentas las crea el equipo desde `/usuarios` o desde el alta de familias, y el rol por defecto
de la tabla `users` es `familia`. Un provider social con el comportamiento de fábrica **crea la
cuenta que falta**: cualquier persona del mundo con un Gmail apretaría el botón y entraría al portal
como `familia`, con el registro público cerrado y sin que nadie lo hubiera dado de alta.

**Decisión:** Google no es un camino de alta, es una **segunda llave de una cuenta que el equipo ya
creó**. Cuatro piezas, todas en `src/lib/auth/`:

1. **`disableSignUp: true`** en el provider. Es la línea que hace cumplir la regla: Better-Auth la
   aplica en link-account, **antes** de escribir nada en `users` o en `accounts`, y el callback lo
   traduce a `/login?error=signup_disabled`. Un email de Google que no está en la base rebota con un
   mensaje claro y no deja rastro.
2. **Provider condicional.** Sin `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` no se declara:
   `/api/auth/sign-in/social` responde 404 y el botón ni se renderiza. Es el estado normal en local
   y en los E2E, y revertir la feature entera es borrar dos variables de entorno.
3. **Vinculación apoyada en el email verificado de las dos puntas** (`account.accountLinking`): el
   `email_verified` del id_token de Google y el `emailVerified` de la fila local, que todas las
   cuentas JUK traen en `true` porque nacen server-side con acceso por link
   ([ADR-017](#adr-017--accesos-por-link-no-contraseñas-temporales-sept-2026)).
   `updateUserInfoOnLink: false` evita que el perfil de Google pise el nombre que administra el
   equipo, y los tokens se guardan cifrados porque no los usamos para nada y en texto plano serían
   pasivo puro.
4. **El resto de las defensas no se toca:** el rol sigue saliendo de la base (Google no lo informa
   ni lo cambia), la cuenta desactivada se rechaza en el mismo `databaseHooks.session.create.before`
   que el login por email, y `/sign-in/social` tiene su propia ventana de rate limit.

**Por qué NO `accountLinking.trustedProviders`:** es la forma "obvia" de que la vinculación fluya, y
es exactamente el vector de toma de cuenta. Marcar un provider como confiable **saltea el chequeo
del `email_verified` del id_token**: alcanzaría con un id_token donde el email de una familia
figure sin verificar para quedarse con su cuenta. El chequeo cuesta nada y es lo único que separa
"otro camino a mi cuenta" de "el camino a la cuenta de cualquiera".

**Por qué esto no es SSO** (y por eso no contradice al PRD en el fondo, aunque sí en la letra): no
se delega la identidad en Google, no hay dominio de Workspace habilitado (`hd`) —las familias usan
Gmail personal—, no se aprovisionan usuarios ni roles, y apagarlo no le saca el acceso a nadie: la
contraseña sigue existiendo.

**Trade-off:** dos credenciales más para rotar y una superficie de login más. Y mientras el proyecto
no tenga dominio propio, Google va a dejar la app en modo *Prueba*, donde solo entran los mails
cargados como usuarios de prueba: en la práctica arranca siendo una comodidad del equipo, no de las
familias.

**Cuándo revisar:** si alguna vez se quisiera alta autoservicio (hoy no está en el producto), esto
**no** es el mecanismo: haría falta volver a abrir ADR-000 y decidir qué rol recibe una cuenta que
nadie creó.

---

## Costos estimados

Estimación de mayo 2026, no verificada contra facturas.

| Servicio | Mes 1–6 | Mes 6–12 | Año 2 |
|---|---|---|---|
| Vercel | USD 0 (Hobby) | 0 | 20 (Pro si crece el tráfico) |
| Neon | 0 (Free) | 19 (Launch) | 19 |
| Cloudflare R2 | 0 | 0 | 0 |
| Trigger.dev | 0 | 0 | 0–10 |
| Resend | 0 | 0–20 | 20 |
| Sentry | 0 | 0 | 0–26 |
| **Total** | **0–10/mes** | **19–40/mes** | **~60–80/mes** |

## Pendientes técnicos

- **Dominio definitivo del portal.** El proxy ya soporta `portal.*` separado del sitio público por
  variables de entorno.
- **Backups además del PITR de Neon** (¿export periódico?).
- **CSP en enforce** con nonces en lugar de `unsafe-inline`.
- **2FA:** fuera de v1 por PRD (M1). El **SSO** de Google Workspace sigue descartado por producto; lo
  que sí existe es el botón de Google acotado a vinculación
  ([ADR-019](#adr-019--google-vincula-nunca-da-de-alta-sept-2026)), con las credenciales pendientes
  del dueño.
- **React Compiler:** activarlo cuando se mida la ganancia.
- La deuda con fecha y dueño (dependencias con vulnerabilidades, servicios sin conectar) está en
  [`docs/estado-actual.md`](estado-actual.md).
