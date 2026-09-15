# 07 · Performance

> Por qué una pantalla de este proyecto es lenta casi siempre por **cuántas queries hace en serie**,
> y los patrones que ya usa el código para evitarlo, con ejemplos reales (`archivo` · `función`).
> El porqué de paginar y agregar en SQL está en el ADR-013 de
> [`docs/architecture.md`](../../juk-portal/docs/architecture.md).

## Por qué cuenta la cantidad de queries

La app usa `drizzle-orm/neon-http` (`src/lib/db/index.ts`): **cada query es un request HTTPS
propio** contra Neon. No hay una conexión abierta que se reutilice, y tampoco `db.transaction()`
interactiva. Vercel (`gru1`) y Neon (`sa-east-1`) están en la misma región (ADR-002), así que cada
round-trip es chico, pero **se suma**: diez `await` en serie son diez viajes uno detrás del otro.

La regla práctica: **contá los `await` a la base que corren en serie en un request**. Todo lo que no
depende del resultado anterior tiene que ir en paralelo, y lo que se pide dos veces en el mismo
request, una sola vez.

## Patrones

### 1. `Promise.all` por etapas

Agrupá por dependencia: todo lo que se puede pedir sin esperar a nadie va en la etapa A, lo que
depende de A en la B, y así.

- `src/lib/db/queries/alertas.ts` · `getAlertas`: tres etapas paralelas. A: colegios + viajes.
  B: config documental, asignaciones y GLs (dependen de A). C: cuotas y pasos (dependen de las
  asignaciones). Antes eran 7 queries en serie. Las **reglas** viven en `src/lib/domain/alertas/`,
  puras y testeadas; la query solo carga filas.
- `src/app/(admin)/alumnos/[id]/page.tsx`: asignaciones y viajes asignables en paralelo; después,
  por cada tablero, pasos y cuotas en paralelo.
- `src/app/familias/[dni]/_data.ts` · `cargarAlumnoFamilia`: sesión y alumno se piden juntos y la
  pertenencia se valida **después**. El chequeo no pierde nada por pedir en paralelo.
- `src/lib/utils/paginate.ts` · `paginarEnSql`: la página y el total salen juntos.

### 2. `cache()` de React: una lectura por request

`cache(fn)` memoiza **por request** en server components: el layout, la página y las secciones
comparten el resultado.

- `src/lib/auth/helpers.ts` · `getSession`: sin cookie cache (ver [06](06-seguridad.md)), cada
  llamada iría a la base. Con `cache()`, layout + página + action leen la sesión una vez.
- `src/app/familias/[dni]/_data.ts` · `cargarAlumnoFamilia`, `asignacionesActivas`, `cuotasActivas`:
  el layout calcula el aviso de cuota vencida y la página de Pagos reusa las mismas cuotas sin
  volver a pedirlas. Un `notFound()` adentro también queda memoizado (se relanza igual).
- `src/app/(admin)/viajes/[id]/sections.tsx` · `asignadosDe`, `groupLeadersDe`: dos paneles que
  necesitan el roster lo piden una vez.

Límites: `cache()` no sirve entre requests, ni en route handlers o jobs. Memoiza por argumentos:
pasale primitivos (un id, un DNI), no un objeto armado en el momento. Se aplica en la capa que
compone la pantalla (`_data.ts`, `sections.tsx`), no dentro de `src/lib/db/queries/`.

### 3. Paginación y agregados en SQL

- **Paginación:** `paginarEnSql(pagina, leer, contar)` con `LIMIT/OFFSET` en la base. Lo usan
  `listAlumnos`, `listViajes`, `listColegios`, las queries de group leaders, leads y prospectos, y
  `listCuotasGlobal`. Si el `page` pedido quedó fuera de rango (cambió el filtro), relee la última
  página real: un round-trip extra solo en ese caso. `paginar()` (en memoria) queda **solo** para
  listas acotadas que ya vienen completas.
- **El orden tiene que ser total:** `listCuotasGlobal` ordena por `fechaVencimiento, numero, id`. Sin
  la columna única del final, dos filas empatadas cambian de lugar entre páginas y aparecen repetidas
  o no aparecen (el bug que tenía `/pagos`).
- **Totales en la base**, no sumando la página visible: `src/lib/db/queries/pagos.ts` ·
  `resumenPagosGlobal` (`sum(...) filter (where …)` por moneda) y `src/lib/db/queries/viajes.ts` ·
  `completitudPorViaje` (`count(*) filter`). Si el SQL replica una regla del dominio, cambialos juntos
  y cubrilo con un test de integración que compare los dos. Pasa con `cuentaParaCompletitud`
  (`src/lib/domain/pasos/estados.ts`): el predicado está copiado en `viajes.ts` ·
  `completitudPorViaje` y en `dashboard.ts`, y **todavía no hay** un test de integración que los
  compare con el dominio (el modelo a seguir es `pagos.integration.test.ts`).

