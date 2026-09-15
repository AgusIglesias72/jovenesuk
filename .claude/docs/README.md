# Documentación de handoff — JUK Portal

Para la persona (o el agente) que llega sin contexto a mantener o seguir el JUK Portal. Acá está
el **cómo funciona y cómo se trabaja**. El **qué está hecho y qué falta** vive en otro lado (ver
abajo): esta carpeta no lleva estado ni historial, porque envejecen.

## Orden de lectura

| # | Doc | Qué responde |
|---|---|---|
| 1 | [01-producto.md](01-producto.md) | ¿Qué es el portal, quién lo usa y para qué sirve cada módulo? |
| 2 | [02-arquitectura-y-convenciones.md](02-arquitectura-y-convenciones.md) | ¿Cómo está armado el código? ¿Cómo se construye un módulo hoy, capa por capa? |
| 3 | [03-mapa-de-archivos.md](03-mapa-de-archivos.md) | ¿Dónde está cada cosa? |
| 4 | [04-operacion-y-handoff.md](04-operacion-y-handoff.md) | ¿Cómo lo corro, migro, seedeo, testeo y deployo? ¿Qué servicios y variables usa? ¿Cómo se usa el harness de Claude? |
| 5 | [05-testing.md](05-testing.md) | ¿Qué test va en cada capa? ¿Cómo corro cada suite? ¿Cómo escribo un test que atrape un bug de verdad? |
| 6 | [06-seguridad.md](06-seguridad.md) | ¿Qué protege el sistema, dónde está cada control y qué hay que respetar al sumar algo? |
| 7 | [07-performance.md](07-performance.md) | ¿Por qué importa la cantidad de queries y qué patrones usar para que las pantallas vuelen? |

Si tenés 15 minutos: 01, la sección "El molde de un módulo" de 02 y la tabla de scripts de 04.

## Fuentes de verdad fuera de esta carpeta

Un dato vive en un solo lugar. Estos docs los **linkean**, no los copian.

| Tema | Dónde |
|---|---|
| Qué está construido, qué es parcial, qué falta, servicios conectados, qué depende del dueño, deuda técnica | [`juk-portal/docs/estado-actual.md`](../../juk-portal/docs/estado-actual.md) |
| Historial de cambios por fecha | [`juk-portal/CHANGELOG.md`](../../juk-portal/CHANGELOG.md) |
| El qué funcional (PRD consolidado, user stories, reglas de negocio) | [`juk-portal/docs/prd/00-indice.md`](../../juk-portal/docs/prd/00-indice.md) |
| Decisiones de negocio y técnicas, abiertas y cerradas | [`juk-portal/OPEN_DECISIONS.md`](../../juk-portal/OPEN_DECISIONS.md) |
| El porqué técnico (ADRs) | [`juk-portal/docs/architecture.md`](../../juk-portal/docs/architecture.md) |
| Sistema de diseño STUDIO (tokens, componentes) | [`juk-portal/docs/design-system.md`](../../juk-portal/docs/design-system.md) |
| Convenciones de código (única copia) | [`juk-portal/CLAUDE.md`](../../juk-portal/CLAUDE.md) |
| Cómo se trabaja en el workspace y reglas de sincronía | [`CLAUDE.md`](../../CLAUDE.md) (raíz) |
| App nativa (Capacitor) y lo que la bloquea | [`juk-portal/docs/mobile-app/`](../../juk-portal/docs/mobile-app/) |

## Qué doc tocar cuando cambiás algo

| Si cambiaste… | Actualizá |
|---|---|
| Un módulo, ruta, query, carpeta o archivo nuevo/renombrado | 03 (y 01 si cambia lo que el producto hace) |
| La forma de construir un módulo (molde, contrato de actions, patrón de UI) | 02 |
| Un script de `package.json`, una variable de entorno, un servicio externo, el deploy o el CI | 04 (y `.env.example` si es una variable) |
| Cómo se testea (proyectos de Playwright, `vitest.config.ts`, `check:tests`, jobs del CI) | 05 |
| Auth, roles, autorización, uploads, headers, formularios públicos, webhooks | 06 |
| Un patrón de acceso a datos o de render que afecte la latencia | 07 |
| Qué está hecho / qué falta | `docs/estado-actual.md` + `CHANGELOG.md` (no esta carpeta) |

Todo archivo o función que se nombre acá tiene que existir. Si renombrás algo, buscá el nombre
viejo en `.claude/docs/` antes de cerrar.
