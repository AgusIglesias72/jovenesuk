# 04 · Operación y handoff

Todos los comandos corren desde `juk-portal/`.

## Correr en local

El proyecto necesita variables de entorno (sobre todo `DATABASE_URL`) en `juk-portal/.env.local`
(gitignored). Plantilla en `.env.example`. Para el setup completo de servicios: skill `/juk-setup`.

```bash
cd juk-portal
npm install
npm run dev -- -p 3001    # el 3000 lo usa el dueño del proyecto para otra cosa
```

> Nota: drizzle-kit y tsx NO cargan `.env.local` solos. Para correr migraciones/seed:
> `set -a; source .env.local; set +a; npm run db:generate` (bash). El dev server (Next) sí lo carga.

Login con el `super_admin` del seed (la password temporal se imprime al correr `npm run db:seed`).
Si la sesión expira (8h), volvés a entrar.

## Calidad y tests

```bash
npm run typecheck    # tsc --noEmit (estricto)
npm run lint         # eslint (flat config)
npm run test         # Vitest — unit tests del dominio (src/**/*.test.ts)
npm run test:watch   # Vitest en modo watch
npm run test:e2e     # Playwright (reusa el dev server en 3001)
```

El loop de cierre completo (qué correr antes de dar por lista una feature) está en el skill
**`/juk-cierre`** — es la Definition of Done única del proyecto. Mantené `typecheck`, `lint`
y `test` en verde antes de commitear (es lo que el agente `juk-revisor` también chequea).

## Base de datos y migraciones

- Cada cambio en `src/lib/db/schema/` necesita una migración: `npm run db:generate` → revisar el SQL en
  `drizzle/` → commitearla JUNTO con el cambio. Usá el skill `/juk-migracion`.
- Aplicar: `npm run db:migrate` (local) o `npm run db:push` solo para el primer greenfield.
- A producción las migraciones se aplican manualmente (workflow bloqueante antes del deploy).
- DB en Neon, región São Paulo. Cada PR puede usar una branch de Neon (copy-on-write) para previews.

## Deploy

- Vercel, **Root Directory = `juk-portal`** (el repo está en `jovenesuk/`, la app en el subdirectorio).
- Región `gru1`. Copiar las env vars de `.env.local` a Vercel (Production + Preview).
- CI: `.github/workflows/ci.yml` corre typecheck + lint en cada PR.

## El harness de Claude Code (`.claude/`)

Acelera el trabajo respetando las convenciones. Skills (slash commands): `/juk-modulo`, `/juk-paso`,
`/juk-migracion`, `/juk-gate`, `/juk-setup`. Agentes: `juk-arquitecto` (diseño), `juk-prd-analyst`
(blockers), `juk-revisor` (review), `juk-infra` (devops). Hooks automáticos: pureza de dominio,
recordatorio de migración, aviso de módulos gated.

## Antes de codear: chequeá los gates

`juk-portal/OPEN_DECISIONS.md` lista decisiones de negocio abiertas que bloquean módulos. Antes de tocar
**pagos, validación de pasaporte o el paso 9 (psicofísico)**, corré `/juk-gate <área>` o consultá al
agente `juk-prd-analyst`. Hoy bloquean: el módulo de Pagos, el trigger de asignación alumno↔viaje, y la
estructura del M7.

## Cómo agregar un módulo nuevo (resumen)

1. `/juk-gate <módulo>` — confirmá que no esté bloqueado.
2. `/juk-modulo <nombre>` (o seguí el "molde" del doc 02 a mano, mirando Colegios como referencia).
3. Construí de adentro hacia afuera: `domain/` → `db/queries/` → `actions.ts` → UI.
4. Si tocaste schema → `/juk-migracion`.
5. Activá el link en `src/components/admin/admin-shell.tsx`.
6. `npm run typecheck && npm run lint`, probá en el navegador, y pasá el diff por `juk-revisor`.
7. Sumá un spec E2E en `tests/e2e/` si la feature lo amerita.
8. Actualizá el doc 03 (mapa de archivos) y, si cambió el estado, el doc 01.

## Pendientes / próximos pasos

1. **Cerrar los 3 CRIT** con el equipo (María) — desbloquea Pagos, el trigger de asignación y el M7.
2. **Trigger de asignación**: al asignar un alumno, crear los 10 pasos del M6 + las cuotas. La relación
   alumno↔viaje ya existe (detalle del viaje); falta este side-effect — depende de CRIT-01/03.
3. **Módulo de Pagos** y **seguimiento M6/M7** (pasos) — el grueso del valor del portal.
4. **Servicios pendientes**: Resend (emails), Cloudflare R2 (uploads de documentos), Trigger.dev
   (recordatorios), Sentry. Ver `/juk-setup`.
5. **Alertas dinámicas** del dashboard (fase 6).
6. Confirmar la **identidad de git** real (los commits usaron una inferida) y, opcionalmente, ampliar
   los tests (unit de los schemas Zod del dominio).
