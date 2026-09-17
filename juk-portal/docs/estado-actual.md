# Estado actual del JUK Portal

> **Corte: 11/09/2026**, verificado contra el código en `0b73eaf` (cierre de la fase de tests
> del programa de adecuación).
> Este archivo es la **única fuente del estado**: qué está construido, qué es parcial, qué falta,
> qué servicios están conectados y qué depende del dueño. El historial está en
> [`../CHANGELOG.md`](../CHANGELOG.md); el QUÉ funcional, en [`prd/`](prd/00-indice.md); las
> decisiones, en [`../OPEN_DECISIONS.md`](../OPEN_DECISIONS.md).
> Este archivo mira el estado **por módulo y por servicio**. El detalle **por user story** (qué
> pide el PRD y el código no hace, y el plan priorizado) está en
> [`prd/06-deltas-implementacion.md`](prd/06-deltas-implementacion.md): los "falta" de abajo son
> el resumen, y 06 es donde se desglosan.
>
> **Mantenimiento** (regla de sincronía, `CLAUDE.md` raíz): todo cambio que mueva un módulo de
> estado, conecte un servicio, resuelva algo de "Depende del dueño" o sume o salde deuda actualiza
> este archivo en el mismo commit, junto con la fecha de corte.

Estados: ✅ construido · 🟡 parcial (anda, pero falta parte de la spec) · ❌ pendiente (no hay pantalla).

---

## 1. Back-office (equipo JUK)

Spec: [`prd/02-portal-interno.md`](prd/02-portal-interno.md). Todas las pantallas requieren sesión
de `admin_juk` o `super_admin`.

