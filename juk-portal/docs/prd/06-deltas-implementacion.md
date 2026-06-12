# 06 · Deltas PRD ↔ implementación y plan de adecuación

> Cruza las specs 01–05 (PRDs junio 2026) contra el código del repo al 11/06/2026.
> El detalle campo por campo del modelo está en [03-modelo-datos.md](03-modelo-datos.md)
> (sección "Delta vs. implementación actual"). Acá está la vista consolidada y el plan.

## Resumen ejecutivo

El portal interno implementado (ABMs de Colegios, Viajes, Alumnos, GLs, Usuarios, dashboard,
asignaciones, seguimiento M7 parcial) está **bien encaminado pero modelado contra los PRDs
viejos (v1.3 / Modelo v1.1)**. Los PRDs nuevos:

1. **Desbloquean** los 3 CRITs (pagos, pasaporte, psicofísico) → se puede construir Pagos,
   la validación de pasaporte definitiva y el tablero M6 completo.
2. **Cambian estructura**: M6 pasa de 10 pasos lineales a **Paso 0 + Grupos A/B/C/D**;
   aparece `tipo_viaje` (Grupal/Individual); el tipo de representante pasa a 4 valores con
   flujo de pago calculado; la configuración documental por colegio reemplaza flags
   hardcodeados; 7 tablas nuevas.
3. **Agregan alcance**: NPS, calendario visual, métricas históricas, resumen semanal,
   credenciales de Portal de Familias, webhook del Google Form, recordatorios escalonados.

## A — Deltas del modelo de datos (lo más estructural)

Detalle completo en doc 03. Los 8 grupos, en orden de impacto:

| # | Delta | Hoy en el repo | Objetivo (Modelo v1.7) |
|---|---|---|---|
| 1 | **7 tablas faltantes** | — | `CUENTA_FAMILIAS`, `NPS_RESPUESTA`, `ACTIVIDAD_VIAJE`, `SOLICITUD_CAMBIO`, `POLICE_CHECK` (hoy inline en `group_leaders`), `ENTRADA_DIARIO`, `MENSAJE_DIARIO` |
| 2 | **REPRESENTANTE mal modelado** | `group_leaders` sin `tipo`; `viajes.origen` modela el tipo de representante en el lugar equivocado | `REPRESENTANTE.tipo` ENUM (Independiente \| Instituto \| Colegio_cliente \| JUK_Directo) + vínculo a cuenta + fee |
| 3 | **VIAJE incompleto** | sin `tipo_viaje`, `id_representante`, `flujo_pago` calculado, `comision_agencia_pct`; `ultimo_pago_presencial` manual | `tipo_viaje` (Grupal\|Individual), flujo de pago derivado del representante, flags B2/D2 derivados |
| 4 | **Config documental del colegio** | `requiere_certificado_psicofisico`, `requiere_test_nivel` (booleans) | Bloque `config_*` con 5 ENUMs Requerido\|Opcional\|NA + `tipo_entrada_requerida` (ETA\|VISA\|Ninguna) que rige C1 |
| 5 | **Pasos del alumno** | enum `paso_tipo` con numeración vieja 1–10 | 11 pasos: Paso 0 inmutable + `codigo_paso` (A1…D2) + `grupo` |
| 6 | **Cuotas** | moneda GBP; sin unique de último pago ni de (inscripción, número) | PRD dice USD (ver OPEN: contradicción), partial unique `es_ultimo_pago`, estado `NA`, `registrado_por` |
| 7 | **users** | rol `admin_juk`; sin `sub_rol_admin`, `apellido`, lockout | ENUM `Admin`/`SuperAdmin`, `sub_rol_admin`, `intentos_fallidos`/`bloqueado_hasta` (US-01) |
| 8 | **Misc** | `alumnos.dni` sin UNIQUE; salud en un texto libre; `pasos_viaje` sin estado `na`; auditoría PK UUID | DNI único, salud en 6 campos, `na` en pasos del viaje (RV-24), `id_organizacion` reservado v2 |

**Además:** datos de facturación del alumno — discrepancia entre PRDs (**MIN-15**): el
changelog del Interno dice que se eliminaron en v1.2, pero el mismo Interno (US-15) y el
Modelo v1.7 (`cuil_cuit`/`razon_social`/`condicion_fiscal`, protegidos por RV-20) los
conservan. El schema actual los tiene → **conservarlos** (visibles solo Admin) hasta que
producto lo cierre.

## B — Deltas del portal interno por módulo

