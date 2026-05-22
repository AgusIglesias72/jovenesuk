---
name: juk-migracion
description: Genera, revisa y commitea una migración Drizzle del JUK Portal de forma segura después de cambiar un schema. Usalo cada vez que toques src/lib/db/schema/.
---

# /juk-migracion — Migración Drizzle segura

Después de cambiar cualquier archivo de `juk-portal/src/lib/db/schema/`.
**Comandos desde `juk-portal/`.**

## Flujo

1. **Confirmá que `schema/index.ts` re-exporta la entidad** (si creaste un schema nuevo).

2. **Generá la migración**:
   ```bash
   npm run db:generate
   ```
   Esto escribe SQL en `juk-portal/drizzle/`. **No uses `db:push` contra prod** — push es solo
   para el primer greenfield local.

3. **Revisá el SQL generado** (leelo, no lo asumas). Checklist:
   - [ ] ¿La operación es segura? Agregar columna `NOT NULL` sin default a una tabla con datos
         rompe. Usá default o hacelo en 2 pasos (nullable → backfill → not null).
   - [ ] ¿Snake_case en nombres de columnas/tablas? (convención del proyecto)
   - [ ] ¿FKs con `onDelete` correcto? (`cascade` para pasos/cuotas de una asignación, etc.)
   - [ ] ¿Índices y `unique()` necesarios? (ej: `(asignacion_id, tipo)` en pasos_alumno).
   - [ ] Soft-delete vía `estado` ENUM — no introducir `activo BOOLEAN` nuevos (TEC-03).
   - [ ] ¿Drops destructivos no intencionales? Un rename mal detectado puede salir como drop+add
         y perder datos. Si ves un DROP de columna con datos, frená y revisá.

4. **Commiteá la migración JUNTO con el cambio de schema**, en el mismo commit:
   ```bash
   git add src/lib/db/schema/ drizzle/
   git commit -m "feat(db): <qué cambió>"
   ```

5. **Aplicación**:
   - Local: `npm run db:push` (greenfield) o `npm run db:migrate`.
   - Preview: cada PR corre contra una branch de Neon (copy-on-write de prod) — ahí probás el cambio.
   - Prod: las migraciones se aplican **manualmente** vía workflow bloqueante antes del deploy
     (ADR-008 / Módulo 8 §8.5). Nunca migres prod a mano sin avisar.

## Si el cambio toca un módulo gated

Si el schema afectado es de pagos/cuotas/pasaporte/psicofísico, recordá que la **forma** del
schema puede cambiar según se resuelva el CRIT correspondiente. Avisá al usuario antes de migrar.
