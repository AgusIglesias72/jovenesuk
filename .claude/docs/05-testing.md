# 05 · Testing

> Qué test va en cada capa, cómo se corre cada suite y cómo se escribe un test que atrape un bug
> real. La regla del proyecto es **"cada cambio trae su test"**: una modificación o una
> implementación nueva entra con el test que la cubre. El porqué de esta estrategia está en el
> ADR-016 de [`docs/architecture.md`](../../juk-portal/docs/architecture.md), y la regla de sincronía
> completa (test + PRD + definiciones + estado + mapa) en el [`CLAUDE.md`](../../CLAUDE.md) de la raíz.

## La pirámide, capa por capa

| Capa | Tipo de test | Qué va | Qué NO va | Ejemplos reales |
|---|---|---|---|---|
| `src/lib/domain/`, `src/lib/utils/`, `src/proxy.ts`, `src/lib/routes.ts`, `src/lib/auth/` (`sign-up-policy`, `return-to`, `helpers`), `src/lib/storage/` (`key`, `content-disposition`), `src/lib/email/`, `src/lib/contact.ts`, `src/lib/db/queries/errors.ts`, lógica pura de `src/components/` (ej. `ui/popover-position.test.ts`, `admin/breadcrumb-labels.test.ts`), `scripts/` | **Unit** (Vitest, proyecto `unit`) | Reglas de negocio, schemas Zod, transiciones de estado, cálculos de fechas y plata, parsers. Con los bordes: el día exacto del vencimiento, la cuota N, el valor fuera de rango | Nada que necesite la base o Next | `domain/viajes/transiciones.test.ts`, `domain/webhooks/svix.test.ts`, `utils/paginate.test.ts`, `scripts/check-test-companions.test.mjs` |
| Server actions de pantalla (`src/app/**`: `actions.ts(x)`, `_actions.ts`, `*-actions.ts`) y compartidas (`src/lib/actions/`) | **Unit con mocks** | Que el guard corte según el rol **antes** de tocar una query; que Zod rechace; el ownership (una familia no toca lo de otra); qué se audita y qué se revalida; cómo se traduce cada error | El SQL de las queries (va mockeado) | `familias/_actions.test.ts`, `viajes/actions.test.ts`, `usuarios/actions.test.ts` |
| Queries con SQL no trivial y jobs (`src/lib/db/queries/`, `src/lib/jobs/`) | **Integración** (Vitest, proyecto `integration`, contra Postgres real) | Agregados, `filter`, joins, orden y paginación; que el SQL coincida con la regla del dominio; efectos atómicos (`db.batch`); jobs diarios | Reglas que ya cubre el unit | `queries/pagos.integration.test.ts` (SQL contra dominio), `queries/asignar-alumno.integration.test.ts`, `jobs/scan-recordatorios.integration.test.ts` |
| Pantallas y flujos | **E2E** (Playwright) | Que el flujo funcione de punta a punta en el navegador: formularios, permisos por rol, lo que persiste después de recargar, webhooks por HTTP | Todas las ramas de una regla (eso es unit) | `recorrido-completo.spec.ts`, `familias-acciones.spec.ts`, `uploads-acceso.spec.ts` |
| Teléfono | **E2E `@mobile`** (viewport Pixel 7) | Tarjetas en vez de tablas, tap targets, drawer, formularios sin zoom | — | `listados-mobile.spec.ts`, `smoke-mobile.spec.ts` |
| Accesibilidad | **E2E** | Nombres accesibles, un solo `h1`, `alt`, foco visible en pantallas clave | — | `a11y-basico.spec.ts` |

## Unit

```bash
npm test                                  # todo el proyecto unit
npm run test:watch
npx vitest run src/lib/domain/cuotas      # una carpeta o archivo
npm run test:coverage                     # con cobertura y piso
```

