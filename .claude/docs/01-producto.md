# 01 · Producto

> Qué es y para qué sirve cada parte. **No** lleva estado ni historial:
> qué está hecho y qué falta → [`docs/estado-actual.md`](../../juk-portal/docs/estado-actual.md) ·
> cuándo cambió cada cosa → [`CHANGELOG.md`](../../juk-portal/CHANGELOG.md) ·
> la spec funcional completa → [`docs/prd/`](../../juk-portal/docs/prd/00-indice.md).

## Qué es

**Jóvenes en UK (JUK)** es una agencia argentina que organiza viajes de estudio de inglés a Reino
Unido y otros destinos de habla inglesa, en salidas grupales e individuales. El **JUK Portal** es
su sistema de gestión: una sola app Next.js, con una sola base de datos, que tiene tres superficies.

| Superficie | Rutas | Para quién |
|---|---|---|
| **Back-office** (portal interno) | `/dashboard`, `/alumnos`, `/viajes`, … | El equipo de JUK |
| **Portal de Familias** | `/familias`, `/familias/<dni>/…` | Tutores de los alumnos |
| **Sitio público** | `/`, `/quienes-somos`, `/salidas`, `/programas`, `/contacto`, `/consulta`, `/notas` | Familias y colegios que todavía no son clientes |

Comparten el login (`/login`, `/reset-password`). Hay dos páginas sueltas sin sesión: `/baja`
(darse de baja del outreach, con el token del mail) y `/offline` (la que muestra la PWA sin
conexión). La app se instala como PWA en el teléfono; el plan para publicarla en las stores está
en [`docs/mobile-app/`](../../juk-portal/docs/mobile-app/).

## Quién lo usa

Los roles son el enum `user_role` de `src/lib/db/schema/users.ts`; a dónde entra cada uno lo define
`HOME_BY_ROLE` en `src/lib/routes.ts`.

| Rol | Quién | Qué ve |
|---|---|---|
| `super_admin` | Dirección del equipo | Todo el back-office, más **Usuarios** y **Configuración** |
| `admin_juk` | Equipo operativo | Todo el back-office menos Usuarios y Configuración |
| `familia` | Tutor 1 del alumno. Su email es la identidad de la cuenta (decisión MIN-07) y una cuenta puede tener varios alumnos | Solo el Portal de Familias, y solo sus alumnos |
| `representante` | Representante del viaje (spec [`docs/prd/05`](../../juk-portal/docs/prd/05-vista-representante.md)) | **Todavía sin portal.** El valor existe en el enum, pero no se puede crear desde `/usuarios` (`src/lib/domain/usuarios/schema.ts` solo admite `admin_juk` y `super_admin`) y no tiene a dónde entrar: `HOME_BY_ROLE` lo manda a `/dashboard`, que exige un rol de admin, y `requireRole` lo devuelve a su home, o sea otra vez a `/dashboard` (loop de redirects). No crees usuarios con este rol a mano en la base |

No hay registro público (`/api/auth/sign-up` responde 404). Las cuentas se crean así:

- **Equipo:** lo da de alta un `super_admin` desde `/usuarios`, y la persona recibe **en ese
  momento** un link para crear su contraseña (se puede reenviar desde la misma pantalla).
- **Familias:** la cuenta se crea **sola** al dar de alta al alumno, a mano (`createAlumnoAction`)
  o por el webhook del Application Form (`asegurarCuentaFamilia` en
  `src/lib/db/queries/familias.ts`). Si el email del Tutor 1 ya es la cuenta de otra familia, la
  vincula; si es el email de alguien del equipo, no crea nada. **En ese momento no se avisa a
  nadie.** El link para crear la contraseña sale recién cuando el equipo toca "Enviar acceso" en
  la ficha del alumno (`enviarAccesoFamiliaAction`, se puede reenviar sin tocar la contraseña
  vigente). Si al enviar resulta que ese email ya es la cuenta de otros alumnos, pide confirmar
  el vínculo antes. El envío queda registrado en el alumno (`marcarAccesoEnviado`).

Nadie conoce esas contraseñas, ni el `super_admin`. La única excepción es el `super_admin` inicial
que crea `npm run db:seed`, que imprime una contraseña temporal en la terminal (detalle en
[06-seguridad](06-seguridad.md)).

Los **group leaders** son una entidad del negocio (tienen su propio ABM). No son usuarios del sistema.

