---
name: juk-migracion
description: Genera, revisa y aplica una migración Drizzle del JUK Portal de forma segura después de cambiar un schema, incluidas las migraciones de datos (drizzle-kit generate --custom). Usalo cada vez que toques src/lib/db/schema/.
---

# /juk-migracion — Migración Drizzle segura

Comandos desde `juk-portal/`. Configuración en `drizzle.config.ts`: schema
`./src/lib/db/schema/*`, salida `./drizzle`, `strict: true`, conexión por
`DATABASE_URL_UNPOOLED` (o `DATABASE_URL` si falta).

> **La base de desarrollo tiene datos reales del dueño.** No es descartable: una migración
> destructiva o mal escrita se lleva datos que no están en ningún otro lado. Si hay DROP, cambio
> de tipo o backfill, probala primero en una branch de Neon y confirmá con el usuario antes de
> aplicarla en dev.

## 1. Schema

- Tabla nueva → re-export en `src/lib/db/schema/index.ts`.
- snake_case en SQL; tipos con `$inferSelect` / `$inferInsert`.
- Baja lógica con `estado` ENUM (TEC-03: no sumar `activo BOOLEAN`).
- FKs con `onDelete` explícito; índices y `unique()` donde la query o el slug los necesitan.

## 2. Generar

```bash
npm run db:generate -- --name=<que_cambia>
```

Escribe `drizzle/NNNN_<nombre>.sql` y actualiza `drizzle/meta/` (snapshot y `_journal.json`).
Poné un nombre que diga qué hace, como las existentes (`0018_ola2_rol_default_y_rate_limit.sql`,
`0019_fase2_indices.sql`). Si drizzle-kit pregunta si una columna es un rename o una nueva,
contestá la verdad: "nueva" significa drop + add, y el drop se lleva los datos.

## 3. Migraciones de datos

drizzle-kit solo genera cambios de estructura. Para completar, normalizar o mover datos:

```bash
npx drizzle-kit generate --custom --name=<backfill_que_hace>
```

Crea un `.sql` vacío, numerado y registrado en el journal. Escribí ahí el SQL (`UPDATE`,
`INSERT … SELECT`). Que sea idempotente cuando se pueda (`WHERE` que no vuelva a tocar lo ya migrado).

Patrón para una columna `NOT NULL` en una tabla con filas, en tres migraciones:
1. generada: la columna entra nullable (o con default);
2. `--custom`: el backfill;
3. schema a `.notNull()` + `db:generate`.

## 4. Revisar el SQL (leelo entero, no lo asumas)

- [ ] `DROP TABLE` / `DROP COLUMN`: ¿intencional? ¿hay datos? Un rename mal contestado sale como drop + add.
- [ ] `NOT NULL` sin default sobre una tabla con filas: falla o necesita backfill antes.
- [ ] `ALTER COLUMN … TYPE`: ¿necesita `USING`? En enums, sumar valores es seguro; sacarlos no.
- [ ] Índices y `unique` que la query necesita; FKs con el `onDelete` correcto.
- [ ] Una migración ya aplicada en alguna base no se edita: se suma otra.
- [ ] Ningún dato del dueño escrito a mano en una migración `--custom`.

## 5. Aplicar

```bash
npm run db:migrate
```

- `drizzle-kit` no lee `.env.local` solo: cargalo en la shell antes (receta para bash y
  PowerShell en `.claude/docs/04-operacion-y-handoff.md`).
- **Nunca `db:push`**: aplica el schema sin migración. Está en `permissions.deny` del harness y lo
  frena el hook `destructive-command-guard`, igual que `drizzle-kit push/drop`.
- CI: el job `e2e` crea una branch efímera de Neon y corre `npm run db:migrate` y los seeds; una
  migración rota se ve ahí.
- Producción: no hay workflow de migración a prod. Se aplica a mano con `db:migrate` apuntando a
  la base de producción, antes del deploy que usa el schema nuevo, y lo decide y coordina el usuario.

## 6. Probar

- `npm run typecheck`.
- Si la migración cambia datos o afecta queries con lógica SQL: `npm run test:integration` contra
  una branch (ver `/juk-cierre` paso 4).

## 7. Docs y commit

- `docs/prd/03-modelo-datos.md` refleja la tabla o columna (regla de sincronía); `CHANGELOG.md`;
  `.claude/docs/03-mapa-de-archivos.md` si hay un archivo de schema nuevo.
- Commit (cuando el usuario lo pida): schema + `drizzle/*.sql` + `drizzle/meta/` juntos.

## Decisiones ⭐

Si el schema toca excursiones o actividades del viaje (CRIT-04 ⭐) o la moneda de las cuotas
(CRIT-05 ⭐), la forma puede cambiar cuando el equipo valide la decisión: avisale al usuario y
mantené el cambio acotado. Estado vigente en `OPEN_DECISIONS.md`.