| Módulo | Estado | Pantalla | Spec | Qué hay · qué falta |
|---|---|---|---|---|
| **M1 · Login y cuentas** | ✅ | `/login`, `/reset-password`, `/configuracion/cuenta` | 02 §Módulo 1 | Registro público cerrado; bloqueo tras 5 intentos en 15 min en producción; acceso por link para crear la contraseña (24 h); "Mi cuenta" para cambiarla; una cuenta desactivada ve el aviso y no entra. |
| **M2 · Dashboard** | 🟡 | `/dashboard` | 02 §Módulo 2 | **Hay:** stat cards que llevan al listado filtrado, alertas reales (pasaporte, mora, pasos bloqueados, police checks, Parental Consent viejo), "Alumnos con acción urgente", viajes próximos y del próximo año, accesos rápidos. **Falta del PRD:** calendario visual de viajes, métricas históricas y resumen semanal por email. |
| **M3 · Colegios** | ✅ | `/colegios` | 02 §Módulo 3 | ABM con config documental por colegio (Requerido / Opcional / N-A) y tipo de entrada (ETA / VISA / ninguna). Sin ficha de detalle: alta y edición. |
| **M4 · Viajes** | ✅ | `/viajes`, `/viajes/<código>` | 02 §Módulo 4 | Grupal e individual, 4 tipos de representante, flujo de pago derivado, máquina de estados, confirmación automática al 5.º inscripto, filtros por año/país/colegio. Detalle con cupo, progreso de trámites, alertas, Group Leaders, alumnos, pasos M7 y pagos. Las transiciones por fecha (a *en curso* / *finalizado*) dependen del job diario → ver §5. |
| **M5 · Alumnos** | ✅ | `/alumnos`, `/alumnos/<dni>` | 02 §Módulo 5 | ABM, baja y reactivación, alta automática por el webhook del Google Form (idempotente por DNI), cuenta de familia y envío de acceso, asignación a un viaje desde la ficha, filtros por viaje/paso/alerta. **Falta:** importador de planillas (TEC-07, en `OPEN_DECISIONS.md`). |
| **Inscripciones (Application Form propio)** | 🟡 | `/inscripcion` (público), `/inscripciones` (bandeja) | 07 §Formulario de inscripción | **Hay:** formulario público al que se llega por un link tokenizado (el token lleva contexto de campaña, nunca datos personales), con honeypot y límites por IP, email y token; la ficha se guarda **siempre** en la tabla de aterrizaje `inscripciones`; acuse por mail a quien completa (sin datos sensibles) y aviso al equipo; bandeja con filtros, paginación y conteos por estado y por variante. **Alta automática (ADR-018):** con invitación válida, al enviar se crea el alumno pre-inscripto (canal `formulario_web`), se le arma la cuenta de familia y queda asignado al viaje de la campaña. Sin invitación, o si el alta tocaría una cuenta de familia existente, la ficha queda en revisión y la resuelve una persona desde la bandeja; un DNI ya cargado nunca modifica al alumno existente. El webhook del Google Form pasó a delegar en la misma implementación. **Invitaciones por lote:** desde `/prospectos/invitaciones` se arma una campaña (viaje + destinatarios) y cada prospecto recibe su propio link. El envío avanza por tandas **con la pantalla abierta** —Trigger.dev no está desplegado (§5)— y es reanudable: lo enviado no se reenvía. Excluye a los dados de baja y permite revocar un link filtrado. **Tres pieles** (Legajo / Cuaderno / Embarque) elegibles desde `/configuracion` con vista previa, pisables por campaña con `?v=`; la piel no cambia el formulario ni lo que se guarda, y cada ficha registra con cuál se cargó. **Falta:** el embudo, el borrado a pedido y la purga por retención (etapa 7). |
| **Group Leaders** | ✅ | `/group-leaders` | 02 §Módulo 7 (Paso 5) | ABM con police check. Asignación al viaje y GL principal desde el detalle del viaje, con advertencia si el police check no está aprobado o vence. |
| **Asignaciones** | ✅ | detalle del viaje y ficha del alumno | 02 §Módulo 4 y §Módulo 6 | Al asignar se genera el tablero M6 con los N/A automáticos y se valida el pasaporte; advertencias confirmables de cupo y pasaporte. |
| **M6 · Seguimiento del alumno** | ✅ | tablero en `/alumnos/<dni>` | 02 §Módulo 6 | Paso 0 + A1…D2, transiciones auditadas, sub-estados de ETA (C1) y Parental Consent (A3), bloqueo con motivo, fecha límite de A1 editable, documentos adjuntos, B1/B2 derivados del plan de cuotas, C2 se desbloquea con B1. Los recordatorios de A1/D1 y el paso a *vencido* dependen del job diario → §5. |
| **Cuotas y Pagos** | ✅ | `/pagos`, ficha del alumno, sección Pagos de `/viajes/<código>` | 02 §Módulo 6 (US-22, US-24) | Plan multi-moneda (default USD, CRIT-05 ⭐), mora derivada al día, registrar pago con fecha efectiva y observaciones (rechaza fechas futuras), advertencia de pago fuera de orden, resumen por moneda calculado en la base. |
| **M7 · Seguimiento del viaje** | 🟡 | pasos en `/viajes/<código>` | 02 §Módulo 7 | **Hay:** los 5 pasos (Pasajes, Excursiones, Transfers, Tarjeta de transporte, Police Checks), la dependencia Transfers ← Pasajes, sub-estados según viaje grupal o individual, cobertura por alumno en Transfers y Tarjeta, Police Checks derivado de los GLs del viaje. **Falta:** que el representante apruebe las excursiones desde su vista (CRIT-04 ⭐). Hoy el estado "Aprobada por representante" lo marca el equipo, porque la Vista del Representante no existe (§3). |
| **Usuarios** | ✅ | `/usuarios` (solo `super_admin`) | 02 §Módulo 1 (US-03) | Alta con link para crear contraseña, cambio de rol, activar/desactivar (no podés cambiarte el rol ni desactivarte). |
| **Configuración** | ✅ | `/configuracion` (solo `super_admin`) | `OPEN_DECISIONS.md` (MIN-09, TEC-04) | Remitentes de mail, envío de prueba y preview por template, **estado de servicios** (qué variables de cada integración están definidas en el deploy que estás mirando; no valida que la credencial funcione: un placeholder figura como OK). |
| **Consultas** (leads del sitio) | ✅ | `/consultas` | [`prd/07`](prd/07-prospectos-y-web-publica.md) §2 | Consultas de los formularios públicos, con cambio de estado auditado. Rate limit propio y aviso al equipo deduplicado. Los suscriptores del newsletter se guardan, pero **no tienen pantalla** para verlos, exportarlos ni borrarlos, y una consulta tampoco se puede borrar (retención y borrado a pedido: MIN-16). |
| **Prospectos** (CRM de colegios) | ✅ · envío pendiente | `/prospectos`, `/prospectos/<uuid>`, `/prospectos/importar` | [`prd/07`](prd/07-prospectos-y-web-publica.md) §3 | Kanban (con "Mover a…" en touch) y tabla, alta suelta/pegado/CSV, ficha con timeline, outreach por Resend con baja en `/baja` y tracking por webhook, conversión a colegio cliente. **El envío real** necesita lo de §7. |