## Back-office

| Módulo | Ruta | Para qué sirve |
|---|---|---|
| **Dashboard** | `/dashboard` | Qué hay que hacer hoy: alumnos con acción urgente (pasos vencidos o trabados, pasaporte en alerta, cuota en mora), alertas, viajes próximos y del año que viene, accesos rápidos. Cada número lleva al listado ya filtrado. |
| **Alumnos** | `/alumnos` · ficha `/alumnos/<dni>` | Datos personales, pasaporte, tutores y facturación. La ficha tiene el tablero M6 por viaje, el plan de cuotas, los documentos adjuntos, la asignación a un viaje y el acceso al Portal de Familias. |
| **Viajes** | `/viajes` · detalle `/viajes/<código>` | Salidas grupales e individuales. El detalle tiene alertas del viaje, inscriptos (asignar y quitar, con validación de pasaporte y cupo), group leaders, pagos del viaje y el seguimiento M7. |
| **Colegios** | `/colegios` | Colegios destino (qué documentación pide cada uno y si piden ETA, VISA o nada) y colegios cliente (directorio). |
| **Prospectos** | `/prospectos` | CRM comercial de colegios: kanban o tabla, importación por CSV, outreach por mail con seguimiento de entrega y apertura, y "convertir en colegio cliente". |
| **Group Leaders** | `/group-leaders` | Alta y edición de los group leaders, con el seguimiento del police check. |
| **Pagos** | `/pagos` | Todas las cuotas, con la mora derivada, filtros, resumen por moneda y registro de pagos. |
| **Consultas** | `/consultas` | Los leads que entran por el sitio público y en qué estado están. |
| **Usuarios** | `/usuarios` (solo `super_admin`) | Alta del equipo (con link para crear la contraseña), reenviar el acceso, cambio de rol, activar y desactivar. |
| **Configuración** | `/configuracion` (solo `super_admin`) | Remitentes de mail, envío de prueba de cada template, estado de los servicios externos. Cualquier usuario del back-office cambia su contraseña en `/configuracion/cuenta`. |

## Portal de Familias

`/familias` lleva directo a la ficha si la cuenta tiene un solo alumno. Si tiene varios, primero
se elige. Dentro de `/familias/<dni>/`:

| Sección | Para qué sirve |
|---|---|
| Resumen | El estado general del viaje del alumno |
| Viaje | Datos del viaje y sus responsables |
| Documentación | Los trámites A/B/C/D explicados en criollo. La familia sube documentos, reporta el estado de su ETA (incluido "tuve un problema") y confirma la autorización ante escribano (D1). Subir un documento o confirmar no reabre un paso que el equipo ya dio por completado. Excepción abierta: el ETA (C1) es autoreporte, y hoy la familia puede marcarlo Aprobado sin revisión o volver un Aprobado a Pendiente (MIN-25 en [`OPEN_DECISIONS.md`](../../juk-portal/OPEN_DECISIONS.md)) |
| Pagos | Las cuotas y su estado. Si hay una cuota vencida, el aviso aparece en todas las pantallas |
| Datos | Los datos del alumno, con la opción de reportar uno incorrecto (le llega al equipo por mail) |
| Ayuda | Canales de contacto y preguntas frecuentes |

## Sitio público

Spec: [`docs/prd/07-prospectos-y-web-publica.md`](../../juk-portal/docs/prd/07-prospectos-y-web-publica.md)
(cubre también Consultas y Prospectos, que no tienen PRD de producto).

Es el sitio de marketing y la entrada de clientes nuevos. Tiene páginas institucionales, la próxima
salida grupal (calculada, no fija), notas para SEO, el formulario de consulta (crea una consulta y
le avisa al equipo) y la newsletter. Las URLs del sitio viejo en Wix redirigen con 301
(`next.config.ts`). Si se configura `NEXT_PUBLIC_PORTAL_URL`, la gestión se sirve en el subdominio
`portal.*` y el marketing en el dominio raíz (`src/proxy.ts`).

## Lo que corre solo