### 4. DTOs livianos hacia el cliente

A un componente `"use client"` le llega todo lo que le pases, serializado en el HTML. Mandá solo lo
que se dibuja.

- `src/lib/db/queries/prospectos.ts` · `listProspectosKanban`: el kanban no pagina (se arrastra entre
  las 7 columnas), así que trae solo las columnas de la tarjeta y cuenta emails y teléfonos en el
  server. Antes viajaban las filas completas, con notas y el token de baja: era un problema de
  performance **y de seguridad**.
- Los selectores de elegibles traen solo las columnas que muestran:
  `src/lib/db/queries/asignaciones.ts` · `alumnosElegibles` y
  `src/lib/db/queries/group-leaders-viaje.ts` · `groupLeadersElegibles`.

### 5. `db.batch`: varias escrituras en un round-trip

`db.batch([...])` manda todos los statements en **un** request, y Neon los ejecuta en una
transacción: o se aplican todos o ninguno.

- `src/lib/db/queries/asignar-alumno.ts` · `asignarConTablero`: 2 round-trips en total. Uno con
  todas las lecturas en paralelo y otro con todas las escrituras en batch (asignación, borrado e
  inserción del tablero, estado del alumno, auto-confirmación del viaje). No quedan asignaciones sin
  tablero ni viajes confirmados de más.
- `src/lib/db/queries/group-leaders-viaje.ts` · `marcarPrincipal`: los dos updates juntos. Nunca
  queda un viaje sin principal ni con dos.

Límites:
- **Los statements se arman antes de mandar el batch.** No se puede leer un resultado a mitad de
  camino y decidir: las decisiones se toman con las lecturas previas.
- **Las lecturas previas no están dentro de la transacción.** Por eso `asignarConTablero` vuelve a
  leer el estado del viaje justo antes (achica la ventana entre chequeo y escritura) y la constraint
  `unique` es la red final: el `23505` lo traduce la action.
- Los resultados vuelven en un array con las posiciones de los statements (`const [, elegido] = await db.batch([...])`).

### 6. Índices

Índices explícitos además de las PKs y de las constraints `unique`:
- de `drizzle/0019_fase2_indices.sql`: `uniq_alumnos_dni` (índice único: el DNI es el slug),
  `idx_alumnos_familia_user` (portal de familias), `idx_asignaciones_viaje` (`viaje_id, estado`) e
  `idx_cuotas_asignacion`;
- de `drizzle/0016_wet_smiling_tiger.sql`: `idx_prospecto_com_prospecto_id` e
  `idx_prospecto_com_resend_message_id` (tracking de outreach por el webhook de Resend).

Cuándo agregar uno: una columna que aparece en el `WHERE` o el `JOIN` de una query frecuente (listado,
dashboard, portal) y que **no** es el prefijo de un índice o `unique` existente. Una `unique` compuesta
ya indexa su primera columna. Verificalo con `EXPLAIN ANALYZE` en el SQL Editor de Neon **antes y
después**. El índice se declara en el schema de Drizzle y entra por migración (`/juk-migracion`).

## Streaming con Suspense y la trampa del 404

- **Detalle con varias secciones:** una sola query bloqueante, la que define el 404 y el título. El
  resto va en `<Suspense>` con su skeleton, así cada sección pinta cuando llega su dato.
  `src/app/(admin)/viajes/[id]/page.tsx` bloquea solo en `getViajeByCodigo` y streamea resumen,
  alertas, alumnos, group leaders, pagos y M7. `src/app/(admin)/dashboard/page.tsx` hace lo mismo por sección.
- **`loading.tsx` en cada segmento**, con la silueta de la pantalla (`src/components/ui/skeleton.tsx`).
  Es lo que se ve al navegar hasta que llega el primer byte de la página.
