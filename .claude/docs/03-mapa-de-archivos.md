# 03 · Mapa de archivos

Qué hace cada archivo del repo y, cuando no es obvio, por qué existe o qué no hay que hacer ahí.
Está generado desde el árbol real (`git ls-files`) y cada línea se escribió leyendo el archivo.

---

## Cómo leer este mapa

- **Rutas.** Cada sección tiene un encabezado con la carpeta. Salvo la sección de harness (la raíz
  del repo, `.claude/`, `.githooks/` y `.github/`, relativos a la raíz del repo), las carpetas son
  relativas a `juk-portal/`. La primera columna de cada tabla es la ruta **relativa a ese encabezado**.
- **Tests al lado.** Si un archivo tiene su test, van en la misma celda:
  `schema.ts` · `schema.test.ts`. Los `*.integration.test.ts` corren contra una base real
  (ver [05-testing](05-testing.md)).
- **Marcas.** `[client]` = el archivo arranca con `"use client"`. `[action]` = `"use server"`
  (server actions). Sin marca = server component o módulo común.
- **Qué NO está acá:** qué está construido o pendiente (`juk-portal/docs/estado-actual.md`), la
  historia (`juk-portal/CHANGELOG.md`), el porqué de las decisiones (`juk-portal/docs/architecture.md`),
  las reglas funcionales (`juk-portal/docs/prd/`) y cómo se arma un módulo nuevo
  ([02](02-arquitectura-y-convenciones.md)).

## Cómo mantenerlo

**Regla de sincronía:** el mismo cambio que agrega, mueve, renombra o borra un archivo actualiza su
fila acá. Si un archivo cambia de responsabilidad, se reescribe su línea. Un mapa desactualizado es
peor que ninguno: el anterior quedó congelado meses y describía otro proyecto.

El hook Stop `docs-sync-reminder.mjs` **no lo garantiza**: se calla con que toques cualquier doc vivo
(tocar solo el CHANGELOG lo apaga aunque este mapa haya quedado viejo). Por eso, antes de cerrar,
en el paso de sincronía de `/juk-cierre`, corré el chequeo rápido de abajo y que no devuelva
ninguna línea.

- No pongas números que envejecen (cantidad de tests, specs o archivos).
- Describí lo que el archivo hace hoy, no lo que va a hacer.
- Chequeo rápido desde la raíz del repo. Lista los archivos versionados (o nuevos sin ignorar) que
  existen en disco y cuyo nombre no aparece en el mapa. Trabaja **por nombre**: no ve un archivo
  nuevo que se llame igual que otro ya mapeado (`page.tsx`, `loading.tsx`, `actions.ts`,
  `README.md`, `index.ts`); esos los mirás en la tabla de su carpeta. Deja afuera los binarios
  (imágenes, fuentes), `drizzle/meta/` y todo lo que no esté en la lista de rutas (por ejemplo
  `assets/` de la raíz).

```bash
{ git ls-files --cached --others --exclude-standard juk-portal/src juk-portal/tests juk-portal/scripts juk-portal/drizzle juk-portal/public juk-portal/docs .claude .githooks .github
  git ls-files --cached --others --exclude-standard | grep -E '^[^/]+$|^juk-portal/[^/]+$'; } \
  | grep -vE '\.(png|jpe?g|webp|ico|svg|ttf|woff2?)$|drizzle/meta/' \
  | while read -r f; do [ -e "$f" ] || continue; grep -qF "$(basename "$f")\`" .claude/docs/03-mapa-de-archivos.md || echo "sin fila: $f"; done
```

⚠️ **Este chequeo tiene dos puntos ciegos, y los dos ya escondieron filas faltantes.** Busca el
basename como texto suelto, así que:

1. **Un nombre que es sufijo de otro ya mapeado pasa como documentado.**
   `inscripciones.integration.test.ts` daba positivo por `purgar-inscripciones.integration.test.ts`,
   e `inscripcion-recibida.tsx` por `send-inscripcion-recibida.tsx`. La variante estricta es la misma
   línea cambiando el `grep`, y vale la pena correrla de vez en cuando:
   `grep -qE "(\`|/)$(basename "$f" | sed 's/[.[\*^$]/\\\\&/g')\`"`.
2. **Dos archivos con el mismo basename comparten una sola fila** (varios `page.tsx`, `loading.tsx`,
   `actions.ts`). Ningún chequeo por nombre lo ve: hay que mirar que la fila hable de los dos, o
   escribir una fila por ruta. Es la limitación que declara el encabezado de este archivo.

Y una trampa de redacción que hacía fallar el chequeo sin que se notara: una fila que dice
``| `foo.ts` · su test |`` **no documenta el test**, porque el chequeo busca el nombre literal.
El test va con su nombre completo: ``| `foo.ts` · `foo.test.ts` |``.

---

## Vista rápida

```
jovenesuk/
├── CLAUDE.md             cómo se trabaja en el workspace + reglas de sincronía de docs
├── .claude/              harness de Claude Code (hooks, skills, agentes, docs de handoff). No es la app.
├── .githooks/pre-push    chequeos antes de pushear (opt-in)
├── .github/workflows/    CI
└── juk-portal/           la app (Next.js 16)
    ├── src/proxy.ts      protección de rutas (middleware de Next 16)
    ├── src/app/          rutas: (admin) back-office · (auth) login · (public) sitio · familias · api · baja · offline
    ├── src/components/   design system (ui) + shells (admin, auth, pwa)
    ├── src/lib/          domain (puro) · db (schema + queries) · actions · auth · email · storage · jobs · utils · hooks
    ├── src/styles/       tokens STUDIO (fuente única del look)
    ├── src/trigger/      tasks de Trigger.dev
    ├── tests/            e2e (Playwright) + integration (setup y fixtures)
    ├── scripts/          chequeos de repo
    ├── drizzle/          migraciones SQL
    ├── public/           assets estáticos + service worker
    └── docs/             producto, PRD y decisiones
```

Cómo se conectan las capas en una pantalla típica: la `page.tsx` (server) lee con
`lib/db/queries/*`; un componente `[client]` llama a una server action (`actions.ts`), que hace
`requireAdminJuk()`/`requireFamilia()`, valida con el schema Zod de `lib/domain/*`, escribe con
`lib/db/queries/*`, audita con `safeAudit` y revalida. `lib/domain/` no importa nada de Next, React
ni `app/` (lo vigila un hook). Detalle en [02](02-arquitectura-y-convenciones.md).

---

## Raíz de `juk-portal/`

### `juk-portal/`

