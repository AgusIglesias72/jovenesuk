---
name: juk-paso
description: Implementa un paso del seguimiento M6 (alumno, 10 pasos) o M7 (viaje, 5 pasos) del JUK Portal, con su máquina de estados, metadata tipada, upload de documento a R2 y audit log. Usalo para cualquiera de los 15 pasos del tablero.
---

# /juk-paso — Implementar un paso del M6/M7

Los pasos son el trabajo más repetitivo del portal. Este es el archetype común.
**Comandos desde `juk-portal/`.**

## Paso 0 — Gate check

Estos pasos están BLOQUEADOS por decisiones abiertas (ver `OPEN_DECISIONS.md` / `/juk-gate`):
- **Paso 2 (pagos)** y **Paso 10 (último pago presencial)** → CRIT-01.
- **Paso 9 (psicofísico)** → CRIT-03 (puede que ni siquiera sea un paso del alumno).
Si es uno de esos, parar y confirmar con el usuario.
Pasos seguros para implementar ya: **1, 3, 4, 5, 6, 7, 8**.

## El modelo (ya existe en el schema)

- M6: `src/lib/db/schema/pasos-alumno.ts` — una fila por `(asignación × tipo)`.
- M7: `src/lib/db/schema/pasos-viaje.ts` — una fila por `(viaje × tipo)`.
- Estados (`pasoEstado`): `pendiente · en_progreso · completado · bloqueado · na`.
- `metadata` (JSON): datos específicos del paso. **Las shapes están documentadas en el comentario
  al pie de `pasos-alumno.ts`** — respetalas y tipalas en `domain/pasos/<tipo>.ts`.

## Cómo implementar un paso

1. **Tipo de metadata** → en `src/lib/domain/pasos/<tipo>.ts`:
   - Definí el `type` de la metadata de ese paso (copialo de la doc en `pasos-alumno.ts`).
   - Definí las transiciones válidas y los sub-estados (ej: ETA tiene
     `pendiente|en_tramite|aprobado|rechazado`; Parental Consent `enviado|firmado|recibido`).
   - Lógica pura: qué hace falta para que el paso pase a `completado`, cuándo es `na`.

2. **Transición de estado** → Server Action que:
   - Valida la transición con la lógica del dominio.
   - Actualiza `pasos_alumno`/`pasos_viaje` (estado, metadata, `fechaCompletado`, `updatedBy`).
   - Escribe un registro en `auditoria` (todo cambio de estado se audita).
   - Devuelve `{ ok, data | error }`.

3. **Documento** (si el paso lleva archivo): subir a **R2** vía `lib/domain/documentos/`,
   guardar la URL en `metadata.archivoUrl` y registrar en `documentos` (polimórfico:
   `entidad_tipo` + `entidad_id`). Validar tipo y tamaño antes de subir.

4. **UI** dentro del detalle del alumno/viaje:
   - Usá `StepBadge` (M6) / el badge del paso para el estado — **no cambies los colores**, el mapping
     es global (`components/ui/badge.tsx`).
   - Mostrá el sub-estado y los campos de la metadata. Acciones para avanzar/bloquear/marcar N/A.

5. **Inicialización**: recordá que al asignar un alumno se crean las 10 filas de `pasos_alumno`
   (con `na` donde no aplica). El "Paso 10" NO genera fila propia: es la última cuota
   (`cuotas.esUltimaCuota`). No dupliques.

## Cerrar

`npm run typecheck` + `npm run lint`, y pasá el diff por **`juk-revisor`**.