- **La trampa:** un `loading.tsx` convierte la respuesta en streameada. Si un `notFound()` corre
  **por debajo** de ese boundary, Next ya mandó el status y responde **200** en vez de 404. Pasó en
  el Portal de Familias: un `loading.tsx` en `familias/` hacía que pedir el DNI de otra familia
  contestara 200. El contenido nunca se filtró, pero el status sí. Está documentado en
  `src/app/familias/[dni]/layout.tsx`. La regla:
  - El chequeo que decide un 404 **que importa** (pertenencia, existencia) va en un layout o página
    que **no** tenga un `loading.tsx` por encima.
  - Los `loading.tsx` de `familias/[dni]/` y de sus páginas internas (`pagos/`, `documentacion/`,
    `datos/`, `viaje/`, `ayuda/`) son seguros: quedan por debajo del layout de `[dni]`, que hace el
    chequeo de pertenencia. El único prohibido es `src/app/familias/loading.tsx`.
  - Dentro de una página, el `notFound()` va antes de cualquier `<Suspense>`.

## Cliente y assets

- **Router cache:** `experimental.staleTimes` (`dynamic: 30`, `static: 180` segundos en
  `next.config.ts`). Volver a una pantalla recién visitada no pide el RSC de nuevo. Las mutaciones
  siguen frescas porque `revalidatePath` purga esa caché. La navegación interna va siempre con
  `next/link` (un `<a href>` recarga la app entera).
- **Imágenes:** `next/image` en el sitio público, con `formats: ["image/avif", "image/webp"]` y
  `minimumCacheTTL` de 31 días. Las imágenes de `public/landing/` se optimizaron (de ~11 MB a
  2,9 MB): las grandes (programas, salidas, testimonios, trips) pasaron a WebP y las acreditaciones
  y el logo se recomprimieron sin cambiar de formato. Una imagen nueva del sitio entra ya optimizada y por `next/image`.
- **Fuentes:** con `next/font` desde el root layout; nada de `@import` externo en CSS (bloquea el render).
- **Service worker** (`public/sw.js`, registrado solo en producción por `src/components/pwa/sw-register.tsx`):
  navegaciones network-first con fallback a `/offline`; cache-first solo para `/icons/` y `/fonts/`
  (máximo 40 entradas); nunca toca `/api/`, `/login` ni `/reset-password`. **No** cachea
  `/_next/static`: esos chunks ya tienen hash y `Cache-Control: immutable`, y duplicarlos sumaba un
  juego completo por deploy que nunca se purgaba. Si cambiás `/offline` o el SW, subí `VERSION`.
- `serverExternalPackages: ["@neondatabase/serverless"]` deja el driver fuera del bundle.

## Cómo medir

- **Contar queries de una pantalla:** en local, activá temporalmente el logger de Drizzle
  (`drizzle({ client: sql, schema, casing: "snake_case", logger: true })` en `src/lib/db/index.ts`),
  cargá la pantalla y contá. **No lo commitees.** Buscá queries repetidas (falta un `cache()`) y
  secuencias que podrían ser paralelas.
- **Tiempos por request:** un trace de Playwright (`--trace on`) muestra cada request con su
  duración. Las DevTools del navegador (Network, con "Disable cache") también sirven.
- **Qué rutas son estáticas:** `npm run build` imprime la tabla de rutas. El sitio público tiene que
  salir estático (○) y el back-office dinámico (ƒ). Si una página pública pasa a dinámica, algo leyó
  `headers()`, `cookies()` o `searchParams` sin querer.
- **Producción:** con `NEXT_PUBLIC_SENTRY_DSN` cargado, Sentry toma trazas de performance del 10% de
  los requests (`tracesSampleRate: 0.1` en `src/instrumentation.ts` y `src/instrumentation-client.ts`,
  activo solo con `NODE_ENV=production`). Sin el DSN no hay trazas: ver servicios en
  [`docs/estado-actual.md`](../../juk-portal/docs/estado-actual.md). El monitoreo de Neon muestra las
  queries lentas.
- **Queries lentas:** `EXPLAIN ANALYZE` en el SQL Editor de Neon, sobre una branch con datos parecidos a los reales.

## Checklist rápido

- [ ] ¿Hay `await` a la base en serie que no dependen entre sí? → `Promise.all`.
- [ ] ¿La misma lectura aparece en el layout y en la página, o en dos secciones? → `cache()`.
- [ ] ¿Un listado que puede pasar las 50 filas? → `paginarEnSql`, con orden total.
- [ ] ¿Un total calculado sumando en memoria? → agregado en SQL.
- [ ] ¿A un client component le llegan filas completas? → DTO con lo que se dibuja.
- [ ] ¿Varias escrituras que deben ser atómicas? → `db.batch`.
- [ ] ¿Un filtro nuevo por una columna sin índice en una tabla que crece? → índice + `EXPLAIN`.
- [ ] ¿Un detalle espera todas sus secciones? → una query bloqueante + `<Suspense>` por sección.
- [ ] ¿Un `loading.tsx` nuevo por encima de un `notFound()` de pertenencia? → movelo.