- Tests en `src/**/*.test.ts(x)` (y `scripts/**/*.test.mjs`), al lado del archivo. Entorno `node`.
- **Cobertura** (`vitest.config.ts`): mide `src/lib/domain`, `src/lib/utils` y `src/lib/actions`, y
  excluye `index.ts`, `labels.ts`, `errors.ts`, tests y `__tests__/`. Tiene un **piso** que hace
  fallar la corrida si la cobertura baja: 94 líneas, 94 statements, 95 funciones y 90 ramas
  (`thresholds`), unos puntos abajo de lo medido el 10/09/2026 (97,8 líneas, 97,5 statements,
  100 funciones, 95 ramas). Subilo cuando la cobertura suba; bajarlo necesita una razón escrita en el
  mismo commit.
- **En CI** Vitest suma los reporters `github-actions` (anota cada test fallido en la PR) y `junit`
  (`test-results/vitest-junit.xml`). El job `check` sube `coverage/` y ese junit como artifact
  `unit-coverage` (14 días).
- Ojo con el número: `configuracion/`, `documentos/` y `recordatorios/` tienen lógica en su
  `index.ts`, y esa lógica **no entra** en la cobertura. No sumes lógica nueva a un `index.ts`.
- **Tests de actions:** los mocks compartidos están en `src/lib/actions/__tests__/mocks.ts`. Cada
  test declara `vi.mock("@/lib/auth/helpers", …)`, `next/cache`, `@sentry/nextjs` y `safe-audit` con
  una factory que importa ese módulo. Los `require*` falsos **replican la regla real de roles**, así
  se puede llamar a una action de admin con sesión de familia y verificar que corta con redirect sin
  tocar la query. Las queries se mockean por archivo con `vi.hoisted`.

## Integración (contra Postgres real)

```bash
# bash: contra la base de dev (crea y borra solo filas propias)
INTEGRATION_DATABASE_URL=$DATABASE_URL npm run test:integration
```
```powershell
$env:INTEGRATION_DATABASE_URL = $env:DATABASE_URL; npm run test:integration   # con el env ya cargado (ver 04)
```

- Archivos `src/**/*.integration.test.ts`. **Solo corren con `INTEGRATION_DATABASE_URL`.** Sin esa
  variable, cada archivo se saltea (`describe.skipIf(!integracionHabilitada)`) y el setup
  (`tests/integration/setup.ts`) apunta `DATABASE_URL` a un host `.invalid`: si un test se escapa del
  skip, falla en vez de escribir en la base de dev que trae `.env.local`.
- Los fixtures (`tests/integration/fixtures.ts`) marcan todo lo que crean con un prefijo por corrida:
  colegios `[INT] …`, viajes `INT-<corrida>-…`, alumnos con DNI `INT-<corrida>-…` y email
  `int+…@int.jovenesenuk.com`. En `afterAll` borran **solo por id propio o por el prefijo de su
  corrida**, aunque el test haya fallado. Los restos huérfanos de más de 6 h también se limpian.
- Los archivos corren en serie (`fileParallelism: false`) con 30 s de timeout.
- Importá la query con `await import("./query")` **dentro** de `beforeAll`, después de `fx.iniciar()`:
  `@/lib/db` lee `DATABASE_URL` al importarse.
- En `npm run ci:local` (y en el job `e2e` manual de GitHub) corren contra la branch efímera de
  Neon, antes de Playwright.

- ⚠️ **No mezcles relojes en un assert.** Comparar una fecha escrita con `new Date()` (reloj de la
  máquina) contra una escrita por Postgres (`defaultNow()`, `now()`) falla apenas hay unos segundos
  de desfasaje: pasó el 15/09/2026 con la reactivación de una asignación, y el bug era del código,
  no del test. Si una columna de fecha ya nace con `defaultNow()`, escribila siempre con `now()`.

## La suite completa en local: `npm run ci:local`

