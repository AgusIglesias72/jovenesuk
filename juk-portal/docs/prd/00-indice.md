# Specs internas del JUK Portal — índice

Esta carpeta es la **fuente de verdad funcional** del sistema JUK: el **qué** tiene que hacer cada
portal. Consolida los 4 PRDs de producto (versiones de mayo 2026, procesadas el 11/06/2026) y documenta los módulos que se construyeron
sin PRD.

- **Qué está construido hoy** y qué servicios están conectados: [`docs/estado-actual.md`](../estado-actual.md).
- **Qué falta** respecto de estas specs, verificado contra el código: [06](06-deltas-implementacion.md).
- **Qué está sin decidir:** [`OPEN_DECISIONS.md`](../../OPEN_DECISIONS.md).

## Orden de lectura

| # | Spec | Qué cubre | Estado en el código |
|---|---|---|---|
| 1 | [01 · Visión y dominio](01-vision-y-dominio.md) | Qué es JUK, los portales, roles, tipos de representante, Grupal/Individual, comisiones, pasaporte | — |
| 2 | [02 · Portal interno](02-portal-interno.md) | Back-office M1–M7: user stories, reglas, estados y alertas | **Construido**, con gaps en 06 §B |
| 3 | [03 · Modelo de datos](03-modelo-datos.md) | Modelo objetivo (PRD v1.7), delta contra el schema real (§9) y decisiones propias de modelado (§10) | Ver §9 |
| 4 | [04 · Portal de Familias](04-portal-familias.md) | Autoservicio de padres/tutores (v1.11) | **Parcial:** módulos pre-viaje en `src/app/familias/`; durante y post-viaje sin construir (06 §C) |
| 5 | [05 · Vista del Representante](05-vista-representante.md) | Acceso acotado de los group leaders (v1.10) | **No construida** (06 §C) |
| 6 | [06 · Gap vigente](06-deltas-implementacion.md) | Qué pide el PRD y el código no hace, qué está distinto, y el plan priorizado (§D) | Corte 11/09/2026 |
| 7 | [07 · Web pública, consultas y CRM](07-prospectos-y-web-publica.md) | Captación: sitio público, formulario de consulta, newsletter, CRM de prospectos | **Construido** (spec escrita sobre lo construido) |

## Fuentes

Los PRDs originales (convertidos de DOCX, sin editar) viven en [`fuentes/`](fuentes/):

| Doc | Versión | Archivo |
|---|---|---|
| Portal de Gestión Interno | v1.13 | `fuentes/portal-gestion-interno-v1.13.md` |
| Modelo de Datos | v1.7 | `fuentes/modelo-datos-v1.7.md` |
| Portal de Familias | v1.11 | `fuentes/portal-familias-v1.11.md` |
| Vista del Representante | v1.10 | `fuentes/vista-representante-v1.10.md` |

**Reglas:**

- Si una spec interna contradice su fuente, gana la fuente y se corrige la spec, **salvo** que la
  diferencia venga de una decisión registrada en `OPEN_DECISIONS.md` (MIN/CRIT/TEC) o de una
  desviación deliberada documentada ([03 §10](03-modelo-datos.md#10-decisiones-de-modelado-propias)).
  En ese caso la spec cita el código de la decisión.
- Si dos fuentes se contradicen entre sí, va a `OPEN_DECISIONS.md` como pregunta para el equipo
  (María/Felix/Delfina/Tomas) y se marca con `> ⚠️` en la spec.
- Los módulos sin PRD (spec 07) no tienen fuente: la spec es el contrato y se cambia con acuerdo.

## Cómo se mantienen (regla de sincronía)

La regla completa (código + test + PRD + definiciones + estado/CHANGELOG + mapa, en el mismo
cambio) vive en el `CLAUDE.md` de la raíz del workspace (sección "Regla de sincronía"); acá solo va
lo que toca a `docs/prd/`. En el **mismo commit** que cambia el código:

- **Cambió una regla de negocio, un estado o un campo visible** → se actualiza la spec que lo
  define (02, 04, 05 o 07) y, si se implementó distinto a lo escrito, la fila de 06.
- **Se cerró un gap** → se borra o achica su fila en 06 y se suma a `docs/estado-actual.md` y a
  `CHANGELOG.md`.
- **Cambió el schema** → 03 §9 (y §10 si la desviación es deliberada).
- **Apareció una duda** → `OPEN_DECISIONS.md` con lo que hace hoy el código.
- **Llegó una versión nueva de un PRD** → se regenera el archivo en `fuentes/`, se actualiza la
  spec, se recalcula 06 y se revisa `OPEN_DECISIONS.md`.

## Relación con el resto de la documentación

| Doc | Qué tiene |
|---|---|
| [`OPEN_DECISIONS.md`](../../OPEN_DECISIONS.md) | Decisiones abiertas y cerradas |
| [`docs/architecture.md`](../architecture.md) | ADRs técnicos: el **porqué** de cómo está construido |
| [`docs/design-system.md`](../design-system.md) | Sistema de diseño STUDIO |
| [`docs/estado-actual.md`](../estado-actual.md) | Qué está construido, parcial o pendiente; servicios y dependencias del dueño |
| [`CHANGELOG.md`](../../CHANGELOG.md) | Historial por fecha |
| `juk-portal/CLAUDE.md` | Convenciones de código |
| `.claude/docs/` | Handoff: producto, arquitectura, mapa de archivos, operación, testing, seguridad y performance |