| Módulo | Implementado hoy | Falta / difiere |
|---|---|---|
| **M1 Login** | Better-Auth, reset, sesión 8h, usuarios (super_admin) | Lockout 5 intentos/15 min; renombre de roles; `sub_rol_admin`; email de "contraseña cambiada" |
| **M2 Dashboard** | Métricas básicas con datos reales, GlobeLoader | Panel de alertas críticas/altas (con descarte por sesión), viajes 90 días con % completitud, alumnos urgentes, viajes próximo año (naranja/azul), mora, NPS read-only, calendario visual, métricas históricas, resumen semanal configurable |
| **M3 Colegios** | ABM completo con contactos, comisión, flags | Config documental (5 ENUMs por documento), archivos AF/PC/CL/VISA con upload real (R2), año vigente PC + alerta >12 meses, alerta de cambio con alumnos activos, `tipo_entrada_requerida` |
| **M4 Viajes** | ABM + máquina de estados manual + detalle con asignaciones | `tipo_viaje` Individual (capacidad 1, nace Confirmado), tipo de representante 4 valores + flujo calculado, fee, **auto-confirmar a los 5 inscriptos**, auto En curso/Finalizado por fecha, advertencia (no bloqueo) de sobre-capacidad, notificar al cancelar, re-validar pasaportes al editar fechas, badge Individual |
| **M5 Alumnos** | ABM completo | Webhook Google Form (alta Pre-inscripto), credenciales Portal Familias (generar al crear / enviar manual / desactivar en baja), validación de pasaporte al asignar (regla UK cerrada), marca de fecha en cambios de pasaporte, filtros por alerta/paso, estados del alumno alineados |
| **M6 Seguimiento alumno** | Solo el schema viejo (sin UI) | TODO el tablero: Paso 0 + A/B/C/D, N/A automáticos (config colegio, edad, representante, país), sub-estados (A3, C1), dependencia C2←B1, estado Vencido (A1), recordatorios escalonados, cuotas B1/B2 |
| **M7 Seguimiento viaje** | Pasos 1–5 con estados, metadata, GLs del viaje, police checks derivados | Sub-estados de Pasajes (Grupal: 4 / Individual: 2), comportamiento Individual (P5 N/A), excursiones con aprobación del representante + nota de aprobación por email, transfers por alumno (hoy metadata simple), tarjeta por alumno, POLICE_CHECK como tabla con historial |

## C — Portales no construidos (definen contratos del interno)

- **Portal de Familias (doc 04):** el interno debe proveer credenciales (US-19b), exponer el
  tablero con códigos A1…D2, recibir confirmaciones de la familia (A1/A3/C1/D1/D2 tienen
  "escritura familiar" con aprobación interna), y consumir NPS read-only. Login por **DNI** del
  alumno (a resolver sobre Better-Auth).
- **Vista del Representante (doc 05):** mismo login que el interno (rol `representante` ya
  existe en `users`); credenciales al asignar al viaje; multi-viaje; diario (1 entrada/día,
  editable 24h, solo En curso); solicitudes de cambio con SLA 7 días; acceso post-viaje
  permanente read-only. **Contradicción a resolver:** aprobación de excursiones (ver
  OPEN_DECISIONS).

## D — Plan de adecuación priorizado

Orden propuesto (cada ítem = capa schema → domain → queries → actions → UI, con `/juk-cierre`):

1. **Fundaciones del modelo** *(desbloquea todo lo demás)*
   1.1 `tipo_viaje` + tipo de representante (4 valores) + `flujo_pago` derivado + fee.
   1.2 Config documental del colegio (`colegio_documento_config`) + `tipo_entrada_requerida`.
   1.3 Renombre/extensión de pasos del alumno: Paso 0 + `codigo_paso`/`grupo` (migración con
       mapeo 1→A1, 4→A2, 5→A3, 2→B1, 10→B2, 7→C1, 3→C2, 6→C3, 8→D1, 9→D2).
   1.4 Roles/lockout en `users`.
2. **Trigger de asignación** *(el side-effect que faltaba, ya sin gates)*: crear los 11 pasos
   con N/A automáticos (config colegio + edad + representante + país) + validación de pasaporte.
3. **M6 — tablero del alumno** (UI por grupos, sub-estados, dependencia C2←B1) **+ B1/B2
   (cuotas)** — definir moneda antes (OPEN).
4. **Máquina de estados del viaje v2**: auto-confirm a 5, auto En curso/Finalizado por fecha
   (Trigger.dev), advertencia de sobre-capacidad, viajes Individuales.
5. **Dashboard v2**: alertas críticas/altas, viajes 90 días + % completitud, próximo año,
   mora, calendario. (NPS y métricas históricas al final: dependen de datos.)
6. **Webhook Google Form + credenciales de familias** (prepara el Portal de Familias).
7. **Recordatorios automáticos** (Trigger.dev + Resend + tabla `notificacion_enviada`).
8. **Uploads a R2** (documentos de colegio y de pasos).
9. **Portales externos** (Familias, Representante) — PRDs listos, decisiones de login pendientes.

> Los ítems 1–2 cambian schemas con datos: planear migraciones en 2 pasos donde haga falta
> (nullable → backfill → not null) y usar `/juk-migracion` siempre.
