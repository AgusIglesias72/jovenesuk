---
name: juk-paso
description: Implementa un paso del seguimiento M6 (alumno, Paso 0 + Grupos A/B/C/D) o M7 (viaje, 5 pasos) del JUK Portal, con su máquina de estados, metadata tipada, upload de documento a R2 y audit log. Usalo para cualquiera de los 16 pasos del tablero.
---

# /juk-paso — Implementar un paso del M6/M7

Los pasos son el trabajo más repetitivo del portal. Este es el archetype común.
**Comandos desde `juk-portal/`.** Spec funcional de cada paso:
`docs/prd/02-portal-interno.md` (M6 y M7). Deltas de schema: `docs/prd/06-deltas-implementacion.md`.

## Paso 0 — Gate check

Casi todo el tablero está DESBLOQUEADO (los CRITs viejos se resolvieron). Quedan dos gates
(ver `OPEN_DECISIONS.md` / `/juk-gate`):
- **B1/B2 (cuotas)** → CRIT-05: la MONEDA del plan de cuotas no está definida (USD vs GBP).
  Se puede modelar con `moneda` ENUM + monto genérico; no hardcodear moneda.
- **M7 Paso 2 (excursiones)** → CRIT-04: el mecanismo de aprobación del representante está
  contradicho entre PRDs. Codear estados y auditoría; desacoplar la aprobación.

## El tablero M6 (estructura v1.8+ del PRD)

```
Paso 0 (origen, solo lectura) — Completado automático vía webhook / 'Alta manual'
A1 Application Form colegio · A2 Test de Nivel · A3 Parental Consent
B1 Plan de cuotas · B2 Último pago presencial (vista sobre la última cuota de B1)
C1 ETA · C2 Immigration Letter (requiere B1 Completado) · C3 Accommodation Letter
D1 Autorización escribano · D2 Psicofísico
```

N/A automáticos al asignar: por config documental del colegio (A1/A2/A3), por edad ≥18
(A3/D1), por tipo de representante (B2: Colegio cliente y JUK directo), por país destino
(C1: solo UK), por tipo de viaje (D2: N/A en Individuales). Estado extra `vencido` para A1.

> ⚠️ El schema actual (`pasos-alumno.ts`) todavía usa la numeración vieja 1–10. El mapeo es:
> 1→A1, 4→A2, 5→A3, 2→B1, 10→B2, 7→C1, 3→C2, 6→C3, 8→D1, 9→D2 (+ Paso 0 nuevo).
> Si el paso que vas a implementar requiere el modelo nuevo, hacé primero la migración de
> fundaciones (doc 06, ítem 1.3).

## El modelo

- M6: `src/lib/db/schema/pasos-alumno.ts` — una fila por `(asignación × paso)`.
- M7: `src/lib/db/schema/pasos-viaje.ts` — una fila por `(viaje × tipo)`.
- Estados: `pendiente · en_progreso · completado · bloqueado · na` (+ `vencido` para A1).
- `metadata` (JSON): datos específicos del paso, tipados con Zod en
  `domain/pasos/<paso>.ts` (M6) / `domain/pasos-viaje/metadata.ts` (M7).

## Cómo implementar un paso

1. **Dominio** → `src/lib/domain/pasos/<paso>.ts`:
   - `type` + schema Zod de la metadata (la shape exacta sale de la spec del paso en
     `docs/prd/02-portal-interno.md`).
   - Transiciones válidas y sub-estados (ej: C1 ETA `pendiente|en_tramite|aprobado|rechazado`;
     A3 `enviado|firmado|recibido`; M7-P1 Grupal `pendiente_cotizacion|cotizado|confirmado|emitido`).
   - Lógica pura: condición de `completado`, reglas de `na`, dependencias (C2←B1, M7-P3←P1).

2. **Transición de estado** → Server Action que valida con el dominio, actualiza la fila
   (estado, metadata, `fechaCompletado`, `updatedBy`), audita en `auditoria` y devuelve
   `{ ok, data | error }`.

3. **Documento** (si lleva archivo): subir a **R2** vía `lib/domain/documentos/`, URL en
   `metadata.archivoUrl`, registrar en `documentos` (polimórfico). Validar tipo y tamaño
   (PDF/DOCX/foto según el paso; máx. 10 MB).

4. **UI** en el detalle del alumno/viaje: `StepBadge`/badge global (no cambiar colores),
   sub-estado + campos de metadata, acciones avanzar/bloquear/N-A.

5. **Inicialización**: al asignar un alumno se crean TODAS las filas del M6 (con `na` donde
   corresponda según las reglas de arriba). **B2 no genera fila de pago propia**: es una vista
   sobre la última cuota de B1 (`cuotas.esUltimaCuota`). No dupliques.

6. **Alertas/recordatorios**: cada paso tiene umbrales propios (ver spec). No los hardcodees
   en la UI: van a la lógica de alertas (dominio) para que el dashboard y los emails los reusen.

## Cerrar

Corré el loop completo de **`/juk-cierre`**. La lógica de transiciones y la metadata
tipada del paso van con unit test (`<archivo>.test.ts` al lado, corre con `npm run test`).