## 2. Portal de Familias

Spec: [`prd/04-portal-familias.md`](prd/04-portal-familias.md). Rol `familia`, una cuenta por
grupo familiar (email del Tutor 1, MIN-07); el alumno se elige por DNI. Mobile-first.

| Módulo del PRD 04 | Estado | Pantalla | Qué hay · qué falta |
|---|---|---|---|
| Acceso y cuenta (§2) | ✅ | `/familias` → `/familias/<dni>` | Login con link para crear la contraseña, selector entre hermanos, aislamiento entre familias verificado por E2E. |
| M1 · Documentación requerida | ✅ | `/familias/<dni>/documentacion` | Pasos agrupados A/B/C/D, con una línea de qué es y quién lo hace. La familia sube A1/A3/D2, reporta el ETA (C1) y confirma D1. |
| M2 · Resumen de documentación (ficha) | ✅ | `/familias/<dni>` (Resumen) y `/familias/<dni>/datos` | Resumen con alertas accionables y progreso; "Mis datos" con aviso de pasaporte y "Reportar un dato incorrecto", que le llega al equipo por mail. |
| M3 · Resumen de pagos | ✅ | `/familias/<dni>/pagos` | Cuotas, abonado, saldo, filtro, detalle por cuota. El aviso de cuota vencida aparece en todas las pantallas. |
| M4 · Requisitos para el viaje | ❌ | — | No hay pantalla dedicada. |
| M5 · Test de nivel | — | — | Fuera de alcance v1 (lo dice el PRD). |
| M6 · Itinerario final | 🟡 | `/familias/<dni>/viaje` | Datos del viaje (destino, colegio, alojamiento, representante). El itinerario oficial es un placeholder ("lo publicamos más cerca de la salida"). |
| M7 · Diario de viaje | ❌ | "Pronto" en el menú | Depende de la Vista del Representante (MIN-04 abierto). |
| M8 · Certificado del curso | ❌ | "Pronto" en el menú | — |
| M9 · Encuesta (NPS) | ❌ | "Pronto" en el menú | — |
| M10 · Soporte y canal de comunicación | 🟡 | `/familias/<dni>/ayuda` | Canales reales (WhatsApp y mail con mensaje armado) y preguntas frecuentes. No hay mensajería dentro del portal (TEC-05). |
| M11 · Acceso post-viaje y próximas salidas | ❌ | — | La duración del acceso post-viaje sigue abierta (MIN-08). |

## 3. Vista del Representante

❌ **No construida.** Spec: [`prd/05-vista-representante.md`](prd/05-vista-representante.md). El
rol `representante` existe en la base, pero no hay ninguna pantalla para él. Falta todo: acceso,
calendario y actividades (incluidas la aprobación de excursiones de CRIT-04 ⭐ y las solicitudes de
cambio), mis estudiantes y diario de viaje.

## 4. Sitio público

Spec: [`prd/07-prospectos-y-web-publica.md`](prd/07-prospectos-y-web-publica.md) §1. No requiere
sesión (prefijos en `src/lib/routes.ts`).

