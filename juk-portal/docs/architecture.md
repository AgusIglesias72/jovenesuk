# Arquitectura

Decisiones técnicas del JUK Portal con su rationale. Para mantener este documento útil, cada decisión grande lleva fecha y contexto.

## Stack a alto nivel

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend + Backend:  Next.js 16 (App Router) en TypeScript     │
│  UI:                  React 19 + Tailwind + Design System JUK   │
│  ORM:                 Drizzle ORM                                │
│  Base de datos:       PostgreSQL en Neon (sa-east-1)            │
│  Auth:                Better-Auth (email + password)             │
│  Background jobs:     Trigger.dev v4                             │
│  Email transaccional: Resend + React Email                       │
│  File storage:        Cloudflare R2 (S3-compatible)              │
│  Hosting:             Vercel (gru1 — São Paulo)                  │
│  Observabilidad:      Sentry                                     │
│  Repo:                GitHub + Claude Code                       │
└──────────────────────────────────────────────────────────────────┘
```

## ADR-001 · Single Next.js app, no monorepo (mayo 2026)

**Decisión:** mantener todo en un único proyecto Next.js, separando por *route groups* del App Router.

**Por qué no monorepo:**
- Un solo desarrollador. El valor de un monorepo aparece con varios paquetes consumidos por equipos distintos.
- Los 3 futuros portales (admin, representante, familia) comparten el mismo modelo de datos. Separarlos forzaría un paquete compartido — que es básicamente un monorepo.
- Migrar a Turborepo más adelante es un fin de semana de trabajo si el negocio crece.

**Estructura por roles:**

```
app/
├── (admin)/          → portal interno JUK (este PRD v1.1)
├── (representante)/  → futuro
├── (familia)/        → futuro
├── (auth)/           → login, password-reset
└── api/
    ├── v1/           → API REST versionada para futura app nativa
    └── webhooks/     → Google Form, Trigger callbacks, etc.