| Archivo | Qué hace |
|---|---|
| `package.json` | Scripts (tabla con cuándo usar cada uno en [04](04-operacion-y-handoff.md)) y bloque `overrides` que fija versiones parcheadas de dependencias transitivas con CVEs (`ws`, `socket.io-parser`, `fast-uri`, y `brace-expansion` solo bajo `@sentry/bundler-plugin-core`). Por qué y cuándo sacarlos: [06](06-seguridad.md). Para actualizar deps usá `npm install <paquete>@<versión>`: `npm update` y `npm audit fix` crashean en este repo (bug de arborist). |
| `package-lock.json` | Lock de dependencias; se commitea junto con cualquier cambio de `package.json`. |
| `next.config.ts` | Headers de seguridad para todas las rutas (HSTS, `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, Permissions-Policy y CSP en modo **Report-Only**, que reporta a Sentry solo si hay `NEXT_PUBLIC_SENTRY_DSN`; fuera de producción suma `'unsafe-eval'`), redirects 301 de las URLs del Wix viejo, `serverActions.bodySizeLimit` 11 MB (los uploads llegan a 10 MB), `staleTimes` del router, `serverExternalPackages` para el driver de Neon, `distDir` desde `NEXT_DIST_DIR` (lo usa `ci:local` para compilar en `.next-e2e`). `withSentryConfig` se aplica solo si hay credenciales para subir source maps. |
| `drizzle.config.ts` | Drizzle Kit: schemas en `src/lib/db/schema/*`, migraciones en `drizzle/`, conexión `DATABASE_URL_UNPOOLED` (cae a `DATABASE_URL`), modo `strict`. |
| `tailwind.config.ts` | Tailwind v3. Los tokens reales están en `src/styles/tokens.css`. El bloque `colors` (`juk-navy/coral/gold`) es un **puente de migración** con hex congelados que no siguen a los tokens: no lo uses en código nuevo; se borra cuando el grep que indica el archivo dé 0. |
| `postcss.config.mjs` | Tailwind + autoprefixer (sin esto no se procesan las directivas `@tailwind`). |
| `prettier.config.mjs` | Prettier con el plugin que ordena clases de Tailwind. |
| `eslint.config.mjs` | `eslint-config-next` + una regla en `warn` que marca, dentro de `className`, colores de la paleta default de Tailwind, hex sueltos y clases `juk-*` (tienen que ser tokens STUDIO). |
| `tsconfig.json` | TypeScript estricto con `noUncheckedIndexedAccess`, alias `@/*` → `src/*`. Excluye `drizzle/` y `docs/`. |
| `vitest.config.ts` | Dos proyectos: `unit` (`src/**/*.test.{ts,tsx}` y `scripts/**/*.test.mjs`, sin los de integración) e `integration` (`src/**/*.integration.test.ts`, setup `tests/integration/setup.ts`, sin paralelismo). Cobertura v8 sobre `src/lib/{domain,utils,actions}` con pisos mínimos; excluye `index.ts`, `labels.ts` y `errors.ts`. |
| `playwright.config.ts` | Carga `.env.local`; `E2E_DATABASE_URL` opcional pisa la base; puerto 3001 por default (`PW_PORT`, el 3000 es del dev del usuario); `E2E_SERVER=dev\|start` (sin la variable: `dev` en local, y en CI `start` si existe `.next/BUILD_ID`); un worker; en CI 2 reintentos y reporte html; trace `retain-on-failure`; service workers bloqueados sobre `start`; proyectos `setup`, `cleanup` (teardown), `setup-familia`, `chromium`, `mobile` (solo `@mobile`), `familias` y `public`. El server que levanta corre con `EMAIL_DRY_RUN=1`. |
| `trigger.config.ts` | Trigger.dev: tasks en `src/trigger`, runtime node, 3 reintentos con backoff, proyecto por `TRIGGER_PROJECT_ID`. |
| `vercel.json` | Región de deploy `gru1` (São Paulo). |
| `.nvmrc` | Node 22 (lo lee el CI). |
| `.env.example` | Plantilla de variables de entorno con valores de ejemplo o placeholders (`xxxx`, `<generate-…>`), nunca secretos reales. Se copia a `.env.local`, que está ignorado. No trae todas las opcionales: faltan `NEXT_PUBLIC_PORTAL_URL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GSC_VERIFICATION`, `NEXT_PUBLIC_ENABLE_TWEAK`, `EMAIL_DRY_RUN`, `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN`, `SEED_FAMILIA_PASSWORD` y las de tests (`INTEGRATION_DATABASE_URL`, `E2E_*`, `PW_PORT`). La lista completa, con qué pasa si falta cada una, está en [04](04-operacion-y-handoff.md). |
| `.gitignore` | Lo propio de la app: `.env.local*` y `.uploads/` (storage local de documentos en dev). Lo genérico está en el `.gitignore` de la raíz del repo. |
| `CLAUDE.md` | Convenciones de código de la app (única copia; el `CLAUDE.md` de la raíz lo importa). |
| `README.md` | Presentación de la app: qué es, las tres superficies (back-office, portal de familias, sitio público) y cómo arrancar. |
| `OPEN_DECISIONS.md` | Registro único de decisiones abiertas y cerradas (códigos MIN, TEC y CRIT). Las specs y el código citan el código, no copian la decisión. |
| `CHANGELOG.md` | Historial por fecha (Keep a Changelog). Todo cambio suma su línea en `[Sin publicar]` en el mismo commit. |

### `juk-portal/docs/`

| Archivo | Qué hace |
|---|---|
| `estado-actual.md` | **Única fuente del estado**: qué está construido, qué es parcial, qué falta, qué servicios están conectados, la deuda y qué depende del dueño. |
| `architecture.md` | ADRs: el porqué de cada decisión técnica grande, con contexto, alternativas descartadas y cuándo revisarla. |
| `design-system.md` | Sistema de diseño STUDIO: tokens (resumen; manda `src/styles/tokens.css`), componentes, reglas de mobile y accesibilidad. |
| `setup-servicios.md` | Alta de los servicios externos paso a paso (R2 privado, secrets de Neon en GitHub, Sentry, Trigger.dev, outreach de Resend, dominio y branch protection), con cómo verificar cada uno. Es lo único que no puede hacer el código. |
| `guia-stakeholders.md` | Guía para quien prueba el entorno de prueba desde afuera del equipo: cómo entrar, qué mirar en el back-office y en la web pública, qué feedback sirve. No es doc técnica. |
| `prd/00-indice.md` | Índice de las specs funcionales (el QUÉ) y tabla de los PRDs originales con su versión. Empezá por acá. |
| `prd/01-vision-y-dominio.md` | Conceptos transversales: roles, tipos de representante, tipo de viaje, pasaporte. |
| `prd/02-portal-interno.md` | Spec del Portal de Gestión Interno (PRD v1.13). |
| `prd/03-modelo-datos.md` | Spec objetivo del modelo de datos y matriz de roles (PRD v1.7), con su delta contra el schema real. Se actualiza al tocar `src/lib/db/schema/` (lo recuerda un hook). |
| `prd/04-portal-familias.md` | Spec del Portal de Familias (PRD v1.11). |
| `prd/05-vista-representante.md` | Spec de la Vista del Representante (PRD v1.10). Todavía no construida. |
| `prd/06-deltas-implementacion.md` | Gap vigente PRD ↔ código: lo que las specs piden y el código todavía no hace o hace distinto, con fecha de corte. Se recalcula, no se acumula. |
| `prd/07-prospectos-y-web-publica.md` | Spec de lo construido sin PRD (web pública, consultas y CRM de prospectos): funciona como contrato vigente de esos módulos. |
| `prd/fuentes/*.md` (`portal-gestion-interno-v1.13.md`, `modelo-datos-v1.7.md`, `portal-familias-v1.11.md`, `vista-representante-v1.10.md`) | PRDs originales convertidos de DOCX, sin editar. Solo lectura: las specs 01-05 los consolidan. |
| `mobile-app/README.md` | Decisión de arquitectura de la app nativa: envolver la web/PWA con Capacitor, sin reescribir UI. |
| `mobile-app/BLOQUEADO-POR-VOS.md` | Lo que depende del dueño para subir a las stores (cuentas, hardware, firmas). |
| `mobile-app/runbook-android.md` · `mobile-app/runbook-ios.md` | Pasos para publicar en Play Store (se puede desde Windows) y App Store (exige Mac con Xcode). |
| `mobile-app/capacitor.config.ts` | Plantilla de config de Capacitor: se copia a la raíz de la app al arrancar el wrapping. Es de referencia y no compila (tsconfig excluye `docs/` y las deps de Capacitor no están instaladas). |

### `public/`

| Archivo | Qué hace |
|---|---|
| `sw.js` | Service worker de la PWA (lo registra `components/pwa/sw-register.tsx`, solo en producción). Solo GET same-origin; navegación network-first con fallback a `/offline`; cache-first para `/icons/` y `/fonts/`. Nunca cachea HTML de la app, datos ni auth. Si lo tocás, o si cambiás `/offline`, subí `VERSION`. |
| `globe-loader.html` | Loader animado autocontenido que monta `components/ui/globe-loader.tsx`. Hoy no se usa en la app (decisión 12/06/2026). Su `<script>` inline es uno de los motivos de `'unsafe-inline'` en la CSP. |
| `fonts/*.ttf` | Montserrat 500 y 800. |
| `icons/*.png` | Íconos de la PWA (192, 512, maskable, apple-touch) que referencia `src/app/manifest.ts`. |
| `landing/**` | Imágenes del sitio público: acreditaciones, banderas (`flags/`), programas, salidas, testimonios, fotos de ciudades (`trips/`) y el logo. |
| `email/**` | Imágenes de los mails (las elige `src/lib/email/imagenes.ts`): fotos de cabecera por ciudad y una de grupo, banderas, íconos y el logo. **Siempre JPG o PNG**: WebP no se ve en Outlook de escritorio y SVG no se ve en Gmail. Carpeta propia y no `landing/` a propósito: un mail enviado vive para siempre en la casilla, y si el sitio renombra o saca una foto, los mails viejos quedarían con un hueco. Se generaron desde `landing/` con sharp. |

---

## `src/` (raíz)

### `src/`

| Archivo | Qué hace |
|---|---|
| `proxy.ts` · `proxy.test.ts` | Middleware de Next 16 (en esta versión se llama *proxy*). Solo mira si existe la cookie de sesión (`juk.session_token` o `__Secure-juk.session_token`), no la valida. Reglas: split por subdominio `portal.*` (gateado por `NEXT_PUBLIC_PORTAL_URL`/`NEXT_PUBLIC_SITE_URL`, nunca en localhost); `/api/auth/sign-up*` → 404; pasan sin sesión el sitio público, `/api/auth`, `/api/webhooks`, `/_next`, `/baja` y `/offline`; el resto sin cookie → `/login?returnTo=`. **No rebota `/login` por cookie** (armaba un loop con cookies vencidas): lo decide la página. El matcher excluye assets por extensión pero deja siempre adentro `/api/*` (los documentos de `/api/uploads/<key>.pdf` exigen sesión). |
| `instrumentation.ts` | Inicializa Sentry en server/edge solo si hay `NEXT_PUBLIC_SENTRY_DSN` y reporta solo en producción; exporta `onRequestError`. |
| `instrumentation-client.ts` | Lo mismo en el navegador; exporta `onRouterTransitionStart`. |

---

## `src/app/` — rutas

### `src/app/`

| Archivo | Qué hace |
|---|---|
| `layout.tsx` | Root layout: fuentes con `next/font` (Bricolage Grotesque, Plus Jakarta Sans, Space Mono) inyectadas como CSS vars, `globals.css`, metadata y viewport, y monta `SwRegister`. |
| `global-error.tsx` [client] | Último recurso cuando falla el root layout: trae su propio `<html>`/`<body>` e import de estilos, reporta a Sentry. |
| `not-found.tsx` | 404 global con marca. El back-office y el portal de familias tienen el suyo. |
| `manifest.ts` | Manifest de la PWA. `start_url` es `/dashboard` (la PWA es el portal, no la landing). No cambies el `id`: los dispositivos ya instalados verían otra app. |
| `robots.ts` | `disallow` de portal, auth y `/api/`, tomado de `lib/routes.ts`. |
| `sitemap.ts` | Páginas públicas + cada nota de `(public)/notas/notas-data.ts`. |
| `icon.png` | Favicon. |

### `src/app/(admin)/` — back-office (común a todos los módulos)

| Archivo | Qué hace |
|---|---|
| `layout.tsx` | `requireAdminJuk()`: sin sesión → `/login`; cualquier otro rol → al home de su rol (`HOME_BY_ROLE` de `lib/routes.ts`), así que familia va a `/familias`. Después envuelve todo en `AdminShell`. Ojo: el home de `representante` es `/dashboard`, que está dentro de este layout, así que una cuenta representante queda en loop de redirect (todavía no hay pantalla para ese rol ni UI que cree esas cuentas). Su comentario dice que sin el rol "redirects to /login": quedó viejo. |
| `loading.tsx` | Fallback del grupo: `ListPageSkeleton` de 6 filas. |
| `error.tsx` [client] | Error boundary del back-office: se renderiza dentro del shell (se conserva la navegación), reporta a Sentry, ofrece reintentar o volver. |
| `not-found.tsx` | 404 del back-office, dentro del shell. Lo disparan los `notFound()` de las páginas (alumno, viaje o colegio inexistente). |

**Molde de un módulo ABM** (se repite en alumnos, viajes, colegios, group-leaders y prospectos):
`page.tsx` (listado paginado, filtros validados con el schema del dominio) · `<modulo>-filters.tsx`
`[client]` (escribe los filtros en la URL, que es la fuente de verdad) · `<modulo>-table.tsx`
(tabla que en mobile pasa a tarjetas) · `<modulo>-form.tsx` `[client]` (alta y edición, con
`useErroresDeFormulario` y `useUnsavedChanges`) · `actions.ts` `[action]` · `nuevo/page.tsx` ·
`[id]/editar/page.tsx` · un `loading.tsx` por segmento con el skeleton de su silueta. Solo alumnos,
viajes y prospectos tienen `[id]/page.tsx` de detalle. Alumnos y viajes usan slug en `[id]` (DNI y
código); colegios, group leaders y prospectos usan el uuid.

### `src/app/(admin)/dashboard/`

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Header con saludo y cada sección en su propio `<Suspense>`, así pintan por separado. |
| `sections.tsx` | Secciones async: accesos rápidos, stat cards que linkean al listado ya filtrado (`RUTAS_DASHBOARD`), "Alumnos con acción urgente" (`getAlumnosConAccionUrgente`), panel de alertas (`getAlertas`), viajes próximos con ocupación y viajes del próximo año, cada una con su fallback. |
| `loading.tsx` | Se arma con los mismos fallbacks de `sections.tsx`, para que la silueta no salte cuando llega el streaming. |

### `src/app/(admin)/alumnos/`

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Listado paginado en SQL (`listAlumnos`), filtros validados con `alumnoFiltersSchema`, opciones de viaje para el filtro. |
| `alumnos-filters.tsx` [client] | Búsqueda con debounce y filtros por viaje, paso pendiente, estado y alerta. |
| `alumnos-table.tsx` | Filas con viaje, estado y marca de "pasos bloqueados o vencidos"; link a la ficha por DNI. |
| `alumno-form.tsx` [client] | Alta y edición: datos personales, pasaporte, dos tutores, facturación opcional (todo o nada) y preferencias. |
| `actions.ts` [action] | `createAlumnoAction` (crea o vincula la cuenta de familia con `asegurarCuentaFamilia`), `enviarAccesoFamiliaAction`, `updateAlumnoAction`, `darDeBajaAlumnoAction` (con motivo; desactiva la cuenta de familia cuando corresponde) y `reactivarAlumnoAction` (hoy no reactiva esa cuenta: decisión abierta en OPEN_DECISIONS). |
| `loading.tsx` · `nuevo/loading.tsx` · `[id]/loading.tsx` · `[id]/editar/loading.tsx` | Skeletons: listado, formulario, ficha del alumno, formulario. |
| `nuevo/page.tsx` | Alta de alumno. |
| `[id]/page.tsx` | Ficha por DNI (el param es el DNI; de ahí sale el uuid que reciben los hijos): datos, asignaciones con su tablero M6 y plan de cuotas, asignar a viaje, acceso de familia. |
| `[id]/editar/page.tsx` | Edición por DNI. |
| `[id]/tablero-m6.tsx` [client] | Tablero del alumno (Paso 0 + grupos A/B/C/D): transiciones, bloquear con motivo, fecha límite de A1, sub-estados de ETA y Parental Consent, adjuntos (`subirDocumentoPasoAction`). |
| `[id]/pasos-actions.ts` · `[id]/pasos-actions.test.ts` [action] | `transicionarPasoAlumnoAction` (Paso 0 es solo lectura, B1/B2 se derivan de las cuotas, bloquear exige nota), `actualizarFechaLimiteA1Action`, `actualizarSubEstadoPasoAction` (en C1 y A3 el estado del paso sale del sub-estado). |
| `[id]/documentos-actions.ts` [action] | `subirDocumentoPasoAction`: valida el archivo (MIME, magic bytes, 10 MB), lo sube con `putDocumento`, lo registra en `documentos` y actualiza el paso. |
| `[id]/cuotas-panel.tsx` [client] | Plan de cuotas B1 (crear el plan; con pagos registrados la action no lo regenera), mora por cuota, registrar pago y confirmar el último pago presencial (B2), ambos con `RegistrarPagoDialog`. |
| `[id]/cuotas-actions.ts` · `[id]/cuotas-actions.test.ts` [action] | `crearPlanCuotasAction` (canal según el origen del viaje), `registrarPagoCuotaAction` (fecha efectiva nunca futura; advertencia confirmable si se paga fuera de orden), `confirmarUltimoPagoPresencialAction`. Todas sincronizan B1/B2/C2 y auditan. |
| `[id]/asignar-viaje-panel.tsx` [client] | Asignar el alumno a un viaje desde su ficha, con la action compartida `lib/actions/asignaciones.ts` (mismas validaciones que desde el viaje). |
| `[id]/asignar-viaje.ts` · `[id]/asignar-viaje.test.ts` | Helpers puros del select: cupo completo, texto de cupos, etiqueta del viaje y rango de fechas. |
| `[id]/acceso-familia.tsx` [client] | Botón para (re)enviar el acceso al Portal de Familias al tutor 1, con confirmación y fecha del último envío. |

### `src/app/(admin)/viajes/`

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Listado con inscriptos/cupo; filtros por año, estado, colegio, país, tipo y origen (un filtro inválido se descarta solo, sin tirar los demás). |
| `viajes-filters.tsx` [client] | Filtros del listado. |
| `viajes-table.tsx` | Filas con código, fechas, estado y barra de ocupación; link al detalle por código. |
| `barra-progreso.tsx` | Barra de ocupación y de trámites con `<progress>` nativo (la app no admite estilos inline) y `tonoOcupacion` (sobre-cupo, bajo el mínimo o normal). |
| `viaje-form.tsx` [client] | Alta y edición: tipo (grupal o individual), origen/representante, colegios destino y cliente, fechas, group leaders, comisión y fee. En edición solo ofrece transiciones de estado válidas. |
| `actions.ts` · `actions.test.ts` [action] | `createViajeAction` y `updateViajeAction` (capacidad calculada en el dominio), `cancelarViajeAction` (no desde finalizado; encola la task `notificar-cancelacion-viaje` y la cancelación queda hecha aunque Trigger.dev no responda). |
| `loading.tsx` · `nuevo/loading.tsx` · `[id]/loading.tsx` · `[id]/editar/loading.tsx` | Skeletons: listado, formulario, detalle del viaje, formulario. |
| `nuevo/page.tsx` | Alta: trae colegios destino y cliente para los selects. |
| `[id]/page.tsx` | Detalle por código (`getViajeByCodigo`): header, subnavegación y secciones en `<Suspense>` (alertas, alumnos, group leaders, pagos, pasos M7). |
| `[id]/editar/page.tsx` | Edición por código. Suma a las opciones el colegio actual aunque esté inactivo (si no, el select quedaría vacío y se perdería al guardar). |
| `[id]/sections.tsx` | Secciones async del detalle: resumen (cupo y completitud), alertas del viaje, roster, group leaders, pagos y pasos M7 (calcula el estado derivado de Police Checks). |
| `[id]/subnav-viaje.tsx` [client] | Subnavegación con anclas, **no tabs** a propósito: las secciones tienen que seguir montadas (se refrescan entre sí y los E2E las buscan juntas). |
| `[id]/asignaciones-panel.tsx` [client] | Roster: asignar alumnos (advertencias confirmables de pasaporte y cupo) y quitarlos, con `lib/actions/asignaciones.ts`. |
| `[id]/group-leaders-panel.tsx` [client] | Asignar, quitar y marcar principal a los group leaders del viaje. |
| `[id]/group-leaders-actions.ts` [action] | `asignarGroupLeaderAction`, `quitarGroupLeaderAction`, `marcarPrincipalAction`. |
| `[id]/pagos-viaje-panel.tsx` [client] | Resumen de pagos por alumno del viaje, ordenable por mora, saldo o nombre. |
| `[id]/pasos-viaje-panel.tsx` [client] | Tablero M7: pasajes (sub-estados distintos para grupal e individual), excursiones, transfers y tarjetas con cobertura por alumno, police checks derivado. Deshabilita avanzar un paso mientras su dependencia está pendiente. |
| `[id]/pasos-actions.ts` · `[id]/pasos-actions.test.ts` [action] | `cambiarEstadoPasoViajeAction` (Police Checks no se setea a mano; Transfers no avanza sin Pasajes completado), `guardarMetadataPasoViajeAction` (Zod por tipo; conserva la cobertura ya marcada), `marcarAlumnoPasoViajeAction` (auto-completa o reabre el paso, no pisa un bloqueo manual, rechaza asignaciones de otro viaje). |

### `src/app/(admin)/colegios/`

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Listado paginado; filtros por búsqueda, tipo, país e "incluir inactivos". |
| `colegios-filters.tsx` [client] | Filtros del listado. |
| `colegios-table.tsx` | Filas con tipo, país y estado; link a editar (no hay ficha de detalle). |
| `colegio-form.tsx` [client] | Alta y edición: datos, contactos académico y administrativo obligatorios y opcionales, alojamientos, cursos, tipo de entrada (ETA, VISA o ninguna), comisión y **config documental** por documento (requerido, opcional o N/A), que decide qué pasos se activan al asignar un alumno. |
| `actions.ts` [action] | `createColegioAction` y `updateColegioAction` (guardan también la config documental), `desactivarColegioAction`, `reactivarColegioAction`. |
| `loading.tsx` · `nuevo/loading.tsx` · `[id]/editar/loading.tsx` | Skeletons de listado y formulario. |
| `nuevo/page.tsx` | Alta de colegio. |
| `[id]/editar/page.tsx` | Edición por uuid; pide colegio y config documental en paralelo (un id inexistente devuelve los defaults del dominio y después cae en `notFound()`). |

### `src/app/(admin)/group-leaders/`

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Listado paginado; filtros por búsqueda y estado del police check. |
| `group-leaders-filters.tsx` [client] | Filtros del listado. |
| `group-leaders-table.tsx` | Filas con estado y vencimiento del police check. |
| `group-leader-form.tsx` [client] | Alta y edición: datos y police check (estado y fechas). |
| `actions.ts` [action] | `createGroupLeaderAction` y `updateGroupLeaderAction` (email repetido → error por campo). No hay baja: el schema no la tiene. |
| `loading.tsx` · `nuevo/loading.tsx` · `[id]/editar/loading.tsx` | Skeletons de listado y formulario. |
| `nuevo/page.tsx` | Alta. |
| `[id]/editar/page.tsx` | Edición por uuid. |

### `src/app/(admin)/pagos/`

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Módulo global de cuotas: stat cards por moneda (calculadas sobre todo el universo filtrado, no sobre la página), filtros por estado efectivo, viaje y moneda, listado paginado en SQL. |
| `pagos-filters.tsx` [client] | Filtros por estado, viaje y moneda. |
| `pagos-table.tsx` [client] | Cuotas con mora (tarjetas en mobile) y botón "Registrar pago". |
| `registrar-pago-dialog.tsx` [client] | **El único diálogo** para asentar un pago: lo usan este módulo, la fila de cuota de la ficha y la confirmación presencial de B2. Pide fecha efectiva (hoy por default, nunca futura) y observaciones, y respeta la advertencia confirmable de pago fuera de orden. |
| `actions.ts` · `actions.test.ts` [action] | `registrarPagoDesdePagosAction`: misma lógica que la ficha (sincroniza pasos, audita con origen "módulo Pagos", revalida Pagos y la ficha). |
| `loading.tsx` | Skeleton del listado. |

### `src/app/(admin)/prospectos/` — CRM de colegios a captar

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Vista kanban (por defecto) o tabla paginada según `?vista=`. |
| `prospectos-kanban.tsx` [client] | Tablero por etapa con estado local optimista y cambio de etapa desde la tarjeta (`moverProspectoAction`). |
| `prospectos-table.tsx` | Vista tabla con estado, ubicación y próxima acción. |
| `prospectos-filters.tsx` [client] | Búsqueda y estado; al filtrar fuerza la vista tabla. |
| `prospecto-form.tsx` [client] | Alta y edición: datos, emails y teléfonos múltiples, responsable, próxima acción e imagen (`subirImagenAction`). |
| `actions.ts` · `actions.test.ts` [action] | `createProspectoAction`, `updateProspectoAction`, `moverProspectoAction` (el cambio de etapa queda en la bitácora; reordenar no), `importarProspectosAction`, `enviarOutreachAction` (no envía a quien se dio de baja; registra también el intento fallido), `agregarNotaAction`, `convertirAColegioAction`, `subirImagenAction`, `darDeBajaProspectoAction` (tiene test, pero hoy ninguna pantalla la llama: la baja real llega por `/baja?token=`). Las invitaciones al Application Form también salen de acá: `crearLoteInvitacionesAction` (arma la campaña y devuelve el lote), `continuarLoteAction` (una tanda), `enviarInvitacionIndividualAction` y `revocarInvitacionAction`. Nunca se confía en qué casillas mandó el cliente: llegan ids de prospecto y el servidor vuelve a derivar a quién le escribe. |
| `loading.tsx` · `nuevo/loading.tsx` · `importar/loading.tsx` · `[id]/loading.tsx` · `[id]/editar/loading.tsx` | Skeletons: listado, formulario, formulario, detalle (armado en el propio archivo), formulario. |
| `nuevo/page.tsx` | Alta; trae los usuarios del equipo para el responsable. |
| `importar/page.tsx` | Importación CSV con la lista de encabezados soportados. |
| `importar/import-client.tsx` [client] | Pegar o subir el CSV, previsualizar lo parseado (`parseProspectosCsv`) e importar. |
| `[id]/page.tsx` | Detalle por uuid: datos, bitácora de comunicaciones y conversión a colegio. |
| `[id]/editar/page.tsx` | Edición por uuid. |
| `[id]/comunicaciones-panel.tsx` [client] | Bitácora: notas internas (`agregarNotaAction`) y envío de outreach por email (`enviarOutreachAction`), con el estado de tracking de cada comunicación. |
| `[id]/convertir-button.tsx` [client] | Convierte el prospecto en colegio cliente con confirmación, o linkea al colegio si ya se convirtió. |
| `[id]/invitar-inscripcion.tsx` [client] | Invitar de a uno desde la ficha: se elige el viaje y sale el mail en la misma llamada (es uno solo, no hay nada que retomar). Por debajo es el mismo camino que la campaña —un lote de uno—, así que hereda token hasheado, vencimiento, bitácora y tracking. Quien se dio de baja o no tiene casilla no ve el botón, solo el motivo; el servidor lo vuelve a chequear igual. El diálogo de confirmación lleva solo texto: adentro del modal hay trampa de foco y el popover del `<Select>` no tiene por qué pelearse con ella. |
| `invitaciones/page.tsx` | Invitaciones al Application Form: armar una campaña y seguir las que ya salieron. El universo de destinatarios se calcula **en el servidor** desde el filtro de la URL, con las mismas reglas que después aplica la action, para que lo que la pantalla promete sea exactamente lo que se manda. Si el filtro se pasa del tope, la lista no viaja al cliente. Sin `RESEND_WEBHOOK_SECRET` avisa que entrega, apertura y clic no se están midiendo (un placeholder cuenta como ausente, igual que en `/configuracion`). |
| `invitaciones/nuevo-lote.tsx` [client] | Arma la campaña (viaje, variante, destinatarios tildados) y **empuja el envío desde el navegador**: Trigger.dev no está desplegado, así que el bucle llama a `continuarLoteAction` tanda tras tanda. Corta en tres casos —terminó, la action falló, o una tanda no movió nada y las filas las tiene reservadas otra pestaña—, y el progreso vive en la base, así que la pestaña se puede cerrar. Exporta `useEnvioDeLote`, que reusa el botón "Retomar" de la tabla. Los tres estados vacíos de la lista dicen cosas distintas (CRM vacío, filtro sin resultados, universo entero excluido) y cada uno ofrece su salida. |
| `invitaciones/lotes-table.tsx` [client] | Las campañas con su embudo, de "salió el mail" a "el equipo dio de alta al alumno", con corte por piel. Dos reglas: el número va **siempre** al lado del porcentaje (con 4 destinatarios, "50%" invita a conclusiones falsas), y lo que no se mide se dice —sin el webhook de Resend, entrega, apertura y clic van como "no disponible" y no como cero—. Los conteos llegan agregados en SQL sobre el lote entero, nunca sobre las filas visibles. Es `[client]` por el botón "Retomar". |
| `invitaciones/loading.tsx` | Silueta de la pantalla: header, filtro del universo, panel de la campaña nueva y tabla de campañas. |

### `src/app/(admin)/consultas/` — leads de la web pública

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Bandeja paginada de consultas con filtro por estado y búsqueda. |
| `consultas-filters.tsx` [client] | Búsqueda y estado. |
| `consultas-table.tsx` | Cada consulta con todos sus datos y botón para responder por WhatsApp (normaliza el teléfono a formato `wa.me` con +54). |
| `estado-select.tsx` [client] | Cambia el estado de una consulta en la fila. |
| `actions.ts` [action] | `cambiarEstadoConsultaAction` (queda auditado). |
| `loading.tsx` | Skeleton del listado. |

### `src/app/(admin)/inscripciones/` — fichas del Application Form propio

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Bandeja paginada con filtros en la URL (estado, viaje, variante, búsqueda) y una tira de StatCards con los conteos **agregados en SQL sobre el universo filtrado**, incluidos los de cada variante visual. |
| `inscripciones-filters.tsx` [client] | Búsqueda con debounce por nombre, DNI o código, y estado, viaje (`searchable`) y variante escritos en la URL. Cada cambio borra `?page`: el filtro estrena universo y quedarse en la página 7 mostraría una tabla vacía sobre un resultado que sí tiene filas. |
| `inscripciones-table.tsx` | Una fila por ficha: código y fecha, alumno, adulto responsable, viaje, variante y el estado con su motivo. El DNI va **enmascarado** (`enmascararDni`, Nivel 2) porque es la pantalla que más se abre y muchas veces con alguien mirando de costado; el DNI entero se ve recién en el detalle. El vacío distingue "todavía no entró ninguna ficha" de "sin resultados para estos filtros". |
| `actions.ts` · `actions.test.ts` [action] | `procesarInscripcionAction` (da de alta una ficha pendiente), `reintentarAltaAction` (no-op sobre una ya procesada), `resolverVinculoAction` (el conflicto de cuenta: pide confirmación explícita la primera vez) y `anularInscripcionAction`. Todas requieren rol, derivan los ids de la base y auditan. Qué se puede hacer con cada ficha lo decide `domain/inscripciones/acciones.ts`, compartido con el panel. |
| `[id]/procesar-panel.tsx` [client] | Las acciones sobre una ficha, con el estado y su motivo real. Deja explícito cuándo el alta se colgaría de una cuenta de familia que ya existe. |
| `[id]/page.tsx` | Detalle por **código** `INS-000123` (no uuid: toda ruta de detalle nueva nace con slug legible). Muestra la ficha completa —acá sí se ven los datos sensibles, es el back-office—, el contexto de campaña y el sello del consentimiento con link a esa versión de la política. |
| `loading.tsx` · `[id]/loading.tsx` | Listado: `PagosPageSkeleton`, que ya es esa silueta (header, cuatro cards, filtros y filas). Detalle: header y dos columnas de paneles, armado en el propio archivo; sin él, el detalle heredaría el skeleton de la bandeja. |

### `src/app/inscripcion/` — el formulario público (fuera de `(public)`)

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Resuelve el link tokenizado con un **SELECT puro** y decide qué mostrar: formulario, "ya recibimos tu ficha" o un único copy genérico para inválido/vencido/revocado (no le confirma a nadie qué token existe). `robots: noindex`. Vive fuera de `(public)` a propósito: ese layout monta `<Analytics/>` y el token viajaría a GA en `page_location`. |
| `layout.tsx` | Shell propio, sin la navegación de marketing. Arranca con la piel base (variante A) para que el skeleton no salte al hidratar. |
| `variantes.ts` | Qué cambia en cada piel: la clase completa como literal (nunca interpolada) y la presentación de cada variante (rótulo numerado, volanta con microcopy, paradas con progreso). |
| `_marco.tsx` | Lo que rodea a la ficha: `MarcaJuk`, `HeroInscripcion`, `ComoSigue`, `FranjaDeConfianza` y `PieInscripcion`. No conoce la variante (todo sale del vocabulario `--form-*`). Tres reglas con test: ni un `<form>` ni un control nuevo, un solo `<h1>` visible y cero navegación al sitio (solo `/privacidad`, mail y WhatsApp). |
| `inscripcion-form.tsx` [client] | La ficha con `useActionState`, honeypot oculto, componentes del design system, consentimiento que linkea `/privacidad` y éxito inline (el sitio público no monta `ToastProvider`). Su `Campo` inyecta `invalid` al control una sola vez: `<Field error>` sin `invalid` deja el campo gris. |
| `use-validacion-en-vivo.ts` [client] | Cableado de la validación en vivo: qué campo, qué valor y cuándo se pregunta. La regla y el mensaje los pone el dominio. No se unit-testea (Vitest corre en `node`, sin jsdom); lo cubre el E2E. |
| `actions.ts` · `actions.test.ts` [action] | `enviarInscripcion`: Zod → honeypot → rate limit (IP, email y token) → resuelve la invitación **server-side** → persiste SIEMPRE → mails best-effort. No toca `alumnos`: el alta automática es la etapa 4. |
| `loading.tsx` | `FormPageSkeleton`. |

### `src/app/(admin)/usuarios/` — cuentas del equipo (solo super_admin)

| Archivo | Qué hace |
|---|---|
| `page.tsx` | `requireRole("super_admin")`; lista admins paginados en memoria (`paginar`). |
| `usuarios-table.tsx` [client] | Por fila: cambiar rol, activar o desactivar (con confirmación, nunca sobre uno mismo) y reenviar el acceso. |
| `usuario-form.tsx` [client] | Alta: nunca muestra una contraseña; avisa que se mandó un link para crearla. |
| `actions.ts` · `actions.test.ts` [action] | `createUsuarioAction` (crea con password placeholder aleatoria vía Better-Auth y manda el link; no crea familias ni representantes), `reenviarAccesoUsuarioAction`, `cambiarRolUsuarioAction`, `setActivoUsuarioAction`. |
| `loading.tsx` · `nuevo/loading.tsx` | Skeletons de listado y formulario. |
| `nuevo/page.tsx` | Alta (super_admin). |

### `src/app/(admin)/configuracion/`

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Solo super_admin: remitentes de email, variante del formulario de inscripción, previsualización de templates y estado de servicios; link a "Mi cuenta". |
| `mails-form.tsx` [client] | Edita los remitentes (automáticos, comunicaciones, marketing, reply-to) y manda un mail de prueba de cualquier template. |
| `formulario-form.tsx` [client] | Elige con qué piel se sirve el Application Form público. La elección es **solo estética**: las tres variantes comparten campos, validación, action y árbol accesible, por eso la pantalla no ofrece "editar el formulario". Muestra el detalle de la variante elegida y una vista previa en un `iframe sandbox=""`: sin scripts la página no hidrata, así que ningún click de la previa llega a la base (y por eso tampoco se ve la validación en vivo). Las URLs de la previa están escritas completas por variante, nunca interpoladas. Un link de invitación o una campaña con variante propia mandan sobre este setting. |
| `preview-templates.tsx` [client] | Renderiza un template con datos de ejemplo en un iframe `srcDoc`. |
| `estado-servicios.tsx` | Card con qué servicios están configurados y el host de la base. Tres estados: OK, *Pendiente* (falta una variable) y *Revisar* en rojo (quedó el valor de ejemplo, que rompe distinto). |
| `mail-templates-meta.ts` | Lista de templates disponibles para prueba y preview, con su tipo de remitente. |
| `actions.tsx` · `actions.test.ts` [action] | `guardarMailsAction`, `guardarFormularioSettingsAction` (la variante activa del formulario público), `enviarMailPruebaAction`, `previewTemplateAction`, `getEstadoServiciosAction` (sale del catálogo de `domain/configuracion/env.ts`, el mismo que `npm run check:env`; expone solo el host de la DB, nunca la URL; en un deploy evalúa el perfil de producción). Es `.tsx` porque renderiza emails. |
| `loading.tsx` | `ConfigSkeleton`. |
| `cuenta/page.tsx` | "Mi cuenta": la abre cualquier usuario del back-office (`requireSession`, no super_admin). |
| `cuenta/cambiar-password-form.tsx` [client] | Cambio de contraseña con `authClient.changePassword`. |

### `src/app/(auth)/`

| Archivo | Qué hace |
|---|---|
| `layout.tsx` | Pantalla partida: panel de marca a la izquierda (en `<Suspense>` porque lee `?portal=`) y formulario a la derecha. No exige sesión. |
| `login/page.tsx` | Con una sesión real y activa redirige al `returnTo` saneado o, si no vino, al home del rol (`HOME_BY_ROLE`); esto lo decide la página y no el proxy. Avisos por `?reset=success` e `?inactivo=1`, copy para familias con `?portal=familias` y email precargado con `?email=`. También renderiza el `?error=` del callback de Google (`mensajeErrorOAuth`) y decide si el botón se muestra. |
| `login/login-form.tsx` [client] | Login email/contraseña con Better-Auth. Credenciales incorrectas → mensaje genérico; el 403 de cuenta desactivada sí se distingue. Sanea el `returnTo`. Con el provider configurado suma "Continuar con Google", que pasa `errorCallbackURL` para que un fallo vuelva al login y no a la página de error de Better-Auth. |
| `reset-password/page.tsx` | Sin token: pedir el link. Con token: crear la contraseña nueva. |
| `reset-password/reset-form.tsx` [client] | Los dos modos. El mensaje de éxito al pedir el link es genérico para no revelar qué emails existen. |

### `src/app/(public)/` — sitio de marketing

| Archivo | Qué hace |
|---|---|
| `layout.tsx` | Metadata del sitio, `TopNav`, `Footer`, `Analytics`, JSON-LD de organización y website, `landing.css`. Carga `DesignTweaker` en un chunk aparte: en dev siempre, en producción solo con `NEXT_PUBLIC_ENABLE_TWEAK=1`. |
| `page.tsx` | Home: compone las secciones de `_sections/`. `revalidate` diario porque el banner de próxima salida depende de la fecha. |
| `error.tsx` [client] | Error boundary del sitio con su diseño; reporta a Sentry. |
| `landing.css` | Keyframes propios de la landing (los globales están en `src/styles/animations.css`). |
| `seo.tsx` | `SITE_URL` (pisable con `NEXT_PUBLIC_SITE_URL`), `JsonLd` y los schemas de organización, website, breadcrumb, cursos y servicio. |
| `analytics.tsx` [client] | GA4 solo si hay `NEXT_PUBLIC_GA_ID`; `track()` es no-op sin analytics. |
| `contact.ts` | Re-export de `@/lib/contact` para no tocar consumidores viejos. Los datos se editan en `src/lib/contact.ts`. |
| `desktop-nav.tsx` [client] | Links de navegación de escritorio con la ruta activa marcada. |
| `mobile-menu.tsx` [client] | Menú de teléfono: bloquea el scroll del fondo, cierra con Escape y al cambiar de ruta. |
| `design-tweaker.tsx` [client] | Herramienta interna de iteración de diseño (colores, forma, tipografía, textos) que aparece con `?tweak`. **No es para el público.** Exporta CSS para `tokens.css`. |
| `lead-form.tsx` [client] | Formulario de consulta con `useActionState(submitLead)`; campo institución solo si es para un colegio; dispara `generate_lead`. |
| `newsletter-form.tsx` [client] | Suscripción al newsletter (`subscribeNewsletter`); dispara `newsletter_signup`. |
| `leads/actions.ts` [action] | `subscribeNewsletter` y `submitLead`. El anti-abuso vive acá y no en el form (las actions se pueden invocar por POST directo): honeypot, rate limit por IP y por email, y dedup de 24 h del aviso al equipo. El aviso se encola en Trigger.dev y, si no se puede, se manda directo. |
| `consulta/page.tsx` | "Pedí tu propuesta": formulario de lead. |
| `contacto/page.tsx` | Canales de contacto + formulario + acreditaciones. |
| `programas/page.tsx` | Catálogo de programas con schema de cursos. |
| `quienes-somos/page.tsx` | Institucional con diferenciadores, stats y acreditaciones. |
| `salidas/page.tsx` | Salidas grupales, para institutos e individuales, con destinos. |
| `notas/page.tsx` | Índice de notas del blog. |
| `notas/notas-data.ts` | Contenido de las notas (redacción propia; datos migratorios verificados a junio 2026, revisarlos al actualizar). |
| `notas/[slug]/page.tsx` | Nota individual, estática por `generateStaticParams`, con metadata y JSON-LD. |
| `notas/[slug]/og/route.tsx` | Imagen Open Graph generada por nota (runtime node, estática). |
| `privacidad/page.tsx` | Política de Privacidad vigente, con índice de anclas y la franja de versión. El texto NO vive acá: sale de `src/lib/domain/privacidad/politica.ts`, porque la versión aceptada se guarda junto a cada consentimiento. |
| `privacidad/[version]/page.tsx` | Una versión histórica de la política (`generateStaticParams` desde `HISTORIAL_POLITICAS`, `notFound()` si no existe). El historial se lista en `/privacidad#versiones`: una ruta `/privacidad/versiones` la comería este segmento. |
| `privacidad/_politica-contenido.tsx` | Render compartido por las dos páginas (secciones, índice y anclas). El `cuerpo` del dominio es texto plano: el parseo de párrafos y viñetas vive acá, no en el dominio. |
| `_components/nav.tsx` | `TopNav` y `NAV_LINKS`. |
| `_components/footer.tsx` | Footer con contacto, redes y links. |
| `_components/primitives.tsx` | Primitivos del sitio: `Cta`, `Kicker`, `SectionTitle`, `CheckItem`, `WhatsAppIcon`, `Wordmark`, `DESTINOS`, `Bandera`, `PublicPageHeader`. No usa `@/components/ui` (que es del portal); **su `SectionTitle` no es el del design system**. |
| `_sections/index.ts` | Barrel de las secciones. |
| `_sections/hero.tsx` | Hero con destinos, CTA de WhatsApp, newsletter y banner de próxima salida (`proximaSalida`; si no hay ninguna vigente, no se muestra). |
| `_sections/stats-band.tsx` | Banda de números institucionales. |
| `_sections/quienes-somos.tsx` | Bloque institucional de la home. |
| `_sections/salidas.tsx` | Tarjetas de los tres tipos de salida. |
| `_sections/programas.tsx` | Programas por público. |
| `_sections/acompanamiento.tsx` | Fases del acompañamiento (antes, durante y después). |
| `_sections/testimonios.tsx` | Testimonios con foto. |
| `_sections/acreditaciones.tsx` | Logos de acreditaciones. |
| `_sections/faq.tsx` | Preguntas frecuentes (con JSON-LD). |
| `_sections/lead-section.tsx` | Bloque "Pedí tu propuesta" con `LeadForm`. |
| `_sections/cta-final.tsx` | CTA final con WhatsApp y mail. |

### `src/app/familias/` — Portal de Familias

| Archivo | Qué hace |
|---|---|
| `layout.tsx` | `requireFamilia()` y fondo del portal. |
| `page.tsx` | Lista los alumnos de la familia; con uno solo redirige directo a `/familias/<dni>`. |
| `_shell.tsx` [client] | `FamiliaShell`: sidebar en desktop, header con tabs en mobile; acceso a Ayuda y aviso de cuota vencida en todas las pantallas menos Pagos. No importa el `AdminShell`. |
| `_ui.tsx` | Piezas de solo lectura compartidas: `completitud`, `FamiliaPageHeader`, `ProgresoBarra`, `ViajeHeader`, `SeccionTitulo`, `EstadoVacio`. |
| `_actions.ts` · `_actions.test.ts` [action] | `subirDocumentoFamiliaAction`, `reportarEtaFamiliaAction`, `confirmarPasoFamiliaAction` (solo D1; no reabre uno que JUK ya completó), `reportarDatoFamiliaAction` (audita y avisa al equipo por mail). El dueño se deriva siempre en el server: paso → asignación → alumno → familia. |
| `error.tsx` [client] | Error boundary del portal. Vive acá y no en `[dni]/` porque un `error.tsx` no captura los fallos del layout de su mismo segmento, y quien carga los datos es `[dni]/layout.tsx`. |
| `not-found.tsx` | 404 del portal (DNI que no es de la familia). |
| `logout-button.tsx` [client] | Cierra la sesión con Better-Auth; un link a `/login` no alcanza. |
| `[dni]/_data.ts` | `cargarAlumnoFamilia` (memoizada por request: resuelve el alumno por DNI y valida que sea de la familia; si no, `notFound()`), `asignacionesActivas`, `cuotasActivas`, `contarCuotasVencidas`. |
| `[dni]/layout.tsx` | Arma el `FamiliaShell` con los alumnos y las cuotas vencidas. **No agregues un `loading.tsx` en `familias/`**: envolvería este layout, la respuesta pasaría a streaming y el `notFound()` de pertenencia devolvería 200 en vez de 404. Los `loading.tsx` de las páginas internas sí son seguros. |
| `[dni]/page.tsx` | Resumen: avance de trámites y saldo por viaje. |
| `[dni]/documentacion/page.tsx` | Trámites del alumno agrupados por etapa. |
| `[dni]/documentacion/paso-familia.tsx` [client] | `DocumentacionPasos` y `PasoFamilia`: qué es cada trámite y quién lo hace, subir archivo, estado del ETA con "Tuve un problema" y link oficial, confirmar D1. |
| `[dni]/pagos/page.tsx` | Plan de pagos por viaje. |
| `[dni]/pagos/pagos-detalle.tsx` [client] | Resumen del plan, filtro de cuotas (todas, pendientes, pagadas, vencidas) y detalle al expandir. |
| `[dni]/viaje/page.tsx` | Datos del viaje, colegio destino y representante. |
| `[dni]/datos/page.tsx` | Ficha del alumno; avisa si el pasaporte vence antes del fin del viaje. |
| `[dni]/datos/reportar-dato.tsx` [client] | "Reportar un dato incorrecto" (no edita la ficha) con confirmación visible. |
| `[dni]/ayuda/page.tsx` | Canales reales con mensaje pre-armado, quién acompaña al grupo y preguntas frecuentes. |
| `[dni]/ayuda/faq.ts` | Contenido fijo de las preguntas frecuentes por tema (no inventa reglas: cuenta lo que el portal ya hace). |
| `[dni]/loading.tsx` · `[dni]/documentacion/loading.tsx` · `[dni]/pagos/loading.tsx` · `[dni]/viaje/loading.tsx` · `[dni]/datos/loading.tsx` · `[dni]/ayuda/loading.tsx` | Skeletons de cada módulo (`Familia*Skeleton`, importados de `@/components/ui/skeleton`; no están en el barrel). Ayuda no tiene uno propio: reusa `FamiliaDatosSkeleton`, igual que Mis datos. |

### `src/app/api/`

No existe `api/v1/` todavía: no hay API para consumidores externos.

| Archivo | Qué hace |
|---|---|
| `auth/[...all]/route.ts` | Handler HTTP de Better-Auth (`GET`/`POST`). |
| `uploads/[...key]/route.ts` | Proxy autenticado de documentos (R2, o disco local en dev). Admins ven todo; una familia solo los documentos de sus alumnos; todo lo demás responde 404 para no revelar si la key existe. PDF e imágenes inline; el resto como attachment. `Cache-Control: private, no-store`. |
| `webhooks/google-form/route.ts` | Application Form (Google Form): crea el alumno pre-inscripto por webhook, crea o vincula la cuenta de familia y, si trae `codigoViaje`, lo asigna generando el tablero M6. Auth por header `x-webhook-secret` comparado en tiempo constante (secreto de 32+ caracteres). DNI repetido → 200 con `duplicado: true`. |
| `webhooks/resend/route.ts` | Tracking de los emails de outreach: verifica la firma Svix con tolerancia de timestamp (`domain/webhooks/svix.ts`) y actualiza el estado de la comunicación. |

### `src/app/` — páginas sueltas sin sesión (`baja/` y `offline/`)

| Archivo | Qué hace |
|---|---|
| `baja/page.tsx` | Baja de las comunicaciones de outreach por `?token=` (`darDeBajaPorToken`); `noindex`. |
| `offline/page.tsx` | Pantalla sin conexión que precachea el service worker. |

Las dos quedan fuera de `(public)` a propósito: heredarían nav, footer y analytics.

---

## `src/components/`

### `src/components/ui/` — design system STUDIO (se importa desde `@/components/ui`)

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. Ojo: los `Familia*Skeleton` no están exportados acá. |
| `button.tsx` | `Button` (variantes primary, secondary, ghost, critical, danger, danger-solid; tamaños) y `buttonClasses`, compartido con `LinkButton`. |
| `link-button.tsx` | `LinkButton`: un `<Link>` con look de botón, para navegar (no para acciones). |
| `field.tsx` [client] | `Field` (asocia label, ayuda y error al control), `Label`, `Input`, `Textarea`, `Select` (popover propio en portal, con `searchable` para listas largas), `Checkbox`, `HelpText`, `ErrorText`. Reemplaza al `<select>` nativo. |
| `date-input.tsx` [client] | `DateInput`: el `<input type="date">` nativo queda invisible como fuente de verdad (formato ISO, label, `fill()` de Playwright) y encima hay un input DD/MM/AAAA tipeable con calendario propio. Reemplaza al date nativo. |
| `popover-position.ts` · `popover-position.test.ts` | Geometría pura de los popovers de `Select` y `DateInput` (arriba o abajo, ancho, límites del viewport). |
| `badge.tsx` | `Badge` y los badges con mapeo fijo de color por estado: `StepBadge`, `TripBadge`, `MoraBadge`. No cambies el color de un estado en un solo lugar. |
| `confirm-dialog.tsx` · `confirm-dialog.test.ts` [client] | `ConfirmProvider` + `useConfirm()`: reemplaza `window.confirm`/`prompt` (con campo de texto opcional). `indiceFocoTrap` es la lógica testeada del foco. |
| `toast.tsx` [client] | `ToastProvider` + `useToast()`. |
| `data-table.tsx` · `data-table.test.ts` | `TableWrap`, `Table`, `THead`, `TBody`, `TR`, `TH`, `TD`, `CodeCell`, `DateCell` y `CLASES_MODO_CARD` (con `responsive`, la tabla se desarma en tarjetas debajo de 640px). La plata se formatea con `formatMonto`, no con una celda. |
| `empty-state.tsx` | `EmptyState` para "todavía no hay", "sin resultados" y la variante compacta de panel. Sin hooks: sirve en server y client. |
| `form-errors.tsx` [client] | `useErroresDeFormulario` (primer error por campo, foco y centrado en el primer campo inválido) y `AvisoErrores` (región viva para lectores de pantalla). |
| `page-header.tsx` | `PageHeader`: título con la fuente display, subtítulo y acciones. |
| `section-title.tsx` | `SectionTitle` (con `as` para h2, h3, h4, dt o div) y `sectionTitleClasses`. |
| `pagination.tsx` [client] | `Pagination`: "Mostrando a–b de N" y páginas, navega por `?page=` conservando los filtros. |
| `skeleton.tsx` | Skeletons por silueta: `Skeleton`, `PageHeaderSkeleton`, `FiltersSkeleton`, `ListPageSkeleton`, `PagosPageSkeleton`, `PanelSkeleton`, `FormPageSkeleton`, `ConfigSkeleton`, `FichaAlumnoSkeleton`, `ViajeDetalleSkeleton` y los `Familia*Skeleton`. **Es el loader oficial.** (Su comentario de cabecera todavía menciona al GlobeLoader como fallback: no se usa.) |
| `globe-loader.tsx` | `GlobeLoader` (iframe a `public/globe-loader.html`). Exportado pero **sin uso en la app** por decisión del 12/06/2026; su comentario dice "el loader oficial" y ya no es cierto. No lo uses para estados de carga. |
| `stat-card.tsx` | `StatCard` (con `href` la card entera linkea al listado filtrado) y `Alert` (niveles de aviso). |
| `trip-card.tsx` [client] | `TripCard`: viaje con barra de completitud o de avance hacia el mínimo de inscriptos. |
| `use-scroll-lock.ts` · `use-scroll-lock.test.ts` [client] | `useScrollLock(activo)`: bloquea el scroll del fondo con overlays, incluido iOS (fija el body y restaura el scroll); soporta overlays anidados. |

### `src/components/admin/`

| Archivo | Qué hace |
|---|---|
| `admin-shell.tsx` [client] | Shell del back-office: sidebar con la navegación real, drawer en mobile, topbar con breadcrumb, chip del usuario, y los providers de toast y confirm. |
| `breadcrumb-labels.ts` · `breadcrumb-labels.test.ts` | `buildBreadcrumb(pathname)`: labels por segmento, DNI con puntos, código de viaje tal cual y uuids omitidos. |
| `logout-button.tsx` [client] | Cierra la sesión con Better-Auth y va a `/login`. |

### `src/components/auth/`

| Archivo | Qué hace |
|---|---|
| `juk-brand-panel.tsx` [client] | Panel de marca de las pantallas de auth. Copy neutro por defecto; con `?portal=familias` le habla a la familia. Es client solo para leer la URL. |
| `google-icon.tsx` | El logo de Google inline, sin dependencias. Los hex van en `fill=` y nunca en `className`: son marca de un tercero, no se tokenizan, y la guarda de lint solo mira dentro de `className`. |

### `src/components/pwa/`

| Archivo | Qué hace |
|---|---|
| `sw-register.tsx` [client] | Registra `/sw.js` al cargar la página, solo en producción. |

---

## `src/lib/domain/` — lógica de negocio pura

Sin imports de `next`, `react` ni `app/`. Errores con clases nombradas. Los enums Zod replican a
mano los `pgEnum` de `lib/db/schema/` (no hay derivación automática): si cambiás uno, cambiá el otro.

### `src/lib/domain/`

| Archivo | Qué hace |
|---|---|
| `anti-abuso.ts` · `anti-abuso.test.ts` | Política de las superficies públicas: límites por IP (5 cada 10 min) y por email (3 por hora), evaluación de ventanas, normalización de IP y email, claves por formulario y dedup de 24 h del aviso al equipo. La persistencia está en `queries/rate-limit-formularios.ts`. |

### `src/lib/domain/alertas/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `reglas.ts` · `reglas.test.ts` | Reglas puras del panel de alertas del dashboard: Parental Consent vencido, pasaporte, mora (crítica pasados 7 días), pasos bloqueados (excluye C2 bloqueado por B1) y police checks vencidos. `calcularAlertas` las compone con las críticas primero. |
| `urgencias.ts` · `urgencias.test.ts` | "Alumnos con acción urgente": evalúa las mismas reglas por asignación, suma pasos vencidos, agrupa por alumno y ordena (viaje en menos de 30 días primero, después críticas). |

### `src/lib/domain/alumnos/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `schema.ts` · `schema.test.ts` | Enums de estado y condición fiscal, `alumnoCreateSchema`/`alumnoUpdateSchema` (facturación todo o nada, vacíos a null) y `alumnoFiltersSchema` (un filtro inválido se descarta solo; el Paso 0 no es filtrable). |
| `labels.ts` | Labels y tonos de badge de estado y condición fiscal. |
| `errors.ts` | `AlumnoNotFoundError`. |

### `src/lib/domain/asignaciones/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `validate-passport.ts` · `validate-passport.test.ts` | `pasaporteVigenteParaViaje` (UK: vigente hasta el fin del viaje; otros países: 6 meses después del fin) y `pasaporteEnAlertaConservadora` (alerta si vence dentro de los 6 meses posteriores al inicio). |
| `labels.ts` | Estados de la asignación con labels y tonos. |
| `errors.ts` · `errors.test.ts` | `AsignacionNotFoundError`, `ViajeNoInscribibleError`. |

### `src/lib/domain/colegios/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `schema.ts` · `schema.test.ts` | Enums (tipo, estado, país, alojamiento) y `colegioCreateSchema`/`colegioUpdateSchema`/`colegioFiltersSchema` (contactos obligatorios y opcionales, comisión 0-100, config documental). |
| `documentos.ts` · `documentos.test.ts` | Config documental por colegio: documentos del programa, requisitos, `CONFIG_DOCUMENTAL_DEFAULT`, `configDocumentalEfectiva` (defaults + overrides), `tipoEntradaPorPais` y cuáles documentos inicializan pasos. Replica el tipo `Pais` para evitar un import circular con `schema.ts`. |
| `labels.ts` | Labels de tipo, estado, país y alojamiento. |
| `errors.ts` | `ColegioNotFoundError`. |

### `src/lib/domain/configuracion/`

| Archivo | Qué hace |
|---|---|
| `index.ts` · `index.test.ts` | `mailSettingsSchema`, `MAIL_SETTINGS_DEFAULT` y `remitenteDe(settings, tipo)` (automáticos desde noreply, comunicaciones desde info, marketing aparte). La lógica está en `index.ts`, que la cobertura excluye por contrato. |
| `formulario.ts` · `formulario.test.ts` | El setting de la variante visual activa del formulario de inscripción, con el mismo molde que los mails: un valor corrupto o una variante desconocida caen al default y **nunca** rompen el formulario público. |
| `env.ts` · `env.test.ts` | Catálogo de variables de entorno: qué habilita cada una, qué pasa si falta, su nivel (`requerida`, `produccion`, `opcional`) y cuáles aflojarían producción. `esPlaceholder` detecta los moldes de `.env.example` (`re_xxxx`, `<generar…>`, `user:password@`) por forma, nunca por igualdad con el ejemplo. `evaluarEntorno` y `resumenPorServicio` los consumen `npm run check:env` y la card de `/configuracion`. |

### `src/lib/domain/inscripciones/`

| Archivo | Qué hace |
|---|---|
| `schema.ts` · `schema.test.ts` | La ficha del Application Form propio (los mismos campos que acepta el webhook del Google Form), con el DNI normalizado por `soloDigitos` en un `preprocess` y `acepta: z.literal(true)`. **No acepta `viajeId`, `alumnoId`, `comunicacionId` ni `estado`**: se derivan del token server-side. Además: los seis estados de una inscripción, `VARIANTES` a\|b\|c con `resolverVariante` (link > campaña > setting > 'a', tolerante a basura), `codigoInscripcion`/`parsearCodigoInscripcion` (INS-000123) y los filtros de la bandeja. |
| `niveles.ts` · `niveles.test.ts` | Qué dato puede salir del sistema y cuál no: `CAMPOS_NIVEL_1` (nombre, apellido, tutor, viaje) vs `CAMPOS_NIVEL_2` (DNI, pasaporte, nacimiento, salud, teléfonos). `soloNivel1` filtra por lista blanca y `enmascararDni` deja los últimos 4. El test es de **contrato**: rompe si alguien suma un campo al formulario sin clasificarlo. |
| `validacion-campo.ts` · `validacion-campo.test.ts` | Lo que el formulario público usa para avisar **mientras** se completa la ficha: `CAMPOS_EN_VIVO`, `validarCampoInscripcion` (el mensaje sale de `inscripcionSchema`, nunca de una segunda regla), `esCaracterImposible` (una letra en el DNI se marca en el acto) y `avisoDelCampo` (el pasaporte vencido avisa, no bloquea). Honeypot y consentimiento quedan afuera a propósito. **Es el molde para el resto de los formularios.** |
| `acciones.ts` · `acciones.test.ts` | Qué puede hacer el equipo con una ficha según su estado (`accionesDeInscripcion`, `permiteAccion`, `estaResuelta`, `tieneVinculoPendiente`). Vive en el dominio porque la server action —que no puede confiar en qué botón se apretó— y el panel del detalle —que no puede ofrecer un botón que la action va a rechazar— no pueden discrepar. La regla que importa: `requiere_revision` **con** alumno ya no se reprocesa (el alta corrió y volver a correrla caería en `duplicado` y borraría el motivo real); lo único que queda es confirmar la cuenta de familia. |
| `invitacion.ts` · `invitacion.test.ts` | La vida de una invitación: `estadoInvitacion` (respondida > revocada > vencida > vigente), `puedeCargar`, vigencia de 90 días, y el claim en dos fases del envío por lote (reserva de 5 minutos, tandas de 10, tope de 200, pausa entre envíos). Ninguna fecha nace adentro. |
| `errors.ts` · `labels.ts` | Errores nombrados y las etiquetas en español de estados y variantes. |

### `src/lib/domain/privacidad/`

| Archivo | Qué hace |
|---|---|
| `politica.ts` · `politica.test.ts` | Fuente única del texto legal: `POLITICA_ACTUAL` (versión `AAAA-MM-DD` + secciones), `HISTORIAL_POLITICAS`, `buscarPolitica`, `VERSION_CONSENTIMIENTO` y `TEXTO_CONSENTIMIENTO`. El test obliga a subir la versión si alguien edita el copy: un consentimiento viejo tiene que poder seguir leyendo el texto que aceptó. |
| `retencion.ts` · `retencion.test.ts` | Plazos (`RETENCION`: 90 días una inscripción procesada, 730 sin procesar, 90 una invitación vencida sin usar) y la decisión pura `debePurgar` / `fechaDeCorte`. Ninguna fecha nace adentro: `ahora` entra por parámetro. El plazo se cumple entero (el día 90 se conserva, el 91 se purga). También decide QUÉ se vacía: `datosPurgadosDeInscripcion()` (con `TEXTO_PURGADO` y `FECHA_PURGADA`, porque dos columnas son NOT NULL) deja afuera el talón —número, estado, variante, fechas, campaña, consentimiento, motivo y `alumno_id`— para que las métricas no cambien hacia atrás. Lo ejecuta `jobs/purgar-inscripciones`. |

### `src/lib/domain/cuotas/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `schema.ts` · `schema.test.ts` | Multi-moneda USD/GBP/ARS con default USD (CRIT-05 ⭐), `formatMonto`, `planCuotasSchema`, `generarVencimientos` (sin desbordar fin de mes), `esFechaPagoFutura`, `registrarPagoSchema`, `confirmarPagoPresencialSchema` y el máximo de observaciones. |
| `derivaciones.ts` · `derivaciones.test.ts` | `canalCuota` (la última cuota es presencial para independiente e instituto), `estaVencida`, `diasDeMora`, totales y saldo, `proximaCuotaPendiente`, `estadoPasoB1` y `b2Completado`. |
| `resumen.ts` · `resumen.test.ts` | `resumenPlan` (pagadas, abonado, saldo, mora máxima), `ordenarResumenes` y `estadoEfectivoCuota` (vencida se deriva por fecha). |
| `errors.ts` · `errors.test.ts` | `CuotaNotFoundError`, `PlanConPagosError`. |

### `src/lib/domain/documentos/`

| Archivo | Qué hace |
|---|---|
| `index.ts` · `documentos.test.ts` | `MAX_DOCUMENTO_BYTES` (10 MB), allowlist de MIME, `detectarMime` por magic bytes, `validarDocumento` (el MIME declarado tiene que coincidir con el contenido), `mimePorExtension`, `keyDocumento` (key sanitizada por entidad) y `DocumentoInvalidoError`. La lógica está en `index.ts`. |

### `src/lib/domain/familias/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `vinculo.ts` · `vinculo.test.ts` | `evaluarVinculoFamilia`: la cuenta de familia es el email del tutor 1; vincular un alumno a una cuenta que ya tiene alumnos de otro apellido pide confirmación (un typo alcanzaría para mostrarle el alumno a otra familia), y un email del equipo nunca se toca. |

### `src/lib/domain/group-leaders/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `schema.ts` · `schema.test.ts` | Estados del police check y `groupLeaderCreateSchema`/`groupLeaderUpdateSchema`/`groupLeaderFiltersSchema`. |
| `labels.ts` | `POLICE_CHECK_ESTADO_LABELS` y tonos. Hay otra copia de los mismos labels en `pasos-viaje/police.ts`: mantenelas iguales. |
| `errors.ts` | `GroupLeaderNotFoundError`. |

### `src/lib/domain/leads/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `schema.ts` · `schema.test.ts` | Opciones del formulario de consulta (para quién, modalidad, cuándo, destino), estados de la consulta, `leadSchema` (institución obligatoria si es para un colegio, consentimiento, honeypot), `newsletterSchema` y `cambiarEstadoConsultaSchema`. Los pgEnum de `schema/leads.ts` salen de acá. |
| `labels.ts` | Labels value → texto para el back-office. |

### `src/lib/domain/pasos/` — tablero M6 del alumno

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `codigos.ts` · `codigos.test.ts` | Códigos del tablero (`paso_0`, a1…d2), grupos, labels del back-office, numeración vieja y `esPasoEditable`. |
| `estados.ts` · `estados.test.ts` | Estados del paso, `puedeTransicionarPasoAlumno` (Paso 0 fijo, `vencido` solo en A1, B1/B2 derivados), `transicionRequiereNota` (bloquear), `admiteFechaLimite` (solo A1), `cuentaParaCompletitud` (N/A y opcionales no cuentan). |
| `sub-estados.ts` · `sub-estados.test.ts` | Sub-estados de C1 (ETA) y A3 (Parental Consent) y cómo derivan el estado del paso; etapas que reporta la familia, tipos de problema del ETA y link oficial. |
| `inicializacion.ts` · `inicializacion.test.ts` | `pasosIniciales`: arma los 11 pasos al asignar (config documental, edad al inicio para A3 y D1, B2 según el representante, C1 según el tipo de entrada, D2 solo en grupales, C2 nace bloqueado), `edadAlInicioDelViaje`, `versionParentalConsent`. |
| `trigger.ts` · `trigger.test.ts` | Reglas del trigger de asignación: fecha límite de A1 (30 días antes del viaje) y auto-confirmación del grupal al quinto inscripto. |
| `ayuda-familia.ts` · `ayuda-familia.test.ts` | Copy para familias: nombre de cada trámite en criollo, qué hay que hacer y quién lo hace; agrupación por etapa y código visible. |

### `src/lib/domain/pasos-viaje/` — tablero M7 del viaje

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `estados.ts` · `estados.test.ts` | Tipos y estados de los 5 pasos, máquina de transiciones, dependencia Transfers → Pasajes (`dependenciaPendiente`, `puedeAvanzarConDependencias`, `transicionesPasoConDependencias`) y pasos derivados (Police Checks). |
| `metadata.ts` · `metadata.test.ts` · `cobertura.test.ts` | Schemas Zod de metadata por paso (pasajes con sub-estados por tipo de viaje, excursiones, transfers, tarjetas), normalización de valores viejos al guardar (sin migración de datos), `coberturaPorAlumno` y `PASOS_POR_ALUMNO`. `cobertura.test.ts` prueba `coberturaPorAlumno`. |
| `police.ts` · `police.test.ts` | `derivarEstadoPoliceChecks` a partir de los group leaders (vencido bloquea, todos aprobados completa). Copia de `POLICE_CHECK_ESTADO_LABELS` (ver `group-leaders/labels.ts`). |
| `labels.ts` | Labels de pasos, estados, sub-estados de pasajes, estados de excursión y número de paso. |
| `errors.ts` | `PasoViajeNotFoundError`, `TransicionPasoInvalidaError`, `DependenciaPasoError`. |

### `src/lib/domain/prospectos/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `pipeline.ts` · `pipeline.test.ts` | Etapas del pipeline en orden (define las columnas del kanban), terminales (ganado, perdido) y transiciones. |
| `schema.ts` · `schema.test.ts` | `prospectoCreateSchema`/`prospectoUpdateSchema`, filtros, `moverEstadoSchema`, `enviarOutreachSchema`, `notaSchema`. Tiene su propio `paisEnum`, que tiene que coincidir con el de `colegios/schema.ts`. |
| `csv.ts` · `csv.test.ts` | Parser CSV sin dependencias: detecta coma, punto y coma o tab, comillas escapadas, headers flexibles (sin importar acentos ni mayúsculas) y errores por fila. |
| `labels.ts` | Labels y tonos de etapas y comunicaciones. |
| `errors.ts` | `ProspectoNotFoundError`. |

### `src/lib/domain/recordatorios/`

| Archivo | Qué hace |
|---|---|
| `index.ts` · `recordatorios.test.ts` | Recordatorios automáticos: A1 a 14, 7, 3 y 1 días de la fecha límite (y `a1Vencido`, que no bloquea); D1 a 90, 60 y 30 días del inicio del viaje. La lógica está en `index.ts`. |

### `src/lib/domain/salidas/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `proxima-salida.ts` · `proxima-salida.test.ts` | Calendario mantenido a mano de salidas grupales que anuncia el sitio y `proximaSalida` (null cuando se agota: el banner desaparece). No sale de la tabla `viajes` a propósito: `viajes` no tiene marca de "publicado". |

### `src/lib/domain/usuarios/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `schema.ts` · `schema.test.ts` | Roles gestionables desde el back-office (`admin_juk`, `super_admin`) y `usuarioCreateSchema`. |
| `labels.ts` | Labels de rol. |
| `errors.ts` | `UsuarioNotFoundError`. |

### `src/lib/domain/viajes/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Barrel. |
| `schema.ts` · `schema.test.ts` | Enums (estado, tipo, origen), `viajeCreateSchema`/`viajeUpdateSchema` (código `UK-YYYY-MMM-CITY`, fin ≥ inicio, cliente obligatorio si el origen es colegio cliente, grupal con 1 a 20 GLs, individual con 0), `viajeFiltersSchema`, `capacidadMaxima` (GL × 12, o 1 si es individual), `porcentaje` y `ocupacionViaje`. |
| `transiciones.ts` · `transiciones.test.ts` | Máquina de estados del viaje (finalizado y cancelado son terminales), `opcionesEstado` y `transicionAutomaticaPorFecha` (confirmado → en curso el día de inicio; en curso → finalizado después del fin). |
| `flujo-pago.ts` · `flujo-pago.test.ts` | Reglas derivadas del origen y del tipo: flujo de pago, último pago presencial (B2), comisión de agencia, fee de representante, credenciales, estado inicial, psicofísico y police checks solo en grupales. Calculado, nunca persistido. |
| `labels.ts` | Labels de estado, tipo y origen. |
| `errors.ts` | `ViajeNotFoundError`. |

### `src/lib/domain/webhooks/`

| Archivo | Qué hace |
|---|---|
| `secreto.ts` · `secreto.test.ts` | Secreto compartido del webhook de Google Form: `secretoUsable` (32+ caracteres) y `coincideSecreto` en tiempo constante. |
| `svix.ts` · `svix.test.ts` | `verificarFirma` de Svix (webhooks de Resend) sin la dependencia `svix`: HMAC-SHA256 sobre el body crudo, tolerancia de ±5 min contra replay, y rechazo de secret vacío o no base64 (con clave vacía cualquiera firmaría). |

---

## `src/lib/db/` — datos (Drizzle + Neon)

### `src/lib/db/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Cliente Drizzle sobre `neon-http` con `casing: snake_case`. Tira al importarse si falta `DATABASE_URL`. |
| `seed.ts` | `npm run db:seed`: crea el `super_admin` inicial con Better-Auth e imprime una contraseña temporal por consola. Idempotente. El email está fijo al tope del archivo (`SEED_EMAIL`), con los demás miembros del equipo comentados. |
| `seed-demo.ts` | `npm run db:seed:demo`: cuentas de test (`test.superadmin@…`, `test.admin@…`, con `SEED_TEST_PASSWORD`, re-fija contraseña, rol y estado si ya existen), dos cuentas de familia con su alumno cada una, y un dataset `[DEMO]` que cubre todas las ramas (lo borra y lo re-crea). Los tableros se generan con el mismo dominio que usa la app. |

### `src/lib/db/schema/`

Cada cambio acá necesita su migración (`/juk-migracion`).

| Archivo | Qué hace |
|---|---|
| `index.ts` | Re-exporta todos los schemas para el cliente. |
| `users.ts` | `users` (rol `admin_juk`, `super_admin`, `representante` o `familia`, `isActive`), `sessions`, `accounts`, `verifications` y `rate_limits` (la usa el rate limit de Better-Auth). |
| `colegios.ts` | `colegios` (destino o cliente, contactos JSON, tipo de entrada) y `colegio_documento_config` (requisito por documento). Define los enums `pais` y `tipo_alojamiento` que reusan viajes y prospectos. |
| `viajes.ts` | `viajes`: código, tipo, estado, origen (representante), colegios, fechas, capacidad, comisión y fee. |
| `alumnos.ts` | `alumnos`: datos, pasaporte, tutores, facturación JSON, estado, canal de alta, cuenta de familia vinculada y fecha del último envío de acceso. |
| `grupos-leaders.ts` | `group_leaders` con el police check. |
| `asignaciones.ts` | `asignaciones` alumno ↔ viaje (unique por par): la unidad de la que cuelgan pasos y cuotas. |
| `pasos-alumno.ts` | `pasos_alumno`: un paso por código por asignación, con estado, fecha límite y metadata JSON. |
| `pasos-viaje.ts` | `pasos_viaje` (5 por viaje, metadata JSON) y `group_leaders_viaje` (N:M con principal). |
| `cuotas.ts` | `cuotas`: plan por asignación con moneda (USD, GBP o ARS; default USD, CRIT-05 ⭐), canal, marca de última cuota, fecha de pago efectiva y quién registró. |
| `documentos.ts` | `documentos`: archivos subidos, polimórficos por `entidad_tipo` + `entidad_id` **sin FK** (el teardown de los E2E borra los huérfanos). |
| `alertas.ts` | `alertas` materializadas con tipo y nivel. Hoy el panel calcula las alertas en vivo (`domain/alertas`); esta tabla no se escribe. |
| `auditoria.ts` | `auditoria`: acción, entidad, usuario y metadata de cada cambio. |
| `notificaciones.ts` | `notificaciones_enviadas`: dedup de recordatorios por (tipo, entidad, clave) y resultado del envío. |
| `configuracion.ts` | `configuracion`: key-value JSON (por ejemplo, la clave `mails`); una clave ausente usa los defaults del código. |
| `leads.ts` | `suscriptores`, `consultas` (enums tomados de `domain/leads`) y `form_rate_limits` (ventanas del anti-abuso). Su comentario apunta a `src/lib/domain/leads.ts`; hoy es la carpeta `domain/leads/`. |
| `prospectos.ts` | `prospectos` (pipeline, emails y teléfonos, token de baja, colegio convertido) y `prospecto_comunicaciones` (notas y outreach con el id de Resend, más las 7 columnas de **invitación** al formulario: token hasheado con su unique, viaje, variante, vencimiento, revocación, lote y la reserva del envío por tandas). Una invitación es una comunicación más: así hereda la baja del prospecto y el tracking de Resend, sin tabla de campañas. |
| `enums-inscripciones.ts` | Los `pgEnum` `inscripcion_estado` y `variante_formulario`, en su propio módulo porque los usan **dos tablas que se referencian entre sí**: `inscripciones` apunta a `prospecto_comunicaciones` y esa tabla usa `variante_formulario` en una columna. Declararlos dentro de `inscripciones.ts` cerraba un ciclo que explotaba en runtime (una FK es un callback y se evalúa tarde, pero `varianteFormulario(...)` corre al evaluar el módulo). Los valores salen del dominio y los nombres SQL no cambian: mover la declaración no tocó la base ni pidió migración. |
| `inscripciones.ts` | Tabla de **aterrizaje** del formulario propio: la ficha se persiste siempre acá antes de tocar `alumnos`, para que una carga anónima no cree ni se cuelgue de una cuenta de familia sin que un humano lo mire. Trae los enums `inscripcion_estado` y `variante_formulario` (derivados del dominio), el sello del consentimiento (versión, hash del texto y fecha; **sin IP**, a propósito), las columnas de borrado y purga, y los dos primeros índices **parciales** del repo: una respuesta viva por invitación y una por DNI en curso. Las fechas van en modo `string` (ISO), no `Date`: convertirlas en el borde corre un cumpleaños un día. |

### `src/lib/db/queries/` — único lugar con Drizzle

| Archivo | Qué hace |
|---|---|
| `errors.ts` · `errors.test.ts` | `FilaNoDevueltaError`, `unicaFila` (primera fila de un `.returning()`) y `esViolacionUnique` (Postgres 23505, también envuelto por Drizzle). |
| `alertas.ts` | `getAlertas` (carga las filas y delega en `calcularAlertas`; opcionalmente por viaje), `countAlumnosEnMora`, `viajeTieneAlertas`. |
| `alumnos.ts` · `alumnos.integration.test.ts` | `listAlumnos` paginado (con viaje más próximo y marca de alerta), `getAlumnoById`, `getAlumnoByDni`, `createAlumno`, `updateAlumno`, `darDeBajaAlumno`, `reactivarAlumno`. La integración cubre el filtro por canal de alta: "los que entraron por el formulario" tiene que salir de la condición SQL y no de filtrar la página en memoria. |
| `asignaciones.ts` | Roster del viaje, `countAsignacionesActivas`, `getAsignacionDePar`, `cancelarAsignacion`, `alumnosElegibles`, `viajesAsignables`, `listAsignacionesByAlumno`, `alumnoIdDeAsignacion` (base de los chequeos de ownership) y `origenDeAsignacion`. |
| `asignar-alumno.ts` · `asignar-alumno.integration.test.ts` | Trigger de asignación: `asignarConTablero` crea o reactiva la asignación, genera las filas del M6 con `pasosIniciales` y auto-confirma el grupal decidiendo con el estado **releído** de la base. `filasTableroInicial` arma las filas. |
| `auditoria.ts` | `registrarAuditoria`. Las actions no la llaman directo (usan `safeAudit`); los jobs sí, para no arrastrar Sentry a Trigger.dev. |
| `colegios.ts` | `listColegios`, `listColegiosPaginado`, `getColegioById`, `createColegio`, `updateColegio`, `setColegioEstado`, `getConfigDocumental` (defaults si no hay filas), `upsertConfigDocumental`. |
| `configuracion.ts` | `getMailSettings` (defaults del dominio, pisados por variables de entorno y después por la base) y `setMailSettings`. |
| `cuotas.ts` · `cuotas.integration.test.ts` | `listCuotasByAsignacion(es)`, `getCuotaById`, `advertenciaPagoFueraDeOrden`, `crearPlanCuotas` (con pagos → `PlanConPagosError`), `registrarPagoCuota` y `sincronizarPasosPago` (B1 sigue al plan, C2 se destraba, B2 se completa con la última presencial). Que haya una sola "última cuota" por asignación lo garantiza esta query, no la base. |
| `dashboard.ts` | `getDashboardStats`, `getProximosViajes`, `getProximosViajesConOcupacion`, `getViajesProximoAnio`, `getAlumnosConAccionUrgente`. |
| `documentos.ts` | `insertDocumento`: registra un archivo ya subido por `lib/storage`. |
| `documentos-acceso.ts` | `getDocumentoAccesoByKey` (nombre, MIME y familia dueña) y `familiaPuedeVerKey`, para `/api/uploads`. |
| `familias.ts` | Cuentas del Portal de Familias: `asegurarCuentaFamilia` (identidad = email del tutor 1, una cuenta por grupo familiar), `prepararEnvioAcceso`, `marcarAccesoEnviado`, `desactivarCuentaFamiliaSiCorresponde`, `getAlumnosDeFamilia`, `listViajesDeFamilia`, `listRepresentantesDeFamilia`. |
| `group-leaders.ts` | `listGroupLeaders` paginado, `getGroupLeaderById`, `createGroupLeader`, `updateGroupLeader`. |
| `group-leaders-viaje.ts` | `groupLeadersElegibles` (NOT EXISTS en un solo viaje a la base), `countGroupLeadersDeViaje`, `asignarGroupLeaderAViaje`, `quitarGroupLeaderDeViaje`, `marcarPrincipal`. |
| `leads.ts` | `suscribir` (idempotente), `crearConsulta`, `fechaConsultaPreviaSimilar` (para el dedup del aviso), `getConsultaById`, `listConsultas`, `updateEstadoConsulta`. |
| `pagos.ts` · `pagos.integration.test.ts` | Vistas consolidadas: `condicionesEstadoEfectivo` (vencida = venció antes de hoy), `listCuotasGlobal` con ORDER BY total (sin desempate se repetían o salteaban filas entre páginas), `resumenPagosGlobal` por moneda, `viajesConCuotas`, `resumenPagosPorViaje`. |
| `pasos-alumno.ts` | `listPasosByAsignacion(es)` (una sola query para varias asignaciones: con neon-http cada query es un HTTPS), `getPasoAlumnoById`, `updatePasoAlumno`, `crearPasosParaAsignacion`. |
| `pasos-viaje.ts` | `listOrInitPasosViaje` (crea en pendiente los que falten), `updateEstadoPasoViaje`, `updateMetadataPasoViaje`, `listGroupLeadersDeViaje`. |
| `invitaciones.ts` · `invitaciones.integration.test.ts` | Las invitaciones al formulario, que viven en la bitácora del CRM: armar un lote, el **claim en dos pasos** que lo hace reanudable (elegir candidatas → tomarlas exigiendo `estado='pendiente'`, con reintento acotado para que dos pestañas se repartan el lote), sellar enviada/fallida, reciclar reservas vencidas, revocar y el resumen del lote agregado en SQL. ⚠️ El claim NO usa un subselect con `for update skip locked`: una subconsulta con cláusula de bloqueo se evalúa **por fila**, y la tanda se llevaba el lote entero. |
| `alta-inscripcion.ts` · `alta-inscripcion.integration.test.ts` | Orquesta el alta del alumno desde una ficha: idempotencia por DNI **antes de tocar nada**, `createAlumno` con canal `formulario_web`, el vínculo de familia y la asignación al viaje con su cupo. Devuelve un resultado nombrado con la rama del vínculo y **no decide política**: eso es de `actions/alta-inscripcion.ts`. Distingue `crear` de `vincular` leyendo el usuario por email antes de escribir, porque `asegurarCuentaFamilia` devuelve lo mismo en los dos casos. |
| `resolucion-inscripcion.ts` · `anular-inscripcion.ts` | Escriben el desenlace en la ficha: estado, motivo y alumno vinculado; y la anulación, que libera la invitación para que esa familia pueda volver a cargar. |
| `inscripciones-publicas.ts` · `inscripciones-publicas.integration.test.ts` | Lo que toca el formulario público: `getInvitacionByTokenHash` (**SELECT puro**, verificado en el test comparando la fila entera antes y después: la página se abre con un GET y un prefetch de Outlook lo dispararía), `crearInscripcion` (traduce las colisiones de los índices únicos a un motivo nombrado, nunca una excepción cruda) y `marcarInvitacionRespondida`. |
| `inscripciones.ts` · `inscripciones.integration.test.ts` | Lo que toca el back-office: `listInscripciones` con paginación en SQL y orden total, `getInscripcionByNumero` (el slug `INS-000123`) y `resumenInscripciones`, que agrega por estado y por variante sobre el universo filtrado, no sobre la página. Las fichas con datos borrados quedan fuera de los tres. |
| `prospectos.ts` | `listProspectos`, `listProspectosKanban`, `getProspectoById`, `createProspecto`, `crearProspectosMasivo`, `updateProspecto`, `moverProspecto`, `getComunicaciones`, `registrarComunicacion`, `convertirAColegio`, `darDeBajaOutreach`. |
| `prospecto-tracking.ts` | `actualizarEstadoComunicacion`, `getProspectoByUnsubToken`, `darDeBajaPorToken`. Separado de `prospectos.ts` porque lo usan endpoints públicos (webhook de Resend y `/baja`), sin guards de admin. |
| `rate-limit-formularios.ts` | `incrementarYVerificar`: registra el intento y decide en un solo upsert atómico (leer y después escribir dejaría pasar requests simultáneos). `purgarVentanasVencidas` existe pero hoy no la llama nadie. |
| `recordatorios.ts` | `listPasosParaRecordatorio`, `marcarPasoVencido`, `registrarNotificacionEnviada` (el insert con conflicto ignorado es el candado de dedup), `setResultadoNotificacion`. |
| `retencion.ts` | Las cuatro consultas de la purga (MIN-16): candidatas fuera de plazo por lote (`listInscripcionesPurgables`, `listInvitacionesPurgables`) y las dos escrituras que vacían los datos personales de la ficha y borran el hash del token de la invitación. El job no importa `db`: la decisión de QUÉ purgar es del dominio y el acceso a datos vive acá. El candado de idempotencia está en el WHERE (`datos_purgados_el is null`, `token_hash is not null`), no en la memoria del job, y lo que se cuenta es el RETURNING. La fecha de referencia de una ficha es `created_at` para las dos clases: la tabla no guarda un instante de procesamiento. |
| `usuarios.ts` | `listUsuarios` (solo roles del equipo), `listEmailsAdmins`, `getUsuarioById`, `finalizarAltaUsuario`, `setUsuarioRole`, `setUsuarioActivo`. |
| `viajes.ts` | `listViajes` (con inscriptos), `opcionesFiltroViajes`, `listViajesParaFiltro`, `completitudPorViaje`, `listViajesPorEstado`, `getViajeById`, `getViajeByCodigo`, `createViaje`, `updateViaje`, `setViajeEstado`. |

---

## Resto de `src/lib/`

### `src/lib/actions/` — piezas compartidas de las server actions

| Archivo | Qué hace |
|---|---|
| `result.ts` | Contrato único `ActionResult<T>`: `{ ok: true, data }` o `{ ok: false, error, fieldErrors?, requiereConfirmacion? }`. |
| `safe-audit.ts` · `safe-audit.test.ts` | `safeAudit`: auditoría best-effort (si falla, va a Sentry y no rompe la operación). Vive acá y no en `queries/auditoria.ts` para que los jobs no importen `@sentry/nextjs`. |
| `alta-inscripcion.ts` · `alta-inscripcion.test.ts` | **La compuerta** (ADR-018): la política única del alta, compartida por el formulario público, la bandeja y el webhook legacy. El alta corre por una *capacidad* (token de invitación válido o persona con sesión), nunca por el solo hecho de que la ficha exista; y dentro de eso, la rama del vínculo decide qué se automatiza. No lleva `"use server"` a propósito: exponerla como endpoint sería el agujero que cierra. |
| `anti-abuso-request.ts` · `anti-abuso-request.test.ts` | `ipDelRequest` y `dentroDelLimite` compartidos por los formularios públicos (antes vivían locales en `(public)/leads/actions.ts`). Cuentan por IP, por email y —si la carga llegó con un link— por token. **Falla abierto** a propósito: un problema con la tabla de rate limit no puede costar un lead; se reporta a Sentry y se deja pasar. |
| `asignaciones.ts` · `asignaciones.test.ts` [action] | `asignarAlumnoAction` y `desasignarAlumnoAction`, compartidas por el detalle del viaje y la ficha del alumno: validación de pasaporte y cupo (advertencias confirmables), estado del viaje, alumno de baja, unique del par, auditoría de la auto-confirmación y revalidación de ambas pantallas. |
| `__tests__/mocks.ts` | Mocks compartidos de los tests de actions (auth con la regla real de roles, `next/cache`, `next/navigation`, Sentry, auditoría). `vi.mock` se declara en cada test con una factory que importa este módulo. |

### `src/lib/auth/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Config de Better-Auth: email y contraseña, sin registro público (`disabledPaths` + hook `before`), rol default `familia` (el de menor privilegio), sesión de 8 h sin cookie cache (desactivar o cambiar rol aplica en el request siguiente), reset de 24 h, mail de bienvenida o de reset según el `alta=` del callback, aviso de contraseña cambiada, rechazo con 403 de cuentas desactivadas en `databaseHooks.session.create.before` (corre después de verificar la contraseña: no sirve para sondear emails), rate limit en base (login: 5 cada 15 min en producción, 30 en dev), cookies `juk` seguras en producción. Su comentario de cabecera todavía dice "temp password emailed": hoy se manda un link. Si están las dos variables de Google, declara además el provider social con `disableSignUp: true` y `accountLinking` sin `trustedProviders` (ADR-019). |
| `google-oauth.ts` · `google-oauth.test.ts` | Módulo puro del botón de Google: `googleOAuthConfig` (las dos credenciales o `null`), `googleOAuthHabilitado` y `mensajeErrorOAuth`, el copy del `?error=` del callback. Un código desconocido cae al mensaje genérico; nunca devuelve `null` con un código presente. |
| `helpers.ts` · `helpers.test.ts` | `getSession` (memoizada por request), `requireSession` (cuenta inactiva → cierra la sesión y `/login?inactivo=1`), `requireRole` (rol equivocado → al home de su rol), `requireFamilia`, `requireAdminJuk`. |
| `client.ts` | `authClient` para el navegador con el origin actual (el dev puede correr en 3000 o 3001). |
| `return-to.ts` · `return-to.test.ts` | `sanitizeReturnTo`: solo acepta paths relativos dentro del portal; cualquier otro destino va a `/dashboard` (evita redirects de phishing después del login). |
| `sign-up-policy.ts` · `sign-up-policy.test.ts` | `debeBloquearAlta`: el sign-up solo se atiende server-side (`auth.api.signUpEmail` no trae request); por HTTP responde 404. |

### `src/lib/email/`

| Archivo | Qué hace |
|---|---|
| `index.ts` · `index.test.ts` | `sendEmail`: resuelve el remitente por tipo desde la configuración y envía con Resend. Dry-run con `EMAIL_DRY_RUN=1`, o fuera de producción sin `RESEND_API_KEY` (registra en `emailsDryRun()`); en producción sin key lanza `EmailConfigError`. `EmailEnvioError` si Resend rechaza. Re-exporta las dos clases de `errors.ts`. |
| `errors.ts` | `EmailConfigError` y `EmailEnvioError`, sin dependencias. Están aparte porque `index.ts` importa la base al cargarse: traerlas desde ahí arrastraba una conexión a Postgres a cualquier módulo que solo quisiera reconocer un error. |
| `imagenes.ts` · `imagenes.test.ts` | Qué foto, qué bandera y qué ícono lleva un mail, y la URL absoluta con la que se piden. `fotoDelViaje` elige por el sufijo del código del viaje (y si no, por el nombre, por palabra entera); si no reconoce la ciudad va la foto de un grupo, nunca una de Londres, y su alt no nombra ciudad. `banderaDelViaje` da a cada bandera el ancho de su proporción real con alto fijo. El test verifica que cada archivo referenciado exista en `public/email/`. |
| `__tests__/html-mail.ts` | Helper de los tests de plantillas: renderiza un mail a HTML para poder asertar sobre él (peso bajo el techo de Gmail, ausencia de DNI y pasaporte, imágenes con URL absoluta). |
| `explicar-fallo.ts` · `explicar-fallo.test.ts` | `explicarFalloDeEnvio`: el motivo **real** de un envío fallido (la variable que falta, o el texto de Resend tal cual) para mostrárselo a quien administra, en vez de la lista de sospechosos que había antes. Lo usa el envío de prueba de `/configuracion`. No confundir con `motivoDeEnvioFallido` de `domain/inscripciones/invitacion.ts`, que lee el error guardado en la bitácora de un prospecto. |
| `preview.tsx` | `construirTemplatePrueba`: templates con datos de ejemplo para el envío de prueba y la preview de `/configuracion`. |
| `send-welcome.tsx` | Invitación con el link de creación de contraseña (nunca una contraseña) para equipo o familia; `loginUrlDe`. Lo llama el hook `sendResetPassword` de `lib/auth`. |
| `send-reset-link.tsx` | Mail de restablecer contraseña. |
| `send-password-changed.tsx` | Aviso de contraseña cambiada con fecha en hora argentina. |
| `send-recordatorio.tsx` | Recordatorio automático a la familia (A1 o D1). |
| `send-consulta-nueva.tsx` | Aviso de consulta nueva a todos los admins activos; sin admins cae a `LEADS_NOTIFY_TO` o al reply-to. |
| `send-reporte-dato.tsx` · `send-reporte-dato.test.ts` | Aviso al equipo cuando una familia reporta un dato incorrecto, con link a la edición del alumno por DNI. |
| `send-outreach.tsx` | Outreach a colegios desde el remitente de marketing, con headers `List-Unsubscribe` one-click; devuelve el id de Resend. |
| `send-inscripcion-recibida.tsx` · `send-inscripcion-recibida.test.ts` | Acuse a quien completó el formulario (tipo `comunicacion`, invita a responder). **No lleva ni un campo de Nivel 2**: el test falla si el HTML contiene el DNI o el pasaporte, porque un acuse queda en un buzón ajeno. Sin email del tutor no manda nada; la ficha ya quedó guardada igual. |
| `send-inscripcion-nueva.tsx` · `send-inscripcion-nueva.test.ts` | Aviso al equipo con el link a la ficha en el back-office y el motivo si quedó para revisión. Misma cadena de destinatarios que el resto: admins activos → `LEADS_NOTIFY_TO` → reply-to. Responde al tutor, así que el equipo le contesta sin abrir el portal. |
| `send-invitacion-inscripcion.tsx` · `send-invitacion-inscripcion.test.ts` | El mail de la invitación: el **único lugar donde el token existe en claro** (la base guarda solo el hash). Sale como `comunicacion` desde info@ y no como marketing, por dos razones: el remitente de marketing todavía no tiene DNS y este mail no es contacto en frío, es el trámite que la familia espera. Igual lleva `List-Unsubscribe` siempre —es lo que hace que Gmail ofrezca su botón de baja en vez de "marcar como spam"—, y `List-Unsubscribe-Post` solo cuando hay una URL con token: sobre el `mailto:` de respaldo sería mentira. `urlInscripcion` arma el link con `URLSearchParams` (`t` y `v`, los que lee `/inscripcion`) y lee el entorno en cada llamada, no al importar el módulo. Devuelve el id de Resend para que el lote selle la fila. |
| `__tests__/inscripcion-fixture.ts` | Una fila de `inscripciones` con **todos** los campos sensibles cargados con un valor distinguible, más `valoresNivel2De`, que deriva la lista de valores prohibidos del catálogo `CAMPOS_NIVEL_2` y no de una lista escrita a mano: un campo sensible nuevo entra solo al assert. Compartido por los tres senders del formulario para que el catálogo sea uno solo. |
| `templates/_layout.tsx` | `EmailLayout` y piezas (`EmailHeading`, `EmailParagraph`, `EmailButton`, `EmailCallout`, `EmailMonoCode`). Lo usan los mails internos y los de trámite; los dos que recibe la familia en el Application Form usan `_marca.tsx`. |
| `templates/_marca.tsx` | El marco de los mails que ve la familia (la invitación y el acuse): cabecera con logo y foto del viaje, tarjeta del viaje con bandera, botón "a prueba de Outlook" (el fondo en la celda), filas con ícono, pasos y pie con el motivo del mail y la baja. Tablas de 600 px, estilos inline y la paleta STUDIO resuelta a HEX; dos tonos propios de texto (`accentTexto`, `inkSubtle`) porque los del sistema no llegaban a 4,5:1 a 12 px. Está aparte de `_layout.tsx` para no mover de golpe las ocho plantillas internas. |
| `templates/welcome-email.tsx` | Invitación al portal. |
| `templates/reset-password-email.tsx` | Restablecer contraseña (link de 24 h, un solo uso). |
| `templates/password-changed-email.tsx` | Contraseña cambiada (también sirve de alerta de seguridad). |
| `templates/recordatorio-email.tsx` | Recordatorio de trámite o de hito del viaje. |
| `templates/viaje-cancelado-email.tsx` | Cancelación del viaje a la familia. |
| `templates/consulta-nueva-email.tsx` | Aviso interno de lead. |
| `templates/reporte-dato-email.tsx` | Aviso interno de dato incorrecto. |
| `templates/outreach-colegio.tsx` | Contacto en frío a un colegio, con link de baja obligatorio. |
| `templates/inscripcion-recibida.tsx` | Acuse de la ficha a la familia. **Contrato de privacidad**: no tiene props para DNI, pasaporte, nacimiento, teléfonos ni salud, así que no pueden filtrarse aunque el llamador tenga la ficha entera a mano. Para reconocer la ficha alcanza el código público. |
| `templates/inscripcion-nueva-equipo.tsx` | Aviso interno de ficha nueva, también solo con props de Nivel 1: el aviso **no es la ficha**, es el empujón para abrirla en el portal, donde hay sesión y permisos. Cambia el encabezado y la previa cuando quedó para revisar, y muestra el motivo. |
| `templates/invitacion-inscripcion.tsx` | La invitación al Application Form, con el link que lleva el token en claro. Los props son solo contexto de campaña (a quién se saluda, el viaje, el link): nada de la ficha puede viajar acá, porque el mail sale antes de que la familia cargue un dato y a una casilla que no controlamos. El plazo no se escribe a mano, sale de `VIGENCIA_DIAS`, así que el mail no puede prometer 90 días si la invitación vence a los 30. Saluda a la persona, a la institución o en genérico: el CRM tiene prospectos cargados solo con una casilla y un "Hola null" no es opción. |

`npm run email:dev` abre la preview de `templates/` con `react-email` (devDependency; su Next empaquetado trae la vulnerabilidad crítica que reporta `npm audit`, ver [06](06-seguridad.md)).

### `src/lib/storage/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | `putDocumento` y `getDocumento` sobre Cloudflare R2 (SDK S3). La URL que se devuelve es siempre la del proxy autenticado `/api/uploads/<key>`, nunca una del bucket. Sin R2: disco local `.uploads/` en dev y CI; en producción lanza `StorageNoConfiguradoError` (en Vercel el disco es efímero). `storageConfigurado`, `KeyInvalidaError`. |
| `key.ts` · `key.test.ts` | `keyEsSegura` (alfabeto acotado, sin `..` ni `\`) y `nombreDesdeKey`. |
| `content-disposition.ts` · `content-disposition.test.ts` | Header `Content-Disposition` seguro: sin CR/LF ni comillas inyectables, `filename` ASCII + `filename*` UTF-8. |

### `src/lib/jobs/` — lógica de los jobs (la invocan las tasks de `src/trigger/`)

| Archivo | Qué hace |
|---|---|
| `purgar-inscripciones.ts` · `purgar-inscripciones.integration.test.ts` | `purgarPorRetencion(ahora)`: ejecuta los plazos de `domain/privacidad/retencion` (90 días una ficha ya volcada a un alumno, 730 una sin procesar, 90 una invitación vencida sin usar). Vacía los datos personales y sella `datos_purgados_el` dejando el talón —**no borra la fila**, para que las métricas de campaña no cambien hacia atrás— y borra el hash del token de las invitaciones que ya no abren nada. El SQL acota por la fecha de corte y el dominio confirma fila por fila; va por lotes con tope, es idempotente y `ahora` entra por parámetro. Se corre con `npm run job:purga` (Trigger.dev no está desplegado); el enganche futuro (`purga-retencion`, `0 4 * * *`) está escrito en el encabezado del job. |
| `scan-recordatorios.ts` · `scan-recordatorios.integration.test.ts` | `scanRecordatorios`: marca A1 vencido, manda los recordatorios de A1 y D1 que tocan hoy con dedup en `notificaciones_enviadas`, registra los fallidos. |
| `enviar-lote-invitaciones.ts` · `enviar-lote-invitaciones.test.ts` · `enviar-lote-invitaciones.integration.test.ts` | Una tanda de una campaña: recicla reservas vencidas, reserva, manda con la pausa del rate limit de Resend y sella cada fila. Un rechazo de Resend no corta la tanda (queda `fallido` con su motivo); un error de BASE sí corta, porque sin poder sellar el reciclado reenviaría. Relee el prospecto antes de cada mail: la baja se respeta aunque se haya dado después de armar el lote. La integración prueba lo que no se puede probar sin base: que dos corridas seguidas nunca manden dos veces el mismo token y que una fila colgada en `enviando` se recicle. El unit prueba `invitacionParaEnviar` y el sender por defecto (que al mail le llegan el vencimiento exacto y los datos del viaje: la integración inyecta su propio sender y no lo cubría). |
| `transiciones-viajes.ts` · `transiciones-viajes.integration.test.ts` | `transicionarViajesPorFecha`: confirmado → en curso y en curso → finalizado, con auditoría sin usuario. Avanza un paso por viaje por corrida. |

### `src/lib/utils/`

| Archivo | Qué hace |
|---|---|
| `cn.ts` · `cn.test.ts` | `cn()`: `clsx` + `tailwind-merge`. |
| `date.ts` · `date.test.ts` | Fechas de calendario en UTC (las columnas `date` llegan a medianoche UTC; con la zona local se corren un día): `toDateInput`, `formatFecha` (DD/MM/YYYY), `diaCalendarioUTC`, `diasEntre`. Y `formatFechaArgentina` para un **instante** (un vencimiento, un envío): el día que es en Buenos Aires, que no es el día UTC entre las 21 y las 24 h. |
| `dni.ts` · `dni.test.ts` | `formatearDni` (solo visual, con puntos) y `soloDigitos` (lo que se guarda y va en la URL). |
| `token-opaco.ts` · `token-opaco.test.ts` | `generarTokenOpaco` (32 bytes base64url) y `hashToken` (sha256). En la base se guarda **solo el hash**: un dump no habilita a abrir una invitación. Vive en utils y no en el dominio para no meter `node:crypto` en la capa pura. |
| `hash-texto.ts` · `hash-texto.test.ts` | `hashTexto`: sha256 del texto normalizado (CRLF→LF, trim). Sella qué copy exacto de consentimiento aceptó cada persona. |
| `paginate.ts` · `paginate.test.ts` | `PAGE_SIZE` (50), `pagina` (normaliza `?page`, también decimales), `totalDe`, `paginarEnSql` (página fuera de rango → relee la última) y `paginar` en memoria. |
| `agrupar.ts` · `agrupar.test.ts` | `agruparPor`: agrupa filas por clave para reemplazar N queries por una. |
| `aria.ts` · `aria.test.ts` | `unirIds` para `aria-describedby`/`aria-labelledby`. |
| `zod.ts` · `zod.test.ts` | `fieldErrorsFromZod`: errores por path completo (`contactoAcademico.email`, `cursos.0`). |

### `src/lib/hooks/`

| Archivo | Qué hace |
|---|---|
| `use-unsaved-changes.ts` [client] | `useUnsavedChanges(dirty)`: aviso del navegador al salir con cambios sin guardar. |

### `src/lib/` (sueltos)

| Archivo | Qué hace |
|---|---|
| `contact.ts` · `contact.test.ts` | Datos de contacto de JUK (teléfono, email, WhatsApp, redes) y `whatsappConMensaje`/`mailConAsunto`. Fuente única para el sitio y el portal de familias. |
| `marca.ts` · `marca.test.ts` | Datos de marca compartidos por el sitio público y el Application Form: `STATS_JUK` (las cuatro cifras), `ACREDITACIONES_JUK` (los ocho sellos con su `alt`) y `FOTO_HERO_INSCRIPCION`. Sube a `src/lib/` por el mismo criterio que `contact.ts`: `(public)/_sections/` es carpeta privada de ese segmento y `/inscripcion` vive afuera. |
| `routes.ts` · `routes.test.ts` | Fuente única de rutas: prefijos del portal, auth, páginas públicas y rutas sueltas, `HOME_BY_ROLE`, `ROBOTS_DISALLOW`. El test compara `PORTAL_PREFIXES` contra las carpetas de `app/(admin)`: **si agregás un módulo, sumalo acá**. |

---

## `src/styles/` y `src/trigger/`

### `src/styles/`

| Archivo | Qué hace |
|---|---|
| `tokens.css` | Dirección visual STUDIO en custom properties (`.v-studio`): paleta, tipografías, radios, sombras y gradientes. Es el único archivo que hay que tocar para cambiar el look. Guía en `juk-portal/docs/design-system.md`. |
| `globals.css` | Importa tokens y animaciones, directivas de Tailwind y estilos base. Ahí viven el piso de 16px de los controles en el teléfono (con `!important` deliberado) y las dos únicas utilidades propias del proyecto, `.scroll-fino` y `.scroll-fino-onbrand`. |
| `form-variants.css` | Vocabulario `--form-*` de las tres pieles del Application Form y del marco que lo rodea. El TSX no conoce la variante: cada piel es un override de estas variables. |
| `animations.css` | Keyframes globales (fade, pop, slide, toast). |

### `src/trigger/` — tasks de Trigger.dev (se publican con `npm run trigger:deploy`)

| Archivo | Qué hace |
|---|---|
| `reminders.ts` | `daily-reminder-scan` (cron diario 09:00 UTC = 06:00 ART): transiciones de viajes por fecha y después scan de recordatorios. `run-reminder-scan`: corrida manual, con dry-run opcional. |
| `viajes.ts` | `notificar-cancelacion-viaje`: mail a las familias de los inscriptos activos. Es un job y no parte de la action porque son N mails en serie (timeout, reintentos). |
| `leads.ts` | `notificar-consulta-nueva`: aviso al equipo por un lead; el lead ya quedó guardado, así que un fallo de Resend no pierde la captación. |

---

## `tests/`

### `tests/e2e/` — infraestructura de la suite

| Archivo | Qué hace |
|---|---|
| `auth.setup.ts` | Proyecto `setup`: login como `test.superadmin@…` (password de `E2E_PASSWORD` o `SEED_TEST_PASSWORD`), guarda `tests/e2e/.auth/admin.json` (ignorado) y garantiza el colegio destino base (`COLEGIO_E2E`, sin config documental) contra el que se crean los viajes de la suite. |
| `familia.setup.ts` | Proyecto `setup-familia`: una sola sesión de familia (`tutor@demo…`) para todo el portal; loguear en cada test agotaba el rate limit. |
| `global.teardown.ts` | Proyecto `cleanup`, teardown de `setup` (corre cuando terminan `chromium` y `mobile`, que dependen de él): borra lo que generó la corrida. Su comentario dice "después de todo el proyecto chromium": quedó corto. |
| `cleanup.ts` | `cleanupE2EData`: borra por los patrones inconfundibles que lista su cabecera (viajes `UK-2099-…`, alumnos con DNI `E2E-…` o emails de tutor de test, colegios `Colegio E2E …`/`Prospecto E2E …`, GLs `gl-…@example.com`, cuentas de familia y `e2e+…`, leads `@e2e.example.com`) y los documentos de esos pasos (no tienen FK). Respeta el orden de FKs, preserva el colegio base y nunca toca el seed `[DEMO]`. Si un spec crea datos con otro patrón, el teardown no los ve. |
| `helpers.ts` | Utilidades compartidas y criterio de selectores (rol y nombre accesible; nada de `.nth`, clases CSS ni `force`). Generadores de datos únicos, alta de viaje, alumno, colegio, prospecto y GL, localizadores de paneles y pasos, y `esperarHidratacion` (antes de interactuar con un control recién cargado; un `toHaveValue` no alcanza). Documenta las variables de entorno de la suite. |
| `helpers-flujos.ts` | Utilidades de los specs de flujos: alumno por webhook, alumno por UI, viaje por tipo, fijar contraseña e ingresar como otra cuenta, leer pasos y asignaciones directo de la base. Todo respeta los patrones de `cleanup.ts`. |

### `tests/e2e/` — specs

Proyecto donde corre cada uno: `chromium` salvo que se indique. Lo etiquetado `@mobile` corre en
`mobile` (Pixel 7) y no en `chromium`. `familias.spec.ts` y `familias-ux.spec.ts` corren en
`familias`, pero el test `@mobile` de `familias-ux.spec.ts` también corre en `mobile` (en `familias`
se saltea por `isMobile`). `mobile` depende de `setup` y `setup-familia` porque
`smoke-mobile.spec.ts` entra al portal de familias. `public.spec.ts` corre en `public`.

| Archivo | Qué flujo cubre |
|---|---|
| `smoke.spec.ts` | Dashboard con sesión, navegación por secciones, 404 con marca y validación del alta de colegio. |
| `auth.spec.ts` | Sin sesión, una ruta protegida redirige a login. |
| `auth-hardening.spec.ts` | El sign-up público responde 4xx y no crea la cuenta; login fallido con error genérico; el login social tampoco crea cuentas. |
| `login-ux.spec.ts` | Avisos por `?reset`, `?inactivo`, `?portal=familias`; `returnTo` a otro dominio o con backslash termina en `/dashboard`; 404 propio del back-office; los mensajes del `?error=` de Google (un Google desconocido, un código que no reconocemos) y que sin credenciales el botón no se ofrece. |
| `a11y-basico.spec.ts` | Chequeos de accesibilidad hechos a mano (nombres accesibles, un h1, alt, foco visible) en rutas con y sin sesión. Su comentario dice que `@axe-core/playwright` no está instalado: ya está en devDependencies, pero el spec todavía no lo usa. |
| `dashboard.spec.ts` | Secciones y accesos rápidos, stat cards con destino filtrado, alumno con pasaporte en riesgo en "acción urgente", y el menú lateral scrolleando con la barra fina de STUDIO. |
| `colegios.spec.ts` | Alta completa y contactos obligatorios. |
| `viajes.spec.ts` | Alta de viaje y aparición en el listado. |
| `viajes-estado.spec.ts` | La edición solo ofrece transiciones de estado válidas. |
| `listados-filtros.spec.ts` | Inscriptos/cupo y filtros de viajes; viaje y filtros de alumnos; detalle del viaje con resumen, anclas y alertas. |
| `alumnos.spec.ts` | Alta, validación de requeridos y DNI repetido explicado por campo. |
| `alumnos-abm.spec.ts` | Edición con pasaporte actualizado, DNI duplicado, baja con motivo (desactiva la familia) y reactivación. |
| `group-leaders.spec.ts` | Alta y validación. |
| `group-leaders-viaje.spec.ts` | Asignar un GL a un viaje, marcarlo principal y quitarlo. |
| `asignaciones.spec.ts` | Asignar descuenta cupo; re-asignar a un alumno desasignado. |
| `asignaciones-validaciones.spec.ts` | Advertencia de sobre-cupo (cancelar no asigna, confirmar sí) y auto-confirmación al quinto inscripto. |
| `asignar-desde-alumno.spec.ts` | Asignar desde la ficha crea el tablero M6; con pasaporte vencido pide confirmación. |
| `tablero-alumno.spec.ts` | Al asignar se crea el tablero M6 y se transicionan pasos. |
| `tablero-subestados.spec.ts` | Sub-estados de C1 y A3 definen el estado; fecha límite de A1; bloquear exige motivo. |
| `documentos.spec.ts` | Subir un documento al paso A1 y que quede linkeado. |
| `uploads-acceso.spec.ts` | `/api/uploads` sirve al admin y nunca a un anónimo. |
| `cuotas.spec.ts` | Plan de cuotas: pagos completan B1, destraban C2 y B2 cierra presencial. |
| `pagos.spec.ts` | Módulo Pagos: listar, filtrar por viaje y registrar. |
| `pagos-registro.spec.ts` | Registrar con fecha retroactiva y observaciones (ficha y B2), rechazo de fecha futura, mismo diálogo en Pagos. |
| `pasos-viaje.spec.ts` | M7: los 5 pasos, dependencia Transfers → Pasajes, guardar datos de Pasajes, aviso de Police Checks sin GLs. |
| `cobertura-m7.spec.ts` | Tarjetas de transporte por alumno: marcar a todos completa el paso. |
| `m7-excursiones.spec.ts` | Excursiones con alta, cambio de estado y baja; sub-estados de Pasajes por tipo de viaje. |
| `prospectos.spec.ts` | Alta, validación, toggle kanban/tabla, nota interna, conversión a colegio e importación CSV. |
| `consultas.spec.ts` | Una consulta se lee completa, se responde y se marca contactada. |
| `leads.spec.ts` | Sin sesión: leads para mí, para un colegio y para un hijo se guardan; lead inválido no persiste; newsletter idempotente. |
| `leads-rate-limit.spec.ts` | Sin sesión: el envío que supera el límite por IP se rechaza y no persiste. |
| `webhook-google-form.spec.ts` | Sin secret → rechazo; con secret crea el pre-inscripto y lo asigna al viaje del link. |
| `webhook-google-form-casos.spec.ts` | 422 con campos faltantes, 400 con JSON roto, 401 con secreto parecido, código de viaje inexistente, viaje individual ya ocupado. |
| `usuarios.spec.ts` | El super_admin entra a Usuarios. |
| `usuarios-acceso.spec.ts` | Alta sin mostrar contraseña y reenvío de acceso (limpia sus propios usuarios en `afterAll`). |
| `usuarios-abm.spec.ts` | Cambio de rol con confirmación, activar y desactivar, y login de un usuario desactivado (se queda en el login con el aviso). |
| `configuracion.spec.ts` | Guardar remitentes y UI de prueba; guarda y restaura la configuración real del entorno. |
| `configuracion-servicios.spec.ts` | Estado de servicios y preview de templates; el viejo playground `/tests` ya no existe. |
| `inscripcion-alta.spec.ts` | El Application Form de punta a punta: con invitación válida la ficha crea al alumno, le arma la cuenta de familia y lo asigna al viaje; un segundo envío con el mismo DNI no le cambia la cuenta; sin invitación la ficha espera a la bandeja. Más el consentimiento (la casilla se pinta de rojo, abrir la política no la tilda) y un caso `@mobile` de envío desde el teléfono. |
| `inscripcion-variantes.spec.ts` | Las tres pieles (A Legajo, B Cuaderno, C Embarque): mismo árbol accesible y mismos errores, la barra de progreso avanza, el envío registra la piel que se vio, el marco no ofrece ninguna salida de navegación al sitio, y la variante de `/configuracion` manda salvo que la pise la del link. |
| `inscripcion-validacion.spec.ts` | Sin sesión: el formulario público avisa **mientras** se completa. Un carácter imposible se marca en el acto, un campo a medio tipear no, y el error se borra apenas el dato queda bien. No envía ninguna ficha, así que no escribe en la base ni tiene teardown. |
| `inscripciones-bandeja.spec.ts` | La bandeja lista, filtra y pagina; el detalle abre por código `INS-000123`; los datos sensibles se ven en el back-office; anular deja el motivo; el borrado a pedido de un super_admin saca la ficha de la bandeja y deja el talón (la fila sigue, sin nadie adentro); y un caso `@mobile` de la tabla en modo tarjeta. |
| `invitaciones-lote.spec.ts` | La campaña llega a 0 restantes por tandas y retomarla no reenvía; el dado de baja queda afuera con su motivo; una invitación revocada deja de abrir; el embudo muestra el `n` al lado del porcentaje, corta por piel y marca como "no disponible" lo que depende del webhook de Resend; abrir el link cuenta la apertura una sola vez; y un caso `@mobile` de la tabla en modo tarjeta. |
| `familias.spec.ts` | Proyecto `familias`: resumen, breadcrumb, navegación, Pagos, Documentación, Mis datos y que no se vea el alumno de otra familia. Solo lectura sobre el seed demo. |
| `familias-ux.spec.ts` | Proyecto `familias`: documentación por etapa, "Tuve un problema" del ETA, Ayuda, aviso de cuota vencida, confirmación al reportar un dato; en teléfono, Ayuda en el header (se saltea fuera de mobile). |
| `familias-acciones.spec.ts` | Acciones reales de familia con cuentas creadas por el spec: subir A1 y descargarlo, otra familia no lo ve, reportar ETA en trámite y con problema, confirmar D1, reportar un dato. |
| `recorrido-completo.spec.ts` | `@slow`: colegio → viaje → alumno por webhook → tablero con N/A → cuotas → C2 → documento → M7 → dashboard, cada fase en un `test.step`. |
| `public.spec.ts` | Proyecto `public`: cada página con su h1, robots/sitemap/OG, redirects del Wix, 404 de nota, navegación, newsletter y formulario de consulta. |
| `smoke-mobile.spec.ts` | `@mobile`: sin scroll horizontal ni texto de menos de 12px en las pantallas principales y en el portal de familias. |
| `listados-mobile.spec.ts` | `@mobile`: listados de alumnos y pagos como tarjetas con acciones tapeables. |
| `formularios-mobile.spec.ts` | `@mobile`: alta de alumno desde un teléfono sin zoom; desactivar colegio con confirmación. |
| `mobile-nav.spec.ts` | `@mobile`: drawer del admin (navega, cierra con Escape y devuelve el foco), mover prospecto desde la tarjeta, menú del sitio público. |

### `tests/integration/`

| Archivo | Qué hace |
|---|---|
| `setup.ts` | Setup del proyecto vitest `integration`: carga `.env.local` sin pisar lo definido; con `INTEGRATION_DATABASE_URL` apunta `DATABASE_URL` ahí; sin ella deja `DATABASE_URL` en un host `.invalid` para que un test mal gateado falle en vez de escribir en la base de desarrollo. |
| `fixtures.ts` | Conexión, fechas y fábrica de fixtures por ámbito (colegios, viajes, alumnos con prefijos `INT-`, `[INT]`, `int+…`), limpieza de restos huérfanos y conteo de restos. |

---

## `scripts/`

### `scripts/`

| Archivo | Qué hace |
|---|---|
| `ci-local.mjs` · `ci-local.test.mjs` | `npm run ci:local`: el CI completo en local. Chequeos rápidos, branch efímera de Neon hija de `ci-base` (con `neonctl`), migraciones, seeds, integración y Playwright; borra la branch al final. Pisa todas las URLs de base con las de la branch (nunca escribe en dev) y levanta Playwright con `NEXT_DIST_DIR=.next-e2e` y `CI=1`, así convive con el `next dev` del 3000. El test cubre el plan de pasos, las opciones y el entorno de la corrida. |
| `check-env.ts` | `npm run check:env` (corre con tsx): lee `.env.local` y lo evalúa contra el catálogo de `src/lib/domain/configuracion/env.ts`. Marca lo que falta, lo que quedó con el molde de `.env.example` y lo que no debería estar seteado en un deploy; además avisa si la plantilla y el catálogo divergen. `--prod`, `--env <archivo>` y `--soft`. Nunca imprime valores. La lógica testeada vive en el dominio. |
| `purgar-inscripciones.ts` | `npm run job:purga` (corre con tsx): la purga por retención a mano, mientras Trigger.dev no esté desplegado. Carga `.env.local` sin pisar el entorno, importa el job en diferido (`@/lib/db` tira al evaluarse sin `DATABASE_URL`) e imprime el host de la base y las tres fechas de corte **antes** de escribir, más el resumen contable al final. La lógica está toda en `src/lib/jobs/purgar-inscripciones.ts`. |
| `check-test-companions.mjs` · `check-test-companions.test.mjs` | `npm run check:tests`: exige `<archivo>.test.ts(x)` al lado de todo archivo nuevo o modificado en `src/lib/{domain,utils,actions}` (exime `index`, `labels`, `errors`, `types`, tests, `__tests__` y archivos solo de tipos; un `.integration.test.ts` no cuenta). Con `--base auto` compara contra el merge-base de `CHECK_TESTS_BASE`, `origin/main` o `HEAD~1` e incluye cambios sin commitear. Lo corren el pre-push y el CI. El test corre en el proyecto `unit`. |

---

## `drizzle/` — migraciones

Se generan con `npm run db:generate` y se aplican con `npm run db:migrate` (skill `/juk-migracion`).
Nunca se editan a mano una vez aplicadas.

### `drizzle/`

| Archivo | Qué hace |
|---|---|
| `meta/_journal.json` · `meta/NNNN_snapshot.json` | Journal de Drizzle Kit y snapshot del schema después de cada migración. Los genera la herramienta; no se tocan. |
| `0000_sloppy_white_tiger.sql` | Schema inicial: users, sessions, accounts, verifications, colegios, viajes, alumnos, group_leaders, asignaciones, pasos_alumno, pasos_viaje, group_leaders_viaje, cuotas, documentos, alertas, auditoria y sus enums y FKs. |
| `0001_same_lily_hollister.sql` | `updated_at` en sessions y verifications (lo pide Better-Auth). |
| `0002_puzzling_miek.sql` | `colegios.requiere_test_nivel`, FK de `group_leaders_viaje` a group_leaders y `es_principal` como boolean. |
| `0003_medical_siren.sql` | Multi-moneda en cuotas (`moneda_cuota`, default USD, `cotizacion_aplicada`), `viajes.tipo`, comisión y fee de representante, origen `juk_directo`. |
| `0004_narrow_quicksilver.sql` | Borra `viajes.ultimo_pago_presencial` (B2 pasa a derivarse del origen). |
| `0005_robust_annihilus.sql` | Config documental: tabla `colegio_documento_config`, enums de documento y requisito, `colegios.tipo_entrada_requerida`. |
| `0006_lively_serpent_society.sql` | Borra `colegios.requiere_certificado_psicofisico` y `requiere_test_nivel` (reemplazados por la config documental). |
| `0007_empty_selene.sql` | Tablero nuevo: enum `paso_codigo`, `pasos_alumno.codigo` con unique por asignación y estado `vencido`. |
| `0008_good_payback.sql` | Borra la columna `pasos_alumno.tipo` y el enum `paso_tipo` (numeración vieja). |
| `0009_calm_shen.sql` | Tabla `rate_limits` de Better-Auth y `users.apellido`, `users.sub_rol_admin`. |
| `0010_brave_pestilence.sql` | `cuotas.registrado_por`. |
| `0011_silly_katie_power.sql` | Portal de familias en alumnos: `familia_user_id`, `canal_alta`, `acceso_familia_enviado_at`. |
| `0012_worried_bloodstorm.sql` | Tabla `notificaciones_enviadas` (dedup de recordatorios). |
| `0013_hard_wiccan.sql` | `alumnos.pasaporte_actualizado_at`. |
| `0014_flippant_gabe_jones.sql` | Tabla `configuracion` (key-value). |
| `0015_sloppy_micromax.sql` | Captación web: `suscriptores`, `consultas` y sus enums. |
| `0016_wet_smiling_tiger.sql` | CRM: `prospectos`, `prospecto_comunicaciones`, enums e índices. |
| `0017_better_auth_1_7_account_columns.sql` | Columnas de tokens OAuth en accounts que exige Better-Auth 1.7. |
| `0018_ola2_rol_default_y_rate_limit.sql` | Rol default de `users` pasa a `familia` y tabla `form_rate_limits` (anti-abuso de formularios públicos). |
| `0019_fase2_indices.sql` | Índices en `alumnos.familia_user_id`, `asignaciones (viaje_id, estado)` y `cuotas.asignacion_id`, y unique de `alumnos.dni`. |
| `0020_enums_inscripcion.sql` | Solo dos `ALTER TYPE ADD VALUE`: `canal_alta` suma `formulario_web` y `prospecto_comunicacion_estado` suma `enviando`. Va **sola** porque Postgres no deja usar un valor de enum en la misma transacción que lo agrega. |
| `0021_inscripciones.sql` | Los enums `inscripcion_estado` y `variante_formulario`, la tabla `inscripciones` con sus dos índices parciales, las 7 columnas de invitación de `prospecto_comunicaciones` y el índice de `alumnos.canal_alta`. |

---

## Harness y automatización (rutas relativas a la raíz del repo)

### Raíz del repo

| Archivo | Qué hace |
|---|---|
| `CLAUDE.md` | Cómo se trabaja en el workspace (layout, skills, agentes) y las reglas de sincronía de docs. Importa `juk-portal/CLAUDE.md`; no copia convenciones ni guarda estado del proyecto. |
| `.gitignore` | Lo genérico de todo el repo: dependencias y build, `.env*` locales, logs, cobertura, artefactos de Playwright (incluidas las sesiones `tests/e2e/.auth/`), `.claude/settings.local.json` y capturas locales. Lo propio de la app está en `juk-portal/.gitignore`. |
| `.gitattributes` | Fuerza LF en el índice (evita CRLF fantasma en Windows) y marca como binarios imágenes, fuentes, PDF y video. |

### `.claude/`

| Archivo | Qué hace |
|---|---|
| `settings.json` | Registro de hooks (por evento y matcher) y permisos del workspace. Un archivo en `hooks/` que no esté registrado acá **no corre**: al sumar un hook, registralo en el mismo cambio. |
| `hooks/_comun.mjs` | Utilidades de los hooks, **no es un hook**: rutas ancladas al propio archivo (no al cwd, así funcionan si la sesión arrancó en la raíz, en `juk-portal/` o en un worktree), lectura del JSON de stdin, `rutaEnApp`, `esTest`, `emitirContexto` y estado por sesión en el temp del sistema (`primeraVez`, para avisar una sola vez). Regla común: ante un error propio, salir con 0 en silencio. |
| `hooks/README.md` | Guía de los hooks: tabla hook → evento → qué hace → si bloquea, decisiones de diseño (rutas desde `import.meta.url`, avisos y no bloqueos, por qué Stop sale con 2, estado por sesión en el temp) y por qué hay hook además de `permissions.deny`. |
| `hooks/probar-hooks.mjs` | Prueba de los hooks, **no es un hook** (no está en `settings.json`): `node .claude/hooks/probar-hooks.mjs` corre cada hook como Claude Code (JSON por stdin) contra casos que tienen que avisar o bloquear y casos que tienen que salir en silencio; los que leen archivos o git corren sobre una copia en un repo temporal. Sale con 1 si falla algo. Correlo después de tocar cualquier hook. |
| `hooks/domain-purity-check.mjs` | `PostToolUse` (Edit/Write/MultiEdit). Sale con 2 si un archivo de `src/lib/domain/` (no tests) importa Next, React, `server-only`/`client-only`, `@/app`, `drizzle-orm`, un driver de DB o `@/lib/db`. Detecta también imports de efecto, `export … from`, `import()` y `require()`, e ignora comentarios. |
| `hooks/schema-change-reminder.mjs` | `PostToolUse` (Edit/Write/MultiEdit). Aviso sin bloqueo, una vez por sesión por archivo, al tocar `src/lib/db/schema/*` (no `index.ts`): los pasos de `/juk-migracion`, actualizar `docs/prd/03-modelo-datos.md` y nada de `db:push`. |
| `hooks/gated-module-warning.mjs` | `PostToolUse` (Edit/Write/MultiEdit). Aviso sin bloqueo, una vez por sesión por decisión, al tocar código de excursiones (CRIT-04 ⭐) o cuotas, pagos o moneda (CRIT-05 ⭐): codeá con la regla pero acotada y reversible. Relee `OPEN_DECISIONS.md` y deja de avisar cuando la línea de esa decisión ya no tiene ⭐. |
| `hooks/test-companion-check.mjs` | `PostToolUse` (Edit/Write/MultiEdit). Aviso sin bloqueo cuando un archivo de `src/lib/{domain,utils,actions}` no tiene su test al lado. Importa las reglas de `juk-portal/scripts/check-test-companions.mjs` (no las copia); el bloqueo real es `npm run check:tests`. |
| `hooks/destructive-command-guard.mjs` | `PreToolUse` sobre Bash y PowerShell. Sale con 2 ante borrado recursivo fuera de temporales o artefactos regenerables, SQL destructivo por línea de comandos, `drizzle-kit push/drop` o `db:push` (la base de desarrollo tiene datos reales), `git push --force`, `git reset --hard` y `git clean -f`. Es un freno contra errores, no una barrera. El chequeo de SQL es heurístico: deja pasar el texto destructivo solo si **todos** los subcomandos (partidos por `;`, `&&`, `|`…) arrancan con un visor (`grep`, `cat`, `git`, `cd`…). `cd x && grep …` pasa, pero un `for … do cat … \| grep "<patrón con DROP>"; done` se bloquea (`for`, `do` y `done` no son visores). Si te pasa con una búsqueda de solo lectura, escribí el patrón como `DR[O]P`. |
| `hooks/docs-sync-reminder.mjs` | `Stop`. Si hay cambios en `juk-portal/src/` (no tests) y ninguno en los docs vivos (PRD, OPEN_DECISIONS, estado-actual, CHANGELOG, este mapa), sale con 2 y le pasa a Claude la tabla "tocaste X → actualizá Y". Avisa una vez por archivo, respeta `stop_hook_active` y se apaga con `JUK_DOCS_SYNC=off`. |
| `skills/juk-cierre/SKILL.md` | `/juk-cierre`: Definition of Done única: typecheck y lint, unit con cobertura, test compañero, integración, E2E (desktop y teléfono), `next build`, navegador, migración, `juk-revisor`, checklist de la regla de sincronía de docs y commit. |
| `skills/juk-modulo/SKILL.md` | `/juk-modulo`: andamiaje de un módulo por capas. |
| `skills/juk-paso/SKILL.md` | `/juk-paso`: implementar un paso del M6 o M7. |
| `skills/juk-migracion/SKILL.md` | `/juk-migracion`: generar, revisar, aplicar y commitear una migración Drizzle, incluidas las de datos (`drizzle-kit generate --custom`). |
| `skills/juk-gate/SKILL.md` | `/juk-gate`: chequear decisiones de negocio antes de codear un área. |
| `skills/juk-setup/SKILL.md` | `/juk-setup`: setup local en una máquina nueva y guía para conectar cada servicio (Neon, Better-Auth, Resend, R2, Trigger.dev, Sentry, Vercel y el CI de GitHub), o para revisar uno mal configurado. |
| `agents/juk-arquitecto.md` | Agente que diseña el blueprint de una feature (solo lectura). |
| `agents/juk-prd-analyst.md` | Agente que cruza PRD, modelo y OPEN_DECISIONS para detectar blockers (solo lectura). |
| `agents/juk-revisor.md` | Agente de code review contra las convenciones (solo lectura). |
| `agents/juk-infra.md` | Agente de infraestructura y deploy (puede ejecutar y editar config). |
| `docs/README.md` · `docs/01-producto.md` · `docs/02-arquitectura-y-convenciones.md` · `docs/03-mapa-de-archivos.md` · `docs/04-operacion-y-handoff.md` · `docs/05-testing.md` · `docs/06-seguridad.md` · `docs/07-performance.md` | Documentación de handoff: producto, arquitectura y cómo se arma un módulo, este mapa, operación, testing, seguridad y performance. Orden de lectura en el README. |

### `.githooks/`

| Archivo | Qué hace |
|---|---|
| `pre-push` | Opt-in con `npm run hooks:install` (setea `core.hooksPath`). Corre typecheck, lint, unit y `check:tests` desde `juk-portal/`; no corre audit, build ni E2E (quedan para el CI). Se saltea si el push solo borra ramas. Emergencia: `git push --no-verify`. |

### `.github/`

| Archivo | Qué hace |
|---|---|
| `workflows/ci.yml` | Job `check` (cada push y PR): typecheck, lint, cobertura con piso, `check:tests`, `npm audit --omit=dev --audit-level=high` y `next build` con env de prueba. `e2e-gate` y `e2e` **solo en corridas manuales** (`workflow_dispatch`), por costo; lo mismo corre local con `npm run ci:local`. Job `e2e-gate`: mira si existen `NEON_API_KEY` y `NEON_PROJECT_ID`; si faltan, el e2e queda salteado con aviso, no en rojo. Job `e2e`: branch efímera de Neon (padre `NEON_PARENT_BRANCH` si está), secretos generados por corrida, migraciones, seeds, integración y Playwright. Corre sobre `next dev` **a propósito**: en modo producción rigen el rate limit real de login y la exigencia de R2, y aflojarlos con un flag sería un bypass activable por variable de entorno. Con la variable de repo `E2E_SERVER=start` hace el build y prueba contra `next start` (a mano, sabiendo que el rate limit va a pegar). `NEON_PROJECT_ID` puede venir como secret o como variable; `NEON_DATABASE` y `NEON_ROLE` son variables opcionales. La branch nace con vencimiento a 3 h (red de seguridad) y se borra al final con `always()`. Detalle en [05](05-testing.md) y [04](04-operacion-y-handoff.md). |

---

## Trampas del árbol (resumen)

- **No agregues `loading.tsx` en `src/app/familias/`**: rompe el 404 de pertenencia (ver `[dni]/layout.tsx`).
- **Estados de carga = skeletons** de `components/ui/skeleton.tsx`. `GlobeLoader` está exportado pero no se usa, aunque su comentario diga lo contrario.
- **Dos `SectionTitle`**: el del design system (`components/ui/section-title.tsx`) y el del sitio público (`(public)/_components/primitives.tsx`). No los mezcles.
- **Copias que hay que mantener iguales**: `POLICE_CHECK_ESTADO_LABELS` (`domain/group-leaders/labels.ts` y `domain/pasos-viaje/police.ts`), `paisEnum` (`domain/colegios/schema.ts` y `domain/prospectos/schema.ts`), la unión de países copiada a mano (`type Pais` en `domain/colegios/documentos.ts` y `type PaisDestino` en `domain/asignaciones/validate-passport.ts`; el `Pais` de `domain/prospectos/csv.ts` se deriva de `paisEnum` y no es copia) y los enums Zod contra sus `pgEnum`.
- **Rol `representante` sin pantalla**: `HOME_BY_ROLE.representante` es `/dashboard` y `(admin)/layout.tsx` lo rebota a su home, o sea al mismo `/dashboard`: loop de redirect. Hoy ninguna UI crea esas cuentas; antes de crear una, hay que darle un home propio.
- **Comentarios viejos que engañan**: `(admin)/layout.tsx` dice que sin rol redirige a `/login` (va al home del rol) y `tests/e2e/global.teardown.ts` dice que corre después del proyecto `chromium` (es el teardown de `setup`, del que dependen `chromium` y `mobile`; los leads de `public` los limpia su propio spec).
- **Datos de contacto** en `src/lib/contact.ts`, no en `(public)/contact.ts` (es un re-export).
- **Auditoría**: las actions usan `safeAudit`; los jobs, `registrarAuditoria`.
- **Módulo nuevo del back-office**: además de la carpeta, sumalo a `PORTAL_PREFIXES` en `lib/routes.ts` (lo exige su test) y a la navegación de `components/admin/admin-shell.tsx`.
- **Rutas de detalle nuevas** nacen con slug (ver `juk-portal/CLAUDE.md`); hoy solo alumnos (DNI) y viajes (código) lo usan.