| Pieza | Estado | Rutas / archivos | Notas |
|---|---|---|---|
| Landing e institucionales | ✅ | `/`, `/quienes-somos`, `/salidas`, `/programas`, `/contacto` | Fotos de la landing en WebP; las acreditaciones y el logo siguen en JPG/PNG. El banner de la próxima salida grupal se calcula y desaparece si no hay ninguna vigente. |
| Blog SEO | ✅ | `/notas`, `/notas/<slug>` (con imagen OG dinámica) | — |
| Formularios de consulta y newsletter | ✅ | `/consulta`, secciones de la landing | Rate limit propio. Las consultas caen en `/consultas` del back-office. |
| SEO técnico | ✅ | `sitemap.ts`, `robots.ts`, canonicals, JSON-LD, redirects del sitio Wix en `next.config.ts` | GA4 y Search Console se activan con `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_GSC_VERIFICATION`. |
| Desuscripción del outreach | ✅ | `/baja?token=…` | — |
| Política de privacidad | ✅ | `(public)/privacidad/`, `domain/privacidad/politica.ts` | Publicada y **versionada** (v1 `2026-09-16`): el texto vive en el dominio, cada consentimiento guarda qué versión se aceptó y el historial queda consultable. El checkbox del formulario de consulta la linkea. ⚠️ **Falta la revisión legal** y los datos registrales (razón social, CUIT, domicilio), que el código no puede saber: ver §7. Los plazos de retención ya están definidos en `domain/privacidad/retencion.ts`; la purga automática llega con la etapa 7 del módulo de inscripciones. |
| Separación de dominios (`portal.*` para la gestión) | 🟡 | `src/proxy.ts` | Preparada pero inactiva: se enciende con `NEXT_PUBLIC_PORTAL_URL` + `NEXT_PUBLIC_SITE_URL` y el DNS del subdominio. |

## 5. Servicios e integraciones

El estado de las credenciales **en un deploy** se ve en `/configuracion` → *Estado de servicios*.
Lo de abajo es lo que se puede afirmar desde el repo (config, código y el `.env.local` de desarrollo).