```

Cada `(grupo)` tiene su propio layout y proxy de validación de rol.

## ADR-002 · Region São Paulo (sa-east-1) en Vercel + Neon (mayo 2026)

**Decisión:**
- Vercel `gru1` para Edge Functions
- Neon `aws-sa-east-1` para Postgres
- Cloudflare R2 (multi-region por defecto, no aplica region selection)

**Por qué:**
- Los 4 admins y las familias argentinas son tráfico primario
- Latencia Argentina ↔ São Paulo ≈ 30–50ms (Argentina ↔ US East ≈ 130ms)
- Cumplimiento más limpio si en el futuro entran datos personales bajo regulaciones argentinas

**Caveat:** las familias UK y colegios destino tendrán latencia mayor desde Europa. Para el back-office interno (este PRD) no es problema. Si el portal de familias toma tracción internacional, evaluar CDN edge caching agresivo en Vercel.

## ADR-003 · Drizzle ORM sobre Prisma (mayo 2026)

**Decisión:** Drizzle ORM en lugar de Prisma.

**Por qué:**
- Schema en TypeScript puro (no DSL externo) → mejor DX con Claude Code en proyecto greenfield
- Más performante en queries complejas (joins entre alumnos/viajes/pasos/cuotas)
- Sin generación de cliente; el tipo viene del schema directamente
- Mejor edge runtime support (Vercel Edge + Neon)
- Migraciones son archivos SQL legibles

**Trade-offs aceptados:**
- Curva de aprendizaje inicial (2-3 días) — vale la pena en greenfield
- Comunidad más chica que Prisma — pero documentación oficial es excelente
- Migración Drizzle → Prisma posible si fuera necesario; el schema vive en `lib/db/schema/` aislado

## ADR-004 · Better-Auth sobre Clerk (mayo 2026)

**Decisión:** Better-Auth (lib open-source, datos en nuestra DB).

**Por qué no Clerk:**
- PII de menores de edad debe vivir en nuestra DB, no en un tercero
- Roles custom (admin_juk, super_admin, representante, familia) más fáciles de modelar
- Costo: Better-Auth gratis para siempre vs. Clerk $25/mes pasados los 10k MAU
- Sin lock-in: el día que queramos migrar a otra cosa, los datos ya están en nuestra DB

**Cuándo reconsiderar:** si el sistema explota con miles de usuarios self-registrando o necesitamos social auth premium (Apple Sign In con UX optimizada), evaluar Clerk para portal de familias.

## ADR-005 · Arquitectura interna: dominio puro (mayo 2026)

**Decisión:** lógica de negocio vive en `lib/domain/`, sin importar nada de Next.js o React.

**Estructura:**
```
lib/
├── db/                    → Drizzle queries
├── domain/                → Pure business logic
│   ├── alumnos/
│   ├── viajes/
│   ├── pagos/
│   └── pasos/
└── auth/                  → Auth helpers
```

**Por qué:** preparación para app nativa futura. Cuando llegue, Next.js queda como "adapter web" y la app móvil consume `api/v1/` que es otro adapter sobre el mismo dominio.

**Regla pragmática:** si un archivo en `lib/domain/` importa de `next`, `react`, o `app/`, está mal ubicado.

## ADR-006 · Trigger.dev v4 para background jobs (mayo 2026)

**Decisión:** Trigger.dev v4 para jobs programados y diferidos.

**Casos de uso:**
- Recordatorios escalonados (14/7/3/1 días antes de deadlines) — PRD §6
- Recálculo diario de alertas y mora
- Resumen semanal para María
- Webhook async processing

**Por qué no Vercel Cron:** Hobby plan sólo permite 2 jobs; necesitamos scheduling dinámico (un job por deadline por alumno).

**Por qué no BullMQ + Redis:** infra propia es overhead innecesario para 4 admins + 60 alumnos.

**Por qué no pg_cron:** menos flexible para encadenar tasks y reintentar.

## ADR-007 · Cloudflare R2 sobre S3/Vercel Blob (mayo 2026)

**Decisión:** Cloudflare R2 para PDFs (Application Forms, Immigration Letters, etc.)

**Por qué:**
- Egress gratis (descargar el Parental Consent 1000 veces no cuesta nada)
- API compatible con S3 (`@aws-sdk/client-s3` funciona)
- 10GB gratis, más que suficiente para JUK
- Custom domain (`files.jovenesenuk.com`) sin SSL setup

## ADR-008 · Ambientes: dev + prod + preview por PR (mayo 2026)

**Decisión:** 2 ambientes nominales (dev local, prod en Vercel) + previews automáticos por PR.

**Setup:**
- **Local dev:** `npm run dev` → localhost:3000, conectado a una branch de Neon "dev"
- **PR Preview:** Cada PR automáticamente: Vercel crea una URL única, Neon crea una branch de DB con datos prod (copy-on-write)
- **Producción:** branch `main` → portal.jovenesenuk.com, Neon branch `main`

**Por qué no staging dedicado:** mantenerlo sincronizado con prod es laburo de QA y vos sos el único dev. Las previews por PR resuelven el caso 95% sin mantenimiento.

## ADR-009 · Next.js 16 (no 15) (mayo 2026)

**Decisión:** usar Next.js 16.2+, no quedarse en 15.

**Por qué:**
- Turbopack default en `next build` → builds 2-5x más rápidos
- React Compiler estable → menos boilerplate
- React 19 GA → server actions más maduros
- `proxy.ts` reemplaza `middleware.ts` (nombre más claro)
- Cache Components + PPR → buen rendimiento out-of-the-box

**Caveats:**
- Requiere Node.js 20.9+ (fijado en `.nvmrc` y `package.json` engines)
- Algunos plugins legacy de webpack pueden romper en Turbopack — auditamos en CI

## Política de versiones de Node/Next

| Componente | Versión mínima | Versión sugerida |
|---|---|---|
| Node.js | 20.9.0 | 22.x LTS (fijada en `.nvmrc`) |
| npm | 10.x | 11.x |
| Next.js | 16.0.0 | 16.2.x |
| React | 19.0.0 | 19.x |

Las versiones se actualizan en menores frecuentes (Next 16.x patches) y mayores con cuidado (16 → 17 requiere ADR).

## Costo mensual estimado

| Servicio | Plan | Costo USD/mes |
|---|---|---|
| Vercel | Hobby | $0 |
| Neon | Free → Launch ($19) cuando crezca | $0–19 |
| Cloudflare R2 | Free tier (10GB) | $0 |
| Trigger.dev | Free | $0 |
| Resend | Free → Pro ($20) si superamos 3k emails/mes | $0–20 |
| Sentry | Developer (free) | $0 |
| GitHub | Privado (free) | $0 |
| **Total proyectado** | | **$0–40** primeros 6 meses |

## Decisiones pendientes

- [ ] Dominio del portal: `portal.jovenesenuk.com` vs `juk.jovenesenuk.com`
- [ ] Política de backups extra: Neon ya hace point-in-time recovery; ¿exportamos también a R2 semanalmente?
- [ ] Estrategia de testing: Vitest para unit, Playwright para E2E (a definir cuándo arrancamos)
- [ ] App nativa: ¿Expo + React Native o Capacitor sobre la PWA? (decidir cuando el caso de uso esté claro)
