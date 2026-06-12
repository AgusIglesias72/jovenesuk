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

Las specs de producto viven en **`juk-portal/docs/prd/`** (empezar por `00-indice.md`); las
decisiones abiertas en `juk-portal/OPEN_DECISIONS.md`. Los 3 CRITs históricos (pagos NEA,
pasaporte UK, psicofísico) quedaron **resueltos** por los PRDs de junio 2026. Antes de tocar un
área sensible, corré `/juk-gate <área>` o consultá el agente `juk-prd-analyst`:

| Área | Bloqueado por | No codear hasta resolver |
|---|---|---|
| **Aprobación de excursiones** (M7 Paso 2) | CRIT-04 | ¿el representante aprueba o solo solicita? (contradicción entre PRDs) |
| **Moneda de cuotas** (B1/B2, resumen de pagos) | CRIT-05 | ¿USD, GBP o multi-moneda? |

Lo que **SÍ** se puede codear sin riesgo: todo lo demás — ABMs, tablero M6 completo (Paso 0 +
Grupos A/B/C/D), validación de pasaporte, trigger de asignación, M7 (salvo el mecanismo de
aprobación de excursiones), dashboard, viajes Individuales, config documental por colegio.

## Cómo trabajar acá

- **Feature nueva** → `/juk-modulo <nombre>` (scaffold por capas) o el agente `juk-arquitecto` para planificar.
- **Implementar un paso del M6/M7** → `/juk-paso <tipo>`.
- **Cambié un schema Drizzle** → `/juk-migracion` (genera + revisa + commitea la migración).
- **¿Puedo tocar este módulo?** → `/juk-gate <área>`.
- **Antes de dar por cerrada una feature** → `/juk-cierre` (typecheck + lint + unit + E2E +
  navegador + `juk-revisor`). Es la Definition of Done única.

## Documentación de handoff

`.claude/docs/` tiene la referencia completa de producto y código (para mantenimiento y traspaso):
producto, arquitectura/convenciones, **mapa archivo-por-archivo**, y operación. Empezá por
`.claude/docs/README.md`. Mantenela actualizada al sumar módulos.

## Estado del proyecto (junio 2026)

- Fase 0-1: auth, reset, AppShell, design system, schemas Drizzle, email templates.
- Construido: ABM de Colegios, Viajes, Alumnos, Group Leaders; Gestión de Usuarios; asignaciones;
  seguimiento M7 parcial; dashboard con datos reales; GlobeLoader; suite E2E (Playwright) + unit
  tests de dominio (Vitest).
- **PRDs nuevos procesados (11/06/2026)**: specs consolidadas en `juk-portal/docs/prd/`. Los CRITs
  viejos quedaron resueltos; el plan de adecuación está en `docs/prd/06-deltas-implementacion.md`.
- Pendiente: fundaciones del modelo nuevo (tipo_viaje, representante, config documental, pasos
  A/B/C/D), trigger de asignación, tablero M6, dashboard v2, webhook, recordatorios, R2.
- Detalle: `.claude/docs/` · fases en `juk-portal/docs/phases.md` · ADRs en `juk-portal/docs/architecture.md`.
