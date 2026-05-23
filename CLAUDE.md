# JUK Portal — Workspace

Este workspace contiene el **JUK Portal**, el back-office interno de *Jóvenes en UK* (agencia
argentina de viajes de estudio a UK). El código vive en `juk-portal/`; el harness de Claude Code
(skills, agentes, hooks) vive en `.claude/`.

## Layout

```
jovenesuk/
├── .claude/            ← harness (NO es código de la app)
│   ├── skills/         ← /juk-modulo, /juk-paso, /juk-migracion, /juk-gate
│   ├── agents/         ← juk-arquitecto, juk-prd-analyst, juk-revisor
│   ├── hooks/          ← guardas automáticas (Node, cross-platform)
│   └── settings.json   ← hooks + permisos
├── juk-portal/         ← la app (Next.js 16). Acá vive TODO el código.
│   ├── src/, docs/, package.json, …
│   └── CLAUDE.md       ← convenciones de código (importado abajo)
└── assets/
```

**Casi todos los comandos corren desde `juk-portal/`** (`cd juk-portal && npm run …`).

## Las convenciones de código completas están acá:

@juk-portal/CLAUDE.md

## Regla de oro: chequeá los gates antes de codear

Hay **3 decisiones de negocio CRÍTICAS sin cerrar** (`juk-portal/OPEN_DECISIONS.md`) que bloquean
módulos enteros. Antes de tocar cualquiera de estas áreas, corré `/juk-gate <área>` o consultá el
agente `juk-prd-analyst`:

| Área | Bloqueado por | No codear hasta resolver |
|---|---|---|
| **Pagos** (Paso 2, Paso 10, cuotas, comisiones) | CRIT-01 | flujo de pago NEA |
| **Validación de pasaporte** | CRIT-02 | ¿6 meses adicionales o no? |
| **Paso 9 — Psicofísico** | CRIT-03 | ¿del alumno o del Group Leader? |

Lo que **SÍ** se puede codear sin riesgo: ABM de Colegios, ABM de Viajes, ABM de Alumnos,
dashboard layout, shell/navegación, y los pasos 1, 3-8 del M6.

## Cómo trabajar acá

- **Feature nueva** → `/juk-modulo <nombre>` (scaffold por capas) o el agente `juk-arquitecto` para planificar.
- **Implementar un paso del M6/M7** → `/juk-paso <tipo>`.
- **Cambié un schema Drizzle** → `/juk-migracion` (genera + revisa + commitea la migración).
- **¿Puedo tocar este módulo?** → `/juk-gate <área>`.
- **Antes de dar por cerrada una feature** → pasala por el agente `juk-revisor`.

## Documentación de handoff

`.claude/docs/` tiene la referencia completa de producto y código (para mantenimiento y traspaso):
producto, arquitectura/convenciones, **mapa archivo-por-archivo**, y operación. Empezá por
`.claude/docs/README.md`. Mantenela actualizada al sumar módulos.

## Estado del proyecto (mayo 2026)

- Fase 0-1: auth, reset, AppShell, design system, schemas Drizzle, email templates.
- Construido: ABM de Colegios, Viajes, Alumnos, Group Leaders; Gestión de Usuarios; dashboard con datos
  reales; GlobeLoader; suite E2E (Playwright).
- Pendiente: Pagos, seguimiento M6/M7 (pasos), asignación alumno↔viaje, alertas dinámicas — varios
  bloqueados por los CRIT de `OPEN_DECISIONS.md`.
- Detalle: `.claude/docs/` · fases en `juk-portal/docs/phases.md` · ADRs en `juk-portal/docs/architecture.md`.