> **Variables en Vercel Production (15/09/2026).** El proyecto `agusiglesias72s-projects/jovenesuk`
> tiene cargadas por nombre: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`,
> `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`,
> `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`, las cuatro `R2_*`,
> `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_ID` y `GOOGLE_FORM_WEBHOOK_SECRET` (desde junio);
> `LEADS_NOTIFY_TO` (**provisoria**: el Gmail del dueño hasta tener el dominio) y las cuatro de Sentry
> (desde el 15/09). Se sacó `NEXT_PUBLIC_ENABLE_TWEAK`, que estaba en Production. Faltan
> `EMAIL_FROM_COMUNICACIONES`, `EMAIL_FROM_OUTREACH` y `RESEND_WEBHOOK_SECRET` (esperan el dominio de
> mails; un remitente `@gmail.com` haría fallar los envíos, porque Resend solo manda desde un dominio
> verificado) y `NEXT_PUBLIC_PORTAL_URL` (opcional).
> Desde afuera solo se ven los nombres: Vercel no devuelve los valores encriptados, así que **no se
> puede afirmar desde acá que R2, Resend y Trigger tengan credenciales reales y no los moldes de
> `.env.example`**. Eso se confirma en `/configuracion` del deploy, o subiendo un documento de prueba.

| Servicio | Código | Estado |
|---|---|---|
| **Neon (Postgres)** | ✅ `src/lib/db/`, migraciones `drizzle/0000…0019` | Proyecto `jovenes-uk` (`snowy-pine-02594515`, sa-east-1), dado de alta **por la integración de Vercel** (organización de Neon *"Vercel: agusiglesias72's projects"*: se factura por Vercel). Branches: `main` (default), `dev` (la del `.env.local`, con datos reales) y `ci-base` (padre del CI: estructura y registro de migraciones, **sin datos**). |
| **Better-Auth** | ✅ `src/lib/auth/` | Operativo. |
| **Webhook del Google Form** | ✅ `api/webhooks/google-form` | Necesita `GOOGLE_FORM_WEBHOOK_SECRET` en el deploy y el form apuntando al endpoint. |
| **Trigger.dev (jobs)** | ✅ `src/trigger/`: `daily-reminder-scan` (cron 09:00 UTC = 06:00 ART: transiciones de viajes por fecha + recordatorios), `run-reminder-scan` (manual, con dry-run), `notificar-cancelacion-viaje`, `notificar-consulta-nueva` | ⚠️ **No desplegado.** En el repo no hay deploy de Trigger (el CI no lo corre, `trigger.config.ts` cae a un placeholder sin `TRIGGER_PROJECT_ID`, y las credenciales de dev son placeholders). Consecuencias mientras siga así: **no hay recordatorios automáticos, A1 no pasa solo a *vencido* y los viajes no pasan solos a *en curso* / *finalizado***. El aviso por cancelación de un viaje no sale (la cancelación sí se hace y el error va a Sentry). El aviso de consulta nueva cae a un envío directo. |
| **Cloudflare R2 (documentos)** | ✅ `src/lib/storage/` | En dev usa el fallback a disco `.uploads/`: directo si alguna `R2_*` está vacía, o después de un intento fallido contra R2 (con un `console.error`) si tienen placeholders. **En producción sin R2 la subida falla a propósito** (`StorageNoConfiguradoError`): no se guardan pasaportes en el disco efímero de Vercel. |
| **Resend (mails)** | ✅ `src/lib/email/` | Dry-run con `EMAIL_DRY_RUN=1`, o implícito fuera de producción si `RESEND_API_KEY` está **vacía o ausente**. Un placeholder (el de `.env.example`, que es el que tiene hoy el `.env.local` de dev, sin `EMAIL_DRY_RUN`) desactiva el dry-run y los envíos fallan con `EmailEnvioError`. **Outreach de Prospectos**: sin `EMAIL_FROM_OUTREACH` ni `RESEND_WEBHOOK_SECRET`, y sin el DNS de `mkt.jovenesenuk.com` (§7). |
| **Sentry** | ✅ `src/instrumentation*.ts`, CSP en `next.config.ts` | **Conectado en producción (15/09/2026)**: organización `aiglesias`, proyecto `javascript-nextjs` (región US). DSN, org, proyecto y token de CI en Vercel; el build sube los source maps con el release = commit (verificado en el log: *Uploaded files to Sentry*). Fuera de producción sigue desactivado (sin DSN en `.env.local`). |
| **Vercel** | ✅ `vercel.json` (región `gru1`) | Root Directory = `juk-portal`. Operación en `../../.claude/docs/04-operacion-y-handoff.md`. |

## 6. Mobile

| Pieza | Estado | Notas |
|---|---|---|
| Web responsive (back-office y familias) | ✅ | Tablas en modo tarjeta, piso de 16px en controles, objetivos de 44px, drawer con foco atrapado, safe areas. Specs `@mobile` en Playwright. |
| PWA instalable | ✅ | `src/app/manifest.ts`, `public/sw.js` (se registra solo en producción; nunca cachea `/api` ni auth), `/offline`. |
| App nativa (Capacitor) | ❌ bloqueada | Plan, template de config y runbooks en [`mobile-app/`](mobile-app/README.md). Capacitor no está instalado. Bloqueada por lo que depende del dueño: [`mobile-app/BLOQUEADO-POR-VOS.md`](mobile-app/BLOQUEADO-POR-VOS.md). |

## 7. Lo que depende del dueño

Nada de esto lo puede hacer el código: son cuentas, DNS, credenciales o decisiones. El paso a paso
de cada uno —dónde hacer clic, qué pegar y cómo verificar que quedó— está en
[`setup-servicios.md`](setup-servicios.md). Para ver en cualquier momento qué falta:
`npm run check:env:prod`.

- [ ] **Bucket R2 privado en Cloudflare** (sin dominio público ni `r2.dev`) y en Vercel
  `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (sin `R2_PUBLIC_URL`).
  *Destraba:* la subida de documentos en producción.
- [ ] **Trigger.dev**: crear el proyecto, correr `npm run trigger:deploy`, cargar
  `TRIGGER_SECRET_KEY` y `TRIGGER_PROJECT_ID` en Vercel, y en el entorno del proyecto de Trigger
  las variables que usan los jobs (`DATABASE_URL`, `RESEND_API_KEY` y remitentes). Verificar con una
  corrida de `run-reminder-scan` con `enviarEmails: false`. *Destraba:* recordatorios, vencimiento
  de A1, transiciones de viajes por fecha, aviso de cancelación.
- [x] **Sentry** (15/09/2026): DSN y source maps en producción (§5). Queda dejar correr una o dos
  semanas los reportes de la CSP antes de pasarla a enforce.