| Qué | Dónde | Qué hace |
|---|---|---|
| Webhook del Application Form (Google Form) | `src/app/api/webhooks/google-form/route.ts` | Da de alta al alumno como pre-inscripto y le crea la cuenta de familia (sin mandar el acceso). Si el link del form trae el código de un viaje con inscripción abierta o confirmado y con cupo, lo asigna. Si no, queda pre-inscripto y el equipo decide: la sobre-capacidad nunca se acepta sola. Si el DNI ya existe, no duplica nada. |
| Webhook de Resend | `src/app/api/webhooks/resend/route.ts` | Registra la entrega, apertura, click, rebote o spam de los mails de outreach de Prospectos. |
| Asignación a un viaje | `asignarConTablero` en `src/lib/db/queries/asignar-alumno.ts` | Al asignar un alumno se crea su tablero M6 (con los pasos que no aplican ya en N/A) y un viaje grupal se confirma solo al llegar al quinto inscripto. |
| Scan diario (Trigger.dev) | `src/trigger/reminders.ts` → `daily-reminder-scan` | Todos los días a las 06:00 ART pasa los viajes de estado según la fecha y manda los recordatorios escalonados (14, 7, 3 y 1 días antes de cada fecha límite, y al vencer). No repite envíos. `run-reminder-scan` corre a mano **solo los recordatorios**, sin las transiciones de viajes; con `enviarEmails: false` hace un dry-run que registra sin mandar mails. Decisiones abiertas: un envío que falla no se reintenta (TEC-14) y un viaje confirmado con fin ya pasado tarda dos corridas en llegar a finalizado (TEC-15), ambas en [`OPEN_DECISIONS.md`](../../juk-portal/OPEN_DECISIONS.md). |
| Aviso de consulta nueva | `submitLead` en `src/app/(public)/leads/actions.ts` → task `notificar-consulta-nueva` (`src/trigger/leads.ts`) | Mail al equipo (`LEADS_NOTIFY_TO`) por cada consulta del sitio. La action no avisa dos veces por el mismo email y modalidad en 24 h (la consulta se guarda igual). Encola el task y, si Trigger.dev no responde o no está configurado, manda el mail directo. |
| Aviso de cancelación | `src/trigger/viajes.ts` | Mail a las familias de los inscriptos cuando se cancela un viaje. |

## Glosario del dominio

La definición completa está en [`docs/prd/01-vision-y-dominio.md`](../../juk-portal/docs/prd/01-vision-y-dominio.md).
Lo mínimo para leer el código:

- **Asignación**: un alumno inscripto en un viaje. Cada asignación tiene su tablero M6 y su plan de cuotas.
- **M6 · tablero del alumno** (`src/lib/domain/pasos/codigos.ts`): Paso 0 (cómo llegó el alumno) +
  **A** Inscripción y programa (A1 Application Form del colegio, A2 Test de nivel, A3 Parental
  Consent) · **B** Pagos (B1 Plan de cuotas, B2 Último pago presencial) · **C** Documentación de
  viaje (C1 ETA, C2 Immigration Letter, C3 Accommodation Letter) · **D** Documentación legal
  argentina (D1 Autorización ante escribano, D2 Certificado psicofísico).
- **M7 · seguimiento del viaje** (`src/lib/domain/pasos-viaje/estados.ts`): pasajes, excursiones,
  transfers, tarjeta de transporte y police checks de los group leaders.
- **Tipo de viaje**: grupal (con group leaders, cupo de 12 por GL, se confirma solo al quinto
  inscripto) o individual (sin GL, cupo 1, nace confirmado).
- **Tipo de representante** (atributo del viaje): Independiente, Instituto, Colegio cliente o JUK
  directo. Define el flujo de pago; por ejemplo, si B2 aplica o queda en N/A.
- **Colegio destino / colegio cliente**: el destino es donde se estudia (en UK u otro país) y fija
  la documentación. El cliente es la institución argentina que manda el grupo.
- **Cuotas**: multi-moneda (USD, GBP o ARS), USD por defecto. Es la decisión CRIT-05, pendiente
  de validar con el equipo ([`OPEN_DECISIONS.md`](../../juk-portal/OPEN_DECISIONS.md)).
- **Pasaporte para UK**: tiene que estar vigente hasta el fin del viaje (sin los 6 meses extra que
  piden otros países).

## Para seguir

- Cómo está armado el código → [02-arquitectura-y-convenciones](02-arquitectura-y-convenciones.md)
- Qué falta y qué depende del dueño → [`docs/estado-actual.md`](../../juk-portal/docs/estado-actual.md)
- Decisiones abiertas → [`OPEN_DECISIONS.md`](../../juk-portal/OPEN_DECISIONS.md)
