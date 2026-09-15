# 06 · Gap vigente: PRD ↔ código

> **Corte:** 11/09/2026, contra `main` en `0b73eaf` (cierre del programa de adecuación de septiembre).
>
> **Qué es:** lo que las specs [02](02-portal-interno.md), [04](04-portal-familias.md),
> [05](05-vista-representante.md) y [07](07-prospectos-y-web-publica.md) piden y el código
> **todavía no hace**, más lo que está hecho **distinto** a la spec. Cada fila se verificó leyendo
> pantallas (`src/app`), server actions y dominio (`src/lib/domain`), no los mensajes de commit.
>
> **Qué no es:** el inventario de lo construido y de los servicios conectados (eso vive en
> [`docs/estado-actual.md`](../estado-actual.md)), ni las decisiones abiertas (eso vive en
> [`OPEN_DECISIONS.md`](../../OPEN_DECISIONS.md)). El delta tabla por tabla del modelo está en
> [03 §9](03-modelo-datos.md#9-delta-vs-implementación-actual).

## Cómo se mantiene este doc

- Una feature que cierra un gap **borra o achica su fila en el mismo commit**, y suma la línea
  correspondiente en `docs/estado-actual.md` y en `CHANGELOG.md`.
- Una regla implementada distinto a la spec va en la columna "Distinto a la spec" y, si nadie la
  cerró, también como pregunta en `OPEN_DECISIONS.md` (con lo que hace hoy el código).
- Si una afirmación de este doc no se puede señalar en un archivo, no va.

## Resumen

El plan de adecuación del 11/06/2026 **está ejecutado**: fundaciones del modelo (tipo de viaje,
tipo de representante con flujo de pago derivado, config documental por colegio, tablero
Paso 0 + A/B/C/D, rate limit de login), trigger de asignación, tablero M6 con cuotas
multi-moneda, máquina de estados del viaje con transiciones automáticas, dashboard con alertas
calculadas, webhook del Google Form, cuentas del Portal de Familias, recordatorios con dedup y
documentos en R2. Además se construyó lo que no estaba en los PRDs de junio (CRM de prospectos,
consultas y web pública: spec [07](07-prospectos-y-web-publica.md)) y la parte pre-viaje del
Portal de Familias.

Lo que falta se agrupa en cinco frentes (orden y detalle en §D):

1. **Reglas ya especificadas que el código cubre a medias:** C2 que no vuelve a bloquearse,
   Police checks en viajes Individuales, reglas de alerta por umbral de días, Parental Consent
   del colegio.
2. **Notificaciones que el PRD pide y no salen:** mora >7 días, pre-inscripto nuevo, problema de
   ETA, resumen semanal, instructivo de ETA, datos del vuelo.
3. **Detalle fino de M6/M7:** resultado del test de nivel, validación de la Accommodation Letter,
   aprobación de excursiones con nota, archivos del M7 como upload real.
4. **Portal de Familias durante y después del viaje:** itinerario, diario, certificado, NPS,
   mensajería y contenido editable.
5. **Vista del Representante** (no hay nada construido) y lo que depende de ella en el dashboard
   (NPS, calendario, métricas históricas).

---

## A — Modelo de datos (lo que condiciona el plan)

Detalle campo por campo en [03 §9](03-modelo-datos.md#9-delta-vs-implementación-actual).

| # | Gap | Hoy | Qué bloquea |
|---|---|---|---|
| 1 | Tablas del PRD sin crear | No existen `NPS_RESPUESTA`, `ACTIVIDAD_VIAJE`, `SOLICITUD_CAMBIO`, `ENTRADA_DIARIO`, `MENSAJE_DIARIO`. `POLICE_CHECK` vive inline en `group_leaders` (un check por persona, no por viaje) | NPS, calendario de actividades, solicitudes de cambio, diario, mensajería, historial de police checks |
| 2 | Representante como entidad con cuenta | El tipo vive en `viajes.origen`; los GLs físicos en `group_leaders` + `group_leaders_viaje` (con `es_principal`), sin vínculo con `users` | Vista del Representante y credenciales al asignar (RV-13) |
| 3 | `paso_viaje_estado` sin `na` | `pendiente \| en_progreso \| completado \| bloqueado` (`src/lib/db/schema/pasos-viaje.ts`) | P5 Police checks N/A en Individuales (RV-24) |
| 4 | Salud del alumno desglosada | Un solo `alergias_salud` de texto libre | Tarjeta de emergencia y resumen de salud del representante |
| 5 | `asignaciones` sin alojamiento ni certificado | Faltan dirección/familia/coordenadas y `url_certificado` | Mapa casa-colegio y certificado del curso |
| 6 | Unicidad de la última cuota | Ningún índice la garantiza; la sostiene la query que arma el plan | Ver **TEC-13** |
| 7 | Tabla `alertas` sin uso | Existe en el schema pero nada la lee ni la escribe: las alertas se calculan en cada request (`src/lib/db/queries/alertas.ts` + `src/lib/domain/alertas/`) | "Descartar alerta por la sesión" (US-DX-01) e historial. Ver **TEC-16** |

---

## B — Portal interno por módulo

Referencias de archivos relativas a `juk-portal/src/`.

### M1 — Login y usuarios

| Implementado | Gap vigente | Distinto a la spec |
|---|---|---|
| Better-Auth con email y contraseña; sesión de 8 h sin cookie cache (desactivar o cambiar el rol aplica en el request siguiente); reset con link de 24 h y mail de "contraseña cambiada"; rate limit de login en base; registro público cerrado; cuenta desactivada rechazada al crear la sesión. ABM de usuarios del equipo: alta, reenviar acceso, cambiar rol, desactivar. "Mi cuenta" para cambiar la contraseña logueado. (`lib/auth/index.ts`, `app/(admin)/usuarios/`, `app/(admin)/configuracion/cuenta/`) | Desde `/usuarios` no se puede dar de alta un **representante** (el schema de dominio acepta solo `admin_juk` y `super_admin`). **Apellido** y **sub-rol** no se cargan desde la UI aunque las columnas existen. **Log de accesos** (M1): el enum de auditoría tiene `login`/`logout` pero nada los registra. | El lockout de US-01 ("5 fallidos consecutivos → 15 min") se aproxima con el rate limit de Better-Auth: cuenta **intentos** en una ventana de 15 min, no solo fallas. Las cuentas nuevas reciben un **link para crear la contraseña**, no una contraseña temporal por mail ([ADR-017](../architecture.md#adr-017--accesos-por-link-no-contraseñas-temporales-sept-2026)). |

### M2 — Dashboard

| Implementado | Gap vigente | Distinto a la spec |
|---|---|---|
| Cuatro indicadores que llevan al listado ya filtrado (alumnos, viajes confirmados, viajando ahora, alumnos en mora); accesos rápidos; **alumnos con acción urgente** (pasos vencidos o bloqueados, pasaporte, mora) con días hasta el viaje; **panel de alertas** críticas y altas: pasaporte con el criterio conservador, mora (crítica pasados 7 días), pasos bloqueados (ETA rechazado como crítica; C2 bloqueado por B1 no alerta a propósito, porque es una dependencia estructural y no un problema operativo), police check en estado Vencido, Parental Consent del colegio con más de 12 meses; **viajes próximos** con inscriptos y % de completitud (excluye N/A y opcionales, MIN-13); sección **"Viajes del próximo año"**: Grupales abiertos o confirmados que salen en más de 6 meses (`getViajesProximoAnio`), con "Mínimo no alcanzado" y "Alta demanda". Cada sección carga por su cuenta con Suspense. (`app/(admin)/dashboard/`, `lib/domain/alertas/`, `lib/db/queries/dashboard.ts`) | **NPS** (US-DX-06), **calendario visual**, **métricas históricas** y **resumen semanal por mail** con día y horario configurables. **Descartar una alerta por la sesión** (US-DX-01). Reglas de alerta que no existen: ETA pendiente con el primer pago registrado; viaje a <7 días con paso obligatorio pendiente; documentos faltantes con viaje a <3 meses; pasaporte que vence dentro de los 30 días posteriores al viaje; viaje a <21 días con paso bloqueado; y los umbrales por paso (A1 y A2 a <30 días, A3 a 3 meses, C2 a 45 días, C3 y D2 a 3 meses, D1 a <30 y <7 días, B2 a <14 días, Pasajes a <60 y <30 días, police check que vence en <30 días). El police check **Vencido se carga a mano** en el form del GL: nada lo deriva de `police_check_fecha_vencimiento` y `alertasPoliceChecks` mira solo el estado, así que un check con la fecha pasada y estado Aprobado no alerta y deja P5 Completado. | "Viajes próximos" muestra los 6 viajes no finalizados ni cancelados más cercanos, **sin la ventana de 90 días** (`getProximosViajes`). La alerta de pasos bloqueados no filtra por cercanía del viaje. |

### M3 — Colegios destino

| Implementado | Gap vigente | Distinto a la spec |
|---|---|---|
| ABM con contactos, cursos, alojamientos, comisión (solo admin), desactivar y reactivar, filtros. **Config documental** por documento en la tabla `colegio_documento_config` con los defaults de MIN-11; los cambios aplican solo a asignaciones nuevas. **Tipo de entrada** (ETA/VISA/ninguna) con default por país (MIN-14). (`app/(admin)/colegios/`, `lib/domain/colegios/documentos.ts`) | **Archivos del colegio:** el formulario no sube Application Form, Parental Consent (ni su año vigente), Confirmation Letter ni instrucciones de VISA. Nada en la app escribe `parental_consent_updated_at`, así que la alerta "Parental Consent desactualizado" **no se puede resolver desde la UI**: como la regla trata `null` como desactualizado, **todo** colegio destino activo con el PC en Requerido u Opcional alerta siempre (no es un problema de datos). Tampoco se escribe `application_form_url`. **Aviso al equipo** cuando cambia el AF o el PC de un colegio con alumnos activos. Dos versiones del PC (<16 y 16–17): ver MIN-01. | — |

### M4 — Viajes

| Implementado | Gap vigente | Distinto a la spec |
|---|---|---|
| ABM con **tipo Grupal/Individual** (el Individual nace Confirmado con capacidad 1), **tipo de representante** con flujo de pago derivado y nunca persistido (`lib/domain/viajes/flujo-pago.ts`), comisión y fee solo donde aplican. Máquina de estados sin saltos y con Finalizado y Cancelado terminales; **auto-confirmación** del Grupal al 5.º inscripto; **transiciones por fecha** (Confirmado → En curso → Finalizado) en el job diario. Asignar advierte (confirmable) por sobre-capacidad y por pasaporte; editar fechas re-valida los pasaportes del roster; cancelar ofrece avisar a las familias (se encola en Trigger.dev). Listado con filtros por año, estado, colegio, país, tipo y origen; detalle con cupo, progreso de trámites, alertas del viaje, GLs, pagos y M7. (`app/(admin)/viajes/`, `lib/actions/asignaciones.ts`, `lib/jobs/transiciones-viajes.ts`) | **Representante del viaje como usuario** con rol representante (hoy: GLs del viaje, uno marcado principal, sin cuenta). **Precio por semana** para Individuales (MIN-10). | Un viaje Confirmado con fecha de fin ya pasada llega a Finalizado en **dos corridas** del job (TEC-15). Los pasos del M7 se crean al abrir el detalle del viaje si faltan, no al crearlo. |

### M5 — Alumnos

| Implementado | Gap vigente | Distinto a la spec |
|---|---|---|
| ABM con pasaporte (los cambios quedan marcados con fecha, US-18), tutores, facturación en sección plegable (MIN-15), baja y reactivación. Búsqueda por nombre, apellido, DNI o pasaporte; filtros por estado, viaje, alerta y paso pendiente; alerta por fila. **Asignar a un viaje desde la ficha.** **Webhook del Google Form:** alta Pre-inscripto con canal webhook, idempotente por DNI, y asignación automática si trae `codigoViaje`. **Cuenta del Portal de Familias** (MIN-07): envío manual del acceso con estado visible, vincular a una familia existente pide confirmación, y la baja desactiva la cuenta si no quedan hermanos activos. URL de la ficha por DNI. (`app/(admin)/alumnos/`, `app/api/webhooks/google-form/route.ts`, `lib/db/queries/familias.ts`) | **Aviso al equipo** cuando entra un pre-inscripto por webhook (US-15). Los estados **Activo, Viajando y Finalizado** del alumno no se actualizan solos (solo Pre-inscripto → Inscripto al asignar). Al editar el vencimiento del pasaporte no hay re-validación inmediata contra el viaje: lo levanta la alerta del dashboard. | El DNI con puntos no se normaliza (TEC-12). Reactivar un alumno no reactiva la cuenta de familia (MIN-24). |

### M6 — Seguimiento del alumno

| Implementado | Gap vigente | Distinto a la spec |
|---|---|---|
| Tablero **Paso 0 + A/B/C/D** creado por el trigger de asignación con los N/A automáticos (config documental, edad al inicio, tipo de representante, tipo de entrada, tipo de viaje) y regenerado al reasignar. Transiciones validadas en dominio: Paso 0 de solo lectura, B1 y B2 de solo lectura en el tablero (sus estados los fija `sincronizarPasosPago`, `esPasoDerivadoDePago`), bloquear exige motivo, Vencido solo en A1. **A1:** fecha límite editable; el job diario la marca Vencido y manda recordatorios a 14/7/3/1 días. **D1:** recordatorios a 90/60/30 días; la familia confirma el trámite. **Sub-estados** de C1 (con número de autorización) y de A3 (con la versión del PC por edad al inicio). **B1/B2** derivados del plan de cuotas multi-moneda: registrar pago con fecha efectiva y observaciones desde la ficha del alumno o desde `/pagos` (el panel de pagos del detalle del viaje muestra el resumen y lleva a la ficha); B2 confirma la última cuota presencial. **C2** se destraba al completar B1. Adjuntos por paso al storage privado. Auditoría de cada cambio. Panel global `/pagos` con filtros y resumen agregado en SQL (US-23/24). (`lib/domain/pasos/`, `app/(admin)/alumnos/[id]/`, `lib/db/queries/cuotas.ts`, `lib/jobs/scan-recordatorios.ts`, `app/(admin)/pagos/`) | **C2 no vuelve a Bloqueado si B1 retrocede** (RV-C2: `sincronizarPasosPago` solo destraba). **A2** sin campo para el nivel asignado (US-27). **A3** sin aviso de que el alumno cumple 16 antes del viaje (US-28). **C2** sin la verificación contra pasaporte, nombre y fecha de nacimiento junto al archivo (US-25). **C3** sin la validación familiar Sí / No / Con observaciones (US-30). **C1** sin advertencia al registrar un pago con ETA pendiente (US-31) ni envío del instructivo de ETA (US-32). **Confirmation Letter y VISA/Immigration** como campos de control en el tablero (US-05b). **Mail a los admins por mora >7 días** (US-23). **Reinscribir** una asignación cancelada borra y regenera los 11 pasos (`asignarConTablero`): se pierde la metadata (sub-estados de C1/A3, `archivoUrl`, notas) y los documentos de los pasos viejos quedan huérfanos en `documentos`, sin limpieza (03 §9.3). | MIN-17, MIN-18, MIN-25, MIN-26, MIN-27, TEC-13, TEC-14. |

### M7 — Seguimiento del viaje

| Implementado | Gap vigente | Distinto a la spec |
|---|---|---|
| **Pasajes** con sub-estados distintos para Grupal (pendiente cotización → cotizado → confirmado → emitido) e Individual (pendiente datos / datos recibidos), y datos del vuelo. **Excursiones** con estados Propuesta / Aprobada por representante / Confirmada / Cancelada (los valores de la primera versión se traducen al leer y se normalizan al guardar). **Transfers y Tarjetas** con cobertura alumno por alumno que completa o reabre el paso. **Dependencia Transfers ← Pasajes** aplicada igual en el selector, la action y la cobertura. **Police checks** derivado del estado de cada GL del viaje. (`lib/domain/pasos-viaje/`, `app/(admin)/viajes/[id]/`) | **P5 N/A automático en Individuales:** falta el estado `na` (§A.3). `aplicaPoliceChecks` (`lib/domain/viajes/flujo-pago.ts`) existe pero solo lo usa su test, y `derivarEstadoPoliceChecks` (`lib/domain/pasos-viaje/police.ts`) devuelve Pendiente cuando el viaje no tiene GLs: un Individual queda con P5 Pendiente para siempre. **Aprobación de excursiones por el representante** y registro con nota cuando el admin aprueba en su nombre (US-38, CRIT-04 ⭐). Excursiones no se completa sola cuando todas quedan confirmadas. **Aviso a familias con los datos del vuelo** (US-37); faltan aeropuerto y horarios estructurados. **La baja de un alumno no libera su transfer** ni genera la alerta de revisión (US-39). E-ticket y comprobante de tarjetas se cargan como **URL, no como archivo** (`eTicketUrl`, `comprobanteUrl`). El **police check no tiene carga de documento**: el form del GL solo guarda estado y fechas, y la columna `police_check_url` existe pero nada la escribe. Police check sin historial por viaje ni alerta de vencimiento a <30 días, y el estado Vencido se fija a mano (ver M2). | MIN-19, MIN-20. |

### Fuera de los PRDs de junio (spec [07](07-prospectos-y-web-publica.md))

| Módulo | Implementado | Gap vigente |
|---|---|---|
| Configuración | Remitentes de mail por tipo (MIN-09), envío de prueba, preview de templates y estado de servicios, solo super_admin. (`app/(admin)/configuracion/`) | Claves que el PRD pide y no existen: día y horario del resumen semanal, umbrales de pasaporte por país, contenido de orientación ante rechazo de ETA. |
| Consultas y newsletter | Formulario público con rate limit y aviso al equipo; back-office `/consultas` con estados auditados. | Los **suscriptores** del newsletter no tienen pantalla en el back-office. Privacidad, retención y borrado: MIN-16. |
| Prospectos (CRM) | Pipeline kanban/tabla, importación CSV, outreach con tracking, baja por link, conversión a colegio. | El envío real depende de la configuración de dominio y secrets (ver `docs/estado-actual.md`). |

---

## C — Portales externos

### Portal de Familias (spec 04)

Construido en `src/app/familias/` (rol `familia`, un selector por DNI si la cuenta tiene más de
un alumno, 404 ante alumnos ajenos).

| Módulo de la spec | Estado | Qué hay y qué falta |
|---|---|---|
| §2 Cuenta y acceso | Parcial | Hay: identidad = email del Tutor 1 con selector por DNI (MIN-07), link para crear la contraseña, desactivación en la baja. Falta: perfil **Alumno adulto** (lenguaje propio y visibilidad de A3/D1) y **WhatsApp** como canal. |
| 1 · Documentación requerida | Parcial | Hay: trámites agrupados A/B/C/D con explicación de qué es y quién lo mueve; la familia sube A1, A3, D1, D2 y la captura del ETA, reporta el avance del ETA (US-1.5) y el problema (US-1.6), y confirma D1. Una acción de la familia nunca reabre un paso que el equipo completó. Falta: **Paso 0 como primer evento del timeline**; **alerta urgente al equipo** por problema de ETA (MIN-21); orientación tras el rechazo editable por JUK y enviada por mail/WhatsApp (US-1.7); notificaciones escalonadas. |
| 2 · Resumen de documentación | Parcial | Hay: "Mis datos" con "Reportar un dato incorrecto", que le llega al equipo por mail. Falta: alerta urgente por datos críticos a <7 días del viaje. |
| 3 · Resumen de pagos | Hecho (lectura) | Detalle de cuotas por viaje y aviso de cuota vencida en todas las pantallas. Falta: medios de pago editables por JUK. |
| 4 · Requisitos para el viaje | Parcial | D1 se confirma desde Documentación. Falta: datos del seguro. |
| 5 · Test de nivel | Fuera de alcance v1 | — |
| 6 · Itinerario final | No | La pantalla "Viaje" muestra los datos del viaje y avisa que el itinerario se publica más cerca de la salida. |
| 7 · Diario de viaje | No | Ítem de menú "Pronto". Depende de §A.1 y de la Vista del Representante. |
| 8 · Certificado del curso | No | Ítem de menú "Pronto". Depende de §A.5. |
| 9 · Encuesta NPS | No | Ítem de menú "Pronto". Depende de §A.1. |
| 10 · Soporte | Parcial | Hay: "Ayuda" con los canales reales (mail y WhatsApp con mensaje armado) y preguntas frecuentes fijas en código. Falta: FAQ editable y buscador (MIN-22), formulario de contacto, mensajería con el representante. |
| 11 · Post-viaje | No | Política sin decidir (MIN-08). |

### Vista del Representante (spec 05)

**No hay nada construido.** Prerrequisitos verificados en el código:

- El rol `representante` existe en `user_role`, pero no se puede crear desde `/usuarios`.
  Además `HOME_BY_ROLE.representante` es `/dashboard` y el layout de `(admin)` exige admin: un
  usuario con ese rol entraría en un loop de redirects (`requireRole` lo manda a su home y la
  home lo rechaza). Hay que resolverlo antes de crear el primero.
- Falta el vínculo GL/representante ↔ `users`, las credenciales al asignar (RV-13), el scoping
  "solo su viaje" en queries y proxy, y el layout propio.
- Faltan las tablas de actividades, solicitudes de cambio y diario (§A.1), la generación de PDFs
  (itinerario, ubicaciones, salud, tarjeta de emergencia), el mapa con geocoding y las
  notificaciones in-app.

---

## D — Plan priorizado (solo lo que falta)

Cada ítem se construye por capas (schema → domain → queries → actions → UI) y cierra con
`/juk-cierre`. Los cambios de schema van con `/juk-migracion`. Ojo con los enums: Postgres no deja
usar un valor nuevo en la misma transacción que lo agrega (ver 03 §10.10).

1. **Cerrar reglas ya especificadas** *(chico, sin decisiones pendientes)*
   1. C2 vuelve a Bloqueado cuando B1 retrocede (`lib/db/queries/cuotas.ts`).
   2. `na` en `paso_viaje_estado` + Police checks N/A en Individuales (`lib/domain/pasos-viaje/police.ts`,
      `lib/domain/viajes/flujo-pago.ts`, `lib/db/queries/pasos-viaje.ts`).
   3. Archivos del colegio (AF, PC con año vigente, Confirmation Letter, VISA) con el storage
      privado existente. La entidad `colegio` ya está en `documento_entidad`, pero
      `documento_categoria` no tiene valor para la Confirmation Letter; para las instrucciones de
      VISA está `immigration_letter`, que hoy usa el adjunto de C2 del alumno (reusarla o sumar una
      propia). Sumar valores es una migración de enum (ver 03 §10.10). Al subir el PC se actualiza
      `parental_consent_updated_at` y la alerta se resuelve.
   4. Ventana de 90 días en "Viajes próximos".
   5. Registrar `login`/`logout` en auditoría.
2. **Alertas completas del dashboard** — reglas por umbral de días de M2, M6 y M7 en
   `lib/domain/alertas/` (puras, con test), police check que vence en <30 días, Vencido derivado de
   la fecha de vencimiento (hoy es manual), y "descartar por la sesión". Antes: decidir TEC-16.
3. **Notificaciones del PRD** *(requieren Trigger.dev desplegado: ver `docs/estado-actual.md`)* —
   mail a admins por mora >7 días, aviso de pre-inscripto nuevo, aviso de problema de ETA (tras
   MIN-21), resumen semanal con día y horario en `configuracion`, instructivo de ETA, datos del
   vuelo a familias. Cerrar antes TEC-14 (reintentos).
4. **Detalle fino de M6 y M7** — A2 nivel, aviso de A3 por cumplir 16, verificación de C2,
   validación familiar de C3, advertencia de pago con ETA pendiente, Confirmation/VISA como campos
   de control, estados automáticos del alumno, excursiones con nota de aprobación y cierre
   automático, liberar transfer en la baja, uploads reales en el M7, datos de vuelo completos.
   Apellido y sub-rol en `/usuarios`.
5. **Portal de Familias durante y post-viaje** — modelo (NPS, certificado y alojamiento en la
   asignación), contenido editable (FAQ, orientación ETA, medios de pago), perfil Alumno adulto,
   itinerario, NPS y certificado. Decisiones previas: MIN-08, MIN-21, MIN-22. El diario y la
   mensajería se hacen junto con el ítem 6.
6. **Vista del Representante** — modelo representante ↔ `users`, credenciales al asignar, home y
   scoping del rol, actividades y solicitudes de cambio (CRIT-04 ⭐), diario compartido con
   Familias. Decisiones previas: MIN-04, TEC-05.
7. **Dashboard con datos de 5 y 6** — NPS por viaje y por representante, calendario visual,
   métricas históricas.
8. **Modelo sin consumidor inmediato** — salud desglosada, `pais_pasaporte`, `id_organizacion`
   (multi-tenant v2), `tipo_cuenta` en auditoría cuando existan los otros portales.