- [ ] **Resend, outreach de Prospectos**: alta del dominio `mkt.jovenesenuk.com` con sus registros DNS
  (SPF/DKIM/return-path) en Cloudflare; `EMAIL_FROM_OUTREACH` y `RESEND_WEBHOOK_SECRET` en Vercel;
  webhook de Resend apuntando a `/api/webhooks/resend`. *Destraba:* el envío y el tracking del CRM.
- [x] **Neon en GitHub** (15/09/2026): secret `NEON_API_KEY` (key acotada al proyecto `jovenes-uk`,
  nombre `github-actions-ci-jovenesuk`) y variables `NEON_PROJECT_ID` y `NEON_PARENT_BRANCH=ci-base`.
  Cómo se armó `ci-base`, en [`setup-servicios.md` §2](setup-servicios.md#2-secrets-de-neon-en-github--ci).
- [ ] **GitHub Pro** (o repo público), para una branch protection que exija el CI en verde. Sin eso
  el CI informa, pero no bloquea merges.
- [ ] **Dominio definitivo**: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PORTAL_URL` y el DNS de
  `portal.*`, si se quiere la separación de dominios (§4).
- [ ] **App nativa**: appId, URL de producción, cuentas de Google Play y Apple Developer, una Mac
  con Xcode y el keystore de Android. Checklist en [`mobile-app/BLOQUEADO-POR-VOS.md`](mobile-app/BLOQUEADO-POR-VOS.md).
- [ ] **Revisión legal de la Política de Privacidad** ya publicada en `/privacidad` (§4). El texto
  describe lo que el sistema hace hoy, pero necesita: razón social, CUIT y domicilio del responsable;
  confirmación de con quién se comparten los datos de salud fuera del sistema (hoy dice colegio o
  alojamiento en destino, acompañante y servicio médico ante una urgencia); si hace falta banner de
  cookies; y si la AAIP exige algo más para la transferencia internacional. Al cambiar el texto hay
  que **subir la versión** en `domain/privacidad/politica.ts` (lo exige su test).
- [ ] **Validar con el equipo las decisiones ⭐** CRIT-04 y CRIT-05 y responder las abiertas de
  [`../OPEN_DECISIONS.md`](../OPEN_DECISIONS.md).

## 8. Calidad

Cómo correr cada suite y el porqué de sus reglas: [`../../.claude/docs/05-testing.md`](../../.claude/docs/05-testing.md).

| Pieza | Estado |
|---|---|
| Unit + cobertura (`npm run test:coverage`) | ✅ Piso en `vitest.config.ts`: líneas 94 · statements 94 · funciones 95 · ramas 90. Medido el 10/09/2026: 97,8% de líneas y 95% de ramas sobre `src/lib/domain`, `utils` y `actions`. |
| Test compañero (`npm run check:tests`) | ✅ En el pre-push y en el CI. |
| Integración (`npm run test:integration`) | ✅ Solo corre con `INTEGRATION_DATABASE_URL`. |
| E2E (`npm run test:e2e`) | ✅ Proyectos `setup` (con su teardown `cleanup`, que limpia los datos de la corrida), `setup-familia`, `chromium`, `mobile` (`@mobile`), `familias` y `public`. |
| Hook pre-push | ✅ Opt-in: `npm run hooks:install`. |
| CI · job `check` | ✅ En cada push y PR a `main`: typecheck, lint, cobertura con piso, `check:tests`, `npm audit --omit=dev --audit-level=high` y `next build`. |
| CI · job `e2e` | ✅ Configurado y probado (15/09/2026: 33 de integración y 142 E2E en verde, 31 min). **Solo corre a mano** en GitHub, por costo. Quedó marcado como *flaky* `viajes-estado.spec.ts` ("la edición de viaje solo ofrece transiciones válidas"): pasó al reintentar, sin diagnosticar. |
| CI en local (`npm run ci:local`) | ✅ La misma suite en la máquina del dueño, sobre una branch efímera de Neon hija de `ci-base`. Es la forma habitual de correr integración + E2E. |

## 9. Deuda conocida

Lo que las fases dejaron anotado como pendiente. Al saldar un ítem se borra de acá y se anota en el CHANGELOG.

1. **react-email 3 → 6.** La vulnerabilidad crítica que reporta `npm audit` viene del Next.js que
   empaqueta `react-email`, una devDependency que solo usa `npm run email:dev`. Los mails de
   producción usan `@react-email/components` y `@react-email/render`. Es un salto mayor que toca las
   plantillas. *(075abe3, d9821f8)*
2. **`overrides` de `package.json`** (`ws`, `socket.io-parser`, `fast-uri`, y `brace-expansion`
   acotado a `@sentry/bundler-plugin-core`): fijan transitivas parcheadas que npm no re-resuelve
   solo. Se sacan cuando `@trigger.dev/core` publique una versión con `socket.io-client` al día y
   Sentry actualice sus plugins de build. El porqué de cada entrada está en
   [`../../.claude/docs/04-operacion-y-handoff.md` § Dependencias](../../.claude/docs/04-operacion-y-handoff.md#dependencias). *(d9821f8)*
3. **Vulnerabilidades moderadas y bajas** en el grafo de producción (23 al 10/09), sin fix publicado
   o con fix solo por un salto mayor del paquete padre. El CI no las bloquea. *(d9821f8)*
4. **`npm update` y `npm audit fix` crashean** ("Cannot read properties of null (reading
   'edgesOut')", un bug de arborist con un peer `vitest@*`). Mientras tanto, se actualiza con
   `npm install <paquete>@<versión>`. *(d9821f8)*
5. **CSP en Report-Only.** Para pasarla a enforce: DSN de Sentry cargado, 1-2 semanas sin
   violaciones, y reemplazar `'unsafe-inline'` de `script-src` por nonces o hashes. El plan está en
   el comentario de `next.config.ts`. *(fdf8e20)*
6. **Guarda de tokens de lint en `warn`** con 0 avisos y 0 usos del puente: queda subirla a `error`
   y borrar el puente `juk-navy/coral/gold` de `tailwind.config.ts`. *(b637764)*
7. **`GlobeLoader` y `public/globe-loader.html` sin uso** (decisión del 12/06/2026: se le busca un
   lugar después). Su `<script>` inline estático no puede llevar nonce, así que es uno de los inline
   que impiden sacar `'unsafe-inline'` de la CSP, junto con el JSON-LD y el init de GA4 (ver el
   comentario de `next.config.ts`): borrarlo solo no alcanza. Decidirle un lugar o borrarlo.
8. **Tabla `alertas` en el schema sin uso**: ninguna query la importa (las alertas se derivan en
   `domain/alertas`). Materializarla o borrarla con una migración: TEC-16 en
   [`../OPEN_DECISIONS.md`](../OPEN_DECISIONS.md).
9. **Cobertura con un punto ciego**: `index.ts` está excluido por contrato, pero
   `domain/configuracion/`, `domain/documentos/` y `domain/recordatorios/` tienen lógica en su
   `index.ts`, que no entra en el número. Moverla a archivos propios con su test. *(0b73eaf)*
10. **Sub-estados viejos del M7** (Pasajes/Excursiones): se traducen al leer y se normalizan al
    guardar, sin migración, para poder revertir mientras CRIT-04 ⭐ siga sin validar. Cuando se
    valide, migrar los datos y borrar `PASAJE_SUBESTADO_LEGACY`. *(72d596c)*
11. **`db:seed` con el email del super_admin hardcodeado** (`SEED_EMAIL` en `src/lib/db/seed.ts`):
    imprime la contraseña temporal en consola.
12. **Decisiones de producto que abrieron los tests**: reactivación de la cuenta de familia
    (MIN-24), C1 auto-aprobado o vuelto atrás por la familia (MIN-25), estados de C1/A3 fijados a
    mano (MIN-26), plan de cuotas al reinscribir una asignación cancelada (MIN-27), DNI con puntos
    por webhook (TEC-12), unicidad de "última cuota" solo en la query (TEC-13), reintentos de
    recordatorios fallidos (TEC-14) y transición por fecha en dos saltos (TEC-15). En todos, el código hace algo razonable hoy, pero la regla la tiene que
    definir el equipo. Detalle y opciones en [`../OPEN_DECISIONS.md`](../OPEN_DECISIONS.md). *(0b73eaf)*
