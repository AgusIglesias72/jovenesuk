---
name: juk-cierre
description: Definition of Done del JUK Portal — el loop de verificación completo antes de dar por cerrada cualquier feature (typecheck, lint, unit, E2E, prueba en navegador, revisor). Usalo al terminar cualquier cambio no trivial.
---

# /juk-cierre — Definition of Done

El loop de cierre único del proyecto. Toda feature pasa por acá antes de considerarse lista.
**Comandos desde `juk-portal/`.** Es la única fuente de verdad del cierre: si otro skill
dice "cerrá", se refiere a esto.

## El loop

1. **Estática** — `npm run typecheck` y `npm run lint`. Arreglá lo que rompa.

2. **Unit (dominio)** — `npm run test` (Vitest, corre `src/**/*.test.ts`).
   - Si tocaste `lib/domain/`, agregá/actualizá el `<archivo>.test.ts` al lado del archivo.
   - La lógica pura (transiciones, schemas Zod, derivaciones) SIEMPRE merece unit test:
     es barato y es lo que más se rompe en silencio.

3. **E2E (afectados)** — `npm run test:e2e -- <spec>` con los specs del módulo tocado
   (ej: `npm run test:e2e -- viajes-estado`). La suite completa solo si el cambio es transversal.
   - Requiere el dev server en **3001** (`npm run dev -- -p 3001`); el 3000 es del usuario.
   - Feature nueva sin spec → escribí uno en `tests/e2e/` (mirá `helpers.ts` y los specs existentes).

4. **Navegador** — verificá el flujo real con Playwright MCP contra `http://localhost:3001`:
   navegá, ejecutá la acción principal, sacá screenshot si hay cambio visual. Un E2E verde
   no reemplaza ver la pantalla.

5. **Migración** — si tocaste `src/lib/db/schema/` y no corriste `/juk-migracion`, hacelo ahora.

6. **Review** — pasá el diff por el agente **`juk-revisor`**. Atendé lo que marque.

7. **Commit + docs** — commits chicos por feature (formato `tipo(scope): descripción` en español).
   Si el módulo es nuevo o cambió el estado del proyecto: actualizá `.claude/docs/03` (mapa)
   y `.claude/docs/01` (estado).

## Cuándo abreviar

- Cambio de copy/estilo puro → pasos 1 y 4 alcanzan.
- Cambio solo en `lib/domain/` → pasos 1, 2, 6, 7 (los E2E no se enteran).
- Hotfix de un typo → paso 1 y commit.

El resto del tiempo: el loop completo. No des por cerrado nada que no hayas visto funcionar.