Es la forma recomendada de correr integración + E2E: crea una branch efímera de Neon hija de
`ci-base` (estructura y registro de migraciones, **sin datos**), migra, siembra, corre todo y la
borra. No toca la base de dev y convive con el `next dev` del 3000. Detalle y opciones en
[04 · El CI en local](04-operacion-y-handoff.md#el-ci-en-local-npm-run-cilocal). La lógica del
script (qué pasos, qué variables pisa) está testeada en `scripts/ci-local.test.mjs`.

## E2E (Playwright)

### Precondiciones

1. `.env.local` con `DATABASE_URL`, `SEED_TEST_PASSWORD` y `GOOGLE_FORM_WEBHOOK_SECRET`.
   `playwright.config.ts` lo carga solo.
2. `npm run db:seed:demo` corrido **al menos una vez** sobre la base apuntada (cuentas `test.*`,
   familias demo, dataset `[DEMO]`).
3. Nada más: Playwright levanta `npm run dev -- -p 3001` (o `npm run start` con `E2E_SERVER=start`)
   y reusa uno si ya está corriendo. El server arranca con `EMAIL_DRY_RUN=1`: los mails se
   renderizan pero no salen.

**En CI** Playwright siempre levanta un server propio, con 2 reintentos por test y reporte html. Corre
sobre `next dev` **a propósito** (`E2E_SERVER=dev` en `ci.yml`): en modo producción rigen el rate
limit real de login (5 cada 15 min) y la exigencia de R2, y aflojarlos con un flag sería un bypass
de seguridad activable por variable de entorno. El build de producción ya se valida en el job
`check`. En GitHub el job `e2e` **solo corre a mano** (por costo), depende de que pase `check` y se
saltea **sin fallar** si faltan los secrets `NEON_API_KEY`/`NEON_PROJECT_ID`. Secrets y variables
del job en [04 · CI](04-operacion-y-handoff.md#ci-github-actions).

```bash
npm run test:e2e                                   # toda la suite
npm run test:e2e -- tests/e2e/pagos.spec.ts        # un spec
npm run test:e2e:mobile                            # solo @mobile
npx playwright test --project=public               # solo el sitio público
npx playwright test --grep @slow --project=chromium   # el recorrido completo
PW_PORT=3000 npm run test:e2e -- consultas         # contra el dev del dueño
```

Otras variables (todas opcionales). En el encabezado de `tests/e2e/helpers.ts`: `E2E_DATABASE_URL`
(una branch dedicada para no tocar la base de dev), `E2E_EMAIL`/`E2E_PASSWORD`,
`E2E_FAMILIA_EMAIL`/`E2E_FAMILIA_PASSWORD`, `SEED_FAMILIA_PASSWORD`, `E2E_COLEGIO` y `PW_PORT`. En
`playwright.config.ts`: `E2E_SERVER` (`dev` o `start`; elige entre `npm run dev` y `npm run start`
sobre un build existente).

### Proyectos

| Proyecto | Qué corre | Sesión |
|---|---|---|
| `setup` | `auth.setup.ts`: login de admin guardado en `tests/e2e/.auth/admin.json` (gitignored) y el "Colegio E2E Base" garantizado. Al terminar dispara `cleanup` | — |
| `cleanup` | `global.teardown.ts` → `cleanup.ts`: borra lo que generó la corrida | — |
| `setup-familia` | `familia.setup.ts`: login de familia en `tests/e2e/.auth/familia.json` | — |
| `chromium` | Todo menos `public`, `familias` y `familias-ux`, y menos lo taggeado `@mobile` | Admin |
| `mobile` | **Solo** lo taggeado `@mobile` (tag en el título o `{ tag: "@mobile" }`), viewport Pixel 7 | Admin (y familia donde el spec la pide) |
| `familias` | `familias.spec.ts` y `familias-ux.spec.ts` | Familia |
| `public` | `public.spec.ts` | Sin sesión |

**Por qué las sesiones se comparten.** Better-Auth limita `/sign-in/email` a 30 intentos cada 15
minutos en dev y a 5 en producción. Loguearse en cada test agotaba la ventana y los últimos tests
fallaban con "credenciales inválidas". Por eso hay un login por proyecto, guardado como
`storageState`. Un spec que necesita loguearse de verdad (auth, cuentas desactivadas, dos familias)
lo hace en su propio contexto, y pocas veces.

**Datos y limpieza.** Los generadores de `helpers.ts` y `helpers-flujos.ts` crean datos
inconfundibles: viajes `UK-2099-…`; alumnos con DNI `E2E-…` o tutor `tutor-…@example.com` /
`tutor….…@e2e.jovenesenuk.com`; colegios `Colegio E2E …` y `Prospecto E2E …` (los que nacen al
convertir un prospecto); GLs `gl-…@example.com`; cuentas y leads `e2e+…` o `…@e2e.example.com`.
`cleanup.ts` borra solo esos patrones (la lista canónica está en su cabecera), incluidos los
`documentos` de los pasos E2E (la tabla no tiene FK, así que no cascadean), y preserva el colegio
base y el seed `[DEMO]`.
Si agregás un generador con otro patrón, sumalo a `cleanup.ts`, o la base de dev se infla y los
listados se ponen lentos.

### Cuatro trampas que ya costaron caro

Aparecieron entre el 18 y el 19/09/2026, y ninguna era un bug del producto: eran tests que acusaban
a código sano. Antes de "arreglar" el código porque un E2E se puso rojo, descartá estas.

1. **Un color leído de un tiro sale interpolado.** Los controles del sistema transicionan el borde
   (`transition-colors duration-150` en el `Checkbox`, `transition-[border-color,box-shadow]` en
   `Input`, `Textarea` y `Select`). Leer `getComputedStyle(...).borderTopColor` apenas aparece el
   `aria-invalid` devuelve un valor **a mitad de camino**: una aserción del borde rojo del
   consentimiento recibió `rgb(199,187,177)`, el 3% del recorrido entre el borde normal y
   `--c-danger`. El color no estaba en ningún archivo del repo, que es la pista de que es
   interpolado. Va con `expect.poll(...)` o `toHaveCSS`, que reintentan; nunca un `evaluate` suelto.
2. **`getByRole("alert")` nunca da 0.** Next monta en toda página un
   `<div id="__next-route-announcer__" role="alert">` vacío para anunciar los cambios de ruta, así
   que un `toHaveCount(0)` global falla siempre, aunque la pantalla no tenga ni un error. Hay que
   acotar al `form` o al `main` (como ya hacen `usuarios-abm` y `usuarios-acceso`).
3. **Un mensaje de error aparece dos veces, y es a propósito.** El formulario público anuncia cada
   error en una región `aria-live="polite"` `sr-only` que repite el texto con el rótulo del campo
   adelante ("DNI: El DNI va solo con números."), además del `<span role="alert">` visible. Un
   `getByText(MENSAJE)` matchea por substring y rompe por strict mode. Para lo que **ve** la
   familia, texto exacto; para lo que **escucha** el lector de pantalla, un aserto propio sobre la
   región viva. Los dos casos valen y conviene tener los dos.

4. **El server de los E2E lee el `.env.local` de quien los corre.** Next lo carga solo, así que un
   secreto que alguien suma en su máquina cambia lo que ven los tests. Pasó el 19/09/2026: cargar las
   credenciales de Google en local prendió el botón en los E2E y rompió los dos specs que aseveran
   "sin credenciales no hay botón" (en el CI de GitHub pasaban, porque ahí no están). Lo que los E2E
   tienen que ver distinto de una máquina de desarrollo se fija en `webServer.env` de
   `playwright.config.ts` —hoy `EMAIL_DRY_RUN=1` y las dos de Google **vacías**—: Next no pisa con
   `.env.local` una variable que ya viene definida.

Y una regla que no es de Playwright: **cuando se endurece un schema de dominio, los fixtures de los
E2E son datos de entrada como cualquier otro.** Al sumar `CARACTERES_NOMBRE` se volvieron inválidos
tres literales que decían `E2E` (el `2` es un dígito, y los nombres ya no los aceptan): cuatro tests
murieron esperando 60 segundos un acuse que nunca iba a llegar. `completarFichaInscripcion` ahora
valida la ficha contra el schema **antes** de tipearla, así el fallo nombra el campo en vez de
agotar el timeout.

### Diagnosticar un E2E que falla

- El trace de cada intento fallido queda en `test-results/` (`trace: "retain-on-failure"`). Se abre
  con `npx playwright show-trace <ruta>/trace.zip`. Para tracear aunque pase: `--trace on`.
- **Playwright no muestra el stdout del server de dev**, así que el log de la corrida no trae los
  requests. Para ver qué respondió el server (un 500, un redirect), leé los requests y respuestas del trace.
- En CI: artifact `playwright-report` (html + `test-results/`).

## Accesibilidad

`tests/e2e/a11y-basico.spec.ts` revisa a mano, sobre `/dashboard`, `/alumnos`, `/alumnos/nuevo`, `/`
y `/login`: nombre accesible (el placeholder **no** cuenta), un solo `h1`, `alt` en imágenes y foco
visible. El mensaje de error dice qué elemento falló y dónde está.

`@axe-core/playwright` **ya está instalado pero todavía no se usa**: el spec sigue con los chequeos
hechos a mano, y su comentario de cabecera quedó viejo (dice que axe no está instalado). Migrarlo
está pendiente. La forma prevista:

```ts
import AxeBuilder from "@axe-core/playwright";
const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
```

## El contrato: cada cambio trae su test

| Quién | Qué verifica | Cuándo |
|---|---|---|
| `npm run check:tests` (`scripts/check-test-companions.mjs`) | Todo `.ts`/`.tsx` **nuevo o modificado** en `src/lib/domain`, `src/lib/utils` o `src/lib/actions` tiene `<archivo>.test.ts(x)` al lado. Exentos: `index`, `labels`, `errors`, `types`, `.d.ts`, tests, `__tests__/` y archivos que solo declaran tipos. Un archivo borrado no exige nada. Con `npm run check:tests` (`--base auto`: a mano y en el pre-push) compara contra el merge-base de `CHECK_TESTS_BASE`, `origin/main` o `HEAD~1`, e incluye cambios sin commitear y archivos sin trackear. En el CI se llama con `--base` explícito: el SHA base de la PR o el `before` del push (con `HEAD~1` de respaldo) | A mano, en el pre-push y en el CI |
| Hook pre-push (`.githooks/pre-push` en la **raíz del repo**, no en `juk-portal/`; opt-in con `npm run hooks:install` desde `juk-portal/`) | `typecheck` → `lint` → `npm test` → `check:tests`. Si algo falla, el push se cancela (un push que solo borra ramas no chequea nada). `git push --no-verify` solo en emergencias: el CI va a quedar en rojo igual | En cada `git push` |
| CI, job `check` | Todo lo anterior + cobertura con piso + audit + build. El job `e2e` suma integración y Playwright (se saltea si Neon no está configurado). Sin GitHub Pro el CI informa pero **no bloquea** merges: mirá el resultado antes de mergear | Push y PR a `main` |
| `/juk-cierre` | El loop completo, E2E del módulo tocado y navegador incluidos | Al cerrar una feature |

Lo que la máquina **no** exige, pero igual es parte del contrato:

- Las actions de pantalla (los archivos `"use server"` de `src/app/**`: `actions.ts(x)`,
  `_actions.ts`, `*-actions.ts`) no están bajo `check:tests` (solo `src/lib/actions/`). Si tocás una,
  actualizá o creá su test al lado. Hoy **no tienen test**: `(admin)/alumnos/actions.ts`,
  `(admin)/colegios/actions.ts`, `(admin)/consultas/actions.ts`, `(admin)/group-leaders/actions.ts`,
  `(admin)/alumnos/[id]/documentos-actions.ts`, `(admin)/viajes/[id]/group-leaders-actions.ts` y
  `(public)/leads/actions.ts`.
- Una pantalla o flujo nuevo trae su spec E2E. Un bug arreglado trae el test que lo reproduce y que
  fallaba antes del fix.
- Una query con SQL nuevo no trivial (agregado, `filter`, orden de paginación) trae su test de integración.

## Cómo escribir un test que atrape un bug real

**Principios**

- **Testeá comportamiento, no implementación.** Si el test pasa aunque la regla esté mal, no sirve.
  Una tautología ("el mock devuelve X, espero X") no prueba nada.
- **Buscá el borde y el caso negativo.** Los bugs que destaparon los tests de este proyecto estaban
  ahí: el webhook de Resend aceptaba un evento viejo reenviado (faltaba tolerancia de timestamp) y
  verificaba con clave vacía si el secret venía mal; `paginar()` aceptaba `?page=1.5`; `/pagos`
  ordenaba sin desempate; la auto-confirmación del viaje decidía con un estado desactualizado; se
  podía cancelar un viaje finalizado, marcar transfers salteando Pasajes o que una familia reabriera
  un D1 completado.
- **Autorización siempre en negativo:** con otro rol, con otra familia (`IDS.otraFamilia` en los
  mocks, `tutor2@demo…` en E2E), sin sesión. Verificá que corte **antes** del efecto
  (`sinEfectos()` en los tests de actions).
- **Si el SQL replica una regla del dominio, comparalos.** `pagos.integration.test.ts` calcula lo
  mismo con la query y con `estadoEfectivoCuota` y exige que coincidan.
- **Fechas fijas.** Pasá `hoy`/`ahora` como parámetro (las funciones del dominio lo aceptan) en vez
  de depender del reloj.

**E2E**

- **Selectores semánticos:** `getByRole`/`getByLabel` dentro de una región con nombre. Nada de
  `.nth()`, clases CSS, texto de `<option>` para ubicar un select ni `click({ force: true })`. Si la UI
  no da un nombre para desambiguar, se agrega en el componente: es un problema de accesibilidad, no
  del test. Criterio completo en la cabecera de `tests/e2e/helpers.ts`.
- **Nunca `waitForTimeout`.** Esperá una condición: `expect(...).toBeVisible()`, `waitForURL`, `expect.poll`.
- **Verificá que persistió:** recargá la página o consultá la base (`helpers-flujos.ts` tiene
  lecturas directas como `pasoDeAlumno`). Que el toast diga "guardado" no alcanza.
- En modo card (teléfono), el nombre accesible de la celda incluye el rótulo: filtrá con `hasText`.

**Trampas que ya costaron horas**

1. **`browser.newContext()` hereda el `storageState` del proyecto.** Dentro de Playwright Test, un
   contexto nuevo del proyecto `chromium` arranca **con la sesión de admin**. Si tiene que arrancar
   sin sesión, pasá `storageState: { cookies: [], origins: [] }` explícito (así lo hace
   `familias-acciones.spec.ts`). Si no, `/login` redirige a `/dashboard` y el test se cuelga
   esperando un campo que nunca aparece.
2. **Interactuar antes de que React hidrate se pierde en silencio.** El control ya está en el HTML
   del server, `fill()` escribe el valor en el DOM, pero ningún `onChange` corre y no se guarda nada.
   Se verificó con una sonda: fill antes de hidratar, no se guardó; después, sí. Antes de interactuar
   con un control de una página recién cargada, llamá a `esperarHidratacion(control)` de
   `tests/e2e/helpers.ts` (espera a que el nodo tenga el fiber de React; no es un timeout fijo).
   **Un `toHaveValue` no prueba nada acá:** lo cumple el HTML del server.
3. **Un string con content-type JSON se serializa.** Para mandarle JSON roto a un webhook con
   `request.post`, pasalo como `Buffer`: un string con `Content-Type: application/json` se vuelve a
   serializar y llega como JSON válido.
4. **Datos compartidos entre tests:** generá datos únicos por test (`sufijoUnico()`, `codigoViajeUnico()`).
   Los workers son 1 y no hay paralelismo, pero la base es la misma entre corridas.
