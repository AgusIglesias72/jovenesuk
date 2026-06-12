# 01 · Producto

## Qué es

**JUK Portal** es el back-office interno de **Jóvenes en UK (JUK)**, una agencia argentina que organiza
viajes de estudio de inglés a UK (y otros destinos). Lo usa el equipo operativo de JUK (4 personas) para
gestionar colegios, viajes, alumnos, group leaders, pagos y el seguimiento de trámites de cada alumno.

No es un producto de cara al cliente: hoy es solo el portal interno (`admin`). Más adelante se suman
dos portales que comparten el mismo modelo de datos: el del **Representante** (group leader) y el de las
**Familias**. Por eso la arquitectura separa la lógica de negocio del framework (ver doc 02).

## Roles

Modelados en la tabla `users` (campo `role`):

| Rol | Quién | Acceso |
|---|---|---|
| `admin_juk` | Equipo interno (Felix, Delfina, Tomás…) | Todo el portal admin |
| `super_admin` | Admin que además gestiona usuarios (María) | Todo + sección Usuarios |
| `representante` | Group leader externo | Futuro portal (tablas ya existen) |
| `familia` | Alumno/tutor | Futuro portal (tablas ya existen) |

Los usuarios desactivados (`isActive = false`) no pueden entrar aunque tengan sesión válida
(se enforza en `requireSession`).

## Módulos

### Construidos y funcionando
- **Auth** — login, reset de password (Better-Auth + Resend).
- **Dashboard** — conteos reales (viajes por estado, alumnos) + viajes próximos. Las alertas son
  placeholder (su generación automática es fase posterior).
- **Colegios** — ABM de colegios destino y cliente.
- **Viajes** — ABM de salidas grupales (código, fechas, origen, destino, capacidad GL×12, estado).
- **Alumnos** — ABM con datos personales, pasaporte, tutores, facturación; baja/reactivación.
- **Group Leaders** — ABM con datos + seguimiento del police check.
- **Usuarios** (solo super_admin) — alta de admins con password temporal, cambio de rol, activar/desactivar.
- **Asignaciones** — detalle del viaje (`/viajes/[id]`) con su roster: asignar/quitar alumnos, control de
  cupo (GL×12) y validación de pasaporte. NO genera cuotas ni pasos del alumno todavía (eso es lo gated).
- **Seguimiento M7** (pasos del viaje) — strip de los 5 pasos en el detalle del viaje, máquina de estados
  con dependencia (Transfers ← Pasajes), metadata tipada por paso y audit log. *Police Checks* es derivado
  del police check de cada Group Leader del viaje. Falta: asignar GLs al viaje desde la UI (la FK ya existe)
  y el upload de archivos a R2 (hoy las URLs de e-ticket/comprobante son manuales).

### Pendientes (marcados "Pronto" en la nav o sin entrada)
- **Pagos / cuotas** — bloqueado por CRIT-01 (ver abajo).
- **Seguimiento M6** (10 pasos por alumno) — Application Form, Immigration Letter, ETA, Parental Consent,
  etc. Paso 2/10 (pagos) bloqueado por CRIT-01; Paso 9 (psicofísico) por CRIT-03.
- **Asignación de Group Leaders al viaje** (UI) — habilita el cálculo real del paso Police Checks del M7.
- **Upload de archivos a R2** — infra de almacenamiento (no existe todavía); hoy los docs van como URL manual.
- **Configuración**, **recordatorios automáticos** (Trigger.dev), **alertas** dinámicas.

## Decisiones de negocio abiertas (gating)

**Los 3 CRITs históricos (pagos NEA, pasaporte UK, psicofísico) quedaron RESUELTOS por los PRDs
de junio 2026** — la regla vigente está en las specs de `juk-portal/docs/prd/`. Los gates
vigentes hoy son dos contradicciones entre PRDs (detalle en `juk-portal/OPEN_DECISIONS.md`):

| Gate | Qué bloquea |
|---|---|
| **CRIT-04** — ¿el representante aprueba excursiones o solo solicita cambios? | El mecanismo de aprobación del Paso 2 del M7 y el modelo `ACTIVIDAD_VIAJE`/`SOLICITUD_CAMBIO` |
| **CRIT-05** — moneda del plan de cuotas (¿USD, GBP, multi?) | El schema de cuotas (B1/B2) y el resumen de pagos |

El trigger de asignación (crear los 11 pasos del M6 + validar pasaporte) ya NO está bloqueado;
solo la parte de cuotas espera CRIT-05.

## Specs de producto

La referencia funcional completa vive en **`juk-portal/docs/prd/`** (empezar por `00-indice.md`):
los 4 PRDs de junio 2026 convertidos en `fuentes/` + specs internas consolidadas (visión,
portal interno M1–M7, modelo de datos objetivo, Portal de Familias, Vista del Representante)
+ el gap analysis con plan de adecuación (`06-deltas-implementacion.md`).

## Estado (junio 2026)

Fase 0-1 completas. ABMs de Colegios, Viajes, Alumnos, GLs y Usuarios; M7 parcial. PRDs
procesados (11/06/2026) y decisiones tomadas: cero gates ROJOS. **Fundaciones del modelo
completas (12/06/2026)**: tipo_viaje + JUK directo + flujo de pago derivado, config documental
por colegio, tablero Paso 0 + A1…D2, lockout de login, y el **trigger de asignación** (crea los
11 pasos con N/A automáticos + valida pasaporte + auto-Confirmado al 5°). **Dirección visual
STUDIO aplicada** a toda la app (tokens del lab como fuente de verdad, components/ui, shell y
auth). **Tablero M6 con UI** en `/alumnos/[id]` (transiciones validadas + auditadas),
**cuotas B1/B2 completas** (multi-moneda, sync de pasos, C2 se desbloquea con B1) y
**dashboard v2 con alertas reales** (pasaporte, mora, bloqueados, police checks). Cuentas de
test (`test.superadmin@` / `test.admin@`, password fija dev) + `npm run db:seed:demo` con
dataset que cubre todas las ramas. **Webhook del Google Form** (alta + auto-asignación,
idempotente), **credenciales del Portal de Familias** (generar/enviar/desactivar),
**documentos** (R2 con fallback local + proxy autenticado, adjuntos en los pasos),
**transfers/tarjetas por alumno** (M7) y **recordatorios** (notificaciones_enviadas con dedup,
scan diario en Trigger.dev — el servicio Trigger.dev aún no está conectado; la lógica está
validada). **Auditoría adversarial (12/06/2026)**: 55 hallazgos → 32 confirmados → todos los bugs de
lógica/seguridad arreglados (mora UTC, metadata C2, sign-up público bloqueado, ownership
server-side, TOCTOU) y los gaps de spec implementados (sub-estados ETA/A3, filtro por alerta,
viajes del próximo año, alerta PC >12m, re-validación de pasaportes al editar fechas,
notificación al cancelar, transiciones automáticas por fecha, fecha de cambio de pasaporte).
E2E del recorrido completo del negocio; suite 30/30, 116 unit. Backlog UX: reemplazar
window.confirm/prompt por un modal del design system, guard de cambios sin guardar.
Próximo: conectar Trigger.dev y credenciales reales de R2 (las actuales parecen placeholders),
resumen semanal, calendario del dashboard, portales externos (Familias/Representante).
