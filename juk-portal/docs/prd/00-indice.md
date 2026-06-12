# Specs internas del JUK Portal — índice

Esta carpeta es la **fuente de verdad funcional** del sistema JUK: la consolidación operativa
de los 4 PRDs de producto (junio 2026), cruzada con el estado real de la implementación.

## Orden de lectura

1. **[01-vision-y-dominio.md](01-vision-y-dominio.md)** — qué es JUK, los 3 portales, roles,
   conceptos transversales (tipos de representante, Grupal/Individual, comisiones, pasaporte)
   y qué decisiones cerraron estos PRDs.
2. **[02-portal-interno.md](02-portal-interno.md)** — spec funcional completa del back-office
   (M1–M7): user stories, criterios de aceptación, reglas de negocio, estados y alertas.
3. **[03-modelo-datos.md](03-modelo-datos.md)** — el modelo de datos objetivo (PRD v1.7),
   entidad por entidad, con delta contra los schemas Drizzle actuales.
4. **[04-portal-familias.md](04-portal-familias.md)** — spec del Portal de Familias (v1.11).
   No construido; define puntos de contacto que el portal interno debe dejar preparados.
5. **[05-vista-representante.md](05-vista-representante.md)** — spec de la Vista del
   Representante (v1.10). No construida; ídem.
6. **[06-deltas-implementacion.md](06-deltas-implementacion.md)** — el gap analysis completo:
   qué hay implementado, qué difiere del PRD y el plan de adecuación priorizado.

## Fuentes

Los PRDs originales (convertidos de DOCX, sin editar) viven en [`fuentes/`](fuentes/):

| Doc | Versión | Archivo |
|---|---|---|
| Portal de Gestión Interno | v1.13 | `fuentes/portal-gestion-interno-v1.13.md` |
| Modelo de Datos | v1.7 | `fuentes/modelo-datos-v1.7.md` |
| Portal de Familias | v1.11 | `fuentes/portal-familias-v1.11.md` |
| Vista del Representante | v1.10 | `fuentes/vista-representante-v1.10.md` |

**Regla:** si una spec interna contradice una fuente, gana la fuente y hay que corregir la
spec. Si dos fuentes se contradicen entre sí, va a `OPEN_DECISIONS.md` como pregunta para el
equipo (María/Felix/Delfina/Tomas).

## Relación con el resto de la documentación

- `juk-portal/OPEN_DECISIONS.md` — decisiones abiertas/gates. Se actualiza desde estas specs.
- `juk-portal/docs/data-model.md` — narración del modelo **implementado** (el doc 03 es el objetivo).
- `juk-portal/docs/architecture.md` — ADRs técnicas (el "cómo"; estas specs son el "qué").
- `.claude/docs/` — handoff de producto y código (estado actual, mapa de archivos).

> Mantenimiento: al incorporar una nueva versión de un PRD, regenerar el archivo en
> `fuentes/`, actualizar la spec correspondiente y el doc 06, y revisar OPEN_DECISIONS.md.
