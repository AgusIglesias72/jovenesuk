# Documentación de handoff — JUK Portal

Esta carpeta es la **referencia de producto y código** del JUK Portal, pensada para que
mantener el proyecto o pasárselo a otra persona sea lo más simple posible.

Leé en este orden:

1. **[01-producto.md](01-producto.md)** — qué es el portal, quién lo usa, qué módulos tiene y qué falta.
2. **[02-arquitectura-y-convenciones.md](02-arquitectura-y-convenciones.md)** — el stack, la regla de capas, el "molde" de un módulo y las convenciones que se respetan en todo el código.
3. **[03-mapa-de-archivos.md](03-mapa-de-archivos.md)** — qué hace cada carpeta y cada archivo (la guía archivo por archivo).
4. **[04-operacion-y-handoff.md](04-operacion-y-handoff.md)** — cómo correr, migrar, testear y deployar; el harness de Claude; y cómo seguir.

## Otras fuentes (en el repo)

- `juk-portal/CLAUDE.md` — convenciones para Claude Code (resumen operativo).
- `juk-portal/docs/architecture.md` — las 9 ADRs con su rationale.
- `juk-portal/docs/data-model.md` — el modelo de datos narrado.
- `juk-portal/docs/phases.md` — el plan de implementación por fases.
- `juk-portal/OPEN_DECISIONS.md` — decisiones de negocio abiertas que **bloquean** ciertos módulos.

> Mantené esta carpeta actualizada cuando agregues módulos o cambies convenciones.
> El mapa de archivos (03) y el estado (01) son los que más rápido se desactualizan.
