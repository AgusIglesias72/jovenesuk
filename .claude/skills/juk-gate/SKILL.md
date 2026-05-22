---
name: juk-gate
description: Chequea si un módulo/área del JUK Portal está bloqueado por una decisión de negocio abierta en OPEN_DECISIONS.md antes de codear. Usalo antes de arrancar cualquier feature sensible (pagos, pasaporte, pasos, parental consent).
---

# /juk-gate — ¿Puedo codear esto?

Antes de escribir código de un módulo, verificá que no esté bloqueado por una decisión de negocio
sin cerrar. Fuente de verdad: **`juk-portal/OPEN_DECISIONS.md`** (releelo, puede haber cambiado).

## Cómo responder

1. Leé `juk-portal/OPEN_DECISIONS.md`.
2. Mapeá el área que te pasaron contra los gates de abajo.
3. Devolvé un veredicto claro: **VERDE** (codeá tranquilo) / **ROJO** (bloqueado, no asumas la regla)
   / **AMARILLO** (clarificación menor, podés avanzar con cuidado).
4. Si está ROJO/AMARILLO, decí qué se puede hacer mientras tanto.

## Mapa de gates (al mayo 2026 — verificar contra el archivo)

### 🚨 ROJO — críticos, no codear la regla de negocio

| Área | Gate | Qué hacer mientras tanto |
|---|---|---|
| Pagos, cuotas, comisiones, Paso 2, Paso 10, `viaje.flujo_pago` | **CRIT-01** (flujo de pago NEA: ¿directo a JUK o vía agencia externa?) | Codear todo lo que NO sea pagos. |
| Validación de pasaporte, alertas de pasaporte, validación al asignar (US-16) | **CRIT-02** (¿UK exige 6 meses adicionales?) | Dejar la validación detrás de `STRICT_UK_RULE` (cambiable en 1 línea). |
| Paso 9 (psicofísico), inicialización del tablero M6, estructura del M7 | **CRIT-03** (¿el psicofísico es del alumno o del Group Leader?) | Codear los pasos 1, 3-8 del M6 sin tocar el 9. |

### 🔶 AMARILLO — clarificar pero no bloquea

- **MIN-01** Parental Consent: versión al descargar (no al inicio del viaje) — usar la regla del Portal Familias.
- **MIN-02** Confirmation Letter / VISA Letter: ¿documentos nuevos o ya mapeados? (afecta si hay Paso 11).
- **MIN-03** Wimbledon edge case: refactor de las 2 URLs de Parental Consent a principal/alterno + edad_corte.
- **MIN-04** "La representante" singular vs múltiples GLs (campo `es_principal`).
- **MIN-05** Acceso post-viaje del representante: 30 días vs indefinido.

### ⚙️ Técnicos (decidibles por el dev, documentar en data-model.md)

TEC-01 moneda (ARS/USD/GBP) · TEC-02 storage R2 · TEC-03 soft-delete unificado · TEC-04 tabla
`configuracion` · TEC-05 reglas del canal · TEC-06 tabla `notificacion_enviada` · TEC-07 importer de
planillas · TEC-08 métricas históricas (no hard-delete).

## Verde garantizado (sin gate)

ABM de Colegios, ABM de Viajes, ABM de Alumnos, Asignaciones (excepto la validación de pasaporte),
dashboard layout, shell/navegación, pasos 1 y 3-8 del M6, emails transaccionales ya existentes.

> Si la duda es profunda (cruza varios PRDs), delegá al agente **`juk-prd-analyst`**.
