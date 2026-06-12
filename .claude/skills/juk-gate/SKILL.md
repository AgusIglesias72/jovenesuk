---
name: juk-gate
description: Chequea si un módulo/área del JUK Portal está bloqueado por una decisión de negocio abierta en OPEN_DECISIONS.md antes de codear. Usalo antes de arrancar cualquier feature sensible (excursiones, cuotas/pagos, parental consent, portales externos).
---

# /juk-gate — ¿Puedo codear esto?

Antes de escribir código de un módulo, verificá que no esté bloqueado por una decisión de
negocio sin cerrar. Fuente de verdad: **`juk-portal/OPEN_DECISIONS.md`** (releelo, puede haber
cambiado). Las specs funcionales completas viven en **`juk-portal/docs/prd/`**.

## Cómo responder

1. Leé `juk-portal/OPEN_DECISIONS.md`.
2. Mapeá el área que te pasaron contra los gates de abajo.
3. Devolvé un veredicto claro: **VERDE** (codeá tranquilo) / **ROJO** (bloqueado, no asumas la
   regla) / **AMARILLO** (clarificación menor, podés avanzar con cuidado).
4. Si está ROJO/AMARILLO, decí qué se puede hacer mientras tanto.

## Mapa de gates (al 11/06/2026 — verificar contra el archivo)

### ✅ Ex-gates RESUELTOS por los PRDs de junio 2026

CRIT-01 (flujo de pago Colegio cliente), CRIT-02 (pasaporte UK) y CRIT-03 (psicofísico) están
**cerrados** — la regla vigente está en `docs/prd/01-vision-y-dominio.md` y
`docs/prd/02-portal-interno.md`. Pagos, validación de pasaporte y el tablero M6 completo se
pueden construir.

### 🚨 ROJO — contradicciones entre PRDs, no asumas la regla

| Área | Gate | Qué hacer mientras tanto |
|---|---|---|
| Aprobación de excursiones por el representante (M7 Paso 2, `ACTIVIDAD_VIAJE`, `SOLICITUD_CAMBIO`) | **CRIT-04** (¿aprueba desde su portal o solo solicita cambios?) | Codear excursiones con estados y auditoría; dejar el mecanismo de aprobación del representante desacoplado. |
| Moneda del plan de cuotas (B1/B2, resumen de pagos, mora) | **CRIT-05** (¿USD, GBP o multi-moneda con cotización?) | Modelar `moneda` como ENUM + `monto` genérico; no hardcodear la moneda en UI ni en lógica. |

### 🔶 AMARILLO — clarificar pero no bloquea

- **MIN-01** Parental Consent: versión por edad ¿al inicio del viaje o al descargar? ¿1 o 2 archivos por colegio?
- **MIN-04** Diario con múltiples GLs: ¿publica solo el principal?
- **MIN-06** Definición de "paso obligatorio" para alertas de viaje próximo.
- **MIN-07** Identidad de la cuenta de familias: ¿email del Tutor 1 (Interno) o DNI del alumno (Modelo/Familias)?
- **MIN-08** Retención del acceso post-viaje de familias (representante ya es permanente).
- **MIN-09** Email emisor de recordatorios (info@ vs noreply@).
- **MIN-10** Precio por alumno / cálculo de precio final (v1 no calcula precios).
- **MIN-11** Defaults de la config documental (¿todo Opcional o por documento?).
- **MIN-12** Dropdown de asignación: ¿solo Inscripción abierta o también Confirmado? (los Individuales nacen Confirmados).
- **MIN-13** Semántica de "Opcional" en la config documental (¿paso activo u oculto?).
- **MIN-14** Dueño de la regla de C1/ETA: ¿país del viaje o `tipo_entrada_requerida` del colegio?

### ⚙️ Técnicos (decidibles por el dev, documentar al resolver)

TEC-02 storage R2 · TEC-03 soft-delete unificado · TEC-04 tabla `configuracion` · TEC-05
reglas del canal · TEC-06 tabla `notificacion_enviada` · TEC-07 importer de planillas ·
TEC-11 inconsistencias internas del Modelo v1.7 (gana el PRD Interno v1.13).

## Verde garantizado (sin gate)

ABMs (Colegios, Viajes, Alumnos, GLs, Usuarios), asignaciones **con** validación de pasaporte
(regla cerrada), tablero M6 completo (Paso 0 + A/B/C/D) salvo la moneda de B1, M7 completo
salvo el mecanismo de aprobación de excursiones, dashboard, webhook del Google Form,
credenciales de familias, recordatorios, uploads R2, viajes Individuales, `tipo_viaje`,
config documental por colegio.

> Si la duda es profunda (cruza varios PRDs), delegá al agente **`juk-prd-analyst`**.
