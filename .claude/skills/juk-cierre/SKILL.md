---
name: juk-cierre
description: Definition of Done del JUK Portal — el loop completo antes de dar por cerrado un cambio: typecheck, lint, unit con cobertura, test compañero, integración, E2E (desktop y teléfono), next build, prueba en navegador, juk-revisor y la regla de sincronía de docs (PRD, OPEN_DECISIONS, architecture, design-system, estado-actual, CHANGELOG, mapa 03). Usalo al terminar cualquier cambio no trivial.
---

# /juk-cierre — Definition of Done

El cierre único del proyecto: si otro skill dice "cerrá", es esto. Un cambio no está listo
hasta que pasó por acá **y lo viste funcionar**. Comandos desde `juk-portal/` salvo que se diga otra cosa.

Al final, reportale al usuario qué corriste y qué dio (no "debería andar").

## 0. Qué tocaste

- `git status` y `git diff --stat` desde la raíz del repo. Anotá las capas: schema, domain /
  utils / `src/lib/actions`, queries, jobs y trigger, server actions, pantallas, portal de
  familias, webhooks, docs.
- Ubicá la spec del cambio: `docs/prd/00-indice.md` → el doc del módulo. Estado del módulo:
  `docs/estado-actual.md`. Lo necesitás para el paso 10.

## 1. Estática

```bash
npm run typecheck
npm run lint
```

Además, ninguna clase de Tailwind puede armarse por interpolación (el JIT lee el texto del
archivo, comentarios incluidos, y emite CSS inválido que tira el server):

```bash
grep -rnE '(bg|text|border|shadow|ring|from|to|fill|stroke)-\[[^]]*\$\{' src/
```

Tiene que dar 0. Si hay un caso, se escriben las clases completas y se elige entre ellas.

## 2. Unit con cobertura

```bash
npm run test:coverage
```

- Proyecto Vitest `unit` (`src/**/*.test.ts(x)` y `scripts/**/*.test.mjs`). Mientras iterás:
  `npx vitest run <ruta>` o `npm test`.
- Falla si la cobertura de `src/lib/domain`, `src/lib/utils` y `src/lib/actions` baja del piso
  de `vitest.config.ts`. **No bajes el piso para que pase**: si cae, faltan tests.
- El número excluye `index.ts`, `labels.ts` y `errors.ts`. Ojo con `domain/configuracion`,
  `domain/documentos` y `domain/recordatorios`: tienen lógica en su `index.ts`, así que la
  cobertura no la mide; su test existe igual y hay que mantenerlo.

## 3. Test compañero y tests por capa

```bash
npm run check:tests
```

Todo archivo nuevo o modificado de `src/lib/domain`, `src/lib/utils` o `src/lib/actions` trae
su `<archivo>.test.ts` al lado (exentos: `index.ts`, `labels.ts`, `errors.ts`, `types.ts` y
archivos solo de tipos). Es lo mismo que corren el pre-push y el CI; el hook
`test-companion-check` ya te avisó al editar.

Lo que ningún script verifica y revisa `juk-revisor`:

| Si tocaste… | Tiene que haber… |
|---|---|
| una server action (`src/app/**/actions.ts`, `*-actions.ts`, `familias/_actions.ts`) | su `.test.ts` con los mocks de `src/lib/actions/__tests__/mocks.ts`: sin sesión o rol incorrecto, Zod inválido, ownership, camino feliz, error de query |
| una query con lógica SQL (filtros compuestos, agregados, ORDER BY paginado, escrituras encadenadas con `db.batch`; neon-http no tiene `db.transaction()`) o un job de `src/lib/jobs/` | `*.integration.test.ts` al lado (paso 4) |
| una pantalla o flujo | spec en `tests/e2e/` (paso 5) |
| un bug | un test que lo reproduce |

Ningún test se borra, se saltea ni se afloja sin un motivo escrito en el commit.

## 4. Integración (si tocaste queries con lógica SQL, jobs, el trigger de asignación o cuotas)

```bash
INTEGRATION_DATABASE_URL=<url de una branch de Neon> npm run test:integration
```

- Sin `INTEGRATION_DATABASE_URL` los archivos se saltean y `DATABASE_URL` apunta a un host
  `.invalid` a propósito: un test mal gateado nunca escribe en la base de desarrollo.
- Contra la base de dev (tiene datos reales del dueño; los tests solo crean filas con prefijos
  `INT-`, `[INT]`, `int+` y las borran): con `.env.local` cargado en la shell,
  `INTEGRATION_DATABASE_URL=$DATABASE_URL npm run test:integration`. Receta para cargar el
  entorno en bash y PowerShell: `.claude/docs/04-operacion-y-handoff.md`.

## 5. E2E

- Playwright levanta `next dev` en **3001** (`PW_PORT`). El 3000 es del dueño: no lo mates. Next 16
  no permite dos dev servers del mismo proyecto; si el del dueño está corriendo, apuntá los
  tests a ese con `PW_PORT=3000`.
- Ojo con `CI` en local: si la variable `CI` está seteada y existe `.next/BUILD_ID` (hiciste un
  build), `playwright.config.ts` levanta `next start` en vez de `next dev`. Para forzar dev:
  `E2E_SERVER=dev`.
- Lo afectado: `npx playwright test tests/e2e/<spec>.spec.ts --project=chromium` (los proyectos
  de setup corren solos por dependencia).
