---
name: juk-gate
description: Chequea si un módulo/área del JUK Portal está bloqueado por una decisión de negocio abierta en OPEN_DECISIONS.md antes de codear. Usalo antes de arrancar cualquier feature sensible (parental consent, diario, portales externos, recordatorios).
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

### 🚨 ROJO

**Ninguno.** Los CRITs históricos (01/02/03) los resolvieron los PRDs de junio 2026, y
CRIT-04 (excursiones: el representante aprueba) y CRIT-05 (cuotas: multi-moneda, default USD)
se decidieron el 11/06/2026 — ambos con ⭐ "validar con el equipo": si María/Felix deciden
distinto, el cambio debe quedar acotado (no esparcir la regla por la UI).

### 🔶 AMARILLO — abiertos, no bloquean el plan; avanzar con la asunción documentada

- **MIN-01** Parental Consent: ¿versión por edad al inicio o al descargar? ¿1 o 2 archivos?
  (asunción: edad al inicio + 2 archivos). Impacta al detallar A3.
- **MIN-04** Diario con múltiples GLs: ¿publica solo el principal? Impacta en Vista Representante.
- **MIN-08** Retención del acceso post-viaje de familias (recomendado: 2 años + ZIP).
- **MIN-09** Email emisor de recordatorios (propuesta: automáticos noreply@, conversacionales info@).
- **MIN-10** Precio por alumno / precio final (v1 no calcula precios).

### ⚙️ Técnicos (decidibles por el dev, documentar al resolver)

TEC-02 storage R2 · TEC-03 soft-delete unificado · TEC-04 tabla `configuracion` · TEC-05
reglas del canal · TEC-06 tabla `notificacion_enviada` · TEC-07 importer de planillas ·
TEC-11 desfasajes del Modelo v1.7 (manda el Interno v1.13; incisos a–m).

## Verde garantizado (sin gate)

Todo el plan del doc `docs/prd/06-deltas-implementacion.md`: fundaciones del modelo
(tipo_viaje, representante, config documental, pasos A1…D2, lockout), trigger de asignación,
tablero M6 completo incluidas cuotas multi-moneda, M7 completo (excursiones: aprueba el
representante), dashboard v2, webhook, credenciales de familias (email Tutor 1 + DNI selector),
recordatorios, uploads R2, viajes Individuales.

> Si la duda es profunda (cruza varios PRDs), delegá al agente **`juk-prd-analyst`**.
> Las decisiones ⭐ del 11/06/2026 están en la tabla "Resueltos" de OPEN_DECISIONS.md.