- Si toca el teléfono (layout, navegación, formularios, tablas en modo card): también
  `npm run test:e2e:mobile` (proyecto `mobile`, solo los tests etiquetados `@mobile`).
- Portal de familias: `--project=familias`. Sitio público: `--project=public`.
- Cambio transversal (auth, proxy, shell, design system, helpers de tests): `npm run test:e2e` completo.
- Pantalla o flujo nuevo sin spec: escribilo (`tests/e2e/helpers.ts`, `helpers-flujos.ts`).
  Reglas que costaron caro (detalle en `.claude/docs/05-testing.md`):
  - un contexto que tiene que arrancar sin sesión se crea con
    `storageState: { cookies: [], origins: [] }`; si no, hereda la del proyecto;
  - antes de interactuar con un control de una página recién cargada, `esperarHidratacion`
    (un `fill` antes de hidratar se pierde en silencio y `toHaveValue` igual pasa);
  - selectores por rol y nombre accesible.
- Para diagnosticar: `--trace on` y leé requests y respuestas en el trace (el log de Playwright
  no muestra el stdout del server).

## 6. Build de producción

```bash
npm run build
```

Obligatorio antes de cerrar. Rompe cosas que dev tolera: límites server/client, imports de
Node en el cliente, rutas y metadata, config. El CI lo corre con variables dummy (job `check`
en `.github/workflows/ci.yml`).

## 7. Navegador

Con Playwright MCP contra el server de dev: el flujo principal, el estado vacío, un error de
validación y, si toca el layout, el viewport de teléfono. Screenshot si hubo cambio visual. Las
cuentas `test.*` usan la contraseña de `SEED_TEST_PASSWORD` de `.env.local` (no la escribas en
ningún archivo). Un E2E verde no reemplaza ver la pantalla.

## 8. Migración

Si tocaste `src/lib/db/schema/` → `/juk-migracion` (generada, revisada, aplicada, commiteada con el schema).

## 9. Review

Pasá el diff por el agente **`juk-revisor`**. Arreglá los 🔴 y los 🟡 (o justificá por qué no).

## 10. Regla de sincronía — checklist obligatorio

El código y sus docs cambian en el mismo commit. Marcá cada fila que aplique:

| Si el cambio… | Actualizá |
|---|---|
| cambia una regla de negocio, un estado, una validación, un campo o un flujo | la spec en `docs/prd/` (índice en `00-indice.md`) |
| toma o asume una decisión de producto, o destapa una pregunta abierta | `OPEN_DECISIONS.md` (abierta con contexto, opciones y qué hace hoy el código; o movida a resueltas) |
| agrega, quita o cambia tablas o columnas | `docs/prd/03-modelo-datos.md` |
| construye, completa o deja parcial un módulo, pantalla o integración | `docs/estado-actual.md` |
| agrega, borra o mueve archivos o carpetas | `.claude/docs/03-mapa-de-archivos.md` |
| introduce una convención de código | `juk-portal/CLAUDE.md` |
| toma una decisión técnica con alternativas | un ADR en `docs/architecture.md` |
| toca tokens, componentes de `components/ui` o patrones visuales | `docs/design-system.md` |
| cambia cómo se testea, se opera, se deploya o la seguridad | `.claude/docs/05-testing.md`, `04-operacion-y-handoff.md`, `06-seguridad.md` o `07-performance.md` |
| **siempre** (cualquier cambio de código, comportamiento o docs) | una línea en `CHANGELOG.md`, sección `[Sin publicar]` |

Releé lo que escribiste contra el código: un doc que dice algo que el código no hace es peor que
ningún doc. El hook `docs-sync-reminder` lo recuerda al terminar el turno, pero es un recordatorio
grueso (se calla apenas hay cualquier doc vivo modificado): el control real es este checklist y el
reporte que sigue.

Cerrá con el reporte de seis puntos del `CLAUDE.md` raíz (*Cómo se cierra*), en el reporte final y
en el cuerpo del commit:

```
código: …
test: …
PRD: … | no aplica: <motivo>
definiciones: … | no aplica: <motivo>
estado/changelog: …
mapa: … | no aplica: <motivo>
```

Un cambio sin este reporte no está cerrado.

## 11. Commit (cuando el usuario lo pida)

`tipo(scope): descripción` en español. Schema con su migración y código con sus docs y tests
en el mismo commit. Nunca `--no-verify`. El pre-push (opt-in: `npm run hooks:install`) corre
typecheck, lint, unit y `check:tests`.

## Cuándo abreviar

- Copy o estilo puro: pasos 1, 5 (si hay spec que mire ese texto), 7 y `CHANGELOG.md`.
- Solo `src/lib/domain` o `src/lib/utils`: pasos 1, 2, 3, 9 y 10.
- Solo docs: revisá que los paths y comandos que citás existan.
- Harness (`.claude/hooks/*.mjs`): `node .claude/hooks/probar-hooks.mjs` desde la raíz del repo
  (tiene que terminar sin FALLAS; sumá el caso nuevo a la prueba) y el README de hooks.
- Hotfix: pasos 1, 2, 3 (con el test que reproduce el bug), 6 y `CHANGELOG.md`.

**El paso 10 nunca se abrevia si cambió una regla de negocio.**
